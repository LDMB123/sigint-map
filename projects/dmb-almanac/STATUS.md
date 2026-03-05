# DMB Almanac Status (Canonical)

Date: 2026-03-05
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

`STATUS.md` is the single source of truth for current repo state.
`CONTEXT.md` is intentionally minimal and links here.

## Current Snapshot

- Rust-first, local-only offline PWA.
- Active implementation lives in `rust/` (`dmb_app`, `dmb_server`, `dmb_idb`, `dmb_pipeline`, `dmb_wasm`).
- Legacy JS prototype UI is removed from the active tree.
- Primary confidence gate is:
  - `bash scripts/cutover-rehearsal.sh`
- Remote Rust E2E gate is available:
  - `BASE_URL=http://127.0.0.1:<port> bash scripts/cutover-remote-e2e.sh`

## Latest Verified Checks

All Cargo commands in this section were run from the `rust/` workspace root unless noted otherwise.

- Rust workspace quality/cleanup pass re-verified (2026-03-05):
  - `cargo fmt --all`
  - `cargo clippy --workspace --all-targets --all-features -- -D warnings`
  - `cargo test --workspace`
- Rust workspace validation completed for migration/interop wrapper work:
  - `cargo fmt --all`
  - `cargo clippy -p dmb_app --features ssr --all-targets -- -D warnings`
  - `cargo clippy -p dmb_app --features hydrate --all-targets -- -D warnings`
  - `cargo check -p dmb_wasm`
  - `cargo check -p dmb_app --features hydrate --target wasm32-unknown-unknown`
  - `cargo check -p dmb_app --features ssr`
  - `cargo check -p xtask`
  - `cargo test -p dmb_app --features ssr --lib`
  - `cargo test -p dmb_app --features hydrate --lib`
  - `cargo test -p xtask`
- Rust AI diagnostics/degradation gate re-verified (2026-03-05):
  - `RUST_E2E=1 RUST_AI_DIAGNOSTICS_FULL=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1` (`4 passed`)
  - `RUST_E2E=1 RUST_AI_DIAGNOSTICS_FULL=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-ai.spec.js tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1` (`8 passed`)
- Rust worker-bridge deep refactor validation (2026-03-05):
  - `cargo fmt --all`
  - `cargo check -p dmb_wasm`
  - `cargo clippy -p dmb_wasm --all-targets -- -D warnings`
  - `cargo clippy -p dmb_app --features hydrate --all-targets -- -D warnings`
  - `cargo check -p dmb_app --features hydrate --target wasm32-unknown-unknown`
  - `cargo test -p dmb_app --features hydrate --lib`
  - `cargo test --workspace`

## Recent Runtime Fixes

- WebGPU scoring hot-path tightening (2026-03-05):
  - `rust/crates/dmb_app/src/ai.rs`: worker matrix init reuse now stores `WebgpuMatrixJsSignature` directly and computes the signature only after worker preflight passes, removing string formatting/comparison from the worker hot path.
  - `rust/crates/dmb_wasm/src/webgpu.rs`: replaced generic JS object reflection with fixed inline helper exports for module calls, worker payload creation, message parsing, and JS error extraction.
  - `rust/crates/dmb_wasm/src/webgpu.rs`: pending worker requests now live in a small pre-sized map, and request posting no longer clones runtime handles on every dispatch.
  - `rust/crates/dmb_app/src/ai.rs`: full and subset GPU search now run top-k reduction in the inline JS helper `dmbTopKScores`, so Rust only copies winning indices/scores back and no longer maintains the old full-score scratch buffer.
- WebGPU helper reliability hardening (2026-03-05):
  - `rust/static/webgpu.js`: failed `ensureDevice()` attempts no longer pin a rejected promise; retries now recover after transient adapter/device failures.
  - `rust/static/webgpu.js`: worker matrix init cache key now includes matrix identity, preventing stale same-shape matrix reuse.
  - `rust/crates/dmb_app/src/ai.rs`: Rust-side JS matrix cache now validates pointer/length plus content sentinels, reducing stale cache risk when allocator reuse occurs.
