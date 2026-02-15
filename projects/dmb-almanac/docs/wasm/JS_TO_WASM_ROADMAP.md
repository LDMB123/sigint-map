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

## Validation Gates

- WASM parity tests (JS vs WASM output consistency)
- Performance budgets for target routes
- IndexedDB integrity and migration checks
- Cutover and query-plan audits

## Risks and Mitigations

- Boundary overhead > compute gain: use threshold routing + JS fallback.
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
