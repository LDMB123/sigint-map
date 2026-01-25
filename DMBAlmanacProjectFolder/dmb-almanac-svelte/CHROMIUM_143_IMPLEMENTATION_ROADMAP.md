# Chromium 143+ Implementation Roadmap

Strategic implementation plan for Chrome 143+ features in DMB Almanac.

---

## Feature Adoption Status

| Feature | Status | Effort | Impact | Priority |
|---------|--------|--------|--------|----------|
| View Transitions | ✅ Active | 0h | ⭐⭐⭐⭐⭐ | Done |
| Speculation Rules | ✅ Active | 0h | ⭐⭐⭐⭐⭐ | Done |
| Navigation API | ✅ Active | 0h | ⭐⭐⭐⭐ | Done |
| Popover API | ✅ Active | 0h | ⭐⭐⭐⭐ | Done |
| **Scroll-Driven Animations** | ⚠️ Ready | **2h** | **⭐⭐⭐⭐** | **SPRINT 1** |
| **Container Queries** | ⚠️ Ready | **4h** | **⭐⭐⭐⭐** | **SPRINT 1** |
| **scheduler.yield()** | ⚠️ Ready | **6h** | **⭐⭐⭐⭐⭐** | **SPRINT 1** |
| Anchor Positioning | ⚠️ Ready | 6h | ⭐⭐⭐⭐ | Sprint 2 |
| CSS if() Theme | ⚠️ Ready | 3h | ⭐⭐⭐ | Sprint 2 |
| Media Query Ranges | ✅ Active | 0h | ⭐⭐⭐⭐ | Done |
| @scope Rules | ✅ Active | 0h | ⭐⭐⭐⭐ | Done |
| CSS Nesting | ✅ Active | 0h | ⭐⭐⭐⭐ | Done |

---

## Sprint 1: High-Impact Quick Wins (Week 1-2)

### Goal
Activate prepared CSS features with minimal component changes.

### Task 1.1: Scroll-Driven Animations (2h)
**Files**: Show cards, Song list, Venue cards
**Change**: Add `.animate-on-scroll` class
**Impact**: Better UX, zero JS overhead

**Locations**:
- `/src/routes/shows/+page.svelte` - Show listings
- `/src/routes/songs/+page.svelte` - Song listings
- `/src/routes/venues/+page.svelte` - Venue listings

### Task 1.2: Container Queries on Stats (4h)
**Files**: Statistics components
**Change**: Wrap in `card-container`, add @container rules
**Impact**: Responsive without JS, smaller CSS

**Locations**:
- `/src/routes/stats/` - Statistics panels
- `/src/lib/components/` - Stat card components

### Task 1.3: scheduler.yield() in Search (6h)
**Files**: Search result rendering
**Change**: Use `processInChunks()` for incremental rendering
**Impact**: INP improvement from 150ms to 45ms (70% better)

**Locations**:
- `/src/routes/search/` - Search page
- `/src/lib/components/search/` - Result components

### Testing Requirements
```
✅ Scroll animations work on desktop + mobile + tablet
✅ Container queries reflow correctly at breakpoints
✅ Search with 1000+ results stays responsive
✅ INP measured at <100ms with 100-result search
✅ No console errors or warnings
✅ All browsers: Chrome 143+, Safari 18+, Firefox 126+
```

---

## Sprint 2: Medium Effort Wins (Week 3-4)

### Task 2.1: Anchor Positioning for Tooltips (6h)
**Files**: Visualization tooltips, Popover components
**Change**: Replace JS positioning with CSS anchor-name/position-anchor
**Impact**: Eliminates ~200 lines of code, 10-15ms faster

**Locations**:
- `/src/lib/components/visualizations/` - D3 tooltips
- `/src/lib/components/popover/` - Popover components

### Task 2.2: CSS if() for Theme Toggle (3h)
**Files**: Settings panel, Layout
**Change**: Add settings UI for `--use-compact-spacing`, persist to localStorage
**Impact**: Native theme switching, no layout recalculation

**Locations**:
- Create `/src/routes/settings/` - Settings page
- Modify `/src/routes/+layout.svelte` - Initialize compact mode

### Task 2.3: LoAF Monitoring for INP (2h)
**Files**: Performance monitoring
**Change**: Add Long Animation Frames tracking
**Impact**: Data-driven optimization decisions

**Locations**:
- Create `/src/lib/utils/performanceMonitoring.ts`
- Add to `/src/routes/+layout.svelte`

### Testing Requirements
```
✅ Tooltips auto-position above/below/left/right
✅ Tooltips auto-flip when near viewport edge
✅ Compact mode persists across page reloads
✅ LoAF console logs show >50ms operations
✅ All features have graceful fallbacks
✅ No performance regressions in existing features
```

---

## Sprint 3: Strategic Improvements (Week 5-6)

### Task 3.1: Adopt Scroll Timeline for Adaptive Header (3h)
**Files**: Header component
**Change**: Use scroll-driven animation to shrink header as user scrolls
**Impact**: Apple-style adaptive header, elegant UX

### Task 3.2: CSS @scope for Component Isolation (4h)
**Files**: All component styles
**Change**: Migrate BEM conventions to @scope rules
**Impact**: Prevents style leakage, cleaner CSS

### Task 3.3: Container Style Queries (3h)
**Files**: Data visualization components
**Change**: Use style-based container queries for theme/layout variants
**Impact**: Dynamic component behavior based on container properties

---

## Chromium 143 Specific Optimizations

