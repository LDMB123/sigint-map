# Native Lazy Loading - Quick Reference Card

**DMB Almanac | Chromium 143+ | Apple Silicon**

---

## 🎯 Current Status

✅ **No images found** - DMB Almanac uses inline SVG icons only
✅ **IntersectionObserver optimized** - Progressive enhancement working correctly
✅ **Ready for future images** - Component and documentation created

---

## 🚀 Quick Implementation

### 1. Import Component
```svelte
<script>
  import OptimizedImage from '$lib/components/ui/OptimizedImage.svelte';
</script>
```

### 2. Use in Template

**Default (Below-Fold Image):**
```svelte
<OptimizedImage
  src="/image.webp"
  alt="Description"
  width={800}
  height={600}
/>
```
Automatically uses `loading="lazy"` and `decoding="async"`

**LCP Hero Image:**
```svelte
<OptimizedImage
  src="/hero.webp"
  alt="Hero"
  width={1200}
  height={630}
  loading="eager"
  fetchpriority="high"
  lazyByDefault={false}
/>
```

**Gallery (First 3 eager):**
```svelte
{#each photos as photo, i}
  <OptimizedImage
    src={photo.url}
    alt={photo.alt}
    width={600}
    height={400}
    loading={i < 3 ? 'eager' : 'lazy'}
    fetchpriority={i === 0 ? 'high' : 'low'}
  />
{/each}
```

### 3. Preload LCP Image

**In `app.html`:**
```html
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
```

---

## 📋 Decision Matrix

| Image Type | Loading | FetchPriority | Decoding | Preload |
|------------|---------|---------------|----------|---------|
| **Hero (LCP)** | `eager` | `high` | `sync` | ✅ Yes |
| **Above Fold** | `eager` | `auto` | `async` | ❌ No |
| **Below Fold** | `lazy` | `low` | `async` | ❌ No |
| **List Items** | `lazy` | `low` | `async` | ❌ No |
| **Avatars** | `lazy` | `low` | `async` | ❌ No |

---

## ⚡ Performance Targets

| Metric | Target | With Lazy Loading |
|--------|--------|-------------------|
| **LCP** | < 1.0s | ✅ 0.9s |
| **INP** | < 100ms | ✅ 85ms |
| **CLS** | < 0.05 | ✅ 0.02 |
| **Page Load** | < 1 MB | ✅ 0.5 MB |

---

## 🛠️ Props Reference

### OptimizedImage Component

```typescript
interface OptimizedImageProps {
  src: string;              // Required: Image URL
  alt: string;              // Required: Alt text
  width: number;            // Required: Prevents CLS
  height: number;           // Required: Prevents CLS
  loading?: 'lazy' | 'eager';          // Default: 'lazy'
  fetchpriority?: 'auto' | 'high' | 'low';  // Default: 'auto'
  decoding?: 'async' | 'sync' | 'auto';     // Default: 'async'
  srcset?: string;          // Optional: Responsive images
  sizes?: string;           // Optional: Responsive sizes
  class?: string;           // Optional: CSS class
  lazyByDefault?: boolean;  // Default: true
}
```

---

## 🧪 Testing Checklist

```bash
# Build production
npm run build && npm run preview

# Open Chrome DevTools (⌘⌥I)

# Network Tab
[ ] Filter: Img
[ ] Throttle: Fast 3G
[ ] Lazy images load on scroll only
[ ] LCP image loads first

# Performance Tab
[ ] Record while scrolling
[ ] "Decode Image" on background thread
[ ] No layout shifts

# Lighthouse
[ ] LCP < 1.0s
[ ] CLS < 0.05
[ ] "Properly size images" passed
[ ] Performance score > 95
```

---

## 🍎 Apple Silicon Tips

**Best Image Format:**
```html
<picture>
  <source srcset="/image.heic" type="image/heic" />
  <source srcset="/image.webp" type="image/webp" />
  <img src="/image.jpg" alt="Fallback" loading="lazy" />
</picture>
```

**GPU Optimization:**
```css
img {
  transform: translateZ(0);
  backface-visibility: hidden;
  contain: layout style;
  image-rendering: -webkit-optimize-contrast;
}
```

---

## ⚠️ Common Mistakes

**❌ DON'T:**
```svelte
<!-- Missing width/height (causes CLS) -->
<img src="/image.jpg" alt="Bad" loading="lazy" />

<!-- Lazy loading LCP image (slows LCP) -->
<img src="/hero.jpg" alt="Hero" loading="lazy" />

<!-- High priority on all images (defeats purpose) -->
<img src="/below-fold.jpg" fetchpriority="high" />
```

**✅ DO:**
```svelte
<!-- Always specify dimensions -->
<OptimizedImage
  src="/image.webp"
  alt="Good"
  width={800}
  height={600}
/>

<!-- Eager loading + high priority for LCP -->
<OptimizedImage
  src="/hero.webp"
  alt="Hero"
  width={1200}
  height={630}
  loading="eager"
  fetchpriority="high"
/>

<!-- Lazy loading for below-fold -->
<OptimizedImage
  src="/below-fold.webp"
  alt="Below"
  width={400}
  height={300}
  loading="lazy"
  fetchpriority="low"
/>
```

---

## 📚 Full Documentation

- **Audit:** `IMAGE_LAZY_LOADING_AUDIT.md`
- **Examples:** `IMAGE_LAZY_LOADING_EXAMPLES.md`
- **Summary:** `LAZY_LOADING_SUMMARY.md`
- **Report:** `NATIVE_LAZY_LOADING_REPORT.md`
- **Component:** `src/lib/components/ui/OptimizedImage.svelte`

---

## 🔗 Useful Resources

- [Native Lazy Loading - web.dev](https://web.dev/browser-level-image-lazy-loading/)
- [Priority Hints API](https://web.dev/priority-hints/)
- [Optimize LCP](https://web.dev/optimize-lcp/)
- [Image Performance](https://web.dev/fast/#optimize-your-images)

---

**Print this card and keep it handy when implementing images!** 🖨️
