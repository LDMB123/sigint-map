import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { ScrapedVenue } from "../types.js";
import { randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Get all venue URLs from the venues index page
async function getVenueUrls(page: Page): Promise<string[]> {
  console.log("Fetching venue URLs...");

  await page.goto(`${BASE_URL}/VenueStats.aspx`, { waitUntil: "networkidle" });
  const html = await page.content();
  const $ = cheerio.load(html);

  const venueUrls: string[] = [];

  // Find all venue links
  $("a[href*='VenueStats.aspx'][href*='vid=']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;
      if (!venueUrls.includes(fullUrl)) {
        venueUrls.push(fullUrl);
      }
    }
  });

  console.log(`Found ${venueUrls.length} venues`);
  return venueUrls;
}

// Parse a single venue page
async function parseVenuePage(page: Page, venueUrl: string): Promise<ScrapedVenue | null> {
  try {
    let html = getCachedHtml(venueUrl);

    if (!html) {
      await page.goto(venueUrl, { waitUntil: "networkidle" });
      html = await page.content();
      cacheHtml(venueUrl, html);
    }

    const $ = cheerio.load(html);

    const vidMatch = venueUrl.match(/vid=(\d+)/);
    const originalId = vidMatch ? vidMatch[1] : undefined;

    // The DMB Almanac site doesn't use semantic headers for venue info
    // Get all text and parse the first meaningful lines
    const bodyText = $("body").text();
    const lines = bodyText.split("\n").map(l => normalizeWhitespace(l)).filter(l => l.length > 0);

    // Find venue name and location - they appear after the navigation items
    // Look for pattern: "Venue Name" followed by "City, ST" or "City, Country"
    let name = "";
    let city = "";
    let state = "";
    let country = "USA";

    // Search through lines looking for location pattern (City, ST or City, Country)
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];

      // Look for US location format: City, ST (2-letter state code)
      const usMatch = line.match(/^([A-Za-z\s\.\-\']+),\s*([A-Z]{2})$/);
      if (usMatch) {
        city = usMatch[1].trim();
        state = usMatch[2];
        // Venue name is usually the line before the location
        if (i > 0 && lines[i - 1].length > 2) {
          name = lines[i - 1];
        }
        break;
      }

      // Look for international format: City, Country
      const intlMatch = line.match(/^([A-Za-z\s\.\-\']+),\s*(GBR|FRA|CAN|MEX|GER|AUS|JPN|BRA|ITA|ESP|[A-Z]{3,})$/i);
      if (intlMatch) {
        city = intlMatch[1].trim();
        country = intlMatch[2].toUpperCase();
        state = "";
        if (i > 0 && lines[i - 1].length > 2) {
          name = lines[i - 1];
        }
        break;
      }
    }

    // If still no name, try to find it in page content after specific markers
    if (!name) {
      // Look for text that might be a venue name - usually appears after navigation
      const navMarkers = ["Search", "Lyrics", "Tours", "Guests", "Venues"];
      let foundNav = false;
      for (const line of lines) {
        if (navMarkers.some(marker => line.includes(marker))) {
          foundNav = true;
          continue;
        }
        if (foundNav && line.length > 3 && !line.match(/^\d/) && !line.includes("@")) {
          name = line;
          break;
        }
      }
    }

    if (!name) return null;

    // Parse venue type from page text
    let venueType: string | undefined;
    const typeMatch = bodyText.match(/(amphitheater|amphitheatre|arena|stadium|theater|theatre|club|festival|outdoor|coliseum|pavilion)/i);
    if (typeMatch) {
      venueType = typeMatch[1].toLowerCase();
    }

    // Count shows from the table rows (each show date is a data point)
    let totalShows: number | undefined;
    const showDates = $("a[href*='TourShowSet.aspx'][href*='id=']").length;
    if (showDates > 0) {
      totalShows = showDates;
    }

    return {
      originalId,
      name,
      city,
      state,
      country,
      venueType,
      totalShows,
    };
  } catch (error) {
    console.error(`Error parsing venue ${venueUrl}:`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllVenues(): Promise<ScrapedVenue[]> {
  console.log("Starting venue scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const checkpoint = loadCheckpoint<{
      completedUrls: string[];
      venues: ScrapedVenue[];
    }>("venues");

    const completedUrls = new Set(checkpoint?.completedUrls || []);
    const allVenues: ScrapedVenue[] = checkpoint?.venues || [];

    const venueUrls = await getVenueUrls(page);
    const remainingUrls = venueUrls.filter((url) => !completedUrls.has(url));

    console.log(`${remainingUrls.length} venues remaining to scrape`);

    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000,
    });

    let processed = 0;
    const total = remainingUrls.length;

    for (const venueUrl of remainingUrls) {
      await queue.add(async () => {
        const venue = await parseVenuePage(page, venueUrl);
        if (venue) {
          allVenues.push(venue);
          completedUrls.add(venueUrl);
          console.log(`  [${++processed}/${total}] ${venue.name}`);
        }
        await randomDelay(1000, 3000);
      });

      if (processed % 50 === 0 && processed > 0) {
        saveCheckpoint("venues", {
          completedUrls: Array.from(completedUrls),
          venues: allVenues,
        });
      }
    }

    await queue.onIdle();
    return allVenues;
  } finally {
    await browser.close();
  }
}

// Save venues to JSON file
export function saveVenues(venues: ScrapedVenue[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: venues.length,
    venues,
  };

  const filepath = join(OUTPUT_DIR, "venues.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${venues.length} venues to ${filepath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllVenues()
    .then((venues) => {
      saveVenues(venues);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
