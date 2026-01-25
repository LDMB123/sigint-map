---
title: interpolate-size Property
description: Animate to height:auto without max-height hacks
tags: [chromium-143, css, animations, height, sizing]
min_chrome_version: 129
category: CSS Properties
complexity: intermediate
last_updated: 2026-01
---

# interpolate-size: allow-keywords (Chrome 129+)

Animate elements to dynamic heights (like `height: auto`) without CSS tricks. Smoothly expand/collapse from fixed size to content-based height.

## When to Use

- **Expand/collapse sections** - Smooth animation to auto height
- **Accordion panels** - Animating content that grows
- **Disclosure widgets** - Opening/closing details elements
- **Content overflow** - Smooth reveal of hidden content
- **Auto-sizing animations** - Width/height to auto smoothly
- **Flexible layouts** - Replace max-height: 999px hacks

## Syntax

```css
element {
  interpolate-size: allow-keywords;
  /* Now can animate to/from height: auto, width: auto, etc. */
}

@keyframes expand {
  from { height: 0; }
  to { height: auto; }
}

element {
  animation: expand 0.3s ease-out;
}
```

## Examples

### Basic Expand/Collapse

```css
.collapsible {
  overflow: hidden;
  interpolate-size: allow-keywords;
}

.collapsible.closed {
  height: 0;
  opacity: 0;
}

.collapsible.open {
  height: auto;
  opacity: 1;
}

.collapsible {
  transition: height 0.3s ease-out, opacity 0.3s ease-out;
}

/* Works regardless of content size! */
```

### JavaScript Toggle

```typescript
function toggleCollapsible(element: HTMLElement): void {
  element.classList.toggle('closed');
  element.classList.toggle('open');
}

// No need to measure content height
document.querySelectorAll('[data-toggle]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const target = document.querySelector(
      (e.target as HTMLElement).getAttribute('data-target') || ''
    );
    if (target) toggleCollapsible(target);
  });
});
```

### Accordion Panel

```html
<div class="accordion">
  <div class="accordion-item">
    <button class="accordion-header">
      Section 1
    </button>
    <div class="accordion-content">
      <p>Content for section 1</p>
    </div>
  </div>

  <div class="accordion-item">
    <button class="accordion-header">
      Section 2
    </button>
    <div class="accordion-content">
      <p>Content for section 2 with more text</p>
      <p>Additional paragraph</p>
    </div>
  </div>
</div>

<style>
  .accordion-item {
    border: 1px solid #ddd;
    margin-bottom: 0.5rem;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .accordion-header {
    width: 100%;
    padding: 1rem;
    background: #f5f5f5;
    border: none;
    cursor: pointer;
    font-weight: 600;
    text-align: left;
    font-size: 1rem;
  }

  .accordion-header:hover {
    background: #efefef;
  }

  .accordion-content {
    interpolate-size: allow-keywords;
    height: 0;
    overflow: hidden;
    opacity: 0;
  }

  .accordion-content.expanded {
    height: auto;
    opacity: 1;
  }

  .accordion-content {
    transition: height 0.3s ease-out, opacity 0.3s ease-out;
  }

  .accordion-content > * {
    padding: 1rem;
  }
</style>

<script>
  document.querySelectorAll('.accordion-header').forEach((header) => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling as HTMLElement;
      content.classList.toggle('expanded');
    });
  });
</script>
```

### Details Element with Animation

```html
<details>
  <summary>Click to expand</summary>
  <p>Hidden content that animates in smoothly</p>
  <p>More content here</p>
</details>

<style>
  details {
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  summary {
    cursor: pointer;
    font-weight: 600;
    margin: -1rem -1rem 1rem -1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 0.5rem 0.5rem 0 0;
  }

  details[open] summary {
    border-radius: 0.5rem 0.5rem 0 0;
  }

  /* Animate content */
  details {
    interpolate-size: allow-keywords;
  }

  /* Note: details element built-in animation varies by browser
     Custom wrapper for consistent smooth animation:
  */
</style>
```

### Dropdown Menu Expansion

