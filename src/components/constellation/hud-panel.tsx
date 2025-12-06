import { useEffect, useRef } from 'react';
import { cn, formatBytes } from '@/lib/utils';
import {
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
  Bell,
  Activity,
  Database,
  Users,
  ArrowUp,
  ArrowDown,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { useResolvedTheme } from '@/components/theme-provider';

// =============================================================================
// Sparkline Component — Lightweight canvas-based sparkline
// =============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

function Sparkline({
  data,
  width = 60,
  height = 20,
  color = '#22d3ee',
  className,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate points
    const max = Math.max(...data, 1);
    const step = width / (data.length - 1 || 1);

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    data.forEach((value, i) => {
      const x = i * step;
      const y = height - (value / max) * (height - 4) - 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Add gradient fill under the line
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [data, width, height, color]);

  return (
    <canvas ref={canvasRef} width={width} height={height} className={cn('opacity-80', className)} />
  );
}

// =============================================================================
// Compact Stat Item — Single-line stat for vertical stack
// =============================================================================

interface StatItemProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: string;
}

export function StatItem({ label, value, icon, iconColor = 'text-cyan-400' }: StatItemProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 backdrop-blur-xl transition-all',
        isDark ? 'border border-white/10 bg-black/40' : 'border border-gray-300/50 bg-white/60'
      )}
      style={{
        boxShadow: isDark ? '0 0 15px rgba(96, 165, 250, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <span className={cn('shrink-0', iconColor)}>{icon}</span>
      <span
        className={cn(
          'font-mono text-xs tracking-wide',
          isDark ? 'text-gray-400' : 'text-gray-500'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'ml-auto font-mono text-sm font-semibold tabular-nums',
          isDark ? 'text-white' : 'text-gray-900'
        )}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// Stats Stack — Vertical stack of dynamic stats (top-right)
// =============================================================================

interface StatsStackProps {
  isOnline: boolean;
  syncRate: string;
  connectedNodes: string;
  folderCount: number;
  pendingCount: number;
}

export function StatsStack({
  isOnline,
  syncRate,
  connectedNodes,
  folderCount,
  pendingCount,
}: StatsStackProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col gap-2">
      {/* Connection Status Badge */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xl transition-all',
          isOnline
            ? isDark
              ? 'border border-emerald-400/40 bg-emerald-900/30 text-emerald-400'
              : 'border border-emerald-500/50 bg-emerald-100/80 text-emerald-700'
            : isDark
              ? 'border border-red-400/40 bg-red-900/30 text-red-400'
              : 'border border-red-500/50 bg-red-100/80 text-red-700'
        )}
        style={{
          boxShadow: isOnline
            ? isDark
              ? '0 0 20px rgba(52, 211, 153, 0.2)'
              : '0 2px 10px rgba(52, 211, 153, 0.25)'
            : isDark
              ? '0 0 20px rgba(248, 113, 113, 0.2)'
              : '0 2px 10px rgba(248, 113, 113, 0.25)',
        }}
      >
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span className="font-mono text-xs font-medium tracking-wide">
          {isOnline ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Only show stats when connected */}
      {isOnline && (
        <>
          {/* Sync Rate - only show if there's activity */}
          {syncRate !== '0 B/s' && (
            <StatItem
              label="Sync"
              value={syncRate}
              icon={<Activity className="h-3.5 w-3.5" />}
              iconColor={isDark ? 'text-cyan-400' : 'text-cyan-600'}
            />
          )}

          {/* Connected Devices */}
          <StatItem
            label="Nodes"
            value={connectedNodes}
            icon={<Users className="h-3.5 w-3.5" />}
            iconColor={isDark ? 'text-emerald-400' : 'text-emerald-600'}
          />

          {/* Folder Count */}
          <StatItem
            label="Folders"
            value={folderCount}
            icon={<Database className="h-3.5 w-3.5" />}
            iconColor={isDark ? 'text-purple-400' : 'text-purple-600'}
          />

          {/* Pending Requests - only show if any */}
          {pendingCount > 0 && (
            <StatItem
              label="Pending"
              value={pendingCount}
              icon={<Bell className="h-3.5 w-3.5" />}
              iconColor={isDark ? 'text-amber-400' : 'text-amber-600'}
            />
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Device Traffic Panel — Per-device rates with sparklines
// =============================================================================

interface DeviceTrafficData {
  deviceId: string;
  deviceName: string;
  inRate: number;
  outRate: number;
  connected: boolean;
}

interface DeviceTrafficPanelProps {
  devices: DeviceTrafficData[];
  maxDevices?: number;
}

/** History buffer for sparkline data (last 60 seconds) */
const trafficHistory = new Map<string, { in: number[]; out: number[] }>();

export function DeviceTrafficPanel({ devices, maxDevices = 3 }: DeviceTrafficPanelProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  // Update traffic history
  useEffect(() => {
    devices.forEach((device) => {
      if (!trafficHistory.has(device.deviceId)) {
        trafficHistory.set(device.deviceId, { in: [], out: [] });
      }
      const history = trafficHistory.get(device.deviceId)!;
      history.in = [...history.in.slice(-59), device.inRate];
      history.out = [...history.out.slice(-59), device.outRate];
    });
  }, [devices]);

  // Only show devices with active traffic, sorted by total rate
  const activeDevices = devices
    .filter((d) => d.connected && (d.inRate > 0 || d.outRate > 0))
    .sort((a, b) => b.inRate + b.outRate - (a.inRate + a.outRate))
    .slice(0, maxDevices);

  if (activeDevices.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {activeDevices.map((device) => {
        const history = trafficHistory.get(device.deviceId) || { in: [], out: [] };
        return (
          <div
            key={device.deviceId}
            className={cn(
              'rounded-lg px-3 py-2 backdrop-blur-xl transition-all',
              isDark
                ? 'border border-white/10 bg-black/40'
                : 'border border-gray-300/50 bg-white/60'
            )}
            style={{
              boxShadow: isDark
                ? '0 0 15px rgba(96, 165, 250, 0.1)'
                : '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Device name */}
            <div
              className={cn(
                'mb-1 truncate font-mono text-xs',
                isDark ? 'text-gray-400' : 'text-gray-600'
              )}
            >
              {device.deviceName || device.deviceId.slice(0, 8)}
            </div>

            {/* Traffic rates with sparklines */}
            <div className="flex items-center justify-between gap-2">
              {/* Download */}
              <div className="flex items-center gap-1.5">
                <ArrowDown
                  className={cn('h-3 w-3', isDark ? 'text-emerald-400' : 'text-emerald-600')}
                />
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  )}
                >
                  {formatBytes(device.inRate)}/s
                </span>
              </div>

              {/* Sparkline */}
              <Sparkline
                data={history.in.length > 0 ? history.in : [0]}
                width={40}
                height={16}
                color={isDark ? '#34d399' : '#059669'}
              />

              {/* Upload */}
              <div className="flex items-center gap-1.5">
                <ArrowUp className={cn('h-3 w-3', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    isDark ? 'text-cyan-300' : 'text-cyan-700'
                  )}
                >
                  {formatBytes(device.outRate)}/s
                </span>
              </div>

              {/* Sparkline */}
              <Sparkline
                data={history.out.length > 0 ? history.out : [0]}
                width={40}
                height={16}
                color={isDark ? '#22d3ee' : '#0891b2'}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Legacy HUD Panel (keeping for backwards compatibility)
// =============================================================================

interface HudPanelProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function HudPanel({ title, value, icon, className, onClick }: HudPanelProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'w-56 rounded-lg border p-4 backdrop-blur-xl transition-all',
        isDark ? 'border-blue-400/40 bg-black/50' : 'border-blue-300/50 bg-white/70',
        onClick &&
          (isDark
            ? 'cursor-pointer hover:border-cyan-400/60 hover:bg-black/60'
            : 'cursor-pointer hover:border-cyan-500/60 hover:bg-white/80'),
        className
      )}
      style={{
        boxShadow: isDark
          ? '0 0 25px rgba(96, 165, 250, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
          : '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className={cn(
              'font-mono text-xs tracking-widest uppercase',
              isDark ? 'text-blue-300/70' : 'text-blue-600/70'
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'mt-2 font-mono text-sm font-semibold',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            {value}
          </p>
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

// =============================================================================
// Status HUD — Connection, Settings, Notifications (with light theme)
// =============================================================================

interface StatusHudProps {
  isRefetching: boolean;
  pendingCount: number;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenPending: () => void;
  onOpenHelp: () => void;
  onOpenConflicts: () => void;
}

export function StatusHud({
  isRefetching,
  pendingCount,
  onRefresh,
  onOpenSettings,
  onOpenPending,
  onOpenHelp,
  onOpenConflicts,
}: StatusHudProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-3">
      {/* Pending Notifications */}
      {pendingCount > 0 && (
        <button
          onClick={onOpenPending}
          className={cn(
            'relative flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xl transition-all',
            isDark
              ? 'border border-amber-400/40 bg-amber-900/30 text-amber-400 hover:border-amber-400/60 hover:bg-amber-900/40'
              : 'border border-amber-500/50 bg-amber-100/80 text-amber-700 hover:border-amber-500/70 hover:bg-amber-200/80'
          )}
          style={{
            boxShadow: isDark
              ? '0 0 20px rgba(251, 191, 36, 0.2)'
              : '0 2px 10px rgba(251, 191, 36, 0.25)',
          }}
        >
          <Bell className="h-4 w-4" />
          <span className="font-mono text-xs font-medium">{pendingCount}</span>
          {/* Pulse indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
        </button>
      )}

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefetching}
        className={cn(
          'flex items-center justify-center rounded-full p-2.5 backdrop-blur-xl transition-all',
          isDark
            ? 'border border-white/20 bg-white/5 text-gray-400 hover:border-cyan-400/40 hover:bg-cyan-900/20 hover:text-cyan-400'
            : 'border border-gray-300/50 bg-white/60 text-gray-500 hover:border-cyan-500/50 hover:bg-cyan-100/60 hover:text-cyan-600',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        title="Refresh"
      >
        <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
      </button>

      {/* Settings Button */}
      <button
        onClick={onOpenSettings}
        className={cn(
          'flex items-center justify-center rounded-full p-2.5 backdrop-blur-xl transition-all',
          isDark
            ? 'border border-white/20 bg-white/5 text-gray-400 hover:border-purple-400/40 hover:bg-purple-900/20 hover:text-purple-400'
            : 'border border-gray-300/50 bg-white/60 text-gray-500 hover:border-purple-500/50 hover:bg-purple-100/60 hover:text-purple-600'
        )}
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>

      {/* Help Button */}
      <button
        onClick={onOpenHelp}
        className={cn(
          'flex items-center justify-center rounded-full p-2.5 backdrop-blur-xl transition-all',
          isDark
            ? 'border border-white/20 bg-white/5 text-gray-400 hover:border-blue-400/40 hover:bg-blue-900/20 hover:text-blue-400'
            : 'border border-gray-300/50 bg-white/60 text-gray-500 hover:border-blue-500/50 hover:bg-blue-100/60 hover:text-blue-600'
        )}
        title="Help"
      >
        <BookOpen className="h-4 w-4" />
      </button>

      {/* Conflicts Button */}
      <button
        onClick={onOpenConflicts}
        className={cn(
          'flex items-center justify-center rounded-full p-2.5 backdrop-blur-xl transition-all',
          isDark
            ? 'border border-white/20 bg-white/5 text-gray-400 hover:border-orange-400/40 hover:bg-orange-900/20 hover:text-orange-400'
            : 'border border-gray-300/50 bg-white/60 text-gray-500 hover:border-orange-500/50 hover:bg-orange-100/60 hover:text-orange-600'
        )}
        title="Conflicts"
      >
        <AlertTriangle className="h-4 w-4" />
      </button>
    </div>
  );
}
