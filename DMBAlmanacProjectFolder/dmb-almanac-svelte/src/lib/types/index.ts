// ==================== CORE ENTITIES ====================

export interface Show {
  id: number;
  date: string; // ISO date: "1991-03-14"
  venueId: number;
  tourId: number;
  notes?: string;
  soundcheck?: string;
  attendanceCount?: number;
  rarityIndex?: number;
  songCount?: number; // Number of songs in setlist

  // Joined fields
  venue?: Venue;
  tour?: Tour;
  setlist?: SetlistEntry[];
  guestAppearances?: GuestAppearance[];
}

export interface SetlistEntry {
  id: number;
  showId: number;
  songId: number;
  position: number; // Order in setlist (1, 2, 3...)
  set: SetType;
  slot: SlotType;
  durationSeconds?: number;
  segueIntoSongId?: number;
  isSegue: boolean;
  isTease: boolean;
  teaseOfSongId?: number;
  notes?: string;

  // Joined fields
  song?: Song;
  teaseOf?: Song;
  releases?: Release[];
  guests?: GuestAppearance[];
}

export type SetType = 'set1' | 'set2' | 'set3' | 'encore' | 'encore2';
export type SlotType = 'opener' | 'closer' | 'standard';

export interface Song {
  id: number;
  title: string;
  slug: string;
  sortTitle?: string; // For alphabetical sorting (without "The", "A")
  originalArtist?: string; // For covers
  isCover: boolean;
  isOriginal?: boolean;
  firstPlayedDate?: string;
  lastPlayedDate?: string;
  totalPerformances: number;
  lyrics?: string;
  notes?: string;

  // Computed fields
  daysSinceLastPlayed?: number;
  showsSinceLastPlayed?: number;
  isLiberated?: boolean;
  openerCount?: number;
  closerCount?: number;
  encoreCount?: number;
}

export interface Venue {
  id: number;
  name: string;
  city: string;
  state?: string;
  country?: string;
  countryCode?: string; // ISO: "US", "CA", "GB"
  venueType?: VenueType;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  totalShows?: number;
  firstShowDate?: string;
  lastShowDate?: string;
  notes?: string;
}

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

export interface Guest {
  id: number;
  name: string;
  slug: string;
  instruments?: string[];
  totalAppearances: number;
  firstAppearanceDate?: string;
  lastAppearanceDate?: string;
  notes?: string;
}

export interface GuestAppearance {
  id: number;
  guestId: number;
  showId: number;
  songIds: number[];
  setlistEntryId?: number;
  instruments?: string[];
  notes?: string;

  // Joined fields
  guest?: Guest;
  show?: Show;
  setlistEntry?: SetlistEntry;
}

export interface Tour {
  id: number;
  name: string; // "Summer 2024", "1997 Spring Tour"
  year: number;
  startDate?: string;
  endDate?: string;
  totalShows?: number;

  // Pre-computed statistics
  uniqueSongsPlayed?: number;
  averageSongsPerShow?: number;
  rarityIndex?: number;
}

export interface Release {
  id: number;
  title: string;
  slug: string;
  releaseType: ReleaseType;
  releaseDate?: string;
  catalogNumber?: string;
  coverArtUrl?: string;
  notes?: string;

  // Joined fields
  tracks?: ReleaseTrack[];
}

export type ReleaseType = 'studio' | 'live' | 'compilation' | 'ep' | 'single' | 'video' | 'box_set';

export interface ReleaseTrack {
  id: number;
  releaseId: number;
  songId: number;
  trackNumber: number;
  discNumber: number;
  durationSeconds?: number;
  showId?: number; // Source show for live tracks
  notes?: string;

  // Joined fields
  song?: Song;
  show?: Show;
}

// ==================== STATISTICS ====================

export interface TourStatistics {
  tourId: number;
  tour: Tour;

  // Performance counts
  totalShows: number;
  totalSongsPerformed: number;
  uniqueSongsPlayed: number;
  catalogCoverage: number; // Percentage of catalog played

