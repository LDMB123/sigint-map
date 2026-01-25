---
name: ProMotion Display Optimization
description: 120Hz ProMotion display animations for Chromium 143+ with variable refresh rate
trigger: /promotion-display
---

# ProMotion Display Optimization for 120Hz

Chromium 143+ on Apple Silicon M-series devices with ProMotion displays can achieve 120fps animations by leveraging variable refresh rate technology. This skill covers optimization patterns for 120Hz displays while maintaining battery efficiency.

## Understanding ProMotion Displays

Apple's ProMotion technology provides variable refresh rates from 10Hz to 120Hz based on content needs:

- **Adaptive Refresh**: Display automatically scales refresh rate to match animation needs
- **Energy Efficient**: Lower refresh rates for static content preserve battery
- **Seamless Interpolation**: 120fps enables ultra-smooth motion perception
- **Frame Coherence**: Browser compositing must align with 120fps target (8.33ms frame budget)

## RequestAnimationFrame at 120fps

The browser calls rAF callbacks in sync with display refresh:

```javascript
let frameCounter = 0;
let startTime = performance.now();

function animationLoop(timestamp) {
  frameCounter++;

  const elapsed = timestamp - startTime;
  const targetFPS = 120;
  const frameTime = 1000 / targetFPS;

  if (frameCounter % 120 === 0) {
    console.log(`Running at ~${frameCounter / (elapsed / 1000).toFixed(1)} FPS`);
  }

  requestAnimationFrame(animationLoop);
}

requestAnimationFrame(animationLoop);
```

## CSS-Based 120fps Animations

CSS animations automatically sync with the display refresh rate:

```css
.smooth-animation {
  animation: smoothMove 1s ease-out forwards;
}

@keyframes smoothMove {
  0% {
    transform: translateX(0) translateZ(0);
    opacity: 0;
  }
  100% {
    transform: translateX(300px) translateZ(0);
    opacity: 1;
  }
}

.high-refresh-scroll {
  animation: horizontalScroll 20s linear infinite;
}

@keyframes horizontalScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

.smooth-transition {
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.smooth-transition:hover {
  transform: translateY(-8px) scale(1.05);
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15));
}
```

## Scroll-Linked Animations Matching 120fps

Scroll-driven animations can be linked to scroll position with high precision:

```css
.scroll-driven-progress {
  animation: fillProgress linear;
  animation-timeline: view();
  animation-range: entry 0%, cover 100%;
}

@keyframes fillProgress {
  from { width: 0%; }
  to { width: 100%; }
}

.parallax-layer {
  animation: parallax linear;
  animation-timeline: scroll(root inline);
}

@keyframes parallax {
  to { transform: translateY(var(--parallax-distance)); }
}
```

HTML structure for scroll-driven animation:

```html
<style>
  :root {
    scroll-behavior: smooth;
  }

  .scroll-container {
    height: 100vh;
    overflow-y: scroll;
  }

  .parallax-background {
    background-image: url('background.jpg');
    animation: parallaxShift linear;
    animation-timeline: scroll(root block);
  }

  @keyframes parallaxShift {
    from { background-position: 0 0; }
    to { background-position: 0 -200px; }
  }

  .scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    background: linear-gradient(90deg, #0066cc, #00d9ff);
    animation: progress linear;
    animation-timeline: scroll();
  }

  @keyframes progress {
    from { width: 0%; }
    to { width: 100%; }
  }
</style>

<div class="scroll-container">
  <div class="scroll-progress"></div>
  <div class="parallax-background">
    <!-- Content scrolls with parallax effect -->
  </div>
</div>
```

## Battery vs Performance Tradeoffs

### High Performance (Full 120fps)

```css
.high-performance {
  animation: fastMove 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}

@keyframes fastMove {
  from { transform: translateX(0); }
  to { transform: translateX(200px); }
}
```

Use when:
- Animations require smooth motion perception
- User is actively engaged
- Battery level is good (>40%)
- Animation is critical to user experience

### Battery-Optimized (60fps or Variable)

```css
.battery-optimized {
  animation: efficientMove 1000ms ease-out;
}

@keyframes efficientMove {
  from { transform: translateX(0); }
  to { transform: translateX(200px); }
}
```

