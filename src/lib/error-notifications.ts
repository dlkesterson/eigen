// src/lib/error-notifications.ts
// Global error notification system with auto-recovery

import { toast } from 'sonner';
import { logger } from './logger';
import { AppError, ErrorHandler, ErrorRecovery } from './errors';
import { syncthingCircuitBreaker } from './retry';

export interface ErrorNotificationOptions {
    showToast?: boolean;
    autoRecover?: boolean;
    retryAction?: () => Promise<void>;
    dismissable?: boolean;
    duration?: number;
}

type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorEvent {
    id: string;
    error: AppError | Error;
    severity: ErrorSeverity;
    timestamp: Date;
    recovered: boolean;
    notified: boolean;
}

class ErrorNotificationService {
    private recentErrors: Map<string, ErrorEvent> = new Map();
    private readonly maxRecentErrors = 50;
    private readonly dedupeWindowMs = 5000; // Don't show same error twice in 5s

    /**
     * Notify user of an error with appropriate toast
     */
    notify(error: unknown, options: ErrorNotificationOptions = {}): string {
        const {
            showToast = true,
            autoRecover = true,
            retryAction,
            dismissable = true,
            duration = 5000,
        } = options;

        const normalized = ErrorHandler.normalize(error);
        const severity = this.getSeverity(normalized);
        const errorId = this.generateErrorId(normalized);

        // Check for duplicate errors
        if (this.isDuplicate(errorId)) {
            logger.debug('Suppressing duplicate error notification', { errorId });
            return errorId;
        }

        // Log the error
        logger.error('Error notification', {
            code: normalized.code,
            message: normalized.message,
            userMessage: normalized.userMessage,
            recoverable: normalized.recoverable,
            severity,
        });

        // Store error event
        this.storeError(errorId, normalized, severity);

        // Show toast notification
        if (showToast) {
            this.showToast(normalized, severity, {
                retryAction,
                dismissable,
                duration,
                errorId,
            });
        }

        // Attempt auto-recovery
        if (autoRecover && normalized.recoverable) {
            this.attemptAutoRecovery(normalized, errorId);
        }

        return errorId;
    }

    /**
     * Show success notification
     */
    success(message: string, description?: string) {
        toast.success(message, { description });
        logger.info(message, { description });
    }

    /**
     * Show warning notification
     */
    warning(message: string, description?: string) {
        toast.warning(message, { description });
        logger.warn(message, { description });
    }

    /**
     * Show info notification
     */
    info(message: string, description?: string) {
        toast.info(message, { description });
        logger.info(message, { description });
    }

    /**
     * Notify about connection recovery
     */
    notifyRecovery(serviceName: string = 'Connection') {
        // Dismiss the loading toast first
        toast.dismiss(`recovery-${serviceName}`);

        // Show success toast
        toast.success(`${serviceName} restored`, {
            description: 'The connection has been re-established',
        });
        logger.info(`${serviceName} recovered`);
    }

    /**
     * Notify about ongoing connection issues
     */
    notifyConnectionIssue(retryAction?: () => void) {
        const toastId = toast.error('Connection lost', {
            description: 'Attempting to reconnect...',
            duration: Infinity,
            action: retryAction
                ? {
                    label: 'Retry Now',
                    onClick: retryAction,
                }
                : undefined,
        });
        logger.warn('Connection lost, attempting recovery');
        return toastId;
    }

    /**
     * Dismiss a specific toast
     */
    dismiss(toastId: string | number) {
        toast.dismiss(toastId);
    }

    /**
     * Get error severity based on error type
     */
    private getSeverity(error: AppError): ErrorSeverity {
        // Critical errors - system is unusable
        if (!error.recoverable) {
            return 'critical';
        }

        // Check specific error codes
        switch (error.code) {
            case 'NETWORK_ERROR':
            case 'SYNCTHING_CONNECTION_REFUSED':
                return 'warning';
            case 'VALIDATION_ERROR':
                return 'info';
            case 'CONFIG_ERROR':
                return 'critical';
            default:
                if (error.statusCode && error.statusCode >= 500) {
                    return 'error';
                }
                return 'warning';
        }
    }

    /**
     * Generate unique error ID for deduplication
     */
    private generateErrorId(error: AppError): string {
        return `${error.code}-${error.message.slice(0, 50)}`;
    }

    /**
     * Check if this error was recently shown
     */
    private isDuplicate(errorId: string): boolean {
        const existing = this.recentErrors.get(errorId);
        if (!existing) return false;

        const timeSince = Date.now() - existing.timestamp.getTime();
        return timeSince < this.dedupeWindowMs;
    }

    /**
     * Store error in recent errors map
     */
    private storeError(errorId: string, error: AppError, severity: ErrorSeverity) {
        const event: ErrorEvent = {
            id: errorId,
            error,
            severity,
            timestamp: new Date(),
            recovered: false,
            notified: true,
        };

        this.recentErrors.set(errorId, event);

        // Cleanup old errors
        if (this.recentErrors.size > this.maxRecentErrors) {
            const oldestKey = this.recentErrors.keys().next().value;
            if (oldestKey) {
                this.recentErrors.delete(oldestKey);
            }
        }
    }

