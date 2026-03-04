# Simplification Contracts (Wave 0 Freeze)

- Archive Path: `docs/archive/phase-docs/simplification-contracts.md`
- Normalized On: `2026-03-04`
- Source Title: `Simplification Contracts (Wave 0 Freeze)`

## Summary
Last updated: 2026-02-13

## Context
Last updated: 2026-02-13

### Baseline Gates
- `cargo check --release`: PASS
- `cargo test --release`: PASS (8 tests)
- `npm run test:e2e`: FAIL (port conflict at freeze time)
- Failure detail at freeze time: `http://127.0.0.1:4173 is already used`

### Current Gates (Wave 7 Closeout Target)
- `cargo check --release`: PASS
- `cargo test --release`: PASS (8 tests)
- `npm run test:e2e`: PASS
- `npm run test:e2e:all`: PASS (33 tests)
- E2E port handling: PASS (auto-fallback to `4174` when `4173` was occupied)
- Note: final gate is re-run at Wave 7 closeout and should remain green.

- Active execution context is tracked in:
  - `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/docs/CODEX_WORKING_CONTEXT_PLAN.md`

### Wasm Export Contract (`rust/lib.rs`)
Preserve exported symbol names and signatures exactly:

```rust
#[wasm_bindgen(start)]
pub fn start()
```

### Persistence Contract
No schema/key-shape breaking changes in the following modules.

### `rust/mom_mode.rs`
- Settings key: `parent_pin` in `settings(key, value)`
- Weekly goals persisted by `week_key` in `weekly_goals`
- Mom notes persisted by `week_key` in `mom_notes`
- SQL key contract fragments to preserve:
  - `SELECT value FROM settings WHERE key = 'parent_pin'`
  - `INSERT OR REPLACE INTO settings (key, value) VALUES ('parent_pin', ?1)`
  - `DELETE FROM weekly_goals WHERE week_key = ?1`
  - `INSERT INTO weekly_goals (id, week_key, goal_type, target, progress, created_at) ...`
  - `INSERT OR REPLACE INTO mom_notes (id, week_key, note_text, created_at) ...`

### `rust/gardens.rs`
- Table and fields to preserve read/write shape:
  - `gardens(id, garden_name, quest_chain_id, theme_emoji, growth_stage, unlocked_at)`
- IDs and chain IDs in `GARDENS` static data are contract-level identifiers for unlock/grow flows.

### `rust/progress.rs`
- Relies on `weekly_goals` + `mom_notes` data shape and current `week_key` resolution from `parent_insights` / `utils`.
- No behavior changes to goal completion, mom note rendering, or panel-open refresh triggers.

### Analytics / Metrics Contract
Preserve metric field names and semantics used by Web Vitals tracking.

### `rust/metrics/web_vitals.rs`
- Struct fields:
  - `lcp: Option<f64>` (Largest Contentful Paint)
  - `fid: Option<f64>` (First Input Delay)
  - `cls: Option<f64>` (Cumulative Layout Shift)
  - `inp: Option<f64>` (Interaction to Next Paint)
- Observer type strings to preserve semantics:
  - `largest-contentful-paint`
  - `first-input`
  - `layout-shift`
  - `event` (with `durationThreshold`)

### Related accessors
- `metrics::get_vitals()` and `metrics::init_web_vitals()` usage contract remains stable.

### Compatibility Rules for Refactor Waves
- Internal refactors are allowed if externally visible behavior remains unchanged.
- If internals are renamed/restructured, keep compatibility wrappers until all call sites migrate.
- Do not rename DB keys/fields, wasm exports, or metric identifiers listed above.

## Actions
_No actions recorded._

## Validation
_Validation details not recorded._

## References
_No references recorded._

