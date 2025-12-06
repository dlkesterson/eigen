/**
 * Fracture — Conflict Space Artifact
 *
 * A shattered/fractured dodecahedron showing file conflicts.
 * Features:
 * - MeshDistortMaterial with higher distortion for "fractured" look
 * - Warning glow when conflicts exist
 * - Camera-facing stats overlay always visible
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import { useConfig, useScanConflicts } from '@/hooks/syncthing';
import type { FolderConfig, ConflictFile } from '@/hooks/syncthing';
import { StatsPanel, StatsCard, IndicatorRing } from '../_shared';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface FractureProps {
  visible?: boolean;
}

// =============================================================================
// Main Fracture Component
// =============================================================================

export function Fracture({ visible = true }: FractureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const isMobile = size.width < 768;

  const { data: config } = useConfig();

  // Get first folder path for conflict scan
  const firstFolderPath = useMemo(() => {
    const folders = config?.folders || [];
    const activeFolder = folders.find((f: FolderConfig) => f.path && !f.paused);
    return activeFolder?.path || '';
  }, [config?.folders]);

  const { data: conflicts } = useScanConflicts(firstFolderPath);

  const metrics = useMemo(() => {
    const conflictList = Array.isArray(conflicts) ? (conflicts as ConflictFile[]) : [];
    return {
      count: conflictList.length,
      files: conflictList.slice(0, 5).map((c) => ({
        id: c.name || 'unknown',
        name: c.name || 'Unknown file',
        size: c.size || 0,
      })),
      hasConflicts: conflictList.length > 0,
    };
  }, [conflicts]);

  const coreSize = isMobile ? 0.5 : 0.7;

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.12;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  if (!visible) return null;

  // Convert conflict files to ring items
  const ringItems = metrics.files.map((file, _i) => ({
    id: file.id,
    label: file.name.slice(0, 12),
    sublabel: 'Conflict',
    color: '#ef4444',
    isActive: true,
  }));

  return (
    <group>
      {/* Main Fractured Core */}
      <Icosahedron ref={meshRef} args={[coreSize, 2]}>
        <MeshDistortMaterial
          color={metrics.hasConflicts ? '#0a0202' : '#010101'}
          roughness={0.15}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={metrics.hasConflicts ? 0.55 : 0.3}
          speed={metrics.hasConflicts ? 4 : 2}
        />
      </Icosahedron>

      {/* Warning ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[coreSize + 0.15, coreSize + 0.25, 64]} />
        <meshBasicMaterial
          color={metrics.hasConflicts ? '#ef4444' : '#22c55e'}
          transparent
          opacity={metrics.hasConflicts ? 0.7 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Warning glow for conflicts */}
      {metrics.hasConflicts && (
        <mesh>
          <sphereGeometry args={[coreSize * 1.3, 32, 32]} />
          <meshBasicMaterial color="#ff2200" transparent opacity={0.1} side={THREE.BackSide} />
        </mesh>
      )}

      {/* Conflict file indicators */}
      {ringItems.length > 0 && <IndicatorRing items={ringItems} radius={coreSize + 0.8} />}

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title={metrics.hasConflicts ? 'File Conflicts' : 'Conflict Status'}
          value={metrics.hasConflicts ? String(metrics.count) : '✓'}
          color={metrics.hasConflicts ? '#ef4444' : '#22c55e'}
          subtitle={metrics.hasConflicts ? 'Files need attention' : 'No conflicts detected'}
          details={
            metrics.hasConflicts
              ? metrics.files.slice(0, 3).map((f) => ({
                  label: '',
                  value: f.name.slice(0, 15),
                  color: '#ef4444',
                }))
              : undefined
          }
        />
      </StatsPanel>
    </group>
  );
}

export default Fracture;
