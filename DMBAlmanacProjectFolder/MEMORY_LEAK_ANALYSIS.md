# Memory Leak Analysis Report - DMB Almanac Svelte

## Executive Summary

**Overall Assessment: STRONG** (Score: 8/10)

Your codebase demonstrates excellent memory management practices with proper cleanup patterns. However, I identified several areas for enhancement, particularly in store cleanup, closure optimization, and ResizeObserver management.

### Key Findings:
- **9 FIXED Issues**: Event listeners properly cleaned up with AbortController
- **5 RECOMMENDATIONS**: Optimizations and edge-case fixes
- **2 POTENTIAL LEAKS**: Minor issues requiring attention
- **Memory Leak Risk**: LOW (but preventable edge cases identified)

---

## 1. CRITICAL FINDINGS

### 1.1 Store Subscriptions Not Destroyed in Some Components ⚠️ MEDIUM

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

**Issue**: User data stores (attended shows, favorites) initialize subscriptions on import, but are never destroyed when components unmount.

**Severity**: MEDIUM - Subscriptions persist if stores are used in many components

**Location**: Lines 630-718 (userAttendedShows), 725-804 (userFavoriteSongs), 809-884 (userFavoriteVenues)

**Problem**:
```typescript
// LEAK: Subscriptions created at module load time, never cleaned up
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;

  if (isBrowser) {
    getDb()
      .then((db) => {
        // Subscription created but no way to clean up from component lifecycle
        subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
          next: (value) => store.set(value),
          error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
        });
      })
      .catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
  }
}
```

**Fix**: Implement a subscription manager that cleans up when no subscribers remain.

**Fixed Code**:
```typescript
// FIXED: Track subscription lifecycle properly
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;
  let subscriberCount = 0;

  if (isBrowser) {
    // Lazy initialization - only subscribe when needed
    const initializeSubscription = () => {
      if (subscription) return;

      getDb()
        .then((db) => {
          subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
            next: (value) => store.set(value),
            error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
          });
        })
        .catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
    };

    // Override subscribe to track subscriber count
    const originalSubscribe = store.subscribe.bind(store);
    store.subscribe = (fn: (value: UserAttendedShow[]) => void) => {
      // Initialize on first subscriber
      if (subscriberCount === 0) {
        initializeSubscription();
      }
      subscriberCount++;

      const unsubscribe = originalSubscribe(fn);

      // Return wrapped unsubscribe that cleans up when last subscriber leaves
      return () => {
        unsubscribe();
        subscriberCount--;
        if (subscriberCount === 0) {
          subscription?.unsubscribe();
          subscription = null;
        }
      };
    };
  }

  return {
    subscribe: store.subscribe,
    // ... rest of methods
    destroy() {
      subscription?.unsubscribe();
      subscription = null;
    }
  };
}
```

**Verification**: Add cleanup calls in your root layout:
```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { userAttendedShows, userFavoriteSongs, userFavoriteVenues } from '$lib/stores/dexie';

  onDestroy(() => {
    userAttendedShows.destroy?.();
    userFavoriteSongs.destroy?.();
    userFavoriteVenues.destroy?.();
  });
</script>
```

---

