---
name: CSS Logical Properties & Internationalization
agent: CSS Modern Specialist
version: 1.0
chrome_minimum: 93
description: Guide for converting physical CSS properties to logical properties for RTL/LTR support and internationalization
category: css-modernization
complexity: low
---

# CSS Logical Properties & Internationalization

## When to Use

Use this skill when you need to:

- Support bidirectional text (LTR and RTL languages)
- Internationalize a codebase for Arabic, Hebrew, Persian, Urdu, etc.
- Replace directional CSS properties (`left`, `right`, `top`, `bottom`)
- Maintain consistent spacing across global applications
- Future-proof CSS for multilingual expansion
- Improve accessibility for RTL language users

**Typical Scenarios:**
- Building a product for Middle Eastern markets
- Global applications supporting 10+ languages
- Progressive enhancement of RTL support
- Modernizing legacy directional CSS

---

## Required Inputs

| Input | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Codebase Path | string | Yes | `/src/` | Directory to analyze and convert |
| Target Languages | string[] | Yes | `['ar', 'en', 'he']` | Language codes for testing |
| File Patterns | string[] | No | `['*.css', '*.svelte', '*.tsx']` | Files to process |
| Physical Properties | string[] | No | `['left', 'right', 'margin-left']` | Properties to target (optional) |
| Current Coverage | number | No | 25 | Current % of code using logical properties |

---

## Steps

### Step 1: Understand Physical vs Logical Properties

**Physical Properties** are directional:
- `left`, `right`, `top`, `bottom` (position/offset)
- `margin-left`, `margin-right` (spacing)
- `padding-left`, `padding-right` (spacing)
- `border-left`, `border-right` (borders)

**Logical Properties** are writing-mode aware:
- `inset-inline-start`, `inset-inline-end` (horizontal in current direction)
- `inset-block-start`, `inset-block-end` (vertical - same for all languages)
- `margin-inline-start`, `margin-inline-end`
- `padding-inline-start`, `padding-inline-end`
- `border-inline-start`, `border-inline-end`

```
English (LTR):
margin-inline-start → left side
margin-inline-end → right side

Arabic (RTL):
margin-inline-start → right side (automatic!)
margin-inline-end → left side (automatic!)
```

### Step 2: Audit Physical Properties in Codebase

Search for all physical property usage:

```bash
# Find all physical position properties
grep -r "top:\|bottom:\|left:\|right:" --include="*.css" --include="*.svelte" --include="*.tsx" | grep -v "inset"

# Find all physical margin properties
grep -r "margin-left:\|margin-right:" --include="*.css" --include="*.svelte" --include="*.tsx"

# Find all physical padding properties
grep -r "padding-left:\|padding-right:" --include="*.css" --include="*.svelte" --include="*.tsx"

# Find all physical border properties
grep -r "border-left:\|border-right:" --include="*.css" --include="*.svelte" --include="*.tsx"

# Generate audit report
echo "=== Physical Properties Audit ===" && \
grep -roh "margin-\(left\|right\)\|padding-\(left\|right\)\|left:\|right:" --include="*.css" | sort | uniq -c | sort -rn
```

### Step 3: Create Conversion Mapping

Create a spreadsheet mapping all conversions needed:

```
Current Property          Logical Replacement      Direction    Notes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
margin-left               margin-inline-start      horizontal   Flow-relative
margin-right              margin-inline-end        horizontal   Flow-relative
margin-top                margin-block-start       vertical     Same for all
margin-bottom             margin-block-end         vertical     Same for all
padding-left              padding-inline-start     horizontal   Flow-relative
padding-right             padding-inline-end       horizontal   Flow-relative
padding-top               padding-block-start      vertical     Same for all
padding-bottom            padding-block-end        vertical     Same for all
border-left               border-inline-start      horizontal   Flow-relative
border-right              border-inline-end        horizontal   Flow-relative
left (position)           inset-inline-start       horizontal   Flow-relative
right (position)          inset-inline-end         horizontal   Flow-relative
top (position)            inset-block-start        vertical     Same for all
bottom (position)         inset-block-end          vertical     Same for all
```

