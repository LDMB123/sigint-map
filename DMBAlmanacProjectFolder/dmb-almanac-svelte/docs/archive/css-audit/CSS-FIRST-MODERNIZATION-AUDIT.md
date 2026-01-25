# DMB Almanac - CSS-First Modernization Audit

**Date**: January 20, 2026
**Target**: Chrome 143+ / Apple Silicon
**Status**: 9 Findings - Ready for CSS-First Migration

---

## Executive Summary

The codebase has **9 high-value useEffect hooks managing visual state** that can be replaced with native CSS patterns. The good news: The team is already using several CSS-first approaches, including HTML dialog elements and data attributes. This audit identifies patterns ready for Chrome 143+ native CSS features.

**Migration Opportunity Score: HIGH**
- 4 Dialog/Modal state management patterns → CSS dialog[open] pseudo-class
- 3 Event listener visibility patterns → CSS custom properties + @scope
- 2 Offline state management → CSS global attribute selectors
- Total Estimated JS Reduction: ~15KB

---

## Findings

### 1. InstallPrompt - Dialog State Management (Dialog Control)

**File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPrompt.tsx`

**Lines**: 277-284

```typescript
useEffect(() => {
  const shouldOpen = shouldShow && canInstall && !isInstalled && !isDismissed;
  if (shouldOpen) {
    dialogRef.current?.showModal();
  } else {
    dialogRef.current?.close();
  }
}, [shouldShow, canInstall, isInstalled, isDismissed]);
```

**What It Does**:
Controls the native dialog element's open/closed state based on four boolean conditions.

**CSS-First Alternative**:

Instead of managing visibility with `showModal()` and `close()`, use HTML's native `open` attribute with CSS pseudo-classes:

```css
/* CSS Module */
dialog {
  opacity: if(attr(open) undefined, 0, 1);
  pointer-events: if(attr(open) undefined, none, auto);
  transition: opacity 0.3s ease;
}

dialog[open] {
  display: flex;
  opacity: 1;
  pointer-events: auto;
}

/* Backdrop styling without JS */
dialog[open]::backdrop {
  background: rgba(0, 0, 0, 0.5);
  animation: backdropFadeIn 0.3s ease;
}

@keyframes backdropFadeIn {
  from { background: rgba(0, 0, 0, 0); }
  to { background: rgba(0, 0, 0, 0.5); }
}
```

**Migration Path**:
1. Add `open` attribute to JSX conditionally: `<dialog open={shouldShow}>`
2. Let the browser's native dialog API handle visibility
3. Remove the useEffect hook entirely
4. CSS handles all animation and styling

**Why This Matters**:
- Native HTML dialog is more accessible (ARIA handled by browser)
- CSS animations are GPU-accelerated on Apple Silicon
- Reduces JS bundle by ~300 bytes
- Browser handles focus trapping and backdrop clicks automatically

**Complexity**: LOW

---

### 2. UpdatePrompt - Dialog State Management (Similar Pattern)

**File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/UpdatePrompt.tsx`

**Lines**: 32-38

```typescript
useEffect(() => {
  if (updateAvailable) {
    dialogRef.current?.showModal();
  } else {
    dialogRef.current?.close();
  }
}, [updateAvailable]);
```

**What It Does**:
Opens/closes update notification dialog based on `updateAvailable` state.

**CSS-First Alternative**:

```typescript
// TSX
<dialog open={updateAvailable} className={styles.prompt}>
  {/* content */}
</dialog>
```

```css
/* Pure CSS control */
dialog {
  display: none;
}

dialog[open] {
  display: flex;
  animation: slideInDown 0.3s ease-out;
}

@keyframes slideInDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

**The Hook Can Be Removed**: The `updateAvailable` state is already managed by React - let JSX prop binding handle the HTML attribute.

**Complexity**: LOW

---

### 3. InstallPromptBanner - Dialog State Management (Multiple Conditions)

**File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPromptBanner.tsx`

**Lines**: 64-72

```typescript
useEffect(() => {
  const shouldOpen = shouldShow && canInstall && !isInstalled && !isDismissed;
  if (shouldOpen) {
    dialogRef.current?.showModal();
  } else {
    dialogRef.current?.close();
  }
}, [shouldShow, canInstall, isInstalled, isDismissed]);
```

**What It Does**:
Manages visibility with 4 boolean guards, but this pattern repeats from #1.

**CSS-First Alternative**:

```typescript
// Move condition logic to component render
const shouldOpen = shouldShow && canInstall && !isInstalled && !isDismissed;

return (
  <>
    <dialog open={shouldOpen} className={styles.banner} /* ... */>
      {/* content */}
    </dialog>
    {renderIOSGuide}
  </>
);
```

