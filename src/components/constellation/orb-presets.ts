/**
 * Device Orb Visual Presets
 *
 * Each device gets a unique visual style based on its state and identity.
 * Inspired by trashball's orb shader system but optimized for device visualization.
 */

export type DeviceOrbPreset = {
  uniforms: {
    color1: string;
    color2: string;
    glowColor: string;
    wobbleIntensity: number;
    patternScale: number;
    fresnelIntensity: number;
    pulseSpeed: number;
    pulseStrength: number;
    glitchIntensity: number;
    ringIntensity: number;
    holoIntensity: number;
    scanSpeed: number;
    frostIntensity: number;
    flameIntensity: number;
    coreIntensity: number;
  };
  bloom: {
    strength: number;
    threshold: number;
  };
};

// =====================================
// STATE-BASED PRESETS
// =====================================

/** Local device - Golden core with holographic scan effect */
export const LOCAL_DEVICE_PRESET: DeviceOrbPreset = {
  uniforms: {
    color1: '#1a1a2e',
    color2: '#f4d03f',
    glowColor: '#f39c12',
    wobbleIntensity: 0.8,
    patternScale: 2.5,
    fresnelIntensity: 2.0,
    pulseSpeed: 1.5,
    pulseStrength: 0.3,
    glitchIntensity: 0,
    ringIntensity: 0.4,
    holoIntensity: 0.3,
    scanSpeed: 0.8,
    frostIntensity: 0,
    flameIntensity: 0,
    coreIntensity: 0.6,
  },
  bloom: {
    strength: 0.6,
    threshold: 0.4,
  },
};

/** Online and syncing - Cyan energy flow with dynamic pulses */
export const SYNCING_PRESET: DeviceOrbPreset = {
  uniforms: {
    color1: '#0d1b2a',
    color2: '#22d3ee',
    glowColor: '#06b6d4',
    wobbleIntensity: 2.0,
    patternScale: 3.0,
    fresnelIntensity: 2.5,
    pulseSpeed: 4.0,
    pulseStrength: 0.8,
    glitchIntensity: 0.1,
    ringIntensity: 0.6,
    holoIntensity: 0.2,
    scanSpeed: 2.0,
    frostIntensity: 0,
    flameIntensity: 0.3,
    coreIntensity: 0.8,
  },
  bloom: {
    strength: 1.0,
    threshold: 0.3,
  },
};

/** Online and idle - Calm blue with subtle breathing animation */
export const ONLINE_IDLE_PRESET: DeviceOrbPreset = {
  uniforms: {
    color1: '#1e3a5f',
    color2: '#3b82f6',
    glowColor: '#60a5fa',
    wobbleIntensity: 0.5,
    patternScale: 2.0,
    fresnelIntensity: 1.5,
    pulseSpeed: 1.0,
    pulseStrength: 0.15,
    glitchIntensity: 0,
    ringIntensity: 0.2,
    holoIntensity: 0.1,
    scanSpeed: 0.5,
    frostIntensity: 0,
    flameIntensity: 0,
    coreIntensity: 0.3,
  },
  bloom: {
    strength: 0.4,
    threshold: 0.5,
  },
};

/** Offline - Dim gray with frost effect */
export const OFFLINE_PRESET: DeviceOrbPreset = {
  uniforms: {
    color1: '#1a1a1a',
    color2: '#4a5568',
    glowColor: '#718096',
    wobbleIntensity: 0.1,
    patternScale: 1.5,
    fresnelIntensity: 0.8,
    pulseSpeed: 0.3,
    pulseStrength: 0.05,
    glitchIntensity: 0,
    ringIntensity: 0,
    holoIntensity: 0,
    scanSpeed: 0,
    frostIntensity: 0.6,
    flameIntensity: 0,
    coreIntensity: 0,
  },
  bloom: {
    strength: 0.15,
    threshold: 0.7,
  },
};

