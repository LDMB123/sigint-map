#!/usr/bin/env node

/**
 * Comprehensive Validation of All Database Fixes
 *
 * This script validates all fixes applied to the DMB Almanac database:
 * 1. Duplicate Positions - Confirms 0 duplicate (show_id, position) combinations
 * 2. Song Counts - Verifies songs.total_performances matches COUNT(*) from setlist_entries
 * 3. Guest Counts - Verifies guests.total_appearances matches COUNT(DISTINCT show_id)
 * 4. Empty Venues - Confirms 0 venues with NULL/empty names
 * 5. Band Members - Confirms no band members in guests table
 * 6. Liberation List - Verifies no references to placeholder show 5523
 * 7. Foreign Key Integrity - Checks all FK references are valid
 * 8. Date Formats - Verifies all dates are valid YYYY-MM-DD
 *
 * Usage:
 *   npx tsx scripts/validate-all-fixes.ts
 */

import Database from "better-sqlite3";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

interface ValidationResult {
  check: string;
  status: "PASS" | "FAIL";
  count: number;
  details?: string;
  samples?: string[];
}

// Band members that should not be in guests table
const BAND_MEMBERS = new Set([
  "dave",
  "dave matthews",
  "carter",
  "carter beauford",
  "stefan",
  "stefan lessard",
  "boyd",
  "boyd tinsley",
  "leroi",
  "leroi moore",
  "roi",
  "jeff",
  "jeff coffin",
  "rashawn",
  "rashawn ross",
  "buddy",
  "buddy strong",
  "butch",
  "butch taylor",
  "peter",
  "peter griesar",
  "tim",
  "tim reynolds",
  "dave and tim",
  "dave & tim",
]);

