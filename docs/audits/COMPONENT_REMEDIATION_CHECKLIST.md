# Component-by-Component Remediation Checklist

Use this checklist to track accessibility fixes for each component.

---

## HIGH PRIORITY: Phase 1 (Week 1)

### Header.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/navigation/Header.svelte`
**Issues Found:** 3

**Checklist:**
- [ ] **Issue #1**: Add descriptive title to logo SVG
  - Current: `<svg aria-hidden="true">`
  - Add: `<title>Dave Matthews Band Almanac</title>`
  - Status: ⚠️ Logo text visible, but SVG needs title element

- [ ] **Issue #6**: Verify navigation semantics
  - Has `aria-label` on nav elements ✓
  - No nested menu support (children not implemented)

- [ ] **Issue #16**: Add skip link as first element in body
  - `<a href="#main-content" class="skip-link">Skip to main content</a>`
  - Add focus styles to show when focused

- [ ] **Issue #7**: Verify focus indicators
  - Lines 751-755: Outline is 2px ✓ GOOD
  - Check outline-offset (should be 2px, not -2px)
  - Status: ✓ GOOD - Already correct

- [ ] **Test:** Tab through mobile menu, verify focus trap
  - Lines 69-98 implement focus trap ✓
  - Test with Tab/Shift+Tab

**Effort:** 2 hours
**Status:** ⏳ READY FOR DEV

---

### SearchInput.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/search/SearchInput.svelte`
**Issues Found:** 3

**Checklist:**
- [ ] **Issue #3**: Make label visible (not just visually-hidden)
  - Current: `<label class="visually-hidden">`
  - Fix: Remove `visually-hidden` class, style label instead
  - Add: `.search-label { display: block; margin-bottom: 0.5rem; }`

- [ ] **Issue #2**: Improve placeholder contrast
  - Current: `placeholder` relies on browser default (usually light gray)
  - Fix: Set explicit color `var(--color-text-secondary)`
  - Set: `opacity: 1` (never reduce placeholder opacity)

- [ ] **Issue #7**: Verify focus indicator
  - Line 125-128: Has focus styles ✓
  - Check outline-offset

- [ ] **Issue #11**: Add error message support
  - Add: `aria-invalid` attribute
  - Add: `aria-describedby` for error messages
  - Example: `aria-invalid={hasError} aria-describedby="search-error"`

- [ ] **Test:**
  - Check color contrast of all text states
  - Test with 200% zoom
  - Test keyboard navigation

**Effort:** 3 hours
**Status:** ⏳ READY FOR DEV

---

### Dropdown.svelte (anchored) ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/anchored/Dropdown.svelte`
**Issues Found:** 2

**Checklist:**
- [ ] **Issue #5**: Fix focus management
  - Add focus move to first item on open:
    ```javascript
    if (isOpen) {
      setTimeout(() => {
        const firstItem = menuElement?.querySelector('[role="menuitem"]');
        firstItem?.focus();
      }, 0);
    }
    ```
  - Verify focus return on close ✓ (Line 125 has this)
  - Add Tab key focus trap (handle Shift+Tab on first item)

- [ ] **Issue #9**: Add type="button" to trigger button
  - Current: `<button ... popovertarget={id}>`
  - Fix: `<button type="button" ... popovertarget={id}>`

- [ ] **Issue #7**: Verify focus indicators
  - Line 180-183: Has styles ✓
  - Verify outline-offset: 2px (not -2px)

- [ ] **Test:**
  - Tab through menu items
  - Verify Tab cycles through items
  - Test Escape key returns focus
  - Test light dismiss (click outside)

**Effort:** 2 hours
**Status:** ⏳ READY FOR DEV

---

### GuestNetwork.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/visualizations/GuestNetwork.svelte`
**Issues Found:** 2

**Checklist:**
- [ ] **Issue #1**: Add descriptive title to SVG
  - Current: `role="img" aria-label="Guest musician network visualization"`
  - Better: Add `<title>` element inside SVG
  - Add: `<desc>` element with full description

- [ ] **Issue #4**: Create data table fallback
  - Add button: "Show Data Table"
  - Create table with columns: Guest, Appearances, Connected Musicians
  - Toggle visibility with state
  - Include `role="region"` on table section

- [ ] **Issue #10**: Announce loading states
  - Current: Uses `aria-live="polite"` ✓
  - Ensure announces: "Visualization loaded"

