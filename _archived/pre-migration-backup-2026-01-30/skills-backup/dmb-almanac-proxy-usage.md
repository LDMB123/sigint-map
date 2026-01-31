---
name: dmb-almanac-proxy-usage
description: "Proxy pattern usage for state management"
recommended_tier: sonnet
category: scraping
complexity: advanced
tags:
  - projects
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/src/lib/wasm/PROXY_USAGE_GUIDE.md
migration_date: 2026-01-25
---

# WASM Module Proxy - Developer Guide


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Quick Start

Replace unsafe double-casts with type-safe proxies in 3 steps:

### 1. Import the Proxy

```typescript
import { createTransformProxy } from '$lib/wasm/proxy';
```

### 2. Create a Proxy Instance

```typescript
const module = await loadWasmModule();
const proxy = createTransformProxy(module);
```

### 3. Call Functions Type-Safely

```typescript
const result = proxy.extractShowYearsTyped(json);
if (result.success) {
  const years: Int32Array = result.data;
}
```

## Available Proxies

| Proxy Factory | Module | Use Case |
|--------------|--------|----------|
| `createTransformProxy()` | dmb-transform | Data transformation, aggregations |
| `createDateUtilsProxy()` | dmb-date-utils | Date parsing, season detection |
| `createStringUtilsProxy()` | dmb-string-utils | String normalization, slugs |
| `createVisualizeProxy()` | dmb-visualize | Heatmap generation |
| `createSegueAnalysisProxy()` | dmb-segue-analysis | Setlist prediction |
| `createValidationProxy()` | dmb-validation | Foreign key validation |
| `createWasmExportsProxy()` | WasmExports | Bridge integration |
| `createWasmProxy()` | Generic | Any WASM module |

## Common Patterns

### Pattern 1: Optional Function Call

```typescript
const proxy = createTransformProxy(module);
const result = proxy.call<Int32Array>('optionalFunction', args);

if (result.success && result.data) {
  // Function exists and succeeded
  useData(result.data);
} else if (!result.functionExists) {
  // Function doesn't exist - use alternative
  useAlternative();
} else {
  // Function exists but threw error
  console.error(result.error);
}
```

### Pattern 2: Call with Automatic Fallback

```typescript
const proxy = createWasmProxy(module);

// Automatically falls back to JS if WASM function unavailable
const data = proxy.callWithFallback(
  'processData',
  (input) => processDataJS(input),
  input
);
```

### Pattern 3: Direct Call (Throws on Error)

```typescript
const proxy = createTransformProxy(module);

try {
  // Simpler code when you want to handle errors elsewhere
  const years = proxy.callUnsafe<Int32Array>('extractYears', json);
  return { data: years, source: 'wasm' };
} catch (error) {
  return { data: extractYearsJS(), source: 'js' };
}
```

### Pattern 4: Check Function Availability

```typescript
const proxy = createWasmProxy(module);

if (proxy.hasFunction('newFeature')) {
  const result = proxy.call('newFeature', data);
} else {
  // Use old approach
}
```

## TypedArray Operations

### Extract IDs as TypedArray

```typescript
const proxy = createTransformProxy(module);

// Extract song IDs as Int32Array (zero-copy)
const result = proxy.extractSongIdsTyped(JSON.stringify(entries));

if (result.success && result.data) {
  const songIds: Int32Array = result.data;
  console.log(`Extracted ${songIds.length} song IDs`);
}
```

### Compute Parallel Arrays

```typescript
const proxy = createTransformProxy(module);

// Get song IDs and play counts as parallel arrays
const result = proxy.computeSongPlayCountsTyped(json);

if (result.success && result.data) {
  const { songIds, counts } = result.data;
  // songIds: Int32Array, counts: Int32Array

  for (let i = 0; i < songIds.length; i++) {
    console.log(`Song ${songIds[i]}: ${counts[i]} plays`);
  }
}
```

### Compute Rarity Scores

```typescript
const proxy = createTransformProxy(module);

// Get rarity scores as Float32Array
const result = proxy.computeRarityScoresTyped(songsJson, totalShows);

if (result.success && result.data) {
  const scores: Float32Array = result.data;
  // Scores are in same order as input songs
}
```

## Specialized Proxies

### TransformModuleProxy

Includes smart API selection (direct vs JSON):

```typescript
const proxy = createTransformProxy(module);

// Automatically uses transformSongsDirect if available,
// falls back to transform_songs (JSON API) otherwise
const result = proxy.transformSongs(serverSongs);
```

