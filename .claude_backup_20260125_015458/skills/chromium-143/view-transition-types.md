---
title: View Transitions with Types
description: Categorize transitions by type for different animation behaviors
tags: [chromium-143, view-transitions, animations, navigation]
min_chrome_version: 125
category: View Transitions
complexity: intermediate
last_updated: 2026-01
---

# View Transition Types (Chrome 125+)

Categorize navigations (forward, back, reload) to trigger different transition animations. Slide forward on next page, slide back on previous, no animation on reload.

## When to Use

- **Navigation direction** - Different animations for forward/back
- **SPA routing** - Distinguish between user flows
- **Multi-page apps** - Back button vs. forward navigation
- **User context** - Remember transition type in analytics
- **Semantic navigation** - Improve UX with directional cues

## Syntax

```typescript
// Set transition type before navigation
document.documentElement.style.setProperty('view-transition-type', 'navigation');

// Or use transitionWhile with type
document.startViewTransition({
  update: async () => {
    await navigate('/new-page');
  },
  types: ['navigation', 'forward']  // Multiple types supported
});
```

## Examples

### Basic Type-Based Animations

```css
/* Detect transition type */
:root {
  view-transition-name: root;
}

/* Forward transition - slide in from right */
@view-transition {
  types: forward;
}

::view-transition-old(root) {
  animation: slide-out-left 0.3s ease-out;
}

::view-transition-new(root) {
  animation: slide-in-right 0.3s ease-in;
}

/* Back transition - slide in from left */
@view-transition {
  types: back;
}

::view-transition-old(root) {
  animation: slide-out-right 0.3s ease-out;
}

::view-transition-new(root) {
  animation: slide-in-left 0.3s ease-in;
}

/* Reload - fade */
@view-transition {
  types: reload;
}

::view-transition-old(root) {
  animation: fade-out 0.2s ease-out;
}

::view-transition-new(root) {
  animation: fade-in 0.2s ease-in;
}

@keyframes slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-out-right {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

@keyframes slide-in-left {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Navigation Router with Types

```typescript
class NavigationRouter {
  private history: string[] = [];
  private currentIndex = 0;

  async navigate(url: string, type: 'forward' | 'back' | 'reload' = 'forward'): Promise<void> {
    if (!document.startViewTransition) {
      window.location.href = url;
      return;
    }

    // Set transition type for CSS
    document.documentElement.style.setProperty('view-transition-type', type);

    await document.startViewTransition(async () => {
      // Simulate navigation
      await this.loadPage(url);

      // Update history
      if (type === 'forward') {
        this.history = this.history.slice(0, this.currentIndex + 1);
        this.history.push(url);
        this.currentIndex++;
      } else if (type === 'back') {
        this.currentIndex--;
      }
    });
  }

  back(): Promise<void> {
    if (this.currentIndex > 0) {
      return this.navigate(this.history[this.currentIndex - 1], 'back');
    }
    return Promise.resolve();
  }

  forward(): Promise<void> {
    if (this.currentIndex < this.history.length - 1) {
      return this.navigate(this.history[this.currentIndex + 1], 'forward');
    }
    return Promise.resolve();
  }

  reload(): Promise<void> {
    return this.navigate(this.history[this.currentIndex], 'reload');
  }

  private async loadPage(url: string): Promise<void> {
    // Fetch and render new page
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.body.replaceWith(doc.body);
  }
}

// Usage
const router = new NavigationRouter();

// Forward navigation
document.querySelector('[href]')?.addEventListener('click', (e) => {
  e.preventDefault();
  const href = (e.target as HTMLAnchorElement).href;
  router.navigate(href, 'forward');
});

// Back button
document.getElementById('back')?.addEventListener('click', () => {
  router.back();
});
```

### SPA with View Transition Types

```typescript
interface ViewTransitionType {
  name: string;
  direction: 'forward' | 'back' | 'reload';
  duration: number;
}

class SPARouter {
  private transitionType: ViewTransitionType = {
    name: 'navigation',
    direction: 'forward',
    duration: 300
  };

  private history: Array<{ url: string; title: string; state?: any }> = [];
  private currentIndex = -1;

