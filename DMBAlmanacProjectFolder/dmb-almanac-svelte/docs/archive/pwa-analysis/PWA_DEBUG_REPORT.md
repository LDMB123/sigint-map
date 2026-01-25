# DMB PWA Offline Database Debug Report

## Executive Summary

The app displays "database is offline" messages because of a **chicken-and-egg problem** in the initialization sequence. The app is throwing errors before the initial sync completes, creating a misleading offline state that persists even when online.

**Root Causes:**
1. `SyncProvider` initializes before data is loaded, setting `hasLocalData = false`
2. Hooks throw errors when `offlineDataAccess` returns `null` (no local data and offline)
3. Error messages are being shown while the initial sync is still in progress
4. Two separate database instances (`DMBDatabase` and `DMBOfflineDatabase`) may have conflicting initialization

---

## Problem Analysis

### 1. SyncProvider Initialization Flow (TIMING ISSUE)

**File:** `/Users/louisherman/Documents/dmb-pwa/src/components/providers/SyncProvider.tsx`

**Current behavior:**
```typescript
// Line 55-64: Initial state assumes NO data
const [isInitialized, setIsInitialized] = useState(false);
const [hasLocalData, setHasLocalData] = useState(false);  // <-- DEFAULTS TO FALSE

// Line 88-156: Async initialization
useEffect(() => {
  const initialize = async () => {
    setIsOnline(navigator.onLine);  // Line 93
    const syncService = getSyncService();
    // ... setup service worker ...

    // Line 119-127: Check local data AFTER setup
    const stats = await getDatabaseStats();
    setHasLocalData(stats.shows > 0 || stats.songs > 0);

    // Line 138-156: Initial sync if online and no data
    if (navigator.onLine && !hasData) {
      await syncService.manualSync();  // THIS IS ASYNC
    }

    setIsInitialized(true);  // Line 136 - TOO EARLY
  };
}, []);
```

**The issue:**
- `setIsInitialized(true)` is called BEFORE the initial sync completes
- UI renders while `hasLocalData = false` and `isInitialized = true`
- Components see the offline state banner during initial sync

