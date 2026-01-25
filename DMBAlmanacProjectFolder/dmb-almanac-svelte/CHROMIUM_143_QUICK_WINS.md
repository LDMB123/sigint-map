# Chromium 143+ Quick Wins Implementation Guide
## DMB Almanac - Priority Feature Additions
**Target Effort**: 40-60 dev hours for full compliance

---

## Priority 1: CSS if() Function (4 hours)
**Chrome 143+** | **Impact**: HIGH | **Browser Support**: 92%+

### Current State
No dynamic color theming via CSS if() function

### Implementation

**File**: `/src/app.css`

**Step 1**: Add CSS if() support detection
```css
/* Add to :root styles (around line 150) */
@supports (--test: if(true, 1, 2)) {
  /* CSS if() is supported */
  :root {
    --supports-if: true;
  }
}
```

**Step 2**: Implement theme-aware colors
```css
/* Replace current @media (prefers-color-scheme: dark) blocks */

:root {
  /* Set default theme state */
  --is-dark-mode: false;
}

@media (prefers-color-scheme: dark) {
  :root {
    --is-dark-mode: true;
  }
}

/* Use if() for all color properties */
:root {
  --background: if(
    style(--is-dark-mode: true),
    #030712,
    #ffffff
  );

  --text-primary: if(
    style(--is-dark-mode: true),
    #e5e5e5,
    #030712
  );

  --border-color: if(
    style(--is-dark-mode: true),
    oklch(1 0 0 / 0.15),
    oklch(0 0 0 / 0.15)
  );
}

/* Component theming */
.card {
  background: if(
    style(--is-dark-mode: true),
    oklch(0.15 0.02 250),
    oklch(0.98 0.01 250)
  );

  border-color: if(
    style(--is-dark-mode: true),
    oklch(1 0 0 / 0.2),
    oklch(0 0 0 / 0.1)
  );
}
```

**Step 3**: Update component styles
- Find all `@media (prefers-color-scheme: dark)` blocks
- Convert to `if(style(--is-dark-mode: true), darkValue, lightValue)`
- Test in Chrome 143+
- Fallback media queries for older browsers

**File Changes**:
1. `/src/app.css` - ~50 lines modified
2. Component `.svelte` style blocks - ~20 lines each

**Testing**:
```bash
# In Chrome DevTools
// Test CSS if() support
CSS.supports('background', 'if(true, red, blue)')  // Chrome 143+: true
```

**Expected Result**:
- Dynamic theme switching without JavaScript
- ~5KB CSS reduction (consolidated color definitions)
- Instant theme updates on preference change

---

## Priority 2: @scope CSS for Components (6 hours)
**Chrome 118+** | **Impact**: MEDIUM | **Browser Support**: 85%+

### Current State
Component styles use CSS class naming without scope boundaries

### Implementation

**File**: `/src/lib/components/ui/Card.svelte`

**Before**:
```svelte
<style>
  .card {
    /* Styles apply globally */
  }

  .card.highlighted {
    /* Still global scope */
  }

  .card :global(p) {
    /* Forced global workaround */
  }
</style>
```

**After (Chrome 118+)**:
```svelte
<style>
  @scope (.card) to (.card-content) {
    /* Styles only apply within .card until .card-content */
    p {
      color: #666;
    }

    a {
      color: var(--color-primary-600);
    }

    strong {
      font-weight: 600;
    }

    /* :scope refers to .card element */
    :scope {
      display: block;
    }
  }

  /* Fallback for browsers without @scope */
  @supports not (selector(:scope)) {
    .card p {
      color: #666;
    }

    .card a {
      color: var(--color-primary-600);
    }
  }
</style>
```

### Files to Update
1. `/src/lib/components/ui/Card.svelte`
2. `/src/lib/components/ui/Table.svelte`
3. `/src/lib/components/ui/Pagination.svelte`
4. `/src/lib/components/ui/StatCard.svelte`
5. `/src/lib/components/shows/ShowCard.svelte`

**Total Scope Changes**: ~12 components × 10 lines = ~120 lines

**Testing**:
```css
/* Verify scope boundary enforcement */
@scope (.card) to (.excluded) {
  p { color: red; }
}

/* p inside .card but NOT inside .excluded gets red */
/* p inside .excluded doesn't get red */
```

