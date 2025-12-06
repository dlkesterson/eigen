/**
 * Omnibox Dashboard — Cosmic Artifact Chamber
 *
 * The main visualization interface transformed into a pure artifact chamber.
 * Features:
 * - CosmicSearchBar as the singular input method
 * - ArtifactRouter for cinematic hero visualizations
 * - StatsStack for compact sync metrics (top-right)
 * - StatusHUD for connection, refresh, settings, notifications
 * - Glass overlays for Layer 3 rooms (per UX guide)
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Omnibox, OnboardingTutorial, useOnboarding, WelcomeBadge } from '@/components/omnibox';
import { ArtifactRouter } from '@/components/omnibox/artifact-router';
import { CosmicSearchBar } from '@/components/constellation/cosmic-search-bar';
import { StatusHud, StatsStack } from '@/components/constellation/hud-panel';
import { GlassOverlay } from '@/components/omnibox/visualizations/_shell';
import {
  DeviceDetailsPanel,
  FolderDetailsPanel,
  PendingRequestPanel,
  SettingsPanel,
} from '@/components/omnibox/visualizations/artifacts/_shared';
import { PendingRequestsDialog } from '@/components/pending-requests-dialog';
import { useOmnibox, useVisualizationStore } from '@/store/omnibox';
import { useAppStore } from '@/store';
import { useSystemStatus, useConnections, useConfig } from '@/hooks/syncthing';
import { usePendingDevices, usePendingFolders } from '@/hooks/syncthing/pending';
import type { ParsedCommand } from '@/types/omnibox';
import {
  pauseDevice,
  resumeDevice,
  pauseFolder,
  resumeFolder,
  rescanFolder,
  restartSyncthing,
} from '@/lib/tauri-commands';
import { logger } from '@/lib/logger';
import { useResolvedTheme } from '@/components/theme-provider';
import { cn, formatBytes, formatRate } from '@/lib/utils';

export function OmniboxDashboard() {
  const { actions } = useOmnibox();
  const {
    setSearchQuery,
    enterArtifact,
    currentArtifact,
    setDisplayModeFromResults,
    currentRoom,
    exitRoom,
    enterRoom,
  } = useVisualizationStore();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const { showOnboarding, hasChecked, completeOnboarding, skipOnboarding, resetOnboarding } =
    useOnboarding();

  // Theme support
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  // Local state for pending dialog (legacy fallback)
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  // System status for connection state
  const { data: status, isError, refetch, isRefetching } = useSystemStatus();
  const isOnline = !isError && !!status?.myID;

  // Real-time data for HUD panels
  const { data: connections } = useConnections();
  const { data: config } = useConfig();
  const { data: pendingDevices } = usePendingDevices();
  const { data: pendingFolders } = usePendingFolders();

  // Calculate HUD metrics
  const hudMetrics = useMemo(() => {
    const connectionList = connections?.connections || {};
    const devices = config?.devices || [];

    // Online devices count
    const onlineDevices = Object.values(connectionList).filter(
      (c: unknown) => (c as { connected?: boolean }).connected
    ).length;

    // Total sync rate (in + out)
    let totalInRate = 0;
    let totalOutRate = 0;
    Object.values(connectionList).forEach((conn: unknown) => {
      const c = conn as { inBytesPerSecond?: number; outBytesPerSecond?: number };
      totalInRate += c.inBytesPerSecond || 0;
      totalOutRate += c.outBytesPerSecond || 0;
    });

    // Pending requests count
    const pendingCount =
      (pendingDevices ? Object.keys(pendingDevices).length : 0) +
      (pendingFolders ? Object.keys(pendingFolders).length : 0);

    // Folder count
    const folderCount = config?.folders?.length || 0;

    return {
      syncRate: formatRate(totalInRate + totalOutRate),
      connectedNodes: `${onlineDevices}/${devices.length}`,
      pendingArtifacts: pendingCount,
      folders: folderCount,
    };
  }, [connections, config, pendingDevices, pendingFolders]);

  // Handle cosmic search with layer-aware display
  const handleCosmicSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Natural language command mapping
      const lowerQuery = query.toLowerCase();

      // For help/search queries, we'll implement layer-aware display
      // Per UX guide: ≤8 results → floating cards (Layer 2), >8 → glass panel (Layer 3)
      if (
        lowerQuery.includes('help') ||
        lowerQuery.includes('monolith') ||
        lowerQuery.includes('?')
      ) {
        // Simulate search results count for demo - in production this would come from actual search
        const mockResultCount = lowerQuery.length > 10 ? 12 : 5;
        setDisplayModeFromResults(mockResultCount);
        enterArtifact('help-center', { meta: { query, resultCount: mockResultCount } });
        return;
      }

      // Standard artifact navigation
      if (lowerQuery.includes('conflict') || lowerQuery.includes('fracture')) {
        enterArtifact('conflict-space');
      } else if (lowerQuery.includes('health') || lowerQuery.includes('heart')) {
        enterArtifact('health-dashboard');
      } else if (lowerQuery.includes('device') || lowerQuery.includes('nexus')) {
        enterArtifact('device-topology');
      } else if (lowerQuery.includes('folder') || lowerQuery.includes('archive')) {
        enterArtifact('folder-explorer');
      } else if (lowerQuery.includes('storage') || lowerQuery.includes('obsidian')) {
        enterArtifact('storage-globe');
      } else if (lowerQuery.includes('timeline') || lowerQuery.includes('spire')) {
        enterArtifact('timeline');
      } else if (
        lowerQuery.includes('sync') ||
        lowerQuery.includes('conduit') ||
        lowerQuery.includes('transfer')
      ) {
        enterArtifact('sync-flow');
      } else if (
        lowerQuery.includes('pending') ||
        lowerQuery.includes('request') ||
        lowerQuery.includes('beacon')
      ) {
        enterArtifact('pending-requests');
      }
      // Easter egg handling is in CosmicSearchBar
    },
    [setSearchQuery, enterArtifact, setDisplayModeFromResults]
  );

  // Handle command execution (from Omnibox)
  const handleCommand = useCallback(
    async (command: ParsedCommand) => {
      logger.debug('Executing command', { component: 'OmniboxDashboard', command });

      // Handle actions
      if (command.action) {
        try {
          switch (command.action) {
            case 'sync':
              if (command.entities.folders?.[0]) {
                await rescanFolder(command.entities.folders[0]);
              }
              break;

            case 'pause':
              if (command.entities.devices?.[0]) {
                await pauseDevice(command.entities.devices[0]);
              } else if (command.entities.folders?.[0]) {
                await pauseFolder(command.entities.folders[0]);
              }
              break;

            case 'resume':
              if (command.entities.devices?.[0]) {
                await resumeDevice(command.entities.devices[0]);
              } else if (command.entities.folders?.[0]) {
                await resumeFolder(command.entities.folders[0]);
              }
              break;

            case 'restart':
              await restartSyncthing();
              break;

            case 'navigate':
              // Navigate to settings tab
              if (command.intent === 'navigate-settings') {
                setActiveTab('settings');
              }
              break;

            default:
              logger.debug('Unhandled action', {
                component: 'OmniboxDashboard',
                action: command.action,
              });
          }
        } catch (error) {
          logger.error('Command action failed', {
            component: 'OmniboxDashboard',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          actions.setError(
            `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Update focused entities for context
      if (command.entities.devices?.[0]) {
        actions.setFocusedDevice(command.entities.devices[0]);
      }
      if (command.entities.folders?.[0]) {
        actions.setFocusedFolder(command.entities.folders[0]);
      }
    },
    [actions, setActiveTab]
  );

  return (
    <div className="bg-cosmic relative h-full w-full overflow-hidden">
      {/* Film grain overlay for premium texture */}
      <div className="bg-noise" />

      {/* Top-right HUD — Status controls and stats in a vertical column */}
      <motion.div
        className="absolute top-6 right-6 z-50 flex flex-col items-end gap-3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Status Controls — Connection, Refresh, Settings, Notifications */}
        <StatusHud
          isOnline={isOnline}
          isRefetching={isRefetching}
          pendingCount={hudMetrics.pendingArtifacts}
          onRefresh={() => refetch()}
          onOpenSettings={() => enterRoom('settings')}
          onOpenPending={() => setShowPendingDialog(true)}
        />

        {/* Stats Stack — Only visible when connected, below controls */}
        <StatsStack
          isOnline={isOnline}
          syncRate={hudMetrics.syncRate}
          connectedNodes={hudMetrics.connectedNodes}
          folderCount={hudMetrics.folders}
          pendingCount={hudMetrics.pendingArtifacts}
        />
      </motion.div>

      {/* Cosmic Search Trigger — Click to open Omnibox menu */}
      <motion.div
        className="absolute top-8 left-1/2 z-40 -translate-x-1/2"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <CosmicSearchBar onSearch={handleCosmicSearch} className="w-[640px]" triggerMode />
      </motion.div>

      {/* Omnibox navigation menu (opens on click or Ctrl+K) */}
      <div className="absolute top-6 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4">
        <Omnibox onCommand={handleCommand} />
      </div>

      {/* The Artifact Chamber — Pure artifact mode */}
      <motion.div
        className="h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <ArtifactRouter />
      </motion.div>

      {/* Current artifact indicator */}
      {currentArtifact && (
        <motion.div
          className="absolute top-24 left-1/2 z-30 -translate-x-1/2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xl',
              isDark ? 'bg-black/60' : 'bg-white/70'
            )}
          >
            <Sparkles className={cn('h-4 w-4', isDark ? 'text-cyan-400' : 'text-blue-600')} />
            <span
              className={cn(
                'font-mono text-xs tracking-widest uppercase',
                isDark ? 'text-cyan-300' : 'text-blue-700'
              )}
            >
              {currentArtifact.artifactType.replace('-', ' ')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Keyboard shortcut hint */}
      <motion.div
        className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
      >
        <div
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs backdrop-blur-sm',
            isDark ? 'bg-black/40 text-gray-500' : 'bg-white/60 text-gray-500'
          )}
        >
          Press{' '}
          <kbd
            className={cn(
              'mx-1 rounded px-1.5 py-0.5',
              isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'
            )}
          >
            Ctrl+K
          </kbd>{' '}
          for commands
        </div>
      </motion.div>

      {/* Onboarding Tutorial */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingTutorial onComplete={completeOnboarding} onSkip={skipOnboarding} />
        )}
      </AnimatePresence>

      {/* Welcome badge after onboarding */}
      <AnimatePresence>
        {hasChecked && !showOnboarding && <WelcomeBadge onReplayTutorial={resetOnboarding} />}
      </AnimatePresence>

      {/* Layer 3 Glass Overlays — Per UX guide: Click artifact → glass UI takes over */}
      {/* Device Details Room */}
      <GlassOverlay
        isOpen={currentRoom?.roomType === 'device-details'}
        onClose={exitRoom}
        title="Device Details"
        subtitle={currentRoom?.entityLabel}
        size="medium"
      >
        {currentRoom?.entityId && (
          <DeviceDetailsPanel deviceId={currentRoom.entityId} onClose={exitRoom} />
        )}
      </GlassOverlay>

      {/* Folder Explorer Room */}
      <GlassOverlay
        isOpen={currentRoom?.roomType === 'folder-explorer'}
        onClose={exitRoom}
        title={currentRoom?.entityLabel || 'Folder Details'}
        subtitle={currentRoom?.entityId}
        size="large"
      >
        {currentRoom?.entityId && (
          <FolderDetailsPanel folderId={currentRoom.entityId} onClose={exitRoom} />
        )}
      </GlassOverlay>

      {/* Pending Request Room */}
      <GlassOverlay
        isOpen={currentRoom?.roomType === 'pending-request'}
        onClose={exitRoom}
        title="Pending Request"
        subtitle={currentRoom?.entityLabel}
        size="small"
      >
        {currentRoom?.entityId && (
          <PendingRequestPanel
            requestId={currentRoom.entityId}
            requestType={(currentRoom.data?.requestType as 'device' | 'folder') || 'device'}
            requestName={currentRoom.entityLabel}
            onClose={exitRoom}
          />
        )}
      </GlassOverlay>

      {/* Settings Room — Full settings as glass overlay */}
      <GlassOverlay
        isOpen={currentRoom?.roomType === 'settings'}
        onClose={exitRoom}
        title="Settings"
        subtitle="Configure Eigen"
        size="large"
      >
        <SettingsPanel onClose={exitRoom} />
      </GlassOverlay>

      {/* Pending Requests Dialog (legacy fallback for notification bell) */}
      <PendingRequestsDialog open={showPendingDialog} onClose={() => setShowPendingDialog(false)} />
    </div>
  );
}

export default OmniboxDashboard;
