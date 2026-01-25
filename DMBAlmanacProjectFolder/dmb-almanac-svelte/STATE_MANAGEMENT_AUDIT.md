# DMB Almanac Svelte - State Management Audit Report

**Project**: DMB Almanac Svelte
**Audit Date**: 2026-01-22
**Framework**: SvelteKit 2 + Svelte 5
**Scope**: State management patterns, stores, runes, persistence, and synchronization

---

## Executive Summary

The DMB Almanac app demonstrates **excellent state management architecture** with a well-structured approach to global, local, and derived state using Svelte 5 runes. The implementation shows strong patterns for:

- Svelte 5 runes adoption ($state, $derived, $effect)
- IndexedDB + Dexie.js integration
- Progressive Web App state
- WASM integration with state management
- Proper separation of concerns

**Overall Score: 8.5/10**

### Key Strengths
- Clean Svelte 5 rune adoption
- Excellent caching and optimization patterns
- Proper lifecycle management
- Strong PWA state handling
- WASM integration well-designed

### Areas for Improvement
- Limited error recovery patterns
- No explicit state persistence layer
- Derived state computation could be optimized in some components
- Store initialization timing can be fragile

---

## 1. Svelte 5 Runes Usage

### Current Implementation: Grade A

The app demonstrates excellent adoption of Svelte 5 runes in components:

```svelte
<!-- ✅ GOOD: Using $derived.by for expensive computations -->
const groupedShows = $derived.by(() => {
  const shows = $allShows;
  if (!shows) return {};
  // Memoized computation
  return grouped;
});

<!-- ✅ GOOD: $derived for derived values -->
const years = $derived(Object.keys(groupedShows).map(Number).sort(...));

<!-- ✅ GOOD: $effect for reactive side effects -->
$effect(() => {
  if (browser && $pwaState.isOffline) {
    document.documentElement.setAttribute('data-offline', '');
  }
});
```

### Issues Found

**1. Store Subscription Inconsistency** (Minor)

File: `/src/routes/+layout.svelte` (Lines 79-93)

```svelte
// Mixed approach: using both store subscriptions and $effect
$effect(() => {
  if (browser && $pwaState.isOffline) {
    document.documentElement.setAttribute('data-offline', '');
  }
});
```

**Problem**: While this works, mixing `$effect` with store subscriptions can be confusing.

**Solution**: Standardize on one approach or document why mixed.

```svelte
<!-- Recommended: Cleaner with explicit store access -->
$effect(() => {
  const pwaState = $pwaState;
  if (browser && pwaState.isOffline) {
    document.documentElement.setAttribute('data-offline', '');
  }
});
```

**2. Reactive Updates in Containers** (Minor)

File: `/src/routes/shows/+page.svelte` (Lines 88)

```svelte
const isLoading = $derived(!$allShows || !$globalStats);
```

**Problem**: This re-derives on every parent component update, even if data hasn't changed.

**Solution**: Add more specific guards:

```svelte
const isLoading = $derived.by(() => {
  return !$allShows?.length || !$globalStats;
});
```

---

## 2. Store Architecture Review

### 2.1 Global Stores

The app uses 4 primary global store categories:

#### A. Data Stores (Dexie + IndexedDB)

**File**: `/src/lib/stores/dexie.ts` (1,735 lines)

**Status**: Excellent

**Key Features**:
- LiveQuery integration for reactive updates
- Parameterized stores with caching
- Size-limited cache (50 entries max)
- Transaction support for consistency

```typescript
// ✅ EXCELLENT: Factory pattern with cache management
function createLiveQueryStore<T>(
  queryFn: () => Promise<T>,
  initialValue: T | undefined = undefined
) {
  return readable<T | undefined>(initialValue, (set) => {
    if (!isBrowser) return; // SSR safety
    let subscription: { unsubscribe: () => void } | null = null;

    const observable = liveQuery(queryFn);
    subscription = observable.subscribe({
      next: (value) => set(value),
      error: (err) => {
        // Graceful error handling
        window.dispatchEvent(new CustomEvent('dexie-query-error', {
          detail: { error: err }
        }));
      }
    });

    return () => { subscription?.unsubscribe(); };
  });
}
```

