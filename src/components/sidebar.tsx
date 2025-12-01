'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { TABS, type TabId } from '@/constants';
import {
  LayoutDashboard,
  Folder,
  Laptop,
  Settings,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Bug,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import Image from 'next/image';

const iconMap = {
  dashboard: LayoutDashboard,
  folders: Folder,
  devices: Laptop,
  logs: ScrollText,
  settings: Settings,
} as const;

export function Sidebar() {
  const { t } = useTranslation();
  const {
    sidebarOpen,
    toggleSidebar,
    activeTab,
    setActiveTab,
    focusMode,
    toggleFocusMode,
    toggleDebugPanel,
  } = useAppStore();

  const navItems = TABS.map((id) => ({
    id,
    label: t(`nav.${id}`),
    icon: iconMap[id],
  }));

  // Listen for navigation events from toast notifications
  useEffect(() => {
    const handleNavigate = (event: CustomEvent<string>) => {
      const tab = event.detail as TabId;
      if (TABS.includes(tab as TabId)) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('navigate-to-tab', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate-to-tab', handleNavigate as EventListener);
    };
  }, [setActiveTab]);

  return (
    <aside
      className={cn(
        'border-border bg-card/50 z-30 flex h-full flex-col border-r backdrop-blur-xl transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="border-border flex h-16 items-center gap-3 border-b px-4">
        <Image src="/app_icon.png" alt="Eigen" width={32} height={32} className="rounded-lg" />
        {sidebarOpen && <span className="text-foreground text-lg font-bold">Eigen</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              'text-muted-foreground hover:bg-accent/50 hover:text-foreground relative w-full justify-start gap-3',
              !sidebarOpen && 'justify-center px-2'
            )}
            onClick={() => setActiveTab(item.id)}
          >
            {activeTab === item.id && (
              <motion.div
                layoutId="sidebar-active-indicator"
                className="bg-accent/50 absolute inset-0 z-0 rounded-md"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex items-center gap-3',
                activeTab === item.id && 'text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </span>
          </Button>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="border-border space-y-1 border-t p-3">
        {/* Focus Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:bg-accent hover:text-foreground w-full',
            sidebarOpen ? 'justify-start gap-3' : 'justify-center',
            focusMode && 'bg-primary/10 text-primary'
          )}
          onClick={toggleFocusMode}
          title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {focusMode ? (
            <Minimize2 className="h-4 w-4 shrink-0" />
          ) : (
            <Maximize2 className="h-4 w-4 shrink-0" />
          )}
          {sidebarOpen && <span>{focusMode ? 'Exit Focus' : 'Focus Mode'}</span>}
        </Button>

        {/* Debug Panel Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:bg-accent hover:text-foreground w-full',
            sidebarOpen ? 'justify-start gap-3' : 'justify-center'
          )}
          onClick={toggleDebugPanel}
          title="Debug Panel (Ctrl+Shift+D)"
        >
          <Bug className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Debug Panel</span>}
        </Button>

        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:bg-accent hover:text-foreground w-full justify-center"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
