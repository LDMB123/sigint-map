# Devil’s Advocate Review — Rust/WASM Rebuild Decisions (2026-02-04)

## Executive Summary
This review stress-tests the Rust/WASM-first strategy and the Dexie + OPFS hybrid data plane. The plan is sound but fragile in three places: data durability and versioning, deterministic offline inference, and UX regressions from deep JS reduction. Below are failure modes and mitigations.

## 1) Dexie vs OPFS/WASM Data Plane
### Arguments Against Keeping Dexie
- **Duplication risk**: A split data plane (OPFS for corpus, Dexie for user data) multiplies failure modes.
- **Upgrade complexity**: Dexie migrations in multi-tab scenarios are error-prone (blocked upgrades, timeouts).
- **Performance tax**: IndexedDB query overhead remains for user data even if corpus moves to OPFS.

### Arguments Against Removing Dexie
- **User data needs transactions**: Sync queues, writes, and rollbacks are simpler and safer in Dexie.
- **OPFS write API is low-level**: No built-in schema or transactional semantics.
- **Ecosystem**: Dexie tooling and battle-tested patterns reduce risk.

### Devil’s Advocate Verdict
- **Keep Dexie for user data only**, but enforce hard boundaries:
  - OPFS for read-only corpus and RAG index.
  - Dexie for user data + sync logs + preferences.
- **Non-negotiable**: introduce explicit storage health checks and cross-tab upgrade UX.

## 2) RAG On-Device Only
### Risks
- **Model downloads** are large and fragile under storage pressure.
- **WebGPU availability** is not guaranteed across all Chromium 143 configurations.
- **Determinism**: Local model answers can drift across versions.

### Mitigations
- Retrieval-only mode always available.
- Download gating + resumable fetch; never block app if model absent.
- Model version pinning + semantic hash per dataset bundle.

## 3) “JS Reduction” Goal
### Risks
- **Over-optimization**: forcing WASM for UI-adjacent logic increases complexity.
- **Debuggability**: WASM/worker stacks are harder to inspect for UX regressions.
- **Accessibility**: JS removal can accidentally remove keyboard/focus flows if UI glue is lost.

### Mitigations
- JS allowed for UI orchestration and a11y utilities.
- WASM only for compute-intensive data transforms.
- Maintain a “JS safety net” fallback for core navigation.

## 4) OPFS Bundle Format
### Risks
- JSON bundles can bloat memory and GC pressure.
- Index JSON can be large and slow to parse on cold start.

### Mitigations
- Transition to binary + index offsets (e.g., FlatBuffers / bespoke binary schema).
- Progressive loading with partial in-memory indices.

## 5) WebGPU & SIMD Gating
### Risks
- Hard SIMD gating could reduce accessibility on older/locked-down hardware.
- WebGPU failures can degrade assistant UX unexpectedly.

### Mitigations
- Hard-gate only analytics/visualization routes.
- Provide UI-level capability badges and fallback UX.

## 6) PWA Advanced APIs
### Risks
- File handlers + protocol handlers are brittle across OS states.
- Share targets and launch handlers can fail silently.

### Mitigations
- Add analytics events for launch handler failures.
- Provide UI-based import path for CSV/JSON as fallback.

## 7) Background Timers & Long-Lived Tasks
### Risks
- `setInterval`/`setTimeout` are used broadly (telemetry, offline queues, cache warming).
- Memory/perf regressions can hide in “always-on” intervals and rAF loops.

### Mitigations
- Centralize timer ownership with explicit teardown.
- Require per-module lifecycle docs for timers (create/clear).

## 8) UI/UX Rebuild Risk
### Risks
- Large route components + unused CSS selectors indicate UI drift.
- Rebuild can break non-obvious a11y/focus flows if JS glue is removed.

### Mitigations
- Inventory UI patterns (summary strips, stats grids) and consolidate before redesign.
- Keep a11y helpers as first-class JS “exceptions” during JS reduction.

## Bottom Line
The rebuild is viable if it remains **hybrid**: WASM for heavy compute, OPFS for corpus, Dexie for user data. A pure WASM/OPFS replacement for Dexie would likely increase operational risk without clear upside.
