//! Configuration commands.

use crate::{SyncthingError, SyncthingState};
use tauri::State;

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

/// Update global Syncthing options
#[tauri::command]
pub async fn update_options(
    state: State<'_, SyncthingState>,
    options: serde_json::Value,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();

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