- JS→Rust subset scoring transition (2026-03-05):
  - `rust/crates/dmb_app/src/ai.rs`: subset matrix construction now happens in Rust before WebGPU dispatch.
  - `rust/crates/dmb_wasm/src/webgpu.rs`: subset scoring routes through Rust bridge entrypoints with Rust-built subset matrices.
  - `rust/static/webgpu.js` and `rust/static/webgpu-worker.js`: removed deprecated `dmbWebgpuScoresSubset*` JS runtime paths, shrinking browser-only logic.
- JS→Rust diagnostics/profile transition (2026-03-05):
  - `rust/crates/dmb_app/src/browser/webgpu_diagnostics.rs`: runtime telemetry and Apple Silicon profile now derive from Rust-side policy/runtime state instead of JS globals.
  - `rust/crates/dmb_app/src/browser/runtime.rs`: added navigator platform/user-agent helpers for Rust-native hardware profile detection.
  - `rust/static/webgpu.js`: removed deprecated global diagnostics/profile shims (`dmbGetWebgpuTelemetry`, `dmbResetWebgpuTelemetry`, `dmbGetAppleSiliconProfile`).
  - `rust/static/webgpu.js`: removed remaining JS telemetry counter mutation paths; diagnostics metrics are now sourced from Rust policy telemetry only.
- JS→Rust WebGPU contract tightening (2026-03-05):
  - `rust/static/webgpu.js`: removed unused `dmbWebgpuDot` compute path and dot pipeline/cache state; active browser helpers now focus on score-vector paths used by `dmb_wasm`.
  - `docs/wasm/WASM_REFERENCE.md` and `docs/gpu/GPU_REFERENCE.md`: runtime contract docs now match the remaining Rust-consumed helpers.
