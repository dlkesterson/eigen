// src/lib/health-monitor.ts
import { logger } from './logger';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  interval: number;
  critical?: boolean;
}

interface HealthStatus {
  name: string;
  healthy: boolean;
  lastCheck: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  error?: string;
}

type HealthListener = (status: Map<string, HealthStatus>) => void;

export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private status: Map<string, HealthStatus> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private listeners: Set<HealthListener> = new Set();

  /**
   * Register a health check
   */
  register(check: HealthCheck) {
    this.checks.set(check.name, check);
    this.status.set(check.name, {
      name: check.name,
      healthy: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    });

    // Start periodic checks
    this.startCheck(check);

    logger.info(`Health check registered: ${check.name}`, {
      interval: check.interval,
      critical: check.critical,
    });
  }

  /**
   * Unregister a health check
   */
  unregister(name: string) {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
    this.checks.delete(name);
    this.status.delete(name);
    logger.info(`Health check unregistered: ${name}`);
  }

  /**
   * Start periodic health check
   */
  private startCheck(check: HealthCheck) {
    // Run immediately
    this.runCheck(check);

    // Schedule periodic runs
    const interval = setInterval(() => {
      this.runCheck(check);
    }, check.interval);

    this.intervals.set(check.name, interval);
  }

  /**
   * Run a single health check
   */
  private async runCheck(check: HealthCheck) {
    const currentStatus = this.status.get(check.name);
    if (!currentStatus) return;

    const startTime = Date.now();

    try {
      const result = await Promise.race([
        check.check(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        ),
      ]);

      const duration = Date.now() - startTime;

      if (result) {
        const wasUnhealthy = !currentStatus.healthy;
        this.status.set(check.name, {
          ...currentStatus,
          healthy: true,
          lastCheck: new Date(),
          lastSuccess: new Date(),
          consecutiveFailures: 0,
          error: undefined,
        });

        if (wasUnhealthy) {
          logger.info(`Health check recovered: ${check.name}`, { duration });
        }
      } else {
        this.handleFailure(check, currentStatus, 'Check returned false');
      }
    } catch (error) {
      this.handleFailure(
        check,
        currentStatus,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Handle check failure
   */
  private handleFailure(check: HealthCheck, currentStatus: HealthStatus, error: string) {
    const consecutiveFailures = currentStatus.consecutiveFailures + 1;

    this.status.set(check.name, {
      ...currentStatus,
      healthy: false,
      lastCheck: new Date(),
      lastFailure: new Date(),
      consecutiveFailures,
      error,
    });

    // Only log warning on first few failures to reduce noise
    if (consecutiveFailures <= 3) {
      logger.warn(`Health check failed: ${check.name}`, {
        error,
        consecutiveFailures,
        critical: check.critical,
      });
    }

    // Alert on critical failures - only log once when threshold is reached
    // (not on every subsequent failure)
    if (check.critical && consecutiveFailures === 3) {
      let hint: string | undefined;
      if (check.name === 'syncthing-api') {
        hint =
          'Syncthing may not be running or configured. ' +
          'If this is your first time running Eigen, you need to either: ' +
          '1) Start Syncthing manually to create its configuration, or ' +
          '2) Let Eigen start the bundled Syncthing sidecar (automatic recovery will attempt this).';
      }
      logger.error(`CRITICAL: Health check failing repeatedly: ${check.name}`, {
        consecutiveFailures,
        error,
        ...(hint && { hint }),
      });

      // Show critical failure notification to user
      toast.error(`Connection Issue: ${check.name}`, {
        description: hint || error,
        duration: 10000,
        action: hint
          ? {
              label: 'Auto-recovering...',
              onClick: () => {
                // User can dismiss the toast - recovery happens automatically
              },
            }
          : undefined,
      });
    }
  }

  /**
   * Subscribe to health status changes
   */
  subscribe(listener: HealthListener) {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(new Map(this.status));

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(new Map(this.status));
      } catch (error) {
        logger.error('Health monitor listener error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Get current health status
   */
  getStatus(): Map<string, HealthStatus> {
    return new Map(this.status);
  }

  /**
   * Get status for a specific check
   */
  getCheckStatus(name: string): HealthStatus | undefined {
    return this.status.get(name);
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    return Array.from(this.status.values()).every((s) => s.healthy);
  }

  /**
   * Check if critical services are healthy
   */
  isCriticalHealthy(): boolean {
    return Array.from(this.status.entries()).every(([name, status]) => {
      const check = this.checks.get(name);
      return !check?.critical || status.healthy;
    });
  }

  /**
   * Get summary
   */
  getSummary() {
    const all = Array.from(this.status.values());
    return {
      total: all.length,
      healthy: all.filter((s) => s.healthy).length,
      unhealthy: all.filter((s) => !s.healthy).length,
      critical: all.filter((s) => {
        const check = this.checks.get(s.name);
        return check?.critical && !s.healthy;
      }).length,
    };
  }

  /**
   * Force run all health checks
   */
  async runAllChecks(): Promise<void> {
    const checks = Array.from(this.checks.values());
    await Promise.all(checks.map((check) => this.runCheck(check)));
  }

  /**
   * Stop all health checks
   */
  stop() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    logger.info('Health monitor stopped');
  }

  /**
   * Restart all health checks
   */
  restart() {
    this.stop();
    this.checks.forEach((check) => this.startCheck(check));
    logger.info('Health monitor restarted');
  }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();

// Register default checks
export function registerDefaultHealthChecks(_apiKey?: string) {
  // Syncthing API check - use Tauri invoke instead of direct fetch
  healthMonitor.register({
    name: 'syncthing-api',
    check: async () => {
      try {
        // Use the same Tauri command that the UI uses
        const result = await invoke('get_system_status');
        return result !== null && result !== undefined;
      } catch (error) {
        // Log the actual error to help diagnose connection issues
        const errorMsg =
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null
              ? JSON.stringify(error)
              : String(error);

        // Only log detailed error on first few failures to avoid spam
        const status = healthMonitor.getCheckStatus('syncthing-api');
        if (!status || status.consecutiveFailures < 3) {
          logger.debug('Syncthing API check failed', { error: errorMsg });
        }

        return false;
      }
    },
    interval: 10000,
    critical: true,
  });

  // IndexedDB check
  healthMonitor.register({
    name: 'indexeddb',
    check: async () => {
      try {
        const request = indexedDB.open('health-check', 1);
        return new Promise((resolve) => {
          request.onsuccess = () => {
            request.result.close();
            resolve(true);
          };
          request.onerror = () => resolve(false);
        });
      } catch {
        return false;
      }
    },
    interval: 60000,
  });

  // Memory check (browser only)
  if (typeof window !== 'undefined' && 'memory' in performance) {
    healthMonitor.register({
      name: 'memory',
      check: async () => {
        const memory = (
          performance as Performance & {
            memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
          }
        ).memory;
        if (memory) {
          const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
          return usedPercent < 90; // Alert if over 90%
        }
        return true;
      },
      interval: 30000,
    });
  }

  logger.info('Default health checks registered');
}

export type { HealthCheck, HealthStatus };
