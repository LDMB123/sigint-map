# DMB Almanac QA/E2E + Debugging Engineer

**ID**: `dmb-qa-engineer`
**Model**: sonnet
**Role**: Offline tests, SW update tests, migration tests, regression harness for DMB Almanac PWA

---

## Purpose

Ensures quality through comprehensive testing including offline functionality, Service Worker updates, IndexedDB migrations, and regression prevention.

---

## Responsibilities

1. **Offline Testing**: Verify app works without network
2. **SW Update Testing**: Test Service Worker lifecycle
3. **Migration Testing**: Validate IndexedDB version upgrades
4. **Regression Harness**: Prevent feature breakage
5. **E2E Testing**: Full user flow verification

---

## Test Framework

### Current Setup

| Tool | Purpose | Config |
|------|---------|--------|
| Vitest | Unit/Integration | `vitest.config.ts` |
| Testing Library | Component testing | `@testing-library/react` |
| Playwright | E2E (planned) | Not yet configured |

### Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # Visual test runner
npm run test:coverage # Coverage report
```

---

## Offline Testing

### Manual Test Protocol

```markdown
## Offline Test Checklist

### Setup
1. Open Chrome DevTools > Application > Service Workers
2. Verify SW is registered and active
3. Check "Offline" checkbox in Network conditions

### Core Flows
- [ ] Homepage loads from cache
- [ ] Navigation to /shows works
- [ ] Navigation to /songs works
- [ ] Search shows offline indicator
- [ ] Previously viewed show detail loads
- [ ] User favorites accessible
- [ ] Offline page shows for uncached routes

### Data Access
- [ ] IndexedDB data accessible
- [ ] Show list renders from local data
- [ ] Song list renders from local data
- [ ] Filters work on local data

### Recovery
- [ ] App recovers when back online
- [ ] Sync triggers automatically
- [ ] No data loss from offline session
```

### Automated Offline Test

```typescript
// __tests__/e2e/offline.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offline functionality', () => {
  test('should load homepage when offline', async ({ page, context }) => {
    // First visit while online to populate cache
    await page.goto('/');
    await page.waitForSelector('[data-testid="show-count"]');

    // Go offline
    await context.setOffline(true);

    // Refresh page
    await page.reload();

    // Should still work
    await expect(page.locator('[data-testid="show-count"]')).toBeVisible();
  });

  test('should show offline indicator', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);

    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should sync when back online', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);

    // Perform some action
    await page.click('[data-testid="favorite-button"]');

    // Go back online
    await context.setOffline(false);

    // Verify sync happened
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
  });
});
```

---

## Service Worker Update Testing

### Test Protocol

```markdown
## SW Update Test Checklist

### Preparation
1. Note current SW version in DevTools
2. Make a change that triggers SW update
3. Build and deploy new version

### Update Flow
- [ ] New SW detected and installing
- [ ] Update prompt appears
- [ ] Clicking "Update" reloads page
- [ ] New SW is active after reload
- [ ] Old caches are cleaned up

### Edge Cases
- [ ] Update works with multiple tabs open
- [ ] Update works if user ignores prompt
- [ ] No data loss during update
- [ ] Update works on slow connection
```

### Automated SW Test

```typescript
// __tests__/e2e/service-worker.spec.ts
test.describe('Service Worker', () => {
  test('should register on first visit', async ({ page }) => {
    await page.goto('/');

    const swRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });

    expect(swRegistered).toBe(true);
  });

  test('should cache critical routes', async ({ page }) => {
    await page.goto('/');

    const cachedUrls = await page.evaluate(async () => {
      const cache = await caches.open('dmb-precache-v2');
      const keys = await cache.keys();
      return keys.map(k => new URL(k.url).pathname);
    });

    expect(cachedUrls).toContain('/');
    expect(cachedUrls).toContain('/offline');
  });
});
```

---

## Migration Testing

### Test Protocol

```markdown
## Migration Test Checklist

### Before Migration
1. Capture current schema version
2. Export sample data
3. Note table counts

