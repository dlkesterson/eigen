export const TABS = ['dashboard', 'folders', 'devices', 's3', 'settings', 'logs'] as const;
export type TabId = (typeof TABS)[number];

export const DEFAULT_TAB: TabId = 'dashboard';

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
  s3: {
    label: 'S3 Storage',
    description: 'Cloud backup and archival',
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
  // Pending requests
  PENDING_DEVICES: 'pendingDevices',
  PENDING_FOLDERS: 'pendingFolders',
  PENDING_REQUESTS: 'pendingRequests',
  // S3 storage
  S3_CONFIG: ['s3Config'],
  S3_OBJECTS: (prefix?: string) => ['s3Objects', prefix],
  S3_CONNECTION_STATUS: ['s3ConnectionStatus'],
} as const;
