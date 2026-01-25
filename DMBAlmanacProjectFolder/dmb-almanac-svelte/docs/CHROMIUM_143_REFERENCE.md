# Chromium 143 (Chrome 131+) Features Reference
## For DMB Almanac Svelte Development

**This document serves as a quick reference for Chromium 2025 features relevant to this project.**

---

## HTML5 Native Elements

### `<details>` / `<summary>` (Chrome 12+)

**When to use**: Accordions, FAQs, collapsible sections
**Benefits**: No JS state needed, native toggle behavior, Escape key support

```svelte
<!-- Best Practice -->
<details class="accordion-item" name="accordion-group">
  <summary class="header">Expand me</summary>
  <div class="content">Hidden content</div>
</details>

<style>
  details[open] .chevron {
    transform: rotate(180deg);
  }
</style>
```

**Currently Used In**:
- ✅ `/src/routes/faq/+page.svelte`
- ✅ `/src/lib/components/navigation/Header.svelte`

---

### `<dialog>` (Chrome 37+)

**When to use**: Modals, prompts, alerts
**Benefits**: Automatic backdrop, Escape key close, focus trap, backdrop-filter support

```svelte
<dialog bind:this={dialogRef} class="my-dialog">
  <div class="content">Dialog content</div>
</dialog>

<script>
  let dialogRef;
  function openDialog() { dialogRef.showModal(); }
  function closeDialog() { dialogRef.close(); }
</script>
```

**Currently Used In**:
- ✅ `/src/lib/components/pwa/UpdatePrompt.svelte`
- ✅ `/src/lib/components/pwa/InstallPrompt.svelte`

---

## CSS Features

### `@starting-style` (Chrome 117+)

**When to use**: Entry animations for `<dialog>`, popovers, newly inserted elements
**Benefits**: Smooth transitions from initial to visible state without JS

```css
dialog {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s, overlay 0.3s allow-discrete;
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: translateY(20px);
  }
}
```

**Currently Used In**:
- ✅ `/src/lib/components/pwa/InstallPrompt.svelte` (lines 277-303)

---

### `animation-timeline: scroll()` (Chrome 115+)

**When to use**: Animations tied to scroll position (progress bars, parallax, reveal on scroll)
**Benefits**: Runs on compositor (GPU), doesn't block main thread

```css
.element {
  animation: my-animation linear both;
  animation-timeline: scroll(root);  /* Tied to document scroll */
  animation-range: entry 0% entry 100%;  /* Reveal as element enters */
}

/* Or use scroll() with named timeline */
.scroller {
  scroll-timeline: --my-scroll vertical;
}

.child {
  animation-timeline: --my-scroll;
}
```

**Currently Used In**:
- ✅ `/src/lib/components/navigation/Header.svelte` (lines 191-206)

---

### `::backdrop` Pseudo-element (Chrome 37+)

**When to use**: Styling backdrop behind `<dialog>` or fullscreen elements
**Benefits**: Hardware accelerated, works with `backdrop-filter`

```css
dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  transition: background-color 0.3s;
}

@starting-style {
  dialog[open]::backdrop {
    background-color: rgba(0, 0, 0, 0);
  }
}
```

**Currently Used In**:
- ✅ `/src/lib/components/pwa/InstallPrompt.svelte`

---

### `::details-content` Pseudo-element (Chrome 131+)

**When to use**: Directly animate the content inside `<details>`
**Status**: Experimental, requires feature flag in Chrome 131
**Benefits**: Smoother animations without wrapper divs

```css
/* Chrome 131+ */
details::details-content {
  animation: expand 0.3s ease-out;
}

@keyframes expand {
  from {
    block-size: 0;
    opacity: 0;
  }
  to {
    block-size: auto;
    opacity: 1;
  }
}
```

**Status in This Project**: Not currently used (wrapper div approach is fine)

---

### CSS Nesting (Chrome 120+)

**When to use**: Organizing related CSS rules, reducing repetition
**Benefits**: Native support, no preprocessor needed

```css
/* Current approach (works) */
.card { /* ... */ }
.card:hover { /* ... */ }
.card .title { /* ... */ }

/* Chrome 120+ native nesting */
.card {
  /* ... */

  &:hover {
    /* ... */
  }

  & .title {
    /* ... */
  }

  @media (width > 768px) {
    /* nested media query */
  }
}
```

