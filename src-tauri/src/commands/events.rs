//! Events, logs, and tray commands.

use crate::{SyncthingError, SyncthingState};
use tauri::State;

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
            u64::from(timeout.unwrap_or(60)) + 5,
        ))
        .build()
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    let mut url = format!(
        "http://{}:{}/rest/events",
        state.config.host, state.config.port
    );

    let mut params = Vec::new();
    if let Some(s) = since {
        params.push(format!("since={s}"));
    }
    if let Some(l) = limit {
        params.push(format!("limit={l}"));
    }
    if let Some(t) = timeout {
        params.push(format!("timeout={t}"));
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
        url = format!("{url}?since={since_time}");
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

/// Update the system tray tooltip with current status
#[tauri::command]
pub async fn update_tray_status(
    app: tauri::AppHandle,
    _status: String,
    tooltip: String,
) -> Result<(), SyncthingError> {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(&tooltip));
    }

    Ok(())
}
