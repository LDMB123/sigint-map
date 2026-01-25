---
title: "Vertical Rhythm: Mathematical Harmony"
description: "Master baseline grids, line-height harmony, and proportional spacing for typographic consistency"
tags:
  - typography
  - design-systems
  - css
  - vertical-rhythm
  - spacing
targetEnvironments:
  - chromium: "143+"
  - platform: "macOS 26.2"
  - architecture: "Apple Silicon"
difficulty: "intermediate"
author: "Typography Master"
created: "2026-01-21"
---

> "When you understand that every pixel counts, that every space has meaning, that's when typography becomes architecture."
> — Inspired by Steve Jobs' Attention to Detail

Vertical rhythm is the invisible grid underlying great typography. Every line of text, every headline, every element should sit on an invisible baseline grid. This creates visual harmony, improves readability, and signals intentional design.

## The Baseline Grid: Invisible Order

A baseline grid is an invisible horizontal grid that all text and elements align to.

### Foundation: Base Unit

Choose a base unit that will be your spacing foundation:

```css
:root {
  /* Base unit: 8px (commonly used) */
  --base-unit: 8px;

  /* Alternative: 4px for tighter control */
  --base-unit: 4px;

  /* Alternative: 6px for specialized systems */
  --base-unit: 6px;
}
```

**Common choices**:
| Unit | Use Case | Notes |
|------|----------|-------|
| 4px | Design systems with fine control | Google Material (4px) |
| 6px | Balanced systems | Some design systems |
| 8px | Web industry standard | Most popular choice |
| 16px | Large-grid systems | Rarely used for baseline |

### Building the Rhythm: Line-Height

Line-height is the foundation of vertical rhythm.

```css
:root {
  /* Base font size */
  --base-size: 16px;

  /* Base line-height (unitless multiplier) */
  --base-line-height: 1.5;

  /* Calculated: 16px * 1.5 = 24px */
  --rhythm-unit: calc(var(--base-size) * var(--base-line-height));
  /* Result: 24px baseline grid */
}

body {
  font-size: var(--base-size);
  line-height: var(--base-line-height);
  /* Every line of text sits on 24px grid */
}
```

**The math**:
- Body font: 16px
- Line-height: 1.5
- Baseline grid: 24px
- All spacing should be multiples of 24px (24px, 48px, 72px, etc.)

### Why Unitless Line-Height?

**Using unitless multiplier (CORRECT)**:
```css
body {
  font-size: 16px;
  line-height: 1.5; /* 24px */
}

h1 {
  font-size: 48px;
  line-height: 1.5; /* 72px (48 * 1.5) - maintains rhythm */
}
```

**Using pixel values (WRONG)**:
```css
body {
  font-size: 16px;
  line-height: 24px; /* Fixed 24px */
}

h1 {
  font-size: 48px;
  line-height: 24px; /* Wrong! Should be 72px */
  /* Rhythm breaks because line-height doesn't scale */
}
```

## Typography Scale: Harmonic Proportions

Headline sizes should follow mathematical ratios, not arbitrary values.

### Common Ratios

| Ratio | Name | Usage | Multiplier |
|-------|------|-------|-----------|
| 1.2 | Minor second | Conservative systems | ×1.2 per level |
| 1.25 | Major third | Common choice | ×1.25 per level |
| 1.333 | Perfect fourth | Musical ratio | ×1.333 per level |
| 1.5 | Perfect fifth | Musical ratio | ×1.5 per level |
| 1.618 | Golden ratio | Timeless, elegant | ×1.618 per level |

### Building a Type Scale with Ratio

**Base: 16px, Ratio: 1.25 (Major Third)**

```css
:root {
  --base: 16px;
  --ratio: 1.25;

  /* Calculate sizes */
  --xs: calc(var(--base) / var(--ratio)); /* 12.8px */
  --sm: var(--base); /* 16px */
  --md: calc(var(--base) * var(--ratio)); /* 20px */
  --lg: calc(var(--md) * var(--ratio)); /* 25px */
  --xl: calc(var(--lg) * var(--ratio)); /* 31.25px */
  --2xl: calc(var(--xl) * var(--ratio)); /* 39.06px */
  --3xl: calc(var(--2xl) * var(--ratio)); /* 48.83px */
  --4xl: calc(var(--3xl) * var(--ratio)); /* 61.04px */
}
```

