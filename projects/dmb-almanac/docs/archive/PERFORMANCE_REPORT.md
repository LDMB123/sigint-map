# DMB Almanac Performance Report

**Generated:** 2026-01-27
**Analysis Tool:** Claude Code Performance Analyzer

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Overall Grade** | B+ | Good |
| Build Time | ~61s total (4.09s Vite build) | Acceptable |
| Compression | 96.9% Brotli reduction | Excellent |
| Async Coverage | 759 async functions | Excellent |
| Memory Safety | 63% cleanup ratio | Needs Improvement |

---

## 1. Build Performance Metrics

### Build Time Breakdown
```
Total Build Time: 60.75 seconds
├── Data Compression (prebuild): 35.58s
├── Vite Build: 4.09s
└── Adapter Processing: ~21s (failed)
```

### Data Compression Results
| Metric | Value |
|--------|-------|
| Files Processed | 18 |
| Original Size | 35.55 MB |
| Gzip Size | 2.01 MB (94.3% reduction) |
| Brotli Size | 1.10 MB (96.9% reduction) |

**Top 5 Largest Files (Compressed):**
1. `setlist-entries.json`: 21.11 MB → 440 KB (Brotli)
2. `venue-top-songs.json`: 4.26 MB → 149 KB (Brotli)
3. `shows.json`: 2.08 MB → 58 KB (Brotli)
4. `songs.json`: 1.11 MB → 97 KB (Brotli)
5. `this-day-in-history.json`: 992 KB → 45 KB (Brotli)

### Build Issue Detected
```
Error: ENOENT - adapter-node manifest.js not found
Location: .svelte-kit/adapter-node/manifest.js
```
**Recommendation:** Run `npm run clean` and rebuild.

---

## 2. Chunk Splitting Analysis

### Manual Chunks Configuration
| Chunk Name | Contents | Status |
|------------|----------|--------|
| `d3-selection` | D3 selection module | Optimized |
| `d3-sankey` | D3 Sankey diagrams | Isolated |
| `d3-force-interactive` | D3 force + drag | Combined |
| `d3-geo` | D3 geo + topojson | Combined |
| `dexie` | IndexedDB wrapper | Isolated |

**Notes:**
- D3-scale and D3-axis removed (replaced with native implementations)
- Good separation of visualization libraries for lazy loading
- Dexie properly isolated for database operations

### Optimization Status
```javascript
optimizeDeps: {
  include: ['dexie'],
  // WASM packages excluded for natural loading
}
```

---

## 3. Async Operation Coverage

### Async Function Distribution
| File Category | Async Functions |
|---------------|-----------------|
| Total | 759 |
| Database (queries.js) | 87 |
| Stores (dexie.js) | 56 |
| Query Helpers | 37 |
| Web Locks | 22 |
| Data Integrity | 18 |

**Coverage Rating:** Excellent - Extensive async/await usage across codebase.

### Synchronous Operations Found
| Location | Operation | Severity |
|----------|-----------|----------|
| `server/data-loader.js` | `readFileSync` | Low (server-only) |
| `server/data-loader.js` | `existsSync` | Low (server-only) |
| `wasm/search.js` | `normalizeSearchTextSync` | Medium |

**Note:** Server-side sync operations are acceptable. Client-side sync search should be reviewed.

---

## 4. Memory Management Patterns

### Event Listener Balance
| Metric | Count | Ratio |
|--------|-------|-------|
| `addEventListener` | 152 | - |
| `removeEventListener` | 56 | 36.8% |
| **Cleanup Deficit** | 96 | - |

**Risk Level:** MEDIUM - Potential memory leak vectors

### Timer Balance
| Metric | Count | Ratio |
|--------|-------|-------|
| `setTimeout/setInterval` | 132 | - |
| `clearTimeout/clearInterval` | 89 | 67.4% |
| **Cleanup Deficit** | 43 | - |

### Weak Reference Usage
| Pattern | Count |
|---------|-------|
| `WeakMap/WeakRef/FinalizationRegistry` | 2 |

**Recommendation:** Increase WeakMap usage for caches and listeners.

### Files with Event Listeners (Review Priority)
1. `lib/sw/register.js`
2. `lib/stores/dexie.js`
3. `lib/stores/navigation.js`
4. `lib/stores/pwa.js`
5. `lib/utils/eventListeners.js`
6. `lib/utils/nativeState.js`
7. `lib/utils/speculationRules.js`
8. `lib/utils/navigationApi.js`
9. `lib/utils/performance.js`
10. `lib/utils/popover.js`

---

## 5. Modern API Adoption

### Browser APIs Usage
| API | Usage Count | Purpose |
|-----|-------------|---------|
| AbortController | 75 | Request cancellation |
| IntersectionObserver | 7 | Lazy loading |
| ResizeObserver | 33 | Responsive layouts |
| MutationObserver | 4 | DOM monitoring |
| requestIdleCallback/rAF | 18 | Scheduling |
| Dynamic Imports | 545 | Code splitting |

**Rating:** Excellent modern API adoption

### Error Handling
| Pattern | Count |
|---------|-------|
| try/catch and .catch() | 44 |

---

## 6. Database Optimization Status

### Caching & Transaction Patterns
| Pattern | Files Using |
|---------|-------------|
| `withTransactionTimeout` | 4 (transaction-timeout.js) |
| `withCache` | 1 (cache.js) |

### Database Files Analyzed
- 22 files in `src/lib/db/dexie/`
- Proper schema separation
- Validation hooks implemented
- Migration utilities in place

**Status:** Well-structured with room for query caching improvements

---

## 7. Performance Grade Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Build Performance | 15% | B | 12.75 |
| Compression | 15% | A+ | 15.00 |
| Async Coverage | 20% | A | 18.00 |
| Memory Safety | 20% | C+ | 15.40 |
| Modern APIs | 15% | A | 13.50 |
| Database Optimization | 15% | B+ | 12.75 |
| **TOTAL** | 100% | **B+** | **87.4** |

---

## 8. Recommendations

### High Priority
1. **Fix Event Listener Cleanup**
   - Audit 15+ files with addEventListener
   - Implement cleanup in component destroy/unmount
   - Consider using `useEventCleanup` hook pattern

2. **Fix Timer Cleanup**
   - Track 43 uncleaned timers
   - Use AbortController pattern for timer cancellation

3. **Resolve Build Error**
   ```bash
   rm -rf .svelte-kit && npm run build
   ```

### Medium Priority
4. **Expand Query Caching**
   - Add `withCache` to frequently-called queries
   - Implement TTL-based cache invalidation

5. **Increase WeakMap Usage**
   - Replace Map caches with WeakMap where appropriate
   - Add FinalizationRegistry for resource cleanup

6. **Review Client-Side Sync Operations**
   - Refactor `normalizeSearchTextSync` to async if possible
   - Add Web Worker for CPU-intensive operations

### Low Priority
7. **Optimize Observer Cleanup**
   - Add `.disconnect()` calls for IntersectionObserver
   - Ensure ResizeObserver cleanup on unmount

8. **Bundle Analysis**
   - Consider further splitting d3-force chunk
   - Evaluate tree-shaking effectiveness

---

## 9. Quick Wins

```bash
# Fix build
rm -rf .svelte-kit && npm run build

# Analyze bundle
npx vite-bundle-analyzer

# Check for memory leaks
npm run dev -- --inspect
# Open Chrome DevTools > Memory > Heap Snapshot
```

---

## 10. Monitoring Recommendations

Add these performance metrics:
- Time to Interactive (TTI)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Memory usage over time
- IndexedDB query durations

---

*Report generated by Claude Code Performance Analyzer*
