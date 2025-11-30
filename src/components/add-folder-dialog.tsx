'use client';

import { useState } from 'react';
import { useAddFolderAdvanced } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FolderPlus,
  X,
  ChevronDown,
  ChevronUp,
  History,
  Clock,
  Trash2,
  Terminal,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { logger } from '@/lib/logger';

interface AddFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type VersioningType = '' | 'simple' | 'staggered' | 'trashcan' | 'external';

const versioningOptions = [
  {
    value: '' as VersioningType,
    label: 'No Versioning',
    description: 'Deleted or modified files are not preserved',
    icon: X,
  },
  {
    value: 'simple' as VersioningType,
    label: 'Simple',
    description: 'Keep a specified number of old versions',
    icon: History,
  },
  {
    value: 'staggered' as VersioningType,
    label: 'Staggered',
    description: 'Smart versioning: more frequent recent, sparse older',
    icon: Clock,
  },
  {
    value: 'trashcan' as VersioningType,
    label: 'Trash Can',
    description: 'Move deleted files to .stversions folder',
    icon: Trash2,
  },
  {
    value: 'external' as VersioningType,
    label: 'External',
    description: 'Use an external command for versioning',
    icon: Terminal,
  },
];

export function AddFolderDialog({ open, onOpenChange }: AddFolderDialogProps) {
  const [folderId, setFolderId] = useState('');
  const [folderLabel, setFolderLabel] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [versioning, setVersioning] = useState<{
    type: VersioningType;
    params: Record<string, string>;
  }>({ type: '', params: {} });
  const [rescanInterval, setRescanInterval] = useState(3600);
  const [fsWatcherEnabled, setFsWatcherEnabled] = useState(true);
  const [fsWatcherDelay, setFsWatcherDelay] = useState(10);
  const [ignorePerms, setIgnorePerms] = useState(false);

  const addFolder = useAddFolderAdvanced();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderId.trim()) {
      toast.error('Folder ID is required');
      return;
    }
    if (!folderPath.trim()) {
      toast.error('Folder path is required');
      return;
    }

    try {
      await addFolder.mutateAsync({
        folderId: folderId.trim(),
        folderLabel: folderLabel.trim() || folderId.trim(),
        folderPath: folderPath.trim(),
        versioningType: versioning.type || undefined,
        versioningParams: Object.keys(versioning.params).length > 0 ? versioning.params : undefined,
        rescanIntervalS: rescanInterval,
        fsWatcherEnabled,
        fsWatcherDelayS: fsWatcherDelay,
        ignorePerms,
      });
      toast.success('Folder added successfully');
      handleClose();
    } catch {
      toast.error('Failed to add folder');
    }
  };

  const handleClose = () => {
    setFolderId('');
    setFolderLabel('');
    setFolderPath('');
    setShowAdvanced(false);
    setVersioning({ type: '', params: {} });
    setRescanInterval(3600);
    setFsWatcherEnabled(true);
    setFsWatcherDelay(10);
    setIgnorePerms(false);
    onOpenChange(false);
  };

  const updateVersioningType = (type: VersioningType) => {
    const defaultParams: Record<VersioningType, Record<string, string>> = {
      '': {},
      simple: { keep: '5' },
      staggered: { maxAge: '31536000' },
      trashcan: { cleanoutDays: '0' },
      external: { command: '' },
    };
    setVersioning({ type, params: defaultParams[type] });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={handleClose} />
      <Card className="border-border bg-card/95 relative z-10 mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg">
                <FolderPlus className="text-primary h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-foreground">Add Folder</CardTitle>
                <p className="text-muted-foreground text-sm">Share a folder with your devices</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Folder ID *</label>
              <input
                type="text"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="my-folder"
                className="border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 focus:ring-1 focus:outline-hidden"
              />
              <p className="text-muted-foreground text-xs">Unique identifier for this folder</p>
            </div>

            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Label</label>
              <input
                type="text"
                value={folderLabel}
                onChange={(e) => setFolderLabel(e.target.value)}
                placeholder="My Folder"
                className="border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 focus:ring-1 focus:outline-hidden"
              />
              <p className="text-muted-foreground text-xs">Human-readable name (optional)</p>
            </div>

            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Path *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="/home/user/sync-folder"
                  className="border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const selected = await openDialog({
                        directory: true,
                        multiple: false,
                        title: 'Select Folder to Sync',
                      });
                      if (selected) {
                        setFolderPath(selected as string);
                      }
                    } catch (err) {
                      logger.warn('Failed to open folder picker', { error: err });
                    }
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">Absolute path to the folder</p>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-muted-foreground hover:text-foreground w-full justify-between"
            >
              <span>Advanced Options</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showAdvanced && (
              <div className="border-border bg-secondary/50 space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <label className="text-foreground text-sm font-medium">File Versioning</label>
                  <div className="grid gap-2">
                    {versioningOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateVersioningType(option.value)}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                            versioning.type === option.value
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-muted-foreground'
                          )}
                        >
                          <Icon
                            className={cn(
                              'mt-0.5 h-4 w-4',
                              versioning.type === option.value
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                          <div>
                            <p
                              className={cn(
                                'text-sm font-medium',
                                versioning.type === option.value
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {option.label}
                            </p>
                            <p className="text-muted-foreground text-xs">{option.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {versioning.type === 'simple' && (
                  <div className="space-y-2 pl-6">
                    <label className="text-muted-foreground text-sm">Versions to keep</label>
                    <input
                      type="number"
                      min="1"
                      value={versioning.params.keep || '5'}
                      onChange={(e) =>
                        setVersioning({
                          ...versioning,
                          params: {
                            keep: e.target.value,
                          },
                        })
                      }
                      className="border-border bg-secondary text-foreground w-full rounded border px-3 py-2"
                    />
                  </div>
                )}

                {versioning.type === 'staggered' && (
                  <div className="space-y-2 pl-6">
                    <label className="text-muted-foreground text-sm">Max age (seconds)</label>
                    <select
                      value={versioning.params.maxAge || '31536000'}
                      onChange={(e) =>
                        setVersioning({
                          ...versioning,
                          params: {
                            maxAge: e.target.value,
                          },
                        })
                      }
                      className="border-border bg-secondary text-foreground w-full rounded border px-3 py-2"
                    >
                      <option value="86400">1 day</option>
                      <option value="604800">1 week</option>
                      <option value="2592000">30 days</option>
                      <option value="31536000">1 year</option>
                      <option value="0">Forever</option>
                    </select>
                  </div>
                )}

                {versioning.type === 'trashcan' && (
                  <div className="space-y-2 pl-6">
                    <label className="text-muted-foreground text-sm">
                      Clean out after (days, 0 = never)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={versioning.params.cleanoutDays || '0'}
                      onChange={(e) =>
                        setVersioning({
                          ...versioning,
                          params: {
                            cleanoutDays: e.target.value,
                          },
                        })
                      }
                      className="border-border bg-secondary text-foreground w-full rounded border px-3 py-2"
                    />
                  </div>
                )}

                {versioning.type === 'external' && (
                  <div className="space-y-2 pl-6">
                    <label className="text-muted-foreground text-sm">Command</label>
                    <input
                      type="text"
                      value={versioning.params.command || ''}
                      onChange={(e) =>
                        setVersioning({
                          ...versioning,
                          params: {
                            command: e.target.value,
                          },
                        })
                      }
                      placeholder="/path/to/command %FOLDER_PATH% %FILE_PATH%"
                      className="border-border bg-secondary text-foreground w-full rounded border px-3 py-2 font-mono text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-foreground text-sm font-medium">Rescan Interval</label>
                  <select
                    value={rescanInterval}
                    onChange={(e) => setRescanInterval(parseInt(e.target.value))}
                    className="border-border bg-secondary text-foreground w-full rounded border px-3 py-2"
                  >
                    <option value={60}>1 minute</option>
                    <option value={300}>5 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={3600}>1 hour</option>
                    <option value={86400}>24 hours</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={fsWatcherEnabled}
                      onChange={(e) => setFsWatcherEnabled(e.target.checked)}
                      className="border-border bg-secondary text-primary h-4 w-4 rounded"
                    />
                    <div>
                      <span className="text-foreground text-sm">Enable File Watcher</span>
                      <p className="text-muted-foreground text-xs">Detect changes immediately</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={ignorePerms}
                      onChange={(e) => setIgnorePerms(e.target.checked)}
                      className="border-border bg-secondary text-primary h-4 w-4 rounded"
                    />
                    <div>
                      <span className="text-foreground text-sm">Ignore Permissions</span>
                      <p className="text-muted-foreground text-xs">
                        Useful for FAT/NTFS filesystems
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addFolder.isPending}
                className="bg-primary hover:bg-primary/90 flex-1"
              >
                {addFolder.isPending ? 'Adding...' : 'Add Folder'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
