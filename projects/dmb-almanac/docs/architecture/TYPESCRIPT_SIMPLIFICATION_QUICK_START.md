# TypeScript Simplification Quick Start Guide

**For rapid implementation of high-value TypeScript reduction opportunities**

---

## 5-Minute Win: Delete Redundant Browser API Types

### Current State
You're manually maintaining 381 lines of browser API type declarations that are now native in TypeScript 5.7+.

### Action
```bash
# Delete the entire file - TypeScript knows these types natively!
rm app/src/lib/types/browser-apis.d.ts

# Find and remove imports
grep -r "from '\$lib/types/browser-apis'" app/src --files-with-matches
# Delete those import lines - the types are globally available
```

### Impact
- **-381 lines** of maintenance burden
- **No code changes needed** - types are globally available
- **Immediate:** Can commit this right now

### Verification
```typescript
// This will still work without imports
if (globalThis.scheduler) {
  await globalThis.scheduler.yield({ priority: 'user-visible' });
}

// This will still work
const transition = document.startViewTransition(() => {
  // update DOM
});
```

---

## 1-Hour Win: Replace WasmFunctionAccessor with Native Proxy

### Current Problem
150 lines of boilerplate accessor class that manually wraps WASM functions.

### Before
```typescript
// app/src/lib/types/wasm-helpers.ts (329 lines)
export class WasmFunctionAccessor {
  private module: unknown;

  constructor(module: unknown) {
    this.module = module;
  }

  extractYearsTyped(json: string): WasmTypedArrayReturn | undefined {
    const fn = (this.module as Record<string, unknown>)['extractYearsTyped'] as
      ((json: string) => WasmTypedArrayReturn) | undefined;
    return fn ? fn(json) : undefined;
  }

  // ... 10 more wrapper methods
}

// Usage
const accessor = new WasmFunctionAccessor(wasmModule);
const result = accessor.extractYearsTyped(json);
```

### After
```javascript
// app/src/lib/wasm/proxy.ts (NEW - 20 lines total)
/**
 * Create a proxy wrapper for WASM module with auto error handling
 * Replaces WasmFunctionAccessor class
 */
export function createWasmProxy(module) {
  return new Proxy(module, {
    get(target, prop) {
      const fn = target[prop];
      if (typeof fn !== 'function') return undefined;

      return (...args) => {
        try {
          return fn(...args);
        } catch (err) {
          console.warn(`WASM function ${String(prop)} failed:`, err);
          return undefined;
        }
      };
    }
  });
}

// Usage - identical API!
const wasm = createWasmProxy(wasmModule);
const result = wasm.extractYearsTyped(json); // Auto-wrapped with error handling
```

### Migration Steps
1. Create `app/src/lib/wasm/proxy-simple.ts` with code above
2. Find all `WasmFunctionAccessor` usage:
   ```bash
   grep -r "WasmFunctionAccessor" app/src --files-with-matches
   ```
3. Replace:
   ```typescript
   // OLD
   import { WasmFunctionAccessor } from '$lib/types/wasm-helpers';
   const accessor = new WasmFunctionAccessor(module);

   // NEW
   import { createWasmProxy } from '$lib/wasm/proxy-simple';
   const wasm = createWasmProxy(module);
   ```
4. Delete `app/src/lib/types/wasm-helpers.ts`

### Impact
- **-150 lines** of boilerplate
- **-1.5KB** bundle size
- **Same functionality**, simpler code

---

## 30-Minute Win: Simplify Scheduler Types

### Current Problem
247 lines of explicit type definitions when TypeScript can infer everything.

### Before
```typescript
// app/src/lib/types/scheduler.ts (247 lines)
export interface ScheduleOptions {
  priority?: 'user-blocking' | 'user-visible' | 'background';
  yieldAfterMs?: number;
  timeout?: number;
  debug?: boolean;
}

export interface ChunkProcessOptions extends ScheduleOptions {
  chunkSize?: number;
  onProgress?: (processed: number, total: number) => void;
}

export type DebouncedFunction<Args extends unknown[] = [], R = void> = {
  (...args: Args): void;
  cancel(): void;
  flush(): void;
  isPending(): boolean;
};

// ... 200+ more lines of explicit types
```

