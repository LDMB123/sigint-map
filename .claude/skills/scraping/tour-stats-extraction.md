---
name: tour-stats-extraction
version: 1.0.0
description: **Purpose:** Technical guide for extracting missing tour-level statistics from dmbalmanac.com HTML structures
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: scraping
complexity: advanced
tags:
  - scraping
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/docs/scraping/TOUR_STATS_EXTRACTION_GUIDE.md
migration_date: 2026-01-25
---

# Tour Statistics: HTML Extraction Patterns & URL Reference

**Purpose:** Technical guide for extracting missing tour-level statistics from dmbalmanac.com HTML structures

---

## Overview of Tour-Related URLs

### Master Tour Lists
```
https://dmbalmanac.com/TourShow.aspx
  → Overview of all tours with status metrics (shows/unknown/cancelled/rescheduled)

https://dmbalmanac.com/TourShow.aspx?where=YYYY
  → Tours by year, with categorical breakdowns
```

### Individual Tour Pages
```
https://dmbalmanac.com/TourShowInfo.aspx?tid=XXX
  → List of all shows in a tour with dates, venues, locations, durations

https://dmbalmanac.com/TourStats.aspx?tid=XXX
  → Aggregated statistics: song plays, openers, closers, encores, liberations
```

### Shows (for reference)
```
https://dmbalmanac.com/ShowSetlist.aspx?id=XXX
  → Individual show setlist (for extracting duration if needed)
```

---

## 1. Unknown/Cancelled/Rescheduled Show Counts

### Location: `TourShow.aspx` (Master Tour List)
### Data Shown: Table with columns for Shows, Unknown, Cancelled, Rescheduled

**HTML Pattern:**
```html
<table>
  <tr>
    <td>[Tour Name Link]</td>
    <td align="right">35</td>      <!-- Shows -->
    <td align="right">2</td>       <!-- Unknown -->
    <td align="right">1</td>       <!-- Cancelled -->
    <td align="right">0</td>       <!-- Rescheduled -->
    <td align="right">95%</td>     <!-- Completion -->
  </tr>
</table>
```

**Cheerio Extraction:**
```typescript
// In parseTourPage() - first fetch TourShow.aspx?where=YYYY for the year
const tourOverviewUrl = `${BASE_URL}/TourShow.aspx?where=${year}`;
let html = getCachedHtml(tourOverviewUrl);
if (!html) {
  await page.goto(tourOverviewUrl, { waitUntil: "networkidle" });
  html = await page.content();
  cacheHtml(tourOverviewUrl, html);
}

const $ = cheerio.load(html);
let unknownShows = 0;
let cancelledShows = 0;
let rescheduledShows = 0;
let completionPercentage = 0;

// Find the row matching this tour ID
$("a[href*='TourShowInfo.aspx?tid=" + tourId + "']").closest("tr").each((_, row) => {
  const cells = $(row).find("td");
  if (cells.length >= 5) {
    // Cells: [0]=name, [1]=shows, [2]=unknown, [3]=cancelled, [4]=rescheduled, [5]=completion
    unknownShows = parseInt(cells.eq(2).text().trim(), 10) || 0;
    cancelledShows = parseInt(cells.eq(3).text().trim(), 10) || 0;
    rescheduledShows = parseInt(cells.eq(4).text().trim(), 10) || 0;

    const completionText = cells.eq(5).text().trim(); // "95%"
    completionPercentage = parseInt(completionText, 10) || 0;
  }
});
```

**Notes:**
- Numbers might be right-aligned
- Percentages include the "%" symbol
- Some tours may have 0 values
- May be sorted by tour within year groups

---

## 2. Geographic Distribution: States, Countries, Cities

### Location: `TourShowInfo.aspx?tid=XXX` (Individual Show Listing)
### Data Shown: Show table with columns for Date, Venue, City, State, Country

**HTML Pattern:**
```html
<table>
  <tr>
    <td>05.01.25</td>
    <td><a href="VenueStats.aspx?vid=123">Red Rocks Amphitheatre</a></td>
    <td>Morrison</td>
    <td>CO</td>
    <td>USA</td>
  </tr>
  <tr>
    <td>05.03.25</td>
    <td><a href="VenueStats.aspx?vid=456">Royal Albert Hall</a></td>
    <td>London</td>
    <td></td>  <!-- No state for international -->
    <td>United Kingdom</td>
  </tr>
</table>
```

