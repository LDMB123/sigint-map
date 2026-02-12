# Local Cutover Status (Rust-First Offline PWA)

Date (local): 2026-02-06

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

This doc is a checkpoint so someone can continue the local-only offline PWA transition in a fresh session, with the explicit goal of removing any remaining pre-Rust assumptions safely.

## Current State (What’s Working)
- Rust cutover gates are green locally:
  - `bash scripts/cutover-rehearsal.sh` (starts Rust server on `BASE_URL`, builds runtime SQLite into `.tmp/`, runs Rust-only E2E subset)
  - `BASE_URL=http://127.0.0.1:3100 bash scripts/cutover-remote-e2e.sh` (runs Rust-only E2E subset against an already-running origin)
- Rust-only Playwright harness exists under `e2e/`.
- Canonical static seed data is under `data/static-data`.
- Route parity uses a checked-in fixture (not a removed prototype route tree):
  - `rust/crates/dmb_app/tests/fixtures/routes_fixture.json`

## Key Fixes Landed (So Far)
- Scraper hardening:
  - `rust/crates/dmb_pipeline/src/scrape.rs` moved away from selector/capture `unwrap()` so upstream HTML changes fail as recoverable errors instead of panics.
- Rust IndexedDB drift handling + repair:
  - `rust/crates/dmb_idb/src/schema.rs`: `DB_VERSION` bumped so missing stores/indexes can be created via upgrade.
  - `rust/crates/dmb_app/src/data.rs`: integrity verification triggers an auto-repair path when an import marker exists but stores are missing/partial.
  - `rust/crates/dmb_idb/src/lib.rs`: added store clearing + sync-meta deletion utilities used by repair.
- Service worker update E2E stabilization:
  - `rust/crates/dmb_app/src/components/pwa_status.rs`: SW message/controllerchange handling made deterministic for tests.

## How To Run (Two Local Modes)
1. Separate origin (recommended to avoid SW scope collisions):
   - `BASE_URL=http://127.0.0.1:3100 bash scripts/cutover-rehearsal.sh`
   - Or: start Rust server yourself and run `BASE_URL=http://127.0.0.1:3100 bash scripts/cutover-remote-e2e.sh`

2. Same origin (what a later public cutover would resemble):
   - `BASE_URL=http://127.0.0.1:3000 bash scripts/cutover-rehearsal.sh`

## What “Removing The Old Prototype” Means
1. Run the Rust app on its own origin (different port) and validate the migration + cache-cleanup paths via the Rust E2E subset.
2. Keep the repo Rust-first:
   - Old UI sources are intentionally removed.
   - Remaining tasks are hygiene: keep docs and scripts aligned with the Rust-only workflow, and keep cutover gates green.

## Remaining Work (Next Tasks)
1. Remove lingering doc references to removed paths.
2. Run a “no removed path” audit:
   - `rg -n \"\\bapp/\" -S docs`
3. Re-run gates after doc changes:
   - `bash scripts/cutover-rehearsal.sh`
   - Optional: run remote E2E against a separate origin.

## Primary References
- Cutover runbook: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/ops/CUTOVER_RUNBOOK.md`
- Cutover rehearsal gate: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/scripts/cutover-rehearsal.sh`
- Remote E2E gate: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/scripts/cutover-remote-e2e.sh`
