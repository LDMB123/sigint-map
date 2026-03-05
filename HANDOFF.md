# SIGINT-MAP — Handoff Document

**Date:** 2026-03-05
**Branch:** `claude/vigorous-chatelet`
**Status:** Fully functional, local commits only (no remote)

---

## What This Is

Real-time OSINT/SIGINT 3D globe dashboard. Renders an interactive Earth with 16+ live intelligence data sources — aircraft tracking, earthquakes, wildfires, conflict news, military flights, maritime vessels, radiation levels, weather, and more. Built as a single-page vanilla JS app on Three.js.

## Current State

- App loads with **zero console errors**
- Globe renders with NASA Blue Marble texture (3-stage CDN fallback)
- All 18 sidebar sources show **correct** LIVE/SIM/OFFLINE status indicators
- 11 fixes applied across 2 sessions (see `FIXES.md`)

## Architecture

```
sigint-map/
├── app.js        # 8,637 lines — ALL logic in one file (44 sections)
├── index.html    # 672 lines — HTML shell, sidebar, importmap
├── style.css     # 1,885 lines — Primary styles
├── base.css      # 94 lines — Reset/base styles
├── FIXES.md      # Fix log (11 fixes across 2 sessions)
├── README.md     # Project documentation
├── HANDOFF.md    # This file
└── .gitignore    # Excludes backups/intermediates
```

No build step. No bundler. No framework. Static files served via `python3 -m http.server 8080`.

### app.js Section Map

| Section | Lines | Purpose |
|---------|-------|---------|
| 1 | 1–140 | Constants, utilities, CORS proxy URLs |
| 2 | 141–291 | Hardcoded event data (conflict events, targets) |
| 3 | 292–308 | Loading screen |
| 4 | 309–876 | Three.js scene setup, globe texture loading |
| 5 | 877–1308 | Marker system (create/update/remove markers) |
| 6 | 1309–1425 | Missile arc animations |
| 7 | 1426–1519 | Explosion effects |
| 8 | 1520–1565 | Heat map overlay |
| 9 | 1566–1698 | OpenSky ADS-B aircraft tracking |
| 10 | 1699–1712 | Application state |
| 11 | 1713–1894 | UI controllers (sidebar, toggles) |
| 12 | 1895–1955 | Event feed ticker |
| 13 | 1956–1979 | Detail panel |
| 14 | 1980–2026 | Tooltip / hover / click handling |
| 15 | 2027–2131 | Minimap |
| 16 | 2132–2153 | Animated number counters |
| 17 | 2154–2403 | Time-based visibility system |
| 18 | 2404–2429 | Camera animation |
| 19 | 2430–2750 | Main animation loop |
| 20 | 2751–2767 | Window resize handler |
| 21 | 2768–2805 | Init / bootstrap |
| 22 | 2806–2962 | RSS news feeds (Al Jazeera, BBC, Reuters) |
| 23 | 2963–3093 | USGS earthquake/seismic layer |
| 24 | 3094–3219 | NASA FIRMS thermal hotspots |
| 25 | 3220–3360 | GDELT conflict news |
| 26 | 3361–3520 | Aviation SIGMETs |
| 27 | 3521–3600 | Military news RSS (CENTCOM, War Zone) |
| 28 | 3601–3642 | NASA GIBS satellite overlay |
| 29 | 3643–3717 | Nuclear site monitoring |
| 30 | 3718–3794 | IDF/ME news feed |
| 31 | 3795–3876 | Extended filter system |
| 32 | 3877–3911 | Extended ticker |
| 33 | 3912–4017 | Oil price live ticker |
| 34 | 4018–4266 | Search / filter capability |
| 35 | 4267–4553 | Audio alert system |
| 36 | 4554–4749 | ADSB.lol military flight tracking |
| 37 | 4750–4933 | Maritime vessel tracking (simulated AIS) |
| 38 | 4934–5144 | Open-Meteo wind visualization |
| 39 | 5145–5399 | Safecast/OpenRadiation monitoring |
| 40 | 5400–5606 | UCDP/ReliefWeb conflict events |
| 41 | 5607–5808 | Marine weather (Strait of Hormuz) |
| 42 | 5809–5922 | Analytics dashboard |
| 43 | 5923–6181 | Enhanced filter system |
| 44 | 6182–8637 | Browser Web API enhancements, status updates |

