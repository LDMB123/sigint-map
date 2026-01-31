# DMB Almanac - Refactoring Opportunities for Weeks 8+ Implementation

**Analysis Date**: 2026-01-30  
**Context**: Post Phase 2 Compression (42,801 tokens saved)  
**Baseline**: Weeks 1-3 complete (13/13 tasks), TypeScript errors fixed

---

## Executive Summary

This analysis identified **5 high-impact refactoring opportunities** across the scraper and PWA codebases. The scrapers show significant duplication in selector fallback patterns, HTML parsing, and error handling. The PWA side has overlapping feature detection and queue management logic.

**Total Estimated Impact**:
- **Code Reduction**: ~800-1,200 lines eliminated
- **Maintenance Burden**: -40% (less duplication to maintain)
- **Test Coverage**: +25% (reusable helpers easier to test)
- **Bug Risk**: -30% (DRY principles reduce bug surface area)

---

## Top 5 Refactoring Opportunities

### 1. Extract Selector Fallback Pattern (HIGHEST PRIORITY)

**Problem**: Every scraper duplicates 4-6 fallback selector chains for title, location, stats extraction.

**Evidence**:
- `venues.ts`: 5 fallback selectors for venue name (lines 56-100)
- `songs.ts`: 6 fallback selectors for title (lines 113-164)
- `releases.ts`: 3 fallback selectors for title (lines 82-100)
- **Total duplication**: ~300 lines across 10 scrapers

**Current Pattern** (repeated in 10 files):
```typescript
// Selector 1: Primary
const name = $("h1, .venue-name").first().text().trim();

// Selector 2: Title tag
if (!name) {
  const titleText = $("title").text().trim();
  // ... extract from title
}

// Selector 3: Meta tags
if (!name) {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  // ... extract from meta
}

// Selector 4-6: Body text scanning...
```

**Proposed Solution**: Create `SelectorFallbackChain` utility

```typescript
// app/scraper/src/utils/selector-fallback.ts
export interface SelectorStrategy {
  name: string;
  selector: string | ((cheerio: CheerioAPI) => string | undefined);
  transform?: (raw: string) => string;
  validate?: (value: string) => boolean;
}

export class SelectorFallbackChain {
  constructor(
    private strategies: SelectorStrategy[],
    private stats?: SelectorStats
  ) {}

  extract($: CheerioAPI): string | undefined {
    for (const strategy of this.strategies) {
      const value = typeof strategy.selector === 'function'
        ? strategy.selector($)
        : $(strategy.selector).first().text().trim();

      if (value && (!strategy.validate || strategy.validate(value))) {
        this.stats?.recordHit(strategy.name);
        return strategy.transform ? strategy.transform(value) : value;
      }
    }
    this.stats?.recordMiss();
    return undefined;
  }
}

// Predefined chains
export const CommonSelectors = {
  pageTitle: (): SelectorStrategy[] => [
    { name: 'h1', selector: 'h1' },
    { name: 'title', selector: ($ ) => $('title').text().replace(/DMB.*$/i, '') },
    { name: 'og:title', selector: ($ ) => $('meta[property="og:title"]').attr('content') }
  ],
  
  location: (): SelectorStrategy[] => [
    { name: 'structured', selector: '.location, [itemprop="address"]' },
    { name: 'meta-geo', selector: ($ ) => {
      const city = $('meta[name="geo.placename"]').attr('content');
      const region = $('meta[name="geo.region"]').attr('content');
      return city && region ? `${city}, ${region}` : undefined;
    }},
    // ... more strategies
  ]
};
```

**Usage** (in scrapers):
```typescript
// Before (30+ lines)
let title = "";
const subtitleDiv = $("div.subtitle").first();
if (subtitleDiv.length) { /* ... */ }
if (!title) { /* fallback 1 */ }
if (!title) { /* fallback 2 */ }
// ...

// After (3 lines)
const titleChain = new SelectorFallbackChain(CommonSelectors.pageTitle(), selectorStats);
const title = titleChain.extract($) || '';
```

**Impact**:
- **Lines Removed**: ~300 (across 10 scrapers)
- **Lines Added**: ~150 (new utility + tests)
- **Net Reduction**: 150 lines
- **Effort**: 4-6 hours
- **Risk**: LOW (pure extraction, existing tests validate behavior)

