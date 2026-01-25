import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.dmbalmanac.com";

async function debugShowPage() {
  console.log("Debugging show page HTML structure...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent": "DMBAlmanacClone/1.0 (Educational Project)"
  });

  // Scrape a specific 2023 show
  const showUrl = `${BASE_URL}/TourShowSet.aspx?id=453091029&tid=8171&where=2023`;
  console.log(`Fetching: ${showUrl}\n`);

  await page.goto(showUrl, { waitUntil: "networkidle", timeout: 30000 });

  const html = await page.content();

  // Save HTML to file for inspection
  writeFileSync("debug-show.html", html, "utf-8");
  console.log("Saved HTML to: debug-show.html");

  // Extract key information
  const pageText = await page.evaluate(() => document.body.innerText);

  console.log("\n--- Page Text Sample (first 500 chars) ---");
  console.log(pageText.substring(0, 500));

  console.log("\n--- All Links ---");
  const links = await page.evaluate(() => {
    const allLinks: { href: string; text: string }[] = [];
    document.querySelectorAll("a").forEach((a) => {
      allLinks.push({
        href: a.getAttribute("href") || "",
        text: a.textContent?.trim() || ""
      });
    });
    return allLinks;
  });

  console.log("Song links (SongStats):");
  links
    .filter((l) => l.href.includes("SongStats"))
    .slice(0, 10)
    .forEach((l, i) => {
      console.log(`  ${i + 1}. ${l.text} -> ${l.href}`);
    });

  console.log("\nVenue links (VenueStats):");
  links
    .filter((l) => l.href.includes("VenueStats"))
    .forEach((l) => {
      console.log(`  - ${l.text} -> ${l.href}`);
    });

  console.log("\nGuest links (GuestStats):");
  links
    .filter((l) => l.href.includes("GuestStats"))
    .forEach((l) => {
      console.log(`  - ${l.text} -> ${l.href}`);
    });

  await browser.close();
}

debugShowPage().catch(console.error);
