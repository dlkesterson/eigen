//! S3 backend commands for archival backups.
//!
//! Provides S3 integration for long-term archival backups to complement
//! Syncthing's real-time peer-to-peer sync. Supports AWS S3 and S3-compatible
//! services (Backblaze B2, Wasabi, MinIO, etc.).

use aws_config::BehaviorVersion;
use aws_sdk_s3::config::Region;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client as S3Client;
use globset::{Glob, GlobSetBuilder};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter, State};

/// S3 configuration with credentials and connection details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Config {
    /// S3 endpoint URL (e.g., "https://s3.amazonaws.com" or custom endpoint)
    pub endpoint: String,
    /// AWS region (e.g., "us-east-1")
    pub region: String,
    /// Target bucket name for backups
    pub bucket_name: String,
    /// AWS access key ID
    pub access_key_id: String,
    /// AWS secret access key (stored in system keyring)
    #[serde(skip)]
    pub secret_access_key: String,
    /// Optional path prefix for organized storage (e.g., "eigen-backups/")
    pub path_prefix: Option<String>,
}

/// Public S3 configuration (without exposing secret key)
#[derive(Debug, Serialize, Deserialize)]
pub struct S3ConfigPublic {
    pub endpoint: String,
    pub region: String,
    pub bucket_name: String,
    pub access_key_id: String,
    pub path_prefix: Option<String>,
    pub is_configured: bool,
}

impl From<&S3Config> for S3ConfigPublic {
    fn from(config: &S3Config) -> Self {
        Self {
            endpoint: config.endpoint.clone(),
            region: config.region.clone(),
            bucket_name: config.bucket_name.clone(),
            access_key_id: config.access_key_id.clone(),
            path_prefix: config.path_prefix.clone(),
            is_configured: true,
        }
    }
}

/// S3 state managed by Tauri
pub struct S3State {
    /// Current S3 configuration (None if not configured)
    pub config: Mutex<Option<S3Config>>,
    /// Cached S3 client (None if not initialized)
    pub client: Mutex<Option<S3Client>>,
}

impl Default for S3State {
    fn default() -> Self {
        Self {
            config: Mutex::new(None),
            client: Mutex::new(None),
        }
    }
}

/// S3 operation errors
#[derive(Debug, Serialize, Deserialize)]
pub enum S3Error {
    /// S3 backend not configured
    NotConfigured,
    /// Invalid AWS credentials
    InvalidCredentials(String),
    /// Bucket not found or not accessible
    BucketNotFound(String),
    /// File upload failed
    UploadFailed(String),
    /// File download failed
    DownloadFailed(String),
    /// List operation failed
    ListFailed(String),
    /// Configuration error
    ConfigError(String),
    /// AWS SDK error
    SdkError(String),
    /// Keyring error (credential storage)
    KeyringError(String),
}

impl std::fmt::Display for S3Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotConfigured => write!(f, "S3 backend not configured"),
            Self::InvalidCredentials(e) => write!(f, "Invalid credentials: {e}"),
            Self::BucketNotFound(bucket) => write!(f, "Bucket not found: {bucket}"),
            Self::UploadFailed(e) => write!(f, "Upload failed: {e}"),
            Self::DownloadFailed(e) => write!(f, "Download failed: {e}"),
            Self::ListFailed(e) => write!(f, "List operation failed: {e}"),
            Self::ConfigError(e) => write!(f, "Configuration error: {e}"),
            Self::SdkError(e) => write!(f, "AWS SDK error: {e}"),
            Self::KeyringError(e) => write!(f, "Keyring error: {e}"),
        }
    }
}

impl std::error::Error for S3Error {}

/// S3 connection status
#[derive(Debug, Serialize, Deserialize)]
pub struct S3ConnectionStatus {
    pub connected: bool,
    pub bucket_accessible: bool,
    pub error_message: Option<String>,
}

/// S3 object metadata
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct S3Object {
    /// Object key (path in S3)
    pub key: String,
    /// Object size in bytes
    pub size: i64,
    /// Last modified timestamp (RFC3339)
    pub last_modified: String,
    /// ETag (entity tag, typically MD5 hash)
    pub etag: Option<String>,
    /// Storage class (e.g., STANDARD, GLACIER)
    pub storage_class: Option<String>,
}

