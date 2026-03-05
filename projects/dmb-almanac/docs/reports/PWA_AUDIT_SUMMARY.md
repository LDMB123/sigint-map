# PWA Audit Summary (Rust-First)

This repo is currently a local-only, offline-first PWA built with Rust (Leptos SSR + WASM hydration) and a Rust Service Worker.

If you find older documents that discuss a JavaScript UI or an old minified service-worker artifact, treat them as historical only. The old UI implementation is intentionally removed from this repo.

## What We Gate Today (Go/No-Go)

The practical PWA reliability gates are:

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
bash scripts/cutover-rehearsal.sh
```

This validates end-to-end:

- Offline seed import completes (no stalls)
- Offline navigation works
- Service Worker update is detected and applied
- Multi-deploy SW update does not loop
- One-time cleanup for older CacheStorage entries (safe, scoped)
- One-time IndexedDB migration for older prototype DB (safe, verified)

## Current Implementation Pointers

- Service Worker entrypoint (served at `/sw.js`): `rust/static/sw.js`
- Cache headers to prevent stale-bundle loops: `rust/crates/dmb_server/src/main.rs` (`cache_control_middleware`)
- PWA status panel + update UX: `rust/crates/dmb_app/src/components/pwa_status.rs`
- Offline hydration/import flow: `rust/crates/dmb_app/src/data.rs`

## Full Historical Audit (Optional)

The prior long-form audit is retained as reference only:

- `docs/reports/_full_audits/PWA_AUDIT_2026-02-03.md`
