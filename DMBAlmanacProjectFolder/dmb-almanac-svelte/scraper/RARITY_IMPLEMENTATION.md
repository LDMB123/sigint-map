# Show Rarity Index Scraper - Implementation Summary

## Files Created

### 1. Main Scraper
**File**: `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/rarity.ts`

**Purpose**: Scrapes show rarity metrics from DMBAlmanac.com/ShowRarity.aspx

**Key Features**:
- Parses tour-level rarity metrics (avg rarity index, different songs, catalog %)
- Extracts show-level rarity indices
- Multiple parsing strategies for robustness
- Rate limiting (2-4s between requests)
- HTML caching to avoid redundant fetches
- Checkpointing for resumable scraping
- Outputs to `scraper/output/rarity.json`

**Exports**:
```typescript
export async function scrapeRarity(): Promise<RarityOutput>
export function saveRarity(data: RarityOutput): void
```

### 2. Type Definitions
**File**: `/Users/louisherman/Documents/dmb-almanac/scraper/src/types.ts` (updated)

**New Types Added**:
```typescript
interface ScrapedShowRarity {
  showId: string;
  date: string;
  venueName: string;
  city: string;
  state?: string;
  rarityIndex: number;
}

interface ScrapedTourRarity {
  tourName: string;
  year: number;
  averageRarityIndex: number;
  differentSongsPlayed: number;
  totalSongsInShow?: number;
  catalogPercentage?: number;
  rank?: number;
  shows: ScrapedShowRarity[];
}

interface RarityOutput extends ScraperOutput {
  totalTours: number;
  totalShows: number;
  tours: ScrapedTourRarity[];
  metadata?: {
    totalCatalogSongs?: number;
    rarityCalculationMethod?: string;
  };
}
```

### 3. Test Script
**File**: `/Users/louisherman/Documents/dmb-almanac/scraper/src/test-rarity-scraper.ts`

**Purpose**: Test and validate the rarity scraper

**Features**:
- Runs scraper in test mode
- Displays sample data from recent tours
- Validates data structure
- Shows detailed validation checks
- Provides next steps guidance

### 4. Package Scripts
**File**: `/Users/louisherman/Documents/dmb-almanac/scraper/package.json` (updated)

**New Scripts**:
```json
{
  "scripts": {
    "scrape:rarity": "tsx src/scrapers/rarity.ts",
    "test:rarity": "tsx src/test-rarity-scraper.ts"
  }
}
```

### 5. Documentation
**Files**:
- `/Users/louisherman/Documents/dmb-almanac/scraper/RARITY_SCRAPER.md` - Full documentation
- `/Users/louisherman/Documents/dmb-almanac/scraper/RARITY_IMPLEMENTATION.md` - This file

## Quick Start

### 1. Test the Scraper
```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm run test:rarity
```

This will:
- Scrape ShowRarity.aspx page
- Display sample tour and show data
- Run validation checks
- Save output to `output/rarity.json`

### 2. Run Full Scrape
```bash
npm run scrape:rarity
```

### 3. Review Output
```bash
cat output/rarity.json | jq '.tours[:5]'
```

## Data Structure Example

```json
{
  "scrapedAt": "2026-01-15T10:30:00.000Z",
  "source": "https://www.dmbalmanac.com/ShowRarity.aspx",
  "totalItems": 35,
  "totalTours": 35,
  "totalShows": 428,
  "tours": [
    {
      "tourName": "2025 Tour",
      "year": 2025,
      "averageRarityIndex": 2.456,
      "differentSongsPlayed": 72,
      "totalSongsInShow": 23,
      "catalogPercentage": 48.5,
      "rank": 3,
      "shows": [
        {
          "showId": "453927846",
          "date": "2025-06-01",
          "venueName": "The Gorge Amphitheatre",
          "city": "George",
          "state": "WA",
          "rarityIndex": 2.234
        }
      ]
    }
  ]
}
```

## Database Integration Options

### Option 1: New `tour_rarity` Table (Recommended)

```sql
-- Create dedicated rarity table
CREATE TABLE tour_rarity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL,
  average_rarity_index REAL NOT NULL,
  different_songs_played INTEGER NOT NULL,
  total_songs_per_show REAL,
  catalog_percentage REAL,
  rarity_rank INTEGER,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_id) REFERENCES tours(id),
  UNIQUE(tour_id)
);

CREATE INDEX idx_tour_rarity_rank ON tour_rarity(rarity_rank);
CREATE INDEX idx_tour_rarity_index ON tour_rarity(average_rarity_index);

-- Add show-level rarity
ALTER TABLE shows ADD COLUMN rarity_index REAL;
CREATE INDEX idx_shows_rarity ON shows(rarity_index);
```

**Import Script**:
```typescript
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('data/dmb-almanac.db');
const rarity = JSON.parse(readFileSync('scraper/output/rarity.json', 'utf-8'));

// Insert tour rarity
const insertTourRarity = db.prepare(`
  INSERT OR REPLACE INTO tour_rarity
  (tour_id, average_rarity_index, different_songs_played, catalog_percentage, rarity_rank)
  VALUES (?, ?, ?, ?, ?)
`);

// Insert show rarity
const updateShowRarity = db.prepare(`
  UPDATE shows
  SET rarity_index = ?
  WHERE date = ? AND slug LIKE ?
