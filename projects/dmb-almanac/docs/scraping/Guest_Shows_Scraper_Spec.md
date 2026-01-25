# Guest Shows Scraper - Technical Specification

## Overview

This specification describes the implementation of a new scraper module to extract detailed guest musician appearance history from dmbalmanac.com's TourGuestShows.aspx pages.

**Module Name:** `guest-shows.ts`
**Location:** `/src/scrapers/guest-shows.ts`
**Purpose:** Extract per-song guest instrument data and complete appearance history

---

## Page Structure Analysis

### URL Pattern
```
https://www.dmbalmanac.com/TourGuestShows.aspx?gid=[GUEST_ID]
```

**Example URLs:**
- Tim Reynolds: `?gid=42`
- Steve Lillywhite: `?gid=1234`
- Craig Winter: `?gid=5678`

### Expected HTML Structure

Based on dmbalmanac.com's pattern (similar to other stats pages):

```html
<!-- Header Section -->
<h1>Guest Name</h1>
<div class="guest-info">
  <!-- Instruments: Guitar, Vocals -->
  <!-- Total Appearances: 127 -->
  <!-- First Appearance: 12/31/1991 - University of Virginia -->
  <!-- Last Appearance: 12/29/2024 - Red Rocks -->
</div>

<!-- Appearance History Table -->
<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Venue</th>
      <th>City, State</th>
      <th>Songs</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>12/31/1991</td>
      <td><a href="VenueStats.aspx?vid=123">University of Virginia</a></td>
      <td>Charlottesville, VA</td>
      <td>
        <a href="SongStats.aspx?sid=42">All Along the Watchtower</a> (guitar, vocals)
        <a href="SongStats.aspx?sid=43">Another Song</a> (guitar)
      </td>
      <td></td>
    </tr>
    <!-- More rows... -->
  </tbody>
</table>
```

---

## Data Structures

### Type Definitions

**For types.ts:**

```typescript
// New type for guest appearance details
export interface GuestShowAppearance {
  date: string;                    // YYYY-MM-DD format
  showId?: string;                 // From TourShowSet.aspx?id=
  venueName: string;
  venueId?: string;               // From VenueStats.aspx?vid=
  city: string;
  state?: string;
  country: string;
  songsPerformed: GuestSongPerformance[];
  notes?: string;
}

export interface GuestSongPerformance {
  songTitle: string;
  songId?: string;                // From SongStats.aspx?sid=
  instruments: string[];          // e.g., ["guitar", "vocals"]
  position?: number;              // Position in setlist
}

// Enhanced guest details from TourGuestShows page
export interface ScrapedGuestShowHistory {
  originalId: string;             // gid from URL
  name: string;
  instruments: string[];          // General instruments list
  firstAppearanceDate?: string;   // YYYY-MM-DD
  firstAppearanceVenue?: string;
  firstAppearanceCity?: string;
  firstAppearanceState?: string;
  lastAppearanceDate?: string;    // YYYY-MM-DD
  lastAppearanceVenue?: string;
  lastAppearanceCity?: string;
  lastAppearanceState?: string;
  totalAppearances: number;
  distinctSongs?: number;
  yearsActive?: string;           // e.g., "1991-2024"
  appearances: GuestShowAppearance[];
}

// Output wrapper
export interface GuestShowHistoryOutput extends ScraperOutput {
  guestHistories: ScrapedGuestShowHistory[];
}
```

### Output JSON Structure

```json
{
  "scrapedAt": "2026-01-23T15:30:00.000Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 1353,
  "guestHistories": [
    {
      "originalId": "42",
      "name": "Tim Reynolds",
      "instruments": ["guitar", "vocals"],
      "firstAppearanceDate": "1991-12-31",
      "firstAppearanceVenue": "University of Virginia",
      "firstAppearanceCity": "Charlottesville",
      "firstAppearanceState": "VA",
      "lastAppearanceDate": "2024-12-29",
      "lastAppearanceVenue": "Red Rocks Amphitheatre",
      "lastAppearanceCity": "Morrison",
      "lastAppearanceState": "CO",
      "totalAppearances": 127,
      "distinctSongs": 89,
      "yearsActive": "1991-2024",
      "appearances": [
        {
          "date": "1991-12-31",
          "venueName": "University of Virginia",
          "venueId": "456",
          "city": "Charlottesville",
          "state": "VA",
          "country": "USA",
          "songsPerformed": [
            {
              "songTitle": "All Along the Watchtower",
              "songId": "42",
              "instruments": ["guitar", "vocals"],
              "position": 15
            },
            {
              "songTitle": "Pantala Naga Pampa",
              "songId": "87",
              "instruments": ["guitar"],
              "position": 22
            }
          ],
          "notes": ""
        },
        {
          "date": "1992-03-15",
          "venueName": "Bogarts",
          "venueId": "789",
          "city": "Cincinnati",
          "state": "OH",
          "country": "USA",
          "songsPerformed": [
            {
              "songTitle": "Halloween",
              "songId": "120",
              "instruments": ["guitar", "vocals"],
              "position": 8
            }
          ],
          "notes": "Acoustic set"
        }
      ]
    }
  ]
}
```

