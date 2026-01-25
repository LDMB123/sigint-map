#!/usr/bin/env node
/**
 * Test script for rarity scraper
 *
 * This script tests the ShowRarity.aspx scraper to verify:
 * - Page can be fetched and cached
 * - Tour rarity data can be extracted
 * - Show-level rarity indices are parsed
 * - Data structure is valid
 *
 * Usage:
 *   npm run test:rarity
 *   tsx src/test-rarity-scraper.ts
 */

import { scrapeRarity, saveRarity } from "./scrapers/rarity.js";

async function testRarityScraper() {
  console.log("=".repeat(60));
  console.log("Testing Rarity Scraper");
  console.log("=".repeat(60));
  console.log();

  try {
    // Run the scraper
    console.log("Starting rarity scraper...");
    const data = await scrapeRarity();

    // Display summary
    console.log();
    console.log("=".repeat(60));
    console.log("Scrape Summary");
    console.log("=".repeat(60));
    console.log(`Scraped at: ${data.scrapedAt}`);
    console.log(`Source: ${data.source}`);
    console.log(`Total tours: ${data.totalTours}`);
    console.log(`Total shows: ${data.totalShows}`);
    console.log();

    // Display tour samples
    console.log("=".repeat(60));
    console.log("Sample Tours (Most Recent)");
    console.log("=".repeat(60));

    const sampleTours = data.tours.slice(0, 5);
    for (const tour of sampleTours) {
      console.log();
      console.log(`Tour: ${tour.tourName} (${tour.year})`);
      console.log(`  Average Rarity Index: ${tour.averageRarityIndex.toFixed(3)}`);
      console.log(`  Different Songs Played: ${tour.differentSongsPlayed}`);
      if (tour.catalogPercentage !== undefined) {
        console.log(`  Catalog Coverage: ${tour.catalogPercentage.toFixed(1)}%`);
      }
      if (tour.rank !== undefined) {
        console.log(`  Rarity Rank: ${tour.rank}`);
      }
      console.log(`  Shows with data: ${tour.shows.length}`);

      // Show sample shows from this tour
      if (tour.shows.length > 0) {
        const sampleShows = tour.shows.slice(0, 3);
        console.log(`  Sample shows:`);
        for (const show of sampleShows) {
          const location = show.state ? `${show.city}, ${show.state}` : show.city;
          const rarityStr = show.rarityIndex > 0 ? show.rarityIndex.toFixed(3) : "N/A";
          console.log(`    - ${show.date}: ${show.venueName} (${location}) - Rarity: ${rarityStr}`);
        }
      }
    }

    // Validation checks
    console.log();
    console.log("=".repeat(60));
    console.log("Validation Checks");
    console.log("=".repeat(60));

    const checks = {
      hasData: data.tours.length > 0,
      hasMeaningfulData: data.tours.some(t =>
        t.averageRarityIndex > 0 || t.differentSongsPlayed > 0 || t.shows.length > 0
      ),
      hasShowData: data.tours.some(t => t.shows.length > 0),
      hasRarityIndices: data.tours.some(t =>
        t.shows.some(s => s.rarityIndex > 0)
      ),
      hasRecentYears: data.tours.some(t => t.year >= 2020),
      hasHistoricalYears: data.tours.some(t => t.year < 2000),
    };

    for (const [check, passed] of Object.entries(checks)) {
      const status = passed ? "✓ PASS" : "✗ FAIL";
      console.log(`${status}: ${check}`);
    }

    // Save to file
    console.log();
    console.log("=".repeat(60));
    console.log("Saving Data");
    console.log("=".repeat(60));
    saveRarity(data);

    // Final status
    console.log();
    const allPassed = Object.values(checks).every(v => v === true);
    if (allPassed) {
      console.log("✓ All validation checks passed!");
      console.log("✓ Rarity scraper test completed successfully");
    } else {
      console.log("⚠ Some validation checks failed");
      console.log("⚠ Review the output above for details");
      console.log();
      console.log("Note: This may be expected if the page structure is different");
      console.log("than anticipated. Check the scraped data manually.");
    }

    console.log();
    console.log("Next steps:");
    console.log("1. Review scraper/output/rarity.json");
    console.log("2. Check scraper/cache/ for cached HTML");
    console.log("3. Adjust selectors in rarity.ts if needed");
    console.log("4. Run full scrape: npm run scrape:rarity");

  } catch (error) {
    console.error();
    console.error("=".repeat(60));
    console.error("ERROR");
    console.error("=".repeat(60));
    console.error(error);
    console.error();
    console.error("The scraper encountered an error. This could mean:");
    console.error("- Network connectivity issues");
    console.error("- Page structure has changed");
    console.error("- Selector patterns need adjustment");
    console.error();
    console.error("Check the error message above for details.");
    process.exit(1);
  }
}

// Run test
testRarityScraper();
