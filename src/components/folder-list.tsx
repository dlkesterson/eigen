'use client';

import { useState } from 'react';
import {
	useConfig,
	useFolderStatus,
	usePauseFolder,
	useResumeFolder,
	useRescanFolder,
	useRemoveFolder,
	useOpenFolderInExplorer,
	useUnshareFolder,
	useSystemStatus,
} from '@/hooks/useSyncthing';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes } from '@/lib/utils';
import {
	Folder,
	Pause,
	Play,
	RefreshCw,
	Trash2,
	Plus,
	Share2,
	FileX,
	FolderOpen,
	ExternalLink,
	AlertTriangle,
	Users,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddFolderDialog } from '@/components/add-folder-dialog';
import { ShareFolderDialog } from '@/components/share-folder-dialog';
import { IgnorePatternsDialog } from '@/components/ignore-patterns-dialog';
import { FileBrowser } from '@/components/file-browser';
import { ConflictResolver } from '@/components/conflict-resolver';
import { toast } from 'sonner';

function FolderCard({
	folder,
	devices,
	localDeviceId,
	onShare,
	onIgnorePatterns,
	onBrowse,
	onConflicts,
}: {
	folder: {
		id: string;
		label?: string;
		path?: string;
		paused?: boolean;
		devices?: { deviceID: string }[];
	};
	devices: { deviceID: string; name?: string }[];
	localDeviceId?: string;
	onShare: (id: string, label?: string) => void;
	onIgnorePatterns: (id: string, label?: string) => void;
	onBrowse: (id: string, path: string, label?: string) => void;
	onConflicts: (id: string, path: string, label?: string) => void;
}) {
	const { data: status, isLoading } = useFolderStatus(folder.id);
	const pauseFolder = usePauseFolder();
	const resumeFolder = useResumeFolder();
	const rescanFolder = useRescanFolder();
	const removeFolder = useRemoveFolder();
	const openInExplorer = useOpenFolderInExplorer();
	const unshareFolder = useUnshareFolder();

	const isPaused = folder.paused;
	const isSyncing = status?.state === 'syncing';
	const needsSync = (status?.needFiles || 0) > 0;

	// Get list of shared devices (excluding local device)
	const sharedDevices = (folder.devices || [])
		.filter((fd) => fd.deviceID !== localDeviceId)
		.map((fd) => {
			const device = devices.find((d) => d.deviceID === fd.deviceID);
			return {
				deviceID: fd.deviceID,
				name: device?.name || fd.deviceID.slice(0, 8) + '...',
			};
		});

	const handleUnshare = async (deviceId: string, deviceName: string) => {
		if (
			confirm(
				`Stop sharing "${
					folder.label || folder.id
				}" with "${deviceName}"?`
			)
		) {
			try {
				await unshareFolder.mutateAsync({
					folderId: folder.id,
					deviceId,
				});
				toast.success(`Stopped sharing with ${deviceName}`);
			} catch {
				toast.error('Failed to unshare folder');
			}
		}
	};

	const getStatusBadge = () => {
		if (isPaused) return <Badge variant='secondary'>Paused</Badge>;
		if (isSyncing) return <Badge variant='warning'>Syncing</Badge>;
		if (needsSync) return <Badge variant='warning'>Needs Sync</Badge>;
		return <Badge variant='success'>Up to Date</Badge>;
	};

	const handleTogglePause = () => {
		if (isPaused) {
			resumeFolder.mutate(folder.id);
		} else {
			pauseFolder.mutate(folder.id);
		}
	};

	const handleRescan = () => {
		rescanFolder.mutate(folder.id);
	};

	const handleRemove = async () => {
		if (
			confirm(
				`Remove folder "${
					folder.label || folder.id
				}"? This will not delete the files on disk.`
			)
		) {
			try {
				await removeFolder.mutateAsync(folder.id);
				toast.success('Folder removed');
			} catch {
				toast.error('Failed to remove folder');
			}
		}
	};

	const handleOpenInExplorer = async () => {
		if (folder.path) {
			try {
				await openInExplorer.mutateAsync(folder.path);
				toast.success('Opened in file explorer');
			} catch {
				toast.error('Failed to open folder');
			}
		}
	};

	return (
		<Card
			className={cn(
				'border-slate-800 bg-slate-900/50 backdrop-blur-md transition-all',
				isPaused && 'opacity-60'
			)}
		>
			<CardHeader className='pb-3'>
				<div className='flex items-start justify-between'>
					<div className='flex items-center gap-3'>
						<div className='flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20'>
							<Folder className='h-5 w-5 text-indigo-400' />
						</div>
						<div>
							<CardTitle className='text-lg text-white'>
								{folder.label || folder.id}
							</CardTitle>
							<CardDescription className='font-mono text-xs text-slate-500'>
								{folder.path}
							</CardDescription>
						</div>
					</div>
					{getStatusBadge()}
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className='space-y-2'>
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-4 w-3/4' />
					</div>
				) : (
					<>
						<div className='mb-4 grid grid-cols-2 gap-4 text-sm'>
							<div>
								<p className='text-slate-400'>Local Files</p>
								<p className='font-medium text-white'>
									{status?.localFiles?.toLocaleString() || 0}
								</p>
							</div>
							<div>
								<p className='text-slate-400'>Local Size</p>
								<p className='font-medium text-white'>
									{formatBytes(status?.localBytes || 0)}
								</p>
							</div>
							<div>
								<p className='text-slate-400'>Global Files</p>
								<p className='font-medium text-white'>
									{status?.globalFiles?.toLocaleString() || 0}
								</p>
							</div>
							<div>
								<p className='text-slate-400'>Need Sync</p>
								<p className='font-medium text-white'>
									{status?.needFiles?.toLocaleString() || 0}{' '}
									files
								</p>
							</div>
						</div>

						{/* Shared Devices */}
						{sharedDevices.length > 0 && (
							<div className='mb-4'>
								<div className='flex items-center gap-2 mb-2 text-sm text-slate-400'>
									<Users className='h-4 w-4' />
									<span>Shared with</span>
								</div>
								<div className='flex flex-wrap gap-1.5'>
									{sharedDevices.map((device) => (
										<Badge
											key={device.deviceID}
											variant='secondary'
											className='group/badge flex items-center gap-1 pr-1 hover:bg-slate-600'
										>
											<span className='max-w-[100px] truncate'>
												{device.name}
											</span>
											<button
												onClick={() =>
													handleUnshare(
														device.deviceID,
														device.name
													)
												}
												disabled={
													unshareFolder.isPending
												}
												className='ml-0.5 opacity-0 group-hover/badge:opacity-100 transition-opacity rounded-full p-0.5 hover:bg-red-500/20 hover:text-red-400'
												title='Stop sharing'
											>
												<X className='h-3 w-3' />
											</button>
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* Primary Actions */}
						<div className='flex gap-2 mb-2'>
							<Button
								variant='outline'
								size='sm'
								onClick={handleTogglePause}
								disabled={
									pauseFolder.isPending ||
									resumeFolder.isPending
								}
								className='flex-1'
							>
								{isPaused ? (
									<>
										<Play className='mr-1 h-4 w-4' /> Resume
									</>
								) : (
									<>
										<Pause className='mr-1 h-4 w-4' /> Pause
									</>
								)}
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={() => onShare(folder.id, folder.label)}
								className='text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300'
								title='Share folder'
							>
								<Share2 className='h-4 w-4' />
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={handleRescan}
								disabled={rescanFolder.isPending || isPaused}
								title='Rescan'
							>
								<RefreshCw
									className={cn(
										'h-4 w-4',
										rescanFolder.isPending && 'animate-spin'
									)}
								/>
							</Button>
						</div>

						{/* Secondary Actions */}
						<div className='flex gap-2'>
							<Button
								variant='outline'
								size='sm'
								onClick={handleOpenInExplorer}
								disabled={
									openInExplorer.isPending || !folder.path
								}
								className='flex-1 text-slate-400 hover:text-slate-200'
								title='Open in file explorer'
							>
								<ExternalLink className='mr-1 h-4 w-4' />
								Open
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={() =>
									folder.path &&
									onBrowse(
										folder.id,
										folder.path,
										folder.label
									)
								}
								disabled={!folder.path}
								title='Browse files'
							>
								<FolderOpen className='h-4 w-4' />
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={() =>
									folder.path &&
									onConflicts(
										folder.id,
										folder.path,
										folder.label
									)
								}
								disabled={!folder.path}
								title='Resolve conflicts'
								className='text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
							>
								<AlertTriangle className='h-4 w-4' />
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={() =>
									onIgnorePatterns(folder.id, folder.label)
								}
								title='Ignore patterns'
							>
								<FileX className='h-4 w-4' />
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={handleRemove}
								disabled={removeFolder.isPending}
								className='text-red-400 hover:bg-red-500/10 hover:text-red-300'
								title='Remove folder'
							>
								<Trash2 className='h-4 w-4' />
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

export function FolderList() {
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [shareData, setShareData] = useState<{
		id: string;
		label?: string;
	} | null>(null);
	const [ignoreData, setIgnoreData] = useState<{
		id: string;
		label?: string;
	} | null>(null);
	const [browseData, setBrowseData] = useState<{
		id: string;
		path: string;
		label?: string;
	} | null>(null);
	const [conflictData, setConflictData] = useState<{
		id: string;
		path: string;
		label?: string;
	} | null>(null);
	const { data: config, isLoading, isError } = useConfig();
	const { data: systemStatus } = useSystemStatus();

	const localDeviceId = systemStatus?.myID;

	if (isLoading) {
		return (
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
				{[1, 2, 3].map((i) => (
					<Card key={i} className='border-slate-800 bg-slate-900/50'>
						<CardHeader>
							<Skeleton className='h-6 w-32' />
							<Skeleton className='h-4 w-48' />
						</CardHeader>
						<CardContent>
							<div className='space-y-2'>
								<Skeleton className='h-4 w-full' />
								<Skeleton className='h-4 w-3/4' />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (isError || !config?.folders?.length) {
		return (
			<>
				<Card className='border-slate-800 bg-slate-900/50 backdrop-blur-md'>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<Folder className='mb-4 h-12 w-12 text-slate-600' />
						<p className='text-lg font-medium text-slate-300'>
							No folders configured
						</p>
						<p className='mb-4 text-sm text-slate-500'>
							Add folders to start syncing
						</p>
						<Button
							onClick={() => setAddDialogOpen(true)}
							className='bg-indigo-600 hover:bg-indigo-700'
						>
							<Plus className='mr-2 h-4 w-4' />
							Add Folder
						</Button>
					</CardContent>
				</Card>
				<AddFolderDialog
					open={addDialogOpen}
					onOpenChange={setAddDialogOpen}
				/>
			</>
		);
	}

	return (
		<>
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
				{config.folders.map((folder) => (
					<FolderCard
						key={folder.id}
						folder={folder}
						devices={config.devices || []}
						localDeviceId={localDeviceId}
						onShare={(id, label) => setShareData({ id, label })}
						onIgnorePatterns={(id, label) =>
							setIgnoreData({ id, label })
						}
						onBrowse={(id, path, label) =>
							setBrowseData({ id, path, label })
						}
						onConflicts={(id, path, label) =>
							setConflictData({ id, path, label })
						}
					/>
				))}
				{/* Add Folder Card */}
				<Card
					className='flex cursor-pointer items-center justify-center border-2 border-dashed border-slate-700 bg-slate-900/30 transition-colors hover:border-indigo-500/50 hover:bg-slate-800/50'
					onClick={() => setAddDialogOpen(true)}
				>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<div className='flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20'>
							<Plus className='h-6 w-6 text-indigo-400' />
						</div>
						<p className='mt-3 text-sm font-medium text-slate-300'>
							Add Folder
						</p>
					</CardContent>
				</Card>
			</div>
			<AddFolderDialog
				open={addDialogOpen}
				onOpenChange={setAddDialogOpen}
			/>
			<ShareFolderDialog
				open={!!shareData}
				onOpenChange={(open) => !open && setShareData(null)}
				folderId={shareData?.id || ''}
				folderLabel={shareData?.label}
			/>
			<IgnorePatternsDialog
				open={!!ignoreData}
				onOpenChange={(open) => !open && setIgnoreData(null)}
				folderId={ignoreData?.id || ''}
				folderLabel={ignoreData?.label}
			/>
			<FileBrowser
				open={!!browseData}
				onOpenChange={(open) => !open && setBrowseData(null)}
				folderId={browseData?.id || ''}
				folderPath={browseData?.path || ''}
				folderLabel={browseData?.label}
			/>
			<ConflictResolver
				open={!!conflictData}
				onOpenChange={(open) => !open && setConflictData(null)}
				folderId={conflictData?.id || ''}
				folderPath={conflictData?.path || ''}
				folderLabel={conflictData?.label}
			/>
		</>
	);
}
