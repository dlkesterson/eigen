'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  configureS3,
  getS3Config,
  testS3Connection,
  uploadFileToS3,
  downloadFileFromS3,
  listS3Objects,
  deleteFileFromS3,
  syncFolderToS3,
  type S3ConfigPublic,
  type S3ConnectionStatus,
  type S3Object,
  type S3ListResult,
  type FolderSyncResult,
} from '@/lib/tauri-commands';
import { QUERY_KEYS } from '@/constants/routes';

// =============================================================================
// Queries
// =============================================================================

/**
 * Get current S3 configuration
 */
export function useS3Config() {
  return useQuery({
    queryKey: QUERY_KEYS.S3_CONFIG,
    queryFn: async () => {
      return await getS3Config();
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Test S3 connection status
 */
export function useS3ConnectionStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.S3_CONNECTION_STATUS,
    queryFn: async () => {
      return await testS3Connection();
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

/**
 * List S3 objects with optional prefix filtering
 */
export function useS3Objects(prefix?: string, delimiter?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.S3_OBJECTS(prefix),
    queryFn: async () => {
      return await listS3Objects(prefix, delimiter || '/');
    },
    enabled: true,
    staleTime: 10000, // 10 seconds
  });
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Configure S3 backend
 */
export function useConfigureS3() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      endpoint: string;
      region: string;
      bucketName: string;
      accessKeyId: string;
      secretAccessKey: string;
      pathPrefix?: string;
    }) => {
      return await configureS3(
        config.endpoint,
        config.region,
        config.bucketName,
        config.accessKeyId,
        config.secretAccessKey,
        config.pathPrefix
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.S3_CONFIG });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.S3_CONNECTION_STATUS });
      toast.success('S3 configuration saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to configure S3: ${error.message}`);
    },
  });
}

/**
 * Upload a file to S3
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { localPath: string; s3Key?: string }) => {
      return await uploadFileToS3(params.localPath, params.s3Key);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.S3_OBJECTS() });
      toast.success(`File uploaded: ${data.key}`);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

/**
 * Download a file from S3
 */
export function useDownloadFile() {
  return useMutation({
    mutationFn: async (params: { s3Key: string; localPath: string }) => {
      return await downloadFileFromS3(params.s3Key, params.localPath);
    },
    onSuccess: (_, variables) => {
      toast.success(`File downloaded: ${variables.s3Key}`);
    },
    onError: (error: Error) => {
      toast.error(`Download failed: ${error.message}`);
    },
  });
}

/**
 * Delete a file from S3
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (s3Key: string) => {
      return await deleteFileFromS3(s3Key);
    },
    onSuccess: (_, s3Key) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.S3_OBJECTS() });
      toast.success(`File deleted: ${s3Key}`);
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

/**
 * Sync a local folder to S3
 */
export function useSyncFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      localFolderPath: string;
      s3FolderPrefix: string;
      excludePatterns?: string[];
    }) => {
      return await syncFolderToS3(
        params.localFolderPath,
        params.s3FolderPrefix,
        params.excludePatterns
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.S3_OBJECTS() });
      toast.success(
        `Folder sync complete: ${result.uploaded} uploaded, ${result.skipped} skipped, ${result.failed} failed`
      );
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
}
