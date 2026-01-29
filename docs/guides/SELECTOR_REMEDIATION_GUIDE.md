# Selector Remediation Guide

**Document Purpose:** Step-by-step fixes for identified selector issues
**Priority Level:** CRITICAL - Address before production deployment

---

## 1. SHOWS.TS - Venue Extraction (HIGH)

### Current Code (BROKEN)
```typescript
// Line 147-150: WRONG - Uses onclick attribute
const venueLink = $("a").filter((i, el) => {
  const onclick = $(el).attr("onclick") || "";
  return onclick.includes("VenueStats.aspx");
}).first();
```

### Why It's Wrong
- Violates semantic HTML principles
- Relies on JavaScript attributes (fragile)
- Doesn't follow reference documentation
- Harder to maintain and test

### Fixed Code
```typescript
// Extract venue using semantic href attribute
const venueLink = $("a[href*='VenueStats.aspx']").first();
const venueHref = venueLink.attr("href") || "";
const vidMatch = venueHref.match(/vid=(\d+)/);
const venueId = vidMatch ? vidMatch[1] : undefined;

if (venueLink.length) {
  venueName = normalizeWhitespace(venueLink.text());

  // Extract location from adjacent content
  const venueContainer = venueLink.closest("div, td, span");
  const fullText = venueContainer.text();
  const afterVenue = fullText.split(venueName)[1] || "";

  // Parse location with multi-format support
  let locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
  if (locationMatch) {
    city = locationMatch[1].trim();
    state = locationMatch[2];
    country = locationMatch[3]?.trim() || "USA";
  } else {
    // International fallback
    locationMatch = afterVenue.match(/([^,]+),\s*([A-Za-z\s]{2,})/);
    if (locationMatch) {
      city = locationMatch[1].trim();
      country = locationMatch[2].trim();
      state = "";
    }
  }
}
```

### Testing
```bash
# Test on recent 2024 show
curl "https://dmbalmanac.com/TourShowSet.aspx?id=453091046" | \
  grep -o 'VenueStats.aspx.*vid=\d*' | head -1
# Expected: VenueStats.aspx?vid=30048

# Test extraction in Node
const testHtml = '...'; // From curl above
const $ = cheerio.load(testHtml);
const venueLink = $("a[href*='VenueStats.aspx']").first();
console.log(venueLink.text()); // Should output venue name
```

---

## 2. SHOWS.TS - Location Parsing (HIGH)

### Current Code (FRAGILE)
```typescript
// Line 161: Strict US format only
const locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
if (locationMatch) {
  city = locationMatch[1].trim();
  state = locationMatch[2].trim();
  country = locationMatch[3]?.trim() || "USA";
}
```

### Why It's Wrong
- Only handles US format (City, ST, Country)
- Fails on international venues like "London, England"
- Fails on "Moon Palace Golf & Spa Resort - Cancun, Mexico"
- Assumes exactly 2-letter state codes

### Fixed Code
```typescript
function parseLocation(locationText: string): {
  city: string;
  state: string;
  country: string;
} {
  const result = { city: "", state: "", country: "USA" };

  // Strategy 1: US Format (City, ST or City, ST, Country)
  let match = locationText.match(/^([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?$/);
  if (match) {
    result.city = match[1].trim();
    result.state = match[2].trim();
    result.country = match[3]?.trim() || "USA";
    return result;
  }

  // Strategy 2: International (City, Country Name)
  // - Must have 2+ words in country (to distinguish from state codes)
  match = locationText.match(/^([^,]+),\s*([A-Za-z\s]{2,})$/);
  if (match) {
    const potentialCountry = match[2].trim();
    // Verify it's not a US state code
    if (potentialCountry.length > 2) {
      result.city = match[1].trim();
      result.country = potentialCountry;
      result.state = "";
      return result;
    }
  }

  // Strategy 3: Fallback - treat whole thing as city if unparseable
  result.city = locationText.trim();
  return result;
}

// Usage in shows.ts:
const afterVenue = locationText.split(venueName)[1] || "";
const location = parseLocation(afterVenue);
city = location.city;
state = location.state;
country = location.country;
```

