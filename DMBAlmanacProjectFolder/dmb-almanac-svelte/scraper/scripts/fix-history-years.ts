#!/usr/bin/env npx tsx
/**
 * Fix corrupted year data in history.json
 * The original scraper was looking for MM.DD.YYYY but site uses MM.DD.YY
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "../output");

interface HistoryDayShow {
  originalId: string;
  showDate: string;
  year: number;
  venueName: string;
  city: string;
  state?: string;
  country: string;
  notes?: string;
}

interface HistoryDay {
  month: number;
  day: number;
  calendarDate: string;
  shows: HistoryDayShow[];
  totalYears: number;
  firstYear?: number;
  lastYear?: number;
  yearsSinceLastPlayed?: number;
}

interface HistoryOutput {
  scrapedAt: string;
  source: string;
  totalItems: number;
  days: HistoryDay[];
}

function parseYearFromId(showDate: string, showId: string, month: number, day: number): { date: string; year: number } | null {
  // The show IDs are very long numbers that contain encoded date info
  // But we can reconstruct from the calendar date (month/day) and available show data

  // If we already have a valid date format, parse it
  const validDateMatch = showDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (validDateMatch) {
    const year = parseInt(validDateMatch[1], 10);
    if (year >= 1991 && year <= 2030) {
      return { date: showDate, year };
    }
  }

  // Try to get year from the URL "where" parameter which shows.json uses
  // Unfortunately we don't have that info here, so we need to derive from context

  return null;
}

function fixHistoryData(): void {
  const filepath = join(OUTPUT_DIR, "history.json");

  console.log("Loading history.json...");
  const data: HistoryOutput = JSON.parse(readFileSync(filepath, "utf-8"));

  let fixedCount = 0;
  let removedCount = 0;

  // Process each day
  for (const day of data.days) {
    // Filter out shows with invalid years
    const validShows = day.shows.filter((show) => {
      // Keep only shows with valid years (1991-2030)
      if (show.year >= 1991 && show.year <= 2030) {
        return true;
      }

      // Try to reconstruct year from show date
      const dateMatch = show.showDate.match(/^(\d{4})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        if (year >= 1991 && year <= 2030) {
          show.year = year;
          fixedCount++;
          return true;
        }
      }

      removedCount++;
      return false;
    });

    day.shows = validShows;

    // Recalculate stats
    const years = day.shows.map((s) => s.year);
    const uniqueYears = new Set(years);
    day.totalYears = uniqueYears.size;
    day.firstYear = years.length > 0 ? Math.min(...years) : undefined;
    day.lastYear = years.length > 0 ? Math.max(...years) : undefined;

    const currentYear = new Date().getFullYear();
    day.yearsSinceLastPlayed = day.lastYear ? currentYear - day.lastYear : undefined;
  }

  // Update metadata
  data.scrapedAt = new Date().toISOString();

  // Save fixed data
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`Fixed ${fixedCount} shows`);
  console.log(`Removed ${removedCount} shows with invalid years`);

  // Verify
  let totalShows = 0;
  const allYears = new Set<number>();
  for (const day of data.days) {
    totalShows += day.shows.length;
    for (const show of day.shows) {
      allYears.add(show.year);
    }
  }

  console.log(`\nVerification:`);
  console.log(`  Total shows remaining: ${totalShows}`);
  console.log(`  Year range: ${Math.min(...allYears)} - ${Math.max(...allYears)}`);
  console.log(`  Unique years: ${allYears.size}`);
}

// Run
fixHistoryData();
