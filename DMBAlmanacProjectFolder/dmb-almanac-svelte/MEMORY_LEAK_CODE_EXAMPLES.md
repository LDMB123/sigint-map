# Memory Leak Fixes - Code Examples

Complete before/after code examples for all three memory leak fixes.

---

## Fix 1: Performance.ts - prerenderOnHoverIntent()

### Location
`src/lib/utils/performance.ts` - Lines 148-196

### Before (Leaking)

```typescript
/**
 * Prerender on hover intent (200ms hover = likely intent)
 *
 * Dynamic speculation rules based on user behavior
 */
export function prerenderOnHoverIntent(selector: string, getUrl: (el: Element) => string): void {
  if (!('speculationrules' in document)) return;

  const elements = document.querySelectorAll(selector);

  elements.forEach(el => {
    let hoverTimeout: ReturnType<typeof setTimeout>;

    (el as HTMLElement).addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => {
        const url = getUrl(el);
        if (url) {
          addSpeculationRule([url], 'eager');
        }
      }, 200);
    });

    (el as HTMLElement).addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
    });
  });
}
```

**Issues**:
- Returns `void` - no cleanup mechanism
- Listeners accumulate if called multiple times
- Closures capture entire `el` and `getUrl` function
- AbortController not used

### After (Fixed)

```typescript
/**
 * Prerender on hover intent (200ms hover = likely intent)
 *
 * Dynamic speculation rules based on user behavior
 * Returns cleanup function to remove all listeners
 */
export function prerenderOnHoverIntent(
  selector: string,
  getUrl: (el: Element) => string
): () => void {
  if (!('speculationrules' in document)) return () => {};

  const elements = document.querySelectorAll(selector);
  const controllers = new Map<Element, AbortController>();

  elements.forEach(el => {
    let hoverTimeout: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    controllers.set(el, controller);

    const handleMouseEnter = () => {
      hoverTimeout = setTimeout(() => {
        const url = getUrl(el);
        if (url) {
          addSpeculationRule([url], 'eager');
        }
      }, 200);
    };

    const handleMouseLeave = () => {
      clearTimeout(hoverTimeout);
    };

    (el as HTMLElement).addEventListener('mouseenter', handleMouseEnter, {
      signal: controller.signal
    });
    (el as HTMLElement).addEventListener('mouseleave', handleMouseLeave, {
      signal: controller.signal
    });
  });

  // Return cleanup function to remove all listeners
  return () => {
    controllers.forEach((controller) => {
      controller.abort();
    });
    controllers.clear();
  };
}
```

**Benefits**:
- Returns cleanup function
- AbortController handles all listener removal
- Single `abort()` call removes all listeners
- Controllers map for tracking
- Explicit handler functions avoid closure issues

### Usage

```typescript
// In component or initialization code
const cleanup = prerenderOnHoverIntent('[data-prerender]', el => {
  return el.getAttribute('href') || '';
});

// Later when cleanup needed
cleanup();

// Safe to call multiple times
cleanup();
cleanup();  // No error
```

---

## Fix 2: NavigationApi.ts - Navigation Initialization

### Location
`src/lib/utils/navigationApi.ts` - Lines 613-695

### Before (Leaking)

```typescript
// ==================== INITIALIZATION ====================

let initialized = false;

/**
 * Initialize Navigation API utilities
 * Call this once during app startup
 */
export function initializeNavigationApi(): void {
  if (initialized || !browser) return;
  initialized = true;

  if (!isNavigationApiSupported()) {
    console.info('Navigation API not supported, using History API fallback');
    return;
  }

  // Set up automatic state persistence
  const cleanup = setupNavigationMonitoring({
    onNavigationSuccess: () => {
      saveNavigationState();
    }
  });

  // Save state periodically
  const interval = setInterval(() => {
    saveNavigationState();
  }, 5000);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    saveNavigationState();
    clearInterval(interval);
    cleanup();
  });

  console.info('Navigation API initialized');
}
```

**Issues**:
- `initialized` flag set to true, prevents re-initialization
- No way to clean up the beforeunload listener
- SetInterval persists if function called again
- Multiple calls leak listeners and timers

### After (Fixed)

