/**
 * usePredictiveSync - Hook for integrating predictive sync with the UI
 *
 * This hook provides access to predictive sync functionality and automatically
 * tracks folder access when appropriate.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConfig, useRescanFolder } from './useSyncthing';
import {
  predictiveSyncService,
  getFolderPredictions,
  trackFolderAccess,
  type FolderPrediction,
  type PredictiveSyncConfig,
} from '@/lib/predictive-sync';
import { logger } from '@/lib/logger';

interface UsePredictiveSyncReturn {
  /** List of folder predictions */
  predictions: FolderPrediction[];
  /** Whether predictions are loading */
  isLoading: boolean;
  /** Refresh predictions */
  refreshPredictions: () => Promise<void>;
  /** Track access to a folder */
  trackAccess: (folderPath: string) => Promise<void>;
  /** Whether predictive sync is enabled */
  isEnabled: boolean;
  /** Toggle predictive sync on/off */
  setEnabled: (enabled: boolean) => void;
  /** Update configuration */
  updateConfig: (config: Partial<PredictiveSyncConfig>) => void;
  /** Get folders that should sync now */
  foldersToSyncNow: string[];
}

export function usePredictiveSync(): UsePredictiveSyncReturn {
  const [predictions, setPredictions] = useState<FolderPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  const { data: config } = useConfig();
  const rescanFolder = useRescanFolder();

  // Build folder path to ID mapping
  useEffect(() => {
    if (!config?.folders) return;

    const mapping = new Map<string, string>();
    for (const folder of config.folders) {
      if (folder.path && folder.id) {
        mapping.set(folder.path, folder.id);
      }
    }

    // Register the rescan callback with the service
    predictiveSyncService.registerRescanCallback(async (folderId: string) => {
      await rescanFolder.mutateAsync(folderId);
    }, mapping);

    // Start the service if enabled
    if (isEnabled && !predictiveSyncService.isRunning()) {
      predictiveSyncService.start(60000); // Check every minute
    }

    return () => {
      // Don't stop on unmount - let it run in background
    };
  }, [config?.folders, isEnabled, rescanFolder]);

  // Fetch predictions
  const refreshPredictions = useCallback(async () => {
    setIsLoading(true);
    try {
      const preds = await getFolderPredictions();
      setPredictions(preds);
    } catch (error) {
      logger.error('Failed to get predictions', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshPredictions();
  }, [refreshPredictions]);

  // Track folder access
  const trackAccess = useCallback(async (folderPath: string) => {
    await trackFolderAccess(folderPath, 'open');
  }, []);

  // Toggle enabled state
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    predictiveSyncService.updateConfig({ enabled });

    if (enabled) {
      predictiveSyncService.start();
    } else {
      predictiveSyncService.stop();
    }
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<PredictiveSyncConfig>) => {
    predictiveSyncService.updateConfig(newConfig);
  }, []);

  // Get folders that should sync now
  const foldersToSyncNow = predictions.filter((p) => p.shouldBoostNow).map((p) => p.path);

  return {
    predictions,
    isLoading,
    refreshPredictions,
    trackAccess,
    isEnabled,
    setEnabled,
    updateConfig,
    foldersToSyncNow,
  };
}

/**
 * Hook to track when a folder is being viewed/accessed
 */
export function useTrackFolderAccess(folderPath: string | undefined) {
  useEffect(() => {
    if (folderPath) {
      trackFolderAccess(folderPath, 'open');
    }
  }, [folderPath]);
}
