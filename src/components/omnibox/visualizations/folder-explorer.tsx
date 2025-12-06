/**
 * Folder Explorer Visualization
 *
 * Shows folder structure as nested 3D blocks in a treemap-style layout.
 * Color indicates sync status, size indicates storage usage.
 * Includes predictive sync badge for folders being prioritized.
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useConfig } from '@/hooks/syncthing';
import { useFolderStatuses } from '@/hooks/syncthing/folders';
import { usePredictiveSync } from '@/hooks/usePredictiveSync';

// =============================================================================
// Types
// =============================================================================

interface FolderBlockData {
  id: string;
  label: string;
  path: string;
  position: [number, number, number];
  size: [number, number, number];
  status: 'synced' | 'syncing' | 'error' | 'paused' | 'idle';
  completion: number;
  localBytes: number;
  globalBytes: number;
  predictiveActive?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  synced: '#22c55e', // Green
  syncing: '#3b82f6', // Blue
  error: '#ef4444', // Red
  paused: '#6b7280', // Gray
  idle: '#a855f7', // Purple
};

// =============================================================================
// Folder Block Component
// =============================================================================

interface FolderBlockProps {
  data: FolderBlockData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  visible?: boolean;
}

function FolderBlock({ data, isSelected, onSelect, visible = true }: FolderBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = STATUS_COLORS[data.status] || STATUS_COLORS.idle;

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing effect for syncing folders
      if (data.status === 'syncing') {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
        meshRef.current.scale.setScalar(pulse);
      }

      // Hover/selection effect
      const targetY = hovered || isSelected ? data.position[1] + 0.3 : data.position[1];
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(data.id);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={data.position}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={data.size} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={hovered || isSelected ? 0.9 : 0.7}
          roughness={0.3}
          metalness={0.5}
          emissive={color}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0.1}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[data.position[0], data.position[1] + data.size[1] / 2 + 0.5, data.position[2]]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="bottom"
      >
        {data.label}
      </Text>

      {/* Progress bar for syncing folders */}
      {data.status === 'syncing' && data.completion < 100 && (
        <mesh
          position={[
            data.position[0] - data.size[0] / 2 + (data.size[0] * data.completion) / 200,
            data.position[1] - data.size[1] / 2 - 0.2,
            data.position[2] + data.size[2] / 2 + 0.1,
          ]}
        >
          <boxGeometry args={[(data.size[0] * data.completion) / 100, 0.1, 0.05]} />
          <meshBasicMaterial color="#60a5fa" />
        </mesh>
      )}

      {/* Hover info */}
      {hovered && visible && (
        <Html
          position={[data.position[0], data.position[1] + data.size[1], data.position[2]]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="rounded-lg bg-black/80 px-3 py-2 text-xs whitespace-nowrap text-white backdrop-blur-sm">
            <div className="font-medium">{data.label}</div>
            <div className="text-gray-400">{data.path}</div>
            <div className="mt-1 flex gap-3">
              <span>Status: {data.status}</span>
              {data.completion < 100 && <span>{data.completion.toFixed(0)}%</span>}
            </div>
          </div>
        </Html>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh
          position={[
            data.position[0],
            data.position[1] - data.size[1] / 2 - 0.05,
            data.position[2],
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[
              Math.max(data.size[0], data.size[2]) * 0.7,
              Math.max(data.size[0], data.size[2]) * 0.8,
              32,
            ]}
          />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Predictive Sync Badge */}
      {data.predictiveActive && (
        <Html
          position={[
            data.position[0] + data.size[0] / 2 - 0.3,
            data.position[1] + data.size[1] / 2 + 0.2,
            data.position[2] + data.size[2] / 2 - 0.3,
          ]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center gap-1 rounded-full bg-purple-500/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg backdrop-blur-sm">
            <span className="animate-pulse">⚡</span>
            <span>Predictive</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// Grid Floor
// =============================================================================

function GridFloor() {
  return (
    <group position={[0, -3, 0]}>
      <gridHelper args={[30, 30, '#1e3a5f', '#0a1628']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color="#050810" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface FolderExplorerVisualizationProps {
  selectedFolders?: string[];
  visible?: boolean;
}

export function FolderExplorerVisualization({
  selectedFolders = [],
  visible = true,
}: FolderExplorerVisualizationProps) {
  const { data: config } = useConfig();
  const [localSelected, setLocalSelected] = useState<string[]>(selectedFolders);
  const { foldersToSyncNow, isEnabled: predictiveEnabled } = usePredictiveSync();

  // Get folder IDs
  const folderIds = useMemo(() => {
    return config?.folders?.map((f: { id: string }) => f.id) || [];
  }, [config?.folders]);

  // Get statuses for all folders
  const folderStatuses = useFolderStatuses(folderIds);

  // Build folder block data
  const folderBlocks = useMemo<FolderBlockData[]>(() => {
    if (!config?.folders) return [];

    const folders = config.folders as Array<{
      id: string;
      label?: string;
      path?: string;
      paused?: boolean;
    }>;

    // Grid layout
    const cols = Math.ceil(Math.sqrt(folders.length));
    const spacing = 4;

    return folders.map((folder, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      // Center the grid
      const offsetX = ((cols - 1) * spacing) / 2;
      const offsetZ = ((Math.ceil(folders.length / cols) - 1) * spacing) / 2;

      const statusData = folderStatuses[folder.id]?.data;

      let status: FolderBlockData['status'] = 'idle';
      let completion = 100;
      let localBytes = 0;
      let globalBytes = 0;

      if (folder.paused) {
        status = 'paused';
      } else if (statusData) {
        localBytes = statusData.localBytes || 0;
        globalBytes = statusData.globalBytes || 0;
        completion = globalBytes > 0 ? (localBytes / globalBytes) * 100 : 100;

        if (statusData.errors && (statusData.errors as number) > 0) {
          status = 'error';
        } else if (statusData.state === 'syncing') {
          status = 'syncing';
        } else if (statusData.state === 'idle' && completion >= 99.9) {
          status = 'synced';
        } else {
          status = 'syncing';
        }
      }

      // Size based on storage (normalized)
      const sizeScale = Math.max(0.5, Math.min(2, Math.log10(Math.max(globalBytes, 1)) / 10));

      // Check if this folder is being predictively boosted
      const isPredictiveActive = !!(
        predictiveEnabled &&
        folder.path &&
        foldersToSyncNow.includes(folder.path)
      );

      return {
        id: folder.id,
        label: folder.label || folder.id,
        path: folder.path || '',
        position: [col * spacing - offsetX, 0, row * spacing - offsetZ] as [number, number, number],
        size: [2 * sizeScale, 1 * sizeScale, 2 * sizeScale] as [number, number, number],
        status,
        completion,
        localBytes,
        globalBytes,
        predictiveActive: isPredictiveActive,
      };
    });
  }, [config, folderStatuses, foldersToSyncNow, predictiveEnabled]);

  const handleSelect = (id: string) => {
    setLocalSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  return (
    <group>
      {/* Grid floor */}
      <GridFloor />

      {/* Folder blocks */}
      {folderBlocks.map((folder) => (
        <FolderBlock
          key={folder.id}
          data={folder}
          isSelected={localSelected.includes(folder.id) || selectedFolders.includes(folder.id)}
          onSelect={handleSelect}
          visible={visible}
        />
      ))}

      {/* Empty state */}
      {folderBlocks.length === 0 && (
        <Text position={[0, 0, 0]} fontSize={0.6} color="#6b7280" anchorX="center" anchorY="middle">
          No folders configured
        </Text>
      )}
    </group>
  );
}

export default FolderExplorerVisualization;