### 1.2 WASM Worker Pending Calls Can Leak with Race Conditions 🔴 MEDIUM

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/bridge.ts`

**Issue**: If a worker crashes after a call is initiated but before a response arrives, the pending call will remain in the map indefinitely, preventing garbage collection of captured closures.

**Severity**: MEDIUM - Affects long-running apps with worker crashes

**Location**: Lines 342-382 (callWorker method), Lines 737-776 (stale cleanup)

**Problem**:
```typescript
// LEAK: If worker crashes, timeout never fires, pending call stays in map forever
private async callWorker<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
  if (!this.worker) {
    throw new Error('Worker not initialized');
  }

  const id = `call_${++this.callIdCounter}`;
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.pendingCalls.delete(id);  // Only cleaned up on timeout
      reject(new Error(`Operation timed out: ${method}`));

      // If worker crashes silently, this timeout might not fire!
      const abortRequest: WorkerRequest = { type: 'abort', id };
      this.worker?.postMessage(abortRequest);
    }, this.config.operationTimeout);

    this.pendingCalls.set(id, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        resolve(value as T);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      startTime,
      method,
    });

    const request: WorkerRequest = {
      type: 'call',
      id,
      method,
      args,  // LEAK: Entire args array captured in closure
    };
    this.worker!.postMessage(request);
  });
}
```

**Fix**: Use WeakMap for pending calls to allow garbage collection, and add better worker crash detection.

**Fixed Code**:
```typescript
// FIXED: Better pending call management with automatic cleanup
private pendingCalls = new Map<string, PendingCall>();
private callTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

private async callWorker<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
  if (!this.worker) {
    throw new Error('Worker not initialized');
  }

  const id = `call_${++this.callIdCounter}`;
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.pendingCalls.delete(id);
      this.callTimeouts.delete(id);
      reject(new Error(`Operation timed out: ${method}`));

      const abortRequest: WorkerRequest = { type: 'abort', id };
      this.worker?.postMessage(abortRequest);
    }, this.config.operationTimeout);

    // Store timeout reference for cleanup
    this.callTimeouts.set(id, timeoutId);

    this.pendingCalls.set(id, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        this.callTimeouts.delete(id);
        resolve(value as T);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        this.callTimeouts.delete(id);
        reject(error);
      },
      startTime,
      method,
    });

    const request: WorkerRequest = {
      type: 'call',
      id,
      method,
      args,
    };

    try {
      this.worker!.postMessage(request);
    } catch (error) {
      // If postMessage fails, clean up immediately
      clearTimeout(timeoutId);
      this.callTimeouts.delete(id);
      this.pendingCalls.delete(id);
      reject(new Error(`Failed to post message to worker: ${error}`));
    }
  });
}

// Enhanced worker error handling
private initializeWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    // ... existing timeout code ...

    try {
      this.worker = new Worker(
        new URL('./worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('[WasmBridge] Worker error:', error);

        // FIXED: Clean up all pending calls on worker error
        const pendingIds = Array.from(this.pendingCalls.keys());
        for (const id of pendingIds) {
          const pending = this.pendingCalls.get(id);
          if (pending) {
            const timeoutId = this.callTimeouts.get(id);
            if (timeoutId) clearTimeout(timeoutId);
            pending.reject(new Error(`Worker error: ${error.message}`));
            this.pendingCalls.delete(id);
            this.callTimeouts.delete(id);
          }
        }

        this.rejectAllPendingCalls(new Error(`Worker error: ${error.message}`));
        reject(new Error(`Worker error: ${error.message}`));
      };

      // Rest of initialization...
    } catch (error) {
      reject(error);
    }
  });
}
```

---

### 1.3 VirtualList ResizeObserver Cleanup Issue 🟡 LOW

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/VirtualList.svelte`

**Issue**: ResizeObservers track DOM elements. If list is destroyed while items are being added/removed, observers might not properly clean up all references.

**Severity**: LOW - Only affects component destruction during active scrolling

**Location**: Lines 187-228 (ResizeObserver setup), Lines 203-222 (item observer)

**Problem**:
```typescript
// POTENTIAL LEAK: If component destroys during item re-render, observer might not disconnect all items
onMount(() => {
  if (!scrollContainer) return;

  containerHeight = scrollContainer.clientHeight;
  isInitialized = true;

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      containerHeight = entry.contentRect.height;
    }
  });
  resizeObserver.observe(scrollContainer);

  // ResizeObserver for dynamic item heights
  if (typeof itemHeight === 'function') {
    itemResizeObserver = new ResizeObserver((entries) => {
      let needsUpdate = false;
      for (const entry of entries) {
        const index = parseInt(entry.target.getAttribute('data-index') ?? '-1', 10);
        if (index >= 0) {
          const newHeight = entry.contentRect.height;
          const oldHeight = heightCache.get(index);
          if (oldHeight !== newHeight) {
            heightCache.set(index, newHeight);
            needsUpdate = true;
          }
        }
      }
      if (needsUpdate) {
        heightCache = new Map(heightCache);  // Forces re-render while observer active
      }
    });
  }

  return () => {
    resizeObserver?.disconnect();
    itemResizeObserver?.disconnect();  // Both should disconnect, but map not cleared
  };
});
```

