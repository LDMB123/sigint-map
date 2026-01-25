/**
 * DMB Almanac - Dexie Schema Types
 *
 * Comprehensive TypeScript types for the client-side IndexedDB database.
 * These types mirror the SQLite schema but are optimized for client-side
 * offline-first access patterns.
 *
 * Key design decisions:
 * - Denormalized structures for common queries (shows include venue/tour)
 * - Computed fields stored for offline access (daysSince, showsSince)
 * - Efficient indexes for filtering and sorting
 * - Support for both full sync and incremental updates
 */

// ==================== DATABASE META ====================

/**
 * Tracks database sync state and version
 */
export interface SyncMeta {
  id: 'sync_state';
  lastFullSync: number | null;
  lastIncrementalSync: number | null;
  serverVersion: string | null;
  clientVersion: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastError: string | null;
  recordCounts: {
    shows: number;
    songs: number;
    venues: number;
    tours: number;
    guests: number;
    setlistEntries: number;
    liberationList: number;
  };
}

// ==================== VENUE TYPES ====================

export type VenueType =
  | 'amphitheater'
  | 'amphitheatre'
  | 'arena'
  | 'stadium'
  | 'theater'
  | 'theatre'
  | 'club'
  | 'festival'
  | 'outdoor'
  | 'cruise'
  | 'pavilion'
  | 'coliseum'
  | 'other';

/**
 * Venue record - stored as standalone entity
 */
export interface DexieVenue {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
  countryCode: string;
  venueType: VenueType | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  totalShows: number;
  firstShowDate: string | null;
  lastShowDate: string | null;
  notes: string | null;

  // Computed for search
  searchText: string; // "name city state country" concatenated lowercase
}

// ==================== SONG TYPES ====================

/**
 * Song record with performance statistics
 */
export interface DexieSong {
  id: number;
  title: string;
  slug: string;
  sortTitle: string;
  originalArtist: string | null;
  isCover: boolean;
  isOriginal: boolean;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
  totalPerformances: number;
  openerCount: number;
  closerCount: number;
  encoreCount: number;
  lyrics: string | null;
  notes: string | null;

  // Liberation tracking
  isLiberated: boolean;
  daysSinceLastPlayed: number | null;
  showsSinceLastPlayed: number | null;

  // Computed for search
  searchText: string; // "title originalArtist" concatenated lowercase
}

// ==================== TOUR TYPES ====================

/**
 * Tour record
 */
export interface DexieTour {
  id: number;
  name: string;
  year: number;
  startDate: string | null;
  endDate: string | null;
  totalShows: number;
  uniqueSongsPlayed: number | null;
  averageSongsPerShow: number | null;
  rarityIndex: number | null;
}

// ==================== SHOW TYPES ====================

/**
 * Embedded venue info for denormalized show records
 */
export interface EmbeddedVenue {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
  countryCode: string | null;
  venueType: VenueType | null;
  capacity: number | null;
  totalShows: number;
}

/**
 * Embedded tour info for denormalized show records
 */
export interface EmbeddedTour {
  id: number;
  name: string;
  year: number;
  startDate: string | null;
  endDate: string | null;
  totalShows: number;
}

/**
 * Show record - denormalized with venue and tour info
 */
export interface DexieShow {
  id: number;
  date: string; // ISO date: "1991-03-14"
  venueId: number;
  tourId: number;
  notes: string | null;
  soundcheck: string | null;
  attendanceCount: number | null;
  rarityIndex: number | null;
  songCount: number;

  // Embedded for offline access (denormalized)
  venue: EmbeddedVenue;
  tour: EmbeddedTour;

  // For indexing
  year: number; // Extracted from date for filtering
}

// ==================== SETLIST TYPES ====================

export type SetType = 'set1' | 'set2' | 'set3' | 'encore' | 'encore2';
export type SlotType = 'opener' | 'closer' | 'standard';

/**
 * Embedded song info for setlist entries
 */
export interface EmbeddedSong {
  id: number;
  title: string;
  slug: string;
  isCover: boolean;
  totalPerformances: number;
  openerCount: number;
  closerCount: number;
  encoreCount: number;
}

/**
 * Setlist entry - individual song performance in a show
 */
export interface DexieSetlistEntry {
  id: number;
  showId: number;
  songId: number;
  position: number;
  setName: SetType;
  slot: SlotType;
  durationSeconds: number | null;
  segueIntoSongId: number | null;
  isSegue: boolean;
  isTease: boolean;
  teaseOfSongId: number | null;
  notes: string | null;