/// Result of listing S3 objects
#[derive(Debug, Serialize, Deserialize)]
pub struct S3ListResult {
    /// List of objects found
    pub objects: Vec<S3Object>,
    /// Common prefixes (folder-like structure)
    pub common_prefixes: Vec<String>,
    /// Whether more results are available
    pub is_truncated: bool,
    /// Continuation token for next page
    pub next_continuation_token: Option<String>,
}

/// Upload progress event
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct S3UploadProgress {
    /// File path being uploaded
    pub file_path: String,
    /// Bytes uploaded so far
    pub bytes_uploaded: u64,
    /// Total bytes to upload
    pub total_bytes: u64,
    /// Progress percentage (0-100)
    pub percentage: f64,
}

/// Download progress event
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct S3DownloadProgress {
    /// S3 key being downloaded
    pub s3_key: String,
    /// Bytes downloaded so far
    pub bytes_downloaded: u64,
    /// Total bytes to download
    pub total_bytes: u64,
    /// Progress percentage (0-100)
    pub percentage: f64,
}

/// File sync status
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SyncStatus {
    /// File is synchronized with S3
    Synced,
    /// File has been modified locally
    Modified,
    /// File is new (not in S3)
    New,
    /// File exists in S3 but not locally
    Deleted,
}

/// Information about a file's sync state
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileSyncInfo {
    /// Local file path
    pub local_path: String,
    /// S3 key (if exists in S3)
    pub s3_key: Option<String>,
    /// Sync status
    pub status: SyncStatus,
    /// File size in bytes
    pub size: u64,
    /// Last modified time (Unix timestamp)
    pub last_modified: u64,
}

/// Result of a folder sync operation
#[derive(Debug, Serialize, Deserialize)]
pub struct FolderSyncResult {
    /// Number of files uploaded
    pub uploaded: usize,
    /// Number of files skipped (already synced)
    pub skipped: usize,
    /// Number of files that failed to upload
    pub failed: usize,
    /// Total bytes uploaded
    pub bytes_uploaded: u64,
    /// List of failed file paths and error messages
    pub errors: Vec<(String, String)>,
}

/// Folder restore result
#[derive(Debug, Serialize, Deserialize)]
pub struct FolderRestoreResult {
    /// Number of files downloaded
    pub downloaded: usize,
    /// Number of files skipped (already exist locally)
    pub skipped: usize,
    /// Number of files that failed to download
    pub failed: usize,
    /// Total bytes downloaded
    pub bytes_downloaded: u64,
    /// List of failed file paths and error messages
    pub errors: Vec<(String, String)>,
}

/// Configure S3 backend with credentials and connection details
///
/// # Arguments
///
/// * `endpoint` - S3 endpoint URL (use "https://s3.amazonaws.com" for AWS)
/// * `region` - AWS region (e.g., "us-east-1")
/// * `bucket_name` - Target bucket for backups
/// * `access_key_id` - AWS access key ID
/// * `secret_access_key` - AWS secret access key (will be stored in system keyring)
/// * `path_prefix` - Optional prefix for organized storage (e.g., "eigen-backups/")
#[tauri::command]
pub async fn configure_s3(
    state: State<'_, S3State>,
    endpoint: String,
    region: String,
    bucket_name: String,
    access_key_id: String,
    secret_access_key: String,
    path_prefix: Option<String>,
) -> Result<(), S3Error> {
    // Validate inputs
    if endpoint.is_empty() {
        return Err(S3Error::ConfigError("Endpoint cannot be empty".to_string()));
    }
    if region.is_empty() {
        return Err(S3Error::ConfigError("Region cannot be empty".to_string()));
    }
    if bucket_name.is_empty() {
        return Err(S3Error::ConfigError(
            "Bucket name cannot be empty".to_string(),
        ));
    }
    if access_key_id.is_empty() {
        return Err(S3Error::ConfigError(
            "Access key ID cannot be empty".to_string(),
        ));
    }
    if secret_access_key.is_empty() {
        return Err(S3Error::ConfigError(
            "Secret access key cannot be empty".to_string(),
        ));
    }

    // Store secret key in system keyring
    store_secret_key(&access_key_id, &secret_access_key)?;

    // Create configuration
    let config = S3Config {
        endpoint: endpoint.clone(),
        region: region.clone(),
        bucket_name: bucket_name.clone(),
        access_key_id: access_key_id.clone(),
        secret_access_key: secret_access_key.clone(),
        path_prefix,
    };

    // Initialize S3 client
    let client = create_s3_client(&config).await?;

    // Test connection by attempting to head the bucket
    test_bucket_access(&client, &bucket_name).await?;

    // Store configuration and client in state
    *state.config.lock().unwrap() = Some(config);
    *state.client.lock().unwrap() = Some(client);

    Ok(())
}

