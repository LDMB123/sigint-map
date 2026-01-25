import { chromium } from "playwright";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.dmbalmanac.com";

async function testToursScraper() {
  console.log("Testing tours scraper on DMBAlmanac.com...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Test 1: Scan a few year pages for tour IDs
    console.log("Test 1: Scanning year pages for tour IDs...");

    const testYears = [2025, 2024, 2023];
    const foundTours: { id: string; name: string; year: number }[] = [];

    for (const year of testYears) {
      const url = `${BASE_URL}/TourShow.aspx?where=${year}`;
      console.log(`\n  Checking ${year}...`);

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const html = await page.content();
      const $ = cheerio.load(html);

      // Look for tour links with tid parameter
      $("a[href*='TourShowInfo.aspx']").each((_, el) => {
        const href = $(el).attr("href");
        if (href && href.includes("tid=")) {
          const tidMatch = href.match(/tid=(\d+)/);
          if (tidMatch) {
            const tourId = tidMatch[1];
            const tourName = $(el).text().trim();
            if (tourName && tourName.length > 0) {
              foundTours.push({
                id: tourId,
                name: tourName,
                year: year,
              });
              console.log(`    - ${tourName} (tid=${tourId})`);
            }
          }
        }
      });

      // Also look in dropdowns/selects
      $("select option[value*='tid=']").each((_, el) => {
        const $el = $(el);
        const value = $el.attr("value") || "";
        const tidMatch = value.match(/tid=(\d+)/);
        if (tidMatch) {
          const tourId = tidMatch[1];
          const tourName = $el.text().trim();
          if (tourName && !foundTours.find(t => t.id === tourId)) {
            foundTours.push({
              id: tourId,
              name: tourName,
              year: year,
            });
            console.log(`    - ${tourName} (tid=${tourId}) [from dropdown]`);
          }
        }
      });
    }

    console.log(`\n  Total tours found: ${foundTours.length}`);

    // Test 2: Fetch a specific tour detail page
    if (foundTours.length > 0) {
      const testTour = foundTours[0];
      console.log(`\nTest 2: Fetching tour detail page for "${testTour.name}" (tid=${testTour.id})...`);

      const url = `${BASE_URL}/TourShowInfo.aspx?tid=${testTour.id}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const html = await page.content();
      const $ = cheerio.load(html);

      // Extract tour title
      const h1 = $("h1").first().text().trim();
      console.log(`  Tour title (h1): "${h1}"`);

      // Extract page text to look for stats
      const pageText = $("body").text();

      // Count shows
      const showCountMatch = pageText.match(/(\d+)\s+shows?/i);
      if (showCountMatch) {
        console.log(`  Show count: ${showCountMatch[1]}`);
      }

      // Count venues
      const venueMatch = pageText.match(/(\d+)\s+(?:unique\s+)?venues?/i);
      if (venueMatch) {
        console.log(`  Venues: ${venueMatch[1]}`);
      }

      // Count songs
      const songMatch = pageText.match(/(\d+)\s+(?:unique\s+)?songs?\s+played/i);
      if (songMatch) {
        console.log(`  Songs played: ${songMatch[1]}`);
      }

      // Find date range
      console.log("\n  Looking for show dates...");
      const showDates: string[] = [];

      $("table tr").each((_, row) => {
        const $row = $(row);
        const dateCell = $row.find("td").filter((_, td) => {
          const text = $(td).text().trim();
          return /\d{2}\.\d{2}\.\d{2,4}/.test(text);
        });

        if (dateCell.length > 0) {
          const dateText = dateCell.first().text().trim();
          showDates.push(dateText);
        }
      });

      console.log(`  Found ${showDates.length} show dates`);
      if (showDates.length > 0) {
        console.log(`  First show: ${showDates[0]}`);
        console.log(`  Last show: ${showDates[showDates.length - 1]}`);
      }

      // Look for top songs table
      console.log("\n  Looking for top songs...");
      let foundTopSongs = false;

      $("table").each((_, table) => {
        const $table = $(table);
        const headerText = $table.find("th, .header").text().toLowerCase();

        if (headerText.includes("most played") || headerText.includes("top songs")) {
          foundTopSongs = true;
          console.log(`  Found "Most Played" section`);

          const songs: { title: string; count: string }[] = [];
          $table.find("tr").slice(0, 10).each((_, row) => {
            const $row = $(row);
            const songLink = $row.find("a[href*='SongStats']").first();

            if (songLink.length > 0) {
              const songTitle = songLink.text().trim();
              const cells = $row.find("td").map((_, td) => $(td).text().trim()).get();

              songs.push({
                title: songTitle,
                count: cells.find(c => /^\d+$/.test(c)) || "?",
              });
            }
          });

          console.log(`  Top songs found: ${songs.length}`);
          songs.slice(0, 5).forEach(s => {
            console.log(`    - ${s.title}: ${s.count}`);
          });
        }
      });

      if (!foundTopSongs) {
        console.log("  No 'Most Played' section found on this page");
      }

      // Display table structure
      console.log("\n  Page structure analysis:");
      console.log(`  - Total tables: ${$("table").length}`);
      console.log(`  - Total rows: ${$("tr").length}`);
      console.log(`  - H1 tags: ${$("h1").length}`);
      console.log(`  - Song links: ${$("a[href*='SongStats']").length}`);
      console.log(`  - Show links: ${$("a[href*='TourShowSet'], a[href*='ShowSetlist']").length}`);
    }

    console.log("\n✓ Tours scraper test completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

testToursScraper();
