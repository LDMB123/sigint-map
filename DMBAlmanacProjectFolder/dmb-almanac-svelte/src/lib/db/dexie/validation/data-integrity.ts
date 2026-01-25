/**
 * Data Integrity Validator
 *
 * Comprehensive validation for all entity types in the DMB Almanac database.
 * Checks foreign key integrity, orphaned records, and data consistency.
 *
 * Key capabilities:
 * - Check foreign key integrity (songId, venueId, showId references)
 * - Check for orphaned records
 * - Validate embedded data matches source records
 * - Generate comprehensive validation reports
 */

import { getDb } from '../db';
import type {
  DexieSetlistEntry,
  DexieShow,
  DexieGuestAppearance,
  DexieLiberationEntry,
  DexieReleaseTrack,
  DexieCuratedListItem,
} from '../schema';

// ==================== TYPES ====================

/**
 * Foreign key violation details
 */
export interface ForeignKeyViolation {
  table: string;
  recordId: number;
  foreignKeyField: string;
  invalidValue: number;
  referencedTable: string;
}

/**
 * Orphaned record details
 */
export interface OrphanedRecord {
  table: string;
  recordId: number;
  reason: string;
}

/**
 * Embedded data mismatch
 */
export interface EmbeddedDataMismatch {
  table: string;
  recordId: number;
  field: string;
  embeddedValue: unknown;
  sourceValue: unknown;
  sourceTable: string;
  sourceId: number;
}

/**
 * Table statistics for validation
 */
export interface TableStats {
  tableName: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  foreignKeyViolations: number;
  orphanedRecords: number;
  embeddedMismatches: number;
}

/**
 * Comprehensive validation result
 */
export interface DataIntegrityResult {
  isValid: boolean;
  totalTables: number;
  totalRecords: number;
  totalViolations: number;

  // Detailed violations
  foreignKeyViolations: ForeignKeyViolation[];
  orphanedRecords: OrphanedRecord[];
  embeddedDataMismatches: EmbeddedDataMismatch[];

  // Per-table stats
  tableStats: TableStats[];

  // Timing
  validationTime: number;
  timestamp: Date;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Check foreign key constraints (default: true) */
  checkForeignKeys?: boolean;
  /** Check for orphaned records (default: true) */
  checkOrphans?: boolean;
  /** Check embedded data matches source (default: true) */
  checkEmbeddedData?: boolean;
  /** Maximum violations to collect before stopping (default: 1000) */
  maxViolations?: number;
  /** Progress callback */
  onProgress?: (progress: { phase: string; table: string; percent: number }) => void;
}

// ==================== FOREIGN KEY VALIDATION ====================

/**
 * Validate setlist entries have valid foreign keys
 */
async function validateSetlistEntryForeignKeys(
  maxViolations: number
): Promise<ForeignKeyViolation[]> {
  const db = getDb();
  const violations: ForeignKeyViolation[] = [];

  // Get all valid IDs for referenced tables
  const [validShowIds, validSongIds] = await Promise.all([
    db.shows.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
    db.songs.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
  ]);

  // Check setlist entries
  await db.setlistEntries.each((entry: DexieSetlistEntry) => {
    if (violations.length >= maxViolations) return;

    if (!validShowIds.has(entry.showId)) {
      violations.push({
        table: 'setlistEntries',
        recordId: entry.id,
        foreignKeyField: 'showId',
        invalidValue: entry.showId,
        referencedTable: 'shows',
      });
    }

    if (!validSongIds.has(entry.songId)) {
      violations.push({
        table: 'setlistEntries',
        recordId: entry.id,
        foreignKeyField: 'songId',
        invalidValue: entry.songId,
        referencedTable: 'songs',
      });
    }

    // Check segue references (optional fields)
    if (entry.segueIntoSongId && !validSongIds.has(entry.segueIntoSongId)) {
      violations.push({
        table: 'setlistEntries',
        recordId: entry.id,
        foreignKeyField: 'segueIntoSongId',
        invalidValue: entry.segueIntoSongId,
        referencedTable: 'songs',
      });
    }

    if (entry.teaseOfSongId && !validSongIds.has(entry.teaseOfSongId)) {
      violations.push({
        table: 'setlistEntries',
        recordId: entry.id,
        foreignKeyField: 'teaseOfSongId',
        invalidValue: entry.teaseOfSongId,
        referencedTable: 'songs',
      });
    }
  });

  return violations;
}

