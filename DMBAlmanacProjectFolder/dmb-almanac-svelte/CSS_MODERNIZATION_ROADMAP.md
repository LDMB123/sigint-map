# CSS Modernization Roadmap - Tactical Implementation Guide

**DMB Almanac Svelte | Chrome 143+ Features**
**Prepared:** January 21, 2026
**Target Completion:** Q3 2026

---

## Quick Reference: What To Do When

### Today (Q1 2026)
- ✅ Current CSS is production-ready
- Monitor Chrome 143 adoption in analytics
- No breaking changes needed

### Q2 2026 (High Priority)
1. Implement @scope in 5 components (2-3 days effort)
2. Add anchor positioning for tooltips/popovers (3-4 days effort)
3. Reduce container query/media query duplication

### Q3 2026 (After Chrome 143 > 50% adoption)
1. Implement CSS if() in design tokens
2. Migrate theme-switching to if() conditions
3. Simplify button/card variant logic

### Q4 2026+ (Research/Refinement)
1. Evaluate Tailwind v4 @theme directive adoption
2. Extract design token documentation
3. Performance benchmarking with new CSS features

---

## Phase 1: @scope Implementation (Q2 2026)

### Why @scope?
- **Removes `:global()` workarounds** (cleaner scoped styles)
- **Prevents style leakage** across components
- **Simplifies child selectors** in containers
- **Better component encapsulation** than BEM

### Target Components: 5 Files

#### 1. Button.svelte - HIGH PRIORITY

**Current:** `/src/lib/components/ui/Button.svelte` (lines 73-424)

**Before:**
```css
.button { /* base */ }
.button:hover { /* pseudo */ }
.button.primary { /* variant */ }
.spinnerIcon { /* child */ }
.content { /* child */ }

@media (forced-colors: active) {
  .button:focus-visible { }
}
```

**After (with @scope):**
```css
@scope (.button) {
  :scope {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    /* ... all base styles ... */
  }

  &:hover:not(:disabled) {
    transform: translate3d(0, -1px, 0);
  }

  &.primary {
    background: linear-gradient(
      to bottom,
      var(--color-primary-500),
      var(--color-primary-600)
    );
    color: white;

    &:hover:not(:disabled) {
      background: linear-gradient(
        to bottom,
        var(--color-primary-600),
        var(--color-primary-700)
      );
    }
  }

  .spinner {
    position: absolute;
    top: 50%;
    left: 50%;
  }

  .spinnerIcon {
    width: 1.2em;
    height: 1.2em;
    animation: spin 0.7s linear infinite;
  }

  @media (forced-colors: active) {
    &:focus-visible {
      outline: 2px solid Highlight;
      box-shadow: none;
    }

    :scope {
      border: 2px solid CanvasText;
    }
  }
}
```

**Implementation Checklist:**
- [ ] Wrap entire `.button { }` block in `@scope (.button) {`
- [ ] Replace `.button` with `:scope` for top-level styles
- [ ] Change `.spinnerIcon` to just `.spinnerIcon` (scoped)
- [ ] Update media queries inside scope
- [ ] Test in Chrome 118+
- [ ] Verify old browsers ignore @scope gracefully

**Time Estimate:** 1 hour

---

#### 2. Card.svelte - MEDIUM PRIORITY

**Current:** `/src/lib/components/ui/Card.svelte` (lines 28-305)

**Bonus: Consolidate Container + Media Queries**

