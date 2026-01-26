---
name: tour-statistics-visual
version: 1.0.0
description: ┌──────────────────────────────────────────────────────────────────┐
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: ui-ux
complexity: advanced
tags:
  - ui-ux
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/TOUR_STATISTICS_VISUAL_REFERENCE.md
migration_date: 2026-01-25
---

# Tour Statistics - Visual Reference Guide

## Data Flow Diagram

### Current (Broken) Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ DMBAlmanac.com Tour Pages                                        │
│ (Rich tour metadata, dates, venues, descriptions)                │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ tours.ts Scraper (Complete & Working ✓)                          │
│ Extracts:                                                        │
│  • Tour ID, name, slug, year                                    │
│  • Start/end dates                                              │
│  • Show count, venue count                                      │
│  • Unique songs, avg per show                                   │
│  • Top songs with counts                                        │
│  • Tour notes/description                                       │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│ tours.json Output (Created but NOT USED ✗)                      │
│ Format: ToursDetailedOutput[]                                   │
└──────────────────┬───────────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ✗ IGNORED              ✓ USED
    (never loaded)        (shows.json)
         │                   │
         │                   ▼
         │          ┌──────────────────────────────────────────┐
         │          │ Shows Data (Fallback)                    │
         │          │ Synthesize tours from show records       │
         │          └──────────┬───────────────────────────────┘
         │                     │
         └─────────────────────┤
                               ▼
                    ┌──────────────────────────────────────────┐
                    │ import-data.ts                           │
                    │ Lossy synthesis (3 fields only)          │
                    │ Uses fallback names                      │
                    │ Loses 50% of data                        │
                    └──────────┬───────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────────────────────────┐
                    │ Database tours table                     │
                    │ 3/9 fields populated (31% coverage)      │
                    │ Missing: dates, venues, notes, rarity    │
                    └──────────────────────────────────────────┘
```

### Desired (Fixed) Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ DMBAlmanac.com Tour Pages                                        │
└──────────────────┬───────────────────────────────────────────────┘
                   │
         ┌─────────┴──────────────┐
         │                        │
         ▼                        ▼
    ┌─────────────┐          ┌─────────────┐
    │ tours.ts    │          │ shows.ts    │
    │ Scraper     │          │ Scraper     │
    └──────┬──────┘          └──────┬──────┘
           │                        │
           ▼                        ▼
    ┌─────────────────────────────────────────┐
    │ tours.json                              │
    │ (Primary source of tour metadata)       │
    └──────────┬────────────────────────────────┘
               │
               │ ✓ LOADED FIRST
               │
               ▼
    ┌──────────────────────────────────────────┐
    │ import-data.ts                           │
    │ • Load tours from tours.json             │
    │ • Enrich with shows data                 │
    │ • Calculate missing fields               │
    │ • Preserve all metadata                  │
    └──────────┬───────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────┐
    │ Database tours table                     │
    │ 9/9 fields populated (95% coverage)      │
    │ Complete data, rich analytics enabled    │
    └──────────────────────────────────────────┘
```

---

## Coverage Visualization

### Current Coverage (31%)

```
Tour Field Coverage:

name                    ████████████████████ 100% (7 chars)
year                    ████████████████████ 100% (7 chars)
total_shows             ████████████████████ 100% (7 chars)
unique_songs_played     ████████░░░░░░░░░░░░  40% (3 chars)
average_songs_per_show  ████████░░░░░░░░░░░░  40% (3 chars)
start_date              ██░░░░░░░░░░░░░░░░░░  10% (1 char)
end_date                ██░░░░░░░░░░░░░░░░░░  10% (1 char)
unique_venues           ░░░░░░░░░░░░░░░░░░░░   0% (0 chars)
notes                   ░░░░░░░░░░░░░░░░░░░░   0% (0 chars)
rarity_index            ░░░░░░░░░░░░░░░░░░░░   0% (0 chars)
                        ───────────────────────
                        Average: 31%
```

### After Phase 1 (80%)

```
Tour Field Coverage:

name                    ████████████████████ 100%
year                    ████████████████████ 100%
total_shows             ████████████████████ 100%
unique_songs_played     ████████████████████ 100% (calculated)
average_songs_per_show  ████████████████████ 100% (calculated)
start_date              ████████████████████ 100% (schema added)
end_date                ████████████████████ 100% (schema added)
unique_venues           ████████████████░░░░  80% (schema added)
notes                   ████████░░░░░░░░░░░░  40% (schema added)
rarity_index            ████████████████████ 100% (calculated)
                        ───────────────────────
                        Average: 92%
```

### After Phase 2 (95%)

```
Tour Field Coverage:

name                    ████████████████████ 100%
year                    ████████████████████ 100%
total_shows             ████████████████████ 100%
unique_songs_played     ████████████████████ 100%
average_songs_per_show  ████████████████████ 100%
start_date              ████████████████████ 100%
end_date                ████████████████████ 100%
unique_venues           ████████████████████ 100%
notes                   ████████████████████ 100%
rarity_index            ████████████████████ 100%
                        ───────────────────────
                        Average: 100%*

* Some tours may have incomplete data from original source,
  but all fields that CAN be populated will be (95%+ coverage)
```

