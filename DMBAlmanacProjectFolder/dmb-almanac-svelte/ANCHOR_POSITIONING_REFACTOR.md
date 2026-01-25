# CSS Anchor Positioning Refactor - DMB Almanac

## Overview

Successfully refactored 3 core tooltip/popover components to use native CSS anchor positioning (Chrome 125+), eliminating dependency on JavaScript positioning logic. This replaces the need for libraries like Floating UI, Popper.js, or Tippy.js.

## Components Updated

### 1. Anchored Tooltip Component
**File**: `/src/lib/components/anchored/Tooltip.svelte`

#### Key Changes:
- Replaced `use:anchor` and `use:anchoredTo` actions with inline `style:anchor-name` binding
- Moved all positioning logic from JavaScript to CSS classes
- Added `@supports (anchor-name: --test)` feature detection for graceful fallbacks
- Implemented `position-try-fallbacks: flip-block, flip-inline` for smart repositioning

#### CSS Features:
```css
/* Anchor definition - inline style */
style:anchor-name={anchorName}

/* CSS Anchor Positioning */
position: absolute;
position-anchor: var(--position-anchor);
inset-area: bottom;  /* or top, left, right */
margin-top: var(--tooltip-offset);

/* Automatic fallback positioning */
position-try-fallbacks: flip-block, flip-inline;
```

#### Positioning Classes:
- `.position-top` - Tooltip above trigger, flips to bottom if no space
- `.position-bottom` - Tooltip below trigger (default), flips to top if no space
- `.position-left` - Tooltip left of trigger, flips to right if no space
- `.position-right` - Tooltip right of trigger, flips to left if no space

#### Fallback Support:
Browsers without anchor positioning support get traditional absolute positioning with calculated offsets.

---

### 2. Anchored Dropdown Component
**File**: `/src/lib/components/anchored/Dropdown.svelte`

#### Key Changes:
- Removed `use:anchor` action, using inline `style:anchor-name` instead
- Replaced manual positioning with CSS `position-anchor` and `inset-area`
- Added keyboard navigation with arrow keys (Up/Down/Home/End)
- Implemented `position-try-fallbacks: flip-block` for automatic flipping
- Added `min-width: anchor-size(width)` to match trigger width

#### CSS Features:
```css
/* Dropdown menu sizing */
min-width: anchor-size(width);  /* At least as wide as trigger */

/* Automatic flipping */
position-try-fallbacks: flip-block;

/* Position variants */
.position-bottom {
  inset-area: bottom;
  margin-top: 4px;
}

.position-top {
  inset-area: top;
  margin-bottom: 4px;
}
```

#### Keyboard Navigation:
- **ArrowDown**: Focus next menu item
- **ArrowUp**: Focus previous menu item
- **Home**: Focus first item
- **End**: Focus last item
- **Enter/Space**: Activate focused item
- **Escape**: Close menu

#### Features:
- Smart menu positioning with automatic flipping
- Minimum width matches trigger button width
- GPU-accelerated animations
- Focused state styling for keyboard navigation
- Fallback for older browsers

---

### 3. Anchored Popover Component
**File**: `/src/lib/components/anchored/Popover.svelte`

#### Key Changes:
- Removed `use:anchor` and `use:anchoredTo` actions
- Implemented full CSS anchor positioning with all 4 directions
- Added smart fallback with `position-try-fallbacks: top, left, right`
- Maintains close button and header styling
- Keyboard navigation support (Escape to close)

#### CSS Features:
```css
/* All 4 directions supported */
.position-bottom {
  inset-area: bottom;
  margin-top: var(--popover-offset);
}

.position-top {
  inset-area: top;
  margin-bottom: var(--popover-offset);
}

.position-left {
  inset-area: left;
  margin-right: var(--popover-offset);
}

.position-right {
  inset-area: right;
  margin-left: var(--popover-offset);
}

/* Smart fallback chain */
position-try-fallbacks: top, left, right;
```

#### Features:
- 4-directional positioning
- Smart fallback sequence
- Max-width constraint (340px)
- Close button with proper focus states
- Dialog role for accessibility

---

## Technical Implementation

### Anchor Positioning Features Used:

1. **anchor-name CSS property**
   ```css
   style:anchor-name={anchorName}
   ```
   Sets the anchor point for positioning.

2. **position-anchor CSS property**
   ```css
   style:position-anchor={anchorName}
   position: absolute;
   ```
   Associates element with an anchor.

3. **inset-area CSS property**
   ```css
   inset-area: bottom;  /* Simplified positioning */
   inset-area: top;
   inset-area: left;
   inset-area: right;
   ```
   Sets position relative to anchor without manual top/left/right.

4. **anchor-size() CSS function**
   ```css
   min-width: anchor-size(width);  /* Match anchor width */
   ```
   Reference anchor dimensions.

5. **position-try-fallbacks CSS property**
   ```css
   position-try-fallbacks: flip-block;
   position-try-fallbacks: top, left, right;
   ```
   Automatic repositioning if element doesn't fit in specified position.

### Feature Detection Pattern:

All components use `@supports` blocks for graceful degradation:

```css
@supports (anchor-name: --test) {
  /* CSS anchor positioning implementation */
  .component-content {
    position: absolute;
    position-anchor: var(--position-anchor);
    inset-area: bottom;
  }
}

@supports not (anchor-name: --test) {
  /* Fallback for older browsers */
  .component-content {
    position: absolute;
    top: 100%;
    left: 50%;
    translate: -50% 0;
  }
}
```

## Browser Support

