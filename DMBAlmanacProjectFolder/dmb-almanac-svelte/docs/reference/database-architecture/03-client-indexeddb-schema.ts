/**
 * ============================================================================
 * DMBAlmanac Client-Side Database (IndexedDB via Dexie.js)
 * ============================================================================
 *
 * Optimized for:
 * - Offline-first PWA functionality
 * - Selective sync of ~5-10MB core data
 * - Fast local queries with compound indexes
 * - Efficient storage with minimal redundancy
 *
 * Storage Budget:
 * - Songs (~1,200): ~200KB
 * - Venues (~1,400): ~300KB
 * - Concerts (~3,700): ~800KB
 * - Setlist entries (~40,000): ~3MB
 * - Guests (~1,400): ~150KB
 * - User data: ~100KB
 * - Search indexes: ~500KB
 * Total: ~5MB core, ~10MB with extended data
 * ============================================================================
 */

import Dexie, { Table } from 'dexie';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Song {
  id: number;
  uuid: string;
  title: string;
  titleNormalized: string;
  slug: string;
  originalArtist: string | null;
  isCover: boolean;
  timesPlayed: number;
  firstPlayedDate: string | null;  // ISO date string
  lastPlayedDate: string | null;
  notes?: string;
  // Lyrics stored separately to save space
  syncedAt: number;  // Timestamp for sync tracking
}

export interface SongLyrics {
  songId: number;
  lyrics: string;
  syncedAt: number;
}

export interface Venue {
  id: number;
  uuid: string;
  name: string;
  nameNormalized: string;
  slug: string;
  city: string;
  stateProvince: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  venueType: string | null;
  totalShows: number;
  firstShowDate: string | null;
  lastShowDate: string | null;
  syncedAt: number;
}

export interface Concert {
  id: number;
  uuid: string;
  showDate: string;  // ISO date string
  slug: string;
  venueId: number;
  tourName: string | null;
  showType: string;
  songCount: number;
  hasAudio: boolean;
  hasVideo: boolean;
  notes?: string;
  // Denormalized for offline display
  venueName: string;
  venueCity: string;
  venueState: string | null;
  syncedAt: number;
}

export interface SetlistEntry {
  id: number;
  uuid: string;
  concertId: number;
  songId: number;
  setNumber: number;
  position: number;
  isOpener: boolean;
  isCloser: boolean;
  isSegue: boolean;
  isTease: boolean;
  isBustout: boolean;
  gap: number | null;
  durationSeconds: number | null;
  notes?: string;
  // Denormalized for display
  songTitle: string;
  songSlug: string;
  syncedAt: number;
}

export interface Guest {
  id: number;
  uuid: string;
  name: string;
  nameNormalized: string;
  slug: string;
  instrument: string | null;
  totalAppearances: number;
  syncedAt: number;
}

export interface GuestAppearance {
  id: number;
  concertId: number;
  setlistEntryId: number | null;
  guestId: number;
  instrument: string | null;
  // Denormalized
  guestName: string;
  syncedAt: number;
}

export interface Album {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  releaseDate: string | null;
  albumType: string;
  coverImageUrl: string | null;
  trackCount: number;
  syncedAt: number;
}

export interface AlbumTrack {
  id: number;
  albumId: number;
  songId: number | null;
  discNumber: number;
  trackNumber: number;
  trackTitle: string;
  durationSeconds: number | null;
  sourceConcertId: number | null;
  syncedAt: number;
}

// User-specific data (stored locally, synced to server)
export interface UserConcertAttendance {
  odoo;
  usedId: number;
  concertId: number;
  attended: boolean;
  rating: number | null;
  notes: string | null;
  syncedAt: number;
  pendingSync: boolean;  // For offline changes
}

export interface UserFavoriteSong {
  id?: number;
  songId: number;
  rankOrder: number | null;
  notes: string | null;
  syncedAt: number;
  pendingSync: boolean;
}

export interface UserWantToHear {
  id?: number;
  songId: number;
  priority: number;
  seenAtConcertId: number | null;
  syncedAt: number;
  pendingSync: boolean;
}

// Sync metadata
export interface SyncMetadata {
  tableName: string;
  lastSyncAt: number;
  lastServerVersion: string | null;
  recordCount: number;
}

