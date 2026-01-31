---
name: sveltekit-dexie-migration-safety
description: "sveltekit dexie migration safety for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Skill: Dexie Migration Safety Tests + Rollback Plan

**ID**: `dexie-migration-safety`
**Category**: Database / IndexedDB
**Framework**: SvelteKit

---

## When to Use

- Before any Dexie schema version upgrade
- After schema migration failures
- When adding/removing tables or indexes
- Data integrity verification
- Testing migration with production data size

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to SvelteKit project root |
| from_version | number | Yes | Current schema version |
| to_version | number | Yes | Target schema version |
| schema_changes | string | No | Description of changes (e.g., "Add users.lastLogin index") |

---

## Steps

### Step 1: Document Migration Changes

Create a clear specification of what's changing in the migration.

```typescript
// Document changes for v3 → v4 migration
const MIGRATION_CHANGES = {
  fromVersion: 3,
  toVersion: 4,
  changes: [
    {
      type: 'ADD_INDEX',
      table: 'posts',
      index: '[authorId+publishedAt]',
      reason: 'Optimize author timeline queries'
    },
    {
      type: 'ADD_TABLE',
      table: 'notifications',
      schema: '++id, userId, type, read, createdAt'
    },
    {
      type: 'ADD_FIELD',
      table: 'users',
      field: 'lastLoginAt',
      default: null
    },
    {
      type: 'REMOVE_INDEX',
      table: 'posts',
      index: 'status',
      reason: 'Unused - only 2 possible values'
    }
  ],
};
```

### Step 2: Create Migration Test File

Create comprehensive tests for the migration in your test directory.

```typescript
// src/lib/db/__tests__/migration-v3-to-v4.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import Dexie from 'dexie';
import { SCHEMA_V3, SCHEMA_V4 } from '$lib/db/schema';

const TEST_DB_NAME = 'migration-test-db';

describe('Migration v3 → v4', () => {
  afterEach(async () => {
    // Clean up test database after each test
    await Dexie.delete(TEST_DB_NAME);
  });

  it('should create database with v3 schema', async () => {
    const db = new Dexie(TEST_DB_NAME);
    db.version(3).stores(SCHEMA_V3);
    await db.open();

    expect(db.verno).toBe(3);
    expect(db.tables.map(t => t.name)).toContain('posts');

    await db.close();
  });

  it('should preserve all data during upgrade', async () => {
    // Create v3 database with sample data
    const dbV3 = new Dexie(TEST_DB_NAME);
    dbV3.version(3).stores(SCHEMA_V3);
    await dbV3.open();

    // Insert test data
    await dbV3.table('users').bulkAdd([
      { id: 1, email: 'user1@example.com', name: 'User 1' },
      { id: 2, email: 'user2@example.com', name: 'User 2' },
    ]);

    await dbV3.table('posts').bulkAdd([
      { id: 1, authorId: 1, title: 'Post 1', publishedAt: '2024-01-01' },
      { id: 2, authorId: 1, title: 'Post 2', publishedAt: '2024-02-01' },
      { id: 3, authorId: 2, title: 'Post 3', publishedAt: '2024-03-01' },
    ]);

    const userCountBefore = await dbV3.table('users').count();
    const postCountBefore = await dbV3.table('posts').count();
    await dbV3.close();

    // Upgrade to v4
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4);
    await dbV4.open();

    // Verify all data preserved
    const userCountAfter = await dbV4.table('users').count();
    const postCountAfter = await dbV4.table('posts').count();

    expect(userCountAfter).toBe(userCountBefore);
    expect(postCountAfter).toBe(postCountBefore);

    const users = await dbV4.table('users').toArray();
    expect(users[0]).toMatchObject({ id: 1, email: 'user1@example.com' });

    const posts = await dbV4.table('posts').toArray();
    expect(posts[0]).toMatchObject({ id: 1, title: 'Post 1' });

    await dbV4.close();
  });

  it('should create new indexes', async () => {
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4);
    await dbV4.open();

    // Check that new indexes exist
    const postsSchema = dbV4.table('posts').schema;
    const indexNames = postsSchema.indexes.map(i => i.name);

    expect(indexNames).toContain('[authorId+publishedAt]');

    await dbV4.close();
  });

  it('should create new tables', async () => {
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4);
    await dbV4.open();

    expect(dbV4.tables.map(t => t.name)).toContain('notifications');

    await dbV4.close();
  });

  it('should execute upgrade function for data migration', async () => {
    // Create v3 with users lacking lastLoginAt
    const dbV3 = new Dexie(TEST_DB_NAME);
    dbV3.version(3).stores(SCHEMA_V3);
    await dbV3.open();

    await dbV3.table('users').bulkAdd([
      { id: 1, email: 'user1@example.com' },
      { id: 2, email: 'user2@example.com' },
    ]);
    await dbV3.close();

    // Upgrade to v4 with upgrade function
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4).upgrade(async tx => {
      // Add default value for new field
      await tx.table('users').toCollection().modify(user => {
        user.lastLoginAt = user.lastLoginAt ?? null;
      });
    });

    await dbV4.open();

    // Verify upgrade function ran
    const users = await dbV4.table('users').toArray();
    users.forEach(user => {
      expect(user).toHaveProperty('lastLoginAt');
    });

    await dbV4.close();
  });
});
```

