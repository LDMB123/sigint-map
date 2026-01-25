# Show Rarity Index Scraper

## Overview

The **Rarity Scraper** extracts show rarity metrics from DMBAlmanac's [ShowRarity.aspx](https://www.dmbalmanac.com/ShowRarity.aspx) page. This page contains pre-computed rarity indices that measure the "uniqueness" or "rareness" of setlists based on song selection frequency.

## What is Rarity Index?

The **rarity index** is a metric that represents the average frequency of songs played in a show:

- **Lower values = More rare** (songs played less frequently)
- **Higher values = More common** (songs played more frequently)

For example:
- **Rarity Index: 2.000** = On average, songs in this show are played every 2 shows
- **Rarity Index: 5.500** = On average, songs are played every 5-6 shows

A show with a lower rarity index indicates a more unique setlist with deeper cuts and rarely-played songs.

## Data Extracted

### Tour-Level Metrics

For each tour/year, the scraper extracts:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `tourName` | string | Tour name or year | "2023 Tour" |
| `year` | number | Tour year | 2023 |
| `averageRarityIndex` | number | Average rarity across all shows | 2.345 |
| `differentSongsPlayed` | number | Unique songs performed | 67 |
| `totalSongsInShow` | number | Average songs per show | 22 |
| `catalogPercentage` | number | % of catalog played | 45.5 |
| `rank` | number | Ranking by rarity (1 = rarest) | 5 |

### Show-Level Metrics

For each show, the scraper extracts:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `showId` | string | DMBAlmanac show ID | "453927846" |
| `date` | string | ISO date format | "2023-06-15" |
| `venueName` | string | Venue name | "Saratoga PAC" |
| `city` | string | City | "Saratoga Springs" |
| `state` | string | State (if USA) | "NY" |
| `rarityIndex` | number | Show rarity index | 2.156 |

## File Locations

### Scraper Source
```
/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/rarity.ts
```

### Type Definitions
```
/Users/louisherman/Documents/dmb-almanac/scraper/src/types.ts
  - ScrapedShowRarity
  - ScrapedTourRarity
  - RarityOutput
```

### Output File
```
/Users/louisherman/Documents/dmb-almanac/scraper/output/rarity.json
```

### Cache Directory
```
/Users/louisherman/Documents/dmb-almanac/scraper/cache/
  - Cached HTML from ShowRarity.aspx
  - checkpoint_rarity.json (resumable progress)
```

## Usage

### Run Full Scrape
```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm run scrape:rarity
```

### Run Test Scrape
```bash
npm run test:rarity
```

### Import to main package
```typescript
import { scrapeRarity, saveRarity } from './scrapers/rarity.js';

const data = await scrapeRarity();
saveRarity(data);
```

## Scraping Strategy

The rarity scraper uses **multiple parsing approaches** to handle varying HTML structures on DMBAlmanac:

### Approach 1: Table-Based Parsing
- Scans HTML tables for tour year headers
- Extracts tour-level metrics from table cells
- Identifies show links with `TourShowSet.aspx?id=` pattern
- Parses rarity indices from adjacent cells

### Approach 2: Link-Based Parsing
- Finds year links (`href*='year='` or `href*='TourShow'`)
- Extracts tour names and years from link text
- Follows links to tour-specific pages for show data

### Approach 3: Text Pattern Matching
- Matches patterns like `"2023: 2.345 rarity, 67 different songs"`
- Extracts metrics from unstructured text

## Features

### Rate Limiting
- **2-4 second delay** between requests
- Respects DMBAlmanac's server resources
- Uses `randomDelay()` utility for natural timing

### Caching
- HTML responses cached to avoid redundant requests
- Cache key: URL-based filename
- Cache hit = instant parse, no network request

### Checkpointing
- Saves progress after each tour year
- Resumable if scraper is interrupted
- Checkpoint file: `cache/checkpoint_rarity.json`

### Error Handling
- Graceful failures for individual tours
- Logs errors but continues with other years
- Validates data before saving

## Output Format

The scraper generates a JSON file with this structure:

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
  ],
  "metadata": {
    "rarityCalculationMethod": "Average rarity of songs played (lower = more rare)"
  }
}
```

## Database Integration

### Option 1: Extend `tours` Table

Add rarity metrics to existing tour table:

```sql
ALTER TABLE tours ADD COLUMN rarity_index REAL;
ALTER TABLE tours ADD COLUMN different_songs_played INTEGER;
ALTER TABLE tours ADD COLUMN catalog_percentage REAL;
ALTER TABLE tours ADD COLUMN rarity_rank INTEGER;
```

### Option 2: Create `tour_rarity` Table

Dedicated table for rarity metrics:

```sql
CREATE TABLE tour_rarity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id),
  average_rarity_index REAL NOT NULL,
  different_songs_played INTEGER NOT NULL,
  total_songs_per_show REAL,
  catalog_percentage REAL,
  rarity_rank INTEGER,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_id)
);

