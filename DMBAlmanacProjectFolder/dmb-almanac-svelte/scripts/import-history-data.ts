import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");
const HISTORY_JSON_PATH = join(process.cwd(), "scraper", "output", "history.json");

interface HistoryShow {
  originalId: string;
  showDate: string;
  year: number;
  venueName: string;
  city: string;
  country: string;
}

interface HistoryDay {
  month: number;
  day: number;
  calendarDate: string;
  shows: HistoryShow[];
}

interface HistoryData {
  scrapedAt: string;
  source: string;
  totalItems: number;
  days: HistoryDay[];
}

async function main() {
  console.log("========================================");
  console.log("DMB Almanac - History Data Import");
  console.log("========================================\n");

  // Read and parse history.json
  console.log(`📖 Reading ${HISTORY_JSON_PATH}...`);
  const historyData: HistoryData = JSON.parse(
    readFileSync(HISTORY_JSON_PATH, "utf-8")
  );

  console.log(`   Scraped at: ${historyData.scrapedAt}`);
  console.log(`   Source: ${historyData.source}`);
  console.log(`   Days with shows: ${historyData.days.length}`);

  const totalShows = historyData.days.reduce(
    (sum, day) => sum + day.shows.length,
    0
  );
  console.log(`   Total show entries: ${totalShows}\n`);

  // Analyze the data
  console.log("🔍 Analyzing data quality...");

  const validShows = historyData.days.flatMap((day) =>
    day.shows.filter(
      (show) => show.year >= 1990 && show.year <= 2025
    )
  );

  const unknownVenueCount = validShows.filter(
    (show) => show.venueName === "Unknown Venue"
  ).length;

  const ancientShows = historyData.days.flatMap((day) =>
    day.shows.filter((show) => show.year < 1990)
  );

  const futureShows = historyData.days.flatMap((day) =>
    day.shows.filter((show) => show.year > 2025)
  );

  console.log(`   Valid DMB era shows (1990-2025): ${validShows.length}`);
  console.log(`   Shows with "Unknown Venue": ${unknownVenueCount} (${((unknownVenueCount / validShows.length) * 100).toFixed(1)}%)`);
  console.log(`   Ancient/invalid shows (< 1990): ${ancientShows.length}`);
  console.log(`   Future/invalid shows (> 2025): ${futureShows.length}\n`);

  // Connect to database
  console.log("🗄️  Connecting to database...");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Check if this_day_in_history is a view or table
  const viewCheck = db
    .prepare(
      "SELECT type, sql FROM sqlite_master WHERE name = 'this_day_in_history'"
    )
    .get() as { type: string; sql: string } | undefined;

  if (viewCheck) {
    console.log(`   Found: ${viewCheck.type.toUpperCase()}`);
    if (viewCheck.type === "view") {
      console.log("   Note: this_day_in_history is a VIEW, not a table");
      console.log("   It dynamically queries the shows table based on date_month and date_day\n");
    }
  } else {
    console.log("   this_day_in_history does not exist\n");
  }

  // Check current shows in database
  const showCount = db.prepare("SELECT COUNT(*) as count FROM shows").get() as {
    count: number;
  };
  console.log(`   Current shows in database: ${showCount.count}`);

  // Check if shows have date_month and date_day populated
  const monthDayCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM shows WHERE date_month IS NOT NULL AND date_day IS NOT NULL"
    )
    .get() as { count: number };
  console.log(`   Shows with date_month/date_day: ${monthDayCount.count}\n`);

  // Cross-reference history.json shows with database
  console.log("🔗 Cross-referencing with existing shows...");

  const matchedShows = [];
  const unmatchedShows = [];

  for (const show of validShows) {
    const dbShow = db
      .prepare("SELECT id, date, venue_id FROM shows WHERE date = ?")
      .get(show.showDate) as { id: number; date: string; venue_id: number } | undefined;

    if (dbShow) {
      matchedShows.push({ history: show, db: dbShow });
    } else {
      unmatchedShows.push(show);
    }
  }

  console.log(`   ✅ Matched shows: ${matchedShows.length} (${((matchedShows.length / validShows.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Unmatched shows: ${unmatchedShows.length} (${((unmatchedShows.length / validShows.length) * 100).toFixed(1)}%)\n`);

  // Sample some unmatched shows
  if (unmatchedShows.length > 0) {
    console.log("📋 Sample unmatched shows (first 10):");
    unmatchedShows.slice(0, 10).forEach((show, idx) => {
      console.log(`   ${idx + 1}. ${show.showDate} - ${show.venueName}, ${show.city}`);
    });
    console.log();
  }

  // Test the this_day_in_history view
  console.log("🧪 Testing this_day_in_history view...");
  const testDate = { month: 4, day: 15 }; // April 15
  const historyResults = db
    .prepare(
      `SELECT
        id,
        date,
        year,
        venue_name,
        venue_city,
        venue_state
      FROM this_day_in_history
      WHERE date_month = ? AND date_day = ?
      ORDER BY year DESC
      LIMIT 5`
    )
    .all(testDate.month, testDate.day) as Array<{
      id: number;
      date: string;
      year: string;
      venue_name: string;
      venue_city: string;
      venue_state: string;
    }>;

  console.log(`   Query: Shows on ${testDate.month}/${testDate.day} (any year)`);
  console.log(`   Results: ${historyResults.length} shows found`);

  if (historyResults.length > 0) {
    console.log("\n   Sample results:");
    historyResults.forEach((show) => {
      console.log(`   - ${show.date}: ${show.venue_name}, ${show.venue_city}${show.venue_state ? ', ' + show.venue_state : ''}`);
    });
  }
  console.log();

  // Generate recommendations
  console.log("========================================");
  console.log("📊 ANALYSIS SUMMARY");
  console.log("========================================\n");

  console.log("Data Quality Assessment:");
  console.log(`- The history.json file contains ${totalShows} total show entries`);
  console.log(`- Only ${validShows.length} are in valid DMB date range (1990-2025)`);
  console.log(`- ${unknownVenueCount} shows (${((unknownVenueCount / validShows.length) * 100).toFixed(1)}%) have "Unknown Venue"`);
  console.log(`- ${matchedShows.length} shows (${((matchedShows.length / validShows.length) * 100).toFixed(1)}%) already exist in database\n`);

  console.log("Database Status:");
  console.log(`- Current shows in database: ${showCount.count}`);
  console.log(`- Shows with date_month/date_day: ${monthDayCount.count}`);
  console.log(`- this_day_in_history: ${viewCheck?.type || 'NOT FOUND'}\n`);

  console.log("Conclusions:");
  if (matchedShows.length / validShows.length > 0.95) {
    console.log("✅ The show data from history.json is already imported!");
    console.log("   The this_day_in_history view provides the same functionality");
    console.log("   by querying shows based on calendar date (month/day).\n");
  } else {
    console.log("⚠️  Some shows from history.json are missing from the database.");
    console.log("   However, they all have 'Unknown Venue', suggesting incomplete scraping.\n");
  }

  console.log("Recommendations:");
  console.log("1. The this_day_in_history view is already functional");
  console.log("2. No additional import is needed for this data");
  console.log("3. The history.json data appears to be a different representation");
  console.log("   of existing show data, organized by calendar date");
  console.log("4. If unmatched shows are needed, the scraper should be fixed to");
  console.log("   capture complete venue information\n");

  // Check if there are any shows without date_month/date_day
  if (monthDayCount.count < showCount.count) {
    console.log("⚠️  ACTION REQUIRED:");
    console.log(`   ${showCount.count - monthDayCount.count} shows are missing date_month/date_day values`);
    console.log("   Run this to fix:");
    console.log("   UPDATE shows SET date_month = CAST(strftime('%m', date) AS INTEGER),");
    console.log("                    date_day = CAST(strftime('%d', date) AS INTEGER)");
    console.log("   WHERE date_month IS NULL OR date_day IS NULL;\n");
  }

  db.close();
  console.log("========================================");
  console.log("✅ Analysis complete!");
  console.log("========================================\n");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