---

## Implementation Steps

### Step 1: Get Guest URLs

```typescript
async function getGuestUrls(page: Page): Promise<string[]> {
  // Option A: From GuestStats index page (existing approach)
  // Iterate through GuestStats.aspx to find all guest links

  // Option B: Use known guest IDs from guest-details.json
  // Build URLs: https://www.dmbalmanac.com/TourGuestShows.aspx?gid=XXX

  // Option C: From existing shows data
  // Extract all unique guest IDs from setlist entries

  // Implementation:
  const guestUrls: string[] = [];

  // Method: Iterate through checkpoint to get guest IDs
  const guestIds = new Set<string>();

  // From previous guest data
  await page.goto(`${BASE_URL}/GuestStats.aspx`);
  const html = await page.content();
  const $ = cheerio.load(html);

  $("a[href*='TourGuestShows.aspx'][href*='gid=']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const match = href.match(/gid=([^&]+)/);
      if (match) {
        guestIds.add(match[1]);
      }
    }
  });

  // Filter out band members
  const filteredIds = Array.from(guestIds).filter(
    id => !BAND_MEMBER_GIDS.includes(id)
  );

  // Build full URLs
  return filteredIds.map(id =>
    `${BASE_URL}/TourGuestShows.aspx?gid=${id}`
  );
}
```

### Step 2: Parse Guest Header

```typescript
function parseGuestHeader(
  $: cheerio.CheerioAPI
): Partial<ScrapedGuestShowHistory> {
  // Parse guest name
  const name = normalizeWhitespace($("h1, .guest-name").first().text());

  // Parse instruments
  let instruments: string[] = [];
  const instrText = $("body").text().match(
    /instruments?[:\s]+([^.\n]+)/i
  );
  if (instrText) {
    instruments = parseInstruments(instrText[1]);
  }

  // Parse summary stats from text content
  const bodyText = $("body").text();

  // First appearance: "First Appearance: 12/31/1991 - Venue Name"
  const firstMatch = bodyText.match(
    /First Appearance[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(.+?)(?:\n|$)/i
  );
  let firstAppearanceDate: string | undefined;
  let firstAppearanceVenue: string | undefined;
  if (firstMatch) {
    firstAppearanceDate = parseDate(firstMatch[1]);
    firstAppearanceVenue = normalizeWhitespace(firstMatch[2]);
  }

  // Last appearance: Similar pattern
  const lastMatch = bodyText.match(
    /Last Appearance[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(.+?)(?:\n|$)/i
  );
  let lastAppearanceDate: string | undefined;
  let lastAppearanceVenue: string | undefined;
  if (lastMatch) {
    lastAppearanceDate = parseDate(lastMatch[1]);
    lastAppearanceVenue = normalizeWhitespace(lastMatch[2]);
  }

  // Total appearances
  const totalMatch = bodyText.match(/(\d+)\s+(?:appearances?|shows)/i);
  const totalAppearances = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  return {
    name,
    instruments,
    firstAppearanceDate,
    firstAppearanceVenue,
    lastAppearanceDate,
    lastAppearanceVenue,
    totalAppearances,
  };
}
```

### Step 3: Parse Appearance History Table

