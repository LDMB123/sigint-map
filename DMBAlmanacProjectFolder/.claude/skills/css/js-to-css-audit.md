---
name: JavaScript to CSS Replacement Audit
agent: CSS Modern Specialist
version: 1.0
chrome_minimum: 118
description: Systematic approach to identifying JavaScript implementations that can be replaced with modern CSS features (Chrome 118+)
category: css-modernization
complexity: medium
---

# JavaScript to CSS Replacement Audit

## When to Use

Use this skill when you need to:

- Audit a codebase for unnecessary JavaScript implementations of CSS-achievable patterns
- Identify scroll-linked behaviors that should use `animation-timeline: scroll()`
- Find hover/interaction handling that can be replaced with CSS pseudo-classes
- Detect animation/transition logic that should use native CSS
- Replace positioning libraries with CSS anchor positioning (Chrome 125+)
- Remove state-based styling logic that can use CSS custom properties

**Typical Scenarios:**
- Migration from styled-components to native CSS
- Reducing JavaScript bundle size
- Improving animation performance on 120Hz displays
- Modernizing legacy web applications

---

## Required Inputs

| Input | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Codebase Path | string | Yes | `/src/` | Directory containing components and CSS |
| Framework Type | enum | Yes | svelte, react, vue, vanilla | Determines file pattern matching |
| Include Patterns | string[] | No | `['*.svelte', '*.tsx']` | File types to analyze |
| Current Bundle Size | number | No | 320 | Current JS bundle size (KB) for impact calculation |
| Performance Targets | object | No | `{ lcp: 1.0, inp: 100 }` | Target metrics to optimize for |

---

## Steps

### Step 1: Discover JavaScript Patterns to Replace

Search codebase for common patterns that CSS can handle:

```bash
# Hover state handling
grep -r "onMouseEnter\|onMouseLeave\|@mouseenter\|@mouseleave" --include="*.tsx" --include="*.svelte" --include="*.vue"

# Scroll event listeners
grep -r "addEventListener.*scroll\|@scroll\|onScroll\|useEffect.*window" --include="*.tsx" --include="*.vue"

# Animation timing state
grep -r "setTimeout\|setInterval\|requestAnimationFrame" --include="*.tsx" --include="*.vue"

# Positioning logic (Popper.js, Floating UI)
grep -r "usePopperState\|useFloating\|placement\|autoPlacement" --include="*.tsx" --include="*.vue"

# Theme/dark mode switching
grep -r "theme.*state\|setTheme\|darkMode.*useState" --include="*.tsx" --include="*.vue"

# CSS-in-JS styled components
grep -r "styled\.\|css\`\|createUseStyles" --include="*.tsx" --include="*.jsx" --include="*.ts"
```

### Step 2: Categorize Replacement Opportunities

Create a spreadsheet with these columns:

| Pattern Type | Current Implementation | CSS Alternative | Complexity | Estimated JS Saved |
|---|---|---|---|---|
| Hover Effects | `onMouseEnter` handler | `:hover` pseudo-class | Low | 0.5KB |
| Scroll Effects | `addEventListener('scroll')` | `animation-timeline: scroll()` | Medium | 2-5KB |
| Positioning | Popper.js library | CSS anchor positioning | Medium | 50KB |
| Theme Switching | `useState(theme)` | CSS custom properties + `if()` | Medium | 1-2KB |
| Animations | `useSpring()` animation library | CSS keyframes | Low-Medium | 15-30KB |

### Step 3: Identify High-Impact Targets

Prioritize by impact:

```javascript
// Calculate impact score
const impactScore = {
  jsSize: savedBytesSaved,           // Bytes removed from JS bundle
  cssSize: cssAddedBytes,             // Bytes added to CSS
  performanceGain: msImprovement,     // LCP/INP improvement in ms
  userReached: percentageOfUsers,     // % of users affected by change
};

// Formula: (jsSize * 0.8 + performanceGain * 10) / (cssSize * 0.2 + complexity * 5)
```

### Step 4: Audit Hover State Patterns

#### Pattern: JavaScript Hover Handlers

**Before (React with styled-components):**
```tsx
const [isHovered, setIsHovered] = useState(false);

return (
  <Card
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    style={{
      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 12px 24px rgba(0,0,0,0.15)' : 'none'
    }}
  />
);
```

**After (Native CSS):**
```css
.card {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
```

**Impact:** Remove 40 lines of JSX, eliminate re-render on every hover event

### Step 5: Audit Scroll-Linked Animations

#### Pattern: Scroll Event Listeners

