# Database Optimization + Debug Execution Plan (Condensed)

Date: 2026-02-15  
Updated: 2026-02-15

## Objective

Track execution of the highest-impact DB optimization/debug tasks and confirm completion with explicit gates.

## Scope

- Route parity/coverage hardening
- `/api/data-parity` degraded-path coverage
- CI query-plan guardrail integration
- Cutover E2E expansion for DB-relevant routes
- Debug hardening (logging, startup checks, source-map coverage)

## Completion Status

All tracked phases and follow-up tasks were completed and revalidated.

## Delivered Outcomes

- Route parity sources/fixtures aligned with active routes
- `dmb_server` parity endpoint tests expanded for unavailable and partial-schema scenarios
- CI and local optimization loops enforce query-plan audits
- Cutover E2E expanded and aligned between local and remote scripts
- Server startup fails fast when required static assets are missing
- Source-map generation/verification added and enforced in build + cutover checks

## Verification Commands

```bash
cargo test -p dmb_server
cargo test -p dmb_app --features ssr --test route_parity
cargo test -p dmb_app --features ssr --test route_render
bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db
bash scripts/cutover-rehearsal.sh
```

## Verification Evidence (Compact)

| Date | Gate | Evidence Artifact |
|---|---|---|
| 2026-02-15 | `cargo test -p dmb_server` | server test pass output |
| 2026-02-15 | `cargo test -p dmb_app --features ssr --test route_parity` | route parity pass output |
| 2026-02-15 | `cargo test -p dmb_app --features ssr --test route_render` | route render pass output |
| 2026-02-15 | `bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db` | query-plan audit pass |
| 2026-02-15 | `bash scripts/cutover-rehearsal.sh` | cutover gate + E2E pass output |

## Notes

Detailed historical step-by-step logs were removed to reduce token overhead. For current operational state, use `STATUS.md`.
