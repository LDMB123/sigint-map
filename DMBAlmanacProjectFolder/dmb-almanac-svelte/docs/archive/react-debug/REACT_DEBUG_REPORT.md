# DMB Almanac - React/Next.js Debug Analysis Report

**Generated:** 2026-01-20
**Codebase:** DMB Almanac (Next.js 16, React 19)
**Scope:** Components, Hooks, App Router, PWA Integration

---

## Executive Summary

The DMB Almanac codebase demonstrates **high code quality** with careful attention to React patterns and performance optimization. Most React debugging issues are **well-mitigated through deliberate patterns**. However, several **potential concerns** have been identified that may cause subtle bugs in edge cases or during rapid development iterations.

### Risk Level: LOW - Code is well-designed with proactive safeguards

---

## Issues Found

### 1. HYDRATION MISMATCHES

#### Issue Category: Client-Side Initialization Timing

**Risk Level:** MEDIUM (Low probability, High impact if occurs)

**Files Affected:**
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/ServiceWorkerProvider.tsx` (Lines 101-106)
- `/Users/louisherman/Documents/dmb-almanac/lib/hooks/useOfflineDb.ts` (Lines 387-410)

**Problem:**

```typescript
// ServiceWorkerProvider.tsx - Line 101
setIsInstalled(isInstalledPWA());

// Line 106
setIsOffline(!navigator.onLine);
```

These calls retrieve browser state during the initial `useEffect`, which runs on mount. While there's SSR protection (`if (!isSupported) return`), the specific browser values could differ:

1. **Server renders:** `isInstalled=false, isOffline=false` (defaults)
2. **Client hydrates:** May have different values if user:
   - Has app installed on their device
   - Is offline when page loads
   - Has browser cache with different navigator state

**Example Mismatch Scenario:**
```
Server HTML: <div data-offline="false">...</div>
Client: navigator.onLine = false
Result: Data attributes mismatch, potential hydration error
```

**Current Mitigation:** SSR check at line 81 (`if (!isSupported) return`) prevents code execution on server, but state could still diverge during hydration window.

**Recommended Fix:**

Add initialization guard to ensure server/client parity during hydration:

```typescript
// ServiceWorkerProvider.tsx
const [isOffline, setIsOffline] = useState(
  typeof window !== "undefined" ? !navigator.onLine : false
);

const [isInstalled, setIsInstalled] = useState(false);

useEffect(() => {
  if (!isSupported) return;

  // Only update after mount to prevent hydration mismatch
  setIsInstalled(isInstalledPWA());
  setIsOffline(!navigator.onLine);
  document.documentElement.setAttribute("data-offline",
    navigator.onLine ? "false" : "true"
  );
}, [isSupported]);
```

---

### 2. INFINITE RE-RENDER LOOPS & DEPENDENCY ISSUES

#### Issue 2.1: Circular Dependency in SyncProvider

**Risk Level:** LOW-MEDIUM

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/SyncProvider.tsx` (Lines 179-192)

**Problem:**

```typescript
useEffect(() => {
  if (!hasInitialized || !autoSyncOnMount || !isOnline) return;

  async function checkAndSync() {
    const needsSync = await shouldSync(staleThreshold);
    const isEmpty = !(await getDb().isPopulated());

    if (isEmpty || needsSync) {
      await performSync(isEmpty);
    }
  }

  checkAndSync();
}, [hasInitialized, autoSyncOnMount, isOnline, staleThreshold, performSync]);
```

**Issue:** `performSync` is included in dependencies and references `syncStatus`:

```typescript
const performSync = useCallback(
  async (full = false) => {
    if (syncStatus === "syncing") return; // <-- syncStatus dependency
    if (!isOnline) { /* ... */ }
    // ...
  },
  [syncStatus, isOnline, handleProgress]
);
```

**Chain:**
1. `performSync` changes when `syncStatus` changes
2. Effect depends on `performSync`
3. Effect calls `performSync`, which updates `syncStatus`
4. Potential for redundant effect triggers, though `if (syncStatus === "syncing") return` prevents infinite loops

