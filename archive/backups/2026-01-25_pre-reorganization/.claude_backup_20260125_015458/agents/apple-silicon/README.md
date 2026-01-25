# Apple Silicon M-Series Agent Suite

Complete set of specialized agents for optimizing PWAs and web applications on Apple M-series chips (M4, M4 Pro, M4 Max, M4 Ultra) running macOS 26.2 (Sequoia).

## Agent Directory

### Tier 1: Sonnet Agents (Deep Optimization)

#### 1. m-series-performance-optimizer.md
**Tier**: Sonnet | **Platform**: Apple Silicon M-series | **Version**: 1.0.0

Comprehensive performance optimization specialist for Apple M-series unified memory architecture (UMA), Metal GPU acceleration, Neural Engine utilization, power efficiency, ProMotion 120Hz rendering, thermal management, and background process scheduling.

**Capabilities**:
- Unified Memory Architecture (UMA) optimization
- Metal GPU acceleration patterns and compute kernels
- Neural Engine (ANE) utilization for ML workloads
- Power efficiency optimization (QoS-based core scheduling)
- ProMotion 120Hz display optimization (8.33ms frame budget)
- Thermal management and dynamic throttling
- Background process E-core efficiency

**Skills**: UMA-optimization, Metal-GPU, Neural-Engine, power-efficiency, thermal-management, P-E-core-scheduling, ProMotion-rendering, background-processes

**When to Delegate TO**:
- webgpu-metal-bridge: WebGPU GPU acceleration
- pwa-macos-specialist: macOS system integration
- chromium-m-series-debugger: DevTools analysis
- energy-efficiency-auditor: Battery audit

**When to Receive FROM**:
- Generic performance-optimizer: Platform-agnostic optimization
- ai-ml-engineer: Neural Engine requests
- devops-engineer: Build optimization

**File**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/m-series-performance-optimizer.md`

---

#### 2. webgpu-metal-bridge.md
**Tier**: Sonnet | **Platform**: Apple Silicon M-series | **Version**: 1.0.0

WebGPU to Metal translation layer specialist. Bridges high-level WebGPU APIs to Metal's lower-level GPU access, optimizing for Apple M-series GPU architecture with unified memory and tile-based deferred rendering (TBDR).

**Capabilities**:
- WebGPU to Metal API mapping
- WGSL to Metal Shading Language (MSL) compilation
- GPU memory management (shared, private, memoryless storage)
- Compute shader optimization for M-series
- Render pipeline optimization for TBDR
- M-series GPU architecture understanding

**Skills**: WebGPU-Metal-mapping, shader-compilation, GPU-memory-management, compute-kernels, render-pipeline-optimization, M-series-GPU-architecture

**M-series GPU Details**:
- M4: 10 cores, 60 GB/s bandwidth
- M4 Pro: 20 cores, 120 GB/s bandwidth
- M4 Max: 40 cores, 250 GB/s bandwidth
- SIMD width: 32 (Apple GPU)
- Optimal thread group size: 256-512
- TBDR: Tile-based deferred rendering (cache-friendly)

**When to Delegate TO**:
- m-series-performance-optimizer: CPU-side optimization
- pwa-macos-specialist: macOS integration
- chromium-m-series-debugger: DevTools debugging

**When to Receive FROM**:
- Generic performance-optimizer: GPU optimization requests
- ai-ml-engineer: Metal ML kernels
- frontend-engineer: WebGPU integration

**File**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/webgpu-metal-bridge.md`

---

#### 3. pwa-macos-specialist.md
**Tier**: Sonnet | **Platform**: Apple Silicon M-series | **Version**: 1.0.0

macOS PWA integration specialist for native-like app experiences on macOS 26.2. Covers Window Controls Overlay, File Handlers, Dock integration, system fonts, native gestures, dark mode, accent colors, and cutting-edge Sequoia features.

**Capabilities**:
- Window Controls Overlay (WCO) positioning and CSS
- File Handler registration and launchqueue handling
- Dock badge integration (notification count)
- Dock shortcuts (quick actions)
- System font matching (SF Pro, SF Mono)
- Native gesture support (trackpad swipes, keyboard shortcuts)
- Dark mode and system accent color detection
- macOS 26.2 specific APIs (media session, advanced notifications, directory picker)