```typescript
function parseAppearanceTable(
  $: cheerio.CheerioAPI
): GuestShowAppearance[] {
  const appearances: GuestShowAppearance[] = [];

  // Find main data table (typically has id="SetTable" or similar)
  const table = $("table").filter((i, el) => {
    const html = $(el).html() || "";
    // Look for table with date, venue, songs columns
    return html.includes("Venue") || html.includes("Date");
  }).first();

  if (!table.length) {
    console.warn("Could not find appearance table");
    return appearances;
  }

  // Parse each row
  table.find("tbody tr").each((_, row) => {
    const $row = $(row);

    // Extract date (format: MM/DD/YYYY or similar)
    const dateCell = $row.find("td").eq(0);
    const dateText = normalizeWhitespace(dateCell.text());
    const date = parseDate(dateText);

    if (!date) return; // Skip rows without valid dates

    // Extract venue link
    const venueLink = $row.find("a[href*='VenueStats.aspx']").first();
    const venueName = normalizeWhitespace(venueLink.text());
    const venueHref = venueLink.attr("href") || "";
    const venueIdMatch = venueHref.match(/vid=(\d+)/);
    const venueId = venueIdMatch ? venueIdMatch[1] : undefined;

    // Extract location (City, State, Country)
    // Usually in format: "Charlottesville, VA" or "London, England"
    const locationText = normalizeWhitespace(
      $row.find("td").eq(2).text()
    );
    const locationMatch = locationText.match(
      /^(.+?),\s*([A-Z]{2})?(?:,\s*(.+))?$/
    );
    const city = locationMatch ? locationMatch[1].trim() : "";
    const state = locationMatch ? locationMatch[2] : undefined;
    const country = locationMatch ? locationMatch[3]?.trim() : "USA";

    // Extract songs performed
    const songsCell = $row.find("td").eq(3); // Songs column
    const songsPerformed: GuestSongPerformance[] = [];

    // Songs are typically listed as links with instruments in parentheses
    // "All Along the Watchtower (guitar, vocals)"
    const songText = songsCell.html() || "";

    // Parse each song link
    songsCell.find("a[href*='SongStats.aspx']").each((_, songLink) => {
      const songHref = $(songLink).attr("href") || "";
      const songIdMatch = songHref.match(/sid=(\d+)/);
      const songId = songIdMatch ? songIdMatch[1] : undefined;

      const songTitle = normalizeWhitespace($(songLink).text());

      // Extract instruments from following text
      // Usually: "Song Name (guitar, vocals)"
      const nextNode = songLink.nextSibling;
      let instruments: string[] = [];

      if (nextNode && nextNode.type === "text") {
        const text = nextNode.data || "";
        const instrMatch = text.match(/\(([^)]+)\)/);
        if (instrMatch) {
          instruments = parseInstruments(instrMatch[1]);
        }
      }

      songsPerformed.push({
        songTitle,
        songId,
        instruments,
      });
    });

    // Extract notes (if any)
    const notesCell = $row.find("td").eq(4);
    const notes = normalizeWhitespace(notesCell.text());

    // Find show ID if available (link to show page)
    // Usually linked from date or venue
    const showLink = $row.find("a[href*='TourShowSet.aspx']").first();
    const showHref = showLink.attr("href") || "";
    const showIdMatch = showHref.match(/id=(\d+)/);
    const showId = showIdMatch ? showIdMatch[1] : undefined;

    appearances.push({
      date,
      showId,
      venueName,
      venueId,
      city,
      state,
      country,
      songsPerformed,
      notes: notes || undefined,
    });
  });

  return appearances;
}
```

### Step 4: Main Scraper Function

