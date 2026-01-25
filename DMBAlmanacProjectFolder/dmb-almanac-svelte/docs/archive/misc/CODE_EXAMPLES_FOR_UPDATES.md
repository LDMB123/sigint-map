# UI Audit - Code Examples & Updates

This document provides specific code snippets for updating components to use the new design system improvements.

---

## 1. SongCard.tsx - Fix Color References

### Current Code (Lines 162-169)

```tsx
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
    cyan: 'bg-accent-cyan/10 text-accent-cyan',      // ❌ Not defined
    magenta: 'bg-accent-magenta/10 text-accent-magenta', // ❌ Not defined
    lime: 'bg-accent-lime/10 text-accent-lime',      // ❌ Not defined
  };

  return (
    <div className={`rounded-md px-2 py-1.5 ${colorClasses[color]}`}>
      <p className="font-bold">{value}</p>
      <p className="opacity-80">{label}</p>
    </div>
  );
}
```

### Updated Code ✅

```tsx
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
    cyan: 'bg-accent-cyan/10 text-accent-cyan',         // ✅ Now defined in design system
    magenta: 'bg-accent-magenta/10 text-accent-magenta', // ✅ Now defined in design system
    lime: 'bg-accent-lime/10 text-accent-lime',         // ✅ Now defined in design system
  };

  return (
    <div className={`rounded-md px-2 py-1.5 ${colorClasses[color]}`}>
      <p className="font-bold">{value}</p>
      <p className="opacity-80">{label}</p>
    </div>
  );
}
```

**What Changed**: Nothing in the component code! The colors are now defined in the design system.

---

## 2. StatCard.tsx - Improve Trend Indicators

### Current Code (Lines 25-29)

```tsx
const trendColors = {
  up: 'text-green-400',      // ❌ Not in design system
  down: 'text-red-400',      // ❌ Not in design system
  neutral: 'text-foreground-muted',
};
```

### Updated Code ✅

```tsx
const trendColors = {
  up: 'text-accent-lime',      // ✅ Use design token
  down: 'text-error',          // ✅ Use semantic error color
  neutral: 'text-foreground-muted',
};

// ✅ NEW: Add background badges for better visibility
const trendBgColors = {
  up: 'bg-accent-lime/10',
  down: 'bg-error/10',
  neutral: 'bg-foreground-muted/5',
};
```

### Updated Render Logic (Lines 40-43)

**Before:**
```tsx
{trend && trendValue && (
  <p className={`mt-1 text-xs ${trendColors[trend]}`}>
    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
  </p>
)}
```

**After:**
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

**Benefits**:
- Uses design system colors
- Better visual distinction with background
- More accessible with color + icon + label
- Improves contrast for color-blind users

---

## 3. Adding EmptyState to Components

### Example: Songs Page

```tsx
'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Music, Search } from 'lucide-react';

export default function SongsPage() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ... data fetching logic ...

  // ✅ Show empty state when appropriate
  if (!isLoading && songs.length === 0) {
    if (searchTerm) {
      return (
        <EmptyState
          icon={Search}
          title="No songs found"
          description={`No songs match your search for "${searchTerm}". Try different keywords.`}
          action={{
            label: 'Clear Search',
            onClick: () => setSearchTerm(''),
          }}
        />
      );
    }

    return (
      <EmptyState
        icon={Music}
        title="No songs yet"
        description="Add songs to get started. Browse the full catalog to find songs."
        action={{
          label: 'Browse All Songs',
          href: '/songs',
        }}
      />
    );
  }

  // ... normal content rendering ...
}
```

---

## 4. Using Toast Notifications

### Add to Root Layout

**File: `apps/web/src/app/layout.tsx`**

```tsx
'use client';

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToast();

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </body>
    </html>
  );
}

export default RootLayoutContent;
```

### Use Toast in Components

```tsx
'use client';

import { useToast } from '@/components/ui/Toast';
import { Button } from '@dmbalmanac/ui';

export function MyForm() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ✅ Success case
      const response = await fetch('/api/songs', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      addToast({
        type: 'success',
        title: 'Song saved',
        description: 'Your song has been added to the collection.',
      });

      // Reset form
      setFormData({});
    } catch (error) {
      // ❌ Error case
      addToast({
        type: 'error',
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'An error occurred',
        duration: 0, // Don't auto-dismiss errors - user must acknowledge
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Song'}
      </Button>
    </form>
  );
}
```

### Use Toast for Different Scenarios

```tsx
// Success
addToast({
  type: 'success',
  title: 'Added to favorites',
  description: 'This song has been saved to your favorites.',
  duration: 3000, // Auto-dismiss after 3 seconds
});

// Error (don't auto-dismiss)
addToast({
  type: 'error',
  title: 'Network error',
  description: 'Failed to connect to server. Please check your connection.',
  duration: 0, // User must close manually
});

// Info
addToast({
  type: 'info',
  title: 'Offline mode',
  description: 'You are viewing cached data.',
  duration: 5000,
});

// Warning
addToast({
  type: 'warning',
  title: 'Unsaved changes',
  description: 'You have unsaved changes that will be lost.',
  duration: 0,
});
```

---

## 5. Implementing Focus Ring Utilities

### Before: Inconsistent focus states

