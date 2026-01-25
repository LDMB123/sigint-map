/**
 * Get all guest IDs from DMBAlmanac.com
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function main() {
  console.log("Getting all guest IDs from DMBAlmanac.com...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  const allGuests = new Map<string, string>(); // id -> name

  try {
    // Visit the guests page
    console.log("Fetching guests page...");
    await page.goto(`${BASE_URL}/Guests.aspx`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    let html = await page.content();
    let $ = cheerio.load(html);

    // Look for guest links
    $("a[href*='GuestStats.aspx?gid=']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/gid=(\d+)/);
      if (match) {
        const name = $(el).text().trim();
        if (name) allGuests.set(match[1], name);
      }
    });

    console.log(`Found ${allGuests.size} guests from guests page`);

    // Also check a guest detail page for dropdown
    console.log("Checking guest page for dropdown...");
    await page.goto(`${BASE_URL}/GuestStats.aspx?gid=1`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    html = await page.content();
    $ = cheerio.load(html);

    // Check for guest dropdown
    $("select option[value]").each((_, el) => {
      const value = $(el).attr("value");
      const name = $(el).text().trim();
      if (value && !isNaN(parseInt(value)) && name) {
        allGuests.set(value, name);
      }
    });

    // Also scan for guest links on this page
    $("a[href*='GuestStats.aspx?gid=']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/gid=(\d+)/);
      if (match) {
        const name = $(el).text().trim();
        if (name) allGuests.set(match[1], name);
      }
    });

    console.log(`Total after guest page: ${allGuests.size}`);

    // Check the homepage for more guest links
    console.log("Checking homepage for guest links...");
    await page.goto(`${BASE_URL}/Default.aspx`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    html = await page.content();
    $ = cheerio.load(html);

    $("a[href*='GuestStats.aspx?gid=']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/gid=(\d+)/);
      if (match) {
        const name = $(el).text().trim();
        if (name) allGuests.set(match[1], name);
      }
    });

    console.log(`Total after homepage: ${allGuests.size}`);

    // Save results
    const guests = Array.from(allGuests.entries()).map(([id, name]) => ({
      id,
      name,
    })).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\nTotal unique guests: ${guests.length}`);

    writeFileSync(
      "output/all-guest-ids.json",
      JSON.stringify({ total: guests.length, guests }, null, 2)
    );

    console.log("Saved to output/all-guest-ids.json");

    // Print sample
    console.log("\nSample guests:");
    guests.slice(0, 30).forEach(g => console.log(`  ${g.id}: ${g.name}`));

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
