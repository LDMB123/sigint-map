---
name: scraping-playwright-architecture
description: "scraping playwright architecture for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Playwright Scraper Architecture

## When to Use

Use this skill when:
- Building resilient web scrapers with dynamic content
- Designing rate limiting and backoff strategies
- Implementing error recovery and retry logic
- Creating maintainable page object patterns
- Handling authentication and session management
- Optimizing for headless vs. headed execution

## Architectural Pattern

Web scrapers typically follow a three-layer architecture:

```
┌─────────────────────────────────────────┐
│      Source Website / API                │
│   (Dynamic pages, JavaScript rendering)  │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│   Scraper Layer (Playwright + Cheerio)  │
│  - Browser automation                    │
│  - HTML parsing                          │
│  - Rate limiting                         │
│  - Caching & checkpointing              │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│   ETL/Transform Layer                   │
│  - Data validation                       │
│  - Normalization                         │
│  - Enrichment & linkage                 │
│  - Deduplication                        │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│   Output Layer                           │
│  - JSON files / Database                 │
│  - Cache storage                         │
│  - Error logs                            │
└─────────────────────────────────────────┘
```

## Core Components

### 1. Scraper Layer
Handles browser automation, data extraction, and caching.

**Responsibilities:**
- Fetch pages with Playwright
- Parse HTML with Cheerio
- Cache responses to disk
- Respect rate limits
- Log progress and errors

**Key Utilities:**
```typescript
// Rate limiting
createRateLimiter()
  ├─ concurrency: 2
  ├─ intervalCap: 5 requests
  └─ interval: 10000ms (5 req/10sec)

// Caching
getCachedHtml(url)      // Check cache first
cacheHtml(url, html)    // Save for reuse

// Checkpointing
loadCheckpoint(name)    // Resume progress
saveCheckpoint(name, data)
```

### 2. ETL/Transform Layer
Processes raw scraped data before storage.

**Responsibilities:**
- Validate data types
- Normalize formatting (slugs, dates, whitespace)
- Parse special formats (durations, numbers)
- Match/link related records
- Deduplicate entries
- Handle missing/invalid data

**Common Transforms:**
```typescript
// Text normalization
normalizeWhitespace(text)    // Collapse spaces
slugify(title)               // lowercase-with-hyphens
parseDate(str)               // Handle multiple formats
parseDuration("4:17")        // "4:17" → 257 seconds
parseNumber(str)             // Handle commas, currencies
```

### 3. Output Layer
Stores processed data for consumption.

**Formats:**
- JSON files (intermediate, human-readable)
- Database tables (final, queryable)
- CSV exports (data sharing)

## Dynamic Content Strategy

### Wait Strategies (Hierarchy)

```typescript
// ❌ NEVER: Fixed waits
await page.waitForTimeout(5000);

// ✅ GOOD: Wait for specific condition
await page.waitForSelector('[data-loaded="true"]');
await page.waitForLoadState('networkidle');
await page.waitForFunction(() => window.dataReady === true);

// ✅ BEST: Combine multiple conditions
await page.waitForLoadState('networkidle');
await page.waitForSelector('#content:not(.loading)');
```

### Handling JavaScript-Rendered Content

```typescript
// Check if element is in iframe
const frameLocator = page.frameLocator('iframe#data-frame');
const element = frameLocator.locator('[data-item]');

// Handle shadow DOM with piercing selector
const shadowElement = page.locator('custom-element >> button');

// Wait for dynamic list to populate
await page.waitForFunction(() => {
  return document.querySelectorAll('[data-item]').length > 0;
});
```

### Page Object Pattern

```typescript
class ItemListPage {
  constructor(private page: Page) {}

  readonly listContainer = () => this.page.locator('[data-list]');
  readonly items = () => this.listContainer().locator('[data-item]');
  readonly nextButton = () => this.page.getByRole('button', { name: 'Next' });

  async getItemCount(): Promise<number> {
    return (await this.items().all()).length;
  }

  async extractItems(): Promise<Item[]> {
    const items = [];
    for (const itemEl of await this.items().all()) {
      const title = await itemEl.locator('[data-title]').textContent();
      const url = await itemEl.locator('a').getAttribute('href');
      items.push({ title: title?.trim(), url });
    }
    return items;
  }

  async goToNextPage(): Promise<void> {
    await this.nextButton().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('[data-item]');
  }
}

// Usage
const page = await browser.newPage();
await page.goto(listUrl);
const listPage = new ItemListPage(page);
const items = await listPage.extractItems();
```

