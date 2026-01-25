# TypeScript Issues - Complete File Listing

## Issues by File and Line Number

### `/src/lib/errors/utils.ts` (NEW FILE - TO CREATE)
**Status**: Create new
**Purpose**: Centralized error utilities to eliminate 50+ instances of `instanceof Error`

```typescript
export function getErrorMessage(error: unknown): string
export function toError(error: unknown): Error
export function isError(value: unknown): value is Error
export function getErrorName(error: unknown): string
```

---

### `/src/lib/sw/register.ts`
**Issues**: 2 unsafe `as unknown as` casts

**Line 255**: Navigator.standalone detection
```typescript
// ISSUE: Double cast loses type safety
if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
```
**Fix**: Use type predicate for iOS PWA detection

**Line 296**: ServiceWorkerRegistration.periodicSync casting
```typescript
// ISSUE: Unsafe cast to unknown first
await (
  registration as unknown as {
    periodicSync: {
      register: (tag: string, options: { minInterval: number }) => Promise<void>;
    };
  }
).periodicSync.register(tag, { minInterval });
```
**Fix**: Create `hasPeriodicSync()` type guard

---

### `/src/lib/types/wasm-helpers.ts`
**Issues**: 2 `as any` casts inside type guards (lines 229-230, 245-246)

**Line 229-230**: Type guard using `as any`
```typescript
export function isWasmTypedArrayReturn(value: unknown): value is WasmTypedArrayReturn {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ptr' in value &&
    'len' in value &&
    typeof (value as any).ptr === 'number' &&      // <-- ISSUE
    typeof (value as any).len === 'number'         // <-- ISSUE
  );
}
```
**Fix**: Narrow with `as Record<string, unknown>` instead of `any`

**Line 245-246**: Same pattern in parallel arrays guard
```typescript
typeof (value as any).ptr1 === 'number' &&         // <-- ISSUE
typeof (value as any).len1 === 'number'            // <-- ISSUE
```
**Fix**: Narrow properly before accessing properties

---

### `/src/lib/wasm/transform.ts`
**Issues**: 7 identical `as unknown as Record` patterns (HIGH DUPLICATION)

**Line 810**: Extract function casting
```typescript
const extractFn = (module as unknown as {
  extractYearsTyped?: (json: string) => WasmTypedArrayReturn;
})['extractYearsTyped'];
```
**Fix**: Use `hasWasmFunction()` utility (duplicate at lines 857, 900, 947, 1004, 1063, 1113)

**Line 857**: Identical pattern
```typescript
const extractFn = (module as unknown as {
  // same structure
})['getYearsForSongsTyped'];
```

**Line 900**: Identical pattern for different function

**Line 947**: Identical pattern for `computeShowStatsTyped`

**Line 1004**: Identical pattern

**Line 1063**: Identical pattern

**Line 1113**: Identical pattern

**Consolidation Strategy**: Replace all 7 with single utility function using `hasWasmFunction()`

---

### `/src/lib/wasm/bridge.ts`
**Issues**: 2 WASM casting issues

**Line 290**: WASM exports casting
```typescript
this.wasmModule = instance.exports as unknown as WasmExports;
```
**Issue**: Unnecessary `unknown` intermediate
**Fix**: Verify exports directly then cast to `WasmExports`

**Line 904**: Function lookup using `as unknown as`
```typescript
const wasmFn = (this.wasmModule as unknown as Record<string, unknown>)[
  methodName
];
```
**Issue**: Duplicates pattern from transform.ts
**Fix**: Use dedicated WASM function accessor

---

### `/src/lib/wasm/validation.ts`
**Issues**: 4 `instanceof TypedArray` checks (lines 624, 627, 667, 670, 698, 701, 719, 722)

**Line 624-627**: TypedArray type checking
```typescript
const validShowIdsTyped = validShowIds instanceof Int32Array
  ? validShowIds
  : new Int32Array(validShowIds);

const validSongIdsTyped = validSongIds instanceof Int32Array
  ? validSongIds
  : new Int32Array(validSongIds);
```
**Issue**: Repeated 4x in file
**Fix**: Create `ensureInt32Array()` utility to consolidate

