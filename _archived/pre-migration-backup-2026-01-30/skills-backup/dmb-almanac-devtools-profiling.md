---
name: dmb-almanac-devtools-profiling
version: 1.0.0
description: This guide helps you measure and verify the CSS optimization improvements using Chrome DevTools.
recommended_tier: sonnet
author: Claude Code
created: 2026-01-25
updated: 2026-01-25
category: scraping
complexity: advanced
tags:
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/DEVTOOLS_PROFILING_GUIDE.md
migration_date: 2026-01-25
---

# Chrome DevTools Profiling Guide

### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## Apple Silicon CSS Performance Analysis

This guide helps you measure and verify the CSS optimization improvements using Chrome DevTools.

---

## Quick Setup (1 minute)

### 1. Open DevTools
```
Chrome Menu → More Tools → Developer Tools
  OR
Cmd+Option+I
```

### 2. Enable Performance Tools
```
DevTools Menu (⋮) → More Tools → Rendering
```

### 3. Check Performance Panels
```
DevTools Tabs:
  • Performance (for recording frame data)
  • Rendering (for real-time FPS monitoring)
  • Layers (for layer composition analysis)
```

---

## Real-Time FPS Monitoring

### Enable FPS Meter (Recommended)
```
1. DevTools → Rendering tab
2. Scroll down to "Paint flashing"
3. Check all boxes:
   ☑ Paint flashing
   ☑ Layer borders
   ☑ FPS meter
```

### What You're Looking At
```
┌─────────────────────────────────────┐
│           FPS Meter                 │
├─────────────────────────────────────┤
│  30 fps      60 fps      120 fps    │
│   ▁▂▃▄▅▆▇██████   FPS: 118        │
│                                     │
│  GPU Memory: 42MB / 1024MB          │
│  Rendering: 1.2ms                  │
└─────────────────────────────────────┘
```

**What to look for:**
- **Green bars (120fps+):** Perfect - GPU is handling it
- **Yellow bars (60-100fps):** Acceptable - room for improvement
- **Red bars (<60fps):** Problem - animation stuttering

---

## Before & After Testing

### Test Case 1: Skeleton Shimmer Animation

**Setup:**
1. Open any page with loading skeleton (e.g., `/songs`)
2. Clear cache (Cmd+Shift+R) to see skeletons load
3. Keep DevTools Rendering panel visible
4. Watch FPS meter during skeleton animation

**Before Patch:**
```
FPS: 60 (yellow/orange)
Paint flashing: RED bars appear (paint operations)
Smooth? NO - slight stutter visible
```

**After Patch:**
```
FPS: 120 (solid green)
Paint flashing: Minimal red (GPU handling it)
Smooth? YES - perfectly smooth shimmer
```

### Test Case 2: Progress Bar Animation

**Setup:**
1. Open any page with progress bar (`/shows` with filter results)
2. Watch DevTools while progress bar fills
3. Observe animation smoothness

**Before Patch:**
```
FPS: 80-90 (yellow bars)
Composite time: 3-5ms (high for a simple bar)
Smooth? SOMEWHAT - occasional frame drops
```

**After Patch:**
```
FPS: 118-120 (green bars)
Composite time: 1-2ms (optimized)
Smooth? YES - perfectly linear fill
```

### Test Case 3: Card Hover Animations

**Setup:**
1. Go to `/venues` or `/shows`
2. Slowly move mouse over cards
3. Watch FPS meter and Paint flashing

**Expected (Already Good):**
```
FPS: 118-120 (should already be smooth)
Paint flashing: Minimal red (already GPU)
Smooth? YES - excellent
```

---

## Detailed Performance Analysis

### Chrome DevTools Performance Tab

#### Record a Frame Profile

```
1. DevTools → Performance tab
2. Click Record (⚫)
3. Interact with animation (10-15 seconds)
   • Hover over cards
   • Scroll the page
   • Open/close mobile menu
4. Click Stop (⏹️)
5. Wait for profile to generate
```

#### Reading the Timeline

```
┌─────────────────────────────────────────┐
│  Performance Timeline                   │
├─────────────────────────────────────────┤
│  Frame [████] = 16.67ms (60fps target)  │
│  Frame [██] = 8.33ms (120fps target)    │
│                                         │
│  Tasks Breakdown:                       │
│  • Layout (yellow)  - triggers layout   │
│  • Paint (purple)   - triggers paint    │
│  • Composite (green) - GPU only         │
└─────────────────────────────────────────┘
```

#### Interpreting Metrics