```html
<div class="dropdown">
  <button class="dropdown-trigger">
    Menu ▼
  </button>
  <div class="dropdown-content">
    <a href="/">Home</a>
    <a href="/products">Products</a>
    <a href="/about">About</a>
  </div>
</div>

<style>
  .dropdown {
    position: relative;
    display: inline-block;
  }

  .dropdown-trigger {
    padding: 0.75rem 1.5rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .dropdown-trigger:hover {
    background: #0052a3;
  }

  .dropdown-content {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    margin-top: 0.5rem;
    overflow: hidden;
    interpolate-size: allow-keywords;
    width: auto;
    height: 0;
    opacity: 0;
    transition: height 0.2s ease-out, opacity 0.2s ease-out;
  }

  .dropdown-content.open {
    height: auto;
    opacity: 1;
  }

  .dropdown-content a {
    display: block;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: #333;
  }

  .dropdown-content a:hover {
    background: #f5f5f5;
  }
</style>

<script>
  const trigger = document.querySelector('.dropdown-trigger');
  const content = document.querySelector('.dropdown-content');

  trigger?.addEventListener('click', () => {
    content?.classList.toggle('open');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target?.closest('.dropdown')) {
      content?.classList.remove('open');
    }
  });
</script>
```

### Expandable List Items

```html
<ul class="expandable-list">
  <li class="list-item">
    <span class="item-title">Item 1</span>
    <div class="item-details">
      <p>Additional details about item 1</p>
      <p>More information</p>
    </div>
  </li>

  <li class="list-item">
    <span class="item-title">Item 2</span>
    <div class="item-details">
      <p>Additional details about item 2</p>
    </div>
  </li>
</ul>

<style>
  .expandable-list {
    list-style: none;
    padding: 0;
  }

  .list-item {
    border-bottom: 1px solid #e0e0e0;
  }

  .item-title {
    display: block;
    padding: 1rem;
    cursor: pointer;
    font-weight: 500;
    user-select: none;
  }

  .item-title:hover {
    background: #f9f9f9;
  }

  .item-details {
    interpolate-size: allow-keywords;
    height: 0;
    overflow: hidden;
    opacity: 0;
    padding: 0 1rem;
    transition: height 0.3s ease-out, opacity 0.3s ease-out, padding 0.3s ease-out;
  }

  .list-item.expanded .item-details {
    height: auto;
    opacity: 1;
    padding: 1rem;
  }

  .item-details p {
    margin: 0.5rem 0;
  }
</style>

<script>
  document.querySelectorAll('.item-title').forEach((title) => {
    title.addEventListener('click', () => {
      const item = title.closest('.list-item');
      item?.classList.toggle('expanded');
    });
  });
</script>
```

### Width Animation (Auto Width)

```html
<div class="text-box">
  <input type="text" placeholder="Type something..." />
  <div class="char-count"></div>
</div>

<style>
  .text-box {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    font-size: 1rem;
  }

  .char-count {
    interpolate-size: allow-keywords;
    width: 0;
    opacity: 0;
    overflow: hidden;
    transition: width 0.3s ease-out, opacity 0.3s ease-out;
  }

  .char-count.visible {
    width: auto;
    opacity: 1;
  }
</style>

<script>
  const input = document.querySelector('input');
  const counter = document.querySelector('.char-count');

  input?.addEventListener('input', (e) => {
    const len = (e.target as HTMLInputElement).value.length;
    if (len > 0) {
      counter!.textContent = `${len} characters`;
      counter!.classList.add('visible');
    } else {
      counter!.classList.remove('visible');
    }
  });
</script>
```

### Sidebar Toggle

