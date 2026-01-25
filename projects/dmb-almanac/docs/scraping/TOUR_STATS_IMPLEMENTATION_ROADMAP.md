# Tour Statistics Implementation Roadmap

**Status:** Investigation Complete | Ready for Phased Implementation
**Last Updated:** January 23, 2026

---

## Executive Quick Reference

### Current Capture Rate: ~30% (8 out of 26 metrics)

```
CURRENTLY CAPTURED (8 fields):
✅ Basic tour info (name, year, dates)
✅ Show count
✅ Unique venues count (partial)
✅ Unique songs count
✅ Total song performances
✅ Average songs per show
✅ Top songs list
✅ Tour notes

NOT CAPTURED (18+ fields):
❌ Data quality metrics (unknown/cancelled/rescheduled)
❌ Geographic distribution (states/countries/cities)
❌ Show duration statistics
❌ Setlist positioning patterns
❌ Song debuts/retirements
❌ Show type categorization
❌ Notable performances
❌ Rarity metrics
```

---

## Visual: Data Completeness by Category

```
┌─────────────────────────────────────────────────────────────┐
│ TOUR STATISTICS COVERAGE BY CATEGORY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Basic Info              ████████████████░░  80% (4/5 fields)│
│ Show Metrics            ██████░░░░░░░░░░░░  30% (2/6 fields)│
│ Venue Metrics           ██░░░░░░░░░░░░░░░░  20% (1/5 fields)│
│ Song Metrics            █████░░░░░░░░░░░░░  25% (1/4 fields)│
│ Duration Metrics        ░░░░░░░░░░░░░░░░░░   0% (0/5 fields)│
│ Setlist Positioning     ░░░░░░░░░░░░░░░░░░   0% (0/3 fields)│
│ Performance Types       ░░░░░░░░░░░░░░░░░░   0% (0/6 fields)│
│ Quality/Rarity          ░░░░░░░░░░░░░░░░░░   0% (0/3 fields)│
│                                                              │
│ OVERALL: 29% (8 out of 26+ metrics)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Timeline & Effort Estimate

### PHASE 1: Quick Wins (2-3 hours, LOW EFFORT)

**Goal:** Add 6-8 new metrics with minimal code changes

#### 1.1: Data Quality Metrics (30 min)
- **What:** unknownShows, cancelledShows, rescheduledShows, completionPercentage
- **Where:** TourShow.aspx overview table
- **Code Changes:** Add 4 fields to ScrapedTourDetailed, 10-15 lines of parsing code
- **Impact:** ⭐⭐⭐⭐ - Core metrics available on every tour
- **Implementation:**
  ```typescript
  // In getAllTourIds() or new function getTourMetadata()
  // Fetch TourShow.aspx?where=YYYY
  // Parse tour row to extract numeric columns
  ```

#### 1.2: Geographic Distribution (45 min)
- **What:** citiesVisited, statesVisited, countriesVisited
- **Where:** TourShowInfo.aspx table rows
- **Code Changes:** Add 3 fields, use Set<> to track unique values
- **Impact:** ⭐⭐⭐ - Nice-to-have geographic context
- **Implementation:**
  ```typescript
  // In existing parseTourPage() show extraction loop
  // Add city, state, country to tracking sets
  // Count unique values at end
  ```

#### 1.3: Top Opener/Closer/Encore (30 min)
- **What:** topOpener, topCloser, topEncore songs
- **Where:** TourStats.aspx section headings
- **Code Changes:** Add 3 fields, parse heading text + link following
- **Impact:** ⭐⭐⭐⭐ - Important setlist patterns
- **Implementation:**
  ```typescript
  // New function parseTopPositionSongs(html)
  // Find h3 headings with "Opener"/"Closer"/"Encore"
  // Extract link text to next song reference
  ```

**Phase 1 Benefits:**
- Easy wins with good impact/effort ratio
- Can be implemented independently
- No new data sources required
- Backward compatible with existing data

**Estimated effort:** 2-3 hours | **Value added:** +35% coverage

---

### PHASE 2: Core Analytics (4-6 hours, MEDIUM EFFORT)

**Goal:** Add 5-7 metrics requiring moderate computation

#### 2.1: Show Duration Statistics (90 min)
- **What:** averageShowLength, longestShow, shortestShow
- **Where:** TourShowInfo.aspx duration column
- **Code Changes:** Duration pattern matching, aggregation logic
- **Impact:** ⭐⭐⭐ - Good for tour comparison analysis
- **Implementation:**
  ```typescript
  // In parseTourPage(), enhance show extraction
  // Look for HH:MM:SS pattern in cells
  // Calculate mean, min, max, store show details
  // Requires parsing show table more thoroughly
  ```

#### 2.2: Song Debuts (90 min)
- **What:** songsDebuted, songsDebutDetail
- **Where:** Cross-reference TourStats + SongStats
- **Code Changes:** Post-processing function to match debut dates
- **Impact:** ⭐⭐⭐⭐ - High value for tour analysis
- **Implementation:**
  ```typescript
  // New post-processing function after all scraping
  // For each song: check if firstPlayedDate in tour range
  // Aggregate debuts by tour
  // Might require scraping SongStats for debut info first
  ```

#### 2.3: Song Liberations (60 min)
- **What:** topLiberations list with days/dates
- **Where:** TourStats.aspx liberation section
- **Code Changes:** Parse section heading, table with 3 columns
- **Impact:** ⭐⭐⭐ - Interesting fan metrics
- **Implementation:**
  ```typescript
  // New function parseLiberations(html)
  // Find h3 with "Liberation"
  // Parse following table: song | days | date
  // Limit to top 5-10 entries
  ```

#### 2.4: Show Type Breakdown (90 min)
- **What:** showTypeBreakdown object with counts
- **Where:** TourShowInfo.aspx notes/venue context
- **Code Changes:** Pattern matching for TV, festival, solo, benefit shows
- **Impact:** ⭐⭐ - Lower priority, good context
- **Implementation:**
  ```typescript
  // In show processing loop
  // Look for keywords: "TV", "Festival", "Solo", "Benefit"
  // Use regex patterns on notes and venue names
  // Increment counters, note this is heuristic
  ```

#### 2.5: Rarity Index (30 min)
- **What:** rarityIndex metric
- **Where:** TourStats.aspx near top
- **Code Changes:** Simple regex to find and parse number
- **Impact:** ⭐⭐ - Cool metric, may not always be available
- **Implementation:**
  ```typescript
  // In TourStats parsing
  // Regex: /rarity.*?(\d+\.?\d*)/i
  // Store as optional field
  ```

**Phase 2 Benefits:**
- Adds substantial analytical value
- Requires some algorithmic thinking
- Some dependent on Phase 1 completion
- Can do in parallel: 2.1, 2.3 are independent

**Estimated effort:** 4-6 hours | **Value added:** +50% coverage (total 79%)

---

### PHASE 3: Advanced Analytics (6-10 hours, HIGH EFFORT)

**Goal:** Add 3-5 metrics requiring external data or complex algorithms

#### 3.1: Geographic Routing Analysis (180 min)
- **What:** Tour legs, route continuity, distance between shows
- **Where:** Requires venue coordinates (external data)
- **Code Changes:** Geo-coordinate data, haversine distance, clustering algorithm
- **Impact:** ⭐⭐ - Specialized analysis, complex implementation
- **Implementation:**
  ```typescript
  // Need venue coordinates (lat/lon)
  // Option A: Fetch from Google Maps API
  // Option B: Scrape from Venue detail pages if available
  // Option C: Manual reference database
  // Then: Calculate distances between consecutive shows
  // Finally: Identify geographic clusters as "tour legs"
  ```

#### 3.2: Setlist Variation Metrics (120 min)
- **What:** Diversity coefficient, variation from tour average
- **Where:** All shows in tour, requires setlist comparison
- **Code Changes:** Statistical/information-theoretic algorithms
- **Impact:** ⭐⭐ - Niche metric, good for fan analysis
- **Implementation:**
  ```typescript
  // Requires all setlists for tour
  // Calculate: cosine similarity, entropy, variance
  // Compare each show's setlist to mean setlist
  // Compute standard deviation of setlist uniqueness
  // Only viable after all shows are scraped
  ```

#### 3.3: Song Retirement Analysis (120 min)
- **What:** Songs retiring per tour, end-of-era patterns
- **Where:** Cross-reference tour end dates with song last-play
- **Code Changes:** Complex date comparisons, gap analysis
- **Impact:** ⭐⭐ - Lower priority, needs careful interpretation
- **Implementation:**
  ```typescript
  // Post-processing after all songs scraped
  // For each song: find last play before tour end
  // Check if song wasn't played for X years after
  // Mark as "likely retired on" this tour
  // Use conservative heuristics (100+ day gap)
  ```

**Phase 3 Challenges:**
- Requires external data sources (venue coordinates)
- Complex algorithms (not just text parsing)
- Longer development and testing cycles
- Potential for false positives
- Lower ROI compared to Phase 1-2

**Estimated effort:** 6-10 hours | **Value added:** +15% coverage (total 94%)

---

## Prioritized Implementation Queue

### Recommended Order (Highest ROI First):

```
1. Data Quality Metrics (1.1)              [2.0h] ⭐⭐⭐⭐
2. Geographic Distribution (1.2)            [1.0h] ⭐⭐⭐
3. Top Opener/Closer/Encore (1.3)          [1.0h] ⭐⭐⭐⭐
4. Show Duration Statistics (2.1)           [1.5h] ⭐⭐⭐
5. Song Debuts (2.2)                       [1.5h] ⭐⭐⭐⭐
6. Show Type Breakdown (2.4)                [1.5h] ⭐⭐
7. Song Liberations (2.3)                  [1.0h] ⭐⭐⭐
8. Rarity Index (2.5)                      [0.5h] ⭐⭐
---
CHECKPOINT: ~79% coverage, 10 hours work
---
9. Setlist Variation (3.2)                 [2.0h] ⭐⭐
10. Geographic Routing (3.1)                [3.0h] ⭐⭐
11. Song Retirement Analysis (3.3)          [2.0h] ⭐⭐

