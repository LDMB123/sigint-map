# DMB Almanac Scraper Architecture Review

**Date**: January 22, 2026
**Project**: dmb-almanac-svelte
**Scraper Location**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/`
**Total Code**: 4,845 lines across 13 scraper modules

---

## Executive Summary

The DMB Almanac scraper is a **well-structured, production-grade system** with robust patterns for data extraction, caching, and resumability. However, it exhibits **significant maintenance burden and fragmentation** that threatens long-term reliability. Key strengths are offset by architectural debt that requires strategic refactoring.

### Overall Health Score: 7.5/10

- **Architecture**: 8/10 - Good patterns, modular design
- **Error Handling**: 7/10 - Adequate but inconsistent
- **Rate Limiting**: 8/10 - Respectful, well-configured
- **Data Quality**: 7/10 - Defensive parsing, but gap-prone
- **Maintainability**: 6/10 - Fragmentation, code duplication
- **Documentation**: 6/10 - Inline but sparse
- **Testability**: 5/10 - Heavy reliance on browser state

---

## 1. Scraping Patterns & Selectors

### Strengths

**CSS Selector Design** - Selectors are pragmatic and defensive:
```typescript
// venues.ts - Respects site structure variations
$("a[href*='VenueStats.aspx'][href*='vid=']").each((_, el) => {
  const href = $(el).attr("href");
  if (href) {
    const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;
  }
});

// Shows scraper - Handles multiple selector patterns
$("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
  const href = $(el).attr("href");
  // Normalizes relative URLs properly
});
```

**Multi-format Date Parsing** - Handles various DMBAlmanac date formats:
```typescript
// MM.DD.YYYY format from dropdowns
const dateMatch = rawDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);

// MM/DD/YYYY and "Month DD, YYYY" formats
const monthMatch = cleanDate.toLowerCase().match(
  /(\w+)\s+(\d{1,2}),?\s+(\d{4})/
);
```

**Graceful Fallbacks** - For missing/malformed data:
```typescript
// shows.ts - Falls back when primary parsing fails
if (dateOption.length) {
  // Parse from dropdown
} else {
  // Fallback: use year from URL context
  dateStr = `${showUrl.year}-01-01`;
}
```

### Weaknesses

**Selector Brittleness** - DOM structure assumptions can break:
```typescript
// venues.ts - Fragile pattern matching
// Assumes venue name is line before location
if (i > 0 && lines[i - 1].length > 2) {
  name = lines[i - 1];  // This fails if venue has multi-line name
}
```

**Limited Validation** - Extracted data lacks schema validation:
```typescript
// No validation that venueName, city are non-empty
// No validation that dateStr matches YYYY-MM-DD
// No validation that setlist positions are sequential
```

**Hardcoded Guest IDs** - Band members filtered by hardcoded IDs:
```typescript
const BAND_MEMBER_GIDS = [
  "1",   // Dave Matthews
  "2",   // Carter Beauford
  // ... must be manually maintained
];
```

**Incomplete Guest Extraction**:
```typescript
// scrape-shows-batch.ts - Guest parsing from rows is lossy
// Only extracts names from specific cells, may miss guests in notes
// No extraction of instruments or roles
```

---

## 2. Error Handling & Retry Logic

### Strengths

**Try-Catch Coverage** - All page parsing wrapped:
```typescript
async function parseShowPage(page: Page, showUrl: string): Promise<ScrapedShow | null> {
  try {
    // extraction logic
    return show;
  } catch (error) {
    console.error(`Error parsing show ${showUrl.id}...`, error);
    return null;
  }
}
```

**Graceful Degradation** - Failed parses don't crash scraper:
```typescript
const show = await parseShowPage(page, showUrl);
if (show) {
  shows.push(show);
  successCount++;
} else {
  failureCount++;  // Counts but continues
  console.log(`✗ [${processedCount}/${total}] Failed: ${showUrl.id}`);
}
```

### Weaknesses

**No Retry Logic for Network Failures**:
```typescript
// Shows.ts - Single attempt, no exponential backoff
await page.goto(showUrl, { waitUntil: "networkidle" });
// If this times out or returns 5xx, scraper fails completely
```

**Silent Failures on Parsing**:
```typescript
// No distinction between "page returned 404" vs "selector not found"
// Both logged as "Error parsing show" with equal severity
```

**Insufficient Logging Context**:
```typescript
console.error(`Error parsing show ${showUrl.id}:`, error);
// Missing:
// - HTTP status code
// - URL attempted
// - Which selector failed
// - HTML snippet for debugging
```

**No Circuit Breaker Pattern** - If site is down, keeps trying:
```typescript
// If dmbalmanac.com returns 503 for all requests,
// scraper will exhaust all URLs before detecting pattern
```

**Incomplete Error Recovery**:
```typescript
// scrape-guest-details.ts
if (detail) {
  allDetails.push(detail);
  completedIds.add(guest.id);
} else {
  console.log(`FAILED: ${guest.name}`);
  completedIds.add(guest.id); // Mark as complete even on failure
  // This prevents retry on next run - bad for transient errors
}
```

---

## 3. Rate Limiting

### Strengths

**Respectful Configuration**:
```typescript
export const createRateLimiter = () => {
  return new PQueue({
    concurrency: 2,        // Max 2 concurrent requests
    intervalCap: 5,        // Max 5 requests
    interval: 10000,       // Per 10 seconds = 30/minute
  });
};
```

This is excellent - **30 requests/minute is well-mannered** (standard is 50+ for aggressive bots).

**Random Delays Between Requests**:
```typescript
// scrape-shows-batch.ts
const MIN_DELAY = 2000;
const MAX_DELAY = 3000;
await randomDelay(MIN_DELAY, MAX_DELAY);
```

**User-Agent Header**:
```typescript
await page.setExtraHTTPHeaders({
  "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
});
```

### Weaknesses

**Inconsistent Rate Limiting Across Scrapers**:
```typescript
// scrape-shows-batch.ts uses PQueue
const queue = new PQueue({
  concurrency: CONCURRENCY,
  intervalCap: REQUESTS_PER_INTERVAL,
  interval: INTERVAL_MS,
});

