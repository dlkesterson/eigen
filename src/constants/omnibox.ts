/**
 * Omnibox Constants
 *
 * Command definitions, visualization mappings, and configuration for the Omnibox interface.
 */

import type {
  CommandDefinition,
  CommandCategory,
  VisualizationType,
  CommandIntent,
} from '@/types/omnibox';

// =============================================================================
// Command Definitions
// =============================================================================

export const COMMANDS: CommandDefinition[] = [
  // Status Queries
  {
    id: 'status',
    aliases: ['status', 'overview', 'dashboard', 'home'],
    category: 'status',
    description: 'Show overall system health dashboard',
    visualization: 'health-dashboard',
    examples: ['status', 'overview', 'show dashboard'],
  },
  {
    id: 'device',
    aliases: ['device', 'devices', 'show device'],
    category: 'status',
    description: 'Show device details or device topology',
    visualization: 'device-topology',
    examples: ['device laptop', 'devices', 'show device phone'],
    parameters: [
      {
        name: 'deviceName',
        type: 'device',
        required: false,
        description: 'Name or ID of the device to inspect',
      },
    ],
  },
  {
    id: 'folder',
    aliases: ['folder', 'folders', 'show folder', 'explore'],
    category: 'status',
    description: 'Show folder sync status or explore folder structure',
    visualization: 'folder-explorer',
    examples: ['folder Documents', 'folders', 'explore Photos'],
    parameters: [
      {
        name: 'folderName',
        type: 'folder',
        required: false,
        description: 'Name or path of the folder to inspect',
      },
    ],
  },
  {
    id: 'conflicts',
    aliases: ['conflicts', 'conflict', 'issues', 'problems'],
    category: 'status',
    description: 'Show all file conflicts',
    visualization: 'conflict-space',
    examples: ['conflicts', 'show conflicts', 'issues'],
  },
  {
    id: 'bandwidth',
    aliases: ['bandwidth', 'network', 'transfer', 'transfers', 'syncing'],
    category: 'status',
    description: 'Show network usage and active transfers',
    visualization: 'sync-flow',
    examples: ['bandwidth', 'show transfers', 'what is syncing'],
  },
  {
    id: 'errors',
    aliases: ['errors', 'warnings', 'alerts'],
    category: 'status',
    description: 'Show recent errors and warnings',
    visualization: 'health-dashboard',
    examples: ['errors', 'show warnings', 'what went wrong'],
  },

  // Actions
  {
    id: 'sync',
    aliases: ['sync', 'resync', 'force sync'],
    category: 'action',
    description: 'Force sync a folder',
    visualization: 'sync-flow',
    examples: ['sync Documents', 'resync Photos', 'force sync'],
    parameters: [
      {
        name: 'folderName',
        type: 'folder',
        required: false,
        description: 'Folder to sync',
      },
    ],
    action: 'sync',
  },
  {
    id: 'pause',
    aliases: ['pause', 'stop', 'halt'],
    category: 'action',
    description: 'Pause syncing for a device or folder',
    visualization: 'device-topology',
    examples: ['pause laptop', 'pause Documents', 'stop syncing'],
    parameters: [
      {
        name: 'target',
        type: 'string',
        required: false,
        description: 'Device or folder to pause',
      },
    ],
    action: 'pause',
  },
  {
    id: 'resume',
    aliases: ['resume', 'start', 'continue'],
    category: 'action',
    description: 'Resume syncing for a device or folder',
    visualization: 'device-topology',
    examples: ['resume laptop', 'resume Documents', 'start syncing'],
    parameters: [
      {
        name: 'target',
        type: 'string',
        required: false,
        description: 'Device or folder to resume',
      },
    ],
    action: 'resume',
  },
  {
    id: 'restart',
    aliases: ['restart', 'reboot', 'refresh'],
    category: 'action',
    description: 'Restart Syncthing daemon',
    visualization: 'health-dashboard',
    examples: ['restart', 'restart syncthing', 'reboot sync'],
    action: 'restart',
  },
  {
    id: 'ignore',
    aliases: ['ignore', 'exclude', 'skip'],
    category: 'action',
    description: 'Add ignore pattern for a folder',
    visualization: 'folder-explorer',
    examples: ['ignore *.tmp', 'ignore node_modules', 'exclude .git'],
    parameters: [
      {
        name: 'pattern',
        type: 'string',
        required: true,
        description: 'Pattern to ignore',
      },
    ],
    action: 'ignore',
  },
  {
    id: 'resolve',
    aliases: ['resolve', 'fix', 'merge'],
    category: 'action',
    description: 'Resolve a file conflict',
    visualization: 'conflict-space',
    examples: ['resolve report.docx', 'fix conflicts', 'resolve keep newest'],
    parameters: [
      {
        name: 'file',
        type: 'file',
        required: false,
        description: 'File to resolve',
      },
      {
        name: 'strategy',
        type: 'string',
        required: false,
        description: 'Resolution strategy (newest, oldest, local, remote)',
      },
    ],
    action: 'resolve',
  },

  // Analytics
  {
    id: 'storage',
    aliases: ['storage', 'space', 'usage', 'capacity', 'disk'],
    category: 'analytics',
    description: 'Show storage usage across devices',
    visualization: 'storage-globe',
    examples: ['storage', 'show space', 'usage on phone'],
  },
  {
    id: 'history',
    aliases: ['history', 'timeline', 'changes', 'activity'],
    category: 'analytics',
    description: 'Show file change timeline',
    visualization: 'timeline',
    examples: ['history Documents', 'timeline last 7 days', 'recent changes'],
    parameters: [
      {
        name: 'folder',
        type: 'folder',
        required: false,
        description: 'Folder to show history for',
      },
      {
        name: 'timeRange',
        type: 'string',
        required: false,
        description: 'Time range to show',
      },
    ],
  },
  {
    id: 'compare',
    aliases: ['compare', 'diff', 'versus', 'vs'],
    category: 'analytics',
    description: 'Compare two devices or folder states',
    visualization: 'folder-explorer',
    examples: ['compare laptop vs desktop', 'diff Photos on phone', 'compare versions'],
    parameters: [
      {
        name: 'source',
        type: 'string',
        required: true,
        description: 'First item to compare',
      },
      {
        name: 'target',
        type: 'string',
        required: false,
        description: 'Second item to compare',
      },
    ],
  },

  // Configuration
  {
    id: 'add-device',
    aliases: ['add device', 'new device', 'connect device'],
    category: 'configuration',
    description: 'Add a new device',
    visualization: 'device-topology',
    examples: ['add device', 'new device', 'connect to phone'],
    action: 'add-device',
  },
  {
    id: 'add-folder',
    aliases: ['add folder', 'new folder', 'share folder'],
    category: 'configuration',
    description: 'Add a new synced folder',
    visualization: 'folder-explorer',
    examples: ['add folder', 'new folder Documents', 'share folder'],
    action: 'add-folder',
  },
  {
    id: 'share',
    aliases: ['share', 'share with'],
    category: 'configuration',
    description: 'Share a folder with a device',
    visualization: 'device-topology',
    examples: ['share Documents with laptop', 'share Photos with phone'],
    parameters: [
      {
        name: 'folder',
        type: 'folder',
        required: true,
        description: 'Folder to share',
      },
      {
        name: 'device',
        type: 'device',
        required: true,
        description: 'Device to share with',
      },
    ],
    action: 'share',
  },
  {
    id: 'settings',
    aliases: ['settings', 'preferences', 'config', 'options'],
    category: 'configuration',
    description: 'Open settings space',
    visualization: 'settings-space',
    examples: ['settings', 'preferences', 'config'],
  },
  {
    id: 'theme',
    aliases: ['theme', 'appearance', 'dark mode', 'light mode'],
    category: 'configuration',
    description: 'Change theme settings',
    visualization: 'settings-space',
    examples: ['theme', 'dark mode', 'appearance'],
  },
  {
    id: 'network-settings',
    aliases: ['network settings', 'bandwidth settings', 'discovery settings'],
    category: 'configuration',
    description: 'Configure network settings',
    visualization: 'settings-space',
    examples: ['network settings', 'bandwidth settings'],
  },

  // Navigation
  {
    id: 'help',
    aliases: ['help', '?', 'commands', 'what can you do'],
    category: 'navigation',
    description: 'Show available commands',
    visualization: 'help-center',
    examples: ['help', '?', 'what can you do'],
  },
  {
    id: 'clear',
    aliases: ['clear', 'reset', 'home', 'back'],
    category: 'navigation',
    description: 'Clear context and return to default view',
    visualization: 'device-topology',
    examples: ['clear', 'reset view', 'go home'],
  },
  {
    id: 'tutorial',
    aliases: ['tutorial', 'onboarding', 'guide', 'tour'],
    category: 'navigation',
    description: 'Start the interactive tutorial',
    visualization: 'device-topology',
    examples: ['tutorial', 'show guide', 'how to use'],
  },
];

