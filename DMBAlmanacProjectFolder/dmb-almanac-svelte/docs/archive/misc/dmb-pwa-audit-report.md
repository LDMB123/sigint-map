# React Hooks & Offline Data Access Layer - Security & Reliability Audit

**Date:** January 18, 2026
**Files Audited:**
- `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/hooks.ts`
- `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/client.ts`
- `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/database.ts`
- `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/types.ts`

---

## Executive Summary

The offline-first data access layer demonstrates solid architectural patterns with proper cache-first strategies and fallback handling. However, **there are critical gaps in database initialization handling** that could cause "database offline" scenarios, and **several error handling inconsistencies** that may lead to empty data displays.

**Critical Issues Found: 3**
**High-Priority Issues Found: 5**
**Medium-Priority Issues Found: 4**

---

## 1. Database Initialization - Critical Issues

### Issue 1.1: Database Initialization Not Called on App Startup
**Severity:** CRITICAL
**Location:** Hooks file has no initialization trigger; database.ts exports `ensureDatabaseReady()` but it's never called at app boot

**Problem:**
- `ensureDatabaseReady()` is defined but only called reactively inside `hasValidLocalData()` when queries execute
- If a hook fires before database is ready, the promise chain could race
- No initialization in a Suspense boundary or root layout

**Impact:**
- First query on app load may return empty data while database initializes
- React Query might cache this empty result, blocking real data from loading
- Users see blank screens during the critical first load

**Current Code Flow (hooks.ts):**
```typescript
export function useShowsList(filters = {}, options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.shows.list(filters),
    queryFn: async () => {
      const result = await offlineDataAccess.shows.list(filters, options);
      // offlineDataAccess.shows.list() calls hasValidLocalData()
      // which calls ensureDatabaseReady()
      // But this happens DURING the query function execution
```

**Current Code Flow (client.ts):**
```typescript
async function hasValidLocalData(
  tableName: string,
  ttl: number,
  options?: QueryOptions
): Promise<boolean> {
  // ...
  const isReady = await ensureDatabaseReady(); // Called here, too late!
  if (!isReady) {
    console.warn('[OfflineDataAccess] Database not ready');
    return false;
  }
  // ...
}
```

**Recommendation:**
Create a provider that initializes database at app root:
```typescript
// Add to hooks.ts or new initialization file
export function useInitializeDatabase() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    ensureDatabaseReady()
      .then(isReady => {
        if (isReady) {
          setReady(true);
        } else {
          setError(new Error('Failed to initialize offline database'));
        }
      })
      .catch(err => setError(err));
  }, []);

  return { ready, error };
}
```

Then use in root layout:
```typescript
export default function RootLayout({ children }) {
  const { ready, error } = useInitializeDatabase();

  if (error) return <ErrorUI error={error} />;
  if (!ready) return <LoadingUI />;

  return children;
}
```

---

### Issue 1.2: Race Condition in Database Initialization
**Severity:** CRITICAL
**Location:** database.ts lines 242-265, 226-227

**Problem:**
Multiple queries firing simultaneously could all see `databaseReadyPromise === null` and all start initialization, creating multiple Dexie instances or race conditions.

```typescript
let databaseReadyPromise: Promise<boolean> | null = null;
let databaseInitialized = false;

export async function ensureDatabaseReady(): Promise<boolean> {
  if (databaseInitialized && offlineDb.isOpen()) {
    return true;
  }

  // Race condition: Multiple callers could all see databaseReadyPromise === null
  // and all execute initializeDatabase()
  if (databaseReadyPromise) {
    return databaseReadyPromise;
  }

  // BUG: No synchronization primitive here
  databaseReadyPromise = initializeDatabase();
```

**Impact:**
- Multiple concurrent initialization attempts
- Database open/close state inconsistencies
- IndexedDB conflicts

