/**
 * Import Setlists from Scraped Shows Data
 *
 * This script imports setlist data from scraper/output/shows.json
 * into the database for shows that currently have no setlist entries.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const OUTPUT_DIR = join(process.cwd(), 'scraper', 'output');
const DB_PATH = join(process.cwd(), 'data', 'dmb-almanac.db');

interface ScrapedSetlistEntry {
  songTitle: string;
  position: number;
  set: string;
  slot: 'opener' | 'closer' | 'standard';
  duration?: string;
  isSegue: boolean;
  segueIntoTitle?: string;
  isTease: boolean;
  teaseOfTitle?: string;
  hasRelease: boolean;
  releaseTitle?: string;
  guestNames: string[];
  notes?: string;
}

interface ScrapedShow {
  originalId: string;
  date: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  tourYear: number;
  notes?: string;
  soundcheck?: string;
  setlist: ScrapedSetlistEntry[];
  guests: Array<{ name: string; instruments: string[]; songs: string[] }>;
}

interface ShowsData {
  scrapedAt: string;
  source: string;
  totalItems: number;
  shows: ScrapedShow[];
}

async function main() {
  console.log('========================================');
  console.log('DMB Almanac - Import Setlists from Scraped Data');
  console.log('========================================\n');

  // Load shows.json
  const filePath = join(OUTPUT_DIR, 'shows.json');
  console.log(`📖 Loading ${filePath}...`);

  let data: ShowsData;
  try {
    const content = readFileSync(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (err) {
    console.error('Failed to load shows.json:', err);
    process.exit(1);
  }

  console.log(`   Scraped at: ${data.scrapedAt}`);
  console.log(`   Total shows in file: ${data.totalItems}`);

  // Filter to shows with setlists
  const showsWithSetlists = data.shows.filter(s => s.setlist && s.setlist.length > 0);
  console.log(`   Shows with setlists: ${showsWithSetlists.length}\n`);

  // Connect to database
  console.log('🗄️  Connecting to database...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Get existing counts
  const existingEntries = (db.prepare('SELECT COUNT(*) as count FROM setlist_entries').get() as { count: number }).count;
  const showsWithSongCount = (db.prepare('SELECT COUNT(*) as count FROM shows WHERE song_count > 0').get() as { count: number }).count;
  const showsWithoutSongCount = (db.prepare('SELECT COUNT(*) as count FROM shows WHERE song_count = 0 OR song_count IS NULL').get() as { count: number }).count;

  console.log(`   Existing setlist entries: ${existingEntries}`);
  console.log(`   Shows with setlists: ${showsWithSongCount}`);
  console.log(`   Shows without setlists: ${showsWithoutSongCount}\n`);

  // Build lookup maps
  console.log('📊 Building lookup maps...');

  // Song title -> id map (lowercase for matching)
  const songMap = new Map<string, number>();
  const songRows = db.prepare('SELECT id, title FROM songs').all() as { id: number; title: string }[];
  songRows.forEach(row => {
    songMap.set(row.title.toLowerCase(), row.id);
  });
  console.log(`   Loaded ${songMap.size} songs`);

  // Show date -> id map (for shows without setlists)
  const showByDateMap = new Map<string, { id: number; venue_id: number }>();
  const showRows = db.prepare(`
    SELECT id, date, venue_id
    FROM shows
    WHERE song_count = 0 OR song_count IS NULL
  `).all() as { id: number; date: string; venue_id: number }[];
  showRows.forEach(row => {
    // Store with date as key
    if (!showByDateMap.has(row.date)) {
      showByDateMap.set(row.date, { id: row.id, venue_id: row.venue_id });
    }
  });
  console.log(`   Shows needing setlists: ${showByDateMap.size}`);

  // Also build a map of all show dates to check for duplicates
  const allShowDates = new Map<string, number[]>();
  const allShows = db.prepare('SELECT id, date FROM shows').all() as { id: number; date: string }[];
  allShows.forEach(row => {
    if (!allShowDates.has(row.date)) {
      allShowDates.set(row.date, []);
    }
    allShowDates.get(row.date)!.push(row.id);
  });
  console.log(`   Total unique show dates: ${allShowDates.size}\n`);

  // Process setlists
  console.log('🔄 Processing setlists...\n');

  const insertSetlistEntry = db.prepare(`
    INSERT INTO setlist_entries (show_id, song_id, position, set_name, slot, is_segue, duration_seconds, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateShowSongCount = db.prepare(`
    UPDATE shows SET song_count = ? WHERE id = ?
  `);

  let totalProcessed = 0;
  let showsUpdated = 0;
  let entriesInserted = 0;
  let songsNotFound = 0;
  let showsNotFound = 0;
  const missingSongs = new Set<string>();

  // Use a transaction for better performance
  const transaction = db.transaction(() => {
    for (const show of showsWithSetlists) {
      totalProcessed++;

      // Find the show in database by date
      const showInfo = showByDateMap.get(show.date);

      if (!showInfo) {
        // Check if this date exists but already has setlist
        if (allShowDates.has(show.date)) {
          // Show exists but already has setlist - skip
          continue;
        }
        showsNotFound++;
        continue;
      }

      const showId = showInfo.id;
      let entriesForShow = 0;

      for (const entry of show.setlist) {
        const songId = songMap.get(entry.songTitle.toLowerCase());

        if (!songId) {
          songsNotFound++;
          missingSongs.add(entry.songTitle);
          continue;
        }

        // Convert set name to match database CHECK constraint
        let setName = 'set1';
        if (entry.set === 'set2') setName = 'set2';
        else if (entry.set === 'set3') setName = 'set3';
        else if (entry.set === 'encore') setName = 'encore';
        else if (entry.set === 'encore2') setName = 'encore2';

        // Parse duration to seconds
        let durationSeconds: number | null = null;
        if (entry.duration) {
          const parts = entry.duration.split(':');
          if (parts.length === 2) {
            durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          }
        }

        try {
          insertSetlistEntry.run(
            showId,
            songId,
            entry.position,
            setName,
            entry.slot,
            entry.isSegue ? 1 : 0,
            durationSeconds,
            entry.notes || null
          );
          entriesInserted++;
          entriesForShow++;
        } catch (err) {
          // Ignore duplicates
        }
      }

      // Update show song count
      if (entriesForShow > 0) {
        updateShowSongCount.run(entriesForShow, showId);
        showsUpdated++;
      }

      // Progress update
      if (totalProcessed % 500 === 0) {
        console.log(`   Processed ${totalProcessed}/${showsWithSetlists.length} shows...`);
      }
    }
  });

  transaction();

  // Get final counts
  const finalEntries = (db.prepare('SELECT COUNT(*) as count FROM setlist_entries').get() as { count: number }).count;
  const finalShowsWithSetlist = (db.prepare('SELECT COUNT(*) as count FROM shows WHERE song_count > 0').get() as { count: number }).count;

  console.log('\n========================================');
  console.log('📊 IMPORT SUMMARY');
  console.log('========================================\n');

  console.log('Processing Statistics:');
  console.log(`   Shows processed: ${totalProcessed.toLocaleString()}`);
  console.log(`   Shows updated: ${showsUpdated.toLocaleString()}`);
  console.log(`   Setlist entries inserted: ${entriesInserted.toLocaleString()}`);
  console.log(`   Shows not found in DB: ${showsNotFound.toLocaleString()}`);
  console.log(`   Songs not found: ${songsNotFound.toLocaleString()}`);

  if (missingSongs.size > 0 && missingSongs.size <= 20) {
    console.log('\n   Missing song titles:');
    for (const song of missingSongs) {
      console.log(`     - ${song}`);
    }
  } else if (missingSongs.size > 20) {
    console.log(`\n   (${missingSongs.size} unique missing songs - too many to list)`);
  }

  console.log('\nDatabase State:');
  console.log(`   Setlist entries: ${existingEntries.toLocaleString()} → ${finalEntries.toLocaleString()} (+${(finalEntries - existingEntries).toLocaleString()})`);
  console.log(`   Shows with setlists: ${showsWithSongCount.toLocaleString()} → ${finalShowsWithSetlist.toLocaleString()} (+${(finalShowsWithSetlist - showsWithSongCount).toLocaleString()})`);

  db.close();

  console.log('\n========================================');
  console.log('✅ Import complete!');
  console.log('========================================\n');
}

main().catch(console.error);
