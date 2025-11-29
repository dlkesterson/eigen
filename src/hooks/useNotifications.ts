'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { useAppStore } from '@/store';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationOptions {
  title: string;
  body: string;
  priority?: NotificationPriority;
}

/**
 * Hook for sending native OS notifications
 */
export function useNativeNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const nativeNotificationsEnabled = useAppStore((s) => s.nativeNotificationsEnabled);

  // Check and request permission on mount
  useEffect(() => {
    async function checkPermission() {
      try {
        let granted = await isPermissionGranted();

        if (!granted) {
          const permission = await requestPermission();
          granted = permission === 'granted';
        }

        setPermissionGranted(granted);
      } catch (error) {
        console.debug('Notification permission check failed:', error);
        setPermissionGranted(false);
      } finally {
        setInitialized(true);
      }
    }

    checkPermission();
  }, []);

  /**
   * Send a native notification
   */
  const notify = useCallback(
    async ({ title, body }: NotificationOptions) => {
      // Check if notifications are enabled in settings
      if (!nativeNotificationsEnabled) {
        return false;
      }

      if (!permissionGranted) {
        console.debug('Notifications not permitted');
        return false;
      }

      try {
        await sendNotification({
          title,
          body,
        });
        return true;
      } catch (error) {
        console.error('Failed to send notification:', error);
        return false;
      }
    },
    [permissionGranted, nativeNotificationsEnabled]
  );

  /**
   * Quick notification for device events
   */
  const notifyDeviceEvent = useCallback(
    (type: 'connected' | 'disconnected' | 'rejected', deviceName: string) => {
      const messages = {
        connected: {
          title: 'Device Connected',
          body: `${deviceName} is now online`,
        },
        disconnected: {
          title: 'Device Disconnected',
          body: `${deviceName} went offline`,
        },
        rejected: {
          title: 'New Device Request',
          body: `${deviceName} wants to connect`,
        },
      };

      return notify(messages[type]);
    },
    [notify]
  );

  /**
   * Quick notification for folder events
   */
  const notifyFolderEvent = useCallback(
    (type: 'synced' | 'error' | 'shared', folderName: string, extra?: string) => {
      const messages = {
        synced: {
          title: 'Sync Complete',
          body: `${folderName} is now up to date`,
        },
        error: {
          title: 'Sync Error',
          body: `${folderName}: ${extra || 'An error occurred'}`,
        },
        shared: {
          title: 'Folder Shared',
          body: `${extra || 'A device'} shared ${folderName} with you`,
        },
      };

      return notify(messages[type]);
    },
    [notify]
  );

  return {
    initialized,
    permissionGranted,
    notify,
    notifyDeviceEvent,
    notifyFolderEvent,
  };
}