### DateUtilsModuleProxy

Date-specific operations:

```typescript
const proxy = createDateUtilsProxy(module);

// Parse date with metadata
const metaResult = proxy.parseDateWithMetadata('2024-01-15');

// Calculate days between dates
const daysResult = proxy.daysBetween('2024-01-01', '2024-12-31');

// Batch extract years
const yearsResult = proxy.batchExtractYearsTyped(datesJson);
```

### ValidationModuleProxy

TypedArray-based validation:

```typescript
const proxy = createValidationProxy(module);

// Validate foreign keys
const result = proxy.validateForeignKeysTyped(
  entityIds,    // Int32Array
  foreignKeys,  // Int32Array
  validIds      // Int32Array
);

if (result.success && result.data) {
  const { isValid, invalidIds } = result.data;
}
```

## Migration Examples

### Example 1: transform.ts

**Before:**
```typescript
export async function extractShowYearsTyped(
  shows: { date: string }[]
): Promise<TypedArrayTransformResult<Int32Array>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const extractFn = (module as unknown as {
        extractShowYearsTyped?: (json: string) => Int32Array;
      }).extractShowYearsTyped;

      if (extractFn) {
        const dates = shows.map(s => s.date);
        const data = extractFn(JSON.stringify(dates));
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('extractShowYearsTyped failed:', error);
    }
  }

  // JS fallback...
}
```

**After:**
```typescript
export async function extractShowYearsTyped(
  shows: { date: string }[]
): Promise<TypedArrayTransformResult<Int32Array>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const proxy = createTransformProxy(module);
      const dates = shows.map(s => s.date);
      const result = proxy.extractShowYearsTyped(JSON.stringify(dates));

      if (result.success && result.data) {
        return {
          data: result.data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('extractShowYearsTyped failed:', error);
    }
  }

  // JS fallback...
}
```

**Benefits:**
- 8 lines → 5 lines (-37% code)
- No inline type definition
- Clearer intent
- Type-safe `result.data`

### Example 2: bridge.ts

**Before:**
```typescript
const accessor = new WasmFunctionAccessor(this.wasmModule);
const wasmFn = (accessor as unknown as Record<string, Function>)['extractSongIdsTyped'];

if (typeof wasmFn === 'function') {
  const wasmReturn = wasmFn(inputJson);

  if (wasmReturn && isWasmTypedArrayReturn(wasmReturn)) {
    const { ptr, len } = wasmReturn;
    // Process typed array...
  }
}
```

**After:**
```typescript
const proxy = createWasmProxy(this.wasmModule);
const wasmResult = proxy.call<WasmTypedArrayReturn>('extractSongIdsTyped', inputJson);

if (wasmResult.success && wasmResult.data) {
  const wasmReturn = wasmResult.data;

  if (isWasmTypedArrayReturn(wasmReturn)) {
    const { ptr, len } = wasmReturn;
    // Process typed array...
  }
}
```

**Benefits:**
- Eliminated unsafe cast through accessor
- Single validation point
- Better error context

## Debugging

### List Available Functions

```typescript
import { debugWasmModule } from '$lib/wasm/proxy';

const module = await loadWasmModule();
debugWasmModule(module, 'dmb-transform');

// Output:
// [WasmModuleProxy] dmb-transform Functions (42)
//
// extract: extractYearsTyped, extractSongIdsTyped, extractShowIdsTyped
// compute: computeSongPlayCountsTyped, computeRarityScoresTyped
// transform: transformSongs, transformVenues, transformShows
// ...
```

### Check Function Existence

```typescript
const proxy = createWasmProxy(module);

console.log('Has extractYears?', proxy.hasFunction('extractYearsTyped'));
console.log('All functions:', proxy.getFunctionNames());
```

### Access Underlying Module

```typescript
const proxy = createWasmProxy(module);

// Escape hatch for advanced usage
const rawModule = proxy.getModule();

// Access memory
const memory = proxy.getMemory();
```

## Best Practices

### 1. Use Specialized Proxies When Possible

```typescript
// GOOD - Better type safety
const proxy = createTransformProxy(module);
const result = proxy.extractShowYearsTyped(json);

// OK - More flexible, less type-safe
const proxy = createWasmProxy(module);
const result = proxy.call<Int32Array>('extractShowYearsTyped', json);
```

### 2. Check Success Before Using Data

