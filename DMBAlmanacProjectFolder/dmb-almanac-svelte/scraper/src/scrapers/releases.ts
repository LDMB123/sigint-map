import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { ScrapedRelease, ScrapedReleaseTrack } from "../types.js";
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { parseDate, normalizeWhitespace, slugify, parseDuration } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Get all release URLs from the discography list page
async function getReleaseUrls(page: Page): Promise<{ id: string; url: string; title: string }[]> {
  console.log("Fetching release URLs from discography list...");

  const listUrl = `${BASE_URL}/DiscographyList.aspx`;

  try {
    await page.goto(listUrl, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    console.error(`Failed to load ${listUrl}:`, error);
    return [];
  }

  const html = await page.content();
  const $ = cheerio.load(html);

  const releases: { id: string; url: string; title: string }[] = [];

  // Find release links - look for links to ReleaseView.aspx with release parameter
  $("a[href*='ReleaseView.aspx']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("release=")) {
      const releaseMatch = href.match(/release=([^&]+)/);
      if (releaseMatch) {
        const releaseId = releaseMatch[1];
        const title = normalizeWhitespace($(el).text());

        let fullUrl = href;
        if (!href.startsWith("http")) {
          if (href.startsWith("./")) {
            fullUrl = BASE_URL + "/" + href.slice(2);
          } else if (href.startsWith("/")) {
            fullUrl = BASE_URL + href;
          } else {
            fullUrl = BASE_URL + "/" + href;
          }
        }

        // Avoid duplicates
        if (!releases.find(r => r.id === releaseId)) {
          releases.push({
            id: releaseId,
            url: fullUrl,
            title
          });
        }
      }
    }
  });

  console.log(`Found ${releases.length} releases`);
  return releases;
}