### Step 3: Test Edge Cases

Test migration behavior with edge cases and error conditions.

```typescript
describe('Migration Edge Cases', () => {
  afterEach(async () => {
    await Dexie.delete(TEST_DB_NAME);
  });

  it('should handle empty database migration', async () => {
    const db = new Dexie(TEST_DB_NAME);
    db.version(3).stores(SCHEMA_V3);
    db.version(4).stores(SCHEMA_V4);
    await db.open();

    // Should not error on empty tables
    const userCount = await db.table('users').count();
    expect(userCount).toBe(0);

    await db.close();
  });

  it('should handle large dataset migration', async () => {
    const db = new Dexie(TEST_DB_NAME);
    db.version(3).stores(SCHEMA_V3);
    await db.open();

    // Insert 10,000 records
    const users = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      email: `user${i}@example.com`,
      name: `User ${i}`,
    }));
    await db.table('users').bulkAdd(users);
    await db.close();

    // Upgrade should handle large dataset
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4);

    const startTime = Date.now();
    await dbV4.open();
    const duration = Date.now() - startTime;

    const count = await dbV4.table('users').count();
    expect(count).toBe(10000);
    expect(duration).toBeLessThan(5000); // Should complete in < 5s

    await dbV4.close();
  });

  it('should handle missing optional fields gracefully', async () => {
    const db = new Dexie(TEST_DB_NAME);
    db.version(3).stores(SCHEMA_V3);
    await db.open();

    // Insert records with missing optional fields
    await db.table('posts').add({
      id: 1,
      authorId: 1,
      title: 'Test',
      // publishedAt missing
    });
    await db.close();

    // Upgrade should not crash
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4).upgrade(async tx => {
      await tx.table('posts').toCollection().modify(post => {
        post.publishedAt = post.publishedAt ?? null;
      });
    });

    await expect(dbV4.open()).resolves.not.toThrow();

    const posts = await dbV4.table('posts').toArray();
    expect(posts[0].publishedAt).toBeNull();

    await dbV4.close();
  });

  it('should handle corrupted data gracefully', async () => {
    const db = new Dexie(TEST_DB_NAME);
    db.version(3).stores(SCHEMA_V3);
    await db.open();

    // Simulate corrupted record with invalid types
    await db.table('posts').add({
      id: 1,
      authorId: null,  // Should be number
      title: undefined,  // Should be string
    });
    await db.close();

    // Upgrade should handle corruption
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4).upgrade(async tx => {
      await tx.table('posts').toCollection().modify(post => {
        // Clean up corrupted data
        post.authorId = post.authorId ?? 0;
        post.title = post.title ?? 'Untitled';
      });
    });

    await expect(dbV4.open()).resolves.not.toThrow();

    const posts = await dbV4.table('posts').toArray();
    expect(posts[0].authorId).toBe(0);
    expect(posts[0].title).toBe('Untitled');

    await dbV4.close();
  });

  it('should rollback on upgrade function error', async () => {
    const db = new Dexie(TEST_DB_NAME);
    db.version(3).stores(SCHEMA_V3);
    await db.open();

    await db.table('users').bulkAdd([
      { id: 1, email: 'user1@example.com' },
    ]);
    await db.close();

    // Upgrade with failing upgrade function
    const dbV4 = new Dexie(TEST_DB_NAME);
    dbV4.version(3).stores(SCHEMA_V3);
    dbV4.version(4).stores(SCHEMA_V4).upgrade(async () => {
      throw new Error('Intentional upgrade failure');
    });

    // Should fail to open
    await expect(dbV4.open()).rejects.toThrow();

    // Database should remain at v3
    const dbCheck = new Dexie(TEST_DB_NAME);
    dbCheck.version(3).stores(SCHEMA_V3);
    await dbCheck.open();

    expect(dbCheck.verno).toBe(3);
    const count = await dbCheck.table('users').count();
    expect(count).toBe(1);  // Data preserved

    await dbCheck.close();
  });
});
```

