# IndexedDB Error Handling Analysis - DMB Almanac Svelte

**Project**: DMB Almanac (`dmb-almanac-svelte`)
**Date**: 2026-01-23
**Focus**: Dexie.js/IndexedDB error handling patterns
**Scope**: `/src/lib/db/dexie/**` and `/src/lib/stores/**`

---

## Executive Summary

The DMB Almanac IndexedDB layer implements moderate error handling with several critical gaps and architectural vulnerabilities. While global error dispatching and transaction error handling exist, there are significant blind spots in quota management, cross-tab synchronization, and graceful degradation patterns.

**Overall Risk Level**: **MEDIUM-HIGH**

| Category | Status | Severity |
|----------|--------|----------|
| Global error handlers | ✓ Implemented | - |
| Transaction abort handling | ✓ Partial | MEDIUM |
| QuotaExceededError handling | ✗ **Gap** | **HIGH** |
| VersionError handling | ✓ Implemented | - |
| ConstraintError handling | ✓ Partial | LOW |
| Graceful degradation | ✗ **Gap** | **MEDIUM** |
| Cross-tab sync errors | ✗ **Gap** | **HIGH** |

---

## 1. Global Error Handlers (db.on('error'))

### Status: PARTIAL - CUSTOM EVENTS ONLY

**Location**: `/src/lib/db/dexie/db.ts` (lines 330-371)

### Current Implementation

```typescript
// Lines 330-371: handleError method
handleError(error: unknown, context: string): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorType = errorObj.name || 'UnknownError';

  // Determine severity based on error type
  const isRecoverable = this.isRecoverableError(errorType);
  const severity = isRecoverable ? 'warn' : 'error';

  console[severity](`[DexieDB] ${context}:`, {
    name: this.name,
    version: this.verno,
    errorType,
    message: errorObj.message,
    stack: errorObj.stack,
    isRecoverable,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dexie-error', {
      detail: {
        error: errorObj,
        dbName: this.name,
        version: this.verno,
        errorType,
        context,
        isRecoverable,
        timestamp: Date.now(),
      },
    }));
  }
}

// Lines 376-384: isRecoverableError
private isRecoverableError(errorType: string): boolean {
  const recoverableErrors = [
    'AbortError',
    'TimeoutError',
    'TransactionInactiveError',
    'DatabaseClosedError',
  ];
  return recoverableErrors.includes(errorType);
}
```

### Global Event Dispatching (lines 265-293)

```typescript
// Version change handler
this.on('versionchange', (event) => {
  console.warn('[DexieDB] Database version changed in another tab...');
  this.close();
  window.dispatchEvent(new CustomEvent('dexie-version-change', {...}));
});

// Blocked upgrade handler
this.on('blocked', (event) => {
  console.error('[DexieDB] Database upgrade blocked by another tab');
  window.dispatchEvent(new CustomEvent('dexie-upgrade-blocked', {...}));
});
```

### Gaps and Issues

1. **No db.on('error') handler**: The Dexie database instance does NOT have a global error event listener attached
   - Error events are only dispatched through custom code paths
   - Some errors may silently fail without triggering handlers

2. **Limited error recovery context**:
   - No automatic retry logic
   - No backoff strategy
   - No circuit breaker pattern

3. **Missing error handlers**:
   - No handler for database open failures
   - No handler for transaction failures
   - No handler for quota exhaustion

### Risk Assessment

**Severity**: MEDIUM
**Impact**: Errors in queries may go unhandled silently

---

## 2. Transaction Abort Handling

### Status: PARTIAL - BASIC HANDLING

**Location**: Multiple locations
- `/src/lib/stores/dexie.ts` (lines 704-795, user data stores)
- `/src/lib/db/dexie/queries.ts` (lines 301-314, venue stats)
- `/src/lib/db/dexie/sync.ts` (lines 627-649, sync operations)

### Current Implementation - User Data Stores

