/**
 * AI Worker - Runs transformers.js in a Web Worker to avoid blocking the UI
 *
 * This worker handles:
 * - Loading the embedding model
 * - Generating embeddings for file names/paths
 * - Computing similarity scores for semantic search
 */

import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';

// Configure transformers.js for browser
env.allowLocalModels = false;
env.useBrowserCache = true;

// Message types
interface WorkerMessage {
    id: string;
    type: 'init' | 'embed' | 'search' | 'status';
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
            progress_callback: (progress: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
                // Report download progress
                if (progress.status === 'download' || progress.status === 'progress') {
                    const pct = progress.progress ? Math.round(progress.progress) : 0;
                    const file = progress.file ? progress.file.split('/').pop() : '';
                    postMessage({
                        type: 'status',
                        payload: {
                            status: 'loading',
                            message: `Downloading ${file}... ${pct}%`
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
        console.error('Model loading error:', error);
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

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { id, type, payload } = event.data;

    console.log(`[AI Worker] Received message: ${type}`, id ? `(id: ${id})` : '');

    try {
        switch (type) {
            case 'init': {
                const initPayload = payload as InitPayload | undefined;
                // If already loading, wait for it to complete
                if (isLoading) {
                    console.log('[AI Worker] Model already loading, waiting...');
                    // Poll until loading is done
                    while (isLoading) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                const success = await initModel(initPayload?.modelName);
                console.log(`[AI Worker] Init complete, success: ${success}, embedder: ${!!embedder}`);
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
        console.error('[AI Worker] Error handling message:', error);
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
console.log('[AI Worker] Worker script loaded, signaling ready');
postMessage({ type: 'status', payload: { status: 'initialized' } });
