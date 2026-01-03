# Eigen Configuration

## Overview

Eigen uses XDG-compliant file-based configuration. All config files are stored in `~/.config/eigen/`.

## File Structure

```
~/.config/eigen/
├── settings.json       # App settings (safe to sync via Syncthing)
├── credentials.json    # API keys and secrets (DO NOT sync)
└── state.json          # Runtime state (ephemeral)
```

---

## settings.json

Main configuration file for Eigen's behavior, UI preferences, and performance settings.

### Schema

```json
{
  "version": "1.0.0",
  "syncthing": {
    "base_url": "http://localhost:8384",
    "api_key": null,
    "auto_start": true,
    "bundled_binary_path": null
  },
  "ui": {
    "theme": "dark",
    "enable_3d_constellation": true,
    "enable_particle_effects": true,
    "enable_notifications": true,
    "compact_mode": false
  },
  "ai": {
    "semantic_search_enabled": true,
    "embedding_model": "all-MiniLM-L6-v2",
    "index_on_startup": false
  },
  "performance": {
    "refresh_interval_ms": 5000,
    "max_cached_files": 10000,
    "enable_file_indexing": true
  }
}
```

### Settings Explained

#### `syncthing` section

- **base_url** (default: "http://localhost:8384")
  - Syncthing Web UI and API base URL
  - Change if running on different port or remote host
  - Examples: `http://localhost:8384`, `http://192.168.1.100:8384`

- **api_key** (default: null)
  - Syncthing API key for authentication
  - Auto-detected from Syncthing's config.xml if not set
  - Can be manually configured for remote instances

- **auto_start** (default: true)
  - Automatically start Syncthing sidecar on app launch
  - Set to false if managing Syncthing separately

- **bundled_binary_path** (default: null)
  - Path to custom Syncthing binary
  - Uses system Syncthing if null

#### `ui` section

- **theme** (default: "dark")
  - Color theme preference
  - Options: "dark", "light", "system"
  - "system" follows OS theme

- **enable_3d_constellation** (default: true)
  - Show 3D network constellation visualization
  - Disable for better performance on low-end systems

- **enable_particle_effects** (default: true)
  - Animated particle effects in UI
  - Disable to reduce GPU usage

- **enable_notifications** (default: true)
  - Desktop notifications for sync events
  - Requires OS notification permissions

- **compact_mode** (default: false)
  - More compact UI layout
  - Useful for smaller screens

#### `ai` section

- **semantic_search_enabled** (default: true)
  - Enable AI-powered semantic file search
  - Requires embedding model to be initialized

- **embedding_model** (default: "all-MiniLM-L6-v2")
  - Embedding model for semantic search
  - Options: "all-MiniLM-L6-v2" (fast), "all-mpnet-base-v2" (better quality)

- **index_on_startup** (default: false)
  - Automatically index files on app startup
  - Set to true for always up-to-date search
  - Can slow down startup

#### `performance` section

- **refresh_interval_ms** (default: 5000)
  - How often to refresh Syncthing status (in milliseconds)
  - Lower = more responsive, higher CPU usage
  - Recommended: 3000-10000

- **max_cached_files** (default: 10000)
  - Maximum files to cache in memory
  - Higher = faster browsing, more RAM usage

- **enable_file_indexing** (default: true)
  - Index files for fast search
  - Disable if not using search features

---

## credentials.json

Stores sensitive API keys and credentials. **Never sync this file!**

### Schema

```json
{
  "version": "1.0.0",
  "syncthing": {
    "api_key": null
  },
  "s3": {
    "access_key_id": null,
    "secret_access_key": null
  }
}
```

### Credentials Explained

- **syncthing.api_key**
  - Syncthing API key for remote instances
  - Auto-detected from config.xml if running locally
  - Required for remote Syncthing connections

- **s3.access_key_id** / **s3.secret_access_key**
  - AWS S3 credentials for S3 backend feature
  - Leave as null if not using S3

---

## state.json

Runtime state tracking. Safe to delete - will be recreated with defaults.

### Schema

```json
{
  "version": "1.0.0",
  "ui": {
    "window_width": 1280,
    "window_height": 720,
    "sidebar_collapsed": false,
    "last_selected_view": "overview"
  },
  "stats": {
    "total_launches": 42,
    "last_launch_timestamp": "2025-12-27T18:00:00.000Z"
  }
}
```

---

## Usage in Code

### React Components