/**
 * Validate shows have valid foreign keys (venueId, tourId)
 */
async function validateShowForeignKeys(maxViolations: number): Promise<ForeignKeyViolation[]> {
  const db = getDb();
  const violations: ForeignKeyViolation[] = [];

  const [validVenueIds, validTourIds] = await Promise.all([
    db.venues.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
    db.tours.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
  ]);

  await db.shows.each((show: DexieShow) => {
    if (violations.length >= maxViolations) return;

    if (!validVenueIds.has(show.venueId)) {
      violations.push({
        table: 'shows',
        recordId: show.id,
        foreignKeyField: 'venueId',
        invalidValue: show.venueId,
        referencedTable: 'venues',
      });
    }

    if (!validTourIds.has(show.tourId)) {
      violations.push({
        table: 'shows',
        recordId: show.id,
        foreignKeyField: 'tourId',
        invalidValue: show.tourId,
        referencedTable: 'tours',
      });
    }
  });

  return violations;
}

/**
 * Validate guest appearances have valid foreign keys
 */
async function validateGuestAppearanceForeignKeys(
  maxViolations: number
): Promise<ForeignKeyViolation[]> {
  const db = getDb();
  const violations: ForeignKeyViolation[] = [];

  const [validGuestIds, validShowIds, validSongIds] = await Promise.all([
    db.guests.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
    db.shows.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
    db.songs.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
  ]);

  await db.guestAppearances.each((appearance: DexieGuestAppearance) => {
    if (violations.length >= maxViolations) return;

    if (!validGuestIds.has(appearance.guestId)) {
      violations.push({
        table: 'guestAppearances',
        recordId: appearance.id,
        foreignKeyField: 'guestId',
        invalidValue: appearance.guestId,
        referencedTable: 'guests',
      });
    }

    if (!validShowIds.has(appearance.showId)) {
      violations.push({
        table: 'guestAppearances',
        recordId: appearance.id,
        foreignKeyField: 'showId',
        invalidValue: appearance.showId,
        referencedTable: 'shows',
      });
    }

    if (appearance.songId && !validSongIds.has(appearance.songId)) {
      violations.push({
        table: 'guestAppearances',
        recordId: appearance.id,
        foreignKeyField: 'songId',
        invalidValue: appearance.songId,
        referencedTable: 'songs',
      });
    }
  });

  return violations;
}

/**
 * Validate liberation list entries have valid foreign keys
 */
async function validateLiberationForeignKeys(
  maxViolations: number
): Promise<ForeignKeyViolation[]> {
  const db = getDb();
  const violations: ForeignKeyViolation[] = [];

  const [validSongIds, validShowIds] = await Promise.all([
    db.songs.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
    db.shows.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
  ]);

  await db.liberationList.each((entry: DexieLiberationEntry) => {
    if (violations.length >= maxViolations) return;

    if (!validSongIds.has(entry.songId)) {
      violations.push({
        table: 'liberationList',
        recordId: entry.id,
        foreignKeyField: 'songId',
        invalidValue: entry.songId,
        referencedTable: 'songs',
      });
    }

    if (!validShowIds.has(entry.lastPlayedShowId)) {
      violations.push({
        table: 'liberationList',
        recordId: entry.id,
        foreignKeyField: 'lastPlayedShowId',
        invalidValue: entry.lastPlayedShowId,
        referencedTable: 'shows',
      });
    }

    if (entry.liberatedShowId && !validShowIds.has(entry.liberatedShowId)) {
      violations.push({
        table: 'liberationList',
        recordId: entry.id,
        foreignKeyField: 'liberatedShowId',
        invalidValue: entry.liberatedShowId,
        referencedTable: 'shows',
      });
    }
  });

  return violations;
}

/**
 * Validate release tracks have valid foreign keys
 */
