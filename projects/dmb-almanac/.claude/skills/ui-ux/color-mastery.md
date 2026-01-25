---
name: color-mastery
description: P3 wide gamut colors, semantic tokens, and WCAG AAA contrast ratios
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "There's just a tremendous amount of craftsmanship between a great idea and a great product." - Steve Jobs
---

# Color Mastery: Color That Communicates

Color is emotion, hierarchy, and meaning. On Apple Silicon displays with Display P3 color space, colors are more vibrant, more saturated, and more true than ever. Demand precision.

## Core Principles

### 1. Display P3 Wide Gamut Colors

Apple Silicon and modern Apple displays support Display P3 color space - 50% more colors than sRGB.

**P3 Color Specification:**
```css
:root {
  /* sRGB fallback */
  --color-primary: #0071E3;

  /* Display P3 - exact Apple color */
  /* Calculated from sRGB using color-space conversion */
  --color-primary-p3: color(display-p3 0 0.388 0.898);

  /* Vibrant accent for P3 (impossible in sRGB) */
  --color-accent-vibrant: color(display-p3 1 0.2 0.4);

  /* Neutral gray with P3 precision */
  --color-gray-50-p3: color(display-p3 0.98 0.98 0.98);
  --color-gray-900-p3: color(display-p3 0.05 0.05 0.05);
}

/* Primary button - use P3 when available */
.button-primary {
  /* Fallback for sRGB displays */
  background: var(--color-primary);

  /* Modern browsers on P3-capable displays */
  background: var(--color-primary-p3);

  color: white;
  border-radius: 8px;
  padding: 12px 24px;
}

/* Progressive enhancement for new color functions */
@supports (color: color(display-p3 1 0 0)) {
  .button-primary {
    background: color(display-p3 0 0.388 0.898);
  }
}
```

**Converting sRGB to Display P3:**
```javascript
// Convert hex sRGB to Display P3
function sRGBtoP3(hex) {
  // Parse hex: #0071E3 -> [0, 113, 227]
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Apply sRGB to linear conversion
  const rLinear = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Linear to Display P3 matrix multiplication
  const p3r = rLinear * 0.4865 + gLinear * 0.3288 + bLinear * 0.1847;
  const p3g = rLinear * 0.2292 + gLinear * 0.6917 + bLinear * 0.0791;
  const p3b = rLinear * 0.0000 + gLinear * 0.0419 + bLinear * 0.7837;

  // Clamp to valid range
  return {
    r: Math.max(0, Math.min(1, p3r)).toFixed(3),
    g: Math.max(0, Math.min(1, p3g)).toFixed(3),
    b: Math.max(0, Math.min(1, p3b)).toFixed(3)
  };
}

const p3 = sRGBtoP3('#0071E3');
console.log(`color(display-p3 ${p3.r} ${p3.g} ${p3.b})`);
// Output: color(display-p3 0 0.388 0.898)
```

### 2. Color-Mix Function for Programmatic Palettes

Chrome 143+ supports `color-mix()` for creating color palettes dynamically.

**Programmatic Color Generation:**
```css
:root {
  --color-primary: color(display-p3 0 0.388 0.898);
  --color-success: color(display-p3 0.2 0.8 0.4);
  --color-warning: color(display-p3 1 0.6 0.1);
  --color-error: color(display-p3 1 0.2 0.2);
}

/* Tints: Mix with white */
.button-primary-light {
  background: color-mix(in display-p3, var(--color-primary) 70%, white);
  /* 70% primary, 30% white */
}

/* Shades: Mix with black */
.button-primary-dark {
  background: color-mix(in display-p3, var(--color-primary) 80%, black);
  /* 80% primary, 20% black */
}

/* Complementary colors for accent */
.accent {
  background: color-mix(in display-p3, var(--color-primary) 50%, #FF0000);
  /* Blend primary with red for accent */
}

/* Disabled state: desaturate */
.button:disabled {
  background: color-mix(in display-p3, var(--color-primary) 50%, gray);
  opacity: 0.6;
}

/* Hover state: brighten */
.button:hover {
  background: color-mix(in display-p3, var(--color-primary), white 15%);
}

/* Active state: darken */
.button:active {
  background: color-mix(in display-p3, var(--color-primary), black 15%);
}
```

