# View Transitions API Implementation

## Overview

This DMB Almanac PWA implements the **View Transitions API** (Chrome 111+, enhanced in Chrome 143+) for smooth, native-like page navigation animations. All transitions run on the GPU via the Metal backend on Apple Silicon for optimal performance.

## Status

- **API Level**: Chromium 111+ (mature)
- **Chrome Version**: 143+ (current implementation)
- **Browser Support**: Chrome, Edge, Brave, Opera (not Safari/Firefox yet)
- **Fallback**: Graceful - pages load instantly without animations on unsupported browsers
- **Platform**: Optimized for macOS 26.2 + Apple Silicon (M1/M2/M3/M4)

## Features Implemented

### 1. Automatic View Transitions on Navigation
- ✅ Fade transitions (default)
- ✅ Slide-left (forward navigation)
- ✅ Slide-right (back navigation)
- ✅ Zoom-in (detail/drill-down)
- ✅ Route-specific animation configurations
- ✅ Respects `prefers-reduced-motion`

### 2. Element-Specific Animations
- ✅ Hero sections (`::view-transition-old(hero)`, `::view-transition-new(hero)`)
- ✅ Cards (`::view-transition-old(card)`, `::view-transition-new(card)`)
- ✅ Images (`::view-transition-old(image)`, `::view-transition-new(image)`)
- ✅ Visualizations (`::view-transition-old(visualization)`, `::view-transition-new(visualization)`)
- ✅ Headers (`::view-transition-old(header)`, `::view-transition-new(header)`)
- ✅ Sidebars (`::view-transition-old(sidebar)`, `::view-transition-new(sidebar)`)

### 3. Svelte Integration
- ✅ `use:viewTransition` action for elements
- ✅ `beforeNavigate` hook for automatic transitions
- ✅ TypeScript types and full JSDoc documentation
- ✅ Support for both Svelte 4 and Svelte 5 runes

### 4. Chromium 143+ Features
- ✅ `document.activeViewTransition` property (no manual tracking)
- ✅ Lifecycle events: `ready`, `finished`
- ✅ Performance measurement utilities
- ✅ Back/forward navigation detection

## File Structure

```
src/
├── lib/
│   ├── utils/
│   │   └── viewTransitions.ts           # Core API utilities
│   ├── actions/
│   │   └── viewTransition.ts            # Svelte action
│   ├── hooks/
│   │   └── viewTransitionNavigation.ts  # SvelteKit navigation integration
│   ├── motion/
│   │   └── viewTransitions.css          # Animation styles
│   └── components/
│       └── examples/
│           └── ViewTransitionExample.svelte
├── routes/
│   └── +layout.svelte                   # Global setup
└── app.css                              # Imports
```

## Usage Guide

### 1. Basic: Automatic Transitions (Recommended)

The app automatically applies transitions to all navigations. No code needed!

```typescript
// In +layout.svelte, automatically enabled via beforeNavigate hook
beforeNavigate((event) => {
  setupViewTransitionNavigation(event);
});
```

### 2. Add Transition Animation to Element

Use the `use:viewTransition` action on elements that should animate:

```svelte
<script>
  import { viewTransition } from '$lib/actions/viewTransition';
</script>

<!-- Hero section - scales and fades -->
<div use:viewTransition={{ name: 'hero' }}>
  <h1>Featured Content</h1>
</div>

<!-- Card - slides in -->
<div use:viewTransition={{ name: 'card' }} class="card">
  <p>This card animates during navigation</p>
</div>

<!-- Image - scales smoothly -->
<img
  use:viewTransition={{ name: 'image' }}
  src="concert.jpg"
  alt="Show"
/>

<!-- Visualization - fade and scale -->
<div use:viewTransition={{ name: 'visualization' }}>
  <!-- D3 chart or Svelte Recharts component -->
</div>
```

### 3. Programmatic Navigation with Transitions

```svelte
<script>
  import { navigate } from '$app/navigation';
  import { startViewTransition, transitionWithAnimation } from '$lib/utils/viewTransitions';
</script>

<!-- Simple transition -->
<button onclick={async () => {
  const transition = startViewTransition(
    async () => await navigate('/songs'),
    'slide-left' // 'fade' | 'slide-left' | 'slide-right' | 'zoom-in'
  );

  if (transition) {
    await transition.finished;
    console.log('Transition complete');
  }
}}>
  Navigate with Slide-Left
</button>

<!-- Custom animation timing -->
<button onclick={async () => {
  await transitionWithAnimation(
    async () => await navigate('/shows'),
    {
      duration: 350,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      transitionType: 'zoom-in'
    }
  );
}}>
  Navigate with Custom Animation
</button>
```

