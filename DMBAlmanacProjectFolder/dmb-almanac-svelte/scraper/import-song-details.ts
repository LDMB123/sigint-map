/**
 * Import scraped song details into the database
 */

import Database from "better-sqlite3";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "..", "data", "dmb-almanac.db");
const SONG_DETAILS_PATH = "./output/song-details.json";

interface SongDetail {
  originalId: string;
  title: string;
  composer: string | null;
  composerYear: number | null;
  albumId: string | null;
  albumName: string | null;
  isCover: boolean;
  originalArtist: string | null;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
  totalPlays: number | null;
  avgLengthSeconds: number | null;
  songHistory: string | null;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Importing song details to database...\n");

  if (!existsSync(SONG_DETAILS_PATH)) {
    console.error("Song details file not found. Run scrape-song-details.ts first.");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(SONG_DETAILS_PATH, "utf-8"));
  const songDetails: SongDetail[] = data.songs;
  console.log(`Loaded ${songDetails.length} song details from scraper output`);

  const db = new Database(DB_PATH);

  // Get existing songs from database
  const existingSongs = db.prepare(`
    SELECT id, title, slug, first_played_date, last_played_date, total_performances, is_cover, original_artist, notes
    FROM songs
  `).all() as {
    id: number;
    title: string;
    slug: string;
    first_played_date: string | null;
    last_played_date: string | null;
    total_performances: number;
    is_cover: number;
    original_artist: string | null;
    notes: string | null;
  }[];

  console.log(`Found ${existingSongs.length} songs in database`);

  // Create a map of normalized titles to database songs
  const titleMap = new Map<string, typeof existingSongs[0]>();
  for (const song of existingSongs) {
    titleMap.set(normalizeTitle(song.title), song);
  }

  // Prepare update statement
  const updateSong = db.prepare(`
    UPDATE songs SET
      first_played_date = COALESCE(?, first_played_date),
      last_played_date = COALESCE(?, last_played_date),
      total_performances = CASE WHEN ? > 0 THEN ? ELSE total_performances END,
      is_cover = ?,
      original_artist = COALESCE(?, original_artist),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let updated = 0;
  let notFound = 0;
  let skipped = 0;

  for (const detail of songDetails) {
    const normalizedTitle = normalizeTitle(detail.title);
    const dbSong = titleMap.get(normalizedTitle);

    if (!dbSong) {
      notFound++;
      continue;
    }

    // Check if we have any new data to update
    const hasNewData =
      (detail.firstPlayedDate && !dbSong.first_played_date) ||
      (detail.lastPlayedDate && !dbSong.last_played_date) ||
      (detail.totalPlays && detail.totalPlays > dbSong.total_performances) ||
      (detail.isCover && !dbSong.is_cover) ||
      (detail.originalArtist && !dbSong.original_artist) ||
      (detail.songHistory && !dbSong.notes);

    if (!hasNewData) {
      skipped++;
      continue;
    }

    updateSong.run(
      detail.firstPlayedDate,
      detail.lastPlayedDate,
      detail.totalPlays || 0,
      detail.totalPlays || 0,
      detail.isCover ? 1 : 0,
      detail.originalArtist,
      detail.songHistory,
      dbSong.id
    );

    updated++;
  }

  console.log(`\nResults:`);
  console.log(`  Updated: ${updated} songs`);
  console.log(`  Skipped (no new data): ${skipped} songs`);
  console.log(`  Not found in DB: ${notFound} songs`);

  // Show sample of updated data
  const sample = db.prepare(`
    SELECT title, first_played_date, last_played_date, total_performances, is_cover
    FROM songs
    WHERE first_played_date IS NOT NULL
    ORDER BY total_performances DESC
    LIMIT 10
  `).all();

  console.log(`\nTop 10 songs by performances:`);
  for (const song of sample as any[]) {
    console.log(`  ${song.title}: ${song.total_performances} plays (${song.first_played_date} - ${song.last_played_date})`);
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
