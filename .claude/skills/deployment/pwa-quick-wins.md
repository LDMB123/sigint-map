---
name: pwa-quick-wins
version: 1.0.0
description: **Status:** Ready for immediate implementation
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: deployment
complexity: advanced
tags:
  - deployment
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/docs/quick-references/PWA_QUICK_WINS_GUIDE.md
migration_date: 2026-01-25
---

# PWA Quick Wins Implementation Guide
## DMB Almanac - Ready to Code

**Status:** Ready for immediate implementation
**Target Time:** 2-3 hours total
**Complexity:** Low-Medium

---

## QUICK WIN #1: Enable Periodic Sync

### Problem
Service worker has `periodicsync` event listener but it's never registered, so data never auto-refreshes.

### Location
**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/+layout.svelte`

**Current Code (lines 50-54):**
```typescript
// Register Background Sync for offline mutations (Chrome 49+)
// This allows mutations to be processed even when the app is closed
registerBackgroundSync().catch((err) => {
  console.debug('[Layout] Background Sync registration failed (non-critical):', err);
});
```

### Solution
Add periodic sync registration after background sync setup:

```typescript
// NEW CODE - Add after line 54
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Register periodic sync for 24-hour data freshness checks
    if ('periodicSync' in registration) {
      await (registration as any).periodicSync.register('check-data-freshness', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      });
      console.log('[Layout] Periodic sync registered for data freshness checks');
    }
  } catch (error) {
    console.debug('[Layout] Periodic sync registration failed (non-critical):', error);
  }
}
```

### What This Does
✅ Registers service worker to check data freshness every 24 hours
✅ Service worker already has handler in `/static/sw.js` line 1346
✅ Runs even when app is closed
✅ Syncs fresh data on background wake

### Browser Support
- Chrome 80+
- Edge 80+
- Samsung Browser 12+
- Firefox (planned)
- Safari (not supported)

### Testing
```bash
# In Chrome DevTools:
# 1. Application tab > Service Workers
# 2. Simulate periodic sync event
# Check console for: "[SW] Periodic sync: checking data freshness"
```

---

## QUICK WIN #2: Integrate Badging API

### Problem
Offline mutation queue exists but users have no visual indicator of pending changes.

### Location
**File 1:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/+layout.svelte`

**File 2:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/services/offlineMutationQueue.ts`

### Solution

#### Step 1: Import Badge Utilities
In `/src/routes/+layout.svelte` (around line 10, with other imports):

```typescript
import { setAppBadge, clearAppBadge } from '$lib/utils/appBadge';
```

#### Step 2: Add Reactive Badge Update
In `/src/routes/+layout.svelte` (around line 80, with other $effect blocks):

```typescript
// AFTER the offline indicator effect (line 82-89)
// Update app badge based on offline mutation queue
$effect(() => {
  if (browser && offlineMutationQueue) {
    const pendingCount = offlineMutationQueue.filter(
      (item) => item.status === 'pending' || item.status === 'retrying'
    ).length;

    if (pendingCount > 0) {
      setAppBadge(pendingCount);
    } else {
      clearAppBadge();
    }
  }
});
```

**OR** in `/src/lib/services/offlineMutationQueue.ts` inside `initializeQueue()`:

```typescript
// Add subscription to queue store updates
const unsubscribe = queueStore.subscribe(($queue) => {
  const pendingCount = $queue.filter(
    (item) => item.status === 'pending' || item.status === 'retrying'
  ).length;

  if (pendingCount > 0) {
    setAppBadge(pendingCount).catch(console.debug);
  } else {
    clearAppBadge().catch(console.debug);
  }
});

// Add to cleanup
onDestroy(() => {
  unsubscribe();
});
```

### What This Does
✅ Shows badge count on app icon (native app style)
✅ Updates automatically when queue changes
✅ Clears when all mutations sync
✅ Gracefully hidden if browser doesn't support Badge API

### Browser Support
- Chrome 81+
- Edge 81+
- Samsung Browser 13+
- Safari 16+ (partial)

### Appearance
| Platform | Display |
|----------|---------|
| macOS app icon | Badge on icon corner |
| Android | Badge in launcher |
| Windows | Badge on taskbar |
| iOS | Badge count (iOS 16+) |

### Testing
```bash
# 1. Open DevTools Console:
navigator.setAppBadge(5)  # Should show badge with "5"
navigator.clearAppBadge() # Should remove badge