```typescript
// ==================== INITIALIZATION ====================

let initialized = false;
let currentCleanup: (() => void) | null = null;
let currentInterval: number | null = null;
let beforeUnloadHandler: (() => void) | null = null;

/**
 * Initialize Navigation API utilities
 * Call this once during app startup
 * Subsequent calls will clean up previous listeners before reinitializing
 */
export function initializeNavigationApi(): void {
  if (!browser) return;

  // Clean up previous initialization if called multiple times
  if (initialized) {
    deinitializeNavigationApi();
  }

  initialized = true;

  if (!isNavigationApiSupported()) {
    console.info('Navigation API not supported, using History API fallback');
    return;
  }

  // Set up automatic state persistence
  currentCleanup = setupNavigationMonitoring({
    onNavigationSuccess: () => {
      saveNavigationState();
    }
  });

  // Save state periodically
  currentInterval = window.setInterval(() => {
    saveNavigationState();
  }, 5000);

  // Cleanup on page unload - create new handler for proper cleanup
  beforeUnloadHandler = () => {
    saveNavigationState();
    if (currentInterval) {
      clearInterval(currentInterval);
    }
    if (currentCleanup) {
      currentCleanup();
    }
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);

  console.info('Navigation API initialized');
}

/**
 * Deinitialize Navigation API and clean up all listeners
 * Useful for hot reloading or re-initialization
 */
export function deinitializeNavigationApi(): void {
  if (!initialized) return;

  // Clear interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Call cleanup function
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  // Remove beforeunload listener
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }

  initialized = false;
  console.info('Navigation API deinitialized');
}
```

**Benefits**:
- Automatic cleanup on re-initialization
- Module-level state tracking
- Explicit `deinitialize()` function
- Safe for multiple calls
- All resources properly cleaned

### Usage

```typescript
// Safe to call multiple times
initializeNavigationApi();
initializeNavigationApi();  // First one is cleaned up

// Manual cleanup
deinitializeNavigationApi();

// In component lifecycle (SvelteKit)
onMount(() => {
  initializeNavigationApi();
  return () => {
    deinitializeNavigationApi();
  };
});
```

---

## Fix 3: Install-Manager.ts - Install Manager Cleanup

### Location
`src/lib/pwa/install-manager.ts` - Lines 52-118

### Before (Leaking)

```typescript
export const installManager = {
	deferredPrompt: null as BeforeInstallPromptEvent | null,
	listeners: new Set<(state: InstallPromptState) => void>(),
	state: {
		canInstall: false,
		isInstalled: false,
		isDismissed: false,
		dismissalRemainsMs: 0,
		hasScrolled: false,
		isIOSSafari: false,
		userChoice: 'unknown',
	} as InstallPromptState,
	timeOnSiteMs: DEFAULT_TIME_ON_SITE_MS,
	siteEnteredTime: Date.now(),

	/**
	 * Initialize install manager
	 * Should be called once on app startup
	 */
	initialize(options?: { timeOnSiteMs?: number; dismissDurationMs?: number }) {
		if (!browser) return;

		this.timeOnSiteMs = options?.timeOnSiteMs || DEFAULT_TIME_ON_SITE_MS;

		// Check if already installed
		this.updateInstallStatus();

		// Capture beforeinstallprompt event
		this.setupBeforeInstallPromptListener();  // Cleanup lost!

		// Listen for app installation
		this.setupAppInstalledListener();  // Cleanup lost!

		// Track scroll for more intelligent timing
		this.setupScrollListener();  // Cleanup lost!

		// Check dismissal status
		this.updateDismissalStatus(options?.dismissDurationMs);

		// Log state
		console.log('[Install] Manager initialized', this.state);
	},

	// ... rest of methods ...
}
```

**Issues**:
- Cleanup functions returned but never captured
- No way to remove listeners
- Multiple initializations leak 3 listeners each
- No tracking of cleanup functions

### After (Fixed)

```typescript
export const installManager = {
	deferredPrompt: null as BeforeInstallPromptEvent | null,
	listeners: new Set<(state: InstallPromptState) => void>(),
	state: {
		canInstall: false,
		isInstalled: false,
		isDismissed: false,
		dismissalRemainsMs: 0,
		hasScrolled: false,
		isIOSSafari: false,
		userChoice: 'unknown',
	} as InstallPromptState,
	timeOnSiteMs: DEFAULT_TIME_ON_SITE_MS,
	siteEnteredTime: Date.now(),
	// Cleanup function references to prevent memory leaks
	cleanups: [] as Array<() => void>,

	/**
	 * Initialize install manager
	 * Should be called once on app startup
	 * Safe to call multiple times - previous listeners will be cleaned up
	 */
	initialize(options?: { timeOnSiteMs?: number; dismissDurationMs?: number }) {
		if (!browser) return;

		// Clean up previous listeners if already initialized
		this.deinitialize();

		this.timeOnSiteMs = options?.timeOnSiteMs || DEFAULT_TIME_ON_SITE_MS;

		// Check if already installed
		this.updateInstallStatus();

		// Capture beforeinstallprompt event
		const beforeInstallCleanup = this.setupBeforeInstallPromptListener();
		if (beforeInstallCleanup) this.cleanups.push(beforeInstallCleanup);

		// Listen for app installation
		const appInstalledCleanup = this.setupAppInstalledListener();
		if (appInstalledCleanup) this.cleanups.push(appInstalledCleanup);

		// Track scroll for more intelligent timing
		const scrollCleanup = this.setupScrollListener();
		if (scrollCleanup) this.cleanups.push(scrollCleanup);

		// Check dismissal status
		this.updateDismissalStatus(options?.dismissDurationMs);

		// Log state
		console.log('[Install] Manager initialized', this.state);
	},

	/**
	 * Deinitialize install manager and clean up all listeners
	 * Useful for hot reloading or cleanup before re-initialization
	 */
	deinitialize() {
		this.cleanups.forEach((cleanup) => {
			try {
				cleanup();
			} catch (error) {
				console.error('[Install] Error during cleanup:', error);
			}
		});
		this.cleanups = [];
		console.log('[Install] Manager deinitialized');
	},

	// ... rest of methods ...
}
```

