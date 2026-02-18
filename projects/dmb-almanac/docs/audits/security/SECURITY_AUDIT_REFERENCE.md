# Security Reference (Rust-First Local PWA)

Scope: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

This project is currently local-only (not publicly deployed). The main security focus is preventing "bricked client" states from stale caches, keeping the Service Worker update path deterministic, and avoiding unsafe server endpoints if/when it is exposed beyond localhost.

## Current Server Surface Area

The Rust server is `rust/crates/dmb_server` (Axum + Leptos SSR). It exposes:

- Health: `GET /api/health`, `GET /api/ai-health`
- Diagnostics: `GET /api/data-parity`
- Sitemaps: `GET /sitemap*.xml`

## Cache Safety (Prevents Stale-Bundle Loops)

`rust/crates/dmb_server/src/main.rs` adds a cache-control middleware to avoid browser HTTP caching serving old JS/WASM/data:

- `no-cache` on `/sw.js`, `/pkg/*`, `/app.css`, `/webgpu*.js`, `/data/*`, `/manifest.json`
- `no-store` on HTML responses (and `Vary: Accept`)

This is intentional: the Service Worker + CacheStorage should be the primary cache, not the HTTP cache.

## Cross-Origin Isolation (COOP/COEP)

For `SharedArrayBuffer` and worker SIMD/threads, `dmb_server` can set COOP/COEP:

- Enabled by default.
- Disable with `DMB_COOP_COEP=0` or `DMB_COOP_COEP=false`.

## Request IDs and Observability

`dmb_server` sets and propagates `x-request-id` (tower-http layers) and uses structured tracing logs.

## Local-Only Warnings (Before Any Public Exposure)

Before exposing the server beyond localhost, add:

- Request body size limits for JSON endpoints.
- CORS policy decisions (currently unspecified here, because local-only).
- Rate limiting (if you add any expensive endpoints).
- CSP header policy (this doc does not claim CSP is currently enforced via headers).

## Quick Verification

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
bash scripts/cutover-rehearsal.sh
```

This gates on SW update reliability and offline import completing, which are the primary "safety" concerns for the current local-only phase.
