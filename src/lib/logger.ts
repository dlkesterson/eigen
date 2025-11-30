// src/lib/logger.ts
/* eslint-disable no-console */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private level: LogLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  private history: LogEntry[] = [];
  private maxHistory = 1000;
  private listeners: Set<() => void> = new Set();

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    // Store in history
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Console output with colors (works in browser and Node.js dev mode)
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';

    const timestamp = entry.timestamp.toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    // Use appropriate console method
    if (typeof window !== 'undefined') {
      // Browser - use console styles
      const browserColors = {
        debug: 'color: #06b6d4',
        info: 'color: #22c55e',
        warn: 'color: #eab308',
        error: 'color: #ef4444',
      };
      // Filter out undefined values from context and only include if non-empty
      const filteredContext = context
        ? Object.fromEntries(Object.entries(context).filter(([, v]) => v !== undefined))
        : null;
      const hasContext = filteredContext && Object.keys(filteredContext).length > 0;
      console[level === 'debug' ? 'log' : level](
        `%c[${level.toUpperCase()}] ${timestamp}`,
        browserColors[level],
        message,
        ...(hasContext ? [filteredContext] : [])
      );
    } else {
      // Node.js
      console.log(
        `${colors[level]}[${level.toUpperCase()}] ${timestamp}${reset} ${message}${contextStr}`
      );
    }

    // Notify listeners
    this.notifyListeners();
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  // Export logs for debugging
  exportLogs(): LogEntry[] {
    return [...this.history];
  }

  // Download logs as JSON
  downloadLogs() {
    if (typeof window === 'undefined') return;

    const blob = new Blob([JSON.stringify(this.history, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eigen-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearHistory() {
    this.history = [];
    this.notifyListeners();
  }

  // Subscribe to log updates
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Logger listener error:', e);
      }
    });
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.history.filter((entry) => entry.level === level);
  }

  // Get recent logs
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.history.slice(-count);
  }

  // Get error count
  getErrorCount(): number {
    return this.history.filter((entry) => entry.level === 'error').length;
  }

  // Get warning count
  getWarningCount(): number {
    return this.history.filter((entry) => entry.level === 'warn').length;
  }
}

export const logger = new Logger();
export type { LogLevel, LogContext, LogEntry };