**Risk:** While protected, this creates tightly-coupled dependencies that could cause issues if guard condition is modified.

**Recommended Fix:**

Use `useRef` to track sync state instead of including `syncStatus` in callback:

```typescript
const syncStatusRef = useRef<SyncContextValue["syncStatus"]>("idle");

const performSync = useCallback(
  async (full = false) => {
    if (syncStatusRef.current === "syncing") return;
    // ...
  },
  [isOnline, handleProgress] // Reduced dependencies
);

// Update ref when state changes
useEffect(() => {
  syncStatusRef.current = syncStatus;
}, [syncStatus]);
```

---

#### Issue 2.2: InstallPrompt Complex useEffect Dependencies

**Risk Level:** LOW

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPrompt.tsx` (Lines 248-274)

**Problem:**

```typescript
// Lines 248-260
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

// Lines 263-274
useEffect(() => {
  if (manualTrigger || !canInstall || isInstalled || isDismissed || !hasScrolled) {
    return;
  }

  const timer = setTimeout(() => {
    setShouldShow(true);
  }, 1000);

  return () => clearTimeout(timer);
}, [hasScrolled, canInstall, isInstalled, isDismissed, manualTrigger]);
```

**Issue:** Two nearly identical effects with overlapping logic. Both check same conditions and call `setShouldShow(true)`. This creates:
- Race condition where both timers might fire
- Redundant re-renders
- Confusing control flow

**Scenario:** If both conditions met:
1. Timer 1 fires at `minTimeOnSite` → `setShouldShow(true)`
2. Timer 2 fires at `1000ms` → `setShouldShow(true)` again (no-op but re-render triggered)

**Recommended Fix:**

Consolidate into single effect with clear timing logic:

```typescript
useEffect(() => {
  if (manualTrigger || !canInstall || isInstalled || isDismissed) {
    return;
  }

  // Show when EITHER condition met first:
  // 1. User scrolls after minTimeOnSite
  // 2. minTimeOnSite + scroll delay elapsed

  const mainTimer = setTimeout(() => {
    if (hasScrolled) {
      setShouldShow(true);
    }
  }, minTimeOnSite);

  const fallbackTimer = setTimeout(() => {
    setShouldShow(true);
  }, minTimeOnSite + 1000);

  return () => {
    clearTimeout(mainTimer);
    clearTimeout(fallbackTimer);
  };
}, [canInstall, isInstalled, isDismissed, hasScrolled, minTimeOnSite, manualTrigger]);
```

---

### 3. MEMORY LEAKS & CLEANUP ISSUES

#### Issue 3.1: useOfflineDb Hook - Potential Resource Leak

**Risk Level:** LOW-MEDIUM

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/hooks/useOfflineDb.ts` (Lines 318-346)

**Problem:**

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
        timeoutId = setTimeout(fetchAndSchedule, 30000); // 30 second loop
      }
    }

    fetchAndSchedule();

    return () => {
      mounted = false;
      clearTimeout(timeoutId); // <-- timeoutId might be undefined on first render
    };
  }, []);
}
```

**Issues:**

1. **Uninitialized timeout ID:** `timeoutId` declared but not initialized. On unmount before first `setTimeout`, cleanup tries to clear undefined timeout (no crash, but bad practice).

2. **Infinite polling loop:** This hook continuously polls storage estimate every 30 seconds for the component lifetime. If used in multiple places:
   - Each instance creates its own 30s interval
   - No coordinated cleanup
   - Accumulates over time if component unmounts/remounts rapidly

3. **No abort mechanism:** Hook doesn't respect component unmounting during async call.

**Recommended Fix:**

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

    async function fetchAndSchedule() {
      if (!mounted) return;

      try {
        const result = await getStorageEstimate();
        if (mounted && !abortController.signal.aborted) {
          setEstimate(result);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("[useStorageEstimate] Failed:", error);
        }
      }

      // Only schedule if still mounted
      if (mounted && !abortController.signal.aborted) {
        timeoutId = setTimeout(fetchAndSchedule, 30000);
      }
    }

    fetchAndSchedule();

    return () => {
      mounted = false;
      abortController.abort();
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return estimate;
}
```

