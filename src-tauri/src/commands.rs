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
    // Check for system-installed syncthing
    use std::process::Command;
    match Command::new("syncthing").arg("--version").output() {
        Ok(output) => {
            let version_str = String::from_utf8_lossy(&output.stdout);
            let version = version_str.lines().next().map(|s| s.to_string());

            // Try to get the path
            let path = Command::new("which")
                .arg("syncthing")
                .output()
                .ok()
                .and_then(|o| {
                    let p = String::from_utf8_lossy(&o.stdout).trim().to_string();
                    if p.is_empty() {
                        None
                    } else {
                        Some(p)
                    }
                });

            SyncthingInfo {
                installed: true,
                version,
                path,
                bundled: false,
            }
        },
        Err(_) => SyncthingInfo {
            installed: true, // Bundled sidecar is always available
            version: Some("bundled".to_string()),
            path: Some("bundled sidecar".to_string()),
            bundled: true,
        },
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
        .map_err(|e| SyncthingError::ProcessError(format!("Failed to acquire lock: {}", e)))?;

    if child_guard.is_some() {
        return Ok("Syncthing already running".into());
    }

    // Use the bundled sidecar
    let sidecar_command = app
        .shell()
        .sidecar("syncthing")
        .map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to create sidecar command: {}", e))
        })?
        .args([
            "-no-browser",
            "-no-restart",
            &format!("-gui-apikey={}", state.config.api_key),
            &format!("-gui-address={}:{}", state.config.host, state.config.port),
        ]);

    let (_rx, child) = sidecar_command.spawn().map_err(|e| {
        SyncthingError::ProcessError(format!("Failed to spawn syncthing sidecar: {}", e))
    })?;

    *child_guard = Some(child);
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
        .map_err(|e| SyncthingError::ProcessError(format!("Failed to acquire lock: {}", e)))?;

    if let Some(child) = child_guard.take() {
        child.kill().map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to kill sidecar process: {}", e))
        })?;
        Ok("Syncthing sidecar stopped".into())
    } else {
        Ok("Syncthing sidecar was not running".into())
    }
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

