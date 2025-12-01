import { getActivityForPath, getMostAccessedFiles, logActivity } from './db';
import { logger } from './logger';

export interface AccessPattern {
  dayOfWeek: number;
  hour: number;
  frequency: number;
}

export interface FolderPrediction {
  path: string;
  confidence: number;
  patterns: AccessPattern[];
  shouldBoostNow: boolean;
  nextPredictedAccess?: Date;
}

export interface PredictiveSyncConfig {
  minFrequencyThreshold: number;
  preemptiveMinutes: number;
  maxFoldersToTrack: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: PredictiveSyncConfig = {
  minFrequencyThreshold: 5,
  preemptiveMinutes: 5,
  maxFoldersToTrack: 20,
  enabled: true,
};

function getTimeSlotKey(date: Date): string {
  return `${date.getDay()}-${date.getHours()}`;
}

function parseTimeSlotKey(key: string): { dayOfWeek: number; hour: number } {
  const [day, hour] = key.split('-').map(Number);
  return { dayOfWeek: day, hour };
}

function getNextOccurrence(dayOfWeek: number, hour: number): Date {
  const now = new Date();
  const result = new Date(now);

  // Set to the target hour
  result.setHours(hour, 0, 0, 0);

  // Calculate days until target day
  const currentDay = now.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;

  // If it's the same day but hour has passed, move to next week
  if (daysUntilTarget === 0 && now.getHours() >= hour) {
    daysUntilTarget = 7;
  } else if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }

  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

export async function analyzeAccessPatterns(
  folderPath: string,
  limit = 1000
): Promise<AccessPattern[]> {
  const logs = await getActivityForPath(folderPath, limit);

  if (logs.length === 0) {
    return [];
  }

  // Count accesses by time slot
  const patternCounts: Record<string, number> = {};

  for (const log of logs) {
    const date = new Date(log.timestamp);
    const key = getTimeSlotKey(date);
    patternCounts[key] = (patternCounts[key] || 0) + 1;
  }

  // Convert to AccessPattern array and sort by frequency
  return Object.entries(patternCounts)
    .map(([key, frequency]) => {
      const { dayOfWeek, hour } = parseTimeSlotKey(key);
      return { dayOfWeek, hour, frequency };
    })
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Check if we should boost sync priority for a folder right now
 */
export function shouldBoostPriority(
  patterns: AccessPattern[],
  config: PredictiveSyncConfig = DEFAULT_CONFIG
): boolean {
  if (!config.enabled || patterns.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  // Look for high-frequency patterns matching current time or next hour
  return patterns.some((p) => {
    // Must meet frequency threshold
    if (p.frequency < config.minFrequencyThreshold) {
      return false;
    }

    // Check if matches current or next hour on the same day
    return p.dayOfWeek === currentDay && (p.hour === currentHour || p.hour === currentHour + 1);
  });
}

/**
 * Get the next predicted access time based on patterns
 */
export function getNextPredictedAccess(patterns: AccessPattern[]): Date | undefined {
  if (patterns.length === 0) {
    return undefined;
  }

  const now = new Date();
  const candidates: Date[] = [];

  // Get next occurrence for top patterns
  for (const pattern of patterns.slice(0, 5)) {
    const nextTime = getNextOccurrence(pattern.dayOfWeek, pattern.hour);
    if (nextTime > now) {
      candidates.push(nextTime);
    }
  }

  if (candidates.length === 0) {
    return undefined;
  }

  // Return the soonest predicted access
  return candidates.reduce((min, curr) => (curr < min ? curr : min));
}

/**
 * Calculate confidence score based on pattern consistency
 */
function calculateConfidence(patterns: AccessPattern[], totalLogs: number): number {
  if (patterns.length === 0 || totalLogs === 0) {
    return 0;
  }

  // Higher frequency patterns = higher confidence
  const topPatternFrequency = patterns[0]?.frequency || 0;
  const frequencyScore = Math.min(topPatternFrequency / 20, 1); // Cap at 20 occurrences = 100%

  // More patterns = more predictable behavior
  const patternCountScore = Math.min(patterns.length / 10, 1);

  // Combine scores (weighted average)
  return frequencyScore * 0.7 + patternCountScore * 0.3;
}

export async function getFolderPredictions(
  config: PredictiveSyncConfig = DEFAULT_CONFIG
): Promise<FolderPrediction[]> {
  // Get most accessed files/folders
  const mostAccessed = await getMostAccessedFiles(config.maxFoldersToTrack);

  const predictions: FolderPrediction[] = [];

  for (const { path, count } of mostAccessed) {
    const patterns = await analyzeAccessPatterns(path);

    // Filter patterns below threshold
    const significantPatterns = patterns.filter((p) => p.frequency >= config.minFrequencyThreshold);

    if (significantPatterns.length === 0) {
      continue;
    }

    predictions.push({
      path,
      confidence: calculateConfidence(significantPatterns, count),
      patterns: significantPatterns,
      shouldBoostNow: shouldBoostPriority(significantPatterns, config),
      nextPredictedAccess: getNextPredictedAccess(significantPatterns),
    });
  }

  // Sort by confidence
  return predictions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get folders that should be synced preemptively right now
 */
export async function getFoldersToSync(
  config: PredictiveSyncConfig = DEFAULT_CONFIG
): Promise<string[]> {
  if (!config.enabled) {
    return [];
  }

  const predictions = await getFolderPredictions(config);

  return predictions.filter((p) => p.shouldBoostNow).map((p) => p.path);
}

export async function trackFolderAccess(
  folderPath: string,
  action: 'open' | 'sync' | 'modify' | 'search' = 'open'
): Promise<void> {
  try {
    await logActivity({
      path: folderPath,
      action,
      details: `Predictive sync tracking: ${action}`,
    });
  } catch (error) {
    logger.warn('Failed to track folder access for predictive sync', { error, folderPath });
  }
}

type RescanCallback = (folderId: string) => Promise<void>;

class PredictiveSyncService {
  private config: PredictiveSyncConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private rescanCallback: RescanCallback | null = null;
  private folderPathToId: Map<string, string> = new Map();

  constructor(config: Partial<PredictiveSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  registerRescanCallback(callback: RescanCallback, folderMapping: Map<string, string>): void {
    this.rescanCallback = callback;
    this.folderPathToId = folderMapping;
  }

  start(intervalMs = 60000): void {
    if (this.intervalId) {
      this.stop();
    }

    logger.info('Starting predictive sync service', { intervalMs });

    this.intervalId = setInterval(async () => {
      await this.checkAndSync();
    }, intervalMs);

    // Run immediately
    this.checkAndSync();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped predictive sync service');
    }
  }

  private async checkAndSync(): Promise<void> {
    if (!this.config.enabled || !this.rescanCallback) {
      return;
    }

    try {
      const foldersToSync = await getFoldersToSync(this.config);

      for (const folderPath of foldersToSync) {
        const folderId = this.folderPathToId.get(folderPath);

        if (folderId) {
          logger.info('Predictive sync: triggering rescan', { folderId, folderPath });
          await this.rescanCallback(folderId);
        }
      }
    } catch (error) {
      logger.warn('Predictive sync check failed', { error });
    }
  }

  updateConfig(config: Partial<PredictiveSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): PredictiveSyncConfig {
    return { ...this.config };
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

export const predictiveSyncService = new PredictiveSyncService();

export { PredictiveSyncService };
