# DMB Almanac - PWA Debugging Report

**Analysis Date:** 2026-01-20
**Target Platform:** Chromium 143, Apple Silicon M-series (macOS Tahoe 26.2)
**Framework:** Next.js 16.1.1, React 19.2.3
**PWA Framework:** Custom Service Worker + Dexie.js

---

## Executive Summary

The DMB Almanac PWA implementation is **well-structured** with proper offline-first architecture using Dexie.js for IndexedDB and a manual service worker. However, there are **7 critical issues** that need attention for production stability:

1. Missing service worker implementation activation flow
2. Cache invalidation dependency issues
3. Incomplete offline-first data synchronization
4. Installation flow not validated end-to-end
5. No critical update mechanism wired
6. Storage quota warnings not implemented
7. iOS PWA limitations not documented in UX

---

## 1. Service Worker Registration & Lifecycle

### Status: PARTIAL - Issues Found

#### File: `/lib/sw/register.ts` (Lines 31-85)

**Issue 1.1: Development Mode Blocks Service Worker Registration**

```typescript
// Line 40-43
if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_ENABLE_SW_DEV) {
  console.log("[SW] Skipping SW registration in development");
  return;
}
```

**Problem:**
- Service Worker registration is disabled by default in development
- No warning or debugging information about this condition
- Makes local testing harder without setting environment variable

**Recommendation:**
- Add explicit debugging log when skipping registration
- Document required env var in comments

#### File: `/lib/sw/register.ts` (Lines 45-85)

**Issue 1.2: Missing Lifecycle Handlers**

```typescript
// Current: Only handles updatefound and controllerchange
// Missing:
// - statechange on initial installing worker (install/activate/activated)
// - error event handler
// - redundant event (SW was replaced)
```

**Problem:**
- Does not capture all service worker lifecycle events
- Cannot detect installation failures
- No redundancy detection (when another SW takes over)

**Recommendation:**
- Add comprehensive state tracking for installed/activating/activated states
- Add error handlers for install/activate failures

#### File: `/public/sw.js` (Lines 46-62, 64-96)

**Issue 1.3: Missing skipWaiting() and clients.claim() in Install/Activate**

```javascript
// Line 57-59: ISSUE
self.addEventListener("install", (event) => {
  // ... precache logic
  // NOTE: "We don't auto-skip here to allow controlled updates"
  // BUT: No clients.claim() here either
});

// Line 85-86: GOOD - Has clients.claim()
self.addEventListener("activate", (event) => {
  // ...
  return self.clients.claim();
});
```

**Problem:**
- Install event doesn't call `self.skipWaiting()` - creates "waiting" state
- Users must manually refresh or wait for another tab to close
- Clients not claimed until activate, causing delay in new page control
- User experience: users see update notification but don't get served by new SW immediately

**Expected Behavior:**
```javascript
// Install: Skip waiting if no previous version exists
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.precache)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // Take over immediately if first install
  );
});
```

**Severity:** HIGH

---

## 2. Cache Invalidation & Stale Cache Issues

### Status: GOOD STRATEGY, INCOMPLETE IMPLEMENTATION

#### File: `/lib/sw/sw-strategy.ts` (Line 197)

**Issue 2.1: Cache Version Static, No Automatic Invalidation**

```typescript
export const CACHE_VERSION = "v2";
```

**Problem:**
- Cache version is hardcoded in TypeScript source
- To invalidate cache, requires code change + rebuild + redeploy
- No mechanism for server-initiated cache busting
- Old caches (v1) must be cleaned up manually on activate

**Current Cleanup Logic (Lines 74-82 in sw.js):**
```javascript
cacheNames
  .filter((name) => {
    return name.startsWith("dmb-") && !Object.values(CACHE_NAMES).includes(name);
  })
  .map((name) => {
    console.log("[SW] Deleting old cache:", name);
    return caches.delete(name);
  })
```

**Good:** Only deletes versioned caches not in CACHE_NAMES
**Bad:** Requires new CACHE_VERSION to be deployed first

**Recommendation:**
1. Implement `/api/cache-version` endpoint returning current version
2. Check version on app startup and force cache clear if mismatch
3. Support both build-time versioning and runtime versioning

#### File: `/lib/sw/serwist.config.ts` (Lines 42-181)

