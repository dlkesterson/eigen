'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/store';
import { FolderList } from '@/components/folder-list';
import { DeviceList } from '@/components/device-list';
import { SettingsPage } from '@/components/settings-page';
import { LogsPage } from '@/components/logs-page';
import { S3Page } from '@/components/s3-page';
import { MotionPage } from '@/components/ui/motion';
import { AnimatePresence } from 'framer-motion';

// Dynamically import the 3D dashboard to avoid SSR issues with Three.js
const ConstellationDashboard = dynamic(
  () =>
    import('@/components/constellation/constellation-dashboard').then(
      (mod) => mod.ConstellationDashboard
    ),
  { ssr: false }
);

function DashboardView() {
  return (
    <MotionPage className="h-full">
      <ConstellationDashboard />
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

function S3View() {
  return (
    <MotionPage>
      <S3Page />
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
      case 's3':
        return <S3View />;
      case 'logs':
        return <LogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <main className="relative z-0 flex h-full flex-1 flex-col overflow-hidden p-4">
      <AnimatePresence mode="wait">
        <div key={activeTab} className="h-full flex-1">
          {renderContent()}
        </div>
      </AnimatePresence>
    </main>
  );
}
