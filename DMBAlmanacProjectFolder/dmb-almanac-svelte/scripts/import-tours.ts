#!/usr/bin/env npx tsx
/**
 * Import detailed tour data from tours.json scraper output
 * Updates tours table with additional fields like start/end dates,
 * venue counts, song counts, and tour notes
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");
const OUTPUT_DIR = join(process.cwd(), "scraper", "output");

interface ScrapedTourDetailed {
  originalId: string;
  name: string;
  slug: string;
  year: number;
  startDate?: string;
  endDate?: string;
  showCount: number;
  venueCount?: number;
  songCount?: number;
  totalSongPerformances?: number;
  averageSongsPerShow?: number;
  topSongs?: { title: string; playCount: number }[];
  notes?: string;
}

interface ToursOutput {
  scrapedAt: string;
  source: string;
  totalItems: number;
  tours: ScrapedTourDetailed[];
}

function importTours(): void {
  const filepath = join(OUTPUT_DIR, "tours.json");

  if (!existsSync(filepath)) {
    console.error("tours.json not found. Run the tours scraper first.");
    process.exit(1);
  }

  console.log("Loading tours.json...");
  const data: ToursOutput = JSON.parse(readFileSync(filepath, "utf-8"));

  console.log(`Found ${data.tours.length} tours to import`);

  const db = new Database(DB_PATH);

  // Check if we need to add new columns
  const tableInfo = db.prepare("PRAGMA table_info(tours)").all() as { name: string }[];
  const existingColumns = new Set(tableInfo.map((c) => c.name));

  const columnsToAdd = [
    { name: "start_date", type: "TEXT" },
    { name: "end_date", type: "TEXT" },
    { name: "venue_count", type: "INTEGER" },
    { name: "song_count", type: "INTEGER" },
    { name: "total_song_performances", type: "INTEGER" },
    { name: "average_songs_per_show", type: "REAL" },
    { name: "top_songs", type: "TEXT" }, // JSON
    { name: "notes", type: "TEXT" },
    { name: "original_id", type: "TEXT" },
  ];

  for (const col of columnsToAdd) {
    if (!existingColumns.has(col.name)) {
      console.log(`Adding column: ${col.name}`);
      db.exec(`ALTER TABLE tours ADD COLUMN ${col.name} ${col.type}`);
    }
  }

  // Build a map of existing tours by name and year
  const existingTours = db.prepare(`
    SELECT id, name, year FROM tours
  `).all() as { id: number; name: string; year: number }[];

  const tourMap = new Map<string, number>();
  for (const tour of existingTours) {
    tourMap.set(`${tour.name}-${tour.year}`, tour.id);
  }

  // Update statement
  const updateStmt = db.prepare(`
    UPDATE tours SET
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      venue_count = COALESCE(?, venue_count),
      song_count = COALESCE(?, song_count),
      total_song_performances = COALESCE(?, total_song_performances),
      average_songs_per_show = COALESCE(?, average_songs_per_show),
      top_songs = COALESCE(?, top_songs),
      notes = COALESCE(?, notes),
      original_id = COALESCE(?, original_id)
    WHERE id = ?
  `);

  // Insert statement for new tours (uses total_shows, not slug or show_count)
  const insertStmt = db.prepare(`
    INSERT INTO tours (name, year, total_shows, start_date, end_date, venue_count, song_count,
                       total_song_performances, average_songs_per_show, top_songs, notes, original_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  const transaction = db.transaction(() => {
    for (const tour of data.tours) {
      const key = `${tour.name}-${tour.year}`;
      const existingId = tourMap.get(key);

      const topSongsJson = tour.topSongs ? JSON.stringify(tour.topSongs) : null;

      if (existingId) {
        // Update existing tour
        updateStmt.run(
          tour.startDate || null,
          tour.endDate || null,
          tour.venueCount || null,
          tour.songCount || null,
          tour.totalSongPerformances || null,
          tour.averageSongsPerShow || null,
          topSongsJson,
          tour.notes || null,
          tour.originalId || null,
          existingId
        );
        updated++;
      } else {
        // Insert new tour (no slug column in table)
        insertStmt.run(
          tour.name,
          tour.year,
          tour.showCount,
          tour.startDate || null,
          tour.endDate || null,
          tour.venueCount || null,
          tour.songCount || null,
          tour.totalSongPerformances || null,
          tour.averageSongsPerShow || null,
          topSongsJson,
          tour.notes || null,
          tour.originalId || null
        );
        inserted++;
      }
    }
  });

  transaction();

  db.close();

  console.log(`\nImport complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped: ${skipped}`);
}

// Run
importTours();
