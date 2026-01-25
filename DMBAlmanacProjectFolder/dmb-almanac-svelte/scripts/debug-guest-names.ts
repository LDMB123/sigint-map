import Database from "better-sqlite3";

const DB_PATH = "./data/dmb-almanac.db";
const db = new Database(DB_PATH);

const guests = db
  .prepare(
    "SELECT id, name, total_appearances FROM guests WHERE total_appearances > 20 ORDER BY total_appearances DESC LIMIT 20"
  )
  .all() as Array<{ id: number; name: string; total_appearances: number }>;

console.log("Top guests in database:\n");
guests.forEach((g) => {
  console.log(
    `ID: ${g.id}, Name: "${g.name}", Lower: "${g.name.toLowerCase()}", Appearances: ${g.total_appearances}`
  );
});

console.log("\n\nChecking specific names:");
const bandMembers = ["dave and tim", "tim reynolds", "jeff coffin", "rashawn ross", "butch taylor"];

guests.forEach((g) => {
  const lowerName = g.name.toLowerCase();
  const isMatch = bandMembers.includes(lowerName);
  if (isMatch || g.total_appearances > 30) {
    console.log(`\n"${g.name}"`);
    console.log(`  lowercase: "${lowerName}"`);
    console.log(`  is band member: ${isMatch}`);
    console.log(`  includes check: ${bandMembers.includes(lowerName)}`);
    console.log(`  exact match: ${lowerName === "dave and tim"}`);
  }
});

db.close();
