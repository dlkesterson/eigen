use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;

pub mod commands;

// =============================================================================
// Configuration Types
// =============================================================================

#[derive(Debug, Clone)]
pub struct SyncthingConfig {
    pub api_key: String,
    pub port: u16,
    pub host: String,
}

impl SyncthingConfig {
    /// Create a new SyncthingConfig with explicit values
    /// Prefer this over Default when you have specific values
    pub fn new(api_key: String, host: String, port: u16) -> Self {
        Self {
            api_key,
            host,
            port,
        }
    }

    /// Try to read API key from Syncthing's config file
    /// Supports both Linux and Windows config paths
    fn read_api_key() -> Option<String> {
        let paths = Self::get_config_paths();

        for path in &paths {
            if let Some(key) = Self::extract_api_key_from_file(path) {
                return Some(key);
            }
        }
        None
    }

    /// Get all possible config file paths for the current platform
    fn get_config_paths() -> Vec<String> {
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
            if let Ok(app_data) = std::env::var("APPDATA") {
                paths.push(format!("{app_data}\\Syncthing\\config.xml"));
            }
        }

        paths
    }

    /// Extract API key from a config file path
    fn extract_api_key_from_file(path: &str) -> Option<String> {
        let content = fs::read_to_string(path).ok()?;

        // Simple XML parsing for apikey
        let start = content.find("<apikey>")?;
        let after_start = &content[start + 8..];
        let end = after_start.find("</apikey>")?;
        let key = &after_start[..end];

        if key.is_empty() {
            None
        } else {
            Some(key.to_string())
        }
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

// =============================================================================
// Application State
// =============================================================================

pub struct SyncthingState {
    pub config: SyncthingConfig,
    pub sidecar_child: Mutex<Option<CommandChild>>,
}

impl SyncthingState {
    /// Create a new SyncthingState with explicit config
    pub fn new(config: SyncthingConfig) -> Self {
        Self {
            config,
            sidecar_child: Mutex::new(None),
        }
    }
}

impl Default for SyncthingState {
    fn default() -> Self {
        Self::new(SyncthingConfig::default())
    }
}

// =============================================================================
// Error Types - Enhanced with context and recoverability
// =============================================================================

/// Error categories for different types of failures
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorKind {
    /// Syncthing service is not running
    NotRunning,
    /// Network/HTTP communication failure
    Network,
    /// Failed to parse response data
    Parse,
    /// Process or system operation failed
    Process,
    /// Configuration error
    Config,
    /// Resource not found (device, folder, file)
    NotFound,
    /// Resource already exists
    AlreadyExists,
    /// Validation failed
    Validation,
    /// Lock acquisition failed
    Lock,
}

/// Enhanced error type with context and recoverability information
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncthingError {
    /// The category of error
    pub kind: ErrorKind,
    /// Human-readable error message
    pub message: String,
    /// Additional context (e.g., device_id, folder_id, url)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
    /// Whether this error is potentially recoverable via retry
    pub recoverable: bool,
    /// Suggested action for recovery
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recovery_hint: Option<String>,
}

impl SyncthingError {
    /// Create a new error with the given kind and message
    pub fn new(kind: ErrorKind, message: impl Into<String>) -> Self {
        let recoverable = matches!(
            kind,
            ErrorKind::NotRunning | ErrorKind::Network | ErrorKind::Lock
        );

        Self {
            kind,
            message: message.into(),
            context: None,
            recoverable,
            recovery_hint: None,
        }
    }

    /// Add context to the error (e.g., which resource failed)
    pub fn with_context(mut self, context: impl Into<String>) -> Self {
        self.context = Some(context.into());
        self
    }

    /// Override the default recoverability
    pub fn with_recoverable(mut self, recoverable: bool) -> Self {
        self.recoverable = recoverable;
        self
    }

    /// Add a recovery hint
    pub fn with_recovery_hint(mut self, hint: impl Into<String>) -> Self {
        self.recovery_hint = Some(hint.into());
        self
    }

    // Convenience constructors for common error types

    pub fn not_running() -> Self {
        Self::new(ErrorKind::NotRunning, "Syncthing is not running")
            .with_recovery_hint("Start Syncthing or wait for it to initialize")
    }

    pub fn http(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Network, message)
            .with_recovery_hint("Check network connectivity and Syncthing status")
    }

    pub fn parse(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Parse, message)
    }

    pub fn process(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Process, message)
    }

    pub fn config(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Config, message)
    }

    pub fn not_found(resource: impl Into<String>) -> Self {
        Self::new(
            ErrorKind::NotFound,
            format!("{} not found", resource.into()),
        )
        .with_recoverable(false)
    }

    pub fn already_exists(resource: impl Into<String>) -> Self {
        Self::new(
            ErrorKind::AlreadyExists,
            format!("{} already exists", resource.into()),
        )
        .with_recoverable(false)
    }

    pub fn validation(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Validation, message).with_recoverable(false)
    }

    pub fn lock(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Lock, message)
            .with_recovery_hint("Retry the operation after a short delay")
    }
}

