/**
 * Heart — Health Dashboard Artifact
 *
 * A pulsing organic shape representing system health.
 * Features:
 * - MeshDistortMaterial with pulsing distortion
 * - Touch-accessible indicators with static positions
 * - Camera-facing stats overlay always visible
 * - Theme-aware styling (dark/light mode)
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import { useConnections, useConfig } from '@/hooks/syncthing';
import { useFolderStatuses } from '@/hooks/syncthing/folders';
import { usePendingDevices, usePendingFolders } from '@/hooks/syncthing/pending';
import { StatsPanel, StatsCard, IndicatorRing } from '../_shared';
import { useShellTheme } from '../../_shell/LiminalShell';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

interface HeartProps {
  visible?: boolean;
}

type HealthLevel = 'healthy' | 'warning' | 'critical';

const HEALTH_COLORS: Record<HealthLevel, string> = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
};

// =============================================================================
// Main Heart Component
// =============================================================================

export function Heart({ visible = true }: HeartProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const { isDark } = useShellTheme();
  const isMobile = size.width < 768;

  const { data: connections } = useConnections();
  const { data: config } = useConfig();
  const { data: pendingDevices } = usePendingDevices();
  const { data: pendingFolders } = usePendingFolders();

  const folderIds = useMemo(() => {
    return (config?.folders || []).map((f: { id: string }) => f.id);
  }, [config?.folders]);

  const folderStatusQueries = useFolderStatuses(folderIds);

  const metrics = useMemo(() => {
    const connectionList = connections?.connections || {};
    const folders = config?.folders || [];

    // Connection health
    const totalDevices = Object.keys(connectionList).length;
    const onlineDevices = Object.values(connectionList).filter(
      (c: unknown) => (c as { connected?: boolean }).connected
    ).length;
    const connectionHealth: HealthLevel =
      totalDevices === 0 ? 'healthy' : onlineDevices / totalDevices > 0.5 ? 'healthy' : 'warning';

    // Folder health
    let foldersWithErrors = 0;
    folders.forEach((folder: { id: string }) => {
      const statusQuery = folderStatusQueries[folder.id];
      const folderStatus = statusQuery?.data;
      if (typeof folderStatus?.errors === 'number' && folderStatus.errors > 0) {
        foldersWithErrors++;
      }
    });
    const folderHealth: HealthLevel =
      foldersWithErrors === 0 ? 'healthy' : foldersWithErrors > 2 ? 'critical' : 'warning';

    // Pending requests health
    const pendingCount =
      (pendingDevices ? Object.keys(pendingDevices).length : 0) +
      (pendingFolders ? Object.keys(pendingFolders).length : 0);
    const pendingHealth: HealthLevel =
      pendingCount === 0 ? 'healthy' : pendingCount > 3 ? 'warning' : 'healthy';

    // Overall health
    const overallHealth: HealthLevel =
      folderHealth === 'critical'
        ? 'critical'
        : folderHealth === 'warning' || connectionHealth === 'warning'
          ? 'warning'
          : 'healthy';

    return {
      overall: overallHealth,
      indicators: [
        {
          id: 'connections',
          label: 'Connections',
          sublabel: `${onlineDevices}/${totalDevices}`,
          status: connectionHealth,
        },
        {
          id: 'folders',
          label: 'Folders',
          sublabel: foldersWithErrors > 0 ? `${foldersWithErrors} errors` : 'OK',
          status: folderHealth,
        },
        {
          id: 'pending',
          label: 'Pending',
          sublabel: pendingCount > 0 ? `${pendingCount} items` : 'None',
          status: pendingHealth,
        },
      ],
      onlineDevices,
      totalDevices,
      foldersWithErrors,
      pendingCount,
    };
  }, [connections, config, folderStatusQueries, pendingDevices, pendingFolders]);

  const coreSize = isMobile ? 0.6 : 0.8;

  // Pulsing heartbeat animation
  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      const time = clock.getElapsedTime();
      const pulse = Math.sin(time * 2) * 0.5 + 0.5;
      const scale = 1 + pulse * 0.08;
      meshRef.current.scale.setScalar(scale);
      meshRef.current.rotation.y = time * 0.1;
    }
  });

  if (!visible) return null;

  // Convert indicators to ring format
  const ringItems = metrics.indicators.map((ind) => ({
    id: ind.id,
    label: ind.label,
    sublabel: ind.sublabel,
    color: HEALTH_COLORS[ind.status],
    isActive: ind.status !== 'healthy',
  }));

  return (
    <group>
      {/* Main Heart */}
      <Icosahedron ref={meshRef} args={[coreSize, 4]}>
        <MeshDistortMaterial
          color={isDark ? '#020202' : '#e8e8e8'}
          roughness={isDark ? 0.1 : 0.3}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={1}
          radius={1}
          distort={0.35}
          speed={metrics.overall === 'healthy' ? 2 : 4}
        />
      </Icosahedron>

      {/* Glow ring for status */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[coreSize + 0.15, coreSize + 0.25, 64]} />
        <meshBasicMaterial
          color={HEALTH_COLORS[metrics.overall]}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Static indicator ring */}
      <IndicatorRing items={ringItems} radius={coreSize + 0.9} />

      {/* Camera-facing stats panel */}
      <StatsPanel position="bottom">
        <StatsCard
          title="System Health"
          value={metrics.overall.charAt(0).toUpperCase() + metrics.overall.slice(1)}
          color={HEALTH_COLORS[metrics.overall]}
          details={[
            {
              label: 'Devices',
              value: `${metrics.onlineDevices}/${metrics.totalDevices}`,
              color: HEALTH_COLORS[metrics.indicators[0].status],
            },
            ...(metrics.foldersWithErrors > 0
              ? [{ label: 'Errors', value: String(metrics.foldersWithErrors), color: '#ef4444' }]
              : []),
            ...(metrics.pendingCount > 0
              ? [{ label: 'Pending', value: String(metrics.pendingCount), color: '#f59e0b' }]
              : []),
          ]}
        />
      </StatsPanel>
    </group>
  );
}

export default Heart;
