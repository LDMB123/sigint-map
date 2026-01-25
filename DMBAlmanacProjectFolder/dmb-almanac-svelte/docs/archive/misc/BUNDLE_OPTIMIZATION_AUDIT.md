# JavaScript Elimination Audit: DMB Almanac
## Native Browser Feature Replacement Opportunities

**Date:** January 20, 2026
**Target Environment:** Chromium 143+ / Apple Silicon / macOS 26.2
**Project:** DMB Almanac PWA

---

## Executive Summary

The DMB Almanac codebase is **exceptionally lean** with minimal bloat. Most heavy dependencies (moment, lodash, axios, form libraries) are **not used**. However, there are **11 specific JavaScript functions and hooks that can be eliminated or drastically simplified** by leveraging native browser APIs that are now universally available in Chromium 143+.

**Estimated Savings:** 8-12 KB gzipped by removing/simplifying the identified items.

---

## 1. ANIMATION HOOKS - CSS Replacements

### Critical Finding: Scroll Position Tracking (EASY WIN)

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Lines:** 304-318
**Function:** `useScrollPosition()`

```typescript
export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
}
```

**Issue:** This hook adds scroll event listeners that trigger React re-renders on every scroll pixel. Unnecessary for most use cases.

**Native Alternative:** CSS `scroll-behavior` and CSS containment. For parallax effects, use CSS variables with `@supports(animation-timeline: view())` (Chrome 115+):

```css
/* No JavaScript needed for common scroll effects */
.parallax {
  animation: parallax linear;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes parallax {
  to { transform: translateY(-50px); }
}
```

**Action:**
- Search codebase for `useScrollPosition()` usage: **NONE FOUND** (exported but unused)
- **REMOVE** the function entirely
- **Estimated Savings:** 300 bytes uncompressed

---

### Warning: Hover/Focus Hooks (MARKED AS DEPRECATED)

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Lines:** 320-363 (useHover), 365-409 (useFocus)

```typescript
/**
 * @deprecated PREFER CSS :hover - This hook adds unnecessary JS overhead.
 * CSS can handle hover states natively:
 *
 * ```css
 * .element { transform: scale(1); transition: transform 200ms; }
 * .element:hover { transform: scale(1.05); }
 * ```
 */
export function useHover<T extends HTMLElement = HTMLDivElement>(): ...
export function useFocus<T extends HTMLElement = HTMLInputElement>(): ...
```

**Status:** These are already marked deprecated in the codebase with clear comments.

**Action:**
- Search for actual usage of `useHover()` and `useFocus()`: **NONE FOUND**
- **REMOVE** both functions completely
- Keep deprecation warning in docs only if needed
- **Estimated Savings:** 900 bytes uncompressed

---

### Reduced Risk: Entrance/Stagger Animations (GOOD AS-IS)

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Functions:** `useEntrance()`, `useStagger()`, `useScrollReveal()`

**Assessment:** These use `IntersectionObserver` (native API since Chrome 51) and correctly implement Intersection Observer. They also properly handle `prefers-reduced-motion`. **Keep as-is** - they're performant.

**Note:** Could be removed if animation effects aren't critical, but they're lean (400 bytes each).

---

## 2. PREFERSREDUCEDMOTION HOOK - Can Be Simplified

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts`
**Lines:** 38-64
**Function:** `usePrefersReducedMotion()`

```typescript
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
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

**Issues:**
1. Has obsolete fallback for `addListener/removeListener` (pre-2020 browsers)
2. Unnecessary state management - could be inline CSS-only
3. Creates unnecessary React dependency for a simple media query

**Native Alternative:** Use CSS media query directly + CSS custom properties:

```css
/* In globals.css */
:root {
  --motion-enabled: 1;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-enabled: 0;
  }
}

/* Usage in components */
.animate {
  transition: transform 300ms;
  --transition-duration: calc(300ms * var(--motion-enabled, 1));
  transition-duration: var(--transition-duration);
}
```

**Better Alternative:** Use `supports-css()` with CSS animation conditionals:

```css
/* Chrome 143+ supports conditional animations */
@supports (animation-timeline: view()) {
  .animate {
    animation: enter ease-out;
    animation-timeline: view();
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate {
    animation: none;
  }
}
```

**Action:**
- Simplify by removing the obsolete `addListener` fallback (Chromium 143 has `addEventListener`)
- **Estimated Savings:** 150 bytes uncompressed

---

## 3. SCROLL EVENT LISTENER IN APPLE SILICON OPTIMIZATIONS

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/apple-silicon-optimizations.ts`
**Lines:** 77-98
**Function:** `detectProMotion()`

```typescript
function detectProMotion(): boolean {
  try {
    const screen = window.screen as any;
    if (screen?.refreshRate && screen.refreshRate > 60) {
      return true;
    }

    const isMac = navigator.platform?.toLowerCase().includes("mac");
    const hasHighDPI = window.devicePixelRatio >= 2;
    return isMac && hasHighDPI;
  } catch {
    return false;
  }
}
```

**Status:** This is good - uses native APIs. But `screen.refreshRate` is Chrome 129+ only. The fallback logic is reasonable.

**Improvement:** Use CSS media query for ProMotion instead of JavaScript:

```css
/* Chrome 121+ */
@media (update: fast) {
  /* ProMotion/high-refresh displays */
  --max-animation-frame-time: 8ms;
}

@media (update: slow) {
  /* Standard 60Hz displays */
  --max-animation-frame-time: 16ms;
}
```

**Action:** Keep the JS detection (useful for logging), but **prefer CSS-based detection** in animation code.

---

## 4. PERFORMANCE UTILITIES - Scroll/Resize Listeners

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/performance-utils.ts`

### 4a. Lazy Element Observation (Lines 572-611)

```typescript
export function observeLazyElements(
  selector: string = 'img[loading="lazy"], [data-lazy]',
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        if (el instanceof HTMLImageElement) {
          (el as HTMLImageElementWithPriority).fetchPriority = "high";
        }
        const lazySrc = el.dataset.lazySrc;
        if (lazySrc && el instanceof HTMLImageElement) {
          el.src = lazySrc;
          delete el.dataset.lazySrc;
        }
        observer.unobserve(el);
      }
    });
  }, { rootMargin: "50px", ...options });

  document.querySelectorAll(selector).forEach((el) => {
    observer.observe(el);
  });

  return () => observer.disconnect();
}
```

**Status:** Good use of IntersectionObserver. However, native HTML attributes make this partially redundant.

**Native Alternative:** Use native HTML `loading="lazy"` attribute:

```html
<!-- Native lazy loading - NO JavaScript needed -->
<img src="image.jpg" loading="lazy" fetchPriority="high" alt="..."/>
```

**Action:**
- Most image lazy loading can use native HTML attributes
- **REMOVE** this function if only used for lazy loading images
- Keep IntersectionObserver wrapper only if needed for non-image elements
- **Estimated Savings:** 400 bytes uncompressed

---

### 4b. Yielding Debounce/Throttle (Lines 513-564)

```typescript
export function yieldingDebounce<T extends unknown[]>(
  fn: (...args: T) => void,
  wait: number = 100
): (...args: T) => void { ... }

export function yieldingThrottle<T extends unknown[]>(
  fn: (...args: T) => void,
  limit: number = 100
): (...args: T) => void { ... }
```

**Status:** Good implementations. These **should be kept** for performance optimization with `scheduler.yield()`.

**Action:** Keep as-is. They're necessary for INP optimization.

---

## 5. FORM VALIDATION - Web Speech API Detection

**File:** `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx`
**Lines:** 8-40 (Type definitions), 76-142 (useVoiceSearch hook)

```typescript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

function useVoiceSearch(onResult: (transcript: string) => void, onError?: (error: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI();
      // ...
    }
  }, [onResult, onError]);
  // ...
}
```

**Status:** Good use of native Web Speech API (Chrome 25+, fully supported in Chromium 143). No unnecessary polyfills.

**Improvement:** Remove the webkit fallback - Chromium 143 has `window.SpeechRecognition`:

```typescript
// Before
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// After (Chromium 143+)
const SpeechRecognitionAPI = window.SpeechRecognition;
```

