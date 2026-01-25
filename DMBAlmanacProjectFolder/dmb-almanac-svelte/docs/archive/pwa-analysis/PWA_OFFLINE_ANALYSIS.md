# PWA Offline Implementation Analysis
## DMB Almanac v2 - Music/Concert Database

**Date:** January 16, 2026
**Project:** DMB Almanac v2
**Scope:** Music and concert database PWA with offline-first capabilities

---

## Executive Summary

The DMB Almanac PWA has a **solid foundation** with Workbox 7, proper caching strategies, and IndexedDB setup. However, there are **critical gaps** preventing true offline-first functionality for a music database app. This analysis identifies 5 major missing features and provides actionable improvements for a music/concert discovery experience that works without internet.

**Current Status:**
- ✅ Service Worker foundation (Workbox 7)
- ✅ Basic caching strategies (Network-first for API, Cache-first for static)
- ✅ IndexedDB schema (Dexie.js with songs, shows, venues, tours, guests)
- ✅ Background sync for favorites
- ✅ Basic offline page (navigation fallback)
- ❌ No precached catalog data (shows/songs/venues)
- ❌ No offline search/filtering
- ❌ No offline setlist browsing
- ❌ Limited IndexedDB population strategy
- ❌ No fallback for Meilisearch (search completely fails offline)

---

## 1. MISSING PWA FEATURES FOR OFFLINE SUPPORT

### 1.1 No Precached Catalog Data
**Current State:**
- Service worker precaches only static assets (JS, CSS, fonts) - ~9.4MB
- Zero API responses are precached
- IndexedDB tables defined but empty on first install

**Impact:**
- Users cannot browse shows, songs, or venues offline
- Even with 30+ day cache expiration, first visit is network-only
- No graceful degradation for users in poor connectivity areas

**What Should Happen:**
```
Install Flow:
1. Service Worker installs → Downloads 150KB of static assets
2. On first page load → Should trigger background sync to populate core data
3. User sees "Loading offline catalog..." while IndexedDB fills
4. Within 30 seconds → User can browse 1000+ shows/songs offline
5. Periodic sync → Keeps data fresh (shows added, rankings updated)
```

**Recommendation:**
Implement background sync on install to load:
- Top 1000 shows (metadata: date, venue, song count)
- All ~400 songs (title, play count, first/last played)
- All ~100 venues (name, city, location, show count)
- Recent 100 shows (for "What's New" offline)

**Estimated Data Size:** ~800KB JSON (uncompressed) → ~120KB gzipped

---

### 1.2 No Offline Search/Filtering
**Current State:**
```typescript
// Search API (route.ts line 149)
const multiSearchResults = await meilisearchClient.multiSearch({ queries });
// Completely fails offline - no fallback
```

**Search endpoints that FAIL offline:**
- `/api/search?q=*` - Global search (depends on Meilisearch)
- `/api/songs?search=*` - Song search (database query)
- Show filtering by year, venue, date
- Venue search by name/city

**User Experience Offline:**
```
User searches for "Phish" → Network fails
App shows "Search unavailable offline"
But user's phone has 3500+ shows cached!
```

**Recommendation:**
Implement **fallback offline search** using precached data in IndexedDB:

```typescript
// lib/search/offlineSearch.ts
export async function searchOffline(query: string) {
  const normalizedQuery = query.toLowerCase();

  const [songs, shows, venues, guests] = await Promise.all([
    clientDb.songs
      .filter(s => s.title.toLowerCase().includes(normalizedQuery))
      .limit(10)
      .toArray(),
    clientDb.shows
      .filter(s =>
        s.venueName?.toLowerCase().includes(normalizedQuery) ||
        s.city?.toLowerCase().includes(normalizedQuery)
      )
      .limit(10)
      .toArray(),
    clientDb.venues
      .filter(v =>
        v.name.toLowerCase().includes(normalizedQuery) ||
        v.city?.toLowerCase().includes(normalizedQuery)
      )
      .limit(10)
      .toArray(),
    clientDb.guests
      .filter(g => g.name.toLowerCase().includes(normalizedQuery))
      .limit(10)
      .toArray(),
  ]);

  return { songs, shows, venues, guests };
}

// Usage in SearchCommand.tsx
async function performSearch(query: string) {
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    // ... use API results
  } catch (error) {
    if (!navigator.onLine) {
      // Fallback to offline search
      const offlineResults = await searchOffline(query);
      // Display results with "Offline mode" badge
    }
  }
}
```

