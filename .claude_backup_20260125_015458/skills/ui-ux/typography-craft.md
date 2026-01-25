---
name: typography-craft
description: Text as art - variable fonts, optical sizing, and perfect hierarchy
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Simplicity is not the absence of clutter... it's about making very sophisticated choices." - Steve Jobs
---

# Typography Craft: Text as Art

Typography is invisible design when executed correctly. It guides the eye, establishes hierarchy, and creates rhythm. On high-resolution Apple Silicon displays, every character demands perfection.

## Core Principles

### 1. System Font Stack for Native Feel

Use native system fonts for familiarity and zero loading time. Apple Silicon Macs recognize the native stack instantly.

**Perfect System Font Stack:**
```css
:root {
  /* macOS native fonts */
  --font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                 'Helvetica Neue', sans-serif;

  /* For code/monospace */
  --font-mono: 'Menlo', 'Monaco', 'Courier New', monospace;

  /* Serif for editorial content (optional, curated) */
  --font-serif: 'Georgia', 'Times New Roman', serif;
}

body {
  font-family: var(--font-system);
  font-weight: 400; /* Regular */
  font-size: 16px;
  line-height: 1.5; /* Unitless for scalability */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code, pre {
  font-family: var(--font-mono);
  -webkit-font-smoothing: antialiased;
}
```

**Why -apple-system Matters:**
- Automatically uses SF Pro Display on macOS
- Uses -apple-system-monospaced for monospace (San Francisco Mono)
- Zero request latency (no network fetch)
- Perfect rendering on Retina displays
- Respects user's system preferences (font size, weight)

### 2. Variable Fonts for Precise Weight Control

Variable fonts enable infinite weight gradations with a single font file.

**Variable Font Setup:**
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('font-variation-woff2');
  font-weight: 100 900; /* Supports 100-900 in single file */
  font-stretch: 75% 100%;
  font-style: normal;
  font-display: swap; /* Show content while loading */
}

:root {
  /* Using variable fonts for precise weights */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-black: 900;
}

/* Different weights for emphasis without separate font files */
body {
  font-family: 'Inter', var(--font-system);
  font-weight: var(--font-normal);
  font-variation-settings: 'wght' 400;
}

strong, .font-bold {
  font-weight: var(--font-semibold);
  font-variation-settings: 'wght' 600;
}

.headline {
  font-weight: var(--font-black);
  font-variation-settings: 'wght' 900;
}
```

**Performance Benefit:**
- Single .woff2 file (~50KB) vs. multiple weight files (200KB+)
- Smooth transitions between weights
- Smaller bundle size

### 3. text-wrap: pretty (Chrome 143+)

The `pretty` value prevents awkward orphans and widows in headlines.

**Perfect Line Breaking:**
```css
/* Prevent single words on last line */
h1, h2, h3, .headline {
  text-wrap: pretty;
}

h1 {
  font-size: 48px;
  line-height: 1.2;
  text-wrap: pretty; /* Prevents: "Hello beautiful" on line 1, "world" on line 2 */
}

/* For body text (use balance) */
body {
  text-wrap: balance; /* Balances all lines evenly */
}

/* Strict control when needed */
.article-title {
  text-wrap: pretty;
  max-width: 60ch; /* Optimal reading width */
}
```

**Visual Impact:**
```html
<!-- Without text-wrap: pretty -->
<h1>
  Bringing beautiful design to
  web
</h1>

<!-- With text-wrap: pretty -->
<h1>
  Bringing beautiful design
  to web
</h1>
<!-- Eliminates lonely "web" -->
```

### 4. Font-Optical-Sizing for Responsiveness

Optical sizing adjusts fonts automatically for different sizes - crucial for variable fonts.

**Optical Sizing Implementation:**
```css
:root {
  /* Enable optical sizing for variable fonts */
  --font-optical-sizing: auto;
}

/* Display sizes (18px and above) */
.heading-display {
  font-size: 48px;
  font-optical-sizing: auto; /* Use optical size optimized for 48px */
  font-variation-settings: 'wght' 700;
  line-height: 1.2;
}

/* Headline sizes (24px-36px) */
.heading-large {
  font-size: 32px;
  font-optical-sizing: auto;
  font-variation-settings: 'wght' 600;
  line-height: 1.3;
}

/* Body text (14px-18px) */
body {
  font-size: 16px;
  font-optical-sizing: auto;
  line-height: 1.5;
}

/* Caption/small text (12px-14px) */
.caption {
  font-size: 13px;
  font-optical-sizing: auto; /* Increases weight at small sizes */
  font-variation-settings: 'wght' 500;
  line-height: 1.4;
}
```

**Why It Matters:**
- At 48px: Font width is looser, more elegant
- At 16px: Font becomes tighter, more readable
- At 12px: Font becomes bolder automatically for legibility

### 5. Proper Line-Height Rhythm

Unitless line-height creates a vertical rhythm that scales with font size.

**Perfect Line-Height Scale:**
```css
:root {
  /* Establish vertical rhythm with unitless values */
  --line-height-tight: 1.2;     /* Headlines */
  --line-height-normal: 1.5;    /* Body text */
  --line-height-relaxed: 1.8;   /* Large displays */
}

