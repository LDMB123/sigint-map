---
title: text-wrap Property (balance & pretty)
description: Better line breaking for typography without layout constraints
tags: [css, chromium-143, typography, text, layout]
min_chrome_version: 117
category: CSS Properties
complexity: beginner
last_updated: 2026-01
---

# text-wrap: balance / pretty (Chrome 117+)

Native typographic control without measuring text or JavaScript. Balance headlines automatically; prevent orphans in body copy with native browser algorithms.

## When to Use

- **Headings** - `text-wrap: balance` for centered, multi-line headlines
- **Body text** - `text-wrap: pretty` to avoid orphaned words
- **Cards/components** - Prevent awkward single-word final lines
- **Marketing copy** - Professional typography without workarounds
- **Any element** - Works with any text-containing element

## Syntax

```css
/* Default - browser wraps based on container width */
text-wrap: wrap;

/* Balance lines when breaking across multiple lines */
text-wrap: balance;

/* Prevent orphans (widows in print terminology) */
text-wrap: pretty;
```

## text-wrap: balance

Balances text across lines for visual harmony.

```css
h1, h2, h3 {
  text-wrap: balance;
  /* Preferred multi-line breaking where line lengths are similar */
}

/* Example:
   Before: "The Quick Brown Fox Jumps Over"
           "the Lazy Dog"

   After:  "The Quick Brown Fox"
           "Jumps Over the Lazy Dog"
*/
```

### When Headings Are Balanced

```css
/* 16px font, balance works best for 2-4 lines */
.hero h1 {
  font-size: 2.5rem;
  text-wrap: balance;
  /* Browser finds optimal line break points */
}

.section-title {
  font-size: 1.875rem;
  text-wrap: balance;
  /* No forced line breaks needed */
}

.card-title {
  font-size: 1.25rem;
  text-wrap: balance;
  /* Works even on short titles */
}
```

### Hero Section

```css
.hero {
  text-align: center;
}

.hero h1 {
  font-size: 3rem;
  font-weight: 700;
  text-wrap: balance;
  line-height: 1.2;
  /* Lines balance automatically for centered layout */
}

.hero p {
  font-size: 1.25rem;
  color: #666;
  text-wrap: pretty;
  max-width: 600px;
  margin: 1rem auto;
}
```

### Card Titles

```css
.card {
  max-width: 300px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  text-wrap: balance;
  /* Balances within 300px container */
}

/* With balance, this title breaks nicely:
   "Revolutionizing Your"
   "Email Workflow"

   Instead of:
   "Revolutionizing Your Email"
   "Workflow"
*/
```

### Sidebar Headings

```css
.sidebar h3 {
  font-size: 1.125rem;
  width: 200px;
  text-wrap: balance;
  /* Narrows column benefits from balance */
}
```

## text-wrap: pretty

Prevents orphaned words and improves readability.

```css
p, article, .content {
  text-wrap: pretty;
  /* Last line won't contain single word if possible */
}

/* Example:
   Before: "The quick brown fox jumps over the lazy"
           "dog"  (orphan)

   After:  "The quick brown fox jumps over the lazy dog"
           OR slightly rebalances to avoid widow
*/
```

### Body Copy

```css
article {
  font-size: 1.125rem;
  line-height: 1.75;
  max-width: 65ch;
  text-wrap: pretty;
  /* Prevents single words on final line */
}

article p {
  margin-bottom: 1.5rem;
  text-wrap: pretty;
  /* Each paragraph handles widows/orphans */
}
```

### Blog Post

```css
article.blog-post {
  max-width: 800px;
}

article.blog-post h2 {
  font-size: 2rem;
  text-wrap: balance;
  /* Section headings balance */
}

article.blog-post p {
  font-size: 1.125rem;
  text-wrap: pretty;
  /* Body text prevents orphans */
}

article.blog-post blockquote {
  font-size: 1.25rem;
  font-style: italic;
  text-wrap: pretty;
  border-left: 4px solid #0066cc;
  padding-left: 1.5rem;
}
```

### Mixed Typography

```css
.content {
  font-size: 1rem;
}

/* Headlines - balance */
.content h1, .content h2, .content h3 {
  text-wrap: balance;
}

/* Paragraphs - pretty */
.content p {
  text-wrap: pretty;
}

/* Lists - pretty */
.content li {
  text-wrap: pretty;
}

/* Quotes - balance */
.content blockquote {
  text-wrap: balance;
}

/* Captions - pretty */
figcaption {
  font-size: 0.875rem;
  color: #666;
  text-wrap: pretty;
}
```

### Landing Page Copy

```css
.hero-section h1 {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  text-wrap: balance;
  /* Balances hero headline */
}

.hero-section p {
  font-size: 1.25rem;
  max-width: 600px;
  color: #555;
  text-wrap: pretty;
  /* Prevents awkward final line */
}

.feature-card h3 {
  font-size: 1.5rem;
  text-wrap: balance;
  /* Short titles balance */
}

.feature-card p {
  font-size: 1rem;
  line-height: 1.6;
  text-wrap: pretty;
  /* Feature descriptions readable */
}
```