// But scrape-guest-details.ts uses simple delay loop
for (const guest of remaining) {
  const detail = await scrapeGuestPage(page, guest.id);
  await delay(1500 + Math.random() * 1000);  // Only 1.5-2.5s
}
```

**Different Rate Limits Per Script**:
- `scrape-shows-batch.ts`: 5 requests per 10s (PQueue)
- `scrape-guest-details.ts`: 1 request every 1.5-2.5s (simple delay)
- Orchestrator: Unknown configuration

**No Backoff on 429 Responses** - If site returns "Too Many Requests":
```typescript
// Playwright will retry fetch, but no exponential backoff implemented
```

**Concurrent Browser Instances**:
```typescript
// Multiple scraper scripts could run simultaneously,
// Each with own browser, each respecting local limits
// But collectively overwhelming the site
```

---

## 4. Data Extraction Quality

### Strengths

**Comprehensive Data Models**:
```typescript
interface ScrapedShow {
  originalId: string;
  date: string;
  venueName: string;
  city: string;
  state?: string;
  country: string;
  tourYear: number;
  notes?: string;
  setlist: ScrapedSetlistEntry[];
  guests: ScrapedGuestAppearance[];
}
```

Clear, well-typed interface matching domain concepts.

**Defensive Setlist Parsing**:
```typescript
// scrape-shows-batch.ts - Background color-based set detection
if (bgColor === "#006666") {
  currentSet = "set1";
} else if (bgColor === "#004040") {
  currentSet = "set2";
} else if (bgColor === "#660000" || bgColor === "#CC0000") {
  currentSet = "encore";
}
```

Robust pattern for identifying set boundaries.

**Whitespace Normalization**:
```typescript
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}
```

Applied consistently to extracted text.

### Weaknesses

**Incomplete Guest Parsing**:
```typescript
// Only extracts names, not instruments or roles
// Instruments field left empty in ScrapedGuestAppearance
guestNames.push(name);
// Should also parse: "John Smith (violin)", "Jane Doe (backing vocals)"
```

**No Duration Validation**:
```typescript
const durationMatch = durationText.match(/(\d{1,2}:\d{2})/);
// Extracts "27:45" as valid, never validates against song length limits
// Could be "27:45" (valid) or "27:45:00" (extracted as invalid format)
```

**Segue Detection Fragile**:
```typescript
const isSegue = rowText.includes("→") || rowText.includes(">");
// Doesn't handle:
// - Soft segues (no marker but implied)
// - Multiple arrows in row causing false positives
// - Segue target identification
```

**Missing Song Statistics**:
```typescript
// Setlist entries lack:
// - Play count (how many times song played in career)
// - Last gap statistics
// - Release information
// - These require separate SongStats.aspx scrapes
```

**No Data Deduplication**:
```typescript
// Two scrapers could extract same guest with slight name variations:
// "John Smith" vs "John  Smith" (double space)
// "Dave & Tim" vs "Dave and Tim"
// No normalization before storage
```

**Incomplete Coverage of Edge Cases**:
```typescript
// Not handled:
// - Cancelled shows
// - Rescheduled shows
// - Venue closures (same URL redirects)
// - Multi-day festivals (does entry per day or aggregate?)
```

---

## 5. Storage Patterns

### Architecture

**Checkpoint System** - Excellent resumability design:
```typescript
interface Checkpoint {
  lastProcessedIndex: number;
  completedIds: string[];
  shows: ScrapedShow[];
  timestamp: string;
  totalProcessed: number;
}