**Issues**:

1. **Warning: allShows and allSongs Loading**

   Lines 142-222:

   ```typescript
   // ❌ WARNING: Loads ALL records into memory
   export const allSongs = createLiveQueryStore<DexieSong[]>(async () => {
     const db = await getDb();
     return db.transaction('r', db.songs, () =>
       db.songs.orderBy('sortTitle').toArray()
     );
   });
   ```

   **Problem**: App has 10K+ songs/shows. This loads everything into memory on every subscription.

   **Impact**:
   - Memory bloat (high)
   - Unnecessary re-renders (medium)
   - Slow initial load (medium)

   **Recommendation**: Use pagination stores instead:

   ```typescript
   // Instead of loading all, use pagination
   const paginatedSongs = createPaginatedSongsStore(50);
   ```

2. **Cache Invalidation Complexity**

   Lines 893-971:

   The cache system has ~15 different cache clearing functions which creates cognitive load.

   **Recommendation**: Group related caches:

   ```typescript
   const cacheGroups = {
     songs: [songBySlug, songById, songRecentShows],
     shows: [showById, showWithSetlist, adjacentShows],
     venues: [venueById, venueShows]
   };

   export function clearCacheGroup(group: keyof typeof cacheGroups) {
     cacheGroups[group].forEach(cache => cache.clear());
   }
   ```

#### B. PWA Store

**File**: `/src/lib/stores/pwa.ts` (187 lines)

**Status**: Good (7/10)

**Key Features**:
- Service Worker registration
- Online/offline tracking
- Display mode monitoring
- Update notifications

**Issues**:

1. **Event Listener Cleanup Fragility**

   Lines 105-124:

   ```typescript
   // ⚠️ FRAGILE: Manual cleanup tracking
   let cleanupFunctions: (() => void)[] = [];

   const handleUpdateFound = () => {
     // ...
     cleanupFunctions.push(() => {
       newWorker.removeEventListener('statechange', handleStateChange);
     });
   };
   ```

   **Problem**: Nested listeners require manual tracking. One missed listener causes memory leaks.

   **Recommendation**: Use AbortController for all listeners:

   ```typescript
   const controller = new AbortController();

   // All listeners automatically cleaned up by abort
   window.addEventListener('online', handleOnline, {
     signal: controller.signal
   });

   newWorker.addEventListener('statechange', handleStateChange, {
     signal: controller.signal
   });
   ```

2. **Missing Error Recovery**

   Line 128:

   ```typescript
   const handleControllerChange = () => {
     window.location.reload(); // Hard refresh
   };
   ```

   **Problem**: On SW update, hard reload loses client state.

   **Recommendation**: Use View Transitions and state preservation:

   ```typescript
   const handleControllerChange = async () => {
     if (document.startViewTransition) {
       await document.startViewTransition(() => {
         window.location.reload();
       });
     } else {
       window.location.reload();
     }
   };
   ```

#### C. Data Loading Store

**File**: `/src/lib/stores/data.ts` (110 lines)

**Status**: Good (7.5/10)

**Key Features**:
- Loading state management
- Progress tracking
- Error states
- Retry capability

**Issues**:

1. **No Error Context**

   Lines 82-91:

   ```typescript
   catch (error) {
     progress.set({
       phase: 'error',
       error: error instanceof Error ? error.message : 'Unknown error'
       // ❌ Missing: error type, context, suggestion
     });
   }
   ```

   **Recommendation**: Enhance error context:

   ```typescript
   export interface LoadError {
     type: 'network' | 'parse' | 'validation' | 'unknown';
     message: string;
     code?: string;
     retryable: boolean;
     suggestion?: string;
   }

   // Better error handling
   catch (error) {
     const errorInfo = classifyError(error);
     progress.set({
       phase: 'error',
       error: errorInfo,
       canRetry: errorInfo.retryable
     });
   }
   ```

