# Missing DMBAlmanac Scrapers - Technical Specification

**Document Version**: 1.0
**Date**: January 16, 2026
**Status**: Ready for Implementation

---

## Overview

This document provides detailed technical specifications for implementing the 5 highest-priority scrapers that are missing from the current dmbalmanac-v2 project.

---

## PRIORITY 1: Song Statistics Scraper

### Purpose
Extract comprehensive statistics for every song in the DMB catalog from individual SongStats pages.

### URL Pattern
```
https://dmbalmanac.com/SongStats.aspx?sid=XXX
```

### Data Fields to Extract

#### Basic Song Information
- Song title (heading)
- Composer name (if available)
- Year composed (if available)
- Is cover song (yes/no)
- Original artist (if cover)

#### Release Information
```json
{
  "studioAlbumAppearances": ["Album Name"],
  "liveAlbumAppearances": ["Album Name"],
  "compilationAppearances": ["Album Name"],
  "warehouseReleases": ["Release Name"],
  "liveTraxAppearances": ["Volume 1", "Volume 2"],
  "dmbLiveAppearances": ["Volume 1"],
  "bonusDiscAppearances": ["Album Name"]
}
```

#### Performance Statistics
- **Total plays**: Integer count
- **First performed**: Date (YYYY-MM-DD)
- **Last performed**: Date (YYYY-MM-DD)
- **Days since last play**: Integer
- **Shows since last play**: Integer
- **Plays by year**: Array of {year, count}
- **Total duration across all plays**: Seconds or formatted time

#### Position Statistics
```json
{
  "openerCount": 42,
  "closerCount": 35,
  "encoreCount": 28,
  "averagePosition": 5.2,
  "mostCommonSet": "set1",
  "setDistribution": {
    "set1": 120,
    "set2": 80,
    "encore": 45
  }
}
```

#### Performance Variations
```json
{
  "longestVersion": {
    "duration": "8:45",
    "date": "2019-06-15",
    "venue": "Gorge Amphitheatre",
    "city": "George, WA"
  },
  "shortestVersion": {
    "duration": "2:15",
    "date": "1998-10-03",
    "venue": "...",
    "city": "..."
  },
  "averageDuration": "5:23"
}
```

#### Segue Information
```json
{
  "seguesIntoSongs": [
    {
      "songTitle": "Ants Marching",
      "count": 15
    }
  ],
  "seguesFromSongs": [
    {
      "songTitle": "Two Step",
      "count": 8
    }
  ]
}
```

#### Liberation & Gap Data
```json
{
  "isLiberated": false,
  "liberationRecords": [
    {
      "gapSize": 247,  // shows
      "daysBetween": 1850,
      "startDate": "1996-10-05",
      "endDate": "1998-07-24"
    }
  ],
  "currentGapShows": 85,
  "currentGapDays": 650
}
```

### Database Operations

#### Update Song Record
```sql
UPDATE songs SET
  first_played = :firstPlayed,
  last_played = :lastPlayed,
  times_played = :totalPlays,
  opener_count = :openerCount,
  closer_count = :closerCount,
  encore_count = :encoreCount,
  avg_gap_days = :avgGapDays,
  original_artist = :originalArtist,
  is_cover = :isCover
WHERE slug = :songSlug
```

#### Create Song Statistics Record (Optional New Table)
```typescript
interface SongStatistics {
  songId: Int
  totalPlays: Int
  firstPlayed: Date
  lastPlayed: Date
  currentGapDays: Int
  currentGapShows: Int
  openerCount: Int
  closerCount: Int
  encoreCount: Int
  averageGapDays: Float
  averageDuration: Int (seconds)
  longestVersion: Int
  shortestVersion: Int
  mostCommonSet: String
  updatedAt: DateTime
}
```

### HTML Structure Notes
- Page uses heading tags for song title
- Paragraphs contain basic info
- Statistics in tables with specific class names
- Performance charts may use data attributes or inline script data
- Release information in formatted lists

### Edge Cases
- Some songs may have no release information
- Very new songs may have no "last played" yet
- Some songs may be marked as retired (no recent plays in 1000+ shows)
- Cover songs need special handling for original artist
- Songs with very few plays may have incomplete data

### Rate Limiting
- **Requirement**: 1 second minimum between requests
- **Estimated total time**: 30-45 minutes for ~200-300 unique songs
- **Requests needed**: 1 per song

