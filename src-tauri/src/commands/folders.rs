//! Folder management commands.

use crate::{SyncthingError, SyncthingState};
use tauri::State;

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

    config["paused"] = serde_json::Value::Bool(true);

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

    config["paused"] = serde_json::Value::Bool(false);

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

/// Add a new folder to Syncthing
#[tauri::command]
pub async fn add_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    folder_label: String,
    folder_path: String,
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

    if let Some(folders) = config["folders"].as_array() {
        for folder in folders {
            if folder["id"].as_str() == Some(&folder_id) {
                return Err(SyncthingError::ProcessError("Folder already exists".into()));
            }
        }
    }

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

/// Add a folder with advanced configuration options
#[tauri::command]
#[allow(clippy::too_many_arguments)]
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

    if let Some(folders) = config["folders"].as_array() {
        for folder in folders {
            if folder["id"].as_str() == Some(&folder_id) {
                return Err(SyncthingError::ProcessError("Folder already exists".into()));
            }
        }
    }

    let versioning = match versioning_type.as_deref() {
        Some("simple") => serde_json::json!({
            "type": "simple",
            "params": versioning_params.clone().unwrap_or_else(|| serde_json::json!({
                "keep": "5"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("staggered") => serde_json::json!({
            "type": "staggered",
            "params": versioning_params.clone().unwrap_or_else(|| serde_json::json!({
                "cleanInterval": "3600",
                "maxAge": "31536000"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("trashcan") => serde_json::json!({
            "type": "trashcan",
            "params": versioning_params.clone().unwrap_or_else(|| serde_json::json!({
                "cleanoutDays": "0"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("external") => serde_json::json!({
            "type": "external",
            "params": versioning_params.unwrap_or_else(|| serde_json::json!({
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

    if let Some(devices) = folder_config["devices"].as_array_mut() {
        devices.retain(|d| d["deviceID"].as_str() != Some(&device_id));
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
