# IndexedDB Optimization Checklist

## Pre-Implementation Review

- [ ] Read INDEXEDDB_PERFORMANCE_OPTIMIZATION.md
- [ ] Review INDEXEDDB_IMPLEMENTATION_GUIDE.md
- [ ] Understand quick reference patterns in INDEXEDDB_QUICK_REFERENCE.md
- [ ] Backup current database schema and queries
- [ ] Review current performance baselines in RUM

---

## Phase 1: Schema Migration (30 minutes)

### Step 1a: Add Schema Version 7
**File:** `app/src/lib/db/dexie/schema.ts`

- [ ] Locate line 814 (after version 6 definition)
- [ ] Copy version 6 definition as template
- [ ] Add version 7 definition with:
  - [ ] Shows index updated: Add `[venueId+year]`
  - [ ] All other tables copy from v6 unchanged
- [ ] Verify syntax is correct

**Check:** All curly braces match, no typos in index definitions

### Step 1b: Update Database Version
**File:** `app/src/lib/db/dexie/schema.ts`

- [ ] Locate line 982: `export const CURRENT_DB_VERSION = 6;`
- [ ] Change to: `export const CURRENT_DB_VERSION = 7;`
- [ ] Update comment above it with v7 description

**Check:** Version number is now 7

### Step 1c: Test Schema in Browser
**Testing Steps:**
1. Open DMB Almanac in browser
2. Open DevTools → Application → Storage → IndexedDB
3. Look for dmb-almanac database
4. Verify Shows table
5. Expand Shows table indexes
6. Verify `[venueId+year]` index exists
7. Check DevTools Console for any errors

**Success:** No errors, index visible in DevTools

---

## Phase 2: Query Optimization (1 hour)

### Step 2a: Optimize getYearBreakdownForVenue()
**File:** `app/src/lib/db/dexie/queries.ts`

- [ ] Locate function at line 586 (getYearBreakdownForVenue)
- [ ] Replace entire function with optimized version
- [ ] Add try/catch with fallback to old method
- [ ] Update JSDoc comment with "OPTIMIZED v7" notation
- [ ] Verify indentation matches file style

**Check:**
- [ ] Function starts with cache lookup (unchanged)
- [ ] Uses `[venueId+year]` compound index
- [ ] Has try/catch fallback
- [ ] Returns same data structure
- [ ] Uses `getDb()` consistently

### Step 2b: Optimize getShowsForSong()
**File:** `app/src/lib/db/dexie/queries.ts`

- [ ] Locate function at line 527 (getShowsForSong)
- [ ] Replace entire function with optimized version
- [ ] Add try/catch with fallback to old method
- [ ] Update JSDoc comment
- [ ] Verify uses proper Set for deduplication

**Check:**
- [ ] Uses `[songId+showDate]` compound index
- [ ] Deduplicates show IDs with Set
- [ ] Falls back to old method if index missing
- [ ] Returns shows sorted by date descending
- [ ] Performance: < 100ms even for 500+ plays

### Step 2c: Test Optimized Queries
**Testing Steps:**
1. Refresh app in browser
2. Open DevTools Console
3. Run profiling code:
```javascript
console.time('getYearBreakdownForVenue');
const result = await db.shows
  .where('[venueId+year]')
  .between([1, 0], [1, 9999])
  .toArray();
console.timeEnd('getYearBreakdownForVenue');
console.log('Result count:', result.length);
```
4. Verify timing < 50ms
5. Check result has data

**Success:** Query completes in < 50ms

---

## Phase 3: Pagination Functions (1 hour)

### Step 3a: Add Pagination Helpers
**File:** `app/src/lib/db/dexie/query-helpers.ts`

- [ ] Locate line 779 (after paginatedQuery function)
- [ ] Add `getShowsByVenuePaginated()` function
- [ ] Add `getAppearancesByGuestPaginated()` function
- [ ] Add `getSetlistForShowPaginated()` function
- [ ] Verify each uses correct compound index
- [ ] Verify each has proper JSDoc

