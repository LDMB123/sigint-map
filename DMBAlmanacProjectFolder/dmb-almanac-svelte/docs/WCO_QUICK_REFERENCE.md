# Window Controls Overlay Quick Reference

## Installation Status
- [x] Manifest configured: `display_override: ["window-controls-overlay", "standalone", "minimal-ui"]`
- [x] Utilities module: `src/lib/utils/windowControlsOverlay.ts`
- [x] Pre-built component: `src/lib/components/WindowControlsOverlayHeader.svelte`
- [x] Svelte actions: `src/lib/actions/windowControlsOverlay.ts`
- [x] Full documentation: `docs/WINDOW_CONTROLS_OVERLAY.md`
- [x] Integration examples: `docs/WCO_INTEGRATION_EXAMPLES.md`

## CSS Environment Variables

```css
/* Use in position fixed headers */
top:    env(titlebar-area-y, 0);
left:   env(titlebar-area-x, 0);
width:  env(titlebar-area-width, 100%);
height: env(titlebar-area-height, 48px);
```

## TypeScript API

### Import
```typescript
import {
  isWindowControlsOverlaySupported,
  isOverlayVisible,
  getTitleBarAreaRect,
  onGeometryChange,
  getDisplayMode,
  isInstalledWithWindowControlsOverlay
} from '$lib/utils/windowControlsOverlay';
```

### Detection
```typescript
isWindowControlsOverlaySupported()      // Browser support (Chrome 105+)
isOverlayVisible()                      // Currently active
getDisplayMode()                        // 'window-controls-overlay' | 'standalone' | 'minimal-ui' | 'browser'
isInstalledWithWindowControlsOverlay()  // Installed PWA with WCO active
```

### Geometry
```typescript
const rect = getTitleBarAreaRect();
// Returns: { x: 0, y: 0, width: 1200, height: 48 }

const unsubscribe = onGeometryChange((rect) => {
  // Called when window resizes, maximizes, etc.
  console.log('New title bar height:', rect.height);
});
unsubscribe();  // Clean up listener
```

## Svelte Components

### Pre-built Header
```svelte
<script>
  import WindowControlsOverlayHeader from '$lib/components/WindowControlsOverlayHeader.svelte';
</script>

<WindowControlsOverlayHeader>
  <nav slot="nav">
    <a href="/">Home</a>
    <a href="/shows">Shows</a>
  </nav>
</WindowControlsOverlayHeader>
```

## Svelte Actions

### Position in Title Bar
```svelte
<header use:windowControlsOverlay>
  Content here
</header>
```

### Make Draggable
```svelte
<div use:windowControlsDraggable>
  Drag to move window
</div>
```

### Prevent Dragging
```svelte
<button use:windowControlsNoDrag>
  Click me, don't drag window
</button>
```

## CSS Patterns

### Fixed Header
```css
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
```

### Window Dragging
```css
.title-bar {
  -webkit-app-region: drag;      /* macOS */
  app-region: drag;               /* Windows */
}

.title-bar button {
  -webkit-app-region: no-drag;   /* Prevent dragging from buttons */
  app-region: no-drag;
}
```

### Responsive Fallback
```css
@supports (top: env(titlebar-area-y)) {
  /* Browser supports WCO */
  header {
    position: fixed;
    top: env(titlebar-area-y, 0);
  }
}

@supports not (top: env(titlebar-area-y)) {
  /* Browser doesn't support WCO */
  header {
    position: relative;
    top: auto;
  }
}
```

## Testing Checklist

- [ ] Build: `npm run build && npm run preview`
- [ ] Install PWA from browser
- [ ] Open PWA window (full screen)
- [ ] Check DevTools Application tab shows "window-controls-overlay" display mode
- [ ] Verify title bar positions correctly
- [ ] Test window resizing - title bar responds
- [ ] Test window maximize/restore - layout adapts
- [ ] Test on macOS and Windows if possible
- [ ] Test dragging the title bar moves window
- [ ] Test clicking buttons in title bar doesn't drag window
- [ ] Test on Chromium 143+

## Console Testing

```javascript
// Check support
navigator.windowControlsOverlay?.visible
// true/false

// Get title bar dimensions
navigator.windowControlsOverlay?.getTitlebarAreaRect()
// { x: 0, y: 0, width: 1200, height: 48 }

// Check display mode
matchMedia('(display-mode: window-controls-overlay)').matches
// true/false

// View CSS env() variables
getComputedStyle(document.documentElement).getPropertyValue('--titlebar-area-width')
```

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 105+ | Full |
| Edge | 105+ | Full |
| Opera | 91+ | Full |
| Firefox | - | No |
| Safari | - | No |
| iOS Safari | - | No |

## Common Issues

### WCO not activating
- App must be installed as PWA (not just in browser)
- Browser must be Chrome/Edge 105+
- Verify manifest has `display_override`
- Check `isOverlayVisible()` returns true

### Title bar overlapping content
- Add `margin-top: env(titlebar-area-height, 48px)` to main content
- Ensure main content respects the safe area

### CSS env() not working
- Provide fallback values: `width: env(titlebar-area-width, 100%)`
- Use `@supports` for feature detection
- Check browser supports `env()` function

### Window dragging not working
- Only works when PWA is installed and in standalone mode
- Verify `-webkit-app-region: drag` is set
- Ensure interactive elements have `-webkit-app-region: no-drag`

## File Locations

- Manifest: `/static/manifest.json`
- Utils: `/src/lib/utils/windowControlsOverlay.ts`
- Component: `/src/lib/components/WindowControlsOverlayHeader.svelte`
- Actions: `/src/lib/actions/windowControlsOverlay.ts`
- Docs: `/docs/WINDOW_CONTROLS_OVERLAY.md`
- Examples: `/docs/WCO_INTEGRATION_EXAMPLES.md`
- This reference: `/docs/WCO_QUICK_REFERENCE.md`

## Next Steps

1. Choose integration method (component, action, or manual CSS)
2. Update your layout to use WCO header
3. Style to match DMB Almanac theme
4. Test on Chromium 143+ (macOS/Windows)
5. Monitor WCO adoption metrics in analytics
6. Gather user feedback on native app feel

## Resources

- [MDN: titlebar-area CSS env() variables](https://developer.mozilla.org/en-US/docs/Web/CSS/env#titlebar-area-x)
- [Web.dev: Window Controls Overlay](https://web.dev/window-controls-overlay/)
- [W3C Spec](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/TitleBarCustomization/explainer.md)
- [Chromium Status](https://chromestatus.com/feature/5648177970905088)
