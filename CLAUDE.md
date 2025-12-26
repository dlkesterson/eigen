# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eigen is a modern, AI-powered desktop client for Syncthing built with Tauri v2, Next.js 16, and Rust. It provides a beautiful 3D constellation visualization of your sync network, AI-powered semantic file search, and comprehensive Syncthing management capabilities.

**Current Status:** 95% complete, just needs S3 backup support (see Forever Tools Roadmap)

**Version:** 0.1.0

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Download bundled Syncthing binary (required before first run)
pnpm download:syncthing

# Run Tauri desktop app in development
pnpm tauri dev

# Build Next.js frontend only
pnpm build

# Build complete desktop application
pnpm tauri build

# Type checking
pnpm type-check

# Linting
pnpm lint              # JavaScript/TypeScript
pnpm tauri:lint        # Rust (clippy)

# Formatting
pnpm format            # JavaScript/TypeScript
pnpm tauri:fmt         # Rust

# CI checks
pnpm ci                # Frontend only
pnpm ci:backend        # Backend only
pnpm ci:all            # Full check + build
```

## Architecture

### Tech Stack

**Frontend (src/):**
- Next.js 16 (static export mode) + React 19
- TypeScript + Tailwind CSS 4
- React Three Fiber + Three.js (3D constellation)
- TanStack Query (server state management)
- Zustand (client state management)
- Framer Motion (animations)
- @xenova/transformers (client-side ML)
- IndexedDB (idb) for local storage

**Backend (src-tauri/):**
- Rust + Tauri v2
- Reqwest (HTTP client for Syncthing API)
- Tokio (async runtime)
- Serde (serialization)
- Bundled Syncthing binary (sidecar process)

**Tauri Plugins:**
- `plugin-notification` - Native OS notifications
- `plugin-dialog` - Native file dialogs
- `plugin-shell` - Syncthing sidecar management
- `plugin-deep-link` - `eigen://` URL protocol
- `plugin-opener` - Open files/folders in system apps

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Eigen Desktop App                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Frontend (Next.js SSG)                  │    │
│  │  • React Components  • TanStack Query  • Zustand    │    │
│  │  • AI Search Worker  • IndexedDB Storage            │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │ Tauri IPC                      │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │               Backend (Rust/Tauri)                   │    │
│  │  • Syncthing Process Management                      │    │
│  │  • REST API Proxy (secure API key handling)         │    │
│  │  • Native OS Features (notifications, dialogs)      │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │ HTTP/REST                      │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │            Syncthing (Sidecar Binary)                │    │
│  │  • File Synchronization  • Device Discovery          │    │
│  │  • Conflict Detection    • Version History          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
src/
├── app/                          # Next.js app router pages
├── components/
│   ├── constellation/            # 3D Dashboard (React Three Fiber)
│   │   ├── constellation-dashboard.tsx  # Main 3D scene
│   │   ├── device-orb.tsx        # 3D device representation
│   │   ├── connection-wire.tsx   # Animated connection lines
│   │   ├── particle-flow.tsx     # Data transfer particle effects
│   │   ├── request-beacon.tsx    # Pending request alert beacon
│   │   ├── hud-panel.tsx         # Overlay stat panels
│   │   ├── orb-presets.ts        # Device visual styles
│   │   └── orb-material.ts       # Custom Three.js materials
│   ├── ui/                       # Reusable UI components (button, card, etc.)
│   ├── ai-search-bar.tsx         # AI-powered semantic search
│   ├── file-browser.tsx          # Folder file browser with versions
│   ├── file-indexer.tsx          # AI file indexing component
│   ├── network-graph.tsx         # Network topology visualization
│   ├── smart-conflict-resolver.tsx  # AI conflict resolution
│   ├── version-timeline.tsx      # File version history timeline
│   ├── folder-list.tsx           # Sync folder management
│   ├── device-list.tsx           # Device management
│   ├── share-device-dialog.tsx   # QR code & link sharing
│   ├── add-device-dialog.tsx     # Add device with QR code
│   ├── pending-requests-banner.tsx  # Pending request banner
│   ├── pending-requests-dialog.tsx  # Accept/dismiss requests
│   ├── ignore-patterns-dialog.tsx   # Ignore pattern editor
│   ├── log-viewer.tsx            # System log viewer
│   └── settings-page.tsx         # App settings
├── hooks/
│   ├── syncthing/                # Modular Syncthing API hooks
│   │   ├── core.ts               # Lifecycle (start/stop/status)
│   │   ├── folders.ts            # Folder management
│   │   ├── devices.ts            # Device management
│   │   ├── pending.ts            # Pending device/folder requests
│   │   ├── events.ts             # Real-time event polling
│   │   ├── conflicts.ts          # Conflict resolution
│   │   ├── versions.ts           # File versioning
│   │   ├── logs.ts               # System logs
│   │   ├── options.ts            # Global options
│   │   └── schemas.ts            # Zod validation schemas
│   ├── useAISearch.ts            # AI search functionality
│   ├── useDeviceInvite.ts        # Device invitation & QR codes
│   ├── usePredictiveSync.ts      # Predictive sync patterns
│   └── useNotifications.ts       # Native notifications
├── lib/
│   ├── tauri-commands.ts         # ⚠️ TYPED TAURI COMMAND REGISTRY
│   ├── db.ts                     # IndexedDB operations
│   ├── errors.ts                 # Typed error classes
│   ├── health-monitor.ts         # System health checks
│   ├── auto-recovery.ts          # Automatic failure recovery
│   ├── retry.ts                  # Retry logic & circuit breaker
│   └── predictive-sync.ts        # Access pattern learning
├── store/                        # Zustand state stores
└── workers/
    └── ai.worker.ts              # AI embedding generation

