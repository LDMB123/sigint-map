import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { closeDb, getDb, initializeDb, run } from "../lib/db/index.js";

const OUTPUT_DIR = join(process.cwd(), "scraper", "output");
const RELEASES_FILE = join(OUTPUT_DIR, "releases.json");

// ==================== INTERFACES ====================

interface ScrapedReleaseTrack {
  trackNumber: number;
  discNumber: number;
  songTitle: string;
  duration?: string;
  showDate?: string;
  venueName?: string;
}

interface ScrapedRelease {
  originalId?: string;
  title: string;
  releaseType: string;
  releaseDate?: string;
  catalogNumber?: string;
  coverArtUrl?: string;
  tracks: ScrapedReleaseTrack[];
  notes?: string;
}

interface ReleasesData {
  scrapedAt?: string;
  source?: string;
  totalItems?: number;
  releases: ScrapedRelease[];
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generates a URL-friendly slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Parses duration from "MM:SS" or "H:MM:SS" format to seconds
 */
function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;

  // Match patterns: "MM:SS" or "H:MM:SS" or "HH:MM:SS"
  const match = duration.match(/^(?:(\d+):)?(\d+):(\d+)$/);
  if (match) {
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Normalizes release type to match schema enum values
 * Valid: studio, live, compilation, ep, single, video, box_set
 */
function normalizeReleaseType(type: string): string {
  const normalized = type.toLowerCase().trim();

  // Direct mappings
  const validTypes = ["studio", "live", "compilation", "ep", "single", "video", "box_set"];
  if (validTypes.includes(normalized)) {
    return normalized;
  }

  // Handle common variations
  if (normalized.includes("box") || normalized.includes("boxset")) return "box_set";
  if (normalized.includes("live")) return "live";
  if (normalized.includes("compilation") || normalized === "comp") return "compilation";
  if (normalized.includes("ep")) return "ep";
  if (normalized.includes("single")) return "single";
  if (normalized.includes("video") || normalized === "dvd") return "video";

  // Default fallback
  return "studio";
}

/**
 * Parses and validates release date in various formats
 * Returns ISO date string (YYYY-MM-DD) or null
 */
function parseReleaseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try parsing common formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Parses show date from various formats in track metadata
 * Examples: "[07.07.12]", "2012-07-07", "07/07/12"
 */
function parseShowDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  // Remove brackets if present
  const cleaned = dateStr.replace(/[\[\]]/g, "").trim();

  // Pattern: MM.DD.YY or MM/DD/YY
  const shortMatch = cleaned.match(/^(\d{2})[\.\/](\d{2})[\.\/](\d{2})$/);
  if (shortMatch) {
    const month = shortMatch[1];
    const day = shortMatch[2];
    const year = `20${shortMatch[3]}`; // Assume 2000s
    return `${year}-${month}-${day}`;
  }

  // Pattern: YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try general date parsing
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return null;
}

// ==================== DATA LOADING ====================

/**
 * Loads and validates the releases.json file
 */
function loadReleasesData(): ReleasesData | null {
  if (!existsSync(RELEASES_FILE)) {
    console.error(`Error: Releases file not found at ${RELEASES_FILE}`);
    return null;
  }

  try {
    const content = readFileSync(RELEASES_FILE, "utf-8");
    const data = JSON.parse(content) as ReleasesData;

    if (!data.releases || !Array.isArray(data.releases)) {
      console.error("Error: Invalid releases.json format - missing 'releases' array");
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error loading releases.json: ${(error as Error).message}`);
    return null;
  }
}

// ==================== DATABASE OPERATIONS ====================

/**
 * Builds a map of song titles to song IDs from the database
 */
function buildSongMap(): Map<string, number> {
  const db = getDb();
  const songMap = new Map<string, number>();

  const songs = db.prepare("SELECT id, title FROM songs").all() as Array<{
    id: number;
    title: string;
  }>;

  for (const song of songs) {
    songMap.set(song.title.toLowerCase(), song.id);
  }

  console.log(`Loaded ${songMap.size} songs from database`);
  return songMap;
}

/**
 * Builds a map of show dates to show IDs from the database
 */
function buildShowMap(): Map<string, number> {
  const db = getDb();
  const showMap = new Map<string, number>();

  const shows = db.prepare("SELECT id, date FROM shows").all() as Array<{
    id: number;
    date: string;
  }>;

  for (const show of shows) {
    showMap.set(show.date, show.id);
  }

  console.log(`Loaded ${showMap.size} shows from database`);
  return showMap;
}

/**
 * Clears existing releases and release tracks
 */
function clearExistingReleases(): void {
  console.log("\nClearing existing releases...");

  const db = getDb();
  db.transaction(() => {
    // Delete in order of foreign key dependencies
    run("DELETE FROM performance_releases");
    run("DELETE FROM release_tracks");
    run("DELETE FROM releases");
  })();

  console.log("Existing releases cleared");
}

/**
 * Imports releases and their tracks into the database
 */
function importReleases(
  data: ReleasesData,
  songMap: Map<string, number>,
  showMap: Map<string, number>
): void {
  console.log(`\nImporting ${data.releases.length} releases...`);

  const db = getDb();

  // Prepare statements
  const insertRelease = db.prepare(`
    INSERT INTO releases (title, slug, release_type, release_date, catalog_number, cover_art_url, notes, track_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const insertTrack = db.prepare(`
    INSERT INTO release_tracks (release_id, song_id, track_number, disc_number, duration_seconds, show_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const updateTrackCount = db.prepare(`
    UPDATE releases SET track_count = ? WHERE id = ?
  `);

  // Statistics
  let releaseCount = 0;
  let trackCount = 0;
  let skippedTracks = 0;

  // Import within a transaction
  const importAll = db.transaction(() => {
    for (const release of data.releases) {
      // Normalize release type
      const releaseType = normalizeReleaseType(release.releaseType);

      // Parse release date
      const releaseDate = parseReleaseDate(release.releaseDate);

      // Generate slug
      const slug = slugify(release.title);

      // Insert release
      try {
        const result = insertRelease.run(
          release.title,
          slug,
          releaseType,
          releaseDate,
          release.catalogNumber || null,
          release.coverArtUrl || null,
          release.notes || null
        );

        const releaseId = result.lastInsertRowid as number;
        releaseCount++;

        // Insert tracks
        let releaseTrackCount = 0;

        for (const track of release.tracks) {
          // Find song by title (case-insensitive)
          const songId = songMap.get(track.songTitle.toLowerCase());

          if (!songId) {
            console.log(
              `  Warning: Song not found for track "${track.songTitle}" on release "${release.title}"`
            );
            skippedTracks++;
            continue;
          }

          // Parse duration
          const durationSeconds = parseDuration(track.duration);

          // Find show ID if showDate is provided
          let showId: number | null = null;
          if (track.showDate) {
            const parsedDate = parseShowDate(track.showDate);
            if (parsedDate) {
              showId = showMap.get(parsedDate) || null;
            }
          }

          // Build notes with show information for live tracks
          let notes: string | null = null;
          if (track.showDate || track.venueName) {
            const parts: string[] = [];
            if (track.showDate) {
              parts.push(`Show: ${track.showDate}`);
            }
            if (track.venueName) {
              parts.push(`Venue: ${track.venueName}`);
            }
            notes = parts.join(" | ");
          }

          // Insert track
          try {
            insertTrack.run(
              releaseId,
              songId,
              track.trackNumber,
              track.discNumber || 1,
              durationSeconds,
              showId,
              notes
            );
            releaseTrackCount++;
            trackCount++;
          } catch (error) {
            console.log(
              `  Error inserting track ${track.trackNumber} on release "${release.title}": ${(error as Error).message}`
            );
            skippedTracks++;
          }
        }

        // Update release track count
        updateTrackCount.run(releaseTrackCount, releaseId);
      } catch (error) {
        console.error(
          `Error importing release "${release.title}": ${(error as Error).message}`
        );
      }
    }
  });

  importAll();

  // Print statistics
  console.log(`\n${"=".repeat(60)}`);
  console.log("Import Statistics:");
  console.log(`${"=".repeat(60)}`);
  console.log(`Releases imported:     ${releaseCount}`);
  console.log(`Tracks imported:       ${trackCount}`);
  console.log(`Tracks skipped:        ${skippedTracks}`);
  console.log(`${"=".repeat(60)}`);
}

/**
 * Prints summary statistics about imported releases
 */
function printSummary(): void {
  const db = getDb();

  console.log("\n" + "=".repeat(60));
  console.log("Database Summary:");
  console.log("=".repeat(60));

  // Releases by type
  const byType = db
    .prepare(
      `
    SELECT release_type, COUNT(*) as count
    FROM releases
    GROUP BY release_type
    ORDER BY count DESC
  `
    )
    .all() as Array<{ release_type: string; count: number }>;

  console.log("\nReleases by Type:");
  for (const row of byType) {
    console.log(`  ${row.release_type.padEnd(15)} ${row.count}`);
  }

  // Total tracks
  const totalTracks = db
    .prepare("SELECT COUNT(*) as count FROM release_tracks")
    .get() as { count: number };

  console.log(`\nTotal release tracks: ${totalTracks.count}`);

  // Releases with most tracks
  const topReleases = db
    .prepare(
      `
    SELECT title, track_count, release_type
    FROM releases
    ORDER BY track_count DESC
    LIMIT 10
  `
    )
    .all() as Array<{ title: string; track_count: number; release_type: string }>;

  console.log("\nTop 10 Releases by Track Count:");
  for (const release of topReleases) {
    console.log(
      `  ${release.title.substring(0, 50).padEnd(52)} ${release.track_count.toString().padStart(3)} tracks (${release.release_type})`
    );
  }

  // Tracks linked to shows
  const tracksWithShows = db
    .prepare("SELECT COUNT(*) as count FROM release_tracks WHERE show_id IS NOT NULL")
    .get() as { count: number };

  console.log(`\nRelease tracks linked to shows: ${tracksWithShows.count}`);

  console.log("=".repeat(60) + "\n");
}

// ==================== MAIN ====================

async function main(): Promise<void> {
  console.log("DMB Almanac - Release Import Script");
  console.log("=".repeat(60));

  // Initialize database
  console.log("Initializing database...");
  initializeDb();

  try {
    // Load releases data
    const data = loadReleasesData();
    if (!data) {
      process.exit(1);
    }

    console.log(`Loaded ${data.releases.length} releases from ${RELEASES_FILE}`);
    if (data.scrapedAt) {
      console.log(`Scraped at: ${data.scrapedAt}`);
    }

    // Build lookup maps
    const songMap = buildSongMap();
    const showMap = buildShowMap();

    // Clear existing data
    clearExistingReleases();

    // Import releases
    importReleases(data, songMap, showMap);

    // Print summary
    printSummary();

    console.log("✓ Import completed successfully!\n");
  } catch (error) {
    console.error(`\nImport failed: ${(error as Error).message}`);
    console.error((error as Error).stack);
    process.exit(1);
  } finally {
    closeDb();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
