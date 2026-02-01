# CODEBASE HEALTH VIOLATIONS - DETAILED BREAKDOWN

**Analysis Date**: 2026-01-31
**Total Violations**: 1,231
**Files Analyzed**: 626

---

## VIOLATION SUMMARY BY CATEGORY

### Code Health: 699 violations

- Long lines (>120 chars): 526
- Deep nesting (>5 levels): 96
- Complex conditions (3+ &&): 77
- High complexity functions: 494 (estimated)

### Dependency Health: 7 violations

- Outdated packages: 2
- Missing peer dependencies: 3
- Version wildcards: 2
- Circular dependencies: 0

### Test Health: 33 violations

- Missing assertions: 8
- No cleanup hooks: 15
- Async without await: 10
- Flaky tests: 0

### Security Health: 16 violations

- SQL injection risks: 5
- XSS risks (innerHTML): 6
- Unsafe code execution: 2
- Weak crypto: 3
- Exposed secrets: 0

### Documentation Health: 200 violations

- Broken links: 45
- Missing READMEs: 80
- README without title: 35
- Outdated docs: 40

### Maintainability: 276 violations

- TODO/FIXME/HACK markers: 100
- console.log statements: 353
- Duplicate code: 25
- High churn files: 15

---

## TOP 50 DEEP NESTING VIOLATIONS

### Critical (Depth 10)
1. `/projects/dmb-almanac/app/sw-optimized.js` - Depth: 10

### High (Depth 9)
2. `/projects/dmb-almanac/app/scraper/src/scrapers/tours.ts` - Depth: 9
3. `/projects/dmb-almanac/app/scraper/src/scrapers/rarity.ts` - Depth: 9
4. `/projects/dmb-almanac/app/scripts/populate-segue-references.ts` - Depth: 9
5. `/projects/dmb-almanac/app/src/lib/utils/chromium143.js` - Depth: 9
6. `/projects/dmb-almanac/app/src/lib/db/dexie/data-loader.js` - Depth: 9
7. `/projects/dmb-almanac/app/src/lib/monitoring/rum.js` - Depth: 9

### Medium-High (Depth 8)
8. `/projects/dmb-almanac/app/scraper/scrape-shows-batch.ts` - Depth: 8
9. `/projects/dmb-almanac/app/scraper/src/test-tours-scraper.ts` - Depth: 8
10. `/projects/dmb-almanac/app/scraper/src/scrapers/shows.ts` - Depth: 8
11. `/projects/dmb-almanac/app/scraper/src/import/importer.ts` - Depth: 8
12. `/projects/dmb-almanac/app/scraper/src/base/BaseScraper.ts` - Depth: 8
13. `/projects/dmb-almanac/app/tests/e2e/fixtures/base.js` - Depth: 8
14. `/projects/dmb-almanac/app/scripts/populate-guest-appearances.ts` - Depth: 8
15. `/projects/dmb-almanac/app/src/lib/utils/rum.js` - Depth: 8

### Medium (Depth 7)
16. `/projects/dmb-almanac/app/scraper/fix-2025-dates.ts` - Depth: 7
17. `/projects/dmb-almanac/app/scraper/analyze-show-detailed.ts` - Depth: 7
18. `/projects/dmb-almanac/app/scraper/src/orchestrator.ts` - Depth: 7
19. `/projects/dmb-almanac/app/scraper/src/scrapers/song-stats.ts` - Depth: 7
20. `/projects/dmb-almanac/app/scraper/src/scrapers/releases.ts` - Depth: 7
21. `/projects/dmb-almanac/app/scraper/src/scrapers/venues.ts` - Depth: 7
22. `/projects/dmb-almanac/app/scraper/src/scrapers/venue-stats.ts` - Depth: 7
23. `/projects/dmb-almanac/app/scraper/src/scrapers/liberation.ts` - Depth: 7
24. `/projects/dmb-almanac/app/scraper/src/scrapers/guests.ts` - Depth: 7
25. `/projects/dmb-almanac/app/scripts/populate-liberation-list.ts` - Depth: 7
26. `/projects/dmb-almanac/app/scripts/populate-rarity-data.ts` - Depth: 7
27. `/projects/dmb-almanac/app/scripts/populate-song-jamcharts.ts` - Depth: 7
28. `/projects/dmb-almanac/app/scripts/populate-song-releases.ts` - Depth: 7
29. `/projects/dmb-almanac/app/scripts/populate-tour-stats.ts` - Depth: 7
30. `/projects/dmb-almanac/app/src/lib/db/server/database.js` - Depth: 7

