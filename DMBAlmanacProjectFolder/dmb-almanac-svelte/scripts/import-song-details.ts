import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");
const SONG_DETAILS_JSON_PATH = join(process.cwd(), "scraper", "output", "song-details.json");

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

interface SongDetailsData {
  scrapedAt: string;
  source: string;
  total: number;
  songs: SongDetail[];
}

function loadSongDetailsJson(): SongDetailsData | null {
  if (!existsSync(SONG_DETAILS_JSON_PATH)) {
    console.log(`File not found: ${SONG_DETAILS_JSON_PATH}`);
    return null;
  }

  const content = readFileSync(SONG_DETAILS_JSON_PATH, "utf-8");
  const data = JSON.parse(content) as SongDetailsData;
  return data;
}

function ensureColumnsExist(db: Database.Database): void {
  console.log("Checking songs table schema...");

  // Get current columns
  const columns = db
    .prepare("PRAGMA table_info(songs)")
    .all() as Array<{ name: string; type: string }>;
  const columnNames = columns.map((col) => col.name);

  const columnsToAdd = [
    { name: "composer", type: "TEXT" },
    { name: "composer_year", type: "INTEGER" },
    { name: "album_id", type: "TEXT" },
    { name: "album_name", type: "TEXT" },
    { name: "avg_length_seconds", type: "INTEGER" },
    { name: "song_history", type: "TEXT" },
    { name: "is_cover", type: "INTEGER" },
    { name: "original_artist", type: "TEXT" },
    { name: "first_played_date", type: "TEXT" },
    { name: "last_played_date", type: "TEXT" },
    { name: "total_performances", type: "INTEGER" },
  ];

  let addedCount = 0;
  for (const column of columnsToAdd) {
    if (!columnNames.includes(column.name)) {
      console.log(`Adding column: ${column.name} (${column.type})`);
      db.prepare(`ALTER TABLE songs ADD COLUMN ${column.name} ${column.type}`).run();
      addedCount++;
    }
  }

  if (addedCount === 0) {
    console.log("All required columns already exist");
  } else {
    console.log(`Added ${addedCount} new column(s)`);
  }
}

