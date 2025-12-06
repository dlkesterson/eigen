/**
 * Command Parser
 *
 * Parses user input into structured commands using a combination of:
 * 1. Pattern matching for known commands
 * 2. AI embeddings for natural language understanding
 */

import type {
  ParsedCommand,
  CommandIntent,
  CommandEntities,
  TimeRange,
  CommandSuggestion,
} from '@/types/omnibox';
import {
  COMMANDS,
  INTENT_VISUALIZATION_MAP,
  NL_PATTERNS,
  OMNIBOX_CONFIG,
} from '@/constants/omnibox';

// =============================================================================
// Tokenizer
// =============================================================================

interface Token {
  type: 'word' | 'quoted' | 'flag' | 'operator';
  value: string;
  position: number;
}

/**
 * Tokenize input string into meaningful parts
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  const trimmed = input.trim().toLowerCase();

  // Simple tokenizer - split on whitespace, handle quotes
  const regex = /("([^"]+)"|'([^']+)'|--?[\w-]+|[\w./*]+)/g;
  let match;

  while ((match = regex.exec(trimmed)) !== null) {
    const value = match[2] || match[3] || match[0];
    let type: Token['type'] = 'word';

    if (match[0].startsWith('"') || match[0].startsWith("'")) {
      type = 'quoted';
    } else if (match[0].startsWith('-')) {
      type = 'flag';
    } else if (['vs', 'with', 'on', 'in', 'to', 'from'].includes(value)) {
      type = 'operator';
    }

    tokens.push({ type, value, position });
    position++;
  }

  return tokens;
}

// =============================================================================
// Intent Detection
// =============================================================================

/**
 * Detect the intent from tokens using pattern matching
 */
function detectIntent(tokens: Token[]): { intent: CommandIntent; confidence: number } {
  if (tokens.length === 0) {
    return { intent: 'unknown', confidence: 0 };
  }

  const firstWord = tokens[0].value;
  const allWords = tokens.map((t) => t.value);
  const fullText = allWords.join(' ');

  // Check for exact command matches
  for (const cmd of COMMANDS) {
    for (const alias of cmd.aliases) {
      if (alias === firstWord || alias === fullText || fullText.startsWith(alias + ' ')) {
        const intent = getIntentFromCommand(cmd.id);
        return { intent, confidence: 1.0 };
      }
    }
  }

  // Check for question patterns
  if ((NL_PATTERNS.questions as readonly string[]).includes(firstWord)) {
    return detectQuestionIntent(tokens);
  }

  // Check for action patterns
  if ((NL_PATTERNS.actions as readonly string[]).includes(firstWord)) {
    return detectActionIntent(tokens);
  }

  // Fallback to fuzzy matching
  return fuzzyMatchIntent(tokens);
}

/**
 * Get intent from command ID
 */
function getIntentFromCommand(commandId: string): CommandIntent {
  const intentMap: Record<string, CommandIntent> = {
    status: 'query-status',
    device: 'query-device',
    folder: 'query-folder',
    conflicts: 'query-conflicts',
    bandwidth: 'query-bandwidth',
    errors: 'query-errors',
    sync: 'action-sync',
    pause: 'action-pause',
    resume: 'action-resume',
    restart: 'action-restart',
    ignore: 'action-ignore',
    resolve: 'action-resolve',
    storage: 'query-storage',
    history: 'query-history',
    compare: 'query-status',
    'add-device': 'action-add',
    'add-folder': 'action-add',
    share: 'action-share',
    settings: 'navigate-settings',
    help: 'help',
    clear: 'query-status',
    tutorial: 'help',
  };

  return intentMap[commandId] || 'unknown';
}

/**
 * Detect intent from question-style input
 */
function detectQuestionIntent(tokens: Token[]): { intent: CommandIntent; confidence: number } {
  const text = tokens.map((t) => t.value).join(' ');

  // "what is syncing" / "what's transferring"
  if (text.includes('sync') || text.includes('transfer')) {
    return { intent: 'query-bandwidth', confidence: 0.8 };
  }

  // "why is X slow" / "why isn't X syncing"
  if (text.includes('slow') || text.includes("isn't") || text.includes('not')) {
    return { intent: 'query-errors', confidence: 0.7 };
  }

  // "what changed" / "what's different"
  if (text.includes('change') || text.includes('different') || text.includes('history')) {
    return { intent: 'query-history', confidence: 0.8 };
  }

  // "how much space" / "how much storage"
  if (text.includes('space') || text.includes('storage') || text.includes('size')) {
    return { intent: 'query-storage', confidence: 0.8 };
  }

  // Default to status query
  return { intent: 'query-status', confidence: 0.5 };
}

