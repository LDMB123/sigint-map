# DMB Almanac Data Gaps Analysis
**Generated:** January 23, 2026
**Database:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db`

---

## Executive Summary

Current database state: **3,454 shows | 1,240 songs | 2,855 venues | 1,442 guests | 194 tours**

The database is ~70% complete with significant gaps in:
1. **Setlist completeness** (927 shows missing setlists)
2. **Venue geolocation** (2,855 venues missing coordinates)
3. **Song metadata** (950 missing avg_length, 792 missing composer, 1,240 missing lyrics)
4. **Tour date information** (158 tours missing start/end dates)
5. **Guest appearance linking** (only 131 shows have guest appearances; 2,011 total)

---

## Critical Data Gaps

### 1. CRITICAL: Shows Missing Setlists (927 shows | 26.9%)

**Impact:** High - Core feature (setlist viewing) incomplete for 927 shows

**Distribution by Year:**
```
1991: 68 shows
1992: 287 shows  ← WORST YEAR
1993: 260 shows  ← SECOND WORST
1994: 43 shows
1995: 13 shows
... (continues through 2025)
2017: 45 shows
2020: 35 shows
2021: 31 shows
2023-2025: 3 shows total
```

**Total entries missing:** ~927 × 12 avg songs/show ≈ **11,100+ setlist entries to scrape**

**Root Cause:**
- Early show scraper (checkpoint stops at 2017) not resuming for 2018+
- Some years partially scraped (see distribution pattern)

**Scraper Status:**
- File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/shows.ts`
- Checkpoint: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_shows.json`
- Completed years: 1991-2017 (27 years)
- Missing years: 2018-2026 (9 years)

---

### 2. HIGH: Venues Missing Coordinates (2,855 venues | 100%)

**Impact:** High - Maps, geolocation, venue discovery broken

**Current State:**
- All 2,855 venues missing latitude/longitude
- 2,813 venues missing venue_type classification
- 2,412 venues missing capacity information

**Example venues needing geo-coding:**
```
The Gorge Amphitheatre (George, WA) - iconic venue
Alpine Valley Music Theatre (East Troy, WI) - frequent venue
Cellairis Amphitheatre at Lakewood (Atlanta, GA)
Etihad Park (Abu Dhabi, UAE) - international
Tempodrom (Berlin, Germany) - international
```

**Scraper Status:**
- File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/venue-stats.ts`
- Checkpoint: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_venue-stats.json`
- **Status: COMPLETED** but output files not imported to database

**Next Step:**
1. Check venue-stats output file for coordinate data
2. Run venue-stats scraper to get coordinates (if not present in dmbalmanac.com)
3. Consider external geocoding API (Google Maps, OpenStreetMap)

---

## High Priority Data Gaps

### 3. HIGH: Setlist Entry Metadata Missing (4,385 entries | 11.0%)

**Impact:** High - Duration/timing info missing for most songs

**Missing Data Breakdown:**
- **Duration:** 4,385 entries (11.0% missing)
- **Notes:** 39,160 entries (98% missing) - mostly empty anyway
- **Slot classification:** 34,976 entries (87.5%) - marked as "standard" only

**Scraper Status:**
- Duration data **may be available** from show pages
- Notes/analysis data requires dedicated page parsing
- Slot classification needs logic (first song = opener, last = closer)

---

### 4. HIGH: Tours Missing Date Information (158 tours | 81.4%)

**Impact:** Medium-High - Tour timeline visualization broken

**Affected Tours:**
- All "Misc", "Guesting", "Summer", "Fall" subtours from 2018-2025 missing dates
- ~158 tours without start_date and end_date
- Should be calculable from associated shows

**Example:**
```
Tour 164: "Misc 2018" (year=2018, start_date=NULL, end_date=NULL)
Tour 165: "Guesting 2018" (year=2018, start_date=NULL, end_date=NULL)
```

**Quick Win:**
Derive from shows: `SELECT MIN(date) as start_date, MAX(date) as end_date FROM shows WHERE tour_id = X`

**Scraper Status:**
- File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/tours.ts`
- Checkpoint: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_tours.json`
- Last updated: Jan 23 14:58

---

## Medium Priority Data Gaps

### 5. MEDIUM: Songs Missing Metadata (1,240 songs various)

**Impact:** Medium - Search/metadata incomplete

**Breakdown:**
| Data Field | Missing | % | Notes |
|------------|---------|---|-------|
| lyrics | 1,240 | 100% | Not available on dmbalmanac.com |
| composer_info | 792 | 63.9% | Available on song pages |
| original_artist | 1,127 | 100% | For covers only (1,240 covers total) |
| avg_length_seconds | 950 | 76.6% | From song-stats page |
| first_played_date | 99 | 8.0% | From song-stats page |
| last_played_date | 99 | 8.0% | From song-stats page |

**Scraper Status:**
- Files:
  - `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/song-stats.ts`
  - `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/reparse-song-stats.ts`
- Checkpoint: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_song-stats.json`
- Last updated: Jan 21 11:11

**Available Output Files:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/song-details.json` (615KB)
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/song-stats.json` (2.3MB)

