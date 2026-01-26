---
name: dexie-quick-fix
version: 1.0.0
description: **Root Cause:** Cache invalidation happens immediately instead of debounced
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: data
complexity: intermediate
tags:
  - data
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
migrated_from: projects/dmb-almanac/app/docs/analysis/indexeddb/DEXIE_QUICK_FIX_GUIDE.md
migration_date: 2026-01-25
---

# Dexie/IndexedDB Quick Fix Guide

## Test Failures Summary

### query-helpers.test.ts: 10 Failed Tests (Cache Issues)

**Root Cause:** Cache invalidation happens immediately instead of debounced

**Failing Tests:**
1. `cachedQuery` - returns stale values
2. `cachedQueryWithOptions` - skipCache doesn't work
3. `aggregateByYear` - corrupted results
4. `aggregateByYearAsync` - timing issues
5. `aggregateByYearMap` - incomplete data
6. `aggregateByYearWithUniqueShows` - deduplication fails
7. `getTopByField` - stale rankings
8. `getTopByFieldCached` - cache inconsistent
9. `searchByText` - wrong results
10. `searchByTextWithSort` - sort order wrong

**Quick Fix (cache.ts line 557-580):**

```typescript
// BEFORE: Immediate invalidation
const tableHookHandler = (tableName: string) => {
  const tablesToInvalidate = mapTableToInvalidationGroups(tableName);
  if (tablesToInvalidate.length > 0) {
    invalidateCache(tablesToInvalidate);  // <-- IMMEDIATE
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('dexie-cache-invalidated', {...}));
  }, 100);
};

// AFTER: Debounced invalidation
const tableHookHandler = (tableName: string) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    const tablesToInvalidate = mapTableToInvalidationGroups(tableName);
    if (tablesToInvalidate.length > 0) {
      invalidateCache(tablesToInvalidate);  // <-- DEBOUNCED
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexie-cache-invalidated', {...}));
    }
  }, 100);
};
```

**Test Command:** `npm run test query-helpers.test.ts`

---

### data-loader.test.ts: 4 Failed Tests (Compression)

**Root Cause:** Type mismatch + missing function import

**Failing Tests:**
1. `Compression format detection` - getSupportedEncodings not defined
2. `Brotli decompression` - DecompressionStream mock incomplete
3. `Gzip decompression` - same mock issue
4. `Compression ratios` - test utilities missing

**Quick Fix (data-loader.test.ts line 1-50):**

```typescript
// ADD AT TOP
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';

// ADD FUNCTION DEFINITION
function getSupportedEncodings(): { brotli: boolean; gzip: boolean } {
  return { brotli: true, gzip: true };
}

// ENHANCE DecompressionStream mock (line 45)
global.DecompressionStream = vi.fn().mockImplementation((format) => {
  // VALIDATE FORMAT
  if (!['deflate', 'deflate-raw', 'gzip', 'br'].includes(format)) {
    throw new Error(`Unsupported compression format: ${format}`);
  }

  return {
    readable: new ReadableStream({
      start(controller) {
        // Return test data (assume decompression works)
        controller.enqueue(new TextEncoder().encode(mockJsonString));
        controller.close();
      },
    }),
    writable: new WritableStream(),
  };
});
```

**Test Command:** `npm run test data-loader.test.ts`

---

### queries.test.ts: 1 Failed Test (Multi-Entity Search)

**Root Cause:** Global search uses non-namespaced IDs

**Failing Test:** `globalSearch` - colliding entity IDs

**Quick Fix (queries.ts line 1254-1283):**

