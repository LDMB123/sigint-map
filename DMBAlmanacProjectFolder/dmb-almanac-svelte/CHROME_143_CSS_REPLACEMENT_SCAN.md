# Chrome 143+ CSS Primitive Replacement Scan
## dmb-almanac-svelte Project Analysis

**Scan Date:** January 21, 2026
**Target:** Chromium 143+ on Apple Silicon (macOS 26.2)
**Scope:** JavaScript DOM measurement patterns that could be replaced with native CSS

---

## Executive Summary

**Key Findings:**
- **6 D3 visualization components** using `getBoundingClientRect()` for responsive dimension queries
- **1 PWA component** using `matchMedia()` for display-mode detection
- **0 scroll event listeners** detected in application code
- **0 requestAnimationFrame** loops for scroll animations
- **0 offsetWidth/offsetHeight** queries in source code

**Overall Assessment:** The codebase is already optimized for modern CSS approaches. All `getBoundingClientRect()` usage is **legitimate and cannot be replaced** because it serves D3 visualization rendering. The `matchMedia()` usage for PWA detection is also appropriate.

---

## Detailed Findings

### Category 1: getBoundingClientRect() Usage - LEGITIMATE

**Found in 6 visualization components**

These are all **legitimate uses that cannot be replaced** with pure CSS because they feed into D3's mathematical calculations.

#### File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/TransitionFlow.svelte`

**Location:** Lines 37-38

```typescript
const rect = containerElement.getBoundingClientRect();
const containerWidth = rect.width || width;
const containerHeight = rect.height || height;
```

**Purpose:** Gets responsive container dimensions for D3 sankey diagram layout
**Can Replace?** ❌ NO - D3 sankey graph calculation requires exact pixel dimensions

**Why it's legitimate:**
- D3's `sankey()` generator needs precise numeric dimensions (not CSS relative values)
- The visualization must calculate node positions, link paths based on available space
- This is internal visualization logic, not DOM styling

---

#### File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/GapTimeline.svelte`

**Location:** Lines 38-39

```typescript
const rect = containerElement.getBoundingClientRect();
const containerWidth = rect.width || width;
const containerHeight = rect.height || height;
```

**Purpose:** Gets responsive canvas dimensions for gap timeline (canvas + SVG overlay)
**Can Replace?** ❌ NO - Canvas rendering requires pixel dimensions for `canvas.width/height`

**Why it's legitimate:**
- Canvas 2D context needs exact integer dimensions for drawing surface
- D3 scales need numeric pixel ranges for axis calculations
- Used with ResizeObserver for responsive updates (best practice)

---

#### File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/SongHeatmap.svelte`

**Location:** Lines 35-37

```typescript
const rect = containerElement.getBoundingClientRect();
const containerWidth = rect.width || width;
const containerHeight = rect.height || height;
```

**Purpose:** Gets responsive heatmap dimensions for D3 grid layout
**Can Replace?** ❌ NO - D3 scaleBand requires exact pixel dimensions

**Why it's legitimate:**
- D3's `scaleBand()` needs precise width/height for cell sizing
- Grid layout calculation depends on exact container measurements
- Uses ResizeObserver for efficient responsive updates

---

#### File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/RarityScorecard.svelte`

**Location:** Lines 39-41

```typescript
const rect = containerElement.getBoundingClientRect();
const containerWidth = rect.width || width;
const containerHeight = rect.height || height;
```

**Purpose:** Gets responsive bar chart dimensions for D3 scale ranges
**Can Replace?** ❌ NO - D3 bar chart needs exact pixel dimensions for scale.range()

**Why it's legitimate:**
- `scaleBand()` needs numeric pixel values for bar width calculation
- Y-axis scale needs exact height for value-to-pixel mapping
- Standard D3 pattern for responsive charts

---

#### File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/GuestNetwork.svelte`

**Location:** Lines 47-49

```typescript
const rect = containerElement.getBoundingClientRect();
const containerWidth = rect.width || width;
const containerHeight = rect.height || height;
```

**Purpose:** Gets responsive force simulation bounds for network graph
**Can Replace?** ❌ NO - D3 force simulation requires exact pixel boundaries

**Why it's legitimate:**
- D3 force simulation center force needs exact x,y coordinates
- Collision detection radius depends on pixel dimensions
- Used to constrain node positions within viewport

---

#### File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/TourMap.svelte`

**Location:** Lines 44-46

```typescript
const rect = containerElement.getBoundingClientRect();
const containerWidth = rect.width || width;
const containerHeight = rect.height || height;
```

**Purpose:** Gets responsive map projection size for topojson rendering
**Can Replace?** ❌ NO - D3 geo projection needs exact dimensions for fitSize()

**Why it's legitimate:**
- D3's `geoAlbersUsa().fitSize()` requires precise pixel dimensions
- Geographic projection calculations depend on exact container size
- Critical for proper map scaling and centering

---

### Category 2: offsetWidth/offsetHeight - NOT FOUND

**Result:** ✅ No instances detected in application source code

