'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDeviceId } from './useSyncthing';
import { logger } from '@/lib/logger';

export interface DeviceInvitation {
  deviceId: string;
  name?: string;
  introducer?: boolean;
  expiresAt?: number;
}

export interface PendingInvitation extends DeviceInvitation {
  receivedAt: number;
}

const INVITE_SCHEME = 'eigen';
const INVITE_HOST = 'invite';
const DEFAULT_EXPIRY_HOURS = 24;

export function generateInviteUrl(
  deviceId: string,
  deviceName?: string,
  options: {
    introducer?: boolean;
    expiryHours?: number;
  } = {}
): string {
  const params = new URLSearchParams();
  params.set('id', deviceId);

  if (deviceName) {
    params.set('name', deviceName);
  }

  if (options.introducer) {
    params.set('introducer', '1');
  }

  if (options.expiryHours) {
    const expiresAt = Date.now() + options.expiryHours * 60 * 60 * 1000;
    params.set('exp', expiresAt.toString());
  }

  return `${INVITE_SCHEME}://${INVITE_HOST}?${params.toString()}`;
}

export function parseInviteUrl(url: string): DeviceInvitation | null {
  try {
    // Handle both eigen:// and eigen://invite? formats
    const urlObj = new URL(url);

    if (urlObj.protocol !== `${INVITE_SCHEME}:`) {
      return null;
    }

    const params = urlObj.searchParams;
    const deviceId = params.get('id');

    if (!deviceId) {
      return null;
    }

    const name = params.get('name') || undefined;
    const introducer = params.get('introducer') === '1';
    const expStr = params.get('exp');
    const expiresAt = expStr ? parseInt(expStr, 10) : undefined;

    // Check if expired
    if (expiresAt && Date.now() > expiresAt) {
      logger.warn('Received expired invitation', { deviceId, expiresAt });
      return null;
    }

    return {
      deviceId,
      name,
      introducer,
      expiresAt,
    };
  } catch {
    return null;
  }
}

export async function generateQRCodeDataUrl(content: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QRCode = await import('qrcode' as any);
    return await QRCode.toDataURL(content, {
      width: 256,
      margin: 2,
      color: {
        dark: '#FFFFFF',
        light: '#0F172A',
      },
    });
  } catch {
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="#0F172A"/>
        <text x="128" y="128" text-anchor="middle" fill="#94A3B8" font-family="system-ui" font-size="14">
          QR Code
        </text>
        <text x="128" y="148" text-anchor="middle" fill="#64748B" font-family="system-ui" font-size="10">
          Install qrcode package
        </text>
      </svg>
    `)}`;
  }
}

interface UseDeviceInviteReturn {
  /** Current device ID */
  deviceId: string | undefined;
  /** Whether device ID is loading */
  isLoading: boolean;
  /** Pending invitations received via deep link */
  pendingInvitations: PendingInvitation[];
  /** Generated invite URL for this device */
  inviteUrl: string | null;
  /** QR code data URL for sharing */
  qrCodeUrl: string | null;
  /** Whether QR code is being generated */
  isGeneratingQR: boolean;
  /** Generate new invite URL */
  generateInvite: (options?: { introducer?: boolean; expiryHours?: number }) => void;
  /** Generate QR code */
  generateQRCode: () => Promise<void>;
  /** Accept a pending invitation */
  acceptInvitation: (invitation: PendingInvitation) => void;
  /** Reject/dismiss a pending invitation */
  rejectInvitation: (deviceId: string) => void;
  /** Copy invite URL to clipboard */
  copyInviteUrl: () => Promise<boolean>;
}

export function useDeviceInvite(): UseDeviceInviteReturn {
  const { data: deviceId, isLoading } = useDeviceId();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQRCodeUrl] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Handle deep link events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupDeepLinkListener() {
      try {
        // Try to import the Tauri deep-link plugin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deepLink = await import('@tauri-apps/plugin-deep-link' as any);
        const onOpenUrl = deepLink.onOpenUrl as (
          callback: (urls: string[]) => void
        ) => Promise<() => void>;

        unlisten = await onOpenUrl((urls: string[]) => {
          for (const url of urls) {
            const invitation = parseInviteUrl(url);
            if (invitation) {
              logger.info('Received device invitation via deep link', {
                deviceId: invitation.deviceId,
              });

              setPendingInvitations((prev) => {
                // Avoid duplicates
                if (prev.some((p) => p.deviceId === invitation.deviceId)) {
                  return prev;
                }
                return [
                  ...prev,
                  {
                    ...invitation,
                    receivedAt: Date.now(),
                  },
                ];
              });
            }
          }
        });
      } catch {
        // Not in Tauri environment or plugin not available
        logger.debug('Deep link plugin not available');
      }
    }

    setupDeepLinkListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Generate invite URL when device ID is available
  const generateInvite = useCallback(
    (options: { introducer?: boolean; expiryHours?: number } = {}) => {
      if (!deviceId) return;

      const url = generateInviteUrl(deviceId, 'My Device', {
        introducer: options.introducer,
        expiryHours: options.expiryHours || DEFAULT_EXPIRY_HOURS,
      });

      setInviteUrl(url);
      setQRCodeUrl(null); // Reset QR when URL changes
    },
    [deviceId]
  );

  // Generate QR code
  const generateQRCode = useCallback(async () => {
    if (!inviteUrl) {
      generateInvite();
    }

    const urlToEncode = inviteUrl || (deviceId ? generateInviteUrl(deviceId) : null);
    if (!urlToEncode) return;

    setIsGeneratingQR(true);
    try {
      const dataUrl = await generateQRCodeDataUrl(urlToEncode);
      setQRCodeUrl(dataUrl);
    } catch (error) {
      logger.error('Failed to generate QR code', { error });
    } finally {
      setIsGeneratingQR(false);
    }
  }, [inviteUrl, deviceId, generateInvite]);

  // Accept invitation handler
  const acceptInvitation = useCallback((invitation: PendingInvitation) => {
    // This would trigger the add device dialog with pre-filled data
    // The actual adding is handled by the component using this hook
    logger.info('Accepting invitation', { deviceId: invitation.deviceId });

    // Dispatch custom event that AddDeviceDialog can listen to
    window.dispatchEvent(
      new CustomEvent('device-invite-accepted', {
        detail: invitation,
      })
    );

    // Remove from pending
    setPendingInvitations((prev) => prev.filter((p) => p.deviceId !== invitation.deviceId));
  }, []);

  // Reject invitation handler
  const rejectInvitation = useCallback((deviceIdToReject: string) => {
    setPendingInvitations((prev) => prev.filter((p) => p.deviceId !== deviceIdToReject));
  }, []);

  // Copy to clipboard
  const copyInviteUrl = useCallback(async (): Promise<boolean> => {
    const urlToCopy = inviteUrl || (deviceId ? generateInviteUrl(deviceId) : null);
    if (!urlToCopy) return false;

    try {
      await navigator.clipboard.writeText(urlToCopy);
      return true;
    } catch {
      return false;
    }
  }, [inviteUrl, deviceId]);

  return {
    deviceId,
    isLoading,
    pendingInvitations,
    inviteUrl,
    qrCodeUrl,
    isGeneratingQR,
    generateInvite,
    generateQRCode,
    acceptInvitation,
    rejectInvitation,
    copyInviteUrl,
  };
}
