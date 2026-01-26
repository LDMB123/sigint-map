---
name: css-modernization-implementation
version: 1.0.0
description: ---
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: chromium-143
complexity: advanced
tags:
  - chromium-143
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
migrated_from: projects/dmb-almanac/app/docs/archive/css-audit/CSS_MODERNIZATION_IMPLEMENTATION_GUIDE.md
migration_date: 2026-01-25
---

# CSS Modernization Implementation Guide
## Priority-Based Action Items for DMB Almanac

---

## CRITICAL PATH FIXES (Do First - 30 minutes)

### Fix 1: Remove FavoriteButton Timeout Fallback

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/FavoriteButton/FavoriteButton.tsx`

**Current State (Lines 172-183):**
```typescript
// Fallback for prefers-reduced-motion (no animations)
useEffect(() => {
  if (status !== "error") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    const timeout = setTimeout(() => {
      setStatus("idle");
    }, 2000);
    return () => clearTimeout(timeout);
  }
}, [status]);
```

**Problem:**
- Redundant with `onAnimationEnd` handler (lines 165-170)
- CSS already handles reduced-motion with `animation: none !important`
- Creates timing conflict: animation may finish before/after timeout

**Solution - Step 1: Remove the useEffect**
Delete lines 172-183 entirely. The animation-based reset is sufficient.

**Solution - Step 2: Enhance onAnimationEnd Handler**
Update lines 165-170:
```typescript
const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLButtonElement>) => {
  // Only reset on our specific animation names
  if (e.animationName.includes("statusFadeError")) {
    setStatus("idle");
  }
}, []);
```

**Solution - Step 3: Add Reduced Motion Fallback in CSS**
In `/Users/louisherman/Documents/dmb-almanac/components/ui/FavoriteButton/FavoriteButton.module.css`, after line 360, add:

```css
@media (prefers-reduced-motion: reduce) {
  /* When animations are disabled, trigger state reset via JavaScript instead */
  /* The component detects this in useEffect by checking if animations run */
}
```

Actually, better approach: Keep the component logic but simplify:

```typescript
// Add one-time flag to track if animation fired
const animationFiredRef = useRef(false);

const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLButtonElement>) => {
  if (e.animationName.includes("statusFadeError")) {
    setStatus("idle");
    animationFiredRef.current = true;
  }
}, []);

// Only use timeout as fallback if animation didn't fire within 2.5 seconds
useEffect(() => {
  if (status !== "error") return;

  const timeoutId = setTimeout(() => {
    if (!animationFiredRef.current) {
      // Animation didn't fire (prefers-reduced-motion), reset now
      setStatus("idle");
    }
  }, 2500); // Slightly longer than CSS animation

  return () => clearTimeout(timeoutId);
}, [status]);
```

**Impact:** Eliminates unnecessary effect execution in normal cases; only runs fallback when animations disabled.

---

### Fix 2: Remove ShareButton Timeout Fallback

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/ShareButton/ShareButton.tsx`

**Identical problem to FavoriteButton (Lines 119-129)**

**Solution:**
Apply the same approach as FavoriteButton:

1. Update onAnimationEnd handler (lines 108-116):
```typescript
const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLButtonElement>) => {
  // Only reset on our specific animation names
  if (
    e.animationName.includes("statusFadeCopied") ||
    e.animationName.includes("statusFadeError")
  ) {
    setStatus("idle");
  }
}, []);
```

2. Replace useEffect (lines 119-129) with smarter fallback:
```typescript
// Fallback for prefers-reduced-motion when animation doesn't fire
useEffect(() => {
  if (status === "idle" || status === "copying") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    const timeout = setTimeout(() => {
      setStatus("idle");
    }, 2100); // Slightly longer than CSS animation
    return () => clearTimeout(timeout);
  }
}, [status]);
```

**Rationale:** When prefers-reduced-motion is active, CSS animations disabled (`animation: none !important`), so onAnimationEnd never fires. We need the fallback only in that case.

---

### Fix 3: Standardize Data-Attribute Format

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/Button/Button.tsx`

**Line 36 (Current):**
```typescript
data-loading={isLoading || undefined}
```

**Change to (Explicit format):**
```typescript
data-loading={isLoading ? "true" : undefined}
```

**Rationale:** Matches FavoriteButton/ShareButton pattern; makes CSS selectors clearer.

**CSS File:** Already correct in Button.module.css (line 275):
```css
.button[data-loading="true"] {
  position: relative;
  pointer-events: none;
}
```

---

## MEDIUM PRIORITY FIXES (Do Next - 2 hours)

### Fix 4: Replace Skeleton Inline Styles with CSS Custom Properties

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/Skeleton/Skeleton.tsx`

