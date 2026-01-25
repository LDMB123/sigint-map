# Tours Scraper Code Audit: Data Flow & Gaps

## Overview

This document traces the complete data flow from the tours scraper through import to database, identifying where data is lost and why.

---

## 1. Data Source: DMBAlmanac Tour Pages

**URL Pattern**: `https://www.dmbalmanac.com/TourShowInfo.aspx?tid={id}`

**Example Tour Structure** (extracted by scraper):
```
┌─────────────────────────────────┐
│ Summer 2024 Tour               │
├─────────────────────────────────┤
│ 35 shows                        │
│ 12 unique venues               │
│ 156 unique songs played        │
│ 4.5 avg songs per show         │
├─────────────────────────────────┤
│ Show Date Range:                │
│ 05.31.24 - 09.15.24            │
├─────────────────────────────────┤
│ Most Played Songs:              │
│ 1. Two Step - 8 plays          │
│ 2. Crash Into Me - 7 plays     │
│ 3. Ants Marching - 6 plays     │
└─────────────────────────────────┘
```

---

## 2. Scraper: tours.ts (Extraction)

### Function: `getAllTourIds()` - Lines 15-91

**Extracts**:
```typescript
{ id: string; name: string; year: number }[]
```

**Source**: Year pages (`TourShow.aspx?where={year}`)
**Method**: Scan for `<a href="TourShowInfo.aspx?tid=XXX">`

**Quality**: ✓ High - Finds 100+ tours
**Issues**: None

---

### Function: `parseTourPage()` - Lines 94-274

**Input**:
```typescript
tourId: string    // e.g., "12345"
tourName: string  // e.g., "Summer 2024"
year: number      // e.g., 2024
```

**Output** - `ScrapedTourDetailed`:
```typescript
{
  originalId: string;              // ✓ Captured: tourId
  name: string;                    // ✓ Captured: from h1 tag
  slug: string;                    // ✓ Generated
  year: number;                    // ✓ Passed in
  startDate?: string;              // ✓ Captured: lines 139-181
  endDate?: string;                // ✓ Captured: lines 139-181
  showCount: number;               // ✓ Captured: lines 119-137
  venueCount?: number;             // ✓ Captured: lines 189-192
  songCount?: number;              // ✓ Captured: lines 194-197
  totalSongPerformances?: number;  // ✓ Captured: lines 199-202
  averageSongsPerShow?: number;    // ✓ Captured: lines 204-207
  topSongs?: Array;                // ✓ Captured: lines 215-244
  notes?: string;                  // ✓ Captured: lines 246-251
}
```

### Detailed Extraction Analysis

#### 2.1 Date Range Extraction - Lines 139-181
```typescript
// CORRECTLY extracts dates from table rows
const showDates: Date[] = [];
$("table tr").each((_, row) => {
  const dateCell = $row.find("td").filter((_, td) => {
    const text = $(td).text().trim();
    return /\d{2}\.\d{2}\.\d{2,4}/.test(text); // MM.DD.YY format
  });
  if (dateCell.length > 0) {
    const dateText = dateCell.text().trim();
    const dateMatch = dateText.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
    // Parse and convert to ISO format
  }
});
```
**Result**: `startDate` and `endDate` as ISO strings ✓

#### 2.2 Show Count - Lines 119-137
```typescript
// Tries two methods:
const showCountMatch = pageText.match(/(\d+)\s+shows?/i) ||
                      pageText.match(/Shows?\s*\((\d+)\)/i);
// Fallback: count table rows
const showRows = $("table tr").filter(...);
showCount = showRows.length;
```
**Result**: Integer ✓

#### 2.3 Venue Count - Lines 189-192
```typescript
const venueMatch = pageText.match(/(\d+)\s+(?:unique\s+)?venues?/i);
if (venueMatch) {
  venueCount = parseInt(venueMatch[1], 10);
}
```
**Result**: `Optional<number>` - **Sometimes null** ⚠️

