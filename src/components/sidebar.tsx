'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Folder,
  Laptop,
  Settings,
  ChevronLeft,
  ChevronRight,
  ScrollText,
} from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'folders' as const, label: 'Folders', icon: Folder },
  { id: 'devices' as const, label: 'Devices', icon: Laptop },
  { id: 'logs' as const, label: 'Logs', icon: ScrollText },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, activeTab, setActiveTab } = useAppStore();

  // Listen for navigation events from toast notifications
  useEffect(() => {
    const handleNavigate = (event: CustomEvent<string>) => {
      const tab = event.detail as typeof activeTab;
      if (['dashboard', 'folders', 'devices', 'settings', 'logs'].includes(tab)) {
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

      {/* Toggle Button */}
      <div className="border-border border-t p-3">
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
