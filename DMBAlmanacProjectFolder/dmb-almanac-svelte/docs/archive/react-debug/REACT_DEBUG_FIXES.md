# React Debug Fixes - Implementation Guide

Quick reference for fixing the issues identified in the React Debug Report.

---

## Fix 1: ServiceWorkerProvider Hydration Mismatch

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/ServiceWorkerProvider.tsx`

**Lines:** 101-106

### Current Code
```typescript
const [isReady, setIsReady] = useState(false);
const [hasUpdate, setHasUpdate] = useState(false);
const [isInstalled, setIsInstalled] = useState(false);
const [isOffline, setIsOffline] = useState(false);
const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

// Register service worker on mount
useEffect(() => {
  if (!isSupported) return;

  registerServiceWorker({
    onSuccess: (reg) => {
      console.log("[PWA] Service Worker ready");
      setRegistration(reg);
      setIsReady(true);
    },
    onUpdate: (reg) => {
      console.log("[PWA] New version available");
      setRegistration(reg);
      setHasUpdate(true);
    },
    onError: (error) => {
      console.error("[PWA] Registration failed:", error);
    },
  });

  // Check if installed as PWA
  // Valid use of setState in effect: checking browser state on mount
  setIsInstalled(isInstalledPWA());

  // Set initial offline state
  setIsOffline(!navigator.onLine);
}, [isSupported]);
```

### Improved Code
```typescript
const [isReady, setIsReady] = useState(false);
const [hasUpdate, setHasUpdate] = useState(false);
const [isInstalled, setIsInstalled] = useState(false);
// Initialize with server-safe default to prevent hydration mismatch
const [isOffline, setIsOffline] = useState(false);
const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
const [hydrationComplete, setHydrationComplete] = useState(false);

// Register service worker on mount
useEffect(() => {
  if (!isSupported) return;

  registerServiceWorker({
    onSuccess: (reg) => {
      console.log("[PWA] Service Worker ready");
      setRegistration(reg);
      setIsReady(true);
    },
    onUpdate: (reg) => {
      console.log("[PWA] New version available");
      setRegistration(reg);
      setHasUpdate(true);
    },
    onError: (error) => {
      console.error("[PWA] Registration failed:", error);
    },
  });

  // Only update browser state AFTER hydration to prevent mismatches
  setIsInstalled(isInstalledPWA());
  setIsOffline(!navigator.onLine);
  setHydrationComplete(true);

  // Update document attribute for CSS
  document.documentElement.setAttribute("data-offline", navigator.onLine ? "false" : "true");
}, [isSupported]);
```

---

## Fix 2: useStorageEstimate Memory Leak

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/hooks/useOfflineDb.ts`

**Lines:** 311-350

### Current Code
```typescript
export function useStorageEstimate() {
  const [estimate, setEstimate] = useState<{
    usage: number;
    quota: number;
    percent: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Use recursive setTimeout to prevent overlapping async calls
    async function fetchAndSchedule() {
      if (!mounted) return;

      try {
        const result = await getStorageEstimate();
        if (mounted) {
          setEstimate(result);
        }
      } catch (error) {
        console.error("[useStorageEstimate] Failed to get storage estimate:", error);
      }

      // Schedule next fetch only after current one completes
      if (mounted) {
        timeoutId = setTimeout(fetchAndSchedule, 30000);
      }
    }

    fetchAndSchedule();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return estimate;
}
```

### Improved Code
```typescript
export function useStorageEstimate() {
  const [estimate, setEstimate] = useState<{
    usage: number;
    quota: number;
    percent: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const abortController = new AbortController();

    // Use recursive setTimeout to prevent overlapping async calls
    async function fetchAndSchedule() {
      if (!mounted || abortController.signal.aborted) return;

      try {
        const result = await getStorageEstimate();
        if (mounted && !abortController.signal.aborted) {
          setEstimate(result);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return; // Silently ignore abort errors
        }
        console.error("[useStorageEstimate] Failed to get storage estimate:", error);
      }

      // Schedule next fetch only if still mounted
      if (mounted && !abortController.signal.aborted) {
        timeoutId = setTimeout(fetchAndSchedule, 30000);
      }
    }

    fetchAndSchedule();

    return () => {
      mounted = false;
      abortController.abort();
      // Only clear if timeout was set
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return estimate;
}
```

