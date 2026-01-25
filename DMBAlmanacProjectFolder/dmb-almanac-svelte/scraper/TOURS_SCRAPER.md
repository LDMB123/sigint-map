# Tours Scraper Documentation

## Overview

The tours scraper extracts detailed tour information from DMBAlmanac.com, including named tours like "Summer 2025", "Fall 2024", "European Tour 2009", etc. This supplements the basic year-based tour structure (1991-2026) that the show scraper creates.

**Key difference**: The show scraper creates 36 tours (one per year), while DMBAlmanac has 83+ named tours with more granular details.

## Files Created

### Scraper Implementation
- **`/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/tours.ts`**
  - Main scraper implementation
  - Follows patterns from `shows.ts` and `releases.ts`
  - Uses Playwright + Cheerio for HTML parsing
  - Implements rate limiting, caching, and checkpointing

### Test File
- **`/Users/louisherman/Documents/dmb-almanac/scraper/src/test-tours-scraper.ts`**
  - Test scraper on 2023-2025 year pages
  - Verifies tour ID extraction
  - Tests tour detail page parsing
  - Validates data extraction patterns

### Type Definitions
- **`/Users/louisherman/Documents/dmb-almanac/scraper/src/types.ts`**
  - Added `ScrapedTourDetailed` interface
  - Added `ToursDetailedOutput` interface

### Package Scripts
Updated `/Users/louisherman/Documents/dmb-almanac/scraper/package.json`:
- `npm run scrape:tours` - Run the tours scraper
- `npm run test:tours` - Test the scraper logic

## Data Structure

### ScrapedTourDetailed Interface

```typescript
export interface ScrapedTourDetailed {
  originalId: string;                  // tid from URL (e.g. "8185")
  name: string;                        // Tour name (e.g. "Summer 2025")
  slug: string;                        // URL-friendly slug (e.g. "summer-2025")
  year: number;                        // Primary tour year
  startDate?: string;                  // ISO date string (YYYY-MM-DD)
  endDate?: string;                    // ISO date string (YYYY-MM-DD)
  showCount: number;                   // Number of shows in tour
  venueCount?: number;                 // Number of unique venues
  songCount?: number;                  // Number of unique songs played
  totalSongPerformances?: number;      // Total songs across all shows
  averageSongsPerShow?: number;        // Calculated average
  topSongs?: { title: string; playCount: number }[];
  notes?: string;                      // Tour notes/description
}
```

## How It Works

### Step 1: Scan Year Pages for Tour IDs

The scraper iterates through all year pages (1991-2026) looking for tour links:

```typescript
// Scans URLs like:
https://dmbalmanac.com/TourShow.aspx?where=2025
https://dmbalmanac.com/TourShow.aspx?where=2024
// etc.
```

**Extraction patterns**:
1. Links to `TourShowInfo.aspx?tid=XXX`
2. Dropdown options with `tid=` parameter
3. Deduplicates by tour ID

**Example tours found**:
- tid=8185 → "Summer 2025"
- tid=8183 → "Misc 2025"
- tid=8186 → "Guesting 2025"

### Step 2: Scrape Each Tour Detail Page

For each tour ID, the scraper fetches the detail page:

```typescript
// Example URL:
https://dmbalmanac.com/TourShowInfo.aspx?tid=8185
```

**Extracted data**:
- **Tour name**: From `<h1>` tag or tour link text
- **Show count**: Pattern matching "35 shows" or counting table rows
- **Date range**: Parsing MM.DD.YY dates from show table, sorting to get start/end
- **Statistics**: Venue count, song count, total performances, averages
- **Top songs**: Parsing "Most Played" table if available
- **Notes**: Tour description/notes text

### Step 3: Parse Show Dates

The scraper extracts dates from the show table:

```typescript
// Date format: MM.DD.YY or MM.DD.YYYY
// Example: "05.24.25" → 2025-05-24
```

Dates are sorted to determine:
- `startDate`: First show date
- `endDate`: Last show date

### Step 4: Extract Statistics

The scraper uses regex patterns to find statistics in page text:

```typescript
// Patterns matched:
"35 shows"                    → showCount: 35
"12 unique venues"            → venueCount: 12
"45 unique songs played"      → songCount: 45
"450 total songs"             → totalSongPerformances: 450
"average: 12.8 songs per show" → averageSongsPerShow: 12.8
```

### Step 5: Parse Top Songs

If a "Most Played" table exists, the scraper extracts:
- Song titles (from `SongStats` links)
- Play counts (from table cells)

## Rate Limiting & Caching

### Rate Limiting
- **Concurrency**: 2 parallel requests max
- **Interval**: 5 requests per 10 seconds
- **Random delay**: 1-3 seconds between requests