#### D. Navigation Store

**File**: `/src/lib/stores/navigation.ts` (183 lines)

**Status**: Excellent (8.5/10)

**Key Features**:
- Navigation API integration
- History management
- Loading state tracking
- Back/forward capabilities

**Minor Issue**: No timeout handling for stuck navigation:

```typescript
// Add timeout guard
async function goTo(url: string, state?: unknown): Promise<void> {
  const timeoutId = setTimeout(() => {
    console.warn('Navigation timeout');
    update(s => ({ ...s, isNavigating: false }));
  }, 30000);

  try {
    // ... navigation logic
  } finally {
    clearTimeout(timeoutId);
  }
}
```

#### E. WASM Store

**File**: `/src/lib/wasm/stores.ts` (500 lines)

**Status**: Excellent (9/10)

**Key Features**:
- Async WASM operation tracking
- Request deduplication
- Error recovery
- Fallback support

**Issue**: Minimal - Very well designed

---

## 3. Global vs Local State

### Distribution Analysis

| State Type | Location | Quality | Count |
|-----------|----------|---------|-------|
| **Global** | `/src/lib/stores/` | 9/10 | ~50 stores |
| **Local** | Component `$state` | 8/10 | ~100+ instances |
| **Derived** | `$derived` / `$derived.by` | 8.5/10 | ~80+ instances |
| **Route** | `+page.server.ts` | 8/10 | ~15 routes |

### Best Practices Observed

1. **✅ Good**: Server-side data loading for LCP

   ```typescript
   // +page.svelte
   let { data } = $props();
   const stats = $derived(data?.globalStats ?? $clientGlobalStats);
   ```

2. **✅ Good**: Fallback to client stores

   ```typescript
   const stats = $derived(data?.globalStats ?? $clientGlobalStats);
   ```

3. **✅ Good**: Local component state for UI

   ```svelte
   <script>
     let _mounted = $state(false);
     let _rumInitialized = $state(false);
   </script>
   ```

### Areas for Improvement

**1. Modal/Dialog State** (Minor)

Many UI state scattered in components:

```svelte
// Multiple places doing this
let isOpen = $state(false);
let selectedItem = $state(null);
```

**Recommendation**: Create a UI state store:

```typescript
// src/lib/stores/ui.ts
export const createUIStore = () => {
  const modals = $state(new Map<string, boolean>());
  const sidebars = $state(new Map<string, boolean>());

  return {
    toggleModal: (id: string) => modals.set(id, !modals.get(id)),
    openModal: (id: string) => modals.set(id, true),
    closeModal: (id: string) => modals.set(id, false),
  };
};

export const uiStore = createUIStore();
```

**2. Form State Management** (Minor)

No centralized form state pattern for complex forms.

**Recommendation**: Add form helper:

```typescript
export function createFormStore<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
) {
  const values = writable(initialValues);
  const touched = writable<Partial<Record<keyof T, boolean>>>({});
  const errors = writable<Partial<Record<keyof T, string>>>({});
  const isSubmitting = writable(false);

  return {
    values: { subscribe: values.subscribe },
    touched: { subscribe: touched.subscribe },
    errors: { subscribe: errors.subscribe },
    isSubmitting: { subscribe: isSubmitting.subscribe },
    setValue: (field: keyof T, value: any) =>
      values.update(v => ({ ...v, [field]: value })),
    setTouched: (field: keyof T) =>
      touched.update(t => ({ ...t, [field]: true })),
    setError: (field: keyof T, error: string) =>
      errors.update(e => ({ ...e, [field]: error })),
    async submit() {
      isSubmitting.set(true);
      try {
        await onSubmit(get(values));
      } finally {
        isSubmitting.set(false);
      }
    }
  };
}
```

---

## 4. State Persistence

### Current Implementation

**Dexie.js** provides automatic persistence to IndexedDB:

