'use client';

import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store';

// ============================================================================
// Zod Schemas for Type Safety
// ============================================================================

export const SyncthingInfoSchema = z.object({
    installed: z.boolean(),
    version: z.string().nullable().optional(),
    path: z.string().nullable().optional(),
});

export type SyncthingInfo = z.infer<typeof SyncthingInfoSchema>;

export const SystemStatusSchema = z
    .object({
        myID: z.string().optional(),
        uptime: z.number().optional(),
        allPeersConnected: z.boolean().optional(),
        goroutines: z.number().optional(),
        sys: z.number().optional(),
        startTime: z.string().optional(),
    })
    .passthrough();

export const ConnectionInfoSchema = z
    .object({
        connected: z.boolean().optional(),
        paused: z.boolean().optional(),
        address: z.string().optional(),
        type: z.string().optional(),
        clientVersion: z.string().optional(),
        crypto: z.string().optional(),
    })
    .passthrough();

export const ConnectionsSchema = z
    .object({
        total: z
            .object({
                at: z.string().optional(),
                inBytesTotal: z.number().optional(),
                outBytesTotal: z.number().optional(),
            })
            .optional(),
        connections: z.record(z.string(), ConnectionInfoSchema).optional(),
    })
    .passthrough();

// Versioning schema
export const VersioningConfigSchema = z
    .object({
        type: z.string().optional(),
        params: z.record(z.string(), z.string()).optional(),
        cleanupIntervalS: z.number().optional(),
        fsPath: z.string().optional(),
        fsType: z.string().optional(),
    })
    .passthrough();

// Folder device reference schema
export const FolderDeviceSchema = z
    .object({
        deviceID: z.string(),
        introducedBy: z.string().optional(),
        encryptionPassword: z.string().optional(),
    })
    .passthrough();

export const FolderConfigSchema = z
    .object({
        id: z.string(),
        label: z.string().optional(),
        path: z.string().optional(),
        paused: z.boolean().optional(),
        type: z.string().optional(),
        rescanIntervalS: z.number().optional(),
        fsWatcherEnabled: z.boolean().optional(),
        fsWatcherDelayS: z.number().optional(),
        ignorePerms: z.boolean().optional(),
        versioning: VersioningConfigSchema.optional(),
        devices: z.array(FolderDeviceSchema).optional(),
    })
    .passthrough();

export const DeviceConfigSchema = z
    .object({
        deviceID: z.string(),
        name: z.string().optional(),
        paused: z.boolean().optional(),
        addresses: z.array(z.string()).optional(),
        compression: z.string().optional(),
        introducer: z.boolean().optional(),
        autoAcceptFolders: z.boolean().optional(),
        maxSendKbps: z.number().optional(),
        maxRecvKbps: z.number().optional(),
    })
    .passthrough();