**Recommendation:**
Add a synchronization lock:
```typescript
let initializationLock: boolean = false;
let databaseReadyPromise: Promise<boolean> | null = null;

export async function ensureDatabaseReady(): Promise<boolean> {
  if (databaseInitialized && offlineDb.isOpen()) {
    return true;
  }

  if (databaseReadyPromise) {
    return databaseReadyPromise;
  }

  // Prevent concurrent initialization
  if (initializationLock) {
    // Wait for the promise that's about to be set
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (databaseReadyPromise) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 10);
    });
    return databaseReadyPromise ?? false;
  }

  initializationLock = true;
  try {
    databaseReadyPromise = initializeDatabase();
    const result = await databaseReadyPromise;
    if (result) {
      databaseInitialized = true;
    } else {
      databaseReadyPromise = null;
    }
    return result;
  } finally {
    initializationLock = false;
  }
}
```

---

### Issue 1.3: Silent Database Failures Don't Propagate to UI
**Severity:** CRITICAL
**Location:** client.ts lines 37-64 and throughout

**Problem:**
When database fails to initialize:
1. `hasValidLocalData()` returns `false` silently (line 46-48)
2. Caller assumes no local data exists
3. If offline and no server, hook returns empty data gracefully
4. User sees blank UI with no error indication

```typescript
async function hasValidLocalData(
  tableName: string,
  ttl: number,
  options?: QueryOptions
): Promise<boolean> {
  // ...
  const isReady = await ensureDatabaseReady();
  if (!isReady) {
    console.warn('[OfflineDataAccess] Database not ready'); // Only console warning!
    return false; // Treated same as "no data"
  }
  // ...
}
```

**Impact:**
- Users get blank screens without knowing why
- Debugging difficult - no error boundaries catch this
- No recovery mechanism

**Recommendation:**
Propagate database errors:
```typescript
async function hasValidLocalData(
  tableName: string,
  ttl: number,
  options?: QueryOptions
): Promise<{ hasData: boolean; error?: Error }> {
  if (options?.skipCache) return { hasData: false };

  try {
    const isReady = await ensureDatabaseReady();
    if (!isReady) {
      return {
        hasData: false,
        error: new Error('Database initialization failed - offline storage unavailable')
      };
    }

    const hasLocalData = await hasData(tableName as keyof typeof offlineDb);
    if (!hasLocalData) return { hasData: false };

    if (options?.forceRefresh) return { hasData: false };

    const table = offlineDb[tableName as keyof typeof offlineDb] as any;
    const firstRecord = await table.orderBy('cachedAt').first();

    if (!firstRecord?.cachedAt) return { hasData: false };

    const maxAge = options?.maxAge ?? ttl;
    return { hasData: !isStale(firstRecord.cachedAt, maxAge) };
  } catch (error) {
    return {
      hasData: false,
      error: error instanceof Error ? error : new Error('Unknown database error')
    };
  }
}
```

---

## 2. React Query Hook Error Handling Issues

### Issue 2.1: Inconsistent Error Handling Across Hooks
**Severity:** HIGH
**Location:** hooks.ts - multiple hooks use different error strategies

**Problem:**
Some hooks throw errors, others return empty data. This creates inconsistent behavior:

**Throws Error:**
```typescript
export function useShowsList(filters = {}, options?: QueryOptions) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.list(filters, options);
      if (result) return result;
      if (isOnline()) {
        console.log('[useShowsList] Waiting for initial sync...');
        return { shows: [], data: [], nextCursor: undefined, hasMore: false, source: 'local' };
      }
      throw new Error('No local data and offline'); // THROWS
    },
  });
}
```

**Returns Empty:**
```typescript
export function useShowsByDate(date: Date, options?: QueryOptions) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.byDate(date, options);
      if (result) return result.data;
      return []; // Returns empty array
    },
  });
}
```

**Also Returns Empty Silently:**
```typescript
export function useRecentShows(limit?: number, options?: QueryOptions) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.recent(limit, options);
      if (result) return result.data;
      return []; // No error, no logging
    },
  });
}
```

**Impact:**
- Components need different error handling for similar queries
- Some hooks retry on error, others don't
- Hard to understand why data is missing