```typescript
// Lines 71-78 in dexie.ts
async function getDb() {
  if (!isBrowser) throw new Error('Cannot access database on server');
  if (!dbPromise) {
    dbPromise = import('$db/dexie/db');
  }
  const { getDb: getDbInstance } = await dbPromise;
  return getDbInstance();
}
```

### Issues

**1. No Explicit Versioning Strategy**

Problem: Schema migrations aren't visible in stores.

**Recommendation**: Add schema versioning:

```typescript
// src/lib/stores/persistence.ts
export interface PersistenceMetadata {
  schemaVersion: number;
  lastMigration: number;
  lastSync: number;
}

export const persistenceMetadata = createLiveQueryStore(async () => {
  const db = await getDb();
  return db.getSyncMeta();
});

export async function migrate(fromVersion: number, toVersion: number) {
  const db = await getDb();

  if (fromVersion < toVersion) {
    // Run migrations in sequence
    for (let v = fromVersion + 1; v <= toVersion; v++) {
      await runMigration(db, v);
    }
  }
}
```

**2. No Selective Persistence**

All user data persists to IndexedDB, but complex queries don't.

**Recommendation**: Add selective persistence:

```typescript
export interface PersistenceConfig {
  table: string;
  maxEntries?: number;
  ttlMs?: number;
  strategy: 'all' | 'recent' | 'filtered';
}

export function createPersistentStore<T>(
  queryFn: () => Promise<T>,
  config: PersistenceConfig
) {
  // ...
}
```

**3. No Clear User Data Lifecycle**

User data (favorites, attended shows) persists indefinitely.

**Recommendation**: Add TTL and cleanup:

```typescript
export const userAttendedShows = createUserAttendedShowsStore({
  ttlMs: 90 * 24 * 60 * 60 * 1000, // 90 days
  onExpire: async (show) => {
    console.log('Removing old show:', show.id);
    await db.userAttendedShows.delete(show.id);
  }
});
```

---

## 5. Derived State Patterns

### Current Implementation: Grade 8/10

The app uses Svelte 5 `$derived` extensively:

**Good Examples**:

```typescript
// ✅ Simple derived
const doubled = $derived(count * 2);

// ✅ Complex computed with $derived.by
const groupedShows = $derived.by(() => {
  // Memoized computation
  return computeGrouping($allShows);
});

// ✅ Chained derivation
const hasMoreShows = $derived($allShows?.length > 10);
```

### Issues

**1. Over-derivation in Parent Component**

File: `/src/routes/+layout.svelte` (Lines 104-130)

```svelte
$effect(() => {
  if (browser && !_rumInitialized && $dataState.status === 'ready') {
    setTimeout(() => {
      initRUM({ /* ... */ });
      _rumInitialized = true;
    }, 100);
  }
});
```

**Problem**: Should be in child component or separate effect.

**Solution**: Extract to lifecycle:

```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    const unsubscribe = dataState.subscribe(state => {
      if (state.status === 'ready' && !_rumInitialized) {
        initRUM({ /* ... */ });
        _rumInitialized = true;
      }
    });
    return unsubscribe;
  });
</script>
```

**2. Circular Derivations Risk**

If not careful, complex derived stores can create circular dependencies:

```typescript
// ⚠️ RISK: store1 depends on store2, store2 depends on store1
export const store1 = derived(store2, ...);
export const store2 = derived(store1, ...);
```

**Mitigation**: Add derivation depth tracking:

```typescript
const MAX_DERIVATION_DEPTH = 5;

export function trackDerivedDepth(
  storeName: string,
  dependencies: string[]
): void {
  // Track and warn if depth exceeds threshold
}
```

---

## 6. State Synchronization

### Current Approach

**Uni-directional data flow**:
```
Server (SQLite) → Dexie (IndexedDB) → Components → UI
```

### Issues

**1. No Two-Way Sync Strategy**

Problem: Client changes don't sync back to server.