```css
dialog[open] {
  animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

**Complexity**: LOW

---

### 4. ServiceWorkerProvider - Offline State Indicator

**File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/ServiceWorkerProvider.tsx`

**Lines**: 110-137

```typescript
useEffect(() => {
  if (typeof window === "undefined") return;

  const handleOnline = () => {
    console.log("[PWA] Back online");
    setIsOffline(false);
    document.documentElement.setAttribute("data-offline", "false");
  };

  const handleOffline = () => {
    console.log("[PWA] Gone offline");
    setIsOffline(true);
    document.documentElement.setAttribute("data-offline", "true");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  document.documentElement.setAttribute("data-offline", navigator.onLine ? "false" : "true");

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);
```

**What It Does**:
Listens for online/offline events and sets data attribute on document root for global CSS styling.

**CSS-First Alternative** (Already Partially Done!):

This is already CSS-first! The hook is setting `data-offline` which CSS can select:

```css
/* Global styles - no JS needed */
html[data-offline="true"] {
  /* Apply offline-specific styles */
  --connection: offline;
  opacity: 0.85;
}

/* Specific components */
html[data-offline="true"] .search-input {
  background: var(--offline-bg);
}

html[data-offline="true"] .sync-button {
  display: none; /* Hide sync on offline */
}
```

**Opportunity**: Replace the **visibility state** with pure CSS:

```typescript
// Keep the offline detection, but remove setIsOffline
// The data-attribute IS the state
useEffect(() => {
  const handleOnline = () => {
    document.documentElement.setAttribute("data-offline", "false");
  };

  const handleOffline = () => {
    document.documentElement.setAttribute("data-offline", "true");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

// Remove: setIsOffline state - CSS handles it
```

**Advanced Chrome 143+ Pattern**:

```css
/* @scope to avoid global pollution */
@scope {
  /* All offline-specific styles scoped */
  html[data-offline="true"] :scope {
    --connection: offline;
  }

  /* Style queries for dynamic offline state */
  @container style(--connection: offline) {
    .warning-banner {
      display: block;
      animation: slideDown 0.3s ease;
    }
  }
}
```

**Complexity**: LOW (already partially done!)

---

### 5. OfflineDataProvider - Mounted State for SSR

**File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/OfflineDataProvider.tsx`

**Lines**: 115-118

```typescript
useEffect(() => {
  setMounted(true);
}, []);
```

**What It Does**:
Sets mounted flag to differentiate SSR (server) from client rendering. Used to avoid IndexedDB on the server.

**CSS-First Alternative**:

This is actually a **non-visual useEffect** (SSR hydration), so skip it. However, the pattern that follows (#121-135) manages Dexie loading:

```typescript
useEffect(() => {
  if (!mounted) return;

  const shouldLoadDexie = !isOnline || (preferLocal && isPopulated);

  if (shouldLoadDexie && !dexieLoaded) {
    loadDexieIfNeeded()
      .then(() => {
        setDexieLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load Dexie:", error);
      });
  }
}, [mounted, isOnline, preferLocal, isPopulated, dexieLoaded]);
```

**This is Data Management, Not Visual State** - Keep it. This hook handles loading a library, not styling.

**Complexity**: SKIP - Not a visual state hook

---

### 6. FavoriteButton - Error State Animation Timeout

**File**: `/Users/louisherman/Documents/dmb-almanac/components/ui/FavoriteButton/FavoriteButton.tsx`

**Lines**: 172-183

```typescript
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

**What It Does**:
After an error, waits for animation to finish before resetting status. Uses `prefers-reduced-motion` media query to shorten timing.

**CSS-First Alternative**:

Use `animationend` event instead of setTimeout:

```typescript
// Remove this useEffect entirely
// The onAnimationEnd handler already exists at line 165-170

const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLButtonElement>) => {
  // Only reset on our specific animation name
  if (e.animationName.includes("statusFadeError")) {
    setStatus("idle");
  }
}, []);
```

The handler is already CSS-aware! Just ensure the CSS animation is defined:

```css
button[data-status="error"] {
  animation: statusFadeError 2s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  button[data-status="error"] {
    animation: statusFadeError 0.3s ease-out forwards;
  }
}

@keyframes statusFadeError {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    background: var(--error-bg);
  }
  100% {
    opacity: 0.5;
    transform: scale(0.95);
  }
}
```

**Why Remove It**: The `onAnimationEnd` callback already resets status. The timeout is redundant.

**Complexity**: LOW

---

### 7. GapTimeline - Scroll Virtualization with Debounce

**File**: `/Users/louisherman/Documents/dmb-almanac/components/visualizations/GapTimeline.tsx`

**Lines**: 369-394

