# DMBAlmanac Tour-Level Statistics Investigation Report

**Date:** January 23, 2026
**Scope:** Audit of tour-level statistics on dmbalmanac.com vs. current scraper capture
**Status:** Complete investigation with gap analysis

---

## Executive Summary

The investigation identified **13 categories of tour-level statistics** available on dmbalmanac.com that are either partially captured or completely missing from the current `tours.ts` scraper. The site tracks far more granular tour metrics than are currently being scraped into the `ScrapedTourDetailed` interface.

**Critical finding:** The scraper captures only ~30% of available tour-level statistics. Major gaps exist in setlist variety metrics, song debut/retirement tracking, geographic routing data, and performance type breakdowns.

---

## 1. Tour Overview Pages Analysis

### Pages Examined:
- `TourShow.aspx` - Master tour listing with comparison stats
- `TourShowsByYear.aspx?year=YYYY` - Year-by-year tour organization
- `TourShowInfo.aspx?tid=XXX` - Individual tour detail pages
- `TourStats.aspx?tid=XXX` - Dedicated tour statistics pages

### Statistics Currently Displayed:

#### Overview Stats (TourShow.aspx)
All tours are displayed with **five key metrics:**
1. **Shows** - Total performances
2. **Unknown** - Unconfirmed/unclear dates
3. **Cancelled** - Cancelled performances
4. **Rescheduled** - Shows moved to different dates
5. **Completion** - Percentage metric (likely setlist data completeness)

**Current Capture Status:** ❌ Only `showCount` is captured
- ✅ Shows (captured as `showCount`)
- ❌ Unknown shows (NOT captured)
- ❌ Cancelled shows (NOT captured)
- ❌ Rescheduled shows (NOT captured)
- ❌ Completion percentage (NOT captured)

**Aggregated Totals Available:**
- Total Tours: 83 (can be derived)
- Total Shows: 3,578 (can be derived)
- Total Unknown: 448 (NOT captured)
- Total Cancelled: 63 (NOT captured)
- Total Rescheduled: 120 (NOT captured)

---

## 2. Year-by-Year Comparison Statistics

### Pages Examined:
- `TourShow.aspx?where=YYYY` - Year-specific tour listing

### Statistics Available:

#### Annual Aggregation:
Each year shows **categorical breakdown** of tour types:
- **General/Main Band Shows** - Count by category (e.g., "General 1991 (39)")
- **Miscellaneous Shows** - Side projects, TV appearances, etc. (e.g., "Misc 1991 (30)")
- **Guesting Appearances** - DMB members as guests elsewhere (e.g., "Guesting 1991 (2)")
- **Artist Attribution** - Shows broken down by artist performing
  - DMB main band
  - Dave's side projects
  - Stefan's projects
  - Other collaborators

**Current Capture Status:** ❌ None of this is captured
- No distinction between show types
- No breakdown by artist/configuration
- No annual aggregation metadata

#### Possible Derived Metrics from Year Data:
- Year-over-year show count trends
- Touring intensity by year
- Early/modern era comparisons
- Configuration shifts (band size changes)

---

## 3. Tour Setlist Variety Metrics

### Pages Examined:
- `TourStats.aspx?tid=XXX` - Dedicated stats pages with detailed breakdowns

### Statistics Available:

#### Core Setlist Variety:
- **Different Songs Played** - Count of unique songs (✅ Partially captured as `songCount`)
- **Total Song Performances** - Aggregate performance count (✅ Captured as `totalSongPerformances`)
- **Average Songs per Show** - Mean setlist size (✅ Captured as `averageSongsPerShow`)

#### Derived Variety Metrics (NOT captured):
- **Rarity Index by Tour** - How often average songs from this tour were played
- **Unique Song Count** - Songs played at specific shows but not elsewhere on tour
- **Setlist Variation Coefficient** - Measure of how different each show is from tour average
- **Song Mix Diversity** - Entropy-based diversity of setlist selection

