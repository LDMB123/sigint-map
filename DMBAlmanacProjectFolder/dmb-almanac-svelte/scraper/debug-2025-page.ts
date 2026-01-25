/**
 * Debug script to examine the 2025 tour page structure
 */

import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function main() {
  console.log("Debugging 2025 page structure...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Get the 2025 tour page
    await page.goto(`${BASE_URL}/TourShow.aspx?where=2025`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const html = await page.content();
    writeFileSync("output/debug-2025-page.html", html, "utf-8");
    console.log("Saved full HTML to output/debug-2025-page.html");

    // Also get a specific show page
    await page.goto(`${BASE_URL}/TourShowSet.aspx?id=453094308&tid=8183&where=2025`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const showHtml = await page.content();
    writeFileSync("output/debug-show-page.html", showHtml, "utf-8");
    console.log("Saved show HTML to output/debug-show-page.html");

    // Print some structure info
    console.log("\n--- Page Analysis ---");

    // Find all TourShowSet links
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll("a"));
      return allLinks
        .filter(a => a.href.includes("TourShowSet.aspx"))
        .map(a => ({
          href: a.href,
          text: a.textContent?.trim() || "",
          parentText: a.parentElement?.textContent?.trim().substring(0, 100) || "",
        }))
        .slice(0, 10);
    });

    console.log("\nSample TourShowSet links:");
    links.forEach(l => {
      console.log(`  Text: "${l.text}"`);
      console.log(`  Parent: "${l.parentText}"`);
      console.log("");
    });

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
