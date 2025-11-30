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
export { useBrowseVersions, useRestoreVersion } from './versions';

// Re-export log hooks
export { useSystemLogs } from './logs';

// Re-export options hooks
export { useUpdateOptions } from './options';
