---
name: sveltekit-visual-regression-check
description: "sveltekit visual regression check for DMB Almanac project"
tags: ['project-specific', 'dmb-almanac']
---
# Skill: Visual Regression Check

**ID**: `visual-regression-check`
**Category**: Testing / UI
**Agent**: QA Engineer, Frontend Engineer

---

## When to Use

- After CSS or styling changes
- After HTML structure modifications
- Before merging UI-related pull requests
- Validating responsive design across breakpoints
- Quick sanity check before commits
- Verifying theme implementations (dark mode, high contrast)
- Testing component states and interactions

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| component_or_page | string | Yes | Component or page path to test |
| breakpoints | array | No | Custom breakpoints (defaults provided) |
| test_dark_mode | boolean | No | Whether to test dark mode (default: true) |

---

## Steps

### Step 1: Define Viewports to Test

| Name | Width | Height | Device Type | Priority |
|------|-------|--------|-------------|----------|
| Mobile | 375px | 667px | Phone (iPhone SE) | High |
| Mobile Large | 414px | 896px | Phone (iPhone 11) | Medium |
| Tablet | 768px | 1024px | Tablet (iPad) | High |
| Desktop | 1280px | 720px | Laptop | High |
| Wide | 1920px | 1080px | Desktop Monitor | Medium |
| 4K | 3840px | 2160px | 4K Display | Low |

### Step 2: Manual Screenshot Comparison

```bash
# Before making changes:
# 1. Open component in browser
# 2. Set viewport to each size
# 3. Take screenshot (Cmd+Shift+4 on Mac, Win+Shift+S on Windows)
# 4. Save as "component-[viewport]-before.png" in screenshots/ folder

# After making changes:
# 1. Repeat screenshots
# 2. Save as "component-[viewport]-after.png"
# 3. Compare side-by-side using:
#    - macOS Preview (View > Show Markup Toolbar)
#    - VS Code (right-click > Compare with...)
#    - Online tools (pixelmatch, resemble.js)
```

### Step 3: DevTools Device Mode

```
Chrome DevTools:
1. Open DevTools (Cmd+Option+I / F12)
2. Toggle Device Toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Select device or enter custom dimensions
4. Test each viewport from Step 1
5. Use "Capture screenshot" button for consistent images

Firefox DevTools:
1. Open DevTools (Cmd+Option+I / F12)
2. Click Responsive Design Mode (Cmd+Option+M / Ctrl+Shift+M)
3. Select preset or custom dimensions
4. Take screenshots via camera icon
```

### Step 4: Quick CSS Inspection

```
For each changed element:
1. Right-click > Inspect
2. Check Computed tab
3. Verify:
   - Spacing (margin, padding, gap)
   - Colors (background, text, borders)
   - Typography (font-size, line-height, font-family)
   - Layout (display: flex/grid, position)
   - Box model (width, height, box-sizing)
   - Transforms and transitions
   - Z-index and stacking context
4. Check Styles tab for:
   - CSS specificity issues
   - Overridden styles
   - Media query breakpoints
```

### Step 5: Interactive State Testing

Test each interactive state:

| State | How to Test | DevTools Shortcut |
|-------|-------------|-------------------|
| Default | Initial render | - |
| Hover | Mouse over element | :hov panel in Styles |
| Focus | Tab to element | Simulate in :hov panel |
| Active | Click and hold | Simulate in :hov panel |
| Disabled | Add disabled attribute | Elements panel edit |
| Open/Closed | Toggle component | Manual interaction |
| Loading | Throttle network | Network tab > throttling |
| Error | Force error state | Props/state manipulation |
| Empty | Remove data | Props/state manipulation |
| Filled | Add data | Props/state manipulation |

### Step 6: Theme and Color Mode Testing

```
Dark Mode Testing:
1. Chrome DevTools > Settings (gear icon) > Preferences > Appearance
2. Or use Rendering tab > Emulate CSS media feature prefers-color-scheme
3. Verify colors and contrast meet accessibility standards
4. Check for missing dark mode overrides

High Contrast Testing:
1. Chrome DevTools > Rendering > Emulate CSS media forced-colors: active
2. Verify content remains readable
3. Check custom colors don't break in forced colors mode

Reduced Motion Testing:
1. Chrome DevTools > Rendering > Emulate CSS prefers-reduced-motion
2. Verify animations respect user preference
```