// Saves every 50 items
if (processedCount % BATCH_SIZE === 0) {
  saveCheckpoint(checkpointData);
}
```

**JSON Output Format**:
```typescript
const output: ShowsOutput = {
  scrapedAt: new Date().toISOString(),
  source: BASE_URL,
  totalItems: shows.length,
  shows,
};

writeFileSync(SHOWS_OUTPUT_FILE, JSON.stringify(output, null, 2));
```

### Issues

**Checkpoint File Size**:
```
checkpoint_shows_batch.json    19MB  <- Too large for practical recovery
checkpoint_shows.json          1.2MB
checkpoint_song-stats.json     1.2MB
```

19MB checkpoint means:
- Slow to read/write
- If corrupted, entire scrape lost
- Memory overhead keeping in RAM

**No Checkpoint Compression**:
```typescript
// Stores full HTML in memory during scrape, then checkpoints all shows
// Could stream to JSONL (newline-delimited JSON) instead
// Shows collected: 4000+
// Average size per show: 5KB
// Checkpoint size: 5KB * 4000 = 20MB
```

**HTML Cache Directory Massive**:
```
6414 files / ~200MB total
```

But **beneficial trade-off** - avoids re-fetching during development.

**Inconsistent Output Naming**:
```
shows.json
shows-2025.json
shows-2025-2026-corrected.json
shows-2025-2026-reparsed.json
```

Multiple versions suggest **incomplete cleanup** after reruns.

**No Atomic Writes**:
```typescript
writeFileSync(SHOWS_OUTPUT_FILE, JSON.stringify(output, null, 2));
// If process crashes mid-write, file truncated
// Should use tmp + rename pattern
```

**Missing Metadata**:
```typescript
// Checkpoint lacks:
// - Which selectors failed
// - How many extraction errors per page type
// - Rate limiter stats (requests/min during run)
// - Memory usage over time
```

---

## 6. Maintenance Burden

### Code Duplication

**Significant DRY Violations** across 13 scraper modules (4,845 lines):

**Pattern 1: Boilerplate Setup**
```typescript
// Repeated in: shows.ts, venues.ts, songs.ts, guests.ts, releases.ts, etc.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setExtraHTTPHeaders({
  "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
});

