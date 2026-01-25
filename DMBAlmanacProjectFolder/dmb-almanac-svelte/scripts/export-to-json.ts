#!/usr/bin/env node

/**
 * DMB Almanac - SQLite to JSON Export Script
 *
 * Exports all data from SQLite database to JSON files that can be used to seed
 * IndexedDB via Dexie. This enables the PWA to load data directly from static
 * JSON files without needing a server API.
 *
 * Usage:
 *   npx ts-node scripts/export-to-json.ts
 */

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

// ==================== TYPES ====================

// Database row types for type-safe queries
interface _VenueRow {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
  country_code: string;
  venue_type: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  total_shows: number;
  first_show_date: string | null;
  last_show_date: string | null;
  notes: string | null;
}

interface SongRow {
  id: number;
  title: string;
  slug: string;
  sort_title: string;
  original_artist: string | null;
  is_cover: number;
  is_original: number;
  first_played_date: string | null;
  last_played_date: string | null;
  total_performances: number;
  opener_count: number;
  closer_count: number;
  encore_count: number;
  lyrics: string | null;
  notes: string | null;
  composer: string | null;
  composer_year: number | null;
  album_id: string | null;
  album_name: string | null;
  avg_length_seconds: number | null;
  song_history: string | null;
}

interface TourRow {
  id: number;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  total_shows: number;
  unique_songs_played: number | null;
  average_songs_per_show: number | null;
  rarity_index: number | null;
}

interface ShowRow {
  id: number;
  date: string;
  venue_id: number;
  tour_id: number;
  notes: string | null;
  soundcheck: string | null;
  attendance_count: number | null;
  rarity_index: number | null;
  song_count: number;
}

interface SetlistEntryRow {
  id: number;
  show_id: number;
  song_id: number;
  set_name: string;
  position: number;
  slot: string;
  duration_seconds: number | null;
  segue_into_song_id: number | null;
  is_segue: number;
  is_tease: number;
  tease_of_song_id: number | null;
  notes: string | null;
}

interface GuestRow {
  id: number;
  name: string;
  slug: string;
  instruments: string | null;
  total_appearances: number;
  first_appearance_date: string | null;
  last_appearance_date: string | null;
  notes: string | null;
  albums: string | null;
}

interface GuestAppearanceRow {
  id: number;
  show_id: number;
  guest_id: number;
  instruments: string | null;
  setlist_entry_id: number | null;
  notes: string | null;
}

interface SetlistEntrySongIdRow {
  song_id: number;
}

interface LiberationRow {
  song_id: number;
  days_since: number | null;
  shows_since: number | null;
}

interface LiberationListQueryRow {
  id: number;
  song_id: number;
  title: string;
  slug: string;
  is_cover: number;
  total_performances: number;
  last_played_date: string | null;
  last_played_show_id: number;
  days_since: number | null;
  shows_since: number | null;
  notes: string | null;
  configuration: string | null;
  is_liberated: number;
  liberated_date: string | null;
  liberated_show_id: number | null;
  date: string;
  venue_name: string;
  venue_city: string;
  venue_state: string | null;
}

interface SongStatisticsRow {
  id: number;
  song_id: number;
  slot_opener: number;
  slot_set1_closer: number;
  slot_set2_opener: number;
  slot_closer: number;
  slot_midset: number;
  slot_encore: number;
  slot_encore2: number;
  version_full: number;
  version_tease: number;
  version_partial: number;
  version_reprise: number;
  version_fake: number;
  version_aborted: number;
  avg_duration_seconds: number | null;
  longest_duration_seconds: number | null;
  longest_show_id: number | null;
  shortest_duration_seconds: number | null;
  shortest_show_id: number | null;
  release_count_total: number;
  release_count_studio: number;
  release_count_live: number;
  current_gap_days: number | null;
  current_gap_shows: number | null;
  plays_by_year: string | null;
  top_segues_into: string | null;
  top_segues_from: string | null;
}

type VenueType =
  | "amphitheater"
  | "amphitheatre"
  | "arena"
  | "stadium"
  | "theater"
  | "theatre"
  | "club"
  | "festival"
  | "outdoor"
  | "cruise"
  | "pavilion"
  | "coliseum"
  | "other";

type SetType = "set1" | "set2" | "set3" | "encore" | "encore2";
type SlotType = "opener" | "closer" | "standard";
type LiberationConfiguration = "full_band" | "dave_tim" | "dave_solo";
type ReleaseType = "studio" | "live" | "compilation" | "ep" | "single" | "video" | "box_set";

