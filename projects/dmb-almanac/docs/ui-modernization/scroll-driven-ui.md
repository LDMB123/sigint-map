---
name: Scroll-Driven UI Animations
description: Native scroll animations with animation-timeline for Chromium 143+ without JavaScript
trigger: /scroll-driven-ui
---

# Scroll-Driven UI Animations with CSS Timeline

Chromium 143+ supports native CSS scroll-driven animations through `animation-timeline`, enabling complex scroll-linked effects entirely through CSS without JavaScript animation libraries. Apple Silicon's GPU-accelerated compositing makes these ultra-efficient.

## Animation-Timeline Scroll

Create animations linked to document scroll position:

```css
/* Link animation to scroll position */
.progress-bar {
  animation: fillProgress linear;
  animation-timeline: scroll();
}

@keyframes fillProgress {
  from { width: 0%; }
  to { width: 100%; }
}

/* Progress indicator with smooth 120fps on ProMotion */
.scroll-indicator {
  position: fixed;
  top: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, #0066cc, #00d9ff);
  animation: progressBar linear;
  animation-timeline: scroll(root block);
}

@keyframes progressBar {
  from { width: 0%; }
  to { width: 100%; }
}

/* Parallax effect linked to scroll */
.parallax-layer {
  background-attachment: fixed;
  animation: parallaxShift linear;
  animation-timeline: scroll(root block);
}

@keyframes parallaxShift {
  to { background-position: 0 -200px; }
}
```

## Animation-Timeline View

Create animations triggered when elements enter viewport:

```css
/* Animate element when it enters view */
.fade-in-on-scroll {
  animation: fadeIn linear;
  animation-timeline: view();
  animation-range: entry 0%, cover 100%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide animation as element moves through viewport */
.slide-on-view {
  animation: slideIn linear;
  animation-timeline: view();
  animation-range: entry 0%, cover 50%;
}

@keyframes slideIn {
  from { transform: translateX(-100px); }
  to { transform: translateX(0); }
}

/* Stagger effect for multiple elements */
.stagger-item {
  animation: staggerFade linear;
  animation-timeline: view();
  animation-range: entry 0%, cover 100%;
  animation-delay: calc(var(--index) * 50ms);
}

@keyframes staggerFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Scroll-Linked Headers and Progress

Sticky headers that respond to scroll position:

```html
<style>
  :root {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
  }

  .header {
    position: sticky;
    top: 0;
    background: white;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0);
    transition: box-shadow 300ms ease;
    z-index: 100;
  }

  .header.scrolled {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, #0066cc, #00d9ff);
    animation: progress linear;
    animation-timeline: scroll(root inline);
  }

  @keyframes progress {
    from { width: 0%; }
    to { width: 100%; }
  }

  .content-section {
    padding: 100px 20px;
    min-height: 100vh;
    border-top: 1px solid #eee;
  }

  .content-title {
    animation: titleReveal linear;
    animation-timeline: view();
    animation-range: entry 0%, cover 50%;
    font-size: 2rem;
    margin: 0 0 20px 0;
  }

  @keyframes titleReveal {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .content-text {
    animation: textFadeIn linear;
    animation-timeline: view();
    animation-range: entry 10%, cover 50%;
    font-size: 1.1rem;
    line-height: 1.6;
    max-width: 600px;
  }

  @keyframes textFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>

<div class="scroll-progress"></div>

<header class="header">
  <h1>Scroll-Linked Header</h1>
</header>

<section class="content-section">
  <h2 class="content-title">First Section</h2>
  <p class="content-text">Content appears as you scroll into view...</p>
</section>

<section class="content-section">
  <h2 class="content-title">Second Section</h2>
  <p class="content-text">Each section animates independently...</p>
</section>

<section class="content-section">
  <h2 class="content-title">Third Section</h2>
  <p class="content-text">Smooth animations driven by scroll position...</p>
</section>

<script>
  const header = document.querySelector('.header');
  let lastScrollY = 0;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50 && lastScrollY <= 50) {
      header.classList.add('scrolled');
    } else if (window.scrollY <= 50) {
      header.classList.remove('scrolled');
    }
    lastScrollY = window.scrollY;
  }, { passive: true });
</script>
```

## Parallax Without JavaScript

Create depth-based parallax effects using scroll timeline:

```css
.parallax-container {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.parallax-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 150%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation: parallaxScroll linear;
  animation-timeline: scroll(root block);
}

.parallax-content {
  position: relative;
  z-index: 1;
  padding: 100px 20px;
  color: white;
  text-align: center;
}

@keyframes parallaxScroll {
  from { transform: translateY(0); }
  to { transform: translateY(50px); }
}

/* Multi-layer parallax */
.layer-1 {
  animation: parallax-layer-1 linear;
  animation-timeline: scroll(root block);
}

.layer-2 {
  animation: parallax-layer-2 linear;
  animation-timeline: scroll(root block);
}

.layer-3 {
  animation: parallax-layer-3 linear;
  animation-timeline: scroll(root block);
}