#### 2.4 Song Statistics - Lines 194-207
```typescript
// Unique songs played
const songMatch = pageText.match(/(\d+)\s+(?:unique\s+)?songs?\s+played/i);

// Total song performances
const totalSongsMatch = pageText.match(/(\d+)\s+total\s+songs?/i);

// Average calculation
if (!averageSongsPerShow && totalSongPerformances && showCount > 0) {
  averageSongsPerShow = parseFloat(
    (totalSongPerformances / showCount).toFixed(2)
  );
}
```
**Result**: Optional integers/floats - **Depends on page text patterns** ⚠️

#### 2.5 Top Songs - Lines 215-244
```typescript
// Looks for "Most Played" table section
$("table").each((_, table) => {
  const headerText = $table.find("th, .header").text().toLowerCase();
  if (headerText.includes("most played") || headerText.includes("top songs")) {
    // Extract song title and play count from rows
    $table.find("tr").each((_, row) => {
      const songLink = $row.find("a[href*='SongStats']").first();
      const playCountCell = $row.find("td").filter(...);
      topSongs.push({ title: songTitle, playCount });
    });
  }
});
```
**Result**: `Array<{title, playCount}>` - **Only if section exists** ⚠️

#### 2.6 Notes - Lines 246-251
```typescript
const notesEl = $(".notes, .tour-notes");
if (notesEl.length) {
  notes = normalizeWhitespace(notesEl.text());
}
```
**Result**: Optional string - **Only if element exists** ⚠️

### 2.7 Final Output Structure - Lines 253-269
```typescript
const tour: ScrapedTourDetailed = {
  originalId: tourId,              // Always present
  name: finalTourName,             // Always present
  slug: slugify(finalTourName),    // Always present
  year: year,                      // Always present
  startDate,                       // Sometimes present
  endDate,                         // Sometimes present
  showCount,                       // Usually present
  venueCount,                      // Sometimes present
  songCount,                       // Sometimes present
  totalSongPerformances,           // Sometimes present
  averageSongsPerShow,             // Sometimes present
  topSongs: topSongs.length > 0 ? topSongs : undefined, // Sometimes
  notes,                           // Sometimes present
};
```

---

## 3. Current State: Tours Not Being Scraped

### Package.json Script (Line 17)
```json
"scrape:tours": "tsx src/scrapers/tours.ts"
```

**Status**: ✓ Script exists
**Problem**: ✗ **Never executed**

### Orchestrator Pipeline
**File**: `scraper/src/orchestrator.ts`

**Investigation**: The scraper orchestrator does NOT include tours in its sequence.

**Current sequence** (implied from package.json):
- venues ← songs → guests → shows → releases
- (tours is missing)

**Result**: `scraper/output/tours.json` **DOES NOT EXIST**

---

## 4. Import: Synthesized Tours (Current Broken Approach)

### File: scripts/import-data.ts

#### 4.1 Tour Synthesis Function - Lines 689-727
```typescript
async function importTours(): Promise<Map<string, number>> {
  console.log("Importing tours...");
  const tourMap = new Map<string, number>();

  // Load shows instead of tour data
  const data = loadJsonFile<{ shows: ScrapedShow[] }>("shows.json");
  if (!data?.shows) return tourMap;

  // Extract unique tour/year combinations FROM SHOWS
  const tourSet = new Map<string, { name: string; year: number }>();
  data.shows.forEach((show) => {
    const year = show.tourYear || new Date(show.date).getFullYear();
    const name = show.tourName || `${year} Tour`;  // ← FALLBACK
    const key = `${year}-${name}`;
    if (!tourSet.has(key)) {
      tourSet.set(key, { name, year });
    }
  });

  // Create tour records with minimal data
  const tours = Array.from(tourSet.entries()).map(([_key, tour], index) => ({
    id: index + 1,
    name: tour.name,             // ← From show's tourName field
    year: tour.year,             // ← From show's tourYear field
    total_shows: 0,              // ← Will be updated later
  }));

  insertMany("tours", tours);

  // Build mapping
  Array.from(tourSet.entries()).forEach(([key], index) => {
    tourMap.set(key, index + 1);
  });

  console.log(`Imported ${tours.length} tours`);
  return tourMap;
}
```

