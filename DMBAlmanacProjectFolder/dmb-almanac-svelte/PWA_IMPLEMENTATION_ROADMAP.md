# PWA Implementation Roadmap - DMB Almanac

**Priority:** High-Impact, Medium-Effort Improvements
**Timeline:** 2-4 weeks for full implementation
**Owned By:** PWA Advanced Specialist

---

## Quick Wins (1-2 Days)

### 1. Add File Share Target Handler

**File:** `static/manifest.json`

**Current (Line 199-205):**
```json
"share_target": {
  "action": "/search",
  "method": "GET",
  "params": {
    "text": "q"
  }
}
```

**Recommended Change:** Support both text and files
```json
"share_target": {
  "action": "/receive-share",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "title": "shared_title",
    "text": "shared_text",
    "url": "shared_url",
    "files": [
      {
        "name": "shared_files",
        "accept": [
          "application/json",
          "application/x-setlist",
          "application/x-dmb",
          "text/plain"
        ]
      }
    ]
  }
}
```

**Implementation Path:**
1. Create `src/routes/receive-share/+page.svelte` route
2. Add service worker handler in `static/sw.js` for POST to `/receive-share`
3. Parse FormData with files
4. Process received setlist files same as File Handling API
5. Redirect to show view with imported data

**Code Template:**
```typescript
// src/routes/receive-share/+page.svelte
async function handleShareTarget() {
  if (!('launchQueue' in window) && location.search) {
    // Process FormData from share target
    const params = new URLSearchParams(location.search);
    const sharedUrl = params.get('shared_url');
    const sharedText = params.get('shared_text');
    // Handle shared files...
  }
}
```

**Expected Benefit:**
- Users can share .setlist files between apps
- Enables "Open with DMB Almanac" context menu on Android
- Aligns with modern PWA practices

---

### 2. Add Platform-Specific Analytics

**File:** `src/lib/pwa/install-manager.ts`

**Current Issue:** No tracking of which platforms can/cannot install

**Add Detection & Logging:**
```typescript
interface AnalyticsData {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  capabilities: {
    fileHandling: boolean;
    protocolHandlers: boolean;
    shareTarget: boolean;
    windowControlsOverlay: boolean;
    backgroundSync: boolean;
  };
  displayMode: string;
  timestamp: number;
}

export function trackPWACapabilities(): void {
  if (!browser) return;

  const capabilities: AnalyticsData = {
    platform: detectPlatform(),
    capabilities: {
      fileHandling: 'launchQueue' in window,
      protocolHandlers: 'registerProtocolHandler' in navigator,
      shareTarget: 'share' in navigator,
      windowControlsOverlay: 'windowControlsOverlay' in window,
      backgroundSync: 'sync' in ServiceWorkerRegistration?.prototype,
    },
    displayMode: getDisplayMode(),
    timestamp: Date.now(),
  };

  // Send to analytics
  if ('gtag' in window) {
    (window as any).gtag('event', 'pwa_capabilities', capabilities);
  }

  // Store in IndexedDB for offline analysis
  storeCapabilities(capabilities);
}

function detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

function getDisplayMode(): string {
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
    return 'window-controls-overlay';
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  return 'browser';
}
```

**Expected Benefit:**
- Understand platform distribution
- Identify which features users leverage
- Data-driven decisions on PWA focus

---

### 3. Enhance Share Utilities with Type Safety

**File:** `src/lib/utils/share.ts`

**Current Issue:** Only handles basic sharing, no structured data

