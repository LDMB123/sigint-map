# Firecrawl Pipeline Optimization - Complete Design Document

**Date**: 2026-01-30
**Status**: Ready for Implementation
**Target**: Chromium 143+ on Apple Silicon M-series, macOS 26.2
**Architecture**: Offline-first PWA with minimal JavaScript, JSDoc type safety

---

## Executive Summary

This design optimizes the DMB Almanac Firecrawl scraping pipelines with:

1. **Dexie.js IndexedDB Integration** - Direct pipeline to offline-first PWA storage
2. **Adaptive Concurrency** - Self-tuning parallel execution (2-10 requests)
3. **Intelligent Caching** - TTL-based with change detection (80-95% API credit savings)
4. **Error Recovery** - Circuit breakers, retry strategies, checkpoint/resume
5. **Apple Silicon Optimization** - E-core scheduling, UMA-aware chunking
6. **Modern JavaScript** - ES2024+ with JSDoc, no TypeScript
7. **Chromium 143 APIs** - scheduler.yield(), Background Sync, Compression Streams

---

## Design Principles

### 1. NO TypeScript - JSDoc Only
- **Rationale**: User preference, smaller bundles, zero compilation time
- **Type Safety**: Full IntelliSense via JSDoc @typedef, @type, @template
- **Migration**: TypeScript → JavaScript conversion completed by agents

### 2. Minimal JavaScript Layer
- **Leverage Native APIs**: Web Crypto, IndexedDB, scheduler, Compression Streams
- **WASM-Ready Architecture**: Parser interface for future Rust implementation
- **CSS/HTML5 First**: UI progress via CSS animations, not JS-heavy frameworks

### 3. Offline-First PWA
- **Background Sync**: Queue scrapes while offline
- **Service Worker**: Intelligent caching strategy
- **IndexedDB**: Primary data store (not just cache)

### 4. Apple Silicon Optimized
- **E-Core Scheduling**: Background tasks via scheduler.postTask({ priority: 'background' })
- **UMA-Aware Chunking**: IndexedDB batches sized for L2 cache (4MB chunks)
- **ProMotion**: Progress updates coalesced per 120Hz frame

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ User Request (Svelte Component or API)                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ AppleSiliconScraper (Orchestrator)                         │
├─────────────────────────────────────────────────────────────┤
│ • Platform detection (M4/Pro/Max/Ultra)                     │
│ • Power-aware configuration                                 │
│ • ProMotion progress coordination                           │
└────────────────┬────────────────┬───────────────────────────┘
                 ↓                ↓
    ┌────────────────────┐   ┌────────────────────┐
    │ Pre-Scrape Check   │   │ Resilient Scraper  │
    ├────────────────────┤   ├────────────────────┤
    │ • Dexie cache      │   │ • Retry strategy   │
    │ • TTL validation   │   │ • Circuit breaker  │
    │ • Change detection │   │ • Error classifier │
    └────────┬───────────┘   └────────┬───────────┘
             ↓                         ↓
    ┌─────────────────────────────────────────┐
    │ Adaptive Concurrency Pool               │
    ├─────────────────────────────────────────┤
    │ • Self-tuning (2-10 parallel)           │
    │ • E-core scheduling                     │
    │ • Network quality detection             │
    └────────┬────────────────────────────────┘
             ↓
    ┌─────────────────────────────────────────┐
    │ Firecrawl API                           │
    └────────┬────────────────────────────────┘
             ↓
    ┌─────────────────────────────────────────┐
    │ Content Parser (JS baseline + WASM)    │
    ├─────────────────────────────────────────┤
    │ • Multi-strategy extraction             │
    │ • Confidence scoring                    │
    │ • Completeness detection                │
    └────────┬────────────────────────────────┘
             ↓
    ┌─────────────────────────────────────────┐
    │ Quality Validation                      │
    ├─────────────────────────────────────────┤
    │ • Schema validation (Zod)               │
    │ • Business rules (DMB-specific)         │
    │ • Completeness scoring (0-100)          │
    └────────┬────────────────────────────────┘
             ↓
    ┌─────────────────────────────────────────┐
    │ Dexie.js Storage                        │
    ├─────────────────────────────────────────┤
    │ • scrapeCache table                     │
    │ • scrapeSyncQueue table                 │
    │ • shows table (import target)           │
    └─────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Dexie.js Schema (Version 10)

