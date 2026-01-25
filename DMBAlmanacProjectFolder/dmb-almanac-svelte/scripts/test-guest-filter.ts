// Test the isInvalidGuest function

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

  // Check exact matches
  if (bandMembers.includes(lowerName)) {
    console.log(`✅ Caught by exact match: "${name}"`);
    return true;
  }

  // Band member combinations
  if (
    lowerName.match(
      /^(dave|carter|stefan|boyd|leroi|roi|rashawn|jeff|buddy)(\s+(and|&)\s+(dave|carter|stefan|boyd|leroi|roi|rashawn|jeff|buddy|trey))+$/
    )
  ) {
    console.log(`✅ Caught by regex: "${name}"`);
    return true;
  }

  console.log(`❌ NOT caught: "${name}"`);
  return false;
}

// Test cases
const testCases = [
  "Dave and Tim",
  "dave and tim",
  "Dave & Tim",
  "Tim Reynolds",
  "Dave Grohl",
  "Dave Campbell",
  "Jeff Coffin",
  "jeff",
  "Tim",
  "Golden Years",
];

console.log("Testing isInvalidGuest function:\n");
testCases.forEach((name) => {
  const result = isInvalidGuest(name);
  console.log(`  ${name}: ${result ? "INVALID" : "VALID"}\n`);
});
