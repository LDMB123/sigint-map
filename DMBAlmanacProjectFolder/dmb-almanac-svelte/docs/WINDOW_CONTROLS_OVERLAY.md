# Window Controls Overlay (WCO) Implementation Guide

## Overview

Window Controls Overlay is a web platform API that enables PWAs to display custom title bars in standalone mode while keeping the native window controls (minimize, maximize, close) in the top-right corner. This creates a more native app-like experience.

**Browser Support:**
- Chrome/Edge 105+
- Recommended: Chromium 143+ (latest)

**Demo Sites:**
- Spotify PWA
- Microsoft Office Web Apps
- Google Keep PWA

## Configuration

### Web App Manifest

The manifest already includes WCO support at `/static/manifest.json`:

```json
{
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  ...
}
```

This tells the browser to:
1. Try `window-controls-overlay` display mode first (modern browsers)
2. Fall back to `standalone` (older browsers)
3. Fall back to `minimal-ui` (browsers without standalone support)

## CSS Environment Variables

When Window Controls Overlay is active, the browser provides CSS environment variables that define the safe area for your title bar:

```css
/* Position: fixed title bar in the safe area */
header {
  position: fixed;
  top: env(titlebar-area-y, 0);
  left: env(titlebar-area-x, 0);
  width: env(titlebar-area-width, 100%);
  height: env(titlebar-area-height, 48px);
}
```

### Available Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `env(titlebar-area-x)` | Left edge of the title bar area (usually 0) | 0px |
| `env(titlebar-area-y)` | Top edge of the title bar area (usually 0) | 0px |
| `env(titlebar-area-width)` | Width of available title bar space (excludes window controls) | 1200px |
| `env(titlebar-area-height)` | Height of the title bar area | 48px |

### Fallback Values

Always provide fallback values in case the browser doesn't support `env()`:

```css
width: env(titlebar-area-width, 100%);
```

## TypeScript Utilities

### Detection Functions

#### `isWindowControlsOverlaySupported(): boolean`
Check if the browser supports the WCO API.

```typescript
import { isWindowControlsOverlaySupported } from '$lib/utils/windowControlsOverlay';

if (isWindowControlsOverlaySupported()) {
  console.log('WCO is available');
}
```

#### `isOverlayVisible(): boolean`
Check if WCO is currently active (app is installed and in WCO display mode).

```typescript
import { isOverlayVisible } from '$lib/utils/windowControlsOverlay';

if (isOverlayVisible()) {
  console.log('Running as PWA with custom title bar');
}
```

#### `getDisplayMode(): string | null`
Get the current display mode.

```typescript
import { getDisplayMode } from '$lib/utils/windowControlsOverlay';

const mode = getDisplayMode();
// Returns: 'window-controls-overlay', 'standalone', 'minimal-ui', 'browser', or null
```

### Geometry Functions

#### `getTitleBarAreaRect(): TitleBarAreaRect | null`
Get the current title bar area dimensions.

```typescript
import { getTitleBarAreaRect } from '$lib/utils/windowControlsOverlay';

const rect = getTitleBarAreaRect();
if (rect) {
  console.log(`Title bar: ${rect.width}x${rect.height} at (${rect.x}, ${rect.y})`);
}
```

#### `onGeometryChange(callback: (rect: TitleBarAreaRect) => void): () => void`
Listen for changes when the window is resized, maximized, or restored.

```typescript
import { onGeometryChange } from '$lib/utils/windowControlsOverlay';

const unsubscribe = onGeometryChange((rect) => {
  console.log('Title bar changed:', rect);
  updateLayout(rect);
});

// Clean up when component unmounts
return () => unsubscribe();
```

## Svelte Integration

### Pre-built Component

Use the `WindowControlsOverlayHeader` component for a ready-made title bar:

```svelte
<script>
  import WindowControlsOverlayHeader from '$lib/components/WindowControlsOverlayHeader.svelte';
</script>

<WindowControlsOverlayHeader>
  <nav slot="nav">
    <a href="/">Home</a>
    <a href="/search">Search</a>
  </nav>
</WindowControlsOverlayHeader>
```

