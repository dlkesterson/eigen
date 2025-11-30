/**
 * AI Worker - Runs transformers.js in a Web Worker to avoid blocking the UI
 *
 * This worker handles:
 * - Loading the embedding model
 * - Generating embeddings for file names/paths
 * - Computing similarity scores for semantic search
 */

/* eslint-disable no-console */
import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';

// Debug mode - set to false for production
const DEBUG = process.env.NODE_ENV === 'development';

// Worker-specific logger (can't use main thread logger)
const workerLog = {
  debug: (msg: string, ...args: unknown[]) => DEBUG && console.log(`[AI Worker] ${msg}`, ...args),
  info: (msg: string, ...args: unknown[]) => console.log(`[AI Worker] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[AI Worker] ${msg}`, ...args),
};

// Configure transformers.js for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

// Message types
interface WorkerMessage {
  id: string;
  type: 'init' | 'embed' | 'search' | 'status' | 'diff';
  payload?: unknown;
}

interface InitPayload {
  modelName?: string;
}

interface EmbedPayload {
  texts: string[];
}

interface SearchPayload {
  query: string;
  embeddings: { path: string; embedding: number[] }[];
  topK?: number;
}

interface DiffPayload {
  contentA: string;
  contentB: string;
  labelA?: string;
  labelB?: string;
}

interface DiffSummary {
  summary: string;
  additions: number;
  deletions: number;
  modifications: number;
  keyChanges: string[];
}

// Worker state
let embedder: FeatureExtractionPipeline | null = null;
let isLoading = false;
let modelName = 'Xenova/all-MiniLM-L6-v2'; // Small, fast model

/**
 * Initialize the embedding pipeline
 */
