# Migrate to Native Details/Summary

## Usage

```
/implement-details-migration [component-path-or-pattern]
```

Migrate custom accordion, collapsible, and disclosure widgets to native `<details>` and `<summary>` elements, reducing JavaScript while gaining built-in accessibility.

## Instructions

You are an expert frontend developer specializing in semantic HTML and accessible UI patterns. Your task is to identify collapsible content patterns and migrate them to native `<details>`/`<summary>` elements.

### Analysis Phase

1. Search for collapsible patterns:
   - Accordion components with expand/collapse
   - FAQ sections with toggle visibility
   - Collapsible sidebars or panels
   - "Read more" truncation patterns
   - Dropdown menus (non-navigation)
   - Expandable table rows
   - Toggle switches showing/hiding content

2. Identify implementation patterns:
   - State management for open/closed
   - CSS height animations
   - aria-expanded attributes
   - aria-controls relationships
   - Click handlers for toggle

### Migration Pattern

**Before (Custom Accordion):**

```html
<!-- HTML -->
<div class="accordion">
  <div class="accordion-item">
    <button
      class="accordion-header"
      aria-expanded="false"
      aria-controls="panel-1"
      onclick="toggleAccordion(this)">
      <span>Section Title</span>
      <svg class="chevron">...</svg>
    </button>
    <div class="accordion-panel" id="panel-1" hidden>
      <p>Content goes here...</p>
    </div>
  </div>
</div>

<!-- JavaScript -->
<script>
function toggleAccordion(button) {
  const expanded = button.getAttribute('aria-expanded') === 'true';
  const panel = document.getElementById(button.getAttribute('aria-controls'));

  button.setAttribute('aria-expanded', !expanded);
  panel.hidden = expanded;

  // Animate height
  if (!expanded) {
    panel.style.height = panel.scrollHeight + 'px';
  } else {
    panel.style.height = '0';
  }
}
</script>
```

```css
/* CSS */
.accordion-header {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 1rem;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
}
.accordion-panel {
  overflow: hidden;
  transition: height 200ms ease;
}
.accordion-header[aria-expanded="true"] .chevron {
  transform: rotate(180deg);
}
```

**After (Native Details/Summary):**

```html
<!-- HTML -->
<details class="accordion-item" name="faq-group">
  <summary class="accordion-header">
    <span>Section Title</span>
  </summary>
  <div class="accordion-panel">
    <p>Content goes here...</p>
  </div>
</details>
```

```css
/* CSS */
.accordion-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.accordion-header {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #f5f5f5;
  cursor: pointer;
  list-style: none; /* Remove default marker */
}

/* Custom marker */
.accordion-header::after {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 200ms ease;
}

details[open] .accordion-header::after {
  transform: rotate(-135deg);
}

/* Remove default marker in Safari */
.accordion-header::-webkit-details-marker {
  display: none;
}

/* Animate content (modern browsers) */
.accordion-panel {
  padding: 1rem;
}

/* Exclusive accordion using name attribute (Chrome 120+) */
details[name="faq-group"] {
  /* Only one can be open at a time */
}
```

**Advanced: Animated Details:**

```css
/* Smooth height animation with interpolate-size */
@supports (interpolate-size: allow-keywords) {
  details {
    interpolate-size: allow-keywords;
  }

  details .accordion-panel {
    height: 0;
    overflow: hidden;
    transition: height 300ms ease, padding 300ms ease;
  }

  details[open] .accordion-panel {
    height: auto;
    padding: 1rem;
  }
}
```

### Accessibility Benefits

- **Automatic ARIA**: Browser provides aria-expanded semantics
- **Keyboard support**: Enter/Space toggles, no JS needed
- **Screen reader announcements**: "collapsed/expanded" states announced
- **Focusable by default**: Summary is keyboard-focusable
- **Works without JavaScript**: Progressive enhancement built-in
- **Search/Find support**: Collapsed content is still searchable

### Key Features

| Feature | Description |
|---------|-------------|
| `<details open>` | Attribute to show expanded by default |
| `name="group"` | Exclusive accordion (only one open) |
| `toggle` event | Fires when open state changes |
| `::marker` | Pseudo-element for default triangle |
| `::-webkit-details-marker` | Safari marker (for hiding) |

### JavaScript Enhancement (Optional)

```javascript
// Respond to toggle events
details.addEventListener('toggle', (e) => {
  if (details.open) {
    analytics.track('accordion_opened', { section: details.id });
  }
});

// Programmatic control
details.open = true;  // Open
details.open = false; // Close

// Close all in group (pre-name attribute support)
document.querySelectorAll('details[data-group="faq"]').forEach(d => {
  if (d !== clickedDetails) d.open = false;
});
```

### Migration Checklist

- [ ] Replace accordion container with `<details>` element
- [ ] Replace header button with `<summary>` element
- [ ] Remove aria-expanded attribute (automatic)
- [ ] Remove aria-controls relationship (automatic)
- [ ] Remove toggle click handlers
- [ ] Remove hidden attribute management
- [ ] Update CSS selectors to target details/summary
- [ ] Style `::marker` or hide and create custom indicator
- [ ] Use `name` attribute for exclusive accordions
- [ ] Add `toggle` event listeners if analytics needed
- [ ] Test keyboard navigation (Enter/Space)
- [ ] Test screen reader announcements

### Common Patterns

**FAQ Section:**
```html
<section class="faq">
  <h2>Frequently Asked Questions</h2>
  <details name="faq">
    <summary>How do I reset my password?</summary>
    <p>Click the "Forgot Password" link...</p>
  </details>
  <details name="faq">
    <summary>What payment methods do you accept?</summary>
    <p>We accept Visa, Mastercard...</p>
  </details>
</section>
```

**Collapsible Sidebar:**
```html
<aside>
  <details open>
    <summary>Filters</summary>
    <form><!-- filter controls --></form>
  </details>
</aside>
```

**Read More Pattern:**
```html
<article>
  <p>First paragraph always visible...</p>
  <details>
    <summary>Read more</summary>
    <p>Additional content...</p>
  </details>
</article>
```

### Response Format

```markdown
## Details/Summary Migration Analysis

### Components Identified
- [List of accordion/collapsible implementations found]

### Code Removed
- [JavaScript toggle functions eliminated]
- [ARIA attributes no longer needed]
- [Estimated complexity reduction]

### Migration Applied
- [File]: [Changes made]

### Browser Support Notes
- [Any polyfills needed for older browsers]
- [Progressive enhancement strategy]

### Testing Recommendations
- [Keyboard and screen reader tests]
```
