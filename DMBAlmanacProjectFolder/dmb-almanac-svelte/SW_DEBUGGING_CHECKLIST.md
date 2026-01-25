# Service Worker Debugging Checklist

## Pre-Work Verification

- [ ] All three debug documents created:
  - [ ] SW_DEBUG_REPORT.md (28KB)
  - [ ] SW_QUICK_FIXES.md (11KB)
  - [ ] SW_ARCHITECTURE_ANALYSIS.md (28KB)
  - [ ] SW_DEBUG_SUMMARY.txt (8KB)

- [ ] Key files identified and reviewed:
  - [ ] `/src/lib/stores/pwa.ts` - Main PWA store (187 lines)
  - [ ] `/static/sw.js` - Service Worker (598 lines)
  - [ ] `/src/lib/sw/register.ts` - Registration utilities (392 lines, unused)
  - [ ] `/src/routes/+layout.svelte` - App layout initialization
  - [ ] `/static/manifest.json` - Web app manifest

---

## Issue-by-Issue Checklist

### Issue 1: Race Condition in PWA Initialization

**Priority:** CRITICAL
**File:** `/src/lib/stores/pwa.ts`
**Lines:** 56-143
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 25-48
  - [ ] Review SW_ARCHITECTURE_ANALYSIS.md "Issue: Race Condition"

- [ ] Locate the code:
  - [ ] Find `pwaStore.initialize()` definition
  - [ ] Find both calls: +layout.svelte (line 20) and InstallPrompt.svelte (line 47)

- [ ] Apply the fix:
  - [ ] Add initialization guard flag
  - [ ] Reference SW_QUICK_FIXES.md "Fix 1" for exact code
  - [ ] Test: Single registration in DevTools

- [ ] Verify:
  - [ ] No duplicate console logs
  - [ ] Single listener set per event
  - [ ] No memory leaks on component unmount

---

### Issue 2: Incomplete Event Listener Cleanup

**Priority:** HIGH
**File:** `/src/lib/stores/pwa.ts`
**Lines:** 104-124
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 51-91
  - [ ] Review code: nested addEventListener without AbortController

- [ ] Locate the code:
  - [ ] Find `handleUpdateFound` function
  - [ ] Find nested `newWorker.addEventListener('statechange')`

- [ ] Apply the fix:
  - [ ] Create nestedController for each nested listener
  - [ ] Use signal: nestedController.signal
  - [ ] Add cleanup callback to cleanupFunctions
  - [ ] Reference SW_QUICK_FIXES.md "Fix 2" for pattern

- [ ] Verify:
  - [ ] No listeners attached after unmount
  - [ ] Memory profiler shows no listener leaks

---

### Issue 3: Missing SW Update Notification

**Priority:** CRITICAL
**File:** `/static/sw.js`
**Lines:** 77-103 (activate event)
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 94-163
  - [ ] Review timing diagram in SW_ARCHITECTURE_ANALYSIS.md
  - [ ] Understand stale resource delivery risk

- [ ] Locate the code:
  - [ ] Find activate event listener (line 77)
  - [ ] Find clients.claim() call (line 100)

- [ ] Apply the fix:
  - [ ] After clients.claim(), add message broadcast
  - [ ] Send SW_UPDATED message with version
  - [ ] Update pwa.ts to handle message
  - [ ] Reference SW_QUICK_FIXES.md "Fix 2" for exact code

- [ ] Verify:
  - [ ] Update banner appears correctly
  - [ ] Reload happens automatically
  - [ ] No mixed assets on update

---

### Issue 4: Precache Failure Handling

**Priority:** CRITICAL
**File:** `/static/sw.js`
**Lines:** 53-72 (install event)
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 166-202
  - [ ] Understand cache.addAll() rejection behavior
  - [ ] Understand offline fallback risk

- [ ] Locate the code:
  - [ ] Find PRECACHE_URLS array (line 30)
  - [ ] Find install event listener (line 53)
  - [ ] Find cache.addAll() call (line 61)

