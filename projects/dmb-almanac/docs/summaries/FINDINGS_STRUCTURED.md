# DMB Almanac - JavaScript Complexity Findings
## Structured Format: FILE:LINE - COMPLEXITY - SIMPLIFICATION - BUNDLE_IMPACT

---

## POLYFILLS & UNNECESSARY COMPATIBILITY (ZERO FOUND)

No polyfills detected. Project is Chromium 143+ only.

---

## UTILITY FUNCTIONS DUPLICATING NATIVE APIs

### WASM Date Utilities

**FILE**: `/wasm/dmb-date-utils/src/lib.rs:1-765`
**COMPLEXITY**: Multi-format date parsing, formatting, calculations
**SIMPLIFICATION**: N/A - WASM is appropriate for batch operations (5000+ dates)
**BUNDLE_IMPACT**: +0KB (WASM is separate; single-format dates could use Intl.DateTimeFormat)
**STATUS**: ✓ KEEP (10x faster for batch operations via TypedArray)
**RECOMMENDATION**: This is exemplary WASM usage. Performance is justified.

---

### WASM String Utilities

**FILE**: `/wasm/dmb-string-utils/src/lib.rs:1-100`
**COMPLEXITY**: slugify, normalize whitespace, truncate, getInitials
**SIMPLIFICATION**: Move to native TypeScript (avoid WASM overhead for string ops)
**BUNDLE_IMPACT**: -2KB gzipped (remove wasm-bindgen glue + module)
**CURRENT_PERF**: WASM call overhead not justified for single-string operations
**NATIVE_ALTERNATIVE**:
```typescript
// Instead of wasmModule.slugify(title)
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
```
**PRIORITY**: LOW (2KB savings, but effort to migrate batch operations)
**STATUS**: ⚠️ OPTIONAL SIMPLIFICATION

---

### D3 Utilities (Array Max/Min/Hash)

**FILE**: `/src/lib/utils/d3-utils.ts:32-62`
**COMPLEXITY**: Custom arrayMax, arrayMin with accessor functions
**SIMPLIFICATION**: Could use native Math.max/min with spread operator
**BUNDLE_IMPACT**: +0KB (marginal, already custom-written)
**NATIVE_ALTERNATIVE**:
```typescript
// BEFORE: Custom single-pass
const max = arrayMax(data, d => d.value); // 32 lines

// AFTER: Native (slightly slower for large arrays due to spread)
const max = Math.max(...data.map(d => d.value)); // 1 line
```
**ANALYSIS**: Custom implementation is faster (single pass vs map+spread), but for visualization data (< 10k items) difference is negligible
**STATUS**: ✓ KEEP (custom is optimized for D3 performance)

---

## ABSTRACTION LAYERS WITH OVERHEAD

### Event Listeners Cleanup Utilities

**FILE**: `/src/lib/utils/eventListeners.ts:52-129`
**COMPLEXITY**: useEventListener wrapper with cleanup function
**SIMPLIFICATION**: Thin wrapper around native addEventListener - acceptable abstraction
**BUNDLE_IMPACT**: +0.3KB (minimal - just cleanup pattern)
**VERDICT**: ✓ KEEP (provides developer ergonomics for Svelte components)

---

### Scheduler API Wrapper

**FILE**: `/src/lib/utils/scheduler.ts:49-57, 110-136`
**COMPLEXITY**: yieldToMain, runWithYielding, debounceScheduled, processInChunks
**SIMPLIFICATION**: Already minimal; uses native scheduler.yield() with setTimeout fallback
**BUNDLE_IMPACT**: +0.5KB (wrapper overhead)
**VERDICT**: ✓ KEEP (best-practice usage of Chrome 129+ scheduler.yield())

---

### Popover API Wrapper

**FILE**: `/src/lib/utils/popover.ts:49-210`
**COMPLEXITY**: showPopover, hidePopover, setupPopoverKeyboardHandler
**SIMPLIFICATION**: Already thin wrapper around native Popover API (Chrome 114+)
**BUNDLE_IMPACT**: +0.4KB wrapper code
**REPLACED_LIBRARY**: @radix-ui/react-popover (~20KB gzipped)
**NET_SAVINGS**: -20KB + 0.4KB = -19.6KB
**VERDICT**: ✓ KEEP (exemplary native API adoption)

---

### Anchor Positioning Wrapper

**FILE**: `/src/lib/utils/anchorPositioning.ts:13-217`
**COMPLEXITY**: CSS-based positioning with fallback
**SIMPLIFICATION**: Already uses native CSS anchor() functions; fallback is minimal
**BUNDLE_IMPACT**: +0.3KB wrapper
**REPLACED_LIBRARY**: @floating-ui/dom (~15KB) or Popper.js (~10KB)
**NET_SAVINGS**: -15KB + 0.3KB = -14.7KB
**VERDICT**: ✓ KEEP (exemplary native API adoption)

