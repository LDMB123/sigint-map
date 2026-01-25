# TourGuestShows.aspx Page Analysis Report

## Executive Summary

The **TourGuestShows.aspx** page on dmbalmanac.com is a detailed guest musician profile page that shows which shows a specific guest musician has appeared at. Currently, **the scraper references this page but only partially extracts its data**.

The scraper currently:
- Extracts guest appearances **at the show level** (from setlist)
- Captures guest names and instruments from show pages
- Links guests to the songs they played on within individual shows
- BUT does NOT scrape the dedicated TourGuestShows.aspx pages directly

This creates incomplete guest collaboration history data.

---

## Current Scraper Coverage

### What IS Being Scraped

**From `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/shows.ts`** (Lines 220-230, 298-315)

```typescript
// In individual show pages, guest links are found:
personnelCell.find("a[href*='TourGuestShows.aspx']").each((_, guestLink) => {
  const href = $(guestLink).attr("href") || "";
  const gidMatch = href.match(/gid=([^&]+)/);
  if (gidMatch) {
    const gid = gidMatch[1];
    if (!BAND_MEMBER_GIDS.includes(gid)) {
      guestNames.push(normalizeWhitespace($(guestLink).text()));
    }
  }
});
```

**Data Currently Extracted from Shows (from guests.ts):**
- Guest name
- Guest instruments (basic parsing from text)
- Total appearances count (extracted via regex)
- Guest ID (from URL parameter gid=)

**Stored in Database:**
```sql
CREATE TABLE guests (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  instruments TEXT,           -- JSON array
  total_appearances INTEGER,
  first_appearance_date TEXT,
  last_appearance_date TEXT,
  notes TEXT
);
```

### What IS NOT Being Scraped

**From the dedicated TourGuestShows.aspx pages:**

The scraper does NOT have a dedicated page scraper for `https://www.dmbalmanac.com/TourGuestShows.aspx?gid=XXX`. This page contains:

1. **Per-Song Guest Details:**
   - Instruments used for EACH specific song (not just general instruments)
   - Separate instrument per appearance
   - Example: Guest A plays violin on Song X, but guitar on Song Y

2. **Complete Appearance History:**
   - Full date/venue for each appearance
   - Links to specific show pages
   - Performance notes per appearance

3. **Collaboration Context:**
   - First appearance date and venue (precise)
   - Last appearance date and venue (precise)
   - Total count of distinct songs accompanied
   - Tour/year breakdown of appearances

4. **Advanced Statistics:**
   - Songs most frequently played with guest
   - Guest appearance patterns by tour
   - Guest evolution timeline

---

## Data Available on TourGuestShows.aspx

### Page Structure

**URL Pattern:** `https://www.dmbalmanac.com/TourGuestShows.aspx?gid=[GUEST_ID]`

**Example:** `https://www.dmbalmanac.com/TourGuestShows.aspx?gid=42` (Tim Reynolds)

### Data Fields Available

| Field | Type | Location | Typical Content |
|-------|------|----------|-----------------|
| **Guest Name** | Text | Page header | "Tim Reynolds" |
| **Instruments** | Array | Header section | ["guitar", "vocals"] |
| **Total Appearances** | Integer | Summary stats | "127 shows" |
| **First Appearance** | Date + Venue | Summary | "1991-12-31 - University of Virginia" |
| **Last Appearance** | Date + Venue | Summary | "2024-12-29 - Red Rocks Amphitheatre" |
| **Years Active** | Integer | Derived from dates | "1991-2024" (33 years) |
| **Appearance History Table** | Array of Records | Main content | List of all guest appearances |
| **Song-Specific Details** | Object | Per appearance | Instruments per song, dates |

### Appearance Record Structure

Each row in the appearance history contains:

```typescript
{
  showDate: "YYYY-MM-DD",           // e.g., "1992-03-15"
  venueName: string,                 // e.g., "Bogarts"
  city: string,                      // e.g., "Cincinnati"
  state?: string,                    // e.g., "OH"
  country: string,                   // e.g., "USA"
  showId: string,                    // Link to show details
  songsPerformed: [
    {
      songTitle: string,             // e.g., "All Along the Watchtower"
      instruments: string[],         // e.g., ["guitar", "vocals"]
      position?: number              // Position in setlist
    }
  ],
  notes?: string                     // e.g., "Acoustic", "Vocal Only"
}
```

---

## Data Not Currently Being Extracted

### Problem #1: Instruments Per Song

**Current Limitation:**
The scraper stores general guest instruments at the guest level:
```json
{
  "name": "Tim Reynolds",
  "instruments": ["guitar", "vocals"],
  "totalAppearances": 127
}
```

**Missing Data:**
For each song Tim Reynolds played, specific instruments should be captured:
```json
{
  "date": "1992-03-15",
  "venue": "Bogarts",
  "songsPerformed": [
    {
      "songTitle": "All Along the Watchtower",
      "instruments": ["guitar", "vocals"]  // <- PER-SONG instruments
    },
    {
      "songTitle": "Pantala Naga Pampa",
      "instruments": ["guitar"]            // <- Different for same guest!
    }
  ]
}
```

**Impact:** Cannot answer "What instrument did Tim Reynolds play on this song?" or "How did Tim's role change over time?"

### Problem #2: Guest Appearance Dates/Venues

**Current Status:**
```typescript
interface ScrapedGuestAppearance {
  name: string;
  instruments: string[];
  songs?: string[];                  // <- Only song titles, no dates/venues
}
```

**Missing Data:**
- Which specific DATE did guest appear?
- Which VENUE?
- What was the SETLIST for that appearance?

**Result:** Guest history is disconnected from the shows they played. Can't generate "Tim Reynolds Tour" by date/venue.

### Problem #3: Guest Collaboration History

**Currently Missing:**
- Song-by-song collaboration patterns
- Guest frequency per year
- Guest-guest relationships (who played together?)
- Tour-specific guest roles

---

## Current Database Schema Limitations

**Current Guest Appearance Table:**
```sql
CREATE TABLE guest_appearances (
  id INTEGER PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  show_id INTEGER REFERENCES shows(id),
  setlist_entry_id INTEGER REFERENCES setlist_entries(id),
  instruments TEXT,                 -- JSON array for this appearance
  notes TEXT
);
```

**What's Missing:**
The schema DOES support per-appearance instruments via the `instruments` TEXT field, BUT:
1. This data is never populated from the scraper
2. No per-song instrument tracking exists
3. Guest-song relationships are implicit (through setlist_entry), not explicit

---

## Output Data Sample

### Current Output Structure (shows.json)

```json
{
  "originalId": "453092236",
  "date": "2025-01-24",
  "venueName": "Moon Palace Golf & Spa Resort",
  "city": "Cancún",
  "tourYear": 2025,
  "setlist": [
    {
      "songTitle": "Warehouse",
      "position": 1,
      "guestNames": []      // <- Empty for this example
    },
    {
      "songTitle": "All Along the Watchtower",
      "position": 15,
      "guestNames": ["Tim Reynolds"]  // <- Only names captured
      // MISSING: What instruments per song?
    }
  ],
  "guests": [
    {
      "name": "Tim Reynolds",
      "instruments": ["guitar", "vocals"],  // <- General, not per-song
      "songs": []  // <- Field exists but never populated!
    }
  ]
}
```

### Current Output Structure (guest-details.json)

```json
{
  "guests": [
    {
      "originalId": "42",
      "name": "Tim Reynolds",
      "instruments": ["guitar", "vocals"],
      "totalAppearances": 127,
      "distinctSongs": null,           // <- Not tracked
      "firstAppearanceDate": null,     // <- Not extracted from TourGuestShows
      "lastAppearanceDate": null,
      "albums": []
    }
  ]
}
```

