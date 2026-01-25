#!/usr/bin/env npx tsx
/**
 * Import venue statistics from venue-stats.json scraper output
 * Updates venues table with notable performances and venue_aliases table with AKA names
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");
const OUTPUT_DIR = join(process.cwd(), "scraper", "output");

interface VenueStat {
  originalId: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  totalShows: number;
  capacity: number;
  akaNames: string[];
  topSongs: { title: string; playCount: number }[];
  notablePerformances: string[];
}

interface VenueStatsOutput {
  scrapedAt: string;
  source: string;
  totalItems: number;
  venueStats: VenueStat[];
}

function importVenueStats(): void {
  const filepath = join(OUTPUT_DIR, "venue-stats.json");

  if (!existsSync(filepath)) {
    console.error("venue-stats.json not found. Run the venue-stats scraper first.");
    process.exit(1);
  }

  console.log("Loading venue-stats.json...");
  const data: VenueStatsOutput = JSON.parse(readFileSync(filepath, "utf-8"));

  console.log(`Found ${data.venueStats.length} venues to import`);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Build a map of existing venues by name and city for matching
  const existingVenues = db.prepare(`
    SELECT id, name, city, state, country FROM venues
  `).all() as { id: number; name: string; city: string; state: string; country: string }[];

  // Create multiple lookup maps for flexible matching
  const venueByNameCity = new Map<string, number>();
  const venueByNameOnly = new Map<string, number[]>();

  for (const venue of existingVenues) {
    const key = `${venue.name.toLowerCase()}-${venue.city.toLowerCase()}`;
    venueByNameCity.set(key, venue.id);

    const nameKey = venue.name.toLowerCase();
    if (!venueByNameOnly.has(nameKey)) {
      venueByNameOnly.set(nameKey, []);
    }
    venueByNameOnly.get(nameKey)!.push(venue.id);
  }

  // Update statement for venues
  const updateVenueStmt = db.prepare(`
    UPDATE venues SET
      notable_performances = COALESCE(?, notable_performances),
      capacity = CASE WHEN ? > 0 THEN ? ELSE capacity END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  // Check existing aliases
  const existingAliases = db.prepare(`
    SELECT venue_id, alias_name FROM venue_aliases
  `).all() as { venue_id: number; alias_name: string }[];

  const aliasSet = new Set<string>();
  for (const alias of existingAliases) {
    aliasSet.add(`${alias.venue_id}-${alias.alias_name.toLowerCase()}`);
  }

  // Insert statement for venue aliases
  const insertAliasStmt = db.prepare(`
    INSERT OR IGNORE INTO venue_aliases (venue_id, alias_name, is_primary)
    VALUES (?, ?, 0)
  `);

  let updated = 0;
  let aliasesAdded = 0;
  let notFound = 0;

  const transaction = db.transaction(() => {
    for (const venue of data.venueStats) {
      // Try to find matching venue
      const key = `${venue.venueName.toLowerCase()}-${venue.city.toLowerCase()}`;
      let venueId = venueByNameCity.get(key);

      // If not found by exact match, try by name only
      if (!venueId) {
        const candidates = venueByNameOnly.get(venue.venueName.toLowerCase());
        if (candidates && candidates.length === 1) {
          venueId = candidates[0];
        }
      }

      if (!venueId) {
        // Skip venues we can't match
        notFound++;
        continue;
      }

      // Update venue with notable performances
      const notableJson = venue.notablePerformances.length > 0
        ? JSON.stringify(venue.notablePerformances)
        : null;

      updateVenueStmt.run(
        notableJson,
        venue.capacity,
        venue.capacity,
        venueId
      );
      updated++;

      // Add AKA names as aliases
      for (const akaName of venue.akaNames) {
        const aliasKey = `${venueId}-${akaName.toLowerCase()}`;
        if (!aliasSet.has(aliasKey)) {
          insertAliasStmt.run(venueId, akaName);
          aliasSet.add(aliasKey);
          aliasesAdded++;
        }
      }
    }
  });

  transaction();

  db.close();

  console.log(`\nImport complete:`);
  console.log(`  Venues updated: ${updated}`);
  console.log(`  Aliases added: ${aliasesAdded}`);
  console.log(`  Venues not found: ${notFound}`);
}

// Run
importVenueStats();
