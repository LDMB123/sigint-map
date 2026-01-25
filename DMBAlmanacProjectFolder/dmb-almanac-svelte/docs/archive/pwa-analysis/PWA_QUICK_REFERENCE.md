# PWA Offline Support - Quick Reference
## DMB Almanac v2

---

## Current Status Dashboard

### What Works Offline ✅
- Page navigation (precached routes)
- Static assets (CSS, JS, fonts)
- Offline placeholder page
- Favorite adding/removing (queued for sync)
- Viewing previously visited pages (if cached)

### What Doesn't Work Offline ❌
- Full-text search (Meilisearch)
- Browsing shows/songs/venues
- Filtering by year, venue, play count
- Show detail pages with setlists
- Viewing new data since last online

---

## 5 Priority Improvements

### 1. Offline Search Fallback 🔴 CRITICAL
**File:** `/apps/web/src/lib/search/offline.ts` (NEW)
**Time:** 2 hours
**Impact:** High - Users can search offline

**Implementation:**
```typescript
// Search IndexedDB when Meilisearch unavailable
await searchOffline('Pink Floyd')  // Returns cached results
```

### 2. Enhanced Caching Strategies 🔴 CRITICAL
**File:** `/apps/web/src/sw.ts` (MODIFY lines 43-173)
**Time:** 3 hours
**Impact:** High - Better offline availability

**Changes:**
- Songs: Cache-first (7 days) instead of Network-first
- Shows: Network-first with 3s timeout (12hr cache)
- Setlists: Cache-first forever
- Search: Network-only (no cache)

### 3. Database Seeding 🔴 CRITICAL
**File:** `/apps/web/src/lib/db/seeding.ts` (NEW)
**Time:** 2 hours
**Impact:** High - Users get offline data on install

**Implementation:**
```typescript
// On app load:
await seedOfflineDatabase()
// Downloads 500 songs, 500 shows, 100 venues to IndexedDB
```

### 4. Offline Fallback for Filtering 🟡 IMPORTANT
**File:** `/apps/web/src/lib/db/filtering.ts` (NEW)
**Time:** 3 hours
**Impact:** Medium - Users can filter offline

**Example:**
```typescript
// Filter shows by year using IndexedDB
await filterShowsOffline({ year: 2000 })
```

### 5. API Wrapper with Offline 🟡 IMPORTANT
**File:** `/apps/web/src/lib/api/withOfflineFallback.ts` (NEW)
**Time:** 4 hours
**Impact:** Medium - Automatic fallback handling

**Usage:**
```typescript
const data = await fetchWithOffline(
  '/api/shows',
  { timeoutSeconds: 3 },
  () => queryShowsOffline()  // Fallback
)
```

---

## Time Estimates

```
Phase 1 (Week 1):          10-15 hours
├─ Offline search          2 hours
├─ Enhanced caching        3 hours
├─ Database seeding        2 hours
├─ Data status UI          2 hours
└─ Testing & QA            2-3 hours

Phase 2 (Week 2-3):        12-18 hours
├─ API wrapper             4 hours
├─ Offline filtering       3 hours
├─ Setlist browsing        3 hours
├─ Show notes (optional)   2 hours
└─ Testing & deployment    2-4 hours

Phase 3 (Week 4+):         Optional enhancements
└─ Playback history sync
└─ Export/sharing features
```

---

## Critical Files Overview

### Service Worker
**File:** `/apps/web/src/sw.ts`
- 355 lines of Workbox routing
- Currently: 1 hour cache for all APIs
- **Need:** Differentiated TTLs per resource type

### Database Client
**File:** `/packages/database/src/client/index.ts`
- Dexie.js schema defined
- 7 tables (songs, shows, venues, tours, setlists, guests, favorites)
- **Status:** Schema ready, data empty, indexes OK

### API Client
**File:** `/apps/web/src/lib/api/client.ts`
- Generic `apiFetch()` wrapper (basic)
- No offline fallback
- **Need:** Enhanced with offline detection & fallback

### Search
**File:** `/apps/web/src/components/features/SearchCommand.tsx`
- Direct Meilisearch API call
- No error handling for offline
- **Need:** Fallback to IndexedDB search

---

## File Structure for Implementation

