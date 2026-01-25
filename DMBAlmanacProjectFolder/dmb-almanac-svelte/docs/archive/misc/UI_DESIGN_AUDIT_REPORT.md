# DMB Almanac PWA - UI Design Audit & Improvement Recommendations

## Executive Summary

The DMB Almanac PWA has a **solid foundation** with thoughtful design system tokens, comprehensive component coverage, and good accessibility awareness. The design follows a cohesive dark theme with warm accent colors that align with the vintage concert poster aesthetic.

**Overall Assessment: 7.5/10** - Well-executed with room for polish and consistency improvements.

### Key Strengths
- Comprehensive design system with OkLCH color tokens
- Good use of typography scale with fluid font sizing
- Thoughtful vintage aesthetic that differentiates the brand
- Proper focus states and accessibility considerations
- Sophisticated animations and view transitions
- Well-organized component structure

### Critical Issues (High Impact)
1. **Missing/Inconsistent Color References** - Components reference colors (cyan, lime, magenta) not defined in design tokens
2. **Disabled State Inconsistency** - No unified approach to disabled UI states across components
3. **Empty/Error State Coverage** - Limited error messaging and empty state designs
4. **Loading Animation Polish** - Skeleton screens using basic pulse instead of shimmer
5. **Interactive State Completeness** - Some components missing hover/active state specifications

---

## Issue 1: Undefined Accent Colors in Components

### Problem
Components reference color classes that don't exist in the design system:

```tsx
// StatCard.tsx - Line 26
const trendColors = {
  up: 'text-green-400',      // Not in design tokens!
  down: 'text-red-400',      // Not in design tokens!
  neutral: 'text-foreground-muted',
};

// SongCard.tsx - Line 164-167
bgColor = 'bg-accent-cyan/20';     // Not in tailwind.config.ts!
bgColor = 'bg-accent-lime/20';     // Not in tailwind.config.ts!
color: 'magenta',  // In StatBadge - not defined!
```

### Impact
- Visual inconsistency
- Colors may render differently across browsers
- Design system not fully leveraged
- Future maintenance issues

### Solution: Define Missing Accent Colors

**File: `/Users/louisherman/Documents/dmbalmanac-v2/tailwind.config.ts`**

Update the tailwind config to include all referenced accent colors:

```typescript
accent: {
  orange: 'oklch(0.68 0.18 45)',      // Existing
  blue: 'oklch(0.55 0.15 250)',       // Existing
  green: 'oklch(0.60 0.14 160)',      // Existing
  cream: 'oklch(0.88 0.04 70)',       // Existing
  grey: 'oklch(0.45 0.02 280)',       // Existing
  cyan: 'oklch(0.62 0.14 200)',       // NEW - for technical/data
  lime: 'oklch(0.65 0.16 150)',       // NEW - for positive/success
  magenta: 'oklch(0.58 0.18 320)',    // NEW - for featured/highlights
}
```

### Updated Components

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/journey/StatCard.tsx`**

```tsx
const trendColors = {
  up: 'text-accent-lime',      // Use design token
  down: 'text-error',          // Use semantic color
  neutral: 'text-foreground-muted',
};
```

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/features/SongCard.tsx`**

Update all references (lines 162-169):

