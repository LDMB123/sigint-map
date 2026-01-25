# TypeScript Type Issues by File - DMB Almanac

## Summary
- **Total Files Analyzed:** 27
- **Files with Issues:** 27
- **Total Issues Found:** 146+
- **Critical Issues:** 12
- **High Priority Issues:** 15
- **Medium Priority Issues:** 25
- **Low Priority Issues:** 94+

---

## CRITICAL PRIORITY (Fix within 24 hours)

### src/lib/wasm/advanced-modules.ts
**Severity:** CRITICAL
**Issue Count:** 52
**Category:** Type Safety - WASM Module Access

**Lines with issues:** 305-306, 315, 323, 331, 339, 347, 355, 363, 369, 390, 403, 416, 424, 432, 444, 452, 460, 468, 487, 496, 504, 512, 520, 528, 536, 544, 552, 560, 579, 589, 599, 612, 624, 630, 638, 645, 651, 657, 663, 669, 675, 681

**Problem:**
```typescript
this.index = new (module as any).TfIdfIndex();  // ❌ 52 instances
(this.index as any).indexSongs(songsJson);
return (this.index as any).search(query, limit);
```

**Impact:** Complete loss of type safety for WASM module methods

**Solution:**
Create `src/lib/wasm/advanced-types.ts` with proper interfaces and factory functions
See: `TYPESCRIPT_FIXES_QUICK_REFERENCE.md` Section 1

**Effort:** 2-3 hours

---

### src/lib/wasm/transform.ts
**Severity:** HIGH
**Issue Count:** 5
**Category:** Type Safety - Data Transformation

**Lines with issues:** 160, 190, 216, 233, 273

**Problem:**
```typescript
function transformSongsJS(serverSongs: unknown[]): DexieSong[] {
  return serverSongs.map((server: any) => ({  // ❌ any parameter
    id: server.id,  // ❌ no property validation
    title: server.title,
```

**Impact:** No validation that server data has required properties

**Solution:**
Add type guards and validation functions
See: `TYPESCRIPT_FIXES_QUICK_REFERENCE.md` Section 3

**Effort:** 1-2 hours

---

### src/lib/workers/force-simulation.worker.ts
**Severity:** HIGH
**Issue Count:** 5
**Category:** Type Safety - Worker Communication

**Lines with issues:** 69, 80, 90, 187

**Problem:**
```typescript
function isValidMessage(message: any): { valid: boolean; error?: string } {
  if (!ALLOWED_MESSAGE_TYPES.includes(message.type as any)) {  // ❌ Still casts
```

**Impact:** Worker messages not properly validated for type safety

**Solution:**
Implement type guards with `is` keyword
See: `TYPESCRIPT_FIXES_QUICK_REFERENCE.md` Section 2

**Effort:** 1 hour

---

## HIGH PRIORITY (Fix within 2-3 days)

### src/lib/types/visualizations.ts
**Severity:** HIGH
**Issue Count:** 5
**Category:** Type Design - Overly Permissive Types

**Lines with issues:** 71, 73, 147, 157

**Problem:**
```typescript
export interface TopoJSONObject {
  features?: Array<{
    properties?: Record<string, any>;  // ❌ Should be unknown
    [key: string]: any;                 // ❌ Escape hatch
  }>;
  [key: string]: any;                   // ❌ Generic escape hatch
}

export interface D3Node extends Record<string, any> {  // ❌ Why extend?
```

**Impact:** Loss of type information for D3 visualization objects

**Solution:**
Replace `any` with `unknown`, remove index signature escapes
See: `TYPESCRIPT_FIXES_QUICK_REFERENCE.md` Section 4

**Effort:** 1.5 hours

---

### src/lib/wasm/worker.ts
**Severity:** MEDIUM
**Issue Count:** 1
**Category:** Function Signature Type

**Line:** 208

**Problem:**
```typescript
async function executeFallback(method: string, args: unknown[]): Promise<unknown>
```

**Impact:** Return type not specific, generic Promise<unknown>

**Solution:**
Use WasmMethodName type and specific return types

**Effort:** 30 minutes

---

## MEDIUM PRIORITY (Fix within 1-2 weeks)

### src/lib/db/dexie/sync.ts
**Severity:** MEDIUM
**Issue Count:** 1
**Category:** Generic Constraints

**Line:** 615

**Problem:**
```typescript
bulkPut: (items: unknown[]) => Promise<unknown>;
```

**Impact:** Bulk operations lose return type information (should return Key[])

**Solution:**
Add generic constraint on bulk operations
```typescript
interface BulkOperation<T> {
  bulkPut: (items: T[]) => Promise<Key[]>;
}
```

**Effort:** 30 minutes

---

