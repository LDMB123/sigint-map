/**
 * Data Integrity Hooks
 *
 * Dexie hooks that maintain data integrity automatically.
 * Updates song statistics when setlist entries are added/modified/deleted.
 *
 * Key features:
 * - Automatic song count updates on setlist entry changes
 * - Debounced batch updates to avoid excessive writes
 * - Transaction-aware updates for consistency
 * - Fallback to scheduled repair for complex scenarios
 */

import { getDb } from '../db';
import { invalidateCache } from '../cache';
import type { DexieSetlistEntry } from '../schema';

// ==================== TYPES ====================

/**
 * Pending song stats update
 */
interface PendingSongUpdate {
  songId: number;
  incrementTotal: number;
  incrementOpener: number;
  incrementCloser: number;
  incrementEncore: number;
}

// ==================== STATE ====================

let hooksInitialized = false;
const pendingUpdates: Map<number, PendingSongUpdate> = new Map();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY = 100; // ms to wait before flushing pending updates

// ==================== UTILITY FUNCTIONS ====================

/**
 * Determine the stat increments for a setlist entry
 */
function getEntryStatIncrements(entry: DexieSetlistEntry): Omit<PendingSongUpdate, 'songId'> {
  const increments = {
    incrementTotal: 1,
    incrementOpener: 0,
    incrementCloser: 0,
    incrementEncore: 0,
  };

  if (entry.slot === 'opener') {
    increments.incrementOpener = 1;
  }

  if (entry.slot === 'closer' && !entry.setName.startsWith('encore')) {
    increments.incrementCloser = 1;
  }

  if (entry.setName.startsWith('encore')) {
    increments.incrementEncore = 1;
  }

  return increments;
}

/**
 * Queue a song stats update (debounced)
 */
function queueSongUpdate(songId: number, increments: Omit<PendingSongUpdate, 'songId'>): void {
  const existing = pendingUpdates.get(songId);

  if (existing) {
    // Merge with existing pending update
    existing.incrementTotal += increments.incrementTotal;
    existing.incrementOpener += increments.incrementOpener;
    existing.incrementCloser += increments.incrementCloser;
    existing.incrementEncore += increments.incrementEncore;
  } else {
    pendingUpdates.set(songId, {
      songId,
      ...increments,
    });
  }

  // Schedule flush if not already scheduled
  scheduleFlush();
}

/**
 * Schedule a flush of pending updates
 */
function scheduleFlush(): void {
  if (flushTimer) return;

  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushPendingUpdates();
  }, FLUSH_DELAY);
}

/**
 * Flush all pending song updates to the database
 * Optimized to use bulkGet for O(1) batched lookup instead of O(n) sequential gets
 */
async function flushPendingUpdates(): Promise<void> {
  if (pendingUpdates.size === 0) return;

  const updates = Array.from(pendingUpdates.values());
  pendingUpdates.clear();

  const db = getDb();

  try {
    await db.transaction('rw', db.songs, async () => {
      // Batch fetch all songs in one query (O(1) vs O(n) individual gets)
      const songIds = updates.map(u => u.songId);
      const songs = await db.songs.bulkGet(songIds);

      // Build update map for O(1) lookups
      const updateMap = new Map(updates.map(u => [u.songId, u]));

      // Collect all updates to apply
      const bulkUpdates: Array<{ key: number; changes: Partial<import('$db/dexie/schema').DexieSong> }> = [];

      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        if (!song) continue;

        const update = updateMap.get(song.id);
        if (!update) continue;

        // Calculate new values, ensuring we don't go negative
        bulkUpdates.push({
          key: song.id,
          changes: {
            totalPerformances: Math.max(0, song.totalPerformances + update.incrementTotal),
            openerCount: Math.max(0, song.openerCount + update.incrementOpener),
            closerCount: Math.max(0, song.closerCount + update.incrementCloser),
            encoreCount: Math.max(0, song.encoreCount + update.incrementEncore),
          }
        });
      }

      // Apply all updates (sequential within transaction is fine, bulk operations not available for update)
      for (const { key, changes } of bulkUpdates) {
        await db.songs.update(key, changes);
      }
    });

    // Invalidate song caches after updates
    invalidateCache(['songs']);
  } catch (error) {
    console.error('[IntegrityHooks] Failed to flush pending updates:', error);
    // Re-queue failed updates for retry
    for (const update of updates) {
      pendingUpdates.set(update.songId, update);
    }
    // Schedule retry
    scheduleFlush();
  }
}

// ==================== HOOK HANDLERS ====================

/**
 * Handle setlist entry creation
 */
function handleSetlistEntryCreating(
  _primKey: unknown,
  obj: DexieSetlistEntry,
  _transaction: unknown
): void {
  const increments = getEntryStatIncrements(obj);
  queueSongUpdate(obj.songId, increments);
}

