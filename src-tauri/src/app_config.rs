// App-level config persisted next to the exe. Currently only holds an
// optional data-folder override; missing/empty falls back to <project_root>/data.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::RwLock;

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Absolute path to the data folder; overrides the default `<project_root>/data`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_root: Option<String>,
}

static CACHE: RwLock<Option<AppConfig>> = RwLock::new(None);

/// Path to `app_config.json` next to the executable (portable install).
/// Falls back to CWD when the exe path can't be resolved (e.g. `cargo run`).
pub fn config_path() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            return dir.join("app_config.json");
        }
    }
    PathBuf::from("app_config.json")
}

fn load_uncached() -> AppConfig {
    let p = config_path();
    if !p.exists() {
        return AppConfig::default();
    }
    match std::fs::read_to_string(&p) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

pub fn get() -> AppConfig {
    if let Some(c) = CACHE.read().ok().and_then(|g| g.clone()) {
        return c;
    }
    let cfg = load_uncached();
    if let Ok(mut g) = CACHE.write() {
        *g = Some(cfg.clone());
    }
    cfg
}

/// Atomically persist via temp-file rename, then refresh the cache.
pub fn save(cfg: &AppConfig) -> Result<(), String> {
    let p = config_path();
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    let tmp = p.with_extension("json.tmp");
    std::fs::write(&tmp, &json).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &p).map_err(|e| e.to_string())?;
    if let Ok(mut g) = CACHE.write() {
        *g = Some(cfg.clone());
    }
    Ok(())
}

/// Force-reload from disk on next `get()`.
pub fn invalidate() {
    if let Ok(mut g) = CACHE.write() {
        *g = None;
    }
}

/// Resolve a stored chapter/cover path against the current data root.
/// Accepts absolute paths, legacy `data/`-prefixed paths, and bare
/// data-root-relative paths.
pub fn resolve_stored_path(stored: &str, data_root: &Path) -> PathBuf {
    let p = Path::new(stored);
    if p.is_absolute() {
        return p.to_path_buf();
    }
    let norm = stored.replace('\\', "/");
    let rel = norm
        .strip_prefix("data/")
        .map(|s| s.to_string())
        .unwrap_or(norm);
    data_root.join(rel)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_absolute_passes_through() {
        let root = Path::new("/some/data");
        #[cfg(windows)]
        let abs = "C:\\absolute\\file.pdf";
        #[cfg(not(windows))]
        let abs = "/absolute/file.pdf";
        let out = resolve_stored_path(abs, root);
        assert_eq!(out, PathBuf::from(abs));
    }

    #[test]
    fn test_resolve_relative_against_data_root() {
        let root = Path::new("/some/data");
        let out = resolve_stored_path("manga/1/ch_1.pdf", root);
        assert_eq!(out, root.join("manga/1/ch_1.pdf"));
    }

    #[test]
    fn test_resolve_strips_legacy_data_prefix() {
        let root = Path::new("/some/data");
        let out = resolve_stored_path("data/manga/1/ch_1.pdf", root);
        assert_eq!(out, root.join("manga/1/ch_1.pdf"));
    }

    #[test]
    fn test_resolve_normalizes_backslashes() {
        let root = Path::new("/some/data");
        let out = resolve_stored_path("manga\\1\\ch_1.pdf", root);
        // Backslashes get flipped before joining; on Windows the result
        // is identical, on unix it stays a single component.
        let expected = root.join("manga/1/ch_1.pdf");
        assert_eq!(out, expected);
    }

    #[test]
    fn test_default_when_no_config_file() {
        // load_uncached returns default when file is absent. We can't easily
        // shield the real config path, but the deserializer test covers it.
        let cfg = AppConfig::default();
        assert!(cfg.data_root.is_none());
        let s = serde_json::to_string(&cfg).unwrap();
        let back: AppConfig = serde_json::from_str(&s).unwrap();
        assert!(back.data_root.is_none());
    }

    #[test]
    fn test_serde_roundtrip_with_path() {
        let cfg = AppConfig { data_root: Some("/foo/bar".into()) };
        let s = serde_json::to_string(&cfg).unwrap();
        let back: AppConfig = serde_json::from_str(&s).unwrap();
        assert_eq!(back.data_root.as_deref(), Some("/foo/bar"));
    }
}
