// Backup / restore: bundle the whole data root (library.db + covers/ +
// manga/ + novel/ + fonts/) into a single .aan.zip so users can move
// libraries between machines or recover from a wiped install.
//
// Restore is destructive — it removes the on-disk subdirs and the DB
// before unpacking. The frontend gates this behind a confirm dialog;
// the command itself trusts the caller.

use crate::data_root;
use serde::Serialize;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;

const INCLUDED_DIRS: &[&str] = &["covers", "manga", "novel", "fonts"];
const INCLUDED_FILES: &[&str] = &["library.db"];
const MANIFEST_NAME: &str = "manifest.json";

#[derive(Serialize, Clone, Debug)]
pub(crate) struct BackupStats {
    pub files: u64,
    pub bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
pub(crate) struct BackupMetadata {
    pub version: u32,
    pub created_at: String,
    pub app: String,
    pub files: u64,
    pub bytes: u64,
}

fn iso_now() -> String {
    // YYYY-MM-DDTHH:MM:SSZ — coarse, no chrono dep.
    let t = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0) as i64;
    let secs_total = t.max(0);
    let secs = (secs_total % 60) as u32;
    let mins = ((secs_total / 60) % 60) as u32;
    let hours = ((secs_total / 3600) % 24) as u32;
    let mut days = secs_total / 86400;
    let mut year: i32 = 1970;
    loop {
        let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
        let ylen = if leap { 366 } else { 365 };
        if days < ylen { break; }
        days -= ylen;
        year += 1;
    }
    let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    let dim = [31, if leap {29} else {28}, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month: u32 = 1;
    for d in dim {
        if days < d { break; }
        days -= d;
        month += 1;
    }
    let day = (days as u32) + 1;
    format!("{year:04}-{month:02}-{day:02}T{hours:02}:{mins:02}:{secs:02}Z")
}

fn walk_dir_into_zip<W: Write + std::io::Seek>(
    base: &Path,
    rel_prefix: &str,
    zip: &mut zip::ZipWriter<W>,
    files: &mut u64,
    bytes: &mut u64,
) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(base) else { return Ok(()); };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        let entry_path = if rel_prefix.is_empty() {
            name.clone()
        } else {
            format!("{rel_prefix}/{name}")
        };
        if path.is_dir() {
            walk_dir_into_zip(&path, &entry_path, zip, files, bytes)?;
        } else if path.is_file() {
            let opts = SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);
            zip.start_file::<_, ()>(&entry_path, opts).map_err(|e| e.to_string())?;
            let mut f = fs::File::open(&path).map_err(|e| e.to_string())?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            *bytes += buf.len() as u64;
            zip.write_all(&buf).map_err(|e| e.to_string())?;
            *files += 1;
        }
    }
    Ok(())
}

pub(crate) fn create_backup_inner(root: &Path, dest: &Path) -> Result<BackupStats, String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let out = fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(out);

    let mut files = 0u64;
    let mut bytes = 0u64;

    for file_name in INCLUDED_FILES {
        let path = root.join(file_name);
        if !path.is_file() { continue; }
        let opts = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        zip.start_file::<_, ()>(*file_name, opts).map_err(|e| e.to_string())?;
        let buf = fs::read(&path).map_err(|e| e.to_string())?;
        bytes += buf.len() as u64;
        zip.write_all(&buf).map_err(|e| e.to_string())?;
        files += 1;
    }

    for dir_name in INCLUDED_DIRS {
        let path = root.join(dir_name);
        if !path.is_dir() { continue; }
        walk_dir_into_zip(&path, dir_name, &mut zip, &mut files, &mut bytes)?;
    }

    // Manifest last so reading it for a "preview" doesn't need to scan
    // the full archive — though writers can't control central-directory
    // order, this is still the rightmost entry in stream order.
    let manifest = serde_json::json!({
        "version": 1,
        "app": "aan",
        "created_at": iso_now(),
        "files": files,
        "bytes": bytes,
    })
    .to_string();
    let opts = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    zip.start_file::<_, ()>(MANIFEST_NAME, opts).map_err(|e| e.to_string())?;
    zip.write_all(manifest.as_bytes()).map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;
    Ok(BackupStats { files, bytes })
}