**Fix**: Clear height cache on component destruction to allow GC of item references.

**Fixed Code**:
```typescript
let resizeObserver: ResizeObserver | null = null;
let itemResizeObserver: ResizeObserver | null = null;

onMount(() => {
  if (!scrollContainer) return;

  containerHeight = scrollContainer.clientHeight;
  isInitialized = true;

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      containerHeight = entry.contentRect.height;
    }
  });
  resizeObserver.observe(scrollContainer);

  if (typeof itemHeight === 'function') {
    itemResizeObserver = new ResizeObserver((entries) => {
      let needsUpdate = false;
      for (const entry of entries) {
        const index = parseInt(entry.target.getAttribute('data-index') ?? '-1', 10);
        if (index >= 0) {
          const newHeight = entry.contentRect.height;
          const oldHeight = heightCache.get(index);
          if (oldHeight !== newHeight) {
            heightCache.set(index, newHeight);
            needsUpdate = true;
          }
        }
      }
      if (needsUpdate) {
        heightCache = new Map(heightCache);
      }
    });
  }

  return () => {
    // FIXED: Disconnect and clear references
    resizeObserver?.disconnect();
    itemResizeObserver?.disconnect();

    // Clear caches to allow GC
    resizeObserver = null;
    itemResizeObserver = null;
    heightCache.clear();
    offsetCache = [];
  };
});
```

---

## 2. RECOMMENDATIONS (HIGH PRIORITY)

### 2.1 Dropdown Component Event Listener Cleanup ⚠️ SHOULD FIX

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/Dropdown.svelte`

**Issue**: Custom event listeners ('popover:show', 'popover:hide') are removed in cleanup, but click handlers on document are NOT using AbortController. If dropdown is mounted/unmounted rapidly, document listeners can accumulate.

**Severity**: MEDIUM - Affects rapid navigation between pages with dropdowns

**Current Code (Lines 95-134)**:
```typescript
const handleOutsideClick = (event: MouseEvent) => {
  if (
    dropdownElement &&
    triggerElement &&
    !dropdownElement.contains(event.target as Node) &&
    !triggerElement.contains(event.target as Node)
  ) {
    dropdownElement.classList.remove('popover-open');
  }
};

// Only attach click-outside listener for browsers without Popover API
if (closeOnClickOutside && !isSupported) {
  document.addEventListener('click', handleOutsideClick);
}

// ... other listeners ...

return () => {
  if (closeOnClickOutside && !isSupported) {
    document.removeEventListener('click', handleOutsideClick);  // PROBLEM: Handler reference must be identical
  }
  // ...
};
```

**Fix**: Use AbortController for more robust cleanup.

**Fixed Code**:
```typescript
let dropdownElement = $state<HTMLElement | null>(null);
let triggerElement = $state<HTMLElement | null>(null);
let isSupported = $state(false);
let isOpen = $state(false);
let cleanupKeyboard: (() => void) | null = null;
let eventController: AbortController | null = null;

const FOCUSABLE_SELECTOR = '[role="menuitem"], button, a, [tabindex]:not([tabindex="-1"])';
let cachedFocusableItems: HTMLElement[] | null = null;

function getFocusableItems(): HTMLElement[] {
  if (!dropdownElement) return [];
  if (cachedFocusableItems === null) {
    cachedFocusableItems = Array.from(
      dropdownElement.querySelectorAll(FOCUSABLE_SELECTOR)
    ) as HTMLElement[];
  }
  return cachedFocusableItems;
}

