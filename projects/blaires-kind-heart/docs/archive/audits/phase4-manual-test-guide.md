# Phase 4 Manual Testing Guide

## Overview

**Date**: 2026-02-11
**Phase**: Phase 4 Bug Fixes → Phase 5 Manual Testing
**Environment**: Safari 26.2 on iPad Mini 6 (A15, 4GB RAM, iPadOS 26.2)
**Build**: Production release with all critical fixes applied

## Test Environment Setup

### 1. Start Development Server (Network Access)

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart
trunk serve --address 0.0.0.0 --port 8080
```

**Access URL**: http://[YOUR_MAC_IP]:8080

### 2. iPad Safari DevTools Setup

1. iPad: Settings → Safari → Advanced → Web Inspector (ON)
2. Mac: Safari → Develop → [iPad Name] → http://[IP]:8080
3. Open Web Inspector → Console, Network, Timelines tabs

### 3. Pre-Test Database Setup (Optional)

If fresh install needed:
```sql
-- Clear all data
DELETE FROM gardens;
DELETE FROM companion_skins;
DELETE FROM kind_acts;

-- Re-seed (will happen automatically on boot)
```

## Test Suite

### ✅ Test 1: Memory Leak Fix Verification (CRITICAL)

**Bug Fixed**: #8 (Companion memory leak), #12 (View Transitions memory leak)

**Setup**:
1. Open Safari DevTools → Timelines → JavaScript Allocations
2. Start recording
3. Note initial heap size

**Test Steps**:
1. Tap companion rapidly 50 times (trigger expression changes)
2. Wait 60 seconds for GC to stabilize
3. Note final heap size

**Expected Results**:
- ✅ Heap growth <5MB total
- ✅ No sustained growth >1KB/minute
- ✅ GC sawtooth pattern visible (allocations followed by collections)

**Failure Indicators**:
- ❌ Heap grows >10MB
- ❌ Linear growth without GC collections
- ❌ Browser becomes sluggish after 100+ taps

**Pass Criteria**: Heap growth <5MB, <1KB/min sustained

---

### ✅ Test 2: Race Condition Fix Verification (CRITICAL)

**Bug Fixed**: #9 (set_expression race condition + revert bypass)

**Setup**:
1. Open Console tab in DevTools
2. Enable "Preserve Log"

**Test Steps**:
1. Rapid-tap companion 10 times/second for 10 seconds
2. Observe asset changes during tapping
3. Stop tapping, wait 4 seconds for revert-to-idle
4. Verify final asset is "happy" (idle state)

**Expected Results**:
- ✅ Each tap shows correct expression asset
- ✅ No intermediate assets flash briefly
- ✅ After 4s idle, reverts to "happy" asset smoothly
- ✅ No console errors about stale renders

**Failure Indicators**:
- ❌ Wrong asset flashes for <100ms during tap
- ❌ Revert shows "celebrating" when should show "happy"
- ❌ Console errors about aborting stale renders

**Pass Criteria**: No flicker, correct final asset 100% of time

---

### ✅ Test 3: "Stage 6 of 5" Display Fix (HIGH)

**Bug Fixed**: #4 (Stage index mapping + display clamp)

**Setup**:
1. Use Safari Web Inspector → Storage → IndexedDB
2. Navigate to `blaires-kind-heart` database → `gardens` table

**Test Steps**:
1. Update test garden to completion:
   ```sql
   UPDATE gardens SET growth_stage=5 WHERE id='garden-hug-1'
   ```
2. Navigate to Gardens panel
3. Observe stage text display

**Expected Results**:
- ✅ Displays "Stage 5 of 5"
- ✅ Shows final stage asset (bunny_stage_5.webp)
- ✅ Progress bar at 100%

**Failure Indicators**:
- ❌ Shows "Stage 6 of 5" or higher
- ❌ Wrong asset (stage_1 when should be stage_5)
- ❌ Progress bar >100% or negative

**Pass Criteria**: "Stage 5 of 5" displayed for completed garden

---

### ✅ Test 4: Navigation API State Sync (HIGH)

**Bug Fixed**: #10 (Navigation API state desync)

**Test Steps**:
1. Navigate: Home → Gardens → Tracker → Home
2. Tap back button 3 times
3. Verify each panel restores correctly
4. Tap forward button 3 times
5. Verify forward navigation works
6. Repeat back/forward cycle 10 times

**Expected Results**:
- ✅ Back button shows correct panel at each step
- ✅ Forward button works correctly
- ✅ No stateless entries in history
- ✅ Panel state persists through 10+ navigations

**Failure Indicators**:
- ❌ Back button shows blank panel
- ❌ Back/forward breaks after 3-4 navigations
- ❌ Console errors about missing state

**Pass Criteria**: 10+ back/forward cycles without desync

---

### ✅ Test 5: Database Type Safety (HIGH)

**Bug Fixed**: #11 (Boolean confusion), #13 (Integer mismatch), #14 (NULL safety)

**Test Steps**:
1. Open Console in DevTools
2. Navigate to Gardens panel
3. Observe console for error messages
4. SQL test invalid data:
   ```sql
   -- Test NULL safety
   UPDATE gardens SET growth_stage=NULL WHERE id='garden-hug-1'
   ```
5. Navigate to Gardens panel again
6. Check console for proper error handling

**Expected Results**:
- ✅ No console errors on normal operations
- ✅ Proper error messages for NULL garden data
- ✅ is_active filtering works (only active skin shown)
- ✅ growth_stage displays correctly as integer

**Failure Indicators**:
- ❌ Console errors about type conversion
- ❌ App crashes on NULL data
- ❌ All skins shown (is_active filter broken)

**Pass Criteria**: Proper error logging, no crashes, correct filtering

---

### ✅ Test 6: OPFS Safari Skip (CRITICAL)

**Bug Fixed**: #5 (OPFS detection broken)

**Test Steps**:
1. Force refresh page (clear cache)
2. Observe Console during initial load
3. Look for database backend messages

**Expected Results**:
- ✅ Console shows: "[db-worker] Safari detected, skipping OPFS"
- ✅ Console shows: "[db-worker] Using kvvfs backend"
- ✅ Page loads in <5 seconds (no 30s OPFS timeout)
- ✅ Database queries work correctly

**Failure Indicators**:
- ❌ 30 second delay on page load
- ❌ Console shows OPFS errors
- ❌ Database operations fail

**Pass Criteria**: Fast load (<5s), kvvfs backend used, no OPFS errors

---

### ✅ Test 7: Service Worker Precache (CRITICAL)

**Bug Fixed**: #2 (Missing CSS in precache)

**Test Steps**:
1. Safari DevTools → Network tab
2. Force refresh (clear cache)
3. Enable Airplane Mode
4. Force refresh again
5. Navigate to Gardens panel

**Expected Results**:
- ✅ All 78 WebP assets load from cache
- ✅ gardens.css loads from cache
- ✅ scroll-effects.css loads from cache
- ✅ particle-effects.css loads from cache
- ✅ All UI renders correctly offline

**Failure Indicators**:
- ❌ 404 errors for CSS files
- ❌ 404 errors for WebP assets
- ❌ Unstyled content visible

**Pass Criteria**: All assets load offline, UI fully functional

---

### ✅ Test 8: Asset Copy to Build (CRITICAL)

**Bug Fixed**: #1 (Assets not copied to build)

**Test Steps**:
1. Check dist/ directory on Mac:
   ```bash
   ls -la dist/assets/companions/ | wc -l  # Should be 18
   ls -la dist/assets/gardens/ | wc -l     # Should be 60
   ```
2. On iPad, check Network tab for 200 OK responses
3. Verify all companion assets load
4. Verify all garden assets load

**Expected Results**:
- ✅ 18 companion WebP files in dist/assets/companions/
- ✅ 60 garden WebP files in dist/assets/gardens/
- ✅ All HTTP requests return 200 OK
- ✅ No 404 errors in Network tab

**Failure Indicators**:
- ❌ Missing assets in dist/
- ❌ 404 errors for WebP files
- ❌ Emoji fallbacks rendering instead of assets

**Pass Criteria**: All 78 assets present and loading correctly

---

### ✅ Test 9: Database Export Interval (CRITICAL)

**Bug Fixed**: #6 (Export interval too long → data loss risk)

**Test Steps**:
1. Log a kind act
2. Immediately force-quit Safari (double-tap home, swipe up)
3. Wait 10 seconds
4. Reopen app
5. Check if kind act persisted

**Expected Results**:
- ✅ Kind act data persists after force-quit
- ✅ Export happens within 5 seconds of change
- ✅ No data loss on unexpected closure

**Failure Indicators**:
- ❌ Data lost after force-quit
- ❌ Changes only persist after 30s delay

**Pass Criteria**: Data persists with <5s export interval

---

### ✅ Test 10: Gardens Seed Function (CRITICAL)

**Bug Fixed**: #3 (Gardens seed empty)

**Test Steps**:
1. Clear IndexedDB (delete database)
2. Force refresh page
3. Navigate to Gardens panel
4. Check for test garden

**Expected Results**:
- ✅ Console shows: "[gardens] Seeding test garden for development"
- ✅ "Bunny Garden" appears in gardens grid
- ✅ Shows stage 1 asset (bunny_stage_1.webp)
- ✅ "Stage 1 of 5" displayed

**Failure Indicators**:
- ❌ Empty gardens panel
- ❌ No console message about seeding
- ❌ SQL query returns 0 gardens

**Pass Criteria**: Test garden created automatically on first boot

---

## Regression Testing

### Run Full Week 3 Test Plan

Execute all 14 test cases from `docs/testing/week3-manual-test-plan.md`:

1. ✅ Companion renders default skin on boot
2. ✅ Expression changes work with View Transitions
3. ✅ Gardens panel accessible via navigation
4. ✅ Garden cards render with correct assets
5. ✅ Touch targets ≥48px on all interactive elements
6. ✅ Service Worker caches all assets
7. ✅ Offline mode works (airplane mode test)
8. ✅ Memory usage stable over 5-minute session
9. ✅ No console errors during normal usage
10. ✅ INP <200ms for all interactions
11. ✅ LCP <2.5s on cold start
12. ✅ View Transitions smooth (60fps)
13. ✅ Database queries <50ms
14. ✅ Asset load times <200ms from cache

**Pass Criteria**: All 14 Week 3 tests still pass (zero regressions)

---

## Performance Metrics

### Key Performance Indicators

Track these metrics during testing:

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Heap growth/min | <1KB | <5KB |
| LCP (cold) | <2.5s | <4s |
| INP | <200ms | <500ms |
| Asset load (cache) | <200ms | <500ms |
| DB query time | <50ms | <100ms |
| View Transition FPS | 60fps | >30fps |
| Memory total | <50MB | <100MB |

**How to Measure**:
- Safari DevTools → Timelines → JavaScript & Events
- Enable "Record" during testing
- Review timeline after each test
- Export data if needed for analysis

---

## Bug Tracking

### If Test Fails

For each failure:

1. **Screenshot**: Capture screen + DevTools
2. **Console Log**: Copy all errors
3. **Timeline**: Export performance data
4. **Reproduce**: Document exact steps to reproduce
5. **Severity**: Rate as CRITICAL/HIGH/MEDIUM/LOW
6. **Document**: Add to new `docs/PHASE5_BUGS.md`

### Bug Report Template

```markdown
## Bug #XX: [Short Description]

