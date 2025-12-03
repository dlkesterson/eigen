'use client';

import { useState } from 'react';
import {
  useConfig,
  useFolderStatus,
  usePauseFolder,
  useResumeFolder,
  useRescanFolder,
  useRemoveFolder,
  useOpenFolderInExplorer,
  useUnshareFolder,
  useSystemStatus,
  useVersionStorageInfo,
  useCleanupVersions,
  useCleanupVersionsOlderThan,
} from '@/hooks/useSyncthing';
import { CardContent, CardHeader, CardTitle, CardDescription, Card } from '@/components/ui/card';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes } from '@/lib/utils';
import {
  Folder,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Plus,
  Share2,
  FileX,
  FolderOpen,
  ExternalLink,
  AlertTriangle,
  Users,
  X,
  History,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddFolderDialog } from '@/components/add-folder-dialog';
import { ShareFolderDialog } from '@/components/share-folder-dialog';
import { IgnorePatternsDialog } from '@/components/ignore-patterns-dialog';
import { FileBrowser } from '@/components/file-browser';
import { ConflictResolver } from '@/components/conflict-resolver';
import { toast } from 'sonner';

function FolderCard({
  folder,
  devices,
  localDeviceId,
  onShare,
  onIgnorePatterns,
  onBrowse,
  onConflicts,
}: {
  folder: {
    id: string;
    label?: string;
    path?: string;
    paused?: boolean;
    devices?: { deviceID: string }[];
  };
  devices: { deviceID: string; name?: string }[];
  localDeviceId?: string;
  onShare: (id: string, label?: string) => void;
  onIgnorePatterns: (id: string, label?: string) => void;
  onBrowse: (id: string, path: string, label?: string) => void;
  onConflicts: (id: string, path: string, label?: string) => void;
}) {
  const { data: status, isLoading } = useFolderStatus(folder.id);
  const pauseFolder = usePauseFolder();
  const resumeFolder = useResumeFolder();
  const rescanFolder = useRescanFolder();
  const removeFolder = useRemoveFolder();
  const openInExplorer = useOpenFolderInExplorer();
  const unshareFolder = useUnshareFolder();

  // Version storage tracking
  const { data: versionStorage } = useVersionStorageInfo(folder.path || '');
  const cleanupVersions = useCleanupVersions();
  const cleanupOldVersions = useCleanupVersionsOlderThan();

  const isPaused = folder.paused;
  const isSyncing = status?.state === 'syncing';
  const needsSync = (status?.needFiles || 0) > 0;

  // Get list of shared devices (excluding local device)
  const sharedDevices = (folder.devices || [])
    .filter((fd) => fd.deviceID !== localDeviceId)
    .map((fd) => {
      const device = devices.find((d) => d.deviceID === fd.deviceID);
      return {
        deviceID: fd.deviceID,
        name: device?.name || fd.deviceID.slice(0, 8) + '...',
      };
    });

  const handleUnshare = async (deviceId: string, deviceName: string) => {
    if (confirm(`Stop sharing "${folder.label || folder.id}" with "${deviceName}"?`)) {
      try {
        await unshareFolder.mutateAsync({
          folderId: folder.id,
          deviceId,
        });
        toast.success(`Stopped sharing with ${deviceName}`);
      } catch {
        toast.error('Failed to unshare folder');
      }
    }
  };

  const getStatusBadge = () => {
    if (isPaused) return <Badge variant="secondary">Paused</Badge>;
    if (isSyncing) return <Badge variant="warning">Syncing</Badge>;
    if (needsSync) return <Badge variant="warning">Needs Sync</Badge>;
    return <Badge variant="success">Up to Date</Badge>;
  };

  const handleTogglePause = () => {
    if (isPaused) {
      resumeFolder.mutate(folder.id);
    } else {
      pauseFolder.mutate(folder.id);
    }
  };

  const handleRescan = () => {
    rescanFolder.mutate(folder.id);
  };

  const handleRemove = async () => {
    if (
      confirm(
        `Remove folder "${folder.label || folder.id}"? This will not delete the files on disk.`
      )
    ) {
      try {
        await removeFolder.mutateAsync(folder.id);
        toast.success('Folder removed');
      } catch {
        toast.error('Failed to remove folder');
      }
    }
  };

  const handleOpenInExplorer = async () => {
    if (folder.path) {
      try {
        await openInExplorer.mutateAsync(folder.path);
        toast.success('Opened in file explorer');
      } catch {
        toast.error('Failed to open folder');
      }
    }
  };

  return (
    <SpotlightCard
      className={cn('transition-all', isPaused && 'opacity-60')}
      spotlightColor={
        isSyncing
          ? 'rgba(234, 179, 8, 0.15)'
          : needsSync
            ? 'rgba(234, 179, 8, 0.1)'
            : 'rgba(99, 102, 241, 0.15)'
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg">
              <Folder className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-foreground text-lg">{folder.label || folder.id}</CardTitle>
              <CardDescription className="font-mono text-xs">{folder.path}</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Local Files</p>
                <p className="text-foreground font-medium">
                  {status?.localFiles?.toLocaleString() || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Local Size</p>
                <p className="text-foreground font-medium">
                  {formatBytes(status?.localBytes || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Global Files</p>
                <p className="text-foreground font-medium">
                  {status?.globalFiles?.toLocaleString() || 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Need Sync</p>
                <p className="text-foreground font-medium">
                  {status?.needFiles?.toLocaleString() || 0} files
                </p>
              </div>
            </div>

            {/* Shared Devices */}
            {sharedDevices.length > 0 && (
              <div className="mb-4">
                <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>Shared with</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sharedDevices.map((device) => (
                    <Badge
                      key={device.deviceID}
                      variant="secondary"
                      className="group/badge hover:bg-accent flex items-center gap-1 pr-1"
                    >
                      <span className="max-w-[100px] truncate">{device.name}</span>
                      <button
                        onClick={() => handleUnshare(device.deviceID, device.name)}
                        disabled={unshareFolder.isPending}
                        className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover/badge:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                        title="Stop sharing"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Version Storage */}
            {versionStorage?.exists && versionStorage.totalBytes > 0 && (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <History className="h-4 w-4 text-amber-500" />
                    <span className="text-muted-foreground">Version History</span>
                    <span className="font-medium text-amber-400">
                      {versionStorage.totalFormatted}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({versionStorage.fileCount} files)
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!folder.path) return;
                        if (confirm('Delete versions older than 30 days?')) {
                          try {
                            const result = await cleanupOldVersions.mutateAsync({
                              folderPath: folder.path,
                              days: 30,
                            });
                            toast.success(
                              `Cleaned up ${result.filesDeleted} old versions (${result.bytesFreedFormatted})`
                            );
                          } catch {
                            toast.error('Failed to clean up old versions');
                          }
                        }
                      }}
                      disabled={cleanupOldVersions.isPending}
                      className="h-7 px-2 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      title="Delete versions older than 30 days"
                    >
                      {cleanupOldVersions.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Clean 30d+'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!folder.path) return;
                        if (
                          confirm(
                            `Delete ALL ${versionStorage.fileCount} versioned files? This cannot be undone.`
                          )
                        ) {
                          try {
                            const result = await cleanupVersions.mutateAsync(folder.path);
                            toast.success(
                              `Deleted ${result.filesDeleted} versions (${result.bytesFreedFormatted})`
                            );
                          } catch {
                            toast.error('Failed to clean up versions');
                          }
                        }
                      }}
                      disabled={cleanupVersions.isPending}
                      className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      title="Delete all versioned files"
                    >
                      {cleanupVersions.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Actions */}
            <div className="mb-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePause}
                disabled={pauseFolder.isPending || resumeFolder.isPending}
                className="flex-1"
              >
                {isPaused ? (
                  <>
                    <Play className="mr-1 h-4 w-4" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="mr-1 h-4 w-4" /> Pause
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare(folder.id, folder.label)}
                className="text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                title="Share folder"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRescan}
                disabled={rescanFolder.isPending || isPaused}
                title="Rescan"
              >
                <RefreshCw className={cn('h-4 w-4', rescanFolder.isPending && 'animate-spin')} />
              </Button>
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInExplorer}
                disabled={openInExplorer.isPending || !folder.path}
                className="text-muted-foreground hover:text-foreground flex-1"
                title="Open in file explorer"
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => folder.path && onBrowse(folder.id, folder.path, folder.label)}
                disabled={!folder.path}
                title="Browse files"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => folder.path && onConflicts(folder.id, folder.path, folder.label)}
                disabled={!folder.path}
                title="Resolve conflicts"
                className="text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onIgnorePatterns(folder.id, folder.label)}
                title="Ignore patterns"
              >
                <FileX className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={removeFolder.isPending}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                title="Remove folder"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </SpotlightCard>
  );
}

// Compact folder item for dashboard view
function CompactFolderItem({
  folder,
}: {
  folder: {
    id: string;
    label?: string;
    path?: string;
    paused?: boolean;
  };
}) {
  const { data: status } = useFolderStatus(folder.id);

  const isPaused = folder.paused;
  const isSyncing = status?.state === 'syncing';
  const needsSync = (status?.needFiles || 0) > 0;

  const getStatusBadge = () => {
    if (isPaused) return <Badge variant="secondary">Paused</Badge>;
    if (isSyncing) return <Badge variant="warning">Syncing</Badge>;
    if (needsSync) return <Badge variant="warning">Needs Sync</Badge>;
    return <Badge variant="success">Up to Date</Badge>;
  };

  return (
    <div
      className={cn(
        'hover:bg-secondary/30 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors',
        isPaused && 'opacity-60'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Folder className="text-primary h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-medium">
            {folder.label || folder.id}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {status?.localFiles?.toLocaleString() || 0} files •{' '}
            {formatBytes(status?.localBytes || 0)}
          </p>
        </div>
      </div>
      <div className="ml-3 shrink-0">{getStatusBadge()}</div>
    </div>
  );
}

export function FolderList({ compact = false }: { compact?: boolean }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    id: string;
    label?: string;
  } | null>(null);
  const [ignoreData, setIgnoreData] = useState<{
    id: string;
    label?: string;
  } | null>(null);
  const [browseData, setBrowseData] = useState<{
    id: string;
    path: string;
    label?: string;
  } | null>(null);
  const [conflictData, setConflictData] = useState<{
    id: string;
    path: string;
    label?: string;
  } | null>(null);
  const { data: config, isLoading, isError } = useConfig();
  const { data: systemStatus } = useSystemStatus();

  const localDeviceId = systemStatus?.myID;

  if (isLoading) {
    if (compact) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border bg-card/50">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !config?.folders?.length) {
    if (compact) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Folder className="text-muted-foreground mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm">No folders configured</p>
        </div>
      );
    }
    return (
      <>
        <Card className="border-border bg-card/50 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-foreground text-lg font-medium">No folders configured</p>
            <p className="text-muted-foreground mb-4 text-sm">Add folders to start syncing</p>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Folder
            </Button>
          </CardContent>
        </Card>
        <AddFolderDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      </>
    );
  }

  // Compact view for dashboard
  if (compact) {
    return (
      <div className="space-y-1">
        {config.folders.slice(0, 5).map((folder) => (
          <CompactFolderItem key={folder.id} folder={folder} />
        ))}
        {config.folders.length > 5 && (
          <p className="text-muted-foreground px-3 py-2 text-center text-xs">
            +{config.folders.length - 5} more folders
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {config.folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            devices={config.devices || []}
            localDeviceId={localDeviceId}
            onShare={(id, label) => setShareData({ id, label })}
            onIgnorePatterns={(id, label) => setIgnoreData({ id, label })}
            onBrowse={(id, path, label) => setBrowseData({ id, path, label })}
            onConflicts={(id, path, label) => setConflictData({ id, path, label })}
          />
        ))}
        {/* Add Folder Card */}
        <Card
          className="border-border bg-card/30 hover:border-primary/50 hover:bg-secondary/50 flex cursor-pointer items-center justify-center border-2 border-dashed transition-colors"
          onClick={() => setAddDialogOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
              <Plus className="text-primary h-6 w-6" />
            </div>
            <p className="text-foreground/80 mt-3 text-sm font-medium">Add Folder</p>
          </CardContent>
        </Card>
      </div>
      <AddFolderDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ShareFolderDialog
        open={!!shareData}
        onOpenChange={(open) => !open && setShareData(null)}
        folderId={shareData?.id || ''}
        folderLabel={shareData?.label}
      />
      <IgnorePatternsDialog
        open={!!ignoreData}
        onOpenChange={(open) => !open && setIgnoreData(null)}
        folderId={ignoreData?.id || ''}
        folderLabel={ignoreData?.label}
      />
      <FileBrowser
        open={!!browseData}
        onOpenChange={(open) => !open && setBrowseData(null)}
        folderId={browseData?.id || ''}
        folderPath={browseData?.path || ''}
        folderLabel={browseData?.label}
      />
      <ConflictResolver
        open={!!conflictData}
        onOpenChange={(open) => !open && setConflictData(null)}
        folderId={conflictData?.id || ''}
        folderPath={conflictData?.path || ''}
        folderLabel={conflictData?.label}
      />
    </>
  );
}
