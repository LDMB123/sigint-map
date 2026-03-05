# Handoff Runbook

Last updated: 2026-03-05 (session 31)

## Fast Takeover Checklist

1. Read `CLAUDE.md` — project scope, tech stack, commands
2. Read `docs/STATUS_LEDGER.md` — latest QA gate results
3. Run `npm run test:e2e:webkit` for a quick Safari/WebKit sanity gate

## Key Commands

```bash
# Development
trunk serve

# Production build
trunk build --release

# iPad testing (serve over network)
trunk serve --address 0.0.0.0

# Full QA suite
npm run qa:runtime
npm run qa:pwa-contract
npm run qa:db-contract
npm run qa:critical-token-sync
npm run qa:generated-sync
npm run qa:taxonomy-contract
npm run qa:e2e-skip-waivers
npm run qa:rc-gates
npm run qa:phase5-kpi
npm run qa:phase5-kpi:baseline
npm run qa:ipad-performance-budget
npm run qa:apple-silicon-trace-budget
npm run qa:index-shell-config
npm run qa:index-shell-contract
npm run qa:index-shell-deep
npm run test:e2e
npm run test:e2e:webkit
npm run build:verify:release
cargo check --target wasm32-unknown-unknown
cargo test --target wasm32-unknown-unknown
npm run qa:rust-warning-drift
npm run qa:docs-budget
npm run qa:docs-links
npm run qa:release-evidence:soft
npm run qa:release-evidence

# Optional: include product KPI with exported snapshot
node scripts/checks/phase5-kpi-report.mjs --snapshot <path-to-export.json>
```

## RC3 Performance Gate

- `npm run qa:ipad-performance-budget` enforces iPad-profile performance budgets from `config/ipad-performance-budget.json` and writes evidence to `scripts/reports/ipad-performance-budget-*.md`.
- This is an automated proxy gate; physical iPad mini 6 run evidence is still required via `docs/IPAD_REGRESSION_TEMPLATE.md`.
- `npm run qa:apple-silicon-trace-budget` compares candidate `xctrace` summary CSVs against `config/apple-silicon-trace-budget.json` normalized targets (hitches/GPU pressure deltas + hang/error caps).
- Throughput override contracts: `?perf=throughput|balanced|quality|auto` and `?gpu=on|off|auto`; immediate visual rollback remains available via `?perf=quality`.

## RC4 Release Go/No-Go

1. `npm run qa:rc-gates`
2. `npm run build:verify:release`
3. `npm run qa:release-evidence`
4. Tag-based workflow `.github/workflows/release-readiness.yml` must pass (`v*` tags only).

## Architecture Notes

- All logic in Rust → WASM. No JS frameworks.
- 6 JS files only: `wasm-init.js`, `public/sw.js`, `public/db-worker.js`, `public/db-contract.js`, `public/offline.js`, `public/runtime-diagnostics.js`
- SQLite stored in OPFS, access serialized via Web Locks
- State: `thread_local! { static STATE: RefCell<AppState> }`
- DOM: event delegation via data-* attributes, Trusted Types enforced
- Trunk Rust asset uses `data-bindgen-target="no-modules"`; `blaires-kind-heart.js` is loaded before `wasm-init.js`

## Critical Patterns

- `dom::with_buf()` is NOT reentrant — never call `dom::query_data()` from inside a `with_buf()` closure
- DB writes use fire-and-forget or `exec_fire_and_forget()` — check `browser_apis::with_web_lock` for serialized writes
- Service worker v80 current; v74+ required for runtime diagnostics contract

## Files to Know

- `rust/lib.rs` — app boot and init sequence
- `rust/state.rs` — AppState definition
- `rust/dom.rs` — DOM utilities (with_buf, query, etc.)
- `rust/db_client.rs` — SQLite async client
- `rust/navigation.rs` — panel navigation and view transitions

## Current State (2026-03-05)

**All software quality and core QA gates are complete (sessions 6-28); release approval remains evidence-gated.**