```
/apps/web/src/
├── lib/
│   ├── db/
│   │   ├── client.ts                  (existing)
│   │   ├── seeding.ts                 (NEW)
│   │   ├── filtering.ts               (NEW)
│   │   ├── quota.ts                   (NEW)
│   │   └── index.ts
│   ├── search/
│   │   └── offline.ts                 (NEW)
│   ├── api/
│   │   ├── client.ts                  (existing)
│   │   └── withOfflineFallback.ts     (NEW)
│   └── hooks/
│       ├── useOfflineData.ts          (NEW)
│       └── useSyncStatus.ts           (NEW)
├── components/
│   ├── DataStatus.tsx                 (NEW)
│   └── features/
│       └── SearchCommand.tsx          (modify)
├── sw.ts                              (modify)
└── app/
    ├── layout.tsx                     (modify - add seeding)
    └── offline/
        └── page.tsx                   (existing, can enhance)
```

---

## Resource Type Caching Matrix

```
CACHE-FIRST (Fast, use cached if available):
├─ /api/songs               → 7 days TTL
├─ /api/venues              → 30 days TTL
├─ /api/tours               → 1 year TTL
├─ /api/guests              → 30 days TTL
├─ /api/shows/{id}          → 1 year TTL (show detail static)
├─ /api/shows/{id}/setlist  → Forever (never changes)
├─ Images                   → 30 days TTL
└─ Fonts                    → 1 year TTL

NETWORK-FIRST (Fresh, but fallback to cache):
├─ /api/shows               → 3s timeout, 12hr cache
├─ /api/liberation          → 10s timeout, 12hr cache
├─ /api/favorites           → 5s timeout, 24hr cache
└─ Navigation pages         → 5s timeout

NETWORK-ONLY (Never cache):
├─ /api/search              → Meilisearch (use IndexedDB offline)
└─ Analytics                → Always send live
```

---

## Database Sync Strategy

### Initial Sync (on PWA install)
```
1. Service Worker installs
2. App loads → detectsEmpty IndexedDB
3. Triggers seedOfflineDatabase()
   - Fetches /api/songs?limit=500
   - Fetches /api/shows?limit=500
   - Fetches /api/venues?limit=100
   - Fetches /api/guests?limit=100
4. Stores in IndexedDB (~800KB data)
5. Marks sync timestamp
6. On next app load → skips seeding
```

### Periodic Sync
```
Service Worker checks every 24 hours:
- Updated songs list (play counts may change)
- New shows added
- Liberation list (every 12 hours)
- Recent show setlists (first 50)
```

### On-Demand Sync
```
When user clicks a show detail not in cache:
1. Attempt to fetch /api/shows/{id}
2. If offline → show "Load offline cache" button
3. If online but slow → queue for background sync
4. Background sync fetches and caches setlist
```

---

## IndexedDB Schema v2

```typescript
songs: {
  keyPath: 'id',
  indexes: [
    'slug',
    'title',
    'timesPlayed',
    'lastPlayed'
  ]
}

shows: {
  keyPath: 'id',
  indexes: [
    'showDate',
    'venueId',
    '[showDate+venueId]'  // NEW: Compound for venue+date
  ]
}

venues: {
  keyPath: 'id',
  indexes: [
    'slug',
    'name',
    'state',
    '[state+city]'  // NEW: Compound for location
  ]
}

tours: {
  keyPath: 'id',
  indexes: ['slug', 'year']
}

setlists: {
  keyPath: 'showId',
  indexes: ['[showId+syncedAt]']  // NEW: Track sync time
}

guests: {
  keyPath: 'id',
  indexes: ['slug', 'name', 'totalAppearances']
}

favorites: {
  keyPath: '++id',
  indexes: [
    '[type+itemId]',  // Composite key for uniqueness
    'synced'           // Filter unsynced for background sync
  ]
}

notes: {  // NEW: User show notes
  keyPath: '++id',
  indexes: [
    'showId',
    'userId',
    '[userId+showId]',  // Composite
    'synced'
  ]
}
```

---

## Migration Path

### Week 1
```
Deploy enhanced SW caching (backward compatible)
↓
Deploy database seeding (first-run setup)
↓
Monitor: Check if IndexedDB populating
```

### Week 2
```
Deploy offline search fallback
↓
Update SearchCommand component
↓
Monitor: Track search success rate
```

### Week 3
```
Deploy API wrapper with fallback
↓
Gradually roll out (10% → 50% → 100%)
↓
Monitor: Track cache hit rates
```

### Week 4+
```
Deploy advanced features (notes, playback)
↓
Enhance UI with data status indicators
↓
Gather user feedback
```

---

## Testing Essentials

