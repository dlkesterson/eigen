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
import { formatBytes, formatRate, cn } from '@/lib/utils';
import { useShellTheme } from './LiminalShell';
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
  const { isDark } = useShellTheme();
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
          className={cn(
            'rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md',
            isDark
              ? 'border-white/20 bg-black/90 text-white'
              : 'border-gray-300/50 bg-white/90 text-gray-900',
            className
          )}
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

export function FolderInfoBeacon({
  name,
  path,
  size,
  completion,
  ...props
}: FolderInfoBeaconProps) {
  const { isDark } = useShellTheme();

  return (
    <InfoBeacon {...props}>
      <div className="space-y-1">
        <div className="font-bold">{name}</div>
        {path && (
          <div className={cn('truncate text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {path}
          </div>
        )}
        {size !== undefined && (
          <div className={cn('text-xs', isDark ? 'text-purple-400' : 'text-purple-600')}>
            {formatBytes(size)}
          </div>
        )}
        {completion !== undefined && (
          <div className="flex items-center gap-2 pt-1">
            <div
              className={cn(
                'h-1.5 flex-1 overflow-hidden rounded-full',
                isDark ? 'bg-white/10' : 'bg-gray-200'
              )}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
              {completion.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </InfoBeacon>
  );
}

export default InfoBeacon;
