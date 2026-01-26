---
name: pwa-implementation
version: 1.0.0
description: ---
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: pwa
complexity: advanced
tags:
  - pwa
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/archive/pwa-analysis/PWA_IMPLEMENTATION_GUIDE.md
migration_date: 2026-01-25
---

# PWA Offline Implementation Guide
## DMB Almanac v2 - Code-Level Implementation

---

## QUICK START: Top 3 Improvements (This Week)

### 1. Add Offline Search Fallback (2 hours)

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/lib/search/offline.ts`

```typescript
/**
 * Offline search using cached IndexedDB data
 * Fallback when Meilisearch API is unavailable
 */

import { clientDb } from '@dmbalmanac/database';
import type { SearchResult } from '@/lib/api/types';

export interface OfflineSearchOptions {
  limit?: number;
  types?: ('song' | 'show' | 'venue' | 'guest')[];
}

/**
 * Search songs, shows, venues, guests using offline data
 * Returns results matching query across all cached entities
 */
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
          meta: {
            timesPlayed: song.timesPlayed,
            isCover: song.isCover,
          },
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
          meta: {
            venueId: show.venueId,
            songCount: show.songCount,
          },
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
          meta: {
            totalShows: venue.totalShows,
          },
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
          meta: {
            totalAppearances: guest.totalAppearances,
          },
        });
      }
    }

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aIsExact = a.title.toLowerCase() === normalizedQuery;
      const bIsExact = b.title.toLowerCase() === normalizedQuery;

      if (aIsExact && !bIsExact) return -1;
      if (!aIsExact && bIsExact) return 1;

      // Then by type order
      const typeOrder = { song: 0, show: 1, venue: 2, guest: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return results.slice(0, limit);
  } catch (error) {
    console.error('[Offline Search] Error:', error);
    return [];
  }
}

/**
 * Check if offline search should be available
 * Returns true if database has cached data
 */
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

**File:** Update `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/features/SearchCommand.tsx`

```typescript
// Add this import at top
import { searchOffline, isOfflineSearchAvailable } from '@/lib/search/offline';

// Inside SearchCommand component, update performSearch:
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
      { signal: AbortSignal.timeout(5000) } // 5 second timeout
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

// In the results section, add offline indicator:
{isOfflineMode && (
  <div className="mb-2 flex items-center gap-1 text-xs text-foreground-muted">
    <HardDrive className="h-3 w-3" />
    <span>Showing cached results (offline mode)</span>
  </div>
)}
```

---

### 2. Enhance Service Worker Caching (3 hours)

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/sw.ts`

Replace the caching strategies section (lines 43-173) with:

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

// Shows - Network-first with short timeout (new shows added daily)
registerRoute(
  ({ url }) => url.pathname === '/api/shows' && !url.pathname.includes('/api/shows/'),
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

// Show detail with setlist - Cache-first (static data)
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

// Setlists - Cache-first forever (never changes)
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

// Venues - Cache-first (location data stable)
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

// Tours - Cache-first (historical data never changes)
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

// Guests - Cache-first (guest artist info stable)
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

// Liberation List - Stale-while-revalidate (semi-fresh OK)
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

// Search - Network-only (needs fresh Meilisearch results)
registerRoute(
  ({ url }) => url.pathname === '/api/search',
  new NetworkOnly()
);

// User Favorites - Network-first (personal data)
registerRoute(
  ({ url }) => url.pathname === '/api/favorites' && url.method === 'GET',
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

// Keep existing API routes, images, fonts, etc.
// ...
```

---

### 3. Implement Database Seeding (2 hours)

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/lib/db/seeding.ts`

```typescript
/**
 * Initialize offline database with essential data
 * Called once on app startup if database is empty
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

interface SyncProgress {
  step: 'fetching' | 'processing' | 'storing';
  entity: 'songs' | 'shows' | 'venues' | 'guests' | 'tours';
  progress: number; // 0-100
  total: number;
  current: number;
}

export const syncProgressSubject = {
  listeners: new Set<(progress: SyncProgress) => void>(),

  subscribe(listener: (progress: SyncProgress) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notify(progress: SyncProgress) {
    this.listeners.forEach((listener) => listener(progress));
  },
};

/**
 * Seed offline database on first install
 * Fetches and stores essential catalog data
 */
