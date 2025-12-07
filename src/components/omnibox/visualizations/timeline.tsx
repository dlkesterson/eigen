/**
 * Timeline Visualization
 *
 * Shows file change history as a 3D timeline with events as markers.
 */

import { useMemo, useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useRecentEvents } from '@/hooks/syncthing/core';

// =============================================================================
// Types
// =============================================================================

interface TimelineEvent {
  id: string;
  type: 'sync' | 'modify' | 'delete' | 'add' | 'conflict' | 'error';
  fileName: string;
  folderPath: string;
  timestamp: Date;
  position: [number, number, number];
}

// =============================================================================
// Constants
// =============================================================================

const EVENT_COLORS: Record<string, string> = {
  sync: '#22c55e',
  modify: '#3b82f6',
  delete: '#ef4444',
  add: '#8b5cf6',
  conflict: '#f97316',
  error: '#dc2626',
};

const EVENT_ICONS: Record<string, string> = {
  sync: '✓',
  modify: '✎',
  delete: '✕',
  add: '+',
  conflict: '⚠',
  error: '!',
};

// =============================================================================
// Timeline Axis
// =============================================================================

function TimelineAxis({ length }: { length: number }) {
  const points = useMemo(
    () => [new THREE.Vector3(-length / 2, 0, 0), new THREE.Vector3(length / 2, 0, 0)],
    [length]
  );

  return (
    <group>
      {/* Main axis line */}
      <Line points={points} color="#334155" lineWidth={2} />

      {/* Axis markers */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = -length / 2 + (length / 6) * i;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
              <meshBasicMaterial color="#475569" />
            </mesh>
          </group>
        );
      })}

      {/* Time labels - always face camera */}
      <Text
        position={[-length / 2, -0.8, 0]}
        fontSize={0.3}
        color="#64748b"
        anchorX="center"
        rotation={[0, 0, 0]}
      >
        7 days ago
      </Text>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.3}
        color="#64748b"
        anchorX="center"
        rotation={[0, 0, 0]}
      >
        Now
      </Text>
      <Text
        position={[length / 2, -0.8, 0]}
        fontSize={0.3}
        color="#64748b"
        anchorX="center"
        rotation={[0, 0, 0]}
      >
        Future
      </Text>
    </group>
  );
}

// =============================================================================
// Event Marker
// =============================================================================

interface EventMarkerProps {
  event: TimelineEvent;
  isSelected: boolean;
  onSelect: (id: string) => void;
  visible?: boolean;
}