// Parse a single release detail page
async function parseReleasePage(page: Page, releaseUrl: string, releaseId: string): Promise<ScrapedRelease | null> {
  try {
    // Check cache first
    let html = getCachedHtml(releaseUrl);

    if (!html) {
      await page.goto(releaseUrl, { waitUntil: "networkidle" });
      html = await page.content();
      cacheHtml(releaseUrl, html);
    }

    const $ = cheerio.load(html);

    // Extract release title from div.subtitle (primary) or other fallbacks
    let title = "";
    
    // Primary: Look for div with class 'subtitle' inside the main content
    const subtitleDiv = $("div.subtitle, .subtitle").first();
    if (subtitleDiv.length) {
      title = normalizeWhitespace(subtitleDiv.text());
    }
    
    // Fallback: Look in the page title
    if (!title) {
      const pageTitle = $("title").text();
      // Remove "DMBAlmanac.com" suffix
      title = normalizeWhitespace(pageTitle.replace(/DMBAlmanac\.com.*$/i, "").replace(/[-\u2013\u2014]\s*$/, ""));
    }
    
    // Another fallback: h1
    if (!title) {
      const h1 = $("h1").first();
      if (h1.length) {
        title = normalizeWhitespace(h1.text());
      }
    }

    if (!title) {
      console.warn(`No title found for release ${releaseId}`);
      title = "Release " + releaseId;
    }

    // Parse release type from the header span.showdate or page content
    let releaseType = "studio";
    
    // Look for release type in the header (span.showdate contains category like "Studio Albums")
    const showdateSpan = $("span.showdate").first();
    if (showdateSpan.length) {
      const category = normalizeWhitespace(showdateSpan.text()).toLowerCase();
      if (category.includes("live")) {
        releaseType = "live";
      } else if (category.includes("compilation") || category.includes("greatest hits") || category.includes("best of")) {
        releaseType = "compilation";
      } else if (category.includes("video") || category.includes("dvd") || category.includes("blu-ray")) {
        releaseType = "video";
      } else if (category.includes("box set") || category.includes("boxset")) {
        releaseType = "box_set";
      } else if (category.includes("ep")) {
        releaseType = "ep";
      } else if (category.includes("single")) {
        releaseType = "single";
      }
    }
    
    // Fallback: check page text
    if (releaseType === "studio") {
      const pageText = $("body").text().toLowerCase();
      if (pageText.includes("live album") || pageText.includes("live release") || pageText.includes("live recording")) {
        releaseType = "live";
      } else if (pageText.includes("compilation") || pageText.includes("greatest hits") || pageText.includes("best of")) {
        releaseType = "compilation";
      } else if (pageText.includes("dvd") || pageText.includes("video") || pageText.includes("blu-ray")) {
        releaseType = "video";
      } else if (pageText.includes("box set") || pageText.includes("boxset")) {
        releaseType = "box_set";
      } else if (pageText.includes("extended play")) {
        releaseType = "ep";
      } else if (pageText.includes("single")) {
        releaseType = "single";
      }
    }

    // Parse release date from the "Released on" section
    let releaseDate: string | undefined;

    // Look for "Released on" h2 and the following section-content div
    const releasedOnH2 = $("h2").filter((_, el) => $(el).text().toLowerCase().includes("released on"));
    if (releasedOnH2.length) {
      const sectionContent = releasedOnH2.next(".section-content");
      if (sectionContent.length) {
        const dateText = normalizeWhitespace(sectionContent.text());
        try {
          releaseDate = parseDate(dateText);
        } catch (err) {
          // Try to parse common date formats manually
          const dateMatch = dateText.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
          if (dateMatch) {
            try {
              releaseDate = parseDate(dateMatch[1] + " " + dateMatch[2] + ", " + dateMatch[3]);
            } catch (e) {
              // Skip
            }
          }
        }
      }
    }

    // Parse catalog number from various possible locations
    let catalogNumber: string | undefined;

    // Method 1: Look for "Catalog Number", "Catalog #", "Cat No", etc. in h2/h3 headers
    const catalogH2 = $("h2, h3").filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes("catalog") || text.includes("cat no") || text.includes("cat #") || text.includes("cat.");
    });

    if (catalogH2.length) {
      const sectionContent = catalogH2.next(".section-content, div, p");
      if (sectionContent.length) {
        catalogNumber = normalizeWhitespace(sectionContent.text());
      }
    }

    // Method 2: Look for catalog number in any text content (common patterns)
    if (!catalogNumber) {
      const bodyText = $(".left-sidebar, .main, .release-content").text();
      // Match patterns like "RCA 12345", "Cat# 12345", "Catalog: 12345", etc.
      const catalogMatch = bodyText.match(/(?:catalog(?:\s+(?:number|#|no\.?))?|cat\.?(?:\s+#)?|cat\.?\s*no\.?)[:\s]+([A-Z0-9\-]+)/i);
      if (catalogMatch) {
        catalogNumber = catalogMatch[1].trim();
      }
    }

    // Method 3: Look in release notes or any div with "catalog" in the text
    if (!catalogNumber) {
      $("div, p, span").each((_, el) => {
        const text = $(el).text();
        const match = text.match(/(?:catalog(?:\s+(?:number|#|no\.?))?|cat\.?(?:\s+#)?|cat\.?\s*no\.?)[:\s]+([A-Z0-9\-]+)/i);
        if (match && !catalogNumber) {
          catalogNumber = match[1].trim();
          return false; // Break loop
        }
      });
    }

    // Look for cover art image in the left sidebar
    let coverArtUrl: string | undefined;
    const coverImg = $(".left-sidebar img, img[src*='releaseartwork']").first();
    if (coverImg.length) {
      let src = coverImg.attr("src");
      if (src) {
        src = normalizeWhitespace(src);
        coverArtUrl = src.startsWith("http") ? src : BASE_URL + "/" + src.replace(/^\.?\//, "");
      }
    }

    // Parse track listing
    const tracks: ScrapedReleaseTrack[] = [];
    let currentDiscNumber = 1;

    // Pattern: Look for track rows with setheadercell containing track number 
    // and song links with sid parameter
    
    // First, find all table rows
    $("table tr").each((_, row) => {
      const $row = $(row);
      
      // Check for disc header
      const rowText = $row.text().toLowerCase();
      if (rowText.includes("disc") && !rowText.includes("discography")) {
        const discMatch = rowText.match(/disc\s*(\d+)/i);
        if (discMatch) {
          currentDiscNumber = parseInt(discMatch[1], 10);
        }
        return; // Skip this row
      }
      
      // Look for track number in setheadercell
      const trackCell = $row.find("td.setheadercell").first();
      if (!trackCell.length) return;
      
      const trackText = trackCell.text().trim();
      const trackMatch = trackText.match(/^(\d+)$/);
      if (!trackMatch) return;
      
      const trackNumber = parseInt(trackMatch[1], 10);
      
      // Look for song link with sid parameter
      const songLink = $row.find("a[href*='sid=']").first();
      if (!songLink.length) return;
      
      const songTitle = normalizeWhitespace(songLink.text());
      if (!songTitle) return;
      
      // Try to find duration (look for cells with time format like "4:32")
      let duration: string | undefined;
      $row.find("td").each((_, td) => {
        const text = $(td).text().trim();
        const durationMatch = text.match(/^(\d+:\d{2})$/);
        if (durationMatch) {
          duration = durationMatch[1];
        }
      });
      
      // Check for show date (for live releases)
      let showDate: string | undefined;
      const dateLink = $row.find("a[href*='TourShowSet'], a[href*='ShowSetlist']").first();
      if (dateLink.length) {
        const dateText = dateLink.text();
        try {
          showDate = parseDate(dateText);
        } catch (err) {
          // Skip
        }
      }
      
      tracks.push({
        trackNumber,
        discNumber: currentDiscNumber,
        songTitle,
        duration,
        showDate,
      });
    });

    // Fallback Pattern: If no tracks found with setheadercell, try finding song links directly
    if (tracks.length === 0) {
      // Find all song links and extract context
      const songLinks = $("a[href*='sid=']");
      let trackNum = 0;
      
      songLinks.each((_, link) => {
        const $link = $(link);
        const songTitle = normalizeWhitespace($link.text());
        
        // Skip navigation/menu links - only consider links in the main content
        const $parent = $link.closest(".release-content, .main, table");
        if (!$parent.length) return;
        
        if (!songTitle || songTitle.length < 2) return;
        
        trackNum++;
        tracks.push({
          trackNumber: trackNum,
          discNumber: 1,
          songTitle,
        });
      });
    }

    // Parse release notes
    let notes: string | undefined;
    const notesEl = $(".release-notes, .notes, .album-notes");
    if (notesEl.length) {
      notes = normalizeWhitespace(notesEl.text());
    }

    const release: ScrapedRelease = {
      originalId: releaseId,
      title,
      releaseType,
      releaseDate,
      catalogNumber,
      coverArtUrl,
      tracks,
      notes,
    };

    return release;
  } catch (error) {
    console.error(`Error parsing release ${releaseUrl}:`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllReleases(): Promise<ScrapedRelease[]> {
  console.log("Starting releases scraper...");

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
      releases: ScrapedRelease[];
    }>("releases");

    const completedIds = new Set(checkpoint?.completedIds || []);
    const allReleases: ScrapedRelease[] = checkpoint?.releases || [];

    // Get all release URLs
    const releaseList = await getReleaseUrls(page);

    // Filter out already completed
    const remaining = releaseList.filter(r => !completedIds.has(r.id));
    console.log(`${remaining.length} releases remaining to scrape`);

    // Rate limiter queue
    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000,
    });

    let processed = 0;
    const total = remaining.length;

    // Parse each release
    for (const { id, url, title: previewTitle } of remaining) {
      await queue.add(async () => {
        const release = await parseReleasePage(page, url, id);
        if (release) {
          allReleases.push(release);
          completedIds.add(id);
          console.log(`  [${++processed}/${total}] ${release.title} (${release.tracks.length} tracks)`);
        }
        await randomDelay(1000, 3000);
      });

      // Save checkpoint every 10 releases
      if (processed % 10 === 0 && processed > 0) {
        saveCheckpoint("releases", {
          completedIds: Array.from(completedIds),
          releases: allReleases,
        });
      }
    }

    await queue.onIdle();

    // Final checkpoint
    saveCheckpoint("releases", {
      completedIds: Array.from(completedIds),
      releases: allReleases,
    });

    return allReleases;
  } finally {
    await browser.close();
  }
}

// Save releases to JSON file
export function saveReleases(releases: ScrapedRelease[]): void {
  const output = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: releases.length,
    releases,
  };

  const filepath = join(OUTPUT_DIR, "releases.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${releases.length} releases to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllReleases()
    .then((releases) => {
      saveReleases(releases);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