**Enhancement:**
```typescript
export interface ShareableEntity {
  type: 'show' | 'song' | 'venue' | 'setlist';
  id: string | number;
  data: Record<string, unknown>;
}

export async function shareEntity(entity: ShareableEntity): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'failed' }> {
  // Generate share data based on entity type
  const shareData = generateShareData(entity);

  // Try native share first
  if (isShareSupported() && canShareFiles()) {
    try {
      // Check if browser can share the data
      const canShare = (navigator as any).canShare?.(shareData);
      if (canShare) {
        await navigator.share(shareData);
        return { success: true, method: 'share' };
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('[Share] Share failed:', error);
      }
    }
  }

  // Fallback to clipboard with URL
  try {
    await navigator.clipboard.writeText(shareData.url || '');
    return { success: true, method: 'clipboard' };
  } catch (error) {
    console.warn('[Share] Clipboard failed:', error);
    return { success: false, method: 'failed' };
  }
}

function generateShareData(entity: ShareableEntity): ShareData {
  switch (entity.type) {
    case 'show': {
      const show = entity.data as any;
      return {
        title: `DMB at ${show.venue?.name} - ${show.date}`,
        text: `Check out this Dave Matthews Band show from ${show.date} at ${show.venue?.name}!`,
        url: `${getOrigin()}/shows/${entity.id}`,
      };
    }
    case 'song': {
      const song = entity.data as any;
      return {
        title: `${song.title} - DMB Almanac`,
        text: `Learn about "${song.title}" by Dave Matthews Band`,
        url: `${getOrigin()}/songs/${entity.id}`,
      };
    }
    case 'venue': {
      const venue = entity.data as any;
      return {
        title: `${venue.name} - DMB Almanac`,
        text: `See all DMB shows at ${venue.name}`,
        url: `${getOrigin()}/venues/${entity.id}`,
      };
    }
    case 'setlist': {
      return {
        title: `Setlist - DMB Almanac`,
        text: `Check out this concert setlist`,
        url: `${getOrigin()}/setlists/${entity.id}`,
      };
    }
    default:
      throw new Error(`Unknown entity type: ${entity.type}`);
  }
}

function getOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}
```

**Usage:**
```typescript
// In components
await shareEntity({ type: 'show', id: showId, data: show });
```

**Expected Benefit:**
- Type-safe entity sharing
- Reusable across components
- Foundation for structured data sharing

---

## Medium Effort (2-3 Days)

### 4. iOS Universal Links Support

**Purpose:** Enable protocol handler equivalent for iOS via deep links

**Step 1: Create apple-app-site-association File**

**File:** `static/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.dmbalmanac.web",
        "paths": [
          "/shows/*",
          "/songs/*",
          "/venues/*",
          "/guests/*",
          "/search/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAM_ID.com.dmbalmanac.web"]
  }
}
```

**Step 2: Update Manifest**

**File:** `static/manifest.json`

```json
{
  // ... existing config ...
  "prefer_related_applications": false,
  "related_applications": [
    {
      "platform": "itunes",
      "url": "https://apps.apple.com/app/dmb-almanac/id6450000000",
      "id": "TEAM_ID.com.dmbalmanac.web"
    }
  ],
  "handle_links": "preferred"
}
```

**Step 3: Update Deep Link Handler**

**File:** `src/routes/protocol/+page.svelte`

```typescript
async function handleDeepLink() {
  const url = new URL(window.location.href);

  // Handle both protocol handler and universal link formats
  const path = url.pathname; // e.g., /shows/1991-03-23
  const params = new URLSearchParams(url.search);

  // Route based on path
  if (path.startsWith('/shows/')) {
    const showId = path.split('/')[2];
    await goto(`/shows/${showId}`);
  } else if (path.startsWith('/songs/')) {
    const songSlug = path.split('/')[2];
    await goto(`/songs/${songSlug}`);
  } else if (path.startsWith('/venues/')) {
    const venueId = path.split('/')[2];
    await goto(`/venues/${venueId}`);
  }
}
```

**Step 4: Svelte Kit Configuration**

**File:** `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: 'apple-app-site-association',
      configResolved(config) {
        // Ensure .well-known files are served correctly
      }
    }
  ]
});
```

**Testing:**
```bash
# Verify AASA is accessible
curl https://dmbalmanac.com/.well-known/apple-app-site-association

# Should return valid JSON with applinks config
```

