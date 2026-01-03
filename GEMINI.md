# Eigen Project Context

## Project Overview

**Eigen** is a modern, AI-powered desktop client for Syncthing, built with **Tauri v2**, **Next.js 16**, and **Rust**. It aims to provide a beautiful, user-friendly interface for Syncthing while adding advanced features like 3D network visualization, semantic search, and predictive sync.

### Key Features
*   **Constellation Dashboard:** 3D WebGL network visualization.
*   **Core Management:** Full control over Syncthing (folders, devices, settings).
*   **AI Integration:** Semantic file search and smart conflict resolution using client-side embeddings.
*   **Reliability:** Auto-recovery, circuit breakers, and extensive health monitoring.

## Tech Stack

### Frontend
*   **Framework:** Next.js 16 (React 19)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS 4, Framer Motion
*   **3D Graphics:** React Three Fiber, Three.js
*   **State Management:** Zustand, TanStack Query
*   **AI:** @xenova/transformers (Web Workers)
*   **Storage:** IndexedDB (idb)

### Backend
*   **Framework:** Tauri v2 (Rust)
*   **HTTP Client:** Reqwest
*   **Async Runtime:** Tokio

## Architecture

Eigen follows a **Thin Client** architecture:

1.  **Frontend:** React components handle UI and logic, communicating with the backend via Tauri IPC.
2.  **Backend (Rust):** Manages the Syncthing sidecar process, handles API keys securely, and proxies requests to the Syncthing REST API.
3.  **Syncthing Sidecar:** The actual file synchronization engine running as a child process.

**Data Flow:**
UI -> React Query -> Tauri IPC -> Rust Backend -> Syncthing API

## Development Workflow

### Prerequisites
*   Node.js (v18+)
*   pnpm (v8+)
*   Rust (latest stable)

### Key Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Install Dependencies** | `pnpm install` | Install Node.js dependencies |
| **Setup Sidecar** | `pnpm download:syncthing` | **CRITICAL:** Download Syncthing binary before running |
| **Run Dev Server** | `pnpm tauri dev` | Starts Next.js and Tauri in development mode |
| **Build Production** | `pnpm tauri build` | Builds the final desktop application |
| **Lint & Format** | `pnpm check` | Runs ESLint, Prettier, and TypeScript checks |
| **Rust Checks** | `pnpm tauri:check` | Runs `cargo check` on backend code |

## Coding Conventions

### Tauri Commands
*   **Single Source of Truth:** NEVER use raw `invoke('command_name')`.
*   **Registry:** ALWAYS use the typed wrappers in `src/lib/tauri-commands.ts`.
*   **Adding Commands:**
    1.  Define in Rust (`src-tauri/src/commands/`).
    2.  Register in Rust (`src-tauri/src/lib.rs`).
    3.  Add typed wrapper in `src/lib/tauri-commands.ts`.

### Project Structure
*   `src/`: Next.js frontend source.
*   `src/components/`: React components (UI, features).
*   `src/hooks/`: Custom hooks (especially for Syncthing API).
*   `src/lib/`: Utilities and the critical `tauri-commands.ts`.
*   `src-tauri/`: Rust backend source.
*   `src-tauri/tauri.conf.json`: Main Tauri configuration.

### Style & Quality
*   **Strictness:** TypeScript `strict` mode is enabled.
*   **Formatting:** Prettier is used for all files.
*   **Linting:** ESLint and Clippy (Rust) are enforced.