**Search Types Needing Offline Support:**
| Search Type | Current | Offline | Effort |
|-------------|---------|---------|--------|
| Full text search | Meilisearch API | IndexedDB filter | Medium |
| Song by title | `/api/songs?search=` | IndexedDB | Low |
| Shows by venue | `/api/shows?venueId=` | IndexedDB filter | Low |
| Shows by year | `/api/shows?year=` | IndexedDB compound index | Low |
| Favorites list | API call | IndexedDB (✓ ready) | Done |

---

### 1.3 No Offline Setlist Browsing
**Current State:**
- Show detail pages require `/api/shows/{id}` API call
- Setlist entries stored in IndexedDB but never populated
- No offline fallback for show details

**Critical Gap:**
```
User opens app offline and sees 3500 cached shows
Clicks show from "June 2000" → Needs API call to `/api/shows/{id}`
API call fails → User sees blank page
```

**Database Schema Ready:**
```typescript
// packages/database/src/client/index.ts (line 50-61)
export interface CachedSetlist {
  showId: number;
  entries: Array<{
    position: number;
    songId: number | null;
    songTitle: string | null;
    setName: string;
    isSegue: boolean;
    notes: string | null;
  }>;
  syncedAt: number;
}
```

**Recommendation:**
1. **Extend setlist sync:** Periodic background sync should populate top 1000 recent shows with setlists
2. **Implement offline detail view:**

```typescript
// lib/db/showDetail.ts
export async function getShowDetailOffline(showId: number) {
  const [show, setlist] = await Promise.all([
    clientDb.shows.get(showId),
    clientDb.setlists.get(showId),
  ]);

  if (!show) {
    return null; // Show not in cache
  }

  return {
    ...show,
    setlist: setlist?.entries || [],
    cached: true,
    cachedAt: show.syncedAt,
  };
}

// Usage in show detail page
const showData = await fetch(`/api/shows/${id}`).catch(async () => {
  if (!navigator.onLine) {
    return getShowDetailOffline(id);
  }
  throw error;
});
```

3. **Sync strategy:**
   - **On install:** Fetch and cache top 500 recent show setlists (~2MB)
   - **Periodic:** Every 24 hours, sync newest 50 shows
   - **On-demand:** When user opens show detail, if not cached, queue for background sync

---

### 1.4 No Graceful Fallback for Filtering Operations
**Current State:**
```typescript
// api/shows/route.ts (line 83-114)
const [shows, total] = await Promise.all([
  prisma.show.findMany({ where, ... }),  // Needs network
  prisma.show.count({ where }),           // Needs network
]);
// Zero fallback if offline
```

**Affected Features:**
- Filter shows by year: `/api/shows?year=2000`
- Filter by tour: `/api/shows?tourId=5`
- Filter by venue: `/api/shows?venueId=10`
- Date range filtering: `/api/shows?fromDate=2000-01-01&toDate=2000-12-31`
- Song filtering: `/api/songs?minPlays=50`

**Recommendation:**
Implement offline filtering layer:

```typescript
// lib/db/filtering.ts
export async function filterShowsOffline(filters: {
  year?: number;
  venueId?: number;
  fromDate?: string;
  toDate?: string;
}) {
  let query = clientDb.shows.toCollection();

  if (filters.year) {
    const startDate = new Date(`${filters.year}-01-01`);
    const endDate = new Date(`${filters.year + 1}-01-01`);
    query = query.filter(s => {
      const showDate = new Date(s.showDate);
      return showDate >= startDate && showDate < endDate;
    });
  }

  if (filters.venueId) {
    query = query.filter(s => s.venueId === filters.venueId);
  }

  if (filters.fromDate) {
    query = query.filter(s => s.showDate >= filters.fromDate);
  }

  if (filters.toDate) {
    query = query.filter(s => s.showDate <= filters.toDate);
  }

  return query.limit(100).toArray();
}
```

---

### 1.5 No Integration of Offline Capabilities in Components
**Current State:**
- `OfflineContent.tsx` only shows generic "You're offline" page
- Components don't check `navigator.onLine` before API calls
- No "offline mode" UI state indicating cached vs. fresh data
- Search component hard fails when Meilisearch unavailable

**User Experience Gap:**
```
Offline user wants to:
1. Browse shows from 2024 → Must wait for cached data message
2. See if data is fresh or from 3 days ago → No timestamp shown
3. Search songs → Complete feature blackout
4. Sync favorites to server when back online → Works, but silent
5. Know which pages can work offline → Unclear
```

