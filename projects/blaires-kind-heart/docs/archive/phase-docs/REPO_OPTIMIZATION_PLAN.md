# Repository Optimization Plan

- Archive Path: `docs/archive/phase-docs/REPO_OPTIMIZATION_PLAN.md`
- Normalized On: `2026-03-04`
- Source Title: `Repository Optimization Plan`

## Summary
Last updated: 2026-02-14

## Context
Last updated: 2026-02-14
Status: Active
Owner: Engineering

### Goal
Reduce repo complexity and documentation drift while preserving release confidence.

### Current Snapshot
- Gate reliability: strong (all core checks passing in latest cycle).
- Documentation consistency: improved in this pass.
- Token budget: under target (`12,005` active estimated tokens).

### Workstreams
1. Source-of-truth hygiene
2. Documentation lifecycle management
3. Gate and CI reliability
4. Artifact discipline

### Priority Backlog

### P0
- [x] Add explicit SW registration telemetry signal (remove `no-log-signal` warning ambiguity).
- [ ] Execute physical iPad validation for current gate cycle.

### P1
- [x] Move long historical active docs to archive partitions.
- [x] Keep active docs under `<=30k` estimated tokens.

### P2
- [ ] Tighten docs freshness rules and ownership cadence.

### Success Criteria
- Active docs remain current and contradiction-free.
- All release-critical gates remain green.
- Active docs token baseline stays under target.

## Actions
_No actions recorded._

## Validation
_Validation details not recorded._

## References
_No references recorded._

