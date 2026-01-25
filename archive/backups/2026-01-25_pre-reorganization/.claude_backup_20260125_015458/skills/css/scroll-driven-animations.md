---
name: CSS Scroll-Driven Animations
agent: CSS Modern Specialist
version: 1.0
chrome_minimum: 115
description: Implement scroll-linked effects using native CSS animation-timeline without JavaScript
category: css-modernization
complexity: medium
---

# CSS Scroll-Driven Animations (Chrome 115+)

**Chromium 2025 Standard:** GPU-accelerated scroll animations without JavaScript. Runs on compositor thread at 60-120fps.

## When to Use

Use this skill when you need to:

- Implement scroll-linked animations without JavaScript event listeners
- Create parallax effects tied to scroll position
- Animate elements as they enter the viewport
- Build progress indicators tracking scroll position
- Implement shrinking/expanding headers on scroll
- Add fade-in/slide-up animations to content cards
- Create interactive visualizations tied to scroll progress

**Typical Scenarios:**
- Hero section parallax effects
- Progress bar tracking document scroll
- Card animations on scroll into view
- Sticky header that shrinks while scrolling
- Parallax backgrounds and multi-layered effects

**Performance Context:**
- Removes need for scroll event listeners
- Runs on compositor thread (GPU-accelerated)
- Smooth 60-120fps on all devices
- Battery-efficient (no JavaScript on every frame)
- Automatic cleanup - no manual event listener management

---

## Required Inputs

| Input | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Animation Type | enum | Yes | parallax, fade-in, slide, progress | Type of scroll effect |
| Trigger Element | selector | Yes | `.card`, `#hero` | CSS selector for animated element |
| Scroll Source | enum | No | `root`, `element` | Document scroll or element scroll |
| Start Point | string | No | `entry 0%`, `100px` | Where animation begins |
| End Point | string | No | `entry 100%`, `500px` | Where animation completes |
| Fallback Support | boolean | No | true | Include @supports fallbacks |
| Device Target | string | No | `120hz` | ProMotion 120Hz or standard 60Hz |

---

## Steps

### Step 1: Understand Animation Timeline Syntax

CSS scroll-driven animations use two main properties:

```css
.element {
  animation: myAnimation linear both;
  animation-timeline: scroll();        /* or view() */
  animation-range: 0px 500px;          /* or entry 0% entry 100% */
}
```

**animation-timeline values:**
- `scroll()` - Triggered by document scroll position
- `scroll(self)` - Triggered by element's own scroll position
- `scroll(nearest)` - Triggered by nearest scrollable ancestor
- `view()` - Triggered when element enters viewport

**animation-range values:**
- `0px 500px` - Start at 0px, complete at 500px of document scroll
- `100px 600px` - Start at 100px, complete at 600px
- `entry 0% entry 100%` - Start when element starts entering, complete when fully entered

### Step 2: Identify Scroll-Driven Animation Opportunities

Audit codebase for scroll event listeners to replace:

```bash
# Find scroll event listeners
grep -r "addEventListener.*scroll\|@scroll\|onScroll" --include="*.tsx" --include="*.svelte"

# Find requestAnimationFrame with scroll
grep -r "requestAnimationFrame\|window.scrollY\|window.pageYOffset" --include="*.tsx" --include="*.vue"

# Find IntersectionObserver usage (can be replaced with view())
grep -r "IntersectionObserver" --include="*.tsx" --include="*.svelte"

# Find transform calculations based on scroll
grep -r "scrollTop\|scrollLeft\|scroll.*Calculate" --include="*.tsx"
```

### Step 3: Convert Scroll Event Listeners to CSS

#### Pattern 1: Fade-In on Scroll (Replace IntersectionObserver)

**Before (JavaScript with IntersectionObserver):**
```tsx
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  });

  document.querySelectorAll('.card').forEach(el => observer.observe(el));
  return () => observer.disconnect();
}, []);
```

**After (CSS scroll-driven animations):**
```css
@supports (animation-timeline: view()) {
  .card {
    animation: fadeInSlide linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

/* Fallback for older browsers */
@supports not (animation-timeline: view()) {
  .card {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Benefit:** Removes 15-20 lines of JavaScript, eliminates IntersectionObserver overhead

#### Pattern 2: Progress Bar Tracking Document Scroll

**Before (JavaScript with scroll listener):**
```tsx
const [progress, setProgress] = useState(0);