```tsx
// Header.tsx
className={cn(
  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
  'hover:bg-background-elevated hover:text-primary',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', // Duplicated across app
  isActive(link.href) ? 'bg-background-elevated text-primary' : 'text-foreground-secondary'
)}
```

### After: Using focus-ring utility

```tsx
// Header.tsx
className={cn(
  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
  'hover:bg-background-elevated hover:text-primary',
  'focus-ring', // ✅ Simple, reusable utility
  isActive(link.href) ? 'bg-background-elevated text-primary' : 'text-foreground-secondary'
)}
```

### Focus Ring Utilities (in globals.css)

```css
/* ============================================
   FOCUS STATE UTILITIES
   ============================================ */

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
```

---

## 6. Disabled State Utilities

### Before: Inconsistent disabled styling

```tsx
// Pagination.tsx
className="... disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background-surface"

// Button.tsx
className="... disabled:pointer-events-none disabled:opacity-50"

// Other components
className="... disabled:bg-gray-400 disabled:text-gray-600" // Wrong colors!
```

### After: Using disabled utilities

```tsx
// Pagination.tsx
className={cn(
  'rounded-lg border transition-colors',
  isDisabled
    ? 'border-border/50 bg-background-surface text-foreground-muted btn-disabled'
    : 'border-border bg-background-surface hover:bg-background-elevated'
)}

// Custom interactive elements
className={cn(
  'rounded-lg px-4 py-2 transition-colors',
  isDisabled
    ? 'interactive-disabled'
    : 'bg-primary hover:bg-primary-hover'
)}

// Text in disabled state
<span className={isDisabled ? 'text-disabled' : 'text-foreground'}>
  {label}
</span>
```

### Disabled Utilities (in globals.css)

```css
/* ============================================
   DISABLED/INACTIVE STATE UTILITIES
   ============================================ */

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
```

---

## 7. Error State Styling

### Form with Error Feedback

```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input'; // Assuming exists
import { Button } from '@dmbalmanac/ui';
import { AlertCircle } from 'lucide-react';

export function SongForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ title: '', artist: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validation
    if (!formData.title) newErrors.title = 'Song title is required';
    if (!formData.artist) newErrors.artist = 'Artist name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit...
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title field with error */}
      <div>
        <label className="block text-sm font-medium mb-2">Song Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={cn(
            'w-full rounded-lg border px-3 py-2 transition-colors',
            errors.title
              ? 'border-error/70 bg-error/5 focus-visible:ring-error' // ✅ Error styles
              : 'border-border hover:border-border-strong'
          )}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p
            id="title-error"
            className="error-container mt-2 flex items-center gap-2" // ✅ Error styles
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {errors.title}
          </p>
        )}
      </div>

      {/* Artist field with error */}
      <div>
        <label className="block text-sm font-medium mb-2">Artist *</label>
        <input
          type="text"
          value={formData.artist}
          onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
          className={cn(
            'w-full rounded-lg border px-3 py-2 transition-colors',
            errors.artist
              ? 'border-error/70 bg-error/5 focus-visible:ring-error' // ✅ Error styles
              : 'border-border hover:border-border-strong'
          )}
          aria-invalid={!!errors.artist}
          aria-describedby={errors.artist ? 'artist-error' : undefined}
        />
        {errors.artist && (
          <p
            id="artist-error"
            className="error-container mt-2 flex items-center gap-2" // ✅ Error styles
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {errors.artist}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full">
        Save Song
      </Button>
    </form>
  );
}
```

### Error Utilities (in globals.css)

```css
/* ============================================
   ERROR/VALIDATION STATE UTILITIES
   ============================================ */

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
```

---

## 8. Using New Accent Colors

### Data Visualization Example

```tsx
// Performance indicators using new accent colors
<div className="grid grid-cols-3 gap-4">
  {/* Technical metric - use cyan */}
  <div className="p-4 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30">
    <p className="text-sm text-foreground-muted">API Response Time</p>
    <p className="text-2xl font-bold text-accent-cyan">142ms</p>
  </div>

  {/* Success metric - use lime */}
  <div className="p-4 rounded-lg bg-accent-lime/10 border border-accent-lime/30">
    <p className="text-sm text-foreground-muted">Success Rate</p>
    <p className="text-2xl font-bold text-accent-lime">99.8%</p>
  </div>

  {/* Featured metric - use magenta */}
  <div className="p-4 rounded-lg bg-accent-magenta/10 border border-accent-magenta/30">
    <p className="text-sm text-foreground-muted">Featured Songs</p>
    <p className="text-2xl font-bold text-accent-magenta">47</p>
  </div>
</div>
```

---

## Summary Table

| Issue | Solution | Effort | Impact |
|-------|----------|--------|--------|
| Undefined colors | Added 3 colors to design system | 30 min | High |
| Skeleton animation | Changed to shimmer | 15 min | High |
| Disabled states | Created 5 utility classes | 30 min | Medium |
| Focus states | Created 3 utility classes | 30 min | Medium |
| Error states | Created 4 utility classes | 30 min | Medium |
| No empty states | Created EmptyState component | 1 hr | High |
| No notifications | Created Toast system | 2 hrs | High |
| Color inconsistency | Updated SongCard, StatCard | 1 hr | Medium |

**Total time to implement all changes: 4-5 hours**

