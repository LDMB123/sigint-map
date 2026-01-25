# Missing Scrapers - Detailed Specification

## Overview

This document specifies the **4 major missing scrapers** that would significantly enhance data coverage for the DMB Almanac scraper project.

---

## 1. Guest Show Appearances Scraper

### Priority: HIGH
### Estimated Data Impact: +15% relational data

### Page URL Pattern
```
https://www.dmbalmanac.com/TourGuestShows.aspx?gid=XXX
```

### Current Situation
- Guest data exists: `guests.ts` captures basic guest info (name, instruments, appearance count)
- BUT: No scraper for the guest detail page showing which shows they appeared on
- Guest appearances ARE captured from show pages (reverse direction)
  - Each show lists its guests in the setlist
  - But guest pages are never accessed directly

### What Should Be Captured

#### Per Guest:
```typescript
interface GuestShowAppearance {
  gid: string;                    // Guest ID
  guestName: string;              // "Gogol Bordello" or "Tim Reynolds"

  // Aggregate statistics
  totalAppearances: number;       // 42 shows
  yearsActive: {
    first: string;                // "1995-06-24"
    last: string;                 // "2023-08-12"
    total: number;                // 28 years
  };

  // Appearance details
  appearances: Array<{
    showId: string;               // Show ID
    date: string;                 // "1995-06-24"
    venue: string;                // "Red Rocks Amphitheater"
    city: string;                 // "Morrison"
    state: string;                // "CO"
    songsPlayed: string[];         // ["Song A", "Song B"]
    instrumentsUsed: string[];     // ["Violin", "Vocals"]
    notes?: string;               // "Entire first set"
  }>;

  // Analysis
  stats: {
    averageShowsPerYear: number;
    songFrequency: Record<string, number>;  // { "Song A": 15, "Song B": 8 }
    mostCommonSongs: string[];
    rareAppearances: string[];
  };
}
```

### Example URL
```
https://www.dmbalmanac.com/TourGuestShows.aspx?gid=1
https://www.dmbalmanac.com/TourGuestShows.aspx?gid=5    // Tim Reynolds
https://www.dmbalmanac.com/TourGuestShows.aspx?gid=50   // Steve Lillywhite
```

### Expected HTML Structure
- Guest name in header
- Appearances table with:
  - Date column
  - Venue column
  - Songs column (links to SongStats.aspx)
  - Instruments column
  - Notes column
- Possibly grouped by year or tour

### Parser Implementation Strategy
1. Extract guest ID from URL parameter
2. Parse guest name from page header
3. Find appearances table (likely `<table>` with class "threedeetable" or similar)
4. For each row:
   - Extract date (format: DD.MM.YYYY)
   - Extract venue name (possibly with link to VenueStats.aspx)
   - Extract location (City, State)
   - Extract songs (links to SongStats.aspx)
   - Extract instruments
   - Extract notes
5. Parse aggregate statistics from summary section

### Rate Limiting
- 2 concurrent requests
- 5 per 10 seconds
- 1-2 second delay between pages

### Related Data
- Links back to: shows.ts (show IDs), guests.ts (guest IDs), songs.ts (song IDs)
- Used by: Guest detail pages, show analysis
- Mirrors: Guest appearances captured from show pages (reverse direction)

### Output File
```json
{
  "scrapedAt": "2026-01-23T15:30:00Z",
  "source": "https://www.dmbalmanac.com/TourGuestShows.aspx",
  "totalItems": 105,
  "guestAppearances": [
    {
      "gid": "1",
      "guestName": "Dave Matthews",
      "totalAppearances": 2800,
      "yearsActive": { "first": "1991-...", "last": "2026-..." },
      "appearances": [...]
    }
  ]
}
```

---

## 2. Song Performance History Scraper

### Priority: HIGH
### Estimated Data Impact: +20% time-series data

### Page URL Pattern
```
https://www.dmbalmanac.com/SongStats.aspx?sid=XXX
```

### Current Situation
- Song stats page IS scraped by `song-stats.ts`
- BUT: Only summary statistics are extracted (total plays, top segues, etc.)
- The page contains a COMPLETE PERFORMANCE TABLE showing every show the song was played
- This table is currently SKIPPED/NOT EXTRACTED

### What Should Be Captured

