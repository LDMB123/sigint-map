import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Types for guest show appearances
export interface GuestShowAppearance {
  showId: string;
  showDate: string;
  venueName: string;
  city: string;
  state?: string;
  country: string;
  songs: GuestSongAppearance[];
}

export interface GuestSongAppearance {
  songTitle: string;
  songId?: string;
  instruments: string[];
  position?: number;
  set?: string;
}

export interface ScrapedGuestShows {
  guestId: string;
  guestName: string;
  totalAppearances: number;
  firstAppearanceDate?: string;
  lastAppearanceDate?: string;
  appearances: GuestShowAppearance[];
}

// Get all guest IDs from existing guest data
function getGuestIds(): { guestId: string; guestName: string }[] {
  const guestDetailsPath = join(OUTPUT_DIR, "guest-details.json");

  if (existsSync(guestDetailsPath)) {
    const data = JSON.parse(readFileSync(guestDetailsPath, "utf-8"));
    return data.guests.map((g: any) => ({
      guestId: g.originalId,
      guestName: g.name,
    }));
  }

  // Fallback to guests.json
  const guestsPath = join(OUTPUT_DIR, "guests.json");
  if (existsSync(guestsPath)) {
    const data = JSON.parse(readFileSync(guestsPath, "utf-8"));
    return data.guests.map((g: any) => ({
      guestId: g.originalId,
      guestName: g.name,
    }));
  }

  console.error("No guest data found!");
  return [];
}

