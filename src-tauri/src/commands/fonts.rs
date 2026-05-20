// Custom user fonts: dropped into <data_root>/fonts/ and surfaced to the
// novel reader / font picker. Family name is derived from the filename
// stem — parsing actual font tables would be heavier than it's worth for
// the value (user can rename the file if the auto-name reads poorly).

use crate::data_root;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone, Debug, PartialEq)]
pub(crate) struct CustomFont {
    pub family: String,
    pub filename: String,
    pub path: String,
    pub bytes: u64,
}

const ALLOWED_EXT: &[&str] = &["ttf", "otf", "woff", "woff2"];

pub(crate) fn fonts_dir(root: &Path) -> PathBuf {
    root.join("fonts")
}

fn ext_lower(p: &Path) -> Option<String> {
    p.extension().and_then(|s| s.to_str()).map(|s| s.to_ascii_lowercase())
}

fn is_font_file(p: &Path) -> bool {
    ext_lower(p).as_deref().map(|e| ALLOWED_EXT.contains(&e)).unwrap_or(false)
}

fn family_from_stem(stem: &str) -> String {
    // Strip common weight/style suffixes — "Bookerly-Regular" reads
    // better as just "Bookerly" in the picker.
    let lower = stem.to_ascii_lowercase();
    let suffixes = [
        "-regular", "-medium", "-bold", "-light", "-thin", "-black",
        "-italic", "-book", "-semibold", "-extrabold",
    ];
    for s in suffixes {
        if lower.ends_with(s) {
            return stem[..stem.len() - s.len()].to_string();
        }
    }
    stem.to_string()
}

pub(crate) fn scan_fonts(root: &Path) -> Vec<CustomFont> {
    let dir = fonts_dir(root);
    let mut out = Vec::new();
    let Ok(rd) = fs::read_dir(&dir) else { return out };
    for entry in rd.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_font_file(&path) { continue; }
        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
        let family = family_from_stem(&stem);
        let bytes = path.metadata().map(|m| m.len()).unwrap_or(0);
        out.push(CustomFont {
            family,
            filename,
            path: path.to_string_lossy().into_owned(),
            bytes,
        });
    }
    out.sort_by(|a, b| a.family.to_lowercase().cmp(&b.family.to_lowercase()));
    out
}

pub(crate) fn install_font_inner(root: &Path, src: &Path) -> Result<CustomFont, String> {
    if !src.is_file() { return Err(format!("not a file: {}", src.display())); }
    if !is_font_file(src) { return Err("unsupported font format".into()); }
    let dir = fonts_dir(root);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let filename = src.file_name().and_then(|s| s.to_str()).ok_or("invalid filename")?.to_string();
    let dst = dir.join(&filename);
    // Don't silently overwrite an existing font with the same name —
    // the user almost certainly wants the older copy preserved.
    if dst.exists() {
        return Err(format!("font already installed: {filename}"));
    }
    fs::copy(src, &dst).map_err(|e| e.to_string())?;
    let stem = dst.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
    Ok(CustomFont {
        family: family_from_stem(&stem),
        filename,
        path: dst.to_string_lossy().into_owned(),
        bytes: dst.metadata().map(|m| m.len()).unwrap_or(0),
    })
}

pub(crate) fn remove_font_inner(root: &Path, filename: &str) -> Result<(), String> {
    // Defend against path traversal via crafted filenames.
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("invalid filename".into());
    }
    let dst = fonts_dir(root).join(filename);
    if !dst.exists() { return Ok(()); }
    fs::remove_file(&dst).map_err(|e| e.to_string())
}

pub(crate) fn read_font_inner(root: &Path, filename: &str) -> Result<Vec<u8>, String> {
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("invalid filename".into());
    }
    let dst = fonts_dir(root).join(filename);
    fs::read(&dst).map_err(|e| e.to_string())
}

// ── Tauri command surface ──────────────────────────────────────────

#[tauri::command]
pub(crate) fn list_custom_fonts() -> Result<Vec<CustomFont>, String> {
    Ok(scan_fonts(&data_root()))
}