---

### 6. MEDIUM: Guest Appearances Incomplete (2,011 appearances | 131 shows)

**Impact:** Medium - Guest feature incomplete

**Current State:**
- 2,011 total guest appearance records
- Only 131 shows (3.8%) have guest appearance data
- 1,442 guests registered but most not fully linked to songs

**Available Data:**
- File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_guest-shows.json` (286MB)
- Output: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/guest-shows.json` (300MB)

**Scraper Status:**
- File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/guest-shows.ts`
- Last updated: Jan 23 17:34 - **RECENTLY UPDATED**
- Size of checkpoint: 286MB indicates massive guest data collected

---

## Low Priority Data Gaps

### 7. LOW: Song Lyrics Missing (1,240 songs | 100%)

**Impact:** Low - dmbalmanac.com doesn't provide this data

**Note:** Lyrics data not available on dmbalmanac.com. Would require:
- Third-party API (Genius, AZLyrics, etc.)
- Manual data entry
- Not part of standard scraper scope

---

## Data Scraper Inventory

### Completed Scrapers (Output Files Present)

| Scraper | Output File | Size | Last Updated | Status |
|---------|-----------|------|--------------|--------|
| Shows | `shows.json` | 20.2MB | Jan 21 11:11 | Partial (1991-2017) |
| Shows Full | `checkpoint_shows.json` | 14MB | Jan 23 17:51 | Partial (1991-2017) |
| Song Stats | `song-stats.json` | 2.3MB | Jan 21 11:11 | Complete |
| Song Details | `song-details.json` | 615KB | Jan 21 11:11 | Complete |
| Venue Stats | `venue-stats.json` | 1.6MB | Jan 23 15:02 | Complete |
| Guest Shows | `guest-shows.json` | 300MB | Jan 23 17:34 | Complete |
| Guest Shows CP | `checkpoint_guest-shows.json` | 286MB | Jan 23 17:34 | Complete |
| Tours | `tours.json` | 33KB | Jan 23 14:58 | Complete |
| Releases | `releases.json` | 107KB | Jan 23 13:35 | Complete |
| Rarity | `rarity.json` | 6KB | Jan 23 15:15 | Complete |
| History | `history.json` | 3.3MB | Jan 23 15:15 | Complete |
| Lists | `lists.json` | 861KB | Jan 21 11:11 | Complete |

### Partially Complete Scrapers (Need Resume/Completion)

| Scraper | Issue | Action Required |
|---------|-------|-----------------|
| Shows | Stops at 2017 | Resume for 2018-2026 |
| Venues | No coordinates | Need external geocoding |
| Song Stats | Missing some composers | Rerun song-stats scraper |
| Guest Appearances | Only 131 shows | Import from guest-shows.json |

---

## Prioritized Scraping Tasks

### Priority 1: CRITICAL (Do First)

**Task 1.1: Complete Show Scraper for 2018-2026 (9 years)**
- **Expected output:** ~800 additional shows with setlists
- **Time estimate:** 2-3 hours (rate-limited to 30 req/min)
- **File to run:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/shows.ts`
- **Checkpoint exists:** Yes (resume from 2018)
- **Command:**
  ```bash
  cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
  npm run scrape:shows
  ```

**Task 1.2: Import Guest Appearances from Existing Data**
- **Expected input:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/guest-shows.json` (300MB already collected)
- **Database update:** Link guest_id → show_id → setlist_entry_id
- **Time estimate:** 15-30 minutes
- **No new scraping needed** - data already collected

---

### Priority 2: HIGH (Do Next)

**Task 2.1: Venue Coordinates via External Geocoding**
- **Issue:** dmbalmanac.com has no coordinate data
- **Solution options:**
  1. **Google Maps Geocoding API** (requires API key, paid)
  2. **OpenStreetMap Nominatim** (free, rate-limited)
  3. **Mapbox** (requires token, paid)
- **Expected:** Add lat/long to all 2,855 venues
- **Time estimate:** 2-4 hours
- **New scraper needed:** `venues-geocoding.ts`

**Task 2.2: Tour Date Derivation**
- **Issue:** 158 tours missing start/end dates
- **Solution:** Query shows to find min/max date per tour
- **Time estimate:** 5 minutes (single SQL update)
- **No scraper needed** - database update only

---

### Priority 3: MEDIUM (Do After Priority 1-2)

**Task 3.1: Resume Song-Stats Scraper for Missing Composer Info**
- **Expected output:** 792 missing composer fields
- **Time estimate:** 45-90 minutes
- **Command:**
  ```bash
  cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
  npm run scrape:songs
  ```

**Task 3.2: Add Setlist Duration Parsing (Already in Data)**
- **Issue:** 4,385 setlist entries missing duration_seconds
- **Solution:** Extract from existing show pages (durations already parsed)
- **Time estimate:** 30 minutes
- **File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/shows.ts` (already parses duration)

**Task 3.3: Derive Venue Type Classification**
- **Issue:** 2,813 venues marked as "other"
- **Solution:**
  1. Scrape dmbalmanac.com venue pages for type hints
  2. Manual classification from venue names (regex patterns)
