import { useState } from 'react';
import { usePendingRequestsManager, useConfig } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { PendingRequestsDialog } from '@/components/pending-requests-dialog';
import { Bell, Laptop, Folder, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A persistent banner that shows when there are pending device or folder requests.
 * This is more visible than toast notifications and won't be missed.
 */
export function PendingRequestsBanner() {
  const [showDialog, setShowDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { pendingDevices, pendingFolders, totalPending, isLoading } = usePendingRequestsManager();
  const { data: config } = useConfig();

  // Get device name from config if available
  const getDeviceName = (deviceId: string): string => {
    const device = config?.devices?.find((d) => d.deviceID === deviceId);
    return device?.name || deviceId.slice(0, 7) + '...';
  };

  // Reset dismissed state when new requests come in
  // (compare against previous count would be better, but this works for now)

  // Don't show if no pending requests or still loading
  if (isLoading || totalPending === 0 || dismissed) {
    return <PendingRequestsDialog open={showDialog} onClose={() => setShowDialog(false)} />;
  }

  // Build summary text
  const deviceCount = pendingDevices.length;
  const folderCount = pendingFolders.length;

  let summaryText = '';
  if (deviceCount > 0 && folderCount > 0) {
    summaryText = `${deviceCount} device${deviceCount > 1 ? 's' : ''} and ${folderCount} folder${folderCount > 1 ? 's' : ''} waiting for your approval`;
  } else if (deviceCount > 0) {
    if (deviceCount === 1) {
      const device = pendingDevices[0];
      summaryText = `"${device.name || device.deviceId.slice(0, 7)}" wants to connect`;
    } else {
      summaryText = `${deviceCount} devices want to connect`;
    }
  } else if (folderCount > 0) {
    if (folderCount === 1) {
      const folder = pendingFolders[0];
      summaryText = `"${folder.folderLabel || folder.folderId}" shared by ${getDeviceName(folder.offeredBy)}`;
    } else {
      summaryText = `${folderCount} folders shared with you`;
    }
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              'relative flex items-center justify-between gap-4 px-6 py-3',
              'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent',
              'border-b border-amber-500/20'
            )}
          >
            {/* Left side - Icon and message */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                <Bell className="h-4 w-4 text-amber-500" />
              </div>

              <div className="flex items-center gap-4">
                {/* Icons showing what's pending */}
                <div className="flex items-center gap-2">
                  {deviceCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Laptop className="h-4 w-4" />
                      <span className="text-sm font-medium">{deviceCount}</span>
                    </div>
                  )}
                  {folderCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Folder className="h-4 w-4" />
                      <span className="text-sm font-medium">{folderCount}</span>
                    </div>
                  )}
                </div>

                {/* Summary text */}
                <p className="text-foreground text-sm">{summaryText}</p>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowDialog(true)}
                size="sm"
                className="bg-amber-500 text-white hover:bg-amber-600"
              >
                Review
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDismissed(true)}
                className="text-muted-foreground hover:text-foreground h-7 w-7"
                title="Dismiss (requests will remain pending)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dialog for reviewing requests */}
      <PendingRequestsDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </>
  );
}
