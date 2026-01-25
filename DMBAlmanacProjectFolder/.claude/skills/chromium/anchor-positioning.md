---
id: chromium-anchor-positioning
name: CSS Anchor Positioning API (Chrome 125+)
version: 1.0.0
category: css-advanced
tags:
  - css
  - positioning
  - chrome-125+
  - tooltips
  - dropdowns
  - popovers
  - browser-native
author: CSS Anchor Positioning Specialist
created: 2026-01-21
status: production
---

# CSS Anchor Positioning API (Chrome 125+)

**Chromium 2025 Standard:** Native browser positioning for tooltips, dropdowns, and popovers. Replaces Popper.js and floating-ui entirely.

## When to Use This Skill

Use CSS Anchor Positioning for:
- **Tooltips** - Help text anchored to trigger elements
- **Dropdowns** - Menu items positioned below triggers
- **Popovers** - Info boxes positioned relative to anchors
- **Context Menus** - Right-click menus following pointer
- **Floating UI** - Any element that must position relative to another

**Replace JavaScript libraries:**
- Popper.js / @floating-ui (7-10KB gzipped)
- Tippy.js (20KB+ gzipped)
- react-popper, vue-popper
- react-tooltip, @floating-ui/react

**Don't use for:**
- Centering within containers (use CSS Grid/Flexbox)
- Fixed overlays not tied to an element (use `position: fixed`)
- Complex transforms already handled by CSS Grid

## Feature Overview

| Feature | Support | Notes |
|---------|---------|-------|
| `anchor-name` | Chrome 125+ | Define anchor points |
| `position-anchor` | Chrome 125+ | Position relative to anchor |
| `anchor()` function | Chrome 125+ | Access anchor edges/center |
| `anchor-size()` function | Chrome 125+ | Get anchor dimensions |
| `position-try-fallbacks` | Chrome 126+ | Smart fallback positioning |
| `inset-area` | Chrome 127+ (beta) | Simplified positioning preset |
| `@position-try` | Chrome 126+ | Custom fallback rules |

**Browser Support (Jan 2026):**
- Chrome 125+ ✅ Full support
- Edge 125+ ✅ Full support
- Safari 17.1+ ⚠️ Partial (basic anchor-name only)
- Firefox ❌ Not yet (experimental interest)
- Older browsers ✅ Works with `@supports` fallback

## Core Concepts

### 1. Define an Anchor Point

```css
/* Any element can be an anchor */
.trigger {
  anchor-name: --trigger;
  /* No special positioning needed */
  position: relative; /* Optional */
}

/* Multiple anchors possible */
.start-node {
  anchor-name: --start;
}

.end-node {
  anchor-name: --end;
}
```

### 2. Position an Element Relative to Anchor

```css
/* Position relative to anchor */
.tooltip {
  position: absolute;  /* Required: absolute or fixed */
  position-anchor: --trigger;

  /* Position below trigger, centered */
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0;  /* Center horizontally */
  margin-top: 8px;    /* Add spacing */
}
```

### 3. Anchor Functions

```css
.positioned {
  position-anchor: --my-anchor;

  /* Edge positioning */
  top: anchor(top);              /* Top edge of anchor */
  top: anchor(bottom);           /* Bottom edge */
  left: anchor(left);            /* Left edge */
  right: anchor(right);          /* Right edge */
  left: anchor(center);          /* Horizontal center */
  top: anchor(center);           /* Vertical center */

  /* Percentage positioning (along anchor edge) */
  left: anchor(25%);             /* 25% along horizontal edge */
  left: anchor(50%);             /* Same as anchor(center) */

  /* With offsets */
  top: calc(anchor(bottom) + 8px);
  left: calc(anchor(center) - 100px);

  /* Using anchor size */
  min-width: anchor-size(width);           /* Match anchor width */
  max-width: calc(anchor-size(width) * 1.5);
  max-height: anchor-size(height);
}
```

## Implementation Patterns

### Pattern 1: Basic Tooltip Below Trigger

```css
/* HTML Structure */
<button class="trigger">Hover me</button>
<div class="tooltip">Help text</div>

/* CSS */
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;

  /* Below, centered */
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0;
  margin-top: 8px;

  /* Styling */
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;

  /* Show only on hover */
  opacity: 0;
  transition: opacity 150ms ease;
}

.trigger:hover ~ .tooltip {
  opacity: 1;
}
```

### Pattern 2: Dropdown Menu with Smart Fallback