    /**
     * Show toast based on severity
     */
    private showToast(
        error: AppError,
        severity: ErrorSeverity,
        options: {
            retryAction?: () => Promise<void>;
            dismissable: boolean;
            duration: number;
            errorId: string;
        }
    ) {
        const { retryAction, dismissable, duration, errorId } = options;

        const toastOptions: Parameters<typeof toast.error>[1] = {
            description: error.userMessage,
            duration: severity === 'critical' ? Infinity : duration,
            dismissible: dismissable,
            id: errorId,
        };

        // Add retry action if provided and error is recoverable
        if (retryAction && error.recoverable) {
            toastOptions.action = {
                label: 'Retry',
                onClick: async () => {
                    try {
                        await retryAction();
                        this.markRecovered(errorId);
                    } catch (retryError) {
                        this.notify(retryError, { autoRecover: false });
                    }
                },
            };
        }

        // Show appropriate toast type
        switch (severity) {
            case 'critical':
                toast.error(`⚠️ ${this.getErrorTitle(error)}`, toastOptions);
                break;
            case 'error':
                toast.error(this.getErrorTitle(error), toastOptions);
                break;
            case 'warning':
                toast.warning(this.getErrorTitle(error), toastOptions);
                break;
            case 'info':
                toast.info(this.getErrorTitle(error), toastOptions);
                break;
        }
    }

    /**
     * Get user-friendly error title
     */
    private getErrorTitle(error: AppError): string {
        switch (error.code) {
            case 'NETWORK_ERROR':
                return 'Network Error';
            case 'SYNCTHING_CONNECTION_REFUSED':
                return 'Syncthing Unavailable';
            case 'SYNCTHING_TIMEOUT':
                return 'Request Timeout';
            case 'VALIDATION_ERROR':
                return 'Invalid Input';
            case 'CONFIG_ERROR':
                return 'Configuration Error';
            case 'FILESYSTEM_ERROR':
                return 'File System Error';
            case 'DATABASE_ERROR':
                return 'Database Error';
            default:
                if (error.code.startsWith('API_ERROR_')) {
                    return 'API Error';
                }
                return 'Error';
        }
    }

    /**
     * Attempt automatic recovery
     */
    private async attemptAutoRecovery(error: AppError, errorId: string) {
        // Check if recovery strategy exists
        if (!ErrorRecovery.hasStrategy(error.code)) {
            return;
        }

        logger.info('Attempting auto-recovery', { errorCode: error.code });

        try {
            const recovered = await ErrorRecovery.attempt(error);

            if (recovered) {
                this.markRecovered(errorId);
                toast.success('Recovered', {
                    description: 'The issue has been resolved automatically',
                });
            }
        } catch (recoveryError) {
            logger.error('Auto-recovery failed', {
                errorCode: error.code,
                recoveryError:
                    recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
            });
        }
    }

    /**
     * Mark error as recovered
     */
    private markRecovered(errorId: string) {
        const event = this.recentErrors.get(errorId);
        if (event) {
            event.recovered = true;
            this.recentErrors.set(errorId, event);
        }
        toast.dismiss(errorId);
    }

    /**
     * Get recent errors for debugging
     */
    getRecentErrors(): ErrorEvent[] {
        return Array.from(this.recentErrors.values());
    }

    /**
     * Clear all recent errors
     */
    clearRecentErrors() {
        this.recentErrors.clear();
    }

    /**
     * Check circuit breaker and notify if open
     */
    checkCircuitBreaker(): boolean {
        const state = syncthingCircuitBreaker.getState();

        if (state.state === 'open') {
            toast.error('Service Temporarily Unavailable', {
                description: 'Too many failures detected. Please wait before retrying.',
                duration: 10000,
                action: {
                    label: 'Reset',
                    onClick: () => {
                        syncthingCircuitBreaker.reset();
                        toast.success('Circuit breaker reset');
                    },
                },
            });
            return true;
        }

        return false;
    }

    /**
     * Notify user that auto-recovery is in progress
     */
    notifyRecovering(serviceName: string, attemptInfo: string = '') {
        // Don't show recovery toast for initial attempts
        // The header status indicator provides visual feedback
        if (!attemptInfo || attemptInfo.includes('1') || attemptInfo.includes('2')) {
            logger.info(`Recovery started: ${serviceName}`, { attemptInfo });
            return;
        }

        const message =
            serviceName === 'syncthing-restart' ? 'Restarting Syncthing' : `Recovering ${serviceName}`;

        toast.loading(`${message}${attemptInfo}...`, {
            id: `recovery-${serviceName}`,
            description: 'Please wait while we restore the connection',
        });

        logger.info(`Recovery started: ${serviceName}`, { attemptInfo });
    }

    /**
     * Notify user that recovery is retrying
     */
    notifyRecoveryRetrying(serviceName: string, attempt: number, maxAttempts: number) {
        // Don't show toast for first few retry attempts to avoid UI noise
        // The header status indicator shows the reconnecting state
        if (attempt <= 2) {
            logger.info(`Retrying ${serviceName} (attempt ${attempt}/${maxAttempts})`);
            return;
        }

        toast.loading(`Retrying ${serviceName}...`, {
            id: `recovery-${serviceName}`,
            description: `Attempt ${attempt} of ${maxAttempts}`,
        });
    }

    /**
     * Notify user that recovery failed after all attempts
     */
    notifyRecoveryFailed(serviceName: string, maxAttempts: number) {
        toast.error('Recovery Failed', {
            id: `recovery-${serviceName}`,
            description: `Could not restore ${serviceName} after ${maxAttempts} attempts. Please check your settings.`,
            duration: 10000,
        });

        logger.error(`Recovery failed after ${maxAttempts} attempts: ${serviceName}`);
    }
}

// Global instance
export const errorNotifications = new ErrorNotificationService();

// Convenience exports
export const notifyError = (error: unknown, options?: ErrorNotificationOptions) =>
    errorNotifications.notify(error, options);

export const notifySuccess = (message: string, description?: string) =>
    errorNotifications.success(message, description);

export const notifyWarning = (message: string, description?: string) =>
    errorNotifications.warning(message, description);

export const notifyInfo = (message: string, description?: string) =>
    errorNotifications.info(message, description);
