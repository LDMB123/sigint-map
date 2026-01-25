---
title: "Text Rendering Craft: Pixel-Perfect Text"
description: "Master font-smoothing, rendering optimization, kerning, ligatures, and micro-adjustments for perfect text display"
tags:
  - fonts
  - typography
  - css
  - rendering
  - kerning
targetEnvironments:
  - chromium: "143+"
  - platform: "macOS 26.2"
  - architecture: "Apple Silicon"
difficulty: "advanced"
author: "Typography Master"
created: "2026-01-21"
---

> "The only way to do great work is to love what you do."
> — Steve Jobs

Typography is not just choosing a font—it's controlling how every pixel renders. The difference between good typography and exceptional typography lives in the details: kerning, ligatures, rendering hints, smoothing strategies. These decisions determine whether text feels polished or rough.

## Font Smoothing: -webkit-font-smoothing

Font smoothing controls how the browser renders text pixels. It's the foundational setting for all text.

### macOS: Antialiased (Recommended)

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**What it does**:
- Uses subpixel rendering on macOS
- Produces crisper, thinner text
- Matches macOS system UI rendering
- Optimal for body text and UI

**Rendering comparison**:
- **Without**: Text appears heavier, slightly blurry
- **With**: Text appears sharper, more refined
- **Perfect for**: macOS Safari, Chrome

**When to use**: Almost always on macOS-targeted sites.

### macOS: Subpixel Antialiased (Fallback)

```css
body {
  -webkit-font-smoothing: subpixel-antialiased;
}
```

**What it does**:
- Uses full subpixel rendering capabilities
- Produces the heaviest, most colorful text
- Better for very small text (< 12px)
- Slightly blurrier than antialiased

**When to use**: Very small text, captions, footnotes where weight matters more than sharpness.

### Windows: Subpixel Antialiased

```css
body {
  -webkit-font-smoothing: subpixel-antialiased;
  -moz-osx-font-smoothing: auto;
}
```

**Windows ClearType Rendering**:
- Uses RGB subpixel layout
- Requires explicit optimization
- `-moz-osx-font-smoothing: auto` tells Firefox to use OS defaults
- Critical for Segoe UI on Windows

### Auto: Let Browser Decide

```css
body {
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
}
```

**Use case**: When font rendering is less critical, or you want to optimize for a variety of devices.

## text-rendering: Performance vs Quality

`text-rendering` controls the browser's text rendering algorithm.

### optimizeLegibility (Maximum Quality)

```css
body {
  text-rendering: optimizeLegibility;
}
```

**What it enables**:
- Automatic ligature rendering
- Enhanced kerning
- Optimized glyph selection
- Perfect for editorial, reading-focused content

**Performance cost**: 5-15% slower rendering on large text blocks.

**When to use**:
- Body text articles, blog posts
- Long-form reading content
- Headlines where legibility is paramount
- When performance is less critical

**Example**:
```css
article {
  text-rendering: optimizeLegibility;
  /* Enables: f-i ligature, better spacing */
}
```

### optimizeSpeed (Maximum Performance)

```css
body {
  text-rendering: optimizeSpeed;
}
```

**What it does**:
- Disables ligatures
- Disables kerning optimization
- Faster rendering
- Useful for dynamic content

**When to use**:
- Real-time text updates
- Frequently changing content
- Interactive forms and inputs
- When performance is critical

**Example**:
```css
input, textarea {
  text-rendering: optimizeSpeed;
  /* No ligatures in input fields */
}
```

### Geometric Precision (Balance)

```css
body {
  text-rendering: geometricPrecision;
}
```

**What it does**:
- Balances quality and performance
- Uses precise glyph positioning
- Good for responsive text
- Newer browsers only

**Browser support**: Chromium 143+, modern Firefox, Safari.

## Kerning: font-kerning

Kerning adjusts spacing between specific character pairs for optimal visual balance.

### Enable Automatic Kerning (Default)

