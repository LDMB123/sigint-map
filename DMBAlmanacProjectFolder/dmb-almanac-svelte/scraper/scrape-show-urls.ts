/**
 * Script to scrape all show URLs from DMBAlmanac tour pages
 * This creates show-urls.json with all show links for batch processing
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { delay } from "./src/utils/rate-limit.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = "./output";

interface ShowUrl {
  id: string;
  url: string;
  year: number;
}

async function getShowUrlsForYear(
  page: any,
  year: number
): Promise<ShowUrl[]> {
  console.log(`Fetching show URLs for ${year}...`);

  const url = `${BASE_URL}/TourShow.aspx?where=${year}`;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    console.error(`Failed to load ${url}:`, error);
    return [];
  }

  const html = await page.content();
  const $ = cheerio.load(html);

  const showUrls: ShowUrl[] = [];

  // Find show links - look for links to individual show pages with 'id=' parameter
  $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("id=")) {
      // Extract show ID
      const idMatch = href.match(/id=(\d+)/);
      if (!idMatch) return;

      const showId = idMatch[1];

      // Build full URL properly
      let fullUrl = href;
      if (!href.startsWith("http")) {
        if (href.startsWith("./")) {
          fullUrl = `${BASE_URL}/${href.slice(2)}`;
        } else if (href.startsWith("/")) {
          fullUrl = `${BASE_URL}${href}`;
        } else {
          fullUrl = `${BASE_URL}/${href}`;
        }
      }

      // Avoid duplicates
      if (!showUrls.find((s) => s.id === showId)) {
        showUrls.push({
          id: showId,
          url: fullUrl,
          year,
        });
      }
    }
  });

  console.log(`  Found ${showUrls.length} shows for ${year}`);
  return showUrls;
}

async function scrapeAllShowUrls(): Promise<void> {
  console.log("Starting show URL scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to be polite
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const allShowUrls: ShowUrl[] = [];
    const currentYear = new Date().getFullYear();

    // DMB has toured from 1991 to present
    for (let year = 1991; year <= currentYear; year++) {
      const yearUrls = await getShowUrlsForYear(page, year);
      allShowUrls.push(...yearUrls);

      console.log(`Progress: ${allShowUrls.length} total shows`);

      // Be respectful - delay between years
      if (year < currentYear) {
        await delay(2000);
      }
    }

    // Save to JSON file
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const output = {
      scrapedAt: new Date().toISOString(),
      source: BASE_URL,
      totalShows: allShowUrls.length,
      showUrls: allShowUrls,
    };

    const filepath = join(OUTPUT_DIR, "show-urls.json");
    writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");

    console.log(`\nSaved ${allShowUrls.length} show URLs to ${filepath}`);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeAllShowUrls()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Scraper failed:", error);
    process.exit(1);
  });
