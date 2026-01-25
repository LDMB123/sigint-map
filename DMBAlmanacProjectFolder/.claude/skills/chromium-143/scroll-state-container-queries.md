---
title: Scroll-State Container Queries
description: Style elements based on scroll state (sticky, scrollable, overflow)
tags: [chromium-143, container-queries, scroll, state]
min_chrome_version: 133
category: CSS Features
complexity: intermediate
last_updated: 2026-01
---

# Scroll-State Container Queries (Chrome 133+)

Query whether an element is scrollable, overflowing, or stuck to detect scroll state without JavaScript. Style based on container's scroll capability and position.

## When to Use

- **Scroll indicators** - Show arrow only when scrollable
- **Sticky headers** - Style based on whether stuck
- **Overflow warnings** - Alert when content overflows
- **Lazy loading** - Trigger based on scroll capability
- **Adaptive UI** - Hide controls when not needed
- **Accessibility** - Show scroll hints for non-mouse users

## Syntax

```css
@container (scroll-state: sticky-top) {
  /* Element is sticky and stuck to top */
}

@container (scroll-state: sticky-bottom) {
  /* Element is sticky and stuck to bottom */
}

@container (scroll-state: scrollable-x) {
  /* Container can scroll horizontally */
}

@container (scroll-state: scrollable-y) {
  /* Container can scroll vertically */
}

@container (scroll-state: snapped) {
  /* Container has scroll-snap-type */
}
```

## Examples

### Basic Scroll Indicators

```css
/* Only show scroll indicator when scrollable */
.container {
  container-name: scroll-container;
  container-type: inline-size;
  overflow-y: auto;
  max-height: 400px;
}

/* Arrow shown only if scrollable */
.scroll-hint::after {
  content: '';
  display: none;
}

@container scroll-container (scroll-state: scrollable-y) {
  .scroll-hint::after {
    content: '▼';
    display: block;
  }
}
```

### Sticky Headers with State

```css
.list {
  container-name: list-container;
  container-type: inline-size;
}

.list-header {
  position: sticky;
  top: 0;
  background: white;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  transition: box-shadow 0.3s;
}

/* Add shadow only when stuck */
@container list-container (scroll-state: sticky-top) {
  .list-header {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background: white;
    z-index: 10;
  }
}

/* Normal state - no shadow */
@container list-container (scroll-state: sticky-not-stuck) {
  .list-header {
    box-shadow: none;
  }
}
```

### Horizontal Scroll Container

```css
.gallery {
  container-name: gallery-scroll;
  container-type: inline-size;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  padding: 1rem;
}

.gallery-item {
  flex-shrink: 0;
  width: 300px;
  height: 200px;
}

/* Show scroll hints only when content overflows */
.scroll-indicator-left,
.scroll-indicator-right {
  display: none;
  position: fixed;
  top: 50%;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

.scroll-indicator-left {
  left: 10px;
}

.scroll-indicator-right {
  right: 10px;
}

@container gallery-scroll (scroll-state: scrollable-x) {
  .scroll-indicator-left,
  .scroll-indicator-right {
    display: flex;
  }
}
```

### Vertical List with Load More

```css
.infinite-list {
  container-name: infinite-container;
  container-type: inline-size;
  max-height: 600px;
  overflow-y: auto;
}

.infinite-list-item {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.load-more-button {
  padding: 1rem;
  width: 100%;
  background: #f5f5f5;
  border: 1px solid #ddd;
  cursor: pointer;
  text-align: center;
  display: none;
}

/* Show load more only when scrollable */
@container infinite-container (scroll-state: scrollable-y) {
  .load-more-button {
    display: block;
  }
}
```

### Tabs with Overflow Detection

