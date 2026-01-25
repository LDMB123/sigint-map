/**
 * Fix the database by removing incorrect 2025/2026 shows and re-importing corrected data
 */

import { readFileSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "..", "data", "dmb-almanac.db");
const CORRECTED_DATA_PATH = join(process.cwd(), "output", "shows-2025-2026-corrected.json");

interface CorrectedShow {
  originalId: string;
  date: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  tourYear: number;
  tourName: string;
  venueId: string;
}

function main() {
  console.log("Fixing 2025/2026 shows in database...\n");

  // Load corrected data
  const rawData = readFileSync(CORRECTED_DATA_PATH, "utf-8");
  const data = JSON.parse(rawData);
  const correctedShows: CorrectedShow[] = data.shows;

  console.log(`Loaded ${correctedShows.length} corrected shows`);

  // Open database
  const db = new Database(DB_PATH);

  // Get existing 2025/2026 show IDs
  const existingShows = db.prepare(`
    SELECT s.id, s.date, s.venue_id, v.name as venue_name
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    WHERE s.date LIKE '2025%' OR s.date LIKE '2026%'
  `).all() as { id: number; date: string; venue_id: number; venue_name: string }[];

  console.log(`Found ${existingShows.length} existing 2025/2026 shows to fix\n`);

  // Delete existing 2025/2026 data (cascading to setlist_entries and guest_appearances)
  console.log("Deleting old 2025/2026 data...");

  db.exec(`PRAGMA foreign_keys = OFF`);

  // Delete setlist entries for these shows
  const showIds = existingShows.map(s => s.id);
  if (showIds.length > 0) {
    db.prepare(`
      DELETE FROM setlist_entries WHERE show_id IN (${showIds.join(",")})
    `).run();

    // Delete guest appearances for these shows
    db.prepare(`
      DELETE FROM guest_appearances WHERE show_id IN (${showIds.join(",")})
    `).run();

    // Delete shows
    db.prepare(`
      DELETE FROM shows WHERE id IN (${showIds.join(",")})
    `).run();
  }

  console.log(`  Deleted ${existingShows.length} shows and related data`);

  // Get venue ID mapping
  const venueRows = db.prepare(`SELECT id, name FROM venues`).all() as { id: number; name: string }[];
  const venueMap = new Map<string, number>();
  for (const v of venueRows) {
    venueMap.set(v.name.toLowerCase(), v.id);
  }

  // Get tour ID mapping
  const tourRows = db.prepare(`SELECT id, name, year FROM tours`).all() as { id: number; name: string; year: number }[];
  const tourMap = new Map<string, number>();
  for (const t of tourRows) {
    tourMap.set(`${t.year}-${t.name}`, t.id);
  }

  // Insert corrected shows
  console.log("\nInserting corrected shows...");

  const insertShow = db.prepare(`
    INSERT INTO shows (date, venue_id, tour_id, notes)
    VALUES (?, ?, ?, NULL)
  `);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const show of correctedShows) {
    // Find venue ID
    let venueId = venueMap.get(show.venueName.toLowerCase());

    // If not found, try partial match
    if (!venueId) {
      const cleanName = show.venueName.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const [name, id] of venueMap) {
        if (name.replace(/[^a-z0-9]/g, "").includes(cleanName.substring(0, 15))) {
          venueId = id;
          break;
        }
      }
    }

    if (!venueId) {
      console.log(`  Skipping: No venue match for "${show.venueName}"`);
      skippedCount++;
      continue;
    }

    // Find tour ID
    let tourId = tourMap.get(`${show.tourYear}-${show.tourName}`);
    if (!tourId) {
      // Default to first 2025 tour
      tourId = tourMap.get("2025-Misc 2025") || 1;
    }

    try {
      insertShow.run(show.date, venueId, tourId);
      insertedCount++;
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        // Already exists, skip
        skippedCount++;
      } else {
        console.log(`  Error inserting ${show.date} ${show.venueName}: ${error.message}`);
        skippedCount++;
      }
    }
  }

  db.exec(`PRAGMA foreign_keys = ON`);

  console.log(`\nInserted ${insertedCount} shows, skipped ${skippedCount}`);

  // Verify
  const finalCounts = db.prepare(`
    SELECT
      strftime('%Y', date) as year,
      COUNT(*) as count
    FROM shows
    WHERE date LIKE '2025%' OR date LIKE '2026%'
    GROUP BY year
    ORDER BY year
  `).all() as { year: string; count: number }[];

  console.log("\nFinal show counts:");
  for (const row of finalCounts) {
    console.log(`  ${row.year}: ${row.count} shows`);
  }

  // Show sample of dates
  const sampleShows = db.prepare(`
    SELECT s.date, v.name, v.city
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    WHERE s.date LIKE '2025%'
    ORDER BY s.date
    LIMIT 20
  `).all() as { date: string; name: string; city: string }[];

  console.log("\nSample 2025 shows:");
  for (const s of sampleShows) {
    console.log(`  ${s.date} - ${s.name}, ${s.city}`);
  }

  db.close();
  console.log("\nDone!");
}

main();
