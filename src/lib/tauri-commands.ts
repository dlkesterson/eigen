/**
 * Tauri Command Registry
 *
 * This file serves as the single source of truth for all Tauri command names.
 * It provides type-safe wrappers around `invoke()` to prevent command name mismatches
 * between the TypeScript frontend and Rust backend.
 *
 * IMPORTANT: Command names here MUST match the function names in src-tauri/src/commands.rs
 * and the registrations in src-tauri/src/lib.rs
 *
 * When adding a new command:
 * 1. Add the Rust function in src-tauri/src/commands.rs
 * 2. Register it in src-tauri/src/lib.rs invoke_handler
 * 3. Add typed wrapper here
 * 4. Use the wrapper in your hooks/components
 */

import { invoke } from '@tauri-apps/api/core';

// =============================================================================
// Type Definitions for Command Responses
// =============================================================================

export interface SyncthingInfo {
  installed: boolean;
  version: string | null;
  path: string | null;
  bundled: boolean;
}

export interface PingResponse {
  ping: string;
}

// =============================================================================
// Syncthing Lifecycle Commands
// =============================================================================

/**
 * Check if Syncthing is installed and get version info
 * @returns Installation status and version information
 */
export async function checkSyncthingInstallation(): Promise<SyncthingInfo> {
  return invoke<SyncthingInfo>('check_syncthing_installation');
}

/**
 * Start the bundled Syncthing sidecar process
 * @returns Success message
 */
export async function startSyncthingSidecar(): Promise<string> {
  return invoke<string>('start_syncthing_sidecar');
}

/**
 * Stop the Syncthing sidecar process
 * @returns Success message
 */
export async function stopSyncthingSidecar(): Promise<string> {
  return invoke<string>('stop_syncthing_sidecar');
}

/**
 * Ping Syncthing to check if it's responding
 * @returns Ping response with { ping: 'pong' } if successful
 */
export async function pingSyncthing(): Promise<PingResponse> {
  return invoke<PingResponse>('ping_syncthing');
}

/**
 * Restart the Syncthing daemon
 */
export async function restartSyncthing(): Promise<void> {
  return invoke<void>('restart_syncthing');
}

// =============================================================================
// System Status Commands
// =============================================================================

/**
 * Get Syncthing system status
 */
export async function getSystemStatus(): Promise<unknown> {
  return invoke('get_system_status');
}

/**
 * Get active connections to other devices
 */
export async function getConnections(): Promise<unknown> {
  return invoke('get_connections');
}

/**
 * Get full Syncthing configuration
 */
export async function getConfig(): Promise<unknown> {
  return invoke('get_config');
}

/**
 * Update global Syncthing options
 */
export async function updateOptions(options: Record<string, unknown>): Promise<void> {
  return invoke('update_options', { options });
}

/**
 * Get the current API configuration (for debugging)
 */
export async function getApiConfig(): Promise<[string, number]> {
  return invoke('get_api_config');
}

// =============================================================================
// Device Commands
// =============================================================================

/**
 * Get this device's ID
 */
export async function getDeviceId(): Promise<string> {
  return invoke('get_device_id');
}

/**
 * Add a new device to Syncthing
 */
export async function addDevice(deviceId: string, name: string): Promise<void> {
  return invoke('add_device', { deviceId, name });
}

/**
 * Add device with advanced options
 */
export async function addDeviceAdvanced(params: {
  deviceId: string;
  name: string;
  addresses?: string[];
  compression?: string;
  introducer?: boolean;
  autoAcceptFolders?: boolean;
}): Promise<void> {
  return invoke('add_device_advanced', params);
}

/**
 * Remove a device from Syncthing
 */
export async function removeDevice(deviceId: string): Promise<void> {
  return invoke('remove_device', { deviceId });
}

/**
 * Pause a device
 */
export async function pauseDevice(deviceId: string): Promise<void> {
  return invoke('pause_device', { deviceId });
}

/**
 * Resume a device
 */
