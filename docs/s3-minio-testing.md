# S3 Backend Testing with MinIO

**Created:** 2025-12-25
**Purpose:** Complete testing guide for S3 backend using local MinIO server

---

## Prerequisites

- Docker installed and running
- Eigen built and ready (`pnpm tauri dev`)
- MinIO credentials: `minioadmin` / `minioadmin` (default)

---

## Step 1: Start MinIO Server

Run MinIO in Docker:

```bash
docker run -d \
  --name minio-test \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"
```

**Verify it's running:**
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001 (login: minioadmin/minioadmin)

---

## Step 2: Create Test Bucket

Open MinIO Console at http://localhost:9001 and:

1. Log in with `minioadmin` / `minioadmin`
2. Click "Buckets" → "Create Bucket"
3. Name: `test-bucket`
4. Click "Create Bucket"

**Or use the MinIO client:**

```bash
# Install mc (MinIO client)
docker exec -it minio-test mc alias set local http://localhost:9000 minioadmin minioadmin

# Create bucket
docker exec -it minio-test mc mb local/test-bucket
```

---

## Step 3: Start Eigen in Dev Mode

```bash
cd /home/linuxdesktop/Code/eigen
pnpm tauri dev
```

Wait for the app to launch.

---

## Step 4: Test Phase 1 - Configuration & Connection

Open the browser console in Tauri dev tools (F12) and run:

```javascript
// Import S3 commands
const s3 = await import('/src/lib/tauri-commands.ts');

// Test 1: Get initial config (should be unconfigured)
console.log('\n=== Test 1: Get Initial Config ===');
const initialConfig = await s3.getS3Config();
console.log('Initial config:', initialConfig);
// Expected: { is_configured: false, ... }

// Test 2: Configure S3 with MinIO
console.log('\n=== Test 2: Configure S3 ===');
try {
  await s3.configureS3(
    'http://localhost:9000',  // MinIO endpoint
    'us-east-1',              // Region (any value works for MinIO)
    'test-bucket',            // Bucket name
    'minioadmin',             // Access key
    'minioadmin',             // Secret key
    'eigen-backups/'          // Path prefix
  );
  console.log('✅ S3 configured successfully!');
} catch (error) {
  console.error('❌ Configuration failed:', error);
}

// Test 3: Verify configuration
console.log('\n=== Test 3: Verify Configuration ===');
const config = await s3.getS3Config();
console.log('Config after setup:', config);
// Expected: { is_configured: true, endpoint: 'http://localhost:9000', ... }

// Test 4: Test connection
console.log('\n=== Test 4: Test Connection ===');
const status = await s3.testS3Connection();
console.log('Connection status:', status);
// Expected: { connected: true, bucket_accessible: true, error_message: null }
```

**Expected Results:**
- ✅ Configuration succeeds
- ✅ Connection test shows `connected: true, bucket_accessible: true`

---

## Step 5: Test Phase 2 - File Operations

### Create Test Files

First, create some test files:

```bash
# Create test directory and files
mkdir -p /tmp/s3-test
echo "Hello from file 1" > /tmp/s3-test/test1.txt
echo "Hello from file 2" > /tmp/s3-test/test2.txt
echo "This is a larger file with more content" > /tmp/s3-test/large.txt
```

### Test Upload

```javascript
const s3 = await import('/src/lib/tauri-commands.ts');

// Test 5: Upload a single file
console.log('\n=== Test 5: Upload Single File ===');
try {
  const result = await s3.uploadFileToS3('/tmp/s3-test/test1.txt');
  console.log('✅ Upload result:', result);
  // Expected: { key: 'eigen-backups/test1.txt', size: ..., ... }
} catch (error) {
  console.error('❌ Upload failed:', error);
}

// Test 6: Upload with custom S3 key
console.log('\n=== Test 6: Upload with Custom Key ===');
try {
  const result = await s3.uploadFileToS3('/tmp/s3-test/test2.txt', 'custom/path/file2.txt');
  console.log('✅ Upload result:', result);
  // Expected: { key: 'eigen-backups/custom/path/file2.txt', ... }
} catch (error) {
  console.error('❌ Upload failed:', error);
}
```

### Test List

```javascript
// Test 7: List all objects
console.log('\n=== Test 7: List All Objects ===');
try {
  const list = await s3.listS3Objects();
  console.log('✅ Objects in bucket:', list.objects.length);
  console.log('Objects:', list.objects);
  // Expected: Array of uploaded files
} catch (error) {
  console.error('❌ List failed:', error);
}

// Test 8: List with prefix filter
console.log('\n=== Test 8: List with Prefix ===');
try {
  const list = await s3.listS3Objects('eigen-backups/custom/');
  console.log('✅ Filtered objects:', list.objects);
  // Expected: Only files under 'custom/' prefix
} catch (error) {
  console.error('❌ List failed:', error);
}
```

