/**
 * Eigen Settings Management
 *
 * React hooks and context providers for XDG-compliant config management.
 * Works with the Rust config module (src-tauri/src/config.rs).
 */

'use client';

import { invoke } from '@tauri-apps/api/core';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Settings {
  version: string;
  syncthing: SyncthingSettings;
  ui: UiSettings;
  ai: AiSettings;
  performance: PerformanceSettings;
}

export interface SyncthingSettings {
  base_url: string;
  api_key: string | null;
  auto_start: boolean;
  bundled_binary_path: string | null;
}

export interface UiSettings {
  theme: 'dark' | 'light' | 'system';
  enable_3d_constellation: boolean;
  enable_particle_effects: boolean;
  enable_notifications: boolean;
  compact_mode: boolean;
}

export interface AiSettings {
  semantic_search_enabled: boolean;
  embedding_model: string;
  index_on_startup: boolean;
}

export interface PerformanceSettings {
  refresh_interval_ms: number;
  max_cached_files: number;
  enable_file_indexing: boolean;
}

export interface Credentials {
  version: string;
  syncthing: SyncthingCredentials;
  s3: S3Credentials;
}

export interface SyncthingCredentials {
  api_key: string | null;
}

export interface S3Credentials {
  access_key_id: string | null;
  secret_access_key: string | null;
}

export interface State {
  version: string;
  ui: UiState;
  stats: StatsState;
}

export interface UiState {
  window_width: number | null;
  window_height: number | null;
  sidebar_collapsed: boolean;
  last_selected_view: string;
}

export interface StatsState {
  total_launches: number;
  last_launch_timestamp: string | null;
}

// ============================================================================
// Settings Context
// ============================================================================

interface SettingsContextValue {
  settings: Settings | null;
  credentials: Credentials | null;
  state: State | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updater: (prev: Settings) => Settings) => Promise<void>;
  updateCredentials: (updater: (prev: Credentials) => Credentials) => Promise<void>;
  updateState: (updater: (prev: State) => State) => Promise<void>;
  reloadSettings: () => Promise<void>;
  reloadCredentials: () => Promise<void>;
  reloadState: () => Promise<void>;
  getConfigDir: () => Promise<string>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ============================================================================
