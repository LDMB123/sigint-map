# CSS Modernization Checklist
## DMB Almanac Svelte - Chrome 143+ Features Migration

**Status:** Ready for Implementation
**Priority:** High
**Effort:** Medium (2-4 weeks)

---

## Phase 1: Preparation (Week 1)

### Documentation & Planning
- [ ] Read CSS Modernization Audit Report
- [ ] Review Chrome 143+ CSS Features Guide
- [ ] Review Implementation Guide
- [ ] Create feature branch: `feat/css-modernization`

### Setup & Testing Infrastructure
- [ ] Add CSS Feature Detection to app.css
- [ ] Create test file for CSS features: `/src/lib/__tests__/css-features.test.ts`
- [ ] Set up visual regression testing baseline
- [ ] Configure Chrome 143+ in CI/CD pipeline
- [ ] Document browser support matrix

### Team Communication
- [ ] Schedule kickoff meeting
- [ ] Review rollback procedures with team
- [ ] Create Slack channel for progress updates
- [ ] Set up daily standup for migration week

---

## Phase 2: GapTimeline Component (Days 3-5)

### Implementation
- [ ] Add `container-type: inline-size` to `.gap-timeline`
- [ ] Add CSS custom property `--visualization-width` to track container width
- [ ] Create `@container` rules for responsive breakpoints
- [ ] Add `@supports` fallback for older browsers
- [ ] Test on Chrome 105+, Safari 16+, Firefox 110+
- [ ] Verify D3 chart responsive behavior

### Code Review
- [ ] Self-review changes
- [ ] Get peer review from team
- [ ] Address feedback
- [ ] Approve and merge to develop

### Testing
- [ ] [ ] Manual testing: Resize viewport → verify responsive behavior
- [ ] [ ] Mobile testing: Verify on iPhone/iPad
- [ ] [ ] Lighthouse audit: Verify performance metrics
- [ ] [ ] Visual regression: Compare screenshots
- [ ] [ ] Browser compatibility: Test Safari 16, Chrome 143

### Documentation
- [ ] Add code comments explaining container query approach
- [ ] Update component README
- [ ] Add to migration guide

**Success Criteria:**
- Chart renders correctly at all viewport sizes
- No performance regression
- All tests passing
- Code review approved

---

## Phase 3: GuestNetwork Component (Days 6-8)

### Implementation
- [ ] Add `container-type: inline-size` to `.guest-network`
- [ ] Create `@container` rules for force simulation layout
- [ ] Handle SVG viewBox responsiveness with container queries
- [ ] Add `@supports` fallback

### Code Review & Testing
- [ ] Self-review and peer review
- [ ] Manual testing with drag interactions
- [ ] Verify node positioning at different container sizes
- [ ] Test force simulation performance
- [ ] Lighthouse audit

### Verification
- [ ] GuestNetwork component working ✓
- [ ] Force simulation responsive ✓
- [ ] Node drag interactions working ✓

---

## Phase 4: SongHeatmap Component (Days 9-11)

### Implementation
- [ ] Add `container-type: inline-size` to `.song-heatmap`
- [ ] Create `@container` rules for cell layout
- [ ] Responsive axis label sizing
- [ ] Add fallback styling

### Testing & QA
- [ ] Manual testing: Hover on cells
- [ ] Verify heatmap colors at different sizes
- [ ] Test tooltip positioning
- [ ] Performance check

---

## Phase 5: RarityScorecard Component (Days 12-14)

### Implementation
- [ ] Add `container-type: inline-size` to `.rarity-scorecard`
- [ ] Container queries for bar chart layout
- [ ] Responsive label sizing
- [ ] Add fallback

### Testing
- [ ] Manual testing: Bar chart interactions
- [ ] Verify transitions work at all sizes
- [ ] Test legend positioning
- [ ] Lighthouse audit

---

## Phase 6: TourMap Component (Days 15-17)

