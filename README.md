# Eigen

> A modern, AI-powered desktop client for Syncthing built with Tauri v2, Vite 7, React 19, and Rust.

![Eigen Demo](docs/demo.gif)

## ✨ Features

### Constellation Dashboard

- 🌌 **3D Network Visualization** - Interactive WebGL-powered constellation view of your Syncthing network
- 🔮 **Device Orbs** - Each device rendered as a glowing orb with unique visual presets based on state
- ⚡ **Connection Wires** - Animated connection lines showing active sync relationships
- ✨ **Particle Flow** - Real-time particle animations during data transfer between devices
- 🌟 **Request Beacon** - Pulsing golden beacon alerts you to pending device/folder requests
- 🎮 **Orbital Camera** - Auto-rotating camera with zoom and pan controls
- 📊 **HUD Overlays** - Real-time stats panels showing status, devices, and transfer rates

### Core Syncthing Management

- 🔄 **Full Syncthing Control** - Start, stop, restart Syncthing with bundled sidecar support
- 📁 **Folder Management** - Add, configure, pause/resume sync folders
- 💻 **Device Management** - Add devices, configure sharing, monitor connections
- 📊 **Real-time Stats** - Live sync status, transfer rates, uptime, and connection info

### AI-Powered Features

- 🧠 **Semantic File Search** - Natural language file search using transformers.js embeddings
- 📝 **Smart Conflict Resolution** - AI-assisted diff analysis for sync conflicts
- 🔮 **Predictive Sync** - Learn access patterns and pre-sync frequently used folders
- 🗂️ **File Indexing** - Index files to IndexedDB with AI embeddings for fast semantic search

### File Management

- 📂 **File Browser** - Browse synced folders with version history
- ⏰ **Version Timeline** - Visual timeline of file versions with restore capability
- 🔙 **Version Restore** - One-click restore of previous file versions
- 🚫 **Ignore Patterns** - Easy-to-use ignore pattern editor with common presets

### Device Sharing & Pairing

- 📱 **QR Code Invites** - Generate QR codes for easy device pairing
- 🔔 **Pending Request Handling** - Accept or dismiss incoming device and folder share requests directly from the dashboard
- 🔗 **Deep Links** - `eigen://invite` deep link protocol for one-click device addition
- 📋 **Shareable Links** - Copy invite links with optional expiration
- 📥 **Folder Share Requests** - Browse and select local paths when accepting shared folders

### Reliability & Monitoring

- ❤️ **Health Monitoring** - Continuous health checks with status tracking
- 🔄 **Auto Recovery** - Automatic recovery from common failure scenarios
- 🔌 **Circuit Breaker** - Prevent cascade failures with intelligent retry logic
- 📜 **Log Viewer** - Real-time Syncthing logs with filtering and export
- 🔔 **Native Notifications** - OS-level notifications for sync events

### User Experience

- 🎨 **Modern UI** - Beautiful glassmorphism design with smooth animations
- 🌙 **Theme Support** - Light, dark, and system theme options
- ⚡ **Fluid Animations** - Framer Motion powered transitions
- 📱 **Responsive Design** - Adapts to different window sizes
- ⌨️ **Keyboard Navigation** - Full keyboard support for search results

## 🛠️ Tech Stack

### Frontend

| Technology            | Purpose                           |
| --------------------- | --------------------------------- |
| **Vite 7**            | Fast build tool and dev server    |
| **React 19**          | UI library with latest features   |
| **Tailwind CSS 4**    | Utility-first styling             |
| **React Three Fiber** | 3D constellation dashboard        |
| **Three.js**          | WebGL rendering engine            |
| **TanStack Query**    | Server state management & caching |
| **Zustand**           | Client state management           |
| **Framer Motion**     | Smooth animations                 |
| **Lucide Icons**      | Beautiful iconography             |
| **Sonner**            | Toast notifications               |
| **Zod**               | Runtime type validation           |

### Backend

| Technology   | Purpose                       |
| ------------ | ----------------------------- |
| **Tauri v2** | Rust-based desktop framework  |
| **Reqwest**  | HTTP client for Syncthing API |
| **Tokio**    | Async runtime                 |
| **Serde**    | Serialization/deserialization |