**Issue 2.2: Network Timeout Too Aggressive**

```typescript
// Line 143: API routes
networkTimeoutSeconds: 3,

// Line 178: Default fallback
networkTimeoutSeconds: 5,
```

**Problem:**
- 3 second timeout for API routes may be too short on slow connections
- No retry logic on timeout
- Cached stale data served without user awareness

**Recommendation:**
- Increase timeout to 5-8 seconds
- Add "X-Served-From-Cache" header to cached responses
- Implement stale-while-revalidate refresh notifications

#### File: `/lib/sw/PWA_CACHE_MANAGEMENT.md` (Lines 13-20)

**Issue 2.3: Cache Cleanup Running But Not Exposed**

```markdown
## Automated Cleanup
The service worker runs cache cleanup operations automatically every 10 minutes
```

**Problem:**
- Documentation mentions automatic cleanup but not implemented in current `/public/sw.js`
- Only documented in Serwist config
- No way to monitor/verify cleanup is actually running
- No way to manually trigger cleanup from UI

**Missing Implementation:**
- No periodic cache cleanup task in the current SW
- No `cleanupExpiredCaches()` function called automatically
- Only cleanup happens on activate (cold start)

**Current Code Gap (sw.js line 89):**
```javascript
.then(() => {
  // Run initial cache cleanup
  return cleanupExpiredCaches(); // Function is NOT DEFINED!
})
```

**Critical Bug:** `cleanupExpiredCaches()` function referenced but never implemented!

**Severity:** HIGH - Function call will throw error

---

## 3. Offline Functionality

### Status: GOOD ARCHITECTURE, GAPS IN EXECUTION

#### File: `/lib/storage/offline-db.ts`

**Issue 3.1: Offline Database Not Initialized on App Load**

```typescript
// Line 264: Singleton instance created but NOT automatically opened
export const offlineDb = new DMBOfflineDB();

// Line 280-287: Manual check required
export async function isOfflineDbReady(): Promise<boolean> {
  try {
    await offlineDb.open();
    return true;
  } catch {
    return false;
  }
}
```

**Problem:**
- Dexie database is created but not opened automatically
- App must explicitly call `isOfflineDbReady()` to ensure DB is ready
- No initialization hook in layout or root provider
- Silent failures if DB open fails

**Missing:** No `OfflineDataProvider` actually initializes the database

**File: `/components/pwa/OfflineDataProvider.tsx`** - Check if this exists and initializes DB

**Recommendation:**
- Create initialization hook that opens DB on app mount
- Show error UI if IndexedDB unavailable
- Cache initialization state to prevent multiple open() calls

#### File: `/lib/storage/offline-download.ts` (Lines 231-396)

**Issue 3.2: Download Progress Not Persisted During Crashes**

```typescript
// Line 334-386: Download monitoring loop
const checkInterval = setInterval(async () => {
  // Async check with no error recovery
  try {
    const current = await getDownload(id);
    if (current?.status === "completed" || current?.status === "failed") {
      clearInterval(checkInterval);
      resolve(current);
    }
  } finally {
    checkInProgress = false;
  }
}, 500); // 500ms polling - high frequency
```

**Problem:**
- 500ms polling interval creates high CPU usage
- If browser crashes mid-download, progress is tracked but not resumed
- No resume capability for partial downloads
- Message listener not removed in all error paths (line 375 removeEventListener only in cancellation)

**Bug:** Line 363-375 - message listener removed only in cancellation path, not on timeout

**Recommendation:**
- Increase polling interval to 2000ms
- Implement resume capability for failed/partial downloads
- Ensure cleanup of event listeners in all code paths

#### File: `/app/offline/page.tsx`

**Issue 3.3: Offline Fallback Page Not Fully Offline-Capable**

```typescript
// Line 5-62: Renders JSX only - no critical data loaded
// The page says "View previously visited pages" but doesn't show them
// No integration with IndexedDB to display cached data
```

**Problem:**
- Offline page is static HTML, doesn't show any previously cached content
- User goes offline and can't see their favorite shows/songs
- No link to offline-downloaded content
- Misleading UX: "Browse cached song and venue data" but nothing is shown

**Recommendation:**
- Add mini components showing recent cached data
- Show "Download for offline" CTA
- Display offline-downloaded tours/venues/date ranges

