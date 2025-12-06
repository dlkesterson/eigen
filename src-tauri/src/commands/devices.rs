//! Device management commands.

use crate::{SyncthingClient, SyncthingError, SyncthingState};
use tauri::State;

/// Get this device's ID
#[tauri::command]
pub async fn get_device_id(state: State<'_, SyncthingState>) -> Result<String, SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let json: serde_json::Value = client.get("/rest/system/status").await?;

    json["myID"]
        .as_str()
        .map(std::string::ToString::to_string)
        .ok_or_else(|| SyncthingError::parse("No device ID found in response"))
}

/// Add a new device to Syncthing
#[tauri::command]
pub async fn add_device(
    state: State<'_, SyncthingState>,
    device_id: String,
    name: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);

    let mut config: serde_json::Value = client.get("/rest/config").await?;

    // Check if device already exists using pattern matching
    if let Some(devices) = config["devices"].as_array() {
        let exists = devices
            .iter()
            .any(|d| d["deviceID"].as_str() == Some(&device_id));
        if exists {
            return Err(SyncthingError::already_exists("Device").with_context(device_id));
        }
    }

    let new_device = serde_json::json!({
        "deviceID": device_id,
        "name": name,
        "addresses": ["dynamic"],
        "compression": "metadata",
        "introducer": false,
        "paused": false,
        "autoAcceptFolders": false,
    });

    // Use pattern matching to handle the array mutation
    match config["devices"].as_array_mut() {
        Some(devices) => devices.push(new_device),
        None => {
            return Err(SyncthingError::parse("Config devices is not an array"));
        },
    }

    client.put("/rest/config", &config).await
}

/// Add device with advanced options
#[tauri::command]
#[allow(clippy::too_many_arguments)]
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
    let client = SyncthingClient::new(&state.config);

    let mut config: serde_json::Value = client.get("/rest/config").await?;

    // Check for existing device
    if let Some(devices) = config["devices"].as_array() {
        let exists = devices
            .iter()
            .any(|d| d["deviceID"].as_str() == Some(&device_id));
        if exists {
            return Err(SyncthingError::already_exists("Device").with_context(device_id));
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

    match config["devices"].as_array_mut() {
        Some(devices) => devices.push(new_device),
        None => {
            return Err(SyncthingError::parse("Config devices is not an array"));
        },
    }

    client.put("/rest/config", &config).await
}

/// Remove a device from Syncthing
#[tauri::command]
pub async fn remove_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client
        .delete(&format!("/rest/config/devices/{}", device_id))
        .await
}

/// Update device configuration
#[tauri::command]
pub async fn update_device_config(
    state: State<'_, SyncthingState>,
    device_id: String,
    updates: serde_json::Value,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let path = format!("/rest/config/devices/{}", device_id);

    let mut device_config: serde_json::Value = client.get(&path).await?;

    // Validate and merge updates
    match (device_config.as_object_mut(), updates.as_object()) {
        (Some(config_obj), Some(updates_obj)) => {
            for (key, value) in updates_obj {
                config_obj.insert(key.clone(), value.clone());
            }
        },
        (None, _) => {
            return Err(SyncthingError::parse("Device config is not an object"));
        },
        (_, None) => {
            return Err(SyncthingError::validation("Updates must be an object"));
        },
    }

    client.put(&path, &device_config).await
}

/// Get detailed device configuration
#[tauri::command]
pub async fn get_device_config(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client
        .get(&format!("/rest/config/devices/{}", device_id))
        .await
}

/// Pause a device
#[tauri::command]
pub async fn pause_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    set_device_paused(&state, &device_id, true).await
}

/// Resume a device
#[tauri::command]
pub async fn resume_device(
    state: State<'_, SyncthingState>,
    device_id: String,
) -> Result<(), SyncthingError> {
    set_device_paused(&state, &device_id, false).await
}

/// Helper to set device paused state
async fn set_device_paused(
    state: &State<'_, SyncthingState>,
    device_id: &str,
    paused: bool,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    let path = format!("/rest/config/devices/{}", device_id);

    let mut config: serde_json::Value = client.get(&path).await?;
    config["paused"] = serde_json::Value::Bool(paused);

    client.put(&path, &config).await
}