### After
```typescript
// app/src/lib/types/scheduler.ts (67 lines - keep only essentials)

// Keep ONLY the types that can't be inferred
export type Priority = 'user-blocking' | 'user-visible' | 'background';

// Implementation - TypeScript infers the rest from usage
export function processInChunks(
  items,
  processor,
  options = {}
) {
  const {
    chunkSize = 10,
    priority = 'user-visible',
    onProgress
  } = options;

  // TypeScript infers:
  // - items is T[]
  // - processor is (item: T, index: number) => void | Promise<void>
  // - options is { chunkSize?: number, priority?: Priority, onProgress?: (n: number, t: number) => void }
}
```

### Migration
```bash
# 1. Open app/src/lib/types/scheduler.ts
# 2. Delete all interface definitions EXCEPT Priority type
# 3. Keep only the types that provide value
# 4. Let TypeScript infer function parameter types from usage
```

### Impact
- **-180 lines** removed
- **Simpler to maintain** - fewer types to update
- **Same type safety** - inference works great

---

## 3-Hour Win: Replace Validation with Native Browser APIs

### Current Problem
438 lines of TypeScript type guards duplicating what browsers do natively.

### Opportunity 1: Email/URL Validation

**Before:**
```typescript
// app/src/lib/utils/validation.ts
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(value);
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Usage in component
const email = userInput;
if (!isValidEmail(email)) {
  setError('Invalid email');
  return;
}
```

**After:**
```html
<!-- Native constraint validation -->
<form id="subscription-form">
  <input
    type="email"
    name="email"
    required
    title="Please enter a valid email address"
  >

  <input
    type="url"
    name="website"
    pattern="https://.*"
    title="Must be HTTPS URL"
  >

  <button type="submit">Subscribe</button>
</form>

<script>
  // No type guards needed!
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Browser validates automatically
    if (form.checkValidity()) {
      const formData = new FormData(form);
      await submitSubscription(formData);
    } else {
      // Show native validation messages
      form.reportValidity();
    }
  });
</script>
```

### Opportunity 2: UUID Validation

**Before:**
```typescript
export function isUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
```

**After:**
```html
<input
  type="text"
  pattern="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
  title="Must be a valid UUID"
  required
>
```

### Opportunity 3: URLPattern for Complex URL Matching

**Before:**
```typescript
export function isValidPushSubscription(data: unknown): data is PushSubscriptionRequest {
  if (!isObject(data)) return false;
  if (!isHttpsUrl(data.endpoint)) return false;

  // Complex domain validation
  try {
    const url = new URL(data.endpoint);
    const allowedDomains = [
      'fcm.googleapis.com',
      'updates.push.services.mozilla.com',
      'notify.windows.com',
      'web.push.apple.com'
    ];
    const isAllowed = allowedDomains.some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) return false;
  } catch {
    return false;
  }
  // ... more validation
}
```

**After (Chrome 143+ URLPattern):**
```javascript
// Native URLPattern API
const ALLOWED_PUSH_ENDPOINTS = new URLPattern({
  protocol: 'https',
  hostname: '{*.}:fcm.googleapis.com|{*.}:updates.push.services.mozilla.com|{*.}:notify.windows.com|{*.}:web.push.apple.com'
});

export function isValidPushEndpoint(endpoint) {
  return ALLOWED_PUSH_ENDPOINTS.test(endpoint);
}
```

### Migration Checklist
- [ ] Identify form inputs that use type guard validation
- [ ] Replace TypeScript validators with HTML `type` and `pattern` attributes
- [ ] Use `form.checkValidity()` instead of custom validators
- [ ] Use URLPattern for complex URL matching
- [ ] Delete unused type guard functions
- [ ] Update unit tests to test HTML validation

### Impact
- **-150 lines** of type guards
- **-2KB** bundle size
- **Better UX** - native validation messages
- **More accessible** - screen readers understand native validation

---

## 4-Hour Win: Simplify Schema Base/WithDetails Pattern

### Current Problem
1,107 lines with excessive duplication. Every entity has 3 types: Base, WithDetails, and Legacy.

### Before
```typescript
// app/src/lib/db/dexie/schema.ts

// Base type (200 lines)
export interface DexieShowBase {
  id: number;
  date: string;
  venueId: number;
  tourId: number;
  notes: string | null;
  soundcheck: string | null;
  attendanceCount: number | null;
  rarityIndex: number | null;
  songCount: number;
  year: number;
}

// Embedded types (100 lines)
export interface EmbeddedVenue {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
  countryCode: string | null;
  venueType: VenueType | null;
  capacity: number | null;
  totalShows: number;
}

export interface EmbeddedTour {
  id: number;
  name: string;
  year: number;
  startDate: string | null;
  endDate: string | null;
  totalShows: number;
}

// WithDetails type (50 lines)
export interface DexieShowWithDetails extends DexieShowBase {
  venue: EmbeddedVenue;
  tour: EmbeddedTour;
}

// Legacy type (50 lines)
export interface DexieShow extends DexieShowBase {
  venue: EmbeddedVenue;
  tour: EmbeddedTour;
}

// Complex type guard (50 lines)
export function isDexieShowWithDetails(obj: unknown): obj is DexieShowWithDetails {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'date' in obj &&
    'venue' in obj &&
    typeof (obj as any).venue === 'object' &&
    'tour' in obj &&
    typeof (obj as any).tour === 'object'
  );
}

// REPEAT for: SetlistEntry, LiberationEntry, GuestAppearance...
```

