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
		<header className='flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/50 px-6 backdrop-blur-xl'>
			<div className='flex items-center gap-4'>
				<h1 className='text-xl font-semibold text-white'>
					{titles[activeTab] || 'Dashboard'}
				</h1>
			</div>

			{/* AI Search Bar */}
			<div className='flex-1 max-w-md mx-4'>
				<AISearchBar
					onResultSelect={handleSearchResultSelect}
					className='w-full'
				/>
			</div>

			<div className='flex items-center gap-3'>
				{/* Connection Status */}
				<div className='flex items-center gap-2'>
					{isOnline ? (
						<Wifi className='h-4 w-4 text-emerald-400' />
					) : (
						<WifiOff className='h-4 w-4 text-red-400' />
					)}
					<Badge variant={isOnline ? 'success' : 'destructive'}>
						{isOnline ? 'Connected' : 'Offline'}
					</Badge>
				</div>

				{/* Refresh Button */}
				<Button
					variant='ghost'
					size='icon'
					onClick={() => refetch()}
					disabled={isRefetching}
					className='h-8 w-8 text-slate-400 hover:text-white'
					title='Refresh status'
				>
					<RefreshCw
						className={`h-4 w-4 ${
							isRefetching ? 'animate-spin' : ''
						}`}
					/>
				</Button>
			</div>
		</header>
	);
}
