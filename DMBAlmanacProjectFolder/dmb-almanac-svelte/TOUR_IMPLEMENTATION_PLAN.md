# Tour Statistics Implementation Plan

## Quick Reference

**Problem**: 31% tour data coverage, missing 6 fields
**Root Cause**: Tours scraper not integrated into pipeline
**Effort**: 2-3 hours for Phase 1 (quick wins)
**Impact**: Coverage from 31% → 95%

---

## Phase 1: Quick Wins (2 hours)

### Step 1.1: Run Tours Scraper Test

Verify the scraper works before integration.

```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper

# Test the scraper on a few sample tours
npm run test:tours
```

**Expected Output**:
```
Testing tours scraper on DMBAlmanac.com...
Test 1: Scanning year pages for tour IDs...
  2025: Found N tours
  2024: Found N tours
  ...
Test 2: Fetching tour detail page...
  Tour title: "Summer 2024"
  Show count: 35
  Venues: 12
  Songs played: 156
  Average songs per show: 4.5
  Found "Most Played" section
  ✓ Tours scraper test completed successfully!
```

**If this works**: Proceed to Step 1.2
**If this fails**: Debug scraper issues before continuing

---

### Step 1.2: Check Orchestrator Configuration

**File**: `scraper/src/orchestrator.ts`

Check if tours are included in the scraper sequence:

```bash
grep -n "tours" /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/orchestrator.ts
```

**If tours is NOT in the list**:
- Open orchestrator.ts
- Add 'tours' to the scrapers array
- Ensure it runs BEFORE 'shows' (tours must exist for show imports)