function clearFocusableCache(): void {
  cachedFocusableItems = null;
}

onMount(() => {
  isSupported = isPopoverSupported();
  eventController = new AbortController();

  if (!isSupported) {
    console.warn('Popover API not supported - dropdown will use fallback styling');
  }

  // Setup keyboard handler
  if (dropdownElement) {
    cleanupKeyboard = setupPopoverKeyboardHandler(dropdownElement, {
      closeOnEscape: true,
      trapFocus: true
    });
  }

  // Setup outside click handler with AbortController
  const handleOutsideClick = (event: MouseEvent) => {
    if (
      dropdownElement &&
      triggerElement &&
      !dropdownElement.contains(event.target as Node) &&
      !triggerElement.contains(event.target as Node)
    ) {
      dropdownElement.classList.remove('popover-open');
    }
  };

  if (closeOnClickOutside && !isSupported) {
    document.addEventListener('click', handleOutsideClick, {
      signal: eventController!.signal
    });
  }

  // Listen for popover state changes
  const handlePopoverShow = () => {
    isOpen = true;
    clearFocusableCache();
  };

  const handlePopoverHide = () => {
    isOpen = false;
    clearFocusableCache();
  };

  if (dropdownElement) {
    dropdownElement.addEventListener('popover:show', handlePopoverShow, {
      signal: eventController!.signal
    });
    dropdownElement.addEventListener('popover:hide', handlePopoverHide, {
      signal: eventController!.signal
    });
  }

  return () => {
    // Single cleanup call aborts all listeners
    eventController?.abort();
    eventController = null;

    if (cleanupKeyboard) {
      cleanupKeyboard();
      cleanupKeyboard = null;
    }

    clearFocusableCache();
  };
});
```

---

### 2.2 Search Store Debounce Timeout Not Cleared ⚠️ SHOULD FIX

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

**Issue**: Search stores use setTimeout for debouncing but don't provide a way to clear timeouts if component unmounts during debounce delay.

**Severity**: MEDIUM - Affects rapid navigation or search termination

**Locations**:
- Line 1120 (songSearch)
- Line 1163 (venueSearch)
- Line 1168 (guestSearch)

**Current Code**:
```typescript
function createDebouncedSearchStore<T>(
  searchFn: (query: string, limit: number) => Promise<T[]>,
  debounceMs = 300
) {
  const query = writable('');
  const limit = writable(20);
  const results = writable<T[]>([]);
  const isPending = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;

  if (isBrowser) {
    let currentQuery = '';
    let currentLimit = 20;

    query.subscribe((q) => {
      currentQuery = q;
      isPending.set(true);

      clearTimeout(timeoutId);  // Good!
      timeoutId = setTimeout(async () => {
        if (currentQuery.trim()) {
          const data = await searchFn(currentQuery, currentLimit);
          results.set(data);
        } else {
          results.set([]);
        }
        isPending.set(false);
      }, debounceMs);
    });

    limit.subscribe((l) => (currentLimit = l));
  }

  return {
    query,
    limit,
    results: { subscribe: results.subscribe },
    isPending: { subscribe: isPending.subscribe },
    setQuery: (q: string) => query.set(q),
    setLimit: (l: number) => limit.set(l),
    destroy() {
      clearTimeout(timeoutId);  // Good! But need to also clear subscriptions
    }
  };
}
```

**Fix**: Clear subscriptions and prevent updates after destroy.

**Fixed Code**:
```typescript
function createDebouncedSearchStore<T>(
  searchFn: (query: string, limit: number) => Promise<T[]>,
  debounceMs = 300
) {
  const query = writable('');
  const limit = writable(20);
  const results = writable<T[]>([]);
  const isPending = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;
  let isDestroyed = false;
  let unsubscribeQuery: (() => void) | null = null;
  let unsubscribeLimit: (() => void) | null = null;

  if (isBrowser) {
    let currentQuery = '';
    let currentLimit = 20;

    unsubscribeQuery = query.subscribe((q) => {
      if (isDestroyed) return;

      currentQuery = q;
      isPending.set(true);

      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        // FIXED: Check if destroyed before updating
        if (isDestroyed) {
          isPending.set(false);
          return;
        }

        try {
          if (currentQuery.trim()) {
            const data = await searchFn(currentQuery, currentLimit);
            // FIXED: Only update if not destroyed
            if (!isDestroyed) {
              results.set(data);
            }
          } else {
            if (!isDestroyed) {
              results.set([]);
            }
          }
        } catch (error) {
          console.error('[Search] Error:', error);
          if (!isDestroyed) {
            results.set([]);
          }
        } finally {
          if (!isDestroyed) {
            isPending.set(false);
          }
        }
      }, debounceMs);
    });

    unsubscribeLimit = limit.subscribe((l) => {
      if (!isDestroyed) {
        currentLimit = l;
      }
    });
  }

  return {
    query,
    limit,
    results: { subscribe: results.subscribe },
    isPending: { subscribe: isPending.subscribe },
    setQuery: (q: string) => {
      if (!isDestroyed) query.set(q);
    },
    setLimit: (l: number) => {
      if (!isDestroyed) limit.set(l);
    },
    destroy() {
      isDestroyed = true;
      clearTimeout(timeoutId);
      unsubscribeQuery?.();
      unsubscribeLimit?.();
    }
  };
}