**Cheerio Extraction:**
```typescript
const states = new Set<string>();
const countries = new Set<string>();
const cities = new Set<string>();

$("table tr").each((_, row) => {
  const cells = $(row).find("td");
  if (cells.length >= 5) {
    const city = normalizeWhitespace(cells.eq(2).text());
    const state = normalizeWhitespace(cells.eq(3).text());
    const country = normalizeWhitespace(cells.eq(4).text());

    if (city) cities.add(city);
    if (state) states.add(state);
    if (country) countries.add(country);
  }
});

const tour: ScrapedTourDetailed = {
  // ... existing fields
  citiesVisited: cities.size,
  statesVisited: states.size,
  countriesVisited: countries.size,
};
```

**Notes:**
- State column may be empty for international shows
- Cities might have duplicates at different spellings (e.g., "São Paulo" vs "Sao Paulo")
- Country field is consistent format
- Row structure may vary if merged cells exist

---

## 3. Show Duration Statistics

### Location: `TourShowInfo.aspx?tid=XXX` (Tour Show Table)
### Data Shown: "Show Length" column in HH:MM:SS format

**HTML Pattern:**
```html
<table>
  <tr>
    <td>05.01.25</td>
    <td><a href="VenueStats.aspx?vid=123">Red Rocks</a></td>
    <td>Morrison, CO</td>
    <td>1:42:31</td>  <!-- Show Length -->
  </tr>
  <tr>
    <td>05.03.25</td>
    <td><a href="VenueStats.aspx?vid=456">Royal Albert Hall</a></td>
    <td>London, UK</td>
    <td>2:05:18</td>
  </tr>
</table>
```

**Cheerio Extraction:**
```typescript
const durations: number[] = [];
const durationsByShow: Array<{date: string; venue: string; duration: number}> = [];

$("table tr").each((_, row) => {
  const cells = $(row).find("td");
  const dateText = cells.eq(0).text().trim();
  const venueLink = cells.eq(1).find("a").first().text().trim();

  // Find the duration cell (pattern: DD:MM:SS or HH:MM:SS)
  let durationSeconds = 0;
  cells.each((i, cell) => {
    const text = $(cell).text().trim();
    const match = text.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, h, m, s] = match.map(Number);
      durationSeconds = h * 3600 + m * 60 + s;
      durations.push(durationSeconds);

      durationsByShow.push({
        date: dateText,
        venue: venueLink,
        duration: durationSeconds
      });
    }
  });
});

if (durations.length > 0) {
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const medianDuration = durations.length % 2 === 0
    ? (sortedDurations[durations.length / 2 - 1] + sortedDurations[durations.length / 2]) / 2
    : sortedDurations[Math.floor(durations.length / 2)];
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  const longestShowInfo = durationsByShow.find(s => s.duration === maxDuration);
  const shortestShowInfo = durationsByShow.find(s => s.duration === minDuration);

  const tour: ScrapedTourDetailed = {
    // ... existing fields
    averageShowLength: Math.round(avgDuration),
    longestShow: longestShowInfo ? {
      duration: longestShowInfo.duration,
      date: longestShowInfo.date,
      venue: longestShowInfo.venue
    } : undefined,
    shortestShow: shortestShowInfo ? {
      duration: shortestShowInfo.duration,
      date: shortestShowInfo.date,
      venue: shortestShowInfo.venue
    } : undefined,
  };
}
```

**Notes:**
- Duration format is HH:MM:SS or sometimes D:HH:MM
- Some shows may not have duration data (null cells)
- Might appear after venue column or at end of row
- Can look for pattern `/^\d{1,2}:\d{2}:\d{2}$/` to locate

---

## 4. Top Opener/Closer/Encore Songs

### Location: `TourStats.aspx?tid=XXX` (Tour Statistics Page)
### Data Shown: Dedicated sections for "Top Opener", "Top Closer", "Top Encore"

**HTML Pattern:**
```html
<h3>Top Opener</h3>
<p><a href="SongStats.aspx?sid=42">Warehouse</a> (4 times)</p>

<h3>Top Closer</h3>
<p><a href="SongStats.aspx?sid=1">Tripping Billies</a> (7 times)</p>

<h3>Top Encore</h3>
<p><a href="SongStats.aspx?sid=15">Peace on Earth</a> (9 times)</p>
```