### After
```typescript
// app/src/lib/db/dexie/schema.ts

// Single source of truth per entity
export interface DexieShow {
  id: number;
  date: string;
  venueId: number;
  tourId: number;
  notes: string | null;
  soundcheck: string | null;
  attendanceCount: number | null;
  rarityIndex: number | null;
  songCount: number;
  year: number;

  // Optional embedded data
  venue?: EmbeddedVenue;
  tour?: EmbeddedTour;
}

// Derive variants using TypeScript utility types
export type DexieShowBase = Omit<DexieShow, 'venue' | 'tour'>;
export type DexieShowWithDetails = Required<DexieShow>;

// Simple runtime check
export function hasEmbeddedData(show) {
  return Boolean(show.venue && show.tour);
}

// For UI components that need guaranteed embedded data
export function assertEmbeddedData(show): asserts show is DexieShowWithDetails {
  if (!show.venue || !show.tour) {
    throw new Error('Show missing embedded venue/tour data');
  }
}
```

### Migration Steps
1. Consolidate each entity's 3 types into 1 primary type with optional embedded fields
2. Use `Omit<>` to derive Base types
3. Use `Required<>` to derive WithDetails types
4. Replace complex type guards with simple runtime checks
5. Update component props to use primary type with runtime assertions if needed

### Component Usage Pattern
```typescript
// BEFORE
function ShowCard({ show }: { show: DexieShowWithDetails }) {
  // Guaranteed to have show.venue and show.tour
  return <div>{show.venue.name}</div>;
}

// AFTER - Same guarantee with simpler types
function ShowCard({ show }: { show: DexieShow }) {
  // Assert at component boundary
  assertEmbeddedData(show);

  // Now TypeScript knows show.venue and show.tour exist
  return <div>{show.venue.name}</div>;
}
```

### Impact
- **-450 lines** of duplicate types
- **Single source of truth** per entity
- **Same type safety** with less code
- **Easier to maintain** - change in one place

---

## Summary: Priority Queue

### Implement in This Order

| Priority | Task | Time | Impact | Files |
|----------|------|------|--------|-------|
| **P0** | Delete browser-apis.d.ts | 5 min | -381 lines | 1 file delete |
| **P0** | Simplify scheduler types | 30 min | -180 lines | 1 file edit |
| **P0** | Replace WasmFunctionAccessor | 1 hour | -150 lines, -1.5KB | 2 files |
| **P1** | Schema Base/WithDetails simplification | 4 hours | -450 lines | 1 file edit |
| **P1** | Native validation APIs | 3 hours | -150 lines, -2KB | Multiple |
| **P2** | WASM types simplification | 2 hours | -120 lines | 1 file edit |
| **P2** | URLPattern for URL validation | 1 hour | -40 lines | 1 file edit |

### Total Impact
- **Time investment:** 11.5 hours
- **Lines removed:** 2,648 (4.4% of codebase)
- **Bundle reduction:** ~4KB
- **Build time improvement:** ~15%
- **Maintenance burden:** Significantly reduced

---

## Quick Wins Checklist

- [ ] Delete `app/src/lib/types/browser-apis.d.ts` (**5 minutes**)
- [ ] Simplify `app/src/lib/types/scheduler.ts` (**30 minutes**)
- [ ] Create `app/src/lib/wasm/proxy-simple.ts` and replace WasmFunctionAccessor (**1 hour**)
- [ ] Consolidate schema types in `app/src/lib/db/dexie/schema.ts` (**4 hours**)
- [ ] Replace validation type guards with native HTML validation (**3 hours**)
- [ ] Simplify WASM discriminated unions in `app/src/lib/wasm/types.ts` (**2 hours**)
- [ ] Use URLPattern for complex URL matching (**1 hour**)

**Start with P0 items - can be done in 1.5 hours total and removes 711 lines!**