/**
 * Handle setlist entry update
 * Note: This is tricky because we need to know what changed.
 * For simplicity, we'll recalculate rather than track deltas.
 */
function handleSetlistEntryUpdating(
  modifications: Partial<DexieSetlistEntry>,
  _primKey: unknown,
  obj: DexieSetlistEntry,
  _transaction: unknown
): Partial<DexieSetlistEntry> | undefined {
  // If songId changed, we need to update both old and new song
  if (modifications.songId !== undefined && modifications.songId !== obj.songId) {
    // Decrement old song
    const oldIncrements = getEntryStatIncrements(obj);
    queueSongUpdate(obj.songId, {
      incrementTotal: -oldIncrements.incrementTotal,
      incrementOpener: -oldIncrements.incrementOpener,
      incrementCloser: -oldIncrements.incrementCloser,
      incrementEncore: -oldIncrements.incrementEncore,
    });

    // Increment new song (using potentially new slot/setName)
    const newEntry = { ...obj, ...modifications };
    const newIncrements = getEntryStatIncrements(newEntry as DexieSetlistEntry);
    queueSongUpdate(modifications.songId, newIncrements);
  }
  // If slot or setName changed (but not songId), update the same song
  else if (modifications.slot !== undefined || modifications.setName !== undefined) {
    const oldIncrements = getEntryStatIncrements(obj);
    const newEntry = { ...obj, ...modifications };
    const newIncrements = getEntryStatIncrements(newEntry as DexieSetlistEntry);

    // Queue delta update
    queueSongUpdate(obj.songId, {
      incrementTotal: 0, // Total doesn't change
      incrementOpener: newIncrements.incrementOpener - oldIncrements.incrementOpener,
      incrementCloser: newIncrements.incrementCloser - oldIncrements.incrementCloser,
      incrementEncore: newIncrements.incrementEncore - oldIncrements.incrementEncore,
    });
  }

  return undefined; // Don't modify the update
}

/**
 * Handle setlist entry deletion
 */
function handleSetlistEntryDeleting(
  _primKey: unknown,
  obj: DexieSetlistEntry,
  _transaction: unknown
): void {
  const increments = getEntryStatIncrements(obj);
  queueSongUpdate(obj.songId, {
    incrementTotal: -increments.incrementTotal,
    incrementOpener: -increments.incrementOpener,
    incrementCloser: -increments.incrementCloser,
    incrementEncore: -increments.incrementEncore,
  });
}

// ==================== INITIALIZATION ====================

/**
 * Initialize data integrity hooks.
 * Call this once during application startup.
 *
 * Safe to call multiple times - will only initialize once.
 */
export function initializeIntegrityHooks(): void {
  // Skip on server-side rendering
  if (typeof window === 'undefined') {
    return;
  }

  // Prevent multiple initializations
  if (hooksInitialized) {
    return;
  }

  hooksInitialized = true;

  try {
    const db = getDb();
    const setlistEntriesTable = db.setlistEntries;

    // Register hooks
    setlistEntriesTable.hook('creating', handleSetlistEntryCreating);
    setlistEntriesTable.hook('updating', handleSetlistEntryUpdating);
    setlistEntriesTable.hook('deleting', handleSetlistEntryDeleting);

    console.debug('[IntegrityHooks] Data integrity hooks initialized');
  } catch (error) {
    console.error('[IntegrityHooks] Failed to initialize hooks:', error);
    hooksInitialized = false;
  }
}

/**
 * Teardown data integrity hooks.
 * Call when resetting the database or on app cleanup.
 */
export function teardownIntegrityHooks(): void {
  // Cancel any pending flush
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  // Clear pending updates
  pendingUpdates.clear();

  // Note: Dexie doesn't provide a way to unsubscribe from hooks,
  // but setting the flag prevents re-initialization
  hooksInitialized = false;

  console.debug('[IntegrityHooks] Data integrity hooks torn down');
}

/**
 * Force flush any pending updates immediately.
 * Useful before operations that depend on accurate counts.
 */
export async function forceFlushPendingUpdates(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  await flushPendingUpdates();
}

/**
 * Check if there are pending updates waiting to be flushed.
 */
export function hasPendingUpdates(): boolean {
  return pendingUpdates.size > 0;
}

/**
 * Get the number of pending updates.
 */
export function getPendingUpdateCount(): number {
  return pendingUpdates.size;
}

// ==================== MANUAL UPDATE FUNCTIONS ====================

/**
 * Manually recalculate and update a single song's statistics.
 * Use this for targeted repairs without running the full migration.
 *
 * @param songId - The song ID to recalculate
 * @returns True if the song was updated, false if no changes were needed
 */
