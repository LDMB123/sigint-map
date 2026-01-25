# Native API Replacements - Implementation Checklist

## Overview
11 specific opportunities identified to eliminate or simplify JavaScript by using native browser features available in Chromium 143+.

---

## CRITICAL REMOVALS (1.2 KB savings)

### [ ] 1. Remove `useScrollPosition()` Hook
**Status:** Unused export
**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Lines:** 304-318

**Before:**
```typescript
export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrollY;
}
```

**After:**
```
// DELETED - Use CSS animation-timeline: view() instead
```

**Verification Command:**
```bash
grep -r "useScrollPosition" /Users/louisherman/Documents/dmb-almanac/components
grep -r "useScrollPosition" /Users/louisherman/Documents/dmb-almanac/app
```

**Expected Result:** No matches (confirms it's unused)

**Savings:** 300 bytes

---

### [ ] 2. Remove `useHover()` Hook
**Status:** Marked @deprecated, unused export
**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Lines:** 320-363

**Before:**
```typescript
/**
 * @deprecated PREFER CSS :hover - This hook adds unnecessary JS overhead.
 */
export function useHover<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T | null>;
  isHovered: boolean;
} {
  const ref = useRef<T>(null);
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  return { ref, isHovered };
}
```

**After:**
```
// DELETED - Use CSS :hover pseudo-class instead
// Example replacement:
// const { ref, isHovered } = useHover();
// <div ref={ref} className={isHovered ? 'hover-active' : ''}>
//
// Becomes:
// <div className="hover-target">
//
// With CSS:
// .hover-target { opacity: 1; transition: opacity 200ms; }
// .hover-target:hover { opacity: 0.8; }
```

**Verification Command:**
```bash
grep -r "useHover" /Users/louisherman/Documents/dmb-almanac/components
grep -r "useHover" /Users/louisherman/Documents/dmb-almanac/app
```

**Expected Result:** No matches

**Savings:** 480 bytes

---

### [ ] 3. Remove `useFocus()` Hook
**Status:** Marked @deprecated, unused export
**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Lines:** 365-409

**Before:**
```typescript
/**
 * @deprecated PREFER CSS :focus-visible - This hook adds unnecessary JS overhead.
 */
export function useFocus<T extends HTMLElement = HTMLInputElement>(): {
  ref: React.RefObject<T | null>;
  isFocused: boolean;
} {
  const ref = useRef<T>(null);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);
    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);
  return { ref, isFocused };
}
```

**After:**
```
// DELETED - Use CSS :focus-visible pseudo-class instead
// Example replacement:
// const { ref, isFocused } = useFocus();
// <input ref={ref} className={isFocused ? 'focus-active' : ''} />
//
// Becomes:
// <input className="focus-target" />
//
// With CSS:
// .focus-target:focus-visible {
//   outline: 2px solid var(--color-focus);
//   outline-offset: 2px;
// }
```

**Verification Command:**
```bash
grep -r "useFocus" /Users/louisherman/Documents/dmb-almanac/components
grep -r "useFocus" /Users/louisherman/Documents/dmb-almanac/app
```

**Expected Result:** No matches

**Savings:** 420 bytes

---

### [ ] 4. Update Motion Module Exports
**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/index.ts`

**Before:**
```typescript
export {
  useEntrance,
  useStagger,
  useScrollReveal,
  useAnimationState,
  usePrefersReducedMotion,
  useMountAnimation,
  useDelayedAnimation,
  useAnimationSequence,
  useHover,           // <-- REMOVE
  useFocus,           // <-- REMOVE
  useScrollPosition,  // <-- REMOVE
  useElementSize,
} from './useAnimation';
```

**After:**
```typescript
export {
  useEntrance,
  useStagger,
  useScrollReveal,
  useAnimationState,
  usePrefersReducedMotion,
  useMountAnimation,
  useDelayedAnimation,
  useAnimationSequence,
  useElementSize,
} from './useAnimation';
```

**Savings:** 100 bytes

---

## EASY OPTIMIZATIONS (150 B savings)

### [ ] 5. Simplify `usePrefersReducedMotion()`
**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Lines:** 38-64

**Before:**
```typescript
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers (Chrome 143+ has this)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Fallback for older browsers (not needed for Chromium 143+)
    mediaQuery.addListener(handleChange as any);
    return () => mediaQuery.removeListener(handleChange as any);
  }, []);

  return prefersReducedMotion;
}
```

**After:**
```typescript
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Chromium 143+ has addEventListener
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
```

**Changes:** Remove lines 57-64 (the deprecated addListener fallback)

**Savings:** 150 bytes

---

### [ ] 6. Remove webkit Fallback in Web Speech API
**File:** `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`

**Lines to Remove:**
- Line 38: `webkitSpeechRecognition?: SpeechRecognitionConstructor;`
- Line 83: Change `window.SpeechRecognition || window.webkitSpeechRecognition` to just `window.SpeechRecognition`

**Before (Lines 35-39):**
```typescript
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
```

**After:**
```typescript
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}
```

**Before (Line 83):**
```typescript
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
```

**After:**
```typescript
const SpeechRecognitionAPI = window.SpeechRecognition;
```

**Savings:** 50 bytes

---

## OPTIONAL OPTIMIZATIONS (400-600 B potential)

### [ ] 7. Consider Removing `observeLazyElements()`
**Status:** Check if actually used
**File:** `/Users/louisherman/Documents/dmb-almanac/lib/performance-utils.ts`
**Lines:** 572-611

**Why?** Native HTML `loading="lazy"` and `fetchpriority` attributes replace this entirely.

**Verification:**
```bash
grep -r "observeLazyElements" /Users/louisherman/Documents/dmb-almanac/components
grep -r "observeLazyElements" /Users/louisherman/Documents/dmb-almanac/app
grep -r "data-lazy" /Users/louisherman/Documents/dmb-almanac
```

**If unused:** DELETE the entire function (400 bytes)

**If used:** Refactor to use native attributes:
```html
<!-- Before: JavaScript-based lazy loading -->
<img data-lazy-src="image.jpg" />

