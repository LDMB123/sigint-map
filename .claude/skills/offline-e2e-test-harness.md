---
skill: offline-e2e-test-harness
description: Offline E2E Test Harness
---

# Offline E2E Test Harness

Comprehensive end-to-end testing framework for Progressive Web App (PWA) offline behavior, service worker functionality, and network resilience.

## Usage

```
/offline-e2e-test-harness [test-scope: full|service-worker|cache|sync|fallback]
```

## Instructions

You are an expert PWA testing specialist with deep knowledge of service workers, Cache API, IndexedDB, Background Sync, and offline-first architecture. When invoked, generate comprehensive E2E tests that verify offline functionality across all network conditions.

### Test Categories

| Category | Description | Priority |
|----------|-------------|----------|
| Service Worker Lifecycle | Registration, activation, update flow | Critical |
| Cache Strategies | Cache-first, network-first, stale-while-revalidate | Critical |
| Offline Fallback | Fallback pages, offline indicators | High |
| Background Sync | Queued operations, retry logic | High |
| IndexedDB Persistence | Data storage, retrieval, sync | High |
| Network Transitions | Online-to-offline, offline-to-online | Medium |
| Push Notifications | Offline notification handling | Medium |
| Asset Precaching | Critical asset availability | Critical |

### Network Conditions Matrix

| Condition | Latency | Throughput | Packet Loss |
|-----------|---------|------------|-------------|
| Offline | N/A | 0 | 100% |
| Slow 3G | 400ms | 400 Kbps | 0% |
| Fast 3G | 150ms | 1.5 Mbps | 0% |
| Flaky | 200ms | 1 Mbps | 30% |
| Lie-Fi | 2000ms | 50 Kbps | 10% |

### Playwright Test Examples

```typescript
// tests/e2e/offline/service-worker.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Service Worker Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and wait for SW registration
    await page.goto('/');
    await page.waitForFunction(() => {
      return navigator.serviceWorker.ready;
    });
  });

  test('should register service worker on first visit', async ({ page }) => {
    const swRegistration = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        active: !!registration?.active,
        scope: registration?.scope,
        state: registration?.active?.state
      };
    });

    expect(swRegistration.active).toBe(true);
    expect(swRegistration.state).toBe('activated');
  });

  test('should handle SW update correctly', async ({ page, context }) => {
    // Simulate new SW version
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });

    // Check for update UI prompt
    const updatePrompt = page.locator('[data-testid="sw-update-prompt"]');
    // May or may not appear depending on whether update exists
  });

  test('should skip waiting when user confirms update', async ({ page }) => {
    await page.evaluate(() => {
      navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    });

    // Verify page reloads or updates
    await page.waitForEvent('load', { timeout: 5000 }).catch(() => {});
  });
});

test.describe('Offline Cache Behavior', () => {
  test('should serve cached content when offline', async ({ page, context }) => {
    // First visit - populate cache
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Capture initial content
    const onlineContent = await page.locator('main').textContent();

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Verify cached content served
    const offlineContent = await page.locator('main').textContent();
    expect(offlineContent).toBe(onlineContent);
  });

  test('should show offline indicator when network unavailable', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);

    // Trigger network request
    await page.click('[data-testid="fetch-data-btn"]');

    // Verify offline indicator appears
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();
    await expect(offlineIndicator).toHaveText(/offline|no connection/i);
  });

  test('should display offline fallback page for uncached routes', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);

    // Navigate to uncached route
    await page.goto('/uncached-route');

    // Verify fallback page
    const fallbackPage = page.locator('[data-testid="offline-fallback"]');
    await expect(fallbackPage).toBeVisible();
  });

  test('should cache API responses with stale-while-revalidate', async ({ page, context }) => {
    // First request - network fetch
    await page.goto('/api-page');
    const firstResponse = await page.locator('[data-testid="api-data"]').textContent();

    // Go offline
    await context.setOffline(true);

    // Reload - should serve stale cache
    await page.reload();
    const cachedResponse = await page.locator('[data-testid="api-data"]').textContent();
    expect(cachedResponse).toBe(firstResponse);

    // Verify stale indicator if applicable
    const staleIndicator = page.locator('[data-testid="stale-data-indicator"]');
    await expect(staleIndicator).toBeVisible();
  });
});

test.describe('Background Sync', () => {
  test('should queue form submission when offline', async ({ page, context }) => {
    await page.goto('/form-page');
    await context.setOffline(true);

    // Submit form while offline
    await page.fill('[data-testid="input-field"]', 'Test data');
    await page.click('[data-testid="submit-btn"]');

    // Verify queued indicator
    const queuedIndicator = page.locator('[data-testid="sync-pending"]');
    await expect(queuedIndicator).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
  });

  test('should persist queued operations in IndexedDB', async ({ page, context }) => {
    await page.goto('/form-page');
    await context.setOffline(true);

    // Queue multiple operations
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="input-field"]', `Test ${i}`);
      await page.click('[data-testid="submit-btn"]');
    }

    // Check IndexedDB queue
    const queuedOps = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('sync-queue');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction('pending-requests', 'readonly');
      const store = tx.objectStore('pending-requests');
      return new Promise<number>((resolve) => {
        const countReq = store.count();
        countReq.onsuccess = () => resolve(countReq.result);
      });
    });

    expect(queuedOps).toBe(3);
  });
});

test.describe('Network Transitions', () => {
  test('should recover gracefully from offline to online', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);

    // Verify offline state
    await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/offline/i);

    // Go online
    await context.setOffline(false);

    // Wait for reconnection
    await page.waitForSelector('[data-testid="connection-status"]:has-text("online")', {
      timeout: 5000
    });

    // Verify data refresh
    const refreshIndicator = page.locator('[data-testid="data-refreshed"]');
    await expect(refreshIndicator).toBeVisible();
  });

  test('should handle flaky network conditions', async ({ page, context }) => {
    await page.goto('/');

    // Simulate flaky network
    for (let i = 0; i < 5; i++) {
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);
      await page.waitForTimeout(500);
    }

    // Verify app remains stable
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

    // Check no error modals
    const errorModal = page.locator('[data-testid="error-modal"]');
    await expect(errorModal).not.toBeVisible();
  });
});
```

