use crate::{app_config, data_move, data_root, default_data_root};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub(crate) struct DataFolderInfo {
    current: String,
    default: String,
    is_custom: bool,
}

#[tauri::command]
pub(crate) fn get_data_folder_info() -> DataFolderInfo {
    let current = data_root();
    let default = default_data_root();
    let is_custom = current != default;
    DataFolderInfo {
        current: current.to_string_lossy().into_owned(),
        default: default.to_string_lossy().into_owned(),
        is_custom,
    }
}

/// Apply the path without copying anything. Existing data is NOT moved;
/// frontend warns the user before calling this directly.
#[tauri::command]
pub(crate) fn set_data_folder(path: Option<String>) -> Result<(), String> {
    let mut cfg = app_config::get();
    match path {
        None => cfg.data_root = None,
        Some(p) => {
            let trimmed = p.trim();
            if trimmed.is_empty() {
                cfg.data_root = None;
            } else {
                let pb = std::path::PathBuf::from(trimmed);
                std::fs::create_dir_all(&pb).map_err(|e| e.to_string())?;
                cfg.data_root = Some(pb.to_string_lossy().into_owned());
            }
        }
    }
    app_config::save(&cfg)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    // app_config is process-global. Serialize tests that touch it so the
    // CACHE doesn't leak between runs.
    #[test]
    #[serial]
    fn test_get_data_folder_info_default() {
        // Force a clean read; ignore any preexisting on-disk override since
        // the snapshot is only checked for `is_custom` sanity.
        app_config::invalidate();
        let info = get_data_folder_info();
        assert!(!info.current.is_empty());
        assert!(!info.default.is_empty());
    }

    #[test]
    #[serial]
    fn test_set_data_folder_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let p = tmp.path().to_string_lossy().into_owned();
        set_data_folder(Some(p.clone())).unwrap();
        let cfg = app_config::get();
        assert_eq!(cfg.data_root.as_deref(), Some(p.as_str()));
        // Reset to None.
        set_data_folder(None).unwrap();
        let cfg = app_config::get();
        assert!(cfg.data_root.is_none());
    }
}

#[tauri::command]
pub(crate) fn move_data_status(
    state: State<'_, std::sync::Arc<data_move::MoveState>>,
) -> Option<data_move::MoveJob> {
    if let Some(j) = data_move::snapshot(&state) {
        return Some(j);
    }
    // Fall back to a paused job journaled by a prior run.
    data_move::load_persisted(&data_root())
}

#[tauri::command]
pub(crate) fn start_move_data(
    app: tauri::AppHandle,
    state: State<'_, std::sync::Arc<data_move::MoveState>>,
    dest: String,
) -> Result<(), String> {
    let source = data_root();
    let dest_pb = std::path::PathBuf::from(&dest);
    data_move::start(app, state.inner().clone(), source, dest_pb)
}

#[tauri::command]
pub(crate) fn pause_move_data(state: State<'_, std::sync::Arc<data_move::MoveState>>) -> Result<(), String> {
    data_move::pause(&state);
    Ok(())
}

#[tauri::command]
pub(crate) fn cancel_move_data(
    state: State<'_, std::sync::Arc<data_move::MoveState>>,
    delete_partial: bool,
) -> Result<(), String> {
    data_move::cancel(&state, delete_partial);
    Ok(())
}

#[tauri::command]
pub(crate) fn finalize_move_data(
    state: State<'_, std::sync::Arc<data_move::MoveState>>,
    delete_source: bool,
) -> Result<(), String> {
    data_move::finalize(&state, delete_source)?;
    app_config::invalidate();
    Ok(())
}
