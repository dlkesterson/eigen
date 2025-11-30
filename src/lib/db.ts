/**
 * IndexedDB schema and utilities for file metadata and embeddings
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface EigenDB extends DBSchema {
  files: {
    key: string; // Full path
    value: FileMetadata;
    indexes: {
      'by-folder': string;
      'by-name': string;
      'by-modified': number;
    };
  };
  embeddings: {
    key: string; // Full path
    value: FileEmbedding;
  };
  searchHistory: {
    key: number; // Auto-increment
    value: SearchHistoryEntry;
    indexes: {
      'by-query': string;
      'by-date': number;
    };
  };
  activityLog: {
    key: number;
    value: ActivityLogEntry;
    indexes: {
      'by-path': string;
      'by-date': number;
      'by-action': string;
    };
  };
}

export interface FileMetadata {
  path: string;
  name: string;
  folderId: string;
  folderPath: string;
  size: number;
  modified: number;
  isDirectory: boolean;
  extension?: string;
  indexed: number; // When it was indexed
}

export interface FileEmbedding {
  path: string;
  embedding: number[]; // Vector embedding
  model: string;
  createdAt: number;
}

export interface SearchHistoryEntry {
  query: string;
  resultCount: number;
  selectedPath?: string;
  timestamp: number;
}

export interface ActivityLogEntry {
  path: string;
  action: 'open' | 'sync' | 'modify' | 'search';
  timestamp: number;
  details?: string;
}

const DB_NAME = 'eigen-ai';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<EigenDB> | null = null;

/**
 * Get or create the database instance
 */
export async function getDB(): Promise<IDBPDatabase<EigenDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<EigenDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Files store
      if (!db.objectStoreNames.contains('files')) {
        const fileStore = db.createObjectStore('files', { keyPath: 'path' });
        fileStore.createIndex('by-folder', 'folderId');
        fileStore.createIndex('by-name', 'name');
        fileStore.createIndex('by-modified', 'modified');
      }

      // Embeddings store
      if (!db.objectStoreNames.contains('embeddings')) {
        db.createObjectStore('embeddings', { keyPath: 'path' });
      }

      // Search history store
      if (!db.objectStoreNames.contains('searchHistory')) {
        const historyStore = db.createObjectStore('searchHistory', {
          keyPath: 'id',
          autoIncrement: true,
        });
        historyStore.createIndex('by-query', 'query');
        historyStore.createIndex('by-date', 'timestamp');
      }

      // Activity log store
      if (!db.objectStoreNames.contains('activityLog')) {
        const activityStore = db.createObjectStore('activityLog', {
          keyPath: 'id',
          autoIncrement: true,
        });
        activityStore.createIndex('by-path', 'path');
        activityStore.createIndex('by-date', 'timestamp');
        activityStore.createIndex('by-action', 'action');
      }
    },
  });

  return dbInstance;
}

// ---
// File Operations
// ---

/**
 * Add or update file metadata
 */
export async function upsertFile(file: FileMetadata): Promise<void> {
  const db = await getDB();
  await db.put('files', file);
}

/**
 * Bulk add files (for initial indexing)
 */
export async function bulkUpsertFiles(files: FileMetadata[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('files', 'readwrite');
  await Promise.all([...files.map((file) => tx.store.put(file)), tx.done]);
}

/**
 * Get all files for a folder
 */
export async function getFilesByFolder(folderId: string): Promise<FileMetadata[]> {
  const db = await getDB();
  return db.getAllFromIndex('files', 'by-folder', folderId);
}

/**
 * Search files by name (simple substring match)
 */
export async function searchFilesByName(query: string): Promise<FileMetadata[]> {
  const db = await getDB();
  const allFiles = await db.getAll('files');
  const lowerQuery = query.toLowerCase();
  return allFiles.filter(
    (file) =>
      file.name.toLowerCase().includes(lowerQuery) || file.path.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get file count
 */
export async function getFileCount(): Promise<number> {
  const db = await getDB();
  return db.count('files');
}

/**
 * Clear all files for a folder (for re-indexing)
 */
export async function clearFilesForFolder(folderId: string): Promise<void> {
  const db = await getDB();
  const files = await db.getAllFromIndex('files', 'by-folder', folderId);
  const tx = db.transaction('files', 'readwrite');
  await Promise.all([...files.map((file) => tx.store.delete(file.path)), tx.done]);
}

// ---
// Embedding Operations
// ---

/**
 * Store embedding for a file
 */
export async function storeEmbedding(embedding: FileEmbedding): Promise<void> {
  const db = await getDB();
  await db.put('embeddings', embedding);
}

/**
 * Bulk store embeddings
 */
export async function bulkStoreEmbeddings(embeddings: FileEmbedding[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('embeddings', 'readwrite');
  await Promise.all([...embeddings.map((emb) => tx.store.put(emb)), tx.done]);
}

/**
 * Get embedding for a file
 */
export async function getEmbedding(path: string): Promise<FileEmbedding | undefined> {
  const db = await getDB();
  return db.get('embeddings', path);
}

/**
 * Get all embeddings (for semantic search)
 */
export async function getAllEmbeddings(): Promise<FileEmbedding[]> {
  const db = await getDB();
  return db.getAll('embeddings');
}

/**
 * Get files without embeddings
 */
export async function getFilesWithoutEmbeddings(): Promise<FileMetadata[]> {
  const db = await getDB();
  const files = await db.getAll('files');
  const embeddingPaths = new Set(await db.getAllKeys('embeddings'));
  return files.filter((file) => !embeddingPaths.has(file.path));
}

// ---
// Activity Logging
// ---

/**
 * Log an activity
 */
export async function logActivity(entry: Omit<ActivityLogEntry, 'timestamp'>): Promise<void> {
  const db = await getDB();
  await db.add('activityLog', {
    ...entry,
    timestamp: Date.now(),
  });
}

/**
 * Get recent activity for a path (for predictive sync)
 */
export async function getActivityForPath(path: string, limit = 100): Promise<ActivityLogEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('activityLog', 'by-path', path);
  return entries.slice(-limit);
}

/**
 * Get most accessed files (for predictive sync)
 */
export async function getMostAccessedFiles(limit = 50): Promise<{ path: string; count: number }[]> {
  const db = await getDB();
  const entries = await db.getAll('activityLog');

  // Count accesses per path
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.path, (counts.get(entry.path) || 0) + 1);
  }

  // Sort by count and return top N
  return Array.from(counts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ---
// Search History
// ---

/**
 * Log a search query
 */
export async function logSearch(
  query: string,
  resultCount: number,
  selectedPath?: string
): Promise<void> {
  const db = await getDB();
  await db.add('searchHistory', {
    query,
    resultCount,
    selectedPath,
    timestamp: Date.now(),
  });
}

/**
 * Get recent searches
 */
export async function getRecentSearches(limit = 10): Promise<SearchHistoryEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('searchHistory', 'by-date');
  return entries.slice(-limit).reverse();
}

// ---
// Database Management
// ---

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('files'),
    db.clear('embeddings'),
    db.clear('searchHistory'),
    db.clear('activityLog'),
  ]);
}

/**
 * Get database stats
 */
export async function getDBStats(): Promise<{
  fileCount: number;
  embeddingCount: number;
  activityCount: number;
  searchCount: number;
}> {
  const db = await getDB();
  return {
    fileCount: await db.count('files'),
    embeddingCount: await db.count('embeddings'),
    activityCount: await db.count('activityLog'),
    searchCount: await db.count('searchHistory'),
  };
}
