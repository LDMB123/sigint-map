# Dependency Hygiene Master Plan (Rust-First)

## Goal

Keep runtime dependencies minimal, intentional, and measurable across:

- Rust server/runtime crates
- WASM/hydration surface
- E2E/tooling packages

## Current Principles

1. Prefer Rust/standard-library solutions over new third-party packages.
2. Add dependencies only when they provide durable value that is hard to replace.
3. Treat browser-side payload impact and compile-time impact as first-class costs.
4. Remove stale dependencies as soon as migration code paths are retired.

## Dependency Tiers

### Tier 1 - Core Runtime (retain)

- `leptos` / `leptos_router`
- `wasm-bindgen` / `wasm-bindgen-futures` / `web-sys` / `js-sys`
- `serde` / `serde_json` / `serde-wasm-bindgen`
- `tokio` / `axum` / `tower-http`

### Tier 2 - Data and Pipeline (retain, monitor)

- `sqlx`
- scraping/transformation stack used by `dmb_pipeline`

### Tier 3 - Optional/Feature-Specific (strict review)

- Anything only used by diagnostics features
- New JS-side dependencies in `e2e/package.json`

## Elimination Policy

For each candidate dependency:

- Verify usage count and call-site spread.
- Verify replacement feasibility with existing code/utilities.
- Verify expected gains (bundle size, build speed, maintenance burden).
- Remove in small, reversible steps with tests at each step.

## Implementation Plan

### Phase 1 - Inventory and Baseline

- Record duplicates and heavy transitive trees:
  - `cd rust && cargo tree -d`
- Record JS-side baseline:
  - `cd e2e && npm ls --depth=0`

### Phase 2 - Rust Crate Cleanup

- Remove unused crate imports and stale feature flags.
- Collapse duplicate helper code into shared modules where it reduces dependency pressure.
- Re-run:
  - `cd rust && cargo clippy --workspace --all-targets -- -D warnings`

### Phase 3 - WASM Surface Cleanup

- Keep browser interop wrappers centralized under `rust/crates/dmb_app/src/browser/`.
- Remove one-off browser bindings from feature pages/components.
- Re-run hydrate checks and diagnostics E2E gates.

### Phase 4 - Tooling Dependency Review

- Keep `e2e` dependencies minimal and pinned.
- Avoid adding build-only tooling unless it closes a concrete gap.
- Validate scripts documentation stays in sync (`scripts/README.md`).

## Validation Checklist

- `cd rust && cargo fmt --all -- --check`
- `cd rust && cargo clippy --workspace --all-targets -- -D warnings`
- `cd rust && cargo test --workspace`
- `bash scripts/cutover-rehearsal.sh`
- `python3 scripts/check-doc-integrity.py`

## Success Metrics

- No unused direct dependencies in `rust/Cargo.toml` or `e2e/package.json`.
- No reintroduction of legacy JS UI dependency paths in active docs.
- Stable or reduced WASM payload size for `rust/static/pkg/` outputs.
- Stable cutover and AI degradation quality gates.