### Step 4: Create Rollback Plan

Implement rollback functionality for migration failures.

```typescript
// src/lib/db/rollback.ts
import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface RollbackOptions {
  targetVersion: number;
  dbName: string;
  schemas: Record<number, Record<string, string>>;
}

/**
 * Rollback database to a previous schema version
 * WARNING: This deletes and recreates the database
 */
export async function rollbackToVersion(options: RollbackOptions): Promise<Dexie> {
  const { targetVersion, dbName, schemas } = options;

  // Open current database
  const db = new Dexie(dbName);
  // Reconstruct all versions to get current state
  Object.keys(schemas).forEach(v => {
    const version = parseInt(v);
    db.version(version).stores(schemas[version]);
  });
  await db.open();

  const currentVersion = db.verno;

  if (targetVersion >= currentVersion) {
    throw new Error(`Can only rollback to lower version. Current: ${currentVersion}, Target: ${targetVersion}`);
  }

  console.warn(`Rolling back from v${currentVersion} to v${targetVersion}`);

  // Export all data from current schema
  const backup: Record<string, any[]> = {};
  for (const table of db.tables) {
    backup[table.name] = await table.toArray();
  }

  // Close and delete database
  await db.close();
  await Dexie.delete(dbName);

  // Recreate with target version only
  const newDb = new Dexie(dbName);
  for (let v = 1; v <= targetVersion; v++) {
    if (schemas[v]) {
      newDb.version(v).stores(schemas[v]);
    }
  }
  await newDb.open();

  // Restore data (filtering out incompatible fields/tables)
  for (const [tableName, records] of Object.entries(backup)) {
    const table = newDb.tables.find(t => t.name === tableName);
    if (table) {
      try {
        // Filter records to only include fields that exist in target schema
        const targetFields = new Set(table.schema.indexes.map(i => i.keyPath).flat());
        targetFields.add(table.schema.primKey.keyPath as string);

        const cleanedRecords = records.map(record => {
          const cleaned: any = {};
          for (const field of targetFields) {
            if (field in record) {
              cleaned[field] = record[field];
            }
          }
          return cleaned;
        });

        await table.bulkPut(cleanedRecords);
        console.log(`Restored ${cleanedRecords.length} records to ${tableName}`);
      } catch (error) {
        console.error(`Failed to restore ${tableName}:`, error);
      }
    } else {
      console.warn(`Table ${tableName} not in target schema - data discarded`);
    }
  }

  return newDb;
}
```

