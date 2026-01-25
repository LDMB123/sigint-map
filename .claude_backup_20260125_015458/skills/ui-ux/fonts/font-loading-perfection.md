---
title: "Font Loading Perfection: Zero FOUT/FOIT"
description: "Eliminate Flash of Unstyled Text and Flash of Invisible Text through strategic font-display, preloading, and fallback optimization"
tags:
  - fonts
  - web-performance
  - typography
  - css
targetEnvironments:
  - chromium: "143+"
  - platform: "macOS 26.2"
  - architecture: "Apple Silicon"
difficulty: "intermediate"
author: "Typography Master"
created: "2026-01-21"
---

> "Most people make the mistake of thinking design is what it looks like. People think it's this veneer—that the designers are handed this box and told, 'Make it look good!' That's not what we think design is. It's not just what it looks like and feels like. Design is how it works."
> — Steve Jobs

Typography is not about how a font downloads—it's about how text renders from the moment a user opens your page. FOUT (Flash of Unstyled Text) and FOIT (Flash of Invisible Text) break that seamless experience.

## The Problem

Users experience typography as a complete system. When fonts load late:
- **FOIT (Flash of Invisible Text)**: Text vanishes, then appears (default behavior)
- **FOUT (Flash of Unstyled Text)**: Fallback renders, then swaps to custom font
- **Layout Shift**: Different fonts have different metrics, causing jank
- **Performance Perception**: Users think the page is broken

Steve Jobs demanded that every pixel work correctly. Font loading is no exception.

## font-display Strategies

### swap: Instant Rendering, Fast Font Load

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-display: swap;
  font-weight: 100 900;
}
```

**When to use**: Most websites. Fallback renders immediately while custom font loads.

- User sees content instantly (critical for UX)
- Fallback font takes less than 100ms typically
- Custom font swaps in after loading
- Best for: Body text, UI text

**Trade-off**: Brief visual shift when font swaps. Minimize with good fallback matching.

### optional: Custom Font If Already Cached

```css
@font-face {
  font-family: 'SF Pro Display';
  src: url('/fonts/sfpro-display.woff2') format('woff2');
  font-display: optional;
  font-weight: 500;
}
```

**When to use**: Return visitors, branding fonts, non-critical typography.

- Font loads in 100ms "Flash Block" window
- If not loaded by 100ms, fallback is permanent
- Zero layout shift on repeat visits
- Best for: Hero headlines, brand fonts

**Trade-off**: First-time visitors might never see custom font.

### fallback: Short Flash Block, Long Swap Window

```css
@font-face {
  font-family: 'Roboto';
  src: url('/fonts/roboto-regular.woff2') format('woff2');
  font-display: fallback;
  font-weight: 400;
}
```

**When to use**: Critical text that shouldn't be invisible, but can swap after display.

- 100ms invisible flash (FOIT)
- Then falls back if not loaded
- Swaps to custom font up to 3 seconds
- Best for: Core UI text, interactive elements

**Trade-off**: Brief invisible flash, then potential swap.

### block: Wait for Font (Rarely Recommended)

```css
@font-face {
  font-family: 'GlyphSet Custom';
  src: url('/fonts/glyphset.woff2') format('woff2');
  font-display: block;
  font-weight: 400;
}
```

**When to use**: Only for critical custom fonts (icon fonts, specialized characters).

- Blocks text rendering up to 3 seconds
- Text is invisible until font loads
- Swaps after loading
- Best for: Icon fonts with no fallback

**Trade-off**: Text is invisible to users if font is slow to load.

## Preload Critical Fonts

Preloading tells the browser to fetch fonts before CSS parsing completes.

### Basic Preload

```html
<head>
  <!-- DNS prefetch for domain -->
  <link rel="dns-prefetch" href="https://fonts.example.com">

  <!-- Preconnect to CDN -->
  <link rel="preconnect" href="https://fonts.example.com" crossorigin>

  <!-- Preload critical font -->
  <link
    rel="preload"
    as="font"
    href="/fonts/inter-regular.woff2"
    type="font/woff2"
    crossorigin
  >

  <!-- Lower priority: preload italics, bold -->
  <link
    rel="prefetch"
    as="font"
    href="/fonts/inter-italic.woff2"
    type="font/woff2"
    crossorigin
  >
