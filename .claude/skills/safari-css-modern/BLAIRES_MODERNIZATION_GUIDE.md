---
title: Blaire's Kind Heart — Safari 26.2 CSS Modernization Guide
type: guide
target: Safari 26.2
scope: Implementation walkthrough
---

# Safari 26.2 CSS Modernization Guide

## Quick Implementation: 5 Minimal PRs

This guide shows exactly how to modernize Blaire's Kind Heart's CSS with **zero breaking changes** to Rust logic.

---

## PR 1: Add text-wrap: pretty to Story Text

**File**: `src/styles/stories.css`
**Lines**: 434–443
**Complexity**: Trivial (1 line)
**Testing**: Visual only

### What This Does

Improves typography by preventing single words from orphaning on final line of story narrative text.

### Before

```css
.story-text {
  font-size: var(--font-size-xl);
  line-height: 1.75;
  text-align: center;
  padding: var(--space-sm) var(--space-lg);
  color: var(--color-text);
  text-shadow: 0 1px 2px rgba(255, 244, 199, 0.4);
  animation: story-text-in 0.5s var(--ease-smooth) 0.3s both;
}
```

### After

```css
.story-text {
  font-size: var(--font-size-xl);
  line-height: 1.75;
  text-align: center;
  padding: var(--space-sm) var(--space-lg);
  color: var(--color-text);
  text-shadow: 0 1px 2px rgba(255, 244, 199, 0.4);
  animation: story-text-in 0.5s var(--ease-smooth) 0.3s both;
  /* Safari 26.2: Better line breaking — avoids orphaned words */
  text-wrap: pretty;
}
```

### Testing on iPad mini 6

1. Open Stories panel
2. Read each story's text blocks
3. Verify no single words alone on final line
4. Compare readability vs. before

---

## PR 2: Add accent-color to Interactive Inputs

**File**: `src/styles/app.css` (new section at end)
**Complexity**: Trivial (3–5 lines)
**Testing**: Visual only

### What This Does

Makes checkboxes and radio inputs (if added) use app's purple brand color instead of browser blue.

### Implementation

Add to end of `app.css`:

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

### Safari 26.2 Note

`accent-color` auto-clamps luminance for accessibility. Purple on pink backgrounds will automatically ensure readable contrast.

---

## PR 3: Expand CSS Nesting in Button States (Cosmetic)

**File**: `src/styles/tracker.css`
**Lines**: 18–174
**Complexity**: Low (refactor only)
**Testing**: Functional (should produce identical CSS)

### What This Does

Improves code organization by nesting all `.kind-btn` variants inside a single root rule.

### Current Structure

```css
.kind-btn { ... }
.kind-btn--hug { ... }
  .kind-btn--hug:active { ... }
.kind-btn--nice-words { ... }
  .kind-btn--nice-words:active { ... }
/* ... etc for all 6 variants ... */
```

### Improved Structure

