# GDL Flower Tracker

A FastAPI + Next.js PWA for tracking **Green Dot Labs flower availability, pricing, and price history** around Colorado Springs.

This version includes a **production hardening + optimization pass**, a deeper **UI / UX overhaul**, and an installable **offline-capable PWA layer**:

- **Spotlight hero** that recommends the best current pickup in your visible view
- **Quick-jump presets** for value hunting, bulk deals, MED / REC pivots, history, and map workflows
- **Quick Compare** cards for closest / best-value / widest-selection stores
- **Map sidebar + focus actions** so you can jump from cards and rows directly to the map
- **Mobile-friendly responsive table cards** with inline map / filter actions
- **Saved Views** stored locally for offline re-entry into common scan modes
- **Install prompts + standalone metadata** for desktop browsers, macOS Safari, and iOS Safari
- **Offline snapshot browsing** from the last successful dashboard fetch
- **Manifest, service worker, Apple touch icon, and install screenshots** for proper PWA delivery

- **No import-time DB side effects** (startup work happens in FastAPI lifespan)
- **DB-backed job locks** (`job_locks` + `job_runs`) with a shared pipeline lock so refresh/scrape/bootstrap work cannot overlap across **multiple processes/workers**
- **SQLite hardening** (WAL mode, foreign keys, busy timeout)
- **Faster reads** (`/api/data` uses a single joined query instead of N+1 queries)
- **TTL caching** for hot endpoints (`/api/data`, `/api/stats`, `/api/status`, `/api/scrape-status`, `/api/jobs`, `/api/price-history`)
- **Optional scheduler** that’s **lock-safe** (won’t collide across workers)
- **GZip compression** for large JSON responses
- **Docker + Gunicorn** deployment support
- **Layout-resilient GDL parser** that handles the current visible drop text format, including `FLOWER 3.5G SINGLE (MED)` style entries
- **Detail-page enrichment** that supplements the main GDL directory with local dispensary drop pages so flower inventory is still captured when the top-level feed is truncated
- **Broader flower-line parsing** for current variants such as `BLACK LABEL FLOWER 3.5G (MED)` without accidentally pulling in pre-roll lines
- **Recent jobs API** (`/api/jobs`) for operational visibility
- **Bundled dashboard API** (`/api/dashboard`) so the frontend can load core data, status, jobs, and history in one round-trip
- **Sync-all pipeline** (`POST /api/sync`) that refreshes GDL listings and then scrapes live menus under one lock
- **Refresh preservation of live fields** so listing refreshes do not wipe already-scraped prices/THC
- **Partial scrape backfill** so unmatched items still receive known fallback pricing when available
- **Refresh shrink safeguards** so a suspiciously incomplete upstream parse will preserve the last known-good dataset instead of wiping the tracker
- **Job-lock heartbeats** so long-running refresh/scrape/sync work does not lose its lock mid-run
- **Tighter local-area filtering** for the Colorado Springs footprint instead of broad `801/808/810` zip-prefix matching
- **More trustworthy store mapping** by preferring specific local address fragments and preserving known-good store coordinates across refreshes
- **Cleaner ops status semantics** so listing refresh timestamps and price-scrape timestamps are reported separately instead of being conflated
- **Shareable frontend state** (filters + tab + sort encoded into the URL) with deterministic URL precedence so shared links do not inherit stale local filters
- **Frontend request timeouts** and safer external-link sanitization for cleaner failure handling
- **Priced-only mode** and **unit-price (`$/g`) comparisons** in the UI/table/export
- **Null-safe numeric rendering** so missing price / THC / derived values stay unavailable instead of rendering as false `$0`
- **Seed-aware status copy** so packaged/bootstrap data is labeled honestly instead of looking like a live refresh
- **Conditional GET / ETag support** for static assets and explicit `HEAD` support on frontend routes
- **Baseline CSP / cross-origin hardening headers** for a safer production deployment footprint
- **Graceful frontend degradation** so the core tracker still renders if optional panels (history/jobs/status) fail
- **Startup recovery for stale job state** from packaged DBs or interrupted runs
- **Preserved menu vs. drop links** so listing refreshes keep customer-facing menu URLs while still recording the latest GDL drop page
- **Direct menu-link extraction** from GDL detail pages, so more dispensaries ship with working “Order now” links even when the static mapping is incomplete
- **Source-priority live menu merging** so lower-priority platforms do not overwrite stronger Weedmaps/Dutchie matches with stale prices
- **Packaged DB metadata backfill** so known dispensaries ship with working outbound menu links and known GDL drop links even before the first refresh
- **Richer operations log** with persisted job result summaries (counts, priced coverage, and warning notes)
- **Visibility-aware frontend polling** so background tabs do less useless network work while active jobs still refresh correctly when you return
- **Facet count labels** on type/size filters and case-preserving search input for a more polished UI

