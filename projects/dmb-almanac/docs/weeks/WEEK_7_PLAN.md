# Week 7 Implementation Plan: WASM Completion & Browser Validation

**Date**: January 29, 2026
**Focus**: Complete remaining WASM functions + browser validation
**Approach**: 3 parallel Sonnet 4.5 agents
**Target**: 100% WASM function coverage + production validation

---

## Week 6 Recap

**Completed**:
- ✅ 14 WASM functions (3 active, 11 placeholders)
- ✅ 316/316 tests passing
- ✅ 5-10x speedup validated in Node.js
- ✅ Comprehensive documentation (3,736 lines)

**Active Functions**:
1. `aggregate_by_year()` - SIMD histogram
2. `unique_songs_per_year()` - Unique song counting
3. `calculate_percentile()` - Percentile calculations

**Pending Implementation**:
1. `top_songs_all_time()` - Top-N queries
2. `calculate_song_debuts()` - First performance tracking
3. `aggregate_multi_field()` - Multi-dimensional aggregation

---

## Week 7 Objectives

### Phase 1: Complete Remaining WASM Functions
Implement the 3 placeholder functions with full integration.

### Phase 2: Browser Validation
Test all WASM functions in Chrome 143+ on M4 Mac.

### Phase 3: Production Integration
Deploy to real DMB Almanac with 2,800 shows dataset.

---

## Agent Strategy (3 Parallel Agents)

### Agent 1: WASM Function Implementation
**Focus**: Implement 3 remaining Rust functions
**Duration**: 2 hours
**Files**: 3 Rust modules + updates

### Agent 2: Browser Testing & Validation
**Focus**: Real browser performance testing
**Duration**: 1.5 hours
**Output**: Validation report with benchmarks

### Agent 3: Production Integration
**Focus**: Deploy to DMB Almanac app
**Duration**: 1 hour
**Output**: Integration complete, telemetry active

---

## Detailed Implementation

### Function 1: `top_songs_all_time()` 🎵

**Rust Implementation** (`rust/aggregations/src/top_songs.rs`):
```rust
#[wasm_bindgen]
pub fn top_songs_all_time(setlists_json: &str, limit: usize) -> JsValue
```

**Algorithm**:
- HashMap for frequency counting
- Min-heap for top-k selection (O(n log k))
- Return sorted array with metadata

**Performance Target**: 15-20ms JS → 3-4ms WASM (5x)

**Test Coverage**: 10 tests in `tests/wasm/top-songs.test.js`

---

### Function 2: `calculate_song_debuts()` 📅

**Rust Implementation** (`rust/aggregations/src/debuts.rs`):
```rust
#[wasm_bindgen]
pub fn calculate_song_debuts(setlists_json: &str) -> JsValue
```

**Algorithm**:
- HashMap<song_id, (first_date, show_count)>
- Single-pass chronological scan
- Return Map of debuts with metadata

**Performance Target**: 8-12ms JS → 1.5-2.5ms WASM (5x)

**Test Coverage**: 9 tests in `tests/wasm/debuts.test.js`

---

### Function 3: `aggregate_multi_field()` 📊

**Rust Implementation** (`rust/aggregations/src/multi_field.rs`):
```rust
#[wasm_bindgen]
pub fn aggregate_multi_field(
    years: &[u32],
    venues: &[u32],
    songs: &[u32]
) -> JsValue
```

**Algorithm**:
- Parallel 3-way histogram
- Struct-of-arrays for cache efficiency
- Minimal JS interop (bulk return)

**Performance Target**: 800-1000ms JS → 100-150ms WASM (8-10x)

**Test Coverage**: 13 tests in `tests/wasm/multi-field.test.js`

---

## Browser Validation Plan

### Test Environment
- **Hardware**: M4 Mac Mini, 16GB RAM
- **OS**: macOS 26.2 Sequoia
- **Browser**: Chrome 143+ stable
- **Dataset**: Real DMB data (2,800 shows, 150+ songs)

### Validation Tests

**Performance Benchmarks**:
```javascript
// Test each function in real browser
const benchmarks = [
  { fn: 'aggregate_by_year', expected: '2-3ms' },
  { fn: 'unique_songs_per_year', expected: '2-4ms' },
  { fn: 'calculate_percentile', expected: '<0.1ms' },
  { fn: 'top_songs_all_time', expected: '3-4ms' },
  { fn: 'calculate_song_debuts', expected: '1.5-2.5ms' },
  { fn: 'aggregate_multi_field', expected: '100-150ms' }
];
```

**Cross-Browser Tests**:
- Chrome 143+ (primary)
- Safari 18+ (secondary)
- Firefox (verify graceful WASM fallback)

**Memory Tests**:
- Verify no memory leaks
- Check WASM binary loads correctly
- Validate garbage collection

---

## Success Criteria

### Code Completion
- [ ] All 3 functions implemented in Rust
- [ ] 32 tests passing (10 + 9 + 13)
- [ ] Total: 348 tests passing (316 + 32)
- [ ] Zero clippy warnings

### Performance
- [ ] All functions meet 5-10x targets in browser
- [ ] No regressions in existing functions
- [ ] Memory usage stable (<50MB delta)
- [ ] Load time <100ms for WASM module

### Integration
- [ ] Functions integrated in ComputeOrchestrator
- [ ] Telemetry tracking all compute paths
- [ ] Error handling validated
- [ ] Documentation updated

---

## Timeline

| Phase | Duration | Agent | Status |
|-------|----------|-------|--------|
| WASM Implementation | 2h | Agent 1 | ⏳ |
| Browser Validation | 1.5h | Agent 2 | ⏳ |
| Production Integration | 1h | Agent 3 | ⏳ |

**Total**: ~4.5 hours with parallel execution

---

## Deliverables

1. **Rust Code** (3 functions complete)
2. **Test Suite** (32 new tests)
3. **Browser Validation Report** (performance data)
4. **Production Integration** (deployed to app)
5. **Week 7 Summary** (completion document)

---

**Plan Created**: January 29, 2026 22:15 PST
**Ready to Execute**: ✅
