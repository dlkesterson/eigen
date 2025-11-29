// src/lib/auto-recovery.ts
// Automatic recovery service for common failure scenarios

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';
import { syncthingCircuitBreaker } from './retry';
import { healthMonitor } from './health-monitor';
import { errorNotifications } from './error-notifications';

export interface RecoveryStrategy {
  name: string;
  condition: () => boolean | Promise<boolean>;
  action: () => Promise<boolean>;
  maxAttempts: number;
  cooldownMs: number;
}

interface RecoveryState {
  attempts: number;
  lastAttempt: Date | null;
  lastSuccess: Date | null;
  isRecovering: boolean;
}

class AutoRecoveryService {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private state: Map<string, RecoveryState> = new Map();
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private isEnabled = true;

  /**
   * Register a recovery strategy
   */
  register(strategy: RecoveryStrategy) {
    this.strategies.set(strategy.name, strategy);
    this.state.set(strategy.name, {
      attempts: 0,
      lastAttempt: null,
      lastSuccess: null,
      isRecovering: false,
    });
    logger.info(`Recovery strategy registered: ${strategy.name}`);
  }

  /**
   * Unregister a recovery strategy
   */
  unregister(name: string) {
    this.strategies.delete(name);
    this.state.delete(name);
  }

  /**
   * Start monitoring for recovery conditions
   */
  startMonitoring(intervalMs = 10000) {
    if (this.monitorInterval) {
      return;
    }

    this.monitorInterval = setInterval(() => {
      this.checkAndRecover();
    }, intervalMs);

    logger.info('Auto-recovery monitoring started', { intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('Auto-recovery monitoring stopped');
    }
  }

  /**
   * Enable/disable auto-recovery
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    logger.info(`Auto-recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check all strategies and attempt recovery if needed
   */
  private async checkAndRecover() {
    if (!this.isEnabled) return;

    for (const [name, strategy] of this.strategies) {
      const state = this.state.get(name);
      if (!state || state.isRecovering) continue;

      // Check cooldown
      if (state.lastAttempt) {
        const timeSince = Date.now() - state.lastAttempt.getTime();
        if (timeSince < strategy.cooldownMs) continue;
      }

      // Check max attempts
      if (state.attempts >= strategy.maxAttempts) {
        // Reset attempts after cooldown * 2
        if (state.lastAttempt) {
          const timeSince = Date.now() - state.lastAttempt.getTime();
          if (timeSince > strategy.cooldownMs * 2) {
            state.attempts = 0;
          } else {
            continue;
          }
        }
      }

      try {
        const needsRecovery = await strategy.condition();

        if (needsRecovery) {
          await this.executeRecovery(name, strategy);
        }
      } catch (error) {
        logger.error(`Recovery condition check failed: ${name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Execute a recovery strategy
   */
  private async executeRecovery(name: string, strategy: RecoveryStrategy) {
    const state = this.state.get(name);
    if (!state) return;

    state.isRecovering = true;
    state.attempts++;
    state.lastAttempt = new Date();

    logger.info(`Attempting recovery: ${name}`, {
      attempt: state.attempts,
      maxAttempts: strategy.maxAttempts,
    });

    try {
      const success = await strategy.action();

      if (success) {
        state.lastSuccess = new Date();
        state.attempts = 0;
        logger.info(`Recovery successful: ${name}`);
        errorNotifications.notifyRecovery(name);
      } else {
        logger.warn(`Recovery returned false: ${name}`);
      }
    } catch (error) {
      logger.error(`Recovery failed: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
        attempt: state.attempts,
      });

      if (state.attempts >= strategy.maxAttempts) {
        errorNotifications.notify(error, {
          showToast: true,
          autoRecover: false,
        });
      }
    } finally {
      state.isRecovering = false;
    }
  }

  /**
   * Manually trigger recovery for a specific strategy
   */
  async triggerRecovery(name: string): Promise<boolean> {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      logger.warn(`Recovery strategy not found: ${name}`);
      return false;
    }

    const state = this.state.get(name);
    if (state?.isRecovering) {
      logger.warn(`Recovery already in progress: ${name}`);
      return false;
    }

    await this.executeRecovery(name, strategy);
    return this.state.get(name)?.lastSuccess !== null;
  }

  /**
   * Get recovery state for debugging
   */
  getState(): Map<string, RecoveryState> {
    return new Map(this.state);
  }

  /**
   * Reset recovery state for a strategy
   */
  resetState(name: string) {
    const state = this.state.get(name);
    if (state) {
      state.attempts = 0;
      state.lastAttempt = null;
      state.isRecovering = false;
    }
  }
}

// Global instance
export const autoRecovery = new AutoRecoveryService();

/**
 * Register default recovery strategies
 */
export function registerDefaultRecoveryStrategies() {
  // Syncthing connection recovery
  autoRecovery.register({
    name: 'syncthing-connection',
    condition: async () => {
      const status = healthMonitor.getCheckStatus('syncthing-api');
      return status ? !status.healthy && status.consecutiveFailures >= 2 : false;
    },
    action: async () => {
      try {
        // First, try a simple ping
        const response = await fetch('http://127.0.0.1:8384/rest/system/ping', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          // Reset circuit breaker if ping succeeds
          syncthingCircuitBreaker.reset();
          return true;
        }

        // If ping fails, try restarting Syncthing
        logger.info('Attempting to restart Syncthing');
        await invoke('restart_syncthing');

        // Wait for restart
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check again
        const retryResponse = await fetch('http://127.0.0.1:8384/rest/system/ping', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (retryResponse.ok) {
          syncthingCircuitBreaker.reset();
          return true;
        }

        return false;
      } catch {
        return false;
      }
    },
    maxAttempts: 3,
    cooldownMs: 30000, // Wait 30s between attempts
  });

  // Circuit breaker recovery
  autoRecovery.register({
    name: 'circuit-breaker',
    condition: () => {
      const state = syncthingCircuitBreaker.getState();
      // Try to recover if circuit is open for more than 1 minute
      return state.state === 'open';
    },
    action: async () => {
      try {
        // Test connection before resetting
        const response = await fetch('http://127.0.0.1:8384/rest/system/ping', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          syncthingCircuitBreaker.reset();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    maxAttempts: 5,
    cooldownMs: 60000, // Wait 1 minute between attempts
  });

  // Memory pressure recovery
  autoRecovery.register({
    name: 'memory-pressure',
    condition: async () => {
      if (typeof window === 'undefined' || !('memory' in performance)) {
        return false;
      }

      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      if (!memory) return false;

      const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      return usedPercent > 85;
    },
    action: async () => {
      logger.info('Attempting memory cleanup');

      // Clear logger history (keeping last 100)
      const { logger: appLogger } = await import('./logger');
      const recentLogs = appLogger.getRecentLogs(100);
      appLogger.clearHistory();
      recentLogs.forEach((log) => {
        appLogger[log.level](log.message, log.context);
      });

      // Suggest garbage collection
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as Window & { gc?: () => void }).gc?.();
      }

      return true;
    },
    maxAttempts: 3,
    cooldownMs: 120000, // Wait 2 minutes between cleanups
  });

  logger.info('Default recovery strategies registered');
}
