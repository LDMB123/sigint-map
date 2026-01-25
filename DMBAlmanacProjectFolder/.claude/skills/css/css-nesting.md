---
name: Native CSS Nesting
agent: CSS Modern Specialist
version: 1.0
chrome_minimum: 120
description: Use native CSS nesting (Chrome 120+) to reduce CSS preprocessor dependency
category: css-modernization
complexity: low
---

# Native CSS Nesting (Chrome 120+)

**For Chromium 2025:** Use native CSS nesting from project start. No Sass/Less needed.

## When to Use

Use this skill when you need to:

**For New Chromium 2025+ Projects:**
- Write native CSS nesting from the start (no build tools needed)
- Reduce bundle size by eliminating CSS preprocessors
- Simplify CSS organization without external dependencies
- Improve CSS readability with visual hierarchy
- Use modern browser capabilities directly

**For Existing Projects:**
- Migrate from Sass/Less to native CSS
- Replace CSS-in-JS with CSS files
- Eliminate preprocessor build complexity
- Reduce tooling overhead

**Browser Compatibility:**
- Chrome 120+ (stable since early 2024)
- Firefox 117+ (partial support)
- Safari 17.2+ (full support)
- Edge 120+

---

## Required Inputs

| Input | Type | Required | Example | Notes |
|-------|------|----------|---------|-------|
| Codebase Path | string | Yes | `/src/` | Directory to migrate |
| Current Preprocessor | enum | Yes | sass, less, none | Current CSS tool |
| File Patterns | string[] | No | `['*.scss', '*.css']` | Files to convert |
| Nesting Depth | number | No | 3 | Max nesting levels to use |
| Support Older Browsers | boolean | No | true | Generate fallbacks |
| Preserve Comments | boolean | No | true | Keep preprocessor comments |

---

## Steps

### Step 1: Understand Native CSS Nesting Syntax

CSS nesting allows selectors to nest within parent selectors using `&` to reference parent:

```css
/* BEFORE: Flat CSS */
.card { padding: 1rem; }
.card-title { font-size: 1.5rem; }
.card-title:hover { color: var(--primary); }
.card-content { margin-top: 1rem; }
.card-content p { line-height: 1.6; }

/* AFTER: Nested CSS */
.card {
  padding: 1rem;

  .card-title {
    font-size: 1.5rem;

    &:hover {
      color: var(--primary);
    }
  }

  .card-content {
    margin-top: 1rem;

    p {
      line-height: 1.6;
    }
  }
}
```

**Key Rules:**
- Use `&` to reference the parent selector
- Nest child selectors indented under parent
- Can nest pseudo-classes like `:hover`, `:focus`
- Can nest media queries and `@supports` blocks
- Can concatenate `&` with other selectors

### Step 2: Audit Preprocessor Nesting

Find all Sass/Less files using nesting:

```bash
# Find Sass/SCSS files
find /src -name "*.scss" -o -name "*.sass"

# Find Less files
find /src -name "*.less"

# Count nesting depth
grep -r "^\s\s" --include="*.scss" --include="*.sass" | wc -l

# Find preprocessor-only features
grep -r "@mixin\|@include\|@extend\|@function" --include="*.scss" --include="*.sass"
```

### Step 3: Convert Basic Nesting (Type 1: Child Elements)

#### Pattern 1: Simple Child Selection

**Before (Sass):**
```scss
.button {
  display: inline-flex;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;

  &:hover {
    background-color: var(--button-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
  }

  .button-icon {
    margin-right: 0.5rem;
    width: 1rem;
    height: 1rem;
  }

  .button-label {
    font-weight: 500;
  }
}
```

**After (Native CSS):**
```css
.button {
  display: inline-flex;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;

  &:hover {
    background-color: var(--button-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
  }

  .button-icon {
    margin-right: 0.5rem;
    width: 1rem;
    height: 1rem;
  }

  .button-label {
    font-weight: 500;
  }
}
```

**Syntax:** Identical! Native CSS nesting matches Sass syntax.

### Step 4: Convert Modifier/State Nesting (Type 2: Pseudo-classes)

#### Pattern 2: Interactive States

