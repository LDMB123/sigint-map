# Skill: Dexie Migration Safety Tests + Rollback Plan

**ID**: `dexie-migration-safety`
**Category**: Local-First / IndexedDB
**Agent**: Local-First Data Steward / QA Engineer

---

## When to Use

- Before any schema version upgrade
- After migration failures
- When adding/removing tables or indexes
- Data integrity verification

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| from_version | number | Yes | Current schema version |
| to_version | number | Yes | Target schema version |

---

## Steps

### Step 1: Document Migration Changes

```typescript
// What's changing?
const MIGRATION_CHANGES = {
  fromVersion: 3,
  toVersion: 4,
  changes: [
    { type: 'ADD_INDEX', table: 'shows', index: '[year+month]' },
    { type: 'ADD_TABLE', table: 'notifications' },
    { type: 'ADD_FIELD', table: 'songs', field: 'lastModified' },
  ],
};
```

### Step 2: Create Migration Test File

```typescript
// __tests__/integration/dexie-migration-v3-to-v4.spec.ts
import Dexie from 'dexie';
import { DEXIE_SCHEMA } from '@/lib/db/dexie/schema';

const TEST_DB = 'migration-test-db';

describe('Migration v3 → v4', () => {
  afterEach(async () => {
    await Dexie.delete(TEST_DB);
  });

  it('should create database with v3 schema', async () => {
    const db = new Dexie(TEST_DB);
    db.version(3).stores(DEXIE_SCHEMA[3]);
    await db.open();
    expect(db.verno).toBe(3);
    await db.close();
  });

  it('should preserve data during upgrade', async () => {
    // Create v3 with data
    const dbV3 = new Dexie(TEST_DB);
    dbV3.version(3).stores(DEXIE_SCHEMA[3]);
    await dbV3.open();

    await dbV3.table('shows').bulkAdd([
      { id: 1, date: '2024-01-01', venueId: 100 },
      { id: 2, date: '2024-02-01', venueId: 101 },
    ]);

    const countBefore = await dbV3.table('shows').count();
    await dbV3.close();

    // Upgrade to v4
    const dbV4 = new Dexie(TEST_DB);
    dbV4.version(3).stores(DEXIE_SCHEMA[3]);
    dbV4.version(4).stores(DEXIE_SCHEMA[4]);
    await dbV4.open();

    // Verify data preserved
    const countAfter = await dbV4.table('shows').count();
    expect(countAfter).toBe(countBefore);

    const shows = await dbV4.table('shows').toArray();
    expect(shows[0]).toMatchObject({ id: 1, date: '2024-01-01' });

    await dbV4.close();
  });

  it('should create new indexes', async () => {
    const dbV4 = new Dexie(TEST_DB);
    dbV4.version(4).stores(DEXIE_SCHEMA[4]);
    await dbV4.open();

    const showsSchema = dbV4.table('shows').schema;
    const indexNames = showsSchema.indexes.map(i => i.name);

    expect(indexNames).toContain('[year+month]');
    await dbV4.close();
  });

  it('should handle upgrade function', async () => {
    const dbV4 = new Dexie(TEST_DB);
    dbV4.version(3).stores(DEXIE_SCHEMA[3]);
    dbV4.version(4).stores(DEXIE_SCHEMA[4]).upgrade(async tx => {
      // Migration logic
      await tx.table('songs').toCollection().modify(song => {
        song.lastModified = song.lastModified ?? new Date().toISOString();
      });
    });

    await dbV4.open();

    const songs = await dbV4.table('songs').toArray();
    songs.forEach(song => {
      expect(song.lastModified).toBeDefined();
    });

    await dbV4.close();
  });
});
```

### Step 3: Test Edge Cases

