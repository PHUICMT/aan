// Folder watcher: on every "file appeared" event we route through the
// existing import commands. Each watched root gets its own background
// thread + notify handle; the manager owns them so add/remove from the
// frontend can drop them cleanly.

use crate::commands::import;
use crate::{data_root, db};
use notify::{
    event::{CreateKind, ModifyKind, RenameMode},
    Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use parking_lot::Mutex;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct WatchManager {
    /// One handle per registered folder. Dropping the watcher stops it.
    handles: Mutex<HashMap<PathBuf, RecommendedWatcher>>,
    /// Files we've already processed (or are processing). Coalesces the
    /// flurry of events that the OS fires while a file is being written.
    seen: Arc<Mutex<HashMap<PathBuf, Instant>>>,
}

impl WatchManager {
    pub fn new() -> Self { Self::default() }

    pub fn list(&self) -> Vec<PathBuf> {
        self.handles.lock().keys().cloned().collect()
    }

    pub fn add(&self, folder: PathBuf, app: AppHandle) -> Result<(), String> {
        if !folder.is_dir() {
            return Err(format!("not a directory: {}", folder.display()));
        }
        let mut guard = self.handles.lock();
        if guard.contains_key(&folder) {
            return Ok(());
        }
        let watcher = spawn_watcher(folder.clone(), app, Arc::clone(&self.seen))?;
        guard.insert(folder, watcher);
        Ok(())
    }

    pub fn remove(&self, folder: &Path) -> Result<(), String> {
        let mut guard = self.handles.lock();
        guard.remove(folder); // drop = stop watching
        Ok(())
    }
}

fn spawn_watcher(
    folder: PathBuf,
    app: AppHandle,
    seen: Arc<Mutex<HashMap<PathBuf, Instant>>>,
) -> Result<RecommendedWatcher, String> {
    let (tx, rx) = channel::<Event>();
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(ev) = res {
            let _ = tx.send(ev);
        }
    })
    .map_err(|e| e.to_string())?;
    watcher
        .watch(&folder, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Drain events on a dedicated thread; debounce, then dispatch to the
    // matching importer. Each loop iteration also gets the chance to
    // sweep `seen` so it doesn't grow forever.
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let mut pending: HashSet<PathBuf> = HashSet::new();
        loop {
            // Block up to 1s waiting for the first event.
            let first = match rx.recv_timeout(Duration::from_secs(2)) {
                Ok(ev) => ev,
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    cleanup_seen(&seen);
                    continue;
                }
                Err(_) => break,
            };
            collect_paths(&first, &mut pending);

            // Soak up a 300ms burst of follow-up events so we don't
            // dispatch mid-write.
            while let Ok(ev) = rx.recv_timeout(Duration::from_millis(300)) {
                collect_paths(&ev, &mut pending);
            }

            for path in pending.drain() {
                if !looks_like_supported(&path) {
                    continue;
                }
                if !path.is_file() {
                    continue;
                }
                if recently_seen(&seen, &path) {
                    continue;
                }
                if !file_is_stable(&path) {
                    // Re-queue: write still in flight. The next OS event
                    // when the writer closes will trigger another pass.
                    continue;
                }
                let result = dispatch_import(&path);
                let app_for_event = app_clone.clone();
                let payload = match result {
                    Ok(msg) => WatchEventPayload { path: path.display().to_string(), ok: true, message: msg },
                    Err(e) => WatchEventPayload { path: path.display().to_string(), ok: false, message: e },
                };
                let _ = app_for_event.emit("aan:watch-imported", payload);
            }
            cleanup_seen(&seen);
        }
    });

    Ok(watcher)
}

fn collect_paths(ev: &Event, out: &mut HashSet<PathBuf>) {
    match ev.kind {
        EventKind::Create(CreateKind::File)
        | EventKind::Modify(ModifyKind::Name(RenameMode::To))
        | EventKind::Modify(ModifyKind::Name(RenameMode::Any))
        | EventKind::Modify(ModifyKind::Data(_)) => {
            for p in &ev.paths { out.insert(p.clone()); }
        }
        _ => {}
    }
}

fn looks_like_supported(p: &Path) -> bool {
    matches!(
        p.extension().and_then(|s| s.to_str()).map(|s| s.to_ascii_lowercase()).as_deref(),
        Some("pdf") | Some("cbz") | Some("epub") | Some("txt")
    )
}

