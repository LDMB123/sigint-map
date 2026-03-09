# CLAUDE.md — SIGINT-MAP

## Overview

Real-time 4D conflict tracker built with Next.js 16, React 19, and Three.js. A large legacy runtime (`src/legacy/app.js`, ~8.8k lines) renders a WebGL globe with live data overlays. It is wrapped by a thin React component (`LegacyDashboard.jsx`) and served by the Next.js App Router.

## Commands

```bash
npm run dev            # Start dev server (webpack, port 3000)
npm run build          # Production build
npm run check:static   # Run all 15 static validation checks
npm run check:prod     # Static checks + build + runtime smoke test
npm run check:runtime  # Smoke test only (boots prod server on port 3210)
```

Always run `npm run check:static` after editing any file under `src/`, `app/`, or `scripts/`.

## Architecture constraints

- **Webpack only** — Turbopack is not used; the legacy runtime is too large for it.
- **`reactStrictMode: false`** — Required by the legacy Three.js lifecycle.
- **CSP allows `unsafe-inline` / `unsafe-eval`** — Necessary for legacy runtime. Do not tighten without verifying the full app.
- **Server-side secrets** — `FIRMS_API_KEY` and `OPENRADIATION_API_KEY` are only used in API routes under `app/api/`. They must never appear in client-side code. The `check-client-secrets` script enforces this.

## Key conventions

- **CSS tokens** — `globals.css` defines all colors/spacing via CSS custom properties on `:root, [data-theme="dark"]`. Never use hardcoded hex colors in components; use `var(--color-*)` tokens.
- **Typography** — Three font families loaded via Google Fonts `@import` at the top of `globals.css`: Rajdhani (display/headings via `--font-display`), Barlow (body via `--font-body`), Share Tech Mono (code/data via `--font-mono`). Use the CSS variables, not raw font names.
- **Sidebar groups** — Sidebar sections are wrapped in native `<details>/<summary>` elements with `.sidebar-group` classes. Each group has a color-coded variant (e.g. `--threat`/red, `--isr`/cyan, `--force`/green, `--analytics`/amber, `--feeds`/indigo). Adding a new sidebar section means placing it inside the appropriate `<details>` group in `dashboard.html`.
- **Error/404 pages** — Use the `sigint-route-error` CSS class pattern (see `error.jsx` and `not-found.jsx`).
- **File collection in scripts** — Use `readdir` with `withFileTypes` recursion (see `collectFiles()` in `check-dead-code.mjs`). Do not use experimental `fs/promises` glob.
- **Proxy allowlist** — All upstream hosts are defined in `src/lib/upstream-proxy.js`. Adding a new data source requires adding its host there.

## File structure

- `app/` — Next.js App Router (layout, page, error, 404, robots.txt, sitemap.xml, API routes)
- `src/legacy/` — Core dashboard runtime (15 modules). `app.js` is the main file.
- `src/lib/` — Proxy logic (`upstream-proxy.js`) and shared route helpers
- `src/components/` — React wrappers
- `scripts/` — 15 static check scripts + 1 smoke test (`smoke-prod.mjs`)
- `public/` — Static assets (globe texture)

## Static checks (15 scripts)

Each script validates specific invariants. If adding new features:

- New DOM IDs → must pass `check-dashboard-refs.mjs` (114 JS refs, 110 markup IDs)
- New upstream hosts → must appear in allowlist (`check-upstream-hosts.mjs`)
- New `src/` JS/JSX files → scanned by `check-client-secrets.mjs` and `check-dead-code.mjs`
- New feature wiring → validated by `check-feature-wiring.mjs`

## Things to avoid

- Do not add dependencies without strong justification — the project has only 4 runtime deps.
- Do not refactor `app.js` into modules without a migration plan — the static checks and smoke test depend on specific patterns.
- Do not remove or rename `data-*` attributes in `dashboard.html` — they are binding points for the legacy runtime.
