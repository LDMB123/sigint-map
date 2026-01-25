# Enhanced Song Statistics Scraper

## Quick Start

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper

# 1. Ensure you have song IDs (run songs scraper if needed)
npm run scrape:songs

# 2. Run the enhanced statistics scraper
npm run scrape:song-stats

# 3. View results
cat output/song-stats.json | jq '.stats[0]'
```

## What Was Built

This enhancement adds comprehensive statistical analysis for every DMB song by scraping detailed data from SongStats.aspx pages on dmbalmanac.com.

### Files Created

1. **`src/scrapers/song-stats.ts`** (19KB)
   - Main scraper implementation
   - 8 specialized parsing functions
   - Rate limiting, caching, checkpointing
   - 600+ lines of production-ready code

2. **`src/types.ts`** (updated)
   - Added `SongStatistics` interface
   - Added `SongStatsOutput` interface
   - 100+ lines of TypeScript definitions

3. **`package.json`** (updated)
   - Added `scrape:song-stats` script

4. **`SONG_STATS_SCRAPER.md`** (10KB)
   - Complete usage documentation
   - Database schema examples
   - Analytics use cases

5. **`IMPLEMENTATION_SUMMARY.md`** (10KB)
   - Technical implementation details
   - Architecture overview
   - Testing guidelines

## What It Captures

### 40+ Data Points Per Song

**Position Analysis** (7 metrics)
- Opener, Set 1 Closer, Set 2 Opener, Closer, Midset, Encore, Encore 2 counts

**Version Types** (6 metrics)
- Full, Tease, Partial, Reprise, Fake, Aborted performance counts

**Duration Statistics** (3 metrics)
- Average length, Longest version (with details), Shortest version (with details)

**Segue Analysis**
- Top 10 songs this song transitions into (with frequency)
- Placeholder for "preceded by" analysis

**Release Information** (7 metrics)
- Total releases, Studio, Live, DMB Live, Warehouse, Live Trax, Broadcasts

**Temporal Data**
- Plays per year (1991-2026)
- First played, Last played, Years active
- Current gap (days and shows since last played)

**Artist Breakdown**
- Dave Matthews Band vs Dave & Tim statistics
- Play counts and percentages for each configuration

**Liberation History**
- Tracks when songs return after long absences
- Gap tracking (days and shows)

## Example Output

```json
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
  "topSeguesInto": [
    { "songTitle": "Tripping Billies", "songId": "45", "count": 87 }
  ],
  "releaseCounts": {
    "total": 15,
    "studio": 1,
    "live": 8,
    "broadcasts": 42
  },
  "playsByYear": [
    { "year": 1991, "plays": 12 },
    { "year": 2025, "plays": 18 }
  ],
  "totalPlays": 686,
  "firstPlayedDate": "03/14/1991",
  "lastPlayedDate": "12/15/2025",
  "yearsActive": 35
}
```

## Performance

- **Speed**: 5 requests per 10 seconds (respectful rate limiting)
- **Duration**: ~35-45 minutes for all 1,100+ songs
- **Resumable**: Auto-saves checkpoint every 50 songs
- **Cache-friendly**: Re-runs complete instantly using cached HTML

## Key Features

1. **Rate Limited**: Never overloads dmbalmanac.com servers
2. **Cached**: HTML responses stored locally to avoid re-fetching
3. **Checkpointed**: Progress saved every 50 songs
4. **Resumable**: Continue from where you left off after interruption
5. **Error Tolerant**: Logs errors but continues processing
6. **Defensive Parsing**: Handles missing/malformed data gracefully

## Use Cases

### Analytics
- Which songs work best as show openers?
- What are the most common song transitions?
- Which songs are overdue for a comeback?
- How has song frequency changed over time?

### Setlist Building
- Suggest probable next songs based on segue patterns
- Find songs that haven't been played recently
- Identify songs that work well in specific positions

### Historical Analysis
- Track song popularity trends
- Identify liberation patterns
- Compare DMB vs Dave & Tim preferences

### Database Integration
- Extend the `songs` table with rich statistics
- Create specialized statistics tables
- Build analytics dashboards

## Documentation

- **Usage Guide**: See `SONG_STATS_SCRAPER.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **Database Schemas**: Examples in both documents
- **Code Documentation**: Inline comments in `song-stats.ts`

## Commands

