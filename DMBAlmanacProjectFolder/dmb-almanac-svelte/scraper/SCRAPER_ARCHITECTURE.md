# Scraper Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DMBAlmanac.com                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Shows   │  │  Songs   │  │  Venues  │  │ Releases │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└───────┬───────────────┬───────────────┬───────────────┬────┘
        │               │               │               │
        │ Playwright    │ Cheerio       │ Rate Limit    │
        │ + Cheerio     │ + Cache       │ + Checkpoint  │
        │               │               │               │
┌───────▼───────────────▼───────────────▼───────────────▼────┐
│              Scraper Layer (TypeScript)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ shows.ts │  │ songs.ts │  │venues.ts │  │releases.ts│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼─────────────┼─────────┘
        │             │             │             │
        │ Validates   │ Normalizes  │ Slugifies   │ Matches
        │ Dedupes     │ Parses      │ Enriches    │ Links
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼─────────┐
│                  Output JSON Files                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │shows.json│  │songs.json│  │venues.json│ │releases  │  │
│  │(1500+)   │  │(500+)    │  │(400+)    │  │.json     │  │
│  │          │  │          │  │          │  │(40+)     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼─────────────┼─────────┘
        │             │             │             │
        │ Upsert      │ Link        │ Reference   │ Foreign
        │ Transform   │ Calculate   │ Aggregate   │ Keys
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼─────────┐
│              import-data.ts (ETL Layer)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. importVenues() → venues table                    │  │
│  │  2. importSongs() → songs table                      │  │
│  │  3. importGuests() → guests table                    │  │
│  │  4. importTours() → tours table                      │  │
│  │  5. importShows() → shows + setlist_entries         │  │
│  │  6. importReleases() → releases + release_tracks     │  │
│  │  7. updateCounts() → aggregate statistics           │  │
│  └──────────────────────────────────────────────────────┘  │
└───────┬─────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│              SQLite Database (dmb-almanac.db)                 │
│                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ venues  │  │  songs  │  │  tours  │  │ guests  │        │
│  │  (400+) │  │  (500+) │  │   (35)  │  │  (100+) │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │               │
│       │            │            │            │               │
│  ┌────▼────────────▼────────────▼────┐  ┌───▼──────────┐   │
│  │          shows (1500+)            │  │guest_appear- │   │
│  │  • date, venue_id, tour_id        │  │ances (5000+) │   │
│  └────┬──────────────────────────────┘  └──────────────┘   │
│       │                                                      │
│  ┌────▼──────────────────────────────┐  ┌──────────────┐   │
│  │  setlist_entries (25000+)         │  │  releases    │   │
│  │  • show_id, song_id, position     │  │   (40+)      │   │
│  │  • set, slot, duration            │  └────┬─────────┘   │
│  └───────────────────────────────────┘       │              │
│                                          ┌────▼─────────┐   │
│                                          │release_tracks│   │
│                                          │   (400+)     │   │
│                                          └──────────────┘   │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│           Next.js Web Application (dmb-almanac)               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │/shows     │  │/songs     │  │/venues    │  │/releases │ │
│  │[slug]     │  │[slug]     │  │[slug]     │  │[slug]    │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    1. SCRAPING PHASE                         │
└─────────────────────────────────────────────────────────────┘

DMBAlmanac.com
     │
     ├─→ DiscographyList.aspx
     │        │
     │        ├─→ Extract release IDs (1, 2, 3, ...)
     │        │
     │        └─→ Build URLs:
     │              • ReleaseView.aspx?release=1
     │              • ReleaseView.aspx?release=2
     │              • ...
     │
     └─→ ReleaseView.aspx?release={ID}
              │
              ├─→ Parse title
              ├─→ Parse release type
              ├─→ Parse release date
              ├─→ Parse cover art URL
              └─→ Parse track listing:
                    • Track number
                    • Disc number
                    • Song title
                    • Duration
                    • Show date (for live)

                    ↓
         ┌──────────────────────┐
         │  releases.json       │
         │  {                   │
         │    releases: [       │
         │      {               │
         │        originalId,   │
         │        title,        │
         │        releaseType,  │
         │        tracks: []    │
         │      }               │
         │    ]                 │
         │  }                   │
         └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    2. IMPORT PHASE                           │
