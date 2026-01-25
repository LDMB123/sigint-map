---
name: lcp-debugging
description: Debug and fix Largest Contentful Paint (LCP) issues for fast page loads
tags: [performance, lcp, core-web-vitals, loading, chromium-2025]
when_to_use: When page load feels slow (>2.5s), images load late, or Core Web Vitals shows LCP > 2.5s (Needs Improvement)
---

# LCP Debugging Guide

Comprehensive guide for diagnosing and fixing Largest Contentful Paint (LCP) issues to achieve sub-1-second page loads.

## What is LCP?

**Largest Contentful Paint (LCP)** measures the render time of the largest image, text block, or video visible within the viewport.

**LCP Thresholds:**
- **Good:** ≤ 2.5s
- **Needs Improvement:** 2.5-4.0s
- **Poor:** > 4.0s

**Target (Chromium 143 / Apple Silicon):** < 1.0s

---

## What Counts as LCP?

**LCP elements (largest visible):**
- `<img>` elements
- `<image>` inside `<svg>`
- `<video>` with poster image
- Background images via CSS url()
- Block-level text elements

**NOT counted:**
- Elements removed from DOM
- Elements with opacity: 0
- Elements outside viewport
- Small elements (<viewport size)

---

## Debugging Tools

### 1. Chrome DevTools Performance Panel

**Identify LCP element:**
```
1. DevTools → Performance tab
2. Check "Web Vitals" checkbox
3. Click Record (⚫)
4. Reload page (Cmd+R during recording)
5. Click Stop (⏹️)
6. Look for "LCP" marker in timeline
7. Click LCP marker to see which element
```

### 2. Lighthouse

**Comprehensive LCP analysis:**
```
1. DevTools → Lighthouse tab
2. Select "Performance" category
3. Click "Analyze page load"
4. Review:
   - Largest Contentful Paint metric
   - Opportunities section (what to fix)
   - Diagnostics section (why it's slow)
```

**Key Lighthouse diagnostics for LCP:**
- Eliminate render-blocking resources
- Preload LCP image
- Reduce server response time (TTFB)
- Preconnect to required origins
- Optimize images

### 3. Web Vitals Library

```javascript
import { onLCP } from 'web-vitals';

onLCP((metric) => {
  console.log('LCP:', {
    value: metric.value,  // LCP time in ms
    rating: metric.rating,  // "good" | "needs-improvement" | "poor"

    // LCP element details
    element: metric.entries[0]?.element,  // DOM element
    url: metric.entries[0]?.url,  // Image URL (if image)
    renderTime: metric.entries[0]?.renderTime,
    loadTime: metric.entries[0]?.loadTime,
    size: metric.entries[0]?.size  // Element size in pixels
  });

  // Send to analytics
  if (metric.rating !== 'good') {
    analytics.trackLCP({
      value: metric.value,
      element: metric.entries[0]?.element?.tagName,
      url: metric.entries[0]?.url
    });
  }
});
```

### 4. Chrome DevTools LCP Badge

**Visual indicator:**
```
DevTools → Elements tab
  → Look for LCP badge next to element in DOM tree
  → Shows which element was LCP
```

---

## LCP Breakdown

**Four sub-parts of LCP:**

```
Page Load → [TTFB] → [Resource Load] → [Render Delay] → LCP
            ↑         ↑                 ↑
            Server    Network           Browser
```

1. **Time to First Byte (TTFB):** Server response time
2. **Resource load time:** Download time for LCP resource (image, font, etc.)
3. **Resource render time:** Time to decode/render
4. **Render delay:** Blocking scripts, stylesheets

---

## Fixing LCP Issues

### Fix 1: Preload LCP Image

**Most impactful optimization**

```html
<!-- Preload the hero image -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

<!-- For responsive images, use imagesrcset -->
<link
  rel="preload"
  as="image"
  href="/hero-1200.webp"
  imagesrcset="/hero-600.webp 600w, /hero-1200.webp 1200w, /hero-2400.webp 2400w"
  imagesizes="100vw"
  fetchpriority="high"
/>
```

**When to use:**
- LCP element is an image
- Image is not discovered until CSS loads
- LCP image is background image via CSS

**Impact:** LCP 2.8s → 1.2s (typical)

### Fix 2: Priority Hints

**Chrome 96+**

```html
<!-- High priority for LCP image -->
<img src="/hero.webp" fetchpriority="high" alt="Hero" />

<!-- Low priority for below-fold images -->
<img src="/footer.webp" fetchpriority="low" loading="lazy" alt="" />
```

**How it works:**
- `fetchpriority="high"`: Fetches before low-priority resources
- Browsers load high-priority images first
- Combine with preload for maximum impact