#### Song Repetition Patterns:
- **Most Repetitive Songs** - Songs played at nearly every show
- **Least Frequent Songs** - Songs played rarely on this tour
- **Song Frequency Distribution** - Histogram of how many times each song appeared

**Status:** ❌ Only basic counts captured; sophisticated variety metrics missing

---

## 4. Songs Debuted Per Tour

### Pages Examined:
- `TourShowInfo.aspx?tid=XXX` - Tour detail pages
- `TourStats.aspx?tid=XXX` - Tour statistics pages

### Data Available:

#### Debut Information:
- **Songs with First Performance on Tour** - Available on TourStats pages
  - Song title
  - Debut date and venue
  - Set position
  - Guest participants (if applicable)

#### Associated Metrics:
- **Debut Count per Tour** - Total new songs debuted
- **Debut Timing** - Debut distributions (early/late in tour)
- **Debut Success Rate** - Songs debuted that became recurring

**Current Capture Status:** ❌ NOT captured at all
- No debut tracking in `ScrapedTourDetailed`
- No song debut metadata linked to tours
- No analysis of debut patterns

**Derivable from Song Statistics:**
Using the `ScrapedSong` interface, first debut dates CAN be compared to tour dates, but tour-specific debut counts are not pre-computed.

---

## 5. Songs Retired Per Tour

### Pages Examined:
- `TourStats.aspx?tid=XXX` - Tour statistics (implicit in trends)
- `SongStats.aspx?sid=XXX` - Song-level statistics

### Data Available:

#### Retirement Indicators:
- **Last Performance Per Song** - Last date played before gap
- **Current Gap** - Days/shows since last performance
- **Retirement Flags** - Songs no longer in active rotation

#### Tour-Specific Context:
- **Songs Played Last on Tour** - Which songs ended their touring run during a specific tour
- **End-of-Tour Retirement Patterns** - Songs dropped between touring eras

**Current Capture Status:** ❌ NOT captured at tour level
- Song-level gap data exists in `SongStatistics` (captures `currentGap`)
- No tour-level aggregation of retirements
- No tracking of songs that had their "last ever" or "last for X years" performance on a tour

**Gap:** Need to correlate song last-played dates with tour end dates to identify retirements per tour.

---

## 6. Average Show Length Per Tour

### Pages Examined:
- `TourShowInfo.aspx?tid=XXX` - Individual show lengths listed in table

### Data Available:

#### Show Duration Metrics:
- **Longest Show** - Duration in HH:MM:SS format with date/venue
- **Shortest Show** - Duration in HH:MM:SS format with date/venue
- **Average Show Length** - Mean duration across tour
- **Median Show Length** - Middle value of durations
- **Standard Deviation** - Variability in show lengths

#### Per-Show Duration:
Each show is listed with "Show Length" in hours:minutes:seconds format, enabling:
- Tour average calculation
- Trend analysis (getting longer/shorter)
- Set length comparisons

**Current Capture Status:** ❌ NOT captured at all
- Individual show durations not extracted
- No tour-level duration statistics
- No aggregation of show lengths

**Data Availability:** 🔴 Critical issue - durations are scattered across individual show pages, not aggregated on tour page. Scraper would need to:
1. Extract duration from each show row on `TourShowInfo.aspx`
2. Calculate statistics (mean, median, min, max, stddev)
3. Store in tour object

---

## 7. Tour Routing & Geographic Data

### Pages Examined:
- `TourShowInfo.aspx?tid=XXX` - Show list with venue locations
- `TourShow.aspx` - Master tour list

### Data Available:

#### Geographic Distribution:
Each show lists:
- **City** - Performance location
- **State** (for USA shows)
- **Country** - International indicator
- **Venue Name** - Specific venue

Extractable Metrics:
- **Unique Venues Count** - ✅ Partially captured as `venueCount`
- **States Visited** - Count of unique US states
- **Countries Visited** - Count of unique countries
- **Cities Visited** - Count of unique cities
- **Venue Revisits** - How many venues played multiple times on tour