- [ ] Apply the fix:
  - [ ] Replace cache.addAll() with loop
  - [ ] Fetch each URL individually
  - [ ] Log warnings for failed URLs
  - [ ] Always call skipWaiting() regardless
  - [ ] Reference SW_QUICK_FIXES.md "Fix 3" for exact code

- [ ] Verify:
  - [ ] Failed URLs logged to console
  - [ ] SW still installs even with failures
  - [ ] /offline page cached successfully
  - [ ] Offline fallback works

---

### Issue 5: Network Timeout Missing

**Priority:** HIGH
**File:** `/static/sw.js`
**Lines:** 206-263 (networkFirstWithExpiration)
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 205-237
  - [ ] Understand fetch() can hang indefinitely
  - [ ] Review timeout benefits

- [ ] Locate the code:
  - [ ] Find networkFirstWithExpiration function (line 206)
  - [ ] Find fetch(request) call (line 209)

- [ ] Apply the fix:
  - [ ] Add fetchWithTimeout() helper function
  - [ ] Implement Promise.race() with timeout
  - [ ] Use 5000ms (5s) timeout
  - [ ] Reference SW_QUICK_FIXES.md "Fix 4" for exact code

- [ ] Verify:
  - [ ] Slow requests timeout in ~5s
  - [ ] Cache fallback shown on timeout
  - [ ] No indefinite hangs

---

### Issue 6: Cache Staleness Indicator Missing

**Priority:** HIGH
**File:** `/static/sw.js`
**Lines:** 246-257 (expiration check)
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 240-284
  - [ ] Understand silent staleness risk

- [ ] Locate the code:
  - [ ] Find expiration check in networkFirstWithExpiration
  - [ ] Find "if (age > maxAgeSeconds)" block (line 253)

- [ ] Apply the fix:
  - [ ] Add X-Cache-Stale header to stale responses
  - [ ] Add X-Cache-Age header with age value
  - [ ] Clone response with new headers
  - [ ] Reference SW_QUICK_FIXES.md "Fix 5" for exact code

- [ ] Verify in client-side code:
  - [ ] Check response headers for staleness
  - [ ] Show warning banner when stale
  - [ ] Display cache age to user

- [ ] Test:
  - [ ] Wait for cache to expire
  - [ ] Go offline
  - [ ] Check for staleness flag

---

### Issue 7: MessageChannel Port Leaks

**Priority:** MEDIUM
**File:** `/src/lib/sw/register.ts`
**Lines:** 352-391 (getCacheStatus)
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 287-314
  - [ ] Understand port.close() requirement

- [ ] Locate the code:
  - [ ] Find getCacheStatus function (line 352)
  - [ ] Find MessageChannel creation (line 364)
  - [ ] Find timeout handler (line 372)
  - [ ] Find message handler (line 376)

- [ ] Apply the fix:
  - [ ] Call channel.port1.close() in timeout branch
  - [ ] Call channel.port1.close() after message received
  - [ ] Apply same pattern to checkForCriticalUpdates
  - [ ] Reference SW_QUICK_FIXES.md "Fix 6" for exact code

- [ ] Verify:
  - [ ] Memory profiler shows no port leaks
  - [ ] No pending ports in DevTools

---

### Issue 8: Duplicate Registration Code

**Priority:** MEDIUM
**File:** `/src/lib/sw/register.ts` (unused)
**File:** `/src/lib/stores/pwa.ts` (used)
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 317-354
  - [ ] Identify which code is used vs unused

- [ ] Decision point:
  - [ ] Option A: Delete register.ts entirely
  - [ ] Option B: Consolidate to single implementation
  - [ ] Option C: Make register.ts wrap pwa.ts

- [ ] If Option A (Delete):
  - [ ] Check for any imports of register.ts
  - [ ] Verify grep results: should be 0 imports
  - [ ] Delete file

- [ ] If Option B (Consolidate):
  - [ ] Decide on single canonical implementation
  - [ ] Copy best practices from both
  - [ ] Update imports to use single source

