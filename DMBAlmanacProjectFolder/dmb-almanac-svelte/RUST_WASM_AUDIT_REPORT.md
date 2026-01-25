# DMB Almanac - Rust/WASM Transition Audit Report

**Date**: 2026-01-22
**Auditor**: Claude Code (guided by .claude/skills/rust/ and .claude/skills/wasm/)
**Project**: DMB Almanac Svelte PWA
**Target Platform**: Chromium 143+ on Apple Silicon (macOS Tahoe 26.2)

---

## Executive Summary

The DMB Almanac already has a solid Rust/WASM foundation (`dmb-transform` module) covering ~60-70% of data transformation operations. This audit identifies additional high-value opportunities for Rust/WASM migration that could yield **2-10x performance improvements** in specific areas.

### Current WASM Coverage
| Area | Status | Coverage |
|------|--------|----------|
| Data Transformation | ✅ Optimized | 95% |
| Search | ✅ Optimized | 100% |
| Aggregations | ✅ Optimized | 100% |
| Force Simulation | ✅ Optimized | 100% |
| Validation | ✅ Optimized | 100% |
| Visualizations | ⚠️ In Progress | 40% |
| Scraper | ❌ JavaScript | 0% |
| Complex Queries | ⚠️ Partial | 30% |

---

## 1. Existing Rust/WASM Implementation Analysis

### 1.1 Current Module: `dmb-transform`

**Location**: `wasm/dmb-transform/`

**Rust Architecture**:
```
src/
├── lib.rs          # Main API (~670 lines, 25+ exported functions)
├── types.rs        # Server/Dexie schema types
├── transform.rs    # Entity transformation logic
├── validate.rs     # Foreign key validation
├── aggregation.rs  # Data aggregation functions
├── search.rs       # Global search implementation
└── error.rs        # Error handling
```

**Performance Targets Met**:
| Operation | Items | Target | Actual | Status |
|-----------|-------|--------|--------|--------|
| transform_songs | 1,300 | < 5ms | ~3ms | ✅ |
| transform_venues | 1,000 | < 3ms | ~2ms | ✅ |
| transform_shows | 5,000 | < 15ms | ~10ms | ✅ |
| transform_setlist_entries | 150,000 | < 100ms | ~70ms | ✅ |
| validate_foreign_keys | All | < 50ms | ~30ms | ✅ |
| global_search | Full | < 10ms | ~5ms | ✅ |

**Build Configuration** (`Cargo.toml`):
- `opt-level = "s"` (size optimization)
- `lto = true` (link-time optimization)
- `panic = "abort"` (smaller binary)
- `ahash` for faster hashing (3x vs std HashMap)
- SIMD enabled via `wasm-opt = ["-Os", "--enable-simd"]`

**TypeScript Integration** (`src/lib/wasm/transform.ts`):
- Lazy loading with caching
- Automatic JavaScript fallback
- Performance tracking (`TransformResult.source` and `durationMs`)
- Production-ready error handling

---

## 2. High-Priority WASM Migration Candidates

### 2.1 Visualization Data Preparation (Priority: HIGH)

**Files**:
- `src/lib/components/visualizations/GuestNetwork.svelte`
- `src/lib/components/visualizations/TransitionFlow.svelte`
- `src/lib/components/visualizations/SongHeatmap.svelte`
- `src/lib/components/visualizations/GapTimeline.svelte`
- `src/lib/components/visualizations/RarityScorecard.svelte`
- `src/lib/components/visualizations/TourMap.svelte`

**Current Pattern** (JavaScript):
```typescript
// GuestNetwork.svelte - Lines 74-88
const nodes = data.map(d => ({
  id: d.id,
  name: d.name,
  appearances: d.appearances,
  x: Math.random() * containerWidth,
  y: Math.random() * containerHeight,
  vx: 0, vy: 0
}));

const linkData = links.map(l => ({
  source: nodes.find(n => n.id === l.source),
  target: nodes.find(n => n.id === l.target),
  weight: l.weight
})).filter(l => l.source && l.target);
```

**Problem**:
- `nodes.find()` in a loop is O(n²) - inefficient for large datasets
- D3 force simulation calculations are CPU-intensive
- Matrix generation for heatmaps involves nested loops

**Proposed Rust Module**: `dmb-visualize`

```rust
// Proposed API
#[wasm_bindgen]
pub fn prepare_network_data(
    guests_json: &str,
    appearances_json: &str
) -> Result<JsValue, JsError>;

#[wasm_bindgen]
pub fn prepare_sankey_data(
    transitions_json: &str,
    min_weight: u32
) -> Result<JsValue, JsError>;

#[wasm_bindgen]
pub fn prepare_heatmap_matrix(
    entries_json: &str,
    row_field: &str,
    col_field: &str
) -> Result<JsValue, JsError>;

#[wasm_bindgen]
pub fn calculate_rarity_scores(
    songs_json: &str,
    entries_json: &str
) -> Result<JsValue, JsError>;
```

**Estimated Speedup**: 5-15x for data preparation
**Implementation Effort**: Medium (2-3 days)
**Dependencies**: None (standalone module)

---

