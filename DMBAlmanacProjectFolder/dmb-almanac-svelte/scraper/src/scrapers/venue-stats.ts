import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { ScrapedVenueStats } from "../types.js";
import { randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace, parseDate } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

/**
 * Get all venue IDs from cached HTML files
 * Since the venue index page doesn't exist or isn't useful,
 * we extract venue IDs from already-scraped show pages
 */
async function getVenueIds(page: Page): Promise<string[]> {
  console.log("Extracting venue IDs from cached show pages...");

  const venueIds = new Set<string>();

  // Try to load from cached HTML files
  const fs = await import("fs");
  const path = await import("path");
  const cacheDir = path.join(process.cwd(), "cache");

  try {
    const files = fs.readdirSync(cacheDir);

    for (const file of files) {
      // Look for any cached HTML that might contain venue links
      if (file.endsWith(".html")) {
        const filePath = path.join(cacheDir, file);
        const html = fs.readFileSync(filePath, "utf-8");
        const $ = cheerio.load(html);

        // Find all venue links with vid parameter
        $("a[href*='VenueStats.aspx'][href*='vid='], a[onclick*='VenueStats'][onclick*='vid=']").each((_, el) => {
          const href = $(el).attr("href") || $(el).attr("onclick") || "";
          const vidMatch = href.match(/vid=(\d+)/);
          if (vidMatch) {
            venueIds.add(vidMatch[1]);
          }
        });
      }
    }

    console.log(`Found ${venueIds.size} unique venue IDs from cached files`);
  } catch (error) {
    console.error("Error reading cached files:", error);
  }

  // If we still have no venue IDs, try a few common venue pages
  if (venueIds.size === 0) {
    console.log("No venue IDs found in cache, trying to fetch from tour pages...");

    // Try fetching a recent year's tour page to get venue IDs
    try {
      const url = `${BASE_URL}/TourShow.aspx?where=2024`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const html = await page.content();
      const $ = cheerio.load(html);

      $("a[href*='VenueStats.aspx'][href*='vid=']").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const vidMatch = href.match(/vid=(\d+)/);
          if (vidMatch) {
            venueIds.add(vidMatch[1]);
          }
        }
      });

      console.log(`Found ${venueIds.size} venue IDs from 2024 tour page`);
    } catch (error) {
      console.error("Failed to fetch venue IDs from tour page:", error);
    }
  }

  return Array.from(venueIds).sort();
}

