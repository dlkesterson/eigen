/**
 * HttpBridge - Implementation of SyncthingClient using direct HTTP calls
 * 
 * This bridge is used when running as a PWA or connecting to a remote
 * Syncthing instance directly via its REST API.
 */

import type { SyncthingClient } from './client';
import type {
    SystemStatus,
    Connections,
    Config,
    FolderConfig,
    FolderStatus,
    IgnorePatterns,
    SystemLogs,
    SyncthingInfo,
    SyncthingEvent,
    FileEntry,
    AdvancedFolderOptions,
    AdvancedDeviceOptions,
    HttpConnectionSettings,
} from './types';

export class HttpBridge implements SyncthingClient {
    private baseUrl: string;
    private apiKey: string;

    constructor(settings: HttpConnectionSettings) {
        this.baseUrl = settings.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = settings.apiKey;
    }

    /**
     * Update connection settings
     */
    updateSettings(settings: HttpConnectionSettings): void {
        this.baseUrl = settings.baseUrl.replace(/\/$/, '');
        this.apiKey = settings.apiKey;
    }

    /**
     * Make an authenticated fetch request to the Syncthing API
     */
    private async fetch<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Some endpoints return empty responses
        const text = await response.text();
        if (!text) return {} as T;

        try {
            return JSON.parse(text) as T;
        } catch {
            return text as unknown as T;
        }
    }

    // ============================================================================
    // System Operations
    // ============================================================================
    system = {
        checkInstallation: async (): Promise<SyncthingInfo> => {
            // For HTTP bridge, if we can ping, it's "installed"
            try {
                await this.fetch('/rest/system/ping');
                const status = await this.system.status();
                return {
                    installed: true,
                    version: (status as Record<string, unknown>).version as string || null,
                    path: null,
                };
            } catch {
                return {
                    installed: false,
                    version: null,
                    path: null,
                };
            }
        },

        status: async (): Promise<SystemStatus> => {
            return this.fetch<SystemStatus>('/rest/system/status');
        },

        ping: async (): Promise<{ ping: string }> => {
            return this.fetch<{ ping: string }>('/rest/system/ping');
        },

        logs: async (): Promise<SystemLogs> => {
            return this.fetch<SystemLogs>('/rest/system/log');
        },

        connections: async (): Promise<Connections> => {
            return this.fetch<Connections>('/rest/system/connections');
        },

        start: async (): Promise<string> => {
            // HTTP bridge doesn't control the Syncthing process
            throw new Error('Cannot start Syncthing via HTTP bridge. The remote instance must be running.');
        },

        stop: async (): Promise<string> => {
            // HTTP bridge doesn't control the Syncthing process
            throw new Error('Cannot stop Syncthing via HTTP bridge. Use shutdown instead.');
        },

        restart: async (): Promise<void> => {
            await this.fetch('/rest/system/restart', { method: 'POST' });
        },

        shutdown: async (): Promise<void> => {
            await this.fetch('/rest/system/shutdown', { method: 'POST' });
        },
    };

    // ============================================================================
    // Configuration Operations
    // ============================================================================
    config = {
        get: async (): Promise<Config> => {
            return this.fetch<Config>('/rest/config');
        },

        patch: async (config: Partial<Config>): Promise<void> => {
            await this.fetch('/rest/config', {
                method: 'PUT',
                body: JSON.stringify(config),
            });
        },
    };

    // ============================================================================
    // Device Operations
    // ============================================================================
    devices = {
        getLocalId: async (): Promise<string> => {
            const status = await this.system.status();
            return status.myID || '';
        },

        add: async (deviceId: string, name?: string): Promise<void> => {
            const config = await this.config.get();
            const devices = config.devices || [];

            // Check if device already exists
            if (devices.some((d) => d.deviceID === deviceId)) {
                throw new Error('Device already exists');
            }

            devices.push({
                deviceID: deviceId,
                name: name || deviceId.slice(0, 7),
                addresses: ['dynamic'],
                compression: 'metadata',
                introducer: false,
                paused: false,
            });

            await this.config.patch({ devices });
        },

        addAdvanced: async (options: AdvancedDeviceOptions): Promise<void> => {
            const config = await this.config.get();
            const devices = config.devices || [];

            if (devices.some((d) => d.deviceID === options.deviceId)) {
                throw new Error('Device already exists');
            }

            devices.push({
                deviceID: options.deviceId,
                name: options.name,
                addresses: options.addresses || ['dynamic'],
                compression: options.compression || 'metadata',
                introducer: options.introducer || false,
                autoAcceptFolders: options.autoAcceptFolders || false,
                maxSendKbps: options.maxSendKbps || 0,
                maxRecvKbps: options.maxRecvKbps || 0,
                paused: false,
            });

            await this.config.patch({ devices });
        },

        remove: async (deviceId: string): Promise<void> => {
            const config = await this.config.get();
            const devices = (config.devices || []).filter((d) => d.deviceID !== deviceId);
            await this.config.patch({ devices });
        },

        pause: async (deviceId: string): Promise<void> => {
            const config = await this.config.get();
            const devices = (config.devices || []).map((d) =>
                d.deviceID === deviceId ? { ...d, paused: true } : d
            );
            await this.config.patch({ devices });
        },

        resume: async (deviceId: string): Promise<void> => {
            const config = await this.config.get();
            const devices = (config.devices || []).map((d) =>
                d.deviceID === deviceId ? { ...d, paused: false } : d
            );
            await this.config.patch({ devices });
        },

        getStats: async (): Promise<Record<string, unknown>> => {
            return this.fetch<Record<string, unknown>>('/rest/stats/device');
        },
    };

    // ============================================================================
    // Folder Operations
    // ============================================================================
    folders = {
        add: async (folderId: string, folderLabel: string, folderPath: string): Promise<void> => {
            const config = await this.config.get();
            const folders = config.folders || [];

            if (folders.some((f) => f.id === folderId)) {
                throw new Error('Folder already exists');
            }

            const status = await this.system.status();

            folders.push({
                id: folderId,
                label: folderLabel,
                path: folderPath,
                type: 'sendreceive',
                rescanIntervalS: 3600,
                fsWatcherEnabled: true,
                fsWatcherDelayS: 10,
                ignorePerms: false,
                devices: [{ deviceID: status.myID || '' }],
                paused: false,
            });

            await this.config.patch({ folders });
        },

        addAdvanced: async (options: AdvancedFolderOptions): Promise<void> => {
            const config = await this.config.get();
            const folders = config.folders || [];

            if (folders.some((f) => f.id === options.folderId)) {
                throw new Error('Folder already exists');
            }

            const status = await this.system.status();

            const versioning = options.versioningType
                ? {
                    type: options.versioningType,
                    params: options.versioningParams || {},
                }
                : undefined;

            folders.push({
                id: options.folderId,
                label: options.folderLabel,
                path: options.folderPath,
                type: 'sendreceive',
                rescanIntervalS: options.rescanIntervalS || 3600,
                fsWatcherEnabled: options.fsWatcherEnabled ?? true,
                fsWatcherDelayS: options.fsWatcherDelayS || 10,
                ignorePerms: options.ignorePerms || false,
                versioning,
                devices: [{ deviceID: status.myID || '' }],
                paused: false,
            });

            await this.config.patch({ folders });
        },

        remove: async (folderId: string): Promise<void> => {
            const config = await this.config.get();
            const folders = (config.folders || []).filter((f) => f.id !== folderId);
            await this.config.patch({ folders });
        },

        getConfig: async (folderId: string): Promise<FolderConfig> => {
            return this.fetch<FolderConfig>(`/rest/config/folders/${encodeURIComponent(folderId)}`);
        },

        updateConfig: async (folderId: string, updates: Partial<FolderConfig>): Promise<void> => {
            const current = await this.folders.getConfig(folderId);
            await this.fetch(`/rest/config/folders/${encodeURIComponent(folderId)}`, {
                method: 'PUT',
                body: JSON.stringify({ ...current, ...updates }),
            });
        },

        pause: async (folderId: string): Promise<void> => {
            const config = await this.config.get();
            const folders = (config.folders || []).map((f) =>
                f.id === folderId ? { ...f, paused: true } : f
            );
            await this.config.patch({ folders });
        },

        resume: async (folderId: string): Promise<void> => {
            const config = await this.config.get();
            const folders = (config.folders || []).map((f) =>
                f.id === folderId ? { ...f, paused: false } : f
            );
            await this.config.patch({ folders });
        },

        rescan: async (folderId: string): Promise<void> => {
            await this.fetch(`/rest/db/scan?folder=${encodeURIComponent(folderId)}`, {
                method: 'POST',
            });
        },

        revert: async (folderId: string): Promise<void> => {
            await this.fetch(`/rest/db/revert?folder=${encodeURIComponent(folderId)}`, {
                method: 'POST',
            });
        },

        override: async (folderId: string): Promise<void> => {
            await this.fetch(`/rest/db/override?folder=${encodeURIComponent(folderId)}`, {
                method: 'POST',
            });
        },

        getStatus: async (folderId: string): Promise<FolderStatus> => {
            return this.fetch<FolderStatus>(`/rest/db/status?folder=${encodeURIComponent(folderId)}`);
        },

        getStats: async (): Promise<Record<string, unknown>> => {
            return this.fetch<Record<string, unknown>>('/rest/stats/folder');
        },

        getIgnorePatterns: async (folderId: string): Promise<IgnorePatterns> => {
            return this.fetch<IgnorePatterns>(`/rest/db/ignores?folder=${encodeURIComponent(folderId)}`);
        },

        setIgnorePatterns: async (folderId: string, patterns: string[]): Promise<void> => {
            await this.fetch(`/rest/db/ignores?folder=${encodeURIComponent(folderId)}`, {
                method: 'POST',
                body: JSON.stringify({ ignore: patterns }),
            });
        },

        share: async (folderId: string, deviceId: string): Promise<void> => {
            const config = await this.config.get();
            const folders = (config.folders || []).map((f) => {
                if (f.id !== folderId) return f;
                const devices = f.devices || [];
                if (devices.some((d) => d.deviceID === deviceId)) return f;
                return {
                    ...f,
                    devices: [...devices, { deviceID: deviceId }],
                };
            });
            await this.config.patch({ folders });
        },

        unshare: async (folderId: string, deviceId: string): Promise<void> => {
            const config = await this.config.get();
            const folders = (config.folders || []).map((f) => {
                if (f.id !== folderId) return f;
                return {
                    ...f,
                    devices: (f.devices || []).filter((d) => d.deviceID !== deviceId),
                };
            });
            await this.config.patch({ folders });
        },
    };

    // ============================================================================
    // File Browser Operations
    // ============================================================================
    files = {
        browse: async (folderId: string, prefix?: string): Promise<FileEntry[]> => {
            const params = new URLSearchParams({ folder: folderId });
            if (prefix) params.set('prefix', prefix);
            return this.fetch<FileEntry[]>(`/rest/db/browse?${params.toString()}`);
        },

        browseVersions: async (folderPath: string, subPath?: string): Promise<unknown[]> => {
            // Note: This requires server-side file system access which HTTP API doesn't provide
            // The Syncthing REST API doesn't have a direct endpoint for browsing .stversions
            console.warn('browseVersions is not fully supported via HTTP bridge');
            return [];
        },

        restoreVersion: async (_folderPath: string, _versionPath: string): Promise<void> => {
            // Not supported via HTTP API
            throw new Error('Version restore is not supported via HTTP bridge. Use the local file system.');
        },

        openInExplorer: async (_folderPath: string): Promise<void> => {
            // Not supported via HTTP API
            throw new Error('Cannot open folder in explorer via HTTP bridge.');
        },
    };

    // ============================================================================
    // Conflict Resolution
    // ============================================================================
    conflicts = {
        scan: async (_folderPath: string): Promise<unknown[]> => {
            // Syncthing API doesn't have a direct endpoint for conflict files
            // Would need to browse the folder and filter for .sync-conflict files
            console.warn('Conflict scanning is limited via HTTP bridge');
            return [];
        },

        delete: async (_folderPath: string, _conflictFile: string): Promise<void> => {
            // Not directly supported via HTTP API
            throw new Error('Conflict deletion is not supported via HTTP bridge.');
        },

        keepConflict: async (
            _folderPath: string,
            _originalFile: string,
            _conflictFile: string
        ): Promise<void> => {
            // Not directly supported via HTTP API
            throw new Error('Conflict resolution is not supported via HTTP bridge.');
        },
    };

    // ============================================================================
    // Events
    // ============================================================================
    events = {
        subscribe: (callback: (event: SyncthingEvent) => void): (() => void) => {
            let running = true;
            let lastEventId = 0;

            const poll = async () => {
                while (running) {
                    try {
                        const params = new URLSearchParams({
                            since: lastEventId.toString(),
                            limit: '100',
                            timeout: '30',
                        });

                        const events = await this.fetch<SyncthingEvent[]>(`/rest/events?${params.toString()}`);

                        if (Array.isArray(events) && events.length > 0) {
                            for (const event of events) {
                                lastEventId = Math.max(lastEventId, event.id);
                                callback(event);
                            }
                        }
                    } catch {
                        // Ignore polling errors, will retry
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            };

            poll();

            return () => {
                running = false;
            };
        },

        getRecent: async (since?: number): Promise<SyncthingEvent[]> => {
            const params = new URLSearchParams({
                since: (since || 0).toString(),
                limit: '100',
                timeout: '0',
            });
            const events = await this.fetch<SyncthingEvent[]>(`/rest/events?${params.toString()}`);
            return Array.isArray(events) ? events : [];
        },
    };
}

/**
 * Create an HTTP bridge instance
 */
export function createHttpBridge(settings: HttpConnectionSettings): HttpBridge {
    return new HttpBridge(settings);
}
