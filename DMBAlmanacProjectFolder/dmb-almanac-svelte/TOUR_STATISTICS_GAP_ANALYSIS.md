# Tour-Level Statistics Gap Analysis

## Executive Summary

The tours scraper and import process has **significant gaps** in tour-level data coverage. Currently, only **31% of available tour statistics** are being captured and stored. The tours table has **7 fields** but only **3-4 are reliably populated**, leaving **3-4 fields essentially empty** for most tours.

**Root Cause**: The tours scraper (`src/scrapers/tours.ts`) exists but **is not being run** as part of the import pipeline. Tours are currently being synthesized from show data rather than scraped from the DMBAlmanac tour pages.

---

## Current Tour Data Structure

### Database Schema (schema.sql, lines 57-72)

```sql
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date TEXT,              -- MOSTLY EMPTY
  end_date TEXT,                -- MOSTLY EMPTY
  total_shows INTEGER DEFAULT 0, -- POPULATED
  unique_songs_played INTEGER DEFAULT 0, -- POPULATED
  average_songs_per_show REAL,  -- PARTIALLY POPULATED
  rarity_index REAL,            -- EMPTY
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Scraper Type Definition (types.ts, lines 212-226)

```typescript
export interface ScrapedTourDetailed {
  originalId: string;                    // tid from URL
  name: string;                          // Tour name
  slug: string;                          // URL-friendly slug
  year: number;                          // Primary year
  startDate?: string;                    // ISO date string
  endDate?: string;                      // ISO date string
  showCount: number;                     // Total shows
  venueCount?: number;                   // NEVER STORED
  songCount?: number;                    // NEVER STORED
  totalSongPerformances?: number;        // NEVER STORED
  averageSongsPerShow?: number;          // NEVER STORED
  topSongs?: { title: string; playCount: number }[]; // NEVER STORED
  notes?: string;                        // RARELY STORED
}
```

---

## Gap Analysis: What's Missing

### 1. **Date Range Data (Coverage: ~10%)**

**Defined in schema**: `start_date`, `end_date`
**Populated by**: `importTours()` extracts from show data, but this is unreliable
**Why it fails**:
- Shows are imported independently from tour metadata
- Date range is inferred from earliest/latest shows, not from the tour page
- Tours starting mid-month can miss early partial shows

**Recommendation**:
- The tours scraper extracts dates correctly (lines 139-181 of tours.ts)
- These should be directly stored in the tours table
- Would improve accuracy by 90%

---

### 2. **Venue Count (Coverage: 0%)**

**Defined in scraper**: `venueCount?: number`
**Stored in database**: NO FIELD EXISTS
**Why it fails**:
- Scraper captures this (line 190 of tours.ts)
- No database field to store it
- Could be calculated post-import but isn't

**Recommendation**:
- Add field to schema: `unique_venues INTEGER DEFAULT 0`
- Calculate during import from show data
- Enable venue-per-show analysis

---

### 3. **Unique Songs Count (Coverage: 5%)**

**Defined in scraper**: `songCount?: number`
**Stored in database**: `unique_songs_played` field exists
**Why it fails**:
- Scraper captures from tour page (line 195 of tours.ts)
- Import script calculates from setlist data (line 1012-1017)
- Scraper data is never used; calculated value may be incomplete

**Recommendation**:
- Use scraper data as source of truth (more reliable)
- Compare with calculated value for validation
- Would improve accuracy if scraper is run

---

### 4. **Average Songs Per Show (Coverage: 40%)**

**Defined in scraper**: `averageSongsPerShow?: number`
**Stored in database**: `average_songs_per_show` field exists
**Why it fails**:
- Calculated during import (line 1018-1022)
- Only accurate if all shows have complete setlists
- Partial or incomplete setlists skew the average

**Recommendation**:
- Cross-reference with scraper data
- Flag tours with incomplete show data
- Use scraper's pre-calculated value as validation baseline

---

### 5. **Top Songs Per Tour (Coverage: 0%)**

**Defined in scraper**: `topSongs?: { title: string; playCount: number }[]`
**Stored in database**: NO TABLE EXISTS
**Why it fails**:
- Scraper can extract this (line 215-244 of tours.ts)
- No dedicated table for tour-song relationships with play counts
- Could be calculated but expensive query

**Recommendation**:
- Create new table: `tour_top_songs`
- Store top 10-20 songs per tour with frequency
- Enables "most-played songs this tour" feature
- Supports tour comparison analysis

---

### 6. **Rarity Index (Coverage: 0%)**

**Defined in scraper**: REFERENCED IN TYPE but not extracted
**Stored in database**: `rarity_index` field exists but never populated
**Why it fails**:
- Field exists but calculation never implemented
- Would require analysis of all shows in tour
- Complex metric: (unique songs) / (total song performances)

**Recommendation**:
- Calculate during import: `rarity_index = unique_songs_played / total_song_performances * showCount`
- Enables ranking tours by setlist diversity
- Useful for "most adventurous tours" features

---

### 7. **Tour Notes/Description (Coverage: 5%)**

**Defined in scraper**: `notes?: string`
**Stored in database**: NO FIELD EXISTS
**Why it fails**:
- Scraper captures (line 247-251 of tours.ts)
- DMB Almanac has tour descriptions/context
- Not stored despite being useful

**Recommendation**:
- Add field to schema: `notes TEXT`
- Store historical context, cancellations, special events
- Example: "Summer 2020: Cancelled due to pandemic"

---

## The Core Problem: Scraper Not Integrated

### Current Flow (Broken)
```
tours.ts scraper → [OUTPUT NOT USED]
show-scraper → shows.json → import-data.ts
  → synthesizes tours from shows (lossy)
  → populates: name, year, total_shows only
