/**
 * Script to scrape all 2025 shows from DMBAlmanac.com
 * Focuses on getting the latest 2025 data that may be missing
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = "./output";

interface ShowUrl {
  id: string;
  url: string;
  tourId: string;
  tourName: string;
}

interface ScrapedShow {
  originalId: string;
  date: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  tourName: string;
  tourYear: number;
  setlist: SetlistEntry[];
  guests: GuestAppearance[];
  notes: string;
}

interface SetlistEntry {
  position: number;
  songTitle: string;
  set: string;
  slot: string;
  isSegue: boolean;
  isTease: boolean;
  notes: string;
  guestNames: string[];
}

interface GuestAppearance {
  name: string;
  instruments: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function get2025TourIds(page: any): Promise<{ id: string; name: string }[]> {
  console.log("Fetching 2025 tour list...");

  await page.goto(`${BASE_URL}/TourShow.aspx?where=2025`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const html = await page.content();
  const $ = cheerio.load(html);

  const tours: { id: string; name: string }[] = [];

  // Find tour links
  $("a[href*='TourShowInfo.aspx'][href*='tid=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const tidMatch = href.match(/tid=(\d+)/);
    const name = $(el).text().trim();

    if (tidMatch && name) {
      const tourId = tidMatch[1];
      if (!tours.find(t => t.id === tourId)) {
        tours.push({ id: tourId, name });
      }
    }
  });

  console.log(`Found ${tours.length} tours for 2025:`, tours.map(t => t.name).join(", "));
  return tours;
}

async function getShowUrlsForTour(page: any, tourId: string, tourName: string): Promise<ShowUrl[]> {
  console.log(`Fetching shows for tour: ${tourName} (${tourId})...`);

  await page.goto(`${BASE_URL}/TourShowInfo.aspx?tid=${tourId}&where=2025`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const html = await page.content();
  const $ = cheerio.load(html);

  const showUrls: ShowUrl[] = [];

  $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const idMatch = href.match(/id=(\d+)/);

    if (idMatch) {
      const showId = idMatch[1];
      let fullUrl = href;
      if (!href.startsWith("http")) {
        fullUrl = `${BASE_URL}/${href.replace(/^\.\//, "")}`;
      }

      if (!showUrls.find(s => s.id === showId)) {
        showUrls.push({
          id: showId,
          url: fullUrl,
          tourId,
          tourName,
        });
      }
    }
  });

  console.log(`  Found ${showUrls.length} shows`);
  return showUrls;
}

async function scrapeShowPage(page: any, showUrl: ShowUrl): Promise<ScrapedShow | null> {
  try {
    await page.goto(showUrl.url, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract date from page
    const dateMatch = html.match(/(\d{2}\.\d{2}\.\d{2,4})/);
    let date = "";
    if (dateMatch) {
      const parts = dateMatch[1].split(".");
      if (parts.length === 3) {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        date = `${year}-${parts[0]}-${parts[1]}`;
      }
    }

    // Extract venue info
    const venueText = $("h2").first().text() || "";
    const venueMatch = venueText.match(/(.+?),\s*(.+?),\s*(\w{2})/);

    let venueName = "";
    let city = "";
    let state = "";

    if (venueMatch) {
      venueName = venueMatch[1].trim();
      city = venueMatch[2].trim();
      state = venueMatch[3].trim();
    } else {
      // Try alternate parsing
      const parts = venueText.split(",").map(s => s.trim());
      if (parts.length >= 2) {
        venueName = parts[0];
        city = parts[1];
        state = parts[2] || "";
      }
    }

    // Extract setlist
    const setlist: SetlistEntry[] = [];
    let position = 0;
    let currentSet = "set1";

    $("table.setlist tr, div.setlist-entry, .song-row").each((_, row) => {
      const $row = $(row);
      const songText = $row.find("a[href*='sid=']").text().trim() ||
                       $row.find(".song-title").text().trim() ||
                       $row.text().trim();

      if (songText && songText.length > 0 && songText.length < 100) {
        position++;

        // Check for set markers
        const rowText = $row.text().toLowerCase();
        if (rowText.includes("set 2") || rowText.includes("set ii")) {
          currentSet = "set2";
        } else if (rowText.includes("encore")) {
          currentSet = "encore";
        }

        const isSegue = rowText.includes("->") || rowText.includes("→");
        const isTease = rowText.includes("tease") || rowText.includes("[");

        // Extract guest names
        const guestNames: string[] = [];
        $row.find("a[href*='gid=']").each((_, guestEl) => {
          guestNames.push($(guestEl).text().trim());
        });

        setlist.push({
          position,
          songTitle: songText.replace(/\s*->\s*$/, "").replace(/\s*→\s*$/, "").trim(),
          set: currentSet,
          slot: position === 1 ? "opener" : "standard",
          isSegue,
          isTease,
          notes: "",
          guestNames,
        });
      }
    });

    // Extract guests
    const guests: GuestAppearance[] = [];
    $("a[href*='gid=']").each((_, el) => {
      const name = $(el).text().trim();
      if (name && !guests.find(g => g.name === name)) {
        guests.push({ name, instruments: [] });
      }
    });

    // Notes
    const notes = $(".show-notes, .notes").text().trim();

    return {
      originalId: showUrl.id,
      date,
      venueName,
      city,
      state,
      country: "USA",
      tourName: showUrl.tourName,
      tourYear: 2025,
      setlist,
      guests,
      notes,
    };
  } catch (error) {
    console.error(`Failed to scrape show ${showUrl.id}:`, error);
    return null;
  }
}

async function main() {
  console.log("Starting 2025 shows scraper...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Get all 2025 tours
    const tours = await get2025TourIds(page);
    await delay(2000);

    // Get all show URLs
    const allShowUrls: ShowUrl[] = [];
    for (const tour of tours) {
      const urls = await getShowUrlsForTour(page, tour.id, tour.name);
      allShowUrls.push(...urls);
      await delay(1500);
    }

    console.log(`\nTotal 2025 shows to scrape: ${allShowUrls.length}`);

    // Load existing shows to check for duplicates
    const existingFile = join(OUTPUT_DIR, "shows.json");
    let existingShows: ScrapedShow[] = [];
    if (existsSync(existingFile)) {
      try {
        const data = JSON.parse(readFileSync(existingFile, "utf-8"));
        existingShows = data.shows || [];
      } catch {}
    }

    const existingIds = new Set(existingShows.map(s => s.originalId));
    const newUrls = allShowUrls.filter(u => !existingIds.has(u.id));

    console.log(`New shows to scrape: ${newUrls.length}`);

    // Scrape each new show
    const newShows: ScrapedShow[] = [];
    for (let i = 0; i < newUrls.length; i++) {
      const url = newUrls[i];
      console.log(`Scraping ${i + 1}/${newUrls.length}: Show ${url.id}...`);

      const show = await scrapeShowPage(page, url);
      if (show && show.date) {
        newShows.push(show);
        console.log(`  ✓ ${show.date} - ${show.venueName}, ${show.city}`);
      }

      await delay(1500);
    }

    // Merge and save
    const allShows = [...existingShows, ...newShows];

    const output = {
      scrapedAt: new Date().toISOString(),
      source: BASE_URL,
      totalItems: allShows.length,
      shows: allShows,
    };

    writeFileSync(existingFile, JSON.stringify(output, null, 2), "utf-8");
    console.log(`\nSaved ${allShows.length} total shows (${newShows.length} new)`);

    // Also save just the 2025 shows separately
    const shows2025 = allShows.filter(s => s.date.startsWith("2025"));
    const output2025 = {
      scrapedAt: new Date().toISOString(),
      source: BASE_URL,
      totalItems: shows2025.length,
      shows: shows2025,
    };

    writeFileSync(join(OUTPUT_DIR, "shows-2025.json"), JSON.stringify(output2025, null, 2), "utf-8");
    console.log(`Saved ${shows2025.length} shows for 2025 specifically`);

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
    console.error("Scraper failed:", error);
    process.exit(1);
  });
