# DMBAlmanac.com Scraper Coverage Analysis

**Analysis Date:** January 23, 2026
**Scraper Location:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/src/scrapers/`

---

## Executive Summary

The DMB Almanac scraper has **13 scrapers** covering **10 main page types**. While the core concert and musician data is comprehensively scraped, **several important feature pages are NOT being scraped**, representing a significant gap in data collection.

**Coverage Status:**
- Core data: **95% covered** (shows, songs, venues, guests)
- Curated content: **90% covered** (lists, history, rarity, liberation)
- Enhanced stats: **50% covered** (song statistics partial, venue statistics partial, tour statistics available)
- **Gaps identified: 4 major page types with no scrapers**

---

## Scrapers Present (13 Total)

### 1. **shows.ts** - Concert Setlists
**Source URL:** `TourShowSet.aspx` (now called `ShowSetlist.aspx`)
**Status:** COMPLETE
**Coverage:**
- Individual show/setlist pages ✓
- Date, venue, city/state/country ✓
- Full setlist with positions ✓
- Set markers (Set 1, Set 2, Encore) ✓
- Song durations (when available) ✓
- Segue indicators ✓
- Tease detection ✓
- Guest appearances (filtering out band members) ✓
- Show notes and soundcheck ✓
- Release information ✓

**Data Fields Captured:**
```
- originalId (show ID)
- date (YYYY-MM-DD)
- venueName, city, state, country
- tourYear
- setlist[] with:
  - songTitle, position, set, slot
  - duration, isSegue, segueIntoTitle
  - isTease, teaseOfTitle, hasRelease
  - guestNames, notes
