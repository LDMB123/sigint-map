/**
 * Debug script to examine guest detail page structure
 */

import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function main() {
  console.log("Debugging guest page structure...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Get Tim Reynolds guest page (gid=3)
    await page.goto(`${BASE_URL}/GuestStats.aspx?gid=3`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const html = await page.content();
    writeFileSync("output/debug-guest-page.html", html, "utf-8");
    console.log("Saved full HTML to output/debug-guest-page.html");

    // Extract key data
    const data = await page.evaluate(() => {
      const result: Record<string, string> = {};

      // Get all h1 elements
      document.querySelectorAll("h1").forEach((h1, i) => {
        result[`h1_${i}`] = h1.textContent?.trim() || "";
      });

      // Get sidebar content
      const sidebar = document.querySelector(".sidebar");
      if (sidebar) {
        result.sidebarText = sidebar.textContent?.substring(0, 1000) || "";
      }

      // Get text containing "guitar" or "Show Appearances"
      const text = document.body.innerText;
      const match = text.match(/Tim Reynolds[\s\S]{0,200}/);
      if (match) {
        result.timReynoldsContext = match[0];
      }

      // Look for statistics patterns
      const statsMatch = text.match(/Show Appearances[\s\S]{0,100}/);
      if (statsMatch) {
        result.statsContext = statsMatch[0];
      }

      return result;
    });

    console.log("\nExtracted data:");
    for (const [key, value] of Object.entries(data)) {
      console.log(`\n${key}:\n${value}\n---`);
    }

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