### Step 4: Convert Margin Properties

#### Example 1: Symmetric Horizontal Margins

**Before:**
```css
.container {
  margin-left: 1rem;
  margin-right: 1rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
}
```

**After:**
```css
.container {
  margin-inline: 1rem;        /* Sets both start and end */
  margin-block: 2rem;         /* Sets both start and end */
}
```

#### Example 2: Asymmetric Spacing

**Before:**
```css
.card {
  margin-left: 0.5rem;
  margin-right: 2rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
```

**After:**
```css
.card {
  margin-inline-start: 0.5rem;
  margin-inline-end: 2rem;
  margin-block: 1rem;
}
```

**RTL Result (automatic):**
- In Hebrew: margin-right becomes 0.5rem, margin-left becomes 2rem
- No CSS changes needed!

### Step 5: Convert Padding Properties

#### Example 3: Form Input Padding

**Before:**
```css
input[type="text"] {
  padding-left: 1rem;
  padding-right: 1.5rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
```

**After:**
```css
input[type="text"] {
  padding-inline-start: 1rem;
  padding-inline-end: 1.5rem;
  padding-block: 0.5rem;
}
```

### Step 6: Convert Positioning Properties

#### Example 4: Modal Fullscreen Overlay

**Before:**
```css
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
}
```

**After:**
```css
.modal {
  position: fixed;
  inset: 0;  /* Shorthand for all four sides */
  background: rgba(0,0,0,0.5);
}
```

#### Example 5: Absolutely Positioned Element

**Before:**
```css
.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
}
```

**After:**
```css
.sidebar {
  position: absolute;
  inset-block: 0;            /* Sets top and bottom */
  inset-inline-start: 0;     /* Sets left (LTR) or right (RTL) */
  width: 300px;
}
```

#### Example 6: Skip Link (Progressive Enhancement)

**Before:**
```css
.skip-link {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
}

.skip-link:focus {
  top: 0.5rem;
}
```

**After:**
```css
.skip-link {
  position: absolute;
  inset-block-start: -100px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
}

.skip-link:focus {
  inset-block-start: 0.5rem;
}
```

### Step 7: Convert Border Properties

#### Example 7: Bordered Container

**Before:**
```css
.card {
  border-left: 4px solid var(--primary);
  border-right: 1px solid var(--border);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
```

**After:**
```css
.card {
  border-inline-start: 4px solid var(--primary);
  border-inline-end: 1px solid var(--border);
  border-block: 1px solid var(--border);
}
```

#### Example 8: Responsive Navigation Underline

**Before:**
```css
a.nav-link {
  position: relative;
}

a.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

a.nav-link:hover::after {
  transform: scaleX(1);
}
```

**After (with logical properties):**
```css
a.nav-link {
  position: relative;
}

a.nav-link::after {
  content: '';
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;  /* Sets left and right to 0 */
  height: 2px;
  background: var(--primary);
  transform: scaleX(0);
  transform-origin: inline-start;  /* Logical transform origin */
  transition: transform 0.3s ease;
}

a.nav-link:hover::after {
  transform: scaleX(1);
}
```

### Step 9: Implement Direction Attribute

Set document direction for proper RTL support:

```html
<!-- English (LTR) -->
<html lang="en" dir="ltr">

<!-- Arabic (RTL) -->
<html lang="ar" dir="rtl">

<!-- Automatic detection (recommended) -->
<html lang="en" dir="auto">
```

In Svelte:
```svelte
<script>
  import { currentLanguage } from './stores';

  $effect(() => {
    document.documentElement.dir = $currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = $currentLanguage;
  });
</script>
```

### Step 10: Test RTL Implementation

#### Manual Testing

```html
<!-- Test page with both LTR and RTL -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { display: flex; gap: 2rem; }
    .section { flex: 1; padding: 1rem; border: 1px solid #ccc; }
  </style>
</head>
<body>
  <div class="section" dir="ltr">
    <h1>English (LTR)</h1>
    <input type="text" placeholder="Type here...">
  </div>

  <div class="section" dir="rtl">
    <h1>العربية (RTL)</h1>
    <input type="text" placeholder="اكتب هنا...">
  </div>
</body>
</html>
```