try {
  // scraper logic
} finally {
  await browser.close();
}
```

Should be extracted to factory function:
```typescript
async function withBrowser<T>(
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  // ... setup
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}
```

**Pattern 2: Checkpoint Loop**
```typescript
// Repeated in: guests.ts, shows.ts, releases.ts, etc.
const checkpointPath = join(OUTPUT_DIR, "...-checkpoint.json");
let completedIds = new Set<string>();
let allDetails: DetailType[] = [];

if (existsSync(checkpointPath)) {
  const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf-8"));
  completedIds = new Set(checkpoint.completedIds || []);
  allDetails = checkpoint.details || [];
}

for (const item of remaining) {
  const detail = await scrapePage(page, item);
  // ...
  if (processed % 20 === 0) {
    const checkpoint = {
      completedIds: Array.from(completedIds),
      details: allDetails,
    };
    writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }
}
```

Should be a reusable checkpointed iterator.

**Pattern 3: URL Normalization**
```typescript
// Repeated across venues.ts, shows.ts, songs.ts, etc.
const href = $(el).attr("href") || "";
const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;

// Sometimes includes:
if (href.startsWith("./")) {
  fullUrl = `${BASE_URL}/${href.slice(2)}`;
}
```

Should be a utility function: `normalizeUrl(href, BASE_URL)`.

**Estimated Reduction**: 30-40% of code could be eliminated through abstraction.

### Fragmentation

**Multiple Scraper Entry Points**:
```
scrape-shows-batch.ts          (standalone, 495 lines)
scrape-guest-details.ts        (standalone, 264 lines)
scrape-2025-shows.ts           (standalone, 332 lines)
scraper/src/scrapers/shows.ts  (modular, 421 lines)
scraper/src/scrapers/guests.ts (modular, 175 lines)
```

**Questions**:
- Which one is canonical?
- Are they kept in sync?
- Do they use same selectors?
- How were 2025 shows scraped? Both ways?

This **fragmentation creates inconsistency risk**.

### Lack of Abstraction

**No Scraper Base Class**:
```typescript
// Each scraper reimplements:
// - Browser lifecycle
// - Pagination
// - Checkpoint management
// - Error logging
// - Rate limiting
// - Output saving
```

Should have:
```typescript
abstract class BaseScraper {
  abstract async fetchUrls(): Promise<string[]>;
  abstract async parsePage(page: Page, url: string): Promise<T | null>;

  async run(): Promise<T[]> {
    // Unified: browser lifecycle, checkpoints, rate limiting
  }
}
```

### Testing Infrastructure

**Minimal Test Coverage**:
```
src/test-scraper.ts
src/test-releases-scraper.ts
src/test-tours-scraper.ts
src/test-rarity-scraper.ts
src/test-history-scraper.ts
src/test-lists-scraper.ts
```

These are manual test scripts, not unit tests. No assertions, no CI/CD.

**Key Issues**:
- Can't validate scrapers without running against live site
- No test fixtures for HTML parsing
- No regression tests for selector changes
- Browser tests are slow and fragile

### Documentation

**Strengths**:
- Inline comments explain complex logic (selector rationale)
- Type interfaces well-named
- Clear separation of concerns

**Weaknesses**:
- No architectural overview
- No decision log for selector choices
- No troubleshooting guide
- No data quality metrics
- No runbook for handling site changes

---

## 7. Reliability Assessment

### Known Issues in Codebase

**Incomplete 2025 Data**:
```
fixed-dates-2025-2026.json (83 bytes - nearly empty)
shows-2025-2026-corrected.json (indicates post-scrape corrections)
missing-shows-to-scrape.json (466KB - significant backlog)
```

Suggests **2025 scraping failed** and required manual patching.

**Multiple Scraper Versions**:
```
scrape-2025-fixed.ts    (5,862 lines - prior attempt)
scrape-2025-direct.ts   (7,141 lines - another attempt)
scrape-2025-shows.ts    (9,002 lines - current version)
```

Three versions for same data = **low confidence in reliability**.

**Selective Guest Details**:
```
guest-details.json (362KB, likely ~1000 guests)
all-guest-ids.json (88KB, likely ~2000+ guests)
```

Only 50% of guests fully scraped - inconsistent coverage.

### Failure Modes

**1. HTML Structure Changes**
- **Risk**: HIGH - Site updates will break hardcoded selectors
- **Current Protection**: Manual testing only
- **Recommended**: Selector validation tests with HTML fixtures

**2. Rate Limit Violations**
- **Risk**: MEDIUM - Multiple scraper runs in parallel could overwhelm
- **Current Protection**: Per-scraper limits only
- **Recommended**: Global lock file or central rate limiter

**3. Data Corruption**
- **Risk**: MEDIUM - Large checkpoint files can truncate on crash
- **Current Protection**: None
- **Recommended**: Atomic writes + backup checkpoints

**4. Incremental Scrape Correctness**
- **Risk**: MEDIUM - Checkpoint resumption doesn't validate prior results
- **Current Protection**: Can re-scrape from beginning
- **Recommended**: Differential validation on resume

**5. Site Downtime**
- **Risk**: LOW-MEDIUM - No detection of persistent failures
- **Current Protection**: Script exits after all URLs fail
- **Recommended**: Circuit breaker pattern with exponential backoff

---

## 8. Recommendations for Reliability & Maintainability

### High Priority (Do First)

#### 1. Create Scraper Base Class
**Effort**: 2-3 hours | **Impact**: 30% code reduction

```typescript
// src/base/BaseScraper.ts
export abstract class BaseScraper<T> {
  protected browser?: Browser;
  protected queue: PQueue;

