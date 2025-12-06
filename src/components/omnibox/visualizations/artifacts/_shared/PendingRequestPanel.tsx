/**
 * Pending Request Panel — Layer 3 Glass Panel
 *
 * Per the UX guide: Click pending beacon → enter Request Beacon Room →
 * centered glass card with Accept/Reject
 *
 * This component provides the glass panel content for pending requests.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Laptop, Folder, CheckCircle, XCircle, AlertTriangle, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useAcceptPendingDevice,
  useDismissPendingDevice,
  useDismissPendingFolder,
} from '@/hooks/syncthing/pending';

// =============================================================================
// Types
// =============================================================================

interface PendingRequestPanelProps {
  requestId: string;
  requestType: 'device' | 'folder';
  requestName?: string;
  onClose?: () => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function PendingRequestPanel({
  requestId,
  requestType,
  requestName,
  onClose,
}: PendingRequestPanelProps) {
  const acceptDevice = useAcceptPendingDevice();
  const dismissDevice = useDismissPendingDevice();
  const dismissFolder = useDismissPendingFolder();

  const isPending = acceptDevice.isPending || dismissDevice.isPending || dismissFolder.isPending;

  const handleAccept = async () => {
    try {
      if (requestType === 'device') {
        await acceptDevice.mutateAsync({ deviceId: requestId });
        onClose?.();
      } else {
        // Folder accepts require more configuration (folderPath, etc.)
        // For now, we'll use focus mode for folder accepts
        window.dispatchEvent(
          new CustomEvent('focus-mode-navigate', {
            detail: { tab: 'folders' },
          })
        );
        onClose?.();
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleReject = async () => {
    try {
      if (requestType === 'device') {
        await dismissDevice.mutateAsync(requestId);
      } else {
        const [deviceId, folderId] = requestId.split('/');
        await dismissFolder.mutateAsync({ deviceId, folderId });
      }
      onClose?.();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const Icon = requestType === 'device' ? Laptop : Folder;
  const typeLabel = requestType === 'device' ? 'Device' : 'Folder';
  const typeColor = requestType === 'device' ? 'amber' : 'orange';

  return (
    <div className="space-y-6">
      {/* Header with request type */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center"
      >
        <div
          className={cn(
            'mb-4 flex h-20 w-20 items-center justify-center rounded-full',
            'animate-pulse',
            requestType === 'device' ? 'bg-amber-400/10' : 'bg-orange-400/10'
          )}
        >
          <Icon
            className={cn(
              'h-10 w-10',
              requestType === 'device' ? 'text-amber-400' : 'text-orange-400'
            )}
          />
        </div>
        <h3 className="text-xl font-semibold text-white">New {typeLabel} Request</h3>
        <p className="mt-2 text-gray-400">
          {requestType === 'device'
            ? 'A device wants to connect and sync data with you'
            : 'A device wants to share a folder with you'}
        </p>
      </motion.div>

      {/* Request Details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle
            className={cn(
              'h-4 w-4',
              requestType === 'device' ? 'text-amber-400' : 'text-orange-400'
            )}
          />
          <span className="text-sm font-medium text-white">Request Details</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Name</span>
            <span className="font-mono text-sm text-white">{requestName || 'Unknown'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Type</span>
            <Badge
              variant="outline"
              className={cn(
                requestType === 'device'
                  ? 'border-amber-400/50 text-amber-400'
                  : 'border-orange-400/50 text-orange-400'
              )}
            >
              {typeLabel}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">ID</span>
            <code className="max-w-[200px] truncate font-mono text-xs text-gray-500">
              {requestId.slice(0, 24)}...
            </code>
          </div>
        </div>
      </motion.div>

      {/* Warning */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4"
      >
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Security Notice</p>
            <p className="mt-1 text-xs text-gray-400">
              Only accept requests from {requestType === 'device' ? 'devices' : 'folders'} you
              recognize. If you don't recognize this request, it's safe to ignore it.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-3"
      >
        <Button
          variant="outline"
          className="flex-1 border-gray-500/30 text-gray-300 hover:bg-gray-500/10"
          onClick={handleReject}
          disabled={isPending}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Ignore
        </Button>
        <Button
          className={cn(
            'flex-1',
            requestType === 'device'
              ? 'bg-amber-500 text-black hover:bg-amber-600'
              : 'bg-orange-500 text-black hover:bg-orange-600'
          )}
          onClick={handleAccept}
          disabled={isPending}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Accept
        </Button>
      </motion.div>
    </div>
  );
}

export default PendingRequestPanel;