```css
body {
  font-kerning: normal;
  /* Default: browser/font determines kerning */
}
```

**Kerning examples**:
- "Tv" → letter spacing automatically reduced
- "Ay" → adjusted for visual balance
- "We" → tightened for harmony
- "To" → reduced gap between characters

**When to use**: Almost always. Fonts are designed with kerning in mind.

### Disable Kerning (Rarely Needed)

```css
code, pre {
  font-kerning: none;
  /* Monospace: no kerning (each char is fixed width) */
}

.no-kern {
  font-kerning: none;
  /* When alignment matters more than aesthetics */
}
```

**When to disable**:
- Monospace/code fonts (kerning breaks alignment)
- When tracking character positions
- Legacy font compatibility issues

### Auto: Browser-Optimized Kerning

```css
body {
  font-kerning: auto;
  /* Browser decides based on font metrics */
}
```

## Font Features: font-feature-settings

OpenType font features provide fine-grained control over text rendering.

### Ligatures: liga

```css
body {
  font-feature-settings: 'liga';
  /* Enables: fi, fl, ffi, ffl ligatures */
}
```

**Visual example**:
- Without: "fi" = two separate glyphs
- With: "fi" = single beautiful connected glyph

**When to enable**:
- Body text, headlines (editorial)
- Professional typography
- When fonts have quality ligatures

```css
/* Enable ligatures everywhere */
article {
  font-feature-settings: 'liga';
}

/* Disable in code (breaks alignment) */
code {
  font-feature-settings: 'liga' 0;
}
```

### Numerals: lnum vs onum

```css
/* Lining numbers (0-9 aligned, same height) */
.numbers-lining {
  font-feature-settings: 'lnum';
  /* "2023" renders with all numbers at top */
}

/* Old-style numbers (varying heights) */
.numbers-oldstyle {
  font-feature-settings: 'onum';
  /* "2023" renders with varying heights (more elegant) */
}
```

**When to use**:
- **lnum**: Modern, technical, data (prices, years)
- **onum**: Editorial, body text, elegant typography

### Fractions: frac

```css
.recipe {
  font-feature-settings: 'frac';
  /* "1/2" renders as proper fraction: ½ */
}
```

**Example**:
```html
<p>Add 1/2 cup flour and 3/4 teaspoon salt</p>
```

Renders as:
```
Add ½ cup flour and ¾ teaspoon salt
```

### Small Capitals: smcp

```css
.acronym {
  font-feature-settings: 'smcp';
  /* "NATO" renders with small caps */
  /* Looks like: NΑTO (with small A and T) */
}
```

### All Caps: c2sc

```css
.title {
  font-feature-settings: 'c2sc';
  text-transform: uppercase;
  /* "Title Case" converts to small capitals */
  /* Looks more elegant than full caps */
}
```

### Multiple Features Combined

```css
body {
  font-feature-settings:
    'liga' 1,    /* Enable ligatures */
    'onum' 1,    /* Old-style numerals */
    'dlig' 0;    /* Disable discretionary ligatures */
}

.data {
  font-feature-settings:
    'lnum' 1,    /* Lining numerals for numbers */
    'tnum' 1;    /* Tabular numerals (fixed width) */
}
```

## Advanced Typography Controls

### Letter Spacing: letter-spacing

```css
h1 {
  letter-spacing: -0.02em; /* Tighten headlines */
  /* At 48px: 48px * -0.02 = -0.96px reduction */
}

body {
  letter-spacing: 0; /* Normal spacing */
}

.spaced-out {
  letter-spacing: 0.08em; /* Loose spacing for emphasis */
}
```

**Best practices**:
- Use `em` units (relative to font-size)
- Tighten large text (-0.01 to -0.05em)
- Loosen small text (0 to 0.04em)
- Never use fixed pixel values

### Word Spacing: word-spacing

