/**
 * Import scraped guest details into the database
 */

import Database from "better-sqlite3";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "..", "data", "dmb-almanac.db");
const GUEST_DETAILS_PATH = "./output/guest-details.json";

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

function normalizeGuestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Importing guest details to database...\n");

  if (!existsSync(GUEST_DETAILS_PATH)) {
    console.error("Guest details file not found. Run scrape-guest-details.ts first.");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(GUEST_DETAILS_PATH, "utf-8"));
  const guestDetails: GuestDetail[] = data.guests;
  console.log(`Loaded ${guestDetails.length} guest details from scraper output`);

  const db = new Database(DB_PATH);

  // Get existing guests from database
  const existingGuests = db.prepare(`
    SELECT id, name, slug, instruments, total_appearances, first_appearance_date, last_appearance_date
    FROM guests
  `).all() as {
    id: number;
    name: string;
    slug: string;
    instruments: string;
    total_appearances: number;
    first_appearance_date: string | null;
    last_appearance_date: string | null;
  }[];

  console.log(`Found ${existingGuests.length} guests in database`);

  // Create a map of normalized names to database guests
  const nameMap = new Map<string, typeof existingGuests[0]>();
  for (const guest of existingGuests) {
    nameMap.set(normalizeGuestName(guest.name), guest);
  }

  // Prepare update statement
  const updateGuest = db.prepare(`
    UPDATE guests SET
      instruments = ?,
      total_appearances = CASE WHEN ? > total_appearances THEN ? ELSE total_appearances END,
      first_appearance_date = COALESCE(?, first_appearance_date),
      last_appearance_date = COALESCE(?, last_appearance_date)
    WHERE id = ?
  `);

  let updated = 0;
  let notFound = 0;
  let skipped = 0;

  for (const detail of guestDetails) {
    const normalizedName = normalizeGuestName(detail.name);
    const dbGuest = nameMap.get(normalizedName);

    if (!dbGuest) {
      notFound++;
      continue;
    }

    // Check if we have any new data to update
    const existingInstruments = JSON.parse(dbGuest.instruments || "[]");
    const hasNewInstruments = detail.instruments.length > existingInstruments.length;
    const hasNewAppearances = detail.totalAppearances && detail.totalAppearances > dbGuest.total_appearances;
    const hasNewDates = (detail.firstAppearanceDate && !dbGuest.first_appearance_date) ||
                       (detail.lastAppearanceDate && !dbGuest.last_appearance_date);

    if (!hasNewInstruments && !hasNewAppearances && !hasNewDates) {
      skipped++;
      continue;
    }

    const instrumentsJson = detail.instruments.length > 0
      ? JSON.stringify(detail.instruments)
      : dbGuest.instruments;

    updateGuest.run(
      instrumentsJson,
      detail.totalAppearances || 0,
      detail.totalAppearances || 0,
      detail.firstAppearanceDate,
      detail.lastAppearanceDate,
      dbGuest.id
    );

    updated++;
  }

  console.log(`\nResults:`);
  console.log(`  Updated: ${updated} guests`);
  console.log(`  Skipped (no new data): ${skipped} guests`);
  console.log(`  Not found in DB: ${notFound} guests`);

  // Show sample of updated data
  const sample = db.prepare(`
    SELECT name, instruments, total_appearances, first_appearance_date, last_appearance_date
    FROM guests
    WHERE total_appearances > 10
    ORDER BY total_appearances DESC
    LIMIT 15
  `).all();

  console.log(`\nTop guests by appearances:`);
  for (const guest of sample as any[]) {
    const instruments = JSON.parse(guest.instruments || "[]");
    console.log(`  ${guest.name}: ${guest.total_appearances} appearances [${instruments.join(", ") || "?"}]`);
  }

  db.close();
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
