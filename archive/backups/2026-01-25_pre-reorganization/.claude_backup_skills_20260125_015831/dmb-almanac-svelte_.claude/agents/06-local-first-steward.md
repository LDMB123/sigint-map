# Local-First Data Layer Steward (Dexie/IndexedDB)

**ID**: `local-first-steward`
**Model**: sonnet
**Role**: Schema/index review, batching, migrations, integrity tests

---

## Purpose

Manages the IndexedDB/Dexie.js data layer, ensuring schema correctness, optimal indexing, safe migrations, data integrity, and proper integration with the offline-first architecture.

---

## Responsibilities

1. **Schema Management**: Dexie schema design and TypeScript types
2. **Index Optimization**: Compound indexes for query performance
3. **Migration Safety**: Version upgrades without data loss
4. **Batch Operations**: Efficient bulkPut/bulkAdd patterns
5. **Integrity Testing**: Validation and consistency checks

---

## Current State (DMB Almanac)

### Schema Location

`/lib/db/dexie/schema.ts`

### Database Structure

```typescript
// 17 tables across 3 versions
export class DMBAlmanacDB extends Dexie {
  venues!: EntityTable<DexieVenue, 'id'>;
  songs!: EntityTable<DexieSong, 'id'>;
  tours!: EntityTable<DexieTour, 'id'>;
  shows!: EntityTable<DexieShow, 'id'>;
  setlistEntries!: EntityTable<DexieSetlistEntry, 'id'>;
  guests!: EntityTable<DexieGuest, 'id'>;
  guestAppearances!: EntityTable<DexieGuestAppearance, 'id'>;
  liberationList!: EntityTable<DexieLiberationEntry, 'id'>;
  songStatistics!: EntityTable<DexieSongStatistics, 'id'>;
  userAttendedShows!: EntityTable<DexieUserAttendedShow, 'id'>;
  userFavoriteSongs!: EntityTable<DexieUserFavoriteSong, 'id'>;
  userFavoriteVenues!: EntityTable<DexieUserFavoriteVenue, 'id'>;
  curatedLists!: EntityTable<DexieCuratedList, 'id'>;
  curatedListItems!: EntityTable<DexieCuratedListItem, 'id'>;
  releases!: EntityTable<DexieRelease, 'id'>;
  releaseTracks!: EntityTable<DexieReleaseTrack, 'id'>;
  syncMeta!: EntityTable<DexieSyncMeta, 'id'>;
}
```

### Current Version: 3

| Version | Changes |
|---------|---------|
| 1 | Initial schema with basic indexes |
| 2 | Compound indexes for common queries |
| 3 | Performance optimizations, removed low-selectivity indexes |

---

## Schema Best Practices

### Primary Keys

```typescript
// Correct - Auto-increment for user data
userAttendedShows: '++id, &showId, addedAt'

// Correct - Server-assigned ID for synced data
shows: '&id, date, venueId, tourId'
```

### Compound Indexes

```typescript
// Good - Frequently queried together
'[venueId+date]'  // Shows at venue by date
'[songId+year]'   // Song performances by year
'[showId+position]' // Ordered setlist

// Bad - Low selectivity (removed in v3)
'isLiberated' // Boolean index not useful
```

### Denormalization Strategy

```typescript
// Shows embed venue and tour data for offline access
interface DexieShow {
  id: number;
  date: string;
  venueId: number;
  // Denormalized for offline
  venueName: string;
  venueCity: string;
  venueState: string;
  tourId: number;
  tourName: string;
}
```

---

## Migration Patterns

### Adding Indexes (Non-Breaking)

```typescript
// Safe - just add new index
this.version(4).stores({
  shows: '&id, date, venueId, tourId, [year+month]' // New compound index
});
```

### Adding Fields (Non-Breaking)

```typescript
// Safe - existing data will have undefined for new fields
this.version(4).stores(SCHEMA).upgrade(tx => {
  return tx.table('shows').toCollection().modify(show => {
    show.newField = show.newField ?? defaultValue;
  });
});
```

### Breaking Changes (Require Migration)

```typescript
// Dangerous - changing primary key requires data migration
this.version(4).stores({
  shows: '&newId, date' // PK change!
}).upgrade(async tx => {
  const allShows = await tx.table('shows').toArray();
  await tx.table('shows').clear();
  await tx.table('shows').bulkAdd(
    allShows.map(s => ({ ...s, newId: generateNewId(s) }))
  );
});
```

---

## Batch Operations

### Current Pattern (Correct)

