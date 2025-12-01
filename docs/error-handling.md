# Error Handling

Eigen uses a comprehensive error handling system with typed errors, circuit breakers, and automatic recovery.

## Error Classes

All errors extend `AppError` in `src/lib/errors.ts`:

```typescript
class AppError extends Error {
  code: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  userMessage: string;
  recoverable: boolean;
}
```

### Specialized Errors

| Class                | Code                 | Use Case                   |
| -------------------- | -------------------- | -------------------------- |
| `NetworkError`       | `NETWORK_ERROR`      | Connection failures        |
| `APIError`           | `API_ERROR_{status}` | HTTP errors from Syncthing |
| `SyncthingError`     | `SYNCTHING_*`        | Syncthing-specific issues  |
| `ValidationError`    | `VALIDATION_ERROR`   | Invalid data/input         |
| `ConfigurationError` | `CONFIG_ERROR`       | Missing/invalid config     |
| `TimeoutError`       | `TIMEOUT_ERROR`      | Operation timeouts         |
| `UnknownError`       | `UNKNOWN_ERROR`      | Catch-all                  |

## Circuit Breaker

Located in `src/lib/retry.ts`, prevents cascade failures when Syncthing is unavailable.

States:

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures, requests fail immediately
- **HALF_OPEN**: Testing if service recovered

The circuit opens after consecutive failures and resets after a cooldown period.

## Health Monitor

`src/lib/health-monitor.ts` tracks service health with periodic checks:

- Registers health checks with intervals
- Tracks consecutive failures
- Notifies listeners of status changes
- Marks checks as critical or non-critical

## Auto Recovery

`src/lib/auto-recovery.ts` automatically recovers from common failures:

- Monitors registered strategies
- Attempts recovery with cooldown periods
- Limited retry attempts per strategy

## Best Practices

1. **Catch at boundaries** - Let errors bubble up to error boundaries
2. **Use typed errors** - Create specific error classes for known failures
3. **Provide user messages** - Every error should have a human-readable message
4. **Mark recoverability** - Indicate if the user can retry
5. **Include context** - Add relevant data for debugging
