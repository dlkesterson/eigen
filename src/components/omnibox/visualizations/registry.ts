/**
 * Visualization Registry
 *
 * Central registry for all visualizations with:
 * - Lazy-loaded components for optimal performance
 * - Camera and behavior presets per visualization
 * - Type-safe configuration
 *
 * Usage:
 * ```tsx
 * const Component = VISUALIZATIONS[type];
 * const preset = VISUALIZATION_PRESETS[type];
 *
 * <VisualizationShell {...preset}>
 *   <Suspense fallback={<CosmicLoader />}>
 *     <Component />
 *   </Suspense>
 * </VisualizationShell>
 * ```
 */

import { lazy, type ComponentType } from 'react';
import type { VisualizationType } from '@/types/omnibox';
import type { CameraPreset } from './_shell';

// =============================================================================
// Types
// =============================================================================

export interface VisualizationPreset {
    /** Camera distance preset */
    camera: CameraPreset;
    /** Enable auto-rotation */
    autoRotate: boolean;
    /** Auto-rotation speed (default: 0.3) */
    autoRotateSpeed?: number;
    /** Enable controls */
    controls?: boolean;
    /** Enable panning */
    enablePan?: boolean;
    /** Description for best use case */
    bestFor: string;
}

export interface VisualizationConfig {
    component: ComponentType<VisualizationComponentProps>;
    preset: VisualizationPreset;
}

export interface VisualizationComponentProps {
    visible?: boolean;
    selectedDevices?: string[];
    selectedFolders?: string[];
    selectedFiles?: string[];
    timeRange?: { relative?: string };
}

// =============================================================================
// Import Loaders (for preloading)
// =============================================================================

const VISUALIZATION_LOADERS: Record<VisualizationType, () => Promise<unknown>> = {
    'device-topology': () => import('./device-topology'),
    'folder-explorer': () => import('./folder-explorer'),
    'sync-flow': () => import('./sync-flow'),
    'conflict-space': () => import('./conflict-space'),
    'storage-globe': () => import('./storage-globe'),
    timeline: () => import('./timeline'),
    'health-dashboard': () => import('./health-dashboard'),
    'help-center': () => import('./help-center'),
    'settings-space': () => import('./settings-space'),
};

// =============================================================================
// Lazy-loaded Visualization Components
// =============================================================================

export const VISUALIZATIONS: Record<VisualizationType, ComponentType<VisualizationComponentProps>> = {
    'device-topology': lazy(() =>
        import('./device-topology').then((m) => ({ default: m.DeviceTopologyVisualization }))
    ),
    'folder-explorer': lazy(() =>
        import('./folder-explorer').then((m) => ({ default: m.FolderExplorerVisualization }))
    ),
    'sync-flow': lazy(() =>
        import('./sync-flow').then((m) => ({ default: m.SyncFlowVisualization }))
    ),
    'conflict-space': lazy(() =>
        import('./conflict-space').then((m) => ({ default: m.ConflictSpaceVisualization }))
    ),
    'storage-globe': lazy(() =>
        import('./storage-globe').then((m) => ({ default: m.StorageGlobeVisualization }))
    ),
    timeline: lazy(() =>
        import('./timeline').then((m) => ({ default: m.TimelineVisualization }))
    ),
    'health-dashboard': lazy(() =>
        import('./health-dashboard').then((m) => ({ default: m.HealthDashboardVisualization }))
    ),
    'help-center': lazy(() =>
        import('./help-center').then((m) => ({ default: m.HelpCenterVisualization }))
    ),
    'settings-space': lazy(() =>
        import('./settings-space').then((m) => ({ default: m.SettingsSpaceVisualization }))
    ),
};

// =============================================================================
// Visualization Presets
// =============================================================================

export const VISUALIZATION_PRESETS: Record<VisualizationType, VisualizationPreset> = {
    'device-topology': {
        camera: 'wide',
        autoRotate: true,
        autoRotateSpeed: 0.2,
        bestFor: 'Desktop hero view - overview of device network',
    },
    'folder-explorer': {
        camera: 'medium',
        autoRotate: false,
        enablePan: true,
        bestFor: 'Interactive exploration - navigation focused',
    },
    'sync-flow': {
        camera: 'medium',
        autoRotate: true,
        autoRotateSpeed: 0.3,
        bestFor: 'Monitoring data transfers - ambient display',
    },
    'conflict-space': {
        camera: 'close',
        autoRotate: true,
        autoRotateSpeed: 0.15,
        bestFor: 'Mobile focus - detailed conflict inspection',
    },
    'storage-globe': {
        camera: 'globe',
        autoRotate: false,
        enablePan: true,
        bestFor: 'Touch-first interaction - globe manipulation',
    },
    timeline: {
        camera: 'medium',
        autoRotate: true,
        autoRotateSpeed: 0.1,
        bestFor: 'All devices - historical data browsing',
    },
    'health-dashboard': {
        camera: 'medium',
        autoRotate: false,
        controls: true,
        bestFor: 'Data density - static panels with readable stats',
    },
    'help-center': {
        camera: 'close',
        autoRotate: true,
        autoRotateSpeed: 0.2,
        bestFor: 'Quick reference - command browsing',
    },
    'settings-space': {
        camera: 'medium',
        autoRotate: true,
        autoRotateSpeed: 0.1,
        controls: true,
        enablePan: true,
        bestFor: 'Configuration - interactive settings panels',
    },
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the visualization component and preset for a given type
 */
export function getVisualizationConfig(type: VisualizationType): VisualizationConfig {
    return {
        component: VISUALIZATIONS[type],
        preset: VISUALIZATION_PRESETS[type],
    };
}

/**
 * Preload a visualization component (call on hover or ahead of time)
 * This triggers the dynamic import to fetch the module ahead of time
 */
export function preloadVisualization(type: VisualizationType): void {
    const loader = VISUALIZATION_LOADERS[type];
    if (loader) {
        // Trigger the dynamic import - webpack will cache it
        void loader();
    }
}

/**
 * Get all visualization types as an array
 */
export function getVisualizationTypes(): VisualizationType[] {
    return Object.keys(VISUALIZATIONS) as VisualizationType[];
}

export default VISUALIZATIONS;
