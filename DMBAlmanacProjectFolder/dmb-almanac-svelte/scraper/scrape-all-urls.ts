import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const BASE_URL = "https://www.dmbalmanac.com";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "../output");

async function scrapeAllShowUrls() {
  console.log("Scraping show URLs for all years (1991-2026)...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)"
  });

  const allShowUrls: { year: number; urls: string[] }[] = [];
  let totalShows = 0;

  const currentYear = new Date().getFullYear();

  for (let year = 1991; year <= currentYear; year++) {
    const url = `${BASE_URL}/TourShow.aspx?where=${year}`;
    console.log(`Fetching ${year}...`);

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const html = await page.content();
      const $ = cheerio.load(html);

      const showUrls: string[] = [];
      $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
        const href = $(el).attr("href");
        if (href && !showUrls.includes(href)) {
          let fullUrl = href;
          if (!href.startsWith("http")) {
            fullUrl = href.startsWith("/") ? `${BASE_URL}${href}` : `${BASE_URL}/${href}`;
          }
          showUrls.push(fullUrl);
        }
      });

      allShowUrls.push({ year, urls: showUrls });
      totalShows += showUrls.length;
      console.log(`  Found ${showUrls.length} shows (total: ${totalShows})`);

      // Small delay between years to be respectful
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`  Error fetching ${year}:`, error);
      allShowUrls.push({ year, urls: [] });
    }
  }

  await browser.close();

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Save to JSON
  const output = {
    scrapedAt: new Date().toISOString(),
    totalYears: allShowUrls.length,
    totalShows,
    years: allShowUrls
  };

  const filepath = join(OUTPUT_DIR, "show-urls.json");
  writeFileSync(filepath, JSON.stringify(output, null, 2));

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total years: ${allShowUrls.length}`);
  console.log(`Total shows: ${totalShows}`);
  console.log(`Saved to: ${filepath}`);

  // Breakdown by decade
  console.log(`\n=== BREAKDOWN BY DECADE ===`);
  const decades = new Map<number, number>();
  for (const { year, urls } of allShowUrls) {
    const decade = Math.floor(year / 10) * 10;
    decades.set(decade, (decades.get(decade) || 0) + urls.length);
  }

  for (const [decade, count] of Array.from(decades.entries()).sort()) {
    console.log(`${decade}s: ${count} shows`);
  }

  // Years with issues
  console.log(`\n=== YEARS WITH ISSUES ===`);
  const problemYears = allShowUrls.filter(({ urls }) => urls.length === 0);
  if (problemYears.length > 0) {
    problemYears.forEach(({ year }) => console.log(`  ${year}: 0 shows found`));
  } else {
    console.log("  None - all years scraped successfully!");
  }

  return output;
}

scrapeAllShowUrls().catch(console.error);
