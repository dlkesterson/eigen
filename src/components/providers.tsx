import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { SyncthingManager } from './syncthing-manager';
import { ErrorBoundary } from './error-boundary';
import DebugPanel from './debug-panel';
import { FocusMode } from './focus-mode';
import { registerDefaultHealthChecks } from '@/lib/health-monitor';
import { autoRecovery, registerDefaultRecoveryStrategies } from '@/lib/auto-recovery';
import { logger } from '@/lib/logger';
import { SyncthingClientProvider } from '@/lib/api';
import { parseInviteUrl } from '@/hooks/useDeviceInvite';
import { ThemeProvider, useResolvedTheme } from './theme-provider';

// Themed Toaster component that respects theme settings
function ThemedToaster() {
  const resolvedTheme = useResolvedTheme();
  return <Toaster position="bottom-right" theme={resolvedTheme} richColors closeButton />;
}

// Deep link event handler
function DeepLinkHandler() {
  useEffect(() => {
    // Handle deep links when app is already running
    async function setupDeepLinkListener() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deepLink = await import('@tauri-apps/plugin-deep-link' as any);
        const onOpenUrl = deepLink.onOpenUrl as (
          callback: (urls: string[]) => void
        ) => Promise<() => void>;

        const unlisten = await onOpenUrl((urls: string[]) => {
          for (const url of urls) {
            const invitation = parseInviteUrl(url);
            if (invitation) {
              logger.info('Received device invitation via deep link', {
                deviceId: invitation.deviceId,
              });

              // Dispatch event to trigger add device dialog
              window.dispatchEvent(
                new CustomEvent('device-invite-received', {
                  detail: invitation,
                })
              );
            }
          }
        });

        return unlisten;
      } catch {
        // Not in Tauri environment or plugin not available
        logger.debug('Deep link plugin not available');
      }
    }

    const cleanupPromise = setupDeepLinkListener();

    return () => {
      cleanupPromise?.then((unlisten) => unlisten?.());
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000,
            refetchOnWindowFocus: false,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  // Register health checks and auto-recovery on mount
  useEffect(() => {
    logger.info('Eigen application starting', { version: '1.0.0' });
    registerDefaultHealthChecks();
    registerDefaultRecoveryStrategies();

    // Start auto-recovery monitoring
    autoRecovery.startMonitoring(15000); // Check every 15 seconds

    return () => {
      logger.info('Eigen application unmounting');
      autoRecovery.stopMonitoring();
    };
  }, []);

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <SyncthingClientProvider>
            <ThemeProvider>
              <DeepLinkHandler />
              <SyncthingManager>{children}</SyncthingManager>
              <ThemedToaster />
              <DebugPanel />
              <FocusMode />
            </ThemeProvider>
          </SyncthingClientProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