- [ ] **Test:**
  - Screen reader reads title and description
  - Tab to "Show Data Table" button
  - Data table accessible via keyboard
  - Can export/copy data

**Effort:** 6 hours
**Status:** ⏳ READY FOR DEV

---

### VirtualList.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/ui/VirtualList.svelte`
**Issues Found:** 3

**Checklist:**
- [ ] **Issue #8**: Focus management improvements
  - Add visual indicator: `.virtual-list-item.focused { background-color: ... }`
  - Line 349: tabindex management ✓ already correct
  - Add aria-current attribute for current item

- [ ] **Issue #7**: Improve focus indicators
  - Line 445-449: Has focus styles
  - Change outline-offset from `-2px` to `2px`
  - Add box-shadow for better visibility

- [ ] **Add:** Visible focus state styling
  - `.virtual-list-item:focus { outline: 3px solid var(--color-primary-500); outline-offset: 2px; }`

- [ ] **Test:**
  - Arrow keys navigate items
  - Enter/Space selects item
  - Home/End jump to first/last
  - Page Up/Down jump pages
  - Focus visible on all items

**Effort:** 2 hours
**Status:** ⏳ READY FOR DEV

---

### Footer.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/navigation/Footer.svelte`
**Issues Found:** 2

**Checklist:**
- [ ] **Issue #1**: Add title to logo SVG
  - Current: SVG is inside link with aria-label
  - Add: `<title>Dave Matthews Band Almanac</title>` inside SVG

- [ ] **Issue #24**: External link handling
  - Current: External links at line 128-135
  - Add: `aria-label="Visit DMBAlmanac.com (opens in new window)"`
  - Consider adding visual icon: `↗` or icon element

- [ ] **Issue #7**: Verify focus indicators
  - Lines 286-290: Focus styles present ✓
  - Line 332-336: External link focus ✓
  - Verify outline-offset: 2px (not -2px)

- [ ] **Test:**
  - Tab through footer links
  - Focus visible on all links
  - Screen reader announces external link

**Effort:** 1.5 hours
**Status:** ⏳ READY FOR DEV

---

## MEDIUM PRIORITY: Phase 2 (Week 2)

### ShowCard.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/shows/ShowCard.svelte`
**Issues Found:** 3

**Checklist:**
- [ ] **Issue #20**: Add aria-label to article
  - Current: Link has aria-label but context unclear
  - Add semantic structure with heading

- [ ] **Issue #19**: Ensure color distinction beyond color
  - If using colored badges, add text or icon
  - Verify badge text has sufficient contrast

- [ ] **Issue #2**: Verify stat color contrast
  - `.stat` uses `color: var(--foreground-muted)`
  - Change to: `color: var(--color-text-secondary)`

- [ ] **Test:**
  - 4.5:1 contrast on all text
  - Screen reader announces show details
  - Links clear on keyboard

**Effort:** 2 hours
**Status:** ⏳ READY FOR DEV

---

### Badge.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/ui/Badge.svelte`
**Issues Found:** 2

**Checklist:**
- [ ] **Issue #12**: Fix semantic roles
  - Only add `role="status"` for success/warning/error variants
  - Use `role="presentation"` for decorative badges
  - Add aria-label for semantic variants

- [ ] **Issue #2**: Verify color contrast for all variants
  - Test each color variant: default, primary, secondary, success, warning, error
  - Ensure 4.5:1 on light backgrounds
  - Ensure 3:1 for large text

- [ ] **Test:**
  - Each variant has sufficient contrast
  - Screen reader announces status badges
  - Decorative badges properly hidden

**Effort:** 1.5 hours
**Status:** ⏳ READY FOR DEV

---

### PushNotifications.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/pwa/PushNotifications.svelte`
**Issues Found:** 3

**Checklist:**
- [ ] **Issue #1**: Add aria-label to SVG icons
  - Line 189-193: SVG in success section
  - Add aria-label or hide with aria-hidden="true"
  - Ensure button has clear aria-label

- [ ] **Issue #9**: Add type="button" to all buttons
  - Lines 200-208: Subscribe button ✓ has type="button"
  - Lines 238-246: Unsubscribe button ✓ has type="button"
  - Status: ✓ ALREADY CORRECT

- [ ] **Issue #14**: Announce state changes
  - Add hidden status region: `role="status" aria-live="polite"`
  - Announce: "Notifications enabled" or "Unsubscribed"