impl std::fmt::Display for SyncthingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.context {
            Some(ctx) => write!(f, "{} ({})", self.message, ctx),
            None => write!(f, "{}", self.message),
        }
    }
}

impl std::error::Error for SyncthingError {}

// Conversion from reqwest errors
impl From<reqwest::Error> for SyncthingError {
    fn from(e: reqwest::Error) -> Self {
        if e.is_connect() {
            Self::not_running().with_context(e.to_string())
        } else if e.is_timeout() {
            Self::http("Request timed out").with_context(e.to_string())
        } else {
            Self::http(e.to_string())
        }
    }
}

// =============================================================================
// HTTP Client Helper
// =============================================================================

/// Helper for making HTTP requests to the Syncthing API
pub struct SyncthingClient {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl SyncthingClient {
    /// Create a new client from SyncthingConfig
    pub fn new(config: &SyncthingConfig) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: format!("http://{}:{}", config.host, config.port),
            api_key: config.api_key.clone(),
        }
    }

    /// Create a client with a custom timeout
    pub fn with_timeout(
        config: &SyncthingConfig,
        timeout_secs: u64,
    ) -> Result<Self, SyncthingError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(timeout_secs))
            .build()
            .map_err(|e| SyncthingError::http(format!("Failed to create HTTP client: {e}")))?;

        Ok(Self {
            client,
            base_url: format!("http://{}:{}", config.host, config.port),
            api_key: config.api_key.clone(),
        })
    }

    /// Build a URL for an API endpoint
    pub fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    /// Make a GET request and parse JSON response
    pub async fn get<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
    ) -> Result<T, SyncthingError> {
        let url = self.url(path);
        let res = self
            .client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .send()
            .await?;

        self.handle_response(res).await
    }

    /// Make a POST request with optional JSON body
    pub async fn post<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
        body: Option<&serde_json::Value>,
    ) -> Result<T, SyncthingError> {
        let url = self.url(path);
        let mut req = self.client.post(&url).header("X-API-Key", &self.api_key);

        if let Some(b) = body {
            req = req.json(b);
        }

        let res = req.send().await?;
        self.handle_response(res).await
    }

    /// Make a POST request without expecting a response body
    pub async fn post_no_response(
        &self,
        path: &str,
        body: Option<&serde_json::Value>,
    ) -> Result<(), SyncthingError> {
        let url = self.url(path);
        let mut req = self.client.post(&url).header("X-API-Key", &self.api_key);

        if let Some(b) = body {
            req = req.json(b);
        }

        let res = req.send().await?;
        self.check_status(res).await
    }

    /// Make a PUT request with JSON body
    pub async fn put(&self, path: &str, body: &serde_json::Value) -> Result<(), SyncthingError> {
        let url = self.url(path);
        let res = self
            .client
            .put(&url)
            .header("X-API-Key", &self.api_key)
            .json(body)
            .send()
            .await?;

        self.check_status(res).await
    }

    /// Make a DELETE request
    pub async fn delete(&self, path: &str) -> Result<(), SyncthingError> {
        let url = self.url(path);
        let res = self
            .client
            .delete(&url)
            .header("X-API-Key", &self.api_key)
            .send()
            .await?;

        self.check_status(res).await
    }

    /// Handle response and parse JSON
    async fn handle_response<T: serde::de::DeserializeOwned>(
        &self,
        res: reqwest::Response,
    ) -> Result<T, SyncthingError> {
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(SyncthingError::http(format!("HTTP {}: {}", status, body)));
        }

        res.json::<T>()
            .await
            .map_err(|e| SyncthingError::parse(format!("Failed to parse response: {e}")))
    }

    /// Check response status without parsing body
    async fn check_status(&self, res: reqwest::Response) -> Result<(), SyncthingError> {
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(SyncthingError::http(format!("HTTP {}: {}", status, body)));
        }
        Ok(())
    }
}

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
            let tray_img = match image::load_from_memory(tray_icon_bytes) {
                Ok(img) => img,
                Err(e) => {
                    eprintln!("Warning: Failed to load tray icon: {e}. Using fallback.");
                    // Create a simple 16x16 placeholder image
                    image::DynamicImage::new_rgba8(16, 16)
                },
            };
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
            commands::files::get_version_storage_info,
            commands::files::cleanup_versions,
            commands::files::cleanup_versions_older_than,
            // Event commands (events, logs, tray)
            commands::events::get_events,
            commands::events::get_system_logs,
            commands::events::update_tray_status,
            // Pending request commands
            commands::pending::get_pending_devices,
            commands::pending::get_pending_folders,
            commands::pending::get_pending_requests,
            commands::pending::accept_pending_device,
            commands::pending::dismiss_pending_device,
            commands::pending::accept_pending_folder,
            commands::pending::dismiss_pending_folder,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Fatal error running Tauri application: {e}");
            std::process::exit(1);
        });
}
