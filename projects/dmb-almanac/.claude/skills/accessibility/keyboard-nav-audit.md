---
title: Keyboard Navigation Audit and Testing
category: accessibility
description: Ensuring full keyboard accessibility and logical tab order
tags: [keyboard, navigation, tab-order, wcag, testing, a11y]
---

# Keyboard Navigation Audit Skill

## When to Use

- Testing application with keyboard only (no mouse)
- Verifying all interactive elements are reachable
- Checking logical tab order through pages
- Identifying keyboard traps (focus stuck, can't escape)
- Fixing focus visibility issues
- Ensuring keyboard shortcuts are discoverable
- Validating custom components work with keyboard

## Required Inputs

- **Application URL**: Page or local dev server to test
- **Scope**: Specific page, user flow, or full application
- **Expected interactions**: What should be keyboard navigable
- **Custom components**: Any non-standard interactive elements
- **Known issues**: Prior keyboard navigation problems

## Steps

### Phase 1: Setup for Keyboard-Only Testing

#### Disable Mouse Usage

**Temporary mouse disable (testing only)**:
- Disconnect mouse physically (safest option)
- Use browser extension to disable mouse clicks
- Use Windows: Settings → Devices → Mouse → off

#### Verify Keyboard Works

Test basic keyboard functionality first:
```
1. Open browser
2. Press Tab - focus should appear on page
3. Look for visible focus indicator
4. Press Arrow keys - page should scroll down
5. Press Enter on a link - should navigate
```

### Phase 2: Navigation Tab Order Testing

#### Test Linear Tab Order

```
Task: Tab through entire page, document order

Steps:
1. Press Ctrl+Home to go to page top
2. Press Tab repeatedly
3. Document where focus goes:
   - Visible focus indicator appears?
   - Logical reading order?
   - Makes sense for page structure?

Expected order for typical page:
1. Skip link (if present) ← Should be first
2. Header navigation
3. Main navigation
4. Search form
5. Form fields in order
6. Links in content area
7. Footer navigation
```

#### Visual Focus Indicator

```
Verify focus is CLEARLY VISIBLE:

Good focus indicators:
- 2px solid outline, contrasting color
- Visible on all interactive elements
- Consistent throughout page
- Works in light AND dark modes

Bad indicators:
- Thin or low contrast outline
- Missing on some elements
- Changes based on browser default
- Invisible in high contrast mode
```

Test focus visibility:
```javascript
// Check focus indicator visibility
// Open DevTools console and run:

document.addEventListener('focusin', (e) => {
  const elem = e.target;
  const style = window.getComputedStyle(elem, ':focus');
  console.log('Focus on:', elem.tagName, elem.className);
  console.log('Outline:', style.outline);
});
```

### Phase 3: Interactive Elements Testing

#### Buttons and Links

```
For each button/link on page:

✓ Reachable by Tab?
✓ Focus indicator visible?
✓ Activates with Enter/Space?
✓ Clear purpose from text?

Test buttons:
1. Tab to button
2. Listen/read button text
3. Press Enter or Space
4. Verify action executed
5. Focus moves appropriately

Test links:
1. Tab to link
2. Listen/read link text
3. Press Enter
4. Page navigates (or new tab opens)
```

#### Form Fields

```
For each form input:

✓ Can Tab to input?
✓ Can type in input (no focus trap)?
✓ Can Tab to next field?
✓ Label is clear?

Test form submission:
1. Tab through all fields
2. Enter data in each field
3. Tab to submit button
4. Press Enter
5. Form submits
6. Feedback provided (page changes or message)
```

#### Custom Components

```
For non-standard components (tabs, dropdowns, etc):

✓ Can keyboard user discover functionality?
✓ Are keyboard shortcuts documented?
✓ Do arrow keys work as expected?
✓ Can user escape from component?

Example - Dropdown menu:
1. Tab to dropdown button
2. Should focus be visible?
3. Press Enter/Space - does menu open?
4. Press arrow keys - navigate menu items?
5. Press Enter - select item?
6. Press Escape - close menu?
```

### Phase 4: Focus Trap Detection

#### Identifying Keyboard Traps

```
A keyboard trap occurs when:
- Focus enters an element but cannot leave
- User presses Tab repeatedly but focus doesn't move
- User presses Escape and nothing happens
- Focus loops within small area

Testing process:
1. Navigate to suspicious area (modal, dropdown, etc)
2. Tab through elements
3. Note if Tab ever moves you forward
4. Note if focus leaves area
5. Try Escape key - does it help?
```

#### Common Trap Locations

```
Check these areas for traps:
- Modal dialogs (most common)
- Embedded iframes
- Flash/plugin content
- Infinite scroll components
- Date pickers
- Custom search overlays
```

#### Testing Modal for Trap

```
Modal keyboard test checklist:

Before modal opens:
1. Document which element has focus

Modal opens:
2. Is focus moved to modal?
3. Can you Tab through all elements?
4. Does Tab loop back to first element?
5. Can you press Escape to close?
6. Does Escape close OR trap focus?

After modal closes:
7. Does focus return to original element?
8. Is page still usable?
```

### Phase 5: Skip Links Testing

#### Skip Link Functionality

```
Task: Verify skip link works

1. Open page
2. Press Tab immediately (don't move mouse)
3. Listen/look: Does skip link appear?
4. Press Enter on skip link
5. Focus should jump to main content
6. Next Tab should start in main content area

Expected behavior:
- Skip link visible on focus
- Skip link hidden when not focused
- Takes you directly to main content
- Hidden visually but read by screen reader
```

#### CSS for Skip Link

```css
/* Hidden by default, visible on focus */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;  /* Visible on focus */
}

/* SR-only alternative (hidden from sighted users) */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

### Phase 6: Keyboard Shortcuts Testing

#### Discoverable Shortcuts

```
If page has keyboard shortcuts, verify:

1. Are they documented?
   - Visible help text or menu?
   - Accessible (not hidden)?

2. Are they non-intrusive?
   - Don't conflict with browser shortcuts
   - Don't trap standard keys
   - Can be disabled?

3. Are they consistent?
   - Follow platform conventions?
   - Intuitive choices?

Example - Good shortcut:
- Ctrl+K to open search (doesn't conflict)
- Shows hint in UI
- Can press Escape to cancel
- Keyboard users can discover it

Example - Bad shortcut:
- / (slash) opens search (conflicts with find)
- Not documented anywhere
- No way to disable
```

#### Testing Shortcuts

```
For each shortcut:

1. Navigate to relevant page
2. Press shortcut keys
3. Expected action occurs?
4. Can repeat shortcut?
5. Can undo action if needed?
```

### Phase 7: Scrolling and Page Interaction

#### Scroll Testing

```
Task: Verify page scrolling with keyboard

Steps:
1. Start at page top
2. Press Space bar → page scrolls down?
3. Press Shift+Space → page scrolls up?
4. Press Page Down → scrolls down?
5. Press Page Up → scrolls up?
6. Press Home → goes to top?
7. Press End → goes to bottom?

Issues to check:
- Does focus get lost during scroll?
- Can you still Tab after scrolling?
- Do scroll position and focus align?
```

#### Arrow Key Navigation

```
Task: Verify arrow keys work as expected

General behavior:
- Arrow keys should NOT control page scroll
- Arrow keys should navigate within components
  (e.g., menu items, radio buttons, tabs)

For menus:
- Down arrow → next menu item
- Up arrow → previous menu item
- Enter → select item
- Escape → close menu

For tabs:
- Right arrow → next tab
- Left arrow → previous tab
- Tab → focuses active tab panel
```

### Phase 8: Access Keys Testing

#### HTML Access Keys

```html
<!-- Example HTML access key -->
<a href="/search" accesskey="s">
  Search (Alt+S on Windows, Option+S on Mac)
</a>
```

Testing:
```
1. Press Alt+S (Windows) or Option+S (Mac)
2. Expected: Navigates to /search
3. Check: Is accesskey documented?
4. Verify: Doesn't conflict with browser shortcuts
```

### Phase 9: Documentation and Reporting

#### Keyboard Testing Report

```markdown
## Keyboard Navigation Audit Report

### Test Environment
- Browser: Chrome Version X
- Platform: macOS / Windows
- Date: YYYY-MM-DD
- Tester: [Name]

### Tab Order Testing
- [ ] Tab order is logical and predictable
- [ ] Skip link works (if applicable)
- [ ] Focus indicator clearly visible on all elements
- [ ] Focus doesn't jump unexpectedly
- Notes: [Findings]

### Interactive Elements
- [ ] All buttons are Tab-reachable
- [ ] All links are Tab-reachable
- [ ] All form inputs are Tab-reachable
- [ ] All custom components are Tab-reachable
- [ ] Enter key works on links
- [ ] Space key works on buttons
- Notes: [Findings]

### Keyboard Traps
- [ ] No elements trap focus
- [ ] Modals can be escaped
- [ ] Dropdowns can be closed
- [ ] Focus returns appropriately on close
- Notes: [Findings]

### Form Testing
- [ ] Can Tab through all fields
- [ ] Can type in text fields
- [ ] Radio buttons work with arrow keys
- [ ] Checkboxes work with Space key
- [ ] Can submit form with keyboard only
- [ ] Error messages clear
- Notes: [Findings]

### Issues Found
1. [Issue]: [Description] [WCAG Criterion]
2. [Issue]: [Description] [WCAG Criterion]

### WCAG Criteria Compliance
- [ ] 2.1.1 Keyboard - All functionality available via keyboard
- [ ] 2.1.2 No Keyboard Trap - Can exit any context using keyboard
- [ ] 2.4.3 Focus Order - Order is logical and meaningful
- [ ] 2.4.7 Focus Visible - Focus indicator always visible

### Recommendations
1. [Fix needed with priority]
2. [Enhancement]
```

## Keyboard Testing Checklist

### Before Testing
- [ ] Disable mouse or unplug it
- [ ] Browser zoomed to 100%
- [ ] No browser extensions interfering
- [ ] Tested in multiple browsers

### Navigation
- [ ] Skip link appears on first Tab ✓
- [ ] Tab order follows reading order ✓
- [ ] Focus indicator always visible ✓
- [ ] Focus never gets stuck ✓
- [ ] Can Tab off page into URL bar ✓

### Interactive Elements
- [ ] All buttons Tab-reachable ✓
- [ ] All links Tab-reachable ✓
- [ ] Buttons activate with Enter/Space ✓
- [ ] Links activate with Enter ✓
- [ ] Button purpose clear from text ✓

### Forms
- [ ] Labels visible and clear ✓
- [ ] Can Tab to all fields ✓
- [ ] Can type in fields ✓
- [ ] Can submit with keyboard ✓
- [ ] Error messages appear ✓
- [ ] Can navigate errors ✓

### Custom Components
- [ ] Tabs navigable with arrow keys ✓
- [ ] Dropdowns close with Escape ✓
- [ ] Modals trap focus correctly ✓
- [ ] Can exit modals with Escape ✓

### Complex Interactions
- [ ] Autocomplete navigation works ✓
- [ ] Multi-select works with keyboard ✓
- [ ] Menus navigate with arrows ✓
- [ ] Carousels navigable with arrows ✓

## WCAG Keyboard Criteria

| Criterion | Requirement |
|-----------|------------|
| 2.1.1 Keyboard (A) | All functionality available via keyboard |
| 2.1.2 No Keyboard Trap (A) | Can exit any context using keyboard |
| 2.4.3 Focus Order (A) | Focus order is logical and meaningful |
| 2.4.7 Focus Visible (AA) | Keyboard focus indicator always visible |
| 2.5.4 Motion Actuation (A) | Non-essential motion can be disabled |

## Common Issues and Fixes

| Issue | Problem | Solution |
|-------|---------|----------|
| No focus indicator | Can't see where focus is | Add CSS outline on :focus |
| Skip link missing | Can't bypass navigation | Add skip link as first element |
| Tab order jumps | Focus navigation illogical | Use CSS order or adjust source order |
| Keyboard trap in modal | Can't escape focus | Use native `<dialog>` or implement focus trap |
| Button not activating | Space/Enter doesn't work | Use `<button>` not `<div role="button">` |
| Form field not focused | Can't Tab into input | Ensure input not hidden or disabled |

## Success Criteria

- User can navigate entire page with Tab key only
- Tab order follows logical reading order
- Focus indicator always visible and high contrast
- All interactive elements reachable by keyboard
- No keyboard traps that prevent escape
- Escape key closes modals/dropdowns
- Focus management logical and predictable
- WCAG 2.1 AA: 2.1.1, 2.1.2, 2.4.3, 2.4.7 all pass

## Testing Speed Tips

```javascript
// Highlight all focusable elements (DevTools console)
document.querySelectorAll(
  'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
).forEach(el => {
  el.style.outline = '2px solid red';
});

// Count focusable elements
document.querySelectorAll(
  'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
).length;
```
