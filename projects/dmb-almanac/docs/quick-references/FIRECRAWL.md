# Firecrawl Quick Reference

## ⚡ One-Liners

```typescript
// Scrape a page
const result = await scrapePage('https://example.com');

// Discover all URLs
const urls = await mapWebsite('https://dmbalmanac.com');

// Crawl with filters
const data = await crawlWebsite('https://dmbalmanac.com', {
  maxPages: 10,
  includes: ['ShowInfo.aspx']
});

// AI extraction
const show = await extractData(url, {
  schema: { date: 'string', venue: 'string' }
});

// Batch scrape
const results = await batchScrape([url1, url2, url3], {}, 3);
```

---

## 🎯 Common Use Cases

### Get All DMB Shows (Fast)
```typescript
const urls = await ShowDiscoveryPipeline.discoverAllShows({ maxPages: 100 });
```

### Scrape Show Data
```typescript
const shows = await ShowScrapingPipeline.scrapeShows(showUrls);
```

### AI Setlist Extraction
```typescript
const show = await AIExtractionPipeline.extractShowWithAI(url);
```

### Complete Pipeline
```typescript
const output = await EndToEndPipeline.runComplete({
  maxShows: 10,
  outputFormat: 'json'
});
```

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/firecrawl/scrape` | POST | Scrape single URL |
| `/api/firecrawl/crawl` | POST | Crawl website |
| `/api/firecrawl/map` | POST | Get all URLs |
| `/api/firecrawl/extract` | POST | AI extraction |
| `/api/firecrawl/batch` | POST | Batch scrape |

---

## 📚 Import Paths

```typescript
// Core functions
import { scrapePage, crawlWebsite, mapWebsite, extractData, batchScrape } from '$lib/services/firecrawl';

// Pipelines
import {
  ShowScrapingPipeline,
  ShowDiscoveryPipeline,
  AIExtractionPipeline,
  EndToEndPipeline
} from '$lib/services/firecrawl-pipelines';

// Utilities
import { RateLimiter, withRateLimit, FirecrawlPipeline } from '$lib/services/firecrawl';

// Examples
import { runAllExamples } from '$lib/services/firecrawl-examples';
```

---

## 🧪 Test Command

```bash
npx tsx scripts/test-firecrawl-standalone.ts
```

---

## 📖 Full Docs

- **Complete Guide**: `src/lib/services/FIRECRAWL.md`
- **Setup Guide**: `FIRECRAWL_SETUP.md`
- **Examples**: `src/lib/services/firecrawl-examples.ts`
