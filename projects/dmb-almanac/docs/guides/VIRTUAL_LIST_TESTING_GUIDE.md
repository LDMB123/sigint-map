# Virtual List Accessibility Testing Guide

## Quick Start

This guide walks you through testing the improved VirtualList component for accessibility compliance.

---

## Test Environment Setup

### Tools Needed
1. **Screen Reader**:
   - Windows: NVDA (free), JAWS (commercial)
   - macOS: VoiceOver (built-in)
   - iOS: VoiceOver (Settings > Accessibility > VoiceOver)
   - Android: TalkBack (built-in)

2. **Browser DevTools**:
   - Chrome DevTools (F12)
   - Firefox DevTools (F12)
   - Safari DevTools (Cmd+Option+I on Mac)

3. **Accessibility Tools**:
   - axe DevTools browser extension
   - Lighthouse (in Chrome DevTools)
   - WAVE extension

### Test URLs
- Shows List: `http://localhost:5173/shows`
- (Future) Songs List: `http://localhost:5173/songs` (currently using grid)
- (Future) Venues List: `http://localhost:5173/venues` (currently using grid)
- (Future) Guests List: `http://localhost:5173/guests` (currently using grid)

---

## Test 1: Keyboard Navigation

**Duration**: 5 minutes

### Setup
1. Navigate to Shows page (`/shows`)
2. Close all modals/popups
3. Open browser DevTools
4. Use keyboard only (no mouse)

### Test Cases

#### 1a. Tab to List
- **Action**: Press Tab until focus reaches the show list
- **Expected**:
  - Focus visible (blue outline) on the list container
  - NVDA: "List with X items"
  - VoiceOver: "List, X items"
- **Result**: ✓ Pass / ✗ Fail

#### 1b. Arrow Down Navigation
- **Action**: Press Arrow Down 5 times
- **Expected**:
  - Focus moves to item 1, 2, 3, 4, 5
  - Items scroll smoothly into view
  - Focus indicator moves with items
  - NVDA announces: "Item 1 of X", "Item 2 of X", etc.
- **Result**: ✓ Pass / ✗ Fail

#### 1c. Arrow Up Navigation
- **Action**: From item 5, press Arrow Up 3 times
- **Expected**:
  - Focus moves to item 4, 3, 2
  - Smooth scrolling up
  - VoiceOver announces positions
- **Result**: ✓ Pass / ✗ Fail

#### 1d. Home Key
- **Action**: Press Home key
- **Expected**:
  - Focus jumps to item 1 instantly
  - Page scrolls to top
  - NVDA: "Item 1 of X. Beginning of list" (or similar)
- **Result**: ✓ Pass / ✗ Fail

#### 1e. End Key
- **Action**: Press End key
- **Expected**:
  - Focus jumps to last item
  - Page scrolls to bottom
  - NVDA: "Item X of X. End of list"
- **Result**: ✓ Pass / ✗ Fail

#### 1f. Page Down Navigation
- **Action**: Press Page Down 3 times from item 1
- **Expected**:
  - Focus jumps by approximately 5-10 items per press
  - Smooth scrolling
  - Announcements work
- **Result**: ✓ Pass / ✗ Fail

#### 1g. Page Up Navigation
- **Action**: From middle of list, press Page Up 2 times
- **Expected**:
  - Focus moves up by page increments
  - Smooth scrolling
- **Result**: ✓ Pass / ✗ Fail

#### 1h. Escape Key
- **Action**: While in list (item focused), press Escape
- **Expected**:
  - Focus leaves the list
  - NVDA: "Exited list"
  - Focus returns to normal page flow
- **Result**: ✓ Pass / ✗ Fail

#### 1i. Tab to Exit
- **Action**: Navigate to last item, press Tab
- **Expected**:
  - Focus moves to next element after list (not trapped)
  - NVDA: "Exited list"
- **Result**: ✓ Pass / ✗ Fail

#### 1j. Shift+Tab to Exit
- **Action**: Navigate to first item, press Shift+Tab
- **Expected**:
  - Focus moves to previous element before list
  - NVDA: "Exited list"
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- All 10 test cases pass
- No keyboard traps
- Smooth scrolling
- Proper announcements

---

## Test 2: Screen Reader Navigation (NVDA - Windows)

