---
title: Color Contrast Audit and Remediation
category: accessibility
description: Ensuring WCAG AA color contrast ratios for readable text
tags: [contrast, color, wcag, visual, aa-compliance]
---

# Color Contrast Audit and Remediation Skill

## When to Use

- Auditing entire design system for contrast compliance
- Fixing color contrast failures in specific components
- Checking dark mode and light mode separately
- Testing with color vision deficiency simulations
- Documenting contrast ratios for design specifications
- Planning color changes to meet WCAG AA (4.5:1) or AAA (7:1)

## Required Inputs

- **Color palette**: All foreground and background colors (hex, rgb, oklch)
- **Text sizes**: Distinguishing normal text from large text (18pt+ or 14pt+ bold)
- **Color combinations**: All foreground/background pairings that appear on site
- **Design tokens**: CSS variable mappings for light/dark modes
- **Current contrast ratios** (optional): Prior audit results to compare

## Steps

### Phase 1: Extract Design Colors

#### From CSS Variables

```css
/* Light Mode Colors */
:root {
  --foreground: #000000;
  --background: #faf8f3;
  --text-secondary: #2d2d2d;
  --background-secondary: #f5f1e8;
  --color-primary: #d97706;  /* Amber */
  --color-success: #10b981;  /* Green */
  --color-error: #ef4444;    /* Red */
}

/* Dark Mode Colors */
@media (prefers-color-scheme: dark) {
  :root {
    --foreground: #faf8f3;
    --background: #1a1410;
    --text-secondary: #e8e5e0;
    --color-primary: oklch(0.77 0.18 65);  /* Lighter amber */
  }
}
```

**Document all colors**:

| Token Name | Light Mode | Dark Mode |
|-----------|-----------|-----------|
| foreground | #000000 | #faf8f3 |
| background | #faf8f3 | #1a1410 |
| text-secondary | #2d2d2d | #e8e5e0 |
| color-primary | #d97706 | oklch(0.77 0.18 65) |

#### From Figma/Design Tools

1. Open design file
2. Inspect each color component
3. Export color palette as reference
4. Note any gradient or overlay effects

### Phase 2: Identify All Foreground/Background Pairs

#### Map Possible Combinations

For each page/component, list combinations:

```
Homepage:
- Normal text (--foreground on --background)
- Secondary text (--text-secondary on --background)
- Link color (--color-primary on --background)
- Hover states (--color-primary-dark on --background)

Buttons:
- Button text (white on --color-primary)
- Disabled button (--text-secondary on --background-secondary)
- Hover state (darker shade on --color-primary)

Dark mode:
- Normal text (--foreground on --background)
- Secondary text (--text-secondary on --background)
```

**Create matrix**:

| Element | Foreground | Background | Size | Current | Target |
|---------|-----------|------------|------|---------|--------|
| Body text | #000000 | #faf8f3 | 16px | ? | 4.5:1 |
| Secondary text | #2d2d2d | #faf8f3 | 14px | ? | 4.5:1 |
| Primary button | #ffffff | #d97706 | 14px | ? | 4.5:1 |

### Phase 3: Test Contrast Ratios

#### Using WebAIM Contrast Checker

1. **Open WebAIM Contrast Checker**
   - https://webaim.org/resources/contrastchecker/

2. **Enter Color Pair**
   - Foreground color (text)
   - Background color

3. **Review Results**
   - Contrast ratio displayed
   - WCAG AA status (4.5:1 normal, 3:1 large text)
   - WCAG AAA status (7:1 normal, 4.5:1 large text)

4. **Document Result**
   ```
   Body text (16px): #000000 on #faf8f3
   Contrast: 19.8:1 ✓ PASS AA and AAA
   ```

#### Using Browser DevTools

Chrome DevTools:
1. Inspect element
2. Go to Styles panel
3. Hover over color square
4. Click color picker
5. See contrast ratio at bottom

Firefox DevTools:
1. Inspect element
2. Accessibility tab shows contrast automatically

#### Programmatic Testing with axe-core

```bash
# Install axe-core
npm install --save-dev axe-core

# Or use online checker
https://www.deque.com/axe/devtools/
```