```css
@scope (.card) {
  :scope {
    background-color: var(--background);
    border-radius: var(--radius-2xl);
    container-type: inline-size;
    container-name: card;
  }

  &.default {
    border: 1px solid var(--border-color);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--background) 97%, var(--color-gray-100))
    );
  }

  &[data-interactive="true"] {
    cursor: pointer;
    transition: transform 250ms var(--ease-spring);

    &:hover {
      transform: translate3d(0, -4px, 0);
      box-shadow: var(--shadow-md), var(--glow-primary-subtle);
    }

    &:focus-within {
      outline: 2px solid var(--color-primary-500);
    }
  }

  /* Container-first approach: no need for media fallback */
  @supports (container-type: inline-size) {
    @container card (max-width: 280px) {
      :global(.header) {
        gap: var(--space-0);
        margin-bottom: var(--space-2);
      }

      :global(.title) {
        font-size: var(--text-sm);
      }
    }

    @container card (min-width: 281px) and (max-width: 400px) {
      :global(.title) {
        font-size: var(--text-base);
      }
    }

    @container card (min-width: 401px) {
      :global(.title) {
        font-size: var(--text-lg);
      }
    }
  }

  /* Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 320px) {
      :global(.title) {
        font-size: var(--text-sm);
      }
    }
  }
}
```

**Key Change:** Move `container-type: inline-size` inside @scope `:scope` block

**Time Estimate:** 1.5 hours

---

#### 3. Pagination.svelte - LOW PRIORITY

**Current:** `/src/lib/components/ui/Pagination.svelte`

**Apply:** Same @scope wrapping pattern as Button

**Time Estimate:** 0.75 hours

---

#### 4. Header.svelte - MEDIUM PRIORITY

**Current:** `/src/lib/components/navigation/Header.svelte`

**Scope Target:** `.header` container

```css
@scope (.header) {
  :scope {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur-strong);
  }

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);

    &:hover {
      transform: scale(1.02);
    }
  }

  /* Scroll progress bar */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--color-primary-500), var(--color-accent-cyan));
    animation: scrollProgress linear both;
    animation-timeline: scroll(root);
  }

  @media (prefers-color-scheme: dark) {
    :scope {
      background: var(--glass-bg-strong);
    }
  }
}
```

**Time Estimate:** 1.5 hours

---

#### 5. EmptyState.svelte - LOW PRIORITY

**Current:** `/src/lib/components/ui/EmptyState.svelte`

**Apply:** Same @scope wrapping pattern

**Time Estimate:** 0.5 hours

---

### @scope Implementation Timeline

| Component | Priority | Effort | Week |
|-----------|----------|--------|------|
| Button.svelte | HIGH | 1h | 1 |
| Card.svelte | HIGH | 1.5h | 1 |
| Header.svelte | MEDIUM | 1.5h | 2 |
| Pagination.svelte | MEDIUM | 0.75h | 2 |
| EmptyState.svelte | LOW | 0.5h | 3 |
| **Total** | - | **5.25h** | **3 weeks** |

---

## Phase 2: Anchor Positioning (Q2 2026)

### Why Anchor Positioning?
- **Automatic tooltip positioning** (no JS needed)
- **Smart fallback positioning** (flip-block, flip-inline)
- **Viewport-aware placement** (no clipping)
- **Zero JavaScript for common patterns**

### New Components Required: 2

#### 1. Tooltip.svelte - NEW COMPONENT

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface TooltipProps {
    content: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    children?: Snippet;
  }

  let { content, side = 'top', delay = 200, children } = $props();
  let isVisible = $state(false);

  let triggerElement = $state<HTMLElement | null>(null);
</script>

<div
  class="tooltip-trigger"
  bind:this={triggerElement}
  role="button"
  aria-describedby="tooltip-content"
  on:mouseenter={() => {
    setTimeout(() => (isVisible = true), delay);
  }}
  on:mouseleave={() => {
    isVisible = false;
  }}
  on:focus={() => {
    isVisible = true;
  }}
  on:blur={() => {
    isVisible = false;
  }}
>
  {@render children?.()}
</div>

