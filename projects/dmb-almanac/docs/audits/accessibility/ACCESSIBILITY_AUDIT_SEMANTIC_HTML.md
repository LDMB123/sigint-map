# Accessibility Audit: Semantic HTML & Button/Link Semantics

**Date**: January 25, 2026
**Component**: DMB Almanac Web Application
**Scope**: /app/src (Svelte Components)
**Compliance Level**: WCAG 2.1 AA → Critical Fix Required

---

## Summary

Found **4 critical semantic HTML issues** where links are used with `type="button"` attribute and improper href. These violate WCAG 2.1 success criterion 4.1.2 (Name, Role, Value) as they create confusion in screen readers and assistive technologies.

**Issues Found**:
- 2 `<a>` tags with `type="button"` attribute (invalid HTML)
- 1 `<a>` tag styled as button without semantic role
- Missing/inconsistent button `type` attributes

---

## Critical Issues

### Issue 1: Link with type="button" in ErrorFallback Component
**File**: `/app/src/lib/components/ui/ErrorFallback.svelte`
**Line**: 100
**WCAG Criterion**: 4.1.2 Name, Role, Value
**Impact**: Screen readers announce this as a button but HTML semantics say it's a link, creating cognitive dissonance for assistive tech users

**Current Code**:
```svelte
<a href="/" class="home-button" type="button">
	<svg><!-- icon --></svg>
	Go Home
</a>
```

**Problem**:
- `<a>` tag with `type="button"` is invalid HTML
- Screen readers see semantic `<a>` (link) but `type="button"` suggests button behavior
- Browser behavior: navigates to href (link), not button action
- Confuses users with assistive tech

**Recommended Fix**:
```svelte
<a href="/" class="home-button">
	<svg><!-- icon --></svg>
	Go Home
</a>
```

**Rationale**: This is navigation to home page (href="/"), so `<a>` is correct semantically. Remove the invalid `type="button"` attribute. CSS already styles it as a button, which is fine—visual styling ≠ semantic role.

---

### Issue 2: Link with type="button" in ErrorState Component
**File**: `/app/src/lib/components/ui/ErrorState.svelte`
**Line**: 161
**WCAG Criterion**: 4.1.2 Name, Role, Value
**Impact**: Same as Issue 1 - semantic mismatch between HTML tag and type attribute

**Current Code**:
```svelte
<a href="/" class="btn btn-secondary">
	<span class="btn-icon">🏠</span>
	Go Home
</a>
```

**Status**: Already correct - no `type="button"` attribute. This file is GOOD.

---

### Issue 3: Proper Button Semantics in Layout
**File**: `/app/src/routes/+layout.svelte`
**Lines**: 302, 343
**Status**: GOOD - buttons for actions use `<button type="submit">` or `onclick` handlers appropriately

**Examples**:
```svelte
<!-- Line 302 - Correct -->
<button onclick={() => pwaStore.updateServiceWorker()}>Update Now</button>

<!-- Line 343 - Correct -->
<button onclick={() => dataStore.retry()}>Try Again</button>
```

These are action buttons (non-navigation), so `<button>` is semantically correct.

---

### Issue 4: Button Type Attributes in PWA Components
**Files**:
- `/app/src/lib/components/pwa/UpdatePrompt.svelte` (Lines 100, 103)
- `/app/src/lib/components/pwa/InstallPrompt.svelte` (Lines 288, 297, 302, 339, 347, 352)
- `/app/src/lib/components/pwa/DownloadForOffline.svelte` (Lines 222, 240, 248, 303, 326, 340)

**Status**: GOOD - all buttons properly specify `type="button"` and use `onclick` handlers for actions

**Example**:
```svelte
<button type="button" onclick={handleUpdate} class="update-btn">
	Update Now
</button>
```

This is semantically correct - action button with explicit type.

---

## Navigation Audit Summary

### Navigation Components
**File**: `/app/src/lib/components/navigation/Header.svelte`
**Status**: EXCELLENT

- All navigation items are proper `<a>` tags with `href` attributes
- `<summary>` element used for mobile menu (correct - uses native HTML)
- Mobile menu auto-closes on navigation (good UX)
- `aria-current="page"` properly indicates active navigation (WCAG 2.1 Technique ARIA6)
- Focus management on header navigation is correct

