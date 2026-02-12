# Module Reference (Rust-first)

This repo no longer relies on a separate JavaScript utility tree. The current app surface area is organized by Rust crates under `rust/crates/`.

## Core Crates

- `rust/crates/dmb_core`
  - Shared types and core algorithms (domain models, ANN types, embedding helpers).
- `rust/crates/dmb_idb`
  - IndexedDB schema + client API.
  - Start here for store names, schema parsing, and upgrade behavior.
- `rust/crates/dmb_app`
  - The Rust-first PWA UI (SSR + hydration).
  - Page routing/views are primarily in `rust/crates/dmb_app/src/pages.rs`.
  - PWA lifecycle + update UX: `rust/crates/dmb_app/src/components/pwa_status.rs`.
  - Offline hydration + data import: `rust/crates/dmb_app/src/data.rs`.
  - AI/embeddings load + search: `rust/crates/dmb_app/src/ai.rs`.
- `rust/crates/dmb_server`
  - Local server that serves the app, static bundle (`/data/*`), and Service Worker.
- `rust/crates/dmb_pipeline`
  - Scrape, transform, export, validate, parity checks, and data manifest generation.
- `rust/crates/dmb_wasm`
  - WASM exports for compute-heavy pieces (and WebGPU helpers), consumed by the Rust app.

## Common “Where Is X?” Pointers

- IndexedDB schema changes:
  - `rust/crates/dmb_idb/src/schema.rs`
  - Bump `DB_VERSION` when adding/removing stores or indexes.
- Static data bundle + manifest:
  - Generated into `rust/static/data/`
  - Manifest: `rust/static/data/manifest.json`
- Service Worker update behavior:
  - SW bump + data release orchestration is handled via Rust tooling (see `rust/crates/xtask`).
- E2E tests (including SW update):
  - `e2e/` (Playwright)

## Historical Notes

Some older reports may refer to removed prototypes. Treat those references as historical only; current work should start from the crates listed above.
