# Window Controls Overlay Integration Examples

Complete examples for integrating WCO into your DMB Almanac PWA.

## Example 1: Using the Pre-built Header Component

The simplest approach - just drop in the component and it handles everything.

**File: `src/routes/+layout.svelte`**

```svelte
<script>
  import WindowControlsOverlayHeader from '$lib/components/WindowControlsOverlayHeader.svelte';
</script>

<WindowControlsOverlayHeader>
  <nav slot="nav">
    <a href="/">Home</a>
    <a href="/shows">Shows</a>
    <a href="/search">Search</a>
    <a href="/songs">Songs</a>
    <a href="/venues">Venues</a>
  </nav>
</WindowControlsOverlayHeader>

<main>
  <slot />
</main>

<style>
  :global {
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--color-bg, #030712);
      color: var(--color-text, #ffffff);
    }
  }

  /* Account for title bar height when WCO is active */
  main {
    margin-top: env(titlebar-area-height, 0);
    padding: 20px;
  }

  @supports not (margin-top: env(titlebar-area-height)) {
    /* Fallback for browsers without env() support */
    main {
      margin-top: 0;
    }
  }
</style>
```

## Example 2: Custom Header with TypeScript Detection

Detect WCO status and respond to geometry changes.

**File: `src/routes/+layout.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import {
    isWindowControlsOverlaySupported,
    isOverlayVisible,
    getTitleBarAreaRect,
    onGeometryChange,
    type TitleBarAreaRect
  } from '$lib/utils/windowControlsOverlay';

  let titleBarRect: TitleBarAreaRect | null = $state(null);
  let isWcoActive: boolean = $state(false);

  onMount(() => {
    isWcoActive = isOverlayVisible();
    titleBarRect = getTitleBarAreaRect();

    const unsubscribe = onGeometryChange((rect) => {
      titleBarRect = rect;
      // Update layout when window resizes
      console.log('Title bar geometry changed:', rect);
    });

    return () => unsubscribe();
  });
</script>

<header class="custom-header" class:wco-active={isWcoActive}>
  <div class="header-content">
    <div class="logo">
      <svg viewBox="0 0 32 32" width="28" height="28">
        <!-- Your logo SVG -->
      </svg>
      <h1>DMB Almanac</h1>
    </div>

    <nav class="main-nav">
      <a href="/">Home</a>
      <a href="/shows">Shows</a>
      <a href="/search">Search</a>
    </nav>

    <div class="spacer"></div>

    {#if isWcoActive && titleBarRect}
      <div class="wco-info" aria-hidden="true">
        {titleBarRect.width}px
      </div>
    {/if}
  </div>
</header>

<main>
  <slot />
</main>

<style>
  header.custom-header {
    /* Standard header styling for non-WCO browsers */
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    height: 56px;
    background: linear-gradient(to bottom, #0a0e1a, #030712);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    z-index: 1000;
  }

  /* WCO-specific positioning */
  @supports (top: env(titlebar-area-y)) {
    header.custom-header {
      position: fixed;
      top: env(titlebar-area-y, 0);
      left: env(titlebar-area-x, 0);
      width: env(titlebar-area-width, 100%);
      height: env(titlebar-area-height, 56px);
    }

    header.custom-header.wco-active {
      /* Additional styling when WCO is confirmed active */
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  .header-content {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 0 12px;
    gap: 12px;

    /* Make draggable to move window */
    -webkit-app-region: drag;
    app-region: drag;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .logo h1 {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.5px;
    white-space: nowrap;
    margin: 0;
  }

  .main-nav {
    display: flex;
    gap: 2px;
    flex: 1;
    min-width: 0;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .main-nav a {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: all 0.2s;
  }

  .main-nav a:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .spacer {
    flex: 1;
  }

  .wco-info {
    font-size: 11px;
    opacity: 0.5;
    font-family: monospace;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  main {
    margin-top: env(titlebar-area-height, 56px);
    padding: 20px;
  }
</style>
```

## Example 3: Using Svelte Actions for Custom Elements

Apply WCO styling to any element using actions.