interface DexieVenue {
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
  searchText: string;
}

interface DexieSong {
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
  composer: string | null;
  composerYear: number | null;
  albumId: string | null;
  albumName: string | null;
  avgLengthSeconds: number | null;
  songHistory: string | null;
  isLiberated: boolean;
  daysSinceLastPlayed: number | null;
  showsSinceLastPlayed: number | null;
  searchText: string;
}

interface DexieTour {
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

interface EmbeddedVenue {
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

interface EmbeddedTour {
  id: number;
  name: string;
  year: number;
  startDate: string | null;
  endDate: string | null;
  totalShows: number;
}

interface DexieShow {
  id: number;
  date: string;
  venueId: number;
  tourId: number;
  notes: string | null;
  soundcheck: string | null;
  attendanceCount: number | null;
  rarityIndex: number | null;
  songCount: number;
  venue: EmbeddedVenue;
  tour: EmbeddedTour;
  year: number;
}

interface EmbeddedSong {
  id: number;
  title: string;
  slug: string;
  isCover: boolean;
  totalPerformances: number;
  openerCount: number;
  closerCount: number;
  encoreCount: number;
}

interface DexieSetlistEntry {
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
  song: EmbeddedSong;
  showDate: string;
  year: number;
}

interface DexieGuest {
  id: number;
  name: string;
  slug: string;
  instruments: string[] | null;
  totalAppearances: number;
  firstAppearanceDate: string | null;
  lastAppearanceDate: string | null;
  notes: string | null;
  albums: string[] | null;
  searchText: string;
}

interface DexieGuestAppearance {
  id: number;
  guestId: number;
  showId: number;
  setlistEntryId: number | null;
  songId: number | null;
  instruments: string[] | null;
  notes: string | null;
  showDate: string;
  year: number;
}

interface DexieLiberationEntry {
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
  song: {
    id: number;
    title: string;
    slug: string;
    isCover: boolean;
    totalPerformances: number;
  };
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

interface DexieSongStatistics {
  id: number;
  songId: number;
  slotOpener: number;
  slotSet1Closer: number;
  slotSet2Opener: number;
  slotCloser: number;
  slotMidset: number;
  slotEncore: number;
  slotEncore2: number;
  versionFull: number;
  versionTease: number;
  versionPartial: number;
  versionReprise: number;
  versionFake: number;
  versionAborted: number;
  avgDurationSeconds: number | null;
  longestDurationSeconds: number | null;
  longestShowId: number | null;
  shortestDurationSeconds: number | null;
  shortestShowId: number | null;
  releaseCountTotal: number;
  releaseCountStudio: number;
  releaseCountLive: number;
  currentGapDays: number | null;
  currentGapShows: number | null;
  playsByYear: Record<number, number> | null;
  topSeguesInto: Array<{ songId: number; count: number }> | null;
  topSeguesFrom: Array<{ songId: number; count: number }> | null;
}

interface VenueTopSongRow {
  venue_id: number;
  venue_name: string;
  song_id: number;
  song_title: string;
  play_count: number;
}

interface DexieVenueTopSong {
  venueId: number;
  venueName: string;
  songId: number;
  songTitle: string;
  playCount: number;
}

interface ThisDayInHistoryRow {
  id: number;
  date: string;
  date_month: number;
  date_day: number;
  year: string;
  venue_id: number;
  venue_name: string;
  venue_city: string;
  venue_state: string | null;
  venue_country: string;
  notes: string | null;
  song_count: number;
}

interface DexieThisDayInHistory {
  id: number;
  date: string;
  dateMonth: number;
  dateDay: number;
  year: string;
  venueId: number;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  venueCountry: string;
  notes: string | null;
  songCount: number;
}

interface ShowDetailsRow {
  id: number;
  date: string;
  notes: string | null;
  soundcheck: string | null;
  rarity_index: number | null;
  song_count: number;
  venue_id: number;
  venue_name: string;
  venue_city: string;
  venue_state: string | null;
  venue_country: string;
  venue_type: string | null;
  tour_id: number;
  tour_name: string;
  tour_year: number;
}

interface DexieShowDetails {
  id: number;
  date: string;
  notes: string | null;
  soundcheck: string | null;
  rarityIndex: number | null;
  songCount: number;
  venueId: number;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  venueCountry: string;
  venueType: VenueType | null;
  tourId: number;
  tourName: string;
  tourYear: number;
}

interface CuratedListRow {
  id: number;
  original_id: string | null;
  title: string;
  slug: string;
  category: string;
  description: string | null;
  item_count: number;
  is_featured: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface DexieCuratedList {
  id: number;
  originalId: string | null;
  title: string;
  slug: string;
  category: string;
  description: string | null;
  itemCount: number;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CuratedListItemRow {
  id: number;
  list_id: number;
  position: number;
  item_type: string;
  show_id: number | null;
  song_id: number | null;
  venue_id: number | null;
  guest_id: number | null;
  release_id: number | null;
  item_title: string;
  item_link: string | null;
  notes: string | null;
  metadata: string | null;
  created_at: string;
}

interface DexieCuratedListItem {
  id: number;
  listId: number;
  position: number;
  itemType: string;
  showId: number | null;
  songId: number | null;
  venueId: number | null;
  guestId: number | null;
  releaseId: number | null;
  itemTitle: string;
  itemLink: string | null;
  notes: string | null;
  metadata: string | null;
  createdAt: string;
}

interface SongStatsRow {
  id: number;
  title: string;
  slug: string;
  sort_title: string;
  original_artist: string | null;
  is_cover: number;
  is_original: number;
  first_played_date: string | null;
  last_played_date: string | null;
  total_performances: number;
  opener_count: number;
  closer_count: number;
  encore_count: number;
  lyrics: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  days_since_last: number | null;
  shows_since_last: number | null;
}

interface DexieSongStats {
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
  createdAt: string;
  updatedAt: string;
  daysSinceLast: number | null;
  showsSinceLast: number | null;
}

interface RecentShowRow {
  id: number;
  date: string;
  notes: string | null;
  soundcheck: string | null;
  rarity_index: number | null;
  song_count: number;
  venue_id: number;
  venue_name: string;
  venue_city: string;
  venue_state: string | null;
  venue_country: string;
  venue_type: string | null;
  tour_id: number;
  tour_name: string;
  tour_year: number;
}

interface DexieRecentShow {
  id: number;
  date: string;
  notes: string | null;
  soundcheck: string | null;
  rarityIndex: number | null;
  songCount: number;
  venueId: number;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  venueCountry: string;
  venueType: VenueType | null;
  tourId: number;
  tourName: string;
  tourYear: number;
}

interface ReleaseRow {
  id: number;
  title: string;
  slug: string;
  release_type: string;
  release_date: string | null;
  catalog_number: string | null;
  cover_art_url: string | null;
  track_count: number;
  notes: string | null;
}

interface DexieRelease {
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

interface ReleaseTrackRow {
  id: number;
  release_id: number;
  song_id: number;
  track_number: number;
  disc_number: number;
  duration_seconds: number | null;
  show_id: number | null;
  notes: string | null;
}

interface DexieReleaseTrack {
  id: number;
  releaseId: number;
  songId: number;
  trackNumber: number;
  discNumber: number;
  durationSeconds: number | null;
  showId: number | null;
  notes: string | null;
}

interface ExportManifest {
  version: string;
  timestamp: string;
  recordCounts: {
    venues: number;
    songs: number;
    tours: number;
    shows: number;
    setlistEntries: number;
    guests: number;
    guestAppearances: number;
    liberationList: number;
    songStatistics: number;
    venueTopSongs: number;
    thisDayInHistory: number;
    showDetails: number;
    curatedLists: number;
    curatedListItems: number;
    songStats: number;
    recentShows: number;
    releases: number;
    releaseTracks: number;
  };
  totalSize: number;
  files: {
    name: string;
    path: string;
    recordCount: number;
    size: number;
  }[];
}

// ==================== DATABASE QUERIES ====================

function getDb(): Database.Database {
  const dbPath = join(process.cwd(), "data", "dmb-almanac.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("cache_size = -64000");
  return db;
}

function extractYear(dateString: string): number {
  return parseInt(dateString.split("-")[0], 10);
}

function createSearchText(fields: (string | null | undefined)[]): string {
  return fields
    .filter((f): f is string => f != null)
    .join(" ")
    .toLowerCase();
}

function parseJsonField(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ==================== EXPORT FUNCTIONS ====================

function exportVenues(db: Database.Database): DexieVenue[] {
  interface VenueRow {
    id: number;
    name: string;
    city: string;
    state: string | null;
    country: string;
    country_code: string;
    venue_type: string | null;
    capacity: number | null;
    latitude: number | null;
    longitude: number | null;
    total_shows: number;
    first_show_date: string | null;
    last_show_date: string | null;
    notes: string | null;
  }
  const rows = db.prepare("SELECT * FROM venues ORDER BY id").all() as VenueRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state || null,
    country: row.country,
    countryCode: row.country_code,
    venueType: (row.venue_type || null) as VenueType | null,
    capacity: row.capacity || null,
    latitude: row.latitude || null,
    longitude: row.longitude || null,
    totalShows: row.total_shows,
    firstShowDate: row.first_show_date || null,
    lastShowDate: row.last_show_date || null,
    notes: row.notes || null,
    searchText: createSearchText([row.name, row.city, row.state, row.country]),
  }));
}

function exportSongs(db: Database.Database): DexieSong[] {
  const rows = db.prepare("SELECT * FROM songs ORDER BY id").all() as SongRow[];

  const liberationIds = new Set(
    db
      .prepare("SELECT song_id FROM liberation_list")
      .all()
      .map((r) => (r as { song_id: number }).song_id)
  );

  return rows.map((row) => {
    const liberationRow = db
      .prepare("SELECT days_since, shows_since FROM liberation_list WHERE song_id = ?")
      .get(row.id) as LiberationRow | undefined;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      sortTitle: row.sort_title,
      originalArtist: row.original_artist || null,
      isCover: Boolean(row.is_cover),
      isOriginal: Boolean(row.is_original),
      firstPlayedDate: row.first_played_date || null,
      lastPlayedDate: row.last_played_date || null,
      totalPerformances: row.total_performances,
      openerCount: row.opener_count,
      closerCount: row.closer_count,
      encoreCount: row.encore_count,
      lyrics: row.lyrics || null,
      notes: row.notes || null,
      composer: row.composer || null,
      composerYear: row.composer_year || null,
      albumId: row.album_id || null,
      albumName: row.album_name || null,
      avgLengthSeconds: row.avg_length_seconds || null,
      songHistory: row.song_history || null,
      isLiberated: liberationIds.has(row.id),
      daysSinceLastPlayed: liberationRow?.days_since || null,
      showsSinceLastPlayed: liberationRow?.shows_since || null,
      searchText: createSearchText([row.title, row.original_artist]),
    };
  });
}

function exportTours(db: Database.Database): DexieTour[] {
  const rows = db.prepare("SELECT * FROM tours ORDER BY id").all() as TourRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    year: row.year,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    totalShows: row.total_shows,
    uniqueSongsPlayed: row.unique_songs_played || null,
    averageSongsPerShow: row.average_songs_per_show || null,
    rarityIndex: row.rarity_index || null,
  }));
}

function exportShows(db: Database.Database, venues: DexieVenue[], tours: DexieTour[]): DexieShow[] {
  const rows = db.prepare("SELECT * FROM shows ORDER BY id").all() as ShowRow[];

  const venuesById = new Map(venues.map((v) => [v.id, v]));
  const toursById = new Map(tours.map((t) => [t.id, t]));

  return rows.map((row) => {
    const venue = venuesById.get(row.venue_id);
    const tour = toursById.get(row.tour_id);

    if (!venue || !tour) {
      throw new Error(`Missing venue or tour for show ${row.id}`);
    }

    return {
      id: row.id,
      date: row.date,
      venueId: row.venue_id,
      tourId: row.tour_id,
      notes: row.notes || null,
      soundcheck: row.soundcheck || null,
      attendanceCount: row.attendance_count || null,
      rarityIndex: row.rarity_index || null,
      songCount: row.song_count,
      venue: {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        countryCode: venue.countryCode,
        venueType: venue.venueType,
        capacity: venue.capacity,
        totalShows: venue.totalShows,
      },
      tour: {
        id: tour.id,
        name: tour.name,
        year: tour.year,
        startDate: tour.startDate,
        endDate: tour.endDate,
        totalShows: tour.totalShows,
      },
      year: extractYear(row.date),
    };
  });
}

function exportSetlistEntries(
  db: Database.Database,
  songs: DexieSong[],
  shows: DexieShow[]
): DexieSetlistEntry[] {
  const rows = db.prepare("SELECT * FROM setlist_entries ORDER BY id").all() as SetlistEntryRow[];

  const songsById = new Map(songs.map((s) => [s.id, s]));
  const showsById = new Map(shows.map((s) => [s.id, s]));

  return rows.map((row) => {
    const song = songsById.get(row.song_id);
    const show = showsById.get(row.show_id);

    if (!song || !show) {
      throw new Error(`Missing song or show for setlist entry ${row.id}`);
    }

    return {
      id: row.id,
      showId: row.show_id,
      songId: row.song_id,
      position: row.position,
      setName: row.set_name as SetType,
      slot: row.slot as SlotType,
      durationSeconds: row.duration_seconds || null,
      segueIntoSongId: row.segue_into_song_id || null,
      isSegue: Boolean(row.is_segue),
      isTease: Boolean(row.is_tease),
      teaseOfSongId: row.tease_of_song_id || null,
      notes: row.notes || null,
      song: {
        id: song.id,
        title: song.title,
        slug: song.slug,
        isCover: song.isCover,
        totalPerformances: song.totalPerformances,
        openerCount: song.openerCount,
        closerCount: song.closerCount,
        encoreCount: song.encoreCount,
      },
      showDate: show.date,
      year: show.year,
    };
  });
}

function exportGuests(db: Database.Database): DexieGuest[] {
  const rows = db.prepare("SELECT * FROM guests ORDER BY id").all() as GuestRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    instruments: parseJsonField(row.instruments),
    totalAppearances: row.total_appearances,
    firstAppearanceDate: row.first_appearance_date || null,
    lastAppearanceDate: row.last_appearance_date || null,
    notes: row.notes || null,
    albums: parseJsonField(row.albums),
    searchText: createSearchText([row.name, parseJsonField(row.instruments)?.join(" ")]),
  }));
}

