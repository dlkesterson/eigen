'use client';

import { useAppStore } from '@/store';
import { NetworkGraph } from '@/components/network-graph';
import { StatsOverview } from '@/components/stats-overview';
import { FolderList } from '@/components/folder-list';
import { DeviceList } from '@/components/device-list';
import { SettingsPage } from '@/components/settings-page';
import { LogsPage } from '@/components/logs-page';
import { MotionPage, MotionList, MotionItem } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';

function DashboardView() {
  return (
    <MotionPage className="space-y-8">
      {/* Network Visualization */}
      <MotionList>
        <MotionItem>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">Network Topology</h2>
            <NetworkGraph />
          </section>
        </MotionItem>

        {/* Stats Overview */}
        <MotionItem>
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Overview</h2>
            <StatsOverview />
          </section>
        </MotionItem>

        {/* Quick Folders Preview */}
        <MotionItem>
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-white">Recent Folders</h2>
            <FolderList />
          </section>
        </MotionItem>
      </MotionList>
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
    <main className="flex-1 overflow-auto p-6">
      <AnimatePresence mode="wait">
        <div key={activeTab}>{renderContent()}</div>
      </AnimatePresence>
    </main>
  );
}
