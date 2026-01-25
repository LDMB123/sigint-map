# TypeScript Type Improvements - Implementation Guide

Quick reference for the most impactful type safety improvements.

## 1. Error Utility Functions (Saves ~1.1 KB)

**File to create: `/src/lib/errors/utils.ts`**

```typescript
/**
 * Type-safe error handling utilities
 * Eliminates 50+ `instanceof Error` checks across codebase
 */

/**
 * Safely extract error message from any caught value
 * @example
 * catch (error) {
 *   console.error(getErrorMessage(error));
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error ?? 'Unknown error');
}

/**
 * Convert any value to an Error instance
 * @example
 * const err = toError(caughtValue);
 * throw err;
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(getErrorMessage(error));
}

/**
 * Check if a value is an Error instance
 * @example
 * if (isError(caught)) {
 *   console.error(caught.stack);
 * }
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Get error name or default
 */
export function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  return 'UnknownError';
}
```

**Replace in 50+ files:**
```typescript
// BEFORE (22 bytes each):
const msg = error instanceof Error ? error.message : String(error);

// AFTER (13 bytes):
const msg = getErrorMessage(error);
```

**Files to update:**
- `/src/lib/wasm/stores.ts` (3 instances)
- `/src/lib/wasm/bridge.ts` (4 instances)
- `/src/lib/wasm/worker.ts` (3 instances)
- `/src/lib/db/dexie/init.ts` (7 instances)
- `/src/lib/db/dexie/db.ts` (5 instances)
- `/src/lib/stores/navigation.ts` (4 instances)
- And 15+ more files...

---

## 2. WASM Function Access Pattern (Saves ~300 bytes)

**File: `/src/lib/wasm/transform.ts` - Lines 810, 857, 900, 947, 1004, 1063, 1113**

**Current (appears 7 times):**
```typescript
const extractFn = (module as unknown as {
  extractYearsTyped?: (json: string) => WasmTypedArrayReturn;
})['extractYearsTyped'];

if (extractFn) {
  const result = extractFn(showsJson);
}
```

**Better (use existing utility):**
```typescript
// Already exists in /src/lib/types/wasm-helpers.ts!
import { hasWasmFunction } from '$lib/types/wasm-helpers';

if (hasWasmFunction(this.wasmModule, 'extractYearsTyped')) {
  const extractFn = (this.wasmModule as WasmExportsExtended)
    .extractYearsTyped;
  if (extractFn) {
    const result = extractFn(showsJson);
  }
}
```

**Or create a specialized accessor:**
```typescript
// /src/lib/types/wasm-helpers.ts - Add to file:
export function callWasmExtractTyped(
  module: WasmExports,
  functionName: 'extractYearsTyped' | 'getShowIdsForSongTyped',
  json: string,
  songId?: bigint
): WasmTypedArrayReturn | undefined {
  if (functionName === 'extractYearsTyped' &&
      hasWasmFunction(module, functionName)) {
    const fn = (module as WasmExportsExtended).extractYearsTyped;
    return fn?.(json);
  }
  if (functionName === 'getShowIdsForSongTyped' &&
      hasWasmFunction(module, functionName) &&
      songId !== undefined) {
    const fn = (module as WasmExportsExtended).getShowIdsForSongTyped;
    return fn?.(json, songId);
  }
  return undefined;
}

// Usage (much cleaner):
const result = callWasmExtractTyped(this.wasmModule, 'extractYearsTyped', showsJson);
```

---

## 3. Browser API Types (Saves ~300 bytes)

**File: `/src/lib/types/browser-apis.d.ts` - Add these sections**

```typescript
/**
 * Window Controls Overlay API
 * https://github.com/WICG/window-controls-overlay/
 */
declare interface Window {
  windowControlsOverlay?: WindowControlsOverlay;
}

interface WindowControlsOverlay extends EventTarget {
  ongeometrychange: ((this: WindowControlsOverlay, event: Event) => any) | null;
  readonly geometry: WindowControlsOverlayGeometry;
  onchange: EventListener | null;
}

interface WindowControlsOverlayGeometry {
  readonly titlebarAreaX: number;
  readonly titlebarAreaY: number;
  readonly titlebarAreaWidth: number;
  readonly titlebarAreaHeight: number;
}

/**
 * Navigator.standalone (iOS PWA indicator)
 */
declare interface Navigator {
  standalone?: boolean;
}

/**
 * ServiceWorkerRegistration.periodicSync
 */
declare interface ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager;
}

interface PeriodicSyncManager {
  register(
    tag: string,
    options?: { minInterval?: number }
  ): Promise<void>;
  getTags(): Promise<string[]>;
  unregister(tag: string): Promise<void>;
}

/**
 * PerformanceEntry extensions
 */
declare interface PerformanceEntryInit {
  attribution?: PerformanceEntryName[];
}
```