### Step 7: DOM Structure Comparison

```bash
# Compare DOM structure before/after changes

# In DevTools Console:
copy(document.querySelector('[data-testid="component"]').outerHTML)

# Save to files (before.html and after.html) and compare:
diff before.html after.html

# Or use git diff if files are tracked:
git diff --no-index before.html after.html --color-words
```

### Step 8: Automated Visual Testing (Optional)

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Allow small differences
      threshold: 0.2,     // Threshold for pixel comparison
    },
  },
});
```

```typescript
// tests/visual/component.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Component Visual Tests', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ];

  for (const viewport of viewports) {
    test(`component matches snapshot on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/component-page');

      // Wait for fonts and images to load
      await page.waitForLoadState('networkidle');

      // Screenshot specific component
      await expect(page.locator('[data-testid="component"]'))
        .toHaveScreenshot(`${viewport.name}.png`);
    });
  }

  test('component dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/component-page');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="component"]'))
      .toHaveScreenshot('dark-mode.png');
  });

  test('component states', async ({ page }) => {
    await page.goto('/component-page');
    const component = page.locator('[data-testid="component"]');

    // Hover state
    await component.hover();
    await expect(component).toHaveScreenshot('hover-state.png');

    // Focus state
    await component.focus();
    await expect(component).toHaveScreenshot('focus-state.png');

    // Disabled state
    await page.evaluate(() => {
      document.querySelector('[data-testid="component"]')?.setAttribute('disabled', 'true');
    });
    await expect(component).toHaveScreenshot('disabled-state.png');
  });
});
```

```bash
# Generate baseline screenshots
npx playwright test --update-snapshots

# Run visual regression tests
npx playwright test tests/visual/

# View test report
npx playwright show-report
```

---

## Checklist Template

```markdown
## Visual Regression Check: [Component/Page Name]

**Check Date**: [YYYY-MM-DD HH:MM]
**Branch**: [branch-name]
**Files Changed**: [list of modified files]
**Reviewer**: [name]

### Viewport Testing

| Viewport | Width | Height | Status | Issues | Screenshot |
|----------|-------|--------|--------|--------|------------|
| Mobile | 375px | 667px | PASS/FAIL | [list] | [link] |
| Mobile Large | 414px | 896px | PASS/FAIL | [list] | [link] |
| Tablet | 768px | 1024px | PASS/FAIL | [list] | [link] |
| Desktop | 1280px | 720px | PASS/FAIL | [list] | [link] |
| Wide | 1920px | 1080px | PASS/FAIL | [list] | [link] |

### State Testing

| State | Status | Issues | Screenshot |
|-------|--------|--------|------------|
| Default | PASS/FAIL | [list] | [link] |
| Hover | PASS/FAIL | [list] | [link] |
| Focus | PASS/FAIL | [list] | [link] |
| Active | PASS/FAIL | [list] | [link] |
| Disabled | PASS/FAIL | [list] | [link] |
| Loading | PASS/FAIL | [list] | [link] |
| Error | PASS/FAIL | [list] | [link] |
| Empty | PASS/FAIL | [list] | [link] |

### Theme Testing

| Theme | Status | Issues | Screenshot |
|-------|--------|--------|------------|
| Light Mode | PASS/FAIL | [list] | [link] |
| Dark Mode | PASS/FAIL | [list] | [link] |
| High Contrast | PASS/FAIL | [list] | [link] |

### Accessibility

| Check | Status | Issues |
|-------|--------|--------|
| Color Contrast (WCAG AA) | PASS/FAIL | [list] |
| Keyboard Navigation | PASS/FAIL | [list] |
| Focus Indicators | PASS/FAIL | [list] |
| Screen Reader Labels | PASS/FAIL | [list] |
| Reduced Motion | PASS/FAIL | [list] |

### Layout Specifics

- [ ] Spacing matches design system
- [ ] Typography follows style guide
- [ ] Colors match design tokens
- [ ] Borders and shadows correct
- [ ] Alignment and centering correct
- [ ] Responsive behavior smooth
- [ ] No layout shifts (CLS)
- [ ] No horizontal scrollbars
- [ ] Grid/flex gaps consistent
- [ ] Images load and scale properly

### Cross-Browser Testing (if applicable)

| Browser | Version | Status | Issues |
|---------|---------|--------|--------|
| Chrome | [version] | PASS/FAIL | [list] |
| Firefox | [version] | PASS/FAIL | [list] |
| Safari | [version] | PASS/FAIL | [list] |
| Edge | [version] | PASS/FAIL | [list] |

### Issues Found

#### Issue 1: [Title]
**Severity**: Critical / High / Medium / Low
**Viewport**: [which viewport(s)]
**State**: [which state(s)]
**Expected**: [description with reference]
**Actual**: [description of what appears]
**Screenshot**: [path or inline image]
**Fix Required**: Yes / No / Optional

#### Issue 2: [Title]
[Same format as above]

### Summary

**Total Issues**: [N]
- Critical: [N]
- High: [N]
- Medium: [N]
- Low: [N]

**Overall Status**: APPROVED / CHANGES NEEDED / BLOCKED

**Notes**: [Any additional context or observations]
```

---

## Expected Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Before screenshots | `screenshots/before/` | Baseline for comparison |
| After screenshots | `screenshots/after/` | Current state |
| Diff images | `screenshots/diff/` | Visual differences |
| Completed checklist | `.claude/artifacts/` | Review documentation |
| Issue list | GitHub/Linear/etc | Tracking bugs |
| Playwright snapshots | `tests/visual/__snapshots__/` | Automated baselines |

---

## Success Criteria

- [ ] All target viewports tested
- [ ] All interactive states verified
- [ ] Light and dark modes checked
- [ ] No unintended visual regressions
- [ ] All critical issues documented
- [ ] Accessibility standards met
- [ ] Cross-browser compatibility verified (if required)
- [ ] Performance impact assessed (no layout shifts)

---

## Tools and Resources

### Screenshot Tools
- **macOS**: Cmd+Shift+4 (area), Cmd+Shift+3 (full screen)
- **Windows**: Win+Shift+S (Snipping Tool)
- **Linux**: Flameshot, GNOME Screenshot

### Comparison Tools
- **Playwright**: Built-in visual comparison
- **Percy**: Visual testing platform
- **Chromatic**: Storybook visual testing
- **Pixelmatch**: Node.js pixel-level comparison
- **Resemble.js**: Image analysis and comparison

### Browser DevTools
- Chrome DevTools Device Mode
- Firefox Responsive Design Mode
- Safari Responsive Design Mode
- Edge DevTools

### Accessibility Tools
- Chrome Lighthouse
- axe DevTools
- WAVE browser extension
- Contrast Checker

---

## Best Practices

1. **Consistency**: Always use the same browser and zoom level (100%)
2. **Timing**: Wait for fonts, images, and animations to complete
3. **Isolation**: Test components in isolation when possible
4. **Baselines**: Update baselines only when intentional changes are made
5. **Documentation**: Screenshot naming convention: `[component]-[viewport]-[state]-[theme].png`
6. **Version Control**: Store baseline images in git LFS or separate artifact storage
7. **CI Integration**: Run visual tests in CI with screenshot diffing
8. **Thresholds**: Set appropriate pixel difference thresholds to reduce flakiness

---

## Common Pitfalls to Avoid

- **Font Loading**: Wait for web fonts to load before screenshots
- **Animation Timing**: Disable animations or wait for completion
- **Dynamic Content**: Use fixed test data or mock timestamps
- **OS Differences**: Font rendering differs between OSes
- **Zoom Level**: Always use 100% zoom
- **Window Size**: Use consistent window sizes
- **Hover States**: DevTools simulation may differ from real hover
- **Lazy Loading**: Scroll to load all images before screenshots