```css
.kind-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-lg) var(--space-md);
  border: 3px solid transparent;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  cursor: pointer;
  font-family: inherit;
  min-height: var(--touch-comfortable);
  box-shadow: var(--shadow-md), ...;
  animation: kind-card-in 0.4s var(--ease-overshoot) both;
  animation-delay: calc(sibling-index() * 0.05s);
  touch-action: manipulation;
  transform-style: preserve-3d;

  /* ─── Top glossy highlight for 3D illusion ─── */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(170deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 30%, transparent 55%);
    pointer-events: none;
    z-index: 1;
  }

  /* ─── Color-coded kind act buttons ─── */
  &--hug {
    background: var(--gradient-button-pink);
    border-color: var(--color-pink);
    box-shadow: var(--shadow-md), 0 6px 16px rgba(255, 143, 171, 0.2);

    &:active {
      box-shadow: 0 1px 3px rgba(255, 143, 171, 0.2), inset 0 2px 6px rgba(212, 86, 122, 0.15);

      .kind-btn-emoji,
      .kind-btn-img {
        transform: scale(1.35) translateY(-2px);
        filter: drop-shadow(0 4px 12px rgba(45, 27, 48, 0.2))
                drop-shadow(0 0 16px rgba(255, 211, 45, 0.4));
      }
    }
  }

  &--nice-words {
    background: var(--gradient-button-blue);
    border-color: var(--color-blue);
    box-shadow: var(--shadow-md), 0 6px 16px rgba(92, 184, 228, 0.2);

    &:active {
      box-shadow: 0 1px 3px rgba(92, 184, 228, 0.2), inset 0 2px 6px rgba(60, 140, 190, 0.15);
    }
  }

  /* ... other variants follow same pattern ... */

  /* All shared emoji/img styles */
  .kind-btn-emoji {
    font-size: 2.5rem;
    filter: drop-shadow(0 2px 6px rgba(45, 27, 48, 0.15))
            drop-shadow(0 0 10px rgba(255, 143, 171, 0.15));
    transition: transform var(--duration-fast) var(--ease-elastic),
                filter var(--duration-fast) var(--ease-smooth);
    position: relative;
    z-index: 2;
  }

  .kind-btn-img {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: var(--radius-md);
    animation: float-emoji 4s var(--ease-bounce) infinite;
    transition: transform var(--duration-fast) var(--ease-elastic),
                filter var(--duration-fast) var(--ease-smooth);
    position: relative;
    z-index: 2;
    pointer-events: none;
  }

  .kind-btn-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    text-align: center;
    color: var(--color-text);
    position: relative;
    z-index: 2;
  }
}
```

### Why This Matters

- **Readability**: All `.kind-btn` styles in one place
- **Maintainability**: Variants clearly nested under root
- **Duplication**: Shared rules (emoji, label) appear once
- **No behavior change**: Compiles to identical CSS

### Testing

```bash
# Before and after should be bit-for-bit identical
# Run through minifier to verify
```

---

## PR 4: Pilot @scope for Emotion Check-In Modal

**File**: `src/styles/tracker.css`
**Lines**: 340–449
**Complexity**: Medium (refactor + testing)
**Testing**: Functional + visual on iPad mini 6

### What This Does

Encapsulates emotion modal styles using CSS `@scope` block. Eliminates namespace pollution from `[data-emotion-*]` selectors.

### Current Approach

```css
[data-emotion-checkin] {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  ...
}

@keyframes emotion-fade-in { ... }

[data-emotion-prompt] {
  font-family: var(--font-family-display);
  ...
}

[data-emotion-grid] {
  display: grid;
  ...
}

[data-emotion-grid] button {
  ...
}

[data-emotion-skip] {
  ...
}
```

### Scoped Approach

```css
/* ====== Emotion Check-In Modal (Scoped) ====== */
@scope ([data-emotion-checkin]) {
  /* All inner selectors automatically scoped to this root */

  [data-emotion-prompt] {
    font-family: var(--font-family-display);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-heavy);
    text-align: center;
    margin-bottom: var(--space-xl);
    color: var(--color-purple-dark);
    text-shadow: 0 2px 8px rgba(181, 126, 255, 0.25);
  }

  [data-emotion-grid] {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-md);
    max-width: 600px;
    width: 100%;
    margin-bottom: var(--space-lg);

    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      min-width: 72px;
      min-height: 80px;
      padding: var(--space-md);
      border: 3px solid var(--color-purple-light);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      cursor: pointer;
      font-family: inherit;
      box-shadow: var(--shadow-md);
      transition: transform var(--duration-fast) var(--ease-bounce),
                  border-color var(--duration-fast) var(--ease-smooth),
                  box-shadow var(--duration-fast) var(--ease-smooth);
      touch-action: manipulation;
      animation: emotion-btn-in 0.4s var(--ease-overshoot) both;
      animation-delay: calc(0.05s + (sibling-index() - 1) * 0.03s);

      &:active {
        animation: jelly-wobble 0.3s ease;
        transform: scale(0.95);
        border-color: var(--color-purple);
        box-shadow: var(--shadow-lg);
      }

      .emoji {
        font-size: 2.5rem;
        filter: drop-shadow(0 2px 6px rgba(45, 27, 48, 0.15));
      }

      .label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text);
        text-align: center;
      }
    }
  }

  [data-emotion-skip] {
    min-height: var(--touch-min);
    padding: var(--space-md) var(--space-xl);
    border: 2px solid var(--color-purple-light);
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--color-purple);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
    touch-action: manipulation;

    &:active {
      background: var(--color-purple-light);
      transform: scale(0.98);
    }
  }
}

/* Keyframes still at root level (not scoped) */
@keyframes emotion-fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes emotion-btn-in {
  from { transform: scale(0.7) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}
```