**Expected Result**:
- No CSS specificity conflicts
- ~10KB CSS reduction (elimination of complex selectors)
- Better style maintenance and debugging

---

## Priority 3: CSS Anchor Positioning for Tooltips (8 hours)
**Chrome 125+** | **Impact**: MEDIUM | **Browser Support**: 80%+

### Current State
Tooltips/popovers use JavaScript positioning (Popper.js workarounds)

### Implementation

**File**: `/src/lib/components/ui/Tooltip.svelte` (NEW)

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children?: Snippet;
  };

  let { content, position = 'top', children } = $props();
  let triggerId = Math.random().toString(36);
</script>

<button id={triggerId} class="tooltip-trigger">
  {@render children?.()}
</button>

<div class="tooltip" popover="hint" popovertarget={triggerId}>
  {content}
</div>

<style>
  .tooltip-trigger {
    anchor-name: --tooltip-anchor;
  }

  .tooltip {
    position: fixed;
    position-anchor: --tooltip-anchor;

    /* Position based on prop */
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 0;
    margin-top: 8px;

    /* Auto-flip when near viewport edges */
    position-try-fallbacks: flip-block, flip-inline;
  }

  /* Alternative: Use anchor() for sizing */
  .tooltip {
    max-width: anchor-size(width);
    max-height: clamp(1em, anchor-size(height), 50vh);
  }

  /* Fallback for browsers without anchor positioning */
  @supports not (position-anchor: none) {
    .tooltip {
      position: absolute;
      /* Fallback JavaScript positioning */
    }
  }
</style>
```

**Integration Points**:
1. Replace all Popper.js usage with anchor positioning
2. Update help buttons, info icons
3. Convert dropdown menus to anchor-based positioning

**Files Affected**:
- `/src/lib/components/ui/Tooltip.svelte` (NEW)
- `/src/lib/components/ui/Popover.svelte` (enhanced)
- `/src/routes/+layout.svelte` (remove Popper.js)

**JavaScript Savings**:
- Remove Popper.js (~3KB minified)
- Remove positioning utility functions (~2KB)
- **Total**: 5KB reduction

**Testing**:
```typescript
// Test anchor positioning in Chrome 125+
const supported = CSS.supports('position-anchor', 'none');
console.log('Anchor positioning:', supported);

// Verify auto-flip behavior near viewport edges
```

**Expected Result**:
- Native popover positioning without JavaScript
- Automatic viewport edge detection
- Better performance and smaller bundle

---

## Priority 4: Modern Media Query Ranges (2 hours)
**Chrome 143+** | **Impact**: LOW | **Browser Support**: 90%+

### Current State
Using verbose min-width/max-width syntax

**Before**:
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .container { padding: 2rem; }
}

@media (min-width: 1024px) {
  .sidebar { display: block; }
}
```

**After (Chrome 143+)**:
```css
@media (768px <= width < 1024px) {
  .container { padding: 2rem; }
}

@media (width >= 1024px) {
  .sidebar { display: block; }
}

/* Other range queries */
@media (height > 600px) and (width > 800px) {
  /* Landscape-oriented viewport */
}

@media (400px <= height <= 800px) {
  /* Portrait phone or small tablet */
}

@media (aspect-ratio >= 16/9) {
  /* Widescreen display */
}
```

**Files to Update**:
1. `/src/app.css` - ~30 breakpoint rules
2. Component `.svelte` styles - ~10 rules each

**Effort**:
- Search/replace: `@media (min-width:` → `@media (width >=`
- Search/replace: `@media (max-width:` → `@media (width <`
- Manual testing: 30 min

**Expected Result**:
- ~2KB CSS reduction (shorter syntax)
- Improved readability
- Better IDE support for modern syntax

**Fallback Strategy**:
```css
/* Keep old syntax for browsers <143 */
@supports (min-width: 0) {
  @media (min-width: 768px) and (max-width: 1023px) {
    .container { padding: 2rem; }
  }
}

/* Chrome 143+ uses range syntax */
@media (768px <= width < 1024px) {
  .container { padding: 2rem; }
}
```

---

## Priority 5: Document.activeViewTransition Monitoring (3 hours)
**Chrome 143+** | **Impact**: MEDIUM | **Browser Support**: 98%+ (with fallback)

### Current State
Manual transition state tracking in hooks

### Implementation

**File**: `/src/lib/hooks/viewTransitionNavigation.ts`

