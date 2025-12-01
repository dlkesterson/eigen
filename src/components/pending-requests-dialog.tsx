'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingRequestsManager, useConfig } from '@/hooks/useSyncthing';
import {
  X,
  Laptop,
  Folder,
  Check,
  XCircle,
  Loader2,
  FolderInput,
  Clock,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';
import type { PendingDevice, PendingFolder } from '@/lib/tauri-commands';

interface PendingRequestsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface AcceptFolderDialogProps {
  folder: PendingFolder;
  deviceName: string;
  onAccept: (path: string, label: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

function AcceptFolderDialog({
  folder,
  deviceName,
  onAccept,
  onCancel,
  isPending,
}: AcceptFolderDialogProps) {
  const [folderPath, setFolderPath] = useState('');
  const [folderLabel, setFolderLabel] = useState(folder.folderLabel || folder.folderId);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select folder location',
      });
      if (selected && typeof selected === 'string') {
        setFolderPath(selected);
      }
    } catch {
      // User cancelled
    }
  };

  const handleAccept = () => {
    if (!folderPath.trim()) {
      toast.error('Please select a folder location');
      return;
    }
    onAccept(folderPath, folderLabel);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <Card className="border-border bg-card w-full max-w-md shadow-2xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-foreground text-lg">Accept Shared Folder</CardTitle>
          <CardDescription>
            Choose where to save &quot;{folder.folderLabel || folder.folderId}&quot; from{' '}
            {deviceName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Folder Label */}
          <div className="space-y-2">
            <label className="text-foreground text-sm font-medium">Folder Label</label>
            <input
              type="text"
              value={folderLabel}
              onChange={(e) => setFolderLabel(e.target.value)}
              className="border-border bg-secondary text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
              placeholder="My Shared Folder"
            />
          </div>

          {/* Folder Path */}
          <div className="space-y-2">
            <label className="text-foreground text-sm font-medium">Save Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                className="border-border bg-secondary text-foreground placeholder:text-muted-foreground flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                placeholder="Select a folder..."
              />
              <Button variant="outline" onClick={handleBrowse} className="shrink-0">
                <FolderInput className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Files will be synced to this location on your device.
            </p>
          </div>

          {/* Encryption info */}
          {(folder.receiveEncrypted || folder.remoteEncrypted) && (
            <div className="bg-secondary/50 flex items-center gap-2 rounded-lg p-3">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-muted-foreground text-xs">This folder uses encryption</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!folderPath.trim() || isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Accept
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PendingRequestsDialog({ open, onClose }: PendingRequestsDialogProps) {
  const [acceptingFolder, setAcceptingFolder] = useState<PendingFolder | null>(null);
  const [deviceNameInput, setDeviceNameInput] = useState<Record<string, string>>({});

  const { data: config } = useConfig();
  const {
    pendingDevices,
    pendingFolders,
    isLoading,
    refetch,
    acceptDevice,
    dismissDevice,
    acceptFolder,
    dismissFolder,
  } = usePendingRequestsManager();

  // Get device name from config if available
  const getDeviceName = (deviceId: string): string => {
    const device = config?.devices?.find((d) => d.deviceID === deviceId);
    return device?.name || deviceId.slice(0, 7) + '...';
  };

  const handleAcceptDevice = async (device: PendingDevice) => {
    const name = deviceNameInput[device.deviceId] || device.name;
    try {
      await acceptDevice.mutateAsync({ deviceId: device.deviceId, name });
      toast.success(`Device ${name || device.deviceId.slice(0, 7)} added`);
    } catch {
      toast.error('Failed to accept device');
    }
  };

  const handleDismissDevice = async (deviceId: string) => {
    try {
      await dismissDevice.mutateAsync(deviceId);
      toast.info('Device request dismissed');
    } catch {
      toast.error('Failed to dismiss device request');
    }
  };

  const handleAcceptFolderConfirm = async (path: string, label: string) => {
    if (!acceptingFolder) return;

    try {
      await acceptFolder.mutateAsync({
        folderId: acceptingFolder.folderId,
        deviceId: acceptingFolder.offeredBy,
        folderPath: path,
        folderLabel: label,
      });
      toast.success(`Folder "${label}" added`);
      setAcceptingFolder(null);
    } catch {
      toast.error('Failed to accept folder');
    }
  };

  const handleDismissFolder = async (folder: PendingFolder) => {
    try {
      await dismissFolder.mutateAsync({
        folderId: folder.folderId,
        deviceId: folder.offeredBy,
      });
      toast.info('Folder request dismissed');
    } catch {
      toast.error('Failed to dismiss folder request');
    }
  };

  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleString();
    } catch {
      return timeStr;
    }
  };

  if (!open) return null;

  const hasNoRequests = pendingDevices.length === 0 && pendingFolders.length === 0;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs">
        <Card className="border-border bg-card flex max-h-[80vh] w-full max-w-2xl flex-col shadow-2xl">
          <CardHeader className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <CardTitle className="text-foreground text-xl">Pending Requests</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                className="h-8 w-8"
                title="Refresh"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
            <CardDescription>
              Review and accept or reject connection and folder share requests from other devices.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 space-y-6 overflow-y-auto pb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : hasNoRequests ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-secondary/50 mb-4 rounded-full p-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-foreground font-medium">No pending requests</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  You&apos;re all caught up! New requests will appear here.
                </p>
              </div>
            ) : (
              <>
                {/* Pending Devices Section */}
                {pendingDevices.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                      <Laptop className="h-4 w-4" />
                      Device Connection Requests
                      <Badge variant="secondary" className="ml-auto">
                        {pendingDevices.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {pendingDevices.map((device) => (
                        <div
                          key={device.deviceId}
                          className="border-border bg-secondary/30 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <Laptop className="h-4 w-4 shrink-0 text-blue-400" />
                                <span className="text-foreground truncate font-medium">
                                  {device.name || 'Unknown Device'}
                                </span>
                              </div>
                              <p className="text-muted-foreground truncate font-mono text-xs">
                                {device.deviceId}
                              </p>
                              {device.address && (
                                <p className="text-muted-foreground mt-1 text-xs">
                                  From: {device.address}
                                </p>
                              )}
                              {device.time && (
                                <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(device.time)}
                                </p>
                              )}

                              {/* Device name input */}
                              <div className="mt-3">
                                <input
                                  type="text"
                                  value={deviceNameInput[device.deviceId] ?? device.name ?? ''}
                                  onChange={(e) =>
                                    setDeviceNameInput((prev) => ({
                                      ...prev,
                                      [device.deviceId]: e.target.value,
                                    }))
                                  }
                                  className="border-border bg-secondary text-foreground placeholder:text-muted-foreground w-full rounded border px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500/50 focus:outline-none"
                                  placeholder="Enter device name..."
                                />
                              </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDismissDevice(device.deviceId)}
                                disabled={dismissDevice.isPending}
                                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptDevice(device)}
                                disabled={acceptDevice.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {acceptDevice.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Folders Section */}
                {pendingFolders.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                      <Folder className="h-4 w-4" />
                      Folder Share Requests
                      <Badge variant="secondary" className="ml-auto">
                        {pendingFolders.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {pendingFolders.map((folder) => (
                        <div
                          key={`${folder.folderId}-${folder.offeredBy}`}
                          className="border-border bg-secondary/30 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <Folder className="h-4 w-4 shrink-0 text-amber-400" />
                                <span className="text-foreground truncate font-medium">
                                  {folder.folderLabel || folder.folderId}
                                </span>
                                {(folder.receiveEncrypted || folder.remoteEncrypted) && (
                                  <span title="Encrypted">
                                    <Shield className="h-3 w-3 text-blue-400" />
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground truncate font-mono text-xs">
                                ID: {folder.folderId}
                              </p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                Shared by: {getDeviceName(folder.offeredBy)}
                              </p>
                              {folder.time && (
                                <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(folder.time)}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDismissFolder(folder)}
                                disabled={dismissFolder.isPending}
                                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setAcceptingFolder(folder)}
                                disabled={acceptFolder.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accept folder sub-dialog */}
      {acceptingFolder && (
        <AcceptFolderDialog
          folder={acceptingFolder}
          deviceName={getDeviceName(acceptingFolder.offeredBy)}
          onAccept={handleAcceptFolderConfirm}
          onCancel={() => setAcceptingFolder(null)}
          isPending={acceptFolder.isPending}
        />
      )}
    </>
  );
}
