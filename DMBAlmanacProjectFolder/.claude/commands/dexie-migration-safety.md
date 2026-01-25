# Safe Dexie Schema Migrations

## Usage

```
/dexie-migration-safety [migration-type] [target-version]
```

## Instructions

You are an expert in IndexedDB schema migrations with deep knowledge of Dexie.js versioning system, data transformation strategies, and rollback patterns. You understand the complexities of browser-side database migrations, including handling concurrent tabs, preserving data integrity, and managing failed migrations gracefully.

Plan and implement safe Dexie.js schema migrations that protect user data and provide recovery mechanisms.

## Migration Risk Matrix

| Change Type | Risk Level | Data Loss Risk | Rollback Possible |
|-------------|------------|----------------|-------------------|
| Add table | Low | None | Yes |
| Add index | Low | None | Yes |
| Add field (nullable) | Low | None | Yes |
| Remove unused index | Low | None | No |
| Rename field | Medium | Possible | With backup |
| Change field type | Medium | Possible | With backup |
| Remove table | High | Yes | No |
| Remove field | High | Yes | No |
| Change primary key | Critical | Yes | No |

## Migration Strategy Comparison

| Strategy | Complexity | Safety | Performance | Use Case |
|----------|------------|--------|-------------|----------|
| In-place upgrade | Low | Medium | Fast | Simple changes |
| Copy-transform | Medium | High | Slow | Type changes |
| Parallel tables | High | Highest | Medium | Critical data |
| Incremental | Medium | High | Medium | Large datasets |

## Dexie Version Management

### Basic Version Structure

```typescript
// src/lib/db/index.ts
import Dexie, { type Table } from 'dexie';

export class AppDatabase extends Dexie {
  users!: Table<User>;
  posts!: Table<Post>;

  constructor() {
    super('AppDatabase');

    // Version 1: Initial schema
    this.version(1).stores({
      users: '++id, &email, name',
      posts: '++id, authorId, title, createdAt'
    });

    // Version 2: Add tags index to posts
    this.version(2).stores({
      users: '++id, &email, name',
      posts: '++id, authorId, title, *tags, createdAt'
    });

    // Version 3: Add status field and compound index
    this.version(3).stores({
      users: '++id, &email, name',
      posts: '++id, authorId, title, *tags, status, [authorId+status], createdAt'
    }).upgrade(tx => {
      // Data migration: set default status
      return tx.table('posts').toCollection().modify(post => {
        post.status = post.status || 'draft';
      });
    });
  }
}
```

### Safe Migration Patterns

```typescript
// src/lib/db/migrations/v4-user-profile.ts
import Dexie from 'dexie';
import type { AppDatabase } from '../index';

/**
 * Version 4: Split user profile data
 * - Add profiles table
 * - Move bio, avatar from users to profiles
 * - Maintain backward compatibility
 */
export function applyV4Migration(db: AppDatabase) {
  db.version(4).stores({
    users: '++id, &email, name',
    posts: '++id, authorId, title, *tags, status, [authorId+status], createdAt',
    profiles: '++id, &userId, bio, avatarUrl'  // New table
  }).upgrade(async tx => {
    const users = await tx.table('users').toArray();
    const profiles = users
      .filter(u => u.bio || u.avatarUrl)
      .map(u => ({
        userId: u.id,
        bio: u.bio || '',
        avatarUrl: u.avatarUrl || null
      }));

    // Insert profiles
    if (profiles.length > 0) {
      await tx.table('profiles').bulkAdd(profiles);
    }

    // Remove old fields from users (optional, for cleanup)
    // Note: Dexie doesn't enforce schema on data, old fields remain
  });
}
```

### Migration with Backup