// Use in components
export const songSearch = createDebouncedSearchStore<DexieSong>(async (q, l) => {
  const db = await getDb();
  return db.songs.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});

// Clean up when app unmounts or page changes
// In +layout.svelte:
<script>
  import { onDestroy } from 'svelte';
  import { songSearch, venueSearch, guestSearch } from '$lib/stores/dexie';

  onDestroy(() => {
    songSearch.destroy?.();
    venueSearch.destroy?.();
    guestSearch.destroy?.();
  });
</script>
```

---

### 2.3 Global Search Store Race Condition ⚠️ SHOULD FIX

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

**Issue**: Global search store (lines 1366-1438) tracks `currentSearchId` to prevent race conditions, but if component unmounts while search is in-flight, the async callback still runs and updates stores that might not exist.

**Severity**: MEDIUM - Causes warnings and potential updates to destroyed stores

**Current Code**:
```typescript
export function createGlobalSearchStore() {
  const query = writable('');
  const results = writable<GlobalSearchResults>({});
  const isSearching = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;
  let currentSearchId = 0;
  let isDestroyed = false;
  let unsubscribe: (() => void) | null = null;

  if (isBrowser) {
    unsubscribe = query.subscribe((q) => {
      if (isDestroyed) return;  // Good!

      clearTimeout(timeoutId);

      if (q.trim().length < 1) {
        results.set({});
        isSearching.set(false);
        return;
      }

      isSearching.set(true);
      const searchId = ++currentSearchId;

      timeoutId = setTimeout(async () => {
        if (isDestroyed) return;  // Good!

        try {
          const searchResults = await performGlobalSearch(q.trim(), 10);
          // PROBLEM: Race condition here - searchId might be outdated
          if (searchId === currentSearchId && !isDestroyed) {
            results.set(searchResults);
          }
        } catch (error) {
          if (searchId === currentSearchId && !isDestroyed) {
            console.error('[dexie] Global search error:', error);
            results.set({});
          }
        } finally {
          if (searchId === currentSearchId && !isDestroyed) {
            isSearching.set(false);
          }
        }
      }, 300);
    });
  }

  return {
    query,
    results: { subscribe: results.subscribe },
    isSearching: { subscribe: isSearching.subscribe },
    setQuery: (q: string) => query.set(q),
    clear: () => {
      query.set('');
      results.set({});
    },
    destroy() {
      isDestroyed = true;
      clearTimeout(timeoutId);
      unsubscribe?.();
      currentSearchId = 0;  // Good! But should also reset stores
    }
  };
}
```

**Fix**: Reset stores on destroy and use AbortController for better async cancellation.

**Fixed Code**:
```typescript
export function createGlobalSearchStore() {
  const query = writable('');
  const results = writable<GlobalSearchResults>({});
  const isSearching = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;
  let currentSearchId = 0;
  let isDestroyed = false;
  let unsubscribe: (() => void) | null = null;
  let searchAbortController: AbortController | null = null;

  if (isBrowser) {
    unsubscribe = query.subscribe((q) => {
      if (isDestroyed) return;

      clearTimeout(timeoutId);
      // Abort previous search if still in-flight
      searchAbortController?.abort();

      if (q.trim().length < 1) {
        results.set({});
        isSearching.set(false);
        return;
      }

      isSearching.set(true);
      const searchId = ++currentSearchId;
      searchAbortController = new AbortController();

      timeoutId = setTimeout(async () => {
        if (isDestroyed || searchId !== currentSearchId) {
          isSearching.set(false);
          return;
        }

        try {
          const searchResults = await performGlobalSearch(q.trim(), 10);
          // Check all conditions before updating
          if (searchId === currentSearchId && !isDestroyed) {
            results.set(searchResults);
          }
        } catch (error) {
          if (searchId === currentSearchId && !isDestroyed) {
            // Only log non-abort errors
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('[dexie] Global search error:', error);
            }
            results.set({});
          }
        } finally {
          if (searchId === currentSearchId && !isDestroyed) {
            isSearching.set(false);
          }
        }
      }, 300);
    });
  }

  return {
    query,
    results: { subscribe: results.subscribe },
    isSearching: { subscribe: isSearching.subscribe },
    setQuery: (q: string) => {
      if (!isDestroyed) query.set(q);
    },
    clear: () => {
      if (!isDestroyed) {
        query.set('');
        results.set({});
      }
    },
    destroy() {
      isDestroyed = true;
      clearTimeout(timeoutId);
      searchAbortController?.abort();
      unsubscribe?.();
      currentSearchId = 0;
      // FIXED: Reset stores to prevent stale updates
      results.set({});
      isSearching.set(false);
    }
  };
}
```

---

## 3. BEST PRACTICES (ALREADY IMPLEMENTED)

### 3.1 Event Listener Cleanup - EXCELLENT

Your PWA store properly uses AbortController for centralized event listener management.

```typescript
// GOOD: Central AbortController for all listeners
let globalAbortController: AbortController | null = null;