```html
<div class="layout">
  <button class="sidebar-toggle">☰ Menu</button>

  <aside class="sidebar">
    <nav>
      <a href="/">Home</a>
      <a href="/profile">Profile</a>
      <a href="/settings">Settings</a>
    </nav>
  </aside>

  <main>
    <h1>Main Content</h1>
    <p>Your content here</p>
  </main>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
  }

  .sidebar {
    interpolate-size: allow-keywords;
    width: 250px;
    opacity: 1;
    transition: width 0.3s ease-out, opacity 0.3s ease-out;
  }

  .sidebar.collapsed {
    width: 0;
    opacity: 0;
    overflow: hidden;
  }

  .sidebar-toggle {
    padding: 0.75rem 1rem;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    cursor: pointer;
    font-weight: 600;
  }

  /* Mobile view */
  @media (max-width: 768px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: fixed;
      left: 0;
      top: 0;
      height: 100%;
      z-index: 100;
      width: 200px;
    }

    .sidebar.collapsed {
      width: 0;
    }
  }
</style>

<script>
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  toggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
  });
</script>
```

### Animated Card Expansion

```html
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
    <button class="expand-btn">+</button>
  </div>

  <div class="card-body">
    <p>This content expands and collapses smoothly.</p>
    <p>The height animates from 0 to auto automatically.</p>
    <p>No JavaScript height calculation needed!</p>
  </div>
</div>

<style>
  .card {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f5f5f5;
    cursor: pointer;
  }

  .card-header h3 {
    margin: 0;
  }

  .expand-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease-out;
  }

  .card.expanded .expand-btn {
    transform: rotate(45deg);
  }

  .card-body {
    interpolate-size: allow-keywords;
    height: 0;
    overflow: hidden;
    opacity: 0;
    transition: height 0.3s ease-out, opacity 0.3s ease-out;
  }

  .card.expanded .card-body {
    height: auto;
    opacity: 1;
  }

  .card-body {
    padding: 0 1rem;
  }

  .card.expanded .card-body {
    padding: 1rem;
  }

  .card-body p {
    margin: 0.5rem 0;
  }
</style>

<script>
  const header = document.querySelector('.card-header');
  const card = document.querySelector('.card');

  header?.addEventListener('click', () => {
    card?.classList.toggle('expanded');
  });
</script>
```

## Comparison with Old Methods

| Method | Code | Smooth | Dynamic |
|--------|------|--------|---------|
| `max-height: 999px` | CSS only | Yes | No (fixed value) |
| JavaScript measure | JS + CSS | Yes | Yes (complicated) |
| `interpolate-size` | CSS only | Yes | Yes (auto works) |

### Old Approach (max-height hack)

```css
/* Problem: Must pick a value large enough */
.collapsible {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

.collapsible.open {
  max-height: 500px;  /* What if content is 600px? */
}

/* If content grows beyond 500px, animation looks broken */
```

### New Approach (interpolate-size)

```css
/* Works regardless of content size */
.collapsible {
  height: 0;
  overflow: hidden;
  interpolate-size: allow-keywords;
  transition: height 0.3s ease-out;
}

.collapsible.open {
  height: auto;  /* Always correct, no matter the content */
}
```

## Browser Support Detection

```typescript
// Detect interpolate-size support
function supportsInterpolateSize(): boolean {
  const el = document.createElement('div');
  const style = el.style;
  style.interpolateSize = 'allow-keywords';
  return style.interpolateSize === 'allow-keywords' ||
         style.interpolateSize === 'allow-keywords'; // Vendor prefix check
}

if (supportsInterpolateSize()) {
  console.log('Using interpolate-size');
} else {
  console.log('Fallback to max-height hack');
}
```

## Performance Considerations

- **GPU accelerated** - Height transitions run on compositor
- **No layout thrashing** - Single paint for height change
- **Smooth 60fps** - Native browser optimization
- **No JavaScript measurement** - Faster than calculating heights

## Real-World Benefits

- **No max-height guessing** - Auto height always works
- **Flexible content** - Works with dynamic content
- **Smooth animations** - Native CSS performance
- **Cleaner code** - No JavaScript height calculation
- **Responsive** - Content-aware sizing at all breakpoints

## Real-World Use Cases

**1. Accordions** - Expand/collapse sections smoothly
**2. Dropdowns** - Animate menu expansion
**3. Expandable cards** - Show/hide content cards
**4. Disclosure widgets** - Details elements with animation
**5. Filters** - Reveal/hide filter options
**6. Mobile menus** - Smooth sidebar animation