- JS→Rust probe/warm + policy fallback shift (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: `webgpu_probe_available` now runs a Rust-owned direct-score smoke probe; `warm_webgpu_worker` now runs a Rust-owned worker warmup score pass.
  - `rust/static/webgpu.js`: removed deprecated probe/warm globals (`dmbWebgpuProbe`, `dmbWarmWebgpuWorker`) from the browser contract.
  - `rust/static/webgpu.js`: worker helper now returns `null` on worker init/score failures (after resetting worker state) so fallback path selection remains Rust-owned.
  - `rust/crates/dmb_app/src/ai.rs`: worker matrix-init policy is now Rust-owned (per-matrix signature cache + safe retry with forced init).
  - `rust/static/webgpu.js`: removed JS worker signature/identity cache state; worker helper now accepts a Rust-controlled `requiresInit` flag.
- JS→Rust worker lifecycle/runtime bridge shift (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: worker lifecycle, request IDs, pending-response dispatch, and timeout handling now run in Rust via `web_sys::Worker`.
  - `rust/crates/dmb_wasm/src/webgpu.rs`: added Rust-owned worker capability/probe helpers and runtime reset hook.
  - `rust/static/webgpu.js`: removed `window.dmbWebgpuScoresWorker`; JS helper was reduced to the direct score path only.
  - `rust/crates/dmb_app/src/ai.rs`: worker capability detection/reset paths now use Rust bridge helpers instead of `window.dmbWebgpuScoresWorker` presence checks.
- JS→Rust module-boundary shift (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: direct scoring now lazy-imports `rust/static/webgpu.js` through inline JS bridge functions instead of looking up `window` globals.
  - `rust/crates/dmb_wasm/src/webgpu.rs`: helper failure state is now tracked in Rust, so diagnostics capability state no longer depends on browser global installation timing.
  - `rust/static/webgpu.js`: now exports `webgpuScores` as an ES module function instead of installing `window.dmbWebgpuScores`.
  - `rust/static/webgpu-worker.js`: now imports the scoring kernel directly and runs as a module worker, removing the remaining WebGPU helper global from the runtime contract.
- JS→Rust worker preflight consolidation (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: worker init payload validation now happens in Rust before `postMessage`, with a pure Rust test covering the shape contract.
  - `rust/static/webgpu-worker.js`: removed duplicate matrix-cap/init validation branches so the worker stays focused on browser-required compute state only.
- JS→Rust worker protocol simplification (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: worker requests no longer carry JS-owned message-type strings; Rust now sends shape-specific init/score payloads only.
  - `rust/static/webgpu-worker.js`: request dispatch now keys off transferred payload shape (`matrix` vs `query`), and unavailable-score handling returns an empty success payload instead of a JS-specific error string.
- JS→Rust worker init-liveness shift (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: per-runtime worker init state is now tracked in Rust, and cold runtimes auto-init before score dispatch even when app-layer signature policy says reuse is allowed.
  - `rust/static/webgpu-worker.js`: removed the JS-owned `Worker not initialized` guard; remaining logic is compute/state handling required by the worker API.
- JS→Rust worker error-surfacing shift (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: worker `ErrorEvent` handling now owns failure-detail extraction and runtime rejection messaging.
  - `rust/static/webgpu-worker.js`: removed the JS `{ error }` message envelope; exceptions are surfaced as worker errors instead of app-protocol messages.
- JS→Rust worker native-error propagation shift (2026-03-05):
  - `rust/static/webgpu-worker.js`: removed the last JS catch/forward helper; worker exceptions now propagate natively to the Rust-owned `worker.onerror` path.
  - `e2e/tests/e2e/rust-ai-degradation.spec.js`: added a forced worker score-failure regression that asserts native worker error events are surfaced without reintroducing JS `{ error }` protocol messages.
- JS→Rust direct-payload validation shift (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: direct score payload validation now checks `query`/`matrix`/`dim` shape before calling the JS module, with unit coverage for matching query/matrix contracts.
  - `rust/static/webgpu.js`: removed app-protocol input validation/error throws; the module now assumes Rust-validated typed-array inputs.
- WebGPU kernel cleanup hardening (2026-03-05):
  - `rust/static/webgpu.js`: transient compute/readback buffers are now cleaned up in a `finally` path, reducing the risk of leaked browser GPU resources on failed dispatch or readback.
- WebGPU runtime/API surface cleanup (2026-03-05):
  - `rust/crates/dmb_wasm/src/webgpu.rs`: removed unused exported WASM score APIs (`webgpu_scores`, `webgpu_scores_subset`) and their duplicate CPU/subset helpers; app code now relies on direct/worker interop wrappers already used by `dmb_app`.
  - `rust/crates/dmb_wasm/src/webgpu.rs`: earlier fixed-arity window-call interop was eliminated from the direct score path in favor of module import bridge calls.
  - `rust/crates/dmb_wasm/src/webgpu.rs`: added persistent “helpers ready” cache and loaded-path scoring helpers to avoid repeated helper-load checks on hot scoring calls.
  - `rust/crates/dmb_app/src/ai.rs`: switched hot scoring paths to loaded WebGPU helpers and added reusable subset-matrix buffer reuse to reduce allocation churn in subset scoring.
  - `rust/crates/dmb_app/src/ai.rs`: removed extra full-buffer zeroing in subset matrix assembly; each subset row is now written once (copied from source row or zero-filled when invalid).
  - Worker orchestration optimizations in `rust/static/webgpu.js` were superseded by Rust-owned worker runtime orchestration in `dmb_wasm`.

## Current Priorities

1. Keep cutover and pristine gates green while refining Rust-first runtime wrappers.
2. Keep route parity, PWA update behavior, and AI degradation guardrails stable.
3. Keep semantic search hot paths and Rust server helpers optimized without behavior regressions.
4. Keep docs and runbooks synchronized with actual paths/commands.

## Recommended Verification

```bash
bash scripts/pristine-check.sh
bash scripts/pristine-check.sh --with-disk-budget
bash scripts/cutover-rehearsal.sh
```

## Key Paths

- App (SSR + hydrate): `rust/crates/dmb_app/`
- Server: `rust/crates/dmb_server/`
- IndexedDB: `rust/crates/dmb_idb/`
- Pipeline: `rust/crates/dmb_pipeline/`
- E2E: `e2e/`
- Scripts: `scripts/`

## Entry Points

- Docs home: `docs/README.md`
- Docs index: `docs/INDEX.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Token workflow: `docs/guides/TOKEN_CONTEXT_WORKFLOW.md`
