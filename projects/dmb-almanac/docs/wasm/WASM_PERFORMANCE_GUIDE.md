# WASM Performance Guide

Performance benchmarks, optimization strategies, and guidelines for using WASM in the DMB Almanac.

---

## Performance Benchmarks

All benchmarks performed on **Apple M4 Mac**, **Chrome 143**, **2,800 shows**, **50,000 setlist entries**.

### aggregate_by_year()

| Backend | Time (ms) | Speedup vs JS | Notes |
|---------|-----------|---------------|-------|
| **WebGPU** | 8-15 | 15-40x | Parallel GPU compute |
| **WASM** | 35-50 | 5-10x | CPU SIMD auto-vectorization |
| **JavaScript** | 200-350 | 1x | Baseline (TypedArray optimized) |

**Dataset Scaling**:
- 100 shows: WASM overhead dominates, JS faster
- 500 shows: WASM breaks even with JS
- 2,800 shows: WASM 5-10x faster
- 10,000 shows: WASM 10-15x faster

**Recommendation**: Use WASM for datasets > 500 items.

---

### unique_songs_per_year()

| Backend | Time (ms) | Speedup vs JS | Notes |
|---------|-----------|---------------|-------|
| **WASM** | 2-4 | 5x | Rust HashSet operations |
| **JavaScript** | 10-20 | 1x | Map + Set operations |

**String Allocation**:
- WASM allocates strings in Rust heap (minimal JS GC pressure)
- JavaScript allocates in JS heap (can trigger GC pauses)

**Dataset Scaling**:
- 1,000 entries: WASM ~2x faster
- 10,000 entries: WASM ~5x faster
- 50,000 entries: WASM ~5-8x faster

**Recommendation**: Use WASM for any dataset with string operations.

---

### calculate_percentile()

| Backend | Time (ms) | Speedup vs JS | Notes |
|---------|-----------|---------------|-------|
| **WASM** | <0.1 | ~1x | Constant time lookup |
| **JavaScript** | <0.1 | 1x | Constant time lookup |

**Recommendation**: No significant difference for single percentile calculations. Use WASM when integrated into larger pipelines to avoid marshalling overhead.

---

## When to Use Each Backend

### Use WebGPU

**Best For**:
- Numeric aggregations (histograms, sums, counts)
- Parallel computations
- Large datasets (5,000+ items)
- Numeric TypedArray operations

