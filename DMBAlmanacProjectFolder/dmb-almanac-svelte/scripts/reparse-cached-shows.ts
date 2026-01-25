/**
 * Re-parse Cached Show HTML for Missing Setlists
 *
 * This script reads cached HTML files from the scraper cache,
 * parses the setlists, and imports them into the database for
 * shows that still don't have setlist data.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import * as cheerio from 'cheerio';

const CACHE_DIR = join(process.cwd(), 'scraper', 'cache');
const DB_PATH = join(process.cwd(), 'data', 'dmb-almanac.db');

interface ParsedSetlistEntry {
  songTitle: string;
  position: number;
  set: string;
  slot: 'opener' | 'closer' | 'standard';
  isSegue: boolean;
  durationSeconds?: number;
}

interface ParsedShow {
  date: string;
  venueName: string;
  city: string;
  state: string;
  setlist: ParsedSetlistEntry[];
}

function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

function parseShowHtml(html: string, filename: string): ParsedShow | null {
  try {
    const $ = cheerio.load(html);

    // Parse show date from threedeetabheader (format: MM.DD.YYYY)
    let dateStr = '';
    const dateHeaderText = $('td.threedeetabheader').first().text().trim();
    const dotDateMatch = dateHeaderText.match(/(\d{2})\.(\d{2})\.(\d{4})/);

    if (dotDateMatch) {
      const [, month, day, year] = dotDateMatch;
      dateStr = `${year}-${month}-${day}`;
    }

    if (!dateStr || dateStr.length !== 10) {
      return null;
    }

    // Parse venue info from .newsitem divs
    let venueName = '';
    let city = '';
    let state = '';

    const newsItems = $('.newsitem');
    if (newsItems.length >= 2) {
      const venueLocationText = newsItems.eq(1).text().trim();
      const lines = venueLocationText.split('\n').map(l => l.trim()).filter(l => l);

      if (lines.length >= 2) {
        venueName = lines[0];
        const locationParts = lines[1].split(',').map(p => p.trim());
        if (locationParts.length >= 2) {
          city = locationParts[0];
          state = locationParts[1];
        }
      }
    }

    // Parse setlist from #SetTable
    const setlist: ParsedSetlistEntry[] = [];
    let currentSet = 'set1';
    let position = 0;

    const setTable = $('#SetTable');
    if (setTable.length === 0) {
      return null;
    }

    setTable.find('tr').each((_, row) => {
      const $row = $(row);

      // Skip header row (contains .setcolumn class)
      if ($row.find('.setcolumn').length > 0) return;

      // Check if this is a song row (has .setheadercell)
      const cells = $row.find('td.setheadercell, td.setcell, td.endcell');
      if (cells.length === 0) return;

      // Get position cell (first cell with bgcolor attribute)
      const posCell = $row.find('td').first();
      const bgColor = posCell.attr('bgcolor');

      // Determine set based on background color
      if (bgColor === '#006666') {
        currentSet = 'set1';
      } else if (bgColor === '#004040') {
        currentSet = 'set2';
      } else if (bgColor === '#660000' || bgColor === '#CC0000') {
        if (currentSet !== 'encore') {
          currentSet = 'encore';
        }
      }

      // Get song title from second cell with onclick attribute
      const songCell = $row.find('td.setheadercell').eq(1);
      const songLink = songCell.find('a').first();

      if (songLink.length === 0) return;

      position++;

      let songTitle = '';
      const onclick = songLink.attr('onclick');

      // Extract song title from overlib popup HTML
      if (onclick) {
        const titleMatch = onclick.match(/class=\\'setitem\\'[^>]*>([^<]+)</);
        if (titleMatch) {
          songTitle = normalizeWhitespace(titleMatch[1]);
        }
      }

      // Fallback to link text if no title found
      if (!songTitle) {
        songTitle = normalizeWhitespace(songLink.text());
      }

      // Skip if no song title
      if (!songTitle) return;

      // Determine slot based on background color
      let slot: 'opener' | 'closer' | 'standard' = 'standard';
      if (bgColor === '#006666' || bgColor === '#004040') {
        slot = 'opener';
      } else if (bgColor === '#336699' || bgColor === '#214263') {
        slot = 'closer';
      }

      // Check for segue (look for arrow in row text)
      const rowText = $row.text();
      const isSegue = rowText.includes('→') || rowText.includes('>');

      setlist.push({
        songTitle,
        position,
        set: currentSet,
        slot,
        isSegue,
      });
    });

    if (setlist.length === 0) {
      return null;
    }

    return {
      date: dateStr,
      venueName,
      city,
      state,
      setlist,
    };
  } catch (err) {
    console.error(`Error parsing ${filename}:`, err);
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('DMB Almanac - Re-parse Cached Show HTML');
  console.log('========================================\n');

  // Get list of cached show HTML files
  console.log('📖 Scanning cache directory...');
  const cacheFiles = readdirSync(CACHE_DIR).filter(f =>
    f.includes('TourShowSet') && f.endsWith('.html')
  );
  console.log(`   Found ${cacheFiles.length} cached show pages\n`);

  // Connect to database
  console.log('🗄️  Connecting to database...');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Get shows needing setlists
  const showsNeedingSetlists = db.prepare(`
    SELECT id, date, venue_id FROM shows
    WHERE song_count = 0 OR song_count IS NULL
  `).all() as { id: number; date: string; venue_id: number }[];

  const showDateMap = new Map<string, number>();
  showsNeedingSetlists.forEach(row => {
    if (!showDateMap.has(row.date)) {
      showDateMap.set(row.date, row.id);
    }
  });
  console.log(`   Shows needing setlists: ${showDateMap.size}\n`);

  // Build song map
  const songMap = new Map<string, number>();
  const songRows = db.prepare('SELECT id, title FROM songs').all() as { id: number; title: string }[];
  songRows.forEach(row => {
    songMap.set(row.title.toLowerCase(), row.id);
  });
  console.log(`   Loaded ${songMap.size} songs\n`);

  // Prepare statements
  const insertSetlistEntry = db.prepare(`
    INSERT OR IGNORE INTO setlist_entries (show_id, song_id, position, set_name, slot, is_segue)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateShowSongCount = db.prepare(`
    UPDATE shows SET song_count = ? WHERE id = ?
  `);

  // Process cached files
  console.log('🔄 Processing cached show pages...\n');

  let processed = 0;
  let matched = 0;
  let showsUpdated = 0;
  let entriesInserted = 0;
  const missingSongs = new Set<string>();

  const transaction = db.transaction(() => {
    for (const filename of cacheFiles) {
      processed++;

      const html = readFileSync(join(CACHE_DIR, filename), 'utf-8');
      const parsedShow = parseShowHtml(html, filename);

      if (!parsedShow) continue;

      // Check if this date matches a show needing setlist
      const showId = showDateMap.get(parsedShow.date);
      if (!showId) continue;

      matched++;
      let entriesForShow = 0;

      for (const entry of parsedShow.setlist) {
        const songId = songMap.get(entry.songTitle.toLowerCase());

        if (!songId) {
          missingSongs.add(entry.songTitle);
          continue;
        }

        try {
          const result = insertSetlistEntry.run(
            showId,
            songId,
            entry.position,
            entry.set,
            entry.slot,
            entry.isSegue ? 1 : 0
          );
          if (result.changes > 0) {
            entriesInserted++;
            entriesForShow++;
          }
        } catch (err) {
          // Ignore duplicates
        }
      }

      if (entriesForShow > 0) {
        updateShowSongCount.run(entriesForShow, showId);
        showsUpdated++;
      }

      if (processed % 500 === 0) {
        console.log(`   Processed ${processed}/${cacheFiles.length} files, matched ${matched}, updated ${showsUpdated} shows...`);
      }
    }
  });

  transaction();

  // Get final counts
  const finalShowsWithSetlist = (db.prepare('SELECT COUNT(*) as count FROM shows WHERE song_count > 0').get() as { count: number }).count;
  const finalEntries = (db.prepare('SELECT COUNT(*) as count FROM setlist_entries').get() as { count: number }).count;

  console.log('\n========================================');
  console.log('📊 REPARSE SUMMARY');
  console.log('========================================\n');

  console.log('Processing Statistics:');
  console.log(`   Files processed: ${processed.toLocaleString()}`);
  console.log(`   Files matched to shows: ${matched.toLocaleString()}`);
  console.log(`   Shows updated: ${showsUpdated.toLocaleString()}`);
  console.log(`   Setlist entries inserted: ${entriesInserted.toLocaleString()}`);
  console.log(`   Unique missing songs: ${missingSongs.size}`);

  if (missingSongs.size > 0 && missingSongs.size <= 30) {
    console.log('\n   Missing song titles:');
    for (const song of missingSongs) {
      console.log(`     - ${song}`);
    }
  }

  console.log('\nDatabase State:');
  console.log(`   Shows with setlists: ${finalShowsWithSetlist.toLocaleString()}`);
  console.log(`   Total setlist entries: ${finalEntries.toLocaleString()}`);

  db.close();

  console.log('\n========================================');
  console.log('✅ Reparse complete!');
  console.log('========================================\n');
}

main().catch(console.error);
