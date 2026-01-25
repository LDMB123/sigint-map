---
name: energy-efficiency-auditor
description: Battery impact assessment for Apple Silicon PWAs, background process analysis, wake lock usage, network request batching, animation efficiency, and idle state optimization
version: 1.0.0
tier: haiku
platform: apple-silicon-m-series
os: macos-26.2
browser: chromium-143+
tools: [energy-log-profiler, battery-api, wake-lock-api, network-monitor, animation-profiler, thermal-state-api]
skills: [battery-impact-assessment, background-process-analysis, wake-lock-usage, network-batching, animation-efficiency, idle-optimization]
---

# Energy Efficiency Auditor Agent

## Overview

Fast battery impact assessment for macOS PWAs on Apple Silicon. Analyzes background processes, wake lock usage, network batching, animation efficiency, and idle state optimization to maximize battery runtime.

## Quick Energy Audit Checklist

### 1. Battery Impact Assessment

**Baseline Measurement**:
1. Open Activity Monitor (Cmd+Space → "Activity Monitor")
2. Sort by "Energy Impact" column
3. Note baseline power draw
4. Run app for 5 minutes
5. Check if Energy Impact increases

**Energy Impact Levels**:
- **Green**: <2% impact (good)
- **Yellow**: 2-5% impact (acceptable)
- **Red**: >5% impact (problematic)

**Quick Energy Test**:

```javascript
// Quick power draw estimate
class EnergyAudit {
    measurePower() {
        const cpuBefore = performance.now();
        const memBefore = performance.memory?.usedJSHeapSize;

        // Run test workload
        let sum = 0;
        for (let i = 0; i < 1_000_000; i++) {
            sum += Math.sqrt(i);
        }

        const cpuAfter = performance.now();
        const memAfter = performance.memory?.usedJSHeapSize;

        const cpuMs = cpuAfter - cpuBefore;
        const memMB = (memAfter - memBefore) / 1_000_000;

        console.log(`CPU: ${cpuMs.toFixed(1)}ms, Memory: ${memMB.toFixed(1)}MB`);

        // Estimate power in watts (rough approximation)
        // P-core: ~0.1W per ms of work
        // E-core: ~0.01W per ms of work
        const estimatedPowerMs = cpuMs * 0.05;
        console.log(`Estimated power: ${estimatedPowerMs.toFixed(2)}mW`);
    }
}

const audit = new EnergyAudit();
audit.measurePower();
```

### 2. Background Process Analysis

**Check Background Activity**:
1. Activity Monitor → Energy tab
2. Look for "App Nap" column
3. Apps with "No" = preventing sleep (battery drain)
4. Check "Condition" column for background processes

**Background Process Impact**:

| Process Type | Power Draw | Duration | Total Impact |
|---|---|---|---|
| Idle | ~0.5W | Continuous | Minimal |
| Timer fired | ~1-2W | 100ms | 0.1-0.2 Wh per fire |
| Network request | ~1-2W | 500ms-2s | 0.5-4 Wh per request |
| GPU compute | ~3-5W | 500ms | 0.4-2.7 Wh per task |
| Rendering at 60fps | ~2-3W | Continuous | 2-3W sustained |

**Test Background Impact**:

```javascript
// Measure background activity
class BackgroundAnalyzer {
    monitorBackgroundTasks() {
        // Check if app is running in background
        document.addEventListener('visibilitychange', () => {
            const isVisible = document.visibilityState === 'visible';
            console.log(`App visible: ${isVisible}`);

            if (!isVisible) {
                // App is backgrounded
                this.pauseExpensiveTasks();
                this.stopAnimations();
                this.pauseNetworkPolling();
            } else {
                // App is foreground
                this.resumeTasks();
            }
        });
    }

    pauseExpensiveTasks() {
        console.log('Pausing background tasks (saving battery)');
    }

    stopAnimations() {
        // Stop requestAnimationFrame loops
        this.animationFrameId = null;
    }

    pauseNetworkPolling() {
        // Clear timers
        clearInterval(this.pollTimer);
        this.pollTimer = null;
    }

    resumeTasks() {
        console.log('Resuming tasks (app is foreground)');
    }
}

const analyzer = new BackgroundAnalyzer();
analyzer.monitorBackgroundTasks();
```

### 3. Wake Lock Usage

**Detect Wake Locks**:
1. DevTools → Application → Service Workers
2. Check for "No sleep" or wake lock indicators
3. Search console for `wake`, `sleep`, `power`

**Screen Wake Lock (rarely needed)**:

```javascript
// Keep screen on (use sparingly)
class ScreenWakeLock {
    async requestWakeLock() {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');

            // Release after 10 minutes
            setTimeout(() => {
                wakeLock.release();
            }, 600_000);

            console.log('Screen wake lock acquired');
        } catch (error) {
            console.error('Wake lock request failed:', error);
        }
    }

    setupAutoRelease() {
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                // Release wake lock when backgrounded
                await this.releaseWakeLock();
            }
        });
    }

    async releaseWakeLock() {
        // WakeLock automatically released on visibility change
        console.log('Wake lock released (app backgrounded)');
    }
}
```

**Power Management**:

```javascript
// Avoid unnecessary wake locks
// ANTI-PATTERN: Polling timer keeps CPU awake
setInterval(() => {
    checkForUpdates();  // Fires every 1s even when backgrounded
}, 1000);

// PATTERN: Use push notifications instead
// Server sends notification when update available
navigator.serviceWorker.addEventListener('push', (e) => {
    e.waitUntil(
        self.registration.showNotification('Update Available')
    );
});
```

### 4. Network Request Batching

**Measure Network Power**:
- Single request: ~1-2W × 500ms-2s = 0.5-4 Wh
- 10 sequential requests: 5-40 Wh
- 10 batched requests: 0.5-4 Wh (same as single request)

**Batch Network Requests**:

```javascript
// ANTI-PATTERN: Sequential requests
async function slowNetworkFlow() {
    await fetch('/api/users');
    await fetch('/api/projects');
    await fetch('/api/notifications');
    // Total: 3 wake cycles (energy intensive)
}

// PATTERN: Batch requests
async function efficientNetworkFlow() {
    const [users, projects, notifications] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/projects'),
        fetch('/api/notifications')
    ]);
    // Total: 1 wake cycle (efficient)
}

// PATTERN: Coalesce polls into single request
class NetworkBatcher {
    constructor() {
        this.pendingRequests = new Map();
        this.batchInterval = null;
    }

    queue(endpoint, params) {
        if (!this.pendingRequests.has(endpoint)) {
            this.pendingRequests.set(endpoint, []);
        }

        this.pendingRequests.get(endpoint).push(params);

        // Batch multiple requests within 100ms
        if (!this.batchInterval) {
            this.batchInterval = setTimeout(() => {
                this.flushBatch();
            }, 100);
        }
    }

    async flushBatch() {
        const requests = Array.from(this.pendingRequests.entries());

        for (const [endpoint, paramsList] of requests) {
            await fetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(paramsList)
            });
        }

        this.pendingRequests.clear();
        this.batchInterval = null;
    }
}

const batcher = new NetworkBatcher();
batcher.queue('/api/analytics', { event: 'click' });
batcher.queue('/api/analytics', { event: 'scroll' });
// Both sent in single request
```

**HTTP/2 Server Push**:

```javascript
// Prefer HTTP/2 push for multiple resources
// Instead of multiple round-trips, server pushes all at once
// Reduces connection overhead
```

### 5. Animation Efficiency

**Measure Animation Power**:
- 60fps animation: ~2-3W (GPU accelerated)
- 60fps with poor framerate (dropped frames): ~3-5W (GPU stalls, CPU fallback)
- Stopped animation: ~0.5W

**Profile Animation Performance**:

```javascript
// Monitor animation frame rate and power
class AnimationAudit {
    auditAnimation() {
        let frameCount = 0;
        let droppedFrames = 0;
        let totalTime = 0;

        const startTime = performance.now();
        const targetDuration = 5000;  // 5 seconds

        const measureFrame = () => {
            const now = performance.now();
            frameCount++;

            // Calculate expected frames at 60fps
            const expectedFrames = (now - startTime) / 16.67;
            if (frameCount < expectedFrames * 0.95) {
                droppedFrames++;
            }

            if (now - startTime < targetDuration) {
                requestAnimationFrame(measureFrame);
            } else {
                this.reportResults(frameCount, droppedFrames, now - startTime);
            }
        };

        requestAnimationFrame(measureFrame);
    }

    reportResults(frames, dropped, duration) {
        const avgFPS = (frames / duration) * 1000;
        const dropRate = (dropped / frames) * 100;

        console.log(`Animation audit:`);
        console.log(`  Frames: ${frames}`);
        console.log(`  Dropped: ${dropped} (${dropRate.toFixed(1)}%)`);
        console.log(`  Avg FPS: ${avgFPS.toFixed(1)}`);

        if (dropRate > 5) {
            console.warn('High frame drop rate detected (battery inefficient)');
        }
    }
}

const animAudit = new AnimationAudit();
animAudit.auditAnimation();
```

**Efficient Animation Patterns**:

```javascript
// ANTI-PATTERN: DOM manipulation per frame
function inefficientAnimation() {
    let x = 0;
    const animate = () => {
        x += 5;
        document.getElementById('box').style.left = x + 'px';  // Layout recalc every frame
        requestAnimationFrame(animate);
    };
    animate();
}

// PATTERN: CSS transforms (GPU accelerated)
function efficientAnimation() {
    const box = document.getElementById('box');
    let x = 0;

    const animate = () => {
        x += 5;
        box.style.transform = `translateX(${x}px)`;  // No layout recalc, GPU accelerated
        requestAnimationFrame(animate);
    };
    animate();
}

// PATTERN: CSS animations (most efficient)
const style = document.createElement('style');
style.textContent = `
    @keyframes slide {
        from { transform: translateX(0); }
        to { transform: translateX(1000px); }
    }

    #box {
        animation: slide 2s ease-in-out infinite;
    }
`;
document.head.appendChild(style);
```

### 6. Idle State Optimization

**Reduce Idle Power**:

| State | Power | Battery Drain |
|---|---|---|
| App hidden (idle) | ~0.5W | <1% per hour |
| App polling (1s timer) | ~1-2W | 2-5% per hour |
| App with animations | ~2-3W | 5-10% per hour |
| GPU compute | ~3-5W | 10-20% per hour |

**Optimize Idle Power**:

```javascript
// ANTI-PATTERN: Continuous polling
class BadIdleApp {
    constructor() {
        // Fires every 100ms even when idle
        setInterval(() => this.checkForUpdates(), 100);
    }

    checkForUpdates() {
        fetch('/api/updates').then(r => r.json());
    }
}

// PATTERN: Event-based idle handling
class EfficientIdleApp {
    constructor() {
        // Only check when user becomes active
        document.addEventListener('mousemove', () => this.onUserActive());
        document.addEventListener('keydown', () => this.onUserActive());

        // Use system idle detection (if available)
        this.setupIdleDetection();
    }

    setupIdleDetection() {
        // No polling - just listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAllTasks();
            } else {
                this.resumeTasks();
            }
        });
    }

    onUserActive() {
        // User is active, update if needed
        this.checkForUpdates();
    }

    pauseAllTasks() {
        // Cancel timers, clear intervals
        clearInterval(this.updateTimer);
        cancelAnimationFrame(this.animationId);
    }

    resumeTasks() {
        // Resume when visible
    }

    async checkForUpdates() {
        const response = await fetch('/api/updates');
        const data = await response.json();
        // Process updates
    }
}

const app = new EfficientIdleApp();
```

## Energy Audit Report Template

```
ENERGY EFFICIENCY AUDIT REPORT
==============================

App: [App Name]
Date: [Date]
Duration: [5-10 minutes]
Hardware: M4/M4 Pro/M4 Max
macOS: 26.2

BATTERY IMPACT
==============
Idle Power: [X]W
Peak Power: [Y]W
Estimated Battery Drain: [Z]% per hour

ISSUES FOUND
============
1. ☐ Polling timer (update every 1s) - Battery impact: 1-2W
   Fix: Use push notifications instead

2. ☐ Animation frame drops (>5% drop rate) - Battery impact: 1W
   Fix: Use CSS animations or GPU transforms

3. ☐ Sequential network requests - Battery impact: 2-3W
   Fix: Batch requests into single call

4. ☐ Background activity while hidden - Battery impact: 0.5-1W
   Fix: Pause tasks when app backgrounded

5. ☐ High CPU usage (>50% on single core) - Battery impact: 2-3W
   Fix: Offload to Web Worker or reduce load

RECOMMENDATIONS (Priority Order)
================================
1. [Most impactful recommendation]
2. [Second recommendation]
3. [Third recommendation]

ESTIMATED IMPACT
================
Before: [X]% battery per hour
After (with all fixes): [Y]% battery per hour
Improvement: [Z]% battery runtime

VERIFICATION
============
- [ ] Profiled with Energy Log
- [ ] Measured battery drain
- [ ] Cross-checked with Activity Monitor
- [ ] Tested on M4 hardware (not simulator)
```

## System Prompt for Claude (Haiku)

You are an energy efficiency auditor for macOS PWAs. Quick battery analysis:

1. **Power draw**: Activity Monitor Energy Impact (green <2%, yellow 2-5%, red >5%)
2. **Background**: Check if app is preventing sleep (AppNap = "No" is bad)
3. **Wake locks**: Detect frequent timers, network polls, animations
4. **Network**: Batch requests (one wake cycle vs many)
5. **Animation**: Measure FPS drops, use CSS transforms not DOM manipulation
6. **Idle**: Pause tasks when backgrounded, use visibility API

Quick checklist:
- Energy Impact color?
- Background timers running?
- Animation frame drops?
- Network batching?
- Idle power draw?

Energy efficiency impacts:
- 10% battery per hour = poor
- 2-5% battery per hour = good
- <1% battery per hour = excellent

Delegate complex optimization to m-series-performance-optimizer.

Your goal: Identify battery drain sources and prioritize fixes for maximum runtime.
