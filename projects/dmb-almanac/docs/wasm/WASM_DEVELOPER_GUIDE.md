# WASM Developer Guide

Complete guide for developers working with WASM in the DMB Almanac.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Development Workflow](#development-workflow)
4. [Testing Strategy](#testing-strategy)
5. [Performance Profiling](#performance-profiling)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Start

### 1. Install Dependencies

```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# wasm-pack
cargo install wasm-pack

# Add WASM target
rustup target add wasm32-unknown-unknown
```

### 2. Build WASM Module

```bash
# From project root
./scripts/build-wasm.sh
```

**Output**: WASM binary at `/app/src/lib/wasm/aggregations/index_bg.wasm`

### 3. Run Tests

```bash
cd app
npm test -- tests/wasm/
```

### 4. Use in Code

```javascript
import { WasmRuntime } from '$lib/wasm/loader.js';

const wasmModule = await WasmRuntime.load();
const result = wasmModule.aggregate_by_year(years);
```

**Done!** You're ready to use WASM.

---

## Architecture Overview

### 3-Tier Compute Pipeline

```
┌─────────────────────────────────────────┐
│         User Request (Svelte)           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      ComputeOrchestrator                │
│  (Automatic backend selection)          │
└─┬─────────────┬────────────────────┬────┘
  │             │                    │
  │ Try GPU     │ Try WASM          │ Fallback JS
  ▼             ▼                    ▼
┌────────┐  ┌────────┐         ┌──────────┐
│ WebGPU │  │  WASM  │         │JavaScript│
│ Shader │  │ (Rust) │         │(Fallback)│
└────────┘  └────────┘         └──────────┘
  │             │                    │
  └─────────────┴────────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │    Result    │
         │  + Telemetry │
         └──────────────┘
```

### File Structure

```
projects/dmb-almanac/
├── rust/
│   └── aggregations/          # Rust source code
│       ├── Cargo.toml         # Rust dependencies
│       └── src/
│           └── lib.rs         # WASM functions
├── app/
│   ├── src/lib/
│   │   ├── wasm/
│   │   │   ├── loader.js      # WASM runtime loader
│   │   │   └── aggregations/  # Generated WASM output
│   │   │       ├── index.js
│   │   │       └── index_bg.wasm
│   │   └── gpu/
│   │       └── fallback.js    # 3-tier orchestrator
│   └── tests/
│       └── wasm/              # Integration tests
│           ├── loader.test.js
│           └── aggregations.integration.test.js
├── scripts/
│   └── build-wasm.sh          # Build automation
└── docs/
    ├── WASM_API_REFERENCE.md
    ├── WASM_PERFORMANCE_GUIDE.md
    └── WASM_INTEGRATION_EXAMPLES.md
```

---

## Development Workflow

### Adding a New WASM Function

#### Step 1: Write Rust Implementation

**File**: `rust/aggregations/src/lib.rs`

```rust
use wasm_bindgen::prelude::*;

/// Calculate song frequency distribution
///
/// # Arguments
/// * `song_ids` - Array of song IDs
///
/// # Returns
/// JavaScript Map with songId -> count
#[wasm_bindgen]
pub fn song_frequency(song_ids: &[u32]) -> js_sys::Map {
    use std::collections::HashMap;

    let mut counts: HashMap<u32, u32> = HashMap::new();

    for &id in song_ids {
        *counts.entry(id).or_insert(0) += 1;
    }

    // Convert to JavaScript Map
    let result = js_sys::Map::new();
    for (id, count) in counts {
        result.set(&JsValue::from(id), &JsValue::from(count));
    }

    result
}
```

#### Step 2: Add Rust Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_song_frequency() {
        let ids = vec![1, 2, 1, 3, 2, 1];
        let result = song_frequency(&ids);

        assert_eq!(result.size(), 3);
        // Test that song 1 appears 3 times
        assert_eq!(
            result.get(&JsValue::from(1)).as_f64().unwrap() as u32,
            3
        );
    }
}
```

Run tests:
```bash
cd rust/aggregations
cargo test
```

#### Step 3: Rebuild WASM

```bash
./scripts/build-wasm.sh
```

#### Step 4: Update Type Definitions

**File**: `app/src/lib/wasm/loader.js`

```javascript
/**
 * @typedef {Object} WasmAggregationsModule
 * @property {function(Uint32Array): Map<number, number>} aggregate_by_year
 * @property {function(Array): Map<number, number>} unique_songs_per_year
 * @property {function(Float64Array, number): number} calculate_percentile
 * @property {function(Uint32Array): Map<number, number>} song_frequency  // NEW
 */
```

#### Step 5: Add Integration Tests

**File**: `app/tests/wasm/aggregations.integration.test.js`

```javascript
describe('song_frequency()', () => {
  it('should count song occurrences', async () => {
    if (!wasmModule) return;

    const songIds = new Uint32Array([1, 2, 1, 3, 2, 1]);
    const result = wasmModule.song_frequency(songIds);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(3);
    expect(result.get(1)).toBe(3);
    expect(result.get(2)).toBe(2);
    expect(result.get(3)).toBe(1);
  });
});
```

Run tests:
```bash
cd app
npm test -- tests/wasm/aggregations.integration.test.js
```

#### Step 6: Document

Add to `WASM_API_REFERENCE.md`:

```markdown
### song_frequency()

Count occurrences of each song in a setlist.

**Signature**: `song_frequency(song_ids: Uint32Array): Map<number, number>`

**Performance**: 5x faster than JavaScript for 10,000+ songs

**Example**:
\`\`\`javascript
const wasmModule = await WasmRuntime.load();
const songIds = new Uint32Array([1, 2, 1, 3, 2, 1]);
const result = wasmModule.song_frequency(songIds);
// Map { 1 => 3, 2 => 2, 3 => 1 }
\`\`\`
```

#### Step 7: Integrate into App

```javascript
// In your Svelte component
import { WasmRuntime } from '$lib/wasm/loader.js';

async function computeSongFrequency(entries) {
  const wasmModule = await WasmRuntime.load();

  const songIds = new Uint32Array(entries.map(e => e.songId));
  const result = wasmModule.song_frequency(songIds);

  return result;
}
```

---

## Testing Strategy

### 3 Levels of Testing

#### 1. Rust Unit Tests

**Location**: `rust/aggregations/src/lib.rs`

**Purpose**: Test Rust logic in isolation (fast, no JavaScript)

**Run**:
```bash
cd rust/aggregations
cargo test
```

**Example**:
```rust
#[test]
fn test_empty_input() {
    let empty = vec![];
    let result = aggregate_by_year(&empty);
    assert_eq!(result.size(), 0);
}
```

#### 2. JavaScript Integration Tests

**Location**: `app/tests/wasm/`

**Purpose**: Test WASM ↔ JavaScript interop with real data

**Run**:
```bash
cd app
npm test -- tests/wasm/
```

**Example**:
```javascript
it('should handle 2,800 shows', async () => {
  const years = new Uint32Array(2800);
  for (let i = 0; i < 2800; i++) {
    years[i] = 1991 + (i % 35);
  }

  const result = wasmModule.aggregate_by_year(years);
  expect(result.size).toBe(35);
});
```

#### 3. End-to-End Tests

**Location**: `app/tests/e2e/`

**Purpose**: Test full user workflows with WASM

**Run**:
```bash
npm run test:e2e
```

### Performance Tests

**Location**: `app/tests/wasm/aggregations.integration.test.js`

**Example**:
```javascript
it('should be faster than JavaScript', async () => {
  if (!wasmModule) return;

  const years = new Uint32Array(2800);
  for (let i = 0; i < 2800; i++) {
    years[i] = 1991 + (i % 35);
  }

  // WASM version
  const wasmStart = performance.now();
  const wasmResult = wasmModule.aggregate_by_year(years);
  const wasmTime = performance.now() - wasmStart;

  // JavaScript version
  const jsStart = performance.now();
  const jsResult = new Map();
  for (const year of years) {
    if (year >= 1991 && year <= 2026) {
      jsResult.set(year, (jsResult.get(year) || 0) + 1);
    }
  }
  const jsTime = performance.now() - jsStart;

  console.log(`WASM: ${wasmTime.toFixed(2)}ms, JS: ${jsTime.toFixed(2)}ms`);

  if (wasmTime < jsTime) {
    console.log(`🚀 WASM is ${(jsTime / wasmTime).toFixed(2)}x faster`);
  }
});
```

---

## Performance Profiling

### Chrome DevTools

1. Open DevTools → Performance tab
2. Click Record
3. Trigger WASM function
4. Stop recording
5. Analyze timeline

**Look for**:
- WASM execution time (should be <50ms for typical datasets)
- JavaScript → WASM marshalling overhead
- GC pauses after WASM calls

### ComputeTelemetry

Monitor backend selection and performance in production:

```javascript
import { ComputeTelemetry } from '$lib/gpu/telemetry.js';

// After operations
const stats = ComputeTelemetry.getStats();
console.log(stats);

// Example output:
// {
//   aggregateByYear: {
//     webgpu: { count: 10, avgTimeMs: 12 },
//     wasm: { count: 5, avgTimeMs: 45 },
//     javascript: { count: 2, avgTimeMs: 280 }
//   }
// }
```

### Benchmarking Script

Create custom benchmarks:

```javascript
// app/scripts/benchmark-wasm.js
import { WasmRuntime } from '../src/lib/wasm/loader.js';

async function benchmark() {
  const wasmModule = await WasmRuntime.load();

  const sizes = [100, 500, 1000, 2800, 10000];

  for (const size of sizes) {
    const years = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      years[i] = 1991 + (i % 35);
    }

    const start = performance.now();
    wasmModule.aggregate_by_year(years);
    const time = performance.now() - start;

    console.log(`${size} items: ${time.toFixed(2)}ms`);
  }
}

benchmark();
```

Run:
```bash
node app/scripts/benchmark-wasm.js
```

---

## Deployment

### Build for Production

```bash
# Build optimized WASM
./scripts/build-wasm.sh

# Build Svelte app
cd app
npm run build
```

**Output**:
- WASM binary: `app/build/_app/immutable/chunks/index_bg-[hash].wasm`
- Gzipped: ~7KB

### CDN Optimization

WASM binaries are automatically code-split by Vite and served as separate chunks.

**Verify**:
```bash
ls -lh app/build/_app/immutable/chunks/*.wasm
```

### Browser Caching

WASM binaries are fingerprinted with content hash:
```
index_bg-a7f3c2d1.wasm
```

**Cache headers** (automatic with Vite):
```
Cache-Control: public, max-age=31536000, immutable
```

### Monitoring

Track WASM usage in production:

```javascript
// In app
import { ComputeTelemetry } from '$lib/gpu/telemetry.js';

// Send telemetry to analytics
setInterval(() => {
  const stats = ComputeTelemetry.getStats();

  // Send to your analytics service
  analytics.track('wasm_performance', {
    backend_usage: stats,
    timestamp: Date.now()
  });
}, 60000); // Every minute
```

---

## Troubleshooting

### WASM Module Won't Load

**Error**: `Failed to load aggregations module`

**Causes**:
1. Module not built
2. Wrong path
3. Browser doesn't support WASM

**Solutions**:
```bash
# Rebuild module
./scripts/build-wasm.sh

# Check file exists
ls app/src/lib/wasm/aggregations/index_bg.wasm

# Check browser support
const available = await WasmRuntime.isAvailable();
console.log('WASM available:', available);
```

---

### Performance Slower Than Expected

**Symptoms**: WASM slower than JavaScript

**Causes**:
1. Development build (not optimized)
2. Small dataset (overhead dominates)
3. Frequent marshalling

**Solutions**:
```bash
# Ensure release build
wasm-pack build --release

# Check binary size (should be ~19KB)
ls -lh app/src/lib/wasm/aggregations/index_bg.wasm

# Profile with DevTools
# Look for excessive marshalling overhead
```

---

### Type Errors in JavaScript

**Error**: `wasmModule.my_function is not a function`

**Causes**:
1. Function not exported with `#[wasm_bindgen]`
2. Module not rebuilt after changes
3. Type definition out of sync

**Solutions**:
```rust
// Ensure function is exported
#[wasm_bindgen]
pub fn my_function() { ... }
```

```bash
# Rebuild
./scripts/build-wasm.sh
```

```javascript
// Update type definition in loader.js
```

---

### Memory Issues

**Error**: Out of memory or slow GC

**Causes**:
1. Large result Maps not cleaned up
2. Repeated WASM calls in tight loop
3. Memory leaks

**Solutions**:
```javascript
// Reuse Maps to reduce allocations
let resultMap = new Map();

function compute(data) {
  resultMap.clear();
  const wasmResult = wasmModule.aggregate_by_year(data);

  for (const [key, val] of wasmResult) {
    resultMap.set(key, val);
  }

  return resultMap;
}

// Batch operations instead of loops
// Bad: N WASM calls
for (const item of items) {
  wasmModule.process(item);
}

// Good: 1 WASM call
wasmModule.process_batch(items);
```

---

## Best Practices

### DO

✅ **Load WASM once** at app initialization
```javascript
// Good: Load once
const wasmModule = await WasmRuntime.load();
const result1 = wasmModule.aggregate_by_year(data1);
const result2 = wasmModule.aggregate_by_year(data2);
```

✅ **Use ComputeOrchestrator** for automatic fallback
```javascript
const { result, backend } = await ComputeOrchestrator.aggregateByYear(shows);
```

✅ **Use TypedArrays** for numeric data
```javascript
const years = new Uint32Array(shows.map(s => s.year));
```

✅ **Batch operations** to minimize calls
```javascript
const result = wasmModule.unique_songs_per_year(allEntries);
```

✅ **Provide JavaScript fallback**
```javascript
if (await WasmRuntime.isAvailable()) {
  return computeWithWasm(data);
} else {
  return computeWithJS(data);
}
```

✅ **Profile in production** with telemetry
```javascript
const stats = ComputeTelemetry.getStats();
```

✅ **Test on real data** from database
```javascript
const shows = await db.shows.toArray();
```

### DON'T

❌ **Don't load WASM on every call**
```javascript
// Bad: Loading overhead on every call
async function compute(data) {
  const wasmModule = await WasmRuntime.load(); // Slow!
  return wasmModule.aggregate_by_year(data);
}
```

❌ **Don't use WASM for tiny datasets**
```javascript
// Bad: Overhead > savings
const result = wasmModule.aggregate_by_year(new Uint32Array([1991, 1992]));
```

❌ **Don't call WASM in tight loops**
```javascript
// Bad: Marshalling overhead accumulates
for (const year of years) {
  wasmModule.process_single_year(year); // N calls
}
```

❌ **Don't ignore errors**
```javascript
// Bad: Silent failure
const wasmModule = await WasmRuntime.load();

// Good: Handle errors
try {
  const wasmModule = await WasmRuntime.load();
} catch (e) {
  console.error('WASM failed to load:', e);
  // Fall back to JavaScript
}
```

❌ **Don't skip JavaScript fallback**
```javascript
// Bad: Breaks on browsers without WASM
const wasmModule = await WasmRuntime.load();
return wasmModule.aggregate_by_year(data);

// Good: Always provide fallback
if (await WasmRuntime.isAvailable()) {
  const wasmModule = await WasmRuntime.load();
  return wasmModule.aggregate_by_year(data);
} else {
  return aggregateByYearJS(data);
}
```

---

## Additional Resources

### Documentation
- **API Reference**: `/WASM_API_REFERENCE.md`
- **Performance Guide**: `/WASM_PERFORMANCE_GUIDE.md`
- **Integration Examples**: `/WASM_INTEGRATION_EXAMPLES.md`
- **Rust README**: `/rust/aggregations/README.md`

### External Resources
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)

### Tools
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [wasm-opt](https://github.com/WebAssembly/binaryen)
- [Rust Playground](https://play.rust-lang.org/)

---

## Support

**Questions?** Check existing documentation first:
1. `WASM_API_REFERENCE.md` - Function signatures and examples
2. `WASM_PERFORMANCE_GUIDE.md` - Optimization and benchmarks
3. `WASM_INTEGRATION_EXAMPLES.md` - Real-world usage patterns
4. `/rust/aggregations/README.md` - Rust development guide

**Issues?** See [Troubleshooting](#troubleshooting) section above.