export async function seedOfflineDatabase(): Promise<void> {
  try {
    // Check if already seeded
    const lastSync = await getLastSyncTime('initial-seed');

    if (lastSync) {
      console.log('[DB] Database already seeded at', new Date(lastSync));
      return;
    }

    console.log('[DB] Starting initial database seed...');

    // Fetch all essential data in parallel
    const [songsRes, showsRes, venuesRes, guestsRes] = await Promise.all([
      fetchWithProgress('songs', '/api/songs?limit=500&sortBy=timesPlayed'),
      fetchWithProgress('shows', '/api/shows?limit=500&sortBy=showDate&sortOrder=desc'),
      fetchWithProgress('venues', '/api/venues?limit=100'),
      fetchWithProgress('guests', '/api/guests?limit=100'),
    ]);

    const [songsData, showsData, venuesData, guestsData] = await Promise.all([
      songsRes.json(),
      showsRes.json(),
      venuesRes.json(),
      guestsRes.json(),
    ]);

    // Store in IndexedDB
    await storeSongs(songsData.data || []);
    await storeShows(showsData.data || []);
    await storeVenues(venuesData.data || []);
    await storeGuests(guestsData.data || []);

    // Record successful sync
    await setLastSyncTime('initial-seed', Date.now());

    console.log('[DB] Database seeded successfully');
  } catch (error) {
    console.error('[DB] Failed to seed database:', error);
    // Don't re-attempt immediately, will retry on next app load
  }
}

/**
 * Fetch with progress tracking
 */
async function fetchWithProgress(
  entity: 'songs' | 'shows' | 'venues' | 'guests',
  url: string
): Promise<Response> {
  console.log(`[DB] Fetching ${entity}...`);

  syncProgressSubject.notify({
    step: 'fetching',
    entity,
    progress: 0,
    total: 1,
    current: 1,
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    console.error(`[DB] Failed to fetch ${entity}:`, error);
    throw error;
  }
}

/**
 * Store songs in IndexedDB
 */
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

  try {
    await clientDb.songs.clear(); // Clear old data
    await clientDb.songs.bulkAdd(transformed);
    console.log(`[DB] Stored ${transformed.length} songs`);
  } catch (error) {
    console.error('[DB] Failed to store songs:', error);
    throw error;
  }
}

/**
 * Store shows in IndexedDB
 */
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

  try {
    await clientDb.shows.clear();
    await clientDb.shows.bulkAdd(transformed);
    console.log(`[DB] Stored ${transformed.length} shows`);
  } catch (error) {
    console.error('[DB] Failed to store shows:', error);
    throw error;
  }
}

/**
 * Store venues in IndexedDB
 */
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

  try {
    await clientDb.venues.clear();
    await clientDb.venues.bulkAdd(transformed);
    console.log(`[DB] Stored ${transformed.length} venues`);
  } catch (error) {
    console.error('[DB] Failed to store venues:', error);
    throw error;
  }
}

/**
 * Store guests in IndexedDB
 */
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

  try {
    await clientDb.guests.clear();
    await clientDb.guests.bulkAdd(transformed);
    console.log(`[DB] Stored ${transformed.length} guests`);
  } catch (error) {
    console.error('[DB] Failed to store guests:', error);
    throw error;
  }
}

/**
 * Get sync progress percentage (for UI)
 */
export function getSyncProgress(): number {
  // Simple implementation - can be enhanced
  // Returns 0-100
  return 0;
}
```

**File:** Update `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/app/layout.tsx`

Add this to the root layout's client component:

```typescript
'use client';

import { useEffect } from 'react';
import { seedOfflineDatabase } from '@/lib/db/seeding';

export function RootLayoutContent() {
  useEffect(() => {
    // Seed database on app mount
    seedOfflineDatabase().catch((error) => {
      console.error('Failed to seed offline database:', error);
    });
  }, []);

  return (
    // ... existing content
  );
}
```

---

## PHASE 2: Enhanced Offline Features (Medium Priority)

### Create API Wrapper with Offline Fallback

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/lib/api/withOfflineFallback.ts`