Current handling:
```typescript
// User marks show as attended
async add(showId: number) {
  await db.userAttendedShows.add({ showId, ... });
  invalidateUserDataCaches();
}
```

**But**: No mechanism to sync back to server.

**Recommendation**: Implement sync queue:

```typescript
// src/lib/stores/syncQueue.ts
export interface SyncQueueItem {
  id: string;
  operation: 'add' | 'update' | 'delete';
  table: string;
  data: unknown;
  status: 'pending' | 'synced' | 'failed';
  attempts: number;
  lastError?: string;
}

export function createSyncQueueStore() {
  const queue = writable<SyncQueueItem[]>([]);
  const isSync = writable(false);

  async function processQueue() {
    isSync.set(true);
    const items = get(queue);

    for (const item of items) {
      if (item.status !== 'pending') continue;

      try {
        await fetch('/api/sync', {
          method: 'POST',
          body: JSON.stringify(item)
        });

        queue.update(q =>
          q.map(it =>
            it.id === item.id ? { ...it, status: 'synced' } : it
          )
        );
      } catch (err) {
        queue.update(q =>
          q.map(it =>
            it.id === item.id
              ? { ...it, attempts: it.attempts + 1, lastError: String(err) }
              : it
          )
        );
      }
    }

    isSync.set(false);
  }

  return {
    queue: { subscribe: queue.subscribe },
    isSync: { subscribe: isSync.subscribe },
    add: (item: Omit<SyncQueueItem, 'id' | 'status' | 'attempts'>) => {
      queue.update(q => [...q, {
        ...item,
        id: crypto.randomUUID(),
        status: 'pending',
        attempts: 0
      }]);
    },
    processQueue
  };
}

export const syncQueue = createSyncQueueStore();
```

**2. No Conflict Resolution**

If user edits data offline and server has newer data:
- No strategy for which version wins
- No merge capability

**Recommendation**: Add conflict resolution:

```typescript
export interface SyncConflict {
  id: string;
  clientVersion: unknown;
  serverVersion: unknown;
  resolvedVersion?: unknown;
  resolution: 'client' | 'server' | 'merge' | 'manual';
}

export function resolveSyncConflict(
  conflict: SyncConflict,
  strategy: 'client' | 'server' | 'merge' | ((c: SyncConflict) => unknown)
): unknown {
  if (typeof strategy === 'function') {
    return strategy(conflict);
  }

  switch (strategy) {
    case 'client':
      return conflict.clientVersion;
    case 'server':
      return conflict.serverVersion;
    case 'merge':
      return mergeObjects(conflict.clientVersion, conflict.serverVersion);
    default:
      return conflict.clientVersion;
  }
}
```

**3. No Optimistic Updates**

User actions wait for server round-trip before UI updates.

**Recommendation**: Implement optimistic updates:

```typescript
export function createOptimisticStore<T>(
  queryFn: () => Promise<T>,
  updateFn: (item: T) => Promise<void>
) {
  const store = createLiveQueryStore(queryFn);

  return {
    subscribe: store.subscribe,

    async optimisticUpdate(updater: (value: T) => T) {
      // 1. Update locally immediately
      const optimistic = updater(get(store));
      store.set(optimistic);

      // 2. Send to server
      try {
        await updateFn(optimistic);
        // Refresh from server
        const fresh = await queryFn();
        store.set(fresh);
      } catch (err) {
        // Rollback on error
        const current = await queryFn();
        store.set(current);
        throw err;
      }
    }
  };
}
```

---

## 7. Performance Optimization

### Current State

**Strong points**:
- Dexie indexes on frequently queried fields
- Lazy-loaded database instance
- Limited cache sizes (50 entries)
- Parameterized stores avoid redundant queries

### Recommendations

**1. Add Store Performance Monitoring**

