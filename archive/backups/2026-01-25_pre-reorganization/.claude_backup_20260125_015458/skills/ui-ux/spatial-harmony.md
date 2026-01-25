---
name: spatial-harmony
description: 8px grid systems, CSS Grid, container queries, and golden ratio proportions
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "The only way to make great work is to do what you love and care deeply about the craft." - Steve Jobs
---

# Spatial Harmony: Layout with Mathematical Precision

Space is not emptiness. It is rhythm, order, and breathing room. Every pixel of spacing must be intentional. When all spacing is a multiple of 8, magic happens.

## Core Principles

### 1. 8px Grid System

The foundation of all spacing. Every dimension is a multiple of 8px. No exceptions.

**8px Grid Foundation:**
```css
:root {
  /* 8px grid baseline - all spacing derives from this */
  --space-base: 8px;

  /* Scale: 1x, 2x, 3x, 4x, 5x, 6x, 8x, 10x */
  --space-xs: calc(var(--space-base) * 1);    /* 8px */
  --space-sm: calc(var(--space-base) * 2);    /* 16px */
  --space-md: calc(var(--space-base) * 3);    /* 24px */
  --space-lg: calc(var(--space-base) * 4);    /* 32px */
  --space-xl: calc(var(--space-base) * 5);    /* 40px */
  --space-2xl: calc(var(--space-base) * 6);   /* 48px */
  --space-3xl: calc(var(--space-base) * 8);   /* 64px */
  --space-4xl: calc(var(--space-base) * 10);  /* 80px */

  /* Border radius: also multiples of 8 */
  --radius-sm: 4px;      /* Half of 8px */
  --radius-md: 8px;      /* One grid unit */
  --radius-lg: 16px;     /* Two grid units */
  --radius-full: 9999px; /* Circular */

  /* Shadows aligned to grid */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.15);
}

/* Container padding always multiple of 8 */
.container {
  padding: var(--space-lg); /* 32px all sides */
  max-width: 1200px;
}

/* Components respect grid */
.button {
  padding: var(--space-sm) var(--space-md); /* 16px vertical, 24px horizontal */
  border-radius: var(--radius-md);
  min-height: 44px; /* Clickable */
}

.card {
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.input {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  min-height: 44px;
}

/* Spacing between elements */
.section {
  margin-bottom: var(--space-2xl); /* 48px */
}

.section + .section {
  margin-top: var(--space-2xl); /* Prevents margin collapse */
}

/* Grid gaps always aligned */
.grid {
  display: grid;
  gap: var(--space-md); /* 24px between items */
}

.flex-row {
  display: flex;
  gap: var(--space-sm); /* 16px between items */
}
```

**Verify Grid Alignment:**
```javascript
// Check if all spacing values are multiples of 8
function auditGridAlignment() {
  const elements = document.querySelectorAll('*');
  const violations = [];

  const spacingProps = ['padding', 'margin', 'gap', 'borderRadius'];
  const gridUnit = 8;

  elements.forEach(el => {
    const computed = window.getComputedStyle(el);

    spacingProps.forEach(prop => {
      let value = computed[prop];

      if (!value || value === '0px') return;

      // Parse pixel value
      const pixels = parseFloat(value);

      // Check if multiple of 8
      if (pixels % gridUnit !== 0 && pixels !== 0) {
        violations.push({
          element: el.tagName,
          property: prop,
          value: value,
          aligned: false
        });
      }
    });
  });

  if (violations.length > 0) {
    console.warn('Grid alignment violations:');
    console.table(violations);
  } else {
    console.log('All spacing perfectly aligned to 8px grid!');
  }

  return violations;
}

auditGridAlignment();
```

### 2. Golden Ratio Proportions

For more organic, mathematically pleasing layouts, use the golden ratio (1.618).

**Golden Ratio Applications:**
```css
:root {
  /* Golden ratio constant */
  --golden-ratio: 1.618;

  /* Use for container widths */
  --width-content: 1000px;
  --width-sidebar: calc(var(--width-content) / var(--golden-ratio)); /* ~618px */

  /* Use for typography scales */
  --font-scale: 1.25; /* Modular scale */
  --font-base: 16px;
  --font-size-1: calc(var(--font-base) * var(--font-scale));      /* 20px */
  --font-size-2: calc(var(--font-base) * var(--font-scale) * var(--font-scale));
  --font-size-3: calc(var(--font-size-2) * var(--font-scale));
}

/* Two-column layout with golden ratio proportions */
.layout-golden {
  display: grid;
  grid-template-columns: 1fr var(--golden-ratio)fr;
  gap: var(--space-lg);
  /* Sidebar is wider than content by golden ratio */
}

.article {
  /* Golden ratio width for optimal reading */
  width: 100%;
  max-width: calc(var(--width-content) / var(--golden-ratio) * 2);
  /* ~1236px */
}

/* Image aspect ratio using golden ratio */
.image-golden {
  aspect-ratio: var(--golden-ratio) / 1;
  /* 1.618:1 proportion */
}

/* Three-column with golden ratio split */
.layout-three-column {
  display: grid;
  grid-template-columns:
    calc(100% / (1 + var(--golden-ratio) + 1))
    calc(100% * var(--golden-ratio) / (1 + var(--golden-ratio) + 1))
    calc(100% / (1 + var(--golden-ratio) + 1));
  gap: var(--space-lg);
  /* Sidebar - Content - Sidebar proportions */
}
```

