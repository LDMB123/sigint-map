# WASM API Reference

Complete API documentation for DMB Almanac WASM statistical functions.

## Overview

The WASM module provides high-performance statistical functions written in Rust and compiled to WebAssembly. All functions operate on year-based aggregations and numeric computations, providing 5-10x speedup over pure JavaScript implementations.

**Module Location**: `/app/src/lib/wasm/aggregations/`

**Runtime Loader**: `/app/src/lib/wasm/loader.js`

---

## Functions

### aggregate_by_year()

Aggregate shows by year using SIMD-optimized histogram.

**Signature**:
```javascript
aggregate_by_year(years: Uint32Array): Map<number, number>
```

**Purpose**: Fast histogram computation for year-based aggregations using auto-vectorized Rust code.

**Parameters**:
- `years` - Typed array of year values (e.g., `[1991, 1992, 1991, 2000, ...]`)

**Returns**: JavaScript `Map` with year → count pairs (only non-zero years included)

**Year Range**: Supports years 1991-2026 (35 years)

**Performance**:
- **WASM**: 0.5-2ms for 2,800 shows
- **JavaScript**: 2-5ms for 2,800 shows
- **Speedup**: 2-5x faster than JavaScript

**Example**:
```javascript
import { WasmRuntime } from '$lib/wasm/loader.js';

// Load WASM module
const wasmModule = await WasmRuntime.load();

// Prepare data
const shows = await db.shows.toArray();
const years = new Uint32Array(shows.map(s => s.year));

// Compute histogram
const result = wasmModule.aggregate_by_year(years);

// Result: Map { 1991 => 45, 1992 => 67, 2000 => 123, ... }
console.log(`Shows in 2000: ${result.get(2000)}`);
```

**Implementation Details**:
- Uses stack-allocated histogram array (35 x 4 bytes = 140 bytes)
- SIMD-friendly loop enables auto-vectorization by Rust compiler
- Years outside 1991-2026 range are silently ignored
- Zero-count years are excluded from result Map

**Error Handling**:
- Invalid years (< 1991 or > 2026) are skipped
- Empty input returns empty Map
- No exceptions thrown

---

### unique_songs_per_year()

Count unique songs performed in each year from setlist entries.

**Signature**:
```javascript
unique_songs_per_year(songs: Array<{year: number, song: string}>): Map<number, number>
```

**Purpose**: Efficiently count unique songs per year using Rust HashSet operations.

**Parameters**:
- `songs` - JavaScript array of objects with `year` and `song` fields

**Returns**: JavaScript `Map` with year → unique song count

**Performance**:
- **WASM**: 2-4ms for 50,000 entries
- **JavaScript**: 10-20ms for 50,000 entries
- **Speedup**: 5x faster than JavaScript

**Example**:
```javascript
import { WasmRuntime } from '$lib/wasm/loader.js';

const wasmModule = await WasmRuntime.load();

// Prepare setlist data
const entries = await db.setlistEntries.toArray();
const songs = entries.map(e => ({
  year: e.year,
  song: e.songName
}));

// Count unique songs per year
const result = wasmModule.unique_songs_per_year(songs);

// Result: Map { 1991 => 45, 1992 => 67, ... }
console.log(`Unique songs in 2024: ${result.get(2024)}`);
```

**Implementation Details**:
- Uses Rust `HashMap<u32, HashSet<String>>` for tracking
- HashSet automatically handles duplicates
- String allocation happens in Rust heap (no JavaScript GC pressure)
- Only non-zero years included in result

**Error Handling**:
- Missing `year` or `song` fields are skipped
- Invalid JavaScript objects are ignored
- Empty input returns empty Map

---

### calculate_percentile()

Calculate percentile from pre-sorted array of values.

**Signature**:
```javascript
calculate_percentile(values: Float64Array, percentile: number): number
```

**Purpose**: Fast percentile calculation using linear interpolation.

**Parameters**:
- `values` - **Pre-sorted** array of numeric values (must be sorted ascending)
- `percentile` - Percentile to calculate (0.0 to 1.0, where 0.5 = median)

**Returns**: Numeric value at the specified percentile

**Performance**:
- **WASM**: <0.1ms (constant time)
- **JavaScript**: <0.1ms (no significant difference for single calculation)
- **Speedup**: Minimal for single calls, useful when integrated into larger WASM pipelines