### Test Cases
```typescript
test('parseLocation - US venues', () => {
  expect(parseLocation("Richmond, VA")).toEqual({
    city: "Richmond",
    state: "VA",
    country: "USA"
  });
});

test('parseLocation - International venues', () => {
  expect(parseLocation("London, England")).toEqual({
    city: "London",
    state: "",
    country: "England"
  });

  expect(parseLocation("Cancun, Mexico")).toEqual({
    city: "Cancun",
    state: "",
    country: "Mexico"
  });
});

test('parseLocation - Venue with address', () => {
  expect(parseLocation("Moon Palace Golf & Spa Resort, Cancun, Mexico")).toEqual({
    city: "Cancun",
    state: "",
    country: "Mexico"
  });
});
```

---

## 3. SHOWS.TS - Guest Filtering (MEDIUM)

### Current Code (PROBLEMATIC)
```typescript
// Lines 15-23: Hardcoded band member GIDs
const BAND_MEMBER_GIDS = [
  "1",   // Dave Matthews
  "2",   // Carter Beauford
  "94",  // LeRoi Moore
  "75",  // Stefan Lessard
  "104", // Boyd Tinsley
  "3",   // Jeff Coffin
  "ds"   // Dave solo
];

// Line 228: String matching against numeric IDs
if (!BAND_MEMBER_GIDS.includes(gid)) {
  guestNames.push(normalizeWhitespace($(guestLink).text()));
}
```

### Why It's Wrong
- Magic numbers without reliable source
- "ds" won't match numeric GID extraction
- If database changes IDs, scraper breaks
- No flexibility for band changes (guest members, temporary musicians)

### Fixed Code
```typescript
// Create configurable band member filter
interface BandMember {
  gid?: string;
  name: string;
  aliases: string[];
}

const BAND_MEMBERS: BandMember[] = [
  { gid: "1", name: "Dave Matthews", aliases: ["Dave"] },
  { gid: "2", name: "Carter Beauford", aliases: ["Carter"] },
  { gid: "94", name: "LeRoi Moore", aliases: ["LeRoi"] },
  { gid: "75", name: "Stefan Lessard", aliases: ["Stefan"] },
  { gid: "104", name: "Boyd Tinsley", aliases: ["Boyd"] },
  { gid: "3", name: "Jeff Coffin", aliases: ["Jeff"] },
];

function isBandMember(gidOrName: string): boolean {
  // Check by GID
  if (BAND_MEMBERS.some(m => m.gid === gidOrName)) {
    return true;
  }

  // Check by name/alias
  const lowerInput = gidOrName.toLowerCase();
  return BAND_MEMBERS.some(member =>
    member.name.toLowerCase() === lowerInput ||
    member.aliases.some(alias => alias.toLowerCase() === lowerInput)
  );
}

// Usage in setlist parsing:
const gidMatch = href.match(/gid=([^&]+)/);
if (gidMatch) {
  const gid = gidMatch[1];
  const guestName = normalizeWhitespace($(guestLink).text());

  // Filter using both ID and name
  if (!isBandMember(gid) && !isBandMember(guestName)) {
    guestNames.push(guestName);
  }
}
```

### Test Cases
```typescript
test('isBandMember - recognizes by ID', () => {
  expect(isBandMember("1")).toBe(true);
  expect(isBandMember("999")).toBe(false);
});

test('isBandMember - recognizes by name', () => {
  expect(isBandMember("Dave Matthews")).toBe(true);
  expect(isBandMember("dave matthews")).toBe(true); // Case insensitive
});

test('isBandMember - recognizes by alias', () => {
  expect(isBandMember("Dave")).toBe(true);
  expect(isBandMember("Carter")).toBe(true);
});
```

---

## 4. SHOWS.TS - Segue Indicators (MEDIUM)

### Current Code (INCOMPLETE)
```typescript
// Line 241: Missing segue patterns
const isSegue = setitemContent.includes("»") || setitemContent.includes(">>");
```