**Alternative Pattern:**
```html
<table>
  <tr>
    <th>Top Opener</th>
    <th>Count</th>
  </tr>
  <tr>
    <td><a href="SongStats.aspx?sid=42">Warehouse</a></td>
    <td>4</td>
  </tr>
</table>
```

**Cheerio Extraction:**
```typescript
// Look for h3 or h2 headings containing these keywords
let topOpener: string | undefined;
let topCloser: string | undefined;
let topEncore: string | undefined;

$("h2, h3").each((_, heading) => {
  const text = normalizeWhitespace($(heading).text()).toLowerCase();

  if (text.includes("opener")) {
    const nextLink = $(heading).nextUntil("h2, h3").find("a[href*='SongStats']").first();
    if (nextLink.length) {
      topOpener = normalizeWhitespace(nextLink.text());
    }
  } else if (text.includes("closer")) {
    const nextLink = $(heading).nextUntil("h2, h3").find("a[href*='SongStats']").first();
    if (nextLink.length) {
      topCloser = normalizeWhitespace(nextLink.text());
    }
  } else if (text.includes("encore")) {
    const nextLink = $(heading).nextUntil("h2, h3").find("a[href*='SongStats']").first();
    if (nextLink.length) {
      topEncore = normalizeWhitespace(nextLink.text());
    }
  }
});

const tour: ScrapedTourDetailed = {
  // ... existing fields
  topOpener,
  topCloser,
  topEncore,
};
```

**Notes:**
- Headings might be h2, h3, h4, or divs with class="header"
- Song links use href*='SongStats'
- Play counts appear in parentheses or adjacent cell
- May not always be present if data is sparse

---

## 5. Song Debuts and Retirements

### Location: `TourStats.aspx?tid=XXX` (Tour Statistics) + `SongStats.aspx?sid=XXX` (Song Details)
### Challenge: Song debut/retirement info is not directly on tour page

**Two-Phase Approach:**

#### Phase 1: Get Song Play Data (on TourStats.aspx)
```html
<h3>Most Played Songs</h3>
<table>
  <tr>
    <td><a href="SongStats.aspx?sid=42">Tripping Billies</a></td>
    <td>18</td>
  </tr>
  <tr>
    <td><a href="SongStats.aspx?sid=5">Warehouse</a></td>
    <td>15</td>
  </tr>
</table>
```

#### Phase 2: Cross-Reference with Song First-Play Dates
When scraping `SongStats.aspx?sid=XXX`, capture:
```
- firstPlayedDate: "2025-05-01"
- debutVenue: "Red Rocks Amphitheatre"
```

Then in post-processing:
```typescript
// After scraping all songs, match debuts to tours
const songsDebuted = songs.filter(song => {
  const debutDate = new Date(song.firstPlayedDate);
  const tourStart = new Date(tour.startDate);
  const tourEnd = new Date(tour.endDate);
  return debutDate >= tourStart && debutDate <= tourEnd;
});

const tour: ScrapedTourDetailed = {
  // ... existing fields
  songsDebuted: songsDebuted.length,
  songsDebutDetail: songsDebuted.map(s => ({
    songTitle: s.title,
    debutDate: s.firstPlayedDate,
    debutVenue: s.firstPlayedVenue
  }))
};
```

**Notes:**
- Requires cross-referencing with song data
- Best done in post-processing after all data is scraped
- May need to track debut venue from SongStats pages

---

## 6. Show Type Breakdown

### Location: `TourShowInfo.aspx?tid=XXX` (Tour Show Notes/Details Column)
### Challenge: Show types are contextual, not always explicitly labeled

**Detection Patterns:**

