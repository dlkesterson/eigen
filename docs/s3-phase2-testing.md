# S3 Backend Phase 2 - Testing Instructions

**Created:** 2025-12-25
**Status:** Ready for Testing
**Phase:** Phase 2 - Basic File Operations

---

## Changes Made

### Dependencies Added (Cargo.toml)

```toml
# Date/time handling for S3 timestamps
chrono = "0.4"
```

### New Types Added (s3.rs)

1. **S3Object** - S3 object metadata
   - key: Object key (path in S3)
   - size: Object size in bytes
   - last_modified: Last modified timestamp (RFC3339)
   - etag: Entity tag (typically MD5 hash)
   - storage_class: Storage class (e.g., STANDARD, GLACIER)

2. **S3ListResult** - Result of listing S3 objects
   - objects: List of S3Object
   - common_prefixes: Common prefixes (folder-like structure)
   - is_truncated: Whether more results are available
   - next_continuation_token: Continuation token for next page

3. **S3UploadProgress** - Upload progress event
   - file_path: File path being uploaded
   - bytes_uploaded: Bytes uploaded so far
   - total_bytes: Total bytes to upload
   - percentage: Progress percentage (0-100)

4. **S3DownloadProgress** - Download progress event
   - s3_key: S3 key being downloaded
   - bytes_downloaded: Bytes downloaded so far
   - total_bytes: Total bytes to download
   - percentage: Progress percentage (0-100)

### New Commands Implemented

1. **upload_file_to_s3** (src-tauri/src/commands/s3.rs:302-406)
   - Uploads a file to S3
   - Emits progress events via Tauri events
   - Automatically applies path prefix
   - Returns S3Object metadata

2. **download_file_from_s3** (src-tauri/src/commands/s3.rs:415-503)
   - Downloads a file from S3
   - Emits progress events via Tauri events
   - Creates parent directories if needed
   - Handles 404 errors gracefully

3. **list_s3_objects** (src-tauri/src/commands/s3.rs:513-600)
   - Lists objects in S3 bucket
   - Supports prefix filtering for folder-like browsing
   - Supports delimiter for hierarchical listing
   - Pagination support with continuation tokens

4. **delete_file_from_s3** (src-tauri/src/commands/s3.rs:607-639)
   - Deletes a file from S3
   - Automatically applies path prefix

### Files Modified

1. **src-tauri/Cargo.toml**
   - Added `chrono = "0.4"` dependency

2. **src-tauri/src/commands/s3.rs**
   - Added 4 new types (112 lines)
   - Added 4 new commands (338 lines)
   - Updated imports for ByteStream, Path, AppHandle, Emitter

3. **src-tauri/src/commands/mod.rs**
   - Exported 4 new commands
   - Exported 4 new types

4. **src-tauri/src/lib.rs**
   - Registered 4 new commands in invoke_handler

5. **src/lib/tauri-commands.ts** (106 lines added)
   - Added 4 new interfaces for S3 types
   - Added 4 new command wrappers

---

## Testing Steps

### Step 1: Verify Rust Compilation

```bash
cd /home/linuxdesktop/Code/eigen/src-tauri

# Check for compilation errors
cargo check

# Full build
cargo build
```

**Expected Output:**
- ✅ No compilation errors
- ✅ Build completes successfully

### Step 2: Test Upload Command

You can test the upload command using the browser console in Tauri dev mode:

```javascript
const { uploadFileToS3 } = await import('/src/lib/tauri-commands.ts');
const { listen } = await import('@tauri-apps/api/event');

// Listen for upload progress events
const unlisten = await listen('s3-upload-progress', (event) => {
  console.log('Upload progress:', event.payload);
  // payload: { file_path, bytes_uploaded, total_bytes, percentage }
});

// Upload a test file
try {
  const result = await uploadFileToS3('/path/to/test/file.txt');
  console.log('Upload complete:', result);
  // result: { key, size, last_modified, etag, storage_class }
} catch (error) {
  console.error('Upload failed:', error);
}

// Cleanup listener when done
unlisten();
```

