/**
 * Liminal Shell
 *
 * Cinematic void environment inspired by distorted metallic spheres.
 * Features:
 * - Theme-aware background (dark void or light ethereal)
 * - Floating ambient icosahedrons in the background
 * - High-performance post-processing (Bloom, DepthOfField, Noise, Vignette)
 * - Mouse-responsive main artifact
 * - No floor - pure floating void aesthetic
 */

'use client';

import { Suspense, useRef, useState, createContext, useContext } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Icosahedron, MeshDistortMaterial, Float } from '@react-three/drei';
import { EffectComposer, DepthOfField, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// =============================================================================
// Theme Context for R3F
// =============================================================================

const ThemeContext = createContext<{ isDark: boolean }>({ isDark: true });

/** Hook to access theme inside Canvas components */
export function useShellTheme() {
  return useContext(ThemeContext);
}

// =============================================================================
// Types
// =============================================================================

export interface LiminalShellProps {
  children: React.ReactNode;
  title: string;
  /** Enable post-processing effects */
  enableEffects?: boolean;
  /** Whether to use dark theme (default: true) */
  isDark?: boolean;
}

// =============================================================================
// Distorted Material Setup
// =============================================================================

function DistortedMaterialProvider({
  children,
}: {
  children: (material: THREE.Material) => React.ReactNode;
}) {
  const { isDark } = useShellTheme();
  const [material, setMaterial] = useState<THREE.Material | null>(null);

  return (
    <>
      <MeshDistortMaterial
        ref={setMaterial}
        color={isDark ? '#010101' : '#e8e8e8'}
        roughness={isDark ? 0.1 : 0.3}
        metalness={1}
        clearcoat={1}
        clearcoatRoughness={1}
        radius={1}
        distort={0.4}
        speed={2}
      />
      {material && children(material)}
    </>
  );
}

// =============================================================================
// Background Floating Spheres
// =============================================================================

const BACKGROUND_POSITIONS: [number, number, number][] = [
  [-4, 20, -12],
  [-10, 12, -4],
  [-11, -12, -23],
  [-16, -6, -10],
  [12, -2, -3],
  [13, 4, -12],
  [14, -2, -23],
  [8, 10, -20],
];

function BackgroundSpheres({ material }: { material: THREE.Material }) {
  const sphereRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    sphereRefs.current.forEach((sphere) => {
      if (sphere) {
        sphere.position.y += 0.02;
        if (sphere.position.y > 19) sphere.position.y = -18;
        sphere.rotation.x += 0.06;
        sphere.rotation.y += 0.06;
        sphere.rotation.z += 0.02;
      }
    });
  });

  return (
    <>
      {BACKGROUND_POSITIONS.map((pos, i) => (
        <Icosahedron
          key={i}
          args={[1, 4]}
          position={pos}
          material={material}
          ref={(ref) => {
            sphereRefs.current[i] = ref;
          }}
        />
      ))}
    </>
  );
}

// =============================================================================
// Main Artifact Container (mouse-responsive)
// =============================================================================

function ArtifactContainer({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock, mouse }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = clock.getElapsedTime() * 0.05;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        mouse.x * Math.PI * 0.15,
        0.1
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mouse.y * Math.PI * 0.1,
        0.1
      );
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.05} floatIntensity={0.2}>
      <group ref={groupRef}>{children}</group>
    </Float>
  );
}

// =============================================================================
// Post-Processing Stack
// =============================================================================

function PostProcessing() {
  const { isDark } = useShellTheme();

  return (
    <EffectComposer multisampling={0}>
      <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
      <Bloom
        luminanceThreshold={isDark ? 0 : 0.6}
        luminanceSmoothing={0.9}
        height={300}
        intensity={isDark ? 2 : 0.8}
      />
      <Noise opacity={isDark ? 0.025 : 0.015} />
      <Vignette eskil={false} offset={0.1} darkness={isDark ? 1.1 : 0.3} />
    </EffectComposer>
  );
}

// =============================================================================
// Scene Content
// =============================================================================

interface SceneContentProps {
  children: React.ReactNode;
  enableEffects: boolean;
}

function SceneContent({ children, enableEffects }: SceneContentProps) {
  const { isDark } = useShellTheme();

  // Theme-aware colors
  const backgroundColor = isDark ? '#050505' : '#f5f5f7';
  const fogColor = isDark ? '#161616' : '#e5e5e7';
  const ambientIntensity = isDark ? 0.15 : 0.7;

  return (
    <>
      {/* Theme-aware background */}
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[fogColor, 8, 30]} />

      {/* Theme-aware lighting - no external HDR dependencies */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={isDark ? 0.3 : 0.8}
        color={isDark ? '#6366f1' : '#ffffff'}
      />
      <directionalLight
        position={[-5, 3, -5]}
        intensity={isDark ? 0.2 : 0.4}
        color={isDark ? '#06b6d4' : '#e0e7ff'}
      />

      {/* Distorted background spheres */}
      <DistortedMaterialProvider>
        {(material) => <BackgroundSpheres material={material} />}
      </DistortedMaterialProvider>

      {/* Main artifact with mouse response */}
      <Suspense fallback={<Html center>Loading...</Html>}>
        <ArtifactContainer>{children}</ArtifactContainer>
      </Suspense>

      {/* Post-processing */}
      {enableEffects && <PostProcessing />}
    </>
  );
}

// =============================================================================
// Main Exported Component
// =============================================================================

export function LiminalShell({
  children,
  title: _title,
  enableEffects = true,
  isDark = true,
}: LiminalShellProps) {
  return (
    <ThemeContext.Provider value={{ isDark }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{
          powerPreference: 'high-performance',
          alpha: false,
          antialias: false,
          stencil: false,
          depth: false,
        }}
        dpr={[1, 1.5]}
      >
        <SceneContent enableEffects={enableEffects}>{children}</SceneContent>
      </Canvas>
    </ThemeContext.Provider>
  );
}

export default LiminalShell;
