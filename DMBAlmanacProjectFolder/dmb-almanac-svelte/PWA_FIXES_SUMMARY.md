# PWA Race Condition Fixes - Summary

## Quick Overview

Fixed race conditions in PWA initialization to prevent duplicate event listeners when `initialize()` is called multiple times.

## Changes Made

### File 1: `src/lib/pwa/install-manager.ts`

#### Before
```typescript
export const installManager = {
  deferredPrompt: null,
  listeners: new Set(),
  state: { ... },
  timeOnSiteMs: DEFAULT_TIME_ON_SITE_MS,
  siteEnteredTime: Date.now(),

  initialize(options) {
    if (!browser) return;

    this.timeOnSiteMs = options?.timeOnSiteMs || DEFAULT_TIME_ON_SITE_MS;
    this.updateInstallStatus();

    // ❌ Returns cleanup function but never stored
    this.setupBeforeInstallPromptListener();
    this.setupAppInstalledListener();
    this.setupScrollListener();

    // ❌ No guard against duplicate initialization

    this.updateDismissalStatus(options?.dismissDurationMs);
    console.log('[Install] Manager initialized', this.state);
  },

  // ❌ setupBeforeInstallPromptListener returns cleanup but it's never called
};
```

#### After
```typescript
export const installManager = {
  deferredPrompt: null,
  listeners: new Set(),
  state: { ... },
  timeOnSiteMs: DEFAULT_TIME_ON_SITE_MS,
  siteEnteredTime: Date.now(),

  // ✅ Added initialization guard
  isInitialized: false,
  // ✅ Track cleanup functions
  cleanups: [] as Array<() => void>,

  initialize(options) {
    if (!browser) return;

    // ✅ Guard against duplicate initialization
    if (this.isInitialized) {
      console.log('[Install] Re-initializing - cleaning up previous listeners');
      this.deinitialize();
    }

    this.timeOnSiteMs = options?.timeOnSiteMs || DEFAULT_TIME_ON_SITE_MS;
    this.updateInstallStatus();

    // ✅ Store cleanup functions
    const beforeInstallCleanup = this.setupBeforeInstallPromptListener();
    if (beforeInstallCleanup) this.cleanups.push(beforeInstallCleanup);

    const appInstalledCleanup = this.setupAppInstalledListener();
    if (appInstalledCleanup) this.cleanups.push(appInstalledCleanup);

    const scrollCleanup = this.setupScrollListener();
    if (scrollCleanup) this.cleanups.push(scrollCleanup);

    this.updateDismissalStatus(options?.dismissDurationMs);

    // ✅ Mark as initialized
    this.isInitialized = true;

    console.log('[Install] Manager initialized', this.state);
  },

  // ✅ New cleanup method
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
    console.log('[Install] Manager deinitialized');
  },
};
```

### File 2: `src/lib/stores/pwa.ts`

#### Before
```typescript
// AbortController for centralized cleanup of all listeners
let globalAbortController: AbortController | null = null;
// ❌ No initialization guard

export const pwaStore = {
  async initialize() {
    if (!browser) return;
    // ❌ No check if already initialized

    // Abort any previous initialization first
    globalAbortController?.abort();

    globalAbortController = new AbortController();
    const signal = globalAbortController.signal;

    // ... setup code ...

    return () => {
      globalAbortController?.abort();
      globalAbortController = null;
      // ❌ No flag reset
    };
  },

  cleanup() {
    globalAbortController?.abort();
    globalAbortController = null;
    // ❌ No flag reset
  },
};
```

#### After
```typescript
// AbortController for centralized cleanup of all listeners
let globalAbortController: AbortController | null = null;

// ✅ Added initialization guard
let isInitialized = false;

export const pwaStore = {
  async initialize() {
    if (!browser) return;

    // ✅ Guard against duplicate initialization
    if (isInitialized) {
      console.log('[PWA] Re-initializing - cleaning up previous listeners');
      this.cleanup();
    }

    // Abort any previous initialization first
    globalAbortController?.abort();

    globalAbortController = new AbortController();
    const signal = globalAbortController.signal;

    // ... setup code ...

    // ✅ Mark as initialized
    isInitialized = true;

    return () => {
      globalAbortController?.abort();
      globalAbortController = null;
      isInitialized = false; // ✅ Reset flag
    };
  },

  cleanup() {
    globalAbortController?.abort();
    globalAbortController = null;
    isInitialized = false; // ✅ Reset flag
  },
};
```

## What This Fixes

### Problem Scenario
```typescript
// In +layout.svelte during hot reload or navigation
onMount(() => {
  // First call
  pwaStore.initialize();      // Creates listeners
  installManager.initialize(); // Creates listeners

  // Hot reload triggers second call
  pwaStore.initialize();      // ❌ BEFORE: Creates duplicate listeners
  installManager.initialize(); // ❌ BEFORE: Creates duplicate listeners
});
```

### After Fix
```typescript
// Same scenario
onMount(() => {
  // First call
  pwaStore.initialize();      // Creates listeners
  installManager.initialize(); // Creates listeners

  // Hot reload triggers second call
  pwaStore.initialize();      // ✅ AFTER: Cleans up old, creates new (no duplicates)
  installManager.initialize(); // ✅ AFTER: Cleans up old, creates new (no duplicates)
});
```

## Key Improvements

1. **Initialization Guard**
   - Added `isInitialized` flag to both modules
   - Prevents duplicate setup on multiple calls

2. **Cleanup Function Tracking** (install-manager.ts)
   - Store all cleanup functions in `cleanups` array
   - Call all cleanups in `deinitialize()` method

3. **Idempotent Initialization**
   - Both modules can now be safely called multiple times
   - Automatic cleanup of previous state before re-initialization

4. **Better Logging**
   - Added console logs when re-initializing
   - Helps debug initialization flow

## Testing

Created test suite: `tests/pwa-race-conditions.test.ts`

```bash
npm test tests/pwa-race-conditions.test.ts
```

Tests cover:
- No duplicate listeners on multiple `initialize()` calls
- Proper `isInitialized` flag management
- Cleanup function execution
- Rapid re-initialization handling
- Integration with `Promise.allSettled` pattern

## Files Modified

1. `/src/lib/pwa/install-manager.ts` - Added guard, cleanup tracking
2. `/src/lib/stores/pwa.ts` - Added guard, flag reset
3. `/tests/pwa-race-conditions.test.ts` - New test suite (created)
4. `PWA_RACE_CONDITION_FIXES.md` - Detailed documentation (created)
5. `PWA_FIXES_SUMMARY.md` - This quick summary (created)

## Verification

```bash
# Type check
npm run check

# Run tests
npm test tests/pwa-race-conditions.test.ts

# Test in dev mode (triggers HMR)
npm run dev
# Make changes to trigger hot reload - no duplicate listeners!
```

## No Breaking Changes

All changes are backward compatible:
- Same function signatures
- Same behavior on first call
- Additional safety on subsequent calls
- New optional cleanup methods