### Form Labels and Errors

```css
label {
  display: block;
  font-weight: 500;
  text-wrap: balance;
  /* Optional field descriptions balance */
}

.error-message {
  color: #d32f2f;
  font-size: 0.875rem;
  text-wrap: pretty;
  /* Error messages readable */
}

.help-text {
  font-size: 0.875rem;
  color: #666;
  text-wrap: pretty;
  /* Instructions prevent orphans */
}
```

### Data Table Headers

```css
thead th {
  font-weight: 600;
  text-wrap: balance;
  /* Column headers balance in cells */
}

tbody td {
  text-wrap: pretty;
  /* Cell content readable */
}
```

### Newsletter Signup

```css
.newsletter-prompt h2 {
  font-size: 2rem;
  text-wrap: balance;
  /* Headline balances */
}

.newsletter-prompt p {
  font-size: 1.1rem;
  max-width: 500px;
  text-wrap: pretty;
  /* Description prevents orphans */
}
```

## Combined with Other Text Properties

```css
.premium-heading {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-wrap: balance;
  line-height: 1.2;
  /* All work together for polished typography */
}

.body-text {
  font-size: 1.125rem;
  line-height: 1.75;
  letter-spacing: 0.3px;
  text-wrap: pretty;
  hyphens: auto;
  /* Hyphens + pretty prevents orphans */
}
```

## Responsive Text Wrapping

```css
/* balance for headings across all sizes */
h1 {
  text-wrap: balance;
}

h2 {
  text-wrap: balance;
}

/* pretty for body text always */
p {
  text-wrap: pretty;
}

/* Mobile: tighter control */
@media (max-width: 640px) {
  /* Still use balance/pretty, but narrower containers */
  h1 {
    font-size: 1.875rem;
    text-wrap: balance;
  }

  p {
    font-size: 1rem;
    text-wrap: pretty;
  }
}

/* Desktop: wider layouts benefit too */
@media (min-width: 1024px) {
  article {
    max-width: 800px;
    /* text-wrap: pretty still prevents orphans */
  }
}
```

## JavaScript Integration

```typescript
// Detect text-wrap support
function supportsTextWrap(): boolean {
  const el = document.createElement('div');
  const style = el.style;
  style.textWrap = 'balance';
  return style.textWrap === 'balance';
}

if (supportsTextWrap()) {
  console.log('Using native text-wrap: balance/pretty');
  document.documentElement.dataset.textWrapSupported = 'true';
} else {
  console.log('text-wrap not supported - fallback needed');
}

// No JavaScript needed to apply text-wrap
// Just set it in CSS - browser handles everything
```

## Performance Considerations

- **Balance**: Slight rendering cost (~5ms for complex text), but better UX
- **Pretty**: Minimal cost, same as default wrapping
- **No layout shifts**: Wrapping calculated during initial render
- **No JavaScript**: Faster than JS-based hyphenation/balancing

## Browser Rendering

```
text-wrap: balance
├─ Measure text width
├─ Calculate line breaks for visual balance
└─ Re-wrap if needed (minimal for most text)

text-wrap: pretty
├─ Default wrapping
├─ Detect final line
└─ Adjust to prevent orphans
```

## Real-World Examples

### E-commerce Product Cards

```css
.product-card h2 {
  font-size: 1.25rem;
  font-weight: 600;
  text-wrap: balance;
  /* "Limited Edition" + "Wireless Headphones" balances */
}

.product-card p {
  font-size: 0.95rem;
  text-wrap: pretty;
  /* Description prevents orphans */
}
```

### SaaS Pricing Page

```css
.pricing-section h1 {
  font-size: 2.5rem;
  text-wrap: balance;
  /* "Simple, Transparent" + "Pricing for Teams" */
}

.pricing-card .plan-name {
  font-size: 1.5rem;
  text-wrap: balance;
}

.pricing-card .description {
  font-size: 0.95rem;
  text-wrap: pretty;
}
```

### Documentation

```css
.docs article h1 {
  text-wrap: balance;
}

.docs article h2, .docs article h3 {
  text-wrap: balance;
}

.docs article p {
  max-width: 70ch;
  text-wrap: pretty;
  /* Code documentation readable */
}

.docs code {
  /* Code typically short, but pretty for longer snippets */
  text-wrap: pretty;
}
```

## Comparison

| Property | Use Case | Rendering Cost | Result |
|----------|----------|---|---|
| `text-wrap: wrap` | Default | Minimal | Natural breaks |
| `text-wrap: balance` | Headings | Low | Balanced lines |
| `text-wrap: pretty` | Body | Minimal | Prevent orphans |

## Key Takeaways

- **No JavaScript needed** - CSS handles typography
- **Works on any element** - Apply to h1, p, span, etc.
- **Respects container width** - Adapts to responsive design
- **Improves readability** - Professional typography automatically
- **Zero maintenance** - No class toggles or config needed
