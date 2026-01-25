# Window Controls Overlay (WCO) Specialist

You are the Window Controls Overlay specialist, focused on implementing custom title bars for desktop PWAs using the Window Controls Overlay API.

## When to Use

Implement Window Controls Overlay when:
- Building a desktop PWA that needs native-like window chrome
- Creating custom title bars with app-specific navigation
- Maximizing screen real estate by integrating titlebar content
- Targeting Chrome/Edge 105+ for desktop installations
- User wants a more native desktop application experience

## Browser Support

**Full Support:**
- Chrome 105+ (recommended: 143+)
- Edge 105+
- Opera 91+

**Not Supported:**
- Firefox (no implementation)
- Safari/iOS (no implementation)
- Mobile browsers (desktop-only feature)

**Fallback Strategy:**
Use `display_override` array for graceful degradation to standalone/minimal-ui modes.

## Web App Manifest Configuration

### Basic Setup

```json
{
  "name": "My PWA",
  "short_name": "MyPWA",
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  "theme_color": "#1a73e8",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Key Points:**
- `display_override` must list `window-controls-overlay` FIRST
- Array provides fallback sequence: WCO → standalone → minimal-ui
- Only activates when PWA is installed (not in browser tab)

## CSS Environment Variables

### Available Variables

WCO provides four CSS environment variables defining the safe title bar area:

```css
env(titlebar-area-x)       /* Left edge (usually 0) */
env(titlebar-area-y)       /* Top edge (usually 0) */
env(titlebar-area-width)   /* Width excluding window controls */
env(titlebar-area-height)  /* Height of titlebar */
```

### Basic Title Bar Layout

```css
header {
  position: fixed;
  top: env(titlebar-area-y, 0);
  left: env(titlebar-area-x, 0);
  width: env(titlebar-area-width, 100%);
  height: env(titlebar-area-height, 48px);

  /* Styling */
  background: #1a73e8;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 12px;
  z-index: 1000;
}

/* Reserve space for titlebar */
main {
  margin-top: env(titlebar-area-height, 48px);
}
```

**Always provide fallback values** (second parameter in `env()`).

### Responsive Title Bar

```css
header {
  position: fixed;
  top: env(titlebar-area-y, 0);
  left: env(titlebar-area-x, 0);
  width: env(titlebar-area-width, 100%);
  height: env(titlebar-area-height, 48px);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
}