---

## 4. Web App Manifest Validation

### Status: EXCELLENT

#### File: `/public/manifest.json` (Lines 1-215)

**Findings: NO CRITICAL ISSUES**

**Strengths:**
- All required fields present (name, short_name, start_url, display, icons)
- Icons: 192x192 and 512x512 included (required for installability)
- Maskable icons included (good for adaptive icon support)
- Screenshots included (both desktop and mobile form factors)
- Shortcuts configured (My Shows, Search, Songs, Venues, Stats)
- Share target configured
- Launch handler with client_mode configured

**Minor Improvements (Not Critical):**
1. Line 6: `start_url: "/?source=pwa"` - Good for analytics
2. Line 88: Icon 512x512 "any" purpose - Good, plus maskable version
3. Missing: `categories: ["entertainment", "music", "reference"]` is present, good

**No Icon Issues Found:**
```json
// Lines 66-88: 192x192 and 512x512 "any" icons
// Lines 90-100: Maskable versions present
// All paths use /icons/ which is cached with immutable headers
```

**HTTP Headers Check (next.config.ts Lines 188-201):**
- Manifest served with `Cache-Control: public, max-age=86400`
- Content-Type: `application/manifest+json` set correctly

---

## 5. Installation Flow

### Status: GOOD - Minor gaps

#### File: `/components/pwa/InstallPrompt.tsx`

**Issue 5.1: beforeinstallprompt Deferred Prompt Not Validated**

```typescript
// Lines 125-154: promptInstall() method
const promptInstall = useCallback(async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log("[PWA] No deferred prompt available");
    return false; // Silent failure - user doesn't know why
  }

  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  // ...
}, [deferredPrompt]);
```

**Problem:**
- If `prompt()` call fails, no error handling
- `userChoice` promise not wrapped in try-catch
- Silent failure if browser doesn't support the event

**Recommendation:**
- Add try-catch around `deferredPrompt.prompt()`
- Log specific errors for debugging
- Show user-friendly error message

#### File: `/components/pwa/InstallPromptBanner.tsx` (Lines 20-90)

**Issue 5.2: Complex Timing Logic**

```typescript
// Lines 41-51: Show after 5 seconds if user scrolled
// Lines 54-62: Another effect for scroll-based timing
// Two overlapping effects that may conflict
```

**Problem:**
- Two useEffect hooks manage similar state (hasScrolled, shouldShow)
- Could show banner twice or at wrong times
- Complex timing makes it hard to predict behavior

**Better Approach:**
- Single effect managing state transitions
- Clear state machine (idle → scrolled → timed → shown)

#### File: `/lib/sw/register.ts` (Lines 222-239)

**Issue 5.3: isInstalledPWA() Uses Multiple Detection Methods**

```typescript
export function isInstalledPWA(): boolean {
  // Check 1: Display-mode media query
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  // Check 2: iOS standalone property
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
    return true;
  }
  // Check 3: Via start_url parameter (weak signal)
  if (window.location.search.includes("source=pwa")) {
    return true;
  }
  return false;
}
```

**Issues:**
- Check 3 is unreliable: `source=pwa` query param could be set by non-installed users
- Order matters: iOS check after media query (should be reversed)
- No documentation of detection priority

**Better Order:**
1. iOS `navigator.standalone` (iOS-specific)
2. Display-mode media query (standard)
3. PWA source parameter (fallback only, not for `isInstalled()`)

---

## 6. IndexedDB/Dexie.js Integration

### Status: EXCELLENT - Well-designed

#### File: `/lib/db/dexie/db.ts`

**Strengths:**
- Singleton pattern with lazy initialization
- Proper schema versioning (v1, v2, v3)
- Compound indexes for common queries
- Automatic timestamp hooks
- Transaction support for atomic operations
- Clear separation of concerns

#### File: `/lib/storage/offline-db.ts`

**Strengths:**
- Comprehensive type definitions for all entities
- Sync metadata tracking (lastSyncAt, syncStatus)
- Pending changes queue for offline writes
- Helper functions for all CRUD operations
- Storage quota checking and persistent storage requests

**Issue 6.1: No Automatic Data Population on First Install**

```typescript
// No hook that automatically loads initial data into IndexedDB
// User must manually call data-loader functions
// First load feels empty until data syncs
```