function exportGuestAppearances(db: Database.Database, shows: DexieShow[]): DexieGuestAppearance[] {
  const rows = db
    .prepare("SELECT * FROM guest_appearances ORDER BY id")
    .all() as GuestAppearanceRow[];

  const showsById = new Map(shows.map((s) => [s.id, s]));

  return rows.map((row) => {
    const show = showsById.get(row.show_id);
    if (!show) {
      throw new Error(`Missing show for guest appearance ${row.id}`);
    }

    // Get song_id from setlist entry if needed
    let songId: number | null = null;
    if (row.setlist_entry_id) {
      const entry = db
        .prepare("SELECT song_id FROM setlist_entries WHERE id = ?")
        .get(row.setlist_entry_id) as SetlistEntrySongIdRow | undefined;
      if (entry) {
        songId = entry.song_id;
      }
    }

    return {
      id: row.id,
      guestId: row.guest_id,
      showId: row.show_id,
      setlistEntryId: row.setlist_entry_id || null,
      songId,
      instruments: parseJsonField(row.instruments),
      notes: row.notes || null,
      showDate: show.date,
      year: show.year,
    };
  });
}

function exportLiberationList(db: Database.Database, songs: DexieSong[]): DexieLiberationEntry[] {
  const rows = db
    .prepare(
      `
    SELECT
      ll.*,
      s.title,
      s.slug,
      s.is_cover,
      s.total_performances,
      sh.date,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state
    FROM liberation_list ll
    JOIN songs s ON ll.song_id = s.id
    JOIN shows sh ON ll.last_played_show_id = sh.id
    JOIN venues v ON sh.venue_id = v.id
    ORDER BY ll.id
    `
    )
    .all() as LiberationListQueryRow[];

  const _songsById = new Map(songs.map((s) => [s.id, s]));

  return rows.map((row) => ({
    id: row.id,
    songId: row.song_id,
    lastPlayedDate: row.last_played_date || "",
    lastPlayedShowId: row.last_played_show_id,
    daysSince: row.days_since || 0,
    showsSince: row.shows_since || 0,
    notes: row.notes || null,
    configuration: (row.configuration || null) as LiberationConfiguration | null,
    isLiberated: Boolean(row.is_liberated),
    liberatedDate: row.liberated_date || null,
    liberatedShowId: row.liberated_show_id || null,
    song: {
      id: row.song_id,
      title: row.title,
      slug: row.slug,
      isCover: Boolean(row.is_cover),
      totalPerformances: row.total_performances,
    },
    lastShow: {
      id: row.last_played_show_id,
      date: row.date,
      venue: {
        name: row.venue_name,
        city: row.venue_city,
        state: row.venue_state || null,
      },
    },
  }));
}

