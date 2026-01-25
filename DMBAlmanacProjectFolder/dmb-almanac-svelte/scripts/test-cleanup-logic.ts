import Database from "better-sqlite3";

const DB_PATH = "./data/dmb-almanac.db";

function isInvalidGuest(name: string): boolean {
  const lowerName = name.toLowerCase();

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

  console.log(`\nChecking: "${name}"`);
  console.log(`  lowercase: "${lowerName}"`);
  console.log(`  in array: ${bandMembers.includes(lowerName)}`);

  // Check exact matches
  if (bandMembers.includes(lowerName)) {
    console.log(`  ✅ MATCHED!`);
    return true;
  }

  console.log(`  ❌ not matched`);
  return false;
}

const db = new Database(DB_PATH);
const allGuests = db
  .prepare(
    "SELECT id, name, total_appearances FROM guests WHERE total_appearances > 30 ORDER BY total_appearances DESC"
  )
  .all() as Array<{ id: number; name: string; total_appearances: number }>;

console.log(`Checking ${allGuests.length} guests:\n`);

const invalidGuests = allGuests.filter((g) => isInvalidGuest(g.name));

console.log(`\n\n=== RESULTS ===`);
console.log(`Found ${invalidGuests.length} invalid guests out of ${allGuests.length}`);

db.close();