```css
.tabs-container {
  container-name: tabs-scroll;
  container-type: inline-size;
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  min-width: min-content;
}

.tab {
  white-space: nowrap;
  padding: 0.75rem 1.5rem;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.tab.active {
  border-bottom-color: #0066cc;
  color: #0066cc;
}

/* Show scroll indicators when tabs overflow */
.tabs-scroll-left,
.tabs-scroll-right {
  display: none;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #ddd;
  cursor: pointer;
}

@container tabs-scroll (scroll-state: scrollable-x) {
  .tabs-scroll-left,
  .tabs-scroll-right {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

### Data Table with Horizontal Scroll

```css
.table-wrapper {
  container-name: table-container;
  container-type: inline-size;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

/* Sticky first column only if table scrolls */
th:first-child,
td:first-child {
  position: sticky;
  left: 0;
  background: white;
  z-index: 5;
}

@container table-container (scroll-state: scrollable-x) {
  th:first-child,
  td:first-child {
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  }
}
```

### Code Block with Syntax Highlighting

```css
.code-block {
  container-name: code-container;
  container-type: inline-size;
  overflow-x: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.code-block code {
  display: block;
  white-space: pre;
}

/* Add line number area only if scrollable */
.line-numbers {
  display: none;
  color: #858585;
  margin-right: 1rem;
  user-select: none;
}

@container code-container (scroll-state: scrollable-x) {
  .line-numbers {
    display: inline-block;
  }
}

/* Show copy button hint when scrollable */
.copy-button {
  opacity: 0;
  transition: opacity 0.2s;
}

@container code-container (scroll-state: scrollable-x) {
  .copy-button {
    opacity: 1;
  }
}
```

### Sidebar Navigation

```css
.sidebar {
  container-name: sidebar;
  container-type: inline-size;
  overflow-y: auto;
  max-height: 100vh;
  background: #f5f5f5;
  padding: 1rem 0;
}

.sidebar-item {
  padding: 0.75rem 1rem;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar-item:hover {
  background-color: #e8e8e8;
}

/* Add scrollbar styling hint when overflowing */
.sidebar-overlay {
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), transparent);
  pointer-events: none;
  display: none;
}

@container sidebar (scroll-state: scrollable-y) {
  .sidebar-overlay {
    display: block;
  }
}
```

### Carousel with Scroll Detection

```css
.carousel {
  container-name: carousel-scroll;
  container-type: inline-size;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
}

.carousel-item {
  flex-shrink: 0;
  width: 100%;
  scroll-snap-align: start;
}

.carousel-nav {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.carousel-button {
  padding: 0.5rem 1rem;
  background: #ddd;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

/* Hide carousel buttons if no scroll needed */
.carousel-button {
  display: none;
}

@container carousel-scroll (scroll-state: scrollable-x) {
  .carousel-button {
    display: block;
  }
}
```

### Chat Messages with Auto-scroll

```css
.messages {
  container-name: messages-scroll;
  container-type: inline-size;
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.message {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 0.5rem;
}

.message.sent {
  align-self: flex-end;
  background: #0066cc;
  color: white;
  max-width: 80%;
}

.message.received {
  align-self: flex-start;
  background: #e0e0e0;
  max-width: 80%;
}

/* Show scroll-to-bottom button only when scrolled up */
.scroll-to-bottom {
  display: none;
  position: fixed;
  bottom: 100px;
  right: 20px;
  padding: 0.75rem 1.5rem;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

@container messages-scroll (scroll-state: scrollable-y) {
  .scroll-to-bottom {
    display: flex;
  }
}
```

### Nested Scroll-State Queries

```css
.main-content {
  container-name: main;
  container-type: inline-size;
}

.sidebar-content {
  container-name: sidebar;
  container-type: inline-size;
}

/* Different styling based on container scroll state */
@container main (scroll-state: scrollable-y) {
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
  }
}

@container sidebar (scroll-state: scrollable-y) {
  .sidebar-header {
    position: sticky;
    top: 0;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
```

### Form with Overflow Detection

```css
.form {
  container-name: form-container;
  container-type: inline-size;
  max-height: 80vh;
  overflow-y: auto;
}

.form-group {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.submit-button {
  position: sticky;
  bottom: 0;
  width: 100%;
  padding: 1rem;
  background: #0066cc;
  color: white;
  border: none;
  cursor: pointer;
}

/* Add shadow to submit button when form scrolls */
@container form-container (scroll-state: scrollable-y) {
  .submit-button {
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
}
```

## JavaScript Integration

```typescript
// No JavaScript needed for basic scroll-state queries!
// But you can enhance with scroll event listeners

function setupScrollHints(containerSelector: string): void {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Optional: Add custom scroll behavior
  container.addEventListener('scroll', () => {
    // Browser already applies scroll-state queries
    console.log('Scrolling...');
  });

  // Optional: Detect scroll state manually (for logging/analytics)
  const isScrollable = container.scrollHeight > container.clientHeight;
  console.log('Is scrollable:', isScrollable);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupScrollHints('.container');
});
```

## Scroll State Values

| Value | Meaning | Use Case |
|-------|---------|----------|
| `scrollable-x` | Horizontal overflow | Galleries, tables |
| `scrollable-y` | Vertical overflow | Lists, feeds |
| `sticky-top` | Stuck to top | Headers, titles |
| `sticky-bottom` | Stuck to bottom | Footers, controls |
| `snapped` | Scroll snap active | Carousels, sections |

## Real-World Benefits

- **No JavaScript resize listeners** - CSS handles detection
- **Automatic indicators** - Show hints only when needed
- **Progressive enhancement** - Works with and without scroll
- **Accessibility** - Better UX for mouse and keyboard users
- **Performance** - No polling or event handlers

## Browser Support Detection

```typescript
function supportsScrollStateQueries(): boolean {
  try {
    // Test if browser supports scroll-state
    const style = document.createElement('style');
    style.textContent = '@container (scroll-state: scrollable-x) { }';
    document.head.appendChild(style);
    const supported = style.sheet?.cssRules.length || 0 > 0;
    document.head.removeChild(style);
    return supported;
  } catch {
    return false;
  }
}

if (supportsScrollStateQueries()) {
  console.log('Using scroll-state container queries');
} else {
  console.log('Scroll-state queries not supported - use JS fallback');
}
```
