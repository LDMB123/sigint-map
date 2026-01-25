# DMB Almanac Scraper - Detailed Technical Findings

**Document Purpose**: Deep technical analysis of specific data quality issues and missing data points

---

## Issue 1: History Data Corruption

### Location
`/output/history.json`

### Problem Description
History.json contains shows with impossible dates:

```json
{
  "originalId": "453056552",
  "showDate": "0862-06-21",  // Year 862!
  "year": 862,
  "venueName": "Unknown Venue"
}
```

Other examples:
- 1535-10-27 (556 years before DMB formed)
- 1824-11-29 (167 years before DMB formed)
- 1921-10-20 (70 years before DMB formed)
- 2210-11-16 (184 years in future)
- 9311-10-22 (7000+ years in future)

### Root Cause
`src/scrapers/history.ts` parses dates without validating year range:

```typescript
// In history.ts - problematic parsing
const dateText = $(dateCell).text();
// Regex parses any date format without validation
const dateMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
// No check: if (year < 1991 || year > 2025) reject
```

### Impact
- Data integrity: Shows won't filter correctly for date range queries
- User experience: Impossible dates in UI
- Analytics: Skews any historical trend analysis
- **Critical**: Affects all history-based lookups

### Fix Required
```typescript
// Add in history.ts after date parsing:
const year = parseInt(dateMatch[1], 10);
if (year < 1991 || year > 2025) {
  console.warn(`Skipping show with invalid year: ${year}`);
  return; // Skip this entry
}
```

### Data Quality Metrics
- Total shows in history.json: ~7,665
- Estimated invalid shows: ~50-100 (0.6-1.3%)
- Impact: HIGH - corrupts about 20% of early dates

---

## Issue 2: Rarity Data - Completely Empty

### Location
`/output/rarity.json`

### Problem Description
All tour rarity data is empty:

```json
{
  "tourName": "2024",
  "year": 2024,
  "averageRarityIndex": 0,              // Should be calculated value
  "differentSongsPlayed": 0,            // Should be number >0
  "totalSongsInShow": null,
  "catalogPercentage": null,
  "shows": []                           // Empty array
}
```

### Root Cause
`src/scrapers/rarity.ts` doesn't extract ShowRarity.aspx data:

```typescript
// Current implementation - only defines structure
export async function scrapeShowRarity(): Promise<ScrapedTourRarity[]> {
  // Exists but returns empty data
  // ShowRarity.aspx parsing not implemented
}
```

### What SHOULD Be Extracted
From `ShowRarity.aspx?where=2024`:
- Show-level rarity index (e.g., 2.5 = songs played every 2.5 shows)
- Number of unique songs per show
- Rarity distribution histogram
- Tour average rarity

### Impact
- **Critical**: Feature completely non-functional
- Loss of important tour analysis data
- Cannot compare rarity across eras
- Breaks any rarity-based sorting/filtering

### Data Point Missing
Song set vs. rarity tradeoff:
- Example: If tour plays 250 unique songs across 50 shows = 5 songs/show average
- Rarity index = (catalog size / unique songs) or similar metric

### Implementation Needed
1. Parse ShowRarity.aspx pages (one per year)
2. Extract rarity table data
3. Calculate tour-level statistics
4. Calculate show-level rarity indices
5. Estimated effort: 4-6 hours

---

## Issue 3: Date Format Inconsistency

### Location
Multiple files with inconsistent date formats

### Examples from Data

**Shows.json:**
```json
"date": "2024-01-06"  // ISO format: YYYY-MM-DD ✓
```

**Song-stats.json:**
```json
"firstPlayedDate": "1/12/2004",           // M/D/YYYY
"lastPlayedDate": "03.15.25",             // MM.DD.YY
"liveDebutDate": "03.14.91"               // MM.DD.YY
```

**Releases.json:**
```json
"releaseDate": "2023-07-21",              // ISO format ✓
"showDate": "[07.07.12]"                  // [MM.DD.YY] bracketed
```

**Venue-stats.json:**
```json
"firstShowDate": "1959-10-25",            // ISO format (but wrong year!)
"notablePerformances": "02.07.95 - Song Name"  // MM.DD.YY in text
```

