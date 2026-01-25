/**
 * Test the venue stats scraper with a sample venue
 */
import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { parseDate, normalizeWhitespace } from "./utils/helpers.js";

const BASE_URL = "https://www.dmbalmanac.com";

async function testVenueStats() {
  console.log("Testing venue stats scraper with sample venue...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Test with a well-known venue (Red Rocks Amphitheatre, vid=1)
    const venueUrl = `${BASE_URL}/VenueStats.aspx?vid=1`;

    console.log(`Fetching: ${venueUrl}\n`);

    await page.goto(venueUrl, { waitUntil: "networkidle" });
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract venue name and location
    const bodyText = $("body").text();
    const lines = bodyText
      .split("\n")
      .map((l) => normalizeWhitespace(l))
      .filter((l) => l.length > 0);

    let venueName = "";
    let city = "";
    let state = "";
    let country = "USA";

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];
      const usMatch = line.match(/^([A-Za-z\s\.\-\']+),\s*([A-Z]{2})$/);
      if (usMatch) {
        city = usMatch[1].trim();
        state = usMatch[2];
        if (i > 0 && lines[i - 1].length > 2) {
          venueName = lines[i - 1];
        }
        break;
      }
    }

    console.log(`Venue: ${venueName}`);
    console.log(`Location: ${city}, ${state}, ${country}`);

    // Find all show dates
    const showDates: string[] = [];
    $("a[href*='TourShowSet.aspx'][href*='id='], a[href*='ShowSetlist.aspx'][href*='id=']").each(
      (_, el) => {
        const dateText = normalizeWhitespace($(el).text());
        if (
          dateText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) ||
          dateText.match(/\d{2}\.\d{2}\.\d{4}/)
        ) {
          try {
            const parsed = parseDate(dateText);
            showDates.push(parsed);
          } catch (error) {
            // Skip unparseable dates
          }
        }
      }
    );

    if (showDates.length > 0) {
      showDates.sort();
      console.log(`\nFirst show: ${showDates[0]}`);
      console.log(`Last show: ${showDates[showDates.length - 1]}`);
      console.log(`Total shows: ${showDates.length}`);
    }

    // Parse top songs
    const topSongs: { title: string; playCount: number }[] = [];
    $("table tr").each((_, row) => {
      const $row = $(row);
      const songLink = $row.find("a[href*='SongStats']").first();
      if (songLink.length === 0) return;

      const songTitle = normalizeWhitespace(songLink.text());
      if (!songTitle) return;

      const rowText = $row.text();
      const countMatch = rowText.match(/(\d+)\s*(?:times?|plays?|x)/i);
      const playCount = countMatch ? parseInt(countMatch[1], 10) : 0;

      topSongs.push({ title: songTitle, playCount });
    });

    topSongs.sort((a, b) => b.playCount - a.playCount);
    const top10 = topSongs.slice(0, 10);

    console.log(`\nTop 10 songs at this venue:`);
    top10.forEach((song, i) => {
      console.log(`  ${i + 1}. ${song.title} (${song.playCount} plays)`);
    });

    // Check for capacity
    const capacityMatch = bodyText.match(/capacity[:\s]+(\d+[\,\d]*)/i);
    if (capacityMatch) {
      const capacity = capacityMatch[1].replace(/,/g, "");
      console.log(`\nVenue capacity: ${capacity}`);
    }

    // Check for aka names
    const akaMatch = bodyText.match(/aka\s+(.+?)(?:\n|$)/i);
    if (akaMatch) {
      console.log(`\nAlternate names: ${akaMatch[1]}`);
    }

    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
}

testVenueStats();
