// Pausable + resumable data-folder migration. Background thread owns the
// file walk; UI drives it via shared `MoveState`. Job state journals to
// `move_job.json` in the source dir so a paused job survives app restart.
// Progress is emitted on the `data-move:progress` event.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MoveStatus {
    Running,
    Paused,
    Done,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveJob {
    pub source: String,
    pub dest: String,
    pub status: MoveStatus,
    pub files_done: u64,
    pub files_total: u64,
    pub bytes_done: u64,
    pub bytes_total: u64,
    pub current: String,
    pub errors: Vec<String>,
    pub started_at: String,
}

#[derive(Default)]
pub struct MoveState {
    pub job: Mutex<Option<MoveJob>>,
    pub pause_flag: AtomicBool,
    pub cancel_flag: AtomicBool,
    pub running: AtomicBool,
}

impl MoveState {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }
}

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}", secs)
}

fn job_file(source: &Path) -> PathBuf {
    source.join("move_job.json")
}

fn persist_job(job: &MoveJob) {
    let path = job_file(Path::new(&job.source));
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(s) = serde_json::to_string_pretty(job) {
        let _ = std::fs::write(&path, s);
    }
}

fn clear_persisted(source: &Path) {
    let _ = std::fs::remove_file(job_file(source));
}

/// Load a persisted job from disk (for the startup resume banner).
pub fn load_persisted(source: &Path) -> Option<MoveJob> {
    let p = job_file(source);
    if !p.exists() {
        return None;
    }
    let s = std::fs::read_to_string(&p).ok()?;
    serde_json::from_str(&s).ok()
}

fn emit(app: &AppHandle, state: &MoveState) {
    if let Some(j) = state.job.lock().clone() {
        let _ = app.emit("data-move:progress", j);
    }
}

/// Walk `source` recursively, returning (rel_path, size). The
/// `move_job.json` journal is skipped.
fn collect_files(source: &Path) -> Result<Vec<(PathBuf, u64)>, String> {
    let mut out: Vec<(PathBuf, u64)> = Vec::new();
    let mut stack: Vec<PathBuf> = vec![source.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let it = match std::fs::read_dir(&dir) {
            Ok(it) => it,
            Err(_) => continue,
        };
        for entry in it.flatten() {
            let path = entry.path();
            if path.file_name().map(|n| n == "move_job.json").unwrap_or(false) {
                continue;
            }
            let ft = match entry.file_type() {
                Ok(t) => t,
                Err(_) => continue,
            };
            if ft.is_dir() {
                stack.push(path);
            } else if ft.is_file() {
                let rel = path
                    .strip_prefix(source)
                    .map(|p| p.to_path_buf())
                    .unwrap_or_else(|_| path.clone());
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                out.push((rel, size));
            }
        }
    }
    Ok(out)
}