**Check:**
- [ ] All three functions added
- [ ] Each returns PaginatedResult<T>
- [ ] Cursor logic implemented correctly
- [ ] Proper type annotations
- [ ] No syntax errors

### Step 3b: Export New Functions
**File:** `app/src/lib/db/dexie/index.ts`

- [ ] Find re-export section from query-helpers.ts
- [ ] Add to export list:
  - `getShowsByVenuePaginated`
  - `getAppearancesByGuestPaginated`
  - `getSetlistForShowPaginated`

**Check:**
- [ ] All three functions exported
- [ ] Exports are alphabetically ordered
- [ ] No duplicate exports
- [ ] No syntax errors

### Step 3c: Test Pagination
**Testing Steps:**
1. In browser console:
```javascript
// Test pagination
const page1 = await db.shows
  .where('[venueId+date]')
  .between([1, '0000-01-01'], [1, '9999-12-31'])
  .reverse()
  .limit(51)
  .toArray();

console.log('Page 1 length:', page1.length);
console.log('Has more:', page1.length === 51);
console.log('First show:', page1[0].date);
```
2. Verify pagination returns correct data
3. Test with different page sizes

**Success:** Pagination works with cursor

---

## Phase 4: Unit Tests (45 minutes)

### Step 4a: Create Test File
**File:** Create `tests/indexeddb-optimization.test.ts`

- [ ] Copy test template from IMPLEMENTATION_GUIDE.md
- [ ] Paste into new test file
- [ ] Verify imports are correct
- [ ] Check test structure

**Check:** File created, syntax valid

### Step 4b: Run Tests
**Testing Steps:**
1. Open terminal
2. Run: `npm test -- indexeddb-optimization.test.ts`
3. Verify all tests pass
4. Check coverage
5. Note any failures

**Success:** All tests pass

### Step 4c: Performance Benchmarks
**Testing Steps:**
1. Open DevTools Performance tab
2. Start recording
3. Run: `await getYearBreakdownForVenue(1)`
4. Stop recording
5. Check duration (should be < 50ms)

**Targets:**
- [ ] getYearBreakdownForVenue < 50ms
- [ ] getShowsForSong < 100ms
- [ ] Pagination < 20ms

---

## Phase 5: Validation & Testing (1 hour)

### Step 5a: Functional Testing
**Venue Detail Page:**
- [ ] Load page
- [ ] Check year breakdown loads
- [ ] Check show list displays correctly
- [ ] Scroll through shows
- [ ] No JavaScript errors

**Song Detail Page:**
- [ ] Load page
- [ ] Check show list loads
- [ ] Check pagination works
- [ ] Click next page
- [ ] No overlapping results

**Guest Detail Page:**
- [ ] Load page
- [ ] Check appearances list
- [ ] Check pagination
- [ ] Verify year breakdown

**Check:**
- [ ] All pages load without errors
- [ ] Data displays correctly
- [ ] No console errors
- [ ] UI is responsive

### Step 5b: Memory Testing
**Mobile Device Test (or Chrome DevTools mobile emulation):**

1. Open DevTools → More Tools → Performance Monitor
2. Load venue detail page with 100+ shows
3. Check memory usage:
   - [ ] Before: ~100KB+
   - [ ] After with pagination: ~20KB
4. Scroll through multiple pages
5. Check memory stays low

**Success:** Memory stays under 50KB per page

### Step 5c: Browser Compatibility Testing

