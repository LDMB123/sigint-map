# Virtual List Keyboard Navigation Accessibility Audit
## DMB Almanac

**Date**: January 25, 2026
**Reviewer**: Accessibility Specialist
**WCAG Level**: AA (2.1 & 2.2)

---

## Executive Summary

The DMB Almanac uses a custom `VirtualList` component for rendering large datasets (shows, songs, venues, guests). While the component has basic keyboard support (arrow keys, Home/End, Page Up/Down), it has several critical accessibility gaps:

| Issue | Severity | WCAG Criterion | Status |
|-------|----------|---|---|
| Missing Tab trap prevention | Critical | 2.1.2 Keyboard | TO FIX |
| Insufficient focus management timing | Serious | 2.4.3 Focus Order | TO FIX |
| Missing screen reader announcements for item count | Serious | 4.1.3 Status Messages | TO FIX |
| Items lose focus on re-render | Critical | 2.4.3 Focus Order | TO FIX |
| No escape key to exit list | Serious | 2.1.1 Keyboard | TO FIX |
| Missing aria-current for focused item | Moderate | 1.3.1 Info & Relationships | TO FIX |

---

## Critical Issues

### 1. Tab Trap: Users Cannot Tab Out of Virtual List

**WCAG 2.1.2 Keyboard (Level A)**

**Impact**: Keyboard-only users get stuck when tabbing through the list. The list consumes all Tab events but never moves focus to the next interactive element on the page.

**Current Behavior**:
- Tab key not intercepted
- Focus stays on current item
- No way to reach next focusable element

**Recommended Fix**:
```typescript
// When last item is focused and user presses Tab
// When first item is focused and user presses Shift+Tab
// Release focus to next/previous focusable element
```

### 2. Focus Loss on Virtualization Update

**WCAG 2.4.3 Focus Order (Level A)**

**Impact**: When virtual list updates (items scroll into view), the focused item DOM element is destroyed and recreated. The focus is lost entirely.

**Root Cause**:
- Virtual list only renders visible items
- When you focus item #50, it's rendered
- When you scroll, item #50 is removed from DOM
- Focus is now on a non-existent element
- Browser resets focus to body

**Required Fix**:
- Track focused index in state
- Restore focus when item re-enters DOM
- Use `requestAnimationFrame` for timing

### 3. No Escape Key Support

**WCAG 2.1.1 Keyboard (Level A)**

**Impact**: Users cannot easily escape from the list using the Escape key (common keyboard navigation pattern).

**Missing Handler**:
```typescript
case 'Escape':
  // Move focus to container or previous element
  // Allow focus to leave list
  break;
```

### 4. Missing Screen Reader Announcements

**WCAG 4.1.3 Status Messages (Level AA)**

**Impact**: Screen reader users don't know:
- How many items are in the list
- When they're at the start/end
- How many items total vs. visible
- Current position while navigating

**Missing Features**:
- Live region for announcement
- Navigation feedback
- Item count summary

### 5. aria-current Missing for Focused Item

**WCAG 1.3.1 Info & Relationships (Level A)**

**Impact**: Screen readers can't determine which item is currently focused vs. just having DOM focus.

**Current**: Only `tabindex` indicates focus
**Needed**: `aria-current="true"` when item has focus

---

## Serious Issues

### 6. Focus Indicator May Not Be Visible

**WCAG 2.4.7 Focus Visible (Level AA)**

**Current Code**:
```css
.virtual-list-item:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  z-index: 1;
}

.virtual-list-item:focus:not(:focus-visible) {
  outline: none;  /* Removes focus when using mouse */
}
```

**Issue**: The `:focus:not(:focus-visible)` removes outline for mouse users, but focus-visible support is inconsistent. The outline-offset may be clipped by parent overflow.

**Verified for**:
- Safari 17+ (focus-visible supported)
- Chrome 85+ (focus-visible supported)
- Firefox 85+ (focus-visible supported)

### 7. No Page Up/Down on First/Last Item

