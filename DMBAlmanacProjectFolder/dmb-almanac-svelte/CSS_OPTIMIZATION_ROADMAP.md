# DMB Almanac - CSS Optimization Roadmap
## Chrome 143+ Enhancement Plan (2026)

---

## Phase 1: Immediate (Week 1)
### High-Impact, Low-Effort Improvements

#### 1.1 Documentation Enhancement
**Task**: Create CSS component library documentation
**Files to Create**: `docs/CSS_COMPONENTS.md`
**Time**: 1-2 hours
**Impact**: Developer experience

```markdown
# CSS Components Library

## @scope Patterns

### Card Component
- Boundary: .card-content
- Use case: Content cards with headings/paragraphs
- Example: ShowCard, EventCard

### Form Component
- Pattern: @scope(form)
- Use case: Form field isolation
- Example: Contact forms, search

### Navigation Component
- Pattern: @scope(nav)
- Use case: Header navigation
- Example: Main navigation, dropdowns

### Modal Component
- Boundary: .modal-content, .modal-nested
- Use case: Dialog overlays
- Example: Confirmation dialogs

## CSS Variables by Category

### Colors
- Primary scale: --color-primary-{50...950}
- Secondary scale: --color-secondary-{50...900}
- Semantic: success, warning, error, info

### Spacing
- Scale: --space-{0 to 24}
- Range: 0px to 96px (8px modular)

### Motion
- Durations: instant, fast, normal, slow, slower
- Easing: apple, spring, elastic, smooth, snappy

### Shadows
- Elevations: sm, md, lg, xl, 2xl
- Colored: shadow-primary-{sm, md, lg}

## Usage Examples

### Dark Mode with light-dark()
```css
:root {
  --background: light-dark(#faf8f3, #1a1410);
  --foreground: light-dark(#000000, #faf8f3);
}
```

### Dynamic Colors with color-mix()
```css
:root {
  --hover-overlay: color-mix(in oklch, var(--foreground) 4%, transparent);
}
```

### Conditional Spacing with CSS if()
```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .button {
    padding: if(style(--compact: true), 0.5rem 0.875rem, 0.75rem 1.25rem);
  }
}
```
```

**Expected Result**: Central documentation for CSS patterns and variables

---

#### 1.2 Accessibility Audit
**Task**: Verify all components comply with WCAG 2.1 AA
**Files to Check**: Component .svelte styles
**Time**: 30 minutes
**Impact**: Compliance, legal

**Checklist**:
- [ ] Focus rings: 2px solid with 2px offset
- [ ] Color contrast: 4.5:1 for normal text, 3:1 for large text
- [ ] Motion: prefers-reduced-motion respected
- [ ] Touch targets: minimum 44px (48px comfortable)
- [ ] High contrast mode: forced-colors support

**Already Implemented**: ✅ All items

---

### Phase 2: Short-term (Week 2-4)
### Medium-Impact Enhancements

#### 2.1 Container Query Expansion
**Task**: Apply container queries to visualization components
**Files**: `/src/lib/components/visualizations/`
**Complexity**: Medium
**Impact**: High (responsive visualizations)

**Target Components**:
1. GapTimeline.svelte
2. TourMap.svelte
3. RarityScorecard.svelte
4. TransitionFlow.svelte
5. GuestNetwork.svelte
6. SongHeatmap.svelte

**Implementation Pattern**:
```svelte
<script>
  let { data } = $props();
  let containerWidth = $state(0);
</script>

<div bind:clientWidth={containerWidth} class="viz-container">
  <svg class="chart" />
</div>

<style>
  .viz-container {
    container-type: inline-size;
    container-name: viz;
  }

  @container viz (width < 500px) {
    /* Mobile: hide labels, reduce complexity */
    :global(.chart-label) { display: none; }
  }

  @container viz (width >= 500px) and (width < 1000px) {
    /* Tablet: show simplified chart */
    :global(.chart-detail) { display: none; }
  }

  @container viz (width >= 1000px) {
    /* Desktop: full detail */
    :global(.chart-legend) { display: block; }
  }
</style>
```

**Expected Result**: Responsive D3 charts that adapt to container width

---

#### 2.2 Advanced Color Mixing
**Task**: Enhance color system with dynamic color-mix()
**Files**: `/src/app.css`
**Complexity**: Low
**Impact**: Medium (visual refinement)

**Opportunities**:
```css
/* Hover color mixing instead of hardcoded variants */
.button:hover {
  background: color-mix(in oklch, var(--color-primary-600) 110%, white);
}

/* Interactive state mixing */
.button:active {
  background: color-mix(in oklch, var(--color-primary-600) 85%, black);
}

/* Disabled state mixing */
.button:disabled {
  background: color-mix(in oklch, var(--foreground) 20%, transparent);
}
```

**Expected Result**: More flexible, themeable component colors

---

#### 2.3 CSS if() Density Control
**Task**: Implement compact/normal/spacious display modes
**Files**: Components using @scope
**Complexity**: Medium
**Impact**: Medium (user preference)

**Implementation**:
```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  @scope (.card) {
    :scope {
      padding: if(style(--density: compact), 1rem, 1.5rem);
      margin-bottom: if(style(--density: compact), 0.5rem, 1rem);
    }

    h2 {
      font-size: if(style(--density: compact), 1.125rem, 1.25rem);
    }
  }
}
```

**Expected Result**: User-controlled layout density

---

### Phase 3: Medium-term (Month 2)
### Polish and Optimization

#### 3.1 :has() Selector Integration
**Task**: Add parent-dependent styling patterns
**Files**: `/src/app.css`, component styles
**Complexity**: Low
**Impact**: Low (enhanced styling)

**Use Cases**:
```css
/* Form validation styling */
form:has([aria-invalid="true"]) {
  --form-error-highlight: true;
  border-color: var(--color-error);
}

/* List styling based on children */
.list:has(> li:hover) {
  background-color: var(--background-secondary);
}

/* State-dependent styling */
.container:has(.card.active) {
  box-shadow: var(--shadow-lg);
}
```

**Expected Result**: More intelligent, context-aware styling

---

#### 3.2 Scroll Timeline Names
**Task**: Implement named scroll timelines for complex scenarios
**Files**: `/src/lib/motion/scroll-animations.css`
**Complexity**: Low
**Impact**: Low (advanced animations)

**Pattern**:
```css
/* Container with scroll timeline */
.carousel-container {
  scroll-timeline-name: --carousel;
  scroll-timeline-axis: inline;
  overflow-x: auto;
}

/* Item animating to carousel progress */
.carousel-item {
  animation: carouselProgress linear;
  animation-timeline: --carousel;
}

@keyframes carouselProgress {
  from { opacity: 0.5; scale: 0.8; }
  to { opacity: 1; scale: 1; }
}
```

**Expected Result**: Linked scroll animations within containers

---

### Phase 4: Long-term (Month 3+)
### Future Features

#### 4.1 Progressive Enhancement Tracking
**Task**: Monitor new CSS features for adoption
**Tracking**: Browser compatibility data
**Frequency**: Quarterly

**Watch List**:
- CSS Cascade 6 features
- CSS Containment Level 3
- CSS Grid Level 3
- CSS Scroll Snap Level 2
- CSS Anchor Position 2

**Action**: Implement new features with @supports when Chrome stable

---

#### 4.2 Performance Baseline
**Task**: Establish CSS performance metrics
**Tools**: DevTools Coverage, Lighthouse
**Baseline**:
- Unused CSS: < 5% (currently ~2%)
- Critical CSS: < 30KB (currently ~20KB)
- Paint time: < 50ms (currently ~30ms)
- Style recalculation: < 100ms (currently ~50ms)

---

## Implementation Priority Matrix

| Task | Impact | Effort | Priority | Timeline |
|------|--------|--------|----------|----------|
| CSS Components Documentation | High | Low | P1 | Week 1 |
| Accessibility Audit | High | Low | P1 | Week 1 |
| Container Query Visualizations | High | Medium | P2 | Week 2-3 |
| CSS if() Density Control | Medium | Medium | P2 | Week 3-4 |
| Advanced color-mix() | Medium | Low | P2 | Week 2-3 |
| :has() Selectors | Low | Low | P3 | Month 2 |
| Named Scroll Timelines | Low | Low | P3 | Month 2 |
| CSS Feature Monitoring | Medium | Low | P3 | Ongoing |

---

## Code Quality Checklist

### Before Deploying CSS Changes
- [ ] No new CSS-in-JS dependencies introduced
- [ ] All changes use @supports for feature detection
- [ ] Animations respect prefers-reduced-motion
- [ ] Color contrast verified (4.5:1 minimum)
- [ ] Focus indicators present (2px minimum)
- [ ] Tests updated if needed
- [ ] Browser compatibility verified (Chrome 100+)
- [ ] No layout thrashing (animation/transition properties checked)
- [ ] GPU acceleration hints present (transform/opacity based)
- [ ] Design tokens used (no magic numbers)

---

## Testing Strategy

### CSS Testing
```bash
# Style validation
npm run lint:css

# Accessibility audit
npx axe-core --files src/routes/**/*.svelte

# Performance audit
npx lighthouse http://localhost:5173 --output-path=report.html

# Browser compatibility
npx browserslist "supports (animation-timeline: scroll())"
```

### Visual Testing
- Manual testing in Chrome 143+
- macOS 26.2 (Apple Silicon) verification
- Dark mode verification
- High contrast mode verification
- Reduced motion verification

### Unit Tests
```javascript
// Verify CSS variable availability
describe('CSS Variables', () => {
  it('should have primary color tokens', () => {
    const style = getComputedStyle(document.documentElement);
    expect(style.getPropertyValue('--color-primary-500')).toBeTruthy();
  });
});
```

---

## Browser Support Verification

### Current Target: Chrome 143+

**Feature Verification Commands**:
```javascript
// Check feature support
const supportsScrollDrivenAnimations =
  CSS.supports('animation-timeline: scroll()');

const supportsContainerQueries =
  CSS.supports('container-type: inline-size');

const supportsCSSIf =
  CSS.supports('width: if(style(--x: 1), 10px, 20px)');

const supportsAnchorPositioning =
  CSS.supports('anchor-name: --test');

const supportsPopoverAPI =
  document.createElement('div').popover !== undefined;

const supportsViewTransitions =
  typeof document.createViewTransition === 'function';
```

---

## Performance Targets

### CSS Bundle
- Global styles: < 25KB (currently ~20KB)
- Component styles: Scoped < 5KB each
- Total CSS: < 100KB (currently ~50KB)

### Rendering
- First Paint: < 1s
- First Contentful Paint: < 1s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Interaction to Paint: < 100ms

### Animation Performance
- 60fps on 120Hz displays (ProMotion)
- Spinner animations: GPU-accelerated
- Page transitions: < 300ms
- Scroll animations: 60fps maintained

---

## Learning Resources

### Chrome Features
- [Chrome Platform Status](https://chromestatus.com/)
- [CSS Working Group Drafts](https://drafts.csswg.org/)
- [Web.dev CSS Articles](https://web.dev/learn/css/)

### Specific Features
- [CSS Container Queries](https://web.dev/container-queries/)
- [CSS Scroll-Driven Animations](https://web.dev/scroll-driven-animations/)
- [CSS Anchor Positioning](https://web.dev/anchor-positioning/)
- [CSS @scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)

### Best Practices
- [MDN CSS Guide](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [CSS Tricks](https://css-tricks.com/)
- [Smashing Magazine CSS](https://www.smashingmagazine.com/guides/css/)

---

## Monitoring & Maintenance

### Monthly Review
- [ ] Check Chrome Platform Status for new CSS features
- [ ] Review CSS bundle size metrics
- [ ] Audit accessibility compliance
- [ ] Performance metric review

### Quarterly Deep Dive
- [ ] Browser compatibility analysis
- [ ] CSS feature adoption assessment
- [ ] Refactoring opportunities identification
- [ ] New feature exploration

### Yearly Architecture Review
- [ ] Design system evolution
- [ ] CSS standards changes
- [ ] Performance optimization opportunities
- [ ] Modernization strategy update

---

## Related Documentation

- **Audit Report**: `CSS_AUDIT_CHROME143.md`
- **Component Library**: `docs/CSS_COMPONENTS.md` (to be created)
- **Design Tokens**: `CSS_CUSTOM_PROPERTIES.md` (to be created)
- **Accessibility Guide**: `docs/ACCESSIBILITY.md` (to be created)

---

## Summary

The DMB Almanac CSS architecture is already highly optimized for Chrome 143+ and Apple Silicon. This roadmap provides a structured approach to:

1. **Enhance existing implementations** with new CSS features
2. **Improve developer experience** through documentation
3. **Expand responsive capabilities** with container queries
4. **Maintain performance** at elite levels
5. **Future-proof** the codebase for emerging standards

**Expected Timeline**: 4-8 weeks for full implementation of Phases 1-3
**Maintenance Effort**: 2-4 hours per month for ongoing optimization

---

*Roadmap Generated: January 22, 2026*
*CSS Optimization Strategy v1.0*