/// Returns Ok(true) when copied, Ok(false) when skipped (dest exists with matching size).
fn copy_one(src: &Path, dst: &Path) -> Result<bool, String> {
    if let Ok(dst_meta) = std::fs::metadata(dst) {
        if let Ok(src_meta) = std::fs::metadata(src) {
            if dst_meta.is_file() && dst_meta.len() == src_meta.len() {
                return Ok(false);
            }
        }
    }
    if let Some(parent) = dst.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    // Temp-then-rename: a mid-copy crash must not leave a half-written
    // dest that the resume scan would falsely skip on size match.
    let tmp = dst.with_extension("nv-move-tmp");
    std::fs::copy(src, &tmp).map_err(|e| e.to_string())?;
    if dst.exists() {
        let _ = std::fs::remove_file(dst);
    }
    std::fs::rename(&tmp, dst).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Start or resume a move into `dest`. Validates paths up front; on
/// success spawns the walk and begins emitting progress events.
pub fn start(
    app: AppHandle,
    state: Arc<MoveState>,
    source: PathBuf,
    dest: PathBuf,
) -> Result<(), String> {
    if state.running.load(Ordering::SeqCst) {
        return Err("move already running".into());
    }
    let src_canon = source.canonicalize().unwrap_or(source.clone());
    let dest_canon = dest.canonicalize().unwrap_or(dest.clone());
    if src_canon == dest_canon {
        return Err("source and destination are the same".into());
    }
    if dest_canon.starts_with(&src_canon) || src_canon.starts_with(&dest_canon) {
        return Err("source and destination overlap".into());
    }
    std::fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    let mut job = {
        let g = state.job.lock();
        g.clone()
    };
    if job
        .as_ref()
        .map(|j| j.source != source.to_string_lossy() || j.dest != dest.to_string_lossy())
        .unwrap_or(false)
    {
        return Err("a different move job is already pending".into());
    }
    if job.is_none() {
        if let Some(persisted) = load_persisted(&source) {
            if persisted.dest == dest.to_string_lossy() {
                job = Some(persisted);
            }
        }
    }
    let mut new_job = job.unwrap_or(MoveJob {
        source: source.to_string_lossy().into_owned(),
        dest: dest.to_string_lossy().into_owned(),
        status: MoveStatus::Running,
        files_done: 0,
        files_total: 0,
        bytes_done: 0,
        bytes_total: 0,
        current: String::new(),
        errors: Vec::new(),
        started_at: now_iso(),
    });
    new_job.status = MoveStatus::Running;
    *state.job.lock() = Some(new_job.clone());
    persist_job(&new_job);

    state.pause_flag.store(false, Ordering::SeqCst);
    state.cancel_flag.store(false, Ordering::SeqCst);
    state.running.store(true, Ordering::SeqCst);

    let state_bg = state.clone();
    let app_bg = app.clone();
    std::thread::spawn(move || {
        run_walk(app_bg, state_bg, source, dest);
    });

    emit(&app, &state);
    Ok(())
}

fn run_walk(app: AppHandle, state: Arc<MoveState>, source: PathBuf, dest: PathBuf) {
    let files = match collect_files(&source) {
        Ok(f) => f,
        Err(e) => {
            finalize_failure(&app, &state, e);
            return;
        }
    };
    let total_bytes: u64 = files.iter().map(|(_, s)| *s).sum();
    let total_files = files.len() as u64;

    {
        let mut g = state.job.lock();
        if let Some(j) = g.as_mut() {
            j.files_total = total_files;
            j.bytes_total = total_bytes;
            // Counters are recomputed: the resume walk re-counts
            // already-copied files via size match.
            j.files_done = 0;
            j.bytes_done = 0;
            j.current.clear();
            persist_job(j);
        }
    }
    emit(&app, &state);

    for (rel, size) in files {
        if state.cancel_flag.load(Ordering::SeqCst) {
            mark(&state, MoveStatus::Cancelled, None);
            emit(&app, &state);
            state.running.store(false, Ordering::SeqCst);
            return;
        }
        if state.pause_flag.load(Ordering::SeqCst) {
            mark(&state, MoveStatus::Paused, None);
            emit(&app, &state);
            state.running.store(false, Ordering::SeqCst);
            return;
        }
        {
            let mut g = state.job.lock();
            if let Some(j) = g.as_mut() {
                j.current = rel.to_string_lossy().into_owned();
            }
        }
        let src_path = source.join(&rel);
        let dst_path = dest.join(&rel);
        match copy_one(&src_path, &dst_path) {
            Ok(_copied) => {
                let mut g = state.job.lock();
                if let Some(j) = g.as_mut() {
                    j.files_done += 1;
                    j.bytes_done = j.bytes_done.saturating_add(size);
                    if j.files_done % 8 == 0 || j.files_done == total_files {
                        persist_job(j);
                    }
                }
                emit(&app, &state);
            }
            Err(e) => {
                let mut g = state.job.lock();
                if let Some(j) = g.as_mut() {
                    j.errors.push(format!("{}: {}", rel.display(), e));
                    persist_job(j);
                }
                emit(&app, &state);
            }
        }
    }

    let had_errors = state
        .job
        .lock()
        .as_ref()
        .map(|j| !j.errors.is_empty())
        .unwrap_or(false);
    let final_status = if had_errors {
        MoveStatus::Failed
    } else {
        MoveStatus::Done
    };
    mark(&state, final_status, None);
    {
        let g = state.job.lock();
        if let Some(j) = g.as_ref() {
            persist_job(j);
        }
    }
    emit(&app, &state);
    state.running.store(false, Ordering::SeqCst);
}

fn mark(state: &MoveState, status: MoveStatus, current: Option<String>) {
    let mut g = state.job.lock();
    if let Some(j) = g.as_mut() {
        j.status = status;
        if let Some(c) = current {
            j.current = c;
        }
    }
}

fn finalize_failure(app: &AppHandle, state: &MoveState, msg: String) {
    {
        let mut g = state.job.lock();
        if let Some(j) = g.as_mut() {
            j.status = MoveStatus::Failed;
            j.errors.push(msg);
            persist_job(j);
        }
    }
    emit(app, state);
    state.running.store(false, Ordering::SeqCst);
}

pub fn pause(state: &MoveState) {
    state.pause_flag.store(true, Ordering::SeqCst);
}

pub fn cancel(state: &MoveState, delete_partial: bool) {
    state.cancel_flag.store(true, Ordering::SeqCst);
    if delete_partial {
        if let Some(j) = state.job.lock().clone() {
            let _ = std::fs::remove_dir_all(Path::new(&j.dest));
        }
    }
    {
        let mut g = state.job.lock();
        if let Some(j) = g.as_mut() {
            clear_persisted(Path::new(&j.source));
        }
        *g = None;
    }
}

pub fn snapshot(state: &MoveState) -> Option<MoveJob> {
    state.job.lock().clone()
}

/// Commit a completed move: point config at the new root and
/// optionally delete the source. Errors when the job is not `Done`.
pub fn finalize(state: &MoveState, delete_source: bool) -> Result<(), String> {
    let job = state
        .job
        .lock()
        .clone()
        .ok_or_else(|| "no move job".to_string())?;
    if !matches!(job.status, MoveStatus::Done) {
        return Err("move is not complete".into());
    }
    let mut cfg = crate::app_config::get();
    cfg.data_root = Some(job.dest.clone());
    crate::app_config::save(&cfg)?;
    clear_persisted(Path::new(&job.source));
    if delete_source {
        let _ = std::fs::remove_dir_all(Path::new(&job.source));
    }
    *state.job.lock() = None;
    Ok(())
}
