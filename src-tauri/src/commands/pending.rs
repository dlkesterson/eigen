//! Pending device and folder request handling commands.
//!
//! These commands handle incoming connection requests from other devices
//! and folder share requests that haven't been accepted yet.

use crate::{SyncthingClient, SyncthingError, SyncthingState};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

// =============================================================================
// Folder Type and Versioning Types
// =============================================================================

/// Folder sync type - controls sync direction
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum FolderType {
    /// Full two-way sync (default)
    #[default]
    #[serde(rename = "sendreceive")]
    SendReceive,
    /// Only send local changes, ignore remote changes
    #[serde(rename = "sendonly")]
    SendOnly,
    /// Only receive remote changes, local changes are overrides
    #[serde(rename = "receiveonly")]
    ReceiveOnly,
}

impl FolderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FolderType::SendReceive => "sendreceive",
            FolderType::SendOnly => "sendonly",
            FolderType::ReceiveOnly => "receiveonly",
        }
    }
}

/// File versioning type
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum VersioningType {
    /// No versioning - old files are deleted
    #[default]
    None,
    /// Moves deleted/replaced files to .stversions folder
    #[serde(rename = "trashcan")]
    TrashCan,
    /// Keeps N previous versions in .stversions
    Simple,
    /// Time-based retention (keeps more recent versions, fewer old ones)
    Staggered,
    /// Calls an external script to handle versioning
    External,
}

impl VersioningType {
    pub fn as_str(&self) -> &'static str {
        match self {
            VersioningType::None => "",
            VersioningType::TrashCan => "trashcan",
            VersioningType::Simple => "simple",
            VersioningType::Staggered => "staggered",
            VersioningType::External => "external",
        }
    }
}

/// Versioning configuration for a folder
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VersioningConfig {
    /// The type of versioning to use
    #[serde(rename = "type")]
    pub versioning_type: VersioningType,
    /// Type-specific parameters
    #[serde(default)]
    pub params: HashMap<String, String>,
}

impl VersioningConfig {
    /// Convert to Syncthing API format
    pub fn to_syncthing_json(&self) -> serde_json::Value {
        let type_str = self.versioning_type.as_str();
        if type_str.is_empty() {
            // No versioning
            return serde_json::json!({
                "type": "",
                "params": {},
                "cleanupIntervalS": 3600,
                "fsPath": "",
                "fsType": "basic"
            });
        }

        // Apply default params based on versioning type
        let mut params = self.params.clone();
        match self.versioning_type {
            VersioningType::TrashCan => {
                params
                    .entry("cleanoutDays".to_string())
                    .or_insert("0".to_string());
            },
            VersioningType::Simple => {
                params.entry("keep".to_string()).or_insert("5".to_string());
            },
            VersioningType::Staggered => {
                params
                    .entry("cleanInterval".to_string())
                    .or_insert("3600".to_string());
                params
                    .entry("maxAge".to_string())
                    .or_insert("31536000".to_string()); // 1 year
            },
            VersioningType::External => {
                params
                    .entry("command".to_string())
                    .or_insert_with(String::new);
            },
            VersioningType::None => {},
        }

        serde_json::json!({
            "type": type_str,
            "params": params,
            "cleanupIntervalS": 3600,
            "fsPath": "",
            "fsType": "basic"
        })
    }
}

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
    let client = SyncthingClient::new(&state.config);

    // The API returns a map of deviceID -> device info
    let json: HashMap<String, serde_json::Value> =
        client.get("/rest/cluster/pending/devices").await?;

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
    let client = SyncthingClient::new(&state.config);

    // The API returns: { folderID: { offeredBy: { deviceID: { time, label, ... } } } }
    let json: HashMap<String, serde_json::Value> =
        client.get("/rest/cluster/pending/folders").await?;

    let mut folders: Vec<PendingFolder> = Vec::new();

    for (folder_id, folder_info) in json {
        // Get the offeredBy map which contains device_id -> offer info
        if let Some(offered_by) = folder_info.get("offeredBy").and_then(|v| v.as_object()) {
            for (device_id, offer_info) in offered_by {
                folders.push(PendingFolder {
                    folder_id: folder_id.clone(),
                    folder_label: offer_info
                        .get("label")
                        .and_then(|v| v.as_str())
                        .map(String::from),
                    offered_by: device_id.clone(),
                    offered_by_name: None, // We'll need to look this up from config if needed
                    time: offer_info
                        .get("time")
                        .and_then(|v| v.as_str())
                        .map(String::from),
                    receive_encrypted: offer_info
                        .get("receiveEncrypted")
                        .and_then(serde_json::Value::as_bool)
                        .unwrap_or(false),
                    remote_encrypted: offer_info
                        .get("remoteEncrypted")
                        .and_then(serde_json::Value::as_bool)
                        .unwrap_or(false),
                });
            }
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
    let client = SyncthingClient::new(&state.config);

    // Fetch current config
    let mut config: serde_json::Value = client.get("/rest/config").await?;

    // Check if device already exists using pattern matching
    let device_exists = config["devices"].as_array().is_some_and(|devices| {
        devices
            .iter()
            .any(|d| d["deviceID"].as_str() == Some(&device_id))
    });

    if device_exists {
        // Device already exists, just remove from pending
        return dismiss_pending_device(state, device_id).await;
    }

    // Add the device with explicit field initialization
    let device_name = name.unwrap_or_else(|| {
        // Safely truncate device ID for display name
        let display_id = device_id.get(..7).unwrap_or(&device_id);
        format!("Device {}", display_id)
    });

    let new_device = serde_json::json!({
        "deviceID": device_id.clone(),
        "name": device_name,
        "addresses": ["dynamic"],
        "compression": "metadata",
        "introducer": false,
        "paused": false,
        "autoAcceptFolders": false,
    });

    match config["devices"].as_array_mut() {
        Some(devices) => devices.push(new_device),
        None => {
            return Err(
                SyncthingError::parse("Config devices field is not an array")
                    .with_context(format!("device_id: {}", device_id)),
            );
        },
    }

    client.put("/rest/config", &config).await?;

    Ok(())
}

/// Dismiss/reject a pending device request
/// This removes the device from the pending list without adding it
#[tauri::command]
pub async fn dismiss_pending_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let endpoint = format!("/rest/cluster/pending/devices?device={}", device_id);

    client.delete(&endpoint).await?;

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
    folder_type: Option<FolderType>,
    versioning: Option<VersioningConfig>,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);

    // Fetch current config
    let mut config: serde_json::Value = client.get("/rest/config").await?;

    // Check if folder already exists using pattern matching
    let folder_exists = config["folders"]
        .as_array()
        .is_some_and(|folders| folders.iter().any(|f| f["id"].as_str() == Some(&folder_id)));

    if folder_exists {
        // Folder exists, add the device to it
        add_device_to_existing_folder(&mut config, &folder_id, &device_id)?;
    } else {
        // Create new folder with this device
        create_new_folder_with_device(
            &mut config,
            &folder_id,
            &device_id,
            &folder_path,
            folder_label,
            folder_type,
            versioning,
        )?;
    }

    client.put("/rest/config", &config).await?;

    // Remove from pending
    dismiss_pending_folder(state, folder_id, device_id).await?;

    Ok(())
}