- **Chrome 125+** - Full support for CSS anchor positioning
- **Edge 125+** - Full support
- **Safari 17.4+** - Full support (when available)
- **Firefox** - Fallback positioning (anchor positioning not yet supported)
- **Older versions** - Graceful fallback to traditional absolute positioning

## Performance Improvements

### Bundle Size Reduction:
- **Removed**: JavaScript positioning logic in `use:anchoredTo` action
- **Removed**: Manual offset calculations
- **Reduced**: Component complexity

### Runtime Performance:
- **CSS-based positioning**: Offloaded to browser rendering engine
- **No JavaScript recalculation**: Anchor positions update natively
- **GPU acceleration**: `transform: translateZ(0)` for hardware acceleration
- **Reduced reflows**: No DOM manipulation for positioning

### Memory:
- No cached position data structures
- No event listeners for scroll repositioning (handled by browser)

## Accessibility Features

### ARIA Attributes:
- `role="tooltip"` - For tooltip content
- `role="menu"` / `role="menuitem"` - For dropdown items
- `role="dialog"` - For popover
- `aria-label` - Component labels
- `aria-expanded` - State for menus/popovers
- `aria-haspopup` - Semantic relationship

### Keyboard Navigation:
- **Tooltip**: Focus-based activation via tabindex
- **Dropdown**: Full arrow key navigation + Home/End support
- **Popover**: Escape key to close

### Focus Management:
- Focus indicators with proper contrast
- Focus restoration after close
- Keyboard trap handling in menus

### Reduced Motion:
All components respect `prefers-reduced-motion` with disabled animations.

## Code Examples

### Using Anchored Tooltip:

```svelte
<script>
  import Tooltip from '$lib/components/anchored/Tooltip.svelte';
</script>

<Tooltip
  id="help-tooltip"
  content="This is helpful information"
  position="bottom"
  offset={8}
>
  <button>Help</button>
</Tooltip>
```

### Using Anchored Dropdown:

```svelte
<script>
  import Dropdown from '$lib/components/anchored/Dropdown.svelte';

  const items = [
    { id: '1', label: 'View', action: () => handleView() },
    { id: '2', label: 'Edit', action: () => handleEdit() },
    { id: '3', label: 'Delete', action: () => handleDelete() },
  ];
</script>

<Dropdown
  id="actions-menu"
  {items}
  position="bottom"
  onSelect={(item) => console.log('Selected:', item.label)}
>
  <button>Actions</button>
</Dropdown>
```

### Using Anchored Popover:

```svelte
<script>
  import Popover from '$lib/components/anchored/Popover.svelte';
  let showInfo = false;
</script>

<Popover
  id="info-popover"
  title="More Information"
  position="bottom"
  show={showInfo}
  onClose={() => (showInfo = false)}
>
  <button onclick={() => (showInfo = true)}>Info</button>
  <p>Detailed information goes here</p>
</Popover>
```

## Migration Guide for Other Components

To apply anchor positioning to other tooltip/popover components:

1. **Define Anchor**:
   ```svelte
   <div style:anchor-name="--my-trigger">
     Trigger content
   </div>
   ```

2. **Position Element**:
   ```svelte
   <div
     style:position-anchor="--my-trigger"
     class="positioned-content"
   >
     Content
   </div>
   ```

3. **Add CSS**:
   ```css
   @supports (anchor-name: --test) {
     .positioned-content {
       position: absolute;
       position-anchor: var(--position-anchor);
       inset-area: bottom;
       position-try-fallbacks: flip-block;
     }
   }
   ```

4. **Fallback Styling**:
   ```css
   @supports not (anchor-name: --test) {
     .positioned-content {
       position: absolute;
       top: 100%;
       left: 50%;
       translate: -50% 0;
     }
   }
   ```

## Testing Recommendations

### Feature Detection:
```javascript
const supportsAnchorPositioning = CSS.supports('anchor-name: --test');
```

### Test Cases:
1. Positioning near viewport edges (triggers fallback)
2. Window resize (popover updates automatically)
3. Scroll container (positioning updates with anchor)
4. Keyboard navigation in dropdowns
5. Mobile touch interactions
6. Focus management after close
7. Reduced motion preferences

## Future Enhancements

1. **Collision Detection**: Use JavaScript to pre-calculate best position
2. **Custom Fallback Order**: Allow component users to specify fallback sequence
3. **Animation Variants**: Different entrance animations per position
4. **Scroll Containment**: Sticky popovers within scrollable containers
5. **Touch Gestures**: Swipe to close on mobile devices

## Files Modified

- `/src/lib/components/anchored/Tooltip.svelte` - Refactored to CSS anchor positioning
- `/src/lib/components/anchored/Dropdown.svelte` - Refactored to CSS anchor positioning
- `/src/lib/components/anchored/Popover.svelte` - Refactored to CSS anchor positioning

## Related Files

- `/src/app.css` (lines 1529-1661) - Existing anchor positioning CSS utilities
- `/src/lib/utils/anchorPositioning.ts` - Feature detection utilities
- `/src/lib/actions/anchor.ts` - Svelte actions (still available for manual use)

## References

- [MDN: CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/anchor-name)
- [CSS Anchor Positioning Level 1 Spec](https://drafts.csswg.org/css-anchor-position-1/)
- [Chromium Feature Status](https://chromestatus.com/feature/5846866891251712)

## Summary

This refactor demonstrates modern CSS capabilities for component positioning. By using CSS anchor positioning instead of JavaScript calculations, we achieve:

- Simpler, more maintainable code
- Better performance (browser-optimized positioning)
- Reduced bundle size
- Automatic viewport-aware repositioning
- Full accessibility support
- Graceful fallbacks for older browsers

The implementation serves as a template for migrating other positioned components in the DMB Almanac application.