```typescript
// Lines 723-745: Attended shows add operation
async add(showId: number, showDate?: string) {
  const db = await getDb();
  try {
    await db.userAttendedShows.add({
      showId,
      addedAt: Date.now(),
      // ... more fields
    });
    invalidateUserDataCaches();
  } catch (error) {
    if (error instanceof Dexie.ConstraintError) {
      console.warn('[dexie] Show already marked as attended:', showId);
      return; // Silently ignore duplicate
    }
    throw error; // Re-throw other errors
  }
}

// Lines 755-779: Toggle operation with transaction
async toggle(showId: number, showDate?: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.transaction('rw', db.userAttendedShows, async () => {
    const existing = await db.userAttendedShows.where('showId').equals(showId).first();
    if (existing) {
      await db.userAttendedShows.where('showId').equals(showId).delete();
      return false;
    }
    await db.userAttendedShows.add({...});
    return true;
  });
  invalidateUserDataCaches();
  return result;
}
```

### Transaction Handling in Queries

```typescript
// Lines 301-314: getVenueStats (read-only transaction)
const result = await db.transaction('r', [db.venues], async () => {
  const venues = await db.venues.toArray();
  const total = venues.length;
  const totalShows = venues.reduce((sum, v) => sum + v.totalShows, 0);
  const states = new Set(venues.map((v) => v.state).filter(Boolean)).size;
  return { total, totalShows, states };
});
```

### Issues Identified

1. **No TransactionInactiveError handling**:
   - Async operations inside transactions could break them
   - No validation that transaction is still active

2. **Incomplete abort recovery**:
   ```typescript
   // Current pattern - partial handling
   try {
     await transaction(...);
   } catch (error) {
     if (error instanceof Dexie.ConstraintError) {
       // Handle constraint only
       return;
     }
     throw error; // All other errors crash
   }
   ```

3. **No AbortError detection**:
   - Transactions aborted by timeouts or conflicts are not distinguished
   - No retry logic for aborted transactions

### Risk Assessment

**Severity**: MEDIUM
**Impact**: Aborted transactions may leave UI in inconsistent state

---

## 3. QuotaExceededError Handling

### Status: CRITICAL GAP - INSUFFICIENT HANDLING

**Location**:
- `/src/lib/db/dexie/queries.ts` (lines 1306-1424, bulk operations)
- `/src/lib/db/dexie/data-loader.ts` (lines 997-1015, initial load)
- `/src/lib/db/dexie/sync.ts` (lines 631-649, sync)

### Current Implementation

```typescript
// Lines 1306-1342: bulkInsertShows with quota handling
export async function bulkInsertShows(
  shows: DexieShow[],
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let inserted = 0;

  for (let i = 0; i < shows.length; i += chunkSize) {
    const chunk = shows.slice(i, i + chunkSize);
    try {
      await db.transaction('rw', db.shows, async () => {
        await db.shows.bulkAdd(chunk);
      });
      inserted += chunk.length;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('[Queries] Storage quota exceeded during bulkInsertShows:', {
          inserted,
          attempted: shows.length,
          batchIndex: Math.floor(i / chunkSize)
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dexie-quota-exceeded', {
            detail: { entity: 'shows', loaded: inserted, attempted: shows.length }
          }));
        }
      }
      throw error; // Always throws, no recovery
    }
  }
  return inserted;
}
```

### Data Loader Quota Handling

```typescript
// Lines 997-1015: loadBatch with quota detection
} catch (error) {
  if (error instanceof Error && error.name === 'QuotaExceededError') {
    logger.error('[DataLoader] Storage quota exceeded during batch load:', {
      loaded: `${(totalLoaded / 1024 / 1024).toFixed(2)}MB`,
      available: `${(estimate.available / 1024 / 1024).toFixed(2)}MB`,
      batchSize,
      entity: task.name,
    });
    // Tries smaller batch size
    await updateStorageEstimate();
    // But still throws - no recovery!
    throw error;
  }
  throw error;
}
```

### Sync Quota Handling

```typescript
// Lines 631-649: performSync quota error
} catch (error) {
  if (error instanceof Error && error.name === 'QuotaExceededError') {
    console.error('[Sync] Storage quota exceeded during sync:', {
      syncStatus: 'error',
      lastError: error.message
    });
    // Dispatches event but still throws
    throw error;
  }
  throw error;
}
```

### Critical Gaps