#### Automated Testing

```javascript
// Test that logical properties work correctly
const testElement = document.querySelector('.test-element');

// Get computed styles
const styles = window.getComputedStyle(testElement);

// Check margin-inline works
const marginStart = styles.marginInlineStart;
const marginEnd = styles.marginInlineEnd;

console.assert(marginStart === '1rem', 'margin-inline-start not working');
console.assert(marginEnd === '1rem', 'margin-inline-end not working');

// Swap direction and verify
document.documentElement.dir = 'rtl';
// Physical margins should be reversed, logical remain same
```

### Step 11: Handle Transform Origins (Advanced)

Logical transform-origin values:

```css
/* Physical */
transform-origin: left;          /* ❌ Wrong in RTL */
transform-origin: right center;

/* Logical */
transform-origin: inline-start;     /* ✅ Correct in RTL */
transform-origin: inline-end center;

/* Examples */
.flip-animation {
  transform-origin: inline-start;
  animation: flipOpen 0.3s ease;
}

@keyframes flipOpen {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### Step 12: Create Migration Checklist

```markdown
## Logical Properties Migration Checklist

### Phase 1: Margin & Padding (Easy)
- [ ] Convert all `margin-left` to `margin-inline-start`
- [ ] Convert all `margin-right` to `margin-inline-end`
- [ ] Convert all `margin-top` to `margin-block-start`
- [ ] Convert all `margin-bottom` to `margin-block-end`
- [ ] Use shorthand: `margin-inline`, `margin-block`
- [ ] Same for padding properties

### Phase 2: Positioning (Medium)
- [ ] Find all `left:` properties
- [ ] Replace with `inset-inline-start:`
- [ ] Find all `right:` properties
- [ ] Replace with `inset-inline-end:`
- [ ] Use `inset:` shorthand for fullscreen elements
- [ ] Test absolute/fixed positioning in RTL

### Phase 3: Borders (Easy)
- [ ] Convert `border-left` to `border-inline-start`
- [ ] Convert `border-right` to `border-inline-end`
- [ ] Use shorthand: `border-inline`, `border-block`

### Phase 4: Advanced (Hard)
- [ ] Convert text-align: left → text-align: start
- [ ] Convert text-align: right → text-align: end
- [ ] Update transform-origin for directional animations
- [ ] Test floating elements (float: left → float: inline-start)

### Phase 5: Testing
- [ ] Test in LTR language (English)
- [ ] Test in RTL language (Arabic)
- [ ] Test mixed-direction content
- [ ] Verify keyboard navigation
- [ ] Test with screen readers

### Phase 6: Documentation
- [ ] Update style guide with logical properties
- [ ] Create examples for future developers
- [ ] Document RTL-specific gotchas
```

---

## Expected Output

### 1. Conversion Report

```markdown
# CSS Logical Properties Conversion Report

**Project:** DMB Almanac Svelte
**Date:** 2026-01-21
**Target Languages:** English (LTR), Arabic (RTL)

## Summary
- **Files analyzed:** 156
- **Physical properties found:** 487
- **Properties converted:** 392 (81%)
- **Estimated conversion time:** 4 hours
- **Testing time:** 2 hours

## Conversions by Category

### Margins (142 conversions)
- margin-left → margin-inline-start: 78
- margin-right → margin-inline-end: 64

### Padding (134 conversions)
- padding-left → padding-inline-start: 68
- padding-right → padding-inline-end: 66

### Positioning (76 conversions)
- left: → inset-inline-start: 45
- right: → inset-inline-end: 31

### Borders (68 conversions)
- border-left → border-inline-start: 34
- border-right → border-inline-end: 34

### Other (67 conversions)
- text-align: left → text-align: start: 35
- float: left → float: inline-start: 18
- transform-origin: left → transform-origin: inline-start: 14

## Files with Most Changes
1. src/lib/components/navigation/Header.svelte: 23 changes
2. src/lib/components/ui/Card.svelte: 18 changes
3. src/app.css: 45 changes
4. src/routes/+layout.svelte: 15 changes