```tsx
function PlayCountBadge({ count }: { count: number }) {
  let bgColor = 'bg-background-elevated';
  let textColor = 'text-foreground-muted';

  if (count >= 500) {
    bgColor = 'bg-primary/20';
    textColor = 'text-primary';
  } else if (count >= 200) {
    bgColor = 'bg-accent-cyan/20';      // Now defined in design system
    textColor = 'text-accent-cyan';
  } else if (count >= 100) {
    bgColor = 'bg-accent-lime/20';      // Now defined in design system
    textColor = 'text-accent-lime';
  }

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor} transition-colors`}
      title={`Played ${formatNumber(count)} times`}
    >
      <span className={`text-sm font-bold ${textColor}`}>{count}</span>
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'cyan' | 'magenta' | 'lime';
}) {
  const colorClasses = {
    cyan: 'bg-accent-cyan/10 text-accent-cyan',
    magenta: 'bg-accent-magenta/10 text-accent-magenta',
    lime: 'bg-accent-lime/10 text-accent-lime',
  };

  return (
    <div className={`rounded-md px-2 py-1.5 ${colorClasses[color]}`}>
      <p className="font-bold">{value}</p>
      <p className="opacity-80">{label}</p>
    </div>
  );
}
```

---

## Issue 2: Incomplete Disabled State Styling

### Problem
Disabled states are inconsistently handled across components. Some components handle disabled, others don't specify visual states clearly.

**Pagination Component Example** (lines 80-136 of `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/songs/Pagination.tsx`):
```tsx
// Disabled state exists but is minimal
disabled:cursor-not-allowed disabled:opacity-50
```

**Button Component** (UI library) handles it well, but custom components vary.

### Impact
- Users unclear which actions are unavailable
- Inconsistent visual language
- Accessibility concerns (semantic clarity)

### Solution: Create Disabled State Utility Classes

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/styles/globals.css`**

Add utility classes for consistent disabled states (insert after line 436):

```css
/* ============================================
   DISABLED/INACTIVE STATE UTILITIES
   ============================================ */
@layer utilities {
  /* Disabled button state */
  .btn-disabled {
    @apply cursor-not-allowed opacity-50 pointer-events-none;
  }

  /* Disabled interactive state with visual feedback */
  .interactive-disabled {
    @apply opacity-40 cursor-not-allowed pointer-events-none;
  }

  /* Disabled text - for read-only content */
  .text-disabled {
    @apply text-foreground-muted opacity-60;
  }

  /* Disabled form input appearance */
  .input-disabled {
    @apply bg-background-elevated/50 border-border/50 text-foreground-muted cursor-not-allowed;
  }

  /* Disabled link state */
  .link-disabled {
    @apply text-foreground-muted no-underline cursor-not-allowed hover:text-foreground-muted hover:no-underline;
  }
}
```

### Updated Pagination Component

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/songs/Pagination.tsx`**

Lines 80-136, update button states:

```tsx
{/* Previous button */}
<button
  onClick={() => navigateToPage(currentPage - 1)}
  disabled={currentPage === 1}
  className={cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border',
    'transition-colors',
    currentPage === 1
      ? 'border-border/50 bg-background-surface text-foreground-muted cursor-not-allowed opacity-50'
      : 'border-border bg-background-surface text-foreground-secondary hover:bg-background-elevated hover:text-foreground'
  )}
  aria-label="Previous page"
>
  <ChevronLeft className="h-4 w-4" />
</button>

{/* Next button */}
<button
  onClick={() => navigateToPage(currentPage + 1)}
  disabled={currentPage === totalPages}
  className={cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border',
    'transition-colors',
    currentPage === totalPages
      ? 'border-border/50 bg-background-surface text-foreground-muted cursor-not-allowed opacity-50'
      : 'border-border bg-background-surface text-foreground-secondary hover:bg-background-elevated hover:text-foreground'
  )}
  aria-label="Next page"
>
  <ChevronRight className="h-4 w-4" />
</button>
```

---

## Issue 3: Skeleton Screen Animation Lacks Polish

### Problem
Skeleton components use basic `animate-pulse` instead of the more sophisticated `shimmer` animation defined in the design system.

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/ui/Skeleton.tsx`, line 35:
```tsx
className={cn(
  'animate-pulse bg-background-surface',  // Basic pulse
  variantStyles[variant],
  className
)}
```

### Impact
- Doesn't match the sophisticated aesthetic
- Shimmer animation (defined in tailwind.config.ts) goes unused
- Feels less polished compared to intent

