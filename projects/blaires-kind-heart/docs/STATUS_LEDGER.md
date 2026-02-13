# Status Ledger

Last updated: 2026-02-13
Purpose: concise evidence and change log for current app status.

## Latest Verified Validation Entries
| Date | Command | Result | Key Output |
|---|---|---|---|
| 2026-02-13 | `NO_COLOR=true trunk build --release` | PASS | Build complete; companions `18`, gardens `60` |
| 2026-02-13 | `npm run pwa:health` | FAIL | Managed server path failed in offline phase (`ERR_CONNECTION_REFUSED`) |
| 2026-02-13 | `npm run pwa:health -- http://127.0.0.1:4192` | FAIL | Offline phase timed out at `offline-enable-context` |
| 2026-02-13 | `bash .trunk/asset-manifest.sh` | PASS | Generated JS+JSON manifests, cache version `30efafb40fef0605` |
| 2026-02-13 | `trunk build && npm run pwa:health` | PASS | `ok: true`, offline mode `managed-server-stop`, hash `#panel-tracker` |
| 2026-02-13 | `npm run test:e2e:all` | PASS | `36 passed` |
| 2026-02-13 | `npm run test:e2e:webkit` | PASS | `4 passed` |
| 2026-02-13 | `npm run token:baseline` | PASS | active docs `19`, active est tokens `22446` |

## Notable Test Signal
- A first `npm run test:e2e:all` run in this session had one WebKit smoke failure, followed by a clean re-run (`36 passed`).
- Current iPad regression preflight run is documented in `docs/IPAD_REGRESSION_RUN_2026-02-13.md` with physical-device steps still pending.

## Change Entries
| Date | Change | Status |
|---|---|---|
| 2026-02-13 | Refactored `scripts/pwa-health-check.mjs` to managed-server + fallback offline modes | Implemented and validated |
| 2026-02-13 | Added `scripts/token-doc-baseline.mjs` + `npm run token:baseline` | Implemented and validated |
| 2026-02-13 | Archived non-core docs to reduce active context | Completed |

## Current Token Baseline
- Active docs: 19 files, 89,784 bytes, ~22,446 estimated tokens.
- Archive docs: 74 files, 704,119 bytes, ~176,029 estimated tokens.

## Next Validation Queue
1. Re-run `npm run test:e2e:all` after next runtime-affecting change.
2. Re-run `npm run pwa:health` after service worker or manifest changes.
3. Re-run `npm run token:baseline` after documentation topology changes.