### AI & Data

| Technology               | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| **@xenova/transformers** | Client-side ML embeddings                |
| **IndexedDB (idb)**      | Local file metadata & embeddings storage |
| **Web Workers**          | Background AI processing                 |

### Tauri Plugins

- `@tauri-apps/plugin-notification` - Native OS notifications
- `@tauri-apps/plugin-dialog` - Native file dialogs
- `@tauri-apps/plugin-shell` - Syncthing sidecar management
- `@tauri-apps/plugin-deep-link` - `eigen://` URL protocol
- `@tauri-apps/plugin-opener` - Open files/folders in system apps

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)

### Linux Dependencies (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

## 🚀 Getting Started

### Install Dependencies

```bash
pnpm install
```

### Download Bundled Syncthing

```bash
pnpm download:syncthing
```

### Run Development Server

```bash
pnpm tauri dev
```

### Build for Production

```bash
pnpm tauri build
```

## 📁 Project Structure

```
eigen/
├── src/                          # Vite + React frontend
│   ├── main.tsx                  # Application entry point
│   ├── App.tsx                   # Root application component
│   ├── components/               # React components
│   │   ├── ui/                   # Reusable UI components (button, card, etc.)
│   │   ├── ai-search-bar.tsx     # AI-powered semantic search
│   │   ├── file-browser.tsx      # Folder file browser with versions
│   │   ├── file-indexer.tsx      # AI file indexing component
│   │   ├── network-graph.tsx     # Network topology visualization
│   │   ├── smart-conflict-resolver.tsx  # AI conflict resolution
│   │   ├── version-timeline.tsx  # File version history timeline
│   │   ├── folder-list.tsx       # Sync folder management
│   │   ├── device-list.tsx       # Device management
│   │   ├── share-device-dialog.tsx  # QR code & link sharing
│   │   ├── add-device-dialog.tsx    # Add device with QR code display
│   │   ├── pending-requests-banner.tsx  # Pending request notification banner
│   │   ├── pending-requests-dialog.tsx  # Accept/dismiss pending requests
│   │   ├── ignore-patterns-dialog.tsx  # Ignore pattern editor
│   │   ├── log-viewer.tsx        # System log viewer
│   │   ├── settings-page.tsx     # App settings
│   │   └── ...
│   ├── hooks/                    # Custom React hooks
│   │   ├── syncthing/            # Modular Syncthing API hooks
│   │   │   ├── core.ts           # Lifecycle hooks (start/stop/status)
│   │   │   ├── folders.ts        # Folder management hooks
│   │   │   ├── devices.ts        # Device management hooks
│   │   │   ├── pending.ts        # Pending device/folder request hooks
│   │   │   └── schemas.ts        # Zod validation schemas
│   │   ├── useAISearch.ts        # AI search functionality
│   │   ├── useDeviceInvite.ts    # Device invitation & QR codes
│   │   ├── usePredictiveSync.ts  # Predictive sync patterns
│   │   └── useNotifications.ts   # Native notifications
│   ├── lib/                      # Utility libraries
│   │   ├── tauri-commands.ts     # ⚠️ TYPED TAURI COMMAND REGISTRY
│   │   ├── auto-recovery.ts      # Automatic failure recovery
│   │   ├── db.ts                 # IndexedDB operations
│   │   ├── errors.ts             # Typed error classes
│   │   ├── health-monitor.ts     # System health checks
│   │   ├── predictive-sync.ts    # Access pattern learning
│   │   └── retry.ts              # Retry logic & circuit breaker
│   ├── store/                    # Zustand state stores
│   └── workers/                  # Web Workers
│       └── ai.worker.ts          # AI embedding generation
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands/             # Modular Tauri command handlers
│   │   │   ├── mod.rs            # Module exports
│   │   │   ├── system.rs         # System lifecycle (start/stop/status)
│   │   │   ├── config.rs         # Configuration management
│   │   │   ├── folders.rs        # Folder operations
│   │   │   ├── devices.rs        # Device operations
│   │   │   ├── files.rs          # File operations
│   │   │   ├── events.rs         # Event polling
│   │   │   └── pending.rs        # Pending request handling
│   │   ├── lib.rs                # Library entry point & command registration
│   │   └── main.rs               # Application entry
│   ├── binaries/                 # Bundled Syncthing binary
│   ├── capabilities/             # Tauri security capabilities
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── scripts/
│   └── download-syncthing.js     # Syncthing download script
├── AGENTS.md                     # AI assistant instructions
├── .github/
│   └── copilot-instructions.md   # GitHub Copilot instructions
└── package.json
```