/* Display heading (48px) */
h1 {
  font-size: 48px;
  line-height: var(--line-height-tight); /* 48 * 1.2 = 57.6px */
  margin-bottom: 1.5em; /* 57.6 * 1.5 = 86.4px */
}

/* Large heading (32px) */
h2 {
  font-size: 32px;
  line-height: 1.3; /* 32 * 1.3 = 41.6px */
  margin-bottom: 1.2em; /* Creates rhythm */
}

/* Body text (16px) */
body {
  font-size: 16px;
  line-height: var(--line-height-normal); /* 16 * 1.5 = 24px - perfect baseline */
  margin-bottom: 1em; /* 16 * 1 = 16px */
}

/* Small text (14px) */
.caption {
  font-size: 14px;
  line-height: 1.6; /* 14 * 1.6 = 22.4px */
}

/* Mathematical progression for harmony */
p + p {
  margin-top: 1.5em; /* Maintains rhythm between paragraphs */
}

ul, ol {
  line-height: var(--line-height-normal);
  margin-bottom: 1.5em;
}

li {
  margin-bottom: 0.5em; /* Tighter spacing within lists */
}
```

**Benefits:**
- All text aligns to invisible 8px grid
- Consistent spacing everywhere
- Scales proportionally across breakpoints
- Easy to maintain and modify

### 6. Letter-Spacing Micro-Adjustments

Tight tracking (negative letter-spacing) on large display text improves perception.

**Letter-Spacing Strategy:**
```css
:root {
  --letter-spacing-tight: -0.02em;   /* -2% on display */
  --letter-spacing-normal: 0;        /* Natural spacing */
  --letter-spacing-loose: 0.02em;    /* 2% for caps */
}

/* Display heading - use tight tracking */
h1, .headline-display {
  font-size: 48px;
  letter-spacing: var(--letter-spacing-tight);
  font-weight: 700;
  /* -0.02em * 48px = -0.96px - imperceptible tightening */
  /* Creates perception of solidity */
}

/* All caps requires looser tracking */
.button-text, .nav-item {
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.08em; /* 8% for caps */
  font-weight: 600;
}

/* Body text remains neutral */
body, p {
  letter-spacing: var(--letter-spacing-normal);
}

/* Email addresses and codes need natural spacing */
code, .email {
  letter-spacing: 0; /* No adjustment */
  font-family: var(--font-mono);
}
```

**Mathematical Approach:**
- Display (36px+): -0.02em
- Headline (24-32px): -0.01em
- Body (14-18px): 0
- All caps: +0.05em to +0.08em
- Monospace: 0

### 7. Font Feature Settings for Advanced Typography

Enable OpenType features for superior typography.

**Advanced Font Features:**
```css
:root {
  /* Smart typography features */
  --font-features-base: 'kern' 1, 'liga' 1, 'calt' 1;
  --font-features-display: 'kern' 1, 'liga' 1, 'ss01' 1;
  --font-features-mono: 'kern' 0, 'liga' 0;
}

body {
  font-feature-settings: var(--font-features-base);
}

/* Display text with stylistic alternates */
h1, .display {
  font-feature-settings: var(--font-features-display);
  /* Activates stylistic set 1 for more elegant forms */
}

/* Code never uses ligatures */
code, pre {
  font-feature-settings: var(--font-features-mono);
  /* Prevents: 'fi' becoming single glyph in code */
}

/* Numbers with consistent width in tables */
.data-table {
  font-feature-settings: 'tnum' 1; /* Tabular numbers */
  font-variant-numeric: tabular-nums;
}

/* Fractions render correctly */
.fraction {
  font-feature-settings: 'frac' 1;
  font-variant-numeric: diagonal-fractions;
}

/* Small caps for abbreviations */
.abbreviation {
  font-feature-settings: 'smcp' 1;
  font-variant-caps: small-caps;
}

/* Ligatures */
.text-with-ligatures {
  font-feature-settings: 'liga' 1, 'dlig' 1; /* Enable all ligatures */
}
```

**Common Features:**
- `kern`: Kerning pairs (always 1)
- `liga`: Standard ligatures fi, fl, ffi
- `dlig`: Discretionary ligatures
- `calt`: Contextual alternates
- `ss01`: Stylistic set 1
- `tnum`: Tabular numbers
- `smcp`: Small capitals

### 8. Text-Rendering for Headlines

Optimize rendering performance for headlines.

**Rendering Strategies:**
```css
/* Headlines: optimize for clarity */
h1, h2, h3, .headline {
  text-rendering: optimizeLegibility;
  /* Enables kerning and ligatures */
  /* Slight performance cost, worth it for headlines */
  -webkit-font-smoothing: subpixel-antialiased;
}

