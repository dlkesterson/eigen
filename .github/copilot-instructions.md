# GitHub Copilot Instructions for Eigen

## Project Context

Eigen is a Tauri v2 desktop app for managing Syncthing, built with Vite 7, React 19, and Rust.

## Critical Rule: Tauri Command Registry

**NEVER use raw `invoke()` calls with string literals.**

### Always use the typed command registry:

```typescript
// ❌ WRONG - prone to typos, no type safety
import { invoke } from '@tauri-apps/api/core';
await invoke('start_syncthing');

// ✅ CORRECT - type-safe, documented, autocomplete
import { startSyncthingSidecar } from '@/lib/tauri-commands';
await startSyncthingSidecar();
```

### Command Registry Location

**`src/lib/tauri-commands.ts`** is the single source of truth for all Tauri commands.

When suggesting code that calls the Rust backend, always:

1. Check if a function exists in `src/lib/tauri-commands.ts`
2. If not, suggest adding it there first
3. Import and use the typed function, never raw `invoke()`

## Key Files

| File                             | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `src/lib/tauri-commands.ts`      | **Typed Tauri command wrappers**     |
| `src/hooks/syncthing/core.ts`    | Syncthing lifecycle hooks            |
| `src/hooks/syncthing/pending.ts` | Pending device/folder request hooks  |
| `src/hooks/syncthing/schemas.ts` | Zod validation schemas               |
| `src-tauri/src/commands/`        | Modular Rust command implementations |
| `src-tauri/src/lib.rs`           | Command registration                 |
| `src/components/constellation/`  | 3D dashboard components (R3F)        |

## Preferred Patterns

### Data Fetching

Use TanStack Query hooks from `src/hooks/syncthing/`:

```typescript
import { useSystemStatus, useConfig } from '@/hooks/syncthing';
```

### State Management

- Server state: TanStack Query
- Client state: Zustand (`src/store/index.ts`)

### Styling

- Tailwind CSS with custom design tokens
- `cn()` utility for conditional classes
- Framer Motion for animations

### 3D Constellation Dashboard

The dashboard uses React Three Fiber. Key components in `src/components/constellation/`:

- `constellation-dashboard.tsx` - Main 3D scene with Canvas
- `device-orb.tsx` - 3D device representation with presets
- `connection-wire.tsx` - Animated connection lines
- `particle-flow.tsx` - Data transfer particle effects
- `request-beacon.tsx` - Pulsing beacon for pending requests

```typescript
// Use R3F hooks inside Canvas components
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function MyMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.01;
  });
  return <mesh ref={meshRef}>...</mesh>;
}
```

## Adding New Tauri Commands

1. Add Rust function in appropriate module under `src-tauri/src/commands/`
2. Export from `src-tauri/src/commands/mod.rs`
3. Register in `src-tauri/src/lib.rs` invoke_handler
4. Add typed wrapper in `src/lib/tauri-commands.ts`
5. Use the wrapper in hooks/components

## Don't

- Use raw `invoke()` with string command names
- Skip Zod validation for API responses
- Create new hooks when existing ones in `src/hooks/syncthing/` suffice
- Forget to run `pnpm type-check` after changes
- Use `useFrame` or R3F hooks outside of a `<Canvas>` component
- Put heavy calculations inside `useFrame` - use `useMemo` instead