```css
/* HTML Structure */
<button class="menu-trigger">Menu</button>
<ul class="menu" role="menu">
  <li><a href="#">Option 1</a></li>
  <li><a href="#">Option 2</a></li>
</ul>

/* CSS */
.menu-trigger {
  anchor-name: --menu;
}

.menu {
  position: fixed;
  position-anchor: --menu;

  /* Default: below trigger */
  top: anchor(bottom);
  left: anchor(left);
  margin-top: 4px;

  /* Minimum width of trigger */
  min-width: anchor-size(width);

  /* Automatically flip up if no space */
  position-try-fallbacks: flip-block;

  /* Styling */
  list-style: none;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 4px;
}

/* When flipped to top */
@position-try --flip-block {
  bottom: anchor(top);
  top: auto;
  margin-top: 0;
  margin-bottom: 4px;
}
```

### Pattern 3: Popover with Multiple Positions

```css
/* HTML Structure */
<button class="popover-trigger">Learn more</button>
<div class="popover">
  <p>Additional information</p>
</div>

/* CSS */
.popover-trigger {
  anchor-name: --popover;
}

.popover {
  position: fixed;
  position-anchor: --popover;

  /* Default: below, centered */
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0;
  margin-top: 12px;

  /* Try flipping to top if no space */
  position-try-fallbacks: flip-block;

  /* Styling */
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  padding: 16px;
  max-width: 300px;

  /* Animation */
  animation: popoverFade 150ms ease-out;
}

@keyframes popoverFade {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Fallback for older browsers */
@supports not (position-anchor: --popover) {
  .popover {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* Would need JavaScript positioning */
  }
}
```

### Pattern 4: Inset Area (Simplified Positioning)

```css
/* Using inset-area for cleaner syntax (Chrome 127+) */
.positioned {
  position: fixed;
  position-anchor: --trigger;

  /* Position presets with auto-centering */
  inset-area: bottom;              /* Below, centered */
  inset-area: top;                 /* Above, centered */
  inset-area: left;                /* Left side, centered vertically */
  inset-area: right;               /* Right side, centered vertically */

  /* Combined positioning */
  inset-area: top center;          /* Above, centered */
  inset-area: bottom start;        /* Below, left-aligned */
  inset-area: right span-all;      /* Right side, full height */

  /* With margin for spacing */
  margin-top: 8px;

  /* Automatic fallback */
  position-try-fallbacks: flip-block;
}
```

### Pattern 5: Custom Position Fallbacks

```css
.menu {
  position: fixed;
  position-anchor: --trigger;

  /* Try fallbacks in order */
  position-try-fallbacks: --try-bottom, --try-top, --try-left;

  /* Default (inline with try-fallbacks above) */
  top: anchor(bottom);
  left: anchor(left);
}

/* Fallback 1: Try positioning above */
@position-try --try-bottom {
  top: anchor(bottom);
  left: anchor(left);
  margin-top: 8px;
}

/* Fallback 2: Try positioning to top */
@position-try --try-top {
  bottom: anchor(top);
  left: anchor(left);
  top: auto;
  margin-bottom: 8px;
}

/* Fallback 3: Try positioning to left */
@position-try --try-left {
  right: anchor(left);
  left: auto;
  top: anchor(top);
  margin-right: 8px;
}
```

## Common Use Cases

### Use Case 1: Help Icon with Tooltip

```html
<style>
  .help-icon {
    anchor-name: --help;
    cursor: help;
    display: inline-block;
    width: 20px;
    height: 20px;
  }

  .help-tooltip {
    position: absolute;
    position-anchor: --help;

    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 0;
    margin-top: 4px;

    background: #1f2937;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;

    /* Show on hover */
    display: none;
  }

  .help-icon:hover ~ .help-tooltip,
  .help-tooltip:hover {
    display: block;
  }
</style>

<span class="help-icon">?</span>
<div class="help-tooltip">Click to learn more</div>
```

### Use Case 2: Dropdown Menu with Keyboard Support