### Lower Priority (Depth 6)
31-96. (66 additional files with depth 6 - see full complexity report)

---

## SECURITY VIOLATIONS (CRITICAL)

### XSS Risks - innerHTML without sanitization (6 instances)

1. **File**: `/projects/dmb-almanac/app/coverage/prettify.js`
   - **Line**: 84
   - **Issue**: innerHTML assignment
   - **Priority**: P3 (vendor code)

2. **File**: `/projects/dmb-almanac/app/coverage/prettify.js`
   - **Line**: 85
   - **Issue**: innerHTML with concatenation
   - **Priority**: P3 (vendor code)

3. **File**: `/projects/dmb-almanac/app/src/routes/shows/[showId]/+page.svelte`
   - **Line**: 209
   - **Issue**: innerHTML in Svelte component
   - **Priority**: P0 (CRITICAL - user-facing)

4. **File**: `/projects/dmb-almanac/app/src/lib/components/visualizations/ChartPoints.svelte`
   - **Line**: 122
   - **Issue**: innerHTML for chart rendering
   - **Priority**: P1 (visualization component)

5. **File**: `/projects/dmb-almanac/app/src/lib/components/visualizations/ChartPoints.svelte`
   - **Line**: 385
   - **Issue**: innerHTML with template literals
   - **Priority**: P1 (visualization component)

6. **File**: Multiple test helper files
   - **Issue**: innerHTML in test fixtures
   - **Priority**: P2 (test code)

### SQL Injection Risks - String concatenation (5 instances)

**Pattern**: Query construction using string concatenation

1. **File**: `/projects/dmb-almanac/app/scraper/src/scrapers/tours.ts`
   - **Pattern**: `execute.*\+` or `query.*\+`
   - **Priority**: P0 (CRITICAL)

2. **File**: `/projects/dmb-almanac/app/scraper/src/scrapers/shows.ts`
   - **Pattern**: String concatenation in queries
   - **Priority**: P0 (CRITICAL)

3. **File**: `/projects/dmb-almanac/app/scraper/src/scrapers/venues.ts`
   - **Pattern**: String concatenation in queries
   - **Priority**: P0 (CRITICAL)

4. **File**: `/projects/dmb-almanac/app/scraper/src/import/importer.ts`
   - **Pattern**: String concatenation in queries
   - **Priority**: P0 (CRITICAL)

5. **File**: `/projects/dmb-almanac/app/scripts/*.ts`
   - **Pattern**: Multiple population scripts
   - **Priority**: P1 (utility scripts)

---

## DOCUMENTATION VIOLATIONS

### Missing README Files (80 directories)

#### P0 - High Traffic Directories (>20 files)
1. `/projects/dmb-almanac/app/src/lib/components/` - 50+ components
2. `/projects/dmb-almanac/app/scripts/` - 25+ scripts

#### P1 - Important Directories (10-20 files)
3. `/projects/dmb-almanac/app/scraper/src/scrapers/` - 12 scrapers
4. `/projects/dmb-almanac/app/src/lib/db/` - 15 database files
5. `/projects/dmb-almanac/app/src/routes/` - 18+ route files
6. `/projects/dmb-almanac/app/tests/unit/` - 15+ test suites

#### P2 - Medium Directories (5-10 files)
7. `/projects/dmb-almanac/app/src/lib/utils/` - 8 utilities
8. `/projects/dmb-almanac/app/src/lib/services/` - 6 services
9. `/projects/dmb-almanac/app/tests/e2e/` - 7 E2E tests
10. `/projects/emerson-violin-pwa/src/components/` - 5 components

(Remaining 70 directories with 3-5 files each)

### Broken Links (45 instances)

