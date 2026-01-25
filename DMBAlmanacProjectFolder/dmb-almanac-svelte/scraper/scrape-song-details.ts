/**
 * Scrape detailed song information from DMBAlmanac.com
 * Extracts: composer, first/last played, total plays, avg length, etc.
 */

import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = "./output";
const DB_PATH = join(process.cwd(), "..", "data", "dmb-almanac.db");

interface SongDetail {
  originalId: string;
  title: string;
  composer: string | null;
  composerYear: number | null;
  albumId: string | null;
  albumName: string | null;
  isCover: boolean;
  originalArtist: string | null;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
  totalPlays: number | null;
  avgLengthSeconds: number | null;
  songHistory: string | null;
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

function parseLengthToSeconds(timeStr: string): number | null {
  // Input: "4:21" or "4:21:15"
  const parts = timeStr.split(":").map(p => parseInt(p));
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

async function scrapeSongPage(page: Page, songId: string): Promise<SongDetail | null> {
  try {
    const url = `${BASE_URL}/SongStats.aspx?sid=${songId}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Get song title from h1
    const title = $("h1").first().text().trim();
    if (!title) {
      console.log(`  No title found for sid=${songId}`);
      return null;
    }

    // Get composer info
    let composer: string | null = null;
    let composerYear: number | null = null;

    const composerDiv = $(".sidebar .field").filter((_, el) => {
      return $(el).find(".newsitem").text().includes("Composer");
    }).find(".indent").text();

    if (composerDiv) {
      const composerMatch = composerDiv.match(/([^(]+)\s*\((\d{4})\)/);
      if (composerMatch) {
        composer = composerMatch[1].trim();
        composerYear = parseInt(composerMatch[2]);
      } else {
        composer = composerDiv.trim();
      }
    }

    // Get album info
    let albumId: string | null = null;
    let albumName: string | null = null;

    const albumLink = $(".sidebar a[href*='ReleaseView.aspx']").first();
    if (albumLink.length) {
      albumName = albumLink.text().trim();
      const hrefMatch = albumLink.attr("href")?.match(/release=(\d+)/);
      if (hrefMatch) {
        albumId = hrefMatch[1];
      }
    }

    // Check if cover
    const pageText = $("body").text().toLowerCase();
    const isCover = pageText.includes("cover") ||
                    pageText.includes("originally by") ||
                    pageText.includes("written by") && !composer?.toLowerCase().includes("matthews");

    let originalArtist: string | null = null;
    if (isCover) {
      const artistMatch = pageText.match(/originally by\s+([^\n.]+)/i) ||
                         pageText.match(/written by\s+([^\n.]+)/i);
      if (artistMatch) {
        originalArtist = artistMatch[1].trim();
      }
    }

    // Get stats from table
    let firstPlayedDate: string | null = null;
    let lastPlayedDate: string | null = null;
    let totalPlays: number | null = null;
    let avgLengthSeconds: number | null = null;

    // Find the stats table - look for DMB row
    const statsTable = $("table.stat-table");
    if (statsTable.length) {
      // Get the DMB row (first row usually)
      const dmbRow = statsTable.find("tbody tr").filter((_, el) => {
        return $(el).text().includes("Dave Matthews Band");
      }).first();

      if (dmbRow.length) {
        const cells = dmbRow.find("td");

        // First Show link
        const firstShowLink = cells.eq(1).find("a");
        if (firstShowLink.length) {
          const dateText = firstShowLink.text().trim();
          firstPlayedDate = parseDate(dateText);
        }

        // Last Show link
        const lastShowLink = cells.eq(2).find("a");
        if (lastShowLink.length) {
          const dateText = lastShowLink.text().trim();
          lastPlayedDate = parseDate(dateText);
        }

        // Avg Length
        const avgLength = cells.eq(3).text().trim();
        if (avgLength) {
          avgLengthSeconds = parseLengthToSeconds(avgLength);
        }

        // Play Count
        const playCount = cells.eq(4).text().trim();
        if (playCount) {
          totalPlays = parseInt(playCount);
        }
      }

      // If no DMB row, try to get from any row
      if (!firstPlayedDate) {
        const anyRow = statsTable.find("tbody tr").first();
        if (anyRow.length) {
          const cells = anyRow.find("td");
          const firstShowLink = cells.eq(1).find("a");
          if (firstShowLink.length) {
            firstPlayedDate = parseDate(firstShowLink.text().trim());
          }
          const lastShowLink = cells.eq(2).find("a");
          if (lastShowLink.length) {
            lastPlayedDate = parseDate(lastShowLink.text().trim());
          }
        }
      }
    }

    // Get song history
    let songHistory: string | null = null;
    const historyDiv = $(".sidebar .field").filter((_, el) => {
      return $(el).find("h2").text().includes("Song History");
    }).find(".indent").text();

    if (historyDiv) {
      songHistory = historyDiv.trim().substring(0, 2000);
    }

    return {
      originalId: songId,
      title,
      composer,
      composerYear,
      albumId,
      albumName,
      isCover,
      originalArtist,
      firstPlayedDate,
      lastPlayedDate,
      totalPlays,
      avgLengthSeconds,
      songHistory,
    };
  } catch (error) {
    console.error(`Error scraping song ${songId}:`, error);
    return null;
  }
}

async function main() {
  console.log("Scraping song details from DMBAlmanac.com...\n");

  // Get all song IDs from our database
  const db = new Database(DB_PATH);
  const songs = db.prepare(`
    SELECT id, title, slug
    FROM songs
    ORDER BY title
  `).all() as { id: number; title: string; slug: string }[];

  console.log(`Found ${songs.length} songs in database`);

  // Load checkpoint if exists
  const checkpointPath = join(OUTPUT_DIR, "song-details-checkpoint.json");
  let completedIds = new Set<string>();
  let allDetails: SongDetail[] = [];

  if (existsSync(checkpointPath)) {
    const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf-8"));
    completedIds = new Set(checkpoint.completedIds || []);
    allDetails = checkpoint.details || [];
    console.log(`Resuming from checkpoint: ${completedIds.size} songs completed`);
  }

  // Get song URLs from the site to map titles to IDs
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // First, get all song IDs from the song dropdown on any song page
    console.log("\nFetching song list from site dropdown...");
    await page.goto(`${BASE_URL}/SongStats.aspx?sid=1`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Get all songs from the dropdown
    const songLinks: { id: string; title: string }[] = [];
    $("#SongNav_ddlSongSelect option").each((_, el) => {
      const value = $(el).attr("value");
      const title = $(el).text().trim();
      if (value && title && title.length > 0) {
        songLinks.push({ id: value, title });
      }
    });

    console.log(`Found ${songLinks.length} songs on site`);

    // Filter out completed songs
    const remaining = songLinks.filter(s => !completedIds.has(s.id));
    console.log(`${remaining.length} songs remaining to scrape\n`);

    // Scrape each song
    let processed = 0;
    const total = remaining.length;

    for (const song of remaining) {
      const detail = await scrapeSongPage(page, song.id);

      if (detail) {
        allDetails.push(detail);
        completedIds.add(song.id);
        console.log(`  [${++processed}/${total}] ${detail.title} - plays: ${detail.totalPlays || "?"}, first: ${detail.firstPlayedDate || "?"}`);
      } else {
        console.log(`  [${++processed}/${total}] FAILED: ${song.title}`);
      }

      // Save checkpoint every 20 songs
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
      songs: allDetails,
    };

    const outputPath = join(OUTPUT_DIR, "song-details.json");
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nSaved ${allDetails.length} song details to ${outputPath}`);

    // Print summary
    console.log("\nSummary:");
    console.log(`  Total songs: ${allDetails.length}`);
    console.log(`  With first played date: ${allDetails.filter(s => s.firstPlayedDate).length}`);
    console.log(`  With play counts: ${allDetails.filter(s => s.totalPlays).length}`);
    console.log(`  Covers: ${allDetails.filter(s => s.isCover).length}`);

  } finally {
    await browser.close();
    db.close();
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
