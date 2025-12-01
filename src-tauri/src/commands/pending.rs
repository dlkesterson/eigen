//! Pending device and folder request handling commands.
//!
//! These commands handle incoming connection requests from other devices
//! and folder share requests that haven't been accepted yet.

use crate::{SyncthingError, SyncthingState};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

/// Information about a pending device connection request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingDevice {
    /// The device ID requesting connection
    pub device_id: String,
    /// Device name (if known)
    pub name: Option<String>,
    /// Address the device connected from
    pub address: Option<String>,
    /// When the request was received
    pub time: Option<String>,
}

/// Information about a pending folder share request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingFolder {
    /// The folder ID being shared
    pub folder_id: String,
    /// Folder label (if provided)
    pub folder_label: Option<String>,
    /// Device ID that wants to share this folder
    pub offered_by: String,
    /// Device name (if known)
    pub offered_by_name: Option<String>,
    /// When the request was received
    pub time: Option<String>,
    /// Whether encryption is required
    pub receive_encrypted: bool,
    /// Remote encryption password if set
    pub remote_encrypted: bool,
}

/// Response containing all pending requests
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingRequests {
    pub devices: Vec<PendingDevice>,
    pub folders: Vec<PendingFolder>,
}

/// Get all pending device connection requests
#[tauri::command]
pub async fn get_pending_devices(
    state: State<'_, SyncthingState>,
) -> Result<Vec<PendingDevice>, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/cluster/pending/devices",
        state.config.host, state.config.port
    );

    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    // The API returns a map of deviceID -> device info
    let json: HashMap<String, serde_json::Value> = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    let devices: Vec<PendingDevice> = json
        .into_iter()
        .map(|(device_id, info)| PendingDevice {
            device_id,
            name: info.get("name").and_then(|v| v.as_str()).map(String::from),
            address: info
                .get("address")
                .and_then(|v| v.as_str())
                .map(String::from),
            time: info.get("time").and_then(|v| v.as_str()).map(String::from),
        })
        .collect();

    Ok(devices)
}

/// Get all pending folder share requests
#[tauri::command]
pub async fn get_pending_folders(
    state: State<'_, SyncthingState>,
) -> Result<Vec<PendingFolder>, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/cluster/pending/folders",
        state.config.host, state.config.port
    );

    let res = client
        .get(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    // The API returns a nested map: folderID -> deviceID -> folder info
    let json: HashMap<String, HashMap<String, serde_json::Value>> = res
        .json()
        .await
        .map_err(|e| SyncthingError::ParseError(e.to_string()))?;

    let mut folders: Vec<PendingFolder> = Vec::new();

    for (folder_id, devices) in json {
        for (device_id, info) in devices {
            folders.push(PendingFolder {
                folder_id: folder_id.clone(),
                folder_label: info
                    .get("offeredBy")
                    .and_then(|ob| ob.get(&device_id))
                    .and_then(|d| d.get("label"))
                    .and_then(|v| v.as_str())
                    .map(String::from)
                    .or_else(|| info.get("label").and_then(|v| v.as_str()).map(String::from)),
                offered_by: device_id,
                offered_by_name: None, // We'll need to look this up from config if needed
                time: info.get("time").and_then(|v| v.as_str()).map(String::from),
                receive_encrypted: info
                    .get("receiveEncrypted")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false),
                remote_encrypted: info
                    .get("remoteEncrypted")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false),
            });
        }
    }

    Ok(folders)
}

/// Get all pending requests (devices and folders) in one call
#[tauri::command]
pub async fn get_pending_requests(
    state: State<'_, SyncthingState>,
) -> Result<PendingRequests, SyncthingError> {
    let devices = get_pending_devices(state.clone()).await?;
    let folders = get_pending_folders(state).await?;

    Ok(PendingRequests { devices, folders })
}

/// Accept a pending device connection request
/// This adds the device to our config
#[tauri::command]
pub async fn accept_pending_device(
    state: State<'_, SyncthingState>,
    device_id: String,
    name: Option<String>,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();

    // First, add the device to config
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
                // Device already exists, just remove from pending
                return dismiss_pending_device(state, device_id).await;
            }
        }
    }

    // Add the device
    let device_name = name.unwrap_or_else(|| format!("Device {}", &device_id[..7]));
    let new_device = serde_json::json!({
        "deviceID": device_id.clone(),
        "name": device_name,
        "addresses": ["dynamic"],
        "compression": "metadata",
        "introducer": false,
        "paused": false,
        "autoAcceptFolders": false,
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

/// Dismiss/reject a pending device request
/// This removes the device from the pending list without adding it
#[tauri::command]
pub async fn dismiss_pending_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/cluster/pending/devices?device={}",
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

/// Accept a pending folder share request
/// This adds the folder to our config with the specified path
#[tauri::command]
pub async fn accept_pending_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    device_id: String,
    folder_path: String,
    folder_label: Option<String>,
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
    let folder_exists = config["folders"]
        .as_array()
        .map(|folders| folders.iter().any(|f| f["id"].as_str() == Some(&folder_id)))
        .unwrap_or(false);

    if folder_exists {
        // Folder exists, just add the device to it
        if let Some(folders) = config["folders"].as_array_mut() {
            for folder in folders.iter_mut() {
                if folder["id"].as_str() == Some(&folder_id) {
                    if let Some(devices) = folder["devices"].as_array_mut() {
                        // Check if device is already in folder
                        let device_in_folder =
                            devices.iter().any(|d| d["deviceID"].as_str() == Some(&device_id));
                        if !device_in_folder {
                            devices.push(serde_json::json!({
                                "deviceID": device_id.clone(),
                                "introducedBy": ""
                            }));
                        }
                    }
                    break;
                }
            }
        }
    } else {
        // Create new folder with this device
        let label = folder_label.unwrap_or_else(|| folder_id.clone());
        let new_folder = serde_json::json!({
            "id": folder_id.clone(),
            "label": label,
            "path": folder_path,
            "type": "sendreceive",
            "devices": [
                {
                    "deviceID": device_id.clone(),
                    "introducedBy": ""
                }
            ],
            "rescanIntervalS": 3600,
            "fsWatcherEnabled": true,
            "fsWatcherDelayS": 10,
            "ignorePerms": false,
            "autoNormalize": true,
        });

        if let Some(folders) = config["folders"].as_array_mut() {
            folders.push(new_folder);
        }
    }

    client
        .put(&config_url)
        .header("X-API-Key", &state.config.api_key)
        .json(&config)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    // Remove from pending
    dismiss_pending_folder(state, folder_id, device_id).await?;

    Ok(())
}

/// Dismiss/reject a pending folder share request
#[tauri::command]
pub async fn dismiss_pending_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/cluster/pending/folders?folder={}&device={}",
        state.config.host, state.config.port, folder_id, device_id
    );

    client
        .delete(&url)
        .header("X-API-Key", &state.config.api_key)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}