### Phase 4: Test Large Text Exception

WCAG AA allows 3:1 for **large text**:

- **Large text**: 18pt+ OR 14pt+ bold
- **Normal text**: Under 18pt (unless bold at 14pt+)

```
Example:
- 16px regular body text: Needs 4.5:1
- 18px regular heading: Needs 3:1 (large text)
- 14px bold text: Needs 3:1 (large text)
- 12px regular small text: Needs 4.5:1
```

Verify text sizes in CSS:

```css
/* Check font-size and font-weight */
body { font-size: 16px; font-weight: 400; }  /* Normal text - needs 4.5:1 */
h2 { font-size: 18px; font-weight: 400; }    /* Large text - needs 3:1 */
.bold-text { font-size: 14px; font-weight: 700; }  /* Bold - needs 3:1 */
```

### Phase 5: Test Light and Dark Modes

Test each color pair in both modes:

#### Light Mode Testing

```
Light mode default:
- Foreground: #000000
- Background: #faf8f3

Test pairs:
1. #000000 (text) on #faf8f3 (background)
2. #2d2d2d (secondary) on #faf8f3 (background)
3. #d97706 (primary) on #faf8f3 (background)
4. #ffffff (button) on #d97706 (button background)
```

#### Dark Mode Testing

```
Dark mode:
- Foreground: #faf8f3
- Background: #1a1410

Test pairs:
1. #faf8f3 (text) on #1a1410 (background)
2. #e8e5e0 (secondary) on #1a1410 (background)
3. oklch(0.77 0.18 65) (primary) on #1a1410 (background)
```

**Important**: Test with `prefers-color-scheme: dark` active

### Phase 6: Simulate Color Vision Deficiency

Use tools to verify colors work for color-blind users:

#### Simulation Tools

- **Stark Plugin** (Figma/Sketch/Adobe): Real-time simulation
- **Color Oracle** (Desktop app): Full screen simulation
- **WebAIM Color Blindness Simulator**: Online tool

Test for:
- Protanopia (red-blind): ~1% of males
- Deuteranopia (green-blind): ~1% of males
- Tritanopia (blue-yellow-blind): Rare
- Achromatopsia (complete color-blindness): Very rare

#### Testing Approach

1. View application through each color deficiency filter
2. Verify information is still conveyed (not by color alone)
3. Example:
   - Red error message + "X Error:" text ✓
   - Red error message only ✗

### Phase 7: Document Results

Create comprehensive contrast report:

```markdown
## Color Contrast Audit Report

### Summary
- Test Date: YYYY-MM-DD
- Pages Tested: [List]
- WCAG Target: AA (4.5:1 normal, 3:1 large)
- Overall Status: PASS/FAIL

### Light Mode Results

| Element | Foreground | Background | Size | Ratio | Status |
|---------|-----------|-----------|------|-------|--------|
| Body text | #000000 | #faf8f3 | 16px | 19.8:1 | ✓ PASS |
| Secondary text | #2d2d2d | #f5f1e8 | 14px | 10.2:1 | ✓ PASS |
| Primary text on primary | #ffffff | #d97706 | 14px | 6.4:1 | ✓ PASS |
| Link text | #d97706 | #faf8f3 | 16px | 5.1:1 | ✓ PASS |
| Disabled text | #a0a0a0 | #faf8f3 | 14px | 4.2:1 | ✗ FAIL |

### Dark Mode Results

| Element | Foreground | Background | Size | Ratio | Status |
|---------|-----------|-----------|------|-------|--------|
| Body text | #faf8f3 | #1a1410 | 16px | 18.5:1 | ✓ PASS |
| Secondary text | #e8e5e0 | #1a1410 | 14px | 15.2:1 | ✓ PASS |

### Issues Found

1. **Disabled Button Text**
   - Current: #a0a0a0 on #faf8f3 (4.2:1)
   - Required: 4.5:1
   - Fix: Darken disabled text to #808080 (4.8:1)

2. **Placeholder Text**
   - Current: #999999 on #faf8f3 (7.1:1)
   - Status: ✓ Already passes

### Color Vision Deficiency Testing

- ✓ Protanopia (red-blind): Information not conveyed by red alone
- ✓ Deuteranopia (green-blind): Success states have text + color
- ✓ Tritanopia (blue-yellow-blind): Not used in UI

### Recommendations

1. **High Priority**
   - Update disabled button text color to #808080
   - Apply across all disabled states

2. **Implementation**
   - Update CSS variable: `--disabled-text: #808080`
   - Test in both light and dark modes

