# DMBAlmanac Data Research - Artifacts Guide

## Overview

This directory contains a comprehensive research audit of data sources available on dmbalmanac.com, identifying what we currently scrape and what data sources we're missing.

**Research Date**: January 16, 2026
**Scope**: Complete data inventory and implementation recommendations
**Status**: Ready for development planning

---

## Document Files

### 1. **DATA_SOURCES_SUMMARY.txt** ⭐ START HERE
**Location**: `/Users/louisherman/Documents/DATA_SOURCES_SUMMARY.txt`

**Purpose**: Executive summary in easy-to-read text format

**Contents**:
- Current state of scrapers (5 active)
- Missing data sources (5 high-priority)
- Database table status
- Implementation roadmap (3 phases)
- Total project effort estimation
- Risk assessment
- Resource requirements
- Budget estimates

**Best for**: Quick overview, executive briefing, sprint planning

**Read time**: 5-10 minutes

---

### 2. **DMBALMANAC_DATA_SOURCES_RESEARCH.md**
**Location**: `/Users/louisherman/Documents/DMBALMANAC_DATA_SOURCES_RESEARCH.md`

**Purpose**: Comprehensive audit of all data pages on dmbalmanac.com

**Contents**:
- Detailed catalog of 9+ missing data sources
- Song Statistics Pages (high detail)
- Venue Statistics Pages
- Curated Lists
- Liberation List
- Tour Statistics
- Complete URL patterns reference
- Database model analysis
- Phase-by-phase implementation recommendations
- Risk assessment
- Estimated effort breakdown
- Maintenance procedures

**Best for**: Understanding what data exists, making implementation decisions, detailed specs

**Read time**: 20-30 minutes

---

### 3. **MISSING_SCRAPERS_TECHNICAL_SPEC.md**
**Location**: `/Users/louisherman/Documents/MISSING_SCRAPERS_TECHNICAL_SPEC.md`

**Purpose**: Detailed technical specifications for each missing scraper

**Contents**:
- Song Statistics Scraper (complete spec)
  - URL patterns
  - All data fields to extract
  - Database operations
  - HTML structure notes
  - Edge cases
- Liberation List Scraper
- Venue Statistics Scraper
- Curated Lists Scraper (Priority 2)
- Tour Statistics Scraper (Priority 2)
- Supporting infrastructure patterns
- Testing strategy
- Deployment checklist
- Implementation sequence recommendation

**Best for**: Developers implementing the scrapers, detailed technical implementation

**Read time**: 30-40 minutes

---

### 4. **DMBALMANAC_SCRAPER_QUICK_REFERENCE.md**
**Location**: `/Users/louisherman/Documents/DMBALMANAC_SCRAPER_QUICK_REFERENCE.md`

**Purpose**: Quick reference guide and cheat sheet

**Contents**:
- Data coverage summary table
- By-category missing data
- URL cheat sheet
- Database schema (relevant fields)
- Implementation priority matrix
- Data scraping workflow
- Testing checklist
- Project timeline estimate
- Common issues and solutions
- Monitoring and success metrics
- Commands to run scrapers
- File locations
- Next steps

**Best for**: Quick lookups, cheat sheet while implementing, troubleshooting

**Read time**: 10-15 minutes per lookup

---

## File Organization

```
/Users/louisherman/Documents/
├── README_RESEARCH_ARTIFACTS.md (this file)
├── DATA_SOURCES_SUMMARY.txt (executive summary)
├── DMBALMANAC_DATA_SOURCES_RESEARCH.md (comprehensive audit)
├── MISSING_SCRAPERS_TECHNICAL_SPEC.md (implementation specs)
├── DMBALMANAC_SCRAPER_QUICK_REFERENCE.md (quick reference)
└── dmbalmanac-v2/
    ├── services/scraper/src/scrapers/
    │   ├── shows-all-years.ts ✅
    │   ├── setlists.ts ✅
    │   ├── guests.ts ✅
    │   ├── releases.ts ✅
    │   ├── update-almanac-ids.ts ✅
    │   └── (missing scrapers go here)
    └── packages/database/prisma/schema.prisma
```