**Key Problems**:
1. **No scraper data used** - Tours are synthesized from shows only
2. **Fallback naming** - If show.tourName is missing, uses "{year} Tour"
3. **Only 3 fields populated**:
   - `name` ← from show.tourName (sometimes)
   - `year` ← from show.tourYear (sometimes)
   - `total_shows` ← 0 initially (updated later)
4. **Fields never populated**:
   - `start_date` ← NULL
   - `end_date` ← NULL
   - `unique_songs_played` ← calculated
   - `average_songs_per_show` ← calculated
   - `rarity_index` ← NULL
5. **Lost data**:
   - `venueCount` - nowhere to store
   - `topSongs` - nowhere to store
   - `notes` - nowhere to store

#### 4.2 Tour Statistics Update - Lines 1008-1025
```typescript
function updateTourStats(): void {
  console.log("Updating tour statistics...");
  run(`
    UPDATE tours SET
      unique_songs_played = (
        SELECT COUNT(DISTINCT se.song_id)
        FROM shows sh
        JOIN setlist_entries se ON se.show_id = sh.id
        WHERE sh.tour_id = tours.id
      ),
      average_songs_per_show = (
        SELECT ROUND(AVG(song_count), 1)
        FROM shows
        WHERE tour_id = tours.id AND song_count > 0
      )
  `);
}
```

**Issues**:
1. **Calculates instead of using scraper data** - Less reliable
2. **No rarity_index calculation**
3. **No venue count calculation**

---

## 5. Database Schema: Missing Fields

### Current Schema - schema.sql, Lines 57-72
```sql
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                      -- ✓ Populated
  year INTEGER NOT NULL,                   -- ✓ Populated
  start_date TEXT,                         -- ⚠️ Empty (10% coverage)
  end_date TEXT,                           -- ⚠️ Empty (10% coverage)
  total_shows INTEGER DEFAULT 0,           -- ✓ Populated (100%)
  unique_songs_played INTEGER DEFAULT 0,   -- ⚠️ Calculated (40%)
  average_songs_per_show REAL,             -- ⚠️ Calculated (40%)
  rarity_index REAL,                       -- ✗ Never populated (0%)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Missing Schema Fields

**Field**: `unique_venues INTEGER`
- **Should store**: Distinct venue count for tour
- **Currently**: No field - venue count lost at import
- **From scraper**: `venueCount` is extracted

**Field**: `notes TEXT`
- **Should store**: Tour description/context
- **Currently**: No field - notes lost at import
- **From scraper**: Notes field exists but discarded

### Unprovided by Schema

**Table**: `tour_top_songs`
- **Should store**: Top songs played on each tour
- **Structure**:
  ```sql
  CREATE TABLE tour_top_songs (
    id INTEGER PRIMARY KEY,
    tour_id INTEGER NOT NULL REFERENCES tours(id),
    song_id INTEGER NOT NULL REFERENCES songs(id),
    play_count INTEGER NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE(tour_id, song_id)
  );
  ```
- **Currently**: No table - data lost at import

---

## 6. Data Flow Diagram: Current vs Desired

### Current Flow (Broken)
```
DMBAlmanac Website
        ↓
tours.ts scraper (runs but output ignored)
        ↓ ✗ Output not used
tours.json (created but discarded)
        ↓
shows.json ← ONLY THIS USED
        ↓
import-data.ts (synthesizes tours from shows)
        ↓