```typescript
// GOOD - Safe
const result = proxy.call('func', arg);
if (result.success && result.data) {
  useData(result.data);
}

// BAD - Unsafe
const result = proxy.call('func', arg);
useData(result.data!); // Could be undefined!
```

### 3. Provide Specific Error Handling

```typescript
const result = proxy.call('func', arg);

if (!result.success) {
  if (!result.functionExists) {
    console.warn('Function not available, using fallback');
    useFallback();
  } else {
    console.error('Function failed:', result.error);
    handleError(result.error);
  }
}
```

### 4. Cache Proxy Instances

```typescript
// GOOD - Reuse proxy
const proxy = createTransformProxy(module);
const result1 = proxy.call('func1', arg1);
const result2 = proxy.call('func2', arg2);

// OK - Creates new proxy each time
createTransformProxy(module).call('func1', arg1);
createTransformProxy(module).call('func2', arg2);
```

## Type Definitions Reference

### ProxyCallResult<T>

```typescript
type ProxyCallResult<T> =
  | {
      success: true;
      data: T;
      functionExists: true;
    }
  | {
      success: false;
      error: string;
      functionExists: boolean;
    };
```

**Usage:**
```typescript
const result = proxy.call<Int32Array>('func', arg);

// Type narrowing
if (result.success) {
  // TypeScript knows: result.data is Int32Array
  const data: Int32Array = result.data;
} else {
  // TypeScript knows: result.error is string
  const error: string = result.error;
}
```

### Module Extension Interfaces

All module capabilities are defined as optional methods:

```typescript
export interface TransformModuleExtensions {
  extractShowYearsTyped?: (json: string) => Int32Array;
  extractSongIdsTyped?: (json: string) => Int32Array;
  computeSongPlayCountsTyped?: (json: string) => {
    songIds: Int32Array;
    counts: Int32Array;
  };
  // ... more functions
}
```

**Why optional?**
- Not all modules implement all functions
- Runtime checking determines availability
- Allows graceful degradation

## Error Handling Patterns

### Pattern 1: Result-Based Error Handling

```typescript
const result = proxy.call('func', arg);

if (result.success) {
  return { data: result.data, source: 'wasm' };
} else {
  console.error(result.error);
  return { data: fallback(arg), source: 'js' };
}
```

### Pattern 2: Exception-Based Error Handling

```typescript
try {
  const data = proxy.callUnsafe('func', arg);
  return { data, source: 'wasm' };
} catch (error) {
  return { data: fallback(arg), source: 'js' };
}
```

### Pattern 3: Automatic Fallback

```typescript
const data = proxy.callWithFallback(
  'func',
  (arg) => fallback(arg),
  arg
);
// Always returns data, uses WASM if available
```

## Performance Tips

### 1. Reuse Proxy Instances

```typescript
// Create once
const proxy = createTransformProxy(module);

// Reuse many times (function lookup is cached)
for (const batch of batches) {
  const result = proxy.extractYears(batch);
}
```

### 2. Use Typed Methods When Available

```typescript
// FASTER - Direct method call
const result = proxy.extractShowYearsTyped(json);

// SLOWER - Generic call with string lookup
const result = proxy.call<Int32Array>('extractShowYearsTyped', json);
```

### 3. Clear Cache if Module Reloads

```typescript
proxy.clearCache(); // Clear function cache after module reload
```

## Adding New WASM Functions

### Step 1: Define Type

Add to appropriate module extension interface in `proxy.ts`:

```typescript
export interface TransformModuleExtensions {
  // ... existing functions

  newTypedExtractor?: (json: string) => Float64Array;
}
```

### Step 2: Add Typed Method (Optional)

Add to specialized proxy class:

```typescript
export class TransformModuleProxy {
  // ... existing methods

  /**
   * Extract new data type as Float64Array
   */
  newTypedExtractor(json: string): ProxyCallResult<Float64Array> {
    return this.call<Float64Array>('newTypedExtractor', json);
  }
}
```

### Step 3: Use in Code

```typescript
const proxy = createTransformProxy(module);
const result = proxy.newTypedExtractor(json);

if (result.success && result.data) {
  const extracted: Float64Array = result.data;
}
```

## Common Mistakes to Avoid

### Mistake 1: Not Checking Success

```typescript
// BAD - data could be undefined
const result = proxy.call('func', arg);
const value = result.data.someProperty; // Runtime error!

// GOOD - Check success first
const result = proxy.call('func', arg);
if (result.success && result.data) {
  const value = result.data.someProperty;
}
```

