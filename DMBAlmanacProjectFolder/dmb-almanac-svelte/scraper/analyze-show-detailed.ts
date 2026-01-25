import { chromium } from "playwright";
import * as cheerio from "cheerio";

async function analyzeDetailed() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://dmbalmanac.com/TourShowSet.aspx?id=453056860&tid=65&where=1991", {
      waitUntil: "networkidle",
      timeout: 60000
    });

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log("=== DATE ===");
    const dateSelect = $("select option:selected").filter((i, el) => $(el).text().includes("."));
    console.log("Date from dropdown:", dateSelect.text());

    console.log("\n=== VENUE ===");
    // Find "Dave Matthews Band" text and look for venue info nearby
    $("*").each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();

      if (text === "Dave Matthews Band" && $el.children().length === 0) {
        console.log("Found 'Dave Matthews Band' element");
        console.log("Parent:", $el.parent().prop("tagName"));

        // Look in siblings
        $el.parent().parent().find("a[href*='VenueStats']").each((vi, v) => {
          console.log("Venue link found:", $(v).text().trim(), "->", $(v).attr("href"));
        });
      }
    });

    // Check table after date dropdown
    console.log("\n=== SETLIST TABLE ===");
    const setTable = $("#SetTable");
    console.log("SetTable exists:", setTable.length > 0);

    if (setTable.length > 0) {
      console.log("SetTable rows:", setTable.find("tr").length);

      setTable.find("tr").each((i, row) => {
        const $row = $(row);
        const songLink = $row.find("a[href*='SongStats']");

        if (songLink.length > 0) {
          console.log(`\nRow ${i}:`);
          console.log("  Song:", songLink.text().trim());
          console.log("  Song href:", songLink.attr("href"));

          // Find all links in row
          $row.find("a").each((li, link) => {
            const $link = $(link);
            const href = $link.attr("href") || "";
            const text = $link.text().trim();

            if (href.includes("GuestStats")) {
              console.log("  Guest:", text, "->", href);
            } else if (href.includes("VenueStats")) {
              console.log("  Venue:", text, "->", href);
            }
          });

          // Get row text
          const cellTexts = $row.find("td").map((ci, cell) => $(cell).text().trim()).get();
          console.log("  Cells:", cellTexts);
        }
      });
    }

    console.log("\n=== ALL GUEST LINKS ===");
    $("a[href*='GuestStats']").each((i, g) => {
      const text = $(g).text().trim();
      const href = $(g).attr("href");
      console.log(`Guest ${i}: "${text}" -> ${href}`);
    });

    console.log("\n=== BAND LINEUP INFO ===");
    $("*").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("All songs feature the lineup") || text.includes("Dave Matthews, Carter Beauford")) {
        console.log("Found lineup text:", text.substring(0, 200));
      }
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

analyzeDetailed();