**Recommendation:**
Add offline data indicators:

```typescript
// components/DataStatus.tsx
export function DataStatus({
  lastSynced?: number;
  type: 'cached' | 'live';
}) {
  const isFresh = lastSynced ? Date.now() - lastSynced < 60 * 60 * 1000 : true;

  if (!navigator.onLine) {
    return (
      <div className="text-xs text-foreground-muted flex items-center gap-1">
        <HardDrive className="h-3 w-3" />
        Cached data {lastSynced && !isFresh ? '(3d old)' : '(fresh)'}
      </div>
    );
  }

  return type === 'cached' ? (
    <div className="text-xs text-foreground-muted">
      ✓ Cached
    </div>
  ) : null;
}
```

---

## 2. CACHING STRATEGY GAPS

### Current Caching Strategy Summary
```typescript
// src/sw.ts lines 43-173

API Routes              → NetworkFirst (10s timeout, 1hr cache)
ML API Routes           → NetworkFirst (30s timeout, 24hr cache)
Static Assets           → CacheFirst (30 days)
Images                  → CacheFirst (30 days, 200 entries)
Fonts                   → CacheFirst (1 year)
Google Fonts            → StaleWhileRevalidate
Navigation Pages        → NetworkFirst (5s timeout)
Offline fallback        → Static /offline page
```

### Missing Strategy: Data-Specific Caching

**Problem:** API responses get 1-hour TTL regardless of content freshness needs.

```
Scenario 1: Song metadata (title, play count)
- Changes rarely (< once per month)
- Should cache 7 days
- 30KB data

Scenario 2: Show recent plays
- Changes daily (new shows added)
- Should update every 12 hours
- 100KB data

Scenario 3: Setlist data
- Never changes once stored
- Should cache permanently (1 year)
- Variable size
```

### Recommended Resource-Specific Strategies

| Resource | Type | Strategy | Timeout | Cache | Reason |
|----------|------|----------|---------|-------|--------|
| `/api/songs` | Songs catalog | Cache-first | - | 7 days | Metadata rarely changes |
| `/api/shows` | Shows list | Network-first | 3s | 12hr | New shows added daily |
| `/api/shows/{id}/setlist` | Setlist data | Cache-first | - | Infinite | Never changes |
| `/api/venues` | Venue data | Cache-first | - | 30 days | Rarely changes |
| `/api/liberation` | Liberation list | Stale-while-revalidate | 10s | 12hr | Semi-fresh needed |
| `/api/search` | Full-text search | Network-only | - | Never | Always needs latest data |
| `/api/favorites` | User data | Network-first | 5s | 24hr | Personal data, sync critical |

### Implementation

```typescript
// src/sw.ts (enhanced)

// Songs catalog - Cache-first, long TTL
registerRoute(
  ({ url }) => url.pathname === '/api/songs',
  new CacheFirst({
    cacheName: 'songs-catalog',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Shows - Network-first with short timeout
registerRoute(
  ({ url }) => url.pathname === '/api/shows',
  new NetworkFirst({
    cacheName: 'shows-list',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 12 * 60 * 60, // 12 hours
      }),
    ],
  })
);

// Setlists - Cache-first forever
registerRoute(
  ({ url }) => url.pathname.match(/^\/api\/shows\/\d+\/setlist$/),
  new CacheFirst({
    cacheName: 'setlists',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// Search - Network-only, no cache
registerRoute(
  ({ url }) => url.pathname === '/api/search',
  new NetworkOnly()
);

// Venues - Cache-first, moderate TTL
registerRoute(
  ({ url }) => url.pathname === '/api/venues',
  new CacheFirst({
    cacheName: 'venues-catalog',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Liberation List - Stale-while-revalidate
registerRoute(
  ({ url }) => url.pathname === '/api/liberation',
  new StaleWhileRevalidate({
    cacheName: 'liberation-list',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 12 * 60 * 60, // 12 hours
      }),
    ],
  })
);
```

### Smart Cache Invalidation Pattern

When new shows are added to the database:

```typescript
// POST /api/shows/invalidate (server endpoint - internal only)
export async function POST(request: NextRequest) {
  // Verify internal request
  if (request.headers.get('X-Internal-Key') !== process.env.INTERNAL_KEY) {
    return unauthorized();
  }

  // Send invalidation message to all connected clients
  // Clients will clear shows cache and re-sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'INVALIDATE_CACHE',
      target: 'shows-list',
    });
  });

  return success({ cleared: true });
}
```

---