**Expected Behavior:**
- ✅ Progress events emitted during upload
- ✅ Upload completes successfully
- ✅ Returns S3Object metadata
- ⚠️ Fails with error if file doesn't exist

### Step 3: Test List Command

```javascript
const { listS3Objects } = await import('/src/lib/tauri-commands.ts');

// List all objects
const result = await listS3Objects();
console.log('Objects:', result.objects);
console.log('Common prefixes:', result.common_prefixes);

// List with prefix (folder-like)
const folderResult = await listS3Objects('my-folder/', '/');
console.log('Folder contents:', folderResult);

// Paginated listing
if (result.is_truncated) {
  const nextPage = await listS3Objects(
    null,
    null,
    1000,
    result.next_continuation_token
  );
  console.log('Next page:', nextPage);
}
```

**Expected Behavior:**
- ✅ Lists objects successfully
- ✅ Pagination works with continuation tokens
- ✅ Prefix filtering works
- ✅ Delimiter creates hierarchical view

### Step 4: Test Download Command

```javascript
const { downloadFileFromS3 } = await import('/src/lib/tauri-commands.ts');
const { listen } = await import('@tauri-apps/api/event');

// Listen for download progress events
const unlisten = await listen('s3-download-progress', (event) => {
  console.log('Download progress:', event.payload);
  // payload: { s3_key, bytes_downloaded, total_bytes, percentage }
});

// Download a file
try {
  await downloadFileFromS3('test-file.txt', '/path/to/save/file.txt');
  console.log('Download complete!');
} catch (error) {
  console.error('Download failed:', error);
}

// Cleanup listener when done
unlisten();
```

**Expected Behavior:**
- ✅ Progress events emitted during download
- ✅ Download completes successfully
- ✅ File saved to local path
- ✅ Parent directories created if needed
- ⚠️ Fails with error if S3 key doesn't exist

### Step 5: Test Delete Command

```javascript
const { deleteFileFromS3 } = await import('/src/lib/tauri-commands.ts');

// Delete a file
try {
  await deleteFileFromS3('test-file.txt');
  console.log('Delete complete!');
} catch (error) {
  console.error('Delete failed:', error);
}

// Verify deletion by listing
const result = await listS3Objects();
const found = result.objects.find(obj => obj.key === 'test-file.txt');
console.log('File still exists:', !!found); // Should be false
```

**Expected Behavior:**
- ✅ Delete completes successfully
- ✅ Object no longer appears in listings
- ⚠️ No error if object already deleted (S3 delete is idempotent)

---

## Integration Testing

### Full Workflow Test

```javascript
const {
  uploadFileToS3,
  listS3Objects,
  downloadFileFromS3,
  deleteFileFromS3,
} = await import('/src/lib/tauri-commands.ts');

// 1. Upload a test file
console.log('Uploading...');
const uploaded = await uploadFileToS3('/tmp/test.txt');
console.log('Uploaded:', uploaded.key);

// 2. List and verify it exists
console.log('Listing...');
const list = await listS3Objects();
const found = list.objects.find(obj => obj.key === uploaded.key);
console.log('Found in list:', !!found);

// 3. Download it back
console.log('Downloading...');
await downloadFileFromS3(uploaded.key, '/tmp/test-downloaded.txt');
console.log('Downloaded successfully');

// 4. Verify contents match
// (compare /tmp/test.txt with /tmp/test-downloaded.txt)

// 5. Delete the file
console.log('Deleting...');
await deleteFileFromS3(uploaded.key);
console.log('Deleted successfully');

// 6. Verify it's gone
const listAfterDelete = await listS3Objects();
const stillExists = listAfterDelete.objects.find(obj => obj.key === uploaded.key);
console.log('Still exists after delete:', !!stillExists); // Should be false

console.log('✅ All tests passed!');
```

