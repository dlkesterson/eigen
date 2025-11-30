'use client';

import { useAppStore } from '@/store';
import { NetworkGraphLive } from '@/components/network-graph-live';
import { StatsOverview } from '@/components/stats-overview';
import { FolderList } from '@/components/folder-list';
import { DeviceList } from '@/components/device-list';
import { SettingsPage } from '@/components/settings-page';
import { LogsPage } from '@/components/logs-page';
import { MotionPage, MotionList, MotionItem } from '@/components/ui/motion';
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Network, Folder, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useSystemStatus, useConnections } from '@/hooks/useSyncthing';
import { Counter } from '@/components/ui/counter';
import { formatBytes } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function DashboardView() {
  const { data: status, isError: statusError } = useSystemStatus();
  const { data: connections } = useConnections();

  const connectedDevices = Object.values(connections?.connections || {}).filter(
    (c) => c?.connected
  ).length;
  const totalDevices = Object.keys(connections?.connections || {}).length;
  const inBytes = connections?.total?.inBytesTotal || 0;
  const outBytes = connections?.total?.outBytesTotal || 0;

  return (
    <MotionPage>
      <BentoGrid className="lg:grid-cols-4">
        {/* Network Graph - Large tile spanning 2 cols and 2 rows with shine border */}
        <BentoCard colSpan={2} rowSpan={2} spotlightColor="rgba(99, 102, 241, 0.15)" shineBorder>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">Network Topology</h3>
            <Network className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="flex-1">
            <NetworkGraphLive />
          </div>
        </BentoCard>

        {/* Status Card */}
        <BentoCard
          spotlightColor={statusError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">Status</h3>
            <Activity className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="mt-4 flex flex-1 items-center gap-3">
            <motion.div
              className="text-foreground text-3xl font-bold"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {statusError ? 'Offline' : 'Online'}
            </motion.div>
            <Badge variant={statusError ? 'destructive' : 'success'}>
              {statusError ? 'Disconnected' : 'Connected'}
            </Badge>
          </div>
        </BentoCard>

        {/* Devices Card */}
        <BentoCard spotlightColor="rgba(139, 92, 246, 0.15)">
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">Devices</h3>
            <Network className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="mt-4 flex flex-1 items-center gap-3">
            <span className="text-foreground text-3xl font-bold">
              {connectedDevices}/{totalDevices}
            </span>
            {connectedDevices === totalDevices && totalDevices > 0 && (
              <Badge variant="success">All Connected</Badge>
            )}
          </div>
        </BentoCard>

        {/* Download Stats */}
        <BentoCard spotlightColor="rgba(16, 185, 129, 0.15)">
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">Downloaded</h3>
            <ArrowDownToLine className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="mt-4 flex-1">
            <span className="text-foreground text-3xl font-bold">
              <Counter value={inBytes} formattingFn={formatBytes} />
            </span>
          </div>
        </BentoCard>

        {/* Upload Stats */}
        <BentoCard spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">Uploaded</h3>
            <ArrowUpFromLine className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="mt-4 flex-1">
            <span className="text-foreground text-3xl font-bold">
              <Counter value={outBytes} formattingFn={formatBytes} />
            </span>
          </div>
        </BentoCard>

        {/* Folders Preview - Large tile */}
        <BentoCard colSpan={2} rowSpan={2} spotlightColor="rgba(99, 102, 241, 0.1)">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-muted-foreground text-sm font-medium">Synced Folders</h3>
            <Folder className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="flex-1 overflow-auto">
            <FolderList />
          </div>
        </BentoCard>
      </BentoGrid>
    </MotionPage>
  );
}

function FoldersView() {
  return (
    <MotionPage className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">All Folders</h2>
      </div>
      <FolderList />
    </MotionPage>
  );
}

function DevicesView() {
  return (
    <MotionPage className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">All Devices</h2>
      </div>
      <DeviceList />
    </MotionPage>
  );
}

function LogsView() {
  return (
    <MotionPage>
      <LogsPage />
    </MotionPage>
  );
}

function SettingsView() {
  return (
    <MotionPage>
      <SettingsPage />
    </MotionPage>
  );
}

export function MainContent() {
  const { activeTab } = useAppStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'folders':
        return <FoldersView />;
      case 'devices':
        return <DevicesView />;
      case 'logs':
        return <LogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <main className="relative z-0 flex-1 overflow-auto p-6">
      <AnimatePresence mode="wait">
        <div key={activeTab}>{renderContent()}</div>
      </AnimatePresence>
    </main>
  );
}
