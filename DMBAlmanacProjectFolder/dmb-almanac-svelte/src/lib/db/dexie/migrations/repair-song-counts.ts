/**
 * Repair Song Counts Migration
 *
 * Recalculates all song performance counts from setlist entries.
 * Safe to run multiple times - idempotent operation.
 *
 * This addresses the issue where song.totalPerformances doesn't match
 * the actual count of setlist entries for that song.
 */

import { getDb } from '../db';
import { invalidateCache } from '../cache';
import {
  calculateAllSongStats,
  validateAllSongStats,
  type SongStatsValidationResult,
  type SongStatsRepairResult,
  type CalculatedSongStats,
} from '../validation/song-stats-validator';
import type { DexieSong } from '../schema';

// ==================== TYPES ====================

/**
 * Migration result with before/after comparison
 */
export interface RepairMigrationResult {
  success: boolean;
  beforeValidation: SongStatsValidationResult;
  afterValidation: SongStatsValidationResult | null;
  repairResult: SongStatsRepairResult | null;
  totalTime: number;
  timestamp: Date;
  error?: string;
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (progress: {
  phase: 'validation' | 'repair' | 'verification';
  current: number;
  total: number;
  message: string;
}) => void;

// ==================== REPAIR FUNCTIONS ====================

/**
 * Run the full song counts repair migration.
 *
 * This function:
 * 1. Validates current state and identifies mismatches
 * 2. Recalculates all song statistics from setlist entries
 * 3. Updates all songs with correct counts in batches
 * 4. Verifies the repair was successful
 *
 * Safe to run multiple times - if no mismatches exist, it completes quickly.
 *
 * @param batchSize - Number of songs to update per batch (default: 100)
 * @param onProgress - Optional progress callback
 * @returns Migration result with before/after stats
 */
export async function runSongCountsRepair(
  batchSize = 100,
  onProgress?: ProgressCallback
): Promise<RepairMigrationResult> {
  const startTime = performance.now();

  try {
    // Phase 1: Initial validation
    onProgress?.({
      phase: 'validation',
      current: 0,
      total: 100,
      message: 'Validating current song statistics...',
    });

    const beforeValidation = await validateAllSongStats();

    console.log(
      `[RepairSongCounts] Found ${beforeValidation.mismatchedSongs} mismatched songs out of ${beforeValidation.totalSongs}`
    );

    // If no mismatches, we're done
    if (beforeValidation.mismatchedSongs === 0) {
      console.log('[RepairSongCounts] No mismatches found, repair not needed');

      return {
        success: true,
        beforeValidation,
        afterValidation: beforeValidation,
        repairResult: {
          totalRepaired: 0,
          repairDetails: [],
          repairTime: 0,
          timestamp: new Date(),
        },
        totalTime: performance.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Phase 2: Calculate correct stats
    onProgress?.({
      phase: 'repair',
      current: 10,
      total: 100,
      message: 'Calculating correct statistics from setlist entries...',
    });

    const calculatedStatsMap = await calculateAllSongStats();

    // Phase 3: Get all songs and identify which need updates
    const db = getDb();
    const songs = await db.songs.toArray();

    const songsToUpdate: Array<{
      song: DexieSong;
      newStats: CalculatedSongStats;
    }> = [];

    for (const song of songs) {
      const newStats = calculatedStatsMap.get(song.id) ?? {
        totalPerformances: 0,
        openerCount: 0,
        closerCount: 0,
        encoreCount: 0,
        firstPlayedDate: null,
        lastPlayedDate: null,
      };

      // Check if update is needed
      if (
        song.totalPerformances !== newStats.totalPerformances ||
        song.openerCount !== newStats.openerCount ||
        song.closerCount !== newStats.closerCount ||
        song.encoreCount !== newStats.encoreCount
      ) {
        songsToUpdate.push({ song, newStats });
      }
    }

    // Phase 4: Apply updates in batches
    const repairDetails: SongStatsRepairResult['repairDetails'] = [];
    const totalBatches = Math.ceil(songsToUpdate.length / batchSize);

    for (let i = 0; i < songsToUpdate.length; i += batchSize) {
      const batchIndex = Math.floor(i / batchSize);
      const batch = songsToUpdate.slice(i, i + batchSize);

      const progressPercent = 20 + Math.round((batchIndex / totalBatches) * 60);
      onProgress?.({
        phase: 'repair',
        current: progressPercent,
        total: 100,
        message: `Updating batch ${batchIndex + 1}/${totalBatches} (${batch.length} songs)...`,
      });

      // Process batch in a transaction
      await db.transaction('rw', db.songs, async () => {
        for (const { song, newStats } of batch) {
          await db.songs.update(song.id, {
            totalPerformances: newStats.totalPerformances,
            openerCount: newStats.openerCount,
            closerCount: newStats.closerCount,
            encoreCount: newStats.encoreCount,
            firstPlayedDate: newStats.firstPlayedDate,
            lastPlayedDate: newStats.lastPlayedDate,
          });

          repairDetails.push({
            songId: song.id,
            songTitle: song.title,
            oldTotal: song.totalPerformances,
            newTotal: newStats.totalPerformances,
            oldOpenerCount: song.openerCount,
            newOpenerCount: newStats.openerCount,
            oldCloserCount: song.closerCount,
            newCloserCount: newStats.closerCount,
            oldEncoreCount: song.encoreCount,
            newEncoreCount: newStats.encoreCount,
          });
        }
      });

      // Yield to main thread between batches
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Invalidate caches after repair
    invalidateCache(['songs']);

    // Phase 5: Verify repair
    onProgress?.({
      phase: 'verification',
      current: 90,
      total: 100,
      message: 'Verifying repair was successful...',
    });

    const afterValidation = await validateAllSongStats();

    const repairResult: SongStatsRepairResult = {
      totalRepaired: repairDetails.length,
      repairDetails,
      repairTime: performance.now() - startTime,
      timestamp: new Date(),
    };

    onProgress?.({
      phase: 'verification',
      current: 100,
      total: 100,
      message: 'Repair complete!',
    });

    const success = afterValidation.mismatchedSongs === 0;

    if (!success) {
      console.warn(
        `[RepairSongCounts] Verification found ${afterValidation.mismatchedSongs} remaining mismatches`
      );
    } else {
      console.log(
        `[RepairSongCounts] Successfully repaired ${repairDetails.length} songs in ${(performance.now() - startTime).toFixed(2)}ms`
      );
    }

    return {
      success,
      beforeValidation,
      afterValidation,
      repairResult,
      totalTime: performance.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[RepairSongCounts] Migration failed:', error);

    return {
      success: false,
      beforeValidation: {
        totalSongs: 0,
        totalSetlistEntries: 0,
        matchedSongs: 0,
        mismatchedSongs: 0,
        mismatches: [],
        validationTime: 0,
        timestamp: new Date(),
      },
      afterValidation: null,
      repairResult: null,
      totalTime: performance.now() - startTime,
      timestamp: new Date(),
      error: errorMessage,
    };
  }
}

/**
 * Dry run - show what would be repaired without making changes.
 *
 * @returns Preview of what the repair would do
 */
export async function previewSongCountsRepair(): Promise<{
  wouldRepair: number;
  mismatchSummary: {
    overcounted: number;
    undercounted: number;
    totalDifference: number;
  };
  sampleMismatches: Array<{
    songTitle: string;
    storedTotal: number;
    actualTotal: number;
    difference: number;
  }>;
}> {
  const validation = await validateAllSongStats();

  let overcounted = 0;
  let undercounted = 0;
  let totalDifference = 0;

  for (const mismatch of validation.mismatches) {
    totalDifference += Math.abs(mismatch.difference);
    if (mismatch.difference > 0) {
      undercounted++;
    } else if (mismatch.difference < 0) {
      overcounted++;
    }
  }

  // Get top 10 most significant mismatches as samples
  const sampleMismatches = validation.mismatches
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, 10)
    .map((m) => ({
      songTitle: m.songTitle,
      storedTotal: m.storedTotal,
      actualTotal: m.calculatedTotal,
      difference: m.difference,
    }));

  return {
    wouldRepair: validation.mismatchedSongs,
    mismatchSummary: {
      overcounted,
      undercounted,
      totalDifference,
    },
    sampleMismatches,
  };
}

/**
 * Quick check if repair is needed.
 *
 * @returns True if there are mismatched songs that need repair
 */
export async function isRepairNeeded(): Promise<boolean> {
  const validation = await validateAllSongStats();
  return validation.mismatchedSongs > 0;
}

/**
 * Get a summary of the current mismatch state.
 */
export async function getMismatchStatus(): Promise<{
  totalSongs: number;
  mismatchedSongs: number;
  matchRate: string;
  needsRepair: boolean;
}> {
  const validation = await validateAllSongStats();

  return {
    totalSongs: validation.totalSongs,
    mismatchedSongs: validation.mismatchedSongs,
    matchRate:
      validation.totalSongs > 0
        ? ((validation.matchedSongs / validation.totalSongs) * 100).toFixed(2) + '%'
        : '100%',
    needsRepair: validation.mismatchedSongs > 0,
  };
}

// ==================== REPAIR SPECIFIC SONGS ====================

/**
 * Repair a specific song's counts.
 *
 * @param songId - The song ID to repair
 * @returns Details of the repair or null if no repair was needed
 */
export async function repairSingleSong(
  songId: number
): Promise<SongStatsRepairResult['repairDetails'][0] | null> {
  const db = getDb();
  const song = await db.songs.get(songId);

  if (!song) {
    throw new Error(`Song not found: ${songId}`);
  }

  // Count setlist entries for this song
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

  // Check if repair is needed
  if (
    song.totalPerformances === newTotal &&
    song.openerCount === openerCount &&
    song.closerCount === closerCount &&
    song.encoreCount === encoreCount
  ) {
    return null; // No repair needed
  }

  // Apply the repair
  await db.songs.update(songId, {
    totalPerformances: newTotal,
    openerCount,
    closerCount,
    encoreCount,
    firstPlayedDate,
    lastPlayedDate,
  });

  // Invalidate cache
  invalidateCache(['songs']);

  return {
    songId,
    songTitle: song.title,
    oldTotal: song.totalPerformances,
    newTotal,
    oldOpenerCount: song.openerCount,
    newOpenerCount: openerCount,
    oldCloserCount: song.closerCount,
    newCloserCount: closerCount,
    oldEncoreCount: song.encoreCount,
    newEncoreCount: encoreCount,
  };
}

/**
 * Repair multiple specific songs by ID.
 *
 * @param songIds - Array of song IDs to repair
 * @returns Array of repair details for songs that were actually repaired
 */
export async function repairMultipleSongs(
  songIds: number[]
): Promise<SongStatsRepairResult['repairDetails']> {
  const results: SongStatsRepairResult['repairDetails'] = [];

  for (const songId of songIds) {
    try {
      const result = await repairSingleSong(songId);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.warn(`[RepairSongCounts] Failed to repair song ${songId}:`, error);
    }
  }

  return results;
}

// ==================== LOGGING & EXPORT ====================

/**
 * Generate a repair log suitable for storage or display.
 */
export function generateRepairLog(result: RepairMigrationResult): string {
  const lines: string[] = [
    '# Song Counts Repair Log',
    `Timestamp: ${result.timestamp.toISOString()}`,
    `Total Time: ${result.totalTime.toFixed(2)}ms`,
    `Status: ${result.success ? 'SUCCESS' : 'FAILED'}`,
    '',
    '## Before Repair',
    `- Total Songs: ${result.beforeValidation.totalSongs}`,
    `- Mismatched Songs: ${result.beforeValidation.mismatchedSongs}`,
    `- Match Rate: ${((result.beforeValidation.matchedSongs / result.beforeValidation.totalSongs) * 100).toFixed(2)}%`,
    '',
  ];

  if (result.repairResult) {
    lines.push('## Repair Summary');
    lines.push(`- Songs Repaired: ${result.repairResult.totalRepaired}`);
    lines.push(`- Repair Time: ${result.repairResult.repairTime.toFixed(2)}ms`);
    lines.push('');
  }

  if (result.afterValidation) {
    lines.push('## After Repair');
    lines.push(`- Mismatched Songs: ${result.afterValidation.mismatchedSongs}`);
    lines.push(
      `- Match Rate: ${((result.afterValidation.matchedSongs / result.afterValidation.totalSongs) * 100).toFixed(2)}%`
    );
    lines.push('');
  }

  if (result.error) {
    lines.push('## Error');
    lines.push(result.error);
    lines.push('');
  }

  if (result.repairResult && result.repairResult.repairDetails.length > 0) {
    lines.push('## Repair Details (first 50)');
    lines.push('| Song | Old Total | New Total | Diff |');
    lines.push('|------|-----------|-----------|------|');

    for (const detail of result.repairResult.repairDetails.slice(0, 50)) {
      const diff = detail.newTotal - detail.oldTotal;
      const sign = diff > 0 ? '+' : '';
      lines.push(`| ${detail.songTitle} | ${detail.oldTotal} | ${detail.newTotal} | ${sign}${diff} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Export repair result as JSON for programmatic use.
 */
export function exportRepairResultAsJson(result: RepairMigrationResult): string {
  return JSON.stringify(result, null, 2);
}