// Search index for fast typeahead
export interface SearchIndex {
  id?: number;
  entityType: 'song' | 'venue' | 'guest';
  entityId: number;
  text: string;  // Normalized search text
  slug: string;
  displayText: string;
  popularity: number;  // For sorting (times_played, total_shows, etc.)
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

export class DMBAlmanacDB extends Dexie {
  // Tables
  songs!: Table<Song, number>;
  songLyrics!: Table<SongLyrics, number>;
  venues!: Table<Venue, number>;
  concerts!: Table<Concert, number>;
  setlistEntries!: Table<SetlistEntry, number>;
  guests!: Table<Guest, number>;
  guestAppearances!: Table<GuestAppearance, number>;
  albums!: Table<Album, number>;
  albumTracks!: Table<AlbumTrack, number>;

  // User data
  userAttendance!: Table<UserConcertAttendance, number>;
  userFavorites!: Table<UserFavoriteSong, number>;
  userWantToHear!: Table<UserWantToHear, number>;

  // Meta
  syncMetadata!: Table<SyncMetadata, string>;
  searchIndex!: Table<SearchIndex, number>;

  constructor() {
    super('DMBAlmanacDB');

    // Schema versioning - increment when schema changes
    this.version(1).stores({
      // Core entities with compound indexes
      songs: 'id, uuid, slug, titleNormalized, timesPlayed, firstPlayedDate, lastPlayedDate, syncedAt',
      songLyrics: 'songId',
      venues: 'id, uuid, slug, nameNormalized, [country+stateProvince], totalShows, syncedAt',
      concerts: 'id, uuid, slug, showDate, venueId, [showDate+venueId], tourName, syncedAt',
      setlistEntries: 'id, concertId, songId, [concertId+setNumber+position], [songId+concertId], syncedAt',
      guests: 'id, uuid, slug, nameNormalized, totalAppearances, syncedAt',
      guestAppearances: 'id, concertId, guestId, setlistEntryId, syncedAt',
      albums: 'id, uuid, slug, releaseDate, albumType, syncedAt',
      albumTracks: 'id, albumId, songId, [albumId+discNumber+trackNumber], syncedAt',

      // User data with pending sync flag
      userAttendance: '++id, concertId, rating, pendingSync, syncedAt',
      userFavorites: '++id, songId, rankOrder, pendingSync, syncedAt',
      userWantToHear: '++id, songId, priority, pendingSync, syncedAt',

      // Meta tables
      syncMetadata: 'tableName',
      searchIndex: '++id, entityType, entityId, text, [entityType+text], popularity'
    });

    // Hooks for automatic sync timestamp updates
    this.songs.hook('creating', (primKey, obj) => {
      obj.syncedAt = Date.now();
    });

    this.songs.hook('updating', (modifications) => {
      return { ...modifications, syncedAt: Date.now() };
    });
  }
}

// Singleton instance
export const db = new DMBAlmanacDB();

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get full concert with venue and setlist
 */
export async function getConcertWithSetlist(concertSlug: string) {
  const concert = await db.concerts.where('slug').equals(concertSlug).first();
  if (!concert) return null;

  const setlist = await db.setlistEntries
    .where('concertId')
    .equals(concert.id)
    .sortBy('setNumber');

  // Sort within sets by position
  setlist.sort((a, b) => {
    if (a.setNumber !== b.setNumber) return a.setNumber - b.setNumber;
    return a.position - b.position;
  });

  // Get guest appearances for this concert
  const appearances = await db.guestAppearances
    .where('concertId')
    .equals(concert.id)
    .toArray();

  return {
    ...concert,
    setlist,
    guestAppearances: appearances
  };
}

/**
 * Get song with performance history
 */
export async function getSongWithHistory(songSlug: string, limit = 50) {
  const song = await db.songs.where('slug').equals(songSlug).first();
  if (!song) return null;

  // Get setlist entries for this song, newest first
  const entries = await db.setlistEntries
    .where('songId')
    .equals(song.id)
    .reverse()
    .limit(limit)
    .toArray();

  // Get concert details for each entry
  const concertIds = [...new Set(entries.map(e => e.concertId))];
  const concerts = await db.concerts.where('id').anyOf(concertIds).toArray();
  const concertMap = new Map(concerts.map(c => [c.id, c]));

  const performances = entries.map(entry => ({
    ...entry,
    concert: concertMap.get(entry.concertId)!
  }));

  return {
    ...song,
    performances
  };
}

/**
 * Fast typeahead search using search index
 */
export async function typeaheadSearch(
  query: string,
  entityTypes: ('song' | 'venue' | 'guest')[] = ['song', 'venue', 'guest'],
  limit = 10
): Promise<SearchIndex[]> {
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 2) return [];

  // Use startsWith for prefix matching (very fast with index)
  const results = await db.searchIndex
    .where('text')
    .startsWith(normalized)
    .filter(item => entityTypes.includes(item.entityType))
    .limit(limit * 2)
    .toArray();