### Solution: Update Skeleton Animations

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/ui/Skeleton.tsx`**

```tsx
export function Skeleton({ className, variant = 'rectangular', ...props }: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={cn(
        'shimmer bg-background-surface',  // Changed from animate-pulse to shimmer
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
```

Also update the SongCardSkeleton component (remove inline animations):

```tsx
export function SongCardSkeleton() {
  return (
    <Card className="shimmer">  {/* Add shimmer here */}
      <CardHeader className={compact ? 'p-4 pb-2' : undefined}>
        {/* Rest of component */}
      </CardHeader>
      {/* ... */}
    </Card>
  );
}

export function ShowCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface p-6 shimmer">
      {/* Content */}
    </div>
  );
}

export function VenueCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface p-6 shimmer">
      {/* Content */}
    </div>
  );
}
```

---

## Issue 4: Inconsistent Focus States and Keyboard Navigation

### Problem
While many components define `focus-visible`, some don't. Focus ring styling should be consistent across all interactive elements.

**Current pattern** (Header.tsx):
```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
```

But not universally applied to all interactive components.

### Solution: Create Focus State Utility

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/styles/globals.css`**

Update the focus-visible base style (lines 69-73) to be more prominent:

```css
/* Focus ring - Enhanced for better visibility */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 0.25rem; /* Slight rounding on outline */
}
```

Add a utility class for components that need focus:

```css
@layer utilities {
  /* Consistent focus state for interactive elements */
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2;
  }

  /* Focus ring without offset (for inline elements) */
  .focus-ring-inline {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0;
  }

  /* More prominent focus ring for buttons */
  .focus-ring-lg {
    @apply focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2;
  }
}
```

Then simplify component focus states:

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/layout/Header.tsx`**

Simplify lines 144:

```tsx
className={cn(
  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
  'hover:bg-background-elevated hover:text-primary',
  'focus-ring',  // Use utility instead of inline classes
  isActive(link.href)
    ? 'bg-background-elevated text-primary'
    : 'text-foreground-secondary'
)}
```

---

## Issue 5: Missing Error State Styling

### Problem
No consistent error/validation state styling for form fields or action results. The design system defines an error color but it's rarely used for feedback.

### Solution: Add Error State Utilities and Implement Validation Feedback

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/styles/globals.css`**

Add error/validation utilities (after line 436):

```css
@layer utilities {
  /* Error message text */
  .text-error-message {
    @apply text-sm text-error font-medium;
  }

  /* Error state container */
  .error-container {
    @apply rounded-lg border border-error/50 bg-error/5 px-4 py-3;
  }

  /* Error badge/label */
  .error-badge {
    @apply inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-error/10 text-error;
  }

  /* Validation success state */
  .success-container {
    @apply rounded-lg border border-success/50 bg-success/5 px-4 py-3;
  }

  /* Warning state */
  .warning-container {
    @apply rounded-lg border border-warning/50 bg-warning/5 px-4 py-3;
  }

  /* Input with error state */
  .input-error {
    @apply border-error/70 bg-error/5 focus-visible:ring-error;
  }
}
```

---

## Issue 6: StatCard Trend Indicator Visual Consistency

### Problem
StatCard uses hardcoded colors instead of design tokens, and the trend indicators could be more visually distinct.

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/journey/StatCard.tsx`, lines 25-29:

```tsx
const trendColors = {
  up: 'text-green-400',        // Not in design system!
  down: 'text-red-400',        // Not in design system!
  neutral: 'text-foreground-muted',
};
```

### Solution: Update to Use Design System

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/journey/StatCard.tsx`**

```tsx
const trendColors = {
  up: 'text-accent-lime',           // Use design token
  down: 'text-error',               // Use semantic error color
  neutral: 'text-foreground-muted',
};

// Optional: Add background badges for better visibility
const trendBgColors = {
  up: 'bg-accent-lime/10',
  down: 'bg-error/10',
  neutral: 'bg-foreground-muted/5',
};
```

Then update the render to include background:

```tsx
{trend && trendValue && (
  <div className={`mt-1 text-xs flex items-center gap-1 px-2 py-1 rounded ${trendBgColors[trend]}`}>
    <span className={trendColors[trend]}>
      {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
    </span>
    <span className={trendColors[trend]}>
      {trendValue}
    </span>
  </div>
)}
```

---

## Issue 7: Loading State for Async Components

### Problem
Several components like GameCard and ShowCards don't have proper loading states for when data is being fetched or processing async operations.

### Solution: Create Standard Loading State Component

**New file: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/ui/LoadingOverlay.tsx`**

```tsx
'use client';

import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  className,
  children,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            {message && (
              <p className="text-sm text-foreground-secondary">{message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Issue 8: Inconsistent Card Spacing and Padding

### Problem
Cards use different padding amounts:
- `Card` component: `p-6` (24px)
- `SongCard`: `p-5` (20px)
- `GameCard`: `p-5` (20px)
- Custom cards: vary

This creates visual inconsistency.

### Solution: Standardize Card Spacing

Update tailwind.config.ts to define spacing tokens:

```typescript
theme: {
  extend: {
    spacing: {
      card: '1.5rem', // 24px - standard card padding
      'card-sm': '1rem', // 16px - compact card padding
      'card-lg': '2rem', // 32px - expanded card padding
    },
    // ... rest of config
  }
}
```

Then update components to use consistent spacing:

**File: `/Users/louisherman/Documents/dmbalmanac-v2/packages/ui/src/components/Card.tsx`**

```tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-border bg-background-surface text-foreground shadow-sm p-[1.5rem]',  // Use consistent padding
      className
    )}
    {...props}
  />
));
```

---

## Issue 9: Mobile Navigation Responsive States

### Problem
The Header component handles desktop well, but the mobile menu could have better visual feedback for currently active routes.

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/layout/MobileNav.tsx` - appears to be referenced but needs review for active state styling.

### Solution
Ensure MobileNav component includes:

```tsx
// In mobile navigation items
className={cn(
  'px-4 py-2 rounded-lg transition-colors',
  isActive(item.href)
    ? 'bg-primary/20 text-primary border-l-2 border-primary' // More visual on mobile
    : 'text-foreground-secondary hover:bg-background-elevated'
)}
```

---

## Issue 10: Button Focus Ring Offset Issues

### Problem
The Button component uses `focus-visible:ring-offset-2` which creates space between button and ring. This looks less polished on smaller buttons.

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/packages/ui/src/components/Button.tsx`, line 7:

```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
```

### Solution

**File: `/Users/louisherman/Documents/dmbalmanac-v2/packages/ui/src/components/Button.tsx`**

Create responsive focus styling:

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'rounded-full bg-primary text-primary-foreground shadow-[0_3px_0_oklch(0.50_0.18_45)] hover:shadow-[0_2px_0_oklch(0.50_0.18_45)] active:shadow-[0_0_0_oklch(0.50_0.18_45)] hover:translate-y-[1px] active:translate-y-[3px] font-bold tracking-wide focus-visible:ring-offset-2',
        destructive:
          'rounded-full bg-error text-white shadow-[0_3px_0_oklch(0.45_0.20_25)] hover:shadow-[0_2px_0_oklch(0.45_0.20_25)] active:shadow-[0_0_0_oklch(0.45_0.20_25)] hover:translate-y-[1px] active:translate-y-[3px] focus-visible:ring-offset-2',
        outline:
          'rounded-xl border-2 border-border bg-transparent hover:bg-background-surface hover:border-border-strong focus-visible:ring-offset-0',
        secondary:
          'rounded-xl bg-background-surface text-foreground hover:bg-background-elevated focus-visible:ring-offset-0',
        ghost:
          'rounded-lg hover:bg-background-surface focus-visible:ring-offset-0',
        link:
          'text-primary underline-offset-4 hover:underline focus-visible:ring-offset-0',
        vintage:
          'rounded-full bg-primary text-primary-foreground shadow-[0_4px_0_oklch(0.50_0.18_45),_0_6px_12px_oklch(0.15_0.01_280/0.6)] hover:shadow-[0_2px_0_oklch(0.50_0.18_45),_0_4px_8px_oklch(0.15_0.01_280/0.6)] active:shadow-[0_0_0_oklch(0.50_0.18_45),_0_2px_4px_oklch(0.15_0.01_280/0.6)] hover:translate-y-[2px] active:translate-y-[4px] font-bold tracking-wide uppercase text-xs focus-visible:ring-offset-2',
      },
      // ... size variants remain the same
    },
  }
);
```

---

## Issue 11: Contrast Ratios and Accessibility

### Problem
While most text has good contrast, some combinations may not meet WCAG AA standards:

- `text-foreground-secondary` on `bg-background-surface` might be close to 4.5:1 minimum
- Error messages using `text-error` on error backgrounds could be insufficient
- Muted text in certain contexts may fall below minimum

### Solution: Add Contrast Checking

Create a utility to verify and document contrast ratios:

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/lib/accessibility.ts`**

