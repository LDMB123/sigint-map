# DMB Almanac Scraper - Quick Reference

## What's Being Scraped (13 Scrapers)

| Scraper | File | Source | Status | Output |
|---------|------|--------|--------|--------|
| Shows | shows.ts | TourShowSet.aspx | ✓ COMPLETE | shows.json |
| Songs (Basic) | songs.ts | SongList.aspx | ✓ COMPLETE | songs.json |
| Song Stats | song-stats.ts | SongStats.aspx | ✓ ADVANCED | song-stats.json |
| Venues (Basic) | venues.ts | VenueList.aspx | ✓ COMPLETE | venues.json |
| Venue Stats | venue-stats.ts | VenueStats.aspx | ✓ ADVANCED | venue-stats.json |
| Guests (Basic) | guests.ts | GuestList.aspx | ✓ COMPLETE | guests.json |
| Tours | tours.ts | TourShowInfo.aspx | ✓ ADVANCED | tours.json |
| Releases | releases.ts | ReleaseView.aspx | ✓ COMPREHENSIVE | releases.json |
| Rarity Index | rarity.ts | ShowRarity.aspx | ✓ ADVANCED | rarity.json |
| Liberation | liberation.ts | Liberation.aspx | ✓ ADVANCED | liberation.json |
| History | history.ts | ThisDayinHistory.aspx | ✓ COMPREHENSIVE | history.json |
| Curated Lists | lists.ts | Lists.aspx | ✓ COMPREHENSIVE | lists.json |

**Coverage: ~85-90% of available data**

---

## What's NOT Being Scraped (4 Major Gaps)

### Critical Gaps
1. **Guest Show Appearances** (TourGuestShows.aspx?gid=XXX)
   - Missing: Which shows each guest played, which songs, when
   - Impact: HIGH - Needed for guest musician analysis
   - Location: Existing guest data cannot link to show-by-show appearances

2. **Song Performance History** (Table in SongStats.aspx?sid=XXX)
   - Missing: Date-by-date performance records
   - Impact: HIGH - Would enable performance timeline analysis
   - Status: Data exists on page but not extracted (only summary stats)

3. **Venue Show History** (Table in VenueStats.aspx?vid=XXX)
   - Missing: Complete show date list per venue
   - Impact: MEDIUM - Needed for venue-specific analysis
   - Status: Shows are counted but individual records not extracted

4. **Year-by-Year Statistics** (TourShowsByYear.aspx?year=YYYY)
   - Missing: Yearly aggregations and breakdowns
   - Impact: MEDIUM - Currently used only for enumeration, not saved
   - Status: Pages accessed but data not preserved

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Total Scrapers | 13 |
| Page Types Covered | 10 |
| Output Files | 12 JSON |
| Data Points (Est.) | 100,000+ |
| Total File Size (Est.) | ~50MB |
| Shows Captured | 2,800+ |
| Songs Captured | 200+ |
| Venues Captured | 500+ |
| Guests Captured | 100+ |
| Releases Captured | 50+ |
| Tours Captured | 40+ |
| Calendar Days | 366 |
| Curated Lists | 50+ |

---

## Data Architecture

### Core Entities
```
Show
  ├─ Venue (vid reference)
  ├─ Tour Year
  ├─ Setlist
  │  ├─ Song (sid reference)
  │  └─ Guest (gid reference)
  └─ Notes & Metadata

Song
  ├─ Basic Info (title, artist, cover status)
  ├─ Statistics (plays, first/last, gap)
  └─ Performance History (missing)

Venue
  ├─ Basic Info (name, location, capacity)
  ├─ Statistics (shows, songs, first/last)
  └─ Show History (partially missing)

Guest
  ├─ Basic Info (name, instruments)
  ├─ Appearance Count
  └─ Show-by-Show History (missing)

Release
  ├─ Album Info
  └─ Track Listing

Tour
  ├─ Year & Name
  ├─ Statistics
  └─ Top Songs
```

### Relationship Gaps
- Guest → Shows: **ONE-WAY ONLY** (shows → guests)
  - Missing: Guest → shows mapping
  - Problem: Can't query "All shows for guest X"

- Song → Performances: **SUMMARY ONLY**
  - Missing: Date-by-date performance records
  - Problem: Can't access performance timeline