- [ ] Verify:
  - [ ] No multiple implementations
  - [ ] Clear single source of truth
  - [ ] All features available

---

### Issue 9: Scope Registration Mismatch

**Priority:** MEDIUM
**File:** `/src/lib/stores/pwa.ts` (registration)
**File:** `/static/manifest.json` (manifest)
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 357-389
  - [ ] Understand potential subdirectory deployment

- [ ] Verify current status:
  - [ ] Check manifest.json:
    - [ ] "id": "/dmb-almanac" (currently set)
    - [ ] "scope": "/" (currently set)
  - [ ] Check pwa.ts:
    - [ ] scope: "/" (line 97)

- [ ] Document the setup:
  - [ ] Create comment in manifest.json
  - [ ] Document deployment path expectations
  - [ ] Create migration guide for subdirectory deployment

- [ ] If deploying to subdirectory in future:
  - [ ] Update manifest: "id" and "scope" to "/subdirectory/"
  - [ ] Update pwa.ts register scope to "/subdirectory/"
  - [ ] Update manifest start_url

---

### Issue 10: Environment Detection Error

**Priority:** MEDIUM
**File:** `/src/lib/sw/register.ts`
**Lines:** 40
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 392-418
  - [ ] process.env.NODE_ENV doesn't exist in SvelteKit

- [ ] Locate the code:
  - [ ] Find condition at line 40
  - [ ] See references to NEXT_PUBLIC_* (Next.js convention)

- [ ] Apply the fix:
  - [ ] Import `dev` from '$app/environment'
  - [ ] Use dev flag instead of NODE_ENV
  - [ ] Move check to calling components
  - [ ] Reference SW_QUICK_FIXES.md "Fix 7"

- [ ] Verify:
  - [ ] No runtime errors
  - [ ] SW behavior correct in dev/prod

---

### Issue 11: Manifest ID Mismatch

**Priority:** LOW-MEDIUM
**File:** `/static/manifest.json`
**Line:** 2
**Status:** NOT FIXED

- [ ] Understand the problem:
  - [ ] Read SW_DEBUG_REPORT.md lines 421-445
  - [ ] id should match deployment path

- [ ] Locate the code:
  - [ ] Find "id" field in manifest.json (line 2)
  - [ ] Currently: "id": "/dmb-almanac"
  - [ ] Should be: "id": "/" (for root deployment)

- [ ] Apply the fix:
  - [ ] Change "id" from "/dmb-almanac" to "/"
  - [ ] Verify "scope" matches "id"
  - [ ] Reference SW_QUICK_FIXES.md "Fix 8"

- [ ] Verify:
  - [ ] Manifest validates correctly
  - [ ] PWA installation works

---

## Testing Plan

### Setup

- [ ] Clean slate
  ```
  DevTools > Application > Service Workers > Unregister
  DevTools > Application > Cache Storage > Delete all
  localStorage.clear()
  sessionStorage.clear()
  npm run build && npm run preview
  ```

### Test 1: Fresh Installation

- [ ] Load app in fresh tab
  - [ ] Check DevTools > Service Workers
    - [ ] Single registration visible
    - [ ] Status: "activated and running"
  - [ ] Check DevTools > Cache Storage
    - [ ] dmb-shell-v1 cache exists
    - [ ] Has 6 entries: /, /songs, /venues, /stats, /tours, /offline
  - [ ] Check console
    - [ ] No duplicate registration messages
    - [ ] Single set of lifecycle logs

### Test 2: Basic Navigation

- [ ] Navigate to each precached page
  - [ ] /songs
  - [ ] /venues
  - [ ] /stats
  - [ ] /tours
- [ ] Verify pages cache
  - [ ] Check DevTools > Cache Storage > dmb-pages-v1
  - [ ] Visited pages appear
- [ ] Check for console errors
  - [ ] No network errors
  - [ ] No SW errors

### Test 3: Offline Functionality

- [ ] Load app fully
- [ ] Go offline
  ```
  DevTools > Network > Offline checkbox
  ```
- [ ] Navigate to visited pages
  - [ ] Should load from cache
  - [ ] Should show offline indicator
