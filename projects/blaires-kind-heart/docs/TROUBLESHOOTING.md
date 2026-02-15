# Troubleshooting (Operational Summary)

Last updated: 2026-02-15
Full reference: `docs/archive/reference-full/TROUBLESHOOTING.full.md`

## First Response Checklist
1. Reproduce with a clean local run.
2. Run contract gates:
```bash
npm run qa:pwa-contract
npm run qa:runtime
npm run qa:db-contract
```
3. Check latest known state in `docs/APP_STATUS.md` and `docs/STATUS_LEDGER.md`.

## Common Failure Domains
- Prompt sequencing/race conditions in reflection-emotion flows.
- DB persistence mismatch or stale cache behavior.
- Service worker/offline navigation issues.
- Visual or interaction regressions in Safari/WebKit.
- Missing Playwright browser runtime (usually WebKit on fresh machines).

## Useful Diagnostics
- Runtime diagnostics script and E2E contract.
- DB contract checks and related Playwright tests.
- WebKit smoke run:
```bash
npm run test:e2e:webkit
```
- If browser runtime is missing:
```bash
npx playwright install webkit
```

## Escalation
If issue persists after gate checks:
1. Capture exact reproduction steps.
2. Record browser/device context.
3. Add dated entry to `docs/STATUS_LEDGER.md`.
4. Link deep details in archive docs, not active operational docs.
