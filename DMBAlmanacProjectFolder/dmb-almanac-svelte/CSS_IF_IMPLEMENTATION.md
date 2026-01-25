# CSS if() Implementation Guide - DMB Almanac

## Overview
This document outlines the implementation of CSS if() function (Chrome 143+) throughout the DMB Almanac Svelte application. CSS if() enables conditional styling based on custom CSS properties without requiring JavaScript.

## Feature Detection
CSS if() requires Chrome 143 or later. All implementations use `@supports` blocks for graceful degradation:

```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  /* Modern CSS if() syntax */
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  /* Fallback styles for older browsers */
}
```

## Implemented CSS if() Patterns

### 1. Button Component (`src/lib/components/ui/Button.svelte`)

**Pattern**: Size-responsive button padding based on `--button-size` property

```css
.button.sm {
  padding: if(style(--button-size: large), 0.5rem 1rem, var(--space-1) var(--space-3));
  font-size: if(style(--button-size: large), 0.9375rem, var(--text-sm));
  height: if(style(--button-size: large), 36px, 32px);
}
```

**Usage**: Set `--button-size: large` on any ancestor to enlarge all buttons within that scope.

**Example**:
```html
<div style="--button-size: large">
  <Button size="sm">Enlarged Small Button</Button>
</div>
```

---

### 2. Card Component (`src/lib/components/ui/Card.svelte`)

**Pattern**: Density-based card padding using `--card-density` property

```css
.padding-md {
  padding: if(style(--card-density: compact), var(--space-3), var(--space-4));
}
```

**Custom Properties**:
- `--card-density: compact` - Reduces padding/margins for dense layouts
- `--card-density: normal` - Default spacing
- `--card-density: spacious` - Increased spacing for breathable layouts

**Usage**:
```html
<div style="--card-density: compact">
  <Card padding="md">Content</Card>
</div>
```

---

### 3. Badge Component (`src/lib/components/ui/Badge.svelte`)

**Pattern**: Compact spacing for badges using `--use-compact-spacing`

```css
.badge.md {
  padding: if(style(--use-compact-spacing: true), 3px 8px, 4px 10px);
  font-size: if(style(--use-compact-spacing: true), 10px, var(--text-xs));
}
```

**Custom Properties**:
- `--use-compact-spacing: true` - Reduces badge padding and font size
- `--use-compact-spacing: false` - Default sizing

---

### 4. StatCard Component (`src/lib/components/ui/StatCard.svelte`)

**Pattern**: Multi-property conditional styling for different card densities

```css
.lg .icon-container {
  width: if(style(--card-density: compact), 48px, 64px);
  height: if(style(--card-density: compact), 48px, 64px);
}

.lg .value {
  font-size: if(style(--card-density: compact), var(--text-3xl), var(--text-4xl));
}
```

**Benefits**:
- Single custom property controls multiple CSS properties
- Eliminates need for media queries for density changes
- Works across all size variants (sm, md, lg)

---

### 5. Global Typography (`src/app.css`)

**Pattern**: Responsive heading sizes using `--theme` property

```css
h1 {
  font-size: if(style(--theme: compact), 1.875rem, 2.25rem);
  letter-spacing: if(style(--theme: compact), -0.025em, -0.05em);
}
```

**Custom Properties**:
- `--theme: compact` - Reduces heading sizes
- `--theme: normal` - Default sizing

---

### 6. Layout Direction (`src/app.css`)

**Pattern**: Conditional layout direction using `--layout` property

```css
.layout-responsive {
  flex-direction: if(style(--layout: horizontal), row, column);
}
```

---

### 7. Grid Columns (`src/app.css`)

**Pattern**: Multi-way conditional for grid column counts

```css
.grid-auto-fit {
  grid-template-columns: if(
    style(--columns: 1): 1fr;
    style(--columns: 2): repeat(2, 1fr);
    style(--columns: 3): repeat(3, 1fr);
    style(--columns: 4): repeat(4, 1fr);
    repeat(auto-fit, minmax(250px, 1fr))
  );
}
```