```typescript
// src/lib/stores/monitoring.ts
export interface StoreMetrics {
  storeName: string;
  subscriptionCount: number;
  updateCount: number;
  cacheHitRate: number;
  averageUpdateTime: number;
}

export function createMonitoredStore<T>(
  name: string,
  store: Readable<T>
): Readable<T> {
  let subscriptionCount = 0;
  let updateCount = 0;
  let cacheHits = 0;
  let cacheMisses = 0;

  const metrics = writable<StoreMetrics>({
    storeName: name,
    subscriptionCount: 0,
    updateCount: 0,
    cacheHitRate: 0,
    averageUpdateTime: 0
  });

  // Wrap store with metrics
  return {
    subscribe(fn) {
      subscriptionCount++;
      metrics.update(m => ({ ...m, subscriptionCount }));

      return store.subscribe(fn);
    }
  };
}
```

**2. Add Store Size Warnings**

```typescript
export function createLimitedCacheWithWarnings<K, V>(
  maxSize = 50,
  warningThreshold = 40
) {
  const cache = new Map<K, V>();
  let evictions = 0;

  cache.set = function(key: K, value: V) {
    if (cache.size >= maxSize && !cache.has(key)) {
      evictions++;
      if (evictions % 10 === 0) {
        console.warn(`[Cache] High eviction rate: ${evictions} evictions`);
      }
    }
    return Map.prototype.set.call(this, key, value);
  };

  return cache;
}
```

---

## 8. Error Handling

### Current Issues

**1. Weak Error Recovery** (Medium Priority)

Most stores have basic error handling but no recovery:

```typescript
// ❌ CURRENT: Errors logged but not recoverable
error: (err) => {
  console.error('[dexie] liveQuery error:', err);
  window.dispatchEvent(new CustomEvent('dexie-query-error', {
    detail: { error: err }
  }));
}
```

**Recommendation**: Add retry logic:

```typescript
interface StoreError {
  error: Error;
  retryable: boolean;
  retryCount: number;
  lastRetry: number;
}

export function createResilientStore<T>(
  queryFn: () => Promise<T>,
  options = { maxRetries: 3, retryDelayMs: 1000 }
) {
  const error = writable<StoreError | null>(null);

  async function executeWithRetry(attempt = 0): Promise<T | undefined> {
    try {
      return await queryFn();
    } catch (err) {
      if (attempt < options.maxRetries) {
        await new Promise(r =>
          setTimeout(r, options.retryDelayMs * Math.pow(2, attempt))
        );
        return executeWithRetry(attempt + 1);
      }

      error.set({
        error: err instanceof Error ? err : new Error(String(err)),
        retryable: attempt < options.maxRetries,
        retryCount: attempt,
        lastRetry: Date.now()
      });

      return undefined;
    }
  }

  return {
    subscribe: readable(undefined, set => {
      executeWithRetry().then(result => result && set(result));
    }).subscribe,
    error: { subscribe: error.subscribe },
    retry: () => executeWithRetry()
  };
}
```

**2. No Error Boundary Integration**

Data loading errors don't gracefully fallback.

**Recommendation**: Add error boundary detection:

```typescript
export function useErrorBoundary() {
  let isCaught = $state(false);
  let error: Error | null = $state(null);

  return {
    catch(err: Error) {
      isCaught = true;
      error = err;
    },
    reset() {
      isCaught = false;
      error = null;
    },
    isCaught: () => isCaught,
    error: () => error
  };
}
```

---

## 9. Testing & Debugging

### Current Capabilities

**Strengths**:
- Store structure is highly testable
- Dexie stores are isolated from components
- Transaction support enables atomic testing

### Gaps

**1. No Store Testing Utilities**

**Recommendation**: Create test helpers:

```typescript
// src/lib/stores/__test__/helpers.ts
export async function createTestDb() {
  const db = new Dexie('test-db');
  db.version(1).stores({
    songs: 'id, slug',
    shows: 'id, date'
  });
  return db;
}

export function mockLiveQuery<T>(data: T) {
  return {
    subscribe: (subscriber) => {
      subscriber.next(data);
      return { unsubscribe: () => {} };
    }
  };
}

export function createTestStore<T>(initialValue: T) {
  return readable(initialValue);
}
```

