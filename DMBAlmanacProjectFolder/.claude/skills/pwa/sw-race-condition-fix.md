# Skill: Service Worker Race Condition Fix

**ID**: `sw-race-condition-fix`
**Category**: PWA / Debugging
**Agent**: PWA Specialist

---

## When to Use

- Duplicate Service Worker registrations detected
- "SW registered" logged multiple times in console
- Multiple initialization calls from different components
- Initialization race condition during app startup
- Service worker event listeners being set multiple times
- Testing shows 2+ registrations in DevTools

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| pwa_store_path | string | No | Path to PWA store/state file (e.g., `src/lib/stores/pwa.ts`) |
| init_locations | array | No | Files that call initialize() |

---

## Steps

### Step 1: Identify Race Condition Sources

First, find all locations where initialization happens:

```bash
# Find all initialization calls
grep -r "registerServiceWorker\|pwaStore\.initialize\|sw\.register\|navigator\.serviceWorker\.register" \
  src/lib src/routes --include="*.ts" --include="*.tsx" --include="*.svelte" --include="*.js"
```

**Typical locations:**

| Location | Framework | Risk |
|----------|-----------|------|
| `src/routes/+layout.svelte` | SvelteKit | HIGH - called once per route |
| `App.tsx` or `_app.tsx` | React/Next | MEDIUM - once per mount |
| `InstallPrompt.svelte` component | Svelte | HIGH - may mount before layout |
| `onMounted` hook | Vue | MEDIUM - component lifecycle |
| `useEffect([])` | React | HIGH - runs on every mount |

### Step 2: Understand the Problem

**Root Cause:**

Multiple components call `initialize()` before checking if already initialized.

**Timeline (showing race condition):**

```
Time  Event
──────────────────────────────────────
t=0   +layout.svelte loads
      └─> onMount() calls pwaStore.initialize()
          ├─ Set initialized = false
          ├─ async registration starts...
          └─ (does not set flag immediately)

t=1   InstallPrompt.svelte loads
      └─> onMount() also calls pwaStore.initialize()
          ├─ Reads initialized = false (still!)
          ├─ Starts SECOND registration...
          └─ Multiple listeners attached

t=50ms Both initializations complete
       └─ 2 registrations, 2 listeners on all events
```

**Impact:**

- Event listeners attached multiple times
- Duplicate "SW registered" console logs
- Multiple handlers process same event
- Memory leak from duplicate listeners
- UI state updates triggered multiple times

### Step 3: Fix: Add Synchronous Initialization Guard

The key is using a **synchronous flag** that's set immediately, not waiting for async:

**Pattern A: Module-Level Flag (Best)**

```typescript
// src/lib/stores/pwa.ts
import { writable } from 'svelte/store';

let initialized = false; // Module-level flag

export const pwaStore = {
  async initialize() {
    // Guard: if already initialized, exit immediately
    if (initialized) {
      console.log('PWA already initialized, skipping');
      return;
    }

    // Set flag BEFORE any async work
    initialized = true;

    // Now safe to do async initialization
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('✓ SW registered:', registration.scope);
      } catch (error) {
        console.error('✗ SW registration failed:', error);
        initialized = false; // Reset on error for retry
      }
    }
  }
};
```

**Why it works:**

```javascript
// Call 1 from +layout.svelte
pwaStore.initialize()
  ├─ Check: initialized = false ✓
  ├─ Set: initialized = true (synchronous!)
  └─ Start async registration

// Call 2 from InstallPrompt.svelte (microseconds later)
pwaStore.initialize()
  ├─ Check: initialized = true ✓ (blocked!)
  └─ Return early (no duplicate)
```

**Pattern B: Svelte Store Promise (Alternative)**

```typescript
// src/lib/stores/pwa.ts
import { derived } from 'svelte/store';

let initPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export const pwaStore = {
  initialize(): Promise<ServiceWorkerRegistration | null> {
    // Guard: return existing promise if already initialized
    if (initPromise) {
      console.log('PWA initialization already in progress');
      return initPromise;
    }

    // Create promise ONCE
    initPromise = (async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          return registration;
        } catch (error) {
          console.error('SW registration failed:', error);
          initPromise = null; // Reset on error
          return null;
        }
      }
      return null;
    })();

    return initPromise;
  }
};
```

