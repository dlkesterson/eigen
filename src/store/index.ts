'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type TabId, DEFAULT_TAB, type Theme, type AIStatus, DEFAULTS } from '@/constants';

export type { AIStatus } from '@/constants';

interface AppState {
  sidebarOpen: boolean;
  activeTab: TabId;
  theme: Theme;
  focusMode: boolean;
  debugPanelOpen: boolean;
  pollingInterval: number;
  nativeNotificationsEnabled: boolean;
  aiEnabled: boolean;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: TabId) => void;
  setTheme: (theme: Theme) => void;
  setPollingInterval: (interval: number) => void;
  setNativeNotificationsEnabled: (enabled: boolean) => void;
  setAiEnabled: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
  toggleDebugPanel: () => void;
  setDebugPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: DEFAULTS.SIDEBAR_OPEN,
      activeTab: DEFAULT_TAB,
      theme: DEFAULTS.THEME,
      pollingInterval: DEFAULTS.POLLING_INTERVAL,
      nativeNotificationsEnabled: DEFAULTS.NATIVE_NOTIFICATIONS_ENABLED,
      aiEnabled: DEFAULTS.AI_ENABLED,
      focusMode: DEFAULTS.FOCUS_MODE,
      debugPanelOpen: false,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTheme: (theme) => set({ theme }),
      setPollingInterval: (interval) => set({ pollingInterval: interval }),
      setNativeNotificationsEnabled: (enabled) => set({ nativeNotificationsEnabled: enabled }),
      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      setFocusMode: (enabled) => set({ focusMode: enabled }),
      toggleDebugPanel: () => set((state) => ({ debugPanelOpen: !state.debugPanelOpen })),
      setDebugPanelOpen: (open) => set({ debugPanelOpen: open }),
    }),
    {
      name: 'eigen-app-store',
    }
  )
);

interface AIState {
  aiStatus: AIStatus;
  aiStatusMessage: string;
  aiProgress: { current: number; total: number } | null;

  setAIStatus: (status: AIStatus) => void;
  setAIStatusMessage: (message: string) => void;
  setAIProgress: (progress: { current: number; total: number } | null) => void;
}

export const useAIStore = create<AIState>()((set) => ({
  aiStatus: 'idle',
  aiStatusMessage: '',
  aiProgress: null,

  setAIStatus: (status) => set({ aiStatus: status }),
  setAIStatusMessage: (message) => set({ aiStatusMessage: message }),
  setAIProgress: (progress) => set({ aiProgress: progress }),
}));

interface SyncState {
  isConnected: boolean;
  isSyncthingRunning: boolean;
  lastError: string | null;

  setConnected: (connected: boolean) => void;
  setSyncthingRunning: (running: boolean) => void;
  setLastError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  isConnected: false,
  isSyncthingRunning: false,
  lastError: null,

  setConnected: (connected) => set({ isConnected: connected }),
  setSyncthingRunning: (running) => set({ isSyncthingRunning: running }),
  setLastError: (error) => set({ lastError: error }),
}));
