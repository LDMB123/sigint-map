/**
 * Guest Details Import Script
 *
 * Imports guest metadata from scraper/output/guest-details.json into the SQLite database.
 *
 * Features:
 * - Adds 'albums' column to guests table if it doesn't exist
 * - Updates existing guests by matching normalized names (handles quote variations)
 * - Inserts new guests not found in the database
 * - Handles duplicate slugs by appending counters (-2, -3, etc.)
 * - Safe to run multiple times (idempotent)
 * - Uses transactions for data integrity
 *
 * Updated fields:
 * - total_appearances: Total number of guest appearances
 * - first_appearance_date: Date of first appearance (YYYY-MM-DD)
 * - last_appearance_date: Date of last appearance (YYYY-MM-DD)
 * - albums: JSON array of album names the guest appeared on
 *
 * Usage:
 *   npx tsx scripts/import-guest-details.ts
 *
 * Requirements:
 * - scraper/output/guest-details.json must exist
 * - data/dmb-almanac.db must exist with guests table
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");
const GUEST_DETAILS_JSON_PATH = join(
  process.cwd(),
  "scraper",
  "output",
  "guest-details.json"
);

interface GuestDetail {
  originalId: string;
  name: string;
  instruments: string[];
  totalAppearances: number | null;
  distinctSongs: number | null;
  firstAppearanceDate: string | null;
  lastAppearanceDate: string | null;
  albums: string[];
}

interface GuestDetailsData {
  scrapedAt: string;
  source: string;
  total: number;
  guests: GuestDetail[];
}

interface ExistingGuest {
  id: number;
  name: string;
  slug: string;
  instruments: string | null;
  total_appearances: number;
  first_appearance_date: string | null;
  last_appearance_date: string | null;
}

interface Stats {
  updated: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

/**
 * Normalize guest name for matching
 * Handles variations in quotes, spacing, and special characters
 */
function normalizeGuestName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Generate slug from name (lowercase, hyphenated)
 * If slug already exists, append a counter (-2, -3, etc.)
 */