**Skills**: Window-Controls-Overlay, file-handlers, Dock-integration, system-fonts, native-gestures, dark-mode, accent-colors, macOS-26-2-features, launch-handlers

**WCO Safe Areas**:
- Left inset: ~70px (close/minimize/zoom buttons)
- Right inset: ~68px (fullscreen button)
- Top inset: 28px (title bar height)
- env(titlebar-area-x), env(titlebar-area-width), env(titlebar-area-height)

**File Handler Manifest**:
```json
{
    "file_handlers": [{
        "action": "/handle-file",
        "accept": {"application/json": [".json", ".jsonc"]},
        "launch_type": "single-client"
    }]
}
```

**When to Delegate TO**:
- m-series-performance-optimizer: Performance implications
- macos-pwa-tester: Feature validation
- chromium-m-series-debugger: DevTools debugging

**When to Receive FROM**:
- frontend-engineer: UI/UX requests
- pwa-engineer: Generic PWA features
- macos-system-expert: OS-level APIs

**File**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/pwa-macos-specialist.md`

---

### Tier 2: Haiku Agents (Fast Validation)

#### 4. chromium-m-series-debugger.md
**Tier**: Haiku | **Platform**: Apple Silicon M-series | **Version**: 1.0.0

Fast performance debugging specialist using Chrome DevTools on Apple Silicon. Profiles CPU/GPU, analyzes memory snapshots, debugs GPU timelines, layer composition, paint performance, and animation frame issues.

**Capabilities**:
- DevTools Performance profiling (flamechart analysis)
- Memory snapshot analysis (heap size, detached DOM)
- GPU timeline debugging (composite layers, paint events)
- Layer composition analysis (show layer borders, paint flashing)
- Paint performance debugging (reduce repaints)
- Animation frame analysis (FPS meter, frame rate drops)

**Core Metrics**:
- FCP (First Contentful Paint): <1.8s ✓
- LCP (Largest Contentful Paint): <2.5s ✓
- FID (First Input Delay): <100ms ✓
- Frame rate: 60fps minimum (8.33ms budget), 120fps on ProMotion (8.33ms)

**Quick Commands**:
```javascript
// Check if native or Rosetta
navigator.hardwareConcurrency >= 8 ? 'Likely native' : 'Possibly Rosetta';

// Memory usage
performance.memory?.usedJSHeapSize / 1_000_000  // MB

// Mark slow operations
performance.mark('start');
// ... code ...
performance.mark('end');
performance.measure('operation', 'start', 'end');
```

**Common M-Series Issues**:
- Rosetta 2 translation slowdown (provide arm64 build)
- GPU memory pressure (unified memory saturated)
- Thermal throttling (>100°C P-core, >90°C E-core)
- Layout thrashing (DOM read/write batching)
- Memory leaks (detached DOM nodes)

**Profiling Targets**:
- <3s page load
- <1s first paint
- <100ms interaction response
- 60fps animations (16.67ms budget)
- 120fps on ProMotion (8.33ms budget)
- <500MB heap usage
- <2GB GPU memory

**When to Delegate TO**:
- m-series-performance-optimizer: Deep optimization
- webgpu-metal-bridge: GPU acceleration
- energy-efficiency-auditor: Battery analysis

**File**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/chromium-m-series-debugger.md`

---

#### 5. macos-pwa-tester.md
**Tier**: Haiku | **Platform**: Apple Silicon M-series | **Version**: 1.0.0

Fast macOS PWA testing specialist. Validates installation, offline behavior, file handlers, notifications, update flows, and cross-version compatibility on macOS 13-26.2.

**Capabilities**:
- PWA installation testing (manifest validation, Dock appearance)
- Offline behavior validation (service worker, caching)
- File handler testing (launchqueue, drag-and-drop)
- Notification testing (permission flow, Notification Center)
- Update flow testing (service worker updates, rollback)
- Cross-version compatibility (macOS 13, 14, 15, 26.2)

**Test Checklist**:

**Installation**:
- Manifest valid (name, icons, display, theme_color)
- App appears in ~/Applications
- App appears in Dock (if pinned)
- Icon renders correctly
- Title bar shows app name

**Offline**:
- Service worker installed and running
- Pages load from cache when offline
- Navigation works between cached pages
- Network error recovery implemented

**File Handlers**:
- PWA appears in "Open With" menu
- Files launch with correct content
- launchqueue event fires
- File save-back works with File System Access API

