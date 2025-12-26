# S3 Backend Design for Eigen

**Created:** 2025-12-25
**Status:** Design Phase
**Goal:** Add S3 archival backup support to complement Syncthing real-time sync

---

## Overview

Add S3 backend to Eigen for archival backups of important files (photos, videos, documents). This completes the sync foundation:
- **Syncthing**: Real-time, peer-to-peer sync across active devices
- **S3**: Long-term archival backup to cloud storage (AWS S3, B2, MinIO, etc.)

---

## Architecture

### State Management

Mirror the existing `SyncthingState` pattern:

```rust
pub struct S3Config {
    pub endpoint: String,           // e.g., "https://s3.amazonaws.com" or custom endpoint
    pub region: String,              // e.g., "us-east-1"
    pub bucket_name: String,         // Target bucket for backups
    pub access_key_id: String,       // AWS credentials
    pub secret_access_key: String,   // AWS credentials
    pub path_prefix: Option<String>, // Optional prefix for organized storage (e.g., "eigen-backups/")
}

pub struct S3State {
    pub config: Mutex<Option<S3Config>>,
    pub client: Mutex<Option<aws_sdk_s3::Client>>,
}
```

### Error Handling

Extend the existing error pattern:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum S3Error {
    NotConfigured,
    InvalidCredentials,
    BucketNotFound(String),
    UploadFailed(String),
    DownloadFailed(String),
    ListFailed(String),
    ConfigError(String),
    SdkError(String),
}
```

---

## API Commands

### Configuration Management

#### `configure_s3`
Set up S3 credentials and connection.

```rust
#[tauri::command]
pub async fn configure_s3(
    state: State<'_, S3State>,
    endpoint: String,
    region: String,
    bucket_name: String,
    access_key_id: String,
    secret_access_key: String,
    path_prefix: Option<String>,
) -> Result<(), S3Error>
```

**Flow:**
1. Validate credentials format
2. Create AWS config with custom endpoint support
3. Initialize S3 client
4. Test connection with `HeadBucket` operation
5. Store config in state
6. Persist config to disk (encrypted credentials)

#### `get_s3_config`
Retrieve current S3 configuration (without exposing secret key).

```rust
#[tauri::command]
pub async fn get_s3_config(
    state: State<'_, S3State>,
) -> Result<S3ConfigPublic, S3Error>

pub struct S3ConfigPublic {
    pub endpoint: String,
    pub region: String,
    pub bucket_name: String,
    pub access_key_id: String,  // Shown
    pub path_prefix: Option<String>,
    pub is_configured: bool,
}
```

#### `test_s3_connection`
Verify S3 credentials and bucket access.

```rust
#[tauri::command]
pub async fn test_s3_connection(
    state: State<'_, S3State>,
) -> Result<S3ConnectionStatus, S3Error>

pub struct S3ConnectionStatus {
    pub connected: bool,
    pub bucket_accessible: bool,
    pub error_message: Option<String>,
}
```

---

### Bucket Operations

#### `list_s3_buckets`
List all accessible S3 buckets (for bucket selection UI).

```rust
#[tauri::command]
pub async fn list_s3_buckets(
    state: State<'_, S3State>,
) -> Result<Vec<S3BucketInfo>, S3Error>

pub struct S3BucketInfo {
    pub name: String,
    pub creation_date: Option<String>,
}
```

#### `list_s3_objects`
List objects in the configured bucket with optional prefix filtering.

```rust
#[tauri::command]
pub async fn list_s3_objects(
    state: State<'_, S3State>,
    prefix: Option<String>,
    max_keys: Option<i32>,  // Default 1000
) -> Result<Vec<S3ObjectInfo>, S3Error>

pub struct S3ObjectInfo {
    pub key: String,
    pub size: i64,
    pub last_modified: String,
    pub e_tag: String,
    pub storage_class: Option<String>,
}
```

---

### File Operations

#### `upload_file_to_s3`
Upload a single file to S3.

```rust
#[tauri::command]
pub async fn upload_file_to_s3(
    state: State<'_, S3State>,
    local_path: String,
    s3_key: String,  // Remote path in bucket
    metadata: Option<HashMap<String, String>>,
) -> Result<S3UploadResult, S3Error>

pub struct S3UploadResult {
    pub success: bool,
    pub bytes_uploaded: i64,
    pub e_tag: String,
    pub duration_ms: u64,
}
```

**Features:**
- Progress tracking via Tauri events
- Multipart upload for large files (>5MB)
- Automatic retry with exponential backoff
- Content-type detection
- Custom metadata support

#### `download_file_from_s3`
Download a single file from S3.

```rust
#[tauri::command]
pub async fn download_file_from_s3(
    state: State<'_, S3State>,
    s3_key: String,
    local_path: String,
) -> Result<S3DownloadResult, S3Error>