---

### 8. Visibility & Feature Flags (`src/app.css`)

**Pattern**: Feature toggle using custom properties

```css
[data-feature="advanced"] {
  display: if(style(--show-advanced: true), block, none);
}

[data-feature="beta"] {
  display: if(style(--show-beta: true), block, none);
}

[data-feature="experimental"] {
  opacity: if(style(--show-experimental: true), 1, 0);
  pointer-events: if(style(--show-experimental: true), auto, none);
}
```

**Usage**:
```svelte
<div style="--show-advanced: true">
  <div data-feature="advanced">Advanced Options</div>
</div>
```

---

### 9. Focus Styling (`src/app.css`)

**Pattern**: Conditional focus ring styling based on preference

```css
button:focus-visible,
a:focus-visible {
  outline-width: if(style(--focus-style: bold), 3px, 2px);
  outline-offset: if(style(--focus-style: bold), 4px, 2px);
}
```

---

### 10. Border Elevation (`src/app.css`)

**Pattern**: Multi-way conditional for border styling

```css
.card {
  border-width: if(style(--elevation: high), 2px, 1px);
  border-color: if(
    style(--elevation: high): var(--border-color-strong);
    var(--border-color)
  );
}
```

---

## CSS if() Syntax Reference

### Basic Binary Conditional
```css
property: if(style(--custom-prop: value), true-value, false-value);
```

### Multi-way Conditional
```css
property: if(
  style(--var: option1): value1;
  style(--var: option2): value2;
  style(--var: option3): value3;
  default-value
);
```

### Property Matching
The `style(--custom-prop: value)` syntax matches custom properties:
- `--custom-prop: value` - Exact match
- Works with any CSS value (numbers, colors, keywords, etc.)

---

## Available Custom Properties

### Component Density
- `--use-compact-spacing` (boolean: true/false)
- `--card-density` (keyword: compact/normal/spacious/elevated)
- `--density` (keyword: compact/normal/spacious)

### Button Sizing
- `--button-size` (keyword: small/medium/large)

### Layout
- `--layout` (keyword: horizontal/vertical)
- `--columns` (number: 1/2/3/4)
- `--gap` (keyword: sm/md/lg/xl)

### Theme
- `--theme` (keyword: compact/normal/spacious)
- `--reduced-transparency` (boolean: true/false)

### Feature Flags
- `--show-advanced` (boolean: true/false)
- `--show-beta` (boolean: true/false)
- `--show-experimental` (boolean: true/false)

### Elevation
- `--elevation` (keyword: low/normal/high)

### Focus
- `--focus-style` (keyword: normal/bold)

### Animation
- `--animations` (keyword: reduced/normal)

---

## Usage Examples

### Example 1: Compact View for Mobile
```svelte
<script>
  import { isMobile } = from '$lib/utils/device';
</script>

<div style={isMobile ? '--card-density: compact' : '--card-density: normal'}>
  <StatCard size="lg" />
  <Card padding="lg" />
</div>
```

### Example 2: Advanced Features Toggle
```svelte
<script>
  let showAdvanced = $state(false);
</script>

<div style={showAdvanced ? '--show-advanced: true' : '--show-advanced: false'}>
  <div data-feature="advanced">Advanced Options</div>
  <button onclick={() => showAdvanced = !showAdvanced}>
    Toggle Advanced
  </button>
</div>
```

### Example 3: Responsive Grid
```svelte
<div style={windowWidth < 640 ? '--columns: 1' : windowWidth < 1024 ? '--columns: 2' : '--columns: 3'}>
  {#each items as item}
    <Card class="grid-auto-fit">{item}</Card>
  {/each}
</div>
```

### Example 4: Density Control
```svelte
<div style={--card-density: compact}>
  <!-- All cards, badges, buttons inherit compact styling -->
  <Card padding="md" />
  <Badge size="md" />
  <Button size="lg" />
</div>
```