**New Tables**:

```javascript
/**
 * @typedef {Object} ScrapeCacheEntry
 * @property {string} urlHash - SHA-256 hash of URL (primary key)
 * @property {string} url - Original URL
 * @property {string} contentHash - SHA-256 of content (change detection)
 * @property {number} scrapedAt - Timestamp
 * @property {number} expiresAt - TTL expiration
 * @property {string} [etag] - HTTP ETag
 * @property {string} [lastModified] - HTTP Last-Modified
 * @property {string} markdown - Scraped markdown
 * @property {string} [html] - Optional HTML
 * @property {Object} metadata - Firecrawl metadata
 * @property {QualityMetrics} quality - Quality assessment
 * @property {ParsedShowData} [parsedShow] - Structured data
 * @property {'pending'|'synced'|'failed'} syncStatus
 * @property {number} retryCount
 */

// Schema definition
scrapeCache: '&urlHash, status, expiresAt, [status+expiresAt], contentHash, scrapedAt, importedShowId'
scrapeSyncQueue: '++id, urlHash, [status+priority], [status+createdAt], expiresAt, syncTag'
scrapeImportLog: '++id, urlHash, showId, importedAt'
```

**Index Strategy**:
- `&urlHash`: Primary key lookup (O(1))
- `[status+expiresAt]`: TTL cleanup queries
- `[status+priority]`: Background sync queue ordering
- `contentHash`: Change detection

### 2. Adaptive Concurrency Pool

```javascript
/**
 * @typedef {Object} AdaptiveConcurrencyConfig
 * @property {number} minConcurrency - Minimum parallel requests (2)
 * @property {number} maxConcurrency - Maximum parallel requests (10)
 * @property {number} targetLatency - Target response time (2000ms)
 * @property {number} adjustmentRate - How quickly to adapt (0.2)
 */

class AdaptiveConcurrencyPool {
    constructor(config, chipProfile) {
        this.currentConcurrency = config.minConcurrency;
        this.chipProfile = chipProfile; // M4/Pro/Max/Ultra
        this.recentLatencies = [];
    }

    recordSuccess(latency) {
        this.recentLatencies.push(latency);
        if (this.recentLatencies.length > 10) this.recentLatencies.shift();

        const avgLatency = this.average(this.recentLatencies);
        if (avgLatency < this.targetLatency && this.currentConcurrency < this.maxConcurrency) {
            this.currentConcurrency = Math.min(
                this.maxConcurrency,
                Math.ceil(this.currentConcurrency * 1.2)
            );
        }
    }

    recordFailure() {
        this.currentConcurrency = Math.max(
            this.minConcurrency,
            Math.floor(this.currentConcurrency * 0.5)
        );
    }
}
```

**Apple Silicon Integration**:
- M4 base: maxConcurrency = 8
- M4 Pro: maxConcurrency = 10
- M4 Max/Ultra: maxConcurrency = 12-16

### 3. Error Recovery System

**Error Classification**:
```javascript
/**
 * @typedef {'network_error'|'rate_limit'|'not_found'|'server_error'|'timeout'|'invalid_response'} ErrorClassification
 */

class ErrorClassifier {
    classify(error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('404')) return 'not_found';
        if (msg.includes('429')) return 'rate_limit';
        if (msg.includes('timeout')) return 'timeout';
        if (msg.includes('500') || msg.includes('502')) return 'server_error';
        if (msg.includes('network')) return 'network_error';
        return 'invalid_response';
    }
}
```

**Retry Strategy**:
| Error Type | Max Retries | Backoff | Should Retry |
|------------|-------------|---------|--------------|
| network_error | 3 | Exponential | Yes |
| rate_limit | 5 | Linear (60s, 120s, 180s) | Yes |
| timeout | 3 | Exponential + increase timeout | Yes |
| server_error | 1 | None | Yes |
| not_found | 0 | N/A | No |
| invalid_response | 0 | N/A | No |

