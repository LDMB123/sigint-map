# DMB Almanac Scraping (Rust Pipeline)

The Rust pipeline is the source of truth for scraping and producing the offline data bundle used by the Rust-first local PWA.

## Where The Scraper Lives
- Scrape + parsing logic: `rust/crates/dmb_pipeline/src/scrape.rs`
- CLI entrypoints: `rust/crates/dmb_pipeline/src/main.rs`
- Fixture suite: `rust/crates/dmb_pipeline/tests/fixtures/`

## Core Commands

All commands below are run from repo root.

```bash
# Live scrape (network) + JSON warning report
cargo run -p dmb_pipeline -- scrape --live --warnings-output data/warnings.json

# Fail the run if warnings exceed a budget
cargo run -p dmb_pipeline -- scrape --live --warnings-output data/warnings.json --warnings-max 0

# Cache-only dry run (no network, no output writes)
cargo run -p dmb_pipeline -- scrape --live --dry-run --warnings-output data/warnings.json

# Fixture-only regression gate
cargo run -p dmb_pipeline -- scrape-fixtures --warnings-output data/warnings-fixtures.json --warnings-max 0

# Selector smoke test (fast, meant to catch HTML drift)
cargo run -p dmb_pipeline -- scrape-smoke --warnings-output data/warnings.json --warnings-max 0
```

## Validation + Regression Gate

```bash
# Validate using the warning report produced by a scrape run
DMB_VALIDATE_WARNING_REPORT=data/warnings.json \
  cargo run -p dmb_pipeline -- validate --strict-warnings
```

## Outputs

- Warning reports: `data/warnings.json` (and optional JSONL in `target/`)
- Static data bundle (server-served): `rust/static/data/`
- Data manifest: `rust/static/data/manifest.json`

## Notes

- Older documentation about a JavaScript scraper is intentionally removed from the main docs set. If you need historical context, treat it as archive-only, not an executable workflow.

## Resilience System

### Retry Logic (`src/utils/retry.js`)
- Exponential backoff: 1s -> 2s -> 4s (3 attempts default, max 30s)
- 10% jitter to prevent thundering herd
- Rate limit detection: 429/503 -> 5s+ extended delay
- **Retryable**: network errors, timeouts, rate limits, transient selector issues
- **Not retryable**: parse errors, auth failures, invalid HTML

### Circuit Breaker (`src/utils/circuit-breaker.js`)
- States: CLOSED -> OPEN (5 consecutive failures) -> HALF_OPEN (60s cooldown) -> CLOSED (3 successes)
- Fast-fails when open (< 1ms), per-scraper tracking via registry
- `circuitBreakerRegistry.getOrCreate("scraper-name", { failureThreshold: 5, cooldownMs: 60000 })`

### Health Monitor (`src/utils/resilience-monitor.js`)
- `HealthChecker.quickCheck()`, `ResilienceMonitor.printHealthReport()`, `.shouldPauseScraping()`
- Risk: LOW 0-5% | MEDIUM 5-20% | HIGH 20-50% | CRITICAL 50%+

### Config Profiles & BaseScraper
- Standard: maxRetries=3, CB=on | Conservative: maxRetries=5 | Aggressive: maxRetries=1, CB=off
- `withRateLimit(fn)` - full stack | `withRetryOnly(fn)` - CB + retry only (parallel ops)

## HTML Selectors by Page

### Show Pages (`TourShowSet.aspx?id=X`)
- **Date**: `select option:selected` with MM.DD.YYYY format
- **Venue**: `a[href*='VenueStats.aspx']` (semantic href, NOT onclick)
- **VenueId**: `venueLink.attr("href")?.match(/vid=(\d+)/)?.[1]`
- **Location**: US pattern (`City, ST`) then international (`City, Country`)
- **Setlist**: `#SetTable tr` with `td.setheadercell a.lightorange`
  - Fallback 1: `td.setheadercell a`
  - Fallback 2: `a[href*='SongStats'], a[href*='songs/summary']`
  - Set headers: `tr td[colspan]` containing "Set" or "Encore"
  - Song rows: `tr.opener, tr.midset, tr.closer, tr.encore, tr.encore2`
- **Slot detection by bgcolor**:
  - `#006666` = Set 1 opener (teal) | `#004040` = Set 2 opener
  - `#214263`, `#336699` = Set closer (blue) | `#2E2E2E` = Standard (midset)
  - `#660000` = Encore | `#CC0000` = Second encore
