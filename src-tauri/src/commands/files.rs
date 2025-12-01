//! File browser, conflicts, versions, and ignore pattern commands.

use crate::{SyncthingError, SyncthingState};
use tauri::State;

/// Open folder in file explorer
#[tauri::command]
pub async fn open_folder_in_explorer(folder_path: String) -> Result<(), SyncthingError> {
    use std::process::Command;

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| SyncthingError::ProcessError(format!("Failed to open folder: {e}")))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| SyncthingError::ProcessError(format!("Failed to open folder: {}", e)))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| SyncthingError::ProcessError(format!("Failed to open folder: {}", e)))?;
    }

    Ok(())
}

/// Browse files in a folder (list directory contents)
/// This version returns immediate children only (for file browser UI)
#[tauri::command]
pub async fn browse_folder(
    state: State<'_, SyncthingState>,
    folder_id: String,
    prefix: Option<String>,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let mut url = format!(
        "http://{}:{}/rest/db/browse?folder={}&levels=0",
        state.config.host, state.config.port, folder_id
    );

    if let Some(p) = prefix {
        url = format!("{url}&prefix={p}");
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

/// Browse all files in a folder recursively (for indexing)
/// Returns a flat list of all files with their full paths
#[tauri::command]
pub async fn browse_folder_recursive(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<Vec<serde_json::Value>, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/db/browse?folder={}&levels=999",
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

    let mut files = Vec::new();
    if let Some(arr) = json.as_array() {
        flatten_browse_response(arr, "", &mut files);
    }

    Ok(files)
}

/// Helper function to flatten the nested browse response
fn flatten_browse_response(
    items: &[serde_json::Value],
    parent_path: &str,
    result: &mut Vec<serde_json::Value>,
) {
    for item in items {
        if let Some(obj) = item.as_object() {
            let name = obj.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let full_path = if parent_path.is_empty() {
                name.to_string()
            } else {
                format!("{parent_path}/{name}")
            };

            let item_type = obj.get("type").and_then(|t| t.as_str()).unwrap_or("");
            let is_directory = item_type == "FILE_INFO_TYPE_DIRECTORY";

            let flat_item = serde_json::json!({
                "name": full_path,
                "size": obj.get("size").and_then(serde_json::Value::as_i64).unwrap_or(0),
                "modTime": obj.get("modTime").cloned().unwrap_or(serde_json::Value::Null),
                "type": if is_directory { "directory" } else { "file" }
            });

            result.push(flat_item);

            if let Some(children) = obj.get("children").and_then(|c| c.as_array()) {
                flatten_browse_response(children, &full_path, result);
            }
        }
    }
}

/// Get ignore patterns for a folder
#[tauri::command]
pub async fn get_folder_ignores(
    state: State<'_, SyncthingState>,
    folder_id: String,
) -> Result<serde_json::Value, SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/db/ignores?folder={}",
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

/// Set ignore patterns for a folder
#[tauri::command]
pub async fn set_folder_ignores(
    state: State<'_, SyncthingState>,
    folder_id: String,
    ignore_patterns: Vec<String>,
) -> Result<(), SyncthingError> {
    let client = reqwest::Client::new();
    let url = format!(
        "http://{}:{}/rest/db/ignores?folder={}",
        state.config.host, state.config.port, folder_id
    );

    let body = serde_json::json!({
        "ignore": ignore_patterns
    });

    client
        .post(&url)
        .header("X-API-Key", &state.config.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| SyncthingError::HttpError(e.to_string()))?;

    Ok(())
}

/// Get list of conflict files for a folder by scanning the filesystem
#[tauri::command]
pub async fn scan_for_conflicts(
    folder_path: String,
) -> Result<Vec<serde_json::Value>, SyncthingError> {
    fn scan_dir(
        dir: &std::path::Path,
        conflicts: &mut Vec<serde_json::Value>,
        base: &std::path::Path,
    ) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if !name.starts_with('.') && name != ".stversions" {
                            scan_dir(&path, conflicts, base);
                        }
                    }
                } else if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.contains(".sync-conflict-") {
                        let relative_path = path.strip_prefix(base).unwrap_or(&path);
                        if let Ok(metadata) = std::fs::metadata(&path) {
                            let original = extract_original_filename(name);
                            conflicts.push(serde_json::json!({
                                "name": relative_path.to_string_lossy(),
                                "original": original,
                                "size": metadata.len(),
                                "modTime": metadata.modified().ok().map(|t| {
                                    let duration = t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
                                    duration.as_secs()
                                }),
                            }));
                        }
                    }
                }
            }
        }
    }

    fn extract_original_filename(conflict_name: &str) -> String {
        if let Some(pos) = conflict_name.find(".sync-conflict-") {
            let before = &conflict_name[..pos];
            let after = &conflict_name[pos..];
            if let Some(ext_pos) = after.rfind('.') {
                let ext = &after[ext_pos..];
                return format!("{before}{ext}");
            }
            return before.to_string();
        }
        conflict_name.to_string()
    }

    let mut conflicts = Vec::new();
    let base = std::path::Path::new(&folder_path);
    if base.exists() {
        scan_dir(base, &mut conflicts, base);
    }

    Ok(conflicts)
}

