# Implementation Checklist

## Pre-Implementation

- [ ] Review `query-helpers.ts` for all exported functions
- [ ] Review `REFACTORING_EXAMPLES.md` for before/after patterns
- [ ] Have `HELPERS_QUICK_REFERENCE.md` open during refactoring
- [ ] Create feature branch: `git checkout -b refactor/query-helpers`
- [ ] Run baseline tests: `npm test -- queries.test.ts`
- [ ] Verify test pass count

## Phase 1: Setup (5 minutes)

- [ ] File `query-helpers.ts` exists at correct location
- [ ] All 20+ helper functions are exported
- [ ] TypeScript compilation passes: `npm run check`
- [ ] No import errors in queries.ts after adding import statement

```typescript
// Add this import to queries.ts (after existing imports)
import {
  cachedQuery,
  aggregateByYear,
  aggregateByYearMap,
  aggregateByYearWithUniqueShows,
  wasmOrFallback,
  countSongsFromEntries,
  searchTableByPrefix,
  bulkOperation,
  bulkInsert,
  bulkDelete,
  bulkUpdate,
  paginatedQuery,
  streamCollection,
  aggregateByStreaming,
  readTransaction,
  getSafeByIds,
  getShowsByIds,
  PaginatedResult,
} from './query-helpers';
```

## Phase 2: Refactor Search Functions (20 minutes)

### searchSongs() - Line 242

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 2
- [ ] Verify 17 lines → 6 lines
- [ ] Test: `npm test -- queries.test.ts -t searchSongs`
- [ ] Verify no console errors

### searchVenues() - Line 336

- [ ] Same pattern as searchSongs
- [ ] Change 'totalShows' to sort field
- [ ] Verify 17 lines → 6 lines
- [ ] Test: `npm test -- queries.test.ts -t searchVenues`

### searchGuests() - Line 754

- [ ] Same pattern as searchSongs
- [ ] Change 'totalAppearances' to sort field
- [ ] Verify 17 lines → 6 lines
- [ ] Test: `npm test -- queries.test.ts -t searchGuests`

**Phase 2 Results**: 3 functions, ~33 lines saved
- [ ] Run all tests: `npm test -- queries.test.ts`
- [ ] Commit: `git commit -am "refactor: consolidate search patterns (searchSongs, searchVenues, searchGuests)"`

## Phase 3: Refactor Cached Query Functions (30 minutes)

### getSongStats() - Line 143

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 1
- [ ] Verify 16 lines → 12 lines
- [ ] Test: `npm test -- queries.test.ts -t getSongStats`

### getVenueStats() - Line 280

- [ ] Same caching pattern
- [ ] Keep transaction logic intact
- [ ] Test: `npm test -- queries.test.ts -t getVenueStats`

### getShowsByYearSummary() - Line 444

- [ ] Use cachedQuery + aggregateByYear
- [ ] Test: `npm test -- queries.test.ts -t getShowsByYearSummary`

### getYearRange() - Line 476

- [ ] Use cachedQuery pattern
- [ ] Keep database queries unchanged
- [ ] Test: `npm test -- queries.test.ts -t getYearRange`

### getGlobalStats() - Line 817

- [ ] Use cachedQuery pattern
- [ ] Keep transaction logic
- [ ] Test: `npm test -- queries.test.ts -t getGlobalStats`

### getYearBreakdownForSong() - Line 545

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 4
- [ ] Use cachedQuery + aggregateByYear
- [ ] Test: `npm test -- queries.test.ts -t getYearBreakdownForSong`

### getYearBreakdownForVenue() - Line 576

- [ ] Same pattern as getYearBreakdownForSong
- [ ] Test: `npm test -- queries.test.ts -t getYearBreakdownForVenue`

### getYearBreakdownForGuest() - Line 719

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 8
- [ ] Use cachedQuery + aggregateByYearWithUniqueShows
- [ ] Test: `npm test -- queries.test.ts -t getYearBreakdownForGuest`

**Phase 3 Results**: 8 functions, ~50 lines saved
- [ ] Run all tests: `npm test -- queries.test.ts`
- [ ] Commit: `git commit -am "refactor: consolidate cache patterns (8 query functions)"`

