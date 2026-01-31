---
name: sveltekit-offline-e2e-test-harness
description: "sveltekit offline e2e test harness for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Skill: Offline E2E Test Harness

**ID**: `offline-e2e-test-harness`
**Category**: Testing / PWA
**Agent**: QA Engineer

---

## When to Use

- Setting up offline testing infrastructure for PWA features
- After Service Worker changes or updates
- Before production deployment of offline-capable features
- Regression testing PWA functionality
- Validating offline-first architecture

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to SvelteKit project root |
| base_url | string | No | Dev server URL (default: http://localhost:5173) |
| db_name | string | No | IndexedDB name for cleanup (if applicable) |

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
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 2: Create Offline Test Utilities

```typescript
// tests/e2e/utils/offline-helpers.ts
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

export async function getCachedUrls(page: Page, cacheName: string): Promise<string[]> {
  return await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    return keys.map(k => new URL(k.url).pathname);
  }, cacheName);
}
```

### Step 3: Implement Service Worker Installation Tests

```typescript
// tests/e2e/pwa/install.spec.ts
import { test, expect } from '@playwright/test';
import { waitForServiceWorker, getCachedUrls } from '../utils/offline-helpers';

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

    // Check precache (adjust cache name to match your app)
    const cacheNames = await page.evaluate(async () => {
      return await caches.keys();
    });

    // Verify at least one cache exists
    expect(cacheNames.length).toBeGreaterThan(0);

    // Verify critical routes are cached
    const cachedUrls = await getCachedUrls(page, cacheNames[0]);
    expect(cachedUrls).toContain('/');
  });

  test('should have valid web app manifest', async ({ page }) => {
    await page.goto('/');

    const manifestUrl = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link?.getAttribute('href');
    });

    expect(manifestUrl).toBeTruthy();
  });
});
```

### Step 4: Implement Offline Navigation Tests

```typescript
// tests/e2e/pwa/offline-navigation.spec.ts
import { test, expect } from '@playwright/test';
import { goOffline, goOnline, waitForServiceWorker } from '../utils/offline-helpers';

test.describe('Offline Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // First visit while online to populate cache
    await page.goto('/');
    await waitForServiceWorker(page);

    // Visit key pages to cache them (customize for your app)
    await page.goto('/about');
    await page.goto('/');
  });

  test('should load homepage when offline', async ({ page, context }) => {
    await goOffline(context);
    await page.reload();

    // Verify page loads (adjust selector for your app)
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('should navigate to cached pages offline', async ({ page, context }) => {
    await goOffline(context);

    // Navigate to cached page (customize for your app)
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL('/about');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show offline page for uncached routes', async ({ page, context }) => {
    await goOffline(context);

    // Navigate to a page we haven't visited
    await page.goto('/uncached-route');

    // Verify offline handling (adjust based on your strategy)
    // Option 1: Offline fallback page
    // await expect(page).toHaveURL('/offline');

    // Option 2: Network error shown
    // await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should recover when back online', async ({ page, context }) => {
    await goOffline(context);
    await page.reload();

    // Verify offline indicator appears (if implemented)
    // await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    await goOnline(context);

    // Trigger network check
    await page.waitForTimeout(1000);

    // Verify online indicator disappears (if implemented)
    // await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });
});
```

### Step 5: Implement Offline Data Access Tests

```typescript
// tests/e2e/pwa/offline-data.spec.ts
import { test, expect } from '@playwright/test';
import { goOffline, waitForServiceWorker } from '../utils/offline-helpers';

test.describe('Offline Data Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForServiceWorker(page);

    // Wait for initial data sync (adjust timeout and selector for your app)
    await page.waitForSelector('[data-loaded="true"]', { timeout: 30000 });
  });

  test('should display data from IndexedDB offline', async ({ page, context }) => {
    // Navigate to data page
    await page.goto('/data');

    // Get item count while online
    const onlineCount = await page.locator('[data-testid="data-item"]').count();

    await goOffline(context);
    await page.reload();

    // Verify same items appear offline
    const offlineCount = await page.locator('[data-testid="data-item"]').count();
    expect(offlineCount).toBe(onlineCount);
  });

  test('should search local data offline', async ({ page, context }) => {
    await goOffline(context);
    await page.goto('/');

    // Perform search (customize for your app)
    await page.fill('[data-testid="search-input"]', 'test query');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Verify results from IndexedDB
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should access user data offline', async ({ page, context }) => {
    // Create user data while online (customize for your app)
    await page.goto('/profile');
    await page.click('[data-testid="save-preference"]');

    await goOffline(context);
    await page.goto('/profile');

    // Verify data is accessible
    await expect(page.locator('[data-testid="user-data"]')).toBeVisible();
  });

  test('should queue mutations for sync when offline', async ({ page, context }) => {
    await goOffline(context);

    // Attempt to create/update data
    await page.goto('/new-item');
    await page.fill('[data-testid="item-input"]', 'Offline item');
    await page.click('[data-testid="submit"]');

    // Verify queued for sync (customize based on your implementation)
    await expect(page.locator('[data-testid="sync-pending"]')).toBeVisible();
  });
});
```

### Step 6: Run Tests

```bash
# Run all E2E tests
npx playwright test

# Run only offline tests
npx playwright test --grep "offline"

# Run specific test file
npx playwright test tests/e2e/pwa/offline-navigation.spec.ts

# Run with UI
npx playwright test --ui

# Generate report
npx playwright show-report

# Debug mode
npx playwright test --debug
```

---

## Test Coverage Matrix

| Feature | Test File | Covered |
|---------|-----------|---------|
| SW Installation | install.spec.ts | |
| Offline Navigation | offline-navigation.spec.ts | |
| Offline Data Access | offline-data.spec.ts | |
| SW Update Flow | sw-update.spec.ts | |
| Background Sync | background-sync.spec.ts | |
| Cache Strategies | cache-strategies.spec.ts | |
| Network Fallbacks | network-fallbacks.spec.ts | |

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| playwright-report/ | `./` | HTML test report |
| test-results/ | `./` | Test screenshots and traces |
| offline-test-results.md | `.claude/artifacts/` | Test summary |

---

## Output Template

```markdown
## Offline E2E Test Report

### Date: [YYYY-MM-DD]

### Test Environment
- Browser: Chromium [version]
- Node: [version]
- Server: [url]
- Platform: [os]

### Test Results

#### PWA Installation
| Test | Result | Duration |
|------|--------|----------|
| SW installs | PASS/FAIL | Xs |
| Assets cached | PASS/FAIL | Xs |
| Manifest valid | PASS/FAIL | Xs |

#### Offline Navigation
| Test | Result | Duration |
|------|--------|----------|
| Homepage offline | PASS/FAIL | Xs |
| Navigation offline | PASS/FAIL | Xs |
| Offline fallback | PASS/FAIL | Xs |
| Online recovery | PASS/FAIL | Xs |

#### Offline Data
| Test | Result | Duration |
|------|--------|----------|
| Data from IndexedDB | PASS/FAIL | Xs |
| Search offline | PASS/FAIL | Xs |
| User data offline | PASS/FAIL | Xs |
| Mutation queuing | PASS/FAIL | Xs |

### Summary
- Total: [N] tests
- Passed: [N]
- Failed: [N]
- Skipped: [N]
- Duration: [Xs]

### Failures (if any)
```
[Error details with stack traces]
```

### Screenshots
- [Link to screenshots in test-results/]

### Recommendations
1. [Specific recommendations based on test results]
2. [Performance optimization opportunities]
3. [Edge cases to consider]
```

---

## Best Practices

1. **Clean Slate**: Clear Service Worker, caches, and IndexedDB before each test suite
2. **Timing**: Use appropriate waits for Service Worker installation and data sync
3. **Network Simulation**: Use `context.setOffline()` instead of browser-specific methods
4. **Assertions**: Verify both success cases and graceful degradation
5. **Debugging**: Capture screenshots and traces for failed tests
6. **CI Integration**: Use retries and appropriate timeouts in CI environment
7. **Isolation**: Ensure tests don't depend on each other

---

## Customization Guide

To adapt this harness for your specific app:

1. **Update selectors**: Replace `[data-testid="..."]` with your actual test IDs
2. **Update routes**: Replace example routes (`/about`, `/data`) with your app routes
3. **Update cache names**: Replace cache name checks with your actual cache strategy
4. **Update IndexedDB name**: Pass your actual database name to `clearIndexedDB()`
5. **Update sync indicators**: Customize offline/online indicator checks
6. **Add app-specific tests**: Add tests for your unique offline features
