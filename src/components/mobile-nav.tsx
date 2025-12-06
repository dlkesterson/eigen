'use client';

import { Command, Keyboard, Search, Bug } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

/**
 * Minimal mobile navigation for the unified 3D + Omnibox UI.
 *
 * On mobile, users navigate via:
 * - Omnibox: Search, commands, AI queries
 * - Focus Mode: Full 2D interface when needed
 *
 * The cosmic 3D dashboard is always the background.
 */
export function MobileNav() {
  const { toggleFocusMode, toggleDebugPanel } = useAppStore();

  const actions = [
    {
      id: 'search',
      icon: Search,
      label: 'Search',
      onClick: () => window.dispatchEvent(new CustomEvent('open-omnibox')),
    },
    {
      id: 'omnibox',
      icon: Command,
      label: 'Commands',
      onClick: () => window.dispatchEvent(new CustomEvent('open-omnibox')),
    },
    {
      id: 'focus',
      icon: Keyboard,
      label: 'Focus',
      onClick: toggleFocusMode,
    },
    {
      id: 'debug',
      icon: Bug,
      label: 'Debug',
      onClick: toggleDebugPanel,
    },
  ];

  return (
    <div className="safe-area-pb border-border bg-background/80 fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t backdrop-blur-xl md:hidden">
      {actions.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'flex min-w-14 flex-col items-center justify-center rounded-xl p-2 transition-all duration-200',
              'touch-manipulation active:scale-95',
              'text-muted-foreground hover:text-foreground'
            )}
            aria-label={item.label}
          >
            <Icon className="h-5 w-5" />
            <span className="mt-1 text-[10px] font-medium opacity-70">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