#### Per Song Performance Record:
```typescript
interface SongPerformanceRecord {
  songId: string;               // Song ID
  songTitle: string;            // "Ants Marching"

  performances: Array<{
    showId: string;             // Show ID
    date: string;               // "1995-06-24" (YYYY-MM-DD)
    venue: string;              // "Red Rocks Amphitheater"
    city: string;               // "Morrison"
    state: string;              // "CO"
    country: string;            // "USA"

    // Performance details
    duration: string;           // "4:23" or "4:23 avg"
    position: number;           // Position in setlist (1, 2, 3...)
    slot: "opener" | "set1_closer" | "set2_opener" | "closer" | "midset" | "encore";
    set: "set1" | "set2" | "encore" | "encore2";

    // Version information
    version: "full" | "tease" | "partial" | "reprise" | "fake" | "aborted";
    isTease: boolean;
    teaseOf?: string;           // If tease, which song
    isSegue: boolean;
    segueFrom?: string;         // Previous song
    segueTo?: string;           // Next song

    // Associated data
    guests: Array<{
      name: string;
      instruments: string[];
    }>;

    // Release information
    isOnRelease: boolean;
    releaseTitle?: string;

    // Notes
    notes?: string;             // "Acoustic", "Acoustic jam", etc.
    soundcheck?: boolean;
  }>;

  // Calculated statistics
  stats: {
    totalPerformances: number;
    averageDuration: string;    // "4:23"
    longestVersion: { duration: string; date: string; };
    shortestVersion: { duration: string; date: string; };

    // By version
    versionCounts: {
      full: number;
      tease: number;
      partial: number;
      reprise: number;
      fake: number;
      aborted: number;
    };

    // By position
    positionBreakdown: {
      opener: number;
      set1Closer: number;
      set2Opener: number;
      closer: number;
      midset: number;
      encore: number;
      encore2: number;
    };

    // Gap analysis
    currentGap: { days: number; shows: number; };
    longestGap: { days: number; shows: number; dates: [string, string]; };

    // Segue analysis
    topSeguesInto: Array<{ song: string; count: number; }>;
    topSeguesFrom: Array<{ song: string; count: number; }>;

    // Timeline
    yearsActive: number;
    firstPerformance: { date: string; venue: string; };
    lastPerformance: { date: string; venue: string; };
  };
}
```

### Example URL
```
https://www.dmbalmanac.com/SongStats.aspx?sid=42      // Ants Marching
https://www.dmbalmanac.com/SongStats.aspx?sid=1       // Pantala Naga Pampa
https://www.dmbalmanac.com/SongStats.aspx?sid=200     // Central Park Song
```

### Expected HTML Structure
On SongStats.aspx page:
- Performance history table with:
  - Date column (links to ShowSetlist.aspx?id=XXX)
  - Venue column (links to VenueStats.aspx?vid=XXX)
  - Location column (City, State)
  - Duration column
  - Version column or encoded in other columns
  - Notes/Context column

### Parser Implementation Strategy
1. Use existing song-stats.ts parsing as base
2. INSTEAD OF SKIPPING the performance table, extract it:
   - Find `<table>` containing show links
   - For each `<tr>` with a show link:
     - Extract date from link text or adjacent cell
     - Extract venue from link or adjacent cell
     - Extract location (City, ST)
     - Extract duration if present
     - Extract version type from notes/formatting
     - Check for segue indicators (» or → symbols)
     - Parse guest names from personnel cells
3. Organize chronologically (already in order on page)
4. Calculate derived statistics

### Current song-stats.ts Status
- ✓ Already captures summary stats
- ✓ Already has some performance analysis (gap, years active)
- ✗ SKIPS the complete performance history table
- ✗ topSeguesFrom = [] (empty, should be populated)

### Enhancement Required
Instead of:
```typescript
// Current: Skip performance table
// Only use summary statistics extracted from text
```

Should be:
```typescript
// New: Extract performance history table
performances = [];
$("table tr").each((_, row) => {
  const $row = $(row);
  const showLink = $row.find("a[href*='ShowSetlist'][href*='id=']");

  if (showLink.length > 0) {
    // Extract all performance details from row
    performances.push({
      showId, date, venue, city, state, country,
      duration, position, slot, set,
      version, isTease, isSegue, guests, notes
    });
  }
});
```

