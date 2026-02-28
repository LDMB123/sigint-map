# iPad Regression Checklist Run (2026-02-13)

Source checklist: `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/docs/DEPLOYMENT_CHECKLIST.md`

## Scope
This run executes all automatable checklist items from the current workstation and isolates the remaining physical-device items that require an iPad mini 6.

## Automated Preflight Results

| Item | Command / Evidence | Result |
|---|---|---|
| Production build | `NO_COLOR=true trunk build --release` | PASS |
| Core dist files present | `dist/index.html`, `dist/sw.js`, `dist/sw-assets.js`, `dist/db-worker.js`, `dist/wasm-init.js` | PASS |
| Companion assets count | `ls -1 dist/assets/companions/*.webp | wc -l` = `18` | PASS |
| Garden assets count | `ls -1 dist/assets/gardens/*.webp | wc -l` = `60` | PASS |
| Max WebP size | `find dist/assets -name '*.webp' ...` = `80228` bytes | PASS |
| Precache includes key files | `dist/sw-assets.js` includes `gardens.css`, `scroll-effects.css`, `particle-effects.css`, `index.html`, `wasm-init.js` | PASS |
| Deployment header config | `deploy/docker/nginx.conf` and `deploy/kubernetes/nginx-config.yaml` include COOP/COEP/CORP + permissions + no-cache for SW-critical files | PASS |
| `pwa:health` managed server mode | `npm run pwa:health` | FAIL (port `4173` conflict, then offline navigation failure) |
| `pwa:health` explicit server mode | `npm run pwa:health -- http://127.0.0.1:4192` (and `:4193`) | FAIL (`offline-enable-context` timeout) |
| Size budget check from checklist | `du -sh dist` = `108M`, `du -sh dist/assets` = `53M` | FAIL vs listed `<10MB` target in checklist |

## Notes on Failing Automated Checks
1. `pwa:health` currently fails in this environment in offline phase. It does complete early phases (launch, load, manifest check) but times out during offline context transition.
2. The deployment checklist size target appears outdated relative to current bundled assets and runtime surface.

## Physical iPad Regression Steps (Pending)

Status: `PENDING (device required)`

1. Deploy `dist/` to iPad mini 6 (recommended via local HTTP serving).
2. Validate initial load and UX:
   - Load <5s.
   - Companion renders.
   - Navigation and styling are correct.
3. Validate service worker and offline:
   - SW activated.
   - Cache storage populated.
   - Airplane mode reload works.
4. Validate core flows:
   - Companion interaction.
   - Gardens panel.
   - Log kind act + persistence after force-quit.
   - Back/forward nav (10+ transitions).
5. Validate performance on device:
   - Interaction responsiveness (<200ms feel target).
   - No visible flicker/jank.
   - No memory warnings.

## Xcode-Assisted Device Pass (Optional but Helpful)
1. Connect iPad to Mac and trust the device.
2. Use Safari Develop menu for live Web Inspector against iPad Safari.
3. Use Xcode `Window > Devices and Simulators` for device logs and diagnostics capture while running the app.
4. Record observations and attach them to this file or `docs/STATUS_LEDGER.md`.

## Conclusion
Automated preflight is mostly green except for:
1. `pwa:health` offline-phase failures.
2. Checklist size-budget mismatch.

Physical iPad validation remains required to close deployment confidence.
