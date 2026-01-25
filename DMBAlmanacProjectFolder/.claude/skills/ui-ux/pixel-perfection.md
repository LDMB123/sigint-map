---
name: pixel-perfection
description: Obsessive visual precision for Retina, ProMotion, and Apple Silicon displays
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "The only way to make great work is to care about the craft more than anything else." - Steve Jobs
---

# Pixel Perfection: The Art of Obsessive Visual Precision

In a world of blurry edges and misaligned elements, pixel perfection is the silent art that separates excellence from mediocrity. Every pixel tells a story of intentionality.

## Core Principles

### 1. Retina Display Optimization (2x, 3x Assets)

Apple Silicon M-series displays are unforgiving - they demand assets at 2x and 3x scales. Anything less is disrespectful to the hardware.

**Correct Approach:**
```html
<!-- SVG is the gold standard: infinite scale, tiny file size -->
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        fill="currentColor"/>
</svg>

<!-- If using raster images, provide multiple densities -->
<img
  src="icon-24.png"
  srcset="icon-24@2x.png 2x, icon-24@3x.png 3x"
  width="24"
  height="24"
  alt="Description"
/>
```

**Device Pixel Ratio Testing:**
```javascript
// Check DPR and load appropriate assets
const dpr = window.devicePixelRatio;
console.log(`Device Pixel Ratio: ${dpr}`); // Should show 2 or 3 on Apple Silicon

// Load images accordingly
const imageUrl = dpr >= 3
  ? '/images/icon@3x.png'
  : '/images/icon@2x.png';
```

### 2. Sub-pixel Rendering & Font Smoothing

**Critical CSS:**
```css
/* Enable native font smoothing for macOS */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* For headlines requiring sharpness */
h1, h2, h3 {
  -webkit-font-smoothing: subpixel-antialiased;
  text-rendering: geometricPrecision;
}

/* Prevent text rendering changes on scale */
.transform-element {
  -webkit-font-smoothing: antialiased;
  backface-visibility: hidden;
}
```

### 3. P3 Wide Gamut Color Accuracy

Apple Silicon displays support Display P3 color space. Use it.

**Modern Color Specification:**
```css
:root {
  /* Fallback for older browsers */
  --color-primary: #0071E3;

  /* Wide gamut for modern displays */
  --color-primary-p3: color(display-p3 0 0.388 0.898);

  /* Leverage color() for precise hues */
  --accent-vibrant: color(display-p3 1 0.2 0.4);
}

.button {
  /* Primary fallback, P3 for capable browsers */
  background: var(--color-primary);
  background: var(--color-primary-p3);

  color: white;
  border-radius: 8px;
  padding: 12px 24px;
}
```

**Validating Color Space:**
```javascript
// Check if Display P3 is supported
const test = document.createElement('div');
test.style.color = 'color(display-p3 1 0 0)';
const hasP3Support = test.style.color !== '';

console.log(`Display P3 Support: ${hasP3Support}`);
```

### 4. Icon Alignment to Pixel Grid

Icons must sit on a perfect grid. No fractional pixels.

**SVG Icon Perfection:**
```html
<!-- 24x24 icons on 24px grid -->
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <!-- Always use whole numbers in viewBox -->
  <!-- Icon positioned at multiples of 0.5 -->
  <g fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <path d="M10 11h4v2h-4z"/>
  </g>
</svg>

<!-- Size at exact multiples: 16, 20, 24, 32, 48, 64 -->
<img src="icon.svg" width="24" height="24" alt="Icon"/>
```

**Prevent Anti-aliasing Issues:**
```css
.icon {
  width: 24px;
  height: 24px;
  /* Ensure crisp rendering */
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
}

/* For scaled icons, use containment */
.icon--large {
  width: 48px;
  height: 48px;
  contain: layout style paint;
}
```

### 5. Transform Precision

No blurry transformed elements.