### Why It's Wrong
- Only checks 2 patterns (`»` and `>>`)
- Missing common patterns: `->`, `→`, `>`
- Reference shows multiple formats exist
- May miss valid segues

### Fixed Code
```typescript
// Comprehensive segue detection
function isSegueIndicator(text: string): boolean {
  // Normalize text for comparison
  const normalized = text.toLowerCase();

  // Check for segue symbols and keywords
  const seguePatterns = [
    /→/,           // Unicode arrow
    /->/,          // ASCII arrow
    />>/,          // Double arrow
    /»/,           // French quote
    />/,           // Single arrow (be careful with specificity)
    /segues?\s+into/i,
    /transitions?\s+into/i,
    /followed\s+by/i,
    /leads?\s+to/i
  ];

  return seguePatterns.some(pattern => pattern.test(text));
}

// Usage:
const isSegue = isSegueIndicator(setitemContent);
```

### Test Cases
```typescript
test('isSegueIndicator - recognizes arrow patterns', () => {
  expect(isSegueIndicator("Song Title →")).toBe(true);
  expect(isSegueIndicator("Song Title ->")).toBe(true);
  expect(isSegueIndicator("Song Title >>")).toBe(true);
  expect(isSegueIndicator("Song Title »")).toBe(true);
});

test('isSegueIndicator - recognizes text patterns', () => {
  expect(isSegueIndicator("segues into")).toBe(true);
  expect(isSegueIndicator("transitions into")).toBe(true);
  expect(isSegueIndicator("Followed By Next Song")).toBe(true);
});

test('isSegueIndicator - avoids false positives', () => {
  expect(isSegueIndicator("5 > 3")).toBe(false);
  expect(isSegueIndicator("Cost: $500")).toBe(false);
});
```

---

## 5. SONGS.TS - Fix Index Page URL (CRITICAL)

### Current Code (BROKEN)
```typescript
// Line 18: Wrong page
await page.goto(`${BASE_URL}/SongSearchResult.aspx`, { waitUntil: "networkidle" });
```

### Why It's Wrong
- `SongSearchResult.aspx` doesn't provide song list
- Scraper can't find any songs to process
- Complete failure on startup

### Fixed Code
```typescript
async function getSongUrls(page: Page): Promise<string[]> {
  console.log("Fetching song URLs...");

  // Use the correct song list page
  const songListUrl = `${BASE_URL}/songs/all-songs.aspx`;

  try {
    await page.goto(songListUrl, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    console.error(`Failed to load song list from ${songListUrl}:`, error);
    console.log("Falling back to individual song navigation...");
    // Fallback: Could seed with known song IDs
    return [];
  }

  const html = await page.content();
  const $ = cheerio.load(html);

  const songUrls: string[] = [];

  // Primary selector: songs/summary.aspx (newer format)
  $("a[href*='songs/summary.aspx?sid=']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const fullUrl = href.startsWith("http")
        ? href
        : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      if (!songUrls.includes(fullUrl)) {
        songUrls.push(fullUrl);
      }
    }
  });

  // Secondary selector: SongStats.aspx (legacy, will redirect)
  if (songUrls.length === 0) {
    $("a[href*='SongStats.aspx?sid=']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        // Convert to new URL format
        const sidMatch = href.match(/sid=(\d+)/);
        if (sidMatch) {
          const fullUrl = `${BASE_URL}/songs/summary.aspx?sid=${sidMatch[1]}`;
          if (!songUrls.includes(fullUrl)) {
            songUrls.push(fullUrl);
          }
        }
      }
    });
  }

  console.log(`Found ${songUrls.length} songs`);
  return songUrls;
}
```

### Testing
```bash
# Verify the page exists and has songs
curl -sL "https://dmbalmanac.com/songs/all-songs.aspx" | \
  grep -c "summary.aspx?sid="
# Should return > 100

# Test scraper against known song
node -e "
const scraper = require('./songs.ts');
scraper.getSongUrls().then(urls => {
  console.log('Found URLs:', urls.length);
  console.log('First URL:', urls[0]);
});
"
```