3. **Verification**
   - Re-test with WebAIM Contrast Checker
   - Screen reader test to verify text still clear
```

### Phase 8: Remediation

#### Update Color Variables

```css
/* Before */
:root {
  --disabled-text: #a0a0a0;  /* Fails contrast */
}

/* After */
:root {
  --disabled-text: #808080;  /* 4.8:1 on white */
}

@media (prefers-color-scheme: dark) {
  :root {
    --disabled-text: #666666;  /* Enough contrast on dark background */
  }
}
```

#### Apply to Components

```html
<!-- Disabled button with better contrast -->
<button disabled class="button button--disabled">
  Save
</button>

<style>
  .button--disabled {
    color: var(--disabled-text);  /* Now 4.8:1 */
  }
</style>
```

#### Test After Changes

1. Re-check all affected elements
2. Verify in light and dark modes
3. Test on multiple browsers
4. Check with color deficiency simulation

### Phase 9: Verify No Unintended Changes

After updating colors:

```
Regression Testing Checklist:
- [ ] Normal text still readable (not too dark/light)
- [ ] Links still clearly visible and distinguishable
- [ ] Focus indicators still visible (outline contrast)
- [ ] Hover states still show sufficient contrast
- [ ] Error messages still convey urgency (+ text)
- [ ] Success messages still convey positive state (+ text)
- [ ] Disabled states clearly distinct
- [ ] Print mode still has sufficient contrast
```

## Expected Output

1. **Contrast Matrix Document**
   - All color pairs tested
   - Contrast ratios calculated
   - WCAG AA/AAA status
   - Light and dark mode separated

2. **Issues Report**
   - Specific elements failing contrast
   - Current vs. required ratio
   - Recommended fixes
   - Priority level (critical/moderate)

3. **Remediation Specification**
   - Exact color changes needed
   - CSS variables to update
   - Components affected
   - Testing plan

4. **Verification Evidence**
   - Before/after WebAIM screenshots
   - Test results for both modes
   - Color deficiency simulation evidence

## WCAG Contrast Standards

### WCAG 2.1 AA (Minimum)
- **Normal text**: 4.5:1 contrast ratio
- **Large text** (18pt+ or 14pt+ bold): 3:1 contrast ratio
- Applies to text on background, text on images, UI components

### WCAG 2.1 AAA (Enhanced)
- **Normal text**: 7:1 contrast ratio
- **Large text**: 4.5:1 contrast ratio
- Recommended for accessibility-first applications

## Testing Tools Quick Reference

| Tool | Type | Free | Notes |
|------|------|------|-------|
| WebAIM Contrast Checker | Online | Yes | Best for manual testing |
| axe DevTools | Browser Extension | Yes | Automated testing |
| Lighthouse | DevTools | Yes | Built into Chrome |
| Stark | Plugin | Paid | Figma/Sketch integration |
| Color Oracle | Desktop | Yes | Full-screen simulation |
| Colorblind Simulation | Online | Yes | Interactive testing |

## Common Contrast Issues

| Issue | Problem | Solution |
|-------|---------|----------|
| Disabled text | Too light | Increase darkness of disabled text color |
| Link colors | Invisible on colored background | Check contrast against actual background |
| Placeholder text | Too subtle | Increase opacity or darkness |
| Icon only buttons | Not enough contrast on hover | Add text label or background color |
| Large text | Assumed to need only 3:1 | Verify actual pt size; 14px is not large |
| Dark mode colors | Assumed similar to light | Test separately; may need different ratios |

## Success Criteria

- All normal text: 4.5:1 or greater
- All large text: 3:1 or greater
- All UI components: Visible focus indicators with 3:1 contrast
- Color not sole conveyance of information
- Works for all color vision deficiencies
- Consistent across light and dark modes
- WCAG 2.1 AA compliance documented