export async function resumeDevice(deviceId: string): Promise<void> {
  return invoke('resume_device', { deviceId });
}

/**
 * Get device configuration
 */
export async function getDeviceConfig(deviceId: string): Promise<unknown> {
  return invoke('get_device_config', { deviceId });
}

/**
 * Update device configuration
 */
export async function updateDeviceConfig(
  deviceId: string,
  updates: Record<string, unknown>
): Promise<void> {
  return invoke('update_device_config', { deviceId, updates });
}

// =============================================================================
// Folder Commands
// =============================================================================

/**
 * Get folder status
 */
export async function getFolderStatus(folderId: string): Promise<unknown> {
  return invoke('get_folder_status', { folderId });
}

/**
 * Pause a folder
 */
export async function pauseFolder(folderId: string): Promise<void> {
  return invoke('pause_folder', { folderId });
}

/**
 * Resume a folder
 */
export async function resumeFolder(folderId: string): Promise<void> {
  return invoke('resume_folder', { folderId });
}

/**
 * Force rescan of a folder
 */
export async function rescanFolder(folderId: string): Promise<void> {
  return invoke('rescan_folder', { folderId });
}

/**
 * Add a new folder to Syncthing
 */
export async function addFolder(
  folderId: string,
  folderLabel: string,
  folderPath: string
): Promise<void> {
  return invoke('add_folder', { folderId, folderLabel, folderPath });
}

/**
 * Add a folder with advanced configuration options
 */
export async function addFolderAdvanced(params: {
  folderId: string;
  label: string;
  path: string;
  folderType?: string;
  rescanInterval?: number;
  fsWatcherEnabled?: boolean;
  ignorePerms?: boolean;
  autoNormalize?: boolean;
}): Promise<void> {
  return invoke('add_folder_advanced', params);
}

/**
 * Remove a folder from Syncthing
 */
export async function removeFolder(folderId: string): Promise<void> {
  return invoke('remove_folder', { folderId });
}

/**
 * Get folder configuration
 */
export async function getFolderConfig(folderId: string): Promise<unknown> {
  return invoke('get_folder_config', { folderId });
}

/**
 * Update folder configuration
 */
export async function updateFolderConfig(
  folderId: string,
  updates: Record<string, unknown>
): Promise<void> {
  return invoke('update_folder_config', { folderId, updates });
}

/**
 * Share a folder with a specific device
 */
export async function shareFolder(folderId: string, deviceId: string): Promise<void> {
  return invoke('share_folder', { folderId, deviceId });
}

/**
 * Unshare a folder from a specific device
 */
export async function unshareFolder(folderId: string, deviceId: string): Promise<void> {
  return invoke('unshare_folder', { folderId, deviceId });
}

/**
 * Get ignore patterns for a folder
 */
export async function getFolderIgnores(folderId: string): Promise<unknown> {
  return invoke('get_folder_ignores', { folderId });
}

/**
 * Set ignore patterns for a folder
 */
export async function setFolderIgnores(folderId: string, ignorePatterns: string[]): Promise<void> {
  return invoke('set_folder_ignores', { folderId, ignorePatterns });
}

// =============================================================================
// File Browser Commands
// =============================================================================

/**
 * Open folder in system file explorer
 */
export async function openFolderInExplorer(path: string): Promise<void> {
  return invoke('open_folder_in_explorer', { path });
}

/**
 * Browse folder contents
 */
export async function browseFolder(folderId: string, prefix?: string): Promise<unknown> {
  return invoke('browse_folder', { folderId, prefix });
}

/**
 * Browse folder contents recursively
 */
export async function browseFolderRecursive(folderId: string): Promise<unknown> {
  return invoke('browse_folder_recursive', { folderId });
}

// =============================================================================
// Conflict Resolution Commands
// =============================================================================

/**
 * Scan for conflict files
 */
export async function scanForConflicts(folderId: string): Promise<unknown> {
  return invoke('scan_for_conflicts', { folderId });
}

/**
 * Delete a conflict file
 */