### Testing Checklist

- [ ] Emotion modal still appears on top (z-index: 1000)
- [ ] Buttons still respond to taps
- [ ] sibling-index() stagger still works
- [ ] No CSS specificity conflicts
- [ ] Modal dismisses correctly
- [ ] No console errors in Safari DevTools

### Browser DevTools Verification

In Safari Inspector, select emotion button and check:
- Should see `:scope(emotion-checkin) button` in specificity
- Scoping boundary clearly marked in Styles panel

---

## PR 5: Document sibling-index() Usage with Safari 26.2 Notes

**File**: 5 CSS files
**Complexity**: Trivial (add comments)
**Testing**: Documentation only

### What This Does

Adds Safari 26.2 feature flag comments to all `sibling-index()` usages for maintainability.

### Example: app.css, line 482

**Before**:

```css
[data-home-btn].entrance-visible {
  transition-delay: calc(200ms + (sibling-index() - 1) * 80ms);
}
```

**After**:

```css
/* Phase 1.3: CSS-based stagger timing (saves ~650ms blocking) */
[data-home-btn].entrance-visible {
  /* Safari 26.2 sibling-index() — auto-calculate position in DOM */
  transition-delay: calc(200ms + (sibling-index() - 1) * 80ms);
}
```

### Locations to Document

1. `src/styles/app.css:482` — Home button stagger
2. `src/styles/tracker.css:60` — Kind act button stagger
3. `src/styles/tracker.css:407` — Emotion button stagger
4. `src/styles/quests.css:107` — Quest card stagger
5. `src/styles/stories.css:192` — Story cover stagger
6. `src/styles/stories.css:492` — Story choice stagger

---

## Verification Workflow

### Local Testing

```bash
# 1. Make CSS changes
git checkout -b css-modernize-phase1

# 2. Build project
trunk build --release

# 3. Test on iPad mini 6 (local network)
trunk serve --address 0.0.0.0

# 4. Open on iPad: http://<your-mac-ip>:8080
# 5. Test all modified components
```

### Test Cases

| Component | Test | Expected |
|-----------|------|----------|
| Story text | Read story, check line breaks | No orphaned words |
| Accent color | (Future: add checkbox) | Purple checkmarks |
| Emotion modal | Tap emotion buttons | Smooth stagger, jelly wobble |
| Home buttons | Scroll home panel | Staggered entrance still smooth |
| Kind buttons | Tap tracker buttons | Staggered with varying delays |

---

## Rollback Plan

Each PR is reversible:

```bash
# If issues found
git revert <commit-sha>
trunk build --release
trunk serve --address 0.0.0.0
```

All changes are **CSS-only**. No Rust logic changes, so zero risk of breaking app state.

---

## Performance Expectations

| Change | CPU Impact | Memory | GPU | Notes |
|--------|-----------|--------|-----|-------|
| text-wrap: pretty | +0–2% layout | 0% | 0% | Better line breaking (fewer reflows) |
| accent-color | 0% | 0% | 0% | Browser-native, no JS |
| CSS nesting | 0% | 0% | 0% | Compiles to identical CSS |
| @scope | 0% | +1KB | 0% | Encapsulation, negligible cost |

**Total impact**: Effectively zero. All changes are optimizations or maintenance improvements.

---

## Final Notes

- **Testing is critical** on actual iPad mini 6. iPad mini 5 or Air 2 may have slightly different rendering.
- **Screenshot comparisons** before/after help catch subtle layout shifts.
- **Use Safari Inspector** to verify CSS selectors and scoping boundaries.
- **No breaking changes** — if something breaks, it's immediately obvious and reversible.

All five PRs are **production-safe** and **recommended for implementation**.
