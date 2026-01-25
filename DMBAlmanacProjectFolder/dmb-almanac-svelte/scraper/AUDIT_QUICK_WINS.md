# DMB Almanac Scraper - Quick Wins & Implementation Guide

**Objective**: Prioritized list of high-impact, low-effort fixes that improve data quality immediately

---

## Quick Win #1: Fix History Data Validation (1-2 Hours)

### Problem
History.json contains ~50-100 shows with invalid years (year 862, 9311, etc.)

### Quick Fix Code
**File**: `src/scrapers/history.ts`

```typescript
// In parseHistoryPage function, after date parsing:

// BEFORE parsing show dates
const validShows: HistoryDayShow[] = [];

// In loop where you parse shows:
const year = parseInt(yearStr, 10);

// ADD THIS VALIDATION:
if (year < 1991 || year > 2025) {
  console.warn(`Skipping invalid show date: ${yearStr} (outside 1991-2025 range)`);
  return; // Skip invalid entry
}

// Only add to validShows if date is valid
validShows.push(showData);

// Return validShows instead of allShows
return validShows;
```

### Result
- Removes ~100 invalid entries
- Improves data integrity
- Fixes history-based queries
- **Time to implement**: 15-20 minutes
- **Impact**: HIGH (data integrity)
- **Risk**: LOW (removing bad data)

### Testing
```bash
# After fix, check history.json
jq '.days[0].shows | length' scraper/output/history.json
# Should show realistic number, no year >2025
```

---

## Quick Win #2: Standardize Date Formats (2-3 Hours)

### Problem
Dates formatted inconsistently across datasets (M/D/YYYY, MM.DD.YY, YYYY-MM-DD, [MM.DD.YY])

### Quick Fix - Create Utility Function
**File**: `src/utils/helpers.ts`

```typescript
/**
 * Convert any date format to ISO 8601 (YYYY-MM-DD)
 * Handles: "1/12/2004", "01.12.04", "01.12.2004", "[07.07.12]", etc.
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';

  // Remove brackets and extra whitespace
  let cleaned = dateStr.replace(/[\[\]]/g, '').trim();

  // Try YYYY-MM-DD (already normalized)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try MM.DD.YY or MM/DD/YY
  const match1 = cleaned.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})$/);
  if (match1) {
    const [, m, d, y] = match1;
    const year = parseInt(y, 10);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try MM.DD.YYYY or MM/DD/YYYY or M/D/YYYY
  const match2 = cleaned.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (match2) {
    const [, m, d, y] = match2;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // If parsing fails, return as-is and log warning
  console.warn(`Could not parse date: ${dateStr}`);
  return cleaned;
}
```

### Apply to Song Stats
**File**: `src/scrapers/song-stats.ts`

```typescript
// In parseSongStatsPage function, after extracting dates:
const songStats: SongStatistics = {
  // ... other fields
  firstPlayedDate: normalizeDate(rawFirstDate) || null,
  lastPlayedDate: normalizeDate(rawLastDate) || null,
  // ... rest of object
};
```

### Apply to Releases
**File**: `src/scrapers/releases.ts`

```typescript
// In parseReleasePage, after extracting track dates:
const track: ScrapedReleaseTrack = {
  trackNumber,
  discNumber,
  songTitle,
  duration,
  showDate: normalizeDate(rawShowDate),  // Normalize here
  venueName
};
```

### Apply to Venue Stats
**File**: `src/scrapers/venue-stats.ts`

```typescript
// In parseVenueStatsPage:
const venueStats: ScrapedVenueStats = {
  // ... other fields
  firstShowDate: normalizeDate(rawFirstDate),
  lastShowDate: normalizeDate(rawLastDate),
};
```

### Result
- All dates standardized to YYYY-MM-DD
- Consistent format across all datasets
- Frontend doesn't need format handling
- **Time to implement**: 1-2 hours (write function + apply to 3 files)
- **Impact**: MEDIUM (data consistency)
- **Risk**: LOW (deterministic transformation)