### Implementation Notes
```typescript
// Need to:
// 1. Query existing songs to get list of SIDs
// 2. For each song, fetch SongStats.aspx?sid=SID
// 3. Parse statistics from HTML
// 4. Update song records with extracted data
// 5. Store detailed statistics if new table created

// Challenges:
// - Different songs may have different HTML structures
// - Statistics may be in different formats (charts, tables, text)
// - Release information format may vary
// - Some data may be hidden in JavaScript
```

---

## PRIORITY 2: Liberation List Scraper

### Purpose
Track songs by how long it's been since they were last performed (the "Liberation List").

### URL Pattern
```
https://dmbalmanac.com/SongsList.aspx  (inferred - may need to find actual URL)
or
https://dmbalmanac.com/Liberation.aspx (possible variation)
```

### Alternative Discovery
The liberation data is likely available on individual SongStats pages OR on a dedicated list page. May need to:
1. Check Lists.aspx for liberation-related lists
2. Search site for "liberation" references
3. Look for a dedicated Liberation page

### Data Fields to Extract

#### Per Song Entry
```json
{
  "songTitle": "String",
  "songSlug": "string-slug",
  "lastPlayed": "2024-06-15",
  "lastShowVenue": "Red Rocks Amphitheatre",
  "lastShowCity": "Denver, CO",
  "daysSinceLast": 180,
  "showsSinceLast": 45,
  "isLiberated": true,
  "liberationType": "50-Show Liberation",  // or "75-Show", "100-Show", etc.
  "liberationDate": "2024-09-01"  // When it was liberated
}
```

### Data Sorting Options
Page likely supports multiple sort orders:
- Days since last played (descending - most liberated first)
- Shows since last played (descending)
- Last played date (ascending)
- Song name (alphabetical)

### Database Operations

#### Create Liberation Entry
```sql
INSERT INTO liberation_list (
  song_id, last_played, last_show_id,
  days_since, shows_since,
  configuration, is_liberated, liberated_date
) VALUES (:songId, :lastPlayed, :lastShowId, :daysSince, :showsSince,
         :configuration, :isLiberated, :liberatedDate)
ON CONFLICT (song_id) DO UPDATE SET
  last_played = :lastPlayed,
  days_since = :daysSince,
  shows_since = :showsSince,
  is_liberated = :isLiberated,
  liberated_date = :liberatedDate,
  updated_at = NOW()
```

### Prisma Schema (Already Exists)
```prisma
model LiberationEntry {
  id            Int       @id @default(autoincrement())
  songId        Int       @unique @map("song_id")
  lastPlayed    DateTime? @map("last_played") @db.Date
  lastShowId    Int?      @map("last_show_id")
  daysSince     Int?      @map("days_since")
  showsSince    Int?      @map("shows_since")
  configuration String?   @db.VarChar(50)  // "50-Show", "100-Show", etc.
  isLiberated   Boolean   @default(false) @map("is_liberated")
  liberatedDate DateTime? @map("liberated_date") @db.Date
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  lastShow      Show?     @relation(fields: [lastShowId], references: [id])
  song          Song      @relation(fields: [songId], references: [id])

  @@map("liberation_list")
}
```

### Rate Limiting
- **Requirement**: 1-2 seconds between requests if fetching individual song pages
- **Estimated time**: < 5 minutes if scraping single list page, or 30-40 minutes if scraping per-song

### Implementation Strategy
Option A (Preferred - Single List Page):
1. Fetch liberation list page
2. Parse table of songs with gap data
3. Bulk upsert to database
4. Estimated time: < 5 minutes

Option B (Per-Song):
1. Query all songs
2. Fetch each SongStats page
3. Extract "days since" and "shows since"
4. Estimated time: 30-40 minutes

### Implementation Notes
```typescript
// Key decisions:
// 1. Determine actual URL for liberation list
// 2. Decide between Option A (list page) vs Option B (per-song)
// 3. Parse gap duration formats (may be "247 days" or "45 shows")
// 4. Map "last show" text to actual show IDs
// 5. Determine liberation threshold configurations ("50-Show Liberation")

// Challenges:
// - URL might not exist as single page
// - Gap data might only be on individual song pages
// - May need to calculate gaps from setlist data instead
```

---

## PRIORITY 3: Venue Statistics Scraper

### Purpose
Extract venue-specific statistics and performance history.

### URL Pattern
```
https://dmbalmanac.com/VenueStats.aspx?vid=XXX
```

### Data Fields to Extract

