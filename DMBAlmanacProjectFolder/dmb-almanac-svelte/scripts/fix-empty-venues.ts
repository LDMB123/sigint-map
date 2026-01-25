/**
 * Fix empty venue names in the database
 *
 * This script addresses 12 venues (IDs 14162-14175) with empty/NULL names
 * from early 1991 DMB shows in Virginia.
 *
 * Strategy:
 * 1. Query venues with NULL or empty names
 * 2. Clean up corrupted city/state data
 * 3. Set descriptive placeholder names
 * 4. Log all changes
 */

import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

interface Venue {
  id: number;
  name: string | null;
  city: string;
  state: string | null;
  country: string;
}

interface VenueUpdate {
  id: number;
  oldName: string;
  newName: string;
  oldCity: string;
  newCity: string;
  oldState: string | null;
  newState: string | null;
}

/**
 * Clean up corrupted city/state data
 * Many venues have HTML/text garbage in the city field
 */
function cleanCityState(city: string, state: string | null): {
  cleanCity: string;
  cleanState: string | null;
} {
  let cleanCity = city;
  let cleanState = state;

  // If city contains HTML or excessive whitespace/newlines, it's corrupted
  if (city.includes('\n') || city.includes('\t') || city.includes('	')) {
    cleanCity = 'Unknown City';
    cleanState = 'VA'; // Default to VA for early shows
  }

  // Clean up state if it's corrupted
  if (cleanState && (
    cleanState.includes('\n') ||
    cleanState.includes('\t') ||
    cleanState.length > 10
  )) {
    cleanState = 'VA'; // Default to VA
  }

  // Handle cities that are actually state codes
  if (city === 'VA' || city === 'NC') {
    cleanState = city;
    cleanCity = 'Unknown City';
  }

  // Clean specific corrupted entries based on known patterns
  if (city.includes('but he did not guest')) {
    cleanCity = 'Unknown City';
    cleanState = 'VA';
  }

  if (city.includes('a circulating copy')) {
    cleanCity = 'Unknown City';
    cleanState = 'VA';
  }

  if (city.includes('Alpha Tau Chapter')) {
    cleanCity = 'Chapel Hill';
    cleanState = 'NC';
  }

  if (city.includes('Beta Chapter')) {
    cleanCity = 'Charlottesville';
    cleanState = 'VA';
  }

  if (city.includes('LeRoi and Carter guesting')) {
    cleanCity = 'Charlottesville';
    cleanState = 'VA';
  }

  return { cleanCity, cleanState };
}

/**
 * Generate a descriptive placeholder name for unknown venues
 */
function generateVenueName(city: string, state: string | null, country: string): string {
  if (state) {
    return `Unknown Venue - ${city}, ${state}`;
  } else if (country && country !== 'USA') {
    return `Unknown Venue - ${city}, ${country}`;
  } else {
    return `Unknown Venue - ${city}`;
  }
}

async function main() {
  console.log("Fixing empty venue names in database...\n");

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  const updates: VenueUpdate[] = [];

  try {
    // 1. Query venues with empty names
    console.log("1. Finding venues with empty names...");
    const emptyVenues = db
      .prepare<[], Venue>(`
        SELECT id, name, city, state, country
        FROM venues
        WHERE name IS NULL OR name = ''
        ORDER BY id
      `)
      .all();

    console.log(`   Found ${emptyVenues.length} venues with empty names\n`);

    if (emptyVenues.length === 0) {
      console.log("No venues to fix!");
      return;
    }

    // 2. Process each venue
    console.log("2. Processing venues...\n");

    for (const venue of emptyVenues) {
      const oldName = venue.name || '(empty)';
      const oldCity = venue.city;
      const oldState = venue.state;

      // Clean up city/state data
      const { cleanCity, cleanState } = cleanCityState(venue.city, venue.state);

      // Generate new name
      const newName = generateVenueName(cleanCity, cleanState, venue.country);

      // Update the venue
      db.prepare(`
        UPDATE venues
        SET name = ?,
            city = ?,
            state = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newName, cleanCity, cleanState, venue.id);

      updates.push({
        id: venue.id,
        oldName,
        newName,
        oldCity,
        newCity: cleanCity,
        oldState,
        newState: cleanState
      });

      console.log(`   [${venue.id}] Updated:`);
      console.log(`        Name: "${oldName}" → "${newName}"`);
      console.log(`        City: "${oldCity}" → "${cleanCity}"`);
      console.log(`        State: "${oldState || 'null'}" → "${cleanState || 'null'}"`);
      console.log();
    }

    // 3. Verify changes
    console.log("3. Verifying changes...\n");

    const remainingEmpty = db
      .prepare<[], { count: number }>(`
        SELECT COUNT(*) as count
        FROM venues
        WHERE name IS NULL OR name = ''
      `)
      .get();

    console.log(`   Remaining empty venues: ${remainingEmpty?.count || 0}`);

    // 4. Summary
    console.log("\n=== Summary ===\n");
    console.log(`Total venues updated: ${updates.length}`);
    console.log(`All venue names verified: ${remainingEmpty?.count === 0 ? '✓' : '✗'}`);

    console.log("\n=== Updated Venues ===\n");
    for (const update of updates) {
      console.log(`ID ${update.id}: ${update.newName}`);
    }

    // 5. Show affected shows
    console.log("\n=== Affected Shows ===\n");
    const affectedShows = db
      .prepare<[number[]], { show_id: number; date: string; venue_name: string }>(`
        SELECT s.id as show_id, s.date, v.name as venue_name
        FROM shows s
        JOIN venues v ON s.venue_id = v.id
        WHERE v.id IN (${updates.map(() => '?').join(',')})
        ORDER BY s.date
      `)
      .all(updates.map(u => u.id));

    console.log(`${affectedShows.length} shows affected by venue updates:`);
    for (const show of affectedShows) {
      console.log(`   Show ${show.show_id} (${show.date}) - ${show.venue_name}`);
    }

  } catch (error) {
    console.error("Error fixing venues:", error);
    throw error;
  } finally {
    db.close();
  }
}

main()
  .then(() => {
    console.log("\n✓ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Failed:", error);
    process.exit(1);
  });