#[tauri::command]
pub(crate) fn install_font(src_path: String) -> Result<CustomFont, String> {
    install_font_inner(&data_root(), Path::new(&src_path))
}

#[tauri::command]
pub(crate) fn remove_custom_font(filename: String) -> Result<(), String> {
    remove_font_inner(&data_root(), &filename)
}

#[tauri::command]
pub(crate) fn read_custom_font(filename: String) -> Result<Vec<u8>, String> {
    read_font_inner(&data_root(), &filename)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn make_fake_ttf(dir: &Path, name: &str) -> PathBuf {
        let p = dir.join(name);
        let mut f = fs::File::create(&p).unwrap();
        // Just bytes — we never parse the file, only copy it.
        f.write_all(b"\x00\x01\x00\x00fake-font-bytes").unwrap();
        p
    }

    #[test]
    fn scan_empty_dir_returns_empty() {
        let tmp = tempfile::tempdir().unwrap();
        assert_eq!(scan_fonts(tmp.path()), vec![]);
    }

    #[test]
    fn install_and_list_returns_one_entry() {
        let tmp = tempfile::tempdir().unwrap();
        let src_dir = tempfile::tempdir().unwrap();
        let src = make_fake_ttf(src_dir.path(), "Bookerly-Regular.ttf");
        let got = install_font_inner(tmp.path(), &src).unwrap();
        assert_eq!(got.family, "Bookerly");
        assert_eq!(got.filename, "Bookerly-Regular.ttf");

        let listed = scan_fonts(tmp.path());
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].family, "Bookerly");
    }

    #[test]
    fn install_rejects_unsupported_ext() {
        let tmp = tempfile::tempdir().unwrap();
        let src_dir = tempfile::tempdir().unwrap();
        let src = make_fake_ttf(src_dir.path(), "junk.png");
        let err = install_font_inner(tmp.path(), &src).unwrap_err();
        assert!(err.contains("unsupported"));
    }

    #[test]
    fn install_refuses_duplicate() {
        let tmp = tempfile::tempdir().unwrap();
        let src_dir = tempfile::tempdir().unwrap();
        let src = make_fake_ttf(src_dir.path(), "Foo.ttf");
        install_font_inner(tmp.path(), &src).unwrap();
        let err = install_font_inner(tmp.path(), &src).unwrap_err();
        assert!(err.contains("already"));
    }

    #[test]
    fn remove_drops_the_file() {
        let tmp = tempfile::tempdir().unwrap();
        let src_dir = tempfile::tempdir().unwrap();
        let src = make_fake_ttf(src_dir.path(), "Foo.ttf");
        install_font_inner(tmp.path(), &src).unwrap();
        remove_font_inner(tmp.path(), "Foo.ttf").unwrap();
        assert!(scan_fonts(tmp.path()).is_empty());
    }

    #[test]
    fn remove_rejects_path_traversal() {
        let tmp = tempfile::tempdir().unwrap();
        let err = remove_font_inner(tmp.path(), "../sneaky.ttf").unwrap_err();
        assert!(err.contains("invalid"));
    }

    #[test]
    fn read_returns_bytes() {
        let tmp = tempfile::tempdir().unwrap();
        let src_dir = tempfile::tempdir().unwrap();
        let src = make_fake_ttf(src_dir.path(), "Foo.ttf");
        install_font_inner(tmp.path(), &src).unwrap();
        let bytes = read_font_inner(tmp.path(), "Foo.ttf").unwrap();
        assert!(bytes.starts_with(&[0x00, 0x01, 0x00, 0x00]));
    }

    #[test]
    fn family_strips_weight_suffix() {
        assert_eq!(family_from_stem("Bookerly-Regular"), "Bookerly");
        assert_eq!(family_from_stem("Literata-Bold"), "Literata");
        assert_eq!(family_from_stem("Inter"), "Inter");
        assert_eq!(family_from_stem("Some-Custom-Italic"), "Some-Custom");
    }
}