### Implementation
- [ ] Add `container-type: inline-size` to `.tour-map`
- [ ] Container queries for projection sizing
- [ ] Responsive legend positioning
- [ ] Add fallback

### Testing
- [ ] Manual testing: Click on states
- [ ] Verify geographic projection
- [ ] Test legend responsiveness
- [ ] Check accessibility (state selection feedback)

---

## Phase 7: InstallPrompt Component (Days 18-20)

### Implementation - Scroll Detection
- [ ] Add `.scroll-sentinel` div to template
- [ ] Create scroll-driven animation CSS
- [ ] Add `--internal-has-scrolled` CSS custom property
- [ ] Implement scroll listener with throttling

### JavaScript Removal
- [ ] Remove IntersectionObserver setup code
- [ ] Remove sentinel DOM creation
- [ ] Update scroll detection logic
- [ ] Add `@supports` fallback

### Testing
- [ ] Manual testing: Scroll to trigger prompt
- [ ] Test on desktop and mobile
- [ ] Verify prompt timing
- [ ] Check PWA installation flow
- [ ] Test on Chrome 115+ and older browsers

### Code Review
- [ ] Self-review and peer review
- [ ] Address feedback
- [ ] Merge to develop

---

## Phase 8: Integration & Validation (Days 21-22)

### Full System Testing
- [ ] Build production bundle: `npm run build`
- [ ] Preview production build: `npm run preview`
- [ ] Test all modified components together
- [ ] Verify no CSS conflicts between components
- [ ] Check service worker compatibility

### Cross-Browser Testing
- [ ] Chrome 143 (primary) ✓
- [ ] Chrome 115-142 (older modern Chrome)
- [ ] Safari 17.5 (ProMotion)
- [ ] Safari 16 (with fallbacks)
- [ ] Firefox 114+
- [ ] Edge 143+

### Device Testing
- [ ] MacBook Pro M-series (primary)
- [ ] iPad Pro (container queries + scroll detection)
- [ ] iPhone 15 Pro (ProMotion)
- [ ] iPhone 13 (older device)
- [ ] Android phone (Chrome)

### Performance Audit
- [ ] Run Lighthouse on all pages
- [ ] Check CWV metrics (LCP, INP, CLS, FCP)
- [ ] Profile JavaScript execution
- [ ] Verify no new layout thrashing
- [ ] Check GPU acceleration with Chrome DevTools

### Accessibility Check
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Verify ARIA labels still work
- [ ] Check focus indicators
- [ ] Test with reduced motion preferences

---

## Phase 9: Documentation & Cleanup (Days 23-24)

### Code Documentation
- [ ] Add JSDoc comments to container query usage
- [ ] Document browser support expectations
- [ ] Add examples to component README files
- [ ] Update app.css documentation

### Project Documentation
- [ ] Update CLAUDE.md with CSS modernization info
- [ ] Create CSS Style Guide
- [ ] Add to Design System documentation
- [ ] Update component contribution guidelines

### Knowledge Sharing
- [ ] Create internal wiki/docs with learnings
- [ ] Record short demo video of changes
- [ ] Share Chrome 143+ features summary
- [ ] Conduct team walkthrough

### Cleanup
- [ ] Remove any temporary test CSS
- [ ] Clean up git history if needed
- [ ] Update CHANGELOG.md
- [ ] Tag release version

---

## After-Implementation Checklist

### Release Preparation
- [ ] All tests passing (unit, integration, visual)
- [ ] Code review approved
- [ ] Lighthouse audit: Performance > 90
- [ ] All 5 visualization components migrated
- [ ] InstallPrompt scroll detection working
- [ ] Documentation complete

### Release Execution
- [ ] Merge develop → main
- [ ] Tag release (e.g., v2.1.0)
- [ ] Deploy to staging
- [ ] 24-hour staging validation
- [ ] Deploy to production
- [ ] Monitor error logs for 48 hours

