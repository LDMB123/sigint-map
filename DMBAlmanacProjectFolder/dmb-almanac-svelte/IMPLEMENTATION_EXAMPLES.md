# Implementation Examples for Scraping Tasks
**Generated:** January 23, 2026

This document provides ready-to-use code snippets for each scraping task.

---

## Task 1: Resume Show Scraper (2018-2026)

### How It Works
The show scraper already has checkpoint support. It tracks completed years and will automatically resume where it left off.

### Command
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm run scrape:shows 2>&1 | tee shows-2018-2026.log
```

### Monitoring Progress
```bash
# In another terminal, watch the shows.json file grow
watch -n 5 'wc -l /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/shows.json'

# Or check requests per minute
tail -f shows-2018-2026.log | grep -c "Fetching"
```

### Checkpoint Reset (if needed)
If you need to restart from 2018 specifically:
```bash
# Edit checkpoint file to remove years >= 2018
jq '.completedYears |= map(select(. < 2018))' \
  /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_shows.json > temp.json && \
  mv temp.json /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_shows.json
```

---

## Task 2: Import Guest Appearances

The guest-shows.json file is already fully scraped (300MB). Here's how to import it:

### SQL Import Script
Create file: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/import-guest-appearances.sql`

```sql
-- Import guest appearances from guest-shows.json
-- Run after parsing JSON and creating temp table

-- Step 1: Create temp table from parsed JSON
-- (Assumes you've parsed guest-shows.json and created temp_guest_shows table)

CREATE TEMPORARY TABLE temp_guest_shows (
  guestName TEXT,
  guestId TEXT,
  showDate TEXT,
  showSongs TEXT  -- JSON array
);

-- Step 2: Link guests to shows and setlist entries
BEGIN TRANSACTION;

INSERT INTO guest_appearances (guest_id, show_id, setlist_entry_id, instruments)
SELECT
  g.id,
  s.id,
  se.id,
  '[]'  -- instruments to be filled in later if available
FROM temp_guest_shows tgs
JOIN guests g ON g.name = tgs.guestName
JOIN shows s ON DATE(s.date) = DATE(tgs.showDate)
LEFT JOIN setlist_entries se ON se.show_id = s.id
WHERE tgs.guestId IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 3: Update guest appearance counts
UPDATE guests
SET total_appearances = (
  SELECT COUNT(*) FROM guest_appearances WHERE guest_id = guests.id
);

COMMIT;

-- Verify
SELECT COUNT(*) as total_appearances FROM guest_appearances;
SELECT COUNT(*) as shows_with_guests FROM (
  SELECT DISTINCT show_id FROM guest_appearances
);
```

### TypeScript Import Script
Create file: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/import-guest-shows.ts`

```typescript
import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db');

interface GuestShowData {
  guestId: string;
  guestName: string;
  guestSlug: string;
  instruments: string[];
  appearances: Array<{
    showId: string;
    date: string;
    venueName: string;
    songs: Array<{
      songTitle: string;
      songId: string;
      instruments: string[];
    }>;
  }>;
}

async function importGuestShows() {
  console.log('Reading guest-shows.json (300MB, may take a minute)...');

  const data = JSON.parse(
    fs.readFileSync(
      '/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/guest-shows.json',
      'utf-8'
    )
  ) as GuestShowData[];

  console.log(`Loaded ${data.length} guest records`);

  const insertAppearance = db.prepare(`
    INSERT INTO guest_appearances (guest_id, show_id, setlist_entry_id, instruments)
    VALUES (?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `);

  const updateGuestCount = db.prepare(`
    UPDATE guests
    SET total_appearances = (SELECT COUNT(*) FROM guest_appearances WHERE guest_id = ?)
    WHERE id = ?
  `);

  db.exec('BEGIN TRANSACTION');

  let appearanceCount = 0;
  let skippedCount = 0;

  for (const guest of data) {
    // Find guest in database
    const dbGuest = db.prepare(
      'SELECT id FROM guests WHERE slug = ?'
    ).get(guest.guestSlug) as any;

    if (!dbGuest) {
      console.warn(`Guest not found: ${guest.guestName}`);
      skippedCount++;
      continue;
    }

    // Process each appearance
    for (const appearance of guest.appearances) {
      // Find show by date matching
      const dbShow = db.prepare(
        'SELECT id FROM shows WHERE DATE(date) = DATE(?)'
      ).get(appearance.date) as any;

      if (!dbShow) {
        console.warn(`Show not found: ${appearance.date}`);
        skippedCount++;
        continue;
      }

      // Insert appearance record
      const result = insertAppearance.run(
        dbGuest.id,
        dbShow.id,
        null,  // setlist_entry_id - can be matched later
        JSON.stringify(guest.instruments)
      );

      if ((result as any).changes > 0) {
        appearanceCount++;
      }
    }

    // Update guest appearance count
    updateGuestCount.run(dbGuest.id, dbGuest.id);
  }

  db.exec('COMMIT');

  console.log(`Imported ${appearanceCount} guest appearances`);
  console.log(`Skipped ${skippedCount} records`);

  // Verify
  const total = db.prepare('SELECT COUNT(*) as count FROM guest_appearances').get() as any;
  const shows = db.prepare(
    'SELECT COUNT(DISTINCT show_id) as count FROM guest_appearances'
  ).get() as any;

  console.log(`Total appearances: ${total.count}`);
  console.log(`Shows with guests: ${shows.count}`);
}

