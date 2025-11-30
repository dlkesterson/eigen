/**
 * TauriBridge - Implementation of SyncthingClient using Tauri's invoke()
 *
 * This bridge is used when running as a desktop application with the
 * Syncthing binary bundled as a sidecar.
 */

import { invoke } from '@tauri-apps/api/core';
import type { SyncthingClient } from './client';
import type {
  SystemStatus,
  Connections,
  Config,
  FolderConfig,
  FolderStatus,
  IgnorePatterns,
  SystemLogs,
  SyncthingInfo,
  SyncthingEvent,
  FileEntry,
  AdvancedFolderOptions,
  AdvancedDeviceOptions,
} from './types';
import {
  SystemStatusSchema,
  ConnectionsSchema,
  ConfigSchema,
  FolderConfigSchema,
  FolderStatusSchema,
  IgnorePatternsSchema,
  SystemLogsSchema,
  SyncthingInfoSchema,
  SyncthingEventSchema,
} from '@/hooks/useSyncthing';

export class TauriBridge implements SyncthingClient {
  // ---
  // System Operations
  // ---
  system = {
    checkInstallation: async (): Promise<SyncthingInfo> => {
      const data = await invoke('check_syncthing_installation');
      return SyncthingInfoSchema.parse(data);
    },

    status: async (): Promise<SystemStatus> => {
      const data = await invoke('get_system_status');
      return SystemStatusSchema.parse(data);
    },

    ping: async (): Promise<{ ping: string }> => {
      const data = await invoke('ping_syncthing');
      return data as { ping: string };
    },

    logs: async (): Promise<SystemLogs> => {
      const data = await invoke('get_system_logs', { since: null });
      return SystemLogsSchema.parse(data);
    },

    connections: async (): Promise<Connections> => {
      const data = await invoke('get_connections');
      return ConnectionsSchema.parse(data);
    },

    start: async (): Promise<string> => {
      return await invoke<string>('start_syncthing_sidecar');
    },

    stop: async (): Promise<string> => {
      return await invoke<string>('stop_syncthing_sidecar');
    },

    restart: async (): Promise<void> => {
      await invoke('restart_syncthing');
    },

    shutdown: async (): Promise<void> => {
      await invoke('shutdown_syncthing');
    },
  };

  // ---
  // Configuration Operations
  // ---
  config = {
    get: async (): Promise<Config> => {
      const data = await invoke('get_config');
      return ConfigSchema.parse(data);
    },

    patch: async (config: Partial<Config>): Promise<void> => {
      await invoke('update_config', { config });
    },
  };

  // ---
  // Device Operations
  // ---
  devices = {
    getLocalId: async (): Promise<string> => {
      return await invoke<string>('get_device_id');
    },

    add: async (deviceId: string, name?: string): Promise<void> => {
      await invoke('add_device', { deviceId, name: name || deviceId.slice(0, 7) });
    },

    addAdvanced: async (options: AdvancedDeviceOptions): Promise<void> => {
      await invoke('add_device_advanced', {
        deviceId: options.deviceId,
        name: options.name,
        addresses: options.addresses || null,
        compression: options.compression || null,
        introducer: options.introducer ?? null,
        autoAcceptFolders: options.autoAcceptFolders ?? null,
        maxSendKbps: options.maxSendKbps || null,
        maxRecvKbps: options.maxRecvKbps || null,
      });
    },

    remove: async (deviceId: string): Promise<void> => {
      await invoke('remove_device', { deviceId });
    },

    pause: async (deviceId: string): Promise<void> => {
      await invoke('pause_device', { deviceId });
    },

    resume: async (deviceId: string): Promise<void> => {
      await invoke('resume_device', { deviceId });
    },

    getStats: async (): Promise<Record<string, unknown>> => {
      const data = await invoke('get_device_stats');
      return data as Record<string, unknown>;
    },
  };