**Why it works:**

- Returns same Promise to all callers
- Only one registration process starts
- All callers get same result

**Pattern C: React useEffect (For React/Next.js)**

```typescript
// src/lib/hooks/usePWA.ts
import { useEffect, useRef } from 'react';

let initialized = false;

export function usePWA() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Guard: module-level flag
    if (initialized) return;
    initialized = true;

    // Initialize PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
  }, []); // Run once on mount
}
```

### Step 4: Implement the Fix

**For SvelteKit/Svelte:**

Replace your pwa.ts store with:

```typescript
// src/lib/stores/pwa.ts
import { writable, derived } from 'svelte/store';

// ========== STATE ==========
let initializationStarted = false;
let swRegistration: ServiceWorkerRegistration | null = null;

export const pwaState = writable({
  isSupported: false,
  isReady: false,
  isInstalled: false,
  isOffline: false,
  hasUpdate: false,
  registration: null as ServiceWorkerRegistration | null
});

// ========== INITIALIZATION ==========
export const pwaStore = {
  /**
   * Initialize PWA system (safe to call multiple times)
   * Uses synchronous guard flag to prevent race conditions
   */
  async initialize() {
    // GUARD: Exit immediately if already started
    if (initializationStarted) {
      console.log('PWA initialization already in progress');
      return;
    }

    // Set flag SYNCHRONOUSLY before any async work
    initializationStarted = true;

    if ('serviceWorker' in navigator) {
      try {
        // Register Service Worker
        swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('✓ Service Worker registered:', swRegistration.scope);

        pwaState.update(state => ({
          ...state,
          isSupported: true,
          isReady: true,
          registration: swRegistration
        }));

        // Setup update detection
        this.setupUpdateDetection();

        // Check if app is installed
        this.checkInstallation();

        // Setup offline detection
        this.setupOfflineDetection();

      } catch (error) {
        console.error('✗ Service Worker registration failed:', error);
        pwaState.update(state => ({ ...state, isSupported: false }));
      }
    }
  },

  setupUpdateDetection() {
    if (!swRegistration) return;

    // Listen for update found event
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration!.installing;
      if (!newWorker) return;

      console.log('Update found, new SW installing...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('✓ Update available');
          pwaState.update(state => ({ ...state, hasUpdate: true }));
        }
      });
    });

    // Check for updates periodically (every 1 hour)
    setInterval(() => {
      swRegistration?.update();
    }, 60 * 60 * 1000);
  },

  checkInstallation() {
    // Check if running in standalone mode
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    pwaState.update(state => ({ ...state, isInstalled: isStandalone }));
  },

  setupOfflineDetection() {
    const updateOnlineStatus = () => {
      pwaState.update(state => ({ ...state, isOffline: !navigator.onLine }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial check
    updateOnlineStatus();
  },

  async updateServiceWorker() {
    if (!swRegistration?.waiting) {
      console.log('No waiting service worker');
      return;
    }

    // Send skip waiting message
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for page reload
    await new Promise(resolve => {
      const listener = () => {
        window.removeEventListener('controllerchange', listener);
        resolve(null);
      };
      navigator.serviceWorker.addEventListener('controllerchange', listener);
    });

    window.location.reload();
  }
};
```

**For React/Next.js:**

```typescript
// src/lib/pwa/initialize.ts
let initialized = false;

export async function initializePWA() {
  if (initialized) return;
  initialized = true;

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('✓ SW registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('✗ SW registration failed:', error);
    }
  }
}
```

```tsx
// src/app.tsx or your root component
import { useEffect } from 'react';
import { initializePWA } from '@/lib/pwa/initialize';

export default function App() {
  useEffect(() => {
    initializePWA();
  }, []);

  return <>{/* app content */}</>;
}
```

### Step 5: Remove Duplicate Initialization Calls

Audit all components to find and remove redundant calls:

```bash
# Find all files with initialization calls
grep -r "initialize\|register.*serviceWorker" src/lib src/routes \
  --include="*.svelte" --include="*.tsx" --include="*.ts"
```

**What to keep:**

- One call in root layout or App component
- Wrap in useEffect/onMount with dependency array `[]`

**What to remove:**

- Initialization in child components (InstallPrompt, UpdatePrompt, etc.)
- Multiple calls in different routes
- Calls in utility functions that get called multiple times