// Global options schema
export const OptionsSchema = z
    .object({
        listenAddresses: z.array(z.string()).optional(),
        globalAnnounceServers: z.array(z.string()).optional(),
        globalAnnounceEnabled: z.boolean().optional(),
        localAnnounceEnabled: z.boolean().optional(),
        localAnnouncePort: z.number().optional(),
        localAnnounceMCAddr: z.string().optional(),
        maxSendKbps: z.number().optional(),
        maxRecvKbps: z.number().optional(),
        reconnectionIntervalS: z.number().optional(),
        relaysEnabled: z.boolean().optional(),
        relayReconnectIntervalM: z.number().optional(),
        startBrowser: z.boolean().optional(),
        natEnabled: z.boolean().optional(),
        natLeaseMinutes: z.number().optional(),
        natRenewalMinutes: z.number().optional(),
        natTimeoutSeconds: z.number().optional(),
        urAccepted: z.number().optional(),
        urSeen: z.number().optional(),
        urUniqueId: z.string().optional(),
        urURL: z.string().optional(),
        urPostInsecurely: z.boolean().optional(),
        urInitialDelayS: z.number().optional(),
        autoUpgradeIntervalH: z.number().optional(),
        upgradeToPreReleases: z.boolean().optional(),
        keepTemporariesH: z.number().optional(),
        cacheIgnoredFiles: z.boolean().optional(),
        progressUpdateIntervalS: z.number().optional(),
        limitBandwidthInLan: z.boolean().optional(),
        minHomeDiskFree: z
            .object({
                value: z.number(),
                unit: z.string(),
            })
            .optional(),
        releasesURL: z.string().optional(),
        alwaysLocalNets: z.array(z.string()).optional(),
        overwriteRemoteDeviceNamesOnConnect: z.boolean().optional(),
        tempIndexMinBlocks: z.number().optional(),
        unackedNotificationIDs: z.array(z.string()).optional(),
        trafficClass: z.number().optional(),
        setLowPriority: z.boolean().optional(),
        maxFolderConcurrency: z.number().optional(),
        crashReportingURL: z.string().optional(),
        crashReportingEnabled: z.boolean().optional(),
        stunKeepaliveStartS: z.number().optional(),
        stunKeepaliveMinS: z.number().optional(),
        stunServers: z.array(z.string()).optional(),
        databaseTuning: z.string().optional(),
        maxConcurrentIncomingRequestKiB: z.number().optional(),
        announceLANAddresses: z.boolean().optional(),
        sendFullIndexOnUpgrade: z.boolean().optional(),
        featureFlags: z.array(z.string()).optional(),
        connectionLimitEnough: z.number().optional(),
        connectionLimitMax: z.number().optional(),
        insecureAllowOldTLSVersions: z.boolean().optional(),
    })
    .passthrough();

export const ConfigSchema = z
    .object({
        folders: z.array(FolderConfigSchema).optional(),
        devices: z.array(DeviceConfigSchema).optional(),
        options: OptionsSchema.optional(),
    })
    .passthrough();

export const FolderStatusSchema = z
    .object({
        globalFiles: z.number().optional(),
        globalBytes: z.number().optional(),
        localFiles: z.number().optional(),
        localBytes: z.number().optional(),
        needFiles: z.number().optional(),
        needBytes: z.number().optional(),
        state: z.string().optional(),
        stateChanged: z.string().optional(),
    })
    .passthrough();

// Ignore patterns schema
export const IgnorePatternsSchema = z
    .object({
        ignore: z.array(z.string()).optional(),
        expanded: z.array(z.string()).optional(),
    })
    .passthrough();

// Log entry schema
export const LogEntrySchema = z
    .object({
        when: z.string(),
        message: z.string(),
        level: z.number().optional(),
    })
    .passthrough();

export const SystemLogsSchema = z
    .object({
        messages: z.array(LogEntrySchema).optional(),
    })
    .passthrough();

// Event schema
export const SyncthingEventSchema = z
    .object({
        id: z.number(),
        globalID: z.number().optional(),
        time: z.string(),
        type: z.string(),
        data: z.any(),
    })
    .passthrough();

// ============================================================================
// Types
// ============================================================================

export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export type Connections = z.infer<typeof ConnectionsSchema>;
export type ConnectionInfo = z.infer<typeof ConnectionInfoSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type Options = z.infer<typeof OptionsSchema>;
export type FolderConfig = z.infer<typeof FolderConfigSchema>;
export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;
export type FolderStatus = z.infer<typeof FolderStatusSchema>;
export type VersioningConfig = z.infer<typeof VersioningConfigSchema>;
export type IgnorePatterns = z.infer<typeof IgnorePatternsSchema>;
export type SystemLogs = z.infer<typeof SystemLogsSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type SyncthingEvent = z.infer<typeof SyncthingEventSchema>;

// Advanced folder options
export interface AdvancedFolderOptions {
    folderId: string;
    folderLabel: string;
    folderPath: string;
    versioningType?: 'simple' | 'staggered' | 'trashcan' | 'external' | '';
    versioningParams?: Record<string, string>;
    rescanIntervalS?: number;
    fsWatcherEnabled?: boolean;
    fsWatcherDelayS?: number;
    ignorePerms?: boolean;
}

