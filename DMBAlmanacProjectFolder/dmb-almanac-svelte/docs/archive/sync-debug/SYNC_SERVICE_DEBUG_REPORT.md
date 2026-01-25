# DMB PWA Sync Service - Comprehensive Debug Report

## Executive Summary

The sync service has **5 critical issues** and **3 warnings** that will cause silent failures, data corruption, and API errors. Most issues relate to incorrect data transformation, tRPC client API usage, and missing error handling.

---

## CRITICAL ISSUES

### Issue #1: Data Transformation Bug - showDate → date Mismatch

**Severity: CRITICAL - Data Corruption**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 415-423

**Problem:**
The sync service deletes the `showDate` field and replaces it with `date`, but the Dexie schema expects `showDate`, not `date`.

```typescript
// SYNC SERVICE (Line 415-423) - WRONG
if (table === 'shows' && item.showDate) {
  transformed.date = item.showDate instanceof Date
    ? item.showDate.toISOString().split('T')[0]
    : typeof item.showDate === 'string'
      ? item.showDate.split('T')[0]
      : item.showDate;
  delete transformed.showDate;  // ❌ REMOVES THE FIELD
}
```

**Dexie Schema Expects:**
```typescript
// FROM: src/lib/offline/dexie.ts (Line 173-190)
export interface Show {
  id: number;
  showDate: string;  // ✅ EXPECTS showDate, NOT date
  venueId: number | null;
  // ... other fields
}
```

**Server Schema Provides:**
```typescript
// FROM: src/db/schemas/core.ts (Line 79-81)
export const shows = pgTable('shows', {
  id: serial('id').primaryKey(),
  showDate: date('show_date', { mode: 'date' }).notNull(),  // ✅ showDate from server
  // ...
});
```

**Impact:**
- Shows are stored WITHOUT a `showDate` field in IndexedDB
- Any query or display of shows will have missing dates
- Dexie `bulkPut()` will succeed (no schema validation) but data is invalid
- Silent failure - no error thrown

**Fix Required:**
Remove the field name transformation. Keep `showDate` as-is:
```typescript
if (table === 'shows' && item.showDate) {
  transformed.showDate = item.showDate instanceof Date
    ? item.showDate.toISOString().split('T')[0]
    : typeof item.showDate === 'string'
      ? item.showDate.split('T')[0]
      : item.showDate;
  // Do NOT delete or rename the field
}
```

---

### Issue #2: Incorrect Vanilla tRPC Client API Usage

**Severity: CRITICAL - Runtime Error**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 309-312, 390-398

**Problem:**
The code incorrectly assumes vanilla tRPC clients have a `.query()` method. Vanilla tRPC clients created with `createTRPCClient()` call procedures directly.

**Current (WRONG) Code (Lines 309-312):**
```typescript
const getChanges = this.trpc.sync?.getChanges;
const delta = typeof getChanges?.query === 'function'
  ? await getChanges.query({ since: lastSync })  // ❌ WRONG for vanilla client
  : await getChanges({ since: lastSync });       // ✅ This path is correct
```

**Current (WRONG) Code (Lines 390-398):**
```typescript
const response = typeof syncEndpoint.query === 'function'
  ? await syncEndpoint.query({                    // ❌ WRONG for vanilla client
      limit: this.config.batchSize,
      offset,
    })
  : await syncEndpoint({                          // ✅ This path is correct
      limit: this.config.batchSize,
      offset,
    });
```

**Vanilla tRPC Client Behavior:**
```typescript
// FROM: src/trpc/client.ts (Line 41-53)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

// tRPC Router Structure:
// publicProcedure.input(...).query(...)
//
// When called from vanilla client:
// trpcClient.sync.shows({ limit: 100, offset: 0 })
// NOT trpcClient.sync.shows.query({ ... })
```

**Why This Fails:**
- Vanilla clients (from `createTRPCClient`) DO NOT have `.query()` method
- Only React clients (from `createTRPCReact`) have `.query()` for hooks
- The fallback path is correct, but the check is backwards

**Impact:**
- First condition will always be false (no `.query()` exists)
- Code falls through to correct path (by accident)
- Fragile - may break if dependencies change
- Confusing for future maintainers

**Fix Required:**
Remove the `.query()` check entirely - it's not applicable to vanilla clients:
```typescript
// FOR BOTH LOCATIONS:
const response = await syncEndpoint({
  limit: this.config.batchSize,
  offset,
});
```

The vanilla tRPC client directly calls the endpoint without a `.query()` wrapper.

---

### Issue #3: Error Handling Gap - Silent Failures on API Errors

**Severity: CRITICAL - Silent Failures**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 400-402

**Problem:**
Empty response handling allows undefined/null data to pass through without error.

```typescript
if (!response?.data?.length) {
  break;  // ❌ Silently exits on empty response
}
```

**Why This is a Problem:**