---

## Local bootstrap

Use **Python 3.11** for local development, CI, and Docker parity.

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
npm ci
python api_server.py
```

Open:

```text
http://127.0.0.1:8000/

For frontend-only development:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```
```

Frontend/browser smoke tooling:

```bash
npx playwright install chromium
npm run smoke:frontend
BASE_URL=http://127.0.0.1:8000 npm run smoke:browser
```

---

## Run in production (recommended)

### Option A: Gunicorn (recommended)

```bash
pip install -r requirements.txt
export APP_ENV=production
export PORT=8000
export DB_PATH=/absolute/path/to/gdl_data.db
export CORS_ORIGINS=https://yourdomain.com
export TRUSTED_HOSTS=yourdomain.com,www.yourdomain.com
export ADMIN_API_TOKEN=replace-with-long-random-token
export SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
export NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
export SENTRY_ENVIRONMENT=production
export RELEASE_SHA=$(git rev-parse --short HEAD)

gunicorn -c gunicorn_conf.py api_server:app
```

### Option B: Docker

```bash
docker build -t gdl-tracker .
docker run --rm -p 8000:8000 \
  -e APP_ENV=production \
  -e CORS_ORIGINS='https://yourdomain.com' \
  -e TRUSTED_HOSTS='yourdomain.com,localhost,127.0.0.1' \
  -e ADMIN_API_TOKEN='replace-with-long-random-token' \
  -e AUTO_BOOTSTRAP_IF_EMPTY=false \
  -e SENTRY_DSN='https://examplePublicKey@o0.ingest.sentry.io/0' \
  -e NEXT_PUBLIC_SENTRY_DSN='https://examplePublicKey@o0.ingest.sentry.io/0' \
  -e SENTRY_ENVIRONMENT='production' \
  -e RELEASE_SHA='manual' \
  -v gdl_data:/data \
  gdl-tracker
```

Or:

```bash
docker compose up --build
```

The compose file is production-oriented: it binds the app to `127.0.0.1:8000`, expects explicit `CORS_ORIGINS`, `TRUSTED_HOSTS`, `ADMIN_API_TOKEN`, and `RELEASE_SHA`, and exposes a container healthcheck against `/readyz`.

---

## Environment variables

See `.env.example` for the full set. Common ones:

- `APP_ENV` — `development` or `production`
- `PORT` — server port (default `8000`)
- `DB_PATH` — SQLite file path (default `./gdl_data.db`)
- `CORS_ORIGINS` — `*` (dev) or comma-separated allowed origins (production)
- `TRUSTED_HOSTS` — optional comma-separated host allowlist for Host header hardening
- `ADMIN_API_TOKEN` — shared bearer token for `POST /api/refresh`, `/api/sync`, and `/api/scrape` in production
- `SENTRY_DSN` — backend Sentry DSN for FastAPI error capture
- `NEXT_PUBLIC_SENTRY_DSN` — browser Sentry DSN compiled into the exported frontend
- `SENTRY_ENVIRONMENT` — release environment label for Sentry events
- `RELEASE_SHA` — release/version identifier attached to backend and frontend error events
- `DETAIL_PAGE_ENRICHMENT_ENABLED` — set `false` to disable local detail-page supplementation during refreshes
- `DETAIL_PAGE_FETCH_LIMIT` — max GDL drop pages fetched during one refresh
- `DETAIL_PAGE_CONCURRENCY` — concurrent GDL detail-page requests during refresh
- `SCHEDULER_ENABLED` — set `true` to run periodic menu scrapes
- `AUTO_BOOTSTRAP_IF_EMPTY` — if `true` and DB has no dispensaries, the server will auto-refresh + scrape on boot (default: `true` in dev/test, `false` in production)