1. **No proactive quota checking before writes**:
   ```typescript
   // MISSING PATTERN:
   const estimate = await navigator.storage.estimate();
   if (estimate.usage + estimatedDataSize > estimate.quota * 0.9) {
     // Should cleanup old data or prompt user
   }
   ```

2. **No quota monitoring**:
   - No percentage warnings (80%, 90%)
   - No storage health checks
   - No automatic cache cleanup on quota pressure

3. **No request for persistent storage**:
   - Code has `requestPersistentStorage()` but it's not called in critical paths
   - No coordination with PWA storage persistence

4. **No graceful degradation**:
   - QuotaExceededError always causes operation to fail completely
   - No partial success handling (save what fits)
   - No user notification mechanism

5. **No recovery mechanism**:
   - Cannot resume failed bulk operations
   - Cannot retry with smaller batches automatically

### Risk Assessment

**Severity**: CRITICAL
**Impact**: Quota exceeded causes complete operation failure, no user feedback

---

## 4. VersionError Handling

### Status: IMPLEMENTED - GOOD COVERAGE

**Location**: `/src/lib/db/dexie/db.ts` (lines 264-293)

### Current Implementation

```typescript
// Lines 265-279: Version change handler
this.on('versionchange', (event) => {
  console.warn('[DexieDB] Database version changed in another tab, closing connection...');
  this.close();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dexie-version-change', {
      detail: {
        event,
        action: 'refresh-required',
        message: 'Please refresh the page to get the latest version'
      }
    }));
  }
});

// Lines 282-293: Blocked upgrade handler
this.on('blocked', (event) => {
  console.error('[DexieDB] Database upgrade blocked by another tab');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dexie-upgrade-blocked', {
      detail: {
        message: 'Please close all other tabs to complete the database upgrade',
        currentVersion: this.verno,
        event,
      },
    }));
  }
});
```

### Migration Error Handling

```typescript
// Lines 638-712: runSafeMigration with error tracking
async runSafeMigration(): Promise<{
  success: boolean;
  fromVersion: number | null;
  toVersion: number;
  error?: Error;
  duration: number;
}> {
  try {
    const existingDb = await Dexie.getDatabaseNames();
    if (existingDb.includes(this.name)) {
      const tempDb = new Dexie(this.name);
      await tempDb.open();
      fromVersion = tempDb.verno;
      tempDb.close();
    }

    await this.open(); // Triggers migrations

    return {
      success: true,
      fromVersion,
      toVersion: this.verno,
      duration,
    };
  } catch (error) {
    // Dispatch migration error event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexie-migration-error', {
        detail: {
          error: errorObj,
          fromVersion,
          targetVersion: CURRENT_DB_VERSION,
          duration,
          dbName: this.name,
        },
      }));
    }
    throw error;
  }
}
```

### Strengths

1. **Proper version change detection**: Closes DB and notifies UI
2. **Blocked upgrade handling**: User-friendly message to close tabs
3. **Migration tracking**: Records migration history in localStorage
4. **Clear error events**: Specific event types for different scenarios

### Minor Gaps

1. **No automatic retry after version conflict**:
   - Application must manually refresh page
   - No in-app recovery without page reload

2. **Migration history not synced across tabs**:
   - Each tab maintains own localStorage history
   - No shared migration state

### Risk Assessment

**Severity**: LOW
**Impact**: User experience issue, but not data corruption

---

## 5. ConstraintError Handling

### Status: PARTIAL - BASIC DETECTION

**Location**: `/src/lib/stores/dexie.ts` (lines 739-745, 828-834, 913-919)

### Current Implementation

```typescript
// Lines 739-745: Handled in userAttendedShows.add
catch (error) {
  if (error instanceof Dexie.ConstraintError) {
    console.warn('[dexie] Show already marked as attended:', showId);
    return; // Silently ignore duplicate
  }
  throw error;
}

// Lines 828-834: Handled in userFavoriteSongs.add
catch (error) {
  if (error instanceof Dexie.ConstraintError) {
    console.warn('[dexie] Song already marked as favorite:', songId);
    return; // Silently ignore duplicate
  }
  throw error;
}

// Lines 913-919: Handled in userFavoriteVenues.add
catch (error) {
  if (error instanceof Dexie.ConstraintError) {
    console.warn('[dexie] Venue already marked as favorite:', venueId);
    return; // Silently ignore duplicate
  }
  throw error;
}
```