Test on:
- [ ] Chrome 90+ (latest)
- [ ] Firefox 88+ (latest)
- [ ] Safari 14+ (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Check:**
- [ ] Indexes created correctly
- [ ] Queries work without errors
- [ ] Performance acceptable on each browser

### Step 5d: Regression Testing

Test existing functionality:
- [ ] Search still works
- [ ] Filters still work
- [ ] Sorting still works
- [ ] User data (favorites, attended) still works
- [ ] Offline functionality still works

**Check:** No regression in existing features

---

## Phase 6: Performance Validation (30 minutes)

### Step 6a: Before/After Comparison

**Baseline (if not already recorded):**
1. In DevTools Console, run:
```javascript
// Test each query 3 times, average results
const times = [];
for (let i = 0; i < 3; i++) {
  const start = performance.now();
  await getYearBreakdownForVenue(1);
  times.push(performance.now() - start);
}
console.log('Avg:', (times.reduce((a,b)=>a+b)/times.length).toFixed(2) + 'ms');
```

2. Record baselines:
   - [ ] getYearBreakdownForVenue (venue with 100+ shows)
   - [ ] getShowsForSong (song with 100+ performances)
   - [ ] Pagination first page load
   - [ ] Overall page load time

### Step 6b: Optimization Impact

Compare before/after:
- [ ] getYearBreakdownForVenue: Should be 60% faster
- [ ] getShowsForSong: Should be 50-70% faster
- [ ] Pagination: Should be 75%+ faster
- [ ] Memory: Should be 60-80% less on detail pages

**Success Criteria:**
- [ ] At least 50% improvement on venue queries
- [ ] At least 60% improvement on song queries
- [ ] Memory usage significantly reduced

---

## Phase 7: Monitoring Setup (30 minutes)

### Step 7a: Add RUM Metrics
**File:** `app/src/routes/api/telemetry/performance/+server.ts`

- [ ] Add query performance tracking
- [ ] Include query name in payload
- [ ] Include execution duration
- [ ] Include cache hit/miss
- [ ] Include record count

**Check:** RUM payload structure includes query metrics

### Step 7b: Set Up Alerts
**Monitoring Dashboard:**
- [ ] Alert if query > 100ms (slow)
- [ ] Alert if memory usage > 200MB
- [ ] Alert if error rate > 5%
- [ ] Dashboard shows trend over time

**Check:** Monitoring is active

---

## Phase 8: Documentation Update (30 minutes)

### Step 8a: Code Comments
Update in modified files:
- [ ] Schema version 7 comments updated
- [ ] Query optimization comments added
- [ ] Performance targets documented
- [ ] Fallback paths explained

**Check:** All modified functions have clear comments

### Step 8b: Developer Documentation
- [ ] Add entry to CONTRIBUTING.md about new query patterns
- [ ] Update ARCHITECTURE.md with schema v7 notes
- [ ] Add quick-start example to README if applicable

**Check:** Documentation reflects changes

---

## Phase 9: Deployment Preparation (30 minutes)

### Step 9a: Code Review
- [ ] All changes reviewed for correctness
- [ ] No syntax errors
- [ ] Indentation consistent
- [ ] No console.log() left in production code
- [ ] No commented-out code

**Check:** Code is clean and production-ready

### Step 9b: Backup
- [ ] Current schema.ts backed up
- [ ] Current queries.ts backed up
- [ ] Test data backed up
- [ ] Rollback plan documented

**Check:** Backups created

### Step 9c: Deployment Plan
- [ ] Schedule deployment time
- [ ] Notify team of changes
- [ ] Plan monitoring during rollout
- [ ] Identify rollback procedures
- [ ] Communication prepared

**Check:** Deployment ready

---

## Phase 10: Deployment & Monitoring (Ongoing)

### Step 10a: Deploy to Staging
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Manual testing on staging
- [ ] Performance testing
- [ ] Check for any issues

**Success Criteria:**
- [ ] All tests pass
- [ ] No regressions
- [ ] Performance improved
- [ ] No errors in logs

### Step 10b: Deploy to Production
- [ ] Deploy during low-traffic window
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Monitor user analytics
- [ ] Be ready to rollback

**Watch for:**
- [ ] Error rate > 0.5%
- [ ] Query performance degradation
- [ ] Memory usage spikes
- [ ] Storage quota issues

### Step 10c: Ongoing Monitoring (First 48 Hours)
- [ ] Check RUM metrics hourly
- [ ] Monitor error reports
- [ ] Check user complaints/feedback
- [ ] Verify performance improvements
- [ ] Monitor storage usage

**Continue For:**
- [ ] 24 hours post-deployment
- [ ] First weekend after deployment
- [ ] First week of normal usage

---

## Post-Deployment Validation

### Checklist
- [ ] Query performance improved 30-70%
- [ ] Memory usage reduced 50-80% on detail pages
- [ ] No error rate increase
- [ ] No storage quota issues
- [ ] User experience is smooth
- [ ] Mobile performance improved
- [ ] All tests passing
- [ ] No customer complaints

### Success Metrics
- [ ] Venue detail pages: 400ms → 150ms
- [ ] Song detail pages: 350ms → 140ms
- [ ] Memory per detail page: 45KB → 12KB (venue), 200KB → 50KB (song)
- [ ] Error rate: 0% (no regressions)
- [ ] User satisfaction: No complaints

---

## Rollback Checklist (If Needed)

If issues occur post-deployment:

### Quick Rollback (< 5 minutes)
1. [ ] Revert CURRENT_DB_VERSION to 6
2. [ ] Revert modified functions to original versions
3. [ ] Deploy immediately
4. [ ] Monitor until stable

### Data Safety Check
- [ ] Verify no data loss
- [ ] Check database consistency
- [ ] Monitor error rates return to baseline
- [ ] Confirm user experience restored

### Root Cause Analysis
- [ ] Identify what went wrong
- [ ] Review logs and metrics
- [ ] Plan fix
- [ ] Test fix thoroughly
- [ ] Redeploy when ready

---

## Sign-Off

### Development Team
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] No known issues
- [ ] Ready for deployment

