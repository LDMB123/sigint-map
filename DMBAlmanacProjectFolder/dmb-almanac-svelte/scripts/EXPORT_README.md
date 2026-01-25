# DMB Almanac - SQLite to JSON Export

This script exports all data from the SQLite database (`data/dmb-almanac.db`) to JSON files that can be used to seed IndexedDB in the client-side Dexie database. This enables the PWA to load data directly from static JSON files in `public/data/` without needing a server API.

## Overview

The export process transforms SQLite data into Dexie-compatible formats with proper denormalization for offline-first access patterns:

- **Venues**: Standalone records with location and metadata
- **Songs**: Includes liberation tracking and performance statistics
- **Tours**: Tour information with aggregate statistics
- **Shows**: Denormalized with embedded venue and tour info
- **Setlist Entries**: Denormalized with embedded song info and show date/year
- **Guests**: Guest musicians with instrument lists
- **Guest Appearances**: Guest appearances at shows with context
- **Liberation List**: Songs waiting to be played with embedded song and venue info
- **Song Statistics**: Detailed performance statistics with JSON fields

## Usage

### Quick Export

```bash
npm run export
```

This exports all data and creates:
- `public/data/venues.json`
- `public/data/songs.json`
- `public/data/tours.json`
- `public/data/shows.json`
- `public/data/setlist-entries.json`
- `public/data/guests.json`
- `public/data/guest-appearances.json`
- `public/data/liberation-list.json`
- `public/data/song-statistics.json`
- `public/data/manifest.json`

### Using TypeScript

```bash
npx ts-node scripts/export-to-json.ts
```

## Output

The export generates:
- **9 data JSON files** with normalized records
- **1 manifest file** with metadata about the export

### File Sizes (Example)

```
venues.json               5.4 MB  (14,150 records)
setlist-entries.json     21 MB   (39,160 records)
shows.json              1.7 MB   (2,852 records)
songs.json              800 KB   (1,233 records)
song-statistics.json    644 KB   (761 records)
guests.json             288 KB   (1,089 records)
liberation-list.json     39 KB   (62 records)
tours.json              7.7 KB   (36 records)
guest-appearances.json    2 B    (0 records)
─────────────────────────────────
manifest.json           1.9 KB   (metadata)
Total                   29.6 MB
```

## Manifest Format

The `manifest.json` file includes:

```json
{
  "version": "1.0.0",
  "timestamp": "2026-01-19T07:55:40.292Z",
  "recordCounts": {
    "venues": 14150,
    "songs": 1233,
    "tours": 36,
    "shows": 2852,
    "setlistEntries": 39160,
    "guests": 1089,
    "guestAppearances": 0,
    "liberationList": 62,
    "songStatistics": 761
  },
  "totalSize": 31044557,
  "files": [
    {
      "name": "venues.json",
      "path": "/path/to/file",
      "size": 5712260,
      "recordCount": 14150
    }
    // ...
  ]
}
```

## Data Denormalization

The export uses denormalization for offline-first access patterns:

### Shows
Embed venue and tour information:
```typescript
interface DexieShow {
  id: number;
  date: string;
  venueId: number;
  tourId: number;
  // Embedded
  venue: {
    id: number;
    name: string;
    city: string;
    state: string | null;
    // ...
  };
  tour: {
    id: number;
    name: string;
    year: number;
    // ...
  };
  year: number; // Extracted from date for filtering
}
```

### Setlist Entries
Embed song info and show metadata:
```typescript
interface DexieSetlistEntry {
  id: number;
  showId: number;
  songId: number;
  position: number;
  setName: SetType;
  slot: SlotType;
  // Embedded song
  song: {
    id: number;
    title: string;
    slug: string;
    isCover: boolean;
    totalPerformances: number;
    // ...
  };
  showDate: string; // From show
  year: number; // From show date
}
```

### Liberation List
Embed song and show venue info:
```typescript
interface DexieLiberationEntry {
  id: number;
  songId: number;
  lastPlayedDate: string;
  lastPlayedShowId: number;
  daysSince: number;
  showsSince: number;
  // Embedded song
  song: {
    id: number;
    title: string;
    slug: string;
    isCover: boolean;
    totalPerformances: number;
  };
  // Embedded show/venue info
  lastShow: {
    id: number;
    date: string;
    venue: {
      name: string;
      city: string;
      state: string | null;
    };
  };
}
```

## Field Mapping

The script automatically maps SQLite snake_case columns to camelCase TypeScript properties:

| SQLite | Dexie |
|--------|-------|
| `country_code` | `countryCode` |
| `venue_type` | `venueType` |
| `total_shows` | `totalShows` |
| `first_show_date` | `firstShowDate` |
| `is_cover` | `isCover` |
| `original_artist` | `originalArtist` |
| `total_performances` | `totalPerformances` |
| `opener_count` | `openerCount` |
| `set_name` | `setName` |
| `duration_seconds` | `durationSeconds` |
| `segue_into_song_id` | `segueIntoSongId` |
| `is_segue` | `isSegue` |
| `slot_opener` | `slotOpener` |
| `version_full` | `versionFull` |
| `avg_duration_seconds` | `avgDurationSeconds` |
| `longest_duration_seconds` | `longestDurationSeconds` |
| `longest_show_id` | `longestShowId` |
| `shortest_duration_seconds` | `shortestDurationSeconds` |
| `shortest_show_id` | `shortestShowId` |
| `release_count_total` | `releaseCountTotal` |
| `release_count_studio` | `releaseCountStudio` |
| `release_count_live` | `releaseCountLive` |
| `current_gap_days` | `currentGapDays` |
| `current_gap_shows` | `currentGapShows` |
| `plays_by_year` | `playsByYear` |
| `top_segues_into` | `topSeguesInto` |
| `top_segues_from` | `topSeguesFrom` |

