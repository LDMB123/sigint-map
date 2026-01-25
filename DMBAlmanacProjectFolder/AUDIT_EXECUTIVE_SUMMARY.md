# PWA Audit - Executive Summary
## DMB Almanac Svelte - Quick Reference

### Overall Score: 8.5/10

---

## Critical Findings (Must Fix)

### 1. In-Flight Request Deduplication Has Memory Leak
**File:** `static/sw.js` (lines 60-350)
- Global Map never bounded
- No timeout cleanup
- Promises can hang forever
- **Fix:** Add timeout-based cleanup + max size limit + restrict to GET requests

### 2. Service Worker Lifecycle Cleanup Not Called
**File:** `src/routes/+layout.svelte` (lines 26-65)
- `pwaStore.initialize()` returns cleanup function but it's never invoked
- Event listeners accumulate on hot reload
- Memory leak in development
- **Fix:** Call cleanup function in component's cleanup callback

### 3. Background Sync Registered in SW But Never Triggered
**File:** `static/sw.js` (line 665)
- Event listener exists for 'sync' event
- **Missing:** Client-side `registration.sync.register('sync-queue')` call
- Offline mutations won't auto-sync
- **Fix:** Add registration call in `pwaStore.initialize()`

### 4. Periodic Sync Same Issue
**File:** `static/sw.js` (line 676)
- **Missing:** Client-side `periodicSync.register('check-data-freshness')` call
- Data freshness checks won't run
- **Fix:** Add registration with permission check

---

## High Priority Issues (This Week)

### 5. Cache Expiration Using Non-Standard Headers
**File:** `static/sw.js` (lines 284-296)
- Uses custom `X-Cache-Time` header for expiration tracking
- Should use IndexedDB metadata (like Workbox)
- Fallback to epoch timestamp (0) means always-expired assumption
- **Fix:** Implement IndexedDB-based expiration tracking

### 6. No Navigation Preload
**File:** `static/sw.js`
- Missing opportunity for ~200-400ms speedup
- Should enable in install event
- **Fix:** Add `navigationPreload.enable()` and handle in fetch

### 7. StaleWhileRevalidate Not Notifying Clients of Updates
**File:** `static/sw.js` (lines 358-402)
- Images update in background but user never sees new version
- Unless they hard refresh
- **Fix:** Add BroadcastUpdatePlugin pattern (compare ETags, notify clients)

### 8. Update Detection Overly Complex
**File:** `src/lib/sw/register.ts`
- Three different update check mechanisms (redundant)
- `checkForCriticalUpdates()` parses SW file text (fragile)
- **Fix:** Consolidate to updatefound + periodic polling via API

---

## Medium Priority (This Month)

### 9. Cache Naming Strategy Too Granular
**File:** `static/sw.js` (lines 20-30)
- All 9 caches versioned with build timestamp
- Every new build creates new cache hierarchy
- Zero cache reuse
- **Fix:** Only version volatile caches (shell, pages, api), use content hash for static assets

### 10. Cache Cleanup Performance
**File:** `static/sw.js` (lines 575-605)
- Runs during activate event (blocking)
- Iterates all cache entries synchronously
- 500 API entries = 500ms blocking activate
- **Fix:** Defer cleanup, use lazy deletion on fetch

### 11. Update UX Could Improve
**File:** `src/lib/stores/pwa.ts` (line 128)
- Auto-reloads immediately when SW activates
- User might lose form data
- **Fix:** Reload after user navigates or explicit confirmation

---

## Quick Wins (Low Effort)

- Add message handlers: `CACHE_URL`, `DELETE_CACHE_ENTRY`
- Enable offline page link prefetching: `rel="prefetch-intent"`
- Guard request dedup with method check (only GET/HEAD)
- Add CacheableResponsePlugin-like status checks

---

## Implementation Roadmap

### Week 1 (Critical)
1. [ ] Fix in-flight dedup memory leak
2. [ ] Add lifecycle cleanup call
3. [ ] Register background sync on client
4. [ ] Register periodic sync on client

### Week 2 (High Priority)
1. [ ] Implement IndexedDB expiration
2. [ ] Enable navigation preload
3. [ ] Add update notifications for images
4. [ ] Consolidate update checks

### Week 3 (Polish)
1. [ ] Optimize cache naming
2. [ ] Move cleanup to background
3. [ ] Improve update UX
4. [ ] Add message handlers

---

## Code Locations Reference

| Finding | File | Lines |
|---------|------|-------|
| Memory leak | `static/sw.js` | 60, 265-350 |
| Lifecycle | `src/routes/+layout.svelte` | 26-65 |
| Background Sync | `static/sw.js` | 665-793 |
| Periodic Sync | `static/sw.js` | 676-712 |
| Expiration | `static/sw.js` | 284-296, 331-345 |
| Navigation Preload | `static/sw.js` | (missing) |
| StaleWhileRevalidate | `static/sw.js` | 358-402 |
| Update Flow | `src/lib/stores/pwa.ts` | 104-132 |
| Cache Config | `static/sw.js` | 20-30 |
| Cleanup | `static/sw.js` | 575-605 |

---

## Testing Commands

```bash
# Verify build timestamp injection
npm run build && grep "const CACHE_VERSION" build/client/sw.js

# Test offline mode
npm run preview
# Then: DevTools > Network > Offline > Navigate

# Check cache size
# DevTools > Application > Cache Storage

# Monitor in-flight requests
# DevTools > Console > filter [SW]
# Look for deduplication logs
```

---

## Positive Notes

✓ Well-structured caching hierarchy
✓ Proper update UX with skip-waiting
✓ Comprehensive offline page
✓ Background sync skeleton ready
✓ Correct `updateViaCache: 'none'`
✓ Manifest properly configured
✓ Push notification skeleton complete

---

For detailed analysis, see: `PWA_SERVICE_WORKER_AUDIT.md`
