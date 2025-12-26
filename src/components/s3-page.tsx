'use client';

import { useState } from 'react';
import { MotionPage, MotionList, MotionItem } from '@/components/ui/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useS3Config,
  useS3ConnectionStatus,
  useS3Objects,
  useDeleteFile,
  useSyncFolder,
} from '@/hooks/s3';
import {
  Cloud,
  CloudOff,
  Settings,
  Upload,
  Download,
  Trash2,
  FolderSync,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  File,
  Folder,
  HardDrive,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { ConfigureS3Dialog } from '@/components/configure-s3-dialog';
import { UploadFileDialog } from '@/components/upload-file-dialog';
import { SyncFolderDialog } from '@/components/sync-folder-dialog';
import type { S3Object } from '@/lib/tauri-commands';

// =============================================================================
// Sub-components
// =============================================================================

function ConnectionStatusCard() {
  const { data: config, isLoading: configLoading } = useS3Config();
  const { data: status, isLoading: statusLoading, refetch } = useS3ConnectionStatus();
  const [showConfig, setShowConfig] = useState(false);

  const isLoading = configLoading || statusLoading;

  return (
    <>
      <Card className="border-border bg-card/50 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <Cloud className="text-green-500 h-5 w-5" />
              ) : (
                <CloudOff className="text-muted-foreground h-5 w-5" />
              )}
              <CardTitle className="text-lg">S3 Configuration</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : config?.is_configured ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Endpoint:</span>
                  <p className="font-mono text-xs truncate">{config.endpoint}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Region:</span>
                  <p className="font-mono text-xs">{config.region}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bucket:</span>
                  <p className="font-mono text-xs">{config.bucket_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prefix:</span>
                  <p className="font-mono text-xs">{config.path_prefix || '(none)'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  {status?.connected ? (
                    <>
                      <CheckCircle className="text-green-500 h-4 w-4" />
                      <span className="text-sm">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-500 h-4 w-4" />
                      <span className="text-sm">Disconnected</span>
                    </>
                  )}
                  {status?.bucket_accessible && (
                    <Badge variant="secondary" className="text-xs">
                      Bucket Accessible
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {status?.error_message && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertTriangle className="text-destructive h-4 w-4 mt-0.5" />
                  <span className="text-sm text-destructive">{status.error_message}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <CloudOff className="text-muted-foreground h-12 w-12 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-3">S3 not configured</p>
              <Button onClick={() => setShowConfig(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure S3
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfigureS3Dialog
        open={showConfig}
        onOpenChange={setShowConfig}
        currentConfig={config}
      />
    </>
  );
}

function S3ObjectCard({ object, onDelete }: { object: S3Object; onDelete: (key: string) => void }) {
  const isFolder = object.key.endsWith('/');
  const fileName = object.key.split('/').filter(Boolean).pop() || object.key;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${fileName}?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(object.key);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-md hover:bg-card/70 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isFolder ? (
              <Folder className="text-blue-500 h-5 w-5 flex-shrink-0" />
            ) : (
              <File className="text-muted-foreground h-5 w-5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{fileName}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                {!isFolder && <span>{formatBytes(object.size)}</span>}
                <span>{new Date(object.last_modified).toLocaleDateString()}</span>
                {object.storage_class && (
                  <Badge variant="outline" className="text-xs">
                    {object.storage_class}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ObjectBrowser() {
  const [prefix, setPrefix] = useState<string>('');
  const { data: objects, isLoading, refetch } = useS3Objects(prefix);
  const { mutate: deleteFile } = useDeleteFile();

  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">S3 Objects</CardTitle>
            <CardDescription>Browse and manage files in S3</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !objects?.objects.length && !objects?.common_prefixes.length ? (
          <div className="text-center py-12">
            <File className="text-muted-foreground h-12 w-12 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No objects found</p>
          </div>
        ) : (
          <MotionList className="space-y-2">
            {/* Show common prefixes (folders) */}
            {objects?.common_prefixes.map((prefix) => (
              <MotionItem key={prefix}>
                <Card className="border-border bg-card/50 backdrop-blur-md hover:bg-card/70 transition-colors cursor-pointer">
                  <CardContent className="p-4" onClick={() => setPrefix(prefix)}>
                    <div className="flex items-center gap-3">
                      <Folder className="text-blue-500 h-5 w-5" />
                      <span className="font-medium">{prefix.split('/').filter(Boolean).pop()}/</span>
                    </div>
                  </CardContent>
                </Card>
              </MotionItem>
            ))}

            {/* Show objects (files) */}
            {objects?.objects.map((object) => (
              <MotionItem key={object.key}>
                <S3ObjectCard
                  object={object}
                  onDelete={(key) => deleteFile(key)}
                />
              </MotionItem>
            ))}
          </MotionList>
        )}

        {objects?.is_truncated && (
          <div className="mt-4 text-center">
            <Badge variant="secondary">More objects available (pagination not implemented)</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const [showUpload, setShowUpload] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const { data: config } = useS3Config();

  const isConfigured = config?.is_configured ?? false;

  return (
    <>
      <Card className="border-border bg-card/50 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common S3 operations</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            disabled={!isConfigured}
            onClick={() => setShowUpload(true)}
          >
            <Upload className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Upload File</div>
              <div className="text-xs text-muted-foreground">Upload a single file</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            disabled={!isConfigured}
            onClick={() => setShowSync(true)}
          >
            <FolderSync className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Sync Folder</div>
              <div className="text-xs text-muted-foreground">Backup entire folder</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            disabled
          >
            <Download className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Restore Folder</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3"
            disabled
          >
            <HardDrive className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Storage Stats</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </div>
          </Button>
        </CardContent>
      </Card>

      <UploadFileDialog
        open={showUpload}
        onOpenChange={setShowUpload}
      />

      <SyncFolderDialog
        open={showSync}
        onOpenChange={setShowSync}
      />
    </>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export function S3Page() {
  return (
    <MotionPage className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-2xl font-semibold">S3 Storage</h2>
          <p className="text-muted-foreground text-sm mt-1">Cloud backup and archival storage</p>
        </div>
      </div>

      <ConnectionStatusCard />
      <QuickActions />
      <ObjectBrowser />
    </MotionPage>
  );
}
