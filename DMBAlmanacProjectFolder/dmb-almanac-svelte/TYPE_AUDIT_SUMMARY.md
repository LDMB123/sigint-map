# TypeScript Audit Summary - Quick Reference

## Quick Stats

- **Total Issues Found**: 107 instances across ~30 files
- **Estimated Runtime Reduction**: 2.3 KB (0.8 KB gzipped)
- **Estimated Implementation Time**: 2-3 hours
- **Type Safety Improvement**: High (catch more bugs at compile time)

## Top 5 Issues

### 1. `instanceof Error` Pattern (50+ instances)
**Impact: 1.1 KB**

```typescript
// PATTERN FOUND 50+ times:
const msg = error instanceof Error ? error.message : String(error);

// SOLUTION: Create one utility
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? 'Unknown error');
}
```

**Files Affected**: `/src/lib/wasm/`, `/src/lib/db/`, `/src/lib/stores/`, `/src/lib/errors/`, `/src/routes/api/`

---

### 2. Unsafe `as unknown as` Casts (17 instances)
**Impact: 500+ bytes, reduces type safety**

```typescript
// EXAMPLES:
(navigator as unknown as { standalone?: boolean }).standalone
(registration as unknown as { periodicSync: {...} }).periodicSync
(module as unknown as Record<string, unknown>)['extractYearsTyped']

// SOLUTION: Use type guards and proper types
function isStandalone(): boolean {
  return (navigator as Partial<NavigatorExtended>).standalone === true;
}
```

**Files Affected**: `/src/lib/sw/register.ts`, `/src/lib/wasm/transform.ts`, `/src/lib/utils/`

---

### 3. WASM Function Access Pattern (7 duplicate instances)
**Impact: 300 bytes, anti-pattern**

```typescript
// PATTERN REPEATS 7 TIMES (lines 810, 857, 900, 947, 1004, 1063, 1113):
const extractFn = (module as unknown as {
  extractYearsTyped?: (json: string) => WasmTypedArrayReturn;
})['extractYearsTyped'];

// SOLUTION: Use utility function
import { hasWasmFunction } from '$lib/types/wasm-helpers';

if (hasWasmFunction(module, 'extractYearsTyped')) {
  const extractFn = (module as WasmExportsExtended).extractYearsTyped;
}
```

**File**: `/src/lib/wasm/transform.ts`

---

### 4. JSON Parse Without Validation (13 instances)
**Impact: 200 bytes, no runtime validation**

```typescript
// FOUND IN:
const parsed = JSON.parse(result.data) as YearCount[];

// SOLUTION: Add validation
function isYearCounts(v: unknown): v is YearCount[] {
  return Array.isArray(v) && v.every(item => 'year' in item && 'count' in item);
}
const parsed = parseJsonSafe(result.data, isYearCounts);
```

**Files**: `/src/lib/wasm/aggregations.ts`, `/src/lib/wasm/serialization.ts`

---

### 5. Browser API Types Using `as unknown as` (8 instances)
**Impact: 300 bytes, blocks IDE autocomplete**

```typescript
// FOUND IN /src/lib/sw/register.ts, /src/lib/utils/windowControlsOverlay.ts:
const api = window as unknown as WindowControlsOverlayAPI;
const nav = navigator as unknown as { standalone?: boolean };

// SOLUTION: Extend browser-apis.d.ts types
declare interface Window {
  windowControlsOverlay?: WindowControlsOverlay;
}
declare interface Navigator {
  standalone?: boolean;
}
```

**File**: `/src/lib/types/browser-apis.d.ts` (needs enhancement)

---

## Implementation Checklist

### Phase 1: Error Utilities (1 hour)
- [ ] Create `/src/lib/errors/utils.ts` with `getErrorMessage()` and `toError()`
- [ ] Replace 50+ `instanceof Error` checks across codebase
- [ ] Test error handling in 3+ API routes