async function validateReleaseTrackForeignKeys(
  maxViolations: number
): Promise<ForeignKeyViolation[]> {
  const db = getDb();
  const violations: ForeignKeyViolation[] = [];

  const [validReleaseIds, validSongIds, validShowIds] = await Promise.all([
    db.releases.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
    db.songs.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
    db.shows.toCollection().primaryKeys().then((keys) => new Set(keys as number[])),
  ]);

  await db.releaseTracks.each((track: DexieReleaseTrack) => {
    if (violations.length >= maxViolations) return;

    if (!validReleaseIds.has(track.releaseId)) {
      violations.push({
        table: 'releaseTracks',
        recordId: track.id,
        foreignKeyField: 'releaseId',
        invalidValue: track.releaseId,
        referencedTable: 'releases',
      });
    }

    if (!validSongIds.has(track.songId)) {
      violations.push({
        table: 'releaseTracks',
        recordId: track.id,
        foreignKeyField: 'songId',
        invalidValue: track.songId,
        referencedTable: 'songs',
      });
    }

    if (track.showId && !validShowIds.has(track.showId)) {
      violations.push({
        table: 'releaseTracks',
        recordId: track.id,
        foreignKeyField: 'showId',
        invalidValue: track.showId,
        referencedTable: 'shows',
      });
    }
  });

  return violations;
}

/**
 * Validate curated list items have valid foreign keys
 */
async function validateCuratedListItemForeignKeys(
  maxViolations: number
): Promise<ForeignKeyViolation[]> {
  const db = getDb();
  const violations: ForeignKeyViolation[] = [];

  const validListIds = await db.curatedLists
    .toCollection()
    .primaryKeys()
    .then((keys) => new Set(keys as number[]));

  await db.curatedListItems.each((item: DexieCuratedListItem) => {
    if (violations.length >= maxViolations) return;

    if (!validListIds.has(item.listId)) {
      violations.push({
        table: 'curatedListItems',
        recordId: item.id,
        foreignKeyField: 'listId',
        invalidValue: item.listId,
        referencedTable: 'curatedLists',
      });
    }
  });

  return violations;
}

// ==================== ORPHAN DETECTION ====================

/**
 * Cached reference sets for orphan detection
 * Populated by collectShowReferences() to avoid redundant iterations
 */
interface ShowReferences {
  venuesWithShows: Set<number>;
  toursWithShows: Set<number>;
}

let cachedShowReferences: ShowReferences | null = null;

/**
 * Collect venue and tour references from shows in a single pass
 * This avoids iterating shows twice (once for venues, once for tours)
 */
async function collectShowReferences(): Promise<ShowReferences> {
  // Return cached if available (cleared after orphan detection completes)
  if (cachedShowReferences) {
    return cachedShowReferences;
  }

  const db = getDb();
  const venuesWithShows = new Set<number>();
  const toursWithShows = new Set<number>();

  // Single pass through shows to collect both venue and tour references
  await db.shows.each((show: DexieShow) => {
    venuesWithShows.add(show.venueId);
    toursWithShows.add(show.tourId);
  });

  cachedShowReferences = { venuesWithShows, toursWithShows };
  return cachedShowReferences;
}

/**
 * Clear cached show references after orphan detection
 */
function clearShowReferencesCache(): void {
  cachedShowReferences = null;
}

/**
 * Find songs with no setlist entries (potentially orphaned)
 */
async function findOrphanedSongs(): Promise<OrphanedRecord[]> {
  const db = getDb();
  const orphans: OrphanedRecord[] = [];

  // Get all song IDs that have setlist entries
  const songsWithEntries = new Set<number>();
  await db.setlistEntries.each((entry: DexieSetlistEntry) => {
    songsWithEntries.add(entry.songId);
  });

  // Find songs without any entries
  await db.songs.each((song) => {
    if (!songsWithEntries.has(song.id)) {
      // Only flag as orphan if totalPerformances is also 0
      // (songs with 0 entries but non-zero count are data issues, not orphans)
      if (song.totalPerformances === 0) {
        orphans.push({
          table: 'songs',
          recordId: song.id,
          reason: 'No setlist entries and totalPerformances is 0',
        });
      }
    }
  });

  return orphans;
}

/**
 * Find venues with no shows
 * Uses cached show references to avoid redundant iteration
 */
async function findOrphanedVenues(): Promise<OrphanedRecord[]> {
  const db = getDb();
  const orphans: OrphanedRecord[] = [];

  // Get venue references from single-pass cache
  const { venuesWithShows } = await collectShowReferences();

  // Find venues without any shows
  await db.venues.each((venue) => {
    if (!venuesWithShows.has(venue.id)) {
      if (venue.totalShows === 0) {
        orphans.push({
          table: 'venues',
          recordId: venue.id,
          reason: 'No shows and totalShows is 0',
        });
      }
    }
  });

  return orphans;
}