pub struct S3DownloadResult {
    pub success: bool,
    pub bytes_downloaded: i64,
    pub duration_ms: u64,
}
```

**Features:**
- Progress tracking via Tauri events
- Resume capability for interrupted downloads
- Automatic retry with exponential backoff

#### `delete_file_from_s3`
Delete a file from S3.

```rust
#[tauri::command]
pub async fn delete_file_from_s3(
    state: State<'_, S3State>,
    s3_key: String,
) -> Result<(), S3Error>
```

---

### Folder Sync Operations

#### `sync_folder_to_s3`
Sync a local folder to S3 (backup operation).

```rust
#[tauri::command]
pub async fn sync_folder_to_s3(
    state: State<'_, S3State>,
    local_folder: String,
    s3_prefix: String,
    options: SyncOptions,
) -> Result<SyncReport, S3Error>

pub struct SyncOptions {
    pub dry_run: bool,           // Preview changes without uploading
    pub delete_remote: bool,     // Delete S3 files not in local folder
    pub exclude_patterns: Vec<String>,  // e.g., ["*.tmp", ".DS_Store"]
    pub include_hidden: bool,    // Include hidden files (dotfiles)
}

pub struct SyncReport {
    pub files_uploaded: u32,
    pub files_deleted: u32,
    pub files_skipped: u32,
    pub bytes_transferred: i64,
    pub duration_ms: u64,
    pub errors: Vec<String>,
}
```

**Features:**
- Incremental sync (compare checksums/ETags)
- Progress events for UI feedback
- Parallel uploads (configurable concurrency)
- Exclude pattern support (glob patterns)

#### `restore_folder_from_s3`
Restore a folder from S3 to local filesystem.

```rust
#[tauri::command]
pub async fn restore_folder_from_s3(
    state: State<'_, S3State>,
    s3_prefix: String,
    local_folder: String,
    options: RestoreOptions,
) -> Result<RestoreReport, S3Error>

pub struct RestoreOptions {
    pub dry_run: bool,
    pub overwrite_existing: bool,
    pub exclude_patterns: Vec<String>,
}

pub struct RestoreReport {
    pub files_downloaded: u32,
    pub files_skipped: u32,
    pub bytes_transferred: i64,
    pub duration_ms: u64,
    pub errors: Vec<String>,
}
```

---

## Progress Tracking

Use Tauri events to emit progress updates to the frontend:

```rust
// Emit progress events during long operations
app.emit_all("s3:upload-progress", S3ProgressPayload {
    operation_id: String,
    file_name: String,
    bytes_transferred: i64,
    total_bytes: i64,
    percentage: f64,
});
```

Frontend can listen with:
```typescript
import { listen } from '@tauri-apps/api/event';

listen<S3ProgressPayload>('s3:upload-progress', (event) => {
  updateProgress(event.payload);
});
```

---

## Security Considerations

### Credential Storage

**Never store plain-text credentials!**

1. **macOS**: Use keychain-services crate
2. **Windows**: Use Windows Credential Manager
3. **Linux**: Use Secret Service API (libsecret)

```rust
// Use keyring crate for cross-platform secure storage
use keyring::Entry;

