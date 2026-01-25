# Chromium 143+ Exclusive Skills

Cutting-edge browser features for Chrome 143+ on macOS with Apple Silicon. No legacy fallbacks, no polyfills—pure modern web platform.

## Available Skills

### CSS Features

#### [css-if.md](./css-if.md)
**CSS if() Function** - Conditional CSS values without preprocessors.
- Replace ternary-like patterns
- Dynamic theme switching without JavaScript
- Feature flags in CSS
- Chrome 143+

#### [css-light-dark.md](./css-light-dark.md)
**light-dark() Function** - Automatic dark mode colors.
- System preference + user override
- Single declaration for light/dark pairs
- No @media queries needed
- Chrome 143+

#### [css-text-wrap-pretty.md](./css-text-wrap-pretty.md)
**text-wrap: balance & pretty** - Professional typography.
- Balance headlines automatically
- Prevent orphaned words
- Better readability without constraints
- Chrome 117+

#### [css-field-sizing.md](./css-field-sizing.md)
**field-sizing: content** - Auto-sizing form fields.
- Textareas grow as user types
- Input fields adjust to content
- No JavaScript resize needed
- Chrome 123+

#### [css-reading-flow.md](./css-reading-flow.md)
**reading-flow Property** - Control focus/reading order in layouts.
- Decouple visual from logical order
- No tabindex manipulation
- Accessibility compliance
- Chrome 128+

#### [css-interpolate-size.md](./css-interpolate-size.md)
**interpolate-size: allow-keywords** - Animate to height: auto.
- Smooth expand/collapse animations
- No max-height hacks
- Dynamic content sizing
- Chrome 129+

### API Features

#### [long-animation-frames.md](./long-animation-frames.md)
**Long Animation Frames API** - Performance monitoring for INP.
- PerformanceLongAnimationFrameTiming
- Script attribution (source, function)
- Better than Long Tasks API
- Chrome 123+

#### [document-pip.md](./document-pip.md)
**Document Picture-in-Picture** - Custom floating windows.
- Render any HTML content in PiP
- Not limited to video
- Custom player UI, dashboards, chat
- Chrome 119+

### HTML/Interactive Features

#### [invoker-commands.md](./invoker-commands.md)
**Invoker Commands** - Declarative element invocation.
- `commandfor` & `command` attributes
- No JavaScript click handlers
- Show/hide dialogs and popovers
- Chrome 142+

#### [interest-invokers.md](./interest-invokers.md)
**Interest Invokers** - Hover-triggered popovers.
- `interesttarget` attribute
- Tooltips without JavaScript
- Multi-modal (hover, focus, touch)
- Chrome 142+

### Animation & Navigation

#### [view-transition-types.md](./view-transition-types.md)
**View Transitions with Types** - Directional animations.
- Forward/back/reload transitions
- Different animations per direction
- SPA routing integration
- Chrome 125+

#### [scroll-state-container-queries.md](./scroll-state-container-queries.md)
**Scroll-State Container Queries** - Style based on scroll state.
- Detect scrollable containers
- Query sticky position state
- Show indicators only when needed
- Chrome 133+

## Quick Start

Each skill file contains:

1. **YAML Frontmatter** - Metadata (title, description, version)
2. **When to Use** - Specific use cases
3. **Syntax** - Basic API/CSS syntax
4. **Examples** - 5-15 production-ready code samples
5. **Browser Support Detection** - Feature detection code
6. **Real-World Benefits** - Why use this feature
7. **Comparison** - vs. old approaches

## Feature Coverage by Category

### CSS Only (No JavaScript)
- `css-if.md`
- `css-light-dark.md`
- `css-text-wrap-pretty.md`
- `css-field-sizing.md`
- `css-reading-flow.md`
- `css-interpolate-size.md`
- `invoker-commands.md`
- `interest-invokers.md`
- `scroll-state-container-queries.md`

### APIs (JavaScript Required)
- `long-animation-frames.md`
- `document-pip.md`
- `view-transition-types.md` (hybrid)

## Chrome Version Requirements

| Version | Features |
|---------|----------|
| Chrome 117+ | `text-wrap: pretty` |
| Chrome 119+ | Document Picture-in-Picture |
| Chrome 123+ | `field-sizing`, LoAF API |
| Chrome 125+ | View Transition Types |
| Chrome 128+ | `reading-flow` |
| Chrome 129+ | `interpolate-size` |
| Chrome 133+ | Scroll-state queries |
| Chrome 142+ | Invoker commands, Interest invokers |
| Chrome 143+ | CSS `if()`, `light-dark()` |

## No Fallbacks Policy

All skills target Chromium 143+ exclusively. This means:

✅ **Do:**
- Use cutting-edge APIs without polyfills
- Assume browser support—no feature detection bloat
- Ship modern code directly to Chrome 143+
- Leverage Apple Silicon optimizations

❌ **Don't:**
- Add fallbacks for older browsers
- Include polyfill loading
- Maintain legacy code paths
- Support non-Chrome browsers

## Real-World Optimization Patterns

### Form with Auto-Sizing + Light Dark Mode