### Vitest Unit Tests for Service Worker Logic

```typescript
// tests/unit/service-worker/cache-strategy.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheStrategy } from '@/sw/cache-strategy';

describe('Cache Strategy', () => {
  let cacheStrategy: CacheStrategy;
  let mockCache: Cache;
  let mockRequest: Request;

  beforeEach(() => {
    mockCache = {
      match: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as Cache;

    caches.open = vi.fn().mockResolvedValue(mockCache);
    cacheStrategy = new CacheStrategy('test-cache');
    mockRequest = new Request('https://example.com/api/data');
  });

  describe('cacheFirst', () => {
    it('should return cached response if available', async () => {
      const cachedResponse = new Response('cached data');
      mockCache.match = vi.fn().mockResolvedValue(cachedResponse);

      const result = await cacheStrategy.cacheFirst(mockRequest);

      expect(result).toBe(cachedResponse);
      expect(mockCache.match).toHaveBeenCalledWith(mockRequest);
    });

    it('should fetch from network if cache miss', async () => {
      mockCache.match = vi.fn().mockResolvedValue(undefined);
      const networkResponse = new Response('network data');
      global.fetch = vi.fn().mockResolvedValue(networkResponse.clone());

      const result = await cacheStrategy.cacheFirst(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith(mockRequest);
      expect(mockCache.put).toHaveBeenCalled();
    });
  });

  describe('networkFirst', () => {
    it('should return network response when available', async () => {
      const networkResponse = new Response('fresh data');
      global.fetch = vi.fn().mockResolvedValue(networkResponse.clone());

      const result = await cacheStrategy.networkFirst(mockRequest);

      expect(result.status).toBe(200);
    });

    it('should fall back to cache on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const cachedResponse = new Response('cached data');
      mockCache.match = vi.fn().mockResolvedValue(cachedResponse);

      const result = await cacheStrategy.networkFirst(mockRequest);

      expect(result).toBe(cachedResponse);
    });
  });

  describe('staleWhileRevalidate', () => {
    it('should return cached response immediately', async () => {
      const cachedResponse = new Response('stale data');
      mockCache.match = vi.fn().mockResolvedValue(cachedResponse);
      global.fetch = vi.fn().mockResolvedValue(new Response('fresh data'));

      const result = await cacheStrategy.staleWhileRevalidate(mockRequest);

      expect(result).toBe(cachedResponse);
    });

    it('should update cache in background', async () => {
      const cachedResponse = new Response('stale data');
      mockCache.match = vi.fn().mockResolvedValue(cachedResponse);
      const freshResponse = new Response('fresh data');
      global.fetch = vi.fn().mockResolvedValue(freshResponse.clone());

      await cacheStrategy.staleWhileRevalidate(mockRequest);

      // Wait for background update
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockCache.put).toHaveBeenCalled();
    });
  });
});

// tests/unit/service-worker/sync-queue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncQueue } from '@/sw/sync-queue';

describe('Sync Queue', () => {
  let syncQueue: SyncQueue;

  beforeEach(() => {
    syncQueue = new SyncQueue();
    // Mock IndexedDB
    indexedDB.open = vi.fn().mockImplementation(() => ({
      result: mockIDBDatabase,
      onsuccess: null,
      onerror: null,
    }));
  });

  it('should add operation to queue', async () => {
    const operation = {
      url: '/api/submit',
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      timestamp: Date.now()
    };

    await syncQueue.enqueue(operation);

    const queue = await syncQueue.getAll();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject(operation);
  });

  it('should process queue in FIFO order', async () => {
    const ops = [
      { url: '/api/1', method: 'POST', body: '1', timestamp: 1 },
      { url: '/api/2', method: 'POST', body: '2', timestamp: 2 },
      { url: '/api/3', method: 'POST', body: '3', timestamp: 3 },
    ];

    for (const op of ops) {
      await syncQueue.enqueue(op);
    }

    const processOrder: string[] = [];
    global.fetch = vi.fn().mockImplementation((url) => {
      processOrder.push(url);
      return Promise.resolve(new Response('ok'));
    });

    await syncQueue.processAll();

    expect(processOrder).toEqual(['/api/1', '/api/2', '/api/3']);
  });

  it('should retry failed operations with exponential backoff', async () => {
    const operation = { url: '/api/fail', method: 'POST', body: '{}', timestamp: Date.now() };
    await syncQueue.enqueue(operation);

    let attempts = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve(new Response('ok'));
    });

    await syncQueue.processAll({ maxRetries: 3, backoffMs: 100 });

    expect(attempts).toBe(3);
  });
});
```