### document.activeViewTransition Property
**Available**: Chrome 143+
**Use**: Coordinate animations with view transitions
**Location**: `/src/lib/utils/viewTransitions.ts` already detects

### Connection-Aware Prerendering
**Available**: Chrome 143+ (via Speculation Rules)
**Use**: Adjust prerendering eagerness based on connection speed
**Status**: Already implemented in `createConnectionAwareRules()`

### Navigation State Tracking
**Available**: Chrome 102+ (Navigation API)
**Use**: Persistent history stack with localStorage fallback
**Status**: Already implemented in `navigationApi.ts`

---

## Performance Targets (Chrome 143, Apple Silicon)

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| LCP | 0.9s | <0.8s | Speculation Rules (active) |
| INP | 120ms | <100ms | scheduler.yield() (Sprint 1) |
| CLS | 0.05 | <0.02 | View Transitions (active) |
| TTFB | 400ms | 350ms | Server optimization |

---

## Implementation Checklist

### Before Sprint 1
- [ ] Read `/CHROMIUM_143_FEATURE_AUDIT.md`
- [ ] Review each feature's browser support
- [ ] Set up performance monitoring baseline
- [ ] Create feature branch: `feat/chromium-143-quick-wins`

### During Sprint 1
- [ ] Activate scroll-driven animations
- [ ] Add container queries to stats
- [ ] Implement scheduler.yield() in search
- [ ] Test on Chrome 143, Safari 18, Firefox 126
- [ ] Measure performance improvements

### After Sprint 1
- [ ] PR review with performance metrics
- [ ] User testing for UX improvements
- [ ] Analytics review (INP, LCP, CLS)
- [ ] Merge to main branch

### Before Sprint 2
- [ ] Plan anchor positioning migration
- [ ] Audit tooltips and popovers
- [ ] Design settings UI for compact mode
- [ ] Set up LoAF monitoring alerts

---

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `/src/lib/utils/viewTransitions.ts` | View Transitions API | ✅ Complete |
| `/src/lib/utils/speculationRules.ts` | Speculation Rules API | ✅ Complete |
| `/src/lib/utils/scheduler.ts` | scheduler.yield() utilities | ✅ Ready to use |
| `/src/lib/utils/navigationApi.ts` | Navigation API | ✅ Complete |
| `/src/lib/utils/popover.ts` | Popover API | ✅ Complete |
| `/src/app.css` | All CSS features | ✅ Framework ready |
| `/src/routes/+layout.svelte` | Layout initialization | ✅ Hooks ready |

---

## Browser Support Matrix

| Feature | Chrome | Safari | Firefox | IE | Notes |
|---------|--------|--------|---------|----|----|
| View Transitions | 111+ | 18+ | 126+ | ✗ | View transition fallback: none |
| Speculation Rules | 109+ | 17.2+ | 128+ | ✗ | Fallback: JS prefetch |
| scheduler.yield() | 129+ | — | — | ✗ | Fallback: setTimeout(0) |
| Navigation API | 102+ | 17+ | — | ✗ | Fallback: History API |
| Popover API | 114+ | 17.4+ | 125+ | ✗ | Fallback: JS modal |
| Anchor Positioning | 125+ | — | — | ✗ | Fallback: JS positioning |
| Container Queries | 105+ | 16+ | — | ✗ | Fallback: Media queries |
| Scroll-Driven Animations | 115+ | — | — | ✗ | Fallback: Static display |
| Media Query Ranges | 104+ | 17+ | 121+ | ✗ | Fallback: min/max syntax |
| CSS if() | 143+ | — | — | ✗ | Fallback: Fixed values |
| @scope | 118+ | 17.2+ | — | ✗ | Fallback: BEM naming |
| CSS Nesting | 120+ | 17.2+ | — | ✗ | Fallback: Preprocessor |

---

## Success Metrics

### Sprint 1 Completion
- [ ] INP improved from 120ms to <100ms (based on scheduler.yield())
- [ ] LCP maintained at <0.9s (no regression from scroll animations)
- [ ] CLS remains <0.05 (view transitions active)
- [ ] 100% scroll animation coverage on list pages
- [ ] 100% container query adoption on responsive components

### Sprint 2 Completion
- [ ] 0 lines of JavaScript tooltip positioning code
- [ ] Compact mode toggle saves to localStorage
- [ ] LoAF monitoring captures 100% of >50ms operations
- [ ] Analytics dashboard shows 20% reduction in INP outliers

### Overall
- [ ] Chromium 143 adoption score: 90+/100
- [ ] Zero performance regressions
- [ ] All features tested on target platform (M1+ Mac, Chrome 143+)
- [ ] Complete documentation in `/docs/chromium-143/`

---

## Questions & Escalations

### Feature Not Working?
1. Check browser support on caniuse.com
2. Verify Chrome version 143+
3. Check DevTools for console errors
4. Review `/CHROMIUM_143_FEATURE_AUDIT.md` section

### Performance Not Improving?
1. Measure baseline metrics before changes
2. Profile with Chrome DevTools Performance tab
3. Check for scheduler.yield() duration (<5ms chunks)
4. Use Lighthouse for CWV audit

### Rollback Procedure?
All features have independent rollback:
1. Revert CSS class additions
2. Remove @container rules
3. Remove async/await scheduler code
4. No database or API changes needed

---

**Next Steps**: Start Sprint 1 with scroll-driven animations (2h, low risk, high visibility).

Refer to `/CHROMIUM_143_FEATURE_AUDIT.md` for comprehensive feature documentation.
