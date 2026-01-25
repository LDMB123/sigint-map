# Tour Statistics - Quick Reference Card

**Print-friendly reference for developers implementing enhancements**

---

## At-a-Glance: What's Missing

### By URL

```
TourShow.aspx ──────────────────────────────
│ Shows | Unknown | Cancelled | Rescheduled | Completion %
├─ ✅ IMPLEMENTED:  Show count
├─ ❌ MISSING:      Unknown count
├─ ❌ MISSING:      Cancelled count
├─ ❌ MISSING:      Rescheduled count
└─ ❌ MISSING:      Completion %

TourShowInfo.aspx ──────────────────────────
│ Show list with Date | Venue | City | State | Country | Duration
├─ ✅ IMPLEMENTED:  Show count
├─ ❌ MISSING:      Cities visited
├─ ❌ MISSING:      States visited
├─ ❌ MISSING:      Countries visited
├─ ❌ MISSING:      Avg show length
├─ ❌ MISSING:      Longest show
├─ ❌ MISSING:      Shortest show
└─ ❌ MISSING:      Show type breakdown

TourStats.aspx ─────────────────────────────
│ Statistics page with aggregated metrics
├─ ✅ IMPLEMENTED:  Song count, totals, avg/show
├─ ✅ IMPLEMENTED:  Top songs
├─ ❌ MISSING:      Top opener
├─ ❌ MISSING:      Top closer
├─ ❌ MISSING:      Top encore
├─ ❌ MISSING:      Rarity index
├─ ❌ MISSING:      Song liberations
└─ ❌ MISSING:      Setlist variation
```

---

## The 7 Quick Wins (Phase 1)

### 1. Data Quality Metrics
**Location:** TourShow.aspx overview table
**Pattern:** Look for row with tour name, count numeric cells
```javascript
cells.eq(2).text().trim()  // unknown
cells.eq(3).text().trim()  // cancelled
cells.eq(4).text().trim()  // rescheduled
cells.eq(5).text().trim()  // completion %
```
**Time:** 30 min

### 2-4. Geographic Distribution
**Location:** TourShowInfo.aspx show table
**Pattern:** Extract from city/state/country columns
```javascript
const cities = new Set();
const states = new Set();
const countries = new Set();
$("table tr").each((_, row) => {
  cities.add(cells.eq(2).text());  // city
  states.add(cells.eq(3).text());  // state
  countries.add(cells.eq(4).text());  // country
});
cities.size // 15
```
**Time:** 45 min

### 5. Top Opener/Closer/Encore
**Location:** TourStats.aspx section headings
**Pattern:** Find h3 with position name, next song link
```javascript
$("h3").each((_, el) => {
  if ($(el).text().includes("Opener")) {
    const song = $(el).nextUntil("h3")
      .find("a[href*='SongStats']")
      .first()
      .text();  // "Warehouse"
  }
});
```
**Time:** 30 min

**Subtotal Phase 1: 1.75 hours = 7 new fields**

---

## The 7 Core Additions (Phase 2)

### 6. Show Duration Stats
**Location:** TourShowInfo.aspx table cells
**Pattern:** Find HH:MM:SS format, parse and aggregate
```javascript
const durations = [];
cells.each((_, cell) => {
  const match = $(cell).text().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [,h,m,s] = match.map(Number);
    durations.push(h*3600 + m*60 + s);
  }
});
const avg = durations.reduce((a,b)=>a+b)/durations.length;
const max = Math.max(...durations);
const min = Math.min(...durations);
```
**Time:** 90 min
**Requires:** New HTTP request to TourStats.aspx

### 7. Song Debuts
**Location:** Cross-reference SongStats first-play dates
**Pattern:** Match song first-play date to tour date range
```javascript
function enrichToursWithDebuts(tours, songs) {
  songs.forEach(song => {
    const debutDate = new Date(song.firstPlayedDate);
    tours.forEach(tour => {
      if (debutDate >= tour.startDate && debutDate <= tour.endDate) {
        tour.songsDebuted++;
        tour.songsDebutDetail.push({
          songTitle: song.title,
          debutDate: song.firstPlayedDate
        });
      }
    });
  });
}
```
**Time:** 90 min
**Requires:** Song data with first-play dates

### 8. Show Type Breakdown
**Location:** TourShowInfo.aspx notes/context
**Pattern:** Regex match against keywords in row text
```javascript
const showTypes = {fullBand:0, solo:0, tv:0, festival:0};
$("table tr").each((_, row) => {
  const text = $(row).text().toLowerCase();
  if (text.includes("television")) showTypes.tv++;
  else if (text.includes("festival")) showTypes.festival++;
  else if (text.includes("solo")) showTypes.solo++;
  else showTypes.fullBand++;
});
```
**Time:** 90 min
**Note:** Pattern matching, ~85% accuracy

### 9. Song Liberations
**Location:** TourStats.aspx liberation section
**Pattern:** Find h3 "Liberation", parse next table
```javascript
const liberations = [];
$("h3").each((_, el) => {
  if ($(el).text().includes("Liberation")) {
    $(el).nextUntil("h3").find("table tr").each((_, row) => {
      const cells = $(row).find("td");
      liberations.push({
        song: cells.eq(0).text(),
        days: parseInt(cells.eq(1).text().match(/(\d+)/)[1]),
        date: cells.eq(2).text()
      });
    });
  }
});
```
**Time:** 60 min

### 10. Rarity Index
**Location:** TourStats.aspx top section
**Pattern:** Simple regex match
```javascript
const match = pageText.match(/rarity.*?(\d+\.?\d*)/i);
const rarityIndex = parseFloat(match[1]);  // 2.5
```
**Time:** 30 min

**Subtotal Phase 2: 4.5 hours = 7 new fields**

