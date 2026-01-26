---
name: quick
version: 1.0.0
description: **Problem → Agent**
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: deployment
complexity: intermediate
tags:
  - deployment
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

# Migration metadata
migrated_from: projects/dmb-almanac/.claude/agents/apple-silicon/QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# Apple Silicon M-Series Agents - Quick Reference

## Agent Selection Matrix

**Problem → Agent**

| Problem | Primary Agent | Secondary Agent |
|---------|---------------|-----------------|
| App slow on M4 | m-series-performance-optimizer | chromium-m-series-debugger |
| Battery draining | energy-efficiency-auditor | m-series-performance-optimizer |
| GPU computation | webgpu-metal-bridge | m-series-performance-optimizer |
| Frame drops | m-series-performance-optimizer | chromium-m-series-debugger |
| PWA not installing | macos-pwa-tester | pwa-macos-specialist |
| File handlers broken | macos-pwa-tester | pwa-macos-specialist |
| Dock features missing | pwa-macos-specialist | macos-pwa-tester |
| DevTools profiling | chromium-m-series-debugger | m-series-performance-optimizer |
| Memory leaks | chromium-m-series-debugger | m-series-performance-optimizer |
| Thermal throttling | m-series-performance-optimizer | energy-efficiency-auditor |
| WebGPU slow | webgpu-metal-bridge | m-series-performance-optimizer |
| Dark mode not working | pwa-macos-specialist | chromium-m-series-debugger |
| Window Controls Overlay | pwa-macos-specialist | chromium-m-series-debugger |
| Offline mode failing | macos-pwa-tester | m-series-performance-optimizer |
| Neural Engine | m-series-performance-optimizer | chromium-m-series-debugger |
| Network batching | energy-efficiency-auditor | m-series-performance-optimizer |
| Animation jank | m-series-performance-optimizer | chromium-m-series-debugger |
| Service worker issues | macos-pwa-tester | m-series-performance-optimizer |
| Power draw high | energy-efficiency-auditor | m-series-performance-optimizer |

---

## Tier Breakdown

### Tier 1: Sonnet Agents (Deep Expertise)

```
┌─ m-series-performance-optimizer.md (23KB)
│  └─ Unified Memory, Metal GPU, Neural Engine, Power, Thermal, 120Hz
│
├─ webgpu-metal-bridge.md (32KB)
│  └─ WebGPU→Metal, Shader Compilation, GPU Memory, Compute, Render
│
└─ pwa-macos-specialist.md (37KB)
   └─ Window Controls, File Handlers, Dock, System Fonts, Gestures, Dark Mode
```

### Tier 2: Haiku Agents (Fast Validation)

```
┌─ chromium-m-series-debugger.md (8.2KB)
│  └─ DevTools, Memory, GPU Timeline, Paint, Animation FPS
│
├─ macos-pwa-tester.md (12KB)
│  └─ Installation, Offline, File Handlers, Notifications, Updates, Versions
│
└─ energy-efficiency-auditor.md (14KB)
   └─ Battery, Background, Wake Locks, Network Batching, Animation, Idle
```

---

## Performance Targets (Apple Silicon M4)

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | <1.8s | chromium-m-series-debugger |
| Largest Contentful Paint | <2.5s | chromium-m-series-debugger |
| Frame Rate (60fps) | 16.67ms/frame | m-series-performance-optimizer |
| Frame Rate (120fps) | 8.33ms/frame | m-series-performance-optimizer |
| Interaction Response | <100ms | m-series-performance-optimizer |
| CPU Usage (idle) | <5% | chromium-m-series-debugger |
| Memory Heap | <500MB | chromium-m-series-debugger |
| GPU Utilization | >85% | webgpu-metal-bridge |
| Battery Drain (idle) | <1% per hour | energy-efficiency-auditor |
| Battery Drain (browsing) | 2-5% per hour | energy-efficiency-auditor |
| Battery Drain (heavy) | 5-10% per hour | energy-efficiency-auditor |

---

## M-Series Hardware Specs

### M4 (Consumer)
- CPU: 10 cores (4P + 6E)
- GPU: 10 cores
- ANE: 38 TOPS
- Memory: Shared, 24GB max
- Bandwidth: 60 GB/s
- Power Budget: 20-25W sustained