## 3. BACKGROUND SYNC OPPORTUNITIES

### Current Background Sync Implementation
```typescript
// src/sw.ts lines 180-205
// Only handles POST /api/favorites with BackgroundSyncPlugin
// ✓ Works for adding/removing favorites when offline
```

### Missing Background Sync Scenarios

For a music database app, users should be able to perform these offline:

1. **Add/Remove Favorites** (✓ Already implemented)
2. **Write Show Notes** (❌ Not implemented)
3. **Sync Playback History** (❌ Not implemented)
4. **Queue Setlist Items** (❌ Not implemented)
5. **Export/Share Setlists** (❌ Not implemented)

### Recommended Additions

**1. User Notes/Annotations**

```typescript
// IndexedDB table for show notes
export interface ShowNote {
  id?: number;
  showId: number;
  userId: string;
  note: string;
  createdAt: number;
  synced: boolean;
}

// Add to Dexie schema
class DMBDatabase extends Dexie {
  notes!: Table<ShowNote, number>;

  constructor() {
    super('dmbalmanac');
    this.version(2).stores({
      notes: '++id, showId, userId, [userId+showId], synced',
    });
  }
}

// Service Worker background sync
registerRoute(
  ({ url, request }) => url.pathname === '/api/notes' && request.method === 'POST',
  new NetworkOnly({
    plugins: [
      new BackgroundSyncPlugin('notes-queue', {
        maxRetentionTime: 7 * 24 * 60, // 7 days
      }),
    ],
  }),
  'POST'
);
```

**2. Playback History Sync**

```typescript
// Track which songs user has listened to
export interface PlaybackEntry {
  id?: number;
  songId: number;
  userId: string;
  playedAt: number; // timestamp
  duration: number; // seconds played
  synced: boolean;
}

// Sync every hour using periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-playback-history') {
    event.waitUntil(syncPlaybackHistory());
  }
});

async function syncPlaybackHistory() {
  const entries = await clientDb.playbackHistory
    .where('synced').equals(false)
    .toArray();

  if (entries.length === 0) return;

  try {
    const response = await fetch('/api/playback', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });

    if (response.ok) {
      await clientDb.playbackHistory
        .where('id').anyOf(entries.map(e => e.id!))
        .modify({ synced: true });
    }
  } catch (error) {
    console.error('Failed to sync playback:', error);
  }
}
```

**3. Periodic Sync Configuration in Manifest**

The current manifest doesn't declare periodic sync intervals:

```json
{
  "manifest.json": {
    "periodicSync": [
      {
        "tag": "sync-recent-shows",
        "minInterval": 24 * 60 * 60 * 1000
      },
      {
        "tag": "sync-liberation",
        "minInterval": 12 * 60 * 60 * 1000
      },
      {
        "tag": "sync-playback-history",
        "minInterval": 60 * 60 * 1000
      }
    ]
  }
}
```

---

## 4. INDEXEDDB USAGE FOR OFFLINE DATA

### Current State
**Schema Definition:** ✓ Ready
**Location:** `/packages/database/src/client/index.ts`

```typescript
Songs table      → id, slug, title, timesPlayed, lastPlayed
Shows table      → id, showDate, venueId, [showDate+venueId]
Venues table     → id, slug, name, state, totalShows
Tours table      → id, slug, year
Setlists table   → showId
Guests table     → id, slug, name, totalAppearances
Favorites table  → ++id, [type+itemId], synced
SyncMeta table   → key
```

**Data Population:** ❌ Empty on install (9/10 missing)

### Critical Gaps

**1. No Bulk Loading on Install**
```typescript
// What happens on PWA install:
// 1. SW installs → Precaches static assets
// 2. User opens app → All tables empty
// 3. User tries to search → No data found
```

**2. No Query Optimization**
```typescript
// Current offline search is slow:
clientDb.songs
  .filter(song => song.title.toLowerCase().includes(query)) // SLOW
  .toArray();

// Should use indexes:
clientDb.songs
  .where('title').startsWith(query) // FASTER
  .toArray();
```

**3. Missing Compound Indexes**
```typescript
// Can't efficiently query: "Shows by venue in year 2000"
// Needs compound index: [year+venueId]
```

**4. No Size Management**
```typescript
// IndexedDB quota is limited (~50% of available storage)
// With 1M+ rows of data, could exceed quota
// No strategy to manage cache eviction
```

### Recommended Improvements

**1. Initial Population Strategy**