### Fix 3: Optimize TTFB (Server Response)

**Target:** < 400ms

**Server-side rendering (SSR):**
```javascript
// SvelteKit example
export async function load({ params }) {
  // Keep load function fast
  const data = await db.getData(params.id);  // Fast query
  return { data };
}
```

**Database optimization:**
- Use indexes on frequently queried columns
- Enable SQLite WAL mode for concurrent reads
- Cache frequently accessed data

**CDN for static assets:**
```html
<!-- Serve assets from CDN -->
<link rel="preconnect" href="https://cdn.example.com" />
<img src="https://cdn.example.com/hero.webp" fetchpriority="high" />
```

### Fix 4: Optimize Image Format and Size

**Use modern formats:**
```html
<picture>
  <!-- WebP for modern browsers -->
  <source srcset="/hero.webp" type="image/webp" />

  <!-- AVIF for cutting-edge browsers (better compression) -->
  <source srcset="/hero.avif" type="image/avif" />

  <!-- Fallback to JPEG -->
  <img src="/hero.jpg" alt="Hero" />
</picture>
```

**Responsive images:**
```html
<img
  srcset="
    /hero-600.webp 600w,
    /hero-1200.webp 1200w,
    /hero-2400.webp 2400w
  "
  sizes="100vw"
  src="/hero-1200.webp"
  alt="Hero"
  fetchpriority="high"
/>
```

**Image optimization checklist:**
- Compress images (80-85% quality for photos)
- Serve WebP/AVIF instead of JPEG/PNG
- Size images correctly (don't serve 4K for 1080p display)
- Use imgix/Cloudinary for automatic optimization

### Fix 5: Eliminate Render-Blocking Resources

**CSS:**
```html
<!-- Inline critical CSS -->
<style>
  /* Critical above-fold styles */
  body { margin: 0; font-family: sans-serif; }
  .hero { width: 100%; height: 600px; }
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="/styles.css" /></noscript>
```

**JavaScript:**
```html
<!-- Defer non-critical scripts -->
<script src="/analytics.js" defer></script>

<!-- Async for independent scripts -->
<script src="/ads.js" async></script>

<!-- Module scripts are deferred by default -->
<script type="module" src="/app.js"></script>
```

**Font loading:**
```html
<!-- Preconnect to font provider -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
```

```css
/* Use font-display: swap to avoid blocking text */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;  /* Show fallback font immediately */
}
```

### Fix 6: Speculation Rules for Instant Navigation

**Chrome 121+**

```html
<!-- Prerender likely next pages -->
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/product/*" },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

**Dynamic speculation:**
```javascript
// Prerender on hover
document.querySelectorAll('a').forEach(link => {
  let hoverTimeout;

  link.addEventListener('mouseenter', () => {
    hoverTimeout = setTimeout(() => {
      addSpeculationRule(link.href, 'eager');
    }, 200);  // 200ms hover = intent
  });

  link.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimeout);
  });
});

function addSpeculationRule(url, eagerness = 'moderate') {
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    prerender: [{ urls: [url], eagerness }]
  });
  document.head.appendChild(script);
}
```

**Impact:** LCP 2.8s → 0.3s (for prerendered pages)

### Fix 7: Server-Side Rendering (SSR)

**SvelteKit (default SSR):**
```javascript
// +page.server.ts
export async function load() {
  const data = await fetchData();
  return { data };  // Rendered on server
}
```

**Benefits:**
- HTML includes content immediately
- No client-side data fetching delay
- Improves LCP, FCP, and SEO

**Streaming SSR (Next.js/SvelteKit):**
```svelte
<!-- SvelteKit with streaming -->
{#await promise}
  <Skeleton />
{:then data}
  <Content {data} />
{/await}
```

### Fix 8: Lazy Load Below-Fold Images

**Native lazy loading:**
```html
<!-- Above-fold image: Load immediately -->
<img src="/hero.webp" fetchpriority="high" alt="Hero" />

<!-- Below-fold images: Load when near viewport -->
<img src="/image1.webp" loading="lazy" alt="" />
<img src="/image2.webp" loading="lazy" alt="" />
```

**Why it helps LCP:**
- Reduces bandwidth competition for LCP image
- Browser prioritizes above-fold images

---

## Common LCP Patterns

### Pattern 1: Hero Image

**Problem:** Large hero image is LCP, loads slowly

**Solution:**
```html
<!-- 1. Preload -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

<!-- 2. Optimize format and size -->
<picture>
  <source srcset="/hero-600.avif 600w, /hero-1200.avif 1200w" type="image/avif" />
  <source srcset="/hero-600.webp 600w, /hero-1200.webp 1200w" type="image/webp" />
  <img
    src="/hero-1200.jpg"
    srcset="/hero-600.jpg 600w, /hero-1200.jpg 1200w"
    sizes="100vw"
    alt="Hero"
    fetchpriority="high"
  />
</picture>

<!-- 3. Reserve space to avoid CLS -->
<style>
  .hero-container {
    aspect-ratio: 16 / 9;
    width: 100%;
  }
</style>
```

### Pattern 2: CSS Background Image

**Problem:** Background image not discovered until CSS loads

**Solution:**
```html
<!-- Preload background image -->
<link rel="preload" as="image" href="/hero-bg.webp" />

<style>
  .hero {
    background-image: url('/hero-bg.webp');
    background-size: cover;
  }
</style>
```

**Better solution: Use <img> instead:**
```html
<div class="hero">
  <img src="/hero-bg.webp" alt="Hero" fetchpriority="high" />
  <div class="hero-content">
    <h1>Title</h1>
  </div>
</div>

<style>
  .hero {
    position: relative;
  }
  .hero img {
    width: 100%;
    height: auto;
  }
  .hero-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
```

### Pattern 3: Text Block

**Problem:** Large text block is LCP, font loads slowly

**Solution:**
```html
<!-- 1. Preconnect to font provider -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- 2. Preload critical font -->
<link
  rel="preload"
  href="/fonts/inter-bold.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<!-- 3. Use font-display: swap -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-bold.woff2') format('woff2');
    font-display: swap;
    font-weight: 700;
  }

  h1 {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
  }
