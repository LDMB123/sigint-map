# Week 6 Implementation Plan: WASM Performance Functions

**Date**: January 29, 2026
**Focus**: Rust/WASM statistical aggregation functions
**Approach**: Parallel Sonnet 4.5 agents for maximum efficiency
**Target**: 5-10x speedup over JavaScript (baseline), competitive with GPU

---

## Overview

Week 6 expands the Rust/WASM aggregations module with **5 critical statistical functions** that complement the existing GPU compute pipeline. While GPU provides 15-40x speedup, WASM targets 5-10x as a reliable middle tier.

### Architecture Context

**Current State** (Weeks 1-5):
- ✅ GPU compute infrastructure (device, histogram, multi-field, telemetry)
- ✅ WASM toolchain and loader (`WasmRuntime`)
- ✅ Basic WASM histogram (`aggregate_by_year`) - 1 function
- ✅ 3-tier fallback orchestrator (GPU → WASM → JavaScript)
- ✅ Buffer pooling, pre-compilation, JavaScript optimization

**Week 6 Goal**:
- Add 4 new WASM statistical functions
- Comprehensive test coverage (50+ tests)
- Integration with existing compute pipeline
- Performance validation (5-10x vs JavaScript)

---

## Parallel Agent Strategy

### Agent Assignments (Sonnet 4.5)

**Agent 1: Rust Core Functions** (`rust-wasm-core-agent`)
- Implement 4 new Rust functions in `rust/aggregations/src/`
- Focus: unique counting, top-N queries, percentile calculations
- Output: Pure Rust implementations with wasm-bindgen exports

**Agent 2: WASM Integration** (`wasm-integration-agent`)
- Update WASM loader to expose new functions
- Add TypeScript type definitions
- Integrate with existing `ComputeOrchestrator`
- Output: JavaScript wrappers and integration code

**Agent 3: Test Infrastructure** (`wasm-test-agent`)
- Create comprehensive test suite for all WASM functions
- Performance regression tests
- Cross-browser compatibility tests
- Output: 50+ tests with 100% coverage

**Agent 4: Documentation** (`wasm-docs-agent`)
- API reference for all WASM functions
- Performance benchmarks and comparisons
- Integration examples
- Output: Developer guide and usage examples

---

## Functions to Implement

### 1. Unique Songs Per Year ✨ **NEW**

**Signature**:
```rust
#[wasm_bindgen]
pub fn unique_songs_per_year(setlists: &[Setlist]) -> js_sys::Map
```

**Purpose**: Count unique songs performed each year

**Performance Target**:
- JavaScript baseline: ~10-15ms for 2,800 shows
- WASM target: ~2-3ms (5x faster)

**Algorithm**:
- HashMap<year, HashSet<song_id>> for efficient deduplication
- SIMD-friendly iteration
- Minimal JS interop overhead

---

### 2. Top Songs (All-Time) ✨ **NEW**

**Signature**:
```rust
#[wasm_bindgen]
pub fn top_songs_all_time(setlists: &[Setlist], limit: usize) -> js_sys::Array
```

**Purpose**: Get N most-performed songs across all years

**Performance Target**:
- JavaScript baseline: ~15-20ms for 2,800 shows
- WASM target: ~3-4ms (5x faster)

**Algorithm**:
- HashMap<song_id, count> for frequency counting
- Partial sort (top-k heap) instead of full sort
- Return top N without materializing full sorted list

---

### 3. Song Debut Calculator ✨ **NEW**

**Signature**:
```rust
#[wasm_bindgen]
pub fn calculate_song_debuts(setlists: &[Setlist]) -> js_sys::Map
```

**Purpose**: Find first performance date for each song

**Performance Target**:
- JavaScript baseline: ~8-12ms for 2,800 shows
- WASM target: ~1.5-2.5ms (5x faster)

**Algorithm**:
- HashMap<song_id, earliest_date> with single pass
- Date comparison in Rust (faster than JS Date objects)

---

### 4. Percentile Calculator ✨ **NEW**

**Signature**:
```rust
#[wasm_bindgen]
pub fn calculate_percentile(values: &[f64], percentile: f64) -> f64
```

**Purpose**: Calculate percentile (median, p95, etc.) for metrics

**Performance Target**:
- JavaScript baseline: ~5-8ms for 2,800 values
- WASM target: ~1-1.5ms (5-8x faster)

**Algorithm**:
- Quickselect algorithm (O(n) average case)
- Faster than full sort (O(n log n))
- Minimal memory allocation

---

### 5. Enhanced Histogram (Multi-Field) ✨ **NEW**

**Signature**:
```rust
#[wasm_bindgen]
pub fn aggregate_multi_field(
    years: &[u32],
    venues: &[u32],
    songs: &[u32]
) -> js_sys::Object
```

**Purpose**: Multi-dimensional aggregation (year × venue × song)