### Step 5: Pre-Migration Backup

Create backup functionality before running migrations.

```typescript
// src/lib/db/backup.ts
import Dexie from 'dexie';

export interface DatabaseBackup {
  version: number;
  timestamp: string;
  dbName: string;
  tables: Record<string, any[]>;
}

/**
 * Create a full backup of the database
 * Returns JSON string that can be stored or downloaded
 */
export async function backupDatabase(db: Dexie): Promise<string> {
  const backup: DatabaseBackup = {
    version: db.verno,
    timestamp: new Date().toISOString(),
    dbName: db.name,
    tables: {},
  };

  for (const table of db.tables) {
    backup.tables[table.name] = await table.toArray();
  }

  const json = JSON.stringify(backup, null, 2);

  // Store in localStorage (if size permits)
  try {
    localStorage.setItem(`dexie-backup-${db.name}`, json);
    console.log(`Backup stored in localStorage`);
  } catch (error) {
    console.warn('Failed to store in localStorage (likely too large):', error);
  }

  return json;
}

/**
 * Restore database from backup JSON
 */
export async function restoreFromBackup(db: Dexie, backupJson: string): Promise<void> {
  const backup: DatabaseBackup = JSON.parse(backupJson);

  if (backup.dbName !== db.name) {
    throw new Error(`Backup is for database "${backup.dbName}" but current database is "${db.name}"`);
  }

  console.warn(`Restoring backup from ${backup.timestamp} (v${backup.version})`);

  await db.transaction('rw', db.tables, async () => {
    // Clear all tables
    for (const table of db.tables) {
      await table.clear();
    }

    // Restore data
    for (const [tableName, records] of Object.entries(backup.tables)) {
      const table = db.table(tableName);
      if (table) {
        await table.bulkPut(records);
        console.log(`Restored ${records.length} records to ${tableName}`);
      }
    }
  });
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(backupJson: string, filename?: string): void {
  const blob = new Blob([backupJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dexie-backup-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Step 6: Run Migration Tests

Execute the test suite and verify all tests pass.

```bash
# Run all migration tests
npm test -- migration

# Run with coverage
npm run test:coverage -- migration

# Run in watch mode during development
npm test -- --watch migration
```

Expected output:
```
✓ Migration v3 → v4 (6)
  ✓ should create database with v3 schema
  ✓ should preserve all data during upgrade
  ✓ should create new indexes
  ✓ should create new tables
  ✓ should execute upgrade function for data migration

✓ Migration Edge Cases (6)
  ✓ should handle empty database migration
  ✓ should handle large dataset migration
  ✓ should handle missing optional fields gracefully
  ✓ should handle corrupted data gracefully
  ✓ should rollback on upgrade function error

Tests passed: 11/11
```

### Step 7: Create Migration Runbook

Document the migration procedure for the team.

```markdown
## Migration Runbook: v3 → v4

### Pre-Migration Checklist
- [ ] All migration tests passing
- [ ] Backup created and verified
- [ ] Team notified of maintenance window
- [ ] Rollback plan reviewed

### Migration Steps

1. **Create backup**
   ```typescript
   const backup = await backupDatabase(db);
   downloadBackup(backup, 'pre-v4-migration.json');
   ```

2. **Deploy new schema**
   - Deploy application with v4 schema
   - Users' browsers will auto-upgrade on next page load

3. **Monitor for errors**
   - Check browser console for migration errors
   - Monitor error tracking (Sentry, etc.)

4. **Verify migration success**
   ```typescript
   console.log('Current version:', db.verno);  // Should be 4
   console.log('Tables:', db.tables.map(t => t.name));
   ```

### Rollback Procedure

If migration fails:

1. **Rollback to v3**
   ```typescript
   await rollbackToVersion({
     targetVersion: 3,
     dbName: 'your-db',
     schemas: { 3: SCHEMA_V3, 4: SCHEMA_V4 }
   });
   ```