**Notifications**:
- Permission request displays
- Notifications appear in Notification Center
- Dock badge shows unread count
- Notification actions work

**Updates**:
- Service worker updates detected
- New version loads on reload
- Rollback to previous version works
- Users notified of updates

**Cross-Version**:
- Tested on macOS 13, 14, 15, 26.2
- Feature detection implemented
- Graceful fallbacks for older versions
- Hardware: M4, M4 Pro tested

**Quick Test Script**:
```javascript
class PWATestSuite {
    async runTests() {
        return {
            installation: await this.testInstallation(),
            offline: await this.testOffline(),
            fileHandlers: await this.testFileHandlers(),
            notifications: await this.testNotifications(),
            updates: await this.testUpdates()
        };
    }
}
```

**When to Delegate TO**:
- m-series-performance-optimizer: Performance optimization
- pwa-macos-specialist: Feature implementation
- chromium-m-series-debugger: DevTools debugging

**File**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/macos-pwa-tester.md`

---

#### 6. energy-efficiency-auditor.md
**Tier**: Haiku | **Platform**: Apple Silicon M-series | **Version**: 1.0.0

Battery impact assessment specialist for macOS PWAs on Apple Silicon. Analyzes background processes, wake lock usage, network batching, animation efficiency, and idle state optimization.

**Capabilities**:
- Battery impact assessment (Activity Monitor, Energy Impact)
- Background process analysis (prevent sleep, App Nap)
- Wake lock usage detection (timers, polling)
- Network request batching (reduce wake cycles)
- Animation efficiency profiling (frame drops, GPU acceleration)
- Idle state optimization (pause tasks when backgrounded)

**Energy Impact Levels**:
- **Green**: <2% impact (good, 1-2% battery per hour)
- **Yellow**: 2-5% impact (acceptable, 2-5% battery per hour)
- **Red**: >5% impact (problematic, 5-20% battery per hour)

**Power Draw by Activity**:
| Activity | Power | Duration | Total Impact |
|---|---|---|---|
| Idle | 0.5W | Continuous | Minimal |
| Timer fire | 1-2W | 100ms | 0.1-0.2 Wh |
| Network request | 1-2W | 500ms-2s | 0.5-4 Wh |
| GPU compute | 3-5W | 500ms | 0.4-2.7 Wh |
| 60fps rendering | 2-3W | Continuous | 2-3W sustained |

**Battery Test Matrix**:
- Baseline: App idle (background)
- Light use: Web browsing, light animations
- Heavy use: GPU compute, network intensive
- Measurement: 5-10 minutes per scenario

**Optimization Patterns**:
- Batch network requests (1 wake cycle vs many)
- Use CSS animations (GPU accelerated) not DOM manipulation
- Pause tasks when backgrounded (visibilitychange event)
- Poll via push notifications, not timers
- Release wake locks immediately after use

**Improvement Targets**:
- 10% battery per hour → poor (problematic)
- 2-5% battery per hour → good (acceptable)
- <1% battery per hour → excellent (optimal)

**Battery Drain Audit Report**:
```
ENERGY EFFICIENCY AUDIT REPORT
==============================
App: [Name]
Idle Power: [X]W
Peak Power: [Y]W
Battery Drain: [Z]% per hour

ISSUES FOUND
============
1. Polling timer (1s) - 1-2W impact
2. Animation frame drops (>5%) - 1W impact
3. Sequential network requests - 2-3W impact

IMPROVEMENTS
============
Before: 10% per hour
After: 2% per hour (80% improvement)
```

**When to Delegate TO**:
- m-series-performance-optimizer: CPU optimization
- chromium-m-series-debugger: DevTools profiling

**File**: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/energy-efficiency-auditor.md`

---

## Architecture & Coordination

### Agent Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│         Generic Performance Optimizer (external)             │
└────────────────┬────────────────────────────────────────────┘
                 │ delegates to
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  M-Series Performance Optimizer (Sonnet - Deep expertise)   │
├─────────────────────────────────────────────────────────────┤
│ Core responsibilities:                                       │
│ • Unified Memory Architecture (UMA)                         │
│ • Metal GPU acceleration                                    │
│ • Neural Engine (ANE) utilization                           │
│ • Power efficiency (QoS scheduling)                         │
│ • ProMotion 120Hz rendering                                 │
│ • Thermal management                                        │
│ • Background process optimization                           │
└──┬──────┬──────────┬────────────┬──────────────────────────┘
   │      │          │            │
   │delegates to:    │            │
   ▼      ▼          ▼            ▼
