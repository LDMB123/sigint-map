# Status Ledger

Last updated: 2026-03-04 (session 30)

## QA Gate Results

| Gate | Command | Status | Date |
|------|---------|--------|------|
| Runtime diagnostics | `npm run qa:runtime` | PASS | 2026-03-03 |
| PWA contract | `npm run qa:pwa-contract` | PASS | 2026-03-03 |
| DB contract | `npm run qa:db-contract` | PASS | 2026-03-03 |
| Critical token sync | `npm run qa:critical-token-sync` | PASS | 2026-03-03 |
| Generated artifacts sync | `npm run qa:generated-sync` | PASS | 2026-03-03 |
| Taxonomy contract gate | `npm run qa:taxonomy-contract` | PASS | 2026-03-03 |
| E2E skip-waiver enforcement | `npm run qa:e2e-skip-waivers` | PASS | 2026-03-03 |
| Phase 5 KPI report gate | `npm run qa:phase5-kpi` | PASS | 2026-03-04 |
| iPad performance budget gate | `npm run qa:ipad-performance-budget` | PASS | 2026-03-04 |
| Apple Silicon trace budget comparator | `npm run qa:apple-silicon-trace-budget` | PENDING (new evidence workflow) | 2026-03-04 |
| RC aggregate gate suite | `npm run qa:rc-gates` | PASS | 2026-03-04 |
| Index shell config | `npm run qa:index-shell-config` | PASS | 2026-03-04 |
| Index shell contract | `npm run qa:index-shell-contract` | PASS | 2026-03-04 |
| Index shell negative contract | `npm run qa:index-shell-contract-negative` | PASS | 2026-03-04 |
| Index shell deep aggregate | `npm run qa:index-shell-deep` | PASS | 2026-03-04 |
| Rust wasm32 compile gate | `cargo check --target wasm32-unknown-unknown` | PASS | 2026-03-04 |
| WASM tests (wasm-bindgen runner) | `cargo test --target wasm32-unknown-unknown` | PASS | 2026-03-03 |
| Symbolized release verification | `npm run build:verify:release` | PASS | 2026-03-04 |
| WebKit smoke | `npm run test:e2e:webkit` | PASS | 2026-03-03 |
| Full E2E suite (64/1 skip) | `npm run test:e2e:all` | PASS* | 2026-03-03 |
| Visual regression (16 snapshots) | `npm run test:e2e -- e2e/visual.spec.ts` | PASS | 2026-03-03 |
| Rust warning drift (baseline=5) | `npm run qa:rust-warning-drift` | PASS | 2026-03-04 |
| Release evidence (soft) | `npm run qa:release-evidence:soft` | PASS | 2026-03-04 |
| Release evidence (strict) | `npm run qa:release-evidence` | FAIL* | 2026-03-04 |
| Docs budget | `npm run qa:docs-budget` | PASS | 2026-03-03 |
| Docs links | `npm run qa:docs-links` | PASS | 2026-03-04 |
| Lighthouse CI | `npm run lighthouse:ci` | PASS | 2026-02-21 |

\* `1 skipped` is explicitly covered by `config/e2e-skip-waivers.json`; non-waived skips fail gate.
\* `qa:release-evidence` remains blocked until both physical runs are `PASS` with zero open P0/P1 in `docs/testing/release-evidence/manifest.json`.

## E2E Summary

- 64 passed, 1 skipped (+18 new tests vs session 5)
- Critical flows: tracker, quests, stories all PASS
- A11y: axe critical checks PASS across core panels
- Visual gate: desktop + mobile snapshots PASS (panel-quests baseline refreshed)
- DB contract runtime flows PASS (including mom export/restore)
- WebKit smoke PASS
- New: heart economy (TG-1–5), games, companion, DB atomicity, security, mom mode (TG-6–19)

## Build Status

- `npm run build:release` PASS on 2026-02-21
- Release WASM build completed cleanly
- Source maps retained in `dist` per `scripts/build-verify-release.sh`

## Phase 5 Expansion-Grade Alignment (KindHeartPhase5.md)

Execution is aligned to the 8-week RC model with quality gates treated as non-negotiable.

| Wave / RC | Plan Intent | Status | Evidence |
|-----------|-------------|--------|----------|
| Wave 1 / RC1 | Canonicalization + critical flow gaps | DONE (software) | taxonomy contracts/generators, game lifecycle assertions, shared E2E fixtures, skip-waiver gate |
| Wave 2 / RC2 | Domain modularization + redundancy collapse | DONE (software baseline) | generated badges/prompts/taxonomy, schema v2 + v1 compatibility path, unified insights core behavior |
| Wave 3 / RC3 | Hardening + rollback controls + diagnostics | PARTIAL | local Mom feature toggles + runtime reliability counters + iPad-profile automated performance budget gate done; physical iPad run #1 pending archive |
| Wave 4 / RC4 | Freeze + final hardening + physical validation #2 | PENDING | requires final freeze window, second physical iPad run archive, final clean P0/P1 pass |

**Primary KPI (module decoupling index)**:
- Instrumentation and baseline capture are live via `scripts/checks/phase5-kpi-report.mjs` and `config/phase5-kpi-baseline.json`.
- Latest report (`scripts/reports/phase5-kpi-20260304-074707.md`): `cross_domain_db_callsites=46`, `cross_domain_direct_imports=0`, `circular_domain_dependencies=0`, `median_files_touched_single_domain_commit=4`.
- Delta vs first captured baseline (`scripts/reports/phase5-kpi-20260304-070016.md`): direct imports improved `20 -> 0`, circular dependencies improved `2 -> 0`, DB callsites unchanged (`46`).