// Advanced device options
export interface AdvancedDeviceOptions {
    deviceId: string;
    name: string;
    addresses?: string[];
    compression?: 'metadata' | 'always' | 'never';
    introducer?: boolean;
    autoAcceptFolders?: boolean;
    maxSendKbps?: number;
    maxRecvKbps?: number;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Check if Syncthing is installed on the system
 */
export function useSyncthingInstallation() {
    return useQuery({
        queryKey: ['syncthingInstallation'],
        queryFn: async () => {
            const data = await invoke('check_syncthing_installation');
            return SyncthingInfoSchema.parse(data);
        },
        staleTime: Infinity, // Installation status doesn't change often
        retry: 1,
    });
}

/**
 * Get Syncthing system status with polling
 */
export function useSystemStatus() {
    const pollingInterval = useAppStore((state) => state.pollingInterval);

    return useQuery({
        queryKey: ['systemStatus'],
        queryFn: async () => {
            const data = await invoke('get_system_status');
            return SystemStatusSchema.parse(data);
        },
        refetchInterval: pollingInterval,
        retry: 3,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
        staleTime: pollingInterval - 1000,
    });
}

/**
 * Get Syncthing connections info with polling
 */
export function useConnections() {
    const pollingInterval = useAppStore((state) => state.pollingInterval);

    return useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const data = await invoke('get_connections');
            return ConnectionsSchema.parse(data);
        },
        refetchInterval: pollingInterval,
        retry: 3,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
        staleTime: pollingInterval - 1000,
    });
}

/**
 * Get Syncthing configuration
 */
export function useConfig() {
    return useQuery({
        queryKey: ['config'],
        queryFn: async () => {
            const data = await invoke('get_config');
            return ConfigSchema.parse(data);
        },
        refetchInterval: 30000, // Less frequent refresh for config
        refetchOnWindowFocus: false,
        staleTime: 25000,
        retry: 3,
        retryDelay: 1000,
    });
}

/**
 * Get folder status
 */
export function useFolderStatus(folderId: string) {
    const pollingInterval = useAppStore((state) => state.pollingInterval);
    // Folder status polls faster (2x the rate)
    const folderPollingInterval = Math.max(pollingInterval / 2, 1000);

    return useQuery({
        queryKey: ['folderStatus', folderId],
        queryFn: async () => {
            const data = await invoke('get_folder_status', { folderId });
            return FolderStatusSchema.parse(data);
        },
        refetchInterval: folderPollingInterval,
        enabled: !!folderId,
        retry: 3,
        retryDelay: 1000,
    });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Start Syncthing sidecar
 */
export function useStartSyncthing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            return await invoke<string>('start_syncthing_sidecar');
        },
        onSuccess: () => {
            // Wait a bit for syncthing to start, then refetch
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
                queryClient.invalidateQueries({ queryKey: ['connections'] });
                queryClient.invalidateQueries({ queryKey: ['config'] });
            }, 2000);
        },
    });
}

/**
 * Stop Syncthing sidecar
 */
export function useStopSyncthing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            return await invoke<string>('stop_syncthing_sidecar');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
}

/**
 * Pause a folder with optimistic updates
 */
export function usePauseFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (folderId: string) => {
            await invoke('pause_folder', { folderId });
        },
        onMutate: async (folderId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['config'] });

            // Snapshot previous value
            const previousConfig = queryClient.getQueryData<Config>(['config']);

            // Optimistically update
            queryClient.setQueryData<Config>(['config'], (old) => {
                if (!old?.folders) return old;
                return {
                    ...old,
                    folders: old.folders.map((folder) =>
                        folder.id === folderId ? { ...folder, paused: true } : folder
                    ),
                };
            });

            return { previousConfig };
        },
        onError: (_err, _folderId, context) => {
            // Rollback on error
            if (context?.previousConfig) {
                queryClient.setQueryData(['config'], context.previousConfig);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
        },
    });
}

/**
 * Resume a folder with optimistic updates
 */
export function useResumeFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (folderId: string) => {
            await invoke('resume_folder', { folderId });
        },
        onMutate: async (folderId) => {
            await queryClient.cancelQueries({ queryKey: ['config'] });

            const previousConfig = queryClient.getQueryData<Config>(['config']);

            queryClient.setQueryData<Config>(['config'], (old) => {
                if (!old?.folders) return old;
                return {
                    ...old,
                    folders: old.folders.map((folder) =>
                        folder.id === folderId ? { ...folder, paused: false } : folder
                    ),
                };
            });

            return { previousConfig };
        },
        onError: (_err, _folderId, context) => {
            if (context?.previousConfig) {
                queryClient.setQueryData(['config'], context.previousConfig);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
        },
    });
}