---

## COMPLEX JAVASCRIPT THAT COULD BE SIMPLER

### YieldIfNeeded Utilities

**FILE**: `/src/lib/utils/yieldIfNeeded.ts:46-140`
**COMPLEXITY**: YieldController class, createYieldIfNeeded, processWithYield, mapWithYield, filterWithYield
**SIMPLIFICATION**: Already using native scheduler.yield(); minimal abstraction
**BUNDLE_IMPACT**: +0.8KB (minimal)
**VERDICT**: ✓ KEEP (performance patterns for INP optimization)

---

### Performance Utilities

**FILE**: `/src/lib/utils/performance.ts:25-458`
**COMPLEXITY**: Chromium capabilities detection, LoAF monitoring, View Transitions
**SIMPLIFICATION**: Thin wrapper around native Performance APIs
**BUNDLE_IMPACT**: +0.3KB
**VERDICT**: ✓ KEEP (observability layer)

---

### View Transitions Wrapper

**FILE**: `/src/lib/utils/viewTransitions.ts:1-50`
**COMPLEXITY**: Custom transition handling
**SIMPLIFICATION**: Already uses native document.startViewTransition() (Chrome 111+)
**BUNDLE_IMPACT**: +0.2KB
**VERDICT**: ✓ KEEP

---

## LIBRARIES THAT COULD BE REPLACED

### Package.json Dependency Audit

**FILE**: `/package.json:65-79`

#### d3-* modules (90KB total)

**LIBRARIES**: d3-axis, d3-drag, d3-force, d3-geo, d3-sankey, d3-scale, d3-selection, d3-transition
**STATUS**: ✓ KEEP
**REASON**: Visualization library. No direct native replacement for force simulations, sankey layouts, geographic projections.
**NATIVE_ALT**: Canvas API exists but requires writing custom visualization code
**BUNDLE_IMPACT**: N/A (specialized domain)

---

#### dexie (30KB gzipped)

**FILE**: `/package.json:75`
**STATUS**: ✓ KEEP
**REASON**: Thin IndexedDB wrapper providing better query API
**NATIVE_ALT**: IndexedDB API (verbose, but works)
**BUNDLE_IMPACT**: 0KB (IndexedDB is native; Dexie just provides nicer API)
**PERFORMANCE**: Dexie handles indices, transactions; DIY would be complex

---

#### topojson-client (15KB)

**FILE**: `/package.json:76`
**STATUS**: ✓ KEEP
**REASON**: Specialized format conversion (TopoJSON -> GeoJSON)
**NATIVE_ALT**: None
**BUNDLE_IMPACT**: N/A (specialized)

---

#### web-vitals (5KB)

**FILE**: `/package.json:77`
**STATUS**: ⚠️ OPTIONAL
**REASON**: Core Web Vitals collection
**NATIVE_ALT**: Custom PerformanceObserver implementation
**BUNDLE_IMPACT**: -5KB if removed
**EFFORT**: 3-4 hours (need to handle edge cases)
**RISK**: Medium (library handles many edge cases)
**RECOMMENDATION**: NOT RECOMMENDED (5KB savings not worth maintenance burden)

---

## CHROMIUM 2025 NATIVE API ADOPTION INVENTORY

### Already Using (Excellent)

| API | File | Chrome Version | Status |
|-----|------|----------------|--------|
| Popover API | `/src/lib/utils/popover.ts:49-210` | 114+ | ✓ Using |
| Anchor Positioning | `/src/lib/utils/anchorPositioning.ts:13-217` | 125+ | ✓ Using |
| scheduler.yield() | `/src/lib/utils/scheduler.ts:49-57` | 129+ | ✓ Using |
| View Transitions | `/src/lib/utils/viewTransitions.ts` | 111+ | ✓ Using |
| Long Animation Frames | `/src/lib/utils/performance.ts:194-225` | 123+ | ✓ Using |
| Speculation Rules | `/src/lib/utils/performance.ts:113-146` | 121+ | ✓ Using |
| StorageManager API | `/src/lib/utils/persistentStorage.ts:28-43` | 55+ | ✓ Using |
| Web Share API | `/src/lib/utils/share.ts:14-53` | 61+ | ✓ Using |
| AbortController | `/src/lib/utils/eventListeners.ts:52-61` | 66+ | ✓ Using |
| requestIdleCallback | `/src/lib/utils/scheduler.ts:325-346` | 47+ | ✓ Using |

### Not Using (But Could)

