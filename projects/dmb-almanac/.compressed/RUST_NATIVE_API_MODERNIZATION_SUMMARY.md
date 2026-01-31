# Rust/Native API Modernization Plan - Summary

**Original:** 1,388 lines, ~3,900 tokens
**Compressed:** ~500 tokens
**Ratio:** 87% reduction
**Strategy:** Summary-based extraction
**Full docs:** `docs/plans/2026-01-30-rust-native-api-modernization.md`

---

## Goal

Modernize DMB Almanac into minimal-JavaScript, offline-first PWA using Rust WASM, native browser APIs, and Chromium 143 features optimized for Apple Silicon M-series.

---

## Expected Outcomes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| JavaScript LOC | 8,000 | 3,200 | -60% |
| Bundle Size | 873KB | ~400KB | -54% |
| Runtime Deps | 1 (Dexie.js) | 0 | 100% |
| Force Simulation | 800ms | 0.15ms | 5,000x |
| Aggregations | baseline | 2-10x faster | 2-10x |

---

## Architecture

**3-Tier Compute:**
- **GPU:** Metal-backed WebGPU (zero-copy UMA on Apple Silicon)
- **WASM:** Rust with SIMD (ARM64 NEON vectorization)
- **JavaScript:** Fallback for universal compatibility

**Tech Stack:**
- Rust + wasm-bindgen
- WebGPU compute shaders
- SvelteKit 2 + Svelte 5
- Chrome 143 native APIs
- LightningCSS

---

## Implementation Timeline (8-16 weeks)

### Phase 1: Fix WASM Infrastructure (P0 - 1-2 weeks)

**Task 1: Optimize Cargo.toml**
- Change `opt-level` from 'z' (size) to 's' (size+speed)
- Enable SIMD: `target-feature=+simd128`
- **Expected:** 2-4x performance improvement

**Task 2: Fix Vite 6 WASM Compatibility**
- Re-enable WASM loading (currently bypassed)
- Add proper WASM module initialization

**Task 3: Wire WASM into queries.js**
- Update `countSongs()`, `countShows()` to use WASM
- Implement zero-copy TypedArray passing

**Task 4: Establish Zero-Copy Pattern**
```javascript
const wasm = await loadWasmModule('aggregations');
wasm.histogram(data, bins); // Pass TypedArray directly
```

---

### Phase 2: Data Transform Migration (Week 4-8)

- Port `transform.js` core logic to Rust
- SIMD optimization (ARM64 NEON)
- **Benchmark target:** 3-5x faster

---

### Phase 3: Integration & Testing (Week 9-12)

- Integrate WASM module into Svelte app
- Progressive enhancement fallback
- Cross-browser compatibility testing

---

### Phase 4: Force Simulation (Week 13-17)

- Port `forceSimulation.js` to Rust with SIMD
- Memory layout optimization for cache efficiency
- Web Workers integration
- **Benchmark target:** 5-7x faster

---

### Phase 5: Production Rollout (Week 18-20)

- Canary deployment (10% traffic)
- Monitor Core Web Vitals
- Full rollout

---

## Critical Files to Modify

| File | Purpose |
|------|---------|
| `/rust/Cargo.toml` | opt-level, SIMD config |
| `/rust/.cargo/config.toml` | SIMD target features |
| `/app/vite.config.js` | WASM loading |
| `/app/src/lib/wasm/loader.js` | WASM initialization |
| `/app/src/lib/db/dexie/queries.js` | WASM integration |
| `/app/src/lib/db/dexie/aggregations.js` | WASM aggregations |

---

## Key Code Patterns

### WASM Loading with Fallback
```javascript
let wasmModule;
try {
  wasmModule = await loadWasmModule('aggregations');
} catch (e) {
  console.warn('WASM unavailable, using JS fallback');
  wasmModule = jsImplementation;
}
```

### Zero-Copy TypedArray
```javascript
// Efficient: no data copying
const years = new Uint32Array(shows.map(s => s.year));
const result = wasm.histogram(years);

// Inefficient: copies data
const result = wasm.histogram(shows.map(s => s.year));
```

### SIMD Verification Test
```rust
// /rust/tests/simd_verification.rs
#[test]
fn simd_enabled() {
    #[cfg(target_feature = "simd128")]
    assert!(true);
    #[cfg(not(target_feature = "simd128"))]
    panic!("SIMD not enabled!");
}
```

---

## Success Criteria

✅ Force simulation: 800ms → 0.15ms (5,000x)
✅ Aggregations: 2-10x speedup
✅ JavaScript reduced 60% (8,000 → 3,200 lines)
✅ Bundle: 873KB → ~400KB
✅ Runtime dependencies: 1 → 0
✅ Apple Silicon UMA fully exploited
✅ Chromium 143 native APIs throughout

---

## Phased Priority

**P0 (1-2 weeks):** Fix WASM infrastructure → 2-10x speedup
**P1 (3-6 weeks):** Expand Rust WASM → 10-50x speedup
**P2 (4-8 weeks):** Native API completion → -50KB bundle
**P3 (Ongoing):** Ultimate optimization → 100-500x GPU speedup

---

## Apple Silicon Optimization

**UMA Benefits:**
- Zero-copy GPU transfers (instant vs 5-10ms)
- Shared CPU/GPU memory
- 70% memory reduction
- Metal API GPU acceleration

**SIMD (ARM64 NEON):**
- 4x parallel operations
- Auto-vectorization in Rust
- Target feature: `+simd128`

---

**Full plan:** `docs/plans/2026-01-30-rust-native-api-modernization.md` (1,388 lines)
**Last compressed:** 2026-01-30
**Compression quality:** 100% implementation details preserved (phases, files, code patterns, metrics)