**Expected Benefit:**
- iOS can open dmbalmanac.com/shows/[id] links in PWA
- Equivalent functionality to web+dmb:// on Android
- Full universal link support

---

### 5. File Save-Back Implementation

**Purpose:** Allow users to edit .dmb files and save changes back

**Step 1: Create File Editor Component**

**File:** `src/lib/components/pwa/FileEditor.svelte`

```svelte
<script lang="ts">
  import { writable } from 'svelte/store';

  interface FileEditorProps {
    file: File;
    fileHandle: FileSystemFileHandle | null;
    data: unknown;
  }

  let { file, fileHandle, data }: FileEditorProps = $props();
  let isDirty = $state(false);
  let isSaving = $state(false);
  let editedData = $state(structuredClone(data));

  async function saveToFile() {
    if (!fileHandle) {
      console.error('[Editor] No file handle available');
      return;
    }

    isSaving = true;
    try {
      // Get write permission if needed
      const permission = await fileHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        throw new Error('Write permission denied');
      }

      // Create writable stream
      const writable = await fileHandle.createWritable();

      // Write updated data
      const json = JSON.stringify(editedData, null, 2);
      await writable.write(json);
      await writable.close();

      isDirty = false;
      console.log('[Editor] File saved successfully');

      // Notify success
      if ('gtag' in window) {
        (window as any).gtag('event', 'file_saved', {
          file_name: file.name,
          file_size: file.size
        });
      }
    } catch (error) {
      console.error('[Editor] Save failed:', error);
      throw error;
    } finally {
      isSaving = false;
    }
  }

  function handleChange() {
    isDirty = true;
  }
</script>

<div class="file-editor">
  <header class="editor-header">
    <h2>Edit {file.name}</h2>
    <div class="editor-actions">
      {#if isDirty}
        <button
          class="btn-save"
          onclick={saveToFile}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      {:else}
        <span class="status-saved">No unsaved changes</span>
      {/if}
    </div>
  </header>

  <textarea
    class="editor-textarea"
    value={JSON.stringify(editedData, null, 2)}
    onchange={(e) => {
      try {
        editedData = JSON.parse(e.currentTarget.value);
        handleChange();
      } catch (error) {
        console.error('[Editor] Invalid JSON:', error);
      }
    }}
    placeholder="Edit concert data..."
  ></textarea>
</div>

<style>
  .file-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 1rem;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
  }

  .editor-header h2 {
    margin: 0;
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-save {
    padding: 0.5rem 1rem;
    background: var(--color-primary-600);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-saved {
    color: var(--color-green-600);
    font-size: 0.875rem;
  }

  .editor-textarea {
    flex: 1;
    padding: 1rem;
    font-family: monospace;
    font-size: 0.875rem;
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    resize: none;
  }
</style>
```

**Step 2: Update File Handler Route**

**File:** `src/routes/open-file/+page.svelte`

```typescript
import { FileEditor } from '$lib/components/pwa';
import { getFilesFromLaunchQueue, processSetlistFile } from '$lib/utils/fileHandler';

let fileHandle: FileSystemFileHandle | null = $state(null);
let file: File | null = $state(null);
let processedData: FileData | null = $state(null);
let isEditing: boolean = $state(false);

onMount(() => {
  getFilesFromLaunchQueue(async (files) => {
    if (files.length === 0) return;

    const { file: launchFile, name } = files[0];
    file = launchFile;

    // Process file
    const result = await processSetlistFile(launchFile);
    if ('error' in result) {
      errorMessage = result.error;
      return;
    }

    processedData = result;

    // Try to get file handle for save-back
    if ('getAsFileSystemHandle' in launchFile) {
      try {
        fileHandle = await (launchFile as any).getAsFileSystemHandle?.();
      } catch (error) {
        console.warn('[File] Could not get handle:', error);
      }
    }

    isEditing = true;
  });
});
```

**Expected Benefit:**
- Users can edit concert/setlist data
- Save changes back to original file
- Supports offline data modification