- **Segue detection**: `span.setitem` containing `>>` (U+00BB)
  - Post-process: `entry.segueIntoTitle = setlist[i + 1].songTitle`
  - Before fix: 4 segues. After: 6,572 (~13.18% of entries)
  - Also check notes for: "segue", "transitions into", "followed by", "leads to", `->`, `>`
- **Guest filtering**: Filter band members by GID
  - `BAND_MEMBER_GIDS = ["1","2","94","75","104","3","ds"]` (Dave, Carter, LeRoi, Stefan, Boyd, Jeff, Dave solo)
- **Duration**: `td.setcell` - handle empty and `&nbsp;`, regex `/\d+:\d{2}/`

### Song Stats (`SongStats.aspx?sid=X`)
- Play count: `.stat-col1` text `/(\d+)\s*Known Plays/`
- Gap days: `.stat-col2` text `/(\d+)\s*Days Since/`
- Last played: `/\((\d{2}\.\d{2}\.\d{2})\)/`
- First played: `/First.*?(\d{1,2}\/\d{1,2}\/\d{4})/`
- Total time: `/(\d+:\d{2}:\d{2})\s*total/`
- History rows: `.stat-table tr` with `a[href*="TourShowSet.aspx"]`
- Chart containers: `#plays_chart`, `#slots_chart`, `#length_chart`
- **8 parsing categories** (~40+ data points): slot breakdown, version types, duration extremes, segues, release counts, plays by year, artist stats, liberation history
- Duration validation: reject if `isNaN(minutes) || isNaN(seconds) || seconds >= 60`

### Venue Stats (`VenueStats.aspx?vid=X`)
- Name: `h1` | Location: `p` after `h1`
- Total shows: `/Total Shows?:\s*(\d+)/i`
- First/last show: `/First Show?:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i`
- Show links: `a[href*='TourShowSet.aspx']` or `a[href*='ShowSetlist.aspx']`
- Top songs: Tables/lists with `a[href*='SongStats']` + play count
- Capacity: `/capacity[:\s]+(\d+[\,\d]*)/i`
- Alternate names: `/aka\s+(.+?)(?:\n|$)/i` or `/(?:formerly|previously)\s+(?:known as\s+)?(.+)/i`

### Guest Stats (`GuestStats.aspx?gid=X`)
- Name: `h1` | Instruments: `p` text (often in quotes)
- Show count: `/Show Appearances?:\s*(\d+)/i`
- Distinct songs: `/Distinct Song.*?:\s*(\d+)/i`
- Song links: `a[href*="GuestStats.aspx"][href*="sid="]` with `/\((\d+)\)/` play count
- Year headers: `h3` containing year
- Show links by year: `a[href*="TourShowSet.aspx"]` within year section

### Guest Shows (`TourGuestShows.aspx?gid=X`)
- First/last appearance: `/First Appearance[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i`
- Appearance table: `<table>` with Date/Venue columns
- Song links: `a[href*='SongStats.aspx']` with instruments in parentheses

### Tours (`TourShowInfo.aspx?tid=X`)
- Scan year pages `TourShow.aspx?where=YYYY` for `TourShowInfo.aspx?tid=X` links
- Row: `a[href*='TourShowInfo.aspx?tid=']` then `.closest("tr")`
- Cells: [0]=name, [1]=shows, [2]=unknown, [3]=cancelled, [4]=rescheduled, [5]=completion%
- Stats regex: `"35 shows"`, `"12 unique venues"`, `"45 unique songs played"`
- Top songs from "Most Played" table via SongStats links
- 83+ named tours vs 36 year-based tours from show scraper

### Tour Stats (`TourStats.aspx?tid=X`)
- Top opener/closer/encore: `h2, h3` containing keyword, then `nextUntil().find("a[href*='SongStats']")`
- Liberations: `h2, h3` with "liberation", then table rows: song link | days | date
- Rarity index: `/rarity\s+(?:index)?:?\s*(\d+\.?\d*)/i`

### Releases (`DiscographyList.aspx` + `ReleaseView.aspx?release=X`)
- List: `a[href*='ReleaseView.aspx?release=']` | Title: `$("h1").first()` or page title fallback
- Cover art: `img[src*='cover'], img[src*='album'], img[alt*='cover']`
- Track parsing (3 fallback strategies):
  1. Table: `table tr` with `a[href*='SongStats']`, disc headers via "Disc N"
  2. List: `ol li, .track, .song-item` with song links
  3. Paragraph: `/^\s*(\d+)[\.\-\)]\s*(.+)/` with optional `(\d+:\d{2})` duration
