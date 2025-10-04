# FLRTS Logging Policy

## Overview

FLRTS uses environment-aware logging to balance debugging needs with production
cleanliness. Logs are guarded based on `NODE_ENV` to ensure production and test
environments remain quiet while development environments provide full visibility
into system state.

## Logging Levels by Environment

### Production (`NODE_ENV=production`)

- **Suppress:** Init logs, debug info, config details
- **Allow:** Errors, warnings, critical operational events
- **Guards:** `if (process.env.NODE_ENV !== 'production')` wraps non-essential
  logs

### Test (`NODE_ENV=test`)

- **Suppress:** Same as production (keep test output clean)
- **Allow:** Test-specific assertions, error validation
- **Purpose:** Prevent log spam during automated test runs

### Development (default)

- **Allow:** All logs (init, debug, config fallbacks)
- **Purpose:** Developer visibility into system state and configuration
  decisions

## Examples

### Guarded Init Log (Production-Safe)

```typescript
// ERPNextClient constructor (packages/sync-service/src/clients/erpnext.ts:107-109)
} else if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
  console.log('[ERPNextClient] Initialized with live HTTP client:', this.apiUrl);
}
```

**Rationale:** Initialization logs are helpful during development but create
noise in production environments where service startup is routine.

### Guarded Config Fallback (Production-Safe)

```typescript
// getBackendConfig fallback warning (packages/sync-service/src/config.ts:69-75)
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[Config] USE_ERPNEXT=true but ERPNEXT_API_URL, ERPNEXT_API_KEY, or ERPNEXT_API_SECRET missing. ' +
      'Falling back to OpenProject backend. ' +
      'Set all three ERPNEXT_* variables to use ERPNext.'
  );
}
```

**Rationale:** Configuration fallback warnings help developers diagnose
misconfigured environments but should not appear in production logs (where
fallback behavior is intentional) or test logs (where incomplete configs are
expected).

### Unguarded Error (Always Logged)

```typescript
console.error('[ERPNextClient] Failed to create work order:', error);
```

**Rationale:** Errors always indicate actionable problems and should be logged
regardless of environment. No guard needed.

## Future Enhancements

### Debug Module

Replace guarded `console.log` calls with `debug` module for granular control:

```typescript
import debug from 'debug';
const log = debug('flrts:erpnext');

log('Initialized stub client'); // Enabled via DEBUG=flrts:* env var
```

### Structured Logging

Migrate to structured JSON logs for production log aggregation:

```typescript
logger.info({ event: 'client_init', backend: 'erpnext', mode: 'stub' });
```

### Log Levels

Introduce configurable log levels (debug/info/warn/error) with threshold
filtering.

## Testing

### Unit Tests

Run `npm run test:unit` with `NODE_ENV=test` to verify logs remain suppressed:

```bash
NODE_ENV=test npm run test:unit
# Expected: No init/config logs in output
# Expected: Test assertions and error validation logs only
```

### Production Simulation

Run application with `NODE_ENV=production` to verify only errors are visible:

```bash
NODE_ENV=production npm start
# Expected: No init/debug/config logs
# Expected: Only error logs appear
```

### Development Mode

Run application without `NODE_ENV` or with `NODE_ENV=development`:

```bash
npm start
# Expected: Full logging (init, config, debug, errors)
```

## Related Files

- `packages/sync-service/src/clients/erpnext.ts:107-109` - ERPNextClient init
  log guard
- `packages/sync-service/src/config.ts:69-75` - getBackendConfig fallback
  warning guard
- `docs/architecture/README.md` - Architecture documentation index
- `docs/architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md` - ERPNext
  migration context

## Implementation History

- **10N-247:** Added production logging guards to erpnext.ts and config.ts
- **10N-250:** Created this logging policy document
