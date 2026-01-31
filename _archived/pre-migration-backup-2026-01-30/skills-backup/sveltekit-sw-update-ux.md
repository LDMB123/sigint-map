---
name: sveltekit-sw-update-ux
description: "sveltekit sw update ux for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Skill: SW Update UX Strategy + Regression Tests

**ID**: `sw-update-ux`
**Category**: PWA / Offline
**Agent**: PWA Engineer / QA Engineer

---

## When to Use

- Implementing SW update notification flow
- Debugging updates not appearing
- Improving update user experience
- After changing SW versioning strategy
- Testing PWA update behavior

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to SvelteKit project root |

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
// src/lib/sw/register.ts
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

### Step 3: Create Update Prompt Component

```svelte
<!-- src/lib/components/UpdatePrompt.svelte -->
<script>
  import { onMount } from 'svelte';

  let showPrompt = $state(false);

  onMount(() => {
    const handleUpdate = () => {
      showPrompt = true;
    };

    window.addEventListener('sw-update-available', handleUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  });

  function handleUpdate() {
    // Tell waiting SW to activate
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
  }

  function handleDismiss() {
    showPrompt = false;
    // Store dismissal, show again later
    sessionStorage.setItem('update-dismissed', Date.now().toString());
  }
</script>

{#if showPrompt}
  <div class="update-prompt" role="alertdialog" aria-labelledby="update-title">
    <h3 id="update-title">Update Available</h3>
    <p>A new version is ready. Refresh to get the latest features.</p>
    <div class="update-actions">
      <button onclick={handleUpdate} class="primary">
        Update Now
      </button>
      <button onclick={handleDismiss} class="secondary">
        Later
      </button>
    </div>
  </div>
{/if}

<style>
  .update-prompt {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    max-width: 20rem;
    z-index: 1000;
  }

  .update-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  button {
    flex: 1;
    padding: 0.5rem;
    border-radius: 0.25rem;
    border: none;
    cursor: pointer;
  }

  .primary {
    background: var(--color-primary);
    color: white;
  }

  .secondary {
    background: var(--color-surface-2);
    color: var(--color-text);
  }
</style>
```

### Step 4: Handle Skip Waiting in SW

```javascript
// static/sw.js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Step 5: Add Component to Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { registerServiceWorker } from '$lib/sw/register';
  import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';

  onMount(() => {
    registerServiceWorker();
  });
</script>

<UpdatePrompt />

<slot />
```

### Step 6: Implement Regression Tests

```typescript
// tests/e2e/sw-update.spec.ts
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

### Step 7: Test Manual Update Flow

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

- Show non-intrusive prompt (bottom corner)
- Let user choose when to update
- Provide clear description of what's new
- Auto-update critical security fixes
- Persist update state across page navigations

### Don't

- Force immediate reload without warning
- Show prompt during critical user actions
- Update without any notification
- Break offline functionality during update
- Show multiple prompts simultaneously

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
1. [Step 1: User visits site]
2. [Step 2: New SW detected]
3. [Step 3: Prompt shown]
4. [Step 4: User accepts/dismisses]
5. [Step 5: SW activates]

### Test Results
| Test | Result | Notes |
|------|--------|-------|
| Update detected | [Pass/Fail] | |
| Prompt shows | [Pass/Fail] | |
| Dismiss works | [Pass/Fail] | |
| Update applies | [Pass/Fail] | |
| Cache cleanup | [Pass/Fail] | |

### Issues Found
1. [Issue description]

### Recommendations
1. [Recommendation with rationale]
```