// Parse show history from the venue page
function parseShowHistory($: cheerio.CheerioAPI, venueId: string): import("../types.js").VenueShow[] {
  const shows: import("../types.js").VenueShow[] = [];

  // Find the main table with show date links
  $("tr").each((_, row) => {
    const $row = $(row);
    const showLink = $row.find("a[href*='TourShowSet.aspx'], a[href*='ShowSetlist.aspx']").first();

    if (showLink.length > 0) {
      const href = showLink.attr("href") || "";
      const showIdMatch = href.match(/id=(\d+)/);

      if (showIdMatch) {
        const showId = showIdMatch[1];
        const dateText = normalizeWhitespace(showLink.text());

        let date = "";
        let year = 0;

        // Parse date (e.g., 7/27/94 or 07.27.1994)
        if (dateText.match(/(\d{1,2})[\.\/](\d{1,2})/)) {
          try {
            date = parseDate(dateText);
            year = parseInt(date.split("-")[0], 10);
          } catch (e) { }
        }

        // Get song count
        const cells = $row.find("td");
        let songCount = 0;

        cells.each((_, cell) => {
          const txt = $(cell).text().trim();
          if (/^\d+$/.test(txt)) {
            songCount = parseInt(txt, 10);
          }
        });

        const hasRelease = $row.find("img[src*='album'], img[src*='cd']").length > 0;

        let notes = "";
        const potentialNotes = cells.last().text().trim();
        if (!/^\d+$/.test(potentialNotes)) {
          notes = potentialNotes;
        }

        if (showId && date) {
          shows.push({
            showId,
            date,
            year,
            songCount,
            notes: notes || undefined,
            isOnRelease: hasRelease
          });
        }
      }
    }
  });

  return shows.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parse a single venue statistics page to extract enhanced data
 */
async function parseVenueStatsPage(
  page: Page,
  venueId: string
): Promise<ScrapedVenueStats | null> {
  const venueUrl = `${BASE_URL}/VenueStats.aspx?vid=${venueId}`;

  try {
    // Check cache first
    let html = getCachedHtml(venueUrl);

    if (!html) {
      await page.goto(venueUrl, { waitUntil: "networkidle" });
      html = await page.content();
      cacheHtml(venueUrl, html);
    }

    const $ = cheerio.load(html);

    // Extract venue name and location from the page header
    // Venue name is in a span with class="newsitem" and font-size:20px
    let venueName = "";
    let city = "";
    let state = "";
    let country = "USA";

    // Find venue name: <span class="newsitem" style="font-size:20px;">Bourbon Street Ballroom</span>
    const venueNameEl = $("span.newsitem[style*='font-size:20px']").first();
    if (venueNameEl.length > 0) {
      venueName = normalizeWhitespace(venueNameEl.text());
    }

    // Find location: <span class="news" style="font-size:12px;font-weight:bold;">Baltimore, MD</span>
    // This typically comes after the venue name
    if (venueName) {
      // Get all spans with class "news" and find the one that looks like a location (City, State)
      $("span.news").each((_, el) => {
        const text = normalizeWhitespace($(el).text());
        // Check for US format: City, ST
        const usMatch = text.match(/^([A-Za-z\s\.\-\']+),\s*([A-Z]{2})$/);
        if (usMatch && !city) {
          city = usMatch[1].trim();
          state = usMatch[2];
          country = "USA";
        }

        // Check for international format: City, Country code
        const intlMatch = text.match(
          /^([A-Za-z\s\.\-\']+),\s*(GBR|FRA|CAN|MEX|GER|AUS|JPN|BRA|ITA|ESP|[A-Z]{3,})$/i
        );
        if (intlMatch && !city) {
          city = intlMatch[1].trim();
          country = intlMatch[2].toUpperCase();
          state = "";
        }
      });
    }

    if (!venueName) {
      console.warn(`Could not parse venue name for vid=${venueId}`);
      return null;
    }

    if (!city) {
      console.warn(`Could not parse city for venue ${venueName} (vid=${venueId})`);
      return null;
    }

    // Parse first and last show dates and total shows count
    let firstShowDate: string | undefined;
    let lastShowDate: string | undefined;
    let totalShows = 0;

    // Extract total shows from "Total Gigs:" line
    // Format: "Total Gigs:" followed by a number in a <span class="news">
    const bodyText = $("body").text();
    const gigsMatch = bodyText.match(/Total\s+Gigs:?\s*(\d+)/i);
    if (gigsMatch) {
      totalShows = parseInt(gigsMatch[1], 10);
    }

    // Find all show date links - they appear in href like /TourShowSet.aspx?id=453055343
    // The dates appear as the link text, e.g., "7/27" or "7/27/94"
    const showDates: string[] = [];
    $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
      const dateText = normalizeWhitespace($(el).text());
      // Look for date patterns: "7/27" or "7/27/94" or similar
      if (
        dateText.match(/\d{1,2}\/\d{1,2}/) ||
        dateText.match(/\d{2}\.\d{2}/)
      ) {
        try {
          // The dates might be in short format (7/27), we need context
          // For now, collect them as-is
          showDates.push(dateText);
        } catch (error) {
          // Skip unparseable dates
        }
      }
    });

    // If we found show dates, try to parse them
    if (showDates.length > 0 && totalShows > 0) {
      // Try to extract first and last from the page text looking for specific patterns
      const firstMatch = bodyText.match(/(?:first\s+(?:show|gig|performance)[:\s]+)?(\w+\s+\d{1,2},?\s*\d{4})/i);
      if (firstMatch) {
        try {
          firstShowDate = parseDate(firstMatch[1]);
        } catch (error) {
          // Skip if unparseable
        }
      }

      const lastMatch = bodyText.match(/(?:last\s+(?:show|gig|performance)[:\s]+)?(\w+\s+\d{1,2},?\s*\d{4})/i);
      if (lastMatch) {
        try {
          lastShowDate = parseDate(lastMatch[1]);
        } catch (error) {
          // Skip if unparseable
        }
      }
    }

    // Parse capacity if mentioned in page text
    // Format: "Seating Capacity:" followed by a number in a <span class="news">
    let capacity: number | undefined;
    const capacityMatch = bodyText.match(/Seating\s+Capacity:?\s*(\d+[\,\d]*)/i);
    if (capacityMatch) {
      const capacityStr = capacityMatch[1].replace(/,/g, "");
      capacity = parseInt(capacityStr, 10);
    }

    // Parse alternate names (aka) from "Previous Names:" section
    const akaNames: string[] = [];

    // Look for "Previous Names:" section
    // Extract text from "Previous Names:" until we hit the next label (Seating, Venue Type, Total Gigs, etc.)
    const previousNamesIdx = bodyText.indexOf("Previous Names:");
    if (previousNamesIdx !== -1) {
      const sectionText = bodyText.substring(previousNamesIdx, previousNamesIdx + 300);
      // Match "Hammerjacks" or similar venue names (capitalized words)
      // The pattern is: "Previous Names: <name> (Changed after XXXX)" or similar
      const nameMatches = sectionText.match(/Names:?\s*([A-Z][a-zA-Z\s&\-']+?)[\s\n]*(Changed|Seating|Venue|Total)/);
      if (nameMatches && nameMatches[1]) {
        const cleaned = normalizeWhitespace(nameMatches[1]).trim();
        if (cleaned.length > 3) {
          akaNames.push(cleaned);
        }
      }
    }

    // Also check for "formerly known as" or "previously"
    const formerMatch = bodyText.match(/(?:formerly|previously)\s+(?:known as\s+)?([^\.]+)/i);
    if (formerMatch) {
      const formerName = normalizeWhitespace(formerMatch[1]);
      if (formerName && formerName.length > 3 && !akaNames.includes(formerName)) {
        akaNames.push(formerName);
      }
    }

    // Parse top songs at this venue
    const topSongs: { title: string; playCount: number }[] = [];

    // Look for songs in the main table with class "threedeetable"
    // Songs appear as links with href="/songs/summary.aspx?sid=X"
    // Play count is in adjacent table cells
    $("a[href*='/songs/summary.aspx'][href*='sid=']").each((_, songLink) => {
      const songTitle = normalizeWhitespace($(songLink).text());
      if (!songTitle || songTitle.length === 0) return;

      // Look for the parent row and find the count cell
      let playCount = 1; // Default to 1 if we can't find explicit count
      const $parent = $(songLink).closest("tr");

      if ($parent.length > 0) {
        // In the HTML structure, the count appears in a cell after the song link
        // Look for any cell with just a number
        $parent.find("td").each((_, cell) => {
          const cellText = normalizeWhitespace($(cell).text());
          const countMatch = cellText.match(/^(\d+)$/);
          if (countMatch) {
            playCount = parseInt(countMatch[1], 10);
          }
        });
      }

      // Check if we already have this song
      const existing = topSongs.find((s) => s.title.toLowerCase() === songTitle.toLowerCase());
      if (!existing) {
        topSongs.push({ title: songTitle, playCount });
      }
    });

    // Sort by play count descending
    topSongs.sort((a, b) => b.playCount - a.playCount);
    const top20Songs = topSongs.slice(0, 20);

    // Parse notable performances
    const notablePerformances: string[] = [];

    // Look for "Longest Performance" section
    // Format: "Longest Performance: 07.27.94 - Jimi Thing (10:50)"
    const longestIdx = bodyText.indexOf("Longest Performance:");
    if (longestIdx !== -1) {
      const sectionText = bodyText.substring(longestIdx, longestIdx + 200);
      // Extract the performance info: date - song name (duration)
      // Use [\s\S] to match any character including newlines, but stop at actual content
      const perfMatch = sectionText.match(/Performance:[\s\S]*?(\d{1,2}\.\d{2}\.\d{2,4}.+?\([0-9:]+\))/);
      if (perfMatch) {
        const performance = normalizeWhitespace(perfMatch[1]);
        if (performance && performance.length > 0) {
          notablePerformances.push(performance);
        }
      }
    }

    // Look for release mentions (CD, DVD, etc.) from image tags
    $("img[src*='cd'], img[src*='dvd'], img[src*='cast']").each((_, img) => {
      const $img = $(img);
      const alt = $img.attr("alt") || "";
      if (alt && !notablePerformances.includes(alt)) {
        notablePerformances.push(normalizeWhitespace(alt));
      }
    });

    // Look for "first" or "debut" mentions
    const firstMatches = bodyText.match(/first\s+(?:played?|performance|show|gig)[^\.]{0,100}/gi);
    if (firstMatches) {
      firstMatches.forEach((match) => {
        const cleaned = normalizeWhitespace(match);
        if (cleaned.length > 10 && !notablePerformances.includes(cleaned)) {
          notablePerformances.push(cleaned);
        }
      });
    }

    // Look for "last" mentions
    const lastMatches = bodyText.match(/last\s+(?:played?|performance|show|gig)[^\.]{0,100}/gi);
    if (lastMatches) {
      lastMatches.forEach((match) => {
        const cleaned = normalizeWhitespace(match);
        if (cleaned.length > 10 && !notablePerformances.includes(cleaned)) {
          notablePerformances.push(cleaned);
        }
      });
    }

    // Limit notable performances to avoid clutter
    const limitedNotable = notablePerformances.slice(0, 10);

    // Parse general notes about the venue from the Description section
    let notes: string | undefined;

    // Look for Description section in the HTML
    // Format: "Description The former location of this venue..."
    const descIdx = bodyText.indexOf("Description");
    if (descIdx !== -1) {
      const sectionText = bodyText.substring(descIdx, descIdx + 500);
      // Extract description content: everything after "Description" until next major section
      // Use [\s\S] to match any character including newlines
      const descMatch = sectionText.match(/Description[\s\S]*?(The .+?)(?=Sort|Order|Alphabetically|\n\s*\n|$)/);
      if (descMatch) {
        notes = normalizeWhitespace(descMatch[1]);
        if (notes && notes.length > 10) {
          // Keep it
        } else {
          notes = undefined;
        }
      }
    }

    // Look for specific note paragraphs if we didn't find a description
    if (!notes) {
      $("p").each((_, p) => {
        const text = normalizeWhitespace($(p).text());
        // Look for paragraphs that seem like venue descriptions
        if (
          text.length > 20 &&
          text.length < 500 &&
          (text.toLowerCase().includes("former") ||
            text.toLowerCase().includes("location") ||
            text.toLowerCase().includes("now"))
        ) {
          if (!notes) {
            notes = text;
          }
        }
      });
    }

    const shows = parseShowHistory($, venueId);

    const venueStats: ScrapedVenueStats = {
      originalId: venueId,
      venueName,
      city,
      state,
      country,
      firstShowDate,
      lastShowDate,
      totalShows,
      capacity,
      akaNames,
      topSongs: top20Songs,
      notes,
      notablePerformances: limitedNotable,
      shows,
    };

    return venueStats;
  } catch (error) {
    console.error(`Error parsing venue stats for vid=${venueId}:`, error);
    return null;
  }
}

/**
 * Main scraper function - scrapes all venue statistics pages
 */
export async function scrapeAllVenueStats(): Promise<ScrapedVenueStats[]> {
  console.log("Starting venue statistics scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to be respectful
  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Load checkpoint if exists
    const checkpoint = loadCheckpoint<{
      completedIds: string[];
      venueStats: ScrapedVenueStats[];
    }>("venue-stats");

    const completedIds = new Set(checkpoint?.completedIds || []);
    const allVenueStats: ScrapedVenueStats[] = checkpoint?.venueStats || [];

    // Get all venue IDs
    const venueIds = await getVenueIds(page);

    // Filter out already completed
    const remainingIds = venueIds.filter((id) => !completedIds.has(id));
    console.log(`${remainingIds.length} venues remaining to scrape`);

    // Rate limiter queue - be respectful to dmbalmanac.com
    const queue = new PQueue({
      concurrency: 2, // Max 2 concurrent requests
      intervalCap: 5, // Max 5 requests per interval
      interval: 10000, // 10 second interval
    });

    let processed = 0;
    const total = remainingIds.length;

    // Process each venue
    for (const venueId of remainingIds) {
      await queue.add(async () => {
        const venueStats = await parseVenueStatsPage(page, venueId);
        if (venueStats) {
          allVenueStats.push(venueStats);
          completedIds.add(venueId);
          console.log(
            `  [${++processed}/${total}] ${venueStats.venueName} - ${venueStats.totalShows} shows, ${venueStats.topSongs.length} top songs`
          );
        }
        await randomDelay(1000, 3000);
      });

      // Save checkpoint every 50 venues
      if (processed % 50 === 0 && processed > 0) {
        saveCheckpoint("venue-stats", {
          completedIds: Array.from(completedIds),
          venueStats: allVenueStats,
        });
      }
    }

    // Wait for all to complete
    await queue.onIdle();

    // Final checkpoint
    saveCheckpoint("venue-stats", {
      completedIds: Array.from(completedIds),
      venueStats: allVenueStats,
    });

    return allVenueStats;
  } finally {
    await browser.close();
  }
}

/**
 * Save venue statistics to JSON output file
 */
export function saveVenueStats(venueStats: ScrapedVenueStats[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: venueStats.length,
    venueStats,
  };

  const filepath = join(OUTPUT_DIR, "venue-stats.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${venueStats.length} venue statistics to ${filepath}`);
}

/**
 * Run if called directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllVenueStats()
    .then((venueStats) => {
      saveVenueStats(venueStats);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