useEffect(() => {
  const handleScroll = () => {
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = (window.scrollY / docHeight) * 100;
    setProgress(scrolled);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

return (
  <div className="progress-bar" style={{ width: `${progress}%` }} />
);
```

**After (CSS scroll-driven animations):**
```html
<div class="progress-bar"></div>
```

```css
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--color-primary-500);
  transform-origin: left;
  animation: growWidth linear;
  animation-timeline: scroll();
  animation-range: 0% 100%;
}

@keyframes growWidth {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

**Benefit:** Eliminates scroll event listener, no state updates, pure CSS

#### Pattern 3: Parallax Hero Section

**Before (JavaScript parallax calculation):**
```tsx
const [offset, setOffset] = useState(0);

useEffect(() => {
  const handleScroll = () => {
    setOffset(window.scrollY * 0.5);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

return (
  <section className="hero" style={{ transform: `translateY(${offset}px)` }}>
    Parallax background
  </section>
);
```

**After (CSS scroll-driven animations):**
```css
.hero {
  animation: parallax linear;
  animation-timeline: scroll();
  animation-range: 0px 500px;
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-100px); }
}
```

**Benefit:** Eliminates event listener, runs on GPU, true 60-120fps

#### Pattern 4: Sticky Header Collapse

**Before (JavaScript with scroll listener):**
```tsx
const [headerSize, setHeaderSize] = useState('large');

useEffect(() => {
  const handleScroll = () => {
    setHeaderSize(window.scrollY > 100 ? 'small' : 'large');
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

return (
  <header className={`header header-${headerSize}`}>
    Navigation
  </header>
);
```

**After (CSS scroll-driven animations):**
```css
.header {
  position: sticky;
  top: 0;
  padding-block: 1rem;
  font-size: 1.5rem;
  animation: shrinkHeader linear;
  animation-timeline: scroll();
  animation-range: 0px 100px;
}

@keyframes shrinkHeader {
  from {
    padding-block: 1rem;
    font-size: 1.5rem;
  }
  to {
    padding-block: 0.5rem;
    font-size: 1rem;
  }
}
```

**Benefit:** Smooth interpolation over entire scroll range (not discrete states)

### Step 4: Master `animation-range` Syntax

Understand the different range expressions:

```css
/* Absolute pixel values (document scroll) */
animation-range: 0px 500px;           /* Start at 0px, end at 500px */
animation-range: 100px;               /* Start at 100px, auto-calculate end */
animation-range: 200px 800px;         /* Custom range */

/* Viewport-relative ranges (with view()) */
animation-range: entry 0% entry 100%; /* Start when entering, end when fully in view */
animation-range: entry 10% entry 90%; /* Custom entry range */
animation-range: entry 0% cover 50%;  /* Entry point to cover midpoint */

/* Named ranges with cover/contain */
animation-range: cover 0% cover 100%; /* Element fully covers viewport */
animation-range: contain 0% contain 100%; /* Element fully contained in viewport */

/* Combinations */
animation-range: 100px entry 100%;    /* Pixel point to viewport entry */
```

### Step 5: Implement Parallax Effects

#### Multi-Layer Parallax

```html
<div class="hero">
  <div class="parallax-layer" data-speed="0.5">Background</div>
  <div class="parallax-layer" data-speed="0.3">Mid-ground</div>
  <div class="parallax-layer" data-speed="0.1">Foreground</div>
</div>
```

```css
.parallax-layer {
  animation: parallax linear;
  animation-timeline: scroll();
  animation-range: 0px 800px;
}

/* Different speed for each layer */
.parallax-layer[data-speed="0.5"] {
  animation: parallax-fast linear;
}

.parallax-layer[data-speed="0.3"] {
  animation: parallax-medium linear;
}

.parallax-layer[data-speed="0.1"] {
  animation: parallax-slow linear;
}

@keyframes parallax-fast {
  from { transform: translateY(0); }
  to { transform: translateY(-200px); }
}

@keyframes parallax-medium {
  from { transform: translateY(0); }
  to { transform: translateY(-120px); }
}

@keyframes parallax-slow {
  from { transform: translateY(0); }
  to { transform: translateY(-50px); }
}
```

### Step 6: Implement Viewport-Triggered Animations

#### Staggered Card Animations

```html
<div class="card-grid">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>
```

```css
.card {
  animation: slideUp linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 75%;

  /* Stagger each card */
  &:nth-child(2) {
    animation-range: entry 10% entry 85%;
  }

  &:nth-child(3) {
    animation-range: entry 20% entry 95%;
  }
}

@keyframes slideUp {
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

### Step 7: Add Fallbacks for Older Browsers

Always include `@supports` blocks:

```css
@supports (animation-timeline: view()) {
  /* Modern implementation */
  .card {
    animation: fadeIn linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}

@supports not (animation-timeline: view()) {
  /* Fallback for older browsers */
  .card {
    /* Default visible state */
    opacity: 1;
  }

  /* Or use regular animation on page load */
  @media (prefers-reduced-motion: no-preference) {
    .card {
      animation: fadeInFallback 0.6s ease-in-out 0.1s both;
    }

    @keyframes fadeInFallback {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }
}
```

### Step 8: Optimize for Apple Silicon (120Hz ProMotion)

Consider frame timing for smooth 120Hz animations:

```css
/* 120Hz = 8.33ms per frame */
.element {
  animation: smooth linear;
  animation-timeline: scroll();
  animation-range: 0px 1200px;  /* Longer range = smoother at 120fps */
  will-change: transform;        /* Layer promotion hint */
}

@keyframes smooth {
  /* GPU-accelerated properties only */
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-300px); opacity: 0; }
}

/* Avoid these in scroll animations */
@keyframes avoid-paint {
  from { width: 100%; }  /* ❌ Triggers layout */
  to { width: 50%; }
}

@keyframes avoid-paint2 {
  from { background-color: blue; }  /* ❌ Triggers paint */
  to { background-color: red; }
}
```

### Step 9: Debug and Profile

Use Chrome DevTools to verify performance:

```javascript
// Check animation-timeline support
const element = document.querySelector('.animated');
const style = getComputedStyle(element);
const hasScrollTimeline = 'animationTimeline' in style;

console.log('Scroll-driven animations supported:', hasScrollTimeline);

// Monitor animation performance
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('Animation')) {
      console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
    }
  }
});

