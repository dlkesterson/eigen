'use client';

import { useState, useEffect } from 'react';
import { BaseDialog } from '@/components/ui/base-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfigureS3 } from '@/hooks/s3';
import type { S3ConfigPublic } from '@/lib/tauri-commands';
import { Loader2 } from 'lucide-react';

interface ConfigureS3DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig?: S3ConfigPublic;
}

function useDialogAdapter(onOpenChange: (open: boolean) => void) {
  return {
    onClose: () => onOpenChange(false),
  };
}

export function ConfigureS3Dialog({
  open,
  onOpenChange,
  currentConfig,
}: ConfigureS3DialogProps) {
  const { mutate: configure, isPending } = useConfigureS3();
  const { onClose } = useDialogAdapter(onOpenChange);

  const [endpoint, setEndpoint] = useState('https://s3.amazonaws.com');
  const [region, setRegion] = useState('us-east-1');
  const [bucketName, setBucketName] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [pathPrefix, setPathPrefix] = useState('');

  // Pre-fill form with current config when dialog opens
  useEffect(() => {
    if (currentConfig && open) {
      setEndpoint(currentConfig.endpoint);
      setRegion(currentConfig.region);
      setBucketName(currentConfig.bucket_name);
      setAccessKeyId(currentConfig.access_key_id);
      setPathPrefix(currentConfig.path_prefix || '');
      // Secret key is never returned from backend (security)
      setSecretAccessKey('');
    }
  }, [currentConfig, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bucketName || !accessKeyId || !secretAccessKey) {
      alert('Please fill in all required fields');
      return;
    }

    configure(
      {
        endpoint,
        region,
        bucketName,
        accessKeyId,
        secretAccessKey,
        pathPrefix: pathPrefix || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset secret key field for security
          setSecretAccessKey('');
        },
      }
    );
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Configure S3 Storage"
      description="Set up your S3 credentials and bucket settings"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="endpoint">S3 Endpoint</Label>
          <Input
            id="endpoint"
            type="url"
            placeholder="https://s3.amazonaws.com"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Use https://s3.amazonaws.com for AWS. For MinIO/B2/Wasabi, use their endpoint URL.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            type="text"
            placeholder="us-east-1"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket">Bucket Name *</Label>
          <Input
            id="bucket"
            type="text"
            placeholder="my-backup-bucket"
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            disabled={isPending}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accessKey">Access Key ID *</Label>
          <Input
            id="accessKey"
            type="text"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            disabled={isPending}
            required
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secretKey">Secret Access Key *</Label>
          <Input
            id="secretKey"
            type="password"
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            disabled={isPending}
            required
            autoComplete="current-password"
          />
          <p className="text-xs text-muted-foreground">
            Stored securely in system keyring (not saved in plain text)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prefix">Path Prefix (optional)</Label>
          <Input
            id="prefix"
            type="text"
            placeholder="eigen-backups/"
            value={pathPrefix}
            onChange={(e) => setPathPrefix(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Organize files under a specific path (e.g., "backups/eigen/")
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
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </form>
    </BaseDialog>
  );
}