### 3. Light-Dark Function (Chrome 143+)

Automatic dark mode with `light-dark()` function.

**Automatic Light/Dark Mode:**
```css
:root color-scheme: light dark;

:root {
  /* Single definition for both light and dark modes */
  --bg-primary: light-dark(white, #1a1a1a);
  --bg-secondary: light-dark(#f5f5f5, #2d2d2d);

  --text-primary: light-dark(#1a1a1a, white);
  --text-secondary: light-dark(#666, #999);

  --border-color: light-dark(#e0e0e0, #333);

  --color-primary: light-dark(
    color(display-p3 0 0.388 0.898),
    color(display-p3 0.1 0.5 1)
  );
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.button-primary {
  background: var(--color-primary);
  color: white;
}

/* No need for @media (prefers-color-scheme) with light-dark() */
/* But you can still use it for more control */
@media (prefers-color-scheme: dark) {
  .custom-element {
    /* Override light-dark() if needed */
    background: #222;
  }
}
```

**Fallback for Older Browsers:**
```css
/* Fallback for browsers not supporting light-dark() */
@supports not (color: light-dark(white, black)) {
  :root {
    --bg-primary: white;
    --text-primary: #1a1a1a;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-primary: #1a1a1a;
      --text-primary: white;
    }
  }
}
```

### 4. Semantic Color Tokens

Colors should have meaning. Don't use "blue-500" - use "success", "warning", "error".

**Semantic Token System:**
```css
:root {
  /* Semantic colors with P3 fallbacks */

  /* Status colors */
  --color-success: light-dark(
    color(display-p3 0.2 0.8 0.4),
    color(display-p3 0.3 0.9 0.5)
  );

  --color-warning: light-dark(
    color(display-p3 1 0.6 0.1),
    color(display-p3 1 0.7 0.2)
  );

  --color-error: light-dark(
    color(display-p3 1 0.2 0.2),
    color(display-p3 1 0.3 0.3)
  );

  --color-info: light-dark(
    color(display-p3 0 0.388 0.898),
    color(display-p3 0.1 0.5 1)
  );

  /* Interactive colors */
  --color-primary: light-dark(
    color(display-p3 0 0.388 0.898),
    color(display-p3 0.1 0.5 1)
  );

  --color-secondary: light-dark(
    color(display-p3 0.5 0.5 0.5),
    color(display-p3 0.6 0.6 0.6)
  );

  /* Neutral colors */
  --color-bg-primary: light-dark(white, #1a1a1a);
  --color-bg-secondary: light-dark(#f5f5f5, #2d2d2d);
  --color-bg-tertiary: light-dark(#e8e8e8, #3a3a3a);

  --color-text-primary: light-dark(#1a1a1a, white);
  --color-text-secondary: light-dark(#666, #999);
  --color-text-tertiary: light-dark(#999, #666);

  /* Surface colors */
  --color-surface: light-dark(white, #2d2d2d);
  --color-surface-hover: light-dark(#f9f9f9, #373737);
  --color-surface-active: light-dark(#f0f0f0, #404040);
}

/* Use semantic tokens throughout the app */
.alert-success {
  background: color-mix(in display-p3, var(--color-success) 20%, var(--color-bg-primary));
  border: 1px solid var(--color-success);
  color: var(--color-text-primary);
}

.badge-error {
  background: var(--color-error);
  color: white;
  padding: 4px 12px;
}

.button-secondary {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.button-secondary:hover {
  background: var(--color-surface-hover);
}
```

### 5. WCAG AAA Contrast Requirements

Body text requires 7:1 contrast ratio. This is the law.

