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
    /// Supports both Linux and Windows config paths
    fn read_api_key() -> Option<String> {
        let mut paths = Vec::new();

        // Linux/macOS config paths
        if let Ok(home) = std::env::var("HOME") {
            paths.push(format!("{home}/.local/state/syncthing/config.xml"));
            paths.push(format!("{home}/.config/syncthing/config.xml"));
        }

        // Windows config paths
        #[cfg(target_os = "windows")]
        {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                paths.push(format!("{local_app_data}\\Syncthing\\config.xml"));
            }
            if let Ok(user_profile) = std::env::var("USERPROFILE") {
                paths.push(format!(
                    "{user_profile}\\AppData\\Local\\Syncthing\\config.xml"
                ));
            }
        }

        // Also try APPDATA on Windows (some installations use this)
        #[cfg(target_os = "windows")]
        {
            if let Ok(app_data) = std::env::var("APPDATA") {
                paths.push(format!("{app_data}\\Syncthing\\config.xml"));
            }
        }

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
            Self::NotRunning => write!(f, "Syncthing is not running"),
            Self::HttpError(e) => write!(f, "HTTP error: {e}"),
            Self::ParseError(e) => write!(f, "Parse error: {e}"),
            Self::ProcessError(e) => write!(f, "Process error: {e}"),
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
            // System commands
            commands::system::check_syncthing_installation,
            commands::system::start_syncthing_sidecar,
            commands::system::stop_syncthing_sidecar,
            commands::system::ping_syncthing,
            commands::system::get_system_status,
            commands::system::restart_syncthing,
            commands::system::get_api_config,
            // Config commands
            commands::config::get_connections,
            commands::config::get_config,
            commands::config::update_options,
            // Folder commands
            commands::folders::get_folder_status,
            commands::folders::pause_folder,
            commands::folders::resume_folder,
            commands::folders::rescan_folder,
            commands::folders::add_folder,
            commands::folders::add_folder_advanced,
            commands::folders::remove_folder,
            commands::folders::update_folder_config,
            commands::folders::get_folder_config,
            commands::folders::share_folder,
            commands::folders::unshare_folder,
            // Device commands
            commands::devices::get_device_id,
            commands::devices::add_device,
            commands::devices::add_device_advanced,
            commands::devices::remove_device,
            commands::devices::update_device_config,
            commands::devices::get_device_config,
            commands::devices::pause_device,
            commands::devices::resume_device,
            // File commands (browser, ignores, conflicts, versions)
            commands::files::open_folder_in_explorer,
            commands::files::browse_folder,
            commands::files::browse_folder_recursive,
            commands::files::get_folder_ignores,
            commands::files::set_folder_ignores,
            commands::files::scan_for_conflicts,
            commands::files::delete_conflict_file,
            commands::files::resolve_conflict_keep_conflict,
            commands::files::browse_versions,
            commands::files::restore_version,
            // Event commands (events, logs, tray)
            commands::events::get_events,
            commands::events::get_system_logs,
            commands::events::update_tray_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