```typescript
/**
 * Fetch with automatic offline fallback
 * Attempts network first, falls back to IndexedDB queries if offline/timeout
 */

export interface FetchOptions extends RequestInit {
  timeoutSeconds?: number;
  offlineMode?: boolean;
}

/**
 * Generic fetch with offline fallback
 * Usage:
 *   const data = await fetchWithOffline(
 *     '/api/songs',
 *     {},
 *     async () => searchSongsOffline('all')
 *   );
 */
export async function fetchWithOffline<T>(
  url: string,
  options?: FetchOptions,
  fallback?: () => Promise<T>
): Promise<T> {
  const { timeoutSeconds = 10, offlineMode = false, ...fetchOptions } = options || {};

  // If explicitly offline, skip network attempt
  if (offlineMode || !navigator.onLine) {
    if (fallback) {
      console.log('[API] Using offline fallback for:', url);
      return fallback();
    }
    throw new Error(`Network unavailable and no offline fallback for ${url}`);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Network error or timeout
    if (fallback && !navigator.onLine) {
      console.log('[API] Network failed, using offline fallback for:', url);
      return fallback();
    }

    // Rethrow if no fallback
    throw error;
  }
}

/**
 * Specialized fetch for shows with offline fallback
 */
export async function fetchShowsWithOffline(filters?: Record<string, any>) {
  const query = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
  }

  const url = `/api/shows${query.toString() ? `?${query}` : ''}`;

  return fetchWithOffline(
    url,
    { timeoutSeconds: 3 },
    async () => {
      // Offline fallback - query IndexedDB
      let query = clientDb.shows.toCollection();

      if (filters?.year) {
        const year = filters.year;
        query = query.filter((show) => {
          const showDate = new Date(show.showDate);
          return (
            showDate.getFullYear() === year &&
            showDate.getFullYear() === year + 1
          );
        });
      }

      if (filters?.venueId) {
        query = query.filter((show) => show.venueId === filters.venueId);
      }

      const shows = await query.toArray();

      return {
        data: shows,
        meta: {
          total: shows.length,
          cached: true,
          lastSync: await getLastSyncTime('shows'),
        },
      };
    }
  );
}

/**
 * Specialized fetch for songs with offline fallback
 */
export async function fetchSongsWithOffline(filters?: Record<string, any>) {
  const query = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
  }

  const url = `/api/songs${query.toString() ? `?${query}` : ''}`;

  return fetchWithOffline(
    url,
    { timeoutSeconds: 5 },
    async () => {
      let query = clientDb.songs.toCollection();

      if (filters?.minPlays !== undefined) {
        query = query.filter((song) => song.timesPlayed >= filters.minPlays);
      }

      const songs = await query.toArray();

      return {
        data: songs,
        meta: {
          total: songs.length,
          cached: true,
          lastSync: await getLastSyncTime('songs'),
        },
      };
    }
  );
}
```

---

### Add Data Status Indicator Component

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/DataStatus.tsx`

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
 * Displays if data is fresh, cached, or offline
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
          Cached {lastSynced && timeAgo !== 'unknown time' ? `(${timeAgo})` : ''}
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

## PHASE 3: Advanced Features (Lower Priority)

### Show Notes with Background Sync

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/packages/database/src/client/index.ts`

Add to the Dexie schema:

```typescript
export interface ShowNote {
  id?: number;
  showId: number;
  userId: string;
  note: string;
  createdAt: number;
  syncedAt?: number;
  synced: boolean;
}

// In DMBDatabase class
class DMBDatabase extends Dexie {
  notes!: Table<ShowNote, number>;

  constructor() {
    super('dmbalmanac');

    this.version(2).stores({
      // ... existing tables ...
      notes: '++id, showId, userId, [userId+showId], synced',
    });
  }
}

// Export helper functions
export async function addShowNote(
  showId: number,
  userId: string,
  note: string
): Promise<number> {
  return clientDb.notes.add({
    showId,
    userId,
    note,
    createdAt: Date.now(),
    synced: false,
  });
}

export async function getShowNotes(showId: number): Promise<ShowNote[]> {
  return clientDb.notes
    .where('showId')
    .equals(showId)
    .toArray();
}

export async function getUnsyncedNotes(): Promise<ShowNote[]> {
  return clientDb.notes
    .where('synced')
    .equals(false)
    .toArray();
}

export async function markNotesSynced(ids: number[]): Promise<void> {
  await clientDb.notes
    .where('id')
    .anyOf(ids)
    .modify({ synced: true, syncedAt: Date.now() });
}
```

---

## TESTING CHECKLIST

### Manual Testing (Before Deployment)