</head>
```

**Why three separate fonts?**
- Preload only the weight/style actually used above the fold
- Defer secondary weights with `prefetch`
- Reduces initial payload

### Variable Font Preload (Recommended)

```html
<head>
  <link rel="preconnect" href="https://fonts.example.com" crossorigin>

  <!-- Single variable font covers all weights/widths -->
  <link
    rel="preload"
    as="font"
    href="/fonts/inter-variable.woff2"
    type="font/woff2"
    crossorigin
  >
</head>

<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-variable.woff2') format('woff2-variations');
    font-display: swap;
    font-weight: 100 900;
    font-stretch: 75% 100%;
  }
</style>
```

**Advantage**: Single 50KB variable font replaces 12+ static fonts.

## Font Subsetting: Only Include What's Used

### Subset for Latin Extended

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-ext.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0100-017F; /* Latin + Latin Extended-A */
  font-display: swap;
}
```

### Dynamic Subsetting with python-fonttools

```bash
# Install fonttools
pip install fonttools brotli

# Subset font to specific characters
pyftsubset "inter-variable.woff2" \
  --unicodes="U+0000-00FF,U+0020,U+00A0-00FF" \
  --output-file="inter-subset.woff2" \
  --flavor=woff2
```

### Unicode Range for Different Scripts

```css
/* Latin only */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF;
}

/* Latin Extended A + B */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-017F, U+0180-024F;
}

/* Cyrillic */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-cyrillic.woff2') format('woff2');
  unicode-range: U+0400-04FF;
}

/* Greek */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-greek.woff2') format('woff2');
  unicode-range: U+0370-03FF;
}
```

**Result**: Users only download the characters your site actually uses.

## WOFF2: The Only Format You Need

```css
@font-face {
  font-family: 'Inter';
  /* WOFF2 is 30% smaller than WOFF1, 50% smaller than TTF */
  src: url('/fonts/inter-variable.woff2') format('woff2-variations');
  font-display: swap;
  font-weight: 100 900;
}
```

### Why WOFF2?

| Format | Size    | Compression | Browser Support |
|--------|---------|-------------|-----------------|
| WOFF2  | 50KB    | Brotli      | 98% (excellent)  |
| WOFF   | 75KB    | Deflate     | 99% (universal) |
| TTF    | 100KB   | None        | 95% (good)      |
| OTF    | 105KB   | None        | 95% (good)      |

**Chromium 143+ supports WOFF2-variations**: Variable fonts with multiple axes (weight, width, slant, optical size).

```bash
# Convert TTF to WOFF2
fonttools ttLib.woff2 convert-to-woff2 \
  --flavor=woff2 \
  inter.ttf -o inter.woff2
```

## Local Font Fallback Matching

The key to preventing layout shift is **metric-compatible fallback fonts**.

### Size-Adjust Override (Perfect Matching)

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('woff2-variations');
  font-display: swap;
  font-weight: 100 900;

  /* Override metric inconsistencies */
  size-adjust: 100%;
  ascent-override: 800; /* from font metrics */
  descent-override: 200;
  line-gap-override: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Fallback Font Stack with Metric Overrides

```css
/* System fonts as fallback with metric matching */
@supports (font-variation-settings: normal) {
  body {
    font-family: 'Inter', system-ui;
  }
}

@supports not (font-variation-settings: normal) {
  /* Older browsers: use metric-matched fallback */
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Adjust fallback metrics to match */
  @supports (size-adjust: 100%) {
    body {
      size-adjust: 105%;
      ascent-override: 850%;
    }
  }
}
```

### Generate Fallback Metrics

Use the **font-metrics-override** tool:

```bash
# Get exact metrics from a font
fonttools stat inter-variable.woff2 --metrics
# Output:
# Ascent: 800
# Descent: -200
# Line Gap: 0
```