/**
 * Find tours with no shows
 * Uses cached show references to avoid redundant iteration
 */
async function findOrphanedTours(): Promise<OrphanedRecord[]> {
  const db = getDb();
  const orphans: OrphanedRecord[] = [];

  // Get tour references from single-pass cache
  const { toursWithShows } = await collectShowReferences();

  // Find tours without any shows
  await db.tours.each((tour) => {
    if (!toursWithShows.has(tour.id)) {
      if (tour.totalShows === 0) {
        orphans.push({
          table: 'tours',
          recordId: tour.id,
          reason: 'No shows and totalShows is 0',
        });
      }
    }
  });

  return orphans;
}

/**
 * Find guests with no appearances
 */
async function findOrphanedGuests(): Promise<OrphanedRecord[]> {
  const db = getDb();
  const orphans: OrphanedRecord[] = [];

  // Get all guest IDs with appearances
  const guestsWithAppearances = new Set<number>();
  await db.guestAppearances.each((appearance: DexieGuestAppearance) => {
    guestsWithAppearances.add(appearance.guestId);
  });

  // Find guests without any appearances
  await db.guests.each((guest) => {
    if (!guestsWithAppearances.has(guest.id)) {
      if (guest.totalAppearances === 0) {
        orphans.push({
          table: 'guests',
          recordId: guest.id,
          reason: 'No appearances and totalAppearances is 0',
        });
      }
    }
  });

  return orphans;
}

// ==================== EMBEDDED DATA VALIDATION ====================

/**
 * Validate embedded song data in setlist entries matches source songs
 */
async function validateSetlistEntrySongEmbedding(
  maxMismatches: number
): Promise<EmbeddedDataMismatch[]> {
  const db = getDb();
  const mismatches: EmbeddedDataMismatch[] = [];

  // Build song lookup map
  const songMap = new Map<number, { title: string; slug: string; isCover: boolean }>();
  await db.songs.each((song) => {
    songMap.set(song.id, {
      title: song.title,
      slug: song.slug,
      isCover: song.isCover,
    });
  });

  // Check each setlist entry
  await db.setlistEntries.each((entry: DexieSetlistEntry) => {
    if (mismatches.length >= maxMismatches) return;

    const sourceSong = songMap.get(entry.songId);
    if (!sourceSong) return; // Foreign key violation handled elsewhere

    // Check embedded song title
    if (entry.song.title !== sourceSong.title) {
      mismatches.push({
        table: 'setlistEntries',
        recordId: entry.id,
        field: 'song.title',
        embeddedValue: entry.song.title,
        sourceValue: sourceSong.title,
        sourceTable: 'songs',
        sourceId: entry.songId,
      });
    }

    // Check embedded song slug
    if (entry.song.slug !== sourceSong.slug) {
      mismatches.push({
        table: 'setlistEntries',
        recordId: entry.id,
        field: 'song.slug',
        embeddedValue: entry.song.slug,
        sourceValue: sourceSong.slug,
        sourceTable: 'songs',
        sourceId: entry.songId,
      });
    }

    // Check embedded song isCover
    if (entry.song.isCover !== sourceSong.isCover) {
      mismatches.push({
        table: 'setlistEntries',
        recordId: entry.id,
        field: 'song.isCover',
        embeddedValue: entry.song.isCover,
        sourceValue: sourceSong.isCover,
        sourceTable: 'songs',
        sourceId: entry.songId,
      });
    }
  });

  return mismatches;
}

/**
 * Validate embedded venue/tour data in shows matches source records
 */