export async function recalculateSongStats(songId: number): Promise<boolean> {
  const db = getDb();

  // Force flush any pending updates first
  await forceFlushPendingUpdates();

  const song = await db.songs.get(songId);
  if (!song) {
    throw new Error(`Song not found: ${songId}`);
  }

  // Count from setlist entries
  const entries = await db.setlistEntries.where('songId').equals(songId).toArray();

  let openerCount = 0;
  let closerCount = 0;
  let encoreCount = 0;
  let firstPlayedDate: string | null = null;
  let lastPlayedDate: string | null = null;

  for (const entry of entries) {
    if (entry.slot === 'opener') openerCount++;
    if (entry.slot === 'closer' && !entry.setName.startsWith('encore')) closerCount++;
    if (entry.setName.startsWith('encore')) encoreCount++;

    if (entry.showDate) {
      if (!firstPlayedDate || entry.showDate < firstPlayedDate) {
        firstPlayedDate = entry.showDate;
      }
      if (!lastPlayedDate || entry.showDate > lastPlayedDate) {
        lastPlayedDate = entry.showDate;
      }
    }
  }

  const newTotal = entries.length;

  // Check if update is needed
  if (
    song.totalPerformances === newTotal &&
    song.openerCount === openerCount &&
    song.closerCount === closerCount &&
    song.encoreCount === encoreCount
  ) {
    return false; // No changes needed
  }

  // Apply update
  await db.songs.update(songId, {
    totalPerformances: newTotal,
    openerCount,
    closerCount,
    encoreCount,
    firstPlayedDate,
    lastPlayedDate,
  });

  invalidateCache(['songs']);

  return true;
}

/**
 * Recalculate statistics for multiple songs.
 * Optimized to use batch operations instead of N+1 sequential queries.
 *
 * @param songIds - Array of song IDs to recalculate
 * @returns Number of songs that were updated
 */
export async function recalculateMultipleSongStats(songIds: number[]): Promise<number> {
  if (songIds.length === 0) return 0;

  // Force flush any pending updates first
  await forceFlushPendingUpdates();

  const db = getDb();
  let updatedCount = 0;

  try {
    await db.transaction('rw', [db.songs, db.setlistEntries], async () => {
      // Batch fetch all songs in one query (O(1) vs O(n) individual gets)
      const songs = await db.songs.bulkGet(songIds);
      const validSongs = songs.filter((s): s is NonNullable<typeof s> => s !== undefined);

      if (validSongs.length === 0) return;

      // Batch fetch all setlist entries for these songs using anyOf (single query)
      const allEntries = await db.setlistEntries
        .where('songId')
        .anyOf(songIds)
        .toArray();

      // Group entries by songId for O(1) lookup
      const entriesBySongId = new Map<number, typeof allEntries>();
      for (const entry of allEntries) {
        const existing = entriesBySongId.get(entry.songId);
        if (existing) {
          existing.push(entry);
        } else {
          entriesBySongId.set(entry.songId, [entry]);
        }
      }

      // Calculate stats for each song and collect updates
      const updates: Array<{
        songId: number;
        changes: {
          totalPerformances: number;
          openerCount: number;
          closerCount: number;
          encoreCount: number;
          firstPlayedDate: string | null;
          lastPlayedDate: string | null;
        };
      }> = [];

      for (const song of validSongs) {
        const entries = entriesBySongId.get(song.id) || [];

        let openerCount = 0;
        let closerCount = 0;
        let encoreCount = 0;
        let firstPlayedDate: string | null = null;
        let lastPlayedDate: string | null = null;

        for (const entry of entries) {
          if (entry.slot === 'opener') openerCount++;
          if (entry.slot === 'closer' && !entry.setName.startsWith('encore')) closerCount++;
          if (entry.setName.startsWith('encore')) encoreCount++;

          if (entry.showDate) {
            if (!firstPlayedDate || entry.showDate < firstPlayedDate) {
              firstPlayedDate = entry.showDate;
            }
            if (!lastPlayedDate || entry.showDate > lastPlayedDate) {
              lastPlayedDate = entry.showDate;
            }
          }
        }

        const newTotal = entries.length;

        // Check if update is needed
        if (
          song.totalPerformances !== newTotal ||
          song.openerCount !== openerCount ||
          song.closerCount !== closerCount ||
          song.encoreCount !== encoreCount
        ) {
          updates.push({
            songId: song.id,
            changes: {
              totalPerformances: newTotal,
              openerCount,
              closerCount,
              encoreCount,
              firstPlayedDate,
              lastPlayedDate,
            },
          });
        }
      }

      // Apply all updates within the same transaction
      for (const { songId, changes } of updates) {
        await db.songs.update(songId, changes);
      }

      updatedCount = updates.length;
    });

    // Invalidate caches once after all updates
    if (updatedCount > 0) {
      invalidateCache(['songs']);
    }
  } catch (error) {
    console.error('[IntegrityHooks] Failed to batch recalculate song stats:', error);
    throw error;
  }

  return updatedCount;
}

// ==================== EXPORTS ====================

export {
  handleSetlistEntryCreating,
  handleSetlistEntryUpdating,
  handleSetlistEntryDeleting,
};