```bash
# Full scrape (all songs)
npm run scrape:song-stats

# Resume interrupted scrape
npm run scrape:song-stats  # Automatically resumes from checkpoint

# Clear cache and re-scrape
rm -rf cache/ output/song-stats.json
npm run scrape:song-stats

# View output
cat output/song-stats.json | jq '.totalItems'
cat output/song-stats.json | jq '.stats[] | select(.title == "Ants Marching")'

# Check progress (during run)
cat cache/checkpoint_song-stats.json | jq '.completedIds | length'
```

## Integration Steps

### 1. Run the Scraper
```bash
npm run scrape:song-stats
```

### 2. Create Database Tables
```sql
CREATE TABLE song_statistics (
  id INTEGER PRIMARY KEY,
  song_id INTEGER REFERENCES songs(id),
  opener_count INTEGER DEFAULT 0,
  set1_closer_count INTEGER DEFAULT 0,
  closer_count INTEGER DEFAULT 0,
  encore_count INTEGER DEFAULT 0,
  full_count INTEGER DEFAULT 0,
  tease_count INTEGER DEFAULT 0,
  avg_length_seconds INTEGER,
  total_plays INTEGER,
  years_active INTEGER,
  first_played_date TEXT,
  last_played_date TEXT
);

CREATE TABLE song_statistics_json (
  song_id INTEGER PRIMARY KEY REFERENCES songs(id),
  slot_breakdown JSON,
  version_types JSON,
  segues_into JSON,
  plays_by_year JSON,
  artist_stats JSON,
  liberations JSON,
  release_counts JSON
);
```

### 3. Import Data
```typescript
import songStats from './output/song-stats.json';

for (const stat of songStats.stats) {
  // Insert into song_statistics and song_statistics_json
  // Match on stat.originalId to existing songs.original_id
}
```

### 4. Query Examples
```sql
-- Top 10 most-played songs
SELECT s.title, st.total_plays
FROM songs s
JOIN song_statistics st ON st.song_id = s.id
ORDER BY st.total_plays DESC
LIMIT 10;

-- Best show openers
SELECT s.title, st.opener_count
FROM songs s
JOIN song_statistics st ON st.song_id = s.id
WHERE st.opener_count > 0
ORDER BY st.opener_count DESC
LIMIT 10;

-- Songs with long gaps
SELECT s.title,
       json_extract(st.slot_breakdown, '$.currentGap.days') as gap_days
FROM songs s
JOIN song_statistics_json st ON st.song_id = s.id
WHERE gap_days > 365
ORDER BY gap_days DESC;
```

## Technical Details

### Dependencies
- **Playwright**: Browser automation for HTML fetching
- **Cheerio**: HTML parsing and DOM traversal
- **p-queue**: Rate limiting and request throttling
- All existing utils: cache, rate-limit, helpers

### Architecture
- **Modular parsing**: 8 specialized functions for different data types
- **Defensive coding**: Handles missing/malformed data without crashing
- **Efficient caching**: Stores HTML to minimize network requests
- **Progress tracking**: Checkpoints enable interruption recovery

### Parsing Strategies
1. **Regex extraction**: Pattern matching in text content
2. **Table parsing**: Structured data from HTML tables
3. **CSS class detection**: Identifies elements by class names
4. **Link analysis**: Extracts IDs from hrefs
5. **SQL comment mining**: Parses database queries in HTML comments

## Maintenance

When dmbalmanac.com updates their site structure:

1. Open a sample SongStats.aspx page in browser
2. Inspect HTML structure for changes
3. Update parsing functions in `song-stats.ts`
4. Test with single song: filter to `songs.slice(0, 1)`
5. Run full scrape after validation

## Support

**Questions?**
- Check console output for errors
- Review cached HTML files in `cache/` directory
- Examine checkpoint file for progress tracking
- Test with single song to isolate issues

**Need Help?**
- See detailed documentation in `SONG_STATS_SCRAPER.md`
- Review implementation notes in `IMPLEMENTATION_SUMMARY.md`
- Check inline code comments in `src/scrapers/song-stats.ts`

## Status

✅ **Implementation Complete**
✅ **Documentation Complete**
✅ **Ready for Production Use**

Run `npm run scrape:song-stats` to get started!

---

**Created**: 2026-01-15
**Version**: 1.0.0
**Maintainer**: DMB Almanac Scraper Project