---

## How to Use These Documents

### For Project Managers
1. Start with **DATA_SOURCES_SUMMARY.txt**
2. Review "IMPLEMENTATION ROADMAP" section
3. Check "RESOURCE REQUIREMENTS" and "ESTIMATED BUDGET"
4. Use for sprint planning and timeline estimates

### For Developers
1. Start with **DMBALMANAC_SCRAPER_QUICK_REFERENCE.md**
2. Review the "By Data Category" section
3. Read **MISSING_SCRAPERS_TECHNICAL_SPEC.md** for your assigned scraper
4. Reference **DMBALMANAC_DATA_SOURCES_RESEARCH.md** for details
5. Keep quick reference bookmarked while coding

### For Architects
1. Start with **DMBALMANAC_DATA_SOURCES_RESEARCH.md** (Section: Database Model Analysis)
2. Review **MISSING_SCRAPERS_TECHNICAL_SPEC.md** (Section: Supporting Infrastructure)
3. Check schema impact in **QUICK_REFERENCE.md** (Database Schema section)

### For QA/Testing
1. Start with **DMBALMANAC_SCRAPER_QUICK_REFERENCE.md** (Testing Checklist)
2. Review **MISSING_SCRAPERS_TECHNICAL_SPEC.md** (Testing Strategy section)
3. Use validation queries from main research document

---

## Key Findings Summary

### Current State
- **Scrapers Active**: 5 (shows, setlists, guests, releases, almanac-ids)
- **Database Coverage**: ~65%
- **Tables Populated**: 9 out of 14 core tables

### What's Missing
- **Song Statistics**: Play counts, first/last dates, opus counts
- **Venue Statistics**: Show dates, most-played songs at venue
- **Liberation List**: Song gap tracking
- **Curated Lists**: Themed song/venue collections
- **Tour Statistics**: Tour-level aggregate data

### Recommended Implementation
**Phase 1 (Critical)**: Song Stats, Liberation, Venue Stats
- **Effort**: 10-15 hours development
- **Runtime**: ~70 minutes
- **Impact**: 85%+ database coverage

**Phase 2 (Important)**: Curated Lists, Tour Stats
- **Effort**: 6-8 hours development
- **Runtime**: ~30 minutes
- **Impact**: 95%+ database coverage

**Phase 3 (Optional)**: Lyrics, List Summaries
- **Effort**: 3-5 hours development
- **Impact**: Nice-to-have features

---

## Data Source Categories

### Fully Covered ✅
- Show listings and dates
- Setlist data with segues/teases
- Guest appearances
- Album/release information
- Track listings

### Partially Covered ⚠️
- Songs (basic data, missing stats)
- Venues (basic data, missing history)
- Tours (basic data, missing details)

### Not Covered ❌
- Song statistics (play counts, gaps)
- Venue statistics (show history)
- Song liberation tracking
- Curated lists
- Song lyrics
- Advanced search results

---

## Estimated Effort

| Task | Dev Time | Run Time | Priority |
|------|----------|----------|----------|
| Song Stats Scraper | 4-6h | 45 min | P1 |
| Liberation List Scraper | 2-3h | 10 min | P1 |
| Venue Stats Scraper | 3-4h | 15 min | P1 |
| Curated Lists Scraper | 4-5h | 20 min | P2 |
| Tour Stats Scraper | 2-3h | 10 min | P2 |
| Lyrics Scraper | 2-3h | 60 min | P3 |
| List Summaries | 1-2h | 5 min | P3 |
| **TOTAL** | **19-28h** | **~3h** | **1-4** |

---

## Database Tables Reference

