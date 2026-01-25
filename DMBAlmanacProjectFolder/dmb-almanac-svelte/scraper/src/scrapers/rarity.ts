import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Type definitions for rarity data
export interface ScrapedShowRarity {
  showId: string;
  date: string;
  venueName: string;
  city: string;
  state?: string;
  rarityIndex: number; // e.g., 2.000 = songs played every 2 shows on average
}

export interface ScrapedTourRarity {
  tourName: string;
  year: number;
  averageRarityIndex: number;
  differentSongsPlayed: number;
  totalSongsInShow?: number; // Average songs per show
  catalogPercentage?: number; // Percentage of total catalog
  rank?: number; // Ranking by rarity
  shows: ScrapedShowRarity[];
}

export interface RarityOutput {
  scrapedAt: string;
  source: string;
  totalTours: number;
  totalShows: number;
  tours: ScrapedTourRarity[];
  metadata?: {
    totalCatalogSongs?: number;
    rarityCalculationMethod?: string;
  };
}

// Parse the main ShowRarity.aspx page
async function parseRarityPage(page: Page): Promise<ScrapedTourRarity[]> {
  console.log("Fetching ShowRarity.aspx page...");

  const url = `${BASE_URL}/ShowRarity.aspx`;

  // Check cache first
  let html = getCachedHtml(url);

  if (!html) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    } catch (error) {
      console.error(`Failed to load ${url}:`, error);
      throw error;
    }
  }

  const $ = cheerio.load(html);
  const tours: ScrapedTourRarity[] = [];

  // The ShowRarity.aspx page has rarity data in a simple text format:
  // <br>1 <a href="...TourShowInfo.aspx?tid=8169&amp;where=2022">Summer 2022</a> (3.419)
  // We need to find the "Average Rarity" section and parse the <br> separated lines

  // Get all the HTML content
  const pageHtml = $.html();

  // Find the Average Rarity section - it starts after "<b>Average Rarity</b>" and contains the ranked tours
  // Look for the section between "rankings look like this way" and "While the previous two"
  const avgRarityMatch = pageHtml.match(/rankings look like this way[^<]*<br>([\s\S]*?)<br>\s*<br>While the previous/i);

  if (avgRarityMatch) {
    // Extract the section with tour rankings
    const raritySection = avgRarityMatch[1];
    console.log(`Found Average Rarity section, length: ${raritySection.length} chars`);

    // Pattern: N <a href="...TourShowInfo.aspx?tid=XXX&(amp;)?where=YYYY">Tour Name</a> (X.XXX)
    // Handle both dmbalmanac.com and www.dmbalmanac.com, and TourShowInfo vs TourShowinfo
    const tourPattern = /(\d+)\s*<a[^>]+TourShow[Ii]nfo\.aspx\?tid=(\d+)[^>]*where=(\d{4})[^>]*>([^<]+)<\/a>\s*\((\d+\.\d+)\)/gi;

    let match;
    while ((match = tourPattern.exec(raritySection)) !== null) {
      const [, rankStr, tourId, yearStr, tourName, rarityStr] = match;
      const rank = parseInt(rankStr, 10);
      const year = parseInt(yearStr, 10);
      const averageRarityIndex = parseFloat(rarityStr);

      tours.push({
        tourName: normalizeWhitespace(tourName),
        year,
        averageRarityIndex,
        differentSongsPlayed: 0, // Not available in this section
        rank,
        shows: [],
      });

      console.log(`  Found tour: ${tourName} (${year}) - Rarity: ${averageRarityIndex}, Rank: ${rank}`);
    }
  }

  // Also look for "Different Songs" rankings
  // <br>N <a href="...">Tour Name</a> (XXX)
  const differentSongsMatch = pageHtml.match(/different songs played[\s\S]*?<br>(\d+[\s\S]*?)<br><br>/i);

  if (differentSongsMatch) {
    const songsSection = differentSongsMatch[0];

    // Pattern: <br>N <a href="...">Tour Name</a> (XXX)
    const songsPattern = /<br>(\d+)\s*<a[^>]+TourShowInfo\.aspx\?tid=(\d+)[^>]*where=(\d{4})[^>]*>([^<]+)<\/a>\s*\((\d+)\)/gi;

    let match;
    while ((match = songsPattern.exec(songsSection)) !== null) {
      const [, , , yearStr, , songsStr] = match;
      const year = parseInt(yearStr, 10);
      const differentSongs = parseInt(songsStr, 10);

      // Update existing tour or add new one
      const existingTour = tours.find(t => t.year === year);
      if (existingTour) {
        existingTour.differentSongsPlayed = differentSongs;
      }
    }
  }

  // Also look for "Catalog Percentage" section
  // <br>N <a href="...">Tour Name</a> (XX/YYY; ZZ.Z%)
  const catalogMatch = pageHtml.match(/percentage of their catalog[\s\S]*?<br>(\d+[\s\S]*?)<br><br>/i);

  if (catalogMatch) {
    const catalogSection = catalogMatch[0];

    // Pattern: <br>N <a href="...">Tour Name</a> (XX/YYY; ZZ.Z%)
    const catalogPattern = /<br>(\d+)\s*<a[^>]+TourShowInfo\.aspx\?tid=(\d+)[^>]*where=(\d{4})[^>]*>([^<]+)<\/a>\s*\((\d+)\/(\d+);\s*(\d+\.?\d*)%\)/gi;

    let match;
    while ((match = catalogPattern.exec(catalogSection)) !== null) {
      const [, , , yearStr, , songsPlayed, totalCatalog, percentage] = match;
      const year = parseInt(yearStr, 10);
      const catalogPercentage = parseFloat(percentage);
      const totalSongsInShow = parseInt(songsPlayed, 10);

      // Update existing tour
      const existingTour = tours.find(t => t.year === year);
      if (existingTour) {
        existingTour.catalogPercentage = catalogPercentage;
        existingTour.totalSongsInShow = totalSongsInShow;
      }
    }
  }

  // Fallback: If we didn't find any tours in the Average Rarity section, try a more general approach
  if (tours.length === 0) {
    console.log("No tours found in Average Rarity section, trying general link parsing...");

    // Find all tour links with rarity values in parentheses
    // Pattern: <a href="...TourShowInfo...">Tour Name</a> (X.XXX)
    $("a[href*='TourShowInfo']").each((_, link) => {
      const $link = $(link);
      const href = $link.attr("href") || "";
      const tourName = normalizeWhitespace($link.text());

      // Get the text after this link (for the rarity value)
      const nextSibling = $link[0].nextSibling;
      const nextText = nextSibling && 'data' in nextSibling ? (nextSibling as any).data : "";
      const rarityMatch = nextText.match(/\((\d+\.\d+)\)/);

      // Extract year from href
      const yearMatch = href.match(/where=(\d{4})/);
      const tidMatch = href.match(/tid=(\d+)/);

      if (yearMatch && rarityMatch) {
        const year = parseInt(yearMatch[1], 10);
        const rarity = parseFloat(rarityMatch[1]);

        // Check if this tour already exists
        if (!tours.find(t => t.year === year && t.tourName === tourName)) {
          tours.push({
            tourName,
            year,
            averageRarityIndex: rarity,
            differentSongsPlayed: 0,
            shows: [],
          });
        }
      }
    });
  }

  // Sort tours by rank (if available) or by rarity (descending)
  tours.sort((a, b) => {
    if (a.rank !== undefined && b.rank !== undefined) {
      return a.rank - b.rank;
    }
    return b.averageRarityIndex - a.averageRarityIndex;
  });

  console.log(`Parsed ${tours.length} tours with rarity data`);
  return tours;
}

