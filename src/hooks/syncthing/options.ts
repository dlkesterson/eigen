'use client';

import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Options } from './types';

// ---
// Global Options
// ---

/**
 * Update global Syncthing options (network settings, discovery, etc.)
 */
export function useUpdateOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: Partial<Options>) => {
      await invoke('update_options', { options });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}