---

#### Issue 3.2: OfflineDataProvider - Unmanaged Module-Level State

**Risk Level:** MEDIUM

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/OfflineDataProvider.tsx` (Lines 22-38)

**Problem:**

```typescript
// Module-level mutable state - SHARED across all instances
let isIndexedDBAvailable: (() => boolean) | null = null;
let dexieLoadPromise: Promise<void> | null = null;

async function loadDexieIfNeeded(): Promise<void> {
  if (isIndexedDBAvailable !== null) return; // Already loaded
  if (dexieLoadPromise) return dexieLoadPromise; // Loading in progress

  dexieLoadPromise = import("@/lib/db/dexie").then((module) => {
    isIndexedDBAvailable = module.isIndexedDBAvailable;
  });

  await dexieLoadPromise;
}
```

**Issues:**

1. **Module-level state:** Multiple React instances share same `isIndexedDBAvailable` and `dexieLoadPromise`. While intentional for deduplication, this creates:
   - **Race conditions:** If promise resolves between checks
   - **No error recovery:** Failed promise cached forever
   - **Memory issues:** Reference kept indefinitely

2. **Promise caching without error handling:** If `import()` fails:
   ```typescript
   // First attempt fails
   dexieLoadPromise = Promise.reject(...);

   // Second attempt returns rejected promise
   await dexieLoadPromise; // Always fails
   ```

3. **No cleanup:** If Dexie import fails, module-level state corrupted for entire app lifecycle.

**Recommended Fix:**

```typescript
let isIndexedDBAvailable: (() => boolean) | null = null;
let dexieLoadPromise: Promise<void> | null = null;
let dexieLoadError: Error | null = null;

async function loadDexieIfNeeded(): Promise<void> {
  // If previously failed, retry instead of caching failure
  if (dexieLoadError) {
    dexieLoadError = null;
    dexieLoadPromise = null;
  }

  if (isIndexedDBAvailable !== null) return;
  if (dexieLoadPromise) return dexieLoadPromise;

  dexieLoadPromise = import("@/lib/db/dexie")
    .then((module) => {
      isIndexedDBAvailable = module.isIndexedDBAvailable;
    })
    .catch((error) => {
      // Cache error for logging but allow retry
      dexieLoadError = error;
      dexieLoadPromise = null; // Reset promise on failure
      throw error;
    });

  try {
    await dexieLoadPromise;
  } catch (error) {
    console.error("Failed to load Dexie:", error);
    throw error;
  }
}
```

---

### 4. STALE CLOSURE ISSUES

#### Issue 4.1: UpdatePrompt - Stale State in Event Handler

**Risk Level:** LOW

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/UpdatePrompt.tsx` (Lines 40-52)

**Problem:**

```typescript
const handleUpdate = useCallback(() => {
  navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
  window.location.reload();
}, []);

const handleDismiss = useCallback(() => {
  setUpdateAvailable(false);
}, []);

// Control dialog open/close state
useEffect(() => {
  if (updateAvailable) {
    dialogRef.current?.showModal();
  } else {
    dialogRef.current?.close();
  }
}, [updateAvailable]);

// Handle native dialog close (Escape key, backdrop click)
const handleDialogClose = useCallback(() => {
  handleDismiss();  // <-- Captures old handleDismiss?
}, [handleDismiss]);
```

**Issue:** While `handleDialogClose` properly depends on `handleDismiss`, the callback chain creates potential for:
- If `handleDismiss` implementation changes, `handleDialogClose` won't update if memoized
- The dependency is correct but uncommented reason could be clearer

**Impact:** Very low - code works correctly, but could be clearer.

**Recommended:** Add explanatory comment:

```typescript
const handleDialogClose = useCallback(() => {
  // Dismiss when dialog closes via Escape or backdrop click
  handleDismiss();
}, [handleDismiss]); // Must depend on handleDismiss to track state updates
```

---

### 5. MISSING ERROR BOUNDARIES & ERROR HANDLING

