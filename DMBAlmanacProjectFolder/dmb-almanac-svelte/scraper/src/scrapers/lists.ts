import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { ScrapedList, ScrapedListItem, ListsOutput } from "../types.js";
import { delay, randomDelay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml, saveCheckpoint, loadCheckpoint } from "../utils/cache.js";
import { normalizeWhitespace, slugify } from "../utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";
const OUTPUT_DIR = join(dirname(import.meta.url).replace("file://", ""), "../../output");

// Get all list IDs and metadata from Lists.aspx index page
async function getListIndex(page: Page): Promise<{ id: string; title: string; category: string }[]> {
  console.log("Fetching list index from Lists.aspx...");

  const url = `${BASE_URL}/Lists.aspx`;

  // Check cache first
  let html = getCachedHtml(url);

  if (!html) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    } catch (error) {
      console.error(`Failed to load ${url}:`, error);
      return [];
    }
  }

  const $ = cheerio.load(html);
  const lists: { id: string; title: string; category: string }[] = [];

  // Parse list structure
  // Lists are grouped by category in divs with class="release-series"
  $(".release-series").each((_, seriesEl) => {
    const $series = $(seriesEl);

    // Get category from headerpanel
    const category = normalizeWhitespace($series.find(".headerpanel").text());

    // Find all list links in this category
    $series.find("a[href*='ListView.aspx']").each((_, linkEl) => {
      const href = $(linkEl).attr("href");
      if (href) {
        const idMatch = href.match(/id=(\d+)/);
        if (idMatch) {
          const listId = idMatch[1];
          const title = normalizeWhitespace($(linkEl).text());

          lists.push({
            id: listId,
            title,
            category,
          });
        }
      }
    });
  });

  console.log(`Found ${lists.length} curated lists across ${new Set(lists.map(l => l.category)).size} categories`);
  return lists;
}

