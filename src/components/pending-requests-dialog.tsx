import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  usePendingRequestsManager,
  useConfig,
  type FolderType,
  type VersioningConfig,
} from '@/hooks/useSyncthing';
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
  ArrowLeftRight,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';
import type { PendingDevice, PendingFolder, VersioningType } from '@/lib/tauri-commands';

interface PendingRequestsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ExistingFolderInfo {
  id: string;
  label: string;
  path: string;
}

interface AcceptFolderDialogProps {
  folder: PendingFolder;
  deviceName: string;
  existingFolder: ExistingFolderInfo | null;
  onAccept: (
    path: string,
    label: string,
    folderType: FolderType,
    versioning: VersioningConfig
  ) => void;
  onMerge: () => void;
  onCancel: () => void;
  isPending: boolean;
}

/** Folder type options with descriptions */
const FOLDER_TYPE_OPTIONS: {
  value: FolderType;
  label: string;
  description: string;
  icon: typeof ArrowLeftRight;
}[] = [
  {
    value: 'sendreceive',
    label: 'Send & Receive',
    description: 'Full two-way sync',
    icon: ArrowLeftRight,
  },
  {
    value: 'receiveonly',
    label: 'Receive Only',
    description: 'Only download changes',
    icon: Download,
  },
  {
    value: 'sendonly',
    label: 'Send Only',
    description: 'Only upload changes',
    icon: Upload,
  },
];

/** Versioning type options with descriptions and storage warnings */
const VERSIONING_OPTIONS: {
  value: VersioningType;
  label: string;
  description: string;
  storageWarning?: string;
}[] = [
  {
    value: 'none',
    label: 'None',
    description: 'Files are replaced/deleted without backup',
  },
  {
    value: 'trashcan',
    label: 'Trash Can',
    description: 'Deleted files are moved to .stversions',
    storageWarning: 'Deleted files accumulate until manually cleaned or auto-cleaned',
  },
  {
    value: 'simple',
    label: 'Simple',
    description: 'Keep N previous versions of files',
    storageWarning: 'Storage = N × file size for frequently changed files',
  },
  {
    value: 'staggered',
    label: 'Staggered',
    description: 'Time-based retention (more recent = more versions)',
    storageWarning: 'Can use significant storage for actively edited files',
  },
];

