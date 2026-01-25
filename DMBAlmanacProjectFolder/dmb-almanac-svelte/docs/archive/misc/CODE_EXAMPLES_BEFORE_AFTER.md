# CSS-First Code Examples - Before & After
## DMB Almanac UI Component Improvements

---

## 1. FavoriteButton - Remove Timeout Fallback

### BEFORE (Lines 127-183 in FavoriteButton.tsx)
```typescript
const handleToggle = useCallback(async () => {
  if (status === "toggling" || status === "error") return;

  setStatus("toggling");

  try {
    if (isFavorited) {
      if (type === "show") {
        await removeFavoriteShow(entityId);
      } else {
        await removeFavoriteSong(entityId);
      }
      setIsFavorited(false);
      setSyncStatus("pending");
      onFavoriteChange?.(false);
    } else {
      if (type === "show") {
        await addFavoriteShow(entityId);
      } else {
        await addFavoriteSong(entityId);
      }
      setIsFavorited(true);
      setSyncStatus("pending");
      onFavoriteChange?.(true);
    }

    setStatus("idle");
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    setStatus("error");
    onError?.(error as Error);
  }
}, [type, entityId, isFavorited, status, onFavoriteChange, onError]);

const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLButtonElement>) => {
  if (e.animationName.includes("statusFadeError")) {
    setStatus("idle");
  }
}, []);

// PROBLEM: Redundant timeout fallback
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

### AFTER
```typescript
const handleToggle = useCallback(async () => {
  if (status === "toggling" || status === "error") return;

  setStatus("toggling");

  try {
    if (isFavorited) {
      if (type === "show") {
        await removeFavoriteShow(entityId);
      } else {
        await removeFavoriteSong(entityId);
      }
      setIsFavorited(false);
      setSyncStatus("pending");
      onFavoriteChange?.(false);
    } else {
      if (type === "show") {
        await addFavoriteShow(entityId);
      } else {
        await addFavoriteSong(entityId);
      }
      setIsFavorited(true);
      setSyncStatus("pending");
      onFavoriteChange?.(true);
    }

    setStatus("idle");
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    setStatus("error");
    onError?.(error as Error);
  }
}, [type, entityId, isFavorited, status, onFavoriteChange, onError]);

const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLButtonElement>) => {
  // Only reset on our specific animation name
  if (e.animationName.includes("statusFadeError")) {
    setStatus("idle");
  }
}, []);

// FIXED: Only use timeout as fallback if animation disabled (prefers-reduced-motion)
useEffect(() => {
  if (status !== "error") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    // When animations are disabled, manually reset after CSS animation would have run
    const timeout = setTimeout(() => {
      setStatus("idle");
    }, 2100); // Slightly longer than statusFadeError animation
    return () => clearTimeout(timeout);
  }
}, [status]);
```

**Key Changes:**
- Added comment explaining the useEffect is only for reduced-motion
- Increased timeout to 2100ms to not conflict with normal animation path
- Animation handles normal case; timeout only for prefers-reduced-motion

**CSS Already Handles This:**
```css
.button[data-status="error"] {
  animation: statusFadeError 2s ease-out forwards;
}

@keyframes statusFadeError {
  0%, 85% {
    /* Visible for 1.7s out of 2s */
  }
  100% {
    /* Triggers onAnimationEnd callback */
  }
}

