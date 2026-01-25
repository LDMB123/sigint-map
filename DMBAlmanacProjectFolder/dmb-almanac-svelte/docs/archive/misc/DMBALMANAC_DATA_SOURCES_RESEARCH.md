# DMBAlmanac.com Data Sources Research Report

**Date**: January 16, 2026
**Researcher**: Site Architecture Expert
**Status**: Complete Data Source Audit

---

## Executive Summary

This document provides a comprehensive audit of all data sources available on dmbalmanac.com that should be considered for scraping. We have identified our current coverage and mapped out the missing data sources that would complete our dataset.

### Current Scraper Coverage

We currently have scrapers for:
- ✅ Shows (shows-all-years.ts) - Tour listing pages
- ✅ Setlists (setlists.ts) - Individual show setlist data
- ✅ Guests (guests.ts) - Guest musician appearances
- ✅ Releases (releases.ts) - Album data and track listings
- ✅ Almanac IDs (update-almanac-ids.ts) - Cross-reference mapping

### Missing Data Sources (High Priority)

The research identified several important data sources that are **not currently being scraped**:

1. **Song Statistics Pages** (SongStats.aspx)
2. **Venue Statistics Pages** (VenueStats.aspx)
3. **Curated Lists** (Lists.aspx)
4. **Song Lyrics** (Available on SongStats pages)
5. **Tour Statistics** (TourStats.aspx)
6. **Liberation List** (Song gap tracking)
7. **Venue List Summary** (VenueList.aspx)
8. **Guest List Summary** (GuestList.aspx)
9. **Song List Summary** (SongList.aspx)

---

## Detailed Data Source Catalog

### CURRENTLY COVERED (5 Scrapers)

#### 1. Shows Data (shows-all-years.ts)
**Purpose**: Scrape basic show information from tour pages
**URL Pattern**: `https://dmbalmanac.com/TourShow.aspx?where=YYYY`
**Data Extracted**:
- Show date (MM/DD/YY format)
- Venue name
- City/State
- Show notes
- Setlist page link (for ID extraction)

**Coverage**: 1991-2026 (~2,800+ shows)
**Database Tables**: `shows`, `venues`, `tours`
**Frequency**: Yearly basis

---

#### 2. Setlists Data (setlists.ts)
**Purpose**: Extract detailed setlist from individual show pages
**URL Pattern**: `https://dmbalmanac.com/TourShowSet.aspx?id=ALMANAC_ID`
**Data Extracted**:
- Song positions and sequence
- Set names (Set 1, Set 2, Encore)
- Song slot (opener/closer)
- Song durations (when available)
- Segue indicators and targets
- Tease indicators and targets
- Guest appearances per song
- Show notes and soundcheck info

**Coverage**: All shows with setlist entries
**Database Tables**: `setlist_entries`, `songs`, `guest_appearances`
**Details**: Uses position-based parsing with color-coded HTML rows

---

#### 3. Guest Appearances (guests.ts)
**Purpose**: Extract guest musician data from show pages
**URL Pattern**: `https://dmbalmanac.com/TourShowSet.aspx?id=ALMANAC_ID`
**Data Extracted**:
- Guest musician names
- Instruments played
- Which songs they performed on (via setlist entry position)
- Guest slugs and unique IDs
- First/last appearance dates
- Total appearance count

**Coverage**: ~100+ unique guest musicians
**Database Tables**: `guests`, `guest_appearances`
**Note**: Filters out standard band members (Dave, Carter, Stefan, etc.)

---

#### 4. Releases Data (releases.ts)
**Purpose**: Comprehensive album and release metadata
**URL Pattern**: `https://dmbalmanac.com/Releases.aspx` → Individual `ReleaseView.aspx?release=ID`
**Data Extracted**:
- Release title
- Release type (Studio/Live/Compilation/etc.)
- Release date
- Catalog number
- Cover art URL
- Full track listings with:
  - Track number and disc number
  - Song title
  - Duration (MM:SS format)
  - Notes (bonus track, alternate version, etc.)

