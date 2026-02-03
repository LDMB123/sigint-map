# WASM Reference - DMB Almanac (Project-Level)

Compressed from 7 project-level docs + app-level WASM_REFERENCE.md (415 lines).

## Build & Deploy

### Commands
```bash
bash scripts/build-wasm.sh       # Build WASM modules (primary)
npm run prebuild                # Build WASM + compress data
npm run build                   # Full production build
```

### Rust Toolchain Setup
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli wasm-pack
```

### Build Config (Cargo.toml)
```toml
[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

### Build Output
- Source: `rust/aggregations/` (active WASM module)
- Built: `static/wasm/` (static assets)
- Manifest: `static/wasm/manifest.json`
- Total: 1.69 MB uncompressed, 553 KB Brotli
- Aggregations binary: 24 KB (~8 KB gzipped)

### Module Sizes
| Module | Size | Use Case |
|--------|------|----------|
| dmb-transform | 736 KB | Data transformation |
| dmb-segue-analysis | 316 KB | Setlist prediction |
| dmb-date-utils | 205 KB | Date operations |
| dmb-core | 176 KB | Core utilities |
| dmb-string-utils | 103 KB | String normalization |
| dmb-visualize | 95 KB | Heatmap generation |
| dmb-force-simulation | 43 KB | Graph layout |

## Architecture

### 3-Tier Compute Pipeline
- GPU (WebGPU) -> WASM (Rust) -> JavaScript (fallback)
- `ComputeOrchestrator` in `$lib/gpu/fallback.js` handles selection
- `ComputeTelemetry` in `$lib/gpu/telemetry.js` tracks backend usage

### Static Loader
1. Build time: `scripts/build-wasm.sh` builds modules -> `static/wasm/`
2. Runtime: `$lib/wasm/loader.js` fetches `/wasm/manifest.json`
3. `@vite-ignore` dynamic import bypasses Vite parser
4. Modules loaded from static assets (no bundler processing)

### File Structure
```
rust/aggregations/src/lib.rs        # Aggregation WASM functions
app/src/lib/wasm/loader.js          # WasmRuntime singleton
app/src/lib/wasm/aggregations/      # Generated WASM output
app/src/lib/gpu/fallback.js         # 3-tier orchestrator
static/wasm/manifest.json           # Module metadata
static/wasm/<module>/               # Per-module .js + .wasm
```

### Vite 6 Integration
```javascript
// vite.config.js
// WASM aliases configured per active modules in rust/
server: { fs: { allow: ['..', 'static'] } }
optimizeDeps: { exclude: ['$lib/wasm/dmb_aggregations.js'] }
build: { target: 'es2020' }
```

### Vite 6 WASM Import Fix
- Block comments `/* */` with imports still trigger Vite parse-time analysis
- Only line comments `//` bypass parser
- Fixed in: `validation.js`, `advanced-modules.js`, `visualize.js`, `forceSimulation.js`, `transform.js`
```bash
# Verify no problematic block comments remain
grep -Pzo "/\*(?:[^*]|\*(?!/))*import.*wasm.*\*/" src/lib/wasm/*.{js,ts}
```

## API Reference

### WasmRuntime (loader.js)
- `WasmRuntime.isAvailable(): Promise<boolean>` - feature detection, cached
- `WasmRuntime.load(): Promise<WasmAggregationsModule>` - lazy, cached, concurrent-safe
- `WasmRuntime.unload(): void` - clear cache for testing/cleanup

### aggregate_by_year(years: Uint32Array): Map<number, number>
- SIMD-optimized histogram, years 1991-2026
- Stack-allocated (140 bytes), invalid years silently skipped
- 0.5-2ms for 2,800 shows (2-5x vs JS)

### unique_songs_per_year(songs: Array<{year, song}>): Map<number, number>
- Rust HashMap<u32, HashSet<String>>
- 2-4ms for 50K entries (5x vs JS)
- Strings allocated in Rust heap (no JS GC pressure)

### calculate_percentile(values: Float64Array, percentile: number): number
- Pre-sorted input required (ascending)
- Linear interpolation, O(1) lookup
- Percentile: 0.0-1.0 (clamped), empty returns 0.0

### getTopSongsAllTime(setlistsJson: string, limit: number): Array<{song, count}>
- Min-heap top-K, O(n log k)
- Input: JSON.stringify([{songs: ['A','B']}, ...])
- 12.5ms for 2,800 shows

### calculateSongDebuts(setlistsJson: string): Map<string, string>
- Input: JSON.stringify([{date: 'YYYY-MM-DD', songs: [...]}, ...])
- HashMap-based earliest date tracking
- 14.8ms for 2,800 shows

### calculateSongDebutsWithCount(setlistsJson: string): Map<string, {debutDate, totalShows}>
- Combined debut + play count in single pass
- 18.9ms for 2,800 shows

### aggregateMultiField(years: Uint32Array, venues: Uint32Array, songs: Uint32Array): {years, venues, songs}
- 3 parallel histograms in single pass
- All arrays must have same length
- 8.5ms for 2,800 shows, 2-3x faster than 3 separate calls

## Performance

### Benchmarks (Apple M4, Chrome 143, 2,800 shows)
| Function | Target | Actual | WASM vs JS |
|----------|--------|--------|------------|
| aggregate_by_year | <10ms | 2.3ms | 5-10x |
| unique_songs_per_year | <15ms | 4.9ms | 5x |
| calculate_percentile | <1ms | 0.09ms | ~1x |
| top_songs_all_time | <20ms | 12.5ms | 5-10x |
| calculate_song_debuts | <20ms | 14.8ms | 3-5x |
| calculate_song_debuts_with_count | <25ms | 18.9ms | 3-5x |
| aggregate_multi_field | <15ms | 8.5ms | 2-3x |
| memory_stability (100x) | <500ms | 287ms | N/A |

### Larger Module Speedups (WASM vs JS)
- Data transform (150K entries): 320ms -> 65ms (4.9x)
- Force simulation tick: 850ms -> 85ms (10x)
- Global search (1000 items): 150-200ms -> 30-50ms (3-5x)
- Heatmap prep: 10-20x for >1000 cells
- TF-IDF search: 50-100x for large corpus

### Real-World Impact (Stats Dashboard)
- Dashboard render: 850ms -> 180ms (79% faster)
- User interaction: 220ms -> 45ms (80% faster)
- Lighthouse Performance: 72 -> 89 (+17)
- TBT: 420ms -> 110ms (-74%), INP: 280ms -> 85ms (-70%)

### Dataset Scaling Rules
- <100 items: Use JS (WASM overhead dominates)
- 100-500: WASM breaks even
- 500+: WASM wins (5-10x)
- 5000+: Consider WebGPU (15-40x)

### Backend Selection
- WebGPU: Numeric aggregations, parallel compute, >5K items, no strings
- WASM: String ops, complex algorithms, 100-10K items, HashSet/HashMap
- JavaScript: <100 items, <1ms ops, fallback

## Worker Implementation

### ES Module Worker Pattern
```javascript
// wasm-worker-esm.js
import init, { AlmanacDataStore } from '/wasm/dmb-transform/pkg/dmb_transform.js';
// Messages: 'init' -> initializeWasm(), 'call' -> executeMethod(), 'free' -> clear()
```

### Bridge Config
```typescript
{ useWorker: true, preferWasm: true, maxRetries: 3 }
```

## Memory

### WASM Memory Footprint
- Module binary: 19-24 KB (7-8 KB gzipped)
- Runtime overhead: ~500 KB (WebAssembly.Memory)
- Per-function peak: 2-35 KB depending on function
- Total peak: ~175 KB (all functions combined), <200 KB target

### Optimization Rules
- Use TypedArrays for numeric data (10-20x faster marshalling)
- Batch operations into single WASM call (50-100x vs per-item)
- Load module once via WasmRuntime (auto-cached)
- Reuse result Maps to reduce GC pressure
- Pre-sort once for multiple percentile calls

### Apple Silicon (UMA)
- Zero-copy between CPU/GPU via SharedArrayBuffer
- SIMD NEON: 4x Float64 or 8x Float32 per instruction
- E-core scheduling for background WASM workers
- 40-60% lower battery for background processing

## Browser Support

### Targets
- Chrome/Edge 143+ (primary, full SIMD + Speculation Rules)
- Safari 18+ (SIMD may be disabled, 10-15% slower)
- Firefox 133+ (no Speculation Rules, graceful fallback)
- Mobile: iOS 15+, Android Chrome 80+

### Load Times
- Cold start: ~120ms (download + parse + instantiate)
- Warm start: ~30ms (service worker cached)

## Deployment

### CDN Headers
```
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/wasm
Content-Encoding: gzip
Access-Control-Allow-Origin: *
```

### Service Worker
```javascript
const WASM_CACHE = 'wasm-v1';
const WASM_FILES = ['/wasm/dmb_aggregations_bg.wasm'];
```

### Rollout Strategy
- Feature flag: `WASM_ENABLED = { enabled: true, rollout: 100 }`
- Gradual: 10% -> 25% -> 50% -> 100% over 4 weeks

### Rollback Triggers
- Error rate > 5%
- Performance degradation > 50%
- Memory leak detected
- Browser crashes reported
```bash
# Disable WASM feature flag and restart
npm run dev
```

## Testing

### Commands
```bash
cd rust/aggregations && cargo clippy --release -- -D warnings && cargo test --release
cd app && npm test -- tests/wasm/
npm test -- tests/wasm/aggregations.integration.test.js
npm test -- --grep "WASM"
```

### Test Levels
- Rust unit tests: 17/17 (cargo test)
- JS integration tests: 12/12 (Vitest)
- Performance tests: 8/8
- Browser validation: `/test-wasm` page with JSON export

### DevTools Verification
1. Network tab: Filter "wasm", verify module loads
2. Application > Workers: Verify wasm-worker-esm running
3. Performance tab: Verify off-main-thread execution
4. Console: Look for "[WASM] Loaded dmb-transform successfully"

### Regression Baselines (ms)
```javascript
{ aggregate_by_year: { min: 0.5, max: 5, target: 2 },
  unique_songs_per_year: { min: 1, max: 10, target: 5 },
  calculate_percentile: { min: 0.01, max: 1, target: 0.1 },
  top_songs_all_time: { min: 5, max: 20, target: 12 },
  calculate_song_debuts: { min: 5, max: 20, target: 15 },
  calculate_song_debuts_with_count: { min: 10, max: 25, target: 19 },
  aggregate_multi_field: { min: 3, max: 15, target: 8 } }
```

## Troubleshooting

- **Cannot find module '/wasm/pkg/module.js'**: Run `bash scripts/build-wasm.sh`
- **WASM slower than JS**: Check dataset size (>100 items needed), verify release build, use TypedArrays
- **"ESM integration proposal" errors**: Convert block comments to line comments `//`
- **Worker init fails**: Auto-fallback to direct mode
- **wasmModule.fn is not a function**: Missing `#[wasm_bindgen]`, rebuild, update type defs
- **Memory issues**: Reuse Maps, batch ops, avoid tight WASM loops
- **Inconsistent perf**: Check module caching, ComputeOrchestrator logs, GC pauses

## TS-to-JS Converted Files

| File | Lines | Notes |
|------|-------|-------|
| serialization.js | 1017 | JSDoc types |
| fallback.js | 871 | JSDoc types |
| queries.js | 989 | JSDoc types |
| stores.js | 507 | JSDoc types |
| search.js | 456 | JSDoc types |
| transform.js | 567 | JSDoc types |
| advanced-modules.js | 298 | JSDoc types |
| visualize.js | 201 | JSDoc types |
| transform-typed-arrays.js | 134 | JSDoc types |

*All WASM modules converted to JS with JSDoc types. Only `loader.js` and `aggregations-wrapper.js` remain in `$lib/wasm/`.*

## Bundle Impact
- Main bundle: 580 KB (unchanged, WASM lazy loaded)
- WASM modules: 260 KB additional (on-demand)
- Total: 840 KB (+45%), mitigated by lazy loading + Brotli

## Adding New WASM Function (Workflow)
1. Write Rust in `rust/aggregations/src/lib.rs` with `#[wasm_bindgen]`
2. Add Rust tests (`cargo test`)
3. Rebuild: `./scripts/build-wasm.sh`
4. Update JSDoc typedef in `loader.js`
5. Add integration test in `app/tests/wasm/`
6. Update this reference
7. Integrate in Svelte component via `WasmRuntime.load()`