### Test Download

```javascript
// Test 9: Download a file
console.log('\n=== Test 9: Download File ===');
try {
  await s3.downloadFileFromS3('test1.txt', '/tmp/s3-test/downloaded-test1.txt');
  console.log('✅ Download successful!');

  // Verify the file
  const fs = require('fs');
  const content = fs.readFileSync('/tmp/s3-test/downloaded-test1.txt', 'utf8');
  console.log('Downloaded content:', content);
  // Expected: "Hello from file 1"
} catch (error) {
  console.error('❌ Download failed:', error);
}
```

### Test Delete

```javascript
// Test 10: Delete a file
console.log('\n=== Test 10: Delete File ===');
try {
  await s3.deleteFileFromS3('custom/path/file2.txt');
  console.log('✅ Delete successful!');

  // Verify deletion
  const list = await s3.listS3Objects();
  const stillExists = list.objects.find(obj => obj.key.includes('file2.txt'));
  console.log('File still exists?', !!stillExists);
  // Expected: false
} catch (error) {
  console.error('❌ Delete failed:', error);
}
```

**Expected Results:**
- ✅ All uploads succeed and return S3Object metadata
- ✅ List shows uploaded files
- ✅ Download retrieves correct content
- ✅ Delete removes files from S3

---

## Step 6: Test Phase 3 - Folder Sync

### Create Test Folder Structure

```bash
# Create a test folder with subdirectories
mkdir -p /tmp/sync-test/docs
mkdir -p /tmp/sync-test/images
mkdir -p /tmp/sync-test/.git  # Should be excluded

echo "Document 1" > /tmp/sync-test/docs/doc1.txt
echo "Document 2" > /tmp/sync-test/docs/doc2.md
echo "Image metadata" > /tmp/sync-test/images/photo.jpg
echo "README content" > /tmp/sync-test/README.md
echo "Temp file" > /tmp/sync-test/temp.tmp  # Should be excluded
echo "Git data" > /tmp/sync-test/.git/config  # Should be excluded

# Create a larger file
dd if=/dev/zero of=/tmp/sync-test/largefile.bin bs=1M count=5
```

### Test Folder Sync

```javascript
const s3 = await import('/src/lib/tauri-commands.ts');
const { listen } = await import('@tauri-apps/api/event');

// Test 11: Sync folder with exclude patterns
console.log('\n=== Test 11: Folder Sync with Excludes ===');

// Listen for sync progress events
const unlisten = await listen('s3-folder-sync-progress', (event) => {
  const info = event.payload;
  console.log(`📁 Syncing: ${info.local_path} (${info.status})`);
});

try {
  const result = await s3.syncFolderToS3(
    '/tmp/sync-test',
    'sync-test/',
    ['*.tmp', '.git/**']  // Exclude temp files and .git folder
  );

  console.log('\n✅ Folder sync complete!');
  console.log(`Uploaded: ${result.uploaded} files`);
  console.log(`Skipped: ${result.skipped} files`);
  console.log(`Failed: ${result.failed} files`);
  console.log(`Bytes uploaded: ${result.bytes_uploaded}`);

  if (result.errors.length > 0) {
    console.log('Errors:', result.errors);
  }

  // Expected:
  // - 5 files uploaded (doc1.txt, doc2.md, photo.jpg, README.md, largefile.bin)
  // - 0 skipped (first sync)
  // - temp.tmp and .git/config excluded

} catch (error) {
  console.error('❌ Sync failed:', error);
} finally {
  unlisten();
}

// Test 12: Re-sync (should skip unchanged files)
console.log('\n=== Test 12: Re-sync (Incremental) ===');
try {
  const result = await s3.syncFolderToS3(
    '/tmp/sync-test',
    'sync-test/',
    ['*.tmp', '.git/**']
  );

  console.log('\n✅ Re-sync complete!');
  console.log(`Uploaded: ${result.uploaded} files`);
  console.log(`Skipped: ${result.skipped} files`);

  // Expected:
  // - 0 uploaded (all unchanged)
  // - 5 skipped (all files already in S3)

} catch (error) {
  console.error('❌ Re-sync failed:', error);
}

// Test 13: Modify a file and re-sync
console.log('\n=== Test 13: Sync Modified File ===');

// Modify a file (in a separate bash terminal)
// echo "Modified content" > /tmp/sync-test/README.md

try {
  const result = await s3.syncFolderToS3(
    '/tmp/sync-test',
    'sync-test/',
    ['*.tmp', '.git/**']
  );

  console.log('\n✅ Modified file sync complete!');
  console.log(`Uploaded: ${result.uploaded} files`);
  console.log(`Skipped: ${result.skipped} files`);

  // Expected:
  // - 1 uploaded (README.md changed size)
  // - 4 skipped (other files unchanged)

} catch (error) {
  console.error('❌ Modified sync failed:', error);
}
```