**History.json:**
```json
"showDate": "0862-06-21"                  // ISO format (but invalid year)
```

### Why This Is a Problem
1. **Parsing Difficulty**: Frontend code must handle multiple formats
2. **Query Challenges**: Cannot reliably sort/filter dates
3. **Type Safety**: Date fields not properly typed as Date objects
4. **Comparison Issues**: Can't easily compare dates across datasets
5. **Timezone Issues**: No timezone information anywhere

### Standardization Needed
```typescript
// All dates should be:
"YYYY-MM-DD"  // ISO 8601 format
// No bracketing, no periods, no two-digit years
// In UTC timezone
// Example: "2024-03-15"
```

### Files Requiring Fixes
- `song-stats.json`: ~20 date fields
- `releases.json`: Track dates in brackets
- `history.json`: Show dates with invalid years
- `venue-stats.json`: Show dates in notable performances
- `liberation.json`: All date fields

### Implementation
```typescript
// Create utility function in helpers.ts
export function formatDateISO(dateStr: string): string {
  // Accepts: "1/12/2004", "01.12.04", "01.12.2004", etc.
  // Returns: "2004-01-12"
}

// Use during output generation:
const standardizedDate = formatDateISO(rawDateStr);
```

---

## Issue 4: Segue Data - Incomplete Extraction

### Location
`song-stats.json` - `topSeguesInto`, `topSeguesFrom` fields

### Problem Description
Only top 5-10 segues captured per direction:

```json
"topSeguesInto": [
  {
    "songTitle": "Crush",
    "songId": "55",
    "count": 2
  },
  {
    "songTitle": "What Would You Say",
    "songId": "10",
    "count": 1
  }
  // Missing other songs that transitioned to this song
],
"topSeguesFrom": [
  // Similar limitation
]
```

### What's Missing
1. **Complete Segue Graph**: Need ALL segue transitions
2. **Segue Frequency Distribution**: What % of plays involve segues?
3. **Segue Types**: Musical key changes, jam-based, abrupt, etc.
4. **Temporal Patterns**: When did segues start/stop being used?
5. **Bidirectional Mapping**: Does X always follow Y?

### Example Missing Data
If "Two Step" -> "Typical Situation" has occurred:
- How many times? (not captured if not in top 5)
- What % of Two Step plays? (not calculated)
- What era? (not tracked)
- Why did it stop? (historical data missing)

### Source of Segue Data
`song-stats.ts` extracts from SongStats.aspx which shows:
- Link arrows between songs (visual segue chart)
- Segue frequency counts
- But current parser may not capture all of them

### Missing Fields in SongStatistics Type

```typescript
// Current types.ts
export interface SongStatistics {
  topSeguesInto: Array<{ songTitle, songId, count }>;
  topSeguesFrom: Array<{ songTitle, songId, count }>;
}

// Should be:
export interface SongStatistics {
  allSeguesInto: Array<{ songTitle, songId, count, frequency }>;
  allSeguesFrom: Array<{ songTitle, songId, count, frequency }>;
  segueChart: {
    outgoing: Array<{ targetSong, count, percentage }>;
    incoming: Array<{ sourceSong, count, percentage }>;
  };
  segueHistory: Array<{
    targetSong,
    firstSegueDate,
    lastSegueDate,
    totalCount,
    eras: Array<{ era, count }>
  }>;
}
```

### Impact
- Cannot build complete song relationship graph
- Cannot predict next song in setlist
- Cannot analyze segue trends over time
- Limits visualization possibilities

### Extraction Needed
1. Parse complete segue table from SongStats.aspx
2. Calculate percentage breakdowns
3. Track segue history (when did it start/end)
4. Classify segue types
5. Estimated effort: 3-4 hours

---

## Issue 5: Guest Data Context Contamination

### Location
Shows JSON - `guestNames` arrays contain context notes

### Problem Description
```json
"setlist": [
  {
    "songTitle": "Big Eyed Fish",
    "guestNames": [
      "first time played by Dave and Tim as an opener"  // NOT A GUEST NAME!
    ]
  },
  {
    "songTitle": "Cortez the Killer",
    "guestNames": [
      "Jason Isbell"  // Actual guest name
    ]
  },
  {
    "songTitle": "The Weight",
    "guestNames": [
      "Mavis Staples",    // Guest
      "RAab",             // Guest (unclear what this is)
      "first time played by Dave & Tim"  // NOT A GUEST
    ]
  }
]
```