**Circuit Breaker**:
```javascript
class CircuitBreaker {
    constructor(threshold = 0.5, cooldown = 60000) {
        this.state = 'CLOSED'; // CLOSED → OPEN → HALF_OPEN
        this.failureRate = 0;
        this.threshold = threshold; // 50% failure rate
        this.cooldown = cooldown; // 60s
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.openedAt > this.cooldown) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }
}
```

### 4. Quality Assessment

```javascript
/**
 * @typedef {Object} QualityMetrics
 * @property {number} completenessScore - 0-100 score
 * @property {number} parsingConfidence - 0-1 confidence
 * @property {boolean} hasCriticalData - Has date, venue, city
 * @property {boolean} hasSetlist - Has setlist entries
 * @property {string[]} issues - List of quality issues
 */

class QualityAssessor {
    assess(markdown, parsedShow) {
        const metrics = {
            completenessScore: 0,
            parsingConfidence: 0,
            hasCriticalData: false,
            hasSetlist: false,
            issues: []
        };

        // Critical fields (60 points)
        if (parsedShow.date) metrics.completenessScore += 20;
        else metrics.issues.push('Missing date');

        if (parsedShow.venue) metrics.completenessScore += 20;
        else metrics.issues.push('Missing venue');

        if (parsedShow.city) metrics.completenessScore += 20;
        else metrics.issues.push('Missing city');

        metrics.hasCriticalData = metrics.completenessScore >= 60;

        // Setlist (30 points)
        if (parsedShow.setlist && parsedShow.setlist.length >= 5) {
            metrics.completenessScore += 30;
            metrics.hasSetlist = true;
        } else if (parsedShow.setlist && parsedShow.setlist.length > 0) {
            metrics.completenessScore += 15;
            metrics.issues.push('Short setlist (<5 songs)');
        } else {
            metrics.issues.push('Missing setlist');
        }

        // Optional fields (10 points)
        if (parsedShow.notes) metrics.completenessScore += 5;
        if (parsedShow.state) metrics.completenessScore += 5;

        // Parsing confidence based on markdown structure
        const hasHeaders = /^#{1,3}\s+/m.test(markdown);
        const hasLists = /^[-*]\s+/m.test(markdown);
        metrics.parsingConfidence = (hasHeaders ? 0.5 : 0) + (hasLists ? 0.5 : 0);

        return metrics;
    }
}
```

**Acceptance Criteria**:
- `completenessScore >= 70` → Import to shows table
- `completenessScore < 70` → Flag for re-scrape or manual review
- `hasCriticalData === false` → Reject immediately

### 5. Apple Silicon Optimizations

**E-Core Scheduling**:
```javascript
async function scheduleOnECores(task) {
    if ('scheduler' in globalThis && 'postTask' in globalThis.scheduler) {
        // Maps to QOS_CLASS_UTILITY → E-cores
        return globalThis.scheduler.postTask(task, { priority: 'background' });
    }
    // Fallback
    return task();
}
```

**UMA-Optimized Chunking**:
```javascript
function calculateChunkSize(chipProfile) {
    // M4 L2 cache: 16MB per cluster
    // Keep chunks under 4MB for cache efficiency
    const baseSizeKB = 4096; // 4MB
    const multiplier = chipProfile.memoryBandwidthTier === 'very-high' ? 2 : 1;
    return baseSizeKB * multiplier * 1024; // bytes
}
```