**Secondary product KPI**:
- Reflection completion + skill-balance computation path is implemented in the same KPI reporter via `--snapshot <export.json>`.
- Active docs still need a published sufficient-volume snapshot evidence run for final KPI status.

**KPI waiver (RC4-bounded)**:
- Waiver id: `phase5-db-reduction-rc4`
- Status: `APPROVED`
- Doc: `docs/testing/release-evidence/waivers/phase5-db-reduction-rc4.md`
- Expiry: `2026-04-15`

**Open required evidence before RC4 close**:
- Complete `docs/testing/release-evidence/runs/rc3_run_01.md` and set run status `PASS` in manifest.
- Complete `docs/testing/release-evidence/runs/rc4_run_02.md` with clean P0/P1 and set run status `PASS`.
- Pass canonical release go/no-go sequence and `v*` tag workflow (`.github/workflows/release-readiness.yml`).
- Include A/B Apple Silicon trace evidence (`artifacts/apple-silicon-profile/*/abc-summary-*.csv`) plus comparator output from `qa:apple-silicon-trace-budget`.

## Work Completed 2026-03-04 (session 30)

Apple Silicon throughput deep-pass implementation wave (runtime contracts + loop/CSS/GPU resilience + trace budgets).

**Implemented**:
- Added runtime perf contract:
  - query `?perf=auto|throughput|balanced|quality`
  - body attribute `data-perf-mode=\"<resolved-mode>\"`
  - iPad mini 6 auto-resolution default now maps to `throughput`; non-iPad auto maps to `balanced`.
- Extended GPU lifecycle hardening in `rust/gpu.rs` + `rust/bindings.rs`:
  - uncaptured GPU error listener and diagnostics emission
  - `device.lost` handling with controlled one-time re-init attempt
  - fallback to DOM-safe path with status updates (`lost`/`recovering`/`unavailable`).
- Applied mode-aware throughput refactors:
  - `rust/gpu.rs`: iPad render scale by mode (`throughput=0.62`, `balanced=0.75`, `quality=1.0`)
  - `rust/gpu_particles.rs`: removed full scratch zero-fill and added mode cadence (`40/33/16ms`)
  - `rust/game_catcher.rs`: moved per-frame falling-item updates to in-memory state vector (no per-frame DOM attr parsing)
  - `rust/game_unicorn.rs`: hidden-tab frame suspension + throughput-mode 30fps clamp + iPad throughput DPR cap
  - `rust/game_paint.rs`: iPad throughput DPR cap + pointer-move batching in throughput mode.
- Added trace budget workflow artifacts:
  - `config/apple-silicon-trace-budget.json`
  - `scripts/checks/apple-silicon-trace-budget.mjs`
  - `package.json` scripts `qa:apple-silicon-trace-budget` and `qa:apple-silicon-trace-budget:write-baseline`
  - `scripts/apple-silicon-profile*.sh` now include `perf=` query controls.
- Added runtime diagnostics E2E coverage for perf mode contract:
  - `e2e/runtime-diagnostics.spec.ts` now validates valid perf modes and invalid-value fallback behavior.
- Tightened iPad panel transition budgets to `<=180ms` in `config/ipad-performance-budget.json`.

## Work Completed 2026-03-04 (session 28)

RC4 deep freeze readiness wave completed for evidence contract + enforcement.

**Implemented**:
- Added in-repo release evidence pack:
  - `docs/testing/release-evidence/manifest.json`
  - `docs/testing/release-evidence/manifest.schema.json`
  - run templates, seeded run records, and waiver doc.
- Added deterministic validator:
  - `scripts/check-release-evidence.mjs`
  - strict mode (release-blocking) and soft mode (pending-run tolerant).
- Added package scripts:
  - `qa:release-evidence`
  - `qa:release-evidence:soft`
- Added tag-only release workflow:
  - `.github/workflows/release-readiness.yml` (`v*` + `workflow_dispatch`)
  - runs `qa:rc-gates`, `build:verify:release`, `qa:release-evidence`, and uploads artifacts.
- Synced active docs with canonical go/no-go flow and waiver references.

**Validation**:
- `npm run -s qa:release-evidence:soft` PASS.
- `npm run -s qa:release-evidence` FAIL (expected; physical runs still `PENDING`).
- `npm run -s qa:rc-gates` PASS.
- `npm run -s build:verify:release` PASS.
- `npm run -s qa:docs-links` PASS.

## Work Completed 2026-03-04 (session 27)

Wave 3 RC3 gate stabilization pass: resolved iPad budget gate flakiness and aligned run duration to configured probe windows.

**Gate reliability fixes**:
- `e2e/ipad-performance-budget.spec.ts`
  - aligned home-state checks with runtime value `home-scene` (keeps `home` fallback for compatibility).
  - added panel-open cooldown (`320ms`) between loops to respect navigation debounce (`300ms`) and avoid false timeout failures.
  - passed `homePanelId` + `debounceMs` into `page.evaluate` payloads explicitly (browser-context-safe).
  - raised test timeout to `180000ms` so the `45000ms` stability probe can complete with headroom.

**Validation**:
- `npm run -s qa:ipad-performance-budget` PASS
  - report: `scripts/reports/ipad-performance-budget-20260304-072743.md`
- `npm run -s qa:rc-gates` PASS
  - iPad report from aggregate run: `scripts/reports/ipad-performance-budget-20260304-072940.md`
  - rust warning drift: PASS (`warning_count=5`, `baseline=5`)

## Work Completed 2026-03-04 (session 25)

Phase 5 decoupling follow-up: removed circular domain dependencies via explicit service-boundary wrappers and published KPI deltas.