**Applied to typography**:

```css
body {
  font-size: var(--sm); /* 16px */
  line-height: 1.5;
}

h6 { font-size: var(--md); }     /* 20px */
h5 { font-size: var(--lg); }     /* 25px */
h4 { font-size: var(--xl); }     /* 31px */
h3 { font-size: var(--2xl); }    /* 39px */
h2 { font-size: var(--3xl); }    /* 49px */
h1 { font-size: var(--4xl); }    /* 61px */
```

**Visual check**:
```
H1: 61.04px
H2: 48.83px ← Clearly smaller than H1
H3: 39.06px ← Clearly smaller than H2
H4: 31.25px ← Clearly smaller than H3
Body: 16px
```

This feels natural because each step is proportional to the last.

## Spacing: Rhythm-Based Margins and Padding

All spacing should be multiples of your rhythm unit.

### Rhythm-Based Spacing Scale

```css
:root {
  /* 16px * 1.5 = 24px baseline grid */
  --spacing-0: 0;
  --spacing-1: calc(1 * 24px); /* 24px */
  --spacing-2: calc(2 * 24px); /* 48px */
  --spacing-3: calc(3 * 24px); /* 72px */
  --spacing-4: calc(4 * 24px); /* 96px */

  /* Half-rhythm for more control */
  --spacing-xs: calc(0.5 * 24px); /* 12px (for small elements) */
  --spacing-sm: calc(1 * 24px);   /* 24px */
  --spacing-md: calc(1.5 * 24px); /* 36px */
  --spacing-lg: calc(2 * 24px);   /* 48px */
  --spacing-xl: calc(3 * 24px);   /* 72px */
}
```

### Applying Rhythm Spacing

```css
/* Headings: 1 rhythm unit above, 0.5 below */
h1, h2, h3 {
  margin-top: var(--spacing-1);
  margin-bottom: var(--spacing-xs);
}

/* Paragraphs: separate by full rhythm unit */
p {
  margin-bottom: var(--spacing-1); /* 24px */
}

p + p {
  margin-top: var(--spacing-1); /* 24px between paragraphs */
}

/* Container padding: aligned to rhythm */
.container {
  padding: var(--spacing-2); /* 48px padding */
}

/* Section spacing */
section {
  margin-top: var(--spacing-3); /* 72px between sections */
  padding-top: var(--spacing-2);
  padding-bottom: var(--spacing-2);
}

/* Component spacing */
button {
  padding: var(--spacing-xs) var(--spacing-sm); /* 12px 24px */
}

.card {
  padding: var(--spacing-2); /* 48px padding */
  margin-bottom: var(--spacing-1); /* 24px gap */
}
```

## Line-Height by Font Size

Optimal line-height varies by font size. Smaller text needs more breathing room.

### Line-Height Scale

```css
/* Small text: more line-height */
.caption {
  font-size: 12px;
  line-height: 1.6; /* More space for readability */
}

/* Body text: balanced */
body {
  font-size: 16px;
  line-height: 1.5; /* Optimal for reading */
}

/* Large text: can be tighter */
h1 {
  font-size: 48px;
  line-height: 1.2; /* Can be tighter at large sizes */
}

/* Large headlines: even tighter */
.hero {
  font-size: 72px;
  line-height: 1.1; /* Very tight for impact */
}
```

**General rule**:
```
Small text (12px)   → line-height: 1.6-1.7
Body text (16px)    → line-height: 1.5-1.6
Headings (32px+)    → line-height: 1.2-1.3
Display (48px+)     → line-height: 1.1-1.2
```

## CSS Custom Properties for Rhythm Control

Leverage CSS variables for consistent, maintainable vertical rhythm.

### Complete Rhythm System

