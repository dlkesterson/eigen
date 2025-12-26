'use client';

import { useState } from 'react';
import { BaseDialog } from '@/components/ui/base-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUploadFile } from '@/hooks/s3';
import { Loader2, Upload, File } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useDialogAdapter(onOpenChange: (open: boolean) => void) {
  return {
    onClose: () => onOpenChange(false),
  };
}

export function UploadFileDialog({
  open: isOpen,
  onOpenChange,
}: UploadFileDialogProps) {
  const { mutate: uploadFile, isPending } = useUploadFile();
  const { onClose } = useDialogAdapter(onOpenChange);

  const [localPath, setLocalPath] = useState('');
  const [s3Key, setS3Key] = useState('');

  const handleBrowse = async () => {
    const selected = await open({
      multiple: false,
      directory: false,
      title: 'Select file to upload',
    });

    if (selected && typeof selected === 'string') {
      setLocalPath(selected);
      // Auto-suggest S3 key from filename
      if (!s3Key) {
        const filename = selected.split('/').pop() || '';
        setS3Key(filename);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!localPath) {
      alert('Please select a file to upload');
      return;
    }

    uploadFile(
      {
        localPath,
        s3Key: s3Key || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setLocalPath('');
          setS3Key('');
        },
      }
    );
  };

  return (
    <BaseDialog
      open={isOpen}
      onClose={onClose}
      title="Upload File to S3"
      description="Upload a single file to your S3 bucket"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="localPath">Local File *</Label>
          <div className="flex gap-2">
            <Input
              id="localPath"
              type="text"
              placeholder="/path/to/file.txt"
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
              <File className="mr-2 h-4 w-4" />
              Browse
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3Key">S3 Key (optional)</Label>
          <Input
            id="s3Key"
            type="text"
            placeholder="folder/file.txt"
            value={s3Key}
            onChange={(e) => setS3Key(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Target path in S3. Leave empty to use filename with configured prefix.
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
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      </form>
    </BaseDialog>
  );
}
