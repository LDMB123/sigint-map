# Troubleshooting (Operational Summary)

Last updated: 2026-03-04
Full reference: `docs/archive/reference-full/TROUBLESHOOTING.full.md`

## First Response Checklist
1. Reproduce with a clean local run.
2. Run contract gates:
```bash
npm run qa:pwa-contract
npm run qa:runtime
npm run qa:db-contract
npm run qa:index-shell-deep
```
3. Check latest known state in `docs/STATUS_LEDGER.md`.

## Common Failure Domains
- Prompt sequencing/race conditions in reflection-emotion flows.
- DB persistence mismatch or stale cache behavior.
- Service worker/offline navigation issues.
- Visual or interaction regressions in Safari/WebKit.
- Missing Playwright browser runtime (usually WebKit on fresh machines).

## Useful Diagnostics
- Runtime diagnostics script and E2E contract.
- DB contract checks and related Playwright tests.
- Index-shell contract matrix checks and negative mutation checks (`qa:index-shell-deep`).
- WASM target tests:
```bash
cargo test --target wasm32-unknown-unknown
```
- Release minifier verification (use after `wasm-init.js` / bindgen target edits):
```bash
npm run build:verify:release
```
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

## Known WASM/Loader Failure Signature
- `Failed to minify JS: RequiredTokenNotFound(Identifier) [token=Some(KeywordDefault)]`
  - Cause: Trunk minifier parser hitting `wasm-bindgen` web-target default export shape.
  - Current fix: keep rust link on `data-bindgen-target="no-modules"` and ensure `blaires-kind-heart.js` loads before `wasm-init.js`.
- `This document requires 'TrustedScriptURL' assignment`
  - Cause: dynamic `script.src` assignment under Trusted Types CSP.
  - Current fix: static script include in `index.html` for bindgen JS.

## Known Apple-Silicon/iPad Runtime Signatures
- Hidden-tab timer drift in games (scores/time jumps after returning to tab)
  - Cause: timer/RAF callbacks continue to accumulate when document hidden.
  - Current fix: use `browser_apis::is_document_visible()` guard in Memory/Hug interval callbacks and Catcher RAF loop.
- Confetti/GPU path jank on iPad mini profile
  - Cause: high per-particle trig/sparkle cost and full-resolution render load.
  - Current fix: iPad profile sets lower GPU canvas scale and low-power particle uniforms (`sparkle_strength=0.0`, `rotation_enabled=0.0`).
