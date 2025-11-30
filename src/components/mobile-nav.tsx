'use client';

import { LayoutDashboard, Folder, Laptop, Settings, ScrollText } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'folders' as const, icon: Folder, label: 'Folders' },
  { id: 'devices' as const, icon: Laptop, label: 'Devices' },
  { id: 'logs' as const, icon: ScrollText, label: 'Logs' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
];

export function MobileNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="safe-area-pb border-border bg-background/95 fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t backdrop-blur-xl md:hidden">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              'flex min-w-14 flex-col items-center justify-center rounded-xl p-2 transition-all duration-200',
              'touch-manipulation active:scale-95',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
            <span
              className={cn(
                'mt-1 text-[10px] font-medium transition-opacity',
                isActive ? 'opacity-100' : 'opacity-70'
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