### Post-Release
- [ ] Monitor user reports
- [ ] Check analytics for any regressions
- [ ] Gather team feedback
- [ ] Plan next phase (CSS if(), @scope, etc.)

---

## File-by-File Checklist

### Visualization Components

#### GapTimeline.svelte
- [ ] Add container type to styles
- [ ] Remove ResizeObserver code (lines 189-194)
- [ ] Add @container rules
- [ ] Test responsiveness
- [ ] Update comments

**Modified Lines:**
- Add `container-type: inline-size` around line 208
- Delete lines 189-194 (ResizeObserver)
- Add @container rules before final brace

#### GuestNetwork.svelte
- [ ] Add container type to styles
- [ ] Remove ResizeObserver code (lines 191-194)
- [ ] Add @container rules
- [ ] Verify force simulation responsive
- [ ] Test drag interactions

**Modified Lines:**
- Add `container-type: inline-size` around line 214
- Delete lines 191-194 (ResizeObserver)
- Add @container rules

#### SongHeatmap.svelte
- [ ] Add container type to styles
- [ ] Remove ResizeObserver code (lines 161-166)
- [ ] Add @container rules
- [ ] Test cell hover state
- [ ] Verify legend positioning

**Modified Lines:**
- Add `container-type: inline-size` around line 180
- Delete lines 161-166 (ResizeObserver)
- Add @container rules

#### RarityScorecard.svelte
- [ ] Add container type to styles
- [ ] Remove ResizeObserver code (lines 163-166)
- [ ] Add @container rules
- [ ] Test bar transitions
- [ ] Verify label visibility

**Modified Lines:**
- Add `container-type: inline-size` around line 182
- Delete lines 163-166 (ResizeObserver)
- Add @container rules

#### TourMap.svelte
- [ ] Add container type to styles
- [ ] Remove ResizeObserver code (lines 175-180)
- [ ] Add @container rules
- [ ] Verify geo projection
- [ ] Test state selection

**Modified Lines:**
- Add `container-type: inline-size` around line 195
- Delete lines 175-180 (ResizeObserver)
- Add @container rules

### PWA Components

#### InstallPrompt.svelte
- [ ] Add scroll sentinel div to template (after line 220)
- [ ] Remove IntersectionObserver code (lines 113-142)
- [ ] Add scroll-driven animation CSS
- [ ] Implement scroll listener
- [ ] Test scroll detection
- [ ] Test prompt timing

**Modified Lines:**
- Add `<div class="scroll-sentinel">` to template
- Delete lines 113-142 (IntersectionObserver effect)
- Add new scroll detection effect
- Add .scroll-sentinel CSS rules

### Global Styles

#### app.css
- [ ] Add container query feature detection
- [ ] Add scroll animation feature detection
- [ ] Document container query patterns
- [ ] Add example @supports rules
- [ ] Update browser support section

---

## Testing Checklist

### Manual Testing

#### Chrome 143 (Latest)
- [ ] Resize window in GapTimeline → chart responsive
- [ ] Drag nodes in GuestNetwork → smooth interactions
- [ ] Hover heatmap cells → proper styling
- [ ] Hover rarity bars → shadow effect
- [ ] Click states on TourMap → selection works
- [ ] Scroll down in InstallPrompt → prompt appears

#### Safari 17.5
- [ ] All above tests pass
- [ ] ProMotion smooth animations
- [ ] No flickering during scroll
- [ ] Touch interactions work

#### Firefox 114
- [ ] All above tests pass
- [ ] Container queries supported
- [ ] Scroll animations work

#### Mobile Safari (iPhone 15)
- [ ] Scroll detection works
- [ ] Touch gestures in visualizations
- [ ] Responsive layouts adapt to device width

### Automated Testing
- [ ] Unit tests pass: `npm run test`
- [ ] Type checking passes: `npm run check`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in production build

### Performance Testing
- [ ] Lighthouse score > 90
- [ ] FCP < 1.0s
- [ ] LCP < 1.5s
- [ ] INP < 100ms
- [ ] CLS < 0.05
- [ ] No long tasks (> 50ms)