/// Helper to add a device to an existing folder in the config
fn add_device_to_existing_folder(
    config: &mut serde_json::Value,
    folder_id: &str,
    device_id: &str,
) -> Result<(), SyncthingError> {
    let folders = config["folders"]
        .as_array_mut()
        .ok_or_else(|| SyncthingError::parse("Config folders field is not an array"))?;

    for folder in folders.iter_mut() {
        if folder["id"].as_str() == Some(folder_id) {
            let devices = folder["devices"]
                .as_array_mut()
                .ok_or_else(|| SyncthingError::parse("Folder devices field is not an array"))?;

            // Check if device is already in folder
            let device_in_folder = devices
                .iter()
                .any(|d| d["deviceID"].as_str() == Some(device_id));

            if !device_in_folder {
                devices.push(serde_json::json!({
                    "deviceID": device_id,
                    "introducedBy": ""
                }));
            }
            return Ok(());
        }
    }

    Err(SyncthingError::not_found("Folder not found in config")
        .with_context(format!("folder_id: {}", folder_id)))
}

/// Helper to create a new folder with a device
fn create_new_folder_with_device(
    config: &mut serde_json::Value,
    folder_id: &str,
    device_id: &str,
    folder_path: &str,
    folder_label: Option<String>,
    folder_type: Option<FolderType>,
    versioning: Option<VersioningConfig>,
) -> Result<(), SyncthingError> {
    let label = folder_label.unwrap_or_else(|| folder_id.to_string());
    let sync_type = folder_type.unwrap_or_default();
    let versioning_config = versioning.unwrap_or_default();

    let new_folder = serde_json::json!({
        "id": folder_id,
        "label": label,
        "path": folder_path,
        "type": sync_type.as_str(),
        "devices": [
            {
                "deviceID": device_id,
                "introducedBy": ""
            }
        ],
        "rescanIntervalS": 3600,
        "fsWatcherEnabled": true,
        "fsWatcherDelayS": 10,
        "ignorePerms": false,
        "autoNormalize": true,
        "versioning": versioning_config.to_syncthing_json(),
    });

    match config["folders"].as_array_mut() {
        Some(folders) => {
            folders.push(new_folder);
            Ok(())
        },
        None => Err(SyncthingError::parse(
            "Config folders field is not an array",
        )),
    }
}

/// Dismiss/reject a pending folder share request
#[tauri::command]
pub async fn dismiss_pending_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let endpoint = format!(
        "/rest/cluster/pending/folders?folder={}&device={}",
        folder_id, device_id
    );

    client.delete(&endpoint).await?;

    Ok(())
}
