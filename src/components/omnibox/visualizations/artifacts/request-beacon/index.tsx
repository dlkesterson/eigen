/**
 * Request Beacon — Pending Requests Artifact
 *
 * A rotating octahedral beacon for pending device/folder requests.
 * Features:
 * - Orange glowing octahedron with particle trails
 * - Pulsing animation when requests exist
 * - Touch-accessible request indicators
 * - Click request → enter Layer 3 glass panel (per UX guide)
 */

'use client';

import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { usePendingDevices, usePendingFolders } from '@/hooks/syncthing/pending';
import { useVisualizationStore } from '@/store/omnibox';
import { StatsPanel, StatsCard, IndicatorRing } from '../_shared';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface RequestBeaconProps {
  visible?: boolean;
}

interface PendingRequest {
  id: string;
  name: string;
  type: 'device' | 'folder';
  time?: string;
}

// =============================================================================
// Particle Trail Component
// =============================================================================

function ParticleTrail({ color }: { color: string }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 50;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.03} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// =============================================================================
// Pulse Ring Component
// =============================================================================

function PulseRing({ hasRequests }: { hasRequests: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current && hasRequests) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!hasRequests) return null;

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.7, 0.75, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

// =============================================================================
// Main Request Beacon Component
// =============================================================================

export function RequestBeacon({ visible = true }: RequestBeaconProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const isMobile = size.width < 768;
  const { enterRoom } = useVisualizationStore();

  const { data: pendingDevices } = usePendingDevices();
  const { data: pendingFolders } = usePendingFolders();

  // Calculate pending requests
  const metrics = useMemo(() => {
    const requests: PendingRequest[] = [];

    // Add pending devices
    if (pendingDevices) {
      Object.entries(pendingDevices).forEach(([deviceId, deviceData]) => {
        const data = deviceData as { name?: string; time?: string };
        requests.push({
          id: deviceId,
          name: data.name || deviceId.slice(0, 8),
          type: 'device',
          time: data.time,
        });
      });
    }

    // Add pending folders
    if (pendingFolders) {
      Object.entries(pendingFolders).forEach(([key, folderData]) => {
        const data = folderData as { label?: string; time?: string };
        requests.push({
          id: key,
          name: data.label || key.slice(0, 8),
          type: 'folder',
          time: data.time,
        });
      });
    }

    return {
      total: requests.length,
      devices: requests.filter((r) => r.type === 'device').length,
      folders: requests.filter((r) => r.type === 'folder').length,
      requests: requests.slice(0, 6),
      hasRequests: requests.length > 0,
    };
  }, [pendingDevices, pendingFolders]);

  const coreSize = isMobile ? 0.4 : 0.5;

  // Handle request click → enter glass panel room
  const handleRequestClick = useCallback(
    (requestId: string) => {
      const request = metrics.requests.find((r) => r.id === requestId);
      if (request) {
        enterRoom('pending-request', {
          entityId: requestId,
          entityLabel: request.name,
          data: { requestType: request.type },
        });
      }
    },
    [enterRoom, metrics.requests]
  );

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      // Faster rotation when there are pending requests
      const speed = metrics.hasRequests ? 0.3 : 0.1;
      meshRef.current.rotation.y = clock.getElapsedTime() * speed;
      meshRef.current.rotation.x = clock.getElapsedTime() * speed * 0.5;
      meshRef.current.rotation.z = clock.getElapsedTime() * speed * 0.25;

      // Subtle bobbing
      meshRef.current.position.y = Math.sin(clock.getElapsedTime() * 2) * 0.05;
    }
  });

  if (!visible) return null;

  // Convert requests to ring format
  const ringItems = metrics.requests.map((req) => ({
    id: req.id,
    label: req.name,
    sublabel: req.type === 'device' ? '📱 Device' : '📁 Folder',
    color: req.type === 'device' ? '#f59e0b' : '#fb923c',
    isActive: true,
  }));

  const beaconColor = metrics.hasRequests ? '#1a0f00' : '#0a0a0a';
  const glowColor = metrics.hasRequests ? '#f59e0b' : '#64748b';

  return (
    <group>
      {/* Main Octahedron Beacon */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[coreSize, 2]} />
        <MeshDistortMaterial
          color={beaconColor}
          roughness={0.1}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={0.5}
          radius={1}
          distort={metrics.hasRequests ? 0.35 : 0.2}
          speed={metrics.hasRequests ? 3 : 1}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh scale={coreSize * 0.7}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={metrics.hasRequests ? 0.3 : 0.1}
        />
      </mesh>

      {/* Pulse ring */}
      <PulseRing hasRequests={metrics.hasRequests} />

      {/* Particle trail */}
      {metrics.hasRequests && <ParticleTrail color={glowColor} />}

      {/* Orbit rings */}
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[0.85, 0.88, 64]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[0, Math.PI / 3, Math.PI / 2]}>
        <ringGeometry args={[0.9, 0.93, 64]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Touch-friendly indicator ring */}
      {metrics.requests.length > 0 && (
        <IndicatorRing
          items={ringItems}
          radius={isMobile ? 1.2 : 1.5}
          onClick={handleRequestClick}
        />
      )}

      {/* Stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="Pending Requests"
          value={metrics.total.toString()}
          color={metrics.hasRequests ? '#f59e0b' : '#64748b'}
          details={[
            { label: 'Devices', value: metrics.devices.toString(), color: '#f59e0b' },
            { label: 'Folders', value: metrics.folders.toString(), color: '#fb923c' },
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default RequestBeacon;
