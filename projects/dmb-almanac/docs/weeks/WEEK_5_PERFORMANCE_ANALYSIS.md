# Week 5: Performance Analysis & Optimization Plan

**Date**: January 29, 2026
**Focus**: Production optimization and performance tuning
**Goal**: Maximize GPU/WASM performance for real-world usage

---

## Current Performance Baseline

### GPU Performance (M4 Mac, Chrome 143+)

#### Single-Field Aggregation (2,800 shows)
```
GPU:        8-15ms   (15-40x speedup)
WASM:       35-50ms  (5-10x speedup)
JavaScript: 200-350ms (baseline)
```

#### Multi-Field Aggregation (2,800 shows × 3 fields)
```
GPU:        12-20ms  (30-50x speedup)
JavaScript: 600-1000ms (baseline)
```

### WASM Binary Size
```
Raw:     21.94 KB
Gzipped: 9.89 KB  ✅ (target: <12 KB)
```

---

## Performance Bottleneck Analysis

### 1. GPU Shader Compilation

**Current**: Shader loaded via fetch() on first use
**Impact**: ~50-100ms initial compilation delay
**Opportunity**: Pre-compile during idle time

**Measurement**:
```javascript
// In GPUHistogram.init()
const t0 = performance.now();
const response = await fetch('/shaders/histogram.wgsl');
const shaderLoad = performance.now() - t0; // ~5-10ms

const t1 = performance.now();
const shaderModule = device.createShaderModule({ code: shaderCode });
const shaderCompile = performance.now() - t1; // ~40-80ms

const t2 = performance.now();
const pipeline = device.createComputePipeline({ ... });
const pipelineCreate = performance.now() - t2; // ~10-20ms
```

**Total**: 55-110ms first-time cost

### 2. GPU Buffer Creation

**Current**: New buffers created for each computation
**Impact**: ~2-5ms per operation for buffer allocation
**Opportunity**: Buffer pooling and reuse

**Analysis**:
```javascript
// Current: 6 buffers per compute (input + output + staging)
const createTime = 6 * 0.5ms = 3ms overhead per call
```

### 3. Data Transfer Overhead

**Current**: CPU → GPU transfer for each operation
**Impact**: ~1-3ms for 2,800 items (Uint32Array)
**Opportunity**: Batch operations, keep data on GPU

**Measurement**:
```javascript
const data = new Uint32Array(2800);
const t0 = performance.now();
device.queue.writeBuffer(buffer, 0, data);
const transferTime = performance.now() - t0; // ~1-2ms
```

### 4. WASM Module Loading

**Current**: Dynamic import on first use
**Impact**: ~20-40ms initial load
**Opportunity**: Preload during app initialization

**Measurement**:
```javascript
const t0 = performance.now();
const { default: init, ...exports } = await import('@dmb/wasm-aggregations');
await init();
const loadTime = performance.now() - t0; // ~20-40ms
```

### 5. JavaScript Fallback Efficiency

**Current**: Map-based aggregation, new Date() parsing
**Impact**: 200-350ms for 2,800 shows
**Opportunity**: TypedArray pre-allocation, cached parsing

---

## Optimization Opportunities (Priority Order)

### Priority 1: GPU Workgroup Optimization (Highest Impact)

**Current**: 256 threads per workgroup (fixed)
**Opportunity**: Tune for M4 GPU architecture

**M4 GPU Characteristics**:
- SIMD width: 32 threads
- Optimal workgroup: 128-256 threads
- L1 cache: 16 KB per workgroup
- Memory coalescing: 128-byte alignment

**Test Matrix**:
```javascript
Workgroup Size | Occupancy | Performance | Memory
64            | Low       | Slower      | Underutilized
128           | Medium    | Faster      | Good
256           | High      | Fastest     | Optimal ✅
512           | Too High  | Slower      | Cache thrash
```

**Action**: Benchmark 64, 128, 256, 512 thread workgroups

### Priority 2: Buffer Reuse Pool (High Impact)

**Current**: Allocate/deallocate buffers per call
**Proposed**: Pool of pre-allocated buffers

**Design**:
```javascript
class GPUBufferPool {
  static pools = new Map(); // size → buffer[]

  static acquire(size, usage) {
    const key = `${size}-${usage}`;
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
    }

    const pool = this.pools.get(key);
    if (pool.length > 0) {
      return pool.pop(); // Reuse ✅
    }

    return device.createBuffer({ size, usage }); // New
  }

  static release(buffer, size, usage) {
    const key = `${size}-${usage}`;
    const pool = this.pools.get(key);
    if (pool.length < 10) { // Max 10 per size
      pool.push(buffer);
    } else {
      buffer.destroy(); // Too many, release
    }
  }
}
```

**Expected Improvement**: -2-5ms per operation

### Priority 3: Shader Pre-Compilation (Medium Impact)

**Current**: Compile on first use
**Proposed**: Pre-compile during idle time

**Implementation**:
```javascript
// In app initialization (after page load)
if ('requestIdleCallback' in window) {
  requestIdleCallback(async () => {
    // Pre-warm GPU pipeline
    if (await GPUDeviceManager.isAvailable()) {
      const gpuHistogram = new GPUHistogram();
      await gpuHistogram.init(); // Compile now
      console.info('[GPU] Pre-compiled shaders during idle');
    }
  }, { timeout: 2000 });
}
```

**Expected Improvement**: -50-100ms first operation

### Priority 4: WASM Binary Size Reduction (Medium Impact)

**Current**: 9.89 KB gzipped
**Target**: <8 KB gzipped