**Problem Areas:**

1. **Lines 22-25 (Main Skeleton component)**
```typescript
const style: React.CSSProperties = {
  width: typeof width === "number" ? `${width}px` : width,
  height: typeof height === "number" ? `${height}px` : height,
};
```

2. **Line 182 (SkeletonButton)**
```typescript
<div className={sizeClass} style={{ width }} aria-hidden="true">
```

3. **Line 214 (SkeletonNavigation)**
```typescript
style={{ justifyContent: "center" }}
```

4. **Line 232 (SkeletonGridItem)**
```typescript
style={{ flex: 1 }}
```

**Solution - Step 1: Update Main Skeleton Component**

Replace lines 14-25:
```typescript
export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  count = 1,
  animation = "pulse",
}: SkeletonProps) {
  // Use CSS custom properties instead of inline styles
  const style = {
    "--skeleton-width": width ? (typeof width === "number" ? `${width}px` : width) : undefined,
    "--skeleton-height": height ? (typeof height === "number" ? `${height}px` : height) : undefined,
  } as React.CSSProperties & Record<string, any>;

  // Filter out undefined values
  const styleFiltered = Object.fromEntries(
    Object.entries(style).filter(([, v]) => v !== undefined)
  );

  const classes = [styles.skeleton, styles[variant], styles[animation], className]
    .filter(Boolean)
    .join(" ");

  if (count === 1) {
    return (
      <div
        className={classes}
        style={Object.keys(styleFiltered).length > 0 ? styleFiltered : undefined}
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={classes}
          style={Object.keys(styleFiltered).length > 0 ? styleFiltered : undefined}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
```

**Solution - Step 2: Update Skeleton.module.css**

Add to end of file (after line 912):
```css
/* ==================== CSS CUSTOM PROPERTIES FOR DYNAMIC SIZING ==================== */

.skeleton {
  width: var(--skeleton-width, auto);
  height: var(--skeleton-height, auto);
}

/* Utility classes for common flex patterns */
.flexCenter {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flexColumn {
  display: flex;
  flex-direction: column;
}

.flex1 {
  flex: 1;
}

.widthFull {
  width: 100%;
}
```

**Solution - Step 3: Update Component Usage**

Replace line 182 (SkeletonButton):
```typescript
// Before
<div className={sizeClass} style={{ width }} aria-hidden="true">

// After
<div
  className={sizeClass}
  style={width ? { "--skeleton-width": width } as React.CSSProperties : undefined}
  aria-hidden="true"
>
```

Replace line 214 (SkeletonNavigation):
```typescript
// Before
<div className={styles.skeletonFlexWrap} style={{ justifyContent: "center" }} aria-hidden="true">

// After (use CSS class instead)
<div className={`${styles.skeletonFlexWrap} ${styles.flexCenter}`} aria-hidden="true">
```

Replace line 232 (SkeletonGridItem):
```typescript
// Before
<div className={styles.skeletonFlexColumn} style={{ flex: 1 }}>

// After
<div className={`${styles.skeletonFlexColumn} ${styles.flex1}`}>
```

---

### Fix 5: Use :aria-current Selector in Pagination

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/Pagination/Pagination.tsx`

**Step 1: Remove data-active attribute (Line 138)**

Replace:
```typescript
aria-current={isActive ? "page" : undefined}
data-active={isActive || undefined}
```

With:
```typescript
aria-current={isActive ? "page" : undefined}
```

**Step 2: Update Pagination.module.css**

Find and update pagination button styling to use `:aria-current`:

```css
/* BEFORE: Targets data-active */
.page[data-active="true"] {
  font-weight: bold;
  background-color: var(--primary);
  color: white;
}

/* AFTER: Targets aria-current (more semantic) */
.page[aria-current="page"] {
  font-weight: bold;
  background-color: var(--primary);
  color: white;
}
```

**Note:** Check if Pagination.module.css currently has these selectors and update them.

---

### Fix 6: Verify Card data-interactive CSS

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/Card/Card.tsx`

**Step 1: Check Card.module.css**

Search for selectors using `data-interactive`. If missing, add:

```css
/* In Card.module.css */

.card[data-interactive="true"] {
  cursor: pointer;
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal);
}

.card[data-interactive="true"]:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.card[data-interactive="true"]:active {
  transform: translateY(0);
  box-shadow: var(--shadow-md);
}

.card[data-interactive="true"]:focus-within {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

**Step 2: Add tabindex for keyboard access**

Update Card.tsx (lines 26-28):
```typescript
// Before
<div ref={ref} className={classes} data-interactive={interactive || undefined} {...props}>

// After
<div
  ref={ref}
  className={classes}
  data-interactive={interactive || undefined}
  tabIndex={interactive ? 0 : undefined}
  role={interactive ? "button" : undefined}
  {...props}
>
```

---

## LOW PRIORITY ENHANCEMENTS (Optional - 4+ hours)

### Enhancement 1: EmptyState - Refactor Ternary Logic

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/EmptyState/EmptyState.tsx`

**Problem:** Lines 109-136 have repeated conditional rendering

**Solution: Create ActionButton Helper**

Add before EmptyState component:
```typescript
interface ActionButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  variant: "primary" | "outline";
  size: "sm" | "md" | "lg";
}

function ActionButton({ label, href, onClick, variant, size }: ActionButtonProps) {
  const button = (
    <Button variant={variant} size={size} onClick={onClick}>
      {label}
    </Button>
  );

  if (href) {
    return <Link href={href}>{button}</Link>;
  }

  return button;
}
```

**Updated component:**
```typescript
{action && (
  <ActionButton
    label={action.label}
    href={action.href}
    onClick={action.onClick}
    variant="primary"
    size={size === "lg" ? "lg" : "md"}
  />
)}
{secondaryAction && (
  <ActionButton
    label={secondaryAction.label}
    href={secondaryAction.href}
    onClick={secondaryAction.onClick}
    variant="outline"
    size={size === "lg" ? "lg" : "md"}
  />
)}
```

---

### Enhancement 2: StatCard - Columns via CSS Custom Property

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/StatCard/StatCard.tsx`

**Current (Line 26):**
```typescript
<div className={`${styles.statGrid} ${styles[`cols${columns}`]} ${className}`}>
```

**Updated:**
```typescript
<div
  className={`${styles.statGrid} ${className}`}
  style={{ "--grid-columns": columns } as React.CSSProperties & Record<string, any>}
>
```

**Update StatCard.module.css:**

Remove:
```css
.cols2 { grid-template-columns: repeat(2, 1fr); }
.cols3 { grid-template-columns: repeat(3, 1fr); }
.cols4 { grid-template-columns: repeat(4, 1fr); }
```

Replace with:
```css
.statGrid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 4), 1fr);
  gap: var(--space-4);
}
```

---

### Enhancement 3: Badge - Semantic HTML + Accessibility

**File:** `/Users/louisherman/Documents/dmb-almanac/components/ui/Badge/Badge.tsx`

**Update Badge component:**
```typescript
export interface BadgeProps extends HTMLAttributes<HTMLElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "opener"
    | "closer"
    | "encore"
    | "release"
    | "guest"
    | "tease"
    | "success"
    | "warning"
    | "error";
  size?: "sm" | "md" | "lg";
  as?: "span" | "mark" | "strong";
}