- **Session 31**: Phase 5 decoupling closure complete. Extracted remaining core cross-domain DB callsites into new store boundary modules (`rewards_store`, `stories_store`, `streaks_store`, `tracker_store`) and wired integrations in `garden_timeline`, `rewards`, `stories`, `story_engine`, `streaks`, `tracker`, and `companion`. Validation in-session: `cargo check` PASS, `qa:phase5-kpi` PASS with `cross_domain_db_callsites=0`, `qa:db-contract` PASS, `qa:runtime` PASS, `qa:ipad-performance-budget` PASS. Release evidence manifest now tracks KPI as PASS (`scripts/reports/phase5-kpi-20260305-000315.md`) and no active KPI waiver is required.

- **Session 28**: RC4 deep freeze readiness wave implemented end-to-end. Added machine-readable release evidence pack (`docs/testing/release-evidence/manifest.json` + schema), deterministic validator (`scripts/check-release-evidence.mjs`) with strict/soft modes, tag-only release readiness workflow (`.github/workflows/release-readiness.yml` on `v*`), explicit KPI waiver (`phase5-db-reduction-rc4`), and canonical go/no-go docs sync. Validation: `qa:release-evidence:soft` PASS, `qa:release-evidence` expected FAIL pending physical run completion.

- **Session 27**: RC3 iPad performance gate stabilization complete. The iPad profile spec now matches runtime home-state (`home-scene`), includes a 320ms inter-open cooldown to respect nav debounce, and uses a 180s timeout so the 45s stability probe completes reliably. Validation in-session: `npm run -s qa:ipad-performance-budget` PASS (`scripts/reports/ipad-performance-budget-20260304-072743.md`) and full `npm run -s qa:rc-gates` PASS (aggregate iPad report `scripts/reports/ipad-performance-budget-20260304-072940.md`).

- **Session 23**: Phase 4 modernization implemented and verified end-to-end. Registry loading now uses ESM dynamic import fallback (`wasm-init.js` + generated `public/panel-registry.js`), top-level home shell is generated from `config/index-shell.json` via new home markers, stale home-entry selector paths were removed, tracker home badge is wired to runtime hearts-today state, and Apple-Silicon init-time mapped buffer setup was added for GPU particle/uniform buffers. Validation in-session: index-shell config/contract/negative gates PASS, panel-registry-shape PASS, generated-sync PASS, `cargo check --target wasm32-unknown-unknown` PASS, targeted E2E PASS (`panel registry|index shell contract`), and focused badge assertion PASS.

- **Session 21**: Cross-type redundancy consolidation pass completed. Panel title/ARIA ownership moved into `config/panels.json` and generated registry outputs, unused `wasm-init` panel header attributes removed, class-animation cleanup switched to `animationend`/`animationcancel` with fallback timeout, DB version constants unified via `config/db-contract.json` + generated Rust/JS constants, critical inline token sync gate added (`npm run qa:critical-token-sync`), repeated Rust style builders deduplicated in `dom.rs`, and dead `rust/safari_apis.rs` path removed. Validation in-session: `cargo check` PASS, `npm run qa:generated-sync` PASS, `npm run qa:db-contract` PASS, `npm run qa:critical-token-sync` PASS, targeted E2E PASS (`panel registry`, `db contract`).

- **Session 20**: Panel-registry pipeline operationalization pass. Added CI enforcement for generated artifact consistency (`generated-sync-gate` running `npm run qa:generated-sync`), included that gate in the required `e2e-quality-gates` dependency chain, and updated active runbooks (`docs/HANDOFF.md`, `docs/TESTING.md`) so generated sync is part of the standard pre-release checklist. Validation in-session: `npm run qa:generated-sync` PASS and `npm run qa:docs-links` PASS.

- **Session 19**: CSS Apple-Silicon optimization follow-up + docs sync. Progress fills now use compositor-friendly `transform: scaleX(...)` with CSS vars in tracker/quests/gardens/hug meter. Quest zero-state marker logic migrated to `data-progress-zero`. Hug game interaction hot paths were hardened with `try_borrow_mut()` to avoid `RefCell` panic under rapid pointer/tap overlap. Validation in-session: `cargo check` PASS and fresh-origin Playwright Hug hold-flow smoke PASS (no panic reproduced).

