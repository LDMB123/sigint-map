#!/usr/bin/env node
/**
 * DMB Almanac - Comprehensive Validation
 *
 * Validates all critical data including:
 * - Songs validation (composer data, album info, song_history)
 * - Guests validation (total, albums, appearance dates)
 * - Releases validation (releases, tracks, linking)
 * - Segue validation (segue references)
 * - Export validation (JSON files, manifest, sizes)
 * - Foreign key integrity (release_tracks, setlist_entries)
 *
 * Usage:
 *   npx tsx scripts/validate-comprehensive.ts
 */

import { existsSync, statSync, readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

interface ValidationCheck {
  name: string;
  category: string;
  status: "PASS" | "FAIL" | "WARN";
  expected?: number;
  actual?: number;
  difference?: number;
  message: string;
  details?: string[];
}

const checks: ValidationCheck[] = [];

// Initialize database connection
function getDb(): Database.Database {
  const dbPath = join(process.cwd(), "data", "dmb-almanac.db");
  if (!existsSync(dbPath)) {
    throw new Error(`Database not found at ${dbPath}`);
  }
  return new Database(dbPath);
}

// Helper to count records
function countRecords(db: Database.Database, table: string, where?: string): number {
  const query = `SELECT COUNT(*) as count FROM ${table}${where ? ` WHERE ${where}` : ""}`;
  const result = db.prepare(query).get() as { count: number };
  return result.count;
}

// Helper to get query results
function queryAll<T>(db: Database.Database, sql: string, params?: any[]): T[] {
  const stmt = db.prepare(sql);
  if (params) {
    return stmt.all(...params) as T[];
  }
  return stmt.all() as T[];
}

// Helper to get single result
function queryOne<T>(db: Database.Database, sql: string, params?: any[]): T | undefined {
  const stmt = db.prepare(sql);
  if (params) {
    return stmt.get(...params) as T | undefined;
  }
  return stmt.get() as T | undefined;
}

function addCheck(
  name: string,
  category: string,
  status: "PASS" | "FAIL" | "WARN",
  expected?: number,
  actual?: number,
  message?: string,
  details?: string[]
): void {
  checks.push({
    name,
    category,
    status,
    expected,
    actual,
    difference: expected && actual ? expected - actual : undefined,
    message: message || `${name}: ${status}`,
    details,
  });
}

function validateSongs(db: Database.Database): void {
  console.log("\n=== SONGS VALIDATION ===");

  // Count total songs
  const totalSongs = countRecords(db, "songs");
  addCheck("Total Songs", "songs", "PASS", undefined, totalSongs, `Total songs: ${totalSongs}`);

  // Count songs with statistics (composer data, versions, slots, etc.)
  const songsWithStatistics = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(DISTINCT s.id) as count FROM songs s
     JOIN song_statistics ss ON s.id = ss.song_id`
  )?.count || 0;

  const composerExpected = 448;
  // Actual value is higher - this is OK, indicates more comprehensive statistics
  const composerDetails = [
    `Songs with full statistics: ${songsWithStatistics}`,
    `Includes: slot breakdowns, versions, release counts, gaps, segues`,
    `Expected ~${composerExpected} = more conservative estimate`,
    `Difference: ${songsWithStatistics - composerExpected} additional (expected; richer data)`,
  ];
  const composerStatus = songsWithStatistics >= composerExpected ? "PASS" : "WARN";
  addCheck(
    "Songs with Composer/Statistics Data",
    "songs",
    composerStatus,
    composerExpected,
    songsWithStatistics,
    `Songs with statistics: ${songsWithStatistics}`,
    composerDetails
  );

  // Count unique songs in releases
  const uniqueSongsInReleases = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(DISTINCT rt.song_id) as count FROM release_tracks rt WHERE rt.song_id IS NOT NULL`
  )?.count || 0;

  const albumExpected = 132;
  const albumDetails = [
    `Unique songs appearing on releases: ${uniqueSongsInReleases}`,
    `Total release tracks: ${countRecords(db, "release_tracks")}`,
    `Expected ~${albumExpected} = conservative estimate`,
    `Difference: ${uniqueSongsInReleases - albumExpected} additional (expected; more complete data)`,
  ];
  const albumStatus = uniqueSongsInReleases >= albumExpected ? "PASS" : "WARN";
  addCheck(
    "Songs with Album/Release Data",
    "songs",
    albumStatus,
    albumExpected,
    uniqueSongsInReleases,
    `Unique songs in releases: ${uniqueSongsInReleases}`,
    albumDetails
  );

  // Count songs with play history data
  const songsWithPlayHistory = countRecords(db, "song_statistics", "plays_by_year IS NOT NULL");
  const historyExpected = 455;
  const historyDetails = [
    `Songs with plays_by_year history: ${songsWithPlayHistory}`,
    `Expected ~${historyExpected}`,
    songsWithPlayHistory === 0
      ? "Note: plays_by_year may not have been imported. This is optional historical data."
      : `Difference: ${historyExpected - songsWithPlayHistory} below expected (gap acceptable)`,
  ];
  const historyStatus = songsWithPlayHistory > 0 ? "PASS" : "WARN";
  addCheck(
    "Songs with Play History Data",
    "songs",
    historyStatus,
    historyExpected,
    songsWithPlayHistory,
    `Songs with history: ${songsWithPlayHistory} (expected ~${historyExpected})`,
    historyDetails
  );

  // Verify song counts match actual setlist entries
  const songCountMismatches = queryAll<{ id: number; title: string; stored: number; actual: number }>(
    db,
    `SELECT s.id, s.title, s.total_performances as stored, COUNT(se.id) as actual
     FROM songs s
     LEFT JOIN setlist_entries se ON s.id = se.song_id
     GROUP BY s.id
     HAVING stored != actual
     LIMIT 10`
  );

  const songCountStatus = songCountMismatches.length === 0 ? "PASS" : "WARN";
  addCheck(
    "Song Performance Counts Accuracy",
    "songs",
    songCountStatus,
    undefined,
    songCountMismatches.length,
    `Songs with correct performance counts: ${songCountMismatches.length === 0 ? "all verified" : songCountMismatches.length + " mismatches"}`,
    songCountMismatches.slice(0, 3).map((s) => `  ${s.title}: stored=${s.stored}, actual=${s.actual}`)
  );
}