└─────────────────────────────────────────────────────────────┘

releases.json
     │
     ├─→ Validate release types (studio, live, etc.)
     │
     ├─→ Slugify titles (under-the-table-and-dreaming)
     │
     ├─→ Match song titles to songs table
     │        │
     │        ├─→ Found: Insert track with song_id
     │        └─→ Not found: Skip with warning
     │
     └─→ Parse durations (4:17 → 257 seconds)

            ↓
   ┌─────────────────┐
   │  releases table │
   │  • id           │
   │  • title        │
   │  • slug         │
   │  • release_type │
   │  • release_date │
   └─────────────────┘
            │
            ├─→ release_id
            │
   ┌─────────────────┐
   │ release_tracks  │
   │ • release_id    │
   │ • song_id       │
   │ • track_number  │
   │ • disc_number   │
   │ • duration_sec  │
   └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    3. QUERY PHASE                            │
└─────────────────────────────────────────────────────────────┘

Web App Request: /releases/under-the-table-and-dreaming
     │
     ├─→ Query releases by slug
     │
     ├─→ JOIN release_tracks
     │
     ├─→ JOIN songs (get titles)
     │
     └─→ ORDER BY disc_number, track_number

            ↓
   ┌─────────────────┐
   │  Release Page   │
   │  • Cover art    │
   │  • Metadata     │
   │  • Track list   │
   │  • Links to     │
   │    songs        │
   └─────────────────┘
```

## Component Responsibilities

### Scraper Layer

#### `releases.ts`
**Purpose**: Extract release data from DMBAlmanac.com

**Responsibilities**:
- Fetch discography list
- Extract release IDs and URLs
- Parse release detail pages
- Handle multiple HTML patterns
- Extract track listings
- Cache HTML responses
- Checkpoint progress

**Dependencies**:
- Playwright (browser automation)
- Cheerio (HTML parsing)
- p-queue (rate limiting)
- Cache utilities
- Helper functions

**Output**: `output/releases.json`

### ETL Layer

#### `import-data.ts` (importReleases function)
**Purpose**: Transform and load release data into database

**Responsibilities**:
- Read `releases.json`
- Validate release types
- Match tracks to songs
- Parse durations
- Insert releases
- Insert release tracks
- Handle errors gracefully

**Dependencies**:
- better-sqlite3 (database)
- Song mapping (from prior import)
- Helper functions

**Output**: Populated `releases` and `release_tracks` tables

### Database Layer

#### `releases` table
**Purpose**: Store release metadata

**Fields**:
- `id`: Primary key
- `title`: Release name
- `slug`: URL-friendly identifier
- `release_type`: Enum (studio, live, etc.)
- `release_date`: Release date
- `cover_art_url`: Cover image URL
- `notes`: Additional information

#### `release_tracks` table
**Purpose**: Store track listings

**Fields**:
- `id`: Primary key
- `release_id`: Foreign key to releases
- `song_id`: Foreign key to songs
- `track_number`: Position on disc
- `disc_number`: Disc number
- `duration_seconds`: Track length
- `show_id`: Source show (for live tracks)
- `notes`: Track-specific notes

### Web Layer

#### `/releases` pages (future)
**Purpose**: Display releases to users

**Features**:
- Browse all releases
- Filter by type
- Sort by date
- View track listings
- Link to songs
- Show cover art

## Utility Functions

### Rate Limiting
```typescript
createRateLimiter()
  ├─→ concurrency: 2
  ├─→ intervalCap: 5
  └─→ interval: 10000ms

delay(ms)
randomDelay(min, max)
```

### Caching
```typescript
getCachedHtml(url)
  ├─→ Check cache directory
  └─→ Return cached HTML or null

cacheHtml(url, html)
  ├─→ Sanitize URL to filename
  └─→ Write to cache directory
```

### Checkpointing
```typescript
loadCheckpoint(name)
  ├─→ Read checkpoint file
  └─→ Return saved state or null

saveCheckpoint(name, data)
  ├─→ Write checkpoint file
  └─→ Log progress
```

### Parsing Helpers
```typescript
parseDate(dateStr)
  ├─→ Handle multiple formats
  └─→ Return ISO date string