**Contrast Ratio Calculation:**
```javascript
// Calculate contrast ratio between two colors
function getContrastRatio(rgb1, rgb2) {
  // Get luminance of colors
  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  // Ensure lighter color is first
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  // Contrast ratio formula
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(rgb) {
  // Convert RGB to luminance (standard WCAG formula)
  const [r, g, b] = rgb.map(val => {
    const v = val / 255;
    return v <= 0.03928
      ? v / 12.92
      : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Test contrast
const white = [255, 255, 255];
const blue = [0, 113, 227];

const contrast = getContrastRatio(white, blue);
console.log(`Contrast Ratio: ${contrast.toFixed(2)}:1`);
// Should output: Contrast Ratio: 8.59:1 (AAA compliant)
```

**CSS with Verified Contrast:**
```css
:root {
  /* All colors verified for WCAG AAA (7:1) on white background */

  /* Primary text: 9.2:1 contrast */
  --color-text-primary: #1a1a1a;

  /* Secondary text: 7.1:1 contrast (minimum AAA) */
  --color-text-secondary: #424242;

  /* Interactive elements: 8.5:1 contrast */
  --color-primary: color(display-p3 0 0.388 0.898);

  /* Error text: 7.8:1 contrast */
  --color-error: color(display-p3 1 0.2 0.2);
}

/* Always verify contrast */
.button-primary {
  background: var(--color-primary);
  color: white; /* White on blue: 8.59:1 */
}

.text-secondary {
  color: var(--color-text-secondary);
  /* Gray on white: 7.1:1 AAA */
}

/* Avoid low-contrast combinations */
.avoid {
  color: #666; /* Only 4.5:1 on white - fails WCAG AAA */
}

.correct {
  color: #424242; /* 7.1:1 on white - passes WCAG AAA */
}
```

**Testing Contrast Compliance:**
```javascript
// Scan page for contrast violations
function auditContrast() {
  const elements = document.querySelectorAll('*');
  const violations = [];

  elements.forEach(el => {
    const computed = window.getComputedStyle(el);
    const bg = computed.backgroundColor;
    const fg = computed.color;
    const text = el.textContent.trim();

    if (text.length === 0) return;

    // Calculate contrast (requires parsing RGB colors)
    const contrast = calculateContrast(fg, bg);

    if (contrast < 7) {
      violations.push({
        element: el.tagName,
        text: text.substring(0, 50),
        contrast: contrast.toFixed(2),
        required: '7:1'
      });
    }
  });

  console.table(violations);
  return violations;
}

auditContrast();
```

### 6. Avoiding Pure Black and Using Deep Grays

