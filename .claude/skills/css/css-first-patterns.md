---
name: css-first-patterns
version: 1.0.0
description: **Quick guide for maintaining CSS-first patterns in new DMB Almanac components**
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: css
complexity: intermediate
tags:
  - css
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/archive/css-audit/CSS_FIRST_PATTERNS_REFERENCE.md
migration_date: 2026-01-25
---

# CSS-First Patterns Reference

**Quick guide for maintaining CSS-first patterns in new DMB Almanac components**

---

## Pattern 1: State Management via Data Attributes

### ✅ DO THIS (CSS-First)

**React Component:**
```typescript
// FavoriteButton.tsx - CORRECT
export function FavoriteButton({ entityId }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "toggling">("idle");

  return (
    <button
      data-favorited={isFavorited}
      data-status={status}
      onClick={handleToggle}
    >
      <Heart />
    </button>
  );
}
```

**CSS Module:**
```css
/* Control all visual states via data attributes */
.icon {
  color: var(--color-gray-400);
}

.button[data-favorited="true"] .icon {
  color: oklch(0.62 0.25 25);
}

.button[data-status="toggling"] .icon {
  animation: heartPulse 400ms var(--ease-spring);
}

.button[data-status="loading"] .icon {
  animation: shimmer 1.5s ease-in-out infinite;
}

.button[data-status="error"] .icon {
  animation: shake 400ms var(--ease-spring);
  color: var(--color-error);
}
```

### ❌ DON'T DO THIS (JavaScript-Driven)

```typescript
// INCORRECT - CSS-in-JS antipattern
const buttonClass = isFavorited ? "favorited" : "unfavorited";
const statusClass = `status-${status}`;

return (
  <button className={`${buttonClass} ${statusClass}`}>
    <Heart />
  </button>
);
```

**Why:** Couples styling to React state; animations tied to React renders; harder to maintain

---

## Pattern 2: Dynamic Props via CSS Custom Properties

### ✅ DO THIS (CSS-First)

**React Component:**
```typescript
// Card.tsx - CORRECT
export function Card({
  variant = "default",
  padding = "md",
  interactive = false,
}: CardProps) {
  return (
    <div
      className={`${styles.card} ${styles[variant]} ${styles[`padding-${padding}`]}`}
      data-interactive={interactive || undefined}
    >
      {children}
    </div>
  );
}
```

**CSS Module:**
```css
.card {
  background-color: var(--background);
  padding: var(--card-padding, 1rem);
  border: 1px solid var(--border-color);
}

/* Variant classes control custom properties */
.default {
  --card-padding: 1rem;
}

.padding-lg {
  --card-padding: 2rem;
}

/* State controlled via data attributes */
.card[data-interactive="true"] {
  cursor: pointer;
  transition: transform 250ms var(--ease-spring);
}

.card[data-interactive="true"]:hover {
  transform: translateY(-4px);
}
```

### ❌ DON'T DO THIS (Inline Styles)

```typescript
// INCORRECT - Inline styling
return (
  <div
    style={{
      padding: padding === "lg" ? "2rem" : "1rem",
      backgroundColor: variant === "dark" ? "#000" : "#fff",
    }}
  >
    {children}
  </div>
);
```

**Why:** Breaks CSS cascade; hard to override; no media query support; performance hit

---

## Pattern 3: Conditional Rendering Elimination

### ✅ DO THIS (CSS-First)

**React Component:**
```typescript
// ShareButton.tsx - CORRECT
function ShareIcons() {
  return (
    <span className={styles.iconWrapper} aria-hidden="true">
      <svg className={`${styles.icon} ${styles.iconShare}`} />
      <svg className={`${styles.icon} ${styles.iconCheck}`} />
      <svg className={`${styles.icon} ${styles.iconError}`} />
    </span>
  );
}

// In JSX - just render once
<button data-status={status}>
  <ShareIcons />
</button>
```

