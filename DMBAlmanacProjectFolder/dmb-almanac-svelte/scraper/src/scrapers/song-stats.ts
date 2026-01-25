import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace, parseDuration, parseDate } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Enhanced song statistics interface
export interface SongStatistics {
  originalId: string;
  title: string;

  // Slot breakdown
  slotBreakdown: {
    opener: number;
    set1Closer: number;
    set2Opener: number;
    closer: number;
    midset: number;
    encore: number;
    encore2: number;
  };

  // Version types
  versionTypes: {
    full: number;
    tease: number;
    partial: number;
    reprise: number;
    fake: number;
    aborted: number;
  };

  // Duration stats
  avgLengthSeconds: number | null;
  longestVersion: {
    durationSeconds: number;
    date: string;
    showId: string;
    venue: string;
  } | null;
  shortestVersion: {
    durationSeconds: number;
    date: string;
    showId: string;
    venue: string;
  } | null;

  // Segue information
  topSeguesInto: Array<{
    songTitle: string;
    songId: string;
    count: number;
  }>;
  topSeguesFrom: Array<{
    songTitle: string;
    songId: string;
    count: number;
  }>;

  // Release counts by type
  releaseCounts: {
    total: number;
    studio: number;
    live: number;
    dmblive: number;
    warehouse: number;
    liveTrax: number;
    broadcasts: number;
  };

  // Play breakdown by year
  playsByYear: Array<{
    year: number;
    plays: number;
  }>;

  // Artist-specific stats (DMB vs Dave & Tim)
  artistStats: Array<{
    artistName: string;
    playCount: number;
    avgLength: number | null;
    percentOfTotal: number;
  }>;

  // Liberation/gap stats
  liberations: Array<{
    lastPlayedDate: string;
    lastPlayedShowId: string;
    daysSince: number;
    showsSince: number;
    liberationDate: string;
    liberationShowId: string;
  }>;

  // Additional metadata
  totalPlays: number;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
  yearsActive: number;
  currentGap: {
    days: number;
    shows: number;
  } | null;

  // Full performance history
  performances: import("../types.js").SongPerformance[];
}

// Get song IDs from previously scraped data
function getSongIds(): Array<{ id: string; title: string }> {
  const songDetailsPath = join(OUTPUT_DIR, "song-details.json");
  const allSongIdsPath = join(OUTPUT_DIR, "all-song-ids.json");

  // Try song-details.json first (has more complete data)
  if (existsSync(songDetailsPath)) {
    const data = JSON.parse(readFileSync(songDetailsPath, "utf-8"));
    if (data.songs && Array.isArray(data.songs)) {
      return data.songs
        .filter((s: any) => s.originalId)
        .map((s: any) => ({ id: s.originalId, title: s.title }));
    }
  }

  // Fallback to all-song-ids.json
  if (existsSync(allSongIdsPath)) {
    const data = JSON.parse(readFileSync(allSongIdsPath, "utf-8"));
    if (data.songIds && Array.isArray(data.songIds)) {
      return data.songIds;
    }
  }

  throw new Error("No song data found. Run scrape:songs first to generate song IDs.");
}

// Parse slot breakdown from page
function parseSlotBreakdown($: cheerio.CheerioAPI): SongStatistics["slotBreakdown"] {
  const text = $("body").text();

  // These are extracted from SQL query comments in the HTML
  // Look for patterns like "opener: 5" or in table cells
  const extractCount = (pattern: RegExp): number => {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : 0;
  };

  return {
    opener: extractCount(/opener[:\s]+(\d+)/i) ||
      parseInt($(".opener").text().trim(), 10) || 0,
    set1Closer: extractCount(/set1closer[:\s]+(\d+)/i) ||
      parseInt($(".set1closer").text().trim(), 10) || 0,
    set2Opener: extractCount(/set2opener[:\s]+(\d+)/i) ||
      parseInt($(".set2opener").text().trim(), 10) || 0,
    closer: extractCount(/(?:set2closer|closer)[:\s]+(\d+)/i) ||
      parseInt($(".closer").text().trim(), 10) || 0,
    midset: extractCount(/midset[:\s]+(\d+)/i) ||
      parseInt($(".midset").text().trim(), 10) || 0,
    encore: extractCount(/encore[:\s]+(\d+)/i) ||
      parseInt($(".encore").text().trim(), 10) || 0,
    encore2: extractCount(/encore2[:\s]+(\d+)/i) ||
      parseInt($(".encore2").text().trim(), 10) || 0,
  };
}