src-tauri/
├── src/
│   ├── commands/                 # Modular Tauri command handlers
│   │   ├── mod.rs                # Module exports
│   │   ├── system.rs             # System lifecycle (start/stop/status)
│   │   ├── config.rs             # Configuration management
│   │   ├── folders.rs            # Folder operations
│   │   ├── devices.rs            # Device operations
│   │   ├── files.rs              # File operations
│   │   ├── events.rs             # Event polling
│   │   └── pending.rs            # Pending request handling
│   ├── lib.rs                    # Command registration & app setup
│   └── main.rs                   # Application entry
├── binaries/                     # Bundled Syncthing binary
├── capabilities/                 # Tauri security capabilities
├── Cargo.toml                    # Rust dependencies
└── tauri.conf.json               # Tauri configuration
```

## Critical: Tauri Command Registry

**NEVER use raw `invoke()` calls with string literals.**

The file `src/lib/tauri-commands.ts` is the **single source of truth** for all frontend-backend communication.

### ❌ Wrong - Direct invoke with string literals

```typescript
import { invoke } from '@tauri-apps/api/core';

// Error-prone - command names can be misspelled
await invoke('start_syncthing'); // WRONG: actual command is 'start_syncthing_sidecar'
```

### ✅ Correct - Use typed command functions

```typescript
import { startSyncthingSidecar } from '@/lib/tauri-commands';

// Type-safe, autocomplete, documented
await startSyncthingSidecar();
```

### Adding New Tauri Commands

When adding a new Tauri command, follow this workflow:

1. **Add Rust Implementation** (`src-tauri/src/commands/<module>.rs`):
   ```rust
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
   pub use my_module::my_new_command;
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

5. **Use in components/hooks**:
   ```typescript
   import { myNewCommand } from '@/lib/tauri-commands';
   const result = await myNewCommand('value');
   ```

## Key Technical Details

### State Management Strategy

**Server State (TanStack Query):**
- Syncthing API data
- Automatic caching, background refetching
- Stale-while-revalidate pattern
- All hooks in `src/hooks/syncthing/`

**Client State (Zustand):**
- UI state (theme, sidebar, modals)
- User preferences
- Store in `src/store/index.ts`

### Error Handling & Resilience

Eigen uses a layered error handling approach:

1. **Typed Errors** (`src/lib/errors.ts`):
   - `SyncthingError` - Base error class
   - `NetworkError`, `ConfigError`, `ValidationError`, etc.
   - Contextual information for debugging

2. **Circuit Breaker** (`src/lib/retry.ts`):
   - Prevents cascade failures
   - Exponential backoff with jitter
   - Automatic circuit opening/closing

3. **Health Monitor** (`src/lib/health-monitor.ts`):
   - Continuous health checks
   - Service status tracking
   - Health history for diagnostics

4. **Auto Recovery** (`src/lib/auto-recovery.ts`):
   - Automatic recovery from common failures
   - Restart strategies
   - Degradation patterns

### Validation

All Syncthing API responses are validated with **Zod schemas** in `src/hooks/syncthing/schemas.ts`. This ensures type safety at runtime and catches API contract changes early.

### AI Features

**Client-Side ML Pipeline:**
1. **Model**: `@xenova/transformers` (runs entirely in browser)
2. **Worker**: `src/workers/ai.worker.ts` (background processing)
3. **Storage**: IndexedDB via `idb` library
4. **Search**: Semantic similarity using embeddings

**Predictive Sync:**
- Learns file access patterns
- Pre-syncs frequently used folders
- Implementation in `src/lib/predictive-sync.ts`

### 3D Constellation Dashboard

Built with React Three Fiber:

**Key Patterns:**
- `useFrame` hook for animations (runs every frame)
- `useRef` with Three.js types for mesh references
- Heavy calculations in `useMemo` outside render loop
- Use `@react-three/drei` helpers (Stars, OrbitControls, etc.)

**Visual Elements:**
- **Device Orbs**: Glowing spheres with unique presets based on state
- **Connection Wires**: Animated lines showing active sync relationships
- **Particle Flow**: Real-time particles during data transfer
- **Request Beacon**: Pulsing golden beacon for pending requests
- **HUD Overlays**: Real-time stats panels