**Plan-alignment fixes**:
- Added infra boundary module:
  - `rust/domain_services.rs`
  - routes cross-domain interactions through explicit boundary helpers (sticker award/reaction, parent PIN lookup, weekly insights fetch, focus-skill/friendly-name lookup).
- Broke `tracker <-> rewards` cycle:
  - `rust/tracker.rs` now uses `domain_services::award_kind_act_sticker()` instead of direct `rewards` import.
  - `rust/rewards.rs` now uses `domain_services::notify_sticker_earned()` instead of direct `companion` import.
- Broke `progression <-> insights` cycle:
  - `rust/progress.rs` now resolves mom PIN + weekly insights via `domain_services`.
  - `rust/parent_insights.rs` now resolves focus/friendly labels via `domain_services`.
  - `rust/mom_mode.rs` now resolves friendly skill labels via `domain_services`.
- Expanded boundary wrappers to remove remaining direct cross-domain imports:
  - `rust/tracker.rs`, `rust/quests.rs`, `rust/story_engine.rs`, `rust/reflection.rs`, `rust/skill_progression.rs`, `rust/streaks.rs`, `rust/progress.rs`, `rust/adaptive_quests.rs`, `rust/mom_mode.rs`.
- Registered new infra module in `rust/lib.rs`.

**Validation**:
- `cargo check --target wasm32-unknown-unknown` PASS (3 existing dead_code warnings in `rust/theme.rs`).
- `npm run -s qa:phase5-kpi` PASS.
  - report: `scripts/reports/phase5-kpi-20260304-071153.md`
  - metrics: `cross_domain_db_callsites=46`, `cross_domain_direct_imports=0`, `circular_domain_dependencies=0`, `median_files_touched_single_domain_commit=4`
- `npm run -s qa:rc-gates` PASS.

## Work Completed 2026-03-04 (session 26)

Wave 3 RC3 progression pass: added enforceable iPad-profile performance budgets and wired them into local/CI gate pipelines.

**Plan-alignment fixes**:
- Added versioned iPad budget config from active template thresholds:
  - `config/ipad-performance-budget.json`
  - budgets include boot time (`<=3000ms`), panel transition (`<=300ms` per-sample and p95), and runtime error budget for a stability probe.
- Added automated iPad-profile performance gate test:
  - `e2e/ipad-performance-budget.spec.ts`
  - uses Playwright `iPad Mini` profile
  - measures `wasm-init-total` boot duration
  - measures repeated home→panel open transition timings
  - runs stability probe loop and enforces runtime diagnostics error/rejection budget
  - emits evidence report to `scripts/reports/ipad-performance-budget-*.md`
- Added new QA command and RC aggregate inclusion:
  - `package.json`:
    - `qa:ipad-performance-budget`
    - `qa:rc-gates` now includes `qa:ipad-performance-budget`
- Added CI gate + artifact upload:
  - `.github/workflows/pwa-health.yml`
    - new `ipad-performance-budget-gate`
    - added to `e2e-quality-gates.needs`
    - uploads `scripts/reports/ipad-performance-budget-*.md`
- Updated active runbooks:
  - `docs/TESTING.md`
  - `docs/HANDOFF.md`

**Validation**:
- `npm run -s qa:ipad-performance-budget` PASS
  - report: `scripts/reports/ipad-performance-budget-20260304-*.md`
- `npm run -s qa:rc-gates` PASS
- `npm run -s qa:docs-links` PASS

## Work Completed 2026-03-04 (session 24)

Phase 5 conformance hardening pass against `KindHeartPhase5.md` with fresh gate evidence.

**Plan-alignment fixes**:
- Restored generated artifact availability in E2E/release output by adding generated contract files to index-shell source-of-truth:
  - `config/index-shell.json` now includes:
    - `public/skill-taxonomy.js`
    - `public/skill-mastery-badges.js`
    - `public/reflection-prompts.generated.js`
- Regenerated shell/manifests to sync outputs:
  - `index.html`
  - `public/asset-manifest.js`
  - `public/asset-manifest.json`
- Fixed warning-drift regression in `rust/dom.rs` by removing a clippy redundant closure in `for_each_match`.

**Validation**:
- `npm run -s qa:taxonomy-contract` PASS
- `npm run -s qa:e2e-skip-waivers` PASS
- `npm run -s qa:generated-sync` PASS
- `cargo check --target wasm32-unknown-unknown` PASS (3 existing dead_code warnings in `rust/theme.rs`)
- `npm run -s qa:db-contract` PASS
- `node scripts/run-e2e.mjs --grep "games lifecycle supports launch, return, relaunch, and reset|TG-6|TG-7|TG-8"` PASS
- `npm run -s qa:e2e-gap-report` PASS
  - report: `scripts/reports/e2e-gap-report-20260303-235057.md`
  - route coverage `11/11` (100%), flow coverage `10/10` (100%), gaps `critical=0 high=0 medium=0`
- `npm run -s qa:runtime` PASS
- `npm run -s qa:rust-warning-drift` PASS (`warning_count=5`, `baseline=5`)
- `npm run -s qa:rc-gates` PASS

## Work Completed 2026-03-03 (session 20)

Generated-artifacts sync gate operationalization for panel-registry rollout.

**CI and runbook updates**:
- Added `generated-sync-gate` to `.github/workflows/pwa-health.yml`
- Added `generated-sync-gate` to `e2e-quality-gates.needs` so generated outputs are enforced before end-to-end quality gates
- Updated active checklists to include generated-sync:
  - `docs/HANDOFF.md`
  - `docs/TESTING.md`

**Validation**:
- `npm run qa:generated-sync` PASS
- `npm run qa:docs-links` PASS

## Work Completed 2026-03-04 (session 22)