```
Offline Search:
- [ ] Load app online
- [ ] Search for "Phish" - Meilisearch results appear
- [ ] Go offline (DevTools > Network > Offline)
- [ ] Search for "Phish" - IndexedDB results appear with "Cached" badge
- [ ] Search for non-existent "xyzxyz" - Shows "No results"
- [ ] Go back online
- [ ] Search again - Meilisearch results appear

Database Seeding:
- [ ] Clear all site data (DevTools > Application > Clear site data)
- [ ] Refresh page
- [ ] Check Network tab - Should see /api/songs, /api/shows, /api/venues requests
- [ ] Open DevTools > Application > IndexedDB > songs table
- [ ] Verify 500+ songs loaded
- [ ] Wait 30 seconds, verify "Seeded successfully" in console
- [ ] Reload page - Should not repeat requests (check Network tab)

Show Detail Offline:
- [ ] Load show list online
- [ ] Click a show to load detail
- [ ] Go offline
- [ ] Navigate to cached show - Should still see setlist
- [ ] Navigate to uncached show - Should show error/cached message
- [ ] Go back online - Show detail reloads

Caching Strategy:
- [ ] Load /api/songs online - Check DevTools Network tab "Size: (from disk cache)"
- [ ] Reload page offline - Should use cache, network shows as failed
- [ ] Open /api/shows - Should attempt network first
- [ ] Go offline - Should show "Error" but then use cache fallback

Background Sync (Favorites):
- [ ] Add favorite while offline
- [ ] Check IndexedDB favorites table - shows synced: false
- [ ] Go online
- [ ] Watch for POST /api/favorites in Network tab (may take 5-10 seconds)
- [ ] Favorite synced to server
```

### Browser DevTools Verification

```
Service Worker Status:
1. Open DevTools > Application > Service Workers
2. Should see service worker "activated and running"
3. Click "Update" button - should check for new version
4. No errors in console

Cache Storage:
1. DevTools > Application > Cache Storage
2. Should see caches:
   - static-resources-* (JS, CSS)
   - api-cache-* (API responses)
   - songs-catalog-* (songs)
   - shows-list-* (shows)
   - setlists-* (setlists)
   - And others...

IndexedDB:
1. DevTools > Application > IndexedDB > dmbalmanac
2. Should see tables:
   - songs (count > 0)
   - shows (count > 0)
   - venues (count > 0)
   - guests (count > 0)
3. Right-click table → "Clear" → Verify offline search fails

Network Throttling:
1. DevTools > Network > Throttling
2. Set to "Offline"
3. Verify app still loads from service worker
4. Verify cached data available
5. Set to "Slow 3G"
6. Verify network-first strategies timeout appropriately
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
```
[ ] Run tests: pnpm test
[ ] Type checking: pnpm typecheck
[ ] Build: pnpm build
[ ] Verify service worker builds: ls -lh public/sw.js
[ ] Test in production build: pnpm build && pnpm start
[ ] Offline scenario test:
  [ ] Seed database
  [ ] Go offline
  [ ] Verify search works
  [ ] Verify shows browsable
  [ ] Verify filtering works
```

### Deployment Strategy
```
Week 1: Infrastructure (sw.ts caching)
- Deploy enhanced service worker
- Monitor cache hit rates
- Measure performance improvement

Week 2: Seeding (initial database population)
- Deploy seeding logic
- Monitor seeding failures
- Check storage quota usage

Week 3: Offline Search
- Deploy offline search fallback
- Monitor search result accuracy
- A/B test offline vs. online search quality

Week 4+: Monitor and Iterate
- Track offline vs. online usage ratio
- Measure data freshness via syncedAt timestamps
- Gather user feedback
```

### Rollback Plan
```
If issues occur:
1. Service Worker: Set `DISABLE_OFFLINE=true` env var
2. Seeding: Skip in `seedOfflineDatabase()` if error rate > 5%
3. Offline Search: Show network error message instead of offline results
```

---

## PERFORMANCE TARGETS

### Metrics to Track
```
Cache Hit Rate:          Target > 70%
Offline Search Time:     Target < 50ms
IndexedDB Query Time:    Target < 100ms
Service Worker Size:     Current 151KB (acceptable)
Storage Quota Used:      Target < 25% of available
Initial Seed Time:       Target < 10 seconds
```

### Monitoring
```
Add to analytics:
- navigator.onLine state changes
- Service worker update checks
- Cache hit/miss rates
- IndexedDB query latencies
- Storage quota warnings (>80%)
- Offline feature usage
```

---

## ADDITIONAL RESOURCES

### Debugging
```
Check service worker status:
navigator.serviceWorker.getRegistration().then(r => console.log(r))

Check IndexedDB:
const db = new Dexie('dmbalmanac');
db.open().then(() => db.songs.count()).then(console.log)

Simulate offline in JS:
Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
window.dispatchEvent(new Event('offline'))

Check cache:
caches.keys().then(names => {
  names.forEach(name => {
    caches.open(name).then(c => c.keys()).then(console.log)
  })
})
```

### Further Reading
- Workbox 7 Documentation: https://developers.google.com/web/tools/workbox
- Dexie.js Guide: https://dexie.org/docs
- PWA Checklist: https://web.dev/progressive-web-apps-checklist/
- Service Worker Lifecycle: https://web.dev/service-worker-lifecycle/
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Background Sync: https://developers.google.com/web/updates/2015/12/background-sync