### QA Team
- [ ] Functional testing complete
- [ ] Performance testing complete
- [ ] Regression testing complete
- [ ] Ready for production

### Operations Team
- [ ] Monitoring set up
- [ ] Alerts configured
- [ ] Rollback plan ready
- [ ] On-call support ready

### Product Team
- [ ] Performance improvements validated
- [ ] User experience improved
- [ ] Ready to monitor in production
- [ ] Communication plan ready

---

## Timeline Summary

| Phase | Duration | Total Time |
|-------|----------|-----------|
| Schema Migration | 30 min | 30 min |
| Query Optimization | 1 hour | 1h 30min |
| Pagination Functions | 1 hour | 2h 30min |
| Unit Tests | 45 min | 3h 15min |
| Validation & Testing | 1 hour | 4h 15min |
| Performance Validation | 30 min | 4h 45min |
| Monitoring Setup | 30 min | 5h 15min |
| Documentation | 30 min | 5h 45min |
| Deployment Prep | 30 min | 6h 15min |

**Total Estimated Time:** 6-7 hours (including testing and validation)

---

## Quick Start (Experienced Developers)

For developers familiar with Dexie:

1. Add schema v7 with `[venueId+year]` index (5 min)
2. Optimize two functions with try/catch fallbacks (15 min)
3. Add three pagination functions (15 min)
4. Export new functions (2 min)
5. Run test suite (5 min)
6. Deploy and monitor (ongoing)

**Quick implementation time:** 45 minutes
**Full testing:** 2-3 hours

---

## Notes

- All changes are backward compatible
- Fallback paths prevent breaking existing code
- Schema migration is automatic and transparent
- No data loss or transformation needed
- Can rollback in < 5 minutes if needed

---

## Support

If you encounter issues:

1. Check **INDEXEDDB_QUICK_REFERENCE.md** for query patterns
2. Review **INDEXEDDB_IMPLEMENTATION_GUIDE.md** for code examples
3. See **INDEXEDDB_PERFORMANCE_OPTIMIZATION.md** for detailed analysis
4. Check browser DevTools for index verification

---

**Last Updated:** 2025-01-25
**Status:** Ready for Implementation