Deep Pass II — index-shell contract and CI hardening follow-up.

**Contract and checker hardening**:
- Added config validation gate: `scripts/check-index-shell-config.mjs`
- Added negative contract mutation gate: `scripts/check-index-shell-contract-negative.mjs`
- Refactored `scripts/check-index-shell-contract.mjs` to expose reusable contract collection and invariant-coverage validation
- Added frozen invariant-to-gate ownership matrix in `config/index-shell.json` under `qa.contract_invariants`

**Generator guardrails**:
- `scripts/generate-index-shell.mjs` now enforces:
  - marker multiplicity and ordering preflight checks
  - duplicate head directive rejection
  - duplicate panel ID rejection
  - exact panel order parity with `config/panels.json` (excluding `home-scene`)
  - normalized output and single trailing newline
- `scripts/check-generated-sync.sh` now fails fast with explicit index-shell preflight messaging

**CI integration**:
- Added `index-shell-contract-gate` to `.github/workflows/pwa-health.yml` running `npm run qa:index-shell-deep`
- Added `index-shell-contract-gate` to `e2e-quality-gates.needs`

**E2E coverage deepening**:
- Expanded index-shell contract coverage to include all-panel deep-link hash restore assertions
- Expanded panel-registry tests to validate full-panel hydration and full-panel missing-registry fallback labels
- Hardened games flow checks to verify arena + exit control visibility toggling

**Validation**:
- `cargo check -q` PASS
- `npm run -s qa:generated-sync` PASS
- `npm run -s qa:critical-token-sync` PASS
- `npm run -s qa:panel-registry-shape` PASS
- `npm run -s qa:runtime` PASS
- `npm run -s qa:index-shell-config` PASS
- `npm run -s qa:index-shell-contract` PASS
- `npm run -s qa:index-shell-contract-negative` PASS
- `npm run -s qa:db-contract` PASS
- `npm run -s qa:duplication-budget` PASS
- `npm run -s qa:docs-links` PASS
- `node scripts/run-e2e.mjs --grep \"panel registry|runtime diagnostics|feature completeness|index shell contract\"` PASS

## Work Completed 2026-03-04 (session 23)

Phase 4 hybrid modernization pass completed and validated against `KindHeartPhase4.md`.

**Shell + registry modernization**:
- Switched panel-registry artifact to ESM exports (`PANEL_REGISTRY` + default) and removed global runtime dependency
- Refactored `wasm-init.js` to dynamic import `./panel-registry.js` with shape validation and resilient inferred-label fallback
- Removed static `<script src="./panel-registry.js">` contract expectation and runtime coupling

**Hybrid home-shell generation + contracts**:
- Added `home` schema to `config/index-shell.json` and generated top-level home buttons via markers:
  - `<!-- INDEX-SHELL HOME BUTTONS START -->`
  - `<!-- INDEX-SHELL HOME BUTTONS END -->`
- Added contract invariants for home-marker ownership and generated home button structure
- Extended config/contract/negative gates for home schema parity and marker mutation coverage

**Dead-path cleanup + runtime wiring**:
- Removed stale `[data-home-title]` and `[data-heart-counter]` entrance logic in CSS and Rust boot selector flow
- Wired `.home-btn-badge` using `data-home-tracker-hearts` to live runtime state updates in Rust
- Kept `[data-home-btn]` and `[data-companion]` entrance behavior intact

**Apple-Silicon init-time GPU improvements**:
- Added `GpuBuffer.getMappedRange` and `GpuBuffer.unmap` bindings
- Switched particle/uniform buffers to `mappedAtCreation=true`, initialized mapped ranges, and unmapped
- Kept per-frame `queue.writeBuffer` path and shader workgroup sizing unchanged

**QA/e2e migration from global assumptions**:
- Updated panel registry shape gate to validate ESM output strategy and reject legacy global output
- Refactored panel-registry/index-shell e2e to compare hydration against `config/panels.json` metadata, not `window.BKH_PANEL_REGISTRY`
- Preserved missing-registry fallback test (network abort on `panel-registry.js`)
- Added/verified tracker home badge assertion (badge target exists, keeps "Hearts today" semantics, and increments after a kind act)

**Validation**:
- `node scripts/check-index-shell-config.mjs` PASS
- `node scripts/check-index-shell-contract.mjs` PASS
- `node scripts/check-index-shell-contract-negative.mjs` PASS
- `node scripts/check-panel-registry-shape.mjs` PASS
- `bash scripts/check-generated-sync.sh` PASS
- `cargo check --target wasm32-unknown-unknown` PASS
- `node scripts/run-e2e.mjs --grep "panel registry|index shell contract"` PASS
- `node scripts/run-e2e.mjs --grep "home tracker badge updates after logging a kind act"` PASS

## Work Completed 2026-03-03 (session 21)

Cross-type redundancy consolidation and ownership alignment across config/JS/Rust/CSS.

**Source-of-truth + dedup updates**:
- Panel metadata now owns panel title and panel aria fields in `config/panels.json` and generated outputs (`public/panel-registry.js`, `rust/panel_registry_generated.rs`)
- Runtime hydration now applies panel title/aria from registry in `wasm-init.js`; removed unused panel header data attributes
- Added centered style helpers in `rust/dom.rs` and refactored repeated drag clone style strings in `rust/rewards.rs`
- Moved paint animated-stamp static style primitives into CSS (`src/styles/games.css`) with Rust writing only dynamic CSS vars

**Contract and drift fixes**:
- Added DB contract source file `config/db-contract.json`
- Added generator `scripts/generate-db-contract.mjs` and generated constants:
  - `rust/db_contract_generated.rs`
  - `public/db-contract.js`