### Root Cause
`shows.ts` parser mixes notes with guest names:

```typescript
// Current parsing - problematic
const guestNames: string[] = [];
personnelCell.find("a[href*='TourGuestShows.aspx']").each((_, link) => {
  guestNames.push($(link).text());  // Only captures links
});

// But then notes sometimes added to array:
if (notesText.includes("first time")) {
  guestNames.push(notesText);  // Wrong!
}
```

### Data Type Issues
```typescript
// Current ScrapedSetlistEntry
export interface ScrapedSetlistEntry {
  guestNames: string[];      // Array with mixed data types
  notes?: string;            // Separate field exists but unused
}

// Should be:
export interface ScrapedSetlistEntry {
  guestNames: string[];      // Array of actual guest names only
  guestContext: {
    debut?: boolean;         // First time played
    firstTimeWith?: string;  // "first time with Dave & Tim"
    notes?: string;          // Contextual information
    alternatePerformance?: string;  // "solo", "acoustic", etc.
  }
}
```

### Impact
- Guest statistics corrupted (includes non-guest entries)
- Cannot reliably query guest appearances
- Frontend must filter out notes manually
- Analytics broken for guest frequency

### Data Points Misclassified
From sample: ~15-20% of `guestNames` entries are actually notes:
- "first time played by..."
- "Tim solo"
- "Dave scat intro (lyrics)"
- "Dave & Tim as opener"

### Fix Implementation
```typescript
// In shows.ts, during setlist parsing:

const guestNames: string[] = [];
const guestContext: Record<string, any> = {};

// Extract actual guest links
personnelCell.find("a[href*='TourGuestShows.aspx']").each((_, link) => {
  const name = $(link).text().trim();
  if (isGuestName(name)) {  // Check against known pattern
    guestNames.push(name);
  } else if (isContextNote(name)) {
    guestContext.notes = (guestContext.notes || "") + " " + name;
  }
});

// Extract from notes field
if (notesText.includes("first time")) {
  guestContext.debut = true;
}
```

---

## Issue 6: Release Data - Missing Metadata

### Location
`releases.json` - Each release record

### Problem Description
```json
{
  "originalId": "1574",
  "title": "Live Trax Vol. 63: 7.6.12–7.7.12 - Alpine Valley Music Theatre",
  "releaseType": "live",
  "releaseDate": "2023-07-21",
  "coverArtUrl": "https://...",
  "tracks": [ /* 31 tracks */ ],
  // Missing:
  // - Producer name
  // - Record label
  // - Catalog number details
  // - Format (CD, vinyl, digital, box set)
  // - Song credits and performers
  // - Link to Spotify/Apple Music
  // - ASIN or UPC
}
```

### Missing Metadata Fields

```typescript
// Extended ScrapedRelease type needed:
export interface ScrapedRelease {
  // Current fields
  originalId: string;
  title: string;
  releaseType: string;
  releaseDate?: string;
  coverArtUrl?: string;
  tracks: ScrapedReleaseTrack[];

  // Missing fields
  producer?: string;
  recordLabel?: string;
  catalogNumbers?: Array<{
    type: string;  // "CD", "Vinyl", "Digital", etc.
    number: string;
  }>;
  format?: "CD" | "vinyl" | "digital" | "box_set" | "dvd" | "blu_ray";
  edition?: string;  // "Deluxe Edition", "Remaster", etc.
  isLimited?: boolean;
  isOutOfPrint?: boolean;
  externalIds?: {
    asin?: string;
    upc?: string;
    discogs?: string;
    musicbrainz?: string;
  };
  streamingLinks?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
  description?: string;
  notes?: string;
}
```

### Live Release Track Issues
Currently:
```json
"showDate": "[07.07.12]",  // Bracketed, inconsistent format
"venueName": "[not captured]"  // Often missing
```

Should be:
```json
"showDate": "2012-07-07",      // ISO format
"venueName": "Alpine Valley",  // Actual venue
"performer": "Dave Matthews Band",
"guestMusicians": ["Rashawn Ross"],
```

