/**
 * Sync Flow Visualization
 *
 * Shows real-time data transfer animation with particle systems
 * representing file transfers between devices.
 */

'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSystemStatus, useConnections, useConfig } from '@/hooks/syncthing';
import { formatBytes } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface TransferData {
  deviceId: string;
  deviceName: string;
  position: [number, number, number];
  inRate: number;
  outRate: number;
  isConnected: boolean;
}

// =============================================================================
// Data Flow Particle System
// =============================================================================

interface DataFlowProps {
  from: [number, number, number];
  to: [number, number, number];
  rate: number; // bytes per second
  direction: 'in' | 'out';
}

function DataFlow({ from, to, rate, direction }: DataFlowProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.min(50, Math.max(5, Math.floor(rate / 10000)));

  // Seeded random function for deterministic positioning
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = from[0] + seededRandom(i * 1.1) * 0.5 - 0.25;
      pos[i * 3 + 1] = from[1] + seededRandom(i * 2.3) * 0.5 - 0.25;
      pos[i * 3 + 2] = from[2] + seededRandom(i * 3.7) * 0.5 - 0.25;
      vel[i] = seededRandom(i * 4.9) * 0.5 + 0.5;
    }

    return [pos, vel];
  }, [from, particleCount]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    const dirX = to[0] - from[0];
    const dirY = to[1] - from[1];
    const dirZ = to[2] - from[2];
    const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

    for (let i = 0; i < particleCount; i++) {
      const speed = velocities[i] * delta * 5;

      posArray[i * 3] += (dirX / dist) * speed;
      posArray[i * 3 + 1] += (dirY / dist) * speed;
      posArray[i * 3 + 2] += (dirZ / dist) * speed;

      // Check if particle reached destination
      const px = posArray[i * 3];
      const py = posArray[i * 3 + 1];
      const pz = posArray[i * 3 + 2];
      const distToEnd = Math.sqrt(
        Math.pow(px - to[0], 2) + Math.pow(py - to[1], 2) + Math.pow(pz - to[2], 2)
      );

      if (distToEnd < 0.5) {
        // Reset particle to start
        posArray[i * 3] = from[0] + Math.random() * 0.5 - 0.25;
        posArray[i * 3 + 1] = from[1] + Math.random() * 0.5 - 0.25;
        posArray[i * 3 + 2] = from[2] + Math.random() * 0.5 - 0.25;
      }
    }

    posAttr.needsUpdate = true;
  });

  const color = direction === 'in' ? '#22c55e' : '#3b82f6';

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// =============================================================================
// Transfer Node
// =============================================================================

interface TransferNodeProps {
  data: TransferData;
  localPosition: [number, number, number];
  visible?: boolean;
}

function TransferNode({ data, localPosition, visible = true }: TransferNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const hasTransfer = data.inRate > 0 || data.outRate > 0;

  useFrame((state) => {
    if (meshRef.current && hasTransfer) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const color = !data.isConnected ? '#6b7280' : hasTransfer ? '#22d3ee' : '#1e3a5f';

  return (
    <group position={data.position}>
      {/* Device node */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hasTransfer ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Device name */}
      <Text position={[0, -1.5, 0]} fontSize={0.4} color="white" anchorX="center" anchorY="top">
        {data.deviceName}
      </Text>

      {/* Transfer rates */}
      {hasTransfer && visible && (
        <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="rounded-lg bg-black/80 px-2 py-1 text-xs whitespace-nowrap text-white backdrop-blur-sm">
            {data.inRate > 0 && (
              <div className="text-green-400">↓ {formatBytes(data.inRate)}/s</div>
            )}
            {data.outRate > 0 && (
              <div className="text-blue-400">↑ {formatBytes(data.outRate)}/s</div>
            )}
          </div>
        </Html>
      )}

      {/* Data flow particles */}
      {data.isConnected && data.inRate > 0 && (
        <DataFlow from={data.position} to={localPosition} rate={data.inRate} direction="in" />
      )}
      {data.isConnected && data.outRate > 0 && (
        <DataFlow from={localPosition} to={data.position} rate={data.outRate} direction="out" />
      )}
    </group>
  );
}

// =============================================================================
// Central Hub
// =============================================================================

interface CentralHubProps {
  totalIn: number;
  totalOut: number;
  visible?: boolean;
}

function CentralHub({ totalIn, totalOut, visible = true }: CentralHubProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const hasActivity = totalIn > 0 || totalOut > 0;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

      if (hasActivity) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#0ea5e9"
          emissiveIntensity={hasActivity ? 0.5 : 0.2}
          roughness={0.2}
          metalness={0.8}
          wireframe
        />
      </mesh>

      {/* Core */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color="#0c4a6e"
          emissive="#0284c7"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Label */}
      <Text position={[0, -2, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="top">
        This Device
      </Text>

      {/* Total throughput */}
      {hasActivity && visible && (
        <Html position={[0, 2, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="rounded-lg bg-black/80 px-3 py-2 text-sm text-white backdrop-blur-sm">
            <div className="mb-1 font-medium">Total Throughput</div>
            <div className="text-green-400">↓ {formatBytes(totalIn)}/s</div>
            <div className="text-blue-400">↑ {formatBytes(totalOut)}/s</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface SyncFlowVisualizationProps {
  visible?: boolean;
}

export function SyncFlowVisualization({ visible = true }: SyncFlowVisualizationProps) {
  const { data: status } = useSystemStatus();
  const { data: connections } = useConnections();
  const { data: config } = useConfig();

  // Build transfer data
  const transferData = useMemo<TransferData[]>(() => {
    if (!config?.devices || !status?.myID || !connections?.connections) return [];

    const remoteDevices = config.devices.filter(
      (d: { deviceID: string }) => d.deviceID !== status.myID
    );
    const angleStep = (2 * Math.PI) / Math.max(remoteDevices.length, 1);
    const radius = 8;

    return remoteDevices.map((device: { deviceID: string; name?: string }, index: number) => {
      const angle = index * angleStep - Math.PI / 2;
      const conn = connections.connections?.[device.deviceID];

      return {
        deviceId: device.deviceID,
        deviceName: device.name || device.deviceID.slice(0, 8),
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [
          number,
          number,
          number,
        ],
        inRate: (conn?.inBytesTotal as number) || 0,
        outRate: (conn?.outBytesTotal as number) || 0,
        isConnected: conn?.connected ?? false,
      };
    });
  }, [config?.devices, status?.myID, connections?.connections]);

  // Calculate totals
  const totalIn = connections?.total?.inBytesTotal || 0;
  const totalOut = connections?.total?.outBytesTotal || 0;
  const localPosition: [number, number, number] = [0, 0, 0];

  return (
    <group>
      {/* Central hub */}
      <CentralHub totalIn={totalIn} totalOut={totalOut} visible={visible} />

      {/* Transfer nodes */}
      {transferData.map((data) => (
        <TransferNode
          key={data.deviceId}
          data={data}
          localPosition={localPosition}
          visible={visible}
        />
      ))}

      {/* Connection lines */}
      {transferData.map((data) => (
        <line key={`line-${data.deviceId}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([...localPosition, ...data.position]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={data.isConnected ? '#1e3a5f' : '#0f172a'}
            transparent
            opacity={data.isConnected ? 0.5 : 0.2}
          />
        </line>
      ))}
    </group>
  );
}

export default SyncFlowVisualization;
