# Chrome 143 Stable API Reference for Data-Rich PWAs

> **Target**: Chrome 143+ (January 2026 Stable)
> **Platform**: macOS 26.2 with Apple Silicon (M1/M2/M3/M4)
> **Last Updated**: January 2026

This document provides comprehensive implementation guidance for cutting-edge Chrome 143 APIs optimized for data-rich Progressive Web Applications. All code examples target Chromium-only features without legacy fallbacks.

---

## Table of Contents

1. [View Transitions API](#1-view-transitions-api)
2. [Speculation Rules API](#2-speculation-rules-api)
3. [Scheduler API](#3-scheduler-api)
4. [Navigation API](#4-navigation-api)
5. [Web Locks API](#5-web-locks-api)
6. [File System Access API](#6-file-system-access-api)
7. [WebGPU](#7-webgpu)
8. [Web Speech API](#8-web-speech-api)
9. [FedCM API](#9-fedcm-api)
10. [CSS Features](#10-css-features)
11. [Performance APIs](#11-performance-apis)
12. [Background APIs](#12-background-apis)

---

## 1. View Transitions API

**Chrome Version**: 111+ (SPA), 126+ (MPA), Enhanced 142+ (document.activeViewTransition)

The View Transitions API enables smooth, native-like page and element transitions for both single-page and multi-page applications.

### 1.1 Same-Document (SPA) Transitions

```typescript
// Basic SPA view transition with TypeScript
async function navigateWithTransition(updateCallback: () => Promise<void>): Promise<void> {
  // Check for View Transitions support (Chrome 111+)
  if (!document.startViewTransition) {
    await updateCallback();
    return;
  }

  const transition = document.startViewTransition(async () => {
    await updateCallback();
  });

  // Access transition lifecycle
  await transition.ready;  // Pseudo-elements created, animation starting
  // Custom animation logic here if needed

  await transition.finished;  // Transition complete
}

// Usage with DOM update
async function showProductDetails(productId: string): Promise<void> {
  await navigateWithTransition(async () => {
    const product = await fetchProduct(productId);
    document.querySelector('.content')!.innerHTML = renderProductDetails(product);
  });
}
```

### 1.2 Cross-Document (MPA) Transitions (Chrome 126+)

```css
/* Enable MPA view transitions via CSS at-rule */
@view-transition {
  navigation: auto;
}

/* Named view transition elements */
.hero-image {
  view-transition-name: hero;
}

.page-title {
  view-transition-name: title;
}

.nav-bar {
  view-transition-name: nav;
}

/* Transition animations */
::view-transition-old(hero) {
  animation: fade-out 300ms ease-out;
}

::view-transition-new(hero) {
  animation: fade-in 300ms ease-in;
}

::view-transition-group(hero) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Page-level transitions */
::view-transition-old(root) {
  animation: slide-out-left 250ms ease-out;
}

::view-transition-new(root) {
  animation: slide-in-right 250ms ease-in;
}

@keyframes slide-out-left {
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
}
```

### 1.3 document.activeViewTransition (Chrome 142+)

```typescript
// Access active transition without storing reference
function checkAndCustomizeTransition(): void {
  // New property in Chrome 142+
  if (document.activeViewTransition) {
    console.log('View transition in progress');

    document.activeViewTransition.ready.then(() => {
      // Customize animation after pseudo-elements created
      const heroGroup = document.querySelector('::view-transition-group(hero)');
      // Add custom animation logic
    });

    document.activeViewTransition.finished.then(() => {
      console.log('Transition complete, cleanup if needed');
    });
  }
}

// MPA transition events
window.addEventListener('pageswap', (event: PageSwapEvent) => {
  // Outgoing page - customize exit animation
  const transition = event.viewTransition;
  if (transition && event.activation?.entry?.url) {
    const destinationUrl = new URL(event.activation.entry.url);

    // Different transitions based on destination
    if (destinationUrl.pathname.includes('/product/')) {
      document.documentElement.classList.add('transition-to-product');
    }
  }
});

window.addEventListener('pagereveal', (event: PageRevealEvent) => {
  // Incoming page - customize entry animation
  const transition = event.viewTransition;
  if (transition) {
    // Access via document.activeViewTransition also works here
    console.log('Same transition:', transition === document.activeViewTransition);

    // Scroll to specific element after transition
    transition.finished.then(() => {
      document.querySelector('#target-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
});
```

### 1.4 View Transition Types (Chrome 125+)

```typescript
// Typed transitions for different navigation patterns
async function navigateWithType(
  updateFn: () => Promise<void>,
  transitionType: 'slide-left' | 'slide-right' | 'fade' | 'zoom'
): Promise<void> {
  const transition = document.startViewTransition({
    update: updateFn,
    types: [transitionType]
  });

  await transition.finished;
}

// Usage
await navigateWithType(
  () => updateToNextPage(),
  'slide-left'
);
```

```css
/* Type-based transition styles */
:root:active-view-transition-type(slide-left) {
  &::view-transition-old(root) {
    animation: slide-out-left 300ms ease-out;
  }
  &::view-transition-new(root) {
    animation: slide-in-right 300ms ease-in;
  }
}

:root:active-view-transition-type(slide-right) {
  &::view-transition-old(root) {
    animation: slide-out-right 300ms ease-out;
  }
  &::view-transition-new(root) {
    animation: slide-in-left 300ms ease-in;
  }
}

:root:active-view-transition-type(fade) {
  &::view-transition-old(root),
  &::view-transition-new(root) {
    animation-duration: 200ms;
    mix-blend-mode: normal;
  }
}

:root:active-view-transition-type(zoom) {
  &::view-transition-old(root) {
    animation: zoom-out 300ms ease-out;
  }
  &::view-transition-new(root) {
    animation: zoom-in 300ms ease-in;
  }
}
```

### 1.5 view-transition-class (Chrome 125+)

```css
/* Apply same transition to multiple elements without naming each */
.card {
  view-transition-class: card-item;
}

/* All elements with this class share transition behavior */
::view-transition-group(*.card-item) {
  animation-duration: 200ms;
}

/* Combine with specific names */
.featured-card {
  view-transition-name: featured;
  view-transition-class: card-item;
}
```

---

## 2. Speculation Rules API

**Chrome Version**: 109+ (basic), 121+ (document rules), Enhanced 2025+

Enable instant page loads through intelligent prefetching and prerendering.

### 2.1 Static Speculation Rules

```html
<!-- Inline speculation rules in HTML -->
<script type="speculationrules">
{
  "prerender": [
    {
      "where": {
        "and": [
          { "href_matches": "/product/*" },
          { "not": { "href_matches": "/product/*/edit" } }
        ]
      },
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "where": {
        "or": [
          { "href_matches": "/category/*" },
          { "selector_matches": "a.likely-next" }
        ]
      },
      "eagerness": "conservative",
      "referrer_policy": "no-referrer-when-downgrade"
    }
  ]
}
</script>
```

### 2.2 Dynamic Speculation Rules

```typescript
interface SpeculationRule {
  prerender?: Array<{
    urls?: string[];
    where?: WhereClause;
    eagerness?: 'immediate' | 'eager' | 'moderate' | 'conservative';
    expects_no_vary_search?: string;
  }>;
  prefetch?: Array<{
    urls?: string[];
    where?: WhereClause;
    eagerness?: 'immediate' | 'eager' | 'moderate' | 'conservative';
    referrer_policy?: ReferrerPolicy;
    requires?: string[];
  }>;
}

interface WhereClause {
  href_matches?: string;
  selector_matches?: string;
  and?: WhereClause[];
  or?: WhereClause[];
  not?: WhereClause;
}

// Dynamically add speculation rules based on user behavior
class SpeculationManager {
  private rulesElement: HTMLScriptElement | null = null;

  updateRules(rules: SpeculationRule): void {
    // Remove existing rules
    this.rulesElement?.remove();

    // Create new rules element
    this.rulesElement = document.createElement('script');
    this.rulesElement.type = 'speculationrules';
    this.rulesElement.textContent = JSON.stringify(rules);
    document.head.appendChild(this.rulesElement);
  }

  prerenderUrl(url: string, eagerness: 'immediate' | 'eager' = 'immediate'): void {
    this.updateRules({
      prerender: [{ urls: [url], eagerness }]
    });
  }

  prerenderOnHover(selector: string): void {
    this.updateRules({
      prerender: [{
        where: { selector_matches: selector },
        eagerness: 'moderate'  // Triggers after hover
      }]
    });
  }

  // Prefetch with No-Vary-Search optimization
  prefetchWithSearch(pattern: string, ignoredParams: string[]): void {
    this.updateRules({
      prefetch: [{
        where: { href_matches: pattern },
        eagerness: 'moderate',
        expects_no_vary_search: `params=("${ignoredParams.join('" "')}")`
      }]
    });
  }
}

// Usage
const speculation = new SpeculationManager();

// Prerender likely next pages based on user journey
function updateSpeculationForUserContext(context: 'browsing' | 'checkout' | 'search'): void {
  switch (context) {
    case 'browsing':
      speculation.updateRules({
        prerender: [
          { where: { selector_matches: 'a.product-card' }, eagerness: 'moderate' }
        ],
        prefetch: [
          { where: { href_matches: '/category/*' }, eagerness: 'conservative' }
        ]
      });
      break;

    case 'checkout':
      speculation.prerenderUrl('/checkout/confirmation', 'eager');
      break;

    case 'search':
      speculation.prefetchWithSearch('/search', ['page', 'sort']);
      break;
  }
}
```

### 2.3 Prerendering Detection

```typescript
// Check if page was prerendered
function initializePrerenderedPage(): void {
  if (document.prerendering) {
    console.log('Page is being prerendered');

    // Defer analytics and side effects
    document.addEventListener('prerenderingchange', () => {
      console.log('Page activated from prerender');
      initializeAnalytics();
      startAnimations();
      trackPageView();
    }, { once: true });
  } else {
    // Normal page load
    initializeAnalytics();
    startAnimations();
    trackPageView();
  }
}

// Activation timing
const activationStart = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
if (activationStart.activationStart > 0) {
  console.log('Page was prerendered, activation delay:', activationStart.activationStart);
}
```

### 2.4 HTTP Header Delivery

```typescript
// Server-side: Deliver speculation rules via HTTP header
// Useful for CDN-based delivery without modifying HTML

// Express.js example
app.use((req, res, next) => {
  const speculationRules = {
    prefetch: [{
      where: { href_matches: '/api/products/*' },
      eagerness: 'moderate'
    }]
  };

  res.setHeader('Speculation-Rules', JSON.stringify(speculationRules));
  next();
});
```

---

## 3. Scheduler API

**Chrome Version**: 94+ (postTask), 129+ (yield)

Priority-based task scheduling for optimal main thread utilization and improved INP.

### 3.1 scheduler.postTask()

```typescript
type TaskPriority = 'user-blocking' | 'user-visible' | 'background';

interface TaskOptions {
  priority?: TaskPriority;
  signal?: AbortSignal;
  delay?: number;
}

// Priority-based task execution
class TaskScheduler {
  // Immediate visual feedback - highest priority
  async handleUserClick(event: MouseEvent): Promise<void> {
    // Show immediate feedback
    await scheduler.postTask(() => {
      this.showLoadingState();
    }, { priority: 'user-blocking' });

    // Fetch data - still important but can wait slightly
    await scheduler.postTask(async () => {
      const data = await this.fetchData();
      this.updateUI(data);
    }, { priority: 'user-visible' });

    // Analytics and logging - can be deferred
    scheduler.postTask(() => {
      this.trackInteraction(event);
    }, { priority: 'background' });
  }

  // Cancelable tasks
  private abortController = new AbortController();

  startBackgroundProcessing(): void {
    scheduler.postTask(() => {
      this.processInBackground();
    }, {
      priority: 'background',
      signal: this.abortController.signal
    }).catch(e => {
      if (e.name === 'AbortError') {
        console.log('Background task cancelled');
      }
    });
  }

  cancelBackgroundProcessing(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  // Delayed tasks
  scheduleReminder(callback: () => void, delayMs: number): void {
    scheduler.postTask(callback, {
      priority: 'background',
      delay: delayMs
    });
  }
}
```

### 3.2 scheduler.yield()

```typescript
// Break up long tasks to prevent blocking
async function processLargeDataset<T>(
  items: T[],
  processor: (item: T) => void,
  batchSize: number = 50
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    processor(items[i]);

    // Yield every batch to keep UI responsive
    if ((i + 1) % batchSize === 0) {
      await scheduler.yield();
    }
  }
}

// Priority inheritance with yield
async function backgroundTask(): Promise<void> {
  await scheduler.postTask(async () => {
    // This runs at 'background' priority
    doFirstPart();

    // Yield inherits 'background' priority
    await scheduler.yield();

    // Still at 'background' priority
    doSecondPart();
  }, { priority: 'background' });
}

// Explicit priority for continuation
async function mixedPriorityTask(): Promise<void> {
  doLowPriorityWork();

  // Upgrade priority for important continuation
  await scheduler.yield({ priority: 'user-blocking' });

  doHighPriorityWork();
}

// Real-world example: Virtual list rendering
async function renderVirtualList(
  container: HTMLElement,
  items: DataItem[],
  renderItem: (item: DataItem) => HTMLElement
): Promise<void> {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < items.length; i++) {
    const element = renderItem(items[i]);
    fragment.appendChild(element);

    // Yield every 20 items to maintain responsiveness
    if ((i + 1) % 20 === 0) {
      await scheduler.yield();
    }
  }

  // Final append in single operation
  container.appendChild(fragment);
}
```

### 3.3 isInputPending() (Experimental)

```typescript
// Check if user input is waiting
function processWithInputChecks<T>(items: T[], process: (item: T) => void): void {
  let i = 0;

  function processBatch(): void {
    while (i < items.length) {
      process(items[i++]);

      // Check for pending input every 5ms of work
      if (navigator.scheduling?.isInputPending?.()) {
        // Yield to handle user input
        setTimeout(processBatch, 0);
        return;
      }
    }
  }

  processBatch();
}

// Combined approach for optimal responsiveness
async function optimalProcessing<T>(
  items: T[],
  process: (item: T) => void
): Promise<void> {
  const BATCH_TIME = 4; // Target 4ms batches for 60fps
  let batchStart = performance.now();

  for (let i = 0; i < items.length; i++) {
    process(items[i]);

    const elapsed = performance.now() - batchStart;

    if (elapsed >= BATCH_TIME || navigator.scheduling?.isInputPending?.()) {
      await scheduler.yield();
      batchStart = performance.now();
    }
  }
}
```

---

## 4. Navigation API

**Chrome Version**: 102+

Modern navigation handling for SPAs with full history management.

### 4.1 Basic Navigation

```typescript
// Type definitions
interface NavigationResult {
  committed: Promise<NavigationHistoryEntry>;
  finished: Promise<NavigationHistoryEntry>;
}

// Navigate programmatically
async function navigateTo(url: string, state?: unknown): Promise<void> {
  const { committed, finished } = navigation.navigate(url, {
    state,
    info: { trigger: 'user-action' },
    history: 'push'  // 'push' | 'replace' | 'auto'
  });

  await committed;
  console.log('Navigation committed, URL changed');

  await finished;
  console.log('Navigation complete, content loaded');
}

// Navigate with replace
async function replaceState(newState: unknown): Promise<void> {
  const { finished } = navigation.navigate(location.href, {
    state: newState,
    history: 'replace'
  });
  await finished;
}
```

### 4.2 Navigation Interception

```typescript
// Intercept all navigations for SPA routing
navigation.addEventListener('navigate', (event: NavigateEvent) => {
  // Skip cross-origin and non-interceptable navigations
  if (!event.canIntercept || event.hashChange) {
    return;
  }

  const url = new URL(event.destination.url);

  // Only handle internal routes
  if (url.origin !== location.origin) {
    return;
  }

  event.intercept({
    // Control scroll behavior
    scroll: 'after-transition',  // 'after-transition' | 'manual'

    // Focus behavior
    focusReset: 'after-transition',  // 'after-transition' | 'manual'

    // Async handler
    handler: async () => {
      // Show loading state
      document.body.classList.add('navigating');

      try {
        const content = await fetchPageContent(url.pathname);
        await updatePageContent(content);
      } finally {
        document.body.classList.remove('navigating');
      }
    }
  });
});

// Handle different route types
navigation.addEventListener('navigate', (event: NavigateEvent) => {
  if (!event.canIntercept) return;

  const url = new URL(event.destination.url);
  const route = matchRoute(url.pathname);

  if (!route) {
    // Let browser handle unknown routes
    return;
  }

  event.intercept({
    handler: async () => {
      // Route-specific handling
      switch (route.type) {
        case 'product':
          await loadProductPage(route.params.id);
          break;
        case 'category':
          await loadCategoryPage(route.params.slug);
          break;
        case 'search':
          await loadSearchResults(url.searchParams);
          break;
      }
    }
  });
});
```

### 4.3 History Traversal

```typescript
// Navigate through history
async function goBack(): Promise<void> {
  if (navigation.canGoBack) {
    const { finished } = navigation.back();
    await finished;
  }
}

async function goForward(): Promise<void> {
  if (navigation.canGoForward) {
    const { finished } = navigation.forward();
    await finished;
  }
}

// Navigate to specific history entry
async function goToEntry(key: string): Promise<void> {
  const entry = navigation.entries().find(e => e.key === key);
  if (entry) {
    const { finished } = navigation.traverseTo(key);
    await finished;
  }
}

// Access history entries
function getHistoryInfo(): void {
  const entries = navigation.entries();
  const currentIndex = navigation.currentEntry?.index ?? -1;

  console.log('History entries:', entries.length);
  console.log('Current index:', currentIndex);
  console.log('Can go back:', navigation.canGoBack);
  console.log('Can go forward:', navigation.canGoForward);

  // Access state from entries
  entries.forEach((entry, i) => {
    console.log(`Entry ${i}:`, {
      url: entry.url,
      key: entry.key,
      id: entry.id,
      state: entry.getState()
    });
  });
}
```

### 4.4 Navigation State Management

```typescript
interface AppState {
  scrollPosition: number;
  filters: Record<string, string>;
  expandedSections: string[];
}

// Store state with navigation
async function navigateWithState(url: string, state: AppState): Promise<void> {
  await navigation.navigate(url, { state }).finished;
}

// Restore state on navigation
navigation.addEventListener('navigate', (event: NavigateEvent) => {
  if (!event.canIntercept) return;

  event.intercept({
    handler: async () => {
      const state = event.destination.getState() as AppState | undefined;

      await loadPage(event.destination.url);

      if (state) {
        restoreScrollPosition(state.scrollPosition);
        applyFilters(state.filters);
        expandSections(state.expandedSections);
      }
    }
  });
});

// Update current entry's state
function updateCurrentState(partialState: Partial<AppState>): void {
  const currentState = navigation.currentEntry?.getState() as AppState || {};
  navigation.updateCurrentEntry({
    state: { ...currentState, ...partialState }
  });
}
```

---

## 5. Web Locks API

**Chrome Version**: 69+

Cross-tab coordination for shared resources.

### 5.1 Basic Lock Usage

```typescript
// Exclusive lock - only one holder at a time
async function writeToSharedResource(data: unknown): Promise<void> {
  await navigator.locks.request('shared-resource', async (lock) => {
    // Only one tab can execute this at a time
    console.log('Acquired lock:', lock?.name);
    await performWrite(data);
  });
  // Lock automatically released when callback completes
}

// Shared lock - multiple readers allowed
async function readFromSharedResource(): Promise<unknown> {
  return navigator.locks.request(
    'shared-resource',
    { mode: 'shared' },
    async () => {
      return await performRead();
    }
  );
}
```

### 5.2 Advanced Lock Patterns

```typescript
// Try to acquire lock without waiting
async function tryWriteNonBlocking(data: unknown): Promise<boolean> {
  let acquired = false;

  await navigator.locks.request(
    'resource',
    { ifAvailable: true },
    async (lock) => {
      if (lock) {
        acquired = true;
        await performWrite(data);
      }
    }
  );

  return acquired;
}

// Lock with timeout
async function writeWithTimeout(data: unknown, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await navigator.locks.request(
      'resource',
      { signal: controller.signal },
      async () => {
        await performWrite(data);
      }
    );
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Lock acquisition timed out');
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Steal lock (emergency takeover)
async function forceWrite(data: unknown): Promise<void> {
  await navigator.locks.request(
    'resource',
    { steal: true },
    async () => {
      await performWrite(data);
    }
  );
}
```

### 5.3 Cross-Tab Leader Election

```typescript
class TabLeader {
  private isLeader = false;
  private leaderLock: Lock | null = null;

  async tryBecomeLeader(): Promise<boolean> {
    return new Promise((resolve) => {
      navigator.locks.request(
        'tab-leader',
        { ifAvailable: true },
        async (lock) => {
          if (lock) {
            this.isLeader = true;
            this.leaderLock = lock;
            this.onBecomeLeader();

            // Hold lock indefinitely by returning a never-resolving promise
            await new Promise(() => {});
          } else {
            this.isLeader = false;
            resolve(false);
          }
        }
      ).catch(() => {
        this.isLeader = false;
      });

      // Return immediately if we got the lock
      setTimeout(() => resolve(this.isLeader), 10);
    });
  }

  async waitToBecomeLeader(): Promise<void> {
    await navigator.locks.request('tab-leader', async (lock) => {
      this.isLeader = true;
      this.leaderLock = lock;
      this.onBecomeLeader();
      await new Promise(() => {});  // Hold forever
    });
  }

  private onBecomeLeader(): void {
    console.log('This tab is now the leader');
    // Start leader-only tasks: WebSocket connection, sync, etc.
  }
}

// Query current lock state
async function getLockState(): Promise<LockManagerSnapshot> {
  return await navigator.locks.query();
  // Returns: { held: Lock[], pending: Lock[] }
}
```

### 5.4 IndexedDB Transaction Coordination

```typescript
// Coordinate IndexedDB access across tabs
class DBCoordinator {
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    return navigator.locks.request(
      `idb-${this.dbName}-write`,
      { mode: 'exclusive' },
      operation
    );
  }

  async withReadLock<T>(operation: () => Promise<T>): Promise<T> {
    return navigator.locks.request(
      `idb-${this.dbName}-write`,
      { mode: 'shared' },
      operation
    );
  }

  // Batch operations with single lock acquisition
  async batchWrite(operations: Array<() => Promise<void>>): Promise<void> {
    await this.withWriteLock(async () => {
      for (const op of operations) {
        await op();
      }
    });
  }
}
```

---

## 6. File System Access API

**Chrome Version**: 86+ (showOpenFilePicker), OPFS in all major browsers

### 6.1 User-Picked Files (showOpenFilePicker)

```typescript
// Open file picker
async function openFile(): Promise<{ handle: FileSystemFileHandle; content: string }> {
  const [handle] = await window.showOpenFilePicker({
    types: [{
      description: 'Data Files',
      accept: {
        'application/json': ['.json'],
        'text/csv': ['.csv'],
        'text/plain': ['.txt']
      }
    }],
    multiple: false
  });

  const file = await handle.getFile();
  const content = await file.text();

  return { handle, content };
}

// Save file picker
async function saveFile(content: string, suggestedName: string): Promise<FileSystemFileHandle> {
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [{
      description: 'JSON Files',
      accept: { 'application/json': ['.json'] }
    }]
  });

  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();

  return handle;
}

// Directory picker
async function openDirectory(): Promise<FileSystemDirectoryHandle> {
  return await window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents'
  });
}
```

### 6.2 Persistent File Access

```typescript
// Store handle in IndexedDB for later use
async function persistHandle(handle: FileSystemHandle): Promise<void> {
  const db = await openDB('file-handles', 1, {
    upgrade(db) {
      db.createObjectStore('handles');
    }
  });

  await db.put('handles', handle, 'recent-file');
}

// Retrieve and verify permission
async function getPersistedHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDB('file-handles', 1);
  const handle = await db.get('handles', 'recent-file') as FileSystemFileHandle;

  if (!handle) return null;

  // Verify permission
  const permission = await handle.queryPermission({ mode: 'readwrite' });

  if (permission === 'granted') {
    return handle;
  }

  // Request permission (requires user gesture)
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted' ? handle : null;
}
```

### 6.3 Origin Private File System (OPFS)

```typescript
// Get OPFS root
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

// OPFS file operations
class OPFSStorage {
  private root: FileSystemDirectoryHandle | null = null;

  async init(): Promise<void> {
    this.root = await navigator.storage.getDirectory();
  }

  async writeFile(path: string, content: string | ArrayBuffer): Promise<void> {
    const handle = await this.getFileHandle(path, { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async readFile(path: string): Promise<string> {
    const handle = await this.getFileHandle(path);
    const file = await handle.getFile();
    return await file.text();
  }

  async deleteFile(path: string): Promise<void> {
    const parts = path.split('/');
    const fileName = parts.pop()!;
    const dirHandle = await this.getDirectoryHandle(parts.join('/'));
    await dirHandle.removeEntry(fileName);
  }

  private async getFileHandle(
    path: string,
    options?: { create?: boolean }
  ): Promise<FileSystemFileHandle> {
    const parts = path.split('/');
    const fileName = parts.pop()!;
    const dirHandle = await this.getDirectoryHandle(parts.join('/'), options);
    return await dirHandle.getFileHandle(fileName, options);
  }

  private async getDirectoryHandle(
    path: string,
    options?: { create?: boolean }
  ): Promise<FileSystemDirectoryHandle> {
    let current = this.root!;

    if (path) {
      for (const part of path.split('/')) {
        current = await current.getDirectoryHandle(part, options);
      }
    }

    return current;
  }
}

// High-performance OPFS with SyncAccessHandle (Worker only)
// This runs in a Web Worker
async function workerWriteOptimized(fileName: string, data: ArrayBuffer): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(fileName, { create: true });

  // SyncAccessHandle for synchronous, high-performance access
  const accessHandle = await fileHandle.createSyncAccessHandle();

  try {
    accessHandle.truncate(0);
    accessHandle.write(data, { at: 0 });
    accessHandle.flush();
  } finally {
    accessHandle.close();
  }
}
```

---

## 7. WebGPU

**Chrome Version**: 113+, All major browsers as of November 2025

### 7.1 Initialization on Apple Silicon

```typescript
interface GPUInitResult {
  device: GPUDevice;
  adapter: GPUAdapter;
  isAppleSilicon: boolean;
}

async function initWebGPU(): Promise<GPUInitResult> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  // Request high-performance adapter (full GPU on Apple Silicon)
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance'
  });

  if (!adapter) {
    throw new Error('No GPU adapter available');
  }

  // Check for Apple Silicon
  const isAppleSilicon = adapter.info?.vendor?.toLowerCase().includes('apple') ?? false;

  // Request device with Apple-optimized features
  const device = await adapter.requestDevice({
    requiredFeatures: [
      'texture-compression-astc',  // Native on Apple GPUs
    ],
    requiredLimits: {
      // Apple Silicon has generous limits due to UMA
      maxBufferSize: 1024 * 1024 * 1024,  // 1GB
      maxStorageBufferBindingSize: 512 * 1024 * 1024,
      maxComputeWorkgroupsPerDimension: 65535
    }
  });

  return { device, adapter, isAppleSilicon };
}
```

### 7.2 Compute Shader Example

```typescript
// WGSL compute shader for parallel data processing
const computeShaderCode = `
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

// Apple GPUs have SIMD width of 32
// Optimal workgroup size is 256 (8 SIMDs)
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx < arrayLength(&input)) {
    output[idx] = input[idx] * input[idx];  // Square each element
  }
}
`;

async function runComputeShader(
  device: GPUDevice,
  data: Float32Array
): Promise<Float32Array> {
  // Create buffers
  const inputBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true  // Zero-copy on Apple Silicon UMA
  });
  new Float32Array(inputBuffer.getMappedRange()).set(data);
  inputBuffer.unmap();

  const outputBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  const stagingBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });

  // Create shader module and pipeline
  const shaderModule = device.createShaderModule({
    code: computeShaderCode
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main'
    }
  });

  // Create bind group
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } }
    ]
  });

  // Encode and submit commands
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(Math.ceil(data.length / 256));
  passEncoder.end();

  commandEncoder.copyBufferToBuffer(
    outputBuffer, 0,
    stagingBuffer, 0,
    data.byteLength
  );

  device.queue.submit([commandEncoder.finish()]);

  // Read results
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(stagingBuffer.getMappedRange().slice(0));
  stagingBuffer.unmap();

  return result;
}
```

### 7.3 Rendering Setup

```typescript
async function setupRenderPipeline(
  device: GPUDevice,
  canvas: HTMLCanvasElement
): Promise<{ pipeline: GPURenderPipeline; context: GPUCanvasContext }> {
  const context = canvas.getContext('webgpu')!;

  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format,
    alphaMode: 'premultiplied'
  });

  const vertexShader = `
    @vertex
    fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
      var pos = array<vec2<f32>, 3>(
        vec2(0.0, 0.5),
        vec2(-0.5, -0.5),
        vec2(0.5, -0.5)
      );
      return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    @fragment
    fn main() -> @location(0) vec4<f32> {
      return vec4<f32>(1.0, 0.5, 0.2, 1.0);
    }
  `;

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({ code: vertexShader }),
      entryPoint: 'main'
    },
    fragment: {
      module: device.createShaderModule({ code: fragmentShader }),
      entryPoint: 'main',
      targets: [{ format }]
    },
    primitive: {
      topology: 'triangle-list'
    }
  });

  return { pipeline, context };
}

function renderFrame(
  device: GPUDevice,
  context: GPUCanvasContext,
  pipeline: GPURenderPipeline
): void {
  const commandEncoder = device.createCommandEncoder();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    }]
  });

  renderPass.setPipeline(pipeline);
  renderPass.draw(3);
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
}
```

---

## 8. Web Speech API

**Chrome Version**: 25+ (basic), 142+ (contextual biasing)

### 8.1 Speech Recognition with Contextual Biasing

```typescript
interface SpeechRecognitionPhrase {
  phrase: string;
  boost: number;  // 0.0 to 10.0
}

class VoiceSearch {
  private recognition: SpeechRecognition;
  private phrases: SpeechRecognitionPhrase[] = [];

  constructor() {
    this.recognition = new webkitSpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    // Enable on-device processing for contextual biasing (Chrome 142+)
    if ('processLocally' in this.recognition) {
      (this.recognition as any).processLocally = true;
    }
  }

  // Set domain-specific vocabulary (Chrome 142+)
  setContextualPhrases(phrases: SpeechRecognitionPhrase[]): void {
    this.phrases = phrases;

    // Apply phrases to recognition
    if ('phrases' in this.recognition) {
      (this.recognition as any).phrases = phrases.map(p => ({
        phrase: p.phrase,
        boost: p.boost
      }));
    }
  }

  // Add product names, technical terms, etc.
  addProductVocabulary(productNames: string[]): void {
    const phrases = productNames.map(name => ({
      phrase: name,
      boost: 5.0  // Strong bias
    }));
    this.setContextualPhrases([...this.phrases, ...phrases]);
  }

  async listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      let finalTranscript = '';

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
      };

      this.recognition.onend = () => {
        resolve(finalTranscript.trim());
      };

      this.recognition.onerror = (event) => {
        reject(new Error(event.error));
      };

      this.recognition.start();
    });
  }

  stop(): void {
    this.recognition.stop();
  }
}

// Usage for e-commerce voice search
const voiceSearch = new VoiceSearch();

// Add domain vocabulary
voiceSearch.setContextualPhrases([
  // Product categories
  { phrase: 'ultrawide monitor', boost: 7.0 },
  { phrase: 'mechanical keyboard', boost: 7.0 },
  { phrase: 'USB-C hub', boost: 8.0 },

  // Brand names (often misrecognized)
  { phrase: 'Logitech', boost: 6.0 },
  { phrase: 'ASUS', boost: 6.0 },
  { phrase: 'MSI', boost: 6.0 },

  // Technical terms
  { phrase: 'RGB', boost: 5.0 },
  { phrase: 'QHD', boost: 5.0 },
  { phrase: '144Hz', boost: 5.0 }
]);

async function handleVoiceSearch(): Promise<void> {
  try {
    const query = await voiceSearch.listen();
    console.log('Recognized:', query);
    performSearch(query);
  } catch (error) {
    console.error('Voice recognition error:', error);
  }
}
```

### 8.2 Speech Synthesis

```typescript
class TextToSpeech {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  async init(preferredLang: string = 'en-US'): Promise<void> {
    // Wait for voices to load
    await new Promise<void>((resolve) => {
      if (this.synth.getVoices().length) {
        resolve();
      } else {
        this.synth.onvoiceschanged = () => resolve();
      }
    });

    // Select best voice
    const voices = this.synth.getVoices();
    this.voice = voices.find(v =>
      v.lang === preferredLang && v.localService
    ) || voices.find(v =>
      v.lang.startsWith(preferredLang.split('-')[0])
    ) || voices[0];
  }

  speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      if (this.voice) {
        utterance.voice = this.voice;
      }

      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      this.synth.speak(utterance);
    });
  }

  stop(): void {
    this.synth.cancel();
  }

  pause(): void {
    this.synth.pause();
  }

  resume(): void {
    this.synth.resume();
  }
}
```

---

## 9. FedCM API

**Chrome Version**: 108+ (basic), Enhanced 2025

### 9.1 Relying Party Implementation

```typescript
interface FedCMCredential extends Credential {
  token: string;
  isReturningUser: boolean;
}

interface IdentityProviderConfig {
  configURL: string;
  clientId: string;
  nonce?: string;
}

// Sign in with FedCM
async function signInWithFedCM(
  provider: IdentityProviderConfig
): Promise<FedCMCredential | null> {
  try {
    const credential = await navigator.credentials.get({
      identity: {
        providers: [{
          configURL: provider.configURL,
          clientId: provider.clientId,
          // Chrome 143+: nonce moved to params object
          params: {
            nonce: provider.nonce || crypto.randomUUID()
          }
        }]
      },
      mediation: 'optional'
    }) as FedCMCredential | null;

    return credential;
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          console.log('User cancelled the sign-in');
          break;
        case 'NetworkError':
          console.log('IdP not reachable');
          break;
        default:
          console.error('FedCM error:', error);
      }
    }
    return null;
  }
}

// Handle the credential token
async function handleFedCMSignIn(): Promise<void> {
  const credential = await signInWithFedCM({
    configURL: 'https://idp.example.com/.well-known/fedcm.json',
    clientId: 'your-client-id'
  });

  if (credential) {
    // Send token to your server for validation
    const response = await fetch('/api/auth/fedcm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: credential.token,
        isReturningUser: credential.isReturningUser
      })
    });

    if (response.ok) {
      const session = await response.json();
      handleSuccessfulAuth(session);
    }
  }
}
```

### 9.2 Multiple Identity Providers

```typescript
// Sign in with choice of providers
async function signInWithProviderChoice(): Promise<FedCMCredential | null> {
  return await navigator.credentials.get({
    identity: {
      providers: [
        {
          configURL: 'https://accounts.google.com/.well-known/fedcm.json',
          clientId: 'google-client-id',
          params: { nonce: crypto.randomUUID() }
        },
        {
          configURL: 'https://login.microsoft.com/.well-known/fedcm.json',
          clientId: 'microsoft-client-id',
          params: { nonce: crypto.randomUUID() }
        }
      ]
    },
    mediation: 'required'  // Always show account chooser
  }) as FedCMCredential | null;
}
```

### 9.3 Identity Provider Well-Known Config

```json
// /.well-known/fedcm.json
{
  "provider_urls": ["https://idp.example.com/fedcm/config.json"]
}

// /fedcm/config.json
{
  "accounts_endpoint": "/fedcm/accounts",
  "client_metadata_endpoint": "/fedcm/client_metadata",
  "id_assertion_endpoint": "/fedcm/assertion",
  "revocation_endpoint": "/fedcm/revoke",
  "login_url": "/login",
  "branding": {
    "background_color": "#1a73e8",
    "color": "#ffffff",
    "icons": [
      {
        "url": "https://idp.example.com/icon.png",
        "size": 32
      }
    ]
  }
}
```

---

## 10. CSS Features

### 10.1 @starting-style (Chrome 117+)

```css
/* Entry animations for elements entering the DOM */
.modal {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.3s, transform 0.3s;
}

/* Define starting state for animations */
@starting-style {
  .modal {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* Works great with popovers */
[popover] {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.2s,
    transform 0.2s,
    display 0.2s allow-discrete,
    overlay 0.2s allow-discrete;
}

[popover]:popover-open {
  @starting-style {
    opacity: 0;
    transform: translateY(-10px);
  }
}

/* Exit animation */
[popover]:not(:popover-open) {
  opacity: 0;
  transform: translateY(10px);
}

/* Dialog entry/exit */
dialog[open] {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: all 0.3s ease-out;
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
}

dialog {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  transition: all 0.2s ease-in;
}
```

### 10.2 CSS Anchor Positioning (Chrome 125+, Baseline 2026)

```css
/* Define an anchor */
.trigger-button {
  anchor-name: --my-trigger;
}

/* Position tooltip relative to anchor */
.tooltip {
  position: fixed;
  position-anchor: --my-trigger;

  /* Position below the anchor, centered */
  top: anchor(bottom);
  left: anchor(center);
  transform: translateX(-50%);

  /* Add some spacing */
  margin-top: 8px;
}

/* Fallback positioning when near viewport edges */
.tooltip {
  position-try-fallbacks:
    /* Try above */
    --above,
    /* Try to the right */
    --right,
    /* Try to the left */
    --left;
}

@position-try --above {
  bottom: anchor(top);
  top: auto;
  margin-bottom: 8px;
  margin-top: 0;
}

@position-try --right {
  left: anchor(right);
  top: anchor(center);
  transform: translateY(-50%);
  margin-left: 8px;
}

@position-try --left {
  right: anchor(left);
  left: auto;
  top: anchor(center);
  transform: translateY(-50%);
  margin-right: 8px;
}

/* Auto-flip with built-in keywords */
.dropdown {
  position: fixed;
  position-anchor: --dropdown-trigger;
  top: anchor(bottom);
  left: anchor(left);

  /* Automatically flip if not enough space */
  position-try-fallbacks: flip-block, flip-inline;
}

/* Size relative to anchor */
.popover-menu {
  position: fixed;
  position-anchor: --menu-trigger;

  /* Match anchor width */
  width: anchor-size(width);
  min-width: 200px;
}
```

### 10.3 :has() Selector (Chrome 105+, Baseline)

```css
/* Style parent based on child state */
.form-field:has(input:invalid) {
  border-color: red;
}

.form-field:has(input:valid) {
  border-color: green;
}

/* Card with image vs without */
.card:has(img) {
  grid-template-rows: 200px 1fr;
}

.card:not(:has(img)) {
  grid-template-rows: 1fr;
}

/* Navigation with active item */
.nav:has(.nav-item.active) {
  --active-indicator-visible: 1;
}

/* Container with specific content */
.sidebar:has(.notification-badge) {
  --sidebar-attention: true;
}

/* Previous sibling styling */
.label:has(+ input:focus) {
  color: var(--primary);
  font-weight: 600;
}

/* Complex conditions */
.page:has(dialog[open]):has(.modal-backdrop) {
  overflow: hidden;
}

/* Performance-optimized selectors */
.list-item:has(> .checkbox:checked) {
  background: var(--selected-bg);
}
```

### 10.4 Container Queries (Chrome 105+)

```css
/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Size-based queries */
@container card (width > 400px) {
  .card {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 1rem;
  }
}

@container card (width <= 400px) {
  .card {
    display: flex;
    flex-direction: column;
  }

  .card-image {
    aspect-ratio: 16/9;
  }
}

/* Style queries (Chrome 111+) */
.theme-container {
  container-name: theme;
}

@container theme style(--theme: dark) {
  .content {
    background: #1a1a1a;
    color: #e0e0e0;
  }
}

@container theme style(--density: compact) {
  .item {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
}

/* Scroll-state queries (Chrome 2025) */
.scroll-container {
  container-type: scroll-state;
  container-name: scroller;
}

@container scroller scroll-state(stuck: top) {
  .sticky-header {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
}

@container scroller scroll-state(snapped: x) {
  .carousel-item {
    opacity: 1;
  }
}
```

### 10.5 Scroll-Driven Animations (Chrome 115+)

```css
/* Scroll progress indicator */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--primary);
  transform-origin: left;

  animation: scale-x linear;
  animation-timeline: scroll(root);
}

@keyframes scale-x {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Reveal on scroll into view */
.reveal-on-scroll {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Parallax effect */
.parallax-bg {
  animation: parallax linear;
  animation-timeline: scroll(root);
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-30%); }
}

/* Named scroll timeline */
.horizontal-scroller {
  overflow-x: auto;
  scroll-timeline: --horizontal inline;
}

.scroll-indicator {
  animation: slide-indicator linear;
  animation-timeline: --horizontal;
}

/* View timeline with ranges */
.card {
  animation: card-enter linear both;
  animation-timeline: view(block);
  animation-range: entry 10% cover 30%;
}

@keyframes card-enter {
  from {
    opacity: 0;
    scale: 0.8;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

/* Sticky element animation */
.sticky-nav {
  position: sticky;
  top: 0;

  animation: shrink-nav linear both;
  animation-timeline: scroll(root);
  animation-range: 0 200px;
}

@keyframes shrink-nav {
  from {
    padding-block: 2rem;
    background: transparent;
  }
  to {
    padding-block: 0.5rem;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
}
```

### 10.6 Native CSS Nesting (Chrome 120+)

```css
/* Native nesting syntax */
.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;

  /* Nested selectors */
  & .title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  & .content {
    color: var(--text-secondary);

    & p {
      margin-bottom: 1rem;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  /* Pseudo-classes */
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  &:focus-within {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Media queries */
  @media (width > 768px) {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1.5rem;
  }

  /* Container queries */
  @container (width > 400px) {
    & .actions {
      flex-direction: row;
    }
  }
}

/* Combining with :has() */
.form-group {
  margin-bottom: 1rem;

  &:has(input:invalid) {
    & .label {
      color: var(--error);
    }

    & .error-message {
      display: block;
    }
  }
}
```

---

## 11. Performance APIs

### 11.1 Long Animation Frames API (Chrome 123+)

```typescript
interface LoAFEntry extends PerformanceEntry {
  duration: number;
  blockingDuration: number;
  renderStart: number;
  styleAndLayoutStart: number;
  firstUIEventTimestamp: number;
  scripts: PerformanceScriptTiming[];
}

interface PerformanceScriptTiming {
  sourceURL: string;
  sourceFunctionName: string;
  sourceCharPosition: number;
  invokerType: string;
  invoker: string;
  executionStart: number;
  duration: number;
  forcedStyleAndLayoutDuration: number;
  pauseDuration: number;
}

// Monitor long animation frames
function observeLoAF(): void {
  if (!PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
    console.log('LoAF not supported');
    return;
  }

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as LoAFEntry[]) {
      if (entry.duration > 50) {
        console.warn('Long Animation Frame:', {
          duration: `${entry.duration.toFixed(1)}ms`,
          blockingDuration: `${entry.blockingDuration.toFixed(1)}ms`,
          renderStart: entry.renderStart,
          scripts: entry.scripts.map(s => ({
            url: s.sourceURL,
            function: s.sourceFunctionName,
            invoker: s.invoker,
            type: s.invokerType,
            duration: `${s.duration.toFixed(1)}ms`,
            forcedLayout: `${s.forcedStyleAndLayoutDuration.toFixed(1)}ms`
          }))
        });

        // Send to analytics for INP debugging
        sendLoAFToAnalytics(entry);
      }
    }
  });

  observer.observe({ type: 'long-animation-frame', buffered: true });
}

// Correlate LoAF with INP
function correlateLoAFWithINP(
  inpEntry: PerformanceEventTiming,
  loafEntries: LoAFEntry[]
): LoAFEntry | undefined {
  const inpStart = inpEntry.startTime;
  const inpEnd = inpEntry.startTime + inpEntry.duration;

  return loafEntries.find(loaf => {
    const loafStart = loaf.startTime;
    const loafEnd = loaf.startTime + loaf.duration;

    // Check for overlap
    return loafStart < inpEnd && loafEnd > inpStart;
  });
}
```

### 11.2 Element Timing API

```typescript
// Mark elements for timing observation
// HTML: <img elementtiming="hero-image" src="...">
// HTML: <p elementtiming="main-content">...</p>

interface ElementTimingEntry extends PerformanceEntry {
  renderTime: number;
  loadTime: number;
  element: Element | null;
  identifier: string;
  naturalWidth: number;
  naturalHeight: number;
  id: string;
  url: string;
  intersectionRect: DOMRectReadOnly;
}

function observeElementTiming(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as ElementTimingEntry[]) {
      console.log('Element rendered:', {
        identifier: entry.identifier,
        renderTime: entry.renderTime,
        loadTime: entry.loadTime,
        element: entry.element?.tagName,
        size: `${entry.naturalWidth}x${entry.naturalHeight}`,
        url: entry.url
      });

      // Track hero image timing
      if (entry.identifier === 'hero-image') {
        trackMetric('hero-render-time', entry.renderTime);
      }
    }
  });

  observer.observe({ type: 'element', buffered: true });
}
```

### 11.3 Paint Timing & LCP

```typescript
// Observe all paint timings
function observePaintTiming(): void {
  // First Paint & First Contentful Paint
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`${entry.name}: ${entry.startTime.toFixed(1)}ms`);
    }
  });
  paintObserver.observe({ type: 'paint', buffered: true });

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;

    console.log('LCP:', {
      time: `${lastEntry.renderTime.toFixed(1)}ms`,
      element: lastEntry.element?.tagName,
      size: lastEntry.size,
      url: lastEntry.url,
      id: lastEntry.id
    });
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
}

// LCP breakdown analysis
interface LCPBreakdown {
  ttfb: number;
  resourceLoadDelay: number;
  resourceLoadDuration: number;
  elementRenderDelay: number;
  total: number;
}

function analyzeLCPBreakdown(): LCPBreakdown | null {
  const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as LargestContentfulPaint[];

  if (!lcpEntries.length) return null;

  const lcp = lcpEntries[lcpEntries.length - 1];
  const lcpTime = lcp.renderTime || lcp.loadTime;

  // Find the resource that was the LCP element
  let resourceEntry: PerformanceResourceTiming | null = null;
  if (lcp.url) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    resourceEntry = resources.find(r => r.name === lcp.url) || null;
  }

  const ttfb = nav.responseStart - nav.requestStart;

  let resourceLoadDelay = 0;
  let resourceLoadDuration = 0;

  if (resourceEntry) {
    resourceLoadDelay = resourceEntry.requestStart - nav.responseEnd;
    resourceLoadDuration = resourceEntry.responseEnd - resourceEntry.requestStart;
  }

  const elementRenderDelay = lcpTime - (resourceEntry?.responseEnd || nav.responseEnd);

  return {
    ttfb,
    resourceLoadDelay,
    resourceLoadDuration,
    elementRenderDelay,
    total: lcpTime
  };
}
```

### 11.4 INP Measurement

```typescript
interface INPAttribution {
  interactionTarget: string;
  interactionType: string;
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  longAnimationFrames: LoAFEntry[];
}

class INPTracker {
  private interactions: PerformanceEventTiming[] = [];
  private loafEntries: LoAFEntry[] = [];

  start(): void {
    // Observe event timing for INP
    const eventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        if (entry.interactionId) {
          this.interactions.push(entry);
        }
      }
    });
    eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });

    // Observe LoAF for attribution
    const loafObserver = new PerformanceObserver((list) => {
      this.loafEntries.push(...list.getEntries() as LoAFEntry[]);
      // Keep only recent entries
      const cutoff = performance.now() - 10000;
      this.loafEntries = this.loafEntries.filter(e => e.startTime > cutoff);
    });
    loafObserver.observe({ type: 'long-animation-frame', buffered: true });
  }

  getINP(): { value: number; attribution: INPAttribution } | null {
    if (!this.interactions.length) return null;

    // Group by interactionId and get max duration
    const interactionMap = new Map<number, PerformanceEventTiming>();

    for (const entry of this.interactions) {
      const existing = interactionMap.get(entry.interactionId!);
      if (!existing || entry.duration > existing.duration) {
        interactionMap.set(entry.interactionId!, entry);
      }
    }

    // Sort and get P98
    const sorted = [...interactionMap.values()].sort((a, b) => b.duration - a.duration);
    const p98Index = Math.floor(sorted.length * 0.02);
    const inpEntry = sorted[p98Index] || sorted[0];

    // Find related LoAF entries
    const relatedLoAFs = this.loafEntries.filter(loaf => {
      const loafEnd = loaf.startTime + loaf.duration;
      const eventEnd = inpEntry.startTime + inpEntry.duration;
      return loaf.startTime < eventEnd && loafEnd > inpEntry.startTime;
    });

    return {
      value: inpEntry.duration,
      attribution: {
        interactionTarget: inpEntry.target?.tagName || 'unknown',
        interactionType: inpEntry.name,
        inputDelay: inpEntry.processingStart - inpEntry.startTime,
        processingDuration: inpEntry.processingEnd - inpEntry.processingStart,
        presentationDelay: inpEntry.startTime + inpEntry.duration - inpEntry.processingEnd,
        longAnimationFrames: relatedLoAFs
      }
    };
  }
}
```

---

## 12. Background APIs

### 12.1 Background Sync (Chrome 49+)

```typescript
// Register sync in main thread
async function registerSync(tag: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register(tag);
}

// Usage: Queue offline data for sync
async function saveForSync(data: unknown): Promise<void> {
  // Store in IndexedDB
  const db = await openDB('sync-queue', 1, {
    upgrade(db) {
      db.createObjectStore('pending', { autoIncrement: true });
    }
  });

  await db.add('pending', {
    data,
    timestamp: Date.now()
  });

  // Register sync
  await registerSync('sync-pending-data');
}

// Service Worker: Handle sync event
// sw.ts
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData(): Promise<void> {
  const db = await openDB('sync-queue', 1);
  const pending = await db.getAll('pending');

  for (const item of pending) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(item.data),
        headers: { 'Content-Type': 'application/json' }
      });

      // Remove synced item
      await db.delete('pending', item.id);
    } catch (error) {
      // Will retry on next sync
      console.error('Sync failed, will retry:', error);
      throw error;
    }
  }
}
```

### 12.2 Periodic Background Sync (Chrome 80+)

```typescript
// Check permission and register
async function registerPeriodicSync(): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready;

  // Check permission
  const status = await navigator.permissions.query({
    name: 'periodic-background-sync' as PermissionName
  });

  if (status.state !== 'granted') {
    console.log('Periodic sync permission not granted');
    return false;
  }

  try {
    await registration.periodicSync.register('content-refresh', {
      minInterval: 24 * 60 * 60 * 1000  // 24 hours (minimum)
    });
    return true;
  } catch (error) {
    console.error('Periodic sync registration failed:', error);
    return false;
  }
}

// Get registered syncs
async function getPeriodicSyncs(): Promise<string[]> {
  const registration = await navigator.serviceWorker.ready;
  const tags = await registration.periodicSync.getTags();
  return tags;
}

// Unregister
async function unregisterPeriodicSync(tag: string): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.periodicSync.unregister(tag);
}

// Service Worker: Handle periodic sync
// sw.ts
self.addEventListener('periodicsync', (event: PeriodicSyncEvent) => {
  if (event.tag === 'content-refresh') {
    event.waitUntil(refreshContent());
  }
});

async function refreshContent(): Promise<void> {
  // Fetch fresh content
  const response = await fetch('/api/content/latest');
  const data = await response.json();

  // Update cache
  const cache = await caches.open('content-v1');
  await cache.put('/api/content/latest', new Response(JSON.stringify(data)));

  // Optionally notify user
  if (data.hasImportantUpdates) {
    self.registration.showNotification('New content available!', {
      body: data.summary,
      icon: '/icons/icon-192.png'
    });
  }
}
```

### 12.3 Background Fetch (Chrome 74+)

```typescript
// Start background fetch for large downloads
async function startBackgroundDownload(
  files: Array<{ url: string; filename: string }>
): Promise<BackgroundFetchRegistration> {
  const registration = await navigator.serviceWorker.ready;

  const requests = files.map(f => new Request(f.url));

  const bgFetch = await registration.backgroundFetch.fetch(
    'download-' + Date.now(),
    requests,
    {
      title: 'Downloading files...',
      icons: [{
        sizes: '192x192',
        src: '/icons/download-icon.png',
        type: 'image/png'
      }],
      downloadTotal: await calculateTotalSize(files)
    }
  );

  // Monitor progress
  bgFetch.addEventListener('progress', () => {
    const progress = bgFetch.downloaded / bgFetch.downloadTotal;
    updateProgressUI(progress);
  });

  return bgFetch;
}

// Get active background fetches
async function getActiveDownloads(): Promise<BackgroundFetchRegistration[]> {
  const registration = await navigator.serviceWorker.ready;
  const ids = await registration.backgroundFetch.getIds();

  const fetches = await Promise.all(
    ids.map(id => registration.backgroundFetch.get(id))
  );

  return fetches.filter(Boolean) as BackgroundFetchRegistration[];
}

// Service Worker: Handle background fetch events
// sw.ts
self.addEventListener('backgroundfetchsuccess', (event: BackgroundFetchEvent) => {
  event.waitUntil(handleFetchSuccess(event.registration));
});

self.addEventListener('backgroundfetchfail', (event: BackgroundFetchEvent) => {
  event.waitUntil(handleFetchFailure(event.registration));
});

self.addEventListener('backgroundfetchabort', (event: BackgroundFetchEvent) => {
  console.log('Background fetch aborted:', event.registration.id);
});

self.addEventListener('backgroundfetchclick', (event: BackgroundFetchEvent) => {
  event.waitUntil(
    clients.openWindow('/downloads/' + event.registration.id)
  );
});

async function handleFetchSuccess(
  registration: BackgroundFetchRegistration
): Promise<void> {
  const records = await registration.matchAll();

  const cache = await caches.open('downloads-v1');

  for (const record of records) {
    const response = await record.responseReady;
    await cache.put(record.request, response);
  }

  // Notify user
  self.registration.showNotification('Download complete!', {
    body: `${records.length} files downloaded`,
    icon: '/icons/icon-192.png',
    actions: [
      { action: 'open', title: 'Open' }
    ]
  });
}
```

---

## Quick Reference: Feature Detection

```typescript
// Comprehensive feature detection for Chrome 143+
const ChromeFeatures = {
  viewTransitions: typeof document.startViewTransition === 'function',
  viewTransitionsMPA: CSS.supports('view-transition-name', 'test'),
  activeViewTransition: 'activeViewTransition' in document,

  speculationRules: HTMLScriptElement.supports?.('speculationrules') ?? false,

  schedulerYield: 'scheduler' in globalThis && 'yield' in scheduler,
  schedulerPostTask: 'scheduler' in globalThis && 'postTask' in scheduler,

  navigationAPI: 'navigation' in globalThis,

  webLocks: 'locks' in navigator,

  fileSystemAccess: 'showOpenFilePicker' in window,
  opfs: 'storage' in navigator && 'getDirectory' in navigator.storage,

  webGPU: 'gpu' in navigator,

  speechRecognition: 'webkitSpeechRecognition' in window,
  speechContextualBiasing: 'webkitSpeechRecognition' in window &&
    'phrases' in (new (window as any).webkitSpeechRecognition()),

  fedCM: 'credentials' in navigator && 'get' in navigator.credentials,

  containerQueries: CSS.supports('container-type', 'inline-size'),
  containerStyleQueries: CSS.supports('@container style(--test: true)', '{}'),

  anchorPositioning: CSS.supports('anchor-name', '--test'),

  scrollDrivenAnimations: CSS.supports('animation-timeline', 'scroll()'),

  cssHas: CSS.supports(':has(*)'),
  cssNesting: CSS.supports('selector(&)'),
  startingStyle: CSS.supports('@starting-style', '{}'),

  loaf: PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'),
  elementTiming: PerformanceObserver.supportedEntryTypes.includes('element'),

  backgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
  periodicBackgroundSync: 'serviceWorker' in navigator &&
    'periodicSync' in ServiceWorkerRegistration.prototype,
  backgroundFetch: 'serviceWorker' in navigator &&
    'backgroundFetch' in ServiceWorkerRegistration.prototype
};

// Log support matrix
console.table(ChromeFeatures);
```

---

## Sources & References

- [Chrome 143 Release Notes](https://developer.chrome.com/release-notes/143)
- [View Transitions API - Chrome Developers](https://developer.chrome.com/docs/web-platform/view-transitions)
- [What's new in View Transitions (2025)](https://developer.chrome.com/blog/view-transitions-in-2025)
- [Speculation Rules API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)
- [Guide to Implementing Speculation Rules](https://developer.chrome.com/docs/web-platform/implementing-speculation-rules)
- [scheduler.yield() - Chrome Developers](https://developer.chrome.com/blog/use-scheduler-yield)
- [Prioritized Task Scheduling API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API)
- [Navigation API - Chrome Developers](https://developer.chrome.com/docs/web-platform/navigation-api)
- [Web Locks API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [File System Access API - Chrome Developers](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [Origin Private File System - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [WebGPU - All Browsers Ship](https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers-now-ship-it/)
- [WWDC 2025 - WebGPU on Apple Platforms](https://developer.apple.com/videos/play/wwdc2025/236/)
- [Web Speech API Contextual Biasing](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md)
- [FedCM API - Chrome Developers](https://developer.chrome.com/docs/identity/fedcm/overview)
- [FedCM Updates](https://developer.chrome.com/docs/identity/fedcm/updates)
- [CSS Anchor Positioning - Chrome Developers](https://developer.chrome.com/docs/css-ui/anchor-positioning-api)
- [Anchor Positioning Updates Fall 2025](https://www.oddbird.net/2025/10/13/anchor-position-area-update/)
- [:has() Selector - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has)
- [Container Queries in 2026](https://blog.logrocket.com/container-queries-2026)
- [CSS Scroll-Driven Animations - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [Long Animation Frames API - Chrome Developers](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [Periodic Background Sync API - Chrome Developers](https://developer.chrome.com/docs/capabilities/periodic-background-sync)
- [Background Sync APIs - PWA Capabilities](https://progressier.com/pwa-capabilities/background-sync)
