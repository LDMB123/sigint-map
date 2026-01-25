---
title: Native Lazy Loading for Images and Iframes
category: html
description: Using loading="lazy", fetchpriority, and decoding attributes for performance optimization
tags: [html5, lazy-loading, performance, images, iframes, lcp, fetchpriority]
---

# Lazy Loading Skill

## When to Use

- Optimizing page load performance with many images
- Deferring below-the-fold content (images, iframes, embeds)
- Improving Largest Contentful Paint (LCP) scores
- Loading YouTube/Vimeo embeds only when needed
- Prioritizing critical resources (hero images, above-fold content)
- Reducing initial bandwidth consumption

## Required Inputs

- **Resource type**: Image or iframe
- **Position on page**: Above-the-fold (eager) or below-the-fold (lazy)
- **Importance**: Critical (hero image) or secondary content
- **Format**: Image format (AVIF, WebP, JPEG) and fallbacks
- **Dimensions**: Width and height to prevent layout shifts

## Steps

### Step 1: Understand Loading Attribute Values

The `loading` attribute has three values:

```html
<!-- Lazy: Load when near viewport (default for below-fold) -->
<img src="image.jpg" loading="lazy" alt="Description">

<!-- Eager: Load immediately (default for above-fold) -->
<img src="hero.jpg" loading="eager" alt="Hero image">

<!-- Auto: Browser decides (default behavior) -->
<img src="image.jpg" loading="auto" alt="Description">
```

**Browser behavior**:
- Lazy loads when element is within ~2000px of viewport
- Distance threshold varies by connection speed (slower = larger threshold)
- Automatically handles scroll position and viewport changes

### Step 2: Apply Lazy Loading to Below-Fold Images

Mark images that are not immediately visible:

```html
<main>
  <!-- Above-the-fold hero image: load immediately -->
  <img
    src="hero.jpg"
    alt="Hero banner"
    width="1200"
    height="600"
    loading="eager"
    fetchpriority="high"
  >

  <article>
    <h1>Article Title</h1>
    <p>First paragraph of content...</p>

    <!-- Below-the-fold images: lazy load -->
    <img
      src="photo1.jpg"
      alt="Article photo"
      width="800"
      height="600"
      loading="lazy"
    >

    <p>More content...</p>

    <img
      src="photo2.jpg"
      alt="Another photo"
      width="800"
      height="600"
      loading="lazy"
    >
  </article>
</main>
```

**Key points**:
- Always include `width` and `height` to prevent Cumulative Layout Shift (CLS)
- Use `loading="eager"` for LCP images (usually first hero image)
- Use `loading="lazy"` for everything below the fold

### Step 3: Lazy Load Iframes (YouTube, Maps, Embeds)

Defer heavy iframe content:

```html
<!-- YouTube embed with lazy loading -->
<iframe
  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  width="560"
  height="315"
  loading="lazy"
  title="Video title"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>

<!-- Google Maps embed with lazy loading -->
<iframe
  src="https://www.google.com/maps/embed?pb=..."
  width="600"
  height="450"
  style="border:0;"
  loading="lazy"
  title="Map location"
  allowfullscreen
  referrerpolicy="no-referrer-when-downgrade"
></iframe>

<!-- Generic iframe -->
<iframe
  src="https://example.com/widget"
  width="400"
  height="300"
  loading="lazy"
  title="Widget description"
></iframe>
```

**Benefits**:
- YouTube/Vimeo embeds are ~500KB+ each
- Defers JavaScript and network requests until needed
- Significant performance improvement for embed-heavy pages

### Step 4: Use fetchpriority for Critical Resources

Prioritize LCP images and critical resources:

```html
<!-- High priority: LCP image, load immediately -->
<img
  src="hero.jpg"
  alt="Hero banner"
  width="1920"
  height="1080"
  loading="eager"
  fetchpriority="high"
>

<!-- Low priority: Less important images -->
<img
  src="sidebar-ad.jpg"
  alt="Advertisement"
  width="300"
  height="250"
  loading="lazy"
  fetchpriority="low"
>

<!-- Auto priority: Default behavior -->
<img
  src="content.jpg"
  alt="Content image"
  width="800"
  height="600"
  loading="lazy"
  fetchpriority="auto"
>
```

