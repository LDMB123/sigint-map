---
id: image-presentation
title: Image Presentation - Visual Content Excellence
slug: image-presentation
category: UI/UX Objects
complexity: intermediate
browser_support: "Chromium 143+, Safari 18.2+, Firefox 133+"
platforms: "macOS 26.2+, iOS 18.2+, Android 15+"
silicon: "Apple Silicon optimized"
last_updated: 2026-01-21
---

# Image Presentation: Visual Content Excellence

> "Images are not decoration. They are content. Every image you serve must be optimized, responsive, and purposeful. Blur and pixelation are design failures." — Steve Jobs Philosophy

## Philosophy

Images represent visual content in your interface. They must be responsive across devices, load efficiently, and maintain quality at all sizes. In Steve Jobs' approach, images were never an afterthought—they required the same precision as typography. Images must look perfect on small screens and large screens, load fast, and gracefully handle errors.

## Responsive Images: srcset and sizes

Never serve the same image size to all devices. Use responsive image attributes.

```html
<!-- GOOD: Responsive image with srcset -->
<img
  src="image-800w.jpg"
  srcset="
    image-400w.jpg 400w,
    image-800w.jpg 800w,
    image-1200w.jpg 1200w,
    image-1600w.jpg 1600w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1200px) 50vw,
    800px
  "
  alt="Descriptive alt text"
/>

<!-- GOOD: High DPI support with pixel density -->
<img
  src="image.jpg"
  srcset="
    image.jpg 1x,
    image-2x.jpg 2x,
    image-3x.jpg 3x
  "
  alt="Descriptive alt text"
/>

<!-- GOOD: Both responsive and pixel density -->
<img
  src="image-800w.jpg"
  srcset="
    image-400w.jpg 400w 1x,
    image-800w.jpg 800w 1x,
    image-400w-2x.jpg 400w 2x,
    image-800w-2x.jpg 800w 2x
  "
  sizes="
    (max-width: 600px) 100vw,
    800px
  "
  alt="Descriptive alt text"
/>

<!-- BAD: Single image for all devices -->
<img src="image-1600w.jpg" alt="..." />

<!-- BAD: srcset without sizes (defaults to 100vw) -->
<img
  src="image.jpg"
  srcset="image-400w.jpg 400w, image-800w.jpg 800w"
/>
```

### Calculating srcset Sizes

```javascript
// Generate responsive image sizes
function generateResponsiveImages(baseFileName, basePath = '/images/') {
  const widths = [400, 600, 800, 1000, 1200, 1400, 1600];

  const srcset = widths
    .map(w => `${basePath}${baseFileName.replace(/\.jpg/, '')}-${w}w.jpg ${w}w`)
    .join(', ');

  return srcset;
}

// Usage
const responsive = generateResponsiveImages('hero-image.jpg');
// Result: /images/hero-image-400w.jpg 400w, /images/hero-image-600w.jpg 600w, ...

// Determine appropriate sizes attribute
function generateSizes() {
  return `
    (max-width: 480px) 100vw,
    (max-width: 768px) 80vw,
    (max-width: 1024px) 50vw,
    800px
  `;
}
```

## Lazy Loading: loading="lazy"

Lazy load images that aren't immediately visible. Speed matters more than every image loading.

```html
<!-- GOOD: Lazy load off-screen images -->
<img
  src="image.jpg"
  alt="Descriptive text"
  loading="lazy"
  decoding="async"
/>

<!-- GOOD: Combine with responsive attributes -->
<img
  src="image-800w.jpg"
  srcset="image-400w.jpg 400w, image-800w.jpg 800w"
  sizes="(max-width: 600px) 100vw, 800px"
  alt="Descriptive text"
  loading="lazy"
  decoding="async"
/>

<!-- GOOD: Critical above-the-fold image (no lazy load) -->
<img
  src="image-hero.jpg"
  srcset="image-hero-400w.jpg 400w, image-hero-800w.jpg 800w"
  sizes="100vw"
  alt="Hero image"
  loading="eager"
  fetchpriority="high"
/>

<!-- GOOD: Lazy load with fallback -->
<img
  src="image.jpg"
  alt="Descriptive text"
  loading="lazy"
  onError="this.src='placeholder.jpg'"
/>

<!-- BAD: No lazy loading for off-screen images -->
<img src="image.jpg" alt="..." />

<!-- BAD: Lazy load on critical above-fold image -->
<img src="hero.jpg" alt="..." loading="lazy" />
```