**Severity**: CRITICAL/HIGH/MEDIUM/LOW
**Test**: Test #X - [Test Name]
**Environment**: Safari 26.2, iPad Mini 6, iPadOS 26.2

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected**: [What should happen]
**Actual**: [What actually happened]

**Console Errors**:
```
[paste console output]
```

**Screenshots**: [attach if available]

**Suggested Fix**: [if obvious]
```

---

## Success Criteria

### Phase 5 Complete When:

**Must Pass** (Zero failures allowed):
- ✅ All 10 critical/high priority bug fixes verified
- ✅ Zero new bugs introduced (regression-free)
- ✅ All 14 Week 3 test cases still pass
- ✅ Performance metrics within targets
- ✅ Zero console errors during normal usage

**Ready for Production**:
- ✅ All Phase 5 tests complete
- ✅ Documentation updated
- ✅ User confirms app works on iPad Mini 6
- ✅ No known CRITICAL or HIGH bugs remaining

---

## Testing Checklist

Print this and check off during testing:

- [ ] Test 1: Memory leak fix verified (<5MB heap)
- [ ] Test 2: Race condition fix verified (no flicker)
- [ ] Test 3: "Stage 6 of 5" fix verified
- [ ] Test 4: Navigation API fix verified (10+ cycles)
- [ ] Test 5: Database type safety verified
- [ ] Test 6: OPFS skip verified (<5s load)
- [ ] Test 7: Service Worker precache verified (offline works)
- [ ] Test 8: Asset copy verified (78 files present)
- [ ] Test 9: Export interval verified (<5s persistence)
- [ ] Test 10: Gardens seed verified (test garden created)
- [ ] Regression: All 14 Week 3 tests pass
- [ ] Performance: All metrics within targets
- [ ] Bug tracking: All failures documented
- [ ] User acceptance: iPad Mini 6 works correctly

---

**Phase 5 Manual Testing Guide - Ready for Execution**
**Estimated Time: 2-3 hours**
