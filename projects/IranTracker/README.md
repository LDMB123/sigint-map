# SIGINT-MAP — Operation Epic Fury

Real-time 4D conflict tracker built with **Next.js**, **React**, and **Three.js**. Renders a WebGL globe with live data overlays — aircraft tracking, seismic activity, thermal hotspots, maritime AIS, radiation monitoring, weather/SIGMET, and OSINT news feeds — all proxied through hardened same-origin API routes.

## Quick start

```bash
npm install
cp .env.example .env.local   # add your API keys
npm run dev                   # http://localhost:3000
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIRMS_API_KEY` | No | NASA FIRMS fire/thermal data |
| `OPENRADIATION_API_KEY` | No | OpenRadiation sensor network |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URL for sitemap (defaults to Vercel deploy URL) |

Copy `.env.example` to `.env.local` and fill in any keys you have. The app runs without them — those data sources will show as offline.

## Production verification

```bash
npm run check:prod
```

This runs three stages:

1. **Static validation** — 15 checks covering syntax, dead code, client-secret scanning, proxy hardening, DOM ID consistency, feature wiring, supply-chain registry hygiene, and more
2. **Production build** — `next build` with webpack
3. **Runtime smoke test** — boots the server, verifies routes and proxy behavior

## Project structure

```
app/
├── layout.jsx              Root layout + metadata
├── page.jsx                Main dashboard route
├── globals.css             Full design system (CSS custom properties)
├── error.jsx               Error boundary
├── not-found.jsx           Custom 404
├── robots.txt/route.js     Dynamic robots.txt
├── favicon.ico
└── api/
    ├── proxy/route.js          Allowlisted upstream proxy
    ├── allorigins-get/route.js Compatibility proxy route
    ├── firms/route.js          NASA FIRMS (server-side key)
    └── openradiation/route.js  OpenRadiation (server-side key)

src/
├── components/
│   └── LegacyDashboard.jsx    React wrapper for legacy runtime
├── legacy/
│   ├── app.js                 Core Three.js dashboard (~8.8k lines)
│   ├── app-utils.js           Shared fetch/status/cleanup helpers
│   ├── shared-utils.js        Browser utilities (clipboard, storage, geo math)
│   ├── init.js                Bootstrap lifecycle
│   ├── dashboard.html         Dashboard HTML template
│   ├── runtime-patches.js     Fetch/ImageLoader monkey-patches
│   ├── url-rewriter.js        Legacy URL → proxy rewriter
│   ├── showcase-suite.js      Founder mode, captions, poster export
│   ├── executive-deck.js      Command Deck surface
│   ├── fusion-center.js       Multi-source signal clustering
│   ├── ops-workbench.js       Analyst triage and briefing board
│   ├── watch-center.js        Regional geo-fenced watch zones
│   ├── glass-prompt.js        Analyst command palette
│   ├── groundbreaking.js      Feature composition and wiring
│   └── resource-tracker.js    Source health telemetry
└── lib/
    ├── upstream-proxy.js      Proxy core (allowlist, redirect safety, headers)
    └── upstream-route.js      Shared route helper for API routes

scripts/                       Static checks and smoke tests (15 scripts)
```

## Key features

- **Live data feeds** — ADS-B aircraft, USGS seismic, NASA FIRMS thermal, GDELT/OSINT news, maritime AIS, weather/SIGMET, radiation monitoring, oil price
- **Command Deck** — Pulse scoring, lead incidents, watch hotspots, operator actions
- **Fusion Center** — Clusters nearby multi-source signals into ranked, corroborated incidents
- **Ops Workbench** — Briefing board, baseline/delta monitoring, markdown export
- **Regional Watch Center** — Geo-fenced zones with alert arming and delta counts
- **Showcase Suite** — Founder mode, cinematic tour, share captions, SVG poster export
- **Shareable deep links** — Preserves full analyst state including mode, deck, and tour state
- **Operational modes** — Analyst, Briefing, Kiosk

## Architecture notes

The dashboard logic lives in a large legacy runtime (`app.js`) wrapped by a React component. The production stack provides:

- **Server-side secret isolation** — API keys never reach the client bundle
- **Hardened upstream proxy** — allowlisted hosts, redirect validation, credential blocking, port restrictions
- **15 static checks** — syntax, dead code, client secrets, proxy invariants, DOM ID consistency, feature wiring, render optimization patterns, supply-chain registry hygiene
- **Runtime smoke test** — end-to-end server verification

## Security

- HSTS with 2-year max-age and preload
- Content Security Policy (CSP)
- X-Frame-Options DENY, X-Content-Type-Options nosniff
- Same-origin CORS policy on all proxy responses
- Client-secret scanner blocks accidental key leakage
- Lockfile registry scanner prevents supply-chain drift