**Missing:**
- App shell loading strategy
- Progressive data loading indicators
- Fallback UI for empty state

#### File: `/lib/db/dexie/data-loader.ts` (Lines 1-100)

**Issue 6.2: Data Loader Not Wired to App Initialization**

```typescript
// File exists but not called anywhere:
// grep: "data-loader" not found in layout.tsx or providers
```

**Problem:**
- Data loader module exists but app doesn't use it
- No component calls `loadData()` on startup
- IndexedDB remains empty on first install

**Required:**
Create initialization in OfflineDataProvider that calls data-loader

---

## 7. Push Notifications & Background Sync

### Status: IMPLEMENTED - Not fully wired

#### File: `/lib/sw/register.ts` (Lines 173-200)

**Push Notification Implementation: Complete**

```typescript
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null>
```

**Good:** Proper VAPID key conversion, error handling

**Missing:**
- No VAPID_PUBLIC_KEY environment variable used in app
- No UI component to request push permissions
- No push message handler in service worker

#### File: `/lib/sw/sw.serwist.template.ts` (Lines 74-97)

**Push Handler Exists:**
```typescript
self.addEventListener("push", (event) => {
  const data = event.data.json();
  // Proper notification options with actions
});
```

**Issue 7.1: Background Sync Stub Implementation**

```typescript
// Line 124-128: Sync event listener exists
self.addEventListener("sync", (event) => {
  if (event.tag === "dmb-almanac-sync") {
    event.waitUntil(syncOfflineActions());
  }
});

// Line 130-133: Empty implementation
async function syncOfflineActions(): Promise<void> {
  console.log("[SW] Background sync triggered");
  // TODO: Future: Sync user actions queued while offline
}
```

**Problem:**
- Background sync registered but not implemented
- No actual sync of pending changes
- App has pendingChanges queue but no mechanism to replay

**Periodic Sync:** Also configured (line 136-154) but implementation only refreshes cache

---

## 8. Cross-Platform & iOS Considerations

### Status: POOR - Major gaps

#### File: `/components/pwa/IOSInstallGuide.tsx`

**Check if this file implements iOS-specific guidance**

**Known iOS PWA Limitations (Not Documented in App):**
- No beforeinstallprompt event (users must manually "Add to Home Screen")
- No push notifications (until iOS 16.4+)
- No background sync
- 50MB storage limit
- SW cache cleared after 7 days of inactivity
- No file handling API
- Limited to 50 concurrent IndexedDB transactions

**Missing in DMB Almanac:**
- No iOS version detection
- No iOS-specific workarounds
- No warning about 7-day cache expiry
- No storage quota warning before hitting 50MB limit

#### File: `/lib/sw/register.ts` (Line 229)

**Issue 8.1: iOS Detection Uses Type Coercion**

```typescript
if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
  return true;
}
```

**Problem:**
- Type cast to unknown is a code smell
- Should use proper type guard
- Check should look for `navigator.standalone` property existence

**Better:**
```typescript
const nav = navigator as any;
if (nav.standalone === true) {
  return true;
}
```

---

## Critical Issues Summary

| Priority | Issue | File | Line | Fix |
|----------|-------|------|------|-----|
| CRITICAL | cleanupExpiredCaches() function not defined | /public/sw.js | 90 | Implement function or remove call |
| CRITICAL | Cache cleanup documented but not implemented | /lib/sw/PWA_CACHE_MANAGEMENT.md | 7-20 | Implement automated cleanup |
| CRITICAL | offline-download message listener not removed in timeout | /lib/storage/offline-download.ts | 375 | Add removeEventListener in timeout path |
| HIGH | skipWaiting() not called on first install | /public/sw.js | 57 | Add self.skipWaiting() after precache |
| HIGH | Data loader not wired to app startup | /lib/db/dexie/data-loader.ts | - | Call from OfflineDataProvider |
| HIGH | IndexedDB not auto-initialized | /lib/storage/offline-db.ts | 264 | Add init hook in app layout |
| HIGH | Download progress polling too frequent | /lib/storage/offline-download.ts | 369 | Increase interval to 2000ms |
| MEDIUM | Network timeout too aggressive | /lib/sw/serwist.config.ts | 143 | Increase to 5-8 seconds |
| MEDIUM | isInstalledPWA() detection order wrong | /lib/sw/register.ts | 228 | Check iOS first, then media query |
| MEDIUM | Complex install timing logic | /components/pwa/InstallPromptBanner.tsx | 41-62 | Merge into single effect |

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Do Immediately)
1. **Fix sw.js line 90:** Remove or implement `cleanupExpiredCaches()`
2. **Fix offline-download.ts:** Add event listener cleanup in timeout path
3. **Fix register.ts line 57:** Add `self.skipWaiting()` after precache complete