```typescript
const showTypeCounts = {
  fullBand: 0,
  daveSolo: 0,
  festival: 0,
  television: 0,
  radio: 0,
  benefit: 0,
};

$("table tr").each((_, row) => {
  const $row = $(row);
  const noteCell = $row.find("td").last();
  const notesText = normalizeWhitespace(noteCell.text()).toLowerCase();
  const venueText = normalizeWhitespace($row.find("a[href*='VenueStats']").text()).toLowerCase();
  const fullRowText = normalizeWhitespace($row.text()).toLowerCase();

  // Pattern matching for show type
  if (notesText.includes("television") ||
      notesText.includes("saturday night live") ||
      notesText.includes("letterman") ||
      notesText.includes("mtv") ||
      venueText.includes("studio")) {
    showTypeCounts.television++;
  } else if (notesText.includes("festival") ||
             notesText.includes("jazz fest") ||
             notesText.includes("music festival")) {
    showTypeCounts.festival++;
  } else if (notesText.includes("benefit") ||
             notesText.includes("charity")) {
    showTypeCounts.benefit++;
  } else if (notesText.includes("radio") ||
             notesText.includes("broadcast")) {
    showTypeCounts.radio++;
  } else if (notesText.includes("solo")) {
    showTypeCounts.daveSolo++;
  } else if (!notesText.includes("cancelled")) {
    showTypeCounts.fullBand++;
  }
});

const tour: ScrapedTourDetailed = {
  // ... existing fields
  showTypeBreakdown: showTypeCounts,
};
```

**Notes:**
- Requires contextual detection, not always explicit
- May need to examine venue name and notes
- Some shows may have multiple categories
- Pattern matching prone to false positives

---

## 7. Song Liberations (Highlight List)

### Location: `TourStats.aspx?tid=XXX` (Tour Statistics Page)
### Data Shown: "Song Liberations" section with dates and gaps

**HTML Pattern:**
```html
<h3>Song Liberations</h3>
<table>
  <tr>
    <td><a href="SongStats.aspx?sid=100">American Baby</a></td>
    <td>4,111 days</td>
    <td>5/15/25</td>
  </tr>
  <tr>
    <td><a href="SongStats.aspx?sid=200">I Did It</a></td>
    <td>3,692 days</td>
    <td>5/20/25</td>
  </tr>
</table>
```

**Cheerio Extraction:**
```typescript
const topLiberations: Array<{
  songTitle: string;
  daysSince: number;
  liberationDate: string;
}> = [];

// Find liberations section
$("h2, h3").each((_, heading) => {
  const text = normalizeWhitespace($(heading).text()).toLowerCase();
  if (text.includes("liberation")) {
    const table = $(heading).nextUntil("h2, h3").find("table").first();
    table.find("tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 3) {
        const songLink = $(cells.eq(0)).find("a[href*='SongStats']");
        const daysText = normalizeWhitespace(cells.eq(1).text());
        const dateText = normalizeWhitespace(cells.eq(2).text());

        if (songLink.length) {
          const dayMatch = daysText.match(/(\d+)/);
          if (dayMatch) {
            topLiberations.push({
              songTitle: normalizeWhitespace(songLink.text()),
              daysSince: parseInt(dayMatch[1], 10),
              liberationDate: dateText,
            });
          }
        }
      }
    });
  }
});

// Maybe limit to top 5
const tour: ScrapedTourDetailed = {
  // ... existing fields
  topLiberations: topLiberations.slice(0, 5),
};
```

**Notes:**
- Might not be present on all tours
- Days format could be "4,111 days" or "4111 days"
- Dates might be in MM/DD/YY or MM/DD/YYYY format
- May be displayed in paragraph form or table form

---

## 8. Rarity Index

### Location: `TourStats.aspx?tid=XXX` (Tour Statistics Page)
### Metric Definition: How often average songs from this tour were played (lower = more rare)

**HTML Pattern:**
```html
<p>Average Rarity Index: 2.5</p>
<!-- or -->
<table>
  <tr>
    <th>Rarity Index</th>
    <td>2.5</td>
  </tr>
</table>
```

**Cheerio Extraction:**
```typescript
let rarityIndex: number | undefined;

const pageText = $("body").text();
const rarityMatch = pageText.match(/(?:average\s+)?rarity\s+(?:index)?:?\s*(\d+\.?\d*)/i);
if (rarityMatch) {
  rarityIndex = parseFloat(rarityMatch[1]);
}

const tour: ScrapedTourDetailed = {
  // ... existing fields
  rarityIndex,
};
```

**Notes:**
- May not be prominent on page
- Might be calculated on-demand by site JavaScript
- If not found via regex, check for "setlist variation" metrics
- Lower number = songs are rarer (played at fewer shows)

---

## 9. Integration Points

