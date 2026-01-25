/**
 * Song Statistics Validator
 *
 * Validates that song.totalPerformances matches the actual count
 * of setlist entries for each song. Identifies and fixes mismatches.
 *
 * Key capabilities:
 * - Calculate actual play count from setlistEntries
 * - Compare calculated vs stored totalPerformances
 * - Identify mismatched songs with detailed reporting
 * - Fix mismatched counts with batch updates
 */

import { getDb } from '../db';
import type { DexieSong, DexieSetlistEntry } from '../schema';

// ==================== TYPES ====================

/**
 * Represents a mismatch between stored and calculated song statistics
 */
export interface SongStatsMismatch {
  songId: number;
  songTitle: string;
  songSlug: string;
  storedTotal: number;
  calculatedTotal: number;
  difference: number;
  storedOpenerCount: number;
  calculatedOpenerCount: number;
  storedCloserCount: number;
  calculatedCloserCount: number;
  storedEncoreCount: number;
  calculatedEncoreCount: number;
}

/**
 * Result of song stats validation
 */
export interface SongStatsValidationResult {
  totalSongs: number;
  totalSetlistEntries: number;
  matchedSongs: number;
  mismatchedSongs: number;
  mismatches: SongStatsMismatch[];
  validationTime: number;
  timestamp: Date;
}

/**
 * Result of song stats repair operation
 */
export interface SongStatsRepairResult {
  totalRepaired: number;
  repairDetails: Array<{
    songId: number;
    songTitle: string;
    oldTotal: number;
    newTotal: number;
    oldOpenerCount: number;
    newOpenerCount: number;
    oldCloserCount: number;
    newCloserCount: number;
    oldEncoreCount: number;
    newEncoreCount: number;
  }>;
  repairTime: number;
  timestamp: Date;
}

/**
 * Calculated statistics for a song
 */
export interface CalculatedSongStats {
  totalPerformances: number;
  openerCount: number;
  closerCount: number;
  encoreCount: number;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
}

// ==================== CALCULATION FUNCTIONS ====================

/**
 * Calculate actual play count for a specific song from setlist entries.
 * Uses the songId index for efficient lookup.
 *
 * @param songId - The song ID to calculate stats for
 * @returns The calculated statistics for the song
 */
export async function calculateSongStats(songId: number): Promise<CalculatedSongStats> {
  const db = getDb();

  const entries = await db.setlistEntries.where('songId').equals(songId).toArray();

  let openerCount = 0;
  let closerCount = 0;
  let encoreCount = 0;
  let firstPlayedDate: string | null = null;
  let lastPlayedDate: string | null = null;

  for (const entry of entries) {
    // Count slot types
    if (entry.slot === 'opener') {
      openerCount++;
    } else if (entry.slot === 'closer') {
      // Only count as closer if NOT in an encore set
      if (!entry.setName.startsWith('encore')) {
        closerCount++;
      }
    }

    // Count encore appearances
    if (entry.setName.startsWith('encore')) {
      encoreCount++;
    }

    // Track first/last played dates
    if (entry.showDate) {
      if (!firstPlayedDate || entry.showDate < firstPlayedDate) {
        firstPlayedDate = entry.showDate;
      }
      if (!lastPlayedDate || entry.showDate > lastPlayedDate) {
        lastPlayedDate = entry.showDate;
      }
    }
  }

  return {
    totalPerformances: entries.length,
    openerCount,
    closerCount,
    encoreCount,
    firstPlayedDate,
    lastPlayedDate,
  };
}

/**
 * Calculate stats for all songs at once using a single pass through setlist entries.
 * This is more efficient than calling calculateSongStats for each song.
 *
 * @returns Map of songId to calculated stats
 */