- [ ] Navigate to unvisited page
  - [ ] Should show /offline fallback
- [ ] Go back online
  - [ ] Pages should work normally

### Test 4: Update Flow

- [ ] Edit sw.js: change CACHE_VERSION from 'v1' to 'v2'
- [ ] Rebuild: `npm run build && npm run preview`
- [ ] Open in new tab
- [ ] Wait for update detection
  - [ ] Check for "Update available" banner
  - [ ] Click "Update Now"
  - [ ] Page should reload
- [ ] Verify v2 is active
  - [ ] Check sw.js in DevTools Sources
  - [ ] Search for v2 in code
  - [ ] Cache name should be dmb-shell-v2

### Test 5: Network Timeout

- [ ] Throttle network
  ```
  DevTools > Network > Slow 3G
  ```
- [ ] Navigate to uncached page
  - [ ] Should timeout within ~5s
  - [ ] Should show fallback
  - [ ] Should not hang indefinitely
- [ ] Check console
  - [ ] Timeout message appears

### Test 6: Cache Expiration

- [ ] Navigate to a page to cache it
- [ ] Go offline
- [ ] Wait for cache expiration time (varies by content type)
- [ ] Navigate to cached page
- [ ] Check response headers
  - [ ] Should have X-Cache-Stale: true (if expired)
  - [ ] Should have X-Cache-Age header
- [ ] Check UI
  - [ ] Staleness indicator should appear

### Test 7: Memory Leaks

- [ ] Open in Chrome DevTools
- [ ] Memory tab > Take heap snapshot #1
- [ ] Navigate several times
- [ ] Reload page 5 times
- [ ] Take heap snapshot #2
- [ ] Compare heap sizes
  - [ ] Should be similar (+/- 5MB)
  - [ ] No growing memory usage

### Test 8: Real Device (If Available)

- [ ] iOS:
  - [ ] Add to home screen
  - [ ] Open from home screen
  - [ ] Check standalone mode
  - [ ] Test offline (limitations on iOS)

- [ ] Android:
  - [ ] Install PWA
  - [ ] Test offline
  - [ ] Test update
  - [ ] Test push notifications

---

## Performance Validation

- [ ] Lighthouse PWA audit
  ```
  DevTools > Lighthouse > PWA category
  ```
  - [ ] Score should be 90+
  - [ ] All green checks

- [ ] Web Vitals
  ```
  DevTools > Performance > Record page load
  ```
  - [ ] LCP < 1.5s
  - [ ] FCP < 1.0s
  - [ ] CLS < 0.1

- [ ] Cache effectiveness
  - [ ] Repeat visit should load from cache
  - [ ] No network requests for cached assets
  - [ ] Page should load instantly

---

## Documentation Tasks

- [ ] Add inline comments to pwa.ts
  - [ ] Explain initialization guard
  - [ ] Document listener cleanup
  - [ ] Explain messageChannel pattern

- [ ] Add comments to sw.js
  - [ ] Document caching strategies
  - [ ] Explain expiration logic
  - [ ] Document message handlers

- [ ] Create migration guide
  - [ ] For future subdirectory deployment
  - [ ] For updating cache versions
  - [ ] For adding new precache URLs

- [ ] Update README
  - [ ] Document PWA capabilities
  - [ ] List offline features
  - [ ] Explain update process

---

## Sign-Off Checklist

- [ ] All 11 issues identified and documented
- [ ] All critical issues fixed
- [ ] All high priority issues fixed
- [ ] Medium priority issues addressed
- [ ] All tests passing
- [ ] No console warnings/errors
- [ ] Memory profile clean
- [ ] Lighthouse score 90+
- [ ] Documentation updated
- [ ] Ready for production deployment

---

## Notes

Use these sections to track your progress:

**In Progress:**
(List any fixes currently being worked on)

**Blocked By:**
(List any blocking issues)

**Questions:**
(List any questions or uncertainties)

**Lessons Learned:**
(Document insights discovered during fixes)