**Line 667-670, 698-701, 719-722**: Same pattern repeated

---

### `/src/lib/wasm/aggregations.ts`
**Issues**: 7 `JSON.parse as T` patterns (MISSING VALIDATION)

**Line 216**: Parse without validation
```typescript
const wasmResult = JSON.parse(result.data) as YearCount[];
```
**Fix**: Use `parseJsonSafe()` with type guard

**Line 421**: Identical pattern
```typescript
const yearCounts = JSON.parse(result.data) as YearCount[];
```

**Line 495**: Parse without type safety
```typescript
const wasmStats = JSON.parse(result.data);
```

**Line 761, 827, 893, 1125**: More unsafe JSON parsing

**Consolidation**: Create typed JSON helpers with validation

---

### `/src/lib/wasm/serialization.ts`
**Issues**: 3 `JSON.parse as T` patterns (MISSING VALIDATION)

**Line 59**: Parse with reviver but no validation
```typescript
return JSON.parse(json, bigIntReviver) as T;
```
**Fix**: Add type validation before returning

**Line 138**: Array parsing
```typescript
const arr = JSON.parse(json) as Record<string, unknown>[];
```

**Line 436**: Parse assignment
```typescript
data = JSON.parse(json);
```

---

### `/src/lib/wasm/stores.ts`
**Issues**: 3 `instanceof Error` checks

**Line 149**: Error message extraction
```typescript
const err = error instanceof Error ? error : new Error(String(error));
```
**Fix**: Use `toError()` utility

**Line 279**: Same pattern
```typescript
const err = error instanceof Error ? error : new Error(String(error));
```

**Line 452**: Error conversion
```typescript
error = e instanceof Error ? e : new Error(String(e));
```

---

### `/src/lib/wasm/worker.ts`
**Issues**: 3 `instanceof Error` checks

**Line 113**: Error message extraction
```typescript
const errorMessage = error instanceof Error ? error.message : String(error);
```
**Fix**: Use `getErrorMessage()` utility

**Line 199**: Duplicate pattern

**Line 328**: Duplicate pattern

---

### `/src/lib/utils/windowControlsOverlay.ts`
**Issues**: 3 `as unknown as` casts (SHOULD USE TYPES)

**Line 52**: Window API casting
```typescript
const api = window as unknown as WindowControlsOverlayAPI;
```
**Fix**: Properly type in browser-apis.d.ts, then access as `window.windowControlsOverlay`

**Line 75, 97**: Same pattern in other functions

---

### `/src/lib/utils/performance.ts`
**Issues**: 3 `as unknown as` PerformanceEntry casts

**Line 244**: PerformanceEntry with attribution
```typescript
const loaf = entry as unknown as {
  attribution?: PerformanceEntryName[];
};
```
**Fix**: Create proper typed interface

**Line 440**: Last LCP entry casting
```typescript
const lastLCP = lcpEntries[lcpEntries.length - 1] as unknown as {
  startTime: number;
};
```

**Line 453**: Navigation timing casting
```typescript
const navTiming = performance.getEntriesByType('navigation')[0] as unknown as {
  // ...
};
```

---

### `/src/lib/db/dexie/schema.ts`
**Issues**: 3 type guard functions (DEFENSIVE CODING)

**Line 831-833**: Venue type guard
```typescript
export function isDexieVenue(obj: unknown): obj is DexieVenue {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj && 'city' in obj;
}
```
**Issue**: Runs on every query result. Should trust Dexie's types.
**Fix**: Type Dexie queries properly instead

**Line 835-837**: Song type guard
```typescript
export function isDexieSong(obj: unknown): obj is DexieSong {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'title' in obj && 'slug' in obj;
}
```

**Line 839-841**: Show type guard
```typescript
export function isDexieShow(obj: unknown): obj is DexieShow {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'date' in obj && 'venue' in obj;
}
```

---

### `/src/lib/db/dexie/db.ts`
**Issues**: 3 `instanceof Error` checks + 3 over-defensive optional chains

**Line 164, 209, 252, 296**: Error message extraction
```typescript
const errorMessage = error instanceof Error ? error.message : String(error);
```
**Fix**: Use `getErrorMessage()` utility

