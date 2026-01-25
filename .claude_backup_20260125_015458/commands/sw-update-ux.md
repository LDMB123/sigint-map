# Service Worker Update UX Patterns

## Usage

```
/sw-update-ux [update-strategy] [user-prompt-style]
```

## Instructions

You are an expert in Progressive Web App user experience with deep knowledge of service worker lifecycle management, update notification patterns, and seamless version transitions. You understand the balance between immediate updates, user disruption, and data integrity in SvelteKit applications.

Implement or audit service worker update UX patterns that provide clear communication to users while maintaining application stability.

## Update Strategy Comparison

| Strategy | User Experience | Data Risk | Implementation |
|----------|-----------------|-----------|----------------|
| Silent auto-update | Seamless, no prompt | Low (careful planning) | Complex |
| Toast notification | Non-intrusive prompt | Low | Moderate |
| Modal prompt | Explicit user choice | Very low | Simple |
| Banner persistent | Always visible option | Very low | Simple |
| Version check on navigate | Natural transition | Low | Moderate |

## Update Lifecycle States

| State | Description | User Action | SW State |
|-------|-------------|-------------|----------|
| `checking` | Checking for updates | None | Fetching |
| `available` | New version ready | Can update | `installed` |
| `downloading` | Caching new assets | Wait | `installing` |
| `ready` | Update installed | Reload to apply | `waiting` |
| `active` | Update applied | None | `activated` |
| `error` | Update failed | Retry/ignore | Error |

## SvelteKit Update Store

```typescript
// src/lib/pwa/update-store.ts
import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

interface UpdateStore {
  state: UpdateState;
  registration: ServiceWorkerRegistration | null;
  newWorker: ServiceWorker | null;
  error: Error | null;
}

function createUpdateStore() {
  const { subscribe, set, update } = writable<UpdateStore>({
    state: 'idle',
    registration: null,
    newWorker: null,
    error: null
  });

  let registration: ServiceWorkerRegistration | null = null;

  async function init() {
    if (!browser || !('serviceWorker' in navigator)) return;

    try {
      registration = await navigator.serviceWorker.ready;

      // Listen for new service workers
      registration.addEventListener('updatefound', () => {
        const newWorker = registration!.installing;
        if (!newWorker) return;

        update(s => ({ ...s, state: 'downloading', newWorker }));

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New version waiting
              update(s => ({ ...s, state: 'ready', newWorker }));
            } else {
              // First install
              update(s => ({ ...s, state: 'idle' }));
            }
          }
        });
      });

      // Check if update already waiting
      if (registration.waiting) {
        update(s => ({
          ...s,
          state: 'ready',
          registration,
          newWorker: registration!.waiting
        }));
      }

      update(s => ({ ...s, registration }));
    } catch (error) {
      update(s => ({ ...s, state: 'error', error: error as Error }));
    }
  }

  async function checkForUpdate() {
    if (!registration) return;

    update(s => ({ ...s, state: 'checking' }));

    try {
      await registration.update();
      // State will be updated by updatefound listener
      setTimeout(() => {
        update(s => s.state === 'checking' ? { ...s, state: 'idle' } : s);
      }, 3000);
    } catch (error) {
      update(s => ({ ...s, state: 'error', error: error as Error }));
    }
  }

  function applyUpdate() {
    update(s => {
      if (s.newWorker && s.state === 'ready') {
        s.newWorker.postMessage({ type: 'SKIP_WAITING' });
      }
      return s;
    });
  }

  function dismissUpdate() {
    update(s => ({ ...s, state: 'idle', newWorker: null }));
  }

  // Listen for controller change (update applied)
  if (browser && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  return {
    subscribe,
    init,
    checkForUpdate,
    applyUpdate,
    dismissUpdate
  };
}

export const updateStore = createUpdateStore();

// Derived stores for convenience
export const updateState: Readable<UpdateState> = derived(
  updateStore,
  $store => $store.state
);

export const updateAvailable: Readable<boolean> = derived(
  updateStore,
  $store => $store.state === 'ready'
);
```

### Service Worker Message Handler

```typescript
// Add to src/service-worker.ts
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version });
  }
});
```

## UI Components

### Toast Notification Component

```svelte
<!-- src/lib/components/UpdateToast.svelte -->
<script lang="ts">
  import { updateStore, updateState } from '$lib/pwa/update-store';
  import { fly, fade } from 'svelte/transition';
  import { onMount } from 'svelte';

  let visible = false;
  let countdown = 10;
  let interval: ReturnType<typeof setInterval>;

  $: if ($updateState === 'ready') {
    visible = true;
    startCountdown();
  }

  function startCountdown() {
    countdown = 10;
    clearInterval(interval);
    interval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  function handleUpdate() {
    clearInterval(interval);
    updateStore.applyUpdate();
  }

  function handleDismiss() {
    clearInterval(interval);
    visible = false;
    updateStore.dismissUpdate();
  }

  onMount(() => {
    return () => clearInterval(interval);
  });
</script>

{#if visible}
  <div
    class="update-toast"
    transition:fly={{ y: 100, duration: 300 }}
    role="alert"
    aria-live="polite"
  >
    <div class="toast-content">
      <div class="toast-icon">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="toast-text">
        <strong>Update available</strong>
        <p>A new version is ready to install.</p>
      </div>
    </div>
    <div class="toast-actions">
      <button class="btn-dismiss" on:click={handleDismiss}>
        Later
      </button>
      <button class="btn-update" on:click={handleUpdate}>
        Update now
      </button>
    </div>
  </div>
{/if}

<style>
  .update-toast {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface-elevated, #1a1a2e);
    border: 1px solid var(--border-color, #333);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 90vw;
    width: 360px;
  }

  .toast-content {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .toast-icon {
    color: var(--color-success, #4ade80);
    flex-shrink: 0;
  }

  .toast-text strong {
    display: block;
    color: var(--text-primary, #fff);
  }

  .toast-text p {
    margin: 0.25rem 0 0;
    color: var(--text-secondary, #999);
    font-size: 0.875rem;
  }

  .toast-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn-dismiss {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-secondary, #999);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-update {
    background: var(--color-primary, #3b82f6);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-update:hover {
    background: var(--color-primary-hover, #2563eb);
  }
</style>
```

