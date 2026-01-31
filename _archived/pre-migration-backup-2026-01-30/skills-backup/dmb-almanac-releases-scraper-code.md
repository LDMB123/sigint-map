---
name: dmb-almanac-releases-scraper-code
description: "DMB releases and albums scraper implementation"
recommended_tier: sonnet
category: scraping
complexity: advanced
tags:
  - projects
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
migrated_from: projects/dmb-almanac/docs/projects/dmb-almanac/RELEASES_SCRAPER_CODE_REFERENCE.md
migration_date: 2026-01-25
---

# Releases Scraper - Code Reference Guide


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Source File
**Path**: `<project-root>/scraper/src/scrapers/releases.ts`
**Lines**: 418
**Language**: TypeScript

---

## Function Reference

### 1. getReleaseUrls(page: Page)

**Purpose**: Extract all release URLs from the discography list page

**Input**: Playwright Page object

**Returns**: Array of `{ id, url, title }`

**Key Code**:
```typescript
async function getReleaseUrls(page: Page): Promise<{ id: string; url: string; title: string }[]> {
  console.log("Fetching release URLs from discography list...");

  const listUrl = `${BASE_URL}/DiscographyList.aspx`;

  await page.goto(listUrl, { waitUntil: "networkidle", timeout: 30000 });
  const html = await page.content();
  const $ = cheerio.load(html);

  const releases: { id: string; url: string; title: string }[] = [];

  // KEY SELECTOR: Find all release links
  $("a[href*='ReleaseView.aspx']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("release=")) {
      const releaseMatch = href.match(/release=([^&]+)/);
      if (releaseMatch) {
        const releaseId = releaseMatch[1];
        const title = normalizeWhitespace($(el).text());

        // Ensure full URL
        let fullUrl = href;
        if (!href.startsWith("http")) {
          if (href.startsWith("./")) {
            fullUrl = `${BASE_URL}/${href.slice(2)}`;
          } else {
            fullUrl = `${BASE_URL}${href}`;
          }
        }

        // Avoid duplicates
        if (!releases.find(r => r.id === releaseId)) {
          releases.push({ id: releaseId, url: fullUrl, title });
        }
      }
    }
  });

  console.log(`Found ${releases.length} releases`);
  return releases;
}
```

**Expected Output**:
```javascript
[
  {
    id: "1",
    url: "https://www.dmbalmanac.com/ReleaseView.aspx?release=1",
    title: "Crash"
  },
  {
    id: "2",
    url: "https://www.dmbalmanac.com/ReleaseView.aspx?release=2",
    title: "Before These Crowded Streets"
  },
  // ... more releases
]
```

---

### 2. parseReleasePage(page: Page, releaseUrl: string, releaseId: string)

**Purpose**: Extract all details from a single release page

**Inputs**:
- `page`: Playwright Page object
- `releaseUrl`: Full URL to release detail page
- `releaseId`: Release ID from URL

**Returns**: `ScrapedRelease | null`

#### 2a. Extract Title
```typescript
// Extract release title
let title = "";
const h1 = $("h1").first();
if (h1.length) {
  title = normalizeWhitespace(h1.text());
}

// Fallback to page title
if (!title) {
  title = normalizeWhitespace($("title").text().replace(/DMB Almanac.*?[-:]?/i, ""));
}

if (!title) {
  console.warn(`No title found for release ${releaseId}`);
  title = `Release ${releaseId}`;
}
```

#### 2b. Detect Release Type
```typescript
const pageText = $("body").text().toLowerCase();
let releaseType = "studio";

if (pageText.includes("live album") || pageText.includes("live release")) {
  releaseType = "live";
} else if (pageText.includes("compilation") || pageText.includes("greatest hits")) {
  releaseType = "compilation";
} else if (pageText.includes("dvd") || pageText.includes("video")) {
  releaseType = "video";
} else if (pageText.includes("box set")) {
  releaseType = "box_set";
} else if (pageText.includes("ep")) {
  releaseType = "ep";
} else if (pageText.includes("single")) {
  releaseType = "single";
}
```