---

## Fix 3: OfflineDataProvider Module-Level State Error Recovery

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/OfflineDataProvider.tsx`

**Lines:** 22-38

### Current Code
```typescript
// Lazy load Dexie utilities only when needed (offline or explicit request)
let isIndexedDBAvailable: (() => boolean) | null = null;
let dexieLoadPromise: Promise<void> | null = null;

/**
 * Lazy load Dexie only when needed (offline or explicit request)
 * Saves ~50-80KB from initial bundle
 */
async function loadDexieIfNeeded(): Promise<void> {
  if (isIndexedDBAvailable !== null) return; // Already loaded
  if (dexieLoadPromise) return dexieLoadPromise; // Loading in progress

  dexieLoadPromise = import("@/lib/db/dexie").then((module) => {
    isIndexedDBAvailable = module.isIndexedDBAvailable;
  });

  await dexieLoadPromise;
}
```

### Improved Code
```typescript
// Lazy load Dexie utilities only when needed (offline or explicit request)
let isIndexedDBAvailable: (() => boolean) | null = null;
let dexieLoadPromise: Promise<void> | null = null;
let dexieLoadError: Error | null = null;

/**
 * Lazy load Dexie only when needed (offline or explicit request)
 * Saves ~50-80KB from initial bundle
 *
 * Includes error recovery: transient errors can be retried
 */
async function loadDexieIfNeeded(): Promise<void> {
  // If previous load was successful, return immediately
  if (isIndexedDBAvailable !== null) return;

  // If currently loading, wait for that promise
  if (dexieLoadPromise) {
    // But first check if previous promise failed
    if (dexieLoadError) {
      // Reset error state to allow retry
      dexieLoadError = null;
      dexieLoadPromise = null;
    } else {
      // Still loading or waiting for result
      return dexieLoadPromise;
    }
  }

  // Start new load
  dexieLoadPromise = import("@/lib/db/dexie")
    .then((module) => {
      isIndexedDBAvailable = module.isIndexedDBAvailable;
      dexieLoadError = null; // Clear any previous errors
    })
    .catch((error) => {
      // Cache error but allow retry on next call
      dexieLoadError = error as Error;
      dexieLoadPromise = null; // Reset promise so next call can retry
      console.error("[OfflineDataProvider] Failed to load Dexie:", error);
      throw error; // Re-throw to caller
    });

  await dexieLoadPromise;
}
```

---

## Fix 4: InstallPrompt Duplicate Effect Consolidation

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPrompt.tsx`

**Lines:** 248-274

### Current Code
```typescript
  // Show prompt after conditions met
  useEffect(() => {
    if (manualTrigger || !canInstall || isInstalled || isDismissed) {
      return;
    }

    const timer = setTimeout(() => {
      if (hasScrolled) {
        setShouldShow(true);
      }
    }, minTimeOnSite);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, isDismissed, hasScrolled, minTimeOnSite, manualTrigger]);

  // Also show when scroll happens after timer
  useEffect(() => {
    if (manualTrigger || !canInstall || isInstalled || isDismissed || !hasScrolled) {
      return;
    }

    // Small delay after scroll
    const timer = setTimeout(() => {
      setShouldShow(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasScrolled, canInstall, isInstalled, isDismissed, manualTrigger]);
```

### Improved Code
```typescript
  // Show prompt after conditions met
  // Triggers when EITHER: (1) user scrolls after minTimeOnSite, OR (2) minTimeOnSite + fallback timeout
  useEffect(() => {
    if (manualTrigger || !canInstall || isInstalled || isDismissed) {
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];

    // Primary: Show when user scrolls after minTimeOnSite
    const mainTimer = setTimeout(() => {
      if (hasScrolled) {
        setShouldShow(true);
      }
    }, minTimeOnSite);
    timers.push(mainTimer);

    // Fallback: Show after additional delay if scroll didn't happen
    const fallbackTimer = setTimeout(() => {
      // Only show if we haven't already shown via scroll
      if (!hasScrolled) {
        setShouldShow(true);
      }
    }, minTimeOnSite + 1000);
    timers.push(fallbackTimer);

    return () => {
      // Clean up all timers
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [canInstall, isInstalled, isDismissed, hasScrolled, minTimeOnSite, manualTrigger]);
```

