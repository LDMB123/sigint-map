import { join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), "data", "dmb-almanac.db");

/**
 * Clean up invalid guest data from the database:
 * 1. Delete band members tracked as guests
 * 2. Delete annotation entries (first time played, YouTube releases, etc.)
 * 3. Recalculate guest appearance counts (distinct shows, not song performances)
 * 4. Clean up orphaned guest_appearances records
 */

function isInvalidGuest(name: string): boolean {
  // Normalize spaces (convert non-breaking spaces to regular spaces)
  const normalizedName = name
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lowerName = normalizedName.toLowerCase();

  // Band members (all variations)
  const bandMembers = [
    "dave",
    "dave matthews",
    "carter",
    "carter beauford",
    "stefan",
    "stefan lessard",
    "boyd",
    "boyd tinsley",
    "leroi",
    "leroi moore",
    "roi",
    "leroi moore (r.i.p.)",
    "leroi moore (r.i.p)",
    "tim reynolds",
    "tim",
    "rashawn",
    "rashawn ross",
    "jeff",
    "jeff coffin",
    "buddy",
    "buddy strong",
    "butch",
    "butch taylor",
    "peter",
    "peter griesar",
    "rashawn ross and jeff coffin",
    "jeff coffin and rashawn ross",
    "dave and tim",
    "dave & tim",
    "dave and trey",
    "only dave & tim on stage",
  ];

  // Check exact matches
  if (bandMembers.includes(lowerName)) return true;

  // Band member combinations
  if (
    lowerName.match(
      /^(dave|carter|stefan|boyd|leroi|roi|rashawn|jeff|buddy)(\s+(and|&)\s+(dave|carter|stefan|boyd|leroi|roi|rashawn|jeff|buddy|trey))+$/
    )
  ) {
    return true;
  }

  // Standalone band member first names (but not common names)
  const standaloneFirstNames = ["carter", "stefan", "boyd", "roi", "rashawn", "butch"];
  if (standaloneFirstNames.includes(lowerName) && !name.includes(" ")) return true;

  // Annotation patterns
  const annotationPatterns = [
    "first time",
    "last time",
    "interpolation",
    "tease",
    "released on",
    "youtube",
    "warm-up",
    "dedicated to",
    "part of the",
    "as part of",
    "set closer",
    "set opener",
    "segue",
    "intro",
    "outro",
    "song",
    "solo",
    "jam",
    "snippet",
    "quote",
    "riff",
    "acoustic",
    "electric",
    "full band",
    "completely played",
    "in its entirety",
    "(lyrics)",
    "lyrics",
  ];

  if (annotationPatterns.some((pattern) => lowerName.includes(pattern))) return true;

  // Special prelude patterns
  if (lowerName.includes("includes prelude")) return true;
  if (lowerName.includes("includes") && lowerName.includes("prelude")) return true;

  // Performance notes with band member names
  if (
    lowerName.match(
      /^(dave|carter|stefan|boyd|leroi|roi|tim|rashawn|jeff|buddy|butch)\s+(on\s+)?(piano|drums|guitar|bass|12-string)/
    )
  )
    return true;
  if (
    lowerName.match(
      /^(dave|carter|stefan|boyd|tim)\s+(says|mentions|tells|plays|sings|flubs|starts|stops|breaks|dedicates|repeats|skips|switches)/
    )
  )
    return true;

  // Bracketed annotations or quoted titles
  if (name.includes("[") || name.includes("]") || name.includes('"')) return true;

  // Instrumentation notes starting with "on drums", "on guitar", etc.
  if (
    lowerName.match(/^(on\s+)?(drums|guitar|bass|saxophone|violin|keyboard|keytar|maracas|piano)/)
  )
    return true;

  // Semicolon-separated annotation descriptions
  if (name.includes(";")) {
    const parts = name.split(";").map((p) => p.trim());
    const annotationKeywords = [
      "first",
      "last",
      "played",
      "time",
      "dedicated",
      "acoustic",
      "electric",
    ];
    if (parts.every((p) => annotationKeywords.some((kw) => p.toLowerCase().includes(kw)))) {
      return true;
    }
  }

  return false;
}