CREATE INDEX idx_tour_rarity_rank ON tour_rarity(rarity_rank);
CREATE INDEX idx_tour_rarity_index ON tour_rarity(average_rarity_index);
```

### Option 3: Add `show_rarity_index` to `shows` Table

Store show-level rarity:

```sql
ALTER TABLE shows ADD COLUMN rarity_index REAL;
CREATE INDEX idx_shows_rarity ON shows(rarity_index);
```

### Import Script Example

```typescript
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('data/dmb-almanac.db');
const rarity = JSON.parse(readFileSync('scraper/output/rarity.json', 'utf-8'));

const insertRarity = db.prepare(`
  INSERT OR REPLACE INTO tour_rarity
  (tour_id, average_rarity_index, different_songs_played, catalog_percentage, rarity_rank)
  VALUES (?, ?, ?, ?, ?)
`);

for (const tour of rarity.tours) {
  // Find tour by year
  const tourRow = db.prepare('SELECT id FROM tours WHERE year = ?').get(tour.year);

  if (tourRow) {
    insertRarity.run(
      tourRow.id,
      tour.averageRarityIndex,
      tour.differentSongsPlayed,
      tour.catalogPercentage || null,
      tour.rank || null
    );
  }
}
```

## Use Cases

### 1. Tour Comparisons
Compare setlist diversity across different tours:
```sql
SELECT year, average_rarity_index, different_songs_played
FROM tour_rarity
ORDER BY average_rarity_index ASC
LIMIT 10;
```

### 2. Rarest Shows
Find the most unique individual shows:
```sql
SELECT date, venue_name, rarity_index
FROM shows
WHERE rarity_index IS NOT NULL
ORDER BY rarity_index ASC
LIMIT 25;
```

### 3. Tour Rankings
Display tours by rarity rank:
```sql
SELECT t.name, tr.rarity_rank, tr.average_rarity_index
FROM tours t
JOIN tour_rarity tr ON t.id = tr.tour_id
ORDER BY tr.rarity_rank ASC;
```

### 4. Catalog Coverage Trends
Track how much of the catalog is played over time:
```sql
SELECT year, catalog_percentage
FROM tour_rarity
ORDER BY year ASC;
```

## Limitations & Caveats

1. **Page Structure Dependency**: Scraper relies on DMBAlmanac's HTML structure, which may change
2. **Pre-computed Data**: Rarity indices are calculated by DMBAlmanac, not derived from raw data
3. **Incomplete Show Data**: Not all shows may have individual rarity indices
4. **Tour Grouping**: Tours are grouped by year; may not match multi-year tours (e.g., "2023-2024 Winter Tour")
5. **Calculation Method**: Exact formula for rarity calculation is not publicly documented

## Troubleshooting

### No Data Scraped
- Check network connectivity
- Verify ShowRarity.aspx page still exists
- Review cached HTML in `scraper/cache/`
- Run test scraper to see detailed output

### Missing Show Data
- Individual show rarity may not be displayed on main page
- Try fetching tour-specific pages (implemented in scraper)
- Some tours may only have aggregate data

### Incorrect Parsing
- Inspect HTML structure manually
- Adjust selectors in `rarity.ts`
- Add logging to parsing functions
- Test with known good tour years

## Future Enhancements

1. **Song-Level Rarity**: Scrape individual song rarity metrics from SongStats pages
2. **Historical Trends**: Track rarity changes over multiple scrapes
3. **Rarity Alerts**: Notify when a tour has exceptionally rare setlists
4. **Predictive Models**: Use rarity data to predict future setlist patterns
5. **Visualization**: Generate charts showing rarity trends over time

## References

- **DMBAlmanac ShowRarity Page**: https://www.dmbalmanac.com/ShowRarity.aspx
- **Scraper Infrastructure**: `/Users/louisherman/Documents/dmb-almanac/scraper/`
- **Database Schema**: `/Users/louisherman/Documents/dmb-almanac/prisma/schema.prisma`
- **Type Definitions**: `/Users/louisherman/Documents/dmb-almanac/scraper/src/types.ts`

## Support

For issues or questions about the rarity scraper:
1. Check cached HTML to verify page structure
2. Review scraper logs for error messages
3. Test with `npm run test:rarity`
4. Adjust selectors based on current HTML structure
5. Consult existing scrapers (shows.ts, tours.ts) for patterns