### src/lib/db/dexie/cache.ts
**Severity:** MEDIUM
**Issue Count:** 1
**Category:** Generic Constraints

**Line:** 37

**Problem:**
```typescript
private cache = new Map<string, CacheEntry<unknown>>();
```

**Impact:** Cache entries not typed with specific entity types

**Solution:**
Use discriminated union of cache value types

**Effort:** 1 hour

---

### src/lib/server/data-loader.ts
**Severity:** MEDIUM
**Issue Count:** 1
**Category:** Data Validation

**Line:** 78

**Problem:**
```typescript
function loadJsonFile<T>(filename: string): T {
  return JSON.parse(content) as T;  // ❌ No validation, just cast
}
```

**Impact:** No guarantee loaded data matches expected type

**Solution:**
Add DataFileName literal union and validation functions
See: `TYPESCRIPT_FIXES_QUICK_REFERENCE.md` Section 7

**Effort:** 1.5 hours

---

### src/lib/types/scheduler.ts
**Severity:** MEDIUM
**Issue Count:** 1
**Category:** Generic Type Parameter

**Line:** 241

**Problem:**
```typescript
export type MetricCalculator<T> = (item: T) => any | Promise<any>;
```

**Impact:** Return type completely untyped

**Solution:**
```typescript
export type MetricCalculator<T, R = number> = (item: T) => R | Promise<R>;
```

**Effort:** 30 minutes

---

### src/lib/utils/rum.ts
**Severity:** MEDIUM
**Issue Count:** 3
**Category:** RUM API Types

**Lines:** 71

**Problem:**
```typescript
attribution: Record<string, any>;
```

**Impact:** Attribution object properties not typed

**Solution:**
```typescript
attribution: Record<string, unknown> | INPAttribution;
```

**Effort:** 30 minutes

---

## LOW PRIORITY (Nice to Have)

### Remaining 19 files with LOW priority issues

Files: compression-monitor.ts, fileHandler.ts, windowControlsOverlay.ts,
navigationApi.ts, speculationRules.ts, contentIndex.ts, viewTransitions.ts,
popover.test.ts, performance.ts, scheduler.ts, serialization.ts,
seed-from-json.ts, data-loader.ts (dexie), queries.test.ts, dexie.ts,
sw/register.ts, hooks/navigationSync.ts, hooks/navigationApiInterception.ts,
hooks/viewTransitionNavigation.ts

**Total Low Priority Issues:** 90+

**Pattern:** Browser API wrappers, utilities, test files with loosely typed
parameters and return values. Generally low impact but good for completeness.

**Combined Effort:** 6-8 hours if tackling all

---

## SVELTE COMPONENTS (Generally Good, Minor Issues)

### Svelte Components Status: ✅ 80% GOOD

**Files Reviewed:** 20+ components

**Perfect Examples:**
- ✅ Card.svelte - Excellent Svelte 5 props pattern
- ✅ Button.svelte - Extends HTMLButtonAttributes correctly
- ✅ Tooltip.svelte - Clean prop interface

**Minor Enhancements Needed:**
- Some components missing event handler type definitions
- Inconsistent prop interface patterns across components
- Optional: Add complete event typing (onChange, onSelect, etc.)

**Effort to complete:** 1-2 hours for full audit and normalization

---

## IMPLEMENTATION ROADMAP

### PHASE 1: CRITICAL FIXES (6-8 hours)
1. ✅ Create `src/lib/wasm/advanced-types.ts`
2. ✅ Update `advanced-modules.ts` to use factories
3. ✅ Add type guards to `transform.ts`
4. ✅ Update `worker.ts` message validation
5. ✅ Update `tsconfig.json` strictness

### PHASE 2: HIGH PRIORITY FIXES (4-6 hours)
1. ✅ Clean up visualization types
2. ✅ Add Dexie bulk operation typing
3. ✅ Improve data loader with validation
4. ✅ Add scheduler generics

### PHASE 3: MEDIUM PRIORITY (2-3 hours)
1. ✅ Audit all Svelte components
2. ✅ Add RUM, compression, file handler types
3. ✅ Update browser API wrappers

### PHASE 4: LOW PRIORITY (3-4 hours)
1. ✅ Document remaining any usage
2. ✅ Add test utility types
3. ✅ Setup type coverage reporting

---

## Quick Links

- **Comprehensive Report:** See `TYPESCRIPT_AUDIT_REPORT.md`
- **Copy-Paste Fixes:** See `TYPESCRIPT_FIXES_QUICK_REFERENCE.md`
- **Action Summary:** See `TYPESCRIPT_AUDIT_SUMMARY.txt`

---

**Generated:** January 22, 2026
**Project:** DMB Almanac Svelte
**TypeScript Version:** 5.7.3
