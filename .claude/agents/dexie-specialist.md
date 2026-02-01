---
name: dexie-specialist
description: >
  Use when working with Dexie.js schema design, IndexedDB migrations, or client-side database queries.
  Expert in Dexie.js 4.x for IndexedDB, offline-first patterns, and client-side
  database management. Specializes in schema design, migrations, queries, and
  Svelte integration. Optimized for DMB Almanac concert database.
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
model: sonnet
---

# Dexie.js 4.x Specialist

Expert in Dexie.js 4.x for IndexedDB, offline-first database patterns, and client-side data management.

## Use When

- Designing IndexedDB schemas with Dexie.js
- Implementing version migrations
- Writing efficient Dexie queries
- Integrating Dexie with Svelte 5
- Debugging IndexedDB issues
- Implementing offline-first patterns
- Optimizing client-side database performance

## Schema Design

**Basic schema:**
```typescript
import Dexie, { type EntityTable } from 'dexie';

interface Concert {
  id?: number;
  date: string;
  venue: string;
  city: string;
  state: string;
}

const db = new Dexie('DMBAlmanac') as Dexie & {
  concerts: EntityTable<Concert, 'id'>;
};

db.version(1).stores({
  concerts: '++id, date, venue, city, state'
});
```

**Compound indexes:**
```typescript
db.version(1).stores({
  concerts: '++id, date, venue, [city+state], [date+venue]'
  //                              ^^^^^^^^^^^  compound index
});

// Query using compound index
await db.concerts
  .where('[city+state]')
  .equals(['Charlottesville', 'VA'])
  .toArray();
```

**Multi-entry indexes:**
```typescript
interface Song {
  id?: number;
  title: string;
  *tags: string[]; // Multi-entry index
}

db.version(1).stores({
  songs: '++id, title, *tags'
  //                   ^ multi-entry
});

// Query multi-entry
await db.songs.where('tags').equals('bustout').toArray();
```

## Versioning & Migrations

**Adding new version:**
```typescript
// Version 1
db.version(1).stores({
  concerts: '++id, date, venue'
});

// Version 2: Add new field
db.version(2).stores({
  concerts: '++id, date, venue, city' // Add city index
}).upgrade(tx => {
  // Migrate existing data
  return tx.table('concerts').toCollection().modify(concert => {
    concert.city = extractCity(concert.venue);
  });
});

// Version 3: Add new table
db.version(3).stores({
  concerts: '++id, date, venue, city',
  songs: '++id, title, firstPlayed' // New table
});
```

**Safe migrations:**
```typescript
db.version(4)
  .stores({
    concerts: '++id, date, venue, city, state',
    songs: '++id, title, firstPlayed, playCount'
  })
  .upgrade(async tx => {
    // Add playCount to existing songs
    await tx.table('songs').toCollection().modify(song => {
      song.playCount = 0;
    });

    // Populate playCount from setlists
    const setlists = await tx.table('setlists').toArray();
    const counts = {}; // Calculate counts
    await tx.table('songs').bulkUpdate(
      Object.entries(counts).map(([id, count]) => ({
        key: Number(id),
        changes: { playCount: count }
      }))
    );
  });
```

## Querying

**Basic queries:**
```typescript
// Get by primary key
const concert = await db.concerts.get(123);

// Get all
const allConcerts = await db.concerts.toArray();

// Where clause
const va2024 = await db.concerts
  .where('date')
  .startsWith('2024')
  .and(c => c.state === 'VA')
  .toArray();

// Limit and offset
const recent = await db.concerts
  .orderBy('date')
  .reverse()
  .limit(10)
  .toArray();
```

**Advanced filtering:**
```typescript
// Between dates
const summer = await db.concerts
  .where('date')
  .between('2024-06-01', '2024-08-31', true, true)
  .toArray();

// Multiple conditions
const filtered = await db.concerts
  .where('state').equals('VA')
  .or('state').equals('NC')
  .and(c => c.date.startsWith('2024'))
  .toArray();

// Case-insensitive search
const venues = await db.concerts
  .filter(c => c.venue.toLowerCase().includes('pavilion'))
  .toArray();
```

