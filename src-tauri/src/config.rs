/**
 * Eigen Configuration Management
 *
 * XDG-compliant file-based configuration for Eigen.
 * Config location: ~/.config/eigen/
 *
 * Based on the standardized config pattern used across the personal app suite.
 */

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ============================================================================
// Settings Schema
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "default_version")]
    pub version: String,

    #[serde(default)]
    pub syncthing: SyncthingSettings,

    #[serde(default)]
    pub ui: UiSettings,

    #[serde(default)]
    pub ai: AiSettings,

    #[serde(default)]
    pub performance: PerformanceSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncthingSettings {
    pub base_url: String,
    pub api_key: Option<String>,
    pub auto_start: bool,
    pub bundled_binary_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiSettings {
    pub theme: String, // "dark" | "light" | "system"
    pub enable_3d_constellation: bool,
    pub enable_particle_effects: bool,
    pub enable_notifications: bool,
    pub compact_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSettings {
    pub semantic_search_enabled: bool,
    pub embedding_model: String,
    pub index_on_startup: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSettings {
    pub refresh_interval_ms: u32,
    pub max_cached_files: u32,
    pub enable_file_indexing: bool,
}

// ============================================================================
// Credentials Schema
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credentials {
    #[serde(default = "default_version")]
    pub version: String,

    #[serde(default)]
    pub syncthing: SyncthingCredentials,

    #[serde(default)]
    pub s3: S3Credentials,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncthingCredentials {
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Credentials {
    pub access_key_id: Option<String>,
    pub secret_access_key: Option<String>,
}

// ============================================================================
// State Schema
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct State {
    #[serde(default = "default_version")]
    pub version: String,

    #[serde(default)]
    pub ui: UiState,

    #[serde(default)]
    pub stats: StatsState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiState {
    pub window_width: Option<u32>,
    pub window_height: Option<u32>,
    pub sidebar_collapsed: bool,
    pub last_selected_view: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsState {
    pub total_launches: u32,
    pub last_launch_timestamp: Option<String>,
}

// ============================================================================
// Default Values
// ============================================================================

fn default_version() -> String {
    "1.0.0".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: default_version(),
            syncthing: SyncthingSettings::default(),
            ui: UiSettings::default(),
            ai: AiSettings::default(),
            performance: PerformanceSettings::default(),
        }
    }
}

impl Default for SyncthingSettings {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:8384".to_string(),
            api_key: None,
            auto_start: true,
            bundled_binary_path: None,
        }
    }
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            enable_3d_constellation: true,
            enable_particle_effects: true,
            enable_notifications: true,
            compact_mode: false,
        }
    }
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            semantic_search_enabled: true,
            embedding_model: "all-MiniLM-L6-v2".to_string(),
            index_on_startup: false,
        }
    }
}

impl Default for PerformanceSettings {
    fn default() -> Self {
        Self {
            refresh_interval_ms: 5000,
            max_cached_files: 10000,
            enable_file_indexing: true,
        }
    }
}

impl Default for Credentials {
    fn default() -> Self {
        Self {
            version: default_version(),
            syncthing: SyncthingCredentials::default(),
            s3: S3Credentials::default(),
        }
    }
}

impl Default for SyncthingCredentials {
    fn default() -> Self {
        Self { api_key: None }
    }
}

impl Default for S3Credentials {
    fn default() -> Self {
        Self {
            access_key_id: None,
            secret_access_key: None,
        }
    }
}

impl Default for State {
    fn default() -> Self {
        Self {
            version: default_version(),
            ui: UiState::default(),
            stats: StatsState::default(),
        }
    }
}

impl Default for UiState {
    fn default() -> Self {
        Self {
            window_width: None,
            window_height: None,
            sidebar_collapsed: false,
            last_selected_view: "overview".to_string(),
        }
    }
}

impl Default for StatsState {
    fn default() -> Self {
        Self {
            total_launches: 0,
            last_launch_timestamp: None,
        }
    }
}

// ============================================================================
// Config Manager
// ============================================================================

pub struct ConfigManager {
    config_dir: PathBuf,
}

impl ConfigManager {
    /// Create a new ConfigManager instance
    pub fn new() -> Result<Self, String> {
        let config_dir = Self::get_config_dir()?;

        // Ensure config directory exists
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;

        Ok(Self { config_dir })
    }