function EventMarker({ event, isSelected, onSelect, visible = true }: EventMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = EVENT_COLORS[event.type] || '#64748b';

  useFrame((state) => {
    if (meshRef.current) {
      // Floating animation only
      const float = Math.sin(state.clock.elapsedTime * 2 + event.position[0]) * 0.1;
      meshRef.current.position.y = event.position[1] + float;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(event.id);
  };

  return (
    <group position={[event.position[0], 0, event.position[2]]}>
      {/* Vertical line to axis */}
      <Line
        points={[
          [0, 0, 0],
          [0, event.position[1], 0],
        ]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.4}
      />

      {/* Event marker */}
      <mesh
        ref={meshRef}
        position={[0, event.position[1], 0]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.6 : hovered ? 0.4 : 0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Glow ring when selected */}
      {(isSelected || hovered) && (
        <mesh position={[0, event.position[1], 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Info popup */}
      {(hovered || isSelected) && visible && (
        <Html position={[0, event.position[1] + 1, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 whitespace-nowrap text-white backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 items-center justify-center rounded text-xs"
                style={{ backgroundColor: color + '40' }}
              >
                {EVENT_ICONS[event.type]}
              </span>
              <span className="font-medium">{event.fileName}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400">{event.folderPath}</div>
            <div className="mt-1 text-xs text-gray-500">{event.timestamp.toLocaleString()}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// Time Period Indicator
// =============================================================================

interface TimePeriodIndicatorProps {
  label: string;
  startX: number;
  endX: number;
  color: string;
}

function TimePeriodIndicator({ label, startX, endX, color }: TimePeriodIndicatorProps) {
  const width = endX - startX;
  const centerX = startX + width / 2;

  return (
    <group position={[centerX, -2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
      <Text
        position={[0, 0.1, 1.2]}
        fontSize={0.25}
        color={color}
        anchorX="center"
        rotation={[0, 0, 0]}
      >
        {label}
      </Text>
    </group>
  );
}

// =============================================================================
// Main Visualization Component
// =============================================================================

interface TimelineVisualizationProps {
  timeRange?: {
    relative?: string;
  };
  visible?: boolean;
}

export function TimelineVisualization({
  timeRange: _timeRange,
  visible = true,
}: TimelineVisualizationProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: recentEvents } = useRecentEvents(100);

  // Seeded random function for deterministic positioning
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  // Process events into timeline data
  const { events, timelineLength } = useMemo(() => {
    // Use real events if available, otherwise use mock data
    const rawEvents = recentEvents || [];
    const referenceTime = rawEvents.length > 0 ? new Date(rawEvents[0].time).getTime() : 0;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const length = 20;

    const processedEvents: TimelineEvent[] = rawEvents.slice(0, 50).map(
      (
        event: {
          id: number;
          type: string;
          data?: { folder?: string; item?: string; action?: string };
          time: string;
        },
        index: number
      ) => {
        const timestamp = new Date(event.time);
        const timeDelta = referenceTime - timestamp.getTime();
        const normalizedPosition = 1 - timeDelta / sevenDaysMs;
        const x = normalizedPosition * length - length / 2;

        // Determine event type
        let type: TimelineEvent['type'] = 'sync';
        if (event.type?.includes('ItemFinished')) type = 'sync';
        else if (event.type?.includes('LocalChange')) type = 'modify';
        else if (event.type?.includes('Delete')) type = 'delete';
        else if (event.type?.includes('Add') || event.type?.includes('Start')) type = 'add';
        else if (event.type?.includes('Conflict')) type = 'conflict';
        else if (event.type?.includes('Error') || event.type?.includes('Fail')) type = 'error';

        // Vertical position based on event type with deterministic variation
        const yBase = { sync: 2, modify: 2.5, delete: 1.5, add: 3, conflict: 3.5, error: 1 };
        const y = (yBase[type] || 2) + (seededRandom(index * 1.5) - 0.5) * 0.5;

        // Z position for depth variation (deterministic)
        const z = (seededRandom(index * 2.7) - 0.5) * 4;

        return {
          id: `event-${event.id || index}`,
          type,
          fileName: event.data?.item || `Event ${index + 1}`,
          folderPath: event.data?.folder || 'Unknown folder',
          timestamp,
          position: [x, y, z] as [number, number, number],
        };
      }
    );

    return { events: processedEvents, timelineLength: length };
  }, [recentEvents]);

  const handleSelect = (id: string) => {
    setSelected(selected === id ? null : id);
  };

  return (
    <group>
      {/* Timeline axis */}
      <TimelineAxis length={timelineLength} />

      {/* Time period indicators */}
      <TimePeriodIndicator
        label="Today"
        startX={timelineLength / 2 - 3}
        endX={timelineLength / 2}
        color="#22c55e"
      />
      <TimePeriodIndicator
        label="This Week"
        startX={-timelineLength / 2}
        endX={timelineLength / 2 - 3}
        color="#3b82f6"
      />

      {/* Event markers */}
      {events.map((event) => (
        <EventMarker
          key={event.id}
          event={event}
          isSelected={selected === event.id}
          onSelect={handleSelect}
          visible={visible}
        />
      ))}

      {/* Empty state */}
      {events.length === 0 && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.5}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, 0]}
        >
          No recent activity
        </Text>
      )}

      {/* Header */}
      <Text
        position={[0, 5, 0]}
        fontSize={0.6}
        color="white"
        anchorX="center"
        anchorY="bottom"
        rotation={[0, 0, 0]}
      >
        Activity Timeline
      </Text>
      <Text
        position={[0, 4.3, 0]}
        fontSize={0.3}
        color="#64748b"
        anchorX="center"
        anchorY="bottom"
        rotation={[0, 0, 0]}
      >
        {events.length} events in the last 7 days
      </Text>

      {/* Legend */}
      {visible && (
        <Html position={[timelineLength / 2 + 2, 3, 0]} style={{ pointerEvents: 'none' }}>
          <div className="rounded-lg border border-white/10 bg-black/80 px-3 py-2 backdrop-blur-sm">
            <div className="mb-2 text-xs text-gray-400">Event Types</div>
            <div className="space-y-1">
              {Object.entries(EVENT_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-white capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default TimelineVisualization;
