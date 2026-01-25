/**
 * Import Guest Shows from guest-shows.json
 *
 * This script imports guest appearance data from the scraped guest-shows.json file.
 * It handles the date parsing issues (e.g., "9311-10-22" -> "1993-11-10") and
 * imports guest appearances by matching shows from the database.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const OUTPUT_DIR = join(process.cwd(), 'scraper', 'output');
const DB_PATH = join(process.cwd(), 'data', 'dmb-almanac.db');

interface GuestAppearance {
  showId: string;
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  songs: Array<{
    songTitle: string;
    songId: string;
    instruments: string[];
  }>;
}

interface GuestShowEntry {
  guestId: string;
  guestName: string;
  totalAppearances: number;
  firstAppearanceDate: string;
  lastAppearanceDate: string;
  appearances: GuestAppearance[];
}

interface GuestShowsData {
  scrapedAt: string;
  source: string;
  totalGuests: number;
  totalAppearances: number;
  guestShows: GuestShowEntry[];
}

/**
 * Fix malformed dates from scraper
 *
 * Pattern analysis from the data:
 * - "9311-10-22" should be "1993-11-10" (YYMM-DD-XX format)
 * - The first 4 digits are YYMM (year without century + month)
 * - After the dash is DD (day), then dash, then extra digits (ignore)
 *
 * So the format is: YYMM-DD-XX -> 19YY-MM-DD or 20YY-MM-DD
 */
function fixDate(badDate: string): string | null {
  if (!badDate || badDate === 'null' || badDate === 'undefined') {
    return null;
  }

  // If date looks valid already (starts with 19xx or 20xx)
  if (/^(19|20)\d{2}-\d{2}-\d{2}$/.test(badDate)) {
    return badDate;
  }

  // Pattern: YYMM-DD-XX (e.g., "9311-10-22" = 1993-11-10)
  const match = badDate.match(/^(\d{2})(\d{2})-(\d{2})-\d{2}$/);
  if (match) {
    const [, yearPart, monthPart, dayPart] = match;

    // Determine century
    const yearNum = parseInt(yearPart);
    let fullYear: number;
    if (yearNum >= 0 && yearNum <= 30) {
      fullYear = 2000 + yearNum; // 00-30 = 2000-2030
    } else {
      fullYear = 1900 + yearNum; // 31-99 = 1931-1999
    }

    const monthNum = parseInt(monthPart);
    const dayNum = parseInt(dayPart);

    // Validate month (1-12) and day (1-31)
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const fixedDate = `${fullYear}-${monthPart.padStart(2, '0')}-${dayPart.padStart(2, '0')}`;

      // Validate the date is reasonable for DMB (1991-2030)
      if (fullYear >= 1991 && fullYear <= 2030) {
        return fixedDate;
      }
    }
  }

  // Can't fix this date - silently skip for cleaner output
  return null;
}

/**
 * Parse date more aggressively by looking at show context
 */
function inferDateFromShowId(showId: string, db: Database.Database): string | null {
  // Try to find the show in database
  const stmt = db.prepare('SELECT date FROM shows WHERE original_id = ? OR id = ?');
  const row = stmt.get(showId, showId) as { date: string } | undefined;
  return row?.date || null;
}

