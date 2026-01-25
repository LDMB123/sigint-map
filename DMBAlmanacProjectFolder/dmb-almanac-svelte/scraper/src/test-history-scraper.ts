/**
 * Test script for This Day in History scraper
 * Scrapes a small sample of days to validate HTML parsing
 */

import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { cacheHtml, getCachedHtml } from "./utils/cache.js";
import { normalizeWhitespace } from "./utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";

// Test a few interesting dates
const TEST_DATES = [
  { month: 1, day: 1, label: "New Year's Day" },
  { month: 3, day: 14, label: "March 14 (potential DMB anniversary)" },
  { month: 7, day: 4, label: "July 4th (Independence Day)" },
  { month: 8, day: 27, label: "August 27 (Central Park)" },
  { month: 12, day: 31, label: "New Year's Eve" },
];

async function testHistoryPage(month: number, day: number, label: string) {
  const url = `${BASE_URL}/ThisDayinHistory.aspx?month=${month}&day=${day}`;
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Testing: ${label} (${month}/${day})`);
  console.log(`URL: ${url}`);
  console.log("=".repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Testing)",
  });

  try {
    // Check cache first
    let html = getCachedHtml(url);

    if (!html) {
      console.log("Fetching from web...");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      html = await page.content();
      cacheHtml(url, html);
    } else {
      console.log("Using cached HTML");
    }

    const $ = cheerio.load(html);

    // Debug: Print page title
    const pageTitle = $("title").text();
    console.log(`\nPage Title: ${pageTitle}`);

    // Debug: Look for main content area
    const mainContent = $("body").text().substring(0, 500);
    console.log(`\nFirst 500 chars of body:\n${mainContent}\n`);

    // Strategy 1: Find show links
    console.log("\nStrategy 1: Looking for show links (TourShowSet.aspx)...");
    const showLinks: any[] = [];

    $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = normalizeWhitespace($(el).text());
      const idMatch = href.match(/id=(\d+)/);

      if (idMatch) {
        showLinks.push({
          id: idMatch[1],
          href,
          text,
        });
      }
    });

    console.log(`Found ${showLinks.length} show links`);
    showLinks.slice(0, 5).forEach((link, i) => {
      console.log(`  ${i + 1}. ID=${link.id}, Text="${link.text}"`);
    });

    // Strategy 2: Look for venue links
    console.log("\nStrategy 2: Looking for venue links...");
    const venueLinks: any[] = [];

    $("a").each((_, el) => {
      const onclick = $(el).attr("onclick") || "";
      if (onclick.includes("VenueStats.aspx")) {
        const text = normalizeWhitespace($(el).text());
        const vidMatch = onclick.match(/vid=(\d+)/);
        venueLinks.push({
          id: vidMatch ? vidMatch[1] : "unknown",
          text,
          onclick,
        });
      }
    });

    console.log(`Found ${venueLinks.length} venue links`);
    venueLinks.slice(0, 5).forEach((link, i) => {
      console.log(`  ${i + 1}. ID=${link.id}, Text="${link.text}"`);
    });

    // Strategy 3: Look for table structure
    console.log("\nStrategy 3: Looking for tables...");
    const tables = $("table");
    console.log(`Found ${tables.length} tables`);

    tables.each((i, table) => {
      const $table = $(table);
      const id = $table.attr("id") || "no-id";
      const className = $table.attr("class") || "no-class";
      const rows = $table.find("tr").length;
      console.log(`  Table ${i + 1}: id="${id}", class="${className}", rows=${rows}`);
    });

    // Strategy 4: Look for list structure
    console.log("\nStrategy 4: Looking for lists (ul, ol)...");
    const lists = $("ul, ol");
    console.log(`Found ${lists.length} lists`);

    lists.each((i, list) => {
      const $list = $(list);
      const items = $list.find("li").length;
      console.log(`  List ${i + 1}: ${items} items`);
    });

    // Strategy 5: Extract all text with dates
    console.log("\nStrategy 5: Looking for date patterns...");
    const fullText = $("body").text();
    const datePatterns = [
      /\d{2}\.\d{2}\.\d{4}/g,  // 03.14.1991
      /\d{1,2}\/\d{1,2}\/\d{4}/g,  // 3/14/1991
      /\b(19|20)\d{2}\b/g,  // Just year
    ];

    datePatterns.forEach((pattern, i) => {
      const matches = fullText.match(pattern);
      if (matches) {
        const unique = [...new Set(matches)].slice(0, 10);
        console.log(`  Pattern ${i + 1} matches (first 10): ${unique.join(", ")}`);
      }
    });

    // Try to parse full shows
    console.log("\n\nAttempting to parse shows...");
    const shows: any[] = [];

    $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const showText = normalizeWhitespace($el.text());

      const idMatch = href.match(/id=(\d+)/);
      if (!idMatch) return;

      const originalId = idMatch[1];

      // Try to parse date from text
      const dateMatch = showText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      let showDate = "";
      let year = 0;

      if (dateMatch) {
        const [, m, d, y] = dateMatch;
        showDate = `${y}-${m}-${d}`;
        year = parseInt(y, 10);
      } else {
        const yearMatch = showText.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = parseInt(yearMatch[0], 10);
          showDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
      }

      // Try to find venue
      const parent = $el.parent();
      const venueLink = parent.find("a").filter((i, link) => {
        const onclick = $(link).attr("onclick") || "";
        return onclick.includes("VenueStats.aspx");
      });

      const venueName = venueLink.length ? normalizeWhitespace(venueLink.text()) : "Unknown";

      // Try to parse location
      const parentText = parent.text();
      const locationMatch = parentText.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
      const city = locationMatch ? locationMatch[1].trim() : "Unknown";
      const state = locationMatch ? locationMatch[2].trim() : "";
      const country = locationMatch && locationMatch[3] ? locationMatch[3].trim() : "USA";

      shows.push({
        originalId,
        showDate,
        year,
        venueName,
        city,
        state,
        country,
      });
    });

    console.log(`\nParsed ${shows.length} shows:`);
    shows.forEach((show, i) => {
      console.log(`  ${i + 1}. ${show.showDate} - ${show.venueName}, ${show.city}, ${show.state || show.country}`);
    });

    // Summary
    console.log(`\n${"=".repeat(80)}`);
    console.log("Summary:");
    console.log(`  Show links found: ${showLinks.length}`);
    console.log(`  Venue links found: ${venueLinks.length}`);
    console.log(`  Shows successfully parsed: ${shows.length}`);
    console.log("=".repeat(80));

    if (shows.length === 0) {
      console.log("\nWARNING: No shows were parsed. HTML structure may be different than expected.");
      console.log("Saving debug HTML to scraper/output/debug-history-page.html");
      const { writeFileSync } = await import("fs");
      const { join } = await import("path");
      writeFileSync(
        join(process.cwd(), "output", "debug-history-page.html"),
        html,
        "utf-8"
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

// Run tests
async function runTests() {
  console.log("This Day in History Scraper - Test Script");
  console.log("Testing parser with sample dates...\n");

  for (const date of TEST_DATES) {
    await testHistoryPage(date.month, date.day, date.label);
    // Wait 3 seconds between requests
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log("\n\nAll tests complete!");
  console.log("\nIf the parser worked correctly, you should see show data for each date.");
  console.log("If not, check the debug HTML files in scraper/output/");
}

runTests().catch(console.error);
