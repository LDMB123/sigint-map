---
title: light-dark() CSS Function
description: Automatic dark mode values without @media queries
tags: [css, chromium-143, theming, dark-mode, colors]
min_chrome_version: 143
category: CSS Functions
complexity: beginner
last_updated: 2026-01
---

# light-dark() CSS Function (Chrome 143+)

Declare light and dark variants simultaneously without separate @media queries or class selectors. Browser automatically picks the right value based on system preference or author override.

## When to Use

- **Dark mode themes** - System preference + user override
- **Color pairs** - Light text on dark, dark text on light
- **Accent colors** - Different saturation for light/dark
- **Borders and dividers** - Context-aware contrast
- **Shadows** - No shadows in dark, visibility in light
- **Any property with color values** - Backgrounds, text, borders, shadows

## Syntax

```css
property: light-dark(light-value, dark-value);
```

**Requirements:**
- Works in any CSS property accepting the given value type
- Browser respects `prefers-color-scheme` media query
- Can be overridden with `color-scheme: light | dark | light dark`

## Examples

### Basic Light/Dark Pair

```css
/* Single declaration replaces:
   @media (prefers-color-scheme: light) { color: #000; }
   @media (prefers-color-scheme: dark) { color: #fff; }
*/

body {
  background: light-dark(#ffffff, #1a1a1a);
  color: light-dark(#1a1a1a, #e0e0e0);
}

a {
  color: light-dark(#0066cc, #60a5fa);
}

/* Hover states with theme awareness */
a:hover {
  color: light-dark(#004499, #93c5fd);
}
```

### Color Scheme Declaration

```html
<!-- Tell browser to respect prefers-color-scheme -->
<!DOCTYPE html>
<html>
  <head>
    <meta name="color-scheme" content="light dark" />
  </head>
</html>
```

```css
/* Now light-dark() uses system preference */
:root {
  color-scheme: light dark;  /* Support both modes */
}

body {
  background: light-dark(#fff, #222);
  color: light-dark(#000, #fff);
}
```

### Component Theming

```css
.button {
  background: light-dark(#0066cc, #1e40af);
  color: light-dark(#ffffff, #ffffff);
  border: 1px solid light-dark(#0052a3, #1e3a8a);
}

.button:hover {
  background: light-dark(#0052a3, #1e3a8a);
}

.button:active {
  background: light-dark(#003d82, #1e40af);
}

/* Disabled state */
.button:disabled {
  background: light-dark(#e5e5e5, #404040);
  color: light-dark(#999999, #666666);
  cursor: not-allowed;
}
```

### Form Inputs

```css
input, textarea, select {
  background: light-dark(#ffffff, #2d2d2d);
  color: light-dark(#000000, #e0e0e0);
  border: 1px solid light-dark(#cccccc, #555555);
}

input:focus {
  outline: 2px solid light-dark(#0066cc, #60a5fa);
  border-color: light-dark(#0066cc, #60a5fa);
}

input::placeholder {
  color: light-dark(#999999, #888888);
}
```

### Cards and Containers

```css
.card {
  background: light-dark(#ffffff, #2d2d2d);
  border: 1px solid light-dark(#e0e0e0, #404040);
  box-shadow: light-dark(
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.3)
  );
  color: light-dark(#333333, #e0e0e0);
}

.card-header {
  background: light-dark(#f5f5f5, #1a1a1a);
  border-bottom: 1px solid light-dark(#e0e0e0, #404040);
}

.card-footer {
  border-top: 1px solid light-dark(#e0e0e0, #404040);
  background: light-dark(#fafafa, #1f1f1f);
}
```

### Breadcrumbs and Navigation

```css
.breadcrumb {
  color: light-dark(#666666, #999999);
}

.breadcrumb a {
  color: light-dark(#0066cc, #60a5fa);
}

.breadcrumb a:visited {
  color: light-dark(#8800cc, #a78bfa);
}

.breadcrumb-separator {
  color: light-dark(#cccccc, #555555);
}

nav {
  background: light-dark(#f8f8f8, #1a1a1a);
  border-bottom: 1px solid light-dark(#e0e0e0, #404040);
}

nav a {
  color: light-dark(#333333, #e0e0e0);
}

nav a:hover {
  background: light-dark(#e8e8e8, #2a2a2a);
}
```

### Code Blocks

```css
pre, code {
  background: light-dark(#f5f5f5, #2d2d2d);
  color: light-dark(#1e1e1e, #e0e0e0);
  border: 1px solid light-dark(#e0e0e0, #404040);
}

code {
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
}

/* Syntax highlighting with light-dark */
.string {
  color: light-dark(#228822, #86c77d);
}

.keyword {
  color: light-dark(#0000ff, #569cd6);
}

.comment {
  color: light-dark(#808080, #6a9955);
}

.number {
  color: light-dark(#ff6b00, #b5cea8);
}
```

### Dividers and Borders

```css
hr {
  border: none;
  height: 1px;
  background: light-dark(#e0e0e0, #404040);
}

.divider {
  background: light-dark(
    linear-gradient(to right, transparent, #ccc, transparent),
    linear-gradient(to right, transparent, #555, transparent)
  );
}

.separator {
  border-color: light-dark(#eeeeee, #333333);
}
```