async function validateShowEmbeddings(maxMismatches: number): Promise<EmbeddedDataMismatch[]> {
  const db = getDb();
  const mismatches: EmbeddedDataMismatch[] = [];

  // Build lookup maps
  const venueMap = new Map<number, { name: string; city: string; state: string | null }>();
  const tourMap = new Map<number, { name: string; year: number }>();

  await Promise.all([
    db.venues.each((venue) => {
      venueMap.set(venue.id, {
        name: venue.name,
        city: venue.city,
        state: venue.state,
      });
    }),
    db.tours.each((tour) => {
      tourMap.set(tour.id, {
        name: tour.name,
        year: tour.year,
      });
    }),
  ]);

  // Check each show
  await db.shows.each((show: DexieShow) => {
    if (mismatches.length >= maxMismatches) return;

    // Check venue embedding
    const sourceVenue = venueMap.get(show.venueId);
    if (sourceVenue) {
      if (show.venue.name !== sourceVenue.name) {
        mismatches.push({
          table: 'shows',
          recordId: show.id,
          field: 'venue.name',
          embeddedValue: show.venue.name,
          sourceValue: sourceVenue.name,
          sourceTable: 'venues',
          sourceId: show.venueId,
        });
      }
      if (show.venue.city !== sourceVenue.city) {
        mismatches.push({
          table: 'shows',
          recordId: show.id,
          field: 'venue.city',
          embeddedValue: show.venue.city,
          sourceValue: sourceVenue.city,
          sourceTable: 'venues',
          sourceId: show.venueId,
        });
      }
    }

    // Check tour embedding
    const sourceTour = tourMap.get(show.tourId);
    if (sourceTour) {
      if (show.tour.name !== sourceTour.name) {
        mismatches.push({
          table: 'shows',
          recordId: show.id,
          field: 'tour.name',
          embeddedValue: show.tour.name,
          sourceValue: sourceTour.name,
          sourceTable: 'tours',
          sourceId: show.tourId,
        });
      }
      if (show.tour.year !== sourceTour.year) {
        mismatches.push({
          table: 'shows',
          recordId: show.id,
          field: 'tour.year',
          embeddedValue: show.tour.year,
          sourceValue: sourceTour.year,
          sourceTable: 'tours',
          sourceId: show.tourId,
        });
      }
    }
  });

  return mismatches;
}

// ==================== MAIN VALIDATION FUNCTION ====================

/**
 * Run comprehensive data integrity validation.
 *
 * @param options - Validation options
 * @returns Complete validation result
 */
