import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { parseDate, normalizeWhitespace } from "./utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";

async function testDiscographyList() {
  console.log("Testing discography list page...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const listUrl = `${BASE_URL}/DiscographyList.aspx`;
    console.log(`Fetching: ${listUrl}`);

    await page.goto(listUrl, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log("\n=== Release Links Found ===\n");

    let count = 0;
    $("a[href*='ReleaseView.aspx']").each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("release=")) {
        const releaseMatch = href.match(/release=([^&]+)/);
        if (releaseMatch) {
          const releaseId = releaseMatch[1];
          const title = normalizeWhitespace($(el).text());

          console.log(`${++count}. ID: ${releaseId} | Title: ${title}`);

          if (count === 5) {
            console.log("\n... (showing first 5 releases only)\n");
            return false; // Break after 5
          }
        }
      }
    });

    if (count === 0) {
      console.log("WARNING: No releases found! Page structure may have changed.");
      console.log("\nSample HTML:");
      console.log($("body").html()?.substring(0, 1000));
    }

    console.log(`\nTotal release links found: ${count}+`);
  } catch (error) {
    console.error("Error testing discography list:", error);
  } finally {
    await browser.close();
  }
}

async function testReleaseDetail(releaseId: string = "1") {
  console.log(`\n\nTesting release detail page (ID: ${releaseId})...\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    const detailUrl = `${BASE_URL}/ReleaseView.aspx?release=${releaseId}`;
    console.log(`Fetching: ${detailUrl}`);

    await page.goto(detailUrl, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    console.log("\n=== Release Details ===\n");

    // Extract title
    let title = "";
    const h1 = $("h1").first();
    if (h1.length) {
      title = normalizeWhitespace(h1.text());
      console.log(`Title: ${title}`);
    } else {
      console.log("Title: NOT FOUND (check h1 selector)");
    }

    // Detect release type
    const pageText = $("body").text().toLowerCase();
    let releaseType = "unknown";

    if (pageText.includes("live album")) {
      releaseType = "live";
    } else if (pageText.includes("studio album")) {
      releaseType = "studio";
    } else if (pageText.includes("compilation")) {
      releaseType = "compilation";
    } else if (pageText.includes("dvd") || pageText.includes("video")) {
      releaseType = "video";
    }

    console.log(`Release Type: ${releaseType}`);

    // Look for date
    const dateMatch = pageText.match(/released[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i);
    if (dateMatch) {
      console.log(`Release Date: ${dateMatch[1]}`);
    } else {
      console.log("Release Date: NOT FOUND");
    }

    // Look for cover art
    const coverImg = $("img[src*='cover'], img[src*='album'], img[alt*='cover']").first();
    if (coverImg.length) {
      console.log(`Cover Art: ${coverImg.attr("src")}`);
    } else {
      console.log("Cover Art: NOT FOUND");
    }

    console.log("\n=== Track Listing ===\n");

    // Try multiple track parsing strategies
    let trackCount = 0;

    // Strategy 1: Table rows
    $("table tr").each((i, row) => {
      const $row = $(row);
      const songLink = $row.find("a[href*='SongStats']").first();

      if (songLink.length > 0) {
        const songTitle = normalizeWhitespace(songLink.text());
        const rowText = $row.text();
        const durationMatch = rowText.match(/(\d+:\d{2})/);

        console.log(`  ${++trackCount}. ${songTitle} ${durationMatch ? `(${durationMatch[1]})` : ""}`);

        if (trackCount === 5) {
          console.log("  ... (showing first 5 tracks only)\n");
          return false; // Break after 5
        }
      }
    });

    // Strategy 2: List items (if no table tracks found)
    if (trackCount === 0) {
      $("ol li, .track").each((i, el) => {
        const $el = $(el);
        const songLink = $el.find("a[href*='SongStats']").first();

        if (songLink.length > 0) {
          const songTitle = normalizeWhitespace(songLink.text());
          const text = $el.text();
          const durationMatch = text.match(/(\d+:\d{2})/);

          console.log(`  ${++trackCount}. ${songTitle} ${durationMatch ? `(${durationMatch[1]})` : ""}`);

          if (trackCount === 5) {
            console.log("  ... (showing first 5 tracks only)\n");
            return false;
          }
        }
      });
    }

    if (trackCount === 0) {
      console.log("WARNING: No tracks found! Page structure may have changed.");
      console.log("\nSample HTML:");
      console.log($("body").html()?.substring(0, 1000));
    }

    console.log(`\nTotal tracks found: ${trackCount}+`);
  } catch (error) {
    console.error("Error testing release detail:", error);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("DMBAlmanac Releases Scraper - Test Suite");
  console.log("=".repeat(60));

  await testDiscographyList();
  await testReleaseDetail("1"); // Test with release ID 1

  console.log("\n" + "=".repeat(60));
  console.log("Test complete!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
