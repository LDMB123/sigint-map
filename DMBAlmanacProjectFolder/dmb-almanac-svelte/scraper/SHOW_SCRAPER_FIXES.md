# Show Scraper Fixes - DMB Almanac

## Summary
Fixed critical parsing issues in `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/shows.ts` to correctly parse DMBAlmanac show pages.

## Issues Fixed

### 1. Date Parsing Failure
**Problem:** Code looked for dates in format "March 14, 1991" but actual format is "03.14.1991"
**Solution:** Changed to parse from dropdown `<select>` element with MM.DD.YYYY regex pattern

**Before:**
```typescript
const dateEl = $(".show-date, .setlist-date, h1, h2").first();
const dateMatch = dateText.match(/(\w+\s+\d{1,2},?\s+\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})/);
```

**After:**
```typescript
const dateOption = $("select option:selected").filter((i, el) => {
  const text = $(el).text();
  return /\d{2}\.\d{2}\.\d{4}/.test(text);
}).first();

const dateMatch = rawDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
// Convert MM.DD.YYYY to YYYY-MM-DD
const [, month, day, year] = dateMatch;
dateStr = `${year}-${month}-${day}`;
```

### 2. Venue Link Not Found
**Problem:** Looked for `a[href*="VenueStats"]` but actual links use `javascript:void(0)` with VenueStats in onclick
**Solution:** Filter all `<a>` tags by checking onclick attribute for VenueStats.aspx

**Before:**
```typescript
const venueEl = $("a[href*='VenueStats']").first();
```

**After:**
```typescript
const venueLink = $("a").filter((i, el) => {
  const onclick = $(el).attr("onclick") || "";
  return onclick.includes("VenueStats.aspx");
}).first();
```

### 3. Song Links Not Found
**Problem:** Looked for `a[href*="SongStats"]` but songs use `javascript:void(0)` with class="lightorange"
**Solution:** Find songs in SetTable by looking for `td.setheadercell a.lightorange`

**Before:**
```typescript
$("tr, .setlist-row, .song-row").each((_, row) => {
  const songLink = $row.find("a[href*='SongStats']");
```

**After:**
```typescript
const setTable = $("#SetTable");
setTable.find("tr").each((_, row) => {
  const songLink = $row.find("td.setheadercell a.lightorange").first();
```

### 4. Band Members in Guest List
**Problem:** All GuestStats links were treated as guests, including core band members
**Solution:** Added BAND_MEMBER_GIDS filter array and check gid parameter in URLs

**Added constant:**
```typescript
const BAND_MEMBER_GIDS = [
  "1",   // Dave Matthews
  "2",   // Carter Beauford
  "94",  // LeRoi Moore
  "75",  // Stefan Lessard
  "104", // Boyd Tinsley
  "3",   // Jeff Coffin
  "ds"   // Dave solo
];
```

**Applied filtering:**
```typescript
$("a[href*='TourGuestShows.aspx']").each((_, guestLink) => {
  const href = $(guestLink).attr("href") || "";
  const gidMatch = href.match(/gid=([^&]+)/);
  if (gidMatch) {
    const gid = gidMatch[1];
    // Filter out band members
    if (!BAND_MEMBER_GIDS.includes(gid)) {
      const name = normalizeWhitespace($(guestLink).text());
      // Add to guests...
    }
  }
});
```

## Additional Improvements

### Slot Detection by Background Color
Enhanced opener/closer detection using bgcolor attributes:
- `#006666` = Set opener (teal)
- `#214263`, `#336699` = Set closer (blue variations)
- `#004040` = Set 2 opener
- `#660000`, `#CC0000` = Encore

### Duration Parsing
Fixed to handle empty duration cells properly:
```typescript
const durationText = normalizeWhitespace(durationCell.text());
const duration = durationText && durationText !== "&nbsp;" ? durationText : undefined;
```

## Test Results

All tests passed for the 1991-03-14 show (first DMB show):

```
✓ Date Parsing: 1991-03-14 (from "03.14.1991")
✓ Venue Parsing: Trax, Charlottesville, VA
✓ Setlist: 7 songs parsed correctly
  - Position numbers: 1-7
  - Opener: Typical Situation (slot=opener, bgcolor=#006666)
  - Closer: Recently (slot=closer, bgcolor=#214263, duration=6:22)
✓ Guest Filtering: 0 guests (5 band members filtered out)
  - Filtered: Dave solo, Dave Matthews, Carter Beauford, LeRoi Moore, Stefan Lessard
```

## Files Modified

- `/Users/louisherman/Documents/dmb-almanac/scraper/src/scrapers/shows.ts`
  - Added BAND_MEMBER_GIDS constant (lines 19-29)
  - Fixed parseShowPage() function (lines 100-293)
    - Date parsing (lines 118-133)
    - Venue parsing (lines 135-161)
    - Setlist parsing (lines 166-255)
    - Guest filtering (lines 274-293)

## Test Files Created

- `test-show-parsing-inline.ts` - Comprehensive unit tests
- `test-2000-show.ts` - Integration test helper
- `analyze-show-detailed.ts` - HTML structure analysis tool
- `test-show-page.ts` - Initial exploration script

## Selector Reference

### Key Selectors Used
```css
/* Date dropdown */
select option:selected

/* Venue link */
a[onclick*="VenueStats.aspx"]

/* Setlist table */
#SetTable

/* Song rows (skip header with .setcolumn) */
#SetTable tr td.setheadercell a.lightorange

/* Position cell with bgcolor */
td.setheadercell[bgcolor]

/* Duration cell */
td.setcell:eq(0)

/* Personnel cell with guests */
td.setcell[id^="personnelcell_"] a[href*="TourGuestShows.aspx"]

/* Notes cell */
td.endcell
```

## DMBAlmanac HTML Structure Notes

The site uses a complex table structure:
1. Date is in a dropdown with format MM.DD.YYYY
2. Venue info is in a div after "Dave Matthews Band" header
3. Location is plain text after venue link: "Trax    Charlottesville, VA"
4. Setlist is in table with ID "SetTable"
5. Song links use `javascript:void(0)` with onclick handlers
6. Slot indicators use bgcolor attributes
7. Guest links use TourGuestShows.aspx?gid=X format
8. Band members have specific gid values that need filtering

## Running Tests

```bash
cd /Users/louisherman/Documents/dmb-almanac/scraper

# Test the fixed parsing logic
npx tsx test-show-parsing-inline.ts

# Test on actual scraper (when needed)
npm run scrape:shows
```

## Future Considerations

1. **Set Detection**: Current logic tracks set transitions by bgcolor. May need enhancement for:
   - Shows with 3+ encores
   - Acoustic sets
   - Soundcheck songs

2. **Guest Instruments**: Currently empty array. Could parse from onmouseover text in links.

3. **Segue Detection**: Currently looks for arrows in notes. May need to check for specific formatting.

4. **Tease Detection**: Simple text search. Could be enhanced with regex patterns.

5. **Release Detection**: Checks for cd/cast images. Verify all release icon types are covered.

## Resilience Notes

These selectors should be relatively stable because:
- SetTable ID is a semantic identifier
- Background colors are style attributes (may change but distinctive)
- TourGuestShows.aspx and VenueStats.aspx are URL patterns in backend
- Date dropdown is core navigation element

If the scraper breaks in future:
1. Check if SetTable ID changed
2. Verify bgcolor values for slot detection
3. Check if guest URL pattern changed (gid parameter)
4. Verify date dropdown format still MM.DD.YYYY