**Before (Sass):**
```scss
.card {
  padding: 1rem;
  border: 1px solid var(--border);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  &.loading {
    opacity: 0.6;
    cursor: wait;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &[aria-selected="true"] {
    background: var(--selection-bg);
    color: var(--selection-text);
  }
}
```

**After (Native CSS):**
```css
.card {
  padding: 1rem;
  border: 1px solid var(--border);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  &.loading {
    opacity: 0.6;
    cursor: wait;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &[aria-selected="true"] {
    background: var(--selection-bg);
    color: var(--selection-text);
  }
}
```

### Step 5: Convert Complex Selectors (Type 3: Multi-level Nesting)

#### Pattern 3: Deep Component Trees

**Before (Sass):**
```scss
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .list-item {
    padding: 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--hover-bg);

      .list-item-icon {
        transform: translateX(4px);
      }
    }

    &.active {
      background-color: var(--active-bg);
      color: white;

      .list-item-icon {
        color: white;
      }
    }

    .list-item-icon {
      display: inline-block;
      margin-right: 0.5rem;
      width: 1.5rem;
      height: 1.5rem;
      transition: transform 0.2s;
    }

    .list-item-label {
      flex: 1;
      font-weight: 500;
    }
  }

  .list-empty {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
  }
}
```

**After (Native CSS):**
```css
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .list-item {
    padding: 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--hover-bg);

      .list-item-icon {
        transform: translateX(4px);
      }
    }

    &.active {
      background-color: var(--active-bg);
      color: white;

      .list-item-icon {
        color: white;
      }
    }

    .list-item-icon {
      display: inline-block;
      margin-right: 0.5rem;
      width: 1.5rem;
      height: 1.5rem;
      transition: transform 0.2s;
    }

    .list-item-label {
      flex: 1;
      font-weight: 500;
    }
  }

  .list-empty {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
  }
}
```

**Key Insight:** One-to-one mapping from Sass to native CSS nesting!

### Step 6: Convert Media Queries (Type 4: Responsive Nesting)

#### Pattern 4: Responsive Variations

**Before (Sass):**
```scss
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    max-width: 100%;
    padding: 0 1rem;
  }

  @media (max-width: 480px) {
    padding: 0 0.5rem;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
```

**After (Native CSS):**
```css
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    max-width: 100%;
    padding: 0 1rem;
  }

  @media (max-width: 480px) {
    padding: 0 0.5rem;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
```

**Perfect match!** Nested media queries work identically.

### Step 7: Convert Container Queries (Type 5: Advanced Nesting)

#### Pattern 5: Container Query Nesting

**Before (Sass):**
```scss
.card-container {
  container-type: inline-size;
  container-name: card;
}

.card {
  padding: 1rem;
  display: flex;
  flex-direction: column;

  @container card (min-width: 400px) {
    flex-direction: row;
    gap: 1rem;
  }

  .card-image {
    width: 100%;
    aspect-ratio: 16 / 9;

    @container card (min-width: 400px) {
      width: 200px;
      aspect-ratio: 1;
    }
  }

  .card-content {
    flex: 1;

    @container card (min-width: 400px) {
      padding-left: 1rem;
    }
  }
}
```

**After (Native CSS):**
```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

.card {
  padding: 1rem;
  display: flex;
  flex-direction: column;

  @container card (min-width: 400px) {
    flex-direction: row;
    gap: 1rem;
  }

  .card-image {
    width: 100%;
    aspect-ratio: 16 / 9;

    @container card (min-width: 400px) {
      width: 200px;
      aspect-ratio: 1;
    }
  }

  .card-content {
    flex: 1;

    @container card (min-width: 400px) {
      padding-left: 1rem;
    }
  }
}
```

### Step 8: Handle Preprocessor-Only Features

Native CSS doesn't support Sass/Less-specific features. Plan migrations:

#### Feature 1: Mixins

**Sass mixin:**
```scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.button {
  @include flex-center;
  padding: 1rem;
}
```

**Native CSS alternatives:**

Option A: Custom properties:
```css
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.button {
  /* Use class composition */
  padding: 1rem;
}

/* In HTML */
/* <button class="button flex-center">Click</button> */
```

Option B: CSS custom properties:
```css
:root {
  --flex-center: display flex; align-items center; justify-content center;
}

/* CSS custom properties can't set multiple properties, so use class approach */
```

