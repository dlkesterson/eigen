'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useConnections, useConfig, useSystemStatus } from '@/hooks/useSyncthing';
import { useMemo, useRef, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ForceGraph must be dynamically imported as it relies on window
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  name: string;
  val: number;
  group: 'me' | 'peer';
  color: string;
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  color: string;
  particles: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function NetworkGraphLive() {
  const { resolvedTheme } = useTheme();
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { data: config, isLoading: configLoading } = useConfig();
  const { data: systemStatus } = useSystemStatus();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 256 });

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Transform data into Graph format
  const graphData = useMemo<GraphData>(() => {
    if (!config?.devices) return { nodes: [], links: [] };

    // Get myID from systemStatus (not connections)
    const myId = systemStatus?.myID;
    const conns = connections?.connections || {};

    const nodes: GraphNode[] = config.devices.map((d: { deviceID: string; name?: string }) => ({
      id: d.deviceID,
      name: d.name || d.deviceID.slice(0, 6),
      val: d.deviceID === myId ? 20 : 10,
      group: d.deviceID === myId ? 'me' : 'peer',
      color:
        d.deviceID === myId
          ? '#6366f1' // Indigo for self (always "connected" - it's us!)
          : (conns[d.deviceID] as { connected?: boolean })?.connected
            ? '#10b981' // Green for connected
            : '#ef4444', // Red for disconnected
    }));

    // Create links from "Me" to everyone else (Hub and Spoke)
    const links: GraphLink[] = config.devices
      .filter((d: { deviceID: string }) => d.deviceID !== myId)
      .map((d: { deviceID: string }) => ({
        source: myId || '',
        target: d.deviceID,
        color: (conns[d.deviceID] as { connected?: boolean })?.connected
          ? '#10b981'
          : resolvedTheme === 'dark'
            ? '#334155'
            : '#cbd5e1',
        particles: (conns[d.deviceID] as { connected?: boolean })?.connected ? 4 : 0,
      }))
      .filter((link: GraphLink) => link.source); // Only include if we have a source

    return { nodes, links };
  }, [connections, config, systemStatus, resolvedTheme]);

  // Adjust engine forces and center the graph
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-80);
      fgRef.current.d3Force('link')?.distance(50);
      fgRef.current
        .d3Force('center')
        ?.x(dimensions.width / 2)
        ?.y(dimensions.height / 2);
      // Zoom to fit after initial render
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 50);
        }
      }, 500);
    }
  }, [graphData, dimensions]);

  const isLoading = connectionsLoading || configLoading;

  if (isLoading) {
    return (
      <div className="bg-card/30 flex h-full w-full items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="bg-card/30 flex h-full min-h-[200px] w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">No devices configured</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-card/30 h-full min-h-[280px] w-full">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel="name"
        nodeRelSize={6}
        nodeColor="color"
        linkColor="color"
        linkDirectionalParticles="particles"
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={4}
        linkDirectionalParticleColor="color"
        d3AlphaDecay={0.05}
        cooldownTicks={100}
        onNodeDragEnd={(node) => {
          node.fx = node.x;
          node.fy = node.y;
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = (node as GraphNode).name || '';
          const fontSize = 12 / globalScale;
          const nodeSize = ((node as GraphNode).val || 10) / 2;
          const nodeColor = (node as GraphNode).color || '#6366f1';
          const nodeGroup = (node as GraphNode).group;
          const isDark = resolvedTheme === 'dark';

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          // Draw glow effect for "me" node
          if (nodeGroup === 'me') {
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, nodeSize + 2, 0, 2 * Math.PI);
            ctx.strokeStyle = `${nodeColor}66`;
            ctx.lineWidth = 3 / globalScale;
            ctx.stroke();
          }

          // Draw label with background for better readability
          const labelY = (node.y || 0) + nodeSize + fontSize + 4;
          ctx.font = `500 ${fontSize}px 'DM Sans', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Measure text for background
          const textMetrics = ctx.measureText(label);
          const padding = 4 / globalScale;
          const bgHeight = fontSize + padding * 2;
          const bgWidth = textMetrics.width + padding * 2;

          // Draw text background pill
          ctx.beginPath();
          ctx.roundRect(
            (node.x || 0) - bgWidth / 2,
            labelY - bgHeight / 2,
            bgWidth,
            bgHeight,
            4 / globalScale
          );
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
          ctx.fill();

          // Draw text
          ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
          ctx.fillText(label, node.x || 0, labelY);
        }}
      />
    </div>
  );
}