- [ ] **Test:**
  - Button labels clear
  - State changes announced
  - Error messages announced with role="alert"
  - Line 251: Error already has correct attributes ✓

**Effort:** 1.5 hours
**Status:** ⏳ READY FOR DEV

---

### Card.svelte ✓ AUDIT COMPLETE
**Path:** `/app/src/lib/components/ui/Card.svelte`
**Issues Found:** 1

**Checklist:**
- [ ] **Issue #7**: Verify focus indicators
  - Line 172-179: `focus-within` styles present ✓
  - Check outline-offset (should be 2px, not -2px)
  - Status: ✓ LOOKS GOOD

- [ ] **Test:**
  - Interactive cards show focus ring
  - Outline-offset creates visible indicator
  - Works in high contrast mode

**Effort:** 0.5 hours (mostly verification)
**Status:** ✓ MINOR VERIFICATION ONLY

---

## LOWER PRIORITY: Phase 3 (Week 3-4)

### Visualization Components

#### GapTimeline.svelte
- [ ] Issue #4: Add data table fallback
- [ ] Issue #1: Add SVG title and description
- Effort: 4 hours

#### SongHeatmap.svelte
- [ ] Issue #4: Add data table fallback with sortable columns
- [ ] Issue #1: Add SVG title, description, color legend
- Effort: 5 hours

#### TransitionFlow.svelte
- [ ] Issue #4: Add list representation of transitions
- [ ] Issue #1: Add SVG title and description
- Effort: 4 hours

#### TourMap.svelte
- [ ] Issue #4: Add table with tour dates and venues
- [ ] Issue #1: Add map description
- Effort: 5 hours

#### RarityScorecard.svelte
- [ ] Verify color contrast for scores
- [ ] Add context for rarity scores
- Effort: 2 hours

---

### Utility Components

#### Tooltip.svelte (ui/)
- [ ] Issue #7: Verify focus indicators
- [ ] Add keyboard trigger support
- Effort: 1.5 hours

#### Tooltip.svelte (anchored/)
- [ ] Issue #7: Verify focus indicators
- [ ] Announce tooltip on hover/focus
- Effort: 1.5 hours

#### Card & CardContent
- [ ] Verify interactive states
- [ ] Check color contrast
- Effort: 1 hour

#### StatCard
- [ ] Verify stat values have sufficient contrast
- [ ] Add accessible number formatting
- Effort: 1 hour

---

## TESTING CHECKLIST

### Before Each Phase Completion

**Automated Tests**
- [ ] Run `npm run test:a11y` - target 0 violations
- [ ] Check color contrast for all text
- [ ] Validate HTML structure

**Keyboard Navigation**
- [ ] Tab through all components
- [ ] Verify logical focus order
- [ ] Test all keyboard shortcuts
- [ ] No keyboard traps

**Screen Reader**
- [ ] Test with NVDA (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Verify:
  - [ ] Page structure makes sense
  - [ ] All form labels announced
  - [ ] Error messages announced
  - [ ] Dynamic updates announced
  - [ ] Interactive elements discoverable

**Visual**
- [ ] Works at 200% zoom
- [ ] Test in Windows High Contrast Mode
- [ ] Color not only distinguishing feature
- [ ] Focus indicators visible

**Mobile**
- [ ] VoiceOver (iOS) navigation
- [ ] TalkBack (Android) navigation
- [ ] Touch targets >= 44x44px
- [ ] Zoom functionality works

---

## SIGN-OFF CHECKLIST

When all components are complete:

- [ ] All 5 critical issues fixed
- [ ] All 8 serious issues fixed
- [ ] All 12 moderate issues fixed
- [ ] Automated tests: 0 violations
- [ ] Keyboard navigation: Full support
- [ ] Screen reader: Tested with 2+ readers
- [ ] Visual: 200% zoom, high contrast tested
- [ ] Mobile: Tested on iOS & Android
- [ ] Color contrast: All text >= 4.5:1 or >= 3:1 (large)
- [ ] Team training completed
- [ ] Documentation updated
- [ ] Ready for release

**Final Sign-Off:** _______________ Date: ___________

---

## Helpful Links

- [WCAG 2.1 Quick Ref](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast](https://webaim.org/resources/contrastchecker/)
- [Component Examples](./ACCESSIBILITY_QUICK_FIX_GUIDE.md)

