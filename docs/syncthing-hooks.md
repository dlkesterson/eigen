# Syncthing Hooks

The `src/hooks/syncthing/` directory contains modular React hooks for interacting with Syncthing via Tauri commands.

## Module Organization

| File           | Purpose                                               |
| -------------- | ----------------------------------------------------- |
| `core.ts`      | System status, config, lifecycle (start/stop/restart) |
| `folders.ts`   | Folder CRUD, pause/resume, rescan, sharing            |
| `devices.ts`   | Device CRUD, pause/resume, configuration              |
| `events.ts`    | Real-time event polling via long-polling              |
| `conflicts.ts` | Sync conflict detection and resolution                |
| `versions.ts`  | File version browsing and restoration                 |
| `logs.ts`      | System log retrieval                                  |
| `options.ts`   | Global Syncthing options                              |
| `schemas.ts`   | Zod validation schemas                                |
| `types.ts`     | TypeScript type definitions                           |
| `index.ts`     | Re-exports all public APIs                            |

## Query Keys

Hooks use consistent query keys for TanStack Query caching:

```typescript
['systemStatus']['config']['connections'][('folderStatus', folderId)][('deviceConfig', deviceId)][ // System status // Full configuration // Active connections // Per-folder status // Per-device config
  ('conflicts', folderPath)
][('versions', folderPath)]; // Conflict files // File versions
```

## Optimistic Updates

Mutation hooks use optimistic updates for responsive UI:

```typescript
onMutate: async (folderId) => {
  await queryClient.cancelQueries({ queryKey: ['config'] });
  const previousConfig = queryClient.getQueryData(['config']);

  queryClient.setQueryData(['config'], (old) => {
    // Apply optimistic update
  });

  return { previousConfig };
},
onError: (err, vars, context) => {
  // Rollback on error
  queryClient.setQueryData(['config'], context.previousConfig);
},
```

## Event Polling

`useSyncthingEvents` implements long-polling for real-time updates:

- Polls `/rest/events` with a 30-second timeout
- Automatically invalidates relevant queries on events
- Handles reconnection gracefully

## Usage

```typescript
import {
  useSystemStatus,
  useConfig,
  useFolderStatus,
  useStartSyncthing,
} from '@/hooks/syncthing';

function MyComponent() {
  const { data: status } = useSystemStatus();
  const startMutation = useStartSyncthing();

  return (
    <button onClick={() => startMutation.mutate()}>
      Start
    </button>
  );
}
```
