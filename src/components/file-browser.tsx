'use client';

import { useState } from 'react';
import {
	useOpenFolderInExplorer,
	useBrowseFolder,
	useBrowseVersions,
	useRestoreVersion,
	VersionEntry,
} from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FolderOpen,
	X,
	RefreshCw,
	File,
	Folder,
	ChevronRight,
	ChevronLeft,
	ExternalLink,
	Home,
	History,
	RotateCcw,
	Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileBrowserProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folderId: string;
	folderPath: string;
	folderLabel?: string;
}

interface FileEntry {
	name: string;
	type: 'file' | 'directory';
	size?: number;
	modTime?: string;
	permissions?: string;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateInput: string | number): string {
	try {
		const date =
			typeof dateInput === 'number'
				? new Date(dateInput * 1000) // Unix timestamp in seconds
				: new Date(dateInput);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return String(dateInput);
	}
}

export function FileBrowser({
	open,
	onOpenChange,
	folderId,
	folderPath,
	folderLabel,
}: FileBrowserProps) {
	const [currentPath, setCurrentPath] = useState<string[]>([]);
	const [showVersions, setShowVersions] = useState(false);

	const openInExplorer = useOpenFolderInExplorer();
	const restoreVersion = useRestoreVersion();

	const {
		data: contents,
		isLoading: isLoadingFiles,
		refetch: refetchFiles,
	} = useBrowseFolder(
		folderId,
		currentPath.length > 0 ? currentPath.join('/') : undefined
	);

	const {
		data: versions,
		isLoading: isLoadingVersions,
		refetch: refetchVersions,
	} = useBrowseVersions(
		folderPath,
		currentPath.length > 0 ? currentPath.join('/') : undefined
	);

	if (!open) return null;

	const isLoading = showVersions ? isLoadingVersions : isLoadingFiles;
	const refetch = showVersions ? refetchVersions : refetchFiles;
	const fileEntries = showVersions
		? (versions as VersionEntry[] | undefined) || []
		: (contents as FileEntry[] | undefined) || [];

	const handleNavigate = (entry: FileEntry | VersionEntry) => {
		if (entry.type === 'directory') {
			setCurrentPath([...currentPath, entry.name]);
		}
	};

	const handleRestoreVersion = async (entry: VersionEntry) => {
		try {
			const versionPath =
				currentPath.length > 0
					? `${currentPath.join('/')}/${entry.name}`
					: entry.name;
			const originalPath =
				currentPath.length > 0
					? `${currentPath.join('/')}/${entry.originalName}`
					: entry.originalName;

			await restoreVersion.mutateAsync({
				folderPath,
				versionPath,
				originalName: originalPath,
				overwrite: true,
			});
			toast.success(`Restored ${entry.originalName}`);
		} catch (error) {
			toast.error('Failed to restore file');
		}
	};

	const handleGoBack = () => {
		setCurrentPath(currentPath.slice(0, -1));
	};

	const handleGoHome = () => {
		setCurrentPath([]);
	};

	const handleOpenInExplorer = async () => {
		try {
			const fullPath =
				currentPath.length > 0
					? `${folderPath}/${currentPath.join('/')}`
					: folderPath;
			await openInExplorer.mutateAsync(fullPath);
			toast.success('Opened in file explorer');
		} catch (error) {
			toast.error('Failed to open in file explorer');
		}
	};

	const breadcrumbs = [
		{
			name: showVersions ? '.stversions' : folderLabel || folderId,
			path: [],
		},
		...currentPath.map((segment, index) => ({
			name: segment,
			path: currentPath.slice(0, index + 1),
		})),
	];

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
			<Card className='w-full max-w-3xl max-h-[80vh] flex flex-col bg-background/95 backdrop-blur-md border-border/50'>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50'>
					<CardTitle className='text-xl font-semibold flex items-center gap-2'>
						{showVersions ? (
							<History className='h-5 w-5 text-amber-500' />
						) : (
							<FolderOpen className='h-5 w-5 text-muted-foreground' />
						)}
						{showVersions ? 'Version History' : 'File Browser'}
					</CardTitle>
					<div className='flex items-center gap-2'>
						<Button
							variant={showVersions ? 'default' : 'ghost'}
							size='sm'
							onClick={() => {
								setShowVersions(!showVersions);
								setCurrentPath([]);
							}}
							className={cn(
								showVersions &&
									'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
							)}
							title={
								showVersions
									? 'Show current files'
									: 'Show file versions'
							}
						>
							<History className='h-4 w-4 mr-1' />
							{showVersions ? 'Versions' : 'History'}
						</Button>
						<Button
							variant='ghost'
							size='icon'
							onClick={handleOpenInExplorer}
							disabled={openInExplorer.isPending || showVersions}
							title='Open in system file explorer'
						>
							<ExternalLink className='h-4 w-4' />
						</Button>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => refetch()}
							disabled={isLoading}
						>
							<RefreshCw
								className={cn(
									'h-4 w-4',
									isLoading && 'animate-spin'
								)}
							/>
						</Button>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => onOpenChange(false)}
						>
							<X className='h-4 w-4' />
						</Button>
					</div>
				</CardHeader>

				{/* Navigation Bar */}
				<div className='p-3 border-b border-border/50 flex items-center gap-2'>
					<Button
						variant='ghost'
						size='icon'
						onClick={handleGoHome}
						disabled={currentPath.length === 0}
						className='h-8 w-8'
					>
						<Home className='h-4 w-4' />
					</Button>
					<Button
						variant='ghost'
						size='icon'
						onClick={handleGoBack}
						disabled={currentPath.length === 0}
						className='h-8 w-8'
					>
						<ChevronLeft className='h-4 w-4' />
					</Button>

					{/* Breadcrumbs */}
					<div className='flex items-center gap-1 overflow-x-auto flex-1 text-sm'>
						{breadcrumbs.map((crumb, index) => (
							<div key={index} className='flex items-center'>
								{index > 0 && (
									<ChevronRight className='h-4 w-4 text-muted-foreground mx-1' />
								)}
								<button
									onClick={() => setCurrentPath(crumb.path)}
									className={cn(
										'px-2 py-1 rounded hover:bg-muted/50 transition-colors truncate max-w-[150px]',
										index === breadcrumbs.length - 1
											? 'text-foreground font-medium'
											: 'text-muted-foreground'
									)}
									title={crumb.name}
								>
									{crumb.name}
								</button>
							</div>
						))}
					</div>
				</div>

				<CardContent className='flex-1 overflow-hidden p-0'>
					<div className='h-[400px] overflow-y-auto'>
						{isLoading ? (
							<div className='flex items-center justify-center h-full'>
								<RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
							</div>
						) : fileEntries.length === 0 ? (
							<div className='flex flex-col items-center justify-center h-full text-muted-foreground'>
								{showVersions ? (
									<>
										<History className='h-12 w-12 mb-2' />
										<p>No file versions found</p>
										<p className='text-xs mt-1'>
											Enable versioning on this folder to
											keep file history
										</p>
									</>
								) : (
									<>
										<Folder className='h-12 w-12 mb-2' />
										<p>This folder is empty</p>
									</>
								)}
							</div>
						) : (
							<div className='divide-y divide-border/30'>
								{/* Directories first, then files, both alphabetically sorted */}
								{[...fileEntries]
									.sort((a, b) => {
										if (a.type !== b.type) {
											return a.type === 'directory'
												? -1
												: 1;
										}
										return a.name.localeCompare(b.name);
									})
									.map((entry, index) => {
										const versionEntry =
											entry as VersionEntry;
										const isVersionFile =
											showVersions &&
											entry.type === 'file';

										return (
											<div
												key={index}
												className={cn(
													'flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors group',
													entry.type ===
														'directory' &&
														'cursor-pointer'
												)}
												onClick={() =>
													entry.type ===
														'directory' &&
													handleNavigate(entry)
												}
											>
												{entry.type === 'directory' ? (
													<Folder className='h-5 w-5 text-blue-400 flex-shrink-0' />
												) : showVersions ? (
													<Clock className='h-5 w-5 text-amber-400 flex-shrink-0' />
												) : (
													<File className='h-5 w-5 text-muted-foreground flex-shrink-0' />
												)}
												<div className='flex-1 min-w-0'>
													<p className='text-sm font-medium truncate'>
														{showVersions &&
														versionEntry.originalName
															? versionEntry.originalName
															: entry.name}
													</p>
													{isVersionFile &&
														versionEntry.versionTime && (
															<p className='text-xs text-amber-500/70'>
																Version from{' '}
																{
																	versionEntry.versionTime
																}
															</p>
														)}
												</div>
												{entry.size !== undefined &&
													entry.type === 'file' && (
														<span className='text-xs text-muted-foreground'>
															{formatBytes(
																entry.size
															)}
														</span>
													)}
												{entry.modTime &&
													!isVersionFile && (
														<span className='text-xs text-muted-foreground hidden sm:block'>
															{formatDate(
																entry.modTime
															)}
														</span>
													)}
												{isVersionFile && (
													<Button
														variant='ghost'
														size='sm'
														className='opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:text-amber-400 hover:bg-amber-500/10'
														onClick={(e) => {
															e.stopPropagation();
															handleRestoreVersion(
																versionEntry
															);
														}}
														disabled={
															restoreVersion.isPending
														}
													>
														<RotateCcw className='h-4 w-4 mr-1' />
														Restore
													</Button>
												)}
												{entry.type === 'directory' && (
													<ChevronRight className='h-4 w-4 text-muted-foreground' />
												)}
											</div>
										);
									})}
							</div>
						)}
					</div>
				</CardContent>

				<div className='p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground'>
					<span>{fileEntries.length} items</span>
					<span className='truncate max-w-[300px]' title={folderPath}>
						{folderPath}
					</span>
				</div>
			</Card>
		</div>
	);
}