function normalizeGuestName(name: string): string {
  return name
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function main() {
  console.log("=".repeat(80));
  console.log("DMB Almanac Database - Comprehensive Validation");
  console.log("=".repeat(80));
  console.log(`Database: ${DB_PATH}\n`);

  const db = new Database(DB_PATH, { readonly: true });
  db.pragma("foreign_keys = ON");

  const results: ValidationResult[] = [];

  try {
    // ========================================================================
    // 1. DUPLICATE POSITIONS
    // ========================================================================
    console.log("1. Checking for duplicate (show_id, position) combinations...");
    const duplicatePositions = db.prepare<[], { show_id: number; position: number; count: number }>(`
      SELECT show_id, position, COUNT(*) as count
      FROM setlist_entries
      GROUP BY show_id, position
      HAVING COUNT(*) > 1
    `).all();

    if (duplicatePositions.length === 0) {
      results.push({
        check: "Duplicate Positions",
        status: "PASS",
        count: 0,
        details: "No duplicate (show_id, position) combinations found"
      });
      console.log("   ✓ PASS - No duplicates found\n");
    } else {
      const samples = duplicatePositions.slice(0, 5).map(d =>
        `Show ${d.show_id} Position ${d.position} (${d.count} duplicates)`
      );
      results.push({
        check: "Duplicate Positions",
        status: "FAIL",
        count: duplicatePositions.length,
        details: `Found ${duplicatePositions.length} duplicate position groups`,
        samples
      });
      console.log(`   ✗ FAIL - Found ${duplicatePositions.length} duplicates\n`);
    }

    // ========================================================================
    // 2. SONG COUNTS
    // ========================================================================
    console.log("2. Validating song performance counts...");
    const songCountDiscrepancies = db.prepare<[], {
      song_id: number;
      title: string;
      stored: number;
      actual: number;
    }>(`
      SELECT
        s.id as song_id,
        s.title,
        s.total_performances as stored,
        COUNT(se.id) as actual
      FROM songs s
      LEFT JOIN setlist_entries se ON se.song_id = s.id
      GROUP BY s.id, s.title, s.total_performances
      HAVING s.total_performances != COUNT(se.id)
    `).all();

    if (songCountDiscrepancies.length === 0) {
      const totalSongs = db.prepare("SELECT COUNT(*) as count FROM songs").get() as { count: number };
      results.push({
        check: "Song Counts",
        status: "PASS",
        count: totalSongs.count,
        details: `All ${totalSongs.count} songs have correct performance counts`
      });
      console.log(`   ✓ PASS - All song counts match (${totalSongs.count} songs verified)\n`);
    } else {
      const samples = songCountDiscrepancies.slice(0, 5).map(d =>
        `"${d.title}" (ID ${d.song_id}): stored=${d.stored}, actual=${d.actual}`
      );
      results.push({
        check: "Song Counts",
        status: "FAIL",
        count: songCountDiscrepancies.length,
        details: `Found ${songCountDiscrepancies.length} songs with incorrect counts`,
        samples
      });
      console.log(`   ✗ FAIL - ${songCountDiscrepancies.length} songs have incorrect counts\n`);
    }

    // ========================================================================
    // 3. GUEST COUNTS
    // ========================================================================
    console.log("3. Validating guest appearance counts...");
    const guestCountDiscrepancies = db.prepare<[], {
      guest_id: number;
      name: string;
      stored: number;
      actual: number;
    }>(`
      SELECT
        g.id as guest_id,
        g.name,
        g.total_appearances as stored,
        COUNT(DISTINCT ga.show_id) as actual
      FROM guests g
      LEFT JOIN guest_appearances ga ON ga.guest_id = g.id
      GROUP BY g.id, g.name, g.total_appearances
      HAVING g.total_appearances != COUNT(DISTINCT ga.show_id)
    `).all();

    if (guestCountDiscrepancies.length === 0) {
      const totalGuests = db.prepare("SELECT COUNT(*) as count FROM guests").get() as { count: number };
      results.push({
        check: "Guest Counts",
        status: "PASS",
        count: totalGuests.count,
        details: `All ${totalGuests.count} guests have correct appearance counts`
      });
      console.log(`   ✓ PASS - All guest counts match (${totalGuests.count} guests verified)\n`);
    } else {
      const samples = guestCountDiscrepancies.slice(0, 5).map(d =>
        `"${d.name}" (ID ${d.guest_id}): stored=${d.stored}, actual=${d.actual}`
      );
      results.push({
        check: "Guest Counts",
        status: "FAIL",
        count: guestCountDiscrepancies.length,
        details: `Found ${guestCountDiscrepancies.length} guests with incorrect counts`,
        samples
      });
      console.log(`   ✗ FAIL - ${guestCountDiscrepancies.length} guests have incorrect counts\n`);
    }

    // ========================================================================
    // 4. EMPTY VENUES
    // ========================================================================
    console.log("4. Checking for empty venue names...");
    const emptyVenues = db.prepare<[], { id: number; name: string | null; city: string | null }>(`
      SELECT id, name, city
      FROM venues
      WHERE name IS NULL OR TRIM(name) = ''
    `).all();

    if (emptyVenues.length === 0) {
      const totalVenues = db.prepare("SELECT COUNT(*) as count FROM venues").get() as { count: number };
      results.push({
        check: "Empty Venues",
        status: "PASS",
        count: 0,
        details: `All ${totalVenues.count} venues have valid names`
      });
      console.log(`   ✓ PASS - No empty venue names (${totalVenues.count} venues verified)\n`);
    } else {
      const samples = emptyVenues.slice(0, 5).map(v =>
        `Venue ID ${v.id}: name="${v.name}", city="${v.city}"`
      );
      results.push({
        check: "Empty Venues",
        status: "FAIL",
        count: emptyVenues.length,
        details: `Found ${emptyVenues.length} venues with empty/null names`,
        samples
      });
      console.log(`   ✗ FAIL - ${emptyVenues.length} venues have empty names\n`);
    }

    // ========================================================================
    // 5. BAND MEMBERS IN GUESTS TABLE
    // ========================================================================
    console.log("5. Checking for band members in guests table...");
    const guestNames = db.prepare<[], { id: number; name: string }>(`
      SELECT id, name FROM guests
    `).all();

    const bandMemberGuests = guestNames.filter(g =>
      BAND_MEMBERS.has(normalizeGuestName(g.name))
    );

    if (bandMemberGuests.length === 0) {
      results.push({
        check: "Band Members",
        status: "PASS",
        count: 0,
        details: `No band members found in guests table (${guestNames.length} guests verified)`
      });
      console.log(`   ✓ PASS - No band members in guests table\n`);
    } else {
      const samples = bandMemberGuests.slice(0, 10).map(g =>
        `"${g.name}" (ID ${g.id})`
      );
      results.push({
        check: "Band Members",
        status: "FAIL",
        count: bandMemberGuests.length,
        details: `Found ${bandMemberGuests.length} band members in guests table`,
        samples
      });
      console.log(`   ✗ FAIL - ${bandMemberGuests.length} band members found in guests table\n`);
    }

    // ========================================================================
    // 6. LIBERATION LIST (Show 5523)
    // ========================================================================
    console.log("6. Checking for Liberation List placeholder references (show 5523)...");

    const liberationShowExists = db.prepare<[], { count: number }>(`
      SELECT COUNT(*) as count FROM shows WHERE id = 5523
    `).get() as { count: number };

    const liberationSetlistEntries = db.prepare<[], { count: number }>(`
      SELECT COUNT(*) as count FROM setlist_entries WHERE show_id = 5523
    `).get() as { count: number };

    const liberationGuestAppearances = db.prepare<[], { count: number }>(`
      SELECT COUNT(*) as count FROM guest_appearances WHERE show_id = 5523
    `).get() as { count: number };

    const totalLiberationRefs = liberationShowExists.count +
                                 liberationSetlistEntries.count +
                                 liberationGuestAppearances.count;

    if (totalLiberationRefs === 0) {
      results.push({
        check: "Liberation List",
        status: "PASS",
        count: 0,
        details: "No references to placeholder show 5523"
      });
      console.log("   ✓ PASS - No Liberation List placeholder references\n");
    } else {
      const details: string[] = [];
      if (liberationShowExists.count > 0) {
        details.push(`shows table: ${liberationShowExists.count}`);
      }
      if (liberationSetlistEntries.count > 0) {
        details.push(`setlist_entries: ${liberationSetlistEntries.count}`);
      }
      if (liberationGuestAppearances.count > 0) {
        details.push(`guest_appearances: ${liberationGuestAppearances.count}`);
      }

      results.push({
        check: "Liberation List",
        status: "FAIL",
        count: totalLiberationRefs,
        details: `Found ${totalLiberationRefs} references to show 5523`,
        samples: details
      });
      console.log(`   ✗ FAIL - ${totalLiberationRefs} references to show 5523\n`);
    }

    // ========================================================================
    // 7. FOREIGN KEY INTEGRITY
    // ========================================================================
    console.log("7. Checking foreign key integrity...");

    const fkChecks = [
      {
        name: "setlist_entries.show_id → shows.id",
        query: `
          SELECT COUNT(*) as count
          FROM setlist_entries se
          LEFT JOIN shows s ON se.show_id = s.id
          WHERE s.id IS NULL
        `
      },
      {
        name: "setlist_entries.song_id → songs.id",
        query: `
          SELECT COUNT(*) as count
          FROM setlist_entries se
          LEFT JOIN songs s ON se.song_id = s.id
          WHERE s.id IS NULL
        `
      },
      {
        name: "shows.venue_id → venues.id",
        query: `
          SELECT COUNT(*) as count
          FROM shows sh
          LEFT JOIN venues v ON sh.venue_id = v.id
          WHERE sh.venue_id IS NOT NULL AND v.id IS NULL
        `
      },
      {
        name: "guest_appearances.guest_id → guests.id",
        query: `
          SELECT COUNT(*) as count
          FROM guest_appearances ga
          LEFT JOIN guests g ON ga.guest_id = g.id
          WHERE g.id IS NULL
        `
      },
      {
        name: "guest_appearances.show_id → shows.id",
        query: `
          SELECT COUNT(*) as count
          FROM guest_appearances ga
          LEFT JOIN shows s ON ga.show_id = s.id
          WHERE s.id IS NULL
        `
      },
      {
        name: "guest_appearances.setlist_entry_id → setlist_entries.id",
        query: `
          SELECT COUNT(*) as count
          FROM guest_appearances ga
          LEFT JOIN setlist_entries se ON ga.setlist_entry_id = se.id
          WHERE ga.setlist_entry_id IS NOT NULL AND se.id IS NULL
        `
      }
    ];

    let fkViolations = 0;
    const fkSamples: string[] = [];

    for (const check of fkChecks) {
      const result = db.prepare(check.query).get() as { count: number };
      if (result.count > 0) {
        fkViolations += result.count;
        fkSamples.push(`${check.name}: ${result.count} violations`);
      }
    }

    if (fkViolations === 0) {
      results.push({
        check: "Foreign Key Integrity",
        status: "PASS",
        count: 0,
        details: `All ${fkChecks.length} foreign key relationships are valid`
      });
      console.log(`   ✓ PASS - All foreign keys valid (${fkChecks.length} relationships verified)\n`);
    } else {
      results.push({
        check: "Foreign Key Integrity",
        status: "FAIL",
        count: fkViolations,
        details: `Found ${fkViolations} foreign key violations`,
        samples: fkSamples
      });
      console.log(`   ✗ FAIL - ${fkViolations} foreign key violations\n`);
    }

    // ========================================================================
    // 8. DATE FORMATS (YYYY-MM-DD)
    // ========================================================================
    console.log("8. Validating date formats...");

    const dateChecks = [
      {
        table: "shows",
        column: "date",
        query: `
          SELECT id, date
          FROM shows
          WHERE date IS NOT NULL
          AND (
            LENGTH(date) != 10
            OR date NOT LIKE '____-__-__'
            OR CAST(SUBSTR(date, 1, 4) AS INTEGER) < 1900
            OR CAST(SUBSTR(date, 6, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(date, 6, 2) AS INTEGER) > 12
            OR CAST(SUBSTR(date, 9, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(date, 9, 2) AS INTEGER) > 31
          )
          LIMIT 10
        `
      },
      {
        table: "songs",
        column: "first_played_date",
        query: `
          SELECT id, first_played_date as date
          FROM songs
          WHERE first_played_date IS NOT NULL
          AND (
            LENGTH(first_played_date) != 10
            OR first_played_date NOT LIKE '____-__-__'
            OR CAST(SUBSTR(first_played_date, 1, 4) AS INTEGER) < 1900
            OR CAST(SUBSTR(first_played_date, 6, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(first_played_date, 6, 2) AS INTEGER) > 12
            OR CAST(SUBSTR(first_played_date, 9, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(first_played_date, 9, 2) AS INTEGER) > 31
          )
          LIMIT 10
        `
      },
      {
        table: "songs",
        column: "last_played_date",
        query: `
          SELECT id, last_played_date as date
          FROM songs
          WHERE last_played_date IS NOT NULL
          AND (
            LENGTH(last_played_date) != 10
            OR last_played_date NOT LIKE '____-__-__'
            OR CAST(SUBSTR(last_played_date, 1, 4) AS INTEGER) < 1900
            OR CAST(SUBSTR(last_played_date, 6, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(last_played_date, 6, 2) AS INTEGER) > 12
            OR CAST(SUBSTR(last_played_date, 9, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(last_played_date, 9, 2) AS INTEGER) > 31
          )
          LIMIT 10
        `
      },
      {
        table: "guests",
        column: "first_appearance_date",
        query: `
          SELECT id, first_appearance_date as date
          FROM guests
          WHERE first_appearance_date IS NOT NULL
          AND (
            LENGTH(first_appearance_date) != 10
            OR first_appearance_date NOT LIKE '____-__-__'
            OR CAST(SUBSTR(first_appearance_date, 1, 4) AS INTEGER) < 1900
            OR CAST(SUBSTR(first_appearance_date, 6, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(first_appearance_date, 6, 2) AS INTEGER) > 12
            OR CAST(SUBSTR(first_appearance_date, 9, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(first_appearance_date, 9, 2) AS INTEGER) > 31
          )
          LIMIT 10
        `
      },
      {
        table: "guests",
        column: "last_appearance_date",
        query: `
          SELECT id, last_appearance_date as date
          FROM guests
          WHERE last_appearance_date IS NOT NULL
          AND (
            LENGTH(last_appearance_date) != 10
            OR last_appearance_date NOT LIKE '____-__-__'
            OR CAST(SUBSTR(last_appearance_date, 1, 4) AS INTEGER) < 1900
            OR CAST(SUBSTR(last_appearance_date, 6, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(last_appearance_date, 6, 2) AS INTEGER) > 12
            OR CAST(SUBSTR(last_appearance_date, 9, 2) AS INTEGER) < 1
            OR CAST(SUBSTR(last_appearance_date, 9, 2) AS INTEGER) > 31
          )
          LIMIT 10
        `
      }
    ];

    let invalidDates = 0;
    const dateSamples: string[] = [];

    for (const check of dateChecks) {
      const invalidRows = db.prepare(check.query).all() as { id: number; date: string }[];
      if (invalidRows.length > 0) {
        invalidDates += invalidRows.length;
        dateSamples.push(
          `${check.table}.${check.column}: ${invalidRows.length} invalid (samples: ${invalidRows.slice(0, 3).map(r => `ID ${r.id}="${r.date}"`).join(", ")})`
        );
      }
    }

    if (invalidDates === 0) {
      results.push({
        check: "Date Formats",
        status: "PASS",
        count: 0,
        details: `All dates are in valid YYYY-MM-DD format (${dateChecks.length} columns verified)`
      });
      console.log(`   ✓ PASS - All dates have valid format\n`);
    } else {
      results.push({
        check: "Date Formats",
        status: "FAIL",
        count: invalidDates,
        details: `Found ${invalidDates} invalid date formats`,
        samples: dateSamples
      });
      console.log(`   ✗ FAIL - ${invalidDates} invalid date formats\n`);
    }

    // ========================================================================
    // SUMMARY REPORT
    // ========================================================================
    console.log("=".repeat(80));
    console.log("VALIDATION SUMMARY");
    console.log("=".repeat(80));
    console.log();

    const passed = results.filter(r => r.status === "PASS").length;
    const failed = results.filter(r => r.status === "FAIL").length;
    const totalChecks = results.length;

    // Summary table
    console.log("Check                      Status    Count    Details");
    console.log("-".repeat(80));

    for (const result of results) {
      const status = result.status === "PASS" ? "✓ PASS" : "✗ FAIL";
      const statusStr = result.status === "PASS"
        ? "\x1b[32m✓ PASS\x1b[0m"
        : "\x1b[31m✗ FAIL\x1b[0m";

      const checkName = result.check.padEnd(26);
      const countStr = result.count.toString().padStart(5);

      console.log(`${checkName} ${statusStr}  ${countStr}    ${result.details}`);

      if (result.samples && result.samples.length > 0) {
        for (const sample of result.samples) {
          console.log(`  ${"".padEnd(26)}          ${sample}`);
        }
      }
    }

    console.log("-".repeat(80));
    console.log();

    // Final verdict
    console.log("FINAL VERDICT:");
    console.log(`  Passed: ${passed}/${totalChecks}`);
    console.log(`  Failed: ${failed}/${totalChecks}`);
    console.log();

    if (failed === 0) {
      console.log("\x1b[32m✓ ALL VALIDATIONS PASSED\x1b[0m");
      console.log("The database is in excellent condition!");
    } else {
      console.log("\x1b[31m✗ SOME VALIDATIONS FAILED\x1b[0m");
      console.log("Please review the failed checks above and run the appropriate fix scripts.");
    }

    console.log();
    console.log("=".repeat(80));

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error("\n\x1b[31m✗ Error during validation:\x1b[0m", error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the script
main();
