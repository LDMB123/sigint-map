# Phase 4 Index-Shell Modernization Pass

Date: 2026-03-04
Source plan: `/Users/louisherman/Downloads/KindHeartPhase4.md`

## Objective
Execute the aggressive hybrid modernization plan for index shell ownership, panel-registry boot flow, stale path removal, runtime badge wiring, and Apple-Silicon init-time GPU buffer setup, while preserving runtime behavior.

## Scope Delivered

### 1) Panel registry artifact modernization (global -> ESM)
- Updated `scripts/generate-panel-registry.mjs` to emit:
  - `export const PANEL_REGISTRY = Object.freeze({...});`
  - `export default PANEL_REGISTRY;`
- Regenerated `public/panel-registry.js` as ESM output.

### 2) `wasm-init` registry loading migration with fallback retention
- Replaced global lookup with dynamic import loading in `wasm-init.js`:
  - `loadPanelRegistry()` imports `./panel-registry.js`
  - validates export shape
  - preserves inferred-label fallback on import/shape failure
- Kept hydration behavior (breadcrumb/title/theme) intact.

### 3) Hybrid-generated home shell ownership
- Added `home` schema to `config/index-shell.json`.
- Added generated marker block in `index.html`:
  - `<!-- INDEX-SHELL HOME BUTTONS START -->`
  - `<!-- INDEX-SHELL HOME BUTTONS END -->`
- Extended `scripts/generate-index-shell.mjs` to render top-level home buttons from config.

### 4) Contract and config gate extensions
- Extended `scripts/check-index-shell-config.mjs` for `home` schema + panel parity checks.
- Extended `scripts/check-index-shell-contract.mjs` with:
  - home marker multiplicity checks
  - generated home button invariants
  - removal of old `<script src="./panel-registry.js">` expectation
- Extended `scripts/check-index-shell-contract-negative.mjs` with home-marker/home-entry mutation cases.
- Updated invariant ownership in `config/index-shell.json`.

### 5) Stale entrance-path cleanup
- Removed dead `[data-home-title]` / `[data-heart-counter]` selectors and delays from `src/styles/app.css`.
- Removed corresponding stale selector loop usage from `rust/lib.rs`.
- Preserved `[data-home-btn]` and `[data-companion]` entrance behavior.

### 6) Tracker home badge runtime wiring
- Added generated badge target `data-home-tracker-hearts`.
- Added selector and cache plumbing:
  - `rust/constants.rs`
  - `rust/state.rs`
  - `rust/lib.rs`
- Updated `rust/ui.rs::update_heart_counter` to update the home badge from `state.hearts_today`.

### 7) Apple-Silicon GPU init-time optimization
- Added bindings:
  - `GpuBuffer.getMappedRange`
  - `GpuBuffer.unmap`
- Switched particle/uniform buffer initialization to `mappedAtCreation=true` in `rust/gpu_particles.rs`, initialized mapped ranges, then unmapped.
- Kept per-frame `queue.writeBuffer` path unchanged.

### 8) QA/e2e migration from global registry assumptions
- Refactored `scripts/check-panel-registry-shape.mjs` to validate ESM artifact strategy and reject legacy global export usage.
- Updated:
  - `e2e/panel-registry.spec.ts`
  - `e2e/index-shell-contract.spec.ts`
  to compare hydration behavior against config-driven metadata (not `window.BKH_PANEL_REGISTRY`).
- Preserved missing-module fallback coverage by aborting `panel-registry.js`.
- Added focused badge assertion verifying home badge presence/semantics and post-action increment.

## Validation Evidence
All required validation scenarios from the plan were executed and passed:

```bash
node scripts/check-index-shell-config.mjs
node scripts/check-index-shell-contract.mjs
node scripts/check-index-shell-contract-negative.mjs
node scripts/check-panel-registry-shape.mjs
bash scripts/check-generated-sync.sh
cargo check --target wasm32-unknown-unknown
node scripts/run-e2e.mjs --grep "panel registry|index shell contract"
node scripts/run-e2e.mjs --grep "home tracker badge updates after logging a kind act"
```

Result: PASS.

