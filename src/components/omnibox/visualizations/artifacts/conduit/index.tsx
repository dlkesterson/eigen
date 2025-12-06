/**
 * Conduit — Sync Flow Artifact
 *
 * A distorted tube showing data transfer in/out.
 * Features:
 * - MeshDistortMaterial for organic look
 * - Particle flow inside the conduit
 * - Camera-facing stats overlay always visible
 * - Theme-aware styling (dark/light mode)
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { useConnections } from '@/hooks/syncthing';
import { StatsPanel, StatsCard } from '../_shared';
import { useShellTheme } from '../../_shell/LiminalShell';
import { formatBytes } from '@/lib/utils';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface ConduitProps {
  visible?: boolean;
}

// =============================================================================
// Flow Particles
// =============================================================================

interface FlowParticlesProps {
  count: number;
  speed: number;
  radius: number;
  height: number;
  direction: 'up' | 'down';
  color: string;
}

// Seeded pseudo-random number generator for deterministic results
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function FlowParticles({ count, speed, radius, height, direction, color }: FlowParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Use deterministic seeded random values for consistent rendering
      const angle = (i / count) * Math.PI * 2 + seededRandom(i) * 0.3;
      const r = radius * (0.3 + seededRandom(i + 1000) * 0.6);
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (seededRandom(i + 2000) - 0.5) * height;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    return pos;
  }, [count, radius, height]);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const halfHeight = height / 2;

    for (let i = 0; i < count; i++) {
      const dir = direction === 'up' ? 1 : -1;
      posArray[i * 3 + 1] += speed * delta * dir;
      if (direction === 'up' && posArray[i * 3 + 1] > halfHeight) {
        posArray[i * 3 + 1] = -halfHeight;
      } else if (direction === 'down' && posArray[i * 3 + 1] < -halfHeight) {
        posArray[i * 3 + 1] = halfHeight;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// =============================================================================
// Main Conduit Component
// =============================================================================

export function Conduit({ visible = true }: ConduitProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const { isDark } = useShellTheme();
  const isMobile = size.width < 768;

  const { data: connections } = useConnections();

  const metrics = useMemo(() => {
    const connectionList = connections?.connections || {};
    let totalIn = 0;
    let totalOut = 0;

    Object.values(connectionList).forEach((conn: unknown) => {
      const c = conn as { inBytesTotal?: number; outBytesTotal?: number };
      totalIn += c.inBytesTotal || 0;
      totalOut += c.outBytesTotal || 0;
    });

    return {
      totalIn,
      totalOut,
      isActive: totalIn > 0 || totalOut > 0,
    };
  }, [connections]);

  const conduitHeight = isMobile ? 1.4 : 1.8;
  const conduitRadius = isMobile ? 0.4 : 0.5;

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* Main Distorted Cylinder */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[conduitRadius, conduitRadius * 0.8, conduitHeight, 32, 8]} />
        <MeshDistortMaterial
          color={isDark ? '#010101' : '#e8e8e8'}
          roughness={isDark ? 0.1 : 0.3}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={0.3}
          speed={2}
        />
      </mesh>

      {/* Flow particles */}
      {metrics.totalIn > 0 && (
        <FlowParticles
          count={30}
          speed={1.2}
          radius={conduitRadius * 0.35}
          height={conduitHeight}
          direction="up"
          color="#22c55e"
        />
      )}
      {metrics.totalOut > 0 && (
        <FlowParticles
          count={30}
          speed={1.2}
          radius={conduitRadius * 0.35}
          height={conduitHeight}
          direction="down"
          color="#3b82f6"
        />
      )}

      {/* Status rings */}
      <mesh position={[0, conduitHeight / 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[conduitRadius + 0.1, conduitRadius + 0.18, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -conduitHeight / 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[conduitRadius + 0.1, conduitRadius + 0.18, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="Data Transfer"
          value={metrics.isActive ? 'Active' : 'Idle'}
          color={metrics.isActive ? '#22c55e' : '#64748b'}
          details={[
            { label: 'Downloaded', value: formatBytes(metrics.totalIn), color: '#22c55e' },
            { label: 'Uploaded', value: formatBytes(metrics.totalOut), color: '#3b82f6' },
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default Conduit;