## Rate Limiting Strategies

### Priority 1: Concurrency Control
Limit parallel requests to avoid overwhelming server.

```typescript
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 2,        // Max 2 simultaneous requests
  intervalCap: 5,        // Max 5 requests
  interval: 10000        // Per 10 seconds
});

// Queue work items
for (const url of urls) {
  await queue.add(() => scrapeUrl(url));
}
```

### Priority 2: Exponential Backoff
Increase delays between retries after failures.

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// Usage
const data = await withRetry(() => scrapeItem(url), 3, 1000);
```

### Priority 3: Random Jitter
Add randomness to avoid thundering herd.

```typescript
async function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  await new Promise(r => setTimeout(r, delay));
}

// Between each request
await randomDelay(500, 2000);  // 500-2000ms random
```

## Caching Strategy

### File-Based HTML Cache
```typescript
import { promises as fs } from 'fs';
import * as path from 'path';

function getCachedHtml(url: string): string | null {
  const cacheDir = './cache';
  const filename = Buffer.from(url).toString('hex').slice(0, 32) + '.html';
  const cachePath = path.join(cacheDir, filename);

  try {
    return fs.readFileSync(cachePath, 'utf-8');
  } catch {
    return null;
  }
}

function cacheHtml(url: string, html: string): void {
  const cacheDir = './cache';
  const filename = Buffer.from(url).toString('hex').slice(0, 32) + '.html';
  const cachePath = path.join(cacheDir, filename);

  fs.writeFileSync(cachePath, html, 'utf-8');
}

// Usage in scraper
let html = getCachedHtml(url);
if (!html) {
  await page.goto(url, { waitUntil: 'networkidle' });
  html = await page.content();
  cacheHtml(url, html);
}
const $ = cheerio.load(html);
```

### Checkpoint System (Resume Progress)
```typescript
interface ScraperCheckpoint {
  completedUrls: string[];
  totalCount: number;
  lastUpdated: string;
}

