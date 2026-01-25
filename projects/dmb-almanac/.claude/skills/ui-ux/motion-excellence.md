---
name: motion-excellence
description: 120fps ProMotion animations that feel inevitable and natural
version: 1.0.0
author: Claude Code
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
philosophy: "The simpler and more direct you are, the better it is. The customer should understand what you're saying." - Steve Jobs
---

# Motion Excellence: Animations That Feel Inevitable

Motion is invisible design. It guides without being seen, clarifies without explaining. On 120Hz ProMotion displays, motion must be flawless or it breaks the illusion.

## Core Principles

### 1. GPU-Accelerated Transforms Only

Only properties that don't trigger layout recalculations are acceptable.

**Safe Properties (GPU-Accelerated):**
```css
/* These properties don't trigger layout reflow */
.element {
  /* ✓ Transform - best performance */
  transform: translate3d(0, 0, 0);
  transform: scale(1.1);
  transform: rotate(45deg);
  transform: skew(10deg);

  /* ✓ Opacity - composited layer */
  opacity: 0.8;

  /* ✓ Filter - GPU rendered */
  filter: blur(4px);
}
```

**Dangerous Properties (Avoid Animating):**
```css
/* ❌ DO NOT animate these - they trigger layout recalculations */
.avoid {
  /* Reflow triggers */
  width: 100px;        /* Causes layout */
  height: 200px;       /* Causes layout */
  padding: 20px;       /* Causes layout */
  margin: 10px;        /* Causes layout */
  top: 50px;           /* Positions element, causes layout */
  left: 50px;          /* Positions element, causes layout */

  /* Font changes */
  font-size: 16px;     /* Causes reflow + repaint */
  line-height: 1.5;    /* Causes reflow */
  letter-spacing: 2px; /* Causes reflow */
}
```

**Correct Transform-Based Approach:**
```css
.button {
  /* Set initial size with static properties */
  padding: 12px 24px;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;

  /* Animate with transform only */
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.button:active {
  /* Transform is GPU-accelerated, no reflow */
  transform: translate3d(0, 2px, 0) scale(0.98);
}

.button:disabled {
  opacity: 0.5; /* Safe to animate */
  pointer-events: none;
}
```

### 2. Chrome 143+ linear() Easing Function

Chrome 143 introduced the `linear()` function for custom easing curves, enabling spring physics without libraries.

**Spring Physics with linear():**
```css
@keyframes springBounce {
  0% {
    transform: translateY(0) scaleY(1);
  }
  100% {
    transform: translateY(-20px) scaleY(0.95);
  }
}

.button-tap {
  animation: springBounce 400ms linear(
    /* Creates natural spring curve */
    0, 0.09, 0.27, 0.4, 0.5, 0.59, 0.66, 0.71, 0.75,
    0.78, 0.81, 0.83, 0.84, 0.85, 0.86, 0.87, 0.87,
    0.88, 0.88, 0.89, 0.89, 0.9, 1
  );
  /* Executes on 120Hz ProMotion displays */
  animation-fill-mode: forwards;
}
```

**Practical Spring Easing Presets:**
```css
/* Gentle spring - feels natural */
:root {
  --easing-spring-gentle: linear(
    0, 0.13, 0.25, 0.36, 0.45, 0.52, 0.57, 0.61,
    0.64, 0.66, 0.68, 0.69, 0.7, 0.71, 1
  );

  /* Medium spring - responsive feedback */
  --easing-spring-medium: linear(
    0, 0.09, 0.27, 0.4, 0.5, 0.59, 0.66, 0.71,
    0.75, 0.78, 0.81, 0.83, 0.84, 0.85, 0.86, 0.87,
    0.87, 0.88, 0.88, 0.89, 0.89, 0.9, 1
  );

  /* Snappy spring - immediate feedback */
  --easing-spring-snappy: linear(
    0, 0.04, 0.16, 0.3, 0.44, 0.55, 0.62, 0.66,
    0.7, 0.72, 0.73, 0.74, 0.75, 1
  );
}

.element {
  transition: transform 400ms var(--easing-spring-medium);
}
```

