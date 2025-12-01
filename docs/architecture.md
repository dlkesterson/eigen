# Eigen Architecture

Eigen is a Tauri v2 desktop application for managing Syncthing, built with Next.js 16, React 19, and Rust.

## Directory Structure

```
src/
├── app/                    # Next.js app router
├── components/             # React components
│   └── ui/                 # Reusable UI primitives
├── constants/              # Application constants
├── hooks/
│   ├── syncthing/          # Syncthing API hooks (modular)
│   └── *.ts                # Other hooks
├── lib/
│   ├── api/                # API bridge layer
│   └── *.ts                # Utilities and services
├── store/                  # Zustand state stores
├── types/                  # TypeScript type definitions
└── workers/                # Web Workers (AI)

src-tauri/
├── src/
│   ├── commands.rs         # Tauri command implementations
│   ├── lib.rs              # App setup and command registration
│   └── main.rs             # Entry point
└── binaries/               # Bundled Syncthing binary
```

## Key Patterns

### Tauri Command Registry

All frontend-to-backend communication goes through `src/lib/tauri-commands.ts`. Never use raw `invoke()` calls.

```typescript
// ✅ Correct
import { startSyncthingSidecar } from '@/lib/tauri-commands';
await startSyncthingSidecar();

// ❌ Wrong
import { invoke } from '@tauri-apps/api/core';
await invoke('start_syncthing_sidecar');
```

### Data Fetching

Server state is managed with TanStack Query. Hooks are organized in `src/hooks/syncthing/`:

- `core.ts` - System status, config, lifecycle
- `folders.ts` - Folder management
- `devices.ts` - Device management
- `events.ts` - Real-time event polling
- `conflicts.ts` - Conflict resolution
- `versions.ts` - File versioning
- `logs.ts` - System logs
- `options.ts` - Global options

### State Management

- **Server State**: TanStack Query (automatic caching, refetching)
- **Client State**: Zustand stores in `src/store/index.ts`

### Error Handling

The app uses a layered error handling approach:

1. **Error Classes** (`src/lib/errors.ts`) - Typed errors with context
2. **Circuit Breaker** (`src/lib/retry.ts`) - Prevents cascade failures
3. **Health Monitor** (`src/lib/health-monitor.ts`) - Tracks service health
4. **Auto Recovery** (`src/lib/auto-recovery.ts`) - Automatic failure recovery

### Validation

All Syncthing API responses are validated with Zod schemas in `src/hooks/syncthing/schemas.ts`.

## AI Features

Client-side ML using transformers.js:

- Web Worker in `src/workers/ai.worker.ts`
- IndexedDB storage in `src/lib/db.ts`
- Predictive sync in `src/lib/predictive-sync.ts`

## Adding Features

### New Tauri Command

1. Add Rust function in `src-tauri/src/commands.rs`
2. Register in `src-tauri/src/lib.rs`
3. Add typed wrapper in `src/lib/tauri-commands.ts`
4. Use wrapper in hooks/components

### New Syncthing Hook

1. Add to appropriate file in `src/hooks/syncthing/`
2. Export from `src/hooks/syncthing/index.ts`
3. Add Zod schema if needed in `schemas.ts`