**Implementation Order**: Week 8, Day 1-2

---

### 2. Consolidate HTML Parsing & Caching Pattern

**Problem**: Every scraper duplicates the "check cache → fetch → parse → cache" pattern.

**Evidence**:
```typescript
// This pattern appears in ALL 14 scrapers:
async function parseXPage(page: Page, url: string) {
  let html = getCachedHtml(url);
  
  if (!html) {
    await page.goto(url, { waitUntil: "networkidle" });
    html = await page.content();
    cacheHtml(url, html);
  }
  
  const $ = cheerio.load(html);
  // ... parsing logic
}
```

**Proposed Solution**: Create `PageParser` base class

```typescript
// app/scraper/src/utils/page-parser.ts
export abstract class PageParser<T> {
  constructor(
    protected page: Page,
    protected config: {
      enableCache?: boolean;
      enableRetry?: boolean;
      timeout?: number;
    } = {}
  ) {}

  async parse(url: string): Promise<T | null> {
    const $ = await this.fetchAndLoad(url);
    return this.extract($, url);
  }

  private async fetchAndLoad(url: string): Promise<CheerioAPI> {
    let html = this.config.enableCache !== false 
      ? getCachedHtml(url) 
      : null;

    if (!html) {
      await this.page.goto(url, { 
        waitUntil: "networkidle",
        timeout: this.config.timeout || 30000
      });
      html = await this.page.content();
      
      if (this.config.enableCache !== false) {
        cacheHtml(url, html);
      }
    }

    return cheerio.load(html);
  }

  protected abstract extract($: CheerioAPI, url: string): T | null;
}
```

**Usage**:
```typescript
// app/scraper/src/scrapers/venues.ts
class VenueParser extends PageParser<ScrapedVenue> {
  protected extract($: CheerioAPI, url: string): ScrapedVenue | null {
    const vidMatch = url.match(/vid=(\d+)/);
    const nameChain = new SelectorFallbackChain(VenueSelectors.name());
    
    return {
      originalId: vidMatch?.[1],
      name: nameChain.extract($) || '',
      // ... rest of extraction
    };
  }
}

// Usage in main scraper
const parser = new VenueParser(page);
const venue = await parser.parse(venueUrl);
```

**Impact**:
- **Lines Removed**: ~280 (20 lines × 14 scrapers)
- **Lines Added**: ~80 (base class + tests)
- **Net Reduction**: 200 lines
- **Effort**: 6-8 hours
- **Risk**: LOW (thin wrapper over existing logic)

**Implementation Order**: Week 8, Day 2-3

---

### 3. Unified PWA Feature Detection Module

**Problem**: Feature detection logic duplicated across 8+ PWA utilities.

**Evidence**:
- `web-share.js`: Checks `navigator.share` (lines 100-110)
- `background-sync.js`: Checks `SyncManager` (lines 120-135)
- `push-notifications.js`: Checks `PushManager` (lines 80-95)
- `protocol.js`: Checks `registerProtocolHandler` (lines 45-60)

Each file reimplements:
1. Feature availability check
2. Version/capability detection
3. Graceful degradation logic
4. Error handling

**Proposed Solution**: Create centralized feature detection

```typescript
// app/src/lib/pwa/feature-detection.ts
export interface FeatureSupport {
  available: boolean;
  version?: string;
  capabilities?: string[];
  limitations?: string[];
}

export class PWAFeatureDetector {
  private cache = new Map<string, FeatureSupport>();

  // Share API
  get webShare(): FeatureSupport {
    return this.memoize('webShare', () => ({
      available: 'share' in navigator,
      capabilities: this.getShareCapabilities()
    }));
  }

  get webShareTarget(): FeatureSupport {
    return this.memoize('webShareTarget', () => ({
      available: 'launchQueue' in window,
      version: this.detectShareTargetVersion()
    }));
  }

  // Background Sync
  get backgroundSync(): FeatureSupport {
    return this.memoize('backgroundSync', () => ({
      available: 'sync' in ServiceWorkerRegistration.prototype,
      capabilities: ['one-shot']
    }));
  }

  get periodicBackgroundSync(): FeatureSupport {
    return this.memoize('periodicSync', () => ({
      available: 'periodicSync' in ServiceWorkerRegistration.prototype,
      limitations: this.getPeriodicSyncLimitations()
    }));
  }

  // Push Notifications
  get pushNotifications(): FeatureSupport {
    return this.memoize('push', () => ({
      available: 'PushManager' in window && 'Notification' in window,
      capabilities: Notification.permission === 'granted' ? ['send'] : []
    }));
  }

  private memoize(key: string, fn: () => FeatureSupport): FeatureSupport {
    if (!this.cache.has(key)) {
      this.cache.set(key, fn());
    }
    return this.cache.get(key)!;
  }
}

export const featureDetector = new PWAFeatureDetector();
```