/**
 * Detect intent from action-style input
 */
function detectActionIntent(tokens: Token[]): { intent: CommandIntent; confidence: number } {
  const firstWord = tokens[0].value;

  const actionIntentMap: Record<string, CommandIntent> = {
    show: 'query-status',
    display: 'query-status',
    open: 'navigate-folder',
    view: 'query-status',
    see: 'query-status',
    get: 'query-status',
    sync: 'action-sync',
    pause: 'action-pause',
    stop: 'action-pause',
    start: 'action-resume',
    resume: 'action-resume',
    restart: 'action-restart',
    add: 'action-add',
    remove: 'action-ignore',
    delete: 'action-ignore',
    create: 'action-add',
    share: 'action-share',
    ignore: 'action-ignore',
    fix: 'action-resolve',
    resolve: 'action-resolve',
    compare: 'query-history',
    help: 'help',
  };

  const intent = actionIntentMap[firstWord] || 'unknown';

  // Refine based on target
  if (intent === 'query-status' && tokens.length > 1) {
    const target = tokens
      .slice(1)
      .map((t) => t.value)
      .join(' ');
    if (target.includes('device')) return { intent: 'query-device', confidence: 0.9 };
    if (target.includes('folder')) return { intent: 'query-folder', confidence: 0.9 };
    if (target.includes('conflict')) return { intent: 'query-conflicts', confidence: 0.9 };
    if (target.includes('storage') || target.includes('space')) {
      return { intent: 'query-storage', confidence: 0.9 };
    }
    if (target.includes('bandwidth') || target.includes('transfer')) {
      return { intent: 'query-bandwidth', confidence: 0.9 };
    }
    if (target.includes('error') || target.includes('warning')) {
      return { intent: 'query-errors', confidence: 0.9 };
    }
  }

  return { intent, confidence: 0.8 };
}

/**
 * Fuzzy match intent when no clear pattern is found
 */
function fuzzyMatchIntent(tokens: Token[]): { intent: CommandIntent; confidence: number } {
  const text = tokens.map((t) => t.value).join(' ');

  // Check for keywords
  const keywordIntentMap: Array<{ keywords: string[]; intent: CommandIntent }> = [
    { keywords: ['device', 'laptop', 'phone', 'desktop', 'connected'], intent: 'query-device' },
    { keywords: ['folder', 'directory', 'path', 'documents', 'photos'], intent: 'query-folder' },
    { keywords: ['conflict', 'issue', 'problem', 'merge'], intent: 'query-conflicts' },
    { keywords: ['storage', 'space', 'disk', 'capacity', 'size'], intent: 'query-storage' },
    { keywords: ['bandwidth', 'transfer', 'sync', 'speed', 'network'], intent: 'query-bandwidth' },
    { keywords: ['error', 'warning', 'fail', 'wrong'], intent: 'query-errors' },
    { keywords: ['history', 'timeline', 'change', 'activity'], intent: 'query-history' },
  ];

  for (const { keywords, intent } of keywordIntentMap) {
    if (keywords.some((kw) => text.includes(kw))) {
      return { intent, confidence: 0.6 };
    }
  }

  return { intent: 'query-status', confidence: 0.3 };
}

// =============================================================================
// Entity Extraction
// =============================================================================

interface EntityExtractionContext {
  devices: string[];
  folders: string[];
}

/**
 * Extract entities (devices, folders, files, time ranges) from tokens
 */