```typescript
// src/lib/db/migrations/safe-migrate.ts
import Dexie from 'dexie';
import { db } from '../index';

export interface MigrationBackup {
  version: number;
  timestamp: Date;
  tables: Map<string, any[]>;
}

export async function createBackup(): Promise<MigrationBackup> {
  const backup: MigrationBackup = {
    version: db.verno,
    timestamp: new Date(),
    tables: new Map()
  };

  for (const table of db.tables) {
    const data = await table.toArray();
    backup.tables.set(table.name, data);
  }

  // Store backup in localStorage (for small DBs) or separate IndexedDB
  const backupStr = JSON.stringify({
    version: backup.version,
    timestamp: backup.timestamp.toISOString(),
    tables: Object.fromEntries(backup.tables)
  });

  localStorage.setItem(`db_backup_${backup.version}`, backupStr);

  return backup;
}

export async function restoreBackup(version: number): Promise<boolean> {
  const backupStr = localStorage.getItem(`db_backup_${version}`);
  if (!backupStr) {
    console.error('Backup not found for version', version);
    return false;
  }

  try {
    const backup = JSON.parse(backupStr);

    // Delete current database
    await db.delete();

    // Recreate with backup data
    // This requires careful version management
    await db.open();

    for (const [tableName, data] of Object.entries(backup.tables)) {
      const table = db.table(tableName);
      if (table && Array.isArray(data)) {
        await table.bulkPut(data as any[]);
      }
    }

    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
}
```

### Incremental Migration for Large Data

```typescript
// src/lib/db/migrations/incremental.ts
import Dexie from 'dexie';

const BATCH_SIZE = 1000;

export interface MigrationProgress {
  table: string;
  total: number;
  processed: number;
  percentage: number;
}

type ProgressCallback = (progress: MigrationProgress) => void;

export async function migrateInBatches(
  table: Dexie.Table,
  transform: (record: any) => any,
  onProgress?: ProgressCallback
): Promise<void> {
  const total = await table.count();
  let processed = 0;
  let lastKey: any = undefined;

  while (true) {
    // Get next batch
    let query = table.orderBy(':id');
    if (lastKey !== undefined) {
      query = query.where(':id').above(lastKey);
    }

    const batch = await query.limit(BATCH_SIZE).toArray();
    if (batch.length === 0) break;

    // Transform batch
    const transformed = batch.map(record => ({
      ...record,
      ...transform(record)
    }));

    // Update in transaction
    await Dexie.waitFor(
      table.bulkPut(transformed)
    );

    processed += batch.length;
    lastKey = batch[batch.length - 1].id;

    if (onProgress) {
      onProgress({
        table: table.name,
        total,
        processed,
        percentage: Math.round((processed / total) * 100)
      });
    }

    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### Concurrent Tab Safety

```typescript
// src/lib/db/migrations/tab-safety.ts
import { db } from '../index';

const MIGRATION_LOCK_KEY = 'db_migration_lock';
const LOCK_TIMEOUT_MS = 30000;

interface MigrationLock {
  tabId: string;
  timestamp: number;
  version: number;
}

function generateTabId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const TAB_ID = generateTabId();

export async function acquireMigrationLock(targetVersion: number): Promise<boolean> {
  const existingLock = localStorage.getItem(MIGRATION_LOCK_KEY);

  if (existingLock) {
    const lock: MigrationLock = JSON.parse(existingLock);

    // Check if lock is stale
    if (Date.now() - lock.timestamp < LOCK_TIMEOUT_MS) {
      if (lock.tabId !== TAB_ID) {
        console.log('Migration in progress in another tab');
        return false;
      }
    }
  }

  // Acquire lock
  const lock: MigrationLock = {
    tabId: TAB_ID,
    timestamp: Date.now(),
    version: targetVersion
  };

  localStorage.setItem(MIGRATION_LOCK_KEY, JSON.stringify(lock));

  // Double-check (simple compare-and-swap)
  await new Promise(resolve => setTimeout(resolve, 100));

  const checkLock = localStorage.getItem(MIGRATION_LOCK_KEY);
  if (checkLock) {
    const parsed: MigrationLock = JSON.parse(checkLock);
    return parsed.tabId === TAB_ID;
  }

  return false;
}

export function releaseMigrationLock(): void {
  const existingLock = localStorage.getItem(MIGRATION_LOCK_KEY);
  if (existingLock) {
    const lock: MigrationLock = JSON.parse(existingLock);
    if (lock.tabId === TAB_ID) {
      localStorage.removeItem(MIGRATION_LOCK_KEY);
    }
  }
}