### 4. Customize Animation Duration per Route

Edit `src/lib/hooks/viewTransitionNavigation.ts`:

```typescript
export const routeTransitionMap: Map<string | RegExp, NavigationTransitionConfig> = new Map([
  // Homepage
  ['/', { enabled: true, type: 'fade', duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }],

  // Shows - drill down transition
  [/^\/shows\//, { enabled: true, type: 'zoom-in', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }],

  // Add your routes here
  // [/^\/custom-path/, { ... }]
]);
```

### 5. Conditional Transitions

```svelte
<script>
  let enableTransitions = $state(true);
</script>

<div use:viewTransition={{ name: 'card', enabled: enableTransitions }}>
  Content
</div>

<label>
  <input type="checkbox" bind:checked={enableTransitions} />
  Enable animations
</label>
```

### 6. Skip Transitions for Specific Elements

Add `view-transition-name: none` to elements that shouldn't animate (modals, overlays, etc.):

```svelte
<!-- Modal won't participate in page transition -->
<div class="modal view-transition-disabled">
  <h2>Modal Dialog</h2>
</div>
```

Or use the utility CSS class:

```css
.modal {
  view-transition-name: none;
}
```

## CSS Animation Reference

All animations are defined in `src/lib/motion/viewTransitions.css`. The animations use GPU-composited properties only (transform, opacity) for optimal performance:

### Default Animations

```css
/* Fade Transition (default) */
::view-transition-old(root) { animation-duration: 200ms; }
::view-transition-new(root) { animation-duration: 200ms; }

/* Card Transition */
::view-transition-old(card) { animation: vt-card-exit 300ms; }
::view-transition-new(card) { animation: vt-card-enter 300ms; }

/* Hero Transition */
::view-transition-old(hero) { animation: vt-hero-exit 250ms; }
::view-transition-new(hero) { animation: vt-hero-enter 250ms; }

/* Image Transition */
::view-transition-old(image) { animation: vt-scale-out 200ms; }
::view-transition-new(image) { animation: vt-scale-in 200ms; }
```

### Custom Animation

To create a custom transition, add to your component's `<style>` block:

```svelte
<style>
  :global(::view-transition-old(my-element)) {
    animation: my-exit 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  :global(::view-transition-new(my-element)) {
    animation: my-enter 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes my-exit {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.8); }
  }

  @keyframes my-enter {
    from { opacity: 0; transform: scale(1.2); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
```

## API Reference

### Utilities (`src/lib/utils/viewTransitions.ts`)

#### `isViewTransitionsSupported(): boolean`
Check if browser supports View Transitions API.

```typescript
if (isViewTransitionsSupported()) {
  console.log('View Transitions available');
}
```

#### `getActiveViewTransition(): ViewTransition | null`
Get the currently active view transition (Chrome 143+).

```typescript
const transition = getActiveViewTransition();
if (transition) {
  await transition.finished;
}
```

#### `startViewTransition(callback, transitionType?): ViewTransition | null`
Start a view transition with custom callback.

```typescript
const transition = startViewTransition(
  async () => await navigate('/page'),
  'slide-left'
);

if (transition) {
  transition.ready.then(() => console.log('Animation started'));
  await transition.finished;
}
```

#### `transitionWithAnimation(callback, options): Promise<void>`
Start transition with custom timing options.

```typescript
await transitionWithAnimation(
  async () => await navigate('/songs'),
  {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transitionType: 'zoom-in'
  }
);
```

#### `setTransitionName(element, name): void`
Manually set `view-transition-name` on element.

```typescript
const hero = document.querySelector('.hero');
setTransitionName(hero, 'hero');
```

#### `removeTransitionName(element): void`
Remove `view-transition-name` from element.

```typescript
removeTransitionName(hero);
```

#### `scrollAfterTransition(element, options): void`
Scroll to element after transition completes.

```typescript
const title = document.querySelector('h1');
scrollAfterTransition(title, { behavior: 'smooth', block: 'start' });
```

### Svelte Action (`src/lib/actions/viewTransition.ts`)

#### `use:viewTransition`

```svelte
<div use:viewTransition={{
  name: 'card',           // transition name
  enabled: true,          // optional
  class: 'transitioning'  // optional CSS class
}}>
  Content
</div>
```

**Options:**
- `name` (required): String - transition identifier
- `enabled` (optional): Boolean - enable/disable dynamically
- `class` (optional): String - CSS class to apply while transitioning

### Navigation Hook (`src/lib/hooks/viewTransitionNavigation.ts`)

#### `setupViewTransitionNavigation(event): void`
Called in `beforeNavigate` hook to setup route-based transitions.

