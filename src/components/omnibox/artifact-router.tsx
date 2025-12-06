/**
 * Artifact Router — Cosmic Artifact Chamber
 *
 * Routes to the appropriate artifact visualization using the LiminalShell system.
 * This provides the cinematic, liminal-room experience with single hero artifacts.
 *
 * Features:
 * - Automatic artifact selection based on visualization type
 * - Support for direct artifact entry via store
 * - Cinematic liminal transitions between artifacts
 * - Pending request awareness for beacon spawning
 */

'use client';

import { Suspense, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualizationStore } from '@/store/omnibox';
import { usePendingDevices, usePendingFolders } from '@/hooks/syncthing/pending';
import { useResolvedTheme } from '@/components/theme-provider';
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
// Title Overlay with Glow Effect
// =============================================================================

interface TitleOverlayProps {
  title: string;
  description?: string;
  isPending?: boolean;
  isDark?: boolean;
}

function TitleOverlay({ title, description, isPending, isDark = true }: TitleOverlayProps) {
  // Map artifact titles to user-friendly page names
  const getPageName = (artifactTitle: string): string => {
    const pageNames: Record<string, string> = {
      'Nexus Prism': 'Dashboard',
      'Obsidian Core': 'Storage',
      Conduit: 'Sync Activity',
      Fracture: 'Conflicts',
      'Archive Lattice': 'Folders',
      Heart: 'System Health',
      Spire: 'Timeline',
      Monolith: 'Help',
      'Request Beacon': 'Pending Requests',
    };
    return pageNames[artifactTitle] || artifactTitle;
  };

  const pageName = getPageName(title);

  return (
    <motion.div
      className="pointer-events-none absolute bottom-6 left-6 z-10"
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2
        className={`text-3xl font-light tracking-widest uppercase ${
          isPending
            ? 'glow-text-gold text-amber-200'
            : isDark
              ? 'glow-text text-white/90'
              : 'text-slate-700'
        }`}
      >
        {pageName}
      </h2>
      {description && (
        <p
          className={`mt-1 text-sm font-light tracking-wide ${isDark ? 'text-white/50' : 'text-slate-500'}`}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}

// =============================================================================
// Pending Alert Badge
// =============================================================================

interface PendingAlertBadgeProps {
  count: number;
  isDark?: boolean;
}

function PendingAlertBadge({ count, isDark = true }: PendingAlertBadgeProps) {
  if (count === 0) return null;

  return (
    <motion.div
      className="absolute top-6 right-6 z-20"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`animate-beacon-pulse glow-text-gold flex items-center gap-2 rounded-full border border-amber-400/40 px-4 py-2 backdrop-blur-xl ${
          isDark ? 'bg-black/60' : 'bg-white/60'
        }`}
      >
        <span className="text-lg">🔔</span>
        <span className={`font-mono text-sm ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
          {count} pending request{count > 1 ? 's' : ''}
        </span>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Artifact Router
// =============================================================================

export function ArtifactRouter() {
  const { type, currentArtifact, setTransitioning, isTransitioning } = useVisualizationStore();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  // Get pending requests for alert badge
  const { data: pendingDevices } = usePendingDevices();
  const { data: pendingFolders } = usePendingFolders();

  const pendingCount = useMemo(() => {
    const deviceCount = pendingDevices ? Object.keys(pendingDevices).length : 0;
    const folderCount = pendingFolders ? Object.keys(pendingFolders).length : 0;
    return deviceCount + folderCount;
  }, [pendingDevices, pendingFolders]);

  // Clear transitioning state after animation
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setTransitioning(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, setTransitioning]);

  // Determine which artifact to show
  const artifactType = useMemo(() => {
    // If we have a direct artifact entry, use that
    if (currentArtifact?.artifactType) {
      const directType = currentArtifact.artifactType as ArtifactType;
      if (directType in ARTIFACTS) {
        return directType;
      }
    }

    // Check if current visualization type has an artifact
    if (hasArtifact(type)) {
      return type as ArtifactType;
    }

    // Default to device-topology (Nexus Prism)
    return 'device-topology' as ArtifactType;
  }, [type, currentArtifact]);

  const artifact = ARTIFACTS[artifactType];
  const isPendingArtifact = artifactType === 'pending-requests';

  return (
    <div className="bg-cosmic relative h-full w-full overflow-hidden">
      {/* Liminal fog overlay - hide in light mode */}
      {isDark && <div className="liminal-fog pointer-events-none absolute inset-0 z-10" />}

      {/* Pending alert badge */}
      <PendingAlertBadge count={pendingCount} isDark={isDark} />

      {/* Main artifact with cinematic transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={artifactType}
          className="h-full w-full"
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<ArtifactLoader />}>
            <LiminalShell title={artifact.title} isDark={isDark}>
              <ArtifactContent type={artifactType} />
            </LiminalShell>
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Title overlay */}
      <AnimatePresence>
        <TitleOverlay
          title={artifact.title}
          description={artifact.description}
          isPending={isPendingArtifact}
          isDark={isDark}
        />
      </AnimatePresence>
    </div>
  );
}

export default ArtifactRouter;
