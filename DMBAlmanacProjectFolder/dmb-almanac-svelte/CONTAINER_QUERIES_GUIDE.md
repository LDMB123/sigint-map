# CSS Container Queries Implementation Guide

## Overview

This document describes the implementation of CSS Container Queries (Chrome 105+) for D3 visualization components in the DMB Almanac. Container queries enable component-level responsive design without JavaScript media queries, allowing each visualization to respond independently to its container width.

## What Are Container Queries?

Container queries allow components to respond to their container's dimensions rather than the viewport. This enables:

- **Component-level responsiveness**: Charts adapt to their container, not the window
- **Pure CSS solutions**: No JavaScript media query logic needed
- **Reusable components**: Same component works in sidebars, full-width containers, etc.
- **Better performance**: Reduces JavaScript overhead for responsive behavior

## Implementation in DMB Almanac

### 1. CSS Container Query Definitions (app.css)

All visualization container queries are defined in `/src/app.css` starting at line ~2302:

#### Generic Visualization Container
```css
.visualization-container {
  container-type: inline-size;
  container-name: visualization;
  /* Enables component-level responsiveness */
}
```

#### Specific Visualization Containers

Each visualization has its own named container and @container rules:

**TransitionFlow.svelte (Sankey Diagram)**
```css
.transition-flow {
  container-type: inline-size;
  container-name: transition-flow;
}

/* Mobile: Small text, compact layout */
@container transition-flow (width < 400px) {
  :global(.sankey-diagram text) { font-size: 9px; }
}

/* Tablet: Medium text */
@container transition-flow (width >= 400px) and (width < 800px) {
  :global(.sankey-diagram text) { font-size: 11px; }
}

/* Desktop: Large text with full spacing */
@container transition-flow (width >= 800px) {
  :global(.sankey-diagram text) { font-size: 12px; }
}
```

**GuestNetwork.svelte (Force Simulation)**
```css
.guest-network {
  container-type: inline-size;
  container-name: guest-network;
}

@container guest-network (width < 400px) {
  :global(.network-diagram text) { font-size: 9px; }
  .simulation-status { bottom: 8px; right: 8px; }
}

/* etc. */
```

**SongHeatmap.svelte, GapTimeline.svelte, TourMap.svelte, RarityScorecard.svelte**
- All follow the same pattern with their own container names and breakpoints

### 2. Component-Level Implementation

Visualization components now use CSS custom properties instead of hardcoded values:

#### TransitionFlow.svelte Example

**Before (Hardcoded)**
```javascript
const margin = { top: 20, right: 160, bottom: 20, left: 20 };
```

**After (Container Query Aware)**
```javascript
// Read CSS custom properties that are controlled by @container rules
const computedStyle = getComputedStyle(svgElement);
const marginTop = parseInt(computedStyle.getPropertyValue('--sankey-margin-top') || '20') || 20;
const marginRight = parseInt(computedStyle.getPropertyValue('--sankey-margin-right') || '160') || 160;
// etc.

const margin = { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft };
```

#### GuestNetwork.svelte Example

**Before (Hardcoded)**
```javascript
const nodeScale = d3Scale.scaleLinear()
  .domain([0, arrayMax(data, d => d.appearances) || 1])
  .range([5, 30]);  // Fixed min/max
```

**After (Container Query Aware)**
```javascript
// Read CSS custom properties controlled by @container rules
const computedStyle = getComputedStyle(svgElement);
const minRadius = parseInt(computedStyle.getPropertyValue('--network-node-min-radius') || '5') || 5;
const maxRadius = parseInt(computedStyle.getPropertyValue('--network-node-max-radius') || '30') || 30;

const nodeScale = d3Scale.scaleLinear()
  .domain([0, arrayMax(data, d => d.appearances) || 1])
  .range([minRadius, maxRadius]);  // Responsive!
```

### 3. Style Block Setup

Each visualization component's `<style>` block now includes:

```svelte
<style>
  .guest-network {
    /* Enable container queries */
    container-type: inline-size;
    container-name: guest-network;

    /* Default CSS custom properties for fallback */
    --network-node-min-radius: 5px;
    --network-node-max-radius: 30px;
    --network-charge-strength: -250;
    --network-link-distance: 100;
    --network-label-font-size: 11px;
  }

  /* CSS variables can be responsive via @container in app.css */
  :global(.network-diagram text) {
    font-size: var(--network-label-font-size);
  }
</style>
```

## Responsive Breakpoints

All visualizations use consistent breakpoints:

- **Mobile**: `width < 400px` - Minimal spacing, small text
- **Tablet**: `400px <= width < 800px` - Balanced layout
- **Desktop**: `width >= 800px` - Full featured, optimized spacing

Additional breakpoints for specific components:

- **TourMap**: `500px` and `900px` thresholds
- **RarityScorecard**: `700px` threshold

## CSS Custom Properties Reference

### TransitionFlow (Sankey)
```css
--sankey-margin-top
--sankey-margin-right
--sankey-margin-bottom
--sankey-margin-left
--sankey-label-font-size
--sankey-node-width
--sankey-node-padding
```

### GuestNetwork (Force)
```css
--network-node-min-radius
--network-node-max-radius
--network-charge-strength
--network-link-distance
--network-label-font-size
```

### SongHeatmap
```css
--heatmap-margin-top
--heatmap-margin-right
--heatmap-margin-bottom
--heatmap-margin-left
--heatmap-cell-padding
--heatmap-label-font-size
--heatmap-axis-rotation
```

