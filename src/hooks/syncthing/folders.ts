'use client';

import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderStatusSchema, FolderConfigSchema, IgnorePatternsSchema } from './schemas';
import type { FolderConfig, AdvancedFolderOptions } from './types';
import type { Config } from './types';

// ---
// Folder Queries
// ---

/**
 * Get folder sync status
 */
export function useFolderStatus(folderId: string) {
  return useQuery({
    queryKey: ['folderStatus', folderId],
    queryFn: async () => {
      const data = await invoke('get_folder_status', { folderId });
      return FolderStatusSchema.parse(data);
    },
    enabled: !!folderId,
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

/**
 * Get folder configuration
 */
export function useFolderConfig(folderId: string) {
  return useQuery({
    queryKey: ['folderConfig', folderId],
    queryFn: async () => {
      const data = await invoke('get_folder_config', { folderId });
      return FolderConfigSchema.parse(data);
    },
    enabled: !!folderId,
    staleTime: 30000,
  });
}

/**
 * Get ignore patterns for a folder
 */
export function useFolderIgnores(folderId: string) {
  return useQuery({
    queryKey: ['folderIgnores', folderId],
    queryFn: async () => {
      const data = await invoke('get_folder_ignores', { folderId });
      return IgnorePatternsSchema.parse(data);
    },
    enabled: !!folderId,
    staleTime: 30000,
  });
}

/**
 * Browse folder contents
 */
export function useBrowseFolder(folderId: string, prefix?: string) {
  return useQuery({
    queryKey: ['browseFolder', folderId, prefix],
    queryFn: async () => {
      const data = await invoke('browse_folder', {
        folderId,
        prefix: prefix || null,
      });
      return data as Record<string, unknown>[];
    },
    enabled: !!folderId,
    staleTime: 10000,
  });
}

// ---
// Folder Mutations
// ---

/**
 * Pause a folder
 */
export function usePauseFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      await invoke('pause_folder', { folderId });
    },
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: ['config'] });
      const previousConfig = queryClient.getQueryData<Config>(['config']);
      queryClient.setQueryData<Config>(['config'], (old) => {
        if (!old?.folders) return old;
        return {
          ...old,
          folders: old.folders.map((folder) =>
            folder.id === folderId ? { ...folder, paused: true } : folder
          ),
        };
      });
      return { previousConfig };
    },
    onError: (_err, _folderId, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(['config'], context.previousConfig);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Resume a folder
 */
export function useResumeFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      await invoke('resume_folder', { folderId });
    },
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: ['config'] });
      const previousConfig = queryClient.getQueryData<Config>(['config']);
      queryClient.setQueryData<Config>(['config'], (old) => {
        if (!old?.folders) return old;
        return {
          ...old,
          folders: old.folders.map((folder) =>
            folder.id === folderId ? { ...folder, paused: false } : folder
          ),
        };
      });
      return { previousConfig };
    },
    onError: (_err, _folderId, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(['config'], context.previousConfig);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Rescan a folder
 */
export function useRescanFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      await invoke('rescan_folder', { folderId });
    },
    onSuccess: (_data, folderId) => {
      queryClient.invalidateQueries({ queryKey: ['folderStatus', folderId] });
    },
  });
}

/**
 * Add a folder (basic)
 */
export function useAddFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      folderLabel,
      folderPath,
    }: {
      folderId: string;
      folderLabel: string;
      folderPath: string;
    }) => {
      await invoke('add_folder', { folderId, folderLabel, folderPath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Add a folder with advanced options
 */
export function useAddFolderAdvanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: AdvancedFolderOptions) => {
      await invoke('add_folder_advanced', {
        folderId: options.folderId,
        folderLabel: options.folderLabel,
        folderPath: options.folderPath,
        versioningType: options.versioningType || null,
        versioningParams: options.versioningParams || null,
        rescanIntervalS: options.rescanIntervalS ?? null,
        fsWatcherEnabled: options.fsWatcherEnabled ?? null,
        fsWatcherDelayS: options.fsWatcherDelayS ?? null,
        ignorePerms: options.ignorePerms ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Remove a folder
 */
export function useRemoveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      await invoke('remove_folder', { folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Share a folder with a device
 */
export function useShareFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, deviceId }: { folderId: string; deviceId: string }) => {
      await invoke('share_folder', { folderId, deviceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Unshare a folder from a device
 */
export function useUnshareFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, deviceId }: { folderId: string; deviceId: string }) => {
      await invoke('unshare_folder', { folderId, deviceId });
      // Verify unsharing
      const config = await invoke('get_config');
      const typedConfig = config as {
        folders?: Array<{ id: string; devices?: Array<{ deviceID: string }> }>;
      };
      const folder = typedConfig.folders?.find((f) => f.id === folderId);
      const stillShared = folder?.devices?.some((d) => d.deviceID === deviceId);

      if (stillShared) {
        throw new Error('Folder still appears to be shared after unshare operation');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Update folder configuration
 */
export function useUpdateFolderConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      updates,
    }: {
      folderId: string;
      updates: Partial<FolderConfig>;
    }) => {
      await invoke('update_folder_config', { folderId, updates });
    },
    onSuccess: (_data, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['folderConfig', folderId] });
    },
  });
}

/**
 * Set ignore patterns for a folder
 */
export function useSetFolderIgnores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      ignorePatterns,
    }: {
      folderId: string;
      ignorePatterns: string[];
    }) => {
      await invoke('set_folder_ignores', { folderId, ignorePatterns });
    },
    onSuccess: (_data, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: ['folderIgnores', folderId] });
    },
  });
}

/**
 * Open folder in system file explorer
 */
export function useOpenFolderInExplorer() {
  return useMutation({
    mutationFn: async (folderPath: string) => {
      await invoke('open_folder_in_explorer', { folderPath });
    },
  });
}