#### Geographic Routing Patterns:
- **Route Efficiency** - Geographic clustering/continuity
- **North/South/East/West Regional Breakdown** - Distribution by region
- **International vs Domestic Split** - Percentage breakdown
- **Tour Legs** - Natural geographic clusters within tour
- **Distance Between Shows** - Consecutive venue spacing (requires geo coordinates)

**Current Capture Status:**
- ✅ `venueCount` captured
- ❌ No state/country/city breakdown
- ❌ No routing analysis
- ❌ No geographic clustering data
- ❌ No tour legs identification
- ❌ No distance calculations

**Critical Gap:** No geographic coordinates captured, making routing analysis impossible. Would need:
1. Venue latitude/longitude from `VenueStats.aspx`
2. Route continuity analysis (haversine distance between consecutive shows)
3. Geographic clustering algorithm to identify tour legs

---

## 8. Additional Tour-Level Statistics Found

### Performance Type Breakdown (from `TourShowInfo.aspx?tid=1`):

Available counts by show type:
- **Dave Solo Appearances** - Count
- **Band Performances** - Full band shows
- **Festival Appearances** - Festival shows
- **Television Performances** - TV tapings
- **Radio Performances** - Radio shows
- **Benefit Concerts** - Benefit shows
- **Other Special Events**

**Current Capture Status:** ❌ NOT captured
- No distinction between full band vs solo vs special
- No show type categorization
- No performance context metadata

---

### Song Performance Positioning (from `TourStats.aspx`):

- **Top Opener** - Most frequent opener song (e.g., "Warehouse 4x")
- **Top Closer** - Most frequent closer (e.g., "Tripping Billies 7x")
- **Top Encore** - Most frequent encore song (e.g., "Peace on Earth 9x")

**Current Capture Status:** ❌ NOT captured at tour level
- Individual songs have `slotBreakdown` in `SongStatistics`
- No per-tour aggregation of slot patterns
- Top positions per tour not calculated

---

### Notable Performances (from `TourStats.aspx`):

- **Longest Performances** - Extended versions with duration, date, song
  - Example: "Seek Up (19:44) on 7/25"
- **Teases/Partial Performances** - Incomplete song performances
- **Song Liberations** - Previously unplayed songs revived
  - Days since last performance
  - Show count gap
  - Example: "American Baby: 4,111 days since last performance"

**Current Capture Status:**
- ✅ Liberations partially captured in `SongStatistics.liberations`
- ❌ Tour-specific liberation highlights not captured
- ❌ Tour's "longest performances" not aggregated
- ❌ Liberation rankings per tour not captured

---

## 9. Completion & Data Quality Metrics

### From `TourShow.aspx`:

Each tour shows a **Completion %** field indicating:
- Likely: What percentage of setlist data is available
- Ranges: 0-100% (some tours 100%, older tours lower)

**Current Capture Status:** ❌ NOT captured
- No data quality indicator
- No completeness metric
- No way to filter by data reliability

---

## 10. Tour Aggregation Levels Not Currently Captured

### Year Totals (from `TourShow.aspx`):
The site displays rollup statistics:
```
83 total tours
3,578 total shows
448 unknown
63 cancelled
120 rescheduled
```

**Current Capture Status:** ❌ NOT captured as a unified dataset
- Can be derived from scraping all tours
- But not pre-aggregated in source

---

## Summary Table: Capture Status by Statistic