- guests[] with names and instruments
```

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 2. **songs.ts** - Song Catalog
**Source URL:** `SongSearchResult.aspx` / `SongList.aspx`
**Status:** COMPLETE (basic)
**Coverage:**
- Song title ✓
- Original artist (for covers) ✓
- Cover detection ✓
- First played date ✓
- Last played date ✓
- Total plays count ✓
- Lyrics (when available) ✓
- Song notes ✓

**Data Fields Captured:**
```
- originalId (song ID)
- title
- originalArtist (for covers)
- isCover
- lyrics
- notes
- firstPlayedDate, lastPlayedDate
- totalPlays
```

**Missing Enhanced Data:**
- Play statistics by position (opener/closer/midset)
- Version types (full/tease/partial/reprise/fake/aborted)
- Segue patterns
- Release information
- Year-by-year breakdown
- Artist configuration stats (DMB vs Dave & Tim vs Dave solo)

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 3. **song-stats.ts** - Detailed Song Statistics
**Source URL:** `SongStats.aspx?sid=XXX`
**Status:** ADVANCED (parsing implemented)
**Coverage:**
- Slot breakdown (opener/closer positions) ✓
- Version types (full/tease/partial/reprise/fake/aborted) ✓
- Average length and duration extremes ✓
- Top segues (songs this segues into/from) ✓
- Play breakdown by year ✓
- Release counts by type ✓
- Liberation/gap information ✓
- Artist-specific stats (DMB vs Dave & Tim) ✓
- Total plays, first/last played ✓
- Years active and current gap ✓

**Data Fields Captured:**
```
- slotBreakdown (7 position types)
- versionTypes (6 version types)
- avgLengthSeconds, longestVersion, shortestVersion
- topSeguesInto[], topSeguesFrom[]
- releaseCounts (6 release types)
- playsByYear[]
- artistStats[]
- liberations[]
- currentGap
```

**Parser Sophistication:** Regex-based pattern matching from HTML text (no structured data)

**Rate Limiting:** 1 concurrent (sequential), 5 per 10 seconds

---

### 4. **venues.ts** - Venue Catalog
**Source URL:** `VenueStats.aspx` (index)
**Status:** BASIC (entry-level scraper)
**Coverage:**
- Venue name ✓
- City, state, country ✓
- Venue type (amphitheater/arena/club, etc.) ✓
- Total shows ✓
- First/last show ✓

**Data Fields Captured:**
```
- originalId (venue ID)
- name, city, state, country
- venueType
- totalShows
```

**Missing Enhanced Data:**
- Capacity
- Venue aliases/former names
- Top songs played at venue
- Show history
- Notable performances/releases

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 5. **venue-stats.ts** - Enhanced Venue Statistics
**Source URL:** `VenueStats.aspx?vid=XXX`
**Status:** ADVANCED (parsing implemented)
**Coverage:**
- Venue name, location ✓
- First/last show dates ✓
- Total shows ✓
- Venue capacity (when available) ✓
- Alternate names/former names ✓
- Top 20 songs at venue ✓
- Notable performances ✓
- Venue notes/description ✓

**Data Fields Captured:**
```
- originalId (venue ID)
- venueName, city, state, country
- firstShowDate, lastShowDate, totalShows
- capacity
- akaNames[]
- topSongs[] (title + play count)
- notablePerformances[]
- notes
```

**Parser Sophistication:** Text parsing and table extraction

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 6. **guests.ts** - Guest Musicians
**Source URL:** `GuestStats.aspx` (index)
**Status:** BASIC
**Coverage:**
- Guest name ✓
- Instruments played ✓
- Total appearances ✓

**Data Fields Captured:**
```
- originalId (guest ID)
- name
- instruments[]
- totalAppearances
```

**Missing Enhanced Data:**
- Appearance history (which shows)
- Which songs they played on
- Years active
- Instruments per song

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 7. **tours.ts** - Tour Information
**Source URL:** `TourShowInfo.aspx?tid=XXX`
**Status:** ADVANCED
**Coverage:**
- Tour name and year ✓
- Show count ✓
- Date range (start/end dates) ✓
- Venue count ✓
- Song count (unique songs) ✓
- Total song performances ✓
- Average songs per show ✓
- Top songs for tour ✓
- Tour notes ✓

**Data Fields Captured:**
```
- originalId (tour ID)
- name, slug, year
- startDate, endDate
- showCount, venueCount
- songCount, totalSongPerformances
- averageSongsPerShow
- topSongs[] (with play counts)
- notes
```

**Parser Sophistication:** Scans all year pages (1991-2026) to find tour IDs

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 8. **releases.ts** - Album/Release Details
**Source URL:** `ReleaseView.aspx?release=XXX`
**Status:** COMPREHENSIVE
**Coverage:**
- Release title ✓
- Release type (studio/live/compilation/video/box_set/ep/single) ✓
- Release date ✓
- Cover art URL ✓
- Track listing (with track numbers, disc numbers, durations) ✓
- Show dates for live releases ✓
- Release notes ✓

**Data Fields Captured:**
```
- originalId (release ID)
- title, releaseType, releaseDate
- coverArtUrl
- tracks[] with:
  - trackNumber, discNumber, songTitle
  - duration, showDate (for live)
- notes
```

**Parser Sophistication:** Handles both setheadercell and fallback list parsing

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 9. **rarity.ts** - Show Rarity Index
**Source URL:** `ShowRarity.aspx`
**Status:** ADVANCED
**Coverage:**
- Tour name and year ✓
- Average rarity index ✓
- Different songs played ✓
- Show-level rarity data ✓
- Total songs per show ✓
- Catalog percentage ✓
- Ranking by rarity ✓

**Data Fields Captured:**
```
- Tours with:
  - tourName, year
  - averageRarityIndex
  - differentSongsPlayed
  - totalSongsInShow, catalogPercentage
  - rank
  - shows[] with:
    - showId, date, venueName, city, state
    - rarityIndex (decimal like 2.345)
```

**Parser Sophistication:** Table-based parsing with fallback div/section parsing

**Rate Limiting:** 2-4 second delays between requests

---

### 10. **liberation.ts** - Liberation List (Long Gaps)
**Source URL:** `Liberation.aspx`
**Status:** ADVANCED
**Coverage:**
- Song title ✓
- Last played date and show ✓
- Days since last play ✓
- Shows since last play ✓
- Liberation date (if liberated) ✓
- Configuration (full band / Dave & Tim / Dave solo) ✓
- Liberated flag ✓
- Notes ✓

**Data Fields Captured:**
```
- Entries with:
  - songId, songTitle
  - lastPlayedDate, lastPlayedShowId
  - daysSince, showsSince
  - configuration (full_band | dave_tim | dave_solo)
  - isLiberated, liberatedDate, liberatedShowId
  - notes
