mod app_config;
mod commands;
mod data_move;
mod db;
mod pdf;
mod tray_window;
mod watcher;

#[cfg(test)]
mod test_util;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, WindowEvent};

/// Toggled by the frontend via `set_close_to_tray`; read on window close.
pub(crate) struct CloseToTray(pub(crate) AtomicBool);

pub(crate) fn project_root() -> PathBuf {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        candidates.push(exe);
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd);
    }
    for start in candidates {
        let mut p = start.clone();
        for _ in 0..8 {
            if p.join("data").join("library.db").exists() {
                return p;
            }
            if !p.pop() {
                break;
            }
        }
    }
    PathBuf::from(".")
}

/// Active data folder. Honors the `app_config.json` override when its
/// path exists; otherwise `<project_root>/data`.
pub(crate) fn data_root() -> PathBuf {
    if let Some(override_path) = app_config::get().data_root {
        let p = PathBuf::from(&override_path);
        if p.exists() {
            return p;
        }
    }
    project_root().join("data")
}

/// Default data root, ignoring any config override.
pub(crate) fn default_data_root() -> PathBuf {
    project_root().join("data")
}

/// Resolve a DB-stored relative path against the current `data_root()`.
pub(crate) fn resolve_path(stored: &str) -> PathBuf {
    app_config::resolve_stored_path(stored, &data_root())
}

// ────────────────────────────────────────────────────────────────────
// Setup / lifecycle
// ────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            app.manage(data_move::MoveState::new());
            // Default off; frontend syncs localStorage via set_close_to_tray.
            app.manage(CloseToTray(AtomicBool::new(false)));
            app.manage(watcher::WatchManager::new());

            tray_window::setup_tray(app)?;

            // Rehydrate watcher state from disk so previously-added
            // folders resume monitoring on launch.
            commands::watch::restore_persisted(app.handle());

            // close-to-tray hides; otherwise exit fully. Tauri's default
            // keeps the event loop alive while a tray icon exists, which
            // surprises users who didn't opt into background mode.
            if let Some(window) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        let state = handle.state::<CloseToTray>();
                        if state.0.load(Ordering::Relaxed) {
                            api.prevent_close();
                            if let Some(w) = handle.get_webview_window("main") {
                                let _ = w.hide();
                            }
                        } else {
                            handle.exit(0);
                        }
                    }
                });
            }

            // Hide tray popup on blur. Rust-side is more reliable than
            // JS onFocusChanged — the webview doesn't always receive the
            // event in time on Windows.
            if let Some(menu_win) = app.get_webview_window("tray_menu") {
                let handle = app.handle().clone();
                menu_win.on_window_event(move |event| {
                    if let WindowEvent::Focused(false) = event {
                        if let Some(w) = handle.get_webview_window("tray_menu") {
                            let _ = w.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::series::list_local_series,
            commands::shell::read_cover,
            commands::series::delete_orphan_series,
            commands::series::get_series,
            commands::chapter::list_chapters,
            commands::chapter::read_chapter_bytes,
            commands::shell::open_in_explorer,
            commands::shell::open_url,
            commands::chapter::rescan_chapter_files,
            commands::shell::series_folder,
            commands::shell::list_chapter_images,
            commands::shell::read_image,
            commands::series::list_tags,
            commands::chapter::set_chapter_progress,
            commands::chapter::backfill_chapter_page_count,
            commands::bookmark::add_bookmark,
            commands::bookmark::remove_bookmark,
            commands::bookmark::list_bookmarks,
            commands::chapter::list_recent_reads,
            commands::series::set_series_favorite,
            commands::series::set_reading_status,
            commands::tray::set_close_to_tray,
            commands::tray::show_main_window,
            commands::tray::quit_app,
            commands::series::list_favorite_series,
            commands::series::list_recently_added,
            commands::series::list_abandoned,
            commands::stats::library_stats,
            commands::stats::reading_stats,
            commands::stats::log_reading_session,
            commands::series::top_series_week,
            commands::chapter::search_chapters,
            commands::chapter::convert_chapter_to_pdf,
            commands::chapter::convert_chapter_to_images,
            commands::data_folder::get_data_folder_info,
            commands::data_folder::set_data_folder,
            commands::data_folder::move_data_status,
            commands::data_folder::start_move_data,
            commands::data_folder::pause_move_data,
            commands::data_folder::cancel_move_data,
            commands::data_folder::finalize_move_data,
            commands::series::update_series,
            commands::series::delete_series_force,
            commands::series::bulk_update_series,
            commands::series::bulk_delete_series,
            commands::series::set_series_cover,
            commands::series::read_cover_source,
            commands::series::get_series_reader_prefs,
            commands::series::set_series_reader_prefs,
            commands::series::clear_series_reader_prefs,
            commands::chapter::update_chapter,
            commands::chapter::delete_chapter,
            commands::import::import_pdf,
            commands::import::import_cbz,
            commands::import::import_txt,
            commands::import::import_image_folder,
            commands::import::import_epub,
            commands::import::read_import_pdf,
            commands::watch::list_watch_folders,
            commands::watch::add_watch_folder,
            commands::watch::remove_watch_folder,
            commands::fonts::list_custom_fonts,
            commands::fonts::install_font,
            commands::fonts::remove_custom_font,
            commands::fonts::read_custom_font,
            commands::annotations::add_annotation,
            commands::annotations::list_annotations_for_chapter,
            commands::annotations::list_annotations_for_series,
            commands::annotations::update_annotation_note,
            commands::annotations::update_annotation_color,
            commands::annotations::remove_annotation,
            commands::annotations::export_series_annotations_md,
            commands::shell::save_text_file,
            commands::backup::create_backup,
            commands::backup::read_backup_metadata,
            commands::backup::restore_backup,
            commands::dictionary::list_dictionaries,
            commands::dictionary::install_dictionary,
            commands::dictionary::remove_dictionary,
            commands::dictionary::lookup_term,
            commands::collections::list_collections,
            commands::collections::create_collection,
            commands::collections::update_collection,
            commands::collections::delete_collection,
            commands::collections::reorder_collections,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
