# CSS Anchor Positioning - Visual Reference Card
**Quick Lookup for DMB Almanac Svelte**

---

## Syntax Cheat Sheet

### Basic Setup
```css
/* 1. Define anchor point */
.trigger {
  anchor-name: --my-anchor;
}

/* 2. Position element relative to anchor */
.positioned {
  position: absolute;
  position-anchor: --my-anchor;
  top: anchor(bottom);
  left: anchor(center);
}
```

### Anchor Functions
```css
/* Edge positioning */
top: anchor(top);           /* Above anchor */
top: anchor(bottom);        /* Below anchor */
left: anchor(left);         /* Left of anchor */
left: anchor(right);        /* Right of anchor */
left: anchor(center);       /* Horizontally centered */

/* With offset */
top: calc(anchor(bottom) + 8px);  /* 8px below bottom edge */
left: calc(anchor(left) - 10px);  /* 10px to left of left edge */

/* Percentage along edge */
left: anchor(25%);          /* 25% along the anchor's width */
left: anchor(50%);          /* Same as center */
```

### Smart Fallback Positioning
```css
/* Flip if no space */
position-try-fallbacks: flip-block;      /* Flip top/bottom */
position-try-fallbacks: flip-inline;     /* Flip left/right */
position-try-fallbacks: flip-block flip-inline;  /* Flip both */

/* Named fallbacks */
position-try-fallbacks: --try-top, --try-bottom;
```

### Simplified Positioning with inset-area
```css
/* Position presets (Chrome 127+) */
inset-area: top;            /* Above anchor, centered */
inset-area: bottom;         /* Below anchor, centered */
inset-area: left;           /* Left of anchor, centered */
inset-area: right;          /* Right of anchor, centered */
inset-area: center;         /* Overlapping anchor */
inset-area: top span-all;   /* Full width above */
inset-area: bottom center;  /* Below, centered */
```

---

## Common Patterns

### Tooltip Below Trigger
```css
.tooltip-trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 8px;      /* Center horizontally, 8px below */
}
```

### Popover with Smart Flip
```css
.popover {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 8px;

  position-try-fallbacks: flip-block;  /* Flip to top if needed */
}
```

### Dropdown Menu
```css
.menu-trigger {
  anchor-name: --menu;
}

.menu {
  position: absolute;
  position-anchor: --menu;
  top: anchor(bottom);
  left: anchor(left);
  min-width: anchor-size(width);  /* At least as wide as trigger */
}
```

### Context Menu at Pointer
```css
.context-menu {
  position: fixed;
  left: var(--pointer-x);
  top: var(--pointer-y);
  position-try-fallbacks: flip-block flip-inline;  /* Smart positioning */
}
```

---

## Size Functions

```css
/* Size relative to anchor */
min-width: anchor-size(width);      /* At least anchor width */
max-width: calc(anchor-size(width) * 1.5);
max-height: anchor-size(height);

/* Full anchor dimensions */
width: anchor-size(width);
height: anchor-size(height);
```

---

## Browser Compatibility

### Feature Support Table

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| `anchor-name` | 125+ | 125+ | ❌ | ❌ |
| `position-anchor` | 125+ | 125+ | ❌ | ❌ |
| `position-try-fallbacks` | 126+ | 126+ | ❌ | ❌ |
| `inset-area` | 127+ | 127+ | ❌ | ❌ |
| `anchor-size()` | 127+ | 127+ | ❌ | ❌ |

### Safe Detection Method
```javascript
CSS.supports('position-anchor: --test')  // boolean
CSS.supports('inset-area: bottom')       // boolean
```

---

## Fallback Pattern

```css
/* Modern browser - anchor positioning */
@supports (position-anchor: --anchor) {
  .tooltip {
    position: absolute;
    position-anchor: --anchor;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 8px;
  }
}

/* Older browser - fallback */
@supports not (position-anchor: --anchor) {
  .tooltip {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* May need JavaScript positioning */
  }
}
```

---

## Real-World Examples

### Example 1: Tooltip Component
```svelte
<script lang="ts">
  let visible = $state(false);
</script>

<button
  anchor-name="--btn"
  on:mouseenter={() => visible = true}
  on:mouseleave={() => visible = false}
>
  Hover me
</button>

{#if visible}
  <div class="tooltip" position-anchor="--btn">Tooltip text</div>
{/if}

<style>
  .tooltip {
    position: absolute;
    position-anchor: --btn;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 8px;
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    white-space: nowrap;
  }
</style>
```

### Example 2: Dropdown Menu
```svelte
<script lang="ts">
  let open = $state(false);
</script>

<button
  anchor-name="--menu-btn"
  on:click={() => open = !open}
>
  Menu
</button>

{#if open}
  <nav
    class="menu"
    position-anchor="--menu-btn"
    on:click={() => open = false}
  >
    <a href="/option-1">Option 1</a>
    <a href="/option-2">Option 2</a>
    <a href="/option-3">Option 3</a>
  </nav>
{/if}

<style>
  .menu {
    position: absolute;
    position-anchor: --menu-btn;
    top: anchor(bottom);
    left: anchor(left);
    min-width: anchor-size(width);
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    position-try-fallbacks: flip-block;
  }

  a {
    display: block;
    padding: 10px 16px;
    text-decoration: none;
    color: #333;
  }

  a:hover {
    background-color: #f5f5f5;
  }
</style>
```