### Mistake 2: Wrong Return Type

```typescript
// BAD - Type doesn't match actual return
const result = proxy.call<string>('extractYears', json);
// Function returns Int32Array, not string!

// GOOD - Correct type
const result = proxy.call<Int32Array>('extractYears', json);
```

### Mistake 3: Not Handling Missing Functions

```typescript
// BAD - Assumes function exists
const data = proxy.callUnsafe('optionalFunc', arg);
// Throws if function doesn't exist

// GOOD - Handle missing function
const result = proxy.call('optionalFunc', arg);
if (!result.functionExists) {
  // Use alternative approach
}
```

## Utility Functions

### Type Guards

```typescript
import { isProxySuccess, isProxyError, unwrapProxyResult } from '$lib/wasm/proxy';

const result = proxy.call('func', arg);

// Type guard
if (isProxySuccess(result)) {
  const data = result.data; // Type narrowed
}

// Unwrap or throw
const data = unwrapProxyResult(result); // Throws if not successful

// Unwrap with default
const data = unwrapProxyResultOr(result, defaultValue);
```

### Debug Helpers

```typescript
import { debugWasmModule } from '$lib/wasm/proxy';

// List all functions in module
debugWasmModule(module, 'ModuleName');

// Get function names programmatically
const proxy = createWasmProxy(module);
const functions = proxy.getFunctionNames();
console.log('Available:', functions);
```

## Complete Example

```typescript
import { createTransformProxy, unwrapProxyResultOr } from '$lib/wasm/proxy';
import type { DexieShow } from '$lib/db/dexie/schema';

async function extractYearsWithWasm(shows: DexieShow[]): Promise<Int32Array> {
  // Load module
  const module = await loadWasmModule();

  if (!module) {
    // No WASM available, use JS
    return extractYearsJS(shows);
  }

  // Create proxy
  const proxy = createTransformProxy(module);

  // Prepare input
  const dates = shows.map(s => s.date);
  const json = JSON.stringify(dates);

  // Call WASM function
  const result = proxy.extractShowYearsTyped(json);

  // Handle result with automatic fallback
  return unwrapProxyResultOr(result, extractYearsJS(shows));
}

function extractYearsJS(shows: DexieShow[]): Int32Array {
  const years = new Int32Array(shows.length);
  for (let i = 0; i < shows.length; i++) {
    years[i] = parseInt(shows[i].date.slice(0, 4), 10);
  }
  return years;
}
```

## FAQs

### Q: When should I use `call()` vs `callUnsafe()`?

**A:** Use `call()` when:
- Function might not exist (optional features)
- You want structured error information
- You're building a public API

Use `callUnsafe()` when:
- Function is guaranteed to exist
- You're handling errors with try/catch anyway
- You want simpler code

### Q: Do I need to create a specialized proxy for my module?

**A:** Only if you want:
- Better type safety with module-specific methods
- Smart API selection (like transformSongs choosing direct vs JSON)
- Custom helper methods

Otherwise, `createWasmProxy()` is sufficient.

### Q: How do I handle functions that return complex objects?

**A:** Define the return type and let TypeScript validate:

```typescript
interface ComplexReturn {
  ids: Int32Array;
  scores: Float32Array;
  metadata: { count: number; avg: number };
}

const result = proxy.call<ComplexReturn>('complexFunc', arg);

if (result.success && result.data) {
  const { ids, scores, metadata } = result.data;
  // All properly typed!
}
```

### Q: What if I need to access the raw module?

**A:** Use the escape hatch:

```typescript
const proxy = createWasmProxy(module);
const rawModule = proxy.getModule();

// Cast to your specific type
const typed = rawModule as MyModuleType;
```

### Q: How does function caching work?

**A:** First call to a function:
1. Looks up function in module
2. Checks if it's a function
3. Caches result (function or null)

Subsequent calls:
1. Returns cached result immediately
2. ~1000x faster than re-lookup

Cache is per-proxy instance, cleared on `clearCache()` or proxy disposal.

## Summary

The WASM module proxy system provides:

- **Type Safety** - Compile-time checking of function names and signatures
- **Runtime Safety** - Function existence validation and error handling
- **Developer Experience** - IDE autocomplete, clear error messages
- **Performance** - Function caching, zero WASM overhead
- **Maintainability** - Centralized type definitions, easy to extend

Replace all `(module as unknown as Record<string, Function>)['func']` patterns with proxy calls for better code quality.
