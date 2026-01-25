const bandMembers = ["dave and tim", "tim reynolds", "jeff coffin"];

console.log("Direct check #1:");
console.log('  bandMembers.includes("dave and tim"):', bandMembers.includes("dave and tim"));

const testVar = "dave and tim";
console.log("\nDirect check #2:");
console.log("  testVar:", testVar);
console.log("  bandMembers.includes(testVar):", bandMembers.includes(testVar));

import Database from "better-sqlite3";

const db = new Database("./data/dmb-almanac.db");
const guest = db.prepare("SELECT name FROM guests WHERE id = 154").get() as { name: string };
console.log("\nFrom database:");
console.log("  guest.name:", guest.name);
console.log("  typeof guest.name:", typeof guest.name);
console.log("  guest.name.toLowerCase():", guest.name.toLowerCase());
console.log(
  "  bandMembers.includes(guest.name.toLowerCase()):",
  bandMembers.includes(guest.name.toLowerCase())
);

// Test with direct string assignment
const lowerName = guest.name.toLowerCase();
console.log("\nWith variable:");
console.log("  lowerName:", lowerName);
console.log("  typeof lowerName:", typeof lowerName);
console.log("  bandMembers.includes(lowerName):", bandMembers.includes(lowerName));

// Test indexOf as alternative
console.log("\nUsing indexOf:");
console.log("  bandMembers.indexOf(lowerName):", bandMembers.indexOf(lowerName));

// Test with string comparison
console.log("\nDirect comparison:");
console.log('  lowerName === "dave and tim":', lowerName === "dave and tim");
console.log("  lowerName === bandMembers[0]:", lowerName === bandMembers[0]);

db.close();
