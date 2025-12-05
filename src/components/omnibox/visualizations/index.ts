/**
 * Visualization Components Index
 *
 * Exports all visualization components and shared utilities for the Omnibox system.
 */

// Shell components for building visualizations
export * from './_shell';

// Registry with lazy-loaded components and presets
export {
    VISUALIZATIONS,
    VISUALIZATION_PRESETS,
    getVisualizationConfig,
    preloadVisualization,
    getVisualizationTypes,
    type VisualizationPreset,
    type VisualizationConfig,
    type VisualizationComponentProps,
} from './registry';

// Direct exports for cases where lazy loading isn't needed
export { DeviceTopologyVisualization } from './device-topology';
export { FolderExplorerVisualization } from './folder-explorer';
export { SyncFlowVisualization } from './sync-flow';
export { ConflictSpaceVisualization } from './conflict-space';
export { StorageGlobeVisualization } from './storage-globe';
export { TimelineVisualization } from './timeline';
export { HealthDashboardVisualization } from './health-dashboard';
export { HelpCenterVisualization } from './help-center';
export { SettingsSpaceVisualization } from './settings-space';
