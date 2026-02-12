# WASM Reference (Rust-first)

The application is Rust-first and runs as WASM in the browser, with SSR + hydration provided by `dmb_app`.

## Key Locations

- Rust workspace: `rust/Cargo.toml`
- App crate: `rust/crates/dmb_app/`
- Hydration package output (JS glue + WASM): `rust/static/pkg/`
- WASM utility exports (compute + WebGPU bridges): `rust/crates/dmb_wasm/`
- Static WebGPU helpers (installed on `window.*`): `rust/static/webgpu.js`, `rust/static/webgpu-worker.js`

## Build Hydration Package

Hydration needs the JS glue bundle. That is produced via `wasm-pack`:

```bash
cd rust
cargo run -p xtask -- check --skip-tests
```

Under the hood this runs `wasm-pack` for `dmb_app` with `--features hydrate` and writes the output to `rust/static/pkg/`.

## WebGPU + WASM Interop

`dmb_wasm` exposes async functions that use WebGPU when available, falling back to CPU math when helpers are not present:

- WebGPU helpers registered by `rust/static/webgpu.js`:
  - `window.dmbWebgpuDot`
  - `window.dmbWebgpuScores`
  - `window.dmbWebgpuScoresWorker`
  - `window.dmbWebgpuScoresSubset`
  - `window.dmbWebgpuScoresSubsetWorker`
- Rust WASM entrypoints:
  - `rust/crates/dmb_wasm/src/webgpu.rs`
- App usage + benchmarks:
  - `rust/crates/dmb_app/src/ai.rs`

## Testing

E2E (including Service Worker update flows) lives in:

- `e2e/`
