'use client';

import { invoke } from '@tauri-apps/api/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';
import { SyncthingEventSchema } from './schemas';
import type { SyncthingEvent } from './types';

export function useSyncthingEvents(options?: {
  onEvent?: (event: SyncthingEvent) => void;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const lastEventIdRef = useRef<number>(0);
  const [events, setEvents] = useState<SyncthingEvent[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const enabled = options?.enabled ?? true;

  const pollEvents = useCallback(async () => {
    if (!enabled) return;

    setIsPolling(true);

    try {
      const data = await invoke<SyncthingEvent[]>('get_events', {
        since: lastEventIdRef.current,
        limit: 100,
        timeout: 30,
      });

      if (Array.isArray(data) && data.length > 0) {
        const parsedEvents = data.map((e) => SyncthingEventSchema.parse(e));

        // Update last event ID
        const maxId = Math.max(...parsedEvents.map((e) => e.id));
        if (maxId > lastEventIdRef.current) {
          lastEventIdRef.current = maxId;
        }

        setEvents((prev) => [...prev.slice(-100), ...parsedEvents]);

        // Call event handler for each event
        parsedEvents.forEach((event) => {
          options?.onEvent?.(event);

          // Invalidate queries based on event type
          switch (event.type) {
            case 'StateChanged':
            case 'FolderCompletion':
            case 'FolderSummary':
              queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
              break;
            case 'DeviceConnected':
            case 'DeviceDisconnected':
            case 'DevicePaused':
            case 'DeviceResumed':
              queryClient.invalidateQueries({ queryKey: ['connections'] });
              break;
            case 'ConfigSaved':
              queryClient.invalidateQueries({ queryKey: ['config'] });
              break;
            case 'ItemStarted':
            case 'ItemFinished':
              queryClient.invalidateQueries({ queryKey: ['folderStatus'] });
              break;
          }
        });
      }
    } catch (error) {
      // Only log actual errors, not aborts or empty responses
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      const isNullish = error === null || error === undefined;
      const isEmptyError =
        error &&
        typeof error === 'object' &&
        !Array.isArray(error) &&
        (Object.keys(error as object).length === 0 || JSON.stringify(error) === '{}');

      // Also check for timeout errors which are expected during long polling
      const errorStr = String(error);
      const errorJson = JSON.stringify(error);
      const isTimeoutError = errorStr.includes('timeout') || errorStr.includes('Timeout');

      // Check for connection errors when Syncthing isn't running
      const isConnectionError =
        errorStr.includes('Connection') ||
        errorStr.includes('connection') ||
        errorStr.includes('ECONNREFUSED') ||
        errorStr.includes('NetworkError');

      // Check for parse errors (Syncthing returning unexpected data)
      const isParseError =
        errorJson.includes('ParseError') ||
        errorJson.includes('decoding') ||
        errorStr.includes('ParseError') ||
        errorStr.includes('decoding');

      // Skip logging for expected non-error conditions
      if (
        isAbortError ||
        isEmptyError ||
        isNullish ||
        isTimeoutError ||
        isConnectionError ||
        isParseError
      ) {
        return;
      }

      // Only log if it's a real unexpected error - use debug level to avoid noise
    } finally {
      setIsPolling(false);
    }
  }, [enabled, queryClient, options]);

  useEffect(() => {
    if (!enabled) return;

    // Copy ref value at effect start for cleanup
    const controllerRef = abortControllerRef;

    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      await pollEvents();
      // Schedule next poll
      timeoutId = setTimeout(poll, 1000);
    };

    poll();

    return () => {
      clearTimeout(timeoutId);
      controllerRef.current?.abort();
    };
  }, [enabled, pollEvents]);

  return {
    events,
    isPolling,
    clearEvents: () => setEvents([]),
  };
}
