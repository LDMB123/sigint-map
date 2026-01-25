---
name: GPU-Accelerated Animations
description: Metal backend GPU animations for Chromium 143+ optimized for Apple Silicon unified memory
trigger: /gpu-animations
---

# GPU-Accelerated Animations for Apple Silicon

Chromium 143+ on Apple Silicon leverages the Metal graphics backend through the unified memory architecture. This skill focuses on compositor-only animations that bypass the JavaScript thread entirely, enabling smooth 60-120fps animations with minimal power consumption.

## Why GPU Acceleration Matters on Apple Silicon

Apple Silicon's unified memory architecture means GPU and CPU share the same high-bandwidth memory pool. This eliminates expensive data transfers and makes GPU acceleration exceptionally efficient:

- **No PCIe bottleneck**: Traditional discrete GPUs communicate over PCIe; Apple Silicon's GPU directly accesses unified memory
- **Metal Backend**: Chromium 143+ uses Metal on macOS, which provides direct GPU access without intermediate abstractions
- **Compositor Thread**: Animations using GPU-accelerated properties bypass the main JavaScript thread
- **Energy Efficiency**: GPU handles animation interpolation; CPU can stay idle or handle other tasks

## GPU-Accelerated Properties

Only these CSS properties trigger GPU acceleration in Chromium 143+:

```css
will-change: transform, opacity;

.animate-element {
  animation: slide 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slide {
  from { transform: translateX(0); }
  to { transform: translateX(100px); }
}

.fade-animation {
  animation: fade 800ms ease-in-out;
}

@keyframes fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.blur-animate {
  animation: blurEffect 1200ms ease-out;
}

@keyframes blurEffect {
  from { filter: blur(0px) brightness(1); }
  to { filter: blur(10px) brightness(0.8); }
}

.complex-animation {
  animation: complexMove 2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes complexMove {
  0% {
    transform: translateX(0) translateY(0) scale(1) rotateZ(0deg);
    opacity: 0;
  }
  50% { opacity: 1; }
  100% {
    transform: translateX(200px) translateY(-100px) scale(1.2) rotateZ(45deg);
    opacity: 1;
  }
}
```

## Will-Change Strategic Usage

The `will-change` property hints to the browser to create a new layer. Use it only for animations that will definitely run:

```css
.card-hover {
  will-change: transform;
  transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card-hover:hover {
  transform: translateY(-8px) scale(1.02);
}

.animate-on-scroll.animating {
  will-change: transform;
  animation: slideUp 600ms ease-out forwards;
}

@keyframes slideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

## Compositor-Only Animations

These animations run entirely on the compositor thread without touching the main JavaScript thread:

```html
<style>
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top-color: #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotateZ(360deg); }
  }

  .pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .grow {
    animation: grow 1.5s ease-in-out infinite alternate;
  }

  @keyframes grow {
    from { transform: scale(1); }
    to { transform: scale(1.1); }
  }

  .shimmer {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0) 40%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .bounce {
    animation: bounce 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
</style>

<div class="spinner"></div>
<div class="pulse">Pulsing Element</div>
<div class="grow">Growing Element</div>
<div class="shimmer">Shimmer Effect</div>
<div class="bounce">Bouncing Element</div>
```

## High-Performance Animation Patterns

### Stagger Animations

```css
.stagger-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
}

.stagger-item {
  animation: slideUp 600ms ease-out forwards;
  animation-delay: calc(var(--item-index) * 100ms);
}

@keyframes slideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

```html
<div class="stagger-container">
  <div class="stagger-item" style="--item-index: 0;">Item 1</div>
  <div class="stagger-item" style="--item-index: 1;">Item 2</div>
  <div class="stagger-item" style="--item-index: 2;">Item 3</div>
  <div class="stagger-item" style="--item-index: 3;">Item 4</div>
</div>
```

### Chained Animations

```css
.chain-animation {
  animation:
    fadeIn 300ms ease-out,
    slideUp 300ms ease-out 300ms,
    scale 300ms ease-out 600ms;
  animation-fill-mode: both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); }
  to { transform: translateY(0); }
}

@keyframes scale {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
}
```

## Performance Monitoring

Chrome DevTools shows GPU acceleration status on M-series:

```javascript
let frameCount = 0;
let lastTime = performance.now();

function measureFPS() {
  frameCount++;
  const currentTime = performance.now();
  const elapsed = currentTime - lastTime;

  if (elapsed >= 1000) {
    const fps = (frameCount * 1000) / elapsed;
    console.log(`FPS: ${fps.toFixed(1)}`);
    frameCount = 0;
    lastTime = currentTime;
  }

  requestAnimationFrame(measureFPS);
}

measureFPS();
```

## What NOT to Animate

```css
@keyframes badMove {
  from {
    left: 0;
    background: red;
  }
  to {
    left: 100px;
    background: blue;
  }
}

@keyframes goodMove {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100px);
    opacity: 0.8;
  }
}
```

## Metal Backend Detection

```javascript
function isMetalBackendActive() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');

  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return renderer.includes('Metal');
    }
  }

  return false;
}

console.log('Metal backend active:', isMetalBackendActive());
```

## Performance Targets

- Target FPS: 60fps minimum, 120fps on ProMotion displays
- Frame Time: < 8.33ms per frame (for 120fps)
- GPU Memory: Apple Silicon unified memory handles large animation batches efficiently
- Battery Impact: GPU acceleration consumes significantly less power than CPU-based animation