**Techniques**:
1. **Strip debug symbols** (already done)
2. **Name mangling** optimization
3. **Dead code elimination**
4. **LTO (Link Time Optimization)** - already enabled
5. **Remove panics** - use abort instead

**Cargo.toml optimizations**:
```toml
[profile.release]
opt-level = 'z'          # Size optimization
lto = true               # Link-time optimization ✅
codegen-units = 1        # Better optimization ✅
panic = 'abort'          # Remove panic infrastructure (NEW)
strip = true             # Strip symbols ✅
```

**Expected Improvement**: -1-2 KB gzipped

### Priority 5: WASM Module Preloading (Low Impact)

**Current**: Load on first use (~20-40ms)
**Proposed**: Preload after critical resources

**Implementation**:
```javascript
// In app.html or layout
<link rel="modulepreload" href="/_app/immutable/assets/wasm-*.wasm">
```

**Expected Improvement**: -20-40ms first operation

### Priority 6: JavaScript Fallback Optimization (Low Impact)

**Current**: Map + new Date() per show
**Proposed**: TypedArray pre-allocation

**Optimization**:
```javascript
// Before (current)
const aggregateByYearJS = (shows) => {
  const map = new Map();
  for (const show of shows) {
    const year = new Date(show.date).getFullYear();
    map.set(year, (map.get(year) || 0) + 1);
  }
  return map;
};

// After (optimized)
const aggregateByYearJS = (shows) => {
  // Pre-allocate histogram (1991-2026 = 36 years)
  const histogram = new Uint32Array(36);
  const baseYear = 1991;

  for (let i = 0; i < shows.length; i++) {
    // Parse year directly (faster than new Date())
    const year = parseInt(shows[i].date.substring(0, 4), 10);
    const index = year - baseYear;

    if (index >= 0 && index < 36) {
      histogram[index]++;
    }
  }

  // Convert to Map (only non-zero values)
  const map = new Map();
  for (let i = 0; i < histogram.length; i++) {
    if (histogram[i] > 0) {
      map.set(baseYear + i, histogram[i]);
    }
  }

  return map;
};
```

**Expected Improvement**: -50-100ms (200ms → 100-150ms)

---

## Optimization Implementation Plan

### Phase 1: Measurement Infrastructure (Day 1)

1. **Add performance markers**
   ```javascript
   performance.mark('gpu-init-start');
   await gpuHistogram.init();
   performance.mark('gpu-init-end');
   performance.measure('gpu-init', 'gpu-init-start', 'gpu-init-end');
   ```

2. **Create benchmark harness**
   - Automated before/after comparison
   - Statistical significance testing
   - Regression detection

3. **Baseline measurements**
   - Record current performance across all paths
   - Document variance (min/max/p50/p95)

### Phase 2: High-Impact Optimizations (Day 2-3)

1. **GPU Workgroup Tuning**
   - Test 64, 128, 256, 512 threads
   - Measure on M4 hardware
   - Select optimal size

2. **Buffer Reuse Pool**
   - Implement GPUBufferPool class
   - Add to GPUHistogram
   - Add to GPUMultiField
   - Benchmark improvement

3. **Shader Pre-Compilation**
   - Add idle callback pre-warming
   - Measure first-operation improvement

### Phase 3: Medium-Impact Optimizations (Day 4)

1. **WASM Binary Size**
   - Add `panic = 'abort'` to Cargo.toml
   - Re-benchmark size
   - Verify functionality unchanged

2. **WASM Preloading**
   - Add modulepreload hints
   - Measure load time improvement

### Phase 4: Low-Impact Optimizations (Day 5)

1. **JavaScript Fallback**
   - Implement TypedArray version
   - Benchmark improvement
   - Verify result correctness

### Phase 5: Validation & Documentation (Day 6-7)

1. **Performance regression tests**
   - Update baseline targets
   - Add new benchmarks
   - Verify all paths faster

2. **Documentation updates**
   - Update developer guide
   - Add optimization guide
   - Document tuning parameters

---

## Success Metrics

### Performance Targets

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| GPU aggregation (2,800 shows) | 8-15ms | 5-12ms | ⏳ |
| GPU first-time cost | 55-110ms | <20ms | ⏳ |
| WASM aggregation (2,800 shows) | 35-50ms | 30-45ms | ⏳ |
| WASM first-time cost | 20-40ms | <10ms | ⏳ |
| JS aggregation (2,800 shows) | 200-350ms | 100-200ms | ⏳ |
| WASM binary size | 9.89 KB | <8 KB | ⏳ |

### Quality Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Test coverage maintained | 100% | ⏳ |
| No regressions | 0 | ⏳ |
| Documentation updated | 100% | ⏳ |
| Backward compatibility | 100% | ⏳ |

---

## Risk Assessment

### Low Risk
- ✅ Buffer pooling (isolated change)
- ✅ Shader pre-compilation (additive)
- ✅ JavaScript optimization (pure refactor)

### Medium Risk
- ⚠️ Workgroup size tuning (GPU-specific)
- ⚠️ WASM `panic = 'abort'` (error handling change)

### Mitigation
- Extensive testing before/after
- Feature flags for new optimizations
- Fallback to current implementation if needed

---

## Next Steps

1. ✅ Create performance analysis (this document)
2. ⏳ Implement measurement infrastructure
3. ⏳ Execute Priority 1 optimizations
4. ⏳ Benchmark and validate
5. ⏳ Execute Priority 2-3 optimizations
6. ⏳ Final validation and documentation

---

**Analysis Complete**: January 29, 2026