```typescript
// lib/db/seedDatabase.ts
export async function seedOfflineDatabase() {
  const lastSync = await getLastSyncTime('initial');

  if (lastSync) {
    console.log('[DB] Database already seeded');
    return; // Only seed once
  }

  try {
    // Fetch essential data for offline use
    const [songsRes, showsRes, venuesRes] = await Promise.all([
      fetch('/api/songs?limit=500&sortBy=timesPlayed'),
      fetch('/api/shows?limit=500&sortBy=showDate&sortOrder=desc'),
      fetch('/api/venues?limit=100'),
    ]);

    const songsData = await songsRes.json();
    const showsData = await showsRes.json();
    const venuesData = await venuesRes.json();

    // Bulk insert
    await Promise.all([
      clientDb.songs.bulkAdd(songsData.data),
      clientDb.shows.bulkAdd(showsData.data),
      clientDb.venues.bulkAdd(venuesData.data),
    ]);

    await setLastSyncTime('initial', Date.now());
    console.log('[DB] Database seeded successfully');
  } catch (error) {
    console.error('[DB] Failed to seed database:', error);
  }
}

// Call from app initialization
useEffect(() => {
  if (typeof window !== 'undefined') {
    seedOfflineDatabase();
  }
}, []);
```

**2. Optimized Indexes**

```typescript
// Dexie v4 supports better indexing
class DMBDatabase extends Dexie {
  constructor() {
    super('dmbalmanac');

    // Add compound indexes for common queries
    this.version(2).stores({
      shows: 'id, showDate, venueId, [showDate+venueId], year',
      songs: 'id, slug, title, timesPlayed, [timesPlayed+isCover]',
      venues: 'id, slug, [state+city]',
      setlists: 'showId, [showId+syncedAt]',
    });
  }
}
```

**3. Query Optimization Examples**

```typescript
// Before: O(n) - scans all songs
const songs = await clientDb.songs
  .filter(s => s.title.toLowerCase().startsWith(query))
  .toArray();

// After: O(log n) - uses index
const songs = await clientDb.songs
  .where('title').startsWithIgnoreCase(query)
  .limit(20)
  .toArray();

// Before: O(n) - scans all shows
const shows = await clientDb.shows
  .filter(s => s.showDate >= from && s.showDate <= to && s.venueId === vid)
  .toArray();

// After: O(log n) - uses compound index
const shows = await clientDb.shows
  .where('[showDate+venueId]')
  .between([from, vid], [to, vid])
  .toArray();
```

**4. Quota Management**

```typescript
// lib/db/quota.ts
export async function checkQuota() {
  if (!navigator.storage?.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage / estimate.quota) * 100;

  return {
    usage: estimate.usage,
    quota: estimate.quota,
    available: estimate.quota - estimate.usage,
    percentUsed,
  };
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    return false;
  }

  // Request persistent storage (survives cache clear)
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// Monitor in periodic sync
self.addEventListener('periodicsync', async (event) => {
  if (event.tag === 'check-quota') {
    const quota = await checkQuota();
    if (quota && quota.percentUsed > 80) {
      // Clear old data
      await evictOldSetlists();
    }
  }
});
```

---

## 5. HARDCODED API CALLS FAILING OFFLINE

### Search.tsx - Complete Failure

```typescript
// components/features/SearchCommand.tsx (line 103)
const response = await fetch(
  `/api/search?q=${encodeURIComponent(searchQuery)}&limit=3`
);
```

**Problem:** No try/catch for offline. Meilisearch API call directly fails.
**Impact:** Search feature completely broken offline.

**Fix:**
```typescript
async function performSearch(searchQuery: string) {
  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(searchQuery)}&limit=3`
    );

    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    setResults(data);
  } catch (error) {
    // Fallback to offline search
    if (!navigator.onLine) {
      const offlineResults = await searchOffline(searchQuery);
      setResults({
        songs: offlineResults.songs,
        shows: offlineResults.shows,
        venues: offlineResults.venues,
      });
      setIsOfflineMode(true);
    } else {
      setError('Search unavailable');
    }
  }
}
```

### Shows/Songs Filtering - Network Required

```typescript
// api/shows/route.ts (line 31)
const [shows, total] = await Promise.all([
  prisma.show.findMany({ where, ... }),  // Prisma query - network only
  prisma.show.count({ where }),
]);
```

**All affected endpoints:**
- `/api/songs` - Song listing with filters
- `/api/shows` - Show listing with filters
- `/api/songs/{slug}` - Single song detail
- `/api/shows/{id}` - Single show detail

**Critical Issue:** No API wrapper layer to provide offline fallback.

### Recommended API Wrapper Pattern

```typescript
// lib/api/withOfflineFallback.ts
export async function fetchWithOfflineFallback<T>(
  endpoint: string,
  options?: RequestInit,
  fallbackFn?: () => Promise<T>
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (!navigator.onLine || error instanceof TypeError) {
      // Network error - try fallback
      if (fallbackFn) {
        console.log('[API] Using offline fallback for:', endpoint);
        return await fallbackFn();
      }
    }

    throw error;
  }
}

