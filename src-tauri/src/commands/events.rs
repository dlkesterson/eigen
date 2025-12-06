//! Events, logs, and tray commands.

use crate::{SyncthingClient, SyncthingError, SyncthingState};
use tauri::State;

/// Get events from Syncthing (for real-time updates)
#[tauri::command]
pub async fn get_events(
    state: State<'_, SyncthingState>,
    since: Option<u64>,
    limit: Option<u32>,
    timeout: Option<u32>,
) -> Result<serde_json::Value, SyncthingError> {
    let timeout_secs = u64::from(timeout.unwrap_or(60)) + 5;
    let client = SyncthingClient::with_timeout(&state.config, timeout_secs)?;

    // Build URL with query parameters
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

    let path = if params.is_empty() {
        "/rest/events".to_string()
    } else {
        format!("/rest/events?{}", params.join("&"))
    };

    client.get(&path).await
}

/// Get Syncthing logs
#[tauri::command]
pub async fn get_system_logs(
    state: State<'_, SyncthingState>,
    since: Option<String>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = SyncthingClient::new(&state.config);

    let path = match since {
        Some(since_time) => format!("/rest/system/log?since={since_time}"),
        None => "/rest/system/log".to_string(),
    };

    client.get(&path).await
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
