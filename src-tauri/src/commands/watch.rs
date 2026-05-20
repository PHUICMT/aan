use crate::{app_config, watcher::WatchManager};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub(crate) fn list_watch_folders(state: State<'_, WatchManager>) -> Result<Vec<String>, String> {
    Ok(state
        .list()
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect())
}

#[tauri::command]
pub(crate) fn add_watch_folder(
    path: String,
    app: AppHandle,
    state: State<'_, WatchManager>,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    state.add(p.clone(), app)?;
    persist(&state);
    Ok(())
}

#[tauri::command]
pub(crate) fn remove_watch_folder(
    path: String,
    state: State<'_, WatchManager>,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    state.remove(&p)?;
    persist(&state);
    Ok(())
}

fn persist(state: &State<'_, WatchManager>) {
    let mut cfg = app_config::get();
    cfg.watch_folders = state
        .list()
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect();
    let _ = app_config::save(&cfg);
}

/// Called on app startup to spin up watchers for previously-added folders.
pub fn restore_persisted(app: &AppHandle) {
    let cfg = app_config::get();
    if cfg.watch_folders.is_empty() {
        return;
    }
    let state = app.state::<WatchManager>();
    for raw in cfg.watch_folders {
        let p = PathBuf::from(&raw);
        let _ = state.add(p, app.clone());
    }
}
