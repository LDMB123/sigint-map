# Hybrid WebGPU + Rust 20-Week Plan - Compressed

**Duration**: 20 weeks | **Platform**: Apple Silicon M4, Chrome 143+ | **Language**: Pure JS + JSDoc (no TypeScript)

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Aggregation queries | 200-350ms | 12-25ms (15-40x) |
| Force simulation | 140-200ms | 20-30ms (6-10x) |
| Memory usage | 117MB | 39MB (67% reduction) |
| Bundle size | 130KB | 145KB (+15KB WASM) |
| Score | 95/100 | 99/100 |

## Architecture: 3-Tier Compute Fallback

- Tier 1: WebGPU (fastest, GPU parallel)
- Tier 2: Rust/WASM (fast, CPU SIMD)
- Tier 3: JavaScript (fallback, all devices)
- `ComputeOrchestrator.aggregateByYear()` tries each tier, logs backend+timing

### File Structure
```
app/src/lib/
  gpu/device.js          - GPU device manager (singleton)
  gpu/histogram.js       - GPU histogram compute
  gpu/fallback.js        - 3-tier orchestrator
  wasm/loader.js         - WASM loader with feature detection
  wasm/aggregations/     - Stats WASM modules
  wasm/transforms/       - Data transform WASM
  wasm/graphs/           - Force-directed WASM
static/shaders/
  histogram.wgsl         - GPU compute shader
rust/
  aggregations/src/      - histogram.rs, unique.rs, percentile.rs
  transforms/src/lib.rs
  graphs/src/lib.rs
  Cargo.toml             - Workspace root
```

## Phase 1: WebGPU + Critical WASM (Weeks 1-10)

### Week 1-2: Rust/WASM Toolchain
- Install: rustup, wasm32-unknown-unknown target, wasm-pack
- Cargo workspace: opt-level=3, lto=true, codegen-units=1, panic=abort, strip=true
- Vite config: vite-plugin-wasm + vite-plugin-top-level-await
- WasmRuntime class: feature detection (WebAssembly object test), lazy module loading via dynamic import
- Validation: `npm run build` bundles WASM without errors

### Week 3-5: WebGPU Infrastructure
- GPUDeviceManager: Singleton, `powerPreference: 'high-performance'`, device-lost recovery
- GPUHistogram: Inline WGSL shader, @workgroup_size(256), atomicAdd for year bins 1991-2026
- Pipeline: createBuffer (STORAGE+COPY_DST), writeBuffer, createBindGroup, dispatchWorkgroups, mapAsync READ
- Buffer lifecycle: create -> write -> dispatch -> copy to staging -> map -> read -> destroy all
- Fallback orchestrator: GPU available? -> WASM available? -> JS fallback

### Week 6-8: Critical WASM Functions (P0)

#### Rust Histogram (`rust/aggregations/src/histogram.rs`)
- `aggregate_by_year(years: &[u32]) -> js_sys::Map` - SIMD-friendly loop, 35-bin histogram
- `unique_songs_per_year(songs: &js_sys::Array) -> js_sys::Map` - HashMap<u32, HashSet<String>>
- Cargo: cdylib, wasm-bindgen 0.2, js-sys 0.3, release profile opt-level=z for size

#### Build Script
- `wasm-pack build --target web --out-dir ../../app/src/lib/wasm/aggregations`

#### Integration
- `aggregations.js` calls `ComputeOrchestrator.aggregateByYear()` with 3-tier fallback
- DEV mode: log backend + timing

### Week 9-10: Integration & Testing
- Vitest: Mock GPUDeviceManager/WasmRuntime.isAvailable() to test all 3 tiers
- Benchmark script: 2800 shows, 10 iterations, report avg/min/max
- Expected on M4: WebGPU 12-25ms, WASM 35-50ms, JS 200-350ms

## Phase 2: Visualization + UMA (Weeks 11-18)

### Week 11-13: Force-Directed Graph (Rust)
- `ForceSimulation` struct: nodes Vec<Node>, links Vec<Link>, alpha, alpha_decay
- Node: x, y, vx, vy (f64)
- `tick()`: apply link force, charge force (O(n^2)), center force, velocity decay 0.4, alpha decay
- `positions() -> Float64Array`: flat [x0,y0,x1,y1,...] (zero-copy on UMA)
- Svelte integration: `ForceGraph.svelte` with canvas, requestAnimationFrame loop

### Week 14-16: UMA Memory Optimization
- UMAAdapter class: createSharedBuffer (ArrayBuffer), createGPUBuffer (mappedAtCreation)
- Apple Silicon UMA: JS/WASM/GPU share physical memory
- Zero-copy pattern: Allocate in WASM heap, pass to GPU without copy

### Week 17-18: Remaining P1 Functions
- 4 additional WASM functions (search, transforms)
- All P0 + P1 complete (17/23 functions)

## Phase 3: Polish + Voice (Weeks 19-20)

### Week 19: Final WASM (P2/P3)
- String processing, diff algorithm, cache utilities

### Week 20: Voice Search (Chrome 143+)
- VoiceSearch class: webkitSpeechRecognition, maxAlternatives=5
- Contextual biasing: `SpeechRecognitionContextualBiasing` with DMB vocabulary (1200+ terms), weight 0.8
- Expected: 40-60% accuracy improvement on DMB terms

## Performance Targets

| Function | Before (JS) | After (GPU/WASM) | Speedup |
|----------|-------------|-------------------|---------|
| aggregateShowsByYear | 200-350ms | 12-25ms | 15-40x |
| uniqueSongsPerYear | 80-120ms | 15-25ms | 4-6x |
| forceSimulation | 140-200ms | 20-30ms | 6-10x |
| calculatePercentile | 25-40ms | 8-12ms | 3-4x |

## Memory Targets

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Aggregation memory | 48MB | 24MB | 50% |
| Graph simulation | 45MB | 15MB | 67% |
| Query buffers | 24MB | 2KB | 99.9% |

## Bundle Size Impact
- WASM aggregations: 15KB gzip
- WASM graphs: 12KB gzip
- Total WASM: 27KB
- Main bundle: 130KB -> 145KB (+11%)

## Risk Mitigation
- Browser compat: WebGPU Chrome 143+/Safari 18+, WASM 98% support, 3-tier fallback
- Performance regression: Automated benchmarks per commit, feature flags, production telemetry
- Dev complexity: Pure JS (no TS migration), JSDoc types, each function independent/incremental