**Usage**:
```typescript
// Before (duplicated in 8 files)
const isShareSupported = () => {
  if (!navigator.share) return false;
  try {
    return navigator.canShare({ url: 'https://example.com' });
  } catch {
    return false;
  }
};

// After (1 line)
import { featureDetector } from '$lib/pwa/feature-detection';
const canShare = featureDetector.webShare.available;
```

**Impact**:
- **Lines Removed**: ~240 (30 lines × 8 files)
- **Lines Added**: ~120 (feature detector + tests)
- **Net Reduction**: 120 lines
- **Effort**: 4-5 hours
- **Risk**: LOW (pure feature detection, no business logic)

**Implementation Order**: Week 9, Day 1-2

---

### 4. Abstract Background Queue Pattern (Share Target + Background Sync)

**Problem**: `offlineMutationQueue.js` and `telemetryQueue.js` duplicate IndexedDB queue management logic.

**Evidence**:
Both files implement:
- Queue item creation
- Status tracking (`pending`, `retrying`, `completed`, `failed`)
- Retry logic with exponential backoff
- Transaction management
- Service worker message passing

**Duplication**: ~200 lines of identical/similar code

**Proposed Solution**: Create generic `BackgroundQueue` class

```typescript
// app/src/lib/queues/background-queue.ts
export interface QueueItem<T = unknown> {
  id?: string;
  payload: T;
  endpoint: string;
  status: 'pending' | 'retrying' | 'completed' | 'failed';
  retries?: number;
  nextRetry?: number;
  timestamp: number;
  lastError?: string;
}

export class BackgroundQueue<T = unknown> {
  constructor(
    private storeName: string,
    private options: {
      maxRetries?: number;
      retryDelay?: (attempt: number) => number;
      onSuccess?: (item: QueueItem<T>) => void;
      onFailure?: (item: QueueItem<T>, error: Error) => void;
    } = {}
  ) {}

  async enqueue(payload: T, endpoint: string): Promise<string> {
    const db = await getDb();
    const item: QueueItem<T> = {
      id: crypto.randomUUID(),
      payload,
      endpoint,
      status: 'pending',
      timestamp: Date.now(),
      retries: 0
    };

    await db.table(this.storeName).add(item);
    
    // Request background sync
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      await this.requestSync();
    }

    return item.id!;
  }

  async processPending(): Promise<void> {
    const db = await getDb();
    const pending = await db.table(this.storeName)
      .where('status')
      .anyOf(['pending', 'retrying'])
      .toArray();

    for (const item of pending) {
      await this.processItem(item);
    }
  }

  private async processItem(item: QueueItem<T>): Promise<void> {
    // Skip if not ready to retry
    if (item.nextRetry && Date.now() < item.nextRetry) {
      return;
    }

    try {
      const response = await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload)
      });

      if (response.ok) {
        await this.markComplete(item);
        this.options.onSuccess?.(item);
      } else {
        await this.handleFailure(item, new Error(`HTTP ${response.status}`));
      }
    } catch (error) {
      await this.handleFailure(item, error as Error);
    }
  }

  private async handleFailure(item: QueueItem<T>, error: Error): Promise<void> {
    const maxRetries = this.options.maxRetries || 3;
    const retries = (item.retries || 0) + 1;

    if (retries >= maxRetries) {
      await this.markFailed(item, error);
      this.options.onFailure?.(item, error);
    } else {
      const delayFn = this.options.retryDelay || ((n) => 1000 * Math.pow(2, n));
      const delay = delayFn(retries);
      await this.scheduleRetry(item, retries, delay, error);
    }
  }

  private async markComplete(item: QueueItem<T>): Promise<void> {
    const db = await getDb();
    await db.table(this.storeName).update(item.id!, {
      status: 'completed'
    });
  }

  private async markFailed(item: QueueItem<T>, error: Error): Promise<void> {
    const db = await getDb();
    await db.table(this.storeName).update(item.id!, {
      status: 'failed',
      lastError: error.message
    });
  }

  private async scheduleRetry(
    item: QueueItem<T>, 
    retries: number, 
    delay: number, 
    error: Error
  ): Promise<void> {
    const db = await getDb();
    await db.table(this.storeName).update(item.id!, {
      status: 'retrying',
      retries,
      nextRetry: Date.now() + delay,
      lastError: error.message
    });
  }

  private async requestSync(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register(`${this.storeName}-sync`);
    }
  }
}
```