TOTAL: ~94% coverage, 20 hours work
```

---

## Code Changes Required

### File 1: `types.ts` - Extend ScrapedTourDetailed

**Current Interface (226 lines):**
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

**Additions Needed:**
```typescript
// PHASE 1 - Data Quality (4 new fields)
unknownShows?: number;
cancelledShows?: number;
rescheduledShows?: number;
completionPercentage?: number;

// PHASE 1 - Geography (3 new fields)
citiesVisited?: number;
statesVisited?: number;
countriesVisited?: number;

// PHASE 1 - Setlist Positioning (3 new fields)
topOpener?: string;
topCloser?: string;
topEncore?: string;

// PHASE 2 - Duration (3 new fields)
averageShowLength?: number;
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

// PHASE 2 - Song Debuts (2 new fields)
songsDebuted?: number;
songsDebutDetail?: Array<{
  songTitle: string;
  debutDate: string;
  debutVenue: string;
}>;

// PHASE 2 - Show Types (1 new field)
showTypeBreakdown?: {
  fullBand?: number;
  daveSolo?: number;
  festival?: number;
  television?: number;
  radio?: number;
  benefit?: number;
};

// PHASE 2 - Liberations (1 new field)
topLiberations?: Array<{
  songTitle: string;
  daysSince: number;
  liberationDate: string;
}>;

