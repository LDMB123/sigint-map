---
name: touch-precision
description: Trackpad and touch excellence - gesture recognition and haptic feedback
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Simplicity is the ultimate expression of sophistication." - Steve Jobs
---

# Touch Precision: Trackpad and Touch Excellence

Touch is the first interface. Before users read, they touch. Before they see, they feel. Every interaction must be responsive, intuitive, and delightful.

## Core Principles

### 1. Minimum Touch Target Size

44x44 pixels is the minimum. No exceptions. This applies to macOS, iPadOS, and touch-enabled devices.

**Touch Target Guidelines:**
```css
/* Buttons and clickable elements */
.button {
  min-width: 44px;
  min-height: 44px;
  padding: 10px 16px;
  /* Total: at least 44x44px */
  border-radius: 8px;
  cursor: pointer;
}

/* Icon buttons */
.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  /* Perfect circle, 44x44 */
}

/* Small text links still need touch area */
a {
  min-height: 44px;
  padding: 10px 8px;
  /* Extend hit area beyond visual bounds */
}

/* Touch target visualization */
.touch-target {
  position: relative;
  /* Use :before pseudo-element for invisible tap area */
}

.touch-target::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  pointer-events: auto;
}
```

**Testing Touch Targets:**
```javascript
// Verify all interactive elements meet 44x44 minimum
const interactive = document.querySelectorAll('button, a, input, [role="button"]');

interactive.forEach(el => {
  const rect = el.getBoundingClientRect();
  if (rect.width < 44 || rect.height < 44) {
    console.warn('Touch target too small:', {
      element: el,
      width: rect.width,
      height: rect.height,
      message: 'Must be at least 44x44px'
    });
  }
});
```

### 2. Gesture Recognition (Pinch, Swipe, Rotate)

Modern touch interfaces demand gesture support. Chrome 143+ provides excellent gesture APIs.

**Pointer Events for Multi-Touch:**
```javascript
class GestureRecognizer {
  constructor(element) {
    this.element = element;
    this.touches = new Map();
    this.init();
  }

  init() {
    this.element.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.element.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.element.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.element.addEventListener('pointercancel', (e) => this.onPointerCancel(e));
  }

  onPointerDown(e) {
    this.touches.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      time: Date.now()
    });

    // Detect pinch (two fingers)
    if (this.touches.size === 2) {
      this.onPinchStart();
    }
  }

  onPointerMove(e) {
    const touch = this.touches.get(e.pointerId);
    if (!touch) return;

    const prevX = touch.x;
    const prevY = touch.y;
    touch.x = e.clientX;
    touch.y = e.clientY;

    // Detect swipe
    const dx = e.clientX - touch.startX;
    const dy = e.clientY - touch.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 20) { // 20px threshold
      this.onSwipe(dx, dy);
    }

    // Detect pinch zoom
    if (this.touches.size === 2) {
      this.onPinch();
    }
  }

  onPointerUp(e) {
    const touch = this.touches.get(e.pointerId);
    if (touch) {
      const duration = Date.now() - touch.time;
      const dx = e.clientX - touch.startX;
      const dy = e.clientY - touch.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const velocity = distance / duration;

      // Detect flick (fast movement)
      if (velocity > 0.5 && distance > 50) {
        this.onFlick(dx, dy, velocity);
      }
    }

    this.touches.delete(e.pointerId);
  }

  onPointerCancel(e) {
    this.touches.delete(e.pointerId);
  }

  onPinchStart() {
    this.element.classList.add('is-pinching');
  }

  onPinch() {
    const touches = Array.from(this.touches.values());
    if (touches.length !== 2) return;

    const dx = touches[1].x - touches[0].x;
    const dy = touches[1].y - touches[0].y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.element.dispatchEvent(new CustomEvent('pinch', {
      detail: { distance }
    }));
  }

  onSwipe(dx, dy) {
    const direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    this.element.dispatchEvent(new CustomEvent('swipe', {
      detail: { dx, dy, direction }
    }));
  }

  onFlick(dx, dy, velocity) {
    this.element.dispatchEvent(new CustomEvent('flick', {
      detail: { dx, dy, velocity }
    }));
  }
}

// Usage
const slider = document.querySelector('.image-slider');
const recognizer = new GestureRecognizer(slider);

slider.addEventListener('swipe', (e) => {
  console.log('Swipe detected:', e.detail);
  // Handle swipe navigation
});
```