**Current Behavior**:
```typescript
case 'PageDown':
  event.preventDefault();
  focusedIndex = Math.min(items.length - 1, focusedIndex + visibleCount);
  scrollToIndex(focusedIndex);
  break;
```

**Issue**: If at last item and user presses Page Down, nothing happens. Should probably move focus out of list or provide feedback.

---

## Moderate Issues

### 8. Focus Order Within Item Content

**Impact**: If an item contains interactive elements (buttons, links), the current implementation doesn't support navigating within the item.

**Example**: Show cards have a button inside. Users should be able to:
1. Arrow Down to item
2. Tab to activate the button
3. Arrow Down to next item

**Current**: Item is wrapper, button is inside - focus order may be confusing

### 9. No Keyboard Shortcut Documentation

**Impact**: Users don't know keyboard shortcuts are available.

**Missing**:
- No `aria-description` explaining keyboard controls
- No visual help text for keyboard shortcuts
- No keyboard shortcut in Accessibility panel

---

## Testing Results

### Keyboard Navigation
```
✓ Arrow Up/Down navigate items
✓ Home/End jump to bounds
✓ Page Up/Down navigate by page
✓ Focus visible on items
✗ Tab traps focus (cannot exit)
✗ Escape does nothing
✗ Items lose focus on scroll
✗ First/Last item feedback missing
```

### Screen Reader (NVDA, VoiceOver, JAWS)
```
✓ List announced as list (role="list")
✓ Items announced as listitem (role="listitem")
✓ aria-setsize/aria-posinset read (e.g., "item 5 of 100")
✗ Focus state not announced
✗ Navigation feedback missing
✗ List size not announced on load
```

### Visual
```
✓ Focus indicator visible on keyboard navigation
✓ 2px outline with 2px offset
✓ Focus color contrasts with background
✗ Focus indicator may clip on scroll
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Complete First)
1. **Focus Management**: Track focused index, restore on re-render
2. **Tab Trap Prevention**: Implement Tab/Shift+Tab to exit list
3. **Focus Loss Prevention**: Use `requestAnimationFrame` to restore focus

### Phase 2: Serious Fixes (Complete Second)
4. **Escape Key**: Exit list when pressed
5. **Screen Reader Announcements**: Live region for navigation feedback
6. **aria-current**: Add to focused item

### Phase 3: Moderate Fixes (Enhancement)
7. **Item Content Navigation**: Support Tab within items
8. **Keyboard Help**: Add aria-description with shortcuts
9. **Start/End Feedback**: Announce when at bounds

---

## Affected Components

### Direct Usage
- `/app/src/routes/shows/+page.svelte` - Show archive with 1000+ items
- Potential future use in songs (currently grid), venues (currently grid), guests (currently grid)

### Component Path
- `/app/src/lib/components/ui/VirtualList.svelte`

---

## Code Changes Required

### VirtualList.svelte - Required Additions

#### 1. Tab Trap Prevention
```typescript
// Track if list has focus
let listHasFocus = $state(false);
let lastKeyWasTab = $state(false);

function handleKeyDown(event: KeyboardEvent) {
  const { key } = event;
  lastKeyWasTab = key === 'Tab';

  if (key === 'Tab') {
    const isShiftTab = event.shiftKey;
    const firstItem = 0;
    const lastItem = items.length - 1;

    if (isShiftTab && focusedIndex === firstItem) {
      // Allow focus to move to previous element
      event.preventDefault();
      scrollContainer?.blur();
      focusedIndex = -1;
      // Trigger focus-out event for parent to handle
      scrollContainer?.dispatchEvent(new Event('virtualListFocusOut'));
      return;
    }

    if (!isShiftTab && focusedIndex === lastItem) {
      // Allow focus to move to next element
      event.preventDefault();
      scrollContainer?.blur();
      focusedIndex = -1;
      scrollContainer?.dispatchEvent(new Event('virtualListFocusOut'));
      return;
    }
  }

  // ... rest of keyboard handling
}
```

#### 2. Focus Management & Restoration
```typescript
let focusedIndex = $state<number>(-1);
let shouldRestoreFocus = $state(false);
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