// Listen for migration events from other tabs
export function setupMigrationListener(onMigrationStart: () => void): void {
  window.addEventListener('storage', (event) => {
    if (event.key === MIGRATION_LOCK_KEY && event.newValue) {
      const lock: MigrationLock = JSON.parse(event.newValue);
      if (lock.tabId !== TAB_ID) {
        onMigrationStart();
      }
    }
  });
}
```

### Migration Testing Framework

```typescript
// src/lib/db/migrations/testing.ts
import Dexie from 'dexie';
import 'fake-indexeddb/auto';

export interface MigrationTest {
  name: string;
  fromVersion: number;
  toVersion: number;
  seedData: Record<string, any[]>;
  expectedData: Record<string, any[]>;
  assertions: (db: Dexie) => Promise<void>;
}

export async function testMigration(
  DatabaseClass: new () => Dexie,
  test: MigrationTest
): Promise<{ passed: boolean; error?: string }> {
  const testDbName = `test_migration_${Date.now()}`;

  try {
    // Create database at fromVersion with seed data
    const oldDb = new DatabaseClass();
    (oldDb as any).name = testDbName;

    // Manually set version for testing
    await oldDb.open();

    for (const [tableName, data] of Object.entries(test.seedData)) {
      await oldDb.table(tableName).bulkAdd(data);
    }

    await oldDb.close();

    // Reopen to trigger migration
    const newDb = new DatabaseClass();
    (newDb as any).name = testDbName;
    await newDb.open();

    // Verify expected data
    for (const [tableName, expected] of Object.entries(test.expectedData)) {
      const actual = await newDb.table(tableName).toArray();

      // Deep comparison (simplified)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Data mismatch in ${tableName}`);
      }
    }

    // Run custom assertions
    await test.assertions(newDb);

    await newDb.close();
    await Dexie.delete(testDbName);

    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

### Rollback Strategy

```typescript
// src/lib/db/migrations/rollback.ts
import Dexie from 'dexie';
import { db } from '../index';

export interface RollbackPlan {
  fromVersion: number;
  toVersion: number;
  steps: RollbackStep[];
}

export interface RollbackStep {
  table: string;
  action: 'restore' | 'transform' | 'delete';
  data?: any[];
  transform?: (record: any) => any;
}

// Store rollback plans during migration
const rollbackPlans = new Map<number, RollbackPlan>();

export function registerRollbackPlan(plan: RollbackPlan): void {
  rollbackPlans.set(plan.fromVersion, plan);

  // Persist to localStorage for crash recovery
  localStorage.setItem(
    `rollback_plan_${plan.fromVersion}`,
    JSON.stringify(plan)
  );
}

export async function executeRollback(targetVersion: number): Promise<boolean> {
  const currentVersion = db.verno;

  if (targetVersion >= currentVersion) {
    console.error('Cannot rollback to same or higher version');
    return false;
  }

  const plan = rollbackPlans.get(currentVersion) ||
    JSON.parse(localStorage.getItem(`rollback_plan_${currentVersion}`) || 'null');

  if (!plan || plan.toVersion !== targetVersion) {
    console.error('No rollback plan available for this version transition');
    return false;
  }

  try {
    await db.transaction('rw', db.tables, async () => {
      for (const step of plan.steps) {
        const table = db.table(step.table);

        switch (step.action) {
          case 'restore':
            if (step.data) {
              await table.clear();
              await table.bulkAdd(step.data);
            }
            break;

          case 'transform':
            if (step.transform) {
              await table.toCollection().modify(step.transform);
            }
            break;

          case 'delete':
            await table.clear();
            break;
        }
      }
    });

    // Note: Dexie version cannot be decreased
    // Full rollback requires deleting and recreating DB
    console.warn('Data rolled back, but schema version remains at', currentVersion);

    return true;
  } catch (error) {
    console.error('Rollback failed:', error);
    return false;
  }
}
```

### Migration UI Component

```svelte
<!-- src/lib/components/MigrationProgress.svelte -->
<script lang="ts">
  import { fade } from 'svelte/transition';

  export let progress: {
    table: string;
    total: number;
    processed: number;
    percentage: number;
  } | null = null;

  export let status: 'idle' | 'migrating' | 'complete' | 'error' = 'idle';
  export let error: string | null = null;
</script>

{#if status !== 'idle'}
  <div class="migration-overlay" transition:fade>
    <div class="migration-modal">
      {#if status === 'migrating'}
        <div class="migration-content">
          <div class="spinner"></div>
          <h2>Updating Database</h2>
          <p>Please don't close this tab.</p>

          {#if progress}
            <div class="progress-info">
              <span>Processing {progress.table}...</span>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  style="width: {progress.percentage}%"
                ></div>
              </div>
              <span class="progress-text">
                {progress.processed} / {progress.total}
              </span>
            </div>
          {/if}
        </div>
      {:else if status === 'complete'}
        <div class="migration-content success">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h2>Update Complete</h2>
          <p>Your data has been migrated successfully.</p>
          <button on:click={() => window.location.reload()}>
            Continue
          </button>
        </div>
      {:else if status === 'error'}
        <div class="migration-content error">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h2>Update Failed</h2>
          <p>{error || 'An error occurred during migration.'}</p>
          <div class="error-actions">
            <button class="btn-retry" on:click={() => window.location.reload()}>
              Retry
            </button>
            <button class="btn-support">
              Contact Support
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .migration-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  }

  .migration-modal {
    background: var(--surface, #1a1a2e);
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
  }

  .migration-content h2 {
    margin: 1rem 0 0.5rem;
    color: var(--text-primary, #fff);
  }

  .migration-content p {
    color: var(--text-secondary, #999);
    margin: 0;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-color, #333);
    border-top-color: var(--color-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .progress-info {
    margin-top: 1.5rem;
  }

  .progress-bar {
    height: 8px;
    background: var(--surface-sunken, #0f0f1a);
    border-radius: 4px;
    overflow: hidden;
    margin: 0.5rem 0;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-primary, #3b82f6);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--text-muted, #666);
  }

  .success svg {
    color: var(--color-success, #4ade80);
  }

  .error svg {
    color: var(--color-error, #ef4444);
  }

  button {
    margin-top: 1.5rem;
    padding: 0.75rem 2rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-retry {
    background: var(--color-primary, #3b82f6);
    color: white;
    margin-right: 0.5rem;
  }

  .btn-support {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-secondary, #999);
  }
</style>
```

### Response Format

```markdown
## Dexie Migration Safety Report

### Migration Overview
- Current version: [X]
- Target version: [Y]
- Migration type: [Add/Modify/Remove]
- Risk level: [Low/Medium/High/Critical]

### Change Analysis

| Change | Type | Risk | Data Impact |
|--------|------|------|-------------|
| [Description] | [Type] | [Risk] | [Impact] |

### Migration Plan

#### Pre-Migration
1. [ ] Create backup
2. [ ] Acquire migration lock
3. [ ] Verify no pending transactions

#### Migration Steps
```typescript
this.version(Y).stores({
  // New schema
}).upgrade(async tx => {
  // Migration logic
});
```

#### Post-Migration
1. [ ] Verify data integrity
2. [ ] Release migration lock
3. [ ] Clean up backup (after grace period)

### Rollback Plan
```typescript
// Rollback steps if migration fails
```

### Testing Checklist
- [ ] Migration passes on empty database
- [ ] Migration preserves existing data
- [ ] Indexes are correctly created
- [ ] Concurrent tab handling works
- [ ] Rollback restores previous state

### Risk Mitigation

| Risk | Mitigation | Recovery |
|------|------------|----------|
| Data loss | Pre-migration backup | Restore from backup |
| Concurrent tabs | Tab locking | Force reload other tabs |
| Failed migration | Transaction rollback | Retry or restore backup |

### Monitoring
- Track migration success rate
- Log migration duration
- Alert on migration failures

### User Communication
- Show migration progress UI
- Explain why migration is needed
- Provide support contact for failures
```