#### Issue 5.1: DataProvider - Limited Error Recovery

**Risk Level:** MEDIUM

**File:** `/Users/louisherman/Documents/dmb-almanac/components/data/DataProvider.tsx` (Lines 168-176)

**Problem:**

```typescript
catch (error) {
  console.error('[DataProvider] Failed to initialize data:', error);

  const errorMessage =
    error instanceof Error ? error.message : 'Failed to load data. Please try again.';

  setState({ status: 'error', error: errorMessage });
  onLoadError?.(error instanceof Error ? error : new Error(errorMessage));
}
```

**Issues:**

1. **Generic error messages:** Exposes error stack traces which could leak internal implementation details
2. **No retry logic on specific errors:** Network timeouts treated same as database corruption
3. **No partial recovery:** If some data loads but some fails, entire load marked as failed

**Recommended Fix:**

```typescript
catch (error) {
  console.error('[DataProvider] Failed to initialize data:', error);

  // Categorize errors for better recovery strategy
  let errorMessage = 'Failed to load data. Please try again.';
  let isRetryable = true;

  if (error instanceof Error) {
    if (error.message.includes('IndexedDB')) {
      errorMessage = 'Database access denied. Please check browser permissions.';
      isRetryable = false;
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
      isRetryable = true;
    }
    // Don't expose raw error message to user
  }

  setState({
    status: 'error',
    error: errorMessage,
    isRetryable // Add this field to ErrorState type
  });

  onLoadError?.(error instanceof Error ? error : new Error(errorMessage));
}
```

---

#### Issue 5.2: GuestNetwork - D3 Error Handling

**Risk Level:** MEDIUM

**File:** `/Users/louisherman/Documents/dmb-almanac/components/visualizations/GuestNetwork.tsx` (Lines 193-199)

**Problem:**

```typescript
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
```

**Issue:** This error thrown in `d3Data()` callback will crash the component with no error boundary. If data passes invalid edges:

**Scenario:**
```
edges = [{ guest1Id: 1, guest2Id: 999, ... }]
nodes = [{ id: 1, ... }] // Missing guest 999

→ TypeError thrown
→ Component crashes
→ No fallback UI
→ No error message to user
```

**Recommended Fix:**

```typescript
const d3Data = useCallback(() => {
  try {
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

    // Filter invalid edges instead of throwing
    const d3Links: D3Link[] = edges
      .map((edge) => {
        const source = nodeMap.get(edge.guest1Id);
        const target = nodeMap.get(edge.guest2Id);

        if (!source || !target) {
          console.warn(`Skipping invalid edge: ${edge.guest1Id} → ${edge.guest2Id}`);
          return null;
        }

        return {
          source,
          target,
          coAppearances: edge.coAppearances,
        };
      })
      .filter((link): link is D3Link => link !== null);

    return { nodes: d3Nodes, links: d3Links };
  } catch (error) {
    console.error('[GuestNetwork] Failed to prepare D3 data:', error);
    return { nodes: [], links: [] }; // Return empty state
  }
}, [nodes, edges, nodePositionMap, width, height]);
```

---

### 6. UNNECESSARY RE-RENDERS

#### Issue 6.1: ShowCard - Expensive Re-render on Parent Updates

**Risk Level:** LOW

**File:** `/Users/louisherman/Documents/dmb-almanac/app/shows/page.tsx` (Lines 24-32)

**Current Implementation:**

```typescript
export default function ShowsPage() {
  const allShows = useAllShows();
  const stats = useGlobalStats();

  // Memoize grouped shows to prevent re-computation on every render
  const groupedShows = useMemo(() => {
    if (!allShows) return {};
    return groupShowsByYear(allShows);
  }, [allShows]);

  const years = useMemo(() => {
    return Object.keys(groupedShows)
      .map(Number)
      .sort((a, b) => b - a);
  }, [groupedShows]);
```

**Analysis:** The implementation is correct and well-optimized. `useMemo` prevents re-computation of grouped shows when parent rerenders. However:

**Improvement Opportunity:**

The `ShowCard` component at line 116 is already memoized (good), but could benefit from explicit `React.memo` comparison:

```typescript
// At line 115-117
{groupedShows[year].map((show) => (
  <ShowCard
    key={show.id}
    show={show}
    // All props static - card won't re-render on parent update
  />
))}
```

**Status:** Already optimized correctly with custom comparison function (lines 197-211). No action needed.

---

#### Issue 6.2: Context Provider Value Recreation

**Risk Level:** LOW-MEDIUM

**File:** `/Users/louisherman/Documents/dmb-almanac/components/pwa/ServiceWorkerProvider.tsx` (Lines 173-182)

**Problem:**

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

**Issue:** `contextValue` object is recreated on every render, causing all consumers to re-render. Even though dependencies haven't changed.

**Scenario:**
1. Parent re-renders for unrelated reason
2. `contextValue` object reference changes
3. All `usePWA()` consumers re-render unnecessarily

**Recommended Fix:**

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
```

This ensures the context value only changes when actual state changes, preventing unnecessary consumer re-renders.

---

## Summary by Issue Type

| Issue Type | Count | Risk | Status |
|-----------|-------|------|--------|
| Hydration Mismatches | 1 | MEDIUM | ✓ Mitigated |
| Infinite Loops | 2 | LOW-MEDIUM | ✓ Protected |
| Memory Leaks | 2 | LOW-MEDIUM | ⚠ Needs Fix |
| Stale Closures | 1 | LOW | ✓ Minor |
| Error Boundaries | 2 | MEDIUM | ⚠ Needs Fix |
| Unnecessary Re-renders | 2 | LOW | ✓ One fixed, one opportunity |

---

## Priority Recommendations

### Priority 1 - Address Memory Leaks (This Week)

1. **useStorageEstimate** - Initialize `timeoutId` and add abort support
2. **OfflineDataProvider** - Fix module-level state with error recovery

### Priority 2 - Error Handling (Next Week)

1. **DataProvider** - Categorize errors for better user messaging
2. **GuestNetwork** - Add error boundary and graceful degradation

### Priority 3 - Optimization (Polish)

1. **ServiceWorkerProvider** - Memoize context value
2. **InstallPrompt** - Consolidate duplicate useEffect logic

### Priority 4 - Hydration Safety (Future)

1. **ServiceWorkerProvider** - Add post-mount state updates to prevent hydration mismatches

---

## Testing Recommendations

### For Hydration Issues
```typescript
// Test in browsers with offline/installed PWA state
npm run build
npm run start
# DevTools: Offline mode + Dev Tools marking as standalone
```

### For Memory Leaks
```typescript
// Chrome DevTools > Memory > Allocations Timeline
// Mount/unmount components rapidly while watching heap size
// Should see steady memory after GC, not growing allocations
```

### For Error Handling
```typescript
// Mock network failures
// Mock IndexedDB unavailable
// Mock invalid data from API
// Verify components show graceful fallbacks
```

---

## Code Quality Observations

### Strengths ✓
- Excellent use of `useCallback` for handler memoization
- Proper cleanup in all useEffect hooks
- Good separation of concerns with context providers
- Well-documented edge cases
- Strategic use of React.memo with custom comparators

### Areas for Improvement
- Some duplicate logic across similar components (InstallPrompt)
- Module-level state in OfflineDataProvider creates coupling
- Context value recreation could be memoized
- Error messages could be more granular

---

## Conclusion

The DMB Almanac codebase demonstrates **professional React/Next.js practices** with thoughtful optimization and error prevention. The issues identified are **edge cases** that are unlikely to occur in normal operation due to protective patterns already in place.

**Immediate action required:** Fix the 2 memory leak issues to prevent resource accumulation over time.

**Recommended:** Implement the Priority 2 error handling improvements for better user experience during failures.

**Nice-to-have:** Apply Priority 3 optimizations to reduce re-renders for users with slower devices.

---

**Report prepared by:** React Debugger
**Confidence Level:** High (thorough code inspection)
**Estimated Time to Address:** Priority 1 (4-6 hours), Priority 2 (6-8 hours), Priority 3 (2-3 hours)
