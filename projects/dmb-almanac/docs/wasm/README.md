# Wasm Docs

Wasm architecture, migration roadmap, and current optimization evidence for the Rust-first client.

## Primary References

- `docs/wasm/WASM_REFERENCE.md` - current runtime architecture, ownership boundaries, and build/test commands.
- `docs/gpu/GPU_REFERENCE.md` - WebGPU-specific runtime contract and hot-path notes.
- `STATUS.md` - latest verified runtime changes affecting WASM/browser interop.
- `docs/wasm/JS_TO_WASM_ROADMAP.md` - JS-to-Rust/WASM migration status and next steps.
- `docs/wasm/rust-optimization-report.md` - latest import/size gate results and acceptance tracking.
- `docs/wasm/rust-import-perf.json` - raw measurement output from `scripts/rust-import-perf.mjs`.

## Evidence Commands

- Import perf (3 cold runs, tuning off/on):
  - `node scripts/rust-import-perf.mjs --base-url http://127.0.0.1:3000 --runs 3 --out-json docs/wasm/rust-import-perf.json`
- WASM size gate (10% gzip target):
  - `bash scripts/check-wasm-size.sh --baseline-gzip 1023156`