// Parse version types from page
function parseVersionTypes($: cheerio.CheerioAPI): SongStatistics["versionTypes"] {
  const text = $("body").text();

  const extractCount = (pattern: RegExp): number => {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : 0;
  };

  return {
    full: extractCount(/(?:full|complete)\s+versions?[:\s]+(\d+)/i) ||
      extractCount(/FullVersions[:\s]+(\d+)/i),
    tease: extractCount(/tease[:\s]+(\d+)/i) ||
      extractCount(/TeaseVersions[:\s]+(\d+)/i),
    partial: extractCount(/partial[:\s]+(\d+)/i) ||
      extractCount(/PartialVersions[:\s]+(\d+)/i),
    reprise: extractCount(/reprise[:\s]+(\d+)/i) ||
      extractCount(/RepriseVersions[:\s]+(\d+)/i),
    fake: extractCount(/fake[:\s]+(\d+)/i) ||
      extractCount(/FakeVersions[:\s]+(\d+)/i),
    aborted: extractCount(/aborted[:\s]+(\d+)/i) ||
      extractCount(/AbortedVersions[:\s]+(\d+)/i),
  };
}

// Parse longest and shortest versions
function parseDurationExtremes(
  $: cheerio.CheerioAPI
): {
  longest: SongStatistics["longestVersion"];
  shortest: SongStatistics["shortestVersion"];
} {
  let longest: SongStatistics["longestVersion"] = null;
  let shortest: SongStatistics["shortestVersion"] = null;

  // Look for duration tables or lists
  $("table tr, .song-performance").each((_, el) => {
    const $el = $(el);
    const text = $el.text();

    // Check for duration patterns like "12:34"
    const durationMatch = text.match(/(\d+):(\d{2})/);
    if (!durationMatch) return;

    const minutes = parseInt(durationMatch[1], 10);
    const seconds = parseInt(durationMatch[2], 10);
    const totalSeconds = minutes * 60 + seconds;

    // Skip unrealistic durations (< 30s or > 30 minutes)
    if (totalSeconds < 30 || totalSeconds > 1800) return;

    // Try to find date
    const dateMatch = text.match(/(\d{1,2}[./]\d{1,2}[./]\d{2,4})/);
    if (!dateMatch) return;

    // Try to find show link
    const showLink = $el.find("a[href*='ShowSetlist']");
    const showId = showLink.attr("href")?.match(/id=(\d+)/)?.[1] || "";

    // Get venue name
    const venueLink = $el.find("a[href*='VenueStats']");
    const venue = venueLink.text().trim() || "Unknown";

    const performance = {
      durationSeconds: totalSeconds,
      date: dateMatch[1],
      showId,
      venue,
    };

    if (!longest || totalSeconds > longest.durationSeconds) {
      longest = performance;
    }
    if (!shortest || totalSeconds < shortest.durationSeconds) {
      shortest = performance;
    }
  });

  return { longest, shortest };
}

