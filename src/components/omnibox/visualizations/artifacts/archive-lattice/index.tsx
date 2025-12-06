/**
 * Archive Lattice — Folder Explorer Artifact
 *
 * An icosahedral lattice structure representing folder hierarchy.
 * Features:
 * - MeshDistortMaterial core
 * - Touch-accessible folder indicators
 * - Camera-facing stats overlay always visible
 * - Theme-aware styling (dark/light mode)
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import { useConfig } from '@/hooks/syncthing';
import { useFolderStatuses } from '@/hooks/syncthing/folders';
import { StatsPanel, StatsCard, IndicatorRing } from '../_shared';
import { useShellTheme } from '../../_shell/LiminalShell';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface ArchiveLatticeProps {
  visible?: boolean;
}

// =============================================================================
// State Colors
// =============================================================================

const STATE_COLORS: Record<string, string> = {
  idle: '#22c55e',
  syncing: '#3b82f6',
  scanning: '#f59e0b',
  error: '#ef4444',
  unknown: '#64748b',
};

// =============================================================================
// Main Archive Lattice Component
// =============================================================================

export function ArchiveLattice({ visible = true }: ArchiveLatticeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const { isDark } = useShellTheme();
  const isMobile = size.width < 768;

  const { data: config } = useConfig();

  const folderIds = useMemo(() => {
    return (config?.folders || []).map((f: { id: string }) => f.id);
  }, [config?.folders]);

  const folderStatusQueries = useFolderStatuses(folderIds);

  const metrics = useMemo(() => {
    const folders = config?.folders || [];
    const folderData = folders.map((folder: { id: string; label?: string }) => {
      const statusQuery = folderStatusQueries[folder.id];
      const status = statusQuery?.data;
      return {
        id: folder.id,
        label: folder.label || folder.id,
        state: status?.state || 'unknown',
      };
    });

    const syncing = folderData.filter((f) => f.state === 'syncing').length;
    const idle = folderData.filter((f) => f.state === 'idle').length;
    const errors = folderData.filter((f) => f.state === 'error').length;

    return {
      folders: folderData.slice(0, 8),
      total: folders.length,
      syncing,
      idle,
      errors,
    };
  }, [config, folderStatusQueries]);

  const coreSize = isMobile ? 0.5 : 0.7;

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.06;
    }
  });

  if (!visible) return null;

  // Convert folders to ring format
  const ringItems = metrics.folders.map((folder) => ({
    id: folder.id,
    label: folder.label.slice(0, 10),
    sublabel: folder.state,
    color: STATE_COLORS[folder.state] || STATE_COLORS.unknown,
    isActive: folder.state === 'syncing' || folder.state === 'error',
  }));

  // Determine overall status color
  const statusColor =
    metrics.errors > 0
      ? STATE_COLORS.error
      : metrics.syncing > 0
        ? STATE_COLORS.syncing
        : STATE_COLORS.idle;

  return (
    <group>
      {/* Main Lattice Core */}
      <Icosahedron ref={meshRef} args={[coreSize, 3]}>
        <MeshDistortMaterial
          color={isDark ? '#010101' : '#e8e8e8'}
          roughness={isDark ? 0.1 : 0.3}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={0.35}
          speed={1.5}
        />
      </Icosahedron>

      {/* Status ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[coreSize + 0.15, coreSize + 0.25, 64]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Folder indicator ring */}
      {ringItems.length > 0 && <IndicatorRing items={ringItems} radius={coreSize + 0.85} />}

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="Folders"
          value={String(metrics.total)}
          color={statusColor}
          details={[
            { label: 'Idle', value: String(metrics.idle), color: STATE_COLORS.idle },
            ...(metrics.syncing > 0
              ? [{ label: 'Syncing', value: String(metrics.syncing), color: STATE_COLORS.syncing }]
              : []),
            ...(metrics.errors > 0
              ? [{ label: 'Errors', value: String(metrics.errors), color: STATE_COLORS.error }]
              : []),
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default ArchiveLattice;
