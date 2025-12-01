//! Device management commands.

use crate::{SyncthingError, SyncthingState};
use tauri::State;

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
        .map(std::string::ToString::to_string)
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
