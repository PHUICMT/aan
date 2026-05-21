// Offline dictionaries: tab-separated text files dropped into
// <data_root>/dicts/ are loaded lazily into an in-memory cache and
// searched on every lookup. TSV chosen over StarDict because users can
// hand-edit / hand-build them; bundling a binary-format parser would
// add weight for marginal gain on this use case.

use crate::data_root;
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

#[derive(Serialize, Clone, Debug)]
pub(crate) struct Dictionary {
    pub filename: String,
    pub name: String,
    pub entries: u64,
    pub bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
pub(crate) struct DictMatch {
    pub dictionary: String,
    pub term: String,
    pub definition: String,
}

const ALLOWED_EXT: &[&str] = &["tsv", "txt"];

pub(crate) fn dicts_dir(root: &Path) -> PathBuf {
    root.join("dicts")
}

fn cache() -> &'static Mutex<HashMap<PathBuf, Vec<(String, String)>>> {
    static C: OnceLock<Mutex<HashMap<PathBuf, Vec<(String, String)>>>> = OnceLock::new();
    C.get_or_init(|| Mutex::new(HashMap::new()))
}

fn clear_cache() { cache().lock().clear(); }

fn parse_tsv(content: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    for line in content.lines() {
        let line = line.trim_start_matches('\u{feff}'); // strip BOM on the first line
        if line.is_empty() || line.starts_with('#') { continue; }
        if let Some((k, v)) = line.split_once('\t') {
            let k = k.trim();
            let v = v.trim();
            if !k.is_empty() && !v.is_empty() {
                out.push((k.to_string(), v.to_string()));
            }
        }
    }
    out
}

fn entries_for(path: &Path) -> Result<Vec<(String, String)>, String> {
    {
        let g = cache().lock();
        if let Some(v) = g.get(path) { return Ok(v.clone()); }
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let parsed = parse_tsv(&content);
    cache().lock().insert(path.to_path_buf(), parsed.clone());
    Ok(parsed)
}

fn is_dict_file(p: &Path) -> bool {
    p.extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        .map(|e| ALLOWED_EXT.contains(&e.as_str()))
        .unwrap_or(false)
}

pub(crate) fn list_dictionaries_inner(root: &Path) -> Result<Vec<Dictionary>, String> {
    let dir = dicts_dir(root);
    let mut out = Vec::new();
    let Ok(rd) = fs::read_dir(&dir) else { return Ok(out); };
    for entry in rd.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_dict_file(&path) { continue; }
        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
        let bytes = path.metadata().map(|m| m.len()).unwrap_or(0);
        let entries = match entries_for(&path) {
            Ok(v) => v.len() as u64,
            Err(_) => 0,
        };
        out.push(Dictionary { filename, name: stem, entries, bytes });
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

pub(crate) fn install_dictionary_inner(root: &Path, src: &Path) -> Result<Dictionary, String> {
    if !src.is_file() { return Err(format!("not a file: {}", src.display())); }
    if !is_dict_file(src) { return Err("unsupported dictionary format (use .tsv or .txt)".into()); }
    let dir = dicts_dir(root);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let filename = src.file_name().and_then(|s| s.to_str()).ok_or("invalid filename")?.to_string();
    let dst = dir.join(&filename);
    if dst.exists() {
        return Err(format!("dictionary already installed: {filename}"));
    }
    fs::copy(src, &dst).map_err(|e| e.to_string())?;
    clear_cache();
    let stem = dst.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
    let bytes = dst.metadata().map(|m| m.len()).unwrap_or(0);
    let entries = entries_for(&dst).map(|v| v.len() as u64).unwrap_or(0);
    Ok(Dictionary { filename, name: stem, entries, bytes })
}

pub(crate) fn remove_dictionary_inner(root: &Path, filename: &str) -> Result<(), String> {
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("invalid filename".into());
    }
    let dst = dicts_dir(root).join(filename);
    if !dst.exists() { return Ok(()); }
    fs::remove_file(&dst).map_err(|e| e.to_string())?;
    clear_cache();
    Ok(())
}

/// Strip surrounding punctuation that the selection grab may have
/// pulled in (commas, periods, quotes, parens, …) so "Hello," still
/// hits the "hello" entry.
fn normalise_query(q: &str) -> String {
    let trimmed = q.trim().trim_matches(|c: char| {
        !c.is_alphanumeric() && c != '-' && c != '\'' && c != ' '
    });
    trimmed.to_lowercase()
}

pub(crate) fn lookup_term_inner(root: &Path, term: &str) -> Result<Vec<DictMatch>, String> {
    let q = normalise_query(term);
    if q.is_empty() { return Ok(Vec::new()); }
    let dir = dicts_dir(root);
    if !dir.is_dir() { return Ok(Vec::new()); }
    let mut out: Vec<DictMatch> = Vec::new();
    let Ok(rd) = fs::read_dir(&dir) else { return Ok(out); };
    for entry in rd.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_dict_file(&path) { continue; }
        let dict_name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
        let entries = match entries_for(&path) {
            Ok(v) => v,
            Err(_) => continue,
        };
        // Exact match first — most useful 95% of the time. Fall back to
        // prefix match if nothing exact came through.
        let mut exact: Vec<&(String, String)> = entries.iter()
            .filter(|(k, _)| k.to_lowercase() == q)
            .collect();
        if exact.is_empty() {
            exact = entries.iter()
                .filter(|(k, _)| k.to_lowercase().starts_with(&q))
                .take(5)
                .collect();
        }
        for (k, v) in exact {
            out.push(DictMatch {
                dictionary: dict_name.clone(),
                term: k.clone(),
                definition: v.clone(),
            });
        }
    }
    Ok(out)
}