| Statistic | Currently Captured | Source URL | Data Type | Priority |
|-----------|-------------------|-----------|-----------|----------|
| Show Count | ✅ | TourShowInfo | Integer | HIGH |
| Unknown Shows | ❌ | TourShow | Integer | MEDIUM |
| Cancelled Shows | ❌ | TourShow | Integer | MEDIUM |
| Rescheduled Shows | ❌ | TourShow | Integer | MEDIUM |
| Completion % | ❌ | TourShow | Float | LOW |
| Unique Venues | ✅ Partial | TourShowInfo | Integer | HIGH |
| Unique Songs | ✅ | TourStats | Integer | HIGH |
| Total Song Perfs | ✅ | TourStats | Integer | HIGH |
| Avg Songs/Show | ✅ | TourStats | Float | HIGH |
| Start Date | ✅ | TourShowInfo | Date | HIGH |
| End Date | ✅ | TourShowInfo | Date | HIGH |
| **MISSING:** |  |  |  |  |
| States Visited | ❌ | TourShowInfo | Integer | MEDIUM |
| Countries Visited | ❌ | TourShowInfo | Integer | MEDIUM |
| Cities Visited | ❌ | TourShowInfo | Integer | MEDIUM |
| Songs Debuted | ❌ | TourStats | Integer | MEDIUM |
| Song Debuts Detail | ❌ | TourStats | Array | MEDIUM |
| Songs Retired | ❌ | TourStats | Integer | MEDIUM |
| Song Retirements Detail | ❌ | TourStats | Array | LOW |
| Avg Show Length | ❌ | TourShowInfo | Duration | MEDIUM |
| Longest Show | ❌ | TourShowInfo | Object | LOW |
| Shortest Show | ❌ | TourShowInfo | Object | LOW |
| Top Opener Song | ❌ | TourStats | String | MEDIUM |
| Top Closer Song | ❌ | TourStats | String | MEDIUM |
| Top Encore Song | ❌ | TourStats | String | MEDIUM |
| Show Type Breakdown | ❌ | TourShowInfo | Object | MEDIUM |
| Rarity Index | ❌ | TourStats | Float | LOW |
| Setlist Variation | ❌ | TourStats | Float | LOW |
| Geographic Clustering | ❌ | TourShowInfo | Object | LOW |
| Top Liberations | ❌ | TourStats | Array | LOW |
| Performance Context | ❌ | TourShowInfo | Object | MEDIUM |

---

## Technical Challenges & Observations

### Challenge 1: Aggregation vs. Detail
The current scraper successfully extracts show-level data, but tour-level aggregations require:
- Iterating through all shows in a tour
- Computing statistics across the set
- Grouping by geographic regions, show types, etc.

**Solution:** Compute derived metrics in `parseTourPage()` by analyzing the extracted shows.

### Challenge 2: Geographic Data
Geographic routing analysis requires:
- Venue coordinates (latitude/longitude)
- Either scraped from venue detail pages OR externally geocoded
- Distance calculations between consecutive shows

**Current State:** Not attempted in existing scraper.

### Challenge 3: Show Duration Extraction
Show durations are listed on tour info pages but need to be:
1. Located in table cells (pattern: "HH:MM:SS")
2. Parsed into seconds
3. Aggregated (mean, median, min, max)

**Current State:** Not in `parseTourPage()`.

### Challenge 4: Performance Type Classification
Performance type requires parsing show metadata or notes:
- Looking for keywords: "live band", "solo", "television", "festival", "benefit"
- May require additional scraping of individual show pages
- Or reading from show context in tour listings

**Current State:** Not categorized.

### Challenge 5: Song Debut/Retirement Tracking
Would require:
1. Song-level first/last play dates (available from `SongStats.aspx`)
2. Comparing against tour date range
3. Identifying debuts and final performances per tour

**Current State:** No cross-reference between songs and tour debuts.

---

## Data Model Implications

### Current `ScrapedTourDetailed` Interface:
```typescript
export interface ScrapedTourDetailed {
  originalId: string;
  name: string;
  slug: string;
  year: number;
  startDate?: string;
  endDate?: string;
  showCount: number;
  venueCount?: number;
  songCount?: number;
  totalSongPerformances?: number;
  averageSongsPerShow?: number;
  topSongs?: { title: string; playCount: number }[];
  notes?: string;
}
```