## Data Source Status

### Confirmed LIVE (real API data)
| Source | API | Refresh |
|--------|-----|---------|
| USGS Seismic | earthquake.usgs.gov | 5min |
| NASA FIRMS | firms.modaps.eosdis.nasa.gov | 10min |
| Aviation SIGMETs | aviationweather.gov | 5min |
| ADSB.lol Military | api.adsb.lol | 30s |
| RSS News | various via feed2json | 3min |
| Military News | various via feed2json | 3min |
| ME/Israel News | various via feed2json | 3min |

### Confirmed SIM (simulated/fallback data)
| Source | Reason | Refresh |
|--------|--------|---------|
| Maritime AIS | Digitraffic returns 406; 50 procedural vessels | 60s |
| UCDP Conflicts | Auth required; 12 hardcoded events (ReliefWeb fallback) | 10min |

### Variable (LIVE or SIM depending on API availability)
| Source | Primary API | Fallback |
|--------|------------|----------|
| OpenSky ADS-B | opensky-network.org | OFFLINE (CORS blocked) |
| GDELT News | api.gdeltproject.org | Hardcoded articles |
| Open-Meteo Wind | api.open-meteo.com | Estimated wind data |
| Radiation | api.safecast.org | Baseline estimates |
| Oil Price | multiple sources | Random $95–$160 |
| Marine Weather | marine.weather.gov | Estimated conditions |
| NASA GIBS | gibs.earthdata.nasa.gov | On-demand, READY state |

## CORS Proxy Chain

All external APIs go through CORS proxies since this runs in-browser:
1. **Primary:** `https://api.allorigins.win/raw?url=`
2. **Fallback:** `https://api.codetabs.com/v1/proxy/?quest=`
3. **RSS feeds:** `https://www.toptal.com/developers/feed2json/convert?url=`

If allorigins.win goes down, most APIs will fall back to codetabs. If both die, APIs fall back to hardcoded/simulated data.

## Cache Busting

`index.html` line 669 loads `app.js` with a cache-bust query param:
```html
<script type="module" src="app.js?v=6"></script>
```
Increment `?v=N` after any `app.js` change when using `python3 -m http.server` (it sets aggressive cache headers).

## Git History

Two commits on `claude/vigorous-chatelet`:
```
dbff1c84 Clean up sigint-map workspace and update documentation
45809eca Add SIGINT-MAP conflict tracker with API fixes
```

**No remote configured.** To push:
```bash
git remote add origin <url>
git push -u origin claude/vigorous-chatelet
```

## Known Issues & Future Work

1. **OpenSky CORS** — Always shows OFFLINE in browser. Needs a server-side proxy (Node, Python, Cloudflare Worker) to relay requests
2. **UCDP auth** — Replaced with ReliefWeb but original UCDP data is richer. Obtain API key from `ucdpapi.pcr.uu.se` for full access
3. **Single-file architecture** — 8,637 lines in one file. Consider splitting into modules if further features are added
4. **CORS proxy reliability** — allorigins.win and codetabs.com are free services with no SLA. For production, deploy own CORS proxy
5. **No tests** — No unit or integration tests exist
6. **No error recovery UI** — When APIs fail, sidebar updates but no user-facing notification beyond status dots

## How to Run

```bash
cd sigint-map
python3 -m http.server 8080
# Open http://localhost:8080
```

Or via Claude Code preview (uses `.claude/launch.json` config).

## Key Decisions Made

- **No build tooling** — Kept vanilla JS + ES module importmap for simplicity
- **Three-state status system** — LIVE (green), SIM (amber), OFFLINE (red) with CSS classes
- **Fallback-first resilience** — Every API has hardcoded fallback data so the app always renders something
- **CORS proxy cascade** — Two proxy services + direct URL attempts before falling back to simulated data
- **ReliefWeb over UCDP** — Switched conflict data source to avoid auth requirement
