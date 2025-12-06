/**
 * Artifact Wrapper
 *
 * Wraps individual artifacts with:
 * - Float animation
 * - Camera presets
 * - Title display
 * - Responsive behavior detection
 */

'use client';

import { Suspense, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

// =============================================================================
// Types
// =============================================================================

export type ArtifactCameraPreset = 'close' | 'medium' | 'wide' | 'cinematic';

export interface ArtifactWrapperProps {
  children: React.ReactNode;
  /** Camera preset for viewing distance */
  cameraPreset?: ArtifactCameraPreset;
  /** Enable orbit controls */
  enableControls?: boolean;
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Auto-rotation speed */
  autoRotateSpeed?: number;
  /** Enable panning */
  enablePan?: boolean;
  /** Enable zoom */
  enableZoom?: boolean;
}

// =============================================================================
// Camera Presets
// =============================================================================

const CAMERA_PRESETS = {
  close: { distance: 8, fov: 50 },
  medium: { distance: 12, fov: 45 },
  wide: { distance: 18, fov: 45 },
  cinematic: { distance: 14, fov: 35 },
} as const;

// =============================================================================
// Responsive Hook
// =============================================================================

export function useResponsive() {
  const { size } = useThree();

  return useMemo(
    () => ({
      isMobile: size.width < 768,
      isTablet: size.width >= 768 && size.width < 1024,
      isDesktop: size.width >= 1024,
      width: size.width,
      height: size.height,
    }),
    [size.width, size.height]
  );
}

// =============================================================================
// Controls Component
// =============================================================================

interface ArtifactControlsProps {
  cameraPreset: ArtifactCameraPreset;
  enableControls: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  enablePan: boolean;
  enableZoom: boolean;
}

function ArtifactControls({
  cameraPreset,
  enableControls,
  autoRotate,
  autoRotateSpeed,
  enablePan,
  enableZoom,
}: ArtifactControlsProps) {
  const { isMobile } = useResponsive();
  const preset = CAMERA_PRESETS[cameraPreset];

  // Adjust distance for mobile
  const distance = isMobile ? preset.distance * 1.2 : preset.distance;

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, distance]} fov={preset.fov} />

      {enableControls && (
        <OrbitControls
          enablePan={enablePan}
          enableZoom={enableZoom}
          enableRotate
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          minDistance={4}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0.1}
          // Smooth damping
          enableDamping
          dampingFactor={0.05}
        />
      )}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ArtifactWrapper({
  children,
  cameraPreset = 'medium',
  enableControls = true,
  autoRotate = true,
  autoRotateSpeed = 0.3,
  enablePan = false,
  enableZoom = true,
}: ArtifactWrapperProps) {
  return (
    <>
      <ArtifactControls
        cameraPreset={cameraPreset}
        enableControls={enableControls}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        enablePan={enablePan}
        enableZoom={enableZoom}
      />

      <Suspense fallback={null}>{children}</Suspense>
    </>
  );
}

export default ArtifactWrapper;