```typescript
describe('Migration Edge Cases', () => {
  it('should handle empty database', async () => {
    const db = new Dexie(TEST_DB);
    db.version(3).stores(DEXIE_SCHEMA[3]);
    db.version(4).stores(DEXIE_SCHEMA[4]);
    await db.open();

    const count = await db.table('shows').count();
    expect(count).toBe(0);
    await db.close();
  });

  it('should handle large dataset', async () => {
    const db = new Dexie(TEST_DB);
    db.version(3).stores(DEXIE_SCHEMA[3]);
    await db.open();

    // Insert 10,000 records
    const shows = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      date: '2024-01-01',
      venueId: 1,
    }));
    await db.table('shows').bulkAdd(shows);
    await db.close();

    // Upgrade
    const dbV4 = new Dexie(TEST_DB);
    dbV4.version(3).stores(DEXIE_SCHEMA[3]);
    dbV4.version(4).stores(DEXIE_SCHEMA[4]);
    await dbV4.open();

    const count = await dbV4.table('shows').count();
    expect(count).toBe(10000);
    await dbV4.close();
  });

  it('should handle corrupted data gracefully', async () => {
    // Simulate corrupted record
    const db = new Dexie(TEST_DB);
    db.version(3).stores(DEXIE_SCHEMA[3]);
    await db.open();

    await db.table('shows').add({ id: 1, date: null, venueId: undefined });
    await db.close();

    // Upgrade should not crash
    const dbV4 = new Dexie(TEST_DB);
    dbV4.version(3).stores(DEXIE_SCHEMA[3]);
    dbV4.version(4).stores(DEXIE_SCHEMA[4]).upgrade(async tx => {
      await tx.table('shows').toCollection().modify(show => {
        show.date = show.date ?? 'unknown';
        show.venueId = show.venueId ?? 0;
      });
    });

    await expect(dbV4.open()).resolves.not.toThrow();
    await dbV4.close();
  });
});
```

### Step 4: Create Rollback Plan

```typescript
// lib/db/dexie/rollback.ts
export async function rollbackToVersion(targetVersion: number) {
  const db = await openDatabase();
  const currentVersion = db.verno;

  if (targetVersion >= currentVersion) {
    throw new Error('Can only rollback to lower version');
  }

  // Export all data
  const backup: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    backup[table.name] = await table.toArray();
  }

  // Close and delete
  await db.close();
  await Dexie.delete(db.name);

  // Recreate with target version
  const newDb = new Dexie(db.name);
  // Apply schema versions up to target
  for (let v = 1; v <= targetVersion; v++) {
    newDb.version(v).stores(DEXIE_SCHEMA[v]);
  }
  await newDb.open();

  // Restore data (filtering incompatible fields)
  for (const [tableName, records] of Object.entries(backup)) {
    if (newDb.tables.find(t => t.name === tableName)) {
      await newDb.table(tableName).bulkPut(records);
    }
  }

  return newDb;
}
```

### Step 5: Pre-Migration Backup

```typescript
// lib/db/dexie/backup.ts
export async function backupDatabase(): Promise<string> {
  const db = await openDatabase();
  const backup: Record<string, unknown[]> = {};

  for (const table of db.tables) {
    backup[table.name] = await table.toArray();
  }

  const json = JSON.stringify({
    version: db.verno,
    timestamp: new Date().toISOString(),
    tables: backup,
  });

  // Store in localStorage (limited size) or download
  localStorage.setItem('dexie-backup', json);

  return json;
}

export async function restoreFromBackup(backupJson: string) {
  const backup = JSON.parse(backupJson);
  const db = await openDatabase();

  await db.transaction('rw', db.tables, async () => {
    for (const [tableName, records] of Object.entries(backup.tables)) {
      const table = db.table(tableName);
      await table.clear();
      await table.bulkPut(records as unknown[]);
    }
  });
}
```

### Step 6: Run Migration Tests

```bash
# Run migration tests
npm test -- --grep "Migration"

# Run with coverage
npm run test:coverage -- --grep "Migration"
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| migration-test-report.md | `.claude/artifacts/` | Test results |
| rollback-plan.md | `.claude/artifacts/` | Rollback instructions |
| backup.json | `.claude/artifacts/` | Pre-migration backup |

---

## Output Template

```markdown
## Migration Safety Report

### Migration
- From: Version [N]
- To: Version [M]
- Date: [YYYY-MM-DD]

### Changes
| Type | Table | Detail |
|------|-------|--------|
| ADD_INDEX | shows | [year+month] |
| ADD_FIELD | songs | lastModified |

### Test Results
| Test | Result | Duration |
|------|--------|----------|
| Data preservation | ✅ Pass | 1.2s |
| New indexes | ✅ Pass | 0.5s |
| Upgrade function | ✅ Pass | 0.8s |
| Empty DB | ✅ Pass | 0.2s |
| Large dataset | ✅ Pass | 5.3s |
| Corrupted data | ✅ Pass | 0.4s |

### Backup Created
- Location: localStorage['dexie-backup']
- Size: [X] KB
- Tables: [N]
- Records: [N]

### Rollback Plan

#### If migration fails:
```typescript
await rollbackToVersion(3);
```

#### If data corrupted:
```typescript
await restoreFromBackup(localStorage.getItem('dexie-backup'));
```

### Recommendations
1. [Recommendation]
```