function AcceptFolderDialog({
  folder,
  deviceName,
  existingFolder,
  onAccept,
  onMerge,
  onCancel,
  isPending,
}: AcceptFolderDialogProps) {
  const [folderPath, setFolderPath] = useState('');
  const [folderLabel, setFolderLabel] = useState(folder.folderLabel || folder.folderId);
  const [folderType, setFolderType] = useState<FolderType>('sendreceive');
  const [versioningType, setVersioningType] = useState<VersioningType>('none');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Versioning params
  const [trashcanDays, setTrashcanDays] = useState('0');
  const [simpleKeep, setSimpleKeep] = useState('5');
  const [staggeredMaxAge, setStaggeredMaxAge] = useState('365');

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

  const buildVersioningConfig = (): VersioningConfig => {
    const params: Record<string, string> = {};

    switch (versioningType) {
      case 'trashcan':
        params.cleanoutDays = trashcanDays;
        break;
      case 'simple':
        params.keep = simpleKeep;
        break;
      case 'staggered':
        // Convert days to seconds for maxAge
        params.maxAge = String(parseInt(staggeredMaxAge, 10) * 86400);
        params.cleanInterval = '3600';
        break;
    }

    return {
      versioningType,
      params: Object.keys(params).length > 0 ? params : undefined,
    };
  };

  const handleAccept = () => {
    if (!folderPath.trim()) {
      toast.error('Please select a folder location');
      return;
    }
    onAccept(folderPath, folderLabel, folderType, buildVersioningConfig());
  };

  // If this folder already exists, show a merge option
  if (existingFolder) {
    return (
      <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-xs">
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
            <CardTitle className="text-foreground text-lg">Folder Already Synced</CardTitle>
            <CardDescription>
              You&apos;re already syncing &quot;{existingFolder.label}&quot;. Would you like to add{' '}
              {deviceName} to sync with this folder?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing folder info */}
            <div className="bg-secondary/50 rounded-lg border border-green-500/30 p-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Existing Folder Found</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Folder className="text-muted-foreground h-4 w-4" />
                  <span className="text-foreground font-medium">{existingFolder.label}</span>
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  Path: {existingFolder.path}
                </p>
                <p className="text-muted-foreground font-mono text-xs">ID: {existingFolder.id}</p>
              </div>
            </div>

            {/* Explanation */}
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="text-muted-foreground text-sm">
                <strong className="text-blue-400">What happens:</strong> The device &quot;
                {deviceName}&quot; will be added to your existing folder. Both devices will sync to
                the same data.
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
                onClick={onMerge}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Device...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Add Device to Folder
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard dialog for new folders
  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <Card className="border-border bg-card max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
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

          {/* Folder Type Selection */}
          <div className="space-y-2">
            <label className="text-foreground text-sm font-medium">Sync Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {FOLDER_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFolderType(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors',
                      folderType === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              {folderType === 'sendreceive' && 'Changes sync both ways between all devices.'}
              {folderType === 'receiveonly' &&
                "Only receive files from others. Your local changes won't sync back."}
              {folderType === 'sendonly' &&
                'Only send your files to others. Remote changes are ignored locally.'}
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="border-border bg-secondary/20 space-y-4 rounded-lg border p-4">
              {/* Versioning Type */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History className="text-muted-foreground h-4 w-4" />
                  <label className="text-foreground text-sm font-medium">File Versioning</label>
                </div>
                <p className="text-muted-foreground text-xs">
                  Keep old versions of files when they are modified or deleted.
                </p>
                <select
                  value={versioningType}
                  onChange={(e) => setVersioningType(e.target.value as VersioningType)}
                  className="border-border bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                >
                  {VERSIONING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>

                {/* Storage warning for versioning */}
                {versioningType !== 'none' && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                    <span className="text-sm text-amber-400">⚠</span>
                    <div className="text-xs">
                      <span className="font-medium text-amber-400">Storage Impact: </span>
                      <span className="text-muted-foreground">
                        {VERSIONING_OPTIONS.find((o) => o.value === versioningType)?.storageWarning}
                      </span>
                      <p className="text-muted-foreground mt-1">
                        Old versions are stored in a <code className="text-xs">.stversions</code>{' '}
                        folder inside your synced folder.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Versioning-specific params */}
              {versioningType === 'trashcan' && (
                <div className="space-y-2">
                  <label className="text-muted-foreground text-xs">
                    Days to keep deleted files (0 = forever)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={trashcanDays}
                    onChange={(e) => setTrashcanDays(e.target.value)}
                    className="border-border bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  {trashcanDays === '0' && (
                    <p className="text-xs text-amber-400">
                      ⚠ Files will be kept forever until you manually delete them.
                    </p>
                  )}
                </div>
              )}

              {versioningType === 'simple' && (
                <div className="space-y-2">
                  <label className="text-muted-foreground text-xs">
                    Number of versions to keep per file
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={simpleKeep}
                    onChange={(e) => setSimpleKeep(e.target.value)}
                    className="border-border bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <p className="text-muted-foreground text-xs">
                    Example: A 100MB file with {simpleKeep} versions = up to{' '}
                    {parseInt(simpleKeep, 10) * 100}MB storage
                  </p>
                </div>
              )}

              {versioningType === 'staggered' && (
                <div className="space-y-2">
                  <label className="text-muted-foreground text-xs">
                    Maximum age in days (older versions are deleted)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={staggeredMaxAge}
                    onChange={(e) => setStaggeredMaxAge(e.target.value)}
                    className="border-border bg-secondary text-foreground w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <p className="text-muted-foreground text-xs">
                    Keeps: 1 version/30min for 24h, 1/day for 30 days, 1/week for {staggeredMaxAge}{' '}
                    days.
                  </p>
                </div>
              )}
            </div>
          )}

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

  // Check if a folder ID already exists in config
  const getExistingFolder = (folderId: string): ExistingFolderInfo | null => {
    const folder = config?.folders?.find((f) => f.id === folderId);
    if (folder && folder.path) {
      return {
        id: folder.id,
        label: folder.label || folder.id,
        path: folder.path,
      };
    }
    return null;
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

  const handleAcceptFolderConfirm = async (
    path: string,
    label: string,
    folderType: FolderType,
    versioning: VersioningConfig
  ) => {
    if (!acceptingFolder) return;

    try {
      await acceptFolder.mutateAsync({
        folderId: acceptingFolder.folderId,
        deviceId: acceptingFolder.offeredBy,
        folderPath: path,
        folderLabel: label,
        folderType,
        versioning,
      });
      toast.success(`Folder "${label}" added`);
      setAcceptingFolder(null);
    } catch {
      toast.error('Failed to accept folder');
    }
  };

  // Handle merging with an existing folder (just adds the device)
  const handleMergeFolder = async () => {
    if (!acceptingFolder) return;

    const existingFolder = getExistingFolder(acceptingFolder.folderId);
    if (!existingFolder) return;

    try {
      await acceptFolder.mutateAsync({
        folderId: acceptingFolder.folderId,
        deviceId: acceptingFolder.offeredBy,
        folderPath: existingFolder.path, // Use existing path
        folderLabel: existingFolder.label, // Use existing label
        // No folderType or versioning - the folder already exists with its settings
      });
      toast.success(`Device added to "${existingFolder.label}"`);
      setAcceptingFolder(null);
    } catch {
      toast.error('Failed to add device to folder');
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
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs">
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
                      {pendingFolders.map((folder) => {
                        const existingFolder = getExistingFolder(folder.folderId);
                        return (
                          <div
                            key={`${folder.folderId}-${folder.offeredBy}`}
                            className={cn(
                              'border-border bg-secondary/30 rounded-lg border p-4',
                              existingFolder && 'border-green-500/30'
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <Folder className="h-4 w-4 shrink-0 text-amber-400" />
                                  <span className="text-foreground truncate font-medium">
                                    {folder.folderLabel || folder.folderId}
                                  </span>
                                  {existingFolder && (
                                    <Badge
                                      variant="outline"
                                      className="border-green-500/50 text-green-400"
                                    >
                                      Already Syncing
                                    </Badge>
                                  )}
                                  {(folder.receiveEncrypted || folder.remoteEncrypted) && (
                                    <span title="Encrypted">
                                      <Shield className="h-3 w-3 text-blue-400" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-muted-foreground truncate font-mono text-xs">
                                  ID: {folder.folderId}
                                </p>
                                {existingFolder && (
                                  <p className="mt-1 text-xs text-green-400/80">
                                    Syncing to: {existingFolder.path}
                                  </p>
                                )}
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
                        );
                      })}
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
          existingFolder={getExistingFolder(acceptingFolder.folderId)}
          onAccept={handleAcceptFolderConfirm}
          onMerge={handleMergeFolder}
          onCancel={() => setAcceptingFolder(null)}
          isPending={acceptFolder.isPending}
        />
      )}
    </>
  );
}
