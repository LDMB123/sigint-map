---
name: view-transitions
description: Implement View Transitions API for smooth, animated page transitions without JavaScript animation libraries
trigger: /view-transitions
used_by: [full-stack-developer, senior-frontend-engineer, ui-ux-specialist]
---

# View Transitions API Implementation (Chrome 111+)

Create smooth, native-like page transitions using the View Transitions API.

**Chromium 2025 Baseline:**
- Chrome 126+ for cross-document transitions (recommended)
- Chrome 111+ for same-document SPA transitions
- Chrome 143+ includes `document.activeViewTransition` property for enhanced control

## When to Use

- Single Page Applications (SPAs) needing smooth route transitions
- Multi-Page Applications (MPAs) wanting native-app-like navigation
- Image galleries with hero image transitions
- List-to-detail navigation patterns
- Tab switching with smooth animations
- Any UI state change that benefits from smooth visual continuity
- Replacing JavaScript animation libraries for simpler code

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| Transition Type | string | Yes | Same-document (SPA) or cross-document (MPA) |
| Framework | string | Yes | React, Vue, Svelte, vanilla JS, etc. |
| Animation Style | string | No | Fade, slide, morph, custom |
| Target Elements | array | No | Specific elements to animate (view-transition-name) |

## Steps

### 1. Basic View Transition (Same-Document, Chrome 111+)

For SPAs or dynamic content updates:

```javascript
// Vanilla JavaScript - Chromium 2025 (no feature detection needed)
async function updateView(updateCallback) {
  // View Transitions API available in all Chrome 111+ / Chromium 2025
  const transition = document.startViewTransition(() => {
    updateCallback();
  });

  // Wait for transition to complete
  await transition.finished;
}

// Usage
updateView(() => {
  document.getElementById('content').innerHTML = newContent;
});
```

**Note:** For Chromium 143+, you can also use `document.activeViewTransition` property to check if a transition is active.

**Default Animation (Automatic):**

The browser automatically:
1. Captures screenshot of current page
2. Runs your update callback
3. Captures screenshot of new page
4. Crossfades between them

No CSS required for basic fade transition.

### 2. Cross-Document Transitions (Chrome 126+)

For traditional multi-page sites:

**HTML (in `<head>`):**

```html
<meta name="view-transition" content="same-origin">
```

**Or via CSS:**

```css
@view-transition {
  navigation: auto;
}
```

That's it! The browser will automatically animate between page navigations.

### 3. Named Element Transitions

Animate specific elements with `view-transition-name`:

```css
/* Assign view transition names to elements */
.hero-image {
  view-transition-name: hero;
}

.page-title {
  view-transition-name: title;
}

.product-card {
  view-transition-name: product-card;
}

/* Important: view-transition-name must be unique on the page */
```

**Example: Image Gallery Transition**

```html
<!-- Thumbnail page -->
<img
  src="photo-thumb.jpg"
  alt="Photo"
  style="view-transition-name: main-photo"
>

<!-- Detail page -->
<img
  src="photo-full.jpg"
  alt="Photo"
  style="view-transition-name: main-photo"
>
```

The browser automatically morphs between the thumbnail and full-size image.

### 4. Custom Transition Animations

Override default animations with CSS:

```css
/* Default transition (crossfade) */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* Customize specific element transitions */
::view-transition-old(hero) {
  animation: fade-out 0.3s ease-out;
}

::view-transition-new(hero) {
  animation: fade-in 0.3s ease-in;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Slide Transition:**

```css
::view-transition-old(root) {
  animation: slide-out-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-new(root) {
  animation: slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-out-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

**Zoom Transition:**

```css
::view-transition-old(product-card) {
  animation: zoom-out 0.3s ease-out;
  transform-origin: center;
}

::view-transition-new(product-card) {
  animation: zoom-in 0.3s ease-in;
  transform-origin: center;
}

@keyframes zoom-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}

@keyframes zoom-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### 5. Framework-Specific Implementations

**React (with React Router):**

```tsx
// useViewTransition.ts
import { useCallback } from 'react';

export function useViewTransition() {
  const startTransition = useCallback((updateCallback: () => void) => {
    if (!document.startViewTransition) {
      updateCallback();
      return;
    }

    document.startViewTransition(() => {
      updateCallback();
    });
  }, []);

  return { startTransition };
}

// Component usage
import { useNavigate } from 'react-router-dom';
import { useViewTransition } from './useViewTransition';

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { startTransition } = useViewTransition();

  const handleClick = () => {
    startTransition(() => {
      navigate(`/products/${product.id}`);
    });
  };

  return (
    <article
      onClick={handleClick}
      style={{ viewTransitionName: `product-${product.id}` }}
    >
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
    </article>
  );
}
```

**Vue 3 (with Vue Router):**

```typescript
// composables/useViewTransition.ts
export function useViewTransition() {
  const startTransition = (updateCallback: () => void) => {
    if (!document.startViewTransition) {
      updateCallback();
      return;
    }

    document.startViewTransition(() => {
      updateCallback();
    });
  };

  return { startTransition };
}

// Component
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useViewTransition } from '@/composables/useViewTransition';

