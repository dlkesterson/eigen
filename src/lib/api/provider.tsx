/**
 * SyncthingClientProvider - React Context for the Syncthing API abstraction
 *
 * This provider allows components to access the Syncthing API through
 * a unified interface, regardless of whether we're using Tauri (local)
 * or HTTP (remote/web) as the backend.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import type { SyncthingClient } from './client';
import type { BridgeType, HttpConnectionSettings } from './types';
import { TauriBridge, tauriBridge } from './tauri-bridge';
import { HttpBridge, createHttpBridge } from './http-bridge';

// ============================================================================
// Context Types
// ============================================================================

interface SyncthingClientContextValue {
  /** The current Syncthing client instance */
  client: SyncthingClient;
  /** The type of bridge being used */
  bridgeType: BridgeType;
  /** Whether we're in a Tauri environment */
  isTauri: boolean;
  /** Whether we're connected to a remote instance */
  isRemote: boolean;
  /** Switch to HTTP bridge with the given settings */
  connectToRemote: (settings: HttpConnectionSettings) => void;
  /** Switch back to Tauri bridge (local) */
  connectToLocal: () => void;
  /** Current remote connection settings (if connected to remote) */
  remoteSettings: HttpConnectionSettings | null;
}

// ============================================================================
// Context
// ============================================================================

const SyncthingClientContext = createContext<SyncthingClientContextValue | null>(null);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if we're running in a Tauri environment
 */
function detectTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
}

/**
 * Get saved remote settings from localStorage
 */
function getSavedRemoteSettings(): HttpConnectionSettings | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem('eigen-remote-settings');
    if (!saved) return null;
    return JSON.parse(saved) as HttpConnectionSettings;
  } catch {
    return null;
  }
}

/**
 * Save remote settings to localStorage
 */
function saveRemoteSettings(settings: HttpConnectionSettings | null): void {
  if (typeof window === 'undefined') return;

  if (settings) {
    localStorage.setItem('eigen-remote-settings', JSON.stringify(settings));
  } else {
    localStorage.removeItem('eigen-remote-settings');
  }
}

/**
 * Get saved bridge preference
 */
function getSavedBridgeType(): BridgeType | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('eigen-bridge-type') as BridgeType | null;
}

/**
 * Save bridge preference
 */
function saveBridgeType(type: BridgeType): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('eigen-bridge-type', type);
}

// ============================================================================
// Provider Component
// ============================================================================

interface SyncthingClientProviderProps {
  children: ReactNode;
  /** Force a specific bridge type (useful for testing) */
  forceBridgeType?: BridgeType;
  /** Initial HTTP settings for remote connection */
  initialHttpSettings?: HttpConnectionSettings;
}

export function SyncthingClientProvider({
  children,
  forceBridgeType,
  initialHttpSettings,
}: SyncthingClientProviderProps) {
  const isTauri = detectTauri();

  // Determine initial bridge type
  const getInitialBridgeType = (): BridgeType => {
    if (forceBridgeType) return forceBridgeType;
    const saved = getSavedBridgeType();
    if (saved) return saved;
    // Default to Tauri if available, otherwise HTTP
    return isTauri ? 'tauri' : 'http';
  };

  const [bridgeType, setBridgeType] = useState<BridgeType>(getInitialBridgeType);
  const [remoteSettings, setRemoteSettings] = useState<HttpConnectionSettings | null>(
    initialHttpSettings || getSavedRemoteSettings()
  );
  const [httpBridge, setHttpBridge] = useState<HttpBridge | null>(null);

  // Initialize HTTP bridge if needed
  useEffect(() => {
    if (bridgeType === 'http' && remoteSettings && !httpBridge) {
      setHttpBridge(createHttpBridge(remoteSettings));
    }
  }, [bridgeType, remoteSettings, httpBridge]);

  // Get the current client
  const client: SyncthingClient = useMemo(() => {
    if (bridgeType === 'tauri' && isTauri) {
      return tauriBridge;
    }

    if (httpBridge) {
      return httpBridge;
    }

    // Fallback: create a new HTTP bridge if we have settings
    if (remoteSettings) {
      const newBridge = createHttpBridge(remoteSettings);
      setHttpBridge(newBridge);
      return newBridge;
    }

    // Last resort: return tauri bridge even if not in tauri (will fail gracefully)
    return tauriBridge;
  }, [bridgeType, isTauri, httpBridge, remoteSettings]);

  // Connect to remote instance
  const connectToRemote = (settings: HttpConnectionSettings) => {
    saveRemoteSettings(settings);
    saveBridgeType('http');
    setRemoteSettings(settings);

    if (httpBridge) {
      httpBridge.updateSettings(settings);
    } else {
      setHttpBridge(createHttpBridge(settings));
    }

    setBridgeType('http');
  };

  // Connect to local instance
  const connectToLocal = () => {
    saveBridgeType('tauri');
    setBridgeType('tauri');
  };

  const contextValue: SyncthingClientContextValue = {
    client,
    bridgeType,
    isTauri,
    isRemote: bridgeType === 'http',
    connectToRemote,
    connectToLocal,
    remoteSettings,
  };

  return (
    <SyncthingClientContext.Provider value={contextValue}>
      {children}
    </SyncthingClientContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the Syncthing client and bridge utilities
 */
export function useSyncthingClient(): SyncthingClientContextValue {
  const context = useContext(SyncthingClientContext);

  if (!context) {
    throw new Error('useSyncthingClient must be used within a SyncthingClientProvider');
  }

  return context;
}

/**
 * Hook to get just the client (convenience wrapper)
 */
export function useClient(): SyncthingClient {
  return useSyncthingClient().client;
}
