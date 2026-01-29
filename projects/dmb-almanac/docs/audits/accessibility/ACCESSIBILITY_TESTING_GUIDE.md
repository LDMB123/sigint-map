# Accessibility Testing Guide - Semantic HTML Fix

**Fix Date**: January 25, 2026
**Component Changed**: ErrorFallback.svelte
**Change**: Removed invalid `type="button"` from navigation link
**Verification Time**: 5-10 minutes

---

## Quick Verification (5 min)

### Automated Check
```bash
# No errors should appear
npm run lint

# Optional: Check accessibility
npm run a11y:audit
```

### Visual Check
1. Open app in browser
2. Trigger error state (e.g., navigate to /invalid-page)
3. Verify "Go Home" button appears and is clickable
4. Click it - should navigate to home page
5. No visual changes expected ✅

---

## Keyboard Navigation Test (3 min)

### Test Setup
1. Open error page
2. Close all open tabs except your test tab
3. Put away mouse - keyboard only!

### Test Steps

**Step 1: Tab to Go Home Link**
```
1. Press Tab repeatedly from top of page
2. Focus should eventually reach "Go Home" link
3. Link should have visible focus indicator (outline)
   ├─ Expected: 2px blue outline around button
   └─ Visual should match Retry button styling
```

**Step 2: Activate with Keyboard**
```
1. With focus on "Go Home" link
2. Press Enter
3. Page should navigate to home (/)
   ├─ URL changes to base URL
   ├─ Page content changes
   ├─ Back button would work
   └─ ✅ TEST PASSED
```

**Step 3: Shift+Tab (Backwards)**
```
1. Reverse tab direction with Shift+Tab
2. Focus should move backwards through interactive elements
3. Should be able to reach "Go Home" again
4. ✅ TEST PASSED
```

---

## Screen Reader Testing (5 min per reader)

### Prerequisites
- Screen reader installed and running
- Browser in focus
- Assume screen reader and browser are working

### Test with NVDA (Windows)

**Setup**:
```
1. Open Firefox or Chrome with NVDA running
2. Navigate to error page (or trigger 404)
3. Press Ctrl+Home to go to top of page
```

**Test Steps**:
```
Step 1: Navigate to "Go Home" element
├─ Press V to find next link (or button)
├─ Continue pressing V until "Go Home" found
└─ SHOULD ANNOUNCE: "Link, Go Home" (not "button")

Step 2: Verify element type
├─ Press R to find next region
├─ SHOULD SAY: "Link" (not "button" or "type button")

Step 3: Verify interaction
├─ Press Enter
├─ Page should navigate to /
└─ Back button should work in browser

Test Result: ✅ PASS (announces as "Link")
```

**What You'll Hear**:
```
BEFORE FIX (Wrong):
└─ NVDA: "Link, type button, Go Home"
   ↳ Confusing - which role is it?

AFTER FIX (Correct):
└─ NVDA: "Link, Go Home"
   ↳ Clear - it's a link
```

---

### Test with VoiceOver (macOS)

**Setup**:
```
1. Enable VoiceOver: Cmd+F5
2. Open error page in Safari or Chrome
3. Press VO+Home (usually: Control+Option+Home)
```

**Test Steps**:
```
Step 1: Navigate with VO+Right Arrow
├─ Go through page elements
├─ Find "Go Home" link
└─ SHOULD ANNOUNCE: "Go Home, link"

Step 2: Check Rotor
├─ Press VO+U to open Web Rotor
├─ Select "Links" from dropdown
├─ Find "Go Home" in links list
└─ Should be listed as link (not button)

Step 3: Activate
├─ Press VO+Space on "Go Home"
├─ Page navigates to home
└─ ✅ TEST PASSED

Test Result: ✅ PASS (appears in links list, not buttons)
```

**What You'll Hear**:
```
BEFORE FIX:
└─ "Go Home, button, link" (confusing order)

AFTER FIX:
└─ "Go Home, link" (clear)
```

---

### Test with JAWS (Windows)

**Setup**:
```
1. Open browser with JAWS running
2. Navigate to error page
3. Press H to focus first heading
```