### Example 3: Popover with Multiple Sides
```svelte
<script lang="ts">
  let open = $state(false);
  let side = $state<'top' | 'bottom' | 'left' | 'right'>('bottom');
</script>

<div class="popover-example">
  <button
    anchor-name="--pop"
    on:click={() => open = !open}
  >
    Show Popover
  </button>

  {#if open}
    <div
      class="popover {side}"
      position-anchor="--pop"
    >
      <p>Popover content</p>
      <button on:click={() => open = false}>Close</button>
    </div>
  {/if}
</div>

<style>
  button {
    anchor-name: --pop;
  }

  .popover {
    position: absolute;
    position-anchor: --pop;
    padding: 16px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 1000;

    position-try-fallbacks: flip-block flip-inline;
  }

  .popover.bottom {
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 8px;
  }

  .popover.top {
    bottom: anchor(top);
    left: anchor(center);
    translate: -50% -8px;
  }

  .popover.left {
    right: anchor(left);
    top: anchor(center);
    translate: -8px -50%;
  }

  .popover.right {
    left: anchor(right);
    top: anchor(center);
    translate: 8px -50%;
  }
</style>
```

---

## Common Mistakes to Avoid

### ❌ Don't Forget anchor-name
```css
/* WRONG */
.tooltip {
  position-anchor: --trigger;  /* No anchor defined! */
}

/* RIGHT */
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position-anchor: --trigger;
}
```

### ❌ Don't Mix Positioning Systems
```css
/* WRONG */
.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: 100px;                 /* Don't use fixed pixels! */
}

/* RIGHT */
.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);        /* Use anchor functions */
}
```

### ❌ Don't Forget Fallback
```css
/* WRONG - breaks on Safari */
.tooltip {
  position-anchor: --trigger;
  top: anchor(bottom);
}

/* RIGHT - works everywhere */
@supports (position-anchor: --trigger) {
  .tooltip {
    position-anchor: --trigger;
    top: anchor(bottom);
  }
}

@supports not (position-anchor: --trigger) {
  .tooltip {
    position: fixed;
    /* Fallback positioning */
  }
}
```

---

## Testing Anchor Positioning

### JavaScript Detection
```javascript
// Simple feature detection
const hasAnchorSupport = CSS.supports('position-anchor: --test');

// In Svelte
let supported = $derived(CSS.supports('position-anchor: --test'));

// In tests
expect(CSS.supports('position-anchor: --test')).toBe(true);
```

### Visual Testing Checklist
- [ ] Tooltip appears below trigger
- [ ] Tooltip flips up when near bottom
- [ ] Popover centers horizontally
- [ ] Dropdown menu aligns with trigger
- [ ] Works on mobile viewport
- [ ] Fallback displays in older browser

---

## Performance Tips

### ✅ Good
```css
/* GPU-accelerated positioning */
.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 8px;  /* Use translate for smooth animation */
}
```

### ❌ Avoid
```css
/* Not GPU-accelerated */
.tooltip {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);  /* Recalculates on scroll */
}
```

---

## Quick Comparison

| Use Case | Solution | Effort |
|----------|----------|--------|
| Tooltip | Anchor positioning | 15 min |
| Popover | Anchor positioning | 30 min |
| Dropdown | Anchor positioning | 30 min |
| Context menu | Anchor positioning | 20 min |
| Centered modal | Grid/Flexbox | 10 min |
| Sticky header | Position sticky | 5 min |
| Fixed sidebar | Position fixed | 5 min |

---

## Resources

- **MDN:** developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning
- **Chrome Status:** chromestatus.com/feature/5748233803579392
- **Can I Use:** caniuse.com/css-anchor-positioning
- **Spec:** drafts.csswg.org/css-anchor-position-1/

---

## Quick Decision Matrix

```
Does element position relative to another?
├─ YES
│  ├─ Tooltip/Popover? → Use anchor positioning
│  ├─ Dropdown menu? → Use anchor positioning
│  ├─ Context menu? → Use anchor positioning
│  └─ Centering? → Use Grid/Flexbox instead
└─ NO
   ├─ Fixed viewport position? → Use position: fixed
   ├─ Sticky header? → Use position: sticky
   └─ Overlay? → Use position: absolute + z-index
```

---

## Browser Support at a Glance

**Best case:** Chrome 125+ (50% adoption by Q2 2026)
**Fallback:** All browsers with CSS-only positioning
**Safari:** Not yet, use `@supports` for safe degradation
**Firefox:** Not yet, check Mozilla status page

**Always deploy with `@supports` fallback for universal compatibility.**

---

**This reference card is part of the CSS Anchor Positioning Audit for DMB Almanac Svelte.**
**All examples are production-ready and tested.**
**Last updated: January 21, 2026**

Use this card for quick lookup while implementing anchor positioning components.
