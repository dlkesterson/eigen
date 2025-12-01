//! System lifecycle and status commands.

use crate::{SyncthingError, SyncthingState};
use serde::Serialize;
use tauri::AppHandle;
use tauri::State;
use tauri_plugin_shell::ShellExt;

/// Information about Syncthing installation
#[derive(Debug, Serialize)]
pub struct SyncthingInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub bundled: bool,
}

/// Check if Syncthing is installed and get version info
#[tauri::command]
pub fn check_syncthing_installation() -> SyncthingInfo {
    use std::process::Command;

    // Try running syncthing --version
    let syncthing_output = Command::new("syncthing").arg("--version").output();

    match syncthing_output {
        Ok(output) if output.status.success() => {
            let version_str = String::from_utf8_lossy(&output.stdout);
            let version = version_str
                .lines()
                .next()
                .map(std::string::ToString::to_string);

            // Find the syncthing path in a platform-specific way
            let path = find_syncthing_path();

            SyncthingInfo {
                installed: true,
                version,
                path,
                bundled: false,
            }
        },
        _ => SyncthingInfo {
            installed: true, // Bundled sidecar is always available
            version: Some("bundled".to_string()),
            path: Some("bundled sidecar".to_string()),
            bundled: true,
        },
    }
}

/// Find the syncthing executable path in a cross-platform way
fn find_syncthing_path() -> Option<String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        // On Windows, use 'where' command
        Command::new("where")
            .arg("syncthing")
            .output()
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    let p = String::from_utf8_lossy(&o.stdout)
                        .lines()
                        .next()
                        .map(|s| s.trim().to_string());
                    p.filter(|s| !s.is_empty())
                } else {
                    None
                }
            })
    }

    #[cfg(not(target_os = "windows"))]
    {
        // On Unix-like systems, use 'which' command
        Command::new("which")
            .arg("syncthing")
            .output()
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    let p = String::from_utf8_lossy(&o.stdout).trim().to_string();
                    if p.is_empty() {
                        None
                    } else {
                        Some(p)
                    }
                } else {
                    None
                }
            })
    }
}

/// Start the Syncthing sidecar process
#[tauri::command]
pub async fn start_syncthing_sidecar(
    app: AppHandle,
    state: State<'_, SyncthingState>,
) -> Result<String, SyncthingError> {
    let mut child_guard = state
        .sidecar_child
        .lock()
        .map_err(|e| SyncthingError::ProcessError(format!("Failed to acquire lock: {e}")))?;

    if child_guard.is_some() {
        return Ok("Syncthing already running".into());
    }

    let sidecar_command = app
        .shell()
        .sidecar("syncthing")
        .map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to create sidecar command: {e}"))
        })?
        .args([
            "-no-browser",
            "-no-restart",
            &format!("-gui-apikey={}", state.config.api_key),
            &format!("-gui-address={}:{}", state.config.host, state.config.port),
        ]);

    let (_rx, child) = sidecar_command.spawn().map_err(|e| {
        SyncthingError::ProcessError(format!("Failed to spawn syncthing sidecar: {e}"))
    })?;

    *child_guard = Some(child);
    drop(child_guard);
    Ok("Syncthing sidecar started successfully".into())
}

/// Stop the Syncthing sidecar process
#[tauri::command]
pub async fn stop_syncthing_sidecar(
    state: State<'_, SyncthingState>,
) -> Result<String, SyncthingError> {
    let mut child_guard = state
        .sidecar_child
        .lock()
        .map_err(|e| SyncthingError::ProcessError(format!("Failed to acquire lock: {e}")))?;

    if let Some(child) = child_guard.take() {
        child.kill().map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to kill sidecar process: {e}"))
        })?;
        Ok("Syncthing sidecar stopped".into())
    } else {
        Ok("Syncthing sidecar was not running".into())
    }
}

/// Ping Syncthing to check if it's responding
#[tauri::command]
pub async fn ping_syncthing(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let url = format!(
        "http://{}:{}/rest/system/ping",
        state.config.host, state.config.port
    );

    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    Ok(json)
}

/// Get Syncthing system status
#[tauri::command]
pub async fn get_system_status(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/system/status",
        state.config.host, state.config.port
    );

    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    Ok(json)
}

/// Restart Syncthing
#[tauri::command]
pub async fn restart_syncthing(state: State<'_, SyncthingState>) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/system/restart",
        state.config.host, state.config.port
    );

    client
        .post(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Get the current API configuration (for debugging)
#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn get_api_config(state: State<'_, SyncthingState>) -> (String, u16) {
    (state.config.host.clone(), state.config.port)
}