- **Time estimate:** 1-2 hours
- **New scraper needed:** `venues-classification.ts`

---

### Priority 4: LOW (Optional)

**Task 4.1: Add Song Lyrics (Out of Scope)**
- **Not available** on dmbalmanac.com
- Requires third-party API or manual entry
- **Skip for now**

---

## Cache Status

### HTML Cache Directory
- **Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/`
- **Size:** ~8GB (260,096 files)
- **Purpose:** Avoid re-fetching pages during development

**Cache hit rate estimated:** 95%+ (already scraped most content)

### Checkpoint Files (Progress Tracking)
All major scrapers have checkpoints enabling resume capability:
- `checkpoint_shows.json` - Track completed years
- `checkpoint_song-stats.json` - Song metadata progress
- `checkpoint_venue-stats.json` - Venue stats progress
- `checkpoint_guest-shows.json` - Guest appearance progress
- `checkpoint_tours.json` - Tour stats progress
- `checkpoint_releases.json` - Release data progress
- `checkpoint_rarity.json` - Rarity scoring progress
- `checkpoint_history.json` - Historical data progress
- `checkpoint_lists.json` - Curated list progress

---

## Execution Plan

### Phase 1: Immediate (Today - 1-2 hours)

1. **Resume show scraper for 2018-2026**
   ```bash
   cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
   npm run scrape:shows 2>&1 | tee shows-2018-2026.log
   ```

2. **Import guest appearances from existing guest-shows.json**
   - Run import script to link guest data to shows

3. **Derive tour dates from shows**
   - Single SQL update to populate start_date/end_date

### Phase 2: Short-term (Next 2-3 hours)

4. **Geocode all venues**
   - Implement Nominatim geocoding (free, no API key required)
   - Batch process in 100-venue chunks with 1-second delays

5. **Resume song-stats for missing composers**
   - Run existing song-stats scraper

### Phase 3: Medium-term (4-6 hours)

6. **Classify venue types**
   - Parse venue pages or use name-based classification
   - Update venue_type field for 2,813 "other" venues

7. **Parse setlist durations**
   - Already in data, just needs mapping to database

### Phase 4: Verification (1 hour)

8. **Run audit queries** to confirm data completeness
9. **Update database statistics** (ANALYZE)
10. **Rebuild full-text search indexes** (FTS)

---

## Database Query Audit Templates

### Check Shows by Year Status
```sql
SELECT
  CAST(substr(date, 1, 4) AS INTEGER) as year,
  COUNT(*) as total_shows,
  SUM(CASE WHEN (SELECT COUNT(*) FROM setlist_entries WHERE show_id = shows.id) = 0 THEN 1 ELSE 0 END) as shows_without_setlist,
  COUNT(*) - SUM(CASE WHEN (SELECT COUNT(*) FROM setlist_entries WHERE show_id = shows.id) = 0 THEN 1 ELSE 0 END) as shows_with_setlist
FROM shows
GROUP BY year
ORDER BY year DESC;
```

### Check Venue Completeness
```sql
SELECT
  COUNT(*) as total_venues,
  SUM(CASE WHEN latitude IS NULL THEN 1 ELSE 0 END) as missing_coordinates,
  SUM(CASE WHEN venue_type = 'other' THEN 1 ELSE 0 END) as unclassified,
  SUM(CASE WHEN capacity IS NULL THEN 1 ELSE 0 END) as missing_capacity
FROM venues;
```

### Check Song Metadata Completeness
```sql
SELECT
  COUNT(*) as total_songs,
  SUM(CASE WHEN composer IS NULL THEN 1 ELSE 0 END) as missing_composer,
  SUM(CASE WHEN avg_length_seconds IS NULL THEN 1 ELSE 0 END) as missing_duration,
  SUM(CASE WHEN is_cover = 1 AND original_artist IS NULL THEN 1 ELSE 0 END) as missing_cover_artist
FROM songs;
```

---

## Summary Statistics

| Metric | Value | % Complete |
|--------|-------|-----------|
| Shows | 3,454 | 78.8% (927 missing setlists) |
| Setlist Entries | 39,949 | 89.0% |
| Songs | 1,240 | 63.9% (composer), 76.6% (duration) |
| Venues | 2,855 | 0% (coordinates), 1.4% (classified) |
| Guests | 1,442 | 95% (appearances only 131 shows) |
| Tours | 194 | 18.6% (158 missing dates) |

**Overall Database Completeness: ~70%**

---

## Recommendations

### Quick Wins (15 minutes)
1. Derive tour dates from shows
2. Import guest appearances (already scraped)
3. Run SQL ANALYZE to update statistics

### High Value (1-2 hours)
1. Resume show scraper for 2018-2026
2. Setup venue geocoding with Nominatim API
3. Resume song-stats scraper for composers

### Medium Value (3-4 hours)
1. Classify venue types
2. Parse setlist durations
3. Rebuild full-text search indexes

### Out of Scope
- Song lyrics (not on dmbalmanac.com)
- Advanced metadata (wikipedia, genius, etc)