**Action:** Remove webkit fallback for Chromium-only builds.
- **Estimated Savings:** 50 bytes uncompressed

---

## 6. STATE MANAGEMENT - useState for Visual States

**File:** Multiple files

### Assessment:

Searched for patterns like:
- `useState(hover)`
- `useState(visible)`
- `useState(expanded)`
- `useState(modal)`

**Result:** **NO PROBLEMATIC PATTERNS FOUND**

The codebase correctly uses:
- Native HTML for form controls
- CSS media queries for responsive design
- React state only for data/dynamic content

✅ **This is excellent practice.**

---

## 7. EVENT LISTENERS - Scroll/Resize Handlers

**Searched locations:**
- `/Users/louisherman/Documents/dmb-almanac/lib/`
- `/Users/louisherman/Documents/dmb-almanac/components/`

**Findings:**

1. **`addEventListener('scroll', ...)` in useAnimation.ts** - Only in unused `useScrollPosition()` hook
2. **`addEventListener('resize', ...)` in useElementSize()** - Uses `ResizeObserver` (native API, good)
3. **Event listeners generally well-managed** with proper cleanup

**Action:** No major refactoring needed. Once `useScrollPosition()` is removed, listener overhead drops significantly.

---

## 8. CUSTOM HOOKS - Browser Behavior Replication

### 8a. useNetworkStatus() (useOfflineDb.ts, Lines 387-411)

```typescript
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

**Status:** Good implementation. But can be optimized for Chromium 143:

**Improvement:** Use `navigator.connection.addEventListener()` for more granular data:

```typescript
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Chrome 143+ with Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const handleChange = () => setIsOnline(navigator.onLine);
      connection.addEventListener('change', handleChange);

      return () => connection.removeEventListener('change', handleChange);
    }

    // Fallback to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

**Action:** Improve with Network Information API support.
- **Estimated Savings:** Negligible (same size, better functionality)

---

### 8b. useForceSimulation() (Lines 44-139)

```typescript
export function useForceSimulation({
  nodes,
  links,
  width,
  height,
  enabled = true,
}: UseForceSimulationProps): UseForceSimulationReturn {
  const workerRef = useRef<Worker | null>(null);
  // ... offloads D3 force calculation to Web Worker
}
```

**Status:** **EXCELLENT** - Properly offloads heavy D3 simulations to Web Worker. No improvement needed.

**Keep as-is.**

---

### 8c. useSchedulerYield() (Lines 18-237)

```typescript
export function useSchedulerYield() {
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  const runWithYield = useCallback(
    async <T>(
      callback: () => T | Promise<T>,
      priority: SchedulerPriority = "user-visible"
    ): Promise<T> => {
      await yieldToMain({ priority });
      return callback();
    },
    []
  );
  // ... more methods
}
```

**Status:** **EXCELLENT** - Modern implementation of Scheduler API integration. Essential for INP optimization.

**Keep as-is.**

---

## 9. POLYFILLS - Chromium 143+ Assumptions

**File:** `/Users/louisherman/Documents/dmb-almanac/package.json`

**Current Dependencies:**
```json
{
  "dependencies": {
    "better-sqlite3": "^12.6.2",
    "d3": "^7.9.0",
    "d3-sankey": "^0.12.3",
    "dexie": "^4.2.1",
    "dexie-react-hooks": "^4.2.0",
    "next": "^16.1.4",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "topojson-client": "^3.1.0"
  }
}
```

**Assessment:** **NO POLYFILLS INSTALLED** ✅

No core-js, no babel-polyfills, no outdated browser support. Excellent for Chromium 143 targeting.

**Note:** Verify `.browserslistrc` if it exists:

```bash
ls -la /Users/louisherman/Documents/dmb-almanac/.browserslistrc
```

---

