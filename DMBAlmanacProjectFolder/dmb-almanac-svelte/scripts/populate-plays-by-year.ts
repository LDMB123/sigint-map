#!/usr/bin/env tsx
/**
 * DMB Almanac - Populate Plays By Year Script
 *
 * Aggregates play counts by year for each song and stores as JSON in song_statistics.plays_by_year.
 *
 * This script:
 * 1. Queries setlist_entries joined with shows to get play counts by year for each song
 * 2. Aggregates data into JSON format: {"1991": 5, "1992": 12, ...}
 * 3. Updates song_statistics.plays_by_year for each song
 *
 * Usage:
 *   npx tsx scripts/populate-plays-by-year.ts
 *
 * Performance:
 *   - Processes ~767 songs
 *   - Uses single transaction for atomicity
 *   - Batch updates for efficiency
 *
 * @author DMB Almanac DevOps Team
 */

import Database from 'better-sqlite3';
import { join } from 'node:path';

// ==================== CONFIGURATION ====================

const DB_PATH = join(process.cwd(), 'data', 'dmb-almanac.db');

interface PlaysByYear {
  [year: string]: number;
}

interface SongPlayData {
  song_id: number;
  year: string;
  plays: number;
}

// ==================== DATABASE ====================

/**
 * Open database connection with proper configuration
 */
function openDatabase(): Database.Database {
  try {
    const db = new Database(DB_PATH);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('[DB] Connected to database');
    return db;
  } catch (error) {
    console.error('[DB] Failed to open database:', error);
    process.exit(1);
  }
}

// ==================== DATA AGGREGATION ====================

/**
 * Query all play counts by year for all songs
 *
 * This query:
 * - Joins setlist_entries with shows to get show dates
 * - Extracts year from show date using strftime
 * - Groups by song_id and year
 * - Counts plays per year
 * - Orders for consistent processing
 */
function getPlaysByYear(db: Database.Database): SongPlayData[] {
  console.log('[Query] Fetching play counts by year...');

  const query = `
    SELECT
      se.song_id,
      strftime('%Y', s.date) as year,
      COUNT(*) as plays
    FROM setlist_entries se
    JOIN shows s ON se.show_id = s.id
    WHERE s.date IS NOT NULL
    GROUP BY se.song_id, year
    ORDER BY se.song_id, year
  `;

  try {
    const results = db.prepare(query).all() as SongPlayData[];
    console.log(`[Query] Found ${results.length} song-year combinations`);
    return results;
  } catch (error) {
    console.error('[Query] Failed to fetch play data:', error);
    throw error;
  }
}

/**
 * Aggregate play data into JSON format grouped by song
 *
 * Transforms flat data:
 *   [{song_id: 1, year: "1991", plays: 5}, {song_id: 1, year: "1992", plays: 12}, ...]
 *
 * Into nested structure:
 *   {1: {"1991": 5, "1992": 12}, 2: {"1991": 3}, ...}
 */
function aggregatePlaysByYear(playData: SongPlayData[]): Map<number, PlaysByYear> {
  console.log('[Aggregate] Grouping plays by song and year...');

  const songMap = new Map<number, PlaysByYear>();

  for (const row of playData) {
    if (!songMap.has(row.song_id)) {
      songMap.set(row.song_id, {});
    }

    const yearData = songMap.get(row.song_id)!;
    yearData[row.year] = row.plays;
  }

  console.log(`[Aggregate] Aggregated data for ${songMap.size} songs`);
  return songMap;
}

// ==================== DATABASE UPDATES ====================

/**
 * Update song_statistics.plays_by_year for all songs
 *
 * Uses a single transaction for:
 * - Atomicity: All updates succeed or all fail
 * - Performance: ~100x faster than individual updates
 * - Consistency: Database remains in valid state
 */