  async navigateTo(url: string, title: string, direction: 'forward' | 'back' | 'reload' = 'forward'): Promise<void> {
    if (!document.startViewTransition) {
      window.location.href = url;
      return;
    }

    this.transitionType.direction = direction;
    document.documentElement.style.setProperty('view-transition-type', direction);

    try {
      await document.startViewTransition(async () => {
        // Load content
        const content = await this.fetchContent(url);
        document.getElementById('app')!.innerHTML = content;

        // Update history
        if (direction === 'forward') {
          this.history = this.history.slice(0, this.currentIndex + 1);
          this.history.push({ url, title });
          this.currentIndex++;
        } else if (direction === 'back' && this.currentIndex > 0) {
          this.currentIndex--;
        }

        // Update page
        document.title = title;
        window.history.pushState({ url, title }, title, url);
      });
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  }

  handleBackButton(): void {
    if (this.currentIndex > 0) {
      const prev = this.history[this.currentIndex - 1];
      this.navigateTo(prev.url, prev.title, 'back');
    }
  }

  private async fetchContent(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.getElementById('app')?.innerHTML || '';
  }
}

// Setup
const router = new SPARouter();

// Link handler
document.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest('a');
  if (link && link.host === window.location.host) {
    e.preventDefault();
    router.navigateTo(link.href, link.textContent || '', 'forward');
  }
});

// Back button
window.addEventListener('popstate', () => {
  router.handleBackButton();
});
```

### Breadcrumb Navigation

```css
/* Breadcrumb with different transitions */
.breadcrumb {
  display: flex;
  gap: 0.5rem;
}

.breadcrumb a {
  color: #0066cc;
  text-decoration: none;
  padding: 0.25rem 0.5rem;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

/* Current level - no transition */
.breadcrumb .current {
  color: #333;
  pointer-events: none;
}

/* Back to parent - different animation */
@view-transition {
  types: back;
}

::view-transition-old(breadcrumb) {
  animation: breadcrumb-out-right 0.2s ease-out;
}

::view-transition-new(breadcrumb) {
  animation: breadcrumb-in-left 0.2s ease-in;
}

@keyframes breadcrumb-out-right {
  from { opacity: 1; }
  to { opacity: 0; transform: translateX(20px); }
}

@keyframes breadcrumb-in-left {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; }
}
```

### Carousel with Direction-Based Transitions

```typescript
class DirectionalCarousel {
  private currentIndex = 0;
  private items: HTMLElement[] = [];

  constructor(containerSelector: string) {
    const container = document.querySelector(containerSelector);
    this.items = Array.from(container?.querySelectorAll('.carousel-item') || []) as HTMLElement[];
  }

  async goNext(): Promise<void> {
    if (this.currentIndex < this.items.length - 1) {
      await this.transitionTo(this.currentIndex + 1, 'forward');
    }
  }

  async goPrev(): Promise<void> {
    if (this.currentIndex > 0) {
      await this.transitionTo(this.currentIndex - 1, 'back');
    }
  }

  private async transitionTo(index: number, type: 'forward' | 'back'): Promise<void> {
    if (!document.startViewTransition) {
      this.showItem(index);
      return;
    }

    document.documentElement.style.setProperty('view-transition-type', type);

    await document.startViewTransition(async () => {
      this.showItem(index);
      this.currentIndex = index;
    });
  }

  private showItem(index: number): void {
    this.items.forEach((item, i) => {
      item.style.display = i === index ? 'block' : 'none';
    });
  }
}

// CSS
// See previous CSS examples for slide-in/out animations
```

### Tab Navigation with Types

```typescript
class TabbedInterface {
  private tabs: Map<string, HTMLElement> = new Map();
  private currentTab = '';

  register(name: string, content: HTMLElement): void {
    this.tabs.set(name, content);
  }

  async selectTab(name: string): Promise<void> {
    const isForward = this.isTabForward(name);
    const type = isForward ? 'forward' : 'back';

    if (!document.startViewTransition) {
      this.showTab(name);
      return;
    }

    document.documentElement.style.setProperty('view-transition-type', type);

    await document.startViewTransition(async () => {
      this.showTab(name);
    });

    this.currentTab = name;
  }

  private showTab(name: string): void {
    this.tabs.forEach((content, tabName) => {
      content.style.display = tabName === name ? 'block' : 'none';
    });
  }

