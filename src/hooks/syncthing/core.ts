'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SyncthingInfoSchema,
  SystemStatusSchema,
  ConnectionsSchema,
  ConfigSchema,
} from './schemas';
import {
  checkSyncthingInstallation,
  startSyncthingSidecar,
  stopSyncthingSidecar,
  restartSyncthing,
  getSystemStatus,
  getConnections,
  getConfig,
} from '@/lib/tauri-commands';

export function useSyncthingInstallation() {
  return useQuery({
    queryKey: ['syncthingInstallation'],
    queryFn: async () => {
      const data = await checkSyncthingInstallation();
      return SyncthingInfoSchema.parse(data);
    },
    staleTime: 60000,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const data = await getSystemStatus();
      return SystemStatusSchema.parse(data);
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const data = await getConnections();
      return ConnectionsSchema.parse(data);
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const data = await getConfig();
      return ConfigSchema.parse(data);
    },
    staleTime: 10000,
  });
}

export function useStartSyncthing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await startSyncthingSidecar();
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
        queryClient.invalidateQueries({ queryKey: ['config'] });
        queryClient.invalidateQueries({ queryKey: ['connections'] });
      }, 2000);
    },
  });
}

export function useStopSyncthing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await stopSyncthingSidecar();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
    },
  });
}

export function useRestartSyncthing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await restartSyncthing();
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
        queryClient.invalidateQueries({ queryKey: ['config'] });
        queryClient.invalidateQueries({ queryKey: ['connections'] });
      }, 3000);
    },
  });
}

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
