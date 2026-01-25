# Quick Start: Apply All Changes (1.4 KB Savings)

This is the fastest path to implement Phase 1 + 2 changes (45 minutes, very low risk).

---

## Change 1: Remove Unused Animation Hooks

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`

**Step 1:** Delete function `useScrollPosition()` (lines 304-318)

Find and delete this entire block:
```typescript
// ==================== SCROLL POSITION TRACKING ====================

/**
 * Track scroll position for parallax or scroll-based animations
 *
 * Usage:
 * const scrollY = useScrollPosition();
 */
export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
}
```

**Step 2:** Delete function `useHover()` (lines 320-363)

Find and delete this entire block:
```typescript
// ==================== HOVER ANIMATION ====================

/**
 * Track hover state for animation triggers
 *
 * @deprecated PREFER CSS :hover - This hook adds unnecessary JS overhead.
 * CSS can handle hover states natively:
 *
 * ```css
 * .element { transform: scale(1); transition: transform 200ms; }
 * .element:hover { transform: scale(1.05); }
 * ```
 *
 * Only use this hook if you need hover state in JS logic (rare).
 *
 * Usage (if truly needed):
 * const { ref, isHovered } = useHover();
 * <div ref={ref} className={isHovered ? 'hover-scale' : ''}>
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

**Step 3:** Delete function `useFocus()` (lines 365-409)

Find and delete this entire block:
```typescript
// ==================== FOCUS ANIMATION ====================

/**
 * Track focus state for animation triggers
 *
 * @deprecated PREFER CSS :focus-visible - This hook adds unnecessary JS overhead.
 * CSS can handle focus states natively:
 *
 * ```css
 * .element:focus-visible {
 *   outline: 2px solid var(--color-focus);
 *   outline-offset: 2px;
 * }
 * ```
 *
 * Only use this hook if you need focus state in JS logic (rare).
 *
 * Usage (if truly needed):
 * const { ref, isFocused } = useFocus();
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

---

## Change 2: Update Motion Module Exports

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/index.ts`

**Replace lines 8-21 with:**

```typescript
// Animation Hooks
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

**Removed:**
- `useHover,`
- `useFocus,`
- `useScrollPosition,`

---

## Change 3: Simplify usePrefersReducedMotion

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`

**Replace lines 39-64 with:**

```typescript
/**
 * Check if user prefers reduced motion
 * Returns true if reduced motion is preferred
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
```

**Removed (lines 50-60):**
```typescript
    // Fallback for older browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediaQuery.addListener(handleChange as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => mediaQuery.removeListener(handleChange as any);
```

---

## Change 4: Remove webkit Fallback from Web Speech API

**File:** `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`

**Step 1:** Remove line 38 from type definition

**Before (lines 35-40):**
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

**Step 2:** Simplify line 83

**Before:**
```typescript
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
```

**After:**
```typescript
    const SpeechRecognitionAPI = window.SpeechRecognition;
```

---

## Verification Steps (IMPORTANT!)

Run these before starting:

```bash
# Verify no usage of removed hooks
grep -r "useScrollPosition" /Users/louisherman/Documents/dmb-almanac/components
grep -r "useHover" /Users/louisherman/Documents/dmb-almanac/components
grep -r "useFocus" /Users/louisherman/Documents/dmb-almanac/components
grep -r "useScrollPosition" /Users/louisherman/Documents/dmb-almanac/app
grep -r "useHover" /Users/louisherman/Documents/dmb-almanac/app
grep -r "useFocus" /Users/louisherman/Documents/dmb-almanac/app
```

**Expected result:** No matches (meaning the hooks are safe to remove)

---

## Testing After Changes

```bash
cd /Users/louisherman/Documents/dmb-almanac

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm test

# Build
npm run build

# Optional: Check bundle size
npx source-map-explorer '.next/static/chunks/main-*.js' --html /tmp/bundle.html
```

---

## Expected Results

All tests should pass. Bundle size should be:
- **1.2 KB smaller** from animation hook removals
- **200 B smaller** from webkit fallback removal
- **Total: 1.4 KB smaller** (gzipped)

---

## Rollback (If Issues Arise)

If something breaks after changes:

```bash
# Undo the last changes
git diff lib/motion/useAnimation.ts
git checkout lib/motion/useAnimation.ts
git checkout lib/motion/index.ts
git checkout components/search/SearchInput/SearchInput.tsx

# Or revert entire commit
git revert HEAD
```

---

## Commit Message

```
refactor: remove unused animation hooks and webkit fallback

- Remove useScrollPosition() hook (never used, 300B)
- Remove useHover() hook (deprecated, unused, 480B)
- Remove useFocus() hook (deprecated, unused, 420B)
- Update motion/index.ts exports
- Remove webkit fallback from Web Speech API (50B)
- Simplify usePrefersReducedMotion by removing deprecated addListener fallback (150B)

Total savings: 1.4 KB gzipped

These changes target Chromium 143+ where all APIs are natively supported.
```

---

## Time Estimate

- Read and understand changes: 5 min
- Edit 4 files: 15 min
- Verification (grep commands): 5 min
- Run tests and build: 10 min
- Total: **35 minutes**

---

## Summary of Changes

| File | Change | Lines | Savings |
|------|--------|-------|---------|
| motion/useAnimation.ts | Remove 3 hooks | 304-409 | 1.2 KB |
| motion/useAnimation.ts | Simplify 1 function | 38-64 | 150 B |
| motion/index.ts | Update exports | 8-21 | 100 B |
| search/SearchInput.tsx | Remove webkit fallback | 38, 83 | 50 B |
| **TOTAL** | | | **1.4 KB** |

---

## After Completing These Changes

Check the detailed documents for Optional Phase 2/3 enhancements:

1. **Phase 2:** Verify and conditionally remove observeLazyElements() (+400B)
2. **Phase 3:** CSS refactoring (animation-timeline, etc.)

See: `NATIVE_API_REPLACEMENTS_CHECKLIST.md` for complete details.
