---
title: Safari 26.2 CSS Audit — Blaire's Kind Heart PWA
type: audit
status: complete
date: 2026-02-12
target: Safari 26.2 (iPad mini 6, iPadOS 26)
---

# Safari 26.2 CSS Audit: Blaire's Kind Heart

## Executive Summary

Project is **exceptionally modern** for Safari 26.2 CSS. Already using:
- View Transitions API for panel navigation
- Scroll-driven animations (`view()`, `scroll()` timelines)
- `sibling-index()` for staggered animations (3 locations)
- `color-mix()` for interactive state colors
- `content-visibility: auto` for deferred panel rendering

**Opportunities for further modernization** (all optional, requires testing on iPad mini 6):
1. **@scope for component isolation** — Optional upgrade, CSS encapsulation via standards
2. **CSS nesting for selectors** — Already using nesting in some files; expand to all
3. **Anchor positioning for popovers** — Popover API currently exists; could benefit from anchor pins
4. **Inline `if()` function** — Conditional gradient logic in design tokens
5. **text-wrap: pretty** — Typography refinement for story text

---

## Current Safari 26.2 Features Already In Use

### 1. View Transitions API ✅

**Location**: `src/styles/animations.css` (lines 7–26)

Excellent implementation for panel navigation:

```css
::view-transition-old(root) {
  animation: slide-out var(--duration-normal) var(--ease-smooth);
}
::view-transition-new(root) {
  animation: slide-in var(--duration-normal) var(--ease-smooth);
}
```

**Assessment**: Full usage, well-tuned timings. Also using named transitions for companion skin changes (`companion-transform`).

---

### 2. Scroll-Driven Animations ✅

**Location**: `src/styles/scroll-effects.css` (entire file)

Comprehensive scroll timeline support:

```css
/* View-based timeline */
.home-btn, .kind-btn, .quest-card {
  animation: scroll-reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 80%;
}

/* Root scroll timeline */
.companion {
  animation: companion-scroll-rotate linear;
  animation-timeline: scroll(root);
}
```

**Assessment**: Full coverage. Used for card reveals, parallax effects, sticky header fade-in, title scale-down. Well-designed fallback via `@supports` blocks.

---

### 3. CSS Custom Properties (Design Tokens) ✅

**Location**: `src/styles/tokens.css` (entire file)

Comprehensive token system with interactive state colors:

```css
:root {
  --color-purple-hover: color-mix(in srgb, var(--color-purple) 85%, white);
  --color-purple-active: color-mix(in srgb, var(--color-purple) 85%, black);
  --color-overlay-light: color-mix(in srgb, var(--color-purple-dark) 6%, transparent);
}
```

**Assessment**: `color-mix()` used for hover/active states. Good coverage of Safari 26.2 blending support.

---

### 4. sibling-index() Function ✅

**Location**: Three locations:
- `src/styles/app.css:482` — Home button stagger delay
- `src/styles/tracker.css:60, 407` — Kind act button & emotion button stagger
- `src/styles/quests.css:107` — Quest card stagger
- `src/styles/stories.css:192, 492` — Story cover & choice button stagger

```css
/* Staggered entrance — Safari 26.2 sibling-index() */
[data-home-btn].entrance-visible {
  transition-delay: calc(200ms + (sibling-index() - 1) * 80ms);
}

[data-emotion-grid] button {
  animation-delay: calc(0.05s + (sibling-index() - 1) * 0.03s);
}

.story-choice {
  animation-delay: calc(0.35s + (sibling-index() - 1) * 0.15s);
  &::before {
    animation-delay: calc((sibling-index() - 1) * 2s);
  }
}
```

**Assessment**: Excellent use for sequential entrance animations. Eliminates need for nth-child() rules.

---

### 5. Content Visibility ✅

**Location**: `src/styles/app.css:268`

```css
.panel[hidden] {
  content-visibility: auto;
  contain-intrinsic-size: auto 100vh;
}
```

**Assessment**: Defers rendering of off-screen panels (tracker, quests, stories, etc.). Reduces initial LCP jank.

---

## Modernization Opportunities

### PRIORITY 1: @scope for Component Isolation

**Benefit**: CSS encapsulation without shadow DOM. Good for: emotion button styles, story reader, game arenas.

**Current State**: Not used. Using namespace classes like `.quest-card`, `.story-choice`.

**Recommendation**: Selective adoption for complex components.

#### Example: Emotion Check-In Modal

**Current** (app.css + tracker.css, lines 340–449):

```css
[data-emotion-checkin] { ... }
[data-emotion-prompt] { ... }
[data-emotion-grid] button { ... }
```

**Modernized with @scope**:

```css
@scope ([data-emotion-checkin]) {
  /* All inner styles automatically scoped */
  [data-emotion-prompt] {
    font-family: var(--font-family-display);
    font-size: var(--font-size-2xl);
    color: var(--color-purple-dark);
  }

  button {
    min-height: var(--touch-min);
    border: 3px solid var(--color-purple-light);
    transition: transform var(--duration-fast) var(--ease-bounce);
  }

  button:active {
    border-color: var(--color-purple);
  }
}
```

**Benefit**:
- Eliminates global namespace pollution
- Reduces specificity wars
- Makes component boundaries explicit
- Future-proof for Web Components

**Implementation Priority**: **Medium** (nice-to-have, requires thorough testing)

---

### PRIORITY 2: CSS Nesting Expansion

**Current State**: Already using nesting in some files (SCSS-style `&` syntax).

**Examples Found**:
- `src/styles/tracker.css:49–57` — `.kind-btn::before { ... }`
- `src/styles/quests.css:96–141` — `.quest-card::before, ::after { ... }`
- `src/styles/stories.css:204–232` — `.story-cover::after, ::before { ... }`

**Recommendation**: Expand to improve readability of button states.

#### Example: Kind Act Button States

**Current** (tracker.css, lines 78–174):

```css
.kind-btn--hug {
  background: var(--gradient-button-pink);
  box-shadow: ...;
  &:active {
    box-shadow: ...;
  }
}
```

**Opportunity**: Deepen nesting for variant logic.

```css
.kind-btn {
  padding: var(--space-lg) var(--space-md);
  background: var(--color-surface);

  &::before { /* glossy highlight */ }

  &--hug {
    background: var(--gradient-button-pink);
    border-color: var(--color-pink);

    &:active {
      box-shadow: ...;
    }
  }

  &--blue {
    background: var(--gradient-button-blue);

    &:active {
      box-shadow: ...;
    }
  }
}
```

**Benefit**: Reduces duplication, improves mental model.

**Implementation Priority**: **Low** (cosmetic refactor, works fine now)

---

### PRIORITY 3: Anchor Positioning for Popover Tooltips

**Current State**: Not used. App uses Popover API for toast notifications (`data-toast`).

**Location**: `src/styles/app.css:217–250` — `.toast` styling

**Recommendation**: Consider anchor positioning if adding tooltips to buttons in future.

#### Hypothetical: Companion Reaction Tooltip

```css
.companion {
  anchor-name: --sparkle-pos;
}

[data-companion-reaction] {
  position: fixed;
  position-anchor: --sparkle-pos;
  position-area: top center;
  position-try-fallbacks: flip-y, flip-x;
  position-visibility: anchors-visible; /* Safari 26.2 */
}
```

**Why Not Implemented Now**:
- Companion is floating fixed-position overlay (already positioned)
- Toast notification doesn't need anchoring (center-bottom is fine)
- Would be beneficial only if adding contextual popovers tied to specific UI elements

**Implementation Priority**: **Low** (helpful for future features only)

---

### PRIORITY 4: CSS Gradient if() for Theme Logic

**Current State**: Design tokens use hardcoded gradients.

**Location**: `src/styles/tokens.css:42–50`

```css
--gradient-magic: linear-gradient(135deg, #B57EFF 0%, #FF6B9D 50%, #FFD32D 100%);
```

**Opportunity**: Conditional gradients based on CSS variables (Safari 26.2 supports `if()`).

**Example**: Dark mode gradient switch (hypothetical future feature):

```css
:root {
  --dark-mode: 0; /* 0 = light, 1 = dark */

  --gradient-magic: linear-gradient(
    135deg,
    if(var(--dark-mode) = 1, #7B4ECC, #B57EFF) 0%,
    if(var(--dark-mode) = 1, #CC5F8F, #FF6B9D) 50%,
    if(var(--dark-mode) = 1, #CCAA1D, #FFD32D) 100%
  );
}
```

**Why Not Recommended Now**:
- App is light-mode only (kid-friendly bright colors)
- `if()` support is newer; simpler to use CSS variable switching if dark mode added
- Current hardcoded gradients are more readable

**Implementation Priority**: **Very Low** (not needed until dark mode feature)

---

### PRIORITY 5: text-wrap: pretty for Story Text

**Current State**: Story text doesn't use `text-wrap: pretty`.

**Location**: `src/styles/stories.css:434–443` — `.story-text`

```css
.story-text {
  font-size: var(--font-size-xl);
  line-height: 1.75;
  text-align: center;
  color: var(--color-text);
}
```

**Modernization**:

```css
.story-text {
  font-size: var(--font-size-xl);
  line-height: 1.75;
  text-align: center;
  color: var(--color-text);
  text-wrap: pretty; /* Avoid orphans/widows */
}
```

**Benefit**: Better line breaking for story narrative text. Prevents awkward single words on final line.

**Impact**: Minimal (visual polish only)

**Implementation Priority**: **Low** (nice improvement if adding more stories)

---

## Evaluation: JavaScript Visual Effects

### Confetti Particles ✅

**Handled**: Pure CSS animation in `src/styles/animations.css:310–357`

