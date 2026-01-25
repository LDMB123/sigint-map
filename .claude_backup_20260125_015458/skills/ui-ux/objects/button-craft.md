---
id: button-craft
title: Button Craft - The Most Clicked Element
slug: button-craft
category: UI/UX Objects
complexity: intermediate
browser_support: "Chromium 143+, Safari 18.2+, Firefox 133+"
platforms: "macOS 26.2+, iOS 18.2+, Android 15+"
silicon: "Apple Silicon optimized"
last_updated: 2026-01-21
---

# Button Craft: The Most Clicked Element

> "A button is not just an interactive element. It's a promise to the user. Every button is a decision point. Design it with the respect it deserves." — Steve Jobs Philosophy

## Philosophy

Buttons are the most frequently clicked elements in any interface. They deserve obsessive attention. In Steve Jobs' design language, buttons had hierarchy, clarity, and purpose. A user should never question whether something is clickable, what happens when they click it, or whether it's currently available. Every state must be explicit.

## Visual Hierarchy: Four Button Variants

Establish a clear hierarchy. Not all buttons are equal.

```css
:root {
  --btn-primary-bg: #007AFF;
  --btn-primary-text: #FFFFFF;
  --btn-primary-hover: #0051D5;
  --btn-primary-active: #0040A8;
  --btn-primary-disabled: #C0C0C0;

  --btn-secondary-bg: transparent;
  --btn-secondary-border: #D0D0D0;
  --btn-secondary-text: #333333;
  --btn-secondary-hover-bg: #F5F5F5;
  --btn-secondary-active-bg: #ECECEC;

  --btn-tertiary-bg: transparent;
  --btn-tertiary-text: #0066CC;
  --btn-tertiary-hover: #0052A3;

  --btn-ghost-bg: transparent;
  --btn-ghost-text: #666666;
  --btn-ghost-hover-bg: #F9F9F9;
}

/* PRIMARY: Most important action (Save, Submit, Create) */
.button-primary {
  background-color: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
}

.button-primary:hover:not(:disabled) {
  background-color: var(--btn-primary-hover);
}

.button-primary:active:not(:disabled) {
  background-color: var(--btn-primary-active);
}

.button-primary:disabled {
  background-color: var(--btn-primary-disabled);
  color: #FFFFFF;
  opacity: 0.5;
  cursor: not-allowed;
}

/* SECONDARY: Standard interactions (Cancel, Next, Previous) */
.button-secondary {
  background-color: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 1px solid var(--btn-secondary-border);
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
}

.button-secondary:hover:not(:disabled) {
  background-color: var(--btn-secondary-hover-bg);
  border-color: #B0B0B0;
}

.button-secondary:active:not(:disabled) {
  background-color: var(--btn-secondary-active-bg);
}

.button-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* TERTIARY: Less prominent actions (Learn more, Advanced options) */
.button-tertiary {
  background-color: var(--btn-tertiary-bg);
  color: var(--btn-tertiary-text);
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
  text-decoration: none;
}

.button-tertiary:hover:not(:disabled) {
  color: var(--btn-tertiary-hover);
  background-color: rgba(0, 102, 204, 0.05);
}

.button-tertiary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* GHOST: Minimal emphasis (Dismiss, Skip, Undo) */
.button-ghost {
  background-color: var(--btn-ghost-bg);
  color: var(--btn-ghost-text);
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
}

.button-ghost:hover:not(:disabled) {
  background-color: var(--btn-ghost-hover-bg);
}

.button-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Touch Target Minimum: 44x44 pixels

Never compromise on touch targets. The 44x44px minimum is not a guideline—it's a accessibility requirement.

```css
/* GOOD: Minimum 44px height */
.button {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Account for padding in calculations */
.button {
  padding: 10px 16px;  /* (44 - 24 line-height) / 2 = 10px */
  min-height: 44px;
  /* Even with smaller padding, min-height ensures touch target */
}

/* BAD: Too small for touch */
.button {
  padding: 4px 8px;    /* Only 28px total height */
  height: 28px;
}

/* BAD: Only width, no min-height specification */
.button {
  padding: 0 16px;
  /* Height depends on content, might be too small */
}
```

## Padding Ratios: Horizontal > Vertical

Always use more horizontal padding than vertical. This creates visual balance and appropriate click targets.

```css
/* Standard button padding hierarchy */
:root {
  --btn-padding-primary: 8px 16px;    /* Vertical: 8, Horizontal: 16 (ratio 1:2) */
  --btn-padding-secondary: 6px 12px;  /* Vertical: 6, Horizontal: 12 (ratio 1:2) */
  --btn-padding-ghost: 4px 8px;       /* Vertical: 4, Horizontal: 8 (ratio 1:2) */
}

/* Icon-only buttons need different approach */
.button-icon-only {
  padding: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Large primary buttons for mobile */
@media (max-width: 768px) {
  .button-primary {
    padding: 12px 20px;  /* Increased padding on mobile */
    font-size: 16px;
    min-height: 48px;
  }
}
```

## Border Radius Consistency

All buttons in your system should use the same border radius (with very few exceptions).

```css
/* Define border radius in design tokens */
:root {
  --border-radius-button: 8px;
  --border-radius-small-button: 6px;
  --border-radius-card: 12px;
}

/* Apply consistently */
.button {
  border-radius: var(--border-radius-button);
}

/* Only deviate when semantically justified */
.button-pill {
  border-radius: 24px;  /* Justified: full roundness for specific style */
}

/* Never random border-radius values */
.button { border-radius: 7px; }  /* BAD */
.button { border-radius: 9px; }  /* BAD */
```

## Focus States: :focus-visible

Focus states are critical for keyboard navigation. Use :focus-visible, not :focus.

```css
/* GOOD: :focus-visible for keyboard only */
.button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* GOOD: Visible focus ring with appropriate contrast */
.button:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.3);
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

/* BAD: outline-none removes focus visibility entirely */
.button:focus {
  outline: none;
}

/* BAD: :focus affects mouse clicks too (bad UX) */
.button:focus {
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.3);
}

