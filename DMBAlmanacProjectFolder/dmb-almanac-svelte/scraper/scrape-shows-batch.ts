/**
 * Batch Show Scraper for DMBAlmanac
 *
 * Processes show URLs from show-urls.json in controlled batches with:
 * - Concurrent requests (2-3 at a time)
 * - Rate limiting (2-3 second delays)
 * - Checkpointing (every 50 shows)
 * - Resume capability
 * - Caching of HTML responses
 */

import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import PQueue from "p-queue";
import {
  ScrapedShow,
  ScrapedSetlistEntry,
  ScrapedGuestAppearance,
  ShowsOutput,
} from "./src/types.js";
import { delay, randomDelay } from "./src/utils/rate-limit.js";
import { cacheHtml, getCachedHtml } from "./src/utils/cache.js";
import { parseDate, normalizeWhitespace } from "./src/utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = "./output";
const CHECKPOINT_FILE = join(OUTPUT_DIR, "checkpoint_shows_batch.json");
const SHOW_URLS_FILE = join(OUTPUT_DIR, "show-urls.json");
const SHOWS_OUTPUT_FILE = join(OUTPUT_DIR, "shows.json");

// Configuration
const BATCH_SIZE = 50; // Checkpoint every 50 shows
const CONCURRENCY = 2; // Max 2 concurrent requests
const REQUESTS_PER_INTERVAL = 5; // Max 5 requests per 10 seconds
const INTERVAL_MS = 10000; // 10 seconds
const MIN_DELAY = 2000; // Min 2 seconds between requests
const MAX_DELAY = 3000; // Max 3 seconds between requests

interface ShowUrl {
  id: string;
  url: string;
  year: number;
}

interface ShowUrlsData {
  scrapedAt: string;
  source: string;
  totalShows: number;
  showUrls: ShowUrl[];
}

interface Checkpoint {
  lastProcessedIndex: number;
  completedIds: string[];
  shows: ScrapedShow[];
  timestamp: string;
  totalProcessed: number;
}

// Load show URLs from JSON file
function loadShowUrls(limit?: number): ShowUrl[] {
  if (!existsSync(SHOW_URLS_FILE)) {
    throw new Error(
      `Show URLs file not found: ${SHOW_URLS_FILE}\nRun scrape-show-urls.ts first to generate this file.`
    );
  }

  const data = JSON.parse(
    readFileSync(SHOW_URLS_FILE, "utf-8")
  ) as ShowUrlsData;

  const urls = data.showUrls;

  if (limit && limit < urls.length) {
    console.log(`Limiting to first ${limit} shows (of ${urls.length} total)`);
    return urls.slice(0, limit);
  }

  return urls;
}

// Load checkpoint if exists
function loadCheckpoint(): Checkpoint | null {
  if (existsSync(CHECKPOINT_FILE)) {
    const data = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));
    console.log(`Loaded checkpoint: ${data.totalProcessed} shows completed`);
    return data;
  }
  return null;
}

// Save checkpoint
function saveCheckpoint(checkpoint: Checkpoint): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), "utf-8");
  console.log(
    `Checkpoint saved: ${checkpoint.totalProcessed} shows (${checkpoint.shows.length} successful)`
  );
}