importGuestShows().catch(console.error);
```

### Run Import
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npx tsx import-guest-shows.ts
```

---

## Task 3: Derive Tour Dates

### Simple SQL Approach
```sql
-- One-shot update to derive tour dates from shows
UPDATE tours t
SET
  start_date = (SELECT MIN(date) FROM shows WHERE tour_id = t.id),
  end_date = (SELECT MAX(date) FROM shows WHERE tour_id = t.id)
WHERE start_date IS NULL OR end_date IS NULL;

-- Verify
SELECT
  COUNT(*) as total_tours,
  SUM(CASE WHEN start_date IS NULL THEN 1 ELSE 0 END) as missing_start,
  SUM(CASE WHEN end_date IS NULL THEN 1 ELSE 0 END) as missing_end
FROM tours;
-- Expected: all zeros
```

### Run from Command Line
```bash
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db \
  "UPDATE tours t SET start_date = (SELECT MIN(date) FROM shows WHERE tour_id = t.id), \
   end_date = (SELECT MAX(date) FROM shows WHERE tour_id = t.id) \
   WHERE start_date IS NULL OR end_date IS NULL;"
```

---

## Task 4: Geocode Venues

### Nominatim Geocoder Script
Create file: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/src/scrapers/venues-geocoding.ts`

```typescript
import Database from 'better-sqlite3';
import { RateLimiter } from '../utils/rate-limit.js';

const db = new Database('/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db');
const rateLimiter = new RateLimiter(1500); // 1.5 seconds between requests

interface Venue {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
}

interface GeocodingResult {
  lat: number;
  lon: number;
  displayName?: string;
}