// Parse a single list detail page
async function parseListPage(
  page: Page,
  listId: string,
  title: string,
  category: string
): Promise<ScrapedList | null> {
  const url = `${BASE_URL}/ListView.aspx?id=${listId}`;

  try {
    // Check cache first
    let html = getCachedHtml(url);

    if (!html) {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    }

    const $ = cheerio.load(html);

    // Extract description if present
    let description: string | undefined;
    const descDiv = $(".threedeetable, .subtitle").first();
    if (descDiv.length > 0) {
      description = normalizeWhitespace(descDiv.text());
    }

    // Parse list items
    const items: ScrapedListItem[] = [];
    let position = 0;

    // Strategy 1: Look for table rows with links in the main content area
    // Look specifically for tables with class 'threedeetable' which contain the actual list data
    $("table.threedeetable tr").each((_, row) => {
      const $row = $(row);

      // Skip header rows (with th elements or headercell class)
      if ($row.find("th").length > 0 || $row.find(".headercell").length > 0) return;

      // Skip rows that are part of navigation
      const rowText = $row.text().toLowerCase();
      if (rowText.includes("tours / stats") || rowText.includes("contact") ||
          rowText.includes("support us") || rowText.includes("home") ||
          rowText.includes("search") || rowText.includes("discography")) return;

      const cells = $row.find("td");
      if (cells.length === 0) return;

      // Try to extract structured data from table cells
      const link = $row.find("a[href*='TourShowSet'], a[href*='SongStats'], a[href*='VenueStats'], a[href*='GuestStats'], a[href*='Release']").first();

      if (link.length > 0) {
        position++;

        const itemTitle = normalizeWhitespace(link.text());
        const itemLink = link.attr("href") || "";

        // Determine item type and ID from link
        let itemType: ScrapedListItem["itemType"] = "text";
        let itemId: string | undefined;

        if (itemLink.includes("TourShowSet")) {
          itemType = "show";
          const match = itemLink.match(/id=(\d+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("SongStats")) {
          itemType = "song";
          const match = itemLink.match(/sid=(\d+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("VenueStats")) {
          itemType = "venue";
          const match = itemLink.match(/vid=(\d+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("GuestStats")) {
          itemType = "guest";
          const match = itemLink.match(/gid=([^&]+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("Release")) {
          itemType = "release";
          const match = itemLink.match(/rid=(\d+)/);
          itemId = match ? match[1] : undefined;
        }

        // Extract clean notes - avoid including link text multiple times
        let notes: string | undefined;
        const cellTexts: string[] = [];
        cells.each((idx, cell) => {
          const cellText = normalizeWhitespace($(cell).text());
          if (cellText && !cellText.includes(itemTitle)) {
            cellTexts.push(cellText);
          }
        });
        if (cellTexts.length > 0) {
          notes = cellTexts.join(" | ");
        }

        items.push({
          position,
          itemType,
          itemId,
          itemTitle,
          itemLink: itemLink.startsWith("http") ? itemLink : `${BASE_URL}/${itemLink}`,
          notes: notes || undefined,
        });
      }
    });

    // Strategy 2: Look for div-based lists (hanging-indent pattern)
    if (items.length === 0) {
      $(".hanging-indent, .list-item").each((_, itemEl) => {
        const $item = $(itemEl);
        const link = $item.find("a").first();

        if (link.length > 0) {
          position++;

          const itemTitle = normalizeWhitespace(link.text());
          const itemLink = link.attr("href") || "";

          let itemType: ScrapedListItem["itemType"] = "text";
          let itemId: string | undefined;

          if (itemLink.includes("TourShowSet")) {
            itemType = "show";
            const match = itemLink.match(/id=(\d+)/);
            itemId = match ? match[1] : undefined;
          } else if (itemLink.includes("SongStats")) {
            itemType = "song";
            const match = itemLink.match(/sid=(\d+)/);
            itemId = match ? match[1] : undefined;
          } else if (itemLink.includes("VenueStats")) {
            itemType = "venue";
            const match = itemLink.match(/vid=(\d+)/);
            itemId = match ? match[1] : undefined;
          } else if (itemLink.includes("GuestStats")) {
            itemType = "guest";
            const match = itemLink.match(/gid=([^&]+)/);
            itemId = match ? match[1] : undefined;
          } else if (itemLink.includes("Release")) {
            itemType = "release";
            const match = itemLink.match(/rid=(\d+)/);
            itemId = match ? match[1] : undefined;
          }

          const notes = normalizeWhitespace($item.text().replace(itemTitle, ""));

          items.push({
            position,
            itemType,
            itemId,
            itemTitle,
            itemLink: itemLink.startsWith("http") ? itemLink : `${BASE_URL}/${itemLink}`,
            notes: notes || undefined,
          });
        }
      });
    }

    // Strategy 3: Look for simple lists with links
    if (items.length === 0) {
      $("a[href*='TourShowSet'], a[href*='SongStats'], a[href*='VenueStats'], a[href*='GuestStats'], a[href*='Release']").each((_, linkEl) => {
        position++;

        const $link = $(linkEl);
        const itemTitle = normalizeWhitespace($link.text());
        const itemLink = $link.attr("href") || "";

        let itemType: ScrapedListItem["itemType"] = "text";
        let itemId: string | undefined;

        if (itemLink.includes("TourShowSet")) {
          itemType = "show";
          const match = itemLink.match(/id=(\d+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("SongStats")) {
          itemType = "song";
          const match = itemLink.match(/sid=(\d+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("VenueStats")) {
          itemType = "venue";
          const match = itemLink.match(/vid=(\d+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("GuestStats")) {
          itemType = "guest";
          const match = itemLink.match(/gid=([^&]+)/);
          itemId = match ? match[1] : undefined;
        } else if (itemLink.includes("Release")) {
          itemType = "release";
          const match = itemLink.match(/rid=(\d+)/);
          itemId = match ? match[1] : undefined;
        }

        items.push({
          position,
          itemType,
          itemId,
          itemTitle,
          itemLink: itemLink.startsWith("http") ? itemLink : `${BASE_URL}/${itemLink}`,
        });
      });
    }

    const list: ScrapedList = {
      originalId: listId,
      title,
      slug: slugify(title),
      category,
      description,
      itemCount: items.length,
      items,
    };

    return list;
  } catch (error) {
    console.error(`Error parsing list ${listId} (${title}):`, error);
    return null;
  }
}

// Main scraper function
export async function scrapeAllLists(): Promise<ScrapedList[]> {
  console.log("Starting curated lists scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to be polite
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Get list index
    const listIndex = await getListIndex(page);

    // Check for existing checkpoint
    const checkpoint = loadCheckpoint<{
      completedIds: string[];
      lists: ScrapedList[];
    }>("lists");

    const completedIds = checkpoint?.completedIds || [];
    const allLists: ScrapedList[] = checkpoint?.lists || [];

    // Filter out already completed lists
    const remainingLists = listIndex.filter(l => !completedIds.includes(l.id));

    console.log(`\nProgress: ${completedIds.length}/${listIndex.length} lists completed`);
    console.log(`Remaining: ${remainingLists.length} lists to scrape\n`);

    // Rate limiter queue
    const queue = new PQueue({
      concurrency: 2,
      intervalCap: 5,
      interval: 10000, // 10 seconds
    });

    // Process each list
    for (const listInfo of remainingLists) {
      await queue.add(async () => {
        const list = await parseListPage(page, listInfo.id, listInfo.title, listInfo.category);

        if (list) {
          allLists.push(list);
          console.log(`  Parsed [${list.category}]: ${list.title} (${list.itemCount} items)`);
        } else {
          console.warn(`  Failed to parse list ${listInfo.id}: ${listInfo.title}`);
        }

        completedIds.push(listInfo.id);

        // Save checkpoint every 5 lists
        if (completedIds.length % 5 === 0) {
          saveCheckpoint("lists", { completedIds, lists: allLists });
        }

        await randomDelay(1000, 3000);
      });
    }

    // Wait for all to complete
    await queue.onIdle();

    // Final checkpoint
    saveCheckpoint("lists", { completedIds, lists: allLists });

    console.log(`\nCompleted scraping ${allLists.length} curated lists`);
    return allLists;
  } finally {
    await browser.close();
  }
}

// Save lists to JSON file
export function saveLists(lists: ScrapedList[]): void {
  const output: ListsOutput = {
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    totalItems: lists.length,
    lists,
  };

  const filepath = join(OUTPUT_DIR, "lists.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Saved ${lists.length} lists to ${filepath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeAllLists()
    .then((lists) => {
      saveLists(lists);
      console.log("Done!");
    })
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}