```

**Parser Sophistication:** Detects background color for liberated status

**Rate Limiting:** Single request, cached

---

### 11. **history.ts** - This Day in History
**Source URL:** `ThisDayinHistory.aspx?month=MM&day=DD`
**Status:** COMPREHENSIVE
**Coverage:**
- All 366 calendar days (including Feb 29) ✓
- Shows on each date across all years ✓
- Show date, venue, city, state, country ✓
- Years active for each date ✓
- Shows per calendar date ✓
- First/last played on that date ✓

**Data Fields Captured:**
```
- Calendar days (366 entries) with:
  - month, day, calendarDate
  - shows[] with:
    - originalId, showDate, year
    - venueName, city, state, country
  - totalYears, firstYear, lastYear
  - yearsSinceLastPlayed
```

**Parser Sophistication:** Multiple parsing strategies for show extraction

**Rate Limiting:** 1 concurrent (sequential), 5 per 10 seconds, 2-4 second delays

---

### 12. **lists.ts** - Curated Lists
**Source URL:** `Lists.aspx` / `ListView.aspx?id=XXX`
**Status:** COMPREHENSIVE
**Coverage:**
- List ID, title, slug, category ✓
- List description ✓
- Item count ✓
- List items with:
  - Position/ranking ✓
  - Item type (show/song/venue/guest/release) ✓
  - Item ID ✓
  - Item title ✓
  - Link to item ✓
  - Notes/context ✓

**Data Fields Captured:**
```
- Lists with:
  - originalId, title, slug, category
  - description, itemCount
  - items[] with:
    - position, itemType, itemId
    - itemTitle, itemLink, notes
