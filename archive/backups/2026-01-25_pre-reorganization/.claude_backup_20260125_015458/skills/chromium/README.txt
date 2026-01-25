# Chromium 143+ Skills Library

Global skills for implementing modern Chromium features (Chrome 102+, optimized for Chrome 143+). These skills are framework-agnostic and work with React, Vue, Svelte, Next.js, SvelteKit, or vanilla JavaScript.

## Available Skills

### 1. scheduler-yield.md
**Trigger:** `/scheduler-yield`

Implement `scheduler.yield()` to improve INP (Interaction to Next Paint) by yielding long-running JavaScript tasks back to the browser.

**When to use:**
- Long-running JS tasks blocking user interactions
- Large DOM updates causing UI freezes
- Processing large datasets client-side
- INP scores > 200ms in Core Web Vitals

**Browser support:** Chrome 129+ (with setTimeout fallback for older browsers)

**Expected improvement:** 60-90% reduction in INP (typically from 300-500ms down to 50-100ms)

---

### 2. speculation-rules.md
**Trigger:** `/speculation-rules`

Configure Speculation Rules API to prerender pages and improve LCP through intelligent prefetching and prerendering.

**When to use:**
- Multi-page applications (MPAs) with predictable navigation
- High-traffic navigation paths (product pages, search results)
- LCP scores > 2.5s that need improvement
- E-commerce, blogs, documentation sites

**Browser support:** Chrome 121+ for basic support, Chrome 126+ for cross-document transitions

**Expected improvement:** LCP reduced from ~2.8s to ~0.3s for prerendered pages (89% faster)

---

### 3. container-queries.md
**Trigger:** `/container-queries`

Implement CSS Container Queries for component-based responsive design that responds to container size instead of viewport size.

**When to use:**
- Building reusable components that work in multiple contexts
- Component libraries needing intrinsic responsiveness
- Card grids, responsive tables, modular UI systems
- Components that don't know their placement (sidebar vs. main vs. modal)

**Browser support:** Chrome 105+, Safari 16+, Firefox 110+ (with @media fallback)

**Expected improvement:** True component-based responsive design without JavaScript

---

### 4. view-transitions.md
**Trigger:** `/view-transitions`

Implement View Transitions API for smooth, animated page transitions without JavaScript animation libraries.

**When to use:**
- SPAs needing smooth route transitions
- MPAs wanting native-app-like navigation
- Image galleries with hero image transitions
- List-to-detail navigation patterns
- Replacing JavaScript animation libraries

**Browser support:**
- Chrome 111+ for same-document transitions
- Chrome 126+ for cross-document transitions
- Safari 18+ (limited support)

**Expected improvement:** GPU-accelerated 60fps transitions, no animation library overhead

---

### 5. navigation-api.md
**Trigger:** `/navigation-api`

Implement Navigation API for modern SPA navigation patterns with centralized history management and automatic coordination with View Transitions.

**When to use:**
- Single Page Applications with client-side routing
- Centralized navigation control
- Coordinating navigation with View Transitions
- Back/forward button handling
- Navigation state management

**Browser support:** Chrome 102+ (with History API fallback)

**Expected improvement:** Simpler navigation code, better state management, smooth transitions

---

## Usage Examples

### Basic Usage

Each skill follows this pattern:

1. **When to Use** - Specific scenarios where the skill applies
2. **Required Inputs** - What information you need to provide
3. **Steps** - Detailed implementation guide with code examples
4. **Expected Output** - What to expect after implementation
5. **Best Practices** - Do's and don'ts
6. **Browser Compatibility** - Support matrix and fallbacks

### Combining Skills

These skills work great together:

**Example 1: Fast SPA with Smooth Transitions**
```
/scheduler-yield + /view-transitions + /navigation-api
```
Result: Responsive UI (low INP) + smooth page transitions + centralized navigation

**Example 2: High-Performance MPA**
```
/speculation-rules + /view-transitions + /container-queries
```
Result: Instant page loads + smooth navigation + responsive components

**Example 3: Component Library**
```
/container-queries + /scheduler-yield
```
Result: Intrinsically responsive components + smooth rendering

---

## Framework Compatibility

All skills include examples for:
- **Vanilla JavaScript/TypeScript** - Universal implementation
- **React** - Hooks and components
- **Vue 3** - Composables
- **Svelte/SvelteKit** - Actions and stores
- **Next.js** - App Router patterns

---

## Performance Targets

When implementing all five skills, expect these Core Web Vitals improvements:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **LCP** | ~2.8s | ~0.3s | 89% faster (with speculation rules) |
| **INP** | ~300ms | ~50ms | 83% faster (with scheduler.yield) |
| **CLS** | ~0.1 | ~0.05 | 50% better (with container queries) |

---

## Browser Requirements

### Minimum (with fallbacks)
- Any modern browser with ES6+ support
- All skills include fallbacks for unsupported browsers

### Recommended
- Chrome/Edge 143+ for full feature set
- Chrome/Edge 129+ for scheduler.yield()
- Chrome/Edge 126+ for cross-document transitions
- Safari 18+ for partial View Transitions support

### Feature Detection

All skills include feature detection:

```typescript
// Check support before using
if ('scheduler' in window && 'yield' in window.scheduler) {
  // Use scheduler.yield()
}

if ('speculationrules' in HTMLScriptElement) {
  // Use Speculation Rules
}

if (document.startViewTransition) {
  // Use View Transitions
}

if ('navigation' in window) {
  // Use Navigation API
}

// Container Queries (CSS)
@supports (container-type: inline-size) {
  /* Use container queries */
}
```

---

## Getting Started

1. **Identify your use case** - See "When to Use" section in each skill
2. **Check browser requirements** - Ensure target browsers are supported
3. **Follow the steps** - Each skill has detailed implementation guide
4. **Test thoroughly** - Use DevTools to verify improvements
5. **Measure impact** - Track Core Web Vitals before/after

---

## Contributing

These skills are based on:
- Official W3C/WICG specifications
- Chrome DevRel documentation
- Real-world implementation in DMB Almanac project
- Framework best practices

To add new Chromium features:
1. Read the reference documentation
2. Generalize for framework-agnostic use
3. Include fallbacks for older browsers
4. Add real-world examples
5. Document expected outcomes

---

## References

### Official Documentation
- [Chromium Blog](https://developer.chrome.com/blog/)
- [Chrome Platform Status](https://chromestatus.com/)
- [Web.dev](https://web.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)

### Specifications
- [Scheduler API (WICG)](https://wicg.github.io/scheduling-apis/)
- [Speculation Rules (WICG)](https://github.com/WICG/nav-speculation)
- [CSS Container Queries (W3C)](https://www.w3.org/TR/css-contain-3/)
- [View Transitions (CSSWG)](https://drafts.csswg.org/css-view-transitions/)
- [Navigation API (WICG)](https://github.com/WICG/navigation-api)

### Browser Support
- [Can I Use](https://caniuse.com/)
- [Chrome Releases](https://chromiumdash.appspot.com/releases)
- [Safari Feature Status](https://webkit.org/status/)
- [Firefox Platform Status](https://platform-status.mozilla.org/)

---

## License

These skills are MIT licensed and free to use in any project.

## Credits

Created by generalizing implementation patterns from the DMB Almanac Svelte PWA project, targeting Chromium 143+ on Apple Silicon.
