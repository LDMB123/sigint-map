---
title: Blaire's Kind Heart — Safari 26.2 CSS Quick Reference Card
type: reference
format: cheat-sheet
---

# Safari 26.2 CSS Quick Reference

## What's Already Implemented ✅

| Feature | File | Lines | Complexity |
|---------|------|-------|-----------|
| **View Transitions** | animations.css | 7–26, 468–502 | Excellent |
| **Scroll-driven animations** | scroll-effects.css | All | Excellent |
| **sibling-index() stagger** | 5 files | Multiple | Excellent |
| **color-mix() states** | tokens.css | 32–40 | Excellent |
| **content-visibility** | app.css | 268 | Excellent |

---

## Copy-Paste: Text-Wrap Pretty

**File**: `src/styles/stories.css` line 440

```css
/* Add this one line */
text-wrap: pretty;
```

**Result**: No orphaned words in story text

---

## Copy-Paste: accent-color

**File**: `src/styles/app.css` (add to end)

```css
/* Safari 26.2: accent-color ensures checkbox/radio colors match brand */
@supports (accent-color: purple) {
  input[type="checkbox"],
  input[type="radio"] {
    accent-color: var(--color-purple);
    width: var(--touch-min);
    height: var(--touch-min);
  }
}
```

**Result**: Purple checkboxes instead of browser blue

---

## Copy-Paste: @scope Pattern

**Template for component encapsulation:**

```css
@scope (.component-root) {
  .child-selector { ... }

  button { ... }

  button:active { ... }
}
```

**Benefit**: CSS encapsulation without Shadow DOM

---

## Features NOT Yet Used

| Feature | Status | Use Case | Priority |
|---------|--------|----------|----------|
| @scope | ⚠️ Optional | Component isolation | Medium |
| Anchor positioning | ⚠️ Not needed | Tooltips, popovers | Low |
| CSS if() | ⚠️ Not needed | Conditional gradients | Low |
| text-wrap: pretty | ⚠️ Easy win | Typography polish | High |
| accent-color | ⚠️ Easy win | Input styling | High |

---

## Animation Easing Reference

```css
:root {
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);      /* Bouncy, playful */
  --ease-overshoot: cubic-bezier(0.175, 0.885, 0.32, 1.275);  /* Snappy entrance */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);           /* Subtle, professional */
  --ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Springy, oscillates */
  --ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6);   /* Stretchy */
}
```

---

## Stagger Animation Template

```css
/* Stagger entrance for grid items */
.item {
  opacity: 0;
  transform: scale(0.9);
  animation: entrance-anim 0.4s var(--ease-overshoot) both;

  /* Safari 26.2: sibling-index() calculates position */
  animation-delay: calc(sibling-index() * 0.08s);
}

@keyframes entrance-anim {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```

---

## Scroll Animation Template

### View-based Timeline

```css
.card {
  opacity: 0;
  transform: translateY(30px);

  /* Animate as card enters viewport */
  animation: scroll-reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 80%;
}

@keyframes scroll-reveal {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Root Scroll Timeline

```css
.companion {
  /* Animate based on page scroll position */
  animation: companion-rotate linear;
  animation-timeline: scroll(root);
}

@keyframes companion-rotate {
  from { transform: rotate(-5deg); }
  to { transform: rotate(5deg); }
}
```

---

## Color State Template

```css
:root {
  /* Base color */
  --color-brand: #B57EFF;

  /* Derived states via color-mix() */
  --color-brand-hover: color-mix(in srgb, var(--color-brand) 85%, white);
  --color-brand-active: color-mix(in srgb, var(--color-brand) 85%, black);
}

button {
  background: var(--color-brand);
  &:hover { background: var(--color-brand-hover); }
  &:active { background: var(--color-brand-active); }
}
```

---

## Performance Hints

```css
/* Force GPU rendering for smooth animations */
.panel {
  transform: translateZ(0);
}

/* Only set will-change during transitions (not always) */
.panel.transitioning {
  will-change: transform, opacity;
}

/* Defer rendering of hidden elements */
.panel[hidden] {
  content-visibility: auto;
  contain-intrinsic-size: auto 100vh;
}

