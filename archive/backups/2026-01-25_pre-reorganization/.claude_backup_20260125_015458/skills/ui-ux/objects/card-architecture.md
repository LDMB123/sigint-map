---
id: card-architecture
title: Card Architecture - Content Containers
slug: card-architecture
category: UI/UX Objects
complexity: intermediate
browser_support: "Chromium 143+, Safari 18.2+, Firefox 133+"
platforms: "macOS 26.2+, iOS 18.2+, Android 15+"
silicon: "Apple Silicon optimized"
last_updated: 2026-01-21
---

# Card Architecture: Content Containers

> "Cards are the building blocks of modern interfaces. They must be internally consistent and externally scalable. One bad card breaks the entire rhythm." — Steve Jobs Philosophy

## Philosophy

Cards are the fundamental unit of content organization in modern UIs. They provide visual separation, contained hierarchy, and clear boundaries. In Steve Jobs' approach, cards weren't just containers—they were composed experiences with careful attention to hierarchy, spacing, and interaction. Every card in a system should follow the same architecture, from padding to shadows to border radius.

## Consistent Padding and Margin

Padding inside cards and margin between cards must follow a predictable scale.

```css
/* Define spacing scale in CSS custom properties */
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
}

/* Base card styling */
.card {
  padding: var(--spacing-lg);  /* 16px internal padding */
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

/* Card container spacing */
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);  /* 16px gap between cards */
}

/* Spacing sections */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);  /* 16px between card sections */
}

/* Consistent internal structure */
.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid #ECECEC;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid #ECECEC;
}

/* BAD: Arbitrary padding values */
.card { padding: 14px 18px 11px 15px; }  /* Not on scale */

/* BAD: Inconsistent gaps */
.card-item-1 { margin-bottom: 12px; }
.card-item-2 { margin-bottom: 18px; }
.card-item-3 { margin-bottom: 16px; }
```

## Shadow Hierarchy: Elevation System

Use shadows to create visual hierarchy. Not all cards have the same shadow.

```css
/* Define elevation levels */
:root {
  /* Elevation 0: No shadow (flat) */
  --elevation-0: none;

  /* Elevation 1: Subtle, resting state */
  --elevation-1: 0 1px 3px rgba(0, 0, 0, 0.1);

  /* Elevation 2: Standard, interactive */
  --elevation-2: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);

  /* Elevation 3: Elevated, hover state */
  --elevation-3: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);

  /* Elevation 4: High, modal or important */
  --elevation-4: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
}

/* Card elevation defaults */
.card {
  box-shadow: var(--elevation-1);
}

/* Interactive cards elevate on hover */
.card-interactive {
  cursor: pointer;
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-interactive:hover {
  box-shadow: var(--elevation-3);
  transform: translateY(-2px);
}

.card-interactive:active {
  box-shadow: var(--elevation-2);
  transform: translateY(-1px);
}

/* Modal or overlay cards */
.card-modal {
  box-shadow: var(--elevation-4);
}

/* Flat cards with border instead of shadow */
.card-flat {
  box-shadow: var(--elevation-0);
  border: 1px solid #ECECEC;
}

/* BAD: Inconsistent shadows */
.card { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.card:hover { box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }  /* Too much change */

<!-- BAD: No hover elevation difference -->
.card { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.card:hover { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
```

## Border Radius Scale

Consistent border radius across all cards. Most cards use the same value.

```css
/* Define border radius scale */
:root {
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
}

/* Standard card border radius */
.card {
  border-radius: var(--radius-md);  /* 12px - most common */
}

/* Smaller cards or compact mode */
.card-sm {
  border-radius: var(--radius-sm);  /* 6px */
}

/* Large feature cards */
.card-lg {
  border-radius: var(--radius-lg);  /* 16px */
}

/* Images in cards should match card radius */
.card-image {
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  /* Top corners match card, bottom is inside content */
}

/* BAD: Arbitrary border radius -->
.card { border-radius: 8px; }
.card-sm { border-radius: 4px; }
.card-lg { border-radius: 14px; }
```

## Image Aspect Ratios: aspect-ratio Property

Never let images break layouts. Use aspect-ratio property for predictable dimensions.

