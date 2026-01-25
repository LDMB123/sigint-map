import * as cheerio from "cheerio";
import { writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { normalizeWhitespace } from "../utils/helpers.js";

const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");
const CACHE_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../cache");

// Song statistics interface
export interface SongStatistics {
  originalId: string;
  title: string;
  totalPlays: number;
  knownPlays: number;
  yearsActive: number;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
  liveDebutDate: string | null;
  liveDebutShowId: string | null;
  totalSongTime: string | null;
  daysSinceLastPlayed: number | null;

  // Slot breakdown
  slotBreakdown: {
    opener: number;
    set1Closer: number;
    set2Opener: number;
    midset: number;
    closer: number;
    encore: number;
    encore2: number;
  };

  // Version types
  versionTypes: {
    aborted: number;
    partial: number;
    tease: number;
  };

  // Artist-specific stats (DMB vs Dave & Tim)
  artistStats: Array<{
    artistName: string;
    firstShow: string | null;
    firstShowId: string | null;
    lastShow: string | null;
    lastShowId: string | null;
    avgLength: string | null;
    playCount: number;
    percentOfTotal: number;
    percentOfShows: number;
  }>;

  // Top segues
  topSegues: Array<{
    songTitle: string;
    songId: string;
    count: number;
  }>;

  // Longest versions
  longestVersions: Array<{
    rank: number;
    length: string;
    date: string;
    showId: string;
    location: string;
  }>;

  // Shortest versions
  shortestVersions: Array<{
    rank: number;
    length: string;
    date: string;
    showId: string;
    location: string;
  }>;

  // Liberation history
  liberations: Array<{
    missingSince: string;
    missingSinceShowId: string;
    dateLiberated: string;
    liberatedShowId: string;
    daysSince: number;
    showsSince: number;
  }>;
}

// Parse slot breakdown from the stat-list table
function parseSlotBreakdown($: cheerio.CheerioAPI): SongStatistics["slotBreakdown"] {
  const slots = {
    opener: 0,
    set1Closer: 0,
    set2Opener: 0,
    midset: 0,
    closer: 0,
    encore: 0,
    encore2: 0,
  };

  // Find the slots table - it has class stat-list
  $("table.stat-list tr").each((_, row) => {
    const $row = $(row);
    const label = $row.find("td.label").text().toLowerCase().trim();
    const valueText = $row.find("td:last-child").text().trim();

    // Extract just the number from "159 (68.8%)"
    const countMatch = valueText.match(/^(\d+)/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 0;

    if (label.includes("opener") && !label.includes("set 2") && !label.includes("set2")) {
      slots.opener = count;
    } else if (label.includes("set 2 opener") || label.includes("set2 opener") || label.includes("set2opener")) {
      slots.set2Opener = count;
    } else if (label.includes("set 1 closer") || label.includes("set1 closer") || label.includes("set1closer")) {
      slots.set1Closer = count;
    } else if (label.includes("midset")) {
      slots.midset = count;
    } else if (label.includes("2nd encore") || label.includes("encore2")) {
      slots.encore2 = count;
    } else if (label.includes("encore")) {
      slots.encore = count;
    } else if (label.includes("closer")) {
      slots.closer = count;
    }
  });

  return slots;
}

// Parse version types (aborted, partial, tease) from smaller stat-list table
function parseVersionTypes($: cheerio.CheerioAPI): SongStatistics["versionTypes"] {
  const types = {
    aborted: 0,
    partial: 0,
    tease: 0,
  };

  // Look in stat-list-sm tables for aborted/partial/tease
  $("table.stat-list-sm tr, table.stat-list tr").each((_, row) => {
    const $row = $(row);
    const label = $row.find("td.label").text().toLowerCase().trim();
    const valueText = $row.find("td:last-child").text().trim();
    const count = parseInt(valueText, 10) || 0;

    if (label === "aborted") {
      types.aborted = count;
    } else if (label === "partial") {
      types.partial = count;
    } else if (label === "tease") {
      types.tease = count;
    }
  });

  return types;
}

// Parse artist stats table
function parseArtistStats($: cheerio.CheerioAPI): SongStatistics["artistStats"] {
  const artistStats: SongStatistics["artistStats"] = [];

  // Find the "Stats By Show Artist" table
  $("table.stat-table tbody tr").each((_, row) => {
    const $row = $(row);
    const cells = $row.find("td");

    if (cells.length < 7) return;

    const artistName = $(cells[0]).text().trim();

    // Skip header rows
    if (!artistName || artistName === "Artist") return;

    const firstShowLink = $(cells[1]).find("a");
    const lastShowLink = $(cells[2]).find("a");

    const avgLength = $(cells[3]).text().trim() || null;
    const playCount = parseInt($(cells[4]).text().trim(), 10) || 0;
    const percentOfTotal = parseFloat($(cells[5]).text().replace("%", "").trim()) || 0;
    const percentOfShows = parseFloat($(cells[6]).text().replace("%", "").trim()) || 0;

    const firstShowId = firstShowLink.attr("href")?.match(/id=(\d+)/)?.[1] || null;
    const lastShowId = lastShowLink.attr("href")?.match(/id=(\d+)/)?.[1] || null;

    artistStats.push({
      artistName,
      firstShow: firstShowLink.text().trim() || null,
      firstShowId,
      lastShow: lastShowLink.text().trim() || null,
      lastShowId,
      avgLength,
      playCount,
      percentOfTotal,
      percentOfShows,
    });
  });

  return artistStats;
}

// Parse top segues from the table
function parseTopSegues($: cheerio.CheerioAPI): SongStatistics["topSegues"] {
  const segues: SongStatistics["topSegues"] = [];

  // Find the "Top Segues" heading and its table
  $("h2.stat-heading").each((_, heading) => {
    const $heading = $(heading);
    if ($heading.text().toLowerCase().includes("top segues")) {
      const $table = $heading.nextAll("table.stat-table").first();

      $table.find("tbody tr").each((_, row) => {
        const $row = $(row);
        const cells = $row.find("td");

        if (cells.length < 3) return;

        const songLink = $(cells[1]).find("a");
        const songTitle = songLink.text().replace(/^»\s*/, "").trim();
        const songId = songLink.attr("href")?.match(/sid=(\d+)/)?.[1] || "";
        const count = parseInt($(cells[2]).text().trim(), 10) || 0;

        if (songTitle && songId) {
          segues.push({ songTitle, songId, count });
        }
      });
    }
  });

  return segues;
}

// Parse longest/shortest versions tables
function parseVersionsTable($: cheerio.CheerioAPI, heading: string): SongStatistics["longestVersions"] {
  const versions: SongStatistics["longestVersions"] = [];

  $("h2.stat-heading").each((_, h) => {
    const $heading = $(h);
    if ($heading.text().toLowerCase().includes(heading.toLowerCase())) {
      const $table = $heading.nextAll("table.stat-table").first();

      $table.find("tbody tr").each((_, row) => {
        const $row = $(row);
        const cells = $row.find("td");

        if (cells.length < 4) return;

        const rank = parseInt($(cells[0]).text().trim(), 10) || 0;
        const length = $(cells[1]).text().trim();
        const dateLink = $(cells[2]).find("a");
        const date = dateLink.text().trim();
        const showId = dateLink.attr("href")?.match(/id=(\d+)/)?.[1] || "";
        const location = $(cells[3]).text().trim();

        if (rank && length) {
          versions.push({ rank, length, date, showId, location });
        }
      });
    }
  });

  return versions;
}

// Parse liberation history table
function parseLiberations($: cheerio.CheerioAPI): SongStatistics["liberations"] {
  const liberations: SongStatistics["liberations"] = [];

  $("h2.stat-heading").each((_, h) => {
    const $heading = $(h);
    if ($heading.text().toLowerCase().includes("liberated")) {
      const $table = $heading.nextAll("table.stat-table").first();

      $table.find("tbody tr").each((_, row) => {
        const $row = $(row);
        const cells = $row.find("td");

        if (cells.length < 5) return;

        const missingSinceLink = $(cells[1]).find("a");
        const liberatedLink = $(cells[2]).find("a");

        liberations.push({
          missingSince: missingSinceLink.text().trim(),
          missingSinceShowId: missingSinceLink.attr("href")?.match(/id=(\d+)/)?.[1] || "",
          dateLiberated: liberatedLink.text().trim(),
          liberatedShowId: liberatedLink.attr("href")?.match(/id=(\d+)/)?.[1] || "",
          daysSince: parseInt($(cells[3]).text().trim(), 10) || 0,
          showsSince: parseInt($(cells[4]).text().trim(), 10) || 0,
        });
      });
    }
  });

  return liberations;
}

// Parse a single cached HTML file
function parseCachedSongStats(html: string, songId: string): SongStatistics | null {
  const $ = cheerio.load(html);

  // Get title from h1 in sidebar
  const title = $(".sidebar h1").first().text().trim();
  if (!title) return null;

  // Parse stat-box-container for main stats
  const statBoxes = $(".stat-box-container .stat-box, .stat-box-container > a.stat-box, .stat-box-container > div.stat-box");

  let liveDebutDate: string | null = null;
  let liveDebutShowId: string | null = null;
  let knownPlays = 0;
  let yearsActive = 0;
  let daysSinceLastPlayed: number | null = null;
  let lastPlayedDate: string | null = null;
  let totalSongTime: string | null = null;

  statBoxes.each((_, box) => {
    const $box = $(box);
    const h1Text = $box.find("h1").text().trim();
    const bodyText = $box.text().toLowerCase();

    if (bodyText.includes("live debut")) {
      liveDebutDate = h1Text;
      liveDebutShowId = $box.attr("href")?.match(/id=(\d+)/)?.[1] || null;
    } else if (bodyText.includes("known plays")) {
      const playsMatch = h1Text.match(/(\d+)/);
      knownPlays = playsMatch ? parseInt(playsMatch[1], 10) : 0;
    } else if (bodyText.includes("over") && bodyText.includes("years")) {
      const yearsMatch = $box.text().match(/over\s+(\d+)\s+years/i);
      yearsActive = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;
    } else if (bodyText.includes("days since")) {
      const daysMatch = h1Text.match(/(\d+)/);
      daysSinceLastPlayed = daysMatch ? parseInt(daysMatch[1], 10) : null;
      // Extract last played date from the box text
      const dateMatch = $box.find(".setitem").text().trim();
      lastPlayedDate = dateMatch || null;
    } else if (bodyText.includes("total song time")) {
      totalSongTime = h1Text;
    }
  });

  // Parse detailed stats
  const slotBreakdown = parseSlotBreakdown($);
  const versionTypes = parseVersionTypes($);
  const artistStats = parseArtistStats($);
  const topSegues = parseTopSegues($);
  const longestVersions = parseVersionsTable($, "Longest Full Versions");
  const shortestVersions = parseVersionsTable($, "Shortest Full Versions");
  const liberations = parseLiberations($);

  // Calculate total plays from artist stats
  const totalPlays = artistStats.reduce((sum, stat) => sum + stat.playCount, 0);

  // Get first played date from artist stats (earliest first show)
  let firstPlayedDate: string | null = null;
  if (artistStats.length > 0) {
    const dates = artistStats
      .map((s) => s.firstShow)
      .filter((d): d is string => d !== null);
    if (dates.length > 0) {
      // Simple date sort - not perfect but works for most cases
      firstPlayedDate = dates.sort()[0];
    }
  }

  return {
    originalId: songId,
    title,
    totalPlays: totalPlays || knownPlays,
    knownPlays,
    yearsActive,
    firstPlayedDate: firstPlayedDate || liveDebutDate,
    lastPlayedDate,
    liveDebutDate,
    liveDebutShowId,
    totalSongTime,
    daysSinceLastPlayed,
    slotBreakdown,
    versionTypes,
    artistStats,
    topSegues,
    longestVersions,
    shortestVersions,
    liberations,
  };
}

// Main re-parsing function
export async function reparseSongStats(): Promise<SongStatistics[]> {
  console.log("Re-parsing song stats from cached HTML files...\n");

  const allStats: SongStatistics[] = [];

  // Find all cached song stats files
  const cacheFiles = readdirSync(CACHE_DIR)
    .filter((f) => f.startsWith("www_dmbalmanac_com_SongStats_aspx_sid_") && f.endsWith(".html"));

  console.log(`Found ${cacheFiles.length} cached song stats pages\n`);

  let processed = 0;
  let withPlays = 0;

  for (const file of cacheFiles) {
    // Extract song ID from filename
    const idMatch = file.match(/sid_(\d+)\.html$/);
    if (!idMatch) continue;

    const songId = idMatch[1];
    const html = readFileSync(join(CACHE_DIR, file), "utf-8");

    const stats = parseCachedSongStats(html, songId);
    if (stats) {
      allStats.push(stats);
      processed++;

      if (stats.totalPlays > 0) {
        withPlays++;
      }

      if (processed % 100 === 0) {
        console.log(`  Processed ${processed}/${cacheFiles.length}...`);
      }
    }
  }

  console.log(`\n✓ Parsed ${allStats.length} songs`);
  console.log(`  Songs with plays: ${withPlays}`);
  console.log(`  Songs without plays: ${allStats.length - withPlays}`);

  return allStats;
}

// Save stats to JSON
export function saveReparsedStats(stats: SongStatistics[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: "https://www.dmbalmanac.com/SongStats.aspx",
    totalItems: stats.length,
    stats,
  };

  const filepath = join(OUTPUT_DIR, "song-stats.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nSaved ${stats.length} song statistics to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  reparseSongStats()
    .then((stats) => {
      saveReparsedStats(stats);

      // Show some sample data
      const topSongs = stats
        .filter((s) => s.totalPlays > 0)
        .sort((a, b) => b.totalPlays - a.totalPlays)
        .slice(0, 10);

      console.log("\nTop 10 most played songs:");
      topSongs.forEach((song, i) => {
        console.log(`  ${i + 1}. ${song.title} - ${song.totalPlays} plays`);
      });
    })
    .catch((error) => {
      console.error("Re-parse failed:", error);
      process.exit(1);
    });
}
