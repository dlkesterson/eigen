// src/lib/errors.ts
import { logger } from './logger';

/**
 * Base error class with rich context
 */
export abstract class AppError extends Error {
  public readonly timestamp: Date;
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly context?: Record<string, unknown>;
  public readonly userMessage: string;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    options: {
      userMessage?: string;
      statusCode?: number;
      context?: Record<string, unknown>;
      recoverable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.userMessage = options.userMessage || message;
    this.statusCode = options.statusCode;
    this.context = options.context;
    this.recoverable = options.recoverable ?? true;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Capture stack trace properly
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      timestamp: this.timestamp.toISOString(),
      statusCode: this.statusCode,
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'NETWORK_ERROR', {
      ...options,
      userMessage:
        options?.userMessage || 'Network connection failed. Please check your connection.',
      statusCode: 0,
      recoverable: true,
    });
  }
}

/**
 * API/HTTP errors
 */
export class APIError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    const code = `API_ERROR_${statusCode}`;
    const userMessage = options?.userMessage || APIError.getDefaultMessage(statusCode);

    super(message, code, {
      ...options,
      userMessage,
      statusCode,
      recoverable: statusCode < 500,
    });
  }

  static getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: 'Bad request - please check your input',
      401: 'Authentication required - please log in',
      403: 'Access denied - you do not have permission',
      404: 'Resource not found',
      429: 'Too many requests - please slow down',
      500: 'Server error - please try again later',
      502: 'Bad gateway - service temporarily unavailable',
      503: 'Service unavailable - please try again later',
    };
    return messages[statusCode] || 'An error occurred';
  }
}

/**
 * Syncthing-specific errors
 */
export class SyncthingError extends AppError {
  constructor(
    message: string,
    code: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, `SYNCTHING_${code}`, {
      ...options,
      userMessage: options?.userMessage || SyncthingError.getDefaultMessage(code),
    });
  }

  static getDefaultMessage(code: string): string {
    const messages: Record<string, string> = {
      CONNECTION_REFUSED: 'Cannot connect to Syncthing. Is it running?',
      TIMEOUT: 'Syncthing is taking too long to respond',
      NOT_RUNNING: 'Syncthing is not running',
      CONFIG_ERROR: 'Syncthing configuration error',
      FOLDER_NOT_FOUND: 'Folder not found in Syncthing',
      DEVICE_NOT_FOUND: 'Device not found in Syncthing',
      API_KEY_INVALID: 'Invalid Syncthing API key',
    };
    return messages[code] || 'Syncthing operation failed';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    fields?: Record<string, string[]>,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, 'VALIDATION_ERROR', {
      ...options,
      userMessage: options?.userMessage || 'Invalid input - please check your data',
      recoverable: true,
    });
    this.fields = fields;
  }
}

/**
 * Configuration errors
 */
export class ConfigError extends AppError {
  constructor(
    message: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, 'CONFIG_ERROR', {
      ...options,
      userMessage: options?.userMessage || 'Configuration error - please check your settings',
      recoverable: false,
    });
  }
}

/**
 * File system errors
 */
export class FileSystemError extends AppError {
  constructor(
    message: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'FILESYSTEM_ERROR', {
      ...options,
      userMessage: options?.userMessage || 'File system error - check permissions',
    });
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'DATABASE_ERROR', {
      ...options,
      userMessage: options?.userMessage || 'Database operation failed',
    });
  }
}

/**
 * Invoke (Tauri) errors
 */
export class InvokeError extends AppError {
  constructor(
    message: string,
    command: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'INVOKE_ERROR', {
      ...options,
      userMessage: options?.userMessage || `Failed to execute command: ${command}`,
      context: { ...options?.context, command },
    });
  }
}

/**
 * Error handler utilities
 */
export class ErrorHandler {
  /**
   * Determine if an error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.recoverable;
    }

    if (error instanceof Error) {
      // Network errors are retryable
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return true;
      }
      // Timeout errors are retryable
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return true;
      }
      // Connection errors are retryable
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ECONNRESET')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof AppError) {
      return error.userMessage;
    }

    if (error instanceof Error) {
      // Map common error messages
      if (error.message.includes('ECONNREFUSED')) {
        return 'Cannot connect to Syncthing. Is it running?';
      }
      if (error.message.includes('ETIMEDOUT')) {
        return 'Connection timed out. Please try again.';
      }
      if (error.message.includes('ENOTFOUND')) {
        return 'Could not find server. Check your network connection.';
      }
      if (error.message.includes('ECONNRESET')) {
        return 'Connection was reset. Please try again.';
      }

      return error.message;
    }

    return 'An unexpected error occurred';
  }

  /**
   * Get error code
   */
  static getErrorCode(error: unknown): string {
    if (error instanceof AppError) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Convert unknown error to AppError
   */
  static normalize(error: unknown, defaultMessage = 'An error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to infer error type
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return new NetworkError(error.message, { cause: error });
      }
      if (error.message.includes('ECONNREFUSED')) {
        return new SyncthingError(error.message, 'CONNECTION_REFUSED', { cause: error });
      }

      // Generic unknown error - create a concrete implementation
      return new UnknownError(error.message, { userMessage: defaultMessage, cause: error });
    }

    return new UnknownError(String(error), { userMessage: defaultMessage });
  }

  /**
   * Report error to logging service
   */
  static report(error: unknown, context?: Record<string, unknown>) {
    const normalized = this.normalize(error);

    logger.error('Error Report', {
      ...normalized.toJSON(),
      additionalContext: context,
    });
  }
}

/**
 * Unknown/generic errors
 */
export class UnknownError extends AppError {
  constructor(
    message: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, 'UNKNOWN_ERROR', {
      ...options,
      userMessage: options?.userMessage || 'An unexpected error occurred',
      recoverable: true,
    });
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  private static strategies = new Map<string, () => Promise<void>>();

  /**
   * Register recovery strategy for error code
   */
  static register(errorCode: string, strategy: () => Promise<void>) {
    this.strategies.set(errorCode, strategy);
  }

  /**
   * Attempt to recover from error
   */
  static async attempt(error: AppError): Promise<boolean> {
    const strategy = this.strategies.get(error.code);

    if (!strategy) {
      return false;
    }

    try {
      await strategy();
      logger.info('Error recovery succeeded', { errorCode: error.code });
      return true;
    } catch (recoveryError) {
      ErrorHandler.report(recoveryError, {
        originalError: error.code,
        recovery: 'failed',
      });
      return false;
    }
  }

  /**
   * Check if recovery strategy exists
   */
  static hasStrategy(errorCode: string): boolean {
    return this.strategies.has(errorCode);
  }
}

// Register default recovery strategies
ErrorRecovery.register('NETWORK_ERROR', async () => {
  // Wait and retry connection
  await new Promise((resolve) => setTimeout(resolve, 2000));
});

ErrorRecovery.register('SYNCTHING_CONNECTION_REFUSED', async () => {
  // Could try to start Syncthing via Tauri
  // await invoke('start_syncthing_sidecar');
  await new Promise((resolve) => setTimeout(resolve, 3000));
});