**CSS Gesture Feedback:**
```css
/* Visual feedback during gestures */
.image-carousel {
  touch-action: pan-x pinch-zoom;
  /* Allow horizontal pan and pinch zoom */
  /* Prevents default browser behavior */
}

.image-carousel.is-pinching {
  cursor: zoom-in;
}

.image-carousel.is-swiping {
  scroll-behavior: auto;
  /* Snap to grid during swipe */
}

/* Snap behavior for natural stopping points */
.image-carousel {
  scroll-snap-type: x mandatory;
  scroll-padding: 0;
}

.image-carousel img {
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
```

### 3. Momentum Scrolling

Momentum scrolling creates the feeling of physical weight.

**iOS-Style Momentum Scrolling:**
```css
/* Enable momentum scrolling on iOS */
.scrollable-container {
  -webkit-overflow-scrolling: touch;
  overflow-y: scroll;
  /* Adds deceleration and bounce */
}

/* Custom scroll behavior for macOS */
@supports (scroll-behavior: smooth) {
  .scrollable-container {
    scroll-behavior: smooth;
  }
}

/* Scrollbar styling for macOS */
.scrollable-container::-webkit-scrollbar {
  width: 8px;
}

.scrollable-container::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 200ms;
}

.scrollable-container:hover::-webkit-scrollbar-thumb {
  opacity: 1;
}
```

**JavaScript Momentum:**
```javascript
class MomentumScroll {
  constructor(element) {
    this.element = element;
    this.velocity = 0;
    this.lastY = 0;
    this.friction = 0.95; // Deceleration factor
    this.init();
  }

  init() {
    this.element.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.velocity = e.deltaY;
      this.applyMomentum();
    });
  }

  applyMomentum() {
    if (Math.abs(this.velocity) < 0.1) return;

    this.element.scrollTop += this.velocity;
    this.velocity *= this.friction;

    requestAnimationFrame(() => this.applyMomentum());
  }
}
```

### 4. Overscroll Behavior Control

Prevent default overscroll behavior on touch devices.

**Controlled Overscroll:**
```css
/* Prevent pull-to-refresh on web app */
.web-app {
  overscroll-behavior: contain;
  /* Stops scrolling at edges, prevents reload */
}

/* Vertical scrolling only */
.vertical-scroll {
  overscroll-behavior-x: contain;
  overscroll-behavior-y: auto;
}

/* Custom pull-to-refresh handler */
.pull-to-refresh-container {
  overscroll-behavior: contain;
  position: relative;
}

.pull-indicator {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 200ms;
}

.pull-to-refresh-container.is-pulling .pull-indicator {
  opacity: 1;
  transform: translateX(-50%) scale(1.2);
}
```

**JavaScript Pull-to-Refresh:**
```javascript
class PullToRefresh {
  constructor(element) {
    this.element = element;
    this.startY = 0;
    this.currentY = 0;
    this.init();
  }

  init() {
    this.element.addEventListener('touchstart', (e) => {
      this.startY = e.touches[0].clientY;
    });

    this.element.addEventListener('touchmove', (e) => {
      if (this.element.scrollTop === 0) {
        const diff = e.touches[0].clientY - this.startY;
        if (diff > 0) {
          this.currentY = diff;
          const progress = Math.min(diff / 100, 1);
          this.updatePullIndicator(progress);

          if (progress >= 1) {
            this.onRefresh();
          }
        }
      }
    });

    this.element.addEventListener('touchend', () => {
      this.reset();
    });
  }

  updatePullIndicator(progress) {
    const indicator = document.querySelector('.pull-indicator');
    indicator.style.transform = `translateX(-50%) scale(${progress})`;
    indicator.style.opacity = progress;
  }

  onRefresh() {
    console.log('Refreshing...');
    // Fetch new data
    setTimeout(() => this.reset(), 1000);
  }

  reset() {
    this.currentY = 0;
    this.startY = 0;
  }
}
```

