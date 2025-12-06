import { invoke } from '@tauri-apps/api/core';
import { useQuery } from '@tanstack/react-query';
import { SystemLogsSchema } from './schemas';

export function useSystemLogs(since?: string) {
  return useQuery({
    queryKey: ['systemLogs', since],
    queryFn: async () => {
      const data = await invoke('get_system_logs', { since: since || null });
      return SystemLogsSchema.parse(data);
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
