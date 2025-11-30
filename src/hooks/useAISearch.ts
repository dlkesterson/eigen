/**
 * useAISearch - Hook for semantic file search using AI embeddings
 *
 * Manages a Web Worker running transformers.js for:
 * - Generating file path embeddings
 * - Semantic similarity search
 */

import { useCallback, useEffect, useRef } from 'react';
import { storeEmbedding, getAllEmbeddings, type FileEmbedding } from '@/lib/db';
import { useAIStore, type AIStatus } from '@/store';
import { logger } from '@/lib/logger';

export type { AIStatus } from '@/store';

interface AIWorkerMessage {
  id?: string;
  type: string;
  payload?: unknown;
}

interface SearchResult {
  path: string;
  score: number;
}

interface UseAISearchOptions {
  enabled?: boolean;
}

interface UseAISearchReturn {
  status: AIStatus;
  statusMessage: string;
  isReady: boolean;
  initialize: () => Promise<void>;
  retry: () => Promise<void>;
  generateEmbeddings: (texts: string[]) => Promise<number[][]>;
  indexFiles: (files: { path: string; name: string }[]) => Promise<void>;
  search: (query: string, folderId?: string) => Promise<SearchResult[]>;
  progress: { current: number; total: number } | null;
}

// Module-level singleton for the AI worker (shared across all hook instances)
let sharedWorker: Worker | null = null;
let sharedPendingCalls = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();
let callIdCounter = 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let workerInitialized = false;

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined') return null;

  if (!sharedWorker) {
    logger.debug('Creating new AI worker...', { component: 'useAISearch' });
    try {
      // Use dynamic import path for better bundler compatibility
      sharedWorker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
        type: 'module',
      });
      logger.debug('Worker object created', { component: 'useAISearch' });

      // Add error handler for worker loading issues
      sharedWorker.addEventListener('error', (e) => {
        logger.error('Worker error event', {
          component: 'useAISearch',
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
        });
      });
    } catch (error) {
      logger.error('Failed to create AI worker', {
        component: 'useAISearch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const store = useAIStore.getState();
      store.setAIStatus('error');
      store.setAIStatusMessage(
        `Failed to create AI worker: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }

    sharedWorker.onmessage = (event: MessageEvent<AIWorkerMessage>) => {
      const { id, type, payload } = event.data;
      logger.debug('Received message from worker', { component: 'useAISearch', type, payload });

      // Handle status updates - update global store directly
      if (type === 'status' && payload && typeof payload === 'object') {
        const statusPayload = payload as { status?: string; message?: string };
        const store = useAIStore.getState();
        if (statusPayload.status === 'loading') {
          store.setAIStatus('loading');
          store.setAIStatusMessage(statusPayload.message || 'Loading model...');
        } else if (statusPayload.status === 'ready') {
          store.setAIStatus('ready');
          store.setAIStatusMessage(statusPayload.message || 'Ready');
        } else if (statusPayload.status === 'error') {
          store.setAIStatus('error');
          store.setAIStatusMessage(statusPayload.message || 'Error');
        } else if (statusPayload.status === 'initialized') {
          // Worker is ready to receive commands
          logger.info('AI Worker initialized and ready', { component: 'useAISearch' });
        }
      }

      // Handle responses to calls
      if (id) {
        const pending = sharedPendingCalls.get(id);
        if (pending) {
          if (type === 'error') {
            const errorPayload = payload as { message?: string };
            pending.reject(new Error(errorPayload?.message || 'Worker error'));
          } else {
            pending.resolve(payload);
          }
          sharedPendingCalls.delete(id);
        }
      }
    };

    sharedWorker.onerror = (error) => {
      logger.error('AI Worker error', {
        component: 'useAISearch',
        error: error.message || 'Unknown error',
      });
      const store = useAIStore.getState();
      store.setAIStatus('error');
      store.setAIStatusMessage(`Worker error: ${error.message || 'Unknown error'}`);
    };
  }

  return sharedWorker;
}

function terminateWorker() {
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
    workerInitialized = false;
    sharedPendingCalls.clear();
  }
}

export function useAISearch(options: UseAISearchOptions = {}): UseAISearchReturn {
  const { enabled = true } = options;

  const initializingRef = useRef(false);

  // Use global store for AI status (shared across all components)
  const status = useAIStore((state) => state.aiStatus);
  const statusMessage = useAIStore((state) => state.aiStatusMessage);
  const progress = useAIStore((state) => state.aiProgress);
  const setStatus = useAIStore((state) => state.setAIStatus);
  const setStatusMessage = useAIStore((state) => state.setAIStatusMessage);
  const setProgress = useAIStore((state) => state.setAIProgress);

  // Sync disabled state
  useEffect(() => {
    if (!enabled && status !== 'disabled') {
      setStatus('disabled');
      setStatusMessage('AI features are disabled');
      terminateWorker();
    } else if (enabled && status === 'disabled') {
      setStatus('idle');
      setStatusMessage('');
    }
  }, [enabled, status, setStatus, setStatusMessage]);

  // Initialize worker when enabled
  useEffect(() => {
    logger.debug('Effect running', { component: 'useAISearch', enabled });
    if (enabled) {
      logger.debug('Calling getOrCreateWorker...', { component: 'useAISearch' });
      const worker = getOrCreateWorker();
      logger.debug('Worker result', { component: 'useAISearch', created: !!worker });
    }
  }, [enabled]);

  // Send message to worker and wait for response
  const sendMessage = useCallback(
    <T>(type: string, payload?: unknown, timeoutMs = 120000): Promise<T> => {
      return new Promise((resolve, reject) => {
        const worker = getOrCreateWorker();
        if (!worker) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const id = `call-${++callIdCounter}`;

        const timeoutId = setTimeout(() => {
          if (sharedPendingCalls.has(id)) {
            sharedPendingCalls.delete(id);
            reject(
              new Error(`Worker call timed out after ${timeoutMs / 1000}s for operation: ${type}`)
            );
          }
        }, timeoutMs);

        sharedPendingCalls.set(id, {
          resolve: (value: unknown) => {
            clearTimeout(timeoutId);
            resolve(value as T);
          },
          reject: (error: Error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
        });

        worker.postMessage({ id, type, payload });
      });
    },
    []
  );

  // Initialize the model
  const initialize = useCallback(async () => {
    if (!enabled) return;
    if (status === 'ready' || status === 'loading' || status === 'error') return;
    if (initializingRef.current) return;

    initializingRef.current = true;
    setStatus('loading');
    setStatusMessage('Downloading AI model (~23MB)...');
    try {
      // Model loading/downloading can take 10+ minutes on slow connections
      // The model is ~23MB and needs to be downloaded from Hugging Face
      await sendMessage('init', undefined, 600000); // 10 minute timeout
    } catch (error) {
      logger.error('Failed to initialize AI model', {
        component: 'useAISearch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize';
      const isTimeout = errorMessage.includes('timed out');
      setStatus('error');
      setStatusMessage(
        isTimeout
          ? 'Model download timed out after 10 minutes. This could be a network issue or the Hugging Face server may be slow. Try again later.'
          : errorMessage
      );
    } finally {
      initializingRef.current = false;
    }
  }, [enabled, status, sendMessage, setStatus, setStatusMessage]);

  // Retry initialization after an error
  const retry = useCallback(async () => {
    if (!enabled) return;
    // Reset status to idle so initialize() can run again
    setStatus('idle');
    setStatusMessage('');
    // Terminate the existing worker and create a new one
    terminateWorker();
    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Re-create worker and initialize
    getOrCreateWorker();
    // Initialize will be called by the effect or manually
  }, [enabled, setStatus, setStatusMessage]);

  // Generate embeddings for texts
  const generateEmbeddings = useCallback(
    async (texts: string[]): Promise<number[][]> => {
      if (!enabled) return [];
      // Embedding generation: 60 seconds should be enough for a batch
      const result = await sendMessage<{ embeddings: number[][] }>('embed', { texts }, 60000);
      return result.embeddings;
    },
    [enabled, sendMessage]
  );

  // Index files - generate and store embeddings
  const indexFiles = useCallback(
    async (files: { path: string; name: string }[]) => {
      if (!enabled) return;
      if (files.length === 0) return;

      setProgress({ current: 0, total: files.length });

      const batchSize = 10;

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const texts = batch.map((f) => `${f.name} ${f.path}`);

        try {
          const embeddings = await generateEmbeddings(texts);

          // Save to IndexedDB
          for (let j = 0; j < batch.length; j++) {
            await storeEmbedding({
              path: batch[j].path,
              embedding: embeddings[j],
              model: 'all-MiniLM-L6-v2',
              createdAt: Date.now(),
            });
          }
        } catch (error) {
          logger.error('Error indexing batch', {
            component: 'useAISearch',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        setProgress({ current: Math.min(i + batchSize, files.length), total: files.length });
      }

      setProgress(null);
    },
    [enabled, generateEmbeddings, setProgress]
  );

  // Semantic search
  const search = useCallback(
    async (query: string, _folderId?: string): Promise<SearchResult[]> => {
      if (!enabled) return [];
      if (!query.trim()) return [];

      // Get stored embeddings
      const storedEmbeddings = await getAllEmbeddings();

      // TODO: Filter by folderId if provided (need to join with files table)
      const embeddings = storedEmbeddings.map((e: FileEmbedding) => ({
        path: e.path,
        embedding: e.embedding,
      }));

      if (embeddings.length === 0) {
        return [];
      }

      // Search should be fast, 30 seconds is plenty
      const result = await sendMessage<{ results: SearchResult[] }>(
        'search',
        {
          query,
          embeddings,
          topK: 20,
        },
        30000
      );

      return result.results;
    },
    [enabled, sendMessage]
  );

  return {
    status,
    statusMessage,
    isReady: status === 'ready',
    initialize,
    retry,
    generateEmbeddings,
    indexFiles,
    search,
    progress,
  };
}
