'use client';

/**
 * FileIndexer - Component for indexing files into IndexedDB with AI embeddings
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Brain,
	RefreshCw,
	Loader2,
	CheckCircle2,
	AlertCircle,
	Database,
	Sparkles,
	Trash2,
} from 'lucide-react';
import { useConfig } from '@/hooks/useSyncthing';
import { useAISearch } from '@/hooks/useAISearch';
import { useAppStore } from '@/store';
import { invoke } from '@tauri-apps/api/core';
import {
	bulkUpsertFiles,
	getFileCount,
	clearFilesForFolder,
	getFilesWithoutEmbeddings,
	getAllEmbeddings,
	clearAllData,
	type FileMetadata,
} from '@/lib/db';
import { cn } from '@/lib/utils';

interface IndexingStatus {
	phase: 'idle' | 'scanning' | 'storing' | 'embedding' | 'complete' | 'error';
	message: string;
	folderId?: string;
	progress?: { current: number; total: number };
}

interface BrowseFile {
	name: string;
	size: number;
	modTime: string;
	type: string;
}

export function FileIndexer() {
	const [status, setStatus] = useState<IndexingStatus>({
		phase: 'idle',
		message: '',
	});
	const [totalFiles, setTotalFiles] = useState(0);
	const [totalEmbeddings, setTotalEmbeddings] = useState(0);

	const { data: config } = useConfig();
	const folders = config?.folders || [];

	const aiEnabled = useAppStore((state) => state.aiEnabled);
	const {
		status: aiStatus,
		isReady,
		initialize,
		indexFiles,
		progress: embeddingProgress,
	} = useAISearch({ enabled: aiEnabled });

	// Update stats on mount
	useEffect(() => {
		updateStats();
	}, []);

	// Update stats
	const updateStats = useCallback(async () => {
		try {
			const count = await getFileCount();
			setTotalFiles(count);
			const embeddings = await getAllEmbeddings();
			setTotalEmbeddings(embeddings.length);
		} catch (e) {
			console.error('Error updating stats:', e);
		}
	}, []);

	// Index a single folder
	const indexFolder = useCallback(
		async (folderId: string, folderLabel: string, folderPath: string) => {
			setStatus({
				phase: 'scanning',
				message: `Scanning ${folderLabel}...`,
				folderId,
			});

			try {
				// Get files from Syncthing using browse_folder command
				const files = await invoke<BrowseFile[]>('browse_folder', {
					folderId,
					prefix: null,
				});

				if (!files || files.length === 0) {
					return [];
				}

				setStatus({
					phase: 'storing',
					message: `Storing ${files.length} files from ${folderLabel}...`,
					folderId,
					progress: { current: 0, total: files.length },
				});

				// Clear existing files for this folder
				await clearFilesForFolder(folderId);

				// Transform to FileMetadata
				const fileMetadata: FileMetadata[] = files.map((f) => ({
					path: `${folderPath}/${f.name}`,
					name: f.name.split('/').pop() || f.name,
					folderId,
					folderPath,
					size: f.size || 0,
					modified: new Date(f.modTime || Date.now()).getTime(),
					isDirectory: f.type === 'directory' || f.name.endsWith('/'),
					extension: f.name.includes('.')
						? f.name.split('.').pop()
						: undefined,
					indexed: Date.now(),
				}));

				// Store in IndexedDB
				await bulkUpsertFiles(fileMetadata);

				setStatus({
					phase: 'storing',
					message: `Stored ${files.length} files from ${folderLabel}`,
					folderId,
					progress: { current: files.length, total: files.length },
				});

				return fileMetadata.filter((f) => !f.isDirectory);
			} catch (error) {
				console.error(`Error indexing folder ${folderId}:`, error);
				throw error;
			}
		},
		[]
	);

	// Index all folders
	const indexAllFolders = useCallback(async () => {
		if (!folders || folders.length === 0) {
			setStatus({ phase: 'error', message: 'No folders to index' });
			return;
		}

		const allFiles: { path: string; name: string }[] = [];

		try {
			for (const folder of folders) {
				if (!folder.path) continue;
				const files = await indexFolder(
					folder.id,
					folder.label || folder.id,
					folder.path
				);
				allFiles.push(
					...files.map((f) => ({ path: f.path, name: f.name }))
				);
			}

			await updateStats();

			// Generate embeddings if AI is ready
			if (isReady && allFiles.length > 0) {
				setStatus({
					phase: 'embedding',
					message: `Generating embeddings for ${allFiles.length} files...`,
					progress: { current: 0, total: allFiles.length },
				});

				await indexFiles(allFiles);
				await updateStats();
			}

			setStatus({
				phase: 'complete',
				message: `Indexed ${allFiles.length} files from ${folders.length} folders`,
			});
		} catch (error) {
			setStatus({
				phase: 'error',
				message:
					error instanceof Error ? error.message : 'Indexing failed',
			});
		}
	}, [folders, indexFolder, isReady, indexFiles, updateStats]);

	// Generate embeddings for files without them
	const generateMissingEmbeddings = useCallback(async () => {
		if (!isReady) {
			await initialize();
			return;
		}

		try {
			const filesWithoutEmbeddings = await getFilesWithoutEmbeddings();

			if (filesWithoutEmbeddings.length === 0) {
				setStatus({
					phase: 'complete',
					message: 'All files already have embeddings',
				});
				return;
			}

			setStatus({
				phase: 'embedding',
				message: `Generating embeddings for ${filesWithoutEmbeddings.length} files...`,
				progress: { current: 0, total: filesWithoutEmbeddings.length },
			});

			await indexFiles(
				filesWithoutEmbeddings.map((f) => ({
					path: f.path,
					name: f.name,
				}))
			);
			await updateStats();

			setStatus({
				phase: 'complete',
				message: `Generated embeddings for ${filesWithoutEmbeddings.length} files`,
			});
		} catch (error) {
			setStatus({
				phase: 'error',
				message:
					error instanceof Error
						? error.message
						: 'Embedding generation failed',
			});
		}
	}, [isReady, initialize, indexFiles, updateStats]);

	// Clear all indexed data
	const clearIndex = useCallback(async () => {
		try {
			await clearAllData();
			await updateStats();
			setStatus({
				phase: 'complete',
				message: 'Index cleared',
			});
		} catch (error) {
			setStatus({
				phase: 'error',
				message: 'Failed to clear index',
			});
		}
	}, [updateStats]);

	const isWorking =
		status.phase === 'scanning' ||
		status.phase === 'storing' ||
		status.phase === 'embedding';
	const currentProgress =
		status.phase === 'embedding' ? embeddingProgress : status.progress;

	return (
		<div className='p-4 bg-card border border-border rounded-lg'>
			<div className='flex items-center gap-2 mb-4'>
				<Brain className='h-5 w-5 text-primary' />
				<h3 className='font-semibold'>AI File Index</h3>
			</div>

			{/* Stats */}
			<div className='grid grid-cols-2 gap-3 mb-4'>
				<div className='p-3 bg-muted/50 rounded-lg'>
					<div className='flex items-center gap-2 text-sm text-muted-foreground mb-1'>
						<Database className='h-4 w-4' />
						<span>Indexed Files</span>
					</div>
					<p className='text-2xl font-bold'>
						{totalFiles.toLocaleString()}
					</p>
				</div>
				<div className='p-3 bg-muted/50 rounded-lg'>
					<div className='flex items-center gap-2 text-sm text-muted-foreground mb-1'>
						<Sparkles className='h-4 w-4' />
						<span>Embeddings</span>
					</div>
					<p className='text-2xl font-bold'>
						{totalEmbeddings.toLocaleString()}
					</p>
				</div>
			</div>

			{/* AI Status */}
			<div
				className={cn(
					'flex items-center gap-2 p-2 rounded-lg mb-4',
					aiStatus === 'ready'
						? 'bg-green-500/10 text-green-600'
						: aiStatus === 'loading'
						? 'bg-blue-500/10 text-blue-600'
						: aiStatus === 'error'
						? 'bg-red-500/10 text-red-600'
						: 'bg-muted/50 text-muted-foreground'
				)}
			>
				{aiStatus === 'loading' && (
					<Loader2 className='h-4 w-4 animate-spin' />
				)}
				{aiStatus === 'ready' && <CheckCircle2 className='h-4 w-4' />}
				{aiStatus === 'error' && <AlertCircle className='h-4 w-4' />}
				{aiStatus === 'idle' && <Brain className='h-4 w-4' />}
				<span className='text-sm'>
					{aiStatus === 'ready'
						? 'AI Model Ready'
						: aiStatus === 'loading'
						? 'Loading AI Model...'
						: aiStatus === 'error'
						? 'AI Model Error'
						: 'AI Model Idle'}
				</span>
			</div>

			{/* Status */}
			<AnimatePresence mode='wait'>
				{status.phase !== 'idle' && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className='mb-4'
					>
						<div
							className={cn(
								'flex items-center gap-2 p-3 rounded-lg',
								status.phase === 'complete'
									? 'bg-green-500/10 text-green-600'
									: status.phase === 'error'
									? 'bg-red-500/10 text-red-600'
									: 'bg-blue-500/10 text-blue-600'
							)}
						>
							{isWorking && (
								<Loader2 className='h-4 w-4 animate-spin' />
							)}
							{status.phase === 'complete' && (
								<CheckCircle2 className='h-4 w-4' />
							)}
							{status.phase === 'error' && (
								<AlertCircle className='h-4 w-4' />
							)}
							<span className='text-sm flex-1'>
								{status.message}
							</span>
						</div>

						{currentProgress && (
							<div className='mt-2'>
								<div className='flex justify-between text-xs text-muted-foreground mb-1'>
									<span>Progress</span>
									<span>
										{currentProgress.current} /{' '}
										{currentProgress.total}
									</span>
								</div>
								<div className='h-2 bg-muted rounded-full overflow-hidden'>
									<motion.div
										className='h-full bg-primary'
										initial={{ width: 0 }}
										animate={{
											width: `${
												(currentProgress.current /
													currentProgress.total) *
												100
											}%`,
										}}
									/>
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Actions */}
			<div className='flex flex-wrap gap-2'>
				<button
					onClick={indexAllFolders}
					disabled={isWorking || !folders?.length}
					className={cn(
						'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
						'bg-primary text-primary-foreground',
						'hover:bg-primary/90 transition-colors',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					)}
				>
					{isWorking ? (
						<Loader2 className='h-4 w-4 animate-spin' />
					) : (
						<RefreshCw className='h-4 w-4' />
					)}
					Reindex All Folders
				</button>

				<button
					onClick={generateMissingEmbeddings}
					disabled={isWorking || !isReady}
					className={cn(
						'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
						'bg-secondary text-secondary-foreground',
						'hover:bg-secondary/80 transition-colors',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					)}
				>
					<Sparkles className='h-4 w-4' />
					Generate Embeddings
				</button>

				<button
					onClick={clearIndex}
					disabled={isWorking}
					className={cn(
						'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
						'bg-destructive/10 text-destructive',
						'hover:bg-destructive/20 transition-colors',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					)}
				>
					<Trash2 className='h-4 w-4' />
					Clear Index
				</button>
			</div>

			{/* Help text */}
			<p className='text-xs text-muted-foreground mt-4'>
				Index your synced folders to enable AI-powered semantic file
				search. The AI model runs locally in your browser for privacy.
			</p>
		</div>
	);
}
