'use client';

import { useState } from 'react';
import {
  useConfig,
  useConnections,
  useRemoveDevice,
  usePauseDevice,
  useResumeDevice,
  useSystemStatus,
} from '@/hooks/useSyncthing';
import { CardContent, CardHeader, CardTitle, CardDescription, Card } from '@/components/ui/card';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Laptop,
  Smartphone,
  Server,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Loader2,
  Pause,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddDeviceDialog } from './add-device-dialog';
import { toast } from 'sonner';

function DeviceCard({
  device,
  connectionInfo,
  isLocalDevice,
}: {
  device: { deviceID: string; name?: string; paused?: boolean };
  connectionInfo?: {
    connected?: boolean;
    address?: string;
    type?: string;
    clientVersion?: string;
  };
  isLocalDevice?: boolean;
}) {
  const removeDevice = useRemoveDevice();
  const pauseDevice = usePauseDevice();
  const resumeDevice = useResumeDevice();
  // Local device is always "connected" (it's this machine!)
  const isConnected = isLocalDevice ? true : connectionInfo?.connected;
  const isPaused = device.paused;

  const handleRemove = async () => {
    if (confirm(`Remove device "${device.name || device.deviceID.slice(0, 12)}"?`)) {
      try {
        await removeDevice.mutateAsync(device.deviceID);
        toast.success('Device removed');
      } catch {
        toast.error('Failed to remove device');
      }
    }
  };

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        await resumeDevice.mutateAsync(device.deviceID);
        toast.success(`Resumed syncing with ${device.name || 'device'}`);
      } else {
        await pauseDevice.mutateAsync(device.deviceID);
        toast.success(`Paused syncing with ${device.name || 'device'}`);
      }
    } catch {
      toast.error(`Failed to ${isPaused ? 'resume' : 'pause'} device`);
    }
  };

  const isPauseResumePending = pauseDevice.isPending || resumeDevice.isPending;

  // Determine device icon based on connection type
  const connectionType = connectionInfo?.type?.toLowerCase() || '';
  const isMobile = connectionType.includes('mobile') || connectionType.includes('phone');
  const isServer = connectionType.includes('server');

  return (
    <SpotlightCard
      className={cn(
        'group transition-all',
        isPaused && 'opacity-60',
        isConnected && 'border-emerald-500/30'
      )}
      spotlightColor={
        isConnected
          ? 'rgba(16, 185, 129, 0.15)'
          : isLocalDevice
            ? 'rgba(139, 92, 246, 0.15)'
            : undefined
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                isConnected ? 'bg-emerald-500/20' : isLocalDevice ? 'bg-violet-500/20' : 'bg-muted'
              )}
            >
              {isMobile ? (
                <Smartphone
                  className={cn(
                    'h-5 w-5',
                    isConnected
                      ? 'text-emerald-400'
                      : isLocalDevice
                        ? 'text-violet-400'
                        : 'text-muted-foreground'
                  )}
                />
              ) : isServer ? (
                <Server
                  className={cn(
                    'h-5 w-5',
                    isConnected
                      ? 'text-emerald-400'
                      : isLocalDevice
                        ? 'text-violet-400'
                        : 'text-muted-foreground'
                  )}
                />
              ) : (
                <Laptop
                  className={cn(
                    'h-5 w-5',
                    isConnected
                      ? 'text-emerald-400'
                      : isLocalDevice
                        ? 'text-violet-400'
                        : 'text-muted-foreground'
                  )}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-foreground flex items-center gap-2 truncate text-lg">
                {device.name || 'Unknown Device'}
                {isLocalDevice && (
                  <Badge variant="outline" className="border-violet-500/50 text-xs text-violet-400">
                    This Device
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {device.deviceID.slice(0, 12)}...
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPaused && <Badge variant="secondary">Paused</Badge>}
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="text-muted-foreground h-4 w-4" />
            )}
            {!isLocalDevice && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePauseResume}
                  disabled={isPauseResumePending}
                  className="text-muted-foreground h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-amber-500/10 hover:text-amber-400"
                  title={isPaused ? 'Resume syncing' : 'Pause syncing'}
                >
                  {isPauseResumePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemove}
                  disabled={removeDevice.isPending}
                  className="text-muted-foreground h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                >
                  {removeDevice.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="text-foreground font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          {connectionInfo?.address && (
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="text-foreground truncate font-mono text-xs">{connectionInfo.address}</p>
            </div>
          )}
          {connectionInfo?.clientVersion && (
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="text-foreground font-medium">{connectionInfo.clientVersion}</p>
            </div>
          )}
          {connectionInfo?.type && (
            <div>
              <p className="text-muted-foreground">Connection</p>
              <p className="text-foreground font-medium">{connectionInfo.type}</p>
            </div>
          )}
        </div>
      </CardContent>
    </SpotlightCard>
  );
}

export function DeviceList() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const {
    data: config,
    isLoading: configLoading,
    isError: configError,
    isFetching: configFetching,
  } = useConfig();
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: systemStatus } = useSystemStatus();

  // Only show skeleton on initial load, not on refetches
  const isInitialLoading = (configLoading || connectionsLoading) && !config;

  // Get local device ID from system status (this is the correct way)
  const localDeviceId = systemStatus?.myID;

  // Render content based on state
  const renderContent = () => {
    if (isInitialLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border bg-card/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
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

    if (configError || !config?.devices?.length) {
      return (
        <Card className="border-border bg-card/50 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Laptop className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-foreground text-lg font-medium">No devices configured</p>
            <p className="text-muted-foreground text-sm">Add devices to start syncing</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {config.devices.map((device) => (
          <DeviceCard
            key={device.deviceID}
            device={device}
            connectionInfo={connections?.connections?.[device.deviceID]}
            isLocalDevice={device.deviceID === localDeviceId}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {configFetching && !isInitialLoading && (
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        )}
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-violet-600 hover:bg-violet-700"
          disabled={isInitialLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>
      {renderContent()}
      {/* Dialog is always rendered to preserve state */}
      <AddDeviceDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
}
