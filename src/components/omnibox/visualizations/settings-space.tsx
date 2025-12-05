/**
 * Settings Space Visualization
 *
 * 3D settings interface with floating panels for different configuration categories.
 * Replaces the traditional settings page with an immersive Omnibox-driven experience.
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store';
import {
  useConfig,
  useUpdateOptions,
  useSyncthingInstallation,
  useDeviceId,
  useRestartSyncthing,
} from '@/hooks/syncthing';
import type { Options } from '@/hooks/syncthing';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type SettingsCategory =
  | 'theme'
  | 'syncthing'
  | 'network'
  | 'notifications'
  | 'ai'
  | 'polling'
  | 'about';

interface SettingsPanelData {
  id: SettingsCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
  position: [number, number, number];
}

// =============================================================================
// Panel Definitions
// =============================================================================

const SETTINGS_PANELS: SettingsPanelData[] = [
  {
    id: 'theme',
    label: 'Appearance',
    icon: '🎨',
    color: '#a855f7',
    description: 'Theme and visual preferences',
    position: [-6, 2, -2],
  },
  {
    id: 'syncthing',
    label: 'Syncthing',
    icon: '🔄',
    color: '#22c55e',
    description: 'Daemon status and control',
    position: [0, 3, -3],
  },
  {
    id: 'network',
    label: 'Network',
    icon: '🌐',
    color: '#3b82f6',
    description: 'Discovery and bandwidth settings',
    position: [6, 2, -2],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '🔔',
    color: '#f59e0b',
    description: 'Alert preferences',
    position: [-5, -1, 0],
  },
  {
    id: 'ai',
    label: 'AI Features',
    icon: '🧠',
    color: '#ec4899',
    description: 'Semantic search settings',
    position: [0, 0, 0],
  },
  {
    id: 'polling',
    label: 'Polling',
    icon: '⏱️',
    color: '#06b6d4',
    description: 'Refresh intervals',
    position: [5, -1, 0],
  },
  {
    id: 'about',
    label: 'About',
    icon: 'ℹ️',
    color: '#6366f1',
    description: 'App information',
    position: [0, -3, 2],
  },
];

// =============================================================================
// Central Settings Orb
// =============================================================================

function CentralSettingsOrb() {
  const orbRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (orbRef.current) {
      orbRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.z = state.clock.elapsedTime * (0.15 + i * 0.05);
        ring.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.15;
      }
    });
  });

  return (
    <group ref={orbRef} position={[0, 0, -5]}>
      <mesh>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.7}
          wireframe
        />
      </mesh>

      <Text position={[0, 0, 1.6]} fontSize={1} color="#ffffff" anchorX="center" anchorY="middle">
        ⚙️
      </Text>

      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringRefs.current[i] = el;
          }}
          rotation={[Math.PI / 2 + i * 0.4, i * 0.3, 0]}
        >
          <torusGeometry args={[2 + i * 0.5, 0.015, 16, 64]} />
          <meshBasicMaterial
            color={['#6366f1', '#8b5cf6', '#a78bfa'][i]}
            transparent
            opacity={0.4 - i * 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// =============================================================================
// Settings Panel Component
// =============================================================================

interface SettingsPanelProps {
  data: SettingsPanelData;
  isSelected: boolean;
  onSelect: (id: SettingsCategory) => void;
  visible?: boolean;
}

function SettingsPanel({ data, isSelected, onSelect, visible = true }: SettingsPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      // Floating animation
      const time = state.clock.elapsedTime + data.position[0] * 0.5;
      const float = Math.sin(time * 0.6) * 0.1;
      groupRef.current.position.y = data.position[1] + float;

      // Subtle rotation towards camera when selected
      if (isSelected) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(data.id);
  };

  return (
    <group
      ref={groupRef}
      position={[data.position[0], data.position[1], data.position[2]]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Panel backing mesh */}
      <mesh>
        <boxGeometry args={[2.5, 1.5, 0.1]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.25 : 0.1}
          roughness={0.4}
          metalness={0.6}
          transparent
          opacity={isSelected ? 0.95 : hovered ? 0.85 : 0.7}
        />
      </mesh>

      {/* Glow ring when selected */}
      {isSelected && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[1.8, 2, 32]} />
          <meshBasicMaterial color={data.color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Icon */}
      <Text position={[0, 0.2, 0.1]} fontSize={0.5} anchorX="center" anchorY="middle">
        {data.icon}
      </Text>

      {/* Label */}
      <Text
        position={[0, -0.4, 0.1]}
        fontSize={0.22}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-medium.woff"
      >
        {data.label}
      </Text>

      {/* Connection line to center */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                0,
                0,
                0,
                -data.position[0],
                -data.position[1] + 0,
                -data.position[2] - 5,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={data.color} transparent opacity={isSelected ? 0.5 : 0.2} />
      </line>
    </group>
  );
}

