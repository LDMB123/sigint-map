# Project Handoff

Last updated: 2026-02-15
Audience: incoming coding agents and engineers taking over active maintenance.

## 10-Minute Takeover
1. Read current state:
   - `docs/PROJECT_STANDING.md`
   - `docs/APP_STATUS.md`
   - `docs/STATUS_LEDGER.md`
2. Install test browsers (new machine only):
```bash
npx playwright install chromium webkit
```
3. Run baseline gates:
```bash
npm run qa:pwa-contract
npm run qa:runtime
npm run qa:db-contract
npm run test:e2e:all
npm run qa:docs-links
npm run qa:docs-budget
```

## Current Reality
- Core E2E: `39 passed`, `1 skipped`
- Cross-browser E2E: `40 passed`, `1 skipped`
- Doc budget: PASS (`active_est_tokens=24465`, budget `25000`)
- Known open operational gap: physical iPad mini 6 regression rerun pending for this cycle.

## Canonical Sources of Truth
- High-level project state: `docs/PROJECT_STANDING.md`
- Latest gate snapshot: `docs/APP_STATUS.md`
- Command evidence log: `docs/STATUS_LEDGER.md`
- Docs map and organization rules: `docs/INDEX.md`

## If You Change Runtime Behavior
1. Re-run:
```bash
npm run test:e2e
npm run test:e2e:all
```
2. Update:
   - `docs/APP_STATUS.md`
   - `docs/PROJECT_STANDING.md`
   - `docs/STATUS_LEDGER.md`
3. Keep docs budget green:
```bash
npm run qa:docs-links
npm run qa:docs-budget
```

## If a Gate Fails
- Use `docs/TROUBLESHOOTING.md` first.
- Keep deep-dive writeups in `docs/archive/` and link from active docs.
- Record a concise dated entry in `docs/STATUS_LEDGER.md`.