- Updated consumers (`public/db-worker.js`, `rust/db_messages.rs`, `rust/mom_mode.rs`)
- Updated generated-sync and DB-contract QA checks for the new generated contract files
- Added critical inline token drift gate: `npm run qa:critical-token-sync`
- Corrected inline `--font-size-xl` value in `index.html` to match canonical tokens

**Lifecycle and cleanup**:
- Switched class animation cleanup to event-driven `animationend` / `animationcancel` + timeout fallback (`rust/animations.rs`)
- Removed dead debug Safari path (`rust/safari_apis.rs`) and associated init hook

**Validation**:
- `cargo check` PASS
- `npm run qa:generated-sync` PASS
- `npm run qa:db-contract` PASS
- `npm run qa:critical-token-sync` PASS
- `npm run qa:runtime` PASS
- `node scripts/run-e2e.mjs --grep "panel registry"` PASS
- `node scripts/run-e2e.mjs --grep "db contract"` PASS

## Work Completed 2026-03-03 (session 19)

CSS Apple-Silicon optimization follow-up and documentation synchronization.

**CSS/runtime optimization updates**:
- Confirmed compositor-friendly progress path is active across tracker, quests, gardens, and Hug meter (`transform: scaleX(...)` + CSS vars).
- Confirmed quest zero-progress marker logic uses `data-progress-zero` (no inline-style width matching).
- Hardened Hug interaction hot paths with `try_borrow_mut()` in high-frequency/timer-adjacent handlers to avoid `RefCell` panic under rapid pointer/tap overlap.

**Documentation updates**:
- Synced active docs metadata and navigation links across:
  - `README.md`
  - `docs/HANDOFF.md`
  - `docs/INDEX.md`
  - `docs/WORKSPACE_DOCS_MAP.md`
  - `docs/reports/README.md`
- Added archived pass report:
  - `docs/archive/reports/2026-03-03-css-apple-silicon-optimizer-pass.md`
- Updated archive indexes:
  - `docs/archive/reports/INDEX.md`
  - `docs/archive/INDEX.md`

**Validation**:
- `cargo check` PASS
- Playwright Hug hold-flow smoke on fresh origin (`127.0.0.1:8091`) PASS (no `RefCell already borrowed` panic reproduced)
- `npm run qa:docs-links` PASS
- `npm run qa:docs-budget` PASS

## Work Completed 2026-03-03 (session 18)

Workspace markdown cleanup and organization pass.

**Documentation structure updates**:
- Added workspace docs hub: `docs/WORKSPACE_DOCS_MAP.md`
- Added archive hub: `docs/archive/INDEX.md`
- Added archive folder indexes:
  - `docs/archive/audits/INDEX.md`
  - `docs/archive/plans/INDEX.md`
  - `docs/archive/phase-docs/INDEX.md`
  - `docs/archive/reference-full/INDEX.md`
  - `docs/archive/reports/INDEX.md`
  - `docs/archive/root-docs/INDEX.md`
  - `docs/archive/sessions/INDEX.md`
  - `docs/archive/snapshots/INDEX.md`
  - `docs/archive/testing/INDEX.md`
- Added deployment docs entrypoints:
  - `docs/deployment/README.md`
  - `deploy/README.md`

**Consistency cleanup**:
- Updated active doc cross-links and entry points in:
  - `README.md`
  - `docs/INDEX.md`
  - `docs/HANDOFF.md`
  - `docs/reports/README.md`
  - `docs/testing/README.md`
  - `docs/ICONS.md`
- Refreshed deployment/assets README metadata and navigation links.

**Validation**:
- `npm run qa:docs-links` PASS
- `npm run qa:docs-budget` PASS (`active_est_tokens=10923`)
- repo-wide markdown link audit: PASS (`BROKEN_LINKS=0`)
- directory entrypoint audit: PASS (`MISSING_ENTRYPOINT_COUNT=0`)

## Work Completed 2026-03-03 (session 17)

Final deep Apple-Silicon browser optimization pass focused on iPad mini 6 Safari/WebKit balance (GPU cost, loop timers, and hidden-tab behavior).

**GPU particle and shader tuning (6 fixes)**:
- `shaders/particles_render.wgsl`: expanded `Uniforms` (`sparkle_strength`, `rotation_enabled` + padding), rotation trig bypass when disabled, and sparkle pulse bypass when disabled
- `shaders/particles_compute.wgsl`: mirrored uniform layout to keep compute/render bind compatibility
- `rust/gpu_particles.rs`: increased uniform payload, writes low-power controls each frame, iPad profile defaults set to `sparkle_strength=0.0` and `rotation_enabled=0.0`
- `rust/gpu_particles.rs`: moved bind-group creation out of per-frame path, reused bind groups, and switched particle upload path to borrowed `Uint8Array::view` writeBuffer strategy
- `rust/gpu.rs`: added iPad mini 6 profile detection and profile-specific GPU canvas resolution scaling (`0.75`) with body `data-device-profile` attrs
- `rust/confetti.rs`: GPU burst routing for named emoji sets and reduced aura particle count on iPad profile

**Timer and power guard updates (4 fixes)**:
- `rust/game_catcher.rs`: removed interval-based spawner (`spawn_interval_id`) and replaced with RAF-driven `spawn_accumulator_ms` loop at `theme::CATCHER_SPAWN_INTERVAL_MS`
- `rust/game_catcher.rs`: hidden-tab guard resets RAF timestamp baseline and skips physics/spawn for that tick
- `rust/game_memory.rs`: timer callback early-return when document hidden
- `rust/game_hug.rs`: hold-meter callback early-return when document hidden

**Shared visibility helper (1 addition)**:
- `rust/browser_apis.rs`: added `is_document_visible() -> bool`

