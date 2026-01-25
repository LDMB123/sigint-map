---
name: visual-regression-check
description: Lightweight visual regression check for UI changes
trigger: /visual-check
used_by: [ui-regression-debugger, qa-e2e-engineer]
---

# Visual Regression Check (Lightweight)

Quick visual verification of UI changes without heavy tooling.

## When to Use
- After CSS/HTML changes
- Validating Gate 4 (Visual & Interaction Parity)
- Quick sanity check before commit

## Required Inputs
- Component or page changed
- Expected visual appearance
- Breakpoints to test

## Step-by-Step Procedure

### 1. Define Viewports to Test

| Name | Width | Device Type |
|------|-------|-------------|
| Mobile | 320px | Phone |
| Tablet | 768px | Tablet |
| Desktop | 1280px | Laptop |
| Wide | 1920px | Desktop |

### 2. Manual Screenshot Comparison

```
Before making changes:
1. Open component in browser
2. Set viewport to each size
3. Take screenshot (Cmd+Shift+4 on Mac)
4. Save as "component-[viewport]-before.png"

After making changes:
1. Repeat screenshots
2. Save as "component-[viewport]-after.png"
3. Compare side-by-side
```

### 3. DevTools Device Mode

```
1. Open DevTools (Cmd+Option+I)
2. Toggle Device Toolbar (Cmd+Shift+M)
3. Select device or enter custom dimensions
4. Check each viewport
```

### 4. Quick CSS Inspection

```
For each changed element:
1. Right-click > Inspect
2. Check computed styles
3. Verify:
   - Spacing (margin, padding)
   - Colors
   - Typography
   - Layout (flex/grid)
   - Position
```

### 5. Interactive State Testing

```
Test each state:
- Default
- Hover (use :hov in DevTools)
- Focus (Tab to element)
- Active (click and hold)
- Disabled
- Open/Closed (for toggles)
- Loading (if applicable)
```

### 6. Dark Mode Testing

```
1. Open DevTools > Settings > Preferences > Appearance
2. Or use CSS override: prefers-color-scheme: dark
3. Verify colors and contrast
```

### 7. DOM Diff Analysis

```bash
# Compare DOM structure before/after
# In DevTools console:
copy(document.querySelector('[data-testid="component"]').outerHTML)

# Save to files and diff
diff before.html after.html
```

### 8. Lightweight Automation (Optional)

```typescript
// Playwright screenshot comparison
import { test, expect } from '@playwright/test';

test('component visual check', async ({ page }) => {
  await page.goto('/component-page');

  // Desktop
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('[data-testid="component"]')).toHaveScreenshot('desktop.png');

  // Mobile
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.locator('[data-testid="component"]')).toHaveScreenshot('mobile.png');
});
```

## Checklist Template

```markdown
## Visual Regression Check: [Component]

**Check Date**: [timestamp]
**Files Changed**: [list]

### Viewport Testing

| Viewport | Width | Status | Notes |
|----------|-------|--------|-------|
| Mobile | 320px | PASS/FAIL | |
| Tablet | 768px | PASS/FAIL | |
| Desktop | 1280px | PASS/FAIL | |
| Wide | 1920px | PASS/FAIL | |

### State Testing

| State | Status | Notes |
|-------|--------|-------|
| Default | PASS/FAIL | |
| Hover | PASS/FAIL | |
| Focus | PASS/FAIL | |
| Active | PASS/FAIL | |
| Disabled | PASS/FAIL | |
| Open | PASS/FAIL | |
| Closed | PASS/FAIL | |

### Theme Testing

| Theme | Status | Notes |
|-------|--------|-------|
| Light | PASS/FAIL | |
| Dark | PASS/FAIL | |
| High Contrast | PASS/FAIL | |

### Layout Specifics

- [ ] Spacing matches design
- [ ] Typography correct
- [ ] Colors correct
- [ ] Borders/shadows correct
- [ ] Alignment correct
- [ ] Responsive behavior correct

### Issues Found

#### Issue 1: [Title]
**Viewport**: [which]
**State**: [which]
**Expected**: [description]
**Actual**: [description]
**Screenshot**: [path or inline]
```

## Expected Artifacts

| Artifact | Purpose |
|----------|---------|
| Before/after screenshots | Visual evidence |
| Completed checklist | Gate 4 evidence |
| Issue list | Bugs to fix |

## Success Criteria
- All viewports checked
- All states verified
- Dark/light mode tested
- No unintended visual changes
- All issues documented