[WebGPU] [PWA]   [DevTools]  [Energy]
[Metal]  [macOS] [Debugger]  [Auditor]
Bridge   Spec.   (Haiku)     (Haiku)
(Sonnet) (Sonnet)

┌─────────────────────────────────────────────────────────────┐
│  Support Agents (Haiku - Fast validation)                   │
├─────────────────────────────────────────────────────────────┤
│ • Chromium M-Series Debugger - DevTools profiling           │
│ • macOS PWA Tester - Feature validation                     │
│ • Energy Efficiency Auditor - Battery analysis              │
└─────────────────────────────────────────────────────────────┘
```

### Communication Flow

**Typical Optimization Workflow**:

```
1. User: "Web app slow and draining battery on M4 Pro"

2. M-Series Optimizer receives request
   ├─ Profile with Instruments
   ├─ Identify bottleneck (GPU? Network? CPU?)
   │
   ├─ If GPU → delegate to WebGPU-Metal-Bridge
   │  └─ Optimize Metal kernels
   │     └─ Report back GPU speedup
   │
   ├─ If macOS UI issue → delegate to PWA-macOS-Specialist
   │  └─ Optimize Window Controls Overlay or Dock
   │     └─ Report back UI responsiveness
   │
   ├─ If battery drain → delegate to Energy-Efficiency-Auditor
   │  └─ Profile with Energy Log
   │  └─ Identify wake locks, timers, network polls
   │     └─ Report back optimization priorities
   │
   └─ Synthesize all results
      └─ Return comprehensive optimization plan

3. For DevTools debugging → delegate to Chromium-M-Series-Debugger
   ├─ Record performance trace
   ├─ Analyze flamechart
   └─ Return root cause

4. For PWA validation → delegate to macOS-PWA-Tester
   ├─ Test installation
   ├─ Test offline mode
   ├─ Test file handlers
   └─ Return test results
