/**
 * Omnibox Store
 *
 * Zustand store for managing Omnibox state including:
 * - Current input and suggestions
 * - Command history
 * - Context (focused device/folder)
 * - Visualization state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type {
  VisualizationType,
  OmniboxContext,
  CommandHistoryEntry,
  CommandSuggestion,
  VisualizationState,
} from '@/types/omnibox';
import { OMNIBOX_CONFIG } from '@/constants/omnibox';

// =============================================================================
// Omnibox UI State
// =============================================================================

interface OmniboxUIState {
  /** Whether the omnibox is open/focused */
  isOpen: boolean;
  /** Current input value */
  input: string;
  /** Current suggestions */
  suggestions: CommandSuggestion[];
  /** Selected suggestion index */
  selectedIndex: number;
  /** Is currently parsing/processing */
  isProcessing: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether help overlay is shown */
  showHelp: boolean;

  // Actions
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setInput: (input: string) => void;
  setSuggestions: (suggestions: CommandSuggestion[]) => void;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  setShowHelp: (show: boolean) => void;
  reset: () => void;
}

export const useOmniboxUIStore = create<OmniboxUIState>()((set, _get) => ({
  isOpen: false,
  input: '',
  suggestions: [],
  selectedIndex: 0,
  isProcessing: false,
  error: null,
  showHelp: false,

  setOpen: (open) => set({ isOpen: open }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setInput: (input) => set({ input, selectedIndex: 0 }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  selectNext: () =>
    set((state) => ({
      selectedIndex: Math.min(state.selectedIndex + 1, state.suggestions.length - 1),
    })),
  selectPrevious: () =>
    set((state) => ({
      selectedIndex: Math.max(state.selectedIndex - 1, 0),
    })),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setError: (error) => set({ error }),
  setShowHelp: (show) => set({ showHelp: show }),
  reset: () =>
    set({
      input: '',
      suggestions: [],
      selectedIndex: 0,
      isProcessing: false,
      error: null,
    }),
}));

// =============================================================================
// Omnibox Context State (Persisted)
// =============================================================================

interface OmniboxContextState extends OmniboxContext {
  // Actions
  setFocusedDevice: (deviceId: string | undefined) => void;
  setFocusedFolder: (folderId: string | undefined) => void;
  setFocusedFile: (filePath: string | undefined) => void;
  pushBreadcrumb: (breadcrumb: OmniboxContext['breadcrumbs'][0]) => void;
  popBreadcrumb: () => void;
  clearBreadcrumbs: () => void;
  addRecentCommand: (command: string) => void;
  clearContext: () => void;
}

export const useOmniboxContextStore = create<OmniboxContextState>()(
  persist(
    (set, _get) => ({
      focusedDevice: undefined,
      focusedFolder: undefined,
      focusedFile: undefined,
      breadcrumbs: [],
      recentCommands: [],

      setFocusedDevice: (deviceId) =>
        set((state) => ({
          focusedDevice: deviceId,
          breadcrumbs: deviceId
            ? [
                ...state.breadcrumbs.filter((b) => b.type !== 'device'),
                { type: 'device' as const, id: deviceId, label: deviceId },
              ]
            : state.breadcrumbs.filter((b) => b.type !== 'device'),
        })),

      setFocusedFolder: (folderId) =>
        set((state) => ({
          focusedFolder: folderId,
          breadcrumbs: folderId
            ? [
                ...state.breadcrumbs.filter((b) => b.type !== 'folder'),
                { type: 'folder' as const, id: folderId, label: folderId },
              ]
            : state.breadcrumbs.filter((b) => b.type !== 'folder'),
        })),

      setFocusedFile: (filePath) =>
        set((state) => ({
          focusedFile: filePath,
          breadcrumbs: filePath
            ? [
                ...state.breadcrumbs.filter((b) => b.type !== 'file'),
                {
                  type: 'file' as const,
                  id: filePath,
                  label: filePath.split('/').pop() || filePath,
                },
              ]
            : state.breadcrumbs.filter((b) => b.type !== 'file'),
        })),

      pushBreadcrumb: (breadcrumb) =>
        set((state) => ({
          breadcrumbs: [...state.breadcrumbs, breadcrumb].slice(-5), // Keep last 5
        })),

      popBreadcrumb: () =>
        set((state) => ({
          breadcrumbs: state.breadcrumbs.slice(0, -1),
        })),

      clearBreadcrumbs: () => set({ breadcrumbs: [] }),

      addRecentCommand: (command) =>
        set((state) => ({
          recentCommands: [command, ...state.recentCommands.filter((c) => c !== command)].slice(
            0,
            20
          ), // Keep last 20
        })),

      clearContext: () =>
        set({
          focusedDevice: undefined,
          focusedFolder: undefined,
          focusedFile: undefined,
          breadcrumbs: [],
        }),
    }),
    {
      name: 'eigen-omnibox-context',
      partialize: (state) => ({
        recentCommands: state.recentCommands,
      }),
    }
  )
);

// =============================================================================
// Command History State (Persisted)
// =============================================================================

interface CommandHistoryState {
  history: CommandHistoryEntry[];
  favorites: string[];

  // Actions
  addEntry: (entry: CommandHistoryEntry) => void;
  clearHistory: () => void;
  addFavorite: (command: string) => void;
  removeFavorite: (command: string) => void;
  getRecentCommands: (limit?: number) => string[];
}

export const useCommandHistoryStore = create<CommandHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      favorites: [],

      addEntry: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, OMNIBOX_CONFIG.maxHistoryEntries),
        })),

      clearHistory: () => set({ history: [] }),

      addFavorite: (command) =>
        set((state) => ({
          favorites: state.favorites.includes(command)
            ? state.favorites
            : [...state.favorites, command],
        })),

      removeFavorite: (command) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f !== command),
        })),

      getRecentCommands: (limit = 10) => {
        const state = get();
        return state.history.slice(0, limit).map((h) => h.command);
      },
    }),
    {
      name: 'eigen-command-history',
    }
  )
);