async function main() {
  console.log('========================================');
  console.log('DMB Almanac - Guest Shows Import');
  console.log('========================================\n');

  // Load guest-shows.json
  const filePath = join(OUTPUT_DIR, 'guest-shows.json');
  console.log(`📖 Loading ${filePath}...`);

  let data: GuestShowsData;
  try {
    const content = readFileSync(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (err) {
    console.error('Failed to load guest-shows.json:', err);
    process.exit(1);
  }

  console.log(`   Scraped at: ${data.scrapedAt}`);
  console.log(`   Total guests: ${data.totalGuests}`);
  console.log(`   Total appearances: ${data.totalAppearances}\n`);

  // Connect to database
  console.log('🗄️  Connecting to database...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Get existing counts
  const existingAppearances = (db.prepare('SELECT COUNT(*) as count FROM guest_appearances').get() as { count: number }).count;
  const existingGuests = (db.prepare('SELECT COUNT(*) as count FROM guests').get() as { count: number }).count;
  const existingShows = (db.prepare('SELECT COUNT(*) as count FROM shows').get() as { count: number }).count;

  console.log(`   Existing guest appearances: ${existingAppearances}`);
  console.log(`   Existing guests: ${existingGuests}`);
  console.log(`   Existing shows: ${existingShows}\n`);

  // Build lookup maps
  console.log('📊 Building lookup maps...');

  // Guest name -> id map
  const guestMap = new Map<string, number>();
  const guestRows = db.prepare('SELECT id, name FROM guests').all() as { id: number; name: string }[];
  guestRows.forEach(row => {
    guestMap.set(row.name.toLowerCase(), row.id);
  });
  console.log(`   Loaded ${guestMap.size} guests`);

  // Show date -> id map (simple date-only matching since venue data is unreliable)
  const showByDateMap = new Map<string, number>();
  const showRows = db.prepare(`SELECT id, date FROM shows`).all() as { id: number; date: string }[];
  showRows.forEach(row => {
    // Only keep first show per date (some dates have multiple shows)
    if (!showByDateMap.has(row.date)) {
      showByDateMap.set(row.date, row.id);
    }
  });
  console.log(`   Loaded ${showRows.length} shows with ${showByDateMap.size} unique dates`);

  // Setlist entry lookup: show_id + song_title -> setlist_entry_id
  const setlistEntryMap = new Map<string, number>();
  const setlistRows = db.prepare(`
    SELECT se.id, se.show_id, s.title
    FROM setlist_entries se
    JOIN songs s ON se.song_id = s.id
  `).all() as { id: number; show_id: number; title: string }[];
  setlistRows.forEach(row => {
    const key = `${row.show_id}|${row.title.toLowerCase()}`;
    setlistEntryMap.set(key, row.id);
  });
  console.log(`   Loaded ${setlistEntryMap.size} setlist entries\n`);

  // Process guest appearances
  console.log('🔄 Processing guest appearances...\n');

  const insertAppearance = db.prepare(`
    INSERT OR IGNORE INTO guest_appearances (guest_id, show_id, setlist_entry_id, instruments, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  let totalProcessed = 0;
  let totalInserted = 0;
  let guestsNotFound = 0;
  let showsNotFound = 0;
  let songsNotFound = 0;
  let dateFixAttempts = 0;
  let dateFixSuccesses = 0;

  // Use a transaction for better performance
  const transaction = db.transaction(() => {
    for (const guestEntry of data.guestShows) {
      const guestId = guestMap.get(guestEntry.guestName.toLowerCase());

      if (!guestId) {
        guestsNotFound++;
        continue;
      }

      for (const appearance of guestEntry.appearances) {
        totalProcessed++;

        // Try to fix the date first
        const fixedDate = fixDate(appearance.showDate);
        dateFixAttempts++;

        let showId: number | undefined;

        if (fixedDate) {
          dateFixSuccesses++;
          showId = showByDateMap.get(fixedDate);
        }

        if (!showId) {
          showsNotFound++;
          continue;
        }

        // Collect all instruments from all songs in this appearance
        const allInstruments = new Set<string>();
        for (const song of appearance.songs) {
          song.instruments?.forEach(inst => allInstruments.add(inst));
        }

        const instruments = allInstruments.size > 0
          ? JSON.stringify([...allInstruments])
          : null;

        // Insert one appearance per guest per show (not per song)
        try {
          const result = insertAppearance.run(guestId, showId, null, instruments, null);
          if (result.changes > 0) {
            totalInserted++;
          }
        } catch (err) {
          // Ignore duplicate entries
        }
      }

      // Progress update every 100 guests
      if ((data.guestShows.indexOf(guestEntry) + 1) % 100 === 0) {
        console.log(`   Processed ${data.guestShows.indexOf(guestEntry) + 1}/${data.guestShows.length} guests...`);
      }
    }
  });

  transaction();

  // Get final counts
  const finalAppearances = (db.prepare('SELECT COUNT(*) as count FROM guest_appearances').get() as { count: number }).count;

  console.log('\n========================================');
  console.log('📊 IMPORT SUMMARY');
  console.log('========================================\n');

  console.log('Processing Statistics:');
  console.log(`   Appearances processed: ${totalProcessed.toLocaleString()}`);
  console.log(`   Appearances inserted: ${totalInserted.toLocaleString()}`);
  console.log(`   Guests not found: ${guestsNotFound.toLocaleString()}`);
  console.log(`   Shows not found: ${showsNotFound.toLocaleString()}`);
  console.log(`   Songs not found: ${songsNotFound.toLocaleString()}`);

  console.log('\nDate Fix Statistics:');
  console.log(`   Date fix attempts: ${dateFixAttempts.toLocaleString()}`);
  console.log(`   Date fix successes: ${dateFixSuccesses.toLocaleString()}`);
  console.log(`   Success rate: ${((dateFixSuccesses / dateFixAttempts) * 100).toFixed(1)}%`);

  console.log('\nDatabase State:');
  console.log(`   Before: ${existingAppearances.toLocaleString()} appearances`);
  console.log(`   After: ${finalAppearances.toLocaleString()} appearances`);
  console.log(`   Net change: +${(finalAppearances - existingAppearances).toLocaleString()}`);

  // Update guest total_appearances counts
  console.log('\n🔄 Updating guest appearance counts...');
  db.exec(`
    UPDATE guests SET total_appearances = (
      SELECT COUNT(DISTINCT show_id) FROM guest_appearances WHERE guest_id = guests.id
    )
  `);

  // Get top guests by appearances
  const topGuests = db.prepare(`
    SELECT name, total_appearances
    FROM guests
    WHERE total_appearances > 0
    ORDER BY total_appearances DESC
    LIMIT 10
  `).all() as { name: string; total_appearances: number }[];

  console.log('\n🏆 Top 10 Guests by Appearances:');
  topGuests.forEach((g, i) => {
    console.log(`   ${i + 1}. ${g.name} - ${g.total_appearances} shows`);
  });

  db.close();

  console.log('\n========================================');
  console.log('✅ Import complete!');
  console.log('========================================\n');
}

main().catch(console.error);