**Performance Target**:
- JavaScript baseline: ~800-1000ms for 3 fields
- WASM target: ~100-150ms (8-10x faster)

**Algorithm**:
- Parallel histogram computation
- Struct-of-arrays layout for cache efficiency
- Bulk JS interop (single object return)

---

## File Structure

```
rust/
├── aggregations/
│   ├── src/
│   │   ├── lib.rs              # UPDATED: New exports
│   │   ├── histogram.rs        # Existing (Week 1-2)
│   │   ├── unique.rs           # NEW: Unique songs
│   │   ├── top_songs.rs        # NEW: Top-N queries
│   │   ├── debuts.rs           # NEW: Song debuts
│   │   ├── percentile.rs       # NEW: Percentile calc
│   │   └── multi_field.rs      # NEW: Multi-dimensional
│   ├── Cargo.toml              # UPDATED: Dependencies
│   └── README.md               # UPDATED: Documentation
│
app/src/lib/wasm/
├── aggregations/
│   ├── index.js                # UPDATED: New exports
│   ├── index_bg.wasm           # REBUILT: Larger binary
│   └── index_bg.wasm.d.ts      # UPDATED: Type defs
├── loader.js                   # UPDATED: New functions
└── README.md                   # UPDATED: API docs

app/tests/wasm/
├── unique.test.js              # NEW: 12 tests
├── top-songs.test.js           # NEW: 10 tests
├── debuts.test.js              # NEW: 8 tests
├── percentile.test.js          # NEW: 15 tests
├── multi-field.test.js         # NEW: 10 tests
└── performance.test.js         # UPDATED: New benchmarks
```

---

## Implementation Plan

### Phase 1: Rust Core Functions (Agent 1)

**Duration**: 1-2 hours

**Tasks**:
1. Create `rust/aggregations/src/unique.rs`
   - Implement `unique_songs_per_year()`
   - wasm-bindgen exports
   - Unit tests in Rust

2. Create `rust/aggregations/src/top_songs.rs`
   - Implement `top_songs_all_time()`
   - Heap-based top-k algorithm
   - Unit tests

3. Create `rust/aggregations/src/debuts.rs`
   - Implement `calculate_song_debuts()`
   - Date parsing and comparison
   - Unit tests

4. Create `rust/aggregations/src/percentile.rs`
   - Implement `calculate_percentile()`
   - Quickselect algorithm
   - Unit tests

5. Create `rust/aggregations/src/multi_field.rs`
   - Implement `aggregate_multi_field()`
   - SIMD-friendly layout
   - Unit tests

6. Update `rust/aggregations/src/lib.rs`
   - Export all new functions
   - Re-export from modules

7. Update `rust/aggregations/Cargo.toml`
   - Add dependencies if needed
   - Verify optimization flags

---

### Phase 2: WASM Integration (Agent 2)

**Duration**: 1 hour

**Tasks**:
1. Rebuild WASM binaries
   ```bash
   cd rust/aggregations
   wasm-pack build --target web --out-dir ../../app/src/lib/wasm/aggregations
   ```

2. Update `app/src/lib/wasm/loader.js`
   - Add type definitions for new functions
   - Update `WasmRuntime.load()` to expose new exports
   - Add JSDoc comments

3. Update `app/src/lib/gpu/fallback.js`
   - Add WASM paths for new aggregations
   - Maintain 3-tier fallback pattern
   - Add telemetry tracking

4. Create TypeScript definitions
   - Update `app/src/lib/wasm/aggregations/index_bg.wasm.d.ts`
   - Ensure type safety

---

### Phase 3: Test Infrastructure (Agent 3)

**Duration**: 2 hours

**Tasks**:
1. Create `tests/wasm/unique.test.js` (12 tests)
   - Empty dataset
   - Single year
   - Multiple years
   - Duplicate songs
   - Edge cases (1991-2026 range)

2. Create `tests/wasm/top-songs.test.js` (10 tests)
   - Top 10, top 50, top 100
   - Tie handling
   - Empty dataset
   - Limit validation

3. Create `tests/wasm/debuts.test.js` (8 tests)
   - Single song
   - Multiple debuts
   - Chronological correctness
   - Missing data handling

4. Create `tests/wasm/percentile.test.js` (15 tests)
   - Median (p50)
   - p25, p75, p95, p99
   - Empty array
   - Single value
   - Sorted vs unsorted input

5. Create `tests/wasm/multi-field.test.js` (10 tests)
   - Year × venue
   - Year × song
   - Venue × song
   - 3-way aggregation
   - Empty datasets

6. Update `tests/performance/wasm-regression.test.js`
   - Add benchmarks for all 5 new functions
   - 5x speedup validation
   - Consistency tests

---

### Phase 4: Documentation (Agent 4)

**Duration**: 1 hour

**Tasks**:
1. Create `WASM_API_REFERENCE.md`
   - Function signatures
   - Parameters and return types
   - Usage examples
   - Performance characteristics