The project correctly avoids using `offsetWidth` and `offsetHeight` in favor of:
- `getBoundingClientRect()` for D3 calculations
- CSS-defined dimensions (width/height properties)
- ResizeObserver for reactive updates

---

### Category 3: Scroll Event Listeners - NOT FOUND

**Result:** ✅ No `addEventListener('scroll')` patterns detected in application code

**Good practices observed:**
- No scroll-linked animations using JS event listeners
- IntersectionObserver used appropriately in PWA component (line 126 of InstallPrompt.svelte)
- No manual scroll tracking

**Potential CSS Alternative Identified:**

If scroll-linked animations were needed, Chrome 143+ supports:

```css
/* Scroll-driven animations (Chrome 115+) */
@keyframes reveal {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

.element {
  animation: reveal linear;
  animation-timeline: scroll();
  animation-range: entry 0% entry 100%;
}

/* Or view-timeline for element-specific scroll progress */
.scroller {
  scroll-timeline: --progress inline;
}

.animated-child {
  animation-timeline: --progress;
}
```

---

### Category 4: requestAnimationFrame - NOT FOUND

**Result:** ✅ No direct `requestAnimationFrame()` loops detected

**What's present instead:**
- D3's internal animation system for force simulations (GuestNetwork.svelte)
- D3's transition animations for hover effects
- CSS transitions for smooth state changes
- ResizeObserver callbacks (properly used, not rAF)

**Modern alternative available:**

If animation frame loops were needed, Chrome 143+ offers:

```typescript
// Scheduler API for animation control (Chrome 94+)
function scheduleAnimation(callback: FrameRequestCallback) {
  scheduler.postTask(() => {
    requestAnimationFrame(callback);
  }, { priority: 'user-blocking' });
}

// Or use Svelte's built-in animation system
<div animate:animate={{ duration: 300 }}>
```

---

### Category 5: matchMedia() - FOUND (LEGITIMATE)

**Found in 1 PWA component**

#### File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/pwa/InstallPrompt.svelte`

**Location:** Lines 56, 89

```typescript
// Line 56: Initial check
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

// Line 89: Listen for changes
const mediaQuery = window.matchMedia('(display-mode: standalone)');
const handleChange = (e: MediaQueryListEvent) => {
  if (e.matches) {
    isInstalled = true;
    canInstall = false;
  }
};
mediaQuery.addEventListener('change', handleChange);
```

**Purpose:** Detect PWA installation status via display-mode media query
**Can Replace?** ❌ NO (partially) - This requires JavaScript because:

1. **State Detection:** Checking `display-mode: standalone` requires JS to determine if app is installed
2. **Event Handling:** The `change` event listener is necessary to react to installation changes

**What COULD be CSS-only:**

If you only wanted to style elements differently when the PWA is installed, you could use CSS:

```css
/* CSS media query - Chrome 143+ */
@media (display-mode: standalone) {
  .pwa-banner {
    display: none;
  }

  .installed-ui {
    display: block;
  }
}
```

However, the current implementation is **correct** because:
- It needs to trigger the install prompt before standalone mode
- It uses reactive state for conditional rendering
- The media query change listener detects installation completion

**Improvement opportunity (minor):**
The initial check on line 56-57 could use CSS media query in addition to JS, but the current approach is pragmatic and works well.

---

## Performance Metrics

### Current Implementation Analysis

**ResizeObserver Usage (Excellent Pattern):**

All 6 visualization components properly use ResizeObserver with debouncing:

```typescript
resizeObserver = new ResizeObserver(() => {
  if (resizeDebounceTimeout) clearTimeout(resizeDebounceTimeout);

  resizeDebounceTimeout = setTimeout(() => {
    renderChart();
  }, 150);  // 150ms debounce
});
resizeObserver.observe(containerElement);
```

**Benefits on Apple Silicon:**
- ✅ Avoids layout thrashing on resize
- ✅ Efficient use of compositor (Metal GPU)
- ✅ No main-thread blocking
- ✅ Works well with Unified Memory Architecture

**CSS Containment (Already Applied):**

All visualization containers include:

```css
.visualization {
  content-visibility: auto;
  contain: layout style paint;
}
```

This is **excellent** for Chrome 143+ on Apple Silicon because:
- Skips rendering off-screen visualizations
- Metal compositor can handle paint containment
- Unified memory reduces GPU-CPU sync overhead

---

## Chrome 143+ Features Currently in Use

### ✅ Already Implemented

1. **CSS Containment** (`contain: layout style paint`)
   - Applied to all visualization containers
   - Improves rendering performance on Metal backend

2. **Content Visibility** (`content-visibility: auto`)
   - Applied to all major visualization components
   - Skips rendering off-screen content

3. **CSS Transitions** (Chromium 143+)
   - Used for hover effects in visualizations
   - GPU-accelerated on Metal backend

4. **Dialog Element with @starting-style** (Chrome 117+)
   - PWA install dialog uses @starting-style for entry animation
   - Perfect for Chromium 143+

### ⚡ Could Additionally Leverage (Optional)