**Line 878, 898, 916**: Over-defensive optional chaining
```typescript
if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
  return { usage: 0, quota: 0, percentUsed: 0 };
}
// ... later in same function:
const estimate = await navigator.storage?.estimate(); // <-- No ! needed here
```
**Fix**: Create type guard, then access without optional chaining

---

### `/src/lib/db/dexie/init.ts`
**Issues**: 7 `instanceof Error` checks

**Line 311, 399, 430, 460, 485, 518, 546**: Error conversion
```typescript
const err = error instanceof Error ? error : new Error(String(error));
```
**Fix**: Use `toError()` utility

---

### `/src/lib/db/dexie/data-loader.ts`
**Issues**: 4 `instanceof Error` checks + complex optional chains

**Line 1431, 1441, 1477**: Error message extraction
```typescript
error: error instanceof Error ? error.message : 'Unknown error',
```
**Fix**: Use `getErrorMessage()` utility

**Line 1489**: Over-defensive optional chaining
```typescript
if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
```

---

### `/src/lib/stores/navigation.ts`
**Issues**: 4 `instanceof Error` checks

**Line 102, 105, 112, 127, 130, 137**: Error handling
```typescript
const errorMessage = error instanceof Error ? error.message : String(error);
new NavigationError('back', errorMessage, error instanceof Error ? error : undefined),
```
**Fix**: Use `getErrorMessage()` and `toError()`

---

### `/src/lib/stores/dexie.ts`
**Issues**: 3 `instanceof Dexie.ConstraintError` checks + 1 `instanceof Error`

**Line 149**: Error conversion
```typescript
const errorObj = err instanceof Error ? err : new Error(String(err));
```

**Line 819, 908, 993**: Dexie-specific error checking
```typescript
if (error instanceof Dexie.ConstraintError) {
  // Handle constraint violation
}
```
**Note**: This is correct usage (specific error type). Keep as-is.

---

### `/src/lib/errors/types.ts`
**Issues**: None found (well-typed error classes)

**Line 334, 341, 348, 355**: Type guard functions for custom errors
```typescript
return error instanceof AppError;
return error instanceof ApiError;
return error instanceof TelemetryError;
return error instanceof NavigationError;
```
**Status**: These are CORRECT. Keep them.

---

### `/src/lib/errors/handler.ts`
**Issues**: 2 `instanceof Error` checks

**Line 293**: Error conversion
```typescript
error instanceof Error ? error : new Error(String(error));
```

**Line 224-249**: Multiple `instanceof` checks for custom errors
```typescript
if (error instanceof ComponentLoadError) { ... }
if (error instanceof AsyncError) { ... }
if (error instanceof ValidationError) { ... }
```
**Status**: These are CORRECT (discriminating custom errors). Keep them.

---

### `/src/lib/utils/push-notifications.ts`
**Issues**: 5 `instanceof Error` checks

**Line 138, 191, 212, 245, 393**: Error message extraction
```typescript
error instanceof Error ? error : undefined
`Failed to decode VAPID key: ${error instanceof Error ? error.message : String(error)}`
```
**Fix**: Use `getErrorMessage()` and `toError()`

---

### `/src/lib/utils/fileHandler.ts`
**Issues**: 2 `instanceof Error` checks

**Line 269, 295**: Error message extraction
```typescript
parseError instanceof Error ? parseError.message : 'Unknown error'
error instanceof Error ? error.message : 'Unknown error'
```
**Fix**: Use `getErrorMessage()`

---

### `/src/lib/wasm/transform.test.ts`
**Issues**: 15+ `as any` test casts (LOW PRIORITY - test code only)

**Line 144, 154, 171, 180, 201, 216, 224, 237, 251, 264, 276, 283, 298, 319, 332**: Test fixtures
```typescript
const result = await transformSongs([mockSongServer as any]);
```
**Fix**: Create properly typed fixtures instead

---

### `/src/lib/db/dexie/queries.test.ts`
**Issues**: 1 `as unknown as` test cast