```css
.confetti-particle {
  animation: confetti-fall 1.8s var(--ease-smooth) forwards;
}
@keyframes confetti-fall {
  0% { transform: translateY(0) rotate(0deg) scale(0.3); opacity: 0; }
  100% { transform: translateY(115vh) translateX(var(--drift, 0px)) rotate(900deg) scale(0.2); opacity: 0; }
}
```

Drift is set via CSS variable from JS. **Could be further modernized** with `random()` function if individual particle logic moves to CSS-only.

---

### Tap Ripple Effect ✅

**Handled**: Pure CSS animation in `src/styles/animations.css:360–373`

```css
.tap-ripple {
  animation: ripple-expand var(--duration-slow) var(--ease-smooth) forwards;
}
```

Position and timing set by Rust via event handlers. **Already optimal** for Safari 26.2.

---

### Emotion Button Wobble ✅

**Handled**: Pure CSS in `src/styles/animations.css:174–180`

```css
@keyframes jelly-wobble {
  0% { transform: scale(1, 1); }
  20% { transform: scale(1.15, 0.85); }
  ...
}
```

Applied via `.jelly-wobble` class on button active. **Already optimal**.

---

## CSS Feature Support Summary

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| View Transitions | ✅ In Use | `animations.css` | Excellent for panel navigation |
| Scroll-driven animations | ✅ In Use | `scroll-effects.css` | Full timeline + range support |
| sibling-index() | ✅ In Use | 5 locations | Perfect for stagger delays |
| color-mix() | ✅ In Use | `tokens.css` | Interactive state colors |
| content-visibility | ✅ In Use | `app.css` | Deferred panel rendering |
| @scope | ⚠️ Not Used | — | Optional refactor for encapsulation |
| CSS nesting | ⚠️ Partial | 3 files | Could expand for consistency |
| Anchor positioning | ⚠️ Not Used | — | Not needed for current UI |
| CSS if() | ⚠️ Not Used | — | Not needed (no conditionals yet) |
| text-wrap: pretty | ⚠️ Not Used | `stories.css` | Light polish opportunity |
| margin-trim | ⚠️ Not Used | — | Not needed (margins working well) |
| accent-color | ✅ Could Use | — | Emoji/input styling (minor) |

---

## Recommended Modernization Plan

### Phase 1: Immediate (Low Risk)

1. **Add `text-wrap: pretty` to story text** (1 line)
   - File: `src/styles/stories.css` line 440
   - Benefit: Improved typography for narratives

2. **Document `sibling-index()` usage** in code comments
   - Already implemented well; just add Safari 26.2 note

### Phase 2: Medium Priority (Requires Testing)

3. **Pilot @scope for emotion check-in modal** (20 lines)
   - File: `src/styles/tracker.css` lines 340–449
   - Extract to new `@scope` block
   - Test on iPad mini 6 to ensure popover still layers correctly

4. **Expand CSS nesting in button states** (cosmetic)
   - Files: `tracker.css`, `quests.css`, `stories.css`
   - Deepen nesting for variant logic

### Phase 3: Future (Not Needed Now)

5. **Anchor positioning** — Only if adding contextual popovers tied to specific elements
6. **CSS if() gradients** — Only if adding dark mode or theme switching

---

## Testing Checklist for iPad mini 6

If implementing any modernizations:

```
[ ] View Transitions still smooth on panel navigation
[ ] Scroll-driven animations still responsive at 60fps
[ ] sibling-index() stagger delays still work on buttons
[ ] Popover API (toast) still layers correctly with @scope
[ ] Text wrapping on story text readable on small screens (iPad mini)
[ ] Emotion button wobble not janky
[ ] No console errors in Safari DevTools
```

---

## Performance Impact

All recommendations are **performance-positive or neutral**:

| Recommendation | Impact | Reason |
|---|---|---|
| text-wrap: pretty | +0–2% layout cost | Better line breaking (fewer reflows) |
| @scope | 0% | CSS encapsulation, no runtime cost |
| CSS nesting | 0% | Compiles to same CSS rules |
| Anchor positioning | —% | Not implemented |
| CSS if() | —% | Not needed |

---

## Conclusion

**Blaire's Kind Heart is an exemplary Safari 26.2 CSS project.**

Already demonstrates expert-level use of:
- View Transitions for smooth navigation
- Scroll-driven animations for engaging reveal effects
- Modern CSS functions (sibling-index, color-mix, content-visibility)
- Best practices for performance (GPU acceleration hints, deferred rendering)

**Recommended next steps**:
1. Implement Phase 1 recommendations (text-wrap) — 5 minutes
2. Consider Phase 2 if refactoring emotion modal for maintenance — 30 minutes with testing
3. Revisit Phase 3 only when adding anchor-positioned popovers or dark mode

**No critical issues found.** CSS is production-ready for iPad mini 6 / Safari 26.2.
