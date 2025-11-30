'use client';

import { useState } from 'react';
import { useConfig, useShareFolder } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { X, Laptop, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface FolderDevice {
  deviceID: string;
  introducedBy?: string;
  encryptionPassword?: string;
}

interface ShareFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderLabel?: string;
}

export function ShareFolderDialog({
  open,
  onOpenChange,
  folderId,
  folderLabel,
}: ShareFolderDialogProps) {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const { data: config } = useConfig();
  const shareFolder = useShareFolder();

  const handleShare = async () => {
    if (!selectedDevice) return;

    try {
      await shareFolder.mutateAsync({
        folderId,
        deviceId: selectedDevice,
      });
      toast.success(`Folder shared with device`);
      onOpenChange(false);
      setSelectedDevice(null);
    } catch (error) {
      logger.error('Share folder error', { error, folderId, deviceId: selectedDevice });
      toast.error(
        `Failed to share folder: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  if (!open) return null;

  // Filter out devices that already have this folder
  const availableDevices = config?.devices?.filter((device) => {
    // Find the current folder config
    const currentFolder = config.folders?.find((f) => f.id === folderId);
    // Check if this device is already in the folder's device list
    // Note: The backend returns 'devices' as an array of objects with 'deviceID'
    const devices = currentFolder?.devices as FolderDevice[] | undefined;
    const isAlreadyShared = devices?.some((d) => d.deviceID === device.deviceID);
    return !isAlreadyShared;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <Card className="border-border bg-card w-full max-w-md shadow-2xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-foreground text-xl">Share Folder</CardTitle>
          <CardDescription className="text-muted-foreground">
            Select a device to sync &quot;{folderLabel || folderId}&quot; with.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {availableDevices?.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No new devices available to share with.
              </div>
            ) : (
              availableDevices?.map((device) => (
                <div
                  key={device.deviceID}
                  onClick={() => setSelectedDevice(device.deviceID)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all',
                    selectedDevice === device.deviceID
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary hover:border-border/80'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded">
                      <Laptop className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm font-medium">
                        {device.name || 'Unnamed Device'}
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {device.deviceID.slice(0, 12)}
                        ...
                      </span>
                    </div>
                  </div>
                  {selectedDevice === device.deviceID && <Check className="text-primary h-4 w-4" />}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border hover:bg-secondary bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={!selectedDevice || shareFolder.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {shareFolder.isPending ? 'Sharing...' : 'Share'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