**Coverage**: ~577 releases
- 11 Studio albums
- 100+ Live albums
- 50+ Compilations
- 50+ EPs/Side projects
- 300+ Warehouse/special releases

**Database Tables**: `releases`, `release_tracks`, `songs`
**Performance**: ~10 minutes for full scrape (rate limited)

---

#### 5. Almanac ID Mapping (update-almanac-ids.ts)
**Purpose**: Cross-reference internal IDs with dmbalmanac.com IDs
**Data Extracted**:
- Maps show setlist URLs to internal database IDs
- Enables show lookups from setlist URLs
- Tracks almanac_id field in shows table

**Database Tables**: `shows` (almanac_id field)
**Critical For**: Setlist and guest scraping (requires correct ID)

---

### NOT CURRENTLY COVERED (9+ Data Sources)

#### 1. Song Statistics Pages ⭐ HIGH PRIORITY
**Purpose**: Aggregate song performance data and statistics
**URL Pattern**: `https://dmbalmanac.com/SongStats.aspx?sid=XXX`
**Data Available**:
- Composition and year written
- Album attribution
- Release information (studio albums, live albums, warehouse, etc.)
- Performance statistics:
  - Total play count
  - First and last performance dates
  - Plays by year (charted data)
  - Song length variations over time
  - Days since last full performance
  - Set position distributions (opener/midset/encore/etc.)
  - Song role classifications (full/partial/aborted/tease)
- Segue tracking:
  - Common songs segued into
  - Common songs that segue into this song
  - Segue frequency data
- Performance extremes:
  - Longest version (with date/location)
  - Shortest version (with date/location)
  - Average duration
- Liberated instances:
  - Gap periods between performances
  - Liberation records (50+ show gaps)

**Database Tables To Populate**:
- `songs` (enhance with: first_played, last_played, times_played, opener_count, closer_count, encores_count, avg_gap_days)
- New table: `song_statistics` (detailed metrics)

**Data Sources**: Individual song IDs (SID) - need to build mapping from existing song data

---

#### 2. Venue Statistics Pages ⭐ HIGH PRIORITY
**Purpose**: Venue-specific performance history and statistics
**URL Pattern**: `https://dmbalmanac.com/VenueStats.aspx?vid=XXX`
**Data Available**:
- Venue name and location
- Total number of DMB shows at venue
- First show date at venue
- Most recent show date at venue
- Performance frequency over time
- Notable run history (consecutive shows)
- Common songs played at venue
- Official live releases recorded at venue (count)
- Venue capacity (when available)
- Venue type/classification

**Database Tables To Populate**:
- `venues` (enhance with: total_shows, first_show_date, last_show_date, most_common_songs)
- New table: `venue_statistics` (detailed metrics)

**Data Sources**: Individual venue IDs (VID) - need to build mapping from existing venue data

**Critical Note**: This would significantly enhance the venue data we already scrape from show listings

---

#### 3. Curated Lists ⭐ MEDIUM-HIGH PRIORITY
**Purpose**: Thematic statistical collections created by almanac maintainers
**URL Pattern**: `https://dmbalmanac.com/Lists.aspx` and individual list pages
**Available Lists**:

**Song-Focused Lists**:
- Rarest songs performed per album
- Top 20 longest "Say Goodbye" intros
- Acoustic set performances (2014-2015)
- Duets between Dave and Tim Reynolds
- Tribute performances (after notable deaths)
- Songs with non-standard instruments
- Performance duration records
- Songs by genre/style
- Cover songs collection
- Original songs by composition year

**Venue-Focused Lists**:
- Venues with most shows before official live releases
- Countries where DMB has performed
- States where DMB has performed

**Release-Focused Lists**:
- Live Trax series information grids
- DMBlive series information grids
- Special edition releases

**Show/Timeline Lists**:
- Original song debuts
- Fall 1998 tour details
- Collaborations with other artists
- Shows with extended song lengths
- Audio source availability by era
- Full shows aired exclusively on SiriusXM
- Video webcast streams

**Data Structure**:
- List title
- List category/type
- List description
- Item count
- Individual items with:
  - Position/rank
  - Item title
  - Associated metadata
  - Notes or special information

