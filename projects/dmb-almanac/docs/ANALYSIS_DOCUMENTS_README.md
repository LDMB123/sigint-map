# TourGuestShows.aspx Analysis - Document Index

This directory contains a comprehensive analysis of the TourGuestShows.aspx page and the current scraper implementation in the DMB Almanac project.

## Document Files

### 1. TourGuestShows_Executive_Summary.md
**Location:** `/Users/louisherman/ClaudeCodeProjects/TourGuestShows_Executive_Summary.md`
**Length:** ~400 lines
**Audience:** Project managers, stakeholders, team leads

**Contains:**
- Executive summary of findings
- Current vs. missing data comparison
- Impact analysis
- Numbers and scope
- Risk assessment
- Recommendation
- Timeline estimate (10-20 hours)
- Success criteria

**Start here if:** You want a high-level overview

---

### 2. TourGuestShows_Analysis.md
**Location:** `/Users/louisherman/ClaudeCodeProjects/TourGuestShows_Analysis.md`
**Length:** ~700 lines
**Audience:** Developers, database architects, technical leads

**Contains:**
- Detailed technical analysis
- What IS being scraped (current state)
- What is NOT being scraped (gaps)
- Data model relationships
- Database schema review
- Page structure documentation
- Current vs. missing data tables
- Cached HTML status
- Database integration needs
- Output data samples
- Code references and file locations
- Statistics on data completeness

**Start here if:** You need technical deep dive

---

### 3. Guest_Shows_Scraper_Spec.md
**Location:** `/Users/louisherman/ClaudeCodeProjects/Guest_Shows_Scraper_Spec.md`
**Length:** ~600 lines
**Audience:** Developers implementing the solution

**Contains:**
- Page structure analysis with HTML examples
- Complete type definitions (for types.ts)
- Data structure examples
- Implementation code samples (Step 1-5)
- Helper functions
- Error handling strategies
- Integration with existing pipeline
- Testing strategy with examples
- Performance considerations
- Deployment checklist
- Sample output validation
- References

**Start here if:** You need to implement guest-shows.ts

---

## Related Files in Codebase

### Existing Implementation

**Shows Scraper (PARTIAL guest extraction):**
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/src/scrapers/shows.ts`
  - Lines 20-29: BAND_MEMBER_GIDS filter
  - Lines 220-230: Extract guest links from show setlist
  - Lines 298-315: Parse page-level guest appearances

**Guests Scraper (GuestStats.aspx, not TourGuestShows):**
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/src/scrapers/guests.ts`
  - Scrapes GuestStats.aspx (WRONG page)
  - Should be supplemented with TourGuestShows.aspx scraper

**Type Definitions (INCOMPLETE):**
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/src/types.ts`
  - Lines 34-38: ScrapedGuestAppearance (missing fields)
  - Lines 178-183: ScrapedGuest (basic only)

**Database Schema:**
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/db/schema.sql`
  - Lines 118-149: guest_appearances table (supports per-song data but not populated)

**Output Data (Current):**
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/output/guest-details.json`
  - 1,353 guests with incomplete data
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/output/shows.json`
  - Guest appearances linked but no dates/venues