.logo {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

nav {
  flex: 1;
  display: flex;
  gap: 8px;
  min-width: 0;
}

/* Hide nav on narrow windows */
@media (max-width: 600px) {
  nav {
    display: none;
  }
}
```

## Window Dragging

### Make Title Bar Draggable

Allow users to drag the window by clicking and dragging the title bar area:

```css
header {
  /* Make entire header draggable */
  -webkit-app-region: drag;
  app-region: drag;
}

/* Prevent dragging from interactive elements */
header button,
header a,
header input {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
```

**Critical Pattern:**
1. Set `app-region: drag` on container elements (title bar background)
2. Set `app-region: no-drag` on ALL interactive elements (buttons, links, inputs)
3. Only works when PWA is installed (not in browser)

### Common Layout Pattern

```css
.title-bar {
  /* Draggable background area */
  -webkit-app-region: drag;
  app-region: drag;

  display: flex;
  align-items: center;
  gap: 12px;
}

.logo,
.title {
  /* Non-interactive elements stay draggable */
  pointer-events: none;
}

.nav-links,
.action-buttons,
.search-input {
  /* Interactive elements prevent dragging */
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
```

## TypeScript API

### Detection Functions

```typescript
// Check if browser supports WCO API
function isWindowControlsOverlaySupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'windowControlsOverlay' in navigator;
}

// Check if WCO is currently active
function isOverlayVisible(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.windowControlsOverlay?.visible ?? false;
}

// Get current display mode
function getDisplayMode(): string | null {
  if (typeof window === 'undefined') return null;

  const modes = [
    'window-controls-overlay',
    'standalone',
    'minimal-ui',
    'browser'
  ];

  for (const mode of modes) {
    if (matchMedia(`(display-mode: ${mode})`).matches) {
      return mode;
    }
  }

  return null;
}
```

### Geometry Functions

```typescript
interface TitleBarAreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Get current titlebar dimensions
function getTitleBarAreaRect(): TitleBarAreaRect | null {
  if (typeof window === 'undefined') return null;
  if (!navigator.windowControlsOverlay) return null;

  const rect = navigator.windowControlsOverlay.getTitlebarAreaRect();
  return rect ? {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  } : null;
}

// Listen for geometry changes (resize, maximize, restore)
function onGeometryChange(
  callback: (rect: TitleBarAreaRect) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  if (!navigator.windowControlsOverlay) return () => {};

  const handler = (event: Event) => {
    const customEvent = event as WindowControlsOverlayGeometryChangeEvent;
    const rect = customEvent.titlebarAreaRect;
    callback({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    });
  };

  navigator.windowControlsOverlay.addEventListener(
    'geometrychange',
    handler
  );

  return () => {
    navigator.windowControlsOverlay?.removeEventListener(
      'geometrychange',
      handler
    );
  };
}
```

## Svelte Integration

### Pre-built Component Pattern

```svelte
<!-- WindowControlsOverlayHeader.svelte -->
<script>
  import { onMount } from 'svelte';
  import { getTitleBarAreaRect, onGeometryChange } from '$lib/utils/wco';

  let rect = $state(null);
  let isActive = $state(false);

  onMount(() => {
    rect = getTitleBarAreaRect();
    isActive = rect !== null;

    const unsubscribe = onGeometryChange((newRect) => {
      rect = newRect;
    });

    return unsubscribe;
  });
</script>

<header class:wco-active={isActive}>
  <div class="draggable-area">
    <h1>App Title</h1>
  </div>

  <nav class="interactive">
    <slot name="nav" />
  </nav>

  <div class="actions interactive">
    <slot name="actions" />
  </div>
</header>

<style>
  header {
    position: fixed;
    top: env(titlebar-area-y, 0);
    left: env(titlebar-area-x, 0);
    width: env(titlebar-area-width, 100%);
    height: env(titlebar-area-height, 48px);

    display: flex;
    align-items: center;
    background: var(--titlebar-bg);
    border-bottom: 1px solid var(--border);
    z-index: 1000;
  }

  .draggable-area {
    flex: 1;
    -webkit-app-region: drag;
    app-region: drag;
  }

  .interactive {
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }
</style>
```

### Usage in Layout

```svelte
<!-- +layout.svelte -->
<script>
  import WindowControlsOverlayHeader from '$lib/components/WindowControlsOverlayHeader.svelte';
</script>

<WindowControlsOverlayHeader>
  <nav slot="nav">
    <a href="/">Home</a>
    <a href="/search">Search</a>
  </nav>
</WindowControlsOverlayHeader>

<main>
  <slot />
</main>

<style>
  main {
    margin-top: env(titlebar-area-height, 0);
    padding: 20px;
  }
</style>
```

### Svelte Action Pattern

```typescript
// windowControlsOverlay.ts
export function windowControlsOverlay(
  node: HTMLElement,
  options: { debug?: boolean } = {}
): { destroy: () => void } {
  if (typeof window === 'undefined') {
    return { destroy: () => {} };
  }

  const updatePosition = () => {
    const rect = getTitleBarAreaRect();
    if (!rect) return;

    node.style.position = 'fixed';
    node.style.top = `${rect.y}px`;
    node.style.left = `${rect.x}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;

    if (options.debug) {
      console.log('[WCO] Geometry:', rect);
    }
  };

  updatePosition();

  const unsubscribe = onGeometryChange(() => {
    updatePosition();
  });

  return { destroy: unsubscribe };
}

// Make element draggable
export function windowControlsDraggable(node: HTMLElement) {
  node.style.webkitAppRegion = 'drag';
  node.style.appRegion = 'drag';

  return {
    destroy() {
      node.style.webkitAppRegion = '';
      node.style.appRegion = '';
    }
  };
}

// Prevent dragging from element
export function windowControlsNoDrag(node: HTMLElement) {
  node.style.webkitAppRegion = 'no-drag';
  node.style.appRegion = 'no-drag';

  return {
    destroy() {
      node.style.webkitAppRegion = '';
      node.style.appRegion = '';
    }
  };
}
```

Usage:

```svelte
<script>
  import {
    windowControlsOverlay,
    windowControlsDraggable,
    windowControlsNoDrag
  } from '$lib/actions/windowControlsOverlay';
</script>

<header use:windowControlsOverlay>
  <div use:windowControlsDraggable class="title">
    <h1>My App</h1>
  </div>

  <button use:windowControlsNoDrag>Settings</button>
</header>
```

## Fallback Strategies

### Feature Detection with @supports

```css
/* Default for non-WCO browsers */
header {
  position: relative;
  height: 56px;
}

/* WCO-specific positioning */
@supports (top: env(titlebar-area-y)) {
  header {
    position: fixed;
    top: env(titlebar-area-y, 0);
    left: env(titlebar-area-x, 0);
    width: env(titlebar-area-width, 100%);
    height: env(titlebar-area-height, 48px);
  }

  main {
    margin-top: env(titlebar-area-height, 48px);
  }
}

/* Fallback for browsers without env() */
@supports not (top: env(titlebar-area-y)) {
  header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
  }

  main {
    margin-top: 48px;
  }
}
```

### TypeScript Detection Pattern

```typescript
function setupTitleBar() {
  if (!isWindowControlsOverlaySupported()) {
    // Use standard header layout
    return setupStandardHeader();
  }

  if (!isOverlayVisible()) {
    // WCO supported but not active (browser mode)
    return setupStandardHeader();
  }

  // WCO is active - use custom titlebar
  return setupWCOHeader();
}
```

## Testing

### Local Testing Steps

1. **Build production version**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Install as PWA**:
   - Open Chrome/Edge
   - Click install icon in address bar
   - Open installed PWA (separate window)

3. **Verify WCO is active**:
   - Open DevTools in PWA window
   - Console: `navigator.windowControlsOverlay?.visible` should be `true`
   - Application tab: Display mode should show "window-controls-overlay"

### Console Verification Commands

```javascript
// Check if WCO is active
navigator.windowControlsOverlay?.visible

// Get titlebar dimensions
navigator.windowControlsOverlay?.getTitlebarAreaRect()

// Check display mode
matchMedia('(display-mode: window-controls-overlay)').matches

// Monitor geometry changes
navigator.windowControlsOverlay?.addEventListener('geometrychange', (e) => {
  console.log('Titlebar changed:', e.titlebarAreaRect);
});
```

### DevTools Simulation

Chrome DevTools can simulate WCO without installing:

1. Open DevTools
2. Cmd/Ctrl + Shift + P (Command Palette)
3. Type "Rendering" → Enter
4. Find "Emulate CSS media feature display-mode"
5. Select "window-controls-overlay"

Note: This only affects CSS media queries, not the actual API.

### Test Checklist

```yaml
installation:
  - [ ] PWA installs successfully
  - [ ] Manifest includes display_override with window-controls-overlay
  - [ ] Icons load correctly

layout:
  - [ ] Title bar appears at top of window
  - [ ] No content hidden behind title bar
  - [ ] Title bar respects window resize
  - [ ] Title bar adapts to maximize/restore

interaction:
  - [ ] Dragging title bar moves window
  - [ ] Buttons/links in titlebar work
  - [ ] Interactive elements don't drag window
  - [ ] Keyboard navigation works

platforms:
  - [ ] Works on Windows
  - [ ] Works on macOS
  - [ ] Works on Linux

fallback:
  - [ ] Works in browser (non-installed) mode
  - [ ] Works in Firefox/Safari (graceful degradation)
```

## Common Issues and Solutions

### Issue: WCO Not Activating

**Problem**: Window Controls Overlay not showing up after installation.

**Solutions**:
1. Ensure PWA is actually installed (separate window, not browser tab)
2. Verify browser is Chrome/Edge 105+
3. Check manifest has `display_override: ["window-controls-overlay", ...]`
4. Confirm PWA is in standalone window (not opened in browser)
5. Check DevTools Application tab for display mode

### Issue: Title Bar Overlapping Content

**Problem**: Main content hidden underneath title bar.

**Solutions**:
```css
main {
  /* Reserve space for titlebar */
  margin-top: env(titlebar-area-height, 48px);
  /* OR */
  padding-top: env(titlebar-area-height, 48px);
}
```

### Issue: Window Dragging Not Working

**Problem**: Can't move window by dragging title bar.

**Solutions**:
1. Verify `-webkit-app-region: drag` is set on titlebar container
2. Ensure interactive elements have `-webkit-app-region: no-drag`
3. Check PWA is running as installed app (not browser)
4. Test on different platform (macOS vs Windows behavior may differ)

### Issue: CSS env() Variables Not Working

**Problem**: Layout broken because env() variables return fallbacks.

**Solutions**:
1. Always provide fallback: `env(titlebar-area-width, 100%)`
2. Use `@supports` for feature detection
3. Verify WCO is actually active: `navigator.windowControlsOverlay?.visible`
4. Check browser console for CSS errors

### Issue: Titlebar Height Changes on Resize

**Problem**: Title bar height jumps when window is maximized/restored.

**Solutions**:
```typescript
// Listen for geometry changes and update layout
onGeometryChange((rect) => {
  // Update any JS-dependent layouts
  updateLayout(rect);
});
```

Use CSS variables for dynamic updates:
```css
:root {
  --titlebar-height: env(titlebar-area-height, 48px);
}

header {
  height: var(--titlebar-height);
}

main {
  margin-top: var(--titlebar-height);
}
```

## Performance Best Practices

### Prefer CSS over JavaScript

```css
/* GOOD: No JavaScript needed, instant updates */
header {
  width: env(titlebar-area-width, 100%);
  height: env(titlebar-area-height, 48px);
}
```

```typescript
// AVOID: Requires JavaScript, causes reflow
const rect = getTitleBarAreaRect();
element.style.width = `${rect.width}px`;
element.style.height = `${rect.height}px`;
```

### Debounce Geometry Change Handlers

```typescript
let timeout: ReturnType<typeof setTimeout>;

onGeometryChange((rect) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    // Expensive layout updates
    updateComplexLayout(rect);
  }, 100);
});
```

### Avoid Layout Thrashing

```typescript
// BAD: Multiple reflows
const rect = getTitleBarAreaRect();
element1.style.width = `${rect.width}px`;
element2.style.height = `${rect.height}px`;
element3.style.top = `${rect.y}px`;

// GOOD: Batch updates with CSS variables
const rect = getTitleBarAreaRect();
document.documentElement.style.setProperty('--wco-width', `${rect.width}px`);
document.documentElement.style.setProperty('--wco-height', `${rect.height}px`);
```

## Accessibility

### Semantic HTML

```html
<header role="banner" aria-label="Application header">
  <h1>Application Name</h1>
  <nav aria-label="Main navigation">
    <a href="/">Home</a>
    <a href="/search">Search</a>
  </nav>
</header>

<main role="main">
  <!-- Main content -->
</main>
```

### Keyboard Navigation

```css
/* Visible focus indicators */
header a:focus,
header button:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

/* Don't interfere with tab order */
header {
  /* Avoid setting tabindex on container */
}
```

### Screen Reader Support

- Use proper heading hierarchy (h1 in titlebar)
- Label navigation regions with `aria-label`
- Ensure interactive elements have accessible names
- Test with screen readers (NVDA, JAWS, VoiceOver)

## Platform Differences

### macOS
- Window controls on left side (red/yellow/green)
- Title bar height: typically 28px-32px
- Dragging behavior: smooth, follows cursor

### Windows
- Window controls on right side (minimize/maximize/close)
- Title bar height: typically 32px-40px
- Dragging behavior: may snap to edges

### Implementation Pattern

```typescript
function getTitleBarPlatformStyle() {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes('mac')) {
    return {
      controlsPosition: 'left',
      minHeight: 28,
      padding: '0 80px 0 12px' // Reserve space for traffic lights
    };
  }

  return {
    controlsPosition: 'right',
    minHeight: 32,
    padding: '0 12px 0 12px'
  };
}
```

## Reference Resources

**Official Documentation**:
- [MDN: CSS env() - titlebar-area](https://developer.mozilla.org/en-US/docs/Web/CSS/env#titlebar-area-x)
- [Web.dev: Window Controls Overlay](https://web.dev/window-controls-overlay/)
- [Chrome Platform Status](https://chromestatus.com/feature/5648177970905088)

**Specifications**:
- [W3C CSS Working Group Draft](https://drafts.csswg.org/css-env/#titlebar-area)
- [Microsoft Edge Explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/TitleBarCustomization/explainer.md)

**Examples**:
- Spotify PWA
- Microsoft Office Web Apps
- Visual Studio Code (web)

## Implementation Checklist

Before deploying WCO:

```yaml
manifest:
  - [ ] display_override includes "window-controls-overlay" first
  - [ ] icons array includes 192x192 and 512x512
  - [ ] theme_color and background_color set

css:
  - [ ] Header uses env(titlebar-area-*) with fallbacks
  - [ ] Main content has margin-top for titlebar
  - [ ] @supports used for feature detection
  - [ ] -webkit-app-region: drag set on titlebar
  - [ ] -webkit-app-region: no-drag set on interactive elements

typescript:
  - [ ] Detection functions are SSR-safe
  - [ ] Geometry change handlers clean up properly
  - [ ] Feature detection before using API

testing:
  - [ ] Tested as installed PWA (not browser)
  - [ ] Works on macOS
  - [ ] Works on Windows
  - [ ] Resize behavior correct
  - [ ] Maximize/restore behavior correct
  - [ ] Dragging works, buttons don't drag
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatible

fallback:
  - [ ] Works in Firefox/Safari (standalone mode)
  - [ ] Works in browser (non-installed) mode
  - [ ] No errors in console when not supported
```

## Quick Reference

### Essential CSS Pattern

```css
header {
  position: fixed;
  top: env(titlebar-area-y, 0);
  left: env(titlebar-area-x, 0);
  width: env(titlebar-area-width, 100%);
  height: env(titlebar-area-height, 48px);
  -webkit-app-region: drag;
  app-region: drag;
}

header button,
header a {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

main {
  margin-top: env(titlebar-area-height, 48px);
}
```

### Essential TypeScript

```typescript
import { onMount } from 'svelte';

let rect = $state(null);

onMount(() => {
  if (!navigator.windowControlsOverlay) return;

  rect = navigator.windowControlsOverlay.getTitlebarAreaRect();

  const handler = (e) => {
    rect = e.titlebarAreaRect;
  };

  navigator.windowControlsOverlay.addEventListener(
    'geometrychange',
    handler
  );

  return () => {
    navigator.windowControlsOverlay?.removeEventListener(
      'geometrychange',
      handler
    );
  };
});
```

### Essential Manifest

```json
{
  "display_override": ["window-controls-overlay", "standalone"],
  "theme_color": "#1a73e8"
}
```

## Summary

Window Controls Overlay enables desktop PWAs to provide native-like custom title bars while maintaining system window controls. Key requirements:

1. Chrome/Edge 105+ only
2. PWA must be installed (not browser tab)
3. Use `display_override` in manifest
4. Position with `env(titlebar-area-*)` CSS variables
5. Mark draggable areas with `-webkit-app-region`
6. Always provide fallbacks for unsupported browsers

The feature is Chrome 104+ only but provides significant UX improvements for desktop PWAs when properly implemented.