**Example: Remove from InstallPrompt.svelte**

```svelte
<!-- BEFORE (BAD - causes race condition) -->
<script>
  import { pwaStore } from '$stores/pwa';

  onMount(() => {
    pwaStore.initialize(); // ❌ Also called in +layout
  });
</script>

<!-- AFTER (GOOD - store handles initialization) -->
<script>
  import { pwaState } from '$stores/pwa';
</script>

{#if $pwaState.isSupported}
  <!-- Use state, don't initialize -->
{/if}
```

### Step 6: Test the Fix

**Console Test:**

```javascript
// Open console before page loads
// Should see ONLY ONE log: "Service Worker registered: /"

// Test: Call initialize multiple times
for (let i = 0; i < 5; i++) {
  pwaStore.initialize();
}
// Should only see single registration, not 5
```

**DevTools Test:**

1. Open DevTools > Application > Service Workers
2. Refresh page
3. Should see ONLY ONE registration
4. Status should be "activated and running"

**Automated Test:**

```typescript
// test/pwa.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { pwaStore } from '$lib/stores/pwa';

describe('PWA Initialization', () => {
  it('should only register once when called multiple times', async () => {
    const promises = [
      pwaStore.initialize(),
      pwaStore.initialize(),
      pwaStore.initialize()
    ];

    await Promise.all(promises);

    // Get registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    expect(registrations).toHaveLength(1);
  });

  it('should log initialization only once', () => {
    const logs: string[] = [];
    console.log = (msg: string) => logs.push(msg);

    pwaStore.initialize();
    pwaStore.initialize();

    expect(logs.filter(l => l.includes('registered'))).toHaveLength(1);
  });
});
```

### Step 7: Verify Memory Leaks Are Fixed

```javascript
// In DevTools: Memory tab

// Step 1: Take heap snapshot
// Memory > Take snapshot

// Step 2: Interact with page, reload 5 times
// Watch DevTools > Network tab

// Step 3: Take another snapshot
// Memory > Take snapshot

// Step 4: Compare
// Should be similar size, no growth

// Also check for duplicate listeners:
// DevTools > Elements > Select any element
// Console > getEventListeners(element)
// Should not see duplicate listeners for same event
```

---

## Expected Output

### Success Case

```markdown
## Race Condition Fix Applied ✓

### Before
```
Service Worker registered: /
Service Worker registered: /  <- DUPLICATE
Service Worker registered: /  <- DUPLICATE
```

### After
```
Service Worker registered: /  <- SINGLE
```

### Changes Made
1. Added module-level `initializationStarted` flag
2. Guard checks flag before any async work
3. Removed initialization calls from child components
4. Added test to verify single registration

### Verification
- [ ] DevTools shows 1 registration
- [ ] Console shows 1 "SW registered" message
- [ ] Memory stable after reload
- [ ] Event listeners not duplicated
- [ ] Lighthouse PWA score: 90+
```

### Problem Case

```markdown
## Race Condition Detected ⚠️

### Issue
- Multiple registrations: 3 detected
- Memory grows 50MB over 5 reloads
- Event listeners duplicated

### Root Cause
- `initialize()` called from:
  1. src/routes/+layout.svelte (line 45)
  2. src/components/pwa/InstallPrompt.svelte (line 23)
  3. src/components/pwa/UpdatePrompt.svelte (line 18)

### Fix Required
1. Keep call only in +layout.svelte
2. Remove from InstallPrompt and UpdatePrompt
3. Add guard flag to store
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| pwa-store-fixed.ts | `.claude/artifacts/` | Fixed PWA store with guard |
| initialization-audit.md | `.claude/artifacts/` | List of all init calls found |
| migration-checklist.md | `.claude/artifacts/` | Steps to apply fix |
| test-race-condition.ts | `.claude/artifacts/` | Automated test to verify fix |

---

## Related Skills

- `sw-debugging-checklist` - Comprehensive SW debugging
- `sw-memory-leak-detection` - Memory leak diagnosis
- `sw-update-ux` - Update notification UI patterns

---

## References

- [MDN: Service Worker Registration](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)
- [Race Condition Patterns](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [SvelteKit Lifecycle](https://kit.svelte.dev/docs/modules#sveltejs-kit)