```
PAINT TIME (should be <4ms):
├─ Before patches: 4-8ms (bad)
├─ After patches: 1-3ms (good)
└─ Why: GPU doing rendering, not CPU

COMPOSITE TIME (should be <2ms):
├─ Before patches: 2-5ms (acceptable)
├─ After patches: 0.5-1.5ms (excellent)
└─ Why: Fewer layout operations before composite

FRAME TIME (should be <8.33ms):
├─ Before patches: 8-16ms (occasional 60fps)
├─ After patches: 7-8.33ms (consistent 120fps)
└─ Why: Everything running on fast GPU path
```

---

## Paint Flashing Analysis

### What Paint Flashing Shows

When enabled, DevTools overlays a red (or green) tint on elements that are painted:

```
RED REGIONS = Paint operations (slow)
GREEN REGIONS = Composite only (fast)
```

### Test Paint Flashing During Animations

**Skeleton Shimmer Test:**
```
BEFORE (background-position animation):
  1. Enable Paint flashing
  2. Watch skeleton load
  3. Red regions constantly flashing
  4. Indication: Paint operations every frame
  5. Result: Can't hit 120fps

AFTER (transform animation):
  1. Enable Paint flashing
  2. Watch skeleton load
  3. Minimal red flashing
  4. Indication: GPU handling it
  5. Result: Consistent 120fps
```

**Card Hover Test:**
```
BEFORE (if animating wrong properties):
  1. Hover over card
  2. Red regions flash (paint operations)
  3. FPS drops temporarily

AFTER (animating transform only):
  1. Hover over card
  2. Minimal red regions
  3. FPS stays at 120
```

---

## Layer Borders Analysis

### What Layers Tell You

Each "layer" is a compositor layer that can be independently rendered by the GPU.

```
GOOD (60-100 layers):
  └─ Each layer promoted intentionally
  └─ Used for animations & visual effects
  └─ GPU memory: 50-150MB

WARNING (100-150 layers):
  └─ Too many promoted elements
  └─ Using will-change too broadly
  └─ GPU memory: 150-300MB
  └─ Action: Check will-change usage

BAD (150+ layers):
  └─ Way too many compositor layers
  └─ GPU memory: 300MB+
  └─ Result: Slower compositing
  └─ Action: Remove will-change from non-critical elements
```

### View Layers Panel

```
1. DevTools → Performance → Record
2. After recording, scroll to "Layer breakdown"
3. Look for layer count
4. If >120: Investigate will-change usage
```

---

## Profiling Checklist

### Before Applying Patches

Run this test suite:

```
□ Open DevTools Rendering tab
□ Enable: Paint flashing ☑
□ Enable: Layer borders ☑
□ Enable: FPS meter ☑

□ Test: Skeleton shimmer
  └─ Expected: 60-80fps, red flashing
  └─ Note current FPS

□ Test: Progress bar
  └─ Expected: 80-100fps
  └─ Note smoothness (1-10 scale)

□ Test: Card hover
  └─ Expected: 110-120fps (already good)
  └─ Note baseline

□ Record Performance profile (10s)
  └─ Note Paint time
  └─ Note Composite time
  └─ Note layer count

SAVE BASELINE METRICS:
  Skeleton FPS: ___
  Progress smoothness: ___
  Card hover FPS: ___
  Paint time: ___ms
  Composite time: ___ms
  Layer count: ___
```

### After Applying Patches

Run same tests:

```
□ Test: Skeleton shimmer
  └─ Expected: 115-120fps, minimal red
  └─ Actual FPS: ___
  └─ Improvement: ___ fps (+_%)

□ Test: Progress bar
  └─ Expected: 118-120fps, smooth
  └─ Actual smoothness: ___ (1-10)
  └─ Improvement: ___

□ Test: Card hover
  └─ Expected: 119-120fps
  └─ Actual FPS: ___
  └─ Maintained performance: ✓

□ Record Performance profile (10s)
  └─ Paint time: ___ms (was ___ms)
  └─ Composite time: ___ms (was ___ms)
  └─ Layer count: ___ (was ___)

CALCULATE IMPROVEMENTS:
  Skeleton: Before ___ → After ___ (+___ fps)
  Progress: Before ___ → After ___ (+___ fps)
  Paint: Before ___ms → After ___ms (-___ ms)
  Composite: Before ___ms → After ___ms (-___ ms)
```

---

## Common Issues & Diagnostics

### "Still not 120fps on skeleton"

```
DIAGNOSTIC STEPS:
1. Check actual fix was applied:
   □ Open Skeleton.svelte
   □ Find @keyframes shimmer
   □ Verify: transform: translateX (not background-position)
   □ Verify: will-change: transform (not background-position)

2. Check browser cache:
   □ Hard refresh: Cmd+Shift+R
   □ Clear cache in DevTools
   □ Restart dev server: npm run dev

3. Check DevTools is measuring correctly:
   □ Performance recording shows animation
   □ Rendering panel enabled
   □ No other apps using GPU heavily

4. Check actual animation is running:
   □ Enable Paint flashing
   □ Should see minimal red during shimmer
   □ If lots of red: paint is happening (animation not GPU)

STILL STUCK?
└─ Post performance profile (DevTools → Performance → Export)
└─ Check if CSS module is being used (scoped styles)
└─ Verify no !important rules overriding transform
```