// Parse TourGuestShows.aspx page for a specific guest
async function parseGuestShowsPage(
  page: Page,
  guestId: string,
  guestName: string
): Promise<ScrapedGuestShows | null> {
  const url = `${BASE_URL}/TourGuestShows.aspx?gid=${guestId}`;

  try {
    let html = getCachedHtml(url);

    if (!html) {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    }

    const $ = cheerio.load(html);

    const appearances: GuestShowAppearance[] = [];
    let firstDate: string | undefined;
    let lastDate: string | undefined;

    // Look for show entries - typically in a table format
    // TourGuestShows.aspx lists shows with dates, venues, and songs

    // Try finding show rows in table format
    $("tr").each((_, row) => {
      const $row = $(row);

      // Look for show links with TourShowSet.aspx
      const showLink = $row.find("a[href*='TourShowSet.aspx'][href*='id=']").first();
      if (!showLink.length) return;

      const href = showLink.attr("href") || "";
      const showIdMatch = href.match(/id=(\d+)/);
      if (!showIdMatch) return;

      const showId = showIdMatch[1];

      // Extract date - look for MM.DD.YYYY or YYYY-MM-DD format
      const rowText = $row.text();
      let showDate = "";

      // Try MM.DD.YYYY format first
      const dateMatch1 = rowText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (dateMatch1) {
        const [, month, day, year] = dateMatch1;
        showDate = `${year}-${month}-${day}`;
      } else {
        // Try YYYY-MM-DD format
        const dateMatch2 = rowText.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch2) {
          showDate = dateMatch2[0];
        }
      }

      // Track first/last dates
      if (showDate) {
        if (!firstDate || showDate < firstDate) firstDate = showDate;
        if (!lastDate || showDate > lastDate) lastDate = showDate;
      }

      // Extract venue info
      const venueLink = $row.find("a[href*='VenueStats.aspx']").first();
      const venueName = normalizeWhitespace(venueLink.text() || "");

      // Extract location - typically after venue name
      let city = "";
      let state = "";
      let country = "USA";

      const locationText = $row.text();
      const locationMatch = locationText.match(/([A-Za-z\s]+),\s*([A-Z]{2})(?:,\s*([A-Za-z\s]+))?/);
      if (locationMatch) {
        city = locationMatch[1].trim();
        state = locationMatch[2].trim();
        country = locationMatch[3]?.trim() || "USA";
      }

      // Extract songs played with this guest
      const songs: GuestSongAppearance[] = [];

      // Look for song links in the row or associated song section
      $row.find("a[href*='SongStats.aspx'][href*='sid='], a[href*='summary.aspx'][href*='sid=']").each((_, songEl) => {
        const songHref = $(songEl).attr("href") || "";
        const songIdMatch = songHref.match(/sid=(\d+)/);
        const songTitle = normalizeWhitespace($(songEl).text());

        if (songTitle) {
          // Look for instruments mentioned near this song
          const instruments: string[] = [];
          const songContext = $(songEl).parent().text();

          // Common instrument patterns
          const instrumentPatterns = [
            /guitar/i, /bass/i, /drums/i, /percussion/i, /keyboard/i, /piano/i,
            /violin/i, /viola/i, /cello/i, /trumpet/i, /saxophone/i, /sax/i,
            /harmonica/i, /vocals/i, /backing vocals/i, /lead vocals/i,
            /mandolin/i, /banjo/i, /fiddle/i, /flute/i, /clarinet/i
          ];

          for (const pattern of instrumentPatterns) {
            if (pattern.test(songContext)) {
              instruments.push(pattern.source.replace(/\\i$/, "").replace(/\\/g, ""));
            }
          }

          songs.push({
            songTitle,
            songId: songIdMatch ? songIdMatch[1] : undefined,
            instruments,
          });
        }
      });

      if (showId && (showDate || venueName)) {
        appearances.push({
          showId,
          showDate,
          venueName,
          city,
          state: state || undefined,
          country,
          songs,
        });
      }
    });

    // Alternative parsing: Look for list format
    if (appearances.length === 0) {
      $("li, .show-entry, .appearance").each((_, el) => {
        const $el = $(el);
        const showLink = $el.find("a[href*='TourShowSet.aspx'][href*='id=']").first();

        if (showLink.length) {
          const href = showLink.attr("href") || "";
          const showIdMatch = href.match(/id=(\d+)/);
          if (!showIdMatch) return;

          const showId = showIdMatch[1];
          const text = $el.text();

          // Parse date
          let showDate = "";
          const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
          if (dateMatch) {
            const [, month, day, year] = dateMatch;
            showDate = `${year}-${month}-${day}`;
          }

          if (showDate) {
            if (!firstDate || showDate < firstDate) firstDate = showDate;
            if (!lastDate || showDate > lastDate) lastDate = showDate;
          }

          // Parse venue
          const venueLink = $el.find("a[href*='VenueStats.aspx']").first();
          const venueName = normalizeWhitespace(venueLink.text() || showLink.text());

          appearances.push({
            showId,
            showDate,
            venueName,
            city: "",
            country: "USA",
            songs: [],
          });
        }
      });
    }

    // Get total count from page text if available
    let totalAppearances = appearances.length;
    const countMatch = $("body").text().match(/(\d+)\s+(?:total\s+)?(?:appearances?|shows?|performances?)/i);
    if (countMatch) {
      totalAppearances = parseInt(countMatch[1], 10);
    }

    return {
      guestId,
      guestName,
      totalAppearances,
      firstAppearanceDate: firstDate,
      lastAppearanceDate: lastDate,
      appearances,
    };
  } catch (error) {
    console.error(`Error parsing guest shows for ${guestName} (${guestId}):`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllGuestShows(): Promise<ScrapedGuestShows[]> {
  console.log("Starting guest shows scraper...");
  console.log("This scraper extracts detailed appearance data from TourGuestShows.aspx pages");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Load checkpoint if exists
    const checkpoint = loadCheckpoint<{
      completedIds: string[];
      guestShows: ScrapedGuestShows[];
    }>("guest-shows");

    const completedIds = new Set(checkpoint?.completedIds || []);
    const allGuestShows: ScrapedGuestShows[] = checkpoint?.guestShows || [];

    // Get guest IDs to process
    const guests = getGuestIds();
    console.log(`Found ${guests.length} guests to process`);

    const remainingGuests = guests.filter((g) => !completedIds.has(g.guestId));
    console.log(`${remainingGuests.length} guests remaining to scrape`);

    // Rate limiter queue
    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000,
    });

    let processed = 0;
    const total = remainingGuests.length;

    for (const guest of remainingGuests) {
      await queue.add(async () => {
        const guestShows = await parseGuestShowsPage(page, guest.guestId, guest.guestName);

        if (guestShows) {
          allGuestShows.push(guestShows);
          completedIds.add(guest.guestId);
          console.log(`  [${++processed}/${total}] ${guest.guestName}: ${guestShows.appearances.length} appearances`);
        } else {
          processed++;
          console.log(`  [${processed}/${total}] ${guest.guestName}: SKIPPED (no data)`);
        }

        await randomDelay(1000, 3000);
      });

      // Save checkpoint periodically
      if (processed % 25 === 0 && processed > 0) {
        saveCheckpoint("guest-shows", {
          completedIds: Array.from(completedIds),
          guestShows: allGuestShows,
        });
        console.log(`  [Checkpoint saved at ${processed}/${total}]`);
      }
    }

    await queue.onIdle();
    return allGuestShows;
  } finally {
    await browser.close();
  }
}

// Save guest shows to JSON file
export function saveGuestShows(guestShows: ScrapedGuestShows[]): void {
  const totalAppearances = guestShows.reduce((sum, g) => sum + g.appearances.length, 0);

  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalGuests: guestShows.length,
    totalAppearances,
    guestShows,
  };

  const filepath = join(OUTPUT_DIR, "guest-shows.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${guestShows.length} guests with ${totalAppearances} total appearances to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllGuestShows()
    .then((guestShows) => {
      saveGuestShows(guestShows);
      console.log("\nDone!");
      console.log(`Total guests: ${guestShows.length}`);
      console.log(`Total appearances: ${guestShows.reduce((sum, g) => sum + g.appearances.length, 0)}`);
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