### Testing
```bash
# Check that no date contains periods or brackets
jq '.songs[0:5] | .[] | .firstPlayedDate' scraper/output/song-stats.json
# All should be "YYYY-MM-DD" format
```

---

## Quick Win #3: Separate Guest Context from Guest Names (1.5-2 Hours)

### Problem
Guest names array contains notes like "Tim solo", "first time played"

### Quick Fix
**File**: `src/types.ts`

```typescript
// MODIFY ScrapedSetlistEntry:
export interface ScrapedSetlistEntry {
  songTitle: string;
  position: number;
  set: string;
  slot: "opener" | "closer" | "standard";
  duration?: string;
  isSegue: boolean;
  segueIntoTitle?: string;
  isTease: boolean;
  teaseOfTitle?: string;
  hasRelease: boolean;
  releaseTitle?: string;

  // SEPARATE guest data:
  guestNames: string[];           // Only actual guest musician names

  // NEW: Guest context field
  guestContext?: {
    noteText?: string;            // "Tim solo", "Dave scat intro", etc.
    isSolo?: boolean;             // True if solo performance
    isAcoustic?: boolean;          // True if acoustic
    isFirstTime?: boolean;         // True if first-time song
    otherContext?: string[];       // Any other notes
  };

  // Keep for reference
  notes?: string;
}
```

### Update Shows Parser
**File**: `src/scrapers/shows.ts`

```typescript
// In parseShowPage, within setlist parsing loop:

// Extract guest names (keeping current logic)
const guestNames: string[] = [];
const guestContextNotes: string[] = [];

personnelCell.find("a[href*='TourGuestShows.aspx']").each((_, link) => {
  const name = $(link).text().trim();
  // Check if it's actually a name (has guest ID) vs. a note
  const href = $(link).attr("href") || "";
  const gidMatch = href.match(/gid=([^&]+)/);

  if (gidMatch) {
    const gid = gidMatch[1];
    if (!BAND_MEMBER_GIDS.includes(gid)) {
      guestNames.push(name);
    }
  }
});

// Parse context from notes
let guestContext: any = {};
const notes = notesText.toLowerCase();

if (notes.includes("solo")) {
  guestContext.isSolo = true;
}
if (notes.includes("acoustic")) {
  guestContext.isAcoustic = true;
}
if (notes.includes("first time")) {
  guestContext.isFirstTime = true;
  guestContext.noteText = notesText.match(/first[^,]*/i)?.[0];
}
if (notes.includes("tim solo")) {
  guestContext.isSolo = true;
  guestContext.noteText = "Tim solo";
}

// Add to entry
setlist.push({
  songTitle,
  position,
  // ... other fields
  guestNames,        // Clean names only
  guestContext: Object.keys(guestContext).length > 0 ? guestContext : undefined,
  notes: notesText ? normalizeWhitespace(notesText) : undefined,
});
```

### Result
- Clean guest names array (no context notes)
- Guest context captured in structured field
- Analytics can now count guests accurately
- **Time to implement**: 1-1.5 hours
- **Impact**: MEDIUM (data accuracy)
- **Risk**: LOW (just reorganizing data)

### Testing
```bash
# Check that guestNames doesn't contain "first time", "solo", etc.
jq '.shows[100:110] | .[].setlist | .[].guestNames | .[]' output/shows.json | \
  grep -i "first\|solo" | wc -l
# Should be 0 or very low count
```

---

## Quick Win #4: Add Show Configuration Field (1-2 Hours)

### Problem
Cannot distinguish between full band shows, Dave & Tim shows, and Dave solo shows

### Quick Implementation
**File**: `src/types.ts`

```typescript
export interface ScrapedShow {
  // Existing fields...

  // ADD:
  bandConfiguration?: "full_band" | "dave_tim" | "dave_solo" | "special_guests";
}
```

### Add Detection Logic
**File**: `src/scrapers/shows.ts`

