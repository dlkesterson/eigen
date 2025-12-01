'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPendingDevices,
  getPendingFolders,
  getPendingRequests,
  acceptPendingDevice,
  dismissPendingDevice,
  acceptPendingFolder,
  dismissPendingFolder,
  type PendingDevice,
  type PendingFolder,
  type PendingRequests,
} from '@/lib/tauri-commands';
import { QUERY_KEYS } from '@/constants/routes';

/**
 * Hook to fetch all pending device connection requests
 */
export function usePendingDevices() {
  return useQuery<PendingDevice[]>({
    queryKey: [QUERY_KEYS.PENDING_DEVICES],
    queryFn: getPendingDevices,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch all pending folder share requests
 */
export function usePendingFolders() {
  return useQuery<PendingFolder[]>({
    queryKey: [QUERY_KEYS.PENDING_FOLDERS],
    queryFn: getPendingFolders,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

/**
 * Hook to fetch all pending requests (devices and folders) in one call
 */
export function usePendingRequests() {
  return useQuery<PendingRequests>({
    queryKey: [QUERY_KEYS.PENDING_REQUESTS],
    queryFn: getPendingRequests,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

/**
 * Hook to accept a pending device connection request
 */
export function useAcceptPendingDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deviceId, name }: { deviceId: string; name?: string }) => {
      await acceptPendingDevice(deviceId, name);
    },
    onSuccess: () => {
      // Invalidate pending requests and config queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_DEVICES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_REQUESTS] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

/**
 * Hook to dismiss/reject a pending device connection request
 */
export function useDismissPendingDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      await dismissPendingDevice(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_DEVICES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_REQUESTS] });
    },
  });
}

/**
 * Hook to accept a pending folder share request
 */
export function useAcceptPendingFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      deviceId,
      folderPath,
      folderLabel,
    }: {
      folderId: string;
      deviceId: string;
      folderPath: string;
      folderLabel?: string;
    }) => {
      await acceptPendingFolder(folderId, deviceId, folderPath, folderLabel);
    },
    onSuccess: () => {
      // Invalidate pending requests and config queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_FOLDERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_REQUESTS] });
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

/**
 * Hook to dismiss/reject a pending folder share request
 */
export function useDismissPendingFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, deviceId }: { folderId: string; deviceId: string }) => {
      await dismissPendingFolder(folderId, deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_FOLDERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PENDING_REQUESTS] });
    },
  });
}

/**
 * Combined hook for managing pending requests
 * Returns all pending requests data and mutation functions
 */
export function usePendingRequestsManager() {
  const pendingRequests = usePendingRequests();
  const acceptDevice = useAcceptPendingDevice();
  const dismissDevice = useDismissPendingDevice();
  const acceptFolder = useAcceptPendingFolder();
  const dismissFolder = useDismissPendingFolder();

  return {
    // Data
    pendingDevices: pendingRequests.data?.devices ?? [],
    pendingFolders: pendingRequests.data?.folders ?? [],
    isLoading: pendingRequests.isLoading,
    isError: pendingRequests.isError,
    error: pendingRequests.error,

    // Total count for badge display
    totalPending:
      (pendingRequests.data?.devices?.length ?? 0) + (pendingRequests.data?.folders?.length ?? 0),

    // Refetch
    refetch: pendingRequests.refetch,

    // Mutations
    acceptDevice,
    dismissDevice,
    acceptFolder,
    dismissFolder,
  };
}