function exportSongStatistics(db: Database.Database): DexieSongStatistics[] {
  const rows = db.prepare("SELECT * FROM song_statistics ORDER BY id").all() as SongStatisticsRow[];

  return rows.map((row) => ({
    id: row.id,
    songId: row.song_id,
    slotOpener: row.slot_opener,
    slotSet1Closer: row.slot_set1_closer,
    slotSet2Opener: row.slot_set2_opener,
    slotCloser: row.slot_closer,
    slotMidset: row.slot_midset,
    slotEncore: row.slot_encore,
    slotEncore2: row.slot_encore2,
    versionFull: row.version_full,
    versionTease: row.version_tease,
    versionPartial: row.version_partial,
    versionReprise: row.version_reprise,
    versionFake: row.version_fake,
    versionAborted: row.version_aborted,
    avgDurationSeconds: row.avg_duration_seconds || null,
    longestDurationSeconds: row.longest_duration_seconds || null,
    longestShowId: row.longest_show_id || null,
    shortestDurationSeconds: row.shortest_duration_seconds || null,
    shortestShowId: row.shortest_show_id || null,
    releaseCountTotal: row.release_count_total,
    releaseCountStudio: row.release_count_studio,
    releaseCountLive: row.release_count_live,
    currentGapDays: row.current_gap_days || null,
    currentGapShows: row.current_gap_shows || null,
    playsByYear: parseJsonField(row.plays_by_year),
    topSeguesInto: parseJsonField(row.top_segues_into),
    topSeguesFrom: parseJsonField(row.top_segues_from),
  }));
}

