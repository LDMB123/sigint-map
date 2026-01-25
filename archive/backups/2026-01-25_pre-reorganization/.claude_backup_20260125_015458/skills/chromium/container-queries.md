---
name: container-queries
description: Implement CSS Container Queries for component-based responsive design that responds to container size instead of viewport size
trigger: /container-queries
used_by: [full-stack-developer, senior-frontend-engineer, css-specialist]
---

# CSS Container Queries (Chrome 105+)

Enable true component-based responsive design by allowing components to respond to their container's size rather than the viewport.

**Chromium 2025 Baseline:** Chrome 105+ has complete container query support. No polyfills needed.

## When to Use

- Building reusable components that work in multiple contexts (sidebar, main, modal)
- Component libraries that need intrinsic responsiveness
- Card grids that adapt to available space
- Responsive tables that reflow based on container width
- Modular UI systems where components don't know their placement
- Design systems requiring context-aware components

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| Component Type | string | Yes | Type of component (card, table, form, list, etc.) |
| Breakpoints | array | Yes | Container width breakpoints (e.g., [400px, 640px, 900px]) |
| Framework | string | No | CSS framework or vanilla CSS |
| Fallback Strategy | boolean | No | Whether to include @media fallbacks |

## Steps

### 1. Basic Container Query Pattern

The fundamental pattern for any component:

```css
/* Step 1: Define the container */
.component-wrapper {
  container-type: inline-size;  /* Track width only */
  container-name: my-component;  /* Optional but recommended */
}

/* Step 2: Apply container queries */
@container my-component (max-width: 400px) {
  .component-content {
    flex-direction: column;
    font-size: 0.875rem;
  }
}

@container my-component (min-width: 640px) {
  .component-content {
    flex-direction: row;
    font-size: 1rem;
  }
}

/* Step 3: Fallback for older browsers */
@supports not (container-type: inline-size) {
  @media (max-width: 640px) {
    .component-content {
      flex-direction: column;
      font-size: 0.875rem;
    }
  }
}
```

### 2. Real-World Component Examples

**Product Card:**

```css
/* Card wrapper */
.product-card {
  container-type: inline-size;
  container-name: product-card;
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

/* Default horizontal layout */
.card-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 0.375rem;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.card-price {
  font-size: 1.25rem;
  color: #059669;
}

/* Small container: Stack vertically */
@container product-card (max-width: 300px) {
  .product-card {
    flex-direction: column;
  }

  .card-image {
    width: 100%;
    height: 200px;
  }

  .card-title {
    font-size: 1rem;
  }

  .card-price {
    font-size: 1.125rem;
  }
}

/* Large container: Enhanced layout */
@container product-card (min-width: 500px) {
  .card-image {
    width: 160px;
    height: 160px;
  }

  .card-title {
    font-size: 1.25rem;
  }
}

/* Fallback */
@supports not (container-type: inline-size) {
  @media (max-width: 640px) {
    .product-card {
      flex-direction: column;
    }

    .card-image {
      width: 100%;
      height: 200px;
    }
  }
}
```

**Data Table:**

```css
.table-wrapper {
  container-type: inline-size;
  container-name: data-table;
  width: 100%;
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.table-header-cell,
.table-cell {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.table-header-cell {
  font-weight: 600;
  background: #f9fafb;
}

/* Compact view for narrow containers */
@container data-table (max-width: 640px) {
  .table-wrapper {
    border-radius: 0.375rem;
  }

  .data-table {
    font-size: 0.875rem;
  }

  .table-header-cell,
  .table-cell {
    padding: 0.5rem 0.75rem;
  }

  /* Hide less important columns */
  .table-cell.optional {
    display: none;
  }
}

/* Enhanced view for wide containers */
@container data-table (min-width: 900px) {
  .table-header-cell,
  .table-cell {
    padding: 1rem 1.5rem;
  }
}

/* Fallback */
@supports not (container-type: inline-size) {
  @media (max-width: 640px) {
    .data-table {
      font-size: 0.875rem;
    }

    .table-header-cell,
    .table-cell {
      padding: 0.5rem 0.75rem;
    }
  }
}
```

**Stat Card:**