```typescript
import { beforeNavigate } from '$app/navigation';
import { setupViewTransitionNavigation } from '$lib/hooks/viewTransitionNavigation';

beforeNavigate(setupViewTransitionNavigation);
```

#### `getTransitionConfig(pathname, previousPathname?): NavigationTransitionConfig`
Get transition configuration for a path.

```typescript
const config = getTransitionConfig('/songs/anthems');
console.log(config.type); // 'zoom-in'
console.log(config.duration); // 300
```

#### `detectNavigationDirection(fromPath, toPath): 'slide-left' | 'slide-right' | 'fade'`
Auto-detect navigation direction.

```typescript
const direction = detectNavigationDirection('/shows', '/shows/1');
// 'slide-left' (drilling down)
```

## Performance

All view transitions are GPU-accelerated on Apple Silicon via the Metal backend:

### Metrics
- **Animation Duration**: 150-300ms
- **GPU Memory**: Minimal (temporary pseudo-elements only)
- **Main Thread**: Zero blocking (runs on compositor)
- **Power Consumption**: Negligible (Metal acceleration)

### Optimization Tips

1. **Use GPU Properties Only**
   ```css
   /* Good - GPU accelerated */
   transform: scale(1.1);
   opacity: 0.8;

   /* Bad - triggers paint */
   width: 200px;
   background-color: red;
   ```

2. **Keep Animations Short**
   - 150-250ms: Quick micro-interactions
   - 250-350ms: Standard page transitions
   - Never exceed 500ms (feels sluggish)

3. **Disable for Complex Content**
   ```css
   /* Disable transitions for expensive renders */
   [data-view-transition-skip] {
     view-transition-name: none;
   }
   ```

4. **Profile with DevTools**
   - Open Chrome DevTools > Performance > Record
   - Navigate between pages
   - Check for "Long Animation Frames" (LAF)
   - Target: < 50ms frames on 120Hz display

## Accessibility

### Reduced Motion Support
Automatically disabled for users with `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
  }
}
```

### Testing
```html
<!-- Simulate reduced motion in DevTools -->
<style media="(prefers-reduced-motion: reduce)">
  * { animation-duration: 0.01ms !important; }
</style>
```

### Keyboard Navigation
View Transitions work seamlessly with keyboard navigation via `beforeNavigate` hook.

## Debugging

### Check Support
```typescript
console.log(
  'View Transitions supported:',
  document.startViewTransition !== undefined
);
```

### Measure Transition Time
```typescript
const transition = startViewTransition(callback);
transition?.finished.then(() => {
  const duration = performance.now() - startTime;
  console.log('Transition duration:', duration, 'ms');
});
```

### Enable Debug Visualization
Uncomment in `src/lib/motion/viewTransitions.css`:

```css
::view-transition-old(*),
::view-transition-new(*) {
  outline: 2px solid red;
}

::view-transition-old(*) {
  background: rgba(255, 0, 0, 0.1);
}

::view-transition-new(*) {
  background: rgba(0, 255, 0, 0.1);
}
```

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 111+ | Full support |
| Edge | 111+ | Full support |
| Brave | 1.50+ | Full support |
| Opera | 97+ | Full support |
| Safari | 18+ | Partial (limited features) |
| Firefox | — | Not supported yet |

## Related APIs

### Speculation Rules API
Complements View Transitions by prerendering pages for instant navigation:

```html
<script type="speculationrules">
{
  "prerender": [
    { "where": { "href_matches": "/songs/*" }, "eagerness": "moderate" }
  ]
}
</script>
```

### Navigation API
Provides detailed navigation state for more control:

```typescript
const result = await navigation.navigate('/shows');
// Complements View Transitions for programmatic navigation
```

### Scroll-Driven Animations
Chain scroll animations with view transitions:

```css
.hero {
  animation: parallax linear;
  animation-timeline: view();
}
```

## References

- [View Transitions API Spec](https://drafts.csswg.org/css-view-transitions-1/)
- [Chrome DevDocs: View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions/)
- [MDN: View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Chromium Blog: View Transitions](https://blog.chromium.org/2023/05/the-web-just-got-smoother.html)

## Examples

See `/src/lib/components/examples/ViewTransitionExample.svelte` for complete working examples.

## Contributing

To add new transition types:

1. Define CSS keyframes in `src/lib/motion/viewTransitions.css`
2. Add route mapping in `src/lib/hooks/viewTransitionNavigation.ts`
3. Test with `npm run dev`
4. Profile with Chrome DevTools

## License

Part of DMB Almanac PWA - Apache 2.0