### Badges and Status

```css
.badge {
  background: light-dark(#e0e0e0, #404040);
  color: light-dark(#333333, #e0e0e0);
}

.badge-success {
  background: light-dark(#d4edda, #1e4620);
  color: light-dark(#155724, #86efac);
  border: 1px solid light-dark(#c3e6cb, #166534);
}

.badge-error {
  background: light-dark(#f8d7da, #3f1f1f);
  color: light-dark(#721c24, #fca5a5);
  border: 1px solid light-dark(#f5c6cb, #7f2f2f);
}

.badge-warning {
  background: light-dark(#fff3cd, #4d3f1f);
  color: light-dark(#856404, #fde047);
  border: 1px solid light-dark(#ffeeba, #94662f);
}
```

### Tables

```css
table {
  background: light-dark(#ffffff, #2d2d2d);
  color: light-dark(#333333, #e0e0e0);
  border-collapse: collapse;
}

thead {
  background: light-dark(#f5f5f5, #1a1a1a);
}

th {
  border: 1px solid light-dark(#e0e0e0, #404040);
  padding: 0.75rem;
}

td {
  border: 1px solid light-dark(#e0e0e0, #404040);
  padding: 0.75rem;
}

tbody tr:hover {
  background: light-dark(#f9f9f9, #3a3a3a);
}
```

### Links and Visited State

```css
a {
  color: light-dark(#0066cc, #60a5fa);
  text-decoration: none;
}

a:visited {
  color: light-dark(#8800cc, #a78bfa);
}

a:hover {
  color: light-dark(#0052a3, #93c5fd);
  text-decoration: underline;
}

a:active {
  color: light-dark(#004099, #dbeafe);
}
```

### Alerts

```css
.alert {
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid;
}

.alert-info {
  background: light-dark(#d1ecf1, #0f3b44);
  color: light-dark(#0c5460, #b0e0e6);
  border-color: light-dark(#bee5eb, #1e5a66);
}

.alert-warning {
  background: light-dark(#fff3cd, #4d3f1f);
  color: light-dark(#856404, #fde047);
  border-color: light-dark(#ffeeba, #94662f);
}

.alert-danger {
  background: light-dark(#f8d7da, #3f1f1f);
  color: light-dark(#721c24, #fca5a5);
  border-color: light-dark(#f5c6cb, #7f2f2f);
}

.alert-success {
  background: light-dark(#d4edda, #1e4620);
  color: light-dark(#155724, #86efac);
  border-color: light-dark(#c3e6cb, #166534);
}
```

### Advanced: Combining with light-dark()

```css
/* Multiple light-dark() in one property */
.glass-effect {
  background: light-dark(
    rgba(255, 255, 255, 0.8),
    rgba(26, 26, 26, 0.8)
  );
  backdrop-filter: blur(10px);
  border: 1px solid light-dark(
    rgba(0, 0, 0, 0.1),
    rgba(255, 255, 255, 0.1)
  );
}

/* Gradient with theme awareness */
.gradient-bg {
  background: linear-gradient(
    135deg,
    light-dark(#667eea, #764ba2) 0%,
    light-dark(#764ba2, #f093fb) 100%
  );
}
```

### Runtime Theme Override

```typescript
// Allow user to override system preference
function forceTheme(theme: 'light' | 'dark' | 'system'): void {
  if (theme === 'system') {
    // Remove color-scheme override, use system
    document.documentElement.style.removeProperty('color-scheme');
  } else {
    // Force theme regardless of system
    document.documentElement.style.setProperty('color-scheme', theme);
  }
}

// Detect current theme
function getCurrentTheme(): 'light' | 'dark' {
  const computed = getComputedStyle(document.documentElement);
  // light-dark() resolves in computed styles
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (e.matches) {
    console.log('System switched to dark mode');
    // light-dark() automatically updates
  } else {
    console.log('System switched to light mode');
  }
});

// Theme selector UI
function setupThemeSelector(): void {
  const selector = document.querySelector('[data-theme-selector]') as HTMLSelectElement;

  selector.addEventListener('change', (e) => {
    forceTheme((e.target as HTMLSelectElement).value as 'light' | 'dark' | 'system');
  });
}
```

## Key Advantages

- **No media queries** - Single declaration handles both modes
- **No class toggling** - System preference is automatic
- **Readable** - Clear intent of light/dark values
- **Type-safe** - CSS validates both values
- **Instant updates** - color-scheme change triggers re-render
- **System respect** - Honors user's OS preference

## Comparing Approaches

| Approach | Syntaxqueries | Maintenance | Readability |
|----------|---|---|---|
| @media (prefers-color-scheme) | Verbose | Multiple blocks | Hard |
| `.dark` class | Classes on body | JS manipulation | Medium |
| `light-dark()` | Single value | Zero JS | Excellent |

## Real-World Benefits

**1. Auto-switching** - No user preference selector needed (still optional)
**2. Consistency** - All colors switch together
**3. Smaller CSS** - No duplicate rules for light/dark
**4. Performance** - No class mutations or media query re-evaluation
**5. Accessibility** - Respects user system preferences
