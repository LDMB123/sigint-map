# GPU Compute Reference (Rust-first)

The Rust-first app can use WebGPU to accelerate embedding scoring. The WebGPU implementation is provided as static JavaScript helpers served by the Rust server, with WASM-callable entrypoints in `dmb_wasm`.

## Key Files

- WebGPU implementation + helpers:
  - `rust/static/webgpu.js`
  - `rust/static/webgpu-worker.js`
- WASM bridge (falls back to CPU math when WebGPU is unavailable):
  - `rust/crates/dmb_wasm/src/webgpu.rs`
- App integration + measurement hooks:
  - `rust/crates/dmb_app/src/ai.rs`

## Runtime Contract

`rust/static/webgpu.js` now exports the direct scoring kernel as an ES module function:

- `webgpuScores(Float32Array query, Float32Array matrix, number dim) -> Promise<Float32Array|null>`
- `dmb_wasm` lazy-imports that module for direct scoring, and Rust-owned worker orchestration uses a module worker at `rust/static/webgpu-worker.js`.
- Worker preflight limits (cooldown, threshold, max-floats, init-shape validation) are enforced on the Rust side before the worker is touched; `webgpu-worker.js` is now closer to a thin compute host.
- The worker protocol is now payload-shape based (`matrix` init payloads, `query` score payloads); JS no longer owns message-type strings for the Rust bridge.
- Per-runtime worker init liveness is also tracked in Rust, so the worker no longer owns a separate “not initialized” policy branch.
- Worker exceptions are now surfaced to Rust as worker error events instead of JS-posted `{ error }` message envelopes.
- The worker now lets those exceptions escape natively; no JS error-forwarding helper remains in the bridge.
- The native worker-error path is covered by degradation E2E with a forced score failure, so the no-envelope contract is exercised in Chromium instead of being left as an undocumented browser assumption.
- Direct score payload shape validation (`query`/`matrix`/`dim`) is now Rust-owned too; `webgpu.js` assumes validated typed-array inputs.
- The direct score kernel now cleans up transient GPU buffers in a `finally` path so failed dispatch/read operations do not strand temporary browser GPU resources.

Probe and worker warmup checks are owned by Rust (`dmb_wasm::webgpu_probe_available`, `dmb_wasm::warm_webgpu_worker`) and are implemented via score helper smoke calls.

If the helper does not exist (or returns `null`), `dmb_wasm` computes on CPU and returns results.

## Debugging

- If WebGPU seems “on” but performance is poor, check diagnostics for backend labels (`webgpu` vs `webgpu-worker`) to confirm the Rust worker path is being selected.
- If results are all zeros, verify `dim` matches the embedding dimension and that `matrix.len()` is divisible by `dim` (the bridge rejects mismatched lengths).