/* Isolate layout from parent document tree */
.panel-body {
  contain: layout style paint;
}
```

---

## Accessibility Checklist

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}

/* Fallback for unsupported features */
@supports not (animation-timeline: view()) {
  .card { opacity: 1; transform: none; }
}
```

---

## Touch Target Sizing

```css
:root {
  --touch-min: 52px;        /* Minimum (back button) */
  --touch-comfortable: 68px; /* Most buttons */
  --touch-large: 88px;      /* Primary actions */
}

.btn { min-height: var(--touch-comfortable); }
```

---

## View Transitions Template

```css
/* Smooth page navigation */
::view-transition-old(root) {
  animation: slide-out var(--duration-normal) var(--ease-smooth);
}

::view-transition-new(root) {
  animation: slide-in var(--duration-normal) var(--ease-smooth);
}

@keyframes slide-out {
  to { opacity: 0; transform: translateX(-30px) scale(0.96); }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(30px) scale(0.96); }
}
```

---

## Feature Detection Template

```css
/* Use feature only if supported */
@supports (animation-timeline: scroll(root)) {
  .element {
    animation-timeline: scroll(root);
  }
}

/* Fallback for unsupported browsers */
@supports not (animation-timeline: scroll(root)) {
  .element {
    /* Fallback styles */
  }
}
```

---

## Design Token Structure

```css
:root {
  /* Colors */
  --color-primary: #B57EFF;
  --color-secondary: #FF8FAB;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Typography */
  --font-family: "SF Pro Rounded", system-ui, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-md: 1.05rem;
  --font-size-lg: 1.3rem;

  /* Timing */
  --duration-fast: 200ms;
  --duration-normal: 350ms;
  --duration-slow: 600ms;

  /* Easing */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Testing on iPad mini 6

```bash
# Serve locally
trunk serve --address 0.0.0.0

# Connect iPad to network
# Open http://<your-mac-ip>:8080

# Check in Safari Inspector
# - View Transitions: smooth panel navigation
# - Scroll animations: smooth 60fps card reveals
# - sibling-index: staggered entrance delays
# - No console errors
```

---

## Common Mistakes to Avoid

❌ **Don't**: Apply `will-change` to everything
✅ **Do**: Only set `will-change` during transitions

❌ **Don't**: Use `translateZ(0)` on every element
✅ **Do**: Use only on animated elements

❌ **Don't**: Ignore `prefers-reduced-motion`
✅ **Do**: Disable animations for users with motion sensitivity

❌ **Don't**: Hardcode colors (e.g., `#FF8FAB`)
✅ **Do**: Use CSS variables (`var(--color-pink)`)

❌ **Don't**: Repeat animation delays (nth-child for each)
✅ **Do**: Use `sibling-index()` for dynamic stagger

---

## File Organization

```
src/styles/
├── tokens.css            ← Design system (colors, spacing, typography)
├── app.css               ← Global layout (shell, panels, loading screen)
├── home.css              ← Home panel specific
├── animations.css        ← Keyframe animations (reusable)
├── scroll-effects.css    ← Scroll-driven animations
├── tracker.css           ← Tracker panel
├── quests.css            ← Quests panel
├── stories.css           ← Stories panel
└── games.css             ← Games panel
```

---

## Safari 26.2 Feature Checklist

```
✅ View Transitions API
✅ Scroll-driven animations (view(), scroll())
✅ sibling-index(), sibling-count()
✅ color-mix()
✅ content-visibility
✅ @scope (available but not used)
✅ Anchor positioning (available but not needed)
✅ accent-color (available but not used)
⚠️ CSS if() (not needed yet)
```

---

## Where to Learn More

- **Full Audit**: `SAFARI_26.2_CSS_AUDIT_BLAIRES_KINDHEAFT.md`
- **Implementation Guide**: `BLAIRES_MODERNIZATION_GUIDE.md`
- **Best Practices**: `BLAIRES_BEST_PRACTICES.md`
- **Summary**: `README_BLAIRES_AUDIT.md`

---

**Print this card and keep it by your desk while developing Safari-exclusive CSS! 🎨**