### Svelte Action

Use the `windowControlsOverlay` action on any element:

```svelte
<script>
  import { windowControlsOverlay } from '$lib/actions/windowControlsOverlay';
</script>

<header use:windowControlsOverlay={{ debug: true }}>
  <h1>DMB Almanac</h1>
</header>
```

### Manual Implementation

For custom title bars, use CSS env() variables directly:

```svelte
<script>
  import { onGeometryChange, getTitleBarAreaRect } from '$lib/utils/windowControlsOverlay';

  let rect = getTitleBarAreaRect();

  onGeometryChange((newRect) => {
    rect = newRect;
  });
</script>

<header style="
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 48px;
  padding-left: {rect?.x}px;
  width: {rect?.width}px;
">
  <h1>DMB Almanac</h1>
</header>
```

## Window Dragging

In window-controls-overlay mode, you can make areas draggable to move the app window (like native apps):

```svelte
<header use:windowControlsDraggable>
  <!-- This area can drag the window -->
</header>

<button use:windowControlsNoDrag>
  <!-- This button won't drag the window -->
  Click me
</button>
```

### CSS Approach

```css
.title-bar {
  -webkit-app-region: drag;
  app-region: drag;
}

.title-bar button,
.title-bar a {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}
```

## Testing

### Enable WCO in Dev Mode

Window Controls Overlay only activates when the PWA is installed. To test:

1. Build production: `npm run build && npm run preview`
2. Open Chrome DevTools → Application tab
3. Click "Install" or use the install prompt
4. Open the PWA window
5. Open DevTools → Console
6. Test utilities:

```javascript
// Check if WCO is active
navigator.windowControlsOverlay?.visible

// Get title bar area
navigator.windowControlsOverlay?.getTitlebarAreaRect()

// Check CSS env() variables
getComputedStyle(document.documentElement).getPropertyValue('--titlebar-area-width')
```

### Simulate in DevTools

Chrome DevTools can simulate WCO display mode:

1. DevTools → Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Rendering" → Enter
3. Look for "Emulate CSS media feature display-mode"
4. Select "window-controls-overlay"

### Debugging

Enable debug mode in the Svelte action:

```svelte
<header use:windowControlsOverlay={{ debug: true }}>
  <!-- Logs geometry changes to console -->
</header>
```

## CSS Layout Strategies

### Fixed Header with Geometry Awareness

```css
header {
  position: fixed;
  top: env(titlebar-area-y, 0);
  left: env(titlebar-area-x, 0);
  width: env(titlebar-area-width, 100%);
  height: env(titlebar-area-height, 48px);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  z-index: 1000;
}

main {
  margin-top: env(titlebar-area-height, 48px);
}
```

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

.spacer {
  flex: 1;
  min-width: 0;
}

/* Reserve space for window controls on right */
@media (max-width: 768px) {
  nav {
    display: none;
  }
}
```

### Fallback for Non-WCO Browsers

```css
header {
  /* Default positioning for browsers without WCO */
  position: relative;
  top: auto;
  left: auto;
  width: 100%;
  height: 56px;
}

