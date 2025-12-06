/**
 * Shared UI Components for Artifacts
 *
 * Touch-accessible, camera-facing overlay components that display
 * data persistently in front of the camera.
 * Theme-aware styling (dark/light mode).
 */

'use client';

import { Html } from '@react-three/drei';
import { useShellTheme } from '../../_shell/LiminalShell';

// =============================================================================
// Camera-Facing Billboard
// =============================================================================

/**
 * A camera-facing HTML overlay for 3D scenes.
 * Wraps content in Html component so it renders correctly in R3F.
 */
export function Billboard({ children }: { children: React.ReactNode }) {
  return (
    <Html center occlude={false} zIndexRange={[100, 0]} style={{ pointerEvents: 'auto' }}>
      {children}
    </Html>
  );
}

// =============================================================================
// Fixed Stats Panel
// =============================================================================

export interface StatsPanelProps {
  children: React.ReactNode;
  position?: 'bottom' | 'top' | 'center';
}

/**
 * A fixed HTML panel that's always in front of the camera.
 * Uses Html with proper settings for persistent visibility.
 */
export function StatsPanel({ children, position = 'bottom' }: StatsPanelProps) {
  const yPos = position === 'top' ? 1.5 : position === 'center' ? 0 : -1.5;

  return (
    <Html
      position={[0, yPos, 1.5]}
      center
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      transform={false}
      sprite
    >
      <div className="pointer-events-auto touch-manipulation">{children}</div>
    </Html>
  );
}

// =============================================================================
// Touch-Friendly Indicator
// =============================================================================

export interface IndicatorProps {
  label: string;
  sublabel?: string;
  color: string;
  isActive?: boolean;
  angle: number;
  radius: number;
  onClick?: () => void;
}

/**
 * A touch-friendly indicator that stays at a fixed position around the artifact.
 * Larger hit area for touch, always visible labels.
 */
export function TouchIndicator({
  label,
  sublabel,
  color,
  isActive = true,
  angle,
  radius,
  onClick,
}: IndicatorProps) {
  const { isDark } = useShellTheme();
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return (
    <group position={[x, 0, z]}>
      {/* Larger touch target */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 0.6 : 0.2}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={isActive ? 1 : 0.6}
        />
      </mesh>

      {/* Always-visible label using Html sprite */}
      <Html
        position={[0, 0.3, 0]}
        center
        zIndexRange={[50, 0]}
        sprite
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="flex flex-col items-center whitespace-nowrap"
          style={{ opacity: isActive ? 1 : 0.5 }}
        >
          <span
            className={`rounded-full px-2 py-1 text-[11px] font-medium backdrop-blur-md ${
              isDark ? 'bg-black/80' : 'bg-white/90'
            }`}
            style={{ color }}
          >
            {label}
          </span>
          {sublabel && (
            <span className={`mt-0.5 text-[9px] ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              {sublabel}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Primary Stats Card
// =============================================================================

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  details?: Array<{ label: string; value: string; color?: string }>;
}

export function StatsCard({ title, value, subtitle, color = '#ffffff', details }: StatsCardProps) {
  const { isDark } = useShellTheme();

  return (
    <div
      className={`flex min-w-[180px] flex-col items-center gap-2 rounded-xl border px-5 py-4 shadow-2xl backdrop-blur-xl ${
        isDark ? 'border-white/10 bg-black/80' : 'border-slate-200/50 bg-white/85'
      }`}
    >
      {/* Main value */}
      <div className="text-4xl font-light tabular-nums" style={{ color }}>
        {value}
      </div>

      {/* Title */}
      <div
        className={`text-sm font-medium tracking-wider uppercase ${isDark ? 'text-white/70' : 'text-slate-600'}`}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{subtitle}</div>
      )}

      {/* Details row */}
      {details && details.length > 0 && (
        <div
          className={`mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t pt-2 ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          {details.map((detail, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className={isDark ? 'text-white/50' : 'text-slate-500'}>{detail.label}:</span>
              <span style={{ color: detail.color || (isDark ? '#ffffff' : '#1e293b') }}>
                {detail.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Indicator Ring (for layout)
// =============================================================================

export interface IndicatorRingProps {
  items: Array<{
    id: string;
    label: string;
    sublabel?: string;
    color: string;
    isActive?: boolean;
  }>;
  radius: number;
  onClick?: (id: string) => void;
}

/**
 * Arranges indicators in a ring around the center.
 * Items are evenly distributed and static (not orbiting).
 */
export function IndicatorRing({ items, radius, onClick }: IndicatorRingProps) {
  return (
    <group>
      {items.map((item, i) => {
        const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2; // Start from top
        return (
          <TouchIndicator
            key={item.id}
            label={item.label}
            sublabel={item.sublabel}
            color={item.color}
            isActive={item.isActive}
            angle={angle}
            radius={radius}
            onClick={() => onClick?.(item.id)}
          />
        );
      })}
    </group>
  );
}
