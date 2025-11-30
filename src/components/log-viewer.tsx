'use client';

import { useState, useEffect, useRef } from 'react';
import { useSystemLogs } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RefreshCw,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  ChevronDown,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LogEntry {
  when?: string;
  level?: string;
  message?: string;
}

type LogLevel = 'all' | 'error' | 'warning' | 'info' | 'debug';

const levelConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  debug: { icon: Bug, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  verbose: { icon: Bug, color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

export function LogViewer({ open, onOpenChange }: LogViewerProps) {
  const [filter, setFilter] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, refetch, isRefetching } = useSystemLogs();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!open) return null;

  const logEntries = (logs as LogEntry[] | undefined) || [];
  const filteredLogs = logEntries.filter((log: LogEntry) => {
    if (filter === 'all') return true;
    const level = log.level?.toLowerCase() || 'info';
    return level === filter;
  });

  const getLogLevel = (log: { level?: string; message?: string }): string => {
    if (log.level) return log.level.toLowerCase();
    // Try to infer from message
    const msg = log.message?.toLowerCase() || '';
    if (msg.includes('error') || msg.includes('failed')) return 'error';
    if (msg.includes('warning') || msg.includes('warn')) return 'warning';
    return 'info';
  };

  const handleExport = () => {
    if (!logEntries.length) return;
    const content = logEntries
      .map((log: LogEntry) => `[${log.when || ''}] [${log.level || 'INFO'}] ${log.message || ''}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncthing-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="bg-background/95 border-border/50 flex max-h-[80vh] w-full max-w-4xl flex-col backdrop-blur-md">
        <CardHeader className="border-border/50 flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Bug className="text-muted-foreground h-5 w-5" />
            System Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              disabled={!logEntries.length}
              title="Export logs"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="border-border/50 flex flex-wrap items-center gap-4 border-b p-4">
          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Level:</span>
            <div className="flex gap-1">
              {(['all', 'error', 'warning', 'info', 'debug'] as LogLevel[]).map((level) => (
                <Button
                  key={level}
                  variant={filter === level ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(level)}
                  className={cn(
                    'text-xs capitalize',
                    filter === level && 'bg-primary text-primary-foreground'
                  )}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Auto-scroll toggle */}
          <div className="ml-auto flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="border-border rounded"
              />
              <span className="text-muted-foreground text-sm">Auto-scroll</span>
            </label>
          </div>
        </div>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div ref={logContainerRef} className="h-[400px] overflow-y-auto font-mono text-xs">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <RefreshCw className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                <Info className="mb-2 h-8 w-8" />
                <p>No logs to display</p>
                <p className="text-xs">Logs will appear here when Syncthing generates them</p>
              </div>
            ) : (
              <div className="divide-border/30 divide-y">
                {filteredLogs.map((log, index) => {
                  const level = getLogLevel(log);
                  const config = levelConfig[level] || levelConfig.info;
                  const Icon = config.icon;

                  return (
                    <div
                      key={index}
                      className={cn(
                        'hover:bg-muted/30 flex items-start gap-2 p-2 transition-colors',
                        config.bg
                      )}
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground mb-0.5 flex items-center gap-2 text-[10px]">
                          <span>{log.when ? new Date(log.when).toLocaleTimeString() : ''}</span>
                          <span className={cn('font-medium uppercase', config.color)}>{level}</span>
                        </div>
                        <p className="text-foreground break-all whitespace-pre-wrap">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>

        <div className="border-border/50 text-muted-foreground flex items-center justify-between border-t p-3 text-xs">
          <span>
            Showing {filteredLogs.length} of {logEntries.length} log entries
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
              }
            }}
          >
            <ChevronDown className="mr-1 h-3 w-3" />
            Jump to bottom
          </Button>
        </div>
      </Card>
    </div>
  );
}
