// Scraped data types - raw data from website before normalization

export interface ScrapedShow {
  originalId: string;
  date: string;
  venueName: string;
  city: string;
  state?: string;
  country: string;
  tourYear: number;
  tourName?: string;
  notes?: string;
  soundcheck?: string;
  setlist: ScrapedSetlistEntry[];
  guests: ScrapedGuestAppearance[];
}

export interface ScrapedSetlistEntry {
  songTitle: string;
  position: number;
  set: string; // 'set1', 'set2', 'encore', etc.
  slot: "opener" | "closer" | "standard";
  duration?: string; // "7:23" format
  isSegue: boolean;
  segueIntoTitle?: string;
  isTease: boolean;
  teaseOfTitle?: string;
  hasRelease: boolean;
  releaseTitle?: string;
  guestNames: string[];
  notes?: string;
}

export interface ScrapedGuestAppearance {
  name: string;
  instruments: string[];
  songs?: string[]; // Song titles they appeared on
}

export interface ScrapedSong {
  originalId?: string;
  title: string;
  originalArtist?: string;
  isCover: boolean;
  lyrics?: string;
  notes?: string;
  firstPlayedDate?: string;
  lastPlayedDate?: string;
  totalPlays?: number;
}

// Enhanced song statistics from SongStats.aspx pages
export interface SongStatistics {
  originalId: string;
  title: string;

  // Slot breakdown
  slotBreakdown: {
    opener: number;
    set1Closer: number;
    set2Opener: number;
    closer: number;
    midset: number;
    encore: number;
    encore2: number;
  };

  // Version types
  versionTypes: {
    full: number;
    tease: number;
    partial: number;
    reprise: number;
    fake: number;
    aborted: number;
  };

  // Duration stats
  avgLengthSeconds: number | null;
  longestVersion: {
    durationSeconds: number;
    date: string;
    showId: string;
    venue: string;
  } | null;
  shortestVersion: {
    durationSeconds: number;
    date: string;
    showId: string;
    venue: string;
  } | null;

  // Segue information
  topSeguesInto: Array<{
    songTitle: string;
    songId: string;
    count: number;
  }>;
  topSeguesFrom: Array<{
    songTitle: string;
    songId: string;
    count: number;
  }>;

  // Release counts by type
  releaseCounts: {
    total: number;
    studio: number;
    live: number;
    dmblive: number;
    warehouse: number;
    liveTrax: number;
    broadcasts: number;
  };

  // Play breakdown by year
  playsByYear: Array<{
    year: number;
    plays: number;
  }>;

  // Artist-specific stats (DMB vs Dave & Tim)
  artistStats: Array<{
    artistName: string;
    playCount: number;
    avgLength: number | null;
    percentOfTotal: number;
  }>;

  // Liberation/gap stats
  liberations: Array<{
    lastPlayedDate: string;
    lastPlayedShowId: string;
    daysSince: number;
    showsSince: number;
    liberationDate: string;
    liberationShowId: string;
  }>;

  // Additional metadata
  totalPlays: number;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
  yearsActive: number;
  currentGap: {
    days: number;
    shows: number;
  } | null;

  // Full performance history
  performances: SongPerformance[];
}

export interface SongPerformance {
  showId: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  country: string;
  duration?: string;
  position?: number;
  slot?: "opener" | "set1_closer" | "set2_opener" | "closer" | "midset" | "encore" | "encore2";
  set?: "set1" | "set2" | "encore" | "encore2";
  version?: "full" | "tease" | "partial" | "reprise" | "fake" | "aborted";
  isTease: boolean;
  isSegue: boolean;
  isOnRelease: boolean;
  releaseTitle?: string;
  notes?: string;
  guests: string[]; // Guest names
}


export interface ScrapedVenue {
  originalId?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  venueType?: string;
  capacity?: number;
  totalShows?: number;
}

export interface ScrapedVenueStats {
  originalId: string;
  venueName: string;
  city: string;
  state?: string;
  country: string;
  firstShowDate?: string;
  lastShowDate?: string;
  totalShows: number;
  capacity?: number;
  akaNames: string[];
  topSongs: { title: string; playCount: number }[];
  notes?: string;
  notablePerformances: string[];
  shows: VenueShow[];
}

export interface VenueShow {
  showId: string;
  date: string;
  year: number;
  songCount: number;
  notes?: string;
  isOnRelease?: boolean;
  releaseTitle?: string;
}

export interface ScrapedGuest {
  originalId?: string;
  name: string;
  instruments: string[];
  totalAppearances?: number;
}

export interface ScrapedRelease {
  originalId?: string;
  title: string;
  releaseType: string;
  releaseDate?: string;
  catalogNumber?: string;
  coverArtUrl?: string;
  tracks: ScrapedReleaseTrack[];
  notes?: string;
}

export interface ScrapedReleaseTrack {
  trackNumber: number;
  discNumber: number;
  songTitle: string;
  duration?: string;
  showDate?: string; // For live tracks
  venueName?: string;
}

export interface ScrapedTour {
  name: string;
  year: number;
  showCount: number;
  showUrls: string[];
}