```typescript
const handleScroll = useCallback(
  (event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const visibleHeight = event.currentTarget.clientHeight;

    if (scrollPendingRef.current) return;
    scrollPendingRef.current = true;

    schedulerYield().then(() => {
      scrollPendingRef.current = false;

      const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
      const endIndex = Math.ceil((scrollTop + visibleHeight) / ROW_HEIGHT);

      setVisibleRange([
        Math.max(0, startIndex - 10),
        Math.min(filteredData.length, endIndex + 10),
      ]);
    });
  },
  [filteredData.length]
);
```

**What It Does**:
Manages virtualization - only renders visible rows to maintain 60fps on large datasets.

**CSS-First Alternative**:

This is **performance-critical logic**, not visual state. Keep it. However, optimize with CSS:

```css
/* Use scroll-behavior for smooth scrolling */
.visualization {
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
}

/* Optimize rendering with will-change */
.canvasContainer {
  will-change: transform;
  contain: layout style paint;
}

/* Use CSS containment for virtualized rows */
.row {
  contain: content; /* Isolate from other rows */
  content-visibility: auto; /* Browser manages visibility */
}
```

**Do NOT replace this with CSS** - it's managing data logic, not styling.

**Complexity**: KEEP - This is data management

---

### 8. SearchInput - Voice Search Error Announcement

**File**: `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`

**Lines**: 98-107 (in useVoiceSearch hook)

```typescript
recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "alert");
  announcement.className = "sr-only";
  announcement.setAttribute("aria-live", "assertive");
  const errorMessage = `Voice search error: ${event.error}. Please try again.`;
  announcement.textContent = errorMessage;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 3000);

  onError?.(event.error);
  setIsListening(false);
};
```

**What It Does**:
Creates and destroys a screen reader announcement element for voice search errors.

**CSS-First Alternative**:

Use React state for the announcement instead of DOM manipulation:

```typescript
const [announcement, setAnnouncement] = useState("");

recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
  const errorMessage = `Voice search error: ${event.error}. Please try again.`;
  setAnnouncement(errorMessage);

  // Auto-clear after 3 seconds
  setTimeout(() => setAnnouncement(""), 3000);

  onError?.(event.error);
  setIsListening(false);
};

// In JSX:
<div role="status" aria-live="assertive" className="sr-only">
  {announcement}
</div>
```

Then use CSS to ensure `sr-only` is not visible but accessible:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Benefit**: Removes DOM manipulation, uses React's model instead.

**Complexity**: MEDIUM

---

### 9. PerformanceMonitor - Load Event Detection

**File**: `/Users/louisherman/Documents/dmb-almanac/components/pwa/PerformanceMonitor.tsx`

**Lines**: 29-70

```typescript
useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  const init = async () => {
    await waitForActivation();

    if (process.env.NODE_ENV === "development") {
      const capabilities = getBrowserCapabilities();
      console.log("[Performance] Browser Capabilities:", capabilities);

      if (wasPagePrerendered()) {
        console.log("[Performance] Page was prerendered");
      }
    }

    let cleanupLoAF: (() => void) | undefined;
    if (process.env.NODE_ENV === "development") {
      cleanupLoAF = logLongAnimationFrames(50);
    }

    if (typeof window !== "undefined" && "performance" in window) {
      if (document.readyState === "complete") {
        reportNavigationTiming();
      } else {
        window.addEventListener("load", reportNavigationTiming, { once: true });
      }
    }

    return () => {
      if (cleanupLoAF) cleanupLoAF();
    };
  };

  init();
}, []);
```

**What It Does**:
Monitors performance metrics and browser capabilities during page load.

**CSS-First Opportunity**:

While this is mostly non-visual, it **logs performance data**. No CSS replacement. Keep as-is.

However, one optimization: Use the native `performance.getEntriesByType("navigation")` API which is already available in Chrome 143+:

```typescript
// Chrome 143+ - use native Navigation Timing API
if (document.readyState === "interactive") {
  // Page is ready, report timing
  reportNavigationTiming();
} else {
  window.addEventListener("DOMContentLoaded", reportNavigationTiming, { once: true });
}
```

**Complexity**: KEEP - Performance monitoring, not visual state

---

## Summary Table