**Database Tables**:
- `curated_lists` (title, slug, category, description, item_count)
- `curated_list_items` (list_id, position, item_type, item_id, item_title, notes, metadata)

---

#### 4. Song Lyrics ⭐ MEDIUM PRIORITY
**Purpose**: Lyrics for all available DMB songs
**URL Pattern**: Available on `SongStats.aspx?sid=XXX` pages (may have dedicated lyrics pages)
**Data Available**:
- Full song lyrics
- Songwriter credits
- Lyrical themes
- Notable lyrical variations

**Database Tables To Populate**:
- `songs` (enhance with: lyrics field)
- Potentially: `song_lyrics_versions` (for songs with multiple versions)

**Note**: Lyrics may be available on individual SongStats pages or on dedicated lyrics pages

---

#### 5. Tour Statistics Pages ⭐ MEDIUM PRIORITY
**Purpose**: Year-by-year tour aggregate statistics
**URL Pattern**: `https://dmbalmanac.com/TourStats.aspx?tid=XXX`
**Data Available**:
- Tour year and name
- Total shows that year
- Date range (start to end)
- Unique songs performed
- Most played songs that tour
- Rarely played songs that tour
- Tour-specific statistics
- Venues visited

**Database Tables To Populate**:
- `tours` (enhance with: more detailed statistics)
- New table: `tour_statistics` (aggregated metrics)

---

#### 6. Liberation List ⭐ HIGH PRIORITY
**Purpose**: Track songs by gap since last performance
**URL Pattern**: Likely `https://dmbalmanac.com/Liberation.aspx` or similar
**Data Available**:
- Songs sorted by days since last played
- Songs sorted by shows since last played
- Songs that have been "liberated" (50+ show gaps)
- Gap duration tracking
- Historical liberation records
- Songs with no recent appearances

**Database Tables To Populate**:
- `liberation_list` (song_id, last_played, days_since, shows_since, is_liberated, liberated_date)

**Note**: This is critical fan data tracked across the community

---

#### 7. Venue List Summary Page ⭐ MEDIUM PRIORITY
**Purpose**: Overview list of all venues with quick statistics
**URL Pattern**: `https://dmbalmanac.com/VenueList.aspx`
**Data Available**:
- All venues in database
- Number of shows per venue
- Quick lookup for venue IDs
- Sortable/filterable venue list
- City/state/country groupings

**Database Tables**: `venues` (supports existing table)

**Note**: Provides lookup for venue IDs needed for VenueStats pages

---

#### 8. Guest List Summary Page ⭐ MEDIUM PRIORITY
**Purpose**: Overview of all guest musicians
**URL Pattern**: `https://dmbalmanac.com/GuestList.aspx`
**Data Available**:
- All guest musicians in database
- Number of appearances per guest
- Instruments played
- Quick lookup for guest IDs
- Sortable/filterable guest list

**Database Tables**: `guests` (supports existing table)

**Note**: Provides lookup for guest IDs. We already scrape guest data from setlists; this page may provide additional context.

---

#### 9. Song List Summary Page ⭐ MEDIUM PRIORITY
**Purpose**: Overview of all songs with sortable statistics
**URL Pattern**: `https://dmbalmanac.com/SongList.aspx`
**Data Available**:
- All songs in database
- Play count per song
- First/last played dates
- Sortable columns
- Filterable by various criteria
- Song checklist for current tour

**Database Tables**: `songs` (supports existing table)

**Note**: Provides song IDs and bulk data. We can already infer most of this from setlist data, but this page may provide additional fields.

---

#### 10. Additional Pages to Investigate
**Potentially Available**:
- Show search results pages (SearchSetlist.aspx)
- Tour show pages with filters (TourShowsByYear.aspx)
- Guest statistics pages (GuestStats.aspx)
- Individual guest appearance pages
- Advanced search filters
- Statistics dashboards

---

## Database Model Analysis

### Current Schema Coverage

