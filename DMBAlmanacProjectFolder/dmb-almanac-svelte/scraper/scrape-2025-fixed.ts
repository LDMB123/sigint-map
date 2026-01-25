/**
 * Fixed script to scrape 2025/2026 shows with correct date parsing
 * Based on actual HTML structure analysis
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
  tourName: string;
  venueId: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(dateStr: string): string {
  // Input: "01.24.25" or "01.24.2025" or " 01.24.25"
  const cleaned = dateStr.replace(/[^\d.]/g, "").trim();
  const parts = cleaned.split(".");

  if (parts.length !== 3) return "";

  const month = parts[0].padStart(2, "0");
  const day = parts[1].padStart(2, "0");
  let year = parts[2];

  // Convert 2-digit year to 4-digit
  if (year.length === 2) {
    const yearNum = parseInt(year);
    year = yearNum > 50 ? `19${year}` : `20${year}`;
  }

  return `${year}-${month}-${day}`;
}

async function scrapeYearPage(page: any, year: number): Promise<ShowData[]> {
  console.log(`\nScraping ${year} shows...`);

  const url = `${BASE_URL}/TourShow.aspx?where=${year}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  const html = await page.content();
  const $ = cheerio.load(html);

  const shows: ShowData[] = [];

  // Each show row has class "showrowcell"
  // The structure is: <tr><td><a href="TourShowSet...">DATE</a></td>...<td><a href="VenueStats...">VENUE</a></td>...</tr>

  $("tr").each((_, row) => {
    const $row = $(row);

    // Find show link with date
    const $showLink = $row.find("a[href*='TourShowSet.aspx'][href*='id=']").first();
    if (!$showLink.length) return;

    const href = $showLink.attr("href") || "";
    const dateText = $showLink.text().trim();

    // Extract show ID
    const idMatch = href.match(/id=(\d+)/);
    if (!idMatch) return;

    const showId = idMatch[1];

    // Skip if already processed
    if (shows.find(s => s.originalId === showId)) return;

    // Parse date from link text
    const date = parseDate(dateText);
    if (!date) {
      console.log(`  Could not parse date: "${dateText}" for show ${showId}`);
      return;
    }

    // Find venue link in same row
    const $venueLink = $row.find("a[href*='VenueStats.aspx']").first();
    let venueName = $venueLink.text().trim() || "";
    let venueId = "";

    if ($venueLink.length) {
      const venueHref = $venueLink.attr("href") || "";
      const vidMatch = venueHref.match(/vid=(\d+)/);
      if (vidMatch) venueId = vidMatch[1];
    }

    // Extract location - typically in a cell after venue
    let city = "";
    let state = "";
    let country = "USA";

    // Location is often in the row text after venue
    const rowText = $row.text();

    // Try to find city, state pattern
    // The format is usually: "Venue Name" ... "City, ST" or "City, State"
    const locationMatch = rowText.match(/([A-Za-z\s]+),\s*([A-Z]{2})\b/);
    if (locationMatch) {
      city = locationMatch[1].trim();
      state = locationMatch[2];
    }

    // Detect international shows
    if (rowText.includes("Mexico") || rowText.includes("Cancún") || rowText.includes("Cancun")) {
      country = "Mexico";
      if (!city) city = "Cancún";
    } else if (rowText.includes("France") || rowText.includes("Cannes")) {
      country = "France";
      if (!city) city = "Cannes";
    } else if (rowText.includes("Canada")) {
      country = "Canada";
    }

    // Get tour name from tour ID in URL
    let tourName = `${year} Tour`;
    const tidMatch = href.match(/tid=(\d+)/);
    if (tidMatch) {
      const tid = tidMatch[1];
      if (tid === "8183") tourName = "Misc 2025";
      else if (tid === "8185") tourName = "Summer 2025";
      else if (tid === "8186") tourName = "Guesting 2025";
    }

    shows.push({
      originalId: showId,
      date,
      venueName,
      city,
      state,
      country,
      tourYear: year,
      tourName,
      venueId,
    });
  });

  console.log(`  Found ${shows.length} shows for ${year}`);
  return shows;
}

async function main() {
  console.log("Scraping 2025/2026 shows with fixed date parsing...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Scrape both years
    const shows2025 = await scrapeYearPage(page, 2025);
    await delay(2000);
    const shows2026 = await scrapeYearPage(page, 2026);

    // Combine and sort
    const allShows = [...shows2025, ...shows2026].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Save results
    const output = {
      scrapedAt: new Date().toISOString(),
      source: BASE_URL,
      total: allShows.length,
      shows: allShows,
    };

    const outputPath = join(OUTPUT_DIR, "shows-2025-2026-corrected.json");
    writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

    console.log(`\nSaved ${allShows.length} shows to ${outputPath}`);

    // Print all shows
    console.log("\n2025 Shows:");
    shows2025.forEach(s => {
      console.log(`  ${s.date} - ${s.venueName}, ${s.city || "Unknown"}, ${s.state || s.country}`);
    });

    console.log("\n2026 Shows:");
    shows2026.forEach(s => {
      console.log(`  ${s.date} - ${s.venueName}, ${s.city || "Unknown"}, ${s.state || s.country}`);
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
