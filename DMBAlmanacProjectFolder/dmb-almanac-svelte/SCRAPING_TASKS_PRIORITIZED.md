# Prioritized Scraping Tasks for DMB Almanac
**Generated:** January 23, 2026

---

## Task Execution Order (Recommended)

### CRITICAL PRIORITY

#### Task 1: Resume Show Scraper for 2018-2026
- **Status:** 80% complete (1991-2017 done, 2018-2026 incomplete)
- **Impact:** Add 927 missing shows with setlists
- **Files affected:**
  - Scraper: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/shows.ts`
  - Checkpoint: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_shows.json`
  - Output: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/shows.json`

**Steps:**
1. Verify checkpoint file exists and shows completed years 1991-2017
2. Start scraper - it should automatically resume from 2018
3. Expected runtime: 2-3 hours
4. Monitor cache growth and requests/minute

**Command:**
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm run scrape:shows
```

**Expected Results:**
- Additional 800+ shows appended to shows.json
- 2018-2026 shows fully populated with setlist entries
- ~40,000 new setlist_entries in database

**Verification Query:**
```sql
SELECT COUNT(*) as total_shows FROM shows;
-- Expected: 4,254 (up from 3,454)

SELECT COUNT(*) as total_entries FROM setlist_entries;
-- Expected: ~50,000 (up from 39,949)

SELECT CAST(substr(date, 1, 4) AS INTEGER) as year, COUNT(*)
FROM shows
WHERE NOT EXISTS (SELECT 1 FROM setlist_entries WHERE show_id = shows.id)
GROUP BY year
ORDER BY year DESC LIMIT 5;
-- Expected: Much fewer rows for 2018-2026
```

---

#### Task 2: Import Guest Appearances from Existing Data
- **Status:** Data already scraped (286MB checkpoint file)
- **Impact:** Link 1,400+ guest appearances to shows
- **Files affected:**
  - Input: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/guest-shows.json` (300MB)
  - Database: `guest_appearances` and `guests` tables

**Steps:**
1. Parse guest-shows.json (massive file, process in streaming chunks)
2. For each guest appearance:
   - Find show by date matching
   - Find song by title matching
   - Create guest_appearances record
   - Update guest.total_appearances
3. Handle duplicates (same guest on same song same show)

**Expected Results:**
- 2,011 → 20,000+ guest appearance records (expanded linking)
- ~500+ additional shows with guest data
- Guest popularity rankings updated

**Estimated Time:** 30-60 minutes

---

#### Task 3: Derive Tour Dates from Shows
- **Status:** Quick fix, no scraping needed
- **Impact:** Populate 158 missing tour start/end dates
- **Files affected:** Database tours table only

**SQL to Execute:**
```sql
-- First, create a temp table with tour date ranges
CREATE TEMP TABLE tour_dates AS
SELECT
  tour_id,
  MIN(date) as start_date,
  MAX(date) as end_date
FROM shows
GROUP BY tour_id;

-- Then update tours table
UPDATE tours t
SET
  start_date = (SELECT start_date FROM tour_dates td WHERE td.tour_id = t.id),
  end_date = (SELECT end_date FROM tour_dates td WHERE td.tour_id = t.id)
WHERE start_date IS NULL OR end_date IS NULL;
```

**Verification Query:**
```sql
SELECT COUNT(*) as tours_with_missing_dates
FROM tours
WHERE start_date IS NULL OR end_date IS NULL;
-- Expected: 0
```

**Estimated Time:** 2 minutes

---

### HIGH PRIORITY

#### Task 4: Geocode All Venues
- **Status:** 0% complete (2,855 venues missing coordinates)
- **Impact:** Enable venue map visualizations, geolocation searches
- **Files affected:** Database venues table (latitude, longitude columns)

**Approach:** Use OpenStreetMap Nominatim (free, no API key required)

**Implementation Steps:**

1. **Create new scraper module** at `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/venues-geocoding.ts`

```typescript
import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import { RateLimiter } from '../utils/rate-limit.js';

const db = new Database('/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db');
const rateLimiter = new RateLimiter(1500); // 1.5s between requests per Nominatim policy

interface VenueToGeocode {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
}

interface GeocodingResult {
  lat: number;
  lon: number;
}