const router = useRouter();
const { startTransition } = useViewTransition();

const navigateToProduct = (productId: number) => {
  startTransition(() => {
    router.push(`/products/${productId}`);
  });
};
</script>

<template>
  <article
    @click="navigateToProduct(product.id)"
    :style="{ viewTransitionName: `product-${product.id}` }"
  >
    <img :src="product.image" :alt="product.name">
    <h3>{{ product.name }}</h3>
  </article>
</template>
```

**SvelteKit:**

```typescript
// utils/view-transitions.ts
export function navigateWithTransition(
  updateCallback: () => void
): Promise<void> {
  if (!document.startViewTransition) {
    updateCallback();
    return Promise.resolve();
  }

  const transition = document.startViewTransition(() => {
    updateCallback();
  });

  return transition.finished;
}

// +page.svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { navigateWithTransition } from '$lib/utils/view-transitions';

  async function handleProductClick(productId: number) {
    await navigateWithTransition(() => {
      goto(`/products/${productId}`);
    });
  }
</script>

<article
  on:click={() => handleProductClick(product.id)}
  style="view-transition-name: product-{product.id}"
>
  <img src={product.image} alt={product.name} />
  <h3>{product.name}</h3>
</article>
```

### 6. Advanced Patterns

**Conditional Transitions:**

```javascript
// Only transition on forward navigation
let isBackNavigation = false;

window.addEventListener('popstate', () => {
  isBackNavigation = true;
});

function navigate(url) {
  if (isBackNavigation) {
    // Skip transition on back button
    window.location.href = url;
    isBackNavigation = false;
  } else {
    // Use transition on forward navigation
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        window.location.href = url;
      });
    } else {
      window.location.href = url;
    }
  }
}
```

**Different Transitions for Different Routes:**

```css
/* Default transition */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* Specific transition for modal routes */
[data-route-type="modal"] ::view-transition-new(root) {
  animation: scale-up 0.3s ease-out;
}

