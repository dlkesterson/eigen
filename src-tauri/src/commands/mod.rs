//! Tauri command handlers for the Eigen Syncthing manager.
//!
//! This module is organized by domain:
//! - `system`: Lifecycle, ping, status, restart
//! - `config`: Configuration, options, connections
//! - `folders`: Folder management operations
//! - `devices`: Device management operations
//! - `files`: File browser, conflicts, versions, ignores
//! - `events`: Events, logs, tray updates
//! - `pending`: Pending device/folder requests

// Expose submodules publicly so Tauri's generate_handler! macro can access
// the __cmd__ prefixed items it generates
pub mod config;
pub mod devices;
pub mod events;
pub mod files;
pub mod folders;
pub mod pending;
pub mod system;

// Re-export all commands for use in lib.rs invoke_handler

// System commands
pub use system::{
    check_syncthing_installation, get_api_config, get_system_status, ping_syncthing,
    restart_syncthing, start_syncthing_sidecar, stop_syncthing_sidecar, SyncthingInfo,
};

// Config commands
pub use config::{get_config, get_connections, update_options};

// Folder commands
pub use folders::{
    add_folder, add_folder_advanced, get_folder_config, get_folder_status, pause_folder,
    remove_folder, rescan_folder, resume_folder, share_folder, unshare_folder,
    update_folder_config,
};

// Device commands
pub use devices::{
    add_device, add_device_advanced, get_device_config, get_device_id, pause_device, remove_device,
    resume_device, update_device_config,
};

// File commands (browser, conflicts, versions, ignores)
pub use files::{
    browse_folder, browse_folder_recursive, browse_versions, cleanup_versions,
    cleanup_versions_older_than, delete_conflict_file, get_folder_ignores,
    get_version_storage_info, open_folder_in_explorer, resolve_conflict_keep_conflict,
    restore_version, scan_for_conflicts, set_folder_ignores, CleanupResult, VersionStorageInfo,
};

// Event commands (events, logs, tray)
pub use events::{get_events, get_system_logs, update_tray_status};

// Pending request commands
pub use pending::{
    accept_pending_device, accept_pending_folder, dismiss_pending_device, dismiss_pending_folder,
    get_pending_devices, get_pending_folders, get_pending_requests, FolderType, PendingDevice,
    PendingFolder, PendingRequests, VersioningConfig, VersioningType,
};