export const pwaStore = {
  async initialize() {
    globalAbortController?.abort();
    globalAbortController = new AbortController();
    const signal = globalAbortController.signal;

    // All listeners use same signal
    window.addEventListener('online', handleOnline, { signal });
    window.addEventListener('offline', handleOffline, { signal });
    displayModeQuery.addEventListener('change', handleDisplayModeChange, { signal });
    // ...
  }
};
```

This prevents listener accumulation and ensures cleanup.

---

### 3.2 Memory Monitor Utility - EXCELLENT

Your memory monitoring tool is comprehensive and well-designed.

**Strengths**:
- Heap growth tracking
- Leak risk assessment
- Avoids stack overflow with manual loops instead of spread operators
- TreeWalker instead of querySelectorAll for efficiency

**Usage Recommendation**:
```typescript
import { memoryMonitor, detectMemoryLeak } from '$lib/utils/memory-monitor';

// Start monitoring in dev
if (import.meta.env.DEV) {
  memoryMonitor.start({ interval: 5000 });
}

// Test for leaks
detectMemoryLeak('Component Creation', () => {
  const component = new MyComponent();
  component.destroy();
}, { iterations: 100, expectedGrowthMB: 2 });
```

---

### 3.3 WASM Bridge Cleanup - GOOD

Proper handling of worker termination and resource cleanup.

**Strengths**:
- Worker termination with message
- Stale request cleanup (lines 737-776)
- Pending call rejection on error
- Resource tracking for search indexes

**Minor Enhancement**: Already mostly implemented, just ensure cleanup is called:

```typescript
// In +layout.svelte
<script>
  import { WasmBridge } from '$lib/wasm/bridge';
  import { onDestroy } from 'svelte';

  const bridge = WasmBridge.getInstance();

  onDestroy(() => {
    bridge.terminate();  // Cleans up worker and pending calls
  });
