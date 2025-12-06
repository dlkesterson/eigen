/**
 * Device Details Panel — Layer 3 Glass Panel
 *
 * Per the UX guide: Click device → fly into Nexus Prism Chamber →
 * glass card with device details + edit form
 *
 * This component provides the glass panel content for device details.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Laptop,
  Smartphone,
  Server,
  Wifi,
  WifiOff,
  Pause,
  Play,
  RefreshCw,
  Settings,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Link2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes } from '@/lib/utils';
import { useConfig, useConnections, usePauseDevice, useResumeDevice } from '@/hooks/syncthing';

// =============================================================================
// Types
// =============================================================================

interface DeviceDetailsPanelProps {
  deviceId: string;
  onEdit?: () => void;
  onClose?: () => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'cyan',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: 'cyan' | 'green' | 'amber' | 'purple' | 'red';
}) {
  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className={cn('rounded-lg border p-4', colorClasses[color])}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs tracking-wider text-gray-400 uppercase">{label}</span>
      </div>
      <div className="font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

function DeviceIcon({ isOnline, isPaused }: { isOnline: boolean; isPaused: boolean }) {
  if (isPaused) {
    return <Pause className="h-8 w-8 text-amber-400" />;
  }
  if (isOnline) {
    return <Wifi className="h-8 w-8 text-green-400" />;
  }
  return <WifiOff className="h-8 w-8 text-gray-500" />;
}

// =============================================================================
// Main Component
// =============================================================================

export function DeviceDetailsPanel({ deviceId, onEdit, onClose }: DeviceDetailsPanelProps) {
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const pauseDevice = usePauseDevice();
  const resumeDevice = useResumeDevice();

  // Find device info
  const device = useMemo(() => {
    if (!config?.devices) return null;
    return config.devices.find((d) => d.deviceID === deviceId);
  }, [config, deviceId]);

  // Get connection info
  const connection = useMemo(() => {
    if (!connections?.connections) return null;
    return connections.connections[deviceId];
  }, [connections, deviceId]);

  const isLoading = configLoading || connectionsLoading;
  const isOnline = connection?.connected ?? false;
  const isPaused = device?.paused ?? false;

  // Calculate stats
  const stats = useMemo(() => {
    if (!connection) {
      return {
        inBytes: 0,
        outBytes: 0,
        inRate: 0,
        outRate: 0,
        address: 'Unknown',
        clientVersion: 'Unknown',
      };
    }

    return {
      inBytes: (connection.inBytesTotal as number) || 0,
      outBytes: (connection.outBytesTotal as number) || 0,
      inRate: (connection.inBytesPerSecond as number) || 0,
      outRate: (connection.outBytesPerSecond as number) || 0,
      address: connection.address || 'Unknown',
      clientVersion: connection.clientVersion || 'Unknown',
    };
  }, [connection]);

  // Get shared folders for this device
  const sharedFolders = useMemo(() => {
    if (!config?.folders) return [];
    return config.folders.filter((f) => f.devices?.some((d) => d.deviceID === deviceId));
  }, [config, deviceId]);

  const handleTogglePause = () => {
    if (isPaused) {
      resumeDevice.mutate(deviceId);
    } else {
      pauseDevice.mutate(deviceId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">Device not found</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with device status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl',
            isOnline ? 'bg-green-400/10' : isPaused ? 'bg-amber-400/10' : 'bg-gray-400/10'
          )}
        >
          <DeviceIcon isOnline={isOnline} isPaused={isPaused} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white">{device.name || 'Unnamed Device'}</h3>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                isOnline
                  ? 'border-green-400/50 text-green-400'
                  : isPaused
                    ? 'border-amber-400/50 text-amber-400'
                    : 'border-gray-500/50 text-gray-400'
              )}
            >
              {isPaused ? 'Paused' : isOnline ? 'Connected' : 'Offline'}
            </Badge>
            {stats.clientVersion !== 'Unknown' && (
              <span className="text-xs text-gray-500">v{stats.clientVersion}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Device ID */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="text-xs tracking-wider text-gray-400 uppercase">Device ID</span>
        </div>
        <code className="block font-mono text-xs break-all text-gray-300">{deviceId}</code>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-3"
      >
        <StatCard
          icon={ArrowDownToLine}
          label="Downloaded"
          value={formatBytes(stats.inBytes)}
          color="green"
        />
        <StatCard
          icon={ArrowUpFromLine}
          label="Uploaded"
          value={formatBytes(stats.outBytes)}
          color="cyan"
        />
        <StatCard
          icon={Clock}
          label="Download Rate"
          value={`${formatBytes(stats.inRate)}/s`}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Upload Rate"
          value={`${formatBytes(stats.outRate)}/s`}
          color="cyan"
        />
      </motion.div>

      {/* Connection Info */}
      {isOnline && stats.address !== 'Unknown' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-purple-400" />
            <span className="text-xs tracking-wider text-gray-400 uppercase">Connection</span>
          </div>
          <code className="font-mono text-sm text-gray-300">{stats.address}</code>
        </motion.div>
      )}

      {/* Shared Folders */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Shared Folders</span>
          <Badge variant="outline" className="border-purple-400/50 text-purple-400">
            {sharedFolders.length}
          </Badge>
        </div>
        {sharedFolders.length > 0 ? (
          <div className="space-y-2">
            {sharedFolders.slice(0, 5).map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2"
              >
                <span className="text-sm text-gray-300">{folder.label || folder.id}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    folder.paused
                      ? 'border-amber-400/30 text-amber-400'
                      : 'border-green-400/30 text-green-400'
                  )}
                >
                  {folder.paused ? 'Paused' : 'Active'}
                </Badge>
              </div>
            ))}
            {sharedFolders.length > 5 && (
              <p className="text-center text-xs text-gray-500">
                +{sharedFolders.length - 5} more folders
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No shared folders</p>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <Button
          variant="outline"
          className="flex-1 border-white/20 hover:bg-white/10"
          onClick={handleTogglePause}
          disabled={pauseDevice.isPending || resumeDevice.isPending}
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
        {onEdit && (
          <Button
            variant="outline"
            className="flex-1 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10"
            onClick={onEdit}
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit Device
          </Button>
        )}
      </motion.div>
    </div>
  );
}

export default DeviceDetailsPanel;
