use crate::{data_root, resolve_path};

pub(crate) fn read_cover_inner(root: &std::path::Path, pid: i64) -> Result<Vec<u8>, String> {
    let candidate = root.join("covers").join(format!("{}.jpg", pid));
    if candidate.exists() {
        std::fs::read(&candidate).map_err(|e| e.to_string())
    } else {
        Err("not found".into())
    }
}

pub(crate) fn series_folder_inner(root: &std::path::Path, pid: i64, kind: &str) -> String {
    let base = if matches!(kind, "novel" | "original_novel") {
        "novel"
    } else {
        "manga"
    };
    root.join(base).join(pid.to_string()).to_string_lossy().into_owned()
}

#[tauri::command]
pub(crate) fn read_cover(pid: i64) -> Result<Vec<u8>, String> {
    read_cover_inner(&data_root(), pid)
}

#[tauri::command]
pub(crate) fn open_url(url: String) -> Result<(), String> {
    // Scheme allow-list prevents shell-arg injection.
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("only http/https URLs allowed".into());
    }
    #[cfg(target_os = "windows")]
    {
        // The empty "" is required: `start` treats the first quoted arg
        // as a window title, so omitting it would consume the URL.
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// `target` is absolute or project-root-relative. With `reveal=true` on
/// a file, Explorer opens the parent and highlights the file.
#[tauri::command]
pub(crate) fn open_in_explorer(target: String, reveal: Option<bool>) -> Result<(), String> {
    let abs = resolve_path(&target);
    if !abs.exists() {
        return Err(format!("not found: {}", abs.display()));
    }
    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("explorer.exe");
        if reveal.unwrap_or(false) && abs.is_file() {
            cmd.arg(format!("/select,{}", abs.display()));
        } else {
            cmd.arg(format!("{}", abs.display()));
        }
        let _ = cmd.spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        let mut cmd = std::process::Command::new("open");
        if reveal.unwrap_or(false) && abs.is_file() {
            cmd.arg("-R").arg(&abs);
        } else {
            cmd.arg(&abs);
        }
        let _ = cmd.spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let target_dir = if abs.is_file() {
            abs.parent().unwrap_or(&abs).to_path_buf()
        } else {
            abs.clone()
        };
        let _ = std::process::Command::new("xdg-open")
            .arg(target_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub(crate) fn series_folder(pid: i64, kind: String) -> Result<String, String> {
    Ok(series_folder_inner(&data_root(), pid, &kind))
}

#[tauri::command]
pub(crate) fn list_chapter_images(chapter_path: String) -> Result<Vec<String>, String> {
    let abs = resolve_path(&chapter_path);
    if !abs.exists() || !abs.is_dir() {
        return Err(format!("not a directory: {}", abs.display()));
    }
    let mut files: Vec<String> = std::fs::read_dir(&abs)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| matches!(s.to_ascii_lowercase().as_str(), "jpg" | "jpeg" | "png" | "webp"))
                .unwrap_or(false)
        })
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    files.sort();
    Ok(files)
}

#[tauri::command]
pub(crate) fn read_image(path: String) -> Result<Vec<u8>, String> {
    let abs = resolve_path(&path);
    if !abs.exists() {
        return Err(format!("not found: {}", abs.display()));
    }
    std::fs::read(&abs).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::temp_data_root;

    #[test]
    fn test_read_cover_returns_bytes() {
        let (_tmp, root) = temp_data_root();
        let covers = root.join("covers");
        std::fs::create_dir_all(&covers).unwrap();
        std::fs::write(covers.join("42.jpg"), b"FAKEJPG").unwrap();
        let bytes = read_cover_inner(&root, 42).unwrap();
        assert_eq!(bytes, b"FAKEJPG");
    }

    #[test]
    fn test_read_cover_missing() {
        let (_tmp, root) = temp_data_root();
        assert!(read_cover_inner(&root, 999).is_err());
    }

    #[test]
    fn test_series_folder_path_resolution() {
        let (_tmp, root) = temp_data_root();
        let manga = series_folder_inner(&root, 5, "manga");
        assert!(manga.ends_with("manga\\5") || manga.ends_with("manga/5"));
        let novel = series_folder_inner(&root, 5, "novel");
        assert!(novel.ends_with("novel\\5") || novel.ends_with("novel/5"));
        // Unknown kinds bucket as manga.
        let other = series_folder_inner(&root, 5, "comic");
        assert!(other.ends_with("manga\\5") || other.ends_with("manga/5"));
        // original_novel maps to novel/.
        let orig = series_folder_inner(&root, 5, "original_novel");
        assert!(orig.ends_with("novel\\5") || orig.ends_with("novel/5"));
    }
}
