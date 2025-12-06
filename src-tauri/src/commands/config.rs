//! Configuration commands.

use crate::{SyncthingClient, SyncthingError, SyncthingState};
use tauri::State;

/// Get Syncthing configuration
#[tauri::command]
pub async fn get_config(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client.get("/rest/config").await
}

/// Get Syncthing connections info
#[tauri::command]
pub async fn get_connections(
    state: State<'_, SyncthingState>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::new(&state.config);
    client.get("/rest/system/connections").await
}

/// Update global Syncthing options
#[tauri::command]
pub async fn update_options(
    state: State<'_, SyncthingState>,
    options: serde_json::Value,
) -> Result<(), SyncthingError> {
    let client = SyncthingClient::new(&state.config);

    // Get current config
    let current_config: serde_json::Value = client.get("/rest/config").await?;

    // Merge options into current config
    let updated_config = merge_options(current_config, options)?;

    // Update config
    client.put("/rest/config", &updated_config).await
}

/// Merge new options into current config, returning the updated config
fn merge_options(
    mut config: serde_json::Value,
    options: serde_json::Value,
) -> Result<serde_json::Value, SyncthingError> {
    let config_obj = config
        .as_object_mut()
        .ok_or_else(|| SyncthingError::parse("Config is not an object"))?;

    let current_options = config_obj
        .get("options")
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));

    let mut new_options = current_options;

    match (new_options.as_object_mut(), options.as_object()) {
        (Some(opts_obj), Some(updates_obj)) => {
            for (key, value) in updates_obj {
                opts_obj.insert(key.clone(), value.clone());
            }
        },
        (None, _) => {
            return Err(SyncthingError::parse("Current options is not an object"));
        },
        (_, None) => {
            return Err(SyncthingError::validation(
                "Options to update must be an object",
            ));
        },
    }

    config_obj.insert("options".to_string(), new_options);
    Ok(config)
}
