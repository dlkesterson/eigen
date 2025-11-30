use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;

pub mod commands;

#[derive(Debug, Clone)]
pub struct SyncthingConfig {
    pub api_key: String,
    pub port: u16,
    pub host: String,
}

impl SyncthingConfig {
    /// Try to read API key from Syncthing's config file
    fn read_api_key() -> Option<String> {
        // Try common config locations
        let home = std::env::var("HOME").ok()?;
        let paths = [
            format!("{}/.local/state/syncthing/config.xml", home),
            format!("{}/.config/syncthing/config.xml", home),
        ];

        for path in &paths {
            if let Ok(content) = fs::read_to_string(path) {
                // Simple XML parsing for apikey
                if let Some(start) = content.find("<apikey>") {
                    if let Some(end) = content[start..].find("</apikey>") {
                        let key = &content[start + 8..start + end];
                        if !key.is_empty() {
                            return Some(key.to_string());
                        }
                    }
                }
            }
        }
        None
    }
}

impl Default for SyncthingConfig {
    fn default() -> Self {
        Self {
            api_key: Self::read_api_key().unwrap_or_else(|| "no-api-key".to_string()),
            port: 8384,
            host: "127.0.0.1".to_string(),
        }
    }
}

pub struct SyncthingState {
    pub config: SyncthingConfig,
    pub sidecar_child: Mutex<Option<CommandChild>>,
}

impl Default for SyncthingState {
    fn default() -> Self {
        Self {
            config: SyncthingConfig::default(),
            sidecar_child: Mutex::new(None),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SyncthingError {
    NotRunning,
    HttpError(String),
    ParseError(String),
    ProcessError(String),
}

impl std::fmt::Display for SyncthingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncthingError::NotRunning => write!(f, "Syncthing is not running"),
            SyncthingError::HttpError(e) => write!(f, "HTTP error: {}", e),
            SyncthingError::ParseError(e) => write!(f, "Parse error: {}", e),
            SyncthingError::ProcessError(e) => write!(f, "Process error: {}", e),
        }
    }
}

impl std::error::Error for SyncthingError {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(SyncthingState::default())
        .setup(|app| {
            // Set up tray menu
            use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
            use tauri::tray::TrayIconBuilder;

            let status = MenuItemBuilder::with_id("status", "Status: Checking...")
                .enabled(false)
                .build(app)?;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let show = MenuItemBuilder::with_id("show", "Show Window").build(app)?;
            let hide = MenuItemBuilder::with_id("hide", "Hide to Tray").build(app)?;
            let separator2 = PredefinedMenuItem::separator(app)?;
            let open_syncthing =
                MenuItemBuilder::with_id("open_syncthing", "Open Syncthing Web UI").build(app)?;
            let separator3 = PredefinedMenuItem::separator(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit Eigen").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&status)
                .item(&separator1)
                .item(&show)
                .item(&hide)
                .item(&separator2)
                .item(&open_syncthing)
                .item(&separator3)
                .item(&quit)
                .build()?;

            // Load tray icon - embedded at compile time
            let tray_icon_bytes = include_bytes!("../icons/tray_icon.png");
            let tray_img =
                image::load_from_memory(tray_icon_bytes).expect("Failed to load tray icon");
            let rgba = tray_img.to_rgba8();
            let (width, height) = rgba.dimensions();
            let tray_icon = tauri::image::Image::new_owned(rgba.into_raw(), width, height);

            let _tray = TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .menu(&menu)
                .tooltip("Eigen - Syncthing Manager")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        },
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        },
                        "open_syncthing" => {
                            // Open Syncthing web UI in browser
                            let _ = open::that("http://127.0.0.1:8384");
                        },
                        "quit" => {
                            // Stop syncthing sidecar before quitting
                            let state = app.state::<SyncthingState>();
                            if let Ok(mut child_guard) = state.sidecar_child.lock() {
                                if let Some(child) = child_guard.take() {
                                    let _ = child.kill();
                                }
                            }
                            app.exit(0);
                        },
                        _ => {},
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    use tauri::tray::TrayIconEvent;
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            // Toggle window visibility
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Handle window close to minimize to tray instead
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Prevent the window from actually closing
                        api.prevent_close();
                        // Just hide it instead
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_syncthing_installation,
            commands::start_syncthing_sidecar,
            commands::stop_syncthing_sidecar,
            commands::get_system_status,
            commands::get_connections,
            commands::get_config,
            commands::update_options,
            commands::get_folder_status,
            commands::pause_folder,
            commands::resume_folder,
            commands::rescan_folder,
            commands::get_api_config,
            commands::get_device_id,
            commands::add_device,
            commands::remove_device,
            commands::add_folder,
            commands::remove_folder,
            commands::share_folder,
            // Advanced folder configuration
            commands::add_folder_advanced,
            commands::update_folder_config,
            commands::get_folder_config,
            // Ignore patterns
            commands::get_folder_ignores,
            commands::set_folder_ignores,
            // System logs
            commands::get_system_logs,
            // Event API
            commands::get_events,
            // Advanced device settings
            commands::add_device_advanced,
            commands::update_device_config,
            commands::get_device_config,
            commands::pause_device,
            commands::resume_device,
            // Folder sharing
            commands::unshare_folder,
            // System management
            commands::restart_syncthing,
            // File browser
            commands::open_folder_in_explorer,
            commands::browse_folder,
            commands::browse_folder_recursive,
            // Conflict resolution
            commands::scan_for_conflicts,
            commands::delete_conflict_file,
            commands::resolve_conflict_keep_conflict,
            // File versioning
            commands::browse_versions,
            commands::restore_version,
            // Tray
            commands::update_tray_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