```css
body {
  word-spacing: 0;
}

.emphasized {
  word-spacing: 0.2em; /* Loose spacing between words */
}
```

**When to adjust**:
- Improving readability at small sizes
- Emphasis on key text
- Justified text (increase spacing before last word)

### Text Transform: text-transform

```css
.uppercase {
  text-transform: uppercase;
  letter-spacing: 0.05em; /* Loosen when converting to caps */
}

.capitalize {
  text-transform: capitalize;
}

.lowercase {
  text-transform: lowercase;
}
```

## Hyphenation: hyphens

Hyphenation breaks long words across lines intelligently.

### Auto Hyphenation

```css
p {
  hyphens: auto;
  lang: "en"; /* Required for hyphenation to work */
  /* Long words break with hyphen: "impossible" → "im-possible" */
}
```

**HTML requirement**:
```html
<html lang="en">
  <p>This paragraph has automatic hyphenation enabled.</p>
</html>
```

### Manual Hyphenation

```css
/* Only allow hyphens in explicit locations */
p {
  hyphens: manual;
  /* Requires soft hyphen: "im&shy;possible" */
}
```

```html
<p>The word im&shy;possible may hyphenate here.</p>
```

### No Hyphenation

```css
p {
  hyphens: none;
  /* Words never break across lines */
  overflow-wrap: break-word; /* Use word-break instead */
}
```

## Text Wrapping: text-wrap (Chrome 143+)

Chromium 143 introduced advanced text wrapping strategies.

### Wrap: pretty (Optimal Readability)

```css
p {
  text-wrap: pretty;
  /* Optimizes visual balance */
  /* Avoids single words on last line */
  /* Minimizes hyphenation */
}
```

**Effect**: Prevents widows (single words on final line).

```
Without: "The quick brown fox jumped"
         "over the lazy"
         "dog"

With: "The quick brown fox"
      "jumped over the lazy dog"
```

### Wrap: balance (Multi-Line Headlines)

```css
h1, h2 {
  text-wrap: balance;
  /* Balances line lengths */
  /* Useful for short headlines spanning multiple lines */
}
```

```
Without: "This is a Very Long Headline"
         "That Wraps Awkwardly"

With: "This is a Very Long"
      "Headline That Wraps"
      "Awkwardly"
```

### Wrap: stable (Performance)

```css
.dynamic-text {
  text-wrap: stable;
  /* Minimum reflow during text changes */
  /* Useful for live-updating content */
}
```

## Complete Text Rendering Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      /* Font smoothing */
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;

      /* Rendering optimization */
      text-rendering: optimizeLegibility;

      /* Kerning */
      font-kerning: normal;

      /* Font features */
      font-feature-settings:
        'liga' 1,     /* Enable ligatures */
        'onum' 1;     /* Old-style numerals */

      /* Spacing */
      letter-spacing: 0;
      word-spacing: 0;

      /* Wrapping (Chrome 143+) */
      text-wrap: pretty;

      /* Hyphenation */
      hyphens: auto;
    }

    h1, h2, h3 {
      text-rendering: optimizeLegibility;
      font-kerning: normal;

      /* Tighten large text */
      letter-spacing: -0.02em;

      /* Better wrapping for headings */
      text-wrap: balance;
    }

    code, pre {
      /* Disable ligatures in code (breaks alignment) */
      font-feature-settings: 'liga' 0;

      /* No kerning in monospace */
      font-kerning: none;

      /* Fast rendering for code */
      text-rendering: optimizeSpeed;
    }

    article {
      /* Maximum legibility for reading */
      text-rendering: optimizeLegibility;
      font-feature-settings:
        'liga' 1,
        'dlig' 0;      /* Discretionary ligatures off */
    }

    .data {
      /* Numeric alignment */
      font-feature-settings:
        'tnum' 1,      /* Tabular numerals (fixed width) */
        'lnum' 1;      /* Lining numerals */
    }
  </style>