function loadCheckpoint(name: string): ScraperCheckpoint | null {
  try {
    const data = fs.readFileSync(`./checkpoints/${name}.json`, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveCheckpoint(name: string, data: ScraperCheckpoint): void {
  fs.writeFileSync(`./checkpoints/${name}.json`, JSON.stringify(data, null, 2));
  console.log(`Checkpoint saved: ${data.completedUrls.length}/${data.totalCount} completed`);
}

// Usage
const checkpoint = loadCheckpoint('items') || { completedUrls: [], totalCount };
const remainingUrls = allUrls.filter(u => !checkpoint.completedUrls.includes(u));

for (const url of remainingUrls) {
  const item = await scrapeItem(url);
  items.push(item);
  checkpoint.completedUrls.push(url);
  checkpoint.lastUpdated = new Date().toISOString();
  saveCheckpoint('items', checkpoint);
}
```

## Error Recovery Patterns

### Network Error Handling
```typescript
async function fetchWithRetry(
  page: Page,
  url: string,
  options = { maxRetries: 3, timeout: 30000 }
): Promise<void> {
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: options.timeout });
      return;
    } catch (error) {
      if (i === options.maxRetries - 1) {
        console.error(`Failed to fetch ${url} after ${options.maxRetries} attempts`);
        throw error;
      }
      const delayMs = Math.pow(2, i) * 1000;
      console.warn(`Network error, retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
```

### Parsing Error Recovery
```typescript
function safeExtract(fn: () => string | null, fallback = ''): string {
  try {
    return fn()?.trim() || fallback;
  } catch (error) {
    console.warn(`Extraction failed: ${error instanceof Error ? error.message : error}`);
    return fallback;
  }
}

// Usage
const title = safeExtract(() => $('h1').text(), 'Unknown Title');
const date = safeExtract(() => parseDate($('[data-date]').text()), null);
```

### Graceful Degradation
```typescript
interface Item {
  id: string;
  title: string;
  description?: string;
  price?: number;
  inStock: boolean;
}

function extractItem($: CheerioAPI, element: Element): Item | null {
  try {
    const id = $(element).data('id');
    if (!id) return null;  // ID is required

    return {
      id,
      title: $(element).find('[data-title]').text().trim() || 'Untitled',
      description: $(element).find('[data-desc]').text().trim(),
      price: parseFloat($(element).find('[data-price]').text()) || undefined,
      inStock: $(element).find('[data-stock]').length > 0
    };
  } catch (error) {
    console.error(`Failed to extract item:`, error);
    return null;
  }
}
```

## Data Normalization

### Common Parsing Functions
```typescript
// Whitespace normalization
function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// Slug generation
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Date parsing (multiple formats)
function parseDate(dateStr: string): string | null {
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/,           // 2024-01-15
    /(\d{2})\.(\d{2})\.(\d{4})/,         // 15.01.2024
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,    // January 15, 2024
  ];

  for (const format of formats) {
    const match = dateStr.trim().match(format);
    if (match) {
      // Extract and format as YYYY-MM-DD
      // ... parsing logic
      return '2024-01-15';
    }
  }
  return null;
}

// Duration parsing
function parseDuration(durationStr: string): number {
  const match = durationStr.match(/(\d+):(\d{2})/);
  if (!match) return 0;
  const [, minutes, seconds] = match.map(Number);
  return minutes * 60 + seconds;
}
```

## Performance Optimization

### Network Blocking (Speed Up Scraping)
```typescript
// Block images, fonts, stylesheets to reduce bandwidth
await page.route('**/*', route => {
  const resourceType = route.request().resourceType();
  if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
    return route.abort();
  }
  return route.continue();
});

// More surgical: block only analytics
await page.route('**/gtag/**', route => route.abort());
await page.route('**/analytics/**', route => route.abort());
```

### Parallel Processing with Limits
```typescript
import PQueue from 'p-queue';

async function scrapeMultiple(
  urls: string[],
  scraper: (url: string) => Promise<any>,
  concurrency = 2
): Promise<any[]> {
  const queue = new PQueue({ concurrency });
  const results: any[] = [];

  const jobs = urls.map(url =>
    queue.add(async () => {
      try {
        const result = await scraper(url);
        results.push(result);
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
      }
    })
  );

  await Promise.all(jobs);
  return results;
}
```

### Headless Optimization
```typescript
// Headless mode (faster, uses less memory)
const browser = await chromium.launch({ headless: true });

// For debugging, switch to headed mode
const browser = await chromium.launch({
  headless: false,
  slowMo: 500  // Slow down interactions
});
```

## Selector Stability Hierarchy

When building selectors for dynamic sites, prefer in this order:

1. **Data attributes** (most stable, you control)
   ```typescript
   page.locator('[data-testid="item-title"]')
   ```

2. **Semantic roles** (stable, describe purpose)
   ```typescript
   page.getByRole('heading', { name: 'Item Title' })
   page.getByRole('button', { name: 'Submit' })
   ```

3. **Text content** (moderately stable)
   ```typescript
   page.getByText('Edit')
   page.getByText(/^Price: \$/i)
   ```

4. **Label associations** (accessible, stable)
   ```typescript
   page.getByLabel('Email Address')
   ```

5. **Semantic CSS** (functional, should survive redesign)
   ```typescript
   page.locator('.submit-button')
   page.locator('#login-form')
   ```

6. **Structural CSS** (fragile, avoid)
   ```typescript
   page.locator('.form > button:first-child')  // Breaks easily
   ```

7. **XPath** (last resort, extremely fragile)
   ```typescript
   page.locator('//button[contains(text(), "Save")]')
   ```

## Checklist: Production-Ready Scraper

- [ ] Rate limiting configured (concurrency + interval)
- [ ] Retry logic with exponential backoff
- [ ] Caching to avoid redundant requests
- [ ] Checkpointing for resumable progress
- [ ] Error logging with context
- [ ] Graceful degradation (partial data vs. failure)
- [ ] Data validation before storage
- [ ] Network blocking (for performance)
- [ ] Timeout configuration (per request and overall)
- [ ] User agent identification (ethical scraping)
- [ ] Robots.txt respected
- [ ] Session/cookie handling if needed
- [ ] Database transaction safety
- [ ] Monitoring/alerting on failures
- [ ] Documentation of selectors and assumptions
