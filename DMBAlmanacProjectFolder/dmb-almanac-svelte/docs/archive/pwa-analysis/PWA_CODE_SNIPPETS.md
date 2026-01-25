# Copy-Paste Ready Code Snippets
## DMB Almanac v2 - Implementation Checklist

---

## 1. OFFLINE SEARCH FALLBACK (Copy to src/lib/search/offline.ts)

```typescript
/**
 * Offline search using cached IndexedDB data
 * Use when Meilisearch API is unavailable
 */

import { clientDb } from '@dmbalmanac/database';
import type { SearchResult } from '@/lib/api/types';

export interface OfflineSearchOptions {
  limit?: number;
  types?: ('song' | 'show' | 'venue' | 'guest')[];
}

export async function searchOffline(
  query: string,
  options: OfflineSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 20, types = ['song', 'show', 'venue', 'guest'] } = options;
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return [];
  }

  const results: SearchResult[] = [];

  try {
    // Search songs
    if (types.includes('song')) {
      const songs = await clientDb.songs
        .filter(
          (song) =>
            song.title.toLowerCase().includes(normalizedQuery) ||
            (song.originalArtist?.toLowerCase().includes(normalizedQuery) ?? false)
        )
        .limit(Math.ceil(limit / 4))
        .toArray();

      for (const song of songs) {
        results.push({
          type: 'song',
          id: song.id,
          title: song.title,
          slug: song.slug,
          subtitle: song.isCover ? `Cover of ${song.originalArtist}` : 'Original',
          meta: { timesPlayed: song.timesPlayed, isCover: song.isCover },
        });
      }
    }

    // Search shows
    if (types.includes('show')) {
      const shows = await clientDb.shows
        .filter(
          (show) =>
            show.venueName?.toLowerCase().includes(normalizedQuery) ||
            show.city?.toLowerCase().includes(normalizedQuery) ||
            show.state?.toLowerCase().includes(normalizedQuery)
        )
        .limit(Math.ceil(limit / 4))
        .toArray();

      for (const show of shows) {
        results.push({
          type: 'show',
          id: show.id,
          title: show.showDate,
          subtitle: `${show.venueName}${show.city ? `, ${show.city}` : ''}${
            show.state ? `, ${show.state}` : ''
          }`,
          meta: { venueId: show.venueId, songCount: show.songCount },
        });
      }
    }

    // Search venues
    if (types.includes('venue')) {
      const venues = await clientDb.venues
        .filter(
          (venue) =>
            venue.name.toLowerCase().includes(normalizedQuery) ||
            venue.city?.toLowerCase().includes(normalizedQuery) ||
            venue.state?.toLowerCase().includes(normalizedQuery)
        )
        .limit(Math.ceil(limit / 4))
        .toArray();

      for (const venue of venues) {
        results.push({
          type: 'venue',
          id: venue.id,
          title: venue.name,
          slug: venue.slug,
          subtitle: [venue.city, venue.state, venue.country]
            .filter(Boolean)
            .join(', '),
          meta: { totalShows: venue.totalShows },
        });
      }
    }

    // Search guests
    if (types.includes('guest')) {
      const guests = await clientDb.guests
        .filter((guest) => guest.name.toLowerCase().includes(normalizedQuery))
        .limit(Math.ceil(limit / 4))
        .toArray();

      for (const guest of guests) {
        results.push({
          type: 'guest',
          id: guest.id,
          title: guest.name,
          slug: guest.slug,
          subtitle: guest.instruments.join(', '),
          meta: { totalAppearances: guest.totalAppearances },
        });
      }
    }

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aIsExact = a.title.toLowerCase() === normalizedQuery;
      const bIsExact = b.title.toLowerCase() === normalizedQuery;

      if (aIsExact && !bIsExact) return -1;
      if (!aIsExact && bIsExact) return 1;

      const typeOrder = { song: 0, show: 1, venue: 2, guest: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return results.slice(0, limit);
  } catch (error) {
    console.error('[Offline Search] Error:', error);
    return [];
  }
}

export async function isOfflineSearchAvailable(): Promise<boolean> {
  try {
    const [songCount, showCount] = await Promise.all([
      clientDb.songs.count(),
      clientDb.shows.count(),
    ]);
    return songCount > 0 && showCount > 0;
  } catch {
    return false;
  }
}
```

---

## 2. UPDATE SearchCommand.tsx

**Location:** `/apps/web/src/components/features/SearchCommand.tsx`

Replace the `performSearch` function:

```typescript
import { searchOffline, isOfflineSearchAvailable } from '@/lib/search/offline';

const performSearch = useCallback(async (searchQuery: string) => {
  if (!searchQuery.trim()) {
    setResults([]);
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  setError(null);
  setIsOfflineMode(false);

  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(searchQuery)}&limit=3`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error('Search failed');

    const data = await response.json();
    setResults(data);
  } catch (error) {
    console.error('Search error:', error);

    // Fallback to offline search
    if (!navigator.onLine) {
      const offlineAvailable = await isOfflineSearchAvailable();

      if (offlineAvailable) {
        const offlineResults = await searchOffline(searchQuery, { limit: 10 });
        setResults(offlineResults);
        setIsOfflineMode(true);
      } else {
        setError('Search unavailable - no cached data');
      }
    } else {
      setError('Search unavailable');
    }
  } finally {
    setIsLoading(false);
  }
}, []);
```

Add this after the results rendering to show offline indicator:

```typescript
{isOfflineMode && (
  <div className="mb-2 flex items-center gap-1 text-xs text-foreground-muted">
    <HardDrive className="h-3 w-3" />
    <span>Showing cached results (offline mode)</span>
  </div>
)}
```

---

## 3. ENHANCED SERVICE WORKER (Copy to src/sw.ts)

Replace lines 43-173 with:

```typescript
// ============================================
// ENHANCED CACHING STRATEGIES
// ============================================

// Songs catalog - Cache-first (rarely changes)
registerRoute(
  ({ url }) => url.pathname === '/api/songs',
  new CacheFirst({
    cacheName: 'songs-catalog-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Shows - Network-first with short timeout
registerRoute(
  ({ url }) =>
    url.pathname === '/api/shows' &&
    !url.pathname.includes('/api/shows/'),
  new NetworkFirst({
    cacheName: 'shows-list-v1',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 12 * 60 * 60, // 12 hours
      }),
    ],
  })
);