### Proposed Expanded Interface:
```typescript
export interface ScrapedTourDetailed {
  // Current fields
  originalId: string;
  name: string;
  slug: string;
  year: number;
  startDate?: string;
  endDate?: string;

  // Show statistics
  showCount: number;
  unknownShows?: number;
  cancelledShows?: number;
  rescheduledShows?: number;
  completionPercentage?: number;

  // Venue statistics
  venueCount?: number;
  statesVisited?: number;
  countriesVisited?: number;
  citiesVisited?: number;

  // Song statistics
  songCount?: number;
  totalSongPerformances?: number;
  averageSongsPerShow?: number;
  songsDebuted?: number;
  songsDebutDetail?: Array<{
    songTitle: string;
    debutDate: string;
    debutVenue: string;
  }>;
  songsRetired?: number;

  // Performance statistics
  averageShowLength?: number;  // in seconds
  longestShow?: {
    duration: number;
    date: string;
    venue: string;
  };
  shortestShow?: {
    duration: number;
    date: string;
    venue: string;
  };

  // Setlist patterns
  topOpener?: string;
  topCloser?: string;
  topEncore?: string;

  // Show type breakdown
  showTypeBreakdown?: {
    fullBand?: number;
    daveSolo?: number;
    festival?: number;
    television?: number;
    radio?: number;
    benefit?: number;
  };

  // Current implementation
  topSongs?: { title: string; playCount: number }[];
  notes?: string;
}
```

---

## Recommendations: Priority for Implementation

### PHASE 1 (High Impact, Medium Effort):
1. **Show type breakdown** - Easy to add from existing tour page parsing
2. **States/Countries/Cities visited** - Parse venue location from each show
3. **Unknown/Cancelled/Rescheduled counts** - Available on TourShow.aspx overview
4. **Top Opener/Closer/Encore** - Parse from TourStats.aspx
5. **Completion percentage** - Available on TourShow.aspx

### PHASE 2 (Medium Impact, Higher Effort):
6. **Average show length** - Extract duration from TourShowInfo.aspx table
7. **Songs debuted** - Cross-reference with SongStats first-play dates
8. **Song liberation highlights** - Parse from TourStats.aspx
9. **Rarity index** - Calculate from setlist data

### PHASE 3 (Lower Priority, High Effort):
10. **Geographic routing analysis** - Requires venue coordinates
11. **Setlist variation metrics** - Complex algorithmic calculation
12. **Geographic clustering/tour legs** - Requires advanced analysis

---

## Code Changes Needed

### File: `tours.ts`

**In `parseTourPage()` function:**
1. Add parsing for unknown/cancelled/rescheduled from TourShow.aspx overview
2. Extract completion percentage
3. Extract duration from show table cells
4. Identify top opener/closer/encore songs
5. Add show type classification logic

**New calculations:**
```typescript
// Extract from table rows
const showDurations: number[] = [];
$("table tr").each((_, row) => {
  const durationText = $(row).find("td").filter((_, td) => {
    return /\d{1,2}:\d{2}:\d{2}/.test($(td).text());
  }).text().trim();
  if (durationText) {
    const [h, m, s] = durationText.split(":").map(Number);
    showDurations.push(h * 3600 + m * 60 + s);
  }
});

if (showDurations.length > 0) {
  const avg = showDurations.reduce((a, b) => a + b) / showDurations.length;
  tour.averageShowLength = Math.round(avg);
  tour.longestShow = {
    duration: Math.max(...showDurations),
    date: "...", // Extract from row
    venue: "..."  // Extract from row
  };
}
```

### File: `types.ts`

Extend `ScrapedTourDetailed` interface with missing fields (see "Proposed Expanded Interface" above).

---

## Conclusion

The investigation reveals that **dmbalmanac.com contains significantly richer tour-level statistics than currently captured**. The site tracks at least 30+ distinct metrics per tour, while the scraper currently captures only ~8-10.

**Quick wins** (Phase 1) could add 10-12 new metrics with minimal code changes by parsing data already visible on the current pages. **Phase 2** would require extracting additional data from dedicated statistics pages. **Phase 3** metrics would need external data sources (geographic coordinates) or complex algorithms.

The investigation is complete and ready for implementation prioritization.