### 3. Will-Change: Used Sparingly and Correctly

`will-change` creates a new stacking context. Misuse causes performance regression.

**Correct Usage Pattern:**
```javascript
// Add will-change just before animation starts
const element = document.querySelector('.animated-element');

element.addEventListener('mouseenter', () => {
  element.style.willChange = 'transform, opacity';
  // Start animation
  element.classList.add('is-animating');
});

element.addEventListener('mouseleave', () => {
  // Remove will-change after animation completes
  element.addEventListener('transitionend', () => {
    element.style.willChange = 'auto';
  }, { once: true });
});
```

**CSS Anti-Pattern:**
```css
/* ❌ DO NOT: Always set will-change */
.animated-element {
  will-change: transform;
  /* This creates an unnecessary stacking context */
  /* Increases memory usage */
  /* Can cause paint thrashing */
}

/* ✓ DO: Add dynamically when needed */
.animated-element.is-animating {
  will-change: transform, opacity;
  /* Remove with JavaScript after animation */
}
```

### 4. View Transitions API for Seamless Page Changes

Chrome 143+ supports native page transitions - the modern way to animate between views.

**Smooth Page Navigation:**
```html
<!-- HTML triggers transition -->
<a href="/profile" class="profile-link">View Profile</a>
```

```javascript
// JavaScript handles transition
document.querySelector('.profile-link').addEventListener('click', async (e) => {
  e.preventDefault();

  if (!document.startViewTransition) {
    // Fallback for unsupported browsers
    window.location.href = e.currentTarget.href;
    return;
  }

  // Capture current state and animate to new state
  const transition = document.startViewTransition(async () => {
    // Update DOM
    await fetch(e.currentTarget.href)
      .then(r => r.text())
      .then(html => {
        document.body.innerHTML = html;
        window.history.pushState({}, '', e.currentTarget.href);
      });
  });

  // Customize transition animation
  transition.ready.then(() => {
    // Custom easing for exit
    document.documentElement.animate(
      [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(-30px)' }
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    );
  });
});
```

**CSS Enhancement for View Transitions:**
```css
/* Smooth fade and scale transition */
::view-transition-old(root) {
  animation: slideOutOld 300ms ease-out forwards;
}

::view-transition-new(root) {
  animation: slideInNew 300ms ease-out forwards;
}

@keyframes slideOutOld {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-40px);
  }
}

@keyframes slideInNew {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### 5. Scroll-Driven Animations (Chrome 143+)

Animations that sync with scroll position create responsive, intuitive experiences.

**Scroll Progress Animation:**
```html
<div class="progress-bar"></div>
<article class="content">
  <!-- Long content -->
</article>
```

```css
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, #0071E3, #00C7FD);
  transform-origin: left;

  /* Animate based on scroll progress */
  animation: growProgress linear;
  animation-timeline: view();
  animation-range: entry 0% cover 100%;
}

@keyframes growProgress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
```

**Parallax on Scroll:**
```css
.hero-image {
  /* Moves slower than scroll */
  animation: parallax linear;
  animation-timeline: scroll();
}

@keyframes parallax {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100px);
  }
}