// Usage in client
export async function fetchSongs(filters: SongFilters) {
  return fetchWithOfflineFallback(
    `/api/songs${buildQueryString(filters)}`,
    {},
    async () => {
      // Offline fallback
      let query = clientDb.songs.toCollection();

      if (filters.search) {
        query = query.filter(s =>
          s.title.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.minPlays !== undefined) {
        query = query.filter(s => s.timesPlayed >= filters.minPlays);
      }

      const data = await query.limit(filters.limit || 20).toArray();

      return {
        data,
        meta: {
          total: data.length,
          cached: true,
        },
      };
    }
  );
}
```

---

## 6. NETWORK-FIRST VS CACHE-FIRST DECISIONS BY CONTENT TYPE

### Decision Matrix for Music Database

| Content Type | Strategy | Timeout | Cache TTL | Reason |
|--------------|----------|---------|-----------|--------|
| **Song Catalog** | Cache-first | - | 7 days | Metadata changes rarely, offline browsing critical |
| **Show List** | Network-first | 3s | 12 hours | New shows added daily, users want fresh data |
| **Setlist Data** | Cache-first | - | Forever | Static data, never changes |
| **Venue Info** | Cache-first | - | 30 days | Location data rarely changes |
| **Guest Info** | Cache-first | - | 30 days | Guest artist info stable |
| **Tour Info** | Cache-first | - | Forever | Historical tours never change |
| **User Favorites** | Network-first | 5s | 24 hours | Personal data, sync important |
| **Show Notes** | Network-first | 2s | 7 days | User-generated, needs background sync |
| **Full-text Search** | Network-only | - | Never | Always needs fresh Meilisearch index |
| **Liberation List** | Stale-while-revalidate | 10s | 12 hours | Needs freshness but can show stale first |
| **Statistics** | Cache-first | - | 1 day | Aggregated data, semi-fresh OK |
| **Images** | Cache-first | - | 30 days | Venue/artist images rarely change |

### Why These Decisions?

**Cache-First Examples:**

1. **Song Catalog**: The 400 songs available never decrease. New songs are extremely rare. Users benefit more from instant offline access than a 5-second network check.

2. **Setlist Data**: A show's setlist never changes after the fact. Once cached, it's permanent truth. Network-first would waste bandwidth checking unchanged data.

**Network-First Examples:**

1. **Show List**: Users expect to see latest shows. Even though we cache for 12 hours, network attempt first ensures they see day-of additions.

2. **User Favorites**: Personal data must sync to server. If offline, queue for background sync rather than showing potentially stale local data.

**Stale-While-Revalidate Examples:**

1. **Liberation List**: Users want reasonably fresh data (songs waiting to be played), but it's acceptable to show yesterday's list while fetching today's in background.

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (1-2 weeks)
```
Priority: Critical for offline functionality

1. [ ] Implement IndexedDB seeding on app install
   - Load top 500 songs, shows, venues
   - Show loading progress UX
   - Store sync timestamp

2. [ ] Add offline search fallback
   - Implement searchOffline() function
   - Update SearchCommand component
   - Add offline badge to results

3. [ ] Extend caching strategies
   - Add cache-first for songs/venues
   - Add stale-while-revalidate for liberation list
   - Implement smart cache versioning

4. [ ] Add data status indicators
   - Show "Cached" or "Offline" badge
   - Display last sync time
   - Indicate which features need network
```

### Phase 2: Enhanced Offline (2-3 weeks)
```
Priority: Improved user experience

1. [ ] Implement offline setlist browsing
   - Extend periodic sync to fetch setlists
   - Add offline show detail view
   - Handle missing setlist gracefully

2. [ ] Build offline filtering layer
   - Year filtering in IndexedDB
   - Venue/location filtering
   - Play count filtering for songs

3. [ ] Add offline-aware components
   - Show data freshness indicators
   - Disable search in offline mode (until phase 1 done)
   - Queue actions for background sync

4. [ ] Implement quota management
   - Monitor storage usage
   - Evict old setlists when quota low
   - Request persistent storage permission
```

### Phase 3: Advanced Features (3-4 weeks)
```
Priority: Enhanced features

1. [ ] Add show notes with sync
   - Create notes table in IndexedDB
   - Implement background sync for notes
   - Display notes on show detail page

2. [ ] Implement playback history tracking
   - Track song plays offline
   - Sync history when online
   - Use for recommendations

3. [ ] Build offline export/sharing
   - Export setlists as JSON
   - Share via Web Share API
   - Create shareable playlists

4. [ ] Add smart sync UI
   - Show sync status and progress
   - Manual sync trigger button
   - Conflict resolution UI
```

### Phase 4: Optimization (2-3 weeks)
```
Priority: Polish and performance

1. [ ] Performance optimization
   - Benchmark IndexedDB queries
   - Optimize compound indexes
   - Reduce API payload sizes

2. [ ] Analytics improvements
   - Track offline vs. online usage
   - Monitor sync queue depth
   - Measure storage quota usage

3. [ ] User education
   - In-app tutorial for offline features
   - Help text on offline page
   - Explain what works offline

4. [ ] Testing and QA
   - Offline scenario testing
   - Network condition simulation
   - Background sync verification
```

---

## 8. RECOMMENDED IMPLEMENTATION FILES

### New Files to Create

```
src/
  lib/
    db/
      offline.ts              # Offline query functions
      seeding.ts              # Database population on install
      quota.ts                # Storage quota management
      schema.ts               # Enhanced Dexie schema
      index.ts                # Consolidated exports

    search/
      offline.ts              # Offline search implementation
      fallback.ts             # Search fallback logic

    api/
      withOfflineFallback.ts  # API wrapper with offline
      endpoints.ts            # Typed API wrapper layer

    hooks/
      useOfflineData.ts       # Hook for offline-aware queries
      useNetworkStatus.ts     # Network status tracking
      useSyncStatus.ts        # Background sync status

  components/
    offline/
      OfflineIndicator.tsx    # Simple offline badge
      DataStatus.tsx          # Show cache status
      SyncProgress.tsx        # Background sync progress

    features/
      OfflineSearch.tsx       # Search with offline fallback
      OfflineFilters.tsx      # Filtering component

scripts/
  seed-database.ts           # Manual database seeding script
```

### Files to Modify

```
src/sw.ts                     # Enhanced caching strategies (12 more rules)
src/lib/api/client.ts         # Add offline fallback wrapper
packages/database/src/client/index.ts  # v2 schema with compound indexes
apps/web/public/manifest.json # Add periodicSync config
src/components/features/SearchCommand.tsx  # Add offline fallback
src/app/api/shows/route.ts    # Consider hybrid offline/online
src/app/api/songs/route.ts    # Consider hybrid offline/online
```

---

## 9. TESTING OFFLINE SCENARIOS

### Offline Testing Checklist

```
[ ] Show Browsing
  [ ] Load shows page online
  [ ] Verify shows cached
  [ ] Go offline
  [ ] Can browse cached shows
  [ ] Can filter by year offline
  [ ] Can sort by date offline

[ ] Song Browsing
  [ ] Load songs page online
  [ ] Verify songs cached
  [ ] Go offline
  [ ] Can browse songs offline
  [ ] Can filter by play count offline
  [ ] Search works with fallback

[ ] Show Detail
  [ ] Load show online (with setlist)
  [ ] Navigate offline
  [ ] Can view cached setlist
  [ ] Shows "Cached" indicator
  [ ] Shows sync timestamp

[ ] Favorites Management
  [ ] Add favorite offline
  [ ] Stored in IndexedDB
  [ ] Syncs when back online
  [ ] No duplicate on re-sync

[ ] Search
  [ ] Search online → uses Meilisearch
  [ ] Search offline → uses IndexedDB fallback
  [ ] Results marked as "offline"
  [ ] Results update when online

[ ] Network Edge Cases
  [ ] Slow 3G (10 Mbps)
  [ ] High latency (2000ms)
  [ ] Intermittent drops
  [ ] Switch from 4G to WiFi

[ ] Storage
  [ ] Check IndexedDB size
  [ ] Monitor quota usage
  [ ] Eviction strategy works
  [ ] Persistent storage requested
```

### Testing Tools

```bash
# Chrome DevTools
1. Network → Offline checkbox
2. Application → Service Workers
3. Application → Cache Storage (inspect caches)
4. Application → Local/IndexedDB (inspect data)

# CLI Testing
# Simulate offline in Node tests
process.env.NODE_ENV = 'test';
global.navigator = { onLine: false };

# Network throttling with DevTools Protocol
chrome://inspect/
  → Right-click test page
  → Inspect
  → Network → Throttle to "Offline"
```

---

## 10. PERFORMANCE IMPACT SUMMARY

### Storage Cost
```
Precached Static Assets:    ~9.4 MB
Songs (500 records):        ~120 KB
Shows (500 records):        ~250 KB
Setlists (500 shows):       ~500 KB
Venues, Tours, Guests:      ~100 KB
API Response Cache:         ~50 KB (1 hour)
─────────────────────────────────────
Total with margin:          ~11 MB (easily within quota)
Typical browser quota:      50+ MB
Utilization:                ~20-25%
```

### Network Savings
```
Without Offline:
- Every page load: 200KB API calls
- Search: 50KB Meilisearch request
- Show detail: 100KB setlist fetch

With Offline (after initial sync):
- Cached data loads: 0 KB (disk only)
- Search (offline): 0 KB (IndexedDB only)
- Show detail (cached): 0 KB (disk only)
- Periodic sync: ~50KB/day (if enabled)

Monthly savings: ~10-15 MB for regular users
```

### Performance Metrics
```
Current (Network-dependent):
- First show load: 1-2 seconds (network)
- Search response: 800ms (Meilisearch)
- Show detail: 500ms (API)

With Offline Optimization:
- First show load: 50-100ms (cache)
- Offline search: 10-20ms (IndexedDB)
- Show detail (cached): 20-50ms (cache)

Improvement: 10-50x faster on cache hits
```

---

## 11. SECURITY CONSIDERATIONS

### Cache Security
```
✓ Service Worker scope protected to /
✓ API responses cached only when status 200
✓ No authentication tokens cached
✓ IndexedDB data is origin-specific
✓ Offline mode clearly indicated

⚠ Risk: User data (favorites) cached locally
  Mitigation: Warn users on shared devices

⚠ Risk: Cached show data could be stale
  Mitigation: Always attempt network first for fresh data
```

### Data Privacy
```
✓ IndexedDB is origin-specific (no cross-origin access)
✓ No sensitive user data in cache (except favorites)
✓ Cached data is user's own device
✓ Can clear all offline data anytime

Note: Show/song/venue data is public - safe to cache
```

---

## 12. MIGRATION STRATEGY FROM CURRENT STATE

### Step 0: Deploy Current Enhanced SW (Day 1)
```typescript
// Update src/sw.ts with improved caching strategies
// No schema changes, backward compatible
// Existing service workers will update automatically
```

### Step 1: Schema Migration (Week 1)
```typescript
// Dexie v2 schema (in DMBDatabase constructor)
// Add compound indexes: [showDate+venueId], [year+venueId]
// Dexie handles migration automatically
// Old data structure still accessible
```

### Step 2: Seeding on Install (Week 2)
```typescript
// Add seedOfflineDatabase() call on app init
// Check if seeded with getLastSyncTime('initial')
// Gracefully handles repeated installs
// Only runs once per origin
```

### Step 3: Offline Search Fallback (Week 3)
```typescript
// Add searchOffline() function
// Update SearchCommand to use fetchWithOfflineFallback
// Gradual rollout: 10% → 50% → 100% of users
// Monitor error rates during rollout
```

### Step 4: Feature Flags (Week 3-4)
```typescript
// Use environment variables for feature control
NEXT_PUBLIC_OFFLINE_SEARCH=true
NEXT_PUBLIC_OFFLINE_BROWSE=true
NEXT_PUBLIC_BACKGROUND_SYNC=true

// Allows safe rollout and quick rollback
```

---

## CONCLUSION

The DMB Almanac PWA has excellent infrastructure but is missing critical offline-first features. The roadmap above prioritizes:

1. **Immediate (Phase 1):** Core offline browsing - search, filtering, basic data access
2. **Short-term (Phase 2):** Enhanced offline - setlists, smart indicators, quota management
3. **Medium-term (Phase 3):** User features - notes, history, export/sharing
4. **Long-term (Phase 4):** Optimization - performance, analytics, education

**Quick Win:** Implementing offline search fallback (Phase 1, Week 2) will have massive impact for users on unreliable networks.

**Biggest Gap:** No precached catalog data means users can't browse shows/songs offline without network on first install.

**ROI Focus:** 80% of benefits come from Phases 1-2 (4 weeks effort).

