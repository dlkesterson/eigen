/**
 * Visualization Shell
 *
 * Shared 3D scene setup for all visualizations including:
 * - Background, fog, and atmospheric effects
 * - Consistent lighting setup
 * - Star field with responsive density
 * - Camera with presets
 * - Orbit controls with responsive limits
 *
 * Usage:
 * ```tsx
 * <VisualizationShell title="My Visualization" cameraPreset="medium">
 *   <MyVisualizationContent />
 * </VisualizationShell>
 * ```
 */

'use client';

import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Stars, OrbitControls, PerspectiveCamera } from '@react-three/drei';

// =============================================================================
// Types
// =============================================================================

export type CameraPreset = 'close' | 'medium' | 'wide' | 'globe';

export interface VisualizationShellProps {
  children: React.ReactNode;
  /** Camera distance preset */
  cameraPreset?: CameraPreset;
  /** Enable auto-rotation of the scene */
  autoRotate?: boolean;
  /** Auto-rotation speed (default: 0.3) */
  autoRotateSpeed?: number;
  /** Enable orbit controls */
  controls?: boolean;
  /** Enable panning */
  enablePan?: boolean;
  /** Custom star count (overrides responsive default) */
  starCount?: number;
  /** Fog near distance */
  fogNear?: number;
  /** Fog far distance */
  fogFar?: number;
}

// =============================================================================
// Camera Preset Configurations
// =============================================================================

const CAMERA_PRESETS = {
  close: { desktop: 10, mobile: 12 },
  medium: { desktop: 18, mobile: 20 },
  wide: { desktop: 30, mobile: 35 },
  globe: { desktop: 40, mobile: 45 },
} as const;

const MAX_DISTANCES = {
  close: { desktop: 40, mobile: 50 },
  medium: { desktop: 60, mobile: 70 },
  wide: { desktop: 80, mobile: 90 },
  globe: { desktop: 100, mobile: 110 },
} as const;

// =============================================================================
// Inner Shell (uses R3F hooks)
// =============================================================================

function ShellContent({
  children,
  cameraPreset = 'medium',
  autoRotate = true,
  autoRotateSpeed = 0.3,
  controls = true,
  enablePan = true,
  starCount,
  fogNear = 15,
  fogFar = 100,
}: VisualizationShellProps) {
  const { size } = useThree();
  const isMobile = size.width < 768;

  // Responsive camera distance
  const cameraDistance = useMemo(() => {
    const preset = CAMERA_PRESETS[cameraPreset];
    return isMobile ? preset.mobile : preset.desktop;
  }, [cameraPreset, isMobile]);

  // Responsive max distance for controls
  const maxDistance = useMemo(() => {
    const preset = MAX_DISTANCES[cameraPreset];
    return isMobile ? preset.mobile : preset.desktop;
  }, [cameraPreset, isMobile]);

  // Responsive star count
  const stars = useMemo(() => {
    if (starCount !== undefined) return starCount;
    return isMobile ? 800 : 1500;
  }, [starCount, isMobile]);

  return (
    <>
      {/* Background color */}
      <color attach="background" args={['#050810']} />

      {/* Atmospheric fog */}
      <fog attach="fog" args={['#050810', fogNear, fogFar]} />

      {/* Lighting Setup */}
      <ambientLight intensity={0.25} color="#1a3a52" />
      <pointLight position={[25, 25, 25]} intensity={1.2} color="#5ba3d0" decay={2} />
      <pointLight position={[-25, -15, 15]} intensity={0.6} color="#8b5cf6" decay={2} />
      <pointLight position={[0, -20, 0]} intensity={0.4} color="#f97316" decay={2} />

      {/* Star field */}
      <Stars radius={150} depth={75} count={stars} factor={5} saturation={0.3} fade speed={0.05} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 5, cameraDistance]} fov={60} />

      {/* Orbit Controls */}
      {controls && (
        <OrbitControls
          enablePan={enablePan}
          enableZoom={true}
          minDistance={5}
          maxDistance={maxDistance}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          maxPolarAngle={Math.PI / 2.1}
        />
      )}

      {/* Visualization Content */}
      {children}
    </>
  );
}

// =============================================================================
// Exported Shell Component
// =============================================================================

export function VisualizationShell(props: VisualizationShellProps) {
  return <ShellContent {...props} />;
}

export default VisualizationShell;
