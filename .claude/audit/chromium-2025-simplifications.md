# DMB Almanac - Concrete Simplifications for Chrome 143+

**Generated**: January 25, 2026
**Target**: /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

---

## Quick Reference: What to Remove

### CSS Vendor Prefixes (11 removable lines)

```css
/* FILE: src/app.css */

/* Line 651 - REMOVE */
-webkit-text-size-adjust: 100%;

/* Lines 676-677 - REMOVE BOTH */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;

/* Line 660 - OPTIONAL REMOVE */
text-rendering: optimizeLegibility;

/* Line 700 - REMOVE (keep native version on 701) */
-webkit-transform: translate3d(0, 0, 0);

/* Lines 1214, 1228, 1235, 1242, 1248 - REMOVE ALL */
/* Replace -webkit-app-region with app-region (native) */

/* Lines 1283, 1293 - REMOVE */
-webkit-overflow-scrolling: touch;
```

---

## Specific Code Changes

### Change 1: Fix HTML Element (Line 651)

**Before**:
```css
html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;  /* iOS Safari workaround from 2010 */

  scroll-behavior: smooth;
  scrollbar-gutter: stable;
  text-rendering: optimizeLegibility;
  ...
}
```

**After**:
```css
html {
  font-size: 16px;
  /* Removed: -webkit-text-size-adjust - not needed on Chrome 143+ */

  scroll-behavior: smooth;
  scrollbar-gutter: stable;
  /* Removed: text-rendering: optimizeLegibility - native fonts sufficient */
  ...
}
```

**Bytes Saved**: ~35 bytes

---

### Change 2: Fix Body Element (Lines 676-677)

**Before**:
```css
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--foreground);
  background-color: var(--background);

  /* macOS-optimized font smoothing */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  min-height: 100dvh;
  transform: translateZ(0);
  ...
}
```

**After**:
```css
body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--foreground);
  background-color: var(--background);

  /* Removed: Font smoothing prefixes - handled natively on Chrome 143+ */

  min-height: 100dvh;
  transform: translateZ(0);
  ...
}
```

**Bytes Saved**: ~50 bytes

---

### Change 3: Fix Apple Silicon Class (Line 700)

**Before**:
```css
/* Apple Silicon GPU Optimization Classes */
.apple-silicon body {
  /* Enhanced GPU layer hints for M-series chips */
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
}
```

**After**:
```css
/* Apple Silicon GPU Optimization Classes */
.apple-silicon body {
  /* Enhanced GPU layer hints for M-series chips */
  transform: translate3d(0, 0, 0); /* Native version sufficient */
}
```

**Bytes Saved**: ~30 bytes

---

### Change 4: Fix Window Controls Overlay (Lines 1214-1248)

**Before**:
```css
@media (display-mode: window-controls-overlay) {
  .app-header {
    -webkit-app-region: drag;    /* Vendor prefix unnecessary */
    app-region: drag;

    padding-right: calc(var(--titlebar-area-width) + var(--space-4));
    padding-top: var(--titlebar-area-height);
  }

  .app-header button,
  .app-header a,
  .app-header summary {
    -webkit-app-region: no-drag;  /* Vendor prefix unnecessary */
    app-region: no-drag;
  }

  .logo {
    -webkit-app-region: drag;     /* Vendor prefix unnecessary */
    app-region: drag;
  }

  .nav,
  .mobileNav {
    -webkit-app-region: no-drag;  /* Vendor prefix unnecessary */
    app-region: no-drag;
  }

  .menuButton {
    -webkit-app-region: no-drag;  /* Vendor prefix unnecessary */
    app-region: no-drag;
  }

  .app-header .container {
    padding-right: calc(var(--space-4) + env(titlebar-area-width, 0));
  }
}
```

**After**:
```css
@media (display-mode: window-controls-overlay) {
  .app-header {
    app-region: drag;

    padding-right: calc(var(--titlebar-area-width) + var(--space-4));
    padding-top: var(--titlebar-area-height);
  }

  .app-header button,
  .app-header a,
  .app-header summary {
    app-region: no-drag;
  }

  .logo {
    app-region: drag;
  }

  .nav,
  .mobileNav {
    app-region: no-drag;
  }

  .menuButton {
    app-region: no-drag;
  }

  .app-header .container {
    padding-right: calc(var(--space-4) + env(titlebar-area-width, 0));
  }
}
```

**Bytes Saved**: ~75 bytes

---

### Change 5: Fix Scroll Optimization (Lines 1283, 1293)

**Before**:
```css
/* Optimized scrolling for ProMotion 120Hz displays */
@media (min-resolution: 2dppx) {
  html {
    scroll-behavior: smooth;
  }

  .scroll-container {
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;  /* Safari iOS momentum - not needed */

    transform: translateZ(0);
    will-change: scroll-position;
  }
}

/* Momentum scrolling for trackpad/Magic Mouse */
.momentum-scroll {
  -webkit-overflow-scrolling: touch;    /* Safari iOS momentum - not needed */
  scroll-snap-type: y proximity;
}
```

**After**:
```css
/* Optimized scrolling for ProMotion 120Hz displays */
@media (min-resolution: 2dppx) {
  html {
    scroll-behavior: smooth;
  }

  .scroll-container {
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;

    transform: translateZ(0);
    will-change: scroll-position;
  }
}

/* Momentum scrolling for trackpad/Magic Mouse */
.momentum-scroll {
  scroll-snap-type: y proximity;
}
```

**Bytes Saved**: ~40 bytes

---

## Code-Level Simplifications

### Optional: Create Shared Browser Support Utility

**File**: `src/lib/utils/browser-support.ts`