---

## 6. VENUES.TS - Semantic Name Extraction (HIGH)

### Current Code (FRAGILE)
```typescript
// Lines 56-111: Text-based line parsing
const lines = bodyText.split("\n").map(l => normalizeWhitespace(l));
// ... 50+ lines of heuristic searching ...
// Finds venue name by looking for line before location match
if (i > 0 && lines[i - 1].length > 2) {
  name = lines[i - 1];
}
```

### Why It's Wrong
- No HTML semantic structure
- First line before location could be navigation text
- Depends entirely on page text layout
- Will break if layout changes

### Fixed Code
```typescript
async function parseVenuePage(page: Page, venueUrl: string): Promise<ScrapedVenue | null> {
  try {
    let html = getCachedHtml(venueUrl);

    if (!html) {
      await page.goto(venueUrl, { waitUntil: "networkidle" });
      html = await page.content();
      cacheHtml(venueUrl, html);
    }

    const $ = cheerio.load(html);
    const vidMatch = venueUrl.match(/vid=(\d+)/);
    const originalId = vidMatch ? vidMatch[1] : undefined;

    // Strategy 1: Look for h1 (most semantic)
    let name = $("h1").first().text().trim();

    // Strategy 2: Look for page title in common heading tags
    if (!name) {
      name = $("h2, .venue-title, .page-title, [role='heading']")
        .first()
        .text()
        .trim();
    }

    // Strategy 3: Check document title
    if (!name) {
      const titleText = $("title").text();
      const titleParts = titleText.split("|");
      // Page title might be "Venue Name | DMBAlmanac.com"
      name = titleParts[0].trim();
    }

    // Strategy 4: Last resort - text parsing (previous method)
    if (!name) {
      const bodyText = $("body").text();
      const lines = bodyText
        .split("\n")
        .map(l => normalizeWhitespace(l))
        .filter(l => l.length > 0);

      // Look for location pattern in first 30 lines
      for (let i = 0; i < Math.min(lines.length, 30); i++) {
        const line = lines[i];

        // US location format
        const usMatch = line.match(/^([^,]+),\s*([A-Z]{2})$/);
        if (usMatch && i > 0) {
          name = lines[i - 1];
          break;
        }

        // International format
        const intlMatch = line.match(/^([^,]+),\s*([A-Za-z\s]{2,})$/);
        if (intlMatch && i > 0) {
          name = lines[i - 1];
          break;
        }
      }
    }

    if (!name) {
      console.warn(`No venue name found for ${venueUrl}`);
      return null;
    }

    // Parse location (rest of function same as before)
    // ... location parsing code ...

    return { originalId, name, /* ...other fields... */ };
  } catch (error) {
    console.error(`Error parsing venue ${venueUrl}:`, error);
    return null;
  }
}
```

### Testing
```typescript
test('parseVenue - extracts name from h1', async () => {
  const html = `
    <h1>Moon Palace Golf & Spa Resort</h1>
    <p>Cancun, Mexico</p>
  `;
  const venue = await parseVenue(html, 'vid=30048');
  expect(venue.name).toBe("Moon Palace Golf & Spa Resort");
});

test('parseVenue - uses page title as fallback', async () => {
  const html = `
    <title>Venue Name | DMBAlmanac.com</title>
    <body>Cancun, Mexico</body>
  `;
  const venue = await parseVenue(html, 'vid=30048');
  expect(venue.name).toBe("Venue Name");
});
```

---

## 7. SONG-STATS.TS - Slot Breakdown Parsing (HIGH)

### Current Code (BROKEN)
```typescript
// Lines 141-168: Regex fallback to CSS classes
const slotBreakdown = {
  opener: extractCount(/opener[:\s]+(\d+)/i) ||
    parseInt($(".opener").text().trim(), 10) || 0,
  // ...
};
```

### Why It's Wrong
- `.opener` is a row class, not data container
- `$(".opener").text()` returns row content, not count
- Will always be 0 for most pages
- Reference suggests counting table rows instead

