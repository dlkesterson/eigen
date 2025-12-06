/**
 * Navigation Dock
 *
 * Vertical icon dock in the top-left for quick navigation between main views
 */

'use client';

import { motion } from 'framer-motion';
import { Activity, Server, FolderOpen, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';
import { useVisualizationStore } from '@/store/omnibox';
import type { ArtifactType } from '@/components/omnibox/visualizations/registry';

const NAV_ITEMS: Array<{
  id: ArtifactType;
  label: string;
  icon: typeof Activity;
}> = [
  { id: 'health-dashboard', label: 'Status', icon: Activity },
  { id: 'device-topology', label: 'Devices', icon: Server },
  { id: 'folder-explorer', label: 'Folders', icon: FolderOpen },
  { id: 'storage-globe', label: 'Storage', icon: HardDrive },
];

export function NavigationDock() {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';
  const { currentArtifact, enterArtifact } = useVisualizationStore();

  const currentArtifactType = currentArtifact?.artifactType;

  return (
    <motion.div
      className="absolute top-6 left-6 z-50 flex flex-col gap-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {NAV_ITEMS.map((item, index) => {
        const isActive = currentArtifactType === item.id;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.id}
            onClick={() => enterArtifact(item.id)}
            className={cn(
              'group relative flex items-center justify-center rounded-xl p-3 backdrop-blur-xl transition-all',
              isActive
                ? isDark
                  ? 'border border-cyan-400/60 bg-cyan-900/40 text-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'border border-cyan-500/70 bg-cyan-100/80 text-cyan-600 shadow-lg shadow-cyan-500/20'
                : isDark
                  ? 'border border-white/10 bg-white/5 text-gray-400 hover:border-cyan-400/30 hover:bg-cyan-900/20 hover:text-cyan-400'
                  : 'border border-gray-300/50 bg-white/60 text-gray-500 hover:border-cyan-500/50 hover:bg-cyan-100/60 hover:text-cyan-600'
            )}
            title={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
          >
            <Icon className="h-5 w-5" />

            {/* Tooltip */}
            <div
              className={cn(
                'pointer-events-none absolute left-full ml-3 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100',
                isDark
                  ? 'border border-white/10 bg-black/90 text-white'
                  : 'border border-gray-200 bg-white text-slate-900 shadow-lg'
              )}
            >
              {item.label}
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
