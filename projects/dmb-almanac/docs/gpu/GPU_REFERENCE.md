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

`rust/static/webgpu.js` registers functions on `window.*` that `dmb_wasm` calls if present:

- `window.dmbWebgpuDot(Float32Array, Float32Array) -> Promise<number|null>`
- `window.dmbWebgpuScores(Float32Array query, Float32Array matrix, number dim) -> Promise<Float32Array|null>`
- `window.dmbWebgpuScoresWorker(Float32Array query, Float32Array matrix, number dim) -> Promise<Float32Array|null>`
- `window.dmbWebgpuScoresSubset(Float32Array query, Float32Array matrix, number dim, Uint32Array indices) -> Promise<Float32Array|null>`
- `window.dmbWebgpuScoresSubsetWorker(Float32Array query, Float32Array matrix, number dim, Uint32Array indices) -> Promise<Float32Array|null>`

If the helper does not exist (or returns `null`), `dmb_wasm` computes on CPU and returns results.

## Debugging

- If WebGPU seems “on” but performance is poor, check whether the worker variants are being used (`*Worker` functions).
- If results are all zeros, verify `dim` matches the embedding dimension and that `matrix.len()` is divisible by `dim` (the bridge rejects mismatched lengths).