### Fixed Code
```typescript
function parseSlotBreakdown($: cheerio.CheerioAPI): SongStatistics["slotBreakdown"] {
  // Strategy 1: Try to find explicit counts in page text
  const bodyText = $("body").text();

  let result = {
    opener: 0,
    set1Closer: 0,
    set2Opener: 0,
    closer: 0,
    midset: 0,
    encore: 0,
    encore2: 0,
  };

  // Strategy 1: Look for text patterns like "Opener: 45"
  const patterns: (keyof typeof result)[] = [
    "opener", "set1Closer", "set2Opener", "closer",
    "midset", "encore", "encore2"
  ];

  for (const slot of patterns) {
    // Try different text patterns
    let match = bodyText.match(
      new RegExp(`${slot}[:\\s]+(\\d+)`, "i")
    );
    if (!match) {
      match = bodyText.match(
        new RegExp(`(?:${slot}|${slot.replace(/[A-Z]/g, ' $&')})[:\\s]+(\\d+)`, "i")
      );
    }
    if (match) {
      result[slot] = parseInt(match[1], 10);
    }
  }

  // Strategy 2: Count table rows by class (if text patterns failed)
  // Only use if we found < 5 total (indicates text pattern failed)
  if (Object.values(result).reduce((a, b) => a + b, 0) < 5) {
    result.opener = $("tr.opener, tr[class*='opener']").length;
    result.closer = $("tr.closer, tr[class*='closer']").length;
    result.midset = $("tr.midset, tr[class*='midset']").length;
    result.encore = $("tr.encore, tr[class*='encore']").length;
    result.encore2 = $("tr.encore2, tr[class*='encore2']").length;
    // set1Closer and set2Opener need different approach
    result.set1Closer = $("tr.set1closer, tr[class*='set1closer']").length;
    result.set2Opener = $("tr.set2opener, tr[class*='set2opener']").length;
  }

  return result;
}

// OR simpler - just count rows:
function parseSlotBreakdownSimple($: cheerio.CheerioAPI): SongStatistics["slotBreakdown"] {
  // Find the table with song performance history
  const perfTable = $("table.stat-table").last();

  if (!perfTable.length) {
    console.warn("Could not find performance table");
    return {
      opener: 0, set1Closer: 0, set2Opener: 0,
      closer: 0, midset: 0, encore: 0, encore2: 0
    };
  }

  return {
    opener: perfTable.find("tr.opener").length,
    set1Closer: perfTable.find("tr.set1closer").length,
    set2Opener: perfTable.find("tr.set2opener").length,
    closer: perfTable.find("tr.closer").length,
    midset: perfTable.find("tr.midset").length,
    encore: perfTable.find("tr.encore").length,
    encore2: perfTable.find("tr.encore2").length,
  };
}
```

### Verification
```bash
# Check if performance table has row classes
curl -sL "https://dmbalmanac.com/songs/summary.aspx?sid=1" | \
  grep -c 'tr class="opener"'
# Should return > 0

# Test parsing
node -e "
const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('/tmp/dmb_song.html', 'utf8');
const $ = cheerio.load(html);
console.log('Opener rows:', $('tr.opener').length);
console.log('Closer rows:', $('tr.closer').length);
console.log('Midset rows:', $('tr.midset').length);
"
```

---

## 8. GUESTS.TS - Instruments Parsing (HIGH)

### Current Code (GUESSED)
```typescript
// Lines 60-70: CSS class names are assumed
const instrumentText = $(".instruments, .guest-instruments").text();
if (instrumentText) {
  instruments = parseInstruments(instrumentText);
} else {
  const instrMatch = pageText.match(/instruments?[:\s]+([^.]+)/i);
```

### Why It's Wrong
- CSS class names `.instruments` and `.guest-instruments` are guesses
- No evidence they exist in actual HTML
- Regex fallback `([^.]+)` is too broad (matches until period)
- `parseInstruments()` implementation unknown

