// src/lib/auto-recovery.ts
// Automatic recovery service for common failure scenarios

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { logger } from './logger';
import { syncthingCircuitBreaker } from './retry';
import { healthMonitor } from './health-monitor';
import { errorNotifications } from './error-notifications';

/**
 * Serialize error objects to string, handling Tauri invoke errors
 */
function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    return errObj.message?.toString() || JSON.stringify(error);
  } else {
    return String(error);
  }
}

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
          error: serializeError(error),
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
        error: serializeError(error),
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
      let toastId: string | number | undefined;

      try {
        // First, try a simple ping via Tauri invoke
        const pingResult = await invoke<{ ping: string }>('ping_syncthing');

        if (pingResult?.ping === 'pong') {
          syncthingCircuitBreaker.reset();
          return true;
        }

        // If ping fails, Syncthing might not be running - try to start it
        logger.info(
          'Syncthing not responding, attempting to start sidecar. ' +
            'If this is your first time running Eigen, this will initialize Syncthing configuration.'
        );

        // Show initialization toast to the user
        toastId = toast.loading('Starting Syncthing...', {
          description: 'This may take 10-15 seconds on first run',
          duration: Infinity,
        });

        await invoke('start_syncthing_sidecar');

        // Detect first-run and adjust timeout accordingly
        const isConfigured = await invoke<boolean>('is_syncthing_configured');
        const isFirstRun = !isConfigured;
        const waitTime = isFirstRun ? 10000 : 5000;

        logger.info(`Waiting for Syncthing to start... (${waitTime / 1000}s)`, {
          isFirstRun,
          waitTime,
        });

        // Wait for startup with progress indicator
        let countdown = Math.floor(waitTime / 1000);
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            toast.loading(`Starting Syncthing... ${countdown}s remaining`, {
              id: toastId,
              description: isFirstRun
                ? 'First-run initialization may take 10-15 seconds'
                : 'This may take a few seconds',
            });
          }
        }, 1000);

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        clearInterval(countdownInterval);

        // Check again via Tauri invoke
        const retryPing = await invoke<{ ping: string }>('ping_syncthing');

        if (retryPing?.ping === 'pong') {
          syncthingCircuitBreaker.reset();
          logger.info('Syncthing sidecar started successfully');

          // Show success toast
          toast.success('Syncthing started successfully!', {
            id: toastId,
            description: 'Connection established',
          });

          return true;
        }

        logger.warn(
          'Syncthing sidecar may have started but is not responding yet. ' +
            'If this is the first run, Syncthing may need more time to initialize. ' +
            'Check the Syncthing logs for details.'
        );

        // Show warning toast
        toast.warning('Syncthing may need more time', {
          id: toastId,
          description: 'First-run initialization can take 10-15 seconds. Will retry automatically.',
          duration: 8000,
        });

        return false;
      } catch (error) {
        logger.error('Recovery action failed', { error: serializeError(error) });

        // Dismiss loading toast and show error
        toast.error('Failed to start Syncthing', {
          id: toastId,
          description: serializeError(error),
          duration: 8000,
        });

        return false;
      }
    },
    maxAttempts: 3,
    cooldownMs: 30000,
  });

  // Circuit breaker recovery
  autoRecovery.register({
    name: 'circuit-breaker',
    condition: () => {
      const state = syncthingCircuitBreaker.getState();
      return state.state === 'open';
    },
    action: async () => {
      try {
        // Test connection via Tauri invoke
        const pingResult = await invoke<{ ping: string }>('ping_syncthing');

        if (pingResult?.ping === 'pong') {
          syncthingCircuitBreaker.reset();
          return true;
        }

        // If ping fails, try starting the sidecar
        logger.info('Circuit breaker recovery: attempting to start sidecar');
        await invoke('start_syncthing_sidecar');
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const retryPing = await invoke<{ ping: string }>('ping_syncthing');
        if (retryPing?.ping === 'pong') {
          syncthingCircuitBreaker.reset();
          return true;
        }

        return false;
      } catch {
        return false;
      }
    },
    maxAttempts: 5,
    cooldownMs: 60000,
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