  constructor(
    protected readonly name: string,
    protected readonly outputDir: string,
  ) {
    this.queue = createRateLimiter();
  }

  abstract fetchUrls(): Promise<string[]>;
  abstract parsePage(page: Page, url: string): Promise<T | null>;

  async run(options?: { limit?: number; resume?: boolean }): Promise<T[]> {
    const checkpoint = options?.resume ? loadCheckpoint(this.name) : null;
    const allUrls = await this.fetchUrls();
    const remaining = allUrls.filter(url =>
      !checkpoint?.completedIds.has(url)
    );

    this.browser = await chromium.launch({ headless: true });
    try {
      // ... unified logic
    } finally {
      await this.browser?.close();
    }
  }

  protected saveCheckpoint(data: Checkpoint): void {
    saveCheckpoint(this.name, data);
  }
}

// Usage
class ShowsScraper extends BaseScraper<ScrapedShow> {
  async fetchUrls(): Promise<string[]> { /* ... */ }
  async parsePage(page: Page, url: string): Promise<ScrapedShow | null> { /* ... */ }
}
```

#### 2. Implement Selector Test Fixtures
**Effort**: 3-4 hours | **Impact**: Prevents regressions

```typescript
// tests/fixtures/show-page.html (captured from live site)
// tests/selectors.test.ts

import { parseShowPage } from "@src/scrapers/shows";
import cheerio from "cheerio";
import { readFileSync } from "fs";