/// Get current S3 configuration (without exposing secret key)
#[tauri::command]
pub async fn get_s3_config(
    state: State<'_, S3State>,
) -> Result<S3ConfigPublic, S3Error> {
    let config_guard = state.config.lock().unwrap();

    match config_guard.as_ref() {
        Some(config) => Ok(config.into()),
        None => Ok(S3ConfigPublic {
            endpoint: String::new(),
            region: String::new(),
            bucket_name: String::new(),
            access_key_id: String::new(),
            path_prefix: None,
            is_configured: false,
        }),
    }
}

/// Test S3 connection and bucket access
#[tauri::command]
pub async fn test_s3_connection(
    state: State<'_, S3State>,
) -> Result<S3ConnectionStatus, S3Error> {
    let (client, bucket_name) = {
        let client_guard = state.client.lock().unwrap();
        let config_guard = state.config.lock().unwrap();

        match (client_guard.as_ref(), config_guard.as_ref()) {
            (Some(c), Some(cfg)) => (c.clone(), cfg.bucket_name.clone()),
            _ => return Err(S3Error::NotConfigured),
        }
    }; // Guards dropped here when scope ends

    // Test bucket access
    match test_bucket_access(&client, &bucket_name).await {
        Ok(()) => Ok(S3ConnectionStatus {
            connected: true,
            bucket_accessible: true,
            error_message: None,
        }),
        Err(e) => Ok(S3ConnectionStatus {
            connected: true,
            bucket_accessible: false,
            error_message: Some(e.to_string()),
        }),
    }
}

/// Upload a file to S3
///
/// # Arguments
///
/// * `local_path` - Local file path to upload
/// * `s3_key` - Target S3 key (path in bucket). If None, uses filename with prefix
/// * `app_handle` - Tauri app handle for emitting progress events
#[tauri::command]
pub async fn upload_file_to_s3(
    state: State<'_, S3State>,
    app_handle: AppHandle,
    local_path: String,
    s3_key: Option<String>,
) -> Result<S3Object, S3Error> {
    let (client, config) = {
        let client_guard = state.client.lock().unwrap();
        let config_guard = state.config.lock().unwrap();

        match (client_guard.as_ref(), config_guard.as_ref()) {
            (Some(c), Some(cfg)) => (c.clone(), cfg.clone()),
            _ => return Err(S3Error::NotConfigured),
        }
    }; // Guards dropped here

    // Validate local file exists
    let path = Path::new(&local_path);
    if !path.exists() {
        return Err(S3Error::UploadFailed(format!(
            "File not found: {}",
            local_path
        )));
    }
    if !path.is_file() {
        return Err(S3Error::UploadFailed(format!(
            "Path is not a file: {}",
            local_path
        )));
    }

    // Get file size for progress tracking
    let file_metadata = std::fs::metadata(&local_path).map_err(|e| {
        S3Error::UploadFailed(format!("Failed to read file metadata: {}", e))
    })?;
    let total_bytes = file_metadata.len();

    // Build S3 key
    let key = match s3_key {
        Some(k) => {
            if let Some(prefix) = &config.path_prefix {
                format!("{}{}", prefix, k)
            } else {
                k
            }
        }
        None => {
            let filename = path
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or_else(|| S3Error::UploadFailed("Invalid filename".to_string()))?;
            if let Some(prefix) = &config.path_prefix {
                format!("{}{}", prefix, filename)
            } else {
                filename.to_string()
            }
        }
    };

    // Emit initial progress event
    let _ = app_handle.emit(
        "s3-upload-progress",
        S3UploadProgress {
            file_path: local_path.clone(),
            bytes_uploaded: 0,
            total_bytes,
            percentage: 0.0,
        },
    );

    // Upload file
    let body = ByteStream::from_path(&path)
        .await
        .map_err(|e| S3Error::UploadFailed(format!("Failed to read file: {}", e)))?;

    let result = client
        .put_object()
        .bucket(&config.bucket_name)
        .key(&key)
        .body(body)
        .send()
        .await
        .map_err(|e| S3Error::UploadFailed(format!("Upload failed: {}", e)))?;

    // Emit completion progress event
    let _ = app_handle.emit(
        "s3-upload-progress",
        S3UploadProgress {
            file_path: local_path.clone(),
            bytes_uploaded: total_bytes,
            total_bytes,
            percentage: 100.0,
        },
    );

    // Return object metadata
    Ok(S3Object {
        key: key.clone(),
        size: total_bytes as i64,
        last_modified: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            .to_string(),
        etag: result.e_tag().map(|s| s.to_string()),
        storage_class: None,
    })
}