// Settings Provider
// ============================================================================

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);

        const [settingsData, credentialsData, stateData] = await Promise.all([
          invoke<Settings>('get_settings_cmd'),
          invoke<Credentials>('get_credentials_cmd'),
          invoke<State>('get_state_cmd'),
        ]);

        setSettings(settingsData);
        setCredentials(credentialsData);
        setState(stateData);

        // Update launch count
        const updatedState = {
          ...stateData,
          stats: {
            ...stateData.stats,
            total_launches: stateData.stats.total_launches + 1,
            last_launch_timestamp: new Date().toISOString(),
          },
        };
        await invoke('save_state_cmd', { state: updatedState });
        setState(updatedState);
      } catch (err) {
        console.error('Failed to load config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const updateSettings = useCallback(
    async (updater: (prev: Settings) => Settings) => {
      if (!settings) {
        throw new Error('Settings not loaded');
      }

      const updated = updater(settings);
      await invoke('save_settings_cmd', { settings: updated });
      setSettings(updated);
    },
    [settings]
  );

  const updateCredentials = useCallback(
    async (updater: (prev: Credentials) => Credentials) => {
      if (!credentials) {
        throw new Error('Credentials not loaded');
      }

      const updated = updater(credentials);
      await invoke('save_credentials_cmd', { credentials: updated });
      setCredentials(updated);
    },
    [credentials]
  );

  const updateState = useCallback(
    async (updater: (prev: State) => State) => {
      if (!state) {
        throw new Error('State not loaded');
      }

      const updated = updater(state);
      await invoke('save_state_cmd', { state: updated });
      setState(updated);
    },
    [state]
  );

  const reloadSettings = useCallback(async () => {
    const data = await invoke<Settings>('get_settings_cmd');
    setSettings(data);
  }, []);

  const reloadCredentials = useCallback(async () => {
    const data = await invoke<Credentials>('get_credentials_cmd');
    setCredentials(data);
  }, []);

  const reloadState = useCallback(async () => {
    const data = await invoke<State>('get_state_cmd');
    setState(data);
  }, []);

  const getConfigDir = useCallback(async () => {
    return await invoke<string>('get_config_dir_cmd');
  }, []);

  const value: SettingsContextValue = {
    settings,
    credentials,
    state,
    loading,
    error,
    updateSettings,
    updateCredentials,
    updateState,
    reloadSettings,
    reloadCredentials,
    reloadState,
    getConfigDir,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access settings context
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

/**
 * Access specific setting sections
 */
export function useSyncthingSettings() {
  const { settings, updateSettings } = useSettings();

  const updateSyncthingSettings = useCallback(
    async (updater: (prev: SyncthingSettings) => SyncthingSettings) => {
      await updateSettings((prev) => ({
        ...prev,
        syncthing: updater(prev.syncthing),
      }));
    },
    [updateSettings]
  );

  return {
    syncthingSettings: settings?.syncthing,
    updateSyncthingSettings,
  };
}

export function useUiSettings() {
  const { settings, updateSettings } = useSettings();

  const updateUiSettings = useCallback(
    async (updater: (prev: UiSettings) => UiSettings) => {
      await updateSettings((prev) => ({
        ...prev,
        ui: updater(prev.ui),
      }));
    },
    [updateSettings]
  );

  return {
    uiSettings: settings?.ui,
    updateUiSettings,
  };
}

export function useAiSettings() {
  const { settings, updateSettings } = useSettings();

  const updateAiSettings = useCallback(
    async (updater: (prev: AiSettings) => AiSettings) => {
      await updateSettings((prev) => ({
        ...prev,
        ai: updater(prev.ai),
      }));
    },
    [updateSettings]
  );

  return {
    aiSettings: settings?.ai,
    updateAiSettings,
  };
}

export function usePerformanceSettings() {
  const { settings, updateSettings } = useSettings();

  const updatePerformanceSettings = useCallback(
    async (updater: (prev: PerformanceSettings) => PerformanceSettings) => {
      await updateSettings((prev) => ({
        ...prev,
        performance: updater(prev.performance),
      }));
    },
    [updateSettings]
  );

  return {
    performanceSettings: settings?.performance,
    updatePerformanceSettings,
  };
}

/**
 * Access credentials
 */
export function useCredentials() {
  const { credentials, updateCredentials } = useSettings();

  const updateSyncthingApiKey = useCallback(
    async (apiKey: string | null) => {
      await updateCredentials((prev) => ({
        ...prev,
        syncthing: {
          ...prev.syncthing,
          api_key: apiKey,
        },
      }));
    },
    [updateCredentials]
  );

  const updateS3Credentials = useCallback(
    async (accessKeyId: string | null, secretAccessKey: string | null) => {
      await updateCredentials((prev) => ({
        ...prev,
        s3: {
          access_key_id: accessKeyId,
          secret_access_key: secretAccessKey,
        },
      }));
    },
    [updateCredentials]
  );

  return {
    credentials,
    updateSyncthingApiKey,
    updateS3Credentials,
  };
}

/**
 * Access UI state
 */
export function useUiState() {
  const { state, updateState } = useSettings();

  const updateUiState = useCallback(
    async (updater: (prev: UiState) => UiState) => {
      await updateState((prev) => ({
        ...prev,
        ui: updater(prev.ui),
      }));
    },
    [updateState]
  );

  return {
    uiState: state?.ui,
    updateUiState,
  };
}

/**
 * Access stats
 */
export function useStats() {
  const { state } = useSettings();
  return state?.stats;
}