### HTML Caching
- Caches all fetched HTML to `/Users/louisherman/Documents/dmb-almanac/scraper/cache/`
- Avoids re-fetching during development/debugging
- Cache key: MD5 hash of URL

### Checkpointing
- Saves progress every 10 tours
- Checkpoint file: `/Users/louisherman/Documents/dmb-almanac/scraper/cache/checkpoint_tours.json`
- Allows resuming interrupted scrapes

## Usage

### Test the Scraper

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm run test:tours
```

**Expected output**:
- Lists tours found in 2023-2025
- Shows tour detail page data for first tour
- Displays statistics, date range, top songs

### Run the Full Scrape

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm run scrape:tours
```

**Process**:
1. Scans all year pages (1991-2026)
2. Finds all unique tour IDs
3. Fetches each tour detail page
4. Extracts tour metadata and statistics
5. Saves to `/Users/louisherman/Documents/dmb-almanac/scraper/output/tours.json`

**Expected runtime**: ~30-60 minutes (depending on number of tours and rate limiting)

### Output Format

```json
{
  "scrapedAt": "2026-01-15T20:00:00.000Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 83,
  "tours": [
    {
      "originalId": "8185",
      "name": "Summer 2025",
      "slug": "summer-2025",
      "year": 2025,
      "startDate": "2025-05-24",
      "endDate": "2025-08-31",
      "showCount": 35,
      "venueCount": 28,
      "songCount": 87,
      "totalSongPerformances": 448,
      "averageSongsPerShow": 12.8,
      "topSongs": [
        { "title": "Ants Marching", "playCount": 32 },
        { "title": "Warehouse", "playCount": 28 }
      ]
    }
  ]
}
```

## Database Integration

The scraped data maps to the existing `tours` table:

```sql
CREATE TABLE tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  start_date TEXT,           -- Maps to startDate
  end_date TEXT,             -- Maps to endDate
  show_count INTEGER,        -- Maps to showCount
  song_count INTEGER,        -- Maps to songCount
  venue_count INTEGER,       -- Maps to venueCount
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Note**: The `originalId` (tid) is not currently in the database schema. You may want to add it:

```sql
ALTER TABLE tours ADD COLUMN original_id TEXT;
```

## Comparison: Year Tours vs Named Tours

### Show Scraper Tours (36 total)
- One tour per year: "1991 Tour", "1992 Tour", ..., "2026 Tour"
- Based on calendar year
- Includes all shows in that year
- Simple structure

### Tours Scraper Tours (83+ total)
- Named tours: "Summer 2025", "Fall 2024", "European Tour 2009"
- Based on DMBAlmanac's tour groupings
- More granular (multiple tours per year)
- Includes detailed statistics
- Includes date ranges and top songs

## Troubleshooting

### No tours found
- Check if DMBAlmanac.com structure has changed
- Verify tour link patterns still use `tid=` parameter
- Run test scraper to see actual HTML structure

### Missing statistics
- Some tour pages may not have all stats
- Fields are optional (marked with `?` in TypeScript)
- Check individual tour pages manually

### Date parsing errors
- Date format: MM.DD.YY or MM.DD.YYYY
- 2-digit years: <50 = 2000s, ≥50 = 1900s
- Invalid dates are skipped (no crash)

### Checkpoint not resuming
- Check `/Users/louisherman/Documents/dmb-almanac/scraper/cache/checkpoint_tours.json` exists
- Delete checkpoint file to start fresh
- Verify checkpoint structure matches expected format

## Next Steps

1. **Run the scraper**: `npm run scrape:tours`
2. **Verify output**: Check `/Users/louisherman/Documents/dmb-almanac/scraper/output/tours.json`
3. **Import to database**: Update import script to handle tours data
4. **Update schema**: Consider adding `original_id` field to `tours` table
5. **Link to shows**: Associate shows with their named tours (not just year)

## Related Files

- `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/shows.ts` - Show scraper (creates year-based tours)
- `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/releases.ts` - Similar scraper pattern
- `/Users/louisherman/Documents/dmb-almanac/scripts/import-data.ts` - Database import script (needs tours support)
- `/Users/louisherman/Documents/dmb-almanac/data/dmb-almanac.db` - SQLite database

## Architecture Notes

The tours scraper follows the established DMB Almanac scraper architecture:

1. **Playwright** for browser automation
2. **Cheerio** for HTML parsing
3. **p-queue** for rate limiting
4. **File-based caching** for efficiency
5. **Checkpoint system** for resumability
6. **Type-safe TypeScript** interfaces
7. **Respectful scraping** (2-5 requests/10s)

This ensures consistency with the existing scraper codebase and maintainability.