pub(crate) fn read_backup_metadata_inner(src: &Path) -> Result<BackupMetadata, String> {
    let f = fs::File::open(src).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(f).map_err(|e| e.to_string())?;
    let mut entry = zip.by_name(MANIFEST_NAME)
        .map_err(|_| "Not an Aan backup — manifest.json missing".to_string())?;
    let mut buf = String::new();
    entry.read_to_string(&mut buf).map_err(|e| e.to_string())?;
    let v: serde_json::Value = serde_json::from_str(&buf).map_err(|e| e.to_string())?;
    Ok(BackupMetadata {
        version: v.get("version").and_then(|x| x.as_u64()).unwrap_or(0) as u32,
        created_at: v.get("created_at").and_then(|x| x.as_str()).unwrap_or("").into(),
        app: v.get("app").and_then(|x| x.as_str()).unwrap_or("").into(),
        files: v.get("files").and_then(|x| x.as_u64()).unwrap_or(0),
        bytes: v.get("bytes").and_then(|x| x.as_u64()).unwrap_or(0),
    })
}

pub(crate) fn restore_backup_inner(root: &Path, src: &Path) -> Result<BackupStats, String> {
    // Reject anything that doesn't look like our backup so we don't wipe
    // the user's data on a wrong-file mistake.
    let meta = read_backup_metadata_inner(src)?;
    if meta.app != "aan" {
        return Err("Not an Aan backup (manifest.app != \"aan\")".into());
    }

    // Wipe the previous payload BEFORE extracting so leftover files
    // from the old library don't survive the restore.
    for dir_name in INCLUDED_DIRS {
        let p = root.join(dir_name);
        if p.exists() {
            fs::remove_dir_all(&p).map_err(|e| e.to_string())?;
        }
    }
    let db = root.join("library.db");
    if db.exists() {
        fs::remove_file(&db).map_err(|e| e.to_string())?;
    }
    // Clear sidecar journal files SQLite may have left behind.
    for sidecar in ["library.db-wal", "library.db-shm", "library.db-journal"] {
        let p = root.join(sidecar);
        if p.exists() { let _ = fs::remove_file(&p); }
    }

    let f = fs::File::open(src).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(f).map_err(|e| e.to_string())?;

    let mut files = 0u64;
    let mut bytes = 0u64;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        if name == MANIFEST_NAME { continue; }
        // Path-traversal defence: reject any entry that escapes root.
        if name.contains("..") || name.starts_with('/') || name.starts_with('\\') {
            return Err(format!("backup contains unsafe path: {name}"));
        }
        let dest = root.join(&name);
        if entry.is_dir() {
            fs::create_dir_all(&dest).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            bytes += buf.len() as u64;
            fs::write(&dest, &buf).map_err(|e| e.to_string())?;
            files += 1;
        }
    }
    Ok(BackupStats { files, bytes })
}

// ── Tauri command surface ──────────────────────────────────────────

#[tauri::command]
pub(crate) fn create_backup(dest_path: String) -> Result<BackupStats, String> {
    create_backup_inner(&data_root(), &PathBuf::from(dest_path))
}

#[tauri::command]
pub(crate) fn read_backup_metadata(src_path: String) -> Result<BackupMetadata, String> {
    read_backup_metadata_inner(&PathBuf::from(src_path))
}