### Test Configuration

```typescript
// playwright.config.ts (offline testing additions)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'offline-chrome',
      use: {
        ...devices['Desktop Chrome'],
        serviceWorkers: 'allow',
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-features=NetworkService'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Response Format

```
## Offline E2E Test Report

### Test Scope: [full|service-worker|cache|sync|fallback]

### Test Suite Summary

| Suite | Tests | Passed | Failed | Skipped |
|-------|-------|--------|--------|---------|
| Service Worker Lifecycle | X | X | X | X |
| Cache Strategies | X | X | X | X |
| Offline Fallback | X | X | X | X |
| Background Sync | X | X | X | X |
| Network Transitions | X | X | X | X |

### Generated Test Files

1. `tests/e2e/offline/service-worker.spec.ts`
   - [X tests] covering SW lifecycle

2. `tests/e2e/offline/cache.spec.ts`
   - [X tests] covering cache strategies

3. `tests/e2e/offline/sync.spec.ts`
   - [X tests] covering background sync

4. `tests/unit/sw/*.test.ts`
   - [X tests] unit tests for SW logic

### Critical Test Scenarios Covered

- [ ] SW registration and activation
- [ ] Cache-first for static assets
- [ ] Network-first for API calls
- [ ] Offline fallback page
- [ ] Background sync queue persistence
- [ ] Online/offline transition handling
- [ ] Flaky network resilience

### Run Commands

\`\`\`bash
# Run all offline tests
npx playwright test --grep @offline

# Run with network throttling
npx playwright test --project=slow-network

# Debug specific test
npx playwright test --debug tests/e2e/offline/cache.spec.ts

# Generate report
npx playwright test --reporter=html
\`\`\`

### Recommendations

1. **Coverage Gaps**: [List any missing scenarios]
2. **Flaky Tests**: [Identify potentially flaky tests]
3. **CI Integration**: [Suggestions for CI setup]
```