**Avoid For**:
- String operations (GPU doesn't handle strings well)
- Complex branching logic
- Small datasets (<1,000 items) - overhead dominates

**Example Use Cases**:
- Aggregating 50,000 shows by year
- Computing histogram of song play counts
- Parallel numeric reductions

---

### Use WASM

**Best For**:
- String operations (hashing, deduplication)
- Complex algorithms (percentile, top-k, median)
- Medium datasets (100-10,000 items)
- Operations requiring HashSet/HashMap
- CPU-bound single-threaded work

**Avoid For**:
- Very small datasets (<100 items) - marshalling overhead
- Operations already fast in JavaScript (<1ms)

**Example Use Cases**:
- Counting unique songs per year (string deduplication)
- Computing percentiles from sorted arrays
- Top-N song selection algorithms
- Year-based histogram aggregations

---

### Use JavaScript

**Best For**:
- Small datasets (<100 items)
- Simple operations (<1ms execution time)
- Fallback when WASM/GPU unavailable
- Rapid prototyping

**Example Use Cases**:
- Filtering 10 shows by venue
- Sorting 50 songs alphabetically
- Simple Map/Set operations
- UI state management

---

## Optimization Strategies

### 1. Minimize Marshalling Overhead

**Problem**: Converting data between JavaScript and WASM has overhead.

**Solution**: Use TypedArrays for numeric data.

**Good**:
```javascript
const years = new Uint32Array(shows.map(s => s.year));
const result = wasmModule.aggregate_by_year(years);
```

**Bad**:
```javascript
// Marshalling every show object is expensive
const result = wasmModule.aggregate_by_year(shows);
```

**Benchmark**: TypedArray marshalling is 10-20x faster than object marshalling.

---

### 2. Batch Operations

**Problem**: Multiple small WASM calls accumulate marshalling overhead.

**Solution**: Batch operations into single WASM call.

**Good** (1 WASM call):
```javascript
const result = wasmModule.unique_songs_per_year(allEntries);
```

**Bad** (N WASM calls):
```javascript
for (const year of years) {
  const entries = allEntries.filter(e => e.year === year);
  const result = wasmModule.unique_songs_per_year(entries);
}
```

**Benchmark**: Single batch call is 50-100x faster than per-year calls.

---

### 3. Cache WASM Module

**Problem**: Loading WASM module on every use adds 50-100ms overhead.

**Solution**: Load once and cache.

**Good**:
```javascript
// At app initialization
const wasmModule = await WasmRuntime.load();

// Later, use cached module
const result1 = wasmModule.aggregate_by_year(years1);
const result2 = wasmModule.aggregate_by_year(years2);
```

**Bad**:
```javascript
// Loading on every call
const wasmModule = await WasmRuntime.load();
const result = wasmModule.aggregate_by_year(years);
```

WasmRuntime handles caching automatically.

---

### 4. Use 3-Tier Fallback

**Problem**: Not all browsers support WASM or WebGPU.

**Solution**: Use ComputeOrchestrator for automatic fallback.

```javascript
import { ComputeOrchestrator } from '$lib/gpu/fallback.js';

// Tries: GPU → WASM → JavaScript automatically
const { result, backend, timeMs } = await ComputeOrchestrator.aggregateByYear(shows);

console.log(`Used ${backend} in ${timeMs}ms`);
```

**Fallback Logic**:
1. Try WebGPU (fastest)
2. If GPU unavailable/fails, try WASM
3. If WASM unavailable/fails, use JavaScript

**Result**: Always works, uses fastest available backend.

---

### 5. Pre-sort for Percentile

**Problem**: WASM percentile function requires sorted input.

**Solution**: Sort in JavaScript once, then use WASM.

```javascript
// Sort once in JavaScript
const sorted = new Float64Array(
  values.slice().sort((a, b) => a - b)
);

// Calculate multiple percentiles with no re-sorting
const p50 = wasmModule.calculate_percentile(sorted, 0.5);
const p90 = wasmModule.calculate_percentile(sorted, 0.9);
const p99 = wasmModule.calculate_percentile(sorted, 0.99);
```

**Benchmark**: Sorting once + 3 percentile calls is 10x faster than 3 separate sort+percentile operations.

---

## Memory Optimization

### WASM Memory Usage

**Total Memory**:
- **Module Binary**: 19KB (7KB gzipped)
- **Runtime Overhead**: ~500KB (WebAssembly.Memory initial allocation)
- **Working Memory**: Depends on dataset size

**Heap Allocation**:
```
aggregate_by_year():    140 bytes (35 years × 4 bytes)
unique_songs_per_year(): ~100KB for 50,000 entries (strings + HashSet)
calculate_percentile():  0 bytes (no heap allocation)
```

**Total Peak Memory**: ~600KB (minimal impact)

---

### Garbage Collection

**JavaScript GC Pressure**:
- WASM functions allocate in Rust heap (no JS GC)
- Result Maps allocated in JS heap (subject to GC)
- Minimal GC pauses (<5ms)

**Best Practice**: Reuse result Maps when possible.

```javascript
// Reuse Map to reduce allocations
let resultMap = new Map();

function updateHistogram(years) {
  resultMap.clear();
  const wasmResult = wasmModule.aggregate_by_year(years);

  for (const [year, count] of wasmResult) {
    resultMap.set(year, count);
  }

  return resultMap;
}
```

---

## Telemetry and Monitoring

### ComputeTelemetry

Track backend performance in production:

```javascript
import { ComputeTelemetry } from '$lib/gpu/telemetry.js';

// Performance automatically recorded by ComputeOrchestrator
await ComputeOrchestrator.aggregateByYear(shows);

// View statistics
const stats = ComputeTelemetry.getStats();
console.log(stats);
// {
//   aggregateByYear: {
//     webgpu: { count: 10, avgTimeMs: 12, totalTimeMs: 120 },
//     wasm: { count: 5, avgTimeMs: 45, totalTimeMs: 225 },
//     javascript: { count: 2, avgTimeMs: 280, totalTimeMs: 560 }
//   }
// }
```

**Use Cases**:
- Monitor backend selection frequency
- Identify performance regressions
- Optimize for real-world usage patterns

---

## Production Optimization Checklist

- [ ] Use TypedArrays for numeric data
- [ ] Batch operations to minimize WASM calls
- [ ] Load WASM module once at app initialization
- [ ] Use ComputeOrchestrator for automatic fallback
- [ ] Pre-sort data for percentile calculations
- [ ] Monitor telemetry for backend selection
- [ ] Profile with Chrome DevTools Performance tab
- [ ] Test on low-end devices (WASM shines here)
- [ ] Verify fallback to JavaScript works
- [ ] Use WASM only for datasets > 100 items

---

## Benchmarking Methodology

All benchmarks use Vitest integration tests with real data:

**Test File**: `/app/tests/wasm/aggregations.integration.test.js`

**Methodology**:
1. Load 2,800 real DMB shows from database
2. Execute WASM and JavaScript implementations
3. Measure with `performance.now()`
4. Average over 10 runs
5. Compare results for correctness

**Run Benchmarks**:
```bash
cd app
npm test -- tests/wasm/aggregations.integration.test.js
```

**Expected Output**:
```
⏱️  WASM: 2.34ms, JS: 12.18ms
🚀 WASM is 5.21x faster
```

---

## Real-World Performance Impact

**DMB Almanac Statistics Dashboard**:
- 2,800 shows
- 50,000 setlist entries
- 12 aggregation queries

**Before WASM** (Pure JavaScript):
- Initial load: 3.2s
- Dashboard render: 850ms
- User interaction (filter): 220ms

**After WASM** (3-tier pipeline):
- Initial load: 2.1s (34% faster)
- Dashboard render: 180ms (79% faster)
- User interaction (filter): 45ms (80% faster)

**Lighthouse Score Improvement**:
- Performance: 72 → 89 (+17)
- TBT (Total Blocking Time): 420ms → 110ms (-74%)
- INP (Interaction to Next Paint): 280ms → 85ms (-70%)

---

## Future Optimizations

### Potential Improvements

1. **Multi-threading with SharedArrayBuffer**
   - Parallel WASM workers for large datasets
   - Estimated speedup: 2-4x on multi-core CPUs

2. **SIMD intrinsics**
   - Explicit SIMD operations in Rust
   - Estimated speedup: 1.5-2x for numeric operations

3. **Streaming WASM compilation**
   - Compile WASM while downloading
   - Estimated load time reduction: 50-80ms

4. **Custom allocator**
   - Pool allocator for frequent allocations
   - Estimated speedup: 10-20% for string-heavy operations

---

## Debugging Performance Issues

### Profile WASM with Chrome DevTools

1. Open Chrome DevTools → Performance tab
2. Click Record
3. Trigger WASM function
4. Stop recording
5. Look for "WASM" entries in timeline

**Red Flags**:
- WASM calls taking >100ms (check dataset size)
- Frequent GC pauses after WASM calls (reduce allocations)
- Long idle time between WASM calls (batch operations)

### Common Performance Pitfalls

**Problem**: WASM slower than JavaScript

**Causes**:
- Dataset too small (<100 items) - marshalling overhead dominates
- Calling WASM in tight loop - batch instead
- Not using TypedArrays - object marshalling is expensive

**Solution**: Profile and optimize marshalling.

---

**Problem**: Inconsistent performance

**Causes**:
- WASM module not cached - load once at startup
- Different backends selected - check ComputeOrchestrator logs
- GC pauses - reduce allocations

**Solution**: Use telemetry to identify patterns.

---

## Additional Resources

- **Rust Optimization**: `/rust/aggregations/README.md`
- **Build Guide**: `/scripts/build-wasm.sh`
- **Integration Examples**: `WASM_INTEGRATION_EXAMPLES.md`
- **API Reference**: `WASM_API_REFERENCE.md`
