---
name: logical-properties
version: 1.0.0
description: For the DMB Almanac Svelte project (Chrome 143+)
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: scraping
complexity: intermediate
tags:
  - scraping
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/LOGICAL_PROPERTIES_GUIDE.md
migration_date: 2026-01-25
---

# CSS Logical Properties Quick Reference Guide

For the DMB Almanac Svelte project (Chrome 143+)

## Physical vs Logical Properties

### Margins
```css
/* BEFORE - Physical (directional) */
margin-left: 1rem;
margin-right: 1rem;
margin-top: 0.5rem;
margin-bottom: 0.5rem;

/* AFTER - Logical (flow-relative) */
margin-inline-start: 1rem;  /* Start of inline direction (left in LTR, right in RTL) */
margin-inline-end: 1rem;    /* End of inline direction (right in LTR, left in RTL) */
margin-block-start: 0.5rem; /* Start of block direction (top) */
margin-block-end: 0.5rem;   /* End of block direction (bottom) */

/* SHORTHAND */
margin-inline: 1rem;        /* Sets both start and end */
margin-block: 0.5rem;       /* Sets both start and end */
```

### Padding
```css
/* BEFORE */
padding-left: 1.5rem;
padding-right: 1.5rem;
padding-top: 1rem;
padding-bottom: 1rem;

/* AFTER */
padding-inline-start: 1.5rem;
padding-inline-end: 1.5rem;
padding-block-start: 1rem;
padding-block-end: 1rem;

/* SHORTHAND */
padding-inline: 1.5rem;
padding-block: 1rem;
```

### Positioning
```css
/* BEFORE */
position: absolute;
top: 0;
left: 0;
right: 100px;
bottom: 50%;

/* AFTER */
position: absolute;
inset-block-start: 0;        /* top */
inset-inline-start: 0;       /* left in LTR */
inset-inline-end: 100px;     /* right in LTR */
inset-block-end: 50%;        /* bottom */

/* SHORTHAND - Full coverage */
position: absolute;
inset: 0;  /* Sets all four sides to 0 */

/* SHORTHAND - Opposite sides */
position: absolute;
inset-inline: 0;  /* Sets left and right to 0 */
inset-block: 10px; /* Sets top and bottom to 10px */
```

### Borders
```css
/* BEFORE */
border-left: 1px solid #ccc;
border-right: 1px solid #ccc;
border-top: 2px solid #000;
border-bottom: 2px solid #000;

/* AFTER */
border-inline-start: 1px solid #ccc;
border-inline-end: 1px solid #ccc;
border-block-start: 2px solid #000;
border-block-end: 2px solid #000;

/* SHORTHAND */
border-inline: 1px solid #ccc;
border-block: 2px solid #000;
```

---

## Practical Examples from DMB Almanac

### Example 1: Container Centering
```css
/* BEFORE */
.container {
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

/* AFTER */
.container {
  margin-inline: auto;
  padding-inline: 1rem;
}
```

### Example 2: Modal Fullscreen Overlay
```css
/* BEFORE */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* AFTER */
.modal {
  position: fixed;
  inset: 0;
}
```

### Example 3: Skip Link Positioning
```css
/* BEFORE */
.skip-link {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
}

.skip-link:focus {
  top: 0.5rem;
}

/* AFTER */
.skip-link {
  position: absolute;
  inset-block-start: -100px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
}

.skip-link:focus {
  inset-block-start: 0.5rem;
}
```

### Example 4: Form Labels
```css
/* BEFORE */
label[for] {
  padding-right: 0.5rem;
}

input[type="checkbox"],
input[type="radio"] {
  margin-right: 0.5rem;
}

/* AFTER */
label[for] {
  padding-inline-end: 0.5rem;
}

input[type="checkbox"],
input[type="radio"] {
  margin-inline-end: 0.5rem;
}
```

### Example 5: Navigation Underline
```css
/* BEFORE */
a.active::after {
  position: absolute;
  bottom: 0;
  left: 1rem;
  right: 1rem;
}

/* AFTER */
a.active::after {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 1rem;
}
```

---

## When to Use Each Type

### Use `block` properties for:
- Vertical spacing (top/bottom)
- Vertical positioning
- Vertical margins and padding
- Vertical borders
- Elements that stack vertically

### Use `inline` properties for:
- Horizontal spacing (left/right)
- Horizontal positioning
- Horizontal margins and padding
- Horizontal borders
- Text direction-aware spacing

### Use `inset` shorthand for:
- Elements with `position: absolute` or `position: fixed`
- Full coverage (all four sides): `inset: 0;`
- Opposite sides: `inset-inline: 0;` or `inset-block: 10px;`

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 93+ | Full |
| Firefox | 91+ | Full |
| Safari | 15+ | Full |
| Edge | 93+ | Full |

**DMB Almanac Target:** Chrome 143+ ✓

---

## Internationalization Benefits

### English (LTR - Left to Right)
```
Text flows: → (left to right)
margin-inline-start → left side
margin-inline-end → right side
```

### Arabic/Hebrew (RTL - Right to Left)
```
Text flows: ← (right to left)
margin-inline-start → right side (automatic!)
margin-inline-end → left side (automatic!)
```

**With logical properties, the same CSS code works for both!**

---

## Common Mistakes to Avoid

### ❌ DON'T: Mix physical and logical
```css
.element {
  margin-left: 1rem;        /* Physical */
  margin-inline-end: 1rem;  /* Logical - INCONSISTENT */
}
```

### ✓ DO: Keep it consistent
```css
.element {
  margin-inline-start: 1rem;
  margin-inline-end: 1rem;
  /* OR shorthand: */
  margin-inline: 1rem;
}
```

### ❌ DON'T: Use `inset` with `width/height`
```css
.element {
  position: absolute;
  inset: 0;
  width: 200px;  /* Conflict! */
}
```

### ✓ DO: Only use when appropriate
```css
/* Use inset for full coverage */
.modal-backdrop {
  position: fixed;
  inset: 0;
}

/* Use specific properties for constraints */
.sidebar {
  position: absolute;
  inset-block: 0;
  width: 300px;
}
```

---

## Migration Checklist

When adding new CSS to DMB Almanac:

- [ ] Check if any `left`, `right`, `top`, `bottom` properties are used
- [ ] Check if any `margin-left`, `margin-right` properties are used
- [ ] Check if any `padding-left`, `padding-right` properties are used
- [ ] Consider using logical properties instead
- [ ] Use shorthand when possible (`inset: 0;`, `margin-inline: 1rem;`)
- [ ] Verify no mixing of physical and logical properties in same rule

---

## Resources

- [MDN: CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [Can I Use: Logical Properties](https://caniuse.com/css-logical-props)
- [Web.dev: Logical Properties](https://web.dev/logical-properties-and-values/)

---

## Questions?

Refer to `/LOGICAL_PROPERTIES_CONVERSION.md` for detailed conversion report and before/after examples.
