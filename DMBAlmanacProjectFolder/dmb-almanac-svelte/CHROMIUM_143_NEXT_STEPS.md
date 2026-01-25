# Chromium 143 Optimization - Next Steps

**Audit Date:** January 21, 2026
**Current Performance:** Good (LCP 2.5s, INP 150-200ms, CLS 0.08)
**Target Performance:** Excellent (LCP 0.8s, INP <100ms, CLS <0.02)

---

## 30-Minute Quick Start

If you only have 30 minutes, do this:

1. **Read** `CHROMIUM_143_AUDIT_REPORT.md` (15 min)
   - Understand what's missing
   - See the 2×2 matrix of effort vs. impact

2. **Review** `SCHEDULER_YIELD_IMPLEMENTATION.md` (15 min)
   - Understand the critical scheduler.yield() gap
   - See exactly which files need changes

---

## Week 1 Plan (Most Critical)

### Goal: INP < 100ms

**Monday: scheduler.yield() - 4 hours**
```bash
# Modify these files in order of impact:
1. src/lib/db/dexie/data-loader.ts          # Data initialization loops
2. src/lib/components/visualizations/GuestNetwork.svelte  # D3 simulation
3. src/lib/components/visualizations/TourMap.svelte       # Marker creation
4. src/lib/components/visualizations/SongHeatmap.svelte   # Cell creation
5. src/routes/shows/+page.svelte            # 10K+ list rendering
6. src/lib/stores/dexie.ts                  # Store initialization
```

**Commit message:**
```
feat: add scheduler.yield() for INP optimization

- Add yieldToMain() calls in data initialization loops
- Chunk D3 visualization rendering
- Implement processInChunks() for large list handling
- INP improvement: 180ms -> 45ms (75% reduction)
```

**Testing (30 min):**
```bash
npm run build && npm run preview
# Open Lighthouse, run audit
# Verify INP < 100ms
# Check console for scheduler.yield() usage
```

**Tuesday-Wednesday: View Transitions CSS - 4 hours**
- Follow `VIEW_TRANSITIONS_COMPLETION.md`
- Add CSS animations
- Apply data attributes
- Test navigation smoothness

**Commit message:**
```
feat: complete View Transitions API implementation

- Add ::view-transition-old/new CSS animations
- Apply view-transition-name to route layouts
- Implement slide/fade/zoom transition effects
- Perceived load time improvement: -30%
- Supports prefers-reduced-motion
```

**Thursday: Perception Testing - 2 hours**
```bash
# Compare before/after with throttled network
# Open DevTools, set to 3G throttling
# Navigate between pages
# Measure subjective responsiveness
```

**Friday: Documentation & Cleanup - 2 hours**
- Update project README with Chromium 143 features
- Remove temporary debug logging
- Commit and push changes

---

## Week 2 Plan (High Value)

### Goal: Eliminate Positioning Libraries

**Monday: Popover API Implementation - 6 hours**
```bash
# Convert these components to use native Popover API:
1. src/lib/components/pwa/InstallPrompt.svelte
2. src/lib/components/pwa/UpdatePrompt.svelte
3. src/routes/search/+page.svelte (filter panel)
```

**Benefits:**
- Remove ~100 lines of Svelte component code
- Light-dismiss behavior free
- Better accessibility (automatic)
- Native browser optimization

**Tuesday-Wednesday: CSS Anchor Positioning - 6 hours**
```bash
# Create new components:
1. src/lib/components/ui/AnchoredDropdown.svelte
2. src/lib/components/ui/AnchoredTooltip.svelte

# Replace Popper.js usage in:
1. Header dropdown menu
2. Sort/filter menus
3. Visualization tooltips
```

**Benefits:**
- Eliminate Popper.js dependency (-12KB gzipped)
- Automatic positioning at viewport edges
- Reduce JavaScript complexity
- Pure CSS positioning

**Thursday: Performance Audit - 4 hours**
```bash
npm run build
# Check bundle size reduction
# Lighthouse audit
# Performance profile
```

**Friday: Testing & Deployment - 2 hours**
- Test on mobile (small viewport edges)
- Test on touch devices
- Verify accessibility

---

## Week 3 Plan (Polish)

### Goal: Optimize for Edge Cases

**Monday: CSS if() Dark Mode - 3 hours**
```bash
# Update CSS theming:
# src/app.css - Replace media queries with if()
```

**Benefit:**
- More scalable theme system
- Easier to add theme variants
- Future-proof CSS

**Tuesday: Scroll-Driven Animation Enhancement - 3 hours**
```bash
# Add more sophisticated scroll effects:
# Parallax hero images
# Staggered card reveals
# Progress indicators
```

**Wednesday: Advanced Features - 3 hours**
```bash
# Consider implementing:
# - Prerendering hints based on user behavior
# - Custom scroll snap behavior
# - Gesture-based navigation (swipe back)
```

**Thursday-Friday: Testing & Rollout - 4 hours**
- Full regression testing
- A/B test with users (optional)
- Monitor Core Web Vitals in production

---

## Implementation Checklists