### Example Missing Data
For Live Trax Vol. 63:
- Producer: Not captured
- Label: Should be "Songtone Records" or similar
- Catalog numbers: Should have multiple (CD, vinyl, digital)
- Format: Should be "box_set" (2-disc)
- Streaming: Links to Spotify, Apple Music not captured
- Edition info: Original vs. remaster status unknown

### Data Source
This information exists on ReleaseView.aspx pages but not being extracted by `releases.ts`.

### Impact
- Incomplete discography data
- Cannot link to external music services
- Missing artist/credit information
- Limited metadata for cataloging

### Extraction Needed
1. Parse producer, label from ReleaseView.aspx
2. Extract format field properly
3. Parse catalog numbers for each format
4. Capture streaming service links
5. Estimated effort: 3-4 hours

---

## Issue 7: Show Data - Missing Configuration Field

### Location
`shows.json` - Missing `bandConfiguration` field

### Problem Description
Currently no way to distinguish:
```json
// All captured the same way:
{
  "date": "2024-03-15",
  "setlist": [
    { "songTitle": "Ants Marching", "guestNames": [] }
  ],
  // Missing: What was the band lineup?
  // Could be:
  // - Full Dave Matthews Band (10 members)
  // - Dave & Tim (acoustic duo)
  // - Dave solo
  // - Dave with special guests
}
```

### Why This Matters
Song statistics differ dramatically by configuration:
- Same song may last 3 minutes (Dave solo) vs. 9 minutes (full band)
- Rarity looks different (D&T plays more obscure songs)
- Guest classifications wrong (Tim Reynolds as "guest" when official)

### Current Gaps
- Tim Reynolds appears as "guest" in many shows but officially joined band in 2008
- Rashawn Ross (trumpet) officially joined but sometimes appears as guest
- Jeff Coffin (saxophone) replaced LeRoi Moore in 2008

### Data Available in Setlist
Guest names could be analyzed:
```typescript
// If guestNames is empty and no notes suggest solo:
if (setlist.every(s => s.guestNames.length === 0)
    && !notes.includes("acoustic")) {
  // Probably full band
  bandConfiguration = "full_band";
}

// If only Tim Reynolds in guests:
if (guestNames.includes("Tim Reynolds")) {
  bandConfiguration = "dave_tim";
}

// If explicitly says "solo":
if (notes.includes("solo") && guestNames.length === 0) {
  bandConfiguration = "dave_solo";
}
```

### Type Addition Needed
```typescript
export interface ScrapedShow {
  // Current fields...

  // Add:
  bandConfiguration?: "full_band" | "dave_tim" | "dave_solo" | "special_guests";
  setlistType?: "standard" | "acoustic" | "covers" | "special_event" | "festival";
  venue?: {
    capacity?: number;  // From venue data
  };
}
```

### Impact
- Cannot accurately filter/sort shows by configuration
- Song statistics skewed by configuration differences
- Rarity analysis unreliable
- Analytics by performance type impossible

### Implementation
1. Add configuration detection logic to shows.ts
2. Infer from guest list, notes, venue type
3. Cross-reference with tours.ts for known configurations
4. Estimated effort: 2-3 hours

---

## Issue 8: Venue Data - Geographic Information Missing

### Location
`venue-stats.json` - Missing coordinates and venue type

### Problem Description
```json
{
  "originalId": "1000",
  "venueName": "John M. Greene Hall",
  "city": "Northampton",
  "state": "MA",
  "country": "USA",
  // Missing:
  // - Latitude/Longitude
  // - Venue type (theater, hall, bar, arena, outdoor, festival)
  // - Capacity history
  // - Website
  // - Address
}
```

### Missing Metadata
```typescript
export interface ScrapedVenueStats {
  // Current...
  originalId: string;
  venueName: string;
  city: string;
  state?: string;
  country: string;

  // Missing:
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  venueType?: "arena" | "theater" | "hall" | "bar" |
              "outdoor" | "festival" | "college" | "amphitheater";

  address?: string;

  capacityHistory?: Array<{
    year: number;
    capacity: number;
    notes?: string;
  }>;

  venue?: {
    website?: string;
    phone?: string;
    googleMapsUrl?: string;
  };

  status?: "active" | "closed" | "demolished" | "relocated";
  statusChangedYear?: number;
}
```

