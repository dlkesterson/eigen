// src/hooks/useSyncthingEnhanced.ts
// Enhanced Syncthing hooks with retry logic, circuit breaker, and better error handling

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { retry, syncthingCircuitBreaker } from '@/lib/retry';
import { SyncthingError, ErrorHandler } from '@/lib/errors';
import { useAppStore } from '@/store';
import {
  SystemStatusSchema,
  ConnectionsSchema,
  ConfigSchema,
  FolderStatusSchema,
  type SystemStatus,
  type Connections,
  type Config,
  type FolderStatus,
} from './useSyncthing';

/**
 * Enhanced Syncthing error with context
 */
class EnhancedSyncthingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'EnhancedSyncthingError';
  }
}

/**
 * Wrap Tauri invoke with retry logic and circuit breaker
 */
async function invokeWithRetry<T>(
  command: string,
  args?: Record<string, unknown>,
  options?: {
    maxAttempts?: number;
    showToast?: boolean;
    critical?: boolean;
  }
): Promise<T> {
  const { maxAttempts = 3, showToast = false, critical = false } = options || {};

  logger.debug(`Invoking command: ${command}`, { args });

  try {
    const result = await syncthingCircuitBreaker.execute(async () => {
      return await retry(
        async () => {
          const result = await invoke<T>(command, args);
          logger.debug(`Command succeeded: ${command}`);
          return result;
        },
        {
          maxAttempts,
          onRetry: (attempt, error) => {
            logger.warn(`Retrying ${command} (attempt ${attempt})`, {
              error: error instanceof Error ? error.message : String(error),
            });

            if (showToast && attempt === 2) {
              toast.warning('Connection issues detected', {
                description: 'Retrying...',
              });
            }
          },
        }
      );
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Command failed: ${command}`, {
      error: errorMessage,
      args,
      critical,
    });

    // Show user-friendly error
    if (showToast) {
      toast.error('Operation failed', {
        description: ErrorHandler.getUserMessage(error),
        action: {
          label: 'Retry',
          onClick: () => invokeWithRetry(command, args, options),
        },
      });
    }

    throw new EnhancedSyncthingError(
      `Failed to execute ${command}`,
      'INVOKE_ERROR',
      { command, args },
      error
    );
  }
}

/**
 * Enhanced system status hook with health checks
 */
export function useSystemStatusEnhanced() {
  const pollingInterval = useAppStore((state) => state.pollingInterval);

  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: async (): Promise<SystemStatus> => {
      try {
        const data = await invokeWithRetry('get_system_status', undefined, {
          maxAttempts: 5,
          showToast: true,
          critical: true,
        });

        const parsed = SystemStatusSchema.parse(data);

        // Health check - log circuit breaker state
        const circuitState = syncthingCircuitBreaker.getState();
        if (circuitState.state !== 'closed') {
          logger.info('Syncthing connection recovered', circuitState);
        }

        return parsed;
      } catch (error) {
        logger.error('System status check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    retry: false, // We handle retries ourselves
    refetchInterval: pollingInterval,
    staleTime: pollingInterval - 1000,
    meta: {
      errorMessage: 'Failed to fetch Syncthing status',
    },
  });
}

/**
 * Enhanced connections hook
 */
export function useConnectionsEnhanced() {
  const pollingInterval = useAppStore((state) => state.pollingInterval);

  return useQuery({
    queryKey: ['connections'],
    queryFn: async (): Promise<Connections> => {
      const data = await invokeWithRetry('get_connections', undefined, {
        maxAttempts: 3,
      });
      return ConnectionsSchema.parse(data);
    },
    retry: false,
    refetchInterval: pollingInterval,
    staleTime: pollingInterval - 1000,
  });
}

/**
 * Enhanced config hook
 */
export function useConfigEnhanced() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async (): Promise<Config> => {
      const data = await invokeWithRetry('get_config', undefined, {
        maxAttempts: 3,
      });
      return ConfigSchema.parse(data);
    },
    retry: false,
    refetchInterval: 30000,
    staleTime: 25000,
  });
}

/**
 * Enhanced folder status hook
 */
export function useFolderStatusEnhanced(folderId: string) {
  const pollingInterval = useAppStore((state) => state.pollingInterval);
  const folderPollingInterval = Math.max(pollingInterval / 2, 1000);

  return useQuery({
    queryKey: ['folderStatus', folderId],
    queryFn: async (): Promise<FolderStatus> => {
      const data = await invokeWithRetry(
        'get_folder_status',
        { folderId },
        {
          maxAttempts: 2,
        }
      );
      return FolderStatusSchema.parse(data);
    },
    enabled: !!folderId,
    retry: false,
    refetchInterval: folderPollingInterval,
  });
}

/**
 * Enhanced mutation with optimistic updates for pausing folder
 */
export function usePauseFolderEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      logger.info(`Pausing folder: ${folderId}`);
      await invokeWithRetry('pause_folder', { folderId }, { showToast: true });
    },
    onMutate: async (folderId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['config'] });

      // Snapshot previous value
      const previousConfig = queryClient.getQueryData<Config>(['config']);

      // Optimistically update
      queryClient.setQueryData<Config>(['config'], (old) => {
        if (!old?.folders) return old;
        return {
          ...old,
          folders: old.folders.map((folder) =>
            folder.id === folderId ? { ...folder, paused: true } : folder
          ),
        };
      });

      logger.debug('Optimistic update applied', { folderId });

      return { previousConfig, folderId };
    },
    onError: (error, folderId, context) => {
      // Rollback on error
      if (context?.previousConfig) {
        queryClient.setQueryData(['config'], context.previousConfig);
        logger.warn('Rolled back optimistic update', { folderId });
      }

      logger.error('Failed to pause folder', {
        folderId,
        error: error instanceof Error ? error.message : String(error),
      });

      toast.error('Failed to pause folder', {
        description: ErrorHandler.getUserMessage(error),
      });
    },
    onSuccess: (_, folderId) => {
      logger.info(`Folder paused successfully: ${folderId}`);
      toast.success('Folder paused');
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Enhanced mutation with optimistic updates for resuming folder
 */
export function useResumeFolderEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      logger.info(`Resuming folder: ${folderId}`);
      await invokeWithRetry('resume_folder', { folderId }, { showToast: true });
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

      return { previousConfig, folderId };
    },
    onError: (error, folderId, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(['config'], context.previousConfig);
      }

      toast.error('Failed to resume folder', {
        description: ErrorHandler.getUserMessage(error),
      });
    },
    onSuccess: (_, folderId) => {
      logger.info(`Folder resumed successfully: ${folderId}`);
      toast.success('Folder resumed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Hook to monitor overall system health
 */
export function useSystemHealth() {
  const { data: status, isError, error } = useSystemStatusEnhanced();
  const circuitState = syncthingCircuitBreaker.getState();

  return {
    isHealthy: !isError && circuitState.state === 'closed',
    status: circuitState.state,
    details: {
      syncthing: status ? 'connected' : 'disconnected',
      circuitBreaker: circuitState,
      error: error instanceof Error ? error.message : null,
    },
  };
}

/**
 * Query error handler wrapper for custom queryFn
 */
export function withErrorHandling<T>(
  queryFn: () => Promise<T>,
  context: { operation: string; component?: string }
) {
  return async (): Promise<T> => {
    try {
      return await queryFn();
    } catch (error) {
      logger.error(`Query error in ${context.operation}`, {
        component: context.component,
        error: error instanceof Error ? error.message : String(error),
      });

      // Transform error for better UX
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new SyncthingError('Cannot connect to Syncthing', 'CONNECTION_REFUSED', {
            context,
          });
        }
        if (error.message.includes('timeout')) {
          throw new SyncthingError('Request timed out', 'TIMEOUT', { context });
        }
      }

      throw error;
    }
  };
}

/**
 * Enhanced mutation for starting Syncthing
 */
export function useStartSyncthingEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      logger.info('Starting Syncthing sidecar');
      return await invokeWithRetry<string>('start_syncthing_sidecar', undefined, {
        maxAttempts: 1, // Only try once for starting
        showToast: true,
      });
    },
    onSuccess: () => {
      logger.info('Syncthing started successfully');
      toast.success('Syncthing started');

      // Reset circuit breaker when starting fresh
      syncthingCircuitBreaker.reset();

      // Wait for Syncthing to fully start, then refresh
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
        queryClient.invalidateQueries({ queryKey: ['connections'] });
        queryClient.invalidateQueries({ queryKey: ['config'] });
      }, 2000);
    },
    onError: (error) => {
      logger.error('Failed to start Syncthing', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to start Syncthing', {
        description: ErrorHandler.getUserMessage(error),
      });
    },
  });
}

/**
 * Enhanced mutation for stopping Syncthing
 */
export function useStopSyncthingEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      logger.info('Stopping Syncthing');
      return await invoke<void>('stop_syncthing_sidecar');
    },
    onSuccess: () => {
      logger.info('Syncthing stopped successfully');
      toast.success('Syncthing stopped');

      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (error) => {
      logger.error('Failed to stop Syncthing', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to stop Syncthing', {
        description: ErrorHandler.getUserMessage(error),
      });
    },
  });
}

/**
 * Enhanced mutation for restarting Syncthing
 */
export function useRestartSyncthingEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      logger.info('Restarting Syncthing');
      return await invokeWithRetry<void>('restart_syncthing', undefined, {
        maxAttempts: 1,
        showToast: true,
      });
    },
    onSuccess: () => {
      logger.info('Syncthing restart initiated');
      toast.success('Syncthing restarting...');

      // Reset circuit breaker
      syncthingCircuitBreaker.reset();

      // Wait for restart to complete
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
        queryClient.invalidateQueries({ queryKey: ['connections'] });
        queryClient.invalidateQueries({ queryKey: ['config'] });
      }, 5000);
    },
    onError: (error) => {
      logger.error('Failed to restart Syncthing', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to restart Syncthing', {
        description: ErrorHandler.getUserMessage(error),
      });
    },
  });
}