- Venue → Shows: **COUNT ONLY**
  - Missing: Individual show records per venue
  - Problem: Can't query "All shows at venue X" with details

---

## To Add a New Scraper

### Template
```bash
# 1. Create scraper file
touch scraper/src/scrapers/new-feature.ts

# 2. Structure (follow existing pattern)
export interface ScrapedFeature { ... }
async function parseFeaturePage() { ... }
export async function scrapeAllFeatures() { ... }
export function saveFeatures() { ... }

# 3. Register in index.ts
import { scrapeAllFeatures } from "./scrapers/new-feature.ts";
// Add to main() function

# 4. Add npm script (if needed)
# In scraper/package.json:
"scripts": {
  "scrape:features": "npm run build && node dist/scrapers/new-feature.js"
}
```

### Key Pattern
```typescript
import PQueue from "p-queue";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "./utils/cache.js";

export async function scrapeAllFeatures() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Rate limiting
  const queue = new PQueue({
    concurrency: 2,
    intervalCap: 5,
    interval: 10000,
  });

  try {
    const checkpoint = loadCheckpoint("features");
    const completed = new Set(checkpoint?.completed || []);
    const allData = checkpoint?.data || [];

    // ... process items ...

    // Save checkpoints
    if (items.length % 50 === 0) {
      saveCheckpoint("features", { completed: [...completed], data: allData });
    }

    return allData;
  } finally {
    await browser.close();
  }
}

export function saveFeatures(features) {
  const filepath = join(OUTPUT_DIR, "features.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2));
}
```

---

## Common Data Formats

### Date Format
- Internal: ISO 8601 (`YYYY-MM-DD`)
- Website: European dot format (`DD.MM.YYYY`)
- Parser: `parseDate(dateText)` helper

### Duration Format
- Internal: Seconds (stored as number)
- Display: `MM:SS` format (string)
- Example: `"4:23"` → stored as 263 seconds

### IDs
- Show: `id=1234` (numeric)
- Song: `sid=42` (numeric)
- Venue: `vid=100` (numeric)
- Guest: `gid=5` (alphanumeric, sometimes non-numeric)
- Tour: `tid=5` (numeric)
- Release: `release=XXX` (alphanumeric)

### Rate Limiting (All Scrapers)
- **Concurrency:** 2 concurrent requests
- **Throughput:** 5 requests per 10 seconds
- **Delay:** 1-3 seconds between requests
- **Philosophy:** Respectful to dmbalmanac.com

---

## Performance Notes

### Current Bottlenecks
1. **Sequential processing** - Necessary for rate limiting
2. **HTML parsing** - Regex-based pattern matching (could be optimized)
3. **Network latency** - Intentional (rate limiting)

### Estimated Scrape Times
- Shows: ~30-60 minutes (2,800+ shows)
- Songs: ~10-15 minutes (200+ songs)
- Venues: ~5-10 minutes (500+ venues)
- Guests: ~2-5 minutes (100+ guests)
- Song Stats: ~30-45 minutes (200+ songs with detailed parsing)
- Venue Stats: ~10-15 minutes (500+ venues)
- Tours: ~5-10 minutes (40+ tours)
- Releases: ~5-10 minutes (50+ releases)
- Rarity: ~5 minutes (all tours at once)
- Liberation: ~1 minute (single page)
- History: ~60-90 minutes (366 calendar days)
- Lists: ~10-15 minutes (50+ lists)
- **TOTAL: ~4-6 hours for full scrape**

### Cache Strategy
- All HTML cached locally in `scraper/cache/`
- Cache checked before every request
- Enables fast re-runs and testing
- No rate limiting when using cache

---

## Common Issues & Troubleshooting

### Issue: Parser fails on new page
**Solution:** Use CSS selectors over regex when possible
```typescript
// Bad:
const title = pageText.match(/Title:\s*(.+)/i)[1];

// Better:
const title = $(".title, h1, .page-title").first().text();
```

### Issue: Missing data on some pages
**Solution:** Implement fallback extraction strategies
```typescript
// Strategy 1
let value = $(".primary-location").text();

// Strategy 2 (fallback)
if (!value) {
  value = $(".alternate-location").text();
}

// Strategy 3 (last resort)
if (!value) {
  const text = $("body").text();
  const match = text.match(/Location:\s*(.+)/);
  value = match ? match[1] : null;
}
```