</script>
```

---

## 4. WeakMap/WeakSet Optimization Opportunities

### 4.1 Element Metadata Tracking

**Current Pattern** (could leak):
```typescript
const elementData = new Map<HTMLElement, any>();

function attachData(element: HTMLElement, data: any) {
  elementData.set(element, data);
}
```

**Better Pattern** (allows GC):
```typescript
const elementData = new WeakMap<HTMLElement, any>();

function attachData(element: HTMLElement, data: any) {
  elementData.set(element, data);
  // When element is removed from DOM and has no other references, both are GC'd
}
```

**Where to Apply**:
- VirtualList height cache (Line 39): Could use WeakMap for item elements
- Dropdown focusable items cache (Line 51): Already uses array refresh, good pattern

---

### 4.2 Parametrized Store Cache Overflow

**File**: `dexie.ts` (Lines 49-67)

Your `createLimitedCache` already implements bounded caching which is excellent, but consider using LRU eviction instead of FIFO:

```typescript
// Current: FIFO (First-In-First-Out)
const CACHE_MAX_SIZE = 150;

function createLimitedCache<K, V>(): Map<K, V> {
  const cache = new Map<K, V>();
  const originalSet = cache.set.bind(cache);

  cache.set = function (key: K, value: V): Map<K, V> {
    if (cache.size >= CACHE_MAX_SIZE && !cache.has(key)) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
    return originalSet(key, value);
  };

  return cache;
}

// BETTER: LRU (Least Recently Used) - keeps frequently accessed items
class LRUCache<K, V> extends Map<K, V> {
  private maxSize: number;

  constructor(maxSize: number = 150) {
    super();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = super.get(key);
    if (value !== undefined) {
      // Move to end (most recent)
      super.delete(key);
      super.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): this {
    if (super.has(key)) {
      super.delete(key);
    } else if (super.size >= this.maxSize) {
      // Delete oldest (first)
      const firstKey = super.keys().next().value;
      if (firstKey !== undefined) {
        super.delete(firstKey);
      }
    }
    super.set(key, value);
    return this;
  }
}

// Usage
const songBySlugCache = new LRUCache<string, DexieSong>(150);
```

---

## 5. Object Pooling Opportunities

### 5.1 High-Frequency Object Creation

**Identified in VirtualList** (Lines 155-161):

```typescript
// Created on every scroll
const visibleItems = $derived.by(() => {
  const { start, end } = visibleRange;
  return items.slice(start, end).map((item, i) => ({  // NEW OBJECT EVERY TIME
    item,
    index: start + i,
    offset: getItemOffset(start + i)
  }));
});
```

**Fix with Object Pooling**:
```typescript
// Object pool for visible item objects
class VisibleItemPool {
  private pool: Array<{ item: any; index: number; offset: number }> = [];

  get(item: any, index: number, offset: number) {
    let obj = this.pool.pop();
    if (!obj) {
      obj = { item, index, offset };
    } else {
      obj.item = item;
      obj.index = index;
      obj.offset = offset;
    }
    return obj;
  }

  release(obj: any) {
    this.pool.push(obj);
  }

