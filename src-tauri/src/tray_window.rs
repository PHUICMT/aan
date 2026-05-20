use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition,
};

#[cfg(windows)]
pub(crate) fn round_window_corners(win: &tauri::WebviewWindow) {
    use windows::Win32::Graphics::Gdi::{CreateRoundRectRgn, SetWindowRgn};
    if let Ok(hwnd) = win.hwnd() {
        let size = win.outer_size().ok();
        let (w, h) = size
            .map(|s| (s.width as i32, s.height as i32))
            .unwrap_or((220, 84));
        unsafe {
            // +1 because CreateRoundRectRgn is right/bottom-exclusive.
            let rgn = CreateRoundRectRgn(0, 0, w + 1, h + 1, 16, 16);
            let _ = SetWindowRgn(hwnd, Some(rgn), true);
            // SetWindowRgn takes ownership of the region — do NOT delete here.

            // DWMSBT_TRANSIENTWINDOW (Win11 popup acrylic) doesn't show
            // through Tauri 2's transparent path on WebView2; opaque popup instead.
        }
    }
}

/// Install the system tray icon and wire its click handlers to the
/// custom Svelte `tray_menu` window.
pub(crate) fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    // No native menu attached — right-click opens the custom
    // Svelte "tray_menu" window to keep styling consistent.
    let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Aan")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                    }
                }
                TrayIconEvent::Click {
                    button: MouseButton::Right,
                    button_state: MouseButtonState::Up,
                    position,
                    ..
                } => {
                    // Anchor the menu's bottom-right corner at the
                    // cursor so it opens upward, mimicking the OS tray menu.
                    if let Some(menu_win) = app.get_webview_window("tray_menu") {
                        let scale = menu_win.scale_factor().unwrap_or(1.0);
                        let size = menu_win.outer_size().ok();
                        let (mw, mh) = size
                            .map(|s| (s.width as f64, s.height as f64))
                            .unwrap_or((200.0 * scale, 132.0 * scale));
                        let target = PhysicalPosition::new(
                            (position.x - mw).max(0.0) as i32,
                            (position.y - mh).max(0.0) as i32,
                        );
                        let _ = menu_win.set_position(target);
                        let _ = menu_win.show();
                        let _ = menu_win.set_focus();
                        #[cfg(windows)]
                        round_window_corners(&menu_win);
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    // OS-level rounded corners on Win11+ (Tauri's transparent
    // path doesn't reliably round popups).
    #[cfg(windows)]
    if let Some(menu_win) = app.get_webview_window("tray_menu") {
        round_window_corners(&menu_win);
        // Match the .tray-menu CSS background to avoid chrome
        // bleed at the rounded edge.
        let _ = menu_win.set_background_color(Some(
            tauri::window::Color(0x1a, 0x1c, 0x28, 0xff),
        ));
    }

    Ok(())
}