- Type detection: "live album" -> live | "compilation"/"greatest hits" -> compilation | "dvd"/"video" -> video | "box set" -> box_set | "ep" -> ep | "single" -> single | default: studio
- Release date: `/released[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i`

### Song List (`songs/all-songs.aspx`)
- Primary: `a[href*='songs/summary.aspx?sid=']` | Fallback: `a[href*='SongStats.aspx?sid=']`
- Dropdown: `select[name*="SongNav"]` with `option[value]`

### Lists Index (`Lists.aspx`)
- Category containers: `.release-series` with `.headerpanel` for category name
- List links: `a[href*='ListView.aspx']` inside `.series-content > .hanging-indent`
- ID extraction: `/id=(\d+)/` from href
- Categories: Almanac Updates, Songs, Venues, Releases, Timelines, Shows

### List Detail (`ListView.aspx?id=X`)
- Title: `.subtitle` | Description: `.threedeetable`
- **3 parsing strategies** (tried in order):
  1. Table-based: `table tr` with `td` cells, skip `th` headers
  2. Div-based: `.hanging-indent, .list-item` elements
  3. Simple links: all `a[href*='TourShowSet'], a[href*='SongStats']` etc.
- Item type detection from URL: TourShowSet->show, SongStats->song, VenueStats->venue, GuestStats->guest, Release*->release, else->text
- Metadata from table cells: `column_1`, `column_2` etc.
- Edge cases: text-only items (no links), mixed types in same row, nested tables, empty/placeholder lists

### Lists DB Schema
- `curated_lists`: id, original_id (UNIQUE), title, slug (UNIQUE), category, description, item_count, timestamps
- `curated_list_items`: list_id (FK), position (UNIQUE per list), item_type (show/song/venue/guest/release/text), item_id, item_title, item_link, notes, metadata (JSON)
- Import: upsert by original_id, delete+reinsert items per list
- Indexes: category, slug, original_id, list_id+position, item_type

### History (`ThisDayinHistory.aspx?month=M&day=D`)
- 366 calendar days (including Feb 29)
- Show links: `a[href*='TourShowSet.aspx'][href*='id=']`
- Venue links: `a[onclick*='VenueStats.aspx']`
- **Validation required**: Filter years < 1991 or > current year

### Rarity (`ShowRarity.aspx`)
- Tour-level: averageRarityIndex, differentSongsPlayed, catalogPercentage, rank
- Show-level: showId, date, venueName, city, state, rarityIndex
- Lower rarity index = more rare/unique setlist

## Navigation Utility (`src/utils/navigation.js`)

### API
- `navigateWithRetry(page, url, opts?)` - adaptive navigation with retry, content validation
- `navigateToListPage(page, url, selector)` - 20s timeout, for list pages
- `navigateToDetailPage(page, url, selector)` - 45s timeout, for detail pages
- `navigateWithCustomWait(page, url, opts)` - full control (timeout, contentSelector, waitForNetworkIdle, retryConfig)
- `trackNavigationMetrics(result)` / `logNavigationMetrics()` - health tracking

### Timeout Budget Allocation
- Navigation phase: 40% (page.goto) | Content phase: 30% (wait for selector) | Network phase: 30% (network idle)
- Early exit: returns as soon as content appears, does not wait full timeout

### Content Selectors by Page Type
- List pages: `"table"`, `".setlist-table"`, `".show-list"`
- Detail pages: `"#content"`, `".details"`, `".stats-container"`

### Result Object
- `result.success` (bool), `result.error`, `result.phase` (navigation/content/network), `result.retries`, `result.duration` (ms)

### Migration Pattern
```javascript
// Old: await page.goto(url, { timeout: 30000 });
// New:
const result = await navigateToListPage(page, url, "table");
if (!result.success) { console.error(`Failed in ${result.phase} after ${result.retries} retries`); return null; }
```

## Date Normalization
- ISO passthrough: `YYYY-MM-DD` | MM.DD.YY / MM/DD/YY: year > 50 = 19xx, else 20xx
- MM.DD.YYYY / MM/DD/YYYY: pad month/day | "April 29, 1998" -> "1998-04-29" (releases)

## Utility Functions

### Parsing Helpers
- `parseDate(dateStr)` - handle multiple formats -> ISO date string
- `parseDuration(duration)` - "M:SS" -> seconds
- `slugify(text)` - lowercase, remove special chars, hyphens
- `normalizeWhitespace(text)` - collapse spaces, trim