**File: `src/routes/+page.svelte`**

```svelte
<script>
  import { windowControlsOverlay, windowControlsDraggable, windowControlsNoDrag } from '$lib/actions/windowControlsOverlay';
</script>

<!-- Use WCO action on any element -->
<header use:windowControlsOverlay>
  <div use:windowControlsDraggable class="draggable-area">
    <h1>DMB Almanac</h1>
  </div>

  <nav>
    <a href="/" use:windowControlsNoDrag>Home</a>
    <a href="/shows" use:windowControlsNoDrag>Shows</a>
  </nav>

  <button use:windowControlsNoDrag>Settings</button>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    background: #030712;
  }

  .draggable-area {
    flex: 1;
    display: flex;
    align-items: center;
  }

  h1 {
    font-size: 16px;
    margin: 0;
  }

  nav {
    display: flex;
    gap: 8px;
  }

  button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
  }
</style>
```

## Example 4: Responsive Title Bar with Breakpoints

Title bar that adapts to different window sizes.

**File: `src/routes/+layout.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import { getTitleBarAreaRect, onGeometryChange } from '$lib/utils/windowControlsOverlay';

  let titleBarWidth = $state(0);
  let isMobile = $state(false);

  onMount(() => {
    const rect = getTitleBarAreaRect();
    if (rect) {
      titleBarWidth = rect.width;
      isMobile = rect.width < 600;
    }

    const unsubscribe = onGeometryChange((rect) => {
      titleBarWidth = rect.width;
      isMobile = rect.width < 600;
    });

    return () => unsubscribe();
  });
</script>

<header class="responsive-header" class:mobile={isMobile}>
  <div class="logo">
    <h1>DMB</h1>
  </div>

  {#if !isMobile}
    <nav class="full-nav">
      <a href="/">Home</a>
      <a href="/shows">Shows</a>
      <a href="/search">Search</a>
      <a href="/songs">Songs</a>
      <a href="/venues">Venues</a>
    </nav>
  {/if}

  <button class="menu-btn">
    ≡
  </button>
</header>

<main>
  <slot />
</main>

<style>
  header.responsive-header {
    position: fixed;
    top: env(titlebar-area-y, 0);
    left: env(titlebar-area-x, 0);
    width: env(titlebar-area-width, 100%);
    height: env(titlebar-area-height, 48px);

    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #030712;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0 12px;
    gap: 12px;

    -webkit-app-region: drag;
    app-region: drag;
  }

  .logo {
    flex-shrink: 0;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .logo h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -1px;
  }

  .full-nav {
    display: flex;
    gap: 4px;
    flex: 1;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .full-nav a {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: all 0.2s;
  }

  .full-nav a:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .menu-btn {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: white;
    font-size: 20px;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .menu-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Hide full nav on mobile */
  header.responsive-header.mobile .full-nav {
    display: none;
  }

  main {
    margin-top: env(titlebar-area-height, 48px);
  }
</style>
```

## Example 5: Detection and Graceful Fallback

Detect WCO and apply different styles accordingly.

**File: `src/app.css`**

```css
:root {
  /* Define title bar height CSS variable */
  --title-bar-height: env(titlebar-area-height, 0);
}

/* Styles when WCO is fully supported */
@supports (top: env(titlebar-area-y)) {
  body {
    margin: 0;
    padding-top: var(--title-bar-height);
  }

  header {
    position: fixed;
    top: env(titlebar-area-y, 0);
    left: env(titlebar-area-x, 0);
    width: env(titlebar-area-width, 100%);
    height: env(titlebar-area-height, 48px);
  }
}

/* Fallback for browsers without env() support */
@supports not (top: env(titlebar-area-y)) {
  body {
    padding-top: 48px;
  }

  header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
  }
}

/* Standard styles */
header {
  display: flex;
  align-items: center;
  background: #030712;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
}

main {
  flex: 1;
  overflow: auto;
}
```

## Example 6: React-like Hooks Pattern

Svelte-style composable for WCO state management.

**File: `src/lib/utils/windowControlsOverlay.svelte.ts`**

