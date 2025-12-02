'use client';

import { useMemo, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  useSystemStatus,
  useConnections,
  useConfig,
  usePendingRequests,
  useAcceptPendingDevice,
  useDismissPendingDevice,
} from '@/hooks/syncthing';
import { formatBytes } from '@/lib/utils';
import { DeviceOrb, type DeviceOrbData } from './device-orb';
import { ConnectionWire } from './connection-wire';
import { ParticleFlow } from './particle-flow';
import { RequestBeacon } from './request-beacon';
import { HudPanel } from './hud-panel';
import { FolderList } from '@/components/folder-list';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle, XCircle, Link, Folder } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Cosmic dust particles for atmosphere
function CosmicDust() {
  return (
    <group>
      {Array.from({ length: 100 }).map((_, i) => (
        <mesh
          key={`dust-${i}`}
          position={[Math.random() * 60 - 30, Math.random() * 40 - 20, Math.random() * 60 - 30]}
        >
          <sphereGeometry args={[Math.random() * 0.05 + 0.01, 8, 8]} />
          <meshBasicMaterial
            color={new THREE.Color(0.2, 0.4, 0.6)}
            transparent
            opacity={Math.random() * 0.3 + 0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

// The 3D scene containing all constellation elements
function ConstellationScene({
  devices,
  connections,
  pendingCount,
}: {
  devices: DeviceOrbData[];
  connections: { from: string; to: string; isSyncing: boolean }[];
  pendingCount: number;
}) {
  const localDevice = devices.find((d) => d.isLocal);
  const remoteDevices = devices.filter((d) => !d.isLocal);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.25} color="#1a3a52" />
      <pointLight position={[25, 25, 25]} intensity={1.2} color="#5ba3d0" decay={2} />
      <pointLight position={[-25, -15, 15]} intensity={0.6} color="#8b5cf6" decay={2} />
      <pointLight position={[0, -20, 0]} intensity={0.4} color="#f97316" decay={2} />

      {/* Stars background */}
      <Stars radius={150} depth={75} count={1500} factor={5} saturation={0.3} fade speed={0.05} />

      {/* Atmospheric fog */}
      <fog attach="fog" args={['#050810', 15, 100]} />

      {/* Cosmic dust particles */}
      <CosmicDust />

      {/* Device constellation */}
      <group>
        {/* Local device (center) */}
        {localDevice && <DeviceOrb device={localDevice} />}

        {/* Remote devices with connections */}
        {remoteDevices.map((device) => {
          const connection = connections.find((c) => c.to === device.id);
          const isSyncing = connection?.isSyncing ?? false;

          return (
            <group key={device.id}>
              <DeviceOrb device={device} />

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

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={10}
        maxDistance={40}
        autoRotate
        autoRotateSpeed={0.3}
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
}: {
  deviceId: string;
  deviceName?: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="pointer-events-auto w-80 rounded-2xl border border-amber-500/30 bg-black/50 p-6 shadow-2xl backdrop-blur-xl"
      style={{
        boxShadow: '0 0 30px rgba(251, 146, 60, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      <h3 className="mb-2 text-lg font-semibold text-white">New Connection Request</h3>
      <p className="mb-4 text-sm text-amber-300/80">
        {deviceName || `Device ${deviceId.slice(0, 8)}...`}
      </p>
      <p className="mb-6 text-xs text-gray-400">wants to connect and sync data</p>
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/30"
        >
          Accept
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 rounded-lg border border-gray-500/30 bg-gray-600/20 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-gray-600/30"
        >
          Ignore
        </button>
      </div>
    </motion.div>
  );
}

export function ConstellationDashboard() {
  const { data: status, isError: statusError } = useSystemStatus();
  const { data: connections } = useConnections();
  const { data: config } = useConfig();
  const { data: pendingRequests } = usePendingRequests();
  const acceptDevice = useAcceptPendingDevice();
  const dismissDevice = useDismissPendingDevice();

  const [showRequest, setShowRequest] = useState(true);

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
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
      {/* 3D Canvas */}
      <Canvas
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        camera={{ position: [0, 5, 20], fov: 45 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <ConstellationScene
            devices={devices}
            connections={connectionData}
            pendingCount={pendingCount}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-right HUD panels */}
        <div className="pointer-events-auto absolute top-6 right-6 space-y-3">
          <HudPanel
            title="STATUS"
            value={statusError ? 'Offline' : 'Online'}
            icon={
              statusError ? (
                <XCircle className="h-5 w-5 text-red-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-400" />
              )
            }
          />
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
        </div>

        {/* Bottom-left - Synced folders panel */}
        <div className="pointer-events-auto absolute bottom-6 left-6 w-96">
          <div
            className="rounded-xl border border-blue-400/30 bg-black/50 p-5 backdrop-blur-xl"
            style={{
              boxShadow:
                '0 0 25px rgba(96, 165, 250, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Folder className="h-5 w-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Synced Folders</h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <FolderList compact />
            </div>
          </div>
        </div>

        {/* Center - Request notification */}
        <AnimatePresence>
          {showRequest && firstPendingDevice && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
              <RequestNotification
                deviceId={firstPendingDevice.deviceId}
                deviceName={firstPendingDevice.name}
                onAccept={handleAcceptDevice}
                onDismiss={handleDismissDevice}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