/// Wait briefly and confirm the file size has stopped growing — proxy
/// for "the writer closed the handle". Skips remote shares where size
/// is sometimes 0 forever; those will simply retry on the next event.
fn file_is_stable(p: &Path) -> bool {
    let first = match std::fs::metadata(p) { Ok(m) => m.len(), Err(_) => return false };
    std::thread::sleep(Duration::from_millis(400));
    let second = match std::fs::metadata(p) { Ok(m) => m.len(), Err(_) => return false };
    first == second && first > 0
}

fn recently_seen(seen: &Arc<Mutex<HashMap<PathBuf, Instant>>>, p: &Path) -> bool {
    let mut g = seen.lock();
    if let Some(when) = g.get(p) {
        if when.elapsed() < Duration::from_secs(30) {
            return true;
        }
    }
    g.insert(p.to_path_buf(), Instant::now());
    false
}

fn cleanup_seen(seen: &Arc<Mutex<HashMap<PathBuf, Instant>>>) {
    let mut g = seen.lock();
    g.retain(|_, when| when.elapsed() < Duration::from_secs(120));
}

fn dispatch_import(path: &Path) -> Result<String, String> {
    use std::path::PathBuf;
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
    let root = data_root();
    let conn = db::open(&root)?;
    let src = path.to_string_lossy().into_owned();
    match ext.as_str() {
        "pdf" => {
            // Without pdfjs available server-side, accept the import
            // with page_count=0 and no cover; the next reader open will
            // backfill page_count via backfill_chapter_page_count.
            let parsed = guess_from_filename(&filename);
            import::import_pdf_inner(&conn, &root, import::PdfImportArgs {
                src_path: src,
                series_name: parsed.0,
                kind: "manga".into(),
                chapter_no: parsed.1,
                chapter_title: parsed.2,
                page_count: 0,
                cover_bytes: None,
            }).map(|_| format!("PDF: {filename}"))
        }
        "cbz" => {
            let parsed = guess_from_filename(&filename);
            import::import_cbz_inner(&conn, &root, import::CbzImportArgs {
                src_path: src,
                series_name: parsed.0,
                kind: "manga".into(),
                chapter_no: parsed.1,
                chapter_title: parsed.2,
            }).map(|_| format!("CBZ: {filename}"))
        }
        "epub" => {
            import::import_epub_inner(&conn, &root, import::EpubImportArgs {
                src_path: src,
                series_name_override: None,
                kind: "novel".into(),
            }).map(|r| format!("EPUB: {filename} (+{} chapters)", r.chapters_added))
        }
        "txt" => {
            let parsed = guess_from_filename(&filename);
            import::import_txt_inner(&conn, &root, import::TxtImportArgs {
                src_path: src,
                series_name: parsed.0,
                kind: "novel".into(),
                chapter_no: parsed.1,
                chapter_title: parsed.2,
            }).map(|_| format!("TXT: {filename}"))
        }
        _ => Err(format!("unsupported extension: {filename}")),
    }
    .map_err(|e| {
        let _: PathBuf = path.to_path_buf();
        e
    })
}

/// Light, Rust-side fallback for the JS heuristic. Not as smart, but it
/// only runs for watch-folder drops where the user can rename later.
fn guess_from_filename(name: &str) -> (String, f64, String) {
    let stem = name.rsplit_once('.').map(|(s, _)| s).unwrap_or(name);
    let mut chapter_no: Option<f64> = None;

    // Trailing number, optionally preceded by separator.
    let chars: Vec<char> = stem.chars().collect();
    let mut end = chars.len();
    while end > 0 && chars[end - 1].is_whitespace() { end -= 1; }
    let mut start = end;
    let mut saw_dot = false;
    while start > 0 {
        let c = chars[start - 1];
        if c.is_ascii_digit() { start -= 1; continue; }
        if c == '.' && !saw_dot && start > 1 && chars[start - 2].is_ascii_digit() {
            saw_dot = true;
            start -= 1;
            continue;
        }
        break;
    }
    if start < end {
        let num: String = chars[start..end].iter().collect();
        if let Ok(n) = num.parse::<f64>() {
            chapter_no = Some(n);
        }
    }

    let series = if chapter_no.is_some() {
        let head: String = chars[..start].iter().collect();
        head.trim_end_matches(|c: char| matches!(c, '_' | '-' | '.' | ' ')).to_string()
    } else {
        stem.to_string()
    };
    let series = series.replace(['_', '.'], " ").trim().to_string();
    let series = if series.is_empty() { "Imported".into() } else { series };
    (series, chapter_no.unwrap_or(1.0), String::new())
}

#[derive(serde::Serialize, Clone)]
struct WatchEventPayload {
    path: String,
    ok: bool,
    message: String,
}
