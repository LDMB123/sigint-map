---
name: devtools-profiling
description: Chrome DevTools Performance profiling for Chromium 2025 on Apple Silicon
tags: [performance, profiling, chrome-devtools, apple-silicon, debugging]
when_to_use: When you need to measure FPS, identify paint operations, analyze compositor layers, or diagnose rendering performance issues in Chrome on macOS
---

# Chrome DevTools Profiling Guide

Comprehensive guide for measuring and debugging performance using Chrome DevTools on Chromium 143+ and Apple Silicon (M-series).

## Quick Setup

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
  • Memory (for heap snapshots)
```

---

## Real-Time FPS Monitoring

### Enable FPS Meter
```
1. DevTools → Rendering tab
2. Scroll down to monitoring options
3. Check these boxes:
   ☑ Paint flashing
   ☑ Layer borders
   ☑ FPS meter
   ☑ Core Web Vitals
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

**Interpretation:**
- **Green bars (120fps+):** Perfect - GPU is handling it
- **Yellow bars (60-100fps):** Acceptable - room for improvement
- **Red bars (<60fps):** Problem - animation stuttering

---

## Performance Tab Recording

### Record a Profile

```
1. DevTools → Performance tab
2. Click Record (⚫)
3. Interact with the page (10-15 seconds)
   • Scroll the page
   • Click buttons
   • Navigate between views
   • Trigger animations
4. Click Stop (⏹️)
5. Wait for profile to generate
```

### Reading the Timeline

```
┌─────────────────────────────────────────┐
│  Performance Timeline                   │
├─────────────────────────────────────────┤
│  Frame [████] = 16.67ms (60fps target)  │
│  Frame [██] = 8.33ms (120fps target)    │
│                                         │
│  Tasks Breakdown:                       │
│  • Scripting (yellow)  - JS execution   │
│  • Rendering (purple)  - styles/layout  │
│  • Painting (green)    - paint ops      │
│  • System (gray)       - browser tasks  │
│  • Idle (white)        - free time      │
└─────────────────────────────────────────┘
```

### Interpreting Metrics

**Frame Time (should be <8.33ms for 120fps):**
- Before optimization: 12-20ms (60fps or worse)
- After optimization: 7-8.33ms (consistent 120fps)
- Why: Efficient rendering path

**Paint Time (should be <4ms):**
- Before: 4-8ms (bad)
- After: 1-3ms (good)
- Why: GPU doing rendering, not CPU

**Composite Time (should be <2ms):**
- Before: 2-5ms (acceptable)
- After: 0.5-1.5ms (excellent)
- Why: Fewer layout operations before composite

**Scripting Time (should be <50ms per task):**
- Long tasks >50ms: Block user input (causes INP issues)
- Long tasks >100ms: Visible jank
- Solution: Break into chunks with scheduler.yield()

---

## Paint Flashing Analysis

### What Paint Flashing Shows

When enabled, DevTools overlays colored regions on elements that are painted:

```
GREEN REGIONS = Composite only (fast, GPU accelerated)
RED REGIONS = Paint operations (slow, CPU bound)
```

### Test Paint Flashing

**During Animations:**
```
GOOD (GPU-accelerated):
  1. Enable Paint flashing
  2. Trigger animation (hover, scroll)
  3. Minimal red flashing
  4. Indication: GPU handling it
  5. Result: 120fps sustained

BAD (Paint-heavy):
  1. Enable Paint flashing
  2. Trigger animation
  3. Red regions constantly flashing
  4. Indication: Paint operations every frame
  5. Result: Can't hit 120fps
```

**During Scrolling:**
```
GOOD:
  • Minimal red flashing during scroll
  • Content-visibility working
  • Virtual scrolling effective

BAD:
  • Entire page flashes red
  • All content being repainted
  • Need content-visibility: auto
```

---

## Layer Borders Analysis

### What Layers Tell You

Each "layer" is a compositor layer that can be independently rendered by the GPU.

```
GOOD (50-100 layers):
  └─ Each layer promoted intentionally
  └─ Used for animations & visual effects
  └─ GPU memory: 50-150MB
  └─ Smooth compositing

WARNING (100-150 layers):
  └─ Too many promoted elements
  └─ Using will-change too broadly
  └─ GPU memory: 150-300MB
  └─ Action: Audit will-change usage

BAD (150+ layers):
  └─ Way too many compositor layers
  └─ GPU memory: 300MB+
  └─ Result: Slower compositing, memory pressure
  └─ Action: Remove will-change from non-critical elements
```

### View Layers

```
1. DevTools → Layers tab (enable via ⋮ menu if hidden)
2. See 3D layer composition
3. Click layers to inspect properties
4. Look for:
   - Layer count
   - Layer size (large layers are expensive)
   - Reasons for layer promotion
```

---

## Memory Panel

### Heap Snapshot

**When to use:** Suspected memory leaks, growing memory over time

```
1. DevTools → Memory tab
2. Select "Heap snapshot"
3. Click "Take snapshot"
4. Interact with app (navigate, open/close views)
5. Take another snapshot
6. Compare snapshots to find leaks
```

### Allocation Timeline

**When to use:** Find what's allocating memory during specific interactions

```
1. DevTools → Memory tab
2. Select "Allocation instrumentation on timeline"
3. Click "Start"
4. Perform interaction
5. Click "Stop"
6. Analyze allocation timeline
```

### Memory Leak Detection

**Pattern:**
```
1. Take baseline snapshot
2. Perform action that should be reversible (open modal, close modal)
3. Repeat 5-10 times
4. Take second snapshot
5. Compare: Memory should return to baseline
6. If growing: Memory leak present
```

**Common leak sources:**
- Event listeners not cleaned up
- DOM nodes held in closures
- Timers not cleared
- Global variables accumulating data

