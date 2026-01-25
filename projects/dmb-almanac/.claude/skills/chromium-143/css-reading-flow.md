---
title: reading-flow CSS Property
description: Control focus and reading order in flex/grid layouts
tags: [chromium-143, css, layout, accessibility, focus-order]
min_chrome_version: 128
category: CSS Properties
complexity: intermediate
last_updated: 2026-01
---

# reading-flow CSS Property (Chrome 128+)

Decouple visual order from reading order. Use native CSS instead of tabindex manipulation to control how screen readers and focus navigation traverse flex/grid layouts.

## When to Use

- **Visual reordering** - Rearrange with CSS while preserving logical order
- **Screen reader optimization** - Match reading order to visual design
- **Tab navigation** - Control focus flow without JavaScript
- **Accessibility** - WCAG 2.1 Level A compliance
- **Responsive layouts** - Different logical orders at different breakpoints
- **Avoid tabindex** - No manual focus management needed

## Syntax

```css
/* Element uses default visual order */
element {
  reading-flow: normal;
}

/* Element flows first, before others */
element {
  reading-flow: first;
}

/* Element flows last, after others */
element {
  reading-flow: last;
}

/* Element flows in given visual direction */
element {
  reading-flow: grid-order;  /* Follow grid placement */
}
```

## Examples

### Basic Grid Reordering

```css
.container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.sidebar {
  order: 2;  /* Visually second (right) */
  reading-flow: first;  /* But read first (logically primary) */
}

.main {
  order: 1;  /* Visually first (left) */
  reading-flow: last;  /* But read last (logically secondary) */
}

/* Reading order: sidebar → main
   Visual order: main | sidebar
   Tab order: sidebar → main
*/
```

### Responsive Grid Layout

```css
.dashboard {
  display: grid;
  gap: 1.5rem;
}

/* Desktop: sidebar on right, read last */
@media (min-width: 1024px) {
  .dashboard {
    grid-template-columns: 1fr 300px;
  }

  .sidebar {
    order: 2;
    reading-flow: last;
  }

  .main-content {
    order: 1;
    reading-flow: first;
  }
}

/* Mobile: sidebar below, read first */
@media (max-width: 1023px) {
  .dashboard {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: 1;
    reading-flow: first;
  }

  .main-content {
    order: 2;
    reading-flow: last;
  }
}
```

### Flex Layout with Custom Order

```css
.header-nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Visually: logo | search | user menu
   But read: search | logo | user menu (for accessibility)
*/

.logo {
  order: 1;  /* Visually first */
  reading-flow: last;  /* Read last (supports context first) */
}

.search {
  order: 2;  /* Visually center */
  reading-flow: first;  /* Read first (primary interaction) */
}

.user-menu {
  order: 3;  /* Visually last */
  reading-flow: normal;  /* Read in position */
}
```

### Card Deck Layout

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Highlight featured card - visual emphasis */
.card-featured {
  grid-column: span 2;
  grid-row: span 2;
  order: 1;  /* Move to top visually */
  reading-flow: first;  /* Read first too */
}

.card {
  order: 2;  /* Regular cards after featured */
  reading-flow: normal;  /* Read in document order */
}

.card:nth-child(2) {
  reading-flow: 2;  /* Specific read position */
}
```

### Modal Dialog

```css
.modal {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}

.modal-header {
  reading-flow: first;
}

.modal-content {
  reading-flow: normal;  /* Main content read second */
}

.modal-footer {
  reading-flow: last;
}

/* Tab order: header (close) → content → footer (actions) */
```

### Sidebar + Main Content

```css
.layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
}

/* Sidebar visually on left, but read after main */
.sidebar {
  order: 1;  /* CSS order for visual layout */
  reading-flow: last;  /* Read after main content */
}

.main {
  order: 2;  /* CSS order for visual layout */
  reading-flow: first;  /* Read first (primary content) */
}

/* Screen readers hear: main content → sidebar
   Users see: sidebar | main content
*/
```

### Header / Footer Layout

```css
body {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

header {
  reading-flow: first;
}

main {
  reading-flow: normal;
}

footer {
  reading-flow: last;
}

/* Tab/reading order: header → main → footer
   Regardless of CSS positioning
*/
```

### Navigation with Secondary Menu

```css
.nav {
  display: flex;
  gap: 1rem;
}

.nav-primary {
  reading-flow: first;
}

.nav-secondary {
  margin-left: auto;  /* Visually right */
  reading-flow: last;  /* Read last */
}

/* Heading tab order:
   1. Primary navigation links
   2. Secondary navigation (search, login)
*/
```

### Tab Interface

```css
.tabbed-interface {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
}

.tab-list {
  reading-flow: first;  /* Read controls first */
}

.tab-panel {
  reading-flow: normal;  /* Then read content */
}

/* Focus order: tab controls → tab content */
```

### Form Layout with Grouped Fields

```css
.form {
  display: grid;
  gap: 1.5rem;
}

.form-group {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
  align-items: center;
}

label {
  reading-flow: first;  /* Read label first */
}

input, textarea, select {
  reading-flow: normal;  /* Then read input */
}

/* Fill order: labels → inputs (matches visual flow) */
```

### Dashboard with Emphasized Section

```css
.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  grid-auto-rows: auto;
}

