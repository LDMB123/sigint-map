# Song Statistics Scraper

## Overview

The `song-stats.ts` scraper extracts detailed statistics from DMBAlmanac.com SongStats.aspx pages, capturing data that goes far beyond the basic song information scraped by `songs.ts`.

## What It Captures

### 1. Slot Breakdown
- **Opener**: Count of times song opened a show
- **Set 1 Closer**: Times it closed the first set
- **Set 2 Opener**: Times it opened the second set
- **Closer**: Times it closed the show
- **Midset**: Times it appeared mid-set
- **Encore**: Encore appearances
- **Encore 2**: Second encore appearances

### 2. Version Types
- **Full**: Complete performances
- **Tease**: Brief teases during other songs
- **Partial**: Incomplete performances
- **Reprise**: Reprised versions
- **Fake**: Fake starts/endings
- **Aborted**: Abandoned performances

### 3. Duration Statistics
- **Average Length**: Mean duration across all performances
- **Longest Version**: Duration, date, show ID, and venue
- **Shortest Version**: Duration, date, show ID, and venue

### 4. Segue Analysis
- **Top Segues Into**: Most common songs this song transitions into
- **Top Segues From**: Songs that typically precede this one (if available)
  - Each includes song title, song ID, and frequency count

### 5. Release Information
- **Total Releases**: Overall count
- **Studio**: Studio album appearances
- **Live**: Live album releases
- **DMB Live**: DMB Live series
- **Warehouse**: Warehouse exclusive releases
- **Live Trax**: Live Trax series
- **Broadcasts**: Radio/web broadcast appearances

### 6. Temporal Data
- **Plays by Year**: Year-by-year breakdown of performances
- **Years Active**: Total years the song has been in rotation
- **First Played**: Date of debut performance
- **Last Played**: Most recent performance
- **Current Gap**: Days and shows since last played

### 7. Artist-Specific Statistics
- **Dave Matthews Band**: Full band performances
- **Dave & Tim**: Acoustic duo performances
- **Play count and percentage** for each configuration

### 8. Liberation History
- Tracks "liberation" events (when a song returns after long absences)
- **Last Played**: Date and show ID
- **Days Since**: Gap in days
- **Shows Since**: Gap in shows
- **Liberation**: Date and show ID when song returned

## Usage

### Prerequisites

1. Run the basic songs scraper first to generate song IDs:
   ```bash
   npm run scrape:songs
   ```

2. This creates `/scraper/output/song-details.json` or `/scraper/output/all-song-ids.json`

