import { scrapeAllVenues, saveVenues } from "./scrapers/venues.js";
import { scrapeAllSongs, saveSongs } from "./scrapers/songs.js";
import { scrapeAllGuests, saveGuests } from "./scrapers/guests.js";
import { scrapeAllShows, saveShows } from "./scrapers/shows.js";

async function main() {
  console.log("=".repeat(60));
  console.log("DMB Almanac Scraper");
  console.log("=".repeat(60));
  console.log("");
  console.log("This scraper will collect data from dmbalmanac.com");
  console.log("Please be patient - this process is rate-limited to be respectful.");
  console.log("");

  const startTime = Date.now();

  try {
    // Step 1: Scrape venues (referenced by shows)
    console.log("\n[1/4] Scraping venues...\n");
    const venues = await scrapeAllVenues();
    saveVenues(venues);

    // Step 2: Scrape songs (referenced by setlists)
    console.log("\n[2/4] Scraping songs...\n");
    const songs = await scrapeAllSongs();
    saveSongs(songs);

    // Step 3: Scrape guests (referenced by appearances)
    console.log("\n[3/4] Scraping guests...\n");
    const guests = await scrapeAllGuests();
    saveGuests(guests);

    // Step 4: Scrape shows and setlists (references venues, songs, guests)
    console.log("\n[4/4] Scraping shows and setlists...\n");
    const shows = await scrapeAllShows();
    saveShows(shows);

    const duration = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log("\n" + "=".repeat(60));
    console.log("SCRAPING COMPLETE!");
    console.log("=".repeat(60));
    console.log(`  Venues:  ${venues.length}`);
    console.log(`  Songs:   ${songs.length}`);
    console.log(`  Guests:  ${guests.length}`);
    console.log(`  Shows:   ${shows.length}`);
    console.log(`  Duration: ${duration} minutes`);
    console.log("");
    console.log("Output files saved to: scraper/output/");
    console.log("Next step: Run 'npm run import' to import data into SQLite");
    console.log("");
  } catch (error) {
    console.error("\nScraping failed:", error);
    console.error("\nYou can resume from checkpoints by running the scraper again.");
    process.exit(1);
  }
}

main();
