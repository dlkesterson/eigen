'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useBrowseVersions, useRestoreVersion, VersionEntry } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X,
  RefreshCw,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
  Calendar,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VersionTimelineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderPath: string;
  filePath: string; // Relative path within the folder
  fileName: string;
}

interface TimelinePoint {
  version: VersionEntry;
  date: Date;
  position: number; // 0-100 percentage position on timeline
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

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function VersionTimeline({
  open,
  onOpenChange,
  folderPath,
  filePath,
  fileName,
}: VersionTimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restoreVersion = useRestoreVersion();
  const { data: versions, isLoading, refetch } = useBrowseVersions(folderPath, filePath);

  // Filter to only file versions (not directories) and parse into timeline points
  const timelinePoints: TimelinePoint[] = useMemo(() => {
    if (!versions || !Array.isArray(versions)) return [];

    const fileVersions = (versions as VersionEntry[]).filter(
      (v) => v.type === 'file' && v.originalName === fileName
    );

    if (fileVersions.length === 0) return [];

    // Sort by version time (newest first)
    const sorted = [...fileVersions].sort((a, b) => {
      const timeA = a.modTime || 0;
      const timeB = b.modTime || 0;
      return timeB - timeA;
    });

    // Find time range
    const times = sorted.map((v) => v.modTime || 0).filter((t) => t > 0);
    if (times.length === 0) return [];

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const range = maxTime - minTime || 1; // Avoid division by zero

    return sorted.map((version) => {
      const time = version.modTime || minTime;
      const position = ((maxTime - time) / range) * 100;
      return {
        version,
        date: new Date(time * 1000),
        position: Math.max(0, Math.min(100, position)),
      };
    });
  }, [versions, fileName]);

  const selectedPoint = timelinePoints[selectedIndex];

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && timelinePoints.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setSelectedIndex((prev) => {
          const next = prev + 1;
          if (next >= timelinePoints.length) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1500);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, timelinePoints.length]);

  // Stop playing when component unmounts or closes
  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
    }
  }, [open]);

  const handleRestore = async () => {
    if (!selectedPoint) return;

    try {
      await restoreVersion.mutateAsync({
        folderPath,
        versionPath: filePath
          ? `${filePath}/${selectedPoint.version.name}`
          : selectedPoint.version.name,
        originalName: filePath ? `${filePath}/${fileName}` : fileName,
        overwrite: true,
      });
      toast.success(
        `Restored ${fileName} to version from ${formatDate(selectedPoint.version.modTime)}`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => Math.min(timelinePoints.length - 1, prev + 1));
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (selectedIndex >= timelinePoints.length - 1) {
      setSelectedIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="bg-background/95 border-border/50 flex max-h-[90vh] w-full max-w-4xl flex-col backdrop-blur-md">
        <CardHeader className="border-border/50 flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <History className="h-5 w-5 text-amber-500" />
            Version Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-6 overflow-hidden p-6">
          {/* File Info */}
          <div className="bg-secondary/50 flex items-center gap-3 rounded-lg p-4">
            <FileText className="h-8 w-8 text-blue-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{fileName}</p>
              <p className="text-muted-foreground truncate text-sm">{filePath || 'Root folder'}</p>
            </div>
            <div className="text-muted-foreground text-right text-sm">
              <p>{timelinePoints.length} versions</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : timelinePoints.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center">
              <Clock className="mb-4 h-16 w-16" />
              <p className="text-lg">No versions found for this file</p>
              <p className="mt-2 text-sm">
                Enable versioning on this folder to start keeping file history
              </p>
            </div>
          ) : (
            <>
              {/* Timeline Slider */}
              <div className="relative px-4">
                {/* Timeline track */}
                <div className="bg-secondary relative h-2 rounded-full">
                  {/* Progress fill */}
                  <div
                    className="absolute h-full rounded-full bg-linear-to-r from-amber-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${100 - (selectedPoint?.position || 0)}%` }}
                  />

                  {/* Version markers */}
                  {timelinePoints.map((point, index) => (
                    <button
                      key={index}
                      className={cn(
                        'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200',
                        'border-background rounded-full border-2',
                        index === selectedIndex
                          ? 'h-5 w-5 bg-amber-400 shadow-lg shadow-amber-500/50'
                          : 'bg-muted-foreground h-3 w-3 hover:bg-amber-300'
                      )}
                      style={{ left: `${100 - point.position}%` }}
                      onClick={() => {
                        setSelectedIndex(index);
                        setIsPlaying(false);
                      }}
                      title={formatDate(point.version.modTime)}
                    />
                  ))}
                </div>

                {/* Time labels */}
                <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                  <span>Oldest</span>
                  <span>Newest</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={selectedIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={togglePlayback}
                  disabled={timelinePoints.length <= 1}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={selectedIndex >= timelinePoints.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Selected Version Details */}
              {selectedPoint && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                        <Calendar className="h-6 w-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-amber-400">
                          Version {selectedIndex + 1} of {timelinePoints.length}
                        </p>
                        <p className="text-muted-foreground">
                          {formatDate(selectedPoint.version.modTime)}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {formatRelativeTime(selectedPoint.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedPoint.version.size !== undefined && (
                        <p className="text-muted-foreground">
                          {formatBytes(selectedPoint.version.size)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      className="bg-amber-500 text-amber-950 hover:bg-amber-400"
                      onClick={handleRestore}
                      disabled={restoreVersion.isPending}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore This Version
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
