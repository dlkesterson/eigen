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

// Artifact components (new cinematic system)
export { default as NexusPrism } from './artifacts/nexus-prism';
export { default as ObsidianCore } from './artifacts/obsidian-core';
export { default as Conduit } from './artifacts/conduit';
export { default as Fracture } from './artifacts/fracture';
export { default as ArchiveLattice } from './artifacts/archive-lattice';
export { default as Heart } from './artifacts/heart';
export { default as Spire } from './artifacts/spire';
export { default as HelpMonolith } from './artifacts/help-monolith';