---

## Fix 5: DataProvider Error Categorization

**File:** `/Users/louisherman/Documents/dmb-almanac/components/data/DataProvider.tsx`

**Lines:** 58-63, 168-176

### Current Code - State Type
```typescript
type DataProviderState =
  | { status: 'initializing' }
  | { status: 'checking' }
  | { status: 'loading'; progress: LoadProgress }
  | { status: 'ready' }
  | { status: 'error'; error: string };
```

### Current Code - Error Handling
```typescript
    } catch (error) {
      console.error('[DataProvider] Failed to initialize data:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load data. Please try again.';

      setState({ status: 'error', error: errorMessage });
      onLoadError?.(error instanceof Error ? error : new Error(errorMessage));
    }
```

### Improved Code - State Type
```typescript
type DataProviderState =
  | { status: 'initializing' }
  | { status: 'checking' }
  | { status: 'loading'; progress: LoadProgress }
  | { status: 'ready' }
  | {
      status: 'error';
      error: string;
      isRetryable: boolean;
      category: 'network' | 'storage' | 'permission' | 'unknown';
    };
```

### Improved Code - Error Handling
```typescript
    } catch (error) {
      console.error('[DataProvider] Failed to initialize data:', error);

      // Categorize error for better recovery UX
      let errorMessage = 'Failed to load data. Please try again.';
      let isRetryable = true;
      let category: 'network' | 'storage' | 'permission' | 'unknown' = 'unknown';

      if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        if (msg.includes('indexeddb') || msg.includes('storage')) {
          errorMessage = 'Storage access denied. Please check browser permissions.';
          isRetryable = false;
          category = 'storage';
        } else if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          isRetryable = true;
          category = 'network';
        } else if (msg.includes('permission')) {
          errorMessage = 'Permission denied. Please grant the required permissions.';
          isRetryable = false;
          category = 'permission';
        }
      }

      setState({
        status: 'error',
        error: errorMessage,
        isRetryable,
        category,
      });

      onLoadError?.(error instanceof Error ? error : new Error(errorMessage));
    }
```

### Update Error UI Component
```typescript
  // Error state
  if (state.status === 'error') {
    if (CustomErrorComponent) {
      return <CustomErrorComponent error={state.error} onRetry={handleRetry} />;
    }

    // Default error UI
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h1 className={styles.errorTitle}>Data Load Error</h1>
          <p className={styles.errorMessage}>{state.error}</p>
          {state.isRetryable && (
            <button onClick={handleRetry} className={styles.retryButton}>
              Retry
            </button>
          )}
          {!state.isRetryable && (
            <p className={styles.errorHint}>
              {state.category === 'storage' && 'Please check your browser storage settings.'}
              {state.category === 'permission' && 'Please grant the necessary permissions in browser settings.'}
            </p>
          )}
        </div>
      </div>
    );
  }
```

---

## Fix 6: GuestNetwork Error Handling

**File:** `/Users/louisherman/Documents/dmb-almanac/components/visualizations/GuestNetwork.tsx`

**Lines:** 178-209

### Current Code
```typescript
  // Transform data to D3 format (for links and original node data)
  const d3Data = useCallback(() => {
    // Create node map for quick lookup
    const nodeMap = new Map<number, D3Node>();
    const d3Nodes: D3Node[] = nodes.map((node) => {
      const position = nodePositionMap.get(node.id);
      const d3Node: D3Node = {
        ...node,
        x: position?.x ?? width / 2,
        y: position?.y ?? height / 2,
      };
      nodeMap.set(node.id, d3Node);
      return d3Node;
    });

    // Create links
    const d3Links: D3Link[] = edges.map((edge) => {
      const source = nodeMap.get(edge.guest1Id);
      const target = nodeMap.get(edge.guest2Id);

      if (!source || !target) {
        throw new Error(`Invalid edge: guest ${edge.guest1Id} or ${edge.guest2Id} not found`);
      }

      return {
        source,
        target,
        coAppearances: edge.coAppearances,
      };
    });

    return { nodes: d3Nodes, links: d3Links };
  }, [nodes, edges, nodePositionMap, width, height]);
```

