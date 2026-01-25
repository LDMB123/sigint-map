# CSS Anchor Positioning Developer Guide
## DMB Almanac Project
**Last Updated:** January 24, 2025

---

## Quick Start

### Using Anchor Positioning in Your Components

#### 1. Define an Anchor

```svelte
<script>
  import { anchor } from '$lib/actions/anchor';
</script>

<!-- Trigger element -->
<button use:anchor={{ name: 'my-trigger' }}>
  Hover me
</button>
```

This sets `anchor-name: --my-trigger` via CSS.

#### 2. Position to Anchor

Option A: Using the `anchoredTo` action (low-level)

```svelte
<script>
  import { anchoredTo } from '$lib/actions/anchor';
  let show = false;
</script>

<div use:anchoredTo={{
  anchor: 'my-trigger',
  position: 'bottom',
  show
}}>
  Tooltip content
</div>

<style>
  div {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
  }
</style>
```

Option B: Using pre-built components (recommended)

```svelte
<script>
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';
</script>

<Tooltip id="my-tooltip" content="Hello!" position="bottom">
  <button>Hover me</button>
</Tooltip>
```

#### 3. Check Browser Support

```svelte
<script>
  import { checkAnchorSupport, getAnchorSupportInfo } from '$lib/utils/anchorPositioning';

  const isSupported = checkAnchorSupport();
  const info = getAnchorSupportInfo();
</script>

{#if isSupported}
  <p>Anchor positioning supported!</p>
{:else}
  <p>Using CSS fallback positioning</p>
{/if}
```

---

## Component API Reference

### Anchored Tooltip

**File:** `/src/lib/components/anchored/Tooltip.svelte`

```svelte
<Tooltip
  content="Tooltip text"           {string}   Required
  position="bottom"                {'top'|'bottom'|'left'|'right'} Optional, default: 'bottom'
  offset={8}                       {number}   Optional, default: 8px
  id="tooltip-1"                   {string}   Optional, default: 'tooltip'
  show={false}                     {boolean}  Optional, shows tooltip
  let:children                     {Snippet}  Trigger content slot
>
  <!-- Trigger content -->
</Tooltip>
```

**Features:**
- Auto-show/hide on hover and focus
- Arrow pointing to trigger
- Smart fallback positioning with `position-try-fallbacks`
- Animation with `@starting-style`
- Accessible (role="tooltip", aria-label)

**CSS Custom Properties:**
```css
--tooltip-offset: 8px;           /* Distance from trigger */
--color-gray-900: oklch(...);    /* Background color */
--color-gray-50: oklch(...);     /* Text color */
--z-tooltip: value;              /* Z-index stacking */
```

### Anchored Dropdown

**File:** `/src/lib/components/anchored/Dropdown.svelte`

```svelte
<Dropdown
  items={[                         {MenuItem[]} Required
    { id: '1', label: 'Item 1', action: () => {} },
    { id: '2', label: 'Item 2', disabled: true }
  ]}
  position="bottom"                {'top'|'bottom'} Optional, default: 'bottom'
  id="menu-1"                      {string}   Optional, unique ID
  onSelect={(item) => {}}          {function} Optional, callback on selection
  let:trigger                      {Snippet}  Trigger content slot
>
  <!-- Menu trigger -->
</Dropdown>
```

**Features:**
- Native Popover API integration
- Keyboard navigation (↑↓ arrow keys, Home/End, Enter/Space)
- Focus management
- Light-dismiss (click outside closes)
- ARIA menu role
- Minimum width = trigger width

**Keyboard Navigation:**
| Key | Action |
|-----|--------|
| ↓ | Focus next item |
| ↑ | Focus previous item |
| Home | Focus first item |
| End | Focus last item |
| Enter / Space | Select focused item |
| Escape | Close menu |

### Anchored Popover

**File:** `/src/lib/components/anchored/Popover.svelte`

```svelte
<Popover
  title="Popover Title"             {string}   Optional
  position="bottom"                 {'top'|'bottom'|'left'|'right'} Optional, default: 'bottom'
  offset={8}                        {number}   Optional
  id="popover-1"                    {string}   Optional, unique ID
  show={false}                      {boolean}  Optional, bindable
  closeButtonText="Close"           {string}   Optional
  onClose={() => {}}                {function} Optional, callback
  let:trigger                       {Snippet}  Trigger button slot
  let:children                      {Snippet}  Popover content slot
>
  <!-- Trigger button -->
  <!-- Popover body content -->
</Popover>
```