2. **Restore from backup**
   ```typescript
   const backupJson = localStorage.getItem('dexie-backup-your-db');
   await restoreFromBackup(db, backupJson);
   ```

3. **Revert deployment**
   - Deploy previous version of application

### Success Criteria
- [ ] All users successfully upgraded to v4
- [ ] No data loss reported
- [ ] New features using v4 schema working
- [ ] No performance degradation
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| migration-test.ts | `src/lib/db/__tests__/` | Comprehensive migration tests |
| rollback.ts | `src/lib/db/` | Rollback functionality |
| backup.ts | `src/lib/db/` | Backup and restore utilities |
| migration-runbook.md | `.claude/artifacts/` | Step-by-step migration guide |
| test-report.md | `.claude/artifacts/` | Test execution results |

---

## Output Template

```markdown
## Migration Safety Report

**Migration**: v[N] → v[M]
**Date**: [YYYY-MM-DD]
**Project**: [Project Name]

---

### Migration Changes

| Type | Table | Detail | Reason |
|------|-------|--------|--------|
| ADD_INDEX | [table] | [index] | [reason] |
| ADD_TABLE | [table] | [schema] | [reason] |
| ADD_FIELD | [table] | [field] | [reason] |
| REMOVE_INDEX | [table] | [index] | [reason] |

---

### Test Results

| Test Case | Result | Duration | Notes |
|-----------|--------|----------|-------|
| Create v[N] schema | ✅ Pass | 0.1s | - |
| Preserve data during upgrade | ✅ Pass | 1.2s | Tested with [N] records |
| Create new indexes | ✅ Pass | 0.3s | [N] indexes verified |
| Create new tables | ✅ Pass | 0.2s | [N] tables created |
| Execute upgrade function | ✅ Pass | 0.8s | Data migration successful |
| Handle empty database | ✅ Pass | 0.1s | - |
| Handle large dataset | ✅ Pass | 4.5s | Tested with 10,000 records |
| Handle missing fields | ✅ Pass | 0.3s | Defaults applied |
| Handle corrupted data | ✅ Pass | 0.4s | Cleanup successful |
| Rollback on error | ✅ Pass | 0.6s | Data preserved |

**Total Tests**: [N]
**Passed**: [N]
**Failed**: [N]
**Duration**: [X.X]s

---

### Backup Information

**Backup Created**: ✅ Yes
**Backup Location**: localStorage['dexie-backup-[dbname]']
**Backup Size**: [X] KB / [X] MB
**Tables Backed Up**: [N]
**Total Records**: [N]
**Timestamp**: [ISO-8601]

---

### Rollback Plan

#### If Migration Fails

**Option 1: Rollback to Previous Version**
```typescript
await rollbackToVersion({
  targetVersion: [N],
  dbName: '[dbname]',
  schemas: SCHEMAS
});
```

**Option 2: Restore from Backup**
```typescript
const backupJson = localStorage.getItem('dexie-backup-[dbname]');
await restoreFromBackup(db, backupJson);
```

**Option 3: Clear and Resync** (if synced with server)
```typescript
await Dexie.delete('[dbname]');
await resyncFromServer();
```

---

### Migration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during upgrade | Low | High | Pre-migration backup |
| Large dataset timeout | Medium | Medium | Tested with 10K records |
| Corrupted data breaks migration | Low | High | Graceful error handling |
| Browser crash during migration | Low | Medium | Atomic transactions |

---

### Recommendations

#### Before Migration
1. [Recommendation]
2. [Recommendation]

#### During Migration
1. [Recommendation]
2. [Recommendation]

#### After Migration
1. Verify v[M] schema active: `db.verno === [M]`
2. Check data integrity with sample queries
3. Monitor error rates for [X] hours
4. Keep backup for [X] days

---

### Approval

- [ ] Tests passing
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Ready to deploy

**Approved by**: [Name]
**Date**: [YYYY-MM-DD]
```
