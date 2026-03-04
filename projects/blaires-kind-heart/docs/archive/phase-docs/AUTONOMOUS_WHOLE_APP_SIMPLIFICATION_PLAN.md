# Autonomous Whole-App Simplification Plan (Aggressive, No-Breakage)

- Archive Path: `docs/archive/phase-docs/AUTONOMOUS_WHOLE_APP_SIMPLIFICATION_PLAN.md`
- Normalized On: `2026-03-04`
- Source Title: `Autonomous Whole-App Simplification Plan (Aggressive, No-Breakage)`

## Summary
This plan simplifies the full app in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart` by replacing ad-hoc abstractions with native typed APIs, consolidating JS/WASM interop, decomposing oversized Rust modules, removing dead code/dependencies, and slimming scripts/docs/deploy paths. It is designed for autonomous execution end-to-end with strict compatibility constraints.

### Public APIs / Interfaces / Types (Explicit Contract)
1. Preserve all existing `#[wasm_bindgen]` exported function names and signatures in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/lib.rs`.
2. Preserve storage keys and value shapes used in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/progress.rs`, `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/mom_mode.rs`, and `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/gardens.rs`.
3. Preserve analytics payload field names and semantics from `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/metrics/web_vitals.rs` and related emitters.
4. Add one optional interface only: `E2E_PORT` in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/playwright.config.ts`; default remains `4173`.
5. If internal API names move/rename, keep compatibility wrappers until all internal call sites are migrated.

### Execution Model
1. Execute wave-by-wave autonomously with no pause unless a hard blocker appears.
2. End each wave with targeted validation; run full build+e2e gate every second wave.
3. Do not revert unrelated dirty worktree changes; touch only files required by the wave.
4. Prefer native browser APIs and typed `web_sys` interop over `Reflect`/manual object plumbing.

## Context
_Context not recorded in source archive document._

## Actions
1. Wave 0: Baseline + contract freeze.
2. Wave 1: Interop boundary consolidation.
3. Wave 2: Decompose large game modules + shared primitives.
4. Wave 3: Audio/animation simplification with native APIs.
5. Wave 4: Persistence/state path cleanup.
6. Wave 5: Build/test/deploy script slimming.
7. Wave 6: Dead code + dependency pruning.
8. Wave 7: Docs and maintainability finish.

## Validation
1. Preflight e2e port scenario: if port `4173` is occupied, run e2e on `E2E_PORT=<free_port>` and verify webServer/baseURL alignment.
2. Compile safety: `cargo check --release` after each Rust-touching wave.
3. Behavior safety: `cargo test --release` plus targeted tests for moved game logic and persistence serialization.
4. E2E safety: `npm run test:e2e` after Waves 2, 5, and 7; `npm run test:e2e:all` at final gate.
5. Contract safety: verify wasm exports, storage keys, and analytics payload keys against `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/docs/simplification-contracts.md`.
6. Regression safety: no feature removals, no schema/key migrations, no analytics field renames.

### Assumptions and Defaults
1. "Aggressive" allows major internal refactors, file moves, and abstraction removal.
2. "No breakage" means no destructive public/runtime/storage contract changes.
3. Existing dirty worktree is valid context; simplification will not reset/revert unrelated changes.
4. Browser support baseline remains unchanged.
5. When a simplification risks behavior drift, default is compatibility shim first, cleanup second.

### Definition of Done
1. Scattered `Reflect` interop is reduced to a central typed boundary with documented exceptions only.
2. Largest Rust files are decomposed into cohesive modules with lower complexity.
3. Script/deploy surface is materially smaller and less duplicated.
4. Final gate passes: `cargo check --release`, `cargo test --release`, `npm run test:e2e:all`.
5. Docs accurately reflect the simplified architecture and maintenance workflow.

### Progress Tracker
- [x] Plan captured in-repo for autonomous execution reference.
- [x] Wave 0 complete.
- [x] Wave 1 complete.
- [x] Wave 2 complete.
- [x] Wave 3 complete.
- [x] Wave 4 complete.
- [x] Wave 5 complete.
- [x] Wave 6 complete.
- [x] Wave 7 complete.

### Execution Notes (2026-02-13)
1. Interop simplification landed for panel event handling via typed parser path in `rust/navigation.rs`, with migrated call sites in `rust/games.rs`, `rust/progress.rs`, and `rust/gardens.rs`.
2. Shared DB row parsing utilities were centralized in `rust/db_rows.rs` and adopted in high-traffic modules (notably `rust/gardens.rs`, `rust/companion_skins.rs`, and `rust/badges.rs`).
3. E2E startup synchronization was consolidated in `e2e/helpers.ts` and reused across smoke/visual/webkit/a11y specs.
4. Persistent operator context file added: `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/docs/CODEX_WORKING_CONTEXT_PLAN.md`.
5. Wave 7 closeout completed with docs synchronization and final validation gate confirmation.
6. Final gate confirmation (2026-02-13):
   - `cargo check --release`: PASS
   - `cargo test --release`: PASS (`8 passed`)
   - `npm run test:e2e:all`: PASS (`33 passed`, auto-fallback to port `4174` when `4173` was busy)

## References
_No references recorded._