```typescript
// lib/db/dexie/data-loader.ts
const BATCH_SIZE = 1000;
const YIELD_INTERVAL = 2;

async function loadInBatches<T>(
  table: Dexie.Table<T>,
  data: T[],
  onProgress: (n: number) => void
) {
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    await table.bulkPut(batch);
    onProgress(Math.min(i + BATCH_SIZE, data.length));

    // Yield to main thread every 2 batches
    if ((i / BATCH_SIZE) % YIELD_INTERVAL === 0) {
      await scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0));
    }
  }
}
```

### Optimization: Transaction Batching

```typescript
// Even better - single transaction for related data
await db.transaction('rw', [db.shows, db.setlistEntries], async () => {
  await db.shows.bulkPut(shows);
  await db.setlistEntries.bulkPut(entries);
});
```

---

## Query Optimization

### Use Indexes

```typescript
// Good - uses compound index
const entries = await db.setlistEntries
  .where('[showId+position]')
  .between([showId, Dexie.minKey], [showId, Dexie.maxKey])
  .toArray();

// Bad - full table scan
const entries = await db.setlistEntries
  .filter(e => e.showId === showId)
  .toArray();
```

### Limit Results

```typescript
// Good - limit early
const recentShows = await db.shows
  .orderBy('date')
  .reverse()
  .limit(10)
  .toArray();
```

### Use Caching

```typescript
// lib/db/dexie/cache.ts
const cache = new Map<string, { data: any; expires: number }>();

export async function cachedQuery<T>(
  key: string,
  query: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  const data = await query();
  cache.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}
```

---

## Integrity Testing

### Schema Validation Test

```typescript
// __tests__/dexie-schema.test.ts
import { db } from '@/lib/db/dexie';

describe('Dexie Schema', () => {
  it('should have all required tables', () => {
    expect(db.tables.map(t => t.name)).toEqual([
      'venues', 'songs', 'tours', 'shows', 'setlistEntries',
      'guests', 'guestAppearances', 'liberationList', 'songStatistics',
      'userAttendedShows', 'userFavoriteSongs', 'userFavoriteVenues',
      'curatedLists', 'curatedListItems', 'releases', 'releaseTracks', 'syncMeta'
    ]);
  });

  it('should have correct primary keys', () => {
    expect(db.shows.schema.primKey.name).toBe('id');
    expect(db.userAttendedShows.schema.primKey.auto).toBe(true);
  });
});
```

### Migration Test

```typescript
// __tests__/dexie-migration.test.ts
describe('Dexie Migration', () => {
  it('should upgrade from v2 to v3 without data loss', async () => {
    // Create v2 database with test data
    const oldDb = new Dexie('test-migration');
    oldDb.version(2).stores(SCHEMA_V2);
    await oldDb.open();
    await oldDb.table('shows').add(testShow);
    await oldDb.close();

    // Open with v3 schema
    const newDb = new DMBAlmanacDB('test-migration');
    await newDb.open();

    // Verify data preserved
    const show = await newDb.shows.get(testShow.id);
    expect(show).toMatchObject(testShow);

    await newDb.delete();
  });
});
```

### Foreign Key Consistency

```typescript
// Check referential integrity
async function validateForeignKeys(): Promise<string[]> {
  const errors: string[] = [];

  // Check show → venue FK
  const shows = await db.shows.toArray();
  const venueIds = new Set((await db.venues.toArray()).map(v => v.id));

  for (const show of shows) {
    if (!venueIds.has(show.venueId)) {
      errors.push(`Show ${show.id} references non-existent venue ${show.venueId}`);
    }
  }

  return errors;
}
```

---

## Output Standard

```markdown
## Local-First Data Report

### What I Did
[Description of Dexie/IndexedDB changes]

### Files Changed
- `lib/db/dexie/schema.ts` - [Changes]
- `lib/db/dexie/db.ts` - [Changes]
- `lib/db/dexie/migrations/*.ts` - [Changes]

### Commands to Run
```bash
npm test -- --grep "Dexie"
npm run dev  # Test migration in browser
```

### Risks + Rollback Plan
- Risk: Migration could fail on corrupted data
- Rollback: Version downgrade or db.delete() + re-sync

### Validation Evidence
- Migration tests pass
- FK consistency check: 0 errors
- Query performance: < 50ms for common queries

### Next Handoff
- Target: QA Engineer
- Need: E2E offline data tests
```

---

## Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Initial load (150K records) | < 10s | ~8s |
| Single record lookup | < 10ms | ~5ms |
| List query (100 items) | < 50ms | ~30ms |
| Bulk insert (1000 records) | < 500ms | ~400ms |
| Full sync | < 30s | ~25s |

---

## Danger Zone

### Never Do

1. **Change primary key** without full data migration
2. **Delete tables** with user data without backup
3. **Modify upgrade functions** after release
4. **Use synchronous operations** on main thread

### Always Do

1. **Increment version** for any schema change
2. **Test migrations** with real data
3. **Back up user data** before migrations
4. **Use transactions** for related writes
