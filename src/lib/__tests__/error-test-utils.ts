// src/lib/__tests__/error-test-utils.ts
// Test utilities for error scenarios

import {
  AppError,
  NetworkError,
  APIError,
  SyncthingError,
  ValidationError,
  ConfigError,
  ErrorHandler,
} from '../errors';
import { logger } from '../logger';

/**
 * Create mock errors for testing
 */
export const mockErrors = {
  network: () =>
    new NetworkError('Network request failed', {
      context: { endpoint: 'http://localhost:8384' },
    }),

  api404: () =>
    new APIError('Resource not found', 404, {
      context: { resource: '/rest/config' },
    }),

  api500: () =>
    new APIError('Internal server error', 500, {
      context: { resource: '/rest/config' },
    }),

  syncthingConnection: () =>
    new SyncthingError('Connection refused', 'CONNECTION_REFUSED', {
      context: { host: '127.0.0.1', port: 8384 },
    }),

  syncthingTimeout: () =>
    new SyncthingError('Request timed out', 'TIMEOUT', {
      context: { command: 'get_system_status', timeout: 10000 },
    }),

  validation: (fields?: Record<string, string[]>) =>
    new ValidationError('Validation failed', fields || { folderId: ['Folder ID is required'] }),

  config: () =>
    new ConfigError('Invalid configuration', {
      context: { field: 'syncthingPort' },
    }),

  generic: () => new Error('Something went wrong'),
};

/**
 * Create error with custom properties for testing
 */
export function createTestError(options: {
  message?: string;
  code?: string;
  recoverable?: boolean;
  userMessage?: string;
}): AppError {
  const {
    message = 'Test error',
    code = 'TEST_ERROR',
    recoverable = true,
    userMessage = 'A test error occurred',
  } = options;

  return new TestError(message, code, { userMessage, recoverable });
}

class TestError extends AppError {
  constructor(
    message: string,
    code: string,
    options: { userMessage?: string; recoverable?: boolean }
  ) {
    super(message, code, options);
  }
}

/**
 * Simulate async operation that fails
 */
export function createFailingOperation(
  error: Error | (() => Error),
  delay = 100
): () => Promise<never> {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    throw typeof error === 'function' ? error() : error;
  };
}

/**
 * Simulate async operation that succeeds after N failures
 */
export function createFlakyOperation<T>(
  result: T,
  failuresBeforeSuccess: number,
  error: Error = new Error('Temporary failure')
): () => Promise<T> {
  let attempts = 0;

  return async () => {
    attempts++;
    if (attempts <= failuresBeforeSuccess) {
      throw error;
    }
    return result;
  };
}

/**
 * Test logger capture
 */
export function createLogCapture() {
  const logs: Array<{ level: string; message: string; context?: Record<string, unknown> }> = [];

  const originalDebug = logger.debug.bind(logger);
  const originalInfo = logger.info.bind(logger);
  const originalWarn = logger.warn.bind(logger);
  const originalError = logger.error.bind(logger);

  const capture = {
    logs,

    start() {
      logger.debug = (message, context) => {
        logs.push({ level: 'debug', message, context });
        originalDebug(message, context);
      };
      logger.info = (message, context) => {
        logs.push({ level: 'info', message, context });
        originalInfo(message, context);
      };
      logger.warn = (message, context) => {
        logs.push({ level: 'warn', message, context });
        originalWarn(message, context);
      };
      logger.error = (message, context) => {
        logs.push({ level: 'error', message, context });
        originalError(message, context);
      };
    },

    stop() {
      logger.debug = originalDebug;
      logger.info = originalInfo;
      logger.warn = originalWarn;
      logger.error = originalError;
    },

    clear() {
      logs.length = 0;
    },

    getByLevel(level: string) {
      return logs.filter((log) => log.level === level);
    },

    getErrors() {
      return this.getByLevel('error');
    },

    getWarnings() {
      return this.getByLevel('warn');
    },
  };

  return capture;
}

/**
 * Assert error properties
 */
export function assertErrorProperties(
  error: unknown,
  expected: {
    code?: string;
    recoverable?: boolean;
    userMessage?: string;
  }
) {
  if (!(error instanceof AppError)) {
    throw new Error(`Expected AppError, got ${error?.constructor.name}`);
  }

  if (expected.code !== undefined && error.code !== expected.code) {
    throw new Error(`Expected code "${expected.code}", got "${error.code}"`);
  }

  if (expected.recoverable !== undefined && error.recoverable !== expected.recoverable) {
    throw new Error(`Expected recoverable=${expected.recoverable}, got ${error.recoverable}`);
  }

  if (expected.userMessage !== undefined && error.userMessage !== expected.userMessage) {
    throw new Error(`Expected userMessage "${expected.userMessage}", got "${error.userMessage}"`);
  }
}

/**
 * Test error handler behavior
 */
export function testErrorHandler() {
  const results = {
    retryable: [] as Array<{ error: unknown; result: boolean }>,
    userMessages: [] as Array<{ error: unknown; message: string }>,
    normalized: [] as Array<{ error: unknown; result: AppError }>,
  };

  // Test isRetryable
  const testErrors = [
    mockErrors.network(),
    mockErrors.api500(),
    mockErrors.api404(),
    mockErrors.syncthingConnection(),
    mockErrors.validation(),
    mockErrors.config(),
    mockErrors.generic(),
  ];

  testErrors.forEach((error) => {
    results.retryable.push({
      error,
      result: ErrorHandler.isRetryable(error),
    });
    results.userMessages.push({
      error,
      message: ErrorHandler.getUserMessage(error),
    });
    results.normalized.push({
      error,
      result: ErrorHandler.normalize(error),
    });
  });

  return results;
}

/**
 * Simulate network conditions
 */
export const networkSimulator = {
  /**
   * Simulate offline mode
   */
  goOffline() {
    if (typeof window !== 'undefined') {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
      window.dispatchEvent(new Event('offline'));
    }
  },

  /**
   * Simulate online mode
   */
  goOnline() {
    if (typeof window !== 'undefined') {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });
      window.dispatchEvent(new Event('online'));
    }
  },

  /**
   * Simulate slow network
   */
  createSlowFetch(delayMs: number) {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return originalFetch(...args);
    };

    return () => {
      globalThis.fetch = originalFetch;
    };
  },

  /**
   * Simulate failing fetch
   */
  createFailingFetch(error: Error = new Error('Network error')) {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => {
      throw error;
    };

    return () => {
      globalThis.fetch = originalFetch;
    };
  },
};

/**
 * Wait for condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('waitFor timed out');
}

/**
 * Create a deferred promise for testing
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}
