'use client';

import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { FolderStatusSchema, FolderConfigSchema, IgnorePatternsSchema } from './schemas';
import type { FolderConfig, AdvancedFolderOptions } from './types';
import type { Config } from './types';

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

export function useOpenFolderInExplorer() {
  return useMutation({
    mutationFn: async (folderPath: string) => {
      await invoke('open_folder_in_explorer', { folderPath });
    },
  });
}

/**
 * Hook to get statuses for multiple folders at once
 * Returns an object mapping folder IDs to their status queries
 */
export function useFolderStatuses(folderIds: string[]) {
  // Use useQueries to handle dynamic number of queries safely
  const queries = useQueries({
    queries: folderIds.map((folderId) => ({
      queryKey: ['folderStatus', folderId],
      queryFn: async () => {
        const data = await invoke('get_folder_status', { folderId });
        return FolderStatusSchema.parse(data);
      },
      enabled: !!folderId,
      refetchInterval: 5000,
      staleTime: 3000,
    })),
  });

  // Convert array of query results to a record keyed by folder ID
  const results: Record<string, (typeof queries)[number]> = {};
  folderIds.forEach((folderId, index) => {
    results[folderId] = queries[index];
  });

  return results;
}
