# This Day in History Scraper

## Overview

The History scraper extracts "This Day in History" data from DMBAlmanac.com, collecting all shows that occurred on each calendar date (Jan 1 - Dec 31, including Feb 29 for leap years).

## Purpose

This data enables:
- "On This Day" features in the app
- Validation of show data completeness
- Cross-referencing with existing show database
- Anniversary and milestone tracking
- Historical pattern analysis (e.g., which dates DMB plays most often)

## URL Pattern

```
https://www.dmbalmanac.com/ThisDayinHistory.aspx?month={month}&day={day}
```

**Parameters:**
- `month`: 1-12 (January through December)
- `day`: 1-31 (depending on month, including Feb 29)

## Data Extracted

For each calendar day, the scraper collects:

### HistoryDay
- `month`: Calendar month (1-12)
- `day`: Calendar day (1-31)
- `calendarDate`: MM-DD format for easy lookup
- `shows`: Array of all shows on this date
- `totalYears`: Number of unique years DMB played on this date
- `firstYear`: First year DMB played on this date
- `lastYear`: Most recent year DMB played on this date
- `yearsSinceLastPlayed`: Gap from last performance to current year

### HistoryDayShow
- `originalId`: Show ID from dmbalmanac (from URL parameter `id=`)
- `showDate`: Full date in YYYY-MM-DD format
- `year`: Year the show occurred
- `venueName`: Venue name
- `city`: City
- `state`: State (if USA)
- `country`: Country
- `notes`: Special notes (anniversaries, milestones)

## HTML Structure & Selectors

The page contains show links in various formats. The scraper uses multiple strategies:

### Strategy 1: Show Links
```javascript
$("a[href*='TourShowSet.aspx'][href*='id=']")
```

Extracts:
- Show ID from `id=` parameter
- Show date from link text or nearby elements
- Venue and location from surrounding content

### Strategy 2: Venue Links
```javascript
$("a[onclick*='VenueStats.aspx']")
```

Used to identify and extract venue names from show listings.

### Common Patterns
- Date format: `MM.DD.YYYY` (e.g., "03.14.1991")
- Location format: "Venue Name, City, ST" or "Venue Name - City, ST, Country"
- Show links typically contain show date and venue information

## Usage

### Test First (Recommended)
Before running the full scraper, test with a sample of dates:

```bash
cd scraper
npm run test:history
```

This will:
- Scrape 5 test dates (New Year's Day, March 14, July 4, Aug 27, New Year's Eve)
- Display HTML structure analysis
- Validate parsing logic
- Save debug HTML if parsing fails

### Run Full Scraper

```bash
cd scraper
npm run scrape:history
```

This will:
- Scrape all 366 calendar days (Jan 1 - Dec 31, including Feb 29)
- Use rate limiting (5 requests per 10 seconds)
- Cache HTML responses to avoid re-fetching
- Save checkpoints every 20 days
- Resume from last checkpoint if interrupted
- Output to `scraper/output/history.json`

**Estimated Time:** ~20-25 minutes for 366 days with rate limiting

## Rate Limiting

The scraper uses **respectful rate limiting**:

- Concurrency: **1** (sequential requests only)
- Rate: **5 requests per 10 seconds** (max 30 per minute)
- Delay: **2-4 seconds** random delay between requests
- Checkpoints: Every 20 days processed

## Caching

HTML responses are cached in `scraper/cache/` using URL-based filenames. Cached pages are reused on subsequent runs to avoid redundant requests.

To clear cache:
```bash
rm -rf scraper/cache/www_dmbalmanac_com_ThisDayinHistory_aspx*.html
```

## Checkpointing

Progress is saved every 20 days to `scraper/cache/checkpoint_history.json`.

**Checkpoint structure:**
```json
{
  "completedDays": ["01-01", "01-02", ...],
  "days": [...]
}
```

If the scraper is interrupted, it will resume from the last checkpoint.

To restart from scratch:
```bash
rm scraper/cache/checkpoint_history.json
```

## Output Format

**File:** `scraper/output/history.json`

```json
{
  "scrapedAt": "2026-01-15T12:00:00.000Z",
  "source": "https://www.dmbalmanac.com/ThisDayinHistory.aspx",
  "totalItems": 366,
  "days": [
    {
      "month": 1,
      "day": 1,
      "calendarDate": "01-01",
      "shows": [
        {
          "originalId": "12345",
          "showDate": "1999-01-01",
          "year": 1999,
          "venueName": "New Year's Arena",
          "city": "Charlotte",
          "state": "NC",
          "country": "USA",
          "notes": null
        }
      ],
      "totalYears": 5,
      "firstYear": 1996,
      "lastYear": 2024,
      "yearsSinceLastPlayed": 2
    }
  ]
}
```

## Integration with Database

### Option 1: Computed on Demand
No database table needed. Query shows by calendar date:

```sql
SELECT * FROM shows
WHERE strftime('%m-%d', date) = '01-01'
ORDER BY date;
```

### Option 2: Pre-computed Table
Create a `calendar_history` table for fast lookups:

```sql
CREATE TABLE calendar_history (
  id INTEGER PRIMARY KEY,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  calendar_date TEXT NOT NULL UNIQUE, -- 'MM-DD'
  total_years INTEGER DEFAULT 0,
  first_year INTEGER,
  last_year INTEGER,
  years_since_last_played INTEGER
);

CREATE TABLE calendar_history_shows (
  id INTEGER PRIMARY KEY,
  calendar_history_id INTEGER NOT NULL,
  show_id INTEGER NOT NULL,
  FOREIGN KEY (calendar_history_id) REFERENCES calendar_history(id),
  FOREIGN KEY (show_id) REFERENCES shows(id)
);
```

## App Integration Example

**Route:** `/app/history/[month]/[day]/page.tsx`

```typescript
import { getShowsByCalendarDate } from '@/lib/db/queries';

export default async function HistoryDayPage({
  params
}: {
  params: { month: string; day: string }
}) {
  const month = parseInt(params.month);
  const day = parseInt(params.day);

  const shows = await getShowsByCalendarDate(month, day);
  const years = [...new Set(shows.map(s => s.year))];

  return (
    <div>
      <h1>This Day in History: {month}/{day}</h1>
      <p>DMB has played {shows.length} shows on this date across {years.length} years.</p>

      {shows.map(show => (
        <div key={show.id}>
          <h2>{show.date} - {show.venue.name}</h2>
          <p>{show.venue.city}, {show.venue.state}</p>
        </div>
      ))}
    </div>
  );
}
```

## Data Quality Notes

### Known Issues
1. **Missing Location Data**: Some older shows may have incomplete city/state information
2. **Date Parsing**: Date formats vary; parser uses multiple strategies
3. **Duplicate Detection**: Uses show ID to prevent duplicates

### Validation
- Show IDs should match existing show database
- Dates should be valid (no Feb 30, etc.)
- Each calendar date should have 0-N shows (some dates may have no shows)

## Troubleshooting

### No Shows Parsed
If the test scraper finds show links but can't parse show data:

1. Check `scraper/output/debug-history-page.html` for HTML structure
2. Verify selectors match the actual HTML
3. Update parsing logic in `history.ts` if needed

### Rate Limit Errors
If you see 429 or 503 errors:

1. Increase delay in rate limiter
2. Reduce `intervalCap` (currently 5 per 10 seconds)
3. Wait before retrying

### Checkpoint Corruption
If checkpoint is corrupted:

```bash
rm scraper/cache/checkpoint_history.json
npm run scrape:history
```

## Statistics & Insights

Once scraped, you can analyze:

- **Most Common Show Dates**: Which calendar dates have the most shows?
- **Rare Dates**: Which dates has DMB never played?
- **Anniversary Tracking**: Automatically detect anniversary shows (e.g., 10-year, 20-year)
- **Seasonal Patterns**: Which months/seasons does DMB tour most?

Example analysis:
```typescript
const historyData = JSON.parse(fs.readFileSync('history.json', 'utf-8'));

// Days with most shows
const sorted = historyData.days
  .filter(d => d.shows.length > 0)
  .sort((a, b) => b.shows.length - a.shows.length);

console.log("Top 10 most common show dates:");
sorted.slice(0, 10).forEach((day, i) => {
  console.log(`${i + 1}. ${day.month}/${day.day}: ${day.shows.length} shows`);
});

// Never-played dates
const neverPlayed = historyData.days.filter(d => d.shows.length === 0);
console.log(`\nDMB has never played on ${neverPlayed.length} calendar dates`);
```

## File Locations

- **Scraper:** `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/history.ts`
- **Test:** `/Users/louisherman/Documents/dmb-almanac/scraper/src/test-history-scraper.ts`
- **Types:** `/Users/louisherman/Documents/dmb-almanac/scraper/src/types.ts` (HistoryDay, HistoryDayShow, HistoryOutput)
- **Output:** `/Users/louisherman/Documents/dmb-almanac/scraper/output/history.json`
- **Cache:** `/Users/louisherman/Documents/dmb-almanac/scraper/cache/`
- **Checkpoint:** `/Users/louisherman/Documents/dmb-almanac/scraper/cache/checkpoint_history.json`

## Dependencies

- `playwright`: Browser automation for fetching pages
- `cheerio`: HTML parsing and selector queries
- `p-queue`: Rate limiting and concurrency control
- Existing utilities: `cache.ts`, `rate-limit.ts`, `helpers.ts`

## Contributing

When modifying the scraper:

1. Test with `npm run test:history` first
2. Verify HTML structure hasn't changed on dmbalmanac.com
3. Update selectors if needed
4. Maintain rate limiting to be respectful
5. Document any changes to output format