**Features:**
- 4-directional positioning
- Smart fallback with `position-try-fallbacks`
- @supports fallback for older browsers
- Close button included
- Dialog role (modal-like behavior)
- Light-dismiss with native Popover API
- Native ESC handling

---

## Styling Anchor-Positioned Elements

### CSS Classes

Pre-built components automatically apply position classes:

```css
.anchored              /* Applied to all anchored elements */
.anchored-top         /* When position="top" */
.anchored-bottom      /* When position="bottom" */
.anchored-left        /* When position="left" */
.anchored-right       /* When position="right" */
```

### Using anchor-name and position-anchor

```css
/* Define anchor */
.trigger {
  anchor-name: --my-trigger;
}

/* Position element */
.positioned {
  position: absolute;
  position-anchor: --my-trigger;
  inset-area: bottom;
  margin-top: 8px;
}
```

### Smart Fallback Positioning

```css
.positioned {
  /* Try positioning below first */
  inset-area: bottom;
  position-try-fallbacks: flip-block;  /* If no space, flip to top */
}

/* Or with multiple fallbacks */
.positioned {
  inset-area: bottom;
  position-try-fallbacks: flip-block, flip-inline;
}
```

### Arrow/Pointer Elements

```svelte
<div class="positioned">
  Content here
  <div class="arrow" aria-hidden="true"></div>
</div>
```

```css
.positioned {
  position: absolute;
  position-anchor: --trigger;
  inset-area: bottom;
}

/* Arrow appears at opposite side of anchor */
.positioned::before {
  content: '';
  position: absolute;
  top: -6px;              /* Points up when positioned below */
  left: 50%;
  width: 12px;
  height: 12px;
  background: inherit;
  border-radius: 2px;
  transform: rotate(45deg) translateX(-50%);
}
```

---

## Progressive Enhancement Pattern

### Full Pattern

```css
@supports (anchor-name: --test) {
  /* Modern Chromium (Chrome 125+) */
  .positioned {
    position: absolute;
    position-anchor: --trigger;
    inset-area: bottom;
    position-try-fallbacks: flip-block;
  }
}

@supports not (anchor-name: --test) {
  /* Fallback for Safari, Firefox, etc. */
  .positioned {
    position: absolute;
    top: 100%;
    left: 50%;
    translate: -50% 0;
    margin-top: 8px;
  }
}
```

### Using in Components

```svelte
<script lang="ts">
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

  const supportsAnchor = checkAnchorSupport();
</script>

{#if supportsAnchor}
  <!-- Use advanced anchor features -->
{:else}
  <!-- Use traditional positioning -->
{/if}
```

---

## Svelte Actions API

### anchor() Action

**Signature:**
```typescript
function anchor(
  node: Element,
  options: AnchorActionOptions
): ActionReturn<AnchorActionOptions>
```

**Options:**
```typescript
interface AnchorActionOptions {
  name: string;              // Anchor name (without -- prefix)
  cssProperty?: string;      // Optional CSS custom property to expose anchor
}
```

**Example:**
```svelte
<div use:anchor={{ name: 'trigger', cssProperty: '--my-anchor' }}>
  This element is the anchor
</div>

<style>
  div {
    /* Can reference via CSS custom property */
    position-anchor: var(--my-anchor);
  }
</style>
```

### anchoredTo() Action

**Signature:**
```typescript
function anchoredTo(
  node: Element,
  options: AnchoredToOptions
): ActionReturn<AnchoredToOptions>
```

**Options:**
```typescript
interface AnchoredToOptions {
  anchor: string;                                    // Anchor name
  position?: 'top' | 'bottom' | 'left' | 'right';  // Position
  show?: boolean;                                    // Visibility
  class?: string;                                    // Additional CSS classes
}
```

**Example:**
```svelte
<div use:anchoredTo={{
  anchor: 'trigger',
  position: 'bottom',
  show: isOpen,
  class: 'my-custom-class'
}}>
  Positioned content
</div>
```

---

## Common Patterns

### Tooltip on Hover

```svelte
<script>
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';
  let hovering = false;
</script>

<Tooltip content="Click me!" position="top" show={hovering}>
  <button
    onmouseenter={() => (hovering = true)}
    onmouseleave={() => (hovering = false)}
  >
    Hover Button
  </button>
</Tooltip>
```

### Dropdown Menu

```svelte
<script>
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';

  const menuItems = [
    { id: '1', label: 'Edit', action: () => console.log('edit') },
    { id: '2', label: 'Delete', action: () => console.log('delete') },
  ];
</script>

<Dropdown items={menuItems}>
  <button>Menu</button>
</Dropdown>
```