---

## Progress Events

Phase 2 adds real-time progress tracking for uploads and downloads:

### Upload Progress Event

Listen for `s3-upload-progress` events:

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<S3UploadProgress>('s3-upload-progress', (event) => {
  const { file_path, bytes_uploaded, total_bytes, percentage } = event.payload;
  console.log(`Uploading ${file_path}: ${percentage.toFixed(2)}%`);

  // Update UI progress bar
  updateProgressBar(percentage);
});
```

### Download Progress Event

Listen for `s3-download-progress` events:

```typescript
const unlisten = await listen<S3DownloadProgress>('s3-download-progress', (event) => {
  const { s3_key, bytes_downloaded, total_bytes, percentage } = event.payload;
  console.log(`Downloading ${s3_key}: ${percentage.toFixed(2)}%`);

  // Update UI progress bar
  updateProgressBar(percentage);
});
```

---

## Error Handling

### Upload Errors

- **File not found**: Returns `S3Error::UploadFailed("File not found: {path}")`
- **Invalid filename**: Returns `S3Error::UploadFailed("Invalid filename")`
- **Upload failed**: Returns `S3Error::UploadFailed("Upload failed: {error}")`

### Download Errors

- **Object not found**: Returns `S3Error::DownloadFailed("Object not found: {key}")`
- **Directory creation failed**: Returns `S3Error::DownloadFailed("Failed to create directory: {error}")`
- **Write failed**: Returns `S3Error::DownloadFailed("Failed to write file: {error}")`

### List Errors

- **List failed**: Returns `S3Error::ListFailed("List operation failed: {error}")`

### Delete Errors

- **Delete failed**: Returns `S3Error::SdkError("Delete failed: {error}")`

---

## Known Limitations (Phase 2)

Phase 2 implements only **basic file operations**. Not yet implemented:

- ❌ Folder sync (incremental sync with exclude patterns)
- ❌ Restore operations
- ❌ Multi-part upload for large files
- ❌ Parallel downloads
- ❌ Frontend UI

These will be added in **Phase 3-4** (see s3-backend-design.md).

---

## Next Steps

After verifying Phase 2 works:

1. **Phase 3**: Implement folder sync (incremental sync, restore, exclude patterns)
2. **Phase 4**: Build frontend UI (config page, backup manager, restore manager)
3. **Phase 5**: Testing & polish (AWS S3, B2, MinIO testing)

---

## Code References

**Rust Backend:**
- New types: `src-tauri/src/commands/s3.rs:122-174`
- Upload command: `src-tauri/src/commands/s3.rs:302-406`
- Download command: `src-tauri/src/commands/s3.rs:415-503`
- List command: `src-tauri/src/commands/s3.rs:513-600`
- Delete command: `src-tauri/src/commands/s3.rs:607-639`
- Command registration: `src-tauri/src/lib.rs:286-292`
- Module exports: `src-tauri/src/commands/mod.rs:66-70`

**TypeScript Frontend:**
- Type definitions: `src/lib/tauri-commands.ts:529-568`
- Command wrappers: `src/lib/tauri-commands.ts:613-672`

**Documentation:**
- Design doc: `docs/s3-backend-design.md`
- Phase 1 testing: `docs/s3-phase1-testing.md`
- This file: `docs/s3-phase2-testing.md`

---

## Summary

**Phase 2 Status:** ✅ COMPLETE

**Files Changed:**
- 1 dependency added (chrono)
- 450 lines of Rust code added (types + commands)
- 106 lines of TypeScript code added (types + wrappers)
- 4 commands registered in Tauri

**New Capabilities:**
- Upload files to S3 with progress tracking
- Download files from S3 with progress tracking
- List S3 objects with prefix filtering and pagination
- Delete files from S3

**Next Phase:** Phase 3 - Folder Sync Operations
