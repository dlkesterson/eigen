/**
 * SyncthingClient Interface - Abstract API for interacting with Syncthing
 *
 * This interface allows switching between different backends:
 * - TauriBridge: Uses Tauri's invoke() for local sidecar
 * - HttpBridge: Direct HTTP calls for remote/web access
 */

import type {
  SystemStatus,
  Connections,
  Config,
  FolderConfig,
  FolderStatus,
  IgnorePatterns,
  SystemLogs,
  SyncthingEvent,
  SyncthingInfo,
  FileEntry,
  AdvancedFolderOptions,
  AdvancedDeviceOptions,
} from './types';

export interface SyncthingClient {
  // ============================================================================
  // System Operations
  // ============================================================================
  system: {
    /** Check if Syncthing is installed */
    checkInstallation: () => Promise<SyncthingInfo>;
    /** Get system status */
    status: () => Promise<SystemStatus>;
    /** Ping the Syncthing API */
    ping: () => Promise<{ ping: string }>;
    /** Get system logs */
    logs: () => Promise<SystemLogs>;
    /** Get connections info */
    connections: () => Promise<Connections>;
    /** Start Syncthing sidecar (only for Tauri bridge) */
    start: () => Promise<string>;
    /** Stop Syncthing sidecar (only for Tauri bridge) */
    stop: () => Promise<string>;
    /** Restart Syncthing */
    restart: () => Promise<void>;
    /** Shutdown Syncthing */
    shutdown: () => Promise<void>;
  };

  // ============================================================================
  // Configuration Operations
  // ============================================================================
  config: {
    /** Get full configuration */
    get: () => Promise<Config>;
    /** Update configuration (patch) */
    patch: (config: Partial<Config>) => Promise<void>;
  };

  // ============================================================================
  // Device Operations
  // ============================================================================
  devices: {
    /** Get this device's ID */
    getLocalId: () => Promise<string>;
    /** Add a new device */
    add: (deviceId: string, name?: string) => Promise<void>;
    /** Add device with advanced options */
    addAdvanced: (options: AdvancedDeviceOptions) => Promise<void>;
    /** Remove a device */
    remove: (deviceId: string) => Promise<void>;
    /** Pause a device */
    pause: (deviceId: string) => Promise<void>;
    /** Resume a device */
    resume: (deviceId: string) => Promise<void>;
    /** Get device stats */
    getStats: () => Promise<Record<string, unknown>>;
  };

  // ============================================================================
  // Folder Operations
  // ============================================================================
  folders: {
    /** Add a new folder */
    add: (folderId: string, folderLabel: string, folderPath: string) => Promise<void>;
    /** Add folder with advanced options */
    addAdvanced: (options: AdvancedFolderOptions) => Promise<void>;
    /** Remove a folder */
    remove: (folderId: string) => Promise<void>;
    /** Get folder configuration */
    getConfig: (folderId: string) => Promise<FolderConfig>;
    /** Update folder configuration */
    updateConfig: (folderId: string, updates: Partial<FolderConfig>) => Promise<void>;
    /** Pause a folder */
    pause: (folderId: string) => Promise<void>;
    /** Resume a folder */
    resume: (folderId: string) => Promise<void>;
    /** Rescan a folder */
    rescan: (folderId: string) => Promise<void>;
    /** Revert local changes for a folder */
    revert: (folderId: string) => Promise<void>;
    /** Override remote changes for a folder */
    override: (folderId: string) => Promise<void>;
    /** Get folder status */
    getStatus: (folderId: string) => Promise<FolderStatus>;
    /** Get folder stats */
    getStats: () => Promise<Record<string, unknown>>;
    /** Get ignore patterns */
    getIgnorePatterns: (folderId: string) => Promise<IgnorePatterns>;
    /** Set ignore patterns */
    setIgnorePatterns: (folderId: string, patterns: string[]) => Promise<void>;
    /** Share folder with a device */
    share: (folderId: string, deviceId: string) => Promise<void>;
    /** Unshare folder from a device */
    unshare: (folderId: string, deviceId: string) => Promise<void>;
  };

  // ============================================================================
  // File Browser Operations
  // ============================================================================
  files: {
    /** Browse folder contents */
    browse: (folderId: string, prefix?: string) => Promise<FileEntry[]>;
    /** Browse file versions */
    browseVersions: (folderPath: string, subPath?: string) => Promise<unknown[]>;
    /** Restore a file version */
    restoreVersion: (folderPath: string, versionPath: string) => Promise<void>;
    /** Open folder in system file explorer */
    openInExplorer: (folderPath: string) => Promise<void>;
    /** Read file content (for conflict resolution) */
    readContent?: (filePath: string) => Promise<string>;
  };

  // ============================================================================
  // Conflict Resolution
  // ============================================================================
  conflicts: {
    /** Scan for conflicts in a folder */
    scan: (folderPath: string) => Promise<unknown[]>;
    /** Delete a conflict file (keep original) */
    delete: (folderPath: string, conflictFile: string) => Promise<void>;
    /** Keep conflict file (replace original) */
    keepConflict: (folderPath: string, originalFile: string, conflictFile: string) => Promise<void>;
  };

  // ============================================================================
  // Events (optional, may not be supported by HTTP bridge)
  // ============================================================================
  events?: {
    /** Subscribe to Syncthing events */
    subscribe: (callback: (event: SyncthingEvent) => void) => () => void;
    /** Get recent events */
    getRecent: (since?: number) => Promise<SyncthingEvent[]>;
  };
}

export type { BridgeType } from './types';