**Validation**:
- `cargo check --target wasm32-unknown-unknown` PASS
- `npm run qa:pwa-contract` PASS
- `npm run test:e2e:webkit` PASS (`1 passed`)

## Work Completed 2026-03-03 (session 16)

WASM/Rust + loader debug hardening with targeted verification and release warning elimination.

**WASM test runner + smoke coverage (2 fixes)**:
- Added wasm target runner in `.cargo/config.toml`: `runner = "wasm-bindgen-test-runner"`
- Added 2 `wasm_bindgen_test` cases in `rust/lib.rs` for contiguous/gap streak behavior and guarded `#[wasm_bindgen(start)]` with `#[cfg_attr(not(test), ...)]`

**Release minifier warning root-cause fix (3 fixes)**:
- Switched Trunk rust asset to `data-bindgen-target="no-modules"` in `index.html` to avoid `export ... default` parser failure during minification
- Updated `wasm-init.js` to initialize from no-modules `wasm_bindgen` binding while preserving perf instrumentation and compile fallback
- Replaced dynamic script injection (blocked by Trusted Types CSP) with static bindgen script include in `index.html`

**Validation**:
- `cargo test --target wasm32-unknown-unknown` PASS (`2 passed`)
- `cargo test` PASS
- `npm run build:verify:release` PASS with no JS minify warning
- `npm run qa:runtime` PASS
- `npm run qa:db-contract` PASS
- `node scripts/run-e2e.mjs --grep "window.wasmBindings"` PASS

## Work Completed 2026-03-03 (session 15)

Debug & code review — deep source audit with 3 parallel agents, 7 potential issues investigated, 3 defensive fixes:

**Rust hardening (2 fixes)**:
- `storage_pressure.rs`: Added `.max(1.0)` guard on storage quota to prevent edge-case division by zero if API returns 0
- `utils.rs`: Updated 3 stale fallback year defaults from `2025` → `2026` in `prev_day_key`, `week_key_from_day`, `week_key_end`

**Visual regression (1 fix)**:
- Refreshed `mobile-panel-quests` snapshot (32,934 pixel diff from asset manifest cache version change)

**Audit findings (4 false positives dismissed)**:
- ISO week u32 underflow: SAFE — `doy + 10` always >= 11, `iso_weekday` max 7
- SQL string interpolation in offline_queue: SAFE — constant `MAX_QUEUE_SIZE / 10 = 50`, not user input
- Image error handler memory leak: FALSE — single delegated listener on `.home-grid`, not per-image
- GPU init race condition: FALSE — WASM is single-threaded, no actual races

**QA**: All gates PASS (64 E2E + 1 skip, runtime, PWA, DB contract)

## Work Completed 2026-03-02 (session 14)

Comprehensive audit — 4 parallel deep audits (audio/speech, animation/RAF, edge-case logic, SW/offline):

**DB contract fix (1 fix)**:
- `check-db-contract.mjs`: Updated regex `openMomDashboard()` → `openMomDashboard(page)` to match session 12's deduplicated helper signature

**Audit results (all clean — no new bugs found)**:
- Audio/Speech: Single AudioContext, proper cancel-before-speak, voice pool tuned for iPad (16 max)
- Animation/RAF: All RAF IDs cancelled on cleanup, delta caps correct (50-100ms), View Transitions safe
- Edge-case logic: Heart economy secure (add-only, no negatives), game scores atomic, quest double-completion prevented by DOM guards
- SW/Offline: pagehide export fully wired (Rust → flush_sync → Export → exportToBlob), FATAL pattern detection correct, cold boot works

**QA**: All 8 gates PASS (64 E2E + 1 skip, runtime, PWA, DB contract, rust drift, docs budget, docs links)

## Work Completed 2026-03-02 (session 13)

Deep audit — 6 parallel audits (JS, Rust, HTML/CSS, build config, DB integrity, race conditions), 15 fixes:

**CSS (4 fixes)**:
- `mom.css`: `overflow:hidden` → `overflow-x:hidden` (Mom dashboard scroll was blocked)
- `home.css`: badge font `0.75rem` → `1rem` (too small for 4yo)
- `app.css`: panel header `z-index:1` → `2` (content painted over sticky header)
- `tracker.css`: added `touch-action:manipulation` to feeling buttons (300ms tap delay)

**JS — db-worker.js (4 fixes)**:
- `sqlite3_deserialize` flags `0` → `3` (FREEONCLOSE + RESIZEABLE) — DB couldn't grow past initial OPFS blob size
- Wrapped skill_mastery + reflection_prompts seed transactions in try/catch with ROLLBACK
- Added `stmt.clearBindings()` after `stmt.reset()` to prevent stale parameter retention

**Rust (6 fixes)**:
- `streaks.rs`: ON CONFLICT UPDATE `hearts_total+1` → `excluded.hearts_total` (incorrect streak heart count)
- `lib.rs`: streak hydration `LIMIT 60` → `365` (truncated long streaks)
- `db_client.rs`: send error via oneshot on serialization failure (prevents silent hangup)
- `game_memory.rs`: wall-clock elapsed → incremental `+= 1` (iPad sleep timer inflation)
- `navigation.rs`: 300ms debounce on panel-open (prevents duplicate history entries)
- `tracker.rs`: removed dead `LAST_ACT_MS` thread_local

**Infrastructure**:
- `.gitignore`: added `node_modules/` and `.lighthouseci/`
- SW v79 → v80

**QA**: 64 E2E PASS (1 expected skip), cargo check clean

## Work Completed 2026-03-02 (session 12)

Pre-deployment verification — SW cache audit, bundle audit, Rust safety audit, E2E quality:

**SW Cache Completeness**:
- Found 5 dist files not in SW precache: 1 home button (`btn-gardens.webp`), 4 mom_mode stickers (`lock-gold`, `calendar-magic`, `chart-sparkle`, `pencil-star`)
- Found 1 stale entry: `/icons/sparkle-unicorn.svg` (source template, not runtime asset)
- Fixed: added button to CRITICAL_ASSETS, stickers to DEFERRED_ASSETS, removed stale ref
- SW v78 → v79

**Bundle Size Audit**:
- WASM: 1.0 MB (app) + 840 KB (sqlite) = 1.8 MB total
- JS: 536.5 KB (sqlite3.js 365KB dominant)
- CSS: 154.6 KB across 14 files
- Images: 11.2 MB (78 WebP assets)
- Grand total: ~15 MB — acceptable for offline-first PWA

**Rust Safety Audit**:
- 2 justified `unsafe` blocks (GPU buffer reinterpret, thread-local pointer)
- Zero `.expect()`, `.unwrap()`, `panic!()`, `todo!()`, `unimplemented!()`
- All array indexing verified safe

**E2E Test Quality**:
- Fixed silent pass: TG-5 quest confirm `Promise.race` result was never asserted
- Added assertion on collected-but-unused gardens `cardCount`
- Removed commented-out dead code in `db-contract.spec.ts`
- Deduplicated helpers: `readHearts` (2→1), `openMomDashboard` (3→1), `dismissOnboardingIfPresent` (4→1)
- Net: -87 lines across 6 spec files, zero behavior change (64 pass)

**QA**: 64 E2E PASS (1 expected skip), release build clean

## Work Completed 2026-03-02 (session 11)

Deep pass — redundancy removal, asset fixes, production hygiene, JS hardening, SW safety, panic elimination:

**Redundant Observer Removal** (`rust/safari_apis.rs`):
- Removed 128-line INP/LCP PerformanceObserver that duplicated `runtime-diagnostics.js` (INP with rich breakdowns) and `web_vitals.rs` (debug panel INP max)
- `safari_apis.rs` reduced from 158 to 30 lines — retains scrollbar theming and scroll-driven animation only

**Asset & DOM Fixes**:
- Fixed undefined CSS token `--touch-target` → `--touch-comfortable` in `home.css` (Show Mom button had no min-height)
- Fixed 3 missing sticker asset refs in `mom_mode.rs`: `heart-sparkle` → `heart-sparkling`, `book-magic` → `rainbow`, `game-controller` → `confetti-ball`
- Added null-check in `offline.js` for retry button getElementById

**JS Hardening** (`db-worker.js`, `wasm-init.js`):
- Check `sqlite3_deserialize` return code (was silently ignoring failure → data loss)
- Fix init race condition — concurrent Init messages now queue and receive results
- Guard error message formatting against non-Error throw values
- Wrap wasm-init error handler DOM access in try/catch for early failures

**Service Worker Safety** (`sw.js`):
- Navigate/HTML catch returns inline 503 Response when `offline.html` missing (was returning `undefined` → Safari network error)
- Remove `await` on deferred asset precache to unblock SW activation lifecycle
- SW v76 → v78

**Panic Elimination**:
- Replaced all `.expect()` with `.unwrap_throw()` in `debug/panel.rs` (8 calls) and `debug/memory.rs` (4 calls)
- Guarded `friend_types[0]` with `.first()` in `game_unicorn_friends.rs` to prevent empty-slice panic
- Gated 4 `web_vitals.rs` console.log calls behind `#[cfg(debug_assertions)]`

**Selector Consolidation**:
- Consolidated 28 selector strings from 14 files into `constants.rs` (single source of truth)
- Removed 11 unused `data-*` attributes from `index.html`
- Replaced `.expect()` with `.unwrap_throw()` in `browser_apis.rs`, added `role=status` to toast

**Codebase State**: Zero `.expect()`, zero `.unwrap()`, zero `todo!()`/`unimplemented!()` in Rust. All array indexing verified safe.

**QA**: 64 E2E PASS (1 expected skip), cargo check clean, all asset refs validated

## Work Completed 2026-03-02 (session 10)

10x deep code quality pass — static analysis, borrow safety, timer/closure leaks, async correctness:

**Deep Pass Results (7 areas — all clean except one fixed bug)**:
- RefCell/borrow panic risks: CLEAN — all double-borrow patterns safe (RefMut drops before second borrow_mut)
- Closure::forget leaks: CLEAN — 36 forgets all in global event handlers (correct JS memory model)
- Async correctness: CLEAN — no RefCell borrows across await points anywhere in codebase
- Game state reset between sessions: CLEAN — menu hidden while active, all-cleanup on panel nav
- Integer overflow: CLEAN — u32 counters safe for 4-year-old usage, wrapping_add on request IDs
- Silent .ok() abuse: CLEAN — canvas transform ops and standard correct patterns only
- DB layer: CLEAN — no nested locks, oneshot cancellation clean, borrows drop before await

**Timer Leak Bug Fixed** (`rust/game_memory.rs`):
- `start_timer()` and `reset_hint_timer()` could be called from peek timeout after `cleanup()` sets GAME to None
- If GAME is None, timer ID can't be stored → interval/timeout leaked (runs forever as no-op)
- Fix: added `is_some_and(|g| g.active)` early-return guard to both functions
- E2E: 64 pass, 1 skip (unchanged)

**Clippy & Code Quality** (earlier in session, committed separately):
- Resolved all clippy warnings: unused import, type complexity, char comparison
- Deep quality pass: explicit enum variants, remove spurious Option, let-else, redundant closures