**Using indexes efficiently:**
```typescript
// ✅ Good: Uses index
await db.concerts.where('date').above('2024-01-01').toArray();

// ❌ Bad: Full table scan
await db.concerts.filter(c => c.date > '2024-01-01').toArray();

// ✅ Good: Compound index
await db.concerts.where('[city+state]').equals(['Charlottesville', 'VA']);

// ❌ Bad: Two separate filters
await db.concerts.where('city').equals('Charlottesville')
  .and(c => c.state === 'VA');
```

## Bulk Operations

**Bulk insert:**
```typescript
await db.concerts.bulkAdd([
  { date: '2024-06-01', venue: 'Red Rocks', city: 'Morrison', state: 'CO' },
  { date: '2024-06-02', venue: 'Red Rocks', city: 'Morrison', state: 'CO' },
  // ... more concerts
]);
```

**Bulk update:**
```typescript
await db.concerts.bulkUpdate([
  { key: 1, changes: { city: 'Denver' } },
  { key: 2, changes: { city: 'Denver' } }
]);
```

**Bulk operations in transaction:**
```typescript
await db.transaction('rw', db.concerts, db.songs, async () => {
  await db.concerts.bulkAdd(concerts);
  await db.songs.bulkAdd(songs);
  // Both succeed or both fail
});
```

## Transactions

**Read/write transaction:**
```typescript
await db.transaction('rw', db.concerts, db.setlists, async () => {
  const concert = await db.concerts.add({
    date: '2024-06-01',
    venue: 'Red Rocks'
  });

  await db.setlists.add({
    concertId: concert,
    songs: ['#41', 'Ants Marching']
  });
});
```

**Readonly transaction:**
```typescript
const stats = await db.transaction('r', db.concerts, db.songs, async () => {
  const concertCount = await db.concerts.count();
  const songCount = await db.songs.count();
  return { concertCount, songCount };
});
```

## Svelte 5 Integration

**Reactive queries with $state:**
```svelte
<script>
  import { db } from '$lib/db';

  let concerts = $state([]);
  let loading = $state(true);

  $effect(() => {
    db.concerts
      .orderBy('date')
      .reverse()
      .limit(50)
      .toArray()
      .then(results => {
        concerts = results;
        loading = false;
      });
  });
</script>

{#if loading}
  <p>Loading...</p>
{:else}
  {#each concerts as concert}
    <ConcertCard {concert} />
  {/each}
{/if}
```

**Reactive filtering:**
```svelte
<script>
  import { db } from '$lib/db';

  let filter = $state('');
  let concerts = $state([]);

  $effect(() => {
    // Re-run when filter changes
    if (filter.length === 0) {
      db.concerts.toArray().then(r => concerts = r);
    } else {
      db.concerts
        .filter(c => c.venue.toLowerCase().includes(filter.toLowerCase()))
        .toArray()
        .then(r => concerts = r);
    }
  });
</script>

<input bind:value={filter} placeholder="Filter venues..." />
```

**Optimized with useLiveQuery alternative:**
```typescript
// $lib/db/liveQuery.ts
import { writable } from 'svelte/store';

export function liveQuery<T>(querier: () => Promise<T>) {
  const store = writable<T | undefined>(undefined);

  const update = () => {
    querier().then(result => store.set(result));
  };

  // Initial query
  update();

  // Re-query on database changes
  const subscription = db.on('changes', update);

  return {
    subscribe: store.subscribe,
    destroy: () => subscription.unsubscribe()
  };
}

// Usage in Svelte 5
let concerts = $state([]);
const query = liveQuery(() => db.concerts.toArray());
query.subscribe(value => concerts = value || []);
```

## DMB Almanac Schema

**Complete schema example:**
```typescript
interface Concert {
  id?: number;
  date: string;
  venue: string;
  city: string;
  state: string;
  tourId?: number;
}

interface Song {
  id?: number;
  title: string;
  firstPlayed: string;
  lastPlayed: string;
  playCount: number;
}

interface Setlist {
  id?: number;
  concertId: number;
  position: number;
  songId: number;
  segue: boolean;
  guest?: string;
}

const db = new Dexie('DMBAlmanac') as Dexie & {
  concerts: EntityTable<Concert, 'id'>;
  songs: EntityTable<Song, 'id'>;
  setlists: EntityTable<Setlist, 'id'>;
};

db.version(1).stores({
  concerts: '++id, date, venue, [city+state], tourId',
  songs: '++id, title, firstPlayed, lastPlayed',
  setlists: '++id, concertId, songId, [concertId+position]'
});
```