---

## Apple Silicon Specific Metrics

### GPU Memory Usage
```
DevTools → Rendering tab → FPS meter shows:
GPU Memory: 42MB / 1024MB (M-series)

What's using it:
├─ Compositor layers: ~50%
├─ Textures (images): ~30%
├─ WebGL/Canvas: ~15%
└─ Misc: ~5%

If over 200MB for UI:
└─ Too many will-change hints
└─ Too many large layers
└─ Optimize layer strategy
```

### Metal Backend Detection
```javascript
// Detect Apple Silicon GPU
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');

if (gl) {
  const renderer = gl.getParameter(gl.RENDERER);
  const isApple = renderer.includes('Apple') && !renderer.includes('Intel');

  console.log('Renderer:', renderer);  // "Apple M4 Pro"
  console.log('Metal backend:', isApple);
}
```

---

## Performance Targets (Apple Silicon)

```
┌─────────────────────────────────────────────────────┐
│          OPTIMIZATION TARGETS                       │
├─────────────────────────────────────────────────────┤
│ FPS Meter:         TARGET: 118-120 (green)         │
│ Paint Flashing:    TARGET: Minimal red regions     │
│ Paint Time:        TARGET: <4ms                    │
│ Composite Time:    TARGET: <2ms                    │
│ Frame Time:        TARGET: <8.33ms (120fps)        │
│ Scripting/Task:    TARGET: <50ms (avoid INP)       │
│ Layer Count:       TARGET: <100 total              │
│ GPU Memory:        TARGET: <200MB for UI           │
└─────────────────────────────────────────────────────┘
```

---

## Profiling Workflow

### Before Optimization

```
□ Open DevTools Rendering tab
□ Enable: Paint flashing ☑
□ Enable: Layer borders ☑
□ Enable: FPS meter ☑

□ Record Performance profile (15s)
  └─ Note Paint time: ___ms
  └─ Note Composite time: ___ms
  └─ Note Layer count: ___
  └─ Note Frame time: ___ms
  └─ Note Long tasks: ___

□ Take Heap snapshot
  └─ Note Memory usage: ___MB

BASELINE METRICS:
  FPS: ___
  Paint time: ___ms
  Composite time: ___ms
  Layer count: ___
  Memory: ___MB
```

### After Optimization

```
□ Record Performance profile (15s)
  └─ Paint time: ___ms (was ___ms)
  └─ Composite time: ___ms (was ___ms)
  └─ Layer count: ___ (was ___)
  └─ Frame time: ___ms (was ___ms)

□ Take Heap snapshot
  └─ Memory: ___MB (was ___MB)

IMPROVEMENTS:
  FPS: Before ___ → After ___ (+___ fps / +___%)
  Paint: Before ___ms → After ___ms (-___ ms / -___%)
  Composite: Before ___ms → After ___ms (-___ ms / -___%)
  Memory: Before ___MB → After ___MB (-___ MB / -___%)
```

---

## Common Issues & Diagnostics

### "Still seeing low FPS"

**Checklist:**
1. Hard refresh: Cmd+Shift+R (clear cache)
2. Check no other apps using GPU heavily
3. Check DevTools Rendering panel enabled
4. Verify GPU acceleration active (chrome://gpu)
5. Check for long tasks in Performance tab
6. Review Paint flashing - excessive red means CPU-bound

### "Paint time still high"

**Diagnostic:**
1. Record performance profile
2. Expand "Paint" operations in timeline
3. See which elements are being repainted
4. Check if animating width/height (bad) vs transform (good)
5. Verify will-change hints in place
6. Check for layout thrashing (forced reflow)

### "Composite time worse than before"

**Possible causes:**
1. Too many layers (>100) - audit will-change
2. Layers too large - apply contain: content
3. GPU memory pressure - reduce layer count
4. Normal variation (±0.5ms is OK)

### "Memory growing over time"

**Debug steps:**
1. Take heap snapshot baseline
2. Perform action 10 times
3. Force garbage collection (DevTools → Memory → 🗑️)
4. Take second snapshot
5. Compare - look for "Detached DOM nodes"
6. Check event listeners, intervals, closures

---

## Advanced: Long Animation Frames API

### Setup LoAF Monitoring (Chrome 123+)

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const loaf = entry;

    if (loaf.duration > 50) {
      console.warn('Long Animation Frame:', {
        duration: loaf.duration,
        blockingDuration: loaf.blockingDuration,
        renderStart: loaf.renderStart,
        scripts: loaf.scripts?.map(s => ({
          sourceURL: s.sourceURL,
          sourceFunctionName: s.sourceFunctionName,
          duration: s.duration
        }))
      });

      // Send to analytics
      reportPerformanceIssue('long_animation_frame', loaf);
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

This is the most powerful tool for debugging INP issues - see which scripts caused long frames.

---

## Keyboard Shortcuts

```
Cmd+Option+I         Open DevTools
Cmd+Shift+R          Hard refresh (clear cache)
Cmd+E (in DevTools)  Start/stop recording
Cmd+F (in Profile)   Search in profile data
Escape               Toggle console drawer
```

---

## Export and Share

### Export Performance Profile
```
1. DevTools → Performance tab
2. Record profile
3. Click "Save profile" (💾 icon)
4. Share .json file with team
```

### Export Heap Snapshot
```
1. DevTools → Memory tab
2. Take snapshot
3. Right-click snapshot → Save
4. Share .heapsnapshot file
```

---

## Resources

- [Chrome DevTools Performance Docs](https://developer.chrome.com/docs/devtools/performance/)
- [Paint Flashing Guide](https://developer.chrome.com/docs/devtools/rendering/performance/)
- [Long Animation Frames API](https://developer.chrome.com/blog/long-animation-frames/)
- [Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
