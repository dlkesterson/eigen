/**
 * useAISearch - Hook for semantic file search using AI embeddings
 *
 * Manages a Web Worker running transformers.js for:
 * - Generating file path embeddings
 * - Semantic similarity search
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { storeEmbedding, getAllEmbeddings, type FileEmbedding } from '@/lib/db';

export type AIStatus = 'idle' | 'loading' | 'ready' | 'error' | 'disabled';

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
  generateEmbeddings: (texts: string[]) => Promise<number[][]>;
  indexFiles: (files: { path: string; name: string }[]) => Promise<void>;
  search: (query: string, folderId?: string) => Promise<SearchResult[]>;
  progress: { current: number; total: number } | null;
}

export function useAISearch(options: UseAISearchOptions = {}): UseAISearchReturn {
  const { enabled = true } = options;

  const workerRef = useRef<Worker | null>(null);
  const pendingCallsRef = useRef<
    Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>
  >(new Map());
  const callIdRef = useRef(0);

  const [status, setStatus] = useState<AIStatus>(enabled ? 'idle' : 'disabled');
  const [statusMessage, setStatusMessage] = useState(enabled ? '' : 'AI features are disabled');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Initialize worker only when enabled
  useEffect(() => {
    if (!enabled) {
      // Clean up existing worker if disabled
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setStatus('disabled');
      setStatusMessage('AI features are disabled');
      return;
    }

    // Create worker - using the bundled worker file
    const worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<AIWorkerMessage>) => {
      const { id, type, payload } = event.data;

      // Handle status updates
      if (type === 'status' && payload && typeof payload === 'object') {
        const statusPayload = payload as { status?: string; message?: string };
        if (statusPayload.status === 'loading') {
          setStatus('loading');
          setStatusMessage(statusPayload.message || 'Loading model...');
        } else if (statusPayload.status === 'ready') {
          setStatus('ready');
          setStatusMessage(statusPayload.message || 'Ready');
        } else if (statusPayload.status === 'error') {
          setStatus('error');
          setStatusMessage(statusPayload.message || 'Error');
        }
      }

      // Handle responses to calls
      if (id) {
        const pending = pendingCallsRef.current.get(id);
        if (pending) {
          if (type === 'error') {
            const errorPayload = payload as { message?: string };
            pending.reject(new Error(errorPayload?.message || 'Worker error'));
          } else {
            pending.resolve(payload);
          }
          pendingCallsRef.current.delete(id);
        }
      }
    };

    worker.onerror = (error) => {
      console.error('AI Worker error:', error);
      setStatus('error');
      setStatusMessage('Worker error');
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [enabled]);

  // Send message to worker and wait for response
  const sendMessage = useCallback(
    <T>(type: string, payload?: unknown, timeoutMs = 120000): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const id = `call-${++callIdRef.current}`;

        const timeoutId = setTimeout(() => {
          if (pendingCallsRef.current.has(id)) {
            pendingCallsRef.current.delete(id);
            reject(
              new Error(`Worker call timed out after ${timeoutMs / 1000}s for operation: ${type}`)
            );
          }
        }, timeoutMs);

        pendingCallsRef.current.set(id, {
          resolve: (value: unknown) => {
            clearTimeout(timeoutId);
            resolve(value as T);
          },
          reject: (error: Error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
        });

        workerRef.current.postMessage({ id, type, payload });
      });
    },
    []
  );

  // Initialize the model
  const initialize = useCallback(async () => {
    if (!enabled) return;
    if (status === 'ready' || status === 'loading') return;
    setStatus('loading');
    try {
      // Model loading/downloading can take 5+ minutes on slow connections
      await sendMessage('init', undefined, 300000);
    } catch (error) {
      console.error('Failed to initialize AI model:', error);
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to initialize');
    }
  }, [enabled, status, sendMessage]);

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
          console.error('Error indexing batch:', error);
        }

        setProgress({ current: Math.min(i + batchSize, files.length), total: files.length });
      }

      setProgress(null);
    },
    [enabled, generateEmbeddings]
  );

  // Semantic search
  const search = useCallback(
    async (query: string, folderId?: string): Promise<SearchResult[]> => {
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
    generateEmbeddings,
    indexFiles,
    search,
    progress,
  };
}