// ── Tauri command surface ──────────────────────────────────────────

#[tauri::command]
pub(crate) fn list_dictionaries() -> Result<Vec<Dictionary>, String> {
    list_dictionaries_inner(&data_root())
}

#[tauri::command]
pub(crate) fn install_dictionary(src_path: String) -> Result<Dictionary, String> {
    install_dictionary_inner(&data_root(), Path::new(&src_path))
}

#[tauri::command]
pub(crate) fn remove_dictionary(filename: String) -> Result<(), String> {
    remove_dictionary_inner(&data_root(), &filename)
}

#[tauri::command]
pub(crate) fn lookup_term(term: String) -> Result<Vec<DictMatch>, String> {
    lookup_term_inner(&data_root(), &term)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;
    use std::io::Write;

    fn write_tsv(dir: &Path, name: &str, lines: &[(&str, &str)]) -> PathBuf {
        let p = dir.join(name);
        let mut f = fs::File::create(&p).unwrap();
        for (k, v) in lines {
            writeln!(f, "{k}\t{v}").unwrap();
        }
        p
    }

    #[test]
    fn install_then_list_includes_the_dict() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let src_tmp = tempfile::tempdir().unwrap();
        let src = write_tsv(src_tmp.path(), "EnTh.tsv", &[("hello", "สวัสดี"), ("book", "หนังสือ")]);
        install_dictionary_inner(&root, &src).unwrap();
        let list = list_dictionaries_inner(&root).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "EnTh");
        assert_eq!(list[0].entries, 2);
    }

    #[test]
    fn lookup_returns_exact_match_first() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let src_tmp = tempfile::tempdir().unwrap();
        let src = write_tsv(src_tmp.path(), "D.tsv", &[
            ("read", "อ่าน"),
            ("reader", "ผู้อ่าน"),
            ("reading", "การอ่าน"),
        ]);
        install_dictionary_inner(&root, &src).unwrap();
        let matches = lookup_term_inner(&root, "read").unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].term, "read");
        assert_eq!(matches[0].definition, "อ่าน");
    }

    #[test]
    fn lookup_falls_back_to_prefix() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let src_tmp = tempfile::tempdir().unwrap();
        let src = write_tsv(src_tmp.path(), "D.tsv", &[
            ("reader", "ผู้อ่าน"),
            ("reading", "การอ่าน"),
        ]);
        install_dictionary_inner(&root, &src).unwrap();
        let matches = lookup_term_inner(&root, "read").unwrap();
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn lookup_strips_trailing_punctuation() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let src_tmp = tempfile::tempdir().unwrap();
        let src = write_tsv(src_tmp.path(), "D.tsv", &[("hello", "สวัสดี")]);
        install_dictionary_inner(&root, &src).unwrap();
        // "Hello," — punctuation tail, capital H — both handled
        let matches = lookup_term_inner(&root, "Hello,").unwrap();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].definition, "สวัสดี");
    }

    #[test]
    fn lookup_returns_empty_when_no_dicts() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let matches = lookup_term_inner(&root, "anything").unwrap();
        assert!(matches.is_empty());
    }

    #[test]
    fn remove_drops_the_file_and_clears_cache() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let src_tmp = tempfile::tempdir().unwrap();
        let src = write_tsv(src_tmp.path(), "Drop.tsv", &[("a", "b")]);
        install_dictionary_inner(&root, &src).unwrap();
        remove_dictionary_inner(&root, "Drop.tsv").unwrap();
        assert!(list_dictionaries_inner(&root).unwrap().is_empty());
        assert!(lookup_term_inner(&root, "a").unwrap().is_empty());
    }

    #[test]
    fn install_refuses_duplicate() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let src_tmp = tempfile::tempdir().unwrap();
        let src = write_tsv(src_tmp.path(), "Dupe.tsv", &[("a", "b")]);
        install_dictionary_inner(&root, &src).unwrap();
        let err = install_dictionary_inner(&root, &src).unwrap_err();
        assert!(err.contains("already"));
    }

    #[test]
    fn remove_rejects_path_traversal() {
        clear_cache();
        let (_tmp, root) = temp_data_root();
        let err = remove_dictionary_inner(&root, "../sneaky.tsv").unwrap_err();
        assert!(err.contains("invalid"));
    }

    #[test]
    fn parse_tsv_skips_comments_and_blanks() {
        let s = "# comment\nhello\tสวัสดี\n\nworld\tโลก\n";
        let v = parse_tsv(s);
        assert_eq!(v.len(), 2);
        assert_eq!(v[0].0, "hello");
        assert_eq!(v[1].0, "world");
    }
}