@keyframes scale-up {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Specific transition for detail pages */
[data-route-type="detail"] ::view-transition-old(root) {
  animation: slide-out-left 0.3s ease-out;
}

[data-route-type="detail"] ::view-transition-new(root) {
  animation: slide-in-right 0.3s ease-in;
}
```

**Programmatic Transition Control:**

```javascript
const transition = document.startViewTransition(() => {
  updateDOM();
});

// Access transition promises
await transition.updateCallbackDone;  // DOM updated
console.log('DOM updated');

await transition.ready;  // Pseudo-elements created
console.log('Transition started');

await transition.finished;  // Animation complete
console.log('Transition finished');

// Skip transition programmatically
// transition.skipTransition();
```

**Shared Element Transitions (List to Detail):**

```html
<!-- List page -->
<div class="product-list">
  <article style="view-transition-name: product-123">
    <img src="product-123.jpg" alt="Product">
    <h3>Product Name</h3>
  </article>
</div>

<!-- Detail page -->
<div class="product-detail">
  <article style="view-transition-name: product-123">
    <img src="product-123-large.jpg" alt="Product">
    <h1>Product Name</h1>
    <p>Full description...</p>
  </article>
</div>
```

The browser automatically morphs from the list item to the detail view.

### 7. Accessibility Considerations

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.001s !important;
    animation-delay: 0s !important;
  }
}

/* Alternative: Skip transitions entirely */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

**Focus Management:**

```javascript
document.startViewTransition(async () => {
  // Update DOM
  updateContent();

  // Wait for next frame
  await new Promise(resolve => requestAnimationFrame(resolve));

  // Focus new content
  const newHeading = document.querySelector('h1');
  newHeading?.focus();
});
```

## Expected Output

After implementing View Transitions:

**User Experience:**
- Smooth, native-like page transitions
- Visual continuity between states/pages
- No JavaScript animation libraries needed
- GPU-accelerated animations (performant)
- Automatic morph animations for shared elements

**Performance:**
- Runs on GPU (60fps on modern hardware)
- No layout thrashing
- Minimal JavaScript overhead
- Better than manual animations

**Browser Support:**
- Chrome 111+: Same-document transitions
- Chrome 126+: Cross-document transitions
- Safari 18+: Limited support
- Automatic fallback in unsupported browsers

**Example Visual Flow:**

```
Before Transition:
┌──────────────────┐
│ [Thumbnail]      │
│ Product Name     │
└──────────────────┘

During Transition (automatic morph):
┌────────────────────┐
│   [Growing Image]  │
│   Product Name     │
└────────────────────┘

After Transition:
┌──────────────────────────┐
│ [Full Hero Image]        │
│ Product Name             │
│ Full description...      │
└──────────────────────────┘
```

## Best Practices

**Do:**
- Keep `view-transition-name` unique per page
- Use semantic names (e.g., "hero", "title", "product-123")
- Respect `prefers-reduced-motion`
- Test transitions on slower devices
- Use cross-document transitions for MPAs
- Animate only necessary elements (better performance)
- Keep animations under 300ms for responsiveness

**Don't:**
- Don't assign same `view-transition-name` to multiple elements
- Don't animate large lists (performance issue)
- Don't forget fallback for unsupported browsers
- Don't use transitions for every state change (jarring)
- Don't block user interaction during transitions
- Don't animate if content is still loading

## Debugging

**Chrome DevTools:**

1. Open DevTools → Settings → Experiments
2. Enable "Emulate CSS view-transition-group"
3. Inspect pseudo-elements:
   - `::view-transition`
   - `::view-transition-group(*)`
   - `::view-transition-old(*)`
   - `::view-transition-new(*)`

**Console Monitoring:**

```javascript
document.startViewTransition(async () => {
  console.log('Starting transition');

  updateDOM();

  console.log('DOM updated');
}).finished.then(() => {
  console.log('Transition complete');
}).catch((error) => {
  console.error('Transition failed:', error);
});
```

**Visual Debugging:**

```css
/* Outline transition elements */
::view-transition-group(*) {
  outline: 2px solid red;
}

::view-transition-old(*) {
  outline: 2px solid blue;
}

::view-transition-new(*) {
  outline: 2px solid green;
}
```

## Common Patterns

**Page Router Transition (Next.js App Router):**

```tsx
'use client';

import { useRouter } from 'next/navigation';

export function Link({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!document.startViewTransition) {
      router.push(href);
      return;
    }

    document.startViewTransition(() => {
      router.push(href);
    });
  };

  return (
    <a href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
```

**Tab Switching:**

```javascript
function switchTab(newTabId) {
  document.startViewTransition(() => {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
    });

    // Show selected tab
    document.getElementById(newTabId).style.display = 'block';

    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${newTabId}"]`).classList.add('active');
  });
}
```

**Image Gallery:**

```javascript
function openLightbox(imageId) {
  const thumbnail = document.querySelector(`[data-image="${imageId}"]`);

  document.startViewTransition(() => {
    // Create lightbox
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <img
        src="${thumbnail.src.replace('-thumb', '-full')}"
        alt="${thumbnail.alt}"
        style="view-transition-name: image-${imageId}"
      >
    `;

    document.body.appendChild(lightbox);
  });
}
```

## Browser Compatibility

| Browser | Same-Document | Cross-Document |
|---------|---------------|----------------|
| Chrome | 111+ | 126+ |
| Edge | 111+ | 126+ |
| Safari | 18+ (partial) | No |
| Firefox | No | No |

**Feature Detection:**

```javascript
const supportsViewTransitions = 'startViewTransition' in document;

if (supportsViewTransitions) {
  console.log('View Transitions supported');
} else {
  console.log('Using fallback');
}
```

## Performance Optimization

**Limit Animated Elements:**

```css
/* Only animate specific elements, not entire page */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;  /* Disable root animation */
}

/* Animate only hero image */
::view-transition-old(hero),
::view-transition-new(hero) {
  animation-duration: 0.3s;
}
```

**Hardware Acceleration:**

```css
/* Ensure GPU acceleration */
::view-transition-old(*),
::view-transition-new(*) {
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

## References

- [MDN: View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Chrome for Developers: View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions/)
- [Web.dev: Smooth Transitions](https://developer.chrome.com/docs/web-platform/view-transitions/)
- [View Transitions Spec (CSSWG)](https://drafts.csswg.org/css-view-transitions/)