**Create new file with**:
```typescript
/**
 * Shared browser capability detection for Chrome 143+
 * Centralizes feature checks used across utilities
 */

/**
 * Check if scheduler.yield() is supported
 * Available in Chrome 129+
 */
export function isSchedulerYieldSupported(): boolean {
  return typeof globalThis !== 'undefined' &&
    'scheduler' in globalThis &&
    'yield' in (globalThis as any).scheduler;
}

/**
 * Check if View Transitions API is supported
 * Available in Chrome 111+
 */
export function isViewTransitionsSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return typeof (document as any).startViewTransition === 'function';
}

/**
 * Check if Popover API is supported
 * Available in Chrome 114+, Safari 17.4+, Firefox 125+
 */
export function isPopoverSupported(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return (
    'popover' in document.createElement('div') &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function' &&
    typeof HTMLElement.prototype.togglePopover === 'function'
  );
}
```

**Then update files to import from shared utility**:

```typescript
// In scheduler.ts, inpOptimization.ts, performance.ts:
import { isSchedulerYieldSupported } from './browser-support';

// Use the shared function instead of duplicating the check
if (isSchedulerYieldSupported()) {
  await (globalThis as any).scheduler.yield();
}
```

**Bytes Saved**: ~50-80 bytes across all files

---

## Optional Build Configuration Update

### Update Vite Build Target to ES2024

**File**: `vite.config.ts`

**Before**:
```typescript
export default defineConfig(({ mode }) => ({
  // ... other config ...
  build: {
    target: 'es2022',  // Supports ES2022 features
    reportCompressedSize: true,
    // ... rest of build config ...
  }
}));
```

**After**:
```typescript
export default defineConfig(({ mode }) => ({
  // ... other config ...
  build: {
    target: 'es2024',  // Supports ES2024 features (Object.groupBy, etc)
    reportCompressedSize: true,
    // ... rest of build config ...
  }
}));
```

**Benefits**:
- Enables Object.groupBy() if used
- Enables Promise.withResolvers() if used
- Better forward-compatibility
- No bundle size impact (features already supported)

**Bytes Saved**: 0 (no immediate impact, but enables future optimizations)

---

## Summary of Changes

### Quick Implementation (5-10 minutes)

| Change | File | Lines | Action | Saved |
|--------|------|-------|--------|-------|
| Remove text-size-adjust | app.css | 651 | Delete | 5 bytes |
| Remove font smoothing | app.css | 676-677 | Delete | 25 bytes |
| Remove text-rendering | app.css | 660 | Delete | 5 bytes |
| Remove -webkit-transform | app.css | 700 | Delete | 30 bytes |
| Remove -webkit-app-region | app.css | 1214, 1228, 1235, 1242, 1248 | Delete | 75 bytes |
| Remove -webkit-overflow-scrolling | app.css | 1283, 1293 | Delete | 40 bytes |
| **TOTAL CSS SIMPLIFICATION** | | | | **~180 bytes** |

### Recommended (15-20 minutes)

| Change | File | Action | Saved |
|--------|------|--------|-------|
| Create browser-support.ts | utils/ | Create utility | 50-80 bytes |
| Update imports | Multiple files | Import shared utility | (consolidated) |
| Update vite.config.ts | vite.config.ts | Change target to es2024 | 0 bytes (future-proofing) |
| **TOTAL CODE SIMPLIFICATION** | | | **~50-80 bytes** |

### Overall Bundle Impact

- **Immediate**: ~180-200 bytes gzipped removed from CSS
- **With code refactoring**: ~230-280 bytes gzipped removed total
- **Percentage**: 0.1-0.3% of typical bundle size

---

## Verification Checklist

After making changes, verify:

- [ ] CSS still loads without errors
- [ ] No visual differences in Chrome 143+
- [ ] Window controls overlay still works in desktop PWA mode
- [ ] Scrolling behavior unchanged
- [ ] All TypeScript imports resolve correctly
- [ ] Build completes successfully
- [ ] Bundle size reported by Vite matches expectations
- [ ] Test in Chrome 143+ DevTools

---

## Browser Support After Changes

| Feature | Before | After | Notes |
|---------|--------|-------|-------|
| Font rendering | Chrome 80+ | Chrome 80+ | No change |
| App region dragging | Chrome 108+ | Chrome 108+ | No change |
| Overflow scrolling | iOS 5+ | iOS 5+ (but unnecessary) | Removed hint |
| GPU acceleration | Chrome 50+ | Chrome 50+ | Native features work |
| Viewport adjustments | iOS 3.2+ | iOS 3.2+ (but unnecessary) | Not needed |

**Conclusion**: All changes are purely CSS cleanup with zero functional impact on supported browsers.

---

## Why These Changes Are Safe

1. **Chrome 143+ Requirement**: The app already explicitly targets Chrome 143+
2. **Vendor Prefixes Redundant**: All "-webkit-" and "-moz-" prefixes have native equivalents
3. **Gradual Rollout**: Can implement one change at a time with testing
4. **No Fallback Removal**: Only removing CSS hints, not functionality
5. **Standard Properties**: Using W3C standard CSS properties instead of prefixes

---

## Testing After Implementation

### Manual Testing
```bash
# 1. Build project
npm run build

# 2. Inspect CSS file size
ls -lh build/assets/*.css

# 3. Check visual changes
# - Open in Chrome 143+
# - Verify no layout shifts
# - Check app-region dragging in PWA mode
# - Test scrolling performance
```

### Automated Verification
```bash
# 4. Run tests
npm test

# 5. Check TypeScript
npm run check
```

---

**Ready to implement? Start with CSS changes - they're the safest and provide immediate results.**