### Offline Mode Testing
```bash
# Chrome DevTools
1. F12 → Network tab
2. Check "Offline" checkbox
3. Verify app still works with cached data

# Programmatic
navigator.onLine = false
window.dispatchEvent(new Event('offline'))
```

### Cache Inspection
```javascript
// List all caches
caches.keys().then(names => console.log(names))

// Check specific cache
caches.open('api-cache').then(cache =>
  cache.keys().then(reqs => console.log(reqs))
)

// Check IndexedDB
const db = new Dexie('dmbalmanac')
db.open().then(() => db.shows.count()).then(count =>
  console.log(`${count} shows cached`)
)
```

### Network Conditions
```bash
# Simulate slow network
Chrome DevTools → Network → Throttling: "Slow 3G"

# Simulate offline
Chrome DevTools → Network → Offline

# Simulate high latency
Chrome DevTools → Network → 2000ms latency

# Check Service Worker status
chrome://inspect/#service-workers
```

---

## Key Metrics to Monitor

### Performance
- Cache hit rate: Target >70%
- Offline search time: Target <50ms
- IndexedDB query time: Target <100ms

### Functionality
- % of features available offline: Target >50%
- Search accuracy (offline vs online): Should match
- Sync success rate: Target >95%

### Usage
- Offline mode activations per day
- Average offline session duration
- Most used offline features

### Storage
- IndexedDB size growth
- Cache storage usage
- Storage quota remaining %

---

## Common Issues & Solutions

### Issue: Search returns no results offline
**Cause:** IndexedDB is empty
**Fix:** Run `seedOfflineDatabase()` or clear cache and reload

### Issue: Old data showing offline
**Cause:** Cache has stale data
**Fix:** Implement smart cache versioning in SW

### Issue: Storage quota exceeded
**Cause:** Caching too much data
**Fix:** Implement eviction strategy, remove old setlists

### Issue: Favorite not syncing
**Cause:** Background sync not triggered
**Fix:** Check if background sync registered and browser supports

### Issue: Setlist shows as unavailable offline
**Cause:** Not cached yet
**Fix:** Extend seeding to include top 500 show setlists

---

## Command Reference

### Build & Test
```bash
# Build service worker
cd apps/web
pnpm build:sw

# Verify output
ls -lh public/sw.js

# Start production server
pnpm build && pnpm start

# Test offline
# Open DevTools → Network → Offline
```

### Database Operations
```bash
# Check seeding status
IndexedDB → dmbalmanac → songs (should have count)

# Clear for testing
IndexedDB → dmbalmanac → right-click tables → Clear

# Monitor size
navigator.storage.estimate().then(console.log)
```

### Service Worker Debug
```bash
# View SW status
navigator.serviceWorker.controller

# Unregister all
navigator.serviceWorker.getRegistrations().then(rs =>
  rs.forEach(r => r.unregister())
)

# Check cache
caches.keys().then(names => console.log(names))
```

---

## Success Criteria

### MVP (Minimum Viable Product)
```
✓ Users can browse 500+ shows offline
✓ Users can browse 400+ songs offline
✓ Search works with offline fallback
✓ Show filtering works offline (by year, venue)
✓ Favorites sync when back online
```

### Optimized
```
✓ + Setlist viewing for cached shows
✓ + Show notes with background sync
✓ + Smart data freshness indicators
✓ + Playback history tracking
✓ + Export/sharing features
```

### Production-Ready
```
✓ + >70% cache hit rate
✓ + <50ms offline search time
✓ + <25% storage quota usage
✓ + Zero sync failures
✓ + Analytics on offline usage
✓ + User education in UI
```

---

## Next Steps

1. **Today:** Review this analysis with team
2. **Tomorrow:** Start Phase 1 (offline search + caching)
3. **End of Week 1:** Deploy database seeding
4. **Week 2:** Deploy offline fallback improvements
5. **Week 3:** Monitor metrics and gather feedback
6. **Week 4+:** Phase 2 advanced features

---

## Contact & Resources

**PWA Spec:** https://w3c.github.io/webapps/specs/service-worker/
**Workbox Docs:** https://developers.google.com/web/tools/workbox
**IndexedDB Tutorial:** https://mdn.dev/en-US/docs/Web/API/IndexedDB_API
**Offline Cookbook:** https://jakearchibald.com/2014/offline-cookbook/

---

Generated: January 16, 2026
Project: DMB Almanac v2.0
Framework: Next.js 15 + React 19 + Workbox 7
Database: PostgreSQL + Dexie.js (IndexedDB)