### Contextual Popover

```svelte
<script>
  import Popover from '$lib/components/anchored/Popover.svelte';
  let showSettings = false;
</script>

<Popover title="Settings" position="right" bind:show={showSettings}>
  <button>⚙️ Settings</button>

  <div>
    <label>
      <input type="checkbox" />
      Dark Mode
    </label>
  </div>
</Popover>
```

### Dynamic Anchor

```svelte
<script>
  import { anchor, anchoredTo } from '$lib/actions/anchor';
  let activeAnchor = 'button1';
  let tooltipVisible = false;
</script>

<button use:anchor={{ name: 'button1' }}>Button 1</button>
<button use:anchor={{ name: 'button2' }}>Button 2</button>

<div
  use:anchoredTo={{
    anchor: activeAnchor,
    position: 'bottom',
    show: tooltipVisible
  }}
>
  Shows below the active button
</div>
```

---

## CSS Custom Properties Reference

### Global Tokens (from app.css)

```css
/* Z-index layers */
--z-tooltip: var(--z-value);
--z-dropdown: var(--z-value);
--z-popover: var(--z-value);

/* Spacing */
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;

/* Colors */
--color-gray-900: oklch(...);
--color-gray-50: oklch(...);
--background: var(...);
--foreground: var(...);
--border-color: var(...);

/* Radii */
--radius-lg: 0.5rem;
--radius-xl: 0.75rem;

/* Shadows */
--shadow-md: ...;
--shadow-lg: ...;

/* Transitions */
--transition-fast: 150ms ease-out;
```

### Component-Specific

```css
/* Tooltip */
--tooltip-offset: 8px;
--arrow-position: 'top' | 'bottom' | 'left' | 'right';

/* Popover */
--popover-offset: 8px;

/* Dropdown */
(Uses generic --space-* and --color-* tokens)
```

---

## Performance Tips

### 1. Reduce Reflows

```svelte
<!-- GOOD: Static positioning, CSS handles it -->
<div use:anchor={{ name: 'trigger' }}/>
<div use:anchoredTo={{ anchor: 'trigger' }} />

<!-- AVOID: Dynamic JS positioning -->
<div style:left={calculateLeft()} />
```

### 2. GPU Acceleration

```css
.positioned {
  /* Enable GPU acceleration */
  transform: translateZ(0);
  will-change: transform, opacity;
}
```

### 3. Lazy Load Popovers

```svelte
<Popover>
  {#if show}
    <ExpensiveComponent />
  {/if}
</Popover>
```

### 4. Use Anchor Size Functions

```css
/* Match trigger width */
.positioned {
  min-width: anchor-size(width);
}

/* Responsive sizing based on anchor */
.positioned {
  max-width: calc(anchor-size(width) * 2);
}
```

---

## Browser Support Fallback Strategy

### Detection

```typescript
import { checkAnchorSupport, getAnchorSupportInfo } from '$lib/utils/anchorPositioning';

// Simple check
if (checkAnchorSupport()) {
  // Use anchor positioning features
}

// Detailed check
const info = getAnchorSupportInfo();
if (info.hasTryFallbacks) {
  // Use position-try-fallbacks
}
```

### Providing Alternatives

```svelte
<script>
  import { checkAnchorSupport } from '$lib/utils/anchorPositioning';
  const supportsAnchor = checkAnchorSupport();
</script>

{#if supportsAnchor}
  <AnchoredTooltip />
{:else}
  <TraditionalTooltip />
{/if}
```

---

## Debugging

### Check Anchor Assignment

```javascript
// In browser console
document.querySelector('[style*="anchor-name"]').style
// Look for: anchor-name: --trigger

document.querySelector('[style*="position-anchor"]').style
// Look for: position-anchor: --trigger
```

### Verify CSS Support

```javascript
CSS.supports('anchor-name: --test')
CSS.supports('position-anchor: --test')
CSS.supports('position-area: bottom')
CSS.supports('position-try-fallbacks: flip-block')
```

### Chrome DevTools

1. Select anchored element
2. Styles panel shows `position-anchor: --trigger`
3. Inspect the anchor element
4. Styles show `anchor-name: --trigger`
5. Use "computed" tab to verify effective styles

### Firefox (with fallback)

1. Should show traditional `position: absolute; top: 100%;` etc.
2. If anchor properties appear, browser supports anchors
3. Check console for feature detection warnings

---

## Accessibility Considerations