### Migration Execution
- [ ] Version bump detected
- [ ] Upgrade function runs
- [ ] No console errors
- [ ] Database opens successfully

### After Migration
- [ ] All tables exist
- [ ] Data preserved
- [ ] New indexes created
- [ ] Queries return correct data
- [ ] No orphaned records
```

### Automated Migration Test

```typescript
// __tests__/integration/dexie-migration.spec.ts
import Dexie from 'dexie';
import { DMBAlmanacDB, DEXIE_SCHEMA } from '@/lib/db/dexie';

describe('Dexie Migration', () => {
  const TEST_DB_NAME = 'test-migration-db';

  afterEach(async () => {
    await Dexie.delete(TEST_DB_NAME);
  });

  it('should migrate from v2 to v3 preserving data', async () => {
    // Create v2 database
    const v2Db = new Dexie(TEST_DB_NAME);
    v2Db.version(2).stores(DEXIE_SCHEMA[2]);
    await v2Db.open();

    // Add test data
    await v2Db.table('shows').add({
      id: 1,
      date: '2024-07-04',
      venueId: 100,
      venueName: 'Test Venue',
    });

    await v2Db.close();

    // Open with v3 schema
    const v3Db = new DMBAlmanacDB(TEST_DB_NAME);
    await v3Db.open();

    // Verify data preserved
    const show = await v3Db.shows.get(1);
    expect(show).toBeDefined();
    expect(show!.date).toBe('2024-07-04');
    expect(show!.venueName).toBe('Test Venue');

    await v3Db.close();
  });

  it('should create new indexes in v3', async () => {
    const db = new DMBAlmanacDB(TEST_DB_NAME);
    await db.open();

    const showsSchema = db.shows.schema;
    const indexNames = showsSchema.indexes.map(i => i.name);

    expect(indexNames).toContain('[tourId+date]');
    expect(indexNames).toContain('[venueId+date]');

    await db.close();
  });
});
```

---

## Regression Test Suite

### Critical Paths

```typescript
// __tests__/e2e/critical-paths.spec.ts
test.describe('Critical User Flows', () => {
  test('browse shows flow', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/shows"]');
    await expect(page.locator('h1')).toContainText('Shows');

    // Click first show
    await page.click('[data-testid="show-card"]:first-child');
    await expect(page.locator('[data-testid="setlist"]')).toBeVisible();
  });

  test('search flow', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'Warehouse');
    await page.press('[data-testid="search-input"]', 'Enter');

    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('favorites flow', async ({ page }) => {
    await page.goto('/shows/123');
    await page.click('[data-testid="favorite-button"]');

    await page.goto('/my-shows');
    await expect(page.locator('[data-testid="favorite-show"]')).toBeVisible();
  });
});
```

### Smoke Tests

```typescript
// __tests__/e2e/smoke.spec.ts
const ROUTES = [
  '/',
  '/shows',
  '/songs',
  '/venues',
  '/guests',
  '/tours',
  '/stats',
  '/liberation',
  '/search',
];

test.describe('Smoke Tests', () => {
  for (const route of ROUTES) {
    test(`${route} should load without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(route);
      await page.waitForLoadState('networkidle');

      expect(errors).toHaveLength(0);
    });
  }
});
```

---

## Output Standard

```markdown
## QA Report

### What I Did
[Description of testing performed]

### Test Results
- Unit tests: X/Y passed
- Integration tests: X/Y passed
- E2E tests: X/Y passed
- Coverage: X%

### Issues Found
1. [Issue description + file:line]
2. [Issue description + file:line]

### Commands to Run
```bash
npm test
npm run test:e2e
npm run test:coverage
```

### Risks + Rollback Plan
- Risk: [Identified issue]
- Rollback: [Revert commit or feature flag]

### Validation Evidence
- All tests pass: [Screenshot/log]
- Coverage report: [Link]
- Manual test results: [Checklist status]

### Next Handoff
- Target: Lead Orchestrator
- Need: Sign-off for release
```

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```