Then set overrides:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('woff2-variations');
  ascent-override: 800;
  descent-override: 200;
  line-gap-override: 0;
}
```

## Complete Font Loading Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 1. DNS Prefetch -->
  <link rel="dns-prefetch" href="https://fonts.example.com">

  <!-- 2. Preconnect with CORS -->
  <link rel="preconnect" href="https://fonts.example.com" crossorigin>

  <!-- 3. Preload critical variable font -->
  <link
    rel="preload"
    as="font"
    href="/fonts/inter-variable.woff2"
    type="font/woff2"
    crossorigin
  >

  <style>
    /* 4. Define @font-face with swap strategy */
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-variable.woff2') format('woff2-variations');
      font-display: swap;
      font-weight: 100 900;
      font-stretch: 75% 100%;

      /* 5. Override metrics for perfect fallback matching */
      size-adjust: 100%;
      ascent-override: 800;
      descent-override: 200;
      line-gap-override: 0;
    }

    /* 6. Font stack with system fallback */
    body {
      font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
      line-height: 1.5;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <h1>Zero Layout Shift Typography</h1>
  <p>This text renders instantly with fallback, then smoothly transitions to Inter.</p>
</body>
</html>
```

## Anti-Patterns: What NOT to Do

### ✗ Don't: Use font-display: block

```css
/* WRONG: Text invisible for up to 3 seconds */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2');
  font-display: block; /* Creates FOIT */
}
```

**Why**: Users see blank space. They might leave before text appears.

### ✗ Don't: Preload Too Many Fonts

```html
<!-- WRONG: Preload every weight and style -->
<link rel="preload" as="font" href="/fonts/font-100.woff2">
<link rel="preload" as="font" href="/fonts/font-200.woff2">
<link rel="preload" as="font" href="/fonts/font-300.woff2">
<!-- ... 9 more preloads ... -->
```

**Why**: Bloats initial payload. Use variable fonts instead (1 file = all weights).

### ✗ Don't: Load Fonts from Slow CDN

```css
/* WRONG: Blocks rendering for 2+ seconds */
@font-face {
  font-family: 'SlowFont';
  src: url('https://slow-cdn.example.com/fonts/font.woff2');
}
```

**Why**: Fallback never renders, users see blank text. Use fast CDN or self-host.

### ✗ Don't: Forget crossorigin Attribute

```html
<!-- WRONG: Font might not load due to CORS -->
<link rel="preload" as="font" href="/fonts/inter.woff2">
```

**Correct**:
```html
<link rel="preload" as="font" href="/fonts/inter.woff2" crossorigin>
```

### ✗ Don't: Use Non-Metric-Matched Fallbacks

```css
/* WRONG: Fallback has different metrics = layout shift */
body {
  font-family: 'CustomFont', Arial; /* Arial is much wider */
}
```

**Result**: Text reflows when custom font loads, pushing content around.

## Quality Checklist

- [ ] Only 1 `font-display` strategy per @font-face (use `swap` for most)
- [ ] Critical fonts preloaded with `rel="preload" crossorigin`
- [ ] Using WOFF2 format exclusively (98%+ browser support)
- [ ] Font subsets created with unicode-range
- [ ] Metric-matched fallback fonts with size-adjust, ascent-override, descent-override
- [ ] Variable fonts used where possible (reduces file count)
- [ ] DNS prefetch and preconnect for external font servers
- [ ] Preload limited to fonts used above the fold (max 2-3)
- [ ] Lighthouse performance score: 90+ (fonts not blocking render)
- [ ] No FOUT visible: fallback and custom font have similar metrics
- [ ] Line heights consistent before and after font swap
- [ ] Test on slow 3G connection (DevTools throttling)

## Key Metrics to Monitor

- **First Paint (FP)**: Should not be blocked by fonts
- **Largest Contentful Paint (LCP)**: Should be < 2.5 seconds
- **Cumulative Layout Shift (CLS)**: Should be < 0.1 (no font-swap jank)
- **Font Load Time**: Should be < 100ms for critical fonts
- **Font File Size**: WOFF2 should be < 100KB per font family

## Resources

- [MDN: @font-face font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [Google Fonts: Font Display](https://fonts.google.com/metadata/fonts)
- [Web Font Loading Best Practices](https://web.dev/font-loading/)
- [Variable Fonts Explained](https://www.axis-praxis.org)