@keyframes parallax-layer-1 {
  from { transform: translateY(0); }
  to { transform: translateY(20px); }
}

@keyframes parallax-layer-2 {
  from { transform: translateY(0); }
  to { transform: translateY(40px); }
}

@keyframes parallax-layer-3 {
  from { transform: translateY(0); }
  to { transform: translateY(60px); }
}
```

## Reveal Animations

Elements gradually reveal as user scrolls:

```css
.reveal-text {
  overflow: hidden;
}

.reveal-text::after {
  content: '';
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  animation: revealOverlay linear;
  animation-timeline: view();
  animation-range: entry 0%, cover 100%;
}

@keyframes revealOverlay {
  from { width: 100%; }
  to { width: 0%; }
}

/* Image reveal with gradient */
.image-reveal {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.image-reveal img {
  animation: imageZoomReveal linear;
  animation-timeline: view();
  animation-range: entry 0%, cover 100%;
}

@keyframes imageZoomReveal {
  from {
    transform: scale(1.1);
    filter: blur(5px);
  }
  to {
    transform: scale(1);
    filter: blur(0);
  }
}
```

## Progress Through Content

Track progress through multiple sections:

```html
<style>
  .section-tracker {
    position: fixed;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 50;
  }

  .tracker-item {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.2);
    margin: 16px 0;
    cursor: pointer;
    transition: all 300ms ease;
  }

  .tracker-item[data-active] {
    background: #0066cc;
    transform: scale(1.5);
  }

  .section {
    min-height: 100vh;
    padding: 100px 20px;
    scroll-margin-top: 0;
  }

  .section:nth-child(1) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .section:nth-child(2) {
    background: #f5f7fa;
  }

  .section:nth-child(3) {
    background: white;
  }

  .section:nth-child(4) {
    background: #f5f7fa;
  }
</style>

<div class="section-tracker">
  <div class="tracker-item" data-active></div>
  <div class="tracker-item"></div>
  <div class="tracker-item"></div>
  <div class="tracker-item"></div>
</div>

<section class="section" id="section-1">
  <h2>Section 1</h2>
</section>

<section class="section" id="section-2">
  <h2>Section 2</h2>
</section>

<section class="section" id="section-3">
  <h2>Section 3</h2>
</section>

<section class="section" id="section-4">
  <h2>Section 4</h2>
</section>

<script>
  const sections = document.querySelectorAll('.section');
  const trackers = document.querySelectorAll('.tracker-item');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const sectionIndex = Array.from(sections).indexOf(entry.target);
        trackers.forEach((tracker, index) => {
          if (index === sectionIndex) {
            tracker.setAttribute('data-active', '');
          } else {
            tracker.removeAttribute('data-active');
          }
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => observer.observe(section));
</script>
```

## Counter/Number Animations

Animate numbers as they enter viewport:

```css
.counter {
  font-size: 3rem;
  font-weight: bold;
  color: #0066cc;
}

.counter-label {
  font-size: 1.1rem;
  color: #666;
  margin-top: 8px;
}

/* CSS can't directly animate number content, but can animate related properties */
.stat-card {
  animation: scaleAndFade linear;
  animation-timeline: view();
  animation-range: entry 0%, cover 100%;
}

@keyframes scaleAndFade {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

For actual number counting, use scroll-triggered JavaScript:

```javascript
function animateCounter(element, target, duration = 1000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const updateCounter = () => {
    current += increment;
    if (current < target) {
      element.textContent = Math.floor(current);
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = target;
    }
  };

  updateCounter();
}

// Trigger on scroll
document.addEventListener('scroll', () => {
  const counter = document.querySelector('.counter');
  const rect = counter.getBoundingClientRect();

  if (rect.top < window.innerHeight && !counter.dataset.animated) {
    animateCounter(counter, 1000);
    counter.dataset.animated = 'true';
  }
});
```

## Animation Range Control

Fine-tune when animations start and end:

```css
.element-early-trigger {
  animation: appear linear;
  animation-timeline: view();
  animation-range: entry 0%, entry 100%;
}

.element-late-trigger {
  animation: appear linear;
  animation-timeline: view();
  animation-range: exit 0%, exit 100%;
}

.element-center-trigger {
  animation: appear linear;
  animation-timeline: view();
  animation-range: cover 25%, cover 75%;
}

@keyframes appear {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Apple Silicon Smooth Scrolling

Leverage M-series GPU for smooth scroll animations:

```css
* {
  scroll-behavior: smooth;
}

body {
  /* Enable GPU-accelerated scrolling */
  will-change: scroll-position;
}

.scroll-smooth {
  /* Composite-only scrolling */
  transform: translateZ(0);
}
```

## Performance Best Practices

- Use CSS scroll animations; avoid JavaScript scroll listeners
- Keep scroll-driven animations simple (translate, scale, opacity)
- Avoid repainting properties in scroll animations
- Test on M-series devices for true 120fps performance
- Use `animation-timeline: view()` over manual scroll tracking
- Batch multiple animations to same timeline when possible
