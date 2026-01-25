# Map JavaScript Patterns to Native HTML

## Usage

```
/map-js-to-native [file-path-or-pattern]
```

Analyze JavaScript/CSS patterns in the codebase and identify opportunities to replace them with native HTML elements and attributes, reducing bundle size and improving accessibility.

## Instructions

You are an expert web platform specialist with deep knowledge of modern HTML standards. Your task is to audit the codebase for JavaScript implementations that can be replaced with native HTML features.

### Pattern Mapping Reference

#### Form Validation

**JavaScript Pattern:**
```javascript
// Custom validation
form.addEventListener('submit', (e) => {
  const email = form.querySelector('[name="email"]');
  if (!email.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    e.preventDefault();
    showError(email, 'Invalid email');
  }
});
```

**Native HTML:**
```html
<input type="email" name="email" required
       pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
       title="Enter a valid email address">

<style>
input:invalid { border-color: red; }
input:valid { border-color: green; }
input:user-invalid { /* Only after interaction */ }
</style>
```

**Accessibility Benefit:** Built-in error messages, validation states exposed to assistive technology.

---

#### Color Picker

**JavaScript Pattern:**
```javascript
// Custom color picker component
import ColorPicker from 'some-color-library';
new ColorPicker('#color-input', { format: 'hex' });
```

**Native HTML:**
```html
<input type="color" id="color-input" value="#ff0000">
<datalist id="color-presets">
  <option>#ff0000</option>
  <option>#00ff00</option>
</datalist>
<input type="color" list="color-presets">
```

**Accessibility Benefit:** OS-native color picker, keyboard accessible, screen reader support.

---

#### Date/Time Pickers

**JavaScript Pattern:**
```javascript
import flatpickr from 'flatpickr';
flatpickr('#date-input', { dateFormat: 'Y-m-d' });
```

**Native HTML:**
```html
<input type="date" min="2024-01-01" max="2025-12-31">
<input type="datetime-local">
<input type="time" step="900"> <!-- 15-minute intervals -->
<input type="month">
<input type="week">
```

**Accessibility Benefit:** Native calendar widget, keyboard navigation, localized formatting.

---

#### Autocomplete/Combobox

**JavaScript Pattern:**
```javascript
// Custom autocomplete
input.addEventListener('input', async (e) => {
  const results = await fetch(`/api/search?q=${e.target.value}`);
  renderSuggestions(results);
});
```

**Native HTML:**
```html
<input type="text" list="suggestions" autocomplete="on">
<datalist id="suggestions">
  <option value="Option 1">
  <option value="Option 2">
</datalist>

<!-- Dynamic population -->
<script>
input.addEventListener('input', async (e) => {
  const results = await fetch(`/api/search?q=${e.target.value}`);
  datalist.innerHTML = results.map(r =>
    `<option value="${r.value}">`
  ).join('');
});
</script>
```

**Accessibility Benefit:** Native combobox semantics, arrow key navigation, screen reader support.

---

#### Lazy Loading Images

**JavaScript Pattern:**
```javascript
// Intersection Observer for lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.src = entry.target.dataset.src;
    }
  });
});
images.forEach(img => observer.observe(img));
```

**Native HTML:**
```html
<img src="image.jpg" loading="lazy" decoding="async">
<iframe src="embed.html" loading="lazy"></iframe>
```

**Accessibility Benefit:** No content shift from placeholder, proper image semantics maintained.

---

#### Scroll Snap

**JavaScript Pattern:**
```javascript
// Custom scroll snap with momentum
let isScrolling;
container.addEventListener('scroll', () => {
  clearTimeout(isScrolling);
  isScrolling = setTimeout(() => {
    const slideWidth = container.offsetWidth;
    const index = Math.round(container.scrollLeft / slideWidth);
    container.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
  }, 100);
});
```

**Native CSS:**
```css
.carousel {
  scroll-snap-type: x mandatory;
  overflow-x: scroll;
  scroll-behavior: smooth;
}
.carousel-item {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
```