```tsx
import { useSettings, useSyncthingSettings, useUiSettings } from '@/lib/settings';

function MyComponent() {
  const { settings, updateSettings } = useSettings();
  const { syncthingSettings, updateSyncthingSettings } = useSyncthingSettings();
  const { uiSettings, updateUiSettings } = useUiSettings();

  // Update theme
  const toggleTheme = async () => {
    await updateUiSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  // Update Syncthing URL
  const updateSyncthingUrl = async (url: string) => {
    await updateSyncthingSettings((prev) => ({
      ...prev,
      base_url: url,
    }));
  };

  return (
    <div>
      <p>Current theme: {uiSettings?.theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Available Hooks

- **useSettings()** - Access all settings
- **useSyncthingSettings()** - Syncthing-specific settings
- **useUiSettings()** - UI preferences
- **useAiSettings()** - AI configuration
- **usePerformanceSettings()** - Performance options
- **useCredentials()** - API keys and secrets
- **useUiState()** - Window/UI state
- **useStats()** - App statistics

---

## Example Configurations

### Remote Syncthing Instance

```json
{
  "syncthing": {
    "base_url": "http://192.168.1.100:8384",
    "api_key": "your-api-key-here",
    "auto_start": false
  }
}
```

Store the API key in credentials.json:
```json
{
  "syncthing": {
    "api_key": "your-api-key-here"
  }
}
```

### Performance-Focused Setup

```json
{
  "ui": {
    "enable_3d_constellation": false,
    "enable_particle_effects": false
  },
  "performance": {
    "refresh_interval_ms": 10000,
    "max_cached_files": 5000
  }
}
```

### Minimal Resource Usage

```json
{
  "ui": {
    "enable_3d_constellation": false,
    "enable_particle_effects": false,
    "compact_mode": true
  },
  "ai": {
    "semantic_search_enabled": false,
    "index_on_startup": false
  },
  "performance": {
    "refresh_interval_ms": 15000,
    "enable_file_indexing": false
  }
}
```

### Power User Setup

```json
{
  "ui": {
    "theme": "system",
    "enable_3d_constellation": true,
    "enable_particle_effects": true
  },
  "ai": {
    "semantic_search_enabled": true,
    "embedding_model": "all-mpnet-base-v2",
    "index_on_startup": true
  },
  "performance": {
    "refresh_interval_ms": 3000,
    "max_cached_files": 20000
  }
}
```

---

## Syncthing Integration

### What to Sync

✅ **DO sync:**
- `settings.json` - Share preferences across devices

❌ **DO NOT sync:**
- `credentials.json` - API keys are machine-specific
- `state.json` - Runtime state is ephemeral

### .stignore Configuration

Add to your Syncthing `.stignore` file:

```
# Eigen credentials (never sync API keys)
.config/eigen/credentials.json

# Optional: Don't sync ephemeral state
.config/eigen/state.json
```

This allows `settings.json` to sync while keeping secrets local.

---

## Troubleshooting

### Config not loading?

```bash
# Check if config directory exists
ls -la ~/.config/eigen/

# Should see:
# drwxr-xr-x  settings.json
# drwxr-xr-x  credentials.json
# drwxr-xr-x  state.json
```

### Reset to defaults

```bash
# Backup current config
mv ~/.config/eigen ~/.config/eigen.backup

# Restart Eigen - will recreate with defaults
```

### View current config

```bash
# Pretty-print settings
cat ~/.config/eigen/settings.json | jq .

# Check specific value
cat ~/.config/eigen/settings.json | jq '.ui.theme'
```

### Validate JSON syntax

```bash
# Check for syntax errors
jq empty ~/.config/eigen/settings.json && echo "Valid JSON" || echo "Invalid JSON"
```

---

## Default Values Reference

| Setting | Default | Type | Description |
|---------|---------|------|-------------|
| syncthing.base_url | "http://localhost:8384" | string | Syncthing API URL |
| syncthing.auto_start | true | boolean | Auto-start sidecar |
| ui.theme | "dark" | string | Color theme |
| ui.enable_3d_constellation | true | boolean | 3D visualization |
| ui.enable_particle_effects | true | boolean | Particle animations |
| ui.enable_notifications | true | boolean | Desktop notifications |
| ui.compact_mode | false | boolean | Compact layout |
| ai.semantic_search_enabled | true | boolean | AI search |
| ai.embedding_model | "all-MiniLM-L6-v2" | string | Embedding model |
| ai.index_on_startup | false | boolean | Auto-index files |
| performance.refresh_interval_ms | 5000 | number | Status refresh rate |
| performance.max_cached_files | 10000 | number | Cache limit |
| performance.enable_file_indexing | true | boolean | File search index |

---

## Best Practices

1. **Start with defaults** - Don't change settings unless needed
2. **Sync settings.json** - Share config across devices via Syncthing
3. **Never sync credentials** - Add to .stignore immediately
4. **Tune performance** - Adjust refresh_interval_ms based on usage
5. **Disable effects on weak GPUs** - Turn off 3D/particles for better performance
6. **Use system theme** - Set theme to "system" for OS integration

---

## Migration

Eigen is a new application with no legacy storage to migrate from. Config files are created automatically on first launch with sensible defaults.

If you previously used custom Syncthing configuration, you can manually set:
```json
{
  "syncthing": {
    "base_url": "your-previous-url",
    "api_key": "your-previous-key"
  }
}
```

---

## Related Files

- `/home/linuxdesktop/Code/eigen/src-tauri/src/config.rs` - Rust config implementation
- `/home/linuxdesktop/Code/eigen/src/lib/settings.tsx` - React hooks and providers
- `/home/linuxdesktop/Code/eigen/src/components/providers.tsx` - Provider integration
- `~/.config/eigen/` - Config directory

---

## Pattern Source

Based on the standardized config management pattern used across the personal app suite:
- Mutter (Tauri + React)
- Gattai (Node.js daemon)
- Agent-Tracker (Node.js CLI)
- Eigen (Tauri + Next.js) ✨ You are here

See `/home/linuxdesktop/Code/CONFIG_PATTERN_SUMMARY.md` for cross-project comparison.