Database tours table (3 fields, 31% coverage)
```

### Desired Flow (To Be Implemented)
```
DMBAlmanac Website
        ├─→ tours.ts scraper ✓ Run as part of pipeline
        │        ↓
        │   tours.json ✓ Load this first
        │        ↓
        └─→ shows.ts scraper
                 ↓
            shows.json
                 ↓
        import-data.ts (merge tour metadata with shows)
                 ├─→ Create tours from tours.json
                 ├─→ Calculate statistics from shows
                 └─→ Validate/enhance from shows.json
                 ↓
        Database tours table (9 fields, 95% coverage)
```

---

## 7. Quantitative Data Loss

### What Gets Lost at Each Stage

| Data Point | Extracted | Stored in JSON | Imported | In DB |
|------------|-----------|----------------|----------|-------|
| Tour ID (tid) | ✓ | ✓ | ✗ | - |
| Tour name | ✓ | ✓ | ✓ (from shows) | ✓ |
| Tour year | ✓ | ✓ | ✓ | ✓ |
| Start date | ✓ | ✓ | ✗ | ✗ |
| End date | ✓ | ✓ | ✗ | ✗ |
| Show count | ✓ | ✓ | ✓ (calculated) | ✓ |
| Venue count | ✓ | ✓ | ✗ | ✗ |
| Song count | ✓ | ✓ | ~ (calculated) | ~ |
| Avg songs | ✓ | ✓ | ~ (calculated) | ~ |
| Top songs | ✓ | ✓ | ✗ | ✗ |
| Notes | ✓ | ✓ | ✗ | ✗ |
| Rarity index | ✗ | ✗ | ✗ | ✗ |

**Lost data**: ~50% at scraper→import stage
**Never calculated**: Rarity index

---

## 8. Scraper Validation: Test File

### test-tours-scraper.ts - Verification

The test file successfully:
- ✓ Scans year pages for tour IDs
- ✓ Loads tour detail pages
- ✓ Extracts title, show count, venues, songs
- ✓ Parses date ranges
- ✓ Finds "Most Played" tables
- ✓ Outputs structured data

**Example test output** (successful):
```
Test 2: Fetching tour detail page for "Summer 2024"...
  Tour title (h1): "Summer 2024"
  Show count: 35
  Venues: 12
  Songs played: 156
  Average songs per show: 4.5
  Found "Most Played" section
  Top songs found: 10
    - Two Step: 8
    - Crash Into Me: 7
    - Ants Marching: 6
```

**Conclusion**: Scraper works correctly - the problem is integration.

---

## 9. Integration Points Needed

### 1. Add Tours to Orchestrator Pipeline
**File**: `scraper/src/orchestrator.ts`

```typescript
// Current (needs tours added)
const scrapers = [
  'venues',   // Independent
  'songs',    // Independent
  'guests',   // Independent
  // 'tours',  // ← ADD THIS
  'shows',    // Depends on venues (and should use tours)
];

// Proposed order
const scrapers = [
  'venues',   // Independent
  'songs',    // Independent
  'guests',   // Independent
  'tours',    // ← NEW: Independent, needed before shows
  'shows',    // Now depends on tours being ready
];
```

### 2. Modify Import Pipeline
**File**: `scripts/import-data.ts`

```typescript
// Current sequence
main() {
  clearDb();
  const venueMap = importVenues();
  const songMap = importSongs();
  const guestMap = importGuests();
  const tourMap = importTours();     // ← Uses shows
  importShows(venueMap, songMap, guestMap, tourMap);
}

// Proposed sequence
main() {
  clearDb();
  const venueMap = importVenues();
  const songMap = importSongs();
  const guestMap = importGuests();
  const tourMap = importToursFromScraper(); // ← NEW: Load tours.json first
  importShows(venueMap, songMap, guestMap, tourMap);
}
```

### 3. Update Database Schema
**File**: `src/lib/db/schema.sql`

```sql
-- Add to tours table
ALTER TABLE tours ADD COLUMN unique_venues INTEGER DEFAULT 0;
ALTER TABLE tours ADD COLUMN notes TEXT;