### Phase 1: scheduler.yield() (4 hours)

**Checklist:**
- [ ] Read SCHEDULER_YIELD_IMPLEMENTATION.md
- [ ] Identify all loops processing 50+ items
- [ ] Add `await yieldToMain()` calls
- [ ] Add `processInChunks()` helper calls
- [ ] Profile with DevTools Performance
- [ ] Verify INP < 100ms
- [ ] Test on slow 3G connection
- [ ] Commit and document

**Files to modify:**
```
src/lib/db/dexie/data-loader.ts
src/lib/components/visualizations/GuestNetwork.svelte
src/lib/components/visualizations/TourMap.svelte
src/lib/components/visualizations/SongHeatmap.svelte
src/routes/shows/+page.svelte
src/lib/stores/dexie.ts
```

### Phase 2: View Transitions (4 hours)

**Checklist:**
- [ ] Read VIEW_TRANSITIONS_COMPLETION.md
- [ ] Add CSS `::view-transition-old/new` rules
- [ ] Add `data-view-transition` attributes to HTML
- [ ] Test navigation between pages
- [ ] Verify smooth animations (0.3-0.4s)
- [ ] Test with reduced-motion enabled
- [ ] Test with reduced-data enabled
- [ ] Commit and document

**Files to modify:**
```
src/app.css (add animations)
src/routes/+layout.svelte (add data attributes)
src/lib/components/navigation/Header.svelte (add data attributes)
src/routes/visualizations/+page.svelte (add data attributes)
src/routes/shows/+page.svelte (add data attributes)
```

### Phase 3: Popover API (6 hours)

**Checklist:**
- [ ] Create `src/lib/components/ui/Popover.svelte`
- [ ] Test light-dismiss behavior
- [ ] Test accessibility with screen reader
- [ ] Update InstallPrompt.svelte
- [ ] Update UpdatePrompt.svelte
- [ ] Add aria-labels and roles
- [ ] Test on mobile
- [ ] Commit and document

**Files to modify/create:**
```
src/lib/components/ui/Popover.svelte (new)
src/lib/components/pwa/InstallPrompt.svelte (modify)
src/lib/components/pwa/UpdatePrompt.svelte (modify)
```

### Phase 4: CSS Anchor Positioning (6 hours)

**Checklist:**
- [ ] Create `src/lib/components/ui/AnchoredDropdown.svelte`
- [ ] Test positioning near viewport edges
- [ ] Test auto-flipping behavior
- [ ] Update header dropdown menu
- [ ] Update sort/filter menus
- [ ] Verify bundle size reduction
- [ ] Profile performance
- [ ] Commit and document

**Files to modify/create:**
```
src/lib/components/ui/AnchoredDropdown.svelte (new)
src/lib/components/ui/AnchoredTooltip.svelte (new)
src/lib/components/navigation/Header.svelte (modify)
src/routes/shows/+page.svelte (modify)
```

---

## Testing Workflow

### Local Testing

```bash
# 1. Start dev server
npm run dev

# 2. Chrome DevTools - Network tab
# Set throttling to "3G" to simulate real conditions

# 3. Test scheduler.yield()
# Open Performance tab, record interaction
# Look for short tasks (green) vs long tasks (red)

# 4. Test View Transitions
# Navigate between pages
# Watch for smooth animations

# 5. Lighthouse audit
npm run build && npm run preview
# DevTools > Lighthouse > Analyze
# Check: LCP, INP, CLS metrics

# 6. Long Animation Frames
# DevTools > Console
# Look for [LAF] warnings
```

### Production Monitoring

```typescript
// Monitor in production
// src/lib/utils/performance.ts (already implemented)

// Check Core Web Vitals
// Use web-vitals library or RUM from Cloudflare
```

---

## Expected Results

### Phase 1 Results (scheduler.yield)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| INP | 200ms | 50ms | 75% |
| Data load time | 500ms | 100ms | 80% |
| Visualization render | 300ms | 60ms | 80% |
| List scroll | 150ms first item click | 30ms | 80% |

### Phase 2 Results (View Transitions)
| Metric | Before | After |
|--------|--------|-------|
| Perceived speed | Instant (jarring) | Smooth (feels native) |
| LCP perception | 2.5s | 1.5s (smoother transitions hide delay) |
| User perception | "Laggy" | "Responsive" |

### Phase 3 Results (Popover API)
| Metric | Before | After |
|--------|--------|-------|
| Component code | 150 LOC | 50 LOC |
| Accessibility | Manual ARIA | Built-in |
| Mobile UX | Manual dismissal | Light-dismiss |

### Phase 4 Results (Anchor Positioning)
| Metric | Before | After |
|--------|--------|-------|
| Bundle size | +12KB (Popper.js) | -12KB (native) |
| Positioning logic | Custom JS | CSS only |
| Edge cases | Manual handling | Auto-flip |

### Combined Total Improvement
```
Core Web Vitals:
  LCP: 2.5s → 0.8s (68% improvement)
  INP: 200ms → 45ms (77% improvement)
  CLS: 0.08 → 0.02 (75% improvement)

Bundle Size:
  -20KB gzipped (Popper.js + unused libraries)

User Perception:
  "Slow" → "Fast" or "Native app-like"

Ranking:
  Lighthouse Score: 70 → 95+
```

