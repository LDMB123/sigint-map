# JS -> WASM / Native API Roadmap (Condensed)

## Goal

Move high-cost compute out of main-thread JS when it improves performance without harming offline reliability or debuggability.

## Decision Rules

Use **WASM** when work is deterministic, compute-heavy, and reusable across routes.  
Use **native browser APIs** when platform primitives can replace JS complexity.  
Keep in **JS** when logic is UI-orchestration-heavy and boundary costs outweigh gains.

## Current Status

- Core data integrity and parity guardrails are in place.
- Worker-routed paths exist for expensive operations.
- Runtime bootstrap moved to Rust hydrate (service worker + WebGPU preload).
- `dmb_app::ai` now routes browser interop through Rust wrappers in `dmb_wasm` (no app-layer direct JS FFI bindings for probe/warm/limits/scores).
- WebGPU probe/warm decisions are Rust-owned and no longer require dedicated JS globals.
- IndexedDB/search/index tuning work is active and should remain performance-gated.

## Migration Phases

1. **Integrity-first guardrails**
- Keep sync/parity checks mandatory before optimization claims.

2. **High-ROI WASM targets**
- Focus on deterministic precompute workloads (graph/layout/binning/projection).
- Require JS fallback + parity tests for each WASM path.

3. **Native API simplification**
- Replace JS-heavy UI plumbing with modern browser primitives where safe.

4. **IndexedDB hot-path hardening**
- Remove scan-heavy hot paths; prefer index-backed retrieval and bounded caches.

5. **Platform-specific performance polish**
- Reduce main-thread contention and improve rendering consistency.

## Completed in Current Wave

- Rust-owned hydration bootstrap for service worker registration.
- Rust-triggered lazy WebGPU helper loading.
- Consolidated WebGPU interop wrappers in `dmb_wasm`.
- Fixed inline JS bridge helpers now replace reflection-based interop in the direct/worker score paths.
- Full and subset GPU top-k reduction now happens in the shared JS helper `dmbTopKScores`, so Rust only pulls back the winners.
- Worker matrix-init reuse remains Rust-owned via `WebgpuMatrixJsSignature`.
- Preserved route contracts for diagnostics in lite/full builds.

## Remaining JS-Bound Surfaces

- `rust/static/webgpu.js` and `rust/static/webgpu-worker.js` still contain GPU pipeline kernels and worker compute handlers (required by browser API surface).
- Worker lifecycle, request timeout, and fallback policy decisions now live in Rust (`dmb_wasm`), not helper JS globals.
- Worker init payload validation and size gating now live in Rust as well; the remaining JS worker logic is compute/state glue required by the browser worker API.
- Worker request kind is now inferred from Rust-built payload shape instead of JS message-type strings.
- Worker cold-start init liveness is also Rust-owned per runtime instance.
- Worker exception classification now routes through Rust-owned worker error events instead of JS-posted error messages.
- The remaining worker JS no longer contains a catch-and-forward error helper.
- Native worker-error propagation is now covered by degradation E2E with a forced score failure, reducing the risk of silently reintroducing JS-side error-envelope plumbing.
- Direct WebGPU score payload validation now lives in Rust, not in the JS kernel module.
- Service worker script (`rust/static/sw.js`) remains JavaScript by platform design.

## Next Rust-First Steps

1. Keep shrinking browser helpers to compute-kernel concerns only (avoid reintroducing globals or policy/state into JS).
2. Continue reducing optional diagnostics payload in production-lite builds without changing route URLs.
3. Keep worker telemetry/fallback signals sourced from Rust policy events.

## Validation Gates

- WASM parity tests (JS vs WASM output consistency)
- Performance budgets for target routes
- IndexedDB integrity and migration checks
- Cutover and query-plan audits

## Risks and Mitigations

- Boundary overhead > compute gain: use threshold routing + Rust-managed direct fallback.
- Data integrity regressions: enforce parity/integrity gates pre-merge.
- Debuggability loss: keep fallbacks and explicit test coverage.
- WASM artifact growth: lazy load and keep module boundaries small.

## Success Metrics

- Fewer long tasks on visualization-heavy routes.
- Faster heavy aggregations on large datasets.
- No regression in offline behavior, parity, or migration safety.

## Canonical References

- Current status: `STATUS.md`
- Cutover gate: `docs/ops/CUTOVER_RUNBOOK.md`
- DB optimization evidence: `docs/migration/AUTONOMOUS_DATABASE_DEBUG_OPTIMIZATION_PLAN_2026-02-14.md`

## Note

This condensed roadmap replaces a long execution narrative with decision-focused guidance and validation criteria.