### JavaScript Lazy Load Fallback

```javascript
// Intersection Observer for browsers that don't support loading="lazy"
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.srcset = img.dataset.srcset;
        imageObserver.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach((img) => {
    imageObserver.observe(img);
  });
}
```

## Aspect Ratio Containers: Preventing Layout Shift

Use aspect-ratio CSS property to reserve space before image loads.

```css
/* Reserve space with aspect-ratio (no layout shift) */
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background-color: #E8E8E8;  /* Placeholder color */
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

/* For older browsers without aspect-ratio support */
@supports not (aspect-ratio: 16 / 9) {
  .image-container {
    position: relative;
    padding-bottom: 56.25%;  /* 16:9 = 1/0.5625 */
    height: 0;
    overflow: hidden;
  }

  .image-container img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}

/* Different aspect ratios */
.image-square { aspect-ratio: 1; }
.image-portrait { aspect-ratio: 3 / 4; }
.image-landscape { aspect-ratio: 4 / 3; }
.image-widescreen { aspect-ratio: 16 / 9; }
.image-ultrawide { aspect-ratio: 21 / 9; }

/* BAD: No aspect ratio (layout shift when image loads) */
.image-container { width: 100%; }  /* Height unknown */
```

## object-fit and object-position

Control how images scale and position within their containers.

```css
/* object-fit: cover (crop to fill, no distortion) */
.image-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;        /* Fills container, crops content */
  object-position: center;  /* Which part is visible */
}

/* object-fit: contain (fit entire image, might have letterbox) */
.image-contain {
  width: 100%;
  height: 100%;
  object-fit: contain;      /* Shows entire image */
  background-color: #F0F0F0;  /* Visible if letterbox */
}

/* object-fit: fill (stretch, might distort) */
.image-fill {
  width: 100%;
  height: 100%;
  object-fit: fill;         /* Stretches to fill */
}

/* object-position variations */
.image-top { object-position: top; }
.image-center { object-position: center; }
.image-bottom { object-position: bottom; }
.image-left { object-position: left center; }
.image-right { object-position: right center; }
.image-top-left { object-position: top left; }

/* Custom object-position */
.image-custom {
  object-position: 30% 70%;  /* x% y% from top-left */
}

<!-- Example usage with different object-fit values -->
<img src="image.jpg" class="image-cover" alt="..." />
<img src="image.jpg" class="image-contain" alt="..." />
<img src="image.jpg" class="image-fill" alt="..." />
```

## Image Placeholders: Blur-Up and LQIP

Show a low-quality placeholder while the real image loads.

```html
<!-- GOOD: Low Quality Image Placeholder (LQIP) -->
<img
  src="image-1200w.jpg"
  srcset="image-400w.jpg 400w, image-1200w.jpg 1200w"
  alt="Descriptive text"
  style="background: url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'%3E%3Crect fill='%23e8e8e8' width='1200' height='675'/%3E%3C/svg%3E) center/cover;"
/>

<!-- GOOD: Placeholder with inline blur-up image -->
<img
  src="image-1200w.jpg"
  srcset="image-400w.jpg 400w, image-1200w.jpg 1200w"
  alt="Descriptive text"
  style="
    background-image: url(data:image/jpeg;base64,/9j/4AAQSkZJRg...);
    background-size: cover;
  "
/>

<!-- GOOD: Picture element with placeholder -->
<picture>
  <source
    srcset="image-small.webp 400w, image-medium.webp 800w"
    type="image/webp"
    sizes="(max-width: 600px) 100vw, 800px"
  />
  <img
    src="image-800w.jpg"
    srcset="image-400w.jpg 400w, image-800w.jpg 800w"
    sizes="(max-width: 600px) 100vw, 800px"
    alt="Descriptive text"
    style="background-color: #e8e8e8;"
  />
</picture>
```