export async function calculateAllSongStats(): Promise<Map<number, CalculatedSongStats>> {
  const db = getDb();
  const statsMap = new Map<number, CalculatedSongStats>();

  // Process all setlist entries in a single pass using cursor
  await db.setlistEntries.each((entry: DexieSetlistEntry) => {
    let stats = statsMap.get(entry.songId);

    if (!stats) {
      stats = {
        totalPerformances: 0,
        openerCount: 0,
        closerCount: 0,
        encoreCount: 0,
        firstPlayedDate: null,
        lastPlayedDate: null,
      };
      statsMap.set(entry.songId, stats);
    }

    stats.totalPerformances++;

    // Count slot types
    if (entry.slot === 'opener') {
      stats.openerCount++;
    } else if (entry.slot === 'closer') {
      // Only count as closer if NOT in an encore set
      if (!entry.setName.startsWith('encore')) {
        stats.closerCount++;
      }
    }

    // Count encore appearances
    if (entry.setName.startsWith('encore')) {
      stats.encoreCount++;
    }

    // Track first/last played dates
    if (entry.showDate) {
      if (!stats.firstPlayedDate || entry.showDate < stats.firstPlayedDate) {
        stats.firstPlayedDate = entry.showDate;
      }
      if (!stats.lastPlayedDate || entry.showDate > stats.lastPlayedDate) {
        stats.lastPlayedDate = entry.showDate;
      }
    }
  });

  return statsMap;
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Compare calculated stats vs stored stats for a single song.
 *
 * @param song - The song record with stored stats
 * @param calculatedStats - The calculated stats from setlist entries
 * @returns Mismatch details if any field differs, null if all match
 */
export function compareSongStats(
  song: DexieSong,
  calculatedStats: CalculatedSongStats
): SongStatsMismatch | null {
  const totalMismatch = song.totalPerformances !== calculatedStats.totalPerformances;
  const openerMismatch = song.openerCount !== calculatedStats.openerCount;
  const closerMismatch = song.closerCount !== calculatedStats.closerCount;
  const encoreMismatch = song.encoreCount !== calculatedStats.encoreCount;

  if (!totalMismatch && !openerMismatch && !closerMismatch && !encoreMismatch) {
    return null;
  }

  return {
    songId: song.id,
    songTitle: song.title,
    songSlug: song.slug,
    storedTotal: song.totalPerformances,
    calculatedTotal: calculatedStats.totalPerformances,
    difference: calculatedStats.totalPerformances - song.totalPerformances,
    storedOpenerCount: song.openerCount,
    calculatedOpenerCount: calculatedStats.openerCount,
    storedCloserCount: song.closerCount,
    calculatedCloserCount: calculatedStats.closerCount,
    storedEncoreCount: song.encoreCount,
    calculatedEncoreCount: calculatedStats.encoreCount,
  };
}

/**
 * Validate all song statistics against setlist entries.
 * Identifies any songs where stored counts don't match calculated counts.
 *
 * @returns Validation result with list of mismatches
 */
export async function validateAllSongStats(): Promise<SongStatsValidationResult> {
  const startTime = performance.now();
  const db = getDb();

  // Get all songs and calculate all stats in parallel
  const [songs, calculatedStatsMap] = await Promise.all([
    db.songs.toArray(),
    calculateAllSongStats(),
  ]);

  const totalSetlistEntries = await db.setlistEntries.count();
  const mismatches: SongStatsMismatch[] = [];
  let matchedSongs = 0;

  for (const song of songs) {
    const calculatedStats = calculatedStatsMap.get(song.id) ?? {
      totalPerformances: 0,
      openerCount: 0,
      closerCount: 0,
      encoreCount: 0,
      firstPlayedDate: null,
      lastPlayedDate: null,
    };

    const mismatch = compareSongStats(song, calculatedStats);

    if (mismatch) {
      mismatches.push(mismatch);
    } else {
      matchedSongs++;
    }
  }

  const validationTime = performance.now() - startTime;

  return {
    totalSongs: songs.length,
    totalSetlistEntries,
    matchedSongs,
    mismatchedSongs: mismatches.length,
    mismatches,
    validationTime,
    timestamp: new Date(),
  };
}

/**
 * Validate a single song's statistics.
 *
 * @param songId - The song ID to validate
 * @returns Mismatch details if found, null if stats match
 */
export async function validateSongStats(songId: number): Promise<SongStatsMismatch | null> {
  const db = getDb();
  const song = await db.songs.get(songId);

  if (!song) {
    throw new Error(`Song not found: ${songId}`);
  }

  const calculatedStats = await calculateSongStats(songId);
  return compareSongStats(song, calculatedStats);
}

/**
 * Get songs with the largest mismatches (for prioritized fixing).
 *
 * @param limit - Maximum number of results
 * @returns Top mismatches sorted by absolute difference
 */
export async function getTopMismatches(limit = 10): Promise<SongStatsMismatch[]> {
  const result = await validateAllSongStats();

  return result.mismatches
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, limit);
}

