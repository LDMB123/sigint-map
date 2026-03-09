# PR Request: End-to-End Debug Sweep Across the Rust/WASM/PWA Stack

## Proposed Title

`debug: run full-codebase stability and runtime investigation across Rust, WASM, PWA, and pipeline paths`

## Summary

This PR should perform a focused debug sweep across the active DMB Almanac codebase, which is now a Rust-first offline PWA spanning `dmb_app`, `dmb_wasm`, `dmb_idb`, `dmb_server`, `dmb_pipeline`, and `xtask`.

The goal is not a broad refactor. The goal is to find, reproduce, isolate, and fix correctness, runtime, performance-regression, and integration issues that could affect:

- Rust workspace verification
- WASM hydration behavior
- IndexedDB/runtime data integrity
- PWA install/offline/update behavior
- AI/WebGPU fallback and recovery paths
- pipeline artifact generation and server parity

## Problem Statement

The repo has strong quality gates, but current status still shows one active runtime budget failure:

- `cargo run -p xtask -- check-import-perf --report ../docs/wasm/rust-import-perf.json`
- current failure reason: adaptive cold-import average remains above the configured `43,000 ms` budget

This PR should use that known budget miss as one anchor, then widen the investigation to cover the full active stack so regressions are found before release-sensitive work continues.

## Scope

Debug and verify the active Rust-first app only. Stay within this repository and treat older JS/Svelte-era references as historical unless explicitly required for comparison.

Primary code areas:

- `rust/crates/dmb_app`
- `rust/crates/dmb_wasm`
- `rust/crates/dmb_idb`
- `rust/crates/dmb_server`
- `rust/crates/dmb_pipeline`
- `rust/crates/xtask`
- `e2e/`
- `scripts/`

## Required Investigation Areas

1. Workspace health
   - reproduce any failing `cargo check`, `cargo test`, `cargo clippy`, or `xtask verify` paths
   - fix root causes, not just symptoms

2. Hydration and WASM runtime
   - confirm hydrate build succeeds and browser boot does not regress
   - inspect startup timing, deferred imports, and browser diagnostics exposed through `__DMB_STARTUP_METRICS`

3. Import and data pipeline
   - reproduce the cold-import budget miss
   - identify whether the bottleneck is fetch overlap, IndexedDB writes, chunk handling, post-import maintenance, or instrumentation noise
   - fix the issue or clearly document the blocking cause with measured evidence

4. IndexedDB and parity paths
   - verify data integrity, migration safety, and runtime bundle parity
   - confirm no obvious transaction deadlocks, stale cache paths, or integrity mismatches

5. PWA behavior
   - validate service worker registration, update flow, installability, and offline navigation for key routes
   - check that startup changes did not regress offline readiness

6. AI and WebGPU reliability
   - verify fallback to CPU-safe behavior when GPU/device init is unavailable
   - verify retry/recovery logic after transient adapter/device failures
   - confirm worker reuse and diagnostics remain correct after recent module splits

7. Server/runtime integration
   - verify `dmb_server` still serves the expected health/parity surface
   - confirm generated static artifacts and runtime SQLite expectations remain aligned

## Expected Deliverables

- fixes for any confirmed defects found during the sweep
- updated tests where behavior was previously unprotected
- updated docs only where the current instructions are wrong or incomplete
- a short evidence summary in the PR body covering:
  - what was reproduced
  - what was fixed
  - what remains open
  - what was verified

## Acceptance Criteria

This PR is complete only if all of the following are true:

- `bash scripts/pristine-check.sh` passes
- `cd rust && cargo run -p xtask -- verify` passes
- `bash scripts/cutover-rehearsal.sh` passes, or any remaining failure is narrowed to a clearly documented known blocker
- hydrate/package checks pass:
  - `cd rust && cargo run -p xtask -- build-hydrate-pkg`
  - `bash scripts/check-wasm-size.sh`
- focused runtime checks pass:
  - `cargo check -p dmb_app --features hydrate`
  - `cargo test -p dmb_app --features hydrate`
  - `cargo test -p dmb_wasm`
  - `cargo test -p dmb_idb`
- the import-perf budget failure is either fixed or reduced to a well-evidenced, explicitly documented follow-up with measurements
- no new warnings are introduced in workspace lint or tests

## Suggested Validation Commands

```bash
bash scripts/pristine-check.sh
cd rust && cargo fmt --all
cd rust && cargo clippy --workspace --all-targets --all-features -- -D warnings
cd rust && cargo test --workspace --locked
cd rust && cargo run -p xtask -- verify
cd rust && cargo run -p xtask -- build-hydrate-pkg
bash scripts/check-wasm-size.sh
cd rust && cargo run -p xtask -- check-import-perf --report ../docs/wasm/rust-import-perf.json
bash scripts/cutover-rehearsal.sh
```

## Notes For The Assignee

- Prioritize reproducible failures over speculative cleanup.
- Keep fixes small and attributable.
- If a bug is not fixed, leave concrete evidence: exact command, exact failure, affected crate/path, and next action.
- Do not broaden this into an architectural rewrite.

## Copy-Paste PR Body

```md
## Summary

Run an end-to-end debug sweep across the active Rust/WASM/PWA stack to reproduce and fix stability, integration, and performance issues across `dmb_app`, `dmb_wasm`, `dmb_idb`, `dmb_server`, `dmb_pipeline`, and `xtask`.

## Why

- Current repo status is strong, but there is still an open import-performance budget failure.
- Recent module splits and startup/import changes need a full regression pass across runtime, offline, AI/WebGPU, and pipeline paths.
- This PR is intended to fix confirmed defects and tighten verification, not do a broad refactor.

## Scope

- Rust workspace verification
- WASM hydration and startup diagnostics
- IndexedDB integrity and parity
- service worker, installability, and offline flows
- AI/WebGPU fallback and recovery
- pipeline artifact generation and server parity

## Acceptance Criteria

- `bash scripts/pristine-check.sh`
- `cd rust && cargo run -p xtask -- verify`
- `cd rust && cargo run -p xtask -- build-hydrate-pkg`
- `bash scripts/check-wasm-size.sh`
- `cd rust && cargo run -p xtask -- check-import-perf --report ../docs/wasm/rust-import-perf.json`
- `bash scripts/cutover-rehearsal.sh`

## Deliverables

- fixes for confirmed defects
- tests added or updated where needed
- docs updated only if current guidance is inaccurate
- PR evidence summary listing reproduced issues, fixes, remaining blockers, and validation results
```
