# Skill: SW Update UX Strategy + Regression Tests

**ID**: `sw-update-ux`
**Category**: PWA / Offline
**Agent**: PWA Engineer / QA Engineer

---

## When to Use

- Implementing SW update flow
- Debugging update not appearing
- Improving update user experience
- After changing SW versioning

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |

---

## Steps

### Step 1: Understand SW Update Lifecycle

```
1. User visits site with SW v1 active
2. Browser checks for new SW in background
3. New SW v2 downloads and enters "waiting" state
4. v2 waits until all tabs with v1 are closed (or skipWaiting)
5. v2 activates and takes control
6. App should notify user of update
```

### Step 2: Implement Update Detection

```typescript
// lib/sw/register.ts
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Every hour

      // Listen for new SW
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW ready, show update prompt
              window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        }
      });
    });

    // Reload when new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}
```

### Step 3: Create Update Prompt UI

```typescript
// components/pwa/UpdatePrompt.tsx
'use client';

import { useEffect, useState } from 'react';

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setShowPrompt(true);
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  const handleUpdate = () => {
    // Tell waiting SW to activate
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal, show again later
    sessionStorage.setItem('update-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="update-prompt" role="alertdialog" aria-labelledby="update-title">
      <h3 id="update-title">Update Available</h3>
      <p>A new version of DMB Almanac is ready.</p>
      <div className="update-actions">
        <button onClick={handleUpdate} className="primary">
          Update Now
        </button>
        <button onClick={handleDismiss} className="secondary">
          Later
        </button>
      </div>
    </div>
  );
}
```

### Step 4: Handle Skip Waiting in SW

```javascript
// public/sw.js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Step 5: Implement Regression Tests

```typescript
// __tests__/e2e/sw-update.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Service Worker Update', () => {
  test('should show update prompt when new SW available', async ({ page }) => {
    // Visit site to install initial SW
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker.controller);

    // Simulate SW update
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    });

    // Verify prompt appears
    await expect(page.locator('[role="alertdialog"]')).toBeVisible();
    await expect(page.locator('#update-title')).toContainText('Update Available');
  });

  test('should reload after update', async ({ page }) => {
    await page.goto('/');

    // Track reload
    let reloaded = false;
    page.on('load', () => { reloaded = true; });

    // Trigger update
    await page.evaluate(() => {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Wait for reload
    await page.waitForEvent('load', { timeout: 5000 });
    expect(reloaded).toBe(true);
  });

  test('should dismiss prompt and remember', async ({ page }) => {
    await page.goto('/');

    // Show prompt
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    });

    // Dismiss
    await page.click('button:has-text("Later")');

    // Verify dismissed
    await expect(page.locator('[role="alertdialog"]')).not.toBeVisible();

    // Check storage
    const dismissed = await page.evaluate(() =>
      sessionStorage.getItem('update-dismissed')
    );
    expect(dismissed).toBeTruthy();
  });
});
```

### Step 6: Test Manual Update Flow

```markdown
## Manual SW Update Test

### Preparation
1. Deploy v1 of the app
2. Visit site, verify SW v1 is active
3. Make a change to sw.js (bump CACHE_VERSION)
4. Deploy v2

### Test Steps
1. [ ] Refresh page (don't close tab)
2. [ ] Wait for "Update Available" prompt (may take up to 24h in prod)
3. [ ] Click "Update Now"
4. [ ] Verify page reloads
5. [ ] Verify new SW is active (check DevTools)
6. [ ] Verify old caches are cleaned up

### Edge Cases
1. [ ] Multiple tabs open - update all
2. [ ] Dismiss prompt - shows again later
3. [ ] Offline during update - graceful handling
```

---

## Update UX Best Practices

### Do

- Show non-intrusive prompt
- Let user choose when to update
- Provide clear description of what's new
- Auto-update critical security fixes

### Don't

- Force immediate reload
- Show prompt during user action
- Update without notification
- Break offline functionality during update

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| update-ux-spec.md | `.claude/artifacts/` | UX specification |
| sw-update-tests.ts | `.claude/artifacts/` | Test file |
| update-test-results.md | `.claude/artifacts/` | Test results |

---

## Output Template

```markdown
## SW Update UX Report

### Date: [YYYY-MM-DD]

### Current Implementation
- Update detection: [Yes/No]
- Update prompt: [Yes/No]
- Skip waiting: [Yes/No]
- Auto-reload: [Yes/No]

### UX Flow
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Test Results
| Test | Result | Notes |
|------|--------|-------|
| Update detected | ✅ Pass | |
| Prompt shows | ✅ Pass | |
| Dismiss works | ✅ Pass | |
| Update applies | ✅ Pass | |
| Cache cleanup | ✅ Pass | |

### Issues Found
1. [Issue]

### Recommendations
1. [Recommendation]
```