/**
 * Rescan a folder
 */
export function useRescanFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (folderId: string) => {
            await invoke('rescan_folder', { folderId });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
        },
    });
}

// ============================================================================
// Device Management
// ============================================================================

/**
 * Get this device's ID
 */
export function useDeviceId() {
    return useQuery({
        queryKey: ['deviceId'],
        queryFn: async () => {
            return await invoke<string>('get_device_id');
        },
        staleTime: Infinity,
        retry: 3,
    });
}

/**
 * Add a new device
 */
export function useAddDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ deviceId, name }: { deviceId: string; name?: string }) => {
            await invoke('add_device', { deviceId, name: name || deviceId.slice(0, 7) });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
}

/**
 * Remove a device
 */
export function useRemoveDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (deviceId: string) => {
            await invoke('remove_device', { deviceId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
}

/**
 * Pause a device with optimistic updates
 */
export function usePauseDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (deviceId: string) => {
            await invoke('pause_device', { deviceId });
        },
        onMutate: async (deviceId) => {
            await queryClient.cancelQueries({ queryKey: ['config'] });

            const previousConfig = queryClient.getQueryData<Config>(['config']);

            queryClient.setQueryData<Config>(['config'], (old) => {
                if (!old?.devices) return old;
                return {
                    ...old,
                    devices: old.devices.map((device) =>
                        device.deviceID === deviceId ? { ...device, paused: true } : device
                    ),
                };
            });

            return { previousConfig };
        },
        onError: (_err, _deviceId, context) => {
            if (context?.previousConfig) {
                queryClient.setQueryData(['config'], context.previousConfig);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
}

/**
 * Resume a device with optimistic updates
 */
export function useResumeDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (deviceId: string) => {
            await invoke('resume_device', { deviceId });
        },
        onMutate: async (deviceId) => {
            await queryClient.cancelQueries({ queryKey: ['config'] });

            const previousConfig = queryClient.getQueryData<Config>(['config']);

            queryClient.setQueryData<Config>(['config'], (old) => {
                if (!old?.devices) return old;
                return {
                    ...old,
                    devices: old.devices.map((device) =>
                        device.deviceID === deviceId ? { ...device, paused: false } : device
                    ),
                };
            });

            return { previousConfig };
        },
        onError: (_err, _deviceId, context) => {
            if (context?.previousConfig) {
                queryClient.setQueryData(['config'], context.previousConfig);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
}

// ============================================================================
// Folder Management
// ============================================================================

/**
 * Add a new folder
 */
export function useAddFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            folderId,
            folderLabel,
            folderPath,
        }: {
            folderId: string;
            folderLabel: string;
            folderPath: string;
        }) => {
            await invoke('add_folder', { folderId, folderLabel, folderPath });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
        },
    });
}

/**
 * Remove a folder
 */
export function useRemoveFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (folderId: string) => {
            await invoke('remove_folder', { folderId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
        },
    });
}

/**
 * Share a folder with a device
 */
export function useShareFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ folderId, deviceId }: { folderId: string; deviceId: string }) => {
            await invoke('share_folder', { folderId, deviceId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            // Also invalidate folder status as it might change from "Up to Date" to "Syncing"
            queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
        },
    });
}

/**
 * Unshare a folder from a device with optimistic updates
 */
export function useUnshareFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ folderId, deviceId }: { folderId: string; deviceId: string }) => {
            await invoke('unshare_folder', { folderId, deviceId });
        },
        onMutate: async ({ folderId, deviceId }) => {
            await queryClient.cancelQueries({ queryKey: ['config'] });

            const previousConfig = queryClient.getQueryData<Config>(['config']);

            queryClient.setQueryData<Config>(['config'], (old) => {
                if (!old?.folders) return old;
                return {
                    ...old,
                    folders: old.folders.map((folder) => {
                        if (folder.id !== folderId) return folder;
                        return {
                            ...folder,
                            devices: folder.devices?.filter((d) => d.deviceID !== deviceId) || [],
                        };
                    }),
                };
            });

            return { previousConfig };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousConfig) {
                queryClient.setQueryData(['config'], context.previousConfig);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
        },
    });
}