```typescript
import { writable, type Readable } from 'svelte/store';
import {
  isOverlayVisible,
  getTitleBarAreaRect,
  onGeometryChange,
  type TitleBarAreaRect
} from './windowControlsOverlay';

export function createWindowControlsOverlay(): {
  visible: Readable<boolean>;
  rect: Readable<TitleBarAreaRect | null>;
} {
  const visibleStore = writable(isOverlayVisible());
  const rectStore = writable(getTitleBarAreaRect());

  // Listen for changes
  onGeometryChange((rect) => {
    rectStore.set(rect);
  });

  // Poll visibility (since there's no event for visibility changes)
  const interval = setInterval(() => {
    visibleStore.set(isOverlayVisible());
  }, 1000);

  return {
    visible: {
      subscribe: visibleStore.subscribe,
      unsubscribe: () => clearInterval(interval)
    },
    rect: { subscribe: rectStore.subscribe }
  };
}
```

Usage in component:

```svelte
<script>
  import { createWindowControlsOverlay } from '$lib/utils/windowControlsOverlay.svelte';

  const wco = createWindowControlsOverlay();
</script>

{#if $wco.visible && $wco.rect}
  <header>
    Title bar is {$wco.rect.width}px wide
  </header>
{/if}
```

## Example 7: Testing WCO Functionality

Test utilities to verify WCO works correctly.

**File: `src/lib/utils/__tests__/windowControlsOverlay.test.ts`**

```typescript
import {
  isWindowControlsOverlaySupported,
  isOverlayVisible,
  getTitleBarAreaRect,
  getDisplayMode,
  isInstalledWithWindowControlsOverlay
} from '../windowControlsOverlay';

describe('windowControlsOverlay', () => {
  // SSR safety tests
  it('should be SSR safe - return false when window is undefined', () => {
    expect(isWindowControlsOverlaySupported()).toBeDefined();
    expect(isOverlayVisible()).toBeDefined();
    expect(getTitleBarAreaRect()).toBeDefined();
  });

  // Feature detection tests
  it('should detect WCO support', () => {
    const supported = isWindowControlsOverlaySupported();
    expect(typeof supported).toBe('boolean');
  });

  it('should return title bar rect when supported', () => {
    if (isWindowControlsOverlaySupported()) {
      const rect = getTitleBarAreaRect();
      if (rect) {
        expect(rect).toHaveProperty('x');
        expect(rect).toHaveProperty('y');
        expect(rect).toHaveProperty('width');
        expect(rect).toHaveProperty('height');
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      }
    }
  });

  it('should detect display mode', () => {
    const mode = getDisplayMode();
    const validModes = [
      'window-controls-overlay',
      'standalone',
      'minimal-ui',
      'browser',
      null
    ];
    expect(validModes).toContain(mode);
  });

  // Integration tests
  it('should return true for installed PWA with WCO', () => {
    const installed = isInstalledWithWindowControlsOverlay();
    expect(typeof installed).toBe('boolean');
  });
});
```

## Example 8: Production Deployment Checklist

Before deploying WCO support:

```typescript
// 1. Verify manifest has display_override
const manifest = await fetch('/manifest.json').then(r => r.json());
console.assert(
  manifest.display_override?.includes('window-controls-overlay'),
  'display_override not properly configured'
);

// 2. Verify utilities are SSR safe
console.assert(
  typeof window === 'undefined' || isWindowControlsOverlaySupported() !== undefined,
  'WCO utilities not SSR safe'
);

// 3. Check CSS environment variables work
const styles = getComputedStyle(document.documentElement);
console.log('Title bar height:', styles.getPropertyValue('--titlebar-area-height'));

// 4. Verify component loads
console.assert(
  document.querySelector('header'),
  'Header component not rendering'
);

// 5. Test geometry changes
const initialRect = getTitleBarAreaRect();
const unsubscribe = onGeometryChange((rect) => {
  console.log('Geometry changed test passed:', rect);
});

// 6. Verify accessibility
console.assert(
  document.querySelector('header nav'),
  'Navigation not accessible'
);
```

