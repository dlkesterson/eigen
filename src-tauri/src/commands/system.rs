//! System lifecycle and status commands.

use crate::SyncthingState;
use crate::{SyncthingClient, SyncthingError};
use serde::Serialize;
use tauri::AppHandle;
use tauri::State;
use tauri_plugin_shell::ShellExt;

/// Information about Syncthing installation
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
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
    match Command::new("syncthing").arg("--version").output() {
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
        Ok(_) | Err(_) => {
            // Syncthing not found in PATH, but bundled sidecar is always available
            SyncthingInfo {
                installed: true,
                version: Some("bundled".to_string()),
                path: Some("bundled sidecar".to_string()),
                bundled: true,
            }
        },
    }
}

/// Find the syncthing executable path in a cross-platform way
fn find_syncthing_path() -> Option<String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        Command::new("where")
            .arg("syncthing")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .next()
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
            })
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg("syncthing")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .filter(|p| !p.is_empty())
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
        .map_err(|e| SyncthingError::lock(format!("Failed to acquire sidecar lock: {e}")))?;

    // Check if already running - explicit pattern match
    if child_guard.is_some() {
        return Ok("Syncthing already running".into());
    }

    let sidecar_command = app
        .shell()
        .sidecar("syncthing")
        .map_err(|e| {
            SyncthingError::process(format!("Failed to create sidecar command: {e}"))
                .with_context("syncthing")
        })?
        .args([
            "-no-browser",
            "-no-restart",
            &format!("-gui-apikey={}", state.config.api_key),
            &format!("-gui-address={}:{}", state.config.host, state.config.port),
        ]);

    let (_rx, child) = sidecar_command.spawn().map_err(|e| {
        SyncthingError::process(format!("Failed to spawn syncthing sidecar: {e}"))
            .with_recovery_hint("Check that the Syncthing binary is accessible")
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
        .map_err(|e| SyncthingError::lock(format!("Failed to acquire sidecar lock: {e}")))?;

    match child_guard.take() {
        Some(child) => {
            child.kill().map_err(|e| {
                SyncthingError::process(format!("Failed to kill sidecar process: {e}"))
            })?;
            Ok("Syncthing sidecar stopped".into())
        },
        None => Ok("Syncthing sidecar was not running".into()),
    }
}

/// Ping Syncthing to check if it's responding
#[tauri::command]
pub async fn ping_syncthing(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::with_timeout(&state.config, 5)?;
    client.get("/rest/system/ping").await
}

/// Get Syncthing system status
#[tauri::command]
pub async fn get_system_status(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client.get("/rest/system/status").await
}

/// Restart Syncthing
#[tauri::command]
pub async fn restart_syncthing(state: State<'_, SyncthingState>) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client.post_no_response("/rest/system/restart", None).await
}

/// Get the current API configuration (for debugging)
#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn get_api_config(state: State<'_, SyncthingState>) -> (String, u16) {
    (state.config.host.clone(), state.config.port)
}
