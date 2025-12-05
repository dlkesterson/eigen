/**
 * Omnibox Component
 *
 * The central command interface for Eigen. Provides:
 * - Natural language command input
 * - Real-time suggestions
 * - Command history navigation
 * - Context-aware autocomplete
 */

'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  Search,
  Sparkles,
  Loader2,
  ChevronRight,
  History,
  Keyboard,
  X,
  Activity,
  Network,
  FolderTree,
  GitMerge,
  HardDrive,
  Clock,
  Zap,
  Settings,
  Compass,
  HelpCircle,
  Monitor,
  Folder,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOmnibox } from '@/store/omnibox';
import { parseCommand, generateSuggestions } from '@/lib/command-parser';
import { useConfig } from '@/hooks/syncthing';
import { useAIStore } from '@/store';
import type { CommandSuggestion, ParsedCommand } from '@/types/omnibox';
import { QUICK_COMMANDS } from '@/constants/omnibox';

// =============================================================================
// Icon Mapping
// =============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Network,
  FolderTree,
  GitMerge,
  HardDrive,
  Clock,
  Zap,
  Settings,
  Compass,
  HelpCircle,
  Monitor,
  Folder,
  BarChart3,
  History,
  Command,
  ArrowLeftRight: Activity, // Fallback
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || Command;
}

// =============================================================================
// Suggestion Item Component
// =============================================================================

interface SuggestionItemProps {
  suggestion: CommandSuggestion;
  isSelected: boolean;
  isActive: boolean;
  onClick: () => void;
}

function SuggestionItem({ suggestion, isSelected, isActive, onClick }: SuggestionItemProps) {
  const Icon = getIcon(suggestion.icon);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        isSelected
          ? 'bg-primary/10 text-primary'
          : isActive
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          isSelected ? 'bg-primary/20' : isActive ? 'bg-cyan-500/20' : 'bg-muted'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 truncate font-medium">
          {suggestion.text}
          {isActive && (
            <span className="inline-flex items-center rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-400">
              Active
            </span>
          )}
        </div>
        <div className="text-muted-foreground truncate text-xs">{suggestion.description}</div>
      </div>
      {suggestion.source === 'history' && <History className="text-muted-foreground h-3 w-3" />}
      {suggestion.source === 'ai' && <Sparkles className="h-3 w-3 text-amber-500" />}
      {isSelected && (
        <kbd className="bg-muted text-muted-foreground hidden items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex">
          Enter
        </kbd>
      )}
    </motion.button>
  );
}

// =============================================================================
// Context Breadcrumbs
// =============================================================================