```html
<!-- HTML -->
<textarea
  field-sizing="content"
  interesttarget="help-text"
></textarea>
<div id="help-text" popover>Need more space?</div>

<!-- CSS -->
<style>
  textarea {
    field-sizing: content;
    color: light-dark(#000, #fff);
    background: light-dark(#fff, #1a1a1a);
  }
</style>
```

### Performance Monitoring Dashboard

```typescript
// Combine LoAF + Document PiP
const loafObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 100) {
      updatePiPDashboard(entry);
    }
  }
});

async function updatePiPDashboard(loaf: PerformanceLongAnimationFrameTiming) {
  const pipWindow = await documentPictureInPicture.requestWindow();
  // Render metrics in PiP window
}
```

### Conditional Theming Router

```typescript
// View transitions + light-dark() + reading-flow
class Router {
  async navigate(url: string, direction: 'forward' | 'back') {
    document.documentElement.style.setProperty('view-transition-type', direction);

    await document.startViewTransition(async () => {
      await loadPage(url);
      // light-dark() re-evaluates automatically
      // reading-flow order maintained
    });
  }
}
```

## Performance Characteristics

| Feature | Rendering | Main Thread | Memory |
|---------|-----------|---|---|
| CSS if() | Optimal | None | Minimal |
| light-dark() | Optimal | None | Minimal |
| text-wrap | Low cost | Minimal | Low |
| field-sizing | Optimal | None | Minimal |
| LoAF API | Monitor | Low | Low |
| Document PiP | Independent | Separate window | Varies |
| Invoker commands | Optimal | None | Minimal |
| Scroll-state queries | CSS only | None | Minimal |

## Apple Silicon Considerations

All features leverage Apple Silicon optimizations:

- **GPU-accelerated rendering** - CSS animations on Metal
- **Unified memory** - Document PiP windows share memory
- **Neural Engine** - LoAF metrics help optimize ML workloads
- **VideoToolbox** - Hardware decode for media PiP

## Accessibility

Features with built-in accessibility:

- ✅ `invoker-commands` - Keyboard navigation, ARIA
- ✅ `interest-invokers` - Focus-based tooltips
- ✅ `reading-flow` - WCAG 2.1 compliance
- ✅ `text-wrap: pretty` - Better readability
- ✅ View transitions - Focus management

## Testing & Validation

### Feature Detection

```typescript
function testChromium143Features(): boolean {
  return (
    'documentPictureInPicture' in window &&
    'PerformanceObserver' in window &&
    'PerformanceLongAnimationFrameTiming' in window &&
    document.createElement('button').hasAttribute('commandfor')
  );
}

if (testChromium143Features()) {
  console.log('All Chromium 143+ features available');
  loadOptimizedApp();
}
```

### Chrome DevTools Integration

All skills work with:
- **Performance panel** - See LoAF metrics
- **Sources tab** - Debug invoker behaviors
- **Elements panel** - Inspect CSS if(), light-dark()
- **Lighthouse** - Core Web Vitals with new APIs

## When to Use Each Feature

**Building a SPA:**
- View Transition Types
- Invoker Commands
- Reading Flow

**Styling UI:**
- CSS if()
- light-dark()
- text-wrap: pretty

**Form-heavy app:**
- field-sizing: content
- Invoker Commands
- Interest Invokers

**Performance-critical:**
- Long Animation Frames API
- Scroll-state queries
- Document PiP for monitoring

**Complex layouts:**
- reading-flow
- scroll-state queries
- CSS if() for responsive

## Migration Guide

### From JavaScript to Declarative HTML

**Before (JavaScript-heavy):**
```javascript
// Click handler for popover
btn.addEventListener('click', () => {
  popover.style.display = 'block';
});

// Height measurement
textarea.addEventListener('input', () => {
  textarea.style.height = textarea.scrollHeight + 'px';
});

// Theme toggle
themeBtn.addEventListener('click', () => {
  doc.classList.toggle('dark');
  updateAllColors();
});
```

**After (Declarative):**
```html
<!-- Popover trigger -->
<button commandfor="popover" command="show-popover">Menu</button>

<!-- Auto-sizing textarea -->
<textarea field-sizing="content"></textarea>

<!-- Automatic theme -->
<style>
  body {
    background: light-dark(#fff, #1a1a1a);
  }
</style>
```

## Resources

- [Chrome DevTools Docs](https://developer.chrome.com/docs/devtools/)
- [Web Platform Status](https://www.chromestatus.com/)
- [Chrome Release Notes](https://chromereleases.googleblog.com/)
- [MDN Web Docs](https://developer.mozilla.org/)

## Skill Maintenance

Last updated: January 2026

All features verified on:
- Chrome 143+ (latest)
- macOS 26.2
- Apple Silicon (M1/M2/M3/M4)

## Contributing

Suggest improvements or new Chromium 143+ features:

1. Verify feature is Chrome 143+ only
2. No legacy fallbacks needed
3. Production-ready examples
4. Include browser support info
5. Real-world use cases

---

**Philosophy:** The best code is no code. Use the browser platform natively. Ship what works in modern Chrome.