### Improved Code
```typescript
  // Transform data to D3 format (for links and original node data)
  const d3Data = useCallback(() => {
    try {
      // Create node map for quick lookup
      const nodeMap = new Map<number, D3Node>();
      const d3Nodes: D3Node[] = nodes.map((node) => {
        const position = nodePositionMap.get(node.id);
        const d3Node: D3Node = {
          ...node,
          x: position?.x ?? width / 2,
          y: position?.y ?? height / 2,
        };
        nodeMap.set(node.id, d3Node);
        return d3Node;
      });

      // Create links - filter out invalid edges instead of throwing
      const invalidEdges: typeof edges = [];
      const d3Links: D3Link[] = edges
        .map((edge) => {
          const source = nodeMap.get(edge.guest1Id);
          const target = nodeMap.get(edge.guest2Id);

          if (!source || !target) {
            invalidEdges.push(edge);
            return null; // Mark as invalid
          }

          return {
            source,
            target,
            coAppearances: edge.coAppearances,
          };
        })
        .filter((link): link is D3Link => link !== null);

      // Log warning about invalid edges
      if (invalidEdges.length > 0) {
        console.warn(
          `[GuestNetwork] Skipped ${invalidEdges.length} invalid edges:`,
          invalidEdges.map((e) => `${e.guest1Id}→${e.guest2Id}`)
        );
      }

      return { nodes: d3Nodes, links: d3Links };
    } catch (error) {
      console.error('[GuestNetwork] Failed to prepare D3 data:', error);
      // Return empty visualization instead of crashing
      return { nodes: [], links: [] };
    }
  }, [nodes, edges, nodePositionMap, width, height]);
```

---

## Fix 7: ServiceWorkerProvider Context Value Memoization

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/ServiceWorkerProvider.tsx`

**Lines:** 173-190

### Current Code
```typescript
  const contextValue: PWAContextValue = {
    isSupported,
    isReady,
    hasUpdate,
    isInstalled,
    isOffline,
    updateServiceWorker,
    requestNotifications,
    checkForUpdates: checkForSWUpdates,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      {showUpdateNotification && hasUpdate && <UpdateNotification onUpdate={updateServiceWorker} />}
      {isOffline && <OfflineIndicator />}
    </PWAContext.Provider>
  );
```

### Improved Code
```typescript
  const contextValue: PWAContextValue = useMemo(
    () => ({
      isSupported,
      isReady,
      hasUpdate,
      isInstalled,
      isOffline,
      updateServiceWorker,
      requestNotifications,
      checkForUpdates: checkForSWUpdates,
    }),
    [
      isSupported,
      isReady,
      hasUpdate,
      isInstalled,
      isOffline,
      updateServiceWorker,
      requestNotifications,
      checkForSWUpdates,
    ]
  );

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      {showUpdateNotification && hasUpdate && <UpdateNotification onUpdate={updateServiceWorker} />}
      {isOffline && <OfflineIndicator />}
    </PWAContext.Provider>
  );
```

Don't forget to add the import:
```typescript
import { useMemo } from "react";
```

---

## Testing Checklist

After applying fixes, verify:

- [ ] Build completes without errors: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Component tests pass (if applicable)
- [ ] Manual test in offline mode
- [ ] Manual test with PWA installed
- [ ] Manual test rapid mount/unmount of components
- [ ] Chrome DevTools Memory shows stable heap after GC
- [ ] No console errors during normal operation

---

## Deployment Order

1. **Fix 2** (useStorageEstimate) - Low risk memory fix
2. **Fix 3** (OfflineDataProvider) - Error recovery improvement
3. **Fix 1** (ServiceWorkerProvider) - Hydration safety
4. **Fix 4** (InstallPrompt) - Consolidate logic
5. **Fix 5** (DataProvider) - Better error messages
6. **Fix 6** (GuestNetwork) - Graceful degradation
7. **Fix 7** (Context memoization) - Performance polish

Each fix is isolated and can be deployed independently.