```css
/* Define aspect ratio scale */
:root {
  --aspect-square: 1 / 1;
  --aspect-landscape: 4 / 3;
  --aspect-widescreen: 16 / 9;
  --aspect-portrait: 2 / 3;
}

/* Card with image */
.card-with-image {
  overflow: hidden;
  border-radius: var(--radius-md);
}

.card-image {
  aspect-ratio: var(--aspect-widescreen);  /* 16:9 */
  width: 100%;
  height: auto;
  object-fit: cover;
  object-position: center;
  display: block;
}

/* Product card with square image */
.card-product {
  display: flex;
  flex-direction: column;
}

.card-product-image {
  aspect-ratio: var(--aspect-square);
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius-md);
}

.card-product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Portrait image (for profiles, etc) */
.card-avatar-large {
  aspect-ratio: var(--aspect-portrait);
  width: 100%;
  border-radius: var(--radius-md);
}

/* Multiple images in grid */
.card-gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.card-gallery-item {
  aspect-ratio: var(--aspect-square);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.card-gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* BAD: Image with no aspect ratio (layout shift) */
.card-image { width: 100%; }  /* Height will vary */

<!-- BAD: Fixed height with wrong aspect -->
.card-image { width: 100%; height: 200px; }  /* Might distort image -->
```

## Content Hierarchy Within Cards

Establish clear visual hierarchy inside cards: title > metadata > description > actions.

```html
<!-- GOOD: Clear hierarchy structure -->
<article class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-meta">Posted 2 hours ago</p>
  </div>

  <div class="card-body">
    <img class="card-image" src="image.jpg" alt="Card image" />
    <p class="card-description">
      This is the main content description that provides context.
    </p>
  </div>

  <div class="card-footer">
    <button class="button button-secondary">Learn more</button>
    <button class="button button-ghost">Save</button>
  </div>
</article>
```

```css
/* Hierarchy through typography and spacing */
.card-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: #1A1A1A;
  margin: 0;
}

.card-meta {
  font-size: 13px;
  font-weight: 400;
  color: #666666;
  margin: 0;
}

.card-description {
  font-size: 14px;
  line-height: 1.6;
  color: #333333;
  margin: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.card-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: var(--radius-sm);
}

.card-footer {
  display: flex;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid #ECECEC;
}

/* BAD: No visual hierarchy, all text same size/weight */
.card-content { font-size: 14px; font-weight: 400; }
```

## Interactive vs Static Cards

Card interaction patterns differ. Make it clear whether a card is clickable.

```html
<!-- GOOD: Static card with interactive elements inside -->
<div class="card">
  <img class="card-image" src="image.jpg" alt="" />
  <h3 class="card-title">Card Title</h3>
  <p class="card-description">Description text</p>
  <button class="button button-primary">Click me</button>
</div>

<!-- GOOD: Fully interactive card (entire card is clickable) -->
<a href="/item/123" class="card card-interactive">
  <img class="card-image" src="image.jpg" alt="" />
  <h3 class="card-title">Card Title</h3>
  <p class="card-description">Click anywhere to view details</p>
</a>

<!-- GOOD: Card with mixed interactivity (card + actions) -->
<article class="card card-interactive">
  <a href="/item/123" class="card-content-link">
    <img class="card-image" src="image.jpg" alt="" />
    <h3 class="card-title">Card Title</h3>
    <p class="card-description">Click to view details</p>
  </a>
  <div class="card-actions">
    <button class="button button-secondary" aria-label="Save">Save</button>
    <button class="button button-ghost" aria-label="Share">Share</button>
  </div>
</article>
```

```css
/* Static card - no interaction styling */
.card {
  background: white;
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

/* Interactive card (entire card clickable) */
.card-interactive {
  cursor: pointer;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.card-interactive:hover {
  box-shadow: var(--elevation-3);
  transform: translateY(-2px);
}

.card-interactive:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

/* Card with mixed interactivity */
.card-content-link {
  text-decoration: none;
  color: inherit;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid #ECECEC;
}

/* BAD: Unclear if card is clickable (no cursor change) */
.card { }  /* No hover state */

<!-- BAD: Clickable card with no visual feedback -->
.card-clickable { cursor: pointer; }  /* No hover effect -->
```

## Hover States for Clickable Cards

Clickable cards need obvious feedback.