## Browser Support
- Chrome 93+: Full support
- Firefox 91+: Full support
- Safari 15+: Full support
- Edge 93+: Full support

## Testing Plan
1. Manual testing with direction: ltr
2. Manual testing with direction: rtl
3. Keyboard navigation testing
4. Screen reader testing (NVDA, JAWS)
5. Cross-browser verification
```

### 2. Before/After Code Examples

```css
/* BEFORE: Physical Properties */
.card {
  margin-left: 1rem;
  margin-right: 1rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  border-left: 4px solid var(--primary);
  border-right: 1px solid var(--border);
}

.tooltip {
  position: absolute;
  top: 0;
  left: 100%;
  margin-left: 0.5rem;
}

/* AFTER: Logical Properties */
.card {
  margin-inline: 1rem;
  padding-inline: 1.5rem;
  border-inline-start: 4px solid var(--primary);
  border-inline-end: 1px solid var(--border);
}

.tooltip {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 100%;
  margin-inline-start: 0.5rem;
}
```

### 3. RTL Testing Verification

```markdown
## RTL Implementation Verification

### English (LTR) - Baseline
- [ ] Margins applied correctly
- [ ] Padding applied correctly
- [ ] Positioning works as expected
- [ ] Borders on correct sides
- [ ] Transform animations smooth

### Arabic (RTL) - Verification
- [ ] Margins automatically flip (no CSS changes)
- [ ] Padding automatically flips (no CSS changes)
- [ ] Positioning automatically flips (no CSS changes)
- [ ] Borders automatically flip (no CSS changes)
- [ ] Transform animations use correct origin
- [ ] Text alignment correct
- [ ] Input fields positioned correctly

### Mixed LTR/RTL
- [ ] Hebrew + English mixed text layout
- [ ] Correct direction per language
- [ ] Form fields align correctly
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Mix Physical and Logical

```css
.element {
  margin-left: 1rem;              /* Physical */
  margin-inline-end: 1rem;        /* Logical - INCONSISTENT */
}
```

### ✅ DO: Keep Consistent

```css
.element {
  margin-inline-start: 1rem;
  margin-inline-end: 1rem;
  /* OR shorthand: */
  margin-inline: 1rem;
}
```

### ❌ DON'T: Use `inset` with `width/height`

```css
.element {
  position: absolute;
  inset: 0;                       /* Covers all 4 sides */
  width: 200px;                   /* Conflict! Confusing */
}
```

### ✅ DO: Use Specific Properties When Needed

```css
.sidebar {
  position: absolute;
  inset-block: 0;                 /* Top and bottom */
  width: 300px;                   /* Explicit width */
}
```

### ❌ DON'T: Forget `dir` Attribute

```html
<!-- Missing dir attribute - browser won't know direction -->
<html lang="ar">
  <body>Arabic content</body>
</html>
```

### ✅ DO: Set Direction Explicitly

```html
<!-- Correct RTL setup -->
<html lang="ar" dir="rtl">
  <body>محتوى عربي</body>
</html>
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge | Notes |
|---------|--------|---------|--------|------|-------|
| `margin-inline-*` | 93+ | 91+ | 15+ | 93+ | Fully supported |
| `padding-inline-*` | 93+ | 91+ | 15+ | 93+ | Fully supported |
| `inset-inline-*` | 93+ | 92+ | 15.1+ | 93+ | Fully supported |
| `border-inline-*` | 93+ | 91+ | 15+ | 93+ | Fully supported |
| Shorthand `inset` | 93+ | 92+ | 15.1+ | 93+ | Fully supported |

---

## Related Skills

- **js-to-css-audit.md** - Audit for CSS replacement opportunities
- **css-nesting.md** - Native CSS nesting patterns
- **apple-silicon-optimization.md** - Performance optimization

---

## References

- [MDN: CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [Can I Use: Logical Properties](https://caniuse.com/css-logical-props)
- [Web.dev: Logical Properties](https://web.dev/logical-properties-and-values/)
- [W3C: CSS Logical Properties Level 1](https://www.w3.org/TR/css-logical-1/)