Menu scraper tuning:

- `MENU_SCRAPE_CONCURRENCY` (default `8`)
- `MENU_SCRAPE_TIMEOUT_SECONDS` (default `20`)
- `MENU_SCRAPE_RETRIES` (default `2`)

---

## API endpoints

- `GET /api/data`
- `GET /api/stats`
- `GET /api/status`
- `GET /api/jobs`
- `GET /api/dashboard`
- `GET /api/scrape-status`
- `GET /api/price-history`
- `POST /api/refresh`
- `POST /api/sync`
- `POST /api/scrape`

### `GET /api/price-history` query params

- `limit` — max rows returned, capped at `2000`
- `size` — exact size filter like `3.5g`
- `type` — `REC` or `MED`
- `strain` — case-insensitive partial match

Example:

```text
/api/price-history?limit=250&type=REC&size=3.5g&strain=fuchsia
```

---

## Operational notes

### Scheduler safety

The scheduler uses a **DB-backed lock**, so even if you run multiple Gunicorn workers, only one process will run the scheduled scrape at a time.

For the recommended VM deployment, keep `SCHEDULER_ENABLED=false` in the web container and use the provided cron entry to call `POST /api/sync` locally every 6 hours with the admin bearer token. The sample cron and helper script live under `ops/cron/` and `scripts/run_sync.sh`.

### SQLite persistence

SQLite is totally fine for this use case. If you run in Docker, mount a volume (`/data`) so `gdl_data.db` persists across restarts.

Nightly backups are handled by `scripts/backup_db.py`, which keeps `7` daily and `4` weekly snapshots by default. Restore drills can use `scripts/restore_db.py --source <backup> --dest /path/to/gdl_data.db --force`.

### Monitoring

Production monitoring is intentionally minimal:

- **Sentry** captures backend and browser exceptions with `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, and `RELEASE_SHA`
- **Better Stack** (or equivalent) should watch `/healthz` and `/readyz` and retain Docker stdout/stderr logs
- `python3 scripts/emit_backend_sentry_test.py` emits a backend Sentry test event using the current env
- Browser Sentry can be verified by throwing one deliberate console error on the live site; see `ops/PRODUCTION_RUNBOOK.md`

### VM deployment assets

- `ops/Caddyfile` — TLS terminator / reverse proxy example for a single-VM deployment
- `ops/production.env.example` — production env template for Docker-based deploys
- `ops/cron/gdl-tracker.cron` — sample cron entries for scheduled syncs and nightly DB backups
- `ops/PRODUCTION_RUNBOOK.md` — deployment, monitoring, restore rehearsal, rollback, and go-live checklist

### Public production mode

This app is designed to serve public read endpoints in production. The dashboard can remain public, but mutating admin endpoints are protected:

- `POST /api/refresh`
- `POST /api/sync`
- `POST /api/scrape`

Production behavior:

- if `ADMIN_API_TOKEN` is unset, the app stays in read-only mode and those endpoints return `503`
- if `ADMIN_API_TOKEN` is set, they require `Authorization: Bearer <token>` and return `401` when missing or invalid

The browser UI disables these actions in public production mode and shows a clear read-only notice.

### Frontend quality-of-life improvements

- `Priced only` instantly hides rows without confirmed pricing
- Type/size toggles show **live facet counts** under the current view constraints
- `Share view` copies a URL that restores the current tab, filters, sort, history settings, and theme
- Table exports include **unit price** plus both **menu** and **drop** URLs so different sizes and sources are easier to compare offline
- The header now surfaces **fresh / aging / stale / seeded** data state and the insights tab shows recent refresh/scrape jobs
- `Sync All` runs a full refresh + price scrape in one action and the UI polls job state while long operations are running
- Dispensaries with mixed priced/unpriced menus now show honest coverage and unavailable rows render as `No price`, never `$0`

---

## Project files

- `api_server.py` — FastAPI app entrypoint, DB logic, refresh/scrape endpoints, scheduler, frontend routes
- `menu_scrapers.py` — Dutchie / Weedmaps / Leafly / Jane menu fetchers (concurrency-limited)
- `frontend/` — Next.js App Router frontend, PWA assets, Vitest tests, and Workbox build step
- `server/config.py`, `server/static_assets.py`, `server/status_helpers.py` — extracted settings, static delivery, and status provenance helpers
- `js/runtime-helpers.js`, `js/status-helpers.js` — legacy helper modules still preserved for `/legacy`
- `styles/polish.css` — legacy polish layer still preserved for `/legacy`
- `index.html`, `style.css`, `base.css` — migration-only legacy dashboard assets
- `smoke_frontend.js`, `browser_smoke.mjs`, `package.json` — frontend VM smoke plus real-browser Chromium smoke tooling
- `gdl_data.db` — SQLite database (optional; can be created automatically)
- `Dockerfile`, `docker-compose.yml`, `gunicorn_conf.py`, `.env.example` — deployment helpers

---

## Development

### Run tests

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
npm ci
pytest -q
npm run smoke:frontend
```

