/**
 * Syncthing API Abstraction Layer
 * 
 * This module provides a unified interface for interacting with Syncthing,
 * supporting both local (Tauri) and remote (HTTP) backends.
 * 
 * Usage:
 * ```tsx
 * // Wrap your app with the provider
 * <SyncthingClientProvider>
 *   <App />
 * </SyncthingClientProvider>
 * 
 * // In components, use the hook
 * const { client, bridgeType, connectToRemote } = useSyncthingClient();
 * 
 * // Or get just the client
 * const client = useClient();
 * await client.system.status();
 * ```
 */

// Types
export type {
    SystemStatus,
    Connections,
    Config,
    FolderConfig,
    DeviceConfig,
    FolderStatus,
    IgnorePatterns,
    SystemLogs,
    SyncthingEvent,
    SyncthingInfo,
    FileEntry,
    AdvancedFolderOptions,
    AdvancedDeviceOptions,
    BridgeType,
    HttpConnectionSettings,
} from './types';

// Client interface
export type { SyncthingClient } from './client';

// Bridges
export { TauriBridge, tauriBridge } from './tauri-bridge';
export { HttpBridge, createHttpBridge } from './http-bridge';

// Provider and hooks
export { SyncthingClientProvider, useSyncthingClient, useClient } from './provider';
