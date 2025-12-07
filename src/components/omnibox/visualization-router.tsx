/**
 * Visualization Router
 *
 * Routes to the appropriate 3D visualization based on the current visualization type.
 * Uses lazy loading for optimal performance - only loads the active visualization.
 * Handles transitions between visualizations and manages visualization state.
 */

import { Suspense, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useVisualizationStore } from '@/store/omnibox';
import type { VisualizationType, VisualizationFilters } from '@/types/omnibox';
import { VISUALIZATION_META } from '@/constants/omnibox';

// Import shell components and registry
import { VisualizationShell, CosmicLoader, LoaderOverlay } from './visualizations/_shell';
import {
  VISUALIZATIONS,
  VISUALIZATION_PRESETS,
  preloadVisualization,
} from './visualizations/registry';

// =============================================================================
// Loading Fallback
// =============================================================================

function VisualizationLoader() {
  return <LoaderOverlay message="Loading visualization..." />;
}

// =============================================================================
// Lazy Visualization Selector
// =============================================================================

interface VisualizationSelectorProps {
  type: VisualizationType;
  selectedObjects: string[];
  filters: VisualizationFilters;
}

function VisualizationSelector({ type, selectedObjects, filters }: VisualizationSelectorProps) {
  const preset = VISUALIZATION_PRESETS[type];
  const Component = VISUALIZATIONS[type];

  // Build props based on visualization type
  const componentProps = useMemo(() => {
    const baseProps = { visible: true };

    switch (type) {
      case 'device-topology':
      case 'storage-globe':
        return { ...baseProps, selectedDevices: selectedObjects };
      case 'folder-explorer':
        return { ...baseProps, selectedFolders: selectedObjects };
      case 'conflict-space':
        return { ...baseProps, selectedFiles: selectedObjects };
      case 'timeline':
        return { ...baseProps, timeRange: filters.timeRange as { relative?: string } };
      default:
        return baseProps;
    }
  }, [type, selectedObjects, filters]);

  return (
    <VisualizationShell
      cameraPreset={preset.camera}
      autoRotate={preset.autoRotate}
      autoRotateSpeed={preset.autoRotateSpeed}
      controls={preset.controls}
      enablePan={preset.enablePan}
    >
      <Suspense fallback={<CosmicLoader />}>
        <Component {...componentProps} />
      </Suspense>
    </VisualizationShell>
  );
}

// =============================================================================
// Visualization Info Overlay
// =============================================================================

interface VisualizationInfoProps {
  type: VisualizationType;
}

function VisualizationInfo({ type }: VisualizationInfoProps) {
  const meta = VISUALIZATION_META[type];

  return (
    <motion.div
      className="absolute top-4 left-4 z-10"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="bg-background/60 border-border/50 flex items-center gap-2 rounded-lg border px-3 py-2 backdrop-blur-sm">
        <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
        <span className="text-sm font-medium">{meta.name}</span>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Visualization Router Component
// =============================================================================

export interface VisualizationRouterProps {
  className?: string;
}

export function VisualizationRouter({ className }: VisualizationRouterProps) {
  const { type, selectedObjects, filters } = useVisualizationStore();
  const [isReady, setIsReady] = useState(false);

  // Set ready state after initial mount
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Preload adjacent visualizations for smooth transitions
  useEffect(() => {
    // Preload the help center since it's commonly accessed
    preloadVisualization('help-center');
    // Preload health dashboard as a common fallback
    preloadVisualization('health-dashboard');
  }, []);

  // Memoize canvas configuration
  const canvasConfig = useMemo(
    () => ({
      gl: {
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance' as const,
      },
    }),
    []
  );

  if (!isReady) {
    return <VisualizationLoader />;
  }

  return (
    <div className={`relative h-full w-full ${className || ''}`}>
      {/* Visualization Info */}
      <AnimatePresence mode="wait">
        <VisualizationInfo key={type} type={type} />
      </AnimatePresence>

      {/* 3D Canvas - Shell handles camera, lighting, fog, and controls */}
      <Canvas
        {...canvasConfig}
        style={{ background: 'linear-gradient(180deg, #050810 0%, #0a1020 100%)' }}
        fallback={<VisualizationLoader />}
      >
        <VisualizationSelector type={type} selectedObjects={selectedObjects} filters={filters} />
      </Canvas>

      {/* Controls Legend */}
      <div className="text-muted-foreground/60 absolute right-4 bottom-4 z-10 text-xs">
        <div className="bg-background/40 border-border/30 flex items-center gap-4 rounded-lg border px-3 py-2 backdrop-blur-sm">
          <span>🖱️ Orbit</span>
          <span>🔍 Scroll to zoom</span>
          <span>⇧+🖱️ Pan</span>
        </div>
      </div>
    </div>
  );
}

export default VisualizationRouter;