**Line 948**: Test setup casting
```typescript
const result = await getSongBySlug(undefined as unknown as string);
```
**Status**: Intentional type violation for testing. OK.

---

### `/src/lib/db/dexie/query-helpers.test.ts`
**Issues**: 4 `as unknown as` test casts

**Line 108, 149, 464, 476, 490, 502**: Mock casting in tests
```typescript
mockCache as unknown as ReturnType<typeof getQueryCache>
mockDb as unknown as ReturnType<typeof getDb>
```
**Status**: Test mocking. Acceptable in test files.

---

### `/src/routes/api/push-subscribe/+server.ts`
**Issues**: 1 type-guard pattern (actually GOOD code)

**Line 44**: Defensive typing after JSON parse
```typescript
const bodyObj = body && typeof body === 'object' ? body as Record<string, unknown> : {};
```
**Status**: This is CORRECT defensive programming for API endpoints. Keep.

---

### `/src/lib/services/telemetryQueue.ts`
**Issues**: 3 `instanceof Error` checks

**Line 266, 574, 732**: Error message extraction
```typescript
error instanceof Error ? error.message : String(error)
```
**Fix**: Use `getErrorMessage()`

---

### `/src/lib/services/offlineMutationQueue.ts`
**Issues**: 2 `instanceof Error` checks

**Line 585, 1006**: Error message extraction
```typescript
error instanceof Error ? error.message : String(error)
```
**Fix**: Use `getErrorMessage()`

---

### `/src/routes/api/` (Multiple API routes)

**`/src/routes/api/push-unsubscribe/+server.ts` Line 177, 183**
```typescript
error instanceof AppError
error instanceof Error ? error.message : String(error)
```
**Note**: First check is correct. Second one should use `getErrorMessage()`.

**`/src/routes/api/push-send/+server.ts` Line 240, 316, 322**
```typescript
error instanceof Error
error instanceof AppError
error instanceof Error ? error.message : String(error)
```

**`/src/routes/api/telemetry/performance/+server.ts` Line 225, 261, 268**
```typescript
err instanceof Error ? err.message : String(err)
error instanceof AppError
```

**`/src/routes/api/analytics/+server.ts` Line 251, 259, 299, 332**
```typescript
error instanceof AppError
error instanceof Error ? error.message : String(error)
error instanceof Error ? error : new Error(String(error))
```

---

## Summary Statistics

| Category | Count | Files | Priority |
|----------|-------|-------|----------|
| `instanceof Error` checks | 50+ | 30+ | **HIGH** |
| `as unknown as` casts | 17 | 8 | **HIGH** |
| WASM pattern duplicates | 7 | 1 | **HIGH** |
| JSON.parse without validation | 13 | 2 | **MEDIUM** |
| Type guards (as any) | 2 | 1 | **MEDIUM** |
| Defensive type guards (schema) | 3 | 1 | **MEDIUM** |
| Over-defensive optional chains | 3 | 3 | **LOW** |
| Test `as any` casts | 15+ | 2 | **LOW** |
| Custom error instanceof checks | 8 | 3 | CORRECT ✓ |

**TOTAL ISSUES**: ~107-117 instances

---

## Implementation Priority

### Phase 1 (Highest Impact)
1. Error utilities: 50+ `instanceof Error` checks → 1 utility
2. WASM consolidation: 7 duplicate patterns → 1 utility

### Phase 2 (Type Safety)
1. Browser API types: 8 `as unknown as` casts
2. Type guards: Fix `as any` in predicates
3. JSON validation: 13 unsafe parses

### Phase 3 (Code Quality)
1. Test fixtures: 15+ `as any` casts
2. Optional chaining: 3 over-defensive patterns
3. Type guards: 3 defensive schema checks

### Phase 4 (Configuration)
1. Update tsconfig: Add strict options
2. Full type check and testing

---

## Notes

- ✓ Custom error `instanceof` checks are CORRECT (discriminating custom error types)
- ✓ Test file type violations are ACCEPTABLE
- ✓ API route defensive typing is CORRECT
- ✓ Constraint error checks are CORRECT (Dexie-specific)
- ✓ Service worker feature detection is CORRECT approach (but can be improved)