/// Download a file from S3
///
/// # Arguments
///
/// * `s3_key` - S3 key (path in bucket) to download
/// * `local_path` - Local file path to save to
/// * `app_handle` - Tauri app handle for emitting progress events
#[tauri::command]
pub async fn download_file_from_s3(
    state: State<'_, S3State>,
    app_handle: AppHandle,
    s3_key: String,
    local_path: String,
) -> Result<(), S3Error> {
    let (client, config) = {
        let client_guard = state.client.lock().unwrap();
        let config_guard = state.config.lock().unwrap();

        match (client_guard.as_ref(), config_guard.as_ref()) {
            (Some(c), Some(cfg)) => (c.clone(), cfg.clone()),
            _ => return Err(S3Error::NotConfigured),
        }
    }; // Guards dropped here

    // Build full S3 key with prefix
    let full_key = if let Some(prefix) = &config.path_prefix {
        format!("{}{}", prefix, s3_key)
    } else {
        s3_key.clone()
    };

    // Get object metadata for size
    let head_result = client
        .head_object()
        .bucket(&config.bucket_name)
        .key(&full_key)
        .send()
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("404") || error_msg.contains("NoSuchKey") {
                S3Error::DownloadFailed(format!("Object not found: {}", s3_key))
            } else {
                S3Error::DownloadFailed(format!("Failed to get object metadata: {}", e))
            }
        })?;

    let total_bytes = head_result.content_length().unwrap_or(0) as u64;

    // Emit initial progress event
    let _ = app_handle.emit(
        "s3-download-progress",
        S3DownloadProgress {
            s3_key: s3_key.clone(),
            bytes_downloaded: 0,
            total_bytes,
            percentage: 0.0,
        },
    );

    // Download object
    let result = client
        .get_object()
        .bucket(&config.bucket_name)
        .key(&full_key)
        .send()
        .await
        .map_err(|e| S3Error::DownloadFailed(format!("Download failed: {}", e)))?;

    // Create parent directory if it doesn't exist
    if let Some(parent) = Path::new(&local_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| S3Error::DownloadFailed(format!("Failed to create directory: {}", e)))?;
    }

    // Write to file
    let body = result.body.collect().await.map_err(|e| {
        S3Error::DownloadFailed(format!("Failed to read response body: {}", e))
    })?;

    std::fs::write(&local_path, body.into_bytes())
        .map_err(|e| S3Error::DownloadFailed(format!("Failed to write file: {}", e)))?;

    // Emit completion progress event
    let _ = app_handle.emit(
        "s3-download-progress",
        S3DownloadProgress {
            s3_key: s3_key.clone(),
            bytes_downloaded: total_bytes,
            total_bytes,
            percentage: 100.0,
        },
    );

    Ok(())
}