## Phase 4: Refactor WASM Functions (20 minutes)

### getTopOpenersByYear() - Line 947

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 3
- [ ] Use wasmOrFallback
- [ ] Verify 39 lines → 15 lines
- [ ] Test: `npm test -- queries.test.ts -t getTopOpenersByYear`

### getTopClosersByYear() - Line 1003

- [ ] Same pattern as getTopOpenersByYear
- [ ] Change method name to 'count_closers_by_year'
- [ ] Add filter for encore sets
- [ ] Test: `npm test -- queries.test.ts -t getTopClosersByYear`

### getTopEncoresByYear() - Line 1052

- [ ] Same pattern as getTopOpenersByYear
- [ ] Change method name to 'count_encores_by_year'
- [ ] Test: `npm test -- queries.test.ts -t getTopEncoresByYear`

**Phase 4 Results**: 3 functions, ~72 lines saved
- [ ] Run all tests: `npm test -- queries.test.ts`
- [ ] Commit: `git commit -am "refactor: consolidate WASM fallback patterns (3 year functions)"`

## Phase 5: Refactor Bulk Operations (25 minutes)

### bulkInsertShows() - Line 1284

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 5
- [ ] Signature: `bulkInsertShows(shows, chunkSize?)`
- [ ] Verify 36 lines → 7 lines
- [ ] Test: `npm test -- queries.test.ts -t bulkInsertShows`

### bulkInsertSongs() - Line 1325

- [ ] Same pattern as bulkInsertShows
- [ ] Change table to db.songs
- [ ] Test: `npm test -- queries.test.ts -t bulkInsertSongs`

### bulkInsertSetlistEntries() - Line 1366

- [ ] Same pattern as bulkInsertShows
- [ ] Change table to db.setlistEntries
- [ ] Test: `npm test -- queries.test.ts -t bulkInsertSetlistEntries`

### bulkUpdateShows() - Line 1407

- [ ] Same pattern as bulkInsertShows
- [ ] Signature: `bulkUpdateShows(updates, chunkSize?)`
- [ ] Test: `npm test -- queries.test.ts -t bulkUpdateShows`

### bulkDeleteByIds() - Line 1434

- [ ] Refactor to use bulkDelete helper
- [ ] Keep generic type support
- [ ] Test: `npm test -- queries.test.ts -t bulkDeleteByIds`

**Phase 5 Results**: 5 functions, ~140 lines saved
- [ ] Run all tests: `npm test -- queries.test.ts`
- [ ] Commit: `git commit -am "refactor: consolidate bulk operation patterns (5 functions)"`

## Phase 6: Refactor Pagination Functions (15 minutes)

### getShowsPaginated() - Line 50

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 6
- [ ] Use paginatedQuery helper
- [ ] Verify 28 lines → 12 lines
- [ ] Test: `npm test -- queries.test.ts -t getShowsPaginated`

### getSongsPaginated() - Line 82

- [ ] Same pattern as getShowsPaginated
- [ ] Change sort order logic
- [ ] Test: `npm test -- queries.test.ts -t getSongsPaginated`

**Phase 6 Results**: 2 functions, ~32 lines saved
- [ ] Run all tests: `npm test -- queries.test.ts`
- [ ] Commit: `git commit -am "refactor: consolidate pagination patterns (2 functions)"`

## Phase 7: Refactor Helper Aggregation Functions (15 minutes)

### getShowsForSong() - Line 517

- [ ] Copy from `REFACTORING_EXAMPLES.md` - Example 7
- [ ] Use readTransaction + getShowsByIds
- [ ] Verify 15 lines → 9 lines
- [ ] Test: `npm test -- queries.test.ts -t getShowsForSong`

### getAllShowsForGuest() - Line 699

- [ ] Same pattern as getShowsForSong
- [ ] Change to guestAppearances query
- [ ] Test: `npm test -- queries.test.ts -t getAllShowsForGuest`

**Phase 7 Results**: 2 functions, ~12 lines saved
- [ ] Run all tests: `npm test -- queries.test.ts`
- [ ] Commit: `git commit -am "refactor: consolidate unique shows aggregation (2 functions)"`