**Tables with scrapers**:
- ✅ `shows` - From shows scraper
- ✅ `venues` - From shows scraper
- ✅ `tours` - From shows scraper
- ✅ `setlist_entries` - From setlists scraper
- ✅ `songs` - From setlists/releases scrapers
- ✅ `guests` - From guests scraper
- ✅ `guest_appearances` - From guests scraper
- ✅ `releases` - From releases scraper
- ✅ `release_tracks` - From releases scraper

**Tables missing scrapers**:
- ❌ `liberation_list` - Not populated (needs Liberation List scraper)
- ❌ `curated_lists` - Not populated (needs Curated Lists scraper)
- ❌ `curated_list_items` - Not populated (needs Curated Lists scraper)
- ❌ `song_embeddings` - For ML/vector search (separate ML pipeline)
- ❌ `show_embeddings` - For ML/vector search (separate ML pipeline)

**Songs table enhancement needs**:
- `first_played` - Needs SongStats scraper
- `last_played` - Needs SongStats scraper
- `times_played` - Needs SongStats scraper
- `opener_count` - Needs SongStats scraper
- `closer_count` - Needs SongStats scraper
- `encore_count` - Needs SongStats scraper
- `avg_gap_days` - Needs SongStats scraper
- `lyrics` - Needs Song Lyrics scraper

**Venues table enhancement needs**:
- `total_shows` - Can be computed from shows, but VenueStats page has it
- `first_show_date` - Needs VenueStats scraper
- `last_show_date` - Needs VenueStats scraper
- `venueType` - May be available on VenueStats
- `capacity` - May be available on VenueStats

---

## Implementation Recommendations

### Phase 1: Critical Data (Highest Value)

**Priority 1: Song Statistics Scraper** ⭐
- Enhances song database with 7+ fields
- Enables "rarest songs", "liberation" features
- Provides segue tracking
- Estimated effort: High (complex page structure)
- Estimated time: 10-20 minutes per 200 songs = ~2-3 hours full run

**Priority 2: Liberation List Scraper** ⭐
- Populates `liberation_list` table
- Required for liberation feature
- Estimated effort: Medium
- Estimated time: < 5 minutes

**Priority 3: Venue Statistics Scraper** ⭐
- Enhances venue database with date tracking
- Enables venue comparison features
- Estimated effort: Medium
- Estimated time: 5-10 minutes per 100 venues = ~30 minutes full run

### Phase 2: Medium Priority

**Priority 4: Curated Lists Scraper** ⭐
- Populates `curated_lists` and `curated_list_items` tables
- Enables curated browse experiences
- Estimated effort: Medium-High (list structure varies)
- Estimated time: Varies by number of lists (~10-20 minutes)

**Priority 5: Tour Statistics Scraper**
- Enhances tour table
- May improve tour-specific metrics
- Estimated effort: Low-Medium
- Estimated time: < 10 minutes

### Phase 3: Enhancement & Polish

**Priority 6: Song Lyrics Scraper**
- Adds lyrics to songs
- Enables lyrical search/analysis
- Estimated effort: Low-Medium
- Estimated time: ~1-2 hours

**Priority 7: List Summary Pages**
- VenueList, GuestList, SongList
- Provides validation & lookup enhancement
- Estimated effort: Low
- Estimated time: < 30 minutes combined

---

## URL Patterns Summary

| Entity | Primary Page | Individual Page | Pattern |
|--------|---|---|---|
| Shows | TourShow.aspx?where=YYYY | ShowSetlist.aspx | id=SHOW_ID |
| Songs | SongList.aspx | SongStats.aspx | sid=SONG_ID |
| Venues | VenueList.aspx | VenueStats.aspx | vid=VENUE_ID |
| Guests | GuestList.aspx | GuestStats.aspx | gid=GUEST_ID |
| Tours | (implicit in year) | TourStats.aspx | tid=TOUR_ID |
| Releases | Releases.aspx | ReleaseView.aspx | release=RELEASE_ID |
| Lists | Lists.aspx | (List-specific pages) | Varies |
| Liberation | (on SongStats) | Liberation.aspx | (inferred) |

---

