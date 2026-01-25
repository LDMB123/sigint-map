# PWA Race Condition Fixes

## Summary

Fixed race conditions in PWA initialization that could create duplicate event listeners when `initialize()` is called multiple times (e.g., during hot module reloading or rapid navigation).

## Issues Fixed

### 1. `src/lib/pwa/install-manager.ts`

**Problem:**
- Multiple calls to `initialize()` would create duplicate event listeners
- `setupBeforeInstallPromptListener()`, `setupAppInstalledListener()`, and `setupScrollListener()` returned cleanup functions but they were never stored or called
- No guard to prevent re-initialization

**Solution:**
```typescript
// Added initialization guard
isInitialized: false,

// Track cleanup functions
cleanups: [] as Array<() => void>,

initialize(options?) {
  // Guard against duplicate initialization
  if (this.isInitialized) {
    console.log('[Install] Re-initializing - cleaning up previous listeners');
    this.deinitialize();
  }

  // Store cleanup functions
  const beforeInstallCleanup = this.setupBeforeInstallPromptListener();
  if (beforeInstallCleanup) this.cleanups.push(beforeInstallCleanup);

  const appInstalledCleanup = this.setupAppInstalledListener();
  if (appInstalledCleanup) this.cleanups.push(appInstalledCleanup);

  const scrollCleanup = this.setupScrollListener();
  if (scrollCleanup) this.cleanups.push(scrollCleanup);

  // Mark as initialized
  this.isInitialized = true;
}

// New cleanup method
deinitialize() {
  this.cleanups.forEach((cleanup) => {
    try {
      cleanup();
    } catch (error) {
      console.error('[Install] Error during cleanup:', error);
    }
  });
  this.cleanups = [];
  this.isInitialized = false;
}
```

**Benefits:**
- Safe to call `initialize()` multiple times
- Automatic cleanup of previous listeners
- Prevents memory leaks from duplicate event handlers
- Explicit `deinitialize()` method for manual cleanup

### 2. `src/lib/stores/pwa.ts`

**Problem:**
- Already used `AbortController` for cleanup (good!)
- But lacked explicit initialization guard
- Could potentially create duplicate protocol handler initializations

**Solution:**
```typescript
// Added initialization guard
let isInitialized = false;

async initialize() {
  if (!browser) return;

  // Guard against duplicate initialization
  if (isInitialized) {
    console.log('[PWA] Re-initializing - cleaning up previous listeners');
    this.cleanup();
  }

  // Abort previous initialization
  globalAbortController?.abort();

  // Create new AbortController
  globalAbortController = new AbortController();
  const signal = globalAbortController.signal;

  // ... rest of initialization ...

  // Mark as initialized
  isInitialized = true;

  return () => {
    globalAbortController?.abort();
    globalAbortController = null;
    isInitialized = false;
  };
}

cleanup() {
  globalAbortController?.abort();
  globalAbortController = null;
  isInitialized = false;
}
```

**Benefits:**
- Explicit guard prevents duplicate initialization
- AbortController cleanup remains robust
- `isInitialized` flag resets on cleanup
- Safe for hot module reloading

## Implementation Details

### Idempotent Initialization Pattern

Both modules now follow this pattern:

```typescript
initialize() {
  // 1. Check if already initialized
  if (this.isInitialized) {
    // 2. Cleanup previous state
    this.cleanup();
  }

  // 3. Initialize fresh state
  // ... setup code ...

  // 4. Mark as initialized
  this.isInitialized = true;
}
```

### Cleanup Function Tracking

**install-manager.ts** uses an array pattern:
```typescript
cleanups: Array<() => void>

// Store cleanup functions
cleanups.push(setupBeforeInstallPromptListener());
cleanups.push(setupAppInstalledListener());
cleanups.push(setupScrollListener());

// Execute all cleanups
deinitialize() {
  this.cleanups.forEach(cleanup => cleanup());
  this.cleanups = [];
}
```

**pwa.ts** uses `AbortController` pattern:
```typescript
// Create AbortController
const controller = new AbortController();
const signal = controller.signal;

// All listeners use same signal
window.addEventListener('online', handler, { signal });
window.addEventListener('offline', handler, { signal });

// Single abort cleans up all listeners
cleanup() {
  controller?.abort();
}
```

## Testing

Created comprehensive test suite in `tests/pwa-race-conditions.test.ts`:

### Test Coverage

1. **No Duplicate Listeners**: Verifies multiple `initialize()` calls result in only one set of listeners
2. **Initialization Flag**: Confirms `isInitialized` flag is properly managed
3. **Cleanup Tracking**: Ensures cleanup functions are properly stored and executed
4. **Rapid Re-initialization**: Tests rapid-fire initialization doesn't cause errors
5. **AbortController**: Verifies AbortController properly aborts previous listeners
6. **Integration**: Tests real-world `Promise.allSettled` pattern from `+layout.svelte`

### Running Tests

```bash
npm test tests/pwa-race-conditions.test.ts
```

## Usage Examples

### Safe Re-initialization

```typescript
// First call
installManager.initialize({ timeOnSiteMs: 5000 });

// Second call (e.g., hot reload) - safe!
installManager.initialize({ timeOnSiteMs: 5000 });
// Logs: "[Install] Re-initializing - cleaning up previous listeners"
```

### Manual Cleanup

```typescript
// Initialize
await pwaStore.initialize();

// Later, cleanup manually if needed
pwaStore.cleanup();
```

### Hot Module Reloading Support

```typescript
// In +layout.svelte during development
onMount(() => {
  // Safe to call multiple times during HMR
  pwaStore.initialize();
  installManager.initialize();

  return () => {
    // Optional: cleanup on unmount
    pwaStore.cleanup();
    installManager.deinitialize();
  };
});
```

## Performance Impact

### Before Fix
- Multiple initialization calls → duplicate listeners
- Memory leak from unreleased event handlers
- Potential for multiple event handler executions

### After Fix
- Multiple initialization calls → cleanup + re-initialize
- No memory leaks (proper cleanup)
- Single set of event handlers
- Negligible performance overhead (cleanup is fast)

## Edge Cases Handled

1. **Rapid initialization**: Multiple calls in quick succession
2. **Hot module reloading**: Development server file changes
3. **Navigation-triggered re-initialization**: Router state changes
4. **Concurrent Promise.allSettled**: Multiple async initializations
5. **Cleanup before unmount**: Component lifecycle cleanup

## Breaking Changes

None. All changes are backward compatible:
- `initialize()` maintains same signature
- Added optional `deinitialize()` method
- Existing code continues to work

## Migration Guide

No migration needed. Existing code works as-is:

```typescript
// Old code (still works)
installManager.initialize();
pwaStore.initialize();

// New capability (optional)
installManager.deinitialize(); // Manual cleanup
pwaStore.cleanup();            // Manual cleanup
```

## Verification Checklist

- [x] Multiple `initialize()` calls don't create duplicate listeners
- [x] `isInitialized` flag properly tracks state
- [x] Cleanup functions stored and executed correctly
- [x] AbortController properly aborts previous listeners
- [x] No memory leaks from unreleased handlers
- [x] Hot module reloading works correctly
- [x] Test coverage for race conditions
- [x] Backward compatibility maintained
- [x] Console logging for debugging

## Related Files

- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/pwa/install-manager.ts`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/pwa.ts`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/tests/pwa-race-conditions.test.ts`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/+layout.svelte` (uses both modules)