### LQIP Generation

```bash
# Generate low-quality inline image for LQIP
# Using ImageMagick or similar
convert original.jpg -resize 10x10 -quality 5 -interlace Plane - | base64

# Result: data:image/jpeg;base64,/9j/4AAQSkZJRg...
# Include as background image while full image loads
```

### React Progressive Image Component

```jsx
function ProgressiveImage({ src, alt, placeholder, ...props }) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState(null);

  useEffect(() => {
    let img = new Image();
    img.src = src;
    img.onload = () => setImageSrc(src);
  }, [src]);

  return (
    <img
      {...props}
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={imageSrc === src ? 'image-loaded' : 'image-loading'}
    />
  );
}

// Usage with CSS transition
<ProgressiveImage
  src="/images/hero-large.jpg"
  alt="Hero image"
  placeholder="data:image/jpeg;base64,..."
/>

// CSS
.image-loading {
  filter: blur(5px);
  transition: filter 0.3s ease-out;
}

.image-loaded {
  filter: blur(0);
}
```

## Art Direction with <picture>

Serve different images at different breakpoints (not just different sizes).

```html
<!-- GOOD: Art direction for different layouts -->
<picture>
  <!-- Mobile: portrait crop -->
  <source
    media="(max-width: 600px)"
    srcset="image-mobile-400w.jpg 400w, image-mobile-600w.jpg 600w"
    sizes="100vw"
  />
  <!-- Tablet: square crop -->
  <source
    media="(max-width: 1024px)"
    srcset="image-tablet-600w.jpg 600w, image-tablet-800w.jpg 800w"
    sizes="50vw"
  />
  <!-- Desktop: landscape crop -->
  <source
    srcset="image-desktop-1000w.jpg 1000w, image-desktop-1600w.jpg 1600w"
    sizes="800px"
  />
  <!-- Fallback -->
  <img src="image-desktop-1000w.jpg" alt="Descriptive text" />
</picture>

<!-- GOOD: Format switching (WebP with JPEG fallback) -->
<picture>
  <source
    srcset="image-400w.webp 400w, image-800w.webp 800w"
    type="image/webp"
    sizes="(max-width: 600px) 100vw, 800px"
  />
  <source
    srcset="image-400w.avif 400w, image-800w.avif 800w"
    type="image/avif"
    sizes="(max-width: 600px) 100vw, 800px"
  />
  <img
    src="image-800w.jpg"
    srcset="image-400w.jpg 400w, image-800w.jpg 800w"
    sizes="(max-width: 600px) 100vw, 800px"
    alt="Descriptive text"
  />
</picture>
```

## WebP/AVIF with Fallbacks

Modern image formats are significantly smaller. Use them with JPEG fallback.

```html
<!-- GOOD: Modern format with fallback -->
<picture>
  <!-- AVIF: Best compression (widest support needed) -->
  <source
    srcset="image-400w.avif 400w, image-800w.avif 800w"
    type="image/avif"
    sizes="(max-width: 600px) 100vw, 800px"
  />
  <!-- WebP: Good compression (Safari support better now) -->
  <source
    srcset="image-400w.webp 400w, image-800w.webp 800w"
    type="image/webp"
    sizes="(max-width: 600px) 100vw, 800px"
  />
  <!-- JPEG: Fallback (maximum compatibility) -->
  <img
    src="image-800w.jpg"
    srcset="image-400w.jpg 400w, image-800w.jpg 800w"
    sizes="(max-width: 600px) 100vw, 800px"
    alt="Descriptive text"
  />
</picture>

<!-- BAD: Single JPEG for all browsers -->
<img src="image.jpg" alt="..." />

<!-- BAD: WebP without JPEG fallback -->
<img src="image.webp" alt="..." />
```

### Format Comparison

| Format | Size   | Compression | Browser Support |
|--------|--------|-------------|-----------------|
| JPEG   | 100%   | Baseline    | 100% (all)      |
| PNG    | ~150%  | Lossless    | 100% (all)      |
| WebP   | ~70%   | Very good   | 96% (all modern)|
| AVIF   | ~50%   | Excellent   | 90% (modern)    |