// ============================================================================
// Advanced Folder Management
// ============================================================================

/**
 * Add a folder with advanced options
 */
export function useAddFolderAdvanced() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (options: AdvancedFolderOptions) => {
            await invoke('add_folder_advanced', {
                folderId: options.folderId,
                folderLabel: options.folderLabel,
                folderPath: options.folderPath,
                versioningType: options.versioningType || null,
                versioningParams: options.versioningParams || null,
                rescanIntervalS: options.rescanIntervalS || null,
                fsWatcherEnabled: options.fsWatcherEnabled ?? null,
                fsWatcherDelayS: options.fsWatcherDelayS || null,
                ignorePerms: options.ignorePerms ?? null,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
        },
    });
}

/**
 * Get detailed folder configuration
 */
export function useFolderConfig(folderId: string) {
    return useQuery({
        queryKey: ['folderConfig', folderId],
        queryFn: async () => {
            const data = await invoke('get_folder_config', { folderId });
            return FolderConfigSchema.parse(data);
        },
        enabled: !!folderId,
        staleTime: 30000,
    });
}

/**
 * Update folder configuration
 */
export function useUpdateFolderConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            folderId,
            updates,
        }: {
            folderId: string;
            updates: Partial<FolderConfig>;
        }) => {
            await invoke('update_folder_config', { folderId, updates });
        },
        onSuccess: (_data, { folderId }) => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['folderConfig', folderId] });
        },
    });
}

// ============================================================================
// Ignore Patterns (.stignore)
// ============================================================================

/**
 * Get ignore patterns for a folder
 */
export function useFolderIgnores(folderId: string) {
    return useQuery({
        queryKey: ['folderIgnores', folderId],
        queryFn: async () => {
            const data = await invoke('get_folder_ignores', { folderId });
            return IgnorePatternsSchema.parse(data);
        },
        enabled: !!folderId,
        staleTime: 30000,
    });
}

/**
 * Set ignore patterns for a folder
 */
export function useSetFolderIgnores() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            folderId,
            ignorePatterns,
        }: {
            folderId: string;
            ignorePatterns: string[];
        }) => {
            await invoke('set_folder_ignores', { folderId, ignorePatterns });
        },
        onSuccess: (_data, { folderId }) => {
            queryClient.invalidateQueries({ queryKey: ['folderIgnores', folderId] });
        },
    });
}

// ============================================================================
// System Logs
// ============================================================================

/**
 * Get system logs
 */
export function useSystemLogs(since?: string) {
    return useQuery({
        queryKey: ['systemLogs', since],
        queryFn: async () => {
            const data = await invoke('get_system_logs', { since: since || null });
            return SystemLogsSchema.parse(data);
        },
        refetchInterval: 10000, // Refresh every 10 seconds
        staleTime: 5000,
    });
}

// ============================================================================
// Event API for Real-Time Updates
// ============================================================================

/**
 * Hook for real-time Syncthing events using long-polling
 */
