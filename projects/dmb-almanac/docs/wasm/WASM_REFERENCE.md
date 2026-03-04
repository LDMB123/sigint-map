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
cargo run -p xtask -- build-hydrate-pkg
```

Full diagnostics build:

```bash
cd rust
cargo run -p xtask -- build-hydrate-pkg --ai-diagnostics-full
```

Under the hood this runs `wasm-pack` for `dmb_app` and writes output to `rust/static/pkg/`.

## Runtime Bootstrap (Rust-owned)

- `dmb_app::hydrate()` is the runtime bootstrap entrypoint.
- Service worker registration is now performed from Rust (`register_service_worker()` in `rust/crates/dmb_app/src/lib.rs`).
- WebGPU helper preload is triggered from Rust (`ai::preload_webgpu_runtime()`), instead of inline shell scripts.

## WebGPU + WASM Interop

`dmb_wasm` owns the browser interop boundary and exposes async wrappers that use WebGPU when available, with CPU fallback:

- WebGPU helpers registered by `rust/static/webgpu.js`:
  - `window.dmbWebgpuDot`
  - `window.dmbWebgpuScores`
  - `window.dmbWebgpuScoresWorker`
  - `window.dmbWebgpuScoresSubset`
  - `window.dmbWebgpuScoresSubsetWorker`
- Rust interop wrappers and score entrypoints:
  - `rust/crates/dmb_wasm/src/webgpu.rs`
- App-level usage and benchmarks (calls into `dmb_wasm`, no direct JS FFI in `dmb_app::ai`):
  - `rust/crates/dmb_app/src/ai.rs`

## Testing

E2E (including Service Worker update flows) lives in:

- `e2e/`