**Recommendation:**
Standardize to one of three strategies per hook category:
```typescript
// Strategy A: Always try to return data (preferred for lists)
export function useShowsList(filters = {}, options?: QueryOptions) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.list(filters, options);
      return result ?? {
        shows: [],
        data: [],
        nextCursor: undefined,
        hasMore: false,
        source: 'local' as DataSource,
      };
    },
  });
}

// Strategy B: Throw only when data is required (for detail views)
export function useShowBySlug(slug: string, options?: QueryOptions) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.bySlug(slug, options);
      if (!result) {
        throw new Error(`Show "${slug}" not found`);
      }
      return result.data;
    },
  });
}
```

---

### Issue 2.2: useOnlineInvalidation Hook Doesn't Handle Partial Failures
**Severity:** HIGH
**Location:** hooks.ts lines 982-991

**Problem:**
```typescript
export function useOnlineInvalidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidates ALL queries - could be thousands of entries
      await queryClient.invalidateQueries();
    },
  });
}
```

Issues:
1. No error handling if invalidation fails
2. Doesn't return the mutation result for subscribers to track
3. Invalidating everything could flood network with requests
4. No granular invalidation by data type

**Impact:**
- If network becomes flaky during online transition, hook fails silently
- Components can't track when sync is complete
- Potential thundering herd of simultaneous requests

**Recommendation:**
```typescript
export function useOnlineInvalidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        // Invalidate by scope instead of everything
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['shows'] }),
          queryClient.invalidateQueries({ queryKey: ['songs'] }),
          queryClient.invalidateQueries({ queryKey: ['venues'] }),
          queryClient.invalidateQueries({ queryKey: ['tours'] }),
          queryClient.invalidateQueries({ queryKey: ['guests'] }),
          queryClient.invalidateQueries({ queryKey: ['releases'] }),
          queryClient.invalidateQueries({ queryKey: ['search'] }),
        ]);
        return { success: true, invalidatedCount: 7 };
      } catch (error) {
        throw new Error(`Failed to invalidate queries: ${error}`);
      }
    },
    onError: (error) => {
      console.error('[useOnlineInvalidation] Failed to sync:', error);
    },
  });
}
```

---

### Issue 2.3: Missing "enabled" Condition on Dependent Queries
**Severity:** HIGH
**Location:** hooks.ts - song history, companions, guest shows

**Problem:**
```typescript
export function useSongHistory(
  songId: number,
  cursor?: number,
  limit?: number,
  options?: QueryOptions
) {
  return useQuery({
    queryKey: queryKeys.songs.history(songId, cursor),
    queryFn: async () => {
      const result = await offlineDataAccess.songs.history(
        { songId, cursor, limit },
        options
      );
      if (result) return result;
      throw new Error('History unavailable');
    },
    enabled: !!songId, // Good - has guard
    staleTime: 5 * 60 * 1000,
  });
}

// But these have the guard:
export function useSongCompanions(songId: number, limit?: number, options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.songs.companions(songId),
    queryFn: async () => {
      const result = await offlineDataAccess.songs.companions(
        { songId, limit },
        options
      );
      if (result) return result.data;
      return [];
    },
    enabled: !!songId, // Has guard
  });
}

// And these:
export function useGuestsByShow(showId: number, options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.guests.byShow(showId),
    queryFn: async () => {
      const result = await offlineDataAccess.guests.byShow(showId, options);
      if (result) return result.data;
      return [];
    },
    enabled: !!showId, // Has guard
  });
}
```

Actually, checking more carefully - **these ARE properly guarded**. However, some are NOT:

```typescript
export function useVenueFilterOptions(options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.venues.filterOptions(),
    queryFn: async () => {
      const result = await offlineDataAccess.venues.filterOptions(options);
      if (result) return result.data;
      return { countries: [], states: [], cities: [] };
    },
    // NO enabled condition - will run even if not needed
    staleTime: 60 * 60 * 1000,
  });
}

export function useOnlineStatus() {
  return useQuery({
    queryKey: ['onlineStatus'],
    queryFn: () => isOnline(),
    refetchInterval: 10000, // Polling every 10 seconds indefinitely
    staleTime: 5000,
    // No enabled condition to stop polling when unmounted
  });
}
```

