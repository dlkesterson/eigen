/**
 * HelpMonolith — Help/Documentation Artifact
 *
 * A mysterious dark monolith representing the help system.
 * Features:
 * - MeshDistortMaterial slab
 * - Camera-facing stats overlay always visible
 * - Touch-friendly help category indicators
 */

'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial, Html } from '@react-three/drei';
import { StatsPanel, StatsCard, Billboard } from '../_shared';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface HelpMonolithProps {
  visible?: boolean;
}

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// =============================================================================
// Help Categories
// =============================================================================

const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'getting-started', name: 'Getting Started', icon: '🚀', color: '#22c55e' },
  { id: 'devices', name: 'Devices', icon: '📱', color: '#06b6d4' },
  { id: 'folders', name: 'Folders', icon: '📁', color: '#f59e0b' },
  { id: 'sync', name: 'Sync Issues', icon: '🔄', color: '#8b5cf6' },
  { id: 'advanced', name: 'Advanced', icon: '⚙️', color: '#64748b' },
];

// =============================================================================
// Static Help Indicators in Ring
// =============================================================================

function HelpIndicatorRing({ categories }: { categories: HelpCategory[] }) {
  const { size } = useThree();
  const isMobile = size.width < 768;
  const radius = isMobile ? 0.9 : 1.1;

  return (
    <group>
      {categories.map((category, index) => {
        const angle = (index / categories.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={category.id} position={[x, 0, z]}>
            {/* Glow ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.08, 0.12, 16]} />
              <meshBasicMaterial
                color={category.color}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Center dot */}
            <mesh>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color={category.color} />
            </mesh>

            {/* Billboard label */}
            <group position={[0, 0.25, 0]}>
              <Billboard>
                <div
                  className="flex flex-col items-center gap-1 rounded-lg px-2 py-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${category.color}40`,
                  }}
                >
                  <span className="text-base">{category.icon}</span>
                  <span
                    className="text-[10px] font-medium whitespace-nowrap"
                    style={{ color: category.color }}
                  >
                    {category.name}
                  </span>
                </div>
              </Billboard>
            </group>
          </group>
        );
      })}
    </group>
  );
}

// =============================================================================
// Main HelpMonolith Component
// =============================================================================

export function HelpMonolith({ visible = true }: HelpMonolithProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const isMobile = size.width < 768;

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05;
      meshRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05;
    }
  });

  if (!visible) return null;

  const scale = isMobile ? 0.85 : 1;

  return (
    <group scale={scale}>
      {/* Main Monolith (tall box) */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.5, 1.5, 0.15]} />
        <MeshDistortMaterial
          color="#010101"
          roughness={0.08}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={0.2}
          speed={1}
        />
      </mesh>

      {/* Mysterious glyph on surface */}
      <Html
        position={[0, 0.2, 0.09]}
        center
        transform
        distanceFactor={1.5}
        occlude={false}
        zIndexRange={[100, 0]}
      >
        <div className="text-4xl opacity-60 select-none">?</div>
      </Html>

      {/* Help category indicators in static ring */}
      <HelpIndicatorRing categories={HELP_CATEGORIES} />

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="Help Topics"
          value={`${HELP_CATEGORIES.length} Categories`}
          color="#8b5cf6"
          details={[
            { label: 'Tap', value: 'any topic', color: '#64748b' },
            { label: 'Status', value: 'Available', color: '#22c55e' },
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default HelpMonolith;