async function geocodeVenue(venue: Venue): Promise<GeocodingResult | null> {
  try {
    await rateLimiter.wait();

    // Build address query
    const addressParts = [venue.name, venue.city, venue.state, venue.country]
      .filter(Boolean);
    const address = addressParts.join(', ');
    const query = encodeURIComponent(address);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

    console.log(`[${venue.id}] Geocoding: ${venue.name}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DMB-Database-Geocoder/1.0 (+https://github.com/dmb-database)',
      },
    });

    if (!response.ok) {
      console.error(`[${venue.id}] HTTP ${response.status} for ${venue.name}`);
      return null;
    }

    const results = await response.json() as any[];

    if (!results || results.length === 0) {
      console.warn(`[${venue.id}] No geocoding result for: ${address}`);
      return null;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
    };

  } catch (error) {
    console.error(`[${venue.id}] Error geocoding ${venue.name}:`, error);
    return null;
  }
}

async function geocodeAllVenues() {
  // Get venues needing geocoding
  const venues = db.prepare(
    'SELECT id, name, city, state, country FROM venues WHERE latitude IS NULL'
  ).all() as Venue[];

  console.log(`Found ${venues.length} venues to geocode`);
  console.log('Starting batch processing...\n');

  const updateVenue = db.prepare(
    'UPDATE venues SET latitude = ?, longitude = ? WHERE id = ?'
  );

  let successCount = 0;
  let failureCount = 0;

  for (const venue of venues) {
    const result = await geocodeVenue(venue);

    if (result) {
      updateVenue.run(result.lat, result.lon, venue.id);
      successCount++;
      console.log(`  ✓ ${venue.name} (${result.lat.toFixed(4)}, ${result.lon.toFixed(4)})`);
    } else {
      failureCount++;
      console.log(`  ✗ ${venue.name} (no result)`);
    }

    // Print progress every 50
    if ((successCount + failureCount) % 50 === 0) {
      console.log(`\nProgress: ${successCount + failureCount}/${venues.length} processed\n`);
    }
  }

  console.log(`\nGeocoding complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Success rate: ${((successCount / venues.length) * 100).toFixed(1)}%`);

  // Final statistics
  const final = db.prepare(
    'SELECT COUNT(*) as count FROM venues WHERE latitude IS NOT NULL'
  ).get() as any;
  console.log(`\nTotal geocoded venues: ${final.count}`);
}

geocodeAllVenues().catch(console.error);
```

### Run Geocoding
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper

# Run once
npx tsx src/scrapers/venues-geocoding.ts

# If you need to run multiple times
for i in {1..30}; do
  npx tsx src/scrapers/venues-geocoding.ts
  echo "Batch $i complete, remaining $(sqlite3 ../data/dmb-almanac.db 'SELECT COUNT(*) FROM venues WHERE latitude IS NULL;') venues"
  sleep 60  # Respect rate limits
done
```

### Monitor Progress
```bash
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db \
  "SELECT COUNT(*) as total, \
   SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) as geocoded, \
   COUNT(*) - SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) as remaining FROM venues;"
```

---

## Task 5: Resume Song-Stats Scraper

### Command
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npm run scrape:songs 2>&1 | tee songs-stats-resume.log
```

### Monitor Missing Composers
```bash
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db \
  "SELECT COUNT(*) as missing_composer FROM songs WHERE composer IS NULL;"
```

---

## Task 6: Classify Venue Types

### Name-Based Classification Script
Create file: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/classify-venue-types.ts`

```typescript
import Database from 'better-sqlite3';

const db = new Database('/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db');

type VenueType = 'amphitheatre' | 'arena' | 'stadium' | 'theatre' | 'club' |
                 'festival' | 'outdoor' | 'cruise' | 'pavilion' | 'coliseum' | 'other';

const classificationPatterns: Array<[RegExp, VenueType]> = [
  [/amphitheat(re|er)/i, 'amphitheatre'],
  [/(arena|dome|coliseum|colosseum)/i, 'arena'],
  [/(theater|theatre|playhouse)/i, 'theatre'],
  [/(stadium|field)/i, 'stadium'],
  [/(club|lounge|bar|tavern)/i, 'club'],
  [/(festival|park|gardens|ridge|gorge)/i, 'outdoor'],
  [/(pavilion|gazebo)/i, 'pavilion'],
  [/(cruise|ship|vessel)/i, 'cruise'],
];

function classifyVenue(name: string): VenueType {
  for (const [pattern, type] of classificationPatterns) {
    if (pattern.test(name)) {
      return type;
    }
  }
  return 'other';
}

async function classifyAllVenues() {
  // Get all venues with type = 'other'
  const venues = db.prepare(
    "SELECT id, name FROM venues WHERE venue_type = 'other' ORDER BY id"
  ).all() as Array<{ id: number; name: string }>;

  console.log(`Classifying ${venues.length} venues...`);

  const updateVenue = db.prepare(
    'UPDATE venues SET venue_type = ? WHERE id = ?'
  );

  db.exec('BEGIN TRANSACTION');

  const classification: Record<VenueType, number> = {
    amphitheatre: 0,
    arena: 0,
    stadium: 0,
    theatre: 0,
    club: 0,
    festival: 0,
    outdoor: 0,
    cruise: 0,
    pavilion: 0,
    coliseum: 0,
    other: 0,
  };

  for (const venue of venues) {
    const type = classifyVenue(venue.name);
    updateVenue.run(type, venue.id);
    classification[type]++;

    if (classification[type] % 100 === 0) {
      console.log(`Processed ${Object.values(classification).reduce((a, b) => a + b)} venues...`);
    }
  }

  db.exec('COMMIT');

  console.log('\nClassification results:');
  for (const [type, count] of Object.entries(classification)) {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  }

  const remaining = db.prepare(
    "SELECT COUNT(*) as count FROM venues WHERE venue_type = 'other'"
  ).get() as any;
  console.log(`\nRemaining unclassified: ${remaining.count}`);
}

classifyAllVenues().catch(console.error);
```

### Run Classification
```bash
cd /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper
npx tsx classify-venue-types.ts
```

---

## Task 7: Parse Setlist Durations

This requires re-parsing the shows.json file or re-running the show scraper with duration extraction.

### SQL to Check Current Duration Data
```sql
SELECT
  COUNT(*) as total_entries,
  SUM(CASE WHEN duration_seconds IS NOT NULL THEN 1 ELSE 0 END) as with_duration,
  SUM(CASE WHEN duration_seconds IS NULL THEN 1 ELSE 0 END) as missing_duration,
  ROUND(100.0 * SUM(CASE WHEN duration_seconds IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) as percent_complete
FROM setlist_entries;
```

### Example: Parse Duration from notes Field
```sql
-- If duration is in notes field, extract it
UPDATE setlist_entries
SET duration_seconds = (
  CAST(SUBSTRING(notes, 1, INSTR(notes, ':') - 1) AS INTEGER) * 60 +
  CAST(SUBSTRING(notes, INSTR(notes, ':') + 1, 2) AS INTEGER)
)
WHERE duration_seconds IS NULL
  AND notes LIKE '%[0-9]:[0-9][0-9]%';
```

---

## General: Database Maintenance

### Before Starting Any Scraping
```bash
# Backup database
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db \
  ".backup /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/backup_$(date +%Y-%m-%d_%H%M%S).db"

# Check integrity
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db \
  "PRAGMA integrity_check;"
```

### After Completing All Scraping
```bash
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db << 'EOF'
-- Optimize database
ANALYZE;

-- Rebuild full-text search indexes
DELETE FROM songs_fts;
INSERT INTO songs_fts (rowid, title, slug) SELECT id, title, slug FROM songs;

DELETE FROM venues_fts;
INSERT INTO venues_fts (rowid, name, city, state) SELECT id, name, city, state FROM venues;

DELETE FROM guests_fts;
INSERT INTO guests_fts (rowid, name) SELECT id, name FROM guests;

-- Reclaim space
VACUUM;

-- Final check
SELECT
  (SELECT COUNT(*) FROM shows) as shows,
  (SELECT COUNT(*) FROM setlist_entries) as setlist_entries,
  (SELECT COUNT(*) FROM songs) as songs,
  (SELECT COUNT(*) FROM venues) as venues,
  (SELECT COUNT(*) FROM guests) as guests,
  (SELECT COUNT(*) FROM tours) as tours,
  (SELECT COUNT(*) FROM guest_appearances) as guest_appearances;
EOF
```

---

## Monitoring & Logging

### Create Log Aggregation
```bash
# Create a master log directory
mkdir -p /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/logs

# Run tasks with logging
npm run scrape:shows 2>&1 | tee logs/shows-$(date +%Y-%m-%d_%H%M%S).log
npx tsx src/scrapers/venues-geocoding.ts 2>&1 | tee logs/geocoding-$(date +%Y-%m-%d_%H%M%S).log
npm run scrape:songs 2>&1 | tee logs/songs-$(date +%Y-%m-%d_%H%M%S).log
```

### Monitor in Real-Time
```bash
# Watch shows.json growth
watch -n 10 'du -h /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/output/shows.json'

# Watch database size
watch -n 10 'du -h /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db'

# Watch cache directory
watch -n 10 'find /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache -type f | wc -l'

# Count requests/min in log
tail -f logs/shows-*.log | grep -c "Fetching" | xargs -I {} sh -c 'echo "Requests: {}"'
```

---

## Validation Checklists

### After Task 1 (Show Scraper)
- [ ] shows.json file size increased
- [ ] Database shows count increased to 4,254+
- [ ] Setlist_entries count increased to 50,000+
- [ ] Years 2018-2026 now have show data
- [ ] No scraper errors in logs

### After Task 2 (Guest Appearances)
- [ ] guest_appearances count increased to 20,000+
- [ ] Shows with guest data increased to 500+
- [ ] Guest total_appearances counts updated
- [ ] No duplicate entries created

### After Task 3 (Tour Dates)
- [ ] Tours with NULL start_date: 0
- [ ] Tours with NULL end_date: 0
- [ ] All tour date ranges are sensible

### After Task 4 (Venue Geocoding)
- [ ] Venues with coordinates: 2,500+
- [ ] Geocoding success rate: 95%+
- [ ] Coordinates are within valid ranges (-90 to 90 lat, -180 to 180 lon)

### After Task 5 (Song Stats)
- [ ] Songs with missing composer: <100
- [ ] Average song length populated
- [ ] First/last played dates filled

### After Task 6 (Venue Classification)
- [ ] Venues with type = 'other': <1,000
- [ ] All classifications are valid types
- [ ] Famous venues correctly classified

### After Task 7 (Durations)
- [ ] Setlist entries with duration: 36,000+
- [ ] Average duration is reasonable (3-5 minutes)

---

## Troubleshooting

### Scraper Hangs or Crashes
```bash
# Kill the process
pkill -f "node.*scrape"

# Check checkpoint - was it saved?
tail -c 200 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scraper/cache/checkpoint_shows.json

# Resume - scraper should pick up from checkpoint
npm run scrape:shows
```

### Database Locked
```bash
# Check for locks
sqlite3 /Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/data/dmb-almanac.db ".databases"

# Force close connections and restart
pkill -f "sqlite3"
sleep 2
npm run scrape:shows
```

### Rate Limit Violations
```bash
# Check request frequency in logs
grep -c "Fetching" logs/shows-latest.log | xargs -I {} echo "Requests: {}"

# Adjust rate limiter in scraper code
# Default: 2000ms between requests, 30 req/min max
```

### Geocoding Failures
```bash
# Check Nominatim API status
curl "https://nominatim.openstreetmap.org/search?format=json&q=test"

# If errors, increase rate limit to 2-3 seconds between requests
# Nominatim requires min 1 second, we use 1.5 by default
```