function extractEntities(tokens: Token[], context: EntityExtractionContext): CommandEntities {
  const entities: CommandEntities = {};

  const words = tokens.map((t) => t.value);
  const quotedValues = tokens.filter((t) => t.type === 'quoted').map((t) => t.value);

  // Extract device references
  const deviceMatches = findMatchingEntities(words, context.devices);
  if (deviceMatches.length > 0) {
    entities.devices = deviceMatches;
  }

  // Extract folder references
  const folderMatches = findMatchingEntities(words, context.folders);
  if (folderMatches.length > 0) {
    entities.folders = folderMatches;
  }

  // Extract file references (quoted strings or paths with extensions)
  const filePatterns = words.filter((w) => w.includes('.') && !w.startsWith('.') && w !== '.');
  if (filePatterns.length > 0 || quotedValues.length > 0) {
    entities.files = [...filePatterns, ...quotedValues];
  }

  // Extract time ranges
  const timeRange = extractTimeRange(words);
  if (timeRange) {
    entities.timeRange = timeRange;
  }

  // Extract patterns (for ignore commands)
  const pattern = extractPattern(tokens);
  if (pattern) {
    entities.pattern = pattern;
  }

  return entities;
}

/**
 * Find matching entities from known list
 */
function findMatchingEntities(words: string[], knownEntities: string[]): string[] {
  const matches: string[] = [];

  for (const entity of knownEntities) {
    const entityLower = entity.toLowerCase();
    if (words.some((w) => entityLower.includes(w) || w.includes(entityLower))) {
      matches.push(entity);
    }
  }

  return matches;
}

/**
 * Extract time range from words
 */
function extractTimeRange(words: string[]): TimeRange | undefined {
  const text = words.join(' ');

  // Check for relative time expressions
  for (const expr of NL_PATTERNS.timeExpressions) {
    if (text.includes(expr)) {
      return { relative: expr };
    }
  }

  // Check for "last N days/hours/etc"
  const lastNPattern = /last (\d+) (day|hour|week|month)s?/;
  const match = text.match(lastNPattern);
  if (match) {
    return { relative: `last ${match[1]} ${match[2]}s` };
  }

  return undefined;
}

/**
 * Extract pattern (for ignore commands)
 */
function extractPattern(tokens: Token[]): string | undefined {
  // Look for glob patterns like *.tmp, node_modules, .git
  for (const token of tokens) {
    if (token.value.includes('*') || token.value.startsWith('.')) {
      return token.value;
    }
  }

  // Look for quoted patterns
  const quoted = tokens.find((t) => t.type === 'quoted');
  if (quoted) {
    return quoted.value;
  }

  return undefined;
}

// =============================================================================
// Main Parser
// =============================================================================

export interface ParseOptions {
  context?: EntityExtractionContext;
  enableAI?: boolean;
}

/**
 * Parse user input into a structured command
 */
export function parseCommand(input: string, options: ParseOptions = {}): ParsedCommand {
  const { context = { devices: [], folders: [] } } = options;

  const tokens = tokenize(input);
  const { intent, confidence } = detectIntent(tokens);
  const entities = extractEntities(tokens, context);
  const visualization = INTENT_VISUALIZATION_MAP[intent];

  // Find matching command definition
  const matchedCommand = COMMANDS.find((cmd) => {
    const firstWord = tokens[0]?.value || '';
    return cmd.aliases.some(
      (alias) =>
        alias === firstWord ||
        alias === input.toLowerCase().trim() ||
        input
          .toLowerCase()
          .trim()
          .startsWith(alias + ' ')
    );
  });

  return {
    raw: input,
    intent,
    entities,
    confidence,
    visualization,
    action: matchedCommand?.action,
    parameters: extractParameters(tokens, matchedCommand),
  };
}

/**
 * Extract parameters based on command definition
 */
function extractParameters(
  tokens: Token[],
  command?: (typeof COMMANDS)[number]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (!command?.parameters || tokens.length < 2) {
    return params;
  }

  // Simple positional parameter extraction
  const valueTokens = tokens.slice(1).filter((t) => t.type !== 'flag');

  for (let i = 0; i < command.parameters.length && i < valueTokens.length; i++) {
    const param = command.parameters[i];
    params[param.name] = valueTokens[i].value;
  }

  return params;
}

// =============================================================================
// Suggestion Generator
// =============================================================================

/**
 * Generate command suggestions based on partial input
 */