### Running the Scraper

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper
npm run scrape:song-stats
```

### Output

Creates `/scraper/output/song-stats.json` with structure:

```json
{
  "scrapedAt": "2026-01-15T20:00:00.000Z",
  "source": "https://www.dmbalmanac.com/SongStats.aspx",
  "totalItems": 1103,
  "stats": [
    {
      "originalId": "1",
      "title": "Ants Marching",
      "slotBreakdown": {
        "opener": 5,
        "set1Closer": 142,
        "set2Opener": 8,
        "closer": 87,
        "midset": 432,
        "encore": 12,
        "encore2": 0
      },
      "versionTypes": {
        "full": 686,
        "tease": 3,
        "partial": 1,
        "reprise": 0,
        "fake": 0,
        "aborted": 2
      },
      "avgLengthSeconds": 285,
      "longestVersion": {
        "durationSeconds": 425,
        "date": "07/12/1998",
        "showId": "453",
        "venue": "Red Rocks Amphitheatre"
      },
      "shortestVersion": {
        "durationSeconds": 198,
        "date": "03/14/1991",
        "showId": "1",
        "venue": "Trax"
      },
      "topSeguesInto": [
        { "songTitle": "Tripping Billies", "songId": "45", "count": 87 },
        { "songTitle": "Warehouse", "songId": "62", "count": 52 }
      ],
      "topSeguesFrom": [],
      "releaseCounts": {
        "total": 15,
        "studio": 1,
        "live": 8,
        "dmblive": 3,
        "warehouse": 2,
        "liveTrax": 6,
        "broadcasts": 42
      },
      "playsByYear": [
        { "year": 1991, "plays": 12 },
        { "year": 1992, "plays": 45 }
      ],
      "artistStats": [
        {
          "artistName": "Dave Matthews Band",
          "playCount": 680,
          "avgLength": 287,
          "percentOfTotal": 99.1
        },
        {
          "artistName": "Dave & Tim",
          "playCount": 6,
          "avgLength": 245,
          "percentOfTotal": 0.9
        }
      ],
      "liberations": [
        {
          "lastPlayedDate": "08/15/2010",
          "lastPlayedShowId": "2543",
          "daysSince": 452,
          "showsSince": 89,
          "liberationDate": "11/10/2011",
          "liberationShowId": "2632"
        }
      ],
      "totalPlays": 686,
      "firstPlayedDate": "03/14/1991",
      "lastPlayedDate": "12/15/2025",
      "yearsActive": 35,
      "currentGap": {
        "days": 31,
        "shows": 0
      }
    }
  ]
}
```

## Features

### Rate Limiting
- **5 requests per 10 seconds** (respectful to dmbalmanac.com)
- Sequential processing (concurrency: 1)
- 2-4 second random delay between requests
- Total estimated time: ~30-45 minutes for 1,100 songs

### Caching
- Uses existing `cache.ts` utility
- Caches HTML pages to avoid re-fetching
- Speeds up development and re-runs

### Checkpointing
- Saves progress every 50 songs
- Resumes from checkpoint if interrupted
- Checkpoint file: `/scraper/cache/checkpoint_song-stats.json`

### Error Handling
- Logs errors but continues processing other songs
- Defensive parsing handles missing/malformed data
- Returns null values when data unavailable

## Data Usage

### Database Integration

The `SongStatistics` type can be stored in:

1. **Extended `songs` table** (add columns for each stat)
2. **Separate `song_statistics` table** (recommended for cleaner schema)
3. **JSON column** in songs table (if using PostgreSQL/SQLite JSON support)

Example schema for separate table:

```sql
CREATE TABLE song_statistics (
  id INTEGER PRIMARY KEY,
  song_id INTEGER REFERENCES songs(id),

  -- Slot breakdown
  opener_count INTEGER DEFAULT 0,
  set1_closer_count INTEGER DEFAULT 0,
  set2_opener_count INTEGER DEFAULT 0,
  closer_count INTEGER DEFAULT 0,
  midset_count INTEGER DEFAULT 0,
  encore_count INTEGER DEFAULT 0,
  encore2_count INTEGER DEFAULT 0,

  -- Version types
  full_count INTEGER DEFAULT 0,
  tease_count INTEGER DEFAULT 0,
  partial_count INTEGER DEFAULT 0,
  reprise_count INTEGER DEFAULT 0,
  fake_count INTEGER DEFAULT 0,
  aborted_count INTEGER DEFAULT 0,

  -- Duration
  avg_length_seconds INTEGER,
  longest_duration INTEGER,
  longest_show_id INTEGER,
  shortest_duration INTEGER,
  shortest_show_id INTEGER,

  -- Releases
  total_releases INTEGER DEFAULT 0,
  studio_releases INTEGER DEFAULT 0,
  live_releases INTEGER DEFAULT 0,
  broadcasts INTEGER DEFAULT 0,

  -- Metadata
  years_active INTEGER DEFAULT 0,
  current_gap_days INTEGER,
  current_gap_shows INTEGER,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store complex nested data as JSON
CREATE TABLE song_statistics_json (
  song_id INTEGER PRIMARY KEY REFERENCES songs(id),
  segues_into JSON,
  plays_by_year JSON,
  artist_stats JSON,
  liberations JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Analytics Use Cases

1. **Song Position Analysis**: Which songs work best as openers/closers?
2. **Setlist Builder**: Suggest segues based on historical patterns
3. **Rarity Tracking**: Identify songs with long gaps/low play counts
4. **Version Analysis**: Find songs with many teases/partials
5. **Release Coverage**: Identify songs overrepresented/underrepresented on releases
6. **Temporal Trends**: Track songs gaining/losing popularity over time

## Parsing Strategy

The scraper uses multiple parsing techniques:

1. **Regex Extraction**: Pulls counts from text patterns
2. **Table Parsing**: Extracts structured data from HTML tables
3. **CSS Class Detection**: Uses `.opener`, `.encore`, etc. classes
4. **SQL Comment Mining**: Parses SQL queries in HTML comments
5. **Link Analysis**: Follows show/song links for IDs

### Known Limitations

- **Longest/Shortest parsing**: May not capture all versions if HTML structure varies
- **Segue parsing**: Depends on specific table headers being present
- **Plays by year**: May miss years if table format differs
- **Release counts**: Specific release types may not parse correctly if labeled differently

## Future Enhancements

Potential additions:

1. **Segues From**: Parse "preceded by" sections
2. **Guest Statistics**: Which guests appear most with this song
3. **Venue Affinity**: Songs that appear more at certain venues
4. **Tour Statistics**: Per-tour play counts
5. **Transition Probability**: Calculate segue probability matrix
6. **Gap Prediction**: Machine learning model for liberation prediction

## Maintenance

When DMBAlmanac.com updates their HTML structure:

1. Update CSS selectors in parsing functions
2. Adjust regex patterns for text extraction
3. Add new fields to `SongStatistics` interface
4. Update this documentation

## Support

For issues or questions:
- Check `/scraper/cache/checkpoint_song-stats.json` for progress
- Review console output for parsing errors
- Examine cached HTML files in `/scraper/cache/` for structure
- Test with single song first: modify script to filter `songs.slice(0, 1)`

## Example Query After Import

```sql
-- Find most common song openers
SELECT title, opener_count
FROM songs s
JOIN song_statistics st ON st.song_id = s.id
WHERE opener_count > 0
ORDER BY opener_count DESC
LIMIT 10;

-- Find songs with longest average duration
SELECT title, avg_length_seconds / 60 as avg_minutes
FROM songs s
JOIN song_statistics st ON st.song_id = s.id
WHERE avg_length_seconds IS NOT NULL
ORDER BY avg_length_seconds DESC
LIMIT 10;

-- Find top segue pairs
SELECT
  s1.title as song,
  s2.title as follows,
  json_extract(segues_into, '$.count') as frequency
FROM song_statistics_json ss
JOIN songs s1 ON s1.id = ss.song_id
JOIN songs s2 ON s2.original_id = json_extract(segues_into, '$.songId')
ORDER BY frequency DESC
LIMIT 20;
```
