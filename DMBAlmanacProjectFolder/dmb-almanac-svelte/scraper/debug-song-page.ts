/**
 * Debug script to examine a song detail page structure
 */

import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function main() {
  console.log("Debugging song page structure...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Get the Ants Marching song page (sid=1)
    await page.goto(`${BASE_URL}/SongStats.aspx?sid=1`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const html = await page.content();
    writeFileSync("output/debug-song-page.html", html, "utf-8");
    console.log("Saved full HTML to output/debug-song-page.html");

    // Extract key statistics using JavaScript evaluation
    const stats = await page.evaluate(() => {
      const result: Record<string, string> = {};

      // Find all text content
      const text = document.body.innerText;

      // Find specific patterns
      const patterns = [
        { name: "totalPlays", regex: /Total known plays:\s*(\d+)/i },
        { name: "liveDebut", regex: /Live Debut:\s*([\d.]+)/i },
        { name: "lastPlayed", regex: /Last Full:\s*([\d.]+)/i },
        { name: "cumulativeTime", regex: /Total cumulative song time:\s*([\d:]+)/i },
        { name: "composer", regex: /Composer:\s*([^\n]+)/i },
      ];

      for (const p of patterns) {
        const match = text.match(p.regex);
        if (match) {
          result[p.name] = match[1];
        }
      }

      return result;
    });

    console.log("\nExtracted stats:", stats);

    // Also get table data
    const tables = await page.evaluate(() => {
      const tables: string[] = [];
      document.querySelectorAll("table").forEach((t, i) => {
        if (t.innerText.length > 50 && t.innerText.length < 2000) {
          tables.push(`--- Table ${i} ---\n${t.innerText.substring(0, 500)}`);
        }
      });
      return tables.slice(0, 5);
    });

    console.log("\nSample tables:");
    tables.forEach(t => console.log(t));

  } finally {
    await browser.close();
  }
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