export function useSyncthingEvents(options?: {
    onEvent?: (event: SyncthingEvent) => void;
    enabled?: boolean;
}) {
    const queryClient = useQueryClient();
    const lastEventIdRef = useRef<number>(0);
    const [events, setEvents] = useState<SyncthingEvent[]>([]);
    const [isPolling, setIsPolling] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const enabled = options?.enabled ?? true;

    const pollEvents = useCallback(async () => {
        if (!enabled) return;

        setIsPolling(true);

        try {
            const data = await invoke<SyncthingEvent[]>('get_events', {
                since: lastEventIdRef.current,
                limit: 100,
                timeout: 30,
            });

            if (Array.isArray(data) && data.length > 0) {
                const parsedEvents = data.map((e) => SyncthingEventSchema.parse(e));

                // Update last event ID
                const maxId = Math.max(...parsedEvents.map((e) => e.id));
                if (maxId > lastEventIdRef.current) {
                    lastEventIdRef.current = maxId;
                }

                setEvents((prev) => [...prev.slice(-100), ...parsedEvents]);

                // Call event handler for each event
                parsedEvents.forEach((event) => {
                    options?.onEvent?.(event);

                    // Invalidate queries based on event type
                    switch (event.type) {
                        case 'StateChanged':
                        case 'FolderCompletion':
                        case 'FolderSummary':
                            queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
                            break;
                        case 'DeviceConnected':
                        case 'DeviceDisconnected':
                        case 'DevicePaused':
                        case 'DeviceResumed':
                            queryClient.invalidateQueries({ queryKey: ['connections'] });
                            break;
                        case 'ConfigSaved':
                            queryClient.invalidateQueries({ queryKey: ['config'] });
                            break;
                        case 'ItemStarted':
                        case 'ItemFinished':
                            queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
                            break;
                    }
                });
            }
        } catch (error) {
            // Only log actual errors, not aborts or empty responses
            const isAbortError = error instanceof DOMException && error.name === 'AbortError';
            const isNullish = error === null || error === undefined;
            const isEmptyError =
                error &&
                typeof error === 'object' &&
                !Array.isArray(error) &&
                (Object.keys(error as object).length === 0 || JSON.stringify(error) === '{}');

            // Also check for timeout errors which are expected during long polling
            const errorStr = String(error);
            const isTimeoutError = errorStr.includes('timeout') || errorStr.includes('Timeout');

            // Skip logging for expected non-error conditions
            if (isAbortError || isEmptyError || isNullish || isTimeoutError) {
                return;
            }

            console.error('Event polling error:', error);
        } finally {
            setIsPolling(false);
        }
    }, [enabled, queryClient, options]);

    useEffect(() => {
        if (!enabled) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const poll = async () => {
            await pollEvents();
            // Schedule next poll
            timeoutId = setTimeout(poll, 1000);
        };

        poll();

        return () => {
            clearTimeout(timeoutId);
            abortControllerRef.current?.abort();
        };
    }, [enabled, pollEvents]);

    return {
        events,
        isPolling,
        clearEvents: () => setEvents([]),
    };
}

// ============================================================================
// Advanced Device Management
// ============================================================================

/**
 * Add device with advanced options
 */
export function useAddDeviceAdvanced() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (options: AdvancedDeviceOptions) => {
            await invoke('add_device_advanced', {
                deviceId: options.deviceId,
                name: options.name,
                addresses: options.addresses || null,
                compression: options.compression || null,
                introducer: options.introducer ?? null,
                autoAcceptFolders: options.autoAcceptFolders ?? null,
                maxSendKbps: options.maxSendKbps || null,
                maxRecvKbps: options.maxRecvKbps || null,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
}

/**
 * Get detailed device configuration
 */
export function useDeviceConfig(deviceId: string) {
    return useQuery({
        queryKey: ['deviceConfig', deviceId],
        queryFn: async () => {
            const data = await invoke('get_device_config', { deviceId });
            return DeviceConfigSchema.parse(data);
        },
        enabled: !!deviceId,
        staleTime: 30000,
    });
}

/**
 * Update device configuration
 */
export function useUpdateDeviceConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            deviceId,
            updates,
        }: {
            deviceId: string;
            updates: Partial<DeviceConfig>;
        }) => {
            await invoke('update_device_config', { deviceId, updates });
        },
        onSuccess: (_data, { deviceId }) => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
            queryClient.invalidateQueries({ queryKey: ['deviceConfig', deviceId] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
}

// ============================================================================
// System Management
// ============================================================================

/**
 * Restart Syncthing
 */
export function useRestartSyncthing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await invoke('restart_syncthing');
        },
        onSuccess: () => {
            // Wait for restart and then refetch everything
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
                queryClient.invalidateQueries({ queryKey: ['config'] });
                queryClient.invalidateQueries({ queryKey: ['connections'] });
            }, 3000);
        },
    });
}

// ============================================================================
// File Browser Integration
// ============================================================================

/**
 * Open folder in system file explorer
 */