**Duration**: 10 minutes

### Setup
1. Start NVDA (press Ctrl+Alt+N or start from Applications)
2. Wait for startup message
3. Open browser
4. Navigate to `/shows`

### Test Cases

#### 2a. List Discovery
- **Action**: Use Ctrl+Home to jump to top of page
- **Expected**:
  - NVDA: "List with X items" or "List, X items"
  - Should indicate list role and size
- **Result**: ✓ Pass / ✗ Fail

#### 2b. Reading List Content
- **Action**: Use Down Arrow to read items
- **Expected**:
  - NVDA: "[Item number] of [total], Venue Name, Date"
  - Position info included
  - Venue information readable
- **Result**: ✓ Pass / ✗ Fail

#### 2c. Navigation Feedback
- **Action**: Press Arrow Down repeatedly (5+)
- **Expected**:
  - Each item read with position
  - When reaching last item: "End of list" announcement
  - When returning to first: "Beginning of list" announcement
- **Result**: ✓ Pass / ✗ Fail

#### 2d. Form Mode vs Browse Mode
- **Action**: Enter list, press H to list headings
- **Expected**:
  - Should find year headers
  - Year header H2 should be announced
- **Result**: ✓ Pass / ✗ Fail

#### 2e. Landmark Navigation
- **Action**: Press L to jump to landmarks
- **Expected**:
  - Main content region should be found
  - Navigation to different sections works
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- List properly announced
- Items readable with context
- Boundary announcements work
- Navigation is intuitive

---

## Test 3: Screen Reader Navigation (VoiceOver - macOS)

**Duration**: 10 minutes

### Setup
1. Enable VoiceOver: Cmd+F5
2. Open browser
3. Navigate to `/shows`

### Test Cases

#### 3a. List Announcement
- **Action**: Tab to list
- **Expected**:
  - VoiceOver: "List, [items count] items"
- **Result**: ✓ Pass / ✗ Fail

#### 3b. Item Navigation
- **Action**: Use VO+Down Arrow to navigate items
- **Expected**:
  - Each item announced with number
  - Venue and date information clear
- **Result**: ✓ Pass / ✗ Fail

#### 3c. Rotor Navigation
- **Action**: Press VO+U to open rotor
- **Expected**:
  - Should see list of items
  - Quick navigation between items
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- All navigation methods work
- Clear announcements
- No confusion about list structure

---

## Test 4: Visual Accessibility

**Duration**: 5 minutes

### Setup
1. Open DevTools (F12)
2. Stay on `/shows` page
3. Use keyboard only (no mouse)

### Test Cases

#### 4a. Focus Indicator Visibility
- **Action**: Tab to list, navigate with arrow keys
- **Expected**:
  - 2px blue outline visible on focused item
  - Outline not clipped or hidden
  - Clearly distinguishes focused item
- **Result**: ✓ Pass / ✗ Fail

#### 4b. Zoom to 200%
- **Action**: Press Ctrl+Plus three times (200% zoom)
- **Expected**:
  - All items still readable
  - No horizontal scroll needed
  - Keyboard navigation still works
  - Focus indicator still visible
- **Result**: ✓ Pass / ✗ Fail

#### 4c. High Contrast Mode (Windows)
- **Action**:
  1. Windows Settings > Ease of Access > Display > High Contrast
  2. Select "High Contrast" theme
  3. Reload page
- **Expected**:
  - Focus indicator visible in high contrast colors
  - Text readable
  - Keyboard navigation works
- **Result**: ✓ Pass / ✗ Fail

#### 4d. Reduced Motion
- **Action**:
  1. Windows Settings > Ease of Access > Display > Show animations
  2. Turn off "Show animations"
  3. Reload page
  4. Navigate list
- **Expected**:
  - List works without animations
  - Scrolling is instant (no smooth scroll)
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- Focus always visible
- Readable at 200% zoom
- Works in high contrast
- Respects motion preferences

---

## Test 5: Focus Management

**Duration**: 5 minutes

### Setup
1. Open `/shows` page
2. Open DevTools (F12)
3. In Console, you can check focus state

### Test Cases

#### 5a. Focus on Item
- **Action**: Navigate to item 10 with arrow keys
- **Expected**:
  - Item 10 has focus (can see outline)
  - document.activeElement is the item div
