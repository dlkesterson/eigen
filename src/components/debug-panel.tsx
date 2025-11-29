'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bug,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Database,
  Clock,
  X,
} from 'lucide-react';
import { logger, LogEntry } from '@/lib/logger';
import { healthMonitor, HealthStatus } from '@/lib/health-monitor';
import { syncthingCircuitBreaker } from '@/lib/retry';

type LogFilter = 'all' | 'error' | 'warn' | 'info' | 'debug';

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [healthStatus, setHealthStatus] = useState<Map<string, HealthStatus>>(new Map());
  const [circuitState, setCircuitState] = useState(syncthingCircuitBreaker.getState());

  // Listen for Ctrl+Shift+D to toggle panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to log updates
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = logger.subscribe(() => {
        setLogs(logger.exportLogs());
      });
      // Initial load
      setLogs(logger.exportLogs());
      return () => {
        unsubscribe();
      };
    }
  }, [isOpen]);

  // Subscribe to health status updates
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = healthMonitor.subscribe((status) => {
        setHealthStatus(status);
      });
      return unsubscribe;
    }
  }, [isOpen]);

  // Update circuit breaker state periodically
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setCircuitState(syncthingCircuitBreaker.getState());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleClearLogs = useCallback(() => {
    logger.clearHistory();
    setLogs([]);
  }, []);

  const handleDownloadLogs = useCallback(() => {
    logger.downloadLogs();
  }, []);

  const handleResetCircuitBreaker = useCallback(() => {
    syncthingCircuitBreaker.reset();
    setCircuitState(syncthingCircuitBreaker.getState());
    logger.info('Circuit breaker manually reset');
  }, []);

  const filteredLogs = logs.filter((log) => filter === 'all' || log.level === filter);

  const stats = {
    total: logs.length,
    errors: logs.filter((l) => l.level === 'error').length,
    warnings: logs.filter((l) => l.level === 'warn').length,
  };

  const healthSummary = healthMonitor.getSummary();

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 z-50 h-12 w-12 rounded-full bg-indigo-600 shadow-lg hover:bg-indigo-700"
        title="Open Debug Panel (Ctrl+Shift+D)"
      >
        <Bug className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="flex h-[80vh] w-full max-w-6xl flex-col border-slate-700 bg-slate-900">
        <CardHeader className="shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="h-6 w-6 text-indigo-400" />
              <CardTitle className="text-white">Debug Panel</CardTitle>
              <Badge variant="outline" className="text-xs text-slate-400">
                Ctrl+Shift+D
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {stats.total} logs
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadLogs}
                className="text-slate-400 hover:text-white"
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearLogs}
                className="text-slate-400 hover:text-white"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 shrink-0 space-y-4 overflow-y-auto border-r border-slate-800 p-4">
            {/* Health Status */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">System Health</h3>
              <div className="space-y-2">
                {Array.from(healthStatus.entries()).map(([name, status]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded bg-slate-800 p-2"
                  >
                    <span className="truncate text-sm text-slate-300">{name}</span>
                    {status.healthy ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                  </div>
                ))}
                {healthStatus.size === 0 && (
                  <p className="text-xs text-slate-500 italic">No health checks registered</p>
                )}

                {/* Health Summary */}
                <div className="mt-2 flex items-center justify-between rounded border-t border-slate-700 bg-slate-800 p-2">
                  <span className="text-sm text-slate-300">Overall</span>
                  <Badge
                    variant={healthSummary.unhealthy === 0 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {healthSummary.healthy}/{healthSummary.total}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Circuit Breaker Status */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">Circuit Breaker</h3>
              <div className="space-y-2 rounded bg-slate-800 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">State</span>
                  <Badge
                    variant={circuitState.state === 'closed' ? 'default' : 'destructive'}
                    className="text-xs uppercase"
                  >
                    {circuitState.state}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Failures: {circuitState.failureCount}</span>
                  <span>Successes: {circuitState.successCount}</span>
                </div>
                {circuitState.state !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full text-xs"
                    onClick={handleResetCircuitBreaker}
                  >
                    Reset Circuit Breaker
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">Log Statistics</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Total Logs:</span>
                  <span className="font-mono">{stats.total}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Errors:</span>
                  <span className="font-mono">{stats.errors}</span>
                </div>
                <div className="flex justify-between text-yellow-400">
                  <span>Warnings:</span>
                  <span className="font-mono">{stats.warnings}</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">Filters</h3>
              <div className="space-y-1">
                {(['all', 'error', 'warn', 'info', 'debug'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilter(level)}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                      filter === level
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">Quick Actions</h3>
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-slate-700 text-xs"
                  onClick={() =>
                    logger.info('Test log entry', {
                      type: 'manual',
                    })
                  }
                >
                  <Activity className="mr-2 h-3 w-3" />
                  Test Log
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-slate-700 text-xs"
                  onClick={() => healthMonitor.runAllChecks()}
                >
                  <CheckCircle className="mr-2 h-3 w-3" />
                  Run Health Checks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-slate-700 text-xs"
                  onClick={() => {
                    console.log('Check Application tab in DevTools');
                    logger.info('Check Application tab in DevTools for IndexedDB');
                  }}
                >
                  <Database className="mr-2 h-3 w-3" />
                  View IndexedDB
                </Button>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="min-w-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-2 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No logs to display</div>
              ) : (
                [...filteredLogs].reverse().map((log, i) => {
                  const Icon =
                    {
                      debug: Activity,
                      info: CheckCircle,
                      warn: AlertCircle,
                      error: XCircle,
                    }[log.level] || Activity;

                  const color =
                    {
                      debug: 'text-cyan-400',
                      info: 'text-green-400',
                      warn: 'text-yellow-400',
                      error: 'text-red-400',
                    }[log.level] || 'text-slate-400';

                  return (
                    <div
                      key={`${log.timestamp.getTime()}-${i}`}
                      className="rounded border border-slate-700 bg-slate-800 p-3 transition-colors hover:border-slate-600"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`mt-0.5 h-4 w-4 ${color} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className={`font-medium ${color}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="flex items-center text-[10px] text-slate-500">
                              <Clock className="mr-1 h-3 w-3" />
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="wrap-break-word text-slate-300">{log.message}</p>
                          {log.context && Object.keys(log.context).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-slate-500 hover:text-slate-400">
                                Context
                              </summary>
                              <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-[10px] text-slate-400">
                                {JSON.stringify(log.context, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