## Work Completed 2026-03-02 (session 9)

Pre-deployment polish — 3 UX improvements, SW bump, iPad regression prep:

**Speech Variety**:
- `companion.rs`: Expanded 5 phrase arrays (3→6 each): QUEST, STICKER, STORY, GAME, FIRST_ACT
- `companion_speech.rs`: Expanded 4 phrase arrays (4→7 each): FEED, PET, PLAY, MOOD_UP

**Show Mom Button**:
- Wired disconnected celebration feature — `celebration.rs` already bound `[data-show-mom]` but no HTML element existed
- Added `data-show-mom` button to `index.html` with `btn-show-mom.webp` asset (already precached)
- Styled in `home.css` with glassmorphic design and press animation

**Heart Counter Pop Animation**:
- `ui.rs`: `update_heart_counter()` adds/removes `heart-count-pop` CSS class with 300ms timeout
- `home.css`: Scale 1→1.35→1 elastic animation on heart increment

**Infrastructure**:
- SW v75→v76 (`public/sw.js`)
- Created `docs/IPAD_REGRESSION_TEMPLATE.md` — physical device testing checklist
- Updated rust warning drift baseline (3→5, accounts for clippy summary line counting)

## Earlier Work (condensed — see History table for commits)

- **Sessions 7-8** (2026-03-01): Rust refactoring (47 files, ~20 wrappers eliminated) + CSS optimization (13 files, -736 lines, tokenization) + 2 bug fixes (html_escape type, CSV export field type)
- **Session 6** (2026-03-01): Code review — 11 correctness fixes (CR-1–11), 8 security fixes (SEC-1–8), 19 new E2E tests (TG-1–19, 64 total)
- **Session 5** (2026-02-28): Doc cleanup — archived stale docs, fixed dangling refs, reorganized archive
- **Session 4** (2026-02-28): Safari 26.2 debug — `scheduler.yield()` via JS reflection, RAF gravity physics, SW `clients.claim()` priority fix, splash PNGs, TT audit clean
- **Session 3** (2026-02-28): Dead code audit — Rust 80 files clean, CSS 11 dead class refs removed, orphaned `public/wasm-init.js` deleted
- **Session 2** (2026-02-28): CSS polish — all 16 files, 3-stop gradients, gloss layers, 3D press, gradient text, particle system
- **Session 1** (2026-02-28): Quest card transition freeze fix, Trunk infinite rebuild loop fix
- **2026-02-27**: Deep game polish — 23 fixes (catcher/paint/unicorn/hug/memory), a11y, security cleanup
- **2026-02-21**: Production hardening — Lighthouse CI assertions, favicon, haptics routing

## Outstanding Release Task

- Physical iPad mini 6 (iPadOS 26.2 / Safari 26.2) regression evidence still required before final deployment approval.

## History

| Date | Milestone | Commits |
|------|-----------|---------|
| 2026-03-03 | Documentation cleanup + archive indexing + docs hub reorganization | (this commit) |
| 2026-03-03 | Final deep Apple-Silicon pass — GPU quality path + visibility/timer guards | (this commit) |
| 2026-03-03 | WASM debug hardening — test runner, wasm smoke tests, bindgen target/loader minify fix | (recorded in prior session) |
| 2026-03-03 | Debug & code review — 3 defensive fixes (quota guard, stale year, snapshot) | 319ab1a |
| 2026-03-02 | Comprehensive audit (audio/RAF/logic/SW) — DB contract regex fix | 575ee2a |
| 2026-03-02 | Deep audit — 15 fixes (CSS/JS/Rust), SW v80 | d3658ab |
| 2026-03-02 | Pre-deploy verify — SW cache fix, E2E dedup + assertion fixes | 31cbfa1–2161c0f |
| 2026-03-02 | Deep pass — observers, JS hardening, SW safety, panic elimination, selector consolidation | 4943b69–da43297 |
| 2026-03-02 | 10x deep pass — clippy fixes, code quality, timer leak fix (game_memory) | db5c36f–e0f60b0 |
| 2026-03-02 | Pre-deploy polish — speech variety, Show Mom button, heart pop, SW v76 | be2c8d3–b8828a9 |
| 2026-03-01 | CSS optimization — 13 files, -736 lines, tokenize values | de43ea0–ac3e924 |
| 2026-03-01 | Rust refactoring — 47 files, eliminate wrappers/duplicates | ecc2f29–39f366f |
| 2026-03-01 | Bug fix — 2 bugs from session 6 code-quality pass | dd7458f |
| 2026-03-01 | Code review + security pass (CR-1–11, SEC-1–8) + 19 new E2E tests (TG-1–19) | 0fce67d |
| 2026-02-28 | Doc cleanup pass — archive stale docs, fix links, reorganize | fada4ca, a0b71cb, 3308ab0, 7c71edf |
| 2026-02-28 | Safari 26.2 debug & opt pass — 11 fixes, splash screen | 71ee341 |
| 2026-02-28 | Extreme CSS polish pass — all 16 CSS files | eb4ab32, 54dcb49 |
| 2026-02-28 | Quest card transition freeze fix + data-focus cleanup | 2cc1bef |
| 2026-02-27 | Deep game polish — 23 fixes across gameplay, CSS, a11y | 1273877, 63defdf, 30a20ba, 772cef5 |
| 2026-02-21 | Production hardening + full gate rerun complete | (working tree) |
| 2026-02-20 | Production polish complete — all QA gates PASS | 8026800, 37fec45 |
| 2026-02-20 | Reentrant with_buf fixes (rewards, game_memory) | 629cfd7 |
| 2026-02-20 | Asset manifests, docs, e2e specs committed | aec8aae, 5957c05, bde4062 |
