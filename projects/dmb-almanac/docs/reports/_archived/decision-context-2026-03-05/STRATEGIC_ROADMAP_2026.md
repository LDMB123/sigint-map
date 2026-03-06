# Strategic Roadmap 2026 (Condensed)

Date: 2026-01-30  
Updated: 2026-02-15

## Current Baseline

- Rust-first offline PWA with cutover and parity gates in place.
- Strong quality posture with automated integrity, hygiene, and cutover checks.
- Remaining emphasis: production reliability, performance tightening, and scoped feature growth.

## 2026 Priority Tracks

1. **Stabilization and observability**
- Keep release gates green (`pristine`, cutover, DB query-plan audit).
- Tighten monitoring and error diagnostics for runtime and hydration paths.

2. **Performance and data plane optimization**
- Continue reducing long tasks and query-plan regressions.
- Prioritize index-backed hot paths, deterministic ordering, and bounded cache behavior.

3. **Progressive feature expansion**
- Expand advanced analytics/visualization only when parity + performance budgets hold.
- Keep offline-first constraints as a release gate, not a post-hoc check.

4. **Platform polish and maintainability**
- Prefer native browser primitives where they reduce JS complexity.
- Keep docs/status canonical and token-efficient to support reliable operations.

## Quarterly KPI Targets

| Quarter | Primary KPI Focus |
|---|---|
| Q1 | Stability: low error rate, reliable release gates, improved diagnostics |
| Q2 | Performance: lower route/query latency, predictable hydration behavior |
| Q3 | Feature quality: safe rollout of advanced features with parity preserved |
| Q4 | Scale/readiness: sustained performance under larger datasets and broader usage |

## Risk Controls

- Do not merge large feature work without matching regression tests and gate coverage.
- Any DB/index/query change must pass query-plan and parity checks.
- Any docs/process change that reduces detail must keep auditable evidence pointers.

## Execution Rhythm

- Weekly: run core gates and track regressions.
- Monthly: review KPI deltas and reprioritize backlog.
- Quarterly: re-baseline roadmap against production telemetry and quality trends.

## Canonical Operational References

- Current state: `STATUS.md`
- Cutover operations: `docs/ops/CUTOVER_RUNBOOK.md`
- Token/context workflow: `docs/guides/TOKEN_CONTEXT_WORKFLOW.md`
- DB optimization execution evidence: `docs/reports/_archived/execution-history-2026-03-05/DB_OPTIMIZATION_DEBUG_EXECUTION_PLAN_2026-02-15.md`

## Note

This condensed roadmap replaces a long-form schedule to reduce token overhead while keeping decision-level guidance intact.