### M4 Pro (Professional)
- CPU: 14 cores (10P + 4E)
- GPU: 20 cores
- ANE: 38 TOPS
- Memory: Shared, 36GB max
- Bandwidth: 120 GB/s
- Power Budget: 40-50W sustained

### M4 Max (Workstation)
- CPU: 16 cores (12P + 4E)
- GPU: 40 cores
- ANE: 38 TOPS
- Memory: Shared, 96GB max
- Bandwidth: 250 GB/s
- Power Budget: 80-100W sustained

### M4 Ultra (High-end)
- CPU: 32 cores (24P + 8E)
- GPU: 80 cores
- ANE: 76 TOPS (dual)
- Memory: Shared, 192GB max
- Bandwidth: 400 GB/s
- Power Budget: 150-200W sustained

---

## Key APIs & Technologies

### Optimization APIs
- **Metal**: GPU acceleration (webgpu-metal-bridge)
- **Core ML**: ML inference with ANE support (m-series-performance-optimizer)
- **Accelerate**: SIMD/BLAS operations (m-series-performance-optimizer)
- **DispatchQueue**: QoS-based scheduling (m-series-performance-optimizer)
- **ProcessInfo**: Thermal state monitoring (m-series-performance-optimizer)

### PWA APIs
- **Window Controls Overlay**: `navigator.windowControlsOverlay` (pwa-macos-specialist)
- **File Handlers**: `launchqueue`, File System Access (pwa-macos-specialist)
- **App Badge**: `navigator.setAppBadge()` (pwa-macos-specialist)
- **Media Session**: `navigator.mediaSession` (pwa-macos-specialist)
- **Service Workers**: Offline, caching (macos-pwa-tester)

### Profiling APIs
- **Performance API**: `performance.mark/measure` (chromium-m-series-debugger)
- **DevTools**: Chrome DevTools profiling (chromium-m-series-debugger)
- **Battery API**: `navigator.getBattery()` (energy-efficiency-auditor)
- **Wake Lock API**: `navigator.wakeLock.request()` (energy-efficiency-auditor)

---

## File Locations

```
/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/

├── m-series-performance-optimizer.md ........... Sonnet (23KB)
├── webgpu-metal-bridge.md ..................... Sonnet (32KB)
├── pwa-macos-specialist.md .................... Sonnet (37KB)
├── chromium-m-series-debugger.md .............. Haiku (8.2KB)
├── macos-pwa-tester.md ........................ Haiku (12KB)
├── energy-efficiency-auditor.md ............... Haiku (14KB)
├── README.md ................................. Overview (21KB)
└── QUICK_REFERENCE.md ......................... This file
```

**Total**: ~164KB | ~4,784 lines | 6 agents + documentation

---

## Common Workflows

### Workflow 1: "App is slow and drains battery"

```
1. Open chromium-m-series-debugger
   └─ Record DevTools Performance profile
   └─ Identify bottleneck (CPU? GPU? Network?)

2. Based on bottleneck:
   ├─ GPU slow? → webgpu-metal-bridge
   │  └─ Optimize Metal kernels, memory transfers
   │
   ├─ CPU slow? → m-series-performance-optimizer
   │  └─ Profile QoS, thermal state, long tasks
   │
   └─ Battery drain? → energy-efficiency-auditor
      └─ Check wake locks, timers, animation FPS

3. Re-profile with chromium-m-series-debugger
   └─ Validate improvements
```

### Workflow 2: "PWA not working on macOS"

```
1. Open macos-pwa-tester
   ├─ Test installation (manifest, Dock, app package)
   ├─ Test offline mode (service worker, caching)
   ├─ Test file handlers (launchqueue events)
   ├─ Test notifications (permission, Notification Center)
   └─ Test updates (service worker refresh)

2. For each failing test, delegate:
   ├─ Installation issue? → pwa-macos-specialist
   │  └─ Check manifest, Window Controls Overlay
   │
   ├─ File handler issue? → pwa-macos-specialist
   │  └─ Verify file_handlers in manifest
   │
   └─ Performance issue? → m-series-performance-optimizer
      └─ Profile with Instruments
```

### Workflow 3: "WebGPU compute shader is slow"

