/**
 * Storage Globe Visualization
 *
 * Shows storage distribution across devices as a 3D treemap/globe.
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useConfig } from '@/hooks/syncthing';
import { useFolderStatuses } from '@/hooks/syncthing/folders';
import { formatBytes } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface StorageSegment {
  id: string;
  label: string;
  size: number;
  color: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
}

// =============================================================================
// Constants
// =============================================================================

const FOLDER_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#eab308', // Yellow
  '#ef4444', // Red
];

// =============================================================================
// Storage Ring Segment
// =============================================================================

interface RingSegmentProps {
  segment: StorageSegment;
  isSelected: boolean;
  onSelect: (id: string) => void;
  visible?: boolean;
}

function RingSegment({ segment, isSelected, onSelect, visible = true }: RingSegmentProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Create ring segment geometry
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();

    // Outer arc
    shape.absarc(0, 0, segment.outerRadius, segment.startAngle, segment.endAngle, false);

    // Line to inner arc
    shape.lineTo(
      Math.cos(segment.endAngle) * segment.innerRadius,
      Math.sin(segment.endAngle) * segment.innerRadius
    );

    // Inner arc (reverse direction)
    shape.absarc(0, 0, segment.innerRadius, segment.endAngle, segment.startAngle, true);

    // Close the shape
    shape.lineTo(
      Math.cos(segment.startAngle) * segment.outerRadius,
      Math.sin(segment.startAngle) * segment.outerRadius
    );

    const extrudeSettings = { depth: 0.5, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [segment]);

  useFrame(() => {
    if (meshRef.current) {
      const targetY = hovered || isSelected ? 0.5 : 0;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(segment.id);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={segment.color}
          emissive={segment.color}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.3 : 0.1}
          roughness={0.4}
          metalness={0.6}
          transparent
          opacity={hovered || isSelected ? 0.95 : 0.85}
        />
      </mesh>

      {/* Label */}
      {(hovered || isSelected) && visible && (
        <Html
          position={[
            Math.cos((segment.startAngle + segment.endAngle) / 2) *
              ((segment.innerRadius + segment.outerRadius) / 2),
            1,
            Math.sin((segment.startAngle + segment.endAngle) / 2) *
              ((segment.innerRadius + segment.outerRadius) / 2),
          ]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 whitespace-nowrap text-white backdrop-blur-sm">
            <div className="font-medium">{segment.label}</div>
            <div className="text-sm text-gray-400">{formatBytes(segment.size)}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// Central Globe
// =============================================================================

interface CentralGlobeProps {
  totalSize: number;
  usedSize: number;
  visible?: boolean;
}

function CentralGlobe({ totalSize, usedSize, visible = true }: CentralGlobeProps) {
  const globeRef = useRef<THREE.Mesh>(null);
  const percentage = totalSize > 0 ? (usedSize / totalSize) * 100 : 0;

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group>
      {/* Outer wireframe */}
      <mesh ref={globeRef}>
        <icosahedronGeometry args={[2.5, 1]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.2}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Inner sphere showing usage */}
      <mesh>
        <sphereGeometry args={[2 * (percentage / 100), 32, 32]} />
        <meshStandardMaterial
          color="#0ea5e9"
          emissive="#0ea5e9"
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Core */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Stats */}
      {visible && (
        <Html position={[0, 4, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{formatBytes(usedSize)}</div>
            <div className="text-sm text-gray-400">Total Synced Data</div>
            {totalSize > 0 && (
              <div className="mt-1 text-xs text-cyan-400">{percentage.toFixed(1)}% used</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface StorageGlobeVisualizationProps {
  selectedDevices?: string[];
  visible?: boolean;
}

export function StorageGlobeVisualization({
  selectedDevices = [],
  visible = true,
}: StorageGlobeVisualizationProps) {
  const { data: config } = useConfig();
  const [selected, setSelected] = useState<string | null>(null);

  // Get folder IDs
  const folderIds = useMemo(() => {
    return config?.folders?.map((f: { id: string }) => f.id) || [];
  }, [config?.folders]);

  // Get statuses for all folders
  const folderStatuses = useFolderStatuses(folderIds);

  // Calculate storage segments
  const { segments, totalSize } = useMemo(() => {
    if (!config?.folders) return { segments: [], totalSize: 0 };

    const folders = config.folders as Array<{
      id: string;
      label?: string;
    }>;

    // Get sizes for each folder
    const folderSizes = folders
      .map((folder, index) => {
        const status = folderStatuses[folder.id]?.data;
        const size = status?.localBytes || status?.globalBytes || 0;

        return {
          id: folder.id,
          label: folder.label || folder.id,
          size,
          color: FOLDER_COLORS[index % FOLDER_COLORS.length],
        };
      })
      .filter((f) => f.size > 0);

    const total = folderSizes.reduce((acc, f) => acc + f.size, 0);

    if (total === 0) {
      return { segments: [], totalSize: 0 };
    }

    // Create ring segments
    let currentAngle = 0;
    const segs: StorageSegment[] = folderSizes.map((folder) => {
      const angleSize = (folder.size / total) * Math.PI * 2;
      const segment: StorageSegment = {
        id: folder.id,
        label: folder.label,
        size: folder.size,
        color: folder.color,
        startAngle: currentAngle,
        endAngle: currentAngle + angleSize,
        innerRadius: 3.5,
        outerRadius: 6,
      };
      currentAngle += angleSize;
      return segment;
    });

    return { segments: segs, totalSize: total };
  }, [config?.folders, folderStatuses]);

  const handleSelect = (id: string) => {
    setSelected(selected === id ? null : id);
  };

  return (
    <group>
      {/* Central globe */}
      <CentralGlobe totalSize={totalSize * 2} usedSize={totalSize} visible={visible} />

      {/* Storage ring segments */}
      {segments.map((segment) => (
        <RingSegment
          key={segment.id}
          segment={segment}
          isSelected={selected === segment.id || selectedDevices.includes(segment.id)}
          onSelect={handleSelect}
          visible={visible}
        />
      ))}

      {/* Grid floor */}
      <group position={[0, -1, 0]}>
        <gridHelper args={[20, 20, '#0c4a6e', '#0a1628']} rotation={[0, 0, 0]} />
      </group>

      {/* Empty state */}
      {segments.length === 0 && (
        <Text position={[0, 0, 0]} fontSize={0.5} color="#6b7280" anchorX="center" anchorY="middle">
          No storage data available
        </Text>
      )}

      {/* Legend */}
      {visible && (
        <Html position={[8, 3, 0]} style={{ pointerEvents: 'none' }}>
          <div className="rounded-lg border border-white/10 bg-black/80 px-3 py-2 backdrop-blur-sm">
            <div className="mb-2 text-xs text-gray-400">Folders</div>
            <div className="space-y-1">
              {segments.slice(0, 5).map((seg) => (
                <div key={seg.id} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="max-w-24 truncate text-white">{seg.label}</span>
                </div>
              ))}
              {segments.length > 5 && (
                <div className="text-xs text-gray-500">+{segments.length - 5} more</div>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default StorageGlobeVisualization;