export function useOpenFolderInExplorer() {
    return useMutation({
        mutationFn: async (folderPath: string) => {
            await invoke('open_folder_in_explorer', { folderPath });
        },
    });
}

/**
 * Browse folder contents
 */
export function useBrowseFolder(folderId: string, prefix?: string) {
    return useQuery({
        queryKey: ['browseFolder', folderId, prefix],
        queryFn: async () => {
            const data = await invoke('browse_folder', {
                folderId,
                prefix: prefix || null,
            });
            return data as Record<string, unknown>[];
        },
        enabled: !!folderId,
        staleTime: 10000,
    });
}

// ============================================================================
// Conflict Resolution
// ============================================================================

export interface ConflictFile {
    name: string;
    original: string;
    size: number;
    modTime?: number;
}

/**
 * Scan folder for conflict files
 */
export function useScanConflicts(folderPath: string) {
    return useQuery({
        queryKey: ['conflicts', folderPath],
        queryFn: async () => {
            const data = await invoke<ConflictFile[]>('scan_for_conflicts', { folderPath });
            return data;
        },
        enabled: !!folderPath,
        staleTime: 30000,
    });
}

/**
 * Delete a conflict file (keep original)
 */
export function useDeleteConflict() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            folderPath,
            conflictFile,
        }: {
            folderPath: string;
            conflictFile: string;
        }) => {
            await invoke('delete_conflict_file', { folderPath, conflictFile });
        },
        onSuccess: (_data, { folderPath }) => {
            queryClient.invalidateQueries({ queryKey: ['conflicts', folderPath] });
        },
    });
}

/**
 * Resolve conflict by keeping the conflict version
 */
export function useResolveConflictKeepConflict() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            folderPath,
            originalFile,
            conflictFile,
        }: {
            folderPath: string;
            originalFile: string;
            conflictFile: string;
        }) => {
            await invoke('resolve_conflict_keep_conflict', { folderPath, originalFile, conflictFile });
        },
        onSuccess: (_data, { folderPath }) => {
            queryClient.invalidateQueries({ queryKey: ['conflicts', folderPath] });
        },
    });
}

// ============================================================================
// File Versioning
// ============================================================================

export interface VersionEntry {
    name: string;
    originalName: string;
    type: 'file' | 'directory';
    size?: number;
    modTime?: number;
    versionTime?: string;
}

/**
 * Browse .stversions folder for old file versions
 */
export function useBrowseVersions(folderPath: string, prefix?: string) {
    return useQuery({
        queryKey: ['versions', folderPath, prefix],
        queryFn: async () => {
            const data = await invoke<VersionEntry[]>('browse_versions', {
                folderPath,
                prefix: prefix || null,
            });
            return data;
        },
        enabled: !!folderPath,
        staleTime: 10000,
    });
}

/**
 * Restore a versioned file to its original location
 */
export function useRestoreVersion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            folderPath,
            versionPath,
            originalName,
            overwrite = false,
        }: {
            folderPath: string;
            versionPath: string;
            originalName: string;
            overwrite?: boolean;
        }) => {
            await invoke('restore_version', {
                folderPath,
                versionPath,
                originalName,
                overwrite,
            });
        },
        onSuccess: (_data, { folderPath }) => {
            queryClient.invalidateQueries({ queryKey: ['versions', folderPath] });
            queryClient.invalidateQueries({ queryKey: ['browseFolder'] });
        },
    });
}

// ============================================================================
// Global Options
// ============================================================================

/**
 * Update global Syncthing options (network settings, discovery, etc.)
 */
export function useUpdateOptions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (options: Partial<Options>) => {
            await invoke('update_options', { options });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config'] });
        },
    });
}

// ============================================================================
// Syncthing Lifecycle
// ============================================================================

/**
 * Hook to manage Syncthing lifecycle - auto-starts on mount
 */
export function useSyncthingLifecycle() {
    const startMutation = useStartSyncthing();
    const { data: status, isError, error } = useSystemStatus();

    return {
        start: startMutation.mutate,
        isStarting: startMutation.isPending,
        startError: startMutation.error,
        isRunning: !!status?.myID,
        isConnecting: !status?.myID && !isError,
        connectionError: isError ? error : null,
    };
}
