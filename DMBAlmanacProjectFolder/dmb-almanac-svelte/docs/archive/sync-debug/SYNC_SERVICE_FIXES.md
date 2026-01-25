# DMB PWA Sync Service - Code Fixes

## Fix #1: Remove showDate Field Rename

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 415-423
**Impact:** Restores critical show data field

### Before (BROKEN):
```typescript
// Transform shows: showDate -> date
if (table === 'shows' && item.showDate) {
  transformed.date = item.showDate instanceof Date
    ? item.showDate.toISOString().split('T')[0]
    : typeof item.showDate === 'string'
      ? item.showDate.split('T')[0]
      : item.showDate;
  delete transformed.showDate;
}
```

### After (FIXED):
```typescript
// Transform shows: keep showDate as-is
if (table === 'shows' && item.showDate) {
  transformed.showDate = item.showDate instanceof Date
    ? item.showDate.toISOString().split('T')[0]
    : typeof item.showDate === 'string'
      ? item.showDate.split('T')[0]
      : item.showDate;
  // Do NOT delete or rename the field - Dexie expects 'showDate'
}
```

---

## Fix #2: Remove .query() Check - Location 1 (Incremental Sync)

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 309-312
**Impact:** Clarifies vanilla client API usage

### Before (CONFUSING):
```typescript
// Fetch deltas from server
// Vanilla tRPC client uses direct method calls
const getChanges = this.trpc.sync?.getChanges;
const delta = typeof getChanges?.query === 'function'
  ? await getChanges.query({ since: lastSync })
  : await getChanges({ since: lastSync });
```

### After (FIXED):
```typescript
// Fetch deltas from server
// Vanilla tRPC client calls procedures directly (no .query wrapper)
const delta = await this.trpc.sync.getChanges({ since: lastSync });
```

---

## Fix #3: Remove .query() Check - Location 2 (Full Sync)

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 390-398
**Impact:** Clarifies vanilla client API usage

### Before (CONFUSING):
```typescript
// Try direct query call first (vanilla client), then .query() (React client)
const response = typeof syncEndpoint.query === 'function'
  ? await syncEndpoint.query({
      limit: this.config.batchSize,
      offset,
    })
  : await syncEndpoint({
      limit: this.config.batchSize,
      offset,
    });
```

### After (FIXED):
```typescript
// Vanilla tRPC clients call procedures directly, not via .query()
const response = await syncEndpoint({
  limit: this.config.batchSize,
  offset,
});
```

---

## Fix #4: Validate Empty Responses

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 400-402
**Impact:** Prevents silent partial syncs

### Before (SILENT FAILURE):
```typescript
if (!response?.data?.length) {
  break;
}
```

### After (FIXED):
```typescript
if (!response?.data?.length) {
  // Validate that response has the expected structure
  if (!response || typeof response !== 'object' || !('data' in response)) {
    const errorMsg = `Invalid response from sync.${endpoint}: ` +
      `expected { data: [...], ... } but got ${JSON.stringify(response)}`;
    throw new Error(errorMsg);
  }
  // If we get here, it's legitimately empty - stop pagination
  break;
}
```

---

## Fix #5: Fix All Mutation Calls

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 701-758
**Impact:** Enables offline mutations to sync

### Pattern to Apply to All 8 Actions:

### Before (ALL MUTATIONS BROKEN):
```typescript
ADD_FAVORITE: () => {
  const endpoint = this.trpc?.favorites?.add;
  if (!endpoint?.mutate) {
    throw new Error('Invalid tRPC endpoint: favorites.add.mutate not available');
  }
  return endpoint.mutate(payload);
},
```

### After (FIXED):
```typescript
ADD_FAVORITE: () => {
  const endpoint = this.trpc?.favorites?.add;
  if (!endpoint) {
    throw new Error('Invalid tRPC endpoint: favorites.add not available');
  }
  return endpoint(payload);  // Direct call, not .mutate()
},
```

### All 8 Actions to Fix:

```typescript
private async executeAction(action: any): Promise<any> {
  if (!this.trpc) {
    throw new Error('Sync service not initialized: tRPC client not available - cannot execute pending actions');
  }

  const { type, payload } = action;

  // Map action types to tRPC procedures
  const procedures: Record<string, (...args: any[]) => Promise<any>> = {
    ADD_FAVORITE: () => {
      const endpoint = this.trpc?.favorites?.add;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: favorites.add not available');
      }
      return endpoint(payload);
    },
    REMOVE_FAVORITE: () => {
      const endpoint = this.trpc?.favorites?.remove;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: favorites.remove not available');
      }
      return endpoint(payload);
    },
    ADD_RATING: () => {
      const endpoint = this.trpc?.ratings?.add;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: ratings.add not available');
      }
      return endpoint(payload);
    },
    UPDATE_RATING: () => {
      const endpoint = this.trpc?.ratings?.update;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: ratings.update not available');
      }
      return endpoint(payload);
    },
    DELETE_RATING: () => {
      const endpoint = this.trpc?.ratings?.delete;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: ratings.delete not available');
      }
      return endpoint(payload);
    },
    ADD_CHECKIN: () => {
      const endpoint = this.trpc?.checkIns?.add;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: checkIns.add not available');
      }
      return endpoint(payload);
    },
    UPDATE_CHECKIN: () => {
      const endpoint = this.trpc?.checkIns?.update;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: checkIns.update not available');
      }
      return endpoint(payload);
    },
    DELETE_CHECKIN: () => {
      const endpoint = this.trpc?.checkIns?.delete;
      if (!endpoint) {
        throw new Error('Invalid tRPC endpoint: checkIns.delete not available');
      }
      return endpoint(payload);
    },
  };

  const procedure = procedures[type];
  if (!procedure) {
    throw new Error(`Unknown action type: ${type}`);
  }

  return procedure();
}
```

---

## Fix #6: Improve isReady() Check

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 164-166
**Impact:** Prevents false positives during initialization

### Before (INSUFFICIENT CHECK):
```typescript
isReady(): boolean {
  return this.trpc !== null && this.trpc !== undefined;
}
```

### After (FIXED):
```typescript
isReady(): boolean {
  // Verify tRPC client exists and has required endpoints
  return (
    this.trpc !== null &&
    this.trpc !== undefined &&
    typeof this.trpc === 'object' &&
    this.trpc.sync !== undefined &&
    typeof this.trpc.sync.shows === 'function'
  );
}
```

---

## Fix #7: Handle Errors in applyChanges

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 514-555
**Impact:** Prevents silent data loss in incremental sync

### Before (ERROR SWALLOWED):
```typescript
private async applyChanges(
  table: string,
  changes: SyncEntity[]
): Promise<{ count: number; bytes: number }> {
  const dbTable = (dexieDb as any)[table];
  let conflictCount = 0;

  for (const item of changes) {
    try {
      const existing = await dbTable.get(item.id);

      if (existing && existing.lastModified > item.lastModified) {
        const resolution = this.resolveConflict(
          existing,
          item,
          this.config.conflictStrategy
        );

        if (resolution === 'local') {
          conflictCount++;
          continue;
        }
      }

      await dbTable.put({
        ...item.data,
        id: item.id,
        cachedAt: Date.now(),
      });
    } catch (error) {
      this.addError(table, (error as Error).message, true);
      // ❌ Error logged but swallowed - continues as if successful
    }
  }

  return {
    count: changes.length,
    bytes: JSON.stringify(changes).length,
  };
}
```

### After (FIXED - Fail Fast):
```typescript
private async applyChanges(
  table: string,
  changes: SyncEntity[]
): Promise<{ count: number; bytes: number }> {
  const dbTable = (dexieDb as any)[table];
  let successCount = 0;

  for (const item of changes) {
    try {
      const existing = await dbTable.get(item.id);

      if (existing && existing.lastModified > item.lastModified) {
        const resolution = this.resolveConflict(
          existing,
          item,
          this.config.conflictStrategy
        );

        if (resolution === 'local') {
          // Skip local version, continue to next item
          continue;
        }
      }

      await dbTable.put({
        ...item.data,
        id: item.id,
        cachedAt: Date.now(),
      });
      successCount++;
    } catch (error) {
      const errorMsg = (error as Error).message;
      this.addError(table, errorMsg, true);
      // Fail fast - don't continue with bad data
      throw new Error(
        `Failed to apply changes for ${table} item ${item.id}: ${errorMsg}`
      );
    }
  }

  return {
    count: successCount,
    bytes: JSON.stringify(changes).length,
  };
}
```

---

## Fix #8: Add Date Validation

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 408-480
**Impact:** Ensures dates are stored in correct format

### Helper Function (Add Near Top of syncEntity Method):
```typescript
/**
 * Validate and normalize ISO date string
 */
private validateAndNormalizeDate(
  itemId: string | number,
  fieldName: string,
  dateValue: any
): string {
  if (dateValue === null || dateValue === undefined) {
    return null as any;  // Allow null dates
  }

  let dateStr: string;

  if (dateValue instanceof Date) {
    dateStr = dateValue.toISOString().split('T')[0];
  } else if (typeof dateValue === 'string') {
    // Validate it looks like an ISO date
    if (!dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
      throw new Error(
        `Invalid date format for ${this.currentTable} item ${itemId}, field ${fieldName}: ` +
        `expected YYYY-MM-DD or ISO string, got "${dateValue}"`
      );
    }
    dateStr = dateValue.split('T')[0];
  } else {
    throw new Error(
      `Invalid date type for ${this.currentTable} item ${itemId}, field ${fieldName}: ` +
      `expected Date or string, got ${typeof dateValue} = ${JSON.stringify(dateValue)}`
    );
  }

  return dateStr;
}
```