1. **API Error Responses:** If the server returns an error (network failure, validation error), the response might be:
   - `{ error: "Network timeout" }` (no `data` field)
   - `null` or `undefined`
   - A 500 error wrapped by tRPC

2. **No Error Logging:** The code silently breaks the loop instead of logging the failure
3. **Incomplete Sync:** If only some batches fail, incomplete data is silently accepted
4. **Retry Logic Bypassed:** The error counter is never incremented for empty responses

**Current Flow:**
```
Batch 1: Success (100 items) → stored ✓
Batch 2: Error (empty response) → break silently ❌ (errorCount not incremented)
Batch 3+: Never attempted
```

**Better Approach:**
```typescript
if (!response?.data?.length) {
  // Is this a real empty page, or an error?
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response from server: ' + JSON.stringify(response));
  }
  // If we get here, it's legitimately empty - exit the loop
  break;
}
```

---

### Issue #4: Mutation API Misuse - No Error Propagation

**Severity: CRITICAL - Silent Action Failures**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 701-758 (executeAction method)

**Problem:**
Code assumes `.mutate()` exists on vanilla tRPC endpoints, but mutations on vanilla clients don't work this way.

```typescript
// Line 703-707 - WRONG
const endpoint = this.trpc?.favorites?.add;
if (!endpoint?.mutate) {
  throw new Error('Invalid tRPC endpoint: favorites.add.mutate not available');
}
return endpoint.mutate(payload);  // ❌ .mutate() doesn't exist on vanilla client
```

**Vanilla tRPC Mutations:**
```typescript
// Vanilla clients call mutations directly:
const result = await trpcClient.favorites.add(payload);

// NOT with .mutate():
// const result = await trpcClient.favorites.add.mutate(payload);  ❌
```

**Impact:**
- All pending action processing will fail
- Mutations queued while offline will NEVER sync
- User changes silently fail to upload
- No error recovery

**Why It Happens:**
The code was written assuming React's `@trpc/react-query` hook pattern, but it's called in non-React context.

---

### Issue #5: Null Check Logic Error - isReady() Can Return False Positive

**Severity: HIGH - Initialization Bug**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 164-166

**Problem:**
The `isReady()` check uses loose equality that might allow undefined/falsy values:

```typescript
isReady(): boolean {
  return this.trpc !== null && this.trpc !== undefined;
}
```

**Issue:**
If someone passes an empty object `{}` or other falsy value (0, false, '', etc.) during injection:
```typescript
syncService.setTrpcClient({});  // Empty object is not null/undefined
syncService.isReady();          // Returns true, but no actual endpoints exist
```

Then when trying to access `this.trpc.sync.shows`, it will throw:
```
Cannot read properties of undefined (reading 'shows')
```

**Better Implementation:**
```typescript
isReady(): boolean {
  return (
    this.trpc !== null &&
    this.trpc !== undefined &&
    typeof this.trpc === 'object' &&
    this.trpc.sync !== undefined  // Verify actual endpoints exist
  );
}
```

---

## WARNINGS

### Warning #1: No Error Handling in applyChanges Method

**Severity: MEDIUM - Error Swallowing**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 546-548

```typescript
catch (error) {
  this.addError(table, (error as Error).message, true);
  // ❌ Error is logged but NOT re-thrown
  // Continues processing other items
}
```

**Impact:**
- If Dexie database write fails, the error is silently recorded
- Sync reports success even when some items failed to store
- User sees "Sync complete" but data wasn't actually saved

**Recommendation:**
Decide on error handling strategy:
- Option A: Fail fast - re-throw on first error
- Option B: Collect errors - continue but report partial failure
- Option C: (Current) Silent failure - bad UX

---

### Warning #2: Race Condition in Network Detection

**Severity: MEDIUM - Potential Race**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 377-381

```typescript
while (true) {
  try {
    if (!this.trpc) {
      throw new Error(`Sync service not initialized...`);
    }
    // ... 500 lines later
  }
}
```

**Issue:**
If `setTrpcClient()` is called (or becomes null) while a sync is in progress, the mid-loop check could throw.

**Better Approach:**
Check once at method entry, not in loop.

---

### Warning #3: Missing Validation - No Check for Server Date Format

**Severity: MEDIUM - Type Mismatch**

