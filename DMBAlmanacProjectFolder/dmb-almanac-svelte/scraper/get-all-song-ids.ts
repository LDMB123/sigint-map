/**
 * Get all song IDs from DMBAlmanac.com by extracting from the song dropdown
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function main() {
  console.log("Getting all song IDs from DMBAlmanac.com...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  const allSongIds = new Map<string, string>(); // id -> title

  try {
    // The song dropdown is on the SongStats page
    console.log("Fetching song page with dropdown...");
    await page.goto(`${BASE_URL}/SongStats.aspx?sid=1`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Look for the song dropdown - it has id "SongNav_ddlSongSelect"
    $("#SongNav_ddlSongSelect option").each((_, el) => {
      const value = $(el).attr("value");
      const title = $(el).text().trim();
      if (value && title && title.length > 0) {
        allSongIds.set(value, title);
      }
    });

    console.log(`Found ${allSongIds.size} songs from dropdown`);

    // Save results
    const songs = Array.from(allSongIds.entries()).map(([id, title]) => ({
      id,
      title,
    })).sort((a, b) => {
      // Sort alphabetically by title
      const aTitle = a.title.replace(/^[^a-zA-Z0-9]+/, "").toLowerCase();
      const bTitle = b.title.replace(/^[^a-zA-Z0-9]+/, "").toLowerCase();
      return aTitle.localeCompare(bTitle);
    });

    console.log(`\nTotal unique songs: ${songs.length}`);

    writeFileSync(
      "output/all-song-ids.json",
      JSON.stringify({ total: songs.length, songs }, null, 2)
    );

    console.log("Saved to output/all-song-ids.json");

    // Print sample
    console.log("\nSample songs:");
    songs.slice(0, 30).forEach(s => console.log(`  ${s.id}: ${s.title}`));

  } finally {
    await browser.close();
  }
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