/* GOOD: Dark mode focus ring */
@media (prefers-color-scheme: dark) {
  .button:focus-visible {
    outline-color: #66B3FF;
  }
}
```

## Loading State: Spinner Position and Disabled During Load

Show loading feedback clearly, and prevent multiple submissions.

```jsx
function Button({
  children,
  loading = false,
  disabled = false,
  icon,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`button ${loading ? 'button-loading' : ''}`}
    >
      {loading ? (
        <>
          <Spinner size="sm" aria-hidden="true" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <Icon name={icon} aria-hidden="true" />}
          {children}
        </>
      )}
    </button>
  );
}
```

```css
/* Loading state styling */
.button-loading {
  opacity: 0.8;
  cursor: not-allowed;
  pointer-events: none;
}

.button-loading svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Spinner positioned consistently */
.button-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.button-loading .spinner {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
```

## Icon + Text Alignment

Icons and text must align perfectly. Use flexbox with alignment properties.

```jsx
// GOOD: Proper icon-text pairing
<button className="button-with-icon">
  <Icon name="download" size="20" aria-hidden="true" />
  <span>Download</span>
</button>

// With trailing icon
<button className="button-with-trailing-icon">
  <span>Next</span>
  <Icon name="chevron-right" size="20" aria-hidden="true" />
</button>
```

```css
/* Button with leading icon */
.button-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.button-with-icon .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Button with trailing icon */
.button-with-trailing-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-direction: row;
}

/* Icon-only button */
.button-icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 8px;
}

/* BAD: Mixing inline block with margin */
.button .icon {
  display: inline-block;
  margin-right: 6px;  /* Inconsistent with gap */
  vertical-align: -2px;  /* Fragile hack */
}
```

## All Component States

Every button must have explicit styles for every state.

```html
<!-- Primary Button States -->
<button class="button button-primary">Default</button>
<button class="button button-primary" disabled>Disabled</button>
<button class="button button-primary" data-loading="true">Loading...</button>

