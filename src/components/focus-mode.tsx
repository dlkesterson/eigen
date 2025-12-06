/**
 * Focus Mode — The Nuclear Option (Ctrl/Cmd + K)
 *
 * A full-screen traditional 2D UI overlay for power users.
 * Per the UX guide: "Power users get productivity. Everyone else gets transcendence."
 *
 * Implements Layer 3: Dense text, forms, lists, settings in a dedicated 2D "chamber"
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Sparkles, Laptop, Folder, Settings, ScrollText } from 'lucide-react';
import { useAppStore } from '@/store';
import { FolderList } from './folder-list';
import { DeviceList } from './device-list';
import { SettingsPage } from './settings-page';
import { LogsPage } from './logs-page';
import { cn } from '@/lib/utils';

// Tab configuration for focus mode - all the 2D views consolidated here
const FOCUS_TABS = [
  {
    id: 'devices',
    label: 'Devices',
    icon: Laptop,
    description: 'Manage your Syncthing devices and their connections',
  },
  {
    id: 'folders',
    label: 'Folders',
    icon: Folder,
    description: 'View and manage your synchronized folders',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Configure application preferences and Syncthing options',
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: ScrollText,
    description: 'View system logs and sync activity',
  },
] as const;

type FocusTab = (typeof FOCUS_TABS)[number]['id'];

interface FocusModeProps {
  className?: string;
  /** Initial tab to open */
  initialTab?: FocusTab;
}

export function FocusMode({ className, initialTab }: FocusModeProps) {
  const { focusMode, toggleFocusMode, setFocusMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<FocusTab>(initialTab || 'devices');

  // Global hotkey: Ctrl/Cmd + K toggles focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleFocusMode();
      }
      // ESC exits focus mode
      if (e.key === 'Escape' && focusMode) {
        e.preventDefault();
        setFocusMode(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusMode, toggleFocusMode, setFocusMode]);

  // Listen for focus mode tab navigation events
  useEffect(() => {
    const handler = (e: CustomEvent<{ tab: FocusTab }>) => {
      setActiveTab(e.detail.tab);
      if (!focusMode) {
        setFocusMode(true);
      }
    };
    window.addEventListener('focus-mode-navigate', handler as EventListener);
    return () => window.removeEventListener('focus-mode-navigate', handler as EventListener);
  }, [focusMode, setFocusMode]);

  const handleClose = useCallback(() => {
    setFocusMode(false);
  }, [setFocusMode]);

  const currentTab = FOCUS_TABS.find((t) => t.id === activeTab) || FOCUS_TABS[0];

  return (
    <AnimatePresence>
      {focusMode && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[9999] flex items-center justify-center',
            'bg-black/95 backdrop-blur-2xl',
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Subtle cosmic background hint */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-950/10 via-transparent to-purple-950/10" />

          {/* Main glass container */}
          <motion.div
            className="glass-card relative flex h-[90vh] w-[95vw] max-w-[1600px] flex-col overflow-hidden"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-8 py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-mono text-sm tracking-widest uppercase">Focus Mode</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-gray-500">
                  <Keyboard className="h-3 w-3" />
                  <span>Esc to exit</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 border-b border-white/10 px-8 py-2">
              {FOCUS_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-sm transition-all',
                      activeTab === tab.id
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {activeTab === 'devices' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold text-white">Connected Devices</h2>
                        <p className="mt-1 text-sm text-gray-400">{currentTab.description}</p>
                      </div>
                      <DeviceList />
                    </div>
                  )}

                  {activeTab === 'folders' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold text-white">Synced Folders</h2>
                        <p className="mt-1 text-sm text-gray-400">{currentTab.description}</p>
                      </div>
                      <FolderList />
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="space-y-6">
                      <SettingsPage />
                    </div>
                  )}

                  {activeTab === 'logs' && (
                    <div className="space-y-6">
                      <LogsPage />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-center border-t border-white/10 py-3 text-xs text-gray-500">
              <span>Press</span>
              <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono">Ctrl</kbd>
              <span>+</span>
              <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 font-mono">K</kbd>
              <span>to return to the cosmos</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FocusMode;