async function importSongDetails(db: Database.Database): Promise<void> {
  console.log("Importing song details...");

  const data = loadSongDetailsJson();
  if (!data?.songs) {
    console.log("No song details to import");
    return;
  }

  console.log(`Loaded ${data.songs.length} songs from song-details.json`);
  console.log(`Scraped at: ${data.scrapedAt}`);
  console.log(`Source: ${data.source}`);

  // Ensure required columns exist
  ensureColumnsExist(db);

  // Build a case-insensitive title lookup map for existing songs
  const existingSongs = db
    .prepare(`SELECT id, title FROM songs`)
    .all() as Array<{ id: number; title: string }>;

  const songLookup = new Map<string, number>();
  for (const song of existingSongs) {
    songLookup.set(song.title.toLowerCase().trim(), song.id);
  }

  console.log(`\nFound ${existingSongs.length} songs in database`);

  // Prepare update statement
  const updateSong = db.prepare(`
    UPDATE songs
    SET
      composer = COALESCE(?, composer),
      composer_year = COALESCE(?, composer_year),
      album_id = COALESCE(?, album_id),
      album_name = COALESCE(?, album_name),
      avg_length_seconds = COALESCE(?, avg_length_seconds),
      song_history = COALESCE(?, song_history),
      is_cover = COALESCE(?, is_cover),
      original_artist = COALESCE(?, original_artist),
      first_played_date = COALESCE(?, first_played_date),
      last_played_date = COALESCE(?, last_played_date),
      total_performances = COALESCE(?, total_performances),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const importAll = db.transaction(() => {
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const songDetail of data.songs) {
      if (!songDetail.title) {
        skippedCount++;
        continue;
      }

      // Normalize title for lookup (case-insensitive, trim whitespace)
      const normalizedTitle = songDetail.title.toLowerCase().trim();
      const songId = songLookup.get(normalizedTitle);

      if (!songId) {
        // Try without quotes in case of mismatch
        const withoutQuotes = normalizedTitle.replace(/^["']|["']$/g, "");
        const altSongId = songLookup.get(withoutQuotes);

        if (!altSongId) {
          notFoundCount++;
          if (notFoundCount <= 10) {
            // Only log first 10 to avoid spam
            console.log(`  Warning: Song not found in database: "${songDetail.title}"`);
          }
          continue;
        }

        // Use the alternative match
        try {
          updateSong.run(
            songDetail.composer,
            songDetail.composerYear,
            songDetail.albumId,
            songDetail.albumName,
            songDetail.avgLengthSeconds,
            songDetail.songHistory,
            songDetail.isCover ? 1 : 0,
            songDetail.originalArtist,
            songDetail.firstPlayedDate,
            songDetail.lastPlayedDate,
            songDetail.totalPlays,
            altSongId
          );
          updatedCount++;
        } catch (err) {
          console.log(`  Error updating song "${songDetail.title}": ${(err as Error).message}`);
          skippedCount++;
        }
        continue;
      }

      // Update the song
      try {
        updateSong.run(
          songDetail.composer,
          songDetail.composerYear,
          songDetail.albumId,
          songDetail.albumName,
          songDetail.avgLengthSeconds,
          songDetail.songHistory,
          songDetail.isCover ? 1 : 0,
          songDetail.originalArtist,
          songDetail.firstPlayedDate,
          songDetail.lastPlayedDate,
          songDetail.totalPlays,
          songId
        );
        updatedCount++;
      } catch (err) {
        console.log(`  Error updating song "${songDetail.title}": ${(err as Error).message}`);
        skippedCount++;
      }
    }

    console.log(`\nImport summary:`);
    console.log(`  Updated: ${updatedCount} songs`);
    console.log(`  Not found in database: ${notFoundCount} songs`);
    console.log(`  Skipped (errors): ${skippedCount} songs`);
  });

  importAll();

  // Show statistics on the imported data
  const statsQueries = [
    {
      label: "Songs with composer info",
      query: "SELECT COUNT(*) as count FROM songs WHERE composer IS NOT NULL",
    },
    {
      label: "Songs with composer year",
      query: "SELECT COUNT(*) as count FROM songs WHERE composer_year IS NOT NULL",
    },
    {
      label: "Songs with album info",
      query: "SELECT COUNT(*) as count FROM songs WHERE album_name IS NOT NULL",
    },
    {
      label: "Songs with avg length",
      query: "SELECT COUNT(*) as count FROM songs WHERE avg_length_seconds IS NOT NULL",
    },
    {
      label: "Songs with history text",
      query: "SELECT COUNT(*) as count FROM songs WHERE song_history IS NOT NULL",
    },
    {
      label: "Songs marked as covers",
      query: "SELECT COUNT(*) as count FROM songs WHERE is_cover = 1",
    },
    {
      label: "Songs with original artist",
      query: "SELECT COUNT(*) as count FROM songs WHERE original_artist IS NOT NULL",
    },
    {
      label: "Songs with first played date",
      query: "SELECT COUNT(*) as count FROM songs WHERE first_played_date IS NOT NULL",
    },
    {
      label: "Songs with last played date",
      query: "SELECT COUNT(*) as count FROM songs WHERE last_played_date IS NOT NULL",
    },
    {
      label: "Songs with total plays",
      query: "SELECT COUNT(*) as count FROM songs WHERE total_performances IS NOT NULL",
    },
  ];

  console.log(`\nPost-import statistics:`);
  for (const stat of statsQueries) {
    const result = db.prepare(stat.query).get() as { count: number };
    console.log(`  ${stat.label}: ${result.count}`);
  }

  // Show some sample updated songs
  const sampleSongs = db
    .prepare(
      `
    SELECT title, composer, composer_year, album_name, avg_length_seconds,
           is_cover, original_artist, first_played_date, last_played_date, total_performances
    FROM songs
    WHERE composer IS NOT NULL
    ORDER BY total_performances DESC
    LIMIT 5
  `
    )
    .all() as Array<{
    title: string;
    composer: string;
    composer_year: number | null;
    album_name: string | null;
    avg_length_seconds: number | null;
    is_cover: number;
    original_artist: string | null;
    first_played_date: string | null;
    last_played_date: string | null;
    total_performances: number | null;
  }>;

  if (sampleSongs.length > 0) {
    console.log(`\nSample of updated songs (top 5 by performances):`);
    sampleSongs.forEach((song) => {
      const avgMinutes = song.avg_length_seconds
        ? `${Math.floor(song.avg_length_seconds / 60)}:${(song.avg_length_seconds % 60).toString().padStart(2, "0")}`
        : "N/A";
      const coverInfo = song.is_cover ? ` [COVER${song.original_artist ? ` by ${song.original_artist}` : ""}]` : "";
      const playInfo = song.total_performances ? ` (${song.total_performances} plays)` : "";
      const dateRange = song.first_played_date && song.last_played_date
        ? ` ${song.first_played_date} to ${song.last_played_date}`
        : "";
      console.log(
        `  "${song.title}" - ${song.composer || "?"} (${song.composer_year || "?"})${coverInfo}${playInfo}${dateRange} - avg ${avgMinutes}`
      );
    });
  }

  console.log("\nSong details import complete!");
}

async function main(): Promise<void> {
  console.log("Starting song details import...\n");

  // Open database connection
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    await importSongDetails(db);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
