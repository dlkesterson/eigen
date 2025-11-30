/**
 * Navigation and routing constants
 */

/** Available application tabs/routes */
export const TABS = ['dashboard', 'folders', 'devices', 'settings', 'logs'] as const;
export type TabId = (typeof TABS)[number];

/** Default active tab */
export const DEFAULT_TAB: TabId = 'dashboard';

/** Tab metadata for navigation components */
export const TAB_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    description: 'Overview of sync status',
  },
  folders: {
    label: 'Folders',
    description: 'Manage synced folders',
  },
  devices: {
    label: 'Devices',
    description: 'Connected devices',
  },
  settings: {
    label: 'Settings',
    description: 'Application settings',
  },
  logs: {
    label: 'Logs',
    description: 'System logs',
  },
} as const satisfies Record<TabId, { label: string; description: string }>;

/** Query keys for React Query - centralized to avoid typos */
export const QUERY_KEYS = {
  SYNCTHING_INSTALLATION: ['syncthingInstallation'],
  SYSTEM_STATUS: ['systemStatus'],
  CONNECTIONS: ['connections'],
  CONFIG: ['config'],
  FOLDER_STATUS: (folderId: string) => ['folderStatus', folderId],
  DEVICE_ID: ['deviceId'],
  SYSTEM_LOGS: ['systemLogs'],
  EVENTS: ['events'],
  FOLDER_BROWSE: (folderId: string, prefix?: string) => ['folderBrowse', folderId, prefix],
  IGNORE_PATTERNS: (folderId: string) => ['ignorePatterns', folderId],
  FOLDER_VERSIONS: (folderId: string, path: string) => ['folderVersions', folderId, path],
  CONFLICTS: (folderPath: string) => ['conflicts', folderPath],
} as const;