```typescript
// In parseShowPage function, after parsing guests and notes:

function detectBandConfiguration(
  guestNames: string[],
  notes: string | undefined,
  venue: string
): "full_band" | "dave_tim" | "dave_solo" | "special_guests" {

  const notesLower = (notes || "").toLowerCase();

  // Check for explicit indicators
  if (notesLower.includes("solo") || notesLower.includes("dave solo")) {
    return "dave_solo";
  }

  if (notesLower.includes("dave and tim") || notesLower.includes("dave & tim")) {
    return "dave_tim";
  }

  // Check guest list for Tim Reynolds specifically
  if (guestNames.some(n => n.toLowerCase().includes("tim"))) {
    return "dave_tim";
  }

  // Check if only Tim and no other guests (Dave & Tim)
  if (guestNames.length === 1 &&
      guestNames[0].toLowerCase().includes("tim")) {
    return "dave_tim";
  }

  // Default to full band if no special indicators
  return "full_band";
}

// In setlist/show construction:
const bandConfiguration = detectBandConfiguration(
  guests.map(g => g.name),
  notesText,
  venueName
);

const show: ScrapedShow = {
  // ... existing fields
  bandConfiguration,
  // ... rest of object
};
```

### Result
- Shows tagged with configuration
- Can query/filter by performance type
- Song statistics per configuration possible
- **Time to implement**: 1-1.5 hours
- **Impact**: MEDIUM (analytics)
- **Risk**: LOW (heuristic-based, can be refined)

### Testing
```bash
# Check distribution of configurations
jq '[.shows[].bandConfiguration] | group_by(.) | map({type: .[0], count: length})' \
  output/shows.json
# Should show reasonable distribution
```

---

## Quick Win #5: Fix Release Track Show Dates (1 Hour)

### Problem
Live release track dates are bracketed: "[07.07.12]" instead of "2012-07-07"

### Quick Fix
**File**: `src/scrapers/releases.ts`

```typescript
// In parseReleasePage, when parsing track dates:

// BEFORE:
const showDate = dateCell.text().trim();  // Returns "[07.07.12]"

// AFTER:
let showDate: string | undefined;
const rawDate = dateCell.text().trim();

if (rawDate && /\d/.test(rawDate)) {
  // Remove brackets and normalize
  const cleaned = rawDate.replace(/[\[\]]/g, '');
  showDate = normalizeDate(cleaned);  // Uses helper from Quick Win #2
}

const track: ScrapedReleaseTrack = {
  trackNumber,
  discNumber,
  songTitle,
  duration,
  showDate,         // Now properly formatted
  venueName
};
```

### Result
- Track dates match show dates format
- Can link tracks to show records
- **Time to implement**: 30-45 minutes
- **Impact**: LOW (consistency)
- **Risk**: VERY LOW (simple normalization)

---

## Quick Win #6: Add Data Validation Warnings (30-45 Minutes)

### Problem
Bad data silently processed; no feedback on data quality issues

### Quick Fix
**File**: `src/utils/validation.ts` (new file)

```typescript
export interface DataQualityReport {
  warnings: string[];
  errors: string[];
  stats: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    invalidPercentage: number;
  };
}

export function validateShow(show: ScrapedShow): string[] {
  const warnings: string[] = [];

  // Check for empty venue
  if (!show.venueName || show.venueName.length === 0) {
    warnings.push(`Show ${show.originalId}: Missing venue name`);
  }

  // Check for invalid year
  const year = parseInt(show.date.substring(0, 4), 10);
  if (year < 1991 || year > 2025) {
    warnings.push(`Show ${show.originalId}: Invalid year ${year}`);
  }

  // Check for empty setlist
  if (!show.setlist || show.setlist.length === 0) {
    warnings.push(`Show ${show.originalId}: Empty setlist`);
  }

  return warnings;
}

export function validateShows(shows: ScrapedShow[]): DataQualityReport {
  const warnings: string[] = [];
  let validCount = 0;

  for (const show of shows) {
    const showWarnings = validateShow(show);
    warnings.push(...showWarnings);
    if (showWarnings.length === 0) validCount++;
  }

  return {
    warnings: warnings.slice(0, 100), // Cap at 100 warnings
    errors: [],
    stats: {
      totalRecords: shows.length,
      validRecords: validCount,
      invalidRecords: shows.length - validCount,
      invalidPercentage: ((shows.length - validCount) / shows.length) * 100
    }
  };
}
```