```css
/* Hover state composition: shadow + subtle transform */
.card-interactive:hover {
  /* Elevation increase */
  box-shadow: var(--elevation-3);
  /* Subtle lift */
  transform: translateY(-2px);
  /* Optional: background tint */
  background-color: rgba(0, 102, 204, 0.02);
}

/* Alternate: No transform, just shadow */
.card-interactive-subtle:hover {
  box-shadow: var(--elevation-3);
}

/* Alternate: Accent border on hover */
.card-interactive-accent:hover {
  box-shadow: var(--elevation-2);
  border-left: 4px solid #0066CC;
  padding-left: calc(var(--spacing-lg) - 4px);  /* Maintain layout */
}

/* Active state (being clicked) */
.card-interactive:active {
  box-shadow: var(--elevation-2);
  transform: translateY(-1px);
}

/* Focus state (keyboard navigation) */
.card-interactive:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

/* Disabled state */
.card-interactive:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* BAD: No hover state difference -->
.card-interactive:hover { }

<!-- BAD: Too aggressive transform -->
.card-interactive:hover { transform: scale(1.05); }  /* Jumpy */
```

## Card Grid Layouts: CSS Grid

Use CSS Grid for responsive card layouts without media queries.

```css
/* Responsive grid with CSS Grid only (no media queries) */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  width: 100%;
}

/* Alternative: Auto-fit vs auto-fill */
.card-grid-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

/* Forced 2-column layout with responsive gap */
.card-grid-2col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(12px, 2vw, 32px);  /* Responsive gap */
}

/* With media query for mobile */
@media (max-width: 768px) {
  .card-grid,
  .card-grid-2col {
    grid-template-columns: 1fr;
  }
}

/* Mixed card sizes */
.card-grid-featured {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.card-featured {
  grid-column: span 2;  /* Takes up 2 columns */
}

@media (max-width: 768px) {
  .card-featured {
    grid-column: span 1;  /* Single column on mobile */
  }
}

/* BAD: Fixed column count -->
.card-grid { grid-template-columns: repeat(3, 1fr); }
/* Breaks on small screens */

<!-- BAD: Using floats instead of grid -->
.card { float: left; width: 33.33%; }
```

## Anti-Patterns: What NOT to Do

### Anti-Pattern 1: Inconsistent Card Padding

```css
/* BAD: Different padding in same system */
.card-a { padding: 16px; }
.card-b { padding: 20px; }
.card-c { padding: 14px 12px; }

<!-- Why it's bad:
  - Layout looks chaotic and unrefined
  - Hard to maintain consistency
  - Breaks visual rhythm
-->

/* GOOD: Consistent padding scale */
.card { padding: var(--spacing-lg); }
.card-sm { padding: var(--spacing-md); }
.card-lg { padding: var(--spacing-xl); }
```

### Anti-Pattern 2: Content Overflow Without Truncation

```html
<!-- BAD: Text overflows card boundaries -->
<div class="card">
  <h3 class="card-title">
    This is a very long title that doesn't fit and will overflow the card
  </h3>
</div>

<!-- Why it's bad:
  - Breaks card layout
  - Text becomes unreadable
  - Looks unfinished
-->

<!-- GOOD: Text truncation with ellipsis -->
<div class="card">
  <h3 class="card-title">This is a very long title that doesn't fit</h3>
</div>
```

```css
/* Handle long text properly */
.card-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* or for multi-line: */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
```

### Anti-Pattern 3: Images Breaking Aspect Ratio

```html
<!-- BAD: Image distorted from wrong aspect -->
<div class="card-image" style="width: 300px; height: 100px;">
  <img src="square-image.jpg" />  <!-- Stretches square image -->
</div>

<!-- Why it's bad:
  - Image looks distorted
  - Layout unpredictable
-->

<!-- GOOD: Proper aspect ratio with object-fit -->
<div class="card-image">
  <img src="square-image.jpg" alt="" />
</div>
```

```css
.card-image {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-md);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
```

### Anti-Pattern 4: No Hover State Feedback

```html
<!-- BAD: Clickable card with no hover indication -->
<div class="card" onclick="navigate('/item')">
  <h3>Click me</h3>
</div>

<!-- Why it's bad:
  - User doesn't know card is clickable
  - Feels broken or unresponsive
  - Confuses interaction model
-->

<!-- GOOD: Clear clickable card -->
<a href="/item" class="card card-interactive">
  <h3>Click me</h3>
</a>

<style>
.card-interactive:hover {
  box-shadow: var(--elevation-3);
  transform: translateY(-2px);
}
</style>
```