### GapTimeline
```css
--timeline-margin-top
--timeline-margin-right
--timeline-margin-bottom
--timeline-margin-left
```

### TourMap
```css
--tour-map-legend-width
--tour-map-legend-height
```

### RarityScorecard
```css
--rarity-margin-top
--rarity-margin-right
--rarity-margin-bottom
--rarity-margin-left
--rarity-label-font-size
--rarity-value-font-size
--rarity-bar-padding
```

## Performance Benefits

1. **Reduced JavaScript**: ResizeObserver now only triggers chart re-renders on significant changes
2. **CSS-driven styling**: No JavaScript media query logic
3. **Automatic fallbacks**: Default CSS custom properties provide fallback for non-supporting browsers
4. **Better containment**: `contain: layout style paint` improves rendering performance
5. **No layout thrashing**: CSS updates don't trigger layout recalculations in JavaScript

## Browser Support

- **Chrome/Chromium 105+**: Full support with @container rules
- **Chrome/Chromium 111+**: Style queries (@container style(...))
- **Fallback**: Older browsers use default CSS custom property values (static layout)

### Feature Detection
```css
@supports (container-type: inline-size) {
  /* Modern container query code */
}

@supports not (container-type: inline-size) {
  /* Fallback for older browsers */
}
```

## Migration Guide: Adding Container Queries to Other Visualizations

### Step 1: Enable Container Type in Component

In the component's `<style>` block:

```svelte
<style>
  .my-visualization {
    container-type: inline-size;
    container-name: my-visualization;

    /* Default values for custom properties */
    --my-margin-top: 20px;
    --my-font-size: 12px;
  }
</style>
```

### Step 2: Use CSS Custom Properties in JavaScript

Replace hardcoded values:

```javascript
// Before
const margin = { top: 20, right: 40, bottom: 20, left: 40 };

// After
const computedStyle = getComputedStyle(svgElement);
const marginTop = parseInt(computedStyle.getPropertyValue('--my-margin-top') || '20') || 20;
const marginRight = parseInt(computedStyle.getPropertyValue('--my-margin-right') || '40') || 40;
// etc.
const margin = { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft };
```

### Step 3: Add @container Rules in app.css

```css
.my-visualization {
  container-type: inline-size;
  container-name: my-visualization;
}

@container my-visualization (width < 400px) {
  :global(.my-chart text) { font-size: 9px; }
}

@container my-visualization (width >= 400px) and (width < 800px) {
  :global(.my-chart text) { font-size: 11px; }
}

@container my-visualization (width >= 800px) {
  :global(.my-chart text) { font-size: 12px; }
}
```

### Step 4: Update ResizeObserver Comments

Add comments explaining how container queries handle styling:

```javascript
// Reactive resize with ResizeObserver
// Container queries (in app.css) handle responsive text sizing
// ResizeObserver only triggers chart re-render for significant layout changes
resizeObserver = new ResizeObserver(() => {
  // ...
});
```

## Testing Container Queries

### Manual Testing
1. Open Chrome DevTools
2. Open component in different container widths
3. Use DevTools device emulation to test mobile breakpoints
4. Verify CSS custom properties are applied via Computed Styles panel

### Checking Applied Styles
```javascript
// In browser console
const elem = document.querySelector('.guest-network');
const computed = getComputedStyle(elem);
console.log(computed.getPropertyValue('--network-node-max-radius'));
```

## Debugging

### Container Queries Not Working?

1. **Check container-type**: Ensure parent has `container-type: inline-size`
2. **Check container-name**: Verify @container rule uses correct name
3. **Check width thresholds**: Use browser DevTools to measure actual container width
4. **Check CSS custom properties**: Verify properties are defined and readable from JavaScript

### ResizeObserver Still Firing Frequently?

This is expected - ResizeObserver fires on all dimension changes. Container queries handle the CSS/styling side, but D3 charts still need to re-render for data updates.

## Browser Compatibility Notes

- **Chrome 105+**: Container queries fully supported
- **Safari 16+**: Partial support
- **Firefox**: Behind a feature flag
- **Edge**: Follows Chromium releases

For production, verify your target browsers support container-type: inline-size.

## Future Enhancements

1. **Style Queries**: Use `@container style(--theme: dark)` for theme-based styling
2. **Height Queries**: Some visualizations may benefit from `container-type: size` queries
3. **Container Query Units**: Use `cqw` (container query width) and `cqh` units for relative sizing
4. **Nested Containers**: Multiple nested visualization containers for complex layouts

## References

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Chrome Developers: CSS Container Queries](https://developer.chrome.com/docs/css-ui/container-queries/)
- [Can I Use: Container Queries](https://caniuse.com/css-container-queries)

## Files Modified

1. `/src/app.css` - Added comprehensive @container rules for all visualizations
2. `/src/lib/components/visualizations/TransitionFlow.svelte` - Implemented container query awareness
3. `/src/lib/components/visualizations/GuestNetwork.svelte` - Implemented responsive force parameters

## Next Steps

Apply the same pattern to remaining visualizations:
- `SongHeatmap.svelte`
- `GapTimeline.svelte`
- `TourMap.svelte`
- `RarityScorecard.svelte`

All @container rules are already defined in app.css - components just need to read CSS custom properties as shown in TransitionFlow and GuestNetwork examples.