# 2. Go offline, make changes (e.g., favorite a show)
# 3. Badge should appear on icon
# 4. Go online, changes should sync, badge disappears
```

---

## QUICK WIN #3: File Handle Storage for Save-Back

### Problem
Users can open files via file handler, but can't save edits back to original file.

### Location
**File 1:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/fileHandler.ts`

**File 2:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/open-file/+page.svelte`

### Solution

#### Step 1: Create File Handle Storage
Create new file: `/src/lib/pwa/file-handles.ts`

```typescript
/**
 * File Handle Storage for PWA file handlers
 * Enables save-back capability for files opened via launchQueue
 */

import { browser } from '$app/environment';

// Store handles in memory (persists during session)
const fileHandleMap = new Map<string, FileSystemFileHandle>();

/**
 * Store a file handle for later write operations
 * @param handle - FileSystemFileHandle from launchQueue
 * @param fileId - Unique identifier (filename, show ID, etc.)
 */
export function storeFileHandle(handle: FileSystemFileHandle, fileId: string): void {
  if (!browser) return;
  fileHandleMap.set(fileId, handle);
  console.log('[FileHandles] Stored handle for:', fileId);
}

/**
 * Retrieve stored file handle
 */
export function getFileHandle(fileId: string): FileSystemFileHandle | undefined {
  return fileHandleMap.get(fileId);
}

/**
 * Save content to original file
 * Requires user permission (granted when file was opened)
 */
export async function saveToOriginalFile(
  fileId: string,
  content: string | object
): Promise<{ success: boolean; error?: string }> {
  const handle = fileHandleMap.get(fileId);

  if (!handle) {
    return { success: false, error: 'File handle not found. File must be opened via file handler.' };
  }

  try {
    // Check permission (usually already granted from initial file open)
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const requestResult = await handle.requestPermission({ mode: 'readwrite' });
      if (requestResult !== 'granted') {
        return { success: false, error: 'Write permission denied' };
      }
    }

    // Create writable stream
    const writable = await handle.createWritable();

    // Write content
    if (typeof content === 'object') {
      await writable.write(JSON.stringify(content, null, 2));
    } else {
      await writable.write(content);
    }

    // Close and flush to disk
    await writable.close();

    console.log('[FileHandles] Saved to original file:', fileId);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FileHandles] Save failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Clear stored handle (after save or on component unmount)
 */
export function clearFileHandle(fileId: string): void {
  fileHandleMap.delete(fileId);
}

/**
 * Clear all stored handles
 */
export function clearAllFileHandles(): void {
  fileHandleMap.clear();
}
```

#### Step 2: Integrate in Layout
In `/src/routes/+layout.svelte` around line 80 (in onMount):

```typescript
import { storeFileHandle, clearAllFileHandles } from '$lib/pwa/file-handles';

onMount(() => {
  // ... existing code ...

  // Handle files opened via launchQueue
  if ('launchQueue' in window) {
    (window as any).launchQueue.setConsumer(async (launchParams: any) => {
      if (!launchParams.files?.length) return;

      for (const fileHandle of launchParams.files) {
        const file = await fileHandle.getFile();

        // Store handle for potential save-back operations
        storeFileHandle(fileHandle, file.name);

        // Navigate to file processing route
        goto(`/open-file?fileName=${encodeURIComponent(file.name)}`);
      }
    });
  }

  // Cleanup on unmount
  return () => {
    cleanupQueue();
    clearAllFileHandles();
  };
});
```

#### Step 3: Use in Show/Song Editor Component
Example in any show/song editing component:

```typescript
<script lang="ts">
  import { saveToOriginalFile, getFileHandle } from '$lib/pwa/file-handles';

  let isEditMode = $state(false);
  let editedData = $state<any>(null);
  let isSaving = $state(false);
  let saveMessage = $state<string | null>(null);

  export let sourceFile: string | null = null; // Filename if opened via file handler

  async function handleSaveToFile() {
    if (!sourceFile) {
      console.warn('No source file - save only via server');
      return;
    }

    isSaving = true;
    const result = await saveToOriginalFile(sourceFile, editedData);

    if (result.success) {
      saveMessage = 'Saved to original file!';
      setTimeout(() => saveMessage = null, 3000);
    } else {
      saveMessage = `Save failed: ${result.error}`;
    }

    isSaving = false;
  }
</script>

