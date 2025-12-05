'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVersionStorageInfo,
  cleanupVersions,
  cleanupVersionsOlderThan,
  type VersionStorageInfo,
  type CleanupResult,
} from '@/lib/tauri-commands';
import { invoke } from '@tauri-apps/api/core';
import type { VersionEntry } from './types';

// Re-export types
export type { VersionStorageInfo, CleanupResult };

export function useBrowseVersions(folderPath: string, prefix?: string) {
  return useQuery({
    queryKey: ['versions', folderPath, prefix],
    queryFn: async () => {
      const data = await invoke<VersionEntry[]>('browse_versions', {
        folderPath,
        prefix: prefix || null,
      });
      return data;
    },
    enabled: !!folderPath,
    staleTime: 10000,
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderPath,
      versionPath,
      originalName,
      overwrite = false,
    }: {
      folderPath: string;
      versionPath: string;
      originalName: string;
      overwrite?: boolean;
    }) => {
      await invoke('restore_version', {
        folderPath,
        versionPath,
        originalName,
        overwrite,
      });
    },
    onSuccess: (_data, { folderPath }) => {
      queryClient.invalidateQueries({ queryKey: ['versions', folderPath] });
      queryClient.invalidateQueries({ queryKey: ['browseFolder'] });
    },
  });
}

/**
 * Hook to get storage information for versioned files in a folder
 * @param folderPath - Absolute path to the synced folder
 * @param enabled - Whether the query is enabled (default true)
 */
export function useVersionStorageInfo(folderPath: string | undefined, enabled = true) {
  return useQuery<VersionStorageInfo>({
    queryKey: ['versionStorage', folderPath],
    queryFn: () => getVersionStorageInfo(folderPath!),
    enabled: enabled && !!folderPath,
    staleTime: 30000, // 30 seconds - storage doesn't change that often
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to clean up all versioned files for a folder
 */
export function useCleanupVersions() {
  const queryClient = useQueryClient();

  return useMutation<CleanupResult, Error, string>({
    mutationFn: cleanupVersions,
    onSuccess: (_data, folderPath) => {
      // Invalidate version-related queries
      queryClient.invalidateQueries({ queryKey: ['versions', folderPath] });
      queryClient.invalidateQueries({ queryKey: ['versionStorage', folderPath] });
    },
  });
}

/**
 * Hook to clean up versions older than a specified number of days
 */
export function useCleanupVersionsOlderThan() {
  const queryClient = useQueryClient();

  return useMutation<CleanupResult, Error, { folderPath: string; days: number }>({
    mutationFn: ({ folderPath, days }) => cleanupVersionsOlderThan(folderPath, days),
    onSuccess: (_data, { folderPath }) => {
      // Invalidate version-related queries
      queryClient.invalidateQueries({ queryKey: ['versions', folderPath] });
      queryClient.invalidateQueries({ queryKey: ['versionStorage', folderPath] });
    },
  });
}
