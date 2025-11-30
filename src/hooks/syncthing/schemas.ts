'use client';

import { z } from 'zod';

// ---
// Core Schemas
// ---

export const SyncthingInfoSchema = z.object({
  installed: z.boolean(),
  version: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
});

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

// ---
// Versioning & Folder Schemas
// ---

export const VersioningConfigSchema = z
  .object({
    type: z.string().optional(),
    params: z.record(z.string(), z.string()).optional(),
    cleanupIntervalS: z.number().optional(),
    fsPath: z.string().optional(),
    fsType: z.string().optional(),
  })
  .passthrough();

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

// ---
// Device Schema
// ---

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

// ---
// Global Options Schema
// ---

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

// ---
// Config Schema
// ---

export const ConfigSchema = z
  .object({
    folders: z.array(FolderConfigSchema).optional(),
    devices: z.array(DeviceConfigSchema).optional(),
    options: OptionsSchema.optional(),
  })
  .passthrough();

// ---
// Ignore Patterns Schema
// ---

export const IgnorePatternsSchema = z
  .object({
    ignore: z.array(z.string()).optional(),
    expanded: z.array(z.string()).optional(),
  })
  .passthrough();

// ---
// Log Schemas
// ---

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

// ---
// Event Schema
// ---

export const SyncthingEventSchema = z
  .object({
    id: z.number(),
    globalID: z.number().optional(),
    time: z.string(),
    type: z.string(),
    data: z.any(),
  })
  .passthrough();