**ProMotion Progress Coordination**:
```javascript
class ProMotionProgressReporter {
    constructor(onProgress) {
        this.onProgress = onProgress;
        this.pendingProgress = null;
        this.rafId = null;
    }

    report(progress) {
        this.pendingProgress = progress;
        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => {
                if (this.pendingProgress) {
                    this.onProgress(this.pendingProgress);
                }
                this.rafId = null;
                this.pendingProgress = null;
            });
        }
    }
}
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First scrape (50 URLs) | < 20s | Time to completion |
| Repeat scrape (cached) | < 2s | Time to completion |
| Cache hit rate | > 80% | (hits / total requests) × 100 |
| API credit savings | > 80% | Credits saved via caching |
| UI responsiveness (INP) | < 100ms | Largest delay during scrape |
| Memory usage (500 URLs) | < 15MB | Peak heap size |
| Battery impact | 2-3x improvement | Time to drain on battery |

---

## Implementation Checklist

### Phase 1: Dexie.js Schema (Day 1)
- [ ] Create `/src/lib/db/dexie/firecrawl-cache.js`
- [ ] Add version 10 to schema.js
- [ ] Implement cache operations (get, put, cleanup)
- [ ] Add TTL cleanup integration
- [ ] Write unit tests

### Phase 2: Error Recovery (Day 2-3)
- [ ] Create `/src/lib/services/firecrawl/errors.js`
- [ ] Implement error classification
- [ ] Create retry strategy with backoff
- [ ] Implement circuit breaker
- [ ] Add checkpoint/resume system
- [ ] Write error reporter

### Phase 3: Adaptive Concurrency (Day 4)
- [ ] Create `/src/lib/services/firecrawl/concurrency.js`
- [ ] Implement adaptive pool
- [ ] Add platform detection
- [ ] Integrate E-core scheduling
- [ ] Write performance tests

### Phase 4: Quality Assessment (Day 5)
- [ ] Create `/src/lib/services/firecrawl/quality.js`
- [ ] Implement completeness scoring
- [ ] Add DMB-specific validation rules
- [ ] Create parser interface (JS + WASM-ready)
- [ ] Write validation tests

### Phase 5: Main Orchestrator (Day 6-7)
- [ ] Create `/src/lib/services/firecrawl/apple-silicon-scraper.js`
- [ ] Integrate all components
- [ ] Add ProMotion progress reporting
- [ ] Implement streaming mode
- [ ] Add background sync queue
- [ ] Write integration tests

### Phase 6: Service Worker (Day 8)
- [ ] Update `/static/sw.js`
- [ ] Add Background Sync handler
- [ ] Implement cache-first strategy
- [ ] Add push notification support
- [ ] Write SW tests

### Phase 7: API Endpoints (Day 9)
- [ ] Create `/src/routes/api/firecrawl/optimized/+server.js`
- [ ] Add progress streaming endpoint
- [ ] Create export endpoints (JSON, CSV)
- [ ] Write API tests

### Phase 8: Documentation (Day 10)
- [ ] Update FIRECRAWL.md
- [ ] Create migration guide
- [ ] Add performance benchmarks
- [ ] Write troubleshooting guide

### Phase 9: Testing & Validation (Day 11)
- [ ] Run full test suite
- [ ] Performance benchmarks
- [ ] Memory profiling
- [ ] Battery impact testing
- [ ] Lighthouse PWA audit

### Phase 10: Deployment (Day 12)
- [ ] Code review
- [ ] Update dependencies
- [ ] Deploy to staging
- [ ] Monitor performance
- [ ] Deploy to production

---

## Migration Path

### From Existing Pipeline

```javascript
// Before
import { batchScrape } from '$lib/services/firecrawl';
const results = await batchScrape(urls, {}, 5);

// After
import { AppleSiliconScraper } from '$lib/services/firecrawl/apple-silicon-scraper';
const scraper = new AppleSiliconScraper();
const result = await scraper.scrapeUrls(urls, { useCache: true });
```

**Backward Compatibility**: Original `batchScrape` remains available.

---

## Success Criteria

1. ✅ **Type Safety**: 100% JSDoc coverage, zero TypeScript
2. ✅ **Performance**: 2-3x faster than original implementation
3. ✅ **Cost**: 80%+ API credit savings via caching
4. ✅ **Reliability**: < 1% failure rate with retry system
5. ✅ **UX**: < 100ms INP during heavy scraping
6. ✅ **Offline**: Full functionality while offline
7. ✅ **Apple Silicon**: E-core usage, UMA optimization
8. ✅ **PWA Score**: 100/100 on Lighthouse

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser compatibility | Medium | Feature detection + fallbacks |
| IndexedDB quota exceeded | High | Automatic cleanup + compression |
| API rate limiting | High | Circuit breaker + adaptive concurrency |
| Memory leaks | Medium | Streaming mode + garbage collection |
| Service Worker bugs | High | Comprehensive testing + rollback plan |

---

**Approved for Implementation**: 2026-01-30
**Estimated Timeline**: 12 days (96 hours)
**Next Step**: Begin Phase 1 - Dexie.js Schema