### 5. Hover States Detection

Different input methods require different hover implementations.

**Media Query Hover Detection:**
```css
/* Devices that support hover (mouse, trackpad) */
@media (hover: hover) {
  .button {
    transition: background-color 200ms, box-shadow 200ms;
  }

  .button:hover {
    background-color: #0066cc;
    box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
  }

  .button:active {
    background-color: #004fa8;
  }
}

/* Touch-only devices (no hover capability) */
@media (hover: none) {
  .button {
    /* Skip hover state, go straight to active */
  }

  .button:active {
    background-color: #0066cc;
    box-shadow: 0 2px 6px rgba(0, 102, 204, 0.2);
  }
}

/* Fine pointer devices (mouse, trackpad) */
@media (pointer: fine) {
  .small-target {
    cursor: pointer;
    /* Can use small interaction areas */
  }
}

/* Coarse pointer devices (touch, stylus) */
@media (pointer: coarse) {
  .small-target {
    padding: 12px;
    /* Expand interaction area for touch */
  }
}

/* Combined: hover-capable fine pointer (classic mouse) */
@media (hover: hover) and (pointer: fine) {
  .element {
    cursor: pointer;
    /* Show all hover effects */
  }
}
```

**JavaScript Hover Detection:**
```javascript
// Detect input method at runtime
const hasHover = window.matchMedia('(hover: hover)').matches;
const hasFingerPointer = window.matchMedia('(pointer: coarse)').matches;

console.log({
  supportsHover: hasHover,
  isTouch: hasFingerPointer
});

// Adjust behavior based on input
if (hasHover) {
  element.classList.add('has-hover-support');
} else {
  element.classList.add('touch-only');
}

// Listen for input method changes
window.matchMedia('(pointer: coarse)').addEventListener('change', (e) => {
  console.log('Input method changed');
});
```

### 6. Pointer Device Detection

Detect and support different pointer types: mouse, touch, pen, etc.

**Pointer Detection:**
```javascript
class PointerManager {
  constructor() {
    this.pointerTypes = new Set();
    this.init();
  }

  init() {
    document.addEventListener('pointerdown', (e) => {
      this.pointerTypes.add(e.pointerType);
      this.handlePointer(e);
    });

    document.addEventListener('pointermove', (e) => {
      this.updatePointer(e);
    });

    document.addEventListener('pointerup', (e) => {
      this.handlePointerEnd(e);
    });
  }

  handlePointer(e) {
    switch (e.pointerType) {
      case 'mouse':
        this.onMouse(e);
        break;
      case 'touch':
        this.onTouch(e);
        break;
      case 'pen':
        this.onPen(e);
        break;
    }
  }

  onMouse(e) {
    console.log('Mouse input');
    // High precision, show cursor
  }

  onTouch(e) {
    console.log('Touch input');
    // Expand touch targets
    e.target?.classList.add('touch-active');
  }

  onPen(e) {
    console.log('Stylus/Pen input');
    // Pressure-sensitive interaction
    const pressure = e.pressure;
    console.log(`Pen pressure: ${pressure}`);
  }

  updatePointer(e) {
    // Update cursor position, handle hover state
  }

  handlePointerEnd(e) {
    e.target?.classList.remove('touch-active');
  }

  getActivePointers() {
    return Array.from(this.pointerTypes);
  }
}

const pointerManager = new PointerManager();
```

### 7. Force Touch and 3D Touch Handling

Advanced haptic interaction on supported devices.

