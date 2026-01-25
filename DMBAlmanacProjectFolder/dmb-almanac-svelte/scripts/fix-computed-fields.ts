/**
 * Fix computed fields in the database
 * - Update show song_count from setlist_entries
 * - Update venue total_shows, first_show_date, last_show_date
 * - Update song stats from setlist_entries
 * - Update tour stats
 */

import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

async function main() {
  console.log("Fixing computed fields in database...\n");

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    // 1. Fix show song_count
    console.log("1. Updating show song_count...");
    const showResult = db
      .prepare(`
      UPDATE shows SET song_count = (
        SELECT COUNT(*) FROM setlist_entries WHERE show_id = shows.id
      )
    `)
      .run();
    console.log(`   Updated ${showResult.changes} shows`);

    // 2. Fix venue stats
    console.log("\n2. Updating venue stats...");
    const venueResult = db
      .prepare(`
      UPDATE venues SET
        total_shows = (SELECT COUNT(*) FROM shows WHERE venue_id = venues.id),
        first_show_date = (SELECT MIN(date) FROM shows WHERE venue_id = venues.id),
        last_show_date = (SELECT MAX(date) FROM shows WHERE venue_id = venues.id)
    `)
      .run();
    console.log(`   Updated ${venueResult.changes} venues`);

    // 3. Fix song stats from setlist_entries
    console.log("\n3. Updating song performance stats...");

    // Total performances
    db.prepare(`
      UPDATE songs SET total_performances = (
        SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id
      )
    `).run();

    // First played date
    db.prepare(`
      UPDATE songs SET first_played_date = (
        SELECT MIN(s.date) FROM shows s
        JOIN setlist_entries se ON se.show_id = s.id
        WHERE se.song_id = songs.id
      )
      WHERE first_played_date IS NULL OR first_played_date = ''
    `).run();

    // Last played date
    db.prepare(`
      UPDATE songs SET last_played_date = (
        SELECT MAX(s.date) FROM shows s
        JOIN setlist_entries se ON se.show_id = s.id
        WHERE se.song_id = songs.id
      )
    `).run();

    // Opener count (position = 1 in first set)
    db.prepare(`
      UPDATE songs SET opener_count = (
        SELECT COUNT(*) FROM setlist_entries
        WHERE song_id = songs.id AND position = 1 AND set_name = 'set1'
      )
    `).run();

    // Closer count (last song before encore)
    db.prepare(`
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

    // Encore count
    db.prepare(`
      UPDATE songs SET encore_count = (
        SELECT COUNT(*) FROM setlist_entries
        WHERE song_id = songs.id AND set_name LIKE 'encore%'
      )
    `).run();

    console.log("   Updated song stats");

    // 4. Fix tour stats
    console.log("\n4. Updating tour stats...");

    // Total shows per tour
    db.prepare(`
      UPDATE tours SET total_shows = (
        SELECT COUNT(*) FROM shows WHERE tour_id = tours.id
      )
    `).run();

    // Start/end dates
    db.prepare(`
      UPDATE tours SET
        start_date = (SELECT MIN(date) FROM shows WHERE tour_id = tours.id),
        end_date = (SELECT MAX(date) FROM shows WHERE tour_id = tours.id)
    `).run();

    // Unique songs played
    db.prepare(`
      UPDATE tours SET unique_songs_played = (
        SELECT COUNT(DISTINCT se.song_id)
        FROM setlist_entries se
        JOIN shows s ON se.show_id = s.id
        WHERE s.tour_id = tours.id
      )
    `).run();

    // Average songs per show
    db.prepare(`
      UPDATE tours SET average_songs_per_show = (
        SELECT ROUND(AVG(song_count), 1) FROM shows WHERE tour_id = tours.id AND song_count > 0
      )
    `).run();

    console.log("   Updated tour stats");

    // 5. Fix guest stats
    console.log("\n5. Updating guest stats...");

    db.prepare(`
      UPDATE guests SET total_appearances = (
        SELECT COUNT(*) FROM guest_appearances WHERE guest_id = guests.id
      )
    `).run();

    db.prepare(`
      UPDATE guests SET first_appearance_date = (
        SELECT MIN(s.date) FROM shows s
        JOIN guest_appearances ga ON ga.show_id = s.id
        WHERE ga.guest_id = guests.id
      )
      WHERE first_appearance_date IS NULL
    `).run();

    db.prepare(`
      UPDATE guests SET last_appearance_date = (
        SELECT MAX(s.date) FROM shows s
        JOIN guest_appearances ga ON ga.show_id = s.id
        WHERE ga.guest_id = guests.id
      )
    `).run();

    console.log("   Updated guest stats");

    // Print summary
    console.log("\n=== Summary ===");

    const showStats = db
      .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN song_count > 0 THEN 1 ELSE 0 END) as with_songs,
        AVG(song_count) as avg_songs
      FROM shows
    `)
      .get() as { total: number; with_songs: number; avg_songs: number };
    console.log(
      `Shows: ${showStats.total} total, ${showStats.with_songs} with setlists, avg ${showStats.avg_songs?.toFixed(1)} songs`
    );

    const songStats = db
      .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN total_performances > 0 THEN 1 ELSE 0 END) as played,
        SUM(CASE WHEN first_played_date IS NOT NULL THEN 1 ELSE 0 END) as with_dates
      FROM songs
    `)
      .get() as { total: number; played: number; with_dates: number };
    console.log(
      `Songs: ${songStats.total} total, ${songStats.played} played, ${songStats.with_dates} with dates`
    );

    const venueStats = db
      .prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN total_shows > 0 THEN 1 ELSE 0 END) as with_shows
      FROM venues
    `)
      .get() as { total: number; with_shows: number };
    console.log(`Venues: ${venueStats.total} total, ${venueStats.with_shows} with shows`);

    const guestStats = db
      .prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN total_appearances > 0 THEN 1 ELSE 0 END) as with_appearances
      FROM guests
    `)
      .get() as { total: number; with_appearances: number };
    console.log(
      `Guests: ${guestStats.total} total, ${guestStats.with_appearances} with appearances`
    );
  } finally {
    db.close();
  }
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
