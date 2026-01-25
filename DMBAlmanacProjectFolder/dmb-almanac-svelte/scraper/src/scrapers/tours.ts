import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { ScrapedTourDetailed } from "../types.js";
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { parseDate, normalizeWhitespace, slugify } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Get all tour IDs and names by scanning year pages
async function getAllTourIds(page: Page): Promise<{ id: string; name: string; year: number }[]> {
  console.log("Scanning year pages for tour IDs...");

  const currentYear = new Date().getFullYear();
  const tours: { id: string; name: string; year: number }[] = [];
  const seenTourIds = new Set<string>();

  // DMB has toured from 1991 to present
  for (let year = 1991; year <= currentYear; year++) {
    const url = `${BASE_URL}/TourShow.aspx?where=${year}`;

    try {
      // Check cache first
      let html = getCachedHtml(url);

      if (!html) {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        html = await page.content();
        cacheHtml(url, html);
      }

      const $ = cheerio.load(html);

      // Look for tour links with tid parameter
      // Pattern 1: Links to TourShowInfo.aspx?tid=XXX in href
      $("a[href*='TourShowInfo.aspx']").each((_, el) => {
        const href = $(el).attr("href");
        if (href && href.includes("tid=")) {
          const tidMatch = href.match(/tid=(\d+)/);
          if (tidMatch) {
            const tourId = tidMatch[1];
            if (!seenTourIds.has(tourId)) {
              const tourName = normalizeWhitespace($(el).text());
              if (tourName && tourName.length > 0) {
                tours.push({
                  id: tourId,
                  name: tourName,
                  year: year,
                });
                seenTourIds.add(tourId);
              }
            }
          }
        }
      });

      // Pattern 1b: Tour links are often in onclick handlers (overlib popups)
      // Look for list-group-item elements with onclick containing TourShowInfo
      $("a[onclick*='TourShowInfo.aspx'], li a[onclick*='tid=']").each((_, el) => {
        const $el = $(el);
        const onclick = $el.attr("onclick") || "";

        // Extract tid from onclick content like "TourShowInfo.aspx?tid=8176"
        const tidMatch = onclick.match(/tid=(\d+)/);
        if (tidMatch) {
          const tourId = tidMatch[1];
          if (!seenTourIds.has(tourId)) {
            // Get tour name from the link text (e.g., "Summer 2024 (32)")
            let tourName = normalizeWhitespace($el.text());
            // Remove the show count suffix like "(32)"
            tourName = tourName.replace(/\s*\(\d+\)\s*$/, "").trim();

            if (tourName && tourName.length > 0) {
              tours.push({
                id: tourId,
                name: tourName,
                year: year,
              });
              seenTourIds.add(tourId);
            }
          }
        }
      });

      // Pattern 2: Dropdowns or selects with tour options
      $("select option[value*='tid='], option[data-tid]").each((_, el) => {
        const $el = $(el);
        const value = $el.attr("value") || $el.attr("data-tid") || "";
        const tidMatch = value.match(/tid=(\d+)/);
        if (tidMatch) {
          const tourId = tidMatch[1];
          if (!seenTourIds.has(tourId)) {
            const tourName = normalizeWhitespace($el.text());
            if (tourName && tourName.length > 0) {
              tours.push({
                id: tourId,
                name: tourName,
                year: year,
              });
              seenTourIds.add(tourId);
            }
          }
        }
      });

      console.log(`  ${year}: Found ${tours.filter(t => t.year === year).length} tours`);
      await randomDelay(500, 1000); // Be nice to the server
    } catch (error) {
      console.error(`Error scanning year ${year}:`, error);
    }
  }

  console.log(`\nTotal tours found: ${tours.length}`);
  return tours;
}

