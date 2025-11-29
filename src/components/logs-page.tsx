'use client';

import { useState, useEffect, useRef } from 'react';
import { useSystemLogs, LogEntry } from '@/hooks/useSyncthing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	RefreshCw,
	AlertCircle,
	AlertTriangle,
	Info,
	Bug,
	Download,
	Trash2,
	ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type LogLevel = 'all' | 'error' | 'warning' | 'info' | 'debug';

const levelConfig: Record<
	string,
	{ icon: typeof Info; color: string; bg: string }
> = {
	error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
	warning: {
		icon: AlertTriangle,
		color: 'text-yellow-500',
		bg: 'bg-yellow-500/10',
	},
	info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
	debug: { icon: Bug, color: 'text-gray-500', bg: 'bg-gray-500/10' },
	verbose: { icon: Bug, color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

export function LogsPage() {
	const [filter, setFilter] = useState<LogLevel>('all');
	const [autoScroll, setAutoScroll] = useState(true);
	const logContainerRef = useRef<HTMLDivElement>(null);

	const { data: logs, isLoading, refetch, isRefetching } = useSystemLogs();

	// Auto-scroll to bottom when new logs arrive
	useEffect(() => {
		if (autoScroll && logContainerRef.current) {
			logContainerRef.current.scrollTop =
				logContainerRef.current.scrollHeight;
		}
	}, [logs, autoScroll]);

	const logEntries = logs?.messages || [];

	// Convert numeric log level to string
	const getLevelString = (level?: number): string => {
		if (level === undefined) return 'info';
		// Syncthing log levels: 0=debug, 1=verbose, 2=info, 3=warning, 4=error
		switch (level) {
			case 0:
				return 'debug';
			case 1:
				return 'verbose';
			case 2:
				return 'info';
			case 3:
				return 'warning';
			case 4:
				return 'error';
			default:
				return 'info';
		}
	};

	const filteredLogs = logEntries.filter((log) => {
		if (filter === 'all') return true;
		const level = getLevelString(log.level);
		return level === filter;
	});

	const getLogLevel = (log: { level?: number; message?: string }): string => {
		if (log.level !== undefined) return getLevelString(log.level);
		// Try to infer from message
		const msg = log.message?.toLowerCase() || '';
		if (msg.includes('error') || msg.includes('failed')) return 'error';
		if (msg.includes('warning') || msg.includes('warn')) return 'warning';
		return 'info';
	};

	const handleExport = () => {
		if (!logEntries.length) return;
		const content = logEntries
			.map(
				(log) =>
					`[${log.when || ''}] [${getLevelString(
						log.level
					).toUpperCase()}] ${log.message || ''}`
			)
			.join('\n');

		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `syncthing-logs-${
			new Date().toISOString().split('T')[0]
		}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const formatTime = (timestamp?: string) => {
		if (!timestamp) return '';
		try {
			return new Date(timestamp).toLocaleTimeString();
		} catch {
			return timestamp;
		}
	};

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<h2 className='text-lg font-semibold text-white'>
					System Logs
				</h2>
				<div className='flex items-center gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={handleExport}
						disabled={!logEntries.length}
						className='border-slate-700 bg-slate-800/50 hover:bg-slate-700'
					>
						<Download className='mr-2 h-4 w-4' />
						Export
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => refetch()}
						disabled={isLoading || isRefetching}
						className='border-slate-700 bg-slate-800/50 hover:bg-slate-700'
					>
						<RefreshCw
							className={cn(
								'h-4 w-4',
								(isLoading || isRefetching) && 'animate-spin'
							)}
						/>
					</Button>
				</div>
			</div>

			<Card className='border-slate-800 bg-slate-900/50 backdrop-blur-md'>
				<CardHeader className='border-b border-slate-800 pb-4'>
					<div className='flex items-center justify-between'>
						<CardTitle className='text-base text-white'>
							Log Output
						</CardTitle>
						<div className='flex items-center gap-2'>
							{/* Filter buttons */}
							{(
								[
									'all',
									'error',
									'warning',
									'info',
									'debug',
								] as const
							).map((level) => (
								<Button
									key={level}
									variant={
										filter === level ? 'default' : 'ghost'
									}
									size='sm'
									onClick={() => setFilter(level)}
									className={cn(
										'text-xs capitalize',
										filter === level
											? 'bg-indigo-600 hover:bg-indigo-700'
											: 'text-slate-400 hover:text-white'
									)}
								>
									{level}
								</Button>
							))}
						</div>
					</div>
				</CardHeader>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='flex items-center justify-center py-12'>
							<RefreshCw className='h-8 w-8 animate-spin text-slate-400' />
						</div>
					) : filteredLogs.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-12 text-center'>
							<Info className='h-8 w-8 text-slate-500' />
							<p className='mt-2 text-sm text-slate-400'>
								No logs to display
							</p>
						</div>
					) : (
						<div
							ref={logContainerRef}
							className='h-[500px] overflow-auto font-mono text-xs'
						>
							{filteredLogs.map((log, index) => {
								const level = getLogLevel(log);
								const config =
									levelConfig[level] || levelConfig.info;
								const Icon = config.icon;

								return (
									<div
										key={index}
										className={cn(
											'flex items-start gap-2 border-b border-slate-800/50 px-4 py-2 hover:bg-slate-800/30',
											config.bg
										)}
									>
										<Icon
											className={cn(
												'mt-0.5 h-3 w-3 shrink-0',
												config.color
											)}
										/>
										<span className='shrink-0 text-slate-500'>
											{formatTime(log.when)}
										</span>
										<span className='flex-1 break-all text-slate-300'>
											{log.message}
										</span>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Auto-scroll toggle */}
			<div className='flex items-center justify-between'>
				<label className='flex items-center gap-2 text-sm text-slate-400'>
					<input
						type='checkbox'
						checked={autoScroll}
						onChange={(e) => setAutoScroll(e.target.checked)}
						className='rounded border-slate-600 bg-slate-800'
					/>
					Auto-scroll to new logs
				</label>
				<p className='text-xs text-slate-500'>
					{filteredLogs.length} log entries
				</p>
			</div>
		</div>
	);
}