#### Basic Venue Information
- Venue name
- City
- State/Province
- Country
- Venue type (Amphitheatre, Theater, Club, etc.)
- Capacity (if available)
- Latitude/Longitude (if available)

#### Performance Statistics
```json
{
  "totalShows": 42,
  "firstShowDate": "1998-06-15",
  "firstShowYear": 1998,
  "lastShowDate": "2024-08-22",
  "lastShowYear": 2024,
  "yearsSpan": 26,
  "consecutiveShowRecords": [
    {
      "year": 1999,
      "consecutiveShows": 3,
      "dates": ["1999-06-01", "1999-06-02", "1999-06-03"]
    }
  ]
}
```

#### Song Statistics at Venue
```json
{
  "mostPlayedSongs": [
    {
      "rank": 1,
      "songTitle": "Ants Marching",
      "timesPlayed": 38,
      "percentage": 90.5
    },
    {
      "rank": 2,
      "songTitle": "Two Step",
      "timesPlayed": 35,
      "percentage": 83.3
    }
  ],
  "rarelyPlayedSongs": [
    {
      "songTitle": "Don't Drink the Water",
      "timesPlayedAtVenue": 1,
      "totalTimesPlayed": 200
    }
  ]
}
```

#### Related Releases
```json
{
  "officialLiveReleases": [
    {
      "title": "Live at Red Rocks",
      "releaseType": "Live Album",
      "releaseDate": "2009-06-02"
    }
  ]
}
```

#### Performance Trends
```json
{
  "showsByYear": [
    { "year": 1998, "count": 2 },
    { "year": 1999, "count": 4 },
    { "year": 2000, "count": 1 },
    // ... through current year
  ],
  "averageShowsPerYear": 1.6
}
```

### Database Operations

#### Update Venue Record
```sql
UPDATE venues SET
  total_shows = :totalShows,
  first_show_date = :firstShowDate,
  last_show_date = :lastShowDate,
  venue_type = :venueType,
  capacity = :capacity,
  latitude = :latitude,
  longitude = :longitude
WHERE slug = :venueSlug
```

#### Optional: Create Venue Statistics Table
```typescript
interface VenueStatistics {
  venueId: Int
  totalShows: Int
  firstShowDate: Date
  lastShowDate: Date
  averageShowsPerYear: Float
  consecutiveShowRecord: Int
  mostPlayedSongs: Json  // Array of {songId, count}
  updatedAt: DateTime
}
```

### HTML Structure Notes
- Venue name in heading
- Stats in tables or definition lists
- Song list with play counts in table
- Timeline/chart showing shows by year
- Release information in sidebar or section

### Data Lookup Challenge
**Problem**: VID (Venue ID) extraction
- Need to build mapping from existing venue data to VID
- Options:
  1. Parse VenueList.aspx to extract VID for each venue
  2. Extract VID from show pages that link to VenueStats
  3. Use slug matching to correlate with existing venue records

### Implementation Strategy
```typescript
// Step 1: Get venue IDs
// Option A: Parse VenueList.aspx to extract all VIDs
// Option B: Extract from existing show pages (slower)

// Step 2: For each venue
// - Fetch VenueStats.aspx?vid=VID
// - Parse statistics
// - Extract song play counts
// - Extract show years

// Step 3: Update database
// - Update venues table with new fields
// - Create venue_statistics records if new table
```

### Rate Limiting
- **Requirement**: 1 second between requests
- **Number of venues**: ~500-600
- **Estimated time**: 8-10 minutes

### Edge Cases
- Some very new venues may have only 1 show
- Historical venues may have hundreds of shows
- Show count may differ slightly between pages due to curation
- Some venues may have been renamed over time
- Capacity information may not always be available

---

## Supporting Scrapers (Priority 2)

### PRIORITY 4: Curated Lists Scraper

**URL Pattern**: `https://dmbalmanac.com/Lists.aspx`

**Data Structure**:
```typescript
interface CuratedList {
  title: string;
  slug: string;
  category: string;  // "Songs", "Venues", "Releases", "Shows", etc.
  description?: string;
  itemCount: number;
  items: CuratedListItem[]
}

interface CuratedListItem {
  position: number;
  itemType: "song" | "venue" | "show" | "release" | "string";
  itemTitle: string;
  itemId?: number;  // Song ID, Venue ID, etc.
  notes?: string;
  metadata?: Record<string, unknown>;
}
```

**Implementation**:
1. Fetch Lists.aspx
2. Find all list containers/tables
3. For each list:
   - Extract title, category, description
   - Parse items with positions
   - Extract any related IDs