<!-- In your component template -->
{#if sourceFile}
  <button
    onclick={handleSaveToFile}
    disabled={isSaving}
    class="save-file-btn"
  >
    {isSaving ? 'Saving...' : 'Save to Original File'}
  </button>
{/if}

{#if saveMessage}
  <div class="save-message">{saveMessage}</div>
{/if}
```

### What This Does
✅ Stores FileSystemFileHandle from launchQueue
✅ Enables save-back to original file location
✅ Graceful fallback if handle not available
✅ Full permission handling
✅ Works with JSON, text, any content

### Browser Support
- Chrome 86+
- Edge 86+
- Not supported on Safari/iOS

### Testing
```bash
# 1. Create a .dmb or .json file on desktop
# 2. Open it with the PWA app (file handler)
# 3. Edit something
# 4. Click "Save to Original File"
# 5. Check original file - should have updates
```

### Security Notes
- Users grant permission when opening file initially
- Permission persists for that handle during session
- User must re-grant if new session / reloaded app
- No automatic write - only on explicit user action

---

## QUICK WIN #4: Window Controls Overlay CSS

### Problem
PWA configured for window controls overlay but no CSS styling exists.

### Location
**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css`

### Solution

Add to `/src/app.css` (top of file, before existing rules):

```css
/* Window Controls Overlay Support (Chrome 85+) */
@supports (padding: max(0px)) {
  :root {
    --titlebar-height: env(titlebar-area-height, 0px);
    --titlebar-width: env(titlebar-area-width, 100%);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-top: env(safe-area-inset-top, 0px);
  }

  html {
    /* Reserve space for system title bar and window controls */
    padding-top: max(
      env(safe-area-inset-top, 0px),
      env(titlebar-area-height, 0px)
    );
    padding-left: max(env(safe-area-inset-left, 0px), 0px);
    padding-right: max(env(safe-area-inset-right, 0px), 0px);
  }

  body {
    /* Ensure body doesn't overlap title bar */
    margin: 0;
  }
}

/* Title bar area for dragging window */
.titlebar-area {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(titlebar-area-height, 0px);
  background: var(--color-surface, #030712);
  border-bottom: 1px solid var(--color-border, #1a1a2e);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 1000;

  /* Allow window dragging on this area */
  -webkit-app-region: drag;

  /* Prevent text selection on drag */
  user-select: none;
}

/* Prevent dragging on interactive elements */
.titlebar-area button,
.titlebar-area a,
.titlebar-area input,
.titlebar-area [onclick] {
  -webkit-app-region: no-drag;
}

/* Title text in title bar */
.titlebar-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #ffffff);
  flex: 1;
  margin-left: 12px;

  /* Prevent interaction */
  -webkit-app-region: drag;
  pointer-events: none;
}
```

#### Step 2: Add Title Bar Component
Create `/src/lib/components/window/WindowTitleBar.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';

  // Get page title from route or metadata
  let pageTitle = $derived.by(() => {
    const title = $page.data?.title || 'DMB Almanac';
    const subtitle = $page.data?.subtitle || '';
    return subtitle ? `${title} - ${subtitle}` : title;
  });

  // Check if window controls overlay is available
  const hasWindowControlsOverlay = typeof window !== 'undefined' &&
    'titlebarAreaX' in document.documentElement.style;
</script>

{#if hasWindowControlsOverlay}
  <div class="titlebar-area">
    <span class="titlebar-title">{pageTitle}</span>
  </div>
{/if}

<style>
  .titlebar-area {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: env(titlebar-area-height, 40px);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    padding: 0 16px;
    z-index: 1000;
    -webkit-app-region: drag;
    user-select: none;
  }

  .titlebar-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    -webkit-app-region: drag;
    pointer-events: none;
  }
</style>
```

#### Step 3: Add to Root Layout
In `/src/routes/+layout.svelte` (add import and component):

```typescript
import WindowTitleBar from '$lib/components/window/WindowTitleBar.svelte';
```

```svelte
<WindowTitleBar />

{@render children()}
```

### What This Does
✅ Reserves space for system title bar on desktop PWA
✅ Shows custom app title in title bar area
✅ Allows window dragging from title bar
✅ Gracefully hidden on non-desktop/non-supporting browsers
✅ Responsive - content doesn't overlap

### Browser Support
- Chrome 85+ (on Windows/Mac/Linux installed as PWA)
- Edge 85+
- Samsung Browser 14+
- Safari (not supported)

### Appearance
| Platform | Result |
|----------|--------|
| macOS Standalone | Custom title bar with app title |
| Windows Standalone | DM window controls + custom bar |
| Linux Standalone | Custom draggable title bar |
| Mobile | Hidden (no title bar area) |

### Testing
```bash
# 1. Build and install PWA to desktop
npm run build && npm run preview

# 2. On desktop, open as installed app (not in browser)
# 3. Title bar should show "DMB Almanac" or current page title
# 4. Should be able to drag window from title bar
# 5. Click buttons in app should still work (not drag)
```

---

## IMPLEMENTATION CHECKLIST

### Before You Start
- [ ] Review current file contents
- [ ] Check TypeScript compilation
- [ ] Ensure service worker is registered

### Quick Win #1: Periodic Sync
- [ ] Edit `/src/routes/+layout.svelte` line 54
- [ ] Add periodic sync registration code
- [ ] Test in Chrome DevTools Service Workers tab
- [ ] Verify console logs for success

### Quick Win #2: Badging API
- [ ] Import `setAppBadge` and `clearAppBadge`
- [ ] Add $effect block for badge updates
- [ ] Test offline mutations
- [ ] Verify badge appears on app icon

### Quick Win #3: File Handles
- [ ] Create `/src/lib/pwa/file-handles.ts`
- [ ] Update `/src/routes/+layout.svelte`
- [ ] Test by opening file via file handler
- [ ] Verify save-back functionality

### Quick Win #4: Window Controls Overlay
- [ ] Add CSS to `/src/app.css`
- [ ] Create `/src/lib/components/window/WindowTitleBar.svelte`
- [ ] Update `/src/routes/+layout.svelte`
- [ ] Build and test as installed PWA

---

## TESTING SCRIPT

```bash
#!/bin/bash
echo "PWA Quick Wins Testing"

# 1. Build
npm run build
if [ $? -ne 0 ]; then echo "Build failed"; exit 1; fi

# 2. Preview
npm run preview &
PREVIEW_PID=$!
sleep 5

# 3. Test with Chrome
echo "Opening in Chrome..."
open -a "Google Chrome" "http://localhost:4173"

# Prompt user
read -p "Test complete? Press Enter..."

# Cleanup
kill $PREVIEW_PID
```

---

## DEBUGGING

### Periodic Sync Not Triggering
```javascript
// In Chrome DevTools Console:
navigator.serviceWorker.ready.then(reg => {
  console.log('Has periodicSync:', 'periodicSync' in reg);
  if ('periodicSync' in reg) {
    reg.periodicSync.getTags().then(tags => console.log('Sync tags:', tags));
  }
});
```

### Badge Not Showing
```javascript
// Test badge API:
navigator.setAppBadge(5).then(() => console.log('Badge set'));
navigator.clearAppBadge().then(() => console.log('Badge cleared'));
```

### File Handle Issues
```javascript
// Check if launchQueue supported:
console.log('launchQueue available:', 'launchQueue' in window);

// Check stored handles:
// (Need to expose fileHandleMap for debugging)
```

### Window Controls Not Visible
```javascript
// Check support:
const style = document.documentElement.style;
console.log('titlebar-area-height:',
  getComputedStyle(document.documentElement)
    .getPropertyValue('--titlebar-height'));
```

---

## ROLLBACK PLAN

Each change is isolated and can be reverted:

1. **Periodic Sync:** Delete the new periodicSync.register code block
2. **Badging API:** Remove the $effect block and imports
3. **File Handles:** Delete the new files and remove imports
4. **Window Controls:** Remove CSS and component imports

---

## ESTIMATED TIME BREAKDOWN

| Task | Time | Difficulty |
|------|------|------------|
| Periodic Sync | 15 min | Easy |
| Badging API | 20 min | Easy |
| File Handles | 45 min | Medium |
| Window Controls | 30 min | Medium |
| **Total** | **110 min** | **Easy-Medium** |

---

## SUCCESS METRICS

After implementation, verify:

- [ ] Periodic sync event fires in DevTools
- [ ] Badge shows count on app icon when offline
- [ ] Files can be saved back to original location
- [ ] Window title bar visible in desktop installed app
- [ ] All features gracefully hidden on unsupported browsers
- [ ] No console errors
- [ ] App performance unchanged

---

## NEXT STEPS

After these Quick Wins:
1. Protocol handler URI parsing (2-3 hours)
2. Notification actions (2-3 hours)
3. Launch handler optimization (2-3 hours)
4. Share target file uploads (4-5 hours)

Total Phase 1 estimate: **1-2 weeks**

