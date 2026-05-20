use crate::CloseToTray;
use std::sync::atomic::Ordering;
use tauri::{Manager, State};

#[tauri::command]
pub(crate) fn set_close_to_tray(state: State<'_, CloseToTray>, on: bool) {
    state.0.store(on, Ordering::Relaxed);
}

#[tauri::command]
pub(crate) fn show_main_window(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        // Windows blocks SetForegroundWindow for focus-stealing prevention;
        // raw ShowWindow(SW_RESTORE) + SetForegroundWindow works around it
        // when restoring from the taskbar.
        #[cfg(windows)]
        if let Ok(hwnd) = w.hwnd() {
            use windows::Win32::UI::WindowsAndMessaging::{
                ShowWindow, SetForegroundWindow, SW_RESTORE,
            };
            unsafe {
                let _ = ShowWindow(hwnd, SW_RESTORE);
                let _ = SetForegroundWindow(hwnd);
            }
        }
    }
}

#[tauri::command]
pub(crate) fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
