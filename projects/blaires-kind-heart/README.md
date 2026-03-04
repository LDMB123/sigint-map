# Blaire's Kind Heart

Offline-first kindness PWA for a young child, built with Rust/WASM plus browser-native PWA features.

Target platform: iPad mini 6 (A15, 4GB RAM), iPadOS 26.2, Safari 26.2.

## Start Here
- Fast takeover runbook: `docs/HANDOFF.md`
- QA gate results and work history: `docs/STATUS_LEDGER.md`
- Full documentation map: `docs/INDEX.md`
- Workspace markdown map: `docs/WORKSPACE_DOCS_MAP.md`

## Current Standing (verified on 2026-03-04)
- Phase 4 index-shell modernization pass applied:
  - panel registry boot migrated from global coupling to ESM dynamic import with fallback retention
  - top-level home buttons moved to config-owned generated block with explicit home markers
  - stale home-entry selectors removed from CSS/Rust boot path; tracker home badge wired to live hearts-today state
  - init-time WebGPU buffer mapping added for particle/uniform buffers on Apple-Silicon path
- Final deep Apple-Silicon pass applied:
  - iPad mini 6 low-power GPU particle path (shader sparkle/rotation guards + iPad profile defaults)
  - Catcher spawn scheduling moved fully to RAF accumulator (interval removed)
  - Visibility-aware timer guards in Memory/Hug/Catcher loops
- Follow-up CSS Apple-Silicon optimization pass applied:
  - Progress-style fills moved from `width` animation to compositor-friendly `transform: scaleX(...)` for tracker, quests, gardens, and hug meter
  - Quest zero-state marker switched from inline-style matching to `data-progress-zero` attribute logic
  - Hug interaction handlers hardened with `try_borrow_mut()` in hot paths to prevent `RefCell` panic under rapid interaction
- PWA contract check: PASS (`npm run qa:pwa-contract`)
- WebKit smoke: PASS (`npm run test:e2e:webkit`)
- Rust wasm32 compile gate: PASS (`cargo check --target wasm32-unknown-unknown`)
- Runtime diagnostics check: PASS (`npm run qa:runtime`)
- DB contract check: PASS (`npm run qa:db-contract`)
- Critical token sync check: PASS (`npm run qa:critical-token-sync`)
- Index shell config check: PASS (`npm run qa:index-shell-config`)
- Index shell contract check: PASS (`npm run qa:index-shell-contract`)
- Index shell negative contract check: PASS (`npm run qa:index-shell-contract-negative`)
- Panel registry shape check: PASS (`npm run qa:panel-registry-shape`)
- Generated artifacts sync check: PASS (`npm run qa:generated-sync`)
- Targeted index-shell/panel-registry e2e: PASS (`node scripts/run-e2e.mjs --grep "panel registry|index shell contract"`)
- WASM tests (browser runner): PASS (`cargo test --target wasm32-unknown-unknown`, `2 passed`)
- Symbolized release verification build: PASS (`npm run build:verify:release`)
- Full E2E suite: PASS (`npm run test:e2e:all` -> `64 passed`, `1 skipped`)
- Visual regression: PASS (16/16 snapshots)
- Lighthouse CI: PASS (`npm run lighthouse:ci`)
- Docs link gate: PASS (`npm run qa:docs-links`)
- Rust warning drift gate: PASS (`npm run qa:rust-warning-drift`, baseline=`5`)
- Docs token budget check: PASS (`npm run qa:docs-budget`, `active_est_tokens=11382`)
- Release evidence soft gate: PASS (`npm run qa:release-evidence:soft`)
- Release evidence strict gate: FAIL expected until physical runs are complete (`npm run qa:release-evidence`)
- Physical iPad mini 6 (iPadOS 26.2 / Safari 26.2) runs still pending before final deploy approval (`rc3_run_01`, `rc4_run_02`)

## Quick Commands
```bash
# Cleanup generated outputs and Rust cache
npm run clean

# One-time browser install for Playwright suites
npx playwright install chromium webkit

# Dev
trunk serve

# Release
trunk build --release
npm run build:verify:release
npm run qa:release-evidence:soft
npm run qa:release-evidence

# Health and contracts
npm run qa:pwa-contract
npm run qa:runtime
npm run qa:db-contract
npm run qa:critical-token-sync
npm run qa:generated-sync
npm run qa:index-shell-config
npm run qa:index-shell-contract
npm run qa:index-shell-deep
cargo test --target wasm32-unknown-unknown
cargo check --target wasm32-unknown-unknown
npm run test:e2e:webkit

# Full E2E gate
npm run test:e2e:all

# Doc/token footprint
npm run token:baseline
npm run qa:docs-budget
```

## Repository Layout
- `rust/` core application runtime
- `public/` service worker, worker scripts, runtime diagnostics, static assets
- `src/styles/` panel and theme stylesheets
- `e2e/` Playwright tests + visual snapshots
- `scripts/` quality, build, and audit automation
- `docs/` active documentation
- `docs/archive/` historical/low-frequency documentation and artifacts

Last updated: 2026-03-04