### Issues Identified

1. **Silent failures for duplicates**:
   - No user feedback that operation was idempotent
   - Cache invalidation happens even on silent failure
   - UI state may not update correctly

2. **No upsert pattern**:
   - Code uses `add()` then catches duplicate error
   - Should use `put()` for idempotent operations
   - Performance issue: Two database operations instead of one

3. **Limited scope**:
   - Only handled in user data stores
   - Bulk operations don't check for constraint violations
   - Foreign key violations not handled

### Risk Assessment

**Severity**: LOW
**Impact**: Performance issue and UX gap, not data corruption

---

## 6. Graceful Degradation Patterns

### Status: MISSING - CRITICAL GAP

**Location**: Missing across codebase

### What's Missing

#### 1. Read-Only Fallback Mode
```typescript
// PATTERN NOT IMPLEMENTED:
if (!db.isOpen()) {
  // Should fall back to server API
  // Should display "offline mode" UI
  // Should not attempt writes
}
```

#### 2. Partial Success Handling
```typescript
// CURRENT: All-or-nothing
try {
  await bulkInsertShows(1000);
} catch (error) {
  // Entire operation failed, can't tell what succeeded
}

// SHOULD BE:
const result = await bulkInsertShowsSafe(1000);
// {
//   successful: 950,
//   failed: 50,
//   errors: [...],
//   recoverable: true/false
// }
```

#### 3. IndexedDB Unavailability Handling
```typescript
// In init.ts, lines 369-393
if (!isIndexedDBAvailable()) {
  // Currently returns error, doesn't degrade
  // Should continue in server-only mode
  return {
    success: false,
    dataLoaded: false,
    error: unavailableError,
  };
}
```

#### 4. Network Error Recovery
```typescript
// MISSING PATTERN:
const maxRetries = 3;
const backoffMs = [100, 500, 2000];

for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    return await fetchData();
  } catch (error) {
    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, backoffMs[attempt]));
    } else {
      throw error;
    }
  }
}
```

#### 5. Transaction Timeout Recovery
```typescript
// MISSING: No handling for transaction timeouts
// Current code has timeout detection but no recovery
const recoverableErrors = [
  'AbortError',
  'TimeoutError',  // Detected but not recovered
  'TransactionInactiveError',
  'DatabaseClosedError',
];
```

### Risk Assessment

**Severity**: MEDIUM
**Impact**: Poor user experience during degraded conditions

---

## 7. Cross-Tab Sync Error Handling

### Status: MISSING - CRITICAL GAP

**Location**: Missing implementation

### Current State

The codebase has:
- Version change detection (`dexie-version-change` event) at `/src/lib/db/dexie/db.ts:265`
- Blocked upgrade detection (`dexie-upgrade-blocked` event) at `/src/lib/db/dexie/db.ts:282`
- No cross-tab cache invalidation coordination
- No cross-tab mutation ordering

### What's Missing

#### 1. Cross-Tab Mutation Sync
```typescript
// MISSING PATTERN: BroadcastChannel for mutations
// File: /src/lib/stores/dexie.ts (not implemented)

const mutationChannel = new BroadcastChannel('dmb-mutations');

// When user favorites a song in tab A:
db.userFavoriteSongs.add(song).then(() => {
  mutationChannel.postMessage({
    type: 'songFavorited',
    songId: song.id,
    timestamp: Date.now()
  });
});

// Tab B listens:
mutationChannel.onmessage = (event) => {
  if (event.data.type === 'songFavorited') {
    // Invalidate relevant caches
    clearSongCaches();
  }
};
```

#### 2. Concurrent Modification Conflict Detection
```typescript
// MISSING: No detection of concurrent modifications
// Example problem:
// Tab A deletes show #123 from attended
// Tab B tries to update show #123 (stale reference)
// Result: Undefined behavior
```

#### 3. Cache Coherency Across Tabs
```typescript
// PARTIAL: invalidateUserDataCaches() called locally
// MISSING: No mechanism to invalidate other tabs' caches
```

#### 4. Write Ordering Guarantee
```typescript
// MISSING: No vector clock or timestamp ordering
// Problem: If tab A and tab B both add favorites:
// - No guaranteed order
// - May result in different final state per tab
```