**CSS Module:**
```css
.icon {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 150ms ease, scale 150ms ease;
}

/* Default: show share icon */
.iconShare { opacity: 1; }
.iconCheck { opacity: 0; }
.iconError { opacity: 0; }

/* Copied state: show checkmark */
.button[data-status="copied"] .iconShare { opacity: 0; }
.button[data-status="copied"] .iconCheck { opacity: 1; }

/* Error state: show X */
.button[data-status="error"] .iconShare { opacity: 0; }
.button[data-status="error"] .iconError { opacity: 1; }
```

### ❌ DON'T DO THIS (Conditional Rendering)

```typescript
// INCORRECT - React reconciliation overhead
return (
  <span>
    {status === "idle" && <ShareIcon />}
    {status === "copied" && <CheckIcon />}
    {status === "error" && <ErrorIcon />}
  </span>
);
```

**Why:** Forces React to reconcile DOM on every state change; slower; increases React work

---

## Pattern 4: Variant Selection via Class Composition

### ✅ DO THIS (CSS-First)

**React Component:**
```typescript
// Table.tsx - CORRECT
export function Table({
  striped = false,
  hoverable = true,
  compact = false,
}: TableProps) {
  return (
    <table
      className={styles.table}
      data-striped={striped || undefined}
      data-hoverable={hoverable || undefined}
      data-compact={compact || undefined}
    >
      {children}
    </table>
  );
}
```

**CSS Module:**
```css
.table {
  width: 100%;
  border-collapse: collapse;
}

/* Variants via data attributes */
.table[data-striped="true"] .row:nth-child(even) {
  background-color: var(--background-secondary);
}

.table[data-hoverable="true"] .row:hover {
  background-color: var(--color-primary-50);
}

.table[data-compact="true"] .th,
.table[data-compact="true"] .td {
  padding: var(--space-2) var(--space-3);
}

/* Combined variants */
.table[data-striped="true"][data-hoverable="true"] .row:hover {
  background-color: var(--color-primary-40);
}
```

### ❌ DON'T DO THIS (Conditional Class Construction)

```typescript
// INCORRECT - Runtime class generation
const classes = [
  styles.table,
  striped && styles.striped,
  hoverable && styles.hoverable,
  compact && styles.compact,
].filter(Boolean).join(" ");

return <table className={classes}>{children}</table>;
```

**Why:** More CSS to maintain; no compound selector support; harder to read; slower

---

## Pattern 5: Animation Timing via CSS

### ✅ DO THIS (CSS-First)

**React Component:**
```typescript
// Button.tsx - CORRECT
export function Button({ isLoading }: ButtonProps) {
  return (
    <button
      disabled={isLoading}
      aria-busy={isLoading}
      data-loading={isLoading || undefined}
    >
      {isLoading && <Spinner />}
      {!isLoading && <span>{children}</span>}
    </button>
  );
}
```

**CSS Module:**
```css
.button[data-loading="true"] {
  pointer-events: none;
}

.button[data-loading="true"] .content {
  opacity: 0;
}

.spinner {
  position: absolute;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Auto-reset after animation */
@keyframes statusFadeError {
  0%, 85% { /* visible */ }
  100% { /* trigger animationEnd */ }
}

.button[data-status="error"] {
  animation: statusFadeError 2s ease-out forwards;
}
```

### ❌ DON'T DO THIS (setTimeout in JavaScript)

```typescript
// INCORRECT - Manual timing management
const [showSpinner, setShowSpinner] = useState(false);

useEffect(() => {
  if (isLoading) {
    setShowSpinner(true);
  } else {
    const timer = setTimeout(() => setShowSpinner(false), 300);
    return () => clearTimeout(timer);
  }
}, [isLoading]);

return <button>{showSpinner ? <Spinner /> : children}</button>;
```

**Why:** Decouples timing from CSS; synchronization bugs; extra React state; hard to maintain

---

## Pattern 6: Responsive Design via Container Queries

### ✅ DO THIS (CSS-First)

