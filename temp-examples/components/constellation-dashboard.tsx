"use client"

import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { Stars } from "@react-three/drei"
import DeviceOrb from "./device-orb"
import ConnectionWire from "./connection-wire"
import ParticleFlow from "./particle-flow"
import HudPanel from "./hud-panel"
import SearchBar from "./search-bar"
import RequestBeacon from "./request-beacon"
import * as THREE from "three"

interface Device {
  id: string
  name: string
  position: [number, number, number]
  isLocal: boolean
  isOnline: boolean
  isSyncing: boolean
  syncProgress: number
  uploadSpeed: number
  downloadSpeed: number
}

interface Connection {
  from: string
  to: string
  isSyncing: boolean
}

export default function ConstellationDashboard() {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "local",
      name: "My MacBook Pro",
      position: [0, 0, 0],
      isLocal: true,
      isOnline: true,
      isSyncing: false,
      syncProgress: 100,
      uploadSpeed: 0,
      downloadSpeed: 0,
    },
    {
      id: "device-1",
      name: "Desktop PC",
      position: [8, 2, 0],
      isLocal: false,
      isOnline: true,
      isSyncing: true,
      syncProgress: 65,
      uploadSpeed: 2.4,
      downloadSpeed: 1.8,
    },
    {
      id: "device-2",
      name: "iPhone 15 Pro",
      position: [-7, 3, 4],
      isLocal: false,
      isOnline: true,
      isSyncing: false,
      syncProgress: 100,
      uploadSpeed: 0.5,
      downloadSpeed: 0.3,
    },
    {
      id: "device-3",
      name: "NAS Storage",
      position: [2, -6, 3],
      isLocal: false,
      isOnline: false,
      isSyncing: false,
      syncProgress: 100,
      uploadSpeed: 0,
      downloadSpeed: 0,
    },
  ])

  const [connections, setConnections] = useState<Connection[]>([
    { from: "local", to: "device-1", isSyncing: true },
    { from: "local", to: "device-2", isSyncing: false },
    { from: "local", to: "device-3", isSyncing: false },
  ])

  const [requestsOpen, setRequestsOpen] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [stats, setStats] = useState({
    totalStorage: "2.4 TB / 5 TB",
    activeDevices: 3,
    totalSyncItems: 47290,
  })

  const handleSyncComplete = () => {
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 5000)
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        camera={{ position: [0, 0, 20], fov: 45 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <ambientLight intensity={0.25} color="#1a3a52" />
        <pointLight position={[25, 25, 25]} intensity={1.2} color="#5ba3d0" decay={2} />
        <pointLight position={[-25, -15, 15]} intensity={0.6} color="#8b5cf6" decay={2} />
        <pointLight position={[0, -20, 0]} intensity={0.4} color="#f97316" decay={2} />

        {/* Stars background */}
        <Stars radius={150} depth={75} count={1500} factor={5} saturation={0.3} fade speed={0.05} />

        <fog attach="fog" args={["#050810", 15, 100]} />

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

        {/* Central device orb */}
        <group>
          <DeviceOrb device={devices[0]} onClick={() => {}} />

          {/* Remote device orbs */}
          {devices.slice(1).map((device) => (
            <group key={device.id}>
              <DeviceOrb device={device} onClick={() => {}} />

              {/* Connection wires */}
              {connections.map((conn) =>
                conn.to === device.id ? (
                  <ConnectionWire
                    key={`wire-${conn.from}-${conn.to}`}
                    fromPos={devices[0].position}
                    toPos={device.position}
                    isActive={conn.isSyncing}
                  />
                ) : null,
              )}

              {/* Particle flow for active syncs */}
              {connections.map((conn) =>
                conn.to === device.id && conn.isSyncing ? (
                  <ParticleFlow
                    key={`particles-${conn.from}-${conn.to}`}
                    fromPos={devices[0].position}
                    toPos={device.position}
                  />
                ) : null,
              )}
            </group>
          ))}

          {/* Request beacon */}
          {requestsOpen && <RequestBeacon position={[-5, 5, -2]} />}
        </group>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar - Header */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-black/40 backdrop-blur-md border-b border-blue-400/10 pointer-events-auto flex items-center justify-between px-6">
          {/* Left - Branding and title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-white font-semibold">Eigen</h1>
            </div>
            <span className="text-gray-600 mx-3">|</span>
            <h2 className="text-gray-400 text-sm">Dashboard</h2>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-md mx-auto">
            <SearchBar />
          </div>

          {/* Right - Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400">Connected</span>
            </div>
          </div>
        </div>

        {/* Left sidebar - Navigation */}
        <div className="absolute top-14 left-0 w-56 h-[calc(100%-56px)] bg-black/40 backdrop-blur-md border-r border-blue-400/10 pointer-events-auto p-4 space-y-2 overflow-y-auto">
          <nav className="space-y-1">
            <NavItem label="Dashboard" icon="📊" active />
            <NavItem label="Folders" icon="📁" />
            <NavItem label="Devices" icon="🖥️" />
            <NavItem label="Settings" icon="⚙️" />
            <NavItem label="Logs" icon="📝" />
          </nav>
        </div>

        {/* Top-right HUD panels */}
        <div className="absolute top-20 right-6 pointer-events-auto space-y-3">
          <HudPanel title="STATUS" value="Online" icon="✓" />
          <HudPanel title="DEVICES" value={`${devices.length}/4`} icon="🔗" />
          <HudPanel title="DOWNLOADED" value="0 Bytes" icon="⬇️" />
          <HudPanel title="UPLOADED" value="0 Bytes" icon="⬆️" />
        </div>

        {/* Bottom-left - Synced folders panel */}
        <div className="absolute bottom-8 left-6 w-96 pointer-events-auto">
          <div
            className="bg-black/50 backdrop-blur-xl border border-blue-400/30 rounded-xl p-5"
            style={{
              boxShadow: "0 0 25px rgba(96, 165, 250, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.05)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-cyan-400">📂</span>
              <h3 className="text-white font-semibold">Synced Folders</h3>
            </div>
            <div className="space-y-3">
              <FolderItem name="Default Folder" files={2047} storage="133 GB" status="Up to Date" />
            </div>
          </div>
        </div>

        {/* Center bottom - Search bar (moved higher in z-index) */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 pointer-events-auto hidden">
          <SearchBar />
        </div>

        {/* Request notification - centered */}
        {requestsOpen && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <div
              className="bg-black/50 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 w-80 shadow-2xl"
              style={{
                boxShadow: "0 0 30px rgba(251, 146, 60, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
              }}
            >
              <h3 className="text-white text-lg font-semibold mb-2">New Connection Request</h3>
              <p className="text-amber-300/80 text-sm mb-4">Device ID: device-4</p>
              <p className="text-gray-400 text-xs mb-6">iPad Air wants to connect and sync data</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRequestsOpen(false)}
                  className="flex-1 px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-all"
                >
                  Accept
                </button>
                <button
                  onClick={() => setRequestsOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600/30 transition-all"
                >
                  Ignore
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom-right - Notification toast */}
        {showNotification && (
          <div className="absolute bottom-8 right-6 pointer-events-auto animate-slide-up">
            <div
              className="bg-green-900/50 backdrop-blur-xl border border-green-500/50 rounded-lg p-4 flex items-center gap-3 shadow-2xl"
              style={{
                boxShadow: "0 0 25px rgba(34, 197, 94, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
              }}
            >
              <span className="text-green-400 text-xl">✓</span>
              <div>
                <p className="text-green-300 font-semibold text-sm">Sync Complete</p>
                <p className="text-green-300/70 text-xs">Folder "default" is now in sync.</p>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="ml-4 text-green-300/60 hover:text-green-300 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

interface NavItemProps {
  label: string
  icon: string
  active?: boolean
}

function NavItem({ label, icon, active }: NavItemProps) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${
        active
          ? "bg-blue-500/20 text-cyan-300 border border-blue-400/40"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

interface FolderItemProps {
  name: string
  files: number
  storage: string
  status: string
}

function FolderItem({ name, files, storage, status }: FolderItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-blue-500/5 rounded-lg border border-blue-400/10">
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{name}</p>
        <p className="text-gray-500 text-xs">
          {files.toLocaleString()} files · {storage}
        </p>
      </div>
      <span className="text-green-400 text-xs font-semibold">{status}</span>
    </div>
  )
}