### Use in Orchestrator
**File**: `src/orchestrator.ts`

```typescript
import { validateShows } from './utils/validation.js';

// After loading shows:
const qualityReport = validateShows(allShows);
console.log(`Data Quality: ${qualityReport.stats.validPercentage.toFixed(1)}% valid`);
console.log(`Warnings: ${qualityReport.warnings.length}`);
console.log(qualityReport.warnings.slice(0, 10));  // Show first 10
```

### Result
- Immediate feedback on data quality
- Identifies trends in bad data
- Guides which fixes to prioritize
- **Time to implement**: 30-45 minutes
- **Impact**: DIAGNOSTIC (helps prioritize fixes)
- **Risk**: NONE (reporting only)

---

## Quick Win Priority Order

### Week 1 (6-8 hours)
1. Fix History Data Validation (1-2 hrs) - CRITICAL
2. Standardize Date Formats (2-3 hrs) - HIGH
3. Add Data Validation Warnings (30-45 min) - DIAGNOSTIC

### Week 2 (4-5 hours)
4. Separate Guest Context (1.5-2 hrs) - MEDIUM
5. Add Show Configuration (1-2 hrs) - MEDIUM
6. Fix Release Track Dates (1 hr) - LOW

### Week 3+ (remaining)
- Then tackle larger issues (segue data, rarity extraction, etc.)

---

## Implementation Checklist

### Before Starting
- [ ] Create feature branch: `git checkout -b fix/data-quality-audit`
- [ ] Run current tests: `npm run test`
- [ ] Note baseline metrics from output files

### History Fix
- [ ] Modify history.ts with year validation
- [ ] Test with: `jq '.days[0].shows | .[].year' output/history.json`
- [ ] Verify no years outside 1991-2025

### Date Format Fix
- [ ] Add normalizeDate function to helpers.ts
- [ ] Update song-stats.ts, releases.ts, venue-stats.ts
- [ ] Test: `jq '.releases[0].tracks[0].showDate' output/releases.json`
- [ ] Verify all dates are YYYY-MM-DD format

### Guest Context Fix
- [ ] Modify types.ts with guestContext field
- [ ] Update shows.ts parsing logic
- [ ] Test: `jq '.shows[100].setlist[0].guestNames' output/shows.json`
- [ ] Verify no notes in guestNames

### Configuration Fix
- [ ] Add bandConfiguration field to types
- [ ] Implement detection logic in shows.ts
- [ ] Test: `jq '[.shows[].bandConfiguration] | unique' output/shows.json`

### Validation Fix
- [ ] Create validation.ts
- [ ] Integrate into orchestrator.ts
- [ ] Run scraper and check warnings

### Testing
- [ ] Re-run full scraper: `npm run scrape`
- [ ] Verify output file sizes reasonable
- [ ] Check no new errors introduced
- [ ] Manual spot-checks on 5-10 records

### Commit
- [ ] `git add src/`
- [ ] Create comprehensive commit message
- [ ] Push and create PR

---

## Expected Improvements

### Data Quality Metrics (Before/After)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Shows with valid years | 97% | 100% | +50 records |
| Dates standardized | 30% | 100% | Huge |
| Guest data clean | 80% | 100% | +50 songs |
| Shows with configuration | 0% | 95%+ | New capability |
| Data warnings | 0 | <50 | Better visibility |

### User Impact
- Consistent date formats across UI
- Better guest musician attribution
- Can filter shows by performance type
- Data integrity improved
- Analytics more accurate

---

**Total Implementation Time**: 12-16 hours (spread over 2-3 weeks)
**Expected Data Quality Improvement**: 63% -> 78% overall score
**Risk Level**: LOW (all changes are additive or fix existing bugs)

---

Last Updated: January 23, 2026
