'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { getDevicePreset, generateOrbProfile, type DeviceOrbProfile } from './orb-presets';
import { createMaterialFromPreset, createParticleShaderMaterial } from './orb-material';

export interface DeviceOrbData {
  id: string;
  name: string;
  position: [number, number, number];
  isLocal: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  isPaused: boolean;
  // Optional extended info for tooltip
  uploadSpeed?: number;
  downloadSpeed?: number;
  syncProgress?: number;
}

interface DeviceOrbProps {
  device: DeviceOrbData;
  onClick?: () => void;
}

// Tooltip component with glassmorphic styling
function DeviceTooltip({
  device,
  orbProfile,
}: {
  device: DeviceOrbData;
  orbProfile: DeviceOrbProfile;
}) {
  const getStatusText = () => {
    if (device.isPaused) return 'Paused';
    if (!device.isOnline) return 'Offline';
    if (device.isSyncing) return 'Syncing...';
    return 'Connected';
  };

  const getStatusColor = () => {
    if (device.isPaused) return 'text-amber-400';
    if (!device.isOnline) return 'text-gray-400';
    if (device.isSyncing) return 'text-cyan-400';
    return 'text-green-400';
  };

  // Convert hue to color name for display
  const getHueColorName = (hue: number) => {
    if (hue < 30) return 'Red';
    if (hue < 60) return 'Orange';
    if (hue < 90) return 'Yellow';
    if (hue < 150) return 'Green';
    if (hue < 210) return 'Cyan';
    if (hue < 270) return 'Blue';
    if (hue < 330) return 'Purple';
    return 'Red';
  };

  return (
    <div
      className="pointer-events-none rounded-lg border border-cyan-400/30 bg-black/70 px-4 py-3 whitespace-nowrap backdrop-blur-xl select-none"
      style={{
        boxShadow: '0 0 20px rgba(34, 211, 238, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        minWidth: '180px',
      }}
    >
      <div className="mb-1 font-mono text-sm font-semibold text-white">{device.name}</div>
      <div className={`mb-2 font-mono text-xs ${getStatusColor()}`}>{getStatusText()}</div>
      {device.isLocal && <div className="font-mono text-xs text-blue-300/70">📍 This Device</div>}
      {device.isSyncing && device.syncProgress !== undefined && (
        <div className="mt-2">
          <div className="mb-1 flex justify-between font-mono text-xs text-gray-400">
            <span>Progress</span>
            <span>{device.syncProgress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              style={{ width: `${device.syncProgress}%` }}
            />
          </div>
        </div>
      )}
      {device.isOnline && (device.uploadSpeed || device.downloadSpeed) && (
        <div className="mt-2 flex gap-3 font-mono text-xs text-gray-400">
          {device.downloadSpeed !== undefined && (
            <span>↓ {(device.downloadSpeed / 1024).toFixed(1)} KB/s</span>
          )}
          {device.uploadSpeed !== undefined && (
            <span>↑ {(device.uploadSpeed / 1024).toFixed(1)} KB/s</span>
          )}
        </div>
      )}
      {/* Device visual profile info */}
      <div className="mt-2 border-t border-cyan-400/20 pt-2">
        <div className="flex items-center gap-2 font-mono text-[10px] text-gray-500">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: `hsl(${orbProfile.primaryHue}, 70%, 60%)` }}
          />
          <span>{getHueColorName(orbProfile.primaryHue)} signature</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-gray-500">
          {orbProfile.layerCount} glass layers • {orbProfile.glowIntensity.toFixed(1)}x glow
        </div>
      </div>
      <div className="mt-2 truncate font-mono text-[10px] text-gray-500">
        {device.id.slice(0, 16)}...
      </div>
    </div>
  );
}