// =============================================================================
// Intent to Visualization Mapping
// =============================================================================

export const INTENT_VISUALIZATION_MAP: Record<CommandIntent, VisualizationType> = {
  'query-status': 'health-dashboard',
  'query-device': 'device-topology',
  'query-folder': 'folder-explorer',
  'query-conflicts': 'conflict-space',
  'query-storage': 'storage-globe',
  'query-history': 'timeline',
  'query-health': 'health-dashboard',
  'query-bandwidth': 'sync-flow',
  'query-errors': 'health-dashboard',
  'action-sync': 'sync-flow',
  'action-pause': 'device-topology',
  'action-resume': 'device-topology',
  'action-restart': 'health-dashboard',
  'action-add': 'device-topology',
  'action-share': 'device-topology',
  'action-ignore': 'folder-explorer',
  'action-resolve': 'conflict-space',
  'navigate-folder': 'folder-explorer',
  'navigate-device': 'device-topology',
  'navigate-settings': 'health-dashboard',
  help: 'help-center',
  unknown: 'device-topology',
};

// =============================================================================
// Category Icons
// =============================================================================

export const CATEGORY_ICONS: Record<CommandCategory, string> = {
  status: 'Activity',
  action: 'Zap',
  analytics: 'BarChart3',
  configuration: 'Settings',
  navigation: 'Compass',
};

