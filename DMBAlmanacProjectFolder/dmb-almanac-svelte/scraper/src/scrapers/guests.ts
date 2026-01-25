import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { ScrapedGuest } from "../types.js";
import { randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace, parseInstruments } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Get all guest URLs from the guests index page
async function getGuestUrls(page: Page): Promise<string[]> {
  console.log("Fetching guest URLs...");

  await page.goto(`${BASE_URL}/GuestStats.aspx`, { waitUntil: "networkidle" });
  const html = await page.content();
  const $ = cheerio.load(html);

  const guestUrls: string[] = [];

  $("a[href*='GuestStats.aspx'][href*='gid=']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;
      if (!guestUrls.includes(fullUrl)) {
        guestUrls.push(fullUrl);
      }
    }
  });

  console.log(`Found ${guestUrls.length} guests`);
  return guestUrls;
}

// Parse a single guest page
async function parseGuestPage(page: Page, guestUrl: string): Promise<ScrapedGuest | null> {
  try {
    let html = getCachedHtml(guestUrl);

    if (!html) {
      await page.goto(guestUrl, { waitUntil: "networkidle" });
      html = await page.content();
      cacheHtml(guestUrl, html);
    }

    const $ = cheerio.load(html);

    const gidMatch = guestUrl.match(/gid=(\d+)/);
    const originalId = gidMatch ? gidMatch[1] : undefined;

    // Parse guest name
    const name = normalizeWhitespace($("h1, .guest-name").first().text());
    if (!name) return null;

    // Parse instruments
    let instruments: string[] = [];
    const instrumentText = $(".instruments, .guest-instruments").text();
    if (instrumentText) {
      instruments = parseInstruments(instrumentText);
    } else {
      // Try to find in page text
      const pageText = $("body").text();
      const instrMatch = pageText.match(/instruments?[:\s]+([^.]+)/i);
      if (instrMatch) {
        instruments = parseInstruments(instrMatch[1]);
      }
    }

    // Parse total appearances
    let totalAppearances: number | undefined;
    const appearMatch = $("body").text().match(/(\d+)\s+(?:appearances?|shows?)/i);
    if (appearMatch) {
      totalAppearances = parseInt(appearMatch[1], 10);
    }

    return {
      originalId,
      name,
      instruments,
      totalAppearances,
    };
  } catch (error) {
    console.error(`Error parsing guest ${guestUrl}:`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllGuests(): Promise<ScrapedGuest[]> {
  console.log("Starting guest scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const checkpoint = loadCheckpoint<{
      completedUrls: string[];
      guests: ScrapedGuest[];
    }>("guests");

    const completedUrls = new Set(checkpoint?.completedUrls || []);
    const allGuests: ScrapedGuest[] = checkpoint?.guests || [];

    const guestUrls = await getGuestUrls(page);
    const remainingUrls = guestUrls.filter((url) => !completedUrls.has(url));

    console.log(`${remainingUrls.length} guests remaining to scrape`);

    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000,
    });

    let processed = 0;
    const total = remainingUrls.length;

    for (const guestUrl of remainingUrls) {
      await queue.add(async () => {
        const guest = await parseGuestPage(page, guestUrl);
        if (guest) {
          allGuests.push(guest);
          completedUrls.add(guestUrl);
          console.log(`  [${++processed}/${total}] ${guest.name}`);
        }
        await randomDelay(1000, 3000);
      });

      if (processed % 50 === 0 && processed > 0) {
        saveCheckpoint("guests", {
          completedUrls: Array.from(completedUrls),
          guests: allGuests,
        });
      }
    }

    await queue.onIdle();
    return allGuests;
  } finally {
    await browser.close();
  }
}

// Save guests to JSON file
export function saveGuests(guests: ScrapedGuest[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: guests.length,
    guests,
  };

  const filepath = join(OUTPUT_DIR, "guests.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${guests.length} guests to ${filepath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllGuests()
    .then((guests) => {
      saveGuests(guests);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