**CSS Module:**
```css
.card {
  container-type: inline-size;
  container-name: card;
}

/* Responds to card size, not viewport */
@container card (max-width: 300px) {
  .title {
    font-size: var(--text-sm);
  }
}

@container card (min-width: 400px) {
  .title {
    font-size: var(--text-lg);
  }
}

/* Fallback for older browsers */
@supports not (container-type: inline-size) {
  @media (max-width: 640px) {
    .title {
      font-size: var(--text-sm);
    }
  }
}
```

### ❌ DON'T DO THIS (Viewport-Only Media Queries)

```css
/* INCORRECT - Card might be smaller than viewport */
@media (max-width: 640px) {
  .title {
    font-size: 1rem;
  }
}
```

**Why:** Components should adapt to container size, not viewport; container queries are more flexible

---

## Pattern 7: High Contrast & Reduced Motion Support

### ✅ DO THIS (Inclusive CSS)

```css
.button {
  outline: 2px solid var(--color-primary);
  transition: transform 250ms var(--ease-spring);
}

/* High contrast mode - forced colors */
@media (forced-colors: active) {
  .button:focus-visible {
    outline: 2px solid Highlight;
    box-shadow: none;
  }
}

/* Reduced motion - disable animations */
@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
    animation: none !important;
  }
}
```

---

## Checklist for New Components

When creating a new UI component, ensure:

- [ ] **State via data attributes** - Use `data-*` instead of conditional classNames
- [ ] **CSS custom properties** - Define layout via CSS vars, not inline styles
- [ ] **All icons rendered** - No conditional SVG rendering
- [ ] **CSS animations** - Use `@keyframes` instead of JS transitions
- [ ] **Variant composition** - Combine CSS module classes + data attributes
- [ ] **Container queries** - Use for responsive layouts (with fallback)
- [ ] **High contrast mode** - Include `@media (forced-colors: active)` rules
- [ ] **Reduced motion** - Include `@media (prefers-reduced-motion: reduce)` rules
- [ ] **GPU acceleration** - Add `transform: translateZ(0)` + `will-change` where needed
- [ ] **Accessibility** - ARIA attributes, screen reader support, keyboard navigation

---

## Performance Checklist

- [ ] **Minimal className construction** - Don't generate classes in loops
- [ ] **Content visibility** - Use `content-visibility: auto` for large lists
- [ ] **Containment** - Add `contain: layout style` to scroll containers
- [ ] **Intrinsic sizing** - Use `contain-intrinsic-size` for lists
- [ ] **GPU properties** - Only animate `transform`, `opacity` (not `left`, `width`)
- [ ] **will-change cleanup** - Remove when not needed (see Card component example)
- [ ] **300-500ms timing** - Keep transitions snappy for 120fps displays

---

## Chrome 143+ Ready Features

Current Setup (Already Supported):
- ✅ Data attributes for state
- ✅ CSS custom properties
- ✅ Container queries
- ✅ Cascade layers (if needed)
- ✅ `color-mix()` for color blending
- ✅ `:has()` selector

Future Opportunities:
- ⏸️ CSS `if()` - When 80%+ adoption
- ⏸️ `@scope` - For complex nesting
- ⏸️ CSS nesting - When CSS Modules support it
- ⏸️ Anchor positioning - For tooltips/popovers
- ⏸️ Scroll-driven animations - For scroll effects

---

## Examples in This Codebase

Best practices references:
- **Data attributes:** `FavoriteButton.tsx` line 218-220
- **CSS custom properties:** `Button.module.css` lines 5-20
- **All icons rendered:** `ShareButton.tsx` lines 176-224
- **CSS animations:** `Button.module.css` lines 304-311
- **Variant composition:** `Table.tsx` lines 27-29
- **Container queries:** `Card.module.css` lines 274-312
- **High contrast:** `Button.module.css` lines 77-86
- **Reduced motion:** `Button.module.css` lines 460-486
- **GPU acceleration:** `Card.module.css` lines 11-16

---

**Last Updated:** January 19, 2026
**Chrome Target:** 143+
**Status:** Production-Ready CSS-First
