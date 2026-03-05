# SIGINT-MAP Conflict Tracker — Fixes Log
**File:** `app.js`
**Syntax check:** `node --check app.js` → PASS ✓

## Session 1 — API Fixes (2026-03-02)
Line count at start: 8,187

---

## Fix 1 — CORS Proxy: corsproxy.io → codetabs.com

**Problem:** `corsproxy.io` returns 403 for all requests.  
**Replacement:** `https://api.codetabs.com/v1/proxy/?quest=`

**13 replacements across these locations/functions:**

| Line (approx) | Location / Function | Pattern replaced |
|---|---|---|
| 527 | `NASA_TEXTURE_PROXY` constant | `https://corsproxy.io/?` + encodeURIComponent |
| 1500 | `fetchOpenSky()` fallback URL | Direct string `corsproxy.io/?https://opensky-...` |
| 3062–3063 | `fetchGDELT()` | `corsproxy.io/?${encodeURIComponent(baseUrl)}` |
| 3776 | `fetchOilPrice()` endpoints array | `corsproxy.io/?https://api.oilpriceapi...` |
| 4394 | `fetchAdsbLol()` fallback | `corsproxy.io/?${encodeURIComponent(BASE_URL)}` |
| 4552 | `fetchMaritime()` PROXY const | `corsproxy.io/?${encodeURIComponent(PRIMARY)}` |
| 4724 | `fetchWeather()` fallback | `corsproxy.io/?${encodeURIComponent(BASE_URL)}` |
| 4914 | `fetchRadiation()` Safecast fallback | `corsproxy.io/?${encodeURIComponent(SAFECAST_URL)}` |
| 4962 | `fetchRadiation()` OpenRadiation fallback | `corsproxy.io/?${encodeURIComponent(OPENRAD_URL)}` |
| 5145 | `fetchUCDP()` fallback | `corsproxy.io/?${encodeURIComponent(UCDP_URL)}` |
| 5308 | `fetchMarineWeather()` fallback | `corsproxy.io/?${encodeURIComponent(BASE_URL)}` |

---

## Fix 2 — RSS Feed Proxy: rss2json.com → feed2json (Toptal)

**Problem:** `rss2json.com` returns 422 for feed URLs.  
**Replacement:** `https://www.toptal.com/developers/feed2json/convert?url=`

**3 replacements** — functions `fetchRSSFeed()`, `fetchMilNewsSource()`, `fetchIDFSource()`

**Response format migration (JSONFeed format):**
- `data.status !== 'ok'` check removed → now checks `if (!data.items)`
- `item.link` → `item.url`
- `item.pubDate` → `item.date_published`

---

## Fix 3 — UCDP API 401 Auth Required

**Problem:** `ucdpapi.pcr.uu.se` now returns 401 requiring an auth token.  
**Fix:** Added explicit `res.status === 401 || res.status === 403` check in `fetchUCDP()` before the generic `!res.ok` continue. On auth failure:
- Logs a clear warning to console
- Sets sidebar status to amber warning dot with text **"AUTH REQUIRED"** 
- Returns immediately (does not loop through remaining URLs)

---

## Fix 4 — Digitraffic AIS 406 Not Acceptable

**Problem:** Digitraffic endpoint returning 406 due to missing `Accept` header.  
**Fix:** Added `headers: { 'Accept': 'application/json' }` to the `fetch()` call in `fetchMaritime()` (line ~4560). Both primary URL and CORS proxy fallback share this header via the options object.

---

## Fix 5 — Earth Globe Texture Not Loading

**Problem:** `NASA_TEXTURE_PROXY` pointed to dead `corsproxy.io`.  
**Fix:** Three-stage fallback chain in `loadEarthTexture()`:
1. **Attempt 0:** `https://api.codetabs.com/v1/proxy/?quest=` + NASA texture URL
2. **Attempt 1:** Direct NASA URL `https://eoimages.gsfc.nasa.gov/...`
3. **Attempt 2 (NEW):** `https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg` — CORS-friendly CDN fallback

Added `NASA_TEXTURE_FALLBACK` constant and updated the error handler with an `else if (attempt === 1)` branch.

---

## Fix 6 — GDELT API Timeout

**Problem:** `api.gdeltproject.org` frequently times out; was using 12s timeout.  
**Fix:**
- Timeout reduced from **12,000ms → 5,000ms** (per `controller.abort()` call)
- Added fallback query URL: `https://api.gdeltproject.org/api/v2/doc/doc?query=iran%20conflict&mode=ArtList&format=json&maxrecords=50&timespan=60min`
- Both URLs now routed through codetabs CORS proxy
- `fetchGDELT()` loops over `[url, fallback]` — if primary times out, tries simpler fallback query

---

## Session 2 — Runtime Errors & Status Indicator Bugs (2026-03-05)
Line count at start: ~8,600

## Fix 7 — Multiple Runtime Errors on Load

**Problem:** App crashed on startup with several JS errors:
- `ReferenceError` — Temporal Dead Zone violations from accessing variables before declaration
- `TypeError` — accessing `.position` on undefined impact marker objects
- Missing data layer initialization for several visualization layers

**Fix:** Reordered variable declarations, added null checks on marker objects, and initialized missing data layers. App now loads with zero console errors.

---

## Fix 8 — GDELT False LIVE Status

**Problem:** `fetchGDELT()` set sidebar status to "LIVE" (green dot) even when the API timed out and fallback hardcoded data was used.
**Fix:** Added `usingFallback` flag in `fetchGDELT()`. When fallback data is used, status is set to `--offline` (red dot) instead of `--live`. Only sets LIVE when actual API response is parsed successfully.

---

## Fix 9 — Maritime False LIVE Status

**Problem:** `updateAllSourceStatuses()` showed Maritime AIS as "LIVE" but `fetchMaritime()` is 100% simulated — Digitraffic API returns 406 and all 50 vessels use procedurally generated routes.
**Fix:**
- Changed `index.html` line ~388: hardcoded Maritime status dot from `status-dot--live` to `status-dot--sim`
- Changed status text from "LIVE" to "SIM"
- Updated `updateAllSourceStatuses()` to always set Maritime to SIM status

---

## Fix 10 — Oil Price False LIVE Status

**Problem:** `updateAllSourceStatuses()` hardcoded `isLive = true` for Oil Price even when using simulated $95–$160 random prices.
**Fix:** Added detection logic — checks if price data source is the live API response or the fallback random generator. Shows SIM (amber) when using simulated prices, LIVE (green) only with real API data.

---

## Fix 11 — UCDP/Weather/Radiation Missing Fallback Indicators

**Problem:** When UCDP, Weather, and Radiation APIs failed and fell back to estimated/hardcoded data, sidebar still showed LIVE or had no status indicator.
**Fix:**
- UCDP: Replaced with ReliefWeb API (`api.reliefweb.int`). Shows LIVE when ReliefWeb responds, SIM when using 12 hardcoded conflict events
- Weather: Shows SIM when using estimated wind data instead of Open-Meteo response
- Radiation: Shows SIM when using baseline radiation estimates instead of Safecast data

---

## Verification

```
node --check sigint-map/app.js
# Exit code: 0 (no syntax errors)
```

- Zero console errors on load
- All 18 sidebar sources show correct LIVE/SIM/OFFLINE status
- No remaining references to `corsproxy.io` or `rss2json.com`