/// List objects in S3 bucket
///
/// # Arguments
///
/// * `prefix` - Optional prefix to filter objects (for folder-like browsing)
/// * `delimiter` - Optional delimiter for hierarchical listing (use "/" for folder view)
/// * `max_keys` - Maximum number of keys to return (default 1000, max 1000)
/// * `continuation_token` - Token for paginated results
#[tauri::command]
pub async fn list_s3_objects(
    state: State<'_, S3State>,
    prefix: Option<String>,
    delimiter: Option<String>,
    max_keys: Option<i32>,
    continuation_token: Option<String>,
) -> Result<S3ListResult, S3Error> {
    let (client, config) = {
        let client_guard = state.client.lock().unwrap();
        let config_guard = state.config.lock().unwrap();

        match (client_guard.as_ref(), config_guard.as_ref()) {
            (Some(c), Some(cfg)) => (c.clone(), cfg.clone()),
            _ => return Err(S3Error::NotConfigured),
        }
    }; // Guards dropped here

    // Build full prefix with path_prefix
    let full_prefix = match (&config.path_prefix, prefix) {
        (Some(path_prefix), Some(user_prefix)) => format!("{}{}", path_prefix, user_prefix),
        (Some(path_prefix), None) => path_prefix.clone(),
        (None, Some(user_prefix)) => user_prefix,
        (None, None) => String::new(),
    };

    // Build list request
    let mut request = client
        .list_objects_v2()
        .bucket(&config.bucket_name)
        .max_keys(max_keys.unwrap_or(1000).min(1000));

    if !full_prefix.is_empty() {
        request = request.prefix(&full_prefix);
    }

    if let Some(delim) = delimiter {
        request = request.delimiter(delim);
    }

    if let Some(token) = continuation_token {
        request = request.continuation_token(token);
    }

    // Execute list request
    let response = request
        .send()
        .await
        .map_err(|e| S3Error::ListFailed(format!("List operation failed: {}", e)))?;

    // Extract objects
    let objects = response
        .contents()
        .iter()
        .filter_map(|obj| {
            let key = obj.key()?;
            let size = obj.size().unwrap_or(0);
            let last_modified = obj
                .last_modified()
                .map(|dt| dt.to_string())
                .unwrap_or_default();
            let etag = obj.e_tag().map(|s| s.to_string());
            let storage_class = obj.storage_class().map(|sc| sc.as_str().to_string());

            Some(S3Object {
                key: key.to_string(),
                size,
                last_modified,
                etag,
                storage_class,
            })
        })
        .collect();

    // Extract common prefixes (folder-like structure)
    let common_prefixes = response
        .common_prefixes()
        .iter()
        .filter_map(|cp| cp.prefix().map(|s| s.to_string()))
        .collect();

    Ok(S3ListResult {
        objects,
        common_prefixes,
        is_truncated: response.is_truncated().unwrap_or(false),
        next_continuation_token: response.next_continuation_token().map(|s| s.to_string()),
    })
}

/// Delete a file from S3
///
/// # Arguments
///
/// * `s3_key` - S3 key (path in bucket) to delete
#[tauri::command]
pub async fn delete_file_from_s3(
    state: State<'_, S3State>,
    s3_key: String,
) -> Result<(), S3Error> {
    let (client, config) = {
        let client_guard = state.client.lock().unwrap();
        let config_guard = state.config.lock().unwrap();

        match (client_guard.as_ref(), config_guard.as_ref()) {
            (Some(c), Some(cfg)) => (c.clone(), cfg.clone()),
            _ => return Err(S3Error::NotConfigured),
        }
    }; // Guards dropped here

    // Build full S3 key with prefix
    let full_key = if let Some(prefix) = &config.path_prefix {
        format!("{}{}", prefix, s3_key)
    } else {
        s3_key.clone()
    };

    // Delete object
    client
        .delete_object()
        .bucket(&config.bucket_name)
        .key(&full_key)
        .send()
        .await
        .map_err(|e| S3Error::SdkError(format!("Delete failed: {}", e)))?;

    Ok(())
}