### Caching
- `getCachedHtml(url)` - check cache dir, return HTML or null
- `cacheHtml(url, html)` - sanitize URL to filename, write to cache

### Checkpointing
- `loadCheckpoint(name)` / `saveCheckpoint(name, data)` - resume support

## Output Files

- `output/`: shows.json (2,800+ shows, 19-30MB), songs.json (200+), venues.json (500+), guests.json (100+), tours.json (150+), releases.json (40-50 releases, 500+ tracks), song-stats.json, venue-stats.json, guest-shows.json, liberation.json, history.json (366 days, 15-20MB), rarity.json, lists.json (45+)
- Also: validation-report.md, incremental-metadata.json, checkpoints/scrape-{ts}.json
- DB target: `../src/lib/db/dmb-almanac.db`

## Database Tables

- `releases`: id, title, slug, release_type (studio/live/compilation/ep/single/video/box_set), release_date, cover_art_url, notes
- `release_tracks`: release_id, song_id, track_number, disc_number, duration_seconds, show_id
- `song_statistics`: song_id, opener/set1_closer/set2_opener/closer/midset/encore counts, full/tease counts, avg/longest/shortest duration, total_releases, years_active, current_gap_days/shows
- `song_statistics_json`: song_id, segues_into, plays_by_year, artist_stats, liberations (all JSON)
- `tour_rarity`: tour_id, average_rarity_index, different_songs_played, catalog_percentage, rarity_rank
- `venues` extensions: first_show_date, last_show_date, capacity, aka_names (JSON array)
- Full set: tours, shows, setlist_entries (55K+), songs, venues, guests, releases, release_tracks (10K+), lists, liberation, history

## Error Handling

- **Validation**: categorizes errors vs warnings, continues on errors, generates reports regardless
- **Import**: transaction rollback on failure, FK resolution errors logged, continues with remaining targets
- **Incremental**: graceful fallback to full scrape, state corruption detection
- **Year filter**: clear error if year not found, validates range, handles empty results
- **Scraper**: 3 retry attempts with exponential backoff, log failure, continue to next item
- **Song not found in import**: log warning, skip track, continue

## Performance

- Single year ~5min | All shows ~60min | Song stats ~35-45min | Tours ~30-60min
- Releases ~10-20min | History ~20-25min | Full scrape ~2 hours
- Validation <1s | Import ~3s per 1000 records (~30s total)
- Incremental: 5-30min (vs 2hr full), can reduce by 90%+
- Cache auto-cleans every 15min

## Known Gaps

### High Priority
- Song performance history table in SongStats.aspx: only summary extracted, full table skipped
- `topSeguesFrom` in song-stats.js: currently empty (not parsed)

### Medium Priority
- Venue complete show history (only top songs extracted from VenueStats)
- Year-by-year stats (TourShowsByYear used only for enumeration, not saved)
- Tour stats ~30% captured; missing: geography, duration, positioning, debuts, show types, liberations

### Not Scraped (by design)
- FindSetlist.aspx (search interface, redundant)
- songs/lyrics.aspx (copyright concerns)
- Browse pages (index-only, data via detail pages)

### Known Quirks
- Date format varies: `MM.DD.YY`, `M/D/YYYY`, `year=YYYY` in URLs
- Early shows (pre-1992) may lack duration data
- Apostrophes: `&#39;` or `'`; row classes (.opener, .midset) not always present
- "X days since" stats relative to current date
- Some stats rendered client-side via chart JS

## Troubleshooting

- **Circuit breaker OPEN**: Wait 60s for recovery, check target site
- **High retry rate**: Increase interval, reduce concurrency
- **Timeouts**: Increase to 60s, reduce parallel requests
- **No songs found**: Verify `/songs/all-songs.aspx` returns `summary.aspx?sid=` links
- **No venue data**: Check `a[href*='VenueStats.aspx']` selector still valid
- **Setlist empty**: Verify `#SetTable` exists, check for `.setcolumn` header skip
- **Date parse fail**: Check dropdown `select option:selected` format
- **Band members as guests**: Verify BAND_MEMBER_GIDS array up to date
- **Checkpoint corruption**: Delete `cache/checkpoint_*.json`, restart

## Maintenance Schedule

- Active tour season: run shows.js weekly
- Year-end: run all scrapers
- Daily: `npm run scrape:incremental -- --validate --import`
