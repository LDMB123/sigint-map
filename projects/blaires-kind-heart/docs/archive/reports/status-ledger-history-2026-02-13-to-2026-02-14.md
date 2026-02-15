# Status Ledger History (2026-02-13 to 2026-02-14)

Archived from active `docs/STATUS_LEDGER.md` on 2026-02-15 to keep active docs focused on current-cycle status.

## Validation Entries
| Date | Command | Result | Key Output |
|---|---|---|---|
| 2026-02-14 | `node --check public/runtime-diagnostics.js` | PASS | No syntax/runtime parse errors |
| 2026-02-14 | `node --check public/db-worker.js` | PASS | No syntax/runtime parse errors |
| 2026-02-14 | `npm run qa:pwa-contract` | PASS | `ok: true`, offline mode `managed-server-stop`, hash `#panel-tracker` |
| 2026-02-14 | `npm run qa:runtime` | PASS | `1 passed` |
| 2026-02-14 | `npm run qa:db-contract` | PASS | `2 passed` |
| 2026-02-14 | `npm run token:baseline` | PASS | active docs `38`, active est tokens `54233` |
| 2026-02-13 | `NO_COLOR=true trunk build --release` | PASS | Build complete; companions `18`, gardens `60` |
| 2026-02-13 | `npm run pwa:health` | FAIL | Managed server path failed in offline phase (`ERR_CONNECTION_REFUSED`) |
| 2026-02-13 | `npm run pwa:health -- http://127.0.0.1:4192` | FAIL | Offline phase timed out at `offline-enable-context` |
| 2026-02-13 | `bash .trunk/asset-manifest.sh` | PASS | Generated JS+JSON manifests, cache version `30efafb40fef0605` |
| 2026-02-13 | `trunk build && npm run pwa:health` | PASS | `ok: true`, offline mode `managed-server-stop`, hash `#panel-tracker` |
| 2026-02-13 | `npm run test:e2e:all` | PASS | `36 passed` |
| 2026-02-13 | `npm run test:e2e:webkit` | PASS | `4 passed` |
| 2026-02-13 | `npm run token:baseline` | PASS | active docs `19`, active est tokens `22446` |

## Historical Change Entries
| Date | Change | Status |
|---|---|---|
| 2026-02-13 | Refactored `scripts/pwa-health-check.mjs` to managed-server + fallback offline modes | Implemented and validated |
| 2026-02-13 | Added `scripts/token-doc-baseline.mjs` + `npm run token:baseline` | Implemented and validated |
| 2026-02-13 | Archived non-core docs to reduce active context | Completed |
