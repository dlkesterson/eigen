'use client';

import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConflictFile } from './types';

// ---
// Conflict Resolution
// ---

/**
 * Scan folder for conflict files
 */
export function useScanConflicts(folderPath: string) {
  return useQuery({
    queryKey: ['conflicts', folderPath],
    queryFn: async () => {
      const data = await invoke<ConflictFile[]>('scan_for_conflicts', { folderPath });
      return data;
    },
    enabled: !!folderPath,
    staleTime: 30000,
  });
}

/**
 * Delete a conflict file (keep original)
 */
export function useDeleteConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderPath,
      conflictFile,
    }: {
      folderPath: string;
      conflictFile: string;
    }) => {
      await invoke('delete_conflict_file', { folderPath, conflictFile });
    },
    onSuccess: (_data, { folderPath }) => {
      queryClient.invalidateQueries({ queryKey: ['conflicts', folderPath] });
    },
  });
}

/**
 * Resolve conflict by keeping the conflict version
 */
export function useResolveConflictKeepConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderPath,
      originalFile,
      conflictFile,
    }: {
      folderPath: string;
      originalFile: string;
      conflictFile: string;
    }) => {
      await invoke('resolve_conflict_keep_conflict', { folderPath, originalFile, conflictFile });
    },
    onSuccess: (_data, { folderPath }) => {
      queryClient.invalidateQueries({ queryKey: ['conflicts', folderPath] });
    },
  });
}