export async function validateDataIntegrity(
  options: ValidationOptions = {}
): Promise<DataIntegrityResult> {
  const {
    checkForeignKeys = true,
    checkOrphans = true,
    checkEmbeddedData = true,
    maxViolations = 1000,
    onProgress,
  } = options;

  const startTime = performance.now();
  const db = getDb();

  const allForeignKeyViolations: ForeignKeyViolation[] = [];
  const allOrphanedRecords: OrphanedRecord[] = [];
  const allEmbeddedMismatches: EmbeddedDataMismatch[] = [];
  const tableStats: TableStats[] = [];

  // Get table counts
  const tableCounts = await Promise.all([
    db.songs.count(),
    db.venues.count(),
    db.shows.count(),
    db.tours.count(),
    db.setlistEntries.count(),
    db.guests.count(),
    db.guestAppearances.count(),
    db.liberationList.count(),
    db.releases.count(),
    db.releaseTracks.count(),
    db.curatedLists.count(),
    db.curatedListItems.count(),
  ]);

  const [
    songCount,
    venueCount,
    showCount,
    tourCount,
    setlistCount,
    guestCount,
    guestAppearanceCount,
    liberationCount,
    releaseCount,
    releaseTrackCount,
    curatedListCount,
    curatedListItemCount,
  ] = tableCounts;

  const totalRecords = tableCounts.reduce((a, b) => a + b, 0);

  // Phase 1: Foreign key validation
  if (checkForeignKeys) {
    onProgress?.({ phase: 'Checking foreign keys', table: 'setlistEntries', percent: 10 });
    const setlistViolations = await validateSetlistEntryForeignKeys(maxViolations);
    allForeignKeyViolations.push(...setlistViolations);

    onProgress?.({ phase: 'Checking foreign keys', table: 'shows', percent: 20 });
    const showViolations = await validateShowForeignKeys(
      maxViolations - allForeignKeyViolations.length
    );
    allForeignKeyViolations.push(...showViolations);

    onProgress?.({ phase: 'Checking foreign keys', table: 'guestAppearances', percent: 30 });
    const guestViolations = await validateGuestAppearanceForeignKeys(
      maxViolations - allForeignKeyViolations.length
    );
    allForeignKeyViolations.push(...guestViolations);

    onProgress?.({ phase: 'Checking foreign keys', table: 'liberationList', percent: 35 });
    const liberationViolations = await validateLiberationForeignKeys(
      maxViolations - allForeignKeyViolations.length
    );
    allForeignKeyViolations.push(...liberationViolations);

    onProgress?.({ phase: 'Checking foreign keys', table: 'releaseTracks', percent: 40 });
    const releaseViolations = await validateReleaseTrackForeignKeys(
      maxViolations - allForeignKeyViolations.length
    );
    allForeignKeyViolations.push(...releaseViolations);

    onProgress?.({ phase: 'Checking foreign keys', table: 'curatedListItems', percent: 45 });
    const curatedViolations = await validateCuratedListItemForeignKeys(
      maxViolations - allForeignKeyViolations.length
    );
    allForeignKeyViolations.push(...curatedViolations);
  }

  // Phase 2: Orphan detection
  if (checkOrphans) {
    onProgress?.({ phase: 'Checking for orphans', table: 'songs', percent: 50 });
    const orphanedSongs = await findOrphanedSongs();
    allOrphanedRecords.push(...orphanedSongs);

    onProgress?.({ phase: 'Checking for orphans', table: 'venues', percent: 55 });
    const orphanedVenues = await findOrphanedVenues();
    allOrphanedRecords.push(...orphanedVenues);

    onProgress?.({ phase: 'Checking for orphans', table: 'tours', percent: 60 });
    const orphanedTours = await findOrphanedTours();
    allOrphanedRecords.push(...orphanedTours);

    onProgress?.({ phase: 'Checking for orphans', table: 'guests', percent: 65 });
    const orphanedGuests = await findOrphanedGuests();
    allOrphanedRecords.push(...orphanedGuests);

    // Clear the show references cache after orphan detection completes
    clearShowReferencesCache();
  }

  // Phase 3: Embedded data validation
  if (checkEmbeddedData) {
    onProgress?.({ phase: 'Checking embedded data', table: 'setlistEntries', percent: 75 });
    const setlistMismatches = await validateSetlistEntrySongEmbedding(maxViolations);
    allEmbeddedMismatches.push(...setlistMismatches);

    onProgress?.({ phase: 'Checking embedded data', table: 'shows', percent: 90 });
    const showMismatches = await validateShowEmbeddings(
      maxViolations - allEmbeddedMismatches.length
    );
    allEmbeddedMismatches.push(...showMismatches);
  }

  // Build table stats
  const violationsByTable = new Map<string, number>();
  for (const v of allForeignKeyViolations) {
    violationsByTable.set(v.table, (violationsByTable.get(v.table) ?? 0) + 1);
  }

  const orphansByTable = new Map<string, number>();
  for (const o of allOrphanedRecords) {
    orphansByTable.set(o.table, (orphansByTable.get(o.table) ?? 0) + 1);
  }

  const mismatchesByTable = new Map<string, number>();
  for (const m of allEmbeddedMismatches) {
    mismatchesByTable.set(m.table, (mismatchesByTable.get(m.table) ?? 0) + 1);
  }

  // Create table stats
  const tables: Array<{ name: string; count: number }> = [
    { name: 'songs', count: songCount },
    { name: 'venues', count: venueCount },
    { name: 'shows', count: showCount },
    { name: 'tours', count: tourCount },
    { name: 'setlistEntries', count: setlistCount },
    { name: 'guests', count: guestCount },
    { name: 'guestAppearances', count: guestAppearanceCount },
    { name: 'liberationList', count: liberationCount },
    { name: 'releases', count: releaseCount },
    { name: 'releaseTracks', count: releaseTrackCount },
    { name: 'curatedLists', count: curatedListCount },
    { name: 'curatedListItems', count: curatedListItemCount },
  ];

  for (const { name, count } of tables) {
    const fkViolations = violationsByTable.get(name) ?? 0;
    const orphans = orphansByTable.get(name) ?? 0;
    const mismatches = mismatchesByTable.get(name) ?? 0;
    const invalidRecords = fkViolations + orphans + mismatches;

    tableStats.push({
      tableName: name,
      totalRecords: count,
      validRecords: count - invalidRecords,
      invalidRecords,
      foreignKeyViolations: fkViolations,
      orphanedRecords: orphans,
      embeddedMismatches: mismatches,
    });
  }

  onProgress?.({ phase: 'Complete', table: '', percent: 100 });

  const totalViolations =
    allForeignKeyViolations.length + allOrphanedRecords.length + allEmbeddedMismatches.length;

  return {
    isValid: totalViolations === 0,
    totalTables: tables.length,
    totalRecords,
    totalViolations,
    foreignKeyViolations: allForeignKeyViolations,
    orphanedRecords: allOrphanedRecords,
    embeddedDataMismatches: allEmbeddedMismatches,
    tableStats,
    validationTime: performance.now() - startTime,
    timestamp: new Date(),
  };
}

