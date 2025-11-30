'use client';

import { useState } from 'react';
import {
  useScanConflicts,
  useDeleteConflict,
  useResolveConflictKeepConflict,
  ConflictFile,
} from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  X,
  RefreshCw,
  Trash2,
  Check,
  FileWarning,
  File,
  Clock,
  HardDrive,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { toast } from 'sonner';

interface ConflictResolverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderPath: string;
  folderLabel?: string;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Unknown';
  try {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

function ConflictCard({
  conflict,
  folderPath,
  onResolve,
}: {
  conflict: ConflictFile;
  folderPath: string;
  onResolve: () => void;
}) {
  const deleteConflict = useDeleteConflict();
  const keepConflict = useResolveConflictKeepConflict();
  const [isResolving, setIsResolving] = useState(false);

  const handleKeepOriginal = async () => {
    setIsResolving(true);
    try {
      await deleteConflict.mutateAsync({
        folderPath,
        conflictFile: conflict.name,
      });
      toast.success('Conflict resolved - kept original file');
      onResolve();
    } catch (error) {
      toast.error('Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  const handleKeepConflict = async () => {
    setIsResolving(true);
    try {
      await keepConflict.mutateAsync({
        folderPath,
        originalFile: conflict.original,
        conflictFile: conflict.name,
      });
      toast.success('Conflict resolved - kept newer version');
      onResolve();
    } catch (error) {
      toast.error('Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <FileWarning className="h-5 w-5 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-foreground truncate font-medium">{conflict.original}</p>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                Conflict: {conflict.name}
              </p>
            </div>
          </div>

          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatBytes(conflict.size)}
            </span>
            {conflict.modTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(conflict.modTime)}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleKeepOriginal}
              disabled={isResolving}
              className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              {isResolving ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              Keep Original
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleKeepConflict}
              disabled={isResolving}
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              {isResolving ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              Keep This Version
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConflictResolver({
  open,
  onOpenChange,
  folderId,
  folderPath,
  folderLabel,
}: ConflictResolverProps) {
  const { data: conflicts, isLoading, refetch, isRefetching } = useScanConflicts(folderPath);

  if (!open) return null;

  const conflictList = conflicts || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="bg-background/95 border-border/50 flex max-h-[80vh] w-full max-w-2xl flex-col backdrop-blur-md">
        <CardHeader className="border-border/50 flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Conflict Resolution
            {conflictList.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                {conflictList.length}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw className={cn('h-4 w-4', (isLoading || isRefetching) && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <p className="text-muted-foreground text-sm">
              Folder: <span className="text-foreground">{folderLabel || folderId}</span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{folderPath}</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4 text-sm">Scanning for conflicts...</p>
            </div>
          ) : conflictList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-foreground mt-4 text-lg font-medium">No Conflicts</p>
              <p className="text-muted-foreground mt-2 text-sm">
                This folder has no file conflicts to resolve.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {conflictList.length} conflict
                {conflictList.length !== 1 ? 's' : ''} found. Choose which version to keep for each
                file.
              </p>
              {conflictList.map((conflict) => (
                <ConflictCard
                  key={conflict.name}
                  conflict={conflict}
                  folderPath={folderPath}
                  onResolve={() => refetch()}
                />
              ))}
            </div>
          )}
        </CardContent>

        <div className="border-border/50 border-t p-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Conflicts occur when the same file is modified on multiple devices simultaneously.
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