### Current Scraper Flow:
```
1. getAllTourIds()
   ↓ Scans TourShow.aspx?where=YYYY for each year
   ↓ Extracts tour IDs and names
2. parseTourPage(tourId, tourName, year)
   ↓ Fetches TourShowInfo.aspx?tid=XXX
   ↓ Extracts current fields
3. saveTours()
   ↓ Writes tours.json
```

### Proposed Enhanced Flow:
```
1. getAllTourIds()
   ↓ [ENHANCE] Also fetch TourShow.aspx overview data
   ↓ Extract unknown/cancelled/rescheduled per tour
   ↓ Extract completion percentages
2. parseTourPage(tourId, tourName, year)
   ↓ Fetch TourShowInfo.aspx?tid=XXX
   ↓ [ENHANCE] Extract city/state/country for geographic metrics
   ↓ [ENHANCE] Extract durations and compute statistics
   ↓ Fetch TourStats.aspx?tid=XXX (new)
   ↓ [ENHANCE] Extract opener/closer/encore songs
   ↓ [ENHANCE] Extract liberation data
   ↓ [ENHANCE] Extract rarity index
3. postProcessing(allTours, allSongs)
   ↓ [NEW] Cross-reference song debuts with tour date ranges
   ↓ [NEW] Cross-reference song retirements with tour end dates
   ↓ Enhance tour records with derived metrics
4. saveTours()
   ↓ Writes enriched tours.json
```

---

## 10. Error Handling & Edge Cases

### Missing Data Patterns:
```typescript
// Handle when fields might not exist
const extractDuration = (text: string): number | null => {
  const match = text.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, h, m, s] = match.map(Number);
  return h * 3600 + m * 60 + s;
};

// Handle tours with no shows
if (showDates.length === 0) {
  console.warn(`Tour ${tourId} has no show dates`);
  return null; // or return minimal tour object
}

// Handle missing venue information
const city = cells.eq(2).text().trim() || "Unknown";
const country = cells.eq(4).text().trim() || "Unknown";

// Handle canceled/rescheduled markers
const isCancelled = rowText.includes("CANCELLED") || rowText.includes("[X]");
if (isCancelled) {
  cancelledShows++;
  return; // Skip this row from counts
}
```

### Null/Undefined Handling:
```typescript
const tour: ScrapedTourDetailed = {
  originalId: tourId,
  name: finalTourName,
  slug: slugify(finalTourName),
  year: year,
  startDate: startDate || undefined,
  endDate: endDate || undefined,
  showCount: showCount || 0,
  venueCount: venueCount > 0 ? venueCount : undefined,
  songCount: songCount > 0 ? songCount : undefined,
  // ... only include if data was found
  unknownShows: unknownShows > 0 ? unknownShows : undefined,
  cancelledShows: cancelledShows > 0 ? cancelledShows : undefined,
  averageShowLength: durations.length > 0 ? avgLength : undefined,
};
```

---

## Summary: Extraction Precedence

| Field | Page | Pattern | Difficulty | Notes |
|-------|------|---------|------------|-------|
| unknownShows | TourShow | Table cell regex | Easy | Numeric |
| cancelledShows | TourShow | Table cell regex | Easy | Numeric |
| rescheduledShows | TourShow | Table cell regex | Easy | Numeric |
| completionPercentage | TourShow | Table cell regex | Easy | Percentage string |
| citiesVisited | TourShowInfo | Text pattern | Easy | Unique city count |
| statesVisited | TourShowInfo | Text pattern | Easy | Unique state count |
| countriesVisited | TourShowInfo | Text pattern | Easy | Unique country count |
| averageShowLength | TourShowInfo | Duration pattern | Medium | Requires aggregation |
| longestShow | TourShowInfo | Duration pattern | Medium | Find max + metadata |
| shortestShow | TourShowInfo | Duration pattern | Medium | Find min + metadata |
| topOpener | TourStats | Heading+link | Medium | Heading context |
| topCloser | TourStats | Heading+link | Medium | Heading context |
| topEncore | TourStats | Heading+link | Medium | Heading context |
| songsDebuted | SongStats | Cross-reference | Hard | Post-processing |
| showTypeBreakdown | TourShowInfo | Text pattern | Hard | Pattern matching |
| topLiberations | TourStats | Table pattern | Medium | Heading context |
| rarityIndex | TourStats | Text pattern | Medium | Regex search |