function exportVenueTopSongs(db: Database.Database): DexieVenueTopSong[] {
  const rows = db.prepare("SELECT * FROM venue_top_songs").all() as VenueTopSongRow[];

  return rows.map((row) => ({
    venueId: row.venue_id,
    venueName: row.venue_name,
    songId: row.song_id,
    songTitle: row.song_title,
    playCount: row.play_count,
  }));
}

function exportThisDayInHistory(db: Database.Database): DexieThisDayInHistory[] {
  const rows = db.prepare("SELECT * FROM this_day_in_history").all() as ThisDayInHistoryRow[];

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    dateMonth: row.date_month,
    dateDay: row.date_day,
    year: row.year,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueCity: row.venue_city,
    venueState: row.venue_state || null,
    venueCountry: row.venue_country,
    notes: row.notes || null,
    songCount: row.song_count,
  }));
}

function exportShowDetails(db: Database.Database): DexieShowDetails[] {
  const rows = db.prepare("SELECT * FROM show_details ORDER BY id").all() as ShowDetailsRow[];

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    notes: row.notes || null,
    soundcheck: row.soundcheck || null,
    rarityIndex: row.rarity_index || null,
    songCount: row.song_count,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueCity: row.venue_city,
    venueState: row.venue_state || null,
    venueCountry: row.venue_country,
    venueType: (row.venue_type || null) as VenueType | null,
    tourId: row.tour_id,
    tourName: row.tour_name,
    tourYear: row.tour_year,
  }));
}