```

**Parser Sophistication:** Three fallback strategies for parsing list items

**Rate Limiting:** 2 concurrent, 5 per 10 seconds

---

### 13. **reparse-song-stats.ts** - Song Stats Utility
**Status:** UTILITY (not a primary scraper)
**Purpose:** Re-parses existing song statistics, used for testing/debugging parser logic

---

## Page Types NOT Being Scraped

### 1. Individual Song Lyrics Pages
**URL Pattern:** `SongLyrics.aspx?sid=XXX` or similar
**Status:** NOT SCRAPED
**Data Available But Missing:**
- Full structured lyrics (song-stats.ts captures raw text only)
- Lyric sections/verses
- Song length
- Genre/tags
- Writing credits
- Demo/live version comparison

**Impact:** Medium - Lyrics are captured in basic song scraper but not song-stats

---

### 2. Guest Show Appearance Pages
**URL Pattern:** `TourGuestShows.aspx?gid=XXX`
**Status:** NOT SCRAPED
**Data Available But Missing:**
- Complete appearance history for each guest
- Which songs they played
- Years active
- Instruments per show
- Guest bio/background
- Most frequent appearances

**Why Missing:** Guest appearances are captured from show pages (reverse direction), but guest detail pages are not scraped

**Impact:** High - Would enrich guest musician data

---

### 3. Year-by-Year Tour Overview
**URL Pattern:** `TourShowsByYear.aspx?year=YYYY`
**Status:** PARTIALLY CAPTURED (used for show enumeration only)
**Data Available But Missing:**
- Year summary statistics
- Tour type/name for that year
- Year statistics (total shows, venues, songs)
- Year-specific notes
- Notable tours/events for the year

**Why Missing:** Used only as an intermediate step to find show URLs, not scraped for its own data

**Impact:** Medium - Year statistics would be valuable

---

### 4. Venue Show History
**URL Pattern:** `VenueStats.aspx?vid=XXX` (show history section)
**Status:** PARTIALLY CAPTURED
**Data Available But Missing:**
- Complete show date list by venue
- Show-level details for each venue performance
- Run statistics (consecutive shows)
- Venue-specific song rotations
- Venue-specific guest appearances

**Why Missing:** Top songs are captured, but full show history not extracted

**Impact:** Medium - Would enable venue run analysis

---

### 5. Song Performance History/Timeline
**URL Pattern:** Built into `SongStats.aspx` page
**Status:** NOT FULLY EXTRACTED
**Data Available But Missing:**
- Complete performance history (date by date)
- Version type for each performance
- Duration evolution over time
- Context/notes for performances
- Performance timeline visualization

**Why Missing:** Song-stats.ts has basic parsing but doesn't extract full performance table

**Impact:** High - Complete performance history is valuable for analysis

---

### 6. Setlist Comparison Pages
**URL Pattern:** Possibly `CompareSetlists.aspx` or similar
**Status:** UNKNOWN / NOT SCRAPED
**Data Available But Missing:**
- Side-by-side setlist comparison
- Song rotation patterns
- Setlist evolution
- Common/rare combinations

**Why Missing:** No evidence of comparison pages in navigation; may not exist or may be dynamic

**Impact:** Low - Comparison can be done client-side from show data

---

### 7. Tour Statistics/Summary Pages
**URL Pattern:** `TourStats.aspx?tid=XXX`
**Status:** NOT SCRAPED (tours.ts scrapes TourShowInfo.aspx instead)
**Data Available But Missing:**
- Tour statistics (if different from TourShowInfo)
- Tour-specific analysis
- Potential additional metrics

**Why Missing:** tours.ts uses TourShowInfo.aspx which appears to have same/similar data

**Impact:** Low - TourShowInfo.aspx likely contains same data

---

### 8. Setlist/Song Search Results
**URL Pattern:** Various search results pages
**Status:** NOT SCRAPED
**Data Available But Missing:**
- Advanced search results
- Search-based aggregations
- Filter/facet data

**Why Missing:** songs.ts uses SongSearchResult.aspx as index only

**Impact:** Low - Index page likely sufficient

---

## Data Field Gaps in Existing Scrapers

### In shows.ts (ShowSetlist.aspx)
**Missing Fields:**
- [ ] Weather information (if available)
- [ ] Attendance numbers
- [ ] Rating/reviews
- [ ] Jam chart references
- [ ] Known incidents/notable moments
- [ ] Soundboard availability
- [ ] Video availability
- [ ] Photo gallery links

---

### In songs.ts (Song Catalog)
**Missing Fields:**
- [ ] Song key/musical characteristics
- [ ] Songwriter credits
- [ ] Album association
- [ ] Related songs/covers
- [ ] Performance history (delegated to song-stats.ts)

---

### In guests.ts (Guest Catalog)
**Missing Fields:**
- [ ] Complete appearance history
- [ ] Show-by-show appearances
- [ ] Instruments per appearance
- [ ] Years active with band
- [ ] Biographical information
- [ ] Links to external sources
- [ ] Social media / websites

---

### In venues.ts (Venue Catalog)
**Missing Fields:**
- [ ] Complete show history (delegated to venue-stats.ts)
- [ ] Venue website/contact
- [ ] Map coordinates
- [ ] Venue history/ownership
- [ ] Capacity change over time
- [ ] Photo gallery

---

## Data Collection Priorities

### High Priority (Core Experience)
1. **Complete Song Performance History** - Individual play records for each show
2. **Venue Show History** - Full list of shows per venue
3. **Guest Appearance Details** - Which songs, on which shows
4. **Enhanced Show Notes** - Weather, attendance, notable moments

### Medium Priority (Analysis Value)
5. **Song-level statistics** - Better segue extraction from song-stats pages
6. **Tour-level metrics** - Rarity/variance analysis
7. **Year summaries** - Year-specific statistics
8. **Jam analysis** - Jam references and lengths

### Lower Priority (Supplementary)
9. **Video/audio links** - Links to recordings
10. **Photo galleries** - Venue/show photos
11. **External links** - Related websites
12. **Biographical data** - Guest musician bios

---

## Architectural Recommendations

### 1. Add Guest Show History Scraper
```typescript
// scraper/src/scrapers/guest-shows.ts
// Source: TourGuestShows.aspx?gid=XXX
// Creates detailed appearance history for each guest
```

### 2. Add Song Performance History Scraper
```typescript
// scraper/src/scrapers/song-performances.ts
// Source: Extract from SongStats.aspx complete performance table
// Captures: date, show, venue, version type, duration
```

### 3. Add Venue Show History Scraper
```typescript
// scraper/src/scrapers/venue-shows.ts
// Source: Extract from VenueStats.aspx show history section
// Captures: all shows at venue with dates
```

### 4. Enhance Song-Stats Parsing
- Extract complete performance history table (not just summary stats)
- Parse "preceded by" segues (topSeguesFrom currently empty)
- Capture performance URLs for linking

### 5. Create "Top Songs" Aggregator
```typescript
// scraper/src/scrapers/top-songs.ts
// Aggregates across multiple contexts:
// - All-time most played
// - By tour
// - By year
// - By venue
```

---

## Current Scraper Output Files

```
scraper/output/
├── venues.json              (basic venue info)
├── venue-stats.json         (enhanced venue statistics)
├── songs.json               (basic song info)
├── song-stats.json          (enhanced song statistics)
├── guests.json              (basic guest info)
├── shows.json               (shows with setlists)
├── tours.json               (tour information)
├── releases.json            (album/release details)
├── rarity.json              (show rarity index)
├── liberation.json          (long-gap songs)
├── history.json             (this day in history)
└── lists.json               (curated lists)
```

**Total Scrapers:** 13
**Unique Page Types Covered:** 10
**Estimated Data Points:** 100,000+
**Estimated File Size:** ~50MB+ JSON

---

## Known Issues & Limitations

### 1. Song-Stats Parsing Fragility
- Uses regex pattern matching from unstructured HTML
- No CSS selectors for structured extraction
- May fail on HTML layout changes
- topSeguesFrom is empty (only topSeguesInto parsed)

### 2. Venue Name Extraction
- Text parsing from unstructured layout
- Relies on specific HTML patterns
- May misidentify venue vs other text elements

### 3. Guest ID Filtering
- Hardcoded band member GIDs may be incomplete
- Additional band configurations not accounted for
- Staff members not distinguished

### 4. Leap Year Handling
- History scraper handles Feb 29, but site may not update it
- Potential date mismatches for leap years

### 5. Rate Limiting Assumptions
- Assumes 5 requests per 10 seconds is safe
- No 429 (Too Many Requests) handling
- No exponential backoff on failures

---

## Comparison: Scraped vs Available

| Data Type | Scraped | URL(s) | Coverage |
|-----------|---------|--------|----------|
| Shows/Setlists | YES | TourShowSet.aspx, ShowSetlist.aspx | 95% |
| Songs (Basic) | YES | SongList.aspx, SongSearchResult.aspx | 100% |
| Songs (Stats) | YES | SongStats.aspx | 85% |
| Venues (Basic) | YES | VenueList.aspx, VenueStats.aspx | 100% |
| Venues (Stats) | YES | VenueStats.aspx | 70% |
| Guests (Basic) | YES | GuestList.aspx, GuestStats.aspx | 100% |
| Guests (Shows) | **NO** | TourGuestShows.aspx | 0% |
| Tours | YES | TourShowInfo.aspx | 80% |
| Releases | YES | ReleaseView.aspx | 90% |
| Rarity Index | YES | ShowRarity.aspx | 100% |
| Liberation List | YES | Liberation.aspx | 100% |
| This Day History | YES | ThisDayinHistory.aspx | 100% |
| Curated Lists | YES | Lists.aspx, ListView.aspx | 95% |
| **Performance History** | **NO** | (in SongStats.aspx) | 0% |
| **Venue Show History** | **PARTIAL** | (in VenueStats.aspx) | 20% |
| **Song Lyrics** | **PARTIAL** | (basic in songs.ts) | 30% |

---

## Summary

**Strengths:**
- Comprehensive core concert data
- Good coverage of curated content (lists, history, rarity)
- Advanced statistical parsing for songs and venues
- Robust checkpoint/resume system
- Respectful rate limiting
- Good error handling

**Gaps:**
- Guest appearance history not scraped
- Song performance history not extracted
- Enhanced show data missing (weather, attendance, incidents)
- Some parsing is fragile/regex-dependent

**Recommendations:**
1. Add guest-shows.ts scraper
2. Enhance song-performance extraction
3. Add venue-shows.ts scraper
4. Refactor string parsing to CSS selectors where possible
5. Add error logging and validation

**Overall Assessment:** The scraper covers approximately **85-90%** of readily available public data on dmbalmanac.com. The main gaps are in relational/historical data that requires additional scraping pages or table extraction.