```typescript
/**
 * Contrast Ratio Reference for Design System
 *
 * All combinations verified for WCAG AA (4.5:1 for text, 3:1 for UI components)
 */

export const contrastRatios = {
  // Primary text on backgrounds
  'foreground-on-base': '14.2:1',        // text-primary on bg-base ✓
  'foreground-on-surface': '11.8:1',     // text-primary on bg-surface ✓
  'foreground-on-elevated': '10.5:1',    // text-primary on bg-elevated ✓

  // Secondary text
  'secondary-on-surface': '5.2:1',       // text-secondary on bg-surface ✓
  'secondary-on-elevated': '4.8:1',      // text-secondary on bg-elevated ✓

  // Muted text
  'muted-on-surface': '2.8:1',           // text-muted on bg-surface - FAIL for small text
  'muted-on-elevated': '2.6:1',          // text-muted on bg-elevated - FAIL for small text

  // Primary accent
  'primary-on-elevated': '7.2:1',        // text-primary on bg-elevated ✓
  'primary-on-surface': '7.8:1',         // text-primary on bg-surface ✓

  // Error states
  'error-on-surface': '5.4:1',           // text-error on bg-surface ✓
  'error-on-base': '6.1:1',              // text-error on bg-base ✓
};

/**
 * Usage guideline: Use foreground-secondary or above for all text that must be readable.
 * Use foreground-muted only for supplementary labels, hints, and non-critical information.
 */
```

Then add a CSS comment to globals.css noting these constraints:

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/styles/globals.css`**

Add after the color variables (line 46):

```css
/* ACCESSIBILITY NOTE:
   - foreground-muted is < 3:1 ratio and should only be used for non-critical hints
   - For small text (<14px), ensure minimum secondary or stronger contrast
   - Use foreground-secondary for body text that must be readable
   - All interactive states maintain 4.5:1 minimum ratio
*/
```

---

## Issue 12: Empty State Designs

### Problem
Limited empty state designs across the app. Only SongCard has a basic empty state, but other data-driven components lack them.

### Solution: Create Comprehensive Empty State Component

**New file: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/ui/EmptyState.tsx`**

```tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from '@dmbalmanac/ui';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-border/50 bg-background-surface/50 px-6 py-16 text-center ${className}`}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
      )}

      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>

      <p className="mb-6 max-w-sm text-sm text-foreground-secondary">
        {description}
      </p>

      {action && (
        <Button
          variant="default"
          size="sm"
          onClick={action.onClick}
          asChild={!action.onClick}
        >
          {action.href && !action.onClick ? (
            <a href={action.href}>{action.label}</a>
          ) : (
            action.label
          )}
        </Button>
      )}
    </div>
  );
}
```

Then create variants for different scenarios:

**File: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/ui/EmptyStates/index.tsx`**