**Pressure Sensitivity:**
```javascript
class PressureSensitive {
  constructor(element) {
    this.element = element;
    this.pressureLevel = 0;
    this.init();
  }

  init() {
    this.element.addEventListener('pointerdown', (e) => {
      this.onPressStart(e);
    });

    this.element.addEventListener('pointermove', (e) => {
      this.onPressUpdate(e);
    });

    this.element.addEventListener('pointerup', (e) => {
      this.onPressEnd(e);
    });
  }

  onPressStart(e) {
    if (e.pointerType !== 'pen') return;
    this.pressureLevel = e.pressure || 0;
    this.element.classList.add('is-pressed');
  }

  onPressUpdate(e) {
    if (e.pressure === undefined) return;

    this.pressureLevel = e.pressure;
    const intensity = Math.round(this.pressureLevel * 100);

    // Visual feedback for pressure
    this.element.style.boxShadow = `
      0 ${2 + intensity / 50}px ${12 + intensity / 20}px
      rgba(0, 0, 0, ${0.1 + this.pressureLevel * 0.2})
    `;

    // Haptic feedback at pressure threshold
    if (this.pressureLevel > 0.5) {
      this.triggerHaptic('medium');
    }
  }

  onPressEnd(e) {
    this.pressureLevel = 0;
    this.element.classList.remove('is-pressed');
    this.element.style.boxShadow = '';
  }

  triggerHaptic(type) {
    if (!navigator.vibrate) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 20, 10]
    };

    navigator.vibrate(patterns[type] || patterns.medium);
  }
}
```

### 8. Haptic Feedback Patterns

Provide tactile feedback on supported devices.

**Haptic Implementation:**
```javascript
class HapticFeedback {
  static async light() {
    try {
      await navigator.vibrate(10);
    } catch (e) {
      // Vibration not supported
    }
  }

  static async medium() {
    try {
      await navigator.vibrate(20);
    } catch (e) {}
  }

  static async heavy() {
    try {
      await navigator.vibrate(30);
    } catch (e) {}
  }

  static async success() {
    try {
      await navigator.vibrate([10, 20, 10]);
    } catch (e) {}
  }

  static async error() {
    try {
      await navigator.vibrate([10, 10, 10, 10]);
    } catch (e) {}
  }

  static async warning() {
    try {
      await navigator.vibrate([20, 10]);
    } catch (e) {}
  }

  static async selection() {
    try {
      // Custom pattern for selection
      await navigator.vibrate([5, 10, 5]);
    } catch (e) {}
  }
}

// Usage
document.querySelector('.button').addEventListener('click', async () => {
  await HapticFeedback.success();
});

document.querySelector('.delete-button').addEventListener('click', async () => {
  await HapticFeedback.warning();
});
```

**CSS + Haptic Combination:**
```css
/* Visual + haptic feedback together */
.button {
  transition: transform 150ms, box-shadow 150ms;
}

.button:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* JavaScript adds haptic on :active */
.button[data-haptic="success"]:active {
  /* Triggers success vibration pattern */
}
```

## Touch Precision Checklist

- [ ] All interactive elements are 44x44px minimum
- [ ] Gesture recognition implemented (swipe, pinch, etc.)
- [ ] Momentum scrolling enabled (-webkit-overflow-scrolling: touch)
- [ ] Overscroll behavior controlled
- [ ] Hover states use @media (hover: hover)
- [ ] Pointer type detection implemented
- [ ] Touch targets have adequate spacing
- [ ] Haptic feedback works on capable devices
- [ ] No dead clicks or unresponsive areas
- [ ] Visual feedback immediate (<100ms)

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Tiny touch targets */
.avoid {
  width: 20px;
  height: 20px;
  /* Too small for finger */
}

/* ✓ DO: Adequate touch targets */
.correct {
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
}

/* ❌ DO NOT: Always show hover states */
.avoid {
  .button:hover {
    background: blue;
  }
  /* Touch users never see this */
}

/* ✓ DO: Conditional hover states */
@media (hover: hover) {
  .button:hover {
    background: blue;
  }
}

/* ❌ DO NOT: Block pointer events without reason */
.avoid {
  pointer-events: none;
  /* User can't interact */
}

/* ✓ DO: Use pointer-events strategically */
.correct {
  .overlay {
    pointer-events: auto; /* Only when needed */
  }
}
```

---

**Remember:** Touch is intimate. Every interaction is a conversation between finger and interface. Make it speak clearly, respond immediately, and feel alive.