{#if isVisible}
  <div
    id="tooltip-content"
    class="tooltip {side}"
    role="tooltip"
    anchor-name="--trigger"
  >
    {content}
  </div>
{/if}

<style>
  /* Anchor the trigger */
  .tooltip-trigger {
    anchor-name: --trigger;
  }

  /* Position tooltip relative to anchor */
  .tooltip {
    position: absolute;
    position-anchor: --trigger;

    /* Default: top position */
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 0;

    /* Smart fallback positioning */
    position-try-fallbacks: flip-block;

    /* Styling */
    padding: var(--space-2) var(--space-3);
    background: var(--color-gray-900);
    color: white;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    white-space: nowrap;
    box-shadow: var(--shadow-lg);
    z-index: var(--z-tooltip);

    /* Animation */
    animation: tooltipFade 150ms var(--ease-out);
  }

  /* Bottom positioning variant */
  .tooltip.bottom {
    top: anchor(top);
    translate: -50% 0.5rem;
  }

  /* Left positioning variant */
  .tooltip.left {
    left: anchor(left);
    top: anchor(center);
    translate: -0.5rem -50%;
  }

  /* Right positioning variant */
  .tooltip.right {
    left: anchor(right);
    top: anchor(center);
    translate: 0.5rem -50%;
  }

  @keyframes tooltipFade {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Fallback for browsers without anchor positioning */
  @supports not (position-anchor: --trigger) {
    .tooltip {
      position: fixed;
      transform: translateY(8px);
      /* Fallback positioning via JavaScript */
    }
  }
</style>
```

**Features:**
- ✅ Anchor-based positioning
- ✅ Smart fallback (flip-block)
- ✅ Multiple side variants
- ✅ Grace fallback for older browsers
- ✅ Zero JavaScript for position calculation

**Time Estimate:** 4 hours (including testing)

---

#### 2. Popover.svelte - NEW COMPONENT

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface PopoverProps {
    trigger?: Snippet;
    content?: Snippet;
  }

  let { trigger, content } = $props();
  let popoverElement = $state<HTMLDivElement | null>(null);
  let isOpen = $state(false);

  function togglePopover() {
    isOpen = !isOpen;
  }
</script>

<div class="popover-container" bind:this={popoverElement}>
  <div
    class="popover-trigger"
    anchor-name="--popover-trigger"
    on:click={togglePopover}
    role="button"
  >
    {@render trigger?.()}
  </div>

  {#if isOpen}
    <div
      class="popover-content"
      position-anchor="--popover-trigger"
      on:click={() => {
        isOpen = false;
      }}
    >
      {@render content?.()}
    </div>
  {/if}
</div>

<style>
  .popover-trigger {
    anchor-name: --popover-trigger;
    cursor: pointer;
  }

  .popover-content {
    position: absolute;
    position-anchor: --popover-trigger;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 0.5rem;

    /* Smart fallback positioning */
    position-try-fallbacks: flip-block;

    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-popover);
    max-width: 300px;

    animation: popoverFade 150ms var(--ease-out);
  }

  @keyframes popoverFade {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @supports not (position-anchor: --popover-trigger) {
    .popover-content {
      position: fixed;
      /* Fallback positioning via JavaScript */
    }
  }
</style>
```

**Time Estimate:** 3 hours

---

### Anchor Positioning Implementation Timeline

| Component | Priority | Effort | Timeline |
|-----------|----------|--------|----------|
| Tooltip.svelte | HIGH | 4h | Week 1 |
| Popover.svelte | MEDIUM | 3h | Week 2 |
| Testing & Fallback | - | 2h | Week 2 |
| **Total** | - | **9h** | **2 weeks** |

---

## Phase 3: CSS if() Implementation (Q3 2026)

### Prerequisites
- Chrome 143 > 50% adoption in analytics
- @scope implementation complete
- Anchor positioning complete

### Target: Design Token Conditionals

#### Before (Static Tokens):
```css
:root {
  --button-padding-sm: var(--space-1) var(--space-3);
  --button-padding-md: var(--space-2) var(--space-4);
  --button-padding-lg: var(--space-3) var(--space-6);
}

.button.sm {
  padding: var(--button-padding-sm);
}
```

#### After (With CSS if()):
```css
:root {
  --size: md; /* Set by JavaScript or data attribute */
}

.button {
  padding: if(
    style(--size: lg): var(--space-3) var(--space-6);
    style(--size: sm): var(--space-1) var(--space-3);
    var(--space-2) var(--space-4)
  );
}
```

### Implementation Candidates

#### 1. Button Variants
```css
.button {
  padding: if(
    style(--variant: lg): 1rem 2rem;
    style(--variant: sm): 0.25rem 0.5rem;
    0.5rem 1rem
  );

  font-size: if(
    style(--variant: lg): var(--text-base);
    style(--variant: sm): var(--text-sm);
    var(--text-sm)
  );
}
```

#### 2. Responsive Spacing
```css
.component {
  margin: if(
    media(width >= 768px): var(--space-8);
    var(--space-4)
  );

  padding: if(
    media(width >= 1024px): var(--space-6) var(--space-12);
    var(--space-4) var(--space-6)
  );
}
```

#### 3. Motion Preferences
```css
.element {
  transition-duration: if(
    style(prefers-reduced-motion): 0.01ms;
    0.3s
  );
}
```

### Implementation Timeline

| Task | Effort | Timeline |
|------|--------|----------|
| Audit button/card variants | 2h | Week 1 |
| Migrate padding tokens | 3h | Week 1 |
| Migrate color tokens | 2h | Week 2 |
| Migrate motion tokens | 1h | Week 2 |
| Testing & documentation | 2h | Week 3 |
| **Total** | **10h** | **3 weeks** |

---

## Monitoring & Analytics

### Adoption Tracking Dashboard

Create `/scripts/css-features-monitor.js`:

```javascript
/**
 * Monitor Chrome 143+ CSS feature adoption in user base
 * Run periodically to track readiness for new features
 */

const featureSupport = {
  cssIf: CSS.supports('width: if(1, 1px, 2px)'),
  cssScope: CSS.supports('@scope (.test) {}'),
  animationTimeline: CSS.supports('animation-timeline: scroll()'),
  anchorPositioning: CSS.supports('position-anchor: --anchor'),
  containerQueries: CSS.supports('container-type: inline-size'),
  lightDark: CSS.supports('color: light-dark(white, black)'),
  oklch: CSS.supports('color: oklch(0.5 0.1 0)'),
  colorMix: CSS.supports('color: color-mix(in oklch, red, blue)'),
  viewTransitions: CSS.supports('view-transition-name: test')
};

// Log to analytics
if (window.gtag) {
  Object.entries(featureSupport).forEach(([feature, supported]) => {
    gtag('event', 'css_feature_support', {
      feature,
      supported,
      userAgent: navigator.userAgent
    });
  });
}

// Store in localStorage for debugging
localStorage.setItem('cssFeatureSupport', JSON.stringify(featureSupport));

console.log('CSS Feature Support:', featureSupport);
```

### Adoption Metrics to Track

| Feature | Current | Q2 Target | Q3 Target |
|---------|---------|-----------|-----------|
| Chrome 143 | ~0% | 30% | 60%+ |
| Chrome 125 (Anchor) | ~40% | 70% | 85%+ |
| Chrome 118 (@scope) | ~70% | 85% | 95%+ |
| Chrome 115 (Scroll-Driven) | ~85% | 90% | 98%+ |

**Decision Point:** Implement feature when adoption > 50% in your analytics

---

## Risk Management

### Backwards Compatibility

All new features protected by @supports:

```css
/* Feature available */
@supports (animation-timeline: scroll()) {
  .element {
    animation-timeline: scroll(root);
  }
}

/* Fallback for older browsers */
@supports not (animation-timeline: scroll()) {
  /* Alternative implementation or graceful degradation */
  .element {
    /* static styles */
  }
}
```

### Testing Strategy

1. **Unit Tests**
   - Verify CSS parses in target browsers
   - Check @supports detection works

2. **Integration Tests**
   - Test component behavior in Chrome 143
   - Test fallback in Chrome 140

3. **E2E Tests**
   - Visual regression tests
   - Performance benchmarks

4. **Real User Monitoring**
   - Monitor error rates after deployment
   - Track performance metrics
   - Collect CSS feature adoption

---

## Cost-Benefit Analysis

### Phase 1: @scope (5-6 hours)
**Benefits:**
- Cleaner, more maintainable CSS
- Better component encapsulation
- No runtime cost
- **ROI:** High (code quality, maintenance)

**Risk:** Low (pure CSS enhancement)

### Phase 2: Anchor Positioning (9 hours)
**Benefits:**
- Eliminates tooltip positioning JavaScript
- Smart fallback positioning
- ~200KB bundle size reduction (no popper.js)
- Better accessibility
- **ROI:** High (performance + DX)

**Risk:** Low (protected by @supports)

### Phase 3: CSS if() (10 hours)
**Benefits:**
- Simplify design token logic
- Reduce CSS duplication
- Better responsive design
- **ROI:** Medium (code simplification)

**Risk:** Low (Chrome 143+ only, after adoption)

---

## Checklist: Q2 2026 Readiness

### Pre-Implementation
- [ ] Review current CSS architecture
- [ ] Create feature branch: `feat/css-modernization`
- [ ] Document current color/spacing tokens
- [ ] Set up CSS feature detection monitoring

### @scope Implementation
- [ ] Create @scope wrapper template
- [ ] Refactor Button.svelte
- [ ] Refactor Card.svelte
- [ ] Refactor Header.svelte
- [ ] Test in Chrome 118+
- [ ] Test fallback in Chrome 100
- [ ] Update documentation

### Anchor Positioning
- [ ] Create Tooltip.svelte component
- [ ] Create Popover.svelte component
- [ ] Implement fallback positioning
- [ ] Integration with existing components
- [ ] Test in Chrome 125+
- [ ] Performance benchmarks
- [ ] Documentation

### Testing & QA
- [ ] Cross-browser testing (Chrome, Edge, Firefox, Safari)
- [ ] Accessibility testing (WCAG 2.1 AA)
- [ ] Performance testing (Lighthouse)
- [ ] Real user monitoring setup
- [ ] Rollout strategy (gradual, A/B testing)

### Documentation
- [ ] Update CSS Features Guide
- [ ] Create @scope usage examples
- [ ] Create Anchor Positioning examples
- [ ] Update contribution guidelines
- [ ] Create migration guide for team

---

## Success Criteria

| Metric | Target | Method |
|--------|--------|--------|
| @scope adoption | 100% of target components | Code review |
| Test coverage | >95% | Jest/Vitest |
| Performance | Maintain <1.0s LCP | Lighthouse |
| Accessibility | WCAG 2.1 AA | axe DevTools |
| Browser compatibility | Chrome 100+ fallback | BrowserStack |
| User adoption | No bug reports in Q2 | Error tracking |
| Code maintainability | <15% CSS lines | Code metrics |

---

## Questions & Escalation

### When to escalate implementation?
1. Browser compatibility issues
2. Performance regressions
3. Accessibility concerns
4. User feedback indicating problems

### Resources
- MDN Web Docs (CSS Features)
- W3C Specifications
- Chrome Platform Status
- Can I Use (browser support)

---

## Next Steps

1. **This Month (January 2026)**
   - Review this roadmap with team
   - Validate priority order
   - Create GitHub issues for Q2 work

2. **February 2026**
   - Begin @scope implementation
   - Monitor Chrome 143 adoption
   - Set up CSS feature detection

3. **March 2026**
   - Complete @scope implementation
   - Begin anchor positioning work
   - Finalize Q2 deliverables

4. **April-June 2026**
   - Ship @scope changes
   - Ship anchor positioning
   - Gather team feedback

5. **July 2026**
   - Evaluate CSS if() readiness
   - Plan Q3 implementation
   - Update documentation

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-21 | Initial roadmap | CSS Modern Specialist |
| - | - | - | - |

---

**Questions? Create an issue or discussion in the project repository.**
