// src/lib/retry.ts
import { logger } from './logger';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
}

export class RetryableError extends Error {
    constructor(
        message: string,
        public readonly originalError: unknown,
        public readonly attempt: number
    ) {
        super(message);
        this.name = 'RetryableError';
    }
}

/**
 * Exponential backoff with jitter
 */
function calculateDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    backoffMultiplier: number
): number {
    const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
    const clampedDelay = Math.min(exponentialDelay, maxDelay);
    // Add jitter (±25%)
    const jitter = clampedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(clampedDelay + jitter);
}

/**
 * Default retry predicate - retry on network errors and 5xx status codes
 */
function defaultShouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return true;
        }
        // Connection errors
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
            return true;
        }
        if (error.message.includes('ECONNRESET') || error.message.includes('ENOTFOUND')) {
            return true;
        }
    }

    // Check for HTTP status codes in error object
    if (typeof error === 'object' && error !== null && 'status' in error) {
        const status = (error as { status: number }).status;
        // Retry on 5xx errors and 429 (rate limit)
        return status >= 500 || status === 429;
    }

    return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelay = 1000,
        maxDelay = 30000,
        backoffMultiplier = 2,
        shouldRetry = defaultShouldRetry,
        onRetry,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await fn();

            // Log success after retry
            if (attempt > 1) {
                logger.info(`Operation succeeded after ${attempt} attempts`);
            }

            return result;
        } catch (error) {
            lastError = error;

            // Check if we should retry
            const isRetryable = shouldRetry(error);
            const isLastAttempt = attempt === maxAttempts;

            logger.warn(`Operation failed (attempt ${attempt}/${maxAttempts})`, {
                error: error instanceof Error ? error.message : String(error),
                retryable: isRetryable,
                willRetry: isRetryable && !isLastAttempt,
            });

            // Don't retry if not retryable or last attempt
            if (!isRetryable || isLastAttempt) {
                throw new RetryableError(
                    `Operation failed after ${attempt} attempts`,
                    error,
                    attempt
                );
            }

            // Call retry callback
            onRetry?.(attempt, error);

            // Calculate delay and wait
            const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier);
            logger.debug(`Waiting ${delay}ms before retry ${attempt + 1}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new RetryableError(
        `Operation failed after ${maxAttempts} attempts`,
        lastError,
        maxAttempts
    );
}

/**
 * Create a retryable version of a function
 */
export function withRetry<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
    return (...args: TArgs) => retry(() => fn(...args), options);
}

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
    failureThreshold?: number;
    resetTimeout?: number;
    successThreshold?: number;
}

/**
 * Circuit breaker pattern - prevent cascading failures
 */
export class CircuitBreaker {
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime: number | null = null;
    private state: CircuitState = 'closed';
    private readonly failureThreshold: number;
    private readonly resetTimeout: number;
    private readonly successThreshold: number;

    constructor(options: CircuitBreakerOptions = {}) {
        this.failureThreshold = options.failureThreshold ?? 5;
        this.resetTimeout = options.resetTimeout ?? 60000;
        this.successThreshold = options.successThreshold ?? 2;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if circuit is open
        if (this.state === 'open') {
            const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
            if (timeSinceLastFailure < this.resetTimeout) {
                logger.warn('Circuit breaker is OPEN - rejecting request', {
                    timeUntilReset: this.resetTimeout - timeSinceLastFailure,
                });
                throw new Error('Circuit breaker is OPEN - too many failures');
            }
            // Try to close circuit
            this.state = 'half-open';
            logger.info('Circuit breaker entering HALF-OPEN state');
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.successCount++;

        if (this.state === 'half-open' && this.successCount >= this.successThreshold) {
            this.state = 'closed';
            this.failureCount = 0;
            this.successCount = 0;
            logger.info('Circuit breaker CLOSED - system recovered');
        } else if (this.state === 'closed') {
            // Reset failure count on success when closed
            this.failureCount = Math.max(0, this.failureCount - 1);
        }
    }

    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        this.successCount = 0;

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'open';
            logger.error('Circuit breaker OPEN - too many failures', {
                failureCount: this.failureCount,
                threshold: this.failureThreshold,
            });
        }
    }

    getState(): { state: CircuitState; failureCount: number; successCount: number } {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
        };
    }

    isOpen(): boolean {
        return this.state === 'open';
    }

    isClosed(): boolean {
        return this.state === 'closed';
    }

    reset() {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        logger.info('Circuit breaker manually reset');
    }
}

// Global circuit breaker for Syncthing API
export const syncthingCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
});
