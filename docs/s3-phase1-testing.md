# S3 Backend Phase 1 - Testing Instructions

**Created:** 2025-12-25
**Status:** Ready for Testing
**Phase:** Phase 1 - Core Infrastructure

---

## Changes Made

### Dependencies Added (Cargo.toml)

```toml
# AWS S3 SDK for archival backups
aws-config = { version = "1", features = ["behavior-version-latest"] }
aws-sdk-s3 = "1"
aws-credential-types = "1"

# Secure credential storage
keyring = "2"

# Glob pattern matching for exclude patterns
globset = "0.4"
```

### Files Created

1. **src-tauri/src/commands/s3.rs** (334 lines)
   - S3Config, S3State, S3Error types
   - configure_s3, get_s3_config, test_s3_connection commands
   - Keyring integration for secure credential storage
   - S3 client creation with custom endpoint support

### Files Modified

1. **src-tauri/src/commands/mod.rs**
   - Added `pub mod s3;`
   - Exported S3 types and commands

2. **src-tauri/src/lib.rs**
   - Added `.manage(commands::S3State::default())`
   - Registered 3 S3 commands in invoke_handler

3. **src/lib/tauri-commands.ts** (68 lines added)
   - Added S3ConfigPublic and S3ConnectionStatus interfaces
   - Added configureS3, getS3Config, testS3Connection wrappers

---

## Testing Steps

### Step 1: Verify Rust Compilation

```bash
cd /home/linuxdesktop/Code/eigen/src-tauri

# Check for compilation errors
cargo check

# Run clippy for warnings
cargo clippy --all-targets --all-features

# Full build (downloads dependencies, ~5-10 min first time)
cargo build
```

**Expected Output:**
- ✅ No compilation errors
- ⚠️ Possible clippy warnings (safe to ignore for now)
- ✅ Build completes successfully

**Common Issues:**
- **"cannot find crate"**: Run `cargo update` and try again
- **Network timeout**: Retry `cargo build`, dependencies are large (~100+ crates)
- **Keyring errors on Linux**: May need `libdbus-1-dev` package

### Step 2: Verify TypeScript Types

```bash
cd /home/linuxdesktop/Code/eigen

# Type check frontend
pnpm type-check
```

**Expected Output:**
- ✅ No TypeScript errors
- S3 types correctly imported and exported

### Step 3: Test Development Build

```bash
# Start Tauri in development mode
pnpm tauri dev
```

**Expected Behavior:**
- ✅ App launches without errors
- ✅ No console errors related to S3 commands
- ✅ Commands are registered (check Tauri devtools)

### Step 4: Test S3 Commands (Manual)

You can test the commands using the browser console in Tauri dev mode:

```javascript
// Import the commands
const { configureS3, getS3Config, testS3Connection } = await import('/src/lib/tauri-commands.ts');

// Test 1: Get config (should return unconfigured state)
const config = await getS3Config();
console.log('Config:', config);
// Expected: { is_configured: false, ... }

// Test 2: Configure S3 (use test credentials)
// WARNING: Use test/dummy credentials only!
await configureS3(
  'https://s3.amazonaws.com',  // or MinIO: 'http://localhost:9000'
  'us-east-1',
  'test-bucket',
  'TEST_ACCESS_KEY',
  'TEST_SECRET_KEY',
  'eigen-backups/'
);
// Expected: Success (if credentials valid) or error (if invalid)

// Test 3: Test connection
const status = await testS3Connection();
console.log('Connection status:', status);
// Expected: { connected: true/false, bucket_accessible: true/false, ... }
```

---

## Fixes Applied

### Issue 1: Incorrect Credentials API
**Problem:** Using `aws_sdk_s3::config::Credentials` instead of `aws_credential_types::Credentials`
**Fix:** Updated import and added `aws-credential-types` dependency

### Issue 2: SDK Config Pattern
**Problem:** Not following AWS SDK for Rust best practices
**Fix:** Changed to use `aws_config::SdkConfig::builder()` → `aws_sdk_s3::config::Builder::from()`

### Issue 3: Import Organization
**Problem:** Grouped imports in `use aws_sdk_s3::{config::Region, Client}`
**Fix:** Separated imports for clarity

---

## Verification Checklist

Before marking Phase 1 as complete:

- [ ] `cargo check` passes without errors
- [ ] `cargo clippy` has no critical warnings
- [ ] `cargo build` completes successfully
- [ ] `pnpm type-check` passes
- [ ] `pnpm tauri dev` launches without errors
- [ ] S3 commands are registered in Tauri
- [ ] `getS3Config()` returns unconfigured state by default
- [ ] Keyring storage works (test on your OS)

---

## Known Limitations (Phase 1)

Phase 1 implements only **configuration and connection testing**. Not yet implemented:

- ❌ File upload/download
- ❌ List S3 objects
- ❌ Folder sync
- ❌ Progress tracking
- ❌ Frontend UI

These will be added in **Phase 2-4** (see s3-backend-design.md).

---

## Next Steps

After verifying Phase 1 works:

1. **Phase 2**: Implement basic file operations (upload, download, list, delete)
2. **Phase 3**: Implement folder sync (incremental sync, restore, exclude patterns)
3. **Phase 4**: Build frontend UI (config page, backup manager, restore manager)
4. **Phase 5**: Testing & polish (AWS S3, B2, MinIO testing)

---

## Troubleshooting

### Keyring Errors on Linux

If you get keyring errors on Linux, install required dependencies:

```bash
# Debian/Ubuntu
sudo apt install libdbus-1-dev pkg-config

# Fedora
sudo dnf install dbus-devel pkgconfig
```

Then rebuild:
```bash
cd src-tauri
cargo clean
cargo build
```

### AWS SDK Dependency Download Slow

The AWS SDK has 100+ transitive dependencies. First build can take 5-10 minutes. This is normal. Subsequent builds will be much faster due to caching.

### Custom Endpoint Not Working

For S3-compatible services (MinIO, B2, Wasabi), make sure:
1. Endpoint doesn't contain "s3.amazonaws.com"
2. `force_path_style(true)` is set (already implemented)
3. Endpoint uses correct protocol (http vs https)

---

## Testing with MinIO (Local S3)

For local testing without AWS credentials:

```bash
# Run MinIO in Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"

# Then configure Eigen S3 with:
# Endpoint: http://localhost:9000
# Region: us-east-1 (any value works)
# Bucket: test-bucket (create in MinIO console first)
# Access Key: minioadmin
# Secret Key: minioadmin
```

---

## Code References

**Rust Backend:**
- Main implementation: `src-tauri/src/commands/s3.rs:1-334`
- Command registration: `src-tauri/src/lib.rs:119,286-288`
- Module exports: `src-tauri/src/commands/mod.rs:21,66-69`

**TypeScript Frontend:**
- Type definitions: `src/lib/tauri-commands.ts:511-527`
- Command wrappers: `src/lib/tauri-commands.ts:538-570`

**Documentation:**
- Design doc: `docs/s3-backend-design.md`
- This file: `docs/s3-phase1-testing.md`
