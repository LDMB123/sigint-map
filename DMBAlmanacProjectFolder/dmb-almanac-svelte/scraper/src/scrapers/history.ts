import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { HistoryDay, HistoryDayShow, HistoryOutput } from "../types.js";
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

/**
 * Generate all 366 calendar days (including Feb 29 for leap years)
 */
function generateAllCalendarDays(): { month: number; day: number }[] {
  const days: { month: number; day: number }[] = [];
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Include leap day

  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= daysInMonth[month - 1]; day++) {
      days.push({ month, day });
    }
  }

  return days;
}

/**
 * Format calendar date as MM-DD for easy lookup
 */
function formatCalendarDate(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Scrape a single "This Day in History" page
 */
async function scrapeHistoryDay(
  page: Page,
  month: number,
  day: number
): Promise<HistoryDay | null> {
  const url = `${BASE_URL}/ThisDayinHistory.aspx?month=${month}&day=${day}`;
  const calendarDate = formatCalendarDate(month, day);

  console.log(`Scraping ${calendarDate}...`);

  try {
    // Check cache first
    let html = getCachedHtml(url);

    if (!html) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    }

    const $ = cheerio.load(html);
    const shows: HistoryDayShow[] = [];

    // Strategy 1: Look for show links (TourShowSet.aspx with id= parameter)
    $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const showText = normalizeWhitespace($(el).text());

      // Extract show ID
      const idMatch = href.match(/id=(\d+)/);
      if (!idMatch) return;

      const originalId = idMatch[1];

      // Parse show text - usually format like "03.14.1991 - Venue Name, City, ST"
      // or "March 14, 1991 - Venue Name - City, ST"
      let showDate = "";
      let year = 0;
      let venueName = "";
      let city = "";
      let state = "";
      let country = "USA";

      // Try to find date in the link text or nearby
      // Format can be MM.DD.YY or MM.DD.YYYY
      const dateMatch4 = showText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      const dateMatch2 = showText.match(/(\d{2})\.(\d{2})\.(\d{2})/);

      if (dateMatch4) {
        const [, m, d, y] = dateMatch4;
        showDate = `${y}-${m}-${d}`;
        year = parseInt(y, 10);
      } else if (dateMatch2) {
        const [, m, d, yy] = dateMatch2;
        // Convert 2-digit year to 4-digit (91-99 = 1991-1999, 00-30 = 2000-2030)
        const yyNum = parseInt(yy, 10);
        const fullYear = yyNum >= 91 ? 1900 + yyNum : 2000 + yyNum;
        showDate = `${fullYear}-${m}-${d}`;
        year = fullYear;
      }

      // Try to parse venue and location from text
      // Common patterns:
      // "03.14.1991 - Venue Name, City, ST"
      // "Venue Name - City, ST, Country"
      const parts = showText.split(" - ");
      if (parts.length >= 2) {
        // First part is usually date, second is venue
        venueName = normalizeWhitespace(parts[1]);

        // Look for location in remaining parts
        if (parts.length >= 3) {
          const locationPart = parts.slice(2).join(", ");
          const locationMatch = locationPart.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
          if (locationMatch) {
            city = locationMatch[1].trim();
            state = locationMatch[2].trim();
            country = locationMatch[3]?.trim() || "USA";
          }
        }
      }

      // Try to find venue and location in parent or sibling elements
      if (!venueName || !city) {
        const parent = $(el).parent();
        const fullText = parent.text();

        // Look for venue link (onclick with VenueStats)
        const venueLink = parent.find("a").filter((i, link) => {
          const onclick = $(link).attr("onclick") || "";
          return onclick.includes("VenueStats.aspx");
        });

        if (venueLink.length) {
          venueName = normalizeWhitespace(venueLink.text());

          // Extract location from text after venue
          const afterVenue = fullText.split(venueName)[1] || "";
          const locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
          if (locationMatch) {
            city = locationMatch[1].trim();
            state = locationMatch[2].trim();
            country = locationMatch[3]?.trim() || "USA";
          }
        }
      }

      // If we still don't have a date, try to construct from month/day and year in text
      if (!showDate && year === 0) {
        const yearMatch = showText.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = parseInt(yearMatch[0], 10);
          showDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
      }

      // Only add if we have minimum required data AND valid year (DMB started in 1991)
      if (originalId && showDate && year >= 1991 && year <= 2030) {
        shows.push({
          originalId,
          showDate,
          year,
          venueName: venueName || "Unknown Venue",
          city: city || "Unknown City",
          state: state || undefined,
          country: country || "USA",
          notes: undefined,
        });
      }
    });

    // Strategy 2: Look for table rows or list items with show data
    // Some pages might use different HTML structure
    $("tr, li").each((_, el) => {
      const $el = $(el);
      const text = normalizeWhitespace($el.text());

      // Look for date pattern and show link
      const showLink = $el.find("a[href*='TourShowSet.aspx'][href*='id=']");
      if (showLink.length === 0) return;

      const href = showLink.attr("href") || "";
      const idMatch = href.match(/id=(\d+)/);
      if (!idMatch) return;

      const originalId = idMatch[1];

      // Check if we already have this show
      if (shows.find((s) => s.originalId === originalId)) return;

      // Try to extract data from row/list text
      // Format can be MM.DD.YY or MM.DD.YYYY
      const dateMatch4 = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      const dateMatch2 = text.match(/(\d{2})\.(\d{2})\.(\d{2})/);
      let showDate = "";
      let year = 0;

      if (dateMatch4) {
        const [, m, d, y] = dateMatch4;
        showDate = `${y}-${m}-${d}`;
        year = parseInt(y, 10);
      } else if (dateMatch2) {
        const [, m, d, yy] = dateMatch2;
        // Convert 2-digit year to 4-digit (91-99 = 1991-1999, 00-30 = 2000-2030)
        const yyNum = parseInt(yy, 10);
        const fullYear = yyNum >= 91 ? 1900 + yyNum : 2000 + yyNum;
        showDate = `${fullYear}-${m}-${d}`;
        year = fullYear;
      } else {
        // Fallback: construct from month/day and find year
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = parseInt(yearMatch[0], 10);
          showDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
      }

      if (!showDate || year === 0) return;

      // Try to extract venue and location
      let venueName = "";
      let city = "";
      let state = "";
      let country = "USA";

      // Look for venue link
      const venueLink = $el.find("a").filter((i, link) => {
        const onclick = $(link).attr("onclick") || "";
        return onclick.includes("VenueStats.aspx");
      });

      if (venueLink.length) {
        venueName = normalizeWhitespace(venueLink.text());

        // Extract location from surrounding text
        const afterVenue = text.split(venueName)[1] || "";
        const locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
        if (locationMatch) {
          city = locationMatch[1].trim();
          state = locationMatch[2].trim();
          country = locationMatch[3]?.trim() || "USA";
        }
      }

      // Only add if valid year (DMB started in 1991)
      if (year >= 1991 && year <= 2030) {
        shows.push({
          originalId,
          showDate,
          year,
          venueName: venueName || "Unknown Venue",
          city: city || "Unknown City",
        state: state || undefined,
        country: country || "USA",
        notes: undefined,
        });
      }
    });

    // Sort shows by year ascending
    shows.sort((a, b) => a.year - b.year);

    // Calculate stats
    const years = shows.map((s) => s.year);
    const uniqueYears = new Set(years);
    const firstYear = years.length > 0 ? Math.min(...years) : undefined;
    const lastYear = years.length > 0 ? Math.max(...years) : undefined;
    const currentYear = new Date().getFullYear();
    const yearsSinceLastPlayed = lastYear ? currentYear - lastYear : undefined;

    const historyDay: HistoryDay = {
      month,
      day,
      calendarDate,
      shows,
      totalYears: uniqueYears.size,
      firstYear,
      lastYear,
      yearsSinceLastPlayed,
    };

    console.log(`  Found ${shows.length} shows on ${calendarDate} (${uniqueYears.size} unique years)`);
    return historyDay;
  } catch (error) {
    console.error(`Error scraping ${calendarDate}:`, error);
    return null;
  }
}