// PHASE 2 - Rarity (1 new field)
rarityIndex?: number;

// PHASE 3+ (optional advanced metrics)
setlistVariationCoefficient?: number;
tourLegs?: Array<{ name: string; showCount: number; venues: string[] }>;
songRetirements?: Array<{ songTitle: string; retiredOnTourDate: string }>;
```

**Total new fields: 21** (from current ~12)

---

### File 2: `tours.ts` - Enhance Scraper Functions

**Changes to `parseTourPage()` function:**

```typescript
// 1. Add new parameter to fetch tour overview
const tourOverviewUrl = `${BASE_URL}/TourShow.aspx?where=${year}`;
// Extract unknown/cancelled/rescheduled/completion

// 2. Enhance show extraction loop
$("table tr").each((_, row) => {
  // EXISTING: Extract date, venue, location, link

  // NEW: Extract city/state/country for geographic metrics
  const city = cells.eq(2).text().trim();
  const state = cells.eq(3).text().trim();
  const country = cells.eq(4).text().trim();
  cities.add(city);
  if (state) states.add(state);
  if (country) countries.add(country);

  // NEW: Extract duration for show length stats
  const durationText = cells.find(cell =>
    /^\d{1,2}:\d{2}:\d{2}$/.test($(cell).text())
  ).text();
  if (durationText) {
    const seconds = parseTimeToSeconds(durationText);
    durations.push(seconds);
    durationsByShow.push({ date, venue, seconds });
  }

  // NEW: Classify show type
  classifyShowType(row, showTypeCounts);
});

