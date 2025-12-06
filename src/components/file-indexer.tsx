/**
 * FileIndexer - Component for indexing files into IndexedDB with AI embeddings
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  getEmbeddingCount,
  clearAllData,
  type FileMetadata,
} from '@/lib/db';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

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
  // Memoize folders to prevent dependency array changes on each render
  const folders = useMemo(() => config?.folders || [], [config?.folders]);

  const aiEnabled = useAppStore((state) => state.aiEnabled);
  const {
    status: aiStatus,
    statusMessage: aiStatusMessage,
    isReady,
    initialize,
    retry,
    indexFiles,
    progress: embeddingProgress,
  } = useAISearch({ enabled: aiEnabled });

  // Update stats
  const updateStats = useCallback(async () => {
    try {
      const count = await getFileCount();
      setTotalFiles(count);
      // Use efficient count instead of loading all embeddings
      const embeddingCount = await getEmbeddingCount();
      setTotalEmbeddings(embeddingCount);
    } catch (e) {
      logger.warn('Error updating stats', { error: String(e) });
    }
  }, []);

  // Update stats on mount - track if already initialized
  const statsInitialized = useRef(false);
  useEffect(() => {
    if (!statsInitialized.current) {
      statsInitialized.current = true;
      // Schedule update for next tick to avoid synchronous setState in effect
      Promise.resolve().then(updateStats);
    }
  }, [updateStats]);

  // Index a single folder
  const indexFolder = useCallback(
    async (folderId: string, folderLabel: string, folderPath: string) => {
      setStatus({
        phase: 'scanning',
        message: `Scanning ${folderLabel}...`,
        folderId,
      });

      try {
        // Get all files recursively from Syncthing using browse_folder_recursive command
        const files = await invoke<BrowseFile[]>('browse_folder_recursive', {
          folderId,
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
          extension: f.name.includes('.') ? f.name.split('.').pop() : undefined,
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
        logger.error(`Error indexing folder ${folderId}`, { error, folderId });
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
        const files = await indexFolder(folder.id, folder.label || folder.id, folder.path);
        allFiles.push(...files.map((f) => ({ path: f.path, name: f.name })));
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
        message: error instanceof Error ? error.message : 'Indexing failed',
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
        message: error instanceof Error ? error.message : 'Embedding generation failed',
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
    } catch {
      setStatus({
        phase: 'error',
        message: 'Failed to clear index',
      });
    }
  }, [updateStats]);

  const isWorking =
    status.phase === 'scanning' || status.phase === 'storing' || status.phase === 'embedding';
  const currentProgress = status.phase === 'embedding' ? embeddingProgress : status.progress;

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="text-primary h-5 w-5" />
        <h3 className="font-semibold">AI File Index</h3>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            <span>Indexed Files</span>
          </div>
          <p className="text-2xl font-bold">{totalFiles.toLocaleString()}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Embeddings</span>
          </div>
          <p className="text-2xl font-bold">{totalEmbeddings.toLocaleString()}</p>
        </div>
      </div>

      {/* AI Status */}
      <div
        className={cn(
          'mb-4 rounded-lg p-2',
          aiStatus === 'ready'
            ? 'bg-green-500/10 text-green-600'
            : aiStatus === 'loading'
              ? 'bg-blue-500/10 text-blue-600'
              : aiStatus === 'error'
                ? 'bg-red-500/10 text-red-600'
                : 'bg-muted/50 text-muted-foreground'
        )}
      >
        <div className="flex items-center gap-2">
          {aiStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {aiStatus === 'ready' && <CheckCircle2 className="h-4 w-4" />}
          {aiStatus === 'error' && <AlertCircle className="h-4 w-4" />}
          {aiStatus === 'idle' && <Brain className="h-4 w-4" />}
          <span className="flex-1 text-sm">
            {aiStatus === 'ready'
              ? 'AI Model Ready'
              : aiStatus === 'loading'
                ? 'Loading AI Model...'
                : aiStatus === 'error'
                  ? 'AI Model Error'
                  : 'AI Model Idle'}
          </span>
          {aiStatus === 'error' && (
            <button
              onClick={retry}
              className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium hover:bg-red-500/30"
            >
              Retry
            </button>
          )}
          {aiStatus === 'idle' && (
            <button
              onClick={initialize}
              className="text-primary rounded bg-blue-500/20 px-2 py-1 text-xs font-medium hover:bg-blue-500/30"
            >
              Load Model
            </button>
          )}
        </div>
        {aiStatus === 'error' && aiStatusMessage && (
          <p className="mt-1 text-xs opacity-80">{aiStatusMessage}</p>
        )}
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        {status.phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg p-3',
                status.phase === 'complete'
                  ? 'bg-green-500/10 text-green-600'
                  : status.phase === 'error'
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-blue-500/10 text-blue-600'
              )}
            >
              {isWorking && <Loader2 className="h-4 w-4 animate-spin" />}
              {status.phase === 'complete' && <CheckCircle2 className="h-4 w-4" />}
              {status.phase === 'error' && <AlertCircle className="h-4 w-4" />}
              <span className="flex-1 text-sm">{status.message}</span>
            </div>

            {currentProgress && (
              <div className="mt-2">
                <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                  <span>Progress</span>
                  <span>
                    {currentProgress.current} / {currentProgress.total}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <motion.div
                    className="bg-primary h-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={indexAllFolders}
          disabled={isWorking || !folders?.length}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {isWorking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Reindex All Folders
        </button>

        <button
          onClick={generateMissingEmbeddings}
          disabled={isWorking || !isReady}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            'bg-secondary text-secondary-foreground',
            'hover:bg-secondary/80 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Sparkles className="h-4 w-4" />
          Generate Embeddings
        </button>

        <button
          onClick={clearIndex}
          disabled={isWorking}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            'bg-destructive/10 text-destructive',
            'hover:bg-destructive/20 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Trash2 className="h-4 w-4" />
          Clear Index
        </button>
      </div>

      {/* Help text */}
      <p className="text-muted-foreground mt-4 text-xs">
        Index your synced folders to enable AI-powered semantic file search. The AI model runs
        locally in your browser for privacy.
      </p>
    </div>
  );
}
