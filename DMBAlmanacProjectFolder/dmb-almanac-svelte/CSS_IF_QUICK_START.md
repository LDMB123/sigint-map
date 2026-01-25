# CSS if() Quick Start Guide

## What is CSS if()?
A Chrome 143+ CSS function that enables **conditional styling based on CSS custom properties** without JavaScript.

```css
property: if(condition, value-if-true, value-if-false);
```

## Before vs After

### ❌ Before: JavaScript Conditional Styling
```svelte
<script>
  let isCompact = true;
</script>

<div style="padding: {isCompact ? '0.5rem' : '1rem'}">
  Compact: {isCompact}
</div>
```

### ✅ After: CSS if()
```svelte
<script>
  let isCompact = true;
</script>

<div style={isCompact ? '--use-compact-spacing: true' : '--use-compact-spacing: false'}>
  Compact: {isCompact}
</div>
```

```css
div {
  padding: if(style(--use-compact-spacing: true), 0.5rem, 1rem);
}
```

## 3 Ways to Use CSS if()

### 1. Binary Condition
```css
.button {
  padding: if(style(--compact: true), 0.5rem, 1rem);
}
```

### 2. Multi-way Condition
```css
.card {
  padding: if(
    style(--density: compact): var(--space-2);
    style(--density: spacious): var(--space-6);
    var(--space-4)
  );
}
```

### 3. Feature Toggle
```css
[data-feature="advanced"] {
  display: if(style(--show-advanced: true), block, none);
}
```

## Implemented in DMB Almanac

### Button Component
```html
<div style="--button-size: large">
  <Button size="sm">Larger Button</Button>
</div>
```

### Card Component
```html
<div style="--card-density: compact">
  <Card padding="lg">Compact Spacing</Card>
</div>
```

### Badge Component
```html
<div style="--use-compact-spacing: true">
  <Badge size="md">Smaller Badge</Badge>
</div>
```

### StatCard Component
```html
<div style="--card-density: spacious">
  <StatCard size="lg">Spacious Layout</StatCard>
</div>
```

## Available Custom Properties

### Spacing & Layout
| Property | Values | Effect |
|----------|--------|--------|
| `--use-compact-spacing` | true/false | Reduce padding |
| `--card-density` | compact/normal/spacious | Card density |
| `--button-size` | medium/large | Button size |
| `--layout` | vertical/horizontal | Flex direction |
| `--columns` | 1/2/3/4 | Grid columns |

### Features & Visibility
| Property | Values | Effect |
|----------|--------|--------|
| `--show-advanced` | true/false | Show advanced |
| `--show-beta` | true/false | Show beta |
| `--show-experimental` | true/false | Show experimental |

## Real World Example

### Responsive Dashboard
```svelte
<script>
  let windowWidth = $state(0);

  $effect(() => {
    windowWidth = window.innerWidth;
  });
</script>

<div style={`
  --card-density: ${windowWidth < 640 ? 'compact' : windowWidth < 1024 ? 'normal' : 'spacious'};
  --columns: ${windowWidth < 640 ? 1 : windowWidth < 1024 ? 2 : 3};
`}>
  <!-- All cards automatically resize -->
  {#each stats as stat}
    <StatCard {...stat} />
  {/each}
</div>
```

## Feature Detection

Always use `@supports` for graceful degradation:

```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  /* Modern browsers */
  .button {
    padding: if(style(--compact: true), 0.5rem, 1rem);
  }
}

@supports not (width: if(style(--x: 1), 10px, 20px)) {
  /* Older browsers */
  .button {
    padding: 1rem;
  }
}
```

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 143+ | ✅ Full |
| Edge | 143+ | ✅ Full |
| Firefox | - | ❌ Not yet |
| Safari | - | ❌ Not yet |

## DevTools Testing

### Inspect Live
```javascript
// In Chrome 143+ console
document.documentElement.style.setProperty('--card-density', 'compact');
```

### Check Computed Styles
1. Open DevTools
2. Inspect an element
3. Scroll to Styles tab
4. Look for `if()` rules
5. Modify custom property in DevTools
6. Watch styles update instantly

## Tips & Tricks

### Tip 1: Cascade Custom Properties
```html
<!-- All children inherit custom property -->
<div style="--card-density: compact">
  <Card />
  <Card />
  <Card />
</div>
```

### Tip 2: Combine with Transitions
```css
.card {
  padding: if(style(--card-density: compact), var(--space-3), var(--space-4));
  transition: padding 300ms ease; /* Smooth transition */
}
```

### Tip 3: Use with Container Queries
```css
@container card (width < 400px) {
  :root {
    --card-density: compact;
  }
}
```

### Tip 4: Media Query + CSS if()
```css
@media (max-width: 640px) {
  :root {
    --card-density: compact;
  }
}
```

## Common Patterns

### Pattern: Mobile-Friendly Density
```svelte
<script>
  const isMobile = window.innerWidth < 640;
</script>

<div style={isMobile ? '--card-density: compact' : '--card-density: normal'}>
  <!-- Content -->
</div>
```

### Pattern: Feature Gating
```svelte
<div style={user.isPremium ? '--show-advanced: true' : '--show-advanced: false'}>
  <div data-feature="advanced">Premium feature</div>
</div>
```

### Pattern: Accessibility
```svelte
<div style={prefersReducedMotion ? '--animations: reduced' : '--animations: normal'}>
  <!-- Content -->
</div>
```

## Performance Benefits

- **No JavaScript**: CSS evaluates properties directly
- **GPU Accelerated**: Changes trigger GPU rendering
- **Instant Updates**: <1ms property evaluation
- **Smaller Bundle**: Less JavaScript code
- **Smooth Transitions**: CSS handles animations

## Troubleshooting

### Styles not applying?
- Check Chrome version (143+)
- Verify custom property on parent element
- Inspect DevTools "Computed" tab

### Fallback styles showing?
- Browser doesn't support CSS if() yet
- Check `@supports not` block exists
- Ensure fallback has proper defaults

### Transitions not smooth?
- Add `transition` property to element
- Use `transition: all 300ms ease`

## Next Steps

1. **View Demo**: Open `/components/examples/CSSIfDemo`
2. **Read Guide**: See `CSS_IF_IMPLEMENTATION.md`
3. **Add to Component**: Follow migration pattern
4. **Test**: Open DevTools and modify properties

## Resources

- **Full Guide**: `CSS_IF_IMPLEMENTATION.md`
- **Migration Details**: `CSS_IF_MIGRATION_SUMMARY.md`
- **Demo Component**: `src/lib/components/examples/CSSIfDemo.svelte`
- **MDN**: [CSS if()](https://developer.mozilla.org/en-US/docs/Web/CSS/if())
- **Chrome Docs**: https://developer.chrome.com/blog/

---

**That's it!** CSS if() is simple once you understand the basic pattern:
1. Set custom property on parent
2. Use `if()` to check value in CSS
3. Apply different styles based on value
