#!/usr/bin/env node
/**
 * DMB Almanac - Validate JSON Export
 *
 * Validates the JSON export files for consistency and correctness.
 *
 * Usage:
 *   npx ts-node scripts/validate-export.ts
 */

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

interface ValidationResult {
  file: string;
  valid: boolean;
  recordCount: number;
  size: number;
  errors: string[];
}

const results: ValidationResult[] = [];

function validateFile(filePath: string): ValidationResult {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    recordCount: 0,
    size: 0,
    errors: [],
  };

  try {
    const content = readFileSync(filePath, "utf-8");
    const stats = statSync(filePath);
    result.size = stats.size;

    // Parse JSON
    const data = JSON.parse(content);

    // Check if array or object (manifest is object)
    const fileName = filePath.split("/").pop() || "";
    const isManifest = fileName === "manifest.json";

    if (!isManifest && !Array.isArray(data)) {
      result.errors.push("Not an array");
      result.valid = false;
      return result;
    }

    result.recordCount = Array.isArray(data) ? data.length : 1;

    switch (fileName) {
      case "venues.json":
        validateVenues(data, result);
        break;
      case "songs.json":
        validateSongs(data, result);
        break;
      case "tours.json":
        validateTours(data, result);
        break;
      case "shows.json":
        validateShows(data, result);
        break;
      case "setlist-entries.json":
        validateSetlistEntries(data, result);
        break;
      case "guests.json":
        validateGuests(data, result);
        break;
      case "guest-appearances.json":
        validateGuestAppearances(data, result);
        break;
      case "liberation-list.json":
        validateLiberationList(data, result);
        break;
      case "song-statistics.json":
        validateSongStatistics(data, result);
        break;
      case "manifest.json":
        validateManifest(data, result);
        break;
    }

    if (result.errors.length > 0) {
      result.valid = false;
    }
  } catch (error) {
    result.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    result.valid = false;
  }

  return result;
}

function validateVenues(data: any[], result: ValidationResult) {
  const requiredFields = ["id", "name", "city", "country", "countryCode", "searchText"];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const venue = data[i];
    for (const field of requiredFields) {
      if (!(field in venue)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }

    if (!Array.isArray(venue.searchText)) {
      // searchText should be a string
      if (typeof venue.searchText !== "string") {
        result.errors.push(`Record ${i}: searchText is not a string`);
      }
    }
  }
}

function validateSongs(data: any[], result: ValidationResult) {
  const requiredFields = ["id", "title", "slug", "sortTitle", "searchText"];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const song = data[i];
    for (const field of requiredFields) {
      if (!(field in song)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }

    if (song.isCover !== null && typeof song.isCover !== "boolean") {
      result.errors.push(`Record ${i}: isCover is not a boolean`);
    }
  }
}

function validateTours(data: any[], result: ValidationResult) {
  const requiredFields = ["id", "name", "year"];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const tour = data[i];
    for (const field of requiredFields) {
      if (!(field in tour)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }

    if (typeof tour.year !== "number") {
      result.errors.push(`Record ${i}: year is not a number`);
    }
  }
}

function validateShows(data: any[], result: ValidationResult) {
  const requiredFields = ["id", "date", "venueId", "tourId", "venue", "tour", "year"];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const show = data[i];
    for (const field of requiredFields) {
      if (!(field in show)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }

    // Validate embedded venue
    if (show.venue && typeof show.venue !== "object") {
      result.errors.push(`Record ${i}: venue is not an object`);
    }

    // Validate embedded tour
    if (show.tour && typeof show.tour !== "object") {
      result.errors.push(`Record ${i}: tour is not an object`);
    }
  }
}

function validateSetlistEntries(data: any[], result: ValidationResult) {
  const requiredFields = [
    "id",
    "showId",
    "songId",
    "position",
    "setName",
    "slot",
    "song",
    "showDate",
    "year",
  ];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const entry = data[i];
    for (const field of requiredFields) {
      if (!(field in entry)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }

    // Validate embedded song
    if (entry.song && typeof entry.song !== "object") {
      result.errors.push(`Record ${i}: song is not an object`);
    }

    // Validate set name
    const validSets = ["set1", "set2", "set3", "encore", "encore2"];
    if (!validSets.includes(entry.setName)) {
      result.errors.push(`Record ${i}: invalid setName ${entry.setName}`);
    }

    // Validate slot
    const validSlots = ["opener", "closer", "standard"];
    if (!validSlots.includes(entry.slot)) {
      result.errors.push(`Record ${i}: invalid slot ${entry.slot}`);
    }
  }
}