**File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/sync-service.ts`
**Lines:** 408-480 (data transformation section)

**Problem:**
Code assumes all dates from server are either `Date` objects or ISO strings. No validation:

```typescript
if (table === 'shows' && item.showDate) {
  transformed.showDate = item.showDate instanceof Date
    ? item.showDate.toISOString().split('T')[0]
    : typeof item.showDate === 'string'
      ? item.showDate.split('T')[0]
      : item.showDate;  // ❌ If none above, stores as-is (could be number, object, etc.)
}
```

**Better Approach:**
```typescript
if (table === 'shows' && item.showDate) {
  let dateStr: string;
  if (item.showDate instanceof Date) {
    dateStr = item.showDate.toISOString().split('T')[0];
  } else if (typeof item.showDate === 'string') {
    dateStr = item.showDate.split('T')[0];
  } else {
    throw new Error(`Invalid date format for show ${item.id}: ${typeof item.showDate}`);
  }
  transformed.showDate = dateStr;
}
```

---

## VERIFICATION CHECKLIST

### tRPC Client Configuration

✓ **File:** `/Users/louisherman/Documents/dmb-pwa/src/trpc/client.ts`
- ✓ Uses `createTRPCClient` (correct for non-React code)
- ✓ Configured with `httpBatchLink`
- ✓ Uses `superjson` transformer (correct)
- ✓ No React hooks or context dependencies

### Router Structure

✓ **File:** `/Users/louisherman/Documents/dmb-pwa/src/trpc/router.ts`
- ✓ `sync` router is active and properly defined
- ✓ All required endpoints: `shows`, `songs`, `venues`, `tours`, `setlistEntries`, `guests`, `releases`
- ✓ `getChanges` endpoint available

✓ **File:** `/Users/louisherman/Documents/dmb-pwa/src/trpc/routers/sync.ts`
- ✓ All endpoints use `.query()` (correct for read operations)
- ✓ Pagination inputs defined correctly
- ✓ Response format: `{ data: [], total: number, hasMore: boolean }`

### Dexie Schema

✓ **File:** `/Users/louisherman/Documents/dmb-pwa/src/lib/offline/dexie.ts`
- ✓ Show interface expects `showDate` (not `date`)
- ✓ Song interface expects `firstPlayed` and `lastPlayed`
- ✓ Venue interface expects `firstShowDate` and `lastShowDate`

### Initialization

✓ **File:** `/Users/louisherman/Documents/dmb-pwa/src/components/providers/SyncProvider.tsx`
- ✓ Correctly injects vanilla tRPC client at line 155
- ✓ Checks `isReady()` before proceeding (line 157)
- ✓ Proper initialization sequence

---

## SUMMARY TABLE

| Issue | Type | Severity | File | Lines | Impact |
|-------|------|----------|------|-------|--------|
| showDate → date transformation | Data Corruption | CRITICAL | sync-service.ts | 415-423 | Shows stored without dates |
| Vanilla tRPC .query() misuse | API Error | CRITICAL | sync-service.ts | 309-312, 390-398 | Sync could fail (covered by fallback) |
| Empty response not validated | Silent Failure | CRITICAL | sync-service.ts | 400-402 | Incomplete syncs accepted |
| .mutate() on vanilla client | API Error | CRITICAL | sync-service.ts | 701-758 | Mutations always fail silently |
| isReady() insufficient check | Initialization | HIGH | sync-service.ts | 164-166 | False positives on bad injection |
| applyChanges error swallowing | Error Handling | MEDIUM | sync-service.ts | 546-548 | Partial failures reported as success |
| Race condition in loop | Concurrency | MEDIUM | sync-service.ts | 377-381 | Could throw mid-sync |
| Date format validation missing | Type Safety | MEDIUM | sync-service.ts | 408-480 | Could store invalid dates |

---

## RECOMMENDED FIX PRIORITY

1. **FIRST:** Issue #1 (Data Corruption) - Lines 415-423
   - Remove field name transformation
   - Keep `showDate` as-is from server

2. **SECOND:** Issue #2 (Vanilla Client API) - Lines 309-312, 390-398
   - Remove `.query()` checks
   - Call endpoints directly

3. **THIRD:** Issue #4 (Mutations) - Lines 701-758
   - Change to direct endpoint calls
   - Remove `.mutate()` references

4. **FOURTH:** Issue #3 (Error Handling) - Lines 400-402
   - Add validation for response structure
   - Log errors properly

5. **FIFTH:** Issue #5 (isReady Check) - Lines 164-166
   - Add endpoint verification
   - Verify object structure

---

## TESTING RECOMMENDATIONS

After fixes, verify:

1. **Full sync completes successfully** with shows having correct dates
2. **Incremental sync works** - getChanges endpoint called correctly
3. **Pending actions sync** when coming back online
4. **Error states** are properly logged and recoverable
5. **Data integrity** - dates stored in correct format in IndexedDB
6. **Offline mode** - app works with synced data when offline

---

## ADDITIONAL OBSERVATIONS

### Strong Points

- ✓ Good separation of concerns (sync service, tRPC client, Dexie schema)
- ✓ Proper use of `AsyncLocalStorage` for context tracking
- ✓ Sound conflict resolution strategy
- ✓ Well-structured error tracking
- ✓ Good use of database locks to prevent race conditions

### Areas for Improvement

- Consider stricter type checking for API responses
- Add comprehensive error recovery tests
- Document the vanilla vs React client differences more clearly
- Consider creating separate sync clients for queries vs mutations