/* Important section spans full width */
.highlight-section {
  grid-column: 1 / -1;
  order: 1;  /* Visually first */
  reading-flow: first;  /* Read first */
}

.section {
  order: 2;  /* Visually below highlight */
  reading-flow: normal;  /* Read in order */
}

.sidebar {
  grid-column: 1 / -1;
  order: 3;  /* Visually last */
  reading-flow: last;  /* Read last */
}
```

### Responsive Form

```css
.form-layout {
  display: grid;
  gap: 1.5rem;
}

/* Desktop: Two columns */
@media (min-width: 768px) {
  .form-layout {
    grid-template-columns: 1fr 1fr;
  }

  /* But read in form order, not column order */
  .form-field:nth-child(odd) {
    reading-flow: first;
  }

  .form-field:nth-child(even) {
    reading-flow: normal;  /* Maintains logical flow */
  }
}

/* Mobile: Single column */
@media (max-width: 767px) {
  .form-layout {
    grid-template-columns: 1fr;
  }

  .form-field {
    reading-flow: normal;  /* Flows naturally */
  }
}
```

### Search + Results Layout

```css
.search-interface {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 1rem;
}

.search-input {
  reading-flow: first;  /* Read search first */
}

.results {
  reading-flow: normal;  /* Then read results */
}

/* Users tab to search box, then through results */
```

### Breadcrumb Navigation

```css
.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-item {
  reading-flow: normal;  /* Read in order */
}

.breadcrumb-separator {
  reading-flow: normal;
  pointer-events: none;  /* Not focusable */
}

/* Screen reader: Home > Products > Electronics
   Matches visual order
*/
```

### Card Grid with Actions

```css
.card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}

.card-header {
  reading-flow: first;
}

.card-content {
  reading-flow: normal;
}

.card-actions {
  reading-flow: last;  /* Buttons read last */
}

/* Read: title → content → action buttons */
```

### Without reading-flow (Old Approach)

```html
<!-- OLD: Required tabindex manipulation -->
<div class="container">
  <aside tabindex="1">Sidebar</aside>
  <main tabindex="2">Main</main>
</div>

<!-- NEW: CSS handles it -->
<div class="container">
  <aside>Sidebar</aside>
  <main>Main</main>
</div>

<style>
  aside {
    order: 1;
    reading-flow: last;
  }

  main {
    order: 2;
    reading-flow: first;
  }
</style>
```

## JavaScript Integration (Minimal)

```typescript
// No JavaScript needed! reading-flow is pure CSS

// But you can verify it's working:
function verifyReadingOrder(): void {
  const elements = document.querySelectorAll('[style*="reading-flow"]');
  console.log(`${elements.length} elements have reading-flow defined`);

  // Test with keyboard navigation
  console.log('Press Tab to navigate - order should match reading-flow');
}

// Accessibility audit
function auditReadingOrder(): void {
  // Check if reading order matches visual order
  const visualOrder = getVisualOrder();
  const readingOrder = getReadingOrder();

  if (JSON.stringify(visualOrder) === JSON.stringify(readingOrder)) {
    console.log('Reading order matches visual order ✓');
  } else {
    console.warn('Reading order differs from visual order');
  }
}

function getVisualOrder(): string[] {
  // Implementation would inspect computed styles
  return [];
}

function getReadingOrder(): string[] {
  // Implementation would traverse tab order
  return [];
}
```

## Accessibility Testing

```typescript
// Test reading order with keyboard
function testKeyboardNavigation(): void {
  const focusable = Array.from(
    document.querySelectorAll('button, a, input, textarea, select, [tabindex]')
  );

  console.log('Tab order:');
  focusable.forEach((el, i) => {
    console.log(`${i + 1}. ${el.tagName} - ${el.textContent}`);
  });
}

// Test with screen reader (manual)
// Use NVDA (Windows) or VoiceOver (Mac) to verify reading order
// Press Tab and listen to navigation order
```

## Real-World Benefits

- **No tabindex** - CSS handles focus order
- **Responsive** - Change order per breakpoint
- **Maintainable** - Visual order separate from logical
- **Accessible** - Matches WCAG guidelines
- **Screen reader friendly** - Natural reading order
- **Keyboard navigation** - Tab follows reading order

## Comparing Approaches

| Method | Maintenance | Accessibility | Performance |
|--------|---|---|---|
| CSS order + tabindex | Hard | Medium | Good |
| reading-flow only | Easy | Excellent | Excellent |
| Flex order + no order | Hard | Poor | Good |

## Key Rules

1. **reading-flow: first** - Element read/focused first
2. **reading-flow: last** - Element read/focused last
3. **reading-flow: normal** - Default document order
4. **Combine with order** - Visual presentation separate from logic

## Real-World Use Cases

**1. Dashboard** - Main content first, sidebar last
**2. E-commerce** - Product details first, reviews second
**3. Blog** - Article first, sidebar last
**4. Documentation** - Main content first, nav last
**5. SaaS** - Primary action first, secondary actions last