**Visual Check:**
```javascript
// Verify golden ratio proportions
const goldenRatio = 1.618;

function checkGoldenRatio(element) {
  const rect = element.getBoundingClientRect();
  const actualRatio = Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height);
  const tolerance = 0.05;

  const isGolden = Math.abs(actualRatio - goldenRatio) < tolerance;

  return {
    element: element,
    width: rect.width,
    height: rect.height,
    ratio: actualRatio.toFixed(3),
    isGolden: isGolden
  };
}
```

### 3. CSS Grid for Complex Layouts

Grid enables precise spatial control without awkward nesting.

**Powerful Grid Patterns:**
```css
/* Responsive grid that respects 8px spacing */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md); /* 24px gap */
  align-items: start;
}

/* Specific column layout */
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}

/* Complex grid with named areas */
.layout-dashboard {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 64px 1fr;
  gap: var(--space-sm);
  height: 100vh;

  grid-template-areas:
    "sidebar header"
    "sidebar main";
}

.sidebar { grid-area: sidebar; }
.header { grid-area: header; }
.main { grid-area: main; }

/* Masonry-like layout with grid */
.grid-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  grid-auto-rows: masonry;
  gap: var(--space-md);
}

/* Responsive grid */
@media (max-width: 1024px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }

  .layout-dashboard {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main";
  }
}
```

### 4. Container Queries for Component Responsiveness

Components respond to their container width, not viewport width.

**Container Query Pattern:**
```css
/* Define container context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

.card {
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

/* Component changes layout based on container width */
@container (min-width: 300px) {
  .card {
    padding: var(--space-md);
  }

  .card-header {
    display: flex;
    gap: var(--space-sm);
  }
}

@container (min-width: 500px) {
  .card {
    padding: var(--space-lg);
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: var(--space-md);
  }

  .card-image {
    width: 100%;
    height: auto;
  }
}

@container (min-width: 800px) {
  .card {
    grid-template-columns: 200px 1fr 200px;
  }
}

/* Container query for spacing */
@container (max-width: 400px) {
  .card-grid {
    gap: var(--space-sm); /* Tighter on small containers */
  }
}

@container (min-width: 800px) {
  .card-grid {
    gap: var(--space-lg); /* Roomier on large containers */
  }
}
```

### 5. Aspect Ratio Property

Maintain consistent proportions without hacks.

**Perfect Aspect Ratios:**
```css
:root {
  /* Standard aspect ratios */
  --aspect-square: 1 / 1;
  --aspect-video: 16 / 9;
  --aspect-instagram: 4 / 5;
  --aspect-golden: 1.618 / 1;
}

/* Image containers with aspect ratio */
.image-container {
  width: 100%;
  aspect-ratio: var(--aspect-video);
  /* Automatically maintains 16:9 ratio */
  object-fit: cover;
  border-radius: var(--radius-md);
}

.thumbnail {
  width: 200px;
  aspect-ratio: var(--aspect-square);
  /* Always square, any resize is smooth */
}

.profile-photo {
  width: 80px;
  height: 80px;
  aspect-ratio: 1;
  /* Perfect circle when border-radius: 50% */
  border-radius: 50%;
}

/* Responsive aspect ratio */
.hero-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  /* Same aspect ratio on all screen sizes */
}

@media (max-width: 640px) {
  .hero-image {
    aspect-ratio: 4 / 3;
    /* Different aspect on mobile */
  }
}

/* Multiple aspect ratios for srcset */
.responsive-image {
  width: 100%;
  aspect-ratio: 16 / 9;
}

@media (max-width: 640px) {
  .responsive-image {
    aspect-ratio: 4 / 5;
  }
}
```

### 6. Safe Area Insets for Notches

Respect physical device features.