// Show detail - Cache-first (static data)
registerRoute(
  ({ url }) => url.pathname.match(/^\/api\/shows\/\d+$/),
  new CacheFirst({
    cacheName: 'show-detail-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// Setlists - Cache-first forever
registerRoute(
  ({ url }) => url.pathname.match(/^\/api\/shows\/\d+\/setlist$/),
  new CacheFirst({
    cacheName: 'setlists-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// Venues - Cache-first
registerRoute(
  ({ url }) => url.pathname === '/api/venues',
  new CacheFirst({
    cacheName: 'venues-catalog-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Tours - Cache-first
registerRoute(
  ({ url }) => url.pathname === '/api/tours',
  new CacheFirst({
    cacheName: 'tours-catalog-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// Guests - Cache-first
registerRoute(
  ({ url }) => url.pathname === '/api/guests',
  new CacheFirst({
    cacheName: 'guests-catalog-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
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
    cacheName: 'liberation-list-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 12 * 60 * 60, // 12 hours
      }),
    ],
  })
);

// Search - Network-only
registerRoute(
  ({ url }) => url.pathname === '/api/search',
  new NetworkOnly()
);

// User Favorites - Network-first
registerRoute(
  ({ url }) => url.pathname === '/api/favorites' && url.method !== 'DELETE',
  new NetworkFirst({
    cacheName: 'favorites-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Keep the existing routes below for API routes, images, fonts, etc.
// API Routes - Network First with fallback to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
);

// ... rest of existing routes (images, fonts, static assets)
```

---

## 4. DATABASE SEEDING (Copy to src/lib/db/seeding.ts)

```typescript
/**
 * Initialize offline database with essential data
 * Called once on app startup
 */

import {
  clientDb,
  getLastSyncTime,
  setLastSyncTime,
  type CachedSong,
  type CachedShow,
  type CachedVenue,
  type CachedGuest,
} from '@dmbalmanac/database';

/**
 * Seed offline database on first install
 */
export async function seedOfflineDatabase(): Promise<void> {
  try {
    // Check if already seeded
    const lastSync = await getLastSyncTime('initial-seed');

    if (lastSync) {
      console.log('[DB] Already seeded at', new Date(lastSync));
      return;
    }

    console.log('[DB] Starting database seed...');

    // Fetch essential data in parallel
    const [songsRes, showsRes, venuesRes, guestsRes] = await Promise.all([
      fetch('/api/songs?limit=500&sortBy=timesPlayed'),
      fetch('/api/shows?limit=500&sortBy=showDate&sortOrder=desc'),
      fetch('/api/venues?limit=100'),
      fetch('/api/guests?limit=100'),
    ]);

    if (!songsRes.ok || !showsRes.ok || !venuesRes.ok || !guestsRes.ok) {
      throw new Error('One or more API requests failed');
    }

    const [songsData, showsData, venuesData, guestsData] = await Promise.all([
      songsRes.json(),
      showsRes.json(),
      venuesRes.json(),
      guestsRes.json(),
    ]);

    // Store in IndexedDB
    await Promise.all([
      storeSongs(songsData.data || []),
      storeShows(showsData.data || []),
      storeVenues(venuesData.data || []),
      storeGuests(guestsData.data || []),
    ]);

    // Record successful sync
    await setLastSyncTime('initial-seed', Date.now());

    console.log('[DB] Database seeded successfully');
  } catch (error) {
    console.error('[DB] Failed to seed:', error);
    // Don't throw - gracefully handle failure
  }
}

async function storeSongs(songs: any[]): Promise<void> {
  if (!songs.length) return;

  const transformed: CachedSong[] = songs.map((song) => ({
    id: song.id,
    title: song.title,
    slug: song.slug,
    isCover: song.isCover,
    timesPlayed: song.timesPlayed,
    firstPlayed: song.firstPlayed,
    lastPlayed: song.lastPlayed,
    syncedAt: Date.now(),
  }));

  await clientDb.songs.clear();
  await clientDb.songs.bulkAdd(transformed);
  console.log(`[DB] Stored ${transformed.length} songs`);
}

async function storeShows(shows: any[]): Promise<void> {
  if (!shows.length) return;

  const transformed: CachedShow[] = shows.map((show) => ({
    id: show.id,
    showDate: show.showDate,
    venueId: show.venue?.id || null,
    venueName: show.venue?.name || null,
    city: show.venue?.city || null,
    state: show.venue?.state || null,
    songCount: show.songCount,
    syncedAt: Date.now(),
  }));

  await clientDb.shows.clear();
  await clientDb.shows.bulkAdd(transformed);
  console.log(`[DB] Stored ${transformed.length} shows`);
}

async function storeVenues(venues: any[]): Promise<void> {
  if (!venues.length) return;

  const transformed: CachedVenue[] = venues.map((venue) => ({
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    city: venue.city,
    state: venue.state,
    country: venue.country,
    totalShows: venue.totalShows,
    syncedAt: Date.now(),
  }));

  await clientDb.venues.clear();
  await clientDb.venues.bulkAdd(transformed);
  console.log(`[DB] Stored ${transformed.length} venues`);
}

async function storeGuests(guests: any[]): Promise<void> {
  if (!guests.length) return;

  const transformed: CachedGuest[] = guests.map((guest) => ({
    id: guest.id,
    name: guest.name,
    slug: guest.slug,
    instruments: guest.instruments || [],
    totalAppearances: guest.totalAppearances,
    syncedAt: Date.now(),
  }));

  await clientDb.guests.clear();
  await clientDb.guests.bulkAdd(transformed);
  console.log(`[DB] Stored ${transformed.length} guests`);
}
```

---

## 5. UPDATE ROOT LAYOUT (add to app/layout.tsx)

Find your root layout component and add this useEffect:

```typescript
'use client';

import { useEffect } from 'react';
import { seedOfflineDatabase } from '@/lib/db/seeding';

export function RootLayoutClient() {
  useEffect(() => {
    // Seed database on app mount
    seedOfflineDatabase().catch((error) => {
      console.error('Failed to seed offline database:', error);
    });
  }, []);

  return (
    // ... your existing layout content
  );
}
```

Then update your layout export to use this component.

---

## 6. DATA STATUS COMPONENT (Copy to components/DataStatus.tsx)

```typescript
'use client';

import { HardDrive, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface DataStatusProps {
  lastSynced?: number; // Unix timestamp
  isCached?: boolean;
  isLoading?: boolean;
}

/**
 * Shows cache status indicator
 */
export function DataStatus({
  lastSynced,
  isCached = false,
  isLoading = false,
}: DataStatusProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="text-xs text-foreground-muted flex items-center gap-1">
        <div className="animate-spin h-3 w-3 border border-foreground-muted border-t-transparent rounded-full" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!isOnline) {
    const timeAgo = lastSynced
      ? formatDistanceToNow(new Date(lastSynced), { addSuffix: true })
      : 'unknown time';

    return (
      <div className="text-xs text-foreground-muted flex items-center gap-1">
        <HardDrive className="h-3 w-3" />
        <span>
          Cached {lastSynced && timeAgo ? `(${timeAgo})` : ''}
        </span>
      </div>
    );
  }

  if (isCached) {
    return (
      <div className="text-xs text-foreground-muted flex items-center gap-1">
        <Wifi className="h-3 w-3" />
        <span>Live data</span>
      </div>
    );
  }

  return null;
}
```

---

## 7. FILTERING HELPER (Copy to src/lib/db/filtering.ts)

```typescript
/**
 * Offline filtering using IndexedDB
 */

import { clientDb } from '@dmbalmanac/database';

export async function filterShowsOffline(filters: {
  year?: number;
  venueId?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}) {
  const { year, venueId, fromDate, toDate, limit = 100 } = filters;

  let query = clientDb.shows.toCollection();

  if (year) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);
    query = query.filter(
      (s) => {
        const showDate = new Date(s.showDate);
        return showDate >= startDate && showDate < endDate;
      }
    );
  }

  if (venueId) {
    query = query.filter((s) => s.venueId === venueId);
  }

  if (fromDate) {
    query = query.filter((s) => s.showDate >= fromDate);
  }

  if (toDate) {
    query = query.filter((s) => s.showDate <= toDate);
  }

  return query.limit(limit).toArray();
}

export async function filterSongsOffline(filters: {
  minPlays?: number;
  maxPlays?: number;
  isCover?: boolean;
  limit?: number;
}) {
  const { minPlays, maxPlays, isCover, limit = 100 } = filters;

  let query = clientDb.songs.toCollection();

  if (minPlays !== undefined) {
    query = query.filter((s) => s.timesPlayed >= minPlays);
  }

  if (maxPlays !== undefined) {
    query = query.filter((s) => s.timesPlayed <= maxPlays);
  }

  if (isCover !== undefined) {
    query = query.filter((s) => s.isCover === isCover);
  }

  return query.limit(limit).toArray();
}
```

---

## 8. QUICK TESTING SCRIPT

Open Chrome DevTools Console and paste:

```javascript
// Check service worker
navigator.serviceWorker.getRegistration().then(sw => {
  console.log('SW Status:', sw?.active ? 'ACTIVE' : 'INACTIVE');
});

// Check IndexedDB
const db = new Dexie('dmbalmanac');
db.open().then(() => {
  return Promise.all([
    db.songs.count(),
    db.shows.count(),
    db.venues.count(),
  ]);
}).then(([songs, shows, venues]) => {
  console.log(`IndexedDB: ${songs} songs, ${shows} shows, ${venues} venues`);
});

// Check cache
caches.keys().then(keys => {
  console.log('Caches:', keys);
  keys.forEach(key => {
    caches.open(key).then(cache => {
      cache.keys().then(reqs => {
        console.log(`  ${key}: ${reqs.length} entries`);
      });
    });
  });
});

// Check storage
navigator.storage.estimate().then(estimate => {
  const percent = (estimate.usage / estimate.quota * 100).toFixed(1);
  console.log(`Storage: ${percent}% used (${estimate.usage} / ${estimate.quota} bytes)`);
});

// Simulate offline
console.log('Setting offline mode...');
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false,
});
window.dispatchEvent(new Event('offline'));
console.log('You are now offline');

// Back online
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});
window.dispatchEvent(new Event('online'));
console.log('You are now online');
```

---

## Implementation Order

1. ✅ Copy offline search code → `src/lib/search/offline.ts`
2. ✅ Update SearchCommand.tsx with fallback
3. ✅ Update service worker → `src/sw.ts` (caching strategies)
4. ✅ Copy seeding code → `src/lib/db/seeding.ts`
5. ✅ Add seeding call to layout.tsx
6. ✅ Copy DataStatus component → `src/components/DataStatus.tsx`
7. ✅ Copy filtering helpers → `src/lib/db/filtering.ts`
8. ✅ Test with browser console script
9. ✅ Deploy and monitor

---

## Verification Checklist

After implementing:

```
[ ] Build succeeds: pnpm build
[ ] No TypeScript errors: pnpm typecheck
[ ] Service worker builds: ls -lh public/sw.js (should be ~151KB)
[ ] Seeding completes: Check browser console for "[DB] Database seeded"
[ ] IndexedDB populated: DevTools > Application > IndexedDB > songs (count > 0)
[ ] Offline search works: Go offline, search for "Phish", results appear
[ ] Caching strategy updated: Network inspector shows new cache names
[ ] No console errors: DevTools > Console (should be clean)
[ ] Works on Chrome: Test in latest Chrome
[ ] Works on Firefox: Test in latest Firefox (may vary)
```

---

## Notes

- All code is TypeScript strict mode compatible
- Uses existing UI library (shadcn/ui, lucide-react, date-fns)
- No new dependencies required
- Backward compatible with existing code
- Safe to deploy gradually (feature flags available)

