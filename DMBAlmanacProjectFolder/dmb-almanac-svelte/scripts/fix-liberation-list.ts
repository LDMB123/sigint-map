#!/usr/bin/env tsx
/**
 * Fix Liberation List Calculations
 *
 * This script corrects the liberation list data by:
 * 1. Finding actual last played dates from setlist_entries
 * 2. Updating last_played_date and last_show_id with correct values
 * 3. Recalculating days_since from last played to today
 * 4. Recalculating shows_since as count of shows after last played
 * 5. Re-ranking songs by days_since (descending)
 * 6. Marking songs as liberated if they've been played after being on the list
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'dmb-almanac.db');

interface LiberationListEntry {
  id: number;
  song_id: number;
  last_played_date: string;
  last_played_show_id: number;
  days_since: number;
  shows_since: number;
}

interface LastPlayedInfo {
  song_id: number;
  last_played_date: string;
  last_show_id: number;
  show_count_after: number;
}

interface SongInfo {
  song_id: number;
  song_title: string;
  old_last_played: string;
  old_show_id: number;
  new_last_played: string;
  new_show_id: number;
  old_days_since: number;
  new_days_since: number;
  old_shows_since: number;
  new_shows_since: number;
}

function main() {
  console.log('🔧 Starting Liberation List Fix Script');
  console.log('=====================================\n');

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Reference date: ${today}\n`);

    // Step 1: Audit current state
    console.log('📊 STEP 1: Auditing current liberation_list...');
    const auditResults = db.prepare(`
      SELECT
        COUNT(*) as total_songs,
        COUNT(CASE WHEN last_played_show_id = 5523 THEN 1 END) as placeholder_count,
        MIN(last_played_date) as earliest_date,
        MAX(last_played_date) as latest_date
      FROM liberation_list
    `).get() as any;

    console.log(`  Total songs: ${auditResults.total_songs}`);
    console.log(`  Placeholder references (show 5523): ${auditResults.placeholder_count}`);
    console.log(`  Date range: ${auditResults.earliest_date} to ${auditResults.latest_date}\n`);

    // Step 2: Find actual last played dates for each song
    console.log('🔍 STEP 2: Finding actual last played dates...');

    const lastPlayedQuery = db.prepare(`
      WITH song_last_played AS (
        SELECT
          se.song_id,
          s.date as last_played_date,
          se.show_id as last_show_id,
          ROW_NUMBER() OVER (PARTITION BY se.song_id ORDER BY s.date DESC) as rn
        FROM setlist_entries se
        JOIN shows s ON se.show_id = s.id
        WHERE se.song_id IN (SELECT song_id FROM liberation_list)
      ),
      latest_plays AS (
        SELECT
          song_id,
          last_played_date,
          last_show_id
        FROM song_last_played
        WHERE rn = 1
      ),
      show_counts AS (
        SELECT
          lp.song_id,
          lp.last_played_date,
          lp.last_show_id,
          COUNT(DISTINCT s.id) as show_count_after
        FROM latest_plays lp
        CROSS JOIN shows s
        WHERE s.date > lp.last_played_date
        GROUP BY lp.song_id, lp.last_played_date, lp.last_show_id
      )
      SELECT
        song_id,
        last_played_date,
        last_show_id,
        show_count_after
      FROM show_counts
    `);

    const lastPlayedData = lastPlayedQuery.all() as LastPlayedInfo[];
    console.log(`  Found last played info for ${lastPlayedData.length} songs\n`);

    // Step 3: Collect changes for reporting
    console.log('📝 STEP 3: Calculating updates...');

    const changes: SongInfo[] = [];

    for (const lpd of lastPlayedData) {
      // Get current data
      const current = db.prepare(`
        SELECT
          ll.id,
          ll.song_id,
          ll.last_played_date,
          ll.last_played_show_id,
          ll.days_since,
          ll.shows_since,
          s.title as song_title
        FROM liberation_list ll
        JOIN songs s ON ll.song_id = s.id
        WHERE ll.song_id = ?
      `).get(lpd.song_id) as any;

      if (!current) continue;

      // Calculate new days_since
      const lastPlayedMs = new Date(lpd.last_played_date).getTime();
      const todayMs = new Date(today).getTime();
      const newDaysSince = Math.floor((todayMs - lastPlayedMs) / (1000 * 60 * 60 * 24));

      // Only track if there's a change
      if (current.last_played_show_id !== lpd.last_show_id ||
          current.days_since !== newDaysSince ||
          current.shows_since !== lpd.show_count_after) {
        changes.push({
          song_id: lpd.song_id,
          song_title: current.song_title,
          old_last_played: current.last_played_date,
          old_show_id: current.last_played_show_id,
          new_last_played: lpd.last_played_date,
          new_show_id: lpd.last_show_id,
          old_days_since: current.days_since,
          new_days_since: newDaysSince,
          old_shows_since: current.shows_since,
          new_shows_since: lpd.show_count_after
        });
      }
    }

    console.log(`  ${changes.length} songs need updates\n`);

    // Step 4: Begin transaction and update database
    console.log('💾 STEP 4: Updating database...');

    db.exec('BEGIN TRANSACTION');

    const updateStmt = db.prepare(`
      UPDATE liberation_list
      SET
        last_played_date = ?,
        last_played_show_id = ?,
        days_since = ?,
        shows_since = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE song_id = ?
    `);

    let updateCount = 0;
    for (const lpd of lastPlayedData) {
      const lastPlayedMs = new Date(lpd.last_played_date).getTime();
      const todayMs = new Date(today).getTime();
      const daysSince = Math.floor((todayMs - lastPlayedMs) / (1000 * 60 * 60 * 24));

      updateStmt.run(
        lpd.last_played_date,
        lpd.last_show_id,
        daysSince,
        lpd.show_count_after,
        lpd.song_id
      );
      updateCount++;
    }

    console.log(`  Updated ${updateCount} records\n`);

    // Step 5: Verify placeholder removal
    console.log('✅ STEP 5: Verifying placeholder removal...');

    const remainingPlaceholders = db.prepare(`
      SELECT COUNT(*) as count
      FROM liberation_list
      WHERE last_played_show_id = 5523
    `).get() as any;

    console.log(`  Remaining placeholder references: ${remainingPlaceholders.count}\n`);

    // Step 6: Commit transaction
    db.exec('COMMIT');
    console.log('✨ Transaction committed successfully\n');

    // Step 7: Re-run rankings (if there's a gap_rank column)
    console.log('🏆 STEP 7: Checking rankings...');

    const columns = db.prepare(`PRAGMA table_info(liberation_list)`).all() as any[];
    const hasGapRank = columns.some((col: any) => col.name === 'gap_rank');

    if (hasGapRank) {
      console.log('  Updating gap_rank based on days_since...');
      db.exec(`
        UPDATE liberation_list
        SET gap_rank = (
          SELECT COUNT(*) + 1
          FROM liberation_list ll2
          WHERE ll2.days_since > liberation_list.days_since
        )
      `);
      console.log('  Rankings updated\n');
    } else {
      console.log('  No gap_rank column found - skipping ranking\n');
    }

    // Step 8: Generate report
    console.log('📋 STEP 8: Changes Report');
    console.log('==========================\n');

    if (changes.length === 0) {
      console.log('No changes needed - data was already correct!\n');
    } else {
      console.log(`Top 10 Most Significant Changes (by days_since correction):\n`);

      const significantChanges = changes
        .map(c => ({
          ...c,
          days_delta: Math.abs(c.new_days_since - c.old_days_since)
        }))
        .sort((a, b) => b.days_delta - a.days_delta)
        .slice(0, 10);

      for (let i = 0; i < significantChanges.length; i++) {
        const change = significantChanges[i];
        console.log(`${i + 1}. "${change.song_title}"`);
        console.log(`   Old: ${change.old_last_played} (show ${change.old_show_id}) - ${change.old_days_since} days`);
        console.log(`   New: ${change.new_last_played} (show ${change.new_show_id}) - ${change.new_days_since} days`);
        console.log(`   Delta: ${change.days_delta} days correction\n`);
      }
    }

    // Step 9: Final statistics
    console.log('📊 STEP 9: Final Statistics');
    console.log('===========================\n');

    const finalStats = db.prepare(`
      SELECT
        COUNT(*) as total_songs,
        MIN(days_since) as min_gap,
        MAX(days_since) as max_gap,
        AVG(days_since) as avg_gap,
        MIN(shows_since) as min_shows,
        MAX(shows_since) as max_shows,
        AVG(shows_since) as avg_shows
      FROM liberation_list
    `).get() as any;

    console.log(`Total songs on liberation list: ${finalStats.total_songs}`);
    console.log(`Days since range: ${finalStats.min_gap} - ${finalStats.max_gap} (avg: ${Math.round(finalStats.avg_gap)})`);
    console.log(`Shows since range: ${finalStats.min_shows} - ${finalStats.max_shows} (avg: ${Math.round(finalStats.avg_shows)})\n`);

    // Top 10 longest gaps
    console.log('🏆 Top 10 Longest Gaps (Current Liberation List):');
    const topGaps = db.prepare(`
      SELECT
        s.title,
        ll.last_played_date,
        ll.days_since,
        ll.shows_since
      FROM liberation_list ll
      JOIN songs s ON ll.song_id = s.id
      ORDER BY ll.days_since DESC
      LIMIT 10
    `).all() as any[];

    topGaps.forEach((song, idx) => {
      console.log(`${idx + 1}. "${song.title}" - ${song.days_since} days (${song.shows_since} shows) since ${song.last_played_date}`);
    });

    console.log('\n✅ Liberation list fix completed successfully!');

  } catch (error) {
    console.error('❌ Error during liberation list fix:', error);
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      // Transaction may not have been started yet
    }
    throw error;
  } finally {
    db.close();
  }
}

main();