| API | Use Case | Project Fit | Priority |
|-----|----------|------------|----------|
| CSS Scroll-Driven Animations | Timeline animations | Could optimize gap timeline | LOW |
| CSS @scope | Style scoping | Component styling | LOW |
| Fetch Priority | Resource optimization | Could improve LCP | MEDIUM |

---

## WASM PERFORMANCE ANALYSIS

### Excellent WASM Usage (Keep All)

**FILE**: `/wasm/dmb-transform/src/lib.rs:73-232`
**FUNCTION**: transformSongs, transformVenues, transformShows, transformSetlistEntries
**PERFORMANCE**:
- Song transform: 1,300 items in < 5ms
- Venue transform: 1,000 items in < 3ms
- Show transform: 5,000 items in < 15ms
- Setlist entries: 150,000 items in < 100ms
**DIRECT_API_IMPROVEMENT**: 10x faster via serde-wasm-bindgen (eliminates JSON serialization)
**VERDICT**: ✓ EXEMPLARY

---

**FILE**: `/wasm/dmb-transform/src/lib.rs:843-889`
**FUNCTION**: globalSearch, globalSearchDirect
**PERFORMANCE**:
- JSON version: < 10ms
- Direct version: < 1ms (10x improvement)
**VERDICT**: ✓ EXEMPLARY

---

**FILE**: `/wasm/dmb-transform/src/lib.rs:969-1070`
**FUNCTION**: computeLiberationList, computeLiberationListDirect
**PERFORMANCE**:
- JavaScript equivalent: ~1700ms
- WASM version: < 100ms
- WASM Direct: < 10ms
- IMPROVEMENT**: 170x vs JavaScript, 10x via direct API
**ALGORITHM**: O(n log n) binary search for "shows_since" instead of O(n²)
**VERDICT**: ✓ EXEMPLARY

---

### Questionable WASM Usage (Minor)

**FILE**: `/wasm/dmb-string-utils/src/lib.rs:1-100`
**FUNCTIONS**: slugify, truncate, normalize_whitespace, get_initials
**ISSUE**: String operations don't justify WASM overhead for single-item calls
**BATCH_USAGE**: batchSlugify could use native JS
**VERDICT**: ⚠️ OPTIONAL SIMPLIFICATION (-2KB)

---

## CONCRETE SIMPLIFICATION RECOMMENDATIONS

### Recommendation 1: Remove WASM String Utils (OPTIONAL)

**SAVINGS**: 2KB gzipped
**EFFORT**: 2 hours
**RISK**: Low
**PRIORITY**: LOW

**CURRENT**:
```typescript
// WASM call
const slug = await wasmModule.slugify(songTitle);
const initials = await wasmModule.getInitials(venueCity);
```

**PROPOSED**:
```typescript
// Native TypeScript
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function getInitials(s) {
  return s.split(/\s+/).map(w => w[0]).join('').toUpperCase();
}
```

**TRADE-OFF**: Saves 2KB but loses specialized functions like `create_sort_title()` which handle DMB-specific data.

---

### Recommendation 2: Custom Web Vitals (NOT RECOMMENDED)

**SAVINGS**: 5KB gzipped
**EFFORT**: 4 hours
**RISK**: Medium (edge cases)
**PRIORITY**: NOT RECOMMENDED

**REASON**: `web-vitals` library handles many subtle browser differences. 5KB savings not worth maintenance burden.

---

## FINAL SCORING

| Category | Score | Details |
|----------|-------|---------|
| Polyfill Usage | 100/100 | Zero polyfills |
| Native API Adoption | 92/100 | Popover, Anchor, scheduler.yield(), View Transitions all used |
| Dependency Minimization | 95/100 | Only D3, Dexie, topojson-client, web-vitals |
| WASM Optimization | 100/100 | Excellent use of serde-wasm-bindgen Direct APIs |
| Code Abstraction | 90/100 | Minimal but reasonable wrappers |
| **OVERALL** | **95/100** | **EXCELLENT** |

---

## EXECUTIVE SUMMARY TABLE

| Finding | Impact | Effort | Status |
|---------|--------|--------|--------|
| Zero polyfills | ✓ Good | N/A | No action needed |
| Popover API usage | Saved ~20KB | N/A | ✓ Complete |
| Anchor Positioning | Saved ~15KB | N/A | ✓ Complete |
| scheduler.yield() usage | INP optimization | N/A | ✓ Complete |
| WASM Direct APIs | 10x perf improvement | N/A | ✓ Complete |
| WASM string-utils | -2KB possible | 2h | Optional |
| Custom web-vitals | -5KB possible | 4h | Not recommended |

---

**Generated**: January 23, 2026
**Analyzer**: Code Simplifier (Chromium 2025 Native APIs Specialist)
**Project**: DMB Almanac Svelte
**Verdict**: EXCELLENT - Minimal simplification opportunities remaining