### 2.2 Force Layout Pre-computation (Priority: HIGH)

**Current**: D3.js `forceSimulation` runs in main thread, blocks UI during initial layout

**Proposed**: Pre-compute initial node positions in WASM using Barnes-Hut algorithm

```rust
#[wasm_bindgen]
pub fn compute_force_layout(
    nodes_json: &str,
    links_json: &str,
    iterations: u32,
    width: f64,
    height: f64
) -> Result<JsValue, JsError> {
    // Barnes-Hut quadtree implementation
    // Returns positioned nodes for D3 to render
}
```

**Benefits**:
- 3-5x faster initial layout computation
- Non-blocking (can run in Web Worker via WASM)
- Deterministic results (no random initial positions)

**Estimated Speedup**: 3-5x
**Implementation Effort**: Medium-High (3-4 days)

---

### 2.3 Scraper Data Processing (Priority: MEDIUM)

**Location**: `scraper/src/`

**Current Stack**:
- Playwright for navigation
- Cheerio for HTML parsing
- JavaScript for data normalization

**WASM Opportunities**:

#### 2.3.1 HTML Parsing with `lol_html` or `scraper` crate

```rust
use lol_html::{element, HtmlRewriter, Settings};

#[wasm_bindgen]
pub fn parse_setlist_html(html: &str) -> Result<JsValue, JsError> {
    // Streaming HTML parsing - 5-10x faster than cheerio
}

#[wasm_bindgen]
pub fn parse_venue_html(html: &str) -> Result<JsValue, JsError> {
    // Extract venue data from HTML
}
```

**Note**: `lol_html` supports WASM target and is 5-10x faster than JavaScript parsers.

#### 2.3.2 Data Normalization Pipeline

```rust
#[wasm_bindgen]
pub fn normalize_scraped_data(
    raw_shows_json: &str,
    raw_venues_json: &str,
    raw_songs_json: &str
) -> Result<JsValue, JsError> {
    // Batch normalization of all scraped data
    // - Date parsing
    // - String normalization
    // - Deduplication
    // - Foreign key resolution
}
```

**Estimated Speedup**: 3-8x for data processing
**Implementation Effort**: High (4-5 days)
**Caveat**: Playwright navigation will remain in JavaScript

---

### 2.4 Complex IndexedDB Query Post-Processing (Priority: MEDIUM)

**Location**: `src/lib/db/dexie/queries.ts`

**Current Pattern**:
```typescript
// Multiple array operations in JavaScript
const venueShows = shows.filter(s => s.venueId === venueId);
const yearCounts = new Map<number, number>();
for (const show of venueShows) {
  yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
}
```

**Opportunity**: Move post-processing to WASM for:
- Multi-table joins
- Complex filtering with multiple conditions
- Large result set aggregations

```rust
#[wasm_bindgen]
pub fn join_shows_with_venues(
    shows_json: &str,
    venues_json: &str,
    filter_year: Option<i32>
) -> Result<JsValue, JsError>;

#[wasm_bindgen]
pub fn compute_song_venue_matrix(
    entries_json: &str,
    shows_json: &str
) -> Result<JsValue, JsError>;
```

**Estimated Speedup**: 3-10x for complex queries
**Implementation Effort**: Medium (2-3 days)

---

## 3. Low-Priority / Not Recommended

### 3.1 IndexedDB Operations Themselves

**Reason**: IndexedDB operations are I/O-bound, not CPU-bound. WASM cannot accelerate:
- `db.shows.toArray()`
- `db.songs.where('id').equals(id)`
- Bulk insert operations

**Recommendation**: Keep IndexedDB access in JavaScript, accelerate only post-processing.

### 3.2 Simple Transformations

**Already Covered**: The existing `dmb-transform` module handles all simple transformations. No additional work needed.

### 3.3 D3.js Rendering

**Reason**: D3 rendering is DOM manipulation, which WASM cannot accelerate directly. Only data preparation benefits from WASM.

---

## 4. Architecture Recommendations

### 4.1 New Module Structure

```
wasm/
├── dmb-transform/          # Existing (keep)
│   ├── src/
│   └── Cargo.toml
├── dmb-visualize/          # NEW: Visualization data prep
│   ├── src/
│   │   ├── lib.rs
│   │   ├── network.rs      # Force graph data
│   │   ├── sankey.rs       # Flow diagram data
│   │   ├── heatmap.rs      # Matrix generation
│   │   └── timeline.rs     # Time series data
│   └── Cargo.toml
└── dmb-scrape/             # NEW: Scraper acceleration (optional)
    ├── src/
    │   ├── lib.rs
    │   ├── parser.rs       # HTML parsing
    │   └── normalize.rs    # Data normalization
    └── Cargo.toml
```

### 4.2 Shared Workspace Configuration

```toml
# wasm/Cargo.toml (workspace root)
[workspace]
members = ["dmb-transform", "dmb-visualize", "dmb-scrape"]

[workspace.dependencies]
wasm-bindgen = "0.2.95"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
ahash = { version = "0.8", default-features = false, features = ["compile-time-rng"] }
```

### 4.3 Build Script Update

