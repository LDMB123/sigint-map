# DMB Almanac - State Management Improvements Guide

Ready-to-implement solutions for state management enhancements.

---

## 1. Pagination Store (High Priority)

### Problem
Loading all 10K+ songs/shows into memory causes memory bloat and performance issues.

### Solution

Create `/src/lib/stores/pagination.ts`:

```typescript
import { writable, derived, get, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export interface PaginationState<T> {
  items: T[];
  pageSize: number;
  currentPage: number;
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
}

export interface PaginationOptions<T> {
  pageSize?: number;
  onError?: (error: Error) => void;
}

/**
 * Create a paginated store that loads data on demand
 *
 * Usage:
 * ```svelte
 * <script>
 *   const shows = createPaginatedStore(
 *     async (offset, limit) => {
 *       const db = await getDb();
 *       return db.shows
 *         .orderBy('date')
 *         .reverse()
 *         .offset(offset)
 *         .limit(limit + 1)
 *         .toArray();
 *     },
 *     50
 *   );
 * </script>
 *
 * {#each $shows.items as show}
 *   <ShowCard {show} />
 * {/each}
 *
 * {#if $shows.hasMore}
 *   <button onclick={() => shows.loadMore()}>Load More</button>
 * {/if}
 * ```
 */
export function createPaginatedStore<T>(
  queryFn: (offset: number, limit: number) => Promise<T[]>,
  pageSize = 50
) {
  const state = writable<PaginationState<T>>({
    items: [],
    pageSize,
    currentPage: 0,
    totalCount: 0,
    isLoading: false,
    error: null
  });

  const hasMore = derived(state, $state => {
    const expectedCount = ($state.currentPage + 1) * pageSize;
    return $state.items.length > expectedCount;
  });

  const isEmpty = derived(state, $state => $state.items.length === 0);

  if (!browser) {
    return {
      subscribe: state.subscribe,
      loadPage: async () => {},
      loadMore: async () => {},
      reset: async () => {},
      hasMore: { subscribe: hasMore.subscribe },
      isEmpty: { subscribe: isEmpty.subscribe }
    };
  }

  async function loadPage(pageNum: number) {
    state.update(s => ({ ...s, isLoading: true, error: null }));

    try {
      const offset = pageNum * pageSize;
      // Load one extra to check if there are more pages
      const results = await queryFn(offset, pageSize + 1);

      state.update(s => ({
        ...s,
        items:
          pageNum === 0
            ? results.slice(0, pageSize)
            : [...s.items, ...results.slice(0, pageSize)],
        currentPage: pageNum,
        totalCount: results.length > pageSize ? offset + pageSize + 1 : offset + results.length,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.update(s => ({
        ...s,
        isLoading: false,
        error: err
      }));
      console.error('[Pagination] Load failed:', err);
    }
  }

  async function loadMore() {
    const current = get(state);
    if (!current.isLoading && get(hasMore)) {
      await loadPage(current.currentPage + 1);
    }
  }

  async function reset() {
    await loadPage(0);
  }

  // Load first page on creation
  if (browser) {
    loadPage(0);
  }

  return {
    subscribe: state.subscribe,
    loadPage,
    loadMore,
    reset,
    hasMore: { subscribe: hasMore.subscribe },
    isEmpty: { subscribe: isEmpty.subscribe }
  };
}

/**
 * Create a paginated store with search
 */
export function createSearchPaginatedStore<T>(
  queryFn: (query: string, offset: number, limit: number) => Promise<T[]>,
  pageSize = 50,
  debounceMs = 300
) {
  const query = writable('');
  const state = writable<PaginationState<T>>({
    items: [],
    pageSize,
    currentPage: 0,
    totalCount: 0,
    isLoading: false,
    error: null
  });

  let debounceTimeout: ReturnType<typeof setTimeout>;
  let currentQuery = '';

  query.subscribe(q => {
    currentQuery = q;
    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(async () => {
      state.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const results = await queryFn(q, 0, pageSize + 1);
        state.update(s => ({
          ...s,
          items: results.slice(0, pageSize),
          currentPage: 0,
          totalCount: results.length > pageSize ? pageSize + 1 : results.length,
          isLoading: false,
          error: null
        }));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        state.update(s => ({
          ...s,
          isLoading: false,
          error: err
        }));
      }
    }, debounceMs);
  });

  async function loadMore() {
    const current = get(state);
    if (!current.isLoading && current.items.length >= pageSize) {
      state.update(s => ({ ...s, isLoading: true, error: null }));

      try {
        const offset = (current.currentPage + 1) * pageSize;
        const results = await queryFn(currentQuery, offset, pageSize + 1);

        state.update(s => ({
          ...s,
          items: [...s.items, ...results.slice(0, pageSize)],
          currentPage: s.currentPage + 1,
          isLoading: false,
          error: null
        }));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        state.update(s => ({
          ...s,
          isLoading: false,
          error: err
        }));
      }
    }
  }

  const hasMore = derived(state, $state => {
    return $state.items.length >= pageSize;
  });

  return {
    query,
    subscribe: state.subscribe,
    loadMore,
    reset: () => query.set(''),
    hasMore: { subscribe: hasMore.subscribe }
  };
}
```

### Usage in Components

```svelte
<script lang="ts">
  import { createPaginatedStore } from '$stores/pagination';
  import { getDb } from '$db/dexie/db';

  const showsStore = createPaginatedStore(
    async (offset, limit) => {
      const db = await getDb();
      return db.shows
        .orderBy('date')
        .reverse()
        .offset(offset)
        .limit(limit)
        .toArray();
    },
    50
  );

  let shows = $state.snapshot($showsStore);

  $effect.pre(() => {
    const unsubscribe = showsStore.subscribe(value => {
      shows = value;
    });
    return unsubscribe;
  });
</script>

<div class="shows-container">
  {#each shows.items as show (show.id)}
    <ShowCard {show} />
  {/each}

  {#if shows.isLoading}
    <div class="loading">Loading more...</div>
  {/if}

  {#if shows.error}
    <div class="error">Error loading shows: {shows.error.message}</div>
  {/if}

  {#await showsStore.hasMore then hasMore}
    {#if hasMore}
      <button onclick={() => showsStore.loadMore()} disabled={shows.isLoading}>
        Load More Shows
      </button>
    {/if}
  {/await}
</div>
```

---

## 2. Offline Sync Queue (High Priority)

### Problem
Client mutations don't sync back to server. Offline changes are lost.

### Solution

Create `/src/lib/stores/syncQueue.ts`:

```typescript
import { writable, derived, get, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export interface SyncItem<T = unknown> {
  id: string;
  operation: 'add' | 'update' | 'delete';
  table: string;
  data: T;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  lastRetry?: number;
}

export interface SyncQueueState {
  items: SyncItem[];
  isSyncing: boolean;
  error: Error | null;
  lastSyncTime: number | null;
  syncedCount: number;
  failedCount: number;
}

const initialState: SyncQueueState = {
  items: [],
  isSyncing: false,
  error: null,
  lastSyncTime: null,
  syncedCount: 0,
  failedCount: 0
};

/**
 * Create a sync queue for offline mutations
 * Stores mutations locally and syncs when online
 */
export function createSyncQueue(
  onSync: (item: SyncItem) => Promise<void>,
  onError?: (item: SyncItem, error: Error) => void
) {
  const state = writable<SyncQueueState>(initialState);

  const pendingCount = derived(
    state,
    $state => $state.items.filter(i => i.status === 'pending').length
  );

  const failedCount = derived(
    state,
    $state => $state.items.filter(i => i.status === 'failed').length
  );

  const isSyncing = derived(state, $state => $state.isSyncing);

  if (!browser) {
    return {
      subscribe: state.subscribe,
      add: async () => {},
      remove: async () => {},
      retry: async () => {},
      sync: async () => {},
      clear: async () => {},
      pendingCount: { subscribe: pendingCount.subscribe },
      failedCount: { subscribe: failedCount.subscribe },
      isSyncing: { subscribe: isSyncing.subscribe }
    };
  }

  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('dmb-sync-queue');
      if (stored) {
        const items = JSON.parse(stored) as SyncItem[];
        state.update(s => ({ ...s, items }));
      }
    } catch (err) {
      console.error('[SyncQueue] Failed to load from storage:', err);
    }
  };

  // Persist to localStorage
  const saveToStorage = () => {
    try {
      const current = get(state);
      localStorage.setItem('dmb-sync-queue', JSON.stringify(current.items));
    } catch (err) {
      console.error('[SyncQueue] Failed to save to storage:', err);
    }
  };

  // Subscribe to state changes and persist
  if (browser) {
    state.subscribe(() => saveToStorage());
    loadFromStorage();
  }

  async function add<T>(
    operation: SyncItem['operation'],
    table: string,
    data: T,
    maxAttempts = 3
  ) {
    const item: SyncItem = {
      id: crypto.randomUUID(),
      operation,
      table,
      data,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0,
      maxAttempts
    };

    state.update(s => ({
      ...s,
      items: [...s.items, item]
    }));

    // Try to sync immediately if online
    if (navigator.onLine) {
      await syncSingle(item);
    }

    return item.id;
  }

  async function syncSingle(item: SyncItem) {
    state.update(s => ({
      ...s,
      items: s.items.map(i => (i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i))
    }));

    try {
      await onSync(item);

      state.update(s => ({
        ...s,
        items: s.items.map(i =>
          i.id === item.id ? { ...i, status: 'synced' } : i
        ),
        syncedCount: s.syncedCount + 1
      }));

      console.log(`[SyncQueue] Synced: ${item.table} ${item.operation}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      const current = get(state).items.find(i => i.id === item.id);
      if (current && current.attempts >= current.maxAttempts) {
        state.update(s => ({
          ...s,
          items: s.items.map(i =>
            i.id === item.id
              ? { ...i, status: 'failed', lastError: err.message }
              : i
          ),
          failedCount: s.failedCount + 1
        }));

        onError?.(item, err);
      } else {
        state.update(s => ({
          ...s,
          items: s.items.map(i =>
            i.id === item.id
              ? { ...i, lastError: err.message, lastRetry: Date.now() }
              : i
          )
        }));
      }

      console.error(`[SyncQueue] Sync failed for ${item.table}:`, err);
    }
  }

  async function sync() {
    const current = get(state);
    if (current.isSyncing) return;

    state.update(s => ({ ...s, isSyncing: true, error: null }));

    try {
      const pendingItems = current.items.filter(
        i => i.status === 'pending' || (i.status === 'failed' && i.attempts < i.maxAttempts)
      );

      // Sync serially to maintain order
      for (const item of pendingItems) {
        await syncSingle(item);
      }

      state.update(s => ({
        ...s,
        isSyncing: false,
        lastSyncTime: Date.now()
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.update(s => ({
        ...s,
        isSyncing: false,
        error: err
      }));
      throw err;
    }
  }

  async function retry(itemId: string) {
    const current = get(state);
    const item = current.items.find(i => i.id === itemId);

    if (item && item.status === 'failed' && item.attempts < item.maxAttempts) {
      state.update(s => ({
        ...s,
        items: s.items.map(i =>
          i.id === itemId ? { ...i, status: 'pending', attempts: 0 } : i
        )
      }));

      await syncSingle(item);
    }
  }

  async function remove(itemId: string) {
    state.update(s => ({
      ...s,
      items: s.items.filter(i => i.id !== itemId)
    }));
  }

  async function clear() {
    state.update(() => initialState);
  }

  // Listen for online events
  if (browser) {
    window.addEventListener('online', () => {
      console.log('[SyncQueue] Back online, syncing...');
      sync();
    });
  }

  return {
    subscribe: state.subscribe,
    add,
    syncSingle,
    sync,
    retry,
    remove,
    clear,
    pendingCount: { subscribe: pendingCount.subscribe },
    failedCount: { subscribe: failedCount.subscribe },
    isSyncing: { subscribe: isSyncing.subscribe }
  };
}

// Global sync queue instance
export const syncQueue = createSyncQueue(
  async (item) => {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return response.json();
  },
  (item, error) => {
    console.error(`[SyncQueue] Failed to sync ${item.table}:`, error);
    // Could dispatch notification here
  }
);
```

### Integration with User Data Stores

```typescript
// In dexie.ts, modify createUserAttendedShowsStore:

export function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;

  return {
    subscribe: store.subscribe,

    async add(showId: number, showDate?: string) {
      const db = await getDb();
      try {
        // Add to local DB
        await db.userAttendedShows.add({
          showId,
          addedAt: Date.now(),
          // ... other fields
        });

        // Queue for sync
        await syncQueue.add('add', 'userAttendedShows', { showId, showDate });
        invalidateUserDataCaches();
      } catch (error) {
        // Handle error
      }
    },

    async remove(showId: number) {
      const db = await getDb();
      await db.userAttendedShows.where('showId').equals(showId).delete();

      // Queue for sync
      await syncQueue.add('delete', 'userAttendedShows', { showId });
      invalidateUserDataCaches();
    }
    // ... other methods
  };
}
```

---

## 3. Resilient Error Store (High Priority)

### Problem
Data loading errors aren't recoverable. No retry logic.

### Solution

Create `/src/lib/stores/resilient.ts`:

```typescript
import { writable, derived, get, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ResilientState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  lastRetry: number | null;
  canRetry: boolean;
}

/**
 * Create a resilient store with automatic retry logic
 *
 * Usage:
 * ```svelte
 * <script>
 *   const store = createResilientStore(
 *     async () => {
 *       const db = await getDb();
 *       return db.songs.toArray();
 *     },
 *     { maxRetries: 3, initialDelayMs: 1000 }
 *   );
 * </script>
 *
 * {#if $store.loading}
 *   <p>Loading...</p>
 * {:else if $store.error}
 *   <p>Error: {$store.error.message}</p>
 *   {#if $store.canRetry}
 *     <button onclick={() => store.retry()}>Try Again</button>
 *   {/if}
 * {:else}
 *   <!-- Use $store.data -->
 * {/if}
 * ```
 */
export function createResilientStore<T>(
  queryFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
) {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2
  } = options;

  const state = writable<ResilientState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastRetry: null,
    canRetry: false
  });

  if (!browser) {
    return {
      subscribe: state.subscribe,
      load: async () => {},
      retry: async () => {},
      reset: () => {},
      retryCount: derived(state, s => s.retryCount)
    };
  }

  async function executeWithRetry(attempt = 0) {
    state.update(s => ({
      ...s,
      loading: true,
      error: null,
      canRetry: false
    }));

    try {
      const data = await queryFn();
      state.update(s => ({
        ...s,
        data,
        loading: false,
        error: null,
        retryCount: 0,
        canRetry: false
      }));
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        // Calculate exponential backoff
        const delay = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          maxDelayMs
        );

        state.update(s => ({
          ...s,
          loading: false,
          error,
          retryCount: attempt + 1,
          lastRetry: Date.now(),
          canRetry: false // Will retry automatically
        }));

        console.warn(
          `[ResilientStore] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          error.message
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Recursive retry
        return executeWithRetry(attempt + 1);
      } else {
        // Max retries reached
        state.update(s => ({
          ...s,
          data: null,
          loading: false,
          error,
          retryCount: attempt,
          lastRetry: Date.now(),
          canRetry: true
        }));

        console.error(
          `[ResilientStore] Max retries (${maxRetries}) reached:`,
          error.message
        );

        throw error;
      }
    }
  }

  return {
    subscribe: state.subscribe,

    async load() {
      return executeWithRetry();
    },

    async retry() {
      return executeWithRetry();
    },

    reset() {
      state.set({
        data: null,
        loading: false,
        error: null,
        retryCount: 0,
        lastRetry: null,
        canRetry: false
      });
    },

    retryCount: derived(state, s => s.retryCount)
  };
}

/**
 * Create a resilient live query store
 * Retries on error with backoff
 */
export function createResilientLiveQuery<T>(
  queryFn: () => Promise<T>,
  initialValue?: T,
  options?: Parameters<typeof createResilientStore>[1]
) {
  const store = createResilientStore(queryFn, options);

  // Load immediately
  if (browser) {
    store.load().catch(err => {
      console.error('[ResilientLiveQuery] Initial load failed:', err);
    });
  }

  return store;
}
```

---

## 4. Form State Store (Medium Priority)

### Problem
No standardized form state management. Forms scattered across components.

### Solution

Create `/src/lib/stores/form.ts`:

```typescript
import { writable, derived, get, type Readable } from 'svelte/store';

export interface FormState<T extends Record<string, any>> {
  values: T;
  touched: Partial<Record<keyof T, boolean>>;
  errors: Partial<Record<keyof T, string>>;
  dirty: boolean;
  isSubmitting: boolean;
}

export type FormValidator<T> = (values: T) => Promise<Partial<Record<keyof T, string>>>;

/**
 * Create a form store with validation
 *
 * Usage:
 * ```svelte
 * <script>
 *   const form = createForm(
 *     { name: '', email: '' },
 *     async (values) => {
 *       const errors = {};
 *       if (!values.name) errors.name = 'Name is required';
 *       if (!values.email) errors.email = 'Email is required';
 *       return errors;
 *     },
 *     async (values) => {
 *       await fetch('/api/submit', {
 *         method: 'POST',
 *         body: JSON.stringify(values)
 *       });
 *     }
 *   );
 * </script>
 *
 * <input
 *   type="text"
 *   bind:value={$form.values.name}
 *   onblur={() => form.setTouched('name')}
 * />
 * {#if $form.touched.name && $form.errors.name}
 *   <span class="error">{$form.errors.name}</span>
 * {/if}
 * ```
 */
export function createForm<T extends Record<string, any>>(
  initialValues: T,
  validate?: FormValidator<T>,
  onSubmit?: (values: T) => Promise<void>
) {
  const initialState: FormState<T> = {
    values: initialValues,
    touched: {},
    errors: {},
    dirty: false,
    isSubmitting: false
  };

  const state = writable<FormState<T>>(initialState);

  const isDirty = derived(state, s => s.dirty);
  const isValid = derived(state, s => Object.keys(s.errors).length === 0);
  const isTouched = derived(state, s => Object.keys(s.touched).length > 0);

  return {
    subscribe: state.subscribe,
    isDirty: { subscribe: isDirty.subscribe },
    isValid: { subscribe: isValid.subscribe },
    isTouched: { subscribe: isTouched.subscribe },

    setFieldValue<K extends keyof T>(field: K, value: T[K]) {
      state.update(s => ({
        ...s,
        values: { ...s.values, [field]: value },
        dirty: true
      }));

      // Validate field if validator exists
      if (validate) {
        validateField(field);
      }
    },

    async validateField<K extends keyof T>(field: K) {
      if (!validate) return;

      const current = get(state);
      const errors = await validate(current.values);

      state.update(s => ({
        ...s,
        errors: {
          ...s.errors,
          [field]: errors[field] || undefined
        }
      }));
    },

    async validateAll() {
      if (!validate) return;

      const current = get(state);
      const errors = await validate(current.values);

      state.update(s => ({
        ...s,
        errors
      }));

      return Object.keys(errors).length === 0;
    },

    setTouched<K extends keyof T>(field: K) {
      state.update(s => ({
        ...s,
        touched: { ...s.touched, [field]: true }
      }));
    },

    async submit() {
      state.update(s => ({ ...s, isSubmitting: true }));

      try {
        const isValid = await this.validateAll();
        if (!isValid) {
          state.update(s => ({ ...s, isSubmitting: false }));
          return;
        }

        const current = get(state);
        if (onSubmit) {
          await onSubmit(current.values);
        }

        state.update(s => ({
          ...s,
          isSubmitting: false,
          dirty: false
        }));
      } catch (error) {
        state.update(s => ({ ...s, isSubmitting: false }));
        throw error;
      }
    },

    reset() {
      state.set(initialState);
    }
  };
}
```

---

## 5. Store Monitoring (Medium Priority)

### Problem
No visibility into store performance and health.

### Solution

Create `/src/lib/stores/monitoring.ts`:

```typescript
import { writable, derived, get, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export interface StoreMetrics {
  name: string;
  subscriptions: number;
  updates: number;
  cacheHits: number;
  cacheMisses: number;
  lastUpdate: number;
  averageUpdateTime: number;
  maxUpdateTime: number;
}

const metrics = new Map<string, StoreMetrics>();
const metricsStore = writable<Map<string, StoreMetrics>>(new Map());

/**
 * Wrap a store with monitoring
 */
export function withMonitoring<T>(
  name: string,
  store: Readable<T>
): Readable<T> {
  if (!browser) {
    return store;
  }

  let subscriptions = 0;
  let updates = 0;
  const updateTimes: number[] = [];

  const metric: StoreMetrics = {
    name,
    subscriptions: 0,
    updates: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastUpdate: 0,
    averageUpdateTime: 0,
    maxUpdateTime: 0
  };

  metrics.set(name, metric);

  return {
    subscribe(fn) {
      subscriptions++;
      metric.subscriptions = subscriptions;

      const startTime = performance.now();

      return store.subscribe((value) => {
        updates++;
        const updateTime = performance.now() - startTime;
        updateTimes.push(updateTime);

        if (updateTimes.length > 100) {
          updateTimes.shift();
        }

        metric.updates = updates;
        metric.lastUpdate = Date.now();
        metric.averageUpdateTime =
          updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
        metric.maxUpdateTime = Math.max(...updateTimes);

        metricsStore.set(new Map(metrics));

        fn(value);
      });
    }
  };
}

/**
 * Get all store metrics
 */
export function getStoreMetrics(): StoreMetrics[] {
  return Array.from(metrics.values());
}

/**
 * Export metrics for analysis
 */
export function exportMetrics() {
  return {
    timestamp: Date.now(),
    metrics: getStoreMetrics(),
    totalStores: metrics.size,
    totalSubscriptions: Array.from(metrics.values()).reduce(
      (sum, m) => sum + m.subscriptions,
      0
    ),
    totalUpdates: Array.from(metrics.values()).reduce(
      (sum, m) => sum + m.updates,
      0
    )
  };
}

/**
 * Monitor all app stores
 */
export const storeMetrics = derived(metricsStore, $metrics =>
  Array.from($metrics.values())
);

// Enable debugging in dev mode
if (import.meta.env.DEV && browser) {
  window.dmb = window.dmb || {};
  window.dmb.storeMetrics = exportMetrics;
  window.dmb.getStoreMetrics = getStoreMetrics;
}
```

### Usage in Component

```svelte
<script lang="ts">
  import { storeMetrics } from '$stores/monitoring';

  {#if import.meta.env.DEV}
    <details class="store-metrics">
      <summary>Store Metrics</summary>
      <table>
        <tr>
          <th>Store</th>
          <th>Subs</th>
          <th>Updates</th>
          <th>Avg Time</th>
          <th>Max Time</th>
        </tr>
        {#each $storeMetrics as metric (metric.name)}
          <tr>
            <td>{metric.name}</td>
            <td>{metric.subscriptions}</td>
            <td>{metric.updates}</td>
            <td>{metric.averageUpdateTime.toFixed(2)}ms</td>
            <td>{metric.maxUpdateTime.toFixed(2)}ms</td>
          </tr>
        {/each}
      </table>
    </details>
  {/if}
</script>
```

---

## Implementation Checklist

- [ ] Create `/src/lib/stores/pagination.ts`
- [ ] Create `/src/lib/stores/syncQueue.ts`
- [ ] Create `/src/lib/stores/resilient.ts`
- [ ] Create `/src/lib/stores/form.ts`
- [ ] Create `/src/lib/stores/monitoring.ts`
- [ ] Replace `allShows`/`allSongs` with pagination
- [ ] Integrate sync queue with user data stores
- [ ] Add error recovery to data loading store
- [ ] Update dexie.ts to use resilient stores for critical data
- [ ] Add tests for new stores
- [ ] Update component usage documentation
- [ ] Add to performance monitoring

---

**Estimated Implementation Time**: 20-40 hours
**Difficulty**: Medium
**Priority**: High for performance and reliability improvements