function validateGuests(data: any[], result: ValidationResult) {
  const requiredFields = ["id", "name", "slug", "searchText"];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const guest = data[i];
    for (const field of requiredFields) {
      if (!(field in guest)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }
  }
}

function validateGuestAppearances(data: any[], result: ValidationResult) {
  if (data.length === 0) {
    // Empty is OK
    return;
  }

  const requiredFields = ["id", "guestId", "showId", "showDate", "year"];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const appearance = data[i];
    for (const field of requiredFields) {
      if (!(field in appearance)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }
  }
}

function validateLiberationList(data: any[], result: ValidationResult) {
  const requiredFields = [
    "id",
    "songId",
    "lastPlayedDate",
    "daysSince",
    "showsSince",
    "song",
    "lastShow",
  ];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const entry = data[i];
    for (const field of requiredFields) {
      if (!(field in entry)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }

    // Validate embedded song
    if (entry.song && typeof entry.song !== "object") {
      result.errors.push(`Record ${i}: song is not an object`);
    }

    // Validate embedded show
    if (entry.lastShow && typeof entry.lastShow !== "object") {
      result.errors.push(`Record ${i}: lastShow is not an object`);
    }
  }
}

function validateSongStatistics(data: any[], result: ValidationResult) {
  const requiredFields = ["id", "songId"];

  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const stats = data[i];
    for (const field of requiredFields) {
      if (!(field in stats)) {
        result.errors.push(`Record ${i}: missing ${field}`);
        break;
      }
    }
  }
}

function validateManifest(data: any, result: ValidationResult) {
  const requiredFields = ["version", "timestamp", "recordCounts", "totalSize", "files"];

  for (const field of requiredFields) {
    if (!(field in data)) {
      result.errors.push(`Missing ${field}`);
    }
  }

  if (data.recordCounts) {
    const expected = [
      "venues",
      "songs",
      "tours",
      "shows",
      "setlistEntries",
      "guests",
      "guestAppearances",
      "liberationList",
      "songStatistics",
    ];

    for (const field of expected) {
      if (!(field in data.recordCounts)) {
        result.errors.push(`recordCounts missing ${field}`);
      }
    }
  }

  result.recordCount = 1; // Manifest is a single object
}

// Main validation
function main() {
  console.log("DMB Almanac - JSON Export Validation");
  console.log("====================================\n");

  const dataDir = join(process.cwd(), "public", "data");

  const files = [
    "venues.json",
    "songs.json",
    "tours.json",
    "shows.json",
    "setlist-entries.json",
    "guests.json",
    "guest-appearances.json",
    "liberation-list.json",
    "song-statistics.json",
    "manifest.json",
  ];

  console.log("Validating files...\n");

  for (const file of files) {
    const filePath = join(dataDir, file);
    const result = validateFile(filePath);
    results.push(result);

    const status = result.valid ? "✓" : "✗";
    const size = (result.size / 1024).toFixed(2);
    console.log(
      `${status} ${file.padEnd(30)} ${result.recordCount.toString().padStart(6)} records ${size.padStart(10)} KB`
    );

    if (result.errors.length > 0) {
      result.errors.forEach((error) => {
        console.log(`    Error: ${error}`);
      });
    }
  }

  // Summary
  console.log("\n====================================");
  const validCount = results.filter((r) => r.valid).length;
  const errorCount = results.filter((r) => !r.valid).length;

  console.log(`\nResults: ${validCount} valid, ${errorCount} errors`);

  if (errorCount > 0) {
    console.log("\nValidation FAILED");
    process.exit(1);
  } else {
    console.log("\nValidation PASSED");

    // Print summary stats
    const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0) - 1; // -1 for manifest
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);

    console.log(`\nTotal records: ${totalRecords.toLocaleString()}`);
    console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\nExport is ready for deployment!`);
  }
}

main();