export function generateSuggestions(
  input: string,
  context: {
    devices: string[];
    folders: string[];
    history: string[];
  }
): CommandSuggestion[] {
  const suggestions: CommandSuggestion[] = [];
  const inputLower = input.toLowerCase().trim();

  if (!inputLower) {
    // Show default suggestions
    return getDefaultSuggestions();
  }

  // Match against commands
  for (const cmd of COMMANDS) {
    for (const alias of cmd.aliases) {
      if (alias.startsWith(inputLower) || cmd.description.toLowerCase().includes(inputLower)) {
        suggestions.push({
          id: cmd.id,
          text: alias,
          description: cmd.description,
          icon: getIconForCategory(cmd.category),
          category: cmd.category,
          score: alias.startsWith(inputLower) ? 1.0 : 0.7,
          source: 'command',
          visualization: cmd.visualization,
        });
        break; // Only add one suggestion per command
      }
    }
  }

  // Match against history
  for (const historyItem of context.history.slice(0, 10)) {
    if (historyItem.toLowerCase().includes(inputLower)) {
      suggestions.push({
        id: `history-${historyItem}`,
        text: historyItem,
        description: 'Recent command',
        icon: 'History',
        category: 'navigation',
        score: 0.6,
        source: 'history',
      });
    }
  }

  // Match against devices
  for (const device of context.devices) {
    if (device.toLowerCase().includes(inputLower)) {
      suggestions.push({
        id: `device-${device}`,
        text: `device ${device}`,
        description: `View device: ${device}`,
        icon: 'Monitor',
        category: 'status',
        score: 0.5,
        source: 'context',
      });
    }
  }

  // Match against folders
  for (const folder of context.folders) {
    if (folder.toLowerCase().includes(inputLower)) {
      suggestions.push({
        id: `folder-${folder}`,
        text: `folder ${folder}`,
        description: `View folder: ${folder}`,
        icon: 'Folder',
        category: 'status',
        score: 0.5,
        source: 'context',
      });
    }
  }

  // Sort by score and limit
  return suggestions.sort((a, b) => b.score - a.score).slice(0, OMNIBOX_CONFIG.maxSuggestions);
}

/**
 * Get default suggestions when no input
 */
function getDefaultSuggestions(): CommandSuggestion[] {
  return [
    {
      id: 'default-status',
      text: 'status',
      description: 'Show system health dashboard',
      icon: 'Activity',
      category: 'status',
      score: 1.0,
      source: 'command',
      visualization: 'health-dashboard',
    },
    {
      id: 'default-devices',
      text: 'devices',
      description: 'View device constellation',
      icon: 'Network',
      category: 'status',
      score: 0.9,
      source: 'command',
      visualization: 'device-topology',
    },
    {
      id: 'default-folders',
      text: 'folders',
      description: 'Explore folder structure',
      icon: 'FolderTree',
      category: 'status',
      score: 0.9,
      source: 'command',
      visualization: 'folder-explorer',
    },
    {
      id: 'default-conflicts',
      text: 'conflicts',
      description: 'View file conflicts',
      icon: 'GitMerge',
      category: 'status',
      score: 0.8,
      source: 'command',
      visualization: 'conflict-space',
    },
    {
      id: 'default-storage',
      text: 'storage',
      description: 'View storage distribution',
      icon: 'HardDrive',
      category: 'analytics',
      score: 0.7,
      source: 'command',
      visualization: 'storage-globe',
    },
    {
      id: 'default-help',
      text: 'help',
      description: 'Show available commands',
      icon: 'HelpCircle',
      category: 'navigation',
      score: 0.6,
      source: 'command',
      visualization: 'help-center',
    },
  ];
}

/**
 * Get icon name for command category
 */
function getIconForCategory(category: string): string {
  const iconMap: Record<string, string> = {
    status: 'Activity',
    action: 'Zap',
    analytics: 'BarChart3',
    configuration: 'Settings',
    navigation: 'Compass',
  };
  return iconMap[category] || 'Command';
}

// =============================================================================
// AI-Enhanced Parsing (Optional Enhancement)
// =============================================================================

/**
 * Enhance parsing with AI embeddings
 * This is called asynchronously to improve confidence and entity extraction
 */
export async function enhanceParsingWithAI(
  command: ParsedCommand,
  _generateEmbedding: (text: string) => Promise<number[]>,
  _searchSimilar: (query: string) => Promise<Array<{ path: string; score: number }>>
): Promise<ParsedCommand> {
  // This function can be implemented to use the existing AI worker
  // to improve intent detection and entity extraction

  // For now, return the command as-is
  // The AI enhancement will be implemented when we integrate with useAISearch
  return command;
}
