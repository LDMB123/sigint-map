/**
 * Verify Guest Data Quality
 *
 * This script checks for common data quality issues in the guests table:
 * - Band members tracked as guests
 * - Song annotations imported as guest names
 * - Invalid appearance counts
 */

import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

interface Guest {
  id: number;
  name: string;
  total_appearances: number;
}

function verifyGuestData(): void {
  const db = new Database(DB_PATH);

  console.log("=== DMB Almanac Guest Data Verification ===\n");

  // Check for band members
  console.log("1. Checking for band members...");
  const bandMembers = db
    .prepare(`
    SELECT name, total_appearances FROM guests
    WHERE REPLACE(LOWER(name), CHAR(160), ' ') IN (
      'dave', 'dave matthews',
      'carter', 'carter beauford',
      'stefan', 'stefan lessard',
      'boyd', 'boyd tinsley',
      'leroi', 'leroi moore', 'roi',
      'tim', 'tim reynolds',
      'rashawn', 'rashawn ross',
      'jeff', 'jeff coffin',
      'buddy', 'buddy strong',
      'butch', 'butch taylor',
      'dave and tim', 'dave & tim'
    )
  `)
    .all() as Guest[];

  if (bandMembers.length === 0) {
    console.log("   ✅ No band members found\n");
  } else {
    console.log(`   ❌ Found ${bandMembers.length} band members:`);
    for (const g of bandMembers) {
      console.log(`      - ${g.name} (${g.total_appearances} shows)`);
    }
    console.log();
  }

  // Check for annotations
  console.log("2. Checking for annotation patterns...");
  const annotations = db
    .prepare(`
    SELECT name, total_appearances FROM guests
    WHERE LOWER(name) LIKE '%first time%'
       OR LOWER(name) LIKE '%last time%'
       OR LOWER(name) LIKE '%released on%'
       OR LOWER(name) LIKE '%youtube%'
       OR LOWER(name) LIKE '%includes prelude%'
       OR LOWER(name) LIKE '%dedicated to%'
    LIMIT 10
  `)
    .all() as Guest[];

  if (annotations.length === 0) {
    console.log("   ✅ No annotation patterns found\n");
  } else {
    console.log(`   ❌ Found ${annotations.length} annotations:`);
    for (const g of annotations) {
      console.log(`      - ${g.name}`);
    }
    console.log();
  }

  // Check for suspiciously high appearance counts
  console.log("3. Checking for suspiciously high appearance counts...");
  const suspicious = db
    .prepare(`
    SELECT name, total_appearances FROM guests
    WHERE total_appearances > 100
  `)
    .all() as Guest[];

  if (suspicious.length === 0) {
    console.log("   ✅ No guests with >100 appearances (max should be ~80-100)\n");
  } else {
    console.log(`   ⚠️  Found ${suspicious.length} guests with >100 appearances:`);
    for (const g of suspicious) {
      console.log(`      - ${g.name} (${g.total_appearances} shows)`);
    }
    console.log();
  }

  // Summary statistics
  const stats = db
    .prepare(`
    SELECT
      COUNT(*) as total_guests,
      MAX(total_appearances) as max_appearances,
      AVG(total_appearances) as avg_appearances,
      (SELECT COUNT(*) FROM guests WHERE total_appearances >= 10) as guests_with_10plus
    FROM guests
  `)
    .get() as {
    total_guests: number;
    max_appearances: number;
    avg_appearances: number;
    guests_with_10plus: number;
  };

  console.log("4. Summary Statistics:");
  console.log(`   Total guests: ${stats.total_guests}`);
  console.log(`   Max appearances: ${stats.max_appearances}`);
  console.log(`   Avg appearances: ${stats.avg_appearances.toFixed(2)}`);
  console.log(`   Guests with 10+ shows: ${stats.guests_with_10plus}\n`);

  // Top 20 guests
  console.log("5. Top 20 Guests (should all be legitimate musicians):");
  const topGuests = db
    .prepare(`
    SELECT name, total_appearances FROM guests
    ORDER BY total_appearances DESC
    LIMIT 20
  `)
    .all() as Guest[];

  topGuests.forEach((g, i) => {
    console.log(
      `   ${(i + 1).toString().padStart(2, " ")}. ${g.name} (${g.total_appearances} shows)`
    );
  });

  db.close();

  console.log("\n✅ Verification complete!");
}

verifyGuestData();