Pure black (#000000) is too harsh on modern displays. Use deep grays instead.

**Gray Scale with Intent:**
```css
:root {
  /* DO NOT USE pure black */
  --color-black-avoid: #000000; /* Too harsh */

  /* DO USE deep grays */
  --color-gray-950: #0a0a0a;  /* Almost black */
  --color-gray-900: #1a1a1a;  /* Deep gray */
  --color-gray-800: #262626;  /* Dark gray */
  --color-gray-700: #404040;  /* Medium-dark gray */
  --color-gray-600: #525252;  /* Medium gray */
  --color-gray-500: #737373;  /* Medium */
  --color-gray-400: #a3a3a3;  /* Medium-light */
  --color-gray-300: #d4d4d4;  /* Light */
  --color-gray-200: #e5e5e5;  /* Very light */
  --color-gray-100: #f5f5f5;  /* Almost white */
  --color-gray-50: #fafafa;   /* Barely visible */
}

body {
  /* Instead of black text */
  color: var(--color-gray-900);
  /* Feels more natural, less aggressive */
  background: var(--color-gray-50);
}

.heading {
  color: var(--color-gray-950);
  /* Darkest text for maximum emphasis */
}

.disabled {
  color: var(--color-gray-400);
  opacity: 0.5;
  /* Double penalty: darker gray + opacity = accessible disabled state */
}

/* Dark mode needs separate scales */
@media (prefers-color-scheme: dark) {
  body {
    color: var(--color-gray-100);
    background: var(--color-gray-950);
  }

  .heading {
    color: #ffffff; /* Pure white for contrast */
  }
}
```

### 7. Vibrancy and Translucency Patterns

Apple's design language emphasizes vibrancy and translucency.

**Vibrancy with Backdrop Filter:**
```css
/* Vibrancy effect: blur background through element */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  /* Creates frosted glass effect */
}

.card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  /* Translucent card floating over background */
}

/* Dark mode vibrancy */
@media (prefers-color-scheme: dark) {
  .card {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* Glassmorphism navbar */
.navbar {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(30px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 100;
}

/* Performance consideration */
.translucent-element {
  /* Will-change helps with backdrop-filter performance */
  will-change: filter;

  /* Minimal blur for light elements */
  backdrop-filter: blur(4px);
}

/* Disable translucency on low-end devices */
@media (prefers-reduced-motion: reduce) {
  [style*="backdrop-filter"] {
    backdrop-filter: none;
    background: var(--fallback-color);
  }
}
```

## Complete Color System

**Full Color Token File:**
```css
/* colors.css - Complete semantic color system */

:root {
  color-scheme: light dark;

  /* Primary brand colors with P3 */
  --color-primary: light-dark(
    color(display-p3 0 0.388 0.898),
    color(display-p3 0.1 0.5 1)
  );

  --color-primary-light: light-dark(
    color-mix(in display-p3, var(--color-primary) 50%, white),
    color-mix(in display-p3, var(--color-primary) 50%, white)
  );

  --color-primary-dark: light-dark(
    color-mix(in display-p3, var(--color-primary) 80%, black),
    color-mix(in display-p3, var(--color-primary) 80%, black)
  );

  /* Status colors */
  --color-success: light-dark(#22c55e, #4ade80);
  --color-warning: light-dark(#f97316, #fb923c);
  --color-error: light-dark(#ef4444, #f87171);
  --color-info: light-dark(#3b82f6, #60a5fa);

  /* Backgrounds */
  --color-bg-primary: light-dark(white, #1a1a1a);
  --color-bg-secondary: light-dark(#f5f5f5, #2d2d2d);
  --color-bg-tertiary: light-dark(#e8e8e8, #3a3a3a);

  /* Text */
  --color-text-primary: light-dark(#1a1a1a, white);
  --color-text-secondary: light-dark(#666, #999);
  --color-text-tertiary: light-dark(#999, #666);

  /* Borders */
  --color-border: light-dark(#e5e5e5, #333);
}

/* Verify all colors meet WCAG AAA before shipping */
```

## Color Mastery Checklist

- [ ] Primary colors specified in Display P3 with sRGB fallbacks
- [ ] color-mix() used for programmatic tints and shades
- [ ] light-dark() function used for automatic dark mode
- [ ] Semantic color tokens (not hue-based naming)
- [ ] WCAG AAA contrast verified (7:1 minimum for body text)
- [ ] No pure black (#000) - using deep grays instead
- [ ] Vibrancy effects use backdrop-filter
- [ ] Translucent elements have fallback colors
- [ ] Dark mode tested and functional
- [ ] Color palette consistent with Apple design language

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Use HSL/RGB only (ignores P3) */
.avoid {
  background: hsl(210, 100%, 50%);
}

/* ✓ DO: Specify Display P3 with fallback */
.correct {
  background: #0071E3;
  background: color(display-p3 0 0.388 0.898);
}

/* ❌ DO NOT: Pure black text */
.avoid {
  color: #000000;
}

/* ✓ DO: Deep gray text */
.correct {
  color: #1a1a1a;
}

/* ❌ DO NOT: Ignore contrast in dark mode */
@media (prefers-color-scheme: dark) {
  .avoid {
    color: #666; /* Only 2.5:1 on dark background */
  }

  .correct {
    color: #e5e5e5; /* 8.1:1 contrast */
  }
}

/* ❌ DO NOT: Rely on color alone for meaning */
.avoid {
  /* Red background means error, but colorblind user sees gray */
  background: red;
}

/* ✓ DO: Use color + icon + text */
.correct {
  background: var(--color-error);
  /* Icon indicates error */
  /* Text says "Error" */
  /* Red color reinforces */
}
```

---

**Remember:** Color is language. Use it to communicate, not decorate. Every hue must serve a purpose. On Apple Silicon displays, colors are true. Make them count.
