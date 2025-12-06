/**
 * Shell Components Index
 *
 * Exports all shared shell components for visualizations.
 */

export {
  VisualizationShell,
  type VisualizationShellProps,
  type CameraPreset,
} from './VisualizationShell';
export {
  InfoBeacon,
  DeviceInfoBeacon,
  FolderInfoBeacon,
  type InfoBeaconProps,
  type DeviceInfoBeaconProps,
  type FolderInfoBeaconProps,
} from './InfoBeacon';
export {
  CosmicLoader,
  LoaderOverlay,
  type CosmicLoaderProps,
  type LoaderOverlayProps,
} from './CosmicLoader';

// New Liminal Shell (Artifact system)
export { LiminalShell, type LiminalShellProps } from './LiminalShell';
export {
  ArtifactWrapper,
  useResponsive,
  type ArtifactWrapperProps,
  type ArtifactCameraPreset,
} from './ArtifactWrapper';