// Main scraper function
export async function scrapeRarity(): Promise<RarityOutput> {
  console.log("Starting rarity scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to be polite
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Parse main rarity page
    const tours = await parseRarityPage(page);

    // Check for checkpoint
    const checkpoint = loadCheckpoint<{
      completedYears: number[];
      tours: ScrapedTourRarity[];
    }>("rarity");

    const completedYears = checkpoint?.completedYears || [];
    const allTours = checkpoint?.tours || tours;

    // If we need to fetch individual tour pages for show-level data
    for (const tour of tours) {
      if (completedYears.includes(tour.year)) {
        console.log(`Skipping ${tour.year} (already completed)`);
        continue;
      }

      // If tour has no show data, try fetching tour-specific page
      if (tour.shows.length === 0) {
        console.log(`Fetching show rarity data for ${tour.year}...`);

        try {
          const tourUrl = `${BASE_URL}/TourShow.aspx?where=${tour.year}`;
          await randomDelay(2000, 4000); // Rate limiting

          let tourHtml = getCachedHtml(tourUrl);
          if (!tourHtml) {
            await page.goto(tourUrl, { waitUntil: "networkidle", timeout: 30000 });
            tourHtml = await page.content();
            cacheHtml(tourUrl, tourHtml);
          }

          // Parse show-level rarity from tour page
          const $ = cheerio.load(tourHtml);

          $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, link) => {
            const $link = $(link);
            const href = $link.attr("href");
            const showIdMatch = href?.match(/id=(\d+)/);

            if (showIdMatch) {
              const showId = showIdMatch[1];
              const linkText = normalizeWhitespace($link.text());

              // Parse date
              let date = "";
              const dateMatch = linkText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
              if (dateMatch) {
                const [, month, day, year] = dateMatch;
                date = `${year}-${month}-${day}`;
              }

              // Try to find rarity value in same row
              const row = $link.closest("tr");
              let showRarityIndex = 0;

              row.find("td").each((_, cell) => {
                const cellText = normalizeWhitespace($(cell).text());
                const rarityMatch = cellText.match(/^(\d+\.\d{2,})$/);
                if (rarityMatch) {
                  showRarityIndex = parseFloat(rarityMatch[1]);
                }
              });

              if (date && !tour.shows.find(s => s.showId === showId)) {
                tour.shows.push({
                  showId,
                  date,
                  venueName: "",
                  city: "",
                  rarityIndex: showRarityIndex,
                });
              }
            }
          });

          console.log(`  Found ${tour.shows.length} shows for ${tour.year}`);
        } catch (error) {
          console.error(`Failed to fetch tour ${tour.year}:`, error);
        }
      }

      // Save checkpoint
      completedYears.push(tour.year);
      saveCheckpoint("rarity", { completedYears, tours: allTours });
    }

    // Calculate totals
    const totalShows = tours.reduce((sum, tour) => sum + tour.shows.length, 0);

    const output: RarityOutput = {
      scrapedAt: new Date().toISOString(),
      source: `${BASE_URL}/ShowRarity.aspx`,
      totalTours: tours.length,
      totalShows,
      tours,
      metadata: {
        rarityCalculationMethod: "Average rarity of songs played (lower = more rare)",
      },
    };

    return output;
  } finally {
    await browser.close();
  }
}

// Save rarity data to JSON file
export function saveRarity(data: RarityOutput): void {
  const filepath = join(OUTPUT_DIR, "rarity.json");
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Saved rarity data to ${filepath}`);
  console.log(`  Total tours: ${data.totalTours}`);
  console.log(`  Total shows: ${data.totalShows}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeRarity()
    .then((data) => {
      saveRarity(data);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