```css
.stat-card {
  container-type: inline-size;
  container-name: stat-card;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem;
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.025em;
}

/* Compact for small containers */
@container stat-card (max-width: 320px) {
  .stat-card {
    padding: 1rem;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
  }

  .stat-value {
    font-size: 1.875rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }
}

/* Enhanced for large containers */
@container stat-card (min-width: 400px) {
  .stat-card {
    padding: 2rem;
    gap: 1rem;
  }

  .stat-icon {
    width: 64px;
    height: 64px;
  }

  .stat-value {
    font-size: 3rem;
  }

  .stat-label {
    font-size: 1rem;
  }
}

/* Fallback */
@supports not (container-type: inline-size) {
  @media (max-width: 480px) {
    .stat-card {
      padding: 1rem;
    }

    .stat-value {
      font-size: 1.875rem;
    }
  }
}
```

### 3. Framework-Specific Implementations

**React Component:**

```tsx
// ProductCard.tsx
import './ProductCard.css';

interface ProductCardProps {
  title: string;
  price: number;
  image: string;
  description: string;
}

export function ProductCard({ title, price, image, description }: ProductCardProps) {
  return (
    <article className="product-card">
      <img src={image} alt={title} className="card-image" />
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
        <span className="card-price">${price.toFixed(2)}</span>
        <button className="card-button">Add to Cart</button>
      </div>
    </article>
  );
}

// Usage in different contexts
function App() {
  return (
    <>
      {/* Full width */}
      <div className="main-content">
        <ProductCard {...product} />
      </div>

      {/* Sidebar (narrower) */}
      <aside className="sidebar" style={{ width: '300px' }}>
        <ProductCard {...product} />
      </aside>

      {/* Modal (medium width) */}
      <dialog className="modal" style={{ width: '500px' }}>
        <ProductCard {...product} />
      </dialog>
    </>
  );
}
```

**Vue 3 Component:**

```vue
<template>
  <article class="stat-card">
    <div class="stat-icon">
      <slot name="icon" />
    </div>
    <div class="stat-content">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value">{{ formattedValue }}</div>
      <div v-if="subtitle" class="stat-subtitle">{{ subtitle }}</div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: number;
  subtitle?: string;
}

const props = defineProps<Props>();

const formattedValue = computed(() => {
  return props.value.toLocaleString();
});
</script>

<style scoped>
/* Container query styles here */
.stat-card {
  container-type: inline-size;
  container-name: stat-card;
  /* ... rest of styles ... */
}

@container stat-card (max-width: 320px) {
  /* Compact styles */
}
</style>
```

**Svelte Component:**

```svelte
<!-- StatCard.svelte -->
<script lang="ts">
  let { label, value, subtitle, variant = 'default' } = $props();
</script>

<article class="stat-card" data-variant={variant}>
  <div class="stat-icon">
    <slot name="icon" />
  </div>
  <div class="stat-content">
    <div class="stat-label">{label}</div>
    <div class="stat-value">{value.toLocaleString()}</div>
    {#if subtitle}
      <div class="stat-subtitle">{subtitle}</div>
    {/if}
  </div>
</article>

<style>
  .stat-card {
    container-type: inline-size;
    container-name: stat-card;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  @container stat-card (max-width: 320px) {
    .stat-card {
      padding: var(--space-3);
    }

    .stat-value {
      font-size: var(--text-2xl);
    }
  }

  @container stat-card (min-width: 400px) {
    .stat-card {
      padding: var(--space-6);
    }

    .stat-value {
      font-size: var(--text-4xl);
    }
  }

  /* Fallback */
  @supports not (container-type: inline-size) {
    @media (max-width: 480px) {
      .stat-card {
        padding: var(--space-3);
      }

      .stat-value {
        font-size: var(--text-2xl);
      }
    }
  }
</style>
```

### 4. Container Query Units

Use container query units for truly fluid design:

```css
.responsive-card {
  container-type: inline-size;
  container-name: card;
  padding: 1rem;
}

.card-title {
  /* Font size scales with container width */
  font-size: clamp(1rem, 5cqw, 2rem);  /* cqw = container query width */
}

.card-image {
  /* Size relative to container */
  width: 100cqw;   /* 100% of container width */
  height: 50cqh;   /* 50% of container height (if container-type: size) */
}

.card-spacing {
  gap: 2cqi;  /* cqi = container query inline (width in horizontal writing mode) */
}

/* Container query units:
 * cqw  - 1% of container width
 * cqh  - 1% of container height
 * cqi  - 1% of container inline size
 * cqb  - 1% of container block size
 * cqmin - smaller of cqi or cqb
 * cqmax - larger of cqi or cqb
 */
```

### 5. Advanced Patterns

**Multi-Breakpoint Card:**