### Deep Link Protocol

Eigen registers the `eigen://` URL protocol:

**Invite Format:**
```
eigen://invite?deviceID=<id>&addresses=<addr1,addr2>&name=<name>&expires=<timestamp>
```

**Validation:**
- Check expiration timestamp
- Validate device ID format
- Sanitize addresses

### Bundled Syncthing

Eigen bundles its own Syncthing binary as a sidecar process:

**Download Script:** `scripts/download-syncthing.js`
- Detects platform (Windows/macOS/Linux)
- Downloads correct binary
- Extracts to `src-tauri/binaries/`

**Management:**
- Started via Tauri shell plugin
- API key managed internally (never exposed to frontend)
- Process lifecycle managed by Rust backend

## Common Workflows

### Initial Setup

```bash
# Install dependencies
pnpm install

# Download Syncthing binary
pnpm download:syncthing

# Start development server
pnpm tauri dev
```

### Adding a New Feature

1. **Plan the feature** - Identify required Tauri commands
2. **Add Rust commands** - Implement in `src-tauri/src/commands/`
3. **Register commands** - Update `lib.rs` and `tauri-commands.ts`
4. **Create hooks** - Add TanStack Query hooks in `src/hooks/syncthing/`
5. **Build UI** - Create React components in `src/components/`
6. **Validate** - Add Zod schemas for API responses
7. **Test** - Run `pnpm tauri dev` and test manually

### Adding a Syncthing API Hook

```typescript
// In src/hooks/syncthing/my-feature.ts
import { useQuery } from '@tanstack/react-query';
import { myNewCommand } from '@/lib/tauri-commands';

export function useMyFeature() {
  return useQuery({
    queryKey: ['my-feature'],
    queryFn: () => myNewCommand(),
    refetchInterval: 5000, // Poll every 5s
  });
}
```

### Building for Release

```bash
# Build production app
pnpm tauri build

# Artifacts will be in src-tauri/target/release/bundle/
```

### Creating a GitHub Release

```bash
# Tag the release
git tag v0.1.0

# Push the tag to trigger GitHub Actions
git push origin v0.1.0
```

GitHub Actions will build for:
- Windows (x64) - NSIS installer, MSI
- macOS (Intel + Apple Silicon) - DMG
- Linux (x64) - Debian package, AppImage

## Important Notes

### Security

- **API Keys**: Syncthing API keys managed by Rust backend, never exposed to frontend
- **Local Processing**: AI embeddings generated client-side, no external API calls
- **Deep Link Validation**: Invite URLs include expiration, validated before use
- **CSP Configured**: Content Security Policy configured for Tauri

### Performance

- **Static Export**: Next.js builds to static HTML (no Node.js runtime)
- **Web Workers**: AI processing offloaded to workers
- **IndexedDB**: Fast local storage for embeddings
- **Query Caching**: TanStack Query caches API responses

### Linux Dependencies

Required packages for Tauri development:
```bash
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Common Pitfalls

1. **Don't use raw `invoke()` calls** - Always use `src/lib/tauri-commands.ts`
2. **Don't modify command names** without updating both Rust and TypeScript
3. **Validate API responses** with Zod schemas
4. **Use existing hooks** from `src/hooks/syncthing/` instead of duplicating
5. **Keep 3D animations efficient** - Use `useMemo` and `useRef` appropriately

## File Naming Conventions

- **Components**: `PascalCase.tsx` (e.g., `FolderList.tsx`)
- **Hooks**: `camelCase.ts` with `use` prefix (e.g., `useSyncthing.ts`)
- **Utilities**: `kebab-case.ts` (e.g., `tauri-commands.ts`)
- **Constants**: `SCREAMING_SNAKE_CASE`

## Related Documentation

- `AGENTS.md` - AI assistant instructions (similar content, legacy)
- `docs/architecture.md` - Detailed architecture documentation
- `docs/syncthing-hooks.md` - Syncthing API hook patterns
- `docs/error-handling.md` - Error handling strategies
- `.github/copilot-instructions.md` - GitHub Copilot instructions

## Future Work (Phase 2)

See Forever Tools Roadmap for:
- **S3 Backup Support** (Phase 2.2) - Add S3 backend for archival backups
  - Research Rust S3 libraries (`rusoto_s3` vs `aws-sdk-rust`)
  - Implement Rust commands in `src-tauri/src/commands/s3.rs`
  - Build UI for S3 configuration
  - Test with photo/video library backup

## Testing Changes

```bash
# Type check
pnpm type-check

# Lint
pnpm lint                 # Frontend
pnpm tauri:lint           # Backend

# Format
pnpm format               # Frontend
pnpm tauri:fmt            # Backend

# Full CI check
pnpm ci:all               # Frontend + Backend + Build

# Run the app
pnpm tauri dev
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
