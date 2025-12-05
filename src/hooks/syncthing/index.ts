'use client';

// Re-export all schemas
export * from './schemas';

// Re-export all types
export * from './types';

// Re-export core hooks (status, config, lifecycle)
export {
  useSyncthingInstallation,
  useSystemStatus,
  useConnections,
  useConfig,
  useStartSyncthing,
  useStopSyncthing,
  useRestartSyncthing,
  useSyncthingLifecycle,
  useRecentEvents,
} from './core';

// Re-export folder hooks
export {
  useFolderStatus,
  useFolderConfig,
  useFolderIgnores,
  useBrowseFolder,
  usePauseFolder,
  useResumeFolder,
  useRescanFolder,
  useAddFolder,
  useAddFolderAdvanced,
  useRemoveFolder,
  useShareFolder,
  useUnshareFolder,
  useUpdateFolderConfig,
  useSetFolderIgnores,
  useOpenFolderInExplorer,
  useFolderStatuses,
} from './folders';

// Re-export device hooks
export {
  useDeviceId,
  useDeviceConfig,
  useAddDevice,
  useAddDeviceAdvanced,
  useRemoveDevice,
  usePauseDevice,
  useResumeDevice,
  useUpdateDeviceConfig,
} from './devices';

// Re-export event hooks
export { useSyncthingEvents } from './events';

// Re-export conflict hooks
export { useScanConflicts, useDeleteConflict, useResolveConflictKeepConflict } from './conflicts';

// Re-export version hooks
export {
  useBrowseVersions,
  useRestoreVersion,
  useVersionStorageInfo,
  useCleanupVersions,
  useCleanupVersionsOlderThan,
} from './versions';

// Re-export version types
export type { VersionStorageInfo, CleanupResult } from './versions';

// Re-export log hooks
export { useSystemLogs } from './logs';

// Re-export options hooks
export { useUpdateOptions } from './options';

// Re-export pending request hooks
export {
  usePendingDevices,
  usePendingFolders,
  usePendingRequests,
  useAcceptPendingDevice,
  useDismissPendingDevice,
  useAcceptPendingFolder,
  useDismissPendingFolder,
  usePendingRequestsManager,
} from './pending';

// Re-export pending request types
export type { FolderType, VersioningConfig, AcceptPendingFolderOptions } from './pending';