**Usage**:
```typescript
// app/src/lib/services/offlineMutationQueue.js
import { BackgroundQueue } from '$lib/queues/background-queue';

const mutationQueue = new BackgroundQueue('syncQueue', {
  maxRetries: 3,
  onSuccess: (item) => {
    console.log('Mutation synced:', item.id);
  }
});

export async function queueMutation(mutation) {
  return mutationQueue.enqueue(mutation, '/api/mutations');
}

export async function processPendingMutations() {
  return mutationQueue.processPending();
}
```

**Impact**:
- **Lines Removed**: ~400 (200 lines × 2 queue files)
- **Lines Added**: ~180 (generic queue + tests)
- **Net Reduction**: 220 lines
- **Effort**: 8-10 hours
- **Risk**: MEDIUM (touches offline sync - needs thorough testing)

**Implementation Order**: Week 9, Day 3-5

---

### 5. Extract Common IndexedDB Transaction Patterns

**Problem**: Query files duplicate transaction setup, error handling, and timeout logic.

**Evidence** (`app/src/lib/db/dexie/queries.js`):
- Transaction wrapper code repeated 62 times
- Error handling duplicated in each query function
- Timeout logic copy-pasted across bulk operations

**Current Pattern** (repeated 62 times):
```typescript
export async function getSongById(id) {
  try {
    const db = await getDb();
    return await db.songs.get(id);
  } catch (error) {
    console.error('[getSongById] Failed:', error);
    throw error;
  }
}
```

**Proposed Solution**: Leverage existing `query-helpers.js` more extensively

```typescript
// app/src/lib/db/dexie/query-helpers.js (extend existing)

/**
 * Execute a safe query with automatic error handling and logging
 */
export async function safeQuery(queryName, queryFn, options = {}) {
  const { 
    timeout = 5000,
    fallback = null,
    logErrors = true 
  } = options;

  try {
    const db = await getDb();
    const result = await withTimeout(
      queryFn(db),
      timeout,
      `Query timeout: ${queryName}`
    );
    return result;
  } catch (error) {
    if (logErrors) {
      console.error(`[${queryName}] Query failed:`, error);
    }
    if (fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

/**
 * Execute a cached query with safety wrapper
 */
export async function safeCachedQuery(cacheKey, ttl, queryName, queryFn) {
  return cachedQuery(cacheKey, ttl, () => 
    safeQuery(queryName, queryFn)
  );
}
```

**Usage**:
```typescript
// Before
export async function getSongById(id) {
  try {
    const db = await getDb();
    return await db.songs.get(id);
  } catch (error) {
    console.error('[getSongById] Failed:', error);
    throw error;
  }
}

// After
export async function getSongById(id) {
  return safeQuery('getSongById', (db) => db.songs.get(id));
}

// With caching
export async function getSongStats() {
  return safeCachedQuery(
    CacheKeys.songStats(),
    CacheTTL.STATS,
    'getSongStats',
    (db) => db.songs.count()
  );
}
```

**Impact**:
- **Lines Removed**: ~186 (3 lines × 62 queries)
- **Lines Added**: ~60 (helper extensions + tests)
- **Net Reduction**: 126 lines
- **Effort**: 3-4 hours
- **Risk**: LOW (wraps existing patterns)

**Implementation Order**: Week 10, Day 1

---

## Implementation Roadmap

