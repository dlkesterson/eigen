'use client';

import { useConnections, useConfig } from '@/hooks/useSyncthing';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface DeviceNode {
  id: string;
  name: string;
  connected: boolean;
  x: number;
  y: number;
}

export function NetworkGraph() {
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: config, isLoading: configLoading } = useConfig();

  const { nodes, lines, myDeviceId } = useMemo(() => {
    if (!connections || !config) {
      return { nodes: [], lines: [], myDeviceId: null };
    }

    const deviceNodes: DeviceNode[] = [];
    const conns = connections.connections || {};
    const devices = config.devices || [];

    // Find my device ID from connections response
    const myId = (connections as { myID?: string }).myID || null;

    // Center position
    const centerX = 150;
    const centerY = 120;
    const radius = 80;

    // Add my device at center
    if (myId) {
      const myDevice = devices.find((d: { deviceID: string }) => d.deviceID === myId);
      deviceNodes.push({
        id: myId,
        name: myDevice?.name || 'This Device',
        connected: true,
        x: centerX,
        y: centerY,
      });
    }

    // Add other devices in a circle around center
    const otherDevices = devices.filter((d: { deviceID: string }) => d.deviceID !== myId);
    const angleStep = (2 * Math.PI) / Math.max(otherDevices.length, 1);

    otherDevices.forEach((device: { deviceID: string; name?: string }, index: number) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const connectionInfo = conns[device.deviceID] as { connected?: boolean } | undefined;

      deviceNodes.push({
        id: device.deviceID,
        name: device.name || device.deviceID.slice(0, 8),
        connected: connectionInfo?.connected ?? false,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    // Build connection lines from center to connected devices
    const connectionLines: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }> = [];
    const centerNode = deviceNodes.find((n) => n.id === myId);

    if (centerNode) {
      deviceNodes
        .filter((n) => n.id !== myId && n.connected)
        .forEach((node) => {
          connectionLines.push({
            x1: centerNode.x,
            y1: centerNode.y,
            x2: node.x,
            y2: node.y,
          });
        });
    }

    return { nodes: deviceNodes, lines: connectionLines, myDeviceId: myId };
  }, [connections, config]);

  if (connectionsLoading || configLoading) {
    return <Skeleton className="h-64 w-full rounded-xl bg-slate-800/50" />;
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-slate-900/50 backdrop-blur-md">
        <p className="text-sm text-slate-400">
          No devices connected. Start Syncthing to see your network.
        </p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-md">
      <svg viewBox="0 0 300 240" className="h-full w-full">
        {/* Connection lines */}
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#6366f1"
            strokeWidth="2"
            strokeOpacity="0.5"
            strokeDasharray="4 2"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="12"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
        ))}

        {/* Device nodes */}
        {nodes.map((node) => {
          const isMe = node.id === myDeviceId;
          const nodeRadius = isMe ? 24 : 18;
          const color = isMe ? '#6366f1' : node.connected ? '#10b981' : '#6b7280';

          return (
            <g key={node.id}>
              {/* Glow effect */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius + 4}
                fill={color}
                opacity={node.connected || isMe ? 0.3 : 0.1}
              >
                {(node.connected || isMe) && (
                  <animate
                    attributeName="opacity"
                    values="0.3;0.5;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>

              {/* Main circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill={color}
                stroke={isMe ? '#818cf8' : node.connected ? '#34d399' : '#9ca3af'}
                strokeWidth="2"
              />

              {/* Icon */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isMe ? '14' : '12'}
              >
                {isMe ? '💻' : node.connected ? '📱' : '📴'}
              </text>

              {/* Label */}
              <text
                x={node.x}
                y={node.y + nodeRadius + 14}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="500"
                className="select-none"
              >
                {node.name.length > 12 ? node.name.slice(0, 12) + '…' : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