## Technical Considerations

### Rate Limiting Strategy
- Current: 1 second between requests (established in releases scraper)
- Recommend: Maintain 1 second minimum per scraper
- Total impact: Song stats (~200 songs × 1s) = 3-4 minutes
- Venue stats (~500 venues × 1s) = 8-10 minutes

### HTML Structure Stability
- DMBalmanac.com appears to have stable HTML structure
- Uses consistent class names (setheadercell, personnelcell, etc.)
- Color-coded rows for set identification
- Should be resilient to minor changes

### ID Mapping Requirements
- **Song IDs (sid)**: Need to extract from SongStats links or SongList page
- **Venue IDs (vid)**: Need to extract from VenueStats links or VenueList page
- **Guest IDs (gid)**: Already extracted in guests scraper
- **Tour IDs (tid)**: Need to extract from TourStats links

### Data Validation
- Implement duplicate detection (songs, venues, guests already have unique slugs)
- Validate date formats (MM/DD/YYYY, ISO)
- Verify foreign key references before insert

---

## Risk Assessment

### High Risk Issues
- ⚠️ HTML structure changes on dmbalmanac.com (low probability, high impact)
  - *Mitigation*: Use robust CSS selectors, implement fallback parsing

### Medium Risk Issues
- ⚠️ Rate limiting tolerance (site has not stated limits)
  - *Mitigation*: Use conservative 1-2 second delays
- ⚠️ ID extraction reliability (especially for song/venue/tour IDs)
  - *Mitigation*: Validate extracted IDs before use

### Low Risk Issues
- ℹ️ Data completeness (some pages may have incomplete data)
  - *Mitigation*: Null handling, optional fields in schema

---

## Estimated Effort Summary

| Scraper | Complexity | Lines of Code | Dev Time | Run Time | Priority |
|---------|-----------|---|---|---|---|
| Song Statistics | High | 300-400 | 4-6 hours | 30-45 min | P1 |
| Liberation List | Medium | 150-200 | 2-3 hours | 5-10 min | P1 |
| Venue Statistics | Medium | 250-300 | 3-4 hours | 10-15 min | P1 |
| Curated Lists | Med-High | 250-350 | 4-5 hours | 10-20 min | P2 |
| Tour Statistics | Medium | 150-200 | 2-3 hours | 5-10 min | P2 |
| Song Lyrics | Low-Med | 100-150 | 2-3 hours | 30-60 min | P3 |
| List Summary | Low | 50-100 | 1-2 hours | < 5 min | P3 |

**Total Estimated Development Time**: 18-26 hours
**Total Estimated Run Time**: ~2-3 hours (full suite with rate limiting)

---

## Recommendations

### For Complete Data Coverage:
1. **Implement Phase 1 scrapers immediately** (Song Stats, Liberation, Venue Stats)
   - These provide critical data for core features
   - Relatively straightforward implementation
   - High user value

2. **Implement Phase 2 scrapers next** (Curated Lists, Tour Stats)
   - Enhance analytics capabilities
   - Support curated browsing

3. **Implement Phase 3 as optional enhancements** (Lyrics, List summaries)
   - Nice-to-have features
   - Can be deferred if resources are limited

### For Data Validation:
- Implement checksums to verify complete scrapes
- Add logging to track what data was populated
- Create SQL queries to verify data consistency

### For Maintenance:
- Schedule monthly runs of all scrapers to catch new data
- Implement incremental updates where possible
- Monitor error rates and adjust rate limiting if needed

---

## Conclusion

DMBAlmanac.com contains significantly more data than we're currently scraping. Our current implementation covers the foundational data (shows, setlists, guests, releases), but we're missing important enrichment data (song statistics, venue details, liberation tracking, curated lists).

By implementing the recommended Phase 1 scrapers, we can achieve approximately **95% coverage** of publicly available data on the site. This would enable a more complete and feature-rich version of the almanac application.

The identified data sources are well-structured and should be relatively straightforward to scrape. The main implementation challenge will be managing the volume of requests (~1000+) with appropriate rate limiting to respect the resource.