### Usage in Data Transformation (Lines 415-477):
```typescript
// Transform shows: keep showDate as-is
if (table === 'shows' && item.showDate !== undefined) {
  transformed.showDate = this.validateAndNormalizeDate(
    item.id,
    'showDate',
    item.showDate
  );
}

// Transform songs: Date fields to ISO strings
if (table === 'songs') {
  if (item.firstPlayed !== undefined) {
    transformed.firstPlayed = this.validateAndNormalizeDate(
      item.id,
      'firstPlayed',
      item.firstPlayed
    );
  }
  if (item.lastPlayed !== undefined) {
    transformed.lastPlayed = this.validateAndNormalizeDate(
      item.id,
      'lastPlayed',
      item.lastPlayed
    );
  }
}

// Transform venues: Date fields to ISO strings
if (table === 'venues') {
  if (item.firstShowDate !== undefined) {
    transformed.firstShowDate = this.validateAndNormalizeDate(
      item.id,
      'firstShowDate',
      item.firstShowDate
    );
  }
  if (item.lastShowDate !== undefined) {
    transformed.lastShowDate = this.validateAndNormalizeDate(
      item.id,
      'lastShowDate',
      item.lastShowDate
    );
  }
}

// Transform tours: Date fields to ISO strings
if (table === 'tours') {
  if (item.startDate !== undefined) {
    transformed.startDate = this.validateAndNormalizeDate(
      item.id,
      'startDate',
      item.startDate
    );
  }
  if (item.endDate !== undefined) {
    transformed.endDate = this.validateAndNormalizeDate(
      item.id,
      'endDate',
      item.endDate
    );
  }
}
```

---

## Fix #9 (Optional): Remove Check in Loop

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 377-381
**Impact:** Prevents race conditions during long syncs

### Before (CHECKS IN LOOP):
```typescript
async performFullSync(): Promise<SyncStats> {
  if (!this.isReady()) {
    const error = new Error('Sync service not initialized: tRPC client not available');
    this.addError('full-sync', error.message, false);
    throw error;
  }

  return this.withLock(async () => {
    const startTime = performance.now();
    this.updateState({ status: SyncStatus.SYNCING });

    try {
      const stats = { /* ... */ };

      // Then later in syncEntity:
      while (true) {
        try {
          if (!this.trpc) {  // ❌ Checks in loop
            throw new Error(`Sync service not initialized...`);
          }
          // ... sync logic ...
        }
      }
    }
  });
}
```

### After (FIXED - CHECK ONCE):
```typescript
async performFullSync(): Promise<SyncStats> {
  if (!this.isReady()) {
    const error = new Error('Sync service not initialized: tRPC client not available');
    this.addError('full-sync', error.message, false);
    throw error;
  }

  return this.withLock(async () => {
    const startTime = performance.now();
    this.updateState({ status: SyncStatus.SYNCING });

    try {
      const stats = { /* ... */ };

      // Then in syncEntity - remove the check from inside the loop:
      while (true) {
        try {
          // ✅ No check here - we verified at method start
          // ... sync logic ...
        }
      }
    }
  });
}
```

Remove these lines from syncEntity (around line 379-381):
```typescript
if (!this.trpc) {
  throw new Error(`Sync service not initialized...`);
}
```

---

## Implementation Order

1. **Fix #1** - Remove showDate rename (lines 415-423) - FIRST
2. **Fix #4** - Validate empty responses (lines 400-402) - SECOND
3. **Fix #5** - Fix all mutations (lines 701-758) - THIRD
4. **Fix #2** - Remove .query() check #1 (lines 309-312) - FOURTH
5. **Fix #3** - Remove .query() check #2 (lines 390-398) - FIFTH
6. **Fix #6** - Improve isReady() (lines 164-166) - SIXTH
7. **Fix #7** - Handle applyChanges errors (lines 546-548) - SEVENTH
8. **Fix #8** - Add date validation (lines 408-480) - EIGHTH
9. **Fix #9** - Remove loop check (lines 379-381) - NINTH (optional)

---

## Testing Checklist After Fixes

- [ ] Full sync completes successfully
- [ ] Shows have correct showDate values in IndexedDB
- [ ] Incremental sync via getChanges works
- [ ] Offline mutations sync when coming back online
- [ ] Error responses properly logged and visible
- [ ] Partial syncs are caught and reported
- [ ] Date formats are YYYY-MM-DD strings
- [ ] Large dataset syncs (10,000+ items) work without errors
- [ ] Network failures are properly handled
- [ ] Dexie indexes work correctly on synced data