/**
 * Get a summary of mismatch statistics.
 */
export async function getMismatchSummary(): Promise<{
  totalMismatched: number;
  overcounted: number;
  undercounted: number;
  totalDifference: number;
  avgDifference: number;
  maxOvercount: number;
  maxUndercount: number;
}> {
  const result = await validateAllSongStats();

  let overcounted = 0;
  let undercounted = 0;
  let totalDifference = 0;
  let maxOvercount = 0;
  let maxUndercount = 0;

  for (const mismatch of result.mismatches) {
    totalDifference += Math.abs(mismatch.difference);

    if (mismatch.difference > 0) {
      // Stored count is less than actual (undercounted)
      undercounted++;
      maxUndercount = Math.max(maxUndercount, mismatch.difference);
    } else if (mismatch.difference < 0) {
      // Stored count is more than actual (overcounted)
      overcounted++;
      maxOvercount = Math.max(maxOvercount, Math.abs(mismatch.difference));
    }
  }

  return {
    totalMismatched: result.mismatches.length,
    overcounted,
    undercounted,
    totalDifference,
    avgDifference: result.mismatches.length > 0 ? totalDifference / result.mismatches.length : 0,
    maxOvercount,
    maxUndercount,
  };
}

// ==================== REPAIR FUNCTIONS ====================

/**
 * Fix a single song's statistics.
 *
 * @param songId - The song ID to fix
 * @returns The repair details or null if no fix was needed
 */
export async function fixSongStats(songId: number): Promise<SongStatsRepairResult['repairDetails'][0] | null> {
  const db = getDb();
  const song = await db.songs.get(songId);

  if (!song) {
    throw new Error(`Song not found: ${songId}`);
  }

  const calculatedStats = await calculateSongStats(songId);
  const mismatch = compareSongStats(song, calculatedStats);

  if (!mismatch) {
    return null; // No fix needed
  }

  // Update the song record
  await db.songs.update(songId, {
    totalPerformances: calculatedStats.totalPerformances,
    openerCount: calculatedStats.openerCount,
    closerCount: calculatedStats.closerCount,
    encoreCount: calculatedStats.encoreCount,
    firstPlayedDate: calculatedStats.firstPlayedDate,
    lastPlayedDate: calculatedStats.lastPlayedDate,
  });

  return {
    songId,
    songTitle: song.title,
    oldTotal: song.totalPerformances,
    newTotal: calculatedStats.totalPerformances,
    oldOpenerCount: song.openerCount,
    newOpenerCount: calculatedStats.openerCount,
    oldCloserCount: song.closerCount,
    newCloserCount: calculatedStats.closerCount,
    oldEncoreCount: song.encoreCount,
    newEncoreCount: calculatedStats.encoreCount,
  };
}

/**
 * Fix all mismatched song statistics.
 * Updates songs in batches to avoid memory issues.
 *
 * @param batchSize - Number of songs to update per batch (default: 100)
 * @param onProgress - Optional callback for progress updates
 * @returns Repair result with details of all fixes
 */