  // Rankings
  mostPlayedSongs: SongCount[];
  leastPlayedSongs: SongCount[];
  topOpeners: SongCount[];
  topClosers: SongCount[];
  topEncores: SongCount[];

  // Durations
  longestPerformances: PerformanceDuration[];
  averageShowLength: number;

  // Rarity
  averageRarityIndex: number;
  mostRareShows: ShowRarity[];

  // Liberations
  liberations: Liberation[];
}

export interface SongCount {
  song: Song;
  count: number;
  percentage: number; // % of shows it was played
}

export interface PerformanceDuration {
  setlistEntry: SetlistEntry;
  show: Show;
  song: Song;
  durationSeconds: number;
}

export interface ShowRarity {
  show: Show;
  rarityIndex: number;
}

export interface Liberation {
  song: Song;
  liberationShow: Show;
  previousShow: Show;
  daysBetween: number;
  showsBetween: number;
}

export interface LiberationListEntry {
  song: Song;
  lastPlayedDate: string;
  lastPlayedShow: Show;
  daysSince: number;
  showsSince: number;
  notes?: string;
}

// Additional statistics types
export interface YearBreakdown {
  year: number;
  count: number;
}

export interface ExtendedGlobalStats {
  totalShows: number;
  totalSongs: number;
  totalVenues: number;
  totalGuests: number;
  yearsActive: number;
  totalSetlistEntries: number;
}

export interface SongWithCount {
  song: Song;
  count: number;
}

export interface VenueWithCount {
  venue: Venue;
  showCount: number;
}

// ==================== SEARCH ====================

export interface SetlistSearchCriteria {
  songIds?: number[];
  excludeSongIds?: number[];
  venueId?: number;
  tourId?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  guestId?: number;
  slot?: SlotType;
  minSongs?: number;
  maxSongs?: number;
  hasRelease?: boolean;
}

export interface SearchResult {
  shows: Show[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ==================== API RESPONSES ====================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ShowDetailResponse extends Show {
  setlist: SetlistEntry[];
  previousShow?: Show;
  nextShow?: Show;
  tourStats: {
    showNumber: number;
    totalTourShows: number;
  };
  rarityIndex: number;
}

export interface SongDetailResponse extends Song {
  performanceHistory: PerformanceHistoryEntry[];
  statistics: {
    totalPerformances: number;
    openerCount: number;
    closerCount: number;
    encoreCount: number;
    averageDuration?: number;
    longestPerformance?: PerformanceDuration;
    shortestPerformance?: PerformanceDuration;
  };
  tourBreakdown: TourPerformanceCount[];
  releases: Release[];
  relatedGuests: Guest[];
}

export interface PerformanceHistoryEntry {
  show: Show;
  setlistEntry: SetlistEntry;
  tourName: string;
}

export interface TourPerformanceCount {
  tour: Tour;
  count: number;
  percentage: number;
}

// ==================== UI HELPERS ====================

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ==================== BROWSER APIs ====================
// Re-export browser API types for convenience
// See browser-apis.d.ts for detailed documentation
export type {
  Scheduler,
  YieldOptions,
  PostTaskOptions,
  NavigatorWithInputPending,
  DocumentWithPrerendering,
  ViewTransition,
  SpeculationRulesEagerness,
  SpeculationRulesPrerender,
  SpeculationRulesPrefetch,
  PerformanceScriptTiming,
  PerformanceEntryWithLongAnimationFrame,
} from './browser-apis';

// ==================== WASM HELPERS ====================
// Re-export WASM helper types and utilities for convenience
export type {
  WasmTypedArrayReturn,
  WasmParallelArraysReturn,
  WasmExportsExtended,
} from './wasm-helpers';
export {
  WasmFunctionAccessor,
  isWasmTypedArrayReturn,
  isWasmParallelArraysReturn,
  getWasmFunctionNames,
  hasWasmFunction,
  callWasmFunctionSafe,
} from './wasm-helpers';