#### 5. Conflict Resolution Policy
```typescript
// MISSING: No defined conflict resolution
// Current code assumes no conflicts (dangerous)
// Should implement: Last-write-wins, merge, or prompting
```

### Real-World Failure Scenarios

1. **User has app in two tabs**:
   - Tab A: Favorited song X
   - Tab B: Doesn't know about it
   - User navigates in tab B, no indication song is favorited
   - Cache mismatch between tabs

2. **User closes other tab after upgrade**:
   - Tab A starts upgrade
   - Tab B notified of versionchange, closes
   - Tab A still has stale connection state
   - No mechanism to verify all tabs are closed

3. **Service Worker syncs while tabs are open**:
   - SW performs full sync
   - Tab A queries old data
   - Tab B queries new data
   - Inconsistent app state visible to user

### Risk Assessment

**Severity**: CRITICAL
**Impact**: Data inconsistency across tabs, race conditions

---

## 8. Data Integrity Issues

### Status: PARTIAL - VALIDATION EXISTS BUT GAPS REMAIN

**Location**: `/src/lib/db/dexie/data-loader.ts` (lines 1095-1105, validation)

### Current Validation

```typescript
// Lines 1095-1105: Foreign key validation
function validateForeignKeys(data: LoadedData): {
  valid: boolean;
  warnings: string[];
} {
  try {
    const warnings: string[] = [];
    // Checks for orphaned shows without venues/tours
    // Checks for setlist entries without shows/songs
    return { valid: true, warnings };
  } catch (error) {
    logger.error('[DataLoader] Foreign key validation failed:', error);
    return { valid: false, warnings: [String(error)] };
  }
}
```

### Gaps

1. **No rollback on validation failure**:
   - If foreign key validation fails after load, data is already in DB
   - No automatic cleanup of invalid data

2. **No integrity checks on updates**:
   - Only validates during initial load
   - User mutations not validated
   - Sync operations not validated

3. **No transaction rollback on error**:
   - Partial writes may succeed before error
   - No way to undo failed operations

### Risk Assessment

**Severity**: MEDIUM
**Impact**: Data corruption if validation fails mid-load

---

## Summary Table: Error Handling Gaps

| Error Type | Handler | Recovery | User Feedback | Risk |
|-----------|---------|----------|---------------|------|
| VersionError | Yes | Manual refresh | Yes | LOW |
| ConstraintError | Yes | Fail silent | No | LOW |
| QuotaExceededError | Event only | No retry | Event only | **CRITICAL** |
| TransactionAbort | Partial | Re-throw | No | MEDIUM |
| TransactionInactive | Detected | No recovery | No | MEDIUM |
| Network errors | Partial | 1 retry | No | MEDIUM |
| IndexedDB unavailable | Fail fast | No degrade | Yes | **MEDIUM** |
| Cross-tab mutations | None | N/A | None | **CRITICAL** |
| Foreign key violations | Detected | No cleanup | No | MEDIUM |
| Storage quota (user data) | Not checked | None | Yes (event) | **CRITICAL** |

---

## Recommended Fixes (Priority Order)

### CRITICAL (Implement Immediately)

1. **Quota Exceeded Handling** (Line 1306-1424 in queries.ts)
   ```typescript
   // Before bulk operations, check quota:
   const estimate = await navigator.storage.estimate();
   const dataSize = estimateDataSize(data);

   if (estimate.usage + dataSize > estimate.quota * 0.9) {
     // Cleanup old data or throw with user message
     await cleanupExpiredData();
   }
   ```

2. **Cross-Tab Sync via BroadcastChannel**
   ```typescript
   // Create new file: /src/lib/db/dexie/cross-tab-sync.ts
   // Coordinate mutations across tabs
   ```

3. **Graceful Degradation for Quota**
   ```typescript
   // Partial upload on quota exceeded:
   // Save what fits, return successful count
   ```

### HIGH (Implement Soon)

4. **Network Retry with Exponential Backoff**
   - data-loader.ts: Multiple fetch attempts
   - sync.ts: Add backoff between retries

