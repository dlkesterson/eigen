'use client';

import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useQueryClient } from '@tanstack/react-query';
import {
  useStartSyncthing,
  useSystemStatus,
  useSyncthingInstallation,
  useSyncthingEvents,
  SyncthingEvent,
} from '@/hooks/useSyncthing';
import { useNativeNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { QUERY_KEYS } from '@/constants/routes';

/**
 * Updates the system tray tooltip with current sync status
 */
async function updateTrayStatus(status: string, details: string) {
  try {
    const tooltip = `Eigen - ${status}\n${details}`;
    await invoke('update_tray_status', {
      status,
      tooltip,
    });
  } catch (error) {
    // Silently fail - tray might not be available
    logger.debug('Could not update tray status', { error });
  }
}

/**
 * Component that manages Syncthing lifecycle.
 * Checks installation and auto-starts Syncthing when the app loads.
 * Also handles device discovery notifications via the Event API.
 */
// Cooldown period for notifications (in milliseconds)
const DEVICE_NOTIFICATION_COOLDOWN = 60000; // 1 minute
const FOLDER_NOTIFICATION_COOLDOWN = 30000; // 30 seconds - prevent spam for folder sync/error events

export function SyncthingManager({ children }: { children: React.ReactNode }) {
  const { data: installation, isLoading: checkingInstallation } = useSyncthingInstallation();
  const startSyncthing = useStartSyncthing();
  const { data: status, isError } = useSystemStatus();
  const hasAttemptedStart = useRef(false);
  const installationToastShown = useRef(false);
  const connectedToastShown = useRef(false);
  const queryClient = useQueryClient();

  // Track last notification time per device to prevent spam
  const deviceNotificationTimestamps = useRef<Map<string, number>>(new Map());
  // Track last notification time per folder to prevent spam
  const folderNotificationTimestamps = useRef<Map<string, number>>(new Map());

  // Native notifications hook
  const { notifyDeviceEvent, notifyFolderEvent } = useNativeNotifications();

  /**
   * Check if we should show a notification for a device event
   * Returns true if cooldown has passed, false if we should skip
   */
  const shouldNotifyDevice = useCallback((deviceId: string, eventType: string): boolean => {
    const key = `${deviceId}-${eventType}`;
    const now = Date.now();
    const lastNotified = deviceNotificationTimestamps.current.get(key);

    if (lastNotified && now - lastNotified < DEVICE_NOTIFICATION_COOLDOWN) {
      return false;
    }

    deviceNotificationTimestamps.current.set(key, now);
    return true;
  }, []);

  /**
   * Check if we should show a notification for a folder event
   * Returns true if cooldown has passed, false if we should skip
   */
  const shouldNotifyFolder = useCallback((folderId: string, eventType: string): boolean => {
    const key = `${folderId}-${eventType}`;
    const now = Date.now();
    const lastNotified = folderNotificationTimestamps.current.get(key);

    if (lastNotified && now - lastNotified < FOLDER_NOTIFICATION_COOLDOWN) {
      return false;
    }

    folderNotificationTimestamps.current.set(key, now);
    return true;
  }, []);

  // Handle incoming Syncthing events
  const handleEvent = useCallback(
    (event: SyncthingEvent) => {
      switch (event.type) {
        case 'DeviceRejected': {
          // A device tried to connect but isn't in our config
          const deviceName = event.data?.name || event.data?.device?.slice(0, 7) || 'Unknown';

          // Invalidate pending requests to show the new pending device
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_DEVICES] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_REQUESTS] });

          toast.warning('New Device Wants to Connect', {
            description: `Device ${deviceName} is trying to connect.`,
            duration: 15000,
            action: {
              label: 'Review',
              onClick: () => {
                // Open pending requests dialog via custom event
                window.dispatchEvent(new CustomEvent('open-pending-requests'));
              },
            },
          });
          // Also send native notification (shown when window is hidden)
          notifyDeviceEvent('rejected', deviceName);
          break;
        }

        case 'FolderRejected': {
          // A folder was shared to us but isn't in our config
          const folderName = event.data?.folderLabel || event.data?.folder || 'Unknown';
          const fromDevice = event.data?.device?.slice(0, 7) || 'A device';

          // Invalidate pending requests to show the new pending folder
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_FOLDERS] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_REQUESTS] });

          toast.info('Folder Shared With You', {
            description: `Device ${fromDevice} wants to share folder "${folderName}".`,
            duration: 15000,
            action: {
              label: 'Review',
              onClick: () => {
                // Open pending requests dialog via custom event
                window.dispatchEvent(new CustomEvent('open-pending-requests'));
              },
            },
          });
          // Native notification
          notifyFolderEvent('shared', folderName, fromDevice);
          break;
        }

        case 'DeviceConnected': {
          const deviceId = event.data?.id || 'unknown';
          const deviceName = event.data?.deviceName || event.data?.id?.slice(0, 7) || 'Device';

          // Rate limit notifications per device
          if (!shouldNotifyDevice(deviceId, 'connected')) {
            break;
          }

          toast.success('Device Connected', {
            description: `${deviceName} is now online.`,
            duration: 5000,
          });
          // Native notification
          notifyDeviceEvent('connected', deviceName);
          break;
        }

        case 'DeviceDisconnected': {
          const deviceId = event.data?.id || 'unknown';
          const deviceName = event.data?.deviceName || event.data?.id?.slice(0, 7) || 'Device';

          // Rate limit notifications per device to prevent spam
          if (!shouldNotifyDevice(deviceId, 'disconnected')) {
            break;
          }

          toast.info('Device Disconnected', {
            description: `${deviceName} went offline.`,
            duration: 5000,
          });
          // Native notification
          notifyDeviceEvent('disconnected', deviceName);
          break;
        }

        case 'FolderCompletion':
          // Only show when folder reaches 100% and not recently notified
          if (event.data?.completion === 100) {
            const folderId = event.data?.folder || 'unknown';
            const folderName = event.data?.folder || 'Folder';

            // Rate limit notifications per folder to prevent spam
            if (!shouldNotifyFolder(folderId, 'completion')) {
              break;
            }

            toast.success('Sync Complete', {
              description: `Folder "${folderName}" is now in sync.`,
              duration: 3000,
            });
            // Native notification for sync complete
            notifyFolderEvent('synced', folderName);
          }
          break;

        case 'FolderErrors':
          if (event.data?.errors?.length > 0) {
            const folderId = event.data?.folder || 'unknown';
            const folderName = event.data?.folder || 'Folder';
            const errorCount = event.data.errors.length;

            // Rate limit error notifications per folder to prevent spam
            if (!shouldNotifyFolder(folderId, 'errors')) {
              break;
            }

            toast.error('Sync Errors', {
              description: `Folder "${folderName}" has ${errorCount} error(s).`,
              duration: 10000,
            });
            // Native notification for errors
            notifyFolderEvent('error', folderName, `${errorCount} error(s)`);
          }
          break;
      }
    },
    [notifyDeviceEvent, notifyFolderEvent, shouldNotifyDevice, shouldNotifyFolder, queryClient]
  );

  // Subscribe to Syncthing events when connected
  const { isPolling } = useSyncthingEvents({
    onEvent: handleEvent,
    enabled: !!status?.myID,
  });

  // Check installation status
  useEffect(() => {
    if (checkingInstallation || installationToastShown.current) return;

    if (installation && !installation.installed) {
      installationToastShown.current = true;
      toast.error('Syncthing not installed', {
        description: 'Please install Syncthing to use this app. Run: sudo apt install syncthing',
        duration: 15000,
        action: {
          label: 'Learn More',
          onClick: () => window.open('https://syncthing.net/downloads/', '_blank'),
        },
      });
    } else if (installation?.installed && installation.version) {
      logger.info('Syncthing found', { version: installation.version, path: installation.path });
    }
  }, [installation, checkingInstallation]);

  // Auto-start Syncthing if installed but not responding
  useEffect(() => {
    if (hasAttemptedStart.current) return;
    if (!installation?.installed) return;

    // If we get an error (Syncthing not responding), try to start it
    if (isError && !startSyncthing.isPending) {
      hasAttemptedStart.current = true;

      logger.info('Syncthing not responding, attempting to start...');

      startSyncthing.mutate(undefined, {
        onSuccess: (message) => {
          logger.info('Syncthing start result', { message });
          toast.success('Starting Syncthing...', {
            description: 'Please wait while Syncthing initializes.',
          });
        },
        onError: (err) => {
          logger.error('Failed to start Syncthing', { error: err });
          toast.error('Failed to start Syncthing', {
            description: err instanceof Error ? err.message : 'Unknown error',
            duration: 10000,
          });
        },
      });
    }
  }, [isError, startSyncthing, installation?.installed]);

  // Show success toast when Syncthing connects
  useEffect(() => {
    if (status?.myID && !connectedToastShown.current) {
      connectedToastShown.current = true;
      toast.success('Connected to Syncthing', {
        description: `Device ID: ${status.myID.slice(0, 7)}...`,
      });
    }
  }, [status?.myID]);

  // Update tray status based on connection and sync state
  useEffect(() => {
    if (!status?.myID) {
      updateTrayStatus('Disconnected', 'Syncthing is not running');
      return;
    }

    // Connected to Syncthing
    const uptime = status.uptime ? Math.floor(status.uptime / 60) : 0;
    const uptimeStr = uptime > 60 ? `${Math.floor(uptime / 60)}h ${uptime % 60}m` : `${uptime}m`;

    if (isPolling) {
      updateTrayStatus('Connected', `Uptime: ${uptimeStr} • Listening for events`);
    } else {
      updateTrayStatus('Connected', `Uptime: ${uptimeStr}`);
    }
  }, [status?.myID, status?.uptime, isPolling]);

  return <>{children}</>;
}