```typescript
export async function scrapeGuestShowHistories(): Promise<
  ScrapedGuestShowHistory[]
> {
  console.log("Starting guest show history scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Load checkpoint
    const checkpoint = loadCheckpoint<{
      completedUrls: string[];
      guestHistories: ScrapedGuestShowHistory[];
    }>("guest-shows");

    const completedUrls = new Set(checkpoint?.completedUrls || []);
    const allHistories: ScrapedGuestShowHistory[] =
      checkpoint?.guestHistories || [];

    // Get guest URLs
    const guestUrls = await getGuestUrls(page);
    const remainingUrls = guestUrls.filter(url => !completedUrls.has(url));

    console.log(
      `Found ${guestUrls.length} guests, ${remainingUrls.length} remaining`
    );

    // Rate-limited queue
    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000,
    });

    let processed = 0;
    const total = remainingUrls.length;

    for (const guestUrl of remainingUrls) {
      await queue.add(async () => {
        try {
          // Check cache
          let html = getCachedHtml(guestUrl);
          if (!html) {
            await page.goto(guestUrl, {
              waitUntil: "networkidle",
              timeout: 30000
            });
            html = await page.content();
            cacheHtml(guestUrl, html);
          }

          const $ = cheerio.load(html);

          // Extract guest ID from URL
          const gidMatch = guestUrl.match(/gid=([^&]+)/);
          const originalId = gidMatch ? gidMatch[1] : "";

          if (!originalId) {
            console.warn(`Could not extract guest ID from ${guestUrl}`);
            return;
          }

          // Parse header
          const headerData = parseGuestHeader($);

          // Parse appearance history
          const appearances = parseAppearanceTable($);

          // Merge data
          const history: ScrapedGuestShowHistory = {
            originalId,
            name: headerData.name || "Unknown",
            instruments: headerData.instruments || [],
            firstAppearanceDate: headerData.firstAppearanceDate,
            firstAppearanceVenue: headerData.firstAppearanceVenue,
            lastAppearanceDate: headerData.lastAppearanceDate,
            lastAppearanceVenue: headerData.lastAppearanceVenue,
            totalAppearances: headerData.totalAppearances || appearances.length,
            distinctSongs: new Set(
              appearances.flatMap(a => a.songsPerformed.map(s => s.songTitle))
            ).size,
            appearances,
          };

          allHistories.push(history);
          completedUrls.add(guestUrl);

          console.log(
            `  [${++processed}/${total}] ${history.name} (${history.totalAppearances} shows)`
          );
        } catch (error) {
          console.error(`Error scraping ${guestUrl}:`, error);
        }

        await randomDelay(1000, 3000);
      });

      // Save checkpoint every 50 guests
      if (processed % 50 === 0 && processed > 0) {
        saveCheckpoint("guest-shows", {
          completedUrls: Array.from(completedUrls),
          guestHistories: allHistories,
        });
      }
    }

    await queue.onIdle();
    return allHistories;
  } finally {
    await browser.close();
  }
}

export function saveGuestShowHistories(
  histories: ScrapedGuestShowHistory[]
): void {
  const output: GuestShowHistoryOutput = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: histories.length,
    guestHistories: histories,
  };

  const filepath = join(OUTPUT_DIR, "guest-show-histories.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `Saved ${histories.length} guest show histories to ${filepath}`
  );
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeGuestShowHistories()
    .then(histories => {
      saveGuestShowHistories(histories);
      console.log("Done!");
    })
    .catch(error => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
```

### Step 5: Helper Functions

Add to `/src/utils/helpers.ts`:

```typescript
export function parseDate(dateStr: string): string | null {
  // Handle formats:
  // - MM/DD/YYYY
  // - MM.DD.YYYY
  // - YYYY-MM-DD (already correct)

  const cleaned = dateStr.trim();

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // MM/DD/YYYY or MM.DD.YYYY
  const match = cleaned.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

export function parseInstruments(instrStr: string): string[] {
  if (!instrStr) return [];

  return instrStr
    .split(/[,;]/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0 && s !== "other")
    .map(s => {
      // Normalize common variations
      const normalized: Record<string, string> = {
        "gtr": "guitar",
        "guit": "guitar",
        "voc": "vocals",
        "v": "vocals",
        "dr": "drums",
        "bs": "bass",
        "kb": "keys",
        "kbd": "keys",
        "perc": "percussion",
      };
      return normalized[s] || s;
    });
}
```

---

## Error Handling

### Common Issues

1. **Missing appearance table**
   - Solution: Try multiple table selectors
   - Fallback: Return empty appearances array with warning

2. **Date parsing failures**
   - Solution: Support multiple date formats
   - Fallback: Skip row, continue with other dates

3. **Song parsing issues**
   - Solution: Use regex for instrument extraction
   - Fallback: Record song without instruments

4. **Rate limiting**
   - Solution: Existing PQueue handles this
   - Interval: 5 requests per 10 seconds

### Logging

```typescript
// Success case
console.log(`[${processed}/${total}] ${name} (${appearances.length} shows)`);

// Warning cases
console.warn(`Could not parse date in row: ${dateText}`);
console.warn(`No appearance table found for ${guestUrl}`);

// Error cases
console.error(`Error parsing ${guestUrl}:`, error);
```

---

## Integration with Existing Pipeline

### Add to package.json scripts

