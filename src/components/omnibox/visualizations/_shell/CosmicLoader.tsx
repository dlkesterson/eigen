/**
 * Cosmic Loader
 *
 * A 3D loading indicator for use inside the Canvas while
 * visualizations are being lazy-loaded.
 *
 * Features:
 * - Animated spinning rings
 * - Pulsing center orb
 * - Matches the cosmic theme
 */

'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

export interface CosmicLoaderProps {
  /** Position in 3D space */
  position?: [number, number, number];
  /** Scale factor */
  scale?: number;
  /** Primary color */
  color?: string;
  /** Secondary accent color */
  accentColor?: string;
}

// =============================================================================
// Cosmic Loader Component
// =============================================================================

export function CosmicLoader({
  position = [0, 0, 0],
  scale = 1,
  color = '#22d3ee',
  accentColor = '#a855f7',
}: CosmicLoaderProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Rotate rings at different speeds
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.5;
      ring1Ref.current.rotation.y = time * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = time * 0.3;
      ring2Ref.current.rotation.z = time * 0.5;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = time * 0.4;
      ring3Ref.current.rotation.z = time * 0.2;
    }

    // Pulse the center orb
    if (orbRef.current) {
      const pulse = 1 + Math.sin(time * 3) * 0.15;
      orbRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Center orb */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {/* Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1, 0.03, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Ring 2 */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[1.3, 0.025, 16, 64]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.6} />
      </mesh>

      {/* Ring 3 */}
      <mesh ref={ring3Ref} rotation={[0, Math.PI / 4, Math.PI / 6]}>
        <torusGeometry args={[1.6, 0.02, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* Particle dots on rings */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 1, Math.sin(angle) * 1, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

// =============================================================================
// HTML Fallback Loader (for outside Canvas)
// =============================================================================

export interface LoaderOverlayProps {
  message?: string;
}

export function LoaderOverlay({ message = 'Loading visualization...' }: LoaderOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* CSS-based loader for outside Canvas */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
          <div
            className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-purple-500"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          />
          <div className="absolute inset-4 animate-pulse rounded-full bg-cyan-400/20" />
          <div className="absolute inset-5 rounded-full bg-cyan-400/40" />
        </div>
        <span className="text-sm text-gray-400">{message}</span>
      </div>
    </div>
  );
}

export default CosmicLoader;
