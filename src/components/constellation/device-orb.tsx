'use client';

import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, MeshDistortMaterial } from '@react-three/drei';

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
function DeviceTooltip({ device }: { device: DeviceOrbData }) {
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
  const fresnelRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle tooltip delay (1.5 seconds)
  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 1500);
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setShowTooltip(false);
    }

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isHovered]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (device.isSyncing && meshRef.current) {
      meshRef.current.rotation.y += 0.01;
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

    // Fresnel rim rotation
    if (fresnelRef.current) {
      fresnelRef.current.rotation.y = time * 0.5;
      fresnelRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
    }

    if (ringRef.current && device.isSyncing) {
      ringRef.current.rotation.z += 0.03;
    }

    // Hover scale animation
    if (meshRef.current) {
      const targetScale = isHovered ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const getOrbColor = (): [number, number, number] => {
    if (device.isPaused) return [0.5, 0.5, 0.1]; // Yellow/amber for paused
    if (!device.isOnline) return [0.15, 0.2, 0.35]; // Dim for offline
    if (device.isSyncing) return [0.2, 0.95, 1.0]; // Cyan for syncing
    return [0.25, 0.5, 0.95]; // Blue for connected
  };

  const getGlowColor = (): [number, number, number] => {
    if (device.isPaused) return [0.4, 0.4, 0.1];
    if (!device.isOnline) return [0.1, 0.12, 0.2];
    if (device.isSyncing) return [0.2, 1.0, 1.0];
    return [0.15, 0.6, 1.0];
  };

  const orbColor = getOrbColor();
  const glowColor = getGlowColor();
  const size = device.isLocal ? 1.2 : 0.6;

  // Generate ring points for syncing animation
  const ringPoints = (() => {
    const points: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      points.push(Math.cos(angle) * (size * 1.8), 0, Math.sin(angle) * (size * 1.8));
    }
    return new Float32Array(points);
  })();

  return (
    <group
      position={device.position}
      onClick={onClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* Core distorted orb with organic movement */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[size, 4]} />
        <MeshDistortMaterial
          color={new THREE.Color(...orbColor)}
          metalness={0.9}
          roughness={0.1}
          emissive={new THREE.Color(...orbColor)}
          emissiveIntensity={isHovered ? 1.5 : device.isSyncing ? 1.0 : 0.5}
          distort={device.isSyncing ? 0.3 : isHovered ? 0.15 : 0.05}
          speed={device.isSyncing ? 4 : 2}
        />
      </mesh>

      {/* Fresnel rim glow - creates edge lighting effect */}
      <mesh ref={fresnelRef}>
        <icosahedronGeometry args={[size * 1.05, 3]} />
        <meshBasicMaterial
          color={new THREE.Color(...glowColor)}
          transparent
          opacity={isHovered ? 0.4 : device.isOnline ? 0.2 : 0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Inner glow layer */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.3, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(...glowColor)}
          transparent
          opacity={isHovered ? 0.35 : device.isOnline ? 0.15 : 0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer atmospheric glow */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(...glowColor)}
          transparent
          opacity={isHovered ? 0.12 : device.isOnline ? 0.06 : 0.02}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Iridescent shell - creates holographic effect */}
      {device.isOnline && (
        <mesh>
          <icosahedronGeometry args={[size * 1.15, 2]} />
          <meshBasicMaterial
            color={new THREE.Color(0.5, 0.8, 1.0)}
            transparent
            opacity={isHovered ? 0.15 : 0.05}
            wireframe
          />
        </mesh>
      )}

      {/* Syncing ring animation */}
      {device.isSyncing && (
        <lineSegments ref={ringRef}>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" args={[ringPoints, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={new THREE.Color(...orbColor)}
            opacity={0.8}
            transparent
            linewidth={3}
          />
        </lineSegments>
      )}

      {/* Second syncing ring at different angle */}
      {device.isSyncing && (
        <group rotation={[Math.PI / 3, 0, 0]}>
          <lineSegments>
            <bufferGeometry attach="geometry">
              <bufferAttribute attach="attributes-position" args={[ringPoints, 3]} />
            </bufferGeometry>
            <lineBasicMaterial
              color={new THREE.Color(...orbColor)}
              opacity={0.5}
              transparent
              linewidth={2}
            />
          </lineSegments>
        </group>
      )}

      {/* Tooltip - only shows after 1.5s hover */}
      {/* Using fixed size tooltip that doesn't scale with 3D distance */}
      {showTooltip && (
        <Html
          center
          position={[0, size * 2.5, 0]}
          zIndexRange={[100, 0]}
          occlude={false}
          style={{
            transition: 'opacity 0.3s ease-in-out',
            opacity: showTooltip ? 1 : 0,
            transform: 'translate3d(-50%, -100%, 0)',
          }}
        >
          <DeviceTooltip device={device} />
        </Html>
      )}
    </group>
  );
}