**Perfect Transform Usage:**
```css
/* Use transform instead of position for performance */
.button {
  position: relative;

  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.button:active {
  /* Transform at exact pixel values */
  transform: translate3d(0, 2px, 0) scale(0.98);

  /* GPU acceleration - essential for 120fps */
  transform: translate3d(0, 2px, 0) scaleZ(1);
}

/* NEVER use sub-pixel transforms on integer content */
.crisp-element {
  transform: translateZ(0); /* GPU layer without blur */
}

/* Avoid fractional transforms */
.avoid {
  transform: translateX(0.5px); /* BAD: Creates rendering artifacts */
}
```

### 6. Preventing Blur on Transforms

**Anti-blur strategies:**
```css
/* Use will-change judiciously */
.animation-heavy {
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

/* Ensure integer pixel rendering */
.grid-item {
  transform: translateX(0); /* Snap to grid */

  /* After animation, remove will-change */
  /* Use JavaScript to add/remove */
}

/* Container queries prevent layout shifts */
@container (min-width: 400px) {
  .element {
    width: calc(100% - 16px); /* Always integer result */
  }
}
```

**JavaScript cleanup:**
```javascript
// Add will-change only during animation
const element = document.querySelector('.element');

element.addEventListener('mouseenter', () => {
  element.style.willChange = 'transform';
});

element.addEventListener('animationend', () => {
  element.style.willChange = 'auto';
});
```

### 7. DevTools Testing Workflow

**Chrome DevTools Precision Checks:**

1. **Measure Exact Pixels:**
   - DevTools > Elements > Select element
   - View computed box model
   - Verify: width, height, padding, border all whole numbers

2. **Device Pixel Ratio Inspection:**
   ```javascript
   // Run in console
   devicePixelRatio; // Should output 2 or 3

   // Check element rendering
   const rect = document.querySelector('.element').getBoundingClientRect();
   console.log({
     width: rect.width,
     height: rect.height,
     x: rect.x,
     y: rect.y,
     // All should be multiples of 0.5 at minimum
   });
   ```

3. **Rendering Performance:**
   - Performance tab > Enable "Show paint rectangles"
   - Look for green rectangles (repaints)
   - Transforms should NOT trigger repaints

4. **Zoom Testing:**
   ```javascript
   // Test at different zoom levels
   const zoomLevels = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
   zoomLevels.forEach(zoom => {
     document.body.style.zoom = zoom;
     // Verify elements remain crisp
   });
   ```

## Quality Checklist

- [ ] All raster images provided at 2x and 3x scales
- [ ] SVGs have viewBox with integer dimensions (multiples of 8 preferred)
- [ ] Icons aligned to pixel grid (use 24px, 32px, 48px sizes)
- [ ] -webkit-font-smoothing: antialiased on body
- [ ] No fractional pixel values in layout
- [ ] Color space includes Display P3 fallbacks
- [ ] Transforms use translate3d for GPU acceleration
- [ ] DevTools confirms zero sub-pixel rendering in elements
- [ ] No blurry edges when zoomed to 150%
- [ ] All touch targets are integer pixel dimensions (44x44 minimum)

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Arbitrary decimal pixels */
.avoid {
  width: 100.5px;
  margin: 7.25px;
}

/* ✓ DO: Use grid-based spacing */
.correct {
  width: 100px;
  margin: 8px;
}

/* ❌ DO NOT: Blurry zoom transforms */
.avoid {
  transform: scale(1.05);
}

/* ✓ DO: Use crisp transforms */
.correct {
  transform: scale(1.04) scaleZ(1);
}

/* ❌ DO NOT: Mixed font smoothing */
.avoid {
  -webkit-font-smoothing: subpixel-antialiased;
  text-rendering: auto;
}

/* ✓ DO: Consistent smoothing */
.correct {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

## Testing Command

```bash
# Screenshot at exact resolution with 2x scale
screencapture -x -r screenshot.png

# View device pixel ratio
node -e "console.log('DPR Test - Run in browser DevTools')"
```

## Performance Impact

Pixel perfection is FREE when done right:
- SVG icons: 1-4KB per icon
- 2x/3x PNGs only when necessary
- GPU transforms: 60+ FPS guaranteed
- Font smoothing: No performance cost

The opposite (blurry elements, misaligned borders) costs users in attention and trust. Respect the medium.

---

**Remember:** A pixel out of place is a thousand pixels of distraction. Perfect is achievable. Demand it.
