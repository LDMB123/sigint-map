# Skill: Offline E2E Test Harness

**ID**: `offline-e2e-test-harness`
**Category**: Testing / PWA
**Agent**: QA Engineer

---

## When to Use

- Setting up offline testing infrastructure
- After Service Worker changes
- Before production deployment
- Regression testing PWA features

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |

---

## Steps

### Step 1: Setup Playwright for Offline Testing

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 2: Create Offline Test Utilities

```typescript
// __tests__/e2e/utils/offline-helpers.ts
import { Page, BrowserContext } from '@playwright/test';

export async function goOffline(context: BrowserContext) {
  await context.setOffline(true);
}

export async function goOnline(context: BrowserContext) {
  await context.setOffline(false);
}

export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() =>
    navigator.serviceWorker.controller !== null
  );
}

export async function clearServiceWorker(page: Page) {
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
  });
}

export async function clearCaches(page: Page) {
  await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  });
}

export async function clearIndexedDB(page: Page, dbName: string) {
  await page.evaluate((name) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }, dbName);
}
```

### Step 3: Implement Install Test

```typescript
// __tests__/e2e/pwa/install.spec.ts
import { test, expect } from '@playwright/test';
import { waitForServiceWorker } from '../utils/offline-helpers';

test.describe('PWA Installation', () => {
  test('should install Service Worker on first visit', async ({ page }) => {
    await page.goto('/');

    // Wait for SW to install
    await waitForServiceWorker(page);

    // Verify SW is controlling the page
    const swActive = await page.evaluate(() =>
      navigator.serviceWorker.controller !== null
    );
    expect(swActive).toBe(true);
  });

  test('should cache critical assets', async ({ page }) => {
    await page.goto('/');
    await waitForServiceWorker(page);

    // Check precache
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

### Step 4: Implement Offline Navigation Tests

```typescript
// __tests__/e2e/pwa/offline-navigation.spec.ts
import { test, expect } from '@playwright/test';
import { goOffline, goOnline, waitForServiceWorker } from '../utils/offline-helpers';

test.describe('Offline Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // First visit while online to populate cache
    await page.goto('/');
    await waitForServiceWorker(page);

    // Visit key pages to cache them
    await page.goto('/shows');
    await page.goto('/songs');
    await page.goto('/');
  });

  test('should load homepage when offline', async ({ page, context }) => {
    await goOffline(context);
    await page.reload();

    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('should navigate to cached pages offline', async ({ page, context }) => {
    await goOffline(context);

    await page.click('a[href="/shows"]');
    await expect(page).toHaveURL('/shows');
    await expect(page.locator('h1')).toContainText('Shows');

    await page.click('a[href="/songs"]');
    await expect(page).toHaveURL('/songs');
    await expect(page.locator('h1')).toContainText('Songs');
  });

  test('should show offline page for uncached routes', async ({ page, context }) => {
    await goOffline(context);

    // Navigate to a page we haven't visited
    await page.goto('/visualizations');

    // Should show offline fallback
    await expect(page).toHaveURL('/offline');
    await expect(page.locator('h1')).toContainText('Offline');
  });

  test('should recover when back online', async ({ page, context }) => {
    await goOffline(context);
    await page.reload();

    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    await goOnline(context);

    // Trigger network check
    await page.waitForTimeout(1000);

    // Verify online indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });
});
```

### Step 5: Implement Data Access Tests

```typescript
// __tests__/e2e/pwa/offline-data.spec.ts
import { test, expect } from '@playwright/test';
import { goOffline, waitForServiceWorker } from '../utils/offline-helpers';

test.describe('Offline Data Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForServiceWorker(page);

    // Wait for initial data sync
    await page.waitForSelector('[data-testid="data-loaded"]', { timeout: 30000 });
  });

  test('should display shows from IndexedDB offline', async ({ page, context }) => {
    await page.goto('/shows');

    // Get show count while online
    const onlineCount = await page.locator('[data-testid="show-card"]').count();

    await goOffline(context);
    await page.reload();

    // Verify same shows appear offline
    const offlineCount = await page.locator('[data-testid="show-card"]').count();
    expect(offlineCount).toBe(onlineCount);
  });

  test('should search IndexedDB offline', async ({ page, context }) => {
    await goOffline(context);
    await page.goto('/');

    // Perform search
    await page.fill('[data-testid="search-input"]', 'Warehouse');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Verify results from IndexedDB
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="song-result"]').first()).toContainText('Warehouse');
  });

  test('should access favorites offline', async ({ page, context }) => {
    // Add a favorite while online
    await page.goto('/shows/1');
    await page.click('[data-testid="favorite-button"]');

    await goOffline(context);
    await page.goto('/my-shows');

    // Verify favorite is accessible
    await expect(page.locator('[data-testid="favorite-show"]')).toBeVisible();
  });
});
```

### Step 6: Run Tests

```bash
# Run all E2E tests
npx playwright test

# Run only offline tests
npx playwright test --grep "offline"

# Run with UI
npx playwright test --ui

# Generate report
npx playwright show-report
```

---

## Test Coverage Matrix

| Feature | Test File | Status |
|---------|-----------|--------|
| SW Installation | install.spec.ts | |
| Offline Navigation | offline-navigation.spec.ts | |
| Offline Data | offline-data.spec.ts | |
| SW Update | sw-update.spec.ts | |
| Background Sync | background-sync.spec.ts | |

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| playwright-report/ | `./` | HTML test report |
| test-results/ | `./` | Test artifacts |
| offline-test-results.md | `.claude/artifacts/` | Summary |

---

## Output Template

```markdown
## Offline E2E Test Report

### Date: [YYYY-MM-DD]

### Test Environment
- Browser: Chromium [version]
- Node: [version]
- Server: [localhost:3000]

### Test Results

#### PWA Installation
| Test | Result | Duration |
|------|--------|----------|
| SW installs | ✅ Pass | 1.2s |
| Assets cached | ✅ Pass | 0.8s |

#### Offline Navigation
| Test | Result | Duration |
|------|--------|----------|
| Homepage offline | ✅ Pass | 0.5s |
| Navigation offline | ✅ Pass | 1.5s |
| Offline fallback | ✅ Pass | 0.6s |
| Recovery | ✅ Pass | 2.0s |

#### Offline Data
| Test | Result | Duration |
|------|--------|----------|
| Shows from IDB | ✅ Pass | 1.0s |
| Search offline | ✅ Pass | 0.8s |
| Favorites offline | ✅ Pass | 0.7s |

### Summary
- Total: [N] tests
- Passed: [N]
- Failed: [N]
- Skipped: [N]

### Failures (if any)
```
[Error details]
```

### Recommendations
1. [Recommendation]
```