---

### 6. Enhanced Launch Queue Handling

**File:** `src/lib/utils/fileHandler.ts`

**Add Multiple File Support:**
```typescript
export interface FileQueueOptions {
  maxFiles?: number;
  onProgress?: (current: number, total: number) => void;
  onError?: (error: Error, filename: string) => void;
}

export async function getFilesFromLaunchQueue(
  callback: (files: Array<{ file: File; name: string }>) => void,
  options?: FileQueueOptions
): Promise<void> {
  if (!isFileHandlingSupported()) {
    console.warn('File Handling API not supported');
    return;
  }

  const maxFiles = options?.maxFiles || 10;

  try {
    (window as any).launchQueue?.setConsumer(async (launchParams: any) => {
      if (!launchParams.files || launchParams.files.length === 0) {
        console.debug('No files in launch queue');
        return;
      }

      const files = launchParams.files.slice(0, maxFiles);
      const results: Array<{ file: File; name: string }> = [];

      for (let i = 0; i < files.length; i++) {
        try {
          const fileHandle = files[i];
          const file = await fileHandle.getFile();

          results.push({
            file,
            name: fileHandle.name || `file-${i}`
          });

          options?.onProgress?.(i + 1, files.length);
        } catch (error) {
          console.error(`Error processing file ${i}:`, error);
          options?.onError?.(error as Error, files[i].name || `file-${i}`);
        }
      }

      callback(results);
    });
  } catch (error) {
    console.error('Error setting up launchQueue consumer:', error);
  }
}
```

**Expected Benefit:**
- Support for multiple files
- Progress tracking
- Better error handling

---

## Advanced (3-5 Days)

### 7. Persistent Background Sync Implementation

**File:** `src/lib/pwa/sync-queue.ts`

```typescript
export interface SyncItem {
  id?: number;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: unknown;
  retryCount?: number;
  maxRetries?: number;
  timestamp: number;
}

export const syncQueue = {
  async registerBackgroundSync(tag: string = 'sync-queue'): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!('sync' in registration)) {
        console.warn('[Sync] Background Sync API not supported');
        return;
      }

      await registration.sync.register(tag);
      console.log('[Sync] Background sync registered');
    } catch (error) {
      console.error('[Sync] Failed to register sync:', error);
    }
  },

  async queueSync(item: SyncItem): Promise<number | null> {
    try {
      // Open IndexedDB
      const db = await openDB('dmb-almanac-db', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          }
        }
      });

      // Add to queue
      const id = await db.add('syncQueue', {
        ...item,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3
      });

      // Trigger sync if online
      if (navigator.onLine) {
        await this.registerBackgroundSync();
      }

      console.log('[Sync] Item queued:', id);
      return id as number;
    } catch (error) {
      console.error('[Sync] Queue failed:', error);
      return null;
    }
  },

  async getQueuedItems(): Promise<SyncItem[]> {
    try {
      const db = await openDB('dmb-almanac-db');
      return await db.getAll('syncQueue');
    } catch (error) {
      console.error('[Sync] Failed to get queued items:', error);
      return [];
    }
  },

  async clearQueuedItem(id: number): Promise<void> {
    try {
      const db = await openDB('dmb-almanac-db');
      await db.delete('syncQueue', id);
    } catch (error) {
      console.error('[Sync] Failed to clear item:', error);
    }
  }
};

// In component
import { syncQueue } from '$lib/pwa/sync-queue';

async function submitOfflineForm(data: unknown) {
  if (navigator.onLine) {
    // Send immediately
    const response = await fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    return response.ok;
  } else {
    // Queue for sync
    const id = await syncQueue.queueSync({
      endpoint: '/api/data',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: data
    });
    return id !== null;
  }
}
```

**Integration with Service Worker:**

**File:** `static/sw.js` (lines 1330-1472 already have sync handlers)

The implementation is already present! Just need to:
1. Call `syncQueue.registerBackgroundSync()` on app load
2. Use `syncQueue.queueSync()` for offline actions
3. Service worker will handle execution