**Example**:
```javascript
import { WasmRuntime } from '$lib/wasm/loader.js';

const wasmModule = await WasmRuntime.load();

// Pre-sorted array of song counts
const songCounts = new Float64Array([1, 5, 10, 15, 20, 25, 30, 50, 100, 500]);

// Calculate median (50th percentile)
const median = wasmModule.calculate_percentile(songCounts, 0.5);
console.log(`Median: ${median}`); // => 22.5

// Calculate 90th percentile
const p90 = wasmModule.calculate_percentile(songCounts, 0.9);
console.log(`90th percentile: ${p90}`); // => 450
```

**Implementation Details**:
- Uses linear interpolation: `index = percentile × (length - 1)`
- Rounds index to nearest integer
- Returns value at calculated index
- No sorting performed (assumes pre-sorted input)

**Error Handling**:
- Empty array returns `0.0`
- Percentile outside 0.0-1.0 is clamped to valid range
- Invalid array indices are clamped to bounds

**Important**: Input array MUST be sorted ascending. Unsorted input will produce incorrect results.

---

## Module Loading

### WasmRuntime

Singleton runtime for lazy-loading WASM modules with automatic feature detection.

**Example**:
```javascript
import { WasmRuntime } from '$lib/wasm/loader.js';

// Check availability before loading
const available = await WasmRuntime.isAvailable();
if (!available) {
  console.warn('WebAssembly not supported');
  // Fall back to JavaScript implementation
}

// Load module (cached after first load)
const wasmModule = await WasmRuntime.load();

// Use functions
const result = wasmModule.aggregate_by_year(years);
```

**Methods**:

#### isAvailable()

Check if WebAssembly is supported in the current browser.

**Signature**: `async isAvailable(): Promise<boolean>`

**Returns**: `true` if WebAssembly is supported and functional

**Caching**: Result is cached to avoid repeated checks

---

#### load()

Load the WASM aggregations module (lazy, cached).

**Signature**: `async load(): Promise<WasmAggregationsModule>`

**Returns**: WASM module with all exported functions

**Behavior**:
- First call: Downloads and initializes WASM module
- Subsequent calls: Returns cached module
- Concurrent calls: Shares single loading promise (no duplicate loads)

**Error Handling**:
- Throws if WebAssembly not available
- Throws if module fails to load
- Safe to retry after failure

---

#### unload()

Unload WASM module and clear cache (for testing/cleanup).

**Signature**: `unload(): void`

**Use Cases**:
- Test cleanup between test cases
- Memory management in long-running apps
- Forcing module reload after update

---

## Type Definitions

```javascript
/**
 * @typedef {Object} WasmAggregationsModule
 * @property {function(Uint32Array): Map<number, number>} aggregate_by_year
 * @property {function(Array): Map<number, number>} unique_songs_per_year
 * @property {function(Float64Array, number): number} calculate_percentile
 */
```

---

## Integration with 3-Tier Compute Pipeline

The WASM module integrates with the DMB Almanac 3-tier compute pipeline:

**GPU** → **WASM** → **JavaScript**

```javascript
import { ComputeOrchestrator } from '$lib/gpu/fallback.js';

// Automatic backend selection
const { result, backend, timeMs } = await ComputeOrchestrator.aggregateByYear(shows);

console.log(`Used ${backend} backend in ${timeMs}ms`);
// backend: 'webgpu' | 'wasm' | 'javascript'
```

**Selection Logic**:
1. Try WebGPU (fastest, 8-15ms for large datasets)
2. Fall back to WASM if GPU unavailable (35-50ms)
3. Fall back to JavaScript if WASM unavailable (200-350ms)

---

## Browser Compatibility

**Supported Browsers**:
- Chrome 89+ (March 2021)
- Firefox 89+ (June 2021)
- Safari 15+ (September 2021)
- Edge 89+ (March 2021)

**Feature Detection**:
```javascript
const available = await WasmRuntime.isAvailable();
if (!available) {
  // Use pure JavaScript fallback
}
```

**Mobile Support**:
- iOS 15+ (Safari)
- Android Chrome 89+
- Samsung Internet 15+

---

## Build Information

**Rust Version**: 1.70+
**wasm-bindgen**: 0.2
**Binary Size**: ~19KB (optimized with wasm-opt -Oz)
**Compression**: ~7KB gzipped

**Build Command**:
```bash
./scripts/build-wasm.sh
```

See `WASM_PERFORMANCE_GUIDE.md` for benchmarks and optimization details.
