/**
 * Conflict Space Visualization
 *
 * Shows file conflicts as 3D objects with version comparisons
 * and resolution options.
 */

'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  useConfig,
  useScanConflicts,
  useDeleteConflict,
  useResolveConflictKeepConflict,
} from '@/hooks/syncthing';
import type { ConflictFile, FolderConfig } from '@/hooks/syncthing';

// =============================================================================
// Types
// =============================================================================

interface ConflictData {
  id: string;
  fileName: string;
  folderPath: string;
  folderLabel: string;
  folderId: string;
  conflictPath: string;
  originalPath: string;
  versions: VersionData[];
  position: [number, number, number];
}

interface VersionData {
  deviceId: string;
  deviceName: string;
  modified: Date;
  size: number;
}

// =============================================================================
// Hook to fetch conflicts across all folders
// =============================================================================

function useAllConflicts() {
  const { data: config, isLoading: configLoading } = useConfig();

  // Get all folder paths from config
  const folders = useMemo(() => {
    if (!config?.folders) return [];
    return config.folders.filter((f: FolderConfig) => f.path && !f.paused);
  }, [config?.folders]);

  // Create queries for each folder
  // We'll scan the first few folders to avoid too many parallel requests
  const folderQueries = folders.slice(0, 10).map((folder: FolderConfig) => ({
    folder,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    query: useScanConflicts(folder.path || ''),
  }));

  // Combine all conflicts with position information
  const allConflicts = useMemo(() => {
    const conflicts: ConflictData[] = [];
    let index = 0;

    for (const { folder, query } of folderQueries) {
      if (query.data && Array.isArray(query.data)) {
        for (const conflict of query.data as ConflictFile[]) {
          // Calculate position in a grid layout
          const col = index % 4;
          const row = Math.floor(index / 4);
          const x = (col - 1.5) * 5;
          const z = row * 5;

          conflicts.push({
            id: `${folder.id}-${conflict.name}`,
            fileName: conflict.original,
            folderPath: folder.path || '',
            folderLabel: folder.label || folder.id,
            folderId: folder.id,
            conflictPath: conflict.name,
            originalPath: conflict.original,
            versions: [
              {
                deviceId: 'local',
                deviceName: 'Original',
                modified: new Date((conflict.modTime || 0) * 1000),
                size: conflict.size,
              },
              {
                deviceId: 'conflict',
                deviceName: 'Conflict Version',
                modified: new Date((conflict.modTime || 0) * 1000),
                size: conflict.size,
              },
            ],
            position: [x, 0, z] as [number, number, number],
          });
          index++;
        }
      }
    }

    return conflicts;
  }, [folderQueries]);

  const isLoading = configLoading || folderQueries.some((fq) => fq.query.isLoading);
  const isError = folderQueries.some((fq) => fq.query.isError);

  // Refetch all conflict queries
  const refetch = useCallback(() => {
    for (const { query } of folderQueries) {
      query.refetch();
    }
  }, [folderQueries]);

  return {
    conflicts: allConflicts,
    isLoading,
    isError,
    refetch,
    folders,
  };
}

// =============================================================================
// Conflict Node Component
// =============================================================================

interface ConflictNodeProps {
  data: ConflictData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onResolveKeepOriginal?: (data: ConflictData) => void;
  onResolveKeepConflict?: (data: ConflictData) => void;
  visible?: boolean;
}