## Decorative vs Meaningful: alt Text

Not all images need extensive alt text. Decorative images should be marked accordingly.

```html
<!-- MEANINGFUL: Convey the image content -->
<img
  src="product.jpg"
  alt="Blue wireless headphones with noise-canceling feature"
/>

<!-- MEANINGFUL: Describe what's in the image -->
<img
  src="chart.png"
  alt="Revenue growth chart showing 45% increase from Q1 to Q2 2024"
/>

<!-- DECORATIVE: Empty alt for purely visual elements -->
<img
  src="separator-line.svg"
  alt=""
  aria-hidden="true"
/>

<!-- DECORATIVE: Using role="presentation" for icon images -->
<img
  src="decorative-icon.svg"
  alt=""
  role="presentation"
/>

<!-- MEANINGFUL but concise -->
<img src="avatar.jpg" alt="Sarah Johnson, team lead" />

<!-- BAD: Redundant alt text -->
<img src="photo.jpg" alt="image" />
<img src="photo.jpg" alt="photo" />

<!-- BAD: Too verbose -->
<img src="photo.jpg" alt="This is a photo of a cat sitting on a table in front of a window" />

<!-- Better: Concise and descriptive -->
<img src="photo.jpg" alt="Orange tabby cat on table by window" />
```

## Anti-Patterns: What NOT to Do

### Anti-Pattern 1: No Responsive Images

```html
<!-- BAD: Same image for all devices -->
<img src="image-2000w.jpg" alt="..." />

<!-- Why it's bad:
  - Mobile users download huge images
  - Wastes bandwidth
  - Slow page load
  - Poor user experience on slow networks
-->

<!-- GOOD: Responsive images with srcset -->
<img
  src="image-800w.jpg"
  srcset="image-400w.jpg 400w, image-800w.jpg 800w, image-1200w.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 800px"
  alt="..."
/>
```

### Anti-Pattern 2: Loading All Images Eagerly

```html
<!-- BAD: Load all images immediately -->
<img src="below-fold-1.jpg" alt="..." />
<img src="below-fold-2.jpg" alt="..." />
<img src="below-fold-3.jpg" alt="..." />

<!-- Why it's bad:
  - Slows down initial page load
  - Wastes bandwidth on unseen images
  - Poor Core Web Vitals (LCP)
-->

<!-- GOOD: Lazy load off-screen images -->
<img src="below-fold-1.jpg" alt="..." loading="lazy" />
<img src="below-fold-2.jpg" alt="..." loading="lazy" />
<img src="below-fold-3.jpg" alt="..." loading="lazy" />

<!-- Eager load above-fold -->
<img src="hero.jpg" alt="..." loading="eager" fetchpriority="high" />
```

### Anti-Pattern 3: Layout Shift from Missing Aspect Ratio

```html
<!-- BAD: No aspect ratio, layout shifts -->
<img src="image.jpg" alt="..." />

<!-- Why it's bad:
  - CLS (Cumulative Layout Shift) increases
  - Bad user experience
  - Search ranking penalty
  - Bouncing text/content
-->

<!-- GOOD: Reserve space with aspect-ratio -->
<div style="aspect-ratio: 16 / 9;">
  <img src="image.jpg" alt="..." />
</div>
```

### Anti-Pattern 4: No Alt Text or Placeholder

```html
<!-- BAD: Missing alt text -->
<img src="image.jpg" />

<!-- Why it's bad:
  - Screen readers don't know what image shows
  - Image broken can't fallback
  - No placeholder while loading
  - Accessibility violation
-->

<!-- GOOD: Alt text + placeholder background -->
<img
  src="image.jpg"
  alt="Product photo showing blue headphones"
  style="background-color: #e8e8e8;"
/>
```

### Anti-Pattern 5: Modern Formats Without Fallback

```html
<!-- BAD: WebP without JPEG fallback -->
<img src="image.webp" alt="..." />

<!-- Why it's bad:
  - Doesn't display in older browsers
  - User sees broken image
  - No fallback available
-->

<!-- GOOD: Modern format with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="..." />
</picture>
```

