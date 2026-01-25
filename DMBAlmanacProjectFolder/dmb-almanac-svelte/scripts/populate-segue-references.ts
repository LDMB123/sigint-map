#!/usr/bin/env node

/**
 * Populate segue_into_song_id and tease_of_song_id references in setlist_entries
 *
 * This script processes setlist entries marked with is_segue or is_tease flags
 * and populates the foreign key references to the song being segued into or teased.
 *
 * Logic:
 * - When is_segue = 1, the song segues into the NEXT song in the setlist
 *   -> Set segue_into_song_id to the song_id of the next position
 * - When is_tease = 1, we need additional data (teaseOfTitle) to determine which song
 *   -> Currently not available in shows.json, so skipped
 *
 * Usage:
 *   npx tsx scripts/populate-segue-references.ts
 */

import Database from "better-sqlite3";
import { existsSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

interface SetlistEntry {
  id: number;
  show_id: number;
  song_id: number;
  position: number;
  is_segue: number;
  is_tease: number;
  segue_into_song_id: number | null;
  tease_of_song_id: number | null;
  song_title: string;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Populating segue and tease references");
  console.log("=".repeat(60));

  // Check database exists
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  // Open database
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  try {
    // Get all setlist entries ordered by show and position
    console.log("\nLoading setlist entries...");
    const entries = db.prepare(`
      SELECT
        se.id,
        se.show_id,
        se.song_id,
        se.position,
        se.is_segue,
        se.is_tease,
        se.segue_into_song_id,
        se.tease_of_song_id,
        s.title as song_title
      FROM setlist_entries se
      JOIN songs s ON se.song_id = s.id
      ORDER BY se.show_id, se.position
    `).all() as SetlistEntry[];

    console.log(`Loaded ${entries.length} setlist entries`);

    // Group entries by show_id
    console.log("\nGrouping entries by show...");
    const showMap = new Map<number, SetlistEntry[]>();
    for (const entry of entries) {
      if (!showMap.has(entry.show_id)) {
        showMap.set(entry.show_id, []);
      }
      showMap.get(entry.show_id)!.push(entry);
    }
    console.log(`Found ${showMap.size} unique shows`);

    // Prepare update statement
    const updateSegue = db.prepare(`
      UPDATE setlist_entries
      SET segue_into_song_id = ?
      WHERE id = ?
    `);

    const updateTease = db.prepare(`
      UPDATE setlist_entries
      SET tease_of_song_id = ?
      WHERE id = ?
    `);

    // Track stats
    let seguesProcessed = 0;
    let seguesLinked = 0;
    let seguesSkipped = 0;
    let teasesProcessed = 0;
    let teasesSkipped = 0;

    // Process segues within a transaction
    console.log("\nProcessing segues...");
    const processAll = db.transaction(() => {
      for (const [showId, showEntries] of showMap) {
        // Sort by position to ensure correct ordering
        showEntries.sort((a, b) => a.position - b.position);

        for (let i = 0; i < showEntries.length; i++) {
          const entry = showEntries[i];

          // Process segues
          if (entry.is_segue === 1) {
            seguesProcessed++;

            // Check if there's a next song in the setlist
            if (i + 1 < showEntries.length) {
              const nextEntry = showEntries[i + 1];

              // Only update if not already set
              if (entry.segue_into_song_id === null) {
                updateSegue.run(nextEntry.song_id, entry.id);
                seguesLinked++;

                if (seguesLinked <= 10) {
                  console.log(
                    `  Show ${showId}: "${entry.song_title}" (pos ${entry.position}) -> "${nextEntry.song_title}" (pos ${nextEntry.position})`
                  );
                }
              } else {
                seguesSkipped++;
              }
            } else {
              // No next song (segue at end of setlist - unusual but possible)
              console.log(
                `  Warning: Show ${showId} has segue at last position (${entry.position}): "${entry.song_title}"`
              );
              seguesSkipped++;
            }
          }

          // Process teases - currently we don't have teaseOfTitle data in shows.json
          // so we can't automatically populate tease_of_song_id
          if (entry.is_tease === 1) {
            teasesProcessed++;

            if (entry.tease_of_song_id === null) {
              teasesSkipped++;
            }
          }
        }
      }
    });

    processAll();

    // Get final counts
    const segueCount = db.prepare(
      "SELECT COUNT(*) as count FROM setlist_entries WHERE segue_into_song_id IS NOT NULL"
    ).get() as { count: number };

    const teaseCount = db.prepare(
      "SELECT COUNT(*) as count FROM setlist_entries WHERE tease_of_song_id IS NOT NULL"
    ).get() as { count: number };

    const totalSegues = db.prepare(
      "SELECT COUNT(*) as count FROM setlist_entries WHERE is_segue = 1"
    ).get() as { count: number };

    const totalTeases = db.prepare(
      "SELECT COUNT(*) as count FROM setlist_entries WHERE is_tease = 1"
    ).get() as { count: number };

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("Results");
    console.log("=".repeat(60));
    console.log("\nSegues:");
    console.log(`  Total entries with is_segue=1: ${totalSegues.count}`);
    console.log(`  Segues processed: ${seguesProcessed}`);
    console.log(`  Segues linked: ${seguesLinked}`);
    console.log(`  Segues skipped (already set): ${seguesSkipped}`);
    console.log(`  Final count with segue_into_song_id: ${segueCount.count}`);

    console.log("\nTeases:");
    console.log(`  Total entries with is_tease=1: ${totalTeases.count}`);
    console.log(`  Teases processed: ${teasesProcessed}`);
    console.log(`  Teases skipped (no reference data): ${teasesSkipped}`);
    console.log(`  Final count with tease_of_song_id: ${teaseCount.count}`);
    console.log(
      `  Note: Tease references require manual data or additional scraping`
    );

    // Show some examples of segues
    console.log("\nSample segues (first 10):");
    const sampleSegues = db.prepare(`
      SELECT
        sh.date,
        s1.title as from_song,
        se.position,
        s2.title as into_song
      FROM setlist_entries se
      JOIN shows sh ON se.show_id = sh.id
      JOIN songs s1 ON se.song_id = s1.id
      JOIN songs s2 ON se.segue_into_song_id = s2.id
      WHERE se.segue_into_song_id IS NOT NULL
      ORDER BY sh.date DESC
      LIMIT 10
    `).all() as Array<{
      date: string;
      from_song: string;
      position: number;
      into_song: string;
    }>;

    for (const segue of sampleSegues) {
      console.log(
        `  ${segue.date} (pos ${segue.position}): ${segue.from_song} > ${segue.into_song}`
      );
    }

    // Validation: Check for any segues at end of setlist
    const endSegues = db.prepare(`
      SELECT COUNT(*) as count
      FROM setlist_entries se1
      WHERE se1.is_segue = 1
      AND se1.segue_into_song_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM setlist_entries se2
        WHERE se2.show_id = se1.show_id
        AND se2.position > se1.position
      )
    `).get() as { count: number };

    if (endSegues.count > 0) {
      console.log(
        `\nWarning: ${endSegues.count} segues at end of setlist (no next song)`
      );
    }

    console.log("\nDone!");
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