function exportCuratedLists(db: Database.Database): DexieCuratedList[] {
  const rows = db.prepare("SELECT * FROM curated_lists ORDER BY sort_order, id").all() as CuratedListRow[];

  return rows.map((row) => ({
    id: row.id,
    originalId: row.original_id || null,
    title: row.title,
    slug: row.slug,
    category: row.category,
    description: row.description || null,
    itemCount: row.item_count,
    isFeatured: Boolean(row.is_featured),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function exportCuratedListItems(db: Database.Database): DexieCuratedListItem[] {
  const rows = db
    .prepare("SELECT * FROM curated_list_items ORDER BY list_id, position")
    .all() as CuratedListItemRow[];

  return rows.map((row) => ({
    id: row.id,
    listId: row.list_id,
    position: row.position,
    itemType: row.item_type,
    showId: row.show_id || null,
    songId: row.song_id || null,
    venueId: row.venue_id || null,
    guestId: row.guest_id || null,
    releaseId: row.release_id || null,
    itemTitle: row.item_title,
    itemLink: row.item_link || null,
    notes: row.notes || null,
    metadata: row.metadata || null,
    createdAt: row.created_at,
  }));
}

function exportSongStats(db: Database.Database): DexieSongStats[] {
  const rows = db.prepare("SELECT * FROM song_stats ORDER BY id").all() as SongStatsRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    sortTitle: row.sort_title,
    originalArtist: row.original_artist || null,
    isCover: Boolean(row.is_cover),
    isOriginal: Boolean(row.is_original),
    firstPlayedDate: row.first_played_date || null,
    lastPlayedDate: row.last_played_date || null,
    totalPerformances: row.total_performances,
    openerCount: row.opener_count,
    closerCount: row.closer_count,
    encoreCount: row.encore_count,
    lyrics: row.lyrics || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    daysSinceLast: row.days_since_last || null,
    showsSinceLast: row.shows_since_last || null,
  }));
}

function exportRecentShows(db: Database.Database): DexieRecentShow[] {
  const rows = db.prepare("SELECT * FROM recent_shows").all() as RecentShowRow[];

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    notes: row.notes || null,
    soundcheck: row.soundcheck || null,
    rarityIndex: row.rarity_index || null,
    songCount: row.song_count,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueCity: row.venue_city,
    venueState: row.venue_state || null,
    venueCountry: row.venue_country,
    venueType: (row.venue_type || null) as VenueType | null,
    tourId: row.tour_id,
    tourName: row.tour_name,
    tourYear: row.tour_year,
  }));
}