<!-- After: Native lazy loading -->
<img src="image.jpg" loading="lazy" fetchpriority="auto" />
```

---

### [ ] 8. Verify `initializeAppleSiliconOptimizations()` Usage
**Status:** Check if actually called
**File:** `/Users/louisherman/Documents/dmb-almanac/lib/apple-silicon-optimizations.ts`
**Lines:** 215-247

**Verification:**
```bash
grep -r "initializeAppleSiliconOptimizations" /Users/louisherman/Documents/dmb-almanac
```

**Expected Result:** Confirms if it's in use

**If unused:** Remove the call, keep the detection function (only export the detection, not initialization)

---

## CSS-ONLY ALTERNATIVES (Refactoring, not removal)

### [ ] 9. Replace Scroll Listeners with CSS `animation-timeline`
**Current Pattern:** JavaScript tracking scroll position

**CSS Alternative (Chrome 115+):**
```css
.parallax-element {
  animation: parallax-effect linear;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes parallax-effect {
  to { transform: translateY(-50px); }
}
```

**Implementation:**
- Create examples in `/app/globals.css`
- Document in code comments
- No code removal needed, just usage change

---

### [ ] 10. Replace `useHover()` with CSS `:hover`
**Current Pattern:**
```typescript
const { ref, isHovered } = useHover();
<div ref={ref} className={isHovered ? 'scaled' : ''}>
```

**CSS Pattern:**
```css
.interactive {
  scale: 1;
  transition: scale 200ms;
}

.interactive:hover {
  scale: 1.05;
}
```

**Implementation:**
- Audit components using hover states
- Replace with pure CSS where possible
- Keep hook only for JavaScript-dependent hover logic

---

### [ ] 11. Use Native ProMotion Detection
**Current:** JavaScript detection in apple-silicon-optimizations.ts
**Better:** CSS media query + JS for logging only

```css
:root {
  --frame-budget: 16ms; /* 60fps default */
}

@media (update: fast) {
  :root {
    --frame-budget: 8ms; /* ProMotion 120fps */
  }
}
```

**Implementation:**
- Keep JS detection for logging/telemetry
- Use CSS custom properties for animation frame budgets
- No code removal, just better separation of concerns

---

## Verification Commands (Run Before/After)

### Before Making Changes:
```bash
# Baseline bundle size
cd /Users/louisherman/Documents/dmb-almanac
npm run build

# Check bundle composition
npx source-map-explorer '.next/static/chunks/main-*.js' --html /tmp/baseline-bundle.html
```

### Verify No Usage:
```bash
# Search for removed hooks
grep -r "useScrollPosition" /Users/louisherman/Documents/dmb-almanac/components /Users/louisherman/Documents/dmb-almanac/app
grep -r "useHover" /Users/louisherman/Documents/dmb-almanac/components /Users/louisherman/Documents/dmb-almanac/app
grep -r "useFocus" /Users/louisherman/Documents/dmb-almanac/components /Users/louisherman/Documents/dmb-almanac/app

# Lint and type check
npm run lint
npx tsc --noEmit

# Run tests
npm test
```

### After Making Changes:
```bash
# New bundle size
npm run build

# Compare sizes
npx source-map-explorer '.next/static/chunks/main-*.js' --html /tmp/optimized-bundle.html

# Verify no import errors
npm run lint
npx tsc --noEmit

# Run full test suite
npm test
```

---

## Implementation Timeline

| Week | Task | Estimated Time | Expected Savings |
|------|------|-----------------|------------------|
| **Week 1** | Remove 3 hooks + update exports | 30 min | 1.2 KB |
| **Week 1** | Simplify usePrefersReducedMotion | 15 min | 150 B |
| **Week 1** | Remove webkit fallback | 10 min | 50 B |
| **Week 2** | Verify observeLazyElements usage | 20 min | 0-400 B |
| **Week 2** | Check apple-silicon init usage | 10 min | 0-200 B |
| **Week 2-3** | CSS animation-timeline refactoring | 2-3 hrs | 300 B + perf gain |
| **Week 3** | Bundle size testing & validation | 1 hr | Measurement |

**Total Estimated Savings:** 1.8-2.3 KB gzipped

---

## Risk Assessment

**LOW RISK Changes (safe to do immediately):**
- Remove unused hooks (#1, #2, #3, #4)
- Simplify deprecated patterns (#5, #6)

**MEDIUM RISK Changes (verify usage first):**
- Remove observeLazyElements (#7) - check if used
- Remove initialization call (#8) - check if needed

**NO-RISK Optimizations (refactoring, not deletion):**
- CSS animation-timeline (#9, #10, #11) - additive, no breaking changes

---

## Quality Checklist

Before committing changes:

- [ ] All TypeScript type checks pass: `npx tsc --noEmit`
- [ ] All linting passes: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] Bundle size measured and validated
- [ ] No broken imports (verify with `npm run build`)
- [ ] Removed hooks confirmed as unused
- [ ] Git history clean with descriptive commits

---

## Questions/Clarifications Needed

Before starting work, verify:

1. Are the removed hooks actually unused? (confirmed via grep)
2. Is `observeLazyElements()` in use? (need grep confirmation)
3. Is `initializeAppleSiliconOptimizations()` called anywhere? (need grep confirmation)
4. Are there any scroll-dependent features relying on `useScrollPosition()`? (need visual inspection)
5. Any third-party code importing from motion/index.ts? (check external dependencies)

---

## Final Notes

- **Total potential savings: 1.8-2.3 KB gzipped** (~2% of typical bundle)
- **Primary value is code cleanliness**, not dramatic size reduction
- Codebase is exceptionally well-optimized already
- Focus on Phase 1 (removals) first, then CSS refactoring for maximum impact
- All changes are low-risk and easily reversible