/// Sync a local folder to S3 (incremental upload)
///
/// # Arguments
///
/// * `local_folder_path` - Local folder to sync
/// * `s3_folder_prefix` - S3 prefix for the folder (e.g., "backups/my-folder/")
/// * `exclude_patterns` - Optional glob patterns to exclude (e.g., ["*.tmp", ".git/**"])
/// * `app_handle` - Tauri app handle for emitting progress events
#[tauri::command]
pub async fn sync_folder_to_s3(
    state: State<'_, S3State>,
    app_handle: AppHandle,
    local_folder_path: String,
    s3_folder_prefix: String,
    exclude_patterns: Option<Vec<String>>,
) -> Result<FolderSyncResult, S3Error> {
    let (client, config) = {
        let client_guard = state.client.lock().unwrap();
        let config_guard = state.config.lock().unwrap();

        match (client_guard.as_ref(), config_guard.as_ref()) {
            (Some(c), Some(cfg)) => (c.clone(), cfg.clone()),
            _ => return Err(S3Error::NotConfigured),
        }
    };

    // Validate local folder exists
    let local_path = Path::new(&local_folder_path);
    if !local_path.exists() || !local_path.is_dir() {
        return Err(S3Error::UploadFailed(format!(
            "Folder not found: {}",
            local_folder_path
        )));
    }

    // Build exclude glob set
    let exclude_set = if let Some(patterns) = exclude_patterns {
        let mut builder = GlobSetBuilder::new();
        for pattern in patterns {
            let glob = Glob::new(&pattern)
                .map_err(|e| S3Error::ConfigError(format!("Invalid glob pattern: {}", e)))?;
            builder.add(glob);
        }
        Some(
            builder
                .build()
                .map_err(|e| S3Error::ConfigError(format!("Failed to build glob set: {}", e)))?,
        )
    } else {
        None
    };

    // Build full S3 prefix
    let full_prefix = if let Some(path_prefix) = &config.path_prefix {
        format!("{}{}", path_prefix, s3_folder_prefix)
    } else {
        s3_folder_prefix.clone()
    };

    // List existing S3 objects to determine what needs syncing
    let mut s3_objects: HashMap<String, S3Object> = HashMap::new();
    let mut continuation_token: Option<String> = None;

    loop {
        let mut request = client
            .list_objects_v2()
            .bucket(&config.bucket_name)
            .prefix(&full_prefix)
            .max_keys(1000);

        if let Some(token) = continuation_token {
            request = request.continuation_token(token);
        }

        let response = request.send().await.map_err(|e| {
            S3Error::ListFailed(format!("Failed to list S3 objects: {}", e))
        })?;

        for obj in response.contents() {
            if let Some(key) = obj.key() {
                s3_objects.insert(
                    key.to_string(),
                    S3Object {
                        key: key.to_string(),
                        size: obj.size().unwrap_or(0),
                        last_modified: obj
                            .last_modified()
                            .map(|dt| dt.to_string())
                            .unwrap_or_default(),
                        etag: obj.e_tag().map(|s| s.to_string()),
                        storage_class: obj.storage_class().map(|sc| sc.as_str().to_string()),
                    },
                );
            }
        }

        if !response.is_truncated().unwrap_or(false) {
            break;
        }
        continuation_token = response.next_continuation_token().map(|s| s.to_string());
    }

    // Walk local folder and collect files to sync
    let mut result = FolderSyncResult {
        uploaded: 0,
        skipped: 0,
        failed: 0,
        bytes_uploaded: 0,
        errors: Vec::new(),
    };

    walk_and_sync_folder(
        &client,
        &config,
        &app_handle,
        local_path,
        local_path,
        &full_prefix,
        &s3_objects,
        &exclude_set,
        &mut result,
    )
    .await?;

    Ok(result)
}

// ===== Helper Functions =====

/// Store secret access key in system keyring
fn store_secret_key(access_key_id: &str, secret_access_key: &str) -> Result<(), S3Error> {
    let entry = keyring::Entry::new("eigen-s3", access_key_id)
        .map_err(|e| S3Error::KeyringError(format!("Failed to create keyring entry: {e}")))?;

    entry
        .set_password(secret_access_key)
        .map_err(|e| S3Error::KeyringError(format!("Failed to store secret key: {e}")))?;

    Ok(())
}

/// Retrieve secret access key from system keyring
#[allow(dead_code)]
fn get_secret_key(access_key_id: &str) -> Result<String, S3Error> {
    let entry = keyring::Entry::new("eigen-s3", access_key_id)
        .map_err(|e| S3Error::KeyringError(format!("Failed to create keyring entry: {e}")))?;

    entry
        .get_password()
        .map_err(|e| S3Error::KeyringError(format!("Failed to retrieve secret key: {e}")))
}

/// Create S3 client with custom endpoint support
async fn create_s3_client(config: &S3Config) -> Result<S3Client, S3Error> {
    use aws_credential_types::provider::SharedCredentialsProvider;
    use aws_credential_types::Credentials;

    // Create static credentials
    let creds = Credentials::new(
        &config.access_key_id,
        &config.secret_access_key,
        None, // session token
        None, // expiration
        "eigen-s3",
    );

    // Wrap in SharedCredentialsProvider
    let provider = SharedCredentialsProvider::new(creds);

    // Build SDK config
    let sdk_config = aws_config::SdkConfig::builder()
        .behavior_version(BehaviorVersion::latest())
        .region(Region::new(config.region.clone()))
        .credentials_provider(provider)
        .build();

    // Build S3-specific config from SDK config
    let mut s3_config_builder = aws_sdk_s3::config::Builder::from(&sdk_config);

    // Set custom endpoint if not using default AWS
    if !config.endpoint.contains("s3.amazonaws.com") {
        s3_config_builder = s3_config_builder
            .endpoint_url(&config.endpoint)
            .force_path_style(true); // Required for MinIO and some S3-compatible services
    }

    let s3_config = s3_config_builder.build();
    let client = S3Client::from_conf(s3_config);

    Ok(client)
}