### Fixed Code
```typescript
async function parseGuestPage(page: Page, guestUrl: string): Promise<ScrapedGuest | null> {
  try {
    let html = getCachedHtml(guestUrl);

    if (!html) {
      await page.goto(guestUrl, { waitUntil: "networkidle" });
      html = await page.content();
      cacheHtml(guestUrl, html);
    }

    const $ = cheerio.load(html);

    const gidMatch = guestUrl.match(/gid=(\d+)/);
    const originalId = gidMatch ? gidMatch[1] : undefined;

    // Parse guest name
    const name = normalizeWhitespace($("h1, .guest-name").first().text());
    if (!name) return null;

    // Parse instruments - multiple strategies
    let instruments: string[] = [];

    // Strategy 1: Look for specific instrument-related elements
    const instrumentElements = [
      ".instruments",
      ".guest-instruments",
      "[class*='instrument']",
      $("p").eq(0), // Often instruments are in first paragraph
      $("body > p, body > div > p").first() // First paragraph section
    ];

    for (const selector of instrumentElements) {
      if (typeof selector === 'string') {
        const text = $(selector).first().text().trim();
        if (text && text.length > 2) {
          instruments = parseInstruments(text);
          if (instruments.length > 0) break;
        }
      } else {
        const text = selector.text().trim();
        if (text && text.length > 2) {
          instruments = parseInstruments(text);
          if (instruments.length > 0) break;
        }
      }
    }

    // Strategy 2: Look for patterns in body text
    if (instruments.length === 0) {
      const bodyText = $("body").text();

      // Look for "instruments: ..." pattern
      let instrMatch = bodyText.match(/instruments?[:\s]+([^.\n]+)/i);
      if (instrMatch) {
        instruments = parseInstruments(instrMatch[1]);
      }

      // Look for quoted instrument list
      if (instruments.length === 0) {
        instrMatch = bodyText.match(/["\']([^"\']+)["\'](?:\s+(?:instruments?|vocals?|musician))?/i);
        if (instrMatch) {
          instruments = parseInstruments(instrMatch[1]);
        }
      }
    }

    // Parse appearance count
    let totalAppearances: number | undefined;
    const bodyText = $("body").text();
    const appearMatch = bodyText.match(/(\d+)\s+(?:appearances?|shows?|performances?)/i);
    if (appearMatch) {
      totalAppearances = parseInt(appearMatch[1], 10);
    }

    return {
      originalId,
      name,
      instruments,
      totalAppearances,
    };
  } catch (error) {
    console.error(`Error parsing guest ${guestUrl}:`, error);
    return null;
  }
}

// Improved instruments parser
function parseInstruments(text: string): string[] {
  if (!text || text.length < 1) return [];

  // Remove quotes and clean
  text = text.replace(/["\'\[\]\(\)]/g, "").trim();

  // Common separators: comma, slash, "and"
  const separators = [
    /\s+and\s+/i,
    /[,\/]/,
    /&/
  ];

  let instruments: string[] = [];
  let remaining = text;

  // Try each separator
  for (const sep of separators) {
    if (sep.test(remaining)) {
      instruments = remaining
        .split(sep)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 1 && !s.match(/^\d+$/));

      if (instruments.length > 0) {
        break;
      }
    }
  }

  // If no separators found, treat whole string as one instrument
  if (instruments.length === 0) {
    const trimmed = text.trim().toLowerCase();
    if (trimmed.length > 1) {
      instruments = [trimmed];
    }
  }

  // Remove common non-instrument words
  const nonInstruments = ['show', 'appearance', 'guest', 'musician', 'artist'];
  instruments = instruments.filter(
    inst => !nonInstruments.some(non => inst.includes(non))
  );

  return instruments;
}
```

### Test Cases
```typescript
test('parseInstruments - splits by comma', () => {
  expect(parseInstruments("vocals, violin, piano")).toEqual([
    "vocals", "violin", "piano"
  ]);
});

test('parseInstruments - splits by "and"', () => {
  expect(parseInstruments("vocals and flute")).toEqual([
    "vocals", "flute"
  ]);
});

test('parseInstruments - removes quotes', () => {
  expect(parseInstruments('"vocals, guitar"')).toEqual([
    "vocals", "guitar"
  ]);
});

test('parseInstruments - handles single instrument', () => {
  expect(parseInstruments("vocals")).toEqual(["vocals"]);
});
```