**2. No DevTools Integration**

Unlike Redux/Zustand, no time-travel debugging.

**Recommendation**: Add store debugging:

```typescript
// src/lib/stores/devtools.ts
export function enableStoreDevTools() {
  if (!window.__DMB_STORES__) {
    window.__DMB_STORES__ = {
      history: [],
      maxHistory: 100,
      recording: true
    };
  }

  window.__DMB_STORES__.recordAction = (store, action, oldValue, newValue) => {
    if (!window.__DMB_STORES__.recording) return;

    const entry = {
      timestamp: Date.now(),
      store,
      action,
      oldValue,
      newValue
    };

    window.__DMB_STORES__.history.push(entry);
    if (window.__DMB_STORES__.history.length > 100) {
      window.__DMB_STORES__.history.shift();
    }
  };

  return window.__DMB_STORES__;
}
```

---

## 10. Recommendations Summary

### High Priority

| Issue | Impact | Effort | Fix |
|-------|--------|--------|-----|
| Replace `allShows`/`allSongs` with pagination | HIGH | MEDIUM | Use `createPaginatedShowsStore()` |
| Add sync queue for offline mutations | HIGH | HIGH | Implement SyncQueueStore |
| Enhance error recovery | HIGH | MEDIUM | Add resilient store wrapper |
| Add conflict resolution strategy | HIGH | HIGH | Design merge algorithms |

### Medium Priority

| Issue | Impact | Effort | Fix |
|-------|--------|--------|-----|
| Reduce manual cleanup in PWA store | MEDIUM | LOW | Use AbortController everywhere |
| Add error context to data loading | MEDIUM | LOW | Extend LoadError interface |
| Create form state helper | MEDIUM | MEDIUM | Extract to helper library |
| Add store metrics monitoring | MEDIUM | MEDIUM | Implement monitoring wrapper |

### Low Priority

| Issue | Impact | Effort | Fix |
|-------|--------|--------|-----|
| Simplify cache invalidation | LOW | MEDIUM | Group caches by domain |
| Add DevTools integration | LOW | HIGH | Implement debugging tools |
| Document store relationships | LOW | LOW | Create architecture diagram |

---

## 11. Code Examples for Improvements

### Example 1: Fix allShows Loading

**Before**:
```typescript
export const allShows = createLiveQueryStore<DexieShow[]>(async () => {
  const db = await getDb();
  return db.shows.orderBy('date').reverse().toArray();
});
```

**After**:
```typescript
// Use pagination in components
export function useShowsPagination(pageSize = 50) {
  const { items, loadMore, hasMore } = createPaginatedShowsStore(pageSize);
  return { items, loadMore, hasMore };
}

// In component:
<script>
  const { items, loadMore, hasMore } = useShowsPagination(50);

  function handleLoadMore() {
    loadMore();
  }
</script>

{#each $items as show (show.id)}
  <ShowCard {show} />
{/each}

{#if $hasMore}
  <button onclick={handleLoadMore}>Load More</button>
{/if}
```

### Example 2: PWA Store Cleanup

**Before**:
```typescript
let cleanupFunctions: (() => void)[] = [];

const handleUpdateFound = () => {
  const newWorker = reg.installing;
  if (newWorker) {
    const handleStateChange = () => { /* ... */ };
    newWorker.addEventListener('statechange', handleStateChange);
    cleanupFunctions.push(() => {
      newWorker.removeEventListener('statechange', handleStateChange);
    });
  }
};
```

**After**:
```typescript
const controller = new AbortController();

const handleUpdateFound = () => {
  const newWorker = reg.installing;
  if (newWorker) {
    const handleStateChange = () => { /* ... */ };
    newWorker.addEventListener('statechange', handleStateChange, {
      signal: controller.signal
    });
  }
};

// Cleanup is now automatic via controller.abort()
return () => {
  controller.abort();
};
```

### Example 3: Resilient Data Store

**Before**:
```typescript
export const dataState = derived([status, progress], ...);
```