### Tauri Command Registry

The file `src/lib/tauri-commands.ts` serves as the **single source of truth** for all frontend-to-backend communication. This prevents command name mismatches between TypeScript and Rust code.

```typescript
// ❌ Don't use raw invoke() with string literals
await invoke('start_syncthing'); // Error-prone!

// ✅ Use typed command functions
import { startSyncthingSidecar } from '@/lib/tauri-commands';
await startSyncthingSidecar(); // Type-safe, documented, autocomplete
```

See [AGENTS.md](AGENTS.md) for detailed guidance on adding new commands.

## 🏗️ Architecture

Eigen follows a **Thin Client** architecture with clear separation of concerns:

### Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Eigen Desktop App                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Frontend (Vite + React)                 │    │
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

### Data Flow

```
User Action → React Component → TanStack Query → Tauri IPC → Rust Backend → Syncthing REST API
                                              ↓
User UI ← React Component ← TanStack Query ← Tauri IPC ← Rust Backend ← Syncthing Response
```

### Key Design Decisions

1. **Bundled Syncthing** - Ships with its own Syncthing binary for zero-config setup
2. **Secure API Key Management** - API keys never exposed to frontend; managed by Rust backend
3. **Client-Side AI** - Embeddings generated in Web Workers for privacy and offline support
4. **IndexedDB Storage** - File metadata and AI embeddings stored locally for fast search
5. **Circuit Breaker Pattern** - Prevents cascade failures with intelligent retry and recovery

## 🔧 Available Scripts

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `pnpm dev`                | Start Vite dev server                  |
| `pnpm tauri dev`          | Start full Tauri development mode      |
| `pnpm build`              | Build frontend for production          |
| `pnpm tauri build`        | Build complete desktop application     |
| `pnpm lint`               | Run ESLint                             |
| `pnpm format`             | Format code with Prettier              |
| `pnpm type-check`         | Run TypeScript type checking           |
| `pnpm download:syncthing` | Download Syncthing binary for bundling |
| `pnpm tauri:lint`         | Run Clippy on Rust code                |
| `pnpm tauri:fmt`          | Format Rust code                       |

## � Releases

Pre-built binaries are available for Windows, macOS, and Linux on the [Releases page](https://github.com/dlkesterson/eigen/releases).

### Creating a Release

To create a new release with cross-platform builds:

```bash
# Tag the release
git tag v0.1.0

# Push the tag to trigger the release workflow
git push origin v0.1.0
```

The GitHub Actions workflow will automatically:

1. Build for Windows (x64), macOS (x64 + ARM64), and Linux (x64)
2. Download the appropriate Syncthing binary for each platform
3. Create a GitHub release with all artifacts

### Available Artifacts

| Platform              | File                         | Description    |
| --------------------- | ---------------------------- | -------------- |
| Windows               | `Eigen_x.x.x_x64-setup.exe`  | NSIS installer |
| Windows               | `Eigen_x.x.x_x64_en-US.msi`  | MSI installer  |
| macOS (Intel)         | `Eigen_x.x.x_x64.dmg`        | DMG disk image |
| macOS (Apple Silicon) | `Eigen_x.x.x_aarch64.dmg`    | DMG disk image |
| Linux                 | `eigen_x.x.x_amd64.deb`      | Debian package |
| Linux                 | `eigen_x.x.x_amd64.AppImage` | AppImage       |

## �🔒 Security

- **API Keys** - Syncthing API keys are managed internally by the Rust backend and never exposed to the frontend
- **Local Processing** - AI embeddings are generated entirely client-side; no data sent to external services
- **Deep Link Validation** - Invite URLs include expiration and are validated before use
- **CSP Configured** - Content Security Policy configured for Tauri context

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License

MIT