### Output File
```json
{
  "scrapedAt": "2026-01-23T15:30:00Z",
  "source": "https://www.dmbalmanac.com/SongStats.aspx",
  "totalItems": 200,
  "songPerformances": [
    {
      "songId": "42",
      "songTitle": "Ants Marching",
      "performances": [
        {
          "showId": "1234",
          "date": "1995-06-24",
          "venue": "Red Rocks Amphitheater",
          "duration": "4:23",
          "version": "full",
          "segueTo": "Satellite"
        },
        ...
      ],
      "stats": {
        "totalPerformances": 847,
        "currentGap": { "days": 15, "shows": 2 },
        "topSeguesInto": [{ "song": "Satellite", "count": 42 }],
        "topSeguesFrom": [{ "song": "Streaming Live", "count": 38 }]
      }
    }
  ]
}
```

### File Size Estimate
- ~200 songs × ~500 performances average = ~100,000 performance records
- Estimated size: ~50MB (similar to shows.json)

---

## 3. Venue Show History Scraper

### Priority: MEDIUM
### Estimated Data Impact: +10% show-specific data

### Page URL Pattern
```
https://www.dmbalmanac.com/VenueStats.aspx?vid=XXX
```

### Current Situation
- Venue stats page IS scraped by `venue-stats.ts`
- Top 20 songs are extracted
- BUT: Complete show history at venue is NOT extracted
- Show history table exists but is only used to calculate total shows

### What Should Be Captured

```typescript
interface VenueShowHistory {
  venueId: string;
  venueName: string;
  city: string;
  state: string;
  country: string;

  // Complete show list
  shows: Array<{
    showId: string;
    date: string;               // "1995-06-24"
    year: number;               // 1995
    setCount: number;           // 2 or 3 (for # of sets)
    songCount: number;          // Number of songs played

    // Performance context
    notes?: string;
    notablePerformance?: boolean;
    onRelease?: boolean;
    releaseTitle?: string;
  }>;

  // Run analysis
  runs: Array<{
    startDate: string;
    endDate: string;
    showCount: number;
    notes?: string;              // "Red Rocks run 2023"
  }>;

  // Time series
  showsByYear: Record<number, number>;  // { 1991: 0, 1992: 1, ... }
  consecutiveYearsWithShows: number;
}
```

### Example URL
```
https://www.dmbalmanac.com/VenueStats.aspx?vid=100     // Red Rocks
https://www.dmbalmanac.com/VenueStats.aspx?vid=250     // Madison Square Garden
```

### Current venue-stats.ts Status
- ✓ Extracts venue name, location, capacity
- ✓ Extracts top songs
- ✗ Show history table exists but only used to count shows
- ✗ Individual show records not extracted

### Enhancement Required
Extract the show history table that's already on the page:
```typescript
// Parse show history table (currently skipped or underused)
const shows: VenueShowHistoryItem[] = [];

$("table tr").each((_, row) => {
  const $row = $(row);
  const showLink = $row.find("a[href*='ShowSetlist'][href*='id=']");

  if (showLink.length > 0) {
    const showId = showLink.attr("href").match(/id=(\d+)/)[1];
    const dateText = showLink.text().trim();  // "03.14.1995"
    const date = parseDate(dateText);

    // Extract other columns
    const cells = $row.find("td");
    const songCount = parseInt(cells.eq(1).text());

    shows.push({
      showId, date, year: new Date(date).getFullYear(),
      songCount, notes: extractNotes(row)
    });
  }
});
```

### Output File
```json
{
  "scrapedAt": "2026-01-23T15:30:00Z",
  "source": "https://www.dmbalmanac.com/VenueStats.aspx",
  "totalItems": 500,
  "venueShowHistories": [
    {
      "venueId": "100",
      "venueName": "Red Rocks Amphitheater",
      "shows": [
        { "showId": "1234", "date": "1995-06-24", "songCount": 27 },
        { "showId": "1235", "date": "1995-06-25", "songCount": 26 },
        ...
      ],
      "showsByYear": {
        "1991": 0,
        "1992": 0,
        "1995": 2,
        ...
        "2024": 5
      }
    }
  ]
}
```

---

## 4. Year Statistics Aggregator

### Priority: MEDIUM
### Estimated Data Impact: +5% summary statistics

### Page URL Pattern
```
https://www.dmbalmanac.com/TourShowsByYear.aspx?year=YYYY
```

### Current Situation
- Year pages ARE accessed by shows.ts to enumerate shows
- BUT: Year page is not saved as structured data
- Used only as intermediate step to find show URLs
- Year statistics could be valuable

### What Should Be Captured

