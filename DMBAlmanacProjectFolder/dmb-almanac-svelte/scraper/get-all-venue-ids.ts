/**
 * Get all venue IDs from DMBAlmanac.com by scraping the venue list pages
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function main() {
  console.log("Getting all venue IDs from DMBAlmanac.com...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  const allVenues = new Map<string, { name: string; city: string }>(); // id -> {name, city}

  try {
    // Visit the venues page - it may have pagination
    console.log("Fetching venues list page...");

    let pageNum = 1;
    let hasMore = true;

    while (hasMore && pageNum <= 20) {
      // The venues page uses postback for pagination, so we need to navigate directly
      // First visit will show how pagination works
      const url = pageNum === 1
        ? `${BASE_URL}/Venues.aspx`
        : `${BASE_URL}/Venues.aspx?page=${pageNum}`;

      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      const html = await page.content();
      const $ = cheerio.load(html);

      let foundOnPage = 0;

      // Look for venue links
      $("a[href*='VenueStats.aspx?vid=']").each((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/vid=(\d+)/);
        if (match) {
          const id = match[1];
          const name = $(el).text().trim();
          // Try to get city from nearby text
          const parent = $(el).parent();
          const city = parent.text().replace(name, "").trim().replace(/^[,\s-]+|[,\s-]+$/g, "");

          if (!allVenues.has(id)) {
            allVenues.set(id, { name, city });
            foundOnPage++;
          }
        }
      });

      console.log(`  Page ${pageNum}: Found ${foundOnPage} new venues (total: ${allVenues.size})`);

      // Check if there's a next page - look for pagination
      const nextLink = $("a:contains('Next')").length > 0 ||
                      $(`a:contains('${pageNum + 1}')`).length > 0;

      // If we found no new venues or no pagination, stop
      if (foundOnPage === 0 || !nextLink) {
        hasMore = false;
      }

      pageNum++;

      // Be polite
      await new Promise(r => setTimeout(r, 1000));
    }

    // Save results
    const venues = Array.from(allVenues.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      city: data.city,
    })).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\nTotal unique venues: ${venues.length}`);

    writeFileSync(
      "output/all-venue-ids.json",
      JSON.stringify({ total: venues.length, venues }, null, 2)
    );

    console.log("Saved to output/all-venue-ids.json");

    // Print sample
    console.log("\nSample venues:");
    venues.slice(0, 30).forEach(v => console.log(`  ${v.id}: ${v.name} (${v.city})`));

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