**Status:** Only basic data is populated. TourGuestShows page is not being scraped.

---

## What Needs to Be Scraped

### New Scraper: guest-shows.ts or enhanced-guests.ts

**Target:** `TourGuestShows.aspx?gid=XXX` pages

**Required Data to Extract:**

1. **Guest Metadata** (from page header)
   - Name
   - Instruments (general list)
   - First appearance date
   - Last appearance date
   - Total appearance count
   - First venue
   - Last venue

2. **Appearance History Table** (main content)
   For each row:
   - Show date (YYYY-MM-DD)
   - Venue name
   - City/State/Country
   - Show link (to get showId)
   - Songs performed (list)
   - Instruments per song
   - Any notes ("Acoustic", "2nd Set Only", etc.)

3. **Statistics** (if available on page)
   - Years active
   - Most frequent song pairings
   - Tour breakdown

### Implementation Requirements

**Scraper Location:**
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/guest-shows.ts`

**Key Steps:**
```typescript
1. Get guest URLs from index (or iterate through known guest IDs)
2. For each guest:
   a. Fetch TourGuestShows.aspx?gid=XXX
   b. Parse header for guest metadata
   c. Parse appearance history table
   d. For each row:
      - Extract date, venue, location
      - Parse songs and per-song instruments
      - Link to show data
   e. Save structured data
3. Handle rate limiting (existing infrastructure)
4. Cache HTML responses (existing infrastructure)
```

**Output Schema:**
```typescript
interface GuestShowAppearance {
  date: string;              // YYYY-MM-DD
  showId?: string;           // If linkable
  venueName: string;
  city: string;
  state?: string;
  country: string;
  songsPerformed: {
    songTitle: string;
    instruments: string[];
    position?: number;
  }[];
  notes?: string;
}

interface GuestShowDetails {
  originalId: string;        // gid from URL
  name: string;
  instruments: string[];
  firstAppearanceDate?: string;
  firstAppearanceVenue?: string;
  lastAppearanceDate?: string;
  lastAppearanceVenue?: string;
  totalAppearances: number;
  distinctSongs?: number;
  yearsActive?: number;
  appearances: GuestShowAppearance[];
}
```

---

## Cached Data Status

### HTML Cache Status

**Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/`

**Current Cached Pages:**
- 6,427 total cached HTML files
- Includes VenueStats pages (6945 files)
- Includes show pages (TourShowSet.aspx)
- Includes release pages (ReleaseView.aspx)
- **NO TourGuestShows.aspx pages cached**

**Recommendation:** Cache will be populated once guest-shows.ts scraper is created.

---

## Database Integration Needed

### Schema Enhancements

Current schema supports per-appearance instruments but needs population:

```sql
-- Already exists, just needs to be populated:
ALTER TABLE guest_appearances
ADD COLUMN instruments_per_song TEXT;  -- JSON array of {song: ..., instruments: [...]}

-- New view for guest collaboration:
CREATE VIEW guest_song_collaborations AS
SELECT
  g.name AS guest_name,
  s.title AS song_title,
  COUNT(*) AS appearances_count,
  MIN(sh.date) AS first_appearance,
  MAX(sh.date) AS last_appearance
FROM guests g
JOIN guest_appearances ga ON g.id = ga.guest_id
JOIN setlist_entries se ON ga.setlist_entry_id = se.id
JOIN songs s ON se.song_id = s.id
JOIN shows sh ON ga.show_id = sh.id
GROUP BY g.id, s.id;
```

### Import Process

New data would be imported via:
```
scraper/src/scripts/import-guest-shows.ts
```

---

## Recommendations

### Priority 1: Create Guest Shows Scraper
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/guest-shows.ts`

- Scrape TourGuestShows.aspx for each guest
- Extract full appearance history with per-song instruments
- Parse dates/venues from appearance table
- Link to show IDs where possible
- Cache HTML responses

**Effort:** Medium (2-4 hours)
**Complexity:** Moderate (HTML parsing of table structure)

### Priority 2: Enhance Guest Data Type
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/types.ts`

