import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { delay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml } from "../utils/cache.js";
import { normalizeWhitespace, parseDate } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

export interface ScrapedLiberationEntry {
  songId: string;
  songTitle: string;
  lastPlayedDate: string; // ISO format YYYY-MM-DD
  lastPlayedShowId: string;
  daysSince: number;
  showsSince: number;
  notes?: string;
  configuration: "full_band" | "dave_tim" | "dave_solo";
  isLiberated: boolean;
  liberatedDate?: string;
  liberatedShowId?: string;
}

export interface LiberationOutput {
  scrapedAt: string;
  source: string;
  totalItems: number;
  entries: ScrapedLiberationEntry[];
}

// Parse the Liberation List page
async function parseLiberationPage(page: Page): Promise<ScrapedLiberationEntry[]> {
  console.log("Fetching Liberation List...");

  const url = `${BASE_URL}/Liberation.aspx`;

  try {
    // Check cache first
    let html = getCachedHtml(url);

    if (!html) {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    }

    const $ = cheerio.load(html);
    const entries: ScrapedLiberationEntry[] = [];

    // Find the liberation list table
    const liberationTable = $("table.liberation-list");

    if (liberationTable.length === 0) {
      console.warn("Liberation list table not found");
      return [];
    }

    // Parse each row in the table body
    liberationTable.find("tbody tr").each((_, row) => {
      const $row = $(row);

      // Check if this is a liberated song (has special background color)
      const isLiberated = $row.attr("style")?.includes("background-color") || false;

      // Extract song title and ID
      const songLink = $row.find("td.rowcell.lj a[href*='summary.aspx']").first();
      if (songLink.length === 0) return;

      const songTitle = normalizeWhitespace(songLink.text());
      const songHref = songLink.attr("href") || "";
      const songIdMatch = songHref.match(/sid=(\d+)/);
      if (!songIdMatch) return;
      const songId = songIdMatch[1];

      // Extract last played date and show ID
      const lastPlayedLink = $row.find("td.rowcell.cj a[href*='TourShowSet']").first();
      if (lastPlayedLink.length === 0) return;

      const lastPlayedDateText = normalizeWhitespace(lastPlayedLink.text());
      const lastPlayedHref = lastPlayedLink.attr("href") || "";
      const showIdMatch = lastPlayedHref.match(/id=(\d+)/);
      if (!showIdMatch) return;
      const lastPlayedShowId = showIdMatch[1];

      // Parse date from format like "1.26.93" to "1993-01-26"
      let lastPlayedDate = "";
      const dateMatch = lastPlayedDateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      if (dateMatch) {
        let [, month, day, year] = dateMatch;
        // Handle 2-digit years
        if (year.length === 2) {
          const yearNum = parseInt(year, 10);
          year = yearNum > 50 ? `19${year}` : `20${year}`;
        }
        lastPlayedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }

      // Extract days since and shows since
      const daysSinceCell = $row.find("td.rowcell.cj.d-none.d-sm-table-cell").eq(0);
      const showsSinceCell = $row.find("td.rowcell.cj.d-none.d-sm-table-cell").eq(1);

      const daysSince = parseInt(normalizeWhitespace(daysSinceCell.text()), 10) || 0;
      const showsSince = parseInt(normalizeWhitespace(showsSinceCell.text()), 10) || 0;

      // Extract notes
      const notesCell = $row.find("td.endcell.lj");
      let notes: string | undefined = normalizeWhitespace(notesCell.text());

      // Parse liberation info from notes if present
      let liberatedDate: string | undefined;
      let liberatedShowId: string | undefined;

      if (isLiberated) {
        const liberatedLink = notesCell.find("a[href*='TourShowSet']").last();
        if (liberatedLink.length > 0) {
          const liberatedHref = liberatedLink.attr("href") || "";
          const liberatedShowMatch = liberatedHref.match(/id=(\d+)/);
          if (liberatedShowMatch) {
            liberatedShowId = liberatedShowMatch[1];
          }

          const liberatedText = normalizeWhitespace(liberatedLink.text());
          const liberatedDateMatch = liberatedText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
          if (liberatedDateMatch) {
            let [, month, day, year] = liberatedDateMatch;
            if (year.length === 2) {
              const yearNum = parseInt(year, 10);
              year = yearNum > 50 ? `19${year}` : `20${year}`;
            }
            liberatedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
        }
      }

      // Determine configuration based on notes
      let configuration: "full_band" | "dave_tim" | "dave_solo" = "full_band";

      const notesLower = notes.toLowerCase();
      if (
        notesLower.includes("dave & tim") ||
        notesLower.includes("dave and tim")
      ) {
        configuration = "dave_tim";
      } else if (
        notesLower.includes("dave solo") ||
        notesLower.includes("played by dave solo")
      ) {
        configuration = "dave_solo";
      } else if (
        notesLower.includes("never played without") ||
        notesLower.includes("never fully played")
      ) {
        // Songs that can't be played without certain members default to full_band
        configuration = "full_band";
      }

      // Remove liberation marker from notes
      notes = notes.replace(/-=LIBERATED on [^=]+=- ?/g, "").trim();
      if (notes === "") notes = undefined;

      entries.push({
        songId,
        songTitle,
        lastPlayedDate,
        lastPlayedShowId,
        daysSince,
        showsSince,
        notes,
        configuration,
        isLiberated,
        liberatedDate,
        liberatedShowId,
      });
    });

    console.log(`Parsed ${entries.length} liberation list entries`);
    return entries;
  } catch (error) {
    console.error(`Error parsing Liberation page:`, error);
    return [];
  }
}

// Main scraper function
export async function scrapeLiberationList(): Promise<ScrapedLiberationEntry[]> {
  console.log("Starting liberation list scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to be polite
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const entries = await parseLiberationPage(page);
    return entries;
  } finally {
    await browser.close();
  }
}

// Save liberation list to JSON file
export function saveLiberationList(entries: ScrapedLiberationEntry[]): void {
  const output: LiberationOutput = {
    scrapedAt: new Date().toISOString(),
    source: `${BASE_URL}/Liberation.aspx`,
    totalItems: entries.length,
    entries,
  };

  const filepath = join(OUTPUT_DIR, "liberation.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${entries.length} liberation list entries to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeLiberationList()
    .then((entries) => {
      saveLiberationList(entries);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
