'use client';

import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Wifi, WifiOff, Bell } from 'lucide-react';

interface HudPanelProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function HudPanel({ title, value, icon, className, onClick }: HudPanelProps) {
  return (
    <div
      className={cn(
        'w-56 rounded-lg border border-blue-400/40 bg-black/50 p-4 backdrop-blur-xl transition-all',
        onClick && 'cursor-pointer hover:border-cyan-400/60 hover:bg-black/60',
        className
      )}
      style={{
        boxShadow: '0 0 25px rgba(96, 165, 250, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)',
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">{title}</p>
          <p className="mt-2 font-mono text-sm font-semibold text-white">{value}</p>
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

// =============================================================================
// Status HUD — Connection, Settings, Notifications
// =============================================================================

interface StatusHudProps {
  isOnline: boolean;
  isRefetching: boolean;
  pendingCount: number;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenPending: () => void;
}

export function StatusHud({
  isOnline,
  isRefetching,
  pendingCount,
  onRefresh,
  onOpenSettings,
  onOpenPending,
}: StatusHudProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Connection Status Badge */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xl transition-all',
          isOnline
            ? 'border border-emerald-400/40 bg-emerald-900/30 text-emerald-400'
            : 'border border-red-400/40 bg-red-900/30 text-red-400'
        )}
        style={{
          boxShadow: isOnline
            ? '0 0 20px rgba(52, 211, 153, 0.2)'
            : '0 0 20px rgba(248, 113, 113, 0.2)',
        }}
      >
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span className="font-mono text-xs font-medium tracking-wide">
          {isOnline ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Pending Notifications */}
      {pendingCount > 0 && (
        <button
          onClick={onOpenPending}
          className={cn(
            'relative flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xl transition-all',
            'border border-amber-400/40 bg-amber-900/30 text-amber-400',
            'hover:border-amber-400/60 hover:bg-amber-900/40'
          )}
          style={{ boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)' }}
        >
          <Bell className="h-4 w-4" />
          <span className="font-mono text-xs font-medium">{pendingCount}</span>
          {/* Pulse indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
        </button>
      )}

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefetching}
        className={cn(
          'flex items-center justify-center rounded-full p-2.5 backdrop-blur-xl transition-all',
          'border border-white/20 bg-white/5 text-gray-400',
          'hover:border-cyan-400/40 hover:bg-cyan-900/20 hover:text-cyan-400',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        title="Refresh"
      >
        <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
      </button>

      {/* Settings Button */}
      <button
        onClick={onOpenSettings}
        className={cn(
          'flex items-center justify-center rounded-full p-2.5 backdrop-blur-xl transition-all',
          'border border-white/20 bg-white/5 text-gray-400',
          'hover:border-purple-400/40 hover:bg-purple-900/20 hover:text-purple-400'
        )}
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );
}
