import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const OUTPUT_DIR = join(process.cwd(), "scraper", "output");
const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

interface ScrapedTourRarity {
  tourName: string;
  year: number;
  averageRarityIndex: number;
  differentSongsPlayed: number;
  rank?: number;
  shows: unknown[];
}

interface RarityData {
  scrapedAt: string;
  source: string;
  totalTours: number;
  totalShows: number;
  tours: ScrapedTourRarity[];
  metadata?: {
    rarityCalculationMethod: string;
  };
}

function loadRarityJson(): RarityData | null {
  const filepath = join(OUTPUT_DIR, "rarity.json");
  if (!existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return null;
  }

  const content = readFileSync(filepath, "utf-8");
  const data = JSON.parse(content) as RarityData;
  return data;
}

async function importRarityData(db: Database.Database): Promise<void> {
  console.log("Importing tour rarity data...");

  const data = loadRarityJson();
  if (!data?.tours) {
    console.log("No rarity data to import");
    return;
  }

  console.log(`Loaded ${data.tours.length} tours from rarity.json`);
  console.log(`Scraped at: ${data.scrapedAt}`);
  console.log(`Source: ${data.source}`);
  if (data.metadata?.rarityCalculationMethod) {
    console.log(`Calculation method: ${data.metadata.rarityCalculationMethod}`);
  }

  // Check current state of tours table
  const currentTours = db.prepare(`
    SELECT id, year, name, rarity_index, unique_songs_played
    FROM tours
    ORDER BY year DESC
  `).all() as Array<{
    id: number;
    year: number;
    name: string;
    rarity_index: number | null;
    unique_songs_played: number;
  }>;

  console.log(`\nCurrent tours in database: ${currentTours.length}`);
  const toursWithRarity = currentTours.filter((t) => t.rarity_index !== null).length;
  console.log(`Tours with rarity_index: ${toursWithRarity}`);
  console.log(`Tours missing rarity_index: ${currentTours.length - toursWithRarity}`);

  // Prepare update statement - update by id for precision
  const updateTourById = db.prepare(`
    UPDATE tours
    SET rarity_index = ?, unique_songs_played = COALESCE(?, unique_songs_played)
    WHERE id = ?
  `);

  // Helper to normalize tour names for matching
  const normalizeName = (name: string): string => {
    return name.toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[\/\\]/g, " ")
      .trim();
  };

  // Create a lookup map for tours by year and normalized name
  const tourLookup = new Map<string, typeof currentTours[0]>();
  for (const tour of currentTours) {
    const key = `${tour.year}-${normalizeName(tour.name)}`;
    tourLookup.set(key, tour);
  }

  const importAll = db.transaction(() => {
    let updatedCount = 0;
    let skippedCount = 0;
    let noMatchCount = 0;
    let noChangeCount = 0;

    for (const tour of data.tours) {
      // Skip tours with no data (all zeros)
      if (tour.averageRarityIndex === 0 && tour.differentSongsPlayed === 0) {
        skippedCount++;
        continue;
      }

      // Try to find matching tour in database by year + name
      const key = `${tour.year}-${normalizeName(tour.tourName)}`;
      let existingTour = tourLookup.get(key);

      // If not found by exact match, try fuzzy matching within same year
      if (!existingTour) {
        const toursInYear = currentTours.filter((t) => t.year === tour.year);
        if (toursInYear.length === 1) {
          // Only one tour in that year, use it
          existingTour = toursInYear[0];
        } else if (toursInYear.length > 1) {
          // Multiple tours, try partial name match
          const normalizedTourName = normalizeName(tour.tourName);
          existingTour = toursInYear.find((t) => {
            const normalizedDbName = normalizeName(t.name);
            return normalizedDbName.includes(normalizedTourName) ||
                   normalizedTourName.includes(normalizedDbName);
          });
        }
      }

      if (!existingTour) {
        console.log(`Warning: No tour found in database for "${tour.tourName}" (${tour.year})`);
        noMatchCount++;
        continue;
      }

      // Check if values are different before updating
      const rarityChanged = existingTour.rarity_index !== tour.averageRarityIndex;
      const songsChanged = tour.differentSongsPlayed > 0 &&
                          existingTour.unique_songs_played !== tour.differentSongsPlayed;

      if (!rarityChanged && !songsChanged) {
        noChangeCount++;
        continue;
      }

      // Update the tour by ID
      updateTourById.run(
        tour.averageRarityIndex,
        tour.differentSongsPlayed > 0 ? tour.differentSongsPlayed : null,
        existingTour.id
      );
      updatedCount++;

      // Log the update
      console.log(
        `Updated "${existingTour.name}" (${tour.year}): rarity_index=${tour.averageRarityIndex}` +
        (tour.differentSongsPlayed > 0 ? `, unique_songs=${tour.differentSongsPlayed}` : "")
      );
    }

    console.log(`\nImport summary:`);
    console.log(`  Updated: ${updatedCount} tours`);
    console.log(`  Skipped (no data): ${skippedCount} tours`);
    console.log(`  Skipped (no change): ${noChangeCount} tours`);
    console.log(`  No match found: ${noMatchCount} tours`);
  });

  importAll();

  // Verify the import
  const updatedTours = db.prepare(`
    SELECT year, name, rarity_index, unique_songs_played
    FROM tours
    WHERE rarity_index IS NOT NULL
    ORDER BY year DESC
  `).all() as Array<{
    year: number;
    name: string;
    rarity_index: number;
    unique_songs_played: number;
  }>;

  console.log(`\nVerification:`);
  console.log(`  Tours with rarity_index after import: ${updatedTours.length}`);

  // Check the tour_rarity_rankings view
  const rankingsCount = db.prepare(`SELECT COUNT(*) as count FROM tour_rarity_rankings`).get() as {
    count: number;
  };
  console.log(`  tour_rarity_rankings view now has: ${rankingsCount.count} rows`);

  // Show sample of top rarity tours
  const topRareTours = db.prepare(`
    SELECT year, name, rarity_index, unique_songs_played, rarity_rank
    FROM tour_rarity_rankings
    ORDER BY rarity_index DESC
    LIMIT 5
  `).all() as Array<{
    year: number;
    name: string;
    rarity_index: number;
    unique_songs_played: number;
    rarity_rank: number;
  }>;

  if (topRareTours.length > 0) {
    console.log(`\nTop 5 rarest tours (highest rarity_index):`);
    topRareTours.forEach((tour) => {
      console.log(
        `  #${tour.rarity_rank} - ${tour.year}: rarity=${tour.rarity_index.toFixed(2)}, songs=${tour.unique_songs_played}`
      );
    });
  }

  console.log("\nRarity data import complete!");
}

async function main(): Promise<void> {
  console.log("Starting rarity data import...\n");

  // Open database connection
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    await importRarityData(db);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