function updateSongStatistics(db: Database.Database, songData: Map<number, PlaysByYear>): void {
  console.log('[Update] Updating song_statistics table...');
  console.log('[Update] Starting transaction...');

  const updateStmt = db.prepare(`
    UPDATE song_statistics
    SET
      plays_by_year = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE song_id = ?
  `);

  // Check if any records exist
  const countResult = db.prepare('SELECT COUNT(*) as count FROM song_statistics').get() as { count: number };
  console.log(`[Update] Found ${countResult.count} records in song_statistics`);

  if (countResult.count === 0) {
    console.warn('[Update] Warning: song_statistics table is empty!');
    console.warn('[Update] You may need to run a script to populate song_statistics first');
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  // Use transaction for atomic updates
  const transaction = db.transaction(() => {
    for (const [songId, playsByYear] of songData.entries()) {
      try {
        const jsonData = JSON.stringify(playsByYear);
        const result = updateStmt.run(jsonData, songId);

        if (result.changes > 0) {
          updatedCount++;
        } else {
          skippedCount++;
          console.warn(`[Update] Warning: No song_statistics record found for song_id ${songId}`);
        }
      } catch (error) {
        console.error(`[Update] Failed to update song_id ${songId}:`, error);
        throw error;
      }
    }
  });

  try {
    transaction();
    console.log(`[Update] Transaction committed successfully`);
    console.log(`[Update] Updated ${updatedCount} records`);
    if (skippedCount > 0) {
      console.log(`[Update] Skipped ${skippedCount} records (no matching song_statistics entry)`);
    }
  } catch (error) {
    console.error('[Update] Transaction failed, rolling back:', error);
    throw error;
  }
}

// ==================== VALIDATION ====================

/**
 * Validate updated data by sampling a few songs
 */
function validateUpdates(db: Database.Database): void {
  console.log('[Validate] Checking updated data...');

  const query = `
    SELECT
      ss.song_id,
      s.title,
      ss.plays_by_year,
      s.total_performances
    FROM song_statistics ss
    JOIN songs s ON ss.song_id = s.id
    WHERE ss.plays_by_year IS NOT NULL
    LIMIT 5
  `;

  interface ValidationRow {
    song_id: number;
    title: string;
    plays_by_year: string;
    total_performances: number;
  }

  const results = db.prepare(query).all() as ValidationRow[];

  console.log('[Validate] Sample of updated records:');
  console.log('');

  for (const row of results) {
    const playsByYear = JSON.parse(row.plays_by_year) as PlaysByYear;
    const years = Object.keys(playsByYear).sort();
    const totalPlays = Object.values(playsByYear).reduce((sum, count) => sum + count, 0);

    console.log(`  Song ID ${row.song_id}: "${row.title}"`);
    console.log(`    Years active: ${years[0]} - ${years[years.length - 1]}`);
    console.log(`    Total years: ${years.length}`);
    console.log(`    Total plays (from JSON): ${totalPlays}`);
    console.log(`    Total performances (from songs): ${row.total_performances}`);

    if (totalPlays !== row.total_performances) {
      console.warn(`    WARNING: Play count mismatch!`);
    }

    console.log('');
  }

  // Check for empty plays_by_year
  const emptyCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM song_statistics
    WHERE plays_by_year IS NULL OR plays_by_year = ''
  `).get() as { count: number };

  if (emptyCount.count > 0) {
    console.warn(`[Validate] Warning: ${emptyCount.count} records still have empty plays_by_year`);
  } else {
    console.log('[Validate] All records have plays_by_year data');
  }
}

/**
 * Display summary statistics
 */
function displaySummary(db: Database.Database): void {
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  interface SummaryStats {
    total_songs: number;
    songs_with_data: number;
    earliest_year: string;
    latest_year: string;
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_songs,
      SUM(CASE WHEN plays_by_year IS NOT NULL AND plays_by_year != '' THEN 1 ELSE 0 END) as songs_with_data,
      MIN(s.first_played_date) as earliest_year,
      MAX(s.last_played_date) as latest_year
    FROM song_statistics ss
    JOIN songs s ON ss.song_id = s.id
  `).get() as SummaryStats;

  console.log('');
  console.log(`Total songs in statistics:     ${stats.total_songs}`);
  console.log(`Songs with plays_by_year data: ${stats.songs_with_data}`);
  console.log(`Date range:                    ${stats.earliest_year} - ${stats.latest_year}`);
  console.log('');

  // Find most played years
  interface YearStats {
    year: string;
    total_plays: number;
  }

  const yearQuery = `
    SELECT
      strftime('%Y', s.date) as year,
      COUNT(*) as total_plays
    FROM setlist_entries se
    JOIN shows s ON se.show_id = s.id
    WHERE s.date IS NOT NULL
    GROUP BY year
    ORDER BY total_plays DESC
    LIMIT 5
  `;

  const topYears = db.prepare(yearQuery).all() as YearStats[];

  console.log('Top 5 years by total plays:');
  for (const year of topYears) {
    console.log(`  ${year.year}: ${year.total_plays} performances`);
  }

  console.log('');
  console.log('='.repeat(70));
}

// ==================== MAIN ====================

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('DMB Almanac - Populate Plays By Year');
  console.log('='.repeat(70));
  console.log('');

  const startTime = Date.now();

  let db: Database.Database | null = null;

  try {
    // 1. Open database
    db = openDatabase();

    // 2. Query play data
    const playData = getPlaysByYear(db);

    if (playData.length === 0) {
      console.log('[Main] No play data found. Database may be empty.');
      return;
    }

    // 3. Aggregate by song
    const aggregatedData = aggregatePlaysByYear(playData);

    // 4. Update song_statistics
    updateSongStatistics(db, aggregatedData);

    // 5. Validate updates
    validateUpdates(db);

    // 6. Display summary
    displaySummary(db);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Main] Completed in ${elapsedTime}s`);
    console.log('');

  } catch (error) {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (db) {
      db.close();
      console.log('[DB] Connection closed');
    }
  }
}

main().catch((error) => {
  console.error('[Main] Unhandled error:', error);
  process.exit(1);
});