**fetchpriority values**:
- `high`: Boost priority (hero images, critical content)
- `low`: Reduce priority (ads, non-essential content)
- `auto`: Browser decides (default)

### Step 5: Use decoding="async" for Non-Blocking Rendering

Prevent image decode from blocking rendering:

```html
<!-- Async decoding: Don't block page rendering -->
<img
  src="large-photo.jpg"
  alt="Large photograph"
  width="2000"
  height="1500"
  loading="lazy"
  decoding="async"
>

<!-- Sync decoding: Wait for decode before showing (rare) -->
<img
  src="critical-ui.png"
  alt="Critical UI element"
  width="100"
  height="100"
  loading="eager"
  decoding="sync"
>

<!-- Auto decoding: Browser decides (default) -->
<img
  src="photo.jpg"
  alt="Photo"
  width="800"
  height="600"
  loading="lazy"
  decoding="auto"
>
```

**decoding values**:
- `async`: Decode off main thread (default for most images)
- `sync`: Block rendering until decoded (for critical UI)
- `auto`: Browser decides

### Step 6: Combine with Responsive Images

Use `srcset` with lazy loading:

```html
<img
  src="photo-800w.jpg"
  srcset="
    photo-400w.jpg 400w,
    photo-800w.jpg 800w,
    photo-1200w.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Responsive photo"
  width="1200"
  height="800"
  loading="lazy"
  decoding="async"
>
```

### Step 7: Implement Intersection Observer Fallback (If Needed)

For older browsers without native lazy loading:

```html
<img
  data-src="photo.jpg"
  src="placeholder.jpg"
  alt="Photo"
  width="800"
  height="600"
  class="lazy-image"
>

<script>
  // Check if native lazy loading is supported
  if ('loading' in HTMLImageElement.prototype) {
    // Native support - just use loading="lazy"
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      img.src = img.dataset.src || img.src;
    });
  } else {
    // Fallback: Use Intersection Observer
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy-image');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before entering viewport
    });

    const lazyImages = document.querySelectorAll('.lazy-image');
    lazyImages.forEach(img => imageObserver.observe(img));
  }
</script>
```

### Step 8: Optimize LCP with Preloading

Preload critical images that are dynamically added:

```html
<head>
  <!-- Preload LCP image if it's in CSS or added by JS -->
  <link
    rel="preload"
    as="image"
    href="hero.jpg"
    fetchpriority="high"
  >

  <!-- Preload responsive image -->
  <link
    rel="preload"
    as="image"
    href="hero-800w.jpg"
    imagesrcset="
      hero-400w.jpg 400w,
      hero-800w.jpg 800w,
      hero-1200w.jpg 1200w
    "
    imagesizes="100vw"
  >
</head>

<body>
  <!-- Don't use loading="lazy" on preloaded images -->
  <img
    src="hero.jpg"
    alt="Hero banner"
    width="1920"
    height="1080"
    fetchpriority="high"
  >
</body>
```

**Important**: Don't lazy load preloaded images!

## Expected Output

- Images below fold don't request until user scrolls near them
- Initial page load is faster (fewer network requests)
- Improved Core Web Vitals (LCP, CLS)
- Iframes defer JavaScript and network requests
- Critical images load with high priority
- No layout shifts (because width/height are specified)

## Code Examples by Framework

### React

```jsx
function ImageGallery({ images }) {
  return (
    <div className="gallery">
      {/* Hero image: load immediately */}
      <img
        src={images[0].src}
        alt={images[0].alt}
        width={images[0].width}
        height={images[0].height}
        loading="eager"
        fetchpriority="high"
      />

      {/* Gallery images: lazy load */}
      {images.slice(1).map((image, index) => (
        <img
          key={index}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}
```

### Next.js (Using Image Component)