observer.observe({ entryTypes: ['measure', 'mark'] });
```

Chrome DevTools steps:
1. Open DevTools (Option+Cmd+I on Mac)
2. Go to Rendering tab
3. Enable "Paint flashing" to see renders
4. Scroll animations should show minimal red flashes
5. Check FPS meter - should stay at 60/120fps

### Step 10: Create Comprehensive Examples

#### Example: Full Hero Section with Parallax

```html
<section class="hero" role="banner">
  <div class="hero-background">
    <div class="parallax-layer-1"></div>
    <div class="parallax-layer-2"></div>
    <div class="parallax-layer-3"></div>
  </div>
  <h1>Welcome</h1>
</section>
```

```css
@supports (animation-timeline: scroll()) {
  .hero {
    position: relative;
    height: 100vh;
    overflow: hidden;
  }

  .hero-background {
    position: absolute;
    inset: 0;
    z-index: -1;
  }

  .parallax-layer-1 {
    animation: parallax-fast linear both;
    animation-timeline: scroll();
    animation-range: 0px 800px;
  }

  .parallax-layer-2 {
    animation: parallax-medium linear both;
    animation-timeline: scroll();
    animation-range: 0px 800px;
  }

  .parallax-layer-3 {
    animation: parallax-slow linear both;
    animation-timeline: scroll();
    animation-range: 0px 800px;
  }

  @keyframes parallax-fast {
    from { transform: translateY(0); }
    to { transform: translateY(-240px); }
  }

  @keyframes parallax-medium {
    from { transform: translateY(0); }
    to { transform: translateY(-140px); }
  }

  @keyframes parallax-slow {
    from { transform: translateY(0); }
    to { transform: translateY(-50px); }
  }
}
```

---

## Expected Output

### 1. Implementation Checklist

```markdown
# Scroll-Driven Animation Implementation