// Parse a single show page
async function parseShowPage(
  page: Page,
  showUrl: ShowUrl
): Promise<ScrapedShow | null> {
  try {
    // Check cache first
    let html = getCachedHtml(showUrl.url);

    if (!html) {
      await page.goto(showUrl.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      html = await page.content();
      cacheHtml(showUrl.url, html);
    }

    const $ = cheerio.load(html);

    // Extract show ID from URL
    const originalId = showUrl.id;

    // Parse show date from threedeetabheader (format: MM.DD.YYYY)
    let dateStr = "";
    const dateHeaderText = $("td.threedeetabheader").first().text().trim();
    const dotDateMatch = dateHeaderText.match(/(\d{2})\.(\d{2})\.(\d{4})/);

    if (dotDateMatch) {
      const [, month, day, year] = dotDateMatch;
      dateStr = `${year}-${month}-${day}`;
    } else {
      // Fallback: use year from URL context
      dateStr = `${showUrl.year}-01-01`;
    }

    // Parse venue info from .newsitem divs
    let venueName = "";
    let city = "";
    let state = "";
    let country = "USA";

    const newsItems = $(".newsitem");
    if (newsItems.length >= 2) {
      // Second newsitem contains venue and location
      const venueLocationText = newsItems.eq(1).text().trim();
      const lines = venueLocationText.split("\n").map(l => l.trim()).filter(l => l);

      if (lines.length >= 2) {
        venueName = lines[0];
        // Parse "City, ST" format
        const locationParts = lines[1].split(",").map(p => p.trim());
        if (locationParts.length >= 2) {
          city = locationParts[0];
          state = locationParts[1];
          if (locationParts.length >= 3) {
            country = locationParts[2];
          }
        }
      }
    }

    // Extract tour year
    const tourYear = parseInt(dateStr.substring(0, 4), 10);

    // Parse setlist from #SetTable
    const setlist: ScrapedSetlistEntry[] = [];
    let currentSet = "set1";
    let position = 0;
    let setPosition = 0;

    const setTable = $("#SetTable");
    if (setTable.length > 0) {
      setTable.find("tr").each((_, row) => {
        const $row = $(row);

        // Skip header row (contains .setcolumn class)
        if ($row.find(".setcolumn").length > 0) return;

        // Check if this is a song row (has .setheadercell)
        const cells = $row.find("td.setheadercell, td.setcell, td.endcell");
        if (cells.length === 0) return;

        // Get position cell (first cell with bgcolor attribute)
        const posCell = $row.find("td").first();
        const bgColor = posCell.attr("bgcolor");

        // Determine set based on background color
        if (bgColor === "#006666") {
          // Set 1 opener
          currentSet = "set1";
          setPosition = 1;
        } else if (bgColor === "#004040") {
          // Set 2 opener
          currentSet = "set2";
          setPosition = 1;
        } else if (bgColor === "#660000" || bgColor === "#CC0000") {
          // Encore
          if (currentSet !== "encore") {
            currentSet = "encore";
            setPosition = 0;
          }
        }

        // Get song title from second cell with onclick attribute
        const songCell = $row.find("td.setheadercell").eq(1);
        const songLink = songCell.find("a").first();

        if (songLink.length === 0) return;

        position++;
        setPosition++;

        let songTitle = "";
        const onclick = songLink.attr("onclick");

        // Extract song title from overlib popup HTML
        if (onclick) {
          const titleMatch = onclick.match(/class=\\'setitem\\'[^>]*>([^<]+)</);
          if (titleMatch) {
            songTitle = normalizeWhitespace(titleMatch[1]);
          }
        }

        // Fallback to link text if no title found
        if (!songTitle) {
          songTitle = normalizeWhitespace(songLink.text());
        }

        // Skip if no song title
        if (!songTitle) return;

        // Determine slot based on background color and position
        let slot: "opener" | "closer" | "standard" = "standard";
        if (bgColor === "#006666" || bgColor === "#004040") {
          slot = "opener";
        } else if (bgColor === "#336699" || bgColor === "#214263") {
          slot = "closer";
        }

        // Get duration from third cell (if present)
        const durationCell = $row.find("td").eq(2);
        const durationText = durationCell.text().trim();
        const durationMatch = durationText.match(/(\d{1,2}:\d{2})/);

        // Parse guest appearances from cells
        const guestNames: string[] = [];
        $row.find("td.setcell, td.endcell").each((_, cell) => {
          const $cell = $(cell);
          let cellText = $cell.text().trim();

          // Remove "(more...)" text that indicates truncated guest lists
          cellText = cellText.replace(/\(more\.\.\.\)/g, "").trim();

          // Guest cells contain names (comma-separated)
          if (cellText &&
              cellText.length > 3 &&
              !cellText.match(/^\d+$/) &&
              !cellText.includes("of 1") &&
              !cellText.match(/^(DEBUT|AD|TD|LIB)$/)) {
            // Split by commas and clean up
            const names = cellText.split(",").map(n => n.trim()).filter(n => n);
            for (const name of names) {
              // Only include names that look like proper names (not notes)
              if (name.match(/[A-Z][a-z]+/) &&
                  !name.includes("on lead") &&
                  !name.includes("vocals") &&
                  !guestNames.includes(name)) {
                guestNames.push(name);
              }
            }
          }
        });

        // Check for segue (look for arrow in row text)
        const rowText = $row.text();
        const isSegue = rowText.includes("→") || rowText.includes(">");

        setlist.push({
          songTitle,
          position,
          set: currentSet,
          slot,
          duration: durationMatch ? durationMatch[1] : undefined,
          isSegue,
          segueIntoTitle: undefined,
          isTease: false,
          teaseOfTitle: undefined,
          hasRelease: false,
          releaseTitle: undefined,
          guestNames,
          notes: undefined,
        });
      });
    }

    // Parse guest appearances (aggregate from setlist)
    const guestMap = new Map<string, ScrapedGuestAppearance>();
    for (const entry of setlist) {
      for (const guestName of entry.guestNames) {
        if (!guestMap.has(guestName)) {
          guestMap.set(guestName, {
            name: guestName,
            instruments: [],
            songs: [],
          });
        }
        const guest = guestMap.get(guestName)!;
        if (guest.songs && !guest.songs.includes(entry.songTitle)) {
          guest.songs.push(entry.songTitle);
        }
      }
    }

    const guests = Array.from(guestMap.values());

    const show: ScrapedShow = {
      originalId,
      date: dateStr,
      venueName,
      city,
      state,
      country,
      tourYear,
      notes: undefined,
      soundcheck: undefined,
      setlist,
      guests,
    };

    return show;
  } catch (error) {
    console.error(`Error parsing show ${showUrl.id} (${showUrl.url}):`, error);
    return null;
  }
}

// Main batch scraper
async function scrapeShowsBatch(limit?: number): Promise<void> {
  console.log("Starting batch show scraper...");
  console.log(`Configuration:
  - Batch size: ${BATCH_SIZE} shows
  - Concurrency: ${CONCURRENCY} requests
  - Rate limit: ${REQUESTS_PER_INTERVAL} requests per ${INTERVAL_MS / 1000}s
  - Delay: ${MIN_DELAY}-${MAX_DELAY}ms between requests
`);

  // Load show URLs
  const allShowUrls = loadShowUrls(limit);
  console.log(`Loaded ${allShowUrls.length} show URLs`);

  // Load checkpoint if exists
  const checkpoint = loadCheckpoint();
  const completedIds = new Set(checkpoint?.completedIds || []);
  const shows: ScrapedShow[] = checkpoint?.shows || [];
  const startIndex = checkpoint?.lastProcessedIndex ?? -1;

  // Filter to remaining shows
  const remainingUrls = allShowUrls.filter(
    (url) => !completedIds.has(url.id)
  );

  console.log(
    `Progress: ${completedIds.size} completed, ${remainingUrls.length} remaining`
  );

  if (remainingUrls.length === 0) {
    console.log("All shows already scraped!");
    return;
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Create rate limiter queue
    const queue = new PQueue({
      concurrency: CONCURRENCY,
      intervalCap: REQUESTS_PER_INTERVAL,
      interval: INTERVAL_MS,
    });

    let processedCount = completedIds.size;
    let successCount = shows.length;
    let failureCount = 0;

    // Process each show URL
    for (let i = 0; i < remainingUrls.length; i++) {
      const showUrl = remainingUrls[i];

      await queue.add(async () => {
        const show = await parseShowPage(page, showUrl);

        if (show) {
          shows.push(show);
          successCount++;
          console.log(
            `✓ [${successCount}/${allShowUrls.length}] ${show.date} - ${show.venueName} (${show.setlist.length} songs)`
          );
        } else {
          failureCount++;
          console.log(
            `✗ [${processedCount + 1}/${allShowUrls.length}] Failed: ${showUrl.id}`
          );
        }

        completedIds.add(showUrl.id);
        processedCount++;

        // Random delay between requests
        await randomDelay(MIN_DELAY, MAX_DELAY);

        // Checkpoint every BATCH_SIZE shows
        if (processedCount % BATCH_SIZE === 0) {
          const checkpointData: Checkpoint = {
            lastProcessedIndex: startIndex + i + 1,
            completedIds: Array.from(completedIds),
            shows,
            timestamp: new Date().toISOString(),
            totalProcessed: processedCount,
          };
          saveCheckpoint(checkpointData);
        }
      });
    }

    // Wait for all tasks to complete
    await queue.onIdle();

    // Final checkpoint
    const finalCheckpoint: Checkpoint = {
      lastProcessedIndex: allShowUrls.length - 1,
      completedIds: Array.from(completedIds),
      shows,
      timestamp: new Date().toISOString(),
      totalProcessed: processedCount,
    };
    saveCheckpoint(finalCheckpoint);

    // Save final output
    const output: ShowsOutput = {
      scrapedAt: new Date().toISOString(),
      source: BASE_URL,
      totalItems: shows.length,
      shows,
    };

    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(
      SHOWS_OUTPUT_FILE,
      JSON.stringify(output, null, 2),
      "utf-8"
    );

    console.log(`
========================================
Batch Scraping Complete!
========================================
Total shows processed: ${processedCount}
Successful: ${successCount}
Failed: ${failureCount}
Success rate: ${((successCount / processedCount) * 100).toFixed(1)}%
Output saved to: ${SHOWS_OUTPUT_FILE}
========================================
`);
  } finally {
    await browser.close();
  }
}

// CLI interface
const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

// Run the scraper
scrapeShowsBatch(limit)
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Scraper failed:", error);
    process.exit(1);
  });