**Notch-Safe Layouts:**
```css
/* Safe area insets for devices with notches */
:root {
  /* CSS Env variables automatically updated by browser */
  --safe-area-inset-top: env(safe-area-inset-top, 0);
  --safe-area-inset-right: env(safe-area-inset-right, 0);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0);
  --safe-area-inset-left: env(safe-area-inset-left, 0);
}

/* Sidebar respects notch */
.sidebar {
  padding-top: calc(var(--space-lg) + var(--safe-area-inset-top));
  padding-right: calc(var(--space-lg) + var(--safe-area-inset-right));
  padding-bottom: calc(var(--space-lg) + var(--safe-area-inset-bottom));
  padding-left: calc(var(--space-lg) + var(--safe-area-inset-left));
}

/* Sticky header respects top notch */
.sticky-header {
  position: sticky;
  top: var(--safe-area-inset-top);
  padding-top: var(--space-md);
  padding-bottom: var(--space-md);
}

/* Bottom navigation respects home indicator */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: calc(var(--space-md) + var(--safe-area-inset-bottom));
}

/* Full viewport content respects all safe areas */
.viewport-full {
  padding:
    calc(var(--safe-area-inset-top) + var(--space-lg))
    calc(var(--safe-area-inset-right) + var(--space-lg))
    calc(var(--safe-area-inset-bottom) + var(--space-lg))
    calc(var(--safe-area-inset-left) + var(--space-lg));
}
```

**Testing Safe Areas:**
```javascript
// Check safe area values
const safeAreas = {
  top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')),
  right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right')),
  bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')),
  left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left'))
};

console.log('Safe Areas:', safeAreas);
```

## Complete Spacing System

**Space Scale Reference:**
```css
/* Comprehensive spacing scale */
:root {
  /* Micro spacing: fine details */
  --space-px: 1px;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-2: 8px;

  /* Small spacing: tight layouts */
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  /* Medium spacing: standard layouts */
  --space-7: 28px;
  --space-8: 32px;
  --space-9: 36px;
  --space-10: 40px;

  /* Large spacing: generous layouts */
  --space-11: 44px;
  --space-12: 48px;
  --space-14: 56px;
  --space-16: 64px;

  /* Extra large spacing: hero sections */
  --space-20: 80px;
  --space-24: 96px;
  --space-28: 112px;
  --space-32: 128px;
}

/* Usage examples */
.button { padding: var(--space-3) var(--space-5); }
.card { padding: var(--space-6); }
.section { margin-bottom: var(--space-12); }
.grid { gap: var(--space-5); }
```

## Responsive Grid Breakpoints

```css
/* Standard breakpoints aligned with Chromium */
:root {
  --breakpoint-mobile: 640px;   /* Small phones */
  --breakpoint-tablet: 1024px;  /* Tablets */
  --breakpoint-desktop: 1280px; /* Desktops */
  --breakpoint-wide: 1536px;    /* Ultra-wide */
}

/* Mobile-first approach */
.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 640px) {
  .layout {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-5);
  }
}

@media (min-width: 1024px) {
  .layout {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6);
  }
}

@media (min-width: 1280px) {
  .layout {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-6);
  }
}
```

## Spatial Harmony Checklist

- [ ] All spacing is multiple of 8px
- [ ] Padding/margin use spacing scale variables
- [ ] Border radius uses defined scale (4px, 8px, 16px)
- [ ] Gap between grid items is from spacing scale
- [ ] No arbitrary pixel values in layout
- [ ] Container queries used for responsive components
- [ ] Aspect ratio property used for image containers
- [ ] Safe area insets handled for notches
- [ ] Golden ratio applied to key proportions
- [ ] Responsive breakpoints clearly defined

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Arbitrary spacing values */
.avoid {
  padding: 13px 27px;
  margin-bottom: 31px;
  gap: 11px;
}

/* ✓ DO: Use spacing scale */
.correct {
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-lg);
  gap: var(--space-md);
}

/* ❌ DO NOT: Manual sizing without aspect ratio */
.avoid {
  width: 300px;
  height: 169px;
  /* If width changes, aspect breaks */
}

/* ✓ DO: Use aspect-ratio property */
.correct {
  width: 300px;
  aspect-ratio: 16 / 9;
  /* Maintains ratio automatically */
}

/* ❌ DO NOT: Viewport-only responsive design */
.avoid {
  display: none; /* On small viewport */
}

/* ✓ DO: Use container queries */
@container (max-width: 400px) {
  .element {
    display: none; /* On small container */
  }
}
```

---

**Remember:** Space is not wasted. It's the breathing room that makes design feel luxurious. Every gap, every padding, every margin must follow the rhythm. When spacing is intentional, the entire layout sings.
