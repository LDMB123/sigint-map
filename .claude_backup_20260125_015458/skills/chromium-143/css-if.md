---
title: CSS if() Function
description: Conditional CSS values using native CSS if() without preprocessors
tags: [css, chromium-143, conditionals, custom-properties]
min_chrome_version: 143
category: CSS Functions
complexity: intermediate
last_updated: 2026-01
---

# CSS if() Function (Chrome 143+)

Replace JavaScript ternaries with native CSS conditionals. Eliminates class manipulation for theme switching, feature flags, and responsive behavior.

## When to Use

- **Theme switching** - light/dark/high-contrast without JS
- **Feature flags** - Enable/disable CSS based on custom properties
- **Responsive patterns** - Alternative to media queries for certain cases
- **A/B testing** - CSS variants without layout shifts
- **Configuration-driven UI** - Ship different styles in single CSS

## Syntax

```css
property: if(condition, true-value, false-value);
```

**Conditions:**
- `style(--property: value)` - Check custom property value
- `supports(property: value)` - Feature detection
- CSS expressions (Chrome 129+)

## Examples

### Basic Theme Switching

```css
/* No @media queries, no JS class toggles */
:root {
  --theme: light;  /* Toggle: light | dark | high-contrast */
  --force-dark: false;
}

body {
  background: if(
    style(--theme: dark),
    #1a1a1a,
    #ffffff
  );
  color: if(
    style(--theme: dark),
    #e0e0e0,
    #1a1a1a
  );
}

/* High contrast override */
a {
  color: if(
    style(--force-dark: true),
    #60a5fa,
    if(style(--theme: dark), #60a5fa, #0066cc)
  );
  text-decoration: if(
    style(--force-dark: true),
    underline,
    none
  );
}
```

### Component Size Variants

```css
/* Size configuration without .btn-sm, .btn-lg classes */
:root {
  --button-size: medium;  /* small | medium | large */
}

.btn {
  padding: if(
    style(--button-size: large),
    1.5rem 2rem,
    if(
      style(--button-size: small),
      0.5rem 1rem,
      1rem 1.5rem
    )
  );

  font-size: if(
    style(--button-size: large),
    1.125rem,
    if(style(--button-size: small), 0.875rem, 1rem)
  );

  border-radius: if(
    style(--button-size: large),
    0.75rem,
    0.375rem
  );
}
```

### Feature Flag CSS

```css
:root {
  --enable-animations: true;
  --enable-transitions: true;
  --compact-mode: false;
}

.card {
  /* Animations disabled in reduced-motion or via flag */
  animation: slide-in if(
    style(--enable-animations: true),
    0.3s ease-out,
    0s
  );

  /* Spacing configuration */
  gap: if(
    style(--compact-mode: true),
    0.5rem,
    1rem
  );

  /* Conditional transitions */
  transition: if(
    style(--enable-transitions: true),
    all 0.2s ease,
    none
  );
}
```

### Responsive Configuration

```css
/* Breakpoint variables as alternatives to @media */
:root {
  --layout: desktop;  /* desktop | tablet | mobile */
  --content-width: large;
}

.container {
  max-width: if(
    style(--content-width: large),
    1280px,
    if(style(--content-width: medium), 960px, 640px)
  );

  display: if(
    style(--layout: mobile),
    flex,
    grid
  );

  flex-direction: if(
    style(--layout: mobile),
    column,
    row
  );
}

.sidebar {
  display: if(
    style(--layout: desktop),
    block,
    none
  );
}
```

### Dynamic Spacing System

```css
:root {
  --spacing-scale: normal;  /* tight | normal | loose */
}

.header {
  padding: if(
    style(--spacing-scale: loose),
    3rem 2rem,
    if(
      style(--spacing-scale: tight),
      0.75rem 1rem,
      1.5rem 1rem
    )
  );
}

.section {
  margin-bottom: if(
    style(--spacing-scale: loose),
    3rem,
    if(style(--spacing-scale: tight), 1rem, 2rem)
  );
}

.element {
  gap: if(
    style(--spacing-scale: loose),
    2rem,
    if(style(--spacing-scale: tight), 0.5rem, 1rem)
  );
}
```

### Accessibility Feature Control

```css
:root {
  --prefer-serif: false;
  --increase-contrast: false;
  --larger-text: false;
}

body {
  font-family: if(
    style(--prefer-serif: true),
    Georgia, serif,
    -apple-system, BlinkMacSystemFont, sans-serif
  );

  font-size: if(
    style(--larger-text: true),
    18px,
    16px
  );

  color: if(
    style(--increase-contrast: true),
    #000000,
    #333333
  );

  background: if(
    style(--increase-contrast: true),
    #ffffff,
    #f9f9f9
  );
}

/* Increase border weight for contrast */
.button {
  border-width: if(
    style(--increase-contrast: true),
    2px,
    1px
  );

  border-color: if(
    style(--increase-contrast: true),
    currentColor,
    rgba(0, 0, 0, 0.2)
  );
}
```