```typescript
// BEFORE: Non-namespaced IDs
const results: SearchResult[] = [
  ...songs.map((song) => ({
    type: 'song' as const,
    id: song.id,  // <-- COLLISION: song #1, venue #1 both have id=1
    // ...
  })),
];

// AFTER: Namespaced IDs
const results: SearchResult[] = [
  ...songs.map((song) => ({
    type: 'song' as const,
    entityId: song.id,
    id: `song:${song.id}`,  // <-- UNIQUE: song:1 vs venue:1
    title: song.title,
    // ... rest unchanged
  })),
  ...venues.map((venue) => ({
    type: 'venue' as const,
    entityId: venue.id,
    id: `venue:${venue.id}`,  // <-- UNIQUE
    title: venue.name,
    // ...
  })),
];

// Also update SearchResult type in schema.ts:
export interface SearchResult {
  type: 'song' | 'venue' | 'guest' | 'show';
  entityId: number;  // ADD THIS
  id: string;        // CHANGE FROM: number
  title: string;
  // ...
}
```

**Test Command:** `npm run test queries.test.ts`

---

## Chrome DevTools Debugging

### Inspect IndexedDB State

1. **Open DevTools:** F12
2. **Go to:** Application > IndexedDB > dmb-almanac > shows
3. **Click on record** to see full JSON
4. **Count records:** Right-click table, view statistics

### Test Cache State

```javascript
// In console
const { getQueryCache } = await import('/src/lib/db/dexie/cache.js');
const cache = getQueryCache();
cache.stats();  // { size: X, maxEntries: 100, expiredCount: Y }
cache.cache.forEach((entry, key) => console.log(key, entry));
```

### Check Compression Metrics

```javascript
// In console
const { compressionMonitor } = await import('/src/lib/utils/compression-monitor.js');
compressionMonitor.printSummary();
// Shows: file, format, originalSize, compressedSize, compressionRatio, loadTimeMs
```

### Monitor Transactions

```javascript
// In console, set breakpoint on first transaction
const { getDb } = await import('/src/lib/db/dexie/db.js');
const db = getDb();
db.on('error', (error) => console.error('TX ERROR:', error));
db.on('blocked', () => console.warn('TX BLOCKED - close other tabs'));
db.on('versionchange', () => console.warn('VERSION CHANGE - reconnecting'));
```

---

## Running Tests Locally

```bash
# Run specific test file
npm run test query-helpers.test.ts

# Run with verbose output
npm run test -- --reporter=verbose query-helpers.test.ts

# Run with debugging
npm run test -- --inspect-brk query-helpers.test.ts

# Watch mode (auto-rerun on file change)
npm run test -- --watch query-helpers.test.ts

# Show coverage
npm run test -- --coverage query-helpers.test.ts
```

---

## Verification Checklist

After applying fixes:

- [ ] All 15 tests pass: `npm run test`
- [ ] No console errors in DevTools
- [ ] IndexedDB data loads correctly
- [ ] Cache stats show reasonable size (< 10MB)
- [ ] Global search returns unique results
- [ ] Compression metrics print without error
- [ ] Cross-tab synchronization works
- [ ] VersionError event fires when needed

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `QuotaExceededError` | Storage full | Clear browser cache or implement eviction |
| `VersionError` | Schema mismatch | Close other tabs, increment version number |
| `TransactionInactiveError` | Async operation in transaction | Use `waitFor()` or move operation outside |
| `ConstraintError` | Duplicate key | Check primary key uniqueness |
| `DatabaseClosedError` | Connection closed by version change | Call `ensureOpen()` before query |

---

## Performance Baseline (Chromium 143)

Target metrics for validation:

| Metric | Target | Notes |
|--------|--------|-------|
| Initial load | < 3s | With compression |
| Cache hit time | < 10ms | In-memory lookup |
| Index lookup | < 50ms | [songId+showDate] search |
| Bulk insert (5000 items) | < 5s | Chunked with yield |
| Global search | < 200ms | Parallel 3-way search |
| Memory (cache) | < 5MB | 100 entries max |
| Storage (all data) | < 50MB | 50k songs, 3k shows |

---

## Contact & Escalation

- **IndexedDB Issues:** Check Chrome DevTools Application tab
- **Performance Issues:** Profile with Performance tab
- **Sync Issues:** Check Network tab for API calls
- **Compression Issues:** Check compressionMonitor metrics