**Cache Directory:**
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/scraper/cache/`
  - 6,427 cached HTML files (but NO TourGuestShows pages)

---

## Key File Locations

### To Create (NEW)
```
/src/scrapers/guest-shows.ts                          (IMPLEMENT THIS)
```

### To Modify
```
/src/types.ts                                         (Add new types)
/src/index.ts                                         (Add to pipeline)
/package.json                                         (Add npm script)
/src/lib/db/schema.sql                               (Optional: add views)
```

### Reference Files (Don't modify, just reference)
```
/src/scrapers/shows.ts                               (Similar pattern)
/src/scrapers/guests.ts                              (Similar pattern)
/src/utils/helpers.ts                                (Use helpers)
/src/utils/cache.ts                                  (Use caching)
/src/utils/rate-limit.ts                             (Use PQueue)
```

---

## Analysis Methodology

This analysis was conducted by:

1. **Examining current scraper code** (shows.ts, guests.ts)
2. **Reviewing type definitions** (types.ts)
3. **Inspecting database schema** (schema.sql)
4. **Checking cached HTML** (6,427 files in cache/)
5. **Analyzing output data** (guest-details.json, shows.json)
6. **Identifying gaps** (TourGuestShows.aspx not scraped)
7. **Understanding site architecture** (DMBAlmanac.com patterns)
8. **Documenting current state** vs. potential data

**Confidence Level:** HIGH
- Based on actual codebase inspection
- Verified against existing scraper patterns
- Cross-referenced with schema and output files

---

## Data Gaps Identified

| Data Type | Show-Based | Guest-Based | Current |
|-----------|-----------|------------|---------|
| Guest name | ✓ | ✓ | ✓ 95% |
| General instruments | ✓ | ✓ | ✓ 70% |
| **Appearance dates** | ✗ | **✓** | **✗ 0%** |
| **Appearance venues** | ✗ | **✓** | **✗ 0%** |
| **Per-song instruments** | ✗ | **✓** | **✗ 0%** |
| First appearance | ✗ | **✓** | **✗ 0%** |
| Last appearance | ✗ | **✓** | **✗ 0%** |
| Collaboration history | ✗ | **✓** | **✗ 0%** |

**Key Finding:** Guest pages (TourGuestShows.aspx) contain data NOT available on show pages.

---

## Implementation Checklist

From Guest_Shows_Scraper_Spec.md Deployment Checklist:

```
[ ] Create `/src/scrapers/guest-shows.ts`
[ ] Update `/src/types.ts` with new types
[ ] Update `/src/utils/helpers.ts` with helper functions
[ ] Add to `/src/index.ts` pipeline
[ ] Update `/package.json` scripts
[ ] Create test samples in cache directory
[ ] Run against sample guests (IDs: 42, 100, 1000)
[ ] Validate output JSON structure
[ ] Test rate limiting (no 429 errors)
[ ] Document any discovered HTML structure variations
```

---

## Quick Reference

### Current Scraper Coverage
- Shows: 2,800+ (✓ COMPLETE)
- Songs: 200+ (✓ COMPLETE)
- Venues: 500+ (✓ COMPLETE)
- Guests: 1,353 (✓ PARTIAL - missing appearance history)
- Guest-Show links: (✗ NOT COMPLETE)

### To Extract
- 1,353 TourGuestShows.aspx pages
- ~100,000-200,000 appearance records
- ~50,000-100,000 per-song instrument links

### Effort
- Development: 4-6 hours
- Testing: 1-2 hours
- Scraping: ~45-60 minutes
- Import: ~5-10 minutes
- **Total: 10-20 hours**

### Impact
- Enables guest tour history queries
- Adds per-song instrument tracking
- Creates guest collaboration mapping
- Improves data completeness from ~40% to ~95% for guests

---

## Version Information

**Analysis Date:** 2026-01-23
**Repository:** DMB Almanac Svelte
**Codebase Version:** Current (Jan 2026)
**Scraper Cache:** 6,427 HTML files
**Guest Database:** 1,353 unique guests

**Analyst:** Claude Code Agent (Haiku 4.5)

---

## How to Use These Documents

### If implementing:
1. Start with **Guest_Shows_Scraper_Spec.md** (code examples)
2. Reference **TourGuestShows_Analysis.md** (data context)
3. Check **TourGuestShows_Executive_Summary.md** (timeline/priorities)

### If reviewing:
1. Start with **TourGuestShows_Executive_Summary.md** (overview)
2. Deep dive **TourGuestShows_Analysis.md** (technical details)
3. Reference **Guest_Shows_Scraper_Spec.md** as needed (implementation)

### If approving:
1. Read **TourGuestShows_Executive_Summary.md** (5-10 minutes)
2. Review "Risk Assessment" section
3. Review "Success Criteria" section
4. Review "Timeline" section

---

## Questions?

Refer to:
- **TourGuestShows_Analysis.md** - "Common Pitfalls" section
- **Guest_Shows_Scraper_Spec.md** - "Error Handling" section
- **Guest_Shows_Scraper_Spec.md** - "Testing Strategy" section

---

**Last Updated:** 2026-01-23
**All Documents Generated:** Same date