export interface ScrapedTourDetailed {
  originalId: string;        // tid from URL
  name: string;              // Tour name (e.g. "Summer 2025")
  slug: string;              // URL-friendly slug
  year: number;              // Primary tour year
  startDate?: string;        // ISO date string
  endDate?: string;          // ISO date string
  showCount: number;         // Number of shows
  venueCount?: number;       // Number of unique venues
  songCount?: number;        // Number of unique songs played
  totalSongPerformances?: number; // Total songs across all shows
  averageSongsPerShow?: number;
  topSongs?: { title: string; playCount: number }[];
  notes?: string;
}

// Scraper output for saving to JSON
export interface ScraperOutput {
  scrapedAt: string;
  source: string;
  totalItems: number;
}

export interface ShowsOutput extends ScraperOutput {
  shows: ScrapedShow[];
}

export interface SongsOutput extends ScraperOutput {
  songs: ScrapedSong[];
}

export interface SongStatsOutput extends ScraperOutput {
  stats: SongStatistics[];
}

export interface VenuesOutput extends ScraperOutput {
  venues: ScrapedVenue[];
}

export interface GuestsOutput extends ScraperOutput {
  guests: ScrapedGuest[];
}

export interface ReleasesOutput extends ScraperOutput {
  releases: ScrapedRelease[];
}

export interface ToursOutput extends ScraperOutput {
  tours: ScrapedTour[];
}

export interface ToursDetailedOutput extends ScraperOutput {
  tours: ScrapedTourDetailed[];
}

export interface GuestShowAppearance {
  showId: string;
  showDate: string;
  venueName: string;
  city: string;
  state?: string;
  country: string;
  songs: GuestSongAppearance[];
}

export interface GuestSongAppearance {
  songTitle: string;
  songId?: string;
  instruments: string[];
  position?: number;
  set?: string;
}

export interface ScrapedGuestShows {
  guestId: string;
  guestName: string;
  totalAppearances: number;
  firstAppearanceDate?: string;
  lastAppearanceDate?: string;
  appearances: GuestShowAppearance[];
}

export interface GuestShowsOutput extends ScraperOutput {
  guestShows: ScrapedGuestShows[];
}

export interface ScrapedLiberationEntry {
  songId: string;
  songTitle: string;
  lastPlayedDate: string; // ISO format YYYY-MM-DD
  lastPlayedShowId: string;
  daysSince: number;
  showsSince: number;
  notes?: string;
  configuration: "full_band" | "dave_tim" | "dave_solo";
  isLiberated: boolean;
  liberatedDate?: string;
  liberatedShowId?: string;
}

export interface LiberationOutput extends ScraperOutput {
  entries: ScrapedLiberationEntry[];
}

export interface VenueStatsOutput extends ScraperOutput {
  venueStats: ScrapedVenueStats[];
}

// This Day in History types
export interface HistoryDayShow {
  originalId: string;        // Show ID from URL (id=)
  showDate: string;          // Full date in YYYY-MM-DD format
  year: number;              // Year the show occurred
  venueName: string;         // Venue name
  city: string;              // City
  state?: string;            // State (if USA)
  country: string;           // Country
  notes?: string;            // Special notes (anniversaries, etc.)
}

export interface HistoryDay {
  month: number;             // 1-12
  day: number;               // 1-31
  calendarDate: string;      // MM-DD format for easy lookup
  shows: HistoryDayShow[];   // All shows on this calendar date
  totalYears: number;        // Number of unique years
  firstYear?: number;        // First year DMB played on this date
  lastYear?: number;         // Most recent year
  yearsSinceLastPlayed?: number; // Gap from last performance
}

export interface HistoryOutput extends ScraperOutput {
  days: HistoryDay[];
}

// Curated Lists types
export interface ScrapedList {
  originalId: string;        // List ID from URL (lid=)
  title: string;             // List title
  slug: string;              // URL-friendly slug
  category: string;          // Category (Songs, Venues, Shows, etc.)
  description?: string;      // List description/purpose
  itemCount: number;         // Number of items in list
  items: ScrapedListItem[];  // List items
}

export interface ScrapedListItem {
  position: number;          // Position in list
  itemType: "show" | "song" | "venue" | "guest" | "release" | "text";
  itemId?: string;           // Original ID from dmbalmanac
  itemTitle: string;         // Item title/name
  itemLink?: string;         // Link to item page
  notes?: string;            // Item notes/context
  metadata?: Record<string, string>; // Additional data (dates, counts, etc.)
}

export interface ListsOutput extends ScraperOutput {
  lists: ScrapedList[];
}

// Rarity data types
export interface ScrapedShowRarity {
  showId: string;
  date: string;
  venueName: string;
  city: string;
  state?: string;
  rarityIndex: number; // e.g., 2.000 = songs played every 2 shows on average
}

export interface ScrapedTourRarity {
  tourName: string;
  year: number;
  averageRarityIndex: number;
  differentSongsPlayed: number;
  totalSongsInShow?: number; // Average songs per show
  catalogPercentage?: number; // Percentage of total catalog
  rank?: number; // Ranking by rarity
  shows: ScrapedShowRarity[];
}

export interface RarityOutput extends ScraperOutput {
  totalTours: number;
  totalShows: number;
  tours: ScrapedTourRarity[];
  metadata?: {
    totalCatalogSongs?: number;
    rarityCalculationMethod?: string;
  };
}