```
1. Open webgpu-metal-bridge
   ├─ Analyze WGSL shader complexity
   ├─ Check thread group size (optimal: 256-512 for M4)
   └─ Profile memory access patterns

2. Translate to Metal
   ├─ Check for register pressure
   ├─ Optimize for Apple GPU SIMD width (32)
   └─ Use shared memory for repeated lookups

3. Profile with m-series-performance-optimizer
   ├─ Measure GPU utilization (target: >85%)
   ├─ Check memory bandwidth (60+ GB/s on M4)
   └─ Validate thermal state

4. Debug with chromium-m-series-debugger
   └─ Enable GPU timeline in DevTools
```

---

## Key Metrics Reference

### FPS & Frame Time
```
60fps target:  16.67ms per frame (60Hz)
120fps target: 8.33ms per frame (120Hz ProMotion)

Frame drop = frame time > budget
Jank = multiple consecutive frame drops
```

### Memory
```
Heap target: <500MB for web apps
Detached DOM: Indicates memory leaks
Retained size: Memory freed if object removed
```

### Energy Impact (macOS)
```
Green:  <2% - Good
Yellow: 2-5% - Acceptable
Red:    >5% - Problematic
```

### Battery Runtime
```
10% per hour: Poor (need optimization)
5% per hour: Acceptable
2% per hour: Good (typical browsing)
<1% per hour: Excellent (idle/light use)
```

---

## DevTools Quick Commands

```javascript
// Check CPU cores
navigator.hardwareConcurrency  // 10 on M4, 14 on M4 Pro

// Check memory
performance.memory?.usedJSHeapSize / 1e6  // MB

// Mark operation
performance.mark('start');
// ... work ...
performance.mark('end');
performance.measure('op', 'start', 'end');

// Get measurements
performance.getEntriesByType('measure')

// Check if native or Rosetta
navigator.hardwareConcurrency >= 8 ? 'Native' : 'Rosetta?'

// FPS measurement
let frameCount = 0;
setInterval(() => console.log(`FPS: ${frameCount}`), 1000);
requestAnimationFrame(() => { frameCount++; });

// Thermal state (if available)
const state = ProcessInfo?.thermalState
// nominal, fair, serious, critical
```

---

## Integration Checklist

- [ ] All 6 agents deployed in `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/`
- [ ] README.md reviewed for architecture and delegation patterns
- [ ] QUICK_REFERENCE.md printed for team reference
- [ ] Each agent tested independently
- [ ] Cross-delegation patterns validated
- [ ] Performance targets understood
- [ ] Hardware specs documented
- [ ] Workflows practiced on M4/M4 Pro hardware

---

## Support Matrix

| Issue | Recommended Agent | Escalation |
|-------|-------------------|-----------|
| Performance question | m-series-performance-optimizer | chromium-m-series-debugger |
| GPU acceleration | webgpu-metal-bridge | m-series-performance-optimizer |
| macOS integration | pwa-macos-specialist | macos-pwa-tester |
| DevTools help | chromium-m-series-debugger | m-series-performance-optimizer |
| Battery impact | energy-efficiency-auditor | m-series-performance-optimizer |
| PWA testing | macos-pwa-tester | pwa-macos-specialist |
| Feature unclear | Check README.md | Refer to agent system prompt |

---

## Version Info

- **Suite Version**: 1.0.0
- **Created**: 2025-01-21
- **Target Platform**: Apple Silicon M-series (M4, M4 Pro, M4 Max, M4 Ultra)
- **Target OS**: macOS 26.2 (Sequoia)
- **Browser**: Chromium 143+
- **Agent Framework**: Claude Opus 4.5 + Sonnet 4 + Haiku

---

## Quick Links

- **Main Readme**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/README.md`
- **Performance**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/m-series-performance-optimizer.md`
- **GPU/Metal**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/webgpu-metal-bridge.md`
- **macOS PWA**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/pwa-macos-specialist.md`
- **DevTools**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/chromium-m-series-debugger.md`
- **Testing**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/macos-pwa-tester.md`
- **Battery**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/energy-efficiency-auditor.md`

---

**Last Updated**: 2025-01-21 | Apple Silicon M-Series Agent Suite v1.0.0
