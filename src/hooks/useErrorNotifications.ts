// src/hooks/useErrorNotifications.ts
// Enhanced notification hook that integrates with the error system

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  errorNotifications,
  notifyError,
  notifySuccess,
  notifyWarning,
  notifyInfo,
} from '@/lib/error-notifications';
import { ErrorHandler, AppError } from '@/lib/errors';
import { syncthingCircuitBreaker } from '@/lib/retry';
import { healthMonitor, HealthStatus } from '@/lib/health-monitor';

export interface UseErrorNotificationsOptions {
  watchCircuitBreaker?: boolean;
  watchHealth?: boolean;
  notifyOnHealthChange?: boolean;
}

/**
 * Hook for handling errors with toast notifications and recovery
 */
export function useErrorNotifications(options: UseErrorNotificationsOptions = {}) {
  const { watchCircuitBreaker = true, watchHealth = true, notifyOnHealthChange = true } = options;

  const previousHealthRef = useRef<Map<string, HealthStatus>>(new Map());
  const connectionLostToastRef = useRef<string | number | null>(null);

  // Watch circuit breaker state
  useEffect(() => {
    if (!watchCircuitBreaker) return;

    const checkInterval = setInterval(() => {
      const state = syncthingCircuitBreaker.getState();

      if (state.state === 'open' && connectionLostToastRef.current === null) {
        connectionLostToastRef.current = errorNotifications.notifyConnectionIssue(() => {
          syncthingCircuitBreaker.reset();
        });
      } else if (state.state === 'closed' && connectionLostToastRef.current !== null) {
        toast.dismiss(connectionLostToastRef.current);
        connectionLostToastRef.current = null;
        errorNotifications.notifyRecovery('Syncthing');
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [watchCircuitBreaker]);

  // Watch health status changes
  useEffect(() => {
    if (!watchHealth) return;

    const unsubscribe = healthMonitor.subscribe((status) => {
      if (!notifyOnHealthChange) return;

      status.forEach((currentStatus, name) => {
        const previousStatus = previousHealthRef.current.get(name);

        // Check for status changes
        if (previousStatus) {
          // Service recovered
          if (!previousStatus.healthy && currentStatus.healthy) {
            logger.info(`Health check recovered: ${name}`);
            toast.success(`${formatServiceName(name)} recovered`, {
              description: 'Service is now healthy',
            });
          }

          // Service became unhealthy (only notify after multiple failures)
          if (
            previousStatus.healthy &&
            !currentStatus.healthy &&
            currentStatus.consecutiveFailures >= 2
          ) {
            logger.warn(`Health check failing: ${name}`, {
              consecutiveFailures: currentStatus.consecutiveFailures,
            });
            toast.warning(`${formatServiceName(name)} issue detected`, {
              description: currentStatus.error || 'Service is experiencing problems',
            });
          }
        }
      });

      previousHealthRef.current = new Map(status);
    });

    return unsubscribe;
  }, [watchHealth, notifyOnHealthChange]);

  /**
   * Handle an error with notification
   */
  const handleError = useCallback(
    (
      error: unknown,
      options?: {
        showToast?: boolean;
        retryAction?: () => Promise<void>;
        context?: string;
      }
    ) => {
      const { showToast = true, retryAction, context } = options || {};

      logger.error('Error handled', {
        error: error instanceof Error ? error.message : String(error),
        context,
      });

      return notifyError(error, {
        showToast,
        retryAction,
        autoRecover: true,
      });
    },
    []
  );

  /**
   * Show a success notification
   */
  const showSuccess = useCallback((message: string, description?: string) => {
    notifySuccess(message, description);
  }, []);

  /**
   * Show a warning notification
   */
  const showWarning = useCallback((message: string, description?: string) => {
    notifyWarning(message, description);
  }, []);

  /**
   * Show an info notification
   */
  const showInfo = useCallback((message: string, description?: string) => {
    notifyInfo(message, description);
  }, []);

  /**
   * Show error notification with custom message
   */
  const showError = useCallback((message: string, description?: string) => {
    toast.error(message, { description });
    logger.error(message, { description });
  }, []);

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(
    <T extends unknown[], R>(
      fn: (...args: T) => Promise<R>,
      options?: {
        successMessage?: string;
        errorMessage?: string;
        showSuccessToast?: boolean;
      }
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          const result = await fn(...args);

          if (options?.showSuccessToast && options?.successMessage) {
            showSuccess(options.successMessage);
          }

          return result;
        } catch (error) {
          handleError(error, {
            showToast: true,
            context: options?.errorMessage,
          });
          return undefined;
        }
      };
    },
    [handleError, showSuccess]
  );

  /**
   * Get user-friendly error message
   */
  const getUserMessage = useCallback((error: unknown): string => {
    return ErrorHandler.getUserMessage(error);
  }, []);

  /**
   * Check if error is recoverable
   */
  const isRecoverable = useCallback((error: unknown): boolean => {
    return ErrorHandler.isRetryable(error);
  }, []);

  return {
    handleError,
    showSuccess,
    showWarning,
    showInfo,
    showError,
    withErrorHandling,
    getUserMessage,
    isRecoverable,
    errorNotifications,
  };
}

/**
 * Format service name for display
 */
function formatServiceName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Hook for operation notifications (mutations)
 */
export function useOperationNotifications() {
  const { handleError, showSuccess } = useErrorNotifications();

  /**
   * Wrap a mutation with notifications
   */
  const withNotifications = useCallback(
    <T extends unknown[], R>(
      operation: (...args: T) => Promise<R>,
      options: {
        operationName: string;
        successMessage?: string;
        errorMessage?: string;
      }
    ) => {
      return async (...args: T): Promise<R> => {
        const { operationName, successMessage, errorMessage } = options;

        logger.debug(`Starting operation: ${operationName}`);

        try {
          const result = await operation(...args);

          if (successMessage) {
            showSuccess(successMessage);
          }

          logger.info(`Operation completed: ${operationName}`);
          return result;
        } catch (error) {
          logger.error(`Operation failed: ${operationName}`, {
            error: error instanceof Error ? error.message : String(error),
          });

          handleError(error, {
            showToast: true,
            context: errorMessage || `Failed to ${operationName.toLowerCase()}`,
          });

          throw error;
        }
      };
    },
    [handleError, showSuccess]
  );

  return {
    withNotifications,
  };
}

export { notifyError, notifySuccess, notifyWarning, notifyInfo };
