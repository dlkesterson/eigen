import { useMemo, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import {
  useSystemStatus,
  useConnections,
  useConfig,
  usePendingRequests,
  useAcceptPendingDevice,
  useDismissPendingDevice,
} from '@/hooks/syncthing';
import { formatBytes, cn } from '@/lib/utils';
import { DeviceOrb, type DeviceOrbData } from './device-orb';
import { ConnectionWire } from './connection-wire';
import { ParticleFlow } from './particle-flow';
import { RequestBeacon } from './request-beacon';
import { HudPanel } from './hud-panel';
import { FolderList } from '@/components/folder-list';
import { useResolvedTheme } from '@/components/theme-provider';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  XCircle,
  Link,
  Folder,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// The 3D scene containing all constellation elements
function ConstellationScene({
  devices,
  connections,
  pendingCount,
  isDark,
}: {
  devices: DeviceOrbData[];
  connections: { from: string; to: string; isSyncing: boolean }[];
  pendingCount: number;
  isDark: boolean;
}) {
  const localDevice = devices.find((d) => d.isLocal);
  const remoteDevices = devices.filter((d) => !d.isLocal);

  return (
    <>
      {/* Lighting - simplified, minimal lights */}
      <ambientLight intensity={isDark ? 0.3 : 0.8} color={isDark ? '#1a3a52' : '#ffffff'} />

      {/* Only add colored lights in dark mode where they're visible */}
      {isDark && (
        <>
          <pointLight position={[25, 25, 25]} intensity={1.2} color="#5ba3d0" decay={2} />
          <pointLight position={[-25, -15, 15]} intensity={0.6} color="#8b5cf6" decay={2} />
        </>
      )}

      {/* Stars background - only in dark mode, static for performance */}
      {isDark && (
        <Stars radius={150} depth={75} count={500} factor={3} saturation={0.2} fade speed={0} />
      )}

      {/* Fog only in dark mode - not visible in light theme anyway */}
      {isDark && <fog attach="fog" args={['#050810', 25, 100]} />}

      {/* Device constellation */}
      <group>
        {/* Local device (center) */}
        {localDevice && <DeviceOrb device={localDevice} isDark={isDark} />}

        {/* Remote devices with connections */}
        {remoteDevices.map((device) => {
          const connection = connections.find((c) => c.to === device.id);
          const isSyncing = connection?.isSyncing ?? false;

          return (
            <group key={device.id}>
              <DeviceOrb device={device} isDark={isDark} />

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

        {/* Request beacon for pending requests */}
        {pendingCount > 0 && <RequestBeacon position={[-5, 5, -2]} />}
      </group>

      {/* Camera controls - disable damping for better performance */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableDamping={false}
        minDistance={18}
        maxDistance={45}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        autoRotate={false}
        autoRotateSpeed={0.3}
        target={[0, 0, 0]}
        makeDefault
      />
    </>
  );
}

// Request notification modal
function RequestNotification({
  deviceId,
  deviceName,
  onAccept,
  onDismiss,
  isDark = true,
}: {
  deviceId: string;
  deviceName?: string;
  onAccept: () => void;
  onDismiss: () => void;
  isDark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'pointer-events-auto w-80 rounded-2xl border p-6 shadow-2xl backdrop-blur-xl',
        isDark ? 'border-amber-500/30 bg-black/50' : 'border-amber-500/40 bg-white/80'
      )}
      style={{
        boxShadow: isDark
          ? '0 0 30px rgba(251, 146, 60, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
          : '0 0 30px rgba(251, 146, 60, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
      }}
    >
      <h3 className={cn('mb-2 text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
        New Connection Request
      </h3>
      <p className={cn('mb-4 text-sm', isDark ? 'text-amber-300/80' : 'text-amber-600')}>
        {deviceName || `Device ${deviceId.slice(0, 8)}...`}
      </p>
      <p className={cn('mb-6 text-xs', isDark ? 'text-gray-400' : 'text-slate-500')}>
        wants to connect and sync data
      </p>
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className={cn(
            'flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
            isDark
              ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
              : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20'
          )}
        >
          Accept
        </button>
        <button
          onClick={onDismiss}
          className={cn(
            'flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
            isDark
              ? 'border-gray-500/30 bg-gray-600/20 text-gray-300 hover:bg-gray-600/30'
              : 'border-gray-400/50 bg-gray-200/50 text-gray-600 hover:bg-gray-200/70'
          )}
        >
          Ignore
        </button>
      </div>
    </motion.div>
  );
}

export function ConstellationDashboard() {
  const { data: status, isError: statusError, failureCount } = useSystemStatus();
  const { data: connections } = useConnections();
  const { data: config } = useConfig();
  const { data: pendingRequests } = usePendingRequests();
  const acceptDevice = useAcceptPendingDevice();
  const dismissDevice = useDismissPendingDevice();
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  const [showRequest, setShowRequest] = useState(true);

  // Determine connection state
  const isOnline = !statusError && status?.myID;
  const isRetrying = statusError && failureCount > 0 && failureCount < 3;

  // Calculate device positions in 3D space (orbital layout)
  const devices = useMemo<DeviceOrbData[]>(() => {
    if (!config?.devices || !status?.myID) return [];

    const result: DeviceOrbData[] = [];
    const remoteDevices = config.devices.filter((d) => d.deviceID !== status.myID);
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
    remoteDevices.forEach((device, index) => {
      const angle = index * angleStep;
      const radius = 8;
      const height = (Math.random() - 0.5) * 4; // Slight vertical variation

      const connectionInfo = connections?.connections?.[device.deviceID];
      const isOnline = connectionInfo?.connected ?? false;
      // Consider it syncing if there's active data transfer
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
    });

    return result;
  }, [config?.devices, status?.myID, connections?.connections]);

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
  }, [status?.myID, connections?.connections]);

  // Stats
  const connectedDevices = Object.values(connections?.connections || {}).filter(
    (c) => c?.connected
  ).length;
  const totalDevices = Object.keys(connections?.connections || {}).length;
  const inBytes = connections?.total?.inBytesTotal || 0;
  const outBytes = connections?.total?.outBytesTotal || 0;
  const pendingCount =
    (pendingRequests?.devices?.length || 0) + (pendingRequests?.folders?.length || 0);

  const firstPendingDevice = pendingRequests?.devices?.[0];

  const handleAcceptDevice = () => {
    if (firstPendingDevice) {
      acceptDevice.mutate({ deviceId: firstPendingDevice.deviceId });
      setShowRequest(false);
    }
  };

  const handleDismissDevice = () => {
    if (firstPendingDevice) {
      dismissDevice.mutate(firstPendingDevice.deviceId);
      setShowRequest(false);
    }
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl ${isDark ? 'bg-black' : 'bg-slate-100'}`}
    >
      {/* 3D Canvas - Performance optimized */}
      <Canvas
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        camera={{ position: [0, 12, 30], fov: 55, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
        }}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <ConstellationScene
            devices={devices}
            connections={connectionData}
            pendingCount={pendingCount}
            isDark={isDark}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-right HUD panels */}
        <div className="pointer-events-auto absolute top-6 right-6 space-y-3">
          <HudPanel
            title="STATUS"
            value={
              isOnline ? 'Online' : isRetrying ? `Reconnecting (${failureCount}/3)` : 'Offline'
            }
            icon={
              isOnline ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : isRetrying ? (
                <RefreshCw className="h-5 w-5 animate-spin text-amber-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )
            }
            className={
              isRetrying
                ? isDark
                  ? 'border-amber-500/40 bg-amber-950/30'
                  : 'border-amber-400/50 bg-amber-50/80'
                : undefined
            }
          />

          {/* Only show stats when connected */}
          {isOnline && (
            <>
              <HudPanel
                title="DEVICES"
                value={`${connectedDevices}/${totalDevices}`}
                icon={<Link className="h-5 w-5 text-blue-400" />}
              />
              <HudPanel
                title="DOWNLOADED"
                value={formatBytes(inBytes)}
                icon={<ArrowDownToLine className="h-5 w-5 text-green-400" />}
              />
              <HudPanel
                title="UPLOADED"
                value={formatBytes(outBytes)}
                icon={<ArrowUpFromLine className="h-5 w-5 text-blue-400" />}
              />
            </>
          )}
        </div>

        {/* Show folder list only when connected */}
        {isOnline ? (
          <div className="pointer-events-auto absolute bottom-6 left-6 w-96">
            <div
              className={`rounded-xl border p-5 backdrop-blur-xl ${
                isDark ? 'border-blue-400/30 bg-black/50' : 'border-blue-400/40 bg-white/70'
              }`}
              style={{
                boxShadow: isDark
                  ? '0 0 25px rgba(96, 165, 250, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.05)'
                  : '0 0 25px rgba(96, 165, 250, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <Folder className={`h-5 w-5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  Synced Folders
                </h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <FolderList compact />
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected state message */
          <div className="pointer-events-auto absolute bottom-6 left-6 w-96">
            <div
              className={cn(
                'rounded-xl border p-6 backdrop-blur-xl',
                isDark
                  ? 'border-amber-500/30 bg-amber-950/20'
                  : 'border-amber-400/40 bg-amber-50/80'
              )}
              style={{
                boxShadow: isDark
                  ? '0 0 25px rgba(251, 146, 60, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.05)'
                  : '0 0 25px rgba(251, 146, 60, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
              }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={cn(
                    'mt-0.5 h-5 w-5 shrink-0',
                    isDark ? 'text-amber-400' : 'text-amber-600'
                  )}
                />
                <div>
                  <h3
                    className={cn(
                      'mb-1 font-semibold',
                      isDark ? 'text-amber-200' : 'text-amber-900'
                    )}
                  >
                    {isRetrying ? 'Reconnecting to Syncthing' : 'Disconnected'}
                  </h3>
                  <p className={cn('text-sm', isDark ? 'text-amber-300/70' : 'text-amber-700/80')}>
                    {isRetrying
                      ? 'Attempting to restore connection...'
                      : "Unable to connect to Syncthing service. Check if it's running."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Center - Request notification */}
        <AnimatePresence>
          {showRequest && firstPendingDevice && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
              <RequestNotification
                deviceId={firstPendingDevice.deviceId}
                deviceName={firstPendingDevice.name}
                onAccept={handleAcceptDevice}
                onDismiss={handleDismissDevice}
                isDark={isDark}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
