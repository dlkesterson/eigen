"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
    // UI State
    sidebarOpen: boolean;
    activeTab: "dashboard" | "folders" | "devices" | "settings" | "logs";
    theme: "light" | "dark" | "system";

    // Settings
    pollingInterval: number; // in milliseconds
    nativeNotificationsEnabled: boolean;
    aiEnabled: boolean; // Enable AI-powered semantic search

    // Actions
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    setActiveTab: (tab: AppState["activeTab"]) => void;
    setTheme: (theme: AppState["theme"]) => void;
    setPollingInterval: (interval: number) => void;
    setNativeNotificationsEnabled: (enabled: boolean) => void;
    setAiEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Initial State
            sidebarOpen: true,
            activeTab: "dashboard",
            theme: "dark",
            pollingInterval: 5000,
            nativeNotificationsEnabled: true,
            aiEnabled: false, // AI disabled by default

            // Actions
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setActiveTab: (tab) => set({ activeTab: tab }),
            setTheme: (theme) => set({ theme }),
            setPollingInterval: (interval) => set({ pollingInterval: interval }),
            setNativeNotificationsEnabled: (enabled) => set({ nativeNotificationsEnabled: enabled }),
            setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
        }),
        {
            name: "eigen-app-store",
        }
    )
);

interface SyncState {
    // Syncthing state
    isConnected: boolean;
    isSyncthingRunning: boolean;
    lastError: string | null;

    // Actions
    setConnected: (connected: boolean) => void;
    setSyncthingRunning: (running: boolean) => void;
    setLastError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
    // Initial State
    isConnected: false,
    isSyncthingRunning: false,
    lastError: null,

    // Actions
    setConnected: (connected) => set({ isConnected: connected }),
    setSyncthingRunning: (running) => set({ isSyncthingRunning: running }),
    setLastError: (error) => set({ lastError: error }),
}));
