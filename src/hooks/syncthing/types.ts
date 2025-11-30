'use client';

import { z } from 'zod';
import {
  SyncthingInfoSchema,
  SystemStatusSchema,
  ConnectionsSchema,
  ConnectionInfoSchema,
  ConfigSchema,
  OptionsSchema,
  FolderConfigSchema,
  DeviceConfigSchema,
  FolderStatusSchema,
  VersioningConfigSchema,
  IgnorePatternsSchema,
  SystemLogsSchema,
  LogEntrySchema,
  SyncthingEventSchema,
} from './schemas';

// ---
// Inferred Types from Zod Schemas
// ---

export type SyncthingInfo = z.infer<typeof SyncthingInfoSchema>;
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

// ---
// Advanced Options Interfaces
// ---

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

// ---
// Conflict & Version Types
// ---

export interface ConflictFile {
  name: string;
  original: string;
  size: number;
  modTime?: number;
}

export interface VersionEntry {
  name: string;
  originalName: string;
  type: 'file' | 'directory';
  size?: number;
  modTime?: number;
  versionTime?: string;
}