**Expected Results:**
- ✅ First sync uploads all non-excluded files
- ✅ Second sync skips all unchanged files (incremental works!)
- ✅ Modified file sync only uploads changed file
- ✅ Progress events emitted during sync

---

## Step 7: Verify in MinIO Console

1. Open http://localhost:9001
2. Navigate to Buckets → test-bucket
3. Browse to `eigen-backups/` prefix
4. Verify all uploaded files are present:
   - `test1.txt`
   - `sync-test/docs/doc1.txt`
   - `sync-test/docs/doc2.md`
   - `sync-test/images/photo.jpg`
   - `sync-test/README.md`
   - `sync-test/largefile.bin`
5. Verify excluded files are NOT present:
   - ❌ `sync-test/temp.tmp`
   - ❌ `sync-test/.git/config`

---

## Complete Test Suite Script

Run all tests in sequence:

```javascript
// Copy-paste this entire script into browser console

const s3 = await import('/src/lib/tauri-commands.ts');

async function runAllTests() {
  console.clear();
  console.log('🧪 Starting S3 Backend Test Suite\n');

  let passedTests = 0;
  let failedTests = 0;

  // Helper function
  const test = async (name, fn) => {
    console.log(`\n▶️  ${name}`);
    try {
      await fn();
      console.log(`✅ PASSED: ${name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ FAILED: ${name}`, error);
      failedTests++;
    }
  };

  // Phase 1 Tests
  await test('Get initial config', async () => {
    const config = await s3.getS3Config();
    if (config.is_configured) throw new Error('Should be unconfigured');
  });

  await test('Configure S3', async () => {
    await s3.configureS3(
      'http://localhost:9000',
      'us-east-1',
      'test-bucket',
      'minioadmin',
      'minioadmin',
      'eigen-backups/'
    );
  });

  await test('Verify configuration', async () => {
    const config = await s3.getS3Config();
    if (!config.is_configured) throw new Error('Should be configured');
    if (config.endpoint !== 'http://localhost:9000') throw new Error('Wrong endpoint');
  });

  await test('Test connection', async () => {
    const status = await s3.testS3Connection();
    if (!status.connected || !status.bucket_accessible) {
      throw new Error('Connection failed');
    }
  });

  // Phase 2 Tests
  await test('Upload file', async () => {
    const result = await s3.uploadFileToS3('/tmp/s3-test/test1.txt');
    if (!result.key.includes('test1.txt')) throw new Error('Wrong key');
  });

  await test('List objects', async () => {
    const list = await s3.listS3Objects();
    if (list.objects.length === 0) throw new Error('No objects found');
  });

  await test('Download file', async () => {
    await s3.downloadFileFromS3('test1.txt', '/tmp/s3-test/downloaded.txt');
  });

  // Phase 3 Tests
  await test('Sync folder', async () => {
    const result = await s3.syncFolderToS3(
      '/tmp/sync-test',
      'sync-test/',
      ['*.tmp', '.git/**']
    );
    if (result.uploaded === 0) throw new Error('No files uploaded');
  });

  await test('Re-sync (incremental)', async () => {
    const result = await s3.syncFolderToS3(
      '/tmp/sync-test',
      'sync-test/',
      ['*.tmp', '.git/**']
    );
    if (result.skipped === 0) throw new Error('Should skip unchanged files');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log('='.repeat(50));

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! S3 backend is working perfectly!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run the tests
await runAllTests();
```

---

## Cleanup

After testing, stop and remove MinIO:

```bash
docker stop minio-test
docker rm minio-test
```

---

## Troubleshooting

### MinIO not accessible
```bash
# Check if container is running
docker ps | grep minio

# Check logs
docker logs minio-test

# Restart container
docker restart minio-test
```

### Connection refused
- Verify MinIO is running on port 9000
- Check firewall settings
- Ensure endpoint is `http://localhost:9000` (not https)

### Bucket not found
- Create bucket in MinIO console: http://localhost:9001
- Or use: `docker exec -it minio-test mc mb local/test-bucket`

### Files not uploading
- Check MinIO logs: `docker logs minio-test`
- Verify bucket permissions
- Check if path `/tmp/s3-test/` exists and files are readable

---

## Success Criteria

All tests should pass with:
- ✅ Configuration stored securely in keyring
- ✅ Connection test successful
- ✅ File upload/download working
- ✅ Folder sync working with incremental updates
- ✅ Exclude patterns working correctly
- ✅ Progress events emitted
- ✅ All files visible in MinIO console

**Once all tests pass, the S3 backend is production-ready!** 🚀
