/**
 * Nexus Prism — Device Topology Artifact
 *
 * A distorted metallic icosahedron representing the device network.
 * Features:
 * - MeshDistortMaterial for organic, liquid metal look
 * - Touch-accessible device indicators at static positions
 * - Camera-facing stats overlay always visible
 * - Click device → enter Layer 3 glass panel (per UX guide)
 */

'use client';

import { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import { useConnections, useConfig } from '@/hooks/syncthing';
import { useVisualizationStore } from '@/store/omnibox';
import { StatsPanel, StatsCard, IndicatorRing } from '../_shared';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface NexusPrismProps {
  visible?: boolean;
}

// =============================================================================
// Format bytes helper
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// =============================================================================
// Main Nexus Prism Component
// =============================================================================

export function NexusPrism({ visible = true }: NexusPrismProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const isMobile = size.width < 768;
  const { enterRoom } = useVisualizationStore();

  const { data: connections } = useConnections();
  const { data: config } = useConfig();

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    const connectionList = connections?.connections || {};
    const devices = config?.devices || [];

    const deviceMap = new Map<string, string>();
    devices.forEach((d: { deviceID: string; name?: string }) => {
      deviceMap.set(d.deviceID, d.name || d.deviceID.slice(0, 8));
    });

    const totalDevices = devices.length;
    let onlineCount = 0;
    let inBytes = 0;
    let outBytes = 0;

    const deviceConnections = Object.entries(connectionList).map(([id, conn]) => {
      const c = conn as { connected?: boolean; inBytesTotal?: number; outBytesTotal?: number };
      if (c.connected) onlineCount++;
      inBytes += c.inBytesTotal || 0;
      outBytes += c.outBytesTotal || 0;

      return {
        id,
        name: deviceMap.get(id) || id.slice(0, 8),
        isOnline: c.connected ?? false,
      };
    });

    return {
      onlineCount,
      totalDevices,
      inBytes,
      outBytes,
      totalTransfer: formatBytes(inBytes + outBytes),
      deviceConnections,
    };
  }, [connections, config]);

  const coreSize = isMobile ? 0.6 : 0.8;

  // Handle device click → enter glass panel room
  const handleDeviceClick = useCallback(
    (deviceId: string) => {
      const device = metrics.deviceConnections.find((d) => d.id === deviceId);
      enterRoom('device-details', {
        entityId: deviceId,
        entityLabel: device?.name || deviceId.slice(0, 8),
      });
    },
    [enterRoom, metrics.deviceConnections]
  );

  // Slow rotation
  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

  if (!visible) return null;

  // Convert devices to ring format (max 8)
  const ringItems = metrics.deviceConnections.slice(0, 8).map((device) => ({
    id: device.id,
    label: device.name,
    sublabel: device.isOnline ? 'Online' : 'Offline',
    color: device.isOnline ? '#22d3ee' : '#64748b',
    isActive: device.isOnline,
  }));

  return (
    <group>
      {/* Main Distorted Icosahedron */}
      <Icosahedron ref={meshRef} args={[coreSize, 4]}>
        <MeshDistortMaterial
          color="#010101"
          roughness={0.1}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={0.4}
          speed={2}
        />
      </Icosahedron>

      {/* Status ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[coreSize + 0.15, coreSize + 0.25, 64]} />
        <meshBasicMaterial
          color={metrics.onlineCount > 0 ? '#22d3ee' : '#64748b'}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Device indicator ring */}
      {ringItems.length > 0 && (
        <IndicatorRing items={ringItems} radius={coreSize + 0.9} onClick={handleDeviceClick} />
      )}

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="Devices Online"
          value={`${metrics.onlineCount}/${metrics.totalDevices}`}
          color={metrics.onlineCount > 0 ? '#22d3ee' : '#64748b'}
          details={[
            { label: 'Download', value: formatBytes(metrics.inBytes), color: '#22c55e' },
            { label: 'Upload', value: formatBytes(metrics.outBytes), color: '#3b82f6' },
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default NexusPrism;