  // Also do a contains search for non-prefix matches
  const containsResults = await db.searchIndex
    .filter(item =>
      entityTypes.includes(item.entityType) &&
      item.text.includes(normalized) &&
      !item.text.startsWith(normalized)
    )
    .limit(limit)
    .toArray();

  // Combine and sort by popularity
  const combined = [...results, ...containsResults];
  combined.sort((a, b) => b.popularity - a.popularity);

  // Deduplicate and limit
  const seen = new Set<string>();
  return combined.filter(item => {
    const key = `${item.entityType}-${item.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

/**
 * Get concerts near a location (uses venue coordinates)
 */
export async function getConcertsNearLocation(
  lat: number,
  lng: number,
  radiusMiles = 100,
  limit = 50
): Promise<(Concert & { distanceMiles: number })[]> {
  // Get all venues with coordinates
  const venues = await db.venues
    .filter(v => v.latitude !== null && v.longitude !== null)
    .toArray();

  // Calculate distances (Haversine formula)
  const venuesWithDistance = venues.map(venue => ({
    venue,
    distance: haversineDistance(lat, lng, venue.latitude!, venue.longitude!)
  }));

  // Filter by radius and get nearby venue IDs
  const nearbyVenueIds = venuesWithDistance
    .filter(v => v.distance <= radiusMiles)
    .map(v => v.venue.id);

  if (nearbyVenueIds.length === 0) return [];

  // Get concerts at nearby venues
  const concerts = await db.concerts
    .where('venueId')
    .anyOf(nearbyVenueIds)
    .reverse()
    .limit(limit)
    .toArray();

  // Add distance to each concert
  const venueDistanceMap = new Map(
    venuesWithDistance.map(v => [v.venue.id, v.distance])
  );

  return concerts.map(concert => ({
    ...concert,
    distanceMiles: venueDistanceMap.get(concert.venueId) || 0
  })).sort((a, b) => a.distanceMiles - b.distanceMiles);
}

// Haversine distance formula
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get user's attended shows with stats
 */
export async function getUserShowStats() {
  const attendance = await db.userAttendance.toArray();
  const concertIds = attendance.map(a => a.concertId);

  if (concertIds.length === 0) {
    return {
      totalShows: 0,
      uniqueVenues: 0,
      uniqueSongs: 0,
      yearBreakdown: {}
    };
  }

  const concerts = await db.concerts.where('id').anyOf(concertIds).toArray();
  const setlistEntries = await db.setlistEntries
    .where('concertId')
    .anyOf(concertIds)
    .toArray();

  const uniqueVenues = new Set(concerts.map(c => c.venueId)).size;
  const uniqueSongs = new Set(setlistEntries.map(e => e.songId)).size;

  // Year breakdown
  const yearBreakdown: Record<string, number> = {};
  concerts.forEach(concert => {
    const year = concert.showDate.substring(0, 4);
    yearBreakdown[year] = (yearBreakdown[year] || 0) + 1;
  });

  return {
    totalShows: concerts.length,
    uniqueVenues,
    uniqueSongs,
    yearBreakdown
  };
}

/**
 * Get songs user hasn't seen from their favorites
 */
export async function getUnseenFavorites() {
  const favorites = await db.userFavorites.toArray();
  if (favorites.length === 0) return [];

  const attendance = await db.userAttendance.toArray();
  const attendedConcertIds = attendance.map(a => a.concertId);

  // Get all songs seen at attended concerts
  const seenSongIds = new Set<number>();
  if (attendedConcertIds.length > 0) {
    const entries = await db.setlistEntries
      .where('concertId')
      .anyOf(attendedConcertIds)
      .toArray();
    entries.forEach(e => seenSongIds.add(e.songId));
  }

  // Filter favorites to unseen
  const unseenFavoriteIds = favorites
    .filter(f => !seenSongIds.has(f.songId))
    .map(f => f.songId);

  if (unseenFavoriteIds.length === 0) return [];

  return db.songs.where('id').anyOf(unseenFavoriteIds).toArray();
}

// ============================================================================
// SYNC STRATEGIES
// ============================================================================

export interface SyncOptions {
  fullSync?: boolean;
  tables?: string[];
  since?: number;  // Timestamp for incremental sync
}

/**
 * Selective sync strategy based on storage constraints
 */
export const SyncStrategy = {
  // Core data (~5MB) - always synced
  CORE: ['songs', 'venues', 'concerts', 'guests'],

  // Extended data (~3MB) - synced if space available
  EXTENDED: ['setlistEntries', 'guestAppearances'],

  // Optional data (~2MB) - synced on demand
  OPTIONAL: ['albums', 'albumTracks', 'songLyrics'],

  // User data - always synced, bidirectional
  USER: ['userAttendance', 'userFavorites', 'userWantToHear']
};

/**
 * Check available storage and adjust sync strategy
 */
export async function determineSyncStrategy(): Promise<string[]> {
  if (!navigator.storage?.estimate) {
    // Fallback: just sync core
    return SyncStrategy.CORE;
  }

  const estimate = await navigator.storage.estimate();
  const usedMB = (estimate.usage || 0) / (1024 * 1024);
  const quotaMB = (estimate.quota || 0) / (1024 * 1024);
  const availableMB = quotaMB - usedMB;

  console.log(`Storage: ${usedMB.toFixed(1)}MB used, ${availableMB.toFixed(1)}MB available`);

  const tables = [...SyncStrategy.CORE, ...SyncStrategy.USER];

  if (availableMB > 20) {
    // Plenty of space: sync everything
    return [...tables, ...SyncStrategy.EXTENDED, ...SyncStrategy.OPTIONAL];
  } else if (availableMB > 10) {
    // Limited space: core + extended
    return [...tables, ...SyncStrategy.EXTENDED];
  } else {
    // Low space: core only
    return tables;
  }
}

/**
 * Batch insert with chunking for large datasets
 */
export async function bulkInsertWithChunking<T>(
  table: Table<T>,
  items: T[],
  chunkSize = 500
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await table.bulkPut(chunk);

    // Yield to main thread periodically
    if (i % (chunkSize * 5) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

/**
 * Build search index from core tables
 */
export async function rebuildSearchIndex(): Promise<void> {
  // Clear existing index
  await db.searchIndex.clear();

  const entries: SearchIndex[] = [];

  // Index songs
  const songs = await db.songs.toArray();
  songs.forEach(song => {
    entries.push({
      entityType: 'song',
      entityId: song.id,
      text: song.titleNormalized,
      slug: song.slug,
      displayText: song.title,
      popularity: song.timesPlayed
    });
  });

  // Index venues
  const venues = await db.venues.toArray();
  venues.forEach(venue => {
    entries.push({
      entityType: 'venue',
      entityId: venue.id,
      text: venue.nameNormalized,
      slug: venue.slug,
      displayText: `${venue.name}, ${venue.city}`,
      popularity: venue.totalShows
    });
  });

  // Index guests
  const guests = await db.guests.toArray();
  guests.forEach(guest => {
    entries.push({
      entityType: 'guest',
      entityId: guest.id,
      text: guest.nameNormalized,
      slug: guest.slug,
      displayText: guest.name,
      popularity: guest.totalAppearances
    });
  });

  // Bulk insert
  await bulkInsertWithChunking(db.searchIndex, entries);
  console.log(`Search index rebuilt: ${entries.length} entries`);
}

/**
 * Sync pending user changes to server
 */
export async function syncPendingUserChanges(): Promise<{
  synced: number;
  failed: number;
}> {
  let synced = 0;
  let failed = 0;

  // Get all pending changes
  const pendingAttendance = await db.userAttendance
    .where('pendingSync')
    .equals(1)  // true stored as 1
    .toArray();

  const pendingFavorites = await db.userFavorites
    .where('pendingSync')
    .equals(1)
    .toArray();

  const pendingWantToHear = await db.userWantToHear
    .where('pendingSync')
    .equals(1)
    .toArray();

  // Sync each type
  // (In real implementation, batch these API calls)
  for (const item of pendingAttendance) {
    try {
      // await api.syncAttendance(item);
      await db.userAttendance.update(item.id!, {
        pendingSync: false,
        syncedAt: Date.now()
      });
      synced++;
    } catch {
      failed++;
    }
  }

  // Similar for favorites and want-to-hear...

  return { synced, failed };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize database with any required setup
 */
export async function initializeDB(): Promise<void> {
  // Check if this is first run
  const syncMeta = await db.syncMetadata.get('songs');

  if (!syncMeta) {
    console.log('First run: database needs initial sync');
    // Initialize sync metadata for all tables
    const tables = [
      'songs', 'venues', 'concerts', 'setlistEntries',
      'guests', 'guestAppearances', 'albums', 'albumTracks'
    ];

    await db.syncMetadata.bulkPut(
      tables.map(tableName => ({
        tableName,
        lastSyncAt: 0,
        lastServerVersion: null,
        recordCount: 0
      }))
    );
  }
}

// Auto-initialize on import
initializeDB().catch(console.error);