  // Embedded song info (denormalized)
  song: EmbeddedSong;

  // For efficient queries
  showDate: string; // Denormalized from show
  year: number; // For year-based filtering
}

// ==================== GUEST TYPES ====================

/**
 * Guest musician record
 */
export interface DexieGuest {
  id: number;
  name: string;
  slug: string;
  instruments: string[] | null;
  totalAppearances: number;
  firstAppearanceDate: string | null;
  lastAppearanceDate: string | null;
  notes: string | null;

  // Computed for search
  searchText: string; // "name instruments" concatenated lowercase
}

/**
 * Guest appearance at a show
 */
export interface DexieGuestAppearance {
  id: number;
  guestId: number;
  showId: number;
  setlistEntryId: number | null;
  songId: number | null; // Denormalized from setlist entry
  instruments: string[] | null;
  notes: string | null;

  // For efficient queries
  showDate: string;
  year: number;
}

// ==================== LIBERATION LIST TYPES ====================

export type LiberationConfiguration = 'full_band' | 'dave_tim' | 'dave_solo';

/**
 * Liberation list entry - songs waiting to be played
 */
export interface DexieLiberationEntry {
  id: number;
  songId: number;
  lastPlayedDate: string;
  lastPlayedShowId: number;
  daysSince: number;
  showsSince: number;
  notes: string | null;
  configuration: LiberationConfiguration | null;
  isLiberated: boolean;
  liberatedDate: string | null;
  liberatedShowId: number | null;

  // Embedded song info (denormalized)
  song: {
    id: number;
    title: string;
    slug: string;
    isCover: boolean;
    totalPerformances: number;
  };

  // Embedded show/venue info for display
  lastShow: {
    id: number;
    date: string;
    venue: {
      name: string;
      city: string;
      state: string | null;
    };
  };
}

// ==================== STATISTICS TYPES ====================

/**
 * Song statistics - detailed performance data
 */
export interface DexieSongStatistics {
  id: number;
  songId: number;

  // Slot breakdown
  slotOpener: number;
  slotSet1Closer: number;
  slotSet2Opener: number;
  slotCloser: number;
  slotMidset: number;
  slotEncore: number;
  slotEncore2: number;

  // Version types
  versionFull: number;
  versionTease: number;
  versionPartial: number;
  versionReprise: number;
  versionFake: number;
  versionAborted: number;

  // Duration stats
  avgDurationSeconds: number | null;
  longestDurationSeconds: number | null;
  longestShowId: number | null;
  shortestDurationSeconds: number | null;
  shortestShowId: number | null;

  // Release counts
  releaseCountTotal: number;
  releaseCountStudio: number;
  releaseCountLive: number;

  // Current gap
  currentGapDays: number | null;
  currentGapShows: number | null;

  // JSON fields (stored as objects)
  playsByYear: Record<number, number> | null;
  topSeguesInto: Array<{ songId: number; count: number }> | null;
  topSeguesFrom: Array<{ songId: number; count: number }> | null;
}

// ==================== OFFLINE MUTATION QUEUE TYPES ====================

/**
 * Offline mutation queue item for background sync
 * Stores failed/pending mutations for retry when online
 */
export interface OfflineMutationQueueItem {
  id?: number; // Auto-increment
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: string;
  status: 'pending' | 'retrying' | 'failed' | 'completed';
  retries: number;
  createdAt: number;
  lastError?: string;
  nextRetry?: number;
}

// ==================== TELEMETRY QUEUE TYPES ====================

/**
 * Telemetry queue item for reliable performance metrics delivery
 * Stores telemetry payloads for retry with exponential backoff
 */
export interface TelemetryQueueItem {
  id?: number; // Auto-increment
  payload: any; // PerformanceTelemetry payload
  endpoint: string;
  status: 'pending' | 'retrying' | 'completed' | 'failed';
  retries: number;
  createdAt: number;
  lastError?: string;
  lastErrorCode?: string;
  nextRetry?: number;
}

// ==================== USER DATA TYPES ====================

/**
 * User's attended shows (local only, not synced from server)
 */
export interface UserAttendedShow {
  id?: number;
  showId: number;
  addedAt: number; // timestamp
  notes: string | null;
  rating: number | null; // 1-5 stars

  // Cached show info for offline display
  showDate: string;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  tourName: string;
}

/**
 * User's favorite songs (local only)
 */
export interface UserFavoriteSong {
  id?: number;
  songId: number;
  addedAt: number;