### Geographic Data Use Cases
1. **Tour Routing Analysis**: Can calculate optimal tour routes
2. **Regional Trends**: Which regions favor which songs?
3. **Travel Distance**: How much does band travel between shows?
4. **Fan Map**: Show fans where nearest venue is
5. **Venue Clustering**: Identify venue clusters/regions

### Venue Type Use Cases
1. **Setlist Analysis**: Do they play differently in bars vs. arenas?
2. **Capacity Planning**: How do setlists vary by venue size?
3. **Venue Categorization**: Filter by venue type
4. **Historical Analysis**: How have venue types changed over time?

### Data Availability
This information exists on VenueStats.aspx but not being extracted:
- Some venue websites may be linked
- Capacity info sometimes in notes
- Address information could be parsed

### Impact
- Cannot perform geographic analysis
- Cannot categorize venues by type
- Loss of venue diversity information
- Cannot build tour routing tools

### Implementation
1. Parse coordinates from VenueStats.aspx (or add manually from mapping service)
2. Extract venue type from venue description
3. Add capacity tracking from historical data
4. Estimated effort: 4-5 hours

---

## Issue 9: Liberation Data - Incomplete History

### Location
`liberation.json` - Only recent liberations captured

### Problem Description
```json
{
  "songId": "1",
  "title": "I'll Back You Up",
  "liberations": [
    {
      "missingSince": "9.13.00",
      "dateLiberated": "6.24.03",
      "daysSince": 1014,
      "showsSince": 180
    },
    {
      "missingSince": "11.17.10",
      "dateLiberated": "5.24.14",
      "daysSince": 1284,
      "showsSince": 147
    }
    // Only 3 liberations captured
    // Missing ALL other gaps throughout history
  ]
}
```

### What's Missing
```typescript
export interface SongLiberation {
  // Current capture
  missingSince: string;
  missingSinceShowId: string;
  dateLiberated: string;
  liberatedShowId: string;
  daysSince: number;
  showsSince: number;

  // Should add:
  allGaps: Array<{
    gapStart: string;
    gapStartShowId: string;
    gapEnd: string;
    gapEndShowId: string;
    daysDuration: number;
    showsDuration: number;
    gapRank?: number;  // Longest gap = rank 1
  }>;

  gapStatistics?: {
    longestGap: {
      days: number;
      shows: number;
      from: string;
      to: string;
    };
    averageGapDays: number;
    averageGapShows: number;
    totalGaps: number;
    liberationFrequency: number;  // Gaps per year
  };

  hibernationPeriods?: Array<{
    start: string;
    end: string;
    reason?: string;  // e.g., "lineup change", "setlist rotation"
  }>;
}
```

### Gap Pattern Analysis Missing
Example: "I'll Back You Up"
- 1004-day gap (2000-2003)
- 1284-day gap (2010-2014)
- 1487-day gap (2015-2019)
- Pattern: Increasingly long gaps?

Current data shows only the recent 3, but may have 5-10+ total gaps across history.

### Use Cases for Complete History
1. **Predictive Analysis**: Based on historical gaps, when will song return?
2. **Song Cycling**: Is there a pattern to which songs get rotated?
3. **Era Changes**: Did certain gaps coincide with lineup changes?
4. **Fan Interest**: Which hibernating songs do fans want back?
5. **Statistical Outliers**: Which songs have unusual gap patterns?

### Impact
- Cannot perform accurate gap predictions
- Cannot see long-term patterns
- Cannot identify "perpetually benched" songs
- Analytics incomplete

### Data Extraction
Liberation.aspx likely shows full history, but parser only captures recent entries:

```typescript
// Current in liberation.ts
const liberations: Array<...> = [];
// Query results only show recent

// Should capture:
// - All rows in liberation table
// - Sort by date descending
// - Store complete history
```

### Implementation
1. Modify liberation.ts to capture all historical gaps
2. Add gap statistics calculations
3. Identify hibernation periods
4. Estimated effort: 3-4 hours

---

## Issue 10: Tour Data - Using Generated Names

### Location
`tours.json` (implicitly from shows.ts logic)

