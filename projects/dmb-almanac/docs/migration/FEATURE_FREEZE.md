# Feature Freeze Notice

- Effective date: 2026-02-04
- Scope: No new features. Only bug fixes, security fixes, and performance fixes allowed.
- Applies to: UI, API routes, data schema, and scraper changes.
- Exceptions: None without written approval in `docs/migration/MIGRATION_LOG.md`.
- Required labels for any PR: `freeze-exception` (if applicable), `perf`, `security`, or `bug`.

## Rationale
- Migration to Rust/WASM-first architecture
- Aggressive JS surface reduction
- Apple Silicon and Chromium 143 optimization

## Enforcement
- All feature requests are deferred to post-migration backlog
- Weekly checkpoints are required for any exception
