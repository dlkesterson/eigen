/**
 * Omnibox Dashboard View
 *
 * The main Omnibox-driven interface combining the command input
 * with dynamic 3D visualizations.
 */

'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Omnibox,
  VisualizationRouter,
  OnboardingTutorial,
  useOnboarding,
  WelcomeBadge,
} from '@/components/omnibox';
import { useOmnibox } from '@/store/omnibox';
import { useAppStore } from '@/store';
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

export function OmniboxDashboard() {
  const { actions, visualizationType: _visualizationType, breadcrumbs } = useOmnibox();
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const { showOnboarding, hasChecked, completeOnboarding, skipOnboarding, resetOnboarding } =
    useOnboarding();

  // Handle command execution
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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#050810]">
      {/* Omnibox at top */}
      <motion.div
        className="relative z-20 flex-shrink-0 px-4 pt-4 pb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Omnibox onCommand={handleCommand} />
      </motion.div>

      {/* Context breadcrumbs (if any) */}
      {breadcrumbs.length > 0 && (
        <motion.div
          className="relative z-10 px-6 pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Context:</span>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-700">/</span>}
                <span className="text-cyan-400">{crumb.label}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Visualization area */}
      <motion.div
        className="relative z-0 min-h-0 flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <VisualizationRouter />
      </motion.div>

      {/* Visualization type indicator */}
      <motion.div
        className="absolute bottom-4 left-4 z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="rounded-lg border border-white/5 bg-black/60 px-3 py-1.5 text-xs text-gray-400 backdrop-blur-sm">
          Press <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-white">Ctrl+K</kbd> to
          open Omnibox
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
    </div>
  );
}

export default OmniboxDashboard;