```html
<style>
  .dropdown-trigger {
    anchor-name: --dropdown;
  }

  .dropdown-menu {
    position: fixed;
    position-anchor: --dropdown;

    top: anchor(bottom);
    left: anchor(left);
    margin-top: 4px;
    min-width: anchor-size(width);

    position-try-fallbacks: flip-block;

    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    padding: 4px;
    list-style: none;
    z-index: 1000;
  }

  .dropdown-menu li {
    margin: 0;
  }

  .dropdown-menu a {
    display: block;
    padding: 8px 12px;
    text-decoration: none;
    color: #1f2937;
    transition: background-color 150ms ease;
  }

  .dropdown-menu a:hover,
  .dropdown-menu a:focus {
    background-color: #f3f4f6;
    outline: none;
  }
</style>

<button class="dropdown-trigger">Actions</button>
<ul class="dropdown-menu" role="menu">
  <li><a href="#edit" role="menuitem">Edit</a></li>
  <li><a href="#delete" role="menuitem">Delete</a></li>
</ul>
```

### Use Case 3: Info Popover on Right Side

```html
<style>
  .info-trigger {
    anchor-name: --info;
  }

  .info-popover {
    position: fixed;
    position-anchor: --info;

    /* Right of trigger, centered vertically */
    left: anchor(right);
    top: anchor(center);
    translate: 0 -50%;
    margin-left: 12px;

    /* Flip to left if no space on right */
    position-try-fallbacks: flip-inline;

    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    padding: 12px 16px;
    max-width: 250px;
    z-index: 1000;
  }

  /* Arrow pointing to trigger */
  .info-popover::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    translate: 0 -50%;

    width: 0;
    height: 0;
    border: 6px solid transparent;
    border-right-color: white;
    margin-right: -1px;
  }
</style>

<span class="info-trigger">ℹ️ Info</span>
<div class="info-popover">
  <p>Additional context information</p>
</div>
```

## Feature Detection

### JavaScript Detection

```javascript
// Detect anchor positioning support
const supportsAnchorPositioning = CSS.supports('position-anchor: --test');
const supportsFallbacks = CSS.supports('position-try-fallbacks: flip-block');
const supportsInsetArea = CSS.supports('inset-area: bottom');

console.log({
  anchorPositioning: supportsAnchorPositioning,
  fallbacks: supportsFallbacks,
  insetArea: supportsInsetArea
});
```

### CSS Feature Detection

```css
/* Apply CSS only if supported */
@supports (position-anchor: --test) {
  .tooltip {
    position-anchor: --trigger;
    top: anchor(bottom);
    left: anchor(center);
  }
}

/* Fallback for older browsers */
@supports not (position-anchor: --test) {
  .tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
  }
}
```

## Framework Integration Examples

### Vanilla JavaScript

```javascript
class Tooltip {
  constructor(trigger, content) {
    this.trigger = trigger;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.tooltip.textContent = content;
    this.tooltip.hidden = true;

    // Set anchor
    this.trigger.style.anchorName = '--tooltip-trigger';

    // Position relative to anchor
    this.tooltip.style.positionAnchor = '--tooltip-trigger';
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.top = 'anchor(bottom)';
    this.tooltip.style.left = 'anchor(center)';
    this.tooltip.style.translate = '-50% 8px';

    this.trigger.parentNode.appendChild(this.tooltip);

    // Show on hover
    this.trigger.addEventListener('mouseenter', () => this.show());
    this.trigger.addEventListener('mouseleave', () => this.hide());
  }

  show() {
    this.tooltip.hidden = false;
  }

  hide() {
    this.tooltip.hidden = true;
  }
}

// Usage
const tooltip = new Tooltip(document.querySelector('.btn'), 'Click me');
```

### React

```jsx
export function Tooltip({ children, content }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <>
      <button
        ref={triggerRef}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        style={{ anchorName: '--trigger' } as React.CSSProperties}
      >
        {children}
      </button>
      {isOpen && (
        <div
          className="tooltip"
          style={{
            positionAnchor: '--trigger',
            position: 'absolute',
            top: 'anchor(bottom)',
            left: 'anchor(center)',
            translate: '-50% 8px',
          } as React.CSSProperties}
        >
          {content}
        </div>
      )}
    </>
  );
}
```

### Vue

```vue
<template>
  <div>
    <button
      @mouseenter="isOpen = true"
      @mouseleave="isOpen = false"
      class="trigger"
    >
      <slot />
    </button>
    <div v-if="isOpen" class="tooltip">
      {{ content }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  content: String
});

const isOpen = ref(false);
</script>

<style scoped>
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 8px;
  margin-top: 8px;

  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 1000;
}
</style>
```

### Svelte