<!-- Secondary Button States -->
<button class="button button-secondary">Default</button>
<button class="button button-secondary" disabled>Disabled</button>

<!-- Tertiary Button States -->
<button class="button button-tertiary">Learn more</button>

<!-- Ghost Button States -->
<button class="button button-ghost">Dismiss</button>
```

### State Definition Table

| State | Background | Border | Text | Cursor | Opacity |
|-------|------------|--------|------|--------|---------|
| Default | Primary | None | White | pointer | 1.0 |
| Hover | Primary-dark | None | White | pointer | 1.0 |
| Active | Primary-darker | None | White | pointer | 1.0 |
| Focus | Primary | Focus ring | White | pointer | 1.0 |
| Disabled | Gray | None | White | not-allowed | 0.5 |
| Loading | Primary | None | White | not-allowed | 0.8 |

## Anti-Patterns: What NOT to Do

### Anti-Pattern 1: Ambiguous Buttons

```html
<!-- BAD: Unclear what this button does -->
<button>Click here</button>

<!-- BAD: Generic labels don't explain action -->
<button>Submit</button>

<!-- GOOD: Clear action-oriented labels -->
<button>Download file</button>
<button>Save changes</button>
<button>Create account</button>

<!-- GOOD: Verb + noun pattern -->
<button>Delete account</button>
<button>Archive project</button>
<button>Invite team members</button>
```

### Anti-Pattern 2: Hidden or Unclear Focus States

```css
/* BAD: No focus state visible */
.button {
  outline: none;
}

/* BAD: Low-contrast focus ring */
.button:focus {
  outline: 1px solid #CCCCCC;
}

/* GOOD: High-contrast focus ring */
.button:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}
```

### Anti-Pattern 3: Too Much Padding/Not Enough Padding

```css
/* BAD: Tiny touch target */
.button {
  padding: 2px 6px;
  font-size: 12px;
  /* Results in ~24px height */
}

/* BAD: Overly large for text buttons */
.button {
  padding: 20px 40px;
  /* Takes too much space */
}

/* GOOD: Balanced padding */
.button-primary {
  padding: 8px 16px;  /* 44px total with line-height */
  font-size: 14px;
  line-height: 1.5;
}
```

### Anti-Pattern 4: Loading State Not Disabling Button

```jsx
/* BAD: Button stays clickable while loading */
function SubmitButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button onClick={handleSubmit}>
      {loading ? 'Submitting...' : 'Submit'}
    </button>
  );
}

/* GOOD: Button disabled during loading */
function SubmitButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

### Anti-Pattern 5: Inconsistent Button Styles

```css
/* BAD: Different borders in same application */
.button-a { border: 1px solid #CCC; }
.button-b { border: 2px solid #999; }
.button-c { border: 1px solid #DDD; }

/* BAD: Inconsistent padding */
.button-x { padding: 8px 16px; }
.button-y { padding: 10px 20px; }
.button-z { padding: 6px 12px; }

/* GOOD: Consistent design system */
.button { border: 1px solid var(--border-color); }
.button { padding: var(--btn-padding); }
```

### Anti-Pattern 6: Icon Without Proper Spacing

```html
<!-- BAD: Icon crowding text -->
<button>
  <svg ...></svg>Download
</button>

<!-- BAD: Inconsistent icon sizing -->
<button>
  <svg width="16" height="16" ...></svg>Save
</button>
<button>
  <svg width="24" height="24" ...></svg>Delete
</button>

<!-- GOOD: Proper spacing and sizing -->
<button class="button-with-icon">
  <svg class="button-icon" viewBox="0 0 24 24" width="20" height="20">...</svg>
  <span>Download</span>
</button>

<style>
.button-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.button-icon {
  flex-shrink: 0;
}
</style>
```

## Implementation Examples

### React Button Component