```

---

## Quick Start Guide

### For Performance Optimization
1. **Start with**: m-series-performance-optimizer.md
2. **Identify bottleneck**: GPU? Network? CPU?
3. **Delegate appropriately**: GPU → webgpu-metal-bridge, Battery → energy-efficiency-auditor
4. **Debug with DevTools**: chromium-m-series-debugger.md

### For PWA Development
1. **Start with**: pwa-macos-specialist.md
2. **Implement features**: Window Controls Overlay, File Handlers, Dark Mode
3. **Test thoroughly**: macos-pwa-tester.md
4. **Validate battery**: energy-efficiency-auditor.md

### For Quick Debugging
1. **Performance issue**: chromium-m-series-debugger.md (DevTools profile)
2. **Battery drain**: energy-efficiency-auditor.md (identify wake locks)
3. **PWA feature not working**: macos-pwa-tester.md (validation checklist)

---

## File Locations

All agent definitions are located in:
```
/Users/louisherman/ClaudeCodeProjects/.claude/agents/apple-silicon/
```

**Files**:
1. `m-series-performance-optimizer.md` (23K, Sonnet)
2. `webgpu-metal-bridge.md` (32K, Sonnet)
3. `pwa-macos-specialist.md` (37K, Sonnet)
4. `chromium-m-series-debugger.md` (8.2K, Haiku)
5. `macos-pwa-tester.md` (12K, Haiku)
6. `energy-efficiency-auditor.md` (14K, Haiku)
7. `README.md` (this file)

**Total**: ~140KB of specialized expertise

---

## M-Series Hardware Reference

### M4 Chip Family (2024-2025)

| Chip | CPU Cores | GPU Cores | Neural Engine | Memory Bandwidth | Sustained Power |
|------|-----------|-----------|---------------|------------------|-----------------|
| M4 | 10 (4P+6E) | 10 | 38 TOPS | 60 GB/s | 20-25W |
| M4 Pro | 14 (10P+4E) | 20 | 38 TOPS | 120 GB/s | 40-50W |
| M4 Max | 16 (12P+4E) | 40 | 38 TOPS | 250 GB/s | 80-100W |
| M4 Ultra | 32 (24P+8E) | 80 | 76 TOPS | 400 GB/s | 150-200W |

**Core Types**:
- **P-cores** (Performance): High frequency, high power (~2.5-3.0 GHz, 0.5W each)
- **E-cores** (Efficiency): Medium frequency, low power (~2.0-2.5 GHz, 0.05W each)

**Optimal QoS Mapping**:
- `userInteractive`: P-cores (low latency)
- `userInitiated`: P-cores (responsive)
- `utility`: E-cores (background work)
- `background`: E-cores (maintenance)

---

## Performance Targets by Workload

### Web Browsing
- **Target**: <3% battery per hour, 60fps scrolling
- **Optimization**: Smooth scroll listeners, CSS transforms, lazy loading

### Real-time Vision AI
- **Target**: ANE 38 TOPS, <33ms latency per frame
- **Optimization**: Use Core ML with ANE compute units, batch inference

### GPU-Accelerated Graphics
- **Target**: 60fps sustained, <50 GB/s memory bandwidth
- **Optimization**: Shared buffers, private GPU textures, TBDR rendering

### PWA Offline Sync
- **Target**: <1 Wh per sync cycle, <100ms latency
- **Optimization**: Batch network requests, coalesced notifications

---

## macOS 26.2 (Sequoia) Features

| Feature | API | Use Case |
|---------|-----|----------|
| Window Controls Overlay | `navigator.windowControlsOverlay` | Full-screen PWA title bar |
| File Handlers | `launchqueue` | Default file editor |
| Dock Shortcuts | `manifest.shortcuts` | Quick actions |
| Dock Badge | `navigator.setAppBadge()` | Unread count |
| Media Session | `navigator.mediaSession` | Playback controls |
| Directory Picker | `window.showDirectoryPicker()` | Project folders |
| Share API | `navigator.share()` | Native share menu |
| Screen Capture | `navigator.mediaDevices.getDisplayMedia()` | Recording |
| Advanced Notifications | `UNUserNotificationCenter` | Rich alerts |
| Accent Colors | CSS `system-colors` | Theme matching |
| Dark Mode | `prefers-color-scheme` | Theme detection |

---

## Support & Escalation

### When to Use Each Agent

**m-series-performance-optimizer**:
- "App is slow on M4"
- "How do I optimize for Apple Silicon?"
- "Thermal throttling issues"
- "Battery drain from background work"

**webgpu-metal-bridge**:
- "WebGPU compute shaders are slow"
- "How do I use Metal directly?"
- "GPU memory optimization"
- "Render pipeline performance"

**pwa-macos-specialist**:
- "How do I integrate with Dock?"
- "Set file handlers for .json"
- "Dark mode not working"
- "Window Controls Overlay positioning"

**chromium-m-series-debugger**:
- "How do I profile with DevTools?"
- "Frame drops on ProMotion display"
- "Memory leak detection"
- "GPU timeline analysis"

**macos-pwa-tester**:
- "How do I test PWA installation?"
- "File handlers not working"
- "Offline mode validation"
- "Cross-version compatibility"

**energy-efficiency-auditor**:
- "App drains battery too fast"
- "How do I reduce wake locks?"
- "Network request batching"
- "Animation efficiency"

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-21 | 1.0.0 | Initial release with 6 agents |

---

## License & Attribution

These agents are optimized for Apple Silicon M-series chips running macOS 26.2 (Sequoia) and Chromium 143+. Built on Claude Opus 4.5 and Claude Sonnet 4 with Haiku support for fast validation.

**Platform**: Apple Silicon M-series (M4, M4 Pro, M4 Max, M4 Ultra)
**OS**: macOS 26.2 (Sequoia) and compatible versions
**Browser**: Chromium 143+
**Hardware Target**: MacBook Pro M4, M4 Pro, M4 Max; Mac mini M4; Mac Studio M4 Max/Ultra

---

## Contact & Feedback

For issues, improvements, or new capabilities, refer to individual agent files for detailed system prompts and delegation patterns.

Each agent maintains autonomy while coordinating with related specialists for comprehensive optimization across:
- **Performance**: CPU, GPU, ANE acceleration
- **Integration**: macOS Dock, File Handlers, system features
- **Efficiency**: Battery, thermal, background processes
- **Quality**: Testing, debugging, validation

---

Generated: 2025-01-21 | Apple Silicon M-Series Optimization Suite v1.0.0
