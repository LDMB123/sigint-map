# SIGINT-MAP — Operation Epic Fury

Real-time OSINT/SIGINT 3D globe dashboard built with Three.js. Visualizes 16+ live intelligence data sources on an interactive Earth globe with sidebar status tracking.

## Quick Start

```bash
cd sigint-map
python3 -m http.server 8080
# Open http://localhost:8080
```

Or with Claude Code preview:
```bash
# Uses .claude/launch.json config
# Server starts at http://localhost:8080
```

## Tech Stack

- **Three.js** v0.172.0 (ES modules via importmap/jsdelivr CDN)
- **Vanilla JS** — single-file app (`app.js`, ~8,600 lines)
- **No build step** — static files served via any HTTP server

## Data Sources

| Source | API | Refresh | Status |
|--------|-----|---------|--------|
| OpenSky ADS-B | opensky-network.org | 15s | LIVE* |
| USGS Seismic | earthquake.usgs.gov | 5min | LIVE |
| NASA FIRMS | firms.modaps.eosdis.nasa.gov | 10min | LIVE |
| GDELT News | api.gdeltproject.org | 2min | LIVE |
| Aviation SIGMETs | aviationweather.gov | 5min | LIVE |
| ADSB.lol Military | api.adsb.lol | 30s | LIVE |
| Open-Meteo Wind | api.open-meteo.com | 5min | LIVE |
| Radiation Monitoring | api.safecast.org | 5min | LIVE |
| Marine Weather | marine.weather.gov | 10min | LIVE |
| Oil Price (Brent) | multiple sources | 5min | LIVE |
| RSS News Feeds | various (via feed2json) | 3min | LIVE |
| Military News | various (via feed2json) | 3min | LIVE |
| ME / Israel News | various (via feed2json) | 3min | LIVE |
| UCDP Conflict Events | ucdpapi.pcr.uu.se | 10min | SIM (auth required) |
| Maritime AIS | simulated routes | 60s | SIM |
| NASA GIBS Satellite | gibs.earthdata.nasa.gov | on-demand | READY |

*OpenSky blocks browser-origin requests; works from server-side proxies.

## Sidebar Status Indicators

- **LIVE** (green dot) — receiving real-time API data
- **SIM** (amber dot) — using simulated/fallback data
- **OFFLINE** (red dot) — API unreachable, no data displayed
- **READY** (blue dot) — on-demand source, loaded when needed

## CORS Proxy Strategy

Browser CORS restrictions require proxying for most APIs:
- **Primary:** `allorigins.win`
- **Fallback:** `api.codetabs.com/v1/proxy/`
- **RSS feeds:** `toptal.com/developers/feed2json/`

## Files

```
sigint-map/
├── app.js        # Main application (all logic, API calls, rendering)
├── index.html    # HTML shell with sidebar and importmap
├── style.css     # Primary styles
├── base.css      # Base/reset styles
├── FIXES.md      # Changelog of API and runtime fixes
└── .gitignore    # Excludes backup/intermediate files
```

## Known Limitations

- OpenSky API blocks direct browser requests (CORS) — shows OFFLINE in browser
- UCDP API requires auth token — falls back to 12 simulated conflict events
- Maritime AIS is fully simulated (50 vessels on realistic shipping routes)
- Globe texture loads via 3-stage fallback (codetabs → NASA direct → unpkg CDN)