### Update Banner Component

```svelte
<!-- src/lib/components/UpdateBanner.svelte -->
<script lang="ts">
  import { updateStore, updateState } from '$lib/pwa/update-store';
  import { slide } from 'svelte/transition';

  $: showBanner = $updateState === 'ready';

  function handleUpdate() {
    updateStore.applyUpdate();
  }
</script>

{#if showBanner}
  <div class="update-banner" transition:slide={{ duration: 200 }}>
    <span>A new version is available.</span>
    <button on:click={handleUpdate}>
      Refresh to update
    </button>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: var(--color-info, #3b82f6);
    color: white;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    z-index: 9999;
    font-size: 0.875rem;
  }

  button {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  button:hover {
    background: rgba(255,255,255,0.3);
  }
</style>
```

### Modal Update Dialog

```svelte
<!-- src/lib/components/UpdateModal.svelte -->
<script lang="ts">
  import { updateStore, updateState } from '$lib/pwa/update-store';
  import { fade, scale } from 'svelte/transition';

  export let showChangelog = false;
  export let changelog: string[] = [];

  $: showModal = $updateState === 'ready';

  function handleUpdate() {
    updateStore.applyUpdate();
  }

  function handleLater() {
    updateStore.dismissUpdate();
  }
</script>

{#if showModal}
  <div class="modal-overlay" transition:fade={{ duration: 150 }}>
    <div
      class="modal-content"
      transition:scale={{ duration: 200, start: 0.95 }}
      role="dialog"
      aria-labelledby="update-title"
      aria-describedby="update-description"
    >
      <div class="modal-header">
        <h2 id="update-title">Update Available</h2>
      </div>

      <div class="modal-body">
        <p id="update-description">
          A new version of this app is ready. Update now to get the latest features and improvements.
        </p>

        {#if showChangelog && changelog.length > 0}
          <div class="changelog">
            <h3>What's new:</h3>
            <ul>
              {#each changelog as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={handleLater}>
          Remind me later
        </button>
        <button class="btn-primary" on:click={handleUpdate}>
          Update now
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
  }

  .modal-content {
    background: var(--surface, #1a1a2e);
    border-radius: 16px;
    max-width: 420px;
    width: 100%;
    overflow: hidden;
  }

  .modal-header {
    padding: 1.5rem 1.5rem 0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary, #fff);
  }

  .modal-body {
    padding: 1rem 1.5rem;
  }

  .modal-body p {
    margin: 0;
    color: var(--text-secondary, #999);
    line-height: 1.5;
  }

  .changelog {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--surface-sunken, #0f0f1a);
    border-radius: 8px;
  }

  .changelog h3 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: var(--text-primary, #fff);
  }

  .changelog ul {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--text-secondary, #999);
    font-size: 0.875rem;
  }

  .changelog li {
    margin: 0.25rem 0;
  }

  .modal-footer {
    padding: 1rem 1.5rem 1.5rem;
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-secondary, #999);
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn-primary {
    background: var(--color-primary, #3b82f6);
    border: none;
    color: white;
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }
</style>
```

### Layout Integration

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { updateStore } from '$lib/pwa/update-store';
  import UpdateToast from '$lib/components/UpdateToast.svelte';

  onMount(() => {
    updateStore.init();

    // Check for updates every hour
    const interval = setInterval(() => {
      updateStore.checkForUpdate();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  });
</script>

<slot />
<UpdateToast />
```

### Response Format

```markdown
## Service Worker Update UX Report

### Current Implementation
- Update strategy: [None/Silent/Toast/Modal/Banner]
- User notification: [Yes/No]
- Auto-update: [Enabled/Disabled]

### Recommended Pattern
Based on the application type: [Strategy name]

### Implementation

#### Update Store
```typescript
// src/lib/pwa/update-store.ts
[Generated code]
```

#### UI Component
```svelte
<!-- src/lib/components/[Component].svelte -->
[Generated code]
```

#### Layout Integration
```svelte
<!-- src/routes/+layout.svelte -->
[Integration code]
```

### User Flow Diagram
```
[Idle] -> (Check) -> [Checking] -> (Found) -> [Available]
                         |                         |
                         v                         v
                    (No update)            [Downloading]
                         |                         |
                         v                         v
                     [Idle]                   [Ready]
                                                  |
                                    (User action / Auto)
                                                  |
                                                  v
                                             [Reload]
```

### Testing Scenarios
- [ ] Fresh install shows no update prompt
- [ ] Update found triggers notification
- [ ] User can dismiss notification
- [ ] User can apply update
- [ ] Page reloads after update applied
- [ ] Update state persists across page navigation

### Accessibility Checklist
- [ ] ARIA live regions for announcements
- [ ] Focus management on modal open/close
- [ ] Keyboard navigation support
- [ ] Screen reader friendly labels
```