### 2. Hook Error Throwing (CLIENT.TS)

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/client.ts`

**Shows example (Line 68-94):**
```typescript
export const shows = {
  async list(input, options) {
    const hasLocal = await hasValidLocalData('shows', TTL.SHOWS, options);

    if (hasLocal) {
      return { ...(await showsQueries.showsList(input)), source: 'local' };
    }

    // Returns empty array if offline with no local data
    if (!isOnline()) {
      return { shows: [], data: [], nextCursor: undefined, ... };
    }

    // Line 92-93: Returns NULL if online but no local data
    return null;  // <-- TRIGGERS ERROR IN HOOK
  }
}
```

**Hooks behavior (Line 141-146):**
```typescript
export function useShowsList(filters, options) {
  return useQuery({
    queryFn: async () => {
      const result = await offlineDataAccess.shows.list(filters, options);
      if (result) return result;

      // Line 146: Throws error before sync completes
      throw new Error('No local data and offline');
    },
  });
}
```

### 3. Database Initialization Confusion

**Two database instances exist:**

1. `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/dexie.ts` - **PRIMARY (2100+ lines)**
   - Singleton: `export const db = new DMBDatabase()`
   - Used by SyncProvider: `getDatabaseStats()` calls this

2. `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/database.ts` - **SECONDARY**
   - Singleton: `export const offlineDb = new DMBOfflineDatabase()`
   - Used by data access queries

**Result:** If sync data goes to `db` but queries read from `offlineDb`, data never appears locally.

### 4. Initial Sync Not Actually Happening

**File:** `/Users/louisherman/Documents/dmb-pwa/src/components/providers/SyncProvider.tsx` (Line 138-156)

```typescript
if (navigator.onLine && !hasData) {
  console.log('[SyncProvider] No local data - starting initial sync...');
  try {
    await syncService.manualSync();  // <-- AWAITS THIS
    // Refresh database stats after sync
    const newStats = await getDatabaseStats();
    setDatabaseStats({...});
    setHasLocalData(newStats.shows > 0 || newStats.songs > 0);
    console.log('[SyncProvider] Initial sync complete');
  } catch (error) {
    console.error('[SyncProvider] Initial sync failed:', error);
  }
}
```

**Problem:**
- This code is inside `initialize()` which should wait, but...
- `setIsInitialized(true)` is called BEFORE this block completes
- The sync service may not have proper error handling

---

## Where "Database is Offline" Messages Appear

**Files showing offline messages:**
- `/Users/louisherman/Documents/dmb-pwa/src/app/(main)/shows/page.tsx:69-72`
- `/Users/louisherman/Documents/dmb-pwa/src/app/(main)/songs/page.tsx`
- `/Users/louisherman/Documents/dmb-pwa/src/app/(main)/tours/page.tsx`
- `/Users/louisherman/Documents/dmb-pwa/src/app/(main)/releases/page.tsx`

**Condition (SyncProvider context):**
```typescript
{!isOnline && !hasLocalData && (
  <div className="...">
    You're offline and no local data is available. Connect to the internet to sync data.
  </div>
)}
```

This shows when:
- `isOnline = true` (navigator.onLine shows true)
- BUT `hasLocalData = false` (no shows/songs cached yet)
- Which happens DURING initial sync

---

## Root Cause: Initialization Order

The correct sequence SHOULD be:
1. Setup sync service
2. Check for existing local data
3. **IF no local data AND online: Start initial sync and WAIT**
4. **Only after sync: Set hasLocalData = true**
5. **Only then: Set isInitialized = true**

Current sequence:
1. Setup sync service
2. Check for local data (empty)
3. Set hasLocalData = false
4. Set isInitialized = true ← **TOO EARLY** (before sync)
5. Components render with offline state
6. Initial sync runs in background (user sees error)

---

## Specific Issues Found

### Issue #1: isInitialized Set Too Early
**Location:** `SyncProvider.tsx:136`
**Problem:** `setIsInitialized(true)` called before initial sync completes
**Impact:** UI renders in loading/offline state while sync happens

### Issue #2: Database Instance Mismatch
**Location:** Two database files
- `dexie.ts`: Used by SyncProvider
- `database.ts`: Used by data access hooks

**Problem:** If sync writes to `dexie.ts` but hooks read from `database.ts`, data never appears
**Impact:** Queries fail even after sync completes

### Issue #3: Hooks Throw Immediately on No Data
**Location:** `client.ts` returns `null` → hooks throw "No local data and offline"
**Problem:** No grace period during initial sync
**Impact:** Loading state shows errors instead of spinners

### Issue #4: hasLocalData Never Updates During Sync
**Location:** `SyncProvider.tsx:69-73`
**Problem:** `hasLocalData` state only updated once at startup, not after sync
**Impact:** Even if sync succeeds, UI still shows offline banner

---

## Fixes Required

### Fix #1: Delay Initialization Until Sync Complete

**File:** `/Users/louisherman/Documents/dmb-pwa/src/components/providers/SyncProvider.tsx`

Replace the initialization logic to properly await sync:

```typescript
useEffect(() => {
  let cleanup: (() => void) | undefined;

  const initialize = async () => {
    setIsOnline(navigator.onLine);
    const syncService = getSyncService();

    // Subscribe to sync status changes
    const unsubscribe = syncService.onStatusChange((state) => {
      setSyncState(state);
      // Update hasLocalData when sync completes
      if (state.status === SyncStatus.IDLE) {
        updateLocalDataStatus();
      }
    });

    // Setup service worker and network detection
    try {
      await setupServiceWorkerIntegration();
    } catch (error) {
      console.warn('[SyncProvider] Service worker integration failed:', error);
    }

    const cleanupNetwork = setupNetworkStateDetection(() => {
      syncService.manualSync().catch(console.error);
    });

    // Check local data
    await updateLocalDataStatus();

    // Process pending actions
    try {
      await syncService.processPendingQueue();
    } catch (error) {
      console.warn('[SyncProvider] Failed to process pending queue:', error);
    }

    // FIX: Only proceed with initial sync logic
    const stats = await getDatabaseStats();
    const hasData = stats.shows > 0 || stats.songs > 0;

    // Auto-sync on startup if online and no local data
    if (navigator.onLine && !hasData) {
      console.log('[SyncProvider] No local data - starting initial sync...');
      try {
        await syncService.manualSync();
        // Refresh database stats after sync completes
        await updateLocalDataStatus();
        console.log('[SyncProvider] Initial sync complete');
      } catch (error) {
        console.error('[SyncProvider] Initial sync failed:', error);
      }
    }

    // FIX: Only set initialized after sync is complete or skipped
    setIsInitialized(true);

    cleanup = () => {
      unsubscribe();
      cleanupNetwork();
    };
  };

  initialize();

  return () => {
    cleanup?.();
  };
}, []);