```json
// package.json
{
  "scripts": {
    "wasm:build": "npm run wasm:build:transform && npm run wasm:build:visualize",
    "wasm:build:transform": "cd wasm/dmb-transform && wasm-pack build --target web",
    "wasm:build:visualize": "cd wasm/dmb-visualize && wasm-pack build --target web"
  }
}
```

---

## 5. Performance Optimization Checklist

Based on `.claude/skills/wasm/optimization/wasm-performance-tuning.md`:

### 5.1 Minimize JS-WASM Boundary Crossings

**Current Issue**: Each WASM function call serializes data to JSON
```typescript
// Current pattern (multiple crossings)
const songs = module.transform_songs(JSON.stringify(rawSongs));
const validated = module.validate_foreign_keys(JSON.stringify(songs), ...);
```

**Recommendation**: Use batch APIs
```typescript
// Better: Single crossing for full sync
const result = module.transform_full_sync(JSON.stringify(fullSyncData));
```

**Already Implemented**: `transform_full_sync` in `dmb-transform`

### 5.2 Enable SIMD for Numeric Operations

**Current**: SIMD enabled via `wasm-opt`
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Os", "--enable-simd"]
```

**Opportunity**: Visualization calculations (matrix operations, distance calculations) are perfect SIMD candidates.

### 5.3 Pre-allocate Buffers

```rust
// Avoid: Allocations in hot path
let mut results = Vec::new();
for item in items {
    results.push(process(item));
}

// Better: Pre-allocate
let mut results = Vec::with_capacity(items.len());
for item in items {
    results.push(process(item));
}
```

### 5.4 Use Streaming Compilation

**Current** (TypeScript integration):
```typescript
const wasm = await import('../../../wasm/dmb-transform/pkg/dmb_transform.js');
await wasm.default();
```

**Recommendation**: Use `WebAssembly.compileStreaming` for faster initialization:
```typescript
const response = await fetch('/wasm/dmb_transform_bg.wasm');
const module = await WebAssembly.compileStreaming(response);
```

---

## 6. Implementation Roadmap

### Phase 1: Visualization Module (Week 1-2)
1. Create `dmb-visualize` workspace member
2. Implement `prepare_network_data()` for GuestNetwork
3. Implement `prepare_sankey_data()` for TransitionFlow
4. Implement `prepare_heatmap_matrix()` for SongHeatmap
5. TypeScript wrapper with fallback
6. Integration tests

### Phase 2: Force Layout (Week 2-3)
1. Implement Barnes-Hut algorithm in Rust
2. Add `compute_force_layout()` API
3. Web Worker integration for non-blocking computation
4. Benchmark against D3.js simulation

### Phase 3: Query Optimization (Week 3-4)
1. Identify slowest query patterns via profiling
2. Add batch query functions to `dmb-transform`
3. Implement complex join operations
4. Update query.ts to use WASM functions

### Phase 4: Scraper (Optional, Week 4+)
1. Evaluate `lol_html` vs `scraper` crate for WASM
2. Create `dmb-scrape` module
3. Benchmark against Cheerio
4. Integrate with scraper orchestrator

---

## 7. Estimated Impact

| Optimization | Current Time | Target Time | Speedup | Effort |
|--------------|--------------|-------------|---------|--------|
| Network data prep | ~200ms | ~30ms | 6-7x | Medium |
| Sankey data prep | ~150ms | ~20ms | 7-8x | Medium |
| Heatmap matrix | ~300ms | ~40ms | 7-8x | Medium |
| Force layout init | ~500ms | ~100ms | 5x | High |
| Complex queries | ~100ms | ~20ms | 5x | Medium |
| Scraper HTML parse | ~50ms/page | ~10ms/page | 5x | High |

**Total Estimated Developer Time**: 2-4 weeks
**Total Expected User-Perceived Improvement**: 40-60% faster visualization rendering

---

## 8. Conclusion

The DMB Almanac has excellent WASM coverage for data transformation and search. The highest-value remaining opportunities are:

1. **Visualization data preparation** - Immediate impact, moderate effort
2. **Force layout pre-computation** - High impact for GuestNetwork
3. **Complex query post-processing** - Incremental improvement

The scraper optimization is lower priority since it's a developer-facing tool, not user-facing.

**Recommended Next Step**: Create the `dmb-visualize` module starting with `prepare_network_data()` for the GuestNetwork component, which has the most complex data preparation logic.

---

## Appendix: Crate Recommendations

| Use Case | Recommended Crate | Notes |
|----------|-------------------|-------|
| Serialization | `serde`, `serde_json` | Already used |
| Fast hashing | `ahash` | Already used, 3x faster than std |
| HTML parsing | `lol_html` | Streaming, WASM-compatible |
| Graph algorithms | `petgraph` | Barnes-Hut, shortest path |
| SIMD | `std::simd` (nightly) or `wide` | Matrix operations |
| Parallel iteration | `rayon` | Already optional dep |

---

*Report generated using guidance from:*
- `.claude/skills/rust/migration/rust-from-js.md`
- `.claude/skills/wasm/optimization/wasm-performance-tuning.md`
- `.claude/skills/wasm/rust-wasm/wasm-bindgen-guide.md`