**Before (React with useEffect):**
```tsx
useEffect(() => {
  const handleScroll = () => {
    const scrolled = window.scrollY;
    const opacity = Math.min(scrolled / 300, 1);
    setHeaderOpacity(opacity);
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

return <header style={{ opacity: headerOpacity }} />;
```

**After (CSS scroll-driven animations - Chrome 115+):**
```css
@supports (animation-timeline: scroll()) {
  .header {
    animation: headerFade linear both;
    animation-timeline: scroll();
    animation-range: 0px 300px;
  }

  @keyframes headerFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}

@supports not (animation-timeline: scroll()) {
  /* Fallback for older browsers */
  .header {
    opacity: 1;
  }
}
```

**Impact:** Remove event listener, eliminate scroll jank, 120fps on ProMotion displays

### Step 6: Audit Positioning Logic (Tooltips, Dropdowns)

#### Pattern: JavaScript Positioning Libraries

**Before (React with Floating UI):**
```tsx
const { refs, floatingStyles } = useFloating({
  placement: 'bottom',
  middleware: [offset(10), flip(), shift()],
});

return (
  <button ref={refs.setReference}>Trigger</button>
  <div ref={refs.setFloating} style={floatingStyles}>
    Tooltip
  </div>
);
```

**After (CSS Anchor Positioning - Chrome 125+):**
```html
<button class="trigger">Trigger</button>
<div class="tooltip">Tooltip</div>
```

```css
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 10px;
  position-try-fallbacks: flip-block, flip-inline;
}
```

**Impact:** Remove 50KB Floating UI library, eliminate positioning calculations

### Step 7: Audit Theme/Dark Mode Switching

#### Pattern: JavaScript Theme State Management

**Before (React with Context):**
```tsx
const [theme, setTheme] = useState('light');

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);

return (
  <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
    Toggle
  </button>
);
```

**After (CSS if() - Chrome 143+):**
```html
<button onclick="toggleTheme()">Toggle</button>

<script>
function toggleTheme() {
  const root = document.documentElement;
  const newTheme = getComputedStyle(root).getPropertyValue('--theme-mode').trim() === 'light' ? 'dark' : 'light';
  root.style.setProperty('--theme-mode', newTheme);
}
</script>
```

```css
:root {
  --theme-mode: light;
  --background: if(style(--theme-mode: dark), #1a1a1a, #ffffff);
  --text: if(style(--theme-mode: dark), #ffffff, #000000);
}
```

**Impact:** Simplify theme logic, enable CSS-only theme switching

### Step 8: Create Migration Report

Generate detailed audit report with:

```markdown
# JavaScript to CSS Replacement Audit Report

## Summary
- Total JS patterns found: 47
- CSS-replaceable patterns: 38 (81%)
- Estimated JS savings: 85KB (26% of bundle)
- Estimated CSS additions: 12KB

## High-Priority Replacements

1. **Hover Effects (8 instances)**
   - Current: useState + onMouseEnter handlers
   - Replacement: :hover pseudo-class
   - Savings: 5KB JS, +0.5KB CSS
   - Complexity: Low
   - Time: 30 minutes

2. **Scroll Animations (5 instances)**
   - Current: addEventListener('scroll') with requestAnimationFrame
   - Replacement: animation-timeline: scroll()
   - Savings: 12KB JS, +2KB CSS
   - Complexity: Medium
   - Time: 2 hours

3. **Tooltip Positioning (3 instances)**
   - Current: Floating UI library (50KB)
   - Replacement: CSS anchor positioning
   - Savings: 50KB JS, +1.5KB CSS
   - Complexity: Medium
   - Time: 1 hour

## Browser Support Fallbacks
- Chrome 143+ (full support)
- Chrome 125-142 (anchor positioning fallback)
- Chrome 115-124 (scroll animations fallback)
- Older browsers (regular animations + media queries)
```

### Step 9: Implementation Validation

For each replacement, verify:

```javascript
// Checklist for each migration
const validationChecklist = {
  css_syntax_valid: false,        // Run through CSS validator
  browser_support_verified: false, // Test in Chrome 143+
  performance_improved: false,     // Measure with DevTools
  accessibility_maintained: false, // Test keyboard, screen readers
  feature_parity_achieved: false,  // All JS behavior replicated
  test_coverage_updated: false,    // Update test files
  fallbacks_implemented: false,    // Older browser support
};
```

---

## Expected Output

### 1. Audit Report (Markdown)