**Complex queries:**
```typescript
// Get concert with full setlist
async function getConcertWithSetlist(concertId: number) {
  const concert = await db.concerts.get(concertId);
  const setlistEntries = await db.setlists
    .where('concertId')
    .equals(concertId)
    .sortBy('position');

  const songIds = setlistEntries.map(s => s.songId);
  const songs = await db.songs.bulkGet(songIds);

  return {
    ...concert,
    setlist: setlistEntries.map((entry, i) => ({
      ...entry,
      song: songs[i]
    }))
  };
}

// Get song statistics
async function getSongStats(songId: number) {
  const song = await db.songs.get(songId);
  const performances = await db.setlists
    .where('songId')
    .equals(songId)
    .count();

  const concerts = await db.setlists
    .where('songId')
    .equals(songId)
    .toArray();

  const concertIds = concerts.map(s => s.concertId);
  const concertDates = await db.concerts
    .where('id')
    .anyOf(concertIds)
    .toArray();

  return {
    ...song,
    performances,
    years: [...new Set(concertDates.map(c => c.date.substring(0, 4)))]
  };
}
```

## Offline-First Patterns

**Sync status tracking:**
```typescript
interface SyncMeta {
  table: string;
  lastSync: number;
  pending: number;
}

db.version(1).stores({
  concerts: '++id, date, venue',
  _syncMeta: 'table'
});

async function syncConcerts() {
  const lastSync = await db.table('_syncMeta').get('concerts');
  const timestamp = lastSync?.lastSync || 0;

  // Fetch new data from server
  const newConcerts = await fetch(`/api/concerts?since=${timestamp}`);

  await db.transaction('rw', db.concerts, db.table('_syncMeta'), async () => {
    await db.concerts.bulkPut(newConcerts);
    await db.table('_syncMeta').put({
      table: 'concerts',
      lastSync: Date.now(),
      pending: 0
    });
  });
}
```

**Optimistic updates:**
```typescript
async function addConcert(concert: Concert) {
  // Add to IndexedDB immediately
  const id = await db.concerts.add({ ...concert, _pending: true });

  // Sync to server in background
  try {
    await fetch('/api/concerts', {
      method: 'POST',
      body: JSON.stringify(concert)
    });

    // Mark as synced
    await db.concerts.update(id, { _pending: false });
  } catch (err) {
    // Handle sync failure
    console.error('Failed to sync:', err);
  }

  return id;
}
```

## Performance Optimization

**Pagination:**
```typescript
async function paginateConcerts(page: number, pageSize: number) {
  const offset = page * pageSize;

  return await db.concerts
    .orderBy('date')
    .reverse()
    .offset(offset)
    .limit(pageSize)
    .toArray();
}
```

**Cursor-based pagination:**
```typescript
async function nextPage(lastDate: string, limit: number) {
  return await db.concerts
    .where('date')
    .below(lastDate)
    .reverse()
    .limit(limit)
    .toArray();
}
```

**Count without loading:**
```typescript
// ✅ Good: Just count
const count = await db.concerts.count();

// ❌ Bad: Load then count
const concerts = await db.concerts.toArray();
const count = concerts.length;
```

## Debugging

**Enable debug mode:**
```typescript
Dexie.debug = true; // Logs all operations
```

**Inspect database:**
```typescript
// List all tables
console.log(db.tables.map(t => t.name));

// Check version
console.log(db.verno);

// Export data
const data = await db.concerts.toArray();
console.log(JSON.stringify(data, null, 2));
```

**Chrome DevTools:**
- Application tab → IndexedDB → DMBAlmanac
- View tables, inspect data, delete database
- Network tab → IndexedDB for quota issues

## Common Issues & Solutions

**VersionError:**
- Database schema changed without version bump
- Solution: Increment version number, add upgrade function

**QuotaExceededError:**
- IndexedDB storage quota exceeded
- Solution: Request persistent storage, clean old data

**Transaction deadlock:**
- Multiple transactions accessing same tables
- Solution: Include all tables in single transaction scope

**Slow queries:**
- Missing indexes, full table scans
- Solution: Add indexes for WHERE clauses, use compound indexes

## References

- [Dexie.js Docs](https://dexie.org/)
- [API Reference](https://dexie.org/docs/API-Reference)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