### Visual Regression
- [ ] Screenshots match baseline
- [ ] No unexpected color changes
- [ ] No layout shifts
- [ ] Animations smooth at 60fps (120fps on ProMotion)

### Accessibility
- [ ] Tab navigation works
- [ ] Screen reader reads all content
- [ ] Focus indicators visible
- [ ] Color contrast ≥ 4.5:1
- [ ] Works with reduced motion preference

---

## Dependencies Check

### CSS Features
- [ ] Container Queries: Chrome 105+, Safari 16+, Firefox 110+
- [ ] Scroll-Driven Animations: Chrome 115+, Safari 17.5+, Firefox 114+
- [ ] @supports rule: All modern browsers
- [ ] CSS Custom Properties: All modern browsers

### No Additional Dependencies Needed
- ✓ No new npm packages
- ✓ No new JavaScript libraries
- ✓ No polyfills needed (graceful degradation)

---

## Rollback Procedures

### If Critical Issue Found

**Option 1: Full Rollback**
```bash
git revert <merge-commit>
npm run build && npm run deploy
```

**Option 2: Single Component Rollback**
```bash
git checkout HEAD~1 -- src/lib/components/visualizations/GapTimeline.svelte
npm run build && npm run deploy
```

**Option 3: Feature Flag**
```typescript
const useModernCSS = CSS.supports('container-type: inline-size');
// Use legacy code if not supported
```

---

## Success Metrics

### Before Migration
- ResizeObservers: 5 instances
- IntersectionObservers: 1 instance
- CSS Container Queries: 0 instances
- CSS Scroll-Driven Animations: 1 instance
- JavaScript in visualization components: ~500 lines

### After Migration
- ResizeObservers: 0 instances ✓
- IntersectionObservers: 0 instances ✓
- CSS Container Queries: 5 instances ✓
- CSS Scroll-Driven Animations: 2 instances ✓
- JavaScript in visualization components: ~450 lines
- **Reduction: ~50 lines of JavaScript**

### Performance Targets
- Lighthouse Performance: 88 → 92+
- INP: No regression
- LCP: No regression
- Observer callback overhead: 100% → 0%

---

## Risk Assessment

### Low Risk
- ✓ Container queries have 89% browser support (Chrome 105+)
- ✓ Scroll-driven animations have proper fallbacks
- ✓ No breaking changes to component APIs
- ✓ CSS-only changes (no HTML structure changes)

### Contingency
- Rollback procedure tested
- Fallback styles documented
- Feature detection in place
- No hard dependency on modern CSS

---

## Sign-Off

**Project Lead:** _________________  Date: _____
**Tech Lead:** _________________  Date: _____
**QA Lead:** _________________  Date: _____

---

## Notes

### Day-by-Day Progress Log

**Day 1:**
- [ ] ✓ Setup complete
- [ ] ✓ Docs reviewed
- [ ] [ ] Implementation begins

**Day 2-5:**
- [ ] GapTimeline implementation
- [ ] GapTimeline testing
- [ ] Code review & merge

**Day 6-8:**
- [ ] GuestNetwork implementation
- [ ] GuestNetwork testing
- [ ] Code review & merge

...and so on.

---

## Quick Links

- [CSS Modernization Audit](/docs/CSS_MODERNIZATION_AUDIT.md)
- [Chrome 143+ Migration Guide](/docs/CHROME_143_MIGRATION_GUIDE.md)
- [App CSS Design Tokens](/src/app.css) (lines 1-500)
- [Browser Support Policy](/docs/BROWSER_SUPPORT.md)
- [GitHub Issues - CSS Modernization](https://github.com/yourusername/dmb-almanac/issues?labels=css-modernization)

---

**Checklist Version:** 1.0
**Last Updated:** 2025-01-21
**Status:** Ready for Team Review