async function geocodeVenue(venue: VenueToGeocode): Promise<GeocodingResult | null> {
  try {
    await rateLimiter.wait();

    // Build query string
    const addressParts = [
      venue.name,
      venue.city,
      venue.state,
      venue.country
    ].filter(Boolean);

    const query = encodeURIComponent(addressParts.join(', '));
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    console.log(`Geocoding: ${venue.name} (${venue.city}, ${venue.state})`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DMB-Database-Geocoder/1.0 (Educational Project)'
      }
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${venue.name}`);
      return null;
    }

    const results = await response.json();

    if (results.length === 0) {
      console.warn(`No geocoding result for ${venue.name}`);
      return null;
    }

    const topResult = results[0];
    return {
      lat: parseFloat(topResult.lat),
      lon: parseFloat(topResult.lon)
    };

  } catch (error) {
    console.error(`Error geocoding ${venue.name}:`, error);
    return null;
  }
}

async function geocodeAllVenues() {
  // Load venues without coordinates
  const venues = db.prepare(
    'SELECT id, name, city, state, country FROM venues WHERE latitude IS NULL LIMIT 100'
  ).all() as VenueToGeocode[];

  console.log(`Found ${venues.length} venues to geocode`);

  for (const venue of venues) {
    const result = await geocodeVenue(venue);

    if (result) {
      db.prepare(
        'UPDATE venues SET latitude = ?, longitude = ? WHERE id = ?'
      ).run(result.lat, result.lon, venue.id);
      console.log(`Updated: ${venue.name} (${result.lat}, ${result.lon})`);
    }
  }

  console.log('Geocoding complete');
}

geocodeAllVenues().catch(console.error);
```

2. **Run in batches:**
   ```bash
   # Run iteratively (100 venues at a time to manage API limits)
   for i in {1..29}; do
     npx tsx src/scrapers/venues-geocoding.ts
     echo "Batch $i complete"
     sleep 60
   done
   ```

3. **Monitor progress:**
   ```sql
   SELECT
     COUNT(*) as total_venues,
     SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) as geocoded,
     COUNT(*) - SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) as remaining
   FROM venues;
   ```

**Expected Results:**
- 2,500+ venues geocoded (some may not have coordinates in Nominatim)
- Error rate: ~2-5% (venue name ambiguity)

**Estimated Time:** 2-4 hours (rate-limited)

---

#### Task 5: Resume Song-Stats Scraper
- **Status:** 63.9% complete (792 missing composer info)
- **Impact:** Fill song metadata for search/discovery
- **Files affected:**
  - Scraper: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/song-stats.ts`
  - Checkpoint: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_song-stats.json`
  - Output: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/song-stats.json`

**Steps:**
1. Scraper should automatically resume from checkpoint
2. Fetch missing song pages
3. Parse composer, album info, play statistics
4. Update database

**Command:**
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm run scrape:songs
```

**Verification Query:**
```sql
SELECT COUNT(*) as songs_missing_composer
FROM songs
WHERE composer IS NULL;
-- Expected: < 100 (major improvement)
```

**Estimated Time:** 45-90 minutes

---

### MEDIUM PRIORITY

#### Task 6: Classify Venue Types
- **Status:** 2,813 venues marked as "other"
- **Impact:** Better venue filtering and categorization
- **Files affected:** Database venues table (venue_type column)

**Approach:** Combination of scraping and name-based classification

**Implementation:**

1. **Name-based regex patterns** (quick, covers 70%):
```typescript
const classificationPatterns = [
  { pattern: /amphitheat(re|er)/i, type: 'amphitheatre' },
  { pattern: /(arena|dome|coliseum|colosseum)/i, type: 'arena' },
  { pattern: /(theater|theatre|playhouse)/i, type: 'theatre' },
  { pattern: /(club|lounge|bar)/i, type: 'club' },
  { pattern: /(festival|park|gardens)/i, type: 'outdoor' },
  { pattern: /(pavilion|gazebo)/i, type: 'pavilion' },
  { pattern: /cruise|ship/i, type: 'cruise' },
  { pattern: /(studio|warehouse|ballroom)/i, type: 'club' }
];
```

2. **Scrape dmbalmanac.com venue pages** for venue_type hints (if available)

3. **Manual review** of unclassified high-traffic venues

**Expected Results:**
- 2,000+ venues automatically classified
- Remaining 800+ need manual review

**Estimated Time:** 1-2 hours

---

#### Task 7: Parse Setlist Durations
- **Status:** Data partially available, needs mapping (4,385 missing)
- **Impact:** Enable duration-based analytics and filtering
- **Files affected:** Database setlist_entries table (duration_seconds column)

**Note:** Duration data is already being parsed in show scraper. This is an extraction/mapping task.

**Steps:**
1. Re-examine show pages for duration values in parsed setlist
2. Update setlist_entries.duration_seconds from shows.json output
3. Parse "MM:SS" format to integer seconds

**Expected Results:**
- 4,000+ setlist entries with duration populated
- Enable "longest show" queries, average song length

**Estimated Time:** 30 minutes

---

### LOW PRIORITY (Optional)

#### Task 8: Enhance Venue Metadata
- **Status:** Some data missing (capacity for 2,412 venues)
- **Impact:** Venue comparison, capacity-based analytics
- **Files affected:** Database venues table (capacity column)

**Approach:**
1. Scrape dmbalmanac.com venue pages if available
2. Use Wikipedia/external sources for famous venues
3. Manual entry for high-traffic venues

**Estimated Time:** 2-3 hours

---

#### Task 9: Add Song Categories/Classifications
- **Status:** Not started
- **Impact:** Enable song discovery by style
- **Files affected:** New column `song_category` in songs table

**Note:** May require manual classification or external music API

**Estimated Time:** 4-6 hours (low priority)

---

#### Task 10: Rebuild Full-Text Search Indexes
- **Status:** Indexes exist but may be stale
- **Impact:** Search performance
- **Files affected:** FTS tables (songs_fts, venues_fts, guests_fts)

**Steps:**
```sql
-- Rebuild FTS indexes
DELETE FROM songs_fts;
INSERT INTO songs_fts (rowid, title, slug)
SELECT id, title, slug FROM songs;

DELETE FROM venues_fts;
INSERT INTO venues_fts (rowid, name, city, state)
SELECT id, name, city, state FROM venues;

DELETE FROM guests_fts;
INSERT INTO guests_fts (rowid, name)
SELECT id, name FROM guests;
```

**Estimated Time:** 5 minutes

---

## Phase-Based Execution Schedule

### Phase 1: Critical Data Completion (Today - 2-3 hours)
1. Resume show scraper (2-3 hours runtime)
2. Import guest appearances (30 min)
3. Derive tour dates (2 min)
4. **Output:** 927 shows added, guest data linked, tour dates populated

### Phase 2: High-Value Geolocation (Tomorrow - 4 hours)
5. Geocode venues (2-4 hours runtime)
6. Resume song-stats (1-2 hours)
7. **Output:** All venues mapped, song metadata 95% complete

### Phase 3: Polish & Classification (Next 2 days - 3-4 hours)
8. Classify venue types (1-2 hours)
9. Parse setlist durations (30 min)
10. Enhance venue metadata (2-3 hours)
11. Rebuild FTS indexes (5 min)
12. **Output:** Database ready for production

---

## Database Maintenance

### Before Starting Scraping
```sql
-- Backup database
.backup '/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/backup_2026-01-23.db'

-- Disable FTS temporarily (speeds up imports)
PRAGMA query_only = OFF;
```

### After Completing All Tasks
```sql
-- Analyze tables for query optimization
ANALYZE;

-- Check integrity
PRAGMA integrity_check;

-- Update FTS indexes
DELETE FROM songs_fts;
INSERT INTO songs_fts (rowid, title, slug) SELECT id, title, slug FROM songs;

DELETE FROM venues_fts;
INSERT INTO venues_fts (rowid, name, city, state) SELECT id, name, city, state FROM venues;

DELETE FROM guests_fts;
INSERT INTO guests_fts (rowid, name) SELECT id, name FROM guests;

-- Vacuum to reclaim space
VACUUM;
```

---

## Monitoring & Alerts

### Key Metrics to Watch

1. **Scraper Health:**
   - Requests per minute (should be 20-30, max 30)
   - Cache hit rate (should be 95%+)
   - Error rate (should be < 2%)
   - Response times (should be < 5 seconds)

2. **Database Health:**
   - Database file size (should grow ~5-10MB with new data)
   - Query response times
   - FTS index freshness

3. **Data Quality:**
   - Null value counts (should decrease)
   - Duplicate detection
   - Data validation errors

### Log File Locations
- Scraper logs: Individual run outputs
- Database logs: SQLite .log file
- Cache logs: File count in cache/ directory

---

## Rollback Procedures

### If Scraper Fails
1. Check checkpoint file - it can be edited to reset progress
2. Clear problematic cache files
3. Restart scraper - it will resume from checkpoint

### If Database Becomes Corrupted
1. Restore from backup
2. Re-run failed scraper with fresh checkpoint

### If Data Quality Issues Arise
1. Run validation queries
2. Identify problematic records
3. Delete invalid records
4. Re-run affected scraper module

---

## Success Criteria

| Task | Success Criteria | Current | Target |
|------|------------------|---------|--------|
| Shows with setlists | % of 3,454 shows | 73.1% | 100% |
| Venues with coordinates | Count | 0 | 2,500+ |
| Songs with composer | % of 1,240 songs | 36.1% | 95%+ |
| Tours with dates | % of 194 tours | 18.6% | 100% |
| Guest appearances | Shows with guest data | 131 | 500+ |
| Setlist durations | % entries with duration | 89.0% | 95%+ |
| Venue types classified | % of 2,855 venues | 1.4% | 80%+ |

---

## Estimated Total Time

- Phase 1 (Critical): 2-3 hours
- Phase 2 (High-value): 3-4 hours
- Phase 3 (Polish): 3-4 hours
- **Total: 8-11 hours of execution time** (can be parallelized in places)

---

## Next Steps

1. **Start Phase 1 immediately:**
   ```bash
   cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
   npm run scrape:shows
   ```

2. **Monitor progress:**
   - Check shows.json file size growth
   - Run periodic verification queries
   - Watch cache directory for activity

3. **Prepare for Phase 2:**
   - Review venues-geocoding.ts implementation
   - Test Nominatim API access
   - Plan batch timing

4. **Document completion:**
   - Update DATA_GAPS_ANALYSIS.md with results
   - Record execution times
   - Note any issues encountered