For the real browser smoke, run the server in one terminal and then:

```bash
npx playwright install chromium
BASE_URL=http://127.0.0.1:8000 npm run smoke:browser
```

### Release checklist

```bash
python -m py_compile api_server.py menu_scrapers.py update_prices.py server/config.py server/static_assets.py server/status_helpers.py
pytest -q
npm run frontend:build
npm run smoke:frontend
npm run frontend:typecheck
npm run frontend:audit
npm run frontend:audit:all
python -m pip install pip-audit
python -m pip_audit -r requirements.txt --progress-spinner off
npx playwright install chromium
BASE_URL=http://127.0.0.1:8000 npm run smoke:browser
docker build -t gdl-tracker .
docker run --rm -p 8000:8000 -e APP_ENV=production -e AUTO_BOOTSTRAP_IF_EMPTY=false -v gdl_data:/data gdl-tracker
```

### Release runbook

1. Build and push the Docker image after CI is green.
2. Run `scripts/backup_db.py` or snapshot the `/data` volume before updating the container.
3. Deploy behind Caddy using `ops/Caddyfile` and explicit `CORS_ORIGINS`, `TRUSTED_HOSTS`, `ADMIN_API_TOKEN`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, and `RELEASE_SHA`.
4. Verify `/healthz`, `/readyz`, `/`, `/favicon.ico`, and the browser smoke against the deployed URL:

```bash
python3 scripts/release_smoke.py --base-url https://tracker.example.com --expected-admin-status 401
```

5. Emit one Sentry test event from backend and browser.
6. Install the sample cron from `ops/cron/gdl-tracker.cron` so syncs and backups are automated on the VM.
7. Run a restore rehearsal before go-live:

```bash
python3 scripts/restore_rehearsal.py --source /path/to/backup.db --image gdl-tracker:$RELEASE_SHA --min-dispensaries 1
```

8. If deployment fails, roll back to the previous image and restore the last DB snapshot if the release changed data unexpectedly.

Recent QA additions include regression coverage for:

- generic-address coordinate misassignment
- preserving known-good coordinates during refresh
- separating last listings refresh from last price scrape in status payloads
- seed/bootstrap provenance fields in API status payloads
- preserving `null` prices over `/api/data`
- null-price frontend rendering (`No price`, never `$0`) in the VM smoke
- parsing current-drop detail pages and extracting direct order/menu links
- supplementing sparse top-level refreshes with local detail-page flower data
- preserving higher-priority live menu prices when multiple platforms disagree
