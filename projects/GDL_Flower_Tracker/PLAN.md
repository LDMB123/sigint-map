# Public-Ready Stabilization and Polish Plan for GDL Flower Tracker

## Summary
- Keep the current stack: `FastAPI + vanilla JS + SQLite`. Do **not** re-platform in this effort.
- Optimize for a **public-facing, unauthenticated tracker**.
- Execute in this order:
  1. Fix data-truth and runtime correctness
  2. Modularize backend/frontend without changing behavior
  3. Polish UX, mobile, accessibility, and copy
  4. Add release gates and deployment confidence
- Primary implementation skills/agents: `senior-frontend-engineer`, `javascript-debugger`, `senior-backend-engineer`, `refactoring-guru`, `ui-designer`, `accessibility-specialist`, `playwright`, `qa-engineer`, `release-validator`.

## Implementation Changes
- **Phase 1: Functional correctness first**  
  Owners: `senior-frontend-engineer`, `javascript-debugger`, `playwright`, `senior-backend-engineer`  
  Fix the confirmed frontend coercion bug where missing numeric values become `0`, which is currently causing false `$0` prices, inflated coverage, and bad spotlight/deal recommendations. Audit all derived UI paths that depend on price/THC/unit-price: spotlight, KPIs, compare cards, dispensary cards, map list, tables, exports, sorting, filtering, and freshness summaries. Missing values must render as unavailable, never as zero.
- **Phase 1: Status/data-trust cleanup**  
  Keep the existing API surface, but make freshness and provenance honest. Seeded/bootstrap data must be labeled as seed/bootstrap, not as a live refresh. Remove misleading copy such as fake 100% coverage on mixed-price stores, and add the missing favicon/static essentials so the public app loads cleanly.
- **Phase 2: Modularize the backend without changing deploy contracts**  
  Owners: `senior-backend-engineer`, `refactoring-guru`  
  Split `api_server.py` into a small import-stable entrypoint plus modules for settings, DB/schema, job locking/scheduler, GDL parsing, menu scraping, queries/serialization, and routes/static handling. Keep the Gunicorn/Uvicorn entry contract as `api_server:app`.
- **Phase 2: Modularize the frontend without a framework rewrite**  
  Owners: `senior-frontend-engineer`, `refactoring-guru`  
  Keep `app.js` as the browser entrypoint, but convert it to module-based vanilla JS. Split logic into state, API loading, data-model/normalization, formatters, overview rendering, insights rendering, table rendering, map behavior, and interaction handlers. Split CSS into tokens/base/layout/components/utilities while preserving the current public entry assets.
- **Phase 3: Public-facing polish**  
  Owners: `ui-designer`, `accessibility-specialist`, `playwright`, `responsive`  
  Fix copy issues like `dispensarys`, tighten empty/loading/error states, improve status wording, and make the UI stop recommending unavailable inventory. Compress the mobile header/filter/action density, keep map/table/insights usable at ~390px width, improve keyboard/focus behavior, and do a real accessibility pass on tabs, presets, alerts, icon buttons, and map-list interactions.
- **Phase 4: Release hardening**  
  Owners: `qa-engineer`, `playwright`, `release-validator`, `technical-documentation-writer`  
  Standardize supported runtime on Python `3.11` across local setup, CI, and Docker. Add one documented bootstrap path, a deterministic test/run workflow, and a release checklist that proves local, CI, and containerized runs all work from a clean checkout.

## Public APIs / Interfaces
- Preserve all existing endpoints and verbs: `GET /api/data`, `GET /api/dashboard`, `GET /api/status`, `GET /api/scrape-status`, `GET /api/price-history`, `GET /api/jobs`, `POST /api/refresh`, `POST /api/scrape`, `POST /api/sync`.
- Make the numeric contract explicit: unavailable `price`, `thc`, `thcValue`, and derived client numbers stay `null`; `0` is valid only when the source truly reports zero.
- Add one backward-compatible status provenance field, or equivalent, so the UI can distinguish `seed/bootstrap` from `live refresh` without inferring from strings.
- Static delivery may add module asset paths under `/js/*` and `/styles/*`, but `/`, `/app.js`, `/style.css`, and `/base.css` must remain valid.

## Test Plan
- **Frontend model/unit tests**  
  Cover numeric coercion, mixed priced/unpriced datasets, unit-price derivation, coverage math, spotlight selection, compare-card summaries, and map-list/store-card rendering.
- **Backend/API tests**  
  Cover dashboard/data/status serialization, empty DB behavior, seeded DB behavior, provenance labeling, and regression cases for mixed-price dispensaries such as `Elevations` and `Buku Loud`.
- **Browser smoke with `playwright`**  
  Verify overview load, filter changes, `priced only`, share-view restore, theme toggle, table/map/insights tabs, mobile viewport behavior, and that unavailable prices never render as `$0`.
- **Release checks**  
  CI must run dependency install, syntax checks, backend tests, existing frontend smoke, browser smoke on desktop and mobile widths, and a Docker boot smoke against persisted `/data`.

## Assumptions and Defaults
- This remains a **public tracker**, not an internal operator tool.
- The effort is **stabilize + modularize**, not a React/Next/Vue rewrite.
- Current scrape/data sources remain in scope; source expansion is deferred unless required to restore current functionality.
- The bundled SQLite DB remains acceptable for local seed/demo use, but the UI must never present seeded or incomplete values as fresh live pricing.