```css
:root {
  /* Font sizes */
  --font-xs: 12px;
  --font-sm: 14px;
  --font-base: 16px;
  --font-lg: 18px;
  --font-xl: 20px;
  --font-2xl: 24px;
  --font-3xl: 30px;
  --font-4xl: 36px;
  --font-5xl: 48px;
  --font-6xl: 60px;

  /* Line heights */
  --line-tight: 1.2;
  --line-normal: 1.5;
  --line-loose: 1.75;
  --line-relaxed: 2;

  /* Spacing scale (24px base rhythm) */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Typography combinations */
  --text-xs: var(--font-xs) / var(--line-loose);
  --text-sm: var(--font-sm) / var(--line-normal);
  --text-base: var(--font-base) / var(--line-normal);
  --text-lg: var(--font-lg) / var(--line-normal);
  --text-xl: var(--font-xl) / var(--line-tight);
}

body {
  font: var(--text-base);
}

h1 {
  font-size: var(--font-5xl);
  line-height: var(--line-tight);
  margin-bottom: var(--space-6);
}

p {
  font: var(--text-base);
  margin-bottom: var(--space-6);
}
```

## Debugging Vertical Rhythm

### Visual Debugging: Baseline Grid Overlay

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    /* Create visible baseline grid for debugging */
    body {
      background-image:
        repeating-linear-gradient(
          to bottom,
          transparent 0px,
          transparent 23px,
          rgba(0, 0, 255, 0.1) 23px,
          rgba(0, 0, 255, 0.1) 24px
        );
      background-attachment: fixed;
    }

    /* Toggle with keyboard shortcut */
    body.show-grid {
      background-image:
        repeating-linear-gradient(
          to bottom,
          transparent 0px,
          transparent 23px,
          rgba(0, 0, 255, 0.15) 23px,
          rgba(0, 0, 255, 0.15) 24px
        );
    }
  </style>
</head>
<body>
  <h1>Baseline Grid Visible</h1>
  <p>All text should align to the blue grid lines.</p>

  <script>
    // Toggle grid with Ctrl+Shift+G
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        document.body.classList.toggle('show-grid');
      }
    });
  </script>
</body>
</html>
```

### Check Element Alignment

```javascript
// DevTools: Check if element aligns to 24px grid
function checkRhythm(element, baseRhythm = 24) {
  const rect = element.getBoundingClientRect();
  const topAlign = rect.top % baseRhythm;
  const heightAlign = rect.height % baseRhythm;

  console.log(
    `${element.tagName}: ` +
    `top offset: ${topAlign}px, ` +
    `height: ${heightAlign}px`
  );

  if (topAlign !== 0 || heightAlign !== 0) {
    console.warn(`⚠️ Not aligned to ${baseRhythm}px grid!`);
  } else {
    console.log(`✓ Properly aligned`);
  }
}

// Usage:
checkRhythm(document.querySelector('h1'));
checkRhythm(document.querySelector('p'));
```

## Complete Vertical Rhythm Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
    :root {
      /* Base typography */
      --font-base: 16px;
      --line-height-base: 1.5;
      --rhythm-unit: calc(var(--font-base) * var(--line-height-base)); /* 24px */

      /* Font sizes (1.25 ratio) */
      --font-sm: 12.8px;
      --font-base: 16px;
      --font-md: 20px;
      --font-lg: 25px;
      --font-xl: 31.25px;
      --font-2xl: 39.06px;
      --font-3xl: 48.83px;
      --font-4xl: 61.04px;

      /* Spacing (multiples of 24px) */
      --space-xs: calc(0.5 * var(--rhythm-unit)); /* 12px */
      --space-sm: var(--rhythm-unit); /* 24px */
      --space-md: calc(1.5 * var(--rhythm-unit)); /* 36px */
      --space-lg: calc(2 * var(--rhythm-unit)); /* 48px */
      --space-xl: calc(3 * var(--rhythm-unit)); /* 72px */
    }

    body {
      font-size: var(--font-base);
      line-height: var(--line-height-base);
      margin: 0;
    }

    h1 {
      font-size: var(--font-4xl);
      line-height: 1.1;
      margin-top: var(--space-lg);
      margin-bottom: var(--space-md);
    }

    h2 {
      font-size: var(--font-3xl);
      line-height: 1.2;
      margin-top: var(--space-lg);
      margin-bottom: var(--space-sm);
    }

    h3 {
      font-size: var(--font-2xl);
      line-height: 1.2;
      margin-top: var(--space-md);
      margin-bottom: var(--space-xs);
    }

    p {
      margin-bottom: var(--space-sm);
      line-height: var(--line-height-base);
    }

    section {
      padding: var(--space-lg) 0;
    }

    .container {
      padding: var(--space-lg);
      max-width: 800px;
    }

    /* Responsive adjustment */
    @media (max-width: 640px) {
      :root {
        --font-base: 15px;
        --rhythm-unit: calc(15px * 1.5); /* 22.5px */
      }

      h1 { font-size: var(--font-3xl); }
      h2 { font-size: var(--font-2xl); }
      h3 { font-size: var(--font-xl); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Vertical Rhythm Mastery</h1>
    <p>Every element aligns to a 24px baseline grid.</p>

    <h2>Subheading</h2>
    <p>Spacing, line-height, and font sizes follow mathematical harmony.</p>

    <h3>Third Level</h3>
    <p>This ensures visual consistency and professional typography.</p>
  </div>
</body>
</html>
```