function ContextBreadcrumbs() {
  const { breadcrumbs, actions } = useOmnibox();

  if (breadcrumbs.length === 0) return null;

  return (
    <div className="text-muted-foreground border-border/50 flex items-center gap-1 border-b px-4 py-1.5 text-xs">
      <span className="opacity-60">Context:</span>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.id} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
          <button
            type="button"
            onClick={() => {
              if (crumb.type === 'device') actions.setFocusedDevice(crumb.id);
              if (crumb.type === 'folder') actions.setFocusedFolder(crumb.id);
            }}
            className="hover:text-foreground transition-colors"
          >
            {crumb.label}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={actions.clearContext}
        className="hover:text-foreground ml-auto transition-colors"
        title="Clear context"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// =============================================================================
// Quick Commands Bar
// =============================================================================

interface QuickCommandsBarProps {
  onCommand: (command: string) => void;
}

function QuickCommandsBar({ onCommand }: QuickCommandsBarProps) {
  return (
    <div className="border-border/50 flex items-center gap-2 border-t px-4 py-2">
      <span className="text-muted-foreground text-xs">Quick:</span>
      {QUICK_COMMANDS.map((qc) => (
        <button
          key={qc.command}
          type="button"
          onClick={() => onCommand(qc.command)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
          title={qc.shortcut}
        >
          {qc.label}
          <kbd className="hidden text-[10px] opacity-60 sm:inline">{qc.shortcut}</kbd>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Help Overlay
// =============================================================================

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="bg-background/95 absolute inset-0 z-10 overflow-auto rounded-2xl p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Omnibox Commands</h3>
        <button
          type="button"
          onClick={onClose}
          className="hover:bg-muted rounded-md p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <section>
          <h4 className="text-muted-foreground mb-2 text-sm font-medium">Status Queries</h4>
          <div className="grid gap-2 text-sm">
            <div>
              <code className="text-primary">status</code> - System health dashboard
            </div>
            <div>
              <code className="text-primary">devices</code> - Device constellation view
            </div>
            <div>
              <code className="text-primary">folders</code> - Folder explorer
            </div>
            <div>
              <code className="text-primary">conflicts</code> - File conflicts
            </div>
            <div>
              <code className="text-primary">storage</code> - Storage distribution
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-muted-foreground mb-2 text-sm font-medium">Actions</h4>
          <div className="grid gap-2 text-sm">
            <div>
              <code className="text-primary">sync [folder]</code> - Force sync
            </div>
            <div>
              <code className="text-primary">pause [device|folder]</code> - Pause syncing
            </div>
            <div>
              <code className="text-primary">resume [device|folder]</code> - Resume syncing
            </div>
            <div>
              <code className="text-primary">resolve [file]</code> - Resolve conflict
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-muted-foreground mb-2 text-sm font-medium">Keyboard Shortcuts</h4>
          <div className="grid gap-2 text-sm">
            <div>
              <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">Ctrl+K</kbd> - Toggle Omnibox
            </div>
            <div>
              <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">↑↓</kbd> - Navigate
              suggestions
            </div>
            <div>
              <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">Enter</kbd> - Execute command
            </div>
            <div>
              <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">Esc</kbd> - Close Omnibox
            </div>
            <div>
              <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs">?</kbd> - Show help
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Omnibox Component
// =============================================================================

export interface OmniboxProps {
  onCommand?: (command: ParsedCommand) => void;
  className?: string;
}

export function Omnibox({ onCommand, className }: OmniboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const {
    isOpen,
    input,
    suggestions,
    selectedIndex,
    isProcessing,
    error,
    showHelp,
    recentCommands,
    focusedDevice: _focusedDevice,
    focusedFolder: _focusedFolder,
    visualizationType,
    actions,
  } = useOmnibox();

  const { data: config } = useConfig();
  const aiStatus = useAIStore((s) => s.aiStatus);

  // Get devices and folders from config
  const devices = useMemo(() => {
    return (
      config?.devices?.map((d: { name?: string; deviceID: string }) => d.name || d.deviceID) || []
    );
  }, [config]);

  const folders = useMemo(() => {
    return config?.folders?.map((f: { label?: string; id: string }) => f.label || f.id) || [];
  }, [config]);

  // Get setSuggestions from actions once to avoid dependency issues
  const setSuggestions = actions.setSuggestions;

  // Update suggestions when input changes
  useEffect(() => {
    const newSuggestions = generateSuggestions(input, {
      devices,
      folders,
      history: recentCommands,
    });
    setSuggestions(newSuggestions);
  }, [input, devices, folders, recentCommands, setSuggestions]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+K or Cmd+K to toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        actions.toggle();
        return;
      }

      // Quick commands
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (QUICK_COMMANDS[index]) {
          handleCommandSubmit(QUICK_COMMANDS[index].command);
        }
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          if (showHelp) {
            actions.setShowHelp(false);
          } else {
            actions.close();
            actions.resetUI();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          actions.selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (input === '' || historyIndex >= 0) {
            // Navigate history
            const newIndex = Math.min(historyIndex + 1, recentCommands.length - 1);
            setHistoryIndex(newIndex);
            if (recentCommands[newIndex]) {
              actions.setInput(recentCommands[newIndex]);
            }
          } else {
            actions.selectPrevious();
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            handleCommandSubmit(suggestions[selectedIndex].text);
          } else if (input.trim()) {
            handleCommandSubmit(input);
          }
          break;
        case '?':
          if (!input) {
            e.preventDefault();
            actions.setShowHelp(!showHelp);
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, input, suggestions, selectedIndex, showHelp, historyIndex, recentCommands, actions]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle command submission
  const handleCommandSubmit = useCallback(
    (commandText: string) => {
      if (!commandText.trim()) return;

      actions.setProcessing(true);

      try {
        const parsed = parseCommand(commandText, {
          context: { devices, folders },
        });

        // Add to history
        actions.addRecentCommand(commandText);
        actions.addHistoryEntry({
          id: Date.now().toString(),
          command: commandText,
          parsedCommand: parsed,
          timestamp: Date.now(),
        });

        // Update context based on parsed entities
        if (parsed.entities.devices?.[0]) {
          actions.setFocusedDevice(parsed.entities.devices[0]);
        }
        if (parsed.entities.folders?.[0]) {
          actions.setFocusedFolder(parsed.entities.folders[0]);
        }

        // Update visualization
        actions.setVisualization(parsed.visualization);

        // Notify parent
        onCommand?.(parsed);

        // Reset UI and close omnibox
        actions.resetUI();
        actions.close();
        setHistoryIndex(-1);
      } catch (err) {
        actions.setError(err instanceof Error ? err.message : 'Failed to parse command');
      } finally {
        actions.setProcessing(false);
      }
    },
    [devices, folders, actions, onCommand]
  );

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        actions.close();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, actions]);

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button (when closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => actions.open()}
          className={cn(
            'mx-auto flex w-full max-w-2xl items-center gap-3',
            'border-border/50 bg-background/80 rounded-full border backdrop-blur-xl',
            'text-muted-foreground px-4 py-3 text-left',
            'hover:border-primary/50 hover:bg-background/90 transition-all',
            'shadow-lg shadow-black/5'
          )}
        >
          <Search className="h-4 w-4" />
          <span className="flex-1">Type a command or ask a question...</span>
          <kbd className="bg-muted hidden items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium sm:inline-flex">
            <Command className="h-3 w-3" /> K
          </kbd>
        </button>
      )}

      {/* Expanded Omnibox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={containerRef}
            className={cn(
              'absolute top-0 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2',
              'border-border/50 bg-background/95 rounded-2xl border backdrop-blur-xl',
              'shadow-2xl shadow-black/20'
            )}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Context Breadcrumbs */}
            <ContextBreadcrumbs />

            {/* Input Area */}
            <div className="relative flex items-center gap-3 px-4 py-3">
              {isProcessing ? (
                <Loader2 className="text-primary h-5 w-5 animate-spin" />
              ) : aiStatus === 'ready' ? (
                <Sparkles className="h-5 w-5 text-amber-500" />
              ) : (
                <Search className="text-muted-foreground h-5 w-5" />
              )}

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  actions.setInput(e.target.value);
                  setHistoryIndex(-1);
                }}
                placeholder="Type a command or ask a question..."
                className={cn(
                  'text-foreground placeholder:text-muted-foreground flex-1 bg-transparent',
                  'text-base outline-none'
                )}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => actions.setShowHelp(!showHelp)}
                  className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
                  title="Show help (?)"
                >
                  <Keyboard className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    actions.close();
                    actions.resetUI();
                  }}
                  className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-destructive bg-destructive/10 border-destructive/20 border-t px-4 py-2 text-sm">
                {error}
              </div>
            )}

            {/* Help Overlay */}
            <AnimatePresence>
              {showHelp && <HelpOverlay onClose={() => actions.setShowHelp(false)} />}
            </AnimatePresence>

            {/* Suggestions */}
            {!showHelp && suggestions.length > 0 && (
              <div className="border-border/50 border-t">
                <div className="max-h-80 overflow-auto p-2">
                  <AnimatePresence mode="popLayout">
                    {suggestions.map((suggestion, index) => (
                      <SuggestionItem
                        key={suggestion.id}
                        suggestion={suggestion}
                        isSelected={index === selectedIndex}
                        isActive={suggestion.visualization === visualizationType}
                        onClick={() => handleCommandSubmit(suggestion.text)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Quick Commands */}
            <QuickCommandsBar onCommand={handleCommandSubmit} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Omnibox;