parseDuration(duration)
  ├─→ Parse "M:SS" format
  └─→ Return seconds

slugify(text)
  ├─→ Lowercase
  ├─→ Remove special chars
  └─→ Replace spaces with hyphens

normalizeWhitespace(text)
  ├─→ Collapse multiple spaces
  └─→ Trim edges
```

## Error Handling Strategy

### Scraper Errors
```
Network Error
  ↓
Retry (3 attempts)
  ↓
Exponential backoff
  ↓
Log failure
  ↓
Continue to next release
```

### Import Errors
```
Song not found
  ↓
Log warning
  ↓
Skip track
  ↓
Continue to next track
```

### Validation Errors
```
Invalid release type
  ↓
Default to "studio"
  ↓
Log normalization
  ↓
Continue with safe value
```

## Performance Characteristics

### Scraping
- **Rate**: ~5-6 releases/minute (rate limited)
- **Total Time**: ~8-10 minutes for 45 releases
- **Network**: ~2-3 MB total data
- **Cache**: ~5-10 MB HTML cache

### Import
- **Rate**: ~1000 tracks/second
- **Total Time**: <1 second for 400 tracks
- **Memory**: <50 MB
- **Transactions**: Fully transactional

## File Structure

```
dmb-almanac/
├── scraper/
│   ├── src/
│   │   ├── scrapers/
│   │   │   └── releases.ts          ← Main scraper
│   │   ├── utils/
│   │   │   ├── cache.ts             ← Caching utilities
│   │   │   ├── rate-limit.ts        ← Rate limiting
│   │   │   └── helpers.ts           ← Parsing helpers
│   │   ├── types.ts                 ← TypeScript interfaces
│   │   └── test-releases-scraper.ts ← Test script
│   ├── output/
│   │   └── releases.json            ← Scraped data
│   ├── cache/
│   │   ├── *.html                   ← Cached pages
│   │   └── checkpoint_releases.json ← Progress
│   ├── package.json                 ← NPM scripts
│   └── RELEASES_SCRAPER.md          ← Documentation
├── scripts/
│   └── import-data.ts               ← ETL script
├── lib/
│   └── db/
│       └── schema.sql               ← Database schema
└── data/
    └── dmb-almanac.db               ← SQLite database
```

## Integration Points

### 1. Scraper → Output
```typescript
scrapeAllReleases()
  ↓
saveReleases(releases)
  ↓
output/releases.json
```

### 2. Output → Database
```typescript
importReleases(songMap)
  ↓
INSERT INTO releases
  ↓
INSERT INTO release_tracks
```

### 3. Database → Web App
```typescript
getRelease(slug)
  ↓
JOIN release_tracks
  ↓
JOIN songs
  ↓
Return release data
```

## Best Practices Implemented

1. **Ethical Scraping**
   - Rate limiting (30 req/min max)
   - User agent identification
   - Caching to avoid redundant requests

2. **Resilient Parsing**
   - Multiple HTML patterns
   - Graceful degradation
   - Defensive null checks

3. **Data Integrity**
   - Foreign key constraints
   - Type validation
   - Transaction safety

4. **Developer Experience**
   - Clear error messages
   - Progress logging
   - Resumable operations
   - Comprehensive documentation

5. **Performance**
   - Concurrent requests (2x)
   - Efficient caching
   - Batch database inserts
   - Transaction batching

## Monitoring & Debugging

### Scraper Logs
```
Fetching release URLs from discography list...
Found 45 releases
33 releases remaining to scrape
  [1/33] Under the Table and Dreaming (13 tracks)
  [2/33] Crash (12 tracks)
Checkpoint saved: 10 releases completed
```

### Import Logs
```
Importing releases...
Warning: Song not found for track: "Bonus Track" on Deluxe Edition
Skipped 3 tracks with missing song references
Imported 45 releases with 397 tracks
```

### Database Verification
```sql
-- Count releases by type
SELECT release_type, COUNT(*) FROM releases GROUP BY release_type;

-- Check for orphaned tracks
SELECT COUNT(*) FROM release_tracks WHERE song_id NOT IN (SELECT id FROM songs);

-- Verify track ordering
SELECT * FROM release_tracks WHERE release_id = 1 ORDER BY disc_number, track_number;
```