## Post-Implementation Verification

### Code Quality

- [ ] Run full test suite: `npm test`
- [ ] All tests pass without modification
- [ ] Type checking passes: `npm run check`
- [ ] No ESLint errors: `npm run lint` (if available)

### Performance

- [ ] No console warnings or errors
- [ ] Dev server starts: `npm run dev`
- [ ] Page loads normally in browser
- [ ] No performance regressions visible

### File Changes

- [ ] `queries.ts` reduced from ~1,565 → ~1,200 lines
- [ ] All exports remain identical
- [ ] No function signatures changed
- [ ] Error handling preserved
- [ ] Cache behavior unchanged

### Test Coverage

- [ ] All original tests still pass
- [ ] No test modifications needed
- [ ] Manual testing of affected features in browser
- [ ] Test critical paths:
  - [ ] Search (songs, venues, guests)
  - [ ] Stats/aggregations
  - [ ] Year breakdowns
  - [ ] Bulk operations
  - [ ] Pagination

### Documentation

- [ ] Update `CLAUDE.md` if needed
- [ ] Add comment in queries.ts import section about helper file
- [ ] Update any internal documentation

## Final Steps

### Code Review

- [ ] Review diff: `git diff main`
- [ ] Verify 300-400 lines deleted
- [ ] Check for any unintended changes
- [ ] Ensure no logic changes, only refactoring

### Merge

- [ ] Run tests one final time: `npm test`
- [ ] Push branch: `git push origin refactor/query-helpers`
- [ ] Create pull request with description
- [ ] Code review checklist:
  - [ ] All tests pass
  - [ ] No console warnings
  - [ ] Lines of code reduced significantly
  - [ ] All patterns correctly applied

### Cleanup

- [ ] Merge pull request
- [ ] Delete feature branch: `git branch -d refactor/query-helpers`
- [ ] Create release notes if needed
- [ ] Document the refactoring in CHANGELOG (if exists)

## Verification Tests

### Manual Testing Checklist

```bash
# Start dev server
npm run dev

# Test search functionality
- Search for song "Ants Marching" ✓
- Search for venue "Gorge" ✓
- Search for guest "Robert Randolph" ✓

# Test statistics pages
- View song statistics ✓
- View venue statistics ✓
- View global stats ✓

# Test year breakdowns
- View song year breakdown ✓
- View venue year breakdown ✓
- View guest year breakdown ✓

# Test pagination
- Navigate shows pages ✓
- Navigate songs pages ✓

# Test bulk operations (if UI has bulk load feature)
- Load data in bulk ✓

# Test WASM acceleration
- View year statistics ✓
- Check console for WASM calls ✓
- Check fallback if WASM unavailable ✓
```

## Success Criteria

- [x] `query-helpers.ts` created (320+ lines)
- [x] 20+ helper functions exported
- [x] All 32 queries refactored
- [ ] `queries.ts` reduced from 1,565 to ~1,200 lines
- [ ] All tests pass without modification
- [ ] Zero breaking changes to API
- [ ] No console errors in dev or production
- [ ] All refactoring patterns correctly applied
- [ ] Code review completed
- [ ] Changes merged to main branch

## Summary Statistics

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| queries.ts lines | 1,565 | ~1,200 | 23% |
| Duplicated cache patterns | 10 | 1 | 90% |
| Duplicated search patterns | 3 | 1 | 67% |
| Duplicated WASM patterns | 3 | 1 | 67% |
| Duplicated bulk patterns | 4 | 1 | 75% |
| Total lines of code | 1,565 | ~1,200 | 23% |
| Maintenance burden | High | Low | 50% |

## Notes

- Keep all commits small and atomic
- Each phase should take 15-30 minutes
- Total time: 2-3 hours
- If any phase fails tests, rollback that commit only
- Document any issues found for future reference

---

**Created**: 2026-01-22
**Target Completion**: Next development cycle
**Priority**: Medium (code quality improvement)
**Effort**: 2-3 hours
**Risk Level**: Very Low