Use when:
- Battery level is low
- Animation is secondary to core function
- Longer duration animations (1000ms+)
- Background processes active

### Detecting Battery Status

```javascript
async function checkBatteryLevel() {
  try {
    const battery = await navigator.getBattery?.();
    if (battery) {
      battery.addEventListener('levelchange', () => {
        const level = battery.level;
        const isCharging = battery.charging;

        if (level > 0.4 || isCharging) {
          document.body.classList.remove('battery-saver');
          document.body.classList.add('high-performance');
        } else {
          document.body.classList.add('battery-saver');
          document.body.classList.remove('high-performance');
        }
      });
    }
  } catch (e) {
    console.warn('Battery API not available');
  }
}

checkBatteryLevel();
```

CSS classes for battery states:

```css
body.battery-saver .animation {
  animation-duration: 1000ms;
  animation-timing-function: ease-out;
}

body.high-performance .animation {
  animation-duration: 600ms;
  animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

## CSS Update Media Query

The `update` media query indicates display refresh capability:

```css
@media (update: fast) {
  .animation {
    animation-duration: 600ms;
    animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
}

@media (update: slow) {
  .animation {
    animation-duration: 1200ms;
    animation-timing-function: ease-out;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animation {
    animation-duration: 0ms;
    transition-duration: 0ms;
  }
}

@media (prefers-reduced-motion: no-preference) and (update: fast) {
  .animation {
    animation-duration: 600ms;
  }
}
```

## Detecting 120Hz Display Support

```javascript
function isProMotionDisplay() {
  return window.matchMedia('(update: fast)').matches;
}

function detectRefreshRate() {
  const displayMediaQuery = window.matchMedia('(update: fast)');

  if (displayMediaQuery.matches) {
    console.log('Display supports 120+ fps animations');
    return 120;
  } else {
    console.log('Display supports 60fps animations');
    return 60;
  }
}

const refreshRate = detectRefreshRate();
console.log(`Target refresh rate: ${refreshRate}fps`);
```

## Scroll-Linked Header Example

```html
<style>
  .header {
    position: sticky;
    top: 0;
    background: white;
    transition: box-shadow 300ms ease;
  }

  .header.scrolled {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .scroll-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: linear-gradient(90deg, #0066cc, #00d9ff);
    animation: scrollProgress linear;
    animation-timeline: scroll(root);
  }

  @keyframes scrollProgress {
    from { width: 0%; }
    to { width: 100%; }
  }
</style>

<header class="header">
  <div class="scroll-indicator"></div>
  <h1>Smooth Scrolling Header</h1>
</header>

<script>
  const header = document.querySelector('.header');
  let lastScrollY = 0;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 10 && lastScrollY <= 10) {
      header.classList.add('scrolled');
    } else if (window.scrollY <= 10) {
      header.classList.remove('scrolled');
    }
    lastScrollY = window.scrollY;
  });
</script>
```

## Frame Rate Testing

```javascript
function testFrameRate() {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 0;

  function checkFPS() {
    frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime;

    if (elapsed >= 1000) {
      fps = (frameCount * 1000) / elapsed;
      console.log(`Current FPS: ${fps.toFixed(1)}`);

      if (fps >= 119) {
        console.log('Running at 120fps - ProMotion display detected');
      } else if (fps >= 59) {
        console.log('Running at 60fps - Standard display');
      }

      frameCount = 0;
      lastTime = currentTime;
    }

    requestAnimationFrame(checkFPS);
  }

  checkFPS();
}

testFrameRate();
```

## Performance Budget for 120fps

- **Frame Budget**: 8.33ms per frame
- **Compositing**: < 4ms
- **Paint**: < 2ms
- **Layout**: < 1.5ms
- **Other**: < 0.83ms

## ProMotion Best Practices

1. Use CSS animations for smooth 120fps by default
2. Monitor scroll events carefully (can block compositing)
3. Avoid complex JavaScript during active animations
4. Test on actual M-series hardware with ProMotion
5. Provide reduced-motion preference fallbacks
6. Consider battery status for long-running animations
