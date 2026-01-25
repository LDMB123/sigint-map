import Database from "better-sqlite3";

const db = new Database("./data/dmb-almanac.db");
const guest = db.prepare("SELECT name FROM guests WHERE id = 154").get() as { name: string };

const lowerName = guest.name.toLowerCase();
const expectedName = "dave and tim";

console.log("String from database:");
console.log("  Visual:", lowerName);
console.log("  Length:", lowerName.length);
console.log(
  "  Char codes:",
  Array.from(lowerName).map((c) => c.charCodeAt(0))
);
console.log("  Hex:", Buffer.from(lowerName).toString("hex"));

console.log("\nExpected string:");
console.log("  Visual:", expectedName);
console.log("  Length:", expectedName.length);
console.log(
  "  Char codes:",
  Array.from(expectedName).map((c) => c.charCodeAt(0))
);
console.log("  Hex:", Buffer.from(expectedName).toString("hex"));

console.log("\nComparison:");
console.log("  Equal:", lowerName === expectedName);
console.log("  Length match:", lowerName.length === expectedName.length);

if (lowerName.length === expectedName.length) {
  for (let i = 0; i < lowerName.length; i++) {
    if (lowerName[i] !== expectedName[i]) {
      console.log(
        `  Diff at position ${i}: "${lowerName[i]}" (${lowerName.charCodeAt(i)}) vs "${expectedName[i]}" (${expectedName.charCodeAt(i)})`
      );
    }
  }
}

db.close();