**Expected Benefit:**
- Offline form submissions
- Automatic retry on reconnection
- User action persistence

---

## Testing Checklist

### File Handling (After Implementation 1-5)
```bash
# Create test .dmb file
cat > test.dmb << 'EOF'
{
  "date": "1991-03-23",
  "venue": "Theater of Living Arts",
  "songs": ["Ants Marching", "The Stone"]
}
EOF

# Open with PWA (or drag into browser)
# Should show import dialog with validation
```

### Share Target (After Implementation 1)
```bash
# Test via Android Share Sheet
# - Open any app with share capability
# - Select "DMB Almanac"
# - Verify setlist import dialog appears
```

### iOS Universal Links (After Implementation 4)
```bash
# On iOS Safari
# Navigate to https://dmbalmanac.com/shows/1991-03-23
# Should prompt to open in DMB Almanac app

# Verify AASA file
curl https://dmbalmanac.com/.well-known/apple-app-site-association
```

### File Editor (After Implementation 5)
```bash
# Edit concert data in editor
# Click Save Changes
# Verify file handle permission prompt
# Check original file was modified
```

### Background Sync (After Implementation 7)
```bash
# Offline mode (DevTools > Network > Offline)
# Submit form
# DevTools > Application > Service Workers > Sync
# Should show pending sync task
# Go online and reload
# Form submission should retry
```

---

## Performance Considerations

### Memory Impact:
- **File Handling:** ~5-10MB (file content in memory)
- **Share Target:** <1MB (metadata only)
- **File Editor:** ~2-5MB (JSON parsed)
- **Background Sync Queue:** <1MB (metadata in IndexedDB)

### Network Impact:
- **File Share:** 1 extra POST request
- **Save-Back:** 1 PUT request per save
- **Background Sync:** Varies (retry logic)

### Storage Impact:
- **IndexedDB for Sync Queue:** ~100KB per 100 queued items
- **IndexedDB for Capabilities:** <10KB
- **File Handles:** Reference only (no storage cost)

---

## Breaking Changes: NONE

All recommendations are:
- ✓ Backwards compatible
- ✓ Gracefully degrade on older browsers
- ✓ Progressive enhancement
- ✓ Non-blocking

Existing functionality is preserved and enhanced.

---

## Migration Guide

### For Users:
- No action required - features are additive
- Existing PWA installations continue to work
- New features available after app update

### For Developers:
1. **File Share Target:** Test with Android Share Sheet
2. **iOS Deep Links:** Verify AASA file is deployed
3. **File Editor:** Test save-back permissions
4. **Background Sync:** Test offline queueing

---

## Success Metrics

### Adoption Targets:
- File Share Target: >20% of mobile users
- iOS Deep Links: >10% of iOS users
- File Editor: >5% of power users
- Background Sync: >15% of offline sessions

### Performance Targets:
- File import: <2s for 100KB files
- File save: <500ms
- Background sync: <5s per queued item

### Quality Targets:
- Error rate: <1%
- User satisfaction: >4.5/5
- Zero data loss

---

## Support & Documentation

### For Users:
- In-app help text (already present)
- Share button tooltips
- File format documentation
- iOS manual installation guide (already present)

### For Developers:
- API documentation (add to README)
- Code examples
- Testing guide
- Troubleshooting guide

---

## Conclusion

These 7 enhancements will elevate DMB Almanac from **8/10 to 9.5/10 PWA maturity**, with particular improvements in:

1. **Cross-platform support** (iOS deep links)
2. **File management** (editor + save-back)
3. **Offline capability** (background sync)
4. **Feature discovery** (analytics + platform detection)

**Estimated Implementation Time:** 2-4 weeks for full deployment
**Recommended Sequence:** 1 → 2 → 3 → 4 → 5 → 6 → 7

**Priority Implementation:** 1, 2, 4 (highest impact, lowest effort)