let entry = Entry::new("eigen-s3", "default-profile")?;
entry.set_password(&credentials_json)?;
```

### Encrypted Config File

Store non-sensitive config in `~/.config/eigen/s3-config.json`:
```json
{
  "endpoint": "https://s3.amazonaws.com",
  "region": "us-east-1",
  "bucket_name": "my-backups",
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "path_prefix": "eigen-backups/",
  "last_sync_timestamp": "2025-12-25T10:00:00Z"
}
```

Secret key stored separately in system keyring.

---

## Implementation Phases

### Phase 1: Core Infrastructure (1-2 days)
- [ ] Add aws-sdk-s3 dependencies to Cargo.toml
- [ ] Create `src-tauri/src/commands/s3.rs`
- [ ] Implement S3State and S3Config structs
- [ ] Add S3Error enum with proper error mapping
- [ ] Implement `configure_s3` and `test_s3_connection`
- [ ] Add credential storage (keyring integration)

### Phase 2: Basic File Operations (1-2 days)
- [ ] Implement `upload_file_to_s3`
- [ ] Implement `download_file_from_s3`
- [ ] Implement `list_s3_objects`
- [ ] Implement `delete_file_from_s3`
- [ ] Add progress tracking via Tauri events
- [ ] Add TypeScript wrappers in `tauri-commands.ts`

### Phase 3: Folder Sync (2-3 days)
- [ ] Implement `sync_folder_to_s3` with incremental sync
- [ ] Implement `restore_folder_from_s3`
- [ ] Add exclude pattern support (glob matching)
- [ ] Parallel upload/download with concurrency limits
- [ ] Comprehensive error handling and retries

### Phase 4: Frontend UI (2-3 days)
- [ ] S3 Configuration Page
  - Endpoint, region, bucket selection
  - Credential input (with masked secret key)
  - Test connection button
  - Save/cancel buttons
- [ ] Backup Manager Page
  - Folder selection for backup
  - Sync options (exclude patterns, delete remote)
  - Start backup button with progress bar
  - Sync history/logs
- [ ] Restore Manager Page
  - Browse S3 objects
  - Select restore destination
  - Restore options (overwrite, exclude patterns)
  - Start restore button with progress bar
- [ ] Settings Integration
  - S3 config in settings page
  - Auto-backup schedule (cron-like)

### Phase 5: Testing & Polish (1-2 days)
- [ ] Manual testing with AWS S3
- [ ] Test with Backblaze B2 (S3-compatible)
- [ ] Test with MinIO (local S3-compatible storage)
- [ ] Error scenario testing (network failures, invalid credentials)
- [ ] Performance testing (large files, many files)
- [ ] Documentation updates

---

## Dependencies

Add to `src-tauri/Cargo.toml`:

```toml
[dependencies]
# Existing dependencies...

# AWS S3 SDK
aws-config = { version = "1", features = ["behavior-version-latest"] }
aws-sdk-s3 = "1"

# Secure credential storage
keyring = "2"

# For glob pattern matching
globset = "0.4"

# Already have tokio, serde, reqwest
```

---

## Configuration UI Mockup

```
┌─────────────────────────────────────────────┐
│ S3 Backup Configuration                     │
├─────────────────────────────────────────────┤
│                                             │
│ Endpoint: [https://s3.amazonaws.com     ] │
│ Region:   [us-east-1                    ▼] │
│ Bucket:   [Select Bucket...             ▼] │
│                                    [Browse] │
│                                             │
│ Access Key ID:     [AKIAIOSFODNN7EXAM...] │
│ Secret Access Key: [••••••••••••••••••••] │
│                                             │
│ Path Prefix (optional): [eigen-backups/  ] │
│                                             │
│                    [Test Connection] [Save] │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Backup Manager                              │
├─────────────────────────────────────────────┤
│                                             │
│ Local Folder: [/home/user/Photos/       📁] │
│ S3 Destination: [photos/2025/           🪣] │
│                                             │
│ Options:                                    │
│ ☑ Delete files in S3 not in local folder   │
│ ☐ Dry run (preview changes)                │
│                                             │
│ Exclude Patterns:                           │
│ [*.tmp, .DS_Store, Thumbs.db             ] │
│                                             │
│ [Start Backup]                              │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━ 45% (234 MB / 520 MB) │
│ Uploading: IMG_2024_0315.jpg               │
└─────────────────────────────────────────────┘
```

---

## Future Enhancements

### Auto-Backup Scheduling
- [ ] Cron-like schedule configuration
- [ ] Background backup jobs
- [ ] Notification on backup completion

### Advanced Features
- [ ] Glacier/Deep Archive tier support (cost optimization)
- [ ] Object versioning management
- [ ] Server-side encryption (SSE-S3, SSE-KMS)
- [ ] Lifecycle policies
- [ ] Bandwidth throttling

### Multi-Profile Support
- [ ] Multiple S3 profiles/accounts
- [ ] Different buckets for different folders
- [ ] Profile switching in UI

---

## Testing Strategy

### Unit Tests
- S3Config validation
- Error mapping
- Progress calculation

### Integration Tests
- Upload/download with MinIO (Docker container)
- Sync operations with test data
- Credential storage/retrieval

### Manual Testing Checklist
- [ ] AWS S3 (official service)
- [ ] Backblaze B2 (cost-effective alternative)
- [ ] Wasabi (S3-compatible)
- [ ] MinIO (self-hosted)
- [ ] Large file uploads (>100MB)
- [ ] Folder with 1000+ files
- [ ] Network interruption recovery
- [ ] Invalid credentials handling

---

## References

- [AWS SDK for Rust Documentation](https://docs.aws.amazon.com/sdk-for-rust/)
- [aws-sdk-s3 Crate Documentation](https://docs.rs/aws-sdk-s3/)
- [S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)
- [Building with AWS S3 using Rust | Shuttle](https://www.shuttle.dev/blog/2024/04/17/using-aws-s3-rust)
- [Keyring Crate Documentation](https://docs.rs/keyring/)