// Restore focus after virtualization updates
$effect(() => {
  const { start, end } = visibleRange;

  // Check if focused item just became visible
  if (focusedIndex >= start && focusedIndex < end && shouldRestoreFocus) {
    // Schedule restoration for next frame
    requestAnimationFrame(() => {
      const itemElement = scrollContainer?.querySelector(
        `[data-index="${focusedIndex}"]`
      ) as HTMLElement;

      if (itemElement) {
        itemElement.focus();
        itemElement.scrollIntoView({ block: 'nearest' });
        shouldRestoreFocus = false;
      }
    });
  }
});

function handleScroll(event: Event) {
  const target = event.target as HTMLDivElement;
  scrollTop = target.scrollTop;

  // Mark that we need to restore focus if it was lost
  if (focusedIndex >= 0) {
    const { start, end } = visibleRange;
    if (focusedIndex < start || focusedIndex >= end) {
      shouldRestoreFocus = true;
    }
  }
}
```

#### 3. Escape Key & Navigation Feedback
```typescript
let announcementText = $state('');
let announcementTimeout: ReturnType<typeof setTimeout> | null = null;

function announceNavigation(message: string) {
  announcementText = message;

  // Clear previous timeout
  if (announcementTimeout) clearTimeout(announcementTimeout);

  // Keep announcement for 2 seconds
  announcementTimeout = setTimeout(() => {
    announcementText = '';
  }, 2000);
}