- **Result**: ✓ Pass / ✗ Fail

#### 5b. Focus Retained After Scroll
- **Action**:
  1. Focus item 50
  2. Scroll manually (mousewheel or scrollbar)
  3. Focus item comes back into view
- **Expected**:
  - Item 50 should regain focus automatically
  - Focus indicator visible
  - Screen reader announces item
- **Result**: ✓ Pass / ✗ Fail

#### 5c. Focus After Virtualization
- **Action**:
  1. Focus item 100
  2. Press End key (jump to last item)
  3. Press Home key (back to first)
- **Expected**:
  - Focus correctly moves each time
  - No focus loss or jumps
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- Focus tracked correctly
- Focus restored on scroll
- Focus doesn't get lost

---

## Test 6: ARIA Attributes

**Duration**: 3 minutes

### Setup
1. Open `/shows` page
2. Open DevTools (F12)
3. Open Inspector/Elements tab

### Test Cases

#### 6a. List ARIA Attributes
- **Action**: Inspect list container div
- **Expected**: Should have:
  - `role="list"`
  - `aria-label` (describes list)
  - `aria-description` (keyboard help)
  - `tabindex="0"`
- **Result**: ✓ Pass / ✗ Fail

#### 6b. Item ARIA Attributes
- **Action**: Inspect any list item
- **Expected**: Should have:
  - `role="listitem"`
  - `aria-setsize` (total items)
  - `aria-posinset` (item position)
  - `aria-current="true"` (if focused)
  - `tabindex` (0 if focused, -1 otherwise)
- **Result**: ✓ Pass / ✗ Fail

#### 6c. Live Region ARIA
- **Action**: Inspect page source for live region
- **Expected**: Should have:
  - `role="status"`
  - `aria-live="polite"`
  - `aria-atomic="true"`
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- All ARIA attributes present
- Values are correct
- Attributes match actual behavior

---

## Test 7: Automated Accessibility Checks

**Duration**: 5 minutes

### Setup
1. Open `/shows` page
2. Install axe DevTools or use Lighthouse

### Test Cases

#### 7a. Run axe DevTools
- **Action**: Click axe DevTools icon, run scan
- **Expected**:
  - 0 critical issues
  - 0 serious issues
  - Minimal warnings
- **Result**: ✓ Pass / ✗ Fail

#### 7b. Run Lighthouse
- **Action**:
  1. Open DevTools (F12)
  2. Go to Lighthouse tab
  3. Run accessibility audit
- **Expected**:
  - Accessibility score 90+
  - No critical issues
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- No critical violations
- No serious violations
- Lighthouse score 90+

---

## Test 8: Edge Cases

**Duration**: 5 minutes

### Test Cases

#### 8a. Empty List
- **Setup**: Temporarily empty the items array
- **Expected**:
  - No crash
  - Screen reader: "List with 0 items"
  - Tab works
  - Keyboard handlers safe
- **Result**: ✓ Pass / ✗ Fail

#### 8b. Single Item
- **Setup**: List with only 1 item
- **Expected**:
  - Tab to list works
  - Arrow keys don't crash
  - Home/End don't crash
  - Item is focused
- **Result**: ✓ Pass / ✗ Fail

#### 8c. Very Large List (10,000+ items)
- **Setup**: Load a list with 10,000+ items
- **Expected**:
  - Keyboard navigation smooth
  - No lag
  - Focus management works
  - Memory doesn't leak
- **Result**: ✓ Pass / ✗ Fail

#### 8d. Dynamic Height Items
- **Setup**: Items with variable heights (expanded/collapsed)
- **Expected**:
  - Focus management works
  - Scrolling correct
  - Focus restored properly
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- No crashes
- Graceful handling of edge cases
- Performance acceptable

---

## Test 9: Mobile Accessibility

**Duration**: 10 minutes

### Setup
1. Open DevTools in Chrome
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone or Android device
4. Navigate to `/shows`

### Test Cases

#### 9a. Touch Navigation
- **Action**: Tap on list container
- **Expected**:
  - Focus visible
  - Screen reader (if enabled) announces list
- **Result**: ✓ Pass / ✗ Fail

