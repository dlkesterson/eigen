'use client';

import { useState, useEffect } from 'react';
import {
  useOpenFolderInExplorer,
  useBrowseFolder,
  useBrowseVersions,
  useRestoreVersion,
  VersionEntry,
} from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickLook, useQuickLook } from '@/components/quick-look';
import {
  FolderOpen,
  X,
  RefreshCw,
  File,
  Folder,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Home,
  History,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderPath: string;
  folderLabel?: string;
}

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modTime?: string;
  permissions?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateInput: string | number): string {
  try {
    const date =
      typeof dateInput === 'number'
        ? new Date(dateInput * 1000) // Unix timestamp in seconds
        : new Date(dateInput);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateInput);
  }
}

export function FileBrowser({
  open,
  onOpenChange,
  folderId,
  folderPath,
  folderLabel,
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const quickLook = useQuickLook();
  const openInExplorer = useOpenFolderInExplorer();
  const restoreVersion = useRestoreVersion();

  const {
    data: contents,
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useBrowseFolder(folderId, currentPath.length > 0 ? currentPath.join('/') : undefined);

  const {
    data: versions,
    isLoading: isLoadingVersions,
    refetch: refetchVersions,
  } = useBrowseVersions(folderPath, currentPath.length > 0 ? currentPath.join('/') : undefined);

  // Sort entries for consistent indexing
  const sortedEntries = [
    ...(showVersions
      ? (versions as VersionEntry[] | undefined) || []
      : (contents as FileEntry[] | undefined) || []),
  ].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  // Keyboard navigation and Quick Look
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedIndex !== null && sortedEntries[selectedIndex]) {
        e.preventDefault();
        const entry = sortedEntries[selectedIndex];
        if (entry.type === 'file') {
          const filePath =
            currentPath.length > 0
              ? `${folderPath}/${currentPath.join('/')}/${entry.name}`
              : `${folderPath}/${entry.name}`;
          quickLook.openQuickLook({
            name: entry.name,
            path: filePath,
            size: entry.size,
          });
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, sortedEntries.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)));
      } else if (e.key === 'Enter' && selectedIndex !== null) {
        const entry = sortedEntries[selectedIndex];
        if (entry?.type === 'directory') {
          setCurrentPath([...currentPath, entry.name]);
          setSelectedIndex(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, sortedEntries, currentPath, folderPath, quickLook]);

  // Reset selection when path changes - use microtask to avoid synchronous setState
  useEffect(() => {
    queueMicrotask(() => {
      setSelectedIndex(null);
    });
  }, [currentPath]);

  if (!open) return null;

  const isLoading = showVersions ? isLoadingVersions : isLoadingFiles;
  const refetch = showVersions ? refetchVersions : refetchFiles;
  const fileEntries = sortedEntries;

  const handleNavigate = (entry: FileEntry | VersionEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath([...currentPath, entry.name]);
      setSelectedIndex(null);
    }
  };

  const handleRestoreVersion = async (entry: VersionEntry) => {
    try {
      const versionPath =
        currentPath.length > 0 ? `${currentPath.join('/')}/${entry.name}` : entry.name;
      const originalPath =
        currentPath.length > 0
          ? `${currentPath.join('/')}/${entry.originalName}`
          : entry.originalName;

      await restoreVersion.mutateAsync({
        folderPath,
        versionPath,
        originalName: originalPath,
        overwrite: true,
      });
      toast.success(`Restored ${entry.originalName}`);
    } catch {
      toast.error('Failed to restore file');
    }
  };

  const handleGoBack = () => {
    setCurrentPath(currentPath.slice(0, -1));
  };

  const handleGoHome = () => {
    setCurrentPath([]);
  };

  const handleOpenInExplorer = async () => {
    try {
      const fullPath =
        currentPath.length > 0 ? `${folderPath}/${currentPath.join('/')}` : folderPath;
      await openInExplorer.mutateAsync(fullPath);
      toast.success('Opened in file explorer');
    } catch {
      toast.error('Failed to open in file explorer');
    }
  };

  const breadcrumbs = [
    {
      name: showVersions ? '.stversions' : folderLabel || folderId,
      path: [],
    },
    ...currentPath.map((segment, index) => ({
      name: segment,
      path: currentPath.slice(0, index + 1),
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="bg-background/95 border-border/50 flex max-h-[80vh] w-full max-w-3xl flex-col backdrop-blur-md">
        <CardHeader className="border-border/50 flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            {showVersions ? (
              <History className="h-5 w-5 text-amber-500" />
            ) : (
              <FolderOpen className="text-muted-foreground h-5 w-5" />
            )}
            {showVersions ? 'Version History' : 'File Browser'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showVersions ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setShowVersions(!showVersions);
                setCurrentPath([]);
              }}
              className={cn(showVersions && 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30')}
              title={showVersions ? 'Show current files' : 'Show file versions'}
            >
              <History className="mr-1 h-4 w-4" />
              {showVersions ? 'Versions' : 'History'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenInExplorer}
              disabled={openInExplorer.isPending || showVersions}
              title="Open in system file explorer"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Navigation Bar */}
        <div className="border-border/50 flex items-center gap-2 border-b p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoHome}
            disabled={currentPath.length === 0}
            className="h-8 w-8"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            disabled={currentPath.length === 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Breadcrumbs */}
          <div className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="text-muted-foreground mx-1 h-4 w-4" />}
                <button
                  onClick={() => setCurrentPath(crumb.path)}
                  className={cn(
                    'hover:bg-muted/50 max-w-[150px] truncate rounded px-2 py-1 transition-colors',
                    index === breadcrumbs.length - 1
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                  title={crumb.name}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <RefreshCw className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : fileEntries.length === 0 ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                {showVersions ? (
                  <>
                    <History className="mb-2 h-12 w-12" />
                    <p>No file versions found</p>
                    <p className="mt-1 text-xs">
                      Enable versioning on this folder to keep file history
                    </p>
                  </>
                ) : (
                  <>
                    <Folder className="mb-2 h-12 w-12" />
                    <p>This folder is empty</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-border/30 divide-y">
                {/* Already sorted in sortedEntries */}
                {fileEntries.map((entry, index) => {
                  const versionEntry = entry as VersionEntry;
                  const isVersionFile = showVersions && entry.type === 'file';
                  const isSelected = selectedIndex === index;

                  return (
                    <div
                      key={index}
                      className={cn(
                        'group flex items-center gap-3 px-4 py-2 transition-colors',
                        entry.type === 'directory' && 'cursor-pointer',
                        isSelected ? 'bg-primary/20' : 'hover:bg-muted/30'
                      )}
                      onClick={() => {
                        setSelectedIndex(index);
                        if (entry.type === 'directory') {
                          handleNavigate(entry);
                        }
                      }}
                      onDoubleClick={() => {
                        if (entry.type === 'file') {
                          const filePath =
                            currentPath.length > 0
                              ? `${folderPath}/${currentPath.join('/')}/${entry.name}`
                              : `${folderPath}/${entry.name}`;
                          quickLook.openQuickLook({
                            name: entry.name,
                            path: filePath,
                            size: entry.size,
                          });
                        }
                      }}
                    >
                      {entry.type === 'directory' ? (
                        <Folder className="h-5 w-5 shrink-0 text-blue-400" />
                      ) : showVersions ? (
                        <Clock className="h-5 w-5 shrink-0 text-amber-400" />
                      ) : (
                        <File className="text-muted-foreground h-5 w-5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {showVersions && versionEntry.originalName
                            ? versionEntry.originalName
                            : entry.name}
                        </p>
                        {isVersionFile && versionEntry.versionTime && (
                          <p className="text-xs text-amber-500/70">
                            Version from {versionEntry.versionTime}
                          </p>
                        )}
                      </div>
                      {entry.size !== undefined && entry.type === 'file' && (
                        <span className="text-muted-foreground text-xs">
                          {formatBytes(entry.size)}
                        </span>
                      )}
                      {entry.modTime && !isVersionFile && (
                        <span className="text-muted-foreground hidden text-xs sm:block">
                          {formatDate(entry.modTime)}
                        </span>
                      )}
                      {isVersionFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-amber-500/10 hover:text-amber-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreVersion(versionEntry);
                          }}
                          disabled={restoreVersion.isPending}
                        >
                          <RotateCcw className="mr-1 h-4 w-4" />
                          Restore
                        </Button>
                      )}
                      {entry.type === 'directory' && (
                        <ChevronRight className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>

        <div className="border-border/50 text-muted-foreground flex items-center justify-between border-t p-3 text-xs">
          <span>{fileEntries.length} items • Press Space to preview</span>
          <span className="max-w-[300px] truncate" title={folderPath}>
            {folderPath}
          </span>
        </div>
      </Card>

      {/* Quick Look Preview */}
      {quickLook.selectedFile && (
        <QuickLook
          open={quickLook.isOpen}
          onClose={quickLook.closeQuickLook}
          fileName={quickLook.selectedFile.name}
          filePath={quickLook.selectedFile.path}
          fileSize={quickLook.selectedFile.size}
        />
      )}
    </div>
  );
}