.hero-text {
  animation: fadeInOnScroll linear forwards;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes fadeInOnScroll {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 6. FLIP Technique for Layout Animations

FLIP (First, Last, Invert, Play) enables smooth animations when layout changes occur.

**FLIP Implementation:**
```javascript
class FLIPAnimator {
  static animate(element, callback) {
    // First: Record starting position
    const first = element.getBoundingClientRect();

    // Last: Update DOM, measure new position
    callback();
    const last = element.getBoundingClientRect();

    // Invert: Apply transform to show old position
    const invert = {
      dx: first.left - last.left,
      dy: first.top - last.top,
      dScale: {
        x: first.width / last.width,
        y: first.height / last.height
      }
    };

    element.style.transformOrigin = '0 0';
    element.style.transform = `
      translate(${invert.dx}px, ${invert.dy}px)
      scaleX(${invert.dScale.x})
      scaleY(${invert.dScale.y})
    `;

    // Force reflow to apply transform
    element.offsetHeight;

    // Play: Remove transform to animate to new position
    element.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    element.style.transform = 'none';

    // Cleanup
    element.addEventListener('transitionend', () => {
      element.style.transition = '';
      element.style.transform = '';
    }, { once: true });
  }
}

// Usage: Animate when list items reorder
const listItem = document.querySelector('.list-item');
FLIPAnimator.animate(listItem, () => {
  // Reorder DOM here
  listItem.parentNode.appendChild(listItem);
});
```

### 7. Respecting Reduced Motion

Users with vestibular disorders need motion respect.

**Accessibility-First Motion:**
```css
/* Default: Full motion */
.element {
  transition: transform 400ms var(--easing-spring-medium);
}

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .element {
    /* Instant, no animation */
    transition: none;
  }

  /* Remove spring effects */
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**JavaScript Detection:**
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  // Apply animations only if user accepts motion
  element.classList.add('animate');
}

// Listen for changes (user toggles in system settings)
window.matchMedia('(prefers-reduced-motion: reduce)')
  .addEventListener('change', (e) => {
    if (e.matches) {
      element.classList.remove('animate');
    } else {
      element.classList.add('animate');
    }
  });
```

## 120fps ProMotion Checklist

- [ ] Only animating: transform, opacity, filter
- [ ] will-change added and removed dynamically
- [ ] No layout recalculations during animation
- [ ] Spring easing using linear() function
- [ ] View Transitions API used for page changes
- [ ] Scroll animations synchronized with timeline
- [ ] FLIP technique for layout changes
- [ ] @media (prefers-reduced-motion) respected
- [ ] 300-400ms duration for feedback animations
- [ ] DevTools shows consistent 120fps (zero dropped frames)

## Anti-Patterns to Avoid

```css
/* ❌ DO NOT: Animate layout properties */
.avoid {
  animation: expandWidth 300ms ease;
}

@keyframes expandWidth {
  from { width: 100px; }
  to { width: 200px; }
}

/* ✓ DO: Use transform-based scaling */
.correct {
  animation: expandScale 300ms ease;
}

@keyframes expandScale {
  from { transform: scaleX(0.5); }
  to { transform: scaleX(1); }
}

/* ❌ DO NOT: Always enable will-change */
.avoid {
  will-change: transform, opacity, color;
}

/* ✓ DO: Enable only when animating */
.correct.is-animating {
  will-change: transform, opacity;
}

/* ❌ DO NOT: Ignore prefers-reduced-motion */
.avoid {
  animation: spin 2s infinite;
  /* User with vestibular disorder experiences vertigo */
}

/* ✓ DO: Respect accessibility preferences */
@media (prefers-reduced-motion: reduce) {
  .animation {
    animation: none;
  }
}
```

## Performance Measurement

```javascript
// Measure frame rate during animation
let frameCount = 0;
let lastTime = performance.now();

function measureFrameRate() {
  frameCount++;
  const currentTime = performance.now();
  const elapsed = currentTime - lastTime;

  if (elapsed >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = currentTime;
  }

  requestAnimationFrame(measureFrameRate);
}

// On 120Hz display, should consistently show 120 FPS
measureFrameRate();
```

## Testing ProMotion Display

```bash
# On Apple Silicon Mac with ProMotion display:
# 1. Open Chrome DevTools
# 2. Run: document.querySelector('video').playbackRate = 0.5
# 3. View animation in slow motion
# 4. Should see 120 frames per second clearly without jank

# Terminal test:
node -e "console.log('Animation tests require visual inspection')"
```

---

**Remember:** Motion that stutters is worse than no motion. Aim for 120fps or nothing. ProMotion displays are the pinnacle - don't waste them with sub-optimal animations.
