/**
 * Help Panel - Glass Panel Version
 *
 * Replaces the 3D help visualization with a clean glass panel
 * showing commands, shortcuts, and documentation.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Command, BookOpen, Keyboard, Zap, X } from 'lucide-react';
import { COMMANDS } from '@/constants/omnibox';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';
import type { CommandCategory } from '@/types/omnibox';

interface HelpPanelProps {
  onClose: () => void;
}

export function HelpPanel({ onClose }: HelpPanelProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'commands' | 'shortcuts' | 'about'>('commands');

  const filteredCommands = COMMANDS.filter(
    (cmd) =>
      cmd.aliases.some((alias) => alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryColors: Record<CommandCategory, string> = {
    status: isDark ? 'text-cyan-400' : 'text-cyan-600',
    action: isDark ? 'text-purple-400' : 'text-purple-600',
    analytics: isDark ? 'text-amber-400' : 'text-amber-600',
    configuration: isDark ? 'text-emerald-400' : 'text-emerald-600',
    navigation: isDark ? 'text-blue-400' : 'text-blue-600',
  };

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Open command palette' },
    { keys: ['Esc'], description: 'Close panel or clear selection' },
    { keys: ['↑', '↓'], description: 'Navigate suggestions' },
    { keys: ['Enter'], description: 'Execute command' },
    { keys: ['Ctrl', 'R'], description: 'Refresh status' },
    { keys: ['Ctrl', ','], description: 'Open settings' },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        className={cn(
          'relative z-10 max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl',
          isDark ? 'border-white/10 bg-black/80' : 'border-gray-200/50 bg-white/90'
        )}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between border-b px-6 py-4',
            isDark ? 'border-white/10' : 'border-gray-200/50'
          )}
        >
          <div className="flex items-center gap-3">
            <BookOpen className={cn('h-5 w-5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
            <h2 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              Help Center
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'rounded-full p-2 transition-colors',
              isDark
                ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className={cn(
            'flex gap-1 border-b px-6 pt-4',
            isDark ? 'border-white/10' : 'border-gray-200/50'
          )}
        >
          {[
            { id: 'commands', label: 'Commands', icon: Command },
            { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
            { id: 'about', label: 'About', icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? isDark
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-cyan-600 text-cyan-600'
                  : isDark
                    ? 'border-transparent text-gray-400 hover:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {activeTab === 'commands' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search
                  className={cn(
                    'absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2',
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  )}
                />
                <input
                  type="text"
                  placeholder="Search commands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border py-2 pr-4 pl-10 text-sm transition-colors',
                    isDark
                      ? 'border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-cyan-400/50 focus:bg-white/10'
                      : 'border-gray-200 bg-white text-slate-900 placeholder:text-gray-400 focus:border-cyan-500/50 focus:bg-gray-50'
                  )}
                />
              </div>

              {/* Command List */}
              <div className="space-y-3">
                {filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className={cn(
                      'rounded-lg border p-4',
                      isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <code className={cn('font-mono text-sm', categoryColors[cmd.category])}>
                            {cmd.aliases[0]}
                          </code>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs',
                              isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {cmd.category}
                          </span>
                        </div>
                        <p className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                          {cmd.description}
                        </p>
                        {cmd.examples && cmd.examples.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {cmd.examples.map((example, i) => (
                              <code
                                key={i}
                                className={cn(
                                  'rounded px-2 py-1 text-xs',
                                  isDark ? 'bg-black/50 text-gray-400' : 'bg-gray-50 text-gray-600'
                                )}
                              >
                                {example}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              {shortcuts.map((shortcut, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-4',
                    isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'
                  )}
                >
                  <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                    {shortcut.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd
                        key={j}
                        className={cn(
                          'rounded border px-2 py-1 font-mono text-xs',
                          isDark
                            ? 'border-white/20 bg-white/10 text-white'
                            : 'border-gray-300 bg-gray-50 text-gray-900'
                        )}
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
              <div
                className={cn(
                  'rounded-lg border p-6',
                  isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'
                )}
              >
                <h3
                  className={cn(
                    'mb-2 text-lg font-semibold',
                    isDark ? 'text-white' : 'text-slate-900'
                  )}
                >
                  Eigen
                </h3>
                <p className={cn('mb-4 text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  A beautiful Syncthing manager with spatial 3D visualization and AI-powered search.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Version:</span>
                    <span className={isDark ? 'text-white' : 'text-slate-900'}>0.1.17</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Framework:</span>
                    <span className={isDark ? 'text-white' : 'text-slate-900'}>
                      Tauri v2 + Next.js 16
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