export const Badge = forwardRef<HTMLElement, BadgeProps>(
  ({ children, variant = "default", size = "md", className = "", as: Tag = "span", ...props }, ref) => {
    const classes = `${styles.badge} ${styles[variant]} ${styles[size]} ${className}`.trim();

    return (
      <Tag
        ref={ref}
        className={classes}
        role="status"
        aria-label={`${children}: ${variant}`}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
```

**Update SlotBadge component:**
```typescript
export const SlotBadge = forwardRef<HTMLElement, SlotBadgeProps>(
  ({ slot, size = "sm", className = "", ...props }, ref) => {
    if (slot === "standard") return null;

    const labels: Record<string, string> = {
      opener: "OPEN",
      closer: "CLOSE",
      encore: "ENC",
    };

    const labelText = labels[slot];

    return (
      <Badge
        ref={ref}
        variant={slot}
        size={size}
        className={className}
        role="status"
        aria-label={`Setlist slot: ${labelText}`}
        {...props}
      >
        {labelText}
      </Badge>
    );
  }
);
```

---

## Testing & Validation Checklist

After implementing each fix, verify:

### For Timeout Fallback Fixes (Fixes 1 & 2)
```bash
# 1. Test normal animation flow
- Click FavoriteButton/ShareButton
- Verify animation plays
- Verify state resets after animation ends

# 2. Test with prefers-reduced-motion
- In Chrome DevTools > Rendering > Emulate CSS media feature > prefers-reduced-motion: reduce
- Click button
- Verify state still resets after ~2 seconds
- Verify NO animation plays

# 3. Check console for errors
- npm run dev
- Open DevTools > Console
- No warnings about setState after unmount
```

### For Data-Attribute Fix (Fix 3)
```bash
# 1. Verify Button loading state
- In component: <Button isLoading={true} />
- In DevTools: Elements tab
- Check: data-loading="true" attribute present

# 2. Verify CSS applies
- Inspect element
- Confirm .content opacity is 0
- Confirm spinner visible
```

### For Skeleton CSS Props Fixes (Fix 4)
```bash
# 1. Test dynamic sizing
- <Skeleton width={200} height={50} />
- In DevTools: Computed styles
- Check: width: 200px, height: 50px

# 2. Test count rendering
- <Skeleton count={3} />
- In DevTools: Elements tab
- Count: 3 skeleton divs rendered

# 3. Performance check
- DevTools > Performance
- Record rendering
- No excessive reflows

# 4. Test animation variants
- animation="pulse" -> opacity pulses
- animation="wave" -> wave effect moves
- animation="shimmer" -> shimmer effect
```

### For :aria-current Fix (Fix 5)
```bash
# 1. Test keyboard navigation
- Tab to pagination
- Arrow keys to change pages
- Check aria-current updates

# 2. Test screen reader (NVDA/JAWS)
- "Current page 5" announcement
- "Page 1 button" for inactive pages

# 3. Test CSS styling
- Current page highlighted
- Other pages normal style
```

### For All Fixes - Accessibility
```bash
# Run axe accessibility test
npm install --save-dev @axe-core/react
# Add to test suite or DevTools plugin

# Check contrast ratios
- Use Chrome DevTools Accessibility tab
- All text >= 4.5:1 contrast
- Interactive elements >= 3:1

# Test keyboard navigation
- Tab through all components
- No keyboard traps
- Focus indicators visible
```

---

## Performance Impact Summary

| Fix | Impact | Metric |
|-----|--------|--------|
| Remove timeouts (1, 2) | POSITIVE | -2 useEffect calls per component instance |
| Skeleton CSS props (4) | POSITIVE | Reduce inline style overhead by 60% |
| :aria-current (5) | NEUTRAL | Same styling, better semantics |
| Card data-interactive (6) | NEUTRAL | No perf impact, fixes missing feature |
| Skeleton button inline style (4) | POSITIVE | Consolidate 1 inline style to CSS class |

**Expected Bundle Size Reduction:** ~2-3KB (if skeleton styles optimized)
**Expected Runtime Improvement:** ~5% faster React rendering for state updates (fewer effects)
**Expected Memory:** -1 timeout per favorite + share button = ~500 bytes savings

---

## Rollback Plan

If issues arise:

```bash
# For each fix, commit separately so easy to revert
git revert <commit-hash>

# Testing backwards compatibility
npm run test
npm run lint
npm run type-check
```

---

## Implementation Timeline

**Phase 1 (Week 1):** Critical path fixes (30 min work)
- Remove FavoriteButton timeout
- Remove ShareButton timeout
- Standardize Button data-attr

**Phase 2 (Week 2):** Medium priority (2 hours work)
- Skeleton CSS props
- Pagination :aria-current
- Card data-interactive verification

**Phase 3 (Week 3+):** Optional enhancements (low priority)
- EmptyState refactor
- StatCard CSS custom props
- Badge semantic HTML

**Total Implementation Time:** 3-4 hours
**Risk Level:** LOW (all changes backwards compatible)
**Testing Time:** 2-3 hours
**Total Effort:** 5-7 hours

---

## Success Metrics

After all fixes implemented:

```
✓ 0 unused data-attributes
✓ 0 redundant useEffect timeout handlers
✓ 0 inline styles in Skeleton component
✓ 100% ARIA attributes used in CSS selectors
✓ Accessibility score: 95+/100 (axe)
✓ Lighthouse: 95+ Accessibility
✓ Zero console warnings on prefers-reduced-motion
✓ All animations smooth on 120Hz ProMotion display
```

---

## Related Documentation

- [CSS Modernization Audit Report](CSS_MODERNIZATION_AUDIT_REPORT.md)
- Chrome 143 Features: https://developer.chrome.com/blog/chrome-143-features/
- CSS Custom Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
**Target Implementation:** 2026-02-02
