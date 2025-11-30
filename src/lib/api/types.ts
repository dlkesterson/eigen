/**
 * Shared types for the Syncthing API abstraction layer
 *
 * Re-exports from centralized types for backward compatibility.
 * New code should import directly from '@/types'.
 */

// Re-export all syncthing types
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
  VersionEntry,
  ConflictFile,
  AdvancedFolderOptions,
  AdvancedDeviceOptions,
} from '@/types';

// Re-export API types
export type { BridgeType, FileEntry, HttpConnectionSettings } from '@/types';