#### 9b. Keyboard on Mobile
- **Action**:
  1. With device connected via USB
  2. Use physical keyboard
  3. Tab and navigate list
- **Expected**:
  - Tab works on mobile
  - Arrow keys work
  - Focus indicator visible
- **Result**: ✓ Pass / ✗ Fail

#### 9c. VoiceOver on iOS
- **Action**:
  1. Enable VoiceOver (Settings > Accessibility)
  2. Swipe to navigate
  3. Double-tap to activate
- **Expected**:
  - List items announced
  - Navigation intuitive
  - Buttons/links in items work
- **Result**: ✓ Pass / ✗ Fail

#### 9d. TalkBack on Android
- **Action**:
  1. Enable TalkBack (Settings > Accessibility)
  2. Swipe to navigate
  3. Double-tap to activate
- **Expected**:
  - List items announced
  - Navigation works
  - Responsive to gestures
- **Result**: ✓ Pass / ✗ Fail

### Pass Criteria
- Mobile keyboards work
- Touch navigation works
- Screen readers work
- Touch targets 44x44px minimum

---

## Summary Report

Create a test report with results:

```markdown
# VirtualList Accessibility Test Report

**Date**: [Date]
**Tester**: [Name]
**Component**: VirtualList
**Browser**: [Browser + Version]
**OS**: [OS + Version]

## Results

| Test Suite | Pass | Fail | Notes |
|------------|------|------|-------|
| Keyboard Navigation | 10/10 | 0 | All tests passed |
| NVDA Screen Reader | 5/5 | 0 | Clean navigation |
| VoiceOver | 3/3 | 0 | Smooth experience |
| Visual Accessibility | 4/4 | 0 | All modes work |
| Focus Management | 3/3 | 0 | Focus restored correctly |
| ARIA Attributes | 3/3 | 0 | All attributes present |
| Automated Checks | 2/2 | 0 | Score: 95+ |
| Edge Cases | 4/4 | 0 | Handles all cases |
| Mobile | 4/4 | 0 | Full support |

**Overall: PASS** ✓

## Recommendations

[List any issues found or recommendations]

## Sign-Off

✓ Ready for production

---

### Issues Found
- [If any]

### Follow-up Testing
- [Any items to retest]
```

---

## CI/CD Integration

To automate accessibility testing:

```bash
# In package.json
{
  "scripts": {
    "test:a11y": "vitest run --include '**/*.a11y.test.ts'",
    "test:a11y:watch": "vitest --include '**/*.a11y.test.ts'"
  }
}

# Create test file: VirtualList.a11y.test.ts
import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import VirtualList from './VirtualList.svelte';
import { axe } from 'jest-axe';

describe('VirtualList Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(VirtualList, {
      props: {
        items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
        itemHeight: 50,
        'aria-label': 'Test list'
      }
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    const { container } = render(VirtualList, {
      props: {
        items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
        itemHeight: 50,
        'aria-label': 'Test list'
      }
    });

    const list = container.querySelector('[role="list"]');
    await user.tab();
    expect(list).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    // Verify focus moved
    expect(document.activeElement?.getAttribute('aria-posinset')).toBe('1');
  });
});
```

---

## Checklist for Developers

Before shipping changes to VirtualList:

- [ ] All keyboard tests pass
- [ ] NVDA navigation tested
- [ ] VoiceOver navigation tested
- [ ] JAWS navigation tested (if available)
- [ ] Focus indicator visible in all modes
- [ ] 200% zoom works
- [ ] High contrast mode works
- [ ] Reduced motion works
- [ ] ARIA attributes correct
- [ ] axe DevTools reports no issues
- [ ] Lighthouse score 90+
- [ ] Mobile keyboard works
- [ ] Mobile screen readers work
- [ ] No regressions in other components

---

## Questions During Testing?

Refer to:
1. [Usage Guide](./VIRTUAL_LIST_USAGE_GUIDE.md)
2. [Accessibility Audit](./VIRTUAL_LIST_A11Y_AUDIT.md)
3. [Before/After Comparison](./VIRTUAL_LIST_BEFORE_AFTER.md)

---

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
- [Testing with NVDA](https://www.nvaccess.org/)
- [Testing with VoiceOver](https://www.apple.com/accessibility/voiceover/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