/// Delete a conflict file (resolve by keeping the original)
#[tauri::command]
pub async fn delete_conflict_file(
    folder_path: String,
    conflict_file: String,
) -> Result<(), SyncthingError> {
    let full_path = std::path::Path::new(&folder_path).join(&conflict_file);

    if full_path.exists() {
        std::fs::remove_file(&full_path).map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to delete conflict file: {e}"))
        })?;
    }

    Ok(())
}

/// Resolve conflict by replacing original with conflict file
#[tauri::command]
pub async fn resolve_conflict_keep_conflict(
    folder_path: String,
    original_file: String,
    conflict_file: String,
) -> Result<(), SyncthingError> {
    let base_path = std::path::Path::new(&folder_path);
    let original_path = base_path.join(&original_file);
    let conflict_path = base_path.join(&conflict_file);

    if original_path.exists() {
        std::fs::remove_file(&original_path)
            .map_err(|e| SyncthingError::ProcessError(format!("Failed to delete original: {e}")))?;
    }

    if conflict_path.exists() {
        std::fs::rename(&conflict_path, &original_path).map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to rename conflict file: {e}"))
        })?;
    }

    Ok(())
}

/// Browse the .stversions folder for old file versions
#[tauri::command]
pub async fn browse_versions(
    folder_path: String,
    prefix: Option<String>,
) -> Result<Vec<serde_json::Value>, SyncthingError> {
    use std::fs;
    use std::path::Path;

    let versions_path = Path::new(&folder_path).join(".stversions");
    let browse_path = if let Some(ref p) = prefix {
        versions_path.join(p)
    } else {
        versions_path
    };

    if !browse_path.exists() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();

    if let Ok(dir_entries) = fs::read_dir(&browse_path) {
        for entry in dir_entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            if let Ok(metadata) = entry.metadata() {
                let is_dir = metadata.is_dir();

                let (original_name, version_time) = if is_dir {
                    (name.clone(), None)
                } else {
                    parse_version_filename(&name)
                };

                entries.push(serde_json::json!({
                    "name": name,
                    "originalName": original_name,
                    "type": if is_dir { "directory" } else { "file" },
                    "size": if is_dir { None::<u64> } else { Some(metadata.len()) },
                    "modTime": metadata.modified().ok().map(|t| {
                        t.duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_secs())
                            .unwrap_or(0)
                    }),
                    "versionTime": version_time,
                }));
            }
        }
    }

    entries.sort_by(|a, b| {
        let a_is_dir = a["type"].as_str() == Some("directory");
        let b_is_dir = b["type"].as_str() == Some("directory");

        if a_is_dir != b_is_dir {
            return if a_is_dir {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            };
        }

        let a_time = a["modTime"].as_u64().unwrap_or(0);
        let b_time = b["modTime"].as_u64().unwrap_or(0);
        b_time.cmp(&a_time)
    });

    Ok(entries)
}

/// Parse versioned filename to extract original name and version timestamp
fn parse_version_filename(name: &str) -> (String, Option<String>) {
    if let Some(tilde_pos) = name.rfind('~') {
        let before_tilde = &name[..tilde_pos];
        let after_tilde = &name[tilde_pos + 1..];

        let (version_part, extension) = after_tilde.find('.').map_or_else(
            || (after_tilde.to_string(), ""),
            |dot_pos| (after_tilde[..dot_pos].to_string(), &after_tilde[dot_pos..]),
        );

        if version_part.len() == 15 && version_part.chars().nth(8) == Some('-') {
            let original = format!("{before_tilde}{extension}");

            let formatted = format!(
                "{}-{}-{} {}:{}:{}",
                &version_part[0..4],
                &version_part[4..6],
                &version_part[6..8],
                &version_part[9..11],
                &version_part[11..13],
                &version_part[13..15]
            );

            return (original, Some(formatted));
        }
    }

    (name.to_string(), None)
}

/// Restore a versioned file to its original location
#[tauri::command]
pub async fn restore_version(
    folder_path: String,
    version_path: String,
    original_name: String,
    overwrite: bool,
) -> Result<(), SyncthingError> {
    use std::fs;
    use std::path::Path;

    let source = Path::new(&folder_path)
        .join(".stversions")
        .join(&version_path);
    let dest = Path::new(&folder_path).join(&original_name);

    if !source.exists() {
        return Err(SyncthingError::ProcessError(
            "Version file not found".to_string(),
        ));
    }

    if dest.exists() && !overwrite {
        return Err(SyncthingError::ProcessError(
            "Destination file exists. Set overwrite=true to replace.".to_string(),
        ));
    }

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            SyncthingError::ProcessError(format!("Failed to create directories: {e}"))
        })?;
    }

    fs::copy(&source, &dest)
        .map_err(|e| SyncthingError::ProcessError(format!("Failed to restore file: {e}")))?;

    Ok(())
}