function cleanupGuestData(): void {
  console.log("Opening database:", DB_PATH);
  const db = new Database(DB_PATH);

  try {
    // Enable foreign keys
    db.pragma("foreign_keys = ON");

    // Get current guest count and invalid guest sample
    const totalBefore = db.prepare("SELECT COUNT(*) as count FROM guests").get() as {
      count: number;
    };
    console.log(`\nCurrent total guests: ${totalBefore.count}`);

    // Sample invalid guests
    console.log("\nSampling invalid guest entries...");
    const allGuests = db
      .prepare("SELECT id, name, total_appearances FROM guests ORDER BY total_appearances DESC")
      .all() as Array<{ id: number; name: string; total_appearances: number }>;

    const invalidGuests = allGuests.filter((g) => isInvalidGuest(g.name));
    console.log(`\nFound ${invalidGuests.length} invalid guest entries to delete:`);

    // Show top 30 invalid entries
    invalidGuests.slice(0, 30).forEach((g) => {
      console.log(`  - ${g.name} (${g.total_appearances} appearances)`);
    });

    if (invalidGuests.length > 30) {
      console.log(`  ... and ${invalidGuests.length - 30} more`);
    }

    // Start transaction
    const cleanup = db.transaction(() => {
      let deletedGuests = 0;
      let deletedAppearances = 0;

      // Delete invalid guests (CASCADE will delete guest_appearances automatically)
      const deleteGuest = db.prepare("DELETE FROM guests WHERE id = ?");
      const countAppearances = db.prepare(
        "SELECT COUNT(*) as count FROM guest_appearances WHERE guest_id = ?"
      );

      for (const guest of invalidGuests) {
        const appearanceCount = (countAppearances.get(guest.id) as { count: number }).count;
        deletedAppearances += appearanceCount;
        deleteGuest.run(guest.id);
        deletedGuests++;
      }

      console.log(
        `\nDeleted ${deletedGuests} invalid guests and ${deletedAppearances} associated appearances`
      );

      // Recalculate total_appearances for remaining guests (COUNT DISTINCT show_id)
      console.log("\nRecalculating guest appearance counts...");
      db.prepare(`
        UPDATE guests SET total_appearances = (
          SELECT COUNT(DISTINCT show_id)
          FROM guest_appearances
          WHERE guest_appearances.guest_id = guests.id
        )
      `).run();

      // Update first/last appearance dates
      console.log("Updating guest first/last appearance dates...");
      db.prepare(`
        UPDATE guests SET
          first_appearance_date = (
            SELECT MIN(sh.date)
            FROM shows sh
            JOIN guest_appearances ga ON ga.show_id = sh.id
            WHERE ga.guest_id = guests.id
          ),
          last_appearance_date = (
            SELECT MAX(sh.date)
            FROM shows sh
            JOIN guest_appearances ga ON ga.show_id = sh.id
            WHERE ga.guest_id = guests.id
          )
      `).run();

      // Clean up orphaned guest_appearances (where guest_id or show_id no longer exists)
      console.log("Cleaning up orphaned guest_appearances...");
      const orphanedAppearances = db
        .prepare(`
        DELETE FROM guest_appearances
        WHERE guest_id NOT IN (SELECT id FROM guests)
           OR show_id NOT IN (SELECT id FROM shows)
      `)
        .run();

      if (orphanedAppearances.changes > 0) {
        console.log(`Deleted ${orphanedAppearances.changes} orphaned guest_appearances records`);
      }

      // Clean up guests with zero appearances
      const zeroAppearances = db
        .prepare(`
        DELETE FROM guests WHERE total_appearances = 0 OR total_appearances IS NULL
      `)
        .run();

      if (zeroAppearances.changes > 0) {
        console.log(`Deleted ${zeroAppearances.changes} guests with zero appearances`);
      }
    });

    cleanup();

    // Show final stats
    const totalAfter = db.prepare("SELECT COUNT(*) as count FROM guests").get() as {
      count: number;
    };
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Guests before: ${totalBefore.count}`);
    console.log(`   Guests after: ${totalAfter.count}`);
    console.log(`   Removed: ${totalBefore.count - totalAfter.count}`);

    // Show top 20 valid guests after cleanup
    console.log("\nTop 20 guests after cleanup:");
    const topGuests = db
      .prepare(`
      SELECT name, total_appearances
      FROM guests
      ORDER BY total_appearances DESC
      LIMIT 20
    `)
      .all() as Array<{ name: string; total_appearances: number }>;

    topGuests.forEach((g) => {
      console.log(`  ${g.name}: ${g.total_appearances} shows`);
    });

    // Verify no band members remain
    console.log("\nVerifying no band members remain...");
    const bandMemberCheck = db
      .prepare(`
      SELECT name, total_appearances
      FROM guests
      WHERE LOWER(name) IN ('dave', 'dave matthews', 'carter', 'carter beauford', 'stefan', 'stefan lessard',
                             'boyd', 'boyd tinsley', 'leroi', 'leroi moore', 'roi', 'tim', 'tim reynolds',
                             'rashawn', 'rashawn ross', 'jeff', 'jeff coffin', 'buddy', 'buddy strong',
                             'butch', 'butch taylor', 'peter', 'peter griesar')
    `)
      .all() as Array<{ name: string; total_appearances: number }>;

    if (bandMemberCheck.length > 0) {
      console.log("⚠️  WARNING: Some band members still in database:");
      for (const g of bandMemberCheck) {
        console.log(`  - ${g.name}`);
      }
    } else {
      console.log("✅ No band members found in guests table");
    }

    // Verify no annotation patterns remain
    console.log("\nVerifying no annotation patterns remain...");
    const annotationCheck = db
      .prepare(`
      SELECT name, total_appearances
      FROM guests
      WHERE LOWER(name) LIKE '%first time%'
         OR LOWER(name) LIKE '%released on%'
         OR LOWER(name) LIKE '%youtube%'
         OR LOWER(name) LIKE '%dedicated to%'
      LIMIT 10
    `)
      .all() as Array<{ name: string; total_appearances: number }>;

    if (annotationCheck.length > 0) {
      console.log("⚠️  WARNING: Some annotations still in database:");
      for (const g of annotationCheck) {
        console.log(`  - ${g.name}`);
      }
    } else {
      console.log("✅ No annotation patterns found in guests table");
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  } finally {
    db.close();
    console.log("\nDatabase closed");
  }
}

// Run the cleanup
console.log("=== DMB Almanac Guest Data Cleanup ===");
console.log("This script will:");
console.log("1. Delete band members tracked as guests");
console.log("2. Delete annotation entries (first time played, YouTube releases, etc.)");
console.log("3. Recalculate guest appearance counts (distinct shows, not performances)");
console.log("4. Clean up orphaned guest_appearances records\n");

cleanupGuestData();
