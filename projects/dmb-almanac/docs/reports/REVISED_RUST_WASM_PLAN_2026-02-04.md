# Revised Plan — Rust/WASM‑First Rebuild (Chromium 143 / macOS 26.2)

## Summary
- Keep SvelteKit UI + Node SSR.
- Move read‑only corpus to OPFS bundle + index with explicit versioning.
- Keep Dexie for user data, sync queues, and offline mutation logs.
- WebGPU/WebLLM for generation with retrieval‑only fallback.
- Enforce SIMD for analytics/visualizations; base navigation always works.
 - Add Dexie blocked-upgrade UX + storage health checks as non-negotiables.

## Architectural Decisions
- **Data plane**: OPFS `bundle.json` + `index.json` for read‑only corpus.
- **Dexie**: user data only; no corpus reads.
- **WASM boundary**: ArrayBuffer payloads + schema versioning.
- **RAG**: embeddings + vector search always; generation optional.
- **Storage**: Storage Buckets + `navigator.storage.persist()` after corpus download.

## Phase 0 — Governance & Baselines
- Feature freeze (bug/security/perf only).
- Record baselines: LCP, INP, CLS, WASM size, memory footprint.
- Weekly checkpoints with rollout and rollback criteria.

## Phase 1 — Deep Audit + Map
- Deep code audit (security/perf/quality/PWA/IDB).
- JS elimination map with replacement plan per module.
- Native API replacement list (speculation rules, view transitions, OPFS, web locks).
 - Re-run E2E in preview mode for PWA/wasm validation.

## Phase 1.5 — Data Durability Hardening
- Add Dexie `blocked` upgrade handler + user prompt.
- Add OPFS bundle integrity verification + version guardrails.
- Define fast-path for preview/E2E builds (skip compression when allowed).

## Phase 2 — Data Plane Migration
- Versioned bundle generation with checksum + schema header.
- OPFS reader with:
  - checksum verification
  - network fallback
  - storage pressure cleanup
- Explicit migration path for bundle versions.

## Phase 3 — WASM Boundary
- Consolidate crates into `wasm-core` with feature flags.
- Standardize lifecycle: `init`, `ready`, `dispose`, `call`.
- Worker execution for heavy aggregations.

## Phase 4 — RAG Pipeline
- WebLLM integration with 1–2B quantized model.
- Retrieval‑only fallback always available.
- Deterministic evaluation set with citations.

## Phase 5 — PWA + Storage
- Storage Buckets for corpus + model.
- Auto‑request persistent storage after download.
- Storage pressure cleanup policies.

## Phase 6 — Performance + Apple Silicon
- Enforce compositor budget.
- Prefer GPU‑safe CSS animations.
- Route‑level SIMD gating.
 - Reduce rAF/timer churn; centralize timer lifecycle.

## Phase 7 — Testing + Acceptance
- WASM SIMD tests for analytics routes.
- RAG test set with citations.
- Offline installability tests for corpus + model.
- Storage pressure simulation tests.
 - E2E preview pass required for PWA spec on Chromium.

## Phase 8 — UI/UX Rebuild Prep
- Inventory high-LOC routes and consolidate summary strip patterns.
- Normalize typography scale + spacing tokens before redesign.
- Establish a11y test baseline (Playwright + axe).
- See `docs/guides/UI_UX_MIGRATION_CHECKLIST.md` for route/component sizing guidance.

## Test Cases
- SIMD required for analytics routes, base nav works without SIMD.
- OPFS bundle lookup correctness for slug + year.
- RAG returns citations for known prompts.
- Storage eviction triggers fallback + UI warning.

## Devil’s Advocate Constraints (Must‑Have)
- Dexie retained for user data; OPFS for read‑only corpus.
- Retrieval‑only fallback always functional.
- OPFS bundle must be versioned + checksummed.
- Avoid JS elimination that breaks a11y or navigation.
 - Multi-tab upgrade safety (Dexie blocked UX) required before rollout.

## Skill Recommendations (from Skill Recommender)
- `/perf-audit` for Core Web Vitals regressions
- `/bundle-audit` for JS surface reduction
- `/memory-debug` for long‑lived timers and leaks
- `/a11y-audit` for rebuild QA
- `/security-audit` for PWA + storage surface
- `/lighthouse` to lock budgets
- `/e2e-test-debug` for Playwright stability
 - `/ui-designer` and `/ux-designer` for the rebuild
 - `/design-lead` to unify design system decisions

## Acceptance Criteria
- LCP < 1.0s, INP < 100ms, CLS < 0.05 on Chromium 143/M‑series.
- Corpus loads offline with OPFS bundle.
- RAG retrieval works offline without LLM.
- No non‑serializable SSR responses.