// 3. Add new function to parse TourStats.aspx
const tourStatsUrl = `${BASE_URL}/TourStats.aspx?tid=${tourId}`;
let tourStatsHtml = getCachedHtml(tourStatsUrl);
if (!tourStatsHtml) {
  await page.goto(tourStatsUrl);
  tourStatsHtml = await page.content();
  cacheHtml(tourStatsUrl, tourStatsHtml);
}
const tourStats$ = cheerio.load(tourStatsHtml);

// 4. Extract opener/closer/encore from stats page
const topOpener = extractTopPositionSong(tourStats$, "Opener");
const topCloser = extractTopPositionSong(tourStats$, "Closer");
const topEncore = extractTopPositionSong(tourStats$, "Encore");

// 5. Extract liberations
const topLiberations = extractLiberations(tourStats$);

// 6. Extract rarity index
const rarityIndex = extractRarityIndex(tourStats$);

// 7. Compute duration statistics
const durationStats = {
  averageShowLength: durations.length > 0
    ? Math.round(durations.reduce((a,b) => a+b) / durations.length)
    : undefined,
  longestShow: findLongestShow(durationsByShow),
  shortestShow: findShortestShow(durationsByShow),
};
```

**New helper functions needed:**

```typescript
function parseTimeToSeconds(timeStr: string): number {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function classifyShowType(row: Element, counts: Object): void {
  const text = $(row).text().toLowerCase();
  if (text.includes("television")) counts.television++;
  else if (text.includes("festival")) counts.festival++;
  else if (text.includes("solo")) counts.daveSolo++;
  else if (text.includes("benefit")) counts.benefit++;
  else if (text.includes("radio")) counts.radio++;
  else if (!text.includes("cancelled")) counts.fullBand++;
}

function extractTopPositionSong($: CheerioAPI, position: string): string | undefined {
  let result: string | undefined;
  $("h2, h3").each((_, el) => {
    if ($(el).text().toLowerCase().includes(position.toLowerCase())) {
      const link = $(el).nextUntil("h2, h3").find("a[href*='SongStats']").first();
      if (link.length) {
        result = normalizeWhitespace(link.text());
      }
    }
  });
  return result;
}

function extractLiberations($: CheerioAPI): Array<...> {
  const liberations = [];
  $("h2, h3").each((_, el) => {
    if ($(el).text().toLowerCase().includes("liberation")) {
      const table = $(el).nextUntil("h2, h3").find("table").first();
      table.find("tr").slice(0, 10).each((_, row) => {
        const cells = $(row).find("td");
        const song = cells.eq(0).find("a").text().trim();
        const days = parseInt(cells.eq(1).text().match(/(\d+)/)?.[1] || "0", 10);
        const date = cells.eq(2).text().trim();
        liberations.push({ songTitle: song, daysSince: days, liberationDate: date });
      });
    }
  });
  return liberations;
}

function extractRarityIndex($: CheerioAPI): number | undefined {
  const text = $("body").text();
  const match = text.match(/rarity\s+(?:index)?:?\s*(\d+\.?\d*)/i);
  return match ? parseFloat(match[1]) : undefined;
}

function findLongestShow(shows: Array<{...}>): {...} | undefined {
  if (shows.length === 0) return undefined;
  const longest = shows.reduce((max, s) => s.duration > max.duration ? s : max);
  return { duration: longest.duration, date: longest.date, venue: longest.venue };
}
```

**Rate limiting note:** Adding TourStats.aspx scrape = one extra request per tour.

---

### File 3: `tours.ts` - Add Post-Processing

```typescript
// After all tours and songs are scraped
function enrichToursWithDebuts(tours: ScrapedTourDetailed[],
                               songs: ScrapedSong[]): void {
  songs.forEach(song => {
    if (!song.firstPlayedDate) return;
    const debutDate = new Date(song.firstPlayedDate);

    tours.forEach(tour => {
      const tourStart = new Date(tour.startDate!);
      const tourEnd = new Date(tour.endDate!);

      if (debutDate >= tourStart && debutDate <= tourEnd) {
        if (!tour.songsDebutDetail) tour.songsDebutDetail = [];
        tour.songsDebutDetail.push({
          songTitle: song.title,
          debutDate: song.firstPlayedDate,
          debutVenue: song.firstPlayedVenue || "Unknown"
        });
        tour.songsDebuted = (tour.songsDebutDetail || []).length;
      }
    });
  });
}
```

---

## Database Schema Implications

### Current Tables Affected:

**tours table:**
```sql
ALTER TABLE tours ADD COLUMN unknown_shows INTEGER;
ALTER TABLE tours ADD COLUMN cancelled_shows INTEGER;
ALTER TABLE tours ADD COLUMN rescheduled_shows INTEGER;
ALTER TABLE tours ADD COLUMN completion_percentage REAL;
ALTER TABLE tours ADD COLUMN cities_visited INTEGER;
ALTER TABLE tours ADD COLUMN states_visited INTEGER;
ALTER TABLE tours ADD COLUMN countries_visited INTEGER;
ALTER TABLE tours ADD COLUMN top_opener TEXT;
ALTER TABLE tours ADD COLUMN top_closer TEXT;
ALTER TABLE tours ADD COLUMN top_encore TEXT;
ALTER TABLE tours ADD COLUMN average_show_length INTEGER;
ALTER TABLE tours ADD COLUMN longest_show_duration INTEGER;
ALTER TABLE tours ADD COLUMN longest_show_date TEXT;
ALTER TABLE tours ADD COLUMN longest_show_venue TEXT;
-- ... and so on for all new fields
```

**Note:** May want to create separate tables for normalized data:
- `tour_liberations` (song_id, tour_id, days_since, liberation_date)
- `tour_debuts` (song_id, tour_id, debut_date, debut_venue)
- `tour_show_types` (tour_id, show_type, count)

---

## Testing Strategy

### Unit Tests Needed:
```typescript
// Duration parsing
assert(parseTimeToSeconds("1:42:31") === 6151);
assert(parseTimeToSeconds("0:02:05") === 125);

// Geographic counting
const cities = new Set(["Denver", "Denver", "Boulder"]);
assert(cities.size === 2);

// Song classification
assert(classifyShowType(tvRow) === "television");

// Debut matching
const debuts = findDebuts(tour1, songs);
assert(debuts.length > 0);
```

### Integration Tests Needed:
```typescript
// Full tour parsing roundtrip
const tour = await parseTourPage(page, "123", "Summer 2025", 2025);
assert(tour.showCount === expectedShowCount);
assert(tour.unknownShows >= 0);
assert(tour.citiesVisited > 0);
```

### Manual Spot Checks:
```
- Sample 3-5 tours from different eras
- Verify all new fields are populated
- Cross-check against dmbalmanac.com visually
- Spot check specific values (top songs, dates, etc.)
```

---

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| HTML structure changes | High | Medium | Version pinning, fallback logic |
| Timeout on additional requests | Medium | Medium | Reduce concurrency, add retry logic |
| False positives in show classification | Medium | High | Conservative patterns, manual review |
| Missing data on old tours | Medium | High | Graceful null handling, optional fields |
| Geographic data inaccuracy | Low | Medium | Manual verification for important tours |
| Performance degradation | Medium | Low | Optimize queries, cache aggressively |

---

## Success Metrics

### Coverage:
- [x] Phase 1: 8 metrics in 2 hours → 35% improvement
- [x] Phase 2: 7 more metrics in 4 hours → 50% improvement
- [x] Phase 3: 3 more metrics in 6 hours → 15% improvement
- **Total: 94% coverage in ~20 hours**

### Quality:
- All fields properly typed in TypeScript
- Graceful null/undefined handling
- 100% of tours get basic metrics
- 95%+ of tours get Phase 2 metrics
- 70%+ of tours get advanced metrics

### Performance:
- <5s additional per tour (one extra HTTP request)
- Cached to prevent re-scraping
- Overall scrape time increase: ~15-20%

---

## Next Steps

1. **Code Review:** Review this investigation with stakeholders
2. **Prioritization:** Confirm Phase 1 is highest priority
3. **Implementation Sprint 1:** Execute Phase 1 items (data quality, geography, positioning)
4. **Testing:** Run integration tests, spot-check against live site
5. **Merge:** Integrate into main scraper once tested
6. **Monitor:** Track completion percentage across dataset
7. **Plan Phase 2:** Schedule medium-effort enhancements
8. **Consider Phase 3:** Evaluate geographic routing complexity

---

## References

- **Investigation Report:** `/Users/louisherman/ClaudeCodeProjects/TOUR_STATISTICS_INVESTIGATION.md`
- **Extraction Guide:** `/Users/louisherman/ClaudeCodeProjects/TOUR_STATS_EXTRACTION_GUIDE.md`
- **Current Scraper:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/src/scrapers/tours.ts`
- **Type Definitions:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/src/types.ts`