function exportReleases(db: Database.Database): DexieRelease[] {
  const rows = db.prepare("SELECT * FROM releases ORDER BY id").all() as ReleaseRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    releaseType: row.release_type as ReleaseType,
    releaseDate: row.release_date || null,
    catalogNumber: row.catalog_number || null,
    coverArtUrl: row.cover_art_url || null,
    trackCount: row.track_count,
    notes: row.notes || null,
  }));
}

function exportReleaseTracks(db: Database.Database): DexieReleaseTrack[] {
  const rows = db.prepare("SELECT * FROM release_tracks ORDER BY id").all() as ReleaseTrackRow[];

  return rows.map((row) => ({
    id: row.id,
    releaseId: row.release_id,
    songId: row.song_id,
    trackNumber: row.track_number,
    discNumber: row.disc_number,
    durationSeconds: row.duration_seconds || null,
    showId: row.show_id || null,
    notes: row.notes || null,
  }));
}

// ==================== FILE WRITING ====================

function writeJsonFile(
  filePath: string,
  data: any
): { path: string; size: number; recordCount: number } {
  const jsonString = JSON.stringify(data, null, 2);
  writeFileSync(filePath, jsonString, "utf-8");

  const stats = statSync(filePath);
  const recordCount = Array.isArray(data) ? data.length : 1;

  console.log(`  ✓ ${filePath} (${recordCount} records, ${(stats.size / 1024).toFixed(2)} KB)`);

  return {
    path: filePath,
    size: stats.size,
    recordCount,
  };
}

// ==================== MAIN ====================

