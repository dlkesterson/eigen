/**
 * Health Dashboard Visualization
 *
 * Shows system-wide health monitoring with floating panels
 * displaying real-time stats, graphs, and alerts.
 */

'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSystemStatus, useConnections, useConfig, usePendingRequests } from '@/hooks/syncthing';
import { useFolderStatuses } from '@/hooks/syncthing/folders';
import { formatBytes } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface HealthMetric {
  id: string;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error';
  description?: string;
}

// =============================================================================
// Floating Panel
// =============================================================================

interface FloatingPanelProps {
  position: [number, number, number];
  title: string;
  children: React.ReactNode;
  visible?: boolean;
}

function FloatingPanel({ position, title, children, visible = true }: FloatingPanelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle floating animation
      const float = Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      groupRef.current.position.y = position[1] + float;
    }
  });

  // Don't render Html when not visible (Html ignores group visibility)
  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
      <Html center style={{ pointerEvents: 'none' }}>
        <div className="min-w-48 overflow-hidden rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
          <div className="border-b border-white/10 bg-white/5 px-4 py-2">
            <h3 className="text-sm font-medium text-white">{title}</h3>
          </div>
          <div className="px-4 py-3">{children}</div>
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Central Status Orb
// =============================================================================

interface CentralOrbProps {
  status: 'online' | 'offline' | 'syncing' | 'error';
}

function CentralOrb({ status }: CentralOrbProps) {
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const colors = {
    online: '#22c55e',
    offline: '#6b7280',
    syncing: '#3b82f6',
    error: '#ef4444',
  };

  const color = colors[status];

  useFrame((state) => {
    if (orbRef.current) {
      orbRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      orbRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.3;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      ringRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* Main orb */}
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
          wireframe
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Rotating ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.05, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Status label */}
      <Text position={[0, -2.5, 0]} fontSize={0.4} color={color} anchorX="center" anchorY="top">
        {status.toUpperCase()}
      </Text>
    </group>
  );
}

// =============================================================================
// Metric Display
// =============================================================================

interface MetricDisplayProps {
  metric: HealthMetric;
}

function MetricDisplay({ metric }: MetricDisplayProps) {
  const statusColors = {
    good: 'text-green-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  };

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{metric.label}</span>
      <span className={`text-sm font-medium ${statusColors[metric.status]}`}>{metric.value}</span>
    </div>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface HealthDashboardVisualizationProps {
  visible?: boolean;
}

export function HealthDashboardVisualization({
  visible = true,
}: HealthDashboardVisualizationProps) {
  const { data: status, isError: statusError } = useSystemStatus();
  const { data: connections } = useConnections();
  const { data: config } = useConfig();
  const { data: pendingRequests } = usePendingRequests();

  // Get folder IDs
  const folderIds = useMemo(() => {
    return config?.folders?.map((f: { id: string }) => f.id) || [];
  }, [config?.folders]);

  // Get statuses for all folders
  const folderStatuses = useFolderStatuses(folderIds);

  // Calculate health metrics
  const metrics = useMemo(() => {
    const connectedDevices = Object.values(connections?.connections || {}).filter(
      (c: { connected?: boolean }) => c?.connected
    ).length;
    const totalDevices = Object.keys(connections?.connections || {}).length;

    const inBytes = connections?.total?.inBytesTotal || 0;
    const outBytes = connections?.total?.outBytesTotal || 0;

    const pendingCount =
      (pendingRequests?.devices?.length || 0) + (pendingRequests?.folders?.length || 0);

    // Calculate folder sync status
    let syncedFolders = 0;
    let syncingFolders = 0;
    let errorFolders = 0;

    folderIds.forEach((id: string) => {
      const folderStatus = folderStatuses[id]?.data;
      if (folderStatus?.state === 'idle') syncedFolders++;
      else if (folderStatus?.state === 'syncing') syncingFolders++;
      if (folderStatus?.errors && (folderStatus.errors as number) > 0) errorFolders++;
    });

    return {
      devices: {
        id: 'devices',
        label: 'Devices',
        value: `${connectedDevices}/${totalDevices}`,
        status:
          connectedDevices === totalDevices ? 'good' : connectedDevices > 0 ? 'warning' : 'error',
      } as HealthMetric,
      folders: {
        id: 'folders',
        label: 'Folders',
        value: `${syncedFolders}/${folderIds.length}`,
        status: errorFolders > 0 ? 'error' : syncingFolders > 0 ? 'warning' : 'good',
      } as HealthMetric,
      download: {
        id: 'download',
        label: 'Downloaded',
        value: formatBytes(inBytes),
        status: 'good',
      } as HealthMetric,
      upload: {
        id: 'upload',
        label: 'Uploaded',
        value: formatBytes(outBytes),
        status: 'good',
      } as HealthMetric,
      pending: {
        id: 'pending',
        label: 'Pending',
        value: pendingCount.toString(),
        status: pendingCount > 0 ? 'warning' : 'good',
      } as HealthMetric,
      uptime: {
        id: 'uptime',
        label: 'Uptime',
        value: status?.uptime ? formatUptime(status.uptime) : 'Unknown',
        status: 'good',
      } as HealthMetric,
    };
  }, [connections, pendingRequests, folderIds, folderStatuses, status]);

  // Determine overall status
  const overallStatus = useMemo(() => {
    if (statusError) return 'offline';
    if (Object.values(metrics).some((m) => m.status === 'error')) return 'error';
    if (Object.values(metrics).some((m) => m.status === 'warning')) return 'syncing';
    return 'online';
  }, [statusError, metrics]);

  return (
    <group>
      {/* Central status orb */}
      <CentralOrb status={overallStatus} />

      {/* Device Status Panel */}
      <FloatingPanel position={[-6, 2, 0]} title="Device Status" visible={visible}>
        <MetricDisplay metric={metrics.devices} />
        <MetricDisplay metric={metrics.pending} />
      </FloatingPanel>

      {/* Folder Status Panel */}
      <FloatingPanel position={[6, 2, 0]} title="Folder Status" visible={visible}>
        <MetricDisplay metric={metrics.folders} />
        <MetricDisplay metric={metrics.uptime} />
      </FloatingPanel>

      {/* Transfer Stats Panel */}
      <FloatingPanel position={[-6, -2, 0]} title="Transfer Stats" visible={visible}>
        <MetricDisplay metric={metrics.download} />
        <MetricDisplay metric={metrics.upload} />
      </FloatingPanel>

      {/* System Info Panel */}
      <FloatingPanel position={[6, -2, 0]} title="System Info" visible={visible}>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-400">Version</span>
            <span className="text-xs text-white">{String(status?.version || 'Unknown')}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-400">Device ID</span>
            <span className="font-mono text-xs text-white">
              {status?.myID?.slice(0, 7) || '...'}
            </span>
          </div>
        </div>
      </FloatingPanel>

      {/* Grid floor */}
      <group position={[0, -4, 0]}>
        <gridHelper args={[30, 30, '#1e3a5f', '#0a1628']} />
      </group>
    </group>
  );
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default HealthDashboardVisualization;
