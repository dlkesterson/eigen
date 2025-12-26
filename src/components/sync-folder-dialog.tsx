'use client';

import { useState } from 'react';
import { BaseDialog } from '@/components/ui/base-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSyncFolder } from '@/hooks/s3';
import { Loader2, FolderSync, Folder } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface SyncFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useDialogAdapter(onOpenChange: (open: boolean) => void) {
  return {
    onClose: () => onOpenChange(false),
  };
}

export function SyncFolderDialog({
  open: isOpen,
  onOpenChange,
}: SyncFolderDialogProps) {
  const { mutate: syncFolder, isPending } = useSyncFolder();
  const { onClose } = useDialogAdapter(onOpenChange);

  const [localPath, setLocalPath] = useState('');
  const [s3Prefix, setS3Prefix] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');

  const handleBrowse = async () => {
    const selected = await open({
      multiple: false,
      directory: true,
      title: 'Select folder to sync',
    });

    if (selected && typeof selected === 'string') {
      setLocalPath(selected);
      // Auto-suggest S3 prefix from folder name
      if (!s3Prefix) {
        const folderName = selected.split('/').pop() || '';
        setS3Prefix(`backups/${folderName}/`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!localPath || !s3Prefix) {
      alert('Please fill in all required fields');
      return;
    }

    // Parse exclude patterns (one per line, filter empty lines)
    const patterns = excludePatterns
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    syncFolder(
      {
        localFolderPath: localPath,
        s3FolderPrefix: s3Prefix,
        excludePatterns: patterns.length > 0 ? patterns : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setLocalPath('');
          setS3Prefix('');
          setExcludePatterns('');
        },
      }
    );
  };

  return (
    <BaseDialog
      open={isOpen}
      onClose={onClose}
      title="Sync Folder to S3"
      description="Upload an entire folder to S3 with incremental sync"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="localPath">Local Folder *</Label>
          <div className="flex gap-2">
            <Input
              id="localPath"
              type="text"
              placeholder="/path/to/folder"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              disabled={isPending}
              required
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleBrowse}
              disabled={isPending}
            >
              <Folder className="mr-2 h-4 w-4" />
              Browse
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3Prefix">S3 Folder Prefix *</Label>
          <Input
            id="s3Prefix"
            type="text"
            placeholder="backups/my-folder/"
            value={s3Prefix}
            onChange={(e) => setS3Prefix(e.target.value)}
            disabled={isPending}
            required
          />
          <p className="text-xs text-muted-foreground">
            S3 path where files will be uploaded (should end with /)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="exclude">Exclude Patterns (optional)</Label>
          <Textarea
            id="exclude"
            placeholder="*.tmp&#10;.git/**&#10;node_modules/**&#10;*.log"
            value={excludePatterns}
            onChange={(e) => setExcludePatterns(e.target.value)}
            disabled={isPending}
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Glob patterns to exclude, one per line (e.g., *.tmp, .git/**)
          </p>
        </div>

        <div className="bg-muted/50 border border-border rounded-md p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Incremental sync checks file sizes to detect changes.
            Only modified or new files will be uploaded.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <FolderSync className="mr-2 h-4 w-4" />
                Start Sync
              </>
            )}
          </Button>
        </div>
      </form>
    </BaseDialog>
  );
}