async function main() {
  console.log("DMB Almanac - SQLite to JSON Export");
  console.log("===================================\n");

  try {
    // Ensure output directory exists (SvelteKit uses static/ for static assets)
    const dataDir = join(process.cwd(), "static", "data");
    mkdirSync(dataDir, { recursive: true });

    // Open database
    const db = getDb();
    console.log("Connected to database\n");

    // Export data in dependency order
    console.log("Exporting core entities...");
    const venues = exportVenues(db);
    const songs = exportSongs(db);
    const tours = exportTours(db);

    console.log("Exporting dependent entities...");
    const shows = exportShows(db, venues, tours);
    const setlistEntries = exportSetlistEntries(db, songs, shows);
    const guests = exportGuests(db);
    const guestAppearances = exportGuestAppearances(db, shows);
    const liberationList = exportLiberationList(db, songs);
    const songStatistics = exportSongStatistics(db);

    console.log("Exporting views and additional tables...");
    const venueTopSongs = exportVenueTopSongs(db);
    const thisDayInHistory = exportThisDayInHistory(db);
    const showDetails = exportShowDetails(db);
    const curatedLists = exportCuratedLists(db);
    const curatedListItems = exportCuratedListItems(db);
    const songStats = exportSongStats(db);
    const recentShows = exportRecentShows(db);
    const releases = exportReleases(db);
    const releaseTracks = exportReleaseTracks(db);

    db.close();

    console.log("\nWriting JSON files...");

    // Write files
    const files: { name: string; path: string; recordCount: number; size: number }[] = [];

    files.push({
      name: "venues.json",
      ...writeJsonFile(join(dataDir, "venues.json"), venues),
    });

    files.push({
      name: "songs.json",
      ...writeJsonFile(join(dataDir, "songs.json"), songs),
    });

    files.push({
      name: "tours.json",
      ...writeJsonFile(join(dataDir, "tours.json"), tours),
    });

    files.push({
      name: "shows.json",
      ...writeJsonFile(join(dataDir, "shows.json"), shows),
    });

    files.push({
      name: "setlist-entries.json",
      ...writeJsonFile(join(dataDir, "setlist-entries.json"), setlistEntries),
    });

    files.push({
      name: "guests.json",
      ...writeJsonFile(join(dataDir, "guests.json"), guests),
    });

    files.push({
      name: "guest-appearances.json",
      ...writeJsonFile(join(dataDir, "guest-appearances.json"), guestAppearances),
    });

    files.push({
      name: "liberation-list.json",
      ...writeJsonFile(join(dataDir, "liberation-list.json"), liberationList),
    });

    files.push({
      name: "song-statistics.json",
      ...writeJsonFile(join(dataDir, "song-statistics.json"), songStatistics),
    });

    files.push({
      name: "venue-top-songs.json",
      ...writeJsonFile(join(dataDir, "venue-top-songs.json"), venueTopSongs),
    });

    files.push({
      name: "this-day-in-history.json",
      ...writeJsonFile(join(dataDir, "this-day-in-history.json"), thisDayInHistory),
    });

    files.push({
      name: "show-details.json",
      ...writeJsonFile(join(dataDir, "show-details.json"), showDetails),
    });

    files.push({
      name: "curated-lists.json",
      ...writeJsonFile(join(dataDir, "curated-lists.json"), curatedLists),
    });

    files.push({
      name: "curated-list-items.json",
      ...writeJsonFile(join(dataDir, "curated-list-items.json"), curatedListItems),
    });

    files.push({
      name: "song-stats.json",
      ...writeJsonFile(join(dataDir, "song-stats.json"), songStats),
    });

    files.push({
      name: "recent-shows.json",
      ...writeJsonFile(join(dataDir, "recent-shows.json"), recentShows),
    });

    files.push({
      name: "releases.json",
      ...writeJsonFile(join(dataDir, "releases.json"), releases),
    });

    files.push({
      name: "release-tracks.json",
      ...writeJsonFile(join(dataDir, "release-tracks.json"), releaseTracks),
    });

    // Create manifest
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const manifest: ExportManifest = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      recordCounts: {
        venues: venues.length,
        songs: songs.length,
        tours: tours.length,
        shows: shows.length,
        setlistEntries: setlistEntries.length,
        guests: guests.length,
        guestAppearances: guestAppearances.length,
        liberationList: liberationList.length,
        songStatistics: songStatistics.length,
        venueTopSongs: venueTopSongs.length,
        thisDayInHistory: thisDayInHistory.length,
        showDetails: showDetails.length,
        curatedLists: curatedLists.length,
        curatedListItems: curatedListItems.length,
        songStats: songStats.length,
        recentShows: recentShows.length,
        releases: releases.length,
        releaseTracks: releaseTracks.length,
      },
      totalSize,
      files,
    };

    writeJsonFile(join(dataDir, "manifest.json"), manifest);

    console.log("\n===================================");
    console.log("Export Summary");
    console.log("===================================");
    console.log(`Venues:             ${venues.length}`);
    console.log(`Songs:              ${songs.length}`);
    console.log(`Tours:              ${tours.length}`);
    console.log(`Shows:              ${shows.length}`);
    console.log(`Setlist Entries:    ${setlistEntries.length}`);
    console.log(`Guests:             ${guests.length}`);
    console.log(`Guest Appearances:  ${guestAppearances.length}`);
    console.log(`Liberation List:    ${liberationList.length}`);
    console.log(`Song Statistics:    ${songStatistics.length}`);
    console.log(`Venue Top Songs:    ${venueTopSongs.length}`);
    console.log(`This Day History:   ${thisDayInHistory.length}`);
    console.log(`Show Details:       ${showDetails.length}`);
    console.log(`Curated Lists:      ${curatedLists.length}`);
    console.log(`Curated Items:      ${curatedListItems.length}`);
    console.log(`Song Stats:         ${songStats.length}`);
    console.log(`Recent Shows:       ${recentShows.length}`);
    console.log(`Releases:           ${releases.length}`);
    console.log(`Release Tracks:     ${releaseTracks.length}`);
    console.log(`\nTotal Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Output: ${dataDir}`);
    console.log("\nExport completed successfully!");
  } catch (error) {
    console.error("Error during export:", error);
    process.exit(1);
  }
}

main();