/// Get Syncthing connections info
#[tauri::command]
pub async fn get_connections(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/system/connections",
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

/// Get Syncthing configuration
#[tauri::command]
pub async fn get_config(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config",
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

/// Update global Syncthing options
#[tauri::command]
pub async fn update_options(
    state: State<'_, SyncthingState>,
    options: serde_json::Value,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();

    // First get the current config
    let get_url = format!(
        "http://{}:{}/rest/config",
        state.config.host, state.config.port
    );

    let current_config: serde_json::Value = client
        .get(&get_url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Merge options into current config
    let mut updated_config = current_config.clone();
    if let (Some(config_obj), Some(current_options)) = (
        updated_config.as_object_mut(),
        current_config.get("options"),
    ) {
        let mut new_options = current_options.clone();
        if let (Some(opts_obj), Some(updates_obj)) =
            (new_options.as_object_mut(), options.as_object())
        {
            for (key, value) in updates_obj {
                opts_obj.insert(key.clone(), value.clone());
            }
        }
        config_obj.insert("options".to_string(), new_options);
    }

    // Save the updated config
    let put_url = format!(
        "http://{}:{}/rest/config",
        state.config.host, state.config.port
    );

    let res = client
        .put(&put_url)
        .header("X-API-Key", &state.config.api_key)
        .json(&updated_config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    if !res.status().is_success() {
        return Err(SyncthingError::HttpError(format!(
            "Failed to update options: {}",
            res.status()
        )));
    }

    Ok(())
}

/// Get folder status
#[tauri::command]
pub async fn get_folder_status(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/db/status?folder={}",
        state.config.host, state.config.port, folder_id
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

/// Pause a folder
#[tauri::command]
pub async fn pause_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/folders/{}",
        state.config.host, state.config.port, folder_id
    );

    // Get current config
    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Update paused status
    config["paused"] = serde_json::Value::Bool(true);

    // Put updated config
    client
        .put(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Resume a folder
#[tauri::command]
pub async fn resume_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/folders/{}",
        state.config.host, state.config.port, folder_id
    );

    // Get current config
    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Update paused status
    config["paused"] = serde_json::Value::Bool(false);

    // Put updated config
    client
        .put(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Force rescan of a folder
#[tauri::command]
pub async fn rescan_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/db/scan?folder={}",
        state.config.host, state.config.port, folder_id
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
pub fn get_api_config(state: State<'_, SyncthingState>) -> (String, u16) {
    (state.config.host.clone(), state.config.port)
}

/// Get this device's ID
#[tauri::command]
pub async fn get_device_id(state: State<'_, SyncthingState>) -> Result<String, SyncthingError> {
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

    json["myID"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| SyncthingError::ParseError("No device ID found".into()))
}

/// Add a new device to Syncthing
#[tauri::command]
pub async fn add_device(
    state: State<'_, SyncthingState>,
    device_id: String,
    name: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();

    // First, get current config
    let config_url = format!(
        "http://{}:{}/rest/config",
        state.config.host, state.config.port
    );

    let res = client
        .get(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Check if device already exists
    if let Some(devices) = config["devices"].as_array() {
        for device in devices {
            if device["deviceID"].as_str() == Some(&device_id) {
                return Err(SyncthingError::ProcessError("Device already exists".into()));
            }
        }
    }

    // Create new device config
    let new_device = serde_json::json!({
        "deviceID": device_id,
        "name": name,
        "addresses": ["dynamic"],
        "compression": "metadata",
        "introducer": false,
        "paused": false,
        "autoAcceptFolders": false,
    });

    // Add to devices array
    if let Some(devices) = config["devices"].as_array_mut() {
        devices.push(new_device);
    }

    // Save updated config
    client
        .put(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Remove a device from Syncthing
#[tauri::command]
pub async fn remove_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/devices/{}",
        state.config.host, state.config.port, device_id
    );

    client
        .delete(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Add a new folder to Syncthing
#[tauri::command]
pub async fn add_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    folder_label: String,
    folder_path: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();

    // First, get current config
    let config_url = format!(
        "http://{}:{}/rest/config",
        state.config.host, state.config.port
    );

    let res = client
        .get(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Check if folder already exists
    if let Some(folders) = config["folders"].as_array() {
        for folder in folders {
            if folder["id"].as_str() == Some(&folder_id) {
                return Err(SyncthingError::ProcessError("Folder already exists".into()));
            }
        }
    }

    // Create new folder config
    let new_folder = serde_json::json!({
        "id": folder_id,
        "label": folder_label,
        "path": folder_path,
        "type": "sendreceive",
        "rescanIntervalS": 3600,
        "fsWatcherEnabled": true,
        "fsWatcherDelayS": 10,
        "ignorePerms": false,
        "autoNormalize": true,
        "paused": false,
        "devices": [],
        "minDiskFree": {
            "value": 1,
            "unit": "%"
        },
        "versioning": {
            "type": "",
            "params": {},
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        },
        "copiers": 0,
        "pullerMaxPendingKiB": 0,
        "hashers": 0,
        "order": "random",
        "ignoreDelete": false,
        "scanProgressIntervalS": 0,
        "pullerPauseS": 0,
        "maxConflicts": 10,
        "disableSparseFiles": false,
        "disableTempIndexes": false,
        "weakHashThresholdPct": 25,
        "markerName": ".stfolder",
        "copyOwnershipFromParent": false,
        "modTimeWindowS": 0,
        "maxConcurrentWrites": 2,
        "disableFsync": false,
        "blockPullOrder": "standard",
        "copyRangeMethod": "standard",
        "caseSensitiveFS": false,
        "junctionsAsDirs": false,
        "syncOwnership": false,
        "sendOwnership": false,
        "syncXattrs": false,
        "sendXattrs": false,
        "xattrFilter": {
            "entries": [],
            "maxSingleEntrySize": 1024,
            "maxTotalSize": 4096
        }
    });

    // Add to folders array
    if let Some(folders) = config["folders"].as_array_mut() {
        folders.push(new_folder);
    }

    // Save updated config
    client
        .put(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Remove a folder from Syncthing
#[tauri::command]
pub async fn remove_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/folders/{}",
        state.config.host, state.config.port, folder_id
    );

    client
        .delete(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Share a folder with a specific device
#[tauri::command]
pub async fn share_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/folders/{}",
        state.config.host, state.config.port, folder_id
    );

    // 1. Get current folder config
    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut folder_config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // 2. Check if device is already added
    let mut device_exists = false;
    if let Some(devices) = folder_config["devices"].as_array() {
        for device in devices {
            if device["deviceID"].as_str() == Some(&device_id) {
                device_exists = true;
                break;
            }
        }
    }

    // 3. Add device if not exists
    if !device_exists {
        let new_device_entry = serde_json::json!({
            "deviceID": device_id,
            "introducedBy": ""
        });

        if let Some(devices) = folder_config["devices"].as_array_mut() {
            devices.push(new_device_entry);
        }

        // 4. Update config
        client
            .put(&url)
            .header("X-API-Key", &state.config.api_key)
            .json(&folder_config)
            .send()
            .await
            .map_err(|e| SyncthingError::HttpError(e.to_string()))?;
    }

    Ok(())
}

// ============================================================================
// Advanced Folder Configuration
// ============================================================================

/// Add a folder with advanced configuration options
#[tauri::command]
pub async fn add_folder_advanced(
    state: State<'_, SyncthingState>,
    folder_id: String,
    folder_label: String,
    folder_path: String,
    versioning_type: Option<String>,
    versioning_params: Option<serde_json::Value>,
    rescan_interval_s: Option<u32>,
    fs_watcher_enabled: Option<bool>,
    fs_watcher_delay_s: Option<u32>,
    ignore_perms: Option<bool>,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();

    let config_url = format!(
        "http://{}:{}/rest/config",
        state.config.host, state.config.port
    );

    let res = client
        .get(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Check if folder already exists
    if let Some(folders) = config["folders"].as_array() {
        for folder in folders {
            if folder["id"].as_str() == Some(&folder_id) {
                return Err(SyncthingError::ProcessError("Folder already exists".into()));
            }
        }
    }

    // Build versioning config
    let versioning = match versioning_type.as_deref() {
        Some("simple") => serde_json::json!({
            "type": "simple",
            "params": versioning_params.unwrap_or(serde_json::json!({
                "keep": "5"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("staggered") => serde_json::json!({
            "type": "staggered",
            "params": versioning_params.unwrap_or(serde_json::json!({
                "cleanInterval": "3600",
                "maxAge": "31536000"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("trashcan") => serde_json::json!({
            "type": "trashcan",
            "params": versioning_params.unwrap_or(serde_json::json!({
                "cleanoutDays": "0"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("external") => serde_json::json!({
            "type": "external",
            "params": versioning_params.unwrap_or(serde_json::json!({
                "command": ""
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        _ => serde_json::json!({
            "type": "",
            "params": {},
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
    };

    let new_folder = serde_json::json!({
        "id": folder_id,
        "label": folder_label,
        "path": folder_path,
        "type": "sendreceive",
        "rescanIntervalS": rescan_interval_s.unwrap_or(3600),
        "fsWatcherEnabled": fs_watcher_enabled.unwrap_or(true),
        "fsWatcherDelayS": fs_watcher_delay_s.unwrap_or(10),
        "ignorePerms": ignore_perms.unwrap_or(false),
        "autoNormalize": true,
        "paused": false,
        "devices": [],
        "minDiskFree": { "value": 1, "unit": "%" },
        "versioning": versioning,
        "copiers": 0,
        "pullerMaxPendingKiB": 0,
        "hashers": 0,
        "order": "random",
        "ignoreDelete": false,
        "scanProgressIntervalS": 0,
        "pullerPauseS": 0,
        "maxConflicts": 10,
        "disableSparseFiles": false,
        "disableTempIndexes": false,
        "weakHashThresholdPct": 25,
        "markerName": ".stfolder",
        "copyOwnershipFromParent": false,
        "modTimeWindowS": 0,
        "maxConcurrentWrites": 2,
        "disableFsync": false,
        "blockPullOrder": "standard",
        "copyRangeMethod": "standard",
        "caseSensitiveFS": false,
        "junctionsAsDirs": false,
        "syncOwnership": false,
        "sendOwnership": false,
        "syncXattrs": false,
        "sendXattrs": false,
        "xattrFilter": {
            "entries": [],
            "maxSingleEntrySize": 1024,
            "maxTotalSize": 4096
        }
    });

    if let Some(folders) = config["folders"].as_array_mut() {
        folders.push(new_folder);
    }

    client
        .put(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Update folder configuration
#[tauri::command]
pub async fn update_folder_config(
    state: State<'_, SyncthingState>,
    folder_id: String,
    updates: serde_json::Value,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/folders/{}",
        state.config.host, state.config.port, folder_id
    );

    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut folder_config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Merge updates into folder config
    if let (Some(config_obj), Some(updates_obj)) =
        (folder_config.as_object_mut(), updates.as_object())
    {
        for (key, value) in updates_obj {
            config_obj.insert(key.clone(), value.clone());
        }
    }

    client
        .put(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&folder_config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

// ============================================================================
// Ignore Patterns (.stignore)
// ============================================================================

/// Get ignore patterns for a folder
#[tauri::command]
pub async fn get_folder_ignores(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/db/ignores?folder={}",
        state.config.host, state.config.port, folder_id
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

/// Set ignore patterns for a folder
#[tauri::command]
pub async fn set_folder_ignores(
    state: State<'_, SyncthingState>,
    folder_id: String,
    ignore_patterns: Vec<String>,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/db/ignores?folder={}",
        state.config.host, state.config.port, folder_id
    );

    let body = serde_json::json!({
        "ignore": ignore_patterns
    });

    client
        .post(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

// ============================================================================
// System Logs
// ============================================================================

/// Get Syncthing logs
#[tauri::command]
pub async fn get_system_logs(
    state: State<'_, SyncthingState>,
    since: Option<String>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let mut url = format!(
        "http://{}:{}/rest/system/log",
        state.config.host, state.config.port
    );

    if let Some(since_time) = since {
        url = format!("{}?since={}", url, since_time);
    }

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

// ============================================================================
// Event API
// ============================================================================

/// Get events from Syncthing (for real-time updates)
#[tauri::command]
pub async fn get_events(
    state: State<'_, SyncthingState>,
    since: Option<u64>,
    limit: Option<u32>,
    timeout: Option<u32>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(
            timeout.unwrap_or(60) as u64 + 5,
        ))
        .build()
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut url = format!(
        "http://{}:{}/rest/events",
        state.config.host, state.config.port
    );

    let mut params = Vec::new();
    if let Some(s) = since {
        params.push(format!("since={}", s));
    }
    if let Some(l) = limit {
        params.push(format!("limit={}", l));
    }
    if let Some(t) = timeout {
        params.push(format!("timeout={}", t));
    }

    if !params.is_empty() {
        url = format!("{}?{}", url, params.join("&"));
    }

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

// ============================================================================
// Advanced Device Settings
// ============================================================================

/// Add device with advanced options
#[tauri::command]
pub async fn add_device_advanced(
    state: State<'_, SyncthingState>,
    device_id: String,
    name: String,
    addresses: Option<Vec<String>>,
    compression: Option<String>,
    introducer: Option<bool>,
    auto_accept_folders: Option<bool>,
    max_send_kbps: Option<u32>,
    max_recv_kbps: Option<u32>,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();

    let config_url = format!(
        "http://{}:{}/rest/config",
        state.config.host, state.config.port
    );

    let res = client
        .get(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Check if device already exists
    if let Some(devices) = config["devices"].as_array() {
        for device in devices {
            if device["deviceID"].as_str() == Some(&device_id) {
                return Err(SyncthingError::ProcessError("Device already exists".into()));
            }
        }
    }

    let new_device = serde_json::json!({
        "deviceID": device_id,
        "name": name,
        "addresses": addresses.unwrap_or_else(|| vec!["dynamic".to_string()]),
        "compression": compression.unwrap_or_else(|| "metadata".to_string()),
        "introducer": introducer.unwrap_or(false),
        "paused": false,
        "autoAcceptFolders": auto_accept_folders.unwrap_or(false),
        "maxSendKbps": max_send_kbps.unwrap_or(0),
        "maxRecvKbps": max_recv_kbps.unwrap_or(0),
    });

    if let Some(devices) = config["devices"].as_array_mut() {
        devices.push(new_device);
    }

    client
        .put(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Update device configuration
#[tauri::command]
pub async fn update_device_config(
    state: State<'_, SyncthingState>,
    device_id: String,
    updates: serde_json::Value,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/devices/{}",
        state.config.host, state.config.port, device_id
    );

    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut device_config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Merge updates
    if let (Some(config_obj), Some(updates_obj)) =
        (device_config.as_object_mut(), updates.as_object())
    {
        for (key, value) in updates_obj {
            config_obj.insert(key.clone(), value.clone());
        }
    }

    client
        .put(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&device_config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Pause a device
#[tauri::command]
pub async fn pause_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/devices/{}",
        state.config.host, state.config.port, device_id
    );

    // Get current config
    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Update paused status
    config["paused"] = serde_json::Value::Bool(true);

    // Put updated config
    client
        .put(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Resume a device
#[tauri::command]
pub async fn resume_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/devices/{}",
        state.config.host, state.config.port, device_id
    );

    // Get current config
    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Update paused status
    config["paused"] = serde_json::Value::Bool(false);

    // Put updated config
    client
        .put(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Unshare a folder from a device
#[tauri::command]
pub async fn unshare_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/folders/{}",
        state.config.host, state.config.port, folder_id
    );

    // Get current folder config
    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut folder_config: serde_json::Value = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    // Remove device from the devices array
    if let Some(devices) = folder_config["devices"].as_array_mut() {
        devices.retain(|d| d["deviceID"].as_str() != Some(&device_id));
    }

    // Update config
    client
        .put(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&folder_config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

// ============================================================================
// System Management
// ============================================================================

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

/// Get detailed folder configuration
#[tauri::command]
pub async fn get_folder_config(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/folders/{}",
        state.config.host, state.config.port, folder_id
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

/// Get detailed device configuration
#[tauri::command]
pub async fn get_device_config(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/config/devices/{}",
        state.config.host, state.config.port, device_id
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

/// Open folder in file explorer
#[tauri::command]
pub async fn open_folder_in_explorer(folder_path: String) -> Result<(), SyncthingError> {
    use std::process::Command;

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| SyncthingError::ProcessError(format!("Failed to open folder: {}", e)))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| SyncthingError::ProcessError(format!("Failed to open folder: {}", e)))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| SyncthingError::ProcessError(format!("Failed to open folder: {}", e)))?;
    }

    Ok(())
}

/// Browse files in a folder (list directory contents)
/// This version returns immediate children only (for file browser UI)
#[tauri::command]
pub async fn browse_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    prefix: Option<String>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let mut url = format!(
        "http://{}:{}/rest/db/browse?folder={}&levels=0",
        state.config.host, state.config.port, folder_id
    );

    if let Some(p) = prefix {
        url = format!("{}&prefix={}", url, p);
    }

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

/// Browse all files in a folder recursively (for indexing)
/// Returns a flat list of all files with their full paths
#[tauri::command]
pub async fn browse_folder_recursive(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<Vec<serde_json::Value>, SyncthingError> {
    let client = reqwest::Client::new();
    // Use a high levels value to get deep recursion
    let url = format!(
        "http://{}:{}/rest/db/browse?folder={}&levels=999",
        state.config.host, state.config.port, folder_id
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

    // Flatten the hierarchical structure into a flat list
    let mut files = Vec::new();
    if let Some(arr) = json.as_array() {
        flatten_browse_response(arr, "", &mut files);
    }

    Ok(files)
}

/// Helper function to flatten the nested browse response
fn flatten_browse_response(
    items: &[serde_json::Value],
    parent_path: &str,
    result: &mut Vec<serde_json::Value>,
) {
    for item in items {
        if let Some(obj) = item.as_object() {
            let name = obj.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let full_path = if parent_path.is_empty() {
                name.to_string()
            } else {
                format!("{}/{}", parent_path, name)
            };

            let item_type = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let is_directory = item_type == "FILE_INFO_TYPE_DIRECTORY";

            // Add the item with its full path
            let flat_item = serde_json::json!({
                "name": full_path,
                "size": obj.get("size").and_then(|s| s.as_i64()).unwrap_or(0),
                "modTime": obj.get("modTime").cloned().unwrap_or(serde_json::Value::Null),
                "type": if is_directory { "directory" } else { "file" }
            });

            result.push(flat_item);

            // Recursively process children
            if let Some(children) = obj.get("children").and_then(|c| c.as_array()) {
                flatten_browse_response(children, &full_path, result);
            }
        }
    }
}

// ============================================================================
// File Conflict Resolution
// ============================================================================

/// Get list of conflict files for a folder by scanning the filesystem
#[tauri::command]
pub async fn scan_for_conflicts(
    folder_path: String,
) -> Result<Vec<serde_json::Value>, SyncthingError> {
    let mut conflicts = Vec::new();

    fn scan_dir(
        dir: &std::path::Path,
        conflicts: &mut Vec<serde_json::Value>,
        base: &std::path::Path,
    ) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Skip hidden directories and .stversions
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if !name.starts_with('.') && name != ".stversions" {
                            scan_dir(&path, conflicts, base);
                        }
                    }
                } else if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.contains(".sync-conflict-") {
                        let relative_path = path.strip_prefix(base).unwrap_or(&path);
                        if let Ok(metadata) = std::fs::metadata(&path) {
                            // Extract original filename from conflict pattern
                            // Pattern: filename.sync-conflict-YYYYMMDD-HHMMSS-DEVICEID.ext
                            let original = extract_original_filename(name);
                            conflicts.push(serde_json::json!({
                                "name": relative_path.to_string_lossy(),
                                "original": original,
                                "size": metadata.len(),
                                "modTime": metadata.modified().ok().map(|t| {
                                    let duration = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
                                    duration.as_secs()
                                }),
                            }));
                        }
                    }
                }
            }
        }
    }

    fn extract_original_filename(conflict_name: &str) -> String {
        // Pattern: file.sync-conflict-20231201-120000-ABCDEFG.txt
        // Should become: file.txt
        if let Some(pos) = conflict_name.find(".sync-conflict-") {
            let before = &conflict_name[..pos];
            // Find the extension after the conflict marker
            let after = &conflict_name[pos..];
            if let Some(ext_pos) = after.rfind('.') {
                let ext = &after[ext_pos..];
                return format!("{}{}", before, ext);
            }
            return before.to_string();
        }
        conflict_name.to_string()
    }

    let base = std::path::Path::new(&folder_path);
    if base.exists() {
        scan_dir(base, &mut conflicts, base);
    }

    Ok(conflicts)
}

/// Delete a conflict file (resolve by keeping the original)
#[tauri::command]
pub async fn delete_conflict_file(
    folder_path: String,
    conflict_file: String,
) -> Result<(), SyncthingError> {
    let full_path = std::path::Path::new(&folder_path).join(&conflict_file);

    if full_path.exists() {
        std::fs::remove_file(&full_path).map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to delete conflict file: {}", e))
        })?;
    }

    Ok(())
}

/// Resolve conflict by replacing original with conflict file
#[tauri::command]
pub async fn resolve_conflict_keep_conflict(
    folder_path: String,
    original_file: String,
    conflict_file: String,
) -> Result<(), SyncthingError> {
    let base_path = std::path::Path::new(&folder_path);
    let original_path = base_path.join(&original_file);
    let conflict_path = base_path.join(&conflict_file);

    // Delete original if it exists
    if original_path.exists() {
        std::fs::remove_file(&original_path).map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to delete original: {}", e))
        })?;
    }

    // Rename conflict to original
    if conflict_path.exists() {
        std::fs::rename(&conflict_path, &original_path).map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to rename conflict file: {}", e))
        })?;
    }

    Ok(())
}

// ============================================================================
// File Versioning
// ============================================================================

/// Browse the .stversions folder for old file versions
#[tauri::command]
pub async fn browse_versions(
    folder_path: String,
    prefix: Option<String>,
) -> Result<Vec<serde_json::Value>, SyncthingError> {
    use std::fs;
    use std::path::Path;

    let versions_path = Path::new(&folder_path).join(".stversions");
    let browse_path = if let Some(ref p) = prefix {
        versions_path.join(p)
    } else {
        versions_path.clone()
    };

    if !browse_path.exists() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();

    if let Ok(dir_entries) = fs::read_dir(&browse_path) {
        for entry in dir_entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            if let Ok(metadata) = entry.metadata() {
                let is_dir = metadata.is_dir();

                // Parse version timestamp from filename if it's a file
                // Pattern: filename~YYYYMMDD-HHMMSS.ext
                let (original_name, version_time) = if !is_dir {
                    parse_version_filename(&name)
                } else {
                    (name.clone(), None)
                };

                entries.push(serde_json::json!({
                    "name": name,
                    "originalName": original_name,
                    "type": if is_dir { "directory" } else { "file" },
                    "size": if is_dir { None::<u64> } else { Some(metadata.len()) },
                    "modTime": metadata.modified().ok().map(|t| {
                        t.duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_secs())
                            .unwrap_or(0)
                    }),
                    "versionTime": version_time,
                }));
            }
        }
    }

    // Sort: directories first, then by modification time (newest first)
    entries.sort_by(|a, b| {
        let a_is_dir = a["type"].as_str() == Some("directory");
        let b_is_dir = b["type"].as_str() == Some("directory");

        if a_is_dir != b_is_dir {
            return if a_is_dir {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            };
        }

        let a_time = a["modTime"].as_u64().unwrap_or(0);
        let b_time = b["modTime"].as_u64().unwrap_or(0);
        b_time.cmp(&a_time)
    });

    Ok(entries)
}

/// Parse versioned filename to extract original name and version timestamp
fn parse_version_filename(name: &str) -> (String, Option<String>) {
    // Pattern: filename~YYYYMMDD-HHMMSS.ext or filename~YYYYMMDD-HHMMSS
    // Example: document~20231215-143022.pdf -> (document.pdf, 2023-12-15 14:30:22)

    if let Some(tilde_pos) = name.rfind('~') {
        let before_tilde = &name[..tilde_pos];
        let after_tilde = &name[tilde_pos + 1..];

        // Check if after_tilde matches version pattern
        let version_part: String;
        let extension: &str;

        if let Some(dot_pos) = after_tilde.find('.') {
            version_part = after_tilde[..dot_pos].to_string();
            extension = &after_tilde[dot_pos..];
        } else {
            version_part = after_tilde.to_string();
            extension = "";
        }

        // Validate version format: YYYYMMDD-HHMMSS (15 chars)
        if version_part.len() == 15 && version_part.chars().nth(8) == Some('-') {
            let original = format!("{}{}", before_tilde, extension);

            // Format the timestamp nicely
            let formatted = format!(
                "{}-{}-{} {}:{}:{}",
                &version_part[0..4],   // Year
                &version_part[4..6],   // Month
                &version_part[6..8],   // Day
                &version_part[9..11],  // Hour
                &version_part[11..13], // Minute
                &version_part[13..15]  // Second
            );

            return (original, Some(formatted));
        }
    }

    (name.to_string(), None)
}

/// Restore a versioned file to its original location
#[tauri::command]
pub async fn restore_version(
    folder_path: String,
    version_path: String,
    original_name: String,
    overwrite: bool,
) -> Result<(), SyncthingError> {
    use std::fs;
    use std::path::Path;

    let source = Path::new(&folder_path)
        .join(".stversions")
        .join(&version_path);
    let dest = Path::new(&folder_path).join(&original_name);

    if !source.exists() {
        return Err(SyncthingError::ProcessError(
            "Version file not found".to_string(),
        ));
    }

    if dest.exists() && !overwrite {
        return Err(SyncthingError::ProcessError(
            "Destination file exists. Set overwrite=true to replace.".to_string(),
        ));
    }

    // Create parent directories if needed
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to create directories: {}", e))
        })?;
    }

    // Copy the version file to the original location
    fs::copy(&source, &dest)
        .map_err(|e| SyncthingError::ProcessError(format!("Failed to restore file: {}", e)))?;

    Ok(())
}

// ============================================================================
// Tray Status Update
// ============================================================================

/// Update the system tray tooltip with current status
#[tauri::command]
pub async fn update_tray_status(
    app: tauri::AppHandle,
    _status: String,
    tooltip: String,
) -> Result<(), SyncthingError> {
    // Update the tray tooltip
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(&tooltip));
    }

    // Note: Tauri v2 menu items are immutable after creation,
    // so we update via the tooltip instead

    Ok(())
}