export async function fixAllSongStats(
  batchSize = 100,
  onProgress?: (progress: { current: number; total: number; phase: string }) => void
): Promise<SongStatsRepairResult> {
  const startTime = performance.now();
  const db = getDb();

  // Phase 1: Calculate all stats
  onProgress?.({ current: 0, total: 100, phase: 'Calculating stats from setlist entries...' });
  const calculatedStatsMap = await calculateAllSongStats();

  // Phase 2: Get all songs
  onProgress?.({ current: 10, total: 100, phase: 'Loading song records...' });
  const songs = await db.songs.toArray();

  // Phase 3: Identify mismatches
  onProgress?.({ current: 20, total: 100, phase: 'Identifying mismatches...' });
  const songsToFix: Array<{
    song: DexieSong;
    calculatedStats: CalculatedSongStats;
  }> = [];

  for (const song of songs) {
    const calculatedStats = calculatedStatsMap.get(song.id) ?? {
      totalPerformances: 0,
      openerCount: 0,
      closerCount: 0,
      encoreCount: 0,
      firstPlayedDate: null,
      lastPlayedDate: null,
    };

    if (compareSongStats(song, calculatedStats)) {
      songsToFix.push({ song, calculatedStats });
    }
  }

  // Phase 4: Fix mismatches in batches
  const repairDetails: SongStatsRepairResult['repairDetails'] = [];
  const totalToFix = songsToFix.length;

  for (let i = 0; i < songsToFix.length; i += batchSize) {
    const batch = songsToFix.slice(i, i + batchSize);
    const progressPercent = 20 + Math.round((i / totalToFix) * 75);

    onProgress?.({
      current: progressPercent,
      total: 100,
      phase: `Fixing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalToFix / batchSize)}...`,
    });

    // Process batch in a transaction
    await db.transaction('rw', db.songs, async () => {
      for (const { song, calculatedStats } of batch) {
        await db.songs.update(song.id, {
          totalPerformances: calculatedStats.totalPerformances,
          openerCount: calculatedStats.openerCount,
          closerCount: calculatedStats.closerCount,
          encoreCount: calculatedStats.encoreCount,
          firstPlayedDate: calculatedStats.firstPlayedDate,
          lastPlayedDate: calculatedStats.lastPlayedDate,
        });

        repairDetails.push({
          songId: song.id,
          songTitle: song.title,
          oldTotal: song.totalPerformances,
          newTotal: calculatedStats.totalPerformances,
          oldOpenerCount: song.openerCount,
          newOpenerCount: calculatedStats.openerCount,
          oldCloserCount: song.closerCount,
          newCloserCount: calculatedStats.closerCount,
          oldEncoreCount: song.encoreCount,
          newEncoreCount: calculatedStats.encoreCount,
        });
      }
    });

    // Yield to main thread between batches
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.({ current: 100, total: 100, phase: 'Complete!' });

  const repairTime = performance.now() - startTime;

  return {
    totalRepaired: repairDetails.length,
    repairDetails,
    repairTime,
    timestamp: new Date(),
  };
}

/**
 * Dry run - show what would be fixed without making changes.
 *
 * @returns Preview of fixes that would be applied
 */
export async function previewFixes(): Promise<{
  wouldFix: number;
  preview: SongStatsMismatch[];
  estimatedTime: number;
}> {
  const result = await validateAllSongStats();

  // Estimate time based on validation time (fixing is ~2x validation)
  const estimatedTime = result.validationTime * 2;

  return {
    wouldFix: result.mismatchedSongs,
    preview: result.mismatches,
    estimatedTime,
  };
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate a human-readable report of mismatches.
 */
export async function generateMismatchReport(): Promise<string> {
  const result = await validateAllSongStats();
  const summary = await getMismatchSummary();

  const lines: string[] = [
    '# Song Statistics Validation Report',
    `Generated: ${result.timestamp.toISOString()}`,
    `Validation Time: ${result.validationTime.toFixed(2)}ms`,
    '',
    '## Summary',
    `- Total Songs: ${result.totalSongs}`,
    `- Total Setlist Entries: ${result.totalSetlistEntries}`,
    `- Matched Songs: ${result.matchedSongs}`,
    `- Mismatched Songs: ${result.mismatchedSongs}`,
    '',
    '## Mismatch Breakdown',
    `- Overcounted (stored > actual): ${summary.overcounted}`,
    `- Undercounted (stored < actual): ${summary.undercounted}`,
    `- Total Difference: ${summary.totalDifference}`,
    `- Average Difference: ${summary.avgDifference.toFixed(2)}`,
    `- Max Overcount: ${summary.maxOvercount}`,
    `- Max Undercount: ${summary.maxUndercount}`,
    '',
  ];

  if (result.mismatches.length > 0) {
    lines.push('## Top 20 Mismatches');
    lines.push('| Song | Stored | Calculated | Difference |');
    lines.push('|------|--------|------------|------------|');

    const topMismatches = result.mismatches
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 20);

    for (const m of topMismatches) {
      const sign = m.difference > 0 ? '+' : '';
      lines.push(`| ${m.songTitle} | ${m.storedTotal} | ${m.calculatedTotal} | ${sign}${m.difference} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Export mismatches to JSON for external analysis.
 */
export async function exportMismatchesAsJson(): Promise<string> {
  const result = await validateAllSongStats();
  return JSON.stringify(result, null, 2);
}