// Parse a single tour detail page
async function parseTourPage(page: Page, tourId: string, tourName: string, year: number): Promise<ScrapedTourDetailed | null> {
  try {
    const url = `${BASE_URL}/TourShowInfo.aspx?tid=${tourId}`;

    // Check cache first
    let html = getCachedHtml(url);

    if (!html) {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    }

    const $ = cheerio.load(html);

    // Extract tour name from page if not provided
    let finalTourName = tourName;
    const h1 = $("h1").first();
    if (h1.length) {
      const pageTitle = normalizeWhitespace(h1.text());
      if (pageTitle && !pageTitle.toLowerCase().includes("dmb almanac")) {
        finalTourName = pageTitle;
      }
    }

    // Parse show count from page
    let showCount = 0;
    const pageText = $("body").text();

    // Look for patterns like "35 shows" or "Shows (35)"
    const showCountMatch = pageText.match(/(\d+)\s+shows?/i) ||
                          pageText.match(/Shows?\s*\((\d+)\)/i);
    if (showCountMatch) {
      showCount = parseInt(showCountMatch[1], 10);
    }

    // Count show rows in table as fallback
    if (showCount === 0) {
      const showRows = $("table tr").filter((_, row) => {
        const $row = $(row);
        return $row.find("a[href*='TourShowSet.aspx'], a[href*='ShowSetlist.aspx']").length > 0;
      });
      showCount = showRows.length;
    }

    // Parse date range from show table
    let startDate: string | undefined;
    let endDate: string | undefined;

    const showDates: Date[] = [];

    $("table tr").each((_, row) => {
      const $row = $(row);

      // Look for date cells (MM.DD.YY format)
      const dateCell = $row.find("td").filter((_, td) => {
        const text = $(td).text().trim();
        return /\d{2}\.\d{2}\.\d{2,4}/.test(text);
      });

      if (dateCell.length > 0) {
        const dateText = dateCell.text().trim();
        const dateMatch = dateText.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
        if (dateMatch) {
          const [, month, day, yearShort] = dateMatch;
          // Handle 2-digit or 4-digit year
          let fullYear = parseInt(yearShort, 10);
          if (fullYear < 100) {
            fullYear += fullYear < 50 ? 2000 : 1900;
          }
          try {
            const isoDate = `${fullYear}-${month}-${day}`;
            const date = new Date(isoDate);
            if (!isNaN(date.getTime())) {
              showDates.push(date);
            }
          } catch (err) {
            // Skip invalid dates
          }
        }
      }
    });

    if (showDates.length > 0) {
      showDates.sort((a, b) => a.getTime() - b.getTime());
      startDate = showDates[0].toISOString().split("T")[0];
      endDate = showDates[showDates.length - 1].toISOString().split("T")[0];
    }

    // Parse statistics from summary/stats sections
    let venueCount: number | undefined;
    let songCount: number | undefined;
    let totalSongPerformances: number | undefined;
    let averageSongsPerShow: number | undefined;

    // Look for stats patterns
    const venueMatch = pageText.match(/(\d+)\s+(?:unique\s+)?venues?/i);
    if (venueMatch) {
      venueCount = parseInt(venueMatch[1], 10);
    }

    const songMatch = pageText.match(/(\d+)\s+(?:unique\s+)?songs?\s+played/i);
    if (songMatch) {
      songCount = parseInt(songMatch[1], 10);
    }

    const totalSongsMatch = pageText.match(/(\d+)\s+total\s+songs?/i);
    if (totalSongsMatch) {
      totalSongPerformances = parseInt(totalSongsMatch[1], 10);
    }

    const avgMatch = pageText.match(/average[:\s]+(\d+\.?\d*)\s+songs?\s+per\s+show/i);
    if (avgMatch) {
      averageSongsPerShow = parseFloat(avgMatch[1]);
    }

    // Calculate average if not found but we have totals
    if (!averageSongsPerShow && totalSongPerformances && showCount > 0) {
      averageSongsPerShow = parseFloat((totalSongPerformances / showCount).toFixed(2));
    }

    // Parse top songs if available
    const topSongs: { title: string; playCount: number }[] = [];

    // Look for "Most Played" section
    $("table").each((_, table) => {
      const $table = $(table);
      const headerText = $table.find("th, .header").text().toLowerCase();

      if (headerText.includes("most played") || headerText.includes("top songs")) {
        $table.find("tr").each((_, row) => {
          const $row = $(row);
          const songLink = $row.find("a[href*='SongStats']").first();

          if (songLink.length > 0) {
            const songTitle = normalizeWhitespace(songLink.text());

            // Look for play count in the row
            const playCountCell = $row.find("td").filter((_, td) => {
              const text = $(td).text().trim();
              return /^\d+$/.test(text);
            }).first();

            if (playCountCell.length > 0) {
              const playCount = parseInt(playCountCell.text().trim(), 10);
              topSongs.push({ title: songTitle, playCount });
            }
          }
        });
      }
    });

    // Parse notes
    let notes: string | undefined;
    const notesEl = $(".notes, .tour-notes");
    if (notesEl.length) {
      notes = normalizeWhitespace(notesEl.text());
    }

    const tour: ScrapedTourDetailed = {
      originalId: tourId,
      name: finalTourName,
      slug: slugify(finalTourName),
      year: year,
      startDate,
      endDate,
      showCount,
      venueCount,
      songCount,
      totalSongPerformances,
      averageSongsPerShow,
      topSongs: topSongs.length > 0 ? topSongs : undefined,
      notes,
    };

    return tour;
  } catch (error) {
    console.error(`Error parsing tour ${tourId}:`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllTours(): Promise<ScrapedTourDetailed[]> {
  console.log("Starting tours scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to be polite
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Check for existing checkpoint
    const checkpoint = loadCheckpoint<{
      completedIds: string[];
      tours: ScrapedTourDetailed[];
    }>("tours");

    const completedIds = new Set(checkpoint?.completedIds || []);
    const allTours: ScrapedTourDetailed[] = checkpoint?.tours || [];

    // Get all tour IDs from year pages
    const tourList = await getAllTourIds(page);

    // Filter out already completed
    const remaining = tourList.filter(t => !completedIds.has(t.id));
    console.log(`\n${remaining.length} tours remaining to scrape`);

    // Rate limiter queue
    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000, // 5 requests per 10 seconds
    });

    let processed = 0;
    const total = remaining.length;

    // Parse each tour
    for (const { id, name, year } of remaining) {
      await queue.add(async () => {
        const tour = await parseTourPage(page, id, name, year);
        if (tour) {
          allTours.push(tour);
          completedIds.add(id);
          console.log(
            `  [${++processed}/${total}] ${tour.name} (${tour.showCount} shows)`
          );
        }
        await randomDelay(1000, 3000);
      });

      // Save checkpoint every 10 tours
      if (processed % 10 === 0 && processed > 0) {
        saveCheckpoint("tours", {
          completedIds: Array.from(completedIds),
          tours: allTours,
        });
      }
    }

    await queue.onIdle();

    // Final checkpoint
    saveCheckpoint("tours", {
      completedIds: Array.from(completedIds),
      tours: allTours,
    });

    return allTours;
  } finally {
    await browser.close();
  }
}

// Save tours to JSON file
export function saveTours(tours: ScrapedTourDetailed[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: tours.length,
    tours,
  };

  const filepath = join(OUTPUT_DIR, "tours.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${tours.length} tours to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllTours()
    .then((tours) => {
      saveTours(tours);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