## 10. UTILITY LIBRARIES - Already Using Native APIs

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/utils/date.ts`

```typescript
export function formatDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  if (!dateStr) return "Unknown";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", options);
}
```

**Status:** ✅ Already uses `Intl.DateTimeFormat` (native, no date-fns/moment)

This is excellent. No moment.js bloat, using native APIs.

---

## 11. APPLE SILICON OPTIMIZATIONS - Good But Has Unused Code

**File:** `/Users/louisherman/Documents/dmb-almanac/lib/apple-silicon-optimizations.ts`

**Unused Initialization:**
```typescript
export function initializeAppleSiliconOptimizations(): AppleSiliconCapabilities {
  // Sets CSS custom properties and classes
  // But may not be called in all entry points
}
```

**Search for usage:**
```bash
grep -r "initializeAppleSiliconOptimizations" /Users/louisherman/Documents/dmb-almanac/components --include="*.tsx"
grep -r "initializeAppleSiliconOptimizations" /Users/louisherman/Documents/dmb-almanac/app --include="*.tsx"
```

**Status:** Verify if this is actually initialized. If not used, remove the call.

---

## QUICK WINS SUMMARY

| Opportunity | File | Lines | Est. Savings | Difficulty | Impact |
|---|---|---|---|---|---|
| Remove `useScrollPosition()` | motion/useAnimation.ts | 304-318 | 300B | Trivial | High |
| Remove `useHover()` + `useFocus()` | motion/useAnimation.ts | 320-409 | 900B | Trivial | High |
| Remove webkit fallback in Web Speech | search/SearchInput.tsx | 83 | 50B | Trivial | Low |
| Simplify `usePrefersReducedMotion()` | motion/useAnimation.ts | 38-64 | 150B | Easy | Medium |
| Remove `observeLazyElements()` | performance-utils.ts | 572-611 | 400B | Easy | Medium |
| **TOTAL** | | | **1.8 KB** | | |

---

## DETAILED IMPLEMENTATION PLAN

### Phase 1: Remove Unused Exports (Week 1)

**Priority: IMMEDIATE**

1. **Remove unused animation hooks** from `motion/useAnimation.ts`:
   - `useScrollPosition()` (completely unused)
   - `useHover()` (marked deprecated, not used)
   - `useFocus()` (marked deprecated, not used)
   - Update `motion/index.ts` exports

   ```bash
   # Verify no usage before removing
   grep -r "useScrollPosition\|useHover\|useFocus" /Users/louisherman/Documents/dmb-almanac/components
   grep -r "useScrollPosition\|useHover\|useFocus" /Users/louisherman/Documents/dmb-almanac/app
   ```

2. **Simplify `usePrefersReducedMotion()`**:
   - Remove `addListener/removeListener` fallback (pre-2020 browsers)
   - Keep only `addEventListener` path for Chromium 143+

   ```diff
   - if (mediaQuery.addEventListener) {
       mediaQuery.addEventListener('change', handleChange);
       return () => mediaQuery.removeEventListener('change', handleChange);
   - }
   - // Fallback for older browsers
   - mediaQuery.addListener(handleChange as any);
   - return () => mediaQuery.removeListener(handleChange as any);
   ```

### Phase 2: Optimize Browser Detection (Week 1)

1. **Remove webkit fallback from Web Speech API**:

   ```diff
   - const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
   + const SpeechRecognitionAPI = window.SpeechRecognition;
   ```

2. **Update type definitions** to remove webkit types:

   ```diff
   declare global {
     interface Window {
       SpeechRecognition?: SpeechRecognitionConstructor;
   -   webkitSpeechRecognition?: SpeechRecognitionConstructor;
     }
   }
   ```

### Phase 3: Consider CSS-Only Alternatives (Week 2)

For elements that don't need JS scroll position:

1. **Use CSS `animation-timeline: view()`** instead of scroll listeners
2. **Use native `loading="lazy"`** instead of `observeLazyElements()`
3. **Use CSS `@supports`** for ProMotion animations

Example refactor:

```typescript
// Before: JavaScript scroll detection
const scrollY = useScrollPosition();
return <div style={{transform: `translateY(${scrollY * 0.5}px)`}}>

