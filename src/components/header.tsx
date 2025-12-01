'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { useSystemStatus, usePendingRequestsManager } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AISearchBar } from '@/components/ai-search-bar';
import { PendingRequestsDialog } from '@/components/pending-requests-dialog';
import { RefreshCw, Wifi, WifiOff, Bell } from 'lucide-react';

export function Header() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useAppStore();
  const { data: status, isError, refetch, isRefetching } = useSystemStatus();
  const { totalPending } = usePendingRequestsManager();
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  const isOnline = !isError && status?.myID;

  const handleSearchResultSelect = (_path: string) => {
    // Navigate to folders tab and potentially open file browser
    setActiveTab('folders');
    // TODO: Open file browser at the selected path
  };

  return (
    <>
      <header className="border-border bg-card/50 relative z-40 flex h-16 items-center justify-between border-b px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <h1 className="text-foreground text-xl font-semibold">
            {t(`nav.${activeTab}`, { defaultValue: t('nav.dashboard') })}
          </h1>
        </div>

        {/* AI Search Bar */}
        <div className="relative z-40 mx-4 max-w-md flex-1">
          <AISearchBar onResultSelect={handleSearchResultSelect} className="w-full" />
        </div>

        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <Badge variant={isOnline ? 'success' : 'destructive'}>
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