## Implementation Examples

### Complete Responsive Image Pattern

```html
<picture>
  <!-- Mobile: portrait optimized -->
  <source
    media="(max-width: 640px)"
    srcset="
      image-mobile-400w.webp 400w,
      image-mobile-640w.webp 640w
    "
    type="image/webp"
    sizes="100vw"
  />
  <source
    media="(max-width: 640px)"
    srcset="
      image-mobile-400w.jpg 400w,
      image-mobile-640w.jpg 640w
    "
    type="image/jpeg"
    sizes="100vw"
  />

  <!-- Tablet: square optimized -->
  <source
    media="(max-width: 1024px)"
    srcset="
      image-tablet-600w.webp 600w,
      image-tablet-800w.webp 800w
    "
    type="image/webp"
    sizes="50vw"
  />
  <source
    media="(max-width: 1024px)"
    srcset="
      image-tablet-600w.jpg 600w,
      image-tablet-800w.jpg 800w
    "
    type="image/jpeg"
    sizes="50vw"
  />

  <!-- Desktop: landscape optimized -->
  <source
    srcset="
      image-desktop-1000w.webp 1000w,
      image-desktop-1600w.webp 1600w
    "
    type="image/webp"
    sizes="
      (max-width: 1200px) 100vw,
      1000px
    "
  />

  <!-- Fallback JPEG -->
  <img
    src="image-desktop-1000w.jpg"
    srcset="
      image-desktop-1000w.jpg 1000w,
      image-desktop-1600w.jpg 1600w
    "
    sizes="
      (max-width: 1200px) 100vw,
      1000px
    "
    alt="Descriptive alt text"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### React Image Component

```jsx
function ResponsiveImage({
  src,
  alt,
  aspectRatio = '16 / 9',
  loading = 'lazy',
  priority = false,
}) {
  return (
    <div
      style={{
        aspectRatio,
        width: '100%',
        overflow: 'hidden',
        borderRadius: '12px',
        backgroundColor: '#E8E8E8',
      }}
    >
      <picture>
        {/* WebP sources */}
        <source
          srcSet={`${src}-400w.webp 400w, ${src}-800w.webp 800w`}
          type="image/webp"
          sizes="(max-width: 600px) 100vw, 800px"
        />

        {/* JPEG fallback */}
        <img
          src={`${src}-800w.jpg`}
          srcSet={`${src}-400w.jpg 400w, ${src}-800w.jpg 800w`}
          sizes="(max-width: 600px) 100vw, 800px"
          alt={alt}
          loading={priority ? 'eager' : loading}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      </picture>
    </div>
  );
}

// Usage
<ResponsiveImage
  src="/images/hero"
  alt="Hero banner"
  aspectRatio="16 / 9"
  priority={true}
/>
```

## Quality Checklist

Before deploying images, verify:

- [ ] **Responsive srcset**: Multiple sizes provided
- [ ] **sizes Attribute**: Appropriate breakpoint logic
- [ ] **Aspect Ratio**: Reserved with CSS aspect-ratio
- [ ] **Lazy Loading**: Off-screen images use loading="lazy"
- [ ] **Priority Images**: Above-fold use loading="eager" + fetchpriority="high"
- [ ] **Alt Text**: Descriptive, concise, meaningful
- [ ] **Modern Formats**: WebP/AVIF with JPEG fallback
- [ ] **object-fit**: Appropriate for layout (cover, contain)
- [ ] **Placeholder**: Background color or blur-up LQIP
- [ ] **No Layout Shift**: No CLS from image loading
- [ ] **Decoding**: decoding="async" for non-critical images
- [ ] **Picture Element**: For art direction across breakpoints
- [ ] **Compressed**: Images optimized for web
- [ ] **All Devices**: Tested on mobile, tablet, desktop

---

## References

- [MDN: Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [Web.dev: Optimize Images](https://web.dev/optimize-images/)
- [WCAG 2.1: Images](https://www.w3.org/WAI/WCAG21/Understanding/images-of-text.html)
- [ImageOptim](https://imageoptim.com/) - Image optimization tool
- [TinyPNG](https://tinypng.com/) - Image compression
