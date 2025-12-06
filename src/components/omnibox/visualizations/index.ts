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
  ARTIFACTS,
  getVisualizationConfig,
  preloadVisualization,
  getVisualizationTypes,
  hasArtifact,
  getArtifactConfig,
  type VisualizationPreset,
  type VisualizationConfig,
  type VisualizationComponentProps,
  type ArtifactType,
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

// Artifact components (new cinematic system) - only keeping request-beacon
export { default as RequestBeacon } from './artifacts/request-beacon';