function generateSlug(name: string, db: Database.Database): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Check if slug exists
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const exists = db
      .prepare("SELECT COUNT(*) as count FROM guests WHERE slug = ?")
      .get(slug) as { count: number };

    if (exists.count === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function main() {
  console.log("========================================");
  console.log("DMB Almanac - Guest Details Import");
  console.log("========================================\n");

  // Read and parse guest-details.json
  console.log(`📖 Reading ${GUEST_DETAILS_JSON_PATH}...`);
  const guestDetailsData: GuestDetailsData = JSON.parse(
    readFileSync(GUEST_DETAILS_JSON_PATH, "utf-8")
  );

  console.log(`   Scraped at: ${guestDetailsData.scrapedAt}`);
  console.log(`   Source: ${guestDetailsData.source}`);
  console.log(`   Total guests: ${guestDetailsData.total}`);
  console.log(`   Guest entries: ${guestDetailsData.guests.length}\n`);

  // Connect to database
  console.log("🗄️  Connecting to database...");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Check if albums column exists, if not add it
  console.log("🔍 Checking database schema...");
  const columnsResult = db.pragma("table_info(guests)") as Array<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>;

  const hasAlbumsColumn = columnsResult.some((col) => col.name === "albums");

  if (!hasAlbumsColumn) {
    console.log("   Adding 'albums' column to guests table...");
    db.exec("ALTER TABLE guests ADD COLUMN albums TEXT DEFAULT NULL");
    console.log("   ✅ Column added\n");
  } else {
    console.log("   ✅ 'albums' column already exists\n");
  }

  // Get all existing guests for matching
  console.log("📊 Loading existing guests from database...");
  const existingGuests = db
    .prepare(
      `SELECT
        id,
        name,
        slug,
        instruments,
        total_appearances,
        first_appearance_date,
        last_appearance_date
      FROM guests`
    )
    .all() as ExistingGuest[];

  console.log(`   Found ${existingGuests.length} existing guests\n`);

  // Create a lookup map: normalized name -> guest record
  const guestLookup = new Map<string, ExistingGuest>();
  for (const guest of existingGuests) {
    const normalizedName = normalizeGuestName(guest.name);
    guestLookup.set(normalizedName, guest);
  }

  // Prepare statements
  const updateStmt = db.prepare(`
    UPDATE guests
    SET
      total_appearances = COALESCE(?, total_appearances),
      first_appearance_date = COALESCE(?, first_appearance_date),
      last_appearance_date = COALESCE(?, last_appearance_date),
      albums = ?
    WHERE id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO guests (
      name,
      slug,
      instruments,
      total_appearances,
      first_appearance_date,
      last_appearance_date,
      albums
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Stats tracking
  const stats: Stats = {
    updated: 0,
    inserted: 0,
    skipped: 0,
    errors: [],
  };

  // Process in transaction
  console.log("🔄 Processing guest details...");
  const transaction = db.transaction((guests: GuestDetail[], database: Database.Database) => {
    for (const guest of guests) {
      try {
        const normalizedName = normalizeGuestName(guest.name);
        const existingGuest = guestLookup.get(normalizedName);

        // Serialize albums array as JSON
        const albumsJson =
          guest.albums.length > 0 ? JSON.stringify(guest.albums) : null;

        if (existingGuest) {
          // Update existing guest
          updateStmt.run(
            guest.totalAppearances,
            guest.firstAppearanceDate,
            guest.lastAppearanceDate,
            albumsJson,
            existingGuest.id
          );
          stats.updated++;
        } else {
          // Insert new guest
          const slug = generateSlug(guest.name, database);
          const instrumentsJson =
            guest.instruments.length > 0
              ? JSON.stringify(guest.instruments)
              : null;

          insertStmt.run(
            guest.name,
            slug,
            instrumentsJson,
            guest.totalAppearances || 0,
            guest.firstAppearanceDate,
            guest.lastAppearanceDate,
            albumsJson
          );
          stats.inserted++;
        }
      } catch (error) {
        const errorMsg = `Failed to process guest "${guest.name}": ${error instanceof Error ? error.message : String(error)}`;
        stats.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
  });

  // Execute transaction
  try {
    transaction(guestDetailsData.guests, db);
    console.log("   ✅ Transaction complete\n");
  } catch (error) {
    console.error(
      "   ❌ Transaction failed:",
      error instanceof Error ? error.message : error
    );
    db.close();
    process.exit(1);
  }

  // Verify results
  console.log("🔍 Verifying results...");
  const finalCount = (
    db.prepare("SELECT COUNT(*) as count FROM guests").get() as {
      count: number;
    }
  ).count;

  const withAlbums = (
    db
      .prepare("SELECT COUNT(*) as count FROM guests WHERE albums IS NOT NULL")
      .get() as { count: number }
  ).count;

  const withDates = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM guests WHERE first_appearance_date IS NOT NULL AND last_appearance_date IS NOT NULL"
      )
      .get() as { count: number }
  ).count;

  console.log(`   Total guests in database: ${finalCount}`);
  console.log(`   Guests with albums data: ${withAlbums}`);
  console.log(`   Guests with appearance dates: ${withDates}\n`);

  // Print statistics
  console.log("========================================");
  console.log("📊 IMPORT SUMMARY");
  console.log("========================================\n");

  console.log("Operation Results:");
  console.log(`   ✅ Updated: ${stats.updated}`);
  console.log(`   ➕ Inserted: ${stats.inserted}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`   ❌ Errors: ${stats.errors.length}\n`);

  if (stats.errors.length > 0) {
    console.log("Error Details:");
    stats.errors.slice(0, 10).forEach((error, idx) => {
      console.log(`   ${idx + 1}. ${error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors\n`);
    } else {
      console.log();
    }
  }

  console.log("Database State:");
  console.log(`   Before: ${existingGuests.length} guests`);
  console.log(`   After: ${finalCount} guests`);
  console.log(`   Net change: +${finalCount - existingGuests.length}\n`);

  console.log("Data Quality:");
  console.log(
    `   Guests with albums: ${withAlbums} (${((withAlbums / finalCount) * 100).toFixed(1)}%)`
  );
  console.log(
    `   Guests with dates: ${withDates} (${((withDates / finalCount) * 100).toFixed(1)}%)`
  );
  console.log();

  // Sample some newly inserted guests
  if (stats.inserted > 0) {
    console.log("📋 Sample newly inserted guests (first 5):");
    const newGuests = db
      .prepare(
        `SELECT name, total_appearances, albums
         FROM guests
         ORDER BY id DESC
         LIMIT 5`
      )
      .all() as Array<{
        name: string;
        total_appearances: number;
        albums: string | null;
      }>;

    newGuests.forEach((guest, idx) => {
      const albums = guest.albums ? JSON.parse(guest.albums) : [];
      const albumText = albums.length > 0 ? albums.join(", ") : "none";
      console.log(
        `   ${idx + 1}. ${guest.name} - ${guest.total_appearances} appearances, albums: ${albumText}`
      );
    });
    console.log();
  }

  // Sample some updated guests
  if (stats.updated > 0) {
    console.log("📋 Sample updated guests with albums (first 5):");
    const updatedGuests = db
      .prepare(
        `SELECT name, total_appearances, albums
         FROM guests
         WHERE albums IS NOT NULL
         LIMIT 5`
      )
      .all() as Array<{
        name: string;
        total_appearances: number;
        albums: string;
      }>;

    updatedGuests.forEach((guest, idx) => {
      const albums = JSON.parse(guest.albums);
      console.log(
        `   ${idx + 1}. ${guest.name} - ${guest.total_appearances} appearances, albums: ${albums.join(", ")}`
      );
    });
    console.log();
  }

  db.close();
  console.log("========================================");
  console.log("✅ Import complete!");
  console.log("========================================\n");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