  private isTabForward(name: string): boolean {
    const currentOrder = Array.from(this.tabs.keys()).indexOf(this.currentTab);
    const newOrder = Array.from(this.tabs.keys()).indexOf(name);
    return newOrder > currentOrder;
  }
}

// Setup
const tabs = new TabbedInterface();
tabs.register('overview', document.getElementById('overview')!);
tabs.register('details', document.getElementById('details')!);
tabs.register('settings', document.getElementById('settings')!);

// Tab buttons
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const tabName = (e.target as HTMLElement).getAttribute('data-tab');
    if (tabName) tabs.selectTab(tabName);
  });
});
```

### Modal Navigation

```typescript
class ModalNavigator {
  private modals: Map<string, HTMLElement> = new Map();
  private stack: string[] = [];

  register(name: string, modal: HTMLElement): void {
    this.modals.set(name, modal);
  }

  async open(name: string): Promise<void> {
    if (!document.startViewTransition) {
      this.showModal(name);
      return;
    }

    document.documentElement.style.setProperty('view-transition-type', 'forward');

    await document.startViewTransition(async () => {
      this.showModal(name);
      this.stack.push(name);
    });
  }

  async close(): Promise<void> {
    if (this.stack.length === 0) return;

    if (!document.startViewTransition) {
      this.hideAllModals();
      return;
    }

    document.documentElement.style.setProperty('view-transition-type', 'back');

    await document.startViewTransition(async () => {
      this.stack.pop();
      this.hideAllModals();
      if (this.stack.length > 0) {
        this.showModal(this.stack[this.stack.length - 1]);
      }
    });
  }

  private showModal(name: string): void {
    const modal = this.modals.get(name);
    if (modal) modal.style.display = 'block';
  }

  private hideAllModals(): void {
    this.modals.forEach(modal => {
      modal.style.display = 'none';
    });
  }
}

// CSS
@view-transition {
  types: forward;
}

::view-transition-old(root) {
  animation: modal-fade-out 0.2s ease-out;
}

::view-transition-new(root) {
  animation: modal-fade-in 0.2s ease-in;
}

@keyframes modal-fade-out {
  from { opacity: 1; }
  to { opacity: 0.5; transform: scale(0.95); }
}

@keyframes modal-fade-in {
  from { opacity: 0.5; transform: scale(1.05); }
  to { opacity: 1; }
}
```

### Analytics Integration

```typescript
interface TransitionMetrics {
  type: 'forward' | 'back' | 'reload';
  fromPage: string;
  toPage: string;
  timestamp: number;
  duration: number;
}

class TransitionAnalytics {
  private metrics: TransitionMetrics[] = [];

  trackTransition(type: 'forward' | 'back' | 'reload', fromPage: string, toPage: string): void {
    const startTime = performance.now();

    if (document.activeViewTransition) {
      document.activeViewTransition.finished.then(() => {
        const duration = performance.now() - startTime;
        this.metrics.push({
          type,
          fromPage,
          toPage,
          timestamp: Date.now(),
          duration
        });

        // Send to analytics
        this.sendMetrics();
      });
    }
  }

  private sendMetrics(): void {
    if (this.metrics.length > 0) {
      navigator.sendBeacon(
        '/api/transitions',
        JSON.stringify(this.metrics)
      );
      this.metrics = [];
    }
  }
}

// Usage
const analytics = new TransitionAnalytics();

// Wrap navigation with tracking
async function navigateWithTracking(url: string, type: 'forward' | 'back' | 'reload'): Promise<void> {
  const fromPage = window.location.pathname;
  analytics.trackTransition(type, fromPage, url);
  // ... perform navigation
}
```

## Performance Considerations

| Type | Animation Style | Best For |
|------|---|---|
| `forward` | Slide/expand right | Next page, deeper nav |
| `back` | Slide/expand left | Previous page, parent |
| `reload` | Fade | Same content update |

## Real-World Use Cases

**1. E-commerce** - Back to product list uses left slide
**2. Documentation** - Forward into nested topics uses right slide
**3. Dashboards** - Reload maintains smooth fade transition
**4. Chat apps** - Back to conversation list with left animation
**5. Forms** - Forward to next step with directional cues