```typescript
interface YearStatistics {
  year: number;

  // Tour information
  tours: Array<{
    tourId: string;
    tourName: string;
  }>;

  // Aggregate statistics
  shows: {
    total: number;
    startDate: string;
    endDate: string;
  };

  venues: {
    total: number;
    list: string[];              // Venue names
  };

  songs: {
    unique: number;
    totalPerformances: number;
    averagePerShow: number;

    mostPlayed: Array<{
      song: string;
      count: number;
    }>;

    debuts: Array<{
      song: string;
      date: string;
      venue: string;
    }>;

    retirements: Array<{
      song: string;
      lastPlayed: string;
      venue: string;
    }>;
  };

  guests: {
    total: number;
    mostFrequent: Array<{
      name: string;
      appearances: number;
    }>;
  };

  // Statistical analysis
  stats: {
    averageSongsPerShow: number;
    averageDurationPerShow: string;
    variantCount: number;
    coverage: number;             // % of catalog played

    mostUsedSegue: string;        // "Song A -> Song B"
    mostCommonOpeningSetCloser: string;
    mostCommonSetCloser: string;
  };

  // Time span
  tourType?: string;              // "Spring", "Summer Tour", "Fall", etc.
  notes?: string;
}
```

### Enhancement Strategy
1. Modify shows.ts to also extract year data when fetching year pages
2. Or create separate year-stats.ts scraper
3. Save year statistics alongside show data

### Output File
```json
{
  "scrapedAt": "2026-01-23T15:30:00Z",
  "source": "https://www.dmbalmanac.com/TourShowsByYear.aspx",
  "totalItems": 35,
  "yearStatistics": [
    {
      "year": 2024,
      "shows": { "total": 42, "startDate": "2024-03-01" },
      "venues": { "total": 25 },
      "songs": {
        "unique": 67,
        "totalPerformances": 1680,
        "mostPlayed": [
          { "song": "Ants Marching", "count": 42 },
          { "song": "Crash Into Me", "count": 40 }
        ]
      }
    }
  ]
}
```

---

## Summary Table: Missing Scrapers

| Scraper | Priority | Impact | Effort | Data Points | Status |
|---------|----------|--------|--------|-------------|--------|
| guest-shows.ts | HIGH | +15% | MEDIUM | ~5K-10K | NOT STARTED |
| song-performances | HIGH | +20% | MEDIUM | ~100K | PARTIALLY DONE* |
| venue-shows.ts | MEDIUM | +10% | LOW | ~5K | NOT STARTED |
| year-stats.ts | MEDIUM | +5% | LOW | ~500 | NOT STARTED |

*song-performances: song-stats.ts extracts summary but skips performance history table

---

## Implementation Recommendations

### Phase 1 (Immediate)
1. Enhance song-stats.ts to extract full performance table
   - Estimated effort: 2-4 hours
   - Add performance history extraction
   - Fill in topSeguesFrom (currently empty)

### Phase 2 (Next Sprint)
2. Create guest-shows.ts scraper
   - Estimated effort: 4-6 hours
   - Base on venue-stats.ts pattern
   - Extract appearance history table

3. Enhance venue-stats.ts to extract show history
   - Estimated effort: 2-3 hours
   - Extract complete show history table
   - Calculate runs and yearly breakdown

### Phase 3 (Future)
4. Create year-stats.ts aggregator
   - Estimated effort: 3-4 hours
   - Extract or calculate yearly statistics
   - Could be done as post-processing or live scraping

---

## Testing Strategy

For each new/enhanced scraper:

1. **Unit Tests**
   - Parse sample HTML (save a page locally)
   - Test regex patterns
   - Verify data extraction

2. **Integration Tests**
   - Run scraper on 5-10 random items
   - Verify data structure
   - Check rate limiting

3. **Validation**
   - Compare counts (e.g., total shows = len(shows[]))
   - Spot-check values against website
   - Verify relationships (guest IDs match, dates are valid)

4. **Performance**
   - Measure scrape time per item
   - Verify checkpoint/resume works
   - Check memory usage

---

## Success Criteria

For each missing scraper to be considered complete:

- [ ] Scraper extracts all expected data fields
- [ ] Data is saved to output JSON file
- [ ] Checkpoint/resume system works
- [ ] Rate limiting is respected
- [ ] Error handling is implemented
- [ ] Output structure matches specifications
- [ ] At least spot-checked against website
- [ ] Documentation is complete