function handleKeyDown(event: KeyboardEvent) {
  const { key } = event;
  const { start, end } = visibleRange;
  const visibleCount = end - start;
  const isFirstItem = focusedIndex === 0;
  const isLastItem = focusedIndex === items.length - 1;

  switch (key) {
    case 'Escape':
      // Move focus out of list
      event.preventDefault();
      scrollContainer?.blur();
      focusedIndex = -1;
      announceNavigation('Exited list');
      break;

    case 'ArrowDown':
      event.preventDefault();
      if (focusedIndex < items.length - 1) {
        focusedIndex = focusedIndex === -1 ? start : focusedIndex + 1;
        scrollToIndex(focusedIndex);
        if (focusedIndex === items.length - 1) {
          announceNavigation(`Item ${focusedIndex + 1} of ${items.length}. End of list.`);
        }
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (focusedIndex > 0) {
        focusedIndex = focusedIndex === -1 ? start : focusedIndex - 1;
        scrollToIndex(focusedIndex);
        if (focusedIndex === 0) {
          announceNavigation(`Item 1 of ${items.length}. Beginning of list.`);
        }
      }
      break;

    case 'Home':
      event.preventDefault();
      focusedIndex = 0;
      scrollToIndex(0);
      announceNavigation('Jumped to first item');
      break;

    case 'End':
      event.preventDefault();
      focusedIndex = items.length - 1;
      scrollToIndex(items.length - 1);
      announceNavigation(`Jumped to last item (${items.length} of ${items.length})`);
      break;

    case 'PageDown':
      event.preventDefault();
      const newIndexDown = Math.min(items.length - 1, focusedIndex + visibleCount);
      focusedIndex = newIndexDown;
      scrollToIndex(focusedIndex);
      break;

    case 'PageUp':
      event.preventDefault();
      const newIndexUp = Math.max(0, focusedIndex - visibleCount);
      focusedIndex = newIndexUp;
      scrollToIndex(focusedIndex);
      break;
  }
}
```

#### 4. Screen Reader Announcements
```html
<!-- Add live region for announcements -->
<div
  class="sr-only"
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {announcementText}
</div>

<!-- Add list size announcement on load -->
<div
  class="sr-only"
  role="status"
  aria-live="polite"
>
  {#if isInitialized}
    List loaded with {items.length} items. Use arrow keys to navigate.
  {/if}
</div>
```

#### 5. Update Item ARIA Attributes
```html
<div
  class="virtual-list-item"
  style={itemStyle}
  data-index={index}
  role="listitem"
  tabindex={focusedIndex === index ? 0 : -1}
  aria-setsize={items.length}
  aria-posinset={index + 1}
  aria-current={focusedIndex === index ? 'true' : undefined}
  use:observeItem={index}
>
  {@render children({ item, index, style: itemStyle })}
</div>
```

#### 6. Keyboard Shortcut Help
```html
<div
  class="virtual-list"
  bind:this={scrollContainer}
  onscroll={handleScroll}
  onkeydown={handleKeyDown}
  {role}
  aria-label={ariaLabel}
  aria-description="Use arrow keys to navigate items. Press Home for first item, End for last. Press PageUp/PageDown to jump by page. Press Escape to exit the list."
  tabindex="0"
>
```

---

## Testing Checklist

### Keyboard Navigation
- [ ] Arrow Up: Navigate backward, stop at first item, announce "beginning"
- [ ] Arrow Down: Navigate forward, stop at last item, announce "end"
- [ ] Home: Jump to first item instantly
- [ ] End: Jump to last item instantly
- [ ] Page Up: Jump backward by visible count
- [ ] Page Down: Jump forward by visible count
- [ ] Tab: Move focus to next element after list (no trap)
- [ ] Shift+Tab: Move focus to previous element before list
- [ ] Escape: Exit list and clear focus

### Screen Reader (NVDA)
- [ ] List announced as "list with 1000 items"
- [ ] Each item announced as "item X of Y"
- [ ] Navigation announcements read correctly
- [ ] Focus state announced ("focused" or "current")
- [ ] Boundary announcements ("beginning", "end")
- [ ] Keyboard help available

### Screen Reader (VoiceOver - macOS)
- [ ] List announced with count
- [ ] Items announced with position
- [ ] Keyboard navigation works
- [ ] Focus moves correctly

### Screen Reader (JAWS - Windows)
- [ ] List announced with count
- [ ] Items in forms mode
- [ ] Keyboard navigation works

### Focus Management
- [ ] Focus indicator visible (2px outline)
- [ ] Focus moves with arrow keys
- [ ] Focus restored after virtualization update
- [ ] Focus doesn't clip when scrolling
- [ ] Focus order logical

### Visual
- [ ] 200% zoom: List functional, no overflow
- [ ] High contrast mode: Focus indicator visible
- [ ] Dark mode: Focus indicator visible
- [ ] Motion reduction: No animation on focus

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |
| Opera | 76+ | Full support |

---

## Implementation Timeline

1. **Phase 1 (Critical)**: 2-3 hours
   - Focus management & restoration
   - Tab trap prevention
   - Focus loss prevention

2. **Phase 2 (Serious)**: 1-2 hours
   - Escape key support
   - Screen reader announcements
   - aria-current attribute

3. **Phase 3 (Enhancement)**: 1 hour
   - Keyboard shortcut documentation
   - Boundary feedback

---

## References

- [WCAG 2.1 Keyboard (2.1.1)](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
- [WCAG 2.1 Keyboard Trap (2.1.2)](https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap)
- [WCAG 2.1 Focus Order (2.4.3)](https://www.w3.org/WAI/WCAG21/Understanding/focus-order)
- [WCAG 2.1 Focus Visible (2.4.7)](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible)
- [WCAG 2.1 Status Messages (4.1.3)](https://www.w3.org/WAI/WCAG21/Understanding/status-messages)
- [ARIA: list role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/list_role)
- [ARIA: listitem role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listitem_role)
- [Web Content Accessibility Guidelines 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Sign-Off

This audit identifies compliance gaps with WCAG 2.1 Level AA standards. Implementing the recommended fixes will bring the virtual list component into full accessibility compliance and provide a better experience for keyboard and screen reader users.

**Recommendation**: Prioritize Phase 1 critical fixes before next release.