**Add to existing file**:
```typescript
/**
 * Monitor active view transition state (Chrome 143+)
 * Replaces manual ViewTransition object tracking
 */
export function useActiveViewTransition() {
  let state = $state<{
    active: boolean;
    phase: 'ready' | 'finished' | 'idle';
  }>({ active: false, phase: 'idle' });

  $effect(() => {
    if (!('activeViewTransition' in document)) {
      return;  // Chrome 143+ only
    }

    const checkTransition = setInterval(() => {
      const vt = (document as any).activeViewTransition;

      if (!vt) {
        state = { active: false, phase: 'idle' };
        return;
      }

      state.active = true;

      vt.ready.then(() => {
        state.phase = 'ready';
        // Pseudo-elements now created, animations starting
      });

      vt.finished.then(() => {
        state.phase = 'finished';
        // All animations complete
      });
    }, 16);  // Check every frame

    return () => clearInterval(checkTransition);
  });

  return state;
}

/**
 * Hook to react to transition ready event
 */
export function onViewTransitionReady(callback: () => void) {
  $effect(() => {
    if (!('activeViewTransition' in document)) return;

    const checkReady = () => {
      const vt = (document as any).activeViewTransition;
      if (vt?.ready) {
        vt.ready.then(callback);
      }
    };

    checkReady();
    window.addEventListener('navigate', checkReady);

    return () => {
      window.removeEventListener('navigate', checkReady);
    };
  });
}

/**
 * Hook to react to transition finished event
 */
export function onViewTransitionFinished(callback: () => void) {
  $effect(() => {
    if (!('activeViewTransition' in document)) return;

    const checkFinished = () => {
      const vt = (document as any).activeViewTransition;
      if (vt?.finished) {
        vt.finished.then(callback);
      }
    };

    checkFinished();
    window.addEventListener('navigate', checkFinished);

    return () => {
      window.removeEventListener('navigate', checkFinished);
    };
  });
}
```

**Usage in Components**:
```svelte
<script>
  import { useActiveViewTransition } from '$lib/hooks/viewTransitionNavigation';

  const transition = useActiveViewTransition();
</script>

{#if transition.active}
  <div class="transition-indicator">
    {#if transition.phase === 'ready'}
      Animating...
    {:else if transition.phase === 'finished'}
      Done!
    {/if}
  </div>
{/if}

<style>
  .transition-indicator {
    position: fixed;
    top: 0;
    right: 0;
    padding: 1rem;
    background: var(--color-primary-500);
    color: white;
  }
</style>
```

**Testing**:
```typescript
// Verify document.activeViewTransition is available
console.log('activeViewTransition' in document);  // Chrome 143+: true

// Monitor during navigation
document.addEventListener('navigate', () => {
  const vt = document.activeViewTransition;
  if (vt) {
    console.log('Transition ready:', vt.ready);
    console.log('Transition finished:', vt.finished);
  }
});
```

**Expected Result**:
- Real-time transition state visibility
- Debug transition timing issues
- Analytics integration ready

---

## Priority 6: Advanced Container Style Queries (5 hours)
**Chrome 126+** | **Impact**: LOW | **Browser Support**: 75%+

### Use Case
Apply different styles based on container's CSS custom properties

**Implementation**:

```css
/* Card container declares custom properties */
.card {
  container-type: inline-size;
  container-name: card;

  /* Consumer of card declares density */
  --card-density: normal;  /* or: compact, spacious */
  --card-theme: light;     /* or: dark, high-contrast */
}

/* Respond to container's custom properties */
@container style(--card-density: compact) {
  .card-title {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .card-content {
    padding: 0.5rem;
  }
}

@container style(--card-density: spacious) {
  .card-title {
    font-size: 1.125rem;
    margin-bottom: 1rem;
  }

  .card-content {
    padding: 1.5rem;
  }
}

/* Theme-aware styles */
@container style(--card-theme: dark) {
  .card {
    background: #1a1a1a;
    color: #ffffff;
  }
}

@container style(--card-theme: high-contrast) {
  .card {
    background: #000000;
    color: #ffff00;
    border: 3px solid #ffff00;
  }
}

/* Fallback for older browsers */
@supports not selector(:style(--test)) {
  .card.compact .card-title {
    font-size: 0.875rem;
  }

  .card.dark {
    background: #1a1a1a;
  }
}
```