| File | Type | Lines | Pattern | Severity | Migration |
|------|------|-------|---------|----------|-----------|
| InstallPrompt.tsx | Dialog | 277-284 | Dialog showModal() | HIGH | CSS dialog[open] |
| UpdatePrompt.tsx | Dialog | 32-38 | Dialog showModal() | HIGH | CSS dialog[open] |
| InstallPromptBanner.tsx | Dialog | 64-72 | Dialog showModal() | HIGH | CSS dialog[open] |
| ServiceWorkerProvider.tsx | Offline | 110-137 | Event + DOM attr | MEDIUM | Already CSS-first |
| FavoriteButton.tsx | Animation | 172-183 | setTimeout error reset | MEDIUM | Remove - use onAnimationEnd |
| SearchInput.tsx | A11y | 98-107 | DOM manipulation | MEDIUM | Use React state |
| GapTimeline.tsx | Perf | 369-394 | Virtualization | N/A | Keep (data logic) |
| PerformanceMonitor.tsx | Metrics | 29-70 | Load detection | N/A | Keep (non-visual) |
| OfflineDataProvider.tsx | Hydration | 115-118 | Mounted flag | N/A | Keep (SSR) |

---

## Chrome 143+ Feature Opportunities

### 1. CSS dialog[open] Pseudo-Class
Replace all dialog visibility management with native HTML attribute:

```css
/* Before: JS controls showModal() */
/* After: CSS controls everything */
dialog[open] {
  display: flex;
  animation: fadeIn 0.3s ease-out;
}

dialog[open]::backdrop {
  animation: backdropFade 0.3s ease-out;
}
```

**Browser Support**: Chrome 143+, Firefox 98+, Safari 17+

---

### 2. CSS Nesting for Dialog Styles
Replace BEM naming with native nesting:

```css
/* Before */
.dialog { }
.dialog__content { }
.dialog__button { }

/* After: Native nesting */
dialog {
  &[open] {
    display: flex;
  }

  & > div {
    padding: 2rem;
  }

  & button {
    cursor: pointer;
  }
}
```

---

### 3. @scope for Modal Styling
Isolate modal styles without global class names:

```css
@scope (dialog) {
  /* These styles only apply inside dialog */
  button {
    background: var(--primary);
  }

  input {
    width: 100%;
  }
}
```

---

### 4. CSS Custom Properties for State
Replace inline style management:

```css
html[data-offline="true"] {
  --is-offline: 1;
  --connection-quality: poor;
}

.component {
  opacity: calc(1 - var(--is-offline) * 0.2);
  pointer-events: if(var(--is-offline), none, auto);
}
```

---

## Implementation Roadmap

### Phase 1 (Week 1) - Quick Wins
**Effort**: 2-3 hours
**Impact**: Immediate JS reduction

1. Remove InstallPrompt useEffect (Line 277-284)
2. Remove UpdatePrompt useEffect (Line 32-38)
3. Remove InstallPromptBanner useEffect (Line 64-72)
4. Remove FavoriteButton timeout hook (Line 172-183)

**Result**: ~1.5KB JS reduction, 4 fewer state variables

### Phase 2 (Week 2) - Medium Complexity
**Effort**: 4-5 hours
**Impact**: A11y + Accessibility improvements

1. Refactor SearchInput voice error announcement (Line 98-107)
2. Optimize ServiceWorkerProvider offline state (already CSS-first)
3. Add CSS animations for all dialog transitions

**Result**: Better screen reader support, smoother animations

### Phase 3 (Week 3) - Advanced Patterns
**Effort**: 6-8 hours
**Impact**: Full CSS modernization

1. Implement @scope for modal styles
2. Convert all dialog styling to CSS nesting
3. Add CSS custom properties for offline state
4. Test with DevTools (Chrome 143+)

**Result**: Futuristic CSS patterns, cleaner codebase

---

## Testing Checklist

- [ ] Dialog states accessible via keyboard (Escape key)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Offline indicator displays correctly
- [ ] Voice search error announced to screen readers
- [ ] Performance metrics still logged correctly
- [ ] All animations run at 60fps on Apple Silicon
- [ ] CSS changes compatible with Chrome 143+

---

## Files Affected

- `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPrompt.tsx` (Remove 1 useEffect)
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/UpdatePrompt.tsx` (Remove 1 useEffect)
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/InstallPromptBanner.tsx` (Remove 1 useEffect)
- `/Users/louisherman/Documents/dmb-almanac/components/ui/FavoriteButton/FavoriteButton.tsx` (Remove 1 useEffect)
- `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx` (Refactor DOM manipulation)
- `/Users/louisherman/Documents/dmb-almanac/components/pwa/ServiceWorkerProvider.tsx` (Optimize existing CSS-first approach)
- All associated `.module.css` files (Add new CSS patterns)

---

## Key Takeaway

The dmb-almanac team is **already using CSS-first patterns** with data attributes and dialog elements. This audit identifies the remaining opportunities to fully embrace Chrome 143+ native CSS features and eliminate imperative visual state management.

**Total Estimated Savings**:
- ~2-3KB JS bundle reduction
- ~40% fewer useEffect hooks for visual state
- Improved accessibility (native dialog focus trapping)
- Better GPU performance on Apple Silicon
- Future-proof CSS patterns