```jsx
import Image from 'next/image';

function Gallery() {
  return (
    <>
      {/* Hero image: priority loading */}
      <Image
        src="/hero.jpg"
        alt="Hero banner"
        width={1920}
        height={1080}
        priority // Disables lazy loading, adds fetchpriority="high"
      />

      {/* Regular images: lazy load by default */}
      <Image
        src="/photo.jpg"
        alt="Photo"
        width={800}
        height={600}
        // loading="lazy" is default
      />
    </>
  );
}
```

### Svelte

```svelte
<script>
  let images = $state([
    { src: 'hero.jpg', alt: 'Hero', width: 1920, height: 1080, priority: true },
    { src: 'photo1.jpg', alt: 'Photo 1', width: 800, height: 600 },
    { src: 'photo2.jpg', alt: 'Photo 2', width: 800, height: 600 },
  ]);
</script>

<div class="gallery">
  {#each images as image, index}
    <img
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={image.priority ? 'eager' : 'lazy'}
      fetchpriority={image.priority ? 'high' : 'auto'}
      decoding="async"
    />
  {/each}
</div>
```

### Vue

```vue
<template>
  <div class="gallery">
    <!-- Hero image -->
    <img
      :src="heroImage.src"
      :alt="heroImage.alt"
      :width="heroImage.width"
      :height="heroImage.height"
      loading="eager"
      fetchpriority="high"
    />

    <!-- Gallery images -->
    <img
      v-for="(image, index) in galleryImages"
      :key="index"
      :src="image.src"
      :alt="image.alt"
      :width="image.width"
      :height="image.height"
      loading="lazy"
      decoding="async"
    />
  </div>
</template>

<script setup>
const heroImage = {
  src: '/hero.jpg',
  alt: 'Hero banner',
  width: 1920,
  height: 1080
};

const galleryImages = [
  { src: '/photo1.jpg', alt: 'Photo 1', width: 800, height: 600 },
  { src: '/photo2.jpg', alt: 'Photo 2', width: 800, height: 600 },
];
</script>
```

## Common Mistakes to Avoid

- **Lazy loading LCP image**: Makes page slower! Use `loading="eager"` + `fetchpriority="high"`
- **Missing width/height**: Causes layout shift (bad CLS score)
- **Lazy loading above-fold content**: Delays initial render
- **Not using fetchpriority on hero images**: Browser may not prioritize correctly
- **Lazy loading background images in CSS**: Use Intersection Observer instead
- **Forgetting alt text**: Accessibility issue
- **Using loading="lazy" on first image**: Always eager load first meaningful image

## Performance Impact

### Before Lazy Loading
```
Initial page load:
- 50 images × 200KB = 10MB
- Load time: 8 seconds
- LCP: 4.2s
- Network requests: 50
```

### After Lazy Loading
```
Initial page load:
- 3 images × 200KB = 600KB (only above-fold)
- Load time: 1.2 seconds
- LCP: 1.8s (with fetchpriority="high")
- Network requests: 3 (47 deferred)
```

## Browser Support

| Browser | loading | fetchpriority | decoding |
|---------|---------|---------------|----------|
| Chrome 77+ | ✅ | ✅ (101+) | ✅ |
| Edge 79+ | ✅ | ✅ (101+) | ✅ |
| Safari 15.4+ | ✅ | ✅ (17.2+) | ✅ |
| Firefox 75+ | ✅ | ❌ | ✅ |

## Testing Checklist

- [ ] Hero/LCP image uses `loading="eager"` and `fetchpriority="high"`
- [ ] Below-fold images use `loading="lazy"`
- [ ] All images have `width` and `height` attributes
- [ ] Iframes for embeds use `loading="lazy"`
- [ ] No layout shift when images load (CLS score)
- [ ] Images load when scrolled into view (check Network tab)
- [ ] Fallback works in browsers without native lazy loading
- [ ] Alt text present for all images
- [ ] Responsive images use `srcset` with lazy loading

## Success Criteria

- Improved LCP score (< 2.5s)
- Reduced initial page load time (>50% fewer requests)
- Zero CLS from image loading
- Below-fold images load just before entering viewport
- Critical resources prioritized correctly
- WCAG 2.1 AA: 1.1.1 Non-text Content (alt text)
- Core Web Vitals pass (LCP, CLS, FID/INP)