// Parse top segues (songs this song transitions into)
function parseTopSegues($: cheerio.CheerioAPI): SongStatistics["topSeguesInto"] {
  const segues: Array<{ songTitle: string; songId: string; count: number }> = [];

  // Look for segue tables or lists
  $("table").each((_, table) => {
    const $table = $(table);
    const headerText = $table.prev().text().toLowerCase();

    // Check if this is a segue table (songs this song transitions into)
    if (
      headerText.includes("top segue") ||
      headerText.includes("transitions into") ||
      headerText.includes("followed by") ||
      headerText.includes("segues into")
    ) {
      $table.find("tr").each((_, row) => {
        const $row = $(row);
        const songLink = $row.find("a[href*='summary.aspx?sid']");

        if (songLink.length === 0) return;

        const songTitle = normalizeWhitespace(songLink.text());
        const songId = songLink.attr("href")?.match(/sid=(\d+)/)?.[1] || "";

        // Look for count in the row
        const countMatch = $row.text().match(/(\d+)\s*(?:times?|x|count)?/i);
        const count = countMatch ? parseInt(countMatch[1], 10) : 1;

        if (songTitle && songId) {
          segues.push({ songTitle, songId, count });
        }
      });
    }
  });

  // Sort by count descending and take top 10
  return segues
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// Parse top segues from (songs that segue into this song)
function parseTopSeguesFrom($: cheerio.CheerioAPI): SongStatistics["topSeguesFrom"] {
  const segues: Array<{ songTitle: string; songId: string; count: number }> = [];

  // Look for "preceded by" or "came from" tables
  $("table").each((_, table) => {
    const $table = $(table);
    const headerText = $table.prev().text().toLowerCase();

    // Check if this is a "preceded by" or "came from" segue table
    if (
      headerText.includes("preceded") ||
      headerText.includes("came from") ||
      headerText.includes("segued from") ||
      headerText.includes("transitions from")
    ) {
      $table.find("tr").each((_, row) => {
        const $row = $(row);
        const songLink = $row.find("a[href*='summary.aspx?sid']");

        if (songLink.length === 0) return;

        const songTitle = normalizeWhitespace(songLink.text());
        const songId = songLink.attr("href")?.match(/sid=(\d+)/)?.[1] || "";

        // Look for count in the row
        const countMatch = $row.text().match(/(\d+)\s*(?:times?|x|count)?/i);
        const count = countMatch ? parseInt(countMatch[1], 10) : 1;

        if (songTitle && songId) {
          segues.push({ songTitle, songId, count });
        }
      });
    }
  });

  // Sort by count descending and take top 10
  return segues
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// Parse plays by year
function parsePlaysByYear($: cheerio.CheerioAPI): SongStatistics["playsByYear"] {
  const playsByYear: Array<{ year: number; plays: number }> = [];

  // Look for year breakdown tables
  $("table").each((_, table) => {
    const $table = $(table);
    const headerText = $table.prev().text().toLowerCase();

    if (
      headerText.includes("by year") ||
      headerText.includes("year breakdown") ||
      headerText.includes("performances by year")
    ) {
      $table.find("tr").each((_, row) => {
        const $row = $(row);
        const text = $row.text();

        // Look for year pattern (1991-2026)
        const yearMatch = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
        if (!yearMatch) return;

        const year = parseInt(yearMatch[1], 10);

        // Find count in the same row
        const countMatch = text.match(/(\d+)\s*(?:times?|plays?|performances?)?/i);
        const plays = countMatch ? parseInt(countMatch[1], 10) : 0;

        if (year >= 1991 && year <= 2026 && plays > 0) {
          playsByYear.push({ year, plays });
        }
      });
    }
  });

  return playsByYear.sort((a, b) => a.year - b.year);
}

// Parse release counts
function parseReleaseCounts($: cheerio.CheerioAPI): SongStatistics["releaseCounts"] {
  const text = $("body").text();

  const extractCount = (pattern: RegExp): number => {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : 0;
  };

  const totalReleases = extractCount(/(\d+)\s+(?:official\s+)?releases?/i);
  const broadcasts = extractCount(/(\d+)\s+broadcasts?/i);

  return {
    total: totalReleases,
    studio: extractCount(/(\d+)\s+studio/i),
    live: extractCount(/(\d+)\s+live\s+(?:releases?|albums?)/i),
    dmblive: extractCount(/(\d+)\s+dmblive/i),
    warehouse: extractCount(/(\d+)\s+warehouse/i),
    liveTrax: extractCount(/(\d+)\s+live\s*trax/i),
    broadcasts,
  };
}

// Parse liberation/gap information
function parseLiberations($: cheerio.CheerioAPI): SongStatistics["liberations"] {
  const liberations: SongStatistics["liberations"] = [];

  $("table").each((_, table) => {
    const $table = $(table);
    const headerText = $table.prev().text().toLowerCase();

    if (headerText.includes("liberation") || headerText.includes("gap")) {
      $table.find("tr").each((_, row) => {
        const $row = $(row);

        // Find show links
        const showLinks = $row.find("a[href*='ShowSetlist']");
        if (showLinks.length < 2) return;

        const lastPlayedLink = $(showLinks[0]);
        const liberationLink = $(showLinks[1]);

        const lastPlayedShowId = lastPlayedLink.attr("href")?.match(/id=(\d+)/)?.[1] || "";
        const liberationShowId = liberationLink.attr("href")?.match(/id=(\d+)/)?.[1] || "";

        // Parse dates and gaps from text
        const text = $row.text();
        const daysMatch = text.match(/(\d+)\s+days?/i);
        const showsMatch = text.match(/(\d+)\s+shows?/i);

        liberations.push({
          lastPlayedDate: lastPlayedLink.text().trim(),
          lastPlayedShowId,
          daysSince: daysMatch ? parseInt(daysMatch[1], 10) : 0,
          showsSince: showsMatch ? parseInt(showsMatch[1], 10) : 0,
          liberationDate: liberationLink.text().trim(),
          liberationShowId,
        });
      });
    }
  });

  return liberations;
}

// Parse artist-specific statistics (DMB vs Dave & Tim)
function parseArtistStats($: cheerio.CheerioAPI): SongStatistics["artistStats"] {
  const artistStats: SongStatistics["artistStats"] = [];
  const text = $("body").text();

  // Look for DMB-specific plays
  const dmbMatch = text.match(/(?:dave\s+matthews\s+band|dmb)[^\d]*(\d+)\s+times?/i);
  const dtMatch = text.match(/(?:dave\s+&\s+tim|d&t)[^\d]*(\d+)\s+times?/i);

  if (dmbMatch) {
    const plays = parseInt(dmbMatch[1], 10);
    artistStats.push({
      artistName: "Dave Matthews Band",
      playCount: plays,
      avgLength: null, // Would need more parsing
      percentOfTotal: 0, // Will calculate after
    });
  }

  if (dtMatch) {
    const plays = parseInt(dtMatch[1], 10);
    artistStats.push({
      artistName: "Dave & Tim",
      playCount: plays,
      avgLength: null,
      percentOfTotal: 0,
    });
  }

  // Calculate percentages
  const totalPlays = artistStats.reduce((sum, stat) => sum + stat.playCount, 0);
  if (totalPlays > 0) {
    artistStats.forEach((stat) => {
      stat.percentOfTotal = (stat.playCount / totalPlays) * 100;
    });
  }

  return artistStats;
}

// Parse full performance history
function parsePerformanceHistory($: cheerio.CheerioAPI, songId: string): import("../types.js").SongPerformance[] {
  const performances: import("../types.js").SongPerformance[] = [];

  $("table").each((_, table) => {
    const $table = $(table);
    const hasShowLinks = $table.find("a[href*='ShowSetlist']").length > 5;

    if (hasShowLinks) {
      $table.find("tr").each((_, row) => {
        const $row = $(row);
        const showLink = $row.find("a[href*='ShowSetlist'], a[href*='TourShowSet']").first();

        if (showLink.length > 0) {
          const showHref = showLink.attr("href") || "";
          const showIdMatch = showHref.match(/id=(\d+)/);

          if (!showIdMatch) return;
          const showId = showIdMatch[1];

          const dateText = showLink.text().trim();
          let date = "";
          const dateMatch = dateText.match(/(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{2,4})/);
          if (dateMatch) {
            const [, month, day, yearShort] = dateMatch;
            let fullYear = parseInt(yearShort, 10);
            if (fullYear < 100) fullYear += fullYear < 50 ? 2000 : 1900;
            date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          const venueLink = $row.find("a[href*='VenueStats']").first();
          const venue = normalizeWhitespace(venueLink.text());

          const cells = $row.find("td");
          const locationText = cells.eq(2).text().trim();
          let city = "", state = "", country = "USA";

          const locMatch = locationText.match(/([^,]+)(?:,\s*([A-Z]{2,3}))?/);
          if (locMatch) {
            city = locMatch[1].trim();
            state = locMatch[2] || "";
            if (state.length > 2) { country = state; state = ""; }
          }

          const notesText = cells.last().text().trim();

          let version: any = "full";
          let isTease = false;
          let isSegue = false;

          const lowerNotes = notesText.toLowerCase();
          if (lowerNotes.includes("tease")) { version = "tease"; isTease = true; }
          else if (lowerNotes.includes("partial")) version = "partial";
          else if (lowerNotes.includes("reprise")) version = "reprise";
          else if (lowerNotes.includes("fake")) version = "fake";
          else if (lowerNotes.includes("aborted")) version = "aborted";

          if (notesText.includes("->") || notesText.includes("»") || notesText.includes(">")) {
            isSegue = true;
          }

          const hasRelease = $row.find("img[src*='album'], img[src*='cd']").length > 0;

          const durationMatch = $row.text().match(/(\d+):(\d{2})/);
          const duration = durationMatch ? durationMatch[0] : undefined;

          if (date) {
            performances.push({
              showId,
              date,
              venue,
              city,
              state,
              country,
              duration,
              version,
              isTease,
              isSegue,
              isOnRelease: hasRelease,
              notes: notesText,
              guests: []
            });
          }
        }
      });
    }
  });

  return performances.sort((a, b) => a.date.localeCompare(b.date));
}

// Parse a single song stats page
async function parseSongStatsPage(
  page: Page,
  songId: string,
  songTitle: string
): Promise<SongStatistics | null> {
  const url = `${BASE_URL}/SongStats.aspx?sid=${songId}`;

  try {
    // Check cache first
    let html = getCachedHtml(url);

    if (!html) {
      console.log(`  Fetching: ${songTitle} (${songId})`);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      html = await page.content();
      cacheHtml(url, html);
    } else {
      console.log(`  Cache hit: ${songTitle} (${songId})`);
    }

    const $ = cheerio.load(html);

    // Parse basic stats
    const bodyText = $("body").text();

    const totalPlaysMatch = bodyText.match(/played?\s+(\d+)\s+times?/i);
    const totalPlays = totalPlaysMatch ? parseInt(totalPlaysMatch[1], 10) : 0;

    const firstPlayedMatch = bodyText.match(/(?:first|debut)[^\d]*(\d{1,2}[./]\d{1,2}[./]\d{2,4})/i);
    const firstPlayedDate = firstPlayedMatch ? firstPlayedMatch[1] : null;

    const lastPlayedMatch = bodyText.match(/last\s+(?:fully\s+)?played[^\d]*(\d{1,2}[./]\d{1,2}[./]\d{2,4})/i);
    const lastPlayedDate = lastPlayedMatch ? lastPlayedMatch[1] : null;

    const avgLengthMatch = bodyText.match(/average[^\d]*(\d+):(\d{2})/i);
    const avgLengthSeconds = avgLengthMatch
      ? parseInt(avgLengthMatch[1], 10) * 60 + parseInt(avgLengthMatch[2], 10)
      : null;

    const yearsMatch = bodyText.match(/(\d+)\s+years?/i);
    const yearsActive = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;

    // Parse current gap
    const gapDaysMatch = bodyText.match(/(\d+)\s+days?\s+since/i);
    const gapShowsMatch = bodyText.match(/(\d+)\s+shows?\s+since/i);
    const currentGap =
      gapDaysMatch && gapShowsMatch
        ? {
          days: parseInt(gapDaysMatch[1], 10),
          shows: parseInt(gapShowsMatch[1], 10),
        }
        : null;

    // Parse all detailed stats
    const slotBreakdown = parseSlotBreakdown($);
    const versionTypes = parseVersionTypes($);
    const { longest, shortest } = parseDurationExtremes($);
    const topSeguesInto = parseTopSegues($);
    const topSeguesFrom = parseTopSeguesFrom($);
    const playsByYear = parsePlaysByYear($);
    const releaseCounts = parseReleaseCounts($);
    const liberations = parseLiberations($);
    const artistStats = parseArtistStats($);
    const performances = parsePerformanceHistory($, songId);

    return {
      originalId: songId,
      title: songTitle,
      slotBreakdown,
      versionTypes,
      avgLengthSeconds,
      longestVersion: longest,
      shortestVersion: shortest,
      topSeguesInto,
      topSeguesFrom,
      releaseCounts,
      playsByYear,
      artistStats,
      liberations,
      totalPlays,
      firstPlayedDate,
      lastPlayedDate,
      yearsActive,
      currentGap,
      performances,
    };
  } catch (error) {
    console.error(`Error parsing song stats for ${songTitle} (${songId}):`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllSongStats(): Promise<SongStatistics[]> {
  console.log("Starting song stats scraper...");
  console.log("This will capture detailed statistics from SongStats.aspx pages");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Load song IDs
    const songs = getSongIds();
    console.log(`Found ${songs.length} songs to process`);

    // Check for existing checkpoint
    const checkpoint = loadCheckpoint<{
      completedIds: string[];
      stats: SongStatistics[];
    }>("song-stats");

    const completedIds = new Set(checkpoint?.completedIds || []);
    const allStats: SongStatistics[] = checkpoint?.stats || [];

    // Filter out already completed
    const remainingSongs = songs.filter((song) => !completedIds.has(song.id));
    console.log(`${remainingSongs.length} songs remaining to scrape`);

    // Rate limiter queue
    const queue = new PQueue({
      concurrency: 1, // Sequential processing
      intervalCap: 5,
      interval: 10000, // 5 requests per 10 seconds
    });

    let processed = 0;
    const total = remainingSongs.length;

    // Parse each song
    for (const song of remainingSongs) {
      await queue.add(async () => {
        const stats = await parseSongStatsPage(page, song.id, song.title);
        if (stats) {
          allStats.push(stats);
          completedIds.add(song.id);
          console.log(`  [${++processed}/${total}] ${song.title} - ${stats.totalPlays} plays`);
        }
        await randomDelay(2000, 4000); // 2-4 second delay between requests
      });

      // Save checkpoint every 50 songs
      if (processed % 50 === 0 && processed > 0) {
        saveCheckpoint("song-stats", {
          completedIds: Array.from(completedIds),
          stats: allStats,
        });
        console.log(`Checkpoint saved: ${processed}/${total} songs`);
      }
    }

    await queue.onIdle();

    // Final checkpoint
    saveCheckpoint("song-stats", {
      completedIds: Array.from(completedIds),
      stats: allStats,
    });

    return allStats;
  } finally {
    await browser.close();
  }
}

// Save song stats to JSON file
export function saveSongStats(stats: SongStatistics[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: `${BASE_URL}/SongStats.aspx`,
    totalItems: stats.length,
    stats,
  };

  const filepath = join(OUTPUT_DIR, "song-stats.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${stats.length} song statistics to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllSongStats()
    .then((stats) => {
      saveSongStats(stats);
      console.log("\n✓ Song stats scraper completed successfully!");
      console.log(`Total songs processed: ${stats.length}`);
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