#### 2c. Extract Release Date
```typescript
let releaseDate: string | undefined;
const datePatterns = [
  /released[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
  /release date[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
  /(\w+\s+\d{1,2},?\s+\d{4})/i, // General date pattern
];

for (const pattern of datePatterns) {
  const match = pageText.match(pattern);
  if (match) {
    try {
      releaseDate = parseDate(match[1]); // Converts to ISO format
      break;
    } catch (err) {
      // Continue to next pattern
    }
  }
}
```

#### 2d. Extract Cover Art
```typescript
let coverArtUrl: string | undefined;
const coverImg = $("img[src*='cover'], img[src*='album'], img[alt*='cover']").first();
if (coverImg.length) {
  const src = coverImg.attr("src");
  if (src) {
    coverArtUrl = src.startsWith("http")
      ? src
      : `${BASE_URL}/${src.replace(/^\.?\//, "")}`;
  }
}
```

#### 2e. Parse Track Listing - Strategy 1 (Table)
```typescript
// Strategy 1: Table with tracks
let currentDiscNumber = 1;

$("table tr, .tracklist tr, .track-list tr").each((_, row) => {
  const $row = $(row);

  // Check for disc header
  const headerText = $row.text().toLowerCase();
  if (headerText.includes("disc") || headerText.includes("cd")) {
    const discMatch = headerText.match(/disc\s*(\d+)/i);
    if (discMatch) {
      currentDiscNumber = parseInt(discMatch[1], 10);
    }
    return; // Skip this row
  }

  // Find song link
  const songLink = $row.find("a[href*='SongStats']").first();
  if (songLink.length === 0) return;

  const songTitle = normalizeWhitespace(songLink.text());
  if (!songTitle) return;

  // Extract track number
  let trackNumber = tracks.filter(t => t.discNumber === currentDiscNumber).length + 1;
  const firstCell = $row.find("td").first();
  const trackMatch = firstCell.text().match(/^\s*(\d+)/);
  if (trackMatch) {
    trackNumber = parseInt(trackMatch[1], 10);
  }

  // Parse duration
  let duration: string | undefined;
  const durationCell = $row.find("td").filter((i, td) => {
    const text = $(td).text();
    return /\d+:\d{2}/.test(text);
  });
  if (durationCell.length) {
    duration = normalizeWhitespace(durationCell.text());
  }

  // Parse source show date (for live tracks)
  let showDate: string | undefined;
  const dateCell = $row.find("a[href*='ShowSetlist']").first();
  if (dateCell.length) {
    try {
      showDate = parseDate(dateCell.text());
    } catch (err) {
      // Skip
    }
  }

  tracks.push({
    trackNumber,
    discNumber: currentDiscNumber,
    songTitle,
    duration,
    showDate,
  });
});
```

#### 2f. Parse Track Listing - Strategy 2 (List)
```typescript
// Strategy 2: Ordered list or div-based tracklist
if (tracks.length === 0) {
  $("ol li, .track, .song-item").each((i, el) => {
    const $el = $(el);
    const songLink = $el.find("a[href*='SongStats']").first();

    if (songLink.length > 0) {
      const songTitle = normalizeWhitespace(songLink.text());
      if (!songTitle) return;

      const trackNumber = i + 1;

      // Try to find duration
      let duration: string | undefined;
      const text = $el.text();
      const durationMatch = text.match(/(\d+:\d{2})/);
      if (durationMatch) {
        duration = durationMatch[1];
      }

      // Look for show date
      let showDate: string | undefined;
      const dateLink = $el.find("a[href*='ShowSetlist']").first();
      if (dateLink.length) {
        try {
          showDate = parseDate(dateLink.text());
        } catch (err) {
          // Skip
        }
      }

      tracks.push({
        trackNumber,
        discNumber: 1,
        songTitle,
        duration,
        showDate,
      });
    }
  });
}
```

#### 2g. Parse Track Listing - Strategy 3 (Paragraph)
```typescript
// Strategy 3: Paragraph-based track listing
if (tracks.length === 0) {
  const paragraphs = $("p").toArray();
  paragraphs.forEach((p) => {
    const $p = $(p);
    const text = $p.text();

    // Look for pattern: "1. Song Title" or "1 - Song Title"
    const trackMatch = text.match(/^\s*(\d+)[\.\-\)]\s*(.+)/);
    if (trackMatch) {
      const trackNumber = parseInt(trackMatch[1], 10);
      let songTitle = normalizeWhitespace(trackMatch[2]);

      // Extract duration if present
      let duration: string | undefined;
      const durationMatch = songTitle.match(/\((\d+:\d{2})\)/);
      if (durationMatch) {
        duration = durationMatch[1];
        songTitle = songTitle.replace(/\s*\(\d+:\d{2}\)\s*/, "");
      }

      // Check for song link
      const songLink = $p.find("a[href*='SongStats']").first();
      if (songLink.length > 0) {
        songTitle = normalizeWhitespace(songLink.text()) || songTitle;
      }

      tracks.push({
        trackNumber,
        discNumber: 1,
        songTitle,
        duration,
      });
    }
  });
}
```

#### 2h. Extract Release Notes
```typescript
let notes: string | undefined;
const notesEl = $(".notes, .release-notes, .album-notes");
if (notesEl.length) {
  notes = normalizeWhitespace(notesEl.text());
}
```

#### 2i. Return ScrapedRelease Object
```typescript
const release: ScrapedRelease = {
  originalId: releaseId,
  title,
  releaseType,
  releaseDate,
  coverArtUrl,
  tracks,
  notes,
};