### Anti-Pattern 5: Fixed Heights Causing Overflow

```css
<!-- BAD: Fixed height with unpredictable content -->
.card {
  height: 300px;  /* Fixed */
  overflow: hidden;  /* Cuts off content */
}

<!-- Why it's bad:
  - Content might be hidden
  - Different content heights look wrong
  - Can't accommodate variable content
-->

/* GOOD: Flexible height with min/max constraints */
.card {
  min-height: 200px;
  max-height: none;  /* Or reasonable max */
  display: flex;
  flex-direction: column;
}
```

## Implementation Examples

### Complete Card Component

```jsx
function Card({
  image,
  title,
  description,
  meta,
  actions,
  interactive = false,
  href,
  className = '',
}) {
  const Component = interactive && href ? 'a' : 'div';

  return (
    <Component
      href={href}
      className={`
        card
        ${interactive ? 'card-interactive' : ''}
        ${className}
      `}
    >
      {image && (
        <div className="card-image">
          <img src={image.src} alt={image.alt} />
        </div>
      )}

      <div className="card-body">
        {title && <h3 className="card-title">{title}</h3>}
        {meta && <p className="card-meta">{meta}</p>}
        {description && (
          <p className="card-description">{description}</p>
        )}
      </div>

      {actions && (
        <div className="card-footer">
          {actions.map((action, i) => (
            <button key={i} className={`button ${action.variant}`}>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </Component>
  );
}

// Usage
<Card
  image={{ src: 'image.jpg', alt: 'Card image' }}
  title="Card Title"
  meta="Posted 2 hours ago"
  description="This is the main content"
  interactive
  href="/item/123"
  actions={[
    { label: 'Save', variant: 'button-secondary' },
    { label: 'Share', variant: 'button-ghost' },
  ]}
/>
```

### HTML Card Pattern

```html
<!-- Basic card -->
<div class="card">
  <h3 class="card-title">Card Title</h3>
  <p class="card-description">Card description</p>
</div>

<!-- Card with image -->
<div class="card">
  <img class="card-image" src="image.jpg" alt="Card image" />
  <h3 class="card-title">Card Title</h3>
  <p class="card-description">Card description</p>
</div>

<!-- Interactive card -->
<a href="/item/123" class="card card-interactive">
  <img class="card-image" src="image.jpg" alt="Card image" />
  <div class="card-body">
    <h3 class="card-title">Card Title</h3>
    <p class="card-meta">Posted 2 hours ago</p>
    <p class="card-description">Click to view details</p>
  </div>
</a>

<!-- Card with header and footer -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <span class="card-meta">2 hours ago</span>
  </div>

  <img class="card-image" src="image.jpg" alt="" />

  <div class="card-body">
    <p class="card-description">Main content here</p>
  </div>

  <div class="card-footer">
    <button class="button button-primary">Action</button>
    <button class="button button-secondary">Secondary</button>
  </div>
</div>

<!-- Card grid -->
<div class="card-grid">
  <div class="card">...</div>
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

## Quality Checklist

Before deploying cards, verify:

- [ ] **Padding Consistent**: All cards use design system spacing scale
- [ ] **Shadow Hierarchy**: Cards have appropriate elevation
- [ ] **Border Radius**: Consistent with system (usually 12px)
- [ ] **Image Aspect Ratios**: Using aspect-ratio property
- [ ] **Content Hierarchy**: Title > metadata > description > actions
- [ ] **Responsive Grid**: Using CSS Grid, works at all breakpoints
- [ ] **Interactive Feedback**: Hover states on clickable cards
- [ ] **No Content Overflow**: Text truncation, images contained
- [ ] **Margins Between Cards**: Consistent gap in grid
- [ ] **Focus States**: Interactive cards have visible focus
- [ ] **Accessibility**: Links semantic, buttons are buttons
- [ ] **Disabled State**: Clear if card is inactive
- [ ] **Touch Target**: Interactive cards large enough (min 44px)
- [ ] **All Variants**: Tested static, interactive, with/without images

---

## References

- [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [MDN: aspect-ratio Property](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio)
- [Material Design: Cards](https://m3.material.io/components/cards/overview)
- [Apple HIG: Cards](https://developer.apple.com/design/human-interface-guidelines/components/containers/cards)