**Replace in 3 files:**
```typescript
// BEFORE (/src/lib/utils/windowControlsOverlay.ts:52):
const api = window as unknown as WindowControlsOverlayAPI;

// AFTER:
const api = window.windowControlsOverlay;
if (api?.geometry) {
  // TypeScript knows the type now!
}
```

---

## 4. Type Guard Helper (Saves ~100 bytes)

**File: `/src/lib/types/wasm-helpers.ts` - Fix existing guards**

**Current (lines 221-248):**
```typescript
export function isWasmTypedArrayReturn(
  value: unknown
): value is WasmTypedArrayReturn {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ptr' in value &&
    'len' in value &&
    typeof (value as any).ptr === 'number' &&  // <-- BAD
    typeof (value as any).len === 'number'     // <-- BAD
  );
}
```

**Better:**
```typescript
export function isWasmTypedArrayReturn(
  value: unknown
): value is WasmTypedArrayReturn {
  if (typeof value !== 'object' || value === null) return false;
  if (!('ptr' in value) || !('len' in value)) return false;

  const obj = value as Record<string, unknown>;
  return typeof obj.ptr === 'number' && typeof obj.len === 'number';
}

export function isWasmParallelArraysReturn(
  value: unknown
): value is WasmParallelArraysReturn {
  if (typeof value !== 'object' || value === null) return false;
  if (!('ptr1' in value) || !('len1' in value)) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj.ptr1 === 'number' &&
    typeof obj.len1 === 'number'
  );
}
```

---

## 5. JSON Validation Helper (Saves ~200 bytes)

**File to create: `/src/lib/utils/json-safe.ts`**

```typescript
/**
 * Type-safe JSON parsing with validation
 * Eliminates 13+ unsafe `JSON.parse(x) as T` patterns
 */

/**
 * Parse JSON with type validation
 * @param json Raw JSON string
 * @param validate Type guard to validate structure
 * @param context Optional context for error messages
 * @returns Validated data
 * @throws Error if JSON invalid or doesn't match type
 * @example
 * const years = parseJsonSafe(
 *   data,
 *   (v): v is YearCount[] => Array.isArray(v) && v.length > 0,
 *   'yearCounts'
 * );
 */
export function parseJsonSafe<T>(
  json: string,
  validate: (value: unknown) => value is T,
  context?: string
): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse JSON${context ? ` for ${context}` : ''}: ${errorMsg}`
    );
  }

  if (!validate(parsed)) {
    throw new Error(
      `Invalid data structure${context ? ` for ${context}` : ''}`
    );
  }

  return parsed;
}

/**
 * Common type validators
 */
export const validators = {
  isArray: (v: unknown): v is unknown[] => Array.isArray(v),
  isRecord: (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v),
  isString: (v: unknown): v is string => typeof v === 'string',
  isNumber: (v: unknown): v is number => typeof v === 'number',
};

/**
 * Parse with optional reviver (for BigInt, etc.)
 */
export function parseJsonSafeWithReviver<T>(
  json: string,
  reviver: (key: string, value: unknown) => unknown,
  validate: (value: unknown) => value is T,
  context?: string
): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json, reviver as any);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse JSON${context ? ` for ${context}` : ''}: ${errorMsg}`
    );
  }

  if (!validate(parsed)) {
    throw new Error(
      `Invalid data structure${context ? ` for ${context}` : ''}`
    );
  }

  return parsed;
}
```

**Replace in files:**

```typescript
// /src/lib/wasm/aggregations.ts:216
// BEFORE:
const wasmResult = JSON.parse(result.data) as YearCount[];

// AFTER:
import { parseJsonSafe, validators } from '$lib/utils/json-safe';

const isYearCounts = (v: unknown): v is YearCount[] =>
  Array.isArray(v) && v.every(item =>
    typeof item === 'object' && item !== null &&
    'year' in item && 'count' in item
  );

const wasmResult = parseJsonSafe(result.data, isYearCounts, 'yearCounts');
```

---

## 6. Test Fixture Helpers (No size impact)

**File to create: `/src/lib/wasm/__fixtures__/song-mocks.ts`**

