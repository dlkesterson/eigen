'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAppStore } from '@/store';

type LogFilter = 'all' | 'error' | 'warn' | 'info' | 'debug';

export default function DebugPanel() {
  const { debugPanelOpen: isOpen, setDebugPanelOpen, toggleDebugPanel } = useAppStore();
  const [logs, setLogs] = useState<LogEntry[]>(() => logger.exportLogs());
  const [filter, setFilter] = useState<LogFilter>('all');
  const [healthStatus, setHealthStatus] = useState<Map<string, HealthStatus>>(new Map());
  const [circuitState, setCircuitState] = useState(syncthingCircuitBreaker.getState());

  // Listen for Ctrl+Shift+D to toggle panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDebugPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugPanel]);

  // Subscribe to log updates
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = logger.subscribe(() => {
      setLogs(logger.exportLogs());
    });
    return () => {
      unsubscribe();
    };
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
    return null;
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="border-border bg-card flex h-[80vh] w-full max-w-6xl flex-col">
        <CardHeader className="border-border shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="text-primary h-6 w-6" />
              <CardTitle className="text-foreground">Debug Panel</CardTitle>
              <Badge variant="outline" className="text-muted-foreground text-xs">
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
                className="text-muted-foreground hover:text-foreground"
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearLogs}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDebugPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="border-border w-64 shrink-0 space-y-4 overflow-y-auto border-r p-4">
            {/* Health Status */}
            <div>
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">System Health</h3>
              <div className="space-y-2">
                {Array.from(healthStatus.entries()).map(([name, status]) => (
                  <div
                    key={name}
                    className="bg-secondary flex items-center justify-between rounded p-2"
                  >
                    <span className="text-foreground/80 truncate text-sm">{name}</span>
                    {status.healthy ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                  </div>
                ))}
                {healthStatus.size === 0 && (
                  <p className="text-muted-foreground text-xs italic">
                    No health checks registered
                  </p>
                )}

                {/* Health Summary */}
                <div className="border-border bg-secondary mt-2 flex items-center justify-between rounded border-t p-2">
                  <span className="text-foreground/80 text-sm">Overall</span>
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
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">Circuit Breaker</h3>
              <div className="bg-secondary space-y-2 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/80 text-sm">State</span>
                  <Badge
                    variant={circuitState.state === 'closed' ? 'default' : 'destructive'}
                    className="text-xs uppercase"
                  >
                    {circuitState.state}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
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
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">Log Statistics</h3>
              <div className="space-y-1 text-sm">
                <div className="text-foreground/80 flex justify-between">
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
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">Filters</h3>
              <div className="space-y-1">
                {(['all', 'error', 'warn', 'info', 'debug'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilter(level)}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                      filter === level
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">Quick Actions</h3>
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border w-full justify-start text-xs"
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
                  className="border-border w-full justify-start text-xs"
                  onClick={() => healthMonitor.runAllChecks()}
                >
                  <CheckCircle className="mr-2 h-3 w-3" />
                  Run Health Checks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border w-full justify-start text-xs"
                  onClick={() => {
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
                <div className="text-muted-foreground py-8 text-center">No logs to display</div>
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
                    }[log.level] || 'text-muted-foreground';

                  return (
                    <div
                      key={`${log.timestamp.getTime()}-${i}`}
                      className="border-border bg-secondary hover:border-border/80 rounded border p-3 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`mt-0.5 h-4 w-4 ${color} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className={`font-medium ${color}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-muted-foreground flex items-center text-[10px]">
                              <Clock className="mr-1 h-3 w-3" />
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-foreground/80 wrap-break-word">{log.message}</p>
                          {log.context && Object.keys(log.context).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-muted-foreground hover:text-muted-foreground/80 cursor-pointer">
                                Context
                              </summary>
                              <pre className="bg-background text-muted-foreground mt-1 overflow-x-auto rounded p-2 text-[10px]">
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
