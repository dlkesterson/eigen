/**
 * Polling and timing constants
 */

/** Polling intervals in milliseconds */
export const POLLING = {
  /** Default polling interval for most queries (5 seconds) */
  DEFAULT_INTERVAL: 5000,
  /** Config refresh interval - less frequent (30 seconds) */
  CONFIG_INTERVAL: 30000,
  /** Stale time slightly less than polling interval */
  DEFAULT_STALE_TIME: 4000,
  /** Config stale time */
  CONFIG_STALE_TIME: 25000,
} as const;

/** Timeout values in milliseconds */
export const TIMEOUTS = {
  /** Default AI worker operation timeout (2 minutes) */
  AI_WORKER_DEFAULT: 120_000,
  /** AI worker initialization timeout (10 minutes) */
  AI_WORKER_INIT: 600_000,
  /** Retry delay for failed requests */
  RETRY_DELAY: 1000,
  /** Delay after starting Syncthing before refetching */
  SYNCTHING_START_DELAY: 2000,
  /** Small delay for cleanup operations */
  CLEANUP_DELAY: 100,
} as const;

/** Retry configuration */
export const RETRY = {
  /** Default number of retries for queries */
  DEFAULT_COUNT: 3,
  /** Single retry for installation check */
  INSTALLATION_COUNT: 1,
} as const;