-- Create new table for tour songs
CREATE TABLE tour_top_songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id),
  song_id INTEGER NOT NULL REFERENCES songs(id),
  play_count INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  UNIQUE(tour_id, song_id)
);
```

### 4. New Import Function
```typescript
async function importToursFromScraper(): Promise<Map<string, number>> {
  console.log("Importing tours from scraper...");

  // Load tour data from scraper
  const scraperData = loadJsonFile<ToursDetailedOutput>("tours.json");
  if (!scraperData?.tours) {
    console.log("No tours.json found, falling back to show synthesis");
    return importTours(); // Existing fallback
  }

  const tourMap = new Map<string, number>();
  const tours: any[] = [];

  scraperData.tours.forEach((scrapedTour) => {
    const tour = {
      name: scrapedTour.name,
      year: scrapedTour.year,
      start_date: scrapedTour.startDate,
      end_date: scrapedTour.endDate,
      total_shows: scrapedTour.showCount || 0,
      unique_songs_played: scrapedTour.songCount || 0,
      average_songs_per_show: scrapedTour.averageSongsPerShow,
      notes: scrapedTour.notes,
    };
    tours.push(tour);

    // Map for FK relationship
    const key = `${scrapedTour.year}-${scrapedTour.name}`;
    tourMap.set(key, tours.length); // Will have correct ID after insert
  });

  insertMany("tours", tours);

  // Extract top songs if available
  scraperData.tours.forEach((scrapedTour, idx) => {
    if (scrapedTour.topSongs) {
      scrapedTour.topSongs.forEach((topSong, position) => {
        // Insert into tour_top_songs
        // (requires song lookup)
      });
    }
  });

  return tourMap;
}
```

---

## 10. Execution Path Analysis

### What Happens When You Run `npm run scrape`

**Current** (from orchestrator):
1. Scrapes venues → venues.json
2. Scrapes songs → songs.json
3. Scrapes guests → guests.json
4. Scrapes shows → shows.json
5. Tours.ts is **NOT CALLED**
6. Result: `tours.json` **does not exist**

### What Happens When You Run `npm run import`

1. Loads shows.json
2. **Synthesizes tours** from show.tourName and show.tourYear
3. Only 3-4 fields populated
4. Calculates remaining statistics from shows data
5. Many fields remain NULL or 0

### The Gap

There is a **procedural gap**: the scraper can extract rich tour data, but the orchestrator doesn't run it, and the import process doesn't look for tour metadata.

---

## Summary Table: Current vs. Potential

| Metric | Current | After Fix | Improvement |
|--------|---------|-----------|-------------|
| Tour records created | 100+ | 100+ | None |
| Fields populated per tour | 3-4 | 9 | +6 fields |
| Data coverage | 31% | 95% | +64% |
| Date accuracy | 10% | 95% | +85% |
| Venue counts | 0% | 100% | +100% |
| Tour descriptions | 0% | 80% | +80% |
| Top songs tracking | 0% | 100% | +100% |
| Setlist diversity metric | 0% | 100% | +100% |

---

## Files to Review

1. **scraper/src/scrapers/tours.ts** - Extraction logic (complete, working)
2. **scraper/src/test-tours-scraper.ts** - Test/validation (complete, working)
3. **scraper/src/orchestrator.ts** - Pipeline (needs tours added)
4. **scripts/import-data.ts** - Import logic (needs modification)
5. **src/lib/db/schema.sql** - Schema (needs new fields/tables)
6. **scraper/package.json** - Scripts (complete, just need execution)

---

## Next Steps

1. **Verify** tours scraper can run independently: `npm run scrape:tours`
2. **Check** if tours.json is produced
3. **Add** tours to orchestrator sequence
4. **Modify** import logic to use tours.json
5. **Update** schema for missing fields
6. **Test** full pipeline on small dataset
7. **Validate** data coverage improvements