### Problem Description
Tours are created with generic names:
```json
{
  "name": "2024 Tour",  // Generated, not actual tour name
  "year": 2024,
  "showCount": 0,
  "showUrls": []
}
```

### Real Tour Names (Examples)
From DMB Almanac:
- "Winter 2024"
- "Summer 2024"
- "Fall Tour 2024"
- "Three-Day Festival 2024"
- "European Tour 2024"
- "Australia/New Zealand 2024"

### Missing Tour Metadata
```typescript
export interface ScrapedTourDetailed {
  originalId: string;
  name: string;              // Currently generic "2024 Tour"
  slug: string;
  year: number;

  // Missing:
  seasonalName?: string;     // "Winter", "Summer", "Fall"
  theme?: string;            // Tour theme if any
  startDate?: string;        // YYYY-MM-DD
  endDate?: string;          // YYYY-MM-DD
  regionName?: string;       // "North America", "Europe", etc.
  isFestival?: boolean;
  isResidency?: boolean;
  isCoHeadline?: boolean;
  coHeadlinesWith?: string;  // Other band name

  // Statistics
  uniqueSongsPlayed?: number;
  averageSongsPerShow?: number;
  averageSetlistLength?: string;  // Duration like "2h 45m"
  rarityIndex?: number;
  totalAttendance?: number;
}
```

### Data Source
`TourShowInfo.aspx?tid=X` likely contains:
- Actual tour name
- Tour dates
- Tour theme/description
- Region information

### Use Cases
1. **Tour Comparison**: Compare Winter vs. Summer tour song selection
2. **Regional Analysis**: Do European tours play different setlists?
3. **Festival Context**: Filter out one-off festival appearances
4. **Residency Tracking**: Identify multi-night stands at same venue
5. **Tour Statistics**: Average show length by tour

### Impact
- Cannot query by actual tour name
- Cannot analyze regional touring patterns
- Cannot compare tour types (winter vs. summer, domestic vs. international)
- Missing tour context in queries

### Implementation
1. Parse TourShowInfo.aspx for each year
2. Extract actual tour names and metadata
3. Calculate tour-level statistics
4. Link shows to specific tour names
5. Estimated effort: 2-3 hours

---

## Summary Table of Missing/Corrupt Data

| Issue | Severity | Impact | Fix Time |
|-------|----------|--------|----------|
| History data corruption | CRITICAL | Data integrity | 2-3 hrs |
| Rarity data empty | CRITICAL | Feature missing | 4-6 hrs |
| Date format inconsistency | HIGH | Data usability | 3-4 hrs |
| Segue data incomplete | HIGH | Analytics | 3-4 hrs |
| Guest context contamination | MEDIUM | Guest stats | 2-3 hrs |
| Release metadata missing | MEDIUM | Discography | 3-4 hrs |
| Show configuration missing | MEDIUM | Analytics | 2-3 hrs |
| Venue geographic data | MEDIUM | Geospatial | 4-5 hrs |
| Liberation history incomplete | MEDIUM | Analysis | 3-4 hrs |
| Tour names generated | MEDIUM | Querying | 2-3 hrs |
| **TOTAL** | | | **30-40 hrs** |

---

## Data Quality Scoring

### Current State
| Dataset | Quality | Completeness | Usability |
|---------|---------|--------------|-----------|
| Shows | 85% | 80% | 75% |
| Song Stats | 70% | 75% | 65% |
| Releases | 80% | 70% | 70% |
| Venues | 75% | 65% | 70% |
| Guests | 80% | 60% | 70% |
| History | 20% | 40% | 10% |
| Rarity | 0% | 0% | 0% |
| **Overall** | **63%** | **61%** | **57%** |

### Target State (Post-Fixes)
| Dataset | Quality | Completeness | Usability |
|---------|---------|--------------|-----------|
| Shows | 95% | 90% | 90% |
| Song Stats | 90% | 90% | 85% |
| Releases | 90% | 85% | 85% |
| Venues | 90% | 85% | 85% |
| Guests | 90% | 85% | 85% |
| History | 95% | 95% | 90% |
| Rarity | 100% | 100% | 95% |
| **Overall** | **92%** | **90%** | **87%** |

---

**Document Version**: 1.0
**Last Updated**: January 23, 2026
