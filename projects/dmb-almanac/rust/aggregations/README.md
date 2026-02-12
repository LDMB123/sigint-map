# DMB WASM Aggregations

Rust-compiled WebAssembly statistical aggregations for DMB Almanac.

- **Performance**: 5-10x faster than JavaScript
- **Size**: ~19KB binary (7KB gzipped)
- **Target**: Chrome 89+, Firefox 89+, Safari 15+

## Prerequisites

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # Rust 1.70+
cargo install wasm-pack
rustup target add wasm32-unknown-unknown
```

## Build Commands

```bash
# Development (faster compile, larger binary)
wasm-pack build --target web --dev

# Production (optimized, minimal size)
wasm-pack build --target web --release
```

### Output
```
rust/aggregations/pkg/
├── index.js         # JavaScript bindings
├── index_bg.wasm    # WASM binary (~19KB)
└── package.json     # NPM package metadata
```

## Testing

```bash
cargo test                           # Rust unit tests
cargo clippy -- -D warnings          # Linter
cargo fmt                            # Format
```
Note: Validate the Rust-first runtime via `bash scripts/cutover-rehearsal.sh` from the repo root.

## Project Structure

```
rust/aggregations/
├── Cargo.toml       # Package manifest + build config
├── src/lib.rs       # All WASM-exported functions
└── README.md
```

## API Signatures

### `aggregate_by_year(years: &[u32]) -> js_sys::Map`
- Year histogram with SIMD-friendly optimization
- Returns Map<year, count>

### `unique_songs_per_year(data: &js_sys::Array) -> js_sys::Map`
- Unique song counting with HashSet
- Returns Map<year, unique_count>

### `calculate_percentile(values: &[f64], percentile: f64) -> f64`
- Linear interpolation percentile calculation

## Benchmarks

| Function | Dataset | WASM | JavaScript | Speedup |
|----------|---------|------|-----------|---------|
| aggregate_by_year | 2,800 shows | ~5ms | ~30ms | 6x |
| unique_songs_per_year | 55K entries | ~15ms | ~90ms | 6x |
| calculate_percentile | 2,800 values | ~1ms | ~5ms | 5x |

## Optimization Config

### Cargo.toml
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int"]
```

- `-Oz`: aggressive size optimization (~30% smaller than -O3, ~5-10% slower)
- `--enable-bulk-memory`: efficient memory operations
- `--enable-nontrapping-float-to-int`: modern float conversion

### Dependencies
```toml
[dependencies]
wasm-bindgen = "0.2"          # JS interop
js-sys = "0.3"                # JS types (Map, Array)
web-sys = "0.3"               # Web APIs
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"    # Serde + wasm-bindgen
```

## Performance Tips

- **Stack allocation**: `let mut histogram = [0u32; 35];` (not Vec)
- **SIMD-friendly loops**: simple bodies, no branching, enable auto-vectorization
- **Minimize JS interop**: batch operations in single WASM call
- **Data structures**: fixed arrays for histograms, HashMap+HashSet for unique counting, `sort_unstable` for sorting

## Adding New Functions

1. Add `#[wasm_bindgen] pub fn` to `src/lib.rs`
2. Add `#[cfg(test)]` unit tests
3. Rebuild: `cd rust/aggregations && wasm-pack build --target web --release`
4. If you still need an external JS integration harness, keep it out of this repo’s runtime dependency graph.

### Function Template
```rust
#[wasm_bindgen]
pub fn my_function(input: &[u32]) -> js_sys::Map {
    let result = js_sys::Map::new();
    // computation...
    result
}
```

## Debugging

```rust
// Console logging from WASM
#[wasm_bindgen] extern "C" {
    #[wasm_bindgen(js_namespace = console)] fn log(s: &str);
}
log(&format!("Processing {} items", input.len()));
```

```bash
ls -lh rust/aggregations/pkg/index_bg.wasm  # Check binary size (~19KB expected)
```

- Browser DevTools Performance tab -> look for "WASM" entries
- Red flags: >100ms calls (check dataset), frequent GC (reduce allocations)

## Troubleshooting

- **wasm-pack not found**: `cargo install wasm-pack`
- **Unknown target**: `rustup target add wasm32-unknown-unknown`
- **JS can't find module**: rebuild the crate and verify `rust/aggregations/pkg/` exists
- **Binary too large (>50KB)**: ensure `--release` build, check dependencies, run `wasm-opt -Oz`
- **Slow performance**: ensure release build (10-50x faster than dev)

## Changelog

### v0.1.0 - 2025-01-29
- `aggregate_by_year()`: year histogram, SIMD optimization
- `unique_songs_per_year()`: unique counting with HashSet
- `calculate_percentile()`: linear interpolation
- wasm-opt -Oz size optimization, 19KB binary, 5-10x JS speedup