```markdown
# JavaScript to CSS Audit Report
Generated: 2026-01-21
Codebase: DMB Almanac Svelte

## Findings Summary
- Total patterns analyzed: 156 files
- Replaceable with CSS: 47 patterns
- JS bundle reduction: 85KB (26%)
- CSS bundle increase: 12KB (27%)
- Net savings: 73KB

## By Category
| Pattern | Count | Savings | Complexity | Priority |
|---------|-------|---------|-----------|----------|
| Hover effects | 8 | 5KB | Low | HIGH |
| Scroll effects | 5 | 12KB | Medium | HIGH |
| Positioning | 3 | 50KB | Medium | HIGH |
| Animations | 12 | 18KB | Medium | MEDIUM |
| Theme switching | 2 | 3KB | Medium | MEDIUM |
| Layout calculations | 4 | 8KB | High | LOW |

## Specific Opportunities
1. ShowCard component: Remove onMouseEnter handlers → use :hover
2. Header component: Replace scroll listener → animation-timeline: scroll()
3. Tooltip system: Replace Popper.js → CSS anchor positioning
```

### 2. Migration Plan (JSON)

```json
{
  "audit_date": "2026-01-21",
  "codebase": "DMB Almanac Svelte",
  "opportunities": [
    {
      "id": "hover-card-effects",
      "category": "hover-state",
      "affected_files": ["src/lib/components/ui/Card.svelte"],
      "current_implementation": "useState + onMouseEnter",
      "proposed_replacement": ":hover pseudo-class",
      "js_saved_bytes": 5000,
      "css_added_bytes": 150,
      "complexity": "low",
      "estimated_hours": 0.5,
      "chrome_minimum": 118,
      "fallback_strategy": "None needed - :hover is universally supported"
    },
    {
      "id": "scroll-linked-animations",
      "category": "scroll-effects",
      "affected_files": ["src/lib/components/navigation/Header.svelte"],
      "current_implementation": "addEventListener + requestAnimationFrame",
      "proposed_replacement": "animation-timeline: scroll()",
      "js_saved_bytes": 12000,
      "css_added_bytes": 500,
      "complexity": "medium",
      "estimated_hours": 2,
      "chrome_minimum": 115,
      "fallback_strategy": "@supports (animation-timeline: scroll()) { /* modern */ } @supports not (...) { /* fallback */ }"
    }
  ],
  "summary": {
    "total_opportunities": 47,
    "total_js_savings": 85000,
    "total_css_additions": 12000,
    "net_savings": 73000,
    "estimated_total_hours": 12
  }
}
```

### 3. Implementation Examples

```css
/* Example: Hover Effects Migration */
.card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

/* Example: Scroll-Driven Animations */
@supports (animation-timeline: scroll()) {
  .header {
    animation: shrinkOnScroll linear both;
    animation-timeline: scroll();
    animation-range: 0px 100px;
  }

  @keyframes shrinkOnScroll {
    from { padding-block: 1rem; font-size: 1.5rem; }
    to { padding-block: 0.5rem; font-size: 1rem; }
  }
}

/* Example: CSS Anchor Positioning */
@supports (anchor-name: --anchor) {
  .trigger {
    anchor-name: --trigger;
  }

  .tooltip {
    position: absolute;
    position-anchor: --trigger;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 10px;
    position-try-fallbacks: flip-block;
  }
}
```

---

## Performance Impact Examples

### Before (JavaScript-heavy)
```
JS Bundle: 320KB
CSS Bundle: 45KB
LCP: 1.2s
INP: 120ms
Animations: ~60fps (scroll jank)
```

### After (CSS-modern)
```
JS Bundle: 235KB (↓ 85KB)
CSS Bundle: 57KB (↑ 12KB)
LCP: 1.0s (↓ 200ms)
INP: 85ms (↓ 35ms)
Animations: 120fps (smooth on ProMotion)
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Fallback |
|---------|--------|---------|--------|----------|
| `:hover` pseudo-class | All | All | All | None needed |
| `animation-timeline: scroll()` | 115+ | N/A | 17.4+ | @supports block + regular animations |
| CSS anchor positioning | 125+ | N/A | N/A | Absolute positioning fallback |
| CSS `if()` function | 143+ | N/A | N/A | @supports block + alternative styling |
| CSS custom properties | 49+ | 31+ | 9.1+ | Inline fallback values |

---

## Related Skills

- **css-nesting.md** - Replace CSS preprocessor nesting
- **scroll-driven-animations.md** - Implement scroll-linked effects
- **apple-silicon-optimization.md** - Performance tuning
- **logical-properties.md** - RTL/internationalization support

---

## References

- [Chrome Features CSV](https://chromestatus.com/features/schedule)
- [CSS Scroll-Driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/scroll)
- [CSS Anchor Positioning](https://developer.chrome.com/docs/css-ui/anchor-positioning)
- [Web Vitals Guide](https://web.dev/vitals/)