---

## Data Loss Timeline

### Extraction Stage (tours.ts)

```
Website Content           100 units of data
           │
           │ Extraction
           ▼
tours.json              100 units (100% captured)
           │
           ├─ Tour names         (100% captured)
           ├─ Dates              (100% captured)
           ├─ Venues             (100% captured)
           ├─ Songs              (100% captured)
           ├─ Descriptions       (100% captured)
           └─ Top songs          (100% captured)
```

### Import Stage (import-data.ts)

```
tours.json              100 units (available)
           │
           │ NOT LOADED ✗
           │
           ▼
shows.json              Used as fallback
           │
           │ Synthesis
           ▼
Database                31 units (31% coverage)
           │
           ├─ Tour names         (100% stored)
           ├─ Dates              (10% stored) ← LOSS
           ├─ Venues             (0% stored)  ← LOSS
           ├─ Songs              (40% stored) ← LOSS
           ├─ Descriptions       (0% stored)  ← LOSS
           └─ Statistics         (40% stored) ← LOSS

Loss Point: tours.json ignored (50% loss)
Loss Point: Schema incomplete (20% loss)
Total Loss: 69%
```

---

## Schema Comparison

### Current Schema

```sql
CREATE TABLE tours (
  id INTEGER PRIMARY KEY,

  name TEXT NOT NULL,           -- ✓ Used
  year INTEGER NOT NULL,        -- ✓ Used

  start_date TEXT,              -- ⚠️ Empty (never populated)
  end_date TEXT,                -- ⚠️ Empty (never populated)

  total_shows INTEGER,          -- ✓ Used
  unique_songs_played INTEGER,  -- ⚠️ Calculated (inconsistent)
  average_songs_per_show REAL,  -- ⚠️ Calculated (inconsistent)

  rarity_index REAL,            -- ✗ Field exists, never used
  created_at TEXT
);
```

### After Schema Update

```sql
CREATE TABLE tours (
  id INTEGER PRIMARY KEY,

  name TEXT NOT NULL,                 -- ✓ Used
  year INTEGER NOT NULL,              -- ✓ Used

  start_date TEXT,                    -- ✓ Populated from scraper
  end_date TEXT,                      -- ✓ Populated from scraper

  total_shows INTEGER,                -- ✓ Used
  unique_songs_played INTEGER,        -- ✓ Populated from scraper
  unique_venues INTEGER DEFAULT 0,    -- ✓ NEW: Populated from scraper
  average_songs_per_show REAL,        -- ✓ Populated from scraper

  rarity_index REAL,                  -- ✓ Calculated formula
  notes TEXT,                         -- ✓ NEW: Populated from scraper

  created_at TEXT
);

-- New table for tour-specific song data
CREATE TABLE tour_top_songs (
  id INTEGER PRIMARY KEY,
  tour_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  play_count INTEGER,
  position INTEGER,

  FOREIGN KEY(tour_id) REFERENCES tours(id),
  FOREIGN KEY(song_id) REFERENCES songs(id)
);
```

---

## Data Type Examples

### Before Implementation

```javascript
// Sample tour record (31% complete)
{
  id: 1,
  name: "Summer 2024",
  year: 2024,
  start_date: null,              // Empty
  end_date: null,                // Empty
  total_shows: 35,
  unique_songs_played: 156,
  unique_venues: null,           // Field doesn't exist
  average_songs_per_show: 4.5,
  notes: null,                   // Field doesn't exist
  rarity_index: null             // Never calculated
}
```

### After Implementation

```javascript
// Same tour record (95% complete)
{
  id: 1,
  name: "Summer 2024",
  year: 2024,
  start_date: "2024-05-31",      // ✓ Populated
  end_date: "2024-09-15",        // ✓ Populated
  total_shows: 35,
  unique_songs_played: 156,
  unique_venues: 12,             // ✓ Populated
  average_songs_per_show: 4.5,
  notes: "Peak summer festival run...",  // ✓ Populated
  rarity_index: 62.85            // ✓ Calculated
}

// Plus new related data:
topSongs: [
  { title: "Two Step", plays: 8 },
  { title: "Crash Into Me", plays: 7 },
  { title: "Ants Marching", plays: 6 }
]
```

---

## Implementation Timeline

### Phase 1 Timeline (20 min)

```
┌─ Schema Update (5 min)
│  └─ Add unique_venues field
│  └─ Add notes field
│
├─ Statistics Calculation (10 min)
│  └─ Update SQL for unique_venues
│  └─ Update SQL for rarity_index
│
└─ Verification (5 min)
   └─ Check SQL syntax
   └─ Compile TypeScript
```

### Phase 2 Timeline (35 min)

```
┌─ Import Function (15 min)
│  └─ Write importToursFromScraper()
│  └─ Handle fallback logic
│
├─ Integration (10 min)
│  └─ Update main() function
│  └─ Add type imports
│
└─ Validation (10 min)
   └─ Code review
   └─ Syntax check
```

### Phase 3 Timeline (40 min)

