# AI Agent Instructions for Eigen

This document provides guidance for AI coding assistants (GitHub Copilot, Claude, Cursor, etc.) working on the Eigen codebase.

## Project Overview

Eigen is a Tauri v2 desktop application that manages Syncthing. It has:

- **Frontend**: Next.js 16 with React 19, TypeScript, TailwindCSS
- **Backend**: Rust with Tauri v2
- **AI Features**: Client-side ML with transformers.js and IndexedDB

## Critical: Tauri Command Registry

**ALWAYS use the typed command registry when invoking Tauri commands.**

### ❌ Wrong - Direct invoke with string literals

```typescript
import { invoke } from '@tauri-apps/api/core';

// This is error-prone - command names can be misspelled
await invoke('start_syncthing'); // WRONG: actual command is 'start_syncthing_sidecar'
```

### ✅ Correct - Use typed command functions

```typescript
import { startSyncthingSidecar } from '@/lib/tauri-commands';

// Type-safe, autocomplete, documented
await startSyncthingSidecar();
```

### Command Registry Location

All Tauri commands are defined in: **`src/lib/tauri-commands.ts`**

This file serves as the **single source of truth** for frontend-backend communication.

### Adding New Commands

When adding a new Tauri command:

1. **Rust Backend** - Add to the appropriate module in `src-tauri/src/commands/`:

   ```rust
   // In src-tauri/src/commands/pending.rs (or appropriate module)
   #[tauri::command]
   pub async fn my_new_command(
       state: State<'_, SyncthingState>,
       param: String,
   ) -> Result<MyResponse, SyncthingError> {
       // Implementation
   }
   ```

2. **Export from mod.rs** (`src-tauri/src/commands/mod.rs`):

   ```rust
   pub use pending::my_new_command;
   ```

3. **Register in lib.rs** (`src-tauri/src/lib.rs`):

   ```rust
   .invoke_handler(tauri::generate_handler![
       // ... existing commands
       commands::my_new_command,
   ])
   ```

4. **Add typed wrapper** (`src/lib/tauri-commands.ts`):

   ```typescript
   /**
    * Description of what this command does
    * @param param - Description of the parameter
    * @returns Description of return value
    */
   export async function myNewCommand(param: string): Promise<MyResponse> {
     return invoke<MyResponse>('my_new_command', { param });
   }
   ```

5. **Use in hooks/components**:

   ```typescript
   import { myNewCommand } from '@/lib/tauri-commands';

   const result = await myNewCommand('value');
   ```

## Project Structure

```
src/
├── lib/
│   ├── tauri-commands.ts    # ⚠️ SINGLE SOURCE OF TRUTH for Tauri commands
│   ├── db.ts                # IndexedDB operations
│   ├── health-monitor.ts    # Health check system
│   └── auto-recovery.ts     # Automatic failure recovery
├── hooks/
│   └── syncthing/           # Modular Syncthing hooks
│       ├── core.ts          # Lifecycle hooks (start/stop/status)
│       ├── folders.ts       # Folder management hooks
│       ├── devices.ts       # Device management hooks
│       ├── pending.ts       # Pending device/folder request hooks
│       └── schemas.ts       # Zod schemas for validation
├── components/              # React components
└── store/                   # Zustand state management

src-tauri/
├── src/
│   ├── commands/            # Modular Tauri command implementations
│   │   ├── mod.rs           # Module exports
│   │   ├── system.rs        # System lifecycle commands
│   │   ├── config.rs        # Configuration commands
│   │   ├── folders.rs       # Folder management commands
│   │   ├── devices.rs       # Device management commands
│   │   ├── files.rs         # File operations commands
│   │   ├── events.rs        # Event polling commands
│   │   └── pending.rs       # Pending request commands
│   ├── lib.rs               # Command registration & app setup
│   └── main.rs              # Entry point
└── binaries/                # Bundled Syncthing binary
```

## Code Patterns

### Syncthing API Hooks

Use TanStack Query for data fetching. Hooks are in `src/hooks/syncthing/`:

```typescript
import { useSystemStatus, useConfig, useFolderStatus } from '@/hooks/syncthing';

function MyComponent() {
  const { data: status, isError } = useSystemStatus();
  const { data: config } = useConfig();
}
```

### State Management

- **Server State**: TanStack Query (Syncthing data)
- **Client State**: Zustand (`src/store/index.ts`)

### Error Handling

The app uses circuit breakers and auto-recovery. See:

- `src/lib/retry.ts` - Circuit breaker pattern
- `src/lib/auto-recovery.ts` - Automatic recovery strategies
- `src/lib/health-monitor.ts` - Health check system

### Validation

All Syncthing API responses are validated with Zod schemas in `src/hooks/syncthing/schemas.ts`.

## Testing Changes

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format

# Full check (includes Rust)
pnpm ci

# Run the app
pnpm tauri dev
```

## Common Pitfalls

1. **Don't use raw `invoke()` calls** - Always use `src/lib/tauri-commands.ts`
2. **Don't modify command names** without updating both Rust and TypeScript
3. **Validate API responses** with Zod schemas
4. **Use existing hooks** from `src/hooks/syncthing/` instead of creating new ones

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `FolderList.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useSyncthing.ts`)
- Utilities: `kebab-case.ts` (e.g., `tauri-commands.ts`)
- Constants: `SCREAMING_SNAKE_CASE`