**Test Steps**:
```
Step 1: Find using Quick Finder
├─ Press Ctrl+F to open JAWS Find dialog
├─ Type "Go Home"
├─ Press Enter
└─ Should navigate to element

Step 2: Check element role
├─ SHOULD ANNOUNCE: "Link, Go Home"
└─ In Elements List (Insert+F5), should appear under Links

Step 3: Activate
├─ Press Enter on link
├─ Browser navigates to /
└─ ✅ TEST PASSED

Test Result: ✅ PASS (role: link, not button)
```

---

### Test with JAWS Elements List (Detailed View)

```
1. Press Insert+F5 to open Elements List
2. In dropdown, select "Links"
3. Find "Go Home" in the list
4. Should be type: "Link" (not "Button")
5. Double-click to navigate to it
6. Element should be focused
7. Press Enter to follow link
8. ✅ Page navigates to home
```

---

## Voice Control Testing (Advanced - Optional)

### Test with Voice Control (Windows)

**Setup**:
```
1. Enable Voice Control (Settings > Accessibility > Voice Access)
2. Open error page
3. Say "Show labels"
```

**Test Steps**:
```
1. Speak: "Click Go Home"
   └─ Element should be activated
   └─ Page should navigate to /

2. Speak: "Focus Go Home"
   └─ Element should receive focus

Result: ✅ Should work (semantic HTML helps voice access)
```

---

## Mobile Accessibility Test (Optional)

### iOS VoiceOver

```
1. Settings > Accessibility > VoiceOver (On)
2. Open error page in Safari
3. Swipe right to navigate through elements
4. When reaching "Go Home":
   ├─ Should announce: "Go Home, link"
   └─ Swipe up and right to activate
5. Page should navigate
6. Back gesture should work
```

### Android TalkBack

```
1. Settings > Accessibility > TalkBack (On)
2. Open error page in Chrome
3. Swipe right to navigate through elements
4. When reaching "Go Home":
   ├─ Should announce: "Go Home, link"
   └─ Double-tap to activate
5. Page should navigate
6. Back button should work
```

---

## Complete Test Checklist

### Visual Testing
- [ ] Error page renders correctly
- [ ] "Go Home" button styled correctly
- [ ] No visual regressions
- [ ] Button styling unchanged
- [ ] Icons display correctly
- [ ] Colors/contrast adequate (4.5:1 minimum)

### Keyboard Testing
- [ ] Tab key navigates to "Go Home"
- [ ] Focus indicator visible around link
- [ ] Shift+Tab navigates backwards
- [ ] Enter key activates link
- [ ] Page navigates to home (/)
- [ ] URL changes to base URL
- [ ] Back button works in browser

### Screen Reader Testing (Choose 1-2 readers minimum)

#### NVDA
- [ ] Announced as "Link" not "Button"
- [ ] Label correct: "Go Home"
- [ ] Appears in Links list (V)
- [ ] Activates with Enter key
- [ ] Navigation works

#### VoiceOver (macOS)
- [ ] Announced as "Link"
- [ ] Rotor shows it as link
- [ ] VO+Space activates it
- [ ] Navigation works

#### JAWS
- [ ] Quick Finder finds it
- [ ] Elements List shows as "Link"
- [ ] Role announced correctly
- [ ] Enter activates

#### Mobile (Optional)
- [ ] iOS VoiceOver works
- [ ] Android TalkBack works

### Cross-Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Automated Tools
- [ ] axe DevTools: no errors
- [ ] Lighthouse a11y: 100 or high score
- [ ] WAVE: no errors
- [ ] Pa11y: passes

---

## Expected Test Results

### Before Fix
```
NVDA Output:
└─ "Link, type button, Go Home"
   ├─ Dual roles confusing
   └─ ❌ WCAG 4.1.2 VIOLATION

Visual Output:
└─ Button styled element with focus indicator ✅
```

### After Fix
```
NVDA Output:
└─ "Link, Go Home"
   ├─ Single, clear role
   └─ ✅ WCAG 4.1.2 COMPLIANT

Visual Output:
└─ Button styled element with focus indicator ✅
   └─ Unchanged - CSS styling preserved
```

---

## Troubleshooting