## JSON Field Handling

Certain SQLite fields store JSON data. The export automatically parses these:

- `guests.instruments` - JSON array parsed to `string[]`
- `guest_appearances.instruments` - JSON array parsed to `string[]`
- `song_statistics.plays_by_year` - JSON parsed to `Record<number, number>`
- `song_statistics.top_segues_into` - JSON parsed to array of objects
- `song_statistics.top_segues_from` - JSON parsed to array of objects

## Search Text Fields

For efficient searching, the export creates composite `searchText` fields:

- **Venues**: `"{name} {city} {state} {country}".toLowerCase()`
- **Songs**: `"{title} {originalArtist}".toLowerCase()`
- **Guests**: `"{name} {instruments.join(' ')}".toLowerCase()`

These fields are indexed in Dexie for fast full-text-like searches.

## Performance Characteristics

### Export Time
- Total export time: ~2-3 seconds (14,000+ venues, 39,000+ setlist entries)
- Database operations are streaming and transaction-based for efficiency
- Files are written sequentially to avoid memory pressure

### File Size Optimization
- **setlist-entries.json** is the largest at 21 MB due to 39,160 records with embedded song data
- **venues.json** is 5.4 MB with 14,150 records (appears to be geocoded data)
- **songs.json** is 800 KB with 1,233 records
- Total export: ~30 MB (compresses to ~3-5 MB with gzip)

### Dexie Loading
When importing into Dexie:
```typescript
async function seedDatabase(db: DexieDB) {
  const manifest = await fetch('/data/manifest.json').then(r => r.json());

  const venues = await fetch('/data/venues.json').then(r => r.json());
  await db.venues.bulkAdd(venues);

  const songs = await fetch('/data/songs.json').then(r => r.json());
  await db.songs.bulkAdd(songs);

  // ... and so on for other entities
}
```

## Dependency Order

The export respects entity dependencies:

1. **Venues** (no dependencies)
2. **Songs** (no dependencies)
3. **Tours** (no dependencies)
4. **Shows** (depends on Venues, Tours)
5. **Setlist Entries** (depends on Shows, Songs)
6. **Guests** (no dependencies)
7. **Guest Appearances** (depends on Shows)
8. **Liberation List** (depends on Songs, Shows)
9. **Song Statistics** (depends on Songs)

This ensures that when importing into Dexie, you can process files in any order without foreign key constraint violations.

## Updating the Export

When data changes in SQLite:

```bash
# Re-export after data updates
npm run export

# Or with TypeScript directly
npx ts-node scripts/export-to-json.ts
```

The script will:
- Read all current data from SQLite
- Transform to Dexie format
- Overwrite existing JSON files
- Update manifest with new timestamps and record counts

## Integration with Service Worker

The PWA service worker can detect changes by checking the manifest:

```typescript
// Check if data needs updating
async function needsDataUpdate() {
  const remote = await fetch('/data/manifest.json').then(r => r.json());
  const local = await db.syncMeta.get('sync_state');

  return local?.lastFullSync === null ||
         new Date(remote.timestamp) > new Date(local.lastFullSync);
}

// Load data if needed
async function seedDataIfNeeded() {
  if (await needsDataUpdate()) {
    const manifest = await fetch('/data/manifest.json').then(r => r.json());

    for (const file of manifest.files) {
      const data = await fetch(file.path).then(r => r.json());
      const tableName = getTableName(file.name);
      await db[tableName].bulkAdd(data, { allKeys: true });
    }

    await db.syncMeta.update('sync_state', {
      lastFullSync: Date.now(),
      serverVersion: manifest.version,
    });
  }
}
```

## Troubleshooting

### Guest Appearances is Empty

The database may not have guest appearance data populated. The export will create an empty `guest-appearances.json` file (2 bytes), which is valid.

### Large File Size

The 21 MB setlist-entries.json file is due to:
- 39,160 records
- Embedded song data for each entry
- Full position and set information

To reduce size for slower connections, consider:
- Lazy loading setlist entries by show
- Compressing with gzip on the server
- Serving via HTTP/2

### Export Hangs

If the export appears to hang:
- Check database file is not locked: `lsof | grep dmb-almanac.db`
- Ensure disk space available: `df -h`
- Check for long-running queries blocking the export

## Script Architecture

The export script uses:
- **better-sqlite3**: Synchronous database access for simple sequential reads
- **Streaming writes**: Each file written after all data is queried (prevents memory issues)
- **Transaction batching**: Respects database's transaction model
- **Type safety**: Full TypeScript types matching Dexie schema

## Future Enhancements

Possible improvements:
- Incremental exports (only updated records since last export)
- Compression (gzip for public/data files)
- Streaming JSON for very large files
- Sharded exports for parallel Dexie import
- Diff detection for sync protocols