- **Session 18**: Documentation cleanup and organization — added workspace-wide markdown map, archive root index, per-folder archive indexes (audits/plans/phase-docs/reference-full/reports/root-docs/sessions/snapshots/testing), and deployment doc hubs (`docs/deployment/README.md`, `deploy/README.md`). Refreshed active doc cross-links and metadata consistency. Validation: `npm run qa:docs-links` PASS, `npm run qa:docs-budget` PASS.

- **Session 17**: Final deep Apple-Silicon pass — implemented iPad mini 6 low-power GPU particle controls (shader uniforms + conditional trig/sparkle), moved Catcher spawn cadence from interval to RAF accumulator, and added visibility guards for Memory/Hug/Catcher loops to prevent hidden-tab progression and reduce CPU wakeups. Also added iPad profile styling/perf tuning hooks and revalidated `cargo check --target wasm32-unknown-unknown`, `npm run qa:pwa-contract`, and `npm run test:e2e:webkit` (all PASS).

- **Session 16**: WASM/Rust debug hardening — fixed wasm test execution by wiring `wasm-bindgen-test-runner`, added 2 wasm smoke tests in `rust/lib.rs`, and resolved release minifier warning (`RequiredTokenNotFound(Identifier)` on `default`) by switching bindgen target to `no-modules`. Updated loader path for Trusted Types CSP compatibility and confirmed runtime/db contracts + wasmBindings probe pass.

- **Session 15**: Debug & code review — deep source audit with 3 parallel agents found 7 potential issues, 4 dismissed as false positives (ISO week math, SQL interpolation, image handler, GPU races). Applied 3 defensive fixes: storage quota `.max(1.0)` guard, stale year defaults `2025→2026`, visual snapshot refresh. All gates PASS.
- **Session 14**: Comprehensive audit — 4 parallel deep audits (audio/speech, animation/RAF, edge-case logic, SW/offline). All clean, no new bugs. Fixed DB contract QA gate regression from session 12's helper deduplication. All 8 QA gates PASS.
- **Session 13**: Deep audit — 6 parallel audits across all layers found 15 issues. Fixed: 4 CSS (mom scroll, badge font, header z-index, touch-action), 4 JS (deserialize flags, seed rollback, stmt cache), 6 Rust (streak hearts, limit 365, db_client hangup, timer inflation, nav debounce). SW v80. 64 E2E PASS.
- **Session 12**: Pre-deploy verify — SW cache audit found 5 uncached assets + 1 stale ref (fixed, SW v79). Bundle audit (15 MB total, acceptable). Rust safety clean (2 justified unsafe, zero panics). E2E quality: fixed 1 silent-pass assertion, deduplicated 4 helper functions across 6 spec files (-87 lines).
- **Session 11**: Deep pass — 8 commits: removed redundant INP/LCP observers, fixed missing asset refs + CSS token, hardened db-worker (deserialize check, init race, error formatting), fixed SW undefined respondWith fallback + deferred asset blocking activation, eliminated all `.expect()`/`.unwrap()` from Rust (zero remaining), consolidated selectors to constants.rs, gated web_vitals console.log, SW v78
- **Session 10**: 10x deep pass — 7 analysis areas (borrow safety, closure leaks, async correctness, game state reset, overflow, silent .ok(), DB layer). All clean except one real bug: timer leak in `game_memory.rs` `start_timer()`/`reset_hint_timer()` when called after cleanup via peek timeout. Fixed with `is_some_and(|g| g.active)` guards. Clippy + deep code quality commits also landed.
- **Session 9**: Pre-deploy polish — expanded companion speech variety, wired Show Mom celebration button, added heart counter pop animation, SW v76, iPad regression template
- **Session 8**: CSS optimization — 6 commits, 13 files, -736 lines (dead CSS, tokenization, webkit cleanup)
- **Session 7**: Rust refactoring — 15 commits, 47 files, eliminated ~20 forwarding/duplicate wrappers
- **Session 6**: Code review — 11 correctness fixes, 8 security fixes, 19 new E2E tests (64 total)

**All gates green:** 64 E2E PASS (1 expected skip), visual 16/16 PASS, QA runtime/pwa/db PASS.

**Outstanding**: Complete physical run evidence in `docs/testing/release-evidence/manifest.json` (`rc3_run_01`, `rc4_run_02`) and pass strict `npm run qa:release-evidence`.