2. Create `WASM_PERFORMANCE_GUIDE.md`
   - Benchmarks for all functions
   - JavaScript vs WASM comparisons
   - When to use WASM vs GPU
   - Optimization tips

3. Update `rust/aggregations/README.md`
   - Build instructions
   - Development workflow
   - Rust function documentation

4. Create integration examples
   - Real-world usage in DMB Almanac
   - Combining WASM + GPU
   - Fallback strategies

---

## Performance Targets

### Function-Level Benchmarks

| Function | JavaScript | WASM Target | Speedup | Status |
|----------|-----------|-------------|---------|--------|
| `aggregate_by_year` | 200-350ms | 35-50ms | 5-8x | ✅ Week 1-2 |
| `unique_songs_per_year` | 10-15ms | 2-3ms | 5x | ⏳ Week 6 |
| `top_songs_all_time` | 15-20ms | 3-4ms | 5x | ⏳ Week 6 |
| `calculate_song_debuts` | 8-12ms | 1.5-2.5ms | 5x | ⏳ Week 6 |
| `calculate_percentile` | 5-8ms | 1-1.5ms | 5-8x | ⏳ Week 6 |
| `aggregate_multi_field` | 800-1000ms | 100-150ms | 8-10x | ⏳ Week 6 |

### Binary Size Targets

**Current** (Week 5):
- Raw: 19.30 KB
- Gzipped: 9.12 KB

**Week 6 Target** (5 new functions):
- Raw: ~30 KB (+10.7 KB)
- Gzipped: ~13 KB (+3.88 KB)
- Still acceptable (<15 KB gzipped)

---

## Integration with Existing System

### 3-Tier Fallback Enhancement

```javascript
// Example: Unique songs per year aggregation

async function getUniqueSongsPerYear(shows) {
  // Tier 1: GPU (if available and efficient for this workload)
  // Note: GPU excels at numeric histograms, may not be ideal for string deduplication

  // Tier 2: WASM (fast string handling, HashSet efficiency)
  if (await WasmRuntime.isAvailable()) {
    const wasmModule = await WasmRuntime.load();
    return wasmModule.unique_songs_per_year(shows);
  }

  // Tier 3: JavaScript fallback
  return uniqueSongsPerYearJS(shows);
}
```

### Telemetry Integration

All WASM functions will integrate with `ComputeTelemetry`:

```javascript
const startTime = performance.now();
const result = wasmModule.unique_songs_per_year(shows);
const timeMs = performance.now() - startTime;

ComputeTelemetry.record('uniqueSongsPerYear', 'wasm', timeMs, shows.length);
```

---

## Success Criteria

### Code Quality
- [ ] All Rust code passes `cargo clippy` with no warnings
- [ ] All Rust code formatted with `cargo fmt`
- [ ] All JavaScript follows ESLint rules
- [ ] 100% JSDoc coverage on WASM wrappers

### Testing
- [ ] 65+ tests passing (55 new + 10 existing)
- [ ] 100% code coverage on new functions
- [ ] All performance benchmarks meet 5x targets
- [ ] No regressions in existing tests (244 tests)

### Performance
- [ ] All 5 new functions meet 5-10x speedup targets
- [ ] WASM binary size <15 KB gzipped
- [ ] Load time impact <50ms

### Documentation
- [ ] API reference complete for all functions
- [ ] Performance guide with benchmarks
- [ ] Integration examples tested
- [ ] README updated with build instructions

---

## Risk Assessment

### Low Risk ✅
- Rust implementation (stable, well-tested patterns)
- WASM toolchain (proven in Weeks 1-2)
- Test infrastructure (established patterns)

### Medium Risk ⚠️
- Binary size growth (10 KB → 13 KB)
  - Mitigation: Aggressive optimization flags, tree shaking
- String handling performance (JS ↔ WASM boundary)
  - Mitigation: Minimize conversions, bulk operations

### High Risk ❌
- None identified

---

## Timeline

**Total Duration**: 4-6 hours with parallel agents

| Phase | Duration | Agent | Status |
|-------|----------|-------|--------|
| Rust Core Functions | 1-2h | Agent 1 | ⏳ |
| WASM Integration | 1h | Agent 2 | ⏳ |
| Test Infrastructure | 2h | Agent 3 | ⏳ |
| Documentation | 1h | Agent 4 | ⏳ |

**Parallel Execution**: Phases 1-4 run simultaneously

---

## Next Steps

1. ✅ Week 6 plan created
2. ⏳ Launch 4 Sonnet 4.5 parallel agents
3. ⏳ Implement all 5 WASM functions
4. ⏳ Comprehensive testing (65+ tests)
5. ⏳ Performance validation
6. ⏳ Create Week 6 completion summary

---

**Plan Created**: January 29, 2026 21:30 PST
**Ready to Execute**: ✅ All parallel agents ready