    /// Get XDG-compliant config directory
    fn get_config_dir() -> Result<PathBuf, String> {
        // Check XDG_CONFIG_HOME first
        if let Ok(xdg_config) = std::env::var("XDG_CONFIG_HOME") {
            return Ok(PathBuf::from(xdg_config).join("eigen"));
        }

        // Fallback to ~/.config/eigen
        let home = std::env::var("HOME")
            .map_err(|_| "Could not determine home directory".to_string())?;

        Ok(PathBuf::from(home).join(".config").join("eigen"))
    }

    fn settings_path(&self) -> PathBuf {
        self.config_dir.join("settings.json")
    }

    fn credentials_path(&self) -> PathBuf {
        self.config_dir.join("credentials.json")
    }

    fn state_path(&self) -> PathBuf {
        self.config_dir.join("state.json")
    }

    // ========================================================================
    // Settings
    // ========================================================================

    pub fn load_settings(&self) -> Result<Settings, String> {
        let path = self.settings_path();

        if !path.exists() {
            return Ok(Settings::default());
        }

        let contents = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;

        let settings: Settings = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;

        Ok(settings)
    }

    pub fn save_settings(&self, settings: &Settings) -> Result<(), String> {
        let path = self.settings_path();
        let json = serde_json::to_string_pretty(settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        // Atomic write: write to temp file then rename
        let temp_path = path.with_extension("tmp");
        fs::write(&temp_path, json)
            .map_err(|e| format!("Failed to write settings temp file: {}", e))?;

        fs::rename(&temp_path, &path)
            .map_err(|e| format!("Failed to rename settings file: {}", e))?;

        Ok(())
    }

    // ========================================================================
    // Credentials
    // ========================================================================

    pub fn load_credentials(&self) -> Result<Credentials, String> {
        let path = self.credentials_path();

        if !path.exists() {
            return Ok(Credentials::default());
        }

        let contents = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read credentials: {}", e))?;

        let credentials: Credentials = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse credentials: {}", e))?;

        Ok(credentials)
    }

    pub fn save_credentials(&self, credentials: &Credentials) -> Result<(), String> {
        let path = self.credentials_path();
        let json = serde_json::to_string_pretty(credentials)
            .map_err(|e| format!("Failed to serialize credentials: {}", e))?;

        // Atomic write
        let temp_path = path.with_extension("tmp");
        fs::write(&temp_path, json)
            .map_err(|e| format!("Failed to write credentials temp file: {}", e))?;

        fs::rename(&temp_path, &path)
            .map_err(|e| format!("Failed to rename credentials file: {}", e))?;

        Ok(())
    }

    // ========================================================================
    // State
    // ========================================================================

    pub fn load_state(&self) -> Result<State, String> {
        let path = self.state_path();

        if !path.exists() {
            return Ok(State::default());
        }

        let contents = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read state: {}", e))?;

        let state: State = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse state: {}", e))?;

        Ok(state)
    }

    pub fn save_state(&self, state: &State) -> Result<(), String> {
        let path = self.state_path();
        let json = serde_json::to_string_pretty(state)
            .map_err(|e| format!("Failed to serialize state: {}", e))?;

        // Atomic write
        let temp_path = path.with_extension("tmp");
        fs::write(&temp_path, json)
            .map_err(|e| format!("Failed to write state temp file: {}", e))?;

        fs::rename(&temp_path, &path)
            .map_err(|e| format!("Failed to rename state file: {}", e))?;

        Ok(())
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    pub fn get_config_dir_path(&self) -> String {
        self.config_dir.to_string_lossy().to_string()
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub async fn get_settings_cmd() -> Result<Settings, String> {
    let manager = ConfigManager::new()?;
    manager.load_settings()
}

#[tauri::command]
pub async fn save_settings_cmd(settings: Settings) -> Result<(), String> {
    let manager = ConfigManager::new()?;
    manager.save_settings(&settings)
}

#[tauri::command]
pub async fn get_credentials_cmd() -> Result<Credentials, String> {
    let manager = ConfigManager::new()?;
    manager.load_credentials()
}

#[tauri::command]
pub async fn save_credentials_cmd(credentials: Credentials) -> Result<(), String> {
    let manager = ConfigManager::new()?;
    manager.save_credentials(&credentials)
}

#[tauri::command]
pub async fn get_state_cmd() -> Result<State, String> {
    let manager = ConfigManager::new()?;
    manager.load_state()
}

#[tauri::command]
pub async fn save_state_cmd(state: State) -> Result<(), String> {
    let manager = ConfigManager::new()?;
    manager.save_state(&state)
}

#[tauri::command]
pub async fn get_config_dir_cmd() -> Result<String, String> {
    let manager = ConfigManager::new()?;
    Ok(manager.get_config_dir_path())
}
