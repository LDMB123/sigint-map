import { chromium } from "playwright";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.dmbalmanac.com";

async function testScraper() {
  console.log("Testing scraper on DMBAlmanac.com...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)",
  });

  try {
    // Test 1: Fetch venue list
    console.log("Test 1: Fetching venue list...");
    await page.goto(`${BASE_URL}/VenueStats.aspx`, { waitUntil: "networkidle" });
    const venueListHtml = await page.content();
    const $venues = cheerio.load(venueListHtml);

    const venueLinks: { name: string; url: string; vid: string }[] = [];
    $venues("a[href*='VenueStats.aspx'][href*='vid=']").each((_, el) => {
      const href = $venues(el).attr("href") || "";
      const name = $venues(el).text().trim();
      const vidMatch = href.match(/vid=(\d+)/);
      if (vidMatch && name) {
        venueLinks.push({
          name,
          url: `${BASE_URL}/${href.replace(/^\.\//, "")}`,
          vid: vidMatch[1],
        });
      }
    });

    console.log(`  Found ${venueLinks.length} venue links`);
    console.log(`  First 5 venues:`);
    venueLinks.slice(0, 5).forEach((v) => {
      console.log(`    - ${v.name} (vid=${v.vid})`);
    });

    // Test 2: Fetch a specific venue page
    console.log("\nTest 2: Fetching The Gorge (vid=1018)...");
    await page.goto(`${BASE_URL}/VenueStats.aspx?vid=1018`, { waitUntil: "networkidle" });
    const venueHtml = await page.content();
    const $venue = cheerio.load(venueHtml);

    // Get the full HTML to look at structure
    console.log("  Looking at HTML structure...");

    // Try to get venue info from table structure
    const venueTableData: string[] = [];
    $venue("table td, table th").each((_, el) => {
      const text = $venue(el).text().trim();
      if (text && text.length > 1 && text.length < 100) {
        venueTableData.push(text);
      }
    });

    console.log(`  Found ${venueTableData.length} table cells`);
    console.log("  First 30 table cells:");
    venueTableData.slice(0, 30).forEach((cell, i) => {
      console.log(`    ${i}: "${cell.substring(0, 80)}"`);
    });

    // Try to find venue name in title or other meta
    const pageTitle = $venue("title").text();
    console.log(`  Page title: "${pageTitle}"`);

    // Look at specific elements that might contain venue info
    const h1Text = $venue("h1, h2, h3").map((_, el) => $venue(el).text().trim()).get();
    console.log("  Headers found:", h1Text);

    // Test 3: Fetch show list for 2023
    console.log("\nTest 3: Fetching 2023 shows...");
    await page.goto(`${BASE_URL}/TourShowSet.aspx?where=2023`, { waitUntil: "networkidle" });
    const showsHtml = await page.content();
    const $shows = cheerio.load(showsHtml);

    const showLinks: { url: string; id: string; text: string }[] = [];
    $shows("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
      const href = $shows(el).attr("href") || "";
      const text = $shows(el).text().trim();
      const idMatch = href.match(/id=(\d+)/);
      if (idMatch) {
        showLinks.push({
          url: `${BASE_URL}/${href.replace(/^\.\//, "")}`,
          id: idMatch[1],
          text,
        });
      }
    });

    // Remove duplicates
    const uniqueShows = showLinks.filter(
      (show, index, self) => index === self.findIndex((s) => s.id === show.id)
    );

    console.log(`  Found ${uniqueShows.length} unique show links`);
    console.log(`  First 5 shows:`);
    uniqueShows.slice(0, 5).forEach((s) => {
      console.log(`    - ${s.text} (id=${s.id})`);
    });

    // Test 4: Fetch a specific show setlist - use a known show with data
    console.log("\nTest 4: Fetching setlist for The Gorge 09/03/2023...");
    // Use a known show ID from 2023
    await page.goto(`${BASE_URL}/TourShowSet.aspx?id=453086972`, { waitUntil: "networkidle" });
    const setlistHtml = await page.content();
    const $setlist = cheerio.load(setlistHtml);

    // Find song links - try different selector patterns
    const songLinks: { title: string; songId: string; href: string }[] = [];
    $setlist("a").each((_, el) => {
      const href = $setlist(el).attr("href") || "";
      const title = $setlist(el).text().trim();
      if (href.includes("SongStats") || href.includes("sid=")) {
        const sidMatch = href.match(/sid=(\d+)/);
        if (sidMatch && title) {
          songLinks.push({ title, songId: sidMatch[1], href });
        }
      }
    });

    console.log(`  Found ${songLinks.length} songs in setlist:`);
    songLinks.slice(0, 15).forEach((song, i) => {
      console.log(`    ${i + 1}. ${song.title} (sid=${song.songId})`);
    });

    // Look at table data
    const setlistTableData: string[] = [];
    $setlist("table td").each((_, el) => {
      const text = $setlist(el).text().trim();
      if (text && text.length > 1 && text.length < 200) {
        setlistTableData.push(text);
      }
    });

    console.log(`\n  Found ${setlistTableData.length} table cells`);
    console.log("  First 50 table cells:");
    setlistTableData.slice(0, 50).forEach((cell, i) => {
      console.log(`    ${i}: "${cell.substring(0, 100)}"`);
    });

    // Check page title
    const setlistTitle = $setlist("title").text();
    console.log(`\n  Page title: "${setlistTitle}"`);

    // Test 5: Fetch songs list - try different URL
    console.log("\nTest 5: Fetching songs list...");
    await page.goto(`${BASE_URL}/SongStats.aspx`, { waitUntil: "networkidle" });
    const songsHtml = await page.content();
    const $songs = cheerio.load(songsHtml);

    // Look for any links containing 'sid='
    const songLinksMain: { title: string; sid: string; href: string }[] = [];
    $songs("a").each((_, el) => {
      const href = $songs(el).attr("href") || "";
      const title = $songs(el).text().trim();
      const sidMatch = href.match(/sid=(\d+)/);
      if (sidMatch && title && !songLinksMain.find(s => s.sid === sidMatch[1])) {
        songLinksMain.push({ title, sid: sidMatch[1], href });
      }
    });

    console.log(`  Found ${songLinksMain.length} song links`);
    console.log(`  First 20 songs:`);
    songLinksMain.slice(0, 20).forEach((s) => {
      console.log(`    - ${s.title} (sid=${s.sid})`);
    });

    // Test 6: Understand the actual setlist structure for a show
    console.log("\nTest 6: Analyzing setlist page structure...");

    // Look for the actual setlist table data more carefully
    // The setlist should be in a specific table or section
    const rows: { class: string; cells: string[] }[] = [];
    $setlist("tr").each((_, tr) => {
      const rowClass = $setlist(tr).attr("class") || "";
      const cells: string[] = [];
      $setlist(tr).find("td").each((_, td) => {
        cells.push($setlist(td).text().trim().substring(0, 50));
      });
      if (cells.length > 0 && cells.some(c => c.length > 0)) {
        rows.push({ class: rowClass, cells });
      }
    });

    console.log(`  Found ${rows.length} table rows`);
    console.log("  Sample rows (with classes):");
    rows.slice(0, 30).forEach((row, i) => {
      console.log(`    ${i} [${row.class || "no-class"}]: ${row.cells.join(" | ")}`);
    });

    console.log("\n✓ Scraper test completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

testScraper();