### ARIA Requirements

```svelte
<!-- Tooltip -->
<div role="tooltip" aria-label="Help text">
  Content
</div>

<!-- Dropdown Menu -->
<button
  role="button"
  aria-haspopup="menu"
  aria-expanded={isOpen}
  aria-controls={menuId}
>
  Menu
</button>

<!-- Popover Dialog -->
<div role="dialog" aria-label="Dialog Title">
  Content
</div>
```

### Keyboard Navigation

All components implement:
- Tab navigation to triggers
- Escape to close
- Arrow keys in menus
- Home/End keys for first/last
- Enter/Space to select

### Focus Management

```svelte
<!-- Return focus to trigger when closing -->
<script>
  let triggerButton;

  function close() {
    popover.hidePopover();
    triggerButton?.focus();
  }
</script>

<button bind:this={triggerButton}>
  Open
</button>
```

---

## Testing

### Unit Testing

```typescript
// Check anchor support
import { checkAnchorSupport } from '$lib/utils/anchorPositioning';

test('should support anchor positioning', () => {
  const supported = checkAnchorSupport();
  expect(typeof supported).toBe('boolean');
});
```

### Component Testing

```svelte
<!-- Test Tooltip shows on hover -->
<script>
  import { render, screen } from '@testing-library/svelte';
  import Tooltip from './Tooltip.svelte';

  test('shows tooltip on hover', async () => {
    render(Tooltip, { content: 'Test' });
    const trigger = screen.getByRole('button');
    await userEvent.hover(trigger);
    // Assert tooltip is visible
  });
</script>
```

### E2E Testing (Playwright)

```typescript
test('dropdown positioning', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /menu/i });

  // Check anchor positioning
  const menu = page.getByRole('menu');
  const anchorName = await trigger.evaluate(el =>
    window.getComputedStyle(el).anchorName
  );

  expect(anchorName).toMatch(/--menu/);
});
```

---

## Common Gotchas

### 1. Anchor-name Must Be on Direct Element

```css
/* ✅ CORRECT */
.trigger {
  anchor-name: --trigger;
}

/* ❌ WRONG - Won't work on children */
.parent .trigger {
  anchor-name: --trigger;  /* Parent, not .trigger */
}
```

### 2. Position-anchor Needs Positioned Element

```css
/* ✅ CORRECT */
.positioned {
  position: absolute;           /* Required */
  position-anchor: --trigger;
}

/* ❌ WRONG - Static position ignored */
.positioned {
  position: static;            /* Doesn't work */
  position-anchor: --trigger;
}
```

### 3. Inset-area Replaces top/left/etc

```css
/* ✅ CORRECT */
.positioned {
  inset-area: bottom;          /* Use inset-area */
  margin-top: 8px;
}

/* ⚠️ MIXED (both work but conflicting) */
.positioned {
  inset-area: bottom;
  top: 100%;                   /* Will be overridden */
}
```

### 4. Anchor Must Be in Same Containing Block

```css
/* ❌ WRONG - Different containing blocks */
.trigger {
  anchor-name: --trigger;
  position: relative;          /* Creates containing block */
}

.positioned {
  position: absolute;
  position-anchor: --trigger;  /* May not work */
}

/* ✅ CORRECT - Same containing block */
.container {
  position: relative;
}

.trigger {
  anchor-name: --trigger;      /* No position property */
}

.positioned {
  position: absolute;
  position-anchor: --trigger;  /* Works */
}
```

---

## Resources

### MDN Documentation
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/anchor-name)
- [position-anchor](https://developer.mozilla.org/en-US/docs/Web/CSS/position-anchor)
- [inset-area](https://developer.mozilla.org/en-US/docs/Web/CSS/inset-area)

### Browser Compatibility
- [Can I Use - Anchor Positioning](https://caniuse.com/css-anchor-positioning)
- [Chromium Feature Status](https://chromestatus.com/feature/6992554606960640)

### Project Files
- Components: `/src/lib/components/anchored/`
- Utilities: `/src/lib/utils/anchorPositioning.ts`
- Actions: `/src/lib/actions/anchor.ts`
- Examples: `/src/lib/components/anchored/EXAMPLES.md`
- CSS Rules: `/src/app.css` (lines 1570-1700)

---

## Questions?

Refer to:
1. Component examples in `/src/lib/components/anchored/EXAMPLES.md`
2. Feature detection tests in `/src/lib/utils/anchorPositioning.ts`
3. Component implementations (read the source!)
4. Chrome DevTools inspector for computed styles