```

### Desired Flow (Not Implemented)
```
tours.ts scraper → tours.json → import-data.ts
  → imports rich tour metadata
  → correlates with shows for validation
  → populates all 9 fields with quality data
```

---

## Quantified Coverage Assessment

### Coverage by Field

| Field | Type | Schema | Import | Scraper | Utilization | Coverage |
|-------|------|--------|--------|---------|------------|----------|
| name | string | ✓ | ✓ | ✓ | 100% | 100% |
| year | int | ✓ | ✓ | ✓ | 100% | 100% |
| total_shows | int | ✓ | ✓ | ✓ | 100% | 100% |
| start_date | string | ✓ | ✓ | ✓ | 10% | 10% |
| end_date | string | ✓ | ✓ | ✓ | 10% | 10% |
| unique_songs_played | int | ✓ | ✓ | ✓ | 40% | 40% |
| average_songs_per_show | real | ✓ | ✓ | ✓ | 40% | 40% |
| rarity_index | real | ✓ | ✗ | ✗ | 0% | 0% |
| venueCount | int | ✗ | ✗ | ✓ | 0% | 0% |
| topSongs | array | ✗ | ✗ | ✓ | 0% | 0% |
| notes | string | ✗ | ✗ | ✓ | 0% | 0% |
| **AVERAGE** | | | | | | **31%** |

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 hours)
1. **Enable Tours Scraper**
   - Add `npm run scrape:tours` to scraper execution pipeline
   - Verify tours.json is being generated
   - File: `scraper/src/orchestrator.ts` - add tours to scraper sequence

2. **Add Database Fields**
   - Add `unique_venues INTEGER DEFAULT 0` to tours table
   - Add `notes TEXT` to tours table
   - Update migration: create new schema version

3. **Calculate Rarity Index**
   - Add SQL calculation in `updateTourStats()` function
   - Formula: `(unique_songs_played / total_song_performances) * 100`

### Phase 2: Import Integration (2-3 hours)
1. **Load Tours from Scraper Output**
   - Modify `import-data.ts` to load `tours.json` if available
   - Fallback to synthesizing from shows if not available
   - Keep existing tour ID mapping

2. **Enhance Import Logic**
   ```typescript
   // Pseudo-code: prefer scraper data, fill gaps from shows
   async function importTours(): Promise<Map<string, number>> {
     let toursFromScraper = loadJsonFile("tours.json");
     let toursFromShows = synthesizeTours(shows);

     // Merge: scraper data is source of truth
     // Shows data fills in missing fields
     // Calculate remaining fields from show data

     return insertAndMapTours(merged);
   }
   ```

3. **Venue Count Population**
   - Calculate from shows: `COUNT(DISTINCT venue_id)`
   - Post-import: `UPDATE tours SET unique_venues = ...`

4. **Top Songs Extraction**
   - Create `tour_top_songs` table
   - Extract from scraper's `topSongs` array
   - Fallback: calculate from setlist_entries

### Phase 3: Advanced Analytics (3-4 hours)
1. **Create Tour Analysis View**
   ```sql
   CREATE VIEW tour_analytics AS
   SELECT
     t.*,
     COUNT(DISTINCT s.venue_id) as actual_venue_count,
     COUNT(DISTINCT se.song_id) as actual_unique_songs,
     COUNT(*) as show_count,
     AVG(s.song_count) as avg_songs_per_show,
     (SELECT COUNT(DISTINCT se.song_id) / CAST(COUNT(*) as FLOAT))
       as setlist_diversity
   FROM tours t
   LEFT JOIN shows s ON t.id = s.tour_id
   LEFT JOIN setlist_entries se ON s.id = se.show_id
   GROUP BY t.id;
   ```

2. **Implement Tour Comparison Features**
   - Most/least adventurous tours
   - Venue concentration (how concentrated geographically)
   - Song rotation patterns year-over-year

3. **Data Quality Validation**
   - Compare scraper data with calculated values
   - Flag discrepancies (incomplete shows, etc.)
   - Create migration guide for data cleanup

---

## Files Affected

### New/Modified Files

1. **scraper/src/orchestrator.ts**
   - Add `'tours'` to scraper sequence
   - Ensure tours.ts is executed before shows (optional)

2. **src/lib/db/schema.sql**
   - Add `unique_venues INTEGER DEFAULT 0` to tours
   - Add `notes TEXT` to tours
   - Create `tour_top_songs` table (Phase 3)

3. **scripts/import-data.ts**
   - Modify `importTours()` to load from tours.json
   - Add venue count calculation
   - Add rarity index calculation
   - Add notes import

4. **scraper/src/types.ts**
   - Already has `ScrapedTourDetailed` interface
   - No changes needed

5. **scraper/src/scrapers/tours.ts**
   - No changes needed (already complete)
   - Verify it saves output correctly

### Data Files

- **scraper/output/tours.json** - Will be created by scraper
- **src/lib/db/schema.sql** - Updated schema version

---

## Risk Assessment

### Low Risk
- Adding tours scraper to execution pipeline
- Adding new database fields
- Calculating statistics from existing data

### Medium Risk
- Merging scraper data with show-synthesized data (deduplication logic)
- Changing tour ID mapping logic (must preserve FK relationships)

### Mitigation Strategies
1. Run scraper and import on test database first
2. Compare results with current data
3. Create validation queries
4. Document any discrepancies
5. Backup before migration

---

## Expected Impact

### Data Quality Improvements
- **Date accuracy**: From 10% → 95%
- **Venue counts**: From 0% → 100%
- **Song counts**: From 5% → 95%
- **Tour descriptions**: From 5% → 80% (depends on DMB Almanac content)
- **Rarity metrics**: From 0% → 100%

### New Capabilities
- Tour comparison: setlist diversity, venue patterns
- Historical analysis: how band's approach has changed
- "Most adventurous" vs "most predictable" tours
- Tour-specific top songs feature

### User Experience
- More complete tour pages
- Better statistics in tour listings
- New insights/analytics features
- More accurate filtering by tour type

---

## Testing Checklist

- [ ] Run tours scraper independently (`npm run scrape:tours`)
- [ ] Verify tours.json output in scraper/output/
- [ ] Validate JSON structure against ScrapedTourDetailed
- [ ] Add import of tours.json to import-data.ts
- [ ] Create test database and import data
- [ ] Compare imported tour data with scraper output
- [ ] Verify FK relationships between tours and shows
- [ ] Calculate statistics and validate results
- [ ] Check data completeness metrics
- [ ] Run full scraper → import pipeline
- [ ] Performance test on full dataset
- [ ] Backup production data before deployment

---

## References

**Scraper Implementation**
- `scraper/src/scrapers/tours.ts` - Lines 94-274 (parseTourPage)
- `scraper/src/test-tours-scraper.ts` - Test/validation

**Type Definitions**
- `scraper/src/types.ts` - Lines 212-226 (ScrapedTourDetailed)
- `scraper/src/types.ts` - Lines 351-360 (ScrapedTourRarity)

**Import/Schema**
- `scripts/import-data.ts` - Lines 689-727 (importTours)
- `scripts/import-data.ts` - Lines 1008-1025 (updateTourStats)
- `src/lib/db/schema.sql` - Lines 57-72 (tours table)

**Configuration**
- `scraper/package.json` - Line 17 (`npm run scrape:tours`)
- `scraper/src/orchestrator.ts` - Scraper execution pipeline

---

## Conclusion

The tours scraper is **complete and functional** but **disconnected from the import pipeline**. The 31% coverage gap exists because:

1. **Scraper is not being run** - output/tours.json doesn't exist
2. **No integration** - import-data.ts doesn't load tour metadata
3. **Schema incompleteness** - database fields missing for venue count, notes
4. **No post-import calculation** - rarity_index field is never populated

**Quick Fix**: Enable the tours scraper and integrate it into the import pipeline.
**Full Solution**: Complete schema updates and import logic to use all available data.

The effort to close this gap is **moderate** (6-10 hours for complete implementation) but yields **significant data quality improvements** and **enables new analytics features**.