```jsx
export function Button({
  variant = 'primary',
  size = 'md',
  icon: IconComponent,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        button
        button-${variant}
        button-${size}
        ${fullWidth ? 'button-full-width' : ''}
        ${loading ? 'button-loading' : ''}
        ${className}
      `}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size === 'sm' ? 'xs' : 'sm'} aria-hidden="true" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {IconComponent && iconPosition === 'left' && (
            <IconComponent size={size === 'sm' ? 16 : 20} aria-hidden="true" />
          )}
          <span>{children}</span>
          {IconComponent && iconPosition === 'right' && (
            <IconComponent size={size === 'sm' ? 16 : 20} aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
}
```

### HTML Button Patterns

```html
<!-- Primary CTA -->
<button class="button button-primary">
  Save document
</button>

<!-- Secondary with icon -->
<button class="button button-secondary button-with-icon">
  <svg class="button-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="..." fill="currentColor" />
  </svg>
  <span>Download</span>
</button>

<!-- Icon-only button -->
<button class="button button-icon-only" aria-label="Close dialog">
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="..." fill="currentColor" />
  </svg>
</button>

<!-- Loading state -->
<button class="button button-primary button-loading" disabled aria-busy="true">
  <svg class="button-spinner" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
  </svg>
  <span>Processing...</span>
</button>

<!-- Disabled state -->
<button class="button button-primary" disabled>
  Unavailable
</button>

<!-- Group of buttons -->
<div class="button-group">
  <button class="button button-primary">Save</button>
  <button class="button button-secondary">Cancel</button>
</div>
```

### CSS Complete Implementation

```css
/* Button Foundation */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
}

/* Focus state for keyboard navigation */
.button:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

/* Size variants */
.button-md {
  padding: 8px 16px;
  min-height: 44px;
}

.button-sm {
  padding: 6px 12px;
  min-height: 36px;
  font-size: 12px;
}

.button-lg {
  padding: 12px 24px;
  min-height: 48px;
  font-size: 16px;
}

/* Color variants */
.button-primary {
  background-color: #007AFF;
  color: white;
}

.button-primary:hover:not(:disabled):not(.button-loading) {
  background-color: #0051D5;
}

.button-primary:active:not(:disabled):not(.button-loading) {
  background-color: #0040A8;
}

.button-secondary {
  background-color: transparent;
  color: #333333;
  border: 1px solid #D0D0D0;
}

.button-secondary:hover:not(:disabled) {
  background-color: #F5F5F5;
  border-color: #B0B0B0;
}

.button-secondary:active:not(:disabled) {
  background-color: #ECECEC;
}

/* Disabled state */
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading state */
.button-loading {
  pointer-events: none;
}

/* Full width variant */
.button-full-width {
  width: 100%;
}

/* Icon sizing */
.button-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Button groups */
.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .button-primary,
  .button-secondary {
    padding: 12px 20px;
    min-height: 48px;
    font-size: 16px;
  }
}
```

## Quality Checklist

Before deploying a button, verify:

- [ ] **Touch Target**: Minimum 44x44 pixels
- [ ] **Padding Ratio**: Horizontal padding > vertical padding
- [ ] **Border Radius**: Consistent with design system
- [ ] **Visual Hierarchy**: Primary, secondary, tertiary, ghost variants clear
- [ ] **Focus States**: :focus-visible with high contrast
- [ ] **Loading State**: Button disabled, spinner visible
- [ ] **Icon Alignment**: Icons centered with text
- [ ] **Hover State**: Visual feedback for non-disabled buttons
- [ ] **Active State**: Different from hover state
- [ ] **Disabled State**: Reduced opacity, cursor: not-allowed
- [ ] **Responsive**: Adequate size on mobile (48px minimum)
- [ ] **Accessibility**: aria-label for icon-only buttons
- [ ] **Cursor**: pointer for clickable, not-allowed for disabled
- [ ] **No Outline Removal**: :focus-visible has visible indicator
- [ ] **All Variants**: All 4+ variants implemented and tested

---

## References

- [WCAG 2.1: Button Accessibility](https://www.w3.org/WAI/WCAG21/Understanding/target-size-enhanced.html)
- [Apple Human Interface Guidelines: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Material Design: Buttons](https://m3.material.io/components/buttons/overview)
- [WebAIM: Touch Targets](https://webaim.org/articles/touchscreen/)