</head>
<body>
  <h1>Pixel-Perfect Typography</h1>

  <article>
    <p>This text uses optimized rendering, kerning, ligatures, and hyphenation.</p>
  </article>

  <code>function perfectText() { }</code>
</body>
</html>
```

## Anti-Patterns: What NOT to Do

### ✗ Don't: Use text-rendering: optimizeLegibility Everywhere

```css
/* WRONG: Slows down dynamic content */
input {
  text-rendering: optimizeLegibility;
}
```

**Better**: Reserve for static, editorial content.

```css
article {
  text-rendering: optimizeLegibility; /* Yes */
}

input {
  text-rendering: optimizeSpeed; /* Yes */
}
```

### ✗ Don't: Use Pixel Values for Spacing

```css
/* WRONG: Doesn't scale with font size */
h1 {
  font-size: 48px;
  letter-spacing: 2px; /* Not responsive */
}

body {
  font-size: 16px;
  letter-spacing: 2px; /* Way too loose */
}
```

**Better**: Use `em` units.

```css
h1 {
  font-size: 48px;
  letter-spacing: -0.02em; /* Scales with size */
}

body {
  font-size: 16px;
  letter-spacing: 0; /* Proper default */
}
```

### ✗ Don't: Forget lang Attribute for Hyphenation

```css
/* WRONG: Hyphenation won't work */
<html>
  <p>hyphens: auto;</p>
</html>
```

**Better**:
```html
<html lang="en">
  <p>hyphens: auto;</p>
</html>
```

### ✗ Don't: Enable Ligatures in Code

```css
/* WRONG: Breaks character alignment */
code {
  font-feature-settings: 'liga' 1;
  /* "fi" renders as single glyph */
  /* Code alignment breaks */
}
```

**Better**:
```css
code {
  font-feature-settings: 'liga' 0;
  /* Each character remains separate */
}
```

### ✗ Don't: Mix font-weight with font-variation-settings

```css
/* CONFUSING: Which takes precedence? */
strong {
  font-weight: 700;
  font-variation-settings: 'wght' 600;
}
```

**Better**: Use one method.

```css
strong {
  font-weight: 700; /* Simple and clear */
}
```

## Performance Considerations

### Impact on Rendering

| Setting | Impact | When |
|---------|--------|------|
| `-webkit-font-smoothing: antialiased` | < 1% | Always safe |
| `text-rendering: optimizeLegibility` | 5-15% slower | Editorial only |
| `text-rendering: optimizeSpeed` | Faster | Dynamic content |
| `font-feature-settings: liga` | 2-5% slower | Body text |
| `hyphens: auto` | 3-8% slower | Large text blocks |
| `text-wrap: pretty` | 5-10% slower | Headlines |

**Rule of thumb**: Use quality settings for static content, performance settings for dynamic content.

## Quality Checklist

- [ ] `-webkit-font-smoothing: antialiased` applied to body
- [ ] `-moz-osx-font-smoothing: grayscale` for macOS
- [ ] `text-rendering: optimizeLegibility` for editorial content only
- [ ] `font-kerning: normal` enabled globally
- [ ] Ligatures enabled in body text: `font-feature-settings: 'liga'`
- [ ] Ligatures disabled in code: `font-feature-settings: 'liga' 0`
- [ ] Letter spacing uses `em` units, not pixels
- [ ] Large headings have tighter letter-spacing (-0.02em or less)
- [ ] Hyphenation enabled with lang attribute
- [ ] `text-wrap: pretty` used for headlines (Chrome 143+)
- [ ] No widows in body text (single words on last line)
- [ ] Code block character alignment verified
- [ ] Test in Chrome, Safari, Firefox
- [ ] Lighthouse performance score 90+

## Resources

- [MDN: font-feature-settings](https://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings)
- [OpenType Features Overview](https://www.typotheque.com/articles/opentype-features)
- [Web.dev: Font optimization](https://web.dev/font-optimization/)
- [CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)