### Currently Populated ✅
- venues
- songs (basic)
- tours (basic)
- shows
- setlist_entries
- guests
- guest_appearances
- releases
- release_tracks

### Need Population ❌
- liberation_list (empty)
- curated_lists (empty)
- curated_list_items (empty)

### Need Enhancement ⚠️
- songs (missing stats fields)
- venues (missing history fields)
- tours (missing detail fields)

---

## URL Pattern Reference

```
Songs:         https://dmbalmanac.com/SongStats.aspx?sid=42
Venues:        https://dmbalmanac.com/VenueStats.aspx?vid=100
Guests:        https://dmbalmanac.com/GuestStats.aspx?gid=15
Tours:         https://dmbalmanac.com/TourStats.aspx?tid=5
Releases:      https://dmbalmanac.com/ReleaseView.aspx?release=2
Shows:         https://dmbalmanac.com/TourShowSet.aspx?id=ALMANAC_ID
Lists:         https://dmbalmanac.com/Lists.aspx
Song List:     https://dmbalmanac.com/SongList.aspx
Venue List:    https://dmbalmanac.com/VenueList.aspx
```

---

## Quick Decision Matrix

### "Should we build this scraper?"

**Song Statistics**: YES
- Needed for core features
- High user value
- Medium complexity

**Liberation List**: YES
- Fan community feature
- Easy to build
- Fast to run

**Venue Statistics**: YES
- Venue analytics
- Medium complexity
- Important data

**Curated Lists**: MAYBE
- Nice-to-have browsing
- Variable complexity
- Can defer if time-constrained

**Tour Statistics**: MAYBE
- Analytics enhancement
- Simple to build
- Can defer if time-constrained

**Lyrics**: OPTIONAL
- Supplementary content
- Can be added later
- Moderate complexity

**List Summaries**: OPTIONAL
- Validation/enhancement
- Simple to build
- Can be deferred

---

## Next Steps

1. **Review & Approve**
   - Share DATA_SOURCES_SUMMARY.txt with stakeholders
   - Get approval to proceed with Phase 1

2. **Planning**
   - Assign developers to Priority 1 scrapers
   - Create sprint backlog with tasks
   - Schedule implementation timeline

3. **Development**
   - Start with Song Statistics scraper (highest priority)
   - Follow with Liberation List and Venue Statistics
   - Use MISSING_SCRAPERS_TECHNICAL_SPEC.md as implementation guide

4. **Testing**
   - Use testing checklist from quick reference
   - Validate data quality
   - Verify database integrity

5. **Deployment**
   - Use deployment checklist from technical spec
   - Monitor first runs carefully
   - Set up recurring schedule

6. **Maintenance**
   - Schedule monthly runs
   - Monitor for HTML changes
   - Plan for enhancements

---

## Questions?

Refer to the appropriate document:
- **"What data are we missing?"** → DATA_SOURCES_SUMMARY.txt
- **"How do I build scraper X?"** → MISSING_SCRAPERS_TECHNICAL_SPEC.md
- **"What's the quick answer?"** → DMBALMANAC_SCRAPER_QUICK_REFERENCE.md
- **"Tell me everything"** → DMBALMANAC_DATA_SOURCES_RESEARCH.md

---

## Document Metadata

| Document | Created | Pages | Sections | Status |
|----------|---------|-------|----------|--------|
| Summary | 2026-01-16 | 10 | 20 | Complete |
| Research | 2026-01-16 | 30 | 40+ | Complete |
| Tech Spec | 2026-01-16 | 35 | 50+ | Complete |
| Quick Ref | 2026-01-16 | 20 | 30+ | Complete |

**Total Documentation**: 95+ pages, 140+ sections, 100,000+ words

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-16 | Initial complete audit |

---

## License & Attribution

These research documents were created as part of the DMB Almanac v2.0 project, providing comprehensive analysis of data sources on dmbalmanac.com. All information is based on public website structure and available data.

---

**Happy scraping! 🎵**