// ==================== REPORT GENERATION ====================

/**
 * Generate a human-readable validation report
 */
export async function generateIntegrityReport(
  options: ValidationOptions = {}
): Promise<string> {
  const result = await validateDataIntegrity(options);

  const lines: string[] = [
    '# Data Integrity Validation Report',
    `Generated: ${result.timestamp.toISOString()}`,
    `Validation Time: ${result.validationTime.toFixed(2)}ms`,
    '',
    '## Summary',
    `- Status: ${result.isValid ? 'VALID' : 'INVALID'}`,
    `- Total Tables: ${result.totalTables}`,
    `- Total Records: ${result.totalRecords.toLocaleString()}`,
    `- Total Violations: ${result.totalViolations}`,
    '',
    '## Violation Breakdown',
    `- Foreign Key Violations: ${result.foreignKeyViolations.length}`,
    `- Orphaned Records: ${result.orphanedRecords.length}`,
    `- Embedded Data Mismatches: ${result.embeddedDataMismatches.length}`,
    '',
    '## Table Statistics',
    '| Table | Records | Valid | Invalid | FK Violations | Orphans | Mismatches |',
    '|-------|---------|-------|---------|---------------|---------|------------|',
  ];

  for (const stats of result.tableStats) {
    lines.push(
      `| ${stats.tableName} | ${stats.totalRecords} | ${stats.validRecords} | ` +
        `${stats.invalidRecords} | ${stats.foreignKeyViolations} | ` +
        `${stats.orphanedRecords} | ${stats.embeddedMismatches} |`
    );
  }

  if (result.foreignKeyViolations.length > 0) {
    lines.push('');
    lines.push('## Foreign Key Violations (first 20)');
    lines.push('| Table | Record ID | Field | Invalid Value | Referenced Table |');
    lines.push('|-------|-----------|-------|---------------|------------------|');

    for (const v of result.foreignKeyViolations.slice(0, 20)) {
      lines.push(
        `| ${v.table} | ${v.recordId} | ${v.foreignKeyField} | ${v.invalidValue} | ${v.referencedTable} |`
      );
    }
  }

  if (result.orphanedRecords.length > 0) {
    lines.push('');
    lines.push('## Orphaned Records (first 20)');
    lines.push('| Table | Record ID | Reason |');
    lines.push('|-------|-----------|--------|');

    for (const o of result.orphanedRecords.slice(0, 20)) {
      lines.push(`| ${o.table} | ${o.recordId} | ${o.reason} |`);
    }
  }

  if (result.embeddedDataMismatches.length > 0) {
    lines.push('');
    lines.push('## Embedded Data Mismatches (first 20)');
    lines.push('| Table | Record ID | Field | Embedded | Source |');
    lines.push('|-------|-----------|-------|----------|--------|');

    for (const m of result.embeddedDataMismatches.slice(0, 20)) {
      lines.push(
        `| ${m.table} | ${m.recordId} | ${m.field} | ${m.embeddedValue} | ${m.sourceValue} |`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Export validation result as JSON
 */
export async function exportValidationAsJson(options: ValidationOptions = {}): Promise<string> {
  const result = await validateDataIntegrity(options);
  return JSON.stringify(result, null, 2);
}

// ==================== QUICK CHECKS ====================

/**
 * Quick check for foreign key violations only
 */
export async function quickForeignKeyCheck(): Promise<{
  isValid: boolean;
  violationCount: number;
}> {
  const result = await validateDataIntegrity({
    checkForeignKeys: true,
    checkOrphans: false,
    checkEmbeddedData: false,
    maxViolations: 1,
  });

  return {
    isValid: result.foreignKeyViolations.length === 0,
    violationCount: result.foreignKeyViolations.length,
  };
}

/**
 * Quick health check - returns true if database appears healthy
 */
export async function quickHealthCheck(): Promise<boolean> {
  const db = getDb();

  try {
    // Check we can access all major tables
    const [showCount, songCount, setlistCount] = await Promise.all([
      db.shows.count(),
      db.songs.count(),
      db.setlistEntries.count(),
    ]);

    // Basic sanity checks
    if (showCount === 0 && setlistCount > 0) return false;
    if (songCount === 0 && setlistCount > 0) return false;

    return true;
  } catch {
    return false;
  }
}