### Issue: Focus indicator not visible
**Solution**:
- Check that `:focus-visible` styles are applied
- Verify CSS not overriding with `outline: none`
- Try high contrast mode: Settings > Accessibility > High Contrast

### Issue: Screen reader says "button" instead of "link"
**Solution**:
- Verify `type="button"` was removed from file
- Hard-refresh browser (Ctrl+Shift+R)
- Restart screen reader
- Clear browser cache

### Issue: Page doesn't navigate on Enter
**Solution**:
- Verify link has `href="/"`
- Check that JavaScript not preventing default
- Try different browser
- Check network tab for redirect

### Issue: Focus indicator different from other links
**Solution**:
- Check CSS - focus styling should be consistent
- Verify class "home-button" not overriding focus styles
- Compare with other navigation links in Header

---

## Documenting Results

### Test Report Template

```markdown
# Accessibility Test Report - ErrorFallback Fix

**Date**: [DATE]
**Tester**: [NAME]
**Component**: ErrorFallback.svelte
**Test Method**: [MANUAL/AUTOMATED]
**Result**: [PASS/FAIL]

## Test Environment
- Browser: [CHROME/FIREFOX/SAFARI/EDGE]
- Screen Reader: [NVDA/JAWS/VOICEOVER/NONE]
- OS: [WINDOWS/MAC/LINUX]

## Test Results

### Keyboard Navigation
- [ ] Tab reaches element: PASS/FAIL
- [ ] Focus visible: PASS/FAIL
- [ ] Enter activates: PASS/FAIL
- [ ] Navigation works: PASS/FAIL

### Screen Reader
- [ ] Role announced correctly: PASS/FAIL
- [ ] Label correct: PASS/FAIL
- [ ] Interaction works: PASS/FAIL

### Overall: PASS/FAIL

## Notes
[Any observations or issues]

## Tester Signature
[Name] - [Date]
```

---

## Common Screen Reader Outputs

### After Fix: Expected Announcements

**NVDA (Windows)**
```
Tab to element:  "Link, Go Home"
Interact:        "Selected, Go Home"
Follow:          [Page changes to /]
```

**JAWS (Windows)**
```
Tab to element:  "Go Home, link"
Say command:     "Click Go Home"
Follow:          [Page changes to /]
```

**VoiceOver (macOS)**
```
Navigate:        "Go Home, link, web content"
Double-tap:      [Page changes to /]
Rotor entry:     Links > Go Home
```

**TalkBack (Android)**
```
Navigate:        "Go Home, link"
Double-tap:      [Page changes to /]
Role hint:       [Can be shown with swipe right]
```

---

## Passing Criteria

✅ **TEST PASSES IF**:
1. Screen reader announces as "Link" (not button)
2. Keyboard Tab key focuses element
3. Keyboard Enter key activates link
4. Navigation to / works correctly
5. No visual regressions
6. Focus indicator clearly visible

❌ **TEST FAILS IF**:
1. Screen reader still announces "button"
2. Keyboard Tab skips element
3. Enter key doesn't work
4. Navigation doesn't happen
5. Visual changes occurred
6. Focus indicator missing

---

## Quick Test (Fastest Way - 2 min)

If you're in a hurry:

```bash
1. Build/Run the app
2. Navigate to error page: http://localhost:5173/invalid-page
3. Tab to "Go Home" button
4. Verify focus indicator visible
5. Press Enter
6. Page should navigate to home (/)
7. ✅ PASS
```

That's it! If all 7 steps work, the fix is good.

---

## Sign-Off for Testers

When you complete testing, you can mark this as verified:

```markdown
## Accessibility Testing Sign-Off

✅ Semantic HTML Fix Verified
- Date: [DATE]
- Tester: [NAME]
- Method: [Keyboard + Screen Reader]
- Result: PASS

This fix resolves WCAG 4.1.2 (Name, Role, Value) violation.
No regressions detected. Safe to merge.
```

---

**Questions?** Refer to:
- BUTTON_VS_LINK_GUIDE.md - Decision tree
- SEMANTIC_HTML_REMEDIATION_REPORT.md - Detailed findings
- ACCESSIBILITY_AUDIT_SEMANTIC_HTML.md - Full audit

Good luck testing!