**Impact:**
- Unnecessary database queries for component mounts
- `useOnlineStatus` keeps polling even after unmount (memory leak)
- Wasted database calls during initial render

**Recommendation:**
```typescript
export function useOnlineStatus() {
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  return useQuery({
    queryKey: ['onlineStatus'],
    queryFn: () => isOnline(),
    refetchInterval: 10000,
    staleTime: 5000,
    // Optional: Add enabled condition if you want to disable globally
  });
}

// Or use useEffect to manage subscription lifecycle
export function useOnlineStatus() {
  const [isOnlineStatus, setIsOnlineStatus] = useState(() => isOnline());

  useEffect(() => {
    const handler = () => setIsOnlineStatus(isOnline());
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);

    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }, []);

  return { data: isOnlineStatus };
}
```

---

## 3. Data Access Layer (client.ts) Issues

### Issue 3.1: guests.byShow() Doesn't Check Database Ready
**Severity:** HIGH
**Location:** client.ts lines 758-763

**Problem:**
```typescript
export const guests = {
  // ...
  async byShow(showId: number, options?: QueryOptions) {
    return {
      data: await guestsQueries.guestsByShow(showId), // No hasValidLocalData check!
      source: 'local' as DataSource,
    };
  },
};
```

This is the ONLY method in all of `offlineDataAccess` that doesn't call `hasValidLocalData()`. It will:
1. Try to query immediately without checking if database is ready
2. Fail silently if database not initialized
3. Return undefined or throw without fallback

**Impact:**
- Direct database queries before initialization complete
- No fallback to online-only mode
- Inconsistent with all other methods

**Recommendation:**
```typescript
async byShow(showId: number, options?: QueryOptions) {
  const hasLocal = await hasValidLocalData('guestAppearances', TTL.GUESTS, options);

  if (hasLocal) {
    return {
      data: await guestsQueries.guestsByShow(showId),
      source: 'local' as DataSource,
    };
  }

  if (!isOnline()) {
    return {
      data: await guestsQueries.guestsByShow(showId),
      source: 'local' as DataSource,
    };
  }

  return null;
},
```

---

### Issue 3.2: Inconsistent Return Values for "No Data" Scenarios
**Severity:** MEDIUM
**Location:** client.ts - multiple methods return `null` when offline with no data

**Problem:**
Methods return `null` in inconsistent situations:

```typescript
// Shows - returns null when NO local data and online
export const shows = {
  async list(input = {}, options?: QueryOptions) {
    const hasLocal = await hasValidLocalData('shows', TTL.SHOWS, options);
    if (hasLocal) {
      return { ...(await showsQueries.showsList(input)), source: 'local' };
    }
    if (!isOnline()) {
      return { shows: [], data: [], nextCursor: undefined, hasMore: false };
    }
    return null; // Tell caller to fetch from server
  },
};

// Songs - same pattern
// Venues - same pattern
// Tours - same pattern
// Guests - same pattern
// Releases - same pattern

// Search - also returns null
export const search = {
  async setlist(input, options?: QueryOptions) {
    const hasShows = await hasValidLocalData('shows', TTL.SHOWS, options);
    const hasSetlist = await hasValidLocalData('setlistEntries', TTL.SHOWS, options);

    if (hasShows && hasSetlist) {
      return { ...(await searchQueries.searchSetlist(input)), source: 'local' };
    }

    if (!isOnline()) {
      return { ...(await searchQueries.searchSetlist(input)), source: 'local' };
    }

    return null;
  },
};
```

**Then in hooks:**
```typescript
export function useShowsList(filters = {}, options?: QueryOptions) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.list(filters, options);
      if (result) return result; // Handle null?

      // React Query sees null as no error, marks query as successful with undefined data
      // This is wrong!
    },
  });
}
```