/**
 * Main scraper function - scrapes all 366 calendar days
 */
export async function scrapeAllHistoryDays(): Promise<HistoryDay[]> {
  console.log("Starting This Day in History scraper...");
  console.log("Will scrape all 366 calendar days (Jan 1 - Dec 31, including Feb 29)");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to be polite
  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const allDays = generateAllCalendarDays();
    console.log(`Generated ${allDays.length} calendar days to scrape`);

    // Check for existing checkpoint
    const checkpoint = loadCheckpoint<{
      completedDays: string[]; // Format: "MM-DD"
      days: HistoryDay[];
    }>("history");

    const completedDays = checkpoint?.completedDays || [];
    const completedSet = new Set(completedDays);
    const historyDays: HistoryDay[] = checkpoint?.days || [];

    console.log(`Resuming: ${completedDays.length} days already completed`);

    // Rate limiter queue - be respectful
    const queue = new PQueue({
      concurrency: 1, // Sequential only
      intervalCap: 5,
      interval: 10000, // 5 requests per 10 seconds
    });

    // Process each day
    for (const { month, day } of allDays) {
      const calendarDate = formatCalendarDate(month, day);

      if (completedSet.has(calendarDate)) {
        console.log(`Skipping ${calendarDate} (already completed)`);
        continue;
      }

      await queue.add(async () => {
        const historyDay = await scrapeHistoryDay(page, month, day);
        if (historyDay) {
          historyDays.push(historyDay);
          completedDays.push(calendarDate);
          completedSet.add(calendarDate);
        }

        // Random delay between requests
        await randomDelay(2000, 4000);
      });

      // Save checkpoint every 20 days
      if (completedDays.length % 20 === 0) {
        await queue.onIdle();
        saveCheckpoint("history", { completedDays, days: historyDays });
        console.log(`Checkpoint: ${completedDays.length}/366 days completed`);
      }
    }

    // Wait for queue to finish
    await queue.onIdle();

    // Final checkpoint
    saveCheckpoint("history", { completedDays, days: historyDays });

    console.log(`\nCompleted: Scraped ${historyDays.length} calendar days`);
    return historyDays;
  } finally {
    await browser.close();
  }
}

/**
 * Save history data to JSON file
 */
export function saveHistory(days: HistoryDay[]): void {
  const totalShows = days.reduce((sum, day) => sum + day.shows.length, 0);
  const daysWithShows = days.filter((day) => day.shows.length > 0).length;

  const output: HistoryOutput = {
    scrapedAt: new Date().toISOString(),
    source: `${BASE_URL}/ThisDayinHistory.aspx`,
    totalItems: days.length,
    days,
  };

  const filepath = join(OUTPUT_DIR, "history.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\nSaved history to ${filepath}`);
  console.log(`  Total calendar days: ${days.length}`);
  console.log(`  Days with shows: ${daysWithShows}`);
  console.log(`  Total shows: ${totalShows}`);
}

/**
 * Run if called directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllHistoryDays()
    .then((days) => {
      saveHistory(days);
      console.log("\nDone!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