  // Cached song info
  songTitle: string;
  songSlug: string;
}

/**
 * User's favorite venues (local only)
 */
export interface UserFavoriteVenue {
  id?: number;
  venueId: number;
  addedAt: number;

  // Cached venue info
  venueName: string;
  venueCity: string;
  venueState: string | null;
}

// ==================== CURATED LISTS TYPES ====================

export type CuratedListItemType = 'show' | 'song' | 'venue' | 'release' | 'guest' | 'custom';

/**
 * Curated list (e.g., best shows, iconic segues)
 */
export interface DexieCuratedList {
  id: number;
  originalId: string | null;
  title: string;
  slug: string;
  category: string | null;
  description: string | null;
  itemCount: number;
}

/**
 * Item within a curated list
 */
export interface DexieCuratedListItem {
  id: number;
  listId: number;
  position: number;
  itemType: CuratedListItemType;
  itemId: number | null;
  itemTitle: string | null;
  itemLink: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

// ==================== RELEASES TYPES ====================

export type ReleaseType = 'studio' | 'live' | 'compilation' | 'ep' | 'single' | 'video' | 'box_set';

/**
 * Album/release record
 */
export interface DexieRelease {
  id: number;
  title: string;
  slug: string;
  releaseType: ReleaseType;
  releaseDate: string | null;
  catalogNumber: string | null;
  coverArtUrl: string | null;
  trackCount: number;
  notes: string | null;
}

/**
 * Track on a release
 */
export interface DexieReleaseTrack {
  id: number;
  releaseId: number;
  songId: number;
  trackNumber: number;
  discNumber: number;
  durationSeconds: number | null;
  showId: number | null; // Source show for live tracks
  notes: string | null;
}

// ==================== SEARCH TYPES ====================

/**
 * Global search results aggregated type
 * CRITICAL FIX: ID is now a composite string (e.g., "song:123", "venue:45") to prevent
 * collisions between entities with the same numeric ID (e.g., song #1 and venue #1)
 */
export interface SearchResult {
  type: 'song' | 'venue' | 'guest' | 'show';
  id: string;  // Changed from number to string for composite IDs
  title: string;
  subtitle: string | null;
  slug: string | null;
  date: string | null;
  score: number;
}

// ==================== INDEX DEFINITIONS ====================

/**
 * Dexie index configuration for each table.
 * Format: "primaryKey,index1,index2,[multiEntry]index3"
 *
 * Symbols:
 * - ++ = Auto-increment primary key
 * - & = Unique index
 * - * = Multi-entry index (for arrays)
 * - [name+other] = Compound index
 */
export const DEXIE_SCHEMA = {
  // Version 1: Initial schema
  1: {
    // Core entities
    venues: '&id, name, city, state, country, countryCode, venueType, totalShows, searchText',
    songs:
      '&id, &slug, sortTitle, isCover, totalPerformances, lastPlayedDate, isLiberated, searchText',
    tours: '&id, year, name, totalShows',
    shows: '&id, date, venueId, tourId, year, songCount, rarityIndex',
    setlistEntries: '&id, showId, songId, position, setName, slot, showDate, year',

    // Guests
    guests: '&id, &slug, name, totalAppearances, searchText',
    guestAppearances: '&id, guestId, showId, songId, showDate, year',

    // Liberation
    liberationList: '&id, &songId, daysSince, showsSince, isLiberated',

    // Statistics
    songStatistics: '&id, &songId, currentGapDays, currentGapShows',

    // User data (local only)
    userAttendedShows: '++id, &showId, addedAt, showDate',
    userFavoriteSongs: '++id, &songId, addedAt',
    userFavoriteVenues: '++id, &venueId, addedAt',

    // Curated lists
    curatedLists: '&id, &slug, category',
    curatedListItems: '&id, listId, position, itemType',

    // Releases
    releases: '&id, &slug, releaseType, releaseDate',
    releaseTracks: '&id, releaseId, songId, showId',

    // Sync metadata
    syncMeta: '&id',

    // Offline mutation queue
    offlineMutationQueue: '++id, status, createdAt, nextRetry',
  },

  // Version 2: Add compound indexes for common query patterns
  2: {
    // Core entities with compound indexes
    venues: '&id, name, city, state, country, countryCode, venueType, totalShows, searchText',
    songs:
      '&id, &slug, sortTitle, isCover, totalPerformances, lastPlayedDate, isLiberated, searchText, openerCount, closerCount, encoreCount',
    tours: '&id, year, name, totalShows',
    // Compound index [venueId+date] for efficient venue show history
    shows: '&id, date, venueId, tourId, year, songCount, rarityIndex, [venueId+date]',
    // Compound indexes for efficient setlist queries:
    // - [songId+year] for year breakdown per song
    // - [year+slot] for finding openers/closers/encores by year
    setlistEntries:
      '&id, showId, songId, position, setName, slot, showDate, year, [songId+year], [year+slot]',

    // Guests with compound index for year breakdown
    guests: '&id, &slug, name, totalAppearances, searchText',
    // Compound index [guestId+year] for guest year breakdown
    guestAppearances: '&id, guestId, showId, songId, showDate, year, [guestId+year]',

    // Liberation
    liberationList: '&id, &songId, daysSince, showsSince, isLiberated',

    // Statistics
    songStatistics: '&id, &songId, currentGapDays, currentGapShows',

    // User data (local only)
    userAttendedShows: '++id, &showId, addedAt, showDate',
    userFavoriteSongs: '++id, &songId, addedAt',
    userFavoriteVenues: '++id, &venueId, addedAt',

    // Curated lists
    curatedLists: '&id, &slug, category',
    curatedListItems: '&id, listId, position, itemType',

    // Releases
    releases: '&id, &slug, releaseType, releaseDate',
    releaseTracks: '&id, releaseId, songId, showId',

    // Sync metadata
    syncMeta: '&id',

    // Offline mutation queue
    offlineMutationQueue: '++id, status, createdAt, nextRetry',
  },

  // Version 3: Optimized compound indexes for performance
  // Based on query pattern analysis:
  // - [tourId+date] for efficient tour chronological queries
  // - [daysSince+isLiberated] for liberation list filtering
  // - [showId+position] for ordered setlist retrieval
  // - User data compound indexes for efficient lookups
  3: {
    // Core entities - optimized indexes
    // Note: Removed low-selectivity single-field indexes (isCover, isLiberated)
    // These boolean fields have poor selectivity and waste space
    venues: '&id, name, city, state, country, countryCode, venueType, totalShows, searchText',
    songs:
      '&id, &slug, sortTitle, totalPerformances, lastPlayedDate, searchText, openerCount, closerCount, encoreCount, [isLiberated+daysSinceLastPlayed]',
    tours: '&id, year, name, totalShows',
    // Added [tourId+date] for efficient tour show chronology
    shows:
      '&id, date, venueId, tourId, year, songCount, rarityIndex, [venueId+date], [tourId+date]',
    // Added [showId+position] for efficient ordered setlist queries
    setlistEntries:
      '&id, showId, songId, position, setName, slot, showDate, year, [songId+year], [year+slot], [showId+position]',

    // Guests - unchanged
    guests: '&id, &slug, name, totalAppearances, searchText',
    guestAppearances: '&id, guestId, showId, songId, showDate, year, [guestId+year]',

    // Liberation - optimized for common query pattern (non-liberated sorted by daysSince)
    liberationList: '&id, &songId, daysSince, showsSince, [isLiberated+daysSince]',

    // Statistics - unchanged
    songStatistics: '&id, &songId, currentGapDays, currentGapShows',

    // User data - added compound indexes for efficient queries
    userAttendedShows: '++id, &showId, addedAt, showDate, [showDate+showId]',
    userFavoriteSongs: '++id, &songId, addedAt, [addedAt+songId]',
    userFavoriteVenues: '++id, &venueId, addedAt, [addedAt+venueId]',

    // Curated lists - unchanged
    curatedLists: '&id, &slug, category',
    curatedListItems: '&id, listId, position, itemType, [listId+position]',

    // Releases - added compound index for song release lookup
    releases: '&id, &slug, releaseType, releaseDate',
    releaseTracks: '&id, releaseId, songId, showId, [songId+releaseId]',

    // Sync metadata - unchanged
    syncMeta: '&id',

    // Offline mutation queue
    offlineMutationQueue: '++id, status, createdAt, nextRetry',
  },

  // Version 4: Performance optimizations from comprehensive audit
  // Key changes:
  // - Added [songId+showDate] for efficient song→shows queries (30-50% faster)
  // - Added [venueId+year] for venue year breakdown without full scan
  // - Removed 'state' index on venues (low selectivity, rarely queried directly)
  4: {
    // Core entities - optimized indexes
    // Removed 'state' index - use searchText for state-based searches
    venues: '&id, name, city, country, countryCode, venueType, totalShows, searchText',
    songs:
      '&id, &slug, sortTitle, totalPerformances, lastPlayedDate, searchText, openerCount, closerCount, encoreCount, [isLiberated+daysSinceLastPlayed]',
    tours: '&id, year, name, totalShows',
    // Added [venueId+year] for venue year breakdown queries
    shows:
      '&id, date, venueId, tourId, year, songCount, rarityIndex, [venueId+date], [tourId+date], [venueId+year]',
    // Added [songId+showDate] for efficient song→shows chronological queries
    // This enables 30-50% faster getShowsForSong() for popular songs (500+ performances)
    setlistEntries:
      '&id, showId, songId, position, setName, slot, showDate, year, [songId+year], [year+slot], [showId+position], [songId+showDate]',

    // Guests - unchanged
    guests: '&id, &slug, name, totalAppearances, searchText',
    guestAppearances: '&id, guestId, showId, songId, showDate, year, [guestId+year]',

    // Liberation - optimized for common query pattern (non-liberated sorted by daysSince)
    liberationList: '&id, &songId, daysSince, showsSince, [isLiberated+daysSince]',

    // Statistics - unchanged
    songStatistics: '&id, &songId, currentGapDays, currentGapShows',

    // User data - compound indexes for efficient queries
    userAttendedShows: '++id, &showId, addedAt, showDate, [showDate+showId]',
    userFavoriteSongs: '++id, &songId, addedAt, [addedAt+songId]',
    userFavoriteVenues: '++id, &venueId, addedAt, [addedAt+venueId]',

    // Curated lists - unchanged
    curatedLists: '&id, &slug, category',
    curatedListItems: '&id, listId, position, itemType, [listId+position]',

    // Releases - compound index for song release lookup
    releases: '&id, &slug, releaseType, releaseDate',
    releaseTracks: '&id, releaseId, songId, showId, [songId+releaseId]',

    // Sync metadata - unchanged
    syncMeta: '&id',

    // Offline mutation queue
    offlineMutationQueue: '++id, status, createdAt, nextRetry',
  },

  // Version 5: Add compound index for offline mutation queue
  // - [status+createdAt] enables efficient queries for pending/retrying mutations
  //   ordered by creation time (FIFO processing) in a single index lookup
  5: {
    // Core entities - unchanged from v4
    venues: '&id, name, city, country, countryCode, venueType, totalShows, searchText',
    songs:
      '&id, &slug, sortTitle, totalPerformances, lastPlayedDate, searchText, openerCount, closerCount, encoreCount, [isLiberated+daysSinceLastPlayed]',
    tours: '&id, year, name, totalShows',
    shows:
      '&id, date, venueId, tourId, year, songCount, rarityIndex, [venueId+date], [tourId+date], [venueId+year]',
    setlistEntries:
      '&id, showId, songId, position, setName, slot, showDate, year, [songId+year], [year+slot], [showId+position], [songId+showDate]',

    // Guests - unchanged
    guests: '&id, &slug, name, totalAppearances, searchText',
    guestAppearances: '&id, guestId, showId, songId, showDate, year, [guestId+year]',

    // Liberation - unchanged
    liberationList: '&id, &songId, daysSince, showsSince, [isLiberated+daysSince]',

    // Statistics - unchanged
    songStatistics: '&id, &songId, currentGapDays, currentGapShows',

    // User data - unchanged
    userAttendedShows: '++id, &showId, addedAt, showDate, [showDate+showId]',
    userFavoriteSongs: '++id, &songId, addedAt, [addedAt+songId]',
    userFavoriteVenues: '++id, &venueId, addedAt, [addedAt+venueId]',

    // Curated lists - unchanged
    curatedLists: '&id, &slug, category',
    curatedListItems: '&id, listId, position, itemType, [listId+position]',

    // Releases - unchanged
    releases: '&id, &slug, releaseType, releaseDate',
    releaseTracks: '&id, releaseId, songId, showId, [songId+releaseId]',

    // Sync metadata - unchanged
    syncMeta: '&id',

    // Offline mutation queue - NEW: compound index [status+createdAt]
    // Enables efficient FIFO queries for pending/retrying mutations:
    // - db.offlineMutationQueue.where('[status+createdAt]').between(['pending', 0], ['pending', Infinity])
    // - Replaces: .where('status').anyOf(['pending', 'retrying']).sortBy('createdAt')
    offlineMutationQueue: '++id, status, createdAt, nextRetry, [status+createdAt]',

    // Telemetry queue - NEW: reliable telemetry delivery with retry
    // Same pattern as offlineMutationQueue for consistency
    telemetryQueue: '++id, status, createdAt, nextRetry, [status+createdAt]',
  },
} as const;

/**
 * INDEX USAGE DOCUMENTATION
 *
 * Maps indexes to their query patterns and complexity.
 * Complexity notation: O(1) = constant, O(log n) = index lookup, +k = returning k items
 *
 * | Table            | Index                  | Query Pattern                    | Complexity    |
 * |------------------|------------------------|----------------------------------|---------------|
 * | songs            | &slug                  | getSongBySlug()                  | O(1)          |
 * | songs            | sortTitle              | getAllSongs() ordered            | O(n)          |
 * | songs            | totalPerformances      | getTopSongsByPerformances()      | O(log n) + k  |
 * | songs            | searchText             | searchSongs() prefix             | O(log n) + k  |
 * | songs            | openerCount            | getTopOpeningSongs()             | O(log n) + k  |
 * | songs            | closerCount            | getTopClosingSongs()             | O(log n) + k  |
 * | songs            | encoreCount            | getTopEncoreSongs()              | O(log n) + k  |
 * | shows            | date                   | getAllShows(), getRecentShows()  | O(log n) + k  |
 * | shows            | year                   | getShowsByYear(), getYearRange() | O(log n) + k  |
 * | shows            | venueId                | getShowsByVenue()                | O(log n) + k  |
 * | shows            | [venueId+date]         | getVenueShows() chronological    | O(log n) + k  |
 * | shows            | [tourId+date]          | getShowsForTour() chronological  | O(log n) + k  |
 * | setlistEntries   | [showId+position]      | getSetlistForShow() ordered      | O(log n) + k  |
 * | setlistEntries   | songId                 | getShowsForSong()                | O(log n) + k  |
 * | setlistEntries   | [songId+year]          | getYearBreakdownForSong()        | O(log n) + k  |
 * | setlistEntries   | [year+slot]            | getTopOpenersByYear()            | O(log n) + k  |
 * | setlistEntries   | slot                   | topOpeningSongs store            | O(log n) + k  |
 * | guestAppearances | guestId                | getAppearancesByGuest()          | O(log n) + k  |
 * | guestAppearances | [guestId+year]         | getYearBreakdownForGuest()       | O(log n) + k  |
 * | liberationList   | [isLiberated+daysSince]| getLiberationList()              | O(log n) + k  |
 * | venues           | totalShows             | getTopVenuesByShows()            | O(log n) + k  |
 * | venues           | searchText             | searchVenues() prefix            | O(log n) + k  |
 * | guests           | &slug                  | getGuestBySlug()                 | O(1)          |
 * | guests           | searchText             | searchGuests() prefix            | O(log n) + k  |
 *
 * Selectivity Notes:
 * - Boolean fields (isCover, isLiberated) removed in v3 due to ~50% selectivity
 * - Use .filter() for in-memory filtering on boolean fields instead
 * - Compound indexes list most-selective field first for optimal B-tree traversal
 */

/**
 * Current database version
 * v1: Initial schema
 * v2: Added compound indexes for common query patterns
 * v3: Optimized compound indexes for performance:
 *     - [tourId+date] for tour chronological queries
 *     - [isLiberated+daysSince] for liberation list
 *     - [showId+position] for ordered setlist retrieval
 *     - User data compound indexes
 *     - Removed low-selectivity boolean indexes
 * v4: Performance optimizations from comprehensive audit:
 *     - [songId+showDate] for 30-50% faster song→shows queries
 *     - [venueId+year] for venue year breakdown without full scan
 *     - Removed 'state' index on venues (low selectivity)
 * v5: Offline mutation queue optimization:
 *     - [status+createdAt] compound index for efficient FIFO queue processing
 *     - Enables single-index lookup for pending/retrying mutations ordered by time
 *     - Added telemetryQueue table for reliable performance metrics delivery
 */
export const CURRENT_DB_VERSION = 5;

/**
 * Database name
 */
export const DB_NAME = 'dmb-almanac';

// ==================== TYPE GUARDS ====================

export function isDexieVenue(obj: unknown): obj is DexieVenue {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj && 'city' in obj;
}

export function isDexieSong(obj: unknown): obj is DexieSong {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'title' in obj && 'slug' in obj;
}

export function isDexieShow(obj: unknown): obj is DexieShow {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'date' in obj && 'venue' in obj;
}