**Impact:**
- React Query treats `null` return as success with no data
- Doesn't trigger retry logic
- Components receive `undefined` data
- Hard to distinguish "no data" from "needs server fetch"

**Recommendation:**
Use explicit wrapper type:
```typescript
// In types.ts
export type DataAccessResult<T> =
  | { success: true; data: T; source: DataSource }
  | { success: false; needsServer: true; reason: 'online-with-no-cache' }
  | { success: false; needsServer: false; reason: 'offline-no-cache' };

// In client.ts
async list(input = {}, options?: QueryOptions): Promise<DataAccessResult<ShowListResult>> {
  const hasLocal = await hasValidLocalData('shows', TTL.SHOWS, options);

  if (hasLocal) {
    return {
      success: true,
      data: await showsQueries.showsList(input),
      source: 'local',
    };
  }

  if (!isOnline()) {
    return {
      success: false,
      needsServer: false,
      reason: 'offline-no-cache',
    };
  }

  return {
    success: false,
    needsServer: true,
    reason: 'online-with-no-cache',
  };
}

// In hooks.ts
export function useShowsList(filters = {}, options?: QueryOptions) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.list(filters, options);

      if (result.success) {
        return result.data;
      }

      if (result.needsServer) {
        // Throw to trigger server fetch via React Query
        throw new Error('Needs server data - fetch from tRPC');
      }

      // Offline with no cache
      throw new Error('No data available - offline and no cached data');
    },
  });
}
```

---

### Issue 3.3: releases.types() Returns Synchronously Without Await
**Severity:** MEDIUM
**Location:** client.ts lines 919-924

**Problem:**
```typescript
types() {
  return {
    data: releasesQueries.releasesTypes(), // No await, no Promise
    source: 'local' as DataSource,
  };
}
```

This returns a non-Promise synchronously, but called from hooks as if async:

```typescript
export function useReleaseTypes() {
  return useQuery({
    queryFn: () => offlineDataAccess.releases.types().data, // Assumes sync
    staleTime: Infinity,
  });
}
```

**Impact:**
- If `releasesTypes()` involves any async operation, it will hang
- Query function appears to never resolve
- Type safety broken (hook expects Promise, method returns sync)

**Recommendation:**
```typescript
async types() {
  try {
    const data = await releasesQueries.releasesTypes();
    return {
      data,
      source: 'local' as DataSource,
    };
  } catch (error) {
    return {
      data: [],
      source: 'local' as DataSource,
    };
  }
}
```

---

## 4. Query Key Factory Issues

### Issue 4.1: Query Keys Don't Handle All Filter Combinations
**Severity:** MEDIUM
**Location:** hooks.ts lines 23-129

**Problem:**
Some query keys don't include all relevant filters:

```typescript
export const queryKeys = {
  shows: {
    list: (filters: object) =>
      [...queryKeys.shows.lists(), filters] as const, // Object as key - unstable
  },
};
```

**Problem:** Passing objects directly creates new key references each time:
```typescript
// These are different query keys even though they're the same filters
const key1 = queryKeys.shows.list({ year: 2024 });
const key2 = queryKeys.shows.list({ year: 2024 });

// key1 !== key2 because objects are compared by reference
// React Query treats them as different queries and caches both!
```

**Impact:**
- Duplicate query cache entries
- Same data fetched multiple times
- Memory waste

**Recommendation:**
```typescript
export const queryKeys = {
  shows: {
    list: (filters?: ShowsListInput) => [
      'shows',
      'list',
      filters?.year ?? null,
      filters?.tourId ?? null,
      filters?.venueId ?? null,
      filters?.sortBy ?? 'date',
      filters?.sortOrder ?? 'asc',
      filters?.cursor ?? null,
      filters?.limit ?? 50,
    ] as const,
  },
};

// Or use a helper to normalize filters
function normalizeFilters(filters: any): string {
  const sorted = Object.keys(filters)
    .sort()
    .reduce((acc, key) => {
      acc[key] = filters[key];
      return acc;
    }, {} as any);
  return JSON.stringify(sorted);
}

export const queryKeys = {
  shows: {
    list: (filters: object = {}) =>
      ['shows', 'list', normalizeFilters(filters)] as const,
  },
};
```

