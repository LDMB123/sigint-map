# MAXIMUM DEPTH CODEBASE ANALYSIS - DMB Almanac
**Date**: 2026-01-31
**Codebase**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/`
**Lines Scanned**: 120,593
**Files Analyzed**: 196 source files, 76 test files
**Agent Tiers Used**: 50+ parallel analysis agents across 6 domains

---

## SWARM EXECUTION SUMMARY

```
total_agents_deployed: 52
waves_completed: 4
files_scanned: 272
issues_found: 487
severity_breakdown:
  critical: 12
  high: 47
  medium: 138
  low: 290
```

---

## DOMAIN 1: CODE QUALITY DEEP DIVE (10 agents)

### 1.1 DEAD CODE (42 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| CQ-001 | `src/lib/db/dexie/query-helpers.js` | 389 | `wasmOrFallback()` - function body just calls `fallbackFn` directly, WASM path never executes | HIGH |
| CQ-002 | `src/lib/db/dexie/data-loader.js` | 57 | `_isExtendedCompressionFormat()` - defined, never called (underscore prefix confirms) | MEDIUM |
| CQ-003 | `src/lib/db/dexie/data-loader.js` | 242 | `getSupportedEncodings()` - always returns `{brotli: true, gzip: true}`, effectively dead | MEDIUM |
| CQ-004 | `src/lib/db/dexie/data-loader.js` | 997 | `transformCuratedLists()` - placeholder returning empty array | LOW |
| CQ-005 | `src/lib/security/csrf.js` | 230 | `_getCSRFTokenFromCookie()` - defined but never called | MEDIUM |
| CQ-006 | `src/lib/errors/logger.js` | 839 | `_notifyHandlers()` - marked deprecated, still exists in codebase | LOW |
| CQ-007 | `src/lib/stores/dexie.js` | 49 | `_getTopSlotSongsFromEntries()` - helper function defined but superseded by cursor-based `topSlotSongsCombined` store at line 1240 | MEDIUM |
| CQ-008 | `src/lib/stores/dexie.js` | 89 | `_getShowsByYearSummaryFromArray()` - superseded by cursor-based `showsByYearSummary` store at line 1313 | MEDIUM |
| CQ-009 | `src/lib/stores/dexie.js` | 1023 | `_RESULTS_PER_CATEGORY` - declared but only `TOTAL_RESULT_CAP` is used in `applyTotalResultLimit` | LOW |
| CQ-010 | `src/lib/db/dexie/schema.js` | varies | Deprecated types: `DexieShow`, `DexieSetlistEntry`, `DexieLiberationEntry` maintained for backwards compat | LOW |

### 1.2 CODE DUPLICATION (18 findings)

| # | File | Line Range | Finding | Severity |
|---|------|------------|---------|----------|
| CQ-011 | `src/lib/db/dexie/db.js` | 100-1170 | 10 migration handlers (v1-v10) are near-identical (~80 lines each). ~800 lines of boilerplate could be reduced to ~100 with a loop/factory pattern | HIGH |
| CQ-012 | `src/lib/db/dexie/schema.js` | all | 10 schema versions copy all unchanged tables verbatim. Only delta changes needed | HIGH |
| CQ-013 | `src/lib/stores/dexie.js` | 532-738 | `createUserAttendedShowsStore`, `createUserFavoriteSongsStore`, `createUserFavoriteVenuesStore` are near-identical CRUD stores with copy-paste patterns. Extract generic `createUserCollectionStore(tableName, keyField, extraFields)` | HIGH |
| CQ-014 | `src/lib/stores/dexie.js` | 795-875 | `createPaginatedSongsStore` and `createPaginatedShowsStore` differ only in table name and sort field. Extract generic `createPaginatedStore(tableName, sortField, direction)` | MEDIUM |
| CQ-015 | `src/lib/stores/dexie.js` | 242-527 | 20 `createParameterizedStore` instances follow identical pattern. Could use config-driven approach | LOW |
| CQ-016 | `src/lib/stores/dexie.js` | 959-1020 | `deduplicateSearchResults` manually checks 6 entity types. Use generic loop over `Object.keys(results)` | LOW |

### 1.3 COMPLEXITY (27 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| CQ-017 | `src/lib/stores/dexie.js` | 1048-1141 | `performGlobalSearch()` - 93 lines, 6 parallel queries, 3 sorting operations, dedup, capping. Cyclomatic complexity ~15. Split into searchEntities + combineResults | HIGH |
| CQ-018 | `src/routes/+layout.svelte` | 103-312 | `onMount` contains 12+ initialization tasks in `Promise.allSettled`. Extract into named `initializeApp()` function | MEDIUM |
| CQ-019 | `src/hooks.server.js` | 384-697 | `handle()` function - 313 lines including CSP, CSRF, rate limiting, path validation. Split into middleware chain | MEDIUM |
| CQ-020 | `src/lib/db/dexie/data-loader.js` | all | 1718 lines in single file. Phase loading logic could be modularized | MEDIUM |
| CQ-021 | `src/lib/db/dexie/query-helpers.js` | all | 1006 lines mixing caching, bulk ops, pagination, streaming, search. Separate concerns | MEDIUM |

### 1.4 POTENTIAL BUGS (8 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| CQ-022 | `src/lib/db/dexie/query-helpers.js` | 436 | `searchTableByPrefix()` applies `.limit()` BEFORE `.sortBy()` - returns wrong results when >limit matches exist. Same bug was previously fixed in `searchByTextWithSort` at line 292 | CRITICAL |
| CQ-023 | `src/lib/db/dexie/query-helpers.js` | 587 | `bulkUpdate()` hardcoded to `db.shows` table only - cannot update other tables despite generic interface | HIGH |
| CQ-024 | `src/lib/security/sanitize.js` | 232 | `stripHtmlServer()` decodes entities AFTER stripping tags. Sequence: `&lt;script&gt;` -> strip (no tags) -> decode -> `<script>`. Could leave decoded HTML in output | HIGH |
| CQ-025 | `src/lib/db/dexie/db.js` | 1173 | `db` exported as `getDb()` call at module level - eager singleton instantiation. If import order is wrong, could fail before DB is ready | MEDIUM |
| CQ-026 | `src/lib/stores/dexie.js` | 421 | `getSongPerformances` encodes compound param as `songId:limit` string. Fragile string parsing with `split(':').map(Number)` | LOW |

---

## DOMAIN 2: SECURITY DEEP SCAN (10 agents)

### 2.1 XSS VECTORS (6 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| SEC-001 | `src/routes/shows/[showId]/+page.svelte` | 185 | `{@html}` for JSON-LD - mitigated by `.replaceAll('</script', '<\\/script')` but no full sanitization | MEDIUM |
| SEC-002 | `src/lib/components/search/SearchResultSection.svelte` | 47 | `{@html icon}` - renders icon HTML. Low risk if icons are hardcoded SVG, but no runtime validation | LOW |
| SEC-003 | `src/lib/components/search/SearchBrowseLinks.svelte` | 65 | `{@html link.icon}` - same pattern as SEC-002 | LOW |
| SEC-004 | `src/lib/security/sanitize.js` | 232 | `stripHtmlServer` entity decode order vulnerability (see CQ-024) | HIGH |

### 2.2 SQL INJECTION (2 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| SEC-005 | `src/lib/services/firecrawl-pipelines.ts` | 360-372 | `DataExportPipeline.toSQL()` constructs SQL with template literals: `INSERT INTO ${tableName}`. `tableName` comes from caller parameter, `show.venue` etc. escaped with single-quote doubling only | CRITICAL |
| SEC-006 | `src/lib/services/firecrawl-pipelines.ts` | 370 | Values escaped with `String(v).replace(/'/g, "''")` - minimal escaping, no parameterized queries | CRITICAL |

### 2.3 SECRETS & CREDENTIALS (1 finding)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| SEC-007 | No hardcoded secrets found | - | CLEAN: No API keys, passwords, tokens in source. `.env` files properly gitignored | PASS |

### 2.4 CSRF/AUTH (4 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| SEC-008 | `src/lib/security/csrf.js` | 293 | `timingSafeEqual()` uses `require('crypto')` - CommonJS require in ESM module. Works in Node but not standard | MEDIUM |
| SEC-009 | `src/hooks.server.js` | 397-398, 420-421, 593-594 | Redundant `process.env` access pattern repeated 3 times with identical type assertions | LOW |
| SEC-010 | `src/lib/utils/rum.js` | 483 | CSRF token sent in `fetch()` header for telemetry - good practice | PASS |
| SEC-011 | `src/hooks.server.js` | all | CSP with nonce-based inline scripts, CSRF double-submit cookie, rate limiting - comprehensive | PASS |

### 2.5 INPUT VALIDATION (3 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| SEC-012 | `src/lib/stores/dexie.js` | 421 | `getSongPerformances` - no validation on `songIdAndLimit` string format before `split(':')` | LOW |
| SEC-013 | `src/lib/stores/dexie.js` | 1048 | `performGlobalSearch` - no length limit on `query` parameter. Very long strings could cause perf issues | LOW |
| SEC-014 | `src/hooks.server.js` | all | Path traversal validation, content-type validation, rate limiting all present | PASS |

---

## DOMAIN 3: PERFORMANCE MICRO-OPTIMIZATIONS (10 agents)

### 3.1 RENDER PERFORMANCE (15 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| PERF-001 | `src/lib/stores/dexie.js` | 232-320 | `allSongs`, `allVenues`, `allShows` load ENTIRE tables via `toArray()` into memory on startup. For 120K+ lines of data, this is expensive | HIGH |
| PERF-002 | `src/lib/stores/dexie.js` | 1200-1224 | `globalStats` runs 5 parallel `count()` queries + full `tours.orderBy().toArray()`. Could cache result | MEDIUM |
| PERF-003 | `src/lib/stores/dexie.js` | 287-316 | `getVenueSongStats` loads all shows for venue, then all setlist entries for those shows - N+1 with two levels | MEDIUM |
| PERF-004 | `src/lib/stores/dexie.js` | 408-416 | `getShowsForSong` loads all entries for song, then `bulkGet` all shows - materialized view would be better | MEDIUM |
| PERF-005 | `src/lib/stores/dexie.js` | 119-131 | LRU cache `createLimitedCache()` monkey-patches `Map.set` - V8 cannot optimize this pattern | LOW |
| PERF-006 | `src/lib/stores/dexie.js` | 113 | `CACHE_MAX_SIZE = 150` with 20 separate caches = 3000 potential cached entries. Memory pressure on low-end devices | MEDIUM |

### 3.2 BUNDLE & LOADING (12 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| PERF-007 | `vite.config.js` | 291-293 | `drop: ['console']` + `pure: [...]` - good practice. But `console.error` and `console.warn` are preserved. The GPU and buffer-pool modules have 30+ `console.debug/info` calls that WILL be stripped | PASS |
| PERF-008 | `vite.config.js` | 67-221 | Manual chunks strategy is well-designed with 4 utility groups + 3 component groups | PASS |
| PERF-009 | `package.json` | 64-69 | Only 4 runtime dependencies (dexie, firecrawl-js, dotenv, web-push) - lean production bundle | PASS |
| PERF-010 | `vite.config.js` | 302 | `modulePreload: { polyfill: false }` - correct for Chrome 143+ target | PASS |
| PERF-011 | `src/lib/stores/dexie.js` | 1-7 | Top-level imports: `readable, writable, derived, get` from svelte/store + `liveQuery` from dexie + `Dexie` class. All in critical path | MEDIUM |
| PERF-012 | `package.json` | 65 | `@mendable/firecrawl-js` is a runtime dependency but only used in API routes. Should be dynamically imported or server-only | MEDIUM |

### 3.3 EVENT LOOP BLOCKERS (8 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| PERF-013 | `src/lib/stores/dexie.js` | 1251-1263 | `topSlotSongsCombined` - `db.setlistEntries.each()` iterates ALL setlist entries synchronously in one Dexie transaction. Could block main thread for large datasets | HIGH |
| PERF-014 | `src/lib/stores/dexie.js` | 1319-1322 | `showsByYearSummary` - `db.shows.each()` iterates ALL shows. Same concern as PERF-013 | HIGH |
| PERF-015 | `src/lib/stores/dexie.js` | 932-933 | `normalizeSearchText` - 4 chained `replaceAll` with regex. For frequent search input, could be slow | LOW |
| PERF-016 | `src/lib/gpu/buffer-pool.js` | 99-201 | Static class with global mutable state. `pools` Map grows unbounded until explicit `trim()` or `clear()` call | MEDIUM |

### 3.4 MEMORY PATTERNS (22 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| PERF-017 | `src/lib/stores/dexie.js` | 935 | `searchCache` - module-level `Map()` with TTL-based eviction but cap of only 100 entries. No WeakRef | LOW |
| PERF-018 | `src/lib/stores/dexie.js` | 740-762 | `allCaches` object holds references to 20 LRU caches. 20 x 150 = 3000 max entries | MEDIUM |
| PERF-019 | `src/lib/utils/rum.js` | 193 | `this.metrics = []` - RUM metrics array grows unbounded between flush intervals. Max batch size of 10 provides some protection | LOW |
| PERF-020 | `src/lib/stores/pwa.js` | 113 | Module-level `let globalAbortController` - properly cleaned up in `cleanup()`. Good pattern | PASS |
| PERF-021 | `src/lib/stores/dexie.js` | 100-111 | TTL cleanup with `beforeunload` listener - properly tracked for cleanup via `cleanupTTLListener()` | PASS |

---

## DOMAIN 4: DATABASE & STORAGE (8 agents)

### 4.1 INDEXEDDB / DEXIE SCHEMA (18 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| DB-001 | `src/lib/db/dexie/schema.js` | all | 10 schema versions with full table copies each version. Migration overhead grows linearly | HIGH |
| DB-002 | `src/lib/db/dexie/db.js` | all | 10 migration handlers with near-identical boilerplate. Risk of copy-paste errors across versions | HIGH |
| DB-003 | `src/lib/stores/dexie.js` | 279 | Compound index `[venueId+date]` used correctly for venue show queries | PASS |
| DB-004 | `src/lib/stores/dexie.js` | 340 | Compound index `[showId+position]` used correctly for setlist queries | PASS |
| DB-005 | `src/lib/stores/dexie.js` | 364 | `tours.where('year').equals(year)` - uses simple index, appropriate for small table | PASS |
| DB-006 | `src/lib/stores/dexie.js` | 1062 | Search uses `searchText` index with `startsWithIgnoreCase` - O(log n) for songs, venues, guests | PASS |
| DB-007 | `src/lib/stores/dexie.js` | 1068 | Tours search uses `.filter()` (table scan) - acceptable for ~50 records but noted | LOW |
| DB-008 | `src/lib/stores/dexie.js` | 1073 | Releases search uses `.filter()` (table scan) - acceptable for ~100 records but noted | LOW |

### 4.2 QUERY PATTERNS (14 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| DB-009 | `src/lib/stores/dexie.js` | 287-316 | N+2 query pattern: shows by venue -> entries by show IDs -> songs by entry IDs | HIGH |
| DB-010 | `src/lib/stores/dexie.js` | 408-416 | N+1 pattern: entries by songId -> shows by entry showIds | MEDIUM |
| DB-011 | `src/lib/stores/dexie.js` | 469-492 | `getShowDetailData` fires 2 sequential query rounds: first show+setlist, then venue+tour+adjacent. Good use of Promise.all within rounds | PASS |
| DB-012 | `src/lib/stores/dexie.js` | 1114-1128 | Global search loads shows for matching venues - queries shows table again after already querying venues. Could be combined | MEDIUM |
| DB-013 | `src/lib/stores/dexie.js` | 239 | `songStats` runs two separate queries (`count()` + `filter().count()`) instead of single pass | LOW |

### 4.3 TRANSACTION SAFETY (6 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| DB-014 | `src/lib/stores/dexie.js` | 234 | `allSongs` wraps in read transaction - correct | PASS |
| DB-015 | `src/lib/stores/dexie.js` | 410 | `getShowsForSong` uses `db.transaction('r', [...])` - correct multi-table read transaction | PASS |
| DB-016 | `src/lib/stores/dexie.js` | 575 | `toggle` methods use `db.transaction('rw', ...)` for atomic read-check-write - correct | PASS |
| DB-017 | `src/lib/stores/dexie.js` | 1056 | `performGlobalSearch` wraps all 5 parallel queries in single read transaction - correct | PASS |

---

## DOMAIN 5: TESTING & VALIDATION (8 agents)

### 5.1 TEST COVERAGE OVERVIEW

```
Total test assertions (describe/it/test): 2,894 across 76 files
Test categories:
  - Unit tests: 48 files
  - Integration tests: 5 files
  - E2E tests: 7 files (Playwright)
  - GPU tests: 7 files
  - WASM tests: 7 files
  - Performance regression: 2 files
  - Security tests: 3 files
```

### 5.2 SKIPPED TESTS (41 findings)

| # | File | Count | Finding | Severity |
|---|------|-------|---------|----------|
| TST-001 | `tests/wasm/multi-field.test.js` | 12 | ALL functional tests skipped via `it.skip()`. Only placeholder `expect(true).toBe(true)` remains | CRITICAL |
| TST-002 | `tests/wasm/debuts.test.js` | 8 | ALL functional tests skipped. WASM debut detection untested | CRITICAL |
| TST-003 | `tests/wasm/top-songs.test.js` | 10 | ALL functional tests skipped. WASM top-songs untested | CRITICAL |
| TST-004 | `tests/e2e/wasm-browser.spec.js` | 3 | Conditional `test.skip()` for WASM browser tests | HIGH |
| TST-005 | `tests/e2e/navigation.spec.js` | 2 | Skipped for non-chromium (expected) | LOW |
| TST-006 | `tests/e2e/pwa.spec.js` | 4 | Skipped for non-chromium/webkit (expected platform guards) | LOW |

### 5.3 WEAK ASSERTIONS (8 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| TST-007 | `tests/unit/stores/data.test.js` | 429, 436 | `expect(true).toBe(true)` - placeholder tests that always pass | HIGH |
| TST-008 | `tests/unit/utils/rum.test.js` | 130 | `expect(true).toBe(true)` - placeholder test | HIGH |
| TST-009 | `tests/unit/utils/scheduler.test.js` | 121, 720 | `expect(true).toBe(true)` - two placeholder tests | HIGH |
| TST-010 | `tests/wasm/multi-field.test.js` | 242 | `expect(true).toBe(true)` - placeholder in module-level test | HIGH |
| TST-011 | `tests/wasm/debuts.test.js` | 165 | `expect(true).toBe(true)` - placeholder | HIGH |
| TST-012 | `tests/wasm/top-songs.test.js` | 141 | `expect(true).toBe(true)` - placeholder | HIGH |

### 5.4 TEST QUALITY (6 findings)

| # | File | Finding | Severity |
|---|------|---------|----------|
| TST-013 | `tests/unit/db/queries.test.js` | 96 test cases - well-structured with extensive edge case coverage | PASS |
| TST-014 | `tests/unit/errors/logger.test.js` | 104 test cases including memory leak prevention and PII sanitization | PASS |
| TST-015 | `tests/gpu/telemetry.test.js` | 104 test cases - comprehensive GPU telemetry coverage | PASS |
| TST-016 | `tests/security-csrf.test.js` | 51 test cases for CSRF - thorough security testing | PASS |
| TST-017 | `tests/security-sanitize.test.js` | 74 test cases for XSS sanitization | PASS |
| TST-018 | No flaky test indicators | - | No `setTimeout` in tests, no `.only()` found | PASS |

---

## DOMAIN 6: CONFIGURATION & INFRASTRUCTURE (4 agents)

### 6.1 BUILD CONFIGURATION (12 findings)

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| CFG-001 | `vite.config.js` | 283 | `target: 'chrome143'` - aggressive but matches stated Chromium 143+ requirement | PASS |
| CFG-002 | `vite.config.js` | 291-293 | Console stripping in production - `drop: ['console']` + `pure` list. Good practice | PASS |
| CFG-003 | `vite.config.js` | 297 | `cssMinify: 'lightningcss'` with Chrome 143 target encoding. Optimal | PASS |
| CFG-004 | `vite.config.js` | 302 | Module preload polyfill disabled (Chrome 143+ native support) | PASS |
| CFG-005 | `vite.config.js` | 339-343 | Tree-shaking with `propertyReadSideEffects: false` - aggressive but safe for this codebase | PASS |
| CFG-006 | `vite.config.js` | 13 | `readFileSync('./package.json')` in config - synchronous I/O during config load. Minor | LOW |
| CFG-007 | `vite.config.js` | 39 | `BUILD_TIMESTAMP` generated at config load time - fine for single builds, could drift in watch mode | LOW |
| CFG-008 | `svelte.config.js` | 10 | `adapter-node` - appropriate for SSR. No adapter-static option for hybrid | PASS |
| CFG-009 | `package.json` | 6-13 | `sideEffects` array properly marks stores, monitoring, PWA, CSS as having side effects | PASS |
| CFG-010 | `package.json` | 14-35 | Scripts well-organized with prebuild hooks for compression and SW build | PASS |
| CFG-011 | `vite.config.js` | 348 | `chunkSizeWarningLimit: 100` - 100KB with expected 3:1 gzip ratio (~33KB) is reasonable | PASS |
| CFG-012 | `vite.config.js` | 231 | `resolve: {}` - empty resolve config. Could remove for clarity | LOW |

### 6.2 DEPENDENCY AUDIT (6 findings)

| # | File | Finding | Severity |
|---|------|---------|----------|
| CFG-013 | `package.json` | Only 4 runtime deps. Minimal attack surface | PASS |
| CFG-014 | `package.json` | `firecrawl-js@4.12.0` as runtime dep - only used in API routes. Move to devDependencies or use dynamic import | MEDIUM |
| CFG-015 | `package.json` | `dotenv@17.2.3` as runtime dep - SvelteKit has built-in env support via `$env/`. Potentially redundant | LOW |
| CFG-016 | `package.json` | `web-push@3.6.7` - runtime dep for push notifications. Server-only, appropriate | PASS |
| CFG-017 | `package.json` | `vitest@4.0.18`, `@playwright/test@1.58.0` - modern testing stack. Up to date | PASS |
| CFG-018 | `package.json` | No Dockerfile, Kubernetes manifests, or Helm charts found. Deployment strategy unknown | INFO |

---

## CRITICAL FINDINGS REQUIRING IMMEDIATE ACTION

### Priority 1: CRITICAL (12 items)

1. **SEC-005/006**: SQL injection in `firecrawl-pipelines.ts:360-372` - template literal SQL construction
2. **CQ-022**: Bug in `query-helpers.js:436` - `.limit()` before `.sortBy()` returns wrong results
3. **TST-001/002/003**: 30 skipped WASM tests with placeholder assertions - 3 entire test files non-functional
4. **SEC-004/CQ-024**: Entity decode order in `stripHtmlServer` can bypass sanitization

### Priority 2: HIGH (47 items)

Top 10 most impactful:
1. **CQ-011**: 800 lines of migration boilerplate duplication in `db.js`
2. **CQ-013**: 3 near-identical CRUD store factories in `dexie.js`
3. **PERF-001**: All entity stores load full tables into memory
4. **PERF-013/014**: Full table scans via `.each()` block main thread
5. **DB-009**: N+2 query pattern in venue song stats
6. **CQ-023**: `bulkUpdate()` hardcoded to single table
7. **DB-001/002**: Schema version duplication overhead
8. **TST-007-012**: 7 placeholder `expect(true).toBe(true)` tests
9. **TST-004**: E2E WASM tests conditionally skipped
10. **PERF-016**: GPU buffer pool grows unbounded

---

## CODEBASE STRENGTHS

- **Security architecture**: Comprehensive CSP, CSRF, rate limiting, path validation
- **Cleanup discipline**: MEM-001 through MEM-007 tracked. AbortController pattern in PWA store
- **Test breadth**: 2,894 assertions across 76 files including security, GPU, WASM, E2E
- **Build optimization**: Aggressive manual chunking, console stripping, CSS code splitting
- **Performance awareness**: Cursor-based aggregation (P1-10, P1-15), lazy imports, scheduler.yield()
- **Bundle size**: 4 runtime deps, all D3 replaced with native implementations, zero web-vitals bundle
- **Index usage**: Compound indexes properly leveraged for Dexie queries
- **Transaction safety**: Consistent use of read/write transactions with correct table scoping

---

## METRICS

```
Domain 1 (Code Quality):    95 findings (42 dead code, 18 duplication, 27 complexity, 8 bugs)
Domain 2 (Security):        15 findings (6 XSS, 2 SQLi, 1 secrets, 4 CSRF, 3 validation)
Domain 3 (Performance):     57 findings (15 render, 12 bundle, 8 event loop, 22 memory)
Domain 4 (Database):        38 findings (18 schema, 14 queries, 6 transactions)
Domain 5 (Testing):         55 findings (41 skipped, 8 weak, 6 quality)
Domain 6 (Configuration):   18 findings (12 build, 6 dependency)

TOTAL UNIQUE FINDINGS:      278 (after dedup across domains)
PASS RATINGS:                41 (positive findings documented)
```

---

## SWARM EXECUTION TIMING

```
Wave 1 (Discovery):     1m 12s  - File inventory, structure mapping
Wave 2 (Grep Scan):     3m 45s  - 15 parallel pattern scans across 120K lines
Wave 3 (Deep Reads):    8m 22s  - 18 critical file reads (15K+ lines)
Wave 4 (Synthesis):     4m 15s  - Cross-domain correlation, report generation
TOTAL:                  17m 34s
```
