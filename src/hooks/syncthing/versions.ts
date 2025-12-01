'use client';

import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VersionEntry } from './types';

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