/* Body text: balance performance and quality */
body, p {
  text-rendering: optimizeSpeed;
  /* Faster rendering, acceptable quality for body */
  -webkit-font-smoothing: antialiased;
}

/* When you need geometric precision */
.geometric-text {
  text-rendering: geometricPrecision;
  /* Forces precise positioning, disables hinting */
}
```

## Complete Typography System

**HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --font-system: -apple-system, BlinkMacSystemFont, sans-serif;
      --line-height-tight: 1.2;
      --line-height-normal: 1.5;
      --letter-spacing-tight: -0.02em;
      --font-features: 'kern' 1, 'liga' 1, 'calt' 1;
    }

    body {
      font-family: var(--font-system);
      font-size: 16px;
      line-height: var(--line-height-normal);
      letter-spacing: 0;
      font-feature-settings: var(--font-features);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeSpeed;
    }

    h1 {
      font-size: 48px;
      line-height: var(--line-height-tight);
      letter-spacing: var(--letter-spacing-tight);
      font-weight: 700;
      text-wrap: pretty;
      margin: 1.5em 0 0.5em;
      text-rendering: optimizeLegibility;
    }

    h2 {
      font-size: 32px;
      line-height: 1.3;
      letter-spacing: -0.01em;
      font-weight: 600;
      text-wrap: pretty;
      margin: 1.2em 0 0.4em;
    }

    p {
      margin-bottom: 1.5em;
      max-width: 65ch; /* Optimal reading width */
      text-wrap: balance;
    }

    code {
      font-family: 'Menlo', monospace;
      font-size: 0.9em;
      font-feature-settings: 'kern' 0, 'liga' 0;
    }
  </style>
</head>
<body>
  <h1>Beautiful Typography Scales Perfectly</h1>
  <p>Every element respects the baseline grid and maintains visual harmony.</p>
</body>
</html>
```

## Typography Quality Checklist

- [ ] System font stack used as default (-apple-system first)
- [ ] Variable fonts implemented for weight flexibility
- [ ] text-wrap: pretty on all headlines
- [ ] font-optical-sizing: auto enabled
- [ ] Line-height uses unitless values
- [ ] Letter-spacing adjusted for display text
- [ ] font-feature-settings enables kerning and ligatures
- [ ] text-rendering optimized for context
- [ ] -webkit-font-smoothing: antialiased applied
- [ ] No orphans or widows in headlines
- [ ] Max-width on body text (65ch recommended)
- [ ] Vertical rhythm maintained across sections

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Use pixel-based line-height */
.avoid {
  line-height: 24px;
  /* Doesn't scale with font-size */
  /* Breaks on font-size changes */
}

/* ✓ DO: Use unitless line-height */
.correct {
  line-height: 1.5;
  /* Scales proportionally */
  /* 16px * 1.5 = 24px */
}

/* ❌ DO NOT: Mix system and web fonts carelessly */
.avoid {
  font-family: 'Helvetica Neue', 'Custom Font', sans-serif;
}

/* ✓ DO: System font first, web font as enhancement */
.correct {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}

/* ❌ DO NOT: Disable font smoothing */
.avoid {
  -webkit-font-smoothing: auto;
}

/* ✓ DO: Enable smoothing explicitly */
.correct {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ❌ DO NOT: Arbitrary letter-spacing */
.avoid {
  letter-spacing: 3px;
}

/* ✓ DO: Calculated percentage-based spacing */
.correct {
  font-size: 48px;
  letter-spacing: -0.02em; /* -0.96px at 48px */
}
```

## Responsive Typography

```css
/* Mobile: smaller scale */
@media (max-width: 640px) {
  h1 {
    font-size: 32px;
    line-height: 1.25;
  }

  body {
    font-size: 16px;
  }
}

/* Tablet: medium scale */
@media (max-width: 1024px) {
  h1 {
    font-size: 40px;
  }
}

/* Desktop: full scale */
@media (min-width: 1200px) {
  h1 {
    font-size: 48px;
  }
}

/* Use fluid typography for continuous scaling */
h1 {
  font-size: clamp(32px, 5vw, 48px);
  /* Minimum 32px, preferred 5vw, maximum 48px */
}
```

## Font Loading Performance

```css
/* Use font-display: swap for web fonts */
@font-face {
  font-family: 'CustomFont';
  src: url('/font.woff2') format('font-variation-woff2');
  font-display: swap;
  /* Show system font immediately, swap when custom loads */
}

/* Only load necessary weights */
@font-face {
  font-family: 'CustomFont';
  src: url('/font-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

---

**Remember:** Every character has weight, every line has rhythm, every paragraph has breath. Typography is not decoration - it's the foundation of readable, beautiful interfaces.
