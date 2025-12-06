import { Command, Settings, Search, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useVisualizationStore } from '@/store/omnibox';
import { useSystemStatus } from '@/hooks/syncthing';
import { cn } from '@/lib/utils';

/**
 * Minimal mobile navigation for the unified 3D + Omnibox UI.
 *
 * On mobile, users navigate via:
 * - Omnibox: Search, commands, AI queries
 * - Settings: Opens settings glass panel
 *
 * The cosmic 3D dashboard is always the background.
 */
export function MobileNav() {
  const { data: status, isError, refetch, isRefetching } = useSystemStatus();
  const { enterRoom } = useVisualizationStore();

  const isOnline = !isError && !!status?.myID;

  const actions = [
    {
      id: 'search',
      icon: Search,
      label: 'Search',
      onClick: () => window.dispatchEvent(new CustomEvent('open-omnibox')),
    },
    {
      id: 'commands',
      icon: Command,
      label: 'Commands',
      onClick: () => window.dispatchEvent(new CustomEvent('open-omnibox')),
    },
    {
      id: 'refresh',
      icon: RefreshCw,
      label: 'Refresh',
      onClick: () => refetch(),
      spinning: isRefetching,
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      onClick: () => enterRoom('settings'),
    },
  ];

  return (
    <div className="safe-area-pb border-border bg-background/80 fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t backdrop-blur-xl md:hidden">
      {/* Connection Status Indicator */}
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl p-2',
          isOnline ? 'text-emerald-400' : 'text-red-400'
        )}
      >
        {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        <span className="mt-1 text-[10px] font-medium opacity-70">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Action Buttons */}
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
            <Icon className={cn('h-5 w-5', item.spinning && 'animate-spin')} />
            <span className="mt-1 text-[10px] font-medium opacity-70">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
