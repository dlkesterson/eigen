# GitHub Copilot Instructions for Eigen

## Project Context

Eigen is a Tauri v2 desktop app for managing Syncthing, built with Next.js 16, React 19, and Rust.

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

| File                             | Purpose                          |
| -------------------------------- | -------------------------------- |
| `src/lib/tauri-commands.ts`      | **Typed Tauri command wrappers** |
| `src/hooks/syncthing/core.ts`    | Syncthing lifecycle hooks        |
| `src/hooks/syncthing/schemas.ts` | Zod validation schemas           |
| `src-tauri/src/commands.rs`      | Rust command implementations     |
| `src-tauri/src/lib.rs`           | Command registration             |

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

## Adding New Tauri Commands

1. Add Rust function in `src-tauri/src/commands.rs`
2. Register in `src-tauri/src/lib.rs` invoke_handler
3. Add typed wrapper in `src/lib/tauri-commands.ts`
4. Use the wrapper in hooks/components

## Don't

- Use raw `invoke()` with string command names
- Skip Zod validation for API responses
- Create new hooks when existing ones in `src/hooks/syncthing/` suffice
- Forget to run `pnpm type-check` after changes
