'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { SyncthingManager } from './syncthing-manager';
import { ErrorBoundary } from './error-boundary';
import DebugPanel from './debug-panel';
import { registerDefaultHealthChecks } from '@/lib/health-monitor';
import {
	autoRecovery,
	registerDefaultRecoveryStrategies,
} from '@/lib/auto-recovery';
import { logger } from '@/lib/logger';

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000,
						refetchOnWindowFocus: false,
						retry: 3,
						retryDelay: (attemptIndex) =>
							Math.min(1000 * 2 ** attemptIndex, 30000),
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
			<QueryClientProvider client={queryClient}>
				<SyncthingManager>{children}</SyncthingManager>
				<Toaster
					position='bottom-right'
					theme='dark'
					richColors
					closeButton
				/>
				<DebugPanel />
			</QueryClientProvider>
		</ErrorBoundary>
	);
}
