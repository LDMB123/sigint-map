# Venue Statistics Scraper

## Overview

The Venue Statistics Scraper is an enhanced scraper for DMBAlmanac.com that extracts comprehensive venue data from individual venue statistics pages.

**URL Pattern**: `https://www.dmbalmanac.com/VenueStats.aspx?vid=XXX`

## Features

Extracts the following data for each venue:

1. **Basic Information**
   - Venue name
   - City, state, country
   - Original venue ID from DMBAlmanac

2. **Show History**
   - First show date at venue
   - Last show date at venue
   - Total number of shows

3. **Venue Details**
   - Venue capacity (if listed)
   - Alternate names ("aka" names)
   - Notable performances and releases from venue

4. **Song Statistics**
   - Top 10-20 most frequently played songs at venue
   - Play count for each song

## File Location

**Main Scraper**: `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/venue-stats.ts`

## Usage

### Run Full Scrape

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper

# Add this to package.json scripts manually:
# "scrape:venue-stats": "tsx src/scrapers/venue-stats.ts"

# Then run:
npm run scrape:venue-stats
```

### Run Test (Single Venue)

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npx tsx src/test-venue-stats.ts
```

## Output

**Output File**: `/Users/louisherman/Documents/dmb-almanac/scraper/output/venue-stats.json`

### Output Format

```json
{
  "scrapedAt": "2026-01-15T12:00:00.000Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 500,
  "venueStats": [
    {
      "originalId": "1",
      "venueName": "Red Rocks Amphitheatre",
      "city": "Morrison",
      "state": "CO",
      "country": "USA",
      "firstShowDate": "1995-06-10",
      "lastShowDate": "2024-09-06",
      "totalShows": 48,
      "capacity": 9525,
      "akaNames": [],
      "topSongs": [
        {
          "title": "Ants Marching",
          "playCount": 42
        },
        {
          "title": "Two Step",
          "playCount": 40
        }
      ],
      "notes": "Historic outdoor amphitheatre...",
      "notablePerformances": [
        "First played at venue June 10, 1995",
        "Last played September 6, 2024"
      ]
    }
  ]
}
```

## TypeScript Types

### ScrapedVenueStats

```typescript
export interface ScrapedVenueStats {
  originalId: string;           // Venue ID from DMBAlmanac
  venueName: string;            // Full venue name
  city: string;                 // City
  state?: string;               // State (if USA)
  country: string;              // Country code
  firstShowDate?: string;       // ISO date string (YYYY-MM-DD)
  lastShowDate?: string;        // ISO date string (YYYY-MM-DD)
  totalShows: number;           // Total shows at venue
  capacity?: number;            // Venue capacity
  akaNames: string[];           // Alternate/former names
  topSongs: {                   // Most played songs
    title: string;
    playCount: number;
  }[];
  notes?: string;               // General venue notes
  notablePerformances: string[]; // Notable shows/releases
}
```

## Scraper Infrastructure

### Rate Limiting

Follows respectful scraping practices:
- **Concurrency**: Max 2 concurrent requests
- **Rate Cap**: Max 5 requests per 10 seconds
- **Delay**: 1-3 second random delay between requests

### Caching

- Uses HTML caching from `src/utils/cache.ts`
- Cached files stored in `scraper/cache/`
- Avoids redundant requests during development

### Checkpointing

- Saves progress every 50 venues
- Checkpoint file: `scraper/cache/checkpoint_venue-stats.json`
- Allows resuming interrupted scrapes
- Tracks completed venue IDs

### Error Handling

- Graceful failure for individual venues
- Continues processing on parse errors
- Logs errors with context (venue ID, URL)
- Defensive parsing handles missing elements

## Parsing Strategy

### Venue Name & Location

1. Parse body text into clean lines
2. Look for location patterns:
   - US: `City, ST` (2-letter state code)
   - International: `City, COUNTRY` (3-letter code)
3. Venue name typically appears on line before location

### Show Dates

1. Find all show links (`TourShowSet.aspx?id=` or `ShowSetlist.aspx?id=`)
2. Extract date text from link content
3. Parse dates using `parseDate()` helper
4. Sort chronologically to find first/last

### Top Songs

1. Scan tables and lists for song links (`SongStats.aspx`)
2. Extract play counts from row text
3. Sort by play count descending
4. Take top 20 songs

### Capacity