**Recommendation:** Replace mixins with utility classes or CSS custom properties for individual values.

#### Feature 2: Variables

**Sass variables:**
```scss
$primary-color: #007bff;
$border-radius: 4px;
$spacing-unit: 1rem;

.button {
  background-color: $primary-color;
  border-radius: $border-radius;
  padding: $spacing-unit;
}
```

**Native CSS (Custom Properties):**
```css
:root {
  --primary-color: #007bff;
  --border-radius: 4px;
  --spacing-unit: 1rem;
}

.button {
  background-color: var(--primary-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-unit);
}
```

**Differences:**
- Sass variables: Compile-time, no runtime lookup
- CSS custom properties: Runtime, can be changed with JavaScript

**Recommendation:** Migrate Sass variables to CSS custom properties (more powerful anyway).

#### Feature 3: Extends

**Sass extend:**
```scss
.base-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button {
  @extend .base-button;
  background-color: var(--primary);
  color: white;
}
```

**Native CSS (Class composition):**
```css
.base-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button {
  background-color: var(--primary);
  color: white;
}

/* In HTML: <button class="base-button primary-button">Click</button> */
```

**Recommendation:** Use multiple classes instead of @extend.

### Step 9: Create Migration Plan

#### Phase 1: Preparation (1-2 hours)
```markdown
- [ ] Audit all Sass/Less files
- [ ] Identify preprocessor-specific features (@mixin, @extend, @function)
- [ ] Plan replacement strategy for each feature
- [ ] Create CSS nesting style guide
```

#### Phase 2: Core Components (4-6 hours)
```markdown
- [ ] Convert component CSS files to nested CSS
- [ ] Replace mixins with utility classes or custom properties
- [ ] Convert Sass variables to CSS custom properties
- [ ] Replace @extend with class composition
```

#### Phase 3: Layout & Utilities (2-3 hours)
```markdown
- [ ] Convert layout styles to nested CSS
- [ ] Migrate utility classes to native CSS
- [ ] Update media queries in nested format
```

#### Phase 4: Build System Changes (2-3 hours)
```markdown
- [ ] Remove Sass/Less from build pipeline
- [ ] Update build configuration
- [ ] Remove preprocessor dependencies from package.json
- [ ] Verify production bundle size reduction
```

#### Phase 5: Testing (1-2 hours)
```markdown
- [ ] Visual regression testing
- [ ] Cross-browser testing (Chrome 120+, Firefox 117+, Safari 17.2+)
- [ ] Performance testing
- [ ] Build time comparison
```

### Step 10: Implementation Pattern

**File Structure Comparison:**

**Before (Sass):**
```
src/
├── styles/
│   ├── base.scss
│   ├── components/
│   │   ├── button.scss
│   │   ├── card.scss
│   │   └── modal.scss
│   ├── layout/
│   │   └── grid.scss
│   └── variables.scss
└── components/
    ├── Button.tsx
    ├── Card.tsx
    └── Modal.tsx
```

**After (Native CSS):**
```
src/
├── styles/
│   ├── base.css
│   ├── components/
│   │   ├── button.css
│   │   ├── card.css
│   │   └── modal.css
│   └── tokens.css        /* instead of variables.scss */
└── components/
    ├── Button.tsx
    ├── Card.tsx
    └── Modal.tsx
```

**tokens.css Example:**
```css
/* Define all design tokens */
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-primary-dark: #0056b3;
  --color-primary-light: #e7f1ff;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-6: 2rem;

  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

---

## Expected Output

### 1. Migration Report

```markdown
# CSS Nesting Migration Report

**Project:** DMB Almanac
**Date:** 2026-01-21

## Summary
- **Sass files found:** 34
- **Lines of Sass:** ~2,400
- **Conversion effort:** 8-10 hours
- **Build system change:** Remove sass dependency
- **Bundle size impact:** ~50KB saved (sass compiler removed)

## Files to Convert
1. src/styles/components/button.scss → button.css
2. src/styles/components/card.scss → card.css
3. src/styles/components/modal.scss → modal.css
... (31 more files)