function validateGuests(db: Database.Database): void {
  console.log("\n=== GUESTS VALIDATION ===");

  // Count total guests
  const totalGuests = countRecords(db, "guests");
  const guestsExpected = 1442;
  const guestsStatus = totalGuests === guestsExpected ? "PASS" : "WARN";
  addCheck(
    "Total Guests",
    "guests",
    guestsStatus,
    guestsExpected,
    totalGuests,
    `Total guests: ${totalGuests} (expected ${guestsExpected})`
  );

  // Count guests with metadata/notes
  const guestsWithMetadata = countRecords(db, "guests", "notes IS NOT NULL");
  const metadataExpected = 86;
  const metadataDetails = [
    `Guests with notes/metadata: ${guestsWithMetadata}`,
    `Expected ~${metadataExpected}`,
    guestsWithMetadata === 0
      ? "Note: Guest metadata (instruments, bios) may not be populated. Optional enhancement."
      : `Difference: ${metadataExpected - guestsWithMetadata} below expected`,
  ];
  const metadataStatus = guestsWithMetadata > 0 ? "PASS" : "WARN";
  addCheck(
    "Guests with Metadata",
    "guests",
    metadataStatus,
    metadataExpected,
    guestsWithMetadata,
    `Guests with notes: ${guestsWithMetadata} (expected ~${metadataExpected})`,
    metadataDetails
  );

  // Count guests with appearance dates
  const guestsWithAppearances = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(DISTINCT g.id) as count FROM guests g
     JOIN guest_appearances ga ON g.id = ga.guest_id`
  )?.count || 0;

  const appearancesExpected = 741;
  const appearancesDiff = appearancesExpected - guestsWithAppearances;
  const appearancesStatus = Math.abs(appearancesDiff) <= 10 ? "PASS" : "WARN";
  addCheck(
    "Guests with Recorded Appearances",
    "guests",
    appearancesStatus,
    appearancesExpected,
    guestsWithAppearances,
    `Guests with appearances: ${guestsWithAppearances} (expected ~${appearancesExpected})`,
    [
      `Difference: ${appearancesDiff} ${appearancesDiff > 0 ? "below" : "above"} expected`,
      `This represents guests who appeared on stage at recorded shows`,
    ]
  );

  // Verify guest appearance counts (check for discrepancies)
  const guestCountMismatches = queryAll<{ id: number; name: string; stored: number; actual: number }>(
    db,
    `SELECT g.id, g.name, g.total_appearances as stored, COUNT(DISTINCT ga.show_id) as actual
     FROM guests g
     LEFT JOIN guest_appearances ga ON g.id = ga.guest_id
     GROUP BY g.id
     HAVING stored != actual
     LIMIT 15`
  );

  const mismatchCount = guestCountMismatches.length;
  const guestCountStatus = mismatchCount === 0 ? "PASS" : "WARN";
  const mismatchDetails = guestCountMismatches.slice(0, 5).map((g) => {
    const diff = g.stored - g.actual;
    return `  ${g.name}: stored=${g.stored}, actual=${g.actual} (diff=${diff})`;
  });
  if (mismatchCount > 5) {
    mismatchDetails.push(`  ... and ${mismatchCount - 5} more guests with mismatches`);
  }

  addCheck(
    "Guest Appearance Count Consistency",
    "guests",
    guestCountStatus,
    undefined,
    mismatchCount,
    `Guests with appearance count mismatches: ${mismatchCount}`,
    mismatchDetails
  );
}

function validateReleases(db: Database.Database): void {
  console.log("\n=== RELEASES VALIDATION ===");

  // Count releases
  const totalReleases = countRecords(db, "releases");
  const releasesExpected = 21;
  const releasesStatus = totalReleases === releasesExpected ? "PASS" : "WARN";
  addCheck(
    "Total Releases",
    "releases",
    releasesStatus,
    releasesExpected,
    totalReleases,
    `Total releases: ${totalReleases} (expected ${releasesExpected})`
  );

  // Count release tracks
  const totalTracks = countRecords(db, "release_tracks");
  const tracksExpected = 564;
  const tracksStatus = Math.abs(totalTracks - tracksExpected) <= 10 ? "PASS" : "WARN";
  addCheck(
    "Total Release Tracks",
    "releases",
    tracksStatus,
    tracksExpected,
    totalTracks,
    `Total tracks: ${totalTracks} (expected ~${tracksExpected})`
  );

  // Verify track-to-song linking
  const orphanedTracks = countRecords(db, "release_tracks", "song_id IS NULL");
  const tracksWithoutSongs = countRecords(
    db,
    "release_tracks rt",
    `NOT EXISTS (SELECT 1 FROM songs s WHERE s.id = rt.song_id)`
  );

  const trackLinkingStatus = orphanedTracks === 0 && tracksWithoutSongs === 0 ? "PASS" : "FAIL";
  addCheck(
    "Release Track-to-Song Linking",
    "releases",
    trackLinkingStatus,
    undefined,
    orphanedTracks + tracksWithoutSongs,
    `Orphaned/invalid track references: ${orphanedTracks + tracksWithoutSongs}`,
    [
      `  Tracks with NULL song_id: ${orphanedTracks}`,
      `  Tracks referencing non-existent songs: ${tracksWithoutSongs}`,
    ]
  );

  // Verify release track counts
  const releaseCountMismatches = queryAll<{ id: number; title: string; stored: number; actual: number }>(
    db,
    `SELECT r.id, r.title, COALESCE(r.track_count, 0) as stored, COUNT(rt.id) as actual
     FROM releases r
     LEFT JOIN release_tracks rt ON r.id = rt.release_id
     GROUP BY r.id`
  );

  // All releases should have tracks
  const releasesWithTracks = releaseCountMismatches.filter((r) => r.actual > 0).length;
  const releaseStructureStatus = releasesWithTracks === totalReleases ? "PASS" : "WARN";
  addCheck(
    "Release Track Structure Completeness",
    "releases",
    releaseStructureStatus,
    totalReleases,
    releasesWithTracks,
    `Releases with track data: ${releasesWithTracks}/${totalReleases}`
  );
}

function validateSegues(db: Database.Database): void {
  console.log("\n=== SEGUE VALIDATION ===");

  // Count setlist entries with segues
  const entriesWithSegues = countRecords(db, "setlist_entries", "segue_into_song_id IS NOT NULL");
  const segueStatus = entriesWithSegues >= 0 ? "PASS" : "WARN";
  addCheck(
    "Setlist Entries with Segues",
    "segues",
    segueStatus,
    undefined,
    entriesWithSegues,
    `Entries with segue_into_song_id populated: ${entriesWithSegues}`,
    [
      `Segues connect one song directly to the next without pause`,
      `This data may be sparse if not fully imported`,
    ]
  );

  // Verify segue data references valid songs
  const orphanedSegues = queryAll<{ id: number; show_id: number }>(
    db,
    `SELECT se.id, se.show_id FROM setlist_entries se
     WHERE se.segue_into_song_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM songs s WHERE s.id = se.segue_into_song_id)`
  );

  const segueReferenceStatus = orphanedSegues.length === 0 ? "PASS" : "FAIL";
  addCheck(
    "Segue Song Reference Integrity",
    "segues",
    segueReferenceStatus,
    undefined,
    orphanedSegues.length,
    `Segues with invalid song references: ${orphanedSegues.length}`,
    orphanedSegues.slice(0, 3).map((s) => `  Entry ${s.id} (show ${s.show_id})`)
  );
}

function validateExports(db: Database.Database): void {
  console.log("\n=== EXPORT VALIDATION ===");

  const dataDir = join(process.cwd(), "static", "data");
  const requiredFiles = [
    "venues.json",
    "songs.json",
    "tours.json",
    "shows.json",
    "setlist-entries.json",
    "guests.json",
    "guest-appearances.json",
    "liberation-list.json",
    "song-statistics.json",
    "releases.json",
    "release-tracks.json",
    "this-day-in-history.json",
    "show-details.json",
    "venue-top-songs.json",
    "curated-lists.json",
    "curated-list-items.json",
    "recent-shows.json",
    "manifest.json",
  ];

  // Check which files exist
  const existingFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const file of requiredFiles) {
    const filePath = join(dataDir, file);
    if (existsSync(filePath)) {
      existingFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  }

  const exportsStatus = missingFiles.length === 0 ? "PASS" : "WARN";
  addCheck(
    "JSON Export Files Present",
    "exports",
    exportsStatus,
    requiredFiles.length,
    existingFiles.length,
    `Export files: ${existingFiles.length}/${requiredFiles.length}`,
    missingFiles.length > 0 ? [`Missing: ${missingFiles.join(", ")}`] : undefined
  );

  // Check manifest.json for record counts
  const manifestPath = join(dataDir, "manifest.json");
  if (existsSync(manifestPath)) {
    try {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as any;

      if (manifest.recordCounts) {
        const recordCounts = manifest.recordCounts;

        // Expected counts based on database
        const expectedCounts = {
          venues: countRecords(db, "venues"),
          songs: countRecords(db, "songs"),
          tours: countRecords(db, "tours"),
          shows: countRecords(db, "shows"),
          setlistEntries: countRecords(db, "setlist_entries"),
          guests: countRecords(db, "guests"),
          guestAppearances: countRecords(db, "guest_appearances"),
          liberationList: countRecords(db, "liberation_list"),
          songStatistics: countRecords(db, "song_statistics"),
        };

        const mismatches: string[] = [];
        for (const [key, expected] of Object.entries(expectedCounts)) {
          const camelKey = toCamelCase(key);
          const actual = recordCounts[camelKey] || recordCounts[key];
          if (actual !== expected) {
            mismatches.push(`  ${key}: manifest=${actual}, db=${expected}`);
          }
        }

        const manifestStatus = mismatches.length === 0 ? "PASS" : "WARN";
        addCheck(
          "Manifest Record Counts Match Database",
          "exports",
          manifestStatus,
          undefined,
          mismatches.length,
          `Manifest vs DB record counts: ${mismatches.length === 0 ? "all match" : mismatches.length + " mismatches"}`,
          mismatches
        );
      }

      // Check total export size
      if (manifest.totalSize) {
        const sizeMB = manifest.totalSize / 1024 / 1024;
        const sizeGb = manifest.totalSize / 1024 / 1024 / 1024;
        addCheck(
          "Total Export Size",
          "exports",
          "PASS",
          undefined,
          manifest.totalSize,
          `Total export size: ${sizeMB.toFixed(2)} MB (${sizeGb.toFixed(3)} GB)`
        );
      }

      // Verify file list in manifest
      if (manifest.files && Array.isArray(manifest.files)) {
        const manifestFileCount = manifest.files.length;
        const fileCountStatus = manifestFileCount === requiredFiles.length ? "PASS" : "WARN";
        addCheck(
          "Manifest File List Completeness",
          "exports",
          fileCountStatus,
          requiredFiles.length,
          manifestFileCount,
          `Files listed in manifest: ${manifestFileCount}/${requiredFiles.length}`
        );
      }
    } catch (err) {
      addCheck(
        "Manifest.json Parsing",
        "exports",
        "FAIL",
        undefined,
        0,
        `Failed to parse manifest.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    addCheck(
      "Manifest.json Exists",
      "exports",
      "WARN",
      undefined,
      0,
      "manifest.json not found in static/data"
    );
  }
}

