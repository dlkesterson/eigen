'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { Toaster } from 'sonner';
import { SyncthingManager } from './syncthing-manager';

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

	return (
		<QueryClientProvider client={queryClient}>
			<SyncthingManager>{children}</SyncthingManager>
			<Toaster
				position='bottom-right'
				theme='dark'
				richColors
				closeButton
			/>
		</QueryClientProvider>
	);
}