---

## 9. GUESTS.TS - Correct Index Page (MEDIUM)

### Current Code (POTENTIALLY WRONG)
```typescript
// Line 18: May not be the right starting page
await page.goto(`${BASE_URL}/GuestStats.aspx`, { waitUntil: "networkidle" });
```

### Why It's Wrong
- `GuestStats.aspx` without parameters might not show full guest list
- Reference document mentions `GuestList.aspx` (line 133)
- May only show one guest or require navigation

### Fixed Code
```typescript
async function getGuestUrls(page: Page): Promise<string[]> {
  console.log("Fetching guest URLs...");

  // Use the dedicated guest list page
  const guestListUrl = `${BASE_URL}/GuestList.aspx`;

  try {
    await page.goto(guestListUrl, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    console.error(`Failed to load ${guestListUrl}, trying fallback...`, error);
    // Fallback: Try the base GuestStats page
    await page.goto(`${BASE_URL}/GuestStats.aspx`, { waitUntil: "networkidle" });
  }

  const html = await page.content();
  const $ = cheerio.load(html);

  const guestUrls: string[] = [];

  // Find all guest links with gid parameter
  $("a[href*='GuestStats.aspx'][href*='gid=']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const fullUrl = href.startsWith("http")
        ? href
        : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      if (!guestUrls.includes(fullUrl)) {
        guestUrls.push(fullUrl);
      }
    }
  });

  console.log(`Found ${guestUrls.length} guests`);

  if (guestUrls.length === 0) {
    console.warn("No guests found - check if GuestList.aspx URL is correct");
  }

  return guestUrls;
}
```

---

## Summary of Changes

| File | Function | Issue | Fix | Priority |
|------|----------|-------|-----|----------|
| shows.ts | parseShowPage | Venue extraction via onclick | Use semantic href | HIGH |
| shows.ts | parseShowPage | Location parsing too strict | Add international format | HIGH |
| shows.ts | parseShowPage | Hardcoded guest IDs | Use name-based filter | MEDIUM |
| shows.ts | parseShowPage | Incomplete segue detection | Add missing patterns | MEDIUM |
| songs.ts | getSongUrls | Wrong index page | Change URL to /songs/all-songs.aspx | CRITICAL |
| songs.ts | parseSongPage | Redirect handling | Support /songs/summary.aspx URL | CRITICAL |
| venues.ts | parseVenuePage | Text-based name extraction | Use semantic HTML first | HIGH |
| venues.ts | parseVenuePage | International location regex | More flexible parsing | MEDIUM |
| song-stats.ts | parseSlotBreakdown | Always returns 0 | Count table rows | HIGH |
| song-stats.ts | parseVersionTypes | Unreliable text matching | Verify data exists | MEDIUM |
| guests.ts | parseGuestPage | Guessed CSS classes | Verify actual structure | HIGH |
| guests.ts | getGuestUrls | May use wrong starting page | Try GuestList.aspx | MEDIUM |

---

## Implementation Order

1. **Week 1 - CRITICAL Fixes**
   - Fix songs.ts URL (blocking scraper)
   - Fix shows.ts venue extraction (data quality)
   - Fix location parsing (data accuracy)

2. **Week 2 - HIGH Priority**
   - Fix song-stats.ts slot breakdown
   - Fix venues.ts venue name
   - Fix guests.ts instruments
   - Fix guests.ts starting URL

3. **Week 3 - MEDIUM Priority**
   - Refactor guest filtering
   - Improve segue detection
   - Add comprehensive test coverage

4. **Week 4 - Polish**
   - Verify all selectors on 10+ sample pages
   - Add error logging
   - Document all assumptions
   - Create selector test suite

---

**Document Created:** January 25, 2026
**Status:** Ready for Implementation
**Estimated Effort:** 8-12 hours developer time
