'use client';

import { useAppStore } from '@/store';
import { useSystemStatus } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AISearchBar } from '@/components/ai-search-bar';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export function Header() {
  const { activeTab, setActiveTab } = useAppStore();
  const { data: status, isError, refetch, isRefetching } = useSystemStatus();

  const isOnline = !isError && status?.myID;

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    folders: 'Folders',
    devices: 'Devices',
    settings: 'Settings',
  };

  const handleSearchResultSelect = (path: string) => {
    // Navigate to folders tab and potentially open file browser
    setActiveTab('folders');
    // TODO: Open file browser at the selected path
    console.log('Selected file:', path);
  };

  return (
    <header className="border-border bg-card/50 relative z-40 flex h-16 items-center justify-between border-b px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <h1 className="text-foreground text-xl font-semibold">
          {titles[activeTab] || 'Dashboard'}
        </h1>
      </div>

      {/* AI Search Bar */}
      <div className="relative z-40 mx-4 max-w-md flex-1">
        <AISearchBar onResultSelect={handleSearchResultSelect} className="w-full" />
      </div>

      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          <Badge variant={isOnline ? 'success' : 'destructive'}>
            {isOnline ? 'Connected' : 'Offline'}
          </Badge>
        </div>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="text-muted-foreground hover:text-foreground h-8 w-8"
          title="Refresh status"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </header>
  );
}