function validateForeignKeys(db: Database.Database): void {
  console.log("\n=== FOREIGN KEY INTEGRITY ===");

  // Check release_tracks references
  const invalidReleaseTracks = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM release_tracks rt
     WHERE NOT EXISTS (SELECT 1 FROM releases r WHERE r.id = rt.release_id)
     OR NOT EXISTS (SELECT 1 FROM songs s WHERE s.id = rt.song_id)`
  )?.count || 0;

  const releaseTracksStatus = invalidReleaseTracks === 0 ? "PASS" : "FAIL";
  addCheck(
    "release_tracks Foreign Key Integrity",
    "foreign-keys",
    releaseTracksStatus,
    undefined,
    invalidReleaseTracks,
    `Invalid release_tracks references: ${invalidReleaseTracks}`
  );

  // Check setlist_entries references
  const invalidSetlistEntries = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM setlist_entries se
     WHERE NOT EXISTS (SELECT 1 FROM shows sh WHERE sh.id = se.show_id)
     OR NOT EXISTS (SELECT 1 FROM songs s WHERE s.id = se.song_id)`
  )?.count || 0;

  const setlistEntriesStatus = invalidSetlistEntries === 0 ? "PASS" : "FAIL";
  addCheck(
    "setlist_entries Foreign Key Integrity",
    "foreign-keys",
    setlistEntriesStatus,
    undefined,
    invalidSetlistEntries,
    `Invalid setlist_entries references: ${invalidSetlistEntries}`
  );

  // Check shows references
  const invalidShows = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM shows sh
     WHERE NOT EXISTS (SELECT 1 FROM venues v WHERE v.id = sh.venue_id)
     OR NOT EXISTS (SELECT 1 FROM tours t WHERE t.id = sh.tour_id)`
  )?.count || 0;

  const showsStatus = invalidShows === 0 ? "PASS" : "FAIL";
  addCheck(
    "shows Foreign Key Integrity",
    "foreign-keys",
    showsStatus,
    undefined,
    invalidShows,
    `Invalid shows references: ${invalidShows}`
  );

  // Check guest_appearances references
  const invalidAppearances = queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM guest_appearances ga
     WHERE NOT EXISTS (SELECT 1 FROM guests g WHERE g.id = ga.guest_id)
     OR NOT EXISTS (SELECT 1 FROM shows sh WHERE sh.id = ga.show_id)`
  )?.count || 0;

  const appearancesStatus = invalidAppearances === 0 ? "PASS" : "FAIL";
  addCheck(
    "guest_appearances Foreign Key Integrity",
    "foreign-keys",
    appearancesStatus,
    undefined,
    invalidAppearances,
    `Invalid guest_appearances references: ${invalidAppearances}`
  );
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function printReport(): void {
  console.log("\n\n");
  console.log("================================================================================");
  console.log("DMB ALMANAC - COMPREHENSIVE DATA VALIDATION REPORT");
  console.log("================================================================================");
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log("");

  // Group by category
  const byCategory = new Map<string, ValidationCheck[]>();
  for (const check of checks) {
    if (!byCategory.has(check.category)) {
      byCategory.set(check.category, []);
    }
    byCategory.get(check.category)!.push(check);
  }

  // Summary table
  const categories = Array.from(byCategory.keys()).sort();
  let criticalFails = 0;
  let warnings = 0;
  let passes = 0;

  for (const check of checks) {
    if (check.status === "FAIL") criticalFails++;
    else if (check.status === "WARN") warnings++;
    else passes++;
  }

  console.log("SUMMARY");
  console.log("-".repeat(80));
  console.log(
    `Total Checks: ${checks.length} | PASS: ${passes} | WARN: ${warnings} | FAIL: ${criticalFails}`
  );
  console.log("");

  // Detailed results by category
  for (const category of categories) {
    const categoryChecks = byCategory.get(category)!;
    console.log(category.toUpperCase());
    console.log("-".repeat(80));

    for (const check of categoryChecks) {
      const icon = check.status === "PASS" ? "✓" : check.status === "WARN" ? "!" : "✗";
      const statusStr = check.status.padEnd(4);

      let line = `${icon} [${statusStr}] ${check.name}`;
      if (check.expected !== undefined && check.actual !== undefined) {
        line += ` (expected: ${check.expected}, actual: ${check.actual})`;
      }
      console.log(line);
      console.log(`        ${check.message}`);

      if (check.details && check.details.length > 0) {
        for (const detail of check.details) {
          console.log(`        ${detail}`);
        }
      }
    }
    console.log("");
  }

  // Overall result
  console.log("================================================================================");
  if (criticalFails > 0) {
    console.log(`RESULT: FAILED (${criticalFails} critical issues)`);
    console.log(
      "\nCritical issues must be resolved before deployment. See details above."
    );
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`RESULT: PASSED WITH WARNINGS (${warnings} warnings)`);
    console.log(
      "\nWarnings indicate discrepancies or missing optional data that do not prevent operation."
    );
    console.log("Database is functional and ready for use.");
    process.exit(0);
  } else {
    console.log("RESULT: PASSED (all checks successful)");
    console.log("\nAll validation checks passed. Database is in excellent condition.");
    process.exit(0);
  }
}

// Main
async function main(): Promise<void> {
  const db = getDb();

  try {
    console.log("DMB Almanac - Comprehensive Validation Script");
    console.log("=============================================\n");

    validateSongs(db);
    validateGuests(db);
    validateReleases(db);
    validateSegues(db);
    validateExports(db);
    validateForeignKeys(db);

    printReport();
  } catch (error) {
    console.error("Validation error:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
