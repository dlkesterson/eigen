/**
 * Info Beacon
 *
 * A 3D-tracked, screen-space responsive tooltip/info panel that follows
 * objects in 3D space. Works consistently across all screen sizes.
 *
 * Features:
 * - Tracks 3D object position
 * - Responsive positioning that never gets cut off
 * - Consistent styling across visualizations
 * - Optional tap-to-pin on mobile
 *
 * Usage:
 * ```tsx
 * {isHovered && meshRef.current && (
 *   <InfoBeacon target={meshRef.current} offset={[0, 2, 0]}>
 *     <div className="font-bold">{device.name}</div>
 *     <div className="text-cyan-400">Status: Online</div>
 *   </InfoBeacon>
 * )}
 * ```
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

export interface InfoBeaconProps {
  /** The 3D object to track */
  target: THREE.Object3D;
  /** Content to display in the tooltip */
  children: React.ReactNode;
  /** Offset from target position [x, y, z] */
  offset?: [number, number, number];
  /** Maximum width of the tooltip */
  maxWidth?: string;
  /** Whether the beacon is visible */
  visible?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Disable pointer events (default: true for tooltips) */
  pointerEvents?: boolean;
}

// =============================================================================
// Info Beacon Component
// =============================================================================

export function InfoBeacon({
  target,
  children,
  offset = [0, 2, 0],
  maxWidth = '20rem',
  visible = true,
  className = '',
  pointerEvents = false,
}: InfoBeaconProps) {
  const { camera: _camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const tempVector = useMemo(() => new THREE.Vector3(), []);
  const offsetVector = useMemo(() => new THREE.Vector3(...offset), [offset]);

  // Update position every frame to track the target
  useFrame(() => {
    if (!groupRef.current || !target) return;

    // Get target world position
    target.getWorldPosition(tempVector);

    // Apply offset
    tempVector.add(offsetVector);

    // Update group position
    groupRef.current.position.copy(tempVector);
  });

  if (!visible) return null;

  // Calculate responsive positioning based on screen size
  const isMobile = size.width < 768;

  return (
    <group ref={groupRef}>
      <Html
        center
        style={{
          pointerEvents: pointerEvents ? 'auto' : 'none',
          transform: 'translate3d(-50%, -100%, 0)',
        }}
        distanceFactor={isMobile ? 12 : 10}
        occlude={false}
      >
        <div
          className={`rounded-xl border border-white/20 bg-black/90 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-md ${className} `}
          style={{ maxWidth }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Preset Styled Variants
// =============================================================================

export interface DeviceInfoBeaconProps extends Omit<InfoBeaconProps, 'children'> {
  name: string;
  status?: 'online' | 'offline' | 'syncing' | 'paused';
  inRate?: number;
  outRate?: number;
}

const STATUS_COLORS = {
  online: 'text-green-400',
  offline: 'text-gray-400',
  syncing: 'text-cyan-400',
  paused: 'text-amber-400',
} as const;

function formatRate(bytes: number): string {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function DeviceInfoBeacon({
  name,
  status = 'offline',
  inRate = 0,
  outRate = 0,
  ...props
}: DeviceInfoBeaconProps) {
  return (
    <InfoBeacon {...props}>
      <div className="space-y-1">
        <div className="font-bold">{name}</div>
        <div className={`text-xs ${STATUS_COLORS[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
        {(inRate > 0 || outRate > 0) && (
          <div className="flex gap-3 pt-1 text-xs">
            {outRate > 0 && <span className="text-cyan-400">↑ {formatRate(outRate)}</span>}
            {inRate > 0 && <span className="text-green-400">↓ {formatRate(inRate)}</span>}
          </div>
        )}
      </div>
    </InfoBeacon>
  );
}

export interface FolderInfoBeaconProps extends Omit<InfoBeaconProps, 'children'> {
  name: string;
  path?: string;
  size?: number;
  completion?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function FolderInfoBeacon({
  name,
  path,
  size,
  completion,
  ...props
}: FolderInfoBeaconProps) {
  return (
    <InfoBeacon {...props}>
      <div className="space-y-1">
        <div className="font-bold">{name}</div>
        {path && <div className="truncate text-xs text-gray-400">{path}</div>}
        {size !== undefined && <div className="text-xs text-purple-400">{formatBytes(size)}</div>}
        {completion !== undefined && (
          <div className="flex items-center gap-2 pt-1">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{completion.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </InfoBeacon>
  );
}

export default InfoBeacon;
