# Codex Working Context Plan

- Archive Path: `docs/archive/phase-docs/CODEX_WORKING_CONTEXT_PLAN.md`
- Normalized On: `2026-03-04`
- Source Title: `Codex Working Context Plan`

## Summary
Last updated: 2026-02-13

## Context
Last updated: 2026-02-13

## Actions
_No actions recorded._

## Validation
1. Read this file.
2. Read the two canonical docs listed above.
3. Run `git status --short`.
4. Continue from the first unfinished item in "Resume Order".

## References
1. Main execution plan: `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/docs/AUTONOMOUS_WHOLE_APP_SIMPLIFICATION_PLAN.md`
2. Contract freeze: `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/docs/simplification-contracts.md`

### Goal
Finish whole-app simplification without breaking wasm exports, persistence contracts, or analytics payload contracts.

### Current Snapshot
1. Wave 0 is complete (baseline + contract freeze).
2. Refactor work completed across Waves 1 through 6.
3. Wave 7 docs/maintainability closeout is complete.

### Recent Completed Work
1. Added shared DB row helpers in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/db_rows.rs` and wired module in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/lib.rs`.
2. Replaced ad-hoc panel event parsing with typed helpers in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/navigation.rs`, `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/games.rs`, `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/progress.rs`, and `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/gardens.rs`.
3. Simplified view transition interop and row parsing paths in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/companion_skins.rs`.
4. Consolidated repeated badge DB logic in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/badges.rs`.
5. Added shared E2E startup helper in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/e2e/helpers.ts` and reused it in smoke/visual/webkit/a11y specs.
6. Latest validation snapshot:
   - `cargo check --release`: PASS
   - `cargo test --release`: PASS
   - `npm run test:e2e`: PASS
   - `npm run test:e2e:all`: PASS

### Gate Snapshot (2026-02-13)
1. `cargo check --release`: PASS
2. `cargo test --release`: PASS (`8 passed`)
3. `npm run test:e2e:all`: PASS (`33 passed`)
4. E2E runner auto-fell back to port `4174` when `4173` was occupied.

### Resume Order
1. If new simplification work starts, begin from the contracts doc and preserve frozen interfaces.
2. Run full gate after meaningful refactors:
   - `cargo check --release`
   - `cargo test --release`
   - `npm run test:e2e:all`
3. Update this file and the main plan doc with command evidence.

### Guardrails
1. Keep `#[wasm_bindgen]` export signatures in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/lib.rs` unchanged.
2. Preserve storage keys/value shapes in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/progress.rs`, `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/mom_mode.rs`, and `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/gardens.rs`.
3. Preserve analytics field names/semantics in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/metrics/web_vitals.rs`.
4. Keep compatibility wrappers for moved internals until call-site migration is complete.
5. Do not revert unrelated dirty worktree changes.