export function DeviceOrb({ device, onClick }: DeviceOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.LineSegments>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glassLayersRef = useRef<THREE.Mesh[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const particleMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get unique preset for this device based on ID and state
  const preset = useMemo(
    () =>
      getDevicePreset(device.id, {
        isLocal: device.isLocal,
        isOnline: device.isOnline,
        isSyncing: device.isSyncing,
        isPaused: device.isPaused,
      }),
    [device.id, device.isLocal, device.isOnline, device.isSyncing, device.isPaused]
  );

  // Generate deterministic profile for this device
  const orbProfile = useMemo(() => generateOrbProfile(device.id), [device.id]);

  // Create shader material from preset (memoized and stored in ref)
  const shaderMaterial = useMemo(() => {
    const material = createMaterialFromPreset(preset);
    materialRef.current = material;
    return material;
  }, [preset]);

  // Get glow color from preset for auxiliary meshes
  const glowColor = useMemo(() => new THREE.Color(preset.uniforms.glowColor), [preset]);

  // Create core color based on device profile
  const coreColor = useMemo(
    () => new THREE.Color().setHSL(orbProfile.primaryHue / 360, 0.7, 0.6),
    [orbProfile.primaryHue]
  );

  // Create particle shader material for syncing/online devices
  const particleMaterial = useMemo(() => {
    if (!device.isOnline || device.isPaused) return null;
    const material = createParticleShaderMaterial(glowColor);
    particleMaterialRef.current = material;
    return material;
  }, [device.isOnline, device.isPaused, glowColor]);

  // Generate particle positions inside the orb
  const particleGeometry = useMemo(() => {
    const particleCount = device.isSyncing ? 50 : 25;
    const size = device.isLocal ? 1.2 : 0.6;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Random positions inside a sphere
      const r = Math.random() * size * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [device.isSyncing, device.isLocal]);

  // Show tooltip immediately on hover
  useEffect(() => {
    setShowTooltip(isHovered);
  }, [isHovered]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const mat = materialRef.current;
    const particleMat = particleMaterialRef.current;

    // Update shader time uniform
    if (mat?.uniforms.time) {
      mat.uniforms.time.value = time;
    }

    // Update particle shader time uniform
    if (particleMat?.uniforms.time) {
      particleMat.uniforms.time.value = time;
    }

    // Update hover intensity
    if (mat?.uniforms.hoverIntensity) {
      const targetHover = isHovered ? 1.0 : 0.0;
      const currentHover = mat.uniforms.hoverIntensity.value as number;
      mat.uniforms.hoverIntensity.value = currentHover + (targetHover - currentHover) * 0.1;
    }

    // Rotation animation for syncing or based on profile
    if (meshRef.current) {
      if (device.isSyncing) {
        meshRef.current.rotation.y += 0.01;
      } else {
        meshRef.current.rotation.y += orbProfile.rotationSpeed * 0.01;
      }
    }

    // Floating/bobbing animation based on device profile
    if (groupRef.current) {
      const floatOffset = Math.sin(time * orbProfile.pulseSpeed * 0.5) * 0.15;
      groupRef.current.position.y = device.position[1] + floatOffset;
    }

    // Pulse scale animation based on profile
    if (meshRef.current) {
      const pulseScale = 1 + Math.sin(time * orbProfile.pulseSpeed) * 0.05;
      const targetScale = isHovered ? 1.3 * pulseScale : pulseScale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }

    // Pulsing glow animation
    if (glowRef.current) {
      const pulseScale = 1 + Math.sin(time * 3) * 0.1;
      glowRef.current.scale.setScalar(pulseScale);
    }

    // Outer glow with slower pulse
    if (outerGlowRef.current) {
      const outerPulseScale = 1 + Math.sin(time * 1.5) * 0.05;
      outerGlowRef.current.scale.setScalar(outerPulseScale);
    }

    // Inner core glow pulsing
    if (coreRef.current && coreRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      const coreIntensity =
        device.isOnline && !device.isPaused
          ? 0.4 + Math.sin(time * orbProfile.pulseSpeed * 2) * 0.2
          : 0.1;
      coreRef.current.material.emissiveIntensity = coreIntensity;
    }

    // Animate glass layers with staggered rotation
    glassLayersRef.current.forEach((layer, index) => {
      if (layer) {
        layer.rotation.y += orbProfile.rotationSpeed * 0.005 * (index + 1);
        layer.rotation.x += orbProfile.rotationSpeed * 0.003 * (index + 1);
      }
    });

    if (ringRef.current && device.isSyncing) {
      ringRef.current.rotation.z += 0.03;
    }

    // Animate particles rotation
    if (particlesRef.current) {
      particlesRef.current.rotation.y += device.isSyncing ? 0.015 : 0.005;
      particlesRef.current.rotation.x += device.isSyncing ? 0.008 : 0.002;
    }
  });

  const size = device.isLocal ? 1.2 : 0.6;

  // Generate ring points for syncing animation
  const ringPoints = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      points.push(Math.cos(angle) * (size * 1.8), 0, Math.sin(angle) * (size * 1.8));
    }
    return new Float32Array(points);
  }, [size]);

  // Generate glass layer scales based on device profile
  const glassLayerScales = useMemo(() => {
    const scales: number[] = [];
    for (let i = 0; i < orbProfile.layerCount; i++) {
      scales.push(1 - i * 0.15);
    }
    return scales;
  }, [orbProfile.layerCount]);

  return (
    <group
      ref={groupRef}
      position={device.position}
      onClick={onClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* Core orb with custom shader material */}
      <mesh ref={meshRef} material={shaderMaterial}>
        <icosahedronGeometry args={[size, 4]} />
      </mesh>

      {/* Glass shell layers - creates depth and refraction effect */}
      {glassLayerScales.map((scale, index) => (
        <mesh
          key={`glass-layer-${index}`}
          ref={(el) => {
            if (el) glassLayersRef.current[index] = el;
          }}
        >
          <sphereGeometry args={[size * scale * 1.1, 32, 32]} />
          <meshPhysicalMaterial
            color="#ffffff"
            metalness={0.1}
            roughness={0.05}
            transmission={0.95}
            thickness={0.5}
            transparent
            opacity={0.4 - index * 0.1}
            envMapIntensity={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
      ))}

      {/* Inner emissive core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[size * 0.4, 32, 32]} />
        <meshPhysicalMaterial
          color={coreColor}
          metalness={0.2}
          roughness={0.3}
          transmission={0.6}
          thickness={0.3}
          emissive={coreColor}
          emissiveIntensity={device.isOnline && !device.isPaused ? 0.6 : 0.2}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[size * 0.2, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.8} />
      </mesh>

      {/* Point light inside orb for bloom/glow effect */}
      <pointLight
        color={glowColor}
        intensity={
          device.isOnline && !device.isPaused
            ? orbProfile.glowIntensity * 2.5
            : orbProfile.glowIntensity * 0.8
        }
        distance={8}
        decay={2}
      />

      {/* Inner glow layer */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.3, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isHovered ? 0.35 : device.isOnline ? 0.15 : 0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer atmospheric glow */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isHovered ? 0.12 : device.isOnline ? 0.06 : 0.02}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Iridescent wireframe shell for online devices */}
      {device.isOnline && (
        <mesh>
          <icosahedronGeometry args={[size * 1.15, 2]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={isHovered ? 0.15 : 0.05}
            wireframe
          />
        </mesh>
      )}

      {/* Internal particle system for online/syncing devices */}
      {particleMaterial && (
        <points ref={particlesRef} geometry={particleGeometry} material={particleMaterial} />
      )}

      {/* Syncing ring animation */}
      {device.isSyncing && (
        <lineSegments ref={ringRef}>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" args={[ringPoints, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={glowColor} opacity={0.8} transparent linewidth={3} />
        </lineSegments>
      )}

      {/* Second syncing ring at different angle */}
      {device.isSyncing && (
        <group rotation={[Math.PI / 3, 0, 0]}>
          <lineSegments>
            <bufferGeometry attach="geometry">
              <bufferAttribute attach="attributes-position" args={[ringPoints, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={glowColor} opacity={0.5} transparent linewidth={2} />
          </lineSegments>
        </group>
      )}

      {/* Third syncing ring for extra emphasis */}
      {device.isSyncing && (
        <group rotation={[Math.PI / 2, Math.PI / 4, 0]}>
          <lineSegments>
            <bufferGeometry attach="geometry">
              <bufferAttribute attach="attributes-position" args={[ringPoints, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={glowColor} opacity={0.3} transparent linewidth={1} />
          </lineSegments>
        </group>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <Html
          center
          position={[0, size * 2.5, 0]}
          zIndexRange={[100, 0]}
          occlude={false}
          style={{
            transition: 'opacity 0.3s ease-in-out',
            opacity: 1,
            transform: 'translate3d(-50%, -100%, 0)',
          }}
        >
          <DeviceTooltip device={device} orbProfile={orbProfile} />
        </Html>
      )}
    </group>
  );
}
