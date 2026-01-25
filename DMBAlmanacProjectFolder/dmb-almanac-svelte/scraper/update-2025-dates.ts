/**
 * Update the database with corrected 2025/2026 dates
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
  console.log("Updating database with corrected 2025/2026 dates...\n");

  // Load corrected data
  const rawData = readFileSync(CORRECTED_DATA_PATH, "utf-8");
  const data = JSON.parse(rawData);
  const correctedShows: CorrectedShow[] = data.shows;

  console.log(`Loaded ${correctedShows.length} corrected shows`);

  // Open database
  const db = new Database(DB_PATH);

  // First, let's see what 2025/2026 shows we have
  const existingShows = db.prepare(`
    SELECT s.id, s.date, v.name as venue_name, v.city
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    WHERE s.date LIKE '2025%' OR s.date LIKE '2026%'
    ORDER BY s.date
  `).all() as { id: number; date: string; venue_name: string; city: string }[];

  console.log(`Found ${existingShows.length} existing 2025/2026 shows in database\n`);

  // Create a map from venue name to corrected date
  const venueToCorrectDate = new Map<string, string>();
  for (const show of correctedShows) {
    // Create a key based on venue and approximate date
    const key = show.venueName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
    venueToCorrectDate.set(key, show.date);
  }

  // Update statement
  const updateStmt = db.prepare(`UPDATE shows SET date = ? WHERE id = ?`);

  let updatedCount = 0;
  const updates: { id: number; oldDate: string; newDate: string; venue: string }[] = [];

  // Try to match and update
  for (const existing of existingShows) {
    const venueKey = existing.venue_name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);

    // Find matching corrected show
    const matchingCorrected = correctedShows.find(c => {
      const cKey = c.venueName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
      return cKey === venueKey;
    });

    if (matchingCorrected && matchingCorrected.date !== existing.date) {
      updates.push({
        id: existing.id,
        oldDate: existing.date,
        newDate: matchingCorrected.date,
        venue: existing.venue_name,
      });
    }
  }

  console.log(`Found ${updates.length} dates that need updating:\n`);

  // Show what will be updated
  for (const u of updates.slice(0, 20)) {
    console.log(`  ${u.venue}: ${u.oldDate} -> ${u.newDate}`);
  }
  if (updates.length > 20) {
    console.log(`  ... and ${updates.length - 20} more`);
  }

  // Apply updates
  console.log("\nApplying updates...");

  const updateMany = db.transaction((items: typeof updates) => {
    for (const u of items) {
      updateStmt.run(u.newDate, u.id);
    }
  });

  updateMany(updates);

  console.log(`\nUpdated ${updates.length} show dates`);

  // Verify
  const verifyShows = db.prepare(`
    SELECT date, COUNT(*) as count
    FROM shows
    WHERE date LIKE '2025%' OR date LIKE '2026%'
    GROUP BY date
    ORDER BY date
  `).all() as { date: string; count: number }[];

  console.log("\nShows by date after update:");
  for (const row of verifyShows) {
    console.log(`  ${row.date}: ${row.count} shows`);
  }

  db.close();
  console.log("\nDone!");
}

main();
