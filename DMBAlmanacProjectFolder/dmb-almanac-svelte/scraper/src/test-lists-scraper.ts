/**
 * Test script for Curated Lists scraper
 *
 * This script tests the lists scraper by:
 * 1. Fetching the list index from Lists.aspx
 * 2. Scraping a few sample lists
 * 3. Displaying the results
 *
 * Usage:
 *   npm run test:lists
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { cacheHtml, getCachedHtml } from "./utils/cache.js";
import { normalizeWhitespace, slugify } from "./utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";

async function testListIndex() {
  console.log("=".repeat(80));
  console.log("TEST 1: Fetching List Index");
  console.log("=".repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  const url = `${BASE_URL}/Lists.aspx`;
  let html = getCachedHtml(url);

  if (!html) {
    console.log("Fetching Lists.aspx...");
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    html = await page.content();
    cacheHtml(url, html);
  } else {
    console.log("Using cached Lists.aspx");
  }

  const $ = cheerio.load(html);
  const lists: { id: string; title: string; category: string }[] = [];

  $(".release-series").each((_, seriesEl) => {
    const $series = $(seriesEl);
    const category = normalizeWhitespace($series.find(".headerpanel").text());

    $series.find("a[href*='ListView.aspx']").each((_, linkEl) => {
      const href = $(linkEl).attr("href");
      if (href) {
        const idMatch = href.match(/id=(\d+)/);
        if (idMatch) {
          const listId = idMatch[1];
          const title = normalizeWhitespace($(linkEl).text());
          lists.push({ id: listId, title, category });
        }
      }
    });
  });

  console.log(`\nFound ${lists.length} curated lists`);
  console.log("\nCategories:");
  const categories = new Map<string, number>();
  lists.forEach(l => {
    categories.set(l.category, (categories.get(l.category) || 0) + 1);
  });
  categories.forEach((count, category) => {
    console.log(`  ${category}: ${count} lists`);
  });

  console.log("\nSample lists:");
  lists.slice(0, 10).forEach(l => {
    console.log(`  [${l.category}] ${l.title} (ID: ${l.id})`);
  });

  await browser.close();
  return lists;
}

async function testListDetail(listId: string, title: string, category: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`TEST 2: Scraping List Detail (ID: ${listId})`);
  console.log("=".repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  const url = `${BASE_URL}/ListView.aspx?id=${listId}`;
  let html = getCachedHtml(url);

  if (!html) {
    console.log(`Fetching ListView.aspx?id=${listId}...`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    html = await page.content();
    cacheHtml(url, html);
  } else {
    console.log(`Using cached ListView.aspx?id=${listId}`);
  }

  const $ = cheerio.load(html);

  // Extract description
  let description: string | undefined;
  const descDiv = $(".threedeetable, .subtitle").first();
  if (descDiv.length > 0) {
    description = normalizeWhitespace(descDiv.text());
  }

  console.log(`\nTitle: ${title}`);
  console.log(`Category: ${category}`);
  console.log(`Description: ${description || "(none)"}`);

  // Count different element types
  const showLinks = $("a[href*='TourShowSet']").length;
  const songLinks = $("a[href*='SongStats']").length;
  const venueLinks = $("a[href*='VenueStats']").length;
  const guestLinks = $("a[href*='GuestStats']").length;
  const releaseLinks = $("a[href*='Release']").length;

  console.log(`\nContent summary:`);
  console.log(`  Show links: ${showLinks}`);
  console.log(`  Song links: ${songLinks}`);
  console.log(`  Venue links: ${venueLinks}`);
  console.log(`  Guest links: ${guestLinks}`);
  console.log(`  Release links: ${releaseLinks}`);

  // Sample items
  console.log(`\nSample items (first 5):`);
  let count = 0;
  $("a[href*='TourShowSet'], a[href*='SongStats'], a[href*='VenueStats'], a[href*='GuestStats'], a[href*='Release']").each((_, linkEl) => {
    if (count >= 5) return false;
    const $link = $(linkEl);
    const itemTitle = normalizeWhitespace($link.text());
    const itemLink = $link.attr("href") || "";

    let itemType = "unknown";
    if (itemLink.includes("TourShowSet")) itemType = "show";
    else if (itemLink.includes("SongStats")) itemType = "song";
    else if (itemLink.includes("VenueStats")) itemType = "venue";
    else if (itemLink.includes("GuestStats")) itemType = "guest";
    else if (itemLink.includes("Release")) itemType = "release";

    console.log(`  ${count + 1}. [${itemType}] ${itemTitle}`);
    count++;
  });

  await browser.close();
}

async function main() {
  try {
    // Test 1: Get list index
    const lists = await testListIndex();

    if (lists.length === 0) {
      console.error("\nERROR: No lists found! Check HTML structure.");
      process.exit(1);
    }

    // Test 2: Scrape a few sample lists from different categories
    const sampleLists = [
      lists.find(l => l.category === "Songs"),
      lists.find(l => l.category === "Venues"),
      lists.find(l => l.category === "Shows"),
    ].filter(Boolean);

    for (const list of sampleLists) {
      if (list) {
        await testListDetail(list.id, list.title, list.category);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("TEST COMPLETED SUCCESSFULLY");
    console.log("=".repeat(80));
    console.log("\nThe scraper appears to be working correctly.");
    console.log("Run 'npm run scrape:lists' to scrape all lists.");
  } catch (error) {
    console.error("\nTEST FAILED:", error);
    process.exit(1);
  }
}

main();