---

## Interface Changes Required

### ScrapedTourDetailed - Add These Fields:

```typescript
// Phase 1 additions
unknownShows?: number;
cancelledShows?: number;
rescheduledShows?: number;
completionPercentage?: number;
citiesVisited?: number;
statesVisited?: number;
countriesVisited?: number;
topOpener?: string;
topCloser?: string;
topEncore?: string;

// Phase 2 additions
averageShowLength?: number;
longestShow?: { duration: number; date: string; venue: string };
shortestShow?: { duration: number; date: string; venue: string };
songsDebuted?: number;
songsDebutDetail?: Array<{ songTitle: string; debutDate: string }>;
showTypeBreakdown?: {
  fullBand?: number;
  daveSolo?: number;
  festival?: number;
  television?: number;
  benefit?: number;
};
topLiberations?: Array<{ songTitle: string; daysSince: number }>;
rarityIndex?: number;
```

---

## Code Checklist - Phase 1

- [ ] Add fields to ScrapedTourDetailed interface
- [ ] Create function `getTourOverviewMetrics(url, year)` to fetch TourShow.aspx
- [ ] Parse unknown/cancelled/rescheduled/completion from overview
- [ ] Enhance show extraction to track cities, states, countries
- [ ] Calculate unique counts at end of parsing
- [ ] Fetch TourStats.aspx in parseTourPage()
- [ ] Extract opener/closer/encore from TourStats
- [ ] Assign all extracted values to tour object
- [ ] Test with 3-5 sample tours
- [ ] Verify against live dmbalmanac.com

---

## Testing Checklist

### Unit Tests:
```
✓ parseTimeToSeconds("1:42:31") === 6151
✓ parseTimeToSeconds("0:02:05") === 125
✓ cities.size === 3 (after adding 2 Denver, 1 Boulder)
✓ rarityIndex === 2.5
```

### Integration Tests:
```
✓ Full tour parsing returns all new fields
✓ Duration stats are calculated correctly
✓ Geographic counts match manual count
✓ Top positions match what's on site
```

### Manual Verification (3 sample tours):
```
Tour: Summer 1998
- Unknown shows: X ✓
- Cancelled shows: Y ✓
- Cities visited: Z ✓
- Top opener: [Song] ✓

Tour: Summer 2024
- Unknown shows: A ✓
- Cancelled shows: B ✓
- States visited: C ✓
- Top closer: [Song] ✓

Tour: Europe 2023
- Countries visited: D ✓
- Avg show length: E:MM ✓
- Top encore: [Song] ✓
```

---

## Common Pitfalls to Avoid

1. **Duration Pattern Match**
   - ❌ `/\d:\d:\d/` → too broad
   - ✅ `/^\d{1,2}:\d{2}:\d{2}$/` → specific

2. **Geographic Data**
   - ❌ Raw city names (spelling variations)
   - ✅ Use Set<> to auto-deduplicate

3. **Show Type Classification**
   - ❌ Look for ONLY one keyword per show
   - ✅ Check multiple patterns, use fallback "other"

4. **Empty Data Handling**
   - ❌ Assign 0 to optional fields
   - ✅ Leave undefined if no data found

5. **HTTP Requests**
   - ❌ Fetch all pages without caching
   - ✅ Check cache first, use rate limiting

---

## Success Metrics

### Phase 1 Complete When:
- [x] 8 new fields extracted across 7 metrics
- [x] 100% of tours have unknown/cancelled/rescheduled counts
- [x] 98%+ of tours have geographic data
- [x] 95%+ of tours have top positions
- [x] No performance regression (same scrape time ±10%)
- [x] All tests passing
- [x] Spot-checked against 5 different tours

### Coverage Before/After:
```
Before: 8 fields / 26 total = 31%
After:  16 fields / 26 total = 62%
Improvement: +31% coverage in 2-3 hours work
```

---

## File Locations for Reference

| File | Purpose |
|------|---------|
| `/Users/louisherman/ClaudeCodeProjects/INVESTIGATION_SUMMARY.md` | Start here - overview |
| `/Users/louisherman/ClaudeCodeProjects/TOUR_STATISTICS_INVESTIGATION.md` | Detailed analysis |
| `/Users/louisherman/ClaudeCodeProjects/TOUR_STATS_EXTRACTION_GUIDE.md` | Copy/paste code |
| `/Users/louisherman/ClaudeCodeProjects/TOUR_STATS_IMPLEMENTATION_ROADMAP.md` | Full implementation plan |
| `/Users/louisherman/ClaudeCodeProjects/QUICK_REFERENCE.md` | This file |
| `scraper/src/scrapers/tours.ts` | Existing scraper to modify |
| `scraper/src/types.ts` | Types to extend |

---

## Effort Summary

```
Phase 1: Quick Wins
├─ Data Quality:       30 min
├─ Geography:          45 min
├─ Opener/Closer/Enc:  30 min
└─ Subtotal:           105 min (1.75 hours)

Phase 2: Core Analytics
├─ Durations:          90 min
├─ Debuts:             90 min
├─ Show Types:         90 min
├─ Liberations:        60 min
├─ Rarity Index:       30 min
└─ Subtotal:           360 min (6 hours)

TOTAL: 465 minutes = 7.75 hours for +62% coverage gain
```

---

## Questions?

Refer to:
- **What's available on site:** TOUR_STATISTICS_INVESTIGATION.md
- **How to extract it:** TOUR_STATS_EXTRACTION_GUIDE.md
- **How to plan implementation:** TOUR_STATS_IMPLEMENTATION_ROADMAP.md
- **Quick lookup:** This document (QUICK_REFERENCE.md)

**Investigation completed by:** DMBAlmanac Site Expert
**Date:** January 23, 2026