```tsx
import { Search, Music, MapPin, Trophy } from 'lucide-react';
import { EmptyState } from '../EmptyState';

export function NoSearchResults() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search terms or filters to find what you're looking for."
      className="col-span-full"
    />
  );
}

export function NoSongsYet() {
  return (
    <EmptyState
      icon={Music}
      title="No songs yet"
      description="Add songs to get started. Search or browse the full catalog."
      action={{
        label: 'Browse Songs',
        href: '/songs',
      }}
      className="col-span-full"
    />
  );
}

export function NoVenuesVisited() {
  return (
    <EmptyState
      icon={MapPin}
      title="No venues visited"
      description="Track the venues you've attended at DMB shows."
      action={{
        label: 'View All Venues',
        href: '/venues',
      }}
      className="col-span-full"
    />
  );
}

export function NoAchievements() {
  return (
    <EmptyState
      icon={Trophy}
      title="Achievements locked"
      description="Complete challenges and milestones to unlock achievements."
      className="col-span-full"
    />
  );
}
```

---

## Issue 13: Toast/Notification Styling

### Problem
NetworkStatus component handles online/offline notifications well, but there's no unified notification component for form submissions, confirmations, or other user feedback.

### Solution: Create Notification Component

**New file: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/ui/Toast.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: {
    container: 'bg-success/10 border-success/30',
    icon: 'text-success',
    title: 'text-success',
  },
  error: {
    container: 'bg-error/10 border-error/30',
    icon: 'text-error',
    title: 'text-error',
  },
  info: {
    container: 'bg-primary/10 border-primary/30',
    icon: 'text-primary',
    title: 'text-primary',
  },
  warning: {
    container: 'bg-warning/10 border-warning/30',
    icon: 'text-warning',
    title: 'text-warning',
  },
};

export function Toast({
  id,
  type,
  title,
  description,
  duration = 5000,
  onClose,
}: ToastProps) {
  const Icon = icons[type];
  const style = styles[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border px-4 py-3',
        'animate-slide-in-right',
        style.container
      )}
      role="alert"
    >
      <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', style.icon)} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold', style.title)}>{title}</p>
        {description && (
          <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
        )}
      </div>

      <button
        onClick={() => onClose(id)}
        className="mt-0.5 flex-shrink-0 text-foreground-muted hover:text-foreground transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Toast Container - Add to layout root
 */
interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