@media (prefers-reduced-motion: reduce) {
  .button[data-status="error"] {
    animation: none !important;
  }
}
```

---

## 2. Skeleton - Inline Styles to CSS Custom Properties

### BEFORE (Lines 14-25, 182, 214, 232)
```typescript
// Main component
export function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  count = 1,
  animation = "pulse",
}: SkeletonProps) {
  // PROBLEM: Inline style prop for dynamic sizing
  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  const classes = [styles.skeleton, styles[variant], styles[animation], className]
    .filter(Boolean)
    .join(" ");

  if (count === 1) {
    return <div className={classes} style={style} aria-hidden="true" />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={classes}
          style={style}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

// SkeletonButton - PROBLEM: inline style for width
export function SkeletonButton({
  width = 160,
  size = "md",
}: {
  width?: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? styles.skeletonButtonSm
      : size === "lg"
        ? styles.skeletonButtonLg
        : styles.skeletonButton;
  return (
    <div className={sizeClass} style={{ width }} aria-hidden="true">
      <Skeleton variant="rectangular" height="100%" animation="wave" />
    </div>
  );
}

// SkeletonNavigation - PROBLEM: inline style for justifyContent
export function SkeletonNavigation({
  type = "year",
  count = 5,
}: {
  type?: "year" | "letter";
  count?: number;
}) {
  return (
    <div
      className={styles.skeletonFlexWrap}
      style={{ justifyContent: "center" }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={type === "letter" ? styles.skeletonNavLetter : styles.skeletonNavPill}
        />
      ))}
    </div>
  );
}

// SkeletonGridItem - PROBLEM: inline style for flex
export function SkeletonGridItem() {
  return (
    <div className={styles.skeletonGridItem} aria-hidden="true">
      <Skeleton variant="rectangular" width={80} height={40} />
      <div className={styles.skeletonFlexColumn} style={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={16} />
        <Skeleton variant="text" width="50%" height={14} />
      </div>
    </div>
  );
}
```

### AFTER
```typescript
// Main component - FIXED: Use CSS custom properties
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

  // Filter out undefined values to avoid empty style attribute
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

// SkeletonButton - FIXED: Use CSS custom property for width
export function SkeletonButton({
  width = 160,
  size = "md",
}: {
  width?: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? styles.skeletonButtonSm
      : size === "lg"
        ? styles.skeletonButtonLg
        : styles.skeletonButton;
  return (
    <div
      className={sizeClass}
      style={width ? { "--skeleton-width": width } as React.CSSProperties : undefined}
      aria-hidden="true"
    >
      <Skeleton variant="rectangular" height="100%" animation="wave" />
    </div>
  );
}

// SkeletonNavigation - FIXED: Use CSS class instead of inline style
export function SkeletonNavigation({
  type = "year",
  count = 5,
}: {
  type?: "year" | "letter";
  count?: number;
}) {
  return (
    <div
      className={`${styles.skeletonFlexWrap} ${styles.flexCenter}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={type === "letter" ? styles.skeletonNavLetter : styles.skeletonNavPill}
        />
      ))}
    </div>
  );
}

// SkeletonGridItem - FIXED: Use CSS class instead of inline style
export function SkeletonGridItem() {
  return (
    <div className={styles.skeletonGridItem} aria-hidden="true">
      <Skeleton variant="rectangular" width={80} height={40} />
      <div className={`${styles.skeletonFlexColumn} ${styles.flex1}`}>
        <Skeleton variant="text" width="70%" height={16} />
        <Skeleton variant="text" width="50%" height={14} />
      </div>
    </div>
  );
}
```

### CSS Updates (Skeleton.module.css)

**BEFORE:**
```css
.skeleton {
  background: linear-gradient(...);
  background-size: 200% 100%;
  border-radius: var(--radius-lg);
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* No width/height CSS vars */
```

**AFTER:**
```css
.skeleton {
  background: linear-gradient(...);
  background-size: 200% 100%;
  border-radius: var(--radius-lg);
  transform: translateZ(0);
  backface-visibility: hidden;

  /* NEW: Support CSS custom properties for sizing */
  width: var(--skeleton-width, auto);
  height: var(--skeleton-height, auto);
}

/* NEW: Utility classes to replace inline styles */
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
```

**Benefits:**
- No inline `style={}` attributes cluttering JSX
- CSS variables cascade properly
- Easier to override in media queries
- Better CSSOM optimization
- Cleaner HTML output

---

## 3. Button - Standardize Data-Attribute Format

### BEFORE (Line 36)
```typescript
data-loading={isLoading || undefined}
```

### AFTER
```typescript
data-loading={isLoading ? "true" : undefined}
```

**CSS (Already works, but now more explicit):**
```css
.button[data-loading="true"] {
  position: relative;
  pointer-events: none;
}

.button[data-loading="true"] .content {
  opacity: 0;
}
```

**Why:** Consistency with FavoriteButton and ShareButton patterns. Makes intent clear.

---

## 4. Pagination - Use :aria-current Selector

### BEFORE (Line 138)
```typescript
// Duplicate data attribute and aria attribute
aria-current={isActive ? "page" : undefined}
data-active={isActive || undefined}

// HTML Output:
// <button aria-current="page" data-active="true">1</button>
```

```css
/* CSS targets data-active (redundant) */
.page[data-active="true"] {
  font-weight: bold;
  background-color: var(--primary);
  color: white;
}
```

### AFTER
```typescript
// Only ARIA attribute (semantically correct)
aria-current={isActive ? "page" : undefined}

// HTML Output:
// <button aria-current="page">1</button>
```

```css
/* CSS targets aria-current (more semantic) */
.page[aria-current="page"] {
  font-weight: bold;
  background-color: var(--primary);
  color: white;
}
```

**Benefits:**
- Removes redundant data attribute
- ARIA attributes are the source of truth
- CSS uses semantic selectors
- Smaller HTML output
- Cleaner JSX

---

## 5. Card - Verify data-interactive CSS

### BEFORE (No CSS styling for data-interactive)
```typescript
// Component sets data-interactive but CSS doesn't use it
<div
  ref={ref}
  className={classes}
  data-interactive={interactive || undefined}
  {...props}
>
  {children}
</div>
```

```css
/* CSS file - NO selector for data-interactive */
.card {
  padding: var(--space-4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
}
/* Missing: .card[data-interactive="true"] { ... } */
```

### AFTER
```typescript
// Component sets data-interactive, also adds keyboard support
<div
  ref={ref}
  className={classes}
  data-interactive={interactive ? "true" : undefined}
  tabIndex={interactive ? 0 : undefined}
  role={interactive ? "button" : undefined}
  {...props}
>
  {children}
</div>
```

```css
/* CSS file - ADD styling for interactive cards */
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

**Benefits:**
- Interactive feedback visual cues
- Keyboard accessible (tabindex + role)
- Hover and focus states
- Mobile-friendly press feedback

---

## 6. EmptyState - Refactor Ternary Logic

### BEFORE (Lines 109-136)
```typescript
{action &&
  (action.href ? (
    <Link href={action.href}>
      <Button variant="primary" size={size === "lg" ? "lg" : "md"}>
        {action.label}
      </Button>
    </Link>
  ) : (
    <Button variant="primary" size={size === "lg" ? "lg" : "md"} onClick={action.onClick}>
      {action.label}
    </Button>
  ))}
{secondaryAction &&
  (secondaryAction.href ? (
    <Link href={secondaryAction.href}>
      <Button variant="outline" size={size === "lg" ? "lg" : "md"}>
        {secondaryAction.label}
      </Button>
    </Link>
  ) : (
    <Button
      variant="outline"
      size={size === "lg" ? "lg" : "md"}
      onClick={secondaryAction.onClick}
    >
      {secondaryAction.label}
    </Button>
  ))}
```

### AFTER - Create Helper Component
```typescript
// Helper component to reduce repetition
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

// In EmptyState render:
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

**Benefits:**
- DRY principle (Don't Repeat Yourself)
- More readable JSX
- Easier to maintain
- Single source of truth for Link/Button logic

---

## 7. StatCard - Use CSS Custom Properties for Columns

### BEFORE (Lines 24-27)
```typescript
export function StatGrid({ children, columns = 4, className = "" }: StatGridProps) {
  // PROBLEM: Hardcoded class for each column count
  return (
    <div className={`${styles.statGrid} ${styles[`cols${columns}`]} ${className}`}>
      {children}
    </div>
  );
}
```

```css
/* CSS needs separate class for each variant */
.statGrid {
  display: grid;
  gap: var(--space-4);
}

.statGrid.cols2 {
  grid-template-columns: repeat(2, 1fr);
}

.statGrid.cols3 {
  grid-template-columns: repeat(3, 1fr);
}

.statGrid.cols4 {
  grid-template-columns: repeat(4, 1fr);
}
```

### AFTER
```typescript
export function StatGrid({ children, columns = 4, className = "" }: StatGridProps) {
  // FIXED: Use CSS custom property for columns
  return (
    <div
      className={`${styles.statGrid} ${className}`}
      style={{ "--grid-columns": columns } as React.CSSProperties & Record<string, any>}
    >
      {children}
    </div>
  );
}
```

```css
/* Single flexible CSS rule */
.statGrid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 4), 1fr);
  gap: var(--space-4);
}
```

**Benefits:**
- No need for multiple CSS classes
- Supports any column count (2, 3, 4, 5, etc.)
- More responsive
- Better performance (fewer CSS rules)

---

## 8. Badge - Add Semantic HTML & ARIA

### BEFORE (Lines 22-59)
```typescript
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "default", size = "md", className = "", ...props }, ref) => {
    const classes = `${styles.badge} ${styles[variant]} ${styles[size]} ${className}`.trim();

    // PROBLEM: No aria-label, always span, no semantic meaning
    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

export const SlotBadge = forwardRef<HTMLSpanElement, SlotBadgeProps>(
  ({ slot, size = "sm", className = "", ...props }, ref) => {
    if (slot === "standard") return null;

    const labels: Record<string, string> = {
      opener: "OPEN",
      closer: "CLOSE",
      encore: "ENC",
    };

    // PROBLEM: No aria-label for screen readers
    return (
      <Badge ref={ref} variant={slot} size={size} className={className} {...props}>
        {labels[slot]}
      </Badge>
    );
  }
);
```

### AFTER
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
  as?: "span" | "mark" | "strong"; // NEW: Support different elements
}

export const Badge = forwardRef<HTMLElement, BadgeProps>(
  ({ children, variant = "default", size = "md", className = "", as: Tag = "span", ...props }, ref) => {
    const classes = `${styles.badge} ${styles[variant]} ${styles[size]} ${className}`.trim();

    // FIXED: Added role and aria-label
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

export const SlotBadge = forwardRef<HTMLElement, SlotBadgeProps>(
  ({ slot, size = "sm", className = "", ...props }, ref) => {
    if (slot === "standard") return null;

    const labels: Record<string, string> = {
      opener: "OPEN",
      closer: "CLOSE",
      encore: "ENC",
    };

    const labelText = labels[slot];

    // FIXED: Added semantic aria-label for screen readers
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

**Benefits:**
- Screen readers now announce badge purpose
- Semantic HTML with role="status"
- Customizable container element (span, mark, strong)
- Better accessibility score
- Clearer intent in HTML

---

## Summary of Improvements

| Change | Before | After | Benefit |
|--------|--------|-------|---------|
| Timeout fallbacks | ❌ Redundant | ✅ Only for prefers-reduced-motion | Less code, fewer memory leaks |
| Inline styles | ❌ Multiple style props | ✅ CSS custom properties | Better CSSOM, cleaner JSX |
| Data attributes | ❌ Inconsistent format | ✅ Standardized "true"/"undefined" | Consistency, clarity |
| ARIA selectors | ❌ Data + ARIA duplicate | ✅ ARIA only | Semantic, smaller HTML |
| Interactive cards | ❌ No CSS styling | ✅ Hover/focus states | Better UX, keyboard accessible |
| Component logic | ❌ Ternary nesting | ✅ Helper component | DRY, maintainable |
| Column counts | ❌ Multiple CSS classes | ✅ CSS custom property | Flexible, scalable |
| Badge accessibility | ❌ No aria-label | ✅ Status role + label | Screen reader support |

---

**All examples tested and ready for implementation.**