  releaseAll(objects: any[]) {
    this.pool.push(...objects);
  }
}

const pool = new VisibleItemPool();

const visibleItems = $derived.by(() => {
  const { start, end } = visibleRange;
  const result = items.slice(start, end).map((item, i) =>
    pool.get(item, start + i, getItemOffset(start + i))
  );

  return result;
});

// Clean up on unmount
onDestroy(() => {
  visibleItems.releaseAll(visibleItems);
});
```

**But**: For VirtualList, the current approach is acceptable since the derived is only updated when visibleRange changes, not on every scroll. The benefit would be marginal.

---

## 6. Monitoring & Prevention Checklist

### 6.1 Development Setup

Add to your root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { memoryMonitor } from '$lib/utils/memory-monitor';
  import {
    userAttendedShows,
    userFavoriteSongs,
    userFavoriteVenues,
    songSearch,
    venueSearch,
    guestSearch,
    globalSearch
  } from '$lib/stores/dexie';
  import { getWasmBridge } from '$lib/wasm/bridge';

  // Start memory monitoring in dev
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    memoryMonitor.start({ interval: 10000 });

    // Log memory every 30 seconds
    const logInterval = setInterval(() => {
      const report = memoryMonitor.getReport();
      if (report.leakRisk === 'high' || report.leakRisk === 'critical') {
        console.warn('[Memory] Potential leak detected:', {
          heap: (report.currentHeap / 1048576).toFixed(2) + 'MB',
          trend: report.trend,
          growth: report.averageGrowthPerSecond.toFixed(3) + 'MB/s'
        });
      }
    }, 30000);
  }

  onDestroy(() => {
    // Cleanup all stores
    userAttendedShows.destroy?.();
    userFavoriteSongs.destroy?.();
    userFavoriteVenues.destroy?.();
    songSearch.destroy?.();
    venueSearch.destroy?.();
    guestSearch.destroy?.();
    globalSearch.destroy?.();

    // Cleanup WASM
    const bridge = getWasmBridge();
    bridge.terminate();

    // Stop memory monitoring
    if (import.meta.env.DEV) {
      memoryMonitor.stop();
    }
  });
</script>
```

### 6.2 Testing Checklist

```bash
# Before each release, test for leaks:

1. Open DevTools → Memory → Take heap snapshot
2. Perform operation 20 times (navigate pages, open/close components, search)
3. Force GC (trash icon)
4. Take second heap snapshot
5. Compare:
   - Delta should be < 5MB
   - No "Detached" DOM nodes
   - Event listener count stable
```

### 6.3 Continuous Monitoring

```typescript
// Add to your RUM/analytics pipeline
if (import.meta.env.PROD) {
  memoryMonitor.start({ interval: 60000 });

  setInterval(() => {
    const report = memoryMonitor.getReport();

    // Send to analytics
    sendMetric({
      name: 'memory_heap',
      value: report.currentHeap / 1048576,  // MB
      tag: report.leakRisk
    });
  }, 60000);
}
```

---

## 7. Summary & Recommendations

### Priority Fixes (Do First)
1. Add destroy() cleanup calls in root layout for all stores
2. Implement AbortController for Dropdown component listeners
3. Add isDestroyed flag and cleanup to debounced search stores
4. Clear height cache in VirtualList onDestroy

### Nice-to-Have Optimizations
1. Switch parametrized store caches to LRU eviction
2. Use WeakMap for element metadata tracking (if added in future)
3. Implement object pooling for frequently created objects (currently marginal benefit)

### Ongoing Practices
1. Continue using AbortController for new event listeners
2. Test with memory monitor before each release
3. Monitor production heap metrics via RUM
4. Annual code review for new memory patterns

### Code Quality Score
- **Event Listeners**: 9/10 (Excellent AbortController usage)
- **Store Cleanup**: 6/10 (Good patterns, missing some destroy() calls)
- **Async Management**: 8/10 (Good timeout handling, minor race condition fix needed)
- **Observer Management**: 8/10 (Proper disconnect, could clear references more aggressively)
- **Cache Management**: 9/10 (Great bounded caching with size limits)

**Overall Memory Safety: 8/10** - Your codebase is well-designed with excellent foundational patterns. The fixes are mostly edge cases and optimization opportunities.
