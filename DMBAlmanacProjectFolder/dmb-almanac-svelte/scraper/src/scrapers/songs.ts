import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { ScrapedSong } from "../types.js";
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { parseDate, normalizeWhitespace, slugify, createSortTitle } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Get all song URLs from the songs index page
async function getSongUrls(page: Page): Promise<string[]> {
  console.log("Fetching song URLs...");

  await page.goto(`${BASE_URL}/SongSearchResult.aspx`, { waitUntil: "networkidle" });
  const html = await page.content();
  const $ = cheerio.load(html);

  const songUrls: string[] = [];

  // Find all song links
  $("a[href*='SongStats.aspx']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;
      if (!songUrls.includes(fullUrl)) {
        songUrls.push(fullUrl);
      }
    }
  });

  console.log(`Found ${songUrls.length} songs`);
  return songUrls;
}

// Parse a single song page
async function parseSongPage(page: Page, songUrl: string): Promise<ScrapedSong | null> {
  try {
    // Check cache first
    let html = getCachedHtml(songUrl);

    if (!html) {
      await page.goto(songUrl, { waitUntil: "networkidle" });
      html = await page.content();
      cacheHtml(songUrl, html);
    }

    const $ = cheerio.load(html);

    // Extract song ID from URL
    const sidMatch = songUrl.match(/sid=(\d+)/);
    const originalId = sidMatch ? sidMatch[1] : undefined;

    // Parse song title
    const title = normalizeWhitespace($("h1, .song-title").first().text());

    if (!title) {
      console.warn(`No title found for ${songUrl}`);
      return null;
    }

    // Check if it's a cover
    const pageText = $("body").text().toLowerCase();
    const isCover =
      pageText.includes("cover") ||
      pageText.includes("originally by") ||
      pageText.includes("written by");

    // Try to find original artist for covers
    let originalArtist: string | undefined;
    const coverMatch = pageText.match(/originally by\s+([^.]+)/i) ||
      pageText.match(/written by\s+([^.]+)/i);
    if (coverMatch) {
      originalArtist = normalizeWhitespace(coverMatch[1]);
    }

    // Parse first/last played dates
    let firstPlayedDate: string | undefined;
    let lastPlayedDate: string | undefined;
    let totalPlays: number | undefined;

    // Look for statistics table or text
    const statsText = $(".stats, .song-stats, table").text();

    const firstMatch = statsText.match(/first(?:\s+played)?[:\s]+(\w+\s+\d+,?\s+\d{4})/i);
    if (firstMatch) {
      firstPlayedDate = parseDate(firstMatch[1]);
    }

    const lastMatch = statsText.match(/last(?:\s+played)?[:\s]+(\w+\s+\d+,?\s+\d{4})/i);
    if (lastMatch) {
      lastPlayedDate = parseDate(lastMatch[1]);
    }

    const playsMatch = statsText.match(/(\d+)\s+(?:times?|performances?)/i);
    if (playsMatch) {
      totalPlays = parseInt(playsMatch[1], 10);
    }

    // Parse lyrics if present
    let lyrics: string | undefined;
    const lyricsEl = $(".lyrics, .song-lyrics, pre");
    if (lyricsEl.length) {
      lyrics = lyricsEl.text().trim();
    }

    // Parse notes
    const notesEl = $(".notes, .song-notes");
    const notes = notesEl.length ? normalizeWhitespace(notesEl.text()) : undefined;

    return {
      originalId,
      title,
      originalArtist,
      isCover,
      lyrics,
      notes,
      firstPlayedDate,
      lastPlayedDate,
      totalPlays,
    };
  } catch (error) {
    console.error(`Error parsing song ${songUrl}:`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllSongs(): Promise<ScrapedSong[]> {
  console.log("Starting song scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Check for existing checkpoint
    const checkpoint = loadCheckpoint<{
      completedUrls: string[];
      songs: ScrapedSong[];
    }>("songs");

    const completedUrls = new Set(checkpoint?.completedUrls || []);
    const allSongs: ScrapedSong[] = checkpoint?.songs || [];

    // Get all song URLs
    const songUrls = await getSongUrls(page);

    // Filter out already completed
    const remainingUrls = songUrls.filter((url) => !completedUrls.has(url));
    console.log(`${remainingUrls.length} songs remaining to scrape`);

    // Rate limiter queue
    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000,
    });

    let processed = 0;
    const total = remainingUrls.length;

    // Parse each song
    for (const songUrl of remainingUrls) {
      await queue.add(async () => {
        const song = await parseSongPage(page, songUrl);
        if (song) {
          allSongs.push(song);
          completedUrls.add(songUrl);
          console.log(`  [${++processed}/${total}] ${song.title}`);
        }
        await randomDelay(1000, 3000);
      });

      // Save checkpoint every 50 songs
      if (processed % 50 === 0 && processed > 0) {
        saveCheckpoint("songs", {
          completedUrls: Array.from(completedUrls),
          songs: allSongs,
        });
      }
    }

    await queue.onIdle();

    return allSongs;
  } finally {
    await browser.close();
  }
}

// Save songs to JSON file
export function saveSongs(songs: ScrapedSong[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: songs.length,
    songs,
  };

  const filepath = join(OUTPUT_DIR, "songs.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${songs.length} songs to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllSongs()
    .then((songs) => {
      saveSongs(songs);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