**Status in This Project**: Not currently used

---

### `animation-range` (Chrome 115+)

**When to use**: Define when a scroll animation starts/ends
**Syntax**: `animation-range: entry 0% cover 100%`

```css
.reveal {
  animation: fadeIn linear both;
  animation-timeline: view();
  /* Fade in as element enters viewport */
  animation-range: entry 0% cover 100%;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Status in This Project**: Not currently used

---

### `@supports` for Feature Detection (Chrome 28+)

**When to use**: Progressive enhancement of features
**Currently used**: ✅ Header.svelte (line 191)

```css
@supports (animation-timeline: scroll()) {
  .header::after {
    animation: scrollProgress linear both;
    animation-timeline: scroll(root);
  }
}
```

---

## JavaScript APIs

### Scheduler API (Chrome 94+)

**When to use**: Prioritize tasks, prevent long tasks
**Methods**:
- `scheduler.postTask(fn, { priority })` - 'user-blocking', 'user-visible', 'background'
- `scheduler.yield()` - Yield to main thread (Chrome 129+)

```typescript
// High priority - user interaction
scheduler.postTask(() => {
  updateUI();
}, { priority: 'user-blocking' });

// Low priority - analytics
scheduler.postTask(() => {
  sendAnalytics();
}, { priority: 'background' });

// Yield in long loops (Chrome 129+)
async function processLargeDataset(items) {
  for (const item of items) {
    process(item);
    await scheduler.yield();  // Let browser handle user input
  }
}
```

**Status in This Project**: Not currently used (opportunity for optimization)

---

### Long Animation Frames API (Chrome 123+)

**When to use**: Monitor for long tasks that impact INP (Interaction to Next Paint)
**Benefits**: Identify performance bottlenecks

```typescript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long Animation Frame:', {
        duration: entry.duration,
        blockingDuration: entry.blockingDuration,
        scripts: entry.scripts.map(s => ({
          sourceURL: s.sourceURL,
          duration: s.duration
        }))
      });
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

**Status in This Project**: Not currently used (opportunity for instrumentation)

---

### Speculation Rules API (Chrome 121+)

**When to use**: Prefetch/prerender likely navigation destinations
**Benefits**: Instant page loads, View Transitions work smoothly

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/shows/*" },
      "eagerness": "moderate"
    },
    {
      "where": { "selector_matches": "a[href^='/']" },
      "eagerness": "eager"
    }
  ]
}
</script>
```

**Status in This Project**: Not currently used (opportunity for PWA enhancement)

---

### View Transitions API (Chrome 111+, MPA in Chrome 126+)

**When to use**: Animated page transitions
**Benefits**: Native-like transitions without SPA frameworks

```typescript
// Within navigation:
async function navigateWithTransition(url) {
  if (!document.startViewTransition) {
    window.location.href = url;
    return;
  }

  document.startViewTransition(async () => {
    // Update DOM
    await fetchAndRender(url);
  });
}
```

**Status in This Project**: Not currently used (SvelteKit SSR handles this already)

---

### Web Neural Network API (Chrome 143+)

**When to use**: On-device ML inference (image recognition, NLP)
**Benefits**: Privacy-preserving, fast inference on Neural Engine (Apple Silicon)

```typescript
// Chrome 143+ with --enable-features=WebNN
async function initWebNN() {
  if (!navigator.ml) return null;

  try {
    const context = await navigator.ml.createContext({
      deviceType: 'npu'  // Request Neural Engine (Apple ANE)
    });

    return context;
  } catch (e) {
    console.log('NPU not available, falling back to GPU');
  }
}
```

**Status in This Project**: Not currently used

---

## Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|---|
| **LCP** (Largest Contentful Paint) | < 1.0s | SSR, preload critical resources, optimize images |
| **INP** (Interaction to Next Paint) | < 100ms | Break up long tasks, use `scheduler.yield()` |
| **CLS** (Cumulative Layout Shift) | < 0.05 | Reserve space, avoid dynamic content insertion |
| **FCP** (First Contentful Paint) | < 1.0s | SSR critical content, optimize fonts |
| **TTFB** (Time to First Byte) | < 400ms | Optimize server response, use CDN |

---

## Apple Silicon-Specific Optimizations

### Metal Backend (via WebGPU/ANGLE)

**Chrome translates WebGL/WebGPU to Metal on Apple Silicon**

```css
/* Enable GPU acceleration */
.element {
  transform: translateZ(0);  /* Force GPU layer */
  will-change: transform;    /* Create compositing layer */
  backface-visibility: hidden;  /* Disable backface rendering */
}