function ConflictNode({
  data,
  isSelected,
  onSelect,
  onResolveKeepOriginal,
  onResolveKeepConflict,
  visible = true,
}: ConflictNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing glow effect
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(1 + pulse);
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(data.id);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <group position={data.position}>
      {/* Main conflict indicator */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={isSelected ? 0.6 : hovered ? 0.4 : 0.2}
          roughness={0.3}
          metalness={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Warning ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.7, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* File name label */}
      <Text position={[0, -2, 0]} fontSize={0.4} color="white" anchorX="center" anchorY="top">
        {data.fileName}
      </Text>

      {/* Folder path */}
      <Text position={[0, -2.5, 0]} fontSize={0.25} color="#6b7280" anchorX="center" anchorY="top">
        {data.folderLabel}
      </Text>

      {/* Version indicators */}
      {data.versions.map((version, index) => {
        const angle = (index / data.versions.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={version.deviceId} position={[x, 0, z]}>
            <mesh>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
            </mesh>
            <Text
              position={[0, -0.8, 0]}
              fontSize={0.25}
              color="#94a3b8"
              anchorX="center"
              anchorY="top"
            >
              {version.deviceName}
            </Text>

            {/* Connection line to center */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([0, 0, 0, -x, 0, -z]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#6366f1" transparent opacity={0.5} />
            </line>
          </group>
        );
      })}

      {/* Hover/Selection info panel */}
      {(hovered || isSelected) && visible && (
        <Html position={[0, 2, 0]} center style={{ pointerEvents: isSelected ? 'auto' : 'none' }}>
          <div className="min-w-72 rounded-xl border border-red-500/30 bg-black/90 px-4 py-3 text-white backdrop-blur-sm">
            <div className="mb-2 font-medium text-red-400">⚠️ Conflict Detected</div>
            <div className="mb-3 text-sm">
              <div>
                <strong>{data.fileName}</strong>
              </div>
              <div className="text-gray-400">{data.folderLabel}</div>
              <div className="mt-1 text-xs text-gray-500">{data.conflictPath}</div>
            </div>
            <div className="space-y-2 text-xs">
              {data.versions.map((v) => (
                <div key={v.deviceId} className="flex items-center justify-between">
                  <span className="text-blue-400">{v.deviceName}</span>
                  <span className="text-gray-400">
                    {v.modified.getTime() > 0
                      ? `${v.modified.toLocaleDateString()} ${v.modified.toLocaleTimeString()}`
                      : 'Unknown'}{' '}
                    · {formatSize(v.size)}
                  </span>
                </div>
              ))}
            </div>
            {isSelected && (
              <div className="mt-3 flex gap-2 border-t border-gray-700 pt-3">
                <button
                  onClick={() => onResolveKeepOriginal?.(data)}
                  className="flex-1 rounded bg-green-600/20 px-3 py-1.5 text-xs text-green-400 transition-colors hover:bg-green-600/30"
                >
                  Keep Original
                </button>
                <button
                  onClick={() => onResolveKeepConflict?.(data)}
                  className="flex-1 rounded bg-blue-600/20 px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-600/30"
                >
                  Keep Conflict
                </button>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function NoConflicts() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.7}
          wireframe
        />
      </mesh>
      <Text position={[0, -3, 0]} fontSize={0.6} color="#22c55e" anchorX="center" anchorY="top">
        No Conflicts
      </Text>
      <Text position={[0, -4, 0]} fontSize={0.35} color="#6b7280" anchorX="center" anchorY="top">
        All files are in sync
      </Text>
    </group>
  );
}

// =============================================================================
// Loading State
// =============================================================================

function LoadingState() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.7;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <torusGeometry args={[1.5, 0.3, 16, 32]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.3}
          wireframe
        />
      </mesh>
      <Text position={[0, -3, 0]} fontSize={0.5} color="#6366f1" anchorX="center" anchorY="top">
        Scanning for conflicts...
      </Text>
    </group>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface ConflictSpaceVisualizationProps {
  selectedFiles?: string[];
  visible?: boolean;
}

export function ConflictSpaceVisualization({
  selectedFiles = [],
  visible = true,
}: ConflictSpaceVisualizationProps) {
  const [selected, setSelected] = useState<string | null>(null);

  // Use real conflict data from Syncthing
  const { conflicts, isLoading, refetch } = useAllConflicts();

  // Mutation hooks for resolving conflicts
  const deleteConflict = useDeleteConflict();
  const resolveKeepConflict = useResolveConflictKeepConflict();

  const handleSelect = (id: string) => {
    setSelected(selected === id ? null : id);
  };

  // Keep original file (delete the conflict file)
  const handleResolveKeepOriginal = useCallback(
    (data: ConflictData) => {
      deleteConflict.mutate(
        { folderPath: data.folderPath, conflictFile: data.conflictPath },
        {
          onSuccess: () => {
            setSelected(null);
            refetch();
          },
        }
      );
    },
    [deleteConflict, refetch]
  );

  // Keep conflict file (replace original with conflict)
  const handleResolveKeepConflict = useCallback(
    (data: ConflictData) => {
      resolveKeepConflict.mutate(
        {
          folderPath: data.folderPath,
          originalFile: data.originalPath,
          conflictFile: data.conflictPath,
        },
        {
          onSuccess: () => {
            setSelected(null);
            refetch();
          },
        }
      );
    },
    [resolveKeepConflict, refetch]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (conflicts.length === 0) {
    return <NoConflicts />;
  }

  // Calculate grid size based on number of conflicts
  const gridSize = Math.max(20, Math.ceil(Math.sqrt(conflicts.length) * 5) + 10);

  return (
    <group>
      {/* Grid floor */}
      <group position={[0, -3, 0]}>
        <gridHelper args={[gridSize, gridSize, '#3b0a0a', '#1a0505']} />
      </group>

      {/* Conflict nodes */}
      {conflicts.map((conflict) => (
        <ConflictNode
          key={conflict.id}
          data={conflict}
          isSelected={selected === conflict.id || selectedFiles.includes(conflict.fileName)}
          onSelect={handleSelect}
          onResolveKeepOriginal={handleResolveKeepOriginal}
          onResolveKeepConflict={handleResolveKeepConflict}
          visible={visible}
        />
      ))}

      {/* Header */}
      <Text position={[0, 5, 0]} fontSize={0.8} color="#ef4444" anchorX="center" anchorY="bottom">
        {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} Found
      </Text>

      {/* Mutation status indicator */}
      {(deleteConflict.isPending || resolveKeepConflict.isPending) && (
        <Text position={[0, 4, 0]} fontSize={0.4} color="#fbbf24" anchorX="center" anchorY="bottom">
          Resolving conflict...
        </Text>
      )}
    </group>
  );
}

export default ConflictSpaceVisualization;
