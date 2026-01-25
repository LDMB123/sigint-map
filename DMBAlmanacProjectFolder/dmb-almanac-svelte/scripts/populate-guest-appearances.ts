#!/usr/bin/env node

/**
 * Populate guest_appearances table from existing show data
 *
 * This script reads the scraped shows.json and populates the guest_appearances
 * table by matching guest names to the existing guests table.
 *
 * Usage:
 *   npx tsx scripts/populate-guest-appearances.ts
 */

import Database from "better-sqlite3";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");
const SHOWS_PATH = join(process.cwd(), "scraper", "output", "shows.json");

interface SetlistEntry {
  songTitle?: string;
  position: number;
  guestNames?: string[];
}

interface ShowGuest {
  name: string;
  instruments?: string[];
  songs?: string[];
}

interface ScrapedShow {
  originalId?: string;
  date: string;
  venueName?: string;
  city?: string;
  state?: string;
  country?: string;
  setlist: SetlistEntry[];
  guests?: ShowGuest[];
}

interface ShowsData {
  shows: ScrapedShow[];
}

// Band members to exclude from guest appearances
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
  "only dave & tim on stage",
  "dave solo",
]);

function normalizeGuestName(name: string): string {
  return name
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isValidGuestName(name: string): boolean {
  if (!name || name.trim() === "") return false;

  const normalized = normalizeGuestName(name);

  // Length checks
  if (name.length > 100 || name.length < 3) return false;

  // Band member check
  if (BAND_MEMBERS.has(normalized)) return false;

  // Filter out annotations and non-guest patterns
  const filterPatterns = [
    "interpolation",
    "intro",
    "outro",
    "solo",
    "tease",
    "first time",
    "last time",
    "released on",
    "youtube",
    "warm-up",
    "warming up",
    "dedicated to",
    "part of the",
    "set closer",
    "set opener",
    "segue",
    "jam",
    "snippet",
    "truncated",
    "broadcast",
    "version",
    "lyrics",
    "mislabeled",
    "circulating",
    " is ",
    " are ",
    " was ",
    " were ",
    " during ",
    " while ",
    " after ",
    " plays ",
    " says ",
    " sings ",
    " tells ",
    "prelude",
    "reprise",
  ];

  for (const pattern of filterPatterns) {
    if (normalized.includes(pattern)) return false;
  }

  // Filter bracketed content and quotes
  if (name.includes("[") || name.includes("]") || name.includes('"')) {
    return false;
  }

  return true;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Populating guest_appearances table");
  console.log("=".repeat(60));

  // Check files exist
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  if (!existsSync(SHOWS_PATH)) {
    console.error(`Shows file not found: ${SHOWS_PATH}`);
    process.exit(1);
  }

  // Open database
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  try {
    // Load shows data
    console.log("\nLoading shows data...");
    const showsData: ShowsData = JSON.parse(readFileSync(SHOWS_PATH, "utf-8"));
    console.log(`Loaded ${showsData.shows.length} shows`);

    // Build guest lookup map from database
    console.log("\nBuilding guest lookup map...");
    const guestRows = db.prepare("SELECT id, name FROM guests").all() as { id: number; name: string }[];
    const guestMap = new Map<string, number>();
    for (const row of guestRows) {
      guestMap.set(normalizeGuestName(row.name), row.id);
    }
    console.log(`Found ${guestMap.size} guests in database`);

    // Build show lookup map from database (by date)
    console.log("Building show lookup map...");
    const showRows = db.prepare("SELECT id, date FROM shows").all() as { id: number; date: string }[];
    const showMap = new Map<string, number>();
    for (const row of showRows) {
      showMap.set(row.date, row.id);
    }
    console.log(`Found ${showMap.size} shows in database`);

    // Build setlist entry lookup map
    console.log("Building setlist entry lookup map...");
    const entryRows = db.prepare(`
      SELECT se.id, se.show_id, se.position, s.title as song_title
      FROM setlist_entries se
      JOIN songs s ON se.song_id = s.id
    `).all() as { id: number; show_id: number; position: number; song_title: string }[];

    // Map by show_id -> position -> entry_id
    const entryMap = new Map<number, Map<number, number>>();
    for (const row of entryRows) {
      if (!entryMap.has(row.show_id)) {
        entryMap.set(row.show_id, new Map());
      }
      entryMap.get(row.show_id)!.set(row.position, row.id);
    }
    console.log(`Found ${entryRows.length} setlist entries`);

    // Clear existing guest_appearances
    console.log("\nClearing existing guest_appearances...");
    db.prepare("DELETE FROM guest_appearances").run();

    // Prepare insert statement
    const insertAppearance = db.prepare(`
      INSERT OR IGNORE INTO guest_appearances (guest_id, show_id, setlist_entry_id, instruments, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Track stats
    let totalAppearances = 0;
    let matchedGuests = 0;
    let unmatchedGuests = 0;
    let skippedShows = 0;
    const unmatchedNames = new Set<string>();

    // Process shows
    console.log("\nProcessing shows...");
    const insertAll = db.transaction(() => {
      for (const show of showsData.shows) {
        // Find show in database
        const showId = showMap.get(show.date);
        if (!showId) {
          skippedShows++;
          continue;
        }

        const showEntries = entryMap.get(showId);

        // Track guests already added for this show to avoid duplicates
        const showGuestIds = new Set<number>();

        // Process show-level guests
        for (const guest of show.guests || []) {
          if (!isValidGuestName(guest.name)) continue;

          const guestId = guestMap.get(normalizeGuestName(guest.name));
          if (guestId && !showGuestIds.has(guestId)) {
            const instruments = guest.instruments?.length ? JSON.stringify(guest.instruments) : null;
            insertAppearance.run(guestId, showId, null, instruments, null);
            showGuestIds.add(guestId);
            totalAppearances++;
            matchedGuests++;
          } else if (!guestId) {
            unmatchedGuests++;
            if (unmatchedNames.size < 50) {
              unmatchedNames.add(guest.name);
            }
          }
        }

        // Process setlist-level guest names
        for (const entry of show.setlist || []) {
          for (const guestName of entry.guestNames || []) {
            if (!isValidGuestName(guestName)) continue;

            const guestId = guestMap.get(normalizeGuestName(guestName));
            if (guestId && !showGuestIds.has(guestId)) {
              // Try to find the specific setlist entry
              const entryId = showEntries?.get(entry.position) || null;
              insertAppearance.run(guestId, showId, entryId, null, null);
              showGuestIds.add(guestId);
              totalAppearances++;
              matchedGuests++;
            } else if (!guestId) {
              unmatchedGuests++;
              if (unmatchedNames.size < 50) {
                unmatchedNames.add(guestName);
              }
            }
          }
        }
      }
    });

    insertAll();

    // Update guest appearance counts
    console.log("\nUpdating guest appearance counts...");
    db.prepare(`
      UPDATE guests SET total_appearances = (
        SELECT COUNT(DISTINCT show_id) FROM guest_appearances WHERE guest_id = guests.id
      )
    `).run();

    // Update guest first/last appearance dates
    db.prepare(`
      UPDATE guests SET
        first_appearance_date = (
          SELECT MIN(s.date) FROM shows s
          JOIN guest_appearances ga ON ga.show_id = s.id
          WHERE ga.guest_id = guests.id
        ),
        last_appearance_date = (
          SELECT MAX(s.date) FROM shows s
          JOIN guest_appearances ga ON ga.show_id = s.id
          WHERE ga.guest_id = guests.id
        )
    `).run();

    // Get final counts
    const finalCount = db.prepare("SELECT COUNT(*) as count FROM guest_appearances").get() as { count: number };
    const guestsWithAppearances = db.prepare("SELECT COUNT(*) as count FROM guests WHERE total_appearances > 0").get() as { count: number };

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("Results");
    console.log("=".repeat(60));
    console.log(`Total appearances inserted: ${totalAppearances}`);
    console.log(`Final guest_appearances count: ${finalCount.count}`);
    console.log(`Guests with appearances: ${guestsWithAppearances.count}`);
    console.log(`Matched guest references: ${matchedGuests}`);
    console.log(`Unmatched guest references: ${unmatchedGuests}`);
    console.log(`Skipped shows (not in DB): ${skippedShows}`);

    if (unmatchedNames.size > 0) {
      console.log("\nSample unmatched guest names (first 20):");
      const samples = [...unmatchedNames].slice(0, 20);
      for (const name of samples) {
        console.log(`  - ${name}`);
      }
    }

    // Show top guests by appearances
    console.log("\nTop 15 guests by appearances:");
    const topGuests = db.prepare(`
      SELECT name, total_appearances, first_appearance_date, last_appearance_date
      FROM guests
      WHERE total_appearances > 0
      ORDER BY total_appearances DESC
      LIMIT 15
    `).all() as { name: string; total_appearances: number; first_appearance_date: string; last_appearance_date: string }[];

    for (const guest of topGuests) {
      console.log(`  ${guest.total_appearances.toString().padStart(4)} - ${guest.name} (${guest.first_appearance_date} to ${guest.last_appearance_date})`);
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
