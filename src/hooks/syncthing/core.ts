'use client';

import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SyncthingInfoSchema,
  SystemStatusSchema,
  ConnectionsSchema,
  ConfigSchema,
} from './schemas';

// ---
// Core Query Hooks
// ---

/**
 * Check if Syncthing is installed on the system
 */
export function useSyncthingInstallation() {
  return useQuery({
    queryKey: ['syncthingInstallation'],
    queryFn: async () => {
      const data = await invoke('check_syncthing_installed');
      return SyncthingInfoSchema.parse(data);
    },
    staleTime: 60000,
  });
}

/**
 * Get Syncthing system status
 */
export function useSystemStatus() {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const data = await invoke('get_system_status');
      return SystemStatusSchema.parse(data);
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

/**
 * Get active connections to other devices
 */
export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const data = await invoke('get_connections');
      return ConnectionsSchema.parse(data);
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

/**
 * Get full Syncthing config
 */
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const data = await invoke('get_config');
      return ConfigSchema.parse(data);
    },
    staleTime: 10000,
  });
}

// ---
// Lifecycle Mutations
// ---

/**
 * Start Syncthing daemon
 */
export function useStartSyncthing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await invoke('start_syncthing');
    },
    onSuccess: () => {
      // Wait briefly for startup then refetch status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
        queryClient.invalidateQueries({ queryKey: ['config'] });
        queryClient.invalidateQueries({ queryKey: ['connections'] });
      }, 2000);
    },
  });
}

/**
 * Stop Syncthing daemon
 */
export function useStopSyncthing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await invoke('stop_syncthing');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
    },
  });
}

/**
 * Restart Syncthing
 */
export function useRestartSyncthing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await invoke('restart_syncthing');
    },
    onSuccess: () => {
      // Wait for restart and then refetch everything
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
        queryClient.invalidateQueries({ queryKey: ['config'] });
        queryClient.invalidateQueries({ queryKey: ['connections'] });
      }, 3000);
    },
  });
}

/**
 * Hook to manage Syncthing lifecycle
 */
export function useSyncthingLifecycle() {
  const startMutation = useStartSyncthing();
  const { data: status, isError, error } = useSystemStatus();

  return {
    start: startMutation.mutate,
    isStarting: startMutation.isPending,
    startError: startMutation.error,
    isRunning: !!status?.myID,
    isConnecting: !status?.myID && !isError,
    connectionError: isError ? error : null,
  };
}