```json
{
  "scripts": {
    "scrape:guest-shows": "tsx src/scrapers/guest-shows.ts",
    "scrape:all": "tsx src/index.ts"
  }
}
```

### Update index.ts

```typescript
import { scrapeGuestShowHistories, saveGuestShowHistories }
  from "./scrapers/guest-shows.js";

// Add to main scraper orchestration
export async function runAllScrapers() {
  // ... existing scrapers ...

  console.log("\n=== Scraping Guest Show Histories ===");
  const guestHistories = await scrapeGuestShowHistories();
  saveGuestShowHistories(guestHistories);

  // ... continue with other scrapers ...
}
```

---

## Testing Strategy

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { parseGuestHeader, parseAppearanceTable } from "./guest-shows";

describe("guest-shows scraper", () => {
  it("should parse guest header correctly", () => {
    const html = /* sample HTML */;
    const $ = cheerio.load(html);
    const result = parseGuestHeader($);

    expect(result.name).toBe("Tim Reynolds");
    expect(result.instruments).toContain("guitar");
    expect(result.totalAppearances).toBeGreaterThan(0);
  });

  it("should parse appearance table with songs", () => {
    const html = /* sample HTML */;
    const $ = cheerio.load(html);
    const result = parseAppearanceTable($);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].songsPerformed.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// Test against real URLs (with caching)
it("should scrape real guest pages", async () => {
  const page = await browser.newPage();
  const history = await parseShowPage(
    page,
    "https://www.dmbalmanac.com/TourGuestShows.aspx?gid=42"
  );

  expect(history.originalId).toBe("42");
  expect(history.appearances.length).toBeGreaterThan(100); // Tim Reynolds
});
```

---

## Performance Considerations

### Estimated Metrics

- **Guest Pages:** ~1,353 pages
- **Time per page:** 2-3 seconds (with caching)
- **Total time:** ~45-67 minutes (with 2 concurrent requests)
- **Cache size:** ~5-10 MB HTML
- **Output JSON:** ~20-30 MB

### Optimization Options

1. **Parallel processing:** Currently 2 concurrent, could increase to 3-4
2. **Caching:** Already implemented
3. **Checkpoint frequency:** Currently every 50 guests, could increase to 100
4. **HTML streaming:** Could parse while downloading

---

## Deployment Checklist

- [ ] Create `/src/scrapers/guest-shows.ts`
- [ ] Update `/src/types.ts` with new types
- [ ] Update `/src/utils/helpers.ts` with helper functions
- [ ] Add to `/src/index.ts` pipeline
- [ ] Update `/package.json` scripts
- [ ] Create test samples in cache directory
- [ ] Run against sample guests (IDs: 42, 100, 1000)
- [ ] Validate output JSON structure
- [ ] Test rate limiting (no 429 errors)
- [ ] Document any discovered HTML structure variations

---

## Sample Output Validation

Expected output for a typical guest (Tim Reynolds, gid=42):

```json
{
  "originalId": "42",
  "name": "Tim Reynolds",
  "instruments": ["guitar", "vocals"],
  "firstAppearanceDate": "1991-12-31",
  "firstAppearanceVenue": "University of Virginia",
  "lastAppearanceDate": "2024-12-29",
  "lastAppearanceVenue": "Red Rocks Amphitheatre",
  "totalAppearances": 127,
  "distinctSongs": 89,
  "appearances": [
    {
      "date": "1991-12-31",
      "venueName": "University of Virginia",
      "city": "Charlottesville",
      "state": "VA",
      "country": "USA",
      "songsPerformed": [
        {
          "songTitle": "All Along the Watchtower",
          "instruments": ["guitar", "vocals"]
        }
      ]
    }
  ]
}
```

**Validation:**
- ✓ Total appearances > 50
- ✓ First appearance is 1991-1992
- ✓ Last appearance is within 2 years
- ✓ Distinct songs > 30
- ✓ Each appearance has date and songs
- ✓ Each song has instruments

---

## References

- **DMBAlmanac:** https://www.dmbalmanac.com/TourGuestShows.aspx?gid=42
- **Existing scraper:** `/src/scrapers/shows.ts`
- **Helper utilities:** `/src/utils/helpers.ts`
- **Rate limiting:** `/src/utils/rate-limit.ts`
- **Caching:** `/src/utils/cache.ts`