async function initModel(name?: string): Promise<boolean> {
  if (isLoading) {
    // Already loading, return false to indicate no new load started
    return false;
  }
  if (embedder) {
    // Already loaded, return true
    return true;
  }

  isLoading = true;
  modelName = name || modelName;

  try {
    postMessage({
      type: 'status',
      payload: { status: 'loading', message: `Downloading model: ${modelName}...` },
    });

    embedder = (await pipeline('feature-extraction', modelName, {
      quantized: true, // Use quantized model for smaller size
      progress_callback: (progress: {
        status: string;
        file?: string;
        progress?: number;
        loaded?: number;
        total?: number;
      }) => {
        // Report download progress
        if (progress.status === 'download' || progress.status === 'progress') {
          const pct = progress.progress ? Math.round(progress.progress) : 0;
          const file = progress.file ? progress.file.split('/').pop() : '';
          postMessage({
            type: 'status',
            payload: {
              status: 'loading',
              message: `Downloading ${file}... ${pct}%`,
            },
          });
        } else if (progress.status === 'done') {
          postMessage({
            type: 'status',
            payload: { status: 'loading', message: 'Initializing model...' },
          });
        }
      },
    })) as FeatureExtractionPipeline;

    postMessage({
      type: 'status',
      payload: { status: 'ready', message: 'Model loaded successfully' },
    });
  } catch (error) {
    workerLog.error('Model loading error:', error);
    postMessage({
      type: 'status',
      payload: {
        status: 'error',
        message: `Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    });
    return false;
  } finally {
    isLoading = false;
  }
  return true;
}

/**
 * Generate embeddings for texts
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!embedder) {
    throw new Error('Model not initialized');
  }

  const results: number[][] = [];

  for (const text of texts) {
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    });
    // Convert tensor to array
    results.push(Array.from(output.data as Float32Array));
  }

  return results;
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

/**
 * Semantic search - find most similar files to query
 */
async function semanticSearch(
  query: string,
  embeddings: { path: string; embedding: number[] }[],
  topK = 10
): Promise<{ path: string; score: number }[]> {
  if (!embedder) {
    throw new Error('Model not initialized');
  }

  // Generate query embedding
  const queryEmbedding = (await generateEmbeddings([query]))[0];

  // Compute similarities
  const results = embeddings.map((item) => ({
    path: item.path,
    score: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  // Sort by similarity and return top K
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Analyze differences between two text contents
 * This is a lightweight diff analysis without requiring the LLM
 */
function analyzeDiff(
  contentA: string,
  contentB: string,
  labelA = 'Version A',
  labelB = 'Version B'
): DiffSummary {
  const linesA = contentA.split('\n');
  const linesB = contentB.split('\n');

  // Create sets for quick lookup
  const setA = new Set(linesA.map((l) => l.trim()).filter((l) => l.length > 0));
  const setB = new Set(linesB.map((l) => l.trim()).filter((l) => l.length > 0));

  // Find additions (in B but not in A)
  const addedLines = linesB.filter((l) => l.trim().length > 0 && !setA.has(l.trim()));

  // Find deletions (in A but not in B)
  const deletedLines = linesA.filter((l) => l.trim().length > 0 && !setB.has(l.trim()));

  // Extract key changes (significant lines)
  const keyChanges: string[] = [];

  // Look for significant additions
  for (const line of addedLines.slice(0, 3)) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 100) {
      keyChanges.push(`Added: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}"`);
    }
  }

  // Look for significant deletions
  for (const line of deletedLines.slice(0, 3)) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 100) {
      keyChanges.push(`Removed: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}"`);
    }
  }

  // Calculate modifications (lines that changed)
  const modifications = Math.min(addedLines.length, deletedLines.length);
  const additions = Math.max(0, addedLines.length - modifications);
  const deletions = Math.max(0, deletedLines.length - modifications);

  // Generate summary
  let summary = '';

  if (additions === 0 && deletions === 0 && modifications === 0) {
    summary = 'The files appear to be identical.';
  } else {
    const parts: string[] = [];

    if (additions > 0) {
      parts.push(`${additions} new line${additions !== 1 ? 's' : ''}`);
    }
    if (deletions > 0) {
      parts.push(`${deletions} removed line${deletions !== 1 ? 's' : ''}`);
    }
    if (modifications > 0) {
      parts.push(`${modifications} modified line${modifications !== 1 ? 's' : ''}`);
    }

    summary = `${labelB} has ${parts.join(', ')} compared to ${labelA}.`;

    // Add size comparison
    const sizeA = contentA.length;
    const sizeB = contentB.length;
    const sizeDiff = sizeB - sizeA;

    if (Math.abs(sizeDiff) > 100) {
      summary += ` Overall, the file is ${sizeDiff > 0 ? 'larger' : 'smaller'} by ${Math.abs(sizeDiff)} characters.`;
    }
  }

  return {
    summary,
    additions,
    deletions,
    modifications,
    keyChanges,
  };
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  workerLog.debug(`Received message: ${type}`, id ? `(id: ${id})` : '');

  try {
    switch (type) {
      case 'init': {
        const initPayload = payload as InitPayload | undefined;
        // If already loading, wait for it to complete
        if (isLoading) {
          workerLog.debug('Model already loading, waiting...');
          // Poll until loading is done
          while (isLoading) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        const success = await initModel(initPayload?.modelName);
        workerLog.debug(`Init complete, success: ${success}, embedder: ${!!embedder}`);
        postMessage({ id, type: 'init', payload: { success: !!embedder } });
        break;
      }

      case 'embed': {
        const embedPayload = payload as EmbedPayload;
        const embeddings = await generateEmbeddings(embedPayload.texts);
        postMessage({ id, type: 'embed', payload: { embeddings } });
        break;
      }

      case 'search': {
        const searchPayload = payload as SearchPayload;
        const results = await semanticSearch(
          searchPayload.query,
          searchPayload.embeddings,
          searchPayload.topK
        );
        postMessage({ id, type: 'search', payload: { results } });
        break;
      }

      case 'diff': {
        const diffPayload = payload as DiffPayload;
        const diffResult = analyzeDiff(
          diffPayload.contentA,
          diffPayload.contentB,
          diffPayload.labelA,
          diffPayload.labelB
        );
        postMessage({ id, type: 'diff', payload: diffResult });
        break;
      }

      case 'status': {
        postMessage({
          id,
          type: 'status',
          payload: {
            initialized: !!embedder,
            loading: isLoading,
            model: modelName,
          },
        });
        break;
      }

      default:
        postMessage({
          id,
          type: 'error',
          payload: { message: `Unknown message type: ${type}` },
        });
    }
  } catch (error) {
    workerLog.error('Error handling message:', error);
    postMessage({
      id,
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

// Signal that worker is ready
workerLog.info('Worker script loaded, signaling ready');
postMessage({ type: 'status', payload: { status: 'initialized' } });
