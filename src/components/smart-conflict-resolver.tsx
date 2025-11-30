'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useScanConflicts,
  useDeleteConflict,
  useResolveConflictKeepConflict,
  ConflictFile,
} from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  X,
  RefreshCw,
  Trash2,
  Check,
  FileWarning,
  Clock,
  HardDrive,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowRight,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { toast } from 'sonner';

interface SmartConflictResolverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderPath: string;
  folderLabel?: string;
}

interface DiffSummary {
  summary: string;
  additions: number;
  deletions: number;
  modifications: number;
  keyChanges: string[];
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Unknown';
  try {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

// AI Worker interface for diff analysis
let aiWorker: Worker | null = null;
let pendingDiffCallbacks: Map<string, (result: DiffSummary) => void> = new Map();

function getAIWorker(): Worker | null {
  if (typeof window === 'undefined') return null;

  if (!aiWorker) {
    try {
      aiWorker = new Worker(new URL('@/workers/ai.worker.ts', import.meta.url), {
        type: 'module',
      });

      aiWorker.onmessage = (event) => {
        const { id, type, payload } = event.data;
        if (type === 'diff' && id && pendingDiffCallbacks.has(id)) {
          const callback = pendingDiffCallbacks.get(id)!;
          pendingDiffCallbacks.delete(id);
          callback(payload as DiffSummary);
        }
      };
    } catch {
      console.warn('Failed to create AI worker');
      return null;
    }
  }

  return aiWorker;
}

async function analyzeDiffWithAI(
  contentA: string,
  contentB: string,
  labelA: string,
  labelB: string
): Promise<DiffSummary> {
  const worker = getAIWorker();

  if (!worker) {
    // Fallback to simple diff if worker not available
    return simpleLocalDiff(contentA, contentB, labelA, labelB);
  }

  return new Promise((resolve) => {
    const id = `diff-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Set timeout in case worker doesn't respond
    const timeout = setTimeout(() => {
      pendingDiffCallbacks.delete(id);
      resolve(simpleLocalDiff(contentA, contentB, labelA, labelB));
    }, 5000);

    pendingDiffCallbacks.set(id, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });

    worker.postMessage({
      id,
      type: 'diff',
      payload: { contentA, contentB, labelA, labelB },
    });
  });
}

function simpleLocalDiff(
  contentA: string,
  contentB: string,
  labelA: string,
  labelB: string
): DiffSummary {
  const linesA = contentA.split('\n').length;
  const linesB = contentB.split('\n').length;
  const lineDiff = linesB - linesA;

  return {
    summary: `${labelB} has ${Math.abs(lineDiff)} ${lineDiff > 0 ? 'more' : 'fewer'} lines than ${labelA}.`,
    additions: lineDiff > 0 ? lineDiff : 0,
    deletions: lineDiff < 0 ? Math.abs(lineDiff) : 0,
    modifications: 0,
    keyChanges: [],
  };
}

function SmartConflictCard({
  conflict,
  folderPath,
  onResolve,
}: {
  conflict: ConflictFile;
  folderPath: string;
  onResolve: () => void;
}) {
  const deleteConflict = useDeleteConflict();
  const keepConflict = useResolveConflictKeepConflict();
  const [isResolving, setIsResolving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [diffSummary, setDiffSummary] = useState<DiffSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Check if file is text-based (can be diffed)
  const isTextFile = useCallback(() => {
    const textExtensions = [
      '.txt',
      '.md',
      '.json',
      '.js',
      '.ts',
      '.tsx',
      '.jsx',
      '.html',
      '.css',
      '.scss',
      '.yaml',
      '.yml',
      '.xml',
      '.py',
      '.rb',
      '.go',
      '.rs',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.java',
      '.kt',
      '.swift',
      '.sh',
      '.bash',
      '.zsh',
      '.conf',
      '.config',
      '.ini',
      '.env',
      '.gitignore',
    ];
    const name = conflict.original.toLowerCase();
    return textExtensions.some((ext) => name.endsWith(ext));
  }, [conflict.original]);

  const handleAnalyzeDiff = async () => {
    if (!isTextFile()) {
      toast.error('Diff analysis is only available for text files');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Note: In a real implementation, we would read the file contents
      // via a Tauri command. For now, we'll show a placeholder.
      // The actual implementation would look like:
      // const originalContent = await invoke('read_file_content', { path: `${folderPath}/${conflict.original}` });
      // const conflictContent = await invoke('read_file_content', { path: `${folderPath}/${conflict.name}` });

      // Simulated analysis with placeholder content
      setDiffSummary({
        summary: 'Click "Analyze Differences" after enabling file reading in the backend.',
        additions: 0,
        deletions: 0,
        modifications: 0,
        keyChanges: [
          'File reading requires backend support',
          'AI analysis will compare the contents once available',
        ],
      });
    } catch {
      toast.error('Failed to analyze differences');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeepOriginal = async () => {
    setIsResolving(true);
    try {
      await deleteConflict.mutateAsync({
        folderPath,
        conflictFile: conflict.name,
      });
      toast.success('Conflict resolved - kept original file');
      onResolve();
    } catch {
      toast.error('Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  const handleKeepConflict = async () => {
    setIsResolving(true);
    try {
      await keepConflict.mutateAsync({
        folderPath,
        originalFile: conflict.original,
        conflictFile: conflict.name,
      });
      toast.success('Conflict resolved - kept newer version');
      onResolve();
    } catch {
      toast.error('Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5">
      {/* Header */}
      <div
        className="flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-amber-500/10"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <FileWarning className="h-5 w-5 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-foreground truncate font-medium">{conflict.original}</p>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                Conflict: {conflict.name}
              </p>
            </div>
            <button className="text-muted-foreground hover:text-foreground p-1 transition-colors">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatBytes(conflict.size)}
            </span>
            {conflict.modTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(conflict.modTime)}
              </span>
            )}
            {isTextFile() && (
              <span className="flex items-center gap-1 text-indigo-400">
                <FileText className="h-3 w-3" />
                Text file
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-4 border-t border-amber-500/20 p-4">
          {/* AI Analysis Section */}
          {isTextFile() && (
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-medium text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                  AI Diff Analysis
                </h4>
                {!diffSummary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeDiff();
                    }}
                    disabled={isAnalyzing}
                    className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    Analyze Differences
                  </Button>
                )}
              </div>

              {diffSummary ? (
                <div className="space-y-3">
                  <p className="text-foreground/80 text-sm">{diffSummary.summary}</p>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3">
                    {diffSummary.additions > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <Plus className="h-3 w-3" />
                        {diffSummary.additions} additions
                      </span>
                    )}
                    {diffSummary.deletions > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <Minus className="h-3 w-3" />
                        {diffSummary.deletions} deletions
                      </span>
                    )}
                    {diffSummary.modifications > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <Edit3 className="h-3 w-3" />
                        {diffSummary.modifications} modifications
                      </span>
                    )}
                  </div>

                  {/* Key changes */}
                  {diffSummary.keyChanges.length > 0 && (
                    <div className="mt-2">
                      <p className="text-muted-foreground mb-1 text-xs">Key changes:</p>
                      <ul className="space-y-1">
                        {diffSummary.keyChanges.map((change, i) => (
                          <li
                            key={i}
                            className="text-muted-foreground flex items-start gap-2 text-xs"
                          >
                            <ArrowRight className="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : !isAnalyzing ? (
                <p className="text-muted-foreground text-xs">
                  Click "Analyze Differences" to get an AI-powered summary of the changes between
                  versions.
                </p>
              ) : (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing differences...
                </div>
              )}
            </div>
          )}

          {/* Resolution buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleKeepOriginal();
              }}
              disabled={isResolving}
              className="flex-1 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              {isResolving ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              Keep Original
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleKeepConflict();
              }}
              disabled={isResolving}
              className="flex-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              {isResolving ? (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              Keep Conflict Version
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SmartConflictResolver({
  open,
  onOpenChange,
  folderId,
  folderPath,
  folderLabel,
}: SmartConflictResolverProps) {
  const { data: conflicts, isLoading, refetch, isRefetching } = useScanConflicts(folderPath);

  if (!open) return null;

  const conflictList = conflicts || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="bg-background/95 border-border/50 flex max-h-[85vh] w-full max-w-3xl flex-col backdrop-blur-md">
        <CardHeader className="border-border/50 flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Smart Conflict Resolution
            {conflictList.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                {conflictList.length}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw className={cn('h-4 w-4', (isLoading || isRefetching) && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <p className="text-muted-foreground text-sm">
              Folder: <span className="text-foreground">{folderLabel || folderId}</span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{folderPath}</p>
          </div>

          {/* AI Feature Banner */}
          <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
            <div className="flex items-center gap-2 text-sm text-indigo-400">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">AI-Powered Analysis</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Expand a conflict to analyze differences between file versions with AI.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4 text-sm">Scanning for conflicts...</p>
            </div>
          ) : conflictList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-foreground mt-4 text-lg font-medium">No Conflicts</p>
              <p className="text-muted-foreground mt-2 text-sm">
                This folder has no file conflicts to resolve.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {conflictList.length} conflict
                {conflictList.length !== 1 ? 's' : ''} found. Click to expand and use AI analysis.
              </p>
              {conflictList.map((conflict) => (
                <SmartConflictCard
                  key={conflict.name}
                  conflict={conflict}
                  folderPath={folderPath}
                  onResolve={() => refetch()}
                />
              ))}
            </div>
          )}
        </CardContent>

        <div className="border-border/50 border-t p-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">
              Conflicts occur when the same file is modified on multiple devices.
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