## Preprocessor Features Found
| Feature | Count | Migration Strategy |
|---------|-------|-------------------|
| Basic nesting | 89 | Direct conversion (✓ compatible) |
| Variables | 42 | → CSS custom properties |
| Mixins | 8 | → Utility classes + custom props |
| @extend | 3 | → Class composition |
| Calculations | 12 | → CSS calc() |
| Media queries | 34 | → Nested @media |

## Breaking Changes
- None expected! Native CSS nesting is backward compatible with Sass syntax.

## Testing Checklist
- [ ] All styles render identically
- [ ] Responsive breakpoints work
- [ ] Interactive states (:hover, :focus) work
- [ ] Dark mode theme works
- [ ] Performance unchanged or improved
```

### 2. Before/After Code Examples

```css
/* ========== BEFORE: Sass ========== */
// button.scss
$button-padding: 0.5rem 1rem;
$button-border-radius: 4px;

@mixin button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $button-padding;
  border: none;
  border-radius: $button-border-radius;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.button {
  @include button-base;
  background: var(--color-primary);
  color: white;

  &.secondary {
    background: transparent;
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
  }

  @media (max-width: 768px) {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
}

/* ========== AFTER: Native CSS ========== */
// button.css
:root {
  --button-padding: 0.5rem 1rem;
  --button-border-radius: 4px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--button-padding);
  border: none;
  border-radius: var(--button-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-primary);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.secondary {
    background: transparent;
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
  }

  @media (max-width: 768px) {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
}
```

### 3. Bundle Size Impact

```markdown
## Build System Changes

### Before (with Sass)
- node-modules size: 520MB (sass and dependencies)
- Build time: ~2.3 seconds
- CSS output: 180KB

### After (native CSS)
- node-modules size: 470MB (-50MB)
- Build time: ~0.8 seconds (-65%)
- CSS output: 180KB (same)
- No additional processing needed

### Removed Dependencies
```bash
npm uninstall node-sass
npm uninstall sass
npm uninstall sass-loader

# Update build scripts - remove sass compilation
# Before: sass src/ dist/css/
# After: copy src/styles/ dist/css/ (no preprocessing needed)
```

---

## Best Practices

### ✅ DO: Use Nesting for Organization

```css
.component {
  /* Parent styles */
  display: flex;

  /* Child elements */
  .child {
    flex: 1;
  }

  /* Pseudo-classes */
  &:hover {
    background: color-mix(in srgb, currentColor 10%, white);
  }

  /* Pseudo-elements */
  &::after {
    content: '';
  }

  /* States */
  &.active {
    font-weight: bold;
  }

  /* Media queries */
  @media (max-width: 768px) {
    flex-direction: column;
  }
}
```

### ❌ DON'T: Over-Nest

```css
/* Bad: Too deep */
.page {
  .section {
    .container {
      .row {
        .column {
          .card {
            .title {
              /* 7 levels deep - hard to read */
            }
          }
        }
      }
    }
  }
}

/* Good: Keep it shallow */
.card {
  .card-title {
    /* 2 levels - clear and maintainable */
  }
}
```

### ✅ DO: Use Meaningful Selectors

```css
.button {
  /* Clear parent-child relationship */
  .button-icon {
    margin-right: 0.5rem;
  }

  .button-label {
    font-weight: 500;
  }
}
```

### ❌ DON'T: Create Implicit Dependencies

```css
.button {
  /* Problematic - works but unclear */
  > div {
    padding: 1rem;
  }

  > span {
    color: red;
  }
}
```

---

## Browser Compatibility

| Browser | Version | Support | Notes |
|---------|---------|---------|-------|
| Chrome | 120+ | Full | Stable |
| Firefox | 117+ | Partial | Need spec clarification |
| Safari | 17.2+ | Full | Stable |
| Edge | 120+ | Full | Stable |

**Note:** Always test in target browsers.

---

## Related Skills

- **js-to-css-audit.md** - Identify CSS-replaceable JavaScript
- **logical-properties.md** - Internationalization with nested CSS
- **scroll-driven-animations.md** - Organize animations with nesting

---

## References

- [MDN: CSS Nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Nesting)
- [Can I Use: CSS Nesting](https://caniuse.com/css-nesting)
- [W3C: CSS Nesting Module](https://drafts.csswg.org/css-nesting-1/)
- [Chrome: CSS Nesting Support](https://developer.chrome.com/articles/css-nesting/)
