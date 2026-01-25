const bandMembers = ["dave and tim", "tim reynolds", "jeff coffin", "rashawn ross", "butch taylor"];

console.log("Array contents:", bandMembers);
console.log("\nTest 1 - literal string:");
console.log('  includes("dave and tim"):', bandMembers.includes("dave and tim"));

console.log("\nTest 2 - variable:");
const testName = "dave and tim";
console.log("  testName:", testName);
console.log("  includes(testName):", bandMembers.includes(testName));

console.log("\nTest 3 - from lowercase:");
const originalName = "Dave and Tim";
const lowerName = originalName.toLowerCase();
console.log("  originalName:", originalName);
console.log("  lowerName:", lowerName);
console.log("  includes(lowerName):", bandMembers.includes(lowerName));
console.log('  lowerName === "dave and tim":', lowerName === "dave and tim");

// Check character codes
console.log("\nCharacter codes comparison:");
console.log(
  "  lowerName chars:",
  Array.from(lowerName).map((c) => c.charCodeAt(0))
);
console.log(
  '  "dave and tim" chars:',
  Array.from("dave and tim").map((c) => c.charCodeAt(0))
);
