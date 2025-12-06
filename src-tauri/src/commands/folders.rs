//! Folder management commands.

use crate::{SyncthingClient, SyncthingError, SyncthingState};
use tauri::State;

// =============================================================================
// Folder Status Commands
// =============================================================================

/// Get folder status
#[tauri::command]
pub async fn get_folder_status(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client
        .get(&format!("/rest/db/status?folder={}", folder_id))
        .await
}

/// Pause a folder
#[tauri::command]
pub async fn pause_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    set_folder_paused(&state, &folder_id, true).await
}

/// Resume a folder
#[tauri::command]
pub async fn resume_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    set_folder_paused(&state, &folder_id, false).await
}

/// Helper to set folder paused state
async fn set_folder_paused(
    state: &State<'_, SyncthingState>,
    folder_id: &str,
    paused: bool,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let path = format!("/rest/config/folders/{}", folder_id);

    let mut config: serde_json::Value = client.get(&path).await?;
    config["paused"] = serde_json::Value::Bool(paused);

    client.put(&path, &config).await
}

/// Force rescan of a folder
#[tauri::command]
pub async fn rescan_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client
        .post_no_response(&format!("/rest/db/scan?folder={}", folder_id), None)
        .await
}

// =============================================================================
// Folder CRUD Commands
// =============================================================================

/// Add a new folder to Syncthing
#[tauri::command]
pub async fn add_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    folder_label: String,
    folder_path: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let mut config: serde_json::Value = client.get("/rest/config").await?;

    // Check if folder already exists
    check_folder_not_exists(&config, &folder_id)?;

    let new_folder = create_default_folder_config(&folder_id, &folder_label, &folder_path);

    add_folder_to_config(&mut config, new_folder)?;

    client.put("/rest/config", &config).await
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
    let client = SyncthingClient::new(&state.config);
    let mut config: serde_json::Value = client.get("/rest/config").await?;

    // Check if folder already exists
    check_folder_not_exists(&config, &folder_id)?;

    let versioning = create_versioning_config(versioning_type.as_deref(), versioning_params);

    let new_folder = create_advanced_folder_config(
        &folder_id,
        &folder_label,
        &folder_path,
        versioning,
        rescan_interval_s,
        fs_watcher_enabled,
        fs_watcher_delay_s,
        ignore_perms,
    );

    add_folder_to_config(&mut config, new_folder)?;

    client.put("/rest/config", &config).await
}

/// Remove a folder from Syncthing
#[tauri::command]
pub async fn remove_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client
        .delete(&format!("/rest/config/folders/{}", folder_id))
        .await
}

/// Update folder configuration
#[tauri::command]
pub async fn update_folder_config(
    state: State<'_, SyncthingState>,
    folder_id: String,
    updates: serde_json::Value,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let path = format!("/rest/config/folders/{}", folder_id);

    let mut folder_config: serde_json::Value = client.get(&path).await?;

    // Validate and merge updates
    merge_config_updates(&mut folder_config, &updates)?;

    client.put(&path, &folder_config).await
}

/// Get detailed folder configuration
#[tauri::command]
pub async fn get_folder_config(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client
        .get(&format!("/rest/config/folders/{}", folder_id))
        .await
}

// =============================================================================
// Folder Sharing Commands
// =============================================================================

/// Share a folder with a specific device
#[tauri::command]
pub async fn share_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let path = format!("/rest/config/folders/{}", folder_id);

    let mut folder_config: serde_json::Value = client.get(&path).await?;

    // Check if device is already added
    let device_exists = folder_config["devices"]
        .as_array()
        .map(|devices| {
            devices
                .iter()
                .any(|d| d["deviceID"].as_str() == Some(&device_id))
        })
        .unwrap_or(false);

    // Add device if not exists
    if !device_exists {
        let new_device_entry = serde_json::json!({
            "deviceID": device_id,
            "introducedBy": ""
        });

        match folder_config["devices"].as_array_mut() {
            Some(devices) => devices.push(new_device_entry),
            None => {
                return Err(SyncthingError::parse(
                    "Folder config devices is not an array",
                ));
            },
        }

        client.put(&path, &folder_config).await?;
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
    let client = SyncthingClient::new(&state.config);
    let path = format!("/rest/config/folders/{}", folder_id);

    let mut folder_config: serde_json::Value = client.get(&path).await?;

    if let Some(devices) = folder_config["devices"].as_array_mut() {
        devices.retain(|d| d["deviceID"].as_str() != Some(&device_id));
    }

    client.put(&path, &folder_config).await
}

// =============================================================================
// Helper Functions
// =============================================================================

/// Check that a folder doesn't already exist in the config
fn check_folder_not_exists(
    config: &serde_json::Value,
    folder_id: &str,
) -> Result<(), SyncthingError> {
    if let Some(folders) = config["folders"].as_array() {
        let exists = folders.iter().any(|f| f["id"].as_str() == Some(folder_id));
        if exists {
            return Err(
                SyncthingError::already_exists("Folder").with_context(folder_id.to_string())
            );
        }
    }
    Ok(())
}

/// Add a folder to the config's folders array
fn add_folder_to_config(
    config: &mut serde_json::Value,
    folder: serde_json::Value,
) -> Result<(), SyncthingError> {
    match config["folders"].as_array_mut() {
        Some(folders) => {
            folders.push(folder);
            Ok(())
        },
        None => Err(SyncthingError::parse("Config folders is not an array")),
    }
}

/// Merge updates into a config object
fn merge_config_updates(
    config: &mut serde_json::Value,
    updates: &serde_json::Value,
) -> Result<(), SyncthingError> {
    match (config.as_object_mut(), updates.as_object()) {
        (Some(config_obj), Some(updates_obj)) => {
            for (key, value) in updates_obj {
                config_obj.insert(key.clone(), value.clone());
            }
            Ok(())
        },
        (None, _) => Err(SyncthingError::parse("Config is not an object")),
        (_, None) => Err(SyncthingError::validation("Updates must be an object")),
    }
}

/// Create versioning configuration based on type
fn create_versioning_config(
    versioning_type: Option<&str>,
    versioning_params: Option<serde_json::Value>,
) -> serde_json::Value {
    match versioning_type {
        Some("simple") => serde_json::json!({
            "type": "simple",
            "params": versioning_params.unwrap_or_else(|| serde_json::json!({
                "keep": "5"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("staggered") => serde_json::json!({
            "type": "staggered",
            "params": versioning_params.unwrap_or_else(|| serde_json::json!({
                "cleanInterval": "3600",
                "maxAge": "31536000"
            })),
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        }),
        Some("trashcan") => serde_json::json!({
            "type": "trashcan",
            "params": versioning_params.unwrap_or_else(|| serde_json::json!({
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
    }
}

/// Create default folder configuration
fn create_default_folder_config(
    folder_id: &str,
    folder_label: &str,
    folder_path: &str,
) -> serde_json::Value {
    create_advanced_folder_config(
        folder_id,
        folder_label,
        folder_path,
        create_versioning_config(None, None),
        None,
        None,
        None,
        None,
    )
}

/// Create folder configuration with all options
#[allow(clippy::too_many_arguments)]
fn create_advanced_folder_config(
    folder_id: &str,
    folder_label: &str,
    folder_path: &str,
    versioning: serde_json::Value,
    rescan_interval_s: Option<u32>,
    fs_watcher_enabled: Option<bool>,
    fs_watcher_delay_s: Option<u32>,
    ignore_perms: Option<bool>,
) -> serde_json::Value {
    serde_json::json!({
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
        "minDiskFree": {
            "value": 1,
            "unit": "%"
        },
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
    })
}