```svelte
<script>
  let isOpen = false;
  let triggerElement = $state(null);

  export let content = '';
</script>

<button
  bind:this={triggerElement}
  on:mouseenter={() => (isOpen = true)}
  on:mouseleave={() => (isOpen = false)}
  style="anchor-name: --trigger"
>
  <slot />
</button>

{#if isOpen}
  <div
    class="tooltip"
    style="position-anchor: --trigger"
  >
    {content}
  </div>
{/if}

<style>
  :global(:root) {
    --trigger: ;
  }

  button {
    anchor-name: --trigger;
  }

  .tooltip {
    position: absolute;
    position-anchor: --trigger;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 8px;
    margin-top: 8px;

    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 1000;
  }
</style>
```

## Accessibility Considerations

### ARIA and Semantics

```html
<style>
  .trigger {
    anchor-name: --trigger;
  }

  .tooltip {
    position: absolute;
    position-anchor: --trigger;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 8px;
  }
</style>

<!-- Proper ARIA for tooltip -->
<button
  aria-describedby="tooltip-1"
  class="trigger"
>
  Help
</button>

<div
  id="tooltip-1"
  role="tooltip"
  class="tooltip"
>
  This is help text
</div>
```

### Focus Management

```css
/* Ensure positioned elements don't interfere with focus */
.popover {
  position: fixed;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0;
}

.popover:focus-within {
  /* Keep focus visible when popover is focused */
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Keyboard Interaction

```javascript
// Close popover on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const popover = document.querySelector('[position-anchor]');
    popover?.remove();
  }
});

// Tab to trigger, then to popover content
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const trigger = document.querySelector('.trigger:focus');
    if (trigger) {
      // Allow focus to move to popover
      const popover = document.querySelector('[position-anchor]');
      if (popover) {
        popover.tabIndex = 0;
      }
    }
  }
});
```

## Performance Tips

1. **Use `position: fixed` for large scrolling content** - Better than `position: absolute` for viewport-relative positioning

2. **Minimize fallback positioning calculations** - Only define fallbacks you need

3. **GPU acceleration with transforms** - Use `translate` instead of `top/left`

4. **Avoid layout thrashing** - Position once during initial render

5. **Defer non-critical popovers** - Use lazy loading for off-screen elements

## Common Issues and Fixes

### Issue: Positioned Element Clipped by Parent

**Cause:** Parent has `overflow: hidden`

**Fix:**
```css
.parent {
  overflow: visible; /* Change from hidden */
}

/* Or move positioned element outside parent in DOM */
```

### Issue: Positioning Not Working

**Cause:** Missing `position: absolute` or `position: fixed`

**Fix:**
```css
.tooltip {
  position: absolute;  /* Required */
  position-anchor: --trigger;
  top: anchor(bottom);
}
```

### Issue: Element Positioned Below Page Fold

**Cause:** Fallback positioning not enabled

**Fix:**
```css
.dropdown {
  position: fixed;
  position-anchor: --trigger;

  /* Enable smart fallback */
  position-try-fallbacks: flip-block;

  /* Default position */
  top: anchor(bottom);
  left: anchor(left);
}
```

### Issue: Works in Chrome but Not Safari

**Cause:** Safari doesn't support full anchor positioning yet

**Fix:**
```css
@supports (position-anchor: --test) {
  /* Chrome 125+ code */
  .tooltip {
    position-anchor: --trigger;
  }
}

@supports not (position-anchor: --test) {
  /* Fallback for Safari */
  .tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
  }
}
```

## Browser Version Mapping

| Chrome Version | Release Date | Features |
|---|---|---|
| 125+ | Jan 2025 | anchor-name, position-anchor, anchor() |
| 126+ | Mar 2025 | position-try-fallbacks, @position-try |
| 127+ | May 2025 | inset-area (beta) |

## Related Skills

- **css-grid-flexbox** - For container positioning
- **css-transforms** - For GPU-accelerated animations
- **web-components** - For reusable positioned components
- **a11y-wai-aria** - For accessible tooltips/popovers
- **typescript-dom-apis** - For JavaScript positioning helpers

## References

- [MDN: CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning)
- [CSS Anchor Positioning Specification](https://drafts.csswg.org/css-anchor-position-1/)
- [Chrome Platform Status](https://chromestatus.com/feature/6910414233579520)
- [Can I Use: Anchor Positioning](https://caniuse.com/css-anchor-positioning)

## Summary

CSS Anchor Positioning (Chrome 125+) eliminates the need for JavaScript positioning libraries like Popper.js and Tippy.js. Use for tooltips, dropdowns, and popovers with automatic viewport collision detection. Always provide `@supports` fallbacks for older browsers.
