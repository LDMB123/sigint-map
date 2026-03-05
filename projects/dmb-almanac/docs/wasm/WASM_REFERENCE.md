# WASM Reference (Rust-first)

The application is Rust-first and runs as WASM in the browser, with SSR + hydration provided by `dmb_app`.

## Key Locations

- Rust workspace: `rust/Cargo.toml`
- App crate: `rust/crates/dmb_app/`
- Hydration package output (JS glue + WASM): `rust/static/pkg/`
- WASM utility exports (compute + WebGPU bridges): `rust/crates/dmb_wasm/`
- Static WebGPU runtime modules: `rust/static/webgpu.js`, `rust/static/webgpu-worker.js`

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

- `rust/static/webgpu.js` exports the direct score kernel as an ES module consumed by `dmb_wasm`.
- WebGPU worker orchestration is Rust-owned in `rust/crates/dmb_wasm/src/webgpu.rs` via a module `web_sys::Worker` + `rust/static/webgpu-worker.js`.
- Rust validates worker preflight and init payload shape before posting to the worker; the JS worker is kept to browser-required compute/state handling only.
- Worker request dispatch is payload-shape based rather than JS-owned message-type strings.
- Rust also tracks whether the current worker runtime instance has been initialized, and auto-inits cold runtimes before score dispatch.
- Worker failure detail now comes through Rust-owned `ErrorEvent` handling rather than JS message-envelope error strings.
- The worker no longer wraps errors in a JS catch/forward helper; uncaught worker exceptions flow directly to the Rust runtime error handlers.
- That native worker-error path is now covered by degradation E2E with a forced worker score failure, so the bridge no longer depends on an untested browser quirk.
- Direct `webgpuScores` payload validation is performed in Rust before the module call, so the JS helper only contains browser-required GPU logic.
- Rust interop wrappers and score entrypoints:
  - `rust/crates/dmb_wasm/src/webgpu.rs`
  - Probe/warm logic is Rust-owned (`webgpu_probe_available`, `warm_webgpu_worker`) and uses score helper smoke calls; no dedicated JS probe/warm globals are required.
- App-level usage and benchmarks (calls into `dmb_wasm`, no direct JS FFI in `dmb_app::ai`):
  - `rust/crates/dmb_app/src/ai.rs`

## Testing

E2E (including Service Worker update flows) lives in:

- `e2e/`