**Files to Update**:
1. `/src/lib/components/ui/Card.svelte`
2. `/src/lib/components/ui/StatCard.svelte`
3. Data-heavy components

**Component Usage**:
```svelte
<Card style="--card-density: compact; --card-theme: dark">
  <!-- Content responds to custom properties -->
</Card>
```

**Testing**:
```css
/* Chrome 126+: Can query container style */
@supports selector(:style(--custom: value)) {
  /* Style queries supported */
}
```

---

## Priority 7: Neural Engine (WebNN API) - Experimental (10+ hours)
**Chrome 143+** | **Impact**: HIGH (for discovery) | **Browser Support**: 50%+

### Optional: Song Recommendation Engine

**Use Case**: Recommend songs based on listening patterns (on-device)

**Note**: Lower priority - requires model training/conversion

**Rough Implementation**:
```typescript
// src/lib/ai/recommendations.ts
import * as ort from 'onnxruntime-web';

export async function initRecommendationModel() {
  const session = await ort.InferenceSession.create('models/recommendations.onnx', {
    executionProviders: [
      {
        name: 'webnn',
        deviceType: 'npu',  // Apple Neural Engine
        powerPreference: 'default'
      },
      'webgpu',  // Fallback to GPU
      'wasm'     // Final fallback
    ]
  });

  return session;
}

export async function recommendSongs(
  listeningHistory: string[],
  session: ort.InferenceSession
): Promise<string[]> {
  // Convert history to tensor
  const inputTensor = new ort.Tensor(
    'float32',
    encodeHistory(listeningHistory),
    [1, 128]
  );

  // Run inference
  const results = await session.run({
    input: inputTensor
  });

  // Decode results to song IDs
  return decodePredictions(results);
}
```

**Effort**: 40+ hours (model training/conversion not included)

---

## Implementation Schedule

### Week 1 (16 hours)
- [ ] CSS if() function (4h)
- [ ] Document.activeViewTransition (3h)
- [ ] Modern media query ranges (2h)
- [ ] Testing & polish (7h)

### Week 2 (20 hours)
- [ ] @scope CSS (6h)
- [ ] CSS Anchor positioning (8h)
- [ ] Integration testing (6h)

### Week 3+ (10+ hours)
- [ ] Container style queries (5h)
- [ ] Neural Engine integration (10+h)

**Total Estimated**: 40-60 hours to full Chromium 143+ compliance

---

## Testing Checklist

- [ ] All Chromium 143+ features detected correctly
- [ ] Fallbacks work in Chrome 140-142
- [ ] No regressions in Safari/Firefox
- [ ] Performance metrics unchanged or improved
- [ ] CSS compression verified (<90KB gzipped target)
- [ ] No console errors in DevTools
- [ ] Accessibility maintained (ARIA roles, labels)
- [ ] Mobile testing (iOS Safari, Android Chrome)

---

## Browser Compatibility Matrix

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Speculation Rules | 109+ | 109+ | ❌ | ❌ |
| View Transitions | 111+ | 111+ | ❌ | ❌ |
| Scroll Animations | 115+ | 115+ | ❌ | ❌ |
| Container Queries | 105+ | 105+ | 16+ | 110+ |
| scheduler.yield() | 129+ | 129+ | ❌ | ❌ |
| Navigation API | 102+ | 102+ | ❌ | ❌ |
| oklch, color-mix | 111+ | 111+ | 14.1+ | 124+ |
| CSS if() | 143+ | 143+ | ❌ | ❌ |
| @scope | 118+ | 118+ | ❌ | ❌ |
| Anchor positioning | 125+ | 125+ | ❌ | ❌ |
| Media ranges | 143+ | 143+ | ❌ | ❌ |

---

## Performance Targets After Implementation

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| LCP | 1.0s | 0.8s | More prerendering |
| INP | 45ms | 30ms | Anchor positioning |
| CLS | 0.02 | 0.01 | Reserved space |
| CSS Size | 85KB | 75KB | if(), scopes |
| JS Size | 120KB | 115KB | Remove Popper.js |

---

## Quick Links

- [Chromium 143+ Full Audit](./CHROMIUM_143_COMPREHENSIVE_AUDIT.md)
- [Chrome DevTools View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions)
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Speculation Rules API](https://developer.chrome.com/blog/speculation-rules/)

---

**Last Updated**: January 22, 2026
**Status**: Ready for implementation