  // ---
  // Folder Operations
  // ---
  folders = {
    add: async (folderId: string, folderLabel: string, folderPath: string): Promise<void> => {
      await invoke('add_folder', { folderId, folderLabel, folderPath });
    },

    addAdvanced: async (options: AdvancedFolderOptions): Promise<void> => {
      await invoke('add_folder_advanced', {
        folderId: options.folderId,
        folderLabel: options.folderLabel,
        folderPath: options.folderPath,
        versioningType: options.versioningType || null,
        versioningParams: options.versioningParams || null,
        rescanIntervalS: options.rescanIntervalS || null,
        fsWatcherEnabled: options.fsWatcherEnabled ?? null,
        fsWatcherDelayS: options.fsWatcherDelayS || null,
        ignorePerms: options.ignorePerms ?? null,
      });
    },

    remove: async (folderId: string): Promise<void> => {
      await invoke('remove_folder', { folderId });
    },

    getConfig: async (folderId: string): Promise<FolderConfig> => {
      const data = await invoke('get_folder_config', { folderId });
      return FolderConfigSchema.parse(data);
    },

    updateConfig: async (folderId: string, updates: Partial<FolderConfig>): Promise<void> => {
      await invoke('update_folder_config', { folderId, updates });
    },

    pause: async (folderId: string): Promise<void> => {
      await invoke('pause_folder', { folderId });
    },

    resume: async (folderId: string): Promise<void> => {
      await invoke('resume_folder', { folderId });
    },

    rescan: async (folderId: string): Promise<void> => {
      await invoke('rescan_folder', { folderId });
    },

    revert: async (folderId: string): Promise<void> => {
      await invoke('revert_folder', { folderId });
    },

    override: async (folderId: string): Promise<void> => {
      await invoke('override_folder', { folderId });
    },

    getStatus: async (folderId: string): Promise<FolderStatus> => {
      const data = await invoke('get_folder_status', { folderId });
      return FolderStatusSchema.parse(data);
    },

    getStats: async (): Promise<Record<string, unknown>> => {
      const data = await invoke('get_folder_stats');
      return data as Record<string, unknown>;
    },

    getIgnorePatterns: async (folderId: string): Promise<IgnorePatterns> => {
      const data = await invoke('get_folder_ignores', { folderId });
      return IgnorePatternsSchema.parse(data);
    },

    setIgnorePatterns: async (folderId: string, patterns: string[]): Promise<void> => {
      await invoke('set_folder_ignores', { folderId, ignorePatterns: patterns });
    },

    share: async (folderId: string, deviceId: string): Promise<void> => {
      await invoke('share_folder', { folderId, deviceId });
    },

    unshare: async (folderId: string, deviceId: string): Promise<void> => {
      await invoke('unshare_folder', { folderId, deviceId });
    },
  };

  // ---
  // File Browser Operations
  // ---
  files = {
    browse: async (folderId: string, prefix?: string): Promise<FileEntry[]> => {
      const data = await invoke('browse_folder', {
        folderId,
        prefix: prefix || null,
      });
      return data as FileEntry[];
    },

    browseVersions: async (folderPath: string, subPath?: string): Promise<unknown[]> => {
      const data = await invoke('browse_versions', {
        folderPath,
        prefix: subPath || null,
      });
      return data as unknown[];
    },

    restoreVersion: async (folderPath: string, versionPath: string): Promise<void> => {
      await invoke('restore_version', {
        folderPath,
        versionPath,
        originalName: versionPath.split('/').pop() || '',
        overwrite: true,
      });
    },

    openInExplorer: async (folderPath: string): Promise<void> => {
      await invoke('open_folder_in_explorer', { folderPath });
    },

    readContent: async (filePath: string): Promise<string> => {
      return await invoke<string>('read_file_content', { filePath });
    },
  };

  // ---
  // Conflict Resolution
  // ---
  conflicts = {
    scan: async (folderPath: string): Promise<unknown[]> => {
      const data = await invoke('scan_for_conflicts', { folderPath });
      return data as unknown[];
    },

    delete: async (folderPath: string, conflictFile: string): Promise<void> => {
      await invoke('delete_conflict_file', { folderPath, conflictFile });
    },

    keepConflict: async (
      folderPath: string,
      originalFile: string,
      conflictFile: string
    ): Promise<void> => {
      await invoke('resolve_conflict_keep_conflict', { folderPath, originalFile, conflictFile });
    },
  };

  // ---
  // Events
  // ---
  events = {
    subscribe: (callback: (event: SyncthingEvent) => void): (() => void) => {
      // For Tauri, we use long-polling via the hook
      // This is a placeholder - the actual implementation uses useSyncthingEvents hook
      let running = true;
      let lastEventId = 0;

      const poll = async () => {
        while (running) {
          try {
            const data = await invoke<SyncthingEvent[]>('get_events', {
              since: lastEventId,
              limit: 100,
              timeout: 30,
            });

            if (Array.isArray(data) && data.length > 0) {
              for (const event of data) {
                const parsed = SyncthingEventSchema.parse(event);
                lastEventId = Math.max(lastEventId, parsed.id);
                callback(parsed);
              }
            }
          } catch {
            // Ignore polling errors
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      };

      poll();

      return () => {
        running = false;
      };
    },

    getRecent: async (since?: number): Promise<SyncthingEvent[]> => {
      const data = await invoke<SyncthingEvent[]>('get_events', {
        since: since || 0,
        limit: 100,
        timeout: 0,
      });
      return Array.isArray(data) ? data.map((e) => SyncthingEventSchema.parse(e)) : [];
    },
  };
}

// Export a singleton instance
export const tauriBridge = new TauriBridge();
