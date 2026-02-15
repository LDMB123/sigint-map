# Apple Silicon Profiling Checklist

Last updated: 2026-02-14
Scope: Safari on Apple Silicon (M-series), symbolized release builds.

## 1. Build + Baseline
1. Run `GPU_MODE=on scripts/apple-silicon-profile.sh` (WebGPU path).
2. Run `GPU_MODE=off scripts/apple-silicon-profile.sh` (DOM fallback path).
3. Optional batch: `GPU_MODE=on|off scripts/apple-silicon-profile-iterate.sh`.
4. Confirm health report exists:
   - `artifacts/apple-silicon-profile/<timestamp>/pwa-health.txt`
5. Confirm source map retention output:
   - `<dist>/source-map-summary.json`
   - `<dist>/*.js.map`

## 2. Capture Traces
Use generated command file:
- `artifacts/apple-silicon-profile/<timestamp>/xctrace-commands.txt`

Trace templates:
1. Time Profiler
2. Core Animation (or Animation Hitches)
3. Metal System Trace

Capture at least 20 seconds each for:
1. Home idle
2. Panel navigation (`tracker`, `quests`, `stories`, `games`)
3. Celebration/particle burst interactions
4. A/B compare `gpu=on` vs `gpu=off`

## 3. Review Targets

### CPU
1. No sustained main-thread hotspots equivalent to >20ms frame budget.
2. Navigation should not create sustained busy-time growth.

### GPU / Metal
1. No sustained queue back-pressure spikes.
2. Particle bursts should recover without prolonged frame stalls.

### Animation and Compositor
1. Transitions should remain smooth with no repeated drops.
2. Animation paths should stay on compositor-friendly properties.

### Memory / UMA
1. Repeated panel loops should not show monotonic growth.
2. Burst-related memory should return near baseline after completion.

### Energy
1. Idle home should not sustain high CPU/GPU use.
2. Interaction energy should remain low-to-moderate for normal use.

## 4. Pass Criteria
1. Release build and PWA health checks pass.
2. Chromium E2E gate passes.
3. No new regressions in CPU, animation, or Metal traces.
4. WebKit Playwright crash status is explicitly recorded when relevant.

## 5. Report Template
Record:
1. Device (`chip`, `macOS version`)
2. Build/date
3. Pass/fail summary
4. Top 3 hotspots
5. Top 3 remediation actions
6. Artifact paths
