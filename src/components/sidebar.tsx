'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
        'flex h-full flex-col border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
        <Image src="/app_icon.png" alt="Eigen" width={32} height={32} className="rounded-lg" />
        {sidebarOpen && <span className="text-lg font-bold text-white">Eigen</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 text-slate-400 hover:bg-slate-800/50 hover:text-white',
              activeTab === item.id && 'bg-slate-800/50 text-white',
              !sidebarOpen && 'justify-center px-2'
            )}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </Button>
        ))}
      </nav>

      {/* Toggle Button */}
      <div className="border-t border-slate-800 p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-slate-400 hover:bg-slate-800/50 hover:text-white"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