## Anti-Patterns: What NOT to Do

### ✗ Don't: Use Fixed Pixel Line-Height

```css
/* WRONG: Doesn't scale with font size */
body {
  font-size: 16px;
  line-height: 24px;
}

h1 {
  font-size: 48px;
  line-height: 24px; /* Way too tight for large text */
}
```

**Better**: Use unitless multiplier.

```css
body {
  font-size: 16px;
  line-height: 1.5; /* Scales proportionally */
}

h1 {
  font-size: 48px;
  line-height: 1.5; /* Automatically becomes 72px */
}
```

### ✗ Don't: Arbitrary Spacing Values

```css
/* WRONG: Random spacing that doesn't align */
h1 {
  margin-bottom: 23px; /* Not a multiple of 24px */
}

p {
  margin-bottom: 17px; /* Random value */
}
```

**Better**: Use rhythm-based spacing.

```css
h1 {
  margin-bottom: var(--space-sm); /* 24px */
}

p {
  margin-bottom: var(--space-sm); /* 24px */
}
```

### ✗ Don't: Forget Responsive Rhythm Adjustment

```css
/* WRONG: Same rhythm on mobile as desktop */
:root {
  --font-base: 16px;
  --rhythm-unit: 24px;
}

@media (max-width: 640px) {
  /* No adjustment for smaller screens */
}
```

**Better**: Adjust rhythm for screen size.

```css
:root {
  --font-base: 16px;
  --rhythm-unit: 24px;
}

@media (max-width: 640px) {
  :root {
    --font-base: 15px;
    --rhythm-unit: 22.5px; /* Adjusted for smaller screens */
  }
}
```

## Quality Checklist

- [ ] Base rhythm unit chosen (8px, 4px, 6px)
- [ ] Body font size determined (16px common)
- [ ] Line-height is unitless multiplier (e.g., 1.5, not 24px)
- [ ] Type scale uses mathematical ratio (1.25, 1.333, 1.618)
- [ ] All margins and padding are multiples of rhythm unit
- [ ] Half-rhythm unit available for fine-tuning (--space-xs)
- [ ] CSS custom properties defined for entire spacing scale
- [ ] Heading line-heights adjusted for size (1.1-1.2 for large)
- [ ] Body text line-height 1.5 or 1.6
- [ ] Small text line-height increased to 1.6-1.7
- [ ] Baseline grid visually verified with debug overlay
- [ ] Responsive rhythm adjusts for mobile
- [ ] No arbitrary spacing values in codebase
- [ ] All headings follow type scale ratio
- [ ] Visual hierarchy clear through size and spacing

## Tools and Resources

- [Type Scale Calculator](https://type-scale.com)
- [Baseline.is: Rhythm Generator](https://baseline.is)
- [MDN: line-height](https://developer.mozilla.org/en-US/docs/Web/CSS/line-height)
- [Every Layout: Spacing System](https://every-layout.dev/rudiments/modular-scale/)
