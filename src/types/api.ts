/**
 * API-related types
 *
 * Types for the API abstraction layer, bridges, and client interfaces.
 */

// Bridge type enum
export type BridgeType = 'tauri' | 'http';

// File entry for browsing
export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modTime?: string;
  permissions?: string;
}

// Connection settings for HTTP bridge
export interface HttpConnectionSettings {
  baseUrl: string;
  apiKey: string;
}