### Combined with Container Queries

```css
/* Container query with if() for state-based styling */
@container (min-width: 400px) {
  .card {
    background: if(
      style(--card-variant: elevated),
      white,
      transparent
    );

    box-shadow: if(
      style(--card-variant: elevated),
      0 4px 12px rgba(0, 0, 0, 0.1),
      none
    );
  }
}
```

### Runtime Configuration (JavaScript)

```typescript
// Change theme - updates ALL CSS with if(style(--theme: dark))
function setTheme(theme: 'light' | 'dark' | 'high-contrast'): void {
  document.documentElement.style.setProperty('--theme', theme);
  // All if() conditions re-evaluate automatically
}

// Toggle feature flags
function enableAnimations(enable: boolean): void {
  document.documentElement.style.setProperty(
    '--enable-animations',
    enable ? 'true' : 'false'
  );
}

// Responsive layout updates (alternative to JS resize listeners)
function updateLayout(breakpoint: 'mobile' | 'tablet' | 'desktop'): void {
  document.documentElement.style.setProperty('--layout', breakpoint);
}

// Feature A/B test variants
function setVariant(variantName: string, value: string): void {
  document.documentElement.style.setProperty(`--variant-${variantName}`, value);
}

// Accessibility preferences
function setAccessibilityMode(mode: 'normal' | 'high-contrast' | 'dyslexia-friendly'): void {
  if (mode === 'high-contrast') {
    document.documentElement.style.setProperty('--increase-contrast', 'true');
  } else if (mode === 'dyslexia-friendly') {
    document.documentElement.style.setProperty('--prefer-serif', 'true');
  }
}

// Compact mode toggle
function setCompactMode(compact: boolean): void {
  document.documentElement.style.setProperty('--compact-mode', compact ? 'true' : 'false');
}
```

### Advanced: Nested Conditionals

```css
/* Multi-level feature detection */
.interactive-element {
  cursor: if(
    style(--interactive-enabled: true),
    if(
      style(--touch-device: true),
      pointer,
      grab
    ),
    not-allowed
  );

  opacity: if(
    style(--interactive-enabled: true),
    1,
    0.5
  );

  pointer-events: if(
    style(--interactive-enabled: true),
    auto,
    none
  );
}
```

### No JavaScript Class Manipulation

```typescript
// OLD: Class-based theme switching
// document.documentElement.classList.toggle('dark-mode');
// document.documentElement.classList.add('compact');

// NEW: Pure CSS with if()
// Just update custom properties - CSS handles the rest
document.documentElement.style.setProperty('--theme', 'dark');
document.documentElement.style.setProperty('--compact-mode', 'true');
// All if() conditions re-evaluate, layout recalculates
```

## Browser Support Detection

```typescript
// Detect CSS if() support
function supportsCSSIf(): boolean {
  const style = document.documentElement.style;
  // Try setting if() - if it sticks, browser supports it
  const testValue = 'if(style(--test: true), red, blue)';
  style.color = testValue;
  return style.color === testValue;
}

if (supportsCSSIf()) {
  console.log('Using native CSS if() conditionals');
  // Load Chromium 143+ optimized stylesheet
} else {
  console.log('CSS if() not supported - fallback to classes');
}
```

## Performance Benefits

- **No JavaScript** for theme/config switching
- **No class mutations** - CSS directly evaluates conditions
- **No layout thrashing** - if() values computed during style recalculation
- **Smaller CSS** - Single set of rules instead of multiple variants
- **Instant updates** - Custom property changes trigger immediate re-render

## Key Differences from Preprocessors

| Feature | Preprocessor (Sass) | CSS if() |
|---------|-------------------|---------|
| Evaluation | Build-time | Runtime |
| Updates | Require rebuild | Custom property change |
| Conditions | Limited | Dynamic CSS values |
| Browser-native | No | Yes |
| File size | Multiple files | Single file |

## Real-World Use Cases

**1. Multi-tenant SaaS** - Ship same CSS, different visual identities via if()
**2. White-label products** - Hundreds of brand variants without CSS rebuild
**3. A/B testing** - Run style experiments without code deployment
**4. Accessibility** - User preferences without page reload
**5. Dark mode** - System preference + user override
**6. Content management** - Editors configure UI without touching CSS
