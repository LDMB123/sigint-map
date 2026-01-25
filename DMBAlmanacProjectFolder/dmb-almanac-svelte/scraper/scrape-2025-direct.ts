/**
 * Script to directly scrape 2025 shows with correct dates from DMBAlmanac.com
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join } from "path";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = "./output";

interface ShowData {
  originalId: string;
  date: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  tourYear: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeShowsFromYearPage(page: any, year: number): Promise<ShowData[]> {
  console.log(`\nFetching ${year} shows...`);

  const url = `${BASE_URL}/TourShow.aspx?where=${year}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  const html = await page.content();
  const $ = cheerio.load(html);

  const shows: ShowData[] = [];

  // Find all show links and extract data
  $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href") || "";

    // Extract show ID
    const idMatch = href.match(/id=(\d+)/);
    if (!idMatch) return;

    const showId = idMatch[1];

    // Skip if we already have this show
    if (shows.find(s => s.originalId === showId)) return;

    // Get the containing row/cell for context
    const $row = $link.closest("tr");
    const rowText = $row.text();

    // The link text often contains the date (e.g., "01.24.25")
    const linkText = $link.text().trim();

    // Try to extract date from link text first
    let dateMatch = linkText.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);

    // If not in link, try row text
    if (!dateMatch) {
      dateMatch = rowText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    }

    if (!dateMatch) {
      console.log(`  Could not find date for show ${showId}`);
      return;
    }

    const month = dateMatch[1].padStart(2, "0");
    const day = dateMatch[2].padStart(2, "0");
    let yearStr = dateMatch[3];
    if (yearStr.length === 2) {
      yearStr = parseInt(yearStr) > 50 ? `19${yearStr}` : `20${yearStr}`;
    }

    const date = `${yearStr}-${month}-${day}`;

    // Find venue name - look for VenueStats link in same row
    let venueName = "";
    let city = "";
    let state = "";
    let country = "USA";

    $row.find("a[href*='VenueStats.aspx']").each((_, venueEl) => {
      if (!venueName) {
        venueName = $(venueEl).text().trim();
      }
    });

    // If no venue link, get text after date
    if (!venueName) {
      // The venue often follows the date in format: "01.24.25 Venue Name"
      const afterDate = rowText.replace(/^\d{1,2}\.\d{1,2}\.\d{2,4}\s*/, "").trim();
      const parts = afterDate.split(",");
      if (parts.length > 0) {
        venueName = parts[0].trim();
      }
    }

    // Try to extract city/state from row
    const locationMatch = rowText.match(/,\s*([^,]+),\s*(\w{2})\s*$/);
    if (locationMatch) {
      city = locationMatch[1].trim();
      state = locationMatch[2].trim();
    }

    // Check for international
    if (rowText.toLowerCase().includes("mexico") || rowText.toLowerCase().includes("cancún")) {
      country = "Mexico";
    } else if (rowText.toLowerCase().includes("france") || rowText.toLowerCase().includes("cannes")) {
      country = "France";
    }

    shows.push({
      originalId: showId,
      date,
      venueName,
      city,
      state,
      country,
      tourYear: year,
    });
  });

  console.log(`  Found ${shows.length} shows for ${year}`);
  return shows;
}

async function getShowDetails(page: any, showId: string): Promise<Partial<ShowData> | null> {
  const url = `${BASE_URL}/TourShowSet.aspx?id=${showId}`;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    // Get venue and location from header
    const headerText = $("h2, .header, .venue-header").first().text();

    // Parse venue, city, state
    const venueMatch = headerText.match(/^([^,]+),\s*([^,]+),\s*(\w{2})/);

    let venueName = "";
    let city = "";
    let state = "";

    if (venueMatch) {
      venueName = venueMatch[1].trim();
      city = venueMatch[2].trim();
      state = venueMatch[3].trim();
    }

    // Get date from page
    const pageText = $("body").text();
    const dateMatch = pageText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);

    let date = "";
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, "0");
      const day = dateMatch[2].padStart(2, "0");
      let yearStr = dateMatch[3];
      if (yearStr.length === 2) {
        yearStr = parseInt(yearStr) > 50 ? `19${yearStr}` : `20${yearStr}`;
      }
      date = `${yearStr}-${month}-${day}`;
    }

    return { date, venueName, city, state };
  } catch (error) {
    console.error(`  Failed to get details for ${showId}:`, error);
    return null;
  }
}

async function main() {
  console.log("Scraping 2025 shows with correct dates...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Scrape 2025 and 2026
    const shows2025 = await scrapeShowsFromYearPage(page, 2025);
    await delay(2000);
    const shows2026 = await scrapeShowsFromYearPage(page, 2026);

    const allShows = [...shows2025, ...shows2026];

    // For shows missing venue details, fetch individually
    const needsDetails = allShows.filter(s => !s.venueName || !s.city);
    console.log(`\n${needsDetails.length} shows need venue details`);

    for (let i = 0; i < Math.min(needsDetails.length, 20); i++) {
      const show = needsDetails[i];
      console.log(`  Getting details for ${show.originalId} (${i + 1})...`);

      const details = await getShowDetails(page, show.originalId);
      if (details) {
        if (details.venueName) show.venueName = details.venueName;
        if (details.city) show.city = details.city;
        if (details.state) show.state = details.state;
        if (details.date) show.date = details.date;
      }

      await delay(1500);
    }

    // Filter and sort
    const validShows = allShows.filter(s => s.date && !s.date.includes("NaN"));
    validShows.sort((a, b) => a.date.localeCompare(b.date));

    // Save
    const output = {
      scrapedAt: new Date().toISOString(),
      totalShows: validShows.length,
      shows: validShows,
    };

    writeFileSync(
      join(OUTPUT_DIR, "shows-2025-2026-fixed.json"),
      JSON.stringify(output, null, 2),
      "utf-8"
    );

    console.log(`\nSaved ${validShows.length} shows`);
    console.log("\nSample shows:");
    validShows.slice(0, 15).forEach(s => {
      console.log(`  ${s.date} - ${s.venueName || "Unknown"}, ${s.city || "Unknown"}`);
    });

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
