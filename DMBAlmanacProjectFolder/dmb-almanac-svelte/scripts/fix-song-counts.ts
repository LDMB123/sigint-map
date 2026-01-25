/**
 * Fix all denormalized song counts in the DMB Almanac database
 *
 * This script audits and fixes:
 * 1. songs.total_performances - should match COUNT(*) from setlist_entries
 * 2. songs.first_played_date - should match MIN(shows.date)
 * 3. songs.last_played_date - should match MAX(shows.date)
 * 4. songs.opener_count - first song of set1
 * 5. songs.closer_count - last song before encore
 * 6. songs.encore_count - songs in encore sets
 *
 * The audit found 341 songs with incorrect total_performances counts.
 */

import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

interface SongStats {
  id: number;
  title: string;
  total_performances: number;
  first_played_date: string | null;
  last_played_date: string | null;
  opener_count: number;
  closer_count: number;
  encore_count: number;
}

interface ActualStats {
  song_id: number;
  actual_performances: number;
  actual_first_date: string | null;
  actual_last_date: string | null;
  actual_openers: number;
  actual_closers: number;
  actual_encores: number;
}

interface Discrepancy {
  song_id: number;
  title: string;
  field: string;
  current: number | string | null;
  correct: number | string | null;
}

async function main() {
  console.log("=".repeat(80));
  console.log("Fix All Denormalized Song Counts");
  console.log("=".repeat(80));
  console.log();

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    // Phase 1: Audit current state
    console.log("Phase 1: Auditing current song counts...\n");

    const totalSongs = db.prepare("SELECT COUNT(*) as count FROM songs").get() as { count: number };
    console.log(`Total songs in database: ${totalSongs.count}`);

    // Get discrepancies for total_performances
    const performanceDiscrepancies = db.prepare(`
      SELECT
        s.id as song_id,
        s.title,
        s.total_performances as current_count,
        COUNT(se.id) as actual_count
      FROM songs s
      LEFT JOIN setlist_entries se ON se.song_id = s.id
      GROUP BY s.id, s.title, s.total_performances
      HAVING s.total_performances != COUNT(se.id)
      ORDER BY s.title
    `).all() as Array<{ song_id: number; title: string; current_count: number; actual_count: number }>;

    console.log(`\nTotal performances discrepancies: ${performanceDiscrepancies.length}`);
    if (performanceDiscrepancies.length > 0) {
      console.log("\nSample discrepancies (first 10):");
      performanceDiscrepancies.slice(0, 10).forEach(d => {
        console.log(`  - "${d.title}" (ID ${d.song_id}): current=${d.current_count}, actual=${d.actual_count}, diff=${d.actual_count - d.current_count}`);
      });
    }

    // Get discrepancies for dates
    const dateDiscrepancies = db.prepare(`
      SELECT
        s.id as song_id,
        s.title,
        s.first_played_date as current_first,
        s.last_played_date as current_last,
        MIN(sh.date) as actual_first,
        MAX(sh.date) as actual_last
      FROM songs s
      LEFT JOIN setlist_entries se ON se.song_id = s.id
      LEFT JOIN shows sh ON se.show_id = sh.id
      GROUP BY s.id, s.title, s.first_played_date, s.last_played_date
      HAVING s.first_played_date != MIN(sh.date) OR s.last_played_date != MAX(sh.date)
      ORDER BY s.title
    `).all() as Array<{
      song_id: number;
      title: string;
      current_first: string | null;
      current_last: string | null;
      actual_first: string | null;
      actual_last: string | null;
    }>;

    console.log(`\nDate discrepancies: ${dateDiscrepancies.length}`);
    if (dateDiscrepancies.length > 0) {
      console.log("\nSample date discrepancies (first 5):");
      dateDiscrepancies.slice(0, 5).forEach(d => {
        console.log(`  - "${d.title}" (ID ${d.song_id}):`);
        console.log(`    First: ${d.current_first} → ${d.actual_first}`);
        console.log(`    Last: ${d.current_last} → ${d.actual_last}`);
      });
    }

    // Get discrepancies for slot counts
    const slotDiscrepancies = db.prepare(`
      SELECT
        s.id as song_id,
        s.title,
        s.opener_count as current_openers,
        s.closer_count as current_closers,
        s.encore_count as current_encores,
        (SELECT COUNT(*) FROM setlist_entries
         WHERE song_id = s.id AND position = 1 AND set_name = 'set1') as actual_openers,
        (SELECT COUNT(*) FROM setlist_entries se1
         WHERE se1.song_id = s.id
         AND se1.set_name IN ('set1', 'set2', 'set3')
         AND NOT EXISTS (
           SELECT 1 FROM setlist_entries se2
           WHERE se2.show_id = se1.show_id
           AND se2.set_name = se1.set_name
           AND se2.position > se1.position
         )) as actual_closers,
        (SELECT COUNT(*) FROM setlist_entries
         WHERE song_id = s.id AND set_name LIKE 'encore%') as actual_encores
      FROM songs s
    `).all() as Array<{
      song_id: number;
      title: string;
      current_openers: number;
      current_closers: number;
      current_encores: number;
      actual_openers: number;
      actual_closers: number;
      actual_encores: number;
    }>;

    const slotIssues = slotDiscrepancies.filter(d =>
      d.current_openers !== d.actual_openers ||
      d.current_closers !== d.actual_closers ||
      d.current_encores !== d.actual_encores
    );

    console.log(`\nSlot count discrepancies: ${slotIssues.length}`);
    if (slotIssues.length > 0) {
      console.log("\nSample slot discrepancies (first 5):");
      slotIssues.slice(0, 5).forEach(d => {
        const issues = [];
        if (d.current_openers !== d.actual_openers) {
          issues.push(`openers: ${d.current_openers} → ${d.actual_openers}`);
        }
        if (d.current_closers !== d.actual_closers) {
          issues.push(`closers: ${d.current_closers} → ${d.actual_closers}`);
        }
        if (d.current_encores !== d.actual_encores) {
          issues.push(`encores: ${d.current_encores} → ${d.actual_encores}`);
        }
        console.log(`  - "${d.title}" (ID ${d.song_id}): ${issues.join(', ')}`);
      });
    }

    const totalIssues = performanceDiscrepancies.length + dateDiscrepancies.length + slotIssues.length;
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Total issues found: ${totalIssues}`);
    console.log(`${"=".repeat(80)}\n`);

    if (totalIssues === 0) {
      console.log("All song counts are correct. No fixes needed.");
      return;
    }

    // Phase 2: Fix the data
    console.log("Phase 2: Fixing song counts...\n");

    db.prepare("BEGIN TRANSACTION").run();

    try {
      // 1. Fix total_performances
      console.log("1. Updating total_performances...");
      const perfResult = db.prepare(`
        UPDATE songs SET total_performances = (
          SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id
        )
      `).run();
      console.log(`   Updated ${perfResult.changes} songs`);

      // 2. Fix first_played_date
      console.log("\n2. Updating first_played_date...");
      const firstResult = db.prepare(`
        UPDATE songs SET first_played_date = (
          SELECT MIN(sh.date) FROM setlist_entries se
          JOIN shows sh ON se.show_id = sh.id
          WHERE se.song_id = songs.id
        )
      `).run();
      console.log(`   Updated ${firstResult.changes} songs`);

      // 3. Fix last_played_date
      console.log("\n3. Updating last_played_date...");
      const lastResult = db.prepare(`
        UPDATE songs SET last_played_date = (
          SELECT MAX(sh.date) FROM setlist_entries se
          JOIN shows sh ON se.show_id = sh.id
          WHERE se.song_id = songs.id
        )
      `).run();
      console.log(`   Updated ${lastResult.changes} songs`);

      // 4. Fix opener_count
      console.log("\n4. Updating opener_count...");
      const openerResult = db.prepare(`
        UPDATE songs SET opener_count = (
          SELECT COUNT(*) FROM setlist_entries
          WHERE song_id = songs.id AND position = 1 AND set_name = 'set1'
        )
      `).run();
      console.log(`   Updated ${openerResult.changes} songs`);

      // 5. Fix closer_count
      console.log("\n5. Updating closer_count...");
      const closerResult = db.prepare(`
        UPDATE songs SET closer_count = (
          SELECT COUNT(*) FROM setlist_entries se1
          WHERE se1.song_id = songs.id
          AND se1.set_name IN ('set1', 'set2', 'set3')
          AND NOT EXISTS (
            SELECT 1 FROM setlist_entries se2
            WHERE se2.show_id = se1.show_id
            AND se2.set_name = se1.set_name
            AND se2.position > se1.position
          )
        )
      `).run();
      console.log(`   Updated ${closerResult.changes} songs`);

      // 6. Fix encore_count
      console.log("\n6. Updating encore_count...");
      const encoreResult = db.prepare(`
        UPDATE songs SET encore_count = (
          SELECT COUNT(*) FROM setlist_entries
          WHERE song_id = songs.id AND set_name LIKE 'encore%'
        )
      `).run();
      console.log(`   Updated ${encoreResult.changes} songs`);

      db.prepare("COMMIT").run();
      console.log("\n✓ All updates committed successfully");

    } catch (error) {
      db.prepare("ROLLBACK").run();
      throw error;
    }

    // Phase 3: Verify fixes
    console.log(`\n${"=".repeat(80)}`);
    console.log("Phase 3: Verifying fixes...\n");

    // Check for remaining discrepancies
    const remainingPerf = db.prepare(`
      SELECT COUNT(*) as count
      FROM songs s
      LEFT JOIN (
        SELECT song_id, COUNT(*) as cnt FROM setlist_entries GROUP BY song_id
      ) se ON se.song_id = s.id
      WHERE s.total_performances != COALESCE(se.cnt, 0)
    `).get() as { count: number };

    const remainingDates = db.prepare(`
      SELECT COUNT(*) as count
      FROM songs s
      LEFT JOIN (
        SELECT se.song_id, MIN(sh.date) as first, MAX(sh.date) as last
        FROM setlist_entries se
        JOIN shows sh ON se.show_id = sh.id
        GROUP BY se.song_id
      ) dates ON dates.song_id = s.id
      WHERE s.first_played_date != dates.first OR s.last_played_date != dates.last
    `).get() as { count: number };

    console.log("Verification results:");
    console.log(`  - Remaining performance discrepancies: ${remainingPerf.count}`);
    console.log(`  - Remaining date discrepancies: ${remainingDates.count}`);

    if (remainingPerf.count === 0 && remainingDates.count === 0) {
      console.log("\n✓ All discrepancies fixed successfully!");
    } else {
      console.log("\n⚠ Warning: Some discrepancies remain");
    }

    // Phase 4: Summary statistics
    console.log(`\n${"=".repeat(80)}`);
    console.log("Phase 4: Summary Statistics\n");

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_songs,
        SUM(total_performances) as total_performances,
        SUM(opener_count) as total_openers,
        SUM(closer_count) as total_closers,
        SUM(encore_count) as total_encores,
        MIN(first_played_date) as earliest_performance,
        MAX(last_played_date) as latest_performance,
        SUM(CASE WHEN total_performances > 0 THEN 1 ELSE 0 END) as songs_performed,
        SUM(CASE WHEN total_performances = 0 THEN 1 ELSE 0 END) as songs_never_played
      FROM songs
    `).get() as {
      total_songs: number;
      total_performances: number;
      total_openers: number;
      total_closers: number;
      total_encores: number;
      earliest_performance: string;
      latest_performance: string;
      songs_performed: number;
      songs_never_played: number;
    };

    console.log("Song Statistics:");
    console.log(`  Total songs: ${stats.total_songs}`);
    console.log(`  Songs performed: ${stats.songs_performed}`);
    console.log(`  Songs never played: ${stats.songs_never_played}`);
    console.log(`  Total performances: ${stats.total_performances}`);
    console.log(`  Total openers: ${stats.total_openers}`);
    console.log(`  Total closers: ${stats.total_closers}`);
    console.log(`  Total encore performances: ${stats.total_encores}`);
    console.log(`  Date range: ${stats.earliest_performance} to ${stats.latest_performance}`);

    // Top 10 most performed songs
    console.log("\nTop 10 Most Performed Songs:");
    const topSongs = db.prepare(`
      SELECT title, total_performances, first_played_date, last_played_date
      FROM songs
      WHERE total_performances > 0
      ORDER BY total_performances DESC
      LIMIT 10
    `).all() as Array<{
      title: string;
      total_performances: number;
      first_played_date: string;
      last_played_date: string;
    }>;

    topSongs.forEach((song, idx) => {
      console.log(`  ${idx + 1}. ${song.title} - ${song.total_performances} performances (${song.first_played_date} to ${song.last_played_date})`);
    });

    console.log(`\n${"=".repeat(80)}`);

  } finally {
    db.close();
  }
}

main()
  .then(() => {
    console.log("\n✓ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Script failed:", error);
    process.exit(1);
  });
