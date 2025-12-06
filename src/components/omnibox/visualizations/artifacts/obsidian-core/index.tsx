/**
 * Obsidian Core — Storage Globe Artifact
 *
 * A distorted metallic sphere showing storage capacity.
 * Features:
 * - MeshDistortMaterial for liquid metal look
 * - Touch-accessible folder indicators
 * - Camera-facing stats overlay always visible
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import { useConfig } from '@/hooks/syncthing';
import { useFolderStatuses } from '@/hooks/syncthing/folders';
import { StatsPanel, StatsCard, IndicatorRing } from '../_shared';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface ObsidianCoreProps {
  visible?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const FOLDER_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4'];

// =============================================================================
// Main Obsidian Core Component
// =============================================================================

export function ObsidianCore({ visible = true }: ObsidianCoreProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const isMobile = size.width < 768;

  const { data: config } = useConfig();

  const folderIds = useMemo(() => {
    return (config?.folders || []).map((f: { id: string }) => f.id);
  }, [config?.folders]);

  const folderStatusQueries = useFolderStatuses(folderIds);

  // Calculate storage metrics
  const metrics = useMemo(() => {
    const folders = config?.folders || [];
    let totalGlobal = 0;
    let totalLocal = 0;
    const folderData: Array<{
      id: string;
      label: string;
      localBytes: number;
      globalBytes: number;
      state: string;
    }> = [];

    folders.forEach((folder: { id: string; label?: string }) => {
      const statusQuery = folderStatusQueries[folder.id];
      const status = statusQuery?.data;
      if (status) {
        const local = status.localBytes || 0;
        const global = status.globalBytes || 0;
        totalGlobal += global;
        totalLocal += local;
        folderData.push({
          id: folder.id,
          label: folder.label || folder.id,
          localBytes: local,
          globalBytes: global,
          state: status.state || 'idle',
        });
      }
    });

    const syncPercent = totalGlobal > 0 ? Math.round((totalLocal / totalGlobal) * 100) : 100;

    return {
      totalGlobal,
      totalLocal,
      syncPercent,
      folderCount: folders.length,
      folders: folderData.slice(0, 6),
    };
  }, [config, folderStatusQueries]);

  const coreSize = isMobile ? 0.6 : 0.8;

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  if (!visible) return null;

  // Convert folders to ring format
  const ringItems = metrics.folders.map((folder, i) => ({
    id: folder.id,
    label: folder.label.slice(0, 10),
    sublabel: formatBytes(folder.globalBytes),
    color: FOLDER_COLORS[i % FOLDER_COLORS.length],
    isActive: folder.state === 'syncing',
  }));

  return (
    <group>
      {/* Main Distorted Sphere */}
      <Icosahedron ref={meshRef} args={[coreSize, 4]}>
        <MeshDistortMaterial
          color="#010101"
          roughness={0.1}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={0.35}
          speed={1.5}
        />
      </Icosahedron>

      {/* Progress ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[coreSize + 0.15, coreSize + 0.25, 64]} />
        <meshBasicMaterial
          color={metrics.syncPercent === 100 ? '#22c55e' : '#8b5cf6'}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Folder indicator ring */}
      {ringItems.length > 0 && <IndicatorRing items={ringItems} radius={coreSize + 0.9} />}

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="Total Storage"
          value={formatBytes(metrics.totalGlobal)}
          color={metrics.syncPercent === 100 ? '#22c55e' : '#8b5cf6'}
          details={[
            { label: 'Folders', value: String(metrics.folderCount) },
            {
              label: 'Synced',
              value: `${metrics.syncPercent}%`,
              color: metrics.syncPercent === 100 ? '#22c55e' : '#f59e0b',
            },
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default ObsidianCore;