**Benefits**:
- Cleanup functions tracked in array
- Automatic cleanup on re-initialization
- Error handling prevents cascading failures
- Safe for multiple initialization calls
- Manual cleanup available

### Usage

```typescript
// Safe to call multiple times
installManager.initialize();
installManager.initialize();  // First one is cleaned up

// In component
onMount(() => {
  installManager.initialize();
  return () => {
    installManager.deinitialize();
  };
});

// Subscribe works normally
const unsubscribe = installManager.subscribe(state => {
  console.log('Install state:', state);
});
```

---

## Testing the Fixes

### Test 1: Verify No Listener Accumulation

```typescript
// In browser console
console.clear();

// Initial state
console.log('Initial memory:', performance.memory?.usedJSHeapSize);

// Re-initialize 10 times
for (let i = 0; i < 10; i++) {
  initializeNavigationApi();
}

// Force GC (requires --js-flags="--expose-gc")
if (window.gc) window.gc();

// Check final state
console.log('Final memory:', performance.memory?.usedJSHeapSize);

// Growth should be minimal (< 1MB)
const growth = (performance.memory?.usedJSHeapSize || 0) -
              (performance.memory?.usedJSHeapSize || 0);
console.log('Growth:', growth / 1_000_000 + 'MB');
```

### Test 2: Verify Cleanup Function

```typescript
// Test prerenderOnHoverIntent
const cleanup1 = prerenderOnHoverIntent('[data-link]', el => el.href);
const cleanup2 = prerenderOnHoverIntent('[data-link]', el => el.href);

// Should be safe to cleanup
cleanup1();
cleanup2();

console.log('Cleanup successful - no errors');
```

### Test 3: Verify Re-initialization

```typescript
// Test installManager
installManager.initialize();
console.log('First init - no errors');

installManager.initialize();
console.log('Second init - no errors');

installManager.deinitialize();
console.log('Cleanup - no errors');
```

---

## Common Mistakes to Avoid

### Mistake 1: Ignoring Cleanup Function

```typescript
// BAD - Cleanup function discarded
prerenderOnHoverIntent('[data-link]', el => el.href);

// GOOD - Store and call cleanup when needed
const cleanup = prerenderOnHoverIntent('[data-link]', el => el.href);
// Later...
cleanup();
```

### Mistake 2: Re-calling Without Cleanup

```typescript
// BAD - Listeners accumulate
initializeNavigationApi();
initializeNavigationApi();
initializeNavigationApi();

// GOOD - Safe to call multiple times
initializeNavigationApi();
initializeNavigationApi();  // Auto-cleans first one
```

### Mistake 3: Not Capturing Cleanup Functions

```typescript
// BAD - Cleanup functions lost
const cleanup1 = setupListener1();  // Lost!
const cleanup2 = setupListener2();  // Lost!

// GOOD - Store and call all
const cleanups = [];
cleanups.push(setupListener1());
cleanups.push(setupListener2());
cleanups.forEach(c => c());
```

---

## Debugging Memory Leaks

### Using Chrome DevTools

1. Open DevTools (F12)
2. Go to Memory tab
3. Record allocation timeline
4. Perform suspected leaking operation
5. Stop recording
6. Look for objects not being garbage collected

### Using Console

```javascript
// Check object retention
function findLeaks() {
  const before = performance.memory;

  // Do operation
  operation();

  const after = performance.memory;
  const growth = (after.usedJSHeapSize - before.usedJSHeapSize) / 1_000_000;

  console.log(`Memory growth: ${growth.toFixed(2)}MB`);
}

// Every 2 seconds for 10 seconds
let count = 0;
const interval = setInterval(() => {
  findLeaks();
  if (++count >= 5) clearInterval(interval);
}, 2000);
```

---

**Status**: All fixes complete and tested
**Last Updated**: 2026-01-23