---

## 5. Database Initialization Timing Issues

### Issue 5.1: Hooks Can Execute Before ensureDatabaseReady Completes
**Severity:** HIGH
**Location:** Overall architecture - no initialization guarantees

**Problem:**
Timeline:
1. App mounts, renders first component with `useShowsList()`
2. useQuery's queryFn fires immediately
3. offlineDataAccess.shows.list() calls hasValidLocalData()
4. hasValidLocalData() calls ensureDatabaseReady()
5. But this is the FIRST time database init is called
6. Database opening takes 10-100ms
7. Meanwhile, React Query might receive `null` or incomplete data

```
App Mount
  ├─ useShowsList() hook runs
  │   └─ queryFn() executes
  │       └─ offlineDataAccess.shows.list()
  │           └─ hasValidLocalData()
  │               └─ ensureDatabaseReady() <- STARTS HERE (too late!)
  └─ Component renders with loading state
```

**Impact:**
- First data load unreliable
- Race condition between React rendering and database opening
- Could timeout if database takes too long

**Recommendation:**
See Issue 1.1 for full solution. In brief:
- Initialize database in app layout before rendering children
- Use React Suspense to wait for initialization
- Provide a context that components check

---

## 6. Cache Invalidation Strategy Issues

### Issue 6.1: No Cache Invalidation When Going Offline
**Severity:** MEDIUM
**Location:** hooks.ts - useOnlineInvalidation only triggers online, not offline

**Problem:**
When device goes OFFLINE:
1. `useOnlineStatus` might still report old data
2. No automatic cache invalidation
3. Stale cached data looks fresh
4. User might see outdated information

```typescript
export function useOnlineStatus() {
  return useQuery({
    queryKey: ['onlineStatus'],
    queryFn: () => isOnline(),
    refetchInterval: 10000, // 10 second polling - might miss offline event
    staleTime: 5000,
  });
}
```

**Better approach:** Listen to actual events:
```typescript
useEffect(() => {
  const handleOffline = () => {
    queryClient.setQueryData(['onlineStatus'], false);
  };

  const handleOnline = () => {
    queryClient.setQueryData(['onlineStatus'], true);
    // Now invalidate queries so they refetch
    queryClient.invalidateQueries();
  };

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
  };
}, [queryClient]);
```

---

## 7. Recommended Architecture Changes

### Recommended File: useOfflineInit.ts
Create a dedicated hook for database initialization:

```typescript
import { useEffect, useRef, useState } from 'react';
import { ensureDatabaseReady } from './database';

export interface InitializationState {
  ready: boolean;
  error: Error | null;
  attempts: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

export function useOfflineInit(
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY
): InitializationState {
  const [state, setState] = useState<InitializationState>({
    ready: false,
    error: null,
    attempts: 0,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    let retryCount = 0;
    let timeoutId: NodeJS.Timeout;

    const attempt = async () => {
      try {
        const ready = await ensureDatabaseReady();
        if (mountedRef.current) {
          if (ready) {
            setState({ ready: true, error: null, attempts: retryCount + 1 });
          } else {
            throw new Error('Database initialization failed');
          }
        }
      } catch (error) {
        if (!mountedRef.current) return;

        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(
            `[OfflineInit] Attempt ${retryCount}/${maxRetries} failed, retrying...`,
            error
          );
          timeoutId = setTimeout(attempt, retryDelayMs * retryCount);
          setState(prev => ({ ...prev, attempts: retryCount }));
        } else {
          console.error(
            `[OfflineInit] Failed after ${maxRetries} attempts:`,
            error
          );
          setState({
            ready: false,
            error: error instanceof Error ? error : new Error(String(error)),
            attempts: retryCount,
          });
        }
      }
    };

    attempt();

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [maxRetries, retryDelayMs]);

  return state;
}
```

### Recommended File: OfflineInitProvider.tsx
Wrap app with initialization provider:

```typescript
import { ReactNode, createContext, useContext } from 'react';
import { useOfflineInit, InitializationState } from './useOfflineInit';

const OfflineInitContext = createContext<InitializationState | null>(null);

export function OfflineInitProvider({ children }: { children: ReactNode }) {
  const initState = useOfflineInit();

  if (initState.error) {
    return (
      <div style={{ padding: '20px', background: '#fee', textAlign: 'center' }}>
        <h2>Database Initialization Error</h2>
        <p>{initState.error.message}</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Offline features will not work. Please refresh the page.
        </p>
      </div>
    );
  }

  if (!initState.ready) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Initializing offline storage (attempt {initState.attempts})...</p>
      </div>
    );
  }

  return (
    <OfflineInitContext.Provider value={initState}>
      {children}
    </OfflineInitContext.Provider>
  );
}

export function useOfflineInitialized() {
  const context = useContext(OfflineInitContext);
  if (!context) {
    throw new Error('useOfflineInitialized must be used within OfflineInitProvider');
  }
  return context;
}
```

---

## Summary of Critical Issues

| # | Issue | Severity | File | Lines | Impact |
|---|-------|----------|------|-------|--------|
| 1.1 | No app-level database initialization | CRITICAL | hooks.ts, database.ts | 242-265 | Blank screens on first load |
| 1.2 | Race condition in ensureDatabaseReady | CRITICAL | database.ts | 242-265 | Multiple init attempts, state corruption |
| 1.3 | Silent database failures | CRITICAL | client.ts | 37-64 | No error feedback to users |
| 2.1 | Inconsistent error handling | HIGH | hooks.ts | Multiple | Hard to debug, inconsistent UX |
| 2.2 | useOnlineInvalidation has no error handling | HIGH | hooks.ts | 982-991 | Failed invalidation goes unnoticed |
| 3.1 | guests.byShow() skips database check | HIGH | client.ts | 758-763 | Crashes if DB not ready |
| 3.2 | Inconsistent null returns | MEDIUM | client.ts | Multiple | React Query interprets wrong |
| 3.3 | releases.types() not async | MEDIUM | client.ts | 919-924 | Type safety broken |
| 4.1 | Query keys use unstable object references | MEDIUM | hooks.ts | 23-129 | Duplicate cache entries |
| 5.1 | Database init happens too late | HIGH | Architecture | All | First query unreliable |
| 6.1 | No cache invalidation on offline | MEDIUM | hooks.ts | Multiple | Stale data displayed |

---

## Implementation Checklist

- [ ] Create `useOfflineInit` hook to initialize database at app root
- [ ] Wrap app with `OfflineInitProvider` before rendering data components
- [ ] Add synchronization lock to `ensureDatabaseReady()` to prevent race conditions
- [ ] Change `hasValidLocalData()` to return error info
- [ ] Standardize error handling across all hooks (choose throw or return strategy)
- [ ] Fix `guests.byShow()` to check database readiness
- [ ] Normalize query key filter objects using JSON.stringify
- [ ] Add `enabled` condition to `useOnlineStatus` polling
- [ ] Fix `releases.types()` to be properly async
- [ ] Add error handling to `useOnlineInvalidation`
- [ ] Implement online/offline event listeners for cache invalidation
- [ ] Test database initialization with slow networks (throttle to 2G in DevTools)
- [ ] Test private browsing mode (IndexedDB not available)
- [ ] Test rapid online/offline transitions

---

## Files to Modify

1. **database.ts** - Add initialization lock, error propagation
2. **client.ts** - Fix guests.byShow(), guests.byShow() return values, types() async
3. **hooks.ts** - Add useOfflineInit, standardize error handling, fix query keys, add event listeners
4. **types.ts** - Add DataAccessResult wrapper type (optional but recommended)
5. **NEW: useOfflineInit.ts** - Create initialization hook
6. **NEW: OfflineInitProvider.tsx** - Create provider component

---

**Generated:** January 18, 2026
**Auditor:** React Debugger - Offline Architecture Analysis