// Helper function to update local data status
const updateLocalDataStatus = useCallback(async () => {
  try {
    const stats = await getDatabaseStats();
    setDatabaseStats({
      shows: stats.shows,
      songs: stats.songs,
      venues: stats.venues,
      tours: stats.tours,
    });
    setHasLocalData(stats.shows > 0 || stats.songs > 0);
  } catch (error) {
    console.error('[SyncProvider] Failed to check local data:', error);
    setHasLocalData(false);
  }
}, []);
```

### Fix #2: Update hasLocalData When Sync Status Changes

Add listener to sync status to update hasLocalData:

```typescript
const unsubscribe = syncService.onStatusChange((state) => {
  setSyncState(state);

  // Refresh local data count when sync completes
  if (state.status === SyncStatus.IDLE) {
    checkLocalData();  // Call the existing callback
  }
});
```

### Fix #3: Verify Database Instance Consistency

**Check:** Ensure both `dexie.ts` and `database.ts` are not conflicting.

**Recommended:** Use only ONE database instance. Choose `dexie.ts` as it's more complete:

In `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/client.ts`:

```typescript
// INSTEAD OF:
import { offlineDb } from './database';

// USE:
import { db } from './dexie';

// Then replace all offlineDb references with db
```

### Fix #4: Add Graceful Degradation to Hooks

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/hooks.ts`

Handle the sync-in-progress state better:

```typescript
export function useShowsList(filters, options) {
  return useQuery({
    queryKey: queryKeys.shows.list(filters),
    queryFn: async () => {
      const result = await offlineDataAccess.shows.list(filters, options);

      // If result exists, return it
      if (result) return result;

      // If we're online but no data, return empty with meta about sync
      if (isOnline()) {
        console.log('[useShowsList] Waiting for initial sync...');
        return {
          shows: [],
          data: [],
          nextCursor: undefined,
          hasMore: false,
          source: 'pending-sync' as const,
        };
      }

      // Only throw if truly offline
      throw new Error('No local data and offline');
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: true,  // Retry when coming back online
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### Fix #5: Add Sync Progress Indicator

Instead of showing "offline" during sync, show "syncing":

```typescript
// In SyncProvider (already has isSyncing):
{isSyncing && (
  <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-300">
    Syncing data... This may take a moment.
  </div>
)}

{!isOnline && !hasLocalData && !isSyncing && (
  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
    You're offline and no local data is available. Connect to the internet to sync data.
  </div>
)}
```

---

## Implementation Priority

### Phase 1 (Critical - Do First)
1. Fix #1: Delay initialization until sync complete - **REQUIRED**
2. Add logging to verify sync completes - **DEBUG HELP**

### Phase 2 (High - Do Next)
3. Fix #2: Update hasLocalData on sync status changes
4. Fix #5: Better progress indication

### Phase 3 (Medium - Later)
5. Fix #3: Consolidate database instances (if mismatch confirmed)
6. Fix #4: Graceful degradation in hooks

---

## Testing the Fix

After applying Fix #1 and #2:

1. **Open DevTools Console** - Look for these messages:
   ```
   [SyncProvider] Service worker integration complete
   [SyncProvider] No local data - starting initial sync...
   [SyncProvider] Initial sync complete
   ```

2. **Network Tab** - Should see requests to `/api/trpc/sync/*`

3. **Application Tab → IndexedDB → DMBDatabase:**
   - Before: Shows > 0, Songs > 0, Venues > 0 should populate
   - After refresh: Data should persist

4. **UI Should NOT show:**
   - "database is offline" during app load
   - May show "Syncing data..." briefly
   - Should show actual content after 2-5 seconds

---

## Debugging Commands

Run in console to verify:

```javascript
// Check if databases are initialized
await indexedDB.databases().then(dbs => console.log(dbs.map(d => d.name)));

// Check data in primary database
const dbs = await indexedDB.open('DMBDatabase', 2);
console.log('Shows:', await dbs.objectStoreNames);

// Check sync status
navigator.serviceWorker.ready.then(reg =>
  console.log('SW ready:', reg.active?.state)
);

// Check if currently online
console.log('navigator.onLine:', navigator.onLine);
```

---

## Files to Modify

1. `/Users/louisherman/Documents/dmb-pwa/src/components/providers/SyncProvider.tsx` - **PRIMARY**
2. `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/client.ts` - **SECONDARY**
3. `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/hooks.ts` - **TERTIARY**
4. `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/data-access/database.ts` - **VERIFY**

---

## Additional Recommendations

1. **Add timeouts:** If initial sync takes >10s, show user a message
2. **Add persistence check:** Verify data actually reaches IndexedDB
3. **Add error boundary:** Catch hook errors and show friendly message
4. **Add instrumentation:** Log all sync transitions to console in dev mode
5. **Consider Sentry:** Log these errors to catch in production

---

## Summary

The "database is offline" message appears because:

1. **hasLocalData starts as false** (no data on first load)
2. **isInitialized becomes true before sync completes** (timing issue)
3. **UI renders with offline state** while sync is still running
4. **Hooks throw errors** when they see no local data + online status

The fix is to **ensure sync completes before marking the app as initialized**, and to **update hasLocalData when sync finishes**.