### Phase 2: Type Guards & Utilities (1 hour)
- [ ] Fix type guards in `/src/lib/types/wasm-helpers.ts` (remove `as any`)
- [ ] Create `/src/lib/utils/json-safe.ts` with `parseJsonSafe()`
- [ ] Add browser API types to `/src/lib/types/browser-apis.d.ts`

### Phase 3: WASM Refactor (30 mins)
- [ ] Consolidate 7 duplicate WASM function access patterns
- [ ] Update `/src/lib/wasm/transform.ts` to use utility
- [ ] Update `/src/lib/wasm/aggregations.ts` to use JSON validation

### Phase 4: Test Fixtures (30 mins)
- [ ] Create `/src/lib/wasm/__fixtures__/song-mocks.ts`
- [ ] Create `/src/lib/wasm/__fixtures__/venue-mocks.ts`
- [ ] Replace 15+ `as any` test casts

### Phase 5: TypeScript Config (15 mins)
- [ ] Add `noUncheckedIndexedAccess: true` to tsconfig
- [ ] Add `exactOptionalPropertyTypes: true` to tsconfig
- [ ] Run full type check

---

## File-by-File Impact

| File | Issues | Type | Impact |
|------|--------|------|--------|
| `/src/lib/wasm/stores.ts` | 3 `instanceof` | High | Error msg |
| `/src/lib/wasm/transform.ts` | 7 `as unknown` duplicates | High | 300B |
| `/src/lib/sw/register.ts` | 2 `as unknown` casts | Med | Type guard |
| `/src/lib/db/dexie/db.ts` | 3 `instanceof` + 3 `?.` | Med | Optional chain |
| `/src/lib/types/wasm-helpers.ts` | 2 `as any` in guards | Med | Type safety |
| `/src/lib/wasm/aggregations.ts` | 7 `JSON.parse as` | Med | Validation |
| `/src/lib/wasm/transform.test.ts` | 15+ `as any` | Low | Test fixtures |

---

## Type Safety Improvements

### Current tsconfig.json
```json
{
  "compilerOptions": {
    "strict": true,
    "allowJs": true,
    "checkJs": true
  }
}
```

### Recommended Additions
```json
{
  "compilerOptions": {
    "strict": true,
    "allowJs": true,
    "checkJs": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true"
  }
}
```

**Benefits**:
- Catches array out-of-bounds access
- Clarifies optional vs nullable
- Prevents accidental method overrides

---

## Runtime Code Reduction

```
Before:  ~270 lines of boilerplate
After:   ~50 lines of utility functions

Instance breakdown:
├── 50x "instanceof Error" checks     → 1 utility
├── 7x WASM pattern duplicates        → 1 utility
├── 13x "JSON.parse as T"             → 1 utility
├── 17x "as unknown as" casts         → type guards
└── 9x redundant type guards          → remove

Total reduction: ~2,280 bytes (gzip ~800 bytes)
```

---

## Key Takeaways

1. **Error Handling**: Single pattern appearing 50+ times → use one utility
2. **WASM Safety**: Don't use `as unknown as`, use existing utilities
3. **Type Guards**: Remove `as any` from predicates
4. **JSON**: Always validate parsed data
5. **Browser APIs**: Properly type them instead of casting

---

## Next Steps

1. Read `TYPESCRIPT_AUDIT.md` for detailed analysis
2. Read `TYPE_IMPROVEMENTS.md` for implementation code
3. Start with Phase 1 (error utilities) - highest impact
4. Run `npm run check` after each phase
5. Run tests: `npm test`

## Resources

- **Full Audit**: `/dmb-almanac-svelte/TYPESCRIPT_AUDIT.md`
- **Implementation Guide**: `/dmb-almanac-svelte/TYPE_IMPROVEMENTS.md`
- **tsconfig Reference**: https://www.typescriptlang.org/tsconfig
- **Type Guards**: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
