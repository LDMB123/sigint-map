import Database from "better-sqlite3";

const DB_PATH = "./data/dmb-almanac.db";

function isInvalidGuest(name: string): boolean {
  const lowerName = name.toLowerCase();

  const bandMembers = [
    "dave and tim",
    "dave & tim",
    "tim reynolds",
    "jeff coffin",
    "rashawn ross",
    "butch taylor",
  ];

  if (bandMembers.includes(lowerName)) {
    console.log(`  → Caught "${name}" by exact match`);
    return true;
  }

  return false;
}

const db = new Database(DB_PATH);
const allGuests = db
  .prepare(
    "SELECT id, name, total_appearances FROM guests WHERE total_appearances > 20 ORDER BY total_appearances DESC"
  )
  .all() as Array<{ id: number; name: string; total_appearances: number }>;

console.log(`Checking ${allGuests.length} guests with >20 appearances:\n`);

const invalidGuests = allGuests.filter((g) => isInvalidGuest(g.name));

console.log(`\nFound ${invalidGuests.length} invalid guests`);

db.close();
