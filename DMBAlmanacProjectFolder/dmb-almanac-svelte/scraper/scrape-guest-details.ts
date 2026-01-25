/**
 * Scrape detailed guest information from DMBAlmanac.com
 * Extracts: name, instruments, total appearances, first/last appearance dates, etc.
 */

import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = "./output";

interface GuestDetail {
  originalId: string;
  name: string;
  instruments: string[];
  totalAppearances: number | null;
  distinctSongs: number | null;
  firstAppearanceDate: string | null;
  lastAppearanceDate: string | null;
  albums: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(dateStr: string): string | null {
  // Input: "3/14/1991" or "03.14.91"
  const cleaned = dateStr.trim();

  // Try MM/DD/YYYY format
  const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [_, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try MM.DD.YY format
  const dotMatch = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (dotMatch) {
    const [_, month, day, yearStr] = dotMatch;
    let year = yearStr;
    if (year.length === 2) {
      const yearNum = parseInt(year);
      year = yearNum > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

async function scrapeGuestPage(page: Page, guestId: string): Promise<GuestDetail | null> {
  try {
    const url = `${BASE_URL}/GuestStats.aspx?gid=${guestId}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Get guest name from the page-header span.newsitem with large font
    let name = "";

    // Primary method: span.newsitem with 20px font in page-header
    const pageHeader = $(".page-header .newsitem").filter((_, el) => {
      const style = $(el).attr("style") || "";
      return style.includes("font-size:20px") || style.includes("font-size: 20px");
    }).first().text().trim();

    if (pageHeader) {
      name = pageHeader;
    }

    // Fallback: get from selected option in dropdown
    if (!name) {
      const selectedOption = $("select option[selected]").first().text().trim();
      if (selectedOption) {
        name = selectedOption;
      }
    }

    if (!name) {
      console.log(`  No name found for gid=${guestId}`);
      return null;
    }

    // Get instruments from span.fadeddetail (contains "vocals", "guitar", etc.)
    const instruments: string[] = [];
    const instrumentSpan = $(".page-header .fadeddetail").first().text().trim();

    if (instrumentSpan) {
      // Remove quotes and split by common delimiters
      const cleaned = instrumentSpan.replace(/["']/g, "").trim();
      cleaned.split(/\s*(?:and|&|,)\s*/i).forEach(inst => {
        const item = inst.trim().toLowerCase();
        if (item && item.length > 0 && item.length < 50) {
          instruments.push(item);
        }
      });
    }

    // Get stats
    let totalAppearances: number | null = null;
    let distinctSongs: number | null = null;

    const pageText = $("body").text();
    const appearancesMatch = pageText.match(/Show Appearances[:\s]*(\d+)/i);
    if (appearancesMatch) {
      totalAppearances = parseInt(appearancesMatch[1]);
    }

    const distinctMatch = pageText.match(/Distinct Songs[:\s]*(\d+)/i);
    if (distinctMatch) {
      distinctSongs = parseInt(distinctMatch[1]);
    }

    // Get first/last appearance dates from tour dates section
    let firstAppearanceDate: string | null = null;
    let lastAppearanceDate: string | null = null;

    // Find all show links and get dates
    const showDates: string[] = [];
    $("a[href*='TourShowSet.aspx']").each((_, el) => {
      const text = $(el).text().trim();
      const parsed = parseDate(text);
      if (parsed) {
        showDates.push(parsed);
      }
    });

    if (showDates.length > 0) {
      showDates.sort();
      firstAppearanceDate = showDates[0];
      lastAppearanceDate = showDates[showDates.length - 1];
    }

    // Get albums
    const albums: string[] = [];
    $("a[href*='ReleaseView.aspx']").each((_, el) => {
      const albumName = $(el).text().trim();
      if (albumName && !albums.includes(albumName)) {
        albums.push(albumName);
      }
    });

    return {
      originalId: guestId,
      name,
      instruments,
      totalAppearances,
      distinctSongs,
      firstAppearanceDate,
      lastAppearanceDate,
      albums,
    };
  } catch (error) {
    console.error(`Error scraping guest ${guestId}:`, error);
    return null;
  }
}

async function main() {
  console.log("Scraping guest details from DMBAlmanac.com...\n");

  // Load guest IDs
  const guestIdsPath = join(OUTPUT_DIR, "all-guest-ids.json");
  if (!existsSync(guestIdsPath)) {
    console.error("Run get-all-guest-ids.ts first to get guest IDs");
    process.exit(1);
  }

  const guestIdsData = JSON.parse(readFileSync(guestIdsPath, "utf-8"));
  const guestList = guestIdsData.guests as { id: string; name: string }[];
  console.log(`Found ${guestList.length} guests to scrape`);

  // Load checkpoint if exists
  const checkpointPath = join(OUTPUT_DIR, "guest-details-checkpoint.json");
  let completedIds = new Set<string>();
  let allDetails: GuestDetail[] = [];

  if (existsSync(checkpointPath)) {
    const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf-8"));
    completedIds = new Set(checkpoint.completedIds || []);
    allDetails = checkpoint.details || [];
    console.log(`Resuming from checkpoint: ${completedIds.size} guests completed`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Filter out completed guests
    const remaining = guestList.filter(g => !completedIds.has(g.id));
    console.log(`${remaining.length} guests remaining to scrape\n`);

    // Scrape each guest
    let processed = 0;
    const total = remaining.length;

    for (const guest of remaining) {
      const detail = await scrapeGuestPage(page, guest.id);

      if (detail) {
        allDetails.push(detail);
        completedIds.add(guest.id);
        console.log(`  [${++processed}/${total}] ${detail.name} - appearances: ${detail.totalAppearances || "?"}, instruments: ${detail.instruments.join(", ") || "?"}`);
      } else {
        console.log(`  [${++processed}/${total}] FAILED: ${guest.name}`);
        completedIds.add(guest.id); // Skip failed ones
      }

      // Save checkpoint every 20 guests
      if (processed % 20 === 0) {
        const checkpoint = {
          completedIds: Array.from(completedIds),
          details: allDetails,
        };
        writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
        console.log(`    (checkpoint saved)`);
      }

      // Rate limit
      await delay(1500 + Math.random() * 1000);
    }

    // Save final output
    const output = {
      scrapedAt: new Date().toISOString(),
      source: BASE_URL,
      total: allDetails.length,
      guests: allDetails,
    };

    const outputPath = join(OUTPUT_DIR, "guest-details.json");
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nSaved ${allDetails.length} guest details to ${outputPath}`);

    // Print summary
    console.log("\nSummary:");
    console.log(`  Total guests: ${allDetails.length}`);
    console.log(`  With appearances: ${allDetails.filter(g => g.totalAppearances).length}`);
    console.log(`  With instruments: ${allDetails.filter(g => g.instruments.length > 0).length}`);

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
    console.error("Failed:", error);
    process.exit(1);
  });
