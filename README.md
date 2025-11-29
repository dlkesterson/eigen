# Eigen

## Features## Recommended IDE Setup

- 🚀 **Native Performance** - Built with Rust/Tauri for blazing fast performance- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

- 🎨 **Modern UI** - Beautiful glassmorphism design with dark theme
- 📊 **3D Network Visualization** - Interactive network topology using React Three Fiber
- ⚡ **Real-time Updates** - Live sync status with TanStack Query polling
- 🔒 **Secure** - API keys managed internally by Rust backend
- 🎯 **Type-Safe** - End-to-end type safety with TypeScript and Zod

## Tech Stack

### Frontend

- **Next.js 15** - React framework with static export
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Three Fiber** - 3D visualizations
- **Lucide Icons** - Beautiful icons

### Backend

- **Tauri v2** - Rust-based desktop framework
- **Reqwest** - HTTP client for Syncthing API
- **Tokio** - Async runtime
- **Serde** - Serialization/deserialization

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)
- [Rust](https://www.rust-lang.org/tools/install)
- [Syncthing](https://syncthing.net/) installed and accessible in PATH

### Linux Dependencies (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

## Development

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm tauri dev
```

### Build for Production

```bash
pnpm tauri build
```

## Project Structure

```
eigen/
├── src/                      # Next.js frontend
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── network-graph.tsx # 3D network visualization
│   │   ├── folder-list.tsx   # Folder management
│   │   ├── device-list.tsx   # Device management
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   └── store/               # Zustand stores
├── src-tauri/               # Rust backend
│   ├── src/
│   │   └── lib.rs           # Tauri commands
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
└── package.json
```

## Architecture

Eigen follows a "Thin Client" architecture:

1. **Frontend (Next.js SSG)**: Pure UI rendering and visualization
2. **Backend (Rust/Tauri)**: Manages Syncthing process, proxies API requests, handles native features

### Data Flow

```
User Action → React Component → TanStack Query → Tauri IPC → Rust Backend → Syncthing REST API
                                              ↓
User UI ← React Component ← TanStack Query ← Tauri IPC ← Rust Backend ← Syncthing Response
```

## Features

### Dashboard

- Real-time sync status
- Network topology visualization
- Upload/download statistics
- Folder and device overview

### Folders

- View all synced folders
- Pause/resume sync
- Force rescan
- Sync status indicators

### Devices

- Connected device list
- Connection status
- Device information

## License

MIT
