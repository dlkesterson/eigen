/**
 * Startup Orchestrator
 *
 * Coordinates UI elements during app startup to prevent overlapping
 * notifications, toasts, and overlays from cluttering the interface.
 *
 * Startup Phases:
 * 1. INITIALIZING - App is loading, suppress non-critical toasts
 * 2. CONNECTING - Syncthing connection in progress, queue notifications
 * 3. ONBOARDING - Tutorial is showing, suppress all toasts except errors
 * 4. SETTLING - Brief pause after onboarding/connection for UI to settle
 * 5. READY - Normal operation, all notifications enabled
 */

import { create } from 'zustand';
import { toast, ExternalToast } from 'sonner';
import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export type StartupPhase = 'initializing' | 'connecting' | 'onboarding' | 'settling' | 'ready';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface QueuedToast {
  type: ToastType;
  message: string;
  options?: ExternalToast;
  timestamp: number;
}

interface StartupState {
  phase: StartupPhase;
  isOnboardingActive: boolean;
  connectionEstablished: boolean;
  queuedToasts: QueuedToast[];
  startupStartTime: number;

  // Actions
  setPhase: (phase: StartupPhase) => void;
  setOnboardingActive: (active: boolean) => void;
  setConnectionEstablished: (established: boolean) => void;
  queueToast: (toast: QueuedToast) => void;
  flushQueuedToasts: () => void;
  completeStartup: () => void;
}

// =============================================================================
// Store
// =============================================================================

export const useStartupStore = create<StartupState>()((set, get) => ({
  phase: 'initializing',
  isOnboardingActive: false,
  connectionEstablished: false,
  queuedToasts: [],
  startupStartTime: Date.now(),

  setPhase: (phase) => {
    logger.debug('Startup phase changed', { from: get().phase, to: phase });
    set({ phase });
  },

  setOnboardingActive: (active) => {
    set({ isOnboardingActive: active });
    if (active) {
      set({ phase: 'onboarding' });
    }
  },

  setConnectionEstablished: (established) => {
    set({ connectionEstablished: established });
    const state = get();
    // If we're connected and not in onboarding, move to settling
    if (established && !state.isOnboardingActive && state.phase !== 'ready') {
      set({ phase: 'settling' });
      // Automatically transition to ready after a short delay
      setTimeout(() => {
        if (get().phase === 'settling') {
          get().completeStartup();
        }
      }, 1500);
    }
  },

  queueToast: (queuedToast) => {
    set((state) => ({
      queuedToasts: [...state.queuedToasts, queuedToast],
    }));
  },

  flushQueuedToasts: () => {
    const toasts = get().queuedToasts;
    set({ queuedToasts: [] });

    // Process queued toasts with slight delays to prevent stacking
    toasts.forEach((t, index) => {
      setTimeout(() => {
        showToastDirect(t.type, t.message, t.options);
      }, index * 300);
    });
  },

  completeStartup: () => {
    logger.info('Startup complete', {
      duration: Date.now() - get().startupStartTime,
    });
    set({ phase: 'ready' });
    // Flush any queued toasts
    get().flushQueuedToasts();
  },
}));

// =============================================================================
// Direct Toast (bypasses orchestrator)
// =============================================================================

function showToastDirect(
  type: ToastType,
  message: string,
  options?: ExternalToast
): string | number | undefined {
  switch (type) {
    case 'success':
      return toast.success(message, options);
    case 'error':
      return toast.error(message, options);
    case 'info':
      return toast.info(message, options);
    case 'warning':
      return toast.warning(message, options);
  }
}

// =============================================================================
// Smart Toast Functions (respects startup phases)
// =============================================================================

interface SmartToastOptions extends ExternalToast {
  /** If true, always show immediately regardless of phase */
  critical?: boolean;
  /** If true, queue for later instead of suppressing */
  queueable?: boolean;
}

/**
 * Check if we should show a toast based on current startup phase
 */
function shouldShowToast(type: ToastType, options?: SmartToastOptions): boolean {
  const { phase, isOnboardingActive } = useStartupStore.getState();

  // Critical toasts always show
  if (options?.critical) return true;

  // Errors always show
  if (type === 'error') return true;

  // During onboarding, suppress non-critical toasts
  if (isOnboardingActive || phase === 'onboarding') {
    return false;
  }

  // During initializing/connecting, only show errors
  if (phase === 'initializing' || phase === 'connecting') {
    return false;
  }

  // During settling, limit to important messages
  if (phase === 'settling') {
    return type === 'warning';
  }

  // Ready phase - show everything
  return true;
}

/**
 * Smart toast that respects startup phases
 */
function smartToast(
  type: ToastType,
  message: string,
  options?: SmartToastOptions
): string | number | undefined {
  if (shouldShowToast(type, options)) {
    return showToastDirect(type, message, options);
  }

  // Queue if requested
  if (options?.queueable) {
    useStartupStore.getState().queueToast({
      type,
      message,
      options,
      timestamp: Date.now(),
    });
  }

  return undefined;
}

// =============================================================================
// Exported Smart Toast API
// =============================================================================

export const startupToast = {
  /**
   * Success toast - suppressed during onboarding/startup
   */
  success: (message: string, options?: SmartToastOptions) =>
    smartToast('success', message, options),

  /**
   * Error toast - always shown
   */
  error: (message: string, options?: SmartToastOptions) =>
    smartToast('error', message, { ...options, critical: true }),

  /**
   * Info toast - suppressed during onboarding/startup
   */
  info: (message: string, options?: SmartToastOptions) => smartToast('info', message, options),

  /**
   * Warning toast - shown during settling phase
   */
  warning: (message: string, options?: SmartToastOptions) =>
    smartToast('warning', message, options),

  /**
   * Critical toast - always shown regardless of phase
   */
  critical: (message: string, options?: ExternalToast) =>
    showToastDirect('error', message, options),
};

// =============================================================================
// Startup Orchestrator Hooks
// =============================================================================

/**
 * Hook to get current startup state
 */
export function useStartupPhase() {
  return useStartupStore((s) => s.phase);
}

/**
 * Check if app is in startup mode (not ready)
 */
export function useIsStartingUp() {
  return useStartupStore((s) => s.phase !== 'ready');
}

/**
 * Check if onboarding is active
 */
export function useIsOnboarding() {
  return useStartupStore((s) => s.isOnboardingActive);
}