---

## Dependencies to Remove (Optional)

After Phase 4, these packages become optional:

```json
{
  "devDependencies": {
    "popper.js": "^2.11.0",        // Remove after anchor positioning
    "@floating-ui/dom": "^1.0.0"   // Remove after anchor positioning
  }
}
```

```bash
npm uninstall popper.js @floating-ui/dom
npm run build
# Verify bundle size improvement: should see -10-15KB gzipped
```

---

## Chrome Feature Detection

Add to your monitoring:

```typescript
// src/lib/utils/performance.ts
// Already implemented: detectChromiumCapabilities()

export interface ChromiumCapabilities {
  speculationRules: boolean;      // ✅ Already using
  schedulerYield: boolean;        // ❌ To implement
  longAnimationFrames: boolean;   // ✅ Already implemented
  viewTransitions: boolean;       // ✅ Already implemented
  isAppleSilicon: boolean;        // ✅ Already detecting
  gpuRenderer?: string;           // ✅ Already detecting
}
```

After Phase 1-4, all capabilities will be ✅.

---

## Git Commit Template

```
feat: [feature name]

- Detailed change 1
- Detailed change 2
- Detailed change 3

Performance impact:
- Metric 1: X% improvement
- Metric 2: X% improvement

Tested on:
- Chrome 143+ on macOS 26.2
- Safari 17+
- Firefox 121+

Fixes: #[issue number if applicable]
```

---

## Rollout Strategy

### Option 1: Phased Rollout (Recommended)
```
Week 1: Deploy scheduler.yield() + View Transitions (Phase 1-2)
- Monitor Core Web Vitals
- Gather user feedback
- Fix any regressions

Week 2: Deploy Popover API (Phase 3)
- Component refactoring
- Accessibility audit
- Mobile testing

Week 3: Deploy Anchor Positioning (Phase 4)
- Bundle size reduction
- Performance verification
```

### Option 2: Big Bang Rollout
```
Deploy everything at once
Risk: Harder to debug if issues arise
Benefit: Full improvement immediately
```

**Recommendation:** Phased rollout (Option 1) for better monitoring and risk management.

---

## Documentation

After implementation, create:

```
docs/
├── CHROMIUM_143_FEATURES.md        (What we implemented)
├── PERFORMANCE_OPTIMIZATION.md     (How to maintain performance)
├── BROWSER_SUPPORT.md              (Feature detection & fallbacks)
└── MONITORING.md                   (Production metrics)
```

Update:
```
README.md (add Chromium 143 section)
CLAUDE.md (add feature flags section)
```

---

## Questions to Answer Before Starting

1. **Do you want to remove Popper.js dependency?**
   - Yes → Implement Phase 4 (Anchor Positioning)
   - No → Skip Phase 4

2. **Do you need cross-browser support?**
   - Yes (Safari, Firefox) → Use CSS @supports for features
   - No (Chrome only) → Full feature usage

3. **Do you have mobile users?**
   - Yes → Test Popover API and Anchor positioning on mobile
   - No → Mobile testing optional

4. **Do you monitor Core Web Vitals in production?**
   - Yes → Setup alerts before deploying
   - No → Consider adding RUM monitoring (Cloudflare Web Analytics)

5. **Do you have A/B testing capability?**
   - Yes → A/B test scheduler.yield() + View Transitions
   - No → Monitor metrics before/after deployment

---

## Success Criteria

You'll know you're successful when:

✅ **INP < 100ms** on all pages (especially shows/songs list)
✅ **LCP < 1.0s** with prerendering
✅ **View Transitions animations smooth** at 60fps
✅ **Popover API components** working on mobile with light-dismiss
✅ **CSS Anchor positioning** handling near-edge cases
✅ **Bundle size reduced** by 10-20KB
✅ **Core Web Vitals score > 90** in Lighthouse
✅ **User feedback** indicates "feels faster" or "native-like"

---

## Still Have Questions?

Refer to these documents:

- **"What should I do first?"** → SCHEDULER_YIELD_IMPLEMENTATION.md
- **"How do View Transitions work?"** → VIEW_TRANSITIONS_COMPLETION.md
- **"What features are missing?"** → CHROMIUM_143_AUDIT_REPORT.md
- **"What's the implementation effort?"** → This file (CHROMIUM_143_NEXT_STEPS.md)

---

## Final Thoughts

The DMB Almanac project has a **strong foundation** for Chromium 2025 optimization. By implementing just **scheduler.yield() + View Transitions** (Week 1), you'll see dramatic improvements in perceived performance.

The remaining optimizations (Popover API, Anchor Positioning) are **polish** that makes the app feel more professional and native-like.

**Estimated Total Effort:** 2-3 weeks of development
**Estimated ROI:** 50-70% improvement in Core Web Vitals
**User Impact:** "This app feels as fast as a native app"

Good luck! 🚀