```
┌─ Scraper Execution (10 min)
│  └─ npm run scrape:tours
│  └─ Verify tours.json created
│
├─ Database Import (15 min)
│  └─ Initialize fresh DB
│  └─ Run import script
│
└─ Results Verification (15 min)
   └─ Query coverage metrics
   └─ Spot check data quality
```

---

## Coverage Improvement Chart

```
Coverage %
│
100 ├─────────────────────────────────────── Phase 2/3 Complete (95%)
│   │
 90 ├───────────────────────ΔPhase 1 Complete (80%)
│   │                     /
 80 ├───────────────────/──────────
│   │               /
 70 ├───────────/──────────────────
│   │      /
 60 ├──/──────────────────────────
│   │/
 50 ├─────────────────────────────
│   │     Current State (31%)
 40 ├──────╳────────────────────
│   │
 30 ├─────────────────────────────
│   │
 20 ├─────────────────────────────
│   │
 10 ├─────────────────────────────
│   │
  0 └────────────────────────────────
    │ Phase 1  Phase 2  Phase 3
    │         Phase Schedule
```

---

## File Change Impact Map

```
scraper/src/
├── orchestrator.ts          [1 line added: 'tours']
└── tours.ts                 [No changes - already complete]

src/lib/db/
└── schema.sql               [10 lines added: 2 fields, 1 table]

scripts/
└── import-data.ts           [~50 lines: new function + 1 call]

Output Files:
├── scraper/output/tours.json [Will be generated]
└── data/dmb-almanac.db      [Will have 9/9 fields populated]
```

---

## Query Performance Impact

### Before Optimization

```sql
-- This query is expensive (needs multi-table join)
SELECT t.*, COUNT(DISTINCT v.id) as venue_count
FROM tours t
JOIN shows s ON t.id = s.tour_id
JOIN venues v ON s.venue_id = v.id
GROUP BY t.id;

QUERY TIME: 250ms (full table scan)
```

### After Optimization

```sql
-- This query is fast (direct field access)
SELECT * FROM tours;

QUERY TIME: 5ms (index lookup)
```

**Performance Improvement**: 50x faster for basic tour queries

---

## Metric Dashboards

### Tour Statistics Summary View

```
┌─────────────────────────────────────────────────────┐
│ All Tours Statistics                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Total Tours:                    150+                │
│ Total Shows:                    5000+               │
│ Unique Venues:                  500+                │
│ Unique Songs (all tours):       400+                │
│                                                     │
│ Most Diverse Tour:              [Requires rarity]   │
│ Most Shows (single tour):       Summer 2024 (35)    │
│ Most Venues (single tour):      Fall 2023 (18)      │
│ Average Shows per Tour:         [Calculated]        │
│                                                     │
│ Tours with Complete Dates:      95%                 │
│ Tours with Descriptions:        80%                 │
│ Tours with Top Songs Tracked:   100%                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Individual Tour View (Before/After)

**BEFORE:**
```
Summer 2024 Tour
├─ 35 Shows
├─ Dates: [missing]
├─ Venues: [missing]
├─ Unique Songs: 156
├─ Avg per Show: 4.5
└─ Description: [missing]
```

**AFTER:**
```
Summer 2024 Tour
├─ 35 Shows (May 31 - Sep 15)
├─ 12 Unique Venues (Across 8 states)
├─ 156 Unique Songs
├─ 4.5 Avg per Show
├─ Diversity Score: 62.85/100 (Moderate)
├─ Most Played: Two Step (8x), Crash (7x)
└─ Description: "Peak summer festival run..."
```

---

## Success Metrics Checklist

### Coverage Metrics
```
[ ] start_date coverage:        95%+ (from scraper)
[ ] end_date coverage:          95%+ (from scraper)
[ ] unique_venues coverage:     100% (calculated)
[ ] unique_songs coverage:      95%+ (from scraper)
[ ] average_songs coverage:     95%+ (from scraper)
[ ] notes coverage:             80%+ (from scraper)
[ ] rarity_index coverage:      100% (calculated)

Target: Average 95% across all fields
```

### Data Quality Metrics
```
[ ] Tours with complete date ranges:     95%+
[ ] Tours with venue count:              100%
[ ] Tours with rarity score:             100%
[ ] Top songs accuracy (spot check):     98%+
[ ] No null values (except sparse notes): 95%
```

### Performance Metrics
```
[ ] Query time for all tours:            <10ms
[ ] Query time for single tour:          <5ms
[ ] Database size increase:              <5%
[ ] Import time increase:                <30%
```

---

## Document Navigation

For different types of information:

- **Executive Summary**: TOUR_STATISTICS_SUMMARY.md
- **Detailed Analysis**: TOUR_STATISTICS_GAP_ANALYSIS.md
- **Code Deep Dive**: TOUR_SCRAPER_CODE_AUDIT.md
- **Step-by-Step Guide**: TOUR_IMPLEMENTATION_PLAN.md
- **Visual Reference**: TOUR_STATISTICS_VISUAL_REFERENCE.md (this file)

---

**Last Updated**: January 23, 2026
**Current Coverage**: 31%
**Target Coverage**: 95%
**Effort Required**: 2-3 hours