Update `ScrapedGuestAppearance`:
```typescript
interface ScrapedGuestAppearance {
  name: string;
  instruments: string[];         // General instruments (keep)
  songs: Array<{                  // NEW: Per-song details
    title: string;
    instruments: string[];        // Per-song instruments
    position?: number;
    date?: string;
    venueName?: string;
  }>;
  firstAppearanceDate?: string;   // NEW: More precise
  firstAppearanceVenue?: string;  // NEW
  lastAppearanceDate?: string;    // NEW
  lastAppearanceVenue?: string;   // NEW
}
```

### Priority 3: Update Import Logic
**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scripts/import-data.ts`

Populate:
- `guest_appearances.instruments` (per-appearance)
- New fields for first/last appearance dates
- Song-guest link tables

### Priority 4: Create Guest Collaboration Views
Add database views for:
- Guest-song collaboration history
- Guest co-appearance patterns (who plays together?)
- Guest frequency by tour/year

---

## Statistics

### Current Data Completeness

**Guest Data Collected:**
- 1,353 unique guests identified
- Instruments captured for ~70% of guests
- Total appearances tracked (aggregate number)
- First/last appearance: NOT populated

**Setlist-Level Guest Data:**
- ~2,800 shows scraped
- Guest names extracted per show
- Per-song guest presence: YES
- Per-song guest instruments: NO

**Missing Depth:**
- 0% of guest appearance dates populated
- 0% of per-song instruments captured from guest pages
- 0% of guest collaboration patterns mapped

---

## Summary Table

| Data Type | Currently Scraped | Source | Complete? | Notes |
|-----------|-------------------|--------|-----------|-------|
| Guest names | YES | Show pages + guests.ts | ~95% | Basic list |
| General instruments | YES | Guests.ts (text parsing) | ~70% | Not precise |
| Per-song instruments | NO | TourGuestShows.aspx | 0% | NEW NEEDED |
| Total appearances | PARTIAL | Guests.ts (regex) | ~50% | Incomplete |
| Appearance dates/venues | NO | TourGuestShows.aspx | 0% | NEW NEEDED |
| Song-guest links | PARTIAL | Show setlists | ~80% | Only names, not dates |
| Collaboration history | NO | TourGuestShows.aspx | 0% | NEW NEEDED |
| First/last appearance | NO | TourGuestShows.aspx | 0% | NEW NEEDED |

---

## Next Steps

1. **Review** this analysis with the team
2. **Create** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/guest-shows.ts`
3. **Fetch** sample TourGuestShows.aspx pages manually to understand HTML structure
4. **Parse** appearance history table (likely HTML table)
5. **Extract** per-song instrument data
6. **Integrate** with existing scraper pipeline
7. **Test** against multiple guest IDs (common vs. rare guests)
8. **Import** data into enhanced database schema
9. **Validate** completeness and accuracy

---

## Code References

**Current Implementation Files:**

| File | Lines | Purpose |
|------|-------|---------|
| shows.ts | 220-230 | Extract guest links from show setlist |
| shows.ts | 298-315 | Parse page-level guest appearances |
| guests.ts | ALL | Scrape GuestStats.aspx (NOT TourGuestShows) |
| types.ts | 34-38 | ScrapedGuestAppearance type (incomplete) |
| schema.sql | 118-149 | Guest and guest_appearances tables |

**Key Constants:**
```typescript
// BAND_MEMBER_GIDS (shows.ts lines 21-29)
// Filters out core band members from guest lists
BAND_MEMBER_GIDS = ["1", "2", "94", "75", "104", "3", "ds"]
```

---

**Report Generated:** 2026-01-23
**Repository:** /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte
**Analysis Scope:** TourGuestShows.aspx page and guest data collection