4. Insert into `curated_lists` and `curated_list_items` tables

**Rate Limiting**: < 2 minutes (mostly parsing single page + maybe 5-10 list detail pages)

---

### PRIORITY 5: Tour Statistics Scraper

**URL Pattern**: `https://dmbalmanac.com/TourStats.aspx?tid=XXX`

**Data to Extract**:
```typescript
interface TourStatistics {
  tourYear: number;
  totalShows: number;
  uniqueSongs: number;
  mostPlayedSong: string;
  rarestSong: string;
  averageSetlistLength: number;
  venueCount: number;
  startDate: Date;
  endDate: Date;
}
```

**Implementation**:
1. Query existing tours to get TIDs
2. For each tour, fetch TourStats.aspx?tid=TID
3. Parse statistics
4. Update tour records

**Rate Limiting**: < 10 minutes (typically only 35 tours from 1991-2026)

---

## Implementation Sequence Recommendation

### Week 1-2: Foundation
1. **Liberation List Scraper** - Start here (simplest, < 1 hour)
2. **Venue List Scraper** - Extract VID mappings (< 2 hours)
3. **Song Statistics Scraper** - Complex parsing (4-6 hours)

### Week 3: Integration
4. **Venue Statistics Scraper** - Now that you have VIDs (3-4 hours)
5. **Curated Lists Scraper** - Various structures (4-5 hours)

### Week 4: Polish
6. **Tour Statistics Scraper** - Relatively simple (2-3 hours)
7. Testing, integration, documentation (4-5 hours)

---

## Common Infrastructure

All scrapers should use:
- Shared rate limiter class
- Shared fetch-with-retry utility
- Shared slugify utility
- Shared Prisma client initialization
- Consistent error handling

### Shared Utilities Pattern

```typescript
// utils/scraper.ts
export class BaseScraper {
  protected rateLimiter: RateLimiter;
  protected prisma: PrismaClient;

  constructor(rateLimit: number = 1000) {
    this.rateLimiter = new RateLimiter(rateLimit);
    this.prisma = new PrismaClient();
  }

  async fetchWithRetry(url: string): Promise<string> {
    // Shared implementation
  }

  protected slugify(text: string): string {
    // Shared implementation
  }

  protected async wait(): Promise<void> {
    await this.rateLimiter.wait();
  }
}

// usage in specific scrapers
export class SongStatisticsScrapers extends BaseScraper {
  async scrape(): Promise<void> {
    const songs = await this.prisma.song.findMany();

    for (const song of songs) {
      await this.wait();
      const html = await this.fetchWithRetry(`...?sid=${song.id}`);
      // Parse and update
    }
  }
}
```

---

## Testing Strategy

### Unit Tests
- HTML parsing functions
- Data extraction/transformation
- Database upsert logic

### Integration Tests
- Full scraper flow with test data
- Database state validation
- Duplicate detection

### Validation Tests
- Data type validation
- Foreign key integrity
- Null value handling

---

## Monitoring & Logging

Each scraper should log:
- Start/end times
- Items processed count
- Success/failure counts
- Error details
- Rate limiting metrics
- Database operations count

Example output:
```
================================
Song Statistics Scraper
================================
Started: 2026-01-16 14:30:00
Total songs: 267
Processing: [################    ] 85%
Successful: 227
Failed: 3
Errors:
  - Song ID 45: Parsing error (timeout)
  - Song ID 128: Missing data
  - Song ID 205: HTML structure mismatch
Duration: 45m 23s
Rate: 5.8 songs/min
================================
```

---

## Deployment Checklist

For each scraper:
- [ ] Add to package.json scripts
- [ ] Add CLI argument parsing (e.g., `--limit`, `--dry-run`)
- [ ] Create README with usage examples
- [ ] Add error recovery (resumable scrapes)
- [ ] Add database transaction handling
- [ ] Validate all data before insert
- [ ] Create rollback procedure
- [ ] Document data sources and changes
- [ ] Add to CI/CD pipeline (if applicable)
- [ ] Create monitoring/alerting

---

## Conclusion

These 5 scrapers will significantly enhance the completeness of the DMBAlmanac database. The estimated 18-26 hours of development time is a worthwhile investment for the comprehensive data coverage they provide.

The recommended implementation sequence prioritizes getting the foundational data (song statistics, venue stats) that supports the most features, followed by the nice-to-have enhancements (curated lists).
