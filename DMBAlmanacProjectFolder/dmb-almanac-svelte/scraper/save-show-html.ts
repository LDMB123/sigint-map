import { chromium } from "playwright";
import { writeFileSync } from "fs";

async function saveHtml() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://dmbalmanac.com/TourShowSet.aspx?id=453056860&tid=65&where=1991", {
      waitUntil: "networkidle",
      timeout: 60000
    });

    const html = await page.content();
    writeFileSync("/tmp/dmb-show.html", html, "utf-8");
    console.log("Saved HTML to /tmp/dmb-show.html");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

saveHtml();
