'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystemStatus, usePendingRequestsManager } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PendingRequestsDialog } from '@/components/pending-requests-dialog';
import { RefreshCw, Wifi, WifiOff, Bell, Command, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Minimal header for the unified cosmic UI.
 *
 * Features:
 * - Omnibox trigger (main navigation method)
 * - Connection status
 * - Pending requests notification
 * - Refresh action
 */
export function Header() {
  const { t } = useTranslation();
  const { data: status, isError, refetch, isRefetching } = useSystemStatus();
  const { totalPending } = usePendingRequestsManager();
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  const isOnline = !isError && status?.myID;

  return (
    <>
      <header className="glass-panel relative z-40 flex h-14 items-center justify-between border-b border-white/10 px-4">
        {/* Left: Cosmic hint */}
        <div className="text-muted-foreground/60 flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-cyan-400/50" />
          <span className="hidden sm:inline">Cosmos</span>
        </div>

        {/* Center: Omnibox Trigger */}
        <button
          className={cn(
            'group flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2',
            'transition-all duration-200 hover:border-cyan-500/30 hover:bg-white/10',
            'focus:ring-2 focus:ring-cyan-500/50 focus:outline-none'
          )}
          onClick={() => window.dispatchEvent(new CustomEvent('open-omnibox'))}
        >
          <Command className="h-4 w-4 text-cyan-400" />
          <span className="text-muted-foreground text-sm">Search, commands, or ask AI...</span>
          <kbd className="text-muted-foreground/60 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
            ⌘K
          </kbd>
        </button>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Pending Requests Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPendingDialog(true)}
            className="text-muted-foreground hover:text-foreground relative h-8 w-8"
            title="Pending Requests"
          >
            <Bell className="h-4 w-4" />
            {totalPending > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {totalPending > 9 ? '9+' : totalPending}
              </span>
            )}
          </Button>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <Badge variant={isOnline ? 'success' : 'destructive'} className="hidden sm:flex">
              {isOnline ? t('common.connected') : t('common.disconnected')}
            </Badge>
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            title={t('common.refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Pending Requests Dialog */}
      <PendingRequestsDialog open={showPendingDialog} onClose={() => setShowPendingDialog(false)} />
    </>
  );
}