### Issue: Rate limiting errors (429)
**Solution:** Increase delay or reduce concurrency
```typescript
const queue = new PQueue({
  concurrency: 1,  // Reduce from 2
  intervalCap: 3,  // Reduce from 5
  interval: 10000,
});

// Or increase delay:
await randomDelay(3000, 5000);  // More conservative
```

### Issue: Scraper interrupted
**Solution:** Resume from checkpoint
```bash
# Scraper auto-resumes from last checkpoint
# Just run again, it will skip completed items
npm run scrape:shows
```

---

## File Structure

```
scraper/
├── src/
│  ├── scrapers/
│  │  ├── shows.ts              (2,800+ shows)
│  │  ├── songs.ts              (200+ songs)
│  │  ├── song-stats.ts         (200 songs with stats)
│  │  ├── venues.ts             (500+ venues)
│  │  ├── venue-stats.ts        (500 venues detailed)
│  │  ├── guests.ts             (100+ guests)
│  │  ├── tours.ts              (40+ tours)
│  │  ├── releases.ts           (50+ releases)
│  │  ├── rarity.ts             (show rarity index)
│  │  ├── liberation.ts         (liberation list)
│  │  ├── history.ts            (366 calendar days)
│  │  ├── lists.ts              (50+ curated lists)
│  │  └── index.ts              (main orchestrator)
│  ├── utils/
│  │  ├── cache.js              (HTML caching)
│  │  ├── rate-limit.js         (delays)
│  │  └── helpers.js            (parsing utilities)
│  ├── types.ts                 (TypeScript interfaces)
│  └── index.ts                 (entry point)
├── output/
│  ├── shows.json
│  ├── songs.json
│  ├── song-stats.json
│  ├── venues.json
│  ├── venue-stats.json
│  ├── guests.json
│  ├── tours.json
│  ├── releases.json
│  ├── rarity.json
│  ├── liberation.json
│  ├── history.json
│  └── lists.json
├── cache/
│  └── [cached HTML files]
├── checkpoints/
│  └── [scraper progress files]
└── package.json
```

---

## Key Insights

### 1. Data is Well-Structured
- Core entities (shows, songs, venues, guests) are comprehensive
- Relationships are mostly present (show → song, show → guest, etc.)
- Statistics are detailed (gaps, slots, version types, etc.)

### 2. Main Gap: Reverse Relationships
- Shows know their guests → Guests don't link back to shows
- Songs are played at shows → No date-by-date performance records
- Venues host shows → No individual show records per venue

### 3. Parsing Challenges
- HTML is not semantically structured (no microdata, few classes)
- Regex-heavy parsing is fragile to layout changes
- Text extraction requires sophisticated pattern matching

### 4. Rate Limiting Works Well
- 5/10s throughput is sustainable
- Current implementation doesn't stress the server
- Could potentially go faster but current approach is respectful

### 5. Data Quality Varies
- Core data (shows, venues, songs): HIGH quality
- Statistics (rarity, liberation, history): COMPLETE
- Derived data (segues, versions): GOOD (from parsing)
- Relational data (guest appearances): INCOMPLETE (one-way only)

---

## Next Steps

### Immediate (Add Missing Scrapers)
1. Enhance song-stats.ts: Extract full performance history
2. Create guest-shows.ts: Guest appearance history
3. Enhance venue-stats.ts: Complete show history extraction

### Near-term (Data Quality)
4. Refactor parsing to use CSS selectors where possible
5. Add validation/verification step
6. Improve error logging

### Future (Enhancements)
7. Add performance aggregators (top songs, etc.)
8. Create data validation suite
9. Add incremental update capability
10. Create data export formats (CSV, SQLite directly)

---

## References

- **Main File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/`
- **Analysis:** `/Users/louisherman/ClaudeCodeProjects/scraper-coverage-analysis.md`
- **Missing Specs:** `/Users/louisherman/ClaudeCodeProjects/missing-scrapers-specification.md`
- **DMB Almanac:** https://www.dmbalmanac.com/

---

Generated: January 23, 2026
