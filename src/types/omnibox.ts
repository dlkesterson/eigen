/**
 * Omnibox Types
 *
 * Type definitions for the Omnibox command interface, parsing, and visualization routing.
 */

// =============================================================================
// Command Categories
// =============================================================================

export const COMMAND_CATEGORIES = [
  'status',
  'action',
  'analytics',
  'configuration',
  'navigation',
] as const;

export type CommandCategory = (typeof COMMAND_CATEGORIES)[number];

// =============================================================================
// Visualization Types
// =============================================================================

export const VISUALIZATION_TYPES = [
  'device-topology', // Device network constellation
  'folder-explorer', // Folder hierarchy 3D view
  'sync-flow', // Real-time sync animation
  'conflict-space', // Conflict resolution visualization
  'storage-globe', // Storage distribution treemap
  'timeline', // File history timeline
  'health-dashboard', // System health monitoring
  'help-center', // Help and command reference
  'settings-space', // 3D settings interface
] as const;

export type VisualizationType = (typeof VISUALIZATION_TYPES)[number];

// =============================================================================
// Command Definitions
// =============================================================================

export interface CommandDefinition {
  id: string;
  aliases: string[];
  category: CommandCategory;
  description: string;
  visualization: VisualizationType;
  examples: string[];
  parameters?: CommandParameter[];
  action?: CommandAction;
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'device' | 'folder' | 'file';
  required: boolean;
  description: string;
}

export type CommandAction =
  | 'sync'
  | 'pause'
  | 'resume'
  | 'restart'
  | 'add-device'
  | 'add-folder'
  | 'share'
  | 'ignore'
  | 'resolve'
  | 'navigate';

// =============================================================================
// Parsed Command
// =============================================================================

export interface ParsedCommand {
  raw: string;
  intent: CommandIntent;
  entities: CommandEntities;
  confidence: number;
  visualization: VisualizationType;
  action?: CommandAction;
  parameters: Record<string, unknown>;
}

export type CommandIntent =
  | 'query-status'
  | 'query-device'
  | 'query-folder'
  | 'query-conflicts'
  | 'query-storage'
  | 'query-history'
  | 'query-health'
  | 'query-bandwidth'
  | 'query-errors'
  | 'action-sync'
  | 'action-pause'
  | 'action-resume'
  | 'action-restart'
  | 'action-add'
  | 'action-share'
  | 'action-ignore'
  | 'action-resolve'
  | 'navigate-folder'
  | 'navigate-device'
  | 'navigate-settings'
  | 'help'
  | 'unknown';

export interface CommandEntities {
  devices?: string[];
  folders?: string[];
  files?: string[];
  timeRange?: TimeRange;
  pattern?: string;
}

export interface TimeRange {
  start?: Date;
  end?: Date;
  relative?: string; // e.g., "last 7 days", "today"
}

// =============================================================================
// Command Suggestions
// =============================================================================

export interface CommandSuggestion {
  id: string;
  text: string;
  description: string;
  icon: string;
  category: CommandCategory;
  score: number;
  source: 'command' | 'history' | 'ai' | 'context';
  /** The visualization type this command maps to (if any) */
  visualization?: VisualizationType;
}

// =============================================================================
// Command History
// =============================================================================

export interface CommandHistoryEntry {
  id: string;
  command: string;
  parsedCommand: ParsedCommand;
  timestamp: number;
  result?: CommandResult;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// =============================================================================
// Omnibox Context
// =============================================================================

export interface OmniboxContext {
  focusedDevice?: string;
  focusedFolder?: string;
  focusedFile?: string;
  breadcrumbs: ContextBreadcrumb[];
  recentCommands: string[];
}

export interface ContextBreadcrumb {
  type: 'device' | 'folder' | 'file' | 'view';
  id: string;
  label: string;
}

// =============================================================================
// Visualization State
// =============================================================================

export interface VisualizationState {
  type: VisualizationType;
  camera?: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  };
  selectedObjects: string[];
  filters: VisualizationFilters;
  layout?: Record<string, unknown>;
}

export interface VisualizationFilters {
  devices?: string[];
  folders?: string[];
  status?: ('synced' | 'syncing' | 'error' | 'paused')[];
  timeRange?: TimeRange;
}

// =============================================================================
// Omnibox Events
// =============================================================================

export type OmniboxEvent =
  | { type: 'command-execute'; command: ParsedCommand }
  | { type: 'visualization-change'; visualization: VisualizationType }
  | { type: 'context-update'; context: Partial<OmniboxContext> }
  | { type: 'error'; error: string }
  | { type: 'suggestion-select'; suggestion: CommandSuggestion };