**Accessibility Benefit:** Respects reduced-motion preferences, works with keyboard scrolling.

---

#### Popover/Tooltip

**JavaScript Pattern:**
```javascript
// Popper.js or custom positioning
import { createPopper } from '@popperjs/core';
createPopper(button, tooltip, { placement: 'top' });
```

**Native HTML (Popover API):**
```html
<button popovertarget="my-popover">Show Info</button>
<div id="my-popover" popover>
  Popover content here
</div>

<style>
[popover] {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
[popover]::backdrop {
  background: transparent;
}
</style>
```

**Accessibility Benefit:** Automatic focus management, escape to close, top-layer rendering.

---

#### Inert Content

**JavaScript Pattern:**
```javascript
// Disable all interactive elements in region
function disableRegion(element) {
  element.querySelectorAll('button, input, a').forEach(el => {
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-hidden', 'true');
    el.disabled = true;
  });
}
```

**Native HTML:**
```html
<div inert>
  <!-- All content here is non-interactive and hidden from AT -->
  <button>Cannot click or focus</button>
  <a href="#">Cannot navigate</a>
</div>
```

**Accessibility Benefit:** Properly hides from assistive technology, prevents all interaction.

---

#### Content Visibility

**JavaScript Pattern:**
```javascript
// Virtual scrolling / windowing
const visibleItems = items.slice(startIndex, endIndex);
renderOnlyVisible(visibleItems);
```

**Native CSS:**
```css
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 50px;
}
```

**Accessibility Benefit:** Content remains in DOM for screen readers, just rendering optimized.

---

#### Anchor Positioning

**JavaScript Pattern:**
```javascript
// Calculate tooltip position relative to anchor
function positionTooltip(anchor, tooltip) {
  const rect = anchor.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 8}px`;
}
```

**Native CSS (Anchor Positioning):**
```css
.anchor {
  anchor-name: --my-anchor;
}
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 8px;
}
```

**Accessibility Benefit:** Maintains relationship without JavaScript, works with zoom.

---

### Analysis Checklist

Scan the codebase for these patterns:

- [ ] Custom form validation logic
- [ ] Third-party date/color pickers
- [ ] Autocomplete implementations
- [ ] Lazy loading with Intersection Observer
- [ ] Custom scroll snap logic
- [ ] Tooltip positioning libraries
- [ ] Modal/dialog implementations
- [ ] Accordion/collapse components
- [ ] Focus trap utilities
- [ ] Custom loading spinners (vs `<progress>`)
- [ ] Range slider implementations
- [ ] Custom number steppers

### Browser Support Considerations

| Feature | Chrome | Firefox | Safari | Polyfill |
|---------|--------|---------|--------|----------|
| `<dialog>` | 37+ | 98+ | 15.4+ | dialog-polyfill |
| `<details>` | 12+ | 49+ | 6+ | None needed |
| Popover API | 114+ | 125+ | 17+ | popover-polyfill |
| `inert` | 102+ | 112+ | 15.5+ | wicg-inert |
| Anchor Positioning | 125+ | No | No | CSS Anchor Polyfill |
| `loading="lazy"` | 77+ | 75+ | 15.4+ | lazysizes |
| `content-visibility` | 85+ | 125+ | 18+ | None |

### Response Format

```markdown
## Native HTML Migration Opportunities

### High Impact (Replace Immediately)
| Pattern | Current | Native Alternative | Bundle Savings |
|---------|---------|-------------------|----------------|
| [Pattern] | [Library/Code] | [Native element] | [~XX KB] |

### Medium Impact (Good Candidates)
- [Pattern]: [Migration path]

### Low Priority (Consider for Future)
- [Pattern]: [Notes on browser support]

### Migration Plan
1. [First pattern to migrate]
2. [Second pattern]
...

### Estimated Total Savings
- JavaScript: ~XX KB
- CSS: ~XX KB
- Complexity reduction: [Description]

### Accessibility Improvements
- [List of a11y wins from migration]
```