```css
.card {
  container-type: inline-size;
  container-name: adaptive-card;
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

/* Very small (< 300px): Stack everything */
@container adaptive-card (max-width: 300px) {
  .card {
    grid-template-columns: 1fr;
  }

  .card-image {
    aspect-ratio: 16/9;
  }
}

/* Small (300-500px): Image + content side by side */
@container adaptive-card (min-width: 300px) and (max-width: 500px) {
  .card {
    grid-template-columns: 100px 1fr;
  }

  .card-image {
    aspect-ratio: 1;
  }
}

/* Medium (500-700px): Wider image */
@container adaptive-card (min-width: 500px) and (max-width: 700px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}

/* Large (> 700px): Full enhanced layout */
@container adaptive-card (min-width: 700px) {
  .card {
    grid-template-columns: 300px 1fr auto;
    padding: 2rem;
  }
}
```

**Container Style Queries (Chrome 111+):**

```css
/* Query container's style properties */
.card {
  container-type: inline-size;
  container-name: card;
}

/* Respond to container's custom property */
@container card style(--theme: dark) {
  .card-content {
    color: white;
    background: #1f2937;
  }
}

@container card style(--theme: light) {
  .card-content {
    color: black;
    background: white;
  }
}
```

## Expected Output

After implementing container queries:

**Responsive Behavior:**
- Components adapt to their container, not viewport
- Same component works in sidebar (300px), main content (800px), modal (500px)
- True component-based responsive design
- No JavaScript required for layout changes

**Browser Compatibility:**
- Chrome 105+: Full support
- Safari 16+: Full support
- Firefox 110+: Full support
- Automatic fallback to @media queries in older browsers

**Example Behavior:**

```
Viewport: 1200px wide
┌─────────────────────────────────────────────────────┐
│ Sidebar (300px)       │  Main Content (850px)       │
│ ┌──────────────────┐  │  ┌─────────────────────┐   │
│ │ Card: Stacked    │  │  │ Card: Horizontal    │   │
│ │ (< 300px)        │  │  │ (> 500px)           │   │
│ │ [Image]          │  │  │ [Image] [Content]   │   │
│ │ [Content]        │  │  │                     │   │
│ └──────────────────┘  │  └─────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Best Practices

**Do:**
- Add `container-type` to the direct parent of responsive content
- Use descriptive `container-name` values for clarity
- Always include `@supports` fallback for older browsers
- Test components in multiple container contexts
- Use container query units (cqw, cqi) for fluid scaling
- Prefer `inline-size` over `size` (avoids layout issues)

**Don't:**
- Don't add `container-type` to `<body>` or `<html>`
- Don't query containers that are descendants (creates circular dependencies)
- Don't forget fallbacks for Safari < 16, Chrome < 105
- Don't use `container-type: size` unless you need both width and height queries
- Don't nest containers unnecessarily (adds complexity)

## Debugging

**Chrome DevTools:**

1. Inspect element with container query
2. Right-click on `@container` rule in Styles panel
3. Select "Show container boundaries"
4. Visual overlay shows container dimensions

**Manual Debugging:**

```css
/* Add debug outline to containers */
[style*="container-type"],
[class*="container"] {
  outline: 2px dashed red;
  outline-offset: 2px;
}

/* Log container size with pseudo-element */
.debug-container::before {
  content: "Container: " attr(data-cq-width);
  position: absolute;
  top: 0;
  left: 0;
  background: red;
  color: white;
  padding: 0.25rem;
  font-size: 0.75rem;
  z-index: 9999;
}
```

**JavaScript Monitoring:**

```javascript
// Monitor container size changes
const container = document.querySelector('.product-card');
const observer = new ResizeObserver(([entry]) => {
  const width = entry.contentRect.width;
  console.log(`Container width: ${width}px`);

  // Update debug display
  entry.target.setAttribute('data-cq-width', `${width}px`);
});

observer.observe(container);
```

## Migration from Media Queries

**Before (Media Queries):**

```css
.card {
  display: flex;
}

@media (max-width: 640px) {
  .card {
    flex-direction: column;
  }
}
```

**After (Container Queries):**

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

.card {
  display: flex;
}

@container card (max-width: 400px) {
  .card {
    flex-direction: column;
  }
}

/* Fallback */
@supports not (container-type: inline-size) {
  @media (max-width: 640px) {
    .card {
      flex-direction: column;
    }
  }
}
```

## References

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Chrome Developers: Container Queries](https://developer.chrome.com/docs/css-ui/container-queries/)
- [Can I Use: Container Queries](https://caniuse.com/css-container-queries)
- [Container Query Units](https://web.dev/articles/cq-units)
- [CSS Containment Spec](https://www.w3.org/TR/css-contain-3/)
