import * as cheerio from "cheerio";
import { readFileSync } from "fs";

// Read the saved HTML file
const html = readFileSync("debug-show.html", "utf-8");
const $ = cheerio.load(html);

console.log("=== Analyzing Setlist Table Structure ===\n");

// Find the setlist table
const setTable = $("#SetTable");
if (setTable.length === 0) {
  console.log("No table with id='SetTable' found");
  process.exit(1);
}

console.log(`Found SetTable with ${setTable.find("tr").length} rows\n`);

// Analyze first 20 rows
setTable.find("tr").slice(0, 20).each((i, row) => {
  const $row = $(row);
  const cells = $row.find("td");

  console.log(`Row ${i}:`);
  console.log(`  Cells: ${cells.length}`);

  cells.each((j, cell) => {
    const $cell = $(cell);
    const text = $cell.text().trim().substring(0, 60);
    const bgcolor = $cell.attr("bgcolor") || $cell.css("background-color") || "none";
    const links = $cell.find("a");

    console.log(`  Cell ${j}:`);
    console.log(`    Text: "${text}"`);
    console.log(`    BgColor: ${bgcolor}`);

    if (links.length > 0) {
      links.each((k, link) => {
        const href = $(link).attr("href") || "";
        const linkText = $(link).text().trim().substring(0, 40);
        console.log(`    Link ${k}: "${linkText}" -> ${href.substring(0, 60)}`);
      });
    }
  });

  console.log("");
});

// Look for song title patterns
console.log("\n=== Looking for Song Title Patterns ===\n");

// Pattern 1: Links containing song IDs
$("a").each((i, el) => {
  const href = $(el).attr("href") || "";
  if (href.includes("sid=") && !href.includes("TourShowSet")) {
    console.log(`Found song link: ${$(el).text().trim()} -> ${href}`);
  }
});

// Pattern 2: Table cells with specific background colors (song rows)
setTable.find("tr").each((i, row) => {
  const $row = $(row);
  const firstCell = $row.find("td").first();
  const bgcolor = firstCell.attr("bgcolor") || "";

  if (bgcolor && bgcolor.includes("6666")) {
    console.log(`\nOpener row ${i}:`);
    $row.find("td").each((j, cell) => {
      console.log(`  ${j}: ${$(cell).text().trim().substring(0, 50)}`);
    });
  }
});
