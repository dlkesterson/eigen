/**
 * Shared types for the Syncthing API abstraction layer
 */

import type {
  SystemStatus,
  Connections,
  Config,
  FolderConfig,
  DeviceConfig,
  FolderStatus,
  IgnorePatterns,
  SystemLogs,
  SyncthingEvent,
  SyncthingInfo,
  VersionEntry,
  ConflictFile,
} from '@/hooks/useSyncthing';

export type {
  SystemStatus,
  Connections,
  Config,
  FolderConfig,
  DeviceConfig,
  FolderStatus,
  IgnorePatterns,
  SystemLogs,
  SyncthingEvent,
  SyncthingInfo,
};

// Re-export version and conflict types if they exist
export type { VersionEntry, ConflictFile };

// Bridge type enum
export type BridgeType = 'tauri' | 'http';

// File entry for browsing
export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modTime?: string;
  permissions?: string;
}

// Advanced folder options
export interface AdvancedFolderOptions {
  folderId: string;
  folderLabel: string;
  folderPath: string;
  versioningType?: 'simple' | 'staggered' | 'trashcan' | 'external' | '';
  versioningParams?: Record<string, string>;
  rescanIntervalS?: number;
  fsWatcherEnabled?: boolean;
  fsWatcherDelayS?: number;
  ignorePerms?: boolean;
}

// Advanced device options
export interface AdvancedDeviceOptions {
  deviceId: string;
  name: string;
  addresses?: string[];
  compression?: 'metadata' | 'always' | 'never';
  introducer?: boolean;
  autoAcceptFolders?: boolean;
  maxSendKbps?: number;
  maxRecvKbps?: number;
}

// Connection settings for HTTP bridge
export interface HttpConnectionSettings {
  baseUrl: string;
  apiKey: string;
}