/* Use WCO env() variables if supported */
@supports (width: env(titlebar-area-width)) {
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
```

## PWA Checklist for WCO

- [x] Web App Manifest includes `display_override: ["window-controls-overlay", ...]`
- [x] Icons are available (192x192 minimum)
- [x] Title bar area respects CSS env() variables
- [x] Interactive elements have `-webkit-app-region: no-drag`
- [x] Title bar height matches `env(titlebar-area-height)`
- [x] Main content doesn't overlap the title bar
- [x] Works on macOS and Windows
- [x] SSR-safe utility functions
- [x] Fallback styles for non-WCO browsers
- [x] Tested on Chromium 143+

## Performance Considerations

### Avoid Layout Thrashing

Don't update DOM on every geometry change event:

```typescript
// Good: Debounced updates
let updateTimeout: ReturnType<typeof setTimeout>;

onGeometryChange((rect) => {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateLayout(rect);
  }, 100);
});
```

### CSS-only Approach

Prefer CSS env() variables over TypeScript updates:

```css
/* Fast: No JavaScript needed */
header {
  width: env(titlebar-area-width, 100%);
  height: env(titlebar-area-height, 48px);
}
```

vs

```typescript
/* Slower: Requires JavaScript and layout recalc */
const rect = getTitleBarAreaRect();
element.style.width = `${rect.width}px`;
element.style.height = `${rect.height}px`;
```

## Accessibility

### Keyboard Navigation

Ensure the title bar doesn't interfere with keyboard navigation:

```css
header {
  /* Allow tabbing to elements in title bar */
  outline: none;
}

header button,
header a {
  /* Standard focus styles */
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}
```

### Screen Readers

Title bar should be properly labeled:

```html
<header role="banner" aria-label="Application header">
  <h1>DMB Almanac</h1>
  <nav aria-label="Main navigation">
    <!-- Navigation items -->
  </nav>
</header>
```

### Semantic HTML

Use proper header elements:

```html
<header>
  <h1>App Title</h1>
  <nav>Navigation</nav>
</header>

<main>
  <!-- Main content -->
</main>

<footer>
  <!-- Footer -->
</footer>
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 105+ | Yes | Full support |
| Edge 105+ | Yes | Full support |
| Firefox | No | Not implemented |
| Safari | No | Not implemented (iOS/macOS) |
| Opera | Yes | Same as Chrome |

### Feature Detection

Always use feature detection instead of browser detection:

```typescript
if (isWindowControlsOverlaySupported()) {
  // Use WCO features
} else {
  // Fallback to standard display
}
```

## References

- [MDN: Window Controls Overlay API](https://developer.mozilla.org/en-US/docs/Web/CSS/env#titlebar-area-x)
- [Web.dev: Window Controls Overlay](https://web.dev/window-controls-overlay/)
- [Chrome Platform Status](https://chromestatus.com/feature/5648177970905088)
- [CSS Working Group Draft](https://drafts.csswg.org/css-env/#titlebar-area)

## Examples

### Complete Title Bar Component

See `/src/lib/components/WindowControlsOverlayHeader.svelte` for a complete implementation.

### Using in Routes

```svelte
<!-- +layout.svelte -->
<script>
  import WindowControlsOverlayHeader from '$lib/components/WindowControlsOverlayHeader.svelte';
</script>

<WindowControlsOverlayHeader>
  <nav slot="nav">
    <a href="/">Home</a>
    <a href="/shows">Shows</a>
    <a href="/search">Search</a>
  </nav>
</WindowControlsOverlayHeader>

<main>
  <slot />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  main {
    margin-top: env(titlebar-area-height, 48px);
  }
</style>
```

## Troubleshooting

### WCO Not Activating

1. App must be installed as PWA (not in browser)
2. Browser must be Chrome/Edge 105+
3. Check manifest includes `display_override` with WCO first
4. Verify `isOverlayVisible()` returns true

### Title Bar Overlapping Content

1. Add margin/padding to main content equal to title bar height
2. Use `env(titlebar-area-height)` to calculate spacing
3. Test at different window sizes

### Window Dragging Not Working

1. Check `-webkit-app-region: drag` is set on header
2. Verify interactive elements have `-webkit-app-region: no-drag`
3. Test only works when PWA is running in standalone mode

### CSS env() Not Working

1. Check `@supports` for fallback styles
2. Verify fallback values are provided
3. Test browser supports `env()` function

## Contributing

When modifying WCO utilities:

1. Test on Chromium 143+ on macOS and Windows
2. Test in browser mode (should gracefully fall back)
3. Verify SSR safety (no window/document access in module scope)
4. Update TypeScript types if adding new functions
5. Add debug logging for troubleshooting