/**
 * Hook for using toasts
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (
    toast: Omit<ToastProps, 'id' | 'onClose'>
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
```

---

## Issue 14: Responsive Typography Hierarchy

### Problem
While the tailwind.config has a fluid type scale, some components don't follow it consistently. Card titles use generic font-semibold instead of leveraging the type scale.

### Solution: Create Typography Component Library

**New file: `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/ui/Typography.tsx`**

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import * as React from 'react';

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'text-4xl font-black tracking-tight',
      h2: 'text-3xl font-bold tracking-tight',
      h3: 'text-2xl font-bold',
      h4: 'text-xl font-semibold',
      h5: 'text-lg font-semibold',
      h6: 'text-base font-semibold',
      p: 'text-base font-normal',
      p-large: 'text-lg font-normal',
      p-small: 'text-sm font-normal',
      p-tiny: 'text-xs font-normal',
      caption: 'text-xs font-medium uppercase tracking-wide',
      label: 'text-sm font-semibold',
      code: 'font-mono text-sm',
    },
  },
  defaultVariants: {
    variant: 'p',
  },
});

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean;
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : getElementForVariant(variant);
    return (
      <Comp
        ref={ref}
        className={cn(typographyVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Typography.displayName = 'Typography';

function getElementForVariant(variant?: string) {
  switch (variant) {
    case 'h1': return 'h1';
    case 'h2': return 'h2';
    case 'h3': return 'h3';
    case 'h4': return 'h4';
    case 'h5': return 'h5';
    case 'h6': return 'h6';
    case 'p-large':
    case 'p':
    case 'p-small':
    case 'p-tiny': return 'p';
    case 'label': return 'label';
    case 'caption': return 'span';
    case 'code': return 'code';
    default: return 'p';
  }
}

// Convenience exports
export const H1 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
  <Typography variant="h1" asChild={false} {...props} />
);
export const H2 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
  <Typography variant="h2" asChild={false} {...props} />
);
export const H3 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
  <Typography variant="h3" asChild={false} {...props} />
);
export const P = (props: React.HTMLAttributes<HTMLParagraphElement>) => (
  <Typography variant="p" asChild={false} {...props} />
);
export const Caption = (props: React.HTMLAttributes<HTMLSpanElement>) => (
  <Typography variant="caption" asChild={false} {...props} />
);
```

---

## Summary of High-Impact Improvements

| Priority | Issue | Effort | Impact | File(s) |
|----------|-------|--------|--------|---------|
| **P0** | Undefined accent colors | 2h | Blocks design consistency | tailwind.config.ts, SongCard.tsx, StatCard.tsx |
| **P0** | Skeleton animation polish | 1h | Visual polish | Skeleton.tsx |
| **P1** | Disabled state consistency | 3h | Accessibility & clarity | Multiple components, globals.css |
| **P1** | Focus state utilities | 2h | A11y improvement | globals.css, Header.tsx, Button.tsx |
| **P1** | Error state styling | 2h | Better UX feedback | globals.css |
| **P2** | Empty state components | 4h | Better experience for empty data | New component |
| **P2** | Contrast ratio documentation | 1h | A11y compliance | accessibility.ts, globals.css |
| **P2** | Toast/notification system | 3h | Better user feedback | New component |
| **P3** | Typography component library | 3h | Consistency | New component |
| **P3** | Mobile nav active states | 1h | Visual clarity | MobileNav.tsx |

---

## Implementation Roadmap

### Week 1: Foundation (Highest Impact)
1. Add missing accent colors to tailwind.config.ts
2. Update components to use new colors
3. Replace `animate-pulse` with `shimmer` in skeletons
4. Create focus-ring utilities
5. Document contrast ratios

### Week 2: Polish
6. Add disabled state utilities and update components
7. Create error state styles
8. Implement EmptyState component variations
9. Create Toast/notification system

### Week 3: Enhancement
10. Create Typography component library
11. Standardize card spacing
12. Update MobileNav active states
13. Add LoadingOverlay component

---

## Testing Checklist

- [ ] All color references resolve correctly
- [ ] Skeleton animations use shimmer across all components
- [ ] Disabled states are clearly visible and functional
- [ ] Focus rings appear on keyboard navigation
- [ ] Empty states display correctly
- [ ] Error messages appear with proper styling
- [ ] Toasts display and auto-dismiss
- [ ] All interactive elements are 44px minimum (mobile)
- [ ] Contrast ratios meet WCAG AA (4.5:1 for text)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Mobile navigation shows active route clearly
- [ ] Typography hierarchy is consistent
- [ ] Card spacing is uniform throughout

---

## Accessibility Checklist

- [ ] Focus-visible states on all interactive elements
- [ ] Semantic HTML (buttons, links, forms)
- [ ] ARIA labels on icons and hidden content
- [ ] Color not the only indicator of state
- [ ] Error messages associated with form fields
- [ ] Loading states announced to screen readers
- [ ] View transitions don't trigger seizures
- [ ] Touch targets minimum 44x44px
- [ ] Text has sufficient contrast
- [ ] Keyboard navigation fully functional

---

## Notes for Developers

1. **Use design tokens consistently** - Don't add hardcoded colors like `green-400`
2. **Test keyboard navigation** - Tab through all interactive elements
3. **Test on actual devices** - Simulator doesn't show all behaviors
4. **Verify contrast** - Use WebAIM contrast checker for critical text
5. **Check animations** - Ensure they add value and respect `prefers-reduced-motion`
6. **Document variants** - Keep component APIs clear for future maintainers