/** Paused - Amber warning with subtle glitch */
export const PAUSED_PRESET: DeviceOrbPreset = {
  uniforms: {
    color1: '#2d1f0f',
    color2: '#f59e0b',
    glowColor: '#fbbf24',
    wobbleIntensity: 0.3,
    patternScale: 2.0,
    fresnelIntensity: 1.2,
    pulseSpeed: 0.5,
    pulseStrength: 0.2,
    glitchIntensity: 0.15,
    ringIntensity: 0.3,
    holoIntensity: 0,
    scanSpeed: 0,
    frostIntensity: 0.2,
    flameIntensity: 0,
    coreIntensity: 0.2,
  },
  bloom: {
    strength: 0.35,
    threshold: 0.5,
  },
};

// =====================================
// IDENTITY-BASED STYLE MODIFIERS
// These give each device a unique visual signature
// =====================================

export type StyleModifier = {
  colorShift: number; // Hue rotation 0-360
  patternMod: number; // Pattern scale multiplier
  glowVariant: 'warm' | 'cool' | 'neutral';
  effectEmphasis: 'pulse' | 'ring' | 'holo' | 'flame' | 'frost' | 'none';
};

/** Generate a deterministic style modifier based on device ID */
export function getDeviceStyleModifier(deviceId: string): StyleModifier {
  // Create a simple hash from the device ID
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    const char = deviceId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const absHash = Math.abs(hash);

  // Derive style properties from hash
  const colorShift = absHash % 360;
  const patternMod = 0.8 + (absHash % 40) / 100; // 0.8 to 1.2
  const glowVariants: Array<'warm' | 'cool' | 'neutral'> = ['warm', 'cool', 'neutral'];
  const glowVariant = glowVariants[absHash % 3];
  const effects: Array<'pulse' | 'ring' | 'holo' | 'flame' | 'frost' | 'none'> = [
    'pulse',
    'ring',
    'holo',
    'flame',
    'frost',
    'none',
  ];
  const effectEmphasis = effects[absHash % effects.length];

  return {
    colorShift,
    patternMod,
    glowVariant,
    effectEmphasis,
  };
}

/** Apply a style modifier to a base preset to create a unique device look */
export function applyStyleModifier(
  preset: DeviceOrbPreset,
  modifier: StyleModifier
): DeviceOrbPreset {
  const result = JSON.parse(JSON.stringify(preset)) as DeviceOrbPreset;

  // Apply pattern modification
  result.uniforms.patternScale *= modifier.patternMod;

  // Apply glow variant
  switch (modifier.glowVariant) {
    case 'warm':
      result.uniforms.fresnelIntensity *= 1.2;
      result.uniforms.coreIntensity *= 1.3;
      break;
    case 'cool':
      result.uniforms.holoIntensity += 0.1;
      result.uniforms.frostIntensity += 0.1;
      break;
    case 'neutral':
      // Keep as-is
      break;
  }

  // Apply effect emphasis
  switch (modifier.effectEmphasis) {
    case 'pulse':
      result.uniforms.pulseStrength *= 1.5;
      break;
    case 'ring':
      result.uniforms.ringIntensity += 0.2;
      break;
    case 'holo':
      result.uniforms.holoIntensity += 0.15;
      result.uniforms.scanSpeed *= 1.5;
      break;
    case 'flame':
      result.uniforms.flameIntensity += 0.2;
      result.uniforms.coreIntensity += 0.1;
      break;
    case 'frost':
      result.uniforms.frostIntensity += 0.2;
      result.uniforms.wobbleIntensity *= 0.7;
      break;
    case 'none':
      // Keep as-is
      break;
  }

  return result;
}

/** Get the appropriate preset for a device's current state */
export function getDeviceStatePreset(state: {
  isLocal: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  isPaused: boolean;
}): DeviceOrbPreset {
  if (state.isLocal) return LOCAL_DEVICE_PRESET;
  if (state.isPaused) return PAUSED_PRESET;
  if (!state.isOnline) return OFFLINE_PRESET;
  if (state.isSyncing) return SYNCING_PRESET;
  return ONLINE_IDLE_PRESET;
}

/** Get a fully customized preset for a specific device */
export function getDevicePreset(
  deviceId: string,
  state: {
    isLocal: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    isPaused: boolean;
  }
): DeviceOrbPreset {
  const basePreset = getDeviceStatePreset(state);

  // Local device gets no modifier to maintain consistent golden appearance
  if (state.isLocal) return basePreset;

  const modifier = getDeviceStyleModifier(deviceId);
  return applyStyleModifier(basePreset, modifier);
}