/* Efficient backdrop blur (Metal hardware accelerated) */
.glass-effect {
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

/* Containment for efficient rendering */
.contained {
  contain: layout style paint;  /* Limits repaint scope */
}
```

---

### Unified Memory Architecture (UMA)

**Apple Silicon has single memory for CPU/GPU - optimize for zero-copy operations**

```typescript
// WebGPU: Take advantage of UMA for large buffers
const buffer = device.createBuffer({
  size: 1024 * 1024 * 256,  // 256MB - feasible with UMA
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  mappedAtCreation: true  // Zero-copy initialization
});

new Float32Array(buffer.getMappedRange()).set(largeDataset);
buffer.unmap();
```

---

### Scroll-Driven Animations (Compositor Thread)

**Animations using `animation-timeline: scroll()` run on GPU, freeing main thread**

```css
/* This runs on Apple GPU, doesn't block JavaScript */
@supports (animation-timeline: scroll()) {
  .parallax {
    animation: parallax-effect linear both;
    animation-timeline: scroll();
  }
}

@keyframes parallax-effect {
  from { transform: translateY(0); }
  to { transform: translateY(-100px); }
}
```

**Currently Used In**: Header progress bar

---

## Migration Checklist for New Components

When adding new interactive components:

- [ ] Use `<details>`/`<summary>` for accordions (no JS state)
- [ ] Use `<dialog>` for modals (no manual backdrop)
- [ ] Use `@starting-style` for smooth animations
- [ ] Use `animation-timeline: scroll()` for scroll effects
- [ ] Use `scheduler.yield()` for long-running tasks
- [ ] Avoid custom collapse animations with height/max-height
- [ ] Test with LoAF API to catch long tasks
- [ ] Ensure prefers-reduced-motion is respected
- [ ] Use CSS containment for rendering optimization
- [ ] Enable GPU acceleration where needed

---

## Quick Browser Support Check

```javascript
// Detect feature support
function supportsFeature(featureName) {
  const features = {
    'details': 'HTMLDetailsElement' in window,
    'dialog': 'HTMLDialogElement' in window,
    'scrollDrivenAnimations': CSS.supports('animation-timeline', 'scroll()'),
    'startingStyle': CSS.supports('@starting-style { ') > 0,
    'cssNesting': CSS.supports('& { }'),
    'webnn': 'ml' in navigator,
    'webgpu': 'gpu' in navigator,
    'scheduler': 'scheduler' in window,
    'loaf': 'PerformanceObserver' in window
  };

  return features[featureName] ?? false;
}

// Log support for this browser
for (const [feature, supported] of Object.entries(features)) {
  console.log(`${feature}: ${supported ? 'Supported' : 'Not supported'}`);
}
```

---

## Resource Links

- **MDN Web Docs**: https://developer.mozilla.org/en-US/
- **Chrome DevTools**: DevTools > More Tools > Performance Insights
- **Chromium Releases**: https://chromereleases.googleblog.com/
- **CanIUse**: https://caniuse.com/

---

## This Project's Chromium 143 Readiness

| Feature | Used | Status |
|---------|------|--------|
| `<details>`/`<summary>` | ✅ Yes | Exemplary implementation |
| `<dialog>` | ✅ Yes | Exemplary implementation |
| `@starting-style` | ✅ Yes | In InstallPrompt |
| `animation-timeline: scroll()` | ✅ Yes | In Header progress |
| CSS Nesting | ❌ No | Not necessary |
| `scheduler.yield()` | ❌ No | Not needed (no long tasks) |
| Speculation Rules | ❌ No | Optional enhancement |
| View Transitions | ❌ No | SSR already handles |
| WebNN | ❌ No | Not applicable |
| WebGPU | ❌ No | Not needed |

**Overall Readiness**: Excellent - Chromium 143+ ready

---

**Last Updated**: January 2026
**Platform**: macOS 26.2 / Apple Silicon M1-M4
**Framework**: SvelteKit 2 + Svelte 5
