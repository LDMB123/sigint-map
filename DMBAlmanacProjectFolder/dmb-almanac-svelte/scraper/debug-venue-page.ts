/**
 * Debug script to examine venue detail page structure
 */

import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function main() {
  console.log("Debugging venue page structure...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)",
  });

  try {
    // Get a venue page (Minneapolis Stadium = vid=32166)
    await page.goto(`${BASE_URL}/VenueStats.aspx?vid=32166`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const html = await page.content();
    writeFileSync("output/debug-venue-page.html", html, "utf-8");
    console.log("Saved full HTML to output/debug-venue-page.html");

    // Extract key data
    const data = await page.evaluate(() => {
      const result: Record<string, string> = {};

      // Get venue name from h1
      const h1 = document.querySelector("h1");
      if (h1) result.venueName = h1.textContent?.trim() || "";

      // Get full text to analyze patterns
      const text = document.body.innerText;
      result.textSample = text.substring(0, 2000);

      return result;
    });

    console.log("\nExtracted data:");
    console.log("Venue Name:", data.venueName);
    console.log("\nPage text sample:\n", data.textSample);

    // Also check if there's a venue dropdown
    const venueDropdown = await page.evaluate(() => {
      const select = document.querySelector("select[id*='Venue']") as HTMLSelectElement;
      if (select) {
        const options: { id: string; name: string }[] = [];
        select.querySelectorAll("option").forEach(opt => {
          if (opt.value) {
            options.push({ id: opt.value, name: opt.textContent?.trim() || "" });
          }
        });
        return { count: options.length, sample: options.slice(0, 20) };
      }
      return null;
    });

    if (venueDropdown) {
      console.log(`\nVenue dropdown found: ${venueDropdown.count} venues`);
      console.log("Sample venues:", venueDropdown.sample);
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