#[tauri::command]
pub(crate) fn restore_backup(src_path: String) -> Result<BackupStats, String> {
    restore_backup_inner(&data_root(), &PathBuf::from(src_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    fn seed_data(root: &Path) {
        // Tiny payload: covers/1.jpg, manga/1/c.pdf, novel/1/c.html, fonts/x.ttf
        fs::create_dir_all(root.join("covers")).unwrap();
        fs::write(root.join("covers/1.jpg"), b"jpgbytes").unwrap();
        fs::create_dir_all(root.join("manga/1")).unwrap();
        fs::write(root.join("manga/1/c.pdf"), b"%PDF-FAKE").unwrap();
        fs::create_dir_all(root.join("novel/1")).unwrap();
        fs::write(root.join("novel/1/c.html"), b"<html>hi</html>").unwrap();
        fs::create_dir_all(root.join("fonts")).unwrap();
        fs::write(root.join("fonts/Foo.ttf"), b"\x00\x01\x00\x00font").unwrap();
        // The DB.
        let _conn = crate::db::open(root).unwrap();
    }

    #[test]
    fn create_then_restore_roundtrip() {
        let (_src_tmp, src_root) = temp_data_root();
        seed_data(&src_root);
        let dest = src_root.join("backup.aan.zip");

        let stats = create_backup_inner(&src_root, &dest).unwrap();
        assert!(stats.files >= 5, "expected library.db + 4 payload files, got {}", stats.files);
        assert!(stats.bytes > 0);
        assert!(dest.exists());

        // Restore into a fresh root.
        let (_dst_tmp, dst_root) = temp_data_root();
        let stats2 = restore_backup_inner(&dst_root, &dest).unwrap();
        assert_eq!(stats2.files, stats.files);
        assert!(dst_root.join("covers/1.jpg").exists());
        assert!(dst_root.join("manga/1/c.pdf").exists());
        assert!(dst_root.join("novel/1/c.html").exists());
        assert!(dst_root.join("fonts/Foo.ttf").exists());
        assert!(dst_root.join("library.db").exists());
    }

    #[test]
    fn restore_clears_previous_files() {
        let (_src_tmp, src_root) = temp_data_root();
        seed_data(&src_root);
        let dest = src_root.join("backup.aan.zip");
        create_backup_inner(&src_root, &dest).unwrap();

        let (_dst_tmp, dst_root) = temp_data_root();
        // Seed a stale file that should NOT survive a restore.
        fs::create_dir_all(dst_root.join("covers")).unwrap();
        fs::write(dst_root.join("covers/stale.jpg"), b"old").unwrap();

        restore_backup_inner(&dst_root, &dest).unwrap();
        assert!(!dst_root.join("covers/stale.jpg").exists(), "stale file should be cleared");
        assert!(dst_root.join("covers/1.jpg").exists());
    }

    #[test]
    fn read_metadata_returns_app_and_counts() {
        let (_tmp, root) = temp_data_root();
        seed_data(&root);
        let dest = root.join("backup.aan.zip");
        create_backup_inner(&root, &dest).unwrap();
        let m = read_backup_metadata_inner(&dest).unwrap();
        assert_eq!(m.app, "aan");
        assert_eq!(m.version, 1);
        assert!(m.files >= 5);
    }

    #[test]
    fn restore_rejects_non_aan_zip() {
        let (_tmp, root) = temp_data_root();
        let bogus = root.join("bogus.zip");
        let f = fs::File::create(&bogus).unwrap();
        let mut zip = zip::ZipWriter::new(f);
        zip.start_file::<_, ()>("manifest.json", SimpleFileOptions::default()).unwrap();
        zip.write_all(br#"{"app":"someoneelse","version":1}"#).unwrap();
        zip.finish().unwrap();
        let err = restore_backup_inner(&root, &bogus).unwrap_err();
        assert!(err.contains("Aan"));
    }

    #[test]
    fn restore_rejects_path_traversal() {
        let (_tmp, root) = temp_data_root();
        let dest = root.join("bad.zip");
        let f = fs::File::create(&dest).unwrap();
        let mut zip = zip::ZipWriter::new(f);
        zip.start_file::<_, ()>("manifest.json", SimpleFileOptions::default()).unwrap();
        zip.write_all(br#"{"app":"aan","version":1}"#).unwrap();
        zip.start_file::<_, ()>("../escape.txt", SimpleFileOptions::default()).unwrap();
        zip.write_all(b"pwned").unwrap();
        zip.finish().unwrap();
        let err = restore_backup_inner(&root, &dest).unwrap_err();
        assert!(err.contains("unsafe"));
    }
}