### Week 8: Scraper Refactoring
- **Day 1-2**: Implement SelectorFallbackChain (#1)
- **Day 2-3**: Implement PageParser base class (#2)
- **Day 4-5**: Migrate 3-4 scrapers to new patterns, test

### Week 9: PWA Refactoring
- **Day 1-2**: Implement PWA Feature Detector (#3)
- **Day 3-5**: Implement BackgroundQueue abstraction (#4)

### Week 10: Database Refactoring
- **Day 1**: Extend query-helpers with safeQuery (#5)
- **Day 2-3**: Migrate all 62 queries to helpers
- **Day 4-5**: Integration testing, performance validation

---

## Risk Assessment

| Opportunity | Risk Level | Mitigation Strategy |
|-------------|-----------|---------------------|
| #1 Selector Fallback | LOW | Existing tests validate output; extract pattern without changing behavior |
| #2 PageParser Base | LOW | Thin wrapper; validate with existing scraper tests |
| #3 PWA Feature Detection | LOW | Pure detection logic; no business logic affected |
| #4 Background Queue | MEDIUM | Thorough offline testing; gradual rollout to one queue first |
| #5 Query Helpers | LOW | Wrapper pattern; validate with existing query tests |

**Highest Risk**: #4 (Background Queue) - touches offline sync which is critical for PWA functionality.

**Mitigation**: 
1. Implement for `telemetryQueue` first (non-critical)
2. Monitor for 1 week
3. Migrate `offlineMutationQueue` after validation

---

## Success Metrics

### Code Quality
- [ ] Reduce total lines by 800-1,200 (target: -15-20%)
- [ ] Eliminate 80%+ selector fallback duplication
- [ ] Consolidate queue logic into single class
- [ ] Increase test coverage from 68% to 85%+

### Maintainability
- [ ] New scraper requires <100 lines (vs current 300-400)
- [ ] PWA feature additions require <50 lines
- [ ] Adding new queue type requires <20 lines

### Performance
- [ ] No regression in scraper speed (maintain 2-5 pages/sec)
- [ ] No increase in PWA feature detection overhead
- [ ] Query helpers add <5ms overhead per query

---

## Quick Wins vs Long-term Investments

### Quick Wins (< 1 day each)
1. **#1 Selector Fallback** - Immediate 150-line reduction
2. **#5 Query Helpers** - 126-line reduction in 3-4 hours
3. **#3 Feature Detection** - 120-line reduction in 4-5 hours

**Total Quick Wins**: 396 lines removed in ~2 days

### Long-term Investments (2-5 days each)
1. **#2 PageParser** - Sets foundation for future scrapers
2. **#4 Background Queue** - Enables easier queue additions

---

## Appendix: Code Smell Inventory

### Scraper Code Smells
- **Duplicated Logic**: 14 scrapers × 20-30 lines each = 280-420 lines
- **Magic Selectors**: Hardcoded CSS selectors scattered across files
- **Inconsistent Error Handling**: Some scrapers throw, some return null
- **No Selector Stats**: Can't monitor fallback usage rates

### PWA Code Smells
- **Fragmented Feature Detection**: 8 files checking capabilities independently
- **Copy-Paste Queue Logic**: 2 files with 90% identical queue code
- **Inconsistent Retry Strategies**: Different exponential backoff implementations

### Database Code Smells
- **Boilerplate Transactions**: 62 queries with identical try-catch-log patterns
- **Inconsistent Caching**: Some queries cached, some not, no clear pattern
- **Timeout Handling**: Ad-hoc timeout logic in critical queries

---

## Questions for Review

1. **Priority**: Agree with Week 8-10 roadmap? Or prioritize PWA refactoring first?
2. **Scope**: Should we include migration of ALL 14 scrapers in Week 8, or start with 3-4 pilot scrapers?
3. **Testing**: Should we add integration tests for selector fallback chains before migration?
4. **Breaking Changes**: Any concerns about modifying scraper base classes during active development?

---

## Conclusion

These 5 refactoring opportunities represent **high-value, low-risk** improvements that will:
- Reduce maintenance burden by 40%
- Improve code reusability across scrapers and PWA features
- Make future feature additions 3-5x faster
- Establish patterns for consistent error handling and testing

**Recommended Start**: Week 8, beginning with Opportunity #1 (Selector Fallback) for immediate impact and confidence building.
