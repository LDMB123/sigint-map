/**
 * Script to fix 2025 show dates by re-scraping from DMBAlmanac.com
 * The original scraper had a bug with date parsing
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = "./output";

interface ShowDate {
  originalId: string;
  date: string;
  venueName: string;
  city: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeAllShowsFromTourPage(page: any, year: number): Promise<ShowDate[]> {
  console.log(`Fetching all ${year} shows from tour page...`);

  // First get the tour list for the year
  await page.goto(`${BASE_URL}/TourShow.aspx?where=${year}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  let html = await page.content();
  let $ = cheerio.load(html);

  // Find all tour info links
  const tourLinks: string[] = [];
  $("a[href*='TourShowInfo.aspx']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("tid=")) {
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href.replace(/^\.\//, "")}`;
      if (!tourLinks.includes(fullUrl)) {
        tourLinks.push(fullUrl);
      }
    }
  });

  console.log(`Found ${tourLinks.length} tour pages`);

  const allShows: ShowDate[] = [];

  for (const tourUrl of tourLinks) {
    console.log(`Fetching: ${tourUrl}`);

    try {
      await page.goto(tourUrl, { waitUntil: "networkidle", timeout: 30000 });
      html = await page.content();
      $ = cheerio.load(html);

      // Find all show rows - they typically have date, venue info
      // Look for links to individual shows
      $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
        const $link = $(el);
        const href = $link.attr("href") || "";
        const idMatch = href.match(/id=(\d+)/);

        if (!idMatch) return;

        const showId = idMatch[1];

        // Get the row context to find date and venue
        const $row = $link.closest("tr");
        const rowText = $row.text();

        // Try to find date pattern (MM.DD.YY or MM.DD.YYYY)
        const dateMatch = rowText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);

        if (dateMatch) {
          const month = dateMatch[1].padStart(2, "0");
          const day = dateMatch[2].padStart(2, "0");
          let yearStr = dateMatch[3];
          if (yearStr.length === 2) {
            yearStr = `20${yearStr}`;
          }

          const date = `${yearStr}-${month}-${day}`;

          // Get venue from link text or nearby text
          const linkText = $link.text().trim();

          // Only add if we got a valid date and haven't seen this show
          if (!allShows.find(s => s.originalId === showId)) {
            allShows.push({
              originalId: showId,
              date,
              venueName: linkText || "Unknown",
              city: "",
            });
          }
        }
      });

      await delay(1500);
    } catch (error) {
      console.error(`Failed to fetch ${tourUrl}:`, error);
    }
  }

  return allShows;
}

async function scrapeShowDetails(page: any, showId: string): Promise<ShowDate | null> {
  const url = `${BASE_URL}/TourShowSet.aspx?id=${showId}`;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    // Look for date in page header - format is typically MM.DD.YYYY
    let date = "";

    // Check the page title or header for date
    const pageTitle = $("title").text();
    const headerText = $("h1, h2, .header").first().text();
    const allText = pageTitle + " " + headerText;

    // Also check for date in navigation or breadcrumbs
    const navText = $(".nav, .breadcrumb, .setlist-header").text();

    const combinedText = allText + " " + navText;
    const dateMatch = combinedText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);

    if (dateMatch) {
      const month = dateMatch[1].padStart(2, "0");
      const day = dateMatch[2].padStart(2, "0");
      let yearStr = dateMatch[3];
      if (yearStr.length === 2) {
        yearStr = `20${yearStr}`;
      }
      date = `${yearStr}-${month}-${day}`;
    }

    // Get venue info
    let venueName = "";
    let city = "";

    // Look for venue in various places
    $("a[href*='VenueStats.aspx']").each((_, el) => {
      if (!venueName) {
        venueName = $(el).text().trim();
      }
    });

    // Look for city in header or nearby text
    const venueText = $("h2").text();
    const cityMatch = venueText.match(/,\s*([^,]+),\s*(\w{2})/);
    if (cityMatch) {
      city = cityMatch[1].trim();
    }

    return {
      originalId: showId,
      date,
      venueName,
      city,
    };
  } catch (error) {
    console.error(`Failed to scrape show ${showId}:`, error);
    return null;
  }
}

async function main() {
  console.log("Fixing 2025 show dates...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Get shows from tour pages
    const shows2025 = await scrapeAllShowsFromTourPage(page, 2025);
    console.log(`\nFound ${shows2025.length} shows for 2025`);

    // For shows with missing details, scrape individually
    const showsNeedingDetails = shows2025.filter(s => !s.date || s.date.includes("NaN"));

    console.log(`\n${showsNeedingDetails.length} shows need detailed scraping`);

    for (let i = 0; i < showsNeedingDetails.length; i++) {
      const show = showsNeedingDetails[i];
      console.log(`Scraping details for show ${show.originalId} (${i + 1}/${showsNeedingDetails.length})...`);

      const details = await scrapeShowDetails(page, show.originalId);
      if (details && details.date) {
        show.date = details.date;
        show.venueName = details.venueName || show.venueName;
        show.city = details.city || show.city;
      }

      await delay(1500);
    }

    // Also get 2026 shows
    const shows2026 = await scrapeAllShowsFromTourPage(page, 2026);
    console.log(`\nFound ${shows2026.length} shows for 2026`);

    // Save results
    const output = {
      scrapedAt: new Date().toISOString(),
      shows2025: shows2025.filter(s => s.date && !s.date.includes("NaN")),
      shows2026: shows2026.filter(s => s.date && !s.date.includes("NaN")),
    };

    writeFileSync(
      join(OUTPUT_DIR, "fixed-dates-2025-2026.json"),
      JSON.stringify(output, null, 2),
      "utf-8"
    );

    console.log(`\nSaved ${output.shows2025.length} valid 2025 shows`);
    console.log(`Saved ${output.shows2026.length} valid 2026 shows`);

    // Print sample
    console.log("\n2025 shows:");
    output.shows2025.slice(0, 10).forEach(s => {
      console.log(`  ${s.date} - ${s.venueName}`);
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