---

## Performance Benefits

1. **No JavaScript Overhead**: CSS if() evaluates purely in CSS
2. **GPU-Accelerated**: Property changes trigger GPU rendering
3. **Smooth Transitions**: Use CSS transitions with if() for smooth density changes
4. **Responsive Without Media Queries**: Eliminates breakpoint-based queries
5. **Reduced CSS Filesize**: Single rule set instead of multiple media query variants

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 143+ | Full support |
| Edge | 143+ | Full support |
| Firefox | Not yet | Not supported |
| Safari | Not yet | Not supported |

**Graceful Degradation**: All components include `@supports not` blocks for browsers without CSS if() support.

---

## Migration Path from CSS-in-JS

### Before (styled-components):
```typescript
const Button = styled.button<{ compact?: boolean }>`
  padding: ${p => p.compact ? '0.5rem 0.875rem' : '0.75rem 1.25rem'};
  font-size: ${p => p.compact ? '0.875rem' : '1rem'};
`;
```

### After (CSS if()):
```css
.button {
  padding: if(style(--use-compact-spacing: true), 0.5rem 0.875rem, 0.75rem 1.25rem);
  font-size: if(style(--use-compact-spacing: true), 0.875rem, 1rem);
}
```

```html
<div style="--use-compact-spacing: true">
  <button class="button">Compact Button</button>
</div>
```

---

## Best Practices

1. **Name Properties Clearly**: Use descriptive names like `--card-density` not `--d`
2. **Use Keywords Not Values**: Prefer `--layout: horizontal` over `--layout: 1`
3. **Provide Fallback Styles**: Always include `@supports not` blocks
4. **Document Custom Properties**: Add comments explaining valid values
5. **Scope Properties**: Set on closest relevant ancestor, not globally
6. **Leverage Cascading**: Child elements automatically inherit parent's custom properties
7. **Combine with Container Queries**: Use alongside `@container` for maximum responsiveness

---

## Future Enhancements

1. **Color Switching**: `if(style(--theme: dark), ...)` for theme switching
2. **Accessibility**: `if(style(--motion: reduced), ...)` for motion preferences
3. **Device Class**: `if(style(--device-class: phone), ...)` for adaptive UI
4. **User Preferences**: Direct CSS-based preference detection
5. **Animation Timeline**: Combine if() with scroll-driven animations

---

## Related Features

This implementation works alongside other Chrome 143+ CSS features:
- **@scope**: Component style isolation (Chrome 118+)
- **Container Queries**: Responsive components (Chrome 105+)
- **Scroll-Driven Animations**: Scroll-based animation timelines (Chrome 115+)
- **CSS Nesting**: Native selector nesting (Chrome 120+)
- **Anchor Positioning**: Tooltip/popover positioning (Chrome 125+)

---

## Testing

To test CSS if() functionality:

1. Use Chrome 143 or later
2. Open DevTools and inspect element styles
3. In Elements tab, scroll to "Styles" and look for `if()` rules
4. Modify custom properties in DevTools to see live updates:
   ```
   element.style.setProperty('--card-density', 'compact');
   ```

---

## References

- [CSS if() Specification](https://drafts.csswg.org/css-conditional-5/#conditional-functions)
- [Chrome 143 Release Notes](https://developer.chrome.com/blog/chrome-143-beta/)
- [Web.dev: CSS if() Function](https://web.dev/)

---

## Support & Troubleshooting

### CSS if() not working?
- Check Chrome version (143+)
- Verify `@supports` feature detection passes
- Ensure custom property is set on ancestor element
- Check DevTools "Computed" tab for custom property values

### Performance issues?
- Avoid rapid custom property changes in JavaScript
- Use `requestAnimationFrame` for batched updates
- Consider using CSS transitions instead of JavaScript animations

### Style conflicts?
- Use more specific selectors
- Check cascade order in stylesheet
- Verify @layer ordering in app.css