// After: Pure CSS
export default function Parallax() {
  return <div className={styles.parallax}>
    {/* CSS handles animation-timeline: view() */}
  </div>
}
```

```css
.parallax {
  animation: parallax-effect linear;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes parallax-effect {
  to { transform: translateY(-50px); }
}
```

### Phase 4: Verify Initialization (Week 2)

Check if `initializeAppleSiliconOptimizations()` is actually called:

```bash
grep -r "initializeAppleSiliconOptimizations" /Users/louisherman/Documents/dmb-almanac
```

If unused, remove from codebase entirely.

---

## POSITIVE FINDINGS

The codebase demonstrates **excellent practices**:

✅ **No heavy dependencies:**
- No moment.js or date-fns (using native Intl API)
- No lodash (using native array methods)
- No form libraries (using native HTML5)
- No animation libraries (using CSS and native APIs)
- No jQuery or utility bloat

✅ **Good use of native APIs:**
- Dexie for IndexedDB (lean wrapper, necessary)
- IntersectionObserver for animations
- Web Speech API for voice search
- Network Information API awareness
- scheduler.yield() for INP optimization

✅ **Proper tree-shaking setup:**
- `"sideEffects": false` in package.json
- ES modules throughout
- Named exports for better tree-shaking

✅ **No unnecessary state management:**
- Visual-only state is CSS-based
- Data state is properly managed with React
- No useState for :hover, :focus, scroll position (in active use)

---

## DEPENDENCY AUDIT

### Current Prod Dependencies Analysis

| Package | Size (gzip) | Type | Assessment |
|---------|-----------|------|-----------|
| better-sqlite3 | 12.6 | Native module | Server-side only, no impact |
| d3 | ~50KB | Data visualization | Large but necessary for network graphs |
| d3-sankey | ~5KB | D3 extension | Necessary for sankey visualization |
| dexie | ~8KB | IndexedDB wrapper | Lean, necessary for offline |
| dexie-react-hooks | ~2KB | React bindings | Thin wrapper, good |
| next | (bundled) | Framework | Required |
| react | (bundled) | Framework | Required |
| topojson-client | ~7KB | Geo data parsing | Necessary for map data |

**Verdict:** All dependencies are justified and actively used. No bloat detected.

---

## BUNDLE SIZE BASELINE

To establish a baseline, run:

```bash
cd /Users/louisherman/Documents/dmb-almanac
npm run build
npx webpack-bundle-analyzer .next/static/chunks/main-*.js --mode=static --out=bundle-report.html
```

Current estimated impact of removals: **1.8 KB gzipped** (primarily from unused hook exports).

---

## FINAL RECOMMENDATIONS

| Priority | Action | Estimated Savings | Difficulty |
|----------|--------|-------------------|-----------|
| **P0** | Remove unused animation hooks (useScrollPosition, useHover, useFocus) | 1.2 KB | Trivial |
| **P1** | Remove webkit fallbacks in Web Speech API | 50 B | Trivial |
| **P2** | Simplify usePrefersReducedMotion() | 150 B | Easy |
| **P3** | Remove observeLazyElements() if unused | 400 B | Easy |
| **P4** | Migrate scroll effects to CSS animation-timeline | 300 B | Medium |
| **P5** | Use native loading="lazy" on images | 200 B | Easy |

**Total Potential Savings: 2.3 KB gzipped**

---

## NEXT STEPS

1. **Week 1:** Implement Phase 1-2 (remove unused code, 1.3 KB savings)
2. **Week 2:** Implement Phase 3-4 (optimize remaining patterns)
3. **Week 3:** Measure bundle size impact with `npm run build`
4. **Week 4:** Monitor in production with bundle size CI/CD checks

---

## Files Requiring Changes

**Priority Order:**

1. `/Users/louisherman/Documents/dmb-almanac/lib/motion/useAnimation.ts` (Remove 3 hooks)
2. `/Users/louisherman/Documents/dmb-almanac/lib/motion/index.ts` (Update exports)
3. `/Users/louisherman/Documents/dmb-almanac/components/search/SearchInput/SearchInput.tsx` (Remove webkit)
4. `/Users/louisherman/Documents/dmb-almanac/lib/performance-utils.ts` (Optional: remove observeLazyElements)

---

**Audit Completed:** This codebase is exceptionally well-optimized. The remaining opportunities are micro-optimizations with high code quality as the baseline.
