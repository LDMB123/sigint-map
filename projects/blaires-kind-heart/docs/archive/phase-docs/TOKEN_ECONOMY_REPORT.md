# Token Economy Report

Last updated: 2026-02-15
Scope: active documentation set in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart`.

## Current Findings
- Active-doc token footprint is now below target after summary+archive consolidation.
- Duplicate active test/report documents and full heavy references were archived in this reorganization pass.
- Status and evidence are now centralized in `PROJECT_STANDING.md`, `APP_STATUS.md`, and `STATUS_LEDGER.md`.

## Current Metrics (`npm run token:baseline`)
| Metric | Value |
|---|---:|
| Active files | 31 |
| Active bytes | 97,861 |
| Active est. tokens | 24,465 |
| Archive files | 83 |
| Archive bytes | 774,662 |
| Archive est. tokens | 193,665 |

## Decision Summary
1. Keep operational docs concise and current-cycle focused.
2. Move long historical detail to `docs/archive/` by default.
3. Treat token baseline as a release-quality signal for documentation maintainability.
4. Keep only index files in `docs/testing/` and `docs/reports/`; store deep dives in archive.
5. Enforce budget in CI via `npm run qa:docs-budget`.

## Follow-Up
1. Keep active docs below 25k estimated tokens.
2. Run `npm run token:baseline` after every doc structure change.
3. Keep only one canonical status narrative (`PROJECT_STANDING.md`).
