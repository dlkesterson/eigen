/**
 * Folder Details Panel — Layer 3 Glass Panel
 *
 * Per the UX guide: Click folder → enter Obsidian Core Chamber →
 * glass panel with folder stats + file tree
 *
 * This component provides the glass panel content for folder details.
 * Theme-aware styling (dark/light mode).
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Folder,
  FolderOpen,
  File,
  Pause,
  Play,
  RefreshCw,
  Share2,
  Users,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';
import {
  useConfig,
  useFolderStatus,
  usePauseFolder,
  useResumeFolder,
  useRescanFolder,
  useOpenFolderInExplorer,
} from '@/hooks/syncthing';

// =============================================================================
// Types
// =============================================================================

interface FolderDetailsPanelProps {
  folderId: string;
  onShare?: () => void;
  onBrowse?: () => void;
  onEdit?: () => void;
  onClose?: () => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function StatRow({
  icon: Icon,
  label,
  value,
  color = 'gray',
  isDark = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | React.ReactNode;
  color?: 'cyan' | 'green' | 'amber' | 'purple' | 'red' | 'gray';
  isDark?: boolean;
}) {
  const colorClasses = {
    cyan: 'text-cyan-500',
    green: 'text-green-500',
    amber: 'text-amber-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
    gray: isDark ? 'text-gray-400' : 'text-slate-500',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', colorClasses[color])} />
        <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-slate-600')}>{label}</span>
      </div>
      <span className={cn('font-mono text-sm', isDark ? 'text-white' : 'text-slate-900')}>
        {value}
      </span>
    </div>
  );
}

function SyncStateIndicator({ state }: { state: string }) {
  const stateConfig: Record<
    string,
    { color: string; icon: React.ComponentType<{ className?: string }>; label: string }
  > = {
    idle: { color: 'text-green-400', icon: CheckCircle, label: 'Idle' },
    scanning: { color: 'text-cyan-400', icon: Loader2, label: 'Scanning' },
    syncing: { color: 'text-cyan-400', icon: RefreshCw, label: 'Syncing' },
    error: { color: 'text-red-400', icon: AlertTriangle, label: 'Error' },
    unknown: { color: 'text-gray-400', icon: HardDrive, label: 'Unknown' },
  };

  const config = stateConfig[state] || stateConfig.unknown;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('border-current', config.color)}>
      <Icon className={cn('mr-1 h-3 w-3', state === 'scanning' && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FolderDetailsPanel({
  folderId,
  onShare,
  onBrowse,
  onEdit: _onEdit,
  onClose: _onClose,
}: FolderDetailsPanelProps) {
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const { data: config, isLoading: configLoading } = useConfig();
  const { data: status, isLoading: statusLoading } = useFolderStatus(folderId);
  const pauseFolder = usePauseFolder();
  const resumeFolder = useResumeFolder();
  const rescanFolder = useRescanFolder();
  const openInExplorer = useOpenFolderInExplorer();

  // Find folder info
  const folder = useMemo(() => {
    if (!config?.folders) return null;
    return config.folders.find((f) => f.id === folderId);
  }, [config, folderId]);

  // Get shared devices
  const sharedDevices = useMemo(() => {
    if (!folder?.devices || !config?.devices) return [];
    const devices = config.devices;
    const localId = devices.find((d) => d.name === 'This Device')?.deviceID;

    return folder.devices
      .filter((fd) => fd.deviceID !== localId)
      .map((fd) => {
        const device = devices.find((d) => d.deviceID === fd.deviceID);
        return {
          deviceID: fd.deviceID,
          name: device?.name || fd.deviceID.slice(0, 8) + '...',
        };
      });
  }, [folder, config]);

  const isLoading = configLoading || statusLoading;
  const isPaused = folder?.paused ?? false;
  const isSyncing = status?.state === 'syncing';
  const state = status?.state || 'unknown';

  // Calculate sync progress
  const syncProgress = useMemo(() => {
    if (!status) return 0;
    const globalBytes = status.globalBytes || 0;
    const localBytes = status.localBytes || 0;
    if (globalBytes === 0) return 100;
    return Math.round((localBytes / globalBytes) * 100);
  }, [status]);

  const handleTogglePause = () => {
    if (isPaused) {
      resumeFolder.mutate(folderId);
    } else {
      pauseFolder.mutate(folderId);
    }
  };

  const handleRescan = () => {
    rescanFolder.mutate(folderId);
  };

  const handleOpenInExplorer = () => {
    if (folder?.path) {
      openInExplorer.mutate(folder.path);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!folder) {
    return (
      <div
        className={cn(
          'flex items-center justify-center py-12',
          isDark ? 'text-gray-400' : 'text-slate-500'
        )}
      >
        Folder not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl',
            isPaused ? 'bg-amber-400/10' : isSyncing ? 'bg-cyan-400/10' : 'bg-purple-400/10'
          )}
        >
          {isPaused ? (
            <Pause className="h-8 w-8 text-amber-400" />
          ) : isSyncing ? (
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          ) : (
            <FolderOpen className="h-8 w-8 text-purple-400" />
          )}
        </div>
        <div className="flex-1">
          <h3 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
            {folder.label || folder.id}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <SyncStateIndicator state={state} />
          </div>
        </div>
      </motion.div>

      {/* Path */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'rounded-lg border p-4',
          isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <Folder className="h-4 w-4 text-purple-500" />
          <span
            className={cn(
              'text-xs tracking-wider uppercase',
              isDark ? 'text-gray-400' : 'text-slate-500'
            )}
          >
            Path
          </span>
        </div>
        <code
          className={cn(
            'block font-mono text-xs break-all',
            isDark ? 'text-gray-300' : 'text-slate-600'
          )}
        >
          {folder.path || 'Unknown'}
        </code>
        {folder.path && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs text-cyan-500 hover:text-cyan-600"
            onClick={handleOpenInExplorer}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Open in Explorer
          </Button>
        )}
      </motion.div>

      {/* Sync Progress */}
      {isSyncing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn(
            'rounded-lg border p-4',
            isDark ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-cyan-500/30 bg-cyan-50'
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-cyan-500">Sync Progress</span>
            <span className={cn('font-mono text-sm', isDark ? 'text-white' : 'text-slate-900')}>
              {syncProgress}%
            </span>
          </div>
          <div
            className={cn(
              'h-2 w-full overflow-hidden rounded-full',
              isDark ? 'bg-gray-700' : 'bg-slate-200'
            )}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          'divide-y rounded-lg border p-4',
          isDark
            ? 'divide-white/10 border-white/10 bg-white/5'
            : 'divide-slate-200 border-slate-200 bg-slate-50'
        )}
      >
        <StatRow
          icon={File}
          label="Local Files"
          value={status?.localFiles?.toLocaleString() || '0'}
          color="cyan"
          isDark={isDark}
        />
        <StatRow
          icon={HardDrive}
          label="Local Size"
          value={formatBytes(status?.localBytes || 0)}
          color="purple"
          isDark={isDark}
        />
        <StatRow
          icon={File}
          label="Global Files"
          value={status?.globalFiles?.toLocaleString() || '0'}
          color="green"
          isDark={isDark}
        />
        <StatRow
          icon={HardDrive}
          label="Global Size"
          value={formatBytes(status?.globalBytes || 0)}
          color="green"
          isDark={isDark}
        />
        {(status?.needFiles || 0) > 0 && (
          <StatRow
            icon={AlertTriangle}
            label="Needs Sync"
            value={
              <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                {status?.needFiles} files
              </Badge>
            }
            color="amber"
            isDark={isDark}
          />
        )}
      </motion.div>

      {/* Shared With */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={cn(
          'rounded-lg border p-4',
          isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-500" />
            <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-900')}>
              Shared With
            </span>
          </div>
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-500">
            {sharedDevices.length}
          </Badge>
        </div>
        {sharedDevices.length > 0 ? (
          <div className="space-y-2">
            {sharedDevices.slice(0, 5).map((device) => (
              <div
                key={device.deviceID}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2',
                  isDark ? 'bg-white/5' : 'bg-white'
                )}
              >
                <HardDrive className={cn('h-4 w-4', isDark ? 'text-gray-400' : 'text-slate-500')} />
                <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-slate-700')}>
                  {device.name}
                </span>
              </div>
            ))}
            {sharedDevices.length > 5 && (
              <p className={cn('text-center text-xs', isDark ? 'text-gray-500' : 'text-slate-500')}>
                +{sharedDevices.length - 5} more devices
              </p>
            )}
          </div>
        ) : (
          <p className={cn('text-sm', isDark ? 'text-gray-500' : 'text-slate-500')}>
            Not shared with any devices
          </p>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-3"
      >
        <Button
          variant="outline"
          className={cn(
            isDark ? 'border-white/20 hover:bg-white/10' : 'border-slate-300 hover:bg-slate-100'
          )}
          onClick={handleTogglePause}
          disabled={pauseFolder.isPending || resumeFolder.isPending}
        >
          {isPaused ? (
            <>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </>
          ) : (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className={cn(
            isDark ? 'border-white/20 hover:bg-white/10' : 'border-slate-300 hover:bg-slate-100'
          )}
          onClick={handleRescan}
          disabled={rescanFolder.isPending || isSyncing}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', rescanFolder.isPending && 'animate-spin')} />
          Rescan
        </Button>
        {onShare && (
          <Button
            variant="outline"
            className={cn(
              'text-cyan-500',
              isDark
                ? 'border-cyan-400/30 hover:bg-cyan-400/10'
                : 'border-cyan-500/30 hover:bg-cyan-50'
            )}
            onClick={onShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}
        {onBrowse && (
          <Button
            variant="outline"
            className={cn(
              'text-purple-500',
              isDark
                ? 'border-purple-400/30 hover:bg-purple-400/10'
                : 'border-purple-500/30 hover:bg-purple-50'
            )}
            onClick={onBrowse}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
        )}
      </motion.div>
    </div>
  );
}

export default FolderDetailsPanel;