return release;
```

---

### 3. scrapeAllReleases()

**Purpose**: Main orchestration function with rate limiting and checkpoint management

**Returns**: Array of `ScrapedRelease`

**Key Sections**:

#### 3a. Browser Setup
```typescript
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.setExtraHTTPHeaders({
  "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
});
```

#### 3b. Load Checkpoint
```typescript
const checkpoint = loadCheckpoint<{
  completedIds: string[];
  releases: ScrapedRelease[];
}>("releases");

const completedIds = new Set(checkpoint?.completedIds || []);
const allReleases: ScrapedRelease[] = checkpoint?.releases || [];
```

#### 3c. Get Release URLs
```typescript
const releaseList = await getReleaseUrls(page);

// Filter out already completed
const remaining = releaseList.filter(r => !completedIds.has(r.id));
console.log(`${remaining.length} releases remaining to scrape`);
```

#### 3d. Setup Rate Limiter
```typescript
const queue = new PQueue({
  concurrency: 2,           // 2 simultaneous requests
  intervalCap: 5,           // 5 requests
  interval: 10000,          // Per 10 seconds (30/minute max)
});
```

#### 3e. Process Releases
```typescript
let processed = 0;
const total = remaining.length;

for (const { id, url, title: previewTitle } of remaining) {
  await queue.add(async () => {
    const release = await parseReleasePage(page, url, id);
    if (release) {
      allReleases.push(release);
      completedIds.add(id);
      console.log(`  [${++processed}/${total}] ${release.title} (${release.tracks.length} tracks)`);
    }
    await randomDelay(1000, 3000); // 1-3 second delay
  });

  // Save checkpoint every 10 releases
  if (processed % 10 === 0 && processed > 0) {
    saveCheckpoint("releases", {
      completedIds: Array.from(completedIds),
      releases: allReleases,
    });
  }
}

await queue.onIdle();
```

#### 3f. Final Save
```typescript
saveCheckpoint("releases", {
  completedIds: Array.from(completedIds),
  releases: allReleases,
});