**Current pattern** (you'll need to find the actual orchestrator code):
```typescript
const scrapers = [
  'venues',
  'songs',
  'guests',
  'shows',  // ← tours must come before this
];

// Should become:
const scrapers = [
  'venues',
  'songs',
  'guests',
  'tours',  // ← ADD THIS
  'shows',
];
```

---

### Step 1.3: Update Database Schema

Add missing columns to tours table.

**File**: `src/lib/db/schema.sql`

**Current schema** (lines 57-69):
```sql
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  total_shows INTEGER DEFAULT 0,
  unique_songs_played INTEGER DEFAULT 0,
  average_songs_per_show REAL,
  rarity_index REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Action**: Add these lines before the CREATE INDEX statements:

```sql
ALTER TABLE tours ADD COLUMN unique_venues INTEGER DEFAULT 0;
ALTER TABLE tours ADD COLUMN notes TEXT;
```

Or, if creating a migration script, add to a new migration file:

**File**: `src/lib/db/migrations/001_add_tour_fields.sql`

```sql
-- Migration: Add missing tour fields
-- Date: 2026-01-23

ALTER TABLE tours ADD COLUMN unique_venues INTEGER DEFAULT 0;
ALTER TABLE tours ADD COLUMN notes TEXT;

CREATE TABLE IF NOT EXISTS tour_top_songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id),
  play_count INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_top_songs_tour ON tour_top_songs(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_top_songs_position ON tour_top_songs(tour_id, position);
```

---

### Step 1.4: Calculate Rarity Index

Add calculation to import script.

**File**: `scripts/import-data.ts`

Find the `updateTourStats()` function (around line 1008) and update it:

**Current code**:
```typescript
function updateTourStats(): void {
  console.log("Updating tour statistics...");
  run(`
    UPDATE tours SET
      unique_songs_played = (
        SELECT COUNT(DISTINCT se.song_id)
        FROM shows sh
        JOIN setlist_entries se ON se.show_id = sh.id
        WHERE sh.tour_id = tours.id
      ),
      average_songs_per_show = (
        SELECT ROUND(AVG(song_count), 1)
        FROM shows
        WHERE tour_id = tours.id AND song_count > 0
      )
  `);
  console.log("Tour statistics updated.");
}
```

**Replace with**:
```typescript
function updateTourStats(): void {
  console.log("Updating tour statistics...");
  run(`
    UPDATE tours SET
      unique_songs_played = (
        SELECT COUNT(DISTINCT se.song_id)
        FROM shows sh
        JOIN setlist_entries se ON se.show_id = sh.id
        WHERE sh.tour_id = tours.id
      ),
      average_songs_per_show = (
        SELECT ROUND(AVG(song_count), 1)
        FROM shows
        WHERE tour_id = tours.id AND song_count > 0
      ),
      unique_venues = (
        SELECT COUNT(DISTINCT sh.venue_id)
        FROM shows sh
        WHERE sh.tour_id = tours.id
      ),
      rarity_index = (
        SELECT ROUND(
          (COUNT(DISTINCT se.song_id) /
           CAST(COUNT(*) AS FLOAT)) * 100,
          2
        )
        FROM shows sh
        LEFT JOIN setlist_entries se ON se.show_id = sh.id
        WHERE sh.tour_id = tours.id
      )
  `);
  console.log("Tour statistics updated.");
}
```

**Explanation**:
- `unique_venues`: Counts distinct venues per tour
- `rarity_index`: Diversity metric = (unique songs / total songs) * 100
  - High value = more diverse setlists
  - Low value = more repetitive setlists

---

## Phase 2: Integration (1-2 hours)

### Step 2.1: Create Tour Import Function

**File**: `scripts/import-data.ts`

Add new function before `importTours()`:

```typescript
async function importToursFromScraper(): Promise<Map<string, number>> {
  console.log("Importing tours from scraper...");

  // Try to load from scraper output
  const scraperData = loadJsonFile<ToursDetailedOutput>("tours.json");

  if (!scraperData?.tours || scraperData.tours.length === 0) {
    console.log("No tours.json found, falling back to show synthesis");
    return importTours(); // Use existing fallback
  }

  console.log(`Found ${scraperData.tours.length} tours from scraper`);

  const db = getDb();
  const tourMap = new Map<string, number>();
  const insertStmt = db.prepare(`
    INSERT INTO tours (name, year, start_date, end_date, total_shows,
                      unique_songs_played, average_songs_per_show, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTopSongStmt = db.prepare(`
    INSERT INTO tour_top_songs (tour_id, song_id, play_count, position)
    VALUES (?, ?, ?, ?)
  `);

  let topSongsCount = 0;

  for (const scrapedTour of scraperData.tours) {
    try {
      const result = insertStmt.run(
        scrapedTour.name,
        scrapedTour.year,
        scrapedTour.startDate || null,
        scrapedTour.endDate || null,
        scrapedTour.showCount || 0,
        scrapedTour.songCount || 0,
        scrapedTour.averageSongsPerShow || null,
        scrapedTour.notes || null
      );

      const tourId = (result.lastInsertRowid as number);
      const key = `${scrapedTour.year}-${scrapedTour.name}`;
      tourMap.set(key, tourId);

      // Insert top songs if available
      if (scrapedTour.topSongs && scrapedTour.topSongs.length > 0) {
        for (let i = 0; i < scrapedTour.topSongs.length; i++) {
          const topSong = scrapedTour.topSongs[i];
          // Look up song ID by title
          const songRow = db.prepare(
            "SELECT id FROM songs WHERE LOWER(title) = LOWER(?)"
          ).get(topSong.title) as { id: number } | undefined;

          if (songRow) {
            try {
              insertTopSongStmt.run(
                tourId,
                songRow.id,
                topSong.playCount,
                i + 1
              );
              topSongsCount++;
            } catch (err) {
              // Skip duplicate or foreign key errors
            }
          }
        }
      }

      console.log(`  ${scrapedTour.name} (${scrapedTour.showCount} shows)`);
    } catch (error) {
      console.error(`  Error importing tour ${scrapedTour.name}:`, error);
    }
  }

  console.log(`Imported ${scraperData.tours.length} tours with ${topSongsCount} top songs`);
  return tourMap;
}
```

### Step 2.2: Update Main Import Function

**File**: `scripts/import-data.ts`

Find the `async function main()` (or similar) and update the tour import call:

**Current code** (around line 1700):
```typescript
async function main() {
  // ... other imports ...
  const tourMap = importTours();
  // ...
}
```

**Change to**:
```typescript
async function main() {
  // ... other imports ...
  const tourMap = await importToursFromScraper(); // Changed
  // ...
}
```

---

### Step 2.3: Update Types Import

**File**: `scripts/import-data.ts`

Add import for `ToursDetailedOutput`:

```typescript
import {
  // ... existing imports ...
  ToursDetailedOutput,  // ← ADD THIS
  // ... rest of imports ...
} from "../scraper/src/types.js";
```

---

## Phase 3: Validation (30 minutes)

### Step 3.1: Test on Small Dataset

```bash
# Clear existing data
rm data/dmb-almanac.db 2>/dev/null || true

# Initialize fresh database
npx tsx scripts/init-db.ts

# If you have a sample tours.json already
# Otherwise, we'll generate it in the next step

# Run imports
npm run import
```

### Step 3.2: Generate Tours.json First

If tours.json doesn't exist, generate it:

```bash
cd scraper

# Run the tours scraper
npm run scrape:tours

# Verify output
ls -lh output/tours.json

# Check content
head -50 output/tours.json | jq .
```

### Step 3.3: Verify Data Coverage

**Query**: Check what got populated

```bash
sqlite3 data/dmb-almanac.db << 'EOF'
-- Check field coverage
SELECT
  COUNT(*) as total_tours,
  COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) as has_start_date,
  COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) as has_end_date,
  COUNT(CASE WHEN unique_venues > 0 THEN 1 END) as has_venue_count,
  COUNT(CASE WHEN notes IS NOT NULL THEN 1 END) as has_notes,
  COUNT(CASE WHEN rarity_index IS NOT NULL THEN 1 END) as has_rarity
FROM tours;

-- Check coverage percentage
SELECT
  ROUND(
    COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1
  ) as start_date_coverage,
  ROUND(
    COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1
  ) as end_date_coverage,
  ROUND(
    COUNT(CASE WHEN unique_venues > 0 THEN 1 END) * 100.0 / COUNT(*), 1
  ) as venue_count_coverage,
  ROUND(
    COUNT(CASE WHEN rarity_index IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1
  ) as rarity_coverage
FROM tours;

-- Sample tour with rich data
SELECT * FROM tours ORDER BY year DESC LIMIT 1;
EOF
```

**Expected improvement**:
- Before: ~31% coverage
- After Phase 1: ~80% coverage
- After Phase 2: ~95% coverage

---

## Phase 4: Advanced Features (Optional, 2-3 hours)

### Step 4.1: Tour Comparison View

**File**: `src/lib/db/schema.sql` (add view)

```sql
CREATE VIEW IF NOT EXISTS tour_analysis AS
SELECT
  t.id,
  t.name,
  t.year,
  t.start_date,
  t.end_date,
  t.total_shows,
  t.unique_songs_played,
  t.unique_venues,
  ROUND(t.average_songs_per_show, 1) as avg_songs,
  ROUND(t.rarity_index, 2) as setlist_diversity,
  COUNT(DISTINCT tts.song_id) as top_songs_count,
  CASE
    WHEN t.rarity_index > 80 THEN 'Very Diverse'
    WHEN t.rarity_index > 60 THEN 'Diverse'
    WHEN t.rarity_index > 40 THEN 'Moderate'
    ELSE 'Repetitive'
  END as diversity_rating
FROM tours t
LEFT JOIN tour_top_songs tts ON t.id = tts.tour_id
GROUP BY t.id;
```

### Step 4.2: Tour Statistics Query

```typescript
// In src/lib/db/server/queries.ts

export function getTourStats(tourId: number) {
  return db.prepare(`
    SELECT
      t.*,
      COUNT(DISTINCT s.venue_id) as actual_venues,
      COUNT(DISTINCT se.song_id) as unique_songs,
      COUNT(DISTINCT s.id) as show_count,
      AVG(s.song_count) as avg_setlist_size
    FROM tours t
    LEFT JOIN shows s ON t.id = s.tour_id
    LEFT JOIN setlist_entries se ON s.id = se.show_id
    WHERE t.id = ?
    GROUP BY t.id
  `).get(tourId);
}

export function getTourTopSongs(tourId: number, limit: number = 20) {
  return db.prepare(`
    SELECT
      tts.position,
      s.id,
      s.title,
      tts.play_count,
      s.total_performances as overall_plays
    FROM tour_top_songs tts
    JOIN songs s ON tts.song_id = s.id
    WHERE tts.tour_id = ?
    ORDER BY tts.position
    LIMIT ?
  `).all(tourId, limit);
}

export function compareTours(year1: number, year2: number) {
  return db.prepare(`
    SELECT
      t1.name as tour1,
      t2.name as tour2,
      t1.total_shows as shows1,
      t2.total_shows as shows2,
      t1.unique_songs_played as songs1,
      t2.unique_songs_played as songs2,
      t1.rarity_index as diversity1,
      t2.rarity_index as diversity2,
      ABS(t1.rarity_index - t2.rarity_index) as diversity_diff
    FROM tours t1, tours t2
    WHERE t1.year = ? AND t2.year = ?
  `).all(year1, year2);
}
```

---

## Testing Checklist

### Pre-Implementation
- [ ] Run `npm run test:tours` - verify scraper works
- [ ] Backup existing database
- [ ] Check orchestrator.ts for tours inclusion

### Phase 1
- [ ] Update schema.sql with new fields
- [ ] Update updateTourStats() function
- [ ] Verify SQL syntax is correct

### Phase 2
- [ ] Add importToursFromScraper() function
- [ ] Update import main() function call
- [ ] Add types.ts import
- [ ] Compile TypeScript without errors

### Phase 3
- [ ] Generate tours.json: `npm run scrape:tours`
- [ ] Initialize fresh database: `npx tsx scripts/init-db.ts`
- [ ] Run import: `npm run import`
- [ ] Verify tours table has data
- [ ] Run coverage query
- [ ] Check coverage improved to 80%+

### Phase 4 (if doing advanced features)
- [ ] Create view SQL
- [ ] Add query functions
- [ ] Test query results
- [ ] Update UI components to use new data

---

## Rollback Plan

If something breaks:

```bash
# Restore from backup
cp data/dmb-almanac.db.backup data/dmb-almanac.db

# Revert code changes
git checkout -- scripts/import-data.ts
git checkout -- src/lib/db/schema.sql

# Restart from last working state
npm run import
```

---

## Success Metrics

After implementation, verify:

1. **Tour data coverage**:
   ```sql
   SELECT COUNT(*) as total_tours,
          COUNT(start_date) as has_dates,
          COUNT(unique_venues) as has_venues,
          COUNT(rarity_index) as has_rarity
   FROM tours;
   ```

2. **Sample tour record**:
   ```sql
   SELECT * FROM tours WHERE year = 2024 LIMIT 1;
   ```

3. **Top songs available**:
   ```sql
   SELECT COUNT(*) FROM tour_top_songs WHERE tour_id = 1;
   ```

4. **Rarity calculation working**:
   ```sql
   SELECT year, name, rarity_index FROM tours
   ORDER BY rarity_index DESC LIMIT 10;
   ```

---

## File Summary

**To Create/Modify**:

| File | Action | Est. Time |
|------|--------|-----------|
| `scraper/src/orchestrator.ts` | Add 'tours' to sequence | 5 min |
| `src/lib/db/schema.sql` | Add 2 columns, 1 table | 10 min |
| `scripts/import-data.ts` | Update function, add import | 20 min |
| `src/lib/db/migrations/001_*` | (Optional) Migration script | 10 min |

**Total Phase 1**: ~45 minutes coding, 75 minutes testing = 2 hours

---

## Command Reference

```bash
# Test scraper
cd scraper && npm run test:tours && cd ..

# Initialize database
npx tsx scripts/init-db.ts

# Run full scrape (will include tours after modification)
cd scraper && npm run scrape && cd ..

# Run imports
npm run import

# Verify data
sqlite3 data/dmb-almanac.db "SELECT COUNT(*) as total_tours FROM tours;"

# Check coverage
sqlite3 data/dmb-almanac.db << 'EOF'
SELECT
  ROUND(COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as start_date_pct,
  ROUND(COUNT(CASE WHEN unique_venues > 0 THEN 1 END) * 100.0 / COUNT(*), 1) as venues_pct,
  ROUND(COUNT(CASE WHEN rarity_index IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as rarity_pct
FROM tours;
EOF
```

---

## Summary

The tour statistics gap exists because the scraper isn't integrated. This implementation plan adds the missing integration in 3 straightforward phases:

1. **Quick Wins**: Schema updates + calculation formula (45 min)
2. **Integration**: Tours scraper into import pipeline (30 min)
3. **Validation**: Test and verify improvements (30 min)
4. **Optional**: Advanced analytics features (2-3 hours)

After Phase 1-3 (~2 hours), expect data coverage to improve from **31% to 95%**.
