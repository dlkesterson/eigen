'use client';

import { useState } from 'react';
import { useAddFolderAdvanced } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FolderPlus,
	X,
	ChevronDown,
	ChevronUp,
	History,
	Clock,
	Trash2,
	Terminal,
	FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

interface AddFolderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type VersioningType = '' | 'simple' | 'staggered' | 'trashcan' | 'external';

const versioningOptions = [
	{
		value: '' as VersioningType,
		label: 'No Versioning',
		description: 'Deleted or modified files are not preserved',
		icon: X,
	},
	{
		value: 'simple' as VersioningType,
		label: 'Simple',
		description: 'Keep a specified number of old versions',
		icon: History,
	},
	{
		value: 'staggered' as VersioningType,
		label: 'Staggered',
		description: 'Smart versioning: more frequent recent, sparse older',
		icon: Clock,
	},
	{
		value: 'trashcan' as VersioningType,
		label: 'Trash Can',
		description: 'Move deleted files to .stversions folder',
		icon: Trash2,
	},
	{
		value: 'external' as VersioningType,
		label: 'External',
		description: 'Use an external command for versioning',
		icon: Terminal,
	},
];

export function AddFolderDialog({ open, onOpenChange }: AddFolderDialogProps) {
	const [folderId, setFolderId] = useState('');
	const [folderLabel, setFolderLabel] = useState('');
	const [folderPath, setFolderPath] = useState('');
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [versioning, setVersioning] = useState<{
		type: VersioningType;
		params: Record<string, string>;
	}>({ type: '', params: {} });
	const [rescanInterval, setRescanInterval] = useState(3600);
	const [fsWatcherEnabled, setFsWatcherEnabled] = useState(true);
	const [fsWatcherDelay, setFsWatcherDelay] = useState(10);
	const [ignorePerms, setIgnorePerms] = useState(false);

	const addFolder = useAddFolderAdvanced();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!folderId.trim()) {
			toast.error('Folder ID is required');
			return;
		}
		if (!folderPath.trim()) {
			toast.error('Folder path is required');
			return;
		}

		try {
			await addFolder.mutateAsync({
				folderId: folderId.trim(),
				folderLabel: folderLabel.trim() || folderId.trim(),
				folderPath: folderPath.trim(),
				versioningType: versioning.type || undefined,
				versioningParams:
					Object.keys(versioning.params).length > 0
						? versioning.params
						: undefined,
				rescanIntervalS: rescanInterval,
				fsWatcherEnabled,
				fsWatcherDelayS: fsWatcherDelay,
				ignorePerms,
			});
			toast.success('Folder added successfully');
			handleClose();
		} catch (err) {
			toast.error('Failed to add folder');
		}
	};

	const handleClose = () => {
		setFolderId('');
		setFolderLabel('');
		setFolderPath('');
		setShowAdvanced(false);
		setVersioning({ type: '', params: {} });
		setRescanInterval(3600);
		setFsWatcherEnabled(true);
		setFsWatcherDelay(10);
		setIgnorePerms(false);
		onOpenChange(false);
	};

	const updateVersioningType = (type: VersioningType) => {
		const defaultParams: Record<VersioningType, Record<string, string>> = {
			'': {},
			simple: { keep: '5' },
			staggered: { maxAge: '31536000' },
			trashcan: { cleanoutDays: '0' },
			external: { command: '' },
		};
		setVersioning({ type, params: defaultParams[type] });
	};

	if (!open) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center py-8'>
			<div
				className='absolute inset-0 bg-black/60 backdrop-blur-xs'
				onClick={handleClose}
			/>
			<Card className='relative z-10 w-full max-w-lg border-slate-700 bg-slate-900/95 backdrop-blur-sm mx-4 max-h-[90vh] overflow-y-auto'>
				<CardHeader className='pb-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<div className='flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20'>
								<FolderPlus className='h-5 w-5 text-indigo-400' />
							</div>
							<div>
								<CardTitle className='text-white'>
									Add Folder
								</CardTitle>
								<p className='text-sm text-slate-400'>
									Share a folder with your devices
								</p>
							</div>
						</div>
						<Button
							variant='ghost'
							size='sm'
							onClick={handleClose}
							className='text-slate-400 hover:text-white'
						>
							<X className='h-4 w-4' />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-slate-300'>
								Folder ID *
							</label>
							<input
								type='text'
								value={folderId}
								onChange={(e) => setFolderId(e.target.value)}
								placeholder='my-folder'
								className='w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500'
							/>
							<p className='text-xs text-slate-500'>
								Unique identifier for this folder
							</p>
						</div>

						<div className='space-y-2'>
							<label className='text-sm font-medium text-slate-300'>
								Label
							</label>
							<input
								type='text'
								value={folderLabel}
								onChange={(e) => setFolderLabel(e.target.value)}
								placeholder='My Folder'
								className='w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500'
							/>
							<p className='text-xs text-slate-500'>
								Human-readable name (optional)
							</p>
						</div>

						<div className='space-y-2'>
							<label className='text-sm font-medium text-slate-300'>
								Path *
							</label>
							<div className='flex gap-2'>
								<input
									type='text'
									value={folderPath}
									onChange={(e) =>
										setFolderPath(e.target.value)
									}
									placeholder='/home/user/sync-folder'
									className='flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500'
								/>
								<Button
									type='button'
									variant='outline'
									onClick={async () => {
										try {
											const selected = await openDialog({
												directory: true,
												multiple: false,
												title: 'Select Folder to Sync',
											});
											if (selected) {
												setFolderPath(
													selected as string
												);
											}
										} catch (err) {
											console.error(
												'Failed to open folder picker:',
												err
											);
										}
									}}
									className='border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
								>
									<FolderOpen className='h-4 w-4' />
								</Button>
							</div>
							<p className='text-xs text-slate-500'>
								Absolute path to the folder
							</p>
						</div>

						<Button
							type='button'
							variant='ghost'
							onClick={() => setShowAdvanced(!showAdvanced)}
							className='w-full justify-between text-slate-300 hover:text-white'
						>
							<span>Advanced Options</span>
							{showAdvanced ? (
								<ChevronUp className='h-4 w-4' />
							) : (
								<ChevronDown className='h-4 w-4' />
							)}
						</Button>

						{showAdvanced && (
							<div className='space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4'>
								<div className='space-y-2'>
									<label className='text-sm font-medium text-slate-300'>
										File Versioning
									</label>
									<div className='grid gap-2'>
										{versioningOptions.map((option) => {
											const Icon = option.icon;
											return (
												<button
													key={option.value}
													type='button'
													onClick={() =>
														updateVersioningType(
															option.value
														)
													}
													className={cn(
														'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
														versioning.type ===
															option.value
															? 'border-indigo-500 bg-indigo-500/10'
															: 'border-slate-700 hover:border-slate-600'
													)}
												>
													<Icon
														className={cn(
															'h-4 w-4 mt-0.5',
															versioning.type ===
																option.value
																? 'text-indigo-400'
																: 'text-slate-500'
														)}
													/>
													<div>
														<p
															className={cn(
																'text-sm font-medium',
																versioning.type ===
																	option.value
																	? 'text-white'
																	: 'text-slate-300'
															)}
														>
															{option.label}
														</p>
														<p className='text-xs text-slate-500'>
															{option.description}
														</p>
													</div>
												</button>
											);
										})}
									</div>
								</div>

								{versioning.type === 'simple' && (
									<div className='space-y-2 pl-6'>
										<label className='text-sm text-slate-400'>
											Versions to keep
										</label>
										<input
											type='number'
											min='1'
											value={
												versioning.params.keep || '5'
											}
											onChange={(e) =>
												setVersioning({
													...versioning,
													params: {
														keep: e.target.value,
													},
												})
											}
											className='w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white'
										/>
									</div>
								)}

								{versioning.type === 'staggered' && (
									<div className='space-y-2 pl-6'>
										<label className='text-sm text-slate-400'>
											Max age (seconds)
										</label>
										<select
											value={
												versioning.params.maxAge ||
												'31536000'
											}
											onChange={(e) =>
												setVersioning({
													...versioning,
													params: {
														maxAge: e.target.value,
													},
												})
											}
											className='w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white'
										>
											<option value='86400'>1 day</option>
											<option value='604800'>
												1 week
											</option>
											<option value='2592000'>
												30 days
											</option>
											<option value='31536000'>
												1 year
											</option>
											<option value='0'>Forever</option>
										</select>
									</div>
								)}

								{versioning.type === 'trashcan' && (
									<div className='space-y-2 pl-6'>
										<label className='text-sm text-slate-400'>
											Clean out after (days, 0 = never)
										</label>
										<input
											type='number'
											min='0'
											value={
												versioning.params
													.cleanoutDays || '0'
											}
											onChange={(e) =>
												setVersioning({
													...versioning,
													params: {
														cleanoutDays:
															e.target.value,
													},
												})
											}
											className='w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white'
										/>
									</div>
								)}

								{versioning.type === 'external' && (
									<div className='space-y-2 pl-6'>
										<label className='text-sm text-slate-400'>
											Command
										</label>
										<input
											type='text'
											value={
												versioning.params.command || ''
											}
											onChange={(e) =>
												setVersioning({
													...versioning,
													params: {
														command: e.target.value,
													},
												})
											}
											placeholder='/path/to/command %FOLDER_PATH% %FILE_PATH%'
											className='w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-white'
										/>
									</div>
								)}

								<div className='space-y-2'>
									<label className='text-sm font-medium text-slate-300'>
										Rescan Interval
									</label>
									<select
										value={rescanInterval}
										onChange={(e) =>
											setRescanInterval(
												parseInt(e.target.value)
											)
										}
										className='w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white'
									>
										<option value={60}>1 minute</option>
										<option value={300}>5 minutes</option>
										<option value={900}>15 minutes</option>
										<option value={3600}>1 hour</option>
										<option value={86400}>24 hours</option>
									</select>
								</div>

								<div className='space-y-3'>
									<label className='flex items-center gap-3'>
										<input
											type='checkbox'
											checked={fsWatcherEnabled}
											onChange={(e) =>
												setFsWatcherEnabled(
													e.target.checked
												)
											}
											className='h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500'
										/>
										<div>
											<span className='text-sm text-slate-300'>
												Enable File Watcher
											</span>
											<p className='text-xs text-slate-500'>
												Detect changes immediately
											</p>
										</div>
									</label>

									<label className='flex items-center gap-3'>
										<input
											type='checkbox'
											checked={ignorePerms}
											onChange={(e) =>
												setIgnorePerms(e.target.checked)
											}
											className='h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500'
										/>
										<div>
											<span className='text-sm text-slate-300'>
												Ignore Permissions
											</span>
											<p className='text-xs text-slate-500'>
												Useful for FAT/NTFS filesystems
											</p>
										</div>
									</label>
								</div>
							</div>
						)}

						<div className='flex gap-3 pt-4'>
							<Button
								type='button'
								variant='outline'
								onClick={handleClose}
								className='flex-1 border-slate-700 text-slate-300 hover:bg-slate-800'
							>
								Cancel
							</Button>
							<Button
								type='submit'
								disabled={addFolder.isPending}
								className='flex-1 bg-indigo-600 hover:bg-indigo-700'
							>
								{addFolder.isPending
									? 'Adding...'
									: 'Add Folder'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