/// Test bucket access by performing a head bucket operation
async fn test_bucket_access(client: &S3Client, bucket_name: &str) -> Result<(), S3Error> {
    client
        .head_bucket()
        .bucket(bucket_name)
        .send()
        .await
        .map_err(|e| {
            let error_msg = e.to_string();
            if error_msg.contains("404") || error_msg.contains("NoSuchBucket") {
                S3Error::BucketNotFound(bucket_name.to_string())
            } else if error_msg.contains("403") || error_msg.contains("InvalidAccessKeyId") {
                S3Error::InvalidCredentials(error_msg)
            } else {
                S3Error::SdkError(error_msg)
            }
        })?;

    Ok(())
}

/// Recursively walk and sync a folder to S3
#[allow(clippy::too_many_arguments)]
async fn walk_and_sync_folder(
    client: &S3Client,
    config: &S3Config,
    app_handle: &AppHandle,
    root_path: &Path,
    current_path: &Path,
    s3_prefix: &str,
    s3_objects: &HashMap<String, S3Object>,
    exclude_set: &Option<globset::GlobSet>,
    result: &mut FolderSyncResult,
) -> Result<(), S3Error> {
    let entries = fs::read_dir(current_path)
        .map_err(|e| S3Error::UploadFailed(format!("Failed to read directory: {}", e)))?;

    for entry in entries {
        let entry =
            entry.map_err(|e| S3Error::UploadFailed(format!("Failed to read entry: {}", e)))?;
        let path = entry.path();

        // Get relative path from root
        let rel_path = path
            .strip_prefix(root_path)
            .map_err(|e| S3Error::UploadFailed(format!("Path error: {}", e)))?;

        // Check if excluded
        if let Some(ref glob_set) = exclude_set {
            if glob_set.is_match(&rel_path) {
                continue;
            }
        }

        if path.is_dir() {
            // Recurse into subdirectory
            Box::pin(walk_and_sync_folder(
                client,
                config,
                app_handle,
                root_path,
                &path,
                s3_prefix,
                s3_objects,
                exclude_set,
                result,
            ))
            .await?;
        } else if path.is_file() {
            // Build S3 key for this file
            let s3_key = format!(
                "{}{}",
                s3_prefix,
                rel_path.to_string_lossy().replace('\\', "/")
            );

            // Get file metadata
            let metadata = fs::metadata(&path).map_err(|e| {
                S3Error::UploadFailed(format!("Failed to read file metadata: {}", e))
            })?;
            let file_size = metadata.len();

            // Check if file needs syncing
            let needs_sync = if let Some(s3_obj) = s3_objects.get(&s3_key) {
                // File exists in S3 - check if modified
                s3_obj.size != file_size as i64
            } else {
                // File doesn't exist in S3
                true
            };

            if needs_sync {
                // Upload file
                let local_path_str = path.to_string_lossy().to_string();

                // Emit upload progress start
                let _ = app_handle.emit(
                    "s3-folder-sync-progress",
                    FileSyncInfo {
                        local_path: local_path_str.clone(),
                        s3_key: Some(s3_key.clone()),
                        status: SyncStatus::Modified,
                        size: file_size,
                        last_modified: SystemTime::now()
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .unwrap()
                            .as_secs(),
                    },
                );

                // Upload the file
                match upload_single_file(client, config, &path, &s3_key).await {
                    Ok(_) => {
                        result.uploaded += 1;
                        result.bytes_uploaded += file_size;
                    }
                    Err(e) => {
                        result.failed += 1;
                        result.errors.push((local_path_str, e.to_string()));
                    }
                }
            } else {
                result.skipped += 1;
            }
        }
    }

    Ok(())
}

/// Upload a single file to S3 (helper for folder sync)
async fn upload_single_file(
    client: &S3Client,
    config: &S3Config,
    local_path: &Path,
    s3_key: &str,
) -> Result<(), S3Error> {
    let body = ByteStream::from_path(local_path)
        .await
        .map_err(|e| S3Error::UploadFailed(format!("Failed to read file: {}", e)))?;

    client
        .put_object()
        .bucket(&config.bucket_name)
        .key(s3_key)
        .body(body)
        .send()
        .await
        .map_err(|e| S3Error::UploadFailed(format!("Upload failed: {}", e)))?;

    Ok(())
}