return allReleases;
```

---

### 4. saveReleases(releases: ScrapedRelease[])

**Purpose**: Save scraped data to JSON file

**Input**: Array of ScrapedRelease objects

**Key Code**:
```typescript
export function saveReleases(releases: ScrapedRelease[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: releases.length,
    releases,
  };

  const filepath = join(OUTPUT_DIR, "releases.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${releases.length} releases to ${filepath}`);
}
```

**Output File Structure**:
```json
{
  "scrapedAt": "2025-01-23T14:30:45.123Z",
  "source": "https://www.dmbalmanac.com",
  "totalItems": 42,
  "releases": [...]
}
```

---

## Constants and Configuration

```typescript
// Base configuration
const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Rate limiter defaults (p-queue)
const queue = new PQueue({
  concurrency: 2,           // Max simultaneous requests
  intervalCap: 5,           // Max requests per interval
  interval: 10000,          // Interval in ms (5 per 10 sec = 30/min)
});

// Delay between requests
await randomDelay(1000, 3000);  // 1-3 seconds

// Checkpoint frequency
if (processed % 10 === 0 && processed > 0) {
  saveCheckpoint(...)  // Every 10 releases
}
```

---

## HTML Selectors Reference

### Discovery (DiscographyList.aspx)
```javascript
// Find all release links
$("a[href*='ReleaseView.aspx']")

// Extract ID from URL
href.match(/release=([^&]+)/)
```

### Release Detail (ReleaseView.aspx)
```javascript
// Title
$("h1").first()
$("title")  // fallback

// Release type (text analysis)
pageText.includes("live album")      // → "live"
pageText.includes("compilation")     // → "compilation"
pageText.includes("dvd")             // → "video"
pageText.includes("box set")         // → "box_set"
pageText.includes("ep")              // → "ep"
pageText.includes("single")          // → "single"

// Release date
/released[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i

// Cover art
$("img[src*='cover']")
$("img[src*='album']")
$("img[alt*='cover']")

// Track listings (three strategies)
$("table tr")           // Strategy 1
$("ol li, .track")      // Strategy 2
$("p")                  // Strategy 3

// Songs within tracks
$("a[href*='SongStats']")

// Duration pattern
/\d+:\d{2}/

// Live show dates
$("a[href*='ShowSetlist']")

// Release notes
$(".notes, .release-notes, .album-notes")
```

---

## Error Handling Patterns

### Safe Data Extraction
```typescript
// Always check element exists before accessing
const h1 = $("h1").first();
if (h1.length) {
  title = normalizeWhitespace(h1.text());
}

// Null-coalescing for optional fields
const duration: string | undefined = durationMatch ? durationMatch[1] : undefined;

// Try-catch for date parsing
try {
  showDate = parseDate(dateCell.text());
} catch (err) {
  // Skip and leave undefined
}
```

### Graceful Degradation
```typescript
// Fallback title
if (!title) {
  console.warn(`No title found for release ${releaseId}`);
  title = `Release ${releaseId}`;
}

// Default release type
let releaseType = "studio";  // Default, overridden if detected

// Multiple parsing strategies
if (tracks.length === 0) {
  // Try alternative parsing method
}
```

---

## Helper Function Imports

```typescript
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { parseDate, normalizeWhitespace, slugify, parseDuration } from "../utils/helpers.js";
```

### parseDate Examples
```typescript
parseDate("April 29, 1998")    // → "1998-04-29"
parseDate("4/29/1998")         // → "1998-04-29"
parseDate("1998-04-29")        // → "1998-04-29"
```

### normalizeWhitespace Examples
```typescript
normalizeWhitespace("  Hello    World  ")  // → "Hello World"
normalizeWhitespace("Album\n\nTitle")      // → "Album Title"
```

### randomDelay Usage
```typescript
await randomDelay(1000, 3000);  // Wait 1-3 seconds randomly
```

---

## TypeScript Types

```typescript
// Main release type
interface ScrapedRelease {
  originalId?: string;
  title: string;
  releaseType: string;
  releaseDate?: string;
  coverArtUrl?: string;
  tracks: ScrapedReleaseTrack[];
  notes?: string;
}

// Individual track type
interface ScrapedReleaseTrack {
  trackNumber: number;
  discNumber: number;
  songTitle: string;
  duration?: string;
  showDate?: string;
  venueName?: string;
}
```

---

## Checkpoint File Format

Created at: `cache/checkpoint_releases.json`

```json
{
  "completedIds": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  "releases": [
    {
      "originalId": "1",
      "title": "Crash",
      "releaseType": "studio",
      "releaseDate": "1998-04-29",
      "coverArtUrl": "...",
      "tracks": [...],
      "notes": "..."
    },
    // ... more releases
  ]
}
```

---

## Execution Flow Diagram

```
1. scrapeAllReleases()
   ↓
2. Browser Launch (Playwright)
   ↓
3. Load Checkpoint (if exists)
   ↓
4. getReleaseUrls()
   └─ Navigate to DiscographyList.aspx
   └─ Extract release links
   └─ Return list of { id, url, title }
   ↓
5. Filter Remaining Releases (remove completed)
   ↓
6. Setup Rate Limiter (p-queue)
   ↓
7. For each Release:
   ├─ Add to Queue
   ├─ parseReleasePage()
   │  ├─ Check HTML Cache
   │  ├─ Fetch if not cached
   │  ├─ Extract title
   │  ├─ Extract release type
   │  ├─ Extract release date
   │  ├─ Extract cover art
   │  ├─ Parse tracks (3 strategies)
   │  └─ Extract notes
   ├─ Add to results array
   ├─ Mark as completed
   ├─ Random delay (1-3 seconds)
   └─ Checkpoint every 10 releases
   ↓
8. Wait for queue to empty
   ↓
9. Save final checkpoint
   ↓
10. Close browser
    ↓
11. saveReleases()
    └─ Write output/releases.json
```

---

## Testing Code

From `test-releases-scraper.ts`:

```typescript
async function testDiscographyList() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const listUrl = `${BASE_URL}/DiscographyList.aspx`;
    console.log(`Fetching: ${listUrl}`);

    await page.goto(listUrl, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    let count = 0;
    $("a[href*='ReleaseView.aspx']").each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("release=")) {
        const releaseMatch = href.match(/release=([^&]+)/);
        if (releaseMatch) {
          const releaseId = releaseMatch[1];
          const title = normalizeWhitespace($(el).text());

          console.log(`${++count}. ID: ${releaseId} | Title: ${title}`);

          if (count === 5) {
            return false; // Break after 5
          }
        }
      }
    });
  } finally {
    await browser.close();
  }
}
```

---

## Common Operations

### Find a Release by ID
```typescript
const releaseUrl = `https://www.dmbalmanac.com/ReleaseView.aspx?release=${releaseId}`;
const release = await parseReleasePage(page, releaseUrl, releaseId);
```

### Extract All Songs from Releases
```typescript
const allSongs = releases
  .flatMap(r => r.tracks.map(t => t.songTitle))
  .filter((v, i, a) => a.indexOf(v) === i);  // Unique
```

### Count Tracks
```typescript
const totalTracks = releases
  .reduce((sum, r) => sum + r.tracks.length, 0);
```

### Find Multi-Disc Releases
```typescript
const multiDiscReleases = releases.filter(r => {
  return Math.max(...r.tracks.map(t => t.discNumber)) > 1;
});
```

### Find Live Albums
```typescript
const liveAlbums = releases.filter(r => r.releaseType === "live");
```

---

This reference guide covers all major code sections and patterns used in the releases scraper. Refer back to the main scraper file for complete implementation details.