// =============================================================================
// Settings Content Panels
// =============================================================================

interface ContentPanelProps {
  category: SettingsCategory;
  onClose: () => void;
  visible?: boolean;
}

function ThemeSettings({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useAppStore();

  const themes = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '💻' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Appearance</h3>
      <div className="flex gap-2">
        {themes.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm transition-all',
              theme === value
                ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            <span className="mr-2">{icon}</span>
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">Choose your preferred color scheme for the interface.</p>
    </div>
  );
}

function SyncthingSettings({ onClose }: { onClose: () => void }) {
  const { data: installation, isLoading: installLoading } = useSyncthingInstallation();
  const { data: deviceId, isLoading: idLoading } = useDeviceId();
  const restartSyncthing = useRestartSyncthing();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (deviceId) {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      toast.success('Device ID copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRestart = async () => {
    try {
      await restartSyncthing.mutateAsync();
      toast.success('Syncthing restarting...');
    } catch {
      toast.error('Failed to restart');
    }
  };

  if (installLoading || idLoading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Syncthing</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Status</span>
          <span className="text-sm text-green-400">
            {installation?.installed ? '✓ Running' : '✗ Not installed'}
          </span>
        </div>
        {installation?.version && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Version</span>
            <span className="font-mono text-sm text-white">{installation.version}</span>
          </div>
        )}
      </div>

      {deviceId && (
        <div className="space-y-2">
          <span className="text-sm text-gray-400">Device ID</span>
          <div className="flex gap-2">
            <code className="flex-1 truncate rounded bg-white/5 px-2 py-1 font-mono text-xs text-gray-300">
              {deviceId}
            </code>
            <button
              onClick={handleCopy}
              className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleRestart}
        disabled={restartSyncthing.isPending}
        className="w-full rounded-lg bg-orange-500/20 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/30 disabled:opacity-50"
      >
        {restartSyncthing.isPending ? 'Restarting...' : '🔄 Restart Syncthing'}
      </button>
    </div>
  );
}

function NetworkSettings({ onClose }: { onClose: () => void }) {
  const { data: config, isLoading } = useConfig();
  const updateOptions = useUpdateOptions();
  const [localOptions, setLocalOptions] = useState<Partial<Options>>({});

  useEffect(() => {
    if (config?.options) {
      setLocalOptions({
        globalAnnounceEnabled: config.options.globalAnnounceEnabled,
        localAnnounceEnabled: config.options.localAnnounceEnabled,
        relaysEnabled: config.options.relaysEnabled,
        maxSendKbps: config.options.maxSendKbps,
        maxRecvKbps: config.options.maxRecvKbps,
      });
    }
  }, [config?.options]);

  const toggleOption = async (key: keyof Options, value: boolean) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    try {
      await updateOptions.mutateAsync(newOptions);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  if (isLoading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const toggles = [
    { key: 'globalAnnounceEnabled' as const, label: 'Global Discovery', icon: '🌍' },
    { key: 'localAnnounceEnabled' as const, label: 'Local Discovery', icon: '📡' },
    { key: 'relaysEnabled' as const, label: 'Relay Servers', icon: '🔀' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Network</h3>

      <div className="space-y-2">
        {toggles.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {icon} {label}
            </span>
            <button
              onClick={() => toggleOption(key, !localOptions[key])}
              className={cn(
                'rounded px-3 py-1 text-xs transition-all',
                localOptions[key] ? 'bg-green-500/30 text-green-400' : 'bg-white/10 text-gray-500'
              )}
            >
              {localOptions[key] ? 'On' : 'Off'}
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Send (KB/s)</label>
            <input
              type="number"
              value={localOptions.maxSendKbps || 0}
              onChange={(e) =>
                setLocalOptions({ ...localOptions, maxSendKbps: Number(e.target.value) })
              }
              onBlur={() => updateOptions.mutate(localOptions)}
              className="w-full rounded bg-white/5 px-2 py-1 text-sm text-white"
              placeholder="0 = unlimited"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Receive (KB/s)</label>
            <input
              type="number"
              value={localOptions.maxRecvKbps || 0}
              onChange={(e) =>
                setLocalOptions({ ...localOptions, maxRecvKbps: Number(e.target.value) })
              }
              onBlur={() => updateOptions.mutate(localOptions)}
              className="w-full rounded bg-white/5 px-2 py-1 text-sm text-white"
              placeholder="0 = unlimited"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">0 = unlimited bandwidth</p>
      </div>
    </div>
  );
}

function NotificationSettings({ onClose }: { onClose: () => void }) {
  const { nativeNotificationsEnabled, setNativeNotificationsEnabled } = useAppStore();

  const handleToggle = async () => {
    if (!nativeNotificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNativeNotificationsEnabled(true);
        toast.success('Notifications enabled');
      } else {
        toast.error('Permission denied');
      }
    } else {
      setNativeNotificationsEnabled(false);
      toast.success('Notifications disabled');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Notifications</h3>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white">Desktop Notifications</div>
          <div className="text-xs text-gray-500">System alerts for sync events</div>
        </div>
        <button
          onClick={handleToggle}
          className={cn(
            'rounded-lg px-4 py-2 text-sm transition-all',
            nativeNotificationsEnabled
              ? 'bg-green-500/30 text-green-400'
              : 'bg-white/10 text-gray-400'
          )}
        >
          {nativeNotificationsEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Receive alerts when devices connect/disconnect, folders sync, or errors occur. In-app toasts
        are always shown.
      </p>
    </div>
  );
}

function AISettings({ onClose }: { onClose: () => void }) {
  const { aiEnabled, setAiEnabled } = useAppStore();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">AI Features</h3>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white">Semantic Search</div>
          <div className="text-xs text-gray-500">Local embedding model</div>
        </div>
        <button
          onClick={() => {
            setAiEnabled(!aiEnabled);
            toast.success(aiEnabled ? 'AI disabled' : 'AI enabled');
          }}
          className={cn(
            'rounded-lg px-4 py-2 text-sm transition-all',
            aiEnabled ? 'bg-pink-500/30 text-pink-400' : 'bg-white/10 text-gray-400'
          )}
        >
          {aiEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Uses all-MiniLM-L6-v2 for semantic file search. Runs entirely on your device. Disabling
        saves memory and CPU.
      </p>

      {aiEnabled && (
        <div className="rounded-lg border border-pink-500/30 bg-pink-500/10 p-3">
          <div className="text-xs text-pink-300">
            💡 Use <code className="rounded bg-black/30 px-1">search [query]</code> in the Omnibox
            to find files semantically.
          </div>
        </div>
      )}
    </div>
  );
}

function PollingSettings({ onClose }: { onClose: () => void }) {
  const { pollingInterval, setPollingInterval } = useAppStore();

  const intervals = [
    { value: 2000, label: '2s' },
    { value: 5000, label: '5s' },
    { value: 10000, label: '10s' },
    { value: 30000, label: '30s' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Polling</h3>

      <div>
        <div className="mb-2 text-sm text-gray-400">Refresh interval</div>
        <div className="flex gap-2">
          {intervals.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setPollingInterval(value);
                toast.success(`Polling set to ${label}`);
              }}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm transition-all',
                pollingInterval === value
                  ? 'bg-cyan-500/30 text-cyan-400 ring-1 ring-cyan-500'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        How often to refresh connection and folder status. Lower values use more resources.
      </p>
    </div>
  );
}

function AboutSettings({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">About Eigen</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Version</span>
          <span className="font-mono text-sm text-white">0.1.17</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Framework</span>
          <span className="text-sm text-white">Tauri v2 + Next.js 16</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">3D Engine</span>
          <span className="text-sm text-white">React Three Fiber</span>
        </div>
      </div>

      <div className="rounded-lg bg-indigo-500/10 p-3">
        <p className="text-xs text-indigo-300">
          Eigen is a modern desktop client for Syncthing with an immersive 3D interface.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => window.open('https://github.com/dlkesterson/eigen', '_blank')}
          className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10"
        >
          GitHub
        </button>
        <button
          onClick={() => window.open('https://syncthing.net', '_blank')}
          className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10"
        >
          Syncthing
        </button>
      </div>
    </div>
  );
}

function SettingsContentPanel({ category, onClose, visible = true }: ContentPanelProps) {
  if (!visible) return null;

  const panelData = SETTINGS_PANELS.find((p) => p.id === category);
  if (!panelData) return null;

  const ContentComponent = {
    theme: ThemeSettings,
    syncthing: SyncthingSettings,
    network: NetworkSettings,
    notifications: NotificationSettings,
    ai: AISettings,
    polling: PollingSettings,
    about: AboutSettings,
  }[category];

  return (
    <Html position={[0, 0, 3]} center style={{ pointerEvents: 'auto' }}>
      <div
        className="w-80 rounded-xl border bg-black/95 p-4 backdrop-blur-md"
        style={{ borderColor: `${panelData.color}40` }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-2xl">{panelData.icon}</span>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-1.5 text-gray-400 hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>
        <ContentComponent onClose={onClose} />
      </div>
    </Html>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface SettingsSpaceVisualizationProps {
  visible?: boolean;
  initialCategory?: SettingsCategory;
}

export function SettingsSpaceVisualization({
  visible = true,
  initialCategory,
}: SettingsSpaceVisualizationProps) {
  const [selected, setSelected] = useState<SettingsCategory | null>(initialCategory ?? null);

  const handleSelect = useCallback((id: SettingsCategory) => {
    setSelected((prev) => (prev === id ? null : id));
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <group>
      {/* Central orb */}
      <CentralSettingsOrb />

      {/* Grid floor */}
      <group position={[0, -4, 0]}>
        <gridHelper args={[30, 30, '#1a1a3a', '#0d0d1f']} />
      </group>

      {/* Settings panels */}
      {SETTINGS_PANELS.map((panel) => (
        <SettingsPanel
          key={panel.id}
          data={panel}
          isSelected={selected === panel.id}
          onSelect={handleSelect}
          visible={visible}
        />
      ))}

      {/* Content panel when selected */}
      {selected && (
        <SettingsContentPanel category={selected} onClose={handleClose} visible={visible} />
      )}

      {/* Header */}
      <Text position={[0, 5, -5]} fontSize={0.8} color="#6366f1" anchorX="center" anchorY="bottom">
        Settings
      </Text>

      {/* Hint when nothing selected */}
      {!selected && (
        <Text position={[0, -2.5, 3]} fontSize={0.3} color="#6b7280" anchorX="center" anchorY="top">
          Click a panel to configure
        </Text>
      )}
    </group>
  );
}

export default SettingsSpaceVisualization;
