/**
 * Help Center Visualization
 *
 * An interactive 3D help interface showing available commands,
 * keyboard shortcuts, and quick tips for using Eigen.
 * Theme-aware styling (dark/light mode).
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { COMMANDS } from '@/constants/omnibox';
import { cn } from '@/lib/utils';
import { useShellTheme } from './_shell/LiminalShell';
import type { CommandCategory } from '@/types/omnibox';

// =============================================================================
// Types
// =============================================================================

interface CommandGroup {
  category: CommandCategory;
  label: string;
  icon: string;
  color: string;
  commands: Array<{
    id: string;
    aliases: string[];
    description: string;
  }>;
}

// =============================================================================
// Floating Help Panel
// =============================================================================

interface HelpPanelProps {
  position: [number, number, number];
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
  delay?: number;
  visible?: boolean;
  isDark?: boolean;
}

function HelpPanel({
  position,
  title,
  icon,
  color,
  children,
  delay = 0,
  visible = true,
  isDark = true,
}: HelpPanelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating animation with phase offset based on position
      const time = state.clock.elapsedTime + delay;
      const float = Math.sin(time * 0.8) * 0.15;
      groupRef.current.position.y = position[1] + float;
    }
  });

  // Don't render Html when not visible (Html ignores group visibility)
  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
      <Html center style={{ pointerEvents: 'auto' }}>
        <div
          className={cn(
            'w-64 overflow-hidden rounded-xl border backdrop-blur-md transition-transform hover:scale-105',
            isDark ? 'bg-black/90' : 'bg-white/90'
          )}
          style={{ borderColor: `${color}40` }}
        >
          <div
            className="flex items-center gap-2 border-b px-4 py-2.5"
            style={{ borderColor: `${color}30`, background: `${color}15` }}
          >
            <span className="text-lg">{icon}</span>
            <h3 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              {title}
            </h3>
          </div>
          <div className="max-h-48 overflow-y-auto px-4 py-3">{children}</div>
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Central Help Orb
// =============================================================================

function CentralHelpOrb() {
  const orbRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (orbRef.current) {
      orbRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
    // Animate rings
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.z = state.clock.elapsedTime * (0.2 + i * 0.1);
        ring.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.2;
      }
    });
  });

  return (
    <group ref={orbRef}>
      {/* Central question mark sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Question mark text */}
      <Text position={[0, 0, 1.1]} fontSize={1.2} color="#ffffff" anchorX="center" anchorY="middle">
        ?
      </Text>
      <Text
        position={[0, 0, -1.1]}
        fontSize={1.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI, 0]}
      >
        ?
      </Text>

      {/* Orbiting rings */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringRefs.current[i] = el;
          }}
          rotation={[Math.PI / 2 + i * 0.3, i * 0.5, 0]}
        >
          <torusGeometry args={[1.5 + i * 0.4, 0.02, 16, 64]} />
          <meshBasicMaterial
            color={['#6366f1', '#8b5cf6', '#a78bfa'][i]}
            transparent
            opacity={0.6 - i * 0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

// =============================================================================
// Keyboard Shortcut Display
// =============================================================================

function KeyboardShortcuts({ isDark = true }: { isDark?: boolean }) {
  const shortcuts = [
    { keys: 'Ctrl+K', description: 'Open Omnibox' },
    { keys: '↑↓', description: 'Navigate suggestions' },
    { keys: 'Enter', description: 'Execute command' },
    { keys: 'Esc', description: 'Close Omnibox' },
    { keys: 'Ctrl+1-5', description: 'Quick commands' },
  ];

  return (
    <div className="space-y-1.5">
      {shortcuts.map((shortcut) => (
        <div key={shortcut.keys} className="flex items-center justify-between gap-2">
          <kbd
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-[10px] text-cyan-300',
              isDark ? 'bg-white/10' : 'bg-slate-200'
            )}
          >
            {shortcut.keys}
          </kbd>
          <span className={cn('text-[11px]', isDark ? 'text-gray-400' : 'text-slate-500')}>
            {shortcut.description}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Command List
// =============================================================================

interface CommandListProps {
  commands: CommandGroup['commands'];
  color: string;
  isDark?: boolean;
}

function CommandList({ commands, color, isDark = true }: CommandListProps) {
  return (
    <div className="space-y-2">
      {commands.slice(0, 4).map((cmd) => (
        <div key={cmd.id} className="group">
          <div className="flex items-center gap-2">
            <code
              className="rounded px-1.5 py-0.5 font-mono text-[11px]"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {cmd.aliases[0]}
            </code>
          </div>
          <p
            className={cn(
              'mt-0.5 line-clamp-1 text-[10px]',
              isDark ? 'text-gray-500' : 'text-slate-500'
            )}
          >
            {cmd.description}
          </p>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Quick Tips
// =============================================================================

function QuickTips({ isDark = true }: { isDark?: boolean }) {
  const tips = [
    'Type naturally - "show my devices"',
    'Use quotes for file names',
    'Try "conflicts" to see issues',
    'Say "sync Documents" to force sync',
  ];

  return (
    <div className="space-y-1.5">
      {tips.map((tip, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-amber-400">💡</span>
          <span className={cn('text-[11px]', isDark ? 'text-gray-300' : 'text-slate-600')}>
            {tip}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface HelpCenterVisualizationProps {
  visible?: boolean;
}

export function HelpCenterVisualization({ visible = true }: HelpCenterVisualizationProps) {
  const { isDark } = useShellTheme();

  // Group commands by category
  const commandGroups = useMemo<CommandGroup[]>(() => {
    const categoryConfig: Record<CommandCategory, { label: string; icon: string; color: string }> =
      {
        status: { label: 'Status Queries', icon: '📊', color: '#22c55e' },
        action: { label: 'Actions', icon: '⚡', color: '#f59e0b' },
        analytics: { label: 'Analytics', icon: '📈', color: '#3b82f6' },
        configuration: { label: 'Settings', icon: '⚙️', color: '#8b5cf6' },
        navigation: { label: 'Navigation', icon: '🧭', color: '#06b6d4' },
      };

    const groups: Record<CommandCategory, CommandGroup> = {} as Record<
      CommandCategory,
      CommandGroup
    >;

    COMMANDS.forEach((cmd) => {
      if (!groups[cmd.category]) {
        const config = categoryConfig[cmd.category];
        groups[cmd.category] = {
          category: cmd.category,
          label: config.label,
          icon: config.icon,
          color: config.color,
          commands: [],
        };
      }
      groups[cmd.category].commands.push({
        id: cmd.id,
        aliases: cmd.aliases,
        description: cmd.description,
      });
    });

    return Object.values(groups);
  }, []);

  // Panel positions in a circular layout
  const panelPositions: [number, number, number][] = [
    [-7, 3, 0], // Top left - Status
    [7, 3, 0], // Top right - Actions
    [-7, -3, 0], // Bottom left - Shortcuts
    [7, -3, 0], // Bottom right - Tips
    [0, 5, 0], // Top center - Navigation
  ];

  return (
    <group>
      {/* Central help orb */}
      <CentralHelpOrb />

      {/* Title */}
      <Text position={[0, -2.5, 0]} fontSize={0.5} color="#6366f1" anchorX="center" anchorY="top">
        HELP CENTER
      </Text>

      {/* Command category panels */}
      {commandGroups.slice(0, 3).map((group, index) => (
        <HelpPanel
          key={group.category}
          position={
            index === 0 ? panelPositions[0] : index === 1 ? panelPositions[1] : panelPositions[4]
          }
          title={group.label}
          icon={group.icon}
          color={group.color}
          delay={index * 0.3}
          visible={visible}
          isDark={isDark}
        >
          <CommandList commands={group.commands} color={group.color} isDark={isDark} />
        </HelpPanel>
      ))}

      {/* Keyboard shortcuts panel */}
      <HelpPanel
        position={panelPositions[2]}
        title="Keyboard Shortcuts"
        icon="⌨️"
        color="#06b6d4"
        delay={0.9}
        visible={visible}
        isDark={isDark}
      >
        <KeyboardShortcuts isDark={isDark} />
      </HelpPanel>

      {/* Quick tips panel */}
      <HelpPanel
        position={panelPositions[3]}
        title="Quick Tips"
        icon="💡"
        color="#f59e0b"
        delay={1.2}
        visible={visible}
        isDark={isDark}
      >
        <QuickTips isDark={isDark} />
      </HelpPanel>

      {/* Grid floor */}
      <group position={[0, -5, 0]}>
        <gridHelper args={[40, 40, '#312e81', '#1e1b4b']} />
      </group>

      {/* Ambient particles */}
      <AmbientParticles />
    </group>
  );
}

// =============================================================================
// Ambient Particles
// =============================================================================

// Seeded pseudo-random number generator for deterministic results
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function AmbientParticles() {
  const particlesRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      // Use deterministic seeded random values for consistent rendering
      positions[i * 3] = (seededRandom(i) - 0.5) * 30;
      positions[i * 3 + 1] = (seededRandom(i + 100) - 0.5) * 20;
      positions[i * 3 + 2] = (seededRandom(i + 200) - 0.5) * 20;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#6366f1" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

export default HelpCenterVisualization;