## Phase 1: Foundation (2-3 hours)
- [ ] Add @supports feature detection blocks
- [ ] Convert IntersectionObserver → animation-timeline: view()
- [ ] Implement fade-in/slide animations for cards
- [ ] Verify 60fps in Chrome DevTools

## Phase 2: Advanced Effects (2-3 hours)
- [ ] Implement parallax backgrounds
- [ ] Create sticky header shrink animation
- [ ] Add progress bar tracking scroll
- [ ] Test on 120Hz ProMotion displays

## Phase 3: Optimization (1-2 hours)
- [ ] Remove JavaScript scroll listeners
- [ ] Optimize animation ranges for smooth 120fps
- [ ] Verify no layout thrashing
- [ ] Add will-change hints for key elements

## Phase 4: Testing (1-2 hours)
- [ ] Test on real M-series hardware
- [ ] Verify fallbacks on older browsers
- [ ] Check prefers-reduced-motion
- [ ] Performance profiling with DevTools
```

### 2. Code Migration Examples

```javascript
// Conversion template
const scrollAnimationPatterns = {
  before: {
    fadeOnScroll: `
      useEffect(() => {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.style.opacity = '1';
            }
          });
        });
        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
      }, []);
    `,
    parallax: `
      useEffect(() => {
        const handleScroll = () => {
          const offset = window.scrollY * 0.5;
          setParallaxOffset(offset);
        };
        window.addEventListener('scroll', handleScroll);
      }, []);
    `,
  },
  after: {
    fadeOnScroll: `
      .fade-in {
        animation: fadeIn linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 100%;
      }
      @keyframes fadeIn { ... }
    `,
    parallax: `
      .parallax {
        animation: parallax linear both;
        animation-timeline: scroll();
        animation-range: 0px 500px;
      }
      @keyframes parallax { ... }
    `,
  }
};
```

### 3. Performance Report

```markdown
## Performance Improvement Report

### Before (JavaScript-based)
- Scroll listeners: 12 active
- IntersectionObservers: 8 active
- JavaScript calls per scroll: ~50
- Frame budget used: 40-60%
- 120Hz devices: Drop to 60fps during scroll

### After (CSS scroll-driven)
- Scroll listeners: 0
- IntersectionObservers: 0
- JavaScript calls per scroll: 0
- Frame budget used: 5-10%
- 120Hz devices: Maintain 120fps smoothly

### Metrics
- JS removed: ~45KB
- CSS added: ~3KB
- Net savings: 42KB
- LCP improvement: ~50ms
- INP improvement: ~30ms
- Scroll smoothness: 98-100 FPS
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Support |
|---------|--------|---------|--------|---------|
| `animation-timeline: scroll()` | 115+ | N/A | N/A | Limited |
| `animation-timeline: view()` | 115+ | N/A | N/A | Limited |
| `animation-range` | 115+ | N/A | N/A | Limited |
| @supports detection | All | All | All | Full |
| Fallback animations | All | All | All | Full |

**Recommendation:** Always use `@supports` blocks for graceful degradation

---

## Common Patterns

### Pattern 1: Fade-In Cards
```css
.card {
  animation: fadeIn linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Pattern 2: Progress Bar
```css
.progress-bar {
  transform-origin: left;
  animation: progress linear;
  animation-timeline: scroll();
  animation-range: 0% 100%;
}

@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### Pattern 3: Parallax
```css
.parallax {
  animation: parallax linear both;
  animation-timeline: scroll();
  animation-range: 0px 600px;
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-150px); }
}
```

### Pattern 4: Header Collapse
```css
.header {
  animation: shrink linear both;
  animation-timeline: scroll();
  animation-range: 0px 100px;
}

@keyframes shrink {
  from { padding: 1rem; font-size: 1.5rem; }
  to { padding: 0.5rem; font-size: 1rem; }
}
```

---

## Related Skills

- **js-to-css-audit.md** - Identify scroll listeners to replace
- **apple-silicon-optimization.md** - Optimize for 120Hz displays
- **css-nesting.md** - Organize animation keyframes

---

## References

- [MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [MDN: animation-range](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-range)
- [Chrome: Scroll-Driven Animations](https://developer.chrome.com/articles/scroll-driven-animations/)
- [Web.dev: Performance Guide](https://web.dev/vitals/)