// =============================================================================
// Visualization State
// =============================================================================

interface VisualizationStateStore extends VisualizationState {
  // Artifact mode toggle
  useArtifacts: boolean;

  // Actions
  setVisualization: (type: VisualizationType) => void;
  setSelectedObjects: (ids: string[]) => void;
  addSelectedObject: (id: string) => void;
  removeSelectedObject: (id: string) => void;
  clearSelection: () => void;
  setCamera: (camera: VisualizationState['camera']) => void;
  setFilters: (filters: VisualizationState['filters']) => void;
  resetVisualization: () => void;
  toggleArtifactMode: () => void;
  setArtifactMode: (enabled: boolean) => void;
}

export const useVisualizationStore = create<VisualizationStateStore>()((set) => ({
  type: OMNIBOX_CONFIG.defaultVisualization,
  selectedObjects: [],
  filters: {},
  useArtifacts: true, // Default to new artifact system

  setVisualization: (type) =>
    set({
      type,
      selectedObjects: [],
      filters: {},
    }),

  setSelectedObjects: (ids) => set({ selectedObjects: ids }),

  addSelectedObject: (id) =>
    set((state) => ({
      selectedObjects: state.selectedObjects.includes(id)
        ? state.selectedObjects
        : [...state.selectedObjects, id],
    })),

  removeSelectedObject: (id) =>
    set((state) => ({
      selectedObjects: state.selectedObjects.filter((obj) => obj !== id),
    })),

  clearSelection: () => set({ selectedObjects: [] }),

  setCamera: (camera) => set({ camera }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetVisualization: () =>
    set({
      type: OMNIBOX_CONFIG.defaultVisualization,
      camera: undefined,
      selectedObjects: [],
      filters: {},
      layout: undefined,
    }),

  toggleArtifactMode: () =>
    set((state) => ({
      useArtifacts: !state.useArtifacts,
    })),

  setArtifactMode: (enabled) => set({ useArtifacts: enabled }),
}));

// =============================================================================
// Combined Omnibox Hook
// =============================================================================

/**
 * Combined hook for accessing all Omnibox-related state
 */
export function useOmnibox() {
  const ui = useOmniboxUIStore();
  const context = useOmniboxContextStore();
  const history = useCommandHistoryStore();
  const visualization = useVisualizationStore();

  // Memoize actions to prevent infinite re-renders
  const actions = useMemo(
    () => ({
      // UI
      open: () => ui.setOpen(true),
      close: () => ui.setOpen(false),
      toggle: ui.toggle,
      setInput: ui.setInput,
      setSuggestions: ui.setSuggestions,
      selectNext: ui.selectNext,
      selectPrevious: ui.selectPrevious,
      setProcessing: ui.setProcessing,
      setError: ui.setError,
      setShowHelp: ui.setShowHelp,
      resetUI: ui.reset,

      // Context
      setFocusedDevice: context.setFocusedDevice,
      setFocusedFolder: context.setFocusedFolder,
      setFocusedFile: context.setFocusedFile,
      pushBreadcrumb: context.pushBreadcrumb,
      popBreadcrumb: context.popBreadcrumb,
      clearContext: context.clearContext,
      addRecentCommand: context.addRecentCommand,

      // History
      addHistoryEntry: history.addEntry,
      clearHistory: history.clearHistory,
      addFavorite: history.addFavorite,
      removeFavorite: history.removeFavorite,

      // Visualization
      setVisualization: visualization.setVisualization,
      setSelectedObjects: visualization.setSelectedObjects,
      addSelectedObject: visualization.addSelectedObject,
      removeSelectedObject: visualization.removeSelectedObject,
      clearSelection: visualization.clearSelection,
      setFilters: visualization.setFilters,
      resetVisualization: visualization.resetVisualization,
    }),
    [ui, context, history, visualization]
  );

  return {
    // UI State
    isOpen: ui.isOpen,
    input: ui.input,
    suggestions: ui.suggestions,
    selectedIndex: ui.selectedIndex,
    isProcessing: ui.isProcessing,
    error: ui.error,
    showHelp: ui.showHelp,

    // Context
    focusedDevice: context.focusedDevice,
    focusedFolder: context.focusedFolder,
    focusedFile: context.focusedFile,
    breadcrumbs: context.breadcrumbs,
    recentCommands: context.recentCommands,

    // Visualization
    visualizationType: visualization.type,
    selectedObjects: visualization.selectedObjects,
    filters: visualization.filters,

    // Actions (memoized)
    actions,
  };
}