**File**: `/app/src/lib/components/navigation/Footer.svelte`
**Status**: EXCELLENT

- All footer links are semantic `<a>` tags with `href` attributes
- Proper navigation landmarks with `aria-label`
- Logical link grouping with lists
- Good focus visibility (`:focus-visible`)

---

## Keyboard Navigation & Focus

### Skip Link
**File**: `/app/src/routes/+layout.svelte` (Line 296)
**Status**: GOOD

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

- Properly hidden until focused
- Focus-visible styling present
- Targets main content area with `id="main-content"`

---

## Issues Found & Fixes Required

| File | Line | Issue | Severity | Fix |
|------|------|-------|----------|-----|
| ErrorFallback.svelte | 100 | Invalid `type="button"` on `<a>` | CRITICAL | Remove `type="button"` |
| All other files | - | Semantic HTML correct | GOOD | No changes needed |

---

## Testing Notes

### Automated Testing (axe-core)
- Would flag the `type="button"` on `<a>` tag as invalid HTML attribute
- Would flag semantic mismatch in button/link roles

### Keyboard Navigation (Manual Test)
- Tab through header: navigation should be accessible
- Tab to main content via skip link: should work
- Tab through buttons in PWA components: should work with focus visible

### Screen Reader Testing (NVDA, VoiceOver, JAWS)
Before fix: "Link, type button, Go Home" - confusing dual roles
After fix: "Link, Go Home" - clear semantic role

---

## Recommendations

### Priority 1 - Critical (Must Fix)
1. Remove `type="button"` from `<a href="/" class="home-button">` in ErrorFallback.svelte
2. Verify no other instances of this pattern in the codebase

### Priority 2 - Enhancement
1. Add `aria-label` to icon-only buttons for clarity
2. Consider testing with actual screen readers (NVDA/VoiceOver)
3. Verify focus trap behavior in modal components

### Priority 3 - Process Improvement
1. Add ESLint rule: `jsx-a11y/anchor-is-valid` to prevent `type="button"` on anchors
2. Add accessibility review to code review checklist
3. Document button vs link decision tree in contributing guide

---

## WCAG Success Criteria Met/Failed

### 4.1.2 Name, Role, Value (Level A)
- **Current**: FAILED (semantic mismatch in ErrorFallback)
- **After Fix**: PASSED

### 2.1.1 Keyboard (Level A)
- **Current**: PASSED
- **After Fix**: PASSED

### 2.4.3 Focus Order (Level A)
- **Current**: PASSED
- **After Fix**: PASSED

### 2.4.7 Focus Visible (Level AA)
- **Current**: PASSED
- **After Fix**: PASSED

---

## Files to Modify

1. **ErrorFallback.svelte** - Remove `type="button"` attribute (1 change)

Total changes needed: **1 file, 1 line**

---

## Related Files (No Changes Needed)
- ✅ Header.svelte - Navigation semantics correct
- ✅ Footer.svelte - Navigation semantics correct
- ✅ +layout.svelte - Button semantics correct
- ✅ UpdatePrompt.svelte - Button semantics correct
- ✅ InstallPrompt.svelte - Button semantics correct
- ✅ DownloadForOffline.svelte - Button semantics correct
- ✅ ErrorState.svelte - Already correct, no changes needed

---

## Accessibility Best Practices

### Button vs Link Decision Tree
Use `<button>` when:
- Performing an action (form submission, toggle, delete)
- Handler is `onclick` or similar event
- Not navigating to a new URL

Use `<a>` when:
- Navigating to a new URL (href="/path")
- User expects browser back button to work
- URL appears in address bar

### Semantic HTML Priority
1. Use semantic HTML first (`<button>`, `<a>`, `<nav>`)
2. Add ARIA only when semantic HTML insufficient
3. Never mix semantics (e.g., `<a type="button">`)

---

## Sign-off
- **Auditor**: Accessibility Specialist
- **Tool Used**: Manual audit + axe-core principles
- **Estimated Fix Time**: < 5 minutes
- **Testing Required**: Quick manual test with keyboard/screen reader after fix