**After**:
```typescript
export function createResilientDataStore() {
  const status = writable<'loading' | 'ready' | 'error'>('loading');
  const progress = writable<LoadProgress>(initialProgress);
  const retryCount = writable(0);
  const maxRetries = 3;

  async function loadWithRetry(attempt = 0) {
    try {
      const { loadInitialData } = await import('$db/dexie/data-loader');
      await loadInitialData((p) => progress.set(p));
      status.set('ready');
      retryCount.set(0);
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`Load failed, retrying... (${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        return loadWithRetry(attempt + 1);
      }

      progress.set({
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        percentage: 0,
        loaded: 0,
        total: 0
      });
      status.set('error');
      retryCount.set(attempt);
    }
  }

  return {
    status: { subscribe: status.subscribe },
    progress: { subscribe: progress.subscribe },
    retryCount: { subscribe: retryCount.subscribe },
    initialize: () => loadWithRetry()
  };
}
```

---

## 12. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Components Layer                       │
│  (Using $state, $derived, $effect runes)                 │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│                  Stores Layer                             │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  PWA Store      │  │ Data Store   │  │Nav Store    │  │
│  │  - SW status    │  │ - Loading    │  │- History    │  │
│  │  - Offline      │  │ - Progress   │  │- Navigation │  │
│  └─────────────────┘  └──────────────┘  └─────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │         Dexie Store Layer                           │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │  Live Query Stores (reactive)                       │ │
│  │  ├─ Entity Stores (songs, shows, venues, etc)       │ │
│  │  ├─ Detail Stores (parallel queries)                │ │
│  │  ├─ User Stores (favorites, attended)               │ │
│  │  ├─ Search Stores (debounced)                       │ │
│  │  └─ Statistics Stores (WASM-accelerated)            │ │
│  │                                                      │ │
│  │  WASM Store Layer                                   │ │
│  │  ├─ Async WASM operations                           │ │
│  │  ├─ Performance tracking                            │ │
│  │  └─ Fallback support                                │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│              Data Layer                                  │
├───────────────────────────────────────────────────────────┤
│  ┌──────────────────┐      ┌─────────────────────────┐   │
│  │   IndexedDB      │      │    SQLite (Server)      │   │
│  │   (Dexie.js)     │      │  ├─ Song data           │   │
│  │  - Songs         │◄────►│  ├─ Show data           │   │
│  │  - Shows         │      │  ├─ Venue data          │   │
│  │  - User data     │      │  └─ Setlists            │   │
│  │  - Cache         │      └─────────────────────────┘   │
│  └──────────────────┘                                    │
└───────────────────────────────────────────────────────────┘
```

---

## 13. Checklist for Next Sprint

- [ ] Implement pagination for `allShows` and `allSongs`
- [ ] Add sync queue for offline mutations
- [ ] Enhance error recovery with retries
- [ ] Refactor PWA store cleanup to use AbortController
- [ ] Add error context to data loading errors
- [ ] Create form state management helper
- [ ] Implement store performance monitoring
- [ ] Add conflict resolution strategy
- [ ] Document store relationships
- [ ] Add DevTools support for debugging

---

## 14. Conclusion

The DMB Almanac app has **excellent state management fundamentals** with strong adoption of Svelte 5 runes. The Dexie.js integration is well-executed, and the store architecture is clean and maintainable.

**Key strengths**:
- Clean separation of concerns
- Excellent caching strategy
- Good error handling patterns
- Strong PWA integration
- WASM integration is well-designed

**Areas to focus on**:
1. Migrate from loading all records to pagination
2. Implement proper sync/mutation queue
3. Add resilient error recovery
4. Enhance offline capabilities with conflict resolution

With these improvements, the app will have **production-grade state management** suitable for scaling to more users and complex features.

**Estimated effort**: 40-60 hours for all recommendations.

---

**Document Generated**: 2026-01-22
**Auditor**: State Management Debugger
**Review Status**: Complete