</style>
```

### Pattern 4: Video with Poster

**Problem:** Video poster image is LCP

**Solution:**
```html
<!-- Preload poster image -->
<link rel="preload" as="image" href="/video-poster.webp" />

<video poster="/video-poster.webp" controls>
  <source src="/video.mp4" type="video/mp4" />
</video>
```

---

## Measuring LCP Improvements

### Before/After Comparison

```javascript
let lcpMeasurements = [];

onLCP((metric) => {
  lcpMeasurements.push({
    timestamp: Date.now(),
    value: metric.value,
    rating: metric.rating,
    element: metric.entries[0]?.element?.tagName,
    url: metric.entries[0]?.url
  });

  console.log('LCP history:', lcpMeasurements);
});
```

### Field Monitoring

```javascript
onLCP((metric) => {
  // Send to analytics
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      type: 'lcp',
      value: metric.value,
      rating: metric.rating,
      url: window.location.href,
      element: metric.entries[0]?.element?.outerHTML,
      resourceUrl: metric.entries[0]?.url
    })
  });
});
```

---

## LCP Debugging Checklist

**Identify the issue:**
```
□ Measure baseline LCP with Web Vitals
□ Identify LCP element (DevTools Performance → LCP marker)
□ Determine element type (image, text, video)
□ Check resource size and format
□ Measure TTFB (should be < 400ms)
□ Check for render-blocking resources
```

**Apply fixes:**
```
□ Preload LCP resource with fetchpriority="high"
□ Optimize image format (WebP/AVIF) and size
□ Use responsive images (srcset/sizes)
□ Eliminate render-blocking CSS/JS
□ Optimize web fonts (preload + font-display: swap)
□ Reduce server response time (TTFB)
□ Implement SSR if not already
□ Add Speculation Rules for instant navigation
```

**Verify improvements:**
```
□ Re-measure LCP with Web Vitals
□ Run Lighthouse audit
□ Test on real device (Apple Silicon Mac)
□ Monitor field data
□ Check LCP < 1.0s target achieved
```

---

## Apple Silicon Specific Optimizations

### Hardware Video Decode

**Use HEVC/AV1 for video posters on Apple Silicon:**
```html
<!-- M3+ supports AV1 hardware decode -->
<video poster="/poster.webp">
  <source src="/video.av1.mp4" type="video/mp4; codecs=av01.0.05M.08" />
  <source src="/video.hevc.mp4" type="video/mp4; codecs=hvc1" />
  <source src="/video.h264.mp4" type="video/mp4" />
</video>
```

### High Bandwidth Network

**Serve higher quality images on fast connections:**
```javascript
// Detect connection speed
if (navigator.connection?.effectiveType === '4g') {
  // Serve high-quality images
  img.src = '/hero-2400.webp';
} else {
  // Serve lower quality
  img.src = '/hero-1200.webp';
}
```

---

## Resources

- [LCP Optimization Guide](https://web.dev/lcp/)
- [Preload Critical Assets](https://web.dev/preload-critical-assets/)
- [Priority Hints](https://web.dev/priority-hints/)
- [Speculation Rules API](https://developer.chrome.com/blog/speculation-rules/)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)