1. **Anchor Positioning (Chrome 125+)**
   - Could anchor tooltips to D3 elements without getBoundingClientRect()
   - Trade-off: Would require refactoring D3 DOM structure

2. **View Transitions API (Chrome 111+, enhanced 143+)**
   - Could add smooth transitions between different visualizations
   - Would enhance UX without performance cost

3. **Scroll-Driven Animations (Chrome 115+)**
   - If you added scroll-based narrative content
   - Already enabled by CSS, just needs HTML structure

4. **Speculation Rules API (Chrome 121+)**
   - Could prerender visualization pages before navigation
   - Already documented in project (see speculation-rules.ts)

5. **CSS if() Function (Chrome 143+)**
   - Could simplify theme-aware styling
   - Currently using CSS custom properties (which also works)

---

## Recommendations

### 1. No Major Changes Required ✅

The codebase is already well-optimized:
- All DOM measurements are legitimate (D3 visualizations need exact pixel dimensions)
- ResizeObserver pattern is correctly implemented with debouncing
- CSS containment and visibility are properly applied
- No unnecessary scroll listeners or rAF loops

### 2. Minor Enhancement Opportunities

#### Optional: Add View Transitions for Visualization Changes

If you want smoother transitions when swapping visualizations:

```svelte
<script>
  import { startViewTransition } from '$lib/utils/view-transitions';

  function switchVisualization(newType: string) {
    startViewTransition(async () => {
      activeViz = newType;
    });
  }
</script>

<style>
  @view-transition {
    navigation: auto;
  }

  .visualization {
    view-transition-name: active-viz;
  }

  ::view-transition-old(active-viz) {
    animation: fade-out 0.2s ease-out;
  }

  ::view-transition-new(active-viz) {
    animation: fade-in 0.2s ease-in;
  }
</style>
```

#### Optional: Leverage Anchor Positioning for Tooltips (Advanced)

If you wanted to completely CSS-anchor tooltips to D3 elements (Chrome 143+):

```html
<!-- In D3 element -->
<div class="d3-node" style="anchor-name: --node-anchor;"></div>

<!-- Tooltip container -->
<style>
  .tooltip {
    position-anchor: --node-anchor;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 10px;
  }
</style>
```

**Trade-off:** Would require wrapping each D3-rendered element, which complicates the D3 code.

#### Optional: Add CSS if() for Theme-Aware Styling (Chrome 143+)

Current approach using CSS custom properties is fine, but could be modernized:

```css
/* Current: CSS custom properties */
.button {
  background: var(--is-dark) ? #333 : #fff;  /* Not valid syntax */
}

/* Chrome 143+: CSS if() function */
.button {
  background: if(style(--is-dark: true), #333, #fff);
  color: if(style(--is-dark: true), #fff, #000);
}
```

Current CSS custom property approach is actually more compatible and simpler to maintain.

### 3. PWA Display Mode Detection Enhancement

Minor improvement to InstallPrompt.svelte:

```svelte
<script>
  // Add CSS media query detection for completeness
  let isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)');

  // Combine with JS logic
  $effect(() => {
    if (isDisplayModeStandalone.matches) {
      isInstalled = true;
    }
  });
</script>

<style>
  /* CSS-only styling when installed */
  @media (display-mode: standalone) {
    :global(body) {
      /* Adjust UI for installed mode */
    }
  }
</style>
```

---

## Conclusion

### Summary Table

| Pattern | Found | Count | Replaceable | Status |
|---------|-------|-------|------------|--------|
| `getBoundingClientRect()` | Yes | 6 | No | Legitimate D3 usage |
| `offsetWidth/offsetHeight` | No | 0 | N/A | Good |
| Scroll event listeners | No | 0 | N/A | Good |
| `requestAnimationFrame` loops | No | 0 | N/A | Good |
| `matchMedia()` | Yes | 2 | Partial | Legitimate PWA check |

### Overall Assessment

**Grade: A- (Already Optimized)**

The dmb-almanac-svelte project demonstrates excellent practices for Chromium 143+ on Apple Silicon:

1. ✅ All DOM measurement usage is legitimate and unavoidable (D3 visualizations)
2. ✅ ResizeObserver with debouncing prevents layout thrashing
3. ✅ CSS containment and visibility applied to all major components
4. ✅ No unnecessary JavaScript for CSS-driven concerns
5. ✅ PWA detection appropriately uses matchMedia()
6. ✅ No scroll listeners or rAF loops for visual effects

**No critical refactoring needed.** The codebase is already optimized for modern browser capabilities. The optional enhancements listed above (View Transitions, Anchor Positioning) would improve UX but are not necessary for performance.

---

## References for Chrome 143+ Features

- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/anchor-name)
- [Scroll-Driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/contain)
- [CSS if() Function](https://developer.mozilla.org/en-US/docs/Web/CSS/if)
- [ResizeObserver API](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [Media Queries Level 5](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries)

---

**Generated:** January 21, 2026 | Scan Tool: Chromium Browser Engineer Agent | Target: Chrome 143+ / Apple Silicon M-series
