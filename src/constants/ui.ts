/**
 * UI-related constants
 */

/** Animation durations in seconds (for Framer Motion) */
export const ANIMATION = {
  FAST: 0.15,
  NORMAL: 0.3,
  SLOW: 0.5,
} as const;

/** Z-index layers for consistent stacking */
export const Z_INDEX = {
  DROPDOWN: 50,
  MODAL: 60,
  TOAST: 70,
  TOOLTIP: 80,
} as const;

/** Theme options */
export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

/** AI status states */
export const AI_STATUSES = ['idle', 'loading', 'ready', 'error', 'disabled'] as const;
export type AIStatus = (typeof AI_STATUSES)[number];

/** Default settings values */
export const DEFAULTS = {
  POLLING_INTERVAL: 5000,
  NATIVE_NOTIFICATIONS_ENABLED: true,
  AI_ENABLED: false,
  SIDEBAR_OPEN: true,
  FOCUS_MODE: false,
  THEME: 'dark' as Theme,
} as const;