```typescript
import type { SongServer, SongClient } from '$lib/types';

/** Standard test song matching real schema */
export const mockSongServer: SongServer = {
  id: 1,
  title: 'Ants Marching',
  slug: 'ants-marching',
  sortTitle: 'Ants Marching',
  originalArtist: null,
  isCover: false,
  isOriginal: true,
  firstPlayedDate: '1991-04-16',
  lastPlayedDate: '2024-06-29',
  totalPerformances: 543,
  openerCount: 12,
  closerCount: 45,
  encoreCount: 8,
  lyrics: 'One, two, three',
  notes: null,
};

/** Song with various null fields */
export const songWithNulls: SongServer = {
  ...mockSongServer,
  id: 2,
  originalArtist: null,
  firstPlayedDate: null,
  lyrics: null,
  notes: null,
};

/** Minimal song (only required fields) */
export const minimalSong: SongServer = {
  id: 3,
  title: 'All These Things',
  slug: 'all-these-things',
  sortTitle: 'All These Things',
  originalArtist: null,
  isCover: false,
  isOriginal: true,
  firstPlayedDate: null,
  lastPlayedDate: null,
  totalPerformances: 1,
  openerCount: 0,
  closerCount: 0,
  encoreCount: 0,
  lyrics: null,
  notes: null,
};

/** Liberated song (long gap between performances) */
export const liberatedSong: SongServer = {
  ...mockSongServer,
  id: 4,
  firstPlayedDate: '2010-01-01',
  lastPlayedDate: '2024-06-29',
  totalPerformances: 2,
};
```

**Replace in `/src/lib/wasm/transform.test.ts`:**

```typescript
// BEFORE:
const result = await transformSongs([mockSongServer as any]);

// AFTER:
import { mockSongServer } from './__fixtures__/song-mocks';

const result = await transformSongs([mockSongServer]); // No cast needed!
```

---

## 7. Navigation API Type Guard

**File: `/src/lib/sw/register.ts` - Lines 255, 296**

```typescript
/**
 * Type guard for iOS PWA detection
 */
function isRunningAsStandalone(): boolean {
  // Method 1: Check display-mode media query
  if (typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Method 2: Check iOS PWA indicator
  if (typeof navigator !== 'undefined' &&
      (navigator as Partial<NavigatorExtended>).standalone === true) {
    return true;
  }

  // Method 3: Check launch parameter
  if (typeof window !== 'undefined' &&
      window.location.search.includes('source=pwa')) {
    return true;
  }

  return false;
}

/**
 * Type guard for periodic sync support
 */
function hasPeriodicSync(
  registration: ServiceWorkerRegistration
): registration is ServiceWorkerRegistration & {
  periodicSync: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
} {
  return 'periodicSync' in registration;
}

// Usage:
if (isRunningAsStandalone()) {
  // Safe to use iOS-specific features
}

if (hasPeriodicSync(registration)) {
  await registration.periodicSync.register(tag, { minInterval });
}
```

---

## Summary of Changes by File

### Create (New Files)
1. `/src/lib/errors/utils.ts` - Error handling utilities
2. `/src/lib/utils/json-safe.ts` - Safe JSON parsing
3. `/src/lib/wasm/__fixtures__/song-mocks.ts` - Test fixtures
4. `/src/lib/wasm/__fixtures__/venue-mocks.ts` - Test fixtures

### Modify (Existing Files)
1. `/src/lib/types/browser-apis.d.ts` - Add browser API types
2. `/src/lib/types/wasm-helpers.ts` - Fix type guards (remove `as any`)
3. `/src/lib/sw/register.ts` - Add type guards instead of casts
4. `/src/lib/wasm/transform.ts` - Use WASM accessor pattern
5. `/src/lib/wasm/aggregations.ts` - Use JSON validation
6. `/src/lib/wasm/transform.test.ts` - Use fixtures instead of `as any`
7. `tsconfig.json` - Add strict compiler options
8. 30+ other files - Replace `instanceof Error` checks

### Delete (Optional)
1. 7 identical WASM cast patterns - consolidated into single utility

---

## Implementation Order

1. **Day 1**: Create error utils → replace in 30+ files
2. **Day 2**: Create JSON safe → replace in 13 files
3. **Day 3**: Fix browser APIs and test fixtures
4. **Day 4**: WASM accessor refactor
5. **Day 5**: Enable strict tsconfig, run full test suite

**Estimated total time: 2-3 hours**
**Estimated impact: 2.3 KB reduction, better type safety**
