/**
 * Device Orb Shader Material
 *
 * Custom THREE.js shader material for device orbs with unique visual effects.
 * Based on trashball's orb shader system.
 */

import * as THREE from 'three';
import type { DeviceOrbPreset } from './orb-presets';

export type DeviceOrbUniforms = {
  time: number;
  color1: THREE.Color | string | number;
  color2: THREE.Color | string | number;
  glowColor: THREE.Color | string | number;
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
  hoverIntensity: number;
};

const asColor = (
  value: THREE.Color | string | number | undefined,
  fallback: string
): THREE.Color => {
  if (value instanceof THREE.Color) return value;
  if (value !== undefined) return new THREE.Color(value);
  return new THREE.Color(fallback);
};

export const DEFAULT_DEVICE_ORB_UNIFORMS: Omit<DeviceOrbUniforms, 'time'> = {
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
  hoverIntensity: 0,
};

export function createDeviceOrbMaterial(
  initial?: Partial<DeviceOrbUniforms>
): THREE.ShaderMaterial {
  const uniforms: Record<string, { value: unknown }> = {
    time: { value: 0 },
    color1: { value: asColor(initial?.color1, DEFAULT_DEVICE_ORB_UNIFORMS.color1 as string) },
    color2: { value: asColor(initial?.color2, DEFAULT_DEVICE_ORB_UNIFORMS.color2 as string) },
    glowColor: {
      value: asColor(initial?.glowColor, DEFAULT_DEVICE_ORB_UNIFORMS.glowColor as string),
    },
    wobbleIntensity: {
      value: initial?.wobbleIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.wobbleIntensity,
    },
    patternScale: { value: initial?.patternScale ?? DEFAULT_DEVICE_ORB_UNIFORMS.patternScale },
    fresnelIntensity: {
      value: initial?.fresnelIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.fresnelIntensity,
    },
    pulseSpeed: { value: initial?.pulseSpeed ?? DEFAULT_DEVICE_ORB_UNIFORMS.pulseSpeed },
    pulseStrength: { value: initial?.pulseStrength ?? DEFAULT_DEVICE_ORB_UNIFORMS.pulseStrength },
    glitchIntensity: {
      value: initial?.glitchIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.glitchIntensity,
    },
    ringIntensity: { value: initial?.ringIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.ringIntensity },
    holoIntensity: { value: initial?.holoIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.holoIntensity },
    scanSpeed: { value: initial?.scanSpeed ?? DEFAULT_DEVICE_ORB_UNIFORMS.scanSpeed },
    frostIntensity: {
      value: initial?.frostIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.frostIntensity,
    },
    flameIntensity: {
      value: initial?.flameIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.flameIntensity,
    },
    coreIntensity: { value: initial?.coreIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.coreIntensity },
    hoverIntensity: {
      value: initial?.hoverIntensity ?? DEFAULT_DEVICE_ORB_UNIFORMS.hoverIntensity,
    },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      uniform float time;
      uniform float wobbleIntensity;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        
        // Organic wobble displacement
        vec3 pos = position;
        float wobble = sin(time * 2.0 + position.y * 3.0) * 0.03 * wobbleIntensity;
        wobble += cos(time * 1.5 + position.x * 2.5) * 0.02 * wobbleIntensity;
        pos += normal * wobble;
        
        vPosition = pos;
        vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 glowColor;
      uniform float patternScale;
      uniform float fresnelIntensity;
      uniform float pulseSpeed;
      uniform float pulseStrength;
      uniform float glitchIntensity;
      uniform float ringIntensity;
      uniform float holoIntensity;
      uniform float scanSpeed;
      uniform float frostIntensity;
      uniform float flameIntensity;
      uniform float coreIntensity;
      uniform float hoverIntensity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;

      // Noise functions
      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float n000 = hash(i);
        float n100 = hash(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash(i + vec3(1.0, 1.0, 1.0));
        
        float nx00 = mix(n000, n100, f.x);
        float nx10 = mix(n010, n110, f.x);
        float nx01 = mix(n001, n101, f.x);
        float nx11 = mix(n011, n111, f.x);
        float nxy0 = mix(nx00, nx10, f.y);
        float nxy1 = mix(nx01, nx11, f.y);
        
        return mix(nxy0, nxy1, f.z);
      }

      float fbm(vec3 p) {
        float value = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amp * noise(p);
          p *= 2.0;
          amp *= 0.5;
        }
        return value;
      }

      // Effect functions
      vec3 applyPulse(vec3 color, vec3 pos) {
        if (pulseStrength <= 0.0) return color;
        float r = length(pos);
        float wave = sin(r * 6.0 - time * pulseSpeed);
        float pulse = pow(wave * 0.5 + 0.5, 2.0) * pulseStrength;
        return color + pulse * glowColor;
      }

      vec3 applyGlitch(vec3 color, vec3 pos) {
        if (glitchIntensity <= 0.0) return color;
        float scan = sin(pos.y * 30.0 + time * 4.0);
        float scanMask = step(0.85, scan);
        float jitter = sin(pos.x * 60.0 + time * 30.0);
        float glitch = scanMask * step(0.7, abs(jitter));
        return mix(color, glowColor, glitch * glitchIntensity);
      }

      vec3 applyRing(vec3 color, vec3 unitPos) {
        if (ringIntensity <= 0.0) return color;
        float lat = asin(unitPos.y);
        float ring = exp(-lat * lat * 10.0);
        float ringPulse = 0.5 + 0.5 * sin(time * 1.2);
        vec3 ringColor = mix(color1, glowColor, ringPulse);
        return mix(color, ringColor, ring * ringIntensity);
      }

      vec3 applyHologram(vec3 color, vec3 pos) {
        if (holoIntensity <= 0.0) return color;
        vec3 grid = floor(pos * 5.0) / 5.0;
        float cell = fract(sin(dot(grid, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float cellMask = step(0.65, cell);
        color = mix(color, mix(color1, glowColor, cell), cellMask * holoIntensity);
        
        // Scan line
        float scan = fract(pos.y * 3.0 + time * scanSpeed);
        float scanMask = smoothstep(0.0, 0.2, 0.5 - abs(scan - 0.5));
        return color + scanMask * holoIntensity * 0.4 * glowColor;
      }

      vec3 applyFrost(vec3 color, vec3 pos) {
        if (frostIntensity <= 0.0) return color;
        float cell = fbm(pos * 3.5);
        float shards = pow(cell, 8.0);
        vec3 icy = mix(color1, vec3(0.7, 0.9, 1.0), shards);
        return mix(color, icy, frostIntensity);
      }

      vec3 applyFlame(vec3 color, vec3 pos) {
        if (flameIntensity <= 0.0) return color;
        vec3 unitPos = normalize(pos);
        vec3 samplePos = vec3(pos.x, pos.y + time * 1.5, pos.z) * 2.0;
        float noiseVal = fbm(samplePos);
        float verticalBias = unitPos.y * 0.35;
        float baseMask = smoothstep(0.25, 0.9, noiseVal + verticalBias);
        vec3 flameColor = mix(color, glowColor, baseMask * flameIntensity);
        float flicker = 0.9 + 0.1 * sin(time * 4.0 + noiseVal * 6.0);
        return flameColor * flicker;
      }

      vec3 applyCore(vec3 color, vec3 pos) {
        if (coreIntensity <= 0.0) return color;
        float core = smoothstep(0.8, 0.2, length(pos));
        return mix(color, glowColor, core * coreIntensity);
      }

      void main() {
        vec3 unitPos = normalize(vPosition);
        
        // Base pattern
        float pattern = sin(vPosition.x * patternScale + time * 0.5) *
                       cos(vPosition.y * patternScale + time * 0.4) *
                       sin(vPosition.z * patternScale + time * 0.3);
        vec3 baseColor = mix(color1, color2, pattern * 0.5 + 0.5);
        
        // Fresnel rim glow
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
        vec3 finalColor = baseColor + fresnel * glowColor * 0.5 * fresnelIntensity;
        
        // Apply effects
        finalColor = applyPulse(finalColor, vPosition);
        finalColor = applyGlitch(finalColor, vPosition);
        finalColor = applyRing(finalColor, unitPos);
        finalColor = applyHologram(finalColor, vPosition);
        finalColor = applyFrost(finalColor, vPosition);
        finalColor = applyFlame(finalColor, vPosition);
        finalColor = applyCore(finalColor, vPosition);
        
        // Hover enhancement
        finalColor += glowColor * hoverIntensity * 0.3;
        finalColor += fresnel * glowColor * hoverIntensity * 0.5;
        
        // Sparkle particles
        float particles = step(0.97, sin(vPosition.x * 15.0 + time * 3.0) *
                                     cos(vPosition.y * 15.0 + time * 2.0));
        finalColor += particles * glowColor * 0.5;
        
        gl_FragColor = vec4(finalColor, 0.95);
      }
    `,
  });
}

/** Create a device orb material from a preset */
export function createMaterialFromPreset(preset: DeviceOrbPreset): THREE.ShaderMaterial {
  return createDeviceOrbMaterial({
    color1: preset.uniforms.color1,
    color2: preset.uniforms.color2,
    glowColor: preset.uniforms.glowColor,
    wobbleIntensity: preset.uniforms.wobbleIntensity,
    patternScale: preset.uniforms.patternScale,
    fresnelIntensity: preset.uniforms.fresnelIntensity,
    pulseSpeed: preset.uniforms.pulseSpeed,
    pulseStrength: preset.uniforms.pulseStrength,
    glitchIntensity: preset.uniforms.glitchIntensity,
    ringIntensity: preset.uniforms.ringIntensity,
    holoIntensity: preset.uniforms.holoIntensity,
    scanSpeed: preset.uniforms.scanSpeed,
    frostIntensity: preset.uniforms.frostIntensity,
    flameIntensity: preset.uniforms.flameIntensity,
    coreIntensity: preset.uniforms.coreIntensity,
  });
}

/** Update material uniforms without recreating the material */
export function updateMaterialUniforms(
  material: THREE.ShaderMaterial,
  updates: Partial<DeviceOrbUniforms>
): void {
  Object.entries(updates).forEach(([key, value]) => {
    if (material.uniforms[key]) {
      if (key === 'color1' || key === 'color2' || key === 'glowColor') {
        material.uniforms[key].value = asColor(value as string, '#ffffff');
      } else {
        material.uniforms[key].value = value;
      }
    }
  });
}