5. **TransactionInactiveError Detection**
   - Wrap queries to detect abort
   - Implement automatic retry

6. **Storage Health Monitoring**
   - `/src/lib/stores/dexie.ts:1743-1834` (health check exists but not used)
   - Export and call from app initialization

### MEDIUM (Implement Later)

7. **Upsert Pattern for User Data**
   - Replace add() + catch pattern with put()
   - Improves performance and UX

8. **Migration Auto-Recovery**
   - Detect incomplete migrations
   - Allow resume instead of full reload

---

## Code Files Summary

### Files with Error Handling

1. **`/src/lib/db/dexie/db.ts`** (900 lines)
   - Global error dispatch: Lines 330-371
   - Version change handling: Lines 265-293
   - Migration safety: Lines 638-712
   - Storage management: Lines 801-853

2. **`/src/lib/stores/dexie.ts`** (1842 lines)
   - User data error handling: Lines 739-919
   - liveQuery error handling: Lines 102-109
   - Global search error handling: Lines 1431-1435
   - Health check error handling: Lines 1788-1797

3. **`/src/lib/db/dexie/queries.ts`** (1587 lines)
   - Bulk operation error handling: Lines 1306-1424
   - QuotaExceededError detection: Lines 1321-1334
   - Search error handling: Lines 259-263
   - Transaction error handling: Lines 301-314, 531-542

4. **`/src/lib/db/dexie/data-loader.ts`** (1500+ lines)
   - Quota exceeded handling: Lines 997-1015
   - Fetch error handling: Lines 359-375
   - Foreign key validation: Lines 1095-1105
   - Error event dispatching: Lines 1437-1441

5. **`/src/lib/db/dexie/sync.ts`** (850+ lines)
   - Sync quota handling: Lines 631-649
   - HTTP error handling: Lines 532, 744
   - Transaction error handling: Lines 573, 591, 629-649

### Files with Initialization Error Handling

6. **`/src/lib/db/dexie/init.ts`** (732 lines)
   - Step-by-step error tracking: Lines 356-564
   - Timeout handling: Lines 154-176
   - Detailed error reporting: Lines 288-320

### Service Worker Related

7. **`/src/lib/sw/register.ts`** (not analyzed in detail)
   - SW registration error handling exists
   - Multiple catch blocks for different operations

---

## Testing Recommendations

### Unit Tests Needed

```typescript
// Test quota exceeded recovery
test('bulkInsertShows recovers from quota exceeded', async () => {
  // Mock navigator.storage.estimate() to return 99% full
  // Verify operation fails gracefully
  // Verify error event is dispatched
});

// Test cross-tab version change
test('handles version change event from other tab', async () => {
  // Simulate versionchange event
  // Verify db.close() is called
  // Verify dexie-version-change event is dispatched
});

// Test transaction timeout
test('retries transaction on timeout', async () => {
  // Mock transaction to timeout
  // Verify automatic retry occurs
  // Verify exponential backoff
});

// Test graceful degradation
test('continues without IndexedDB if unavailable', async () => {
  // Mock indexedDB as unavailable
  // Verify app falls back to server API
  // Verify UI shows degraded mode
});
```

### Integration Tests

```typescript
// Test cross-tab scenarios
test('mutations sync across tabs via BroadcastChannel', async () => {
  // Create two browser contexts
  // Add favorite in tab A
  // Verify tab B receives cache invalidation
  // Verify consistency maintained
});

// Test quota exceeded during concurrent uploads
test('handles quota exceeded with multiple tabs writing', async () => {
  // Tab A: Try to upload 500 items
  // Tab B: Try to upload 300 items
  // Verify graceful handling of quota exceeded
});
```

---

## Conclusion

The DMB Almanac IndexedDB layer has solid foundations with:
- Global error dispatching (custom events)
- Version change handling
- Migration tracking
- Basic constraint error detection

However, critical gaps exist in:
- **Quota management**: No proactive checking, no partial success
- **Cross-tab sync**: No mutation coordination, race condition risks
- **Graceful degradation**: Fails hard instead of degrading
- **Recovery mechanisms**: Limited retry logic, no backoff

**Recommended approach**: Implement cross-tab sync layer and quota management first, as these pose highest risk to data consistency and user experience.