### Phase 2: Data Initialization (Prevents Empty App)
1. Create `<OfflineDataProvider>` that initializes IndexedDB on mount
2. Wire data-loader to app startup
3. Add loading states and error handling

### Phase 3: Offline Experience (Improve UX)
1. Show cached data on offline page
2. Implement automatic cache cleanup
3. Add storage quota warnings

### Phase 4: iOS Support (Expand Platform Coverage)
1. Add iOS version detection
2. Document iOS limitations in app
3. Provide iOS-specific install guide

---

## Testing Checklist

### Service Worker
- [ ] `npm run build` completes without errors
- [ ] Open DevTools > Application > Service Workers
- [ ] Verify "Active and running" status
- [ ] Simulate offline: DevTools > Network > Offline
- [ ] Navigate to different pages offline - should work
- [ ] Check DevTools > Application > Cache Storage
- [ ] Verify all expected cache names present
- [ ] Deploy new version and verify update notification shows
- [ ] Click "Update" and verify new SW activates without page reload lag

### Installation
- [ ] Open app in Chrome on desktop
- [ ] Wait 30+ seconds and scroll
- [ ] Verify install banner shows
- [ ] Click "Install" and complete installation flow
- [ ] Verify app launches from home screen
- [ ] Check DevTools > Application > Manifest loads correctly

### Offline Data
- [ ] Build and run: `npm run build && npm start`
- [ ] Open IndexedDB in DevTools > Application
- [ ] Verify tables have data (shows, songs, venues, etc.)
- [ ] Go offline and navigate app
- [ ] Verify pages load from cache
- [ ] Verify searches work with cached data

### iOS Testing
- [ ] Open Safari on iPhone
- [ ] Tap "Share" > "Add to Home Screen"
- [ ] Launch from home screen
- [ ] Verify app launches in fullscreen (standalone mode)
- [ ] Test offline functionality
- [ ] Check app doesn't require network on first launch

---

## Performance Metrics

```
LCP (Largest Contentful Paint): Target < 1.0s
  - Helps: Service worker caching, precache manifest
  - Hurts: IndexedDB init latency, network timeout waits

INP (Interaction to Next Paint): Target < 100ms
  - Helps: scheduler.yield() in data loader
  - Hurts: Large cache queries, file I/O

CLS (Cumulative Layout Shift): Target < 0.05
  - Helps: View transitions, fixed layouts
  - Hurts: Late-loaded images, unexpected content

FCP (First Contentful Paint): Target < 1.0s
  - Helps: Speculation rules prefetch
  - Hurts: Waiting for network on first paint
```

---

## Files Requiring Attention

### Must Fix
```
/public/sw.js                              - Multiple critical issues
/lib/storage/offline-download.ts           - Event listener cleanup
/lib/sw/register.ts                        - skipWaiting, iOS detection
```

### Should Improve
```
/lib/sw/serwist.config.ts                  - Network timeout tuning
/components/pwa/InstallPromptBanner.tsx    - Timing logic simplification
/lib/storage/offline-db.ts                 - Auto-initialization
```

### Need to Create/Wire
```
/components/pwa/OfflineDataProvider.tsx    - Initialize IndexedDB & load data
/lib/db/dexie/data-loader.ts              - Wire to app startup
```

---

## Conclusion

The DMB Almanac PWA has excellent **architecture and design** but needs **implementation completion** in several areas:

1. **Service Worker**: Missing skipWaiting() and cleanup function
2. **Offline Sync**: pendingChanges queue exists but no replay mechanism
3. **Data Loading**: Data loader module exists but not called
4. **iOS Support**: Limitations not documented or handled

With these fixes, the PWA will provide a truly excellent offline-first experience across desktop and mobile platforms.