// =============================================================================
// Visualization Metadata
// =============================================================================

export const VISUALIZATION_META: Record<
  VisualizationType,
  { name: string; description: string; icon: string }
> = {
  'device-topology': {
    name: 'Device Constellation',
    description: 'Network of connected devices',
    icon: 'Network',
  },
  'folder-explorer': {
    name: 'Folder Explorer',
    description: '3D folder structure view',
    icon: 'FolderTree',
  },
  'sync-flow': {
    name: 'Sync Flow',
    description: 'Real-time data transfer animation',
    icon: 'ArrowLeftRight',
  },
  'conflict-space': {
    name: 'Conflict Space',
    description: 'File conflict resolution view',
    icon: 'GitMerge',
  },
  'storage-globe': {
    name: 'Storage Globe',
    description: 'Storage distribution visualization',
    icon: 'HardDrive',
  },
  timeline: {
    name: 'Timeline',
    description: 'File change history',
    icon: 'Clock',
  },
  'health-dashboard': {
    name: 'Health Dashboard',
    description: 'System status overview',
    icon: 'Activity',
  },
  'help-center': {
    name: 'Help Center',
    description: 'Commands and keyboard shortcuts reference',
    icon: 'HelpCircle',
  },
  'settings-space': {
    name: 'Settings',
    description: 'App configuration and preferences',
    icon: 'Settings',
  },
};

// =============================================================================
// Default Configuration
// =============================================================================

export const OMNIBOX_CONFIG = {
  /** Maximum number of suggestions to show */
  maxSuggestions: 8,

  /** Debounce delay for search in ms */
  searchDebounce: 150,

  /** Minimum confidence score for AI suggestions */
  minConfidence: 0.3,

  /** Maximum history entries to keep */
  maxHistoryEntries: 100,

  /** Enable AI-powered natural language processing */
  enableAI: true,

  /** Default visualization on startup */
  defaultVisualization: 'device-topology' as VisualizationType,

  /** Keyboard shortcuts */
  shortcuts: {
    toggle: 'Ctrl+K',
    close: 'Escape',
    submit: 'Enter',
    history: 'ArrowUp',
    clear: 'Ctrl+L',
  },
} as const;

// =============================================================================
// Quick Commands (Frequently Used)
// =============================================================================

export const QUICK_COMMANDS = [
  { command: 'status', label: 'System Status', shortcut: 'Ctrl+1' },
  { command: 'devices', label: 'Device View', shortcut: 'Ctrl+2' },
  { command: 'folders', label: 'Folder View', shortcut: 'Ctrl+3' },
  { command: 'conflicts', label: 'Conflicts', shortcut: 'Ctrl+4' },
  { command: 'storage', label: 'Storage', shortcut: 'Ctrl+5' },
] as const;

// =============================================================================
// Natural Language Patterns
// =============================================================================

export const NL_PATTERNS = {
  questions: [
    'what',
    'why',
    'how',
    'when',
    'where',
    'which',
    'who',
    'is',
    'are',
    'can',
    'could',
    'would',
    'should',
  ],
  actions: [
    'show',
    'display',
    'open',
    'view',
    'see',
    'get',
    'sync',
    'pause',
    'stop',
    'start',
    'resume',
    'restart',
    'add',
    'remove',
    'delete',
    'create',
    'share',
    'ignore',
    'fix',
    'resolve',
    'compare',
    'help',
  ],
  modifiers: [
    'all',
    'every',
    'each',
    'some',
    'any',
    'first',
    'last',
    'newest',
    'oldest',
    'latest',
    'on',
    'in',
    'at',
    'with',
    'from',
    'to',
    'for',
  ],
  timeExpressions: [
    'today',
    'yesterday',
    'tomorrow',
    'this week',
    'last week',
    'next week',
    'this month',
    'last month',
    'last hour',
    'last day',
    'last 7 days',
    'last 30 days',
  ],
} as const;