export async function deleteConflictFile(path: string): Promise<void> {
  return invoke('delete_conflict_file', { path });
}

/**
 * Resolve conflict by keeping the conflict version
 */
export async function resolveConflictKeepConflict(
  conflictPath: string,
  originalPath: string
): Promise<void> {
  return invoke('resolve_conflict_keep_conflict', { conflictPath, originalPath });
}

// =============================================================================
// Version History Commands
// =============================================================================

/**
 * Browse file versions
 */
export async function browseVersions(folderId: string, path: string): Promise<unknown> {
  return invoke('browse_versions', { folderId, path });
}

/**
 * Restore a file version
 */
export async function restoreVersion(
  folderId: string,
  path: string,
  versionTime: string
): Promise<void> {
  return invoke('restore_version', { folderId, path, versionTime });
}

// =============================================================================
// Logs & Events Commands
// =============================================================================

/**
 * Get Syncthing logs
 */
export async function getSystemLogs(since?: string): Promise<unknown> {
  return invoke('get_system_logs', { since });
}

/**
 * Get events from Syncthing (for real-time updates)
 */
export async function getEvents(params?: {
  since?: number;
  limit?: number;
  timeout?: number;
}): Promise<unknown> {
  return invoke('get_events', params ?? {});
}

// =============================================================================
// Tray Commands
// =============================================================================

/**
 * Update the system tray status
 */
export async function updateTrayStatus(status: string, tooltip: string): Promise<void> {
  return invoke('update_tray_status', { status, tooltip });
}

// =============================================================================
// Pending Requests Commands
// =============================================================================

/**
 * Pending device connection request
 */
export interface PendingDevice {
  deviceId: string;
  name?: string;
  address?: string;
  time?: string;
}

/**
 * Pending folder share request
 */
export interface PendingFolder {
  folderId: string;
  folderLabel?: string;
  offeredBy: string;
  offeredByName?: string;
  time?: string;
  receiveEncrypted: boolean;
  remoteEncrypted: boolean;
}

/**
 * All pending requests (devices and folders)
 */
export interface PendingRequests {
  devices: PendingDevice[];
  folders: PendingFolder[];
}

/**
 * Get all pending device connection requests
 */
export async function getPendingDevices(): Promise<PendingDevice[]> {
  return invoke<PendingDevice[]>('get_pending_devices');
}

/**
 * Get all pending folder share requests
 */
export async function getPendingFolders(): Promise<PendingFolder[]> {
  return invoke<PendingFolder[]>('get_pending_folders');
}

/**
 * Get all pending requests (devices and folders) in one call
 */
export async function getPendingRequests(): Promise<PendingRequests> {
  return invoke<PendingRequests>('get_pending_requests');
}

/**
 * Accept a pending device connection request
 * @param deviceId - The device ID to accept
 * @param name - Optional name for the device
 */
export async function acceptPendingDevice(deviceId: string, name?: string): Promise<void> {
  return invoke('accept_pending_device', { deviceId, name });
}

/**
 * Dismiss/reject a pending device connection request
 * @param deviceId - The device ID to dismiss
 */
export async function dismissPendingDevice(deviceId: string): Promise<void> {
  return invoke('dismiss_pending_device', { deviceId });
}

/**
 * Accept a pending folder share request
 * @param folderId - The folder ID to accept
 * @param deviceId - The device ID that shared the folder
 * @param folderPath - Local path where the folder will be synced
 * @param folderLabel - Optional label for the folder
 */
export async function acceptPendingFolder(
  folderId: string,
  deviceId: string,
  folderPath: string,
  folderLabel?: string
): Promise<void> {
  return invoke('accept_pending_folder', { folderId, deviceId, folderPath, folderLabel });
}

/**
 * Dismiss/reject a pending folder share request
 * @param folderId - The folder ID to dismiss
 * @param deviceId - The device ID that shared the folder
 */
export async function dismissPendingFolder(folderId: string, deviceId: string): Promise<void> {
  return invoke('dismiss_pending_folder', { folderId, deviceId });
}