### "Paint time still high"

```
DIAGNOSTIC:
1. Record performance profile
2. Look at "Paint" event duration
3. Find what's being painted:
   □ DevTools → Performance → Detailed view
   □ Expand "Paint" operation
   □ Shows which elements are being repainted
4. Check if it's your animation or something else

IF YOUR ANIMATION:
└─ Check: Are you using transform or width?
└─ Check: Is will-change hint correct?
└─ Check: No margin/padding changes during animation?

IF SOMETHING ELSE:
└─ Might be unrelated to your patches
└─ Focus on your specific animation metrics
```

### "Composite time worse than before"

```
POSSIBLE CAUSES:
1. Too many layers promoted (will-change)
   └─ Check DevTools Layers panel
   └─ If >100 layers: remove some will-change hints

2. Layers too large
   └─ Large promoted layers take longer to composite
   └─ Solution: Apply contain: content where possible

3. GPU memory pressure
   └─ Check Activity Monitor > Memory tab
   └─ If GPU is at capacity: reduce layer count

NORMAL VARIATION:
└─ Composite time varies ±0.5ms based on system load
└─ If within 0.5ms of before: no problem
└─ If 1-2ms higher: investigate above causes
```

---

## Advanced Profiling

### GPU Memory Usage

```
Chrome DevTools → More Tools → More Tools... → Rendering
Look for: "GPU Memory"

Display shows:
GPU Memory: 42MB / 1024MB (M-series average)

What's using it:
├─ Compositor layers: ~50%
├─ Textures (images): ~30%
├─ WebGL/Canvas: ~15%
└─ Misc: ~5%

If over 200MB:
└─ Too many will-change: remove non-critical ones
└─ Too many large layers: check layer sizes
└─ Too many images: optimize image loading
```

### Frame Breakdown

```
DevTools → Performance tab → See "Main" and "GPU" lines

MAIN THREAD (CPU work - should be minimal):
├─ Script execution (JS)
├─ Layout (dimension calculation)
├─ Paint (drawing commands)
└─ Goal: <3ms per frame

GPU THREAD (GPU work - can be higher):
├─ Composite (layering)
├─ Render passes
└─ Goal: <5ms per frame

TOTAL: Should fit in 8.33ms budget for 120fps
```

---

## Team Communication

### Sharing Results

When reporting improvements, use this format:

```
BEFORE PATCHES:
  Animation FPS: 78fps (inconsistent)
  Paint time: 6.2ms
  Composite time: 3.8ms
  Layer count: 67
  Measurement: DevTools Performance recording

AFTER PATCHES:
  Animation FPS: 119fps (consistent)
  Paint time: 1.9ms (-69%)
  Composite time: 1.2ms (-68%)
  Layer count: 62 (-7%)
  Improvement: +41fps (52% faster)

KEY OPTIMIZATIONS APPLIED:
  1. Skeleton: background-position → transform
  2. Progress bar: width → scaleX
  3. Backdrop blur: 40px → 30px
  4. Will-change: optimized hints
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│          OPTIMIZATION TARGETS (Apple Silicon)      │
├─────────────────────────────────────────────────────┤
│ FPS Meter:         TARGET: 118-120 (green)         │
│ Paint Flashing:    TARGET: Minimal red regions     │
│ Paint Time:        TARGET: <4ms                    │
│ Composite Time:    TARGET: <2ms                    │
│ Frame Time:        TARGET: <8.33ms (120fps)        │
│ Layer Count:       TARGET: <100 total              │
│ GPU Memory:        TARGET: <200MB for UI           │
└─────────────────────────────────────────────────────┘

Shortcuts:
  ✓ Cmd+Option+I = Open DevTools
  ✓ Cmd+Shift+R = Hard refresh (clear cache)
  ✓ Menu ⋮ → More Tools → Rendering = Performance tools
  ✓ Performance Tab → Record = Profile animations
```

---

## Questions?

If DevTools metrics don't improve as expected:

1. **Check the fix was applied:** grep for changed properties
2. **Clear all caches:** Cmd+Shift+R + Hard refresh
3. **Record longer profiles:** 15-30 seconds instead of 5-10s
4. **Close other apps:** Reduces system load variance
5. **Test multiple times:** Frame times vary slightly, take average

Good profiling! 📊