describe("Show Page Selectors", () => {
  let fixture: string;

  beforeAll(() => {
    fixture = readFileSync("tests/fixtures/show-page.html", "utf-8");
  });

  it("extracts date from dropdown", () => {
    const $ = cheerio.load(fixture);
    const dateOption = $("select option:selected").filter((i, el) => {
      return /\d{2}\.\d{2}\.\d{4}/.test($(el).text());
    }).first();

    expect(dateOption.length).toBeGreaterThan(0);
    expect(dateOption.text()).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it("extracts venue name from link", () => {
    const $ = cheerio.load(fixture);
    const venueLink = $("a").filter((i, el) => {
      const onclick = $(el).attr("onclick") || "";
      return onclick.includes("VenueStats.aspx");
    }).first();

    expect(venueLink.length).toBeGreaterThan(0);
    expect(venueLink.text()).toMatch(/\w+/);
  });

  it("extracts all setlist entries", () => {
    const $ = cheerio.load(fixture);
    const entries = $("tr").filter((i, el) => {
      return $(el).find("td.setheadercell").length > 0;
    });

    expect(entries.length).toBeGreaterThan(5); // Typical show has 20+ songs
  });
});
```

#### 3. Add Retry with Exponential Backoff
**Effort**: 1-2 hours | **Impact**: Handles transient network failures

```typescript
// src/utils/fetch-with-retry.ts
export async function fetchPageWithRetry(
  page: Page,
  url: string,
  options: {
    maxRetries?: number;
    baseDelay?: number;
  } = {}
): Promise<string> {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      if (!response) throw new Error("No response");

      const status = response.status();
      if (status === 429) {
        // Rate limited - back off longer
        const delay = baseDelay * Math.pow(4, attempt);
        console.warn(`Rate limited (429), backing off ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (status >= 500) {
        // Server error - retry with backoff
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`Server error (${status}), retrying in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }

      if (status >= 400) {
        // Client error - don't retry
        throw new Error(`HTTP ${status}: ${url}`);
      }

      return await page.content();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.error(
        `Attempt ${attempt}/${maxRetries} failed for ${url}, retrying in ${delay}ms`
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${url}`);
}
```

#### 4. Extract Common URL/Data Utilities
**Effort**: 1-2 hours | **Impact**: Reduces duplication

```typescript
// src/utils/url-helpers.ts
export function normalizeUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("./")) return `${baseUrl}/${href.slice(2)}`;
  if (href.startsWith("/")) return `${baseUrl}${href}`;
  return `${baseUrl}/${href}`;
}

export function extractId(url: string, param: string): string | null {
  const match = url.match(new RegExp(`${param}=(\\d+)`));
  return match ? match[1] : null;
}

// src/utils/selectors.ts
export const SELECTORS = {
  shows: {
    byYear: (year: number) => `a[href*='TourShowSet.aspx'][href*='id=']`,
    dateDropdown: "select option:selected",
    venueLink: (onclick: string) =>
      `a[onclick*='VenueStats.aspx']`,
    setlistTable: "#SetTable",
  },
  venues: {
    list: "a[href*='VenueStats.aspx'][href*='vid=']",
  },
  songs: {
    list: "a[href*='SongStats.aspx'][href*='sid=']",
  },
};
```

### Medium Priority (Next Sprint)

#### 5. Implement Data Validation Layer
**Effort**: 3-4 hours | **Impact**: Catches corrupt/incomplete data

```typescript
// src/validation/schemas.ts
import { z } from "zod";

export const ScrapedShowSchema = z.object({
  originalId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venueName: z.string().min(2),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().min(2),
  tourYear: z.number().int().min(1991).max(2099),
  setlist: z.array(ScrapedSetlistEntrySchema).min(1),
  guests: z.array(ScrapedGuestAppearanceSchema),
});

export const ScrapedSetlistEntrySchema = z.object({
  songTitle: z.string().min(1),
  position: z.number().int().min(1),
  set: z.enum(["set1", "set2", "encore"]),
  slot: z.enum(["opener", "closer", "standard"]),
  duration: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  isSegue: z.boolean(),
  guestNames: z.array(z.string()),
});

// Usage in scrapers
try {
  const validated = ScrapedShowSchema.parse(show);
  return validated;
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(`Validation failed for show ${show.originalId}:`);
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
    return null; // Skip invalid entries
  }
  throw error;
}
```

#### 6. Consolidate Scraper Entry Points
**Effort**: 2-3 hours | **Impact**: Single source of truth

```typescript
// scraper/src/index.ts (NEW CANONICAL ENTRY POINT)
import { ShowsScraper } from "./scrapers/shows.js";
import { VenuesScraper } from "./scrapers/venues.js";
import { GuestsScraper } from "./scrapers/guests.js";
// ... etc

async function main() {
  const command = process.argv[2];

  if (command === "shows") {
    const scraper = new ShowsScraper();
    await scraper.run();
  } else if (command === "venues") {
    const scraper = new VenuesScraper();
    await scraper.run();
  } else if (command === "all") {
    // Run all in dependency order
    for (const scraperClass of [
      VenuesScraper,
      SongsScraper,
      GuestsScraper,
      ShowsScraper,
      // ... rest
    ]) {
      const scraper = new scraperClass();
      await scraper.run({ resume: true });
    }
  }
}
```

Delete or deprecate: `scrape-shows-batch.ts`, `scrape-2025-shows.ts`, etc.

#### 7. Implement Metadata Collection
**Effort**: 2 hours | **Impact**: Better monitoring/debugging

```typescript
// src/utils/metrics.ts
export interface ScraperMetrics {
  startedAt: Date;
  completedAt?: Date;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  requestsTotal: number;
  requestsPerMinute: number;
  averageTimePerItem: number;
  errors: Array<{
    url: string;
    error: string;
    timestamp: Date;
  }>;
}

// In scraper runs
const metrics: ScraperMetrics = {
  startedAt: new Date(),
  totalItems: 0,
  successfulItems: 0,
  failedItems: 0,
  requestsTotal: 0,
  requestsPerMinute: 0,
  averageTimePerItem: 0,
  errors: [],
};

// Track metrics
metrics.successfulItems++;
metrics.requestsTotal++;

// Save with output
const output = {
  scrapedAt: new Date().toISOString(),
  source: BASE_URL,
  metrics,
  totalItems: items.length,
  items,
};
```

### Low Priority (Future)

#### 8. Add Schema Versioning
Version your output JSON to handle breaking changes:

```typescript
const output: ShowsOutput = {
  version: "1.0.0",  // Schema version
  scrapedAt: new Date().toISOString(),
  source: BASE_URL,
  totalItems: shows.length,
  shows,
};
```

#### 9. Implement Differential Scraping
Only re-scrape shows since last scrape date:

```typescript
async function getShowUrlsForTour(
  page: Page,
  tourYear: number,
  lastScrapeDate?: Date
): Promise<string[]> {
  // Filter to shows after lastScrapeDate
}
```

#### 10. Add Playwright Screenshots for Debugging
Capture page state when selector fails:

```typescript
if (!venueLink.length) {
  // Debug: save screenshot
  await page.screenshot({
    path: `debug-failed-venue-${showUrl.id}.png`
  });
  console.error(`No venue link found on ${showUrl.url}`);
}
```

---

## Summary Matrix

| Aspect | Current | Issues | Recommendations |
|--------|---------|--------|-----------------|
| **Architecture** | Modular scrapers | High duplication | Base class + shared utils |
| **Error Handling** | Try-catch per page | No retries, poor logging | Retry logic + metrics |
| **Rate Limiting** | PQueue (30/min) | Inconsistent across scripts | Unified limiter |
| **Data Quality** | Good selectors | No validation | Zod schemas |
| **Testing** | Manual scripts | No unit tests | Fixture-based tests |
| **Storage** | JSON + checkpoints | Large files, no atomicity | JSONL + tmp+rename |
| **Documentation** | Inline comments | No architecture guide | Decision log |
| **Maintainability** | Moderate | Code duplication | Extract abstractions |

---

## Implementation Roadmap

### Week 1 (High Priority)
1. Create BaseScraper class (2-3h)
2. Add retry logic (1-2h)
3. Extract URL utilities (1-2h)

### Week 2 (Medium Priority)
4. Implement validation schemas (3-4h)
5. Consolidate entry points (2-3h)
6. Add metrics collection (2h)

### Week 3 (Testing)
7. Create selector fixtures (3-4h)
8. Write regression tests (4-5h)

### Ongoing
- Monitor scraper runs with metrics
- Update selectors as site changes
- Maintain test fixtures

---

## Conclusion

The DMB Almanac scraper is **functionally solid** with good patterns for rate limiting, caching, and checkpoint resumption. However, **code duplication and architectural fragmentation** create significant maintenance burden.

**Recommended approach**: Invest 2-3 days in strategic refactoring to extract common patterns into base classes and utilities. This will:
- Reduce code by 30-40%
- Improve reliability through unified error handling
- Make selector changes easier to propagate
- Enable comprehensive testing

The payoff is high relative to effort: once extracted, adding new scrapers for different data types (releases, tours, etc.) becomes trivial.

