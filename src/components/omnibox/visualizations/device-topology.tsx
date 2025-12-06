/**
 * Device Topology Visualization
 *
 * Shows devices as 3D nodes in a constellation pattern with animated connections.
 * This is the default/home visualization.
 */

'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSystemStatus, useConnections, useConfig } from '@/hooks/syncthing';
import { DeviceOrb, type DeviceOrbData } from '@/components/constellation/device-orb';
import { ConnectionWire } from '@/components/constellation/connection-wire';
import { ParticleFlow } from '@/components/constellation/particle-flow';

// =============================================================================
// Dust Particles (Atmospheric Effect)
// =============================================================================

const DUST_PARTICLES = Array.from({ length: 50 }).map((_, i) => ({
  id: i,
  position: [Math.random() * 60 - 30, Math.random() * 40 - 20, Math.random() * 60 - 30] as [
    number,
    number,
    number,
  ],
  size: Math.random() * 0.05 + 0.01,
  opacity: Math.random() * 0.3 + 0.05,
}));

const dustGeometry = new THREE.SphereGeometry(0.03, 6, 6);
const dustMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0.2, 0.4, 0.6),
  transparent: true,
  opacity: 0.15,
});

function CosmicDust() {
  return (
    <group>
      {DUST_PARTICLES.map((particle) => (
        <mesh
          key={`dust-${particle.id}`}
          position={particle.position}
          geometry={dustGeometry}
          material={dustMaterial}
        />
      ))}
    </group>
  );
}

// =============================================================================
// Selection Ring
// =============================================================================

interface SelectionRingProps {
  position: [number, number, number];
}

function SelectionRing({ position }: SelectionRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      ringRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.8, 2, 32]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface DeviceTopologyVisualizationProps {
  selectedDevices?: string[];
  visible?: boolean;
}

export function DeviceTopologyVisualization({
  selectedDevices = [],
  visible: _visible = true,
}: DeviceTopologyVisualizationProps) {
  const { data: status } = useSystemStatus();
  const { data: connections } = useConnections();
  const { data: config } = useConfig();

  // Calculate device positions in 3D space (orbital layout)
  const devices = useMemo<DeviceOrbData[]>(() => {
    if (!config?.devices || !status?.myID) return [];

    const result: DeviceOrbData[] = [];
    const remoteDevices = config.devices.filter(
      (d: { deviceID: string }) => d.deviceID !== status.myID
    );
    const angleStep = (2 * Math.PI) / Math.max(remoteDevices.length, 1);

    // Local device at center
    result.push({
      id: status.myID,
      name: 'This Device',
      position: [0, 0, 0],
      isLocal: true,
      isOnline: true,
      isSyncing: false,
      isPaused: false,
    });

    // Remote devices in orbital positions
    remoteDevices.forEach(
      (device: { deviceID: string; name?: string; paused?: boolean }, index: number) => {
        const angle = index * angleStep;
        const radius = 8;
        // Use deterministic height based on index for consistent rendering
        const seededRandom = Math.sin(index * 9999) * 10000;
        const height = (seededRandom - Math.floor(seededRandom) - 0.5) * 4;

        const connectionInfo = connections?.connections?.[device.deviceID];
        const isOnline = connectionInfo?.connected ?? false;
        const inBytes =
          typeof connectionInfo?.inBytesTotal === 'number' ? connectionInfo.inBytesTotal : 0;
        const outBytes =
          typeof connectionInfo?.outBytesTotal === 'number' ? connectionInfo.outBytesTotal : 0;
        const isSyncing = isOnline && (inBytes > 0 || outBytes > 0);

        result.push({
          id: device.deviceID,
          name: device.name || device.deviceID.slice(0, 8),
          position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
          isLocal: false,
          isOnline,
          isSyncing,
          isPaused: device.paused ?? false,
        });
      }
    );

    return result;
  }, [config, status, connections]);

  // Build connection data
  const connectionData = useMemo(() => {
    if (!status?.myID || !connections?.connections) return [];

    return Object.entries(connections.connections).map(([deviceId, conn]) => {
      const inBytes = typeof conn.inBytesTotal === 'number' ? conn.inBytesTotal : 0;
      const outBytes = typeof conn.outBytesTotal === 'number' ? conn.outBytesTotal : 0;
      return {
        from: status.myID!,
        to: deviceId,
        isSyncing: (conn.connected ?? false) && (inBytes > 0 || outBytes > 0),
      };
    });
  }, [status, connections]);

  const localDevice = devices.find((d) => d.isLocal);
  const remoteDevices = devices.filter((d) => !d.isLocal);

  return (
    <group>
      {/* Cosmic dust particles */}
      <CosmicDust />

      {/* Device constellation */}
      <group>
        {/* Local device (center) */}
        {localDevice && (
          <group>
            <DeviceOrb device={localDevice} />
            {selectedDevices.includes(localDevice.id) && (
              <SelectionRing position={localDevice.position} />
            )}
          </group>
        )}

        {/* Remote devices with connections */}
        {remoteDevices.map((device) => {
          const connection = connectionData.find((c) => c.to === device.id);
          const isSyncing = connection?.isSyncing ?? false;
          const isSelected = selectedDevices.includes(device.id);

          return (
            <group key={device.id}>
              <DeviceOrb device={device} />

              {isSelected && <SelectionRing position={device.position} />}

              {/* Connection wire from center */}
              {localDevice && (
                <ConnectionWire
                  fromPos={localDevice.position}
                  toPos={device.position}
                  isActive={isSyncing}
                />
              )}

              {/* Particle flow for syncing devices */}
              {localDevice && isSyncing && (
                <ParticleFlow fromPos={localDevice.position} toPos={device.position} />
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}

export default DeviceTopologyVisualization;