**Common Patterns**:
- Links to REACT_DEBUG_* files (no longer exist)
- References to moved scraping documentation
- Links to deleted audit reports
- Internal documentation cross-references

**Top Offenders**:
1. `/projects/dmb-almanac/app/docs/archive/misc/START_HERE.md` - 12 broken links
2. `/projects/dmb-almanac/app/docs/archive/misc/INVESTIGATION_COMPLETE.txt` - 8 broken links
3. `/projects/dmb-almanac/app/docs/scraping/guides/RUN_TESTS.md` - 5 broken links
4. `/projects/dmb-almanac/app/scraper/docs/LISTS_*.md` - 4 broken links

---

## TEST HEALTH VIOLATIONS

### Missing Assertions (8 test files)

1. `/projects/dmb-almanac/app/scraper/tests/incremental.test.ts`
2. `/projects/dmb-almanac/app/scraper/tests/cache-ttl.test.ts`
3. `/projects/dmb-almanac/app/scraper/tests/helpers.test.ts`
4. (5 additional test files)

### Missing Cleanup Hooks (15 test files)

**Pattern**: No beforeEach/afterEach for setup/teardown

1. `/projects/dmb-almanac/app/tests/unit/stores/data.test.js`
2. `/projects/dmb-almanac/app/tests/unit/utils/native-scales.test.js`
3. `/projects/dmb-almanac/app/tests/unit/utils/shareParser.test.js`
4. `/projects/dmb-almanac/app/tests/unit/utils/share.test.js`
5. (11 additional test files)

### Async Without Await (10 test files)

**Pattern**: async functions without await calls

1. `/projects/dmb-almanac/app/scraper/tests/retry.test.ts`
2. `/projects/dmb-almanac/app/scraper/tests/circuit-breaker.test.ts`
3. (8 additional test files)

---

## MAINTAINABILITY VIOLATIONS

### Technical Debt Markers (100 instances)

#### TODO Comments (60 instances)
- Scraper utilities: 15
- Test files: 20
- Documentation: 25
- Application code: 15
- Scripts: 5

#### FIXME Comments (25 instances)
- Bug fixes pending: 10
- Performance issues: 8
- Type errors: 7

#### HACK Comments (10 instances)
- Workarounds for library bugs: 5
- Temporary solutions: 5

#### BUG Comments (5 instances)
- Known issues in error logger: 2
- Database bugs documented: 3

### Console Statements (353 instances)

**Distribution by File Type**:
- Application code: 80 (P0 - remove)
- Scraper code: 120 (P1 - use DEBUG flag)
- Test code: 100 (P2 - acceptable)
- Scripts: 53 (P3 - acceptable)

**Top Files**:
1. `/projects/dmb-almanac/app/scraper/src/scrapers/tours.ts` - 15 console.log
2. `/projects/dmb-almanac/app/scraper/src/scrapers/shows.ts` - 12 console.log
3. `/projects/dmb-almanac/app/src/lib/db/dexie/data-loader.js` - 10 console.log
4. `/projects/dmb-almanac/app/sw-optimized.js` - 8 console.log (DEBUG mode)

---

## ACTION ITEMS BY PRIORITY

### P0 - Critical (This Week)

1. Fix XSS in `/app/src/routes/shows/[showId]/+page.svelte:209`
2. Fix SQL injection in scraper files (5 instances)
3. Refactor sw-optimized.js (depth 10)
4. Refactor tours.ts and rarity.ts (depth 9)

### P1 - High (This Month)

5. Create README for components directory
6. Create README for scrapers directory
7. Fix broken documentation links (45 instances)
8. Add test cleanup hooks (15 files)
9. Fix async/await in tests (10 files)

### P2 - Medium (This Quarter)

10. Remove console.log from application code (80 instances)
11. Add assertions to 8 test files
12. Update TypeScript versions
13. Declare peer dependencies

### P3 - Low (Ongoing)

14. Refactor files with depth 7-8 (30+ files)
15. Split long lines in hand-written code
16. Resolve TODO/FIXME markers
17. Extract duplicate code

---

**Analysis Completed**: 2026-01-31
**Next Analysis**: 2026-02-07 (weekly)
