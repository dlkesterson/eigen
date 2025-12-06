/**
 * Spire — Timeline Artifact
 *
 * A tapered crystalline spire representing version history and uptime.
 * Features:
 * - MeshDistortMaterial with vertical taper
 * - Camera-facing stats overlay always visible
 * - Theme-aware styling (dark/light mode)
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { useSystemStatus } from '@/hooks/syncthing';
import { StatsPanel, StatsCard } from '../_shared';
import { useShellTheme } from '../../_shell/LiminalShell';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface SpireProps {
  visible?: boolean;
}

// =============================================================================
// Main Spire Component
// =============================================================================

export function Spire({ visible = true }: SpireProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const { isDark } = useShellTheme();
  const isMobile = size.width < 768;

  const { data: status } = useSystemStatus();

  const metrics = useMemo(() => {
    const uptime = status?.uptime || 0;
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      uptime: uptimeStr,
      version: String(status?.version || 'Unknown'),
      myID: status?.myID ? status.myID.slice(0, 8) : 'Unknown',
    };
  }, [status]);

  const spireHeight = isMobile ? 1.3 : 1.6;

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* Main Spire (tapered cylinder) */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.12, 0.4, spireHeight, 6, 8]} />
        <MeshDistortMaterial
          color={isDark ? '#010101' : '#e8e8e8'}
          roughness={isDark ? 0.1 : 0.3}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={0.25}
          speed={1.5}
        />
      </mesh>

      {/* Status rings */}
      <mesh position={[0, spireHeight / 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.42, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.52, 32]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -spireHeight / 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.62, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="Uptime"
          value={metrics.uptime}
          color="#8b5cf6"
          details={[
            { label: 'Version', value: metrics.version.slice(0, 10), color: '#06b6d4' },
            { label: 'Device ID', value: metrics.myID, color: '#64748b' },
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default Spire;
