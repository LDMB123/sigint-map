# Token Economy Report

Last updated: 2026-02-14
Scope: active documentation set in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart`.

## Current Findings
- Active-doc token footprint is now below the target budget.
- Major reduction came from compressing active deep-debug/domain docs and archiving full historical narratives.
- Status and evidence are centralized in `APP_STATUS.md` and `STATUS_LEDGER.md`.

## Current Metrics (`npm run token:baseline`)
| Metric | Value |
|---|---:|
| Active files | 27 |
| Active bytes | 48,023 |
| Active est. tokens | 12,005 |
| Archive files | 75 |
| Archive bytes | 733,421 |
| Archive est. tokens | 183,355 |

## Decision Summary
1. Keep operational docs concise and current-cycle focused.
2. Move long historical detail to `docs/archive/` by default.
3. Treat token baseline as a release-quality signal for documentation maintainability.

## Follow-Up
1. Monitor drift when adding new feature docs.
2. Re-baseline after large doc additions and update token governance docs.
