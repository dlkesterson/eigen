import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeviceConfigSchema } from './schemas';
import type { DeviceConfig, AdvancedDeviceOptions, Config } from './types';

export function useDeviceId() {
  return useQuery({
    queryKey: ['deviceId'],
    queryFn: async () => {
      const id = await invoke<string>('get_device_id');
      return id;
    },
    staleTime: 60000,
  });
}

export function useDeviceConfig(deviceId: string) {
  return useQuery({
    queryKey: ['deviceConfig', deviceId],
    queryFn: async () => {
      const data = await invoke('get_device_config', { deviceId });
      return DeviceConfigSchema.parse(data);
    },
    enabled: !!deviceId,
    staleTime: 30000,
  });
}

export function useAddDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deviceId, name }: { deviceId: string; name: string }) => {
      await invoke('add_device', { deviceId, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useAddDeviceAdvanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: AdvancedDeviceOptions) => {
      await invoke('add_device_advanced', {
        deviceId: options.deviceId,
        name: options.name,
        addresses: options.addresses || null,
        compression: options.compression || null,
        introducer: options.introducer ?? null,
        autoAcceptFolders: options.autoAcceptFolders ?? null,
        maxSendKbps: options.maxSendKbps || null,
        maxRecvKbps: options.maxRecvKbps || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useRemoveDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      await invoke('remove_device', { deviceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function usePauseDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      await invoke('pause_device', { deviceId });
    },
    onMutate: async (deviceId) => {
      await queryClient.cancelQueries({ queryKey: ['config'] });
      const previousConfig = queryClient.getQueryData<Config>(['config']);
      queryClient.setQueryData<Config>(['config'], (old) => {
        if (!old?.devices) return old;
        return {
          ...old,
          devices: old.devices.map((device) =>
            device.deviceID === deviceId ? { ...device, paused: true } : device
          ),
        };
      });
      return { previousConfig };
    },
    onError: (_err, _deviceId, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(['config'], context.previousConfig);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useResumeDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      await invoke('resume_device', { deviceId });
    },
    onMutate: async (deviceId) => {
      await queryClient.cancelQueries({ queryKey: ['config'] });
      const previousConfig = queryClient.getQueryData<Config>(['config']);
      queryClient.setQueryData<Config>(['config'], (old) => {
        if (!old?.devices) return old;
        return {
          ...old,
          devices: old.devices.map((device) =>
            device.deviceID === deviceId ? { ...device, paused: false } : device
          ),
        };
      });
      return { previousConfig };
    },
    onError: (_err, _deviceId, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(['config'], context.previousConfig);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useUpdateDeviceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deviceId,
      updates,
    }: {
      deviceId: string;
      updates: Partial<DeviceConfig>;
    }) => {
      await invoke('update_device_config', { deviceId, updates });
    },
    onSuccess: (_data, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['deviceConfig', deviceId] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}
