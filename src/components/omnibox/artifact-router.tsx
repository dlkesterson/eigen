/**
 * Artifact Router
 *
 * Routes to the appropriate artifact visualization using the new LiminalShell system.
 * This provides the cinematic, liminal-room experience with single hero artifacts.
 *
 * Usage:
 * - Set useArtifacts: true in the visualization store to enable artifact mode
 * - Automatically falls back to classic visualizations for unsupported types
 */

'use client';

import { Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualizationStore } from '@/store/omnibox';
import { ARTIFACTS, hasArtifact, type ArtifactType } from './visualizations/registry';
import { LiminalShell } from './visualizations/_shell/LiminalShell';
import { LoaderOverlay } from './visualizations/_shell';

// =============================================================================
// Loading Fallback
// =============================================================================

function ArtifactLoader() {
  return <LoaderOverlay message="Materializing artifact..." />;
}

// =============================================================================
// Artifact Content
// =============================================================================

interface ArtifactContentProps {
  type: ArtifactType;
}

function ArtifactContent({ type }: ArtifactContentProps) {
  const artifact = ARTIFACTS[type];
  const Component = artifact.component;

  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}

// =============================================================================
// Title Overlay
// =============================================================================

interface TitleOverlayProps {
  title: string;
  description?: string;
}

function TitleOverlay({ title, description }: TitleOverlayProps) {
  return (
    <motion.div
      className="pointer-events-none absolute bottom-6 left-6 z-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h2 className="text-3xl font-light tracking-widest text-white/90 uppercase">{title}</h2>
      {description && (
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">{description}</p>
      )}
    </motion.div>
  );
}

// =============================================================================
// Main Artifact Router
// =============================================================================

export function ArtifactRouter() {
  const { type } = useVisualizationStore();

  // Check if current type has an artifact
  const artifactType = useMemo(() => {
    if (hasArtifact(type)) {
      return type as ArtifactType;
    }
    // Default to device-topology if no artifact exists for current type
    return 'device-topology' as ArtifactType;
  }, [type]);

  const artifact = ARTIFACTS[artifactType];

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={artifactType}
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Suspense fallback={<ArtifactLoader />}>
            <LiminalShell title={artifact.title}>
              <ArtifactContent type={artifactType} />
            </LiminalShell>
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Title overlay */}
      <TitleOverlay title={artifact.title} description={artifact.description} />
    </div>
  );
}

export default ArtifactRouter;