`);

for (const tour of rarity.tours) {
  // Get tour_id by year
  const tourRow = db.prepare('SELECT id FROM tours WHERE year = ?').get(tour.year);

  if (tourRow) {
    insertTourRarity.run(
      tourRow.id,
      tour.averageRarityIndex,
      tour.differentSongsPlayed,
      tour.catalogPercentage || null,
      tour.rank || null
    );

    // Update show-level rarity
    for (const show of tour.shows) {
      if (show.rarityIndex > 0) {
        updateShowRarity.run(
          show.rarityIndex,
          show.date,
          `%${show.date}%`
        );
      }
    }
  }
}

console.log('Rarity data imported successfully');
```

### Option 2: Extend Existing `tours` Table

```sql
-- Add columns to tours table
ALTER TABLE tours ADD COLUMN rarity_index REAL;
ALTER TABLE tours ADD COLUMN different_songs_played INTEGER;
ALTER TABLE tours ADD COLUMN catalog_percentage REAL;
ALTER TABLE tours ADD COLUMN rarity_rank INTEGER;
```

## Usage Examples

### Find Rarest Tours
```sql
SELECT
  t.name,
  tr.average_rarity_index,
  tr.different_songs_played,
  tr.catalog_percentage
FROM tours t
JOIN tour_rarity tr ON t.id = tr.tour_id
ORDER BY tr.average_rarity_index ASC
LIMIT 10;
```

### Find Most Unique Shows
```sql
SELECT
  s.date,
  v.name as venue,
  v.city || ', ' || v.state as location,
  s.rarity_index
FROM shows s
JOIN venues v ON s.venue_id = v.id
WHERE s.rarity_index IS NOT NULL
ORDER BY s.rarity_index ASC
LIMIT 25;
```

### Tour Rankings by Rarity
```sql
SELECT
  rarity_rank,
  t.name,
  average_rarity_index,
  different_songs_played
FROM tour_rarity tr
JOIN tours t ON t.id = tr.tour_id
WHERE rarity_rank IS NOT NULL
ORDER BY rarity_rank ASC;
```

### Catalog Coverage Over Time
```sql
SELECT
  t.year,
  tr.catalog_percentage,
  tr.different_songs_played
FROM tours t
JOIN tour_rarity tr ON t.id = tr.tour_id
WHERE tr.catalog_percentage IS NOT NULL
ORDER BY t.year ASC;
```

## Scraping Behavior

### Rate Limiting
- **Delay**: 2-4 seconds between requests
- **Randomization**: Uses `randomDelay(2000, 4000)`
- **Respectful**: Follows ethical scraping practices

### Caching
- **Location**: `scraper/cache/`
- **Format**: HTML files named by URL hash
- **Benefit**: Avoid re-fetching during development

### Checkpointing
- **File**: `scraper/cache/checkpoint_rarity.json`
- **Saves**: After each completed tour year
- **Resume**: Automatically skips completed years

### Error Handling
- Logs errors but continues processing
- Graceful degradation if data is missing
- Validates output before saving

## Maintenance & Updates

### If Page Structure Changes

1. **View cached HTML**:
```bash
ls -la scraper/cache/*.html
```

2. **Inspect HTML structure**:
```bash
open scraper/cache/[relevant-file].html
```

3. **Update selectors in `rarity.ts`**:
   - Look for table parsing logic (lines ~50-150)
   - Adjust cheerio selectors as needed
   - Test with `npm run test:rarity`

### Clear Cache
```bash
rm -rf scraper/cache/*.html
rm -f scraper/cache/checkpoint_rarity.json
```

## Integration Checklist

- [ ] Test scraper: `npm run test:rarity`
- [ ] Review output: `cat scraper/output/rarity.json`
- [ ] Create database schema (tour_rarity table)
- [ ] Write import script
- [ ] Run import
- [ ] Verify data: `SELECT * FROM tour_rarity LIMIT 5`
- [ ] Add API endpoints for rarity data
- [ ] Update UI to display rarity metrics
- [ ] Document for end users

## Next Steps

1. **Test the scraper** to verify it works with current page structure
2. **Review scraped data** in `output/rarity.json`
3. **Decide on database schema** (new table vs. extending tours)
4. **Write import script** to populate database
5. **Add API routes** in Next.js app to expose rarity data
6. **Update UI components** to display:
   - Tour rarity rankings
   - Show rarity badges
   - Catalog coverage charts
   - "Rarest shows" lists

## File Paths Reference

| File | Path |
|------|------|
| Scraper | `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/rarity.ts` |
| Types | `/Users/louisherman/Documents/dmb-almanac/scraper/src/types.ts` |
| Test Script | `/Users/louisherman/Documents/dmb-almanac/scraper/src/test-rarity-scraper.ts` |
| Package.json | `/Users/louisherman/Documents/dmb-almanac/scraper/package.json` |
| Output | `/Users/louisherman/Documents/dmb-almanac/scraper/output/rarity.json` |
| Cache | `/Users/louisherman/Documents/dmb-almanac/scraper/cache/` |
| Documentation | `/Users/louisherman/Documents/dmb-almanac/scraper/RARITY_SCRAPER.md` |

## Support

For questions or issues:
1. Check `RARITY_SCRAPER.md` for detailed documentation
2. Review test output from `npm run test:rarity`
3. Inspect cached HTML to understand page structure
4. Reference existing scrapers (`shows.ts`, `tours.ts`) for patterns