- Pattern match: `/capacity[:\s]+(\d+[\,\d]*)/i`
- Remove commas, parse as integer

### Alternate Names

- Pattern match: `/aka\s+(.+?)(?:\n|$)/i`
- Also check: `/(?:formerly|previously)\s+(?:known as\s+)?(.+?)(?:\n|$)/i`
- Split by commas/semicolons

### Notable Performances

- Look for release images (CD, DVD icons)
- Match "first played" or "debut" mentions
- Match "last played" mentions
- Limit to 10 most relevant

## Database Integration

### Extending venues Table

To integrate venue stats into the database, extend the `venues` table:

```sql
ALTER TABLE venues ADD COLUMN first_show_date TEXT;
ALTER TABLE venues ADD COLUMN last_show_date TEXT;
ALTER TABLE venues ADD COLUMN capacity INTEGER;
ALTER TABLE venues ADD COLUMN aka_names TEXT; -- JSON array
ALTER TABLE venues ADD COLUMN notes TEXT;
```

### Upsert Pattern

```typescript
const venue = await db.run(`
  INSERT INTO venues (
    original_id, name, city, state, country,
    first_show_date, last_show_date, capacity,
    aka_names, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(original_id) DO UPDATE SET
    first_show_date = excluded.first_show_date,
    last_show_date = excluded.last_show_date,
    capacity = excluded.capacity,
    aka_names = excluded.aka_names,
    notes = excluded.notes
`, [
  stats.originalId,
  stats.venueName,
  stats.city,
  stats.state,
  stats.country,
  stats.firstShowDate,
  stats.lastShowDate,
  stats.capacity,
  JSON.stringify(stats.akaNames),
  stats.notes
]);
```

### Top Songs at Venue

Create a separate table for venue-song statistics:

```sql
CREATE TABLE venue_song_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  play_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (song_id) REFERENCES songs(id),
  UNIQUE(venue_id, song_id)
);
```

## Dependencies

- **playwright**: Browser automation
- **cheerio**: HTML parsing
- **p-queue**: Rate limiting
- TypeScript utilities from `src/utils/`

## Best Practices

1. **Test First**: Run `test-venue-stats.ts` with a single venue
2. **Check Cache**: Verify cached HTML is valid before full scrape
3. **Monitor Progress**: Watch checkpoint saves every 50 venues
4. **Validate Output**: Check `venue-stats.json` structure before import
5. **Respect Site**: Never disable rate limiting

## Troubleshooting

### No venue name found
- Check HTML structure hasn't changed
- Verify location pattern matching
- Look at raw cached HTML

### Missing show dates
- Ensure show links use correct href patterns
- Check date parsing regex patterns
- Verify `parseDate()` helper handles format

### Empty top songs
- Inspect table structure in cached HTML
- Check for alternate list formats
- Verify song link selectors

### Scraper hangs
- Check Playwright timeout settings
- Verify network connectivity
- Look for infinite loops in parsing

## Example Run

```bash
$ npm run scrape:venue-stats

Starting venue statistics scraper...
Fetching venue IDs from venue index...
Found 523 venue IDs
0 venues remaining to scrape

  [1/523] Red Rocks Amphitheatre - 48 shows, 20 top songs
  [2/523] Saratoga Performing Arts Center - 35 shows, 18 top songs
  ...
  [50/523] Madison Square Garden - 22 shows, 15 top songs
Checkpoint saved: venue-stats

  ...

Checkpoint saved: venue-stats
Saved 523 venue statistics to /Users/louisherman/Documents/dmb-almanac/scraper/output/venue-stats.json
Done!
```

## Manual Script Addition

Since `package.json` may be locked, add this script manually:

```json
{
  "scripts": {
    "scrape:venue-stats": "tsx src/scrapers/venue-stats.ts"
  }
}
```

Or run directly with tsx:

```bash
npx tsx src/scrapers/venue-stats.ts
```

## Related Scrapers

- `src/scrapers/venues.ts` - Basic venue scraper
- `src/scrapers/shows.ts` - Show data scraper
- `src/scrapers/songs.ts` - Song statistics scraper

## Future Enhancements

1. **Venue Photos**: Scrape venue images
2. **Weather Data**: Historical weather for show dates
3. **Setlist Patterns**: Analyze venue-specific setlist trends
4. **Venue Rankings**: Most-played venues by year
5. **Geographic Analysis**: Map venue locations
